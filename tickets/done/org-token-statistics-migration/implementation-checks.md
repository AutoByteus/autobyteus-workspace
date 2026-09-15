# IR-001 — Local implementation evidence

Source commit `eb306a0916b48e3251f6a2d8176703f9ebf9e1dd` against pinned `d60f74c21e4e4cf5ee23b97cb51cfa42bed3b009`; branch codex/org-token-statistics-migration. Date 2026-09-15. No live profile, real conversation, operational ledger reset or provider launch used.

## Environment and reproducibility
Workspace `/Users/normy/autobyteus_org/autobyteus-worktrees/org-token-statistics-migration`. Node v22.23.1, pnpm 10.28.2.
From workspace root:
```
pnpm install --frozen-lockfile --filter autobyteus-server-ts...
pnpm install --frozen-lockfile --filter @autobyteus/application-backend-sdk...
pnpm -C autobyteus-server-ts prepare:shared
pnpm -C autobyteus-server-ts exec prisma generate --schema prisma/schema.prisma
```
Initial prepare:shared failed because the first filtered install omitted the backend SDK's node_modules; the second install fixed this, and shared builds/generation passed. No package/lock changes. Untracked generated application SDK dist outputs were removed after checks; regenerate with prepare:shared before repeating checks.

From autobyteus-server-ts:
```
pnpm exec tsc -p tsconfig.build.json --noEmit
pnpm exec vitest run tests/unit/app-data-migrations tests/unit/token-usage tests/unit/agent-org-execution --no-watch
```
**Pass:** source compile exit 0, no diagnostics; tests 359 passed across 66 files, 39.64 seconds. `git diff --check` passed. Final raw output: `/Users/normy/autobyteus_org/autobyteus-worktrees/flat-agent-organization-model-base/tickets/done/org-token-statistics-migration/implementation-local-checks.log`.

## Focused evidence
- `agent-org-token-attribution-transition.test.ts` (11): actual isolated SQLite narrow updates and rollback; all other persisted fields match exactly, including a >2^53 BigInt sentinel, snapshot/digest strings, timestamps/revision/costs; facets unchanged. Native controls, absent usage, source-only token retry, exact unexpected claimant/wrong root/mixed/scalar-only/malformed failures, settled direct/task-Team Agents, duplicate suppression and advancing cumulative accounting. Current presentation adapter publishes corrected duplicate/advancing events. Real current-package load rejects invalid attribution before injected scope build; inspection stays available, materialization-readiness errors reject too.
- `agent-org-history-candidate-safety.test.ts` (11): no-content/no-write metadata-only control; index-only retry; selected/unrelated index semantics; durable authority, before/after rename, after Org-index, before/after Team-index and final retirement failure; cross-candidate cyclic token/sidecar failure and successful retry. Source markers survive incomplete effects.
- Existing locator migration suite (11): active and complete archive typed attachment rewrites, file-only facts, byte preservation, invalid ownership/ambiguity, partial atomic writes, strict reread and target-only retry. Synthetic outside-cohort assertions now explicitly expect unchanged bytes, consistent with SR-003.
- Production registry unit fixture runs ordinary migration chain on disposable data, verifies token prerequisite order/same family ID, and verifies completed family is not rerun. Existing runner suite covers both successful statuses unchanged. Existing token materialization tests remain passing.

## Migration-only I/O measurement
One isolated warm/local sample, not a benchmark or startup-duration guarantee. Added **21 MiB / 22,020,096 bytes**: 10 standalone traces, 10 flat-Team archives and a flat-Team sidecar. Flat Team includes delegated task Team metadata. An unrelated Org has deliberately invalid authority content, which this family migration does not read/validate.

| Measurement | Before excluded content | After excluded content |
| --- | ---: | ---: |
| readFile attempts (includes absent index probes) | 3 | 3 |
| successful read bytes | 1495 | 1495 |
| readdir calls (Team root and Org root only) | 2 | 2 |
| history-content reads | 0 | 0 |
| history writes | 0 | 0 |
| elapsed milliseconds, observational only | 4.243 | 1.056 |

Zero standalone enumeration/read; flat Team only execution-tree read, no descendant enumeration/sidecar/archive/attachment read. Index writes zero. Separate startup readiness scanner is unchanged and excluded from this claim.

## Limitations and failed checks recorded honestly
- `pnpm exec tsc -p tsconfig.json --noEmit` fails with TS6059: unchanged repository config sets rootDir `src` but includes `tests`. No full test-inclusive typecheck pass claimed; successful source-only compile above is proportionate local evidence.
- Earlier newly authored fixture runs failed on pretty-printed JSON in JSONL and missing interruption-history updates; corrected synthetic fixtures now pass strict production validators. No current failing implementation check suppressed.
- Local restore coverage intentionally uses an injected scope-builder sentinel after real current package loading; no complete runtime or real provider response. Token accumulator and presentation adapter checks are real isolated components, not a complete continuation journey.
- AC-001/006 full legacy-ledger materialization → family migration → actual restore → continuation/provider/token presentation validation remains API/E2E-owned, including no-history stale-token case. Source-batch boundary and additional failure controls warrant independent assessment.
- No new runtime fallback, runner hook, ledger reset or schema/migration identity. No integration/push/deployment. Medium task / High architectural risk retained.
