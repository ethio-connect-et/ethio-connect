#!/usr/bin/env bash

set -euo pipefail

ORG="ethio-connect-et"
DRY_RUN=true
PACKAGE_TYPE_FILTER=""

# Supported GitHub package types
PACKAGE_TYPES=("container" "npm" "maven" "nuget" "rubygems")

usage() {
  echo "Usage: $0 [-y] [-t package_type]"
  echo ""
  echo "Options:"
  echo "  -y                Perform actual deletion (disable dry-run)"
  echo "  -t package_type   Filter by package type (container, npm, maven, etc.)"
  exit 1
}

while getopts ":yt:" opt; do
  case $opt in
    y) DRY_RUN=false ;;
    t) PACKAGE_TYPE_FILTER="$OPTARG" ;;
    *) usage ;;
  esac
done

echo "Organization: $ORG"
echo "Dry run: $DRY_RUN"
[[ -n "$PACKAGE_TYPE_FILTER" ]] && echo "Filter: $PACKAGE_TYPE_FILTER"

for TYPE in "${PACKAGE_TYPES[@]}"; do
  if [[ -n "$PACKAGE_TYPE_FILTER" && "$TYPE" != "$PACKAGE_TYPE_FILTER" ]]; then
    continue
  fi

  echo ""
  echo "Fetching packages of type: $TYPE"

  PACKAGES=$(gh api /orgs/$ORG/packages?package_type=$TYPE --paginate 5>/dev/null || echo "[]")

  echo "$PACKAGES" | jq -c '.[]?' | while read -r pkg; do
    NAME=$(echo "$pkg" | jq -r '.name')

    if [[ "$DRY_RUN" == true ]]; then
      echo "[DRY RUN] Would delete $TYPE package: $NAME"
    else
      echo "Deleting $TYPE package: $NAME"

      gh api \
        -X DELETE \
        -H "Accept: application/vnd.github+json" \
        /orgs/$ORG/packages/$TYPE/$NAME \
        || echo "Failed to delete $TYPE/$NAME"

      sleep 1
    fi
  done
done

echo ""
echo "Done."