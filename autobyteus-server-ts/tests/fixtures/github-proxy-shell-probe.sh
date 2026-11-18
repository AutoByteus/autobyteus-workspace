#!/bin/bash
# GitHub credential proxy shell probe (autobyteus-311): what an integration skill's script does in an agent's shell.
# Usage: bash github-proxy-shell-probe.sh <output dir>
# Writes into <output dir>:
#   env.txt       this shell's environment (`env`);
#   ps.txt        the process listing with full command lines (`ps -axww`);
#   ps-env.txt    this shell's and its parent's environment as the OS shows it (`ps -E` on macOS, `ps e` on Linux);
#   issue.json    `curl "$AUTOBYTEUS_GITHUB_API_URL/repos/<test repo>/issues/1"` (only when the variable is set);
#   ls-remote.txt `git ls-remote https://github.com/<test repo>.git HEAD` (only when the variable is set: without the
#                 proxy, git could fall back to the user's own credential helper);
#   result.json   the exit codes, written last.
# The test that runs it reads these files, scans them for the token and removes them. Never commit their content.
out="${1:?usage: github-proxy-shell-probe.sh <output dir>}"
repo="ryan-zheng-teki/autobyteus-mcp-test"
mkdir -p "$out" || exit 1

env > "$out/env.txt"
ps -axww -o pid=,ppid=,command= > "$out/ps.txt" 2>&1
ps_status=$?
if ps -E -p "$$" > /dev/null 2>&1; then
  ps -Eww -o command= -p "$$" -p "$PPID" > "$out/ps-env.txt" 2>&1
else
  ps eww -o command= -p "$$" -p "$PPID" > "$out/ps-env.txt" 2>&1
fi
ps_env_status=$?

api_http="skipped"
git_status=-1
if [ -n "${AUTOBYTEUS_GITHUB_API_URL:-}" ]; then
  api_http=$(curl -sS -o "$out/issue.json" -w '%{http_code}' -H 'Accept: application/vnd.github+json' \
    "$AUTOBYTEUS_GITHUB_API_URL/repos/$repo/issues/1" 2> "$out/curl.err")
  [ $? -eq 0 ] || api_http="curl-failed"
  git ls-remote "https://github.com/$repo.git" HEAD > "$out/ls-remote.txt" 2> "$out/ls-remote.err"
  git_status=$?
fi

printf '{"apiHttp":"%s","gitStatus":%d,"psStatus":%d,"psEnvStatus":%d}\n' \
  "$api_http" "$git_status" "$ps_status" "$ps_env_status" > "$out/result.json.tmp" && mv "$out/result.json.tmp" "$out/result.json"
echo "GITHUB_PROXY_PROBE_DONE api=$api_http git=$git_status"
