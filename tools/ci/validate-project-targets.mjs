#!/usr/bin/env node
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

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

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith('--')) out[key] = 'true';
    else {
      out[key] = next;
      i += 1;
    }
  }
  return out;
}

function runJsonCommand(cmd, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { cwd: ROOT, env: process.env });
    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += chunk;
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk;
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code !== 0) {
        reject(
          new Error(
            `${cmd} ${args.join(' ')} failed with code ${code}. ${stderr.trim()}`,
          ),
        );
        return;
      }
      try {
        resolve(JSON.parse(stdout));
      } catch (err) {
        reject(
          new Error(
            `Failed to parse JSON from ${cmd} ${args.join(' ')}: ${err.message}`,
          ),
        );
      }
    });
  });
}

async function validatePublishProjects(projects, reportPath) {
  const summary = [];
  let hasFailures = false;

  for (const project of projects) {
    const entry = {
      project,
      status: 'ok',
      hasTarget: false,
      executor: null,
      command: null,
      message: '',
    };

    try {
      const projectConfig = await runJsonCommand('pnpm', [
        'nx',
        'show',
        'project',
        project,
        '--json',
      ]);
      const target = projectConfig?.targets?.['nx-release-publish'];
      if (!target) {
        entry.status = 'missing-target';
        entry.message = "Target 'nx-release-publish' is not configured.";
        hasFailures = true;
      } else {
        entry.hasTarget = true;
        entry.executor = target.executor ?? null;
        entry.command = target.command ?? null;
        if (!entry.executor && !entry.command) {
          entry.status = 'misconfigured-target';
          entry.message =
            "Target 'nx-release-publish' exists but has no executor or command.";
          hasFailures = true;
        } else {
          entry.message = "Target contract for 'nx-release-publish' is valid.";
        }
      }
    } catch (err) {
      entry.status = 'project-query-error';
      entry.message = err instanceof Error ? err.message : String(err);
      hasFailures = true;
    }

    summary.push(entry);
  }

  const report = {
    mode: 'publish-target-contract',
    generatedAt: new Date().toISOString(),
    hasFailures,
    totals: {
      projects: summary.length,
      failing: summary.filter((item) => item.status !== 'ok').length,
      passing: summary.filter((item) => item.status === 'ok').length,
    },
    results: summary,
  };

  await fs.mkdir(path.dirname(reportPath), { recursive: true });
  await fs.writeFile(
    reportPath,
    `${JSON.stringify(report, null, 2)}\n`,
    'utf8',
  );

  console.log('Release target contract summary:');
  for (const item of summary) {
    const symbol = item.status === 'ok' ? '✅' : '❌';
    console.log(
      `- ${symbol} ${item.project}: ${item.status} — ${item.message}`,
    );
  }
  console.log(`Report written to ${reportPath}`);

  if (hasFailures) process.exit(1);
}

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

async function validateArchetypes() {
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

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.mode === 'publish-target-contract') {
    const projects = JSON.parse(args['projects-json'] ?? '[]');
    if (!Array.isArray(projects)) {
      throw new Error('--projects-json must be a JSON array of project names.');
    }
    const reportPath =
      args['report-path'] ?? 'release-target-contract-report.json';
    await validatePublishProjects(projects, reportPath);
    return;
  }

  await validateArchetypes();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
