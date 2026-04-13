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

  // Scale font size based on text length — short taglines get large text,
  // full narration sentences get smaller readable text
  const fontSize = text.length > 60 ? 28 : text.length > 30 ? 34 : 42;

  return (
    <div
      style={{
        position: "absolute",
        bottom: 100,
        left: 30,
        right: 30,
        display: "flex",
        justifyContent: "center",
        opacity,
      }}
    >
      <div
        style={{
          backgroundColor: "rgba(0, 0, 0, 0.65)",
          borderRadius: 14,
          padding: "18px 28px",
          maxWidth: "95%",
          backdropFilter: "blur(8px)",
        }}
      >
        <p
          style={{
            color: "white",
            fontSize,
            fontWeight: 600,
            textAlign: "center",
            margin: 0,
            lineHeight: 1.4,
            textShadow: "0 2px 8px rgba(0,0,0,0.8)",
            whiteSpace: "pre-wrap",
            letterSpacing: "0.01em",
          }}
        >
          {text}
        </p>
      </div>
    </div>
  );
};
