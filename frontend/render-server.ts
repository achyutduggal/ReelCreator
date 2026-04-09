import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import path from "path";

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

  console.log("Bundling Remotion project...");
  const bundleLocation = await bundle({
    entryPoint: path.resolve(__dirname, "src/remotion/index.ts"),
    webpackOverride: (config) => config,
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
    chromiumOptions: {
      enableMultiProcessOnLinux: true,
    },
  });

  console.log(`Render complete: ${outputPath}`);
}

main().catch((err) => {
  console.error("Render failed:", err);
  process.exit(1);
});
