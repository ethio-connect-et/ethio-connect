/**
 * Enforce pull request branch ladder:
 * - temporary branches -> development -> testing -> staging -> main
 */

const BASE_REF = process.env.BASE_REF;
const HEAD_REF = process.env.HEAD_REF;

if (!BASE_REF || !HEAD_REF) {
  console.error(
    '::error::BASE_REF and HEAD_REF environment variables must be set.',
  );
  process.exit(1);
}

const LADDER = {
  development: [
    /^feat\/.+$/,
    /^fix\/.+$/,
    /^codex\/.+$/,
    /^chore\/.+$/,
    /^refactor\/.+$/,
    /^hotfix\/.+$/,
    /^perf\/.+$/,
    /^docs\/.+$/,
    /^ci\/.+$/,
    /^build\/.+$/,
    /^temp\/.+$/,
    /^dependabot\/.+$/,
    /^renovate\/.+$/,
    /^ops\/development\/.+$/,
  ],
  testing: ['development', /^ops\/testing\/.+$/],
  staging: ['testing', /^ops\/staging\/.+$/],
  main: ['staging', /^ops\/main\/.+$/],
};

function checkLadder(base, head) {
  const allowedSources = LADDER[base];

  if (!allowedSources) {
    return false;
  }

  return allowedSources.some((pattern) => {
    if (typeof pattern === 'string') {
      return head === pattern;
    }
    return pattern.test(head);
  });
}

if (!checkLadder(BASE_REF, HEAD_REF)) {
  console.error(
    `::error::Unsupported pull request path: ${HEAD_REF} -> ${BASE_REF}`,
  );
  console.error(
    'Allowed paths: temporary branches -> development -> testing -> staging -> main',
  );
  process.exit(1);
}

console.log(`Pull request path validated: ${HEAD_REF} -> ${BASE_REF}`);
