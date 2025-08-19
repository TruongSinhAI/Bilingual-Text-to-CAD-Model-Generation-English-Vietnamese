from fastapi import FastAPI, Response, Form
from fastapi.middleware.cors import CORSMiddleware
import os
from pathlib import Path
import cadquery as cq
import tempfile
import requests
import sys
import json
import traceback
from datetime import datetime
from fastapi.responses import JSONResponse
import time
from requests.exceptions import RequestException

from semantic_cache_chroma import ChromaSemanticCache

sem_cache = ChromaSemanticCache()

# Thêm đường dẫn tới thư mục gốc dự án (Text2CAD)
project_root = os.path.abspath(os.path.join(os.getcwd(), 'Text2CAD'))
sys.path.append(project_root)

from CadSeqProc.cad_sequence import CADSequence


app = FastAPI(
    title="Text2CAD API",
    description="Generate 3D CAD models from text descriptions",
    version="1.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MOCK_DIR = Path(__file__).parent / "mock_data"
MOCK_DIR.mkdir(exist_ok=True)

CALL_MODEL_API = "https://quantize.truongsinhai.id.vn"

def call_model(text_input: str, max_wait_time: int = 600, poll_interval: float = 10.0):
    """
    Gọi model thông qua job ID và đợi kết quả hoàn thành
    - max_wait_time: thời gian tối đa chờ (giây)
    - poll_interval: khoảng cách giữa các lần kiểm tra (giây)
    """
    print("🔍 [call_model] Input:", text_input)

    # Kiểm tra cache trước
    try:
        cached = sem_cache.find(text_input)
        cached = False
        if cached:
            print("✅ [call_model] Cache hit")
            return cached
    except Exception as e:
        print("❌ [call_model] Cache error:", e)
        traceback.print_exc()

    try:
        # Bước 1: Gửi yêu cầu tạo job
        headers = {"Content-Type": "application/json"}
        payload = {"user_input": text_input}
        response = requests.post(CALL_MODEL_API+ "/generate", json=payload, headers=headers)
        response.raise_for_status()

        job_id = response.json().get("job_id")
        if not job_id:
            print("❌ [call_model] No job_id returned")
            return ""

        print(f"✅ [call_model] Created job_id: {job_id}")

        # Bước 2: Poll để kiểm tra trạng thái job
        start_time = time.time()
        while (time.time() - start_time) < max_wait_time:
            try:
                status_response = requests.get(CALL_MODEL_API + f"/check-result/{job_id}")
                status_response.raise_for_status()
                status_data = status_response.json()

                if status_data["status"] == "completed":
                    output = status_data["result"]["output"]
                    print("✅ [call_model] Job completed, output:", output[:100] + "...")

                    # Lưu vào cache
                    output_clean = output.replace("'", '"')
                    try:
                        CADSequence.from_minimal_json(json.loads(output_clean)).create_cad_model()
                        sem_cache.add(text_input, output_clean)
                    except:
                        pass
                    return output_clean

                elif status_data["status"] == "failed":
                    error = status_data.get("error", "Unknown error")
                    print(f"❌ [call_model] Job failed: {error}")
                    return ""

                else:
                    print(f"⏳ [call_model] Job still {status_data['status']}... waiting {poll_interval}s")
                    time.sleep(poll_interval)

            except requests.RequestException as e:
                print("⚠️ [call_model] Error checking job status:", e)
                time.sleep(poll_interval)

        # Nếu vượt quá thời gian chờ
        print(f"⏰ [call_model] Timeout after {max_wait_time}s waiting for job {job_id}")
        return ""

    except Exception as e:
        print("❌ [call_model] Unexpected error:", e)
        traceback.print_exc()
        return ""
def create_cad_sequence(text: str):
    try:
        print("🧪 [create_cad_sequence] JSON Input:", text[:10])
        cad_model = CADSequence.from_minimal_json(json.loads(text)).create_cad_model()
        cad_model.save_stp('tmp', 'output')
        return True
    except Exception as e:
        print("❌ [create_cad_sequence] Error creating CAD model:", e)
        traceback.print_exc()
        return False

def create_stl_geometry(step_path: str) -> bytes:
    print("📁 [create_stl_geometry] STEP path:", step_path)
    if not os.path.exists(step_path):
        raise FileNotFoundError(f"STEP file not found: {step_path}")
    try:
        shape = cq.importers.importStep(step_path)

        with tempfile.NamedTemporaryFile(suffix=".stl", delete=False) as tmp_file:
            stl_path = tmp_file.name

        cq.exporters.export(shape, stl_path, exportType='STL')

        with open(stl_path, "rb") as f:
            stl_bytes = f.read()

        os.remove(stl_path)

        print("✅ [create_stl_geometry] STL generated successfully")
        return stl_bytes
    except Exception as e:
        print("❌ [create_stl_geometry] Error generating STL:", e)
        traceback.print_exc()
        raise e

@app.post("/api/generate-stl-from-json")
async def generate_stl_from_json(json_input: str = Form(...)):
    print("📥 [generate-stl-from-json] Received input:", json_input)
    ans = create_cad_sequence(json_input)

    if not ans:
        return Response(
            content="❌ Failed to create CAD sequence",
            media_type="text/plain",
            status_code=500
        )

    try:
        stl_data = create_stl_geometry("./output/tmp.step")
        
        # Create response with both STL data and model response
        import json
        import base64
        
        # Encode STL data as base64 for JSON transport
        stl_base64 = base64.b64encode(stl_data).decode('utf-8')
        
        response_data = {
            "success": True,
            "stl_data": stl_base64,
            "model_response": json.loads(json_input),
            "timestamp": datetime.now().isoformat(),
        }
        
        return JSONResponse(
            content=response_data,
            status_code=200
        )
        
    except Exception as e:
        return Response(
            content=f"❌ Failed to create STL: {str(e)}",
            media_type="text/plain",
            status_code=500
        )

@app.post("/api/generate-stl")
async def generate_stl(text_input: str = Form(...)):
    print("📥 [generate-stl] Received input:", text_input)

    call_model_response = call_model(text_input)
    if call_model_response == "":
        return Response(
            content="❌ Failed to call model API",
            media_type="text/plain",
            status_code=500
        )

    ans = create_cad_sequence(call_model_response)
    if not ans:
        return Response(
            content="❌ Failed to create CAD sequence",
            media_type="text/plain",
            status_code=500
        )

    try:
        stl_data = create_stl_geometry("./output/tmp.step")
        
        # Create response with both STL data and model response
        import json
        import base64
        
        # Encode STL data as base64 for JSON transport
        stl_base64 = base64.b64encode(stl_data).decode('utf-8')
        
        response_data = {
            "success": True,
            "stl_data": stl_base64,
            "model_response": json.loads(call_model_response),
            "timestamp": datetime.now().isoformat(),
            "input_text": text_input
        }
        
        return JSONResponse(
            content=response_data,
            status_code=200
        )
        
    except Exception as e:
        return Response(
            content=f"❌ Failed to create STL: {str(e)}",
            media_type="text/plain",
            status_code=500
        )

@app.get("/api/health")
async def health_check():
    return {"status": "ok"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="debug")

