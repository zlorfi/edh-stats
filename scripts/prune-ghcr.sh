#!/bin/bash

# Prune old container image versions from the GitHub Container Registry (GHCR).
#
# By default this is a DRY RUN: it only lists what WOULD be deleted. Pass
# --force to actually delete. It always keeps the "latest" tag and the N most
# recent tagged versions, and removes untagged (dangling) versions.
#
# Usage (from repo root):
#   ./scripts/prune-ghcr.sh                 # dry-run, default packages, keep 5
#   ./scripts/prune-ghcr.sh --force         # actually delete
#   ./scripts/prune-ghcr.sh --keep 10       # keep the 10 newest tagged versions
#   ./scripts/prune-ghcr.sh --package edh-stats-backend
#   ORG=myorg ./scripts/prune-ghcr.sh       # prune an org's packages instead of a user's
#
# Requirements:
#   - GitHub CLI (gh) authenticated with the 'read:packages' and
#     'delete:packages' scopes. Add them with:
#       gh auth refresh -h github.com -s read:packages,delete:packages
#
# Environment variables:
#   ORG   - if set, operate on org packages (orgs/<ORG>/...) instead of the
#           authenticated user's namespace (user/...).
#   KEEP  - number of newest tagged versions to keep (default 5; --keep overrides).

set -euo pipefail

# ---- Defaults -------------------------------------------------------------
DEFAULT_PACKAGES=(edh-stats-backend edh-stats-frontend)
PROTECTED_TAG="latest"
KEEP="${KEEP:-5}"
FORCE=false
PACKAGES=()

# ---- Argument parsing -----------------------------------------------------
while [[ $# -gt 0 ]]; do
  case "$1" in
    --force)
      FORCE=true
      shift
      ;;
    --keep)
      KEEP="${2:?--keep requires a number}"
      shift 2
      ;;
    --package)
      PACKAGES+=("${2:?--package requires a name}")
      shift 2
      ;;
    -h|--help)
      sed -n '3,24p' "$0"
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      echo "Run '$0 --help' for usage." >&2
      exit 1
      ;;
  esac
done

if ! [[ "$KEEP" =~ ^[0-9]+$ ]]; then
  echo "Error: --keep must be a non-negative integer (got '$KEEP')" >&2
  exit 1
fi

if [[ ${#PACKAGES[@]} -eq 0 ]]; then
  PACKAGES=("${DEFAULT_PACKAGES[@]}")
fi

# ---- Preconditions --------------------------------------------------------
if ! command -v gh >/dev/null 2>&1; then
  echo "Error: GitHub CLI (gh) is not installed." >&2
  exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "Error: jq is not installed (required for parsing the API response)." >&2
  exit 1
fi

if ! gh auth status >/dev/null 2>&1; then
  echo "Error: gh is not authenticated. Run: gh auth login" >&2
  exit 1
fi

# Determine the API base path (user namespace vs org).
if [[ -n "${ORG:-}" ]]; then
  BASE="orgs/${ORG}/packages/container"
  SCOPE_LABEL="org '${ORG}'"
else
  BASE="user/packages/container"
  SCOPE_LABEL="authenticated user"
fi

# Fail early with a helpful message if the token lacks package scopes.
if ! gh api "${BASE%/container}?package_type=container" >/dev/null 2>&1; then
  echo "Error: cannot list packages for the ${SCOPE_LABEL}." >&2
  echo "Your token likely lacks the required scopes. Fix with:" >&2
  echo "  gh auth refresh -h github.com -s read:packages,delete:packages" >&2
  exit 1
fi

echo "Scope:  ${SCOPE_LABEL}"
echo "Keep:   ${KEEP} newest tagged version(s) + '${PROTECTED_TAG}'"
echo "Mode:   $([[ "$FORCE" == true ]] && echo 'DELETE (--force)' || echo 'DRY RUN (no --force)')"
echo

delete_version() {
  local pkg="$1" id="$2" label="$3"
  if [[ "$FORCE" == true ]]; then
    if gh api --method DELETE "${BASE}/${pkg}/versions/${id}" >/dev/null 2>&1; then
      echo "    deleted  ${label}"
    else
      echo "    FAILED   ${label} (id=${id})" >&2
    fi
  else
    echo "    would delete  ${label}"
  fi
}

prune_package() {
  local pkg="$1"
  echo "== Package: ${pkg} =="

  # Pull all versions once as JSON.
  local versions
  if ! versions="$(gh api --paginate "${BASE}/${pkg}/versions" 2>/dev/null)"; then
    echo "  (skipped: package not found or not accessible)"
    echo
    return 0
  fi

  # 1) Untagged (dangling) versions -> always prune.
  local untagged
  untagged="$(printf '%s' "$versions" | \
    jq -r '.[] | select((.metadata.container.tags | length) == 0) | "\(.id)\tuntagged@\(.created_at)"')"

  if [[ -n "$untagged" ]]; then
    echo "  Untagged versions:"
    while IFS=$'\t' read -r id label; do
      [[ -z "$id" ]] && continue
      delete_version "$pkg" "$id" "$label"
    done <<< "$untagged"
  else
    echo "  Untagged versions: none"
  fi

  # 2) Tagged versions -> keep newest KEEP and any tagged 'latest', prune the rest.
  local old_tagged
  old_tagged="$(printf '%s' "$versions" | jq -r \
    --arg keep "$KEEP" --arg protected "$PROTECTED_TAG" '
      [ .[] | select((.metadata.container.tags | length) > 0) ]
      | sort_by(.created_at) | reverse
      | to_entries
      | .[]
      | select((.value.metadata.container.tags | index($protected)) | not)
      | select(.key >= ($keep | tonumber))
      | "\(.value.id)\t\(.value.metadata.container.tags | join(","))@\(.value.created_at)"
    ')"

  if [[ -n "$old_tagged" ]]; then
    echo "  Old tagged versions (beyond newest ${KEEP}):"
    while IFS=$'\t' read -r id label; do
      [[ -z "$id" ]] && continue
      delete_version "$pkg" "$id" "$label"
    done <<< "$old_tagged"
  else
    echo "  Old tagged versions: none"
  fi

  echo
}

for pkg in "${PACKAGES[@]}"; do
  prune_package "$pkg"
done

if [[ "$FORCE" != true ]]; then
  echo "Dry run complete. Re-run with --force to delete the versions listed above."
fi
