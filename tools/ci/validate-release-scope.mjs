#!/usr/bin/env node
import { promises as fs } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

async function readJson(file) {
  return JSON.parse(await fs.readFile(path.join(ROOT, file), "utf8"));
}

async function findProjectJsonFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const out = [];
  for (const entry of entries) {
    if (entry.name === "node_modules" || entry.name === ".git") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await findProjectJsonFiles(full)));
    if (entry.isFile() && entry.name === "project.json") out.push(full);
  }
  return out;
}

function flattenReleaseProjects(nxJson) {
  const groups = nxJson?.release?.groups ?? {};
  const all = new Set();
  for (const groupName of Object.keys(groups)) {
    for (const project of groups[groupName]?.projects ?? []) all.add(project);
  }
  return all;
}

async function loadProjects() {
  const files = await findProjectJsonFiles(ROOT);
  const projects = new Map();
  for (const file of files) {
    const rel = path.relative(ROOT, file);
    const json = JSON.parse(await fs.readFile(file, "utf8"));
    if (!json.name) continue;
    projects.set(json.name, { file: rel, config: json });
  }
  return projects;
}

function targetKind(target) {
  if (!target) return "absent";
  const executor = target.executor ?? "";
  if (executor === "nx:noop") return "noop";
  return "publish";
}

async function main() {
  const nxJson = await readJson("nx.json");
  const groupedProjects = flattenReleaseProjects(nxJson);
  const projects = await loadProjects();
  const errors = [];

  for (const projectName of groupedProjects) {
    if (!projects.has(projectName)) {
      errors.push(`nx.json release group includes unknown project '${projectName}'.`);
    }
  }

  for (const [name, { file, config }] of projects) {
    const inReleaseGroup = groupedProjects.has(name);
    const hasReleaseConfig = Object.prototype.hasOwnProperty.call(config ?? {}, "release");
    const publishFlag = config?.release?.publish;
    const publishEnabled = hasReleaseConfig ? publishFlag !== false : null;
    const target = config?.targets?.["nx-release-publish"];
    const kind = targetKind(target);

    if (publishEnabled === true && !inReleaseGroup) {
      errors.push(`${file}: release.publish is enabled, but project is not listed in nx.json release.groups.`);
    }

    if (inReleaseGroup && publishEnabled === true && kind !== "publish") {
      errors.push(`${file}: project is in nx.json release.groups with publish enabled, but nx-release-publish target is missing or noop.`);
    }

    if (inReleaseGroup && publishFlag === false && kind === "publish") {
      errors.push(`${file}: release.publish is false (version/changelog-only) but nx-release-publish is executable. Use nx:noop or remove target.`);
    }

    if (!inReleaseGroup && kind === "publish") {
      errors.push(`${file}: executable nx-release-publish target exists, but project is outside nx.json release.groups.`);
    }
  }

  if (errors.length) {
    console.error("Release scope contract violations found:\n");
    for (const err of errors) console.error(`- ${err}`);
    process.exit(1);
  }

  console.log(`Release scope contract validated for ${projects.size} projects.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
