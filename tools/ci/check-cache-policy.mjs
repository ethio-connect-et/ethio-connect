#!/usr/bin/env node
import { readFileSync } from 'node:fs';

const nx = JSON.parse(
  readFileSync(new URL('../../nx.json', import.meta.url), 'utf8'),
);
const defaults = nx.targetDefaults ?? {};

const required = {
  'format:check': { needsCache: true, inputs: ['default', '^default'] },
  'format:write': { needsCache: false, inputs: ['default', '^default'] },
  typecheck: { needsCache: true, inputs: ['ci', '^production'] },
  build: { needsCache: true, inputs: ['production', '^production'] },
  test: { needsCache: true, inputs: ['ci', '^production'] },
  lint: { needsCache: true, inputs: ['default', '^default'] },
  e2e: { needsCache: true, inputs: ['e2e', '^production'] },
  'docker:build': { needsCache: true, inputs: ['production', '^production'] },
};

const errors = [];
for (const [target, policy] of Object.entries(required)) {
  const cfg = defaults[target];
  if (!cfg) {
    errors.push(`Missing targetDefaults.${target}`);
    continue;
  }
  if (policy.needsCache && cfg.cache !== true) {
    errors.push(`targetDefaults.${target}.cache must be true`);
  }
  if (!policy.needsCache && cfg.cache !== false) {
    errors.push(`targetDefaults.${target}.cache must be false`);
  }
  const inputs = Array.isArray(cfg.inputs) ? cfg.inputs : [];
  for (const requiredInput of policy.inputs) {
    if (!inputs.includes(requiredInput)) {
      errors.push(
        `targetDefaults.${target}.inputs must include "${requiredInput}"`,
      );
    }
  }
}

if (errors.length > 0) {
  console.error('Cache policy check failed:');
  for (const error of errors) console.error(` - ${error}`);
  process.exit(1);
}

console.log('Cache policy check passed.');
