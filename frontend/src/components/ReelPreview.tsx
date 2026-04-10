import React, { useMemo, useState } from "react";
import { Player } from "@remotion/player";
import { ReelComposition } from "../remotion/ReelComposition";
import { renderReel } from "../api/client";
import type { Beat, ClipMetadata, SequenceItem } from "../types/reel";

interface Props {
  sequence: SequenceItem[];
  beats: Beat[];
  clips: ClipMetadata[];
}

const BACKEND_URL = "http://localhost:8000";

export default function ReelPreview({ sequence, beats, clips }: Props) {
  const [isRendering, setIsRendering] = useState(false);
  const [renderUrl, setRenderUrl] = useState<string | null>(null);

  const totalDuration = useMemo(
    () =>
      sequence.reduce(
        (sum, item) => sum + (item.end_sec - item.start_sec),
        0
      ),
    [sequence]
  );

  const fps = 30;
  const durationInFrames = Math.max(1, Math.round(totalDuration * fps));

  const handleExport = async () => {
    setIsRendering(true);
    try {
      const res = await renderReel(sequence);
      setRenderUrl(`${BACKEND_URL}${res.video_url}`);
    } catch (err) {
      console.error("Render failed:", err);
    } finally {
      setIsRendering(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div
        className="rounded-xl overflow-hidden shadow-2xl"
        style={{ width: 360, height: 640 }}
      >
        <Player
          component={ReelComposition}
          inputProps={{ sequence, fps, backendUrl: BACKEND_URL }}
          durationInFrames={durationInFrames}
          compositionWidth={1080}
          compositionHeight={1920}
          fps={fps}
          style={{ width: 360, height: 640 }}
          controls
          autoPlay
          loop
        />
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={handleExport}
          disabled={isRendering}
          className="bg-green-600 hover:bg-green-700 disabled:bg-gray-700 text-white font-medium py-2 px-6 rounded-lg text-sm transition-colors"
        >
          {isRendering ? "Rendering..." : "Export MP4"}
        </button>

        {renderUrl && (
          <a
            href={renderUrl}
            download
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg text-sm transition-colors"
          >
            Download
          </a>
        )}
      </div>

      <p className="text-xs text-gray-500">
        {sequence.length} beats &middot; {totalDuration.toFixed(1)}s total
      </p>
    </div>
  );
}
