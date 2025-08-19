#!/usr/bin/env python3

import os
import json
import time
from pathlib import Path
import argparse
from typing import Optional

try:
    from llama_cpp import Llama
except ImportError:
    print("Error: llama-cpp-python not installed")
    print("Install with: pip install llama-cpp-python")
    exit(1)

class QwenCADSimple:
    def __init__(self, model_path: str):
        self.model_path = Path(model_path)
        self.llm = None
        
        # CAD prompt template - simple user prompt only
        self.cad_prompt = '''<|im_start|>user
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
{prompt}
</description>
<|im_end|>
<|im_start|>assistant
'''
        
    def load_model(self):
        """Load the GGUF model"""
        if not self.model_path.exists():
            print(f"Error: Model file not found: {self.model_path}")
            return False
            
        print(f"Loading model: {self.model_path.name}")
        
        try:
            self.llm = Llama(
                model_path=str(self.model_path),
                n_ctx=4096,
                n_threads=min(os.cpu_count(), 2),
                n_batch=1,
                n_gpu_layers=-1,
                verbose=False
            )
            print("Model loaded successfully")
            return True
        except Exception as e:
            print(f"❌ Failed to load model: {str(e)}")
            return False
            
    def generate_cad_json(self, description: str) -> str:
        """Generate CAD JSON from description"""
        if not self.llm:
            return "Error: Model not loaded"
            
        try:
            prompt = self.cad_prompt.format(prompt=description)
            
            # Generate response using the loaded model
            response = self.llm(
                prompt,
                max_tokens=2048,
                temperature=0.1,
                stop=["<|im_end|>", "<|endoftext|>"],
                echo=False
            )
            
            # Extract the generated text
            generated_text = response['choices'][0]['text'].strip()
            print(f"Generated: {generated_text}")
            
            return generated_text
        except Exception as e:
            return f"Error generating response: {str(e)}"
        
            
    def run(self):
        """Main interactive loop"""
        print("\n" + "="*50)
        print("🤖 Qwen2.5 CAD Design Assistant")
        print("="*50)
        print("Type CAD design descriptions to generate JSON")
        print("Commands: /save, /quit")
        print("="*50)
        
        while True:
            try:
                user_input = input("\n🎨 CAD Design: ").strip()
                
                if user_input.lower() in ['/quit', 'quit', 'exit']:
                    print("👋 Goodbye!")
                    break
                    
                if not user_input:
                    continue
                    
                print("🔄 Generating...")
                response = self.generate_cad_json(user_input)
                print(f"\n📋 Response:\n{response}\n")
            
            except KeyboardInterrupt:
                print("\n👋 Goodbye!")
                break
            except Exception as e:
                print(f"❌ Error: {str(e)}")

def download_model():
    """Download model from Hugging Face"""
    import requests
    import zipfile
    
    # Model URL from Hugging Face
    # model_url = "https://huggingface.co/wanhin/qwen2.5-7b-instruct-gguf/resolve/main/qwen2.5-7b-instruct-q4_k_m.gguf"
    # model_url = "https://huggingface.co/wanhin/qwen2.5-7b-instruct-gguf/resolve/main/qwen2.5-7b-instruct-q8_0.gguf"
    model_url = "https://huggingface.co/wanhin/qwen2.5-7b-instruct-gguf/resolve/main/qwen2.5-7b-instruct.gguf"
    model_dir = Path("./models_qwen/quantized")
    model_path = model_dir / "qwen2.5-7b-instruct.gguf"
    
    if model_path.exists():
        print(f"Model already exists: {model_path}")
        return str(model_path)
    
    print(f"Downloading model from: {model_url}")
    
    model_dir.mkdir(parents=True, exist_ok=True)
    
    try:
        response = requests.get(model_url, stream=True)
        response.raise_for_status()
        
        total_size = int(response.headers.get('content-length', 0))
        downloaded = 0
        
        with open(model_path, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                if chunk:
                    f.write(chunk)
                    downloaded += len(chunk)
                    if total_size > 0:
                        percent = (downloaded / total_size) * 100
                        print(f"\rDownloading: {percent:.1f}%", end='', flush=True)
        
        print(f"\n✅ Model downloaded: {model_path}")
        return str(model_path)
        
    except Exception as e:
        print(f"❌ Download failed: {str(e)}")
        return None

def main():
    parser = argparse.ArgumentParser(description="Simple Qwen2.5 CAD Design Assistant")
    parser.add_argument("--model", type=str, help="Path to GGUF model file")
    parser.add_argument("--download", action="store_true", help="Download model from Hugging Face")
    
    args = parser.parse_args()
    
    # Determine model path
    if args.model:
        model_path = args.model
    elif args.download:
        model_path = download_model()
        if not model_path:
            exit(1)
    else:
        # Try to find existing model
        default_model = Path("models/quantized/qwen2.5-7b-instruct-q4_k_m.gguf")
        if default_model.exists():
            model_path = str(default_model)
        else:
            print("No model found. Use --download to download from Hugging Face")
            exit(1)
    
    # Initialize and run
    assistant = QwenCADSimple(model_path)
    if assistant.load_model():
        assistant.run()

if __name__ == "__main__":
    main() 