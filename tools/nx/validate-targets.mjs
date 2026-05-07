#!/usr/bin/env node
import { spawn } from "node:child_process";

const STANDARD_TARGETS = new Set(["build", "test", "lint", "serve", "dev", "start", "e2e", "e2e-ci", "docker:build", "docker:run", "prune"]);
const OPTIONAL_OUTPUT_TARGETS = new Set(["typecheck", "nx-release-publish", "package", "local-registry"]);

function runJson(args) {
  return new Promise((resolve, reject) => {
    const child = spawn("pnpm", ["nx", ...args], { env: process.env, cwd: process.cwd() });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => (stdout += d));
    child.stderr.on("data", (d) => (stderr += d));
    child.on("close", (code) => {
      if (code !== 0) return reject(new Error(`pnpm nx ${args.join(" ")} failed (${code}): ${stderr.trim()}`));
      try {
        resolve(JSON.parse(stdout));
      } catch (e) {
        reject(e);
      }
    });
    child.on("error", reject);
  });
}

async function main() {
  const projects = await runJson(["show", "projects", "--json"]);
  const violations = [];

  for (const name of projects) {
    const config = await runJson(["show", "project", name, "--json"]);
    const targets = config.targets ?? {};

    for (const [targetName, targetConfig] of Object.entries(targets)) {
      if (STANDARD_TARGETS.has(targetName)) continue;

      if (!("inputs" in targetConfig)) {
        violations.push(`${name}#${targetName} missing inputs`);
      }
      if (!OPTIONAL_OUTPUT_TARGETS.has(targetName) && !("outputs" in targetConfig)) {
        violations.push(`${name}#${targetName} missing outputs`);
      }
    }
  }

  if (violations.length) {
    console.error("Custom target validation failed.");
    violations.forEach((v) => console.error(`- ${v}`));
    process.exit(1);
  }

  console.log(`Validated ${projects.length} projects. All custom targets expose required inputs/outputs.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
