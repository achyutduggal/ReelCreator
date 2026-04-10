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
) -> List[SequenceItem]:
    """Generate TTS audio for each beat's caption and update voice_url.

    Also extends beat duration if the voice audio is longer than the
    video segment, so the speech is never cut off mid-word.
    """

    voice_dir = STORAGE_DIR / "voices"
    voice_dir.mkdir(parents=True, exist_ok=True)

    for item in sequence:
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

        # Extend beat duration if voice is longer than the video segment
        voice_duration = get_audio_duration(str(voice_path))
        beat_duration = item.end_sec - item.start_sec
        if voice_duration + VOICE_TAIL_PADDING > beat_duration:
            item.end_sec = round(
                item.start_sec + voice_duration + VOICE_TAIL_PADDING, 2
            )

    return sequence
