import React, { useCallback, useRef, useState } from "react";
import type { ClipMetadata } from "../types/reel";

interface Props {
  onUpload: (files: File[]) => void;
  clips: ClipMetadata[];
  isUploading: boolean;
}

export default function UploadPanel({ onUpload, clips, isUploading }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return;
      const videoFiles = Array.from(files).filter((f) =>
        f.type.startsWith("video/")
      );
      if (videoFiles.length > 0) onUpload(videoFiles);
    },
    [onUpload]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  return (
    <div>
      <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-3">
        Upload Clips
      </h2>

      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
          isDragging
            ? "border-blue-500 bg-blue-500/10"
            : "border-gray-700 hover:border-gray-500"
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept="video/*"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
          disabled={isUploading}
        />
        <p className="text-gray-400 text-sm">
          {isUploading
            ? "Processing..."
            : "Drop video files here or click to browse"}
        </p>
      </div>

      {clips.length > 0 && (
        <div className="mt-4 space-y-2">
          {clips.map((clip) => (
            <div
              key={clip.id}
              className="flex items-center gap-3 bg-gray-900 rounded-lg p-2"
            >
              {clip.thumbnail_url && (
                <img
                  src={clip.thumbnail_url}
                  alt={clip.filename}
                  className="w-16 h-10 object-cover rounded"
                />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{clip.filename}</p>
                <p className="text-xs text-gray-500">
                  {clip.duration.toFixed(1)}s &middot; {clip.snippets.length}{" "}
                  snippet{clip.snippets.length !== 1 ? "s" : ""}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
