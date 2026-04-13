import React, { useState } from "react";

interface Props {
  onGenerate: (prompt: string, duration: number) => void;
  isGenerating: boolean;
  disabled: boolean;
}

export default function PromptInput({
  onGenerate,
  isGenerating,
  disabled,
}: Props) {
  const [prompt, setPrompt] = useState("");
  const [duration, setDuration] = useState(10);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim()) onGenerate(prompt.trim(), duration);
  };

  return (
    <div>
      <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-3">
        Creative Direction
      </h2>

      <form onSubmit={handleSubmit} className="space-y-3">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder='e.g. "A dramatic reveal reel of a luxury black car"'
          className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 resize-none focus:outline-none focus:border-blue-500"
          rows={3}
          disabled={disabled || isGenerating}
        />

        <div className="flex items-center gap-3">
          <label className="text-xs text-gray-400">Duration:</label>
          <select
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            className="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm text-white"
            disabled={disabled || isGenerating}
          >
            <option value={5}>5s</option>
            <option value={10}>10s</option>
            <option value={15}>15s</option>
            <option value={30}>30s</option>
            <option value={60}>60s</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={disabled || isGenerating || !prompt.trim()}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 text-white font-medium py-2 px-4 rounded-lg text-sm transition-colors"
        >
          {isGenerating ? "Generating..." : "Generate Reel"}
        </button>
      </form>
    </div>
  );
}
