import json
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import List

from fastapi import APIRouter, HTTPException
from models.schemas import Project, ProjectListItem

router = APIRouter()

STORAGE_DIR = Path(__file__).parent.parent / "storage"
PROJECTS_DIR = STORAGE_DIR / "projects"


def _ensure_dir():
    PROJECTS_DIR.mkdir(parents=True, exist_ok=True)


def _project_path(project_id: str) -> Path:
    return PROJECTS_DIR / f"{project_id}.json"


def _serialize(project: Project) -> dict:
    if hasattr(project, "model_dump"):
        return project.model_dump()
    return project.dict()


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


@router.post("/projects/save", response_model=Project)
async def save_project(project: Project):
    _ensure_dir()

    is_new = not project.id
    if is_new:
        project.id = uuid.uuid4().hex[:12]
        project.created_at = _now_iso()

    project.updated_at = _now_iso()

    # Derive thumbnail from first clip in sequence if not set
    if not project.thumbnail_url and project.sequence:
        first = project.sequence[0]
        clip = next((c for c in project.clips if c.id == first.clip_id), None)
        if clip and clip.thumbnail_url:
            project.thumbnail_url = clip.thumbnail_url

    # Auto-name from prompt if empty
    if not project.name and project.prompt:
        project.name = project.prompt[:50].strip()
        if len(project.prompt) > 50:
            project.name += "..."

    path = _project_path(project.id)
    path.write_text(json.dumps(_serialize(project), indent=2))

    return project


@router.get("/projects", response_model=List[ProjectListItem])
async def list_projects():
    _ensure_dir()

    items = []
    for f in sorted(PROJECTS_DIR.glob("*.json"), key=lambda p: p.stat().st_mtime, reverse=True):
        try:
            data = json.loads(f.read_text())
            seq = data.get("sequence", [])
            total_dur = sum(
                (s.get("end_sec", 0) - s.get("start_sec", 0)) for s in seq
            )
            items.append(ProjectListItem(
                id=data.get("id", f.stem),
                name=data.get("name", "Untitled"),
                prompt=data.get("prompt", ""),
                created_at=data.get("created_at", ""),
                updated_at=data.get("updated_at", ""),
                thumbnail_url=data.get("thumbnail_url", ""),
                render_url=data.get("render_url", ""),
                slide_count=len(seq),
                total_duration=round(total_dur, 1),
            ))
        except (json.JSONDecodeError, KeyError):
            continue

    return items


@router.get("/projects/{project_id}", response_model=Project)
async def get_project(project_id: str):
    path = _project_path(project_id)
    if not path.exists():
        raise HTTPException(status_code=404, detail="Project not found")

    data = json.loads(path.read_text())
    return Project(**data)


@router.delete("/projects/{project_id}")
async def delete_project(project_id: str):
    path = _project_path(project_id)
    if not path.exists():
        raise HTTPException(status_code=404, detail="Project not found")

    path.unlink()
    return {"status": "deleted"}
