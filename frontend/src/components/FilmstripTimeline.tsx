import React, { useRef, useState } from "react";
import type { ClipMetadata, SequenceItem } from "../types/reel";

interface Props {
  sequence: SequenceItem[];
  clips: ClipMetadata[];
  selectedIndex: number | null;
  onSelect: (index: number) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
}

const BACKEND_URL = "http://localhost:8000";

export default function FilmstripTimeline({
  sequence,
  clips,
  selectedIndex,
  onSelect,
  onReorder,
}: Props) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dropTarget, setDropTarget] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const getThumbnail = (item: SequenceItem) => {
    const clip = clips.find((c) => c.id === item.clip_id);
    return clip?.thumbnail_url ? `${BACKEND_URL}${clip.thumbnail_url}` : undefined;
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDragIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDropTarget(index);
  };

  const handleDrop = (e: React.DragEvent, toIndex: number) => {
    e.preventDefault();
    if (dragIndex !== null && dragIndex !== toIndex) {
      onReorder(dragIndex, toIndex);
    }
    setDragIndex(null);
    setDropTarget(null);
  };

  const handleDragEnd = () => {
    setDragIndex(null);
    setDropTarget(null);
  };

  return (
    <div className="bg-gray-900 border-t border-gray-800">
      {/* Playhead bar */}
      <div className="flex items-center gap-3 px-4 py-1.5 border-b border-gray-800">
        <span className="text-xs text-gray-500 font-mono">
          {sequence.length} slides
        </span>
        <div className="flex-1" />
        <span className="text-xs text-gray-500 font-mono">
          {sequence
            .reduce((s, i) => s + (i.end_sec - i.start_sec), 0)
            .toFixed(1)}
          s total
        </span>
      </div>

      {/* Filmstrip */}
      <div
        ref={scrollRef}
        className="flex gap-1 p-2 overflow-x-auto"
        style={{ scrollbarWidth: "thin" }}
      >
        {sequence.map((item, idx) => {
          const thumb = getThumbnail(item);
          const dur = (item.end_sec - item.start_sec).toFixed(1);
          const isSelected = selectedIndex === idx;
          const isDragging = dragIndex === idx;
          const isDropZone = dropTarget === idx && dragIndex !== idx;

          return (
            <div
              key={idx}
              draggable
              onDragStart={(e) => handleDragStart(e, idx)}
              onDragOver={(e) => handleDragOver(e, idx)}
              onDrop={(e) => handleDrop(e, idx)}
              onDragEnd={handleDragEnd}
              onClick={() => onSelect(idx)}
              className={`
                flex-shrink-0 cursor-pointer rounded-lg overflow-hidden transition-all
                ${isSelected ? "ring-2 ring-blue-500" : "ring-1 ring-gray-700 hover:ring-gray-500"}
                ${isDragging ? "opacity-40" : ""}
                ${isDropZone ? "ring-2 ring-green-500" : ""}
              `}
              style={{ width: 120 }}
            >
              {/* Thumbnail */}
              <div className="relative h-16 bg-gray-800">
                {thumb ? (
                  <img
                    src={thumb}
                    alt={`Slide ${idx + 1}`}
                    className="w-full h-full object-cover"
                    draggable={false}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-600 text-xs">
                    No thumb
                  </div>
                )}
                {/* Duration badge */}
                <span className="absolute top-0.5 right-0.5 bg-black/70 text-white text-[9px] px-1 rounded">
                  {dur}s
                </span>
                {/* Slide number */}
                <span className="absolute top-0.5 left-0.5 bg-blue-600/80 text-white text-[9px] px-1 rounded">
                  {idx + 1}
                </span>
              </div>

              {/* Caption label */}
              <div className="px-1.5 py-1 bg-gray-850" style={{ backgroundColor: isSelected ? "#1e3a5f" : "#111827" }}>
                <p className="text-[10px] text-gray-300 truncate leading-tight">
                  {item.caption || "No caption"}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
