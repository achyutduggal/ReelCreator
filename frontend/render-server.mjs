import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const args = process.argv.slice(2);
  let propsJson = "{}";
  let outputPath = "output.mp4";
  let width = 1080;
  let height = 1920;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--props" && args[i + 1]) propsJson = args[i + 1];
    if (args[i] === "--output" && args[i + 1]) outputPath = args[i + 1];
    if (args[i] === "--width" && args[i + 1]) width = parseInt(args[i + 1]);
    if (args[i] === "--height" && args[i + 1]) height = parseInt(args[i + 1]);
  }

  const inputProps = JSON.parse(propsJson);

  // Copy video and voice files to public/ so Remotion can serve them via staticFile()
  const publicVideosDir = path.resolve(__dirname, "public", "videos");
  const publicVoicesDir = path.resolve(__dirname, "public", "voices");
  fs.mkdirSync(publicVideosDir, { recursive: true });
  fs.mkdirSync(publicVoicesDir, { recursive: true });

  const uploadsDir = path.resolve(__dirname, "..", "backend", "storage", "uploads");
  const voicesDir = path.resolve(__dirname, "..", "backend", "storage", "voices");

  if (inputProps.sequence) {
    for (const item of inputProps.sequence) {
      // Copy video file
      if (item.video_url) {
        const filename = path.basename(item.video_url);
        const src = path.join(uploadsDir, filename);
        const dest = path.join(publicVideosDir, filename);
        if (fs.existsSync(src) && !fs.existsSync(dest)) {
          fs.copyFileSync(src, dest);
          console.log(`Copied video ${filename} to public/videos/`);
        }
        item.video_url = `/videos/${filename}`;
      }

      // Copy voice file
      if (item.voice_url) {
        const filename = path.basename(item.voice_url);
        const src = path.join(voicesDir, filename);
        const dest = path.join(publicVoicesDir, filename);
        if (fs.existsSync(src) && !fs.existsSync(dest)) {
          fs.copyFileSync(src, dest);
          console.log(`Copied voice ${filename} to public/voices/`);
        }
        item.voice_url = `/voices/${filename}`;
      }
    }
    // Clear backendUrl so ClipSequence uses staticFile
    inputProps.backendUrl = "";
  }

  console.log("Bundling Remotion project...");
  const bundleLocation = await bundle({
    entryPoint: path.resolve(__dirname, "src/remotion/index.ts"),
    webpackOverride: (config) => config,
    publicDir: path.resolve(__dirname, "public"),
  });

  console.log("Selecting composition...");
  const composition = await selectComposition({
    serveUrl: bundleLocation,
    id: "Reel",
    inputProps,
  });

  console.log(`Rendering ${composition.durationInFrames} frames...`);
  await renderMedia({
    composition: {
      ...composition,
      width,
      height,
    },
    serveUrl: bundleLocation,
    codec: "h264",
    outputLocation: outputPath,
    inputProps,
    timeoutInMilliseconds: 60000,
  });

  console.log(`Render complete: ${outputPath}`);
}

main().catch((err) => {
  console.error("Render failed:", err);
  process.exit(1);
});
