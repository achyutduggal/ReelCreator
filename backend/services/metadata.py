import json
import os
import subprocess
import uuid
from pathlib import Path
from typing import Dict, List

import cv2
import numpy as np
from google import genai
from PIL import Image

STORAGE_DIR = Path(__file__).parent.parent / "storage"
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")


def get_gemini_client():
    return genai.Client(api_key=GEMINI_API_KEY)


def get_video_duration(filepath: str) -> float:
    result = subprocess.run(
        [
            "ffprobe",
            "-v", "quiet",
            "-show_entries", "format=duration",
            "-of", "csv=p=0",
            filepath,
        ],
        capture_output=True,
        text=True,
    )
    return float(result.stdout.strip())


def extract_keyframes(filepath: str, clip_id: str, snippet_duration: float = 2.0) -> List[Dict]:
    duration = get_video_duration(filepath)
    num_snippets = max(1, int(duration / snippet_duration))
    keyframe_dir = STORAGE_DIR / "metadata" / clip_id
    keyframe_dir.mkdir(parents=True, exist_ok=True)

    cap = cv2.VideoCapture(filepath)
    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    snippets = []

    for i in range(num_snippets):
        start_sec = i * snippet_duration
        end_sec = min((i + 1) * snippet_duration, duration)
        mid_sec = (start_sec + end_sec) / 2

        cap.set(cv2.CAP_PROP_POS_FRAMES, int(mid_sec * fps))
        ret, frame = cap.read()
        if not ret:
            continue

        keyframe_path = str(keyframe_dir / f"keyframe_{i}.jpg")
        cv2.imwrite(keyframe_path, frame)

        snippets.append({
            "index": i,
            "start_sec": start_sec,
            "end_sec": end_sec,
            "keyframe_path": keyframe_path,
            "description": "",
            "embedding": None,
        })

    cap.release()
    return snippets


async def describe_keyframes(snippets: List[Dict]) -> List[Dict]:
    client = get_gemini_client()

    for snippet in snippets:
        keyframe_path = snippet["keyframe_path"]
        if not os.path.exists(keyframe_path):
            continue

        img = Image.open(keyframe_path)

        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=[
                "Describe this video frame in one sentence for car marketing. "
                "Focus on: camera angle, car color, movement, setting, lighting.",
                img,
            ],
        )
        snippet["description"] = response.text.strip()

    return snippets


async def embed_descriptions(snippets: List[Dict]) -> List[Dict]:
    client = get_gemini_client()
    descriptions = [s["description"] for s in snippets if s["description"]]

    if not descriptions:
        return snippets

    response = client.models.embed_content(
        model="gemini-embedding-001",
        contents=descriptions,
    )

    desc_idx = 0
    for snippet in snippets:
        if snippet["description"]:
            snippet["embedding"] = response.embeddings[desc_idx].values
            desc_idx += 1

    return snippets


async def process_uploaded_clips(files) -> List[Dict]:
    from models.schemas import ClipMetadata, Snippet

    results = []

    for file in files:
        clip_id = uuid.uuid4().hex[:12]
        upload_path = STORAGE_DIR / "uploads" / f"{clip_id}_{file.filename}"

        content = await file.read()
        with open(upload_path, "wb") as f:
            f.write(content)

        duration = get_video_duration(str(upload_path))
        snippets = extract_keyframes(str(upload_path), clip_id)
        snippets = await describe_keyframes(snippets)
        snippets = await embed_descriptions(snippets)

        thumbnail_url = ""
        if snippets and os.path.exists(snippets[0]["keyframe_path"]):
            rel_path = os.path.relpath(snippets[0]["keyframe_path"], STORAGE_DIR)
            thumbnail_url = f"/api/storage/{rel_path}"

        overall_desc = " | ".join(s["description"] for s in snippets if s["description"])
        video_url = f"/api/storage/uploads/{clip_id}_{file.filename}"

        metadata = {
            "id": clip_id,
            "filename": file.filename,
            "duration": duration,
            "thumbnail_url": thumbnail_url,
            "video_url": video_url,
            "description": overall_desc,
            "snippets": snippets,
        }

        metadata_path = STORAGE_DIR / "metadata" / f"{clip_id}.json"
        with open(metadata_path, "w") as f:
            json.dump(metadata, f, indent=2)

        clip = ClipMetadata(
            id=clip_id,
            filename=file.filename,
            duration=duration,
            thumbnail_url=thumbnail_url,
            video_url=video_url,
            description=overall_desc,
            snippets=[
                Snippet(
                    index=s["index"],
                    start_sec=s["start_sec"],
                    end_sec=s["end_sec"],
                    keyframe_path=s["keyframe_path"],
                    description=s["description"],
                    embedding=s["embedding"],
                )
                for s in snippets
            ],
        )
        results.append(clip)

    return results
