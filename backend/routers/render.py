import json
import subprocess
import traceback
from pathlib import Path

from fastapi import APIRouter, HTTPException
from models.schemas import RenderRequest, RenderResponse

router = APIRouter()

STORAGE_DIR = Path(__file__).parent.parent / "storage"
FRONTEND_DIR = Path(__file__).parent.parent.parent / "frontend"


def serialize_sequence(sequence):
    """Serialize sequence items, compatible with both Pydantic v1 and v2."""
    result = []
    for s in sequence:
        if hasattr(s, "model_dump"):
            result.append(s.model_dump())
        else:
            result.append(s.dict())
    return result


@router.post("/render", response_model=RenderResponse)
async def render_reel(req: RenderRequest):
    try:
        seq_data = serialize_sequence(req.sequence)
        render_id = f"reel_{abs(hash(json.dumps(seq_data)))}"
        output_path = STORAGE_DIR / "renders" / f"{render_id}.mp4"

        if output_path.exists():
            return RenderResponse(
                video_url=f"/api/storage/renders/{render_id}.mp4",
                status="complete",
            )

        input_props = {
            "sequence": seq_data,
            "fps": req.fps,
            "backendUrl": "http://localhost:8000",
        }

        result = subprocess.run(
            [
                "node",
                str(FRONTEND_DIR / "render-server.mjs"),
                "--props",
                json.dumps(input_props),
                "--output",
                str(output_path),
                "--width",
                str(req.width),
                "--height",
                str(req.height),
            ],
            capture_output=True,
            text=True,
            timeout=300,
            cwd=str(FRONTEND_DIR),
        )

        if result.returncode != 0:
            print(f"Render stdout: {result.stdout}")
            print(f"Render stderr: {result.stderr}")
            raise HTTPException(
                status_code=500,
                detail=f"Render failed: {result.stderr[:500]}",
            )

        return RenderResponse(
            video_url=f"/api/storage/renders/{render_id}.mp4",
            status="complete",
        )

    except HTTPException:
        raise
    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=504, detail="Render timed out")
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
