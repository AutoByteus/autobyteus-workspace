#!/usr/bin/env bash
# API-15 (autobyteus-416 AC-006, REQ-005, design D7 "Browser probes"): runs a representative set of the 40 changed browser
# probes, one per edit shape, plus the ones that read user files, one at a time (TESTING.md: one heavy run at a time),
# each with a fresh output dir, through its package script. Writes <out>/API-15-sweep.txt with each probe's exit code and
# its last lines; each probe's own evidence stays in <out>/<probe>/.
# Shapes (implementation handoff § Key Files): origin added where the frontend URL was known (token-statistics-ui,
# composer-context-file-removal, search-pdf-preview, file-explorer-pending-save-draft); frontend port chosen before the
# node (embedding-settings, model-routing-settings: createNode/startNode; owner-scoped-file-reads,
# delegated-copies-large-hub: the `stack` probes, small seeds); module-level frontend origin, multi-node (node-vocabulary
# with a LAN-address frontend, remote-run-title, projects-feature). Live-provider probes are not run (credits).
# Usage: api-15-probe-sweep.sh <worktree> <out dir>
set -uo pipefail
worktree="$1"; out="$2"; mkdir -p "$out"
summary="$out/API-15-sweep.txt"; step=0
echo "# API-15 probe sweep; commit $(git -C "$worktree" rev-parse --short HEAD) (source da207045a5); started $(date -u +%FT%TZ)" > "$summary"
clean() { env -i PATH="$PATH" HOME="$HOME" TMPDIR="$TMPDIR" USER="$USER" "$@"; }
runp() {
  local name="$1"; shift
  step=$((step+1)); local log="$out/$(printf %02d $step)-$name.console.log"
  echo "[$(date -u +%FT%TZ)] start $name" >> "$summary"
  (cd "$worktree" && clean pnpm -C autobyteus-web "test:e2e:$name" "$@") > "$log" 2>&1
  local code=$?
  echo "[$(date -u +%FT%TZ)] end $name exit=$code" >> "$summary"
  tail -4 "$log" | sed 's/^/    /' >> "$summary"
}
runp token-statistics-ui --output-dir "$out/token-statistics-ui"
runp composer-context-file-removal --output-dir "$out/composer-context-file-removal"
runp search-pdf-preview --output-dir "$out/search-pdf-preview"
runp file-explorer-pending-save-draft --output-dir "$out/file-explorer-pending-save-draft"
runp embedding-settings --skip-server-build "--output-dir=$out/embedding-settings"
runp model-routing-settings --skip-server-build "--output-dir=$out/model-routing-settings"
seed="$(mktemp -d /tmp/api416-15-seed-XXXX)"
runp owner-scoped-file-reads --seed-to "$seed/owner" --unrelated 10
runp owner-scoped-file-reads --from-seed "$seed/owner" --output-dir "$out/owner-scoped-file-reads"
runp delegated-copies-large-hub --seed-to "$seed/hub" --teams 5 --unrelated 10
runp delegated-copies-large-hub --from-seed "$seed/hub" --output-dir "$out/delegated-copies-large-hub"
rm -rf "$seed"
runp node-vocabulary "--output-dir=$out/node-vocabulary"
runp remote-run-title "--output-dir=$out/remote-run-title"
runp projects --skip-server-build "--output-dir=$out/projects-feature"
echo "# finished $(date -u +%FT%TZ)" >> "$summary"
cat "$summary"
