#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const SHA256_REGEX = /^sha256:[a-f0-9]{64}$/;

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) continue;
    const key = token.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) {
      args[key] = "true";
      continue;
    }
    args[key] = next;
    i += 1;
  }
  return args;
}

function getProjects(value) {
  if (!value) throw new Error("--projects-json is required");
  const parsed = JSON.parse(value);
  if (!Array.isArray(parsed)) throw new Error("--projects-json must be a JSON array");
  return parsed.filter(Boolean);
}

function inspectDigest(imageRef) {
  const output = execFileSync("docker", ["buildx", "imagetools", "inspect", imageRef, "--format", "{{json .Manifest.Digest}}"], { encoding: "utf8" }).trim();
  return output.replace(/^"|"$/g, "");
}

function ensureDigest(digest, label) {
  if (!SHA256_REGEX.test(digest)) throw new Error(`Invalid digest for ${label}: ${digest}`);
}

function generatePublishMetadata(args) {
  const projects = getProjects(args["projects-json"]);
  const imageTag = args["image-tag"];
  const releaseVersion = args["release-version"];
  const sourceSha = args["source-sha"];
  const outputPath = args["output"];
  if (!imageTag || !releaseVersion || !sourceSha || !outputPath) throw new Error("Missing required args for generate-publish-metadata");

  const records = projects.map((project) => {
    const app = project.replace("@ethio-connect/", "");
    const imageRef = `ghcr.io/ethio-connect-et/${app}:${imageTag}`;
    const digest = inspectDigest(imageRef);
    ensureDigest(digest, imageRef);
    const immutableRef = `ghcr.io/ethio-connect-et/${app}@${digest}`;
    return {
      project,
      app,
      image_ref: imageRef,
      immutable_ref: immutableRef,
      digest,
      source_sha: sourceSha,
      release_version: releaseVersion,
    };
  });

  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(records, null, 2)}\n`);
}

function verifyTagParity(args) {
  const projects = getProjects(args["projects-json"]);
  const primaryTag = args["primary-tag"];
  const secondaryTag = args["secondary-tag"];
  if (!primaryTag || !secondaryTag) throw new Error("Missing required args for verify-tag-parity");

  for (const project of projects) {
    const app = project.replace("@ethio-connect/", "");
    const primaryRef = `ghcr.io/ethio-connect-et/${app}:${primaryTag}`;
    const secondaryRef = `ghcr.io/ethio-connect-et/${app}:${secondaryTag}`;
    const primaryDigest = inspectDigest(primaryRef);
    const secondaryDigest = inspectDigest(secondaryRef);
    ensureDigest(primaryDigest, primaryRef);
    ensureDigest(secondaryDigest, secondaryRef);
    if (primaryDigest !== secondaryDigest) {
      throw new Error(`Digest mismatch for ${app} between ${primaryTag} and ${secondaryTag}`);
    }
    console.log(`Verified ${app} => ${primaryDigest}`);
  }
}

function generateReleaseManifest(args) {
  const projects = getProjects(args["projects-json"]);
  const imageTag = args["image-tag"];
  const sourceSha = args["source-sha"];
  const artifactRunId = args["artifact-run-id"];
  const outputPath = args["output"];
  if (!imageTag || !sourceSha || !artifactRunId || !outputPath) throw new Error("Missing required args for generate-release-manifest");

  const records = projects.map((project) => {
    const app = project.replace("@ethio-connect/", "");
    const imageRef = `ghcr.io/ethio-connect-et/${app}:${imageTag}`;
    const digest = inspectDigest(imageRef);
    ensureDigest(digest, imageRef);
    return {
      project,
      app,
      image_ref: imageRef,
      digest,
      source_sha: sourceSha,
      tag: imageTag,
      artifact_run_id: artifactRunId,
      attestation_status: "pending",
    };
  });

  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(records, null, 2)}\n`);
}

const args = parseArgs(process.argv.slice(2));
const mode = args.mode;

try {
  if (mode === "generate-publish-metadata") generatePublishMetadata(args);
  else if (mode === "verify-tag-parity") verifyTagParity(args);
  else if (mode === "generate-release-manifest") generateReleaseManifest(args);
  else throw new Error(`Unsupported mode: ${mode}`);
} catch (error) {
  console.error(`::error::${error.message}`);
  process.exit(1);
}
