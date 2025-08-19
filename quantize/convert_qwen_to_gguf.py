#!/usr/bin/env python3

import os
import subprocess
import sys
from pathlib import Path
import argparse
import shutil

class QwenConverter:
    def __init__(self, verbose=False):
        self.model_name = "wanhin/Qwen2.5-7B-Instruct_1e_fullfinetune"
        self.base_dir = Path("./models_qwen")
        self.llama_cpp_dir = Path("./llama.cpp")
        self.verbose = verbose
        
        self.quantization_types = {
            "Q2_K": "2-bit quantization",
            "Q3_K_S": "3-bit quantization, small", 
            "Q3_K_M": "3-bit quantization, medium",
            "Q3_K_L": "3-bit quantization, large",
            "Q4_0": "4-bit quantization, legacy",
            "Q4_K_S": "4-bit quantization, small",
            "Q4_K_M": "4-bit quantization, medium",
            "Q5_0": "5-bit quantization, legacy",
            "Q5_K_S": "5-bit quantization, small",
            "Q5_K_M": "5-bit quantization, medium",
            "Q6_K": "6-bit quantization, high quality",
            "Q8_0": "8-bit quantization, very high quality",
            "F16": "16-bit float, highest quality",
            "F32": "32-bit float, original quality"
        }
        
    def log(self, msg):
        if self.verbose:
            print(msg)
        
    def setup_llama_cpp(self):
        if self.llama_cpp_dir.exists():
            quantize_bin = self.llama_cpp_dir / "build" / "bin" / "llama-quantize"
            if quantize_bin.exists():
                self.log("llama.cpp ready.")
                return True
            else:
                self.log("Building llama.cpp...")
        else:
            print("Cloning llama.cpp...")
            subprocess.run([
                "git", "clone", "--depth=1",
                "https://github.com/ggerganov/llama.cpp.git", 
                str(self.llama_cpp_dir)
            ], check=True, capture_output=not self.verbose)
        
        print("Building llama.cpp...")
        build_dir = self.llama_cpp_dir / "build"
        build_dir.mkdir(exist_ok=True)
        
        subprocess.run([
            "cmake", "..", "-DCMAKE_BUILD_TYPE=Release"
        ], cwd=build_dir, check=True, capture_output=not self.verbose)
        
        cpu_count = 4
        subprocess.run([
            "cmake", "--build", ".", "--config", "Release", f"-j{cpu_count}"
        ], cwd=build_dir, check=True, capture_output=not self.verbose)
        
        return True
        
    def download_model(self):
        model_dir = self.base_dir / "original"
        
        if model_dir.exists():
            self.log("Model already downloaded.")
            return model_dir
            
        print(f"Downloading {self.model_name}...")
        self.base_dir.mkdir(exist_ok=True)
        
        try:
            from huggingface_hub import snapshot_download
            
            downloaded_path = snapshot_download(
                repo_id=self.model_name,
                local_dir=model_dir,
                local_dir_use_symlinks=False
            )
            
            self.log("Model downloaded.")
            return Path(downloaded_path)
        except Exception as e:
            print(f"Error downloading model: {str(e)}")
            return None
            
    def convert_to_gguf(self, model_dir):
        gguf_dir = self.base_dir / "gguf"
        
        if gguf_dir.exists() and list(gguf_dir.glob("*.gguf")):
            self.log("GGUF model exists.")
            return gguf_dir
            
        print("Converting to GGUF...")
        gguf_dir.mkdir(exist_ok=True)
        
        convert_script = self.find_convert_script()
        if not convert_script:
            print("Convert script not found")
            return None
        
        try:
            output_file = gguf_dir / "qwen2.5-7b-instruct.gguf"
            
            cmd = [
                sys.executable, convert_script,
                str(model_dir),
                "--outfile", str(output_file),
                "--outtype", "f16"
            ]
            
            self.log(f"Running: {' '.join(cmd)}")
            
            if self.verbose:
                result = subprocess.run(cmd, check=True)
            else:
                result = subprocess.run(cmd, check=True, capture_output=True, text=True)
            
            if not output_file.exists():
                print(f"Conversion completed but file not found: {output_file}")
                return None
                
            file_size = output_file.stat().st_size / (1024**3)
            print(f"Created GGUF file: {output_file.name} ({file_size:.1f}GB)")
            return gguf_dir
            
        except subprocess.CalledProcessError as e:
            print(f"Convert script failed with exit code {e.returncode}")
            if hasattr(e, 'stderr') and e.stderr:
                print(f"Error: {e.stderr}")
            return None
        except Exception as e:
            print(f"Error converting to GGUF: {str(e)}")
            return None
            
    def find_quantize_binary(self):
        possible_paths = [
            self.llama_cpp_dir / "build" / "bin" / "llama-quantize",
            self.llama_cpp_dir / "build" / "bin" / "quantize", 
            self.llama_cpp_dir / "build" / "llama-quantize",
            self.llama_cpp_dir / "build" / "quantize"
        ]
        
        for binary_path in possible_paths:
            if binary_path.exists():
                self.log(f"Found quantize binary: {binary_path}")
                return str(binary_path)
        
        self.log("Quantize binary not found in CMake build")
        return None
    
    def find_convert_script(self):
        script_names = ["convert_hf_to_gguf.py", "convert.py"]
        for name in script_names:
            local_script = self.llama_cpp_dir / name
            if local_script.exists():
                self.log(f"Found convert script: {local_script}")
                return str(local_script)
        
        self.log("Convert script not found in Git clone")
        return None

    def quantize_model(self, gguf_model_path, quant_type):
        output_dir = self.base_dir / "quantized"
        output_dir.mkdir(exist_ok=True)
        
        output_file = output_dir / f"qwen2.5-7b-instruct-{quant_type.lower()}.gguf"
        
        if output_file.exists():
            self.log(f"{quant_type} model exists.")
            return output_file
            
        print(f"Quantizing: {quant_type}...")
        
        try:
            quantize_binary = self.find_quantize_binary()
            if not quantize_binary:
                print("Quantize binary not found")
                return None
            
            cmd = [
                quantize_binary,
                str(gguf_model_path),
                str(output_file),
                quant_type
            ]
            
            if self.verbose:
                print(f"Quantize command: {' '.join(cmd)}")
                subprocess.run(cmd, check=True)
            else:
                subprocess.run(cmd, check=True, capture_output=True)
            
            file_size = output_file.stat().st_size / (1024**3)
            print(f"{quant_type}: {file_size:.1f}GB")
            
            return output_file
        except Exception:
            print(f"{quant_type} quantization failed.")
            return None
            
    def run_conversion(self, quant_types=None, parallel=False):
        print("Converting Qwen2.5-7B-Instruct to GGUF...")
        
        if not self.setup_llama_cpp():
            return False
            
        model_dir = self.download_model()
        if not model_dir:
            return False
            
        gguf_dir = self.convert_to_gguf(model_dir)
        if not gguf_dir:
            return False
            
        base_gguf_path = gguf_dir / "qwen2.5-7b-instruct.gguf"
        if not base_gguf_path.exists():
            print("GGUF file not found.")
            return False
        
        if quant_types is None:
            quant_types = ["Q4_K_M", "Q5_K_M", "Q6_K", "Q8_0"]
            
        print("\nQuantizing model:")
        successful_conversions = []
        
        for quant_type in quant_types:
            if quant_type in self.quantization_types:
                result = self.quantize_model(base_gguf_path, quant_type)
                if result:
                    successful_conversions.append((quant_type, result))
            else:
                print(f"'{quant_type}' not supported.")
                
        if successful_conversions:
            print("\n=== Quantized GGUF models ===")
            for quant_type, file_path in successful_conversions:
                file_size = file_path.stat().st_size / (1024**3)
                print(f"{quant_type}: {file_path.name} ({file_size:.1f} GB)")
        else:
            print("No successful conversions.")
            
        return len(successful_conversions) > 0

def main():
    parser = argparse.ArgumentParser(description="Convert wanhin/Qwen2.5-7B-Instruct_1e_fullfinetune to GGUF format")
    parser.add_argument(
        "--quant-types", 
        nargs="+", 
        help="Quantization types (default: Q4_K_M Q5_K_M Q6_K Q8_0)",
        default=["Q4_K_M", "Q5_K_M", "Q6_K", "Q8_0"]
    )
    parser.add_argument(
        "--list-types", 
        action="store_true",
        help="List all available quantization types"
    )
    parser.add_argument(
        "--verbose", 
        action="store_true",
        help="Show detailed output"
    )
    parser.add_argument(
        "--parallel", 
        action="store_true", 
        help="Enable parallel quantization (experimental)"
    )
    
    args = parser.parse_args()
    
    converter = QwenConverter(verbose=args.verbose)
    
    if args.list_types:
        print("Available quantization types:")
        for qtype, desc in converter.quantization_types.items():
            print(f"  {qtype:8} - {desc}")
        return
        
    success = converter.run_conversion(args.quant_types, args.parallel)
    
    if success:
        print("\nSuccess!")
    else:
        print("\nConversion failed.")
        sys.exit(1)

if __name__ == "__main__":
    main() 