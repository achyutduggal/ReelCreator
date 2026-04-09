import React, { useState, useCallback } from "react";
import type { ClipMetadata, Beat, SequenceItem } from "./types/reel";
import { uploadClips, generateScript, matchClips, generateVoice } from "./api/client";
import UploadPanel from "./components/UploadPanel";
import PromptInput from "./components/PromptInput";
import ReelPreview from "./components/ReelPreview";
import TimelineEditor from "./components/TimelineEditor";

type AppState = "idle" | "uploading" | "generating" | "preview";

export default function App() {
  const [state, setState] = useState<AppState>("idle");
  const [clips, setClips] = useState<ClipMetadata[]>([]);
  const [beats, setBeats] = useState<Beat[]>([]);
  const [sequence, setSequence] = useState<SequenceItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = useCallback(async (files: File[]) => {
    setState("uploading");
    setError(null);
    try {
      const response = await uploadClips(files);
      setClips((prev) => [...prev, ...response.clips]);
      setState("idle");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
      setState("idle");
    }
  }, []);

  const handleGenerate = useCallback(
    async (prompt: string, duration: number) => {
      if (clips.length === 0) {
        setError("Please upload clips first");
        return;
      }
      setState("generating");
      setError(null);
      try {
        const scriptRes = await generateScript(prompt, duration, clips);
        setBeats(scriptRes.beats);

        const matchRes = await matchClips(scriptRes.beats, clips);

        // Generate voiceover for each beat's caption
        const voiceRes = await generateVoice(matchRes.sequence);
        setSequence(voiceRes.sequence);
        setState("preview");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Generation failed");
        setState("idle");
      }
    },
    [clips]
  );

  const handleSequenceUpdate = useCallback((newSequence: SequenceItem[]) => {
    setSequence(newSequence);
  }, []);

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="border-b border-gray-800 px-6 py-4">
        <h1 className="text-2xl font-bold">ReelCreator</h1>
        <p className="text-sm text-gray-400">
          Automatic marketing reel generator
        </p>
      </header>

      <div className="flex h-[calc(100vh-80px)]">
        {/* Left sidebar */}
        <div className="w-96 border-r border-gray-800 overflow-y-auto p-4 space-y-6">
          <UploadPanel
            onUpload={handleUpload}
            clips={clips}
            isUploading={state === "uploading"}
          />

          <PromptInput
            onGenerate={handleGenerate}
            isGenerating={state === "generating"}
            disabled={clips.length === 0}
          />

          {sequence.length > 0 && (
            <TimelineEditor
              sequence={sequence}
              beats={beats}
              clips={clips}
              onSequenceUpdate={handleSequenceUpdate}
            />
          )}
        </div>

        {/* Main preview area */}
        <div className="flex-1 flex items-center justify-center p-8">
          {error && (
            <div className="absolute top-20 right-4 bg-red-900/80 border border-red-700 text-red-200 px-4 py-2 rounded-lg">
              {error}
            </div>
          )}

          {state === "uploading" && (
            <div className="text-gray-400 text-center">
              <div className="animate-spin w-8 h-8 border-2 border-gray-400 border-t-white rounded-full mx-auto mb-4" />
              <p>Processing clips...</p>
              <p className="text-sm text-gray-500">
                Extracting keyframes & generating descriptions
              </p>
            </div>
          )}

          {state === "generating" && (
            <div className="text-gray-400 text-center">
              <div className="animate-spin w-8 h-8 border-2 border-gray-400 border-t-white rounded-full mx-auto mb-4" />
              <p>Generating reel...</p>
              <p className="text-sm text-gray-500">
                Creating script & matching clips
              </p>
            </div>
          )}

          {state === "preview" && sequence.length > 0 && (
            <ReelPreview
              sequence={sequence}
              beats={beats}
              clips={clips}
            />
          )}

          {state === "idle" && clips.length === 0 && (
            <div className="text-gray-500 text-center">
              <p className="text-lg">Upload video clips to get started</p>
              <p className="text-sm mt-2">
                Drag & drop car footage into the upload panel
              </p>
            </div>
          )}

          {state === "idle" && clips.length > 0 && sequence.length === 0 && (
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
    </div>
  );
}
