import os
import time
import uuid
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Dict, Optional
from threading import Thread, Lock
from llama_cpp import Llama
import tiktoken
from concurrent.futures import ThreadPoolExecutor
import queue

# --- 1. Cấu hình Model ---
MODEL_PATH = "models/quantized/qwen2.5-7b-instruct-q4_k_m.gguf"

# --- 2. Khởi tạo tokenizer ---
try:
    tokenizer = tiktoken.get_encoding("cl100k_base")
except:
    tokenizer = None
    print("Warning: tiktoken not available, will use word count approximation")

def count_tokens(text):
    if tokenizer:
        return len(tokenizer.encode(text))
    else:
        return int(len(text.split()) * 1.3)

# --- 3. Tải Model ---
if not os.path.exists(MODEL_PATH):
    raise FileNotFoundError(f"Model file not found at '{MODEL_PATH}'")

print(f"Loading Llama model from: {MODEL_PATH}")
llm = Llama(
    model_path=MODEL_PATH,
    n_ctx=8192,
    n_batch=8192,
    n_ubatch=8192,
    n_threads=os.cpu_count() or 2,
    n_gpu_layers=-1,
    offload_kqv=True,
    verbose=False
)
print("Model loaded successfully.")

generation_stats = {
    "total_requests": 0,
    "total_generation_time": 0.0,
    "total_tokens_generated": 0,
    "average_tokens_per_second": 0.0
}

# --- 4. Khởi tạo ứng dụng FastAPI ---
app = FastAPI()

# --- 5. Job Storage (in-memory) ---
class JobStatus:
    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"

jobs: Dict[str, dict] = {}  # job_id → {status, result, error, created_at}

# --- 6. Request/Response Models ---
class PromptRequest(BaseModel):
    user_input: str

class GenerationResponse(BaseModel):
    output: str
    generation_time: float
    tokens_generated: int
    tokens_per_second: float
    prompt_tokens: int
    total_tokens: int

class JobStatusResponse(BaseModel):
    job_id: str
    status: str
    result: Optional[GenerationResponse] = None
    error: Optional[str] = None

# --- 7. Prompt Template ---
CAD_PROMPT_TEMPLATE = """<|im_start|>user
<objective>
Generate a JSON file describing the sketching and extrusion steps needed to construct a 3D CAD model. Generate only the JSON file, no other text.
</objective>

<instruction>
You will be given a natural language description of a CAD design task. Your goal is to convert it into a structured JSON representation, which includes sketch geometry and extrusion operations.

The extrusion <operation> must be one of the following:

1. <NewBodyFeatureOperation>: Creates a new solid body.
2. <JoinFeatureOperation>: Fuses the shape with an existing body.
3. <CutFeatureOperation>: Subtracts the shape from an existing body.
4. <IntersectFeatureOperation>: Keeps only the overlapping volume between the new shape and existing body.

Ensure all coordinates, geometry, and extrusion depths are extracted accurately from the input.
</instruction>

<description>
{user_input}
</description><|im_end|>
<|im_start|>assistant
"""

# --- 8. Thread pool và Queue ---
NUM_WORKERS = min(os.cpu_count(), 4)
executor = ThreadPoolExecutor(max_workers=NUM_WORKERS)
result_queue = queue.Queue()
executor_shutdown = False
executor_lock = Lock()

# --- 9. Worker function chạy trong thread ---
def run_generation_async(job_id: str, prompt: str):
    print(f"[Worker] Start processing job {job_id}")
    try:
        response = llm(
            prompt,
            max_tokens=8192,
            temperature=0.7,
            stop=["<|im_end|>", "<|endoftext|>"],
            echo=False
        )

        result_queue.put({
            "job_id": job_id,
            "success": True,
            "data": response
        })
        print(f"[Worker] Completed job {job_id}")

    except Exception as e:
        print(f"[Worker] Error in job {job_id}: {e}")
        result_queue.put({
            "job_id": job_id,
            "success": False,
            "error": str(e)
        })

# --- 10. Thread để lắng nghe kết quả ---
def result_listener():
    """Thread lắng nghe kết quả từ worker threads"""
    while True:
        try:
            result = result_queue.get()
            if result is None:  # Poison pill để dừng listener
                break
                
            print(f"[Listener] Received result for job {result['job_id']}")
            job_id = result["job_id"]
            
            if not job_id or job_id not in jobs:
                continue
                
            if result["success"]:
                try:
                    response = result["data"]
                    # Lấy thông tin từ jobs (vì thông tin prompt đã được lưu trước)
                    job_info = jobs.get(job_id, {})
                    prompt_tokens = job_info.get("prompt_tokens", 0)
                    start_time = job_info.get("start_time", time.time())
                    
                    end_time = time.time()
                    generation_time = end_time - start_time
                    generated_text = response['choices'][0]['text'].strip()
                    tokens_generated = count_tokens(generated_text)
                    total_tokens = prompt_tokens + tokens_generated
                    tokens_per_second = tokens_generated / generation_time if generation_time > 0 else 0

                    result_obj = GenerationResponse(
                        output=generated_text,
                        generation_time=generation_time,
                        tokens_generated=tokens_generated,
                        tokens_per_second=tokens_per_second,
                        prompt_tokens=prompt_tokens,
                        total_tokens=total_tokens
                    )

                    jobs[job_id].update({
                        "status": JobStatus.COMPLETED,
                        "result": result_obj,
                        "error": None
                    })
                    print(f"[Listener] Job {job_id} marked as completed")

                except Exception as e:
                    print(f"[Listener] Result processing error for job {job_id}: {e}")
                    jobs[job_id].update({
                        "status": JobStatus.FAILED,
                        "result": None,
                        "error": f"Result processing error: {str(e)}"
                    })
            else:
                print(f"[Listener] Generation error for job {job_id}: {result['error']}")
                jobs[job_id].update({
                    "status": JobStatus.FAILED,
                    "result": None,
                    "error": f"Generation error: {result['error']}"
                })
                
        except Exception as e:
            print(f"Result listener error: {e}")

