#!/usr/bin/env bash
set -euo pipefail

fail=0

echo "Scanning manifests/workflows for plaintext-secret anti-patterns..."

secret_pattern='(api[_-]?key|secret|token|password|passwd|private[_-]?key)\s*[:=]\s*["'"'']?[A-Za-z0-9_\-\/.+=]{8,}["'"'']?'
if rg -n -P "$secret_pattern" gitops .github/workflows; then
  echo "::error::Potential plaintext secret assignment found."
  fail=1
fi

while IFS= read -r file; do
  if awk 'BEGIN{is_secret=0;bad=0} /^kind:[[:space:]]*Secret([[:space:]]*|$)/{is_secret=1} is_secret && /^[[:space:]]*(data|stringData):[[:space:]]*$/{bad=1} END{exit bad?0:1}' "$file"; then
    echo "$file: Kubernetes Secret manifest with inline data/stringData is not allowed"
    fail=1
  fi
done < <(rg --files gitops -g '**/*.yaml' -g '**/*.yml')

if rg -n -P '(echo\s+.*(secret|token|password|private[_-]?key).*>\s*\$GITHUB_OUTPUT|upload-artifact[^\n]*(secret|token|password)|::debug::.*(secret|token|password))' .github/workflows; then
  echo "::error::Workflow writes potential secret values to outputs/artifacts/logs."
  fail=1
fi

if [[ "$fail" -ne 0 ]]; then
  exit 1
fi

echo "No plaintext-secret patterns detected."
