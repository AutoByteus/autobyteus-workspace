#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
WEB_PACKAGE_JSON="$REPO_ROOT/autobyteus-web/package.json"
RELEASE_NOTES_OUTPUT_PATH="$REPO_ROOT/.github/release-notes/release-notes.md"
RELEASE_NOTES_OUTPUT_REL=".github/release-notes/release-notes.md"
DEFAULT_BRANCH="personal"

usage() {
  cat <<'USAGE'
Usage:
  scripts/desktop-release.sh release <version> --release-notes <file> [--branch <branch>] [--no-push]
  scripts/desktop-release.sh test [--ref <git-ref>]
  scripts/desktop-release.sh manual-dispatch <tag> [--ref <git-ref>] [--prerelease]

Commands:
  release   Bump autobyteus-web/package.json version, sync curated release notes,
            commit, and create matching tag.
            Defaults: --branch personal, push enabled. Pushing the tag starts the real release workflow.
  test      Trigger release-desktop workflow for build-only validation (no GitHub release publish).
  manual-dispatch
            Trigger release-desktop workflow manually for an existing tag.
            Use this for an existing tag or manual re-publish, not immediately after a fresh release.

Examples:
  scripts/desktop-release.sh release 1.2.7 --release-notes tickets/done/my-ticket/release-notes.md
  scripts/desktop-release.sh release 1.2.7 --release-notes tickets/done/my-ticket/release-notes.md --no-push
  scripts/desktop-release.sh test --ref personal
  scripts/desktop-release.sh manual-dispatch v1.2.7 --ref personal
USAGE
}

require_cmd() {
  local cmd="$1"
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "Error: required command '$cmd' is not installed." >&2
    exit 1
  fi
}

validate_version() {
  local version="$1"
  if [[ ! "$version" =~ ^[0-9]+\.[0-9]+\.[0-9]+([-.][0-9A-Za-z.]+)?$ ]]; then
    echo "Error: invalid version '$version'. Expected format like 1.2.7 or 1.2.7-rc1." >&2
    exit 1
  fi
}

ensure_clean_worktree() {
  if [[ -n "$(git -C "$REPO_ROOT" status --porcelain)" ]]; then
    echo "Error: working tree is not clean. Commit/stash changes first." >&2
    exit 1
  fi
}

get_current_branch() {
  git -C "$REPO_ROOT" rev-parse --abbrev-ref HEAD
}

get_package_version() {
  node - "$WEB_PACKAGE_JSON" <<'NODE'
const fs = require('fs');
const file = process.argv[2];
const pkg = JSON.parse(fs.readFileSync(file, 'utf8'));
process.stdout.write(pkg.version);
NODE
}

set_package_version() {
  local version="$1"
  node - "$WEB_PACKAGE_JSON" "$version" <<'NODE'
const fs = require('fs');
const file = process.argv[2];
const nextVersion = process.argv[3];
const pkg = JSON.parse(fs.readFileSync(file, 'utf8'));
pkg.version = nextVersion;
fs.writeFileSync(file, JSON.stringify(pkg, null, 2) + '\n');
NODE
}

ensure_tag_absent() {
  local tag="$1"
  if git -C "$REPO_ROOT" rev-parse -q --verify "refs/tags/$tag" >/dev/null 2>&1; then
    echo "Error: local tag '$tag' already exists." >&2
    exit 1
  fi
  if git -C "$REPO_ROOT" ls-remote --exit-code --tags origin "refs/tags/$tag" >/dev/null 2>&1; then
    echo "Error: remote tag '$tag' already exists on origin." >&2
    exit 1
  fi
}

validate_release_notes_file() {
  local file="$1"
  if [[ -z "$file" ]]; then
    echo "Error: release requires --release-notes <file>." >&2
    exit 1
  fi
  if [[ ! -f "$file" ]]; then
    echo "Error: release notes file '$file' does not exist." >&2
    exit 1
  fi
  if ! grep -Eq '\S' "$file"; then
    echo "Error: release notes file '$file' is empty." >&2
    exit 1
  fi
}

sync_release_notes_file() {
  local file="$1"
  mkdir -p "$(dirname "$RELEASE_NOTES_OUTPUT_PATH")"
  cp "$file" "$RELEASE_NOTES_OUTPUT_PATH"
  echo "Synced curated release notes to $RELEASE_NOTES_OUTPUT_REL"
}

