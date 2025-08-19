#!/usr/bin/env python3
# benchmark_llm_speed.py
# Chỉ dùng để đo tốc độ llama.cpp qua llama-cpp-python

import os
import gc
import json
import time
import argparse
from statistics import mean, stdev
from typing import Dict, Any, Tuple, List, Optional

from llama_cpp import Llama


def safe_div(a: float, b: float) -> float:
    return float(a) / float(b) if b and b > 0 else 0.0


def get_token_count_from_usage(resp: Dict[str, Any], key: str) -> Optional[int]:
    try:
        return int(resp["usage"][key])
    except Exception:
        return None


def count_tokens_fallback(llm: Llama, text: str) -> int:
    return len(llm.tokenize(text.encode("utf-8"), add_bos=False))


def llama_call(llm: Llama, **kwargs):
    """
    Gọi llm(**kwargs) tương thích nhiều phiên bản llama-cpp-python.
    - Nếu bản mới: hỗ trợ cache_prompt -> dùng luôn.
    - Nếu bản cũ: TypeError -> tự động bỏ cache_prompt và gọi lại.
    """
    try:
        if "cache_prompt" not in kwargs:
            kwargs["cache_prompt"] = True
        return llm(**kwargs)
    except TypeError:
        kwargs.pop("cache_prompt", None)
        return llm(**kwargs)


def measure_ingestion(
    llm: Llama,
    prompt: str,
    temperature: float,
    stop: List[str],
    use_cache: bool = True,
) -> Tuple[int, float]:
    """
    Đo ingestion: truyền prompt nhưng không sinh token (max_tokens=0).
    Trả về (prompt_tokens, elapsed_sec)
    """
    gc.collect()
    t0 = time.perf_counter()
    resp = llama_call(
        llm,
        prompt=prompt,
        max_tokens=0,
        temperature=temperature,
        stop=stop,
        echo=False,
        cache_prompt=use_cache,
    )
    elapsed = time.perf_counter() - t0

    prompt_tokens = get_token_count_from_usage(resp, "prompt_tokens")
    if prompt_tokens is None:
        prompt_tokens = count_tokens_fallback(llm, prompt)

    return prompt_tokens, elapsed


def measure_generation(
    llm: Llama,
    prompt: str,
    max_tokens: int,
    temperature: float,
    stop: List[str],
    use_cache: bool = True,
) -> Tuple[int, float, str]:
    """
    Đo generation: truyền prompt và sinh max_tokens.
    Trả về (completion_tokens, elapsed_sec, text)
    """
    gc.collect()
    t0 = time.perf_counter()
    resp = llama_call(
        llm,
        prompt=prompt,
        max_tokens=max_tokens,
        temperature=temperature,
        stop=stop,
        echo=False,
        cache_prompt=use_cache,
    )
    elapsed = time.perf_counter() - t0

    text = resp["choices"][0]["text"]
    completion_tokens = get_token_count_from_usage(resp, "completion_tokens")
    if completion_tokens is None:
        completion_tokens = count_tokens_fallback(llm, text)

    return completion_tokens, elapsed, text


def measure_generation_stream(
    llm: Llama,
    prompt: str,
    max_tokens: int,
    temperature: float,
    stop: List[str],
    use_cache: bool = True,
) -> Tuple[int, float]:
    """
    Đo generation ở chế độ stream=True.
    Đếm token dựa theo usage cuối cùng (nếu có), fallback = tổng độ dài text ghép lại.
    """
    gc.collect()
    t0 = time.perf_counter()
    pieces: List[str] = []
    completion_tokens = None

    # llama-cpp-python trả về generator với các chunk "delta"
    for chunk in llama_call(
        llm,
        prompt=prompt,
        max_tokens=max_tokens,
        temperature=temperature,
        stop=stop,
        echo=False,
        cache_prompt=use_cache,
        stream=True,
    ):
        if "choices" in chunk and chunk["choices"]:
            delta = chunk["choices"][0].get("text", "")
            if delta:
                pieces.append(delta)
        if "usage" in chunk and completion_tokens is None:
            completion_tokens = get_token_count_from_usage(chunk, "completion_tokens")

    elapsed = time.perf_counter() - t0

    if completion_tokens is None:
        completion_tokens = count_tokens_fallback(llm, "".join(pieces))

    return completion_tokens, elapsed


def summarize(values: List[float]) -> Dict[str, float]:
    if not values:
        return {"avg": 0.0, "stdev": 0.0, "min": 0.0, "max": 0.0}
    return {
        "avg": float(mean(values)),
        "stdev": float(stdev(values)) if len(values) > 1 else 0.0,
        "min": float(min(values)),
        "max": float(max(values)),
    }


def main():
    parser = argparse.ArgumentParser(description="Benchmark llama.cpp speed (tokens/sec)")
    parser.add_argument("--model", required=True, help="Path tới model GGUF")
    parser.add_argument("--prompt", default="Benchmark: say OK.", help="Prompt để đo ingestion/generation")
    parser.add_argument("--max-tokens", type=int, default=512, help="Số token để sinh khi đo generation")
    parser.add_argument("--runs", type=int, default=3, help="Số lần chạy (tính trung bình)")
    parser.add_argument("--warmup", type=int, default=1, help="Số lần chạy warmup (không tính vào kết quả)")
    parser.add_argument("--temperature", type=float, default=0.1, help="Nhiệt độ")
    parser.add_argument("--n-ctx", type=int, default=4096, help="Context window")
    parser.add_argument("--n-threads", type=int, default=max(os.cpu_count() or 2, 2), help="CPU threads")
    parser.add_argument("--n-gpu-layers", type=int, default=-1, help="GPU offload layers (-1 = all possible)")
    parser.add_argument("--n-batch", type=int, default=512, help="Batch size cho decode")
    parser.add_argument("--stop", nargs="*", default=["<|im_end|>", "<|endoftext|>"], help="Stop tokens")
    parser.add_argument("--stream", action="store_true", help="Đo thêm chế độ stream=True")
    parser.add_argument("--no-cache-prompt", action="store_true", help="Tắt cache_prompt khi đo (mặc định bật)")
    parser.add_argument("--json", action="store_true", help="Chỉ in JSON kết quả (không in mô tả)")

    args = parser.parse_args()

    # Load model
    llm = Llama(
        model_path=args.model,
        n_ctx=args.n_ctx,
        n_threads=args.n_threads,
        n_gpu_layers=args.n_gpu_layers,
        n_batch=args.n_batch,
        verbose=False,
    )

    # Warmup
    for _ in range(max(args.warmup, 0)):
        measure_ingestion(llm, args.prompt, args.temperature, args.stop, use_cache=not args.no_cache_prompt)
        measure_generation(llm, args.prompt, 1, args.temperature, args.stop, use_cache=not args.no_cache_prompt)

    ingest_times: List[float] = []
    ingest_tokens: List[int] = []

    gen_times: List[float] = []
    gen_tokens: List[int] = []

    stream_times: List[float] = []
    stream_tokens: List[int] = []

    # Runs
    for _ in range(max(args.runs, 1)):
        # Ingestion
        p_tok, t_ing = measure_ingestion(
            llm, args.prompt, args.temperature, args.stop, use_cache=not args.no_cache_prompt
        )
        ingest_tokens.append(p_tok)
        ingest_times.append(t_ing)

        # Generation
        c_tok, t_gen, _ = measure_generation(
            llm, args.prompt, args.max_tokens, args.temperature, args.stop, use_cache=not args.no_cache_prompt
        )
        gen_tokens.append(c_tok)
        gen_times.append(t_gen)

        # Streaming (optional)
        if args.stream:
            s_tok, s_time = measure_generation_stream(
                llm, args.prompt, args.max_tokens, args.temperature, args.stop, use_cache=not args.no_cache_prompt
            )
            stream_tokens.append(s_tok)
            stream_times.append(s_time)

    # Summaries
    ingest_tps_list = [safe_div(tok, t) for tok, t in zip(ingest_tokens, ingest_times)]
    gen_tps_list = [safe_div(tok, t) for tok, t in zip(gen_tokens, gen_times)]
    stream_tps_list = [safe_div(tok, t) for tok, t in zip(stream_tokens, stream_times)] if args.stream else []

    result = {
        "model": os.path.abspath(args.model),
        "params": {
            "n_ctx": args.n_ctx,
            "n_threads": args.n_threads,
            "n_gpu_layers": args.n_gpu_layers,
            "n_batch": args.n_batch,
            "temperature": args.temperature,
            "max_tokens": args.max_tokens,
            "stop": args.stop,
            "cache_prompt": not args.no_cache_prompt,
            "prompt_len_chars": len(args.prompt),
        },
        "runs": args.runs,
        "warmup": args.warmup,
        "prompt_tokens": summarize(ingest_tokens),
        "ingestion": {
            "time_sec": summarize(ingest_times),
            "tps": summarize(ingest_tps_list),
        },
        "generation": {
            "completion_tokens": summarize(gen_tokens),
            "time_sec": summarize(gen_times),
            "tps": summarize(gen_tps_list),
        },
    }

    if args.stream:
        result["streaming"] = {
            "completion_tokens": summarize(stream_tokens),
            "time_sec": summarize(stream_times),
            "tps": summarize(stream_tps_list),
        }

    if not args.json:
        print("\n=== Llama.cpp Speed Benchmark ===")
        print(f"Model: {result['model']}")
        print(f"Runs: {args.runs}  |  Warmup: {args.warmup}")
        print(f"Prompt chars: {result['params']['prompt_len_chars']}")
        print(f"Cache prompt: {result['params']['cache_prompt']}")
        print(f"Context: {args.n_ctx}  Threads: {args.n_threads}  GPU layers: {args.n_gpu_layers}  Batch: {args.n_batch}")
        print("\n-- Ingestion --")
        print(f"  Prompt tokens avg: {result['prompt_tokens']['avg']:.1f}")
        print(f"  Time (s): avg {result['ingestion']['time_sec']['avg']:.4f}  "
              f"TPS: avg {result['ingestion']['tps']['avg']:.2f}")
        print("\n-- Generation --")
        print(f"  Completion tokens avg: {result['generation']['completion_tokens']['avg']:.1f}")
        print(f"  Time (s): avg {result['generation']['time_sec']['avg']:.4f}  "
              f"TPS: avg {result['generation']['tps']['avg']:.2f}")
        if args.stream:
            print("\n-- Streaming --")
            print(f"  Completion tokens avg: {result['streaming']['completion_tokens']['avg']:.1f}")
            print(f"  Time (s): avg {result['streaming']['time_sec']['avg']:.4f}  "
                  f"TPS: avg {result['streaming']['tps']['avg']:.2f}")

        print("\n-- JSON Output --")
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
