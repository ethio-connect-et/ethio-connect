#!/usr/bin/env bash
set -euo pipefail

readonly REQUIRED_ENVS_REGEX='^(testing|staging|main)$'
readonly TARGET_ENVS_REGEX='^(testing|staging|production)$'
readonly DIGEST_REGEX='^sha256:[0-9a-f]{64}$'
readonly APP_REGEX='^[a-z0-9][a-z0-9-]*$'
readonly MANIFEST_REPO='ethio-connect-et/ethio-connect-manifest'
readonly REGISTRY_PREFIX='ghcr.io/ethio-connect-et'

map_source_to_target_env() {
  local source_env="$1"
  case "$source_env" in
    testing) echo testing ;;
    staging) echo staging ;;
    main) echo production ;;
    *)
      echo "Unsupported source environment: ${source_env}" >&2
      return 1
      ;;
  esac
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

  [[ "$app" =~ $APP_REGEX ]] || { echo "Invalid app name: ${app}" >&2; return 1; }
  [[ "$digest" =~ $DIGEST_REGEX ]] || { echo "Invalid digest: ${digest}" >&2; return 1; }
  [[ "$target_env" =~ $TARGET_ENVS_REGEX ]] || { echo "Invalid target env: ${target_env}" >&2; return 1; }

  jq -nc \
    --arg app "$app" \
    --arg digest "$digest" \
    --arg env "$target_env" \
    '{event_type:"promote-image", client_payload:{app:$app, digest:$digest, env:$env}}'
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
