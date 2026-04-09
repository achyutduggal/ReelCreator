import React from "react";
import type { Beat, ClipMetadata, SequenceItem } from "../types/reel";

interface Props {
  sequence: SequenceItem[];
  beats: Beat[];
  clips: ClipMetadata[];
  onSequenceUpdate: (sequence: SequenceItem[]) => void;
}

export default function TimelineEditor({
  sequence,
  beats,
  clips,
  onSequenceUpdate,
}: Props) {
  const getClipName = (clipId: string) =>
    clips.find((c) => c.id === clipId)?.filename ?? clipId;

  const moveItem = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= sequence.length) return;
    const newSequence = [...sequence];
    const [moved] = newSequence.splice(fromIndex, 1);
    newSequence.splice(toIndex, 0, moved);
    // Reassign beat indices to maintain order
    const updated = newSequence.map((item, i) => ({
      ...item,
      beat_index: i,
    }));
    onSequenceUpdate(updated);
  };

  return (
    <div>
      <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-3">
        Timeline
      </h2>

      <div className="space-y-1">
        {sequence.map((item, idx) => {
          const beat = beats[item.beat_index];
          return (
            <div
              key={idx}
              className="bg-gray-900 rounded-lg p-2 flex items-center gap-2"
            >
              <div className="flex flex-col gap-0.5">
                <button
                  onClick={() => moveItem(idx, idx - 1)}
                  disabled={idx === 0}
                  className="text-gray-500 hover:text-white disabled:opacity-20 text-xs leading-none"
                >
                  ▲
                </button>
                <button
                  onClick={() => moveItem(idx, idx + 1)}
                  disabled={idx === sequence.length - 1}
                  className="text-gray-500 hover:text-white disabled:opacity-20 text-xs leading-none"
                >
                  ▼
                </button>
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">
                  Beat {idx + 1}: {beat?.mood}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {getClipName(item.clip_id)} [{item.start_sec.toFixed(1)}s -{" "}
                  {item.end_sec.toFixed(1)}s]
                </p>
                {item.caption && (
                  <p className="text-xs text-blue-400 truncate italic">
                    "{item.caption}"
                  </p>
                )}
              </div>

              <span className="text-xs text-gray-600">
                {(item.end_sec - item.start_sec).toFixed(1)}s
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
