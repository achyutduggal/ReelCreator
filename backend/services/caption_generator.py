import json
import os
from typing import List

from google import genai
from models.schemas import Beat, SequenceItem

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")


async def generate_captions(
    beats: List[Beat],
    sequence: List[SequenceItem],
) -> List[SequenceItem]:
    client = genai.Client(api_key=GEMINI_API_KEY)

    beat_descriptions = []
    for item in sequence:
        beat = beats[item.beat_index]
        beat_descriptions.append(
            f"Beat {item.beat_index}: {beat.description} (mood: {beat.mood})"
        )

    prompt = f"""Generate short, punchy marketing captions (3-8 words each) for a luxury car reel.
Each caption should match the beat's mood and visual.

Beats:
{chr(10).join(beat_descriptions)}

Output ONLY valid JSON array of strings, one caption per beat:
["caption1", "caption2", ...]"""

    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt,
    )

    text = response.text.strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[1]
        text = text.rsplit("```", 1)[0]

    captions = json.loads(text)

    for i, item in enumerate(sequence):
        if i < len(captions):
            item.caption = captions[i]

    return sequence
