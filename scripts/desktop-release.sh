#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
WEB_PACKAGE_JSON="$REPO_ROOT/autobyteus-web/package.json"
RELEASE_NOTES_OUTPUT_PATH="$REPO_ROOT/.github/release-notes/release-notes.md"
RELEASE_NOTES_OUTPUT_REL=".github/release-notes/release-notes.md"
RELEASE_VERSIONS_HELPER="$SCRIPT_DIR/release_versions.py"
DEFAULT_BRANCH="personal"

usage() {
  cat <<'USAGE'
Usage:
  scripts/desktop-release.sh release <version> --release-notes <file> [--branch <branch>] [--no-push]
  scripts/desktop-release.sh beta [--base <X.Y.Z>] [--branch <branch>] [--no-push]
  scripts/desktop-release.sh test [--ref <git-ref>]
  scripts/desktop-release.sh manual-dispatch <tag> [--ref <git-ref>] [--prerelease]

Commands:
  release   Bump autobyteus-web/package.json version, sync curated release notes,
            commit, and create matching tag.
            Defaults: --branch personal, push enabled. Pushing the tag starts the real release workflow.
  beta      Release the next beta (vX.Y.Z-beta.N) without curated notes. The tag is published
            as a GitHub pre-release with generated notes and is offered only to desktop installs
            with "Receive beta updates" on. Base defaults to the next patch after the highest
            stable tag; N is the next unused beta number (max 98). After X.Y.99 there is no
            default: pass --base X.(Y+1).0. Other options as for release.
  Both release and beta refuse, before committing or tagging, a version the Android
  versionCode cannot encode (major <= 209, minor <= 999, patch <= 99).
  test      Trigger release-desktop workflow for build-only validation (no GitHub release publish).
  manual-dispatch
            Trigger release-desktop workflow manually for an existing tag.
            Use this for an existing tag or manual re-publish, not immediately after a fresh release.

Examples:
  scripts/desktop-release.sh release 1.2.7 --release-notes tickets/done/my-ticket/release-notes.md
  scripts/desktop-release.sh release 1.2.7 --release-notes tickets/done/my-ticket/release-notes.md --no-push
  scripts/desktop-release.sh beta
  scripts/desktop-release.sh beta --base 1.5.0
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
  local file_path="$1"
  node - "$file_path" <<'NODE'
const fs = require('fs');
const file = process.argv[2];
const pkg = JSON.parse(fs.readFileSync(file, 'utf8'));
process.stdout.write(pkg.version);
NODE
}

set_package_version() {
  local file_path="$1"
  local next_version="$2"
  node - "$file_path" "$next_version" <<'NODE'
const fs = require('fs');
const file = process.argv[2];
const nextVersion = process.argv[3];
const pkg = JSON.parse(fs.readFileSync(file, 'utf8'));
pkg.version = nextVersion;
fs.writeFileSync(file, JSON.stringify(pkg, null, 2) + '\n');
NODE
}

# Refuses a version that a release platform cannot publish (today: the Android
# versionCode limits), before anything is committed, tagged or pushed.
ensure_publishable_version() {
  local version="$1"
  if ! (cd "$REPO_ROOT" && python3 "$RELEASE_VERSIONS_HELPER" android-version-code "$version" >/dev/null); then
    echo "Error: version '$version' cannot be released on every platform; nothing was committed or tagged." >&2
    exit 1
  fi
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
  require_cmd python3
  ensure_publishable_version "$version"
  validate_release_notes_file "$release_notes_file"
  ensure_clean_worktree
  ensure_on_branch "$branch"

  local tag="v$version"
  ensure_tag_absent "$tag"
  bump_package_version "$version"
  sync_release_notes_file "$release_notes_file"
  commit_tag_and_push "$version" "$branch" "$push_enabled" \
    .github/release-notes/release-notes.md \
    autobyteus-web/package.json
}

run_beta() {
  local branch="$DEFAULT_BRANCH"
  local push_enabled="true"
  local base=""

  while [[ $# -gt 0 ]]; do
    case "$1" in
      --)
        shift
        ;;
      --base)
        base="${2:-}"
        if [[ -z "$base" ]]; then
          echo "Error: --base requires a version like 1.5.0." >&2
          exit 1
        fi
        shift 2
        ;;
      --branch)
        branch="${2:-}"
        shift 2
        ;;
      --no-push)
        push_enabled="false"
        shift
        ;;
      *)
        echo "Error: unknown option for beta: $1" >&2
        usage
        exit 1
        ;;
    esac
  done

  require_cmd git
  require_cmd node
  require_cmd python3
  ensure_clean_worktree
  ensure_on_branch "$branch"

  git -C "$REPO_ROOT" fetch --tags origin

  local next_beta_args=(next-beta)
  if [[ -n "$base" ]]; then
    next_beta_args+=(--base "$base")
  fi
  local version
  version="$(cd "$REPO_ROOT" && python3 "$RELEASE_VERSIONS_HELPER" "${next_beta_args[@]}")"

  ensure_publishable_version "$version"
  local tag="v$version"
  ensure_tag_absent "$tag"
  bump_package_version "$version"
  commit_tag_and_push "$version" "$branch" "$push_enabled" autobyteus-web/package.json
}

ensure_on_branch() {
  local branch="$1"
  local current_branch
  current_branch="$(get_current_branch)"
  if [[ "$current_branch" != "$branch" ]]; then
    echo "Error: current branch is '$current_branch'. Switch to '$branch' first." >&2
    exit 1
  fi
}

bump_package_version() {
  local version="$1"
  local current_web_version
  current_web_version="$(get_package_version "$WEB_PACKAGE_JSON")"
  if [[ "$current_web_version" == "$version" ]]; then
    echo "Error: autobyteus-web/package.json is already version '$version'." >&2
    exit 1
  fi

  echo "Updating autobyteus-web/package.json: $current_web_version -> $version"
  set_package_version "$WEB_PACKAGE_JSON" "$version"
}

# Shared release tail: commit the given paths, create the annotated tag and push.
commit_tag_and_push() {
  local version="$1"
  local branch="$2"
  local push_enabled="$3"
  shift 3
  local tag="v$version"

  git -C "$REPO_ROOT" add "$@"
  git -C "$REPO_ROOT" commit -m "chore(release): bump workspace release version to $version"
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
    beta)
      run_beta "$@"
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
