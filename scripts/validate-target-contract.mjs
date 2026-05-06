#!/usr/bin/env node
import { promises as fs } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const PROFILE_RULES = {
  app: ['build', 'lint', 'test'],
  e2e: ['build', 'lint', 'test', 'e2e'],
  library: ['build', 'package', 'nx-release-publish'],
  'publishable-app': [
    'build',
    'lint',
    'test',
    'docker:build',
    'nx-release-publish',
  ],
  'internal-only-lib': ['build', 'package'],
};

async function findProjectJsonFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const results = [];
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.git'))
      continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...(await findProjectJsonFiles(full)));
    } else if (entry.isFile() && entry.name === 'project.json') {
      results.push(full);
    }
  }
  return results;
}

function inferProfile(project, projectPath) {
  const tags = new Set(project.tags ?? []);
  if (project.metadata?.targetContractProfile)
    return project.metadata.targetContractProfile;
  if (tags.has('platform:e2e') || projectPath.includes('-e2e/')) return 'e2e';
  if (project.projectType === 'application' && tags.has('release:docker'))
    return 'publishable-app';
  if (project.projectType === 'application') return 'app';
  if (project.projectType === 'library' && !tags.has('release:publish'))
    return 'internal-only-lib';
  return 'library';
}

async function main() {
  const files = await findProjectJsonFiles(ROOT);
  const projectFiles = files.filter(
    (f) =>
      f.includes(`${path.sep}apps${path.sep}`) ||
      f.includes(`${path.sep}libs${path.sep}`),
  );

  const failures = [];

  for (const file of projectFiles) {
    const rel = path.relative(ROOT, file);
    const project = JSON.parse(await fs.readFile(file, 'utf8'));
    const profile = inferProfile(project, rel);
    const requiredTargets = PROFILE_RULES[profile];
    if (!requiredTargets) {
      failures.push(`${rel}: unknown target contract profile '${profile}'`);
      continue;
    }

    const targets = project.targets ?? {};
    const exemptions = project.metadata?.targetContractExemptions ?? {};

    for (const target of requiredTargets) {
      if (targets[target]) continue;
      const reason = exemptions[target];
      if (typeof reason !== 'string' || reason.trim().length === 0) {
        failures.push(
          `${rel}: missing required target '${target}' for profile '${profile}' with no exemption rationale`,
        );
      }
    }
  }

  if (failures.length > 0) {
    console.error('Target contract validation failed:\n');
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
  }

  console.log(
    `Target contract validation passed for ${projectFiles.length} project.json files.`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
