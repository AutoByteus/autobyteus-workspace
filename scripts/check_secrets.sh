#!/usr/bin/env bash
# Secret gate: scan the commits that are about to be pushed for API keys,
# tokens, passwords and private keys. See RELEASE.md, "Secret Gate".
#
# Usage:
#   scripts/check_secrets.sh                # commits in origin/personal..HEAD
#   scripts/check_secrets.sh <git-range>    # any range, e.g. main..HEAD or <sha>~1..<sha>
#
# Uses gitleaks (brew install gitleaks) with the repository's .gitleaks.toml
# (default rules plus confirmed false positives). Output is redacted: a finding
# shows the commit, file, line and rule, never the value. Nothing is sent to
# any provider.
#
# Exit codes: 0 = no findings, 1 = findings (block the push), 2 = cannot run.
set -euo pipefail

root="$(git rev-parse --show-toplevel)"
range="${1:-origin/personal..HEAD}"
config="$root/.gitleaks.toml"

if ! command -v gitleaks >/dev/null 2>&1; then
  echo "secret gate: gitleaks is not installed (brew install gitleaks)" >&2
  exit 2
fi
if [ ! -f "$config" ]; then
  echo "secret gate: missing $config" >&2
  exit 2
fi
# Resolve both ends of the range so a typo cannot silently scan nothing.
ends="${range//.../..}"
for end in ${ends//../ }; do
  if ! git -C "$root" rev-parse --verify --quiet "$end^{commit}" >/dev/null; then
    echo "secret gate: cannot resolve '$end' in range '$range' (fetch first?)" >&2
    exit 2
  fi
done

count="$(git -C "$root" rev-list --count "$range")"
echo "secret gate: scanning $count commit(s) in $range"
if [ "$count" -eq 0 ]; then
  echo "secret gate: nothing to scan"
  exit 0
fi

set +e
gitleaks git "$root" \
  --config "$config" \
  --log-opts="$range" \
  --redact \
  --verbose \
  --no-banner \
  --log-level warn \
  --exit-code 1
status=$?
set -e

case "$status" in
  0) echo "secret gate: PASS (no secrets found)";;
  1) echo "secret gate: BLOCKED. Remove the secret from these commits before pushing (amend or rebase the unpushed commits)." >&2
     echo "secret gate: a real key that was ever pushed must also be revoked at its provider. Add a false positive to .gitleaks.toml only after checking it." >&2;;
  *) echo "secret gate: gitleaks failed (exit $status)" >&2; status=2;;
esac
exit "$status"
