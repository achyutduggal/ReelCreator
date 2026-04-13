import os
import subprocess
from pathlib import Path
from typing import List

import edge_tts

from models.schemas import SequenceItem

STORAGE_DIR = Path(__file__).parent.parent / "storage"

# Deep, cinematic male voice for car marketing
VOICE = "en-US-GuyNeural"
# Slightly slower for dramatic pacing
RATE = "-10%"
PITCH = "-5Hz"
# Extra padding (seconds) after voice ends before cutting to next beat
VOICE_TAIL_PADDING = 0.3
# Maximum a single beat can expand beyond its original duration (seconds)
MAX_BEAT_EXPANSION = 1.0


def get_audio_duration(filepath: str) -> float:
    """Get the duration of an audio file in seconds using ffprobe."""
    try:
        result = subprocess.run(
            [
                "ffprobe", "-v", "quiet",
                "-show_entries", "format=duration",
                "-of", "csv=p=0",
                filepath,
            ],
            capture_output=True, text=True,
        )
        return float(result.stdout.strip())
    except (ValueError, Exception):
        return 0.0


async def generate_voice_for_sequence(
    sequence: List[SequenceItem],
    target_duration_sec: float = 0,
) -> List[SequenceItem]:
    """Generate TTS audio for each beat's caption and update voice_url.

    If target_duration_sec > 0, enforces the total reel duration as a hard
    cap by limiting per-beat expansion and applying proportional scaling.
    """

    voice_dir = STORAGE_DIR / "voices"
    voice_dir.mkdir(parents=True, exist_ok=True)

    # Store original beat durations before any voice expansion
    original_durations = [
        item.end_sec - item.start_sec for item in sequence
    ]

    for i, item in enumerate(sequence):
        if not item.caption:
            continue

        filename = f"voice_beat_{item.beat_index}_{item.clip_id}.mp3"
        voice_path = voice_dir / filename

        # Generate audio if not cached
        if not voice_path.exists():
            communicate = edge_tts.Communicate(
                text=item.caption,
                voice=VOICE,
                rate=RATE,
                pitch=PITCH,
            )
            await communicate.save(str(voice_path))

        item.voice_url = f"/api/storage/voices/{filename}"

        # Allow limited beat expansion so voice isn't cut off mid-word,
        # but cap how much any single beat can grow
        voice_duration = get_audio_duration(str(voice_path))
        beat_duration = item.end_sec - item.start_sec
        needed = voice_duration + VOICE_TAIL_PADDING

        if needed > beat_duration:
            max_allowed = original_durations[i] + MAX_BEAT_EXPANSION
            item.end_sec = round(
                item.start_sec + min(needed, max_allowed), 2
            )

    # Hard enforcement: if target_duration_sec is set, scale everything
    # back to fit exactly within the budget
    if target_duration_sec > 0:
        _enforce_total_duration(sequence, target_duration_sec)

    return sequence


def _enforce_total_duration(
    sequence: List[SequenceItem],
    target_duration_sec: float,
) -> None:
    """Proportionally scale all beat durations so they sum to exactly
    target_duration_sec. Modifies sequence in place."""

    total = sum(item.end_sec - item.start_sec for item in sequence)
    if total <= 0 or abs(total - target_duration_sec) < 0.1:
        return

    scale = target_duration_sec / total

    for item in sequence:
        duration = item.end_sec - item.start_sec
        new_duration = round(duration * scale, 2)
        item.end_sec = round(item.start_sec + new_duration, 2)

    # Fix rounding error on the last beat
    current_total = sum(item.end_sec - item.start_sec for item in sequence)
    if sequence and abs(current_total - target_duration_sec) > 0.01:
        diff = target_duration_sec - current_total
        last = sequence[-1]
        last.end_sec = round(last.end_sec + diff, 2)


async def regenerate_voice_for_item(item: SequenceItem) -> SequenceItem:
    """Regenerate TTS audio for a single sequence item (after caption edit).

    Deletes the old cached MP3 and generates a fresh one from the new caption.
    """

    voice_dir = STORAGE_DIR / "voices"
    voice_dir.mkdir(parents=True, exist_ok=True)

    filename = f"voice_beat_{item.beat_index}_{item.clip_id}.mp3"
    voice_path = voice_dir / filename

    # Delete old cached file so it regenerates with new caption
    if voice_path.exists():
        voice_path.unlink()

    if not item.caption:
        item.voice_url = ""
        return item

    communicate = edge_tts.Communicate(
        text=item.caption,
        voice=VOICE,
        rate=RATE,
        pitch=PITCH,
    )
    await communicate.save(str(voice_path))

    item.voice_url = f"/api/storage/voices/{filename}"

    # Allow limited expansion for single-beat regeneration
    voice_duration = get_audio_duration(str(voice_path))
    beat_duration = item.end_sec - item.start_sec
    needed = voice_duration + VOICE_TAIL_PADDING

    if needed > beat_duration:
        max_allowed = beat_duration + MAX_BEAT_EXPANSION
        item.end_sec = round(
            item.start_sec + min(needed, max_allowed), 2
        )

    return item
