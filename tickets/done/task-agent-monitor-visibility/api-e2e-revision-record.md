# API/E2E Revision Record

The canonical coverage investigation and execution coverage report remain the current truth. This file records completed API/E2E round deltas.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | `/code_reviewer`; `code-review-report.md`; round 1 | SR-005, ARCH-REV-005, IR-001/IR-002, CRR-001/CRR-002 | N/A | Pass / 97.6% |
| API-REV-002 | `/code_reviewer`; `api-e2e-test-review-report.md`; round 2 | API-REV-001, CRR-003 | Pass / 97.6% | Pass / 97.6% |
| API-REV-003 | `/code_reviewer`; `code-review-report.md`; round 3 | SR-006, ARCH-REV-006, IR-003, CRR-005, DR-003 | Pass / 97.6% (superseded for AC-017) | Pass / 97.9% |

## Revision Entries

### API-REV-001 — Exact task monitor and settlement reconciliation baseline

- Triggering role, report path, and round: `/code_reviewer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agent-monitor-visibility/tickets/done/task-agent-monitor-visibility/code-review-report.md`; API/E2E round 1 after CRR-002 Pass.
- Triggering finding or scenario IDs: stale BG-BROWSER-004 fixture use of removed `applyRunNavigationTeamFocus`; unexecuted CR-MP-001/AC-009 snapshot-invalidation -> focused settlement -> fallback projection boundary.
- Related revisions: SR-005, ARCH-REV-005, IR-001, IR-002, CRR-001, CRR-002.
- Why recorded: establish the required initial completed API/E2E baseline without inferring any prior result or confidence.
- Coverage decisions and durable paths changed:
  - Added `autobyteus-web/tests/e2e/task-agent-monitor-visibility-probe.mjs` and `autobyteus-web/tests/e2e/fixtures/task-agent-monitor-visibility.page.vue`.
  - Updated `autobyteus-web/tests/e2e/background-agent-renderer-contention-probe.mjs` and its fixture to current exact-run/view authority.
  - Updated `autobyteus-web/package.json` and `autobyteus-web/README.md` for a named, documented probe command.
  - Removed no durable scenarios.
- Scenarios added, changed, or rechecked: API-E2E-TMV-001/002 added and passed; BG-BROWSER-000/001A/001B/001C/002/003/004/005A/005B/006A/006B/007 updated/rechecked and passed; API-E2E-LIVE-001 added as ticket-scoped live evidence and passed; 27-file focused and broad frontend suites rechecked.
- Commands/environment/broader-validation delta: production SDK contract build, focused 258-test run, two self-starting Chrome probes, full Nuxt suite, production build, source guards, and read-only owned-Nuxt/Chrome validation against healthy node 8001.

#### Prior Failure Resolution

None. This is the first completed API/E2E result. Pre-final harness dry-run assumptions were corrected before the authoritative round and did not establish a prior product result.

