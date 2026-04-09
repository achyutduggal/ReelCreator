import React from "react";
import { AbsoluteFill, Audio, OffthreadVideo, staticFile } from "remotion";
import { CaptionOverlay } from "./CaptionOverlay";

interface Props {
  videoUrl: string;
  voiceUrl: string;
  startSec: number;
  endSec: number;
  caption: string;
  fps: number;
  backendUrl: string;
}

export const ClipSequence: React.FC<Props> = ({
  videoUrl,
  voiceUrl,
  startSec,
  endSec,
  caption,
  fps,
  backendUrl,
}) => {
  const videoSrc = backendUrl ? `${backendUrl}${videoUrl}` : staticFile(videoUrl);
  const voiceSrc = voiceUrl
    ? backendUrl
      ? `${backendUrl}${voiceUrl}`
      : staticFile(voiceUrl)
    : null;

  return (
    <AbsoluteFill>
      <OffthreadVideo
        src={videoSrc}
        startFrom={Math.round(startSec * fps)}
        endAt={Math.round(endSec * fps)}
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
      />
      {voiceSrc && <Audio src={voiceSrc} volume={1} />}
      {caption && <CaptionOverlay text={caption} />}
    </AbsoluteFill>
  );
};
