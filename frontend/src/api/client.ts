import type {
  ClipMetadata,
  Beat,
  SequenceItem,
  UploadResponse,
  GenerateScriptResponse,
  MatchClipsResponse,
  RenderResponse,
  Project,
  ProjectListItem,
} from "../types/reel";

const API_BASE = "/api";

export async function uploadClips(files: File[]): Promise<UploadResponse> {
  const formData = new FormData();
  files.forEach((file) => formData.append("files", file));

  const res = await fetch(`${API_BASE}/upload`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) throw new Error(`Upload failed: ${res.statusText}`);
  return res.json();
}

export async function generateScript(
  prompt: string,
  targetDurationSec: number,
  clips: ClipMetadata[]
): Promise<GenerateScriptResponse> {
  const res = await fetch(`${API_BASE}/generate-script`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt,
      target_duration_sec: targetDurationSec,
      clips,
    }),
  });

  if (!res.ok) throw new Error(`Script generation failed: ${res.statusText}`);
  return res.json();
}

export async function matchClips(
  beats: Beat[],
  clips: ClipMetadata[],
  prompt: string = ""
): Promise<MatchClipsResponse> {
  const res = await fetch(`${API_BASE}/match-clips`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ beats, clips, prompt }),
  });

  if (!res.ok) throw new Error(`Clip matching failed: ${res.statusText}`);
  return res.json();
}

export async function generateVoice(
  sequence: SequenceItem[],
  targetDurationSec: number = 0
): Promise<MatchClipsResponse> {
  const res = await fetch(`${API_BASE}/generate-voice`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sequence, target_duration_sec: targetDurationSec }),
  });

  if (!res.ok) throw new Error(`Voice generation failed: ${res.statusText}`);
  return res.json();
}

export async function regenerateVoice(
  item: SequenceItem
): Promise<SequenceItem> {
  const res = await fetch(`${API_BASE}/regenerate-voice`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(item),
  });

  if (!res.ok) throw new Error(`Voice regeneration failed: ${res.statusText}`);
  return res.json();
}

export async function renderReel(
  sequence: SequenceItem[],
  fps: number = 30,
  width: number = 1080,
  height: number = 1920
): Promise<RenderResponse> {
  const res = await fetch(`${API_BASE}/render`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sequence, fps, width, height }),
  });

  if (!res.ok) throw new Error(`Render failed: ${res.statusText}`);
  return res.json();
}

export async function saveProject(project: Project): Promise<Project> {
  const res = await fetch(`${API_BASE}/projects/save`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(project),
  });

  if (!res.ok) throw new Error(`Save failed: ${res.statusText}`);
  return res.json();
}

export async function listProjects(): Promise<ProjectListItem[]> {
  const res = await fetch(`${API_BASE}/projects`);
  if (!res.ok) throw new Error(`Failed to load projects: ${res.statusText}`);
  return res.json();
}

export async function loadProject(id: string): Promise<Project> {
  const res = await fetch(`${API_BASE}/projects/${id}`);
  if (!res.ok) throw new Error(`Failed to load project: ${res.statusText}`);
  return res.json();
}

export async function deleteProject(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/projects/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error(`Failed to delete project: ${res.statusText}`);
}
