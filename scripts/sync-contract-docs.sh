#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."

CONTRACT_FILE=".github/contracts/promote-image.contract.json"
README_FILE="README.md"

if [[ ! -f "$CONTRACT_FILE" ]]; then
  echo "Contract file not found: $CONTRACT_FILE"
  exit 1
fi

TMP_SNIPPET=$(mktemp)

cat << 'EOF' > "$TMP_SNIPPET"
<!-- CONTRACT_START -->
### Promotion Contract Configuration

| Key | Value |
| --- | --- |
EOF

jq -r '
  "| Contract Version | `\(.contract_version)` |",
  "| Registry Prefix | `\(.registry_prefix)` |",
  "| Manifest Repo | `\(.manifest_repo)` |",
  "| Required Envs | `\(.regexes.required_envs)` |",
  "| Target Envs | `\(.regexes.target_envs)` |",
  "| Digest Regex | `\(.regexes.digest)` |",
  "| App Regex | `\(.regexes.app)` |",
  "| IDP Lookback Days | `\(.idp_lookback_days)` |"
' "$CONTRACT_FILE" >> "$TMP_SNIPPET"

echo "<!-- CONTRACT_END -->" >> "$TMP_SNIPPET"

awk -v snippet_file="$TMP_SNIPPET" '
  BEGIN { skip = 0 }
  /<!-- CONTRACT_START -->/ {
    skip = 1
    while ((getline line < snippet_file) > 0) {
      print line
    }
    close(snippet_file)
    next
  }
  /<!-- CONTRACT_END -->/ {
    skip = 0
    next
  }
  !skip { print }
' "$README_FILE" > "${README_FILE}.tmp"

mv "${README_FILE}.tmp" "$README_FILE"
rm "$TMP_SNIPPET"

echo "Successfully synced contract docs to $README_FILE."
