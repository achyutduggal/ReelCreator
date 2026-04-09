from __future__ import annotations
from typing import List, Optional

from pydantic import BaseModel


class Snippet(BaseModel):
    index: int
    start_sec: float
    end_sec: float
    keyframe_path: str
    description: str
    embedding: Optional[List[float]] = None


class ClipMetadata(BaseModel):
    id: str
    filename: str
    duration: float
    thumbnail_url: str
    video_url: str
    description: str
    snippets: List[Snippet]


class UploadResponse(BaseModel):
    clips: List[ClipMetadata]


class Beat(BaseModel):
    index: int
    description: str
    duration_sec: float
    mood: str


class GenerateScriptRequest(BaseModel):
    prompt: str
    target_duration_sec: float = 10.0
    clips: List[ClipMetadata]


class GenerateScriptResponse(BaseModel):
    beats: List[Beat]


class SequenceItem(BaseModel):
    beat_index: int
    clip_id: str
    snippet_index: int
    start_sec: float
    end_sec: float
    caption: str
    score: float
    video_url: str = ""
    voice_url: str = ""


class MatchClipsRequest(BaseModel):
    beats: List[Beat]
    clips: List[ClipMetadata]


class MatchClipsResponse(BaseModel):
    sequence: List[SequenceItem]


class RenderRequest(BaseModel):
    sequence: List[SequenceItem]
    fps: int = 30
    width: int = 1080
    height: int = 1920


class RenderResponse(BaseModel):
    video_url: str
    status: str = "complete"
