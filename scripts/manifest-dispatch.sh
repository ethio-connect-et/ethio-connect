#!/usr/bin/env bash
set -euo pipefail

readonly CONTRACT_FILE="$(dirname "${BASH_SOURCE[0]}")/../.github/contracts/promote-image.contract.json"
readonly REQUIRED_ENVS_REGEX="$(jq -r '.regexes.required_envs' "$CONTRACT_FILE")"
readonly TARGET_ENVS_REGEX="$(jq -r '.regexes.target_envs' "$CONTRACT_FILE")"
readonly DIGEST_REGEX="$(jq -r '.regexes.digest' "$CONTRACT_FILE")"
readonly APP_REGEX="$(jq -r '.regexes.app' "$CONTRACT_FILE")"
readonly MANIFEST_REPO="$(jq -r '.manifest_repo' "$CONTRACT_FILE")"
readonly REGISTRY_PREFIX="$(jq -r '.registry_prefix' "$CONTRACT_FILE")"
readonly IDP_LOOKBACK_DAYS="$(jq -r '.idp_lookback_days' "$CONTRACT_FILE")"

build_canonical_json() {
  jq -cS .
}

map_source_to_target_env() {
  local source_env="$1"
  local target_env
  target_env="$(jq -r --arg env "$source_env" '.env_mapping[$env] // empty' "$CONTRACT_FILE")"
  if [[ -n "$target_env" ]]; then
    echo "$target_env"
  else
    echo "Unsupported source environment: ${source_env}" >&2
    return 1
  fi
}

resolve_apps_with_docker_target() {
  pnpm nx show projects --withTarget docker:build --json | jq -r '.[]'
}

validate_dispatch_preconditions() {
  local source_env="$1"
  local app_allowlist="$2"

  [[ -n "${MANIFEST_REPOSITORY_DISPATCH_TOKEN:-}" ]] || {
    echo "MANIFEST_REPOSITORY_DISPATCH_TOKEN is required." >&2
    return 1
  }

  [[ "$source_env" =~ $REQUIRED_ENVS_REGEX ]] || {
    echo "Unsupported source environment: ${source_env}. Allowed: testing|staging|main" >&2
    return 1
  }

  local target_env
  target_env="$(map_source_to_target_env "$source_env")"
  [[ "$target_env" =~ $TARGET_ENVS_REGEX ]] || {
    echo "Mapped target environment is invalid: ${target_env}" >&2
    return 1
  }

  [[ -n "$app_allowlist" ]] || {
    echo "App allowlist must not be empty." >&2
    return 1
  }
}

build_dispatch_payload() {
  local app="$1"
  local digest="$2"
  local target_env="$3"
  local source_repo="${4:-${GITHUB_REPOSITORY:-ethio-connect-et/ethio-connect}}"
  local source_ref="${5:-${GITHUB_REF:-refs/heads/main}}"
  local source_commit="${6:-${GITHUB_SHA:-$(git rev-parse HEAD)}}"
  local release_id="${7:-${GITHUB_RUN_ID:-123456789}}"
  local release_created_at="${8:-$(date -u +%Y-%m-%dT%H:%M:%SZ)}"
  local signed_metadata="${9:-}"
  
  local default_attestation
  default_attestation="$(jq -nc \
    --arg digest "$digest" \
    --arg source_commit "$source_commit" \
    --arg source_ref "$source_ref" \
    --arg release_id "$release_id" \
    --arg release_created_at "$release_created_at" \
    '{digest:$digest, source_commit:$source_commit, source_ref:$source_ref, release_id:$release_id, release_created_at:$release_created_at}' | build_canonical_json)"
    
  local signed_metadata="${9:-null}"
  local attestation_bundle="${10:-$default_attestation}"

  if [[ "$target_env" == "production" ]]; then
    [[ -n "${9:-}" ]] || { echo "signed_metadata is required for production promotions" >&2; return 1; }
    jq -e 'type == "object" and (.signature_algorithm|type=="string" and length>0) and (.key_id|type=="string" and length>0) and (.cert_chain|type=="array" and length>0) and (.signature|type=="string" and length>0) and (.canonical_payload|type=="string" and length>0)' >/dev/null <<<"$signed_metadata" || {
      echo "signed_metadata for production must include signature_algorithm, key_id, cert_chain[], signature, canonical_payload" >&2
      return 1
    }
  fi

  [[ "$app" =~ $APP_REGEX ]] || { echo "Invalid app name: ${app}" >&2; return 1; }
  [[ "$digest" =~ $DIGEST_REGEX ]] || { echo "Invalid digest: ${digest}" >&2; return 1; }
  [[ "$target_env" =~ $TARGET_ENVS_REGEX ]] || { echo "Invalid target env: ${target_env}" >&2; return 1; }

  local promotion_key
  promotion_key="$(build_promotion_key "$app" "$digest" "$target_env")"

  local payload
  payload="$(jq -nc \
    --arg app "$app" \
    --arg digest "$digest" \
    --arg env "$target_env" \
    --arg source_repo "$source_repo" \
    --arg source_ref "$source_ref" \
    --arg source_commit "$source_commit" \
    --arg release_id "$release_id" \
    --arg release_created_at "$release_created_at" \
    --arg promotion_key "$promotion_key" \
    --argjson signed_metadata "$signed_metadata" \
    --arg attestation_bundle "$attestation_bundle" \
    '{
      event_type:"promote-image",
      client_payload:{
        app:$app,
        digest:$digest,
        env:$env,
        source_repo:$source_repo,
        source_ref:$source_ref,
        source_commit:$source_commit,
        release_id:$release_id,
        release_created_at:$release_created_at,
        promotion_key:$promotion_key,
        signed_metadata:$signed_metadata,
        attestation_bundle:$attestation_bundle
      } | with_entries(select(.value != null))
    }')"

  # Validate against schema if ajv is installed
  if command -v npx >/dev/null 2>&1 && [ -f .github/contracts/promote-image.schema.json ]; then
    local tmp_data
    tmp_data="promote-payload-$(date +%s%N).json"
    if echo "$payload" | jq '.client_payload' > "$tmp_data" 2>/dev/null; then
      if ! npx -y ajv-cli validate -s .github/contracts/promote-image.schema.json -d "$tmp_data" >&2; then
        echo "Payload schema validation failed" >&2
        rm -f "$tmp_data"
        return 1
      fi
      rm -f "$tmp_data"
    else
      echo "Failed to prepare payload for validation" >&2
      return 1
    fi
  fi

  echo "$payload"
}

