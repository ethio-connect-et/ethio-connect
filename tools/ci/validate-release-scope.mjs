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

function readDockerPluginOptions(nxJson) {
  const pluginEntry = (nxJson?.plugins ?? []).find((entry) => entry?.plugin === "@nx/docker");
  return pluginEntry?.options ?? {};
}

async function main() {
  const nxJson = await readJson("nx.json");
  const groupedProjects = flattenReleaseProjects(nxJson);
  const dockerPlugin = readDockerPluginOptions(nxJson);
  const dockerBuild = dockerPlugin?.buildTarget ?? {};
  const dockerReleasePublish = dockerPlugin?.["nx-release-publish"] ?? {};
  const projects = await loadProjects();
  const errors = [];

  if (dockerBuild?.skipDefaultTag === true) {
    errors.push(
      "nx.json: plugins[@nx/docker].options.buildTarget.skipDefaultTag must be omitted/false when using Nx Release-managed tagging."
    );
  }

  const dockerBuildArgs = Array.isArray(dockerBuild?.args) ? dockerBuild.args.join(" ") : "";
  if (dockerBuildArgs.includes("IMAGE_TAG")) {
    errors.push("nx.json: plugins[@nx/docker].options.buildTarget.args must not require IMAGE_TAG for canonical tagging.");
  }

  const imageTagTemplate = String(dockerReleasePublish?.imageTag ?? "");
  if (!imageTagTemplate.includes("VERSION") || imageTagTemplate.includes("IMAGE_TAG")) {
    errors.push(
      "nx.json: plugins[@nx/docker].options.nx-release-publish.imageTag must be VERSION-based and must not depend on IMAGE_TAG."
    );
  }

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
    const releaseGroup = Object.values(nxJson?.release?.groups ?? {}).find((group) =>
      (group?.projects ?? []).includes(name)
    );
    const dockerReleaseGroup = releaseGroup?.docker === true;

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

    if (dockerReleaseGroup && kind !== "publish") {
      errors.push(`${file}: docker-enabled release group project must define executable nx-release-publish.`);
    }

    const publishDependsOn = target?.dependsOn ?? [];
    if (
      dockerReleaseGroup &&
      kind === "publish" &&
      !publishDependsOn.some((dep) => String(dep).includes(":docker:build") || dep === "docker:build")
    ) {
      errors.push(`${file}: docker-enabled release group project must run docker:build before nx-release-publish.`);
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
