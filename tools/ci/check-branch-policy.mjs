import { execSync } from 'node:child_process';
import fs from 'node:fs';

/**
 * Branch literal policy (single source of truth):
 * - Block ad-hoc use of legacy branch literals in conditional expressions.
 * - Allow canonical protected-branch declarations in approved files/contexts.
 */
const BRANCH_POLICY = {
  protectedBranches: ['development', 'testing', 'staging', 'main'],
  scanFilePatterns: [
    /^\.github\/workflows\/.+\.ya?ml$/i,
    /^docs\/repository-rulesets\.md$/i,
  ],
  forbiddenPatterns: [
    {
      id: 'legacy-branch-list-item',
      pattern: /^\s*-\s*(development|testing)\s*$/,
      message:
        'Legacy branch literal used as a raw list item outside canonical protected-branch definitions.',
    },
    {
      id: 'legacy-base-ref-eq',
      pattern: /github\.base_ref\s*==\s*['"]?(development|testing)['"]?/,
      message: 'Legacy branch literal used in github.base_ref equality check.',
    },
    {
      id: 'legacy-ref-eq',
      pattern:
        /github\.ref\s*==\s*['"]?refs\/heads\/(development|testing)['"]?/,
      message: 'Legacy branch literal used in github.ref equality check.',
    },
  ],
  allowContexts: [
    {
      file: /^\.github\/workflows\/ci\.yml$/,
      line: /^\s*-\s*(development|testing|staging|main)\s*$/,
      reason: 'Canonical protected-branch ladder declaration.',
    },
    {
      file: /^\.github\/workflows\/ci\.yml$/,
      line: /github\.base_ref\s*==\s*['"]?(testing|staging|main)['"]?/,
      reason: 'Canonical protected-branch quality gate condition.',
    },
    {
      file: /^\.github\/workflows\/ci\.yml$/,
      line: /github\.ref\s*==\s*['"]?refs\/heads\/(testing|staging|main)['"]?/,
      reason: 'Canonical protected-branch publish gating condition.',
    },
    {
      file: /^docs\/repository-rulesets\.md$/,
      line: /`(development|testing|staging|main)`/,
      reason: 'Canonical protected-branch documentation.',
    },
  ],
};

function listTrackedFiles() {
  return execSync('git ls-files', { encoding: 'utf8' })
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function shouldScan(filePath) {
  return BRANCH_POLICY.scanFilePatterns.some((pattern) =>
    pattern.test(filePath),
  );
}

function isAllowlisted(filePath, line) {
  return BRANCH_POLICY.allowContexts.some(
    ({ file, line: linePattern }) =>
      file.test(filePath) && linePattern.test(line),
  );
}

function findViolations(files) {
  const violations = [];

  for (const filePath of files) {
    const contents = fs.readFileSync(filePath, 'utf8');
    const lines = contents.split('\n');

    for (const [index, line] of lines.entries()) {
      for (const rule of BRANCH_POLICY.forbiddenPatterns) {
        if (!rule.pattern.test(line)) {
          continue;
        }

        if (isAllowlisted(filePath, line)) {
          continue;
        }

        violations.push({
          filePath,
          lineNumber: index + 1,
          ruleId: rule.id,
          message: rule.message,
          line,
        });
      }
    }
  }

  return violations;
}

function main() {
  const trackedFiles = listTrackedFiles();
  const filesToScan = trackedFiles.filter(shouldScan);
  const violations = findViolations(filesToScan);

  if (violations.length > 0) {
    console.error('Branch policy violation(s) found:');
    for (const violation of violations) {
      console.error(
        `- ${violation.filePath}:${violation.lineNumber} [${violation.ruleId}] ${violation.message}\n  ${violation.line.trim()}`,
      );
    }
    process.exit(1);
  }

  console.log(`Branch policy checks passed for ${filesToScan.length} files.`);
  console.log(
    `Protected branches (canonical): ${BRANCH_POLICY.protectedBranches.join(', ')}`,
  );
}

main();