build_promotion_key() {
  local app="$1"
  local digest="$2"
  local target_env="$3"

  [[ "$app" =~ $APP_REGEX ]] || { echo "Invalid app name: ${app}" >&2; return 1; }
  [[ "$digest" =~ $DIGEST_REGEX ]] || { echo "Invalid digest: ${digest}" >&2; return 1; }
  [[ "$target_env" =~ $TARGET_ENVS_REGEX ]] || { echo "Invalid target env: ${target_env}" >&2; return 1; }

  jq -nc --arg app "$app" --arg digest "$digest" --arg env "$target_env" \
    '{app:$app,digest:$digest,env:$env}' \
    | sha256sum | awk '{print $1}'
}

is_promotion_already_processed() {
  local promotion_key="$1"
  local since
  since="$(date -u -d "${IDP_LOOKBACK_DAYS} days ago" +%Y-%m-%dT%H:%M:%SZ)"

  local query
  query="${since} ${promotion_key}"

  local matches
  matches="$(gh api -X GET "/search/commits" \
    -H "Accept: application/vnd.github.cloak-preview+json" \
    -f q="repo:${MANIFEST_REPO} ${query}" \
    --jq '.total_count')"

  [[ "${matches:-0}" =~ ^[0-9]+$ ]] || matches=0
  if (( matches > 0 )); then
    return 0
  fi

  local runs_count
  runs_count="$(gh api -X GET "/repos/${MANIFEST_REPO}/actions/runs" \
    -f event="repository_dispatch" \
    -f per_page=100 \
    --jq --arg key "$promotion_key" --arg since "$since" '[.workflow_runs[] | select(.created_at >= $since and ((.display_title // "") | contains($key) or (.name // "") | contains($key)))] | length')"
  [[ "${runs_count:-0}" =~ ^[0-9]+$ ]] || runs_count=0
  (( runs_count > 0 )) && return 0

  local artifacts_count
  artifacts_count="$(gh api -X GET "/repos/${MANIFEST_REPO}/actions/artifacts" \
    -f per_page=100 \
    --jq --arg key "$promotion_key" --arg since "$since" '[.artifacts[] | select(.created_at >= $since and ((.name // "") | contains($key)))] | length')"
  [[ "${artifacts_count:-0}" =~ ^[0-9]+$ ]] || artifacts_count=0
  (( artifacts_count > 0 )) && return 0

  return 1
}


verify_release_digest() {
  local app="$1"
  local digest="$2"
  local docker_version="$3"
  local release_sha="$4"
  local release_version="$5"
  local image_ref="${REGISTRY_PREFIX}/${app}@${digest}"

  [[ "$digest" =~ $DIGEST_REGEX ]] || { echo "Invalid digest for ${app}: ${digest}" >&2; return 1; }

  docker buildx imagetools inspect "$image_ref" >/dev/null

  local config_digest
  config_digest="$(docker buildx imagetools inspect "$image_ref" --format '{{json .Image}}' | jq -r '.digest // empty')"
  [[ "$config_digest" =~ $DIGEST_REGEX ]] || { echo "Unable to resolve config digest for ${image_ref}" >&2; return 1; }

  local labels_json
  labels_json="$(docker buildx imagetools inspect "${REGISTRY_PREFIX}/${app}@${config_digest}" --format '{{json .Image.Config.Labels}}')"

  local actual_sha actual_version
  actual_sha="$(jq -r '.["org.opencontainers.image.revision"] // empty' <<< "$labels_json")"
  actual_version="$(jq -r '.["org.opencontainers.image.version"] // empty' <<< "$labels_json")"

  [[ "$actual_sha" == "$release_sha" ]] || {
    echo "Digest ${digest} for ${app} does not match release sha ${release_sha}. Found ${actual_sha}" >&2
    return 1
  }

  [[ "$actual_version" == "$docker_version" || "$actual_version" == "$release_version" ]] || {
    echo "Digest ${digest} for ${app} does not match release version ${release_version}/${docker_version}. Found ${actual_version}" >&2
    return 1
  }
}
