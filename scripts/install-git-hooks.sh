#!/usr/bin/env bash
set -euo pipefail

repo_root="$(git rev-parse --show-toplevel 2>/dev/null || true)"
if [[ -z "${repo_root}" ]]; then
  echo "Error: run this script inside a git repository."
  exit 1
fi

if [[ ! -f "${repo_root}/.githooks/post-checkout" ]]; then
  echo "Error: missing ${repo_root}/.githooks/post-checkout."
  exit 1
fi

git_dir="$(git -C "${repo_root}" rev-parse --git-dir)"
hook_dir="${git_dir}/hooks"
mkdir -p "${hook_dir}"

# Install committed hooks into this worktree-local hooks directory.
install -m 0755 "${repo_root}/.githooks/post-checkout" "${hook_dir}/post-checkout"

# Keep hooks path per worktree so each worktree remains independent.
git -C "${repo_root}" config extensions.worktreeConfig true
git -C "${repo_root}" config --worktree core.hooksPath "${hook_dir}"

echo "Installed shared hooks for this worktree."
echo "core.hooksPath=$(git -C "${repo_root}" config --show-origin --get core.hooksPath)"