run_release() {
  local version="$1"
  shift
  local branch="$DEFAULT_BRANCH"
  local push_enabled="true"
  local release_notes_file=""

  while [[ $# -gt 0 ]]; do
    case "$1" in
      --)
        shift
        ;;
      --branch)
        branch="${2:-}"
        shift 2
        ;;
      --release-notes)
        release_notes_file="${2:-}"
        shift 2
        ;;
      --no-push)
        push_enabled="false"
        shift
        ;;
      *)
        echo "Error: unknown option for release: $1" >&2
        usage
        exit 1
        ;;
    esac
  done

  validate_version "$version"
  require_cmd git
  require_cmd node
  validate_release_notes_file "$release_notes_file"
  ensure_clean_worktree

  local current_branch
  current_branch="$(get_current_branch)"
  if [[ "$current_branch" != "$branch" ]]; then
    echo "Error: current branch is '$current_branch'. Switch to '$branch' first." >&2
    exit 1
  fi

  local tag="v$version"
  ensure_tag_absent "$tag"

  local current_version
  current_version="$(get_package_version)"
  if [[ "$current_version" == "$version" ]]; then
    echo "Error: autobyteus-web/package.json is already version '$version'." >&2
    exit 1
  fi

  echo "Updating autobyteus-web/package.json: $current_version -> $version"
  set_package_version "$version"
  sync_release_notes_file "$release_notes_file"
  echo "Syncing managed messaging release manifest to $tag"
  node "$REPO_ROOT/autobyteus-message-gateway/scripts/build-runtime-package.mjs" \
    --sync-manifest-only \
    --release-tag "$tag"

  git -C "$REPO_ROOT" add \
    .github/release-notes/release-notes.md \
    autobyteus-web/package.json \
    autobyteus-server-ts/src/managed-capabilities/messaging-gateway/release-manifest.json
  git -C "$REPO_ROOT" commit -m "chore(release): bump desktop app version to $version"
  git -C "$REPO_ROOT" tag -a "$tag" -m "Release $tag"

  if [[ "$push_enabled" == "true" ]]; then
    git -C "$REPO_ROOT" push origin "$branch"
    git -C "$REPO_ROOT" push origin "$tag"
    echo "Release complete and pushed: branch '$branch', tag '$tag'."
  else
    echo "Release prepared locally (not pushed)."
    echo "To push later:"
    echo "  git push origin $branch"
    echo "  git push origin $tag"
  fi
}

test_release_workflow() {
  local ref="$DEFAULT_BRANCH"
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --)
        shift
        ;;
      --ref)
        ref="${2:-}"
        shift 2
        ;;
      *)
        echo "Error: unknown option for test: $1" >&2
        usage
        exit 1
        ;;
    esac
  done

  require_cmd gh
  gh workflow run release-desktop.yml --ref "$ref" -f publish_release=false -f prerelease=true
  echo "Triggered build-only release workflow on ref '$ref' (no GitHub release publish)."
}

manual_dispatch_release_workflow() {
  local tag="$1"
  shift
  local ref="$DEFAULT_BRANCH"
  local prerelease="false"

  while [[ $# -gt 0 ]]; do
    case "$1" in
      --)
        shift
        ;;
      --ref)
        ref="${2:-}"
        shift 2
        ;;
      --prerelease)
        prerelease="true"
        shift
        ;;
      *)
        echo "Error: unknown option for manual-dispatch: $1" >&2
        usage
        exit 1
        ;;
    esac
  done

  if [[ ! "$tag" =~ ^v[0-9]+\.[0-9]+\.[0-9]+([-.][0-9A-Za-z.]+)?$ ]]; then
    echo "Error: invalid tag '$tag'. Expected format like v1.2.7 or v1.2.7-rc1." >&2
    exit 1
  fi

  require_cmd gh
  gh workflow run release-desktop.yml \
    --ref "$ref" \
    -f publish_release=true \
    -f release_tag="$tag" \
    -f prerelease="$prerelease"
  echo "Triggered manual-dispatch release workflow for tag '$tag' using ref '$ref'."
}

main() {
  if [[ $# -lt 1 ]]; then
    usage
    exit 1
  fi

  local command="$1"
  shift

  # pnpm users often invoke script aliases as `pnpm release -- 1.2.7`.
  # Accept and discard that separator so both forms work.
  if [[ "${1:-}" == "--" ]]; then
    shift
  fi

  case "$command" in
    release)
      if [[ $# -lt 1 ]]; then
        echo "Error: release requires <version>." >&2
        usage
        exit 1
      fi
      run_release "$@"
      ;;
    test)
      test_release_workflow "$@"
      ;;
    manual-dispatch)
      if [[ $# -lt 1 ]]; then
        echo "Error: manual-dispatch requires <tag>." >&2
        usage
        exit 1
      fi
      manual_dispatch_release_workflow "$@"
      ;;
    prepare)
      echo "Warning: 'prepare' is deprecated. Use 'release' instead." >&2
      if [[ $# -lt 1 ]]; then
        echo "Error: release requires <version>." >&2
        usage
        exit 1
      fi
      run_release "$@"
      ;;
    publish)
      echo "Warning: 'publish' is deprecated. Use 'manual-dispatch' instead." >&2
      if [[ $# -lt 1 ]]; then
        echo "Error: manual-dispatch requires <tag>." >&2
        usage
        exit 1
      fi
      manual_dispatch_release_workflow "$@"
      ;;
    -h|--help|help)
      usage
      ;;
    *)
      echo "Error: unknown command '$command'." >&2
      usage
      exit 1
      ;;
  esac
}

main "$@"
