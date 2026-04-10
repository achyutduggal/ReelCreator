import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import path from "path";
import fs from "fs";
import os from "os";
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

  // Use a temp directory for render assets instead of public/ to avoid
  // triggering webpack dev server's file watcher (which causes page refreshes)
  const tempPublicDir = fs.mkdtempSync(path.join(os.tmpdir(), "remotion-render-"));
  const tempVideosDir = path.join(tempPublicDir, "videos");
  const tempVoicesDir = path.join(tempPublicDir, "voices");
  fs.mkdirSync(tempVideosDir, { recursive: true });
  fs.mkdirSync(tempVoicesDir, { recursive: true });

  // Copy base public assets (index.html etc.) into temp dir
  const basePublicDir = path.resolve(__dirname, "public");
  if (fs.existsSync(basePublicDir)) {
    for (const entry of fs.readdirSync(basePublicDir)) {
      const src = path.join(basePublicDir, entry);
      const dest = path.join(tempPublicDir, entry);
      if (fs.statSync(src).isFile()) {
        fs.copyFileSync(src, dest);
      }
    }
  }

  const uploadsDir = path.resolve(__dirname, "..", "backend", "storage", "uploads");
  const voicesDir = path.resolve(__dirname, "..", "backend", "storage", "voices");

  if (inputProps.sequence) {
    for (const item of inputProps.sequence) {
      // Copy video file
      if (item.video_url) {
        const filename = path.basename(item.video_url);
        const src = path.join(uploadsDir, filename);
        const dest = path.join(tempVideosDir, filename);
        if (fs.existsSync(src) && !fs.existsSync(dest)) {
          fs.copyFileSync(src, dest);
          console.log(`Copied video ${filename} to temp render dir`);
        }
        item.video_url = `/videos/${filename}`;
      }

      // Copy voice file
      if (item.voice_url) {
        const filename = path.basename(item.voice_url);
        const src = path.join(voicesDir, filename);
        const dest = path.join(tempVoicesDir, filename);
        if (fs.existsSync(src) && !fs.existsSync(dest)) {
          fs.copyFileSync(src, dest);
          console.log(`Copied voice ${filename} to temp render dir`);
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
    publicDir: tempPublicDir,
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

  // Clean up temp dir
  fs.rmSync(tempPublicDir, { recursive: true, force: true });

  console.log(`Render complete: ${outputPath}`);
}

main().catch((err) => {
  console.error("Render failed:", err);
  process.exit(1);
});
