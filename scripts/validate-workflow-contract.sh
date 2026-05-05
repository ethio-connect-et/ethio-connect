#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RELEASE_WORKFLOW="$ROOT_DIR/.github/workflows/release.yml"
SCHEMA_FILE="$ROOT_DIR/.github/contracts/promote-image.schema.json"
WORKFLOW_README="$ROOT_DIR/.github/workflows/README.md"
DISPATCH_SCRIPT="$ROOT_DIR/scripts/manifest-dispatch.sh"

error() {
  echo "::error::$*" >&2
}

require_file() {
  local file="$1"
  [[ -f "$file" ]] || { error "Required file missing: $file"; exit 1; }
}

check_release_workflow_contract() {
  local job_block
  job_block="$(awk '
    /^  promote_to_manifest:/ { in_job=1 }
    in_job { print }
    in_job && /^  [^[:space:]]/ && $0 !~ /^  promote_to_manifest:/ { exit }
  ' "$RELEASE_WORKFLOW")"

  [[ -n "$job_block" ]] || { error "release.yml must define a promote_to_manifest job."; exit 1; }

  grep -q 'MANIFEST_REPOSITORY_DISPATCH_TOKEN: \${{ secrets.MANIFEST_REPOSITORY_DISPATCH_TOKEN }}' <<<"$job_block" || {
    error "promote_to_manifest must export MANIFEST_REPOSITORY_DISPATCH_TOKEN from secrets.MANIFEST_REPOSITORY_DISPATCH_TOKEN."; exit 1;
  }

  grep -q 'gh api repos/ethio-connect-et/ethio-connect-manifest/dispatches' <<<"$job_block" || {
    error "promote_to_manifest must dispatch to repos/ethio-connect-et/ethio-connect-manifest/dispatches."; exit 1;
  }
}

check_schema_contract() {
  local required env_enum
  required="$(jq -r '.required[]' "$SCHEMA_FILE" | sort)"
  env_enum="$(jq -r '.properties.env.enum[]' "$SCHEMA_FILE" | sort)"

  local expected_required=(app digest env source_repo source_ref source_commit release_id release_created_at signed_metadata attestation_bundle)
  local expected_env=(production staging testing)

  local actual_required actual_env
  actual_required="$(printf '%s\n' "${expected_required[@]}" | sort)"
  actual_env="$(printf '%s\n' "${expected_env[@]}" | sort)"

  if [[ "$required" != "$actual_required" ]]; then
    error "Schema required fields mismatch. Expected: ${expected_required[*]}."
    error "Actual required fields: $(tr '\n' ' ' <<<"$required")"
    exit 1
  fi

  if [[ "$env_enum" != "$actual_env" ]]; then
    error "Schema env enum mismatch. Expected: testing staging production."
    error "Actual env enum: $(tr '\n' ' ' <<<"$env_enum")"
    exit 1
  fi
}

check_readme_mapping_matches_script() {
  local expected_map actual_map
  expected_map="$(awk '
    /^\| `testing`/ { print "testing=testing" }
    /^\| `staging`/ { print "staging=staging" }
    /^\| `main`/    { print "main=production" }
  ' "$WORKFLOW_README" | sort)"

  actual_map="$(awk '
    /case "\$source_env" in/ { in_case=1; next }
    in_case && /esac/ { in_case=0 }
    in_case && /^[[:space:]]*testing\)/ { print "testing=testing" }
    in_case && /^[[:space:]]*staging\)/ { print "staging=staging" }
    in_case && /^[[:space:]]*main\)/ { print "main=production" }
  ' "$DISPATCH_SCRIPT" | sort)"

  [[ "$expected_map" == "$actual_map" ]] || {
    error "README mapping table does not match map_source_to_target_env mapping in scripts/manifest-dispatch.sh."
    error "README map: $(tr '\n' ' ' <<<"$expected_map")"
    error "Script map: $(tr '\n' ' ' <<<"$actual_map")"
    exit 1
  }
}

run_unit_style_mapping_checks() {
  # shellcheck disable=SC1090
  source "$DISPATCH_SCRIPT"

  local out
  out="$(map_source_to_target_env testing)" || { error "map_source_to_target_env testing should succeed."; exit 1; }
  [[ "$out" == "testing" ]] || { error "map_source_to_target_env testing expected testing, got $out."; exit 1; }

  out="$(map_source_to_target_env staging)" || { error "map_source_to_target_env staging should succeed."; exit 1; }
  [[ "$out" == "staging" ]] || { error "map_source_to_target_env staging expected staging, got $out."; exit 1; }

  out="$(map_source_to_target_env main)" || { error "map_source_to_target_env main should succeed."; exit 1; }
  [[ "$out" == "production" ]] || { error "map_source_to_target_env main expected production, got $out."; exit 1; }

  if map_source_to_target_env invalid >/dev/null 2>&1; then
    error "map_source_to_target_env invalid input should fail with non-zero exit."; exit 1
  fi
}

main() {
  require_file "$RELEASE_WORKFLOW"
  require_file "$SCHEMA_FILE"
  require_file "$WORKFLOW_README"
  require_file "$DISPATCH_SCRIPT"

  check_release_workflow_contract
  check_schema_contract
  check_readme_mapping_matches_script
  run_unit_style_mapping_checks

  echo "Workflow contract validation passed."
}

main "$@"
