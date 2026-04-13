import json
import os
from typing import List

from google import genai
from models.schemas import Beat, ClipMetadata, SequenceItem

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

# Average speaking rate for TTS at -10% speed: ~2.2 words per second
WORDS_PER_SECOND = 2.2


async def generate_captions(
    beats: List[Beat],
    sequence: List[SequenceItem],
    clips: List[ClipMetadata],
    prompt: str = "",
) -> List[SequenceItem]:
    """Generate a cohesive marketing narration script for the reel.

    Enforces strict per-beat word limits based on beat duration so that
    TTS audio fits within the time budget without extending beat durations.
    """
    client = genai.Client(api_key=GEMINI_API_KEY)

    beat_context_lines = []
    total_word_budget = 0

    for item in sequence:
        beat = beats[item.beat_index] if item.beat_index < len(beats) else None

        # Find the matched snippet's description from clip metadata
        snippet_desc = ""
        for clip in clips:
            if clip.id == item.clip_id:
                for snippet in clip.snippets:
                    if snippet.index == item.snippet_index:
                        snippet_desc = snippet.description
                        break
                break

        duration = round(item.end_sec - item.start_sec, 1)
        mood = beat.mood if beat else "cinematic"
        beat_desc = beat.description if beat else "Video shot"

        # Strict word budget: leave 0.3s padding for TTS tail
        speakable_sec = max(0.5, duration - 0.3)
        max_words = max(3, int(speakable_sec * WORDS_PER_SECOND))
        total_word_budget += max_words

        beat_context_lines.append(
            f"Beat {item.beat_index + 1} ({duration}s, MAX {max_words} WORDS):\n"
            f"  Mood: {mood}\n"
            f"  Shot: {beat_desc}\n"
            f"  Footage shows: {snippet_desc}"
        )

    beat_context = "\n\n".join(beat_context_lines)

    system_prompt = f"""You are a professional automotive marketing copywriter writing a voiceover script for a car reel.

Creative direction: "{prompt or 'Highlight the car features'}"

CRITICAL TIMING RULES — these are non-negotiable:
- Each beat has a MAXIMUM WORD COUNT shown in parentheses. You MUST NOT exceed it.
- The word count is calculated from the beat's duration. Going over means the voiceover will be cut off.
- Count every word including articles (a, the, an) and prepositions.
- If a beat allows MAX 5 WORDS, your narration for that beat must be 5 words or fewer. No exceptions.
- Shorter is always better than longer. Leave breathing room.

CONTENT RULES:
- Write a connected marketing pitch — each line flows into the next
- Reference specific car features VISIBLE in the footage (headlights, wheels, body lines, interior, etc.)
- Match the mood (cinematic = grand, dramatic = intense, energetic = dynamic, elegant = refined)
- Use second person ("you") or third person about the car
- No generic filler — every word must earn its place

Shot breakdown:
{beat_context}

Output ONLY a valid JSON array of strings, one narration line per beat.
["line for beat 1", "line for beat 2", ...]"""

    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=system_prompt,
    )

    text = response.text.strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[1]
        text = text.rsplit("```", 1)[0]
        text = text.strip()

    captions = json.loads(text)

    # Hard enforcement: truncate any caption that exceeds its word budget
    for i, item in enumerate(sequence):
        if i < len(captions):
            beat = beats[item.beat_index] if item.beat_index < len(beats) else None
            duration = item.end_sec - item.start_sec
            speakable_sec = max(0.5, duration - 0.3)
            max_words = max(3, int(speakable_sec * WORDS_PER_SECOND))

            words = captions[i].split()
            if len(words) > max_words:
                captions[i] = " ".join(words[:max_words])

            item.caption = captions[i]

    return sequence
