#!/usr/bin/env bash

set -euo pipefail

TARGET_ORG=""
TARGET_USER=""
DRY_RUN=false
PACKAGE_TYPE_FILTER=""

# Supported GitHub package types
PACKAGE_TYPES=("container" "npm" "maven" "nuget" "rubygems")

usage() {
  echo "Usage: $0 [-o org | -u user] [-y] [-t package_type]"
  echo ""
  echo "Options:"
  echo "  -o org            Target GitHub organization"
  echo "  -u user           Target GitHub user"
  echo "  -y                Perform actual deletion (disable dry-run)"
  echo "  -t package_type   Filter by package type (container, npm, maven, etc.)"
  exit 1
}

while getopts ":o:u:yt:" opt; do
  case $opt in
    o) TARGET_ORG="$OPTARG" ;;
    u) TARGET_USER="$OPTARG" ;;
    y) DRY_RUN=false ;;
    t) PACKAGE_TYPE_FILTER="$OPTARG" ;;
    *) usage ;;
  esac
done

if [[ -n "$TARGET_ORG" && -n "$TARGET_USER" ]]; then
  echo "Error: Cannot specify both -o and -u"
  usage
fi

if [[ -z "$TARGET_ORG" && -z "$TARGET_USER" ]]; then
  echo "Error: Must specify either -o or -u"
  usage
fi

if [[ -n "$TARGET_ORG" ]]; then
  API_BASE="/orgs/$TARGET_ORG"
  DISPLAY_NAME="Organization: $TARGET_ORG"
else
  API_BASE="/users/$TARGET_USER"
  DISPLAY_NAME="User: $TARGET_USER"
fi

echo "$DISPLAY_NAME"
echo "Dry run: $DRY_RUN"
[[ -n "$PACKAGE_TYPE_FILTER" ]] && echo "Filter: $PACKAGE_TYPE_FILTER"

for TYPE in "${PACKAGE_TYPES[@]}"; do
  if [[ -n "$PACKAGE_TYPE_FILTER" && "$TYPE" != "$PACKAGE_TYPE_FILTER" ]]; then
    continue
  fi

  echo ""
  echo "Fetching packages of type: $TYPE"

  PACKAGES=$(gh api "$API_BASE/packages?package_type=$TYPE" --paginate 2>/dev/null || echo "[]")

  echo "$PACKAGES" | jq -c '.[]?' | while read -r pkg; do
    NAME=$(echo "$pkg" | jq -r '.name')

    if [[ "$DRY_RUN" == true ]]; then
      echo "[DRY RUN] Would delete $TYPE package: $NAME"
    else
      echo "Deleting $TYPE package: $NAME"

      gh api \
        -X DELETE \
        -H "Accept: application/vnd.github+json" \
        "$API_BASE/packages/$TYPE/$NAME" \
        || echo "Failed to delete $TYPE/$NAME"

      sleep 1
    fi
  done
done

echo ""
echo "Done."
