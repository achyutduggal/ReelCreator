from typing import List

from fastapi import APIRouter
from models.schemas import (
    GenerateScriptRequest,
    GenerateScriptResponse,
    GenerateVoiceRequest,
    MatchClipsRequest,
    MatchClipsResponse,
    SequenceItem,
)
from services.script_generator import generate_script
from services.clip_matcher import match_clips
from services.voice_generator import generate_voice_for_sequence, regenerate_voice_for_item

router = APIRouter()


@router.post("/generate-script", response_model=GenerateScriptResponse)
async def generate_script_endpoint(req: GenerateScriptRequest):
    beats = await generate_script(req.prompt, req.target_duration_sec, req.clips)
    return GenerateScriptResponse(beats=beats)


@router.post("/match-clips", response_model=MatchClipsResponse)
async def match_clips_endpoint(req: MatchClipsRequest):
    sequence = await match_clips(req.beats, req.clips, req.prompt)
    return MatchClipsResponse(sequence=sequence)


@router.post("/generate-voice", response_model=MatchClipsResponse)
async def generate_voice_endpoint(req: GenerateVoiceRequest):
    updated = await generate_voice_for_sequence(req.sequence, req.target_duration_sec)
    return MatchClipsResponse(sequence=updated)


@router.post("/regenerate-voice", response_model=SequenceItem)
async def regenerate_voice_endpoint(item: SequenceItem):
    updated = await regenerate_voice_for_item(item)
    return updated
