import type {
  ClipMetadata,
  Beat,
  SequenceItem,
  UploadResponse,
  GenerateScriptResponse,
  MatchClipsResponse,
  RenderResponse,
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
  clips: ClipMetadata[]
): Promise<MatchClipsResponse> {
  const res = await fetch(`${API_BASE}/match-clips`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ beats, clips }),
  });

  if (!res.ok) throw new Error(`Clip matching failed: ${res.statusText}`);
  return res.json();
}

export async function generateVoice(
  sequence: SequenceItem[]
): Promise<MatchClipsResponse> {
  const res = await fetch(`${API_BASE}/generate-voice`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(sequence),
  });

  if (!res.ok) throw new Error(`Voice generation failed: ${res.statusText}`);
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