- Canonical artifacts updated:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agent-monitor-visibility/tickets/done/task-agent-monitor-visibility/api-e2e-coverage-investigation.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agent-monitor-visibility/tickets/done/task-agent-monitor-visibility/api-e2e-execution-coverage-report.md`
  - this revision record
- Prior result and confidence: `N/A`.
- Current result and confidence: `Pass / 97.6%`.
- New or remaining failure IDs: none. Unrelated pre-existing typography audit and known typecheck package-export tooling block remain explicitly nonblocking.
- Recommended recipient: `/code_reviewer` for proportional review of changed durable coverage.
- Remaining risks or untested scope: no fresh live stochastic formal settlement and no Electron-shell launch; both are nonmaterial because deterministic production client lifecycle execution and live exact persisted-data validation passed, and no shell boundary changed.

### API-REV-002 — Durable exact-request enforcement and diagnostic cleanup

- Triggering role, report path, and round: `/code_reviewer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agent-monitor-visibility/tickets/done/task-agent-monitor-visibility/api-e2e-test-review-report.md`; API/E2E round 2 after CRR-003 Fail / Local Fix.
- Triggering findings: `CR-TF-001`, `CR-TF-002`.
- Related revisions: API-REV-001 and CRR-003; CRR-002 implementation-source Pass remains authoritative.
- Why recorded: the initial execution remained Pass, but proportional review found one tautological negative request assertion and one dead non-authoritative fixture counter. This round records their bounded coverage-owned resolution and the affected rerun.
- Coverage decisions or durable paths changed:
  - Updated `autobyteus-web/tests/e2e/task-agent-monitor-visibility-probe.mjs` to assert against the complete request log after selection and the exact complete `task, task, teacher` root/run sequence after settlement.
  - Updated `autobyteus-web/tests/e2e/fixtures/task-agent-monitor-visibility.page.vue` to remove `projectionQueryCount`, `recordProjectionQuery`, the unused `ref`/`computed` imports, and every rendered/control/state exposure.
  - No scenario or path was removed.
- Scenarios rechecked: API-E2E-TMV-001 and API-E2E-TMV-002 both passed; the authoritative evidence records exactly two task requests followed by one Teacher request and no configured Student request.
- Commands/environment/broader-validation delta: reran only the affected self-starting task-monitor Chrome probe and targeted syntax/dead-symbol/exact-sequence/cleanup/diff guards. No additional live/browser environment was needed because API-REV-001's broader evidence is unaffected.

#### Prior Failure Resolution

| Prior Scenario / Failure Reference | Previous Classification | Current Resolution | Evidence |
| --- | --- | --- | --- |
| CR-TF-001 / API-E2E-TMV-001 | Local Fix / API/E2E durable assertion | Corrected. Configured Student exclusion now reads the complete request log; first selection enforces one total exact task/root request; final lifecycle enforces the exact full request sequence. | Updated `task-agent-monitor-visibility-probe.mjs`; `api-e2e-evidence/task-agent-monitor-visibility/evidence.json`; `api-e2e-evidence/api-rev-002-test-fix-guards.log`. |
| CR-TF-002 / task-monitor fixture diagnostics | Local Fix / API/E2E fixture cleanup | Corrected. Removed the dead counter/control/state/rendering and unused reactive imports; the Node-side captured request log is the sole authority. | Updated fixture; targeted absence guard in `api-rev-002-test-fix-guards.log`; rerun evidence state contains no query-count field. |

- Canonical artifacts updated: coverage investigation, execution coverage report, API/E2E revision record, and task-monitor evidence directory.
- Prior result and confidence: `Pass / 97.6%`.
- Current result and confidence: `Pass / 97.6%` (unchanged; product evidence remained valid and the focused rerun passed).
- New or remaining API/E2E failure IDs: none; CR-TF-001/002 await proportional reviewer confirmation only.
- Recommended recipient: `/code_reviewer` for proportional re-review.
- Remaining risks or untested scope: unchanged nonmaterial shell/live-stochastic limits and the recorded unrelated typecheck/typography baselines.

### API-REV-003 — Durability-gated task-Agent egress and real early-selected AC-017 proof

- Triggering role, report path, and round: `/code_reviewer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agent-monitor-visibility/tickets/done/task-agent-monitor-visibility/code-review-report.md`; API/E2E round 3 after CRR-005 Pass.
- Triggering finding or scenario IDs: `DR-003`/`USER-VERIFY-001` historical live early-selection failure; mandatory R-013/AC-017 root-socket ordering, current browser convergence, exact identity isolation, and pre-durability failure proof.
- Related revisions: `SR-006`, `ARCH-REV-006`, `IR-003`, `CRR-005`, `DR-003`; API-REV-001/002 remain historical but no longer establish delivery readiness for AC-017.
- Why recorded: IR-003 changed the backend task-Agent event-egress lifecycle after the previous API/E2E result. A new independent current-source real-system result was required rather than carrying forward 97.6%.
- Coverage decisions or durable paths changed: no repository-resident durable coverage changed. The owner gate/invariant tests and task-monitor browser probe remain valid. A proposed assertion edit to `mixed-task-delegation.e2e.test.ts` was reverted after the unchanged stochastic notification assertion and cleanup hooks failed; that suite remains `Needs Update, deferred`.
- Scenarios added, changed, or rechecked: API-E2E-GATE-001/002 added to the execution map and passed; API-E2E-TMV-001/002 rechecked and passed; API-E2E-AC017-001/002/003 added as ticket-scoped actual socket/Codex-Luna/browser proof and passed for two distinct same-address task runs plus the configured run; production build/type guards passed.
- Commands/environment/broader-validation delta: built and ran current server commit `fe9f1a286` with an explicit isolated SQLite URL, public GraphQL seed, actual root Team WebSocket, authenticated `codex_app_server`/`gpt-5.6-luna`, current Nuxt, and actual Chrome. Captured raw socket/browser/projection evidence and removed every owned process/data resource.

#### Prior Failure Resolution

| Prior scenario / failure reference | Previous classification | Current resolution | Evidence |
| --- | --- | --- | --- |
| DR-003 / USER-VERIFY-001 / AC-017 early-selected task stayed at assignment snapshot | Product failure under the pre-IR-003 server | Resolved. Two freshly delegated exact task runs were selected at 1 conversation/1 Activity/Running, then advanced without reload/refocus to 2 grouped messages/4 Activity/Idle and matched exact projections/root snapshot. | `api-e2e-evidence/api-rev-003/ac017-isolated/authoritative-summary.json`; raw gzip; task screenshots. |
| Missing task-Agent frames on the actual root Team socket | Product failure mechanism identified by SR-006 | Resolved. Activation preceded every exact task-Agent frame for both runs; 82 and 78 exact frames included status/turn/content/tool classes; 164 and 307 observed root sequences were strictly increasing and unique. | Same authoritative summary and `evidence.raw.json.gz`. |
| Same-address configured/task and repeated-task alias risk | Critical unproven identity scenario | Resolved. Task one, configured `/student_two`, and task two selected as three exact runs with isolated DOM rows, counts, markers and projections; 8/8 focused assertions passed. | `ac017-isolated/isolation-evidence.json`; `isolation-final.png`. |
| Failed pre-durability activation/no-work requirement | Critical unproven negative path | Resolved through direct owner unit rerun: preparation failure/abort/disposal publish no task events and start no assignment work; FIFO/reentrant/idempotent paths also pass. | `api-e2e-evidence/api-rev-003/owner-unit.log` (2 files/12 tests). |

- Canonical artifacts updated: coverage investigation, execution coverage report, this API/E2E revision record, and `api-e2e-evidence/api-rev-003/`.
- Prior result and confidence: `Pass / 97.6%`, explicitly superseded for AC-017 by DR-003.
- Current result and confidence: `Pass / 97.9%`.
- New or remaining failure IDs: none for the implementation. `API-E2E-MIXED-BASELINE-001` records nonblocking coverage debt in the existing stochastic notification/cleanup scenario; no IR-003 product failure is attributed.
- Recommended recipient: `/code_reviewer`; proportional test-code review should be `Not Applicable` because no repository-resident durable test changed.
- Remaining risks or untested scope: existing mixed-runtime live-suite notification/cleanup determinism should be repaired before it hosts durable AC-017 socket assertions; Electron-shell execution was intentionally omitted because no shell boundary changed. Neither risk leaves a critical acceptance criterion unproven.
