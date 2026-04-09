from fastapi import APIRouter
from models.schemas import (
    GenerateScriptRequest,
    GenerateScriptResponse,
    MatchClipsRequest,
    MatchClipsResponse,
)
from services.script_generator import generate_script
from services.clip_matcher import match_clips

router = APIRouter()


@router.post("/generate-script", response_model=GenerateScriptResponse)
async def generate_script_endpoint(req: GenerateScriptRequest):
    beats = await generate_script(req.prompt, req.target_duration_sec, req.clips)
    return GenerateScriptResponse(beats=beats)


@router.post("/match-clips", response_model=MatchClipsResponse)
async def match_clips_endpoint(req: MatchClipsRequest):
    sequence = await match_clips(req.beats, req.clips)
    return MatchClipsResponse(sequence=sequence)
