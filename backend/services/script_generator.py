import json
import os
from typing import List

from google import genai
from models.schemas import Beat, ClipMetadata

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")


async def generate_script(
    prompt: str,
    target_duration_sec: float,
    clips: List[ClipMetadata],
) -> List[Beat]:
    client = genai.Client(api_key=GEMINI_API_KEY)

    clip_descriptions = []
    for clip in clips:
        for snippet in clip.snippets:
            clip_descriptions.append(
                f"- Clip '{clip.filename}' snippet {snippet.index}: {snippet.description}"
            )

    clip_context = "\n".join(clip_descriptions)

    system_prompt = f"""You are a professional video editor creating marketing reels for luxury cars.

Given a creative direction and available footage, generate a beat-by-beat script for a {target_duration_sec}-second reel.

Available footage:
{clip_context}

Rules:
- The sum of all beat durations MUST equal EXACTLY {target_duration_sec} seconds. This is critical.
- Each beat should be 2-4 seconds
- Write enough beats so that durations add up to exactly {target_duration_sec} seconds
- Write beats that can be fulfilled by the available footage
- Each beat needs: description (what shot to use), duration_sec, mood (cinematic/dramatic/energetic/elegant)
- Reuse similar footage types if needed to fill the duration

Output ONLY valid JSON array:
[{{"index": 0, "description": "...", "duration_sec": 2.0, "mood": "..."}}]"""

    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=[system_prompt, f"Creative direction: {prompt}"],
    )

    text = response.text.strip()
    # Strip markdown code fences if present
    if text.startswith("```"):
        text = text.split("\n", 1)[1]
        text = text.rsplit("```", 1)[0]

    beats_data = json.loads(text)
    beats = [Beat(**b) for b in beats_data]

    # Enforce exact duration: scale beat durations to match target
    total = sum(b.duration_sec for b in beats)
    if total > 0 and abs(total - target_duration_sec) > 0.1:
        scale = target_duration_sec / total
        for b in beats:
            b.duration_sec = round(b.duration_sec * scale, 1)
        # Fix rounding error on the last beat
        remaining = target_duration_sec - sum(b.duration_sec for b in beats[:-1])
        beats[-1].duration_sec = round(remaining, 1)

    return beats
