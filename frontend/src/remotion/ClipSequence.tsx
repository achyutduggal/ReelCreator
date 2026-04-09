import React from "react";
import { AbsoluteFill, OffthreadVideo, staticFile } from "remotion";
import { CaptionOverlay } from "./CaptionOverlay";

interface Props {
  videoUrl: string;
  startSec: number;
  endSec: number;
  caption: string;
  fps: number;
  backendUrl: string;
}

export const ClipSequence: React.FC<Props> = ({
  videoUrl,
  startSec,
  endSec,
  caption,
  fps,
  backendUrl,
}) => {
  // If backendUrl is set, fetch from backend; otherwise use staticFile (for rendering)
  const src = backendUrl ? `${backendUrl}${videoUrl}` : staticFile(videoUrl);

  return (
    <AbsoluteFill>
      <OffthreadVideo
        src={src}
        startFrom={Math.round(startSec * fps)}
        endAt={Math.round(endSec * fps)}
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
      />
      {caption && <CaptionOverlay text={caption} />}
    </AbsoluteFill>
  );
};
