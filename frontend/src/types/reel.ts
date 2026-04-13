export interface Snippet {
  index: number;
  start_sec: number;
  end_sec: number;
  keyframe_path: string;
  description: string;
  embedding: number[] | null;
}

export interface ClipMetadata {
  id: string;
  filename: string;
  duration: number;
  thumbnail_url: string;
  video_url: string;
  description: string;
  snippets: Snippet[];
}

export interface Beat {
  index: number;
  description: string;
  duration_sec: number;
  mood: string;
}

export interface SequenceItem {
  beat_index: number;
  clip_id: string;
  snippet_index: number;
  start_sec: number;
  end_sec: number;
  caption: string;
  score: number;
  video_url: string;
  voice_url: string;
}

export interface UploadResponse {
  clips: ClipMetadata[];
}

export interface GenerateScriptResponse {
  beats: Beat[];
}

export interface MatchClipsResponse {
  sequence: SequenceItem[];
}

export interface RenderResponse {
  video_url: string;
  status: string;
}

export interface Project {
  id: string;
  name: string;
  prompt: string;
  target_duration_sec: number;
  beats: Beat[];
  sequence: SequenceItem[];
  clips: ClipMetadata[];
  created_at: string;
  updated_at: string;
  thumbnail_url: string;
  render_url: string;
}

export interface ProjectListItem {
  id: string;
  name: string;
  prompt: string;
  created_at: string;
  updated_at: string;
  thumbnail_url: string;
  render_url: string;
  slide_count: number;
  total_duration: number;
}
