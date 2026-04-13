import React, { useState, useEffect } from "react";
import type { Beat, ClipMetadata, SequenceItem } from "../types/reel";
import { regenerateVoice } from "../api/client";

interface Props {
  slide: SequenceItem;
  slideIndex: number;
  totalSlides: number;
  beat: Beat | undefined;
  clip: ClipMetadata | undefined;
  onUpdate: (updated: SequenceItem) => void;
  onDelete: () => void;
}

const BACKEND_URL = "http://localhost:8000";

export default function SlideEditor({
  slide,
  slideIndex,
  totalSlides,
  beat,
  clip,
  onUpdate,
  onDelete,
}: Props) {
  const [caption, setCaption] = useState(slide.caption);
  const [duration, setDuration] = useState(
    +(slide.end_sec - slide.start_sec).toFixed(1)
  );
  const [isRegenerating, setIsRegenerating] = useState(false);

  useEffect(() => {
    setCaption(slide.caption);
    setDuration(+(slide.end_sec - slide.start_sec).toFixed(1));
  }, [slide]);

  const handleCaptionSave = async () => {
    if (caption === slide.caption) return;
    setIsRegenerating(true);
    try {
      const res = await regenerateVoice({
        ...slide,
        caption,
      });
      onUpdate(res);
    } catch {
      onUpdate({ ...slide, caption });
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleDurationChange = (val: number) => {
    const clamped = Math.max(0.5, Math.min(val, clip?.duration ?? 30));
    setDuration(clamped);
    onUpdate({
      ...slide,
      end_sec: +(slide.start_sec + clamped).toFixed(2),
    });
  };

  const thumbnailUrl = clip?.thumbnail_url
    ? `${BACKEND_URL}${clip.thumbnail_url}`
    : undefined;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
          Edit Slide {slideIndex + 1} of {totalSlides}
        </h2>
      </div>

      {/* Thumbnail preview */}
      {thumbnailUrl && (
        <div className="rounded-lg overflow-hidden border border-gray-700">
          <img
            src={thumbnailUrl}
            alt={`Slide ${slideIndex + 1}`}
            className="w-full h-36 object-cover"
          />
        </div>
      )}

      {/* Beat info */}
      {beat && (
        <div className="bg-gray-900/50 rounded-lg p-3 space-y-1">
          <p className="text-xs text-gray-400 uppercase tracking-wider font-medium">
            Beat Description
          </p>
          <p className="text-sm text-gray-200">{beat.description}</p>
          <p className="text-xs text-gray-500">
            Mood: <span className="text-gray-300">{beat.mood}</span>
          </p>
        </div>
      )}

      {/* Source clip info */}
      <div className="bg-gray-900/50 rounded-lg p-3 space-y-1">
        <p className="text-xs text-gray-400 uppercase tracking-wider font-medium">
          Source Clip
        </p>
        <p className="text-sm text-gray-200">
          {clip?.filename ?? slide.clip_id}
        </p>
        <p className="text-xs text-gray-500">
          Segment: {slide.start_sec.toFixed(1)}s - {slide.end_sec.toFixed(1)}s
        </p>
        <p className="text-xs text-gray-500">
          Match score: {(slide.score * 100).toFixed(0)}%
        </p>
      </div>

      {/* Slide Duration */}
      <div className="space-y-2">
        <label className="text-xs text-gray-400 uppercase tracking-wider font-medium">
          Slide Duration
        </label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={duration}
            onChange={(e) => handleDurationChange(parseFloat(e.target.value) || 0.5)}
            step={0.1}
            min={0.5}
            className="w-20 bg-gray-900 border border-gray-700 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500"
          />
          <span className="text-xs text-gray-500">seconds</span>
        </div>
      </div>

      {/* Caption */}
      <div className="space-y-2">
        <label className="text-xs text-gray-400 uppercase tracking-wider font-medium">
          Caption / Voice-over Text
        </label>
        <textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          rows={2}
          className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 resize-none focus:outline-none focus:border-blue-500"
          placeholder="Enter caption text..."
        />
        <button
          type="button"
          onClick={handleCaptionSave}
          disabled={caption === slide.caption || isRegenerating}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-800 disabled:text-gray-500 text-white text-xs font-medium py-1.5 px-3 rounded-lg transition-colors"
        >
          {isRegenerating
            ? "Regenerating voice..."
            : caption === slide.caption
            ? "Caption saved"
            : "Save & regenerate voice"}
        </button>
      </div>

      {/* Voice status */}
      {slide.voice_url && (
        <div className="flex items-center gap-2 text-xs text-green-400">
          <span>Voice-over generated</span>
        </div>
      )}

      {/* Delete */}
      <button
        type="button"
        onClick={onDelete}
        className="w-full bg-red-900/40 hover:bg-red-900/70 border border-red-800 text-red-300 text-xs font-medium py-2 px-3 rounded-lg transition-colors"
      >
        Delete Slide
      </button>
    </div>
  );
}
