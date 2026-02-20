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

chmod +x "${repo_root}/.githooks/post-checkout"

# Store hook path per worktree so each worktree remains independent.
git -C "${repo_root}" config extensions.worktreeConfig true
git -C "${repo_root}" config --worktree core.hooksPath "${repo_root}/.githooks"

echo "Installed shared hooks for this worktree."
echo "core.hooksPath=$(git -C "${repo_root}" config --show-origin --get core.hooksPath)"
