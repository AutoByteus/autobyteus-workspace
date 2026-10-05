# IR-004 local implementation checks / CRR-001 Local Fix

Working directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-manager-linked-delegation`; branch `codex/project-task-manager-linked-delegation`, HEAD/base `806907faeb567d2b703e10fe984fcd01be0b41fd`.

Guideline TESTING.md and server AGENTS reread. Ordinary implementation-scoped units/typecheck, test-owned database/candidates/CLI/temp roots only; no user-running app/profile, provider/model request, isolated desktop/API/E2E/deployment/global Stop. No source/stage/reset/commit/finalization outside this worktree. Pinned SDK/core source unchanged this round; prior built core dist used by server tests, prior build evidence retained rather than called a new build.

## Current commands and receipts

```sh
pnpm -C autobyteus-server-ts exec tsc --noEmit -p tsconfig.build.json
# exit0, ir-004-production-typecheck.log empty diagnostic output (production tsconfig only)
git diff --check
# exit0, ir-004-diffcheck.log empty diagnostic output

git diff --exit-code -- autobyteus-server-ts/src/server-runtime.ts autobyteus-server-ts/src/standalone-application-host/start-standalone-application-host.ts autobyteus-server-ts/src/app-data-migrations
# exit0, ir-004-unchanged-startup-migrations.diff empty

pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-collaboration/task-lifetime-quiet-generation.test.ts tests/unit/agent-team-execution/flat-team-private-release-independence.test.ts tests/unit/agent-collaboration/task-lifetime-tree-scope.test.ts --no-watch
# exit0, 3 files24tests passed; ir-004-local-fix-final.log

bash tickets/in-progress/project-task-manager-linked-delegation/implementation-evidence/ir-004-focused-command.sh
# exact same command executed via subprocess shell; exit0, ir-004-focused-final.log
# 130 passed/3 skipped files (133),1175 passed/5 skipped tests (1180)
```

The expanded selection is exactly persisted in `ir-004-focused-command.sh`: IR-003 focused selection plus the new private-release file and MCP directory. New quiet-generation file is inside existing collaboration directory, Claude component cleanup file inside existing Claude directory. Current full selection includes pinned SDK actual test-owned Node child, current Project array/lifetimes, both existing startup boundaries and all selected root/provider contracts. Opt-in AGY live tests skipped, not accepted. This is not all repository units, current broad audit, API/E2E, actual provider/model or Manager acceptance. Targeted24tests overlap expanded1175; totals are per command, not additive.

## Durable correction witnesses

- `task-lifetime-quiet-generation.test.ts`9cases: all three concrete subject adapters with real local factory/registries/quiet/restore/scope. Nested Agent/Team/grandchild old generations, coordinator-only follow-up twice, root-hosted sibling helper, B/borrowed/Manager liveness and unchanged tree snapshot. Current Agent and nested Team/grandchild restored generations stop-fail, retain same object, retry, repeat idempotently without reacquisition. Missing/never-owned/fresh same-history host stays unavailable even if host terminates; tagged-root/placement proof mismatch rejects. Provider construction/physical stop and closed-business-port are controlled, not real-provider/system journey acceptance.
- `flat-team-private-release-independence.test.ts`4cases: actual factory/private manager/control, controlled opaque Manager candidate boundary. Second independent stop starts before slow first settles. Failing first or rejecting second abort retains exact failed callback, retries that one, idempotent/no publication/reacquisition. Second binding/preparation rejection after candidate acquisition uses actual planner validation, retains candidate, still aborts before first drain. No proof of real-provider duration/availability.
- Supporting scope11tests retained; directory eviction/replacement regression now checks compact proof transfer. Cumulative actual child/client/component tests remain relevant, including vendor sessionStore-not-app-path distinction; narrow actual child checks do not constitute provider/model authentication or desktop acceptance.

## Failed / historical attempts — preserved truthfully

- `ir-004-local-fix-initial.log`: exit1,2failed/1passedfiles,8failed/15passedtests. Six new repeated-DONE cases exposed missing current-generation terminal child proof after successful aggregate disposal; source corrected by explicit known-reference coverage from verified current terminal Team. Two private-failure cases expected a result instead of the specified thrown aggregate; fixture expectations corrected. Not relabeled accepted/baseline.
- `ir-004-local-fix-round2.log`: exit0,3files23tests passed, before adding the fourth partial post-acquisition-rejection case and final negative scope checks; final24tests supersede this bounded selection.
- IR-003 broad audit remains52failed/560passed/3skippedfiles,136failed/4119passed/6skippedtests,4unhandlederrors, not rerun in full. Released migration selection remains4failed/51passedfiles,6failed/349passedtests, unchanged source/tests but no same-base executable baseline. Current selected green does not classify every historical failure or certify its origin. Released migrations/startup/journal/global Stop not altered to manufacture green.
- IR-001/002 probes and historical IR-003 build/core/focused/component logs remain actual prior-round evidence, not current API/E2E/provider/product acceptance.

## Source preservation / guard

CRR-001192fingerprints→current195:4existing source +1existing test corrected,3test/fixture additions,187priorfingerprints unchanged,zero prior files missing. Cumulative156tracked/131source-template/64test-fixture. `ir-004-source-inventory.md`, `ir-004-package-preservation.json`, `ir-004-package-fingerprints.tsv` record exact allocation/sizes/hashes. All131sourcefiles <=500 effective and raw nonempty (max raw499); no >220 local correction delta. Prior cumulative >220 signals stay reviewed, not hidden by net counts.

Independent Large/High source re-review/finding closure remains next, then API/E2E real providers/isolated worktree-built Manager/all-root cascades/races/quiet follow-up/Stop/retry/restart/direct-array/startup and Delivery. No gate waived.
