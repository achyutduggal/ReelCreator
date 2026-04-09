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

  // Copy video files to public/ so Remotion can serve them via staticFile()
  const publicDir = path.resolve(__dirname, "public", "videos");
  fs.mkdirSync(publicDir, { recursive: true });

  const storageDir = path.resolve(__dirname, "..", "backend", "storage", "uploads");
  if (inputProps.sequence) {
    for (const item of inputProps.sequence) {
      if (item.video_url) {
        // video_url is like /api/storage/uploads/5d586bf45c62_video.mp4
        const filename = path.basename(item.video_url);
        const src = path.join(storageDir, filename);
        const dest = path.join(publicDir, filename);
        if (fs.existsSync(src) && !fs.existsSync(dest)) {
          fs.copyFileSync(src, dest);
          console.log(`Copied ${filename} to public/videos/`);
        }
        // Rewrite video_url to use staticFile path
        item.video_url = `/videos/${filename}`;
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
