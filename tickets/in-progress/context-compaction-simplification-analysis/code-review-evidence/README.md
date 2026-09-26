# CRR-001 independent review evidence

Canonical decision: `../code-review-report.md`; history: `../code-review-revision-record.md`. Date 2026-09-26. Source reviewed at `3eb43f0dc457fb5d5960eee62618d8d497e42e9b`, base `046279298f53fb98d7688ee9dc2b2ba0fa827685`. No production or durable test changes by reviewer.

## Results

- `core-focused.log`: 41 files / 233 tests pass.
- `server-focused-and-residuals.log`: 4 files pass / 5 fail; 76 pass / 15 fail. All four direct-compaction/migration groups pass (30 tests).
- `baseline-residuals.log`: same 15 named failures at unchanged base, 46 pass, five files fail. `residual-comparison.json` compares names. Dependency trees were reused, with base core source and base tracked presentation-contract dist. This is not a full baseline suite and does not validate product correctness of the unrelated failed scenarios.
- `review-probes.log`: 2 reviewer-only probes pass. The actual shared live-compaction harness reaches missing deleted template before generation; only provider model discovery is mocked. New direct-status metadata survives core stream wrapping. These are evidence probes, not replacement durable API/E2E coverage.
- `review-probes-initial-path-error.log`: first attempt imported via one-too-shallow relative paths, so collected no tests. Corrected probe produced the result above; no product failure inferred from the initial error.
- `source-audit.md/.json`: independent counts/placement/removal review; no surviving >500 handwritten production source; >220 deltas confined to two removed files. Tests/generation excluded.
- `input-and-source-hashes.json`: cumulative upstream artifact/source inventory pin, plus affected omitted seams. Hash inclusion is not a claim that every raw historical log or upstream research literal was independently rerun.

## Exact focused commands

From `/Users/normy/autobyteus_org/autobyteus-worktrees/context-compaction-simplification-analysis`:

```sh
pnpm -C autobyteus-ts exec vitest run tests/unit/memory tests/unit/llm/api/completion-status.test.ts tests/unit/llm/llm-factory-config-composition.test.ts tests/integration/agent/runtime/agent-runtime-compaction.test.ts --no-watch

pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-execution/compaction tests/unit/startup/compaction-model-settings-migration.test.ts tests/unit/secret-management/live-e2e-harness.test.ts tests/unit/agent-execution/agent-run-provisioning-service.test.ts tests/unit/agent-execution/backends/antigravity/agy-stream-event-converter.test.ts tests/unit/agent-execution/backends/claude/session/claude-session.test.ts tests/unit/agent-execution/backends/codex/events/codex-tool-log-correlation.test.ts --no-watch
```

The repository's server test setup resets its synthetic test DB. No live server/user database or provider was used. Logs preserve the Prisma setup and exact failures.

## Reviewer probes

```sh
ROOT=/Users/normy/autobyteus_org/autobyteus-worktrees/context-compaction-simplification-analysis
EVIDENCE="$ROOT/tickets/in-progress/context-compaction-simplification-analysis/code-review-evidence"
cp "$EVIDENCE/review-vitest.config.ts" "$ROOT/autobyteus-server-ts/code-review-vitest.config.ts"
pnpm -C "$ROOT/autobyteus-server-ts" exec vitest run --config code-review-vitest.config.ts --no-watch
rm "$ROOT/autobyteus-server-ts/code-review-vitest.config.ts"
```

The temporary config is necessary to include ticket evidence outside the ordinary durable test inventory. It uses existing server TS path mapping and no global database setup. Probe-created temporary directories are removed in finally; no provider credentials are consulted. Its expected ENOENT is the finding evidence, not a passing product path. The config was removed after both runs.

## Unchanged-base residual recheck

`baseline-directory.txt` identifies the owned temporary extraction used for the actual run (removed after evidence capture). Reproduce with a fresh directory:

```sh
ROOT=/Users/normy/autobyteus_org/autobyteus-worktrees/context-compaction-simplification-analysis
cd "$ROOT"
BASE=$(mktemp -d /tmp/compaction-crr001-base.XXXXXX)
git archive 046279298f53fb98d7688ee9dc2b2ba0fa827685 autobyteus-server-ts autobyteus-ts autobyteus-agent-presentation-contracts test-support | tar -x -C "$BASE"
ln -s "$ROOT/node_modules" "$BASE/node_modules"
for p in autobyteus-server-ts autobyteus-ts autobyteus-agent-presentation-contracts; do
  ln -s "$ROOT/$p/node_modules" "$BASE/$p/node_modules"
done
cat > "$BASE/autobyteus-server-ts/code-review-baseline.config.ts" <<'CONFIG'
import original from './vitest.config.js';
import path from 'node:path';
export default { ...original, resolve: { alias: { '@autobyteus/agent-presentation-contracts': path.resolve('../autobyteus-agent-presentation-contracts/dist/index.js') } } };
CONFIG
pnpm -C "$BASE/autobyteus-server-ts" exec vitest run --config code-review-baseline.config.ts tests/unit/secret-management/live-e2e-harness.test.ts tests/unit/agent-execution/agent-run-provisioning-service.test.ts tests/unit/agent-execution/backends/antigravity/agy-stream-event-converter.test.ts tests/unit/agent-execution/backends/claude/session/claude-session.test.ts tests/unit/agent-execution/backends/codex/events/codex-tool-log-correlation.test.ts --no-watch
```

Missing Antigravity ticket fixtures are absent in both checkout/extraction; this reproduces the fixture deficit, not a claim about a separately provisioned environment. The baseline adapter branch and old presentation contract are used, so the Codex strict-admission symptom is not attributed merely from unchanged test text. The old shared harness can still have unrelated preexisting failures; the deleted-template CR-001 probe is distinct.

## Limits / scope

No live calls, paid model use, private history inspection, semantic-quality benchmark, API/E2E approval, power-loss/process-crash experiment, full repository test pass, source fix or delivery action. No independent browser session; upstream synthetic render report/fixture reviewed with limits. No reimplementation of upstream research or second source authority. Both supported normal and explicit-edge contracts are documented in the canonical report before findings; arbitrary corruption or contrived concurrent workflows cannot drive review deductions.
