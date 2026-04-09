import os
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from routers import upload, generate, render

load_dotenv()

app = FastAPI(title="ReelCreator API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:8080"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

STORAGE_DIR = Path(__file__).parent / "storage"
STORAGE_DIR.mkdir(exist_ok=True)
(STORAGE_DIR / "uploads").mkdir(exist_ok=True)
(STORAGE_DIR / "metadata").mkdir(exist_ok=True)
(STORAGE_DIR / "renders").mkdir(exist_ok=True)
(STORAGE_DIR / "voices").mkdir(exist_ok=True)

app.mount(
    "/api/storage",
    StaticFiles(directory=str(STORAGE_DIR)),
    name="storage",
)

app.include_router(upload.router, prefix="/api")
app.include_router(generate.router, prefix="/api")
app.include_router(render.router, prefix="/api")


@app.get("/api/health")
def health():
    return {"status": "ok"}
