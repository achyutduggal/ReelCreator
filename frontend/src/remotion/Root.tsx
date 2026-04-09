import React from "react";
import { Composition } from "remotion";
import { ReelComposition } from "./ReelComposition";
import type { SequenceItem } from "../types/reel";

type ReelProps = Record<string, unknown> & {
  sequence: SequenceItem[];
  fps: number;
  backendUrl: string;
};

export const RemotionRoot: React.FC = () => {
  return (
    <Composition<any, ReelProps>
      id="Reel"
      component={ReelComposition}
      durationInFrames={300}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={{
        sequence: [],
        fps: 30,
        backendUrl: "http://localhost:8000",
      }}
      calculateMetadata={({ props }) => {
        const totalDuration = props.sequence.reduce(
          (sum, item) => sum + (item.end_sec - item.start_sec),
          0
        );
        return {
          durationInFrames: Math.max(1, Math.round(totalDuration * props.fps)),
        };
      }}
    />
  );
};
