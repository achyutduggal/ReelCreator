import React from "react";
import { useCurrentFrame, interpolate } from "remotion";

interface Props {
  text: string;
}

export const CaptionOverlay: React.FC<Props> = ({ text }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 15], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        position: "absolute",
        bottom: 120,
        left: 40,
        right: 40,
        display: "flex",
        justifyContent: "center",
        opacity,
      }}
    >
      <div
        style={{
          backgroundColor: "rgba(0, 0, 0, 0.7)",
          borderRadius: 12,
          padding: "16px 24px",
          maxWidth: "90%",
        }}
      >
        <p
          style={{
            color: "white",
            fontSize: 42,
            fontWeight: "bold",
            textAlign: "center",
            margin: 0,
            lineHeight: 1.3,
            textShadow: "0 2px 8px rgba(0,0,0,0.8)",
            whiteSpace: "pre-wrap",
          }}
        >
          {text}
        </p>
      </div>
    </div>
  );
};
