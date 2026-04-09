from typing import List

from fastapi import APIRouter, UploadFile, File
from models.schemas import UploadResponse
from services.metadata import process_uploaded_clips

router = APIRouter()


@router.post("/upload", response_model=UploadResponse)
async def upload_clips(files: List[UploadFile] = File(...)):
    clips = await process_uploaded_clips(files)
    return UploadResponse(clips=clips)
