import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const config = JSON.parse(fs.readFileSync(path.join(ROOT, "tools/ci/frontend-performance-thresholds.json"), "utf8"));

const bytes = (p) => fs.statSync(p).size;
const safeBytes = (p) => (fs.existsSync(p) ? bytes(p) : 0);

let failed = false;

for (const app of config.applications) {
  const nextDir = path.join(ROOT, app.outputPath, ".next");
  const staticDir = path.join(nextDir, "static");
  const chunksDir = path.join(staticDir, "chunks");
  const cssDir = path.join(staticDir, "css");
  const buildManifest = JSON.parse(fs.readFileSync(path.join(nextDir, "build-manifest.json"), "utf8"));

  const jsChunkFiles = fs.existsSync(chunksDir)
    ? fs
        .readdirSync(chunksDir)
        .filter((file) => file.endsWith(".js"))
        .map((file) => path.join(chunksDir, file))
    : [];
  const cssFiles = fs.existsSync(cssDir)
    ? fs
        .readdirSync(cssDir)
        .filter((file) => file.endsWith(".css"))
        .map((file) => path.join(cssDir, file))
    : [];

  const initialJsRefs = [...(buildManifest.rootMainFiles ?? []), ...(buildManifest.polyfillFiles ?? [])].filter((f) => f.endsWith(".js"));
  const initialCssRefs = [...(buildManifest.rootMainFiles ?? []), ...(buildManifest.polyfillFiles ?? [])].filter((f) => f.endsWith(".css"));

  const initialJsBytes = initialJsRefs.reduce((sum, rel) => sum + safeBytes(path.join(nextDir, rel)), 0);
  const initialCssBytes = initialCssRefs.reduce((sum, rel) => sum + safeBytes(path.join(nextDir, rel)), 0);
  const totalJsBytes = jsChunkFiles.reduce((sum, file) => sum + bytes(file), 0);
  const maxRouteChunkBytes = jsChunkFiles.reduce((max, file) => Math.max(max, bytes(file)), 0);

  const metrics = { initialJsBytes, initialCssBytes, maxRouteChunkBytes, totalJsBytes };
  console.log(`\n${app.project}`);
  for (const [name, value] of Object.entries(metrics)) {
    const threshold = app.thresholds[name];
    const pass = value <= threshold;
    console.log(`  ${pass ? "PASS" : "FAIL"} ${name}: ${value} <= ${threshold}`);
    if (!pass) failed = true;
  }

  if (cssFiles.length === 0) {
    console.log("  INFO initialCssBytes may stay at 0 when no emitted global CSS chunk exists.");
  }
}

if (failed) {
  console.error("\nFrontend performance regression detected.");
  process.exit(1);
}

console.log("\nAll frontend performance metrics are within thresholds.");
