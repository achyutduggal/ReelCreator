import React from "react";
import { AbsoluteFill, Series } from "remotion";
import { ClipSequence } from "./ClipSequence";
import type { SequenceItem } from "../types/reel";

interface Props {
  sequence: SequenceItem[];
  fps: number;
  backendUrl: string;
}

export const ReelComposition: React.FC<Props> = ({
  sequence,
  fps,
  backendUrl,
}) => {
  return (
    <AbsoluteFill style={{ backgroundColor: "black" }}>
      <Series>
        {sequence.map((item, idx) => {
          const durationSec = item.end_sec - item.start_sec;
          const durationInFrames = Math.max(1, Math.round(durationSec * fps));

          return (
            <Series.Sequence key={idx} durationInFrames={durationInFrames}>
              <ClipSequence
                videoUrl={item.video_url}
                voiceUrl={item.voice_url || ""}
                startSec={item.start_sec}
                endSec={item.end_sec}
                caption={item.caption}
                fps={fps}
                backendUrl={backendUrl}
              />
            </Series.Sequence>
          );
        })}
      </Series>
    </AbsoluteFill>
  );
};
