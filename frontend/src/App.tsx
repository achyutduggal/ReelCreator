import React, { useState, useCallback } from "react";
import type { ClipMetadata, Beat, SequenceItem, Project } from "./types/reel";
import {
  uploadClips,
  generateScript,
  matchClips,
  generateVoice,
  saveProject,
  loadProject,
} from "./api/client";
import UploadPanel from "./components/UploadPanel";
import PromptInput from "./components/PromptInput";
import ReelPreview from "./components/ReelPreview";
import SlideEditor from "./components/SlideEditor";
import FilmstripTimeline from "./components/FilmstripTimeline";
import ProjectLibrary from "./components/ProjectLibrary";

type AppView = "library" | "editor";
type EditorState = "idle" | "uploading" | "generating" | "preview";

export default function App() {
  // Top-level view: library or editor
  const [view, setView] = useState<AppView>("library");

  // Editor state
  const [editorState, setEditorState] = useState<EditorState>("idle");
  const [clips, setClips] = useState<ClipMetadata[]>([]);
  const [beats, setBeats] = useState<Beat[]>([]);
  const [sequence, setSequence] = useState<SequenceItem[]>([]);
  const [selectedSlide, setSelectedSlide] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Project tracking
  const [projectId, setProjectId] = useState<string>("");
  const [projectName, setProjectName] = useState<string>("");
  const [projectPrompt, setProjectPrompt] = useState<string>("");
  const [projectDuration, setProjectDuration] = useState<number>(10);
  const [renderUrl, setRenderUrl] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<string>("");

  // --- Handlers ---

  const resetEditor = useCallback(() => {
    setEditorState("idle");
    setClips([]);
    setBeats([]);
    setSequence([]);
    setSelectedSlide(null);
    setError(null);
    setProjectId("");
    setProjectName("");
    setProjectPrompt("");
    setProjectDuration(10);
    setRenderUrl("");
    setLastSaved("");
  }, []);

  const handleNewProject = useCallback(() => {
    resetEditor();
    setView("editor");
  }, [resetEditor]);

  const handleLoadProject = useCallback(async (id: string) => {
    try {
      const project = await loadProject(id);
      setProjectId(project.id);
      setProjectName(project.name);
      setProjectPrompt(project.prompt);
      setProjectDuration(project.target_duration_sec);
      setClips(project.clips);
      setBeats(project.beats);
      setSequence(project.sequence);
      setRenderUrl(project.render_url);
      setSelectedSlide(project.sequence.length > 0 ? 0 : null);
      setEditorState(project.sequence.length > 0 ? "preview" : "idle");
      setError(null);
      setLastSaved("");
      setView("editor");
    } catch (err) {
      console.error("Failed to load project:", err);
    }
  }, []);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      const project: Project = {
        id: projectId,
        name: projectName,
        prompt: projectPrompt,
        target_duration_sec: projectDuration,
        beats,
        sequence,
        clips,
        created_at: "",
        updated_at: "",
        thumbnail_url: "",
        render_url: renderUrl,
      };
      const saved = await saveProject(project);
      setProjectId(saved.id);
      setProjectName(saved.name);
      setLastSaved("Saved");
      setTimeout(() => setLastSaved(""), 2000);
    } catch (err) {
      console.error("Save failed:", err);
      setLastSaved("Save failed");
      setTimeout(() => setLastSaved(""), 3000);
    } finally {
      setIsSaving(false);
    }
  }, [projectId, projectName, projectPrompt, projectDuration, beats, sequence, clips, renderUrl]);

  const handleUpload = useCallback(async (files: File[]) => {
    setEditorState("uploading");
    setError(null);
    try {
      const response = await uploadClips(files);
      setClips((prev) => [...prev, ...response.clips]);
      setEditorState("idle");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
      setEditorState("idle");
    }
  }, []);

  const handleGenerate = useCallback(
    async (prompt: string, duration: number) => {
      if (clips.length === 0) {
        setError("Please upload clips first");
        return;
      }
      setEditorState("generating");
      setError(null);
      setProjectPrompt(prompt);
      setProjectDuration(duration);
      try {
        const scriptRes = await generateScript(prompt, duration, clips);
        setBeats(scriptRes.beats);

        const matchRes = await matchClips(scriptRes.beats, clips, prompt);

        const voiceRes = await generateVoice(matchRes.sequence, duration);
        setSequence(voiceRes.sequence);
        setSelectedSlide(0);
        setEditorState("preview");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Generation failed");
        setEditorState("idle");
      }
    },
    [clips]
  );

  const handleSlideUpdate = useCallback(
    (index: number, updated: SequenceItem) => {
      setSequence((prev) => {
        const next = [...prev];
        next[index] = updated;
        return next;
      });
    },
    []
  );

  const handleSlideDelete = useCallback(
    (index: number) => {
      setSequence((prev) => {
        const next = prev.filter((_, i) => i !== index);
        return next.map((item, i) => ({ ...item, beat_index: i }));
      });
      setSelectedSlide((prev) => {
        if (prev === null) return null;
        if (prev >= sequence.length - 1) return Math.max(0, sequence.length - 2);
        if (prev > index) return prev - 1;
        return prev;
      });
      if (sequence.length <= 1) {
        setSelectedSlide(null);
      }
    },
    [sequence.length]
  );

  const handleReorder = useCallback(
    (fromIndex: number, toIndex: number) => {
      setSequence((prev) => {
        const next = [...prev];
        const [moved] = next.splice(fromIndex, 1);
        next.splice(toIndex, 0, moved);
        return next.map((item, i) => ({ ...item, beat_index: i }));
      });
      setSelectedSlide(toIndex);
    },
    []
  );

  const handleRenderComplete = useCallback((url: string) => {
    setRenderUrl(url);
  }, []);

  // --- Library View ---

  if (view === "library") {
    return (
      <div className="h-screen flex flex-col bg-gray-950 text-white">
        <header className="flex-shrink-0 border-b border-gray-800 px-6 py-3">
          <h1 className="text-xl font-bold">ReelCreator</h1>
          <p className="text-xs text-gray-400">
            Automatic marketing reel generator
          </p>
        </header>
        <ProjectLibrary
          onLoad={handleLoadProject}
          onNewProject={handleNewProject}
        />
      </div>
    );
  }

  // --- Editor View ---

  const hasSequence = editorState === "preview" && sequence.length > 0;
  const selected =
    selectedSlide !== null && selectedSlide < sequence.length
      ? sequence[selectedSlide]
      : null;

  return (
    <div className="h-screen flex flex-col bg-gray-950 text-white">
      {/* Header */}
      <header className="flex-shrink-0 border-b border-gray-800 px-6 py-3 flex items-center gap-4">
        {/* Back to library */}
        <button
          type="button"
          onClick={() => setView("library")}
          className="text-gray-400 hover:text-white transition-colors text-sm"
          title="Back to library"
        >
          &larr; Reels
        </button>

        <div className="h-4 border-l border-gray-700" />

        {/* Project name */}
        <input
          type="text"
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
          placeholder="Untitled Reel"
          className="bg-transparent text-white font-semibold text-sm border-none outline-none placeholder-gray-600 w-48"
        />

        <div className="flex-1" />

        {/* Save status */}
        {lastSaved && (
          <span className="text-xs text-green-400">{lastSaved}</span>
        )}

        {/* Save button */}
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving || (sequence.length === 0 && clips.length === 0)}
          className="bg-gray-800 hover:bg-gray-700 disabled:bg-gray-900 disabled:text-gray-600 text-white text-xs font-medium py-1.5 px-4 rounded-lg transition-colors border border-gray-700"
        >
          {isSaving ? "Saving..." : "Save"}
        </button>

        {/* Error */}
        {error && (
          <div className="bg-red-900/80 border border-red-700 text-red-200 px-4 py-1.5 rounded-lg text-xs">
            {error}
          </div>
        )}
      </header>

      {/* Main content area */}
      <div className="flex-1 flex min-h-0">
        {/* Left sidebar */}
        <div className="w-80 flex-shrink-0 border-r border-gray-800 overflow-y-auto p-4 space-y-5">
          {hasSequence && selected && selectedSlide !== null ? (
            <SlideEditor
              slide={selected}
              slideIndex={selectedSlide}
              totalSlides={sequence.length}
              beat={beats[selected.beat_index]}
              clip={clips.find((c) => c.id === selected.clip_id)}
              onUpdate={(updated) => handleSlideUpdate(selectedSlide, updated)}
              onDelete={() => handleSlideDelete(selectedSlide)}
            />
          ) : (
            <>
              <UploadPanel
                onUpload={handleUpload}
                clips={clips}
                isUploading={editorState === "uploading"}
              />
              <PromptInput
                onGenerate={handleGenerate}
                isGenerating={editorState === "generating"}
                disabled={clips.length === 0}
              />
            </>
          )}

          {hasSequence && (
            <button
              type="button"
              onClick={() => setSelectedSlide(null)}
              className={`w-full text-xs py-1.5 rounded-lg transition-colors ${
                selectedSlide === null
                  ? "bg-gray-800 text-gray-400"
                  : "bg-gray-800 hover:bg-gray-700 text-gray-300"
              }`}
            >
              {selectedSlide !== null
                ? "Back to Upload & Prompt"
                : "Showing Upload & Prompt"}
            </button>
          )}
        </div>

        {/* Center preview area */}
        <div className="flex-1 flex items-center justify-center p-6">
          {editorState === "uploading" && (
            <div className="text-gray-400 text-center">
              <div className="animate-spin w-8 h-8 border-2 border-gray-400 border-t-white rounded-full mx-auto mb-4" />
              <p>Processing clips...</p>
              <p className="text-sm text-gray-500">
                Extracting keyframes & generating descriptions
              </p>
            </div>
          )}

          {editorState === "generating" && (
            <div className="text-gray-400 text-center">
              <div className="animate-spin w-8 h-8 border-2 border-gray-400 border-t-white rounded-full mx-auto mb-4" />
              <p>Generating reel...</p>
              <p className="text-sm text-gray-500">
                Creating script & matching clips
              </p>
            </div>
          )}

          {hasSequence && (
            <ReelPreview
              sequence={sequence}
              beats={beats}
              clips={clips}
              onRenderComplete={handleRenderComplete}
            />
          )}

          {editorState === "idle" && clips.length === 0 && (
            <div className="text-gray-500 text-center">
              <p className="text-lg">Upload video clips to get started</p>
              <p className="text-sm mt-2">
                Drag & drop car footage into the upload panel
              </p>
            </div>
          )}

          {editorState === "idle" && clips.length > 0 && sequence.length === 0 && (
            <div className="text-gray-500 text-center">
              <p className="text-lg">
                {clips.length} clip{clips.length > 1 ? "s" : ""} ready
              </p>
              <p className="text-sm mt-2">
                Enter a prompt to generate your reel
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Bottom filmstrip timeline */}
      {hasSequence && (
        <FilmstripTimeline
          sequence={sequence}
          clips={clips}
          selectedIndex={selectedSlide}
          onSelect={setSelectedSlide}
          onReorder={handleReorder}
        />
      )}
    </div>
  );
}
