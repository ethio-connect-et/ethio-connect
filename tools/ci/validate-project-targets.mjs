#!/usr/bin/env node
import { promises as fs } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const DEPLOY_TARGETS = ['nx-release-publish'];

const ARCHETYPES = {
  deployableApp: {
    required: ['typecheck', 'build', 'lint', 'test', 'nx-release-publish'],
    forbidden: [],
  },
  e2eApp: {
    required: ['typecheck', 'build', 'lint', 'test', 'e2e'],
    forbidden: DEPLOY_TARGETS,
  },
  sharedLib: {
    required: ['typecheck', 'build'],
    forbidden: DEPLOY_TARGETS,
  },
};

async function findProjectJsonFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const out = [];
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === '.git') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await findProjectJsonFiles(full)));
    if (entry.isFile() && entry.name === 'project.json') out.push(full);
  }
  return out;
}

function inferArchetype(project, relPath) {
  const tags = new Set(project.tags ?? []);
  if (tags.has('platform:e2e') || relPath.includes('-e2e/')) return 'e2eApp';
  if (project.projectType === 'library') return 'sharedLib';
  if (project.projectType === 'application' && tags.has('release:docker'))
    return 'deployableApp';
  return null;
}

function hasReason(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

async function main() {
  const files = (await findProjectJsonFiles(ROOT)).filter(
    (f) =>
      f.includes(`${path.sep}apps${path.sep}`) ||
      f.includes(`${path.sep}libs${path.sep}`),
  );

  const violations = [];

  for (const file of files) {
    const rel = path.relative(ROOT, file);
    const project = JSON.parse(await fs.readFile(file, 'utf8'));
    const archetype = inferArchetype(project, rel);
    if (!archetype) continue;

    const { required, forbidden } = ARCHETYPES[archetype];
    const targets = project.targets ?? {};
    const contract = project.metadata?.targetContract ?? {};
    const requiredExemptions = contract.requiredExemptions ?? {};
    const allowedForbiddenTargets = contract.allowedForbiddenTargets ?? {};

    for (const target of required) {
      if (targets[target]) continue;
      if (!hasReason(requiredExemptions[target])) {
        violations.push(
          `${rel}: missing required target '${target}' for archetype '${archetype}' (add target or metadata.targetContract.requiredExemptions.${target})`,
        );
      }
    }

    for (const target of forbidden) {
      if (!targets[target]) continue;
      if (!hasReason(allowedForbiddenTargets[target])) {
        violations.push(
          `${rel}: forbidden target '${target}' present for archetype '${archetype}' (remove target or set metadata.targetContract.allowedForbiddenTargets.${target})`,
        );
      }
    }
  }

  if (violations.length) {
    console.error('Nx target contract violations found:\n');
    for (const issue of violations) console.error(`- ${issue}`);
    process.exit(1);
  }

  console.log(
    `Nx target contract validated for ${files.length} project.json files.`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
