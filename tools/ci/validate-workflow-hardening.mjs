#!/usr/bin/env node
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const workflowsDir = ".github/workflows";
const files = readdirSync(workflowsDir).filter((f) => f.endsWith(".yml"));
const issues = [];

const allowedWriteScopes = {
  "ci-quality-security.yml:dependency_review": ["pull-requests"],
  "ci-quality-security.yml:security_codeql_analysis": ["security-events"],
  "release-drafter.yml:release_draft": ["contents", "pull-requests"],
  "release.yml:verify_published_images": ["id-token"],
  "release.yml:sign_and_attest_release": ["packages", "id-token"],
  "release.yml:publish_github_release": ["contents"],
  "ci-image-publish-attest.yml:publish_images_and_attestations": ["id-token", "packages"],
  "ci.yml:quality_and_security": ["pull-requests", "security-events"],
  "ci.yml:publish_container_images": ["id-token", "packages"],
};

for (const file of files) {
  const path = join(workflowsDir, file);
  const text = readFileSync(path, "utf8");
  const lines = text.split("\n");

  if (!/^permissions:\s*\{\s*\}\s*$/m.test(text)) {
    issues.push(`${file}: missing top-level permissions: {}`);
  }

  for (const match of text.matchAll(/^\s*uses:\s*([^\s#]+)\s*(?:#.*)?$/gm)) {
    const ref = match[1];
    if (ref.startsWith("./")) continue;
    const at = ref.lastIndexOf("@");
    if (at === -1) continue;
    if (!/^[a-f0-9]{40}$/.test(ref.slice(at + 1))) {
      issues.push(`${file}: non-SHA pinned action reference '${ref}'`);
    }
  }

  const jobsIndex = lines.findIndex((l) => l.startsWith("jobs:"));
  if (jobsIndex === -1) continue;

  for (let i = jobsIndex + 1; i < lines.length; i += 1) {
    const jobMatch = lines[i].match(/^ {2}([A-Za-z0-9_-]+):\s*$/);
    if (!jobMatch) continue;
    const job = jobMatch[1];
    const jobKey = `${file}:${job}`;
    let hasPermissions = false;

    for (let j = i + 1; j < lines.length; j += 1) {
      if (/^ {2}[A-Za-z0-9_-]+:\s*$/.test(lines[j])) break;
      if (!/^ {4}permissions:\s*$/.test(lines[j])) continue;
      hasPermissions = true;
      for (let k = j + 1; k < lines.length; k += 1) {
        if (!lines[k].trim()) continue;
        if (!lines[k].startsWith("      ")) break;
        const m = lines[k].match(/^\s{6}([a-z-]+):\s*(read|write|none)\s*$/);
        if (!m) continue;
        const [_, scope, value] = m;
        if (value === "write" && !(allowedWriteScopes[jobKey] || []).includes(scope)) {
          issues.push(`${jobKey} has unapproved write scope '${scope}: write'`);
        }
      }
    }

    if (!hasPermissions) issues.push(`${jobKey} missing explicit job-level permissions`);
  }
}

if (issues.length) {
  console.error("Workflow hardening policy violations detected:");
  issues.forEach((i) => console.error(`- ${i}`));
  process.exit(1);
}

console.log(`Workflow hardening validation passed for ${files.length} workflows.`);