# Khởi động result listener thread
result_thread = Thread(target=result_listener, daemon=True)
result_thread.start()

# --- 11. Hàm xử lý sinh async ---
def run_generation(job_id: str, user_input: str):
    global executor_shutdown
    try:
        prompt = CAD_PROMPT_TEMPLATE.format(user_input=user_input)
        prompt_tokens = count_tokens(prompt)
        start_time = time.time()

        # Lưu thông tin job trước
        jobs[job_id] = {
            "status": JobStatus.PENDING,
            "prompt_tokens": prompt_tokens,
            "start_time": start_time
        }

        # Kiểm tra trước khi submit
        with executor_lock:
            if executor_shutdown:
                raise Exception("Executor has been shutdown")
            
            # Gửi task đến thread pool
            executor.submit(run_generation_async, job_id, prompt)
            print(f"[Main] Submitted job {job_id} to thread pool")
        
    except Exception as e:
        print(f"[Main] Task submission error for job {job_id}: {e}")
        jobs[job_id] = {
            "status": JobStatus.FAILED,
            "result": None,
            "error": f"Task submission error: {str(e)}"
        }

# --- 12. API: Submit job ---
@app.post("/generate", response_model=dict)
def create_job(request: PromptRequest):
    job_id = str(uuid.uuid4())
    print(f"[API] Creating new job: {job_id}")
    
    # Chạy trong luồng nền
    thread = Thread(target=run_generation, args=(job_id, request.user_input), daemon=True)
    thread.start()

    return {"job_id": job_id, "status": "submitted"}

# --- 13. API: Kiểm tra kết quả ---
@app.get("/check-result/{job_id}", response_model=JobStatusResponse)
def check_result(job_id: str):
    job = jobs.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    # Timeout sau 30s pending
    if job["status"] == JobStatus.PENDING and time.time() - job.get("start_time", 0) > 360:
        jobs[job_id]["status"] = JobStatus.FAILED
        jobs[job_id]["error"] = "Job timeout after 30 seconds"
    
    return JobStatusResponse(
        job_id=job_id,
        status=job["status"],
        result=job.get("result"),
        error=job.get("error")
    )

# --- 14. Cleanup khi tắt ứng dụng ---
@app.on_event("shutdown")
def shutdown_event():
    global executor_shutdown
    print("Shutting down application...")
    
    # Đánh dấu executor đã shutdown
    with executor_lock:
        executor_shutdown = True
    
    # Gửi poison pill để dừng result listener
    result_queue.put(None)
    
    # Shutdown thread pool
    print("Shutting down thread pool...")
    executor.shutdown(wait=True)
    print("Thread pool shutdown complete")
    
    # Đợi result listener kết thúc
    result_thread.join(timeout=5)
    print("Application shutdown complete")

# --- 15. Các API khác ---
@app.get("/health")
async def health_check():
    return {"status": "ok", "model_loaded": True}

@app.get("/stats")
async def get_stats():
    return {
        "generation_stats": generation_stats,
        "model_info": {
            "model_path": MODEL_PATH,
            "context_size": llm.n_ctx() if hasattr(llm, 'n_ctx') else 'unknown'
        }
    }

@app.post("/benchmark")
async def benchmark():
    test_prompts = [
        "Create a simple cube with side length 10mm",
        "Design a cylinder with radius 5mm and height 20mm",
        "Make a rectangular prism 30x20x10mm with a 5mm hole through the center"
    ]
    
    benchmark_results = []
    
    for i, prompt in enumerate(test_prompts):
        print(f"Running benchmark {i+1}/{len(test_prompts)}")
        
        start_time = time.time()
        try:
            response = llm(
                CAD_PROMPT_TEMPLATE.format(user_input=prompt),
                max_tokens=512,
                temperature=0.0,
                stop=["<|im_end|>", "<|endoftext|>"],
                echo=False
            )
            end_time = time.time()
            gen_time = end_time - start_time
            output = response['choices'][0]['text'].strip()
            tokens_out = count_tokens(output)
            tps = tokens_out / gen_time if gen_time > 0 else 0

            benchmark_results.append({
                "prompt": prompt,
                "tokens_per_second": tps,
                "generation_time": gen_time,
                "tokens_generated": tokens_out
            })

            global generation_stats
            generation_stats["total_requests"] += 1
            generation_stats["total_generation_time"] += gen_time
            generation_stats["total_tokens_generated"] += tokens_out
            if generation_stats["total_generation_time"] > 0:
                generation_stats["average_tokens_per_second"] = (
                    generation_stats["total_tokens_generated"] / generation_stats["total_generation_time"]
                )

        except Exception as e:
            benchmark_results.append({
                "prompt": prompt,
                "error": str(e)
            })

    avg_tps = sum(r["tokens_per_second"] for r in benchmark_results if "tokens_per_second" in r) / len(benchmark_results) if benchmark_results else 0
    
    return {
        "benchmark_results": benchmark_results,
        "average_tokens_per_second": avg_tps,
        "total_tests": len(test_prompts)
    }