# API/E2E Execution Coverage Report

`T` = `/Users/normy/autobyteus_org/autobyteus-worktrees/interrupt-resend-retired-cleanup-stuck/tickets/in-progress/interrupt-resend-retired-cleanup-stuck`

## Execution Round Meta

- Requirements Doc: `T/requirements-doc.md` (SR-001, approved, DEC-001 = A)
- Investigation Notes: `T/investigation-notes.md`
- Solution Revision Record: `T/solution-revision-record.md`
- Design Spec: `T/design-spec.md` (SR-002)
- Supplemental Task Artifacts: `T/evidence/` (upstream) and `T/evidence/api-e2e/` (this round)
- Design Review Report: `T/design-review-report.md`
- Architecture Review Revision Record: `T/architecture-review-revision-record.md` (ARCH-REV-001)
- Implementation Handoff: `T/implementation-handoff.md` (IR-001)
- Implementation Revision Record: `T/implementation-revision-record.md`
- Code Review Report: `T/code-review-report.md` (CRR-001, Pass)
- Code Review Revision Record: `T/code-review-revision-record.md`
- Delivery Revision Record: N/A
- Relevant Delivery Revision IDs: N/A
- Coverage Investigation: `T/api-e2e-coverage-investigation.md`
- API/E2E Test-Case Ledger: `T/api-e2e-test-case-ledger.md`
- API/E2E Revision Record: `T/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- Current Execution Round: 1
- Trigger: Code review pass CRR-001
- Prior Round Reviewed: None
- Latest Authoritative Round: 1

## Routing Classification

- Task size: `Medium`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review`
- Proportional test-code review decision: `Required`

## Investigation And Execution Basis

- Coverage investigation artifact: `T/api-e2e-coverage-investigation.md`
- Investigation completed before durable coverage changes or final execution: `Yes`
- Investigation plan followed: `Yes`, with two additions during execution:
  - L-05: a full-file run of the live AGY recovery suite as a real-runtime regression of the member and crash paths.
  - D-01: an isolated desktop journey, to close the user-surface gap after the live API runs.
- Existing coverage decisions revised during execution: LIVE-ORG-R7 moved from `Still Valid` to `Needs Update`. Its Stop-ack read races the AGY ack ordering (a test-only fix, applied).
- Reroute required: `No`

## Test-Case Ledger Reconciliation

- Ledger path: `T/api-e2e-test-case-ledger.md`
- Ledger initialized before execution: `Yes`
- Every completed case recorded immediately: `Yes`
- Long-running checkpoints: `N/A` (each case was recorded on completion)
- Ledger reconciled into this report: `Yes`
- Last durably recorded event: 14 (D-01)
- Cases still running, interrupted, or not started: none

| Case ID | Final Result | Last Event | Evidence | Reconciled Result / Follow-Up |
| --- | --- | --- | --- | --- |
| R-01 | Pass | 1 | `evidence/api-e2e/R-01-focused-units.log` | 88 passed |
| R-02 | Pass | 2 | `evidence/api-e2e/R-02-fake-agy-e2e-initial.log` | 2/2 |
| R-03 | Pass | 3 | ledger | No stale "retired cleanup" assertion |
| E2E-TEAM-INT | Pass | 4 | `evidence/api-e2e/E2E-TEAM-INT-first.log` | New durable case |
| R-04 | Pass | 5 | `evidence/api-e2e/R-04-fake-agy-repeat-{1,2,3}.log` | 49 passed, 1 skipped, ×3 |
| L-01 LIVE-STANDALONE-INT | Pass | 6, 13 | `evidence/api-e2e/live-agy/live-standalone-int.json`, `live-agy-full-rerun/` | Passed twice (isolated and full-file) |
| L-02 LIVE-TEAM-INT | Pass | 7, 13 | `evidence/api-e2e/live-agy/live-team-int.json` | Passed twice |
| L-03 LIVE-ORG-R7 | Pass | 7, 13 | `live-agy/live-org-r7.json`, `live-agy-full-rerun/live-org-r7.json` | One test-race failure (event 12), fixed in the test; then passed |
| L-04 LIVE-CODEX-EXIT | Pass | 8, 9 | `evidence/api-e2e/live-codex/`, `live-codex-base/` | Fails on base source and passes with the fix |
| R-05 | Pass (no regression) | 10 | `evidence/api-e2e/R-05-broader-suites.log` | 23 base failures, all in the base inventory |
| R-06 | Pass | 11 | `evidence/api-e2e/R-06-tsc.log` | — |
| L-05 | Pass | 13 | `evidence/api-e2e/L-05-live-agy-recovery-full-file-rerun.log` | 7/7 |
| D-01 | Pass | 14 | `evidence/api-e2e/d01-*` | — |

## Compatibility / Legacy Scope Check

- Upstream introduces or tolerates backward compatibility: `No`
- Compatibility-only or legacy-retention behavior observed: `No`. The old refusal text and code are gone (R-03), and there is no alias.
- Approved persisted-data transition followed: `Yes` (`Not Affected`; restore reads existing metadata unchanged)
- Durable coverage for compatibility-only behavior: `No`

## Changed Boundary And Evidence Matrix

| Case ID | Behavior / Req / AC | Changed Boundary | Execution Surface | Evidence Type | Result | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| R-01 | BEH-002..006; AC-003, AC-004, AC-005, AC-006, AC-008; QR-001 | Registry, manager, lifecycle, handle | Unit (real manager and registry) | Durable | Pass | R-01 log |
| R-02 / R-04 | AC-001, AC-002, AC-005 | WS SEND_MESSAGE → lifecycle → release → restore | Studio server + WS + fake AGY | Durable | Pass | R-02, R-04 logs |
| E2E-TEAM-INT | AC-006, DS-003 | Configured member readiness after AGY interrupt | Team WS + fake AGY | Durable | Pass | E2E-TEAM-INT log |
| L-01 | AC-001, AC-002, AC-005, ASM-001 | Real AGY stop → release → `--conversation` restore | Studio server + WS + real `agy` 1.3.1 | Durable (gated) + Live | Pass | `live-standalone-int.json` |
| L-02 | AC-006 (immediate) | Member readiness with real AGY | Team WS + real `agy` | Durable (gated) + Live | Pass | `live-team-int.json` |
| L-03 | AC-006 (later send; Org root agent and Team member) | Configured members after Stop | Org WS + real `agy` | Durable (gated) + Live | Pass | `live-org-r7.json` |
| L-04 | AC-003, SCN-003 | Non-AGY runtime exit → release → thread restore | Studio server + WS + real `codex app-server` | Durable (gated) + Live | Pass (and Fail on base) | `live-codex*/` |
| L-05 | REQ-006 regression; shutdown and crash recovery | Member crash recovery, terminate/restore, shutdown | real `agy` | Durable (gated) + Live | Pass | L-05 rerun log |
| D-01 | AC-001 desktop intent; SCN-001; BEH-006 (no error card) | Full product: renderer → embedded server → real `agy` | Isolated packaged desktop app (worktree build) | Desktop | Pass | `d01-*` |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository | Final | Change | New / Final Supporting Evidence | Residual Uncertainty |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 85% | 97% | +12 | AC-001, AC-002 and AC-005 on real AGY (sends landed while the old process was alive), plus the desktop journey. ASM-001 is proven by code recall after an interrupt-stop. AC-003 on real Codex discriminates base from fix. AC-006 on a live Team member (immediate) and an Org root agent and member (later). | AC-004 and AC-008 (release failure or timeout) are proven at the unit/coordinator boundary only. AC-007 is user verification, owned by Delivery. |
| Changed-boundary execution directness | 90% | 97% | +7 | Real WS → lifecycle → manager → registry → real CLI process lifecycle | — |
| Cross-boundary integration realism and mock gap | 75% | 95% | +20 | Real `agy` 1.3.1, `codex-cli` 0.161.0, packaged desktop | The release-failure path cannot be produced with a real runtime (SIGKILL escalation always ends the process). |
| Environment, configuration, identity, and fixture fidelity | 80% | 95% | +15 | Isolated worktree build with its own data root; real CLI logins; temp app data for the server suites | Real user data: AC-007 (Delivery) |
| Failure, edge-case, lifecycle, and recovery evidence | 88% | 92% | +4 | Real crash (Codex SIGKILL) and real stop. Two consecutive interrupt/resend cycles on one run. Double send in the stopping window. Full crash, terminate and shutdown regression file. | Release failure and the 30 s timeout are unit-only (fake timers, real error classes). |
| User-surface, browser, and desktop-shell confidence | 85% | 96% | +11 | D-01: the reply was rendered after Stop+Send at 93 ms. Status ended Idle with no error card. | The failure text (REQ-005) was never rendered, because it cannot be produced live; the web shows `ack.message` verbatim (unchanged code). |
| Durable regression coverage quality and relevance | 92% | 96% | +4 | New durable fake E2E (Team) and gated live cases (standalone, Team, Codex) that are requirement-linked. The Codex case fails on base. | Live cases need opt-in gates and quota, so they do not run in CI. |

- Overall post-repository confidence: 85%
- Overall final confidence: 95.4%
- Calculation method: simple average of seven categories, with no category below 92%.
- Confidence change produced by broader validation: +10.4 points (ASM-001, real-runtime timing, AC-003 live, desktop journey)
- Every critical acceptance criterion directly proven: `Yes` (AC-001, AC-002, AC-003, AC-005 and AC-006 are direct. AC-004 and AC-008 are proven at their contract boundary. AC-007 is Delivery/user-owned by requirement.)
- Any final applicable category below `90%`: `No`
- Default final confidence target of `95%` met: `Yes`
- Confidence-limiting residual risks: the release-failure and timeout user text are unit-proven only (cosmetic CAND-003 wording is approved).

## Broader Validation Decision And Execution

- Decision: `Required` → executed. Modes: Live API (real `agy`, real `codex`), Lifecycle (process timelines), Project Desktop Validation (D-01).
- Material deviation: D-01 was added after the live API runs, to close the user-surface category (AC-001's verification intent includes desktop verification).
- Startup and readiness:
  - Live suites start the in-process Studio server with a temp app data dir.
  - D-01: `pnpm --silent isolated-app start --build` → instance `iso-50614-5374`, backend `127.0.0.1:50615`, control `50614`. The bundled `server/dist/agent-execution/errors.js` contains the new message, which proves the build is source-current.
- Environment: `RUN_AGY_RECOVERY_E2E=1` with `ANTIGRAVITY_CLI_COMMAND` unset, and `RUN_CODEX_E2E=1`, for the live runs. `RUN_AGY_FAILURE_E2E=1` with `ANTIGRAVITY_CLI_COMMAND=<abs>/tests/fixtures/agy-failure-cli.mjs` for the fake runs.
- Fixtures: test-created agent, team and org definitions. For D-01, one agent definition was seeded through the isolated backend's GraphQL; the run was created through the UI (Agents → Run → model picker → Send).

| Scenario / Journey Step | Expected | Actual | Evidence | Result |
| --- | --- | --- | --- | --- |
| L-01: Stop mid-turn, then two sends at once | Both accepted; recall of the code; one agy; same conversation | The old pid was alive at send. `CODE-S-2e15ac19` and `SECOND-OK` were returned. One agy with `--conversation 37831744…`, which stayed the same after a second Stop and the later send (`LATER-OK`). Final status `idle`. | `live-agy/live-standalone-int.json` | Pass |
| L-02: Team member Stop, then work at once | Accepted; recall; one agy | Old pid alive at send; `CODE-TI-3915abb9`; one agy with `--conversation` | `live-agy/live-team-int.json` | Pass |
| L-04: Codex app-server SIGKILL, then send | Accepted; same thread (recall) | After the crash: ERROR and status `error`. After the send: accepted, new app-server pid, `CODE-C-5800f1e0`, `idle`. On base: `ACTIVATION_FAILED` "still owns retired cleanup". | `live-codex/`, `live-codex-base/` | Pass |
| D-01: desktop Stop, then Send after 93 ms | Reply rendered; no error card; not Error | Reply `CODE-D-7f3a91` rendered. Trail Offline → Running → Idle. The old pid exited about 226 ms after send; the replacement started with `--conversation 8b721126…` about 1.9 s after send. Exactly one agy. | `d01-after-stop-and-send.png`, `d01-stop-then-send.mp4`, `d01-agy-process-timeline.txt` | Pass |

## Desktop Application Validation

- Approach: an isolated desktop instance of this worktree's packaged build, driven with browser-automation in attach-only mode (TESTING.md "Isolated desktop instances").
- Web-equivalent behavior: chat rendering and status chip. Proven by DOM text assertions; the screenshot and recording are supporting evidence.
- Shell-specific behavior: none changed. The embedded server and real CLI were exercised.
- Effect on the already-running user app (`/Applications/AutoByteus.app`): None. Separate ports and data root, and process filters scoped to owned PIDs and run hashes.
- Not directly proven: AC-007 (the user's existing stuck run after install) is Delivery/user verification.

## Platform / Runtime Targets

- macOS (Darwin 25.5.0, arm64); Node 22 via pnpm 10; Vitest
- `agy` 1.3.1 (models gemini-3.8-flash-high and, in the fake suites, gemini-3.8-flash-low); `codex-cli` 0.161.0 (gpt-5.6-luna)
- Desktop: AutoByteus 1.4.99-beta.1 worktree build (Electron, mac-arm64)

## Lifecycle / Upgrade / Restart / Persisted-Data Checks

- Approved decision: `Not Affected`
- Representative existing data: each restore read the run's existing metadata and provider binding (AGY `--conversation`, Codex thread). Context continuity is proven by recall.
- Version-specific runtime branch or compatibility fallback: `No`
- Residual: app-restart recovery of an already-stuck run (AC-007) is Delivery/user.

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage changed this round: `Yes` (uncommitted working-tree changes in the assigned worktree)

| Path / Test | Change | Requirement / Boundary | Execution Result |
| --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/runtime/agy-interrupt-resend-transport.e2e.test.ts` — "restarts a Team member interrupted on AGY when it immediately receives new work (AC-006)" | Updated (case added; helper import) | AC-006, DS-003 at the Team WS | Pass, ×4 |
| `autobyteus-server-ts/tests/e2e/runtime/agy-runtime-stop-recovery-live.e2e.test.ts` — LIVE-STANDALONE-INT, LIVE-TEAM-INT | Updated (2 cases added, header) | AC-001, AC-002, AC-005, AC-006, ASM-001 on real AGY | Pass, ×2 each |
| same file — `stopMidTurn` waits for the Stop ack | Updated (baseline test fix) | LIVE-ORG-R7 race (ack follows TURN_INTERRUPTED for AGY) | Pass after fix (full file 7/7) |
| `autobyteus-server-ts/tests/e2e/runtime/codex-runtime-exit-resend.e2e.test.ts` | Added (gated `RUN_CODEX_E2E=1`) | AC-003 on real Codex | Pass; fails on base source |

- Added or updated paths attached for proportional test-code review: `Yes`
- Removed paths: none

## Other Execution Artifacts

| Artifact Path | Type / Purpose | Retained Or Temporary | Notes |
| --- | --- | --- | --- |
| `T/evidence/api-e2e/*.log` | Command outputs | Retained | — |
| `T/evidence/api-e2e/live-agy*/`, `live-codex*/` | Per-case JSON receipts | Retained | Contain run IDs, PIDs, acks and statuses; no secrets |
| `T/evidence/api-e2e/d01-*`, `D-01-*.json` | Desktop screenshots, MP4, process timeline, start/stop receipts | Retained | — |

## Temporary Execution Methods / Scaffolding

| Path / Method | Why Needed | Result / Evidence | Cleanup Result |
| --- | --- | --- | --- |
| Base-source control (the 5 production files checked out at `ace86bf1f` for one L-04 run) | Prove the new Codex test detects the bug | Fails on base | Restored with `git checkout HEAD --`; `git diff HEAD -- autobyteus-server-ts/src` is empty |
| D-01 process-timeline poller (ps every ~100 ms, scoped to the run's `--agent` hash) | Prove the send landed inside the stopping window and the replacement started after exit | `d01-agy-process-timeline.txt` | Process ended |

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| AGY CLI (fake suites only) | `tests/fixtures/agy-failure-cli.mjs` `interrupt_resend` | Deterministic CI coverage | Offset by L-01, L-02, L-05 and D-01 on the real CLI |
| Release failure and timeout | Unit doubles and fake timers | A real runtime always stops (SIGKILL escalation) | AC-004 and QR-001 are not exercised live |

## Result Summary

| Result | Case IDs | Summary / Reason |
| --- | --- | --- |
| Pass | R-01..R-06, E2E-TEAM-INT, L-01..L-05, D-01 | All approved in-scope behavior is proven. |
| Out Of Scope | AC-007 | User desktop verification of the existing stuck run (Delivery). |

## Cleanup Performed

| Resource / Process / Data | Ownership | Cleanup Action | Result |
| --- | --- | --- | --- |
| In-process servers, temp app data, definitions, runs | Test-owned | Suite `afterAll` (terminate, delete, `app.close`, `rm`) | Done; no leftover `agy` processes or owned `codex app-server` processes (checked with ps) |
| Isolated instance `iso-50614-5374` | Mine | `pnpm --silent isolated-app stop iso-50614-5374` | `dataRootRemoved: true`; both ports released; `forced: true` (graceful close exceeded the tool's wait) |
| Worktree source | — | Restored after the base-source control | Clean |
| Other recorded isolated instances (`iso-63369-6c20`, `iso-54394-19b5`, not running) | Not mine | Untouched | — |
| Untracked `autobyteus-web/electron-dist/` and SDK `dist/` | Build output | Left in place (untracked, never staged) | — |

## Observations (non-blocking)

- Transient status: each restart shows `offline` → `initializing` before `running` and `idle`. In the server-level streams `offline` and `initializing` can appear twice. The final status is never `error` (design-noted cosmetic risk).
- After a Codex app-server crash, the run shows `error` until the next send restores it. This is the expected crash surface and is cleared by the successful send.
- The isolated stop needed `forced: true`. This was not investigated as part of this ticket. LIVE-SHUTDOWN-A2 (graceful server shutdown with an idle standalone AGY run) passes.
- P-001 (a send processed before AGY marks the run inactive) was not observed in any live or desktop run.
- Baseline (TESTING.md rule 9): 23 failing `tests/integration/agent-team-execution` tests fail on base `ace86bf1f` because their test doubles are stale (for example `input.factory.beginMaterialization is not a function`). They belong to the 213-test base inventory and are reported as a separate item for the team-execution test owner. Not caused by this change.
- Docs-sync hint for Delivery: TESTING.md could list the new gated `codex-runtime-exit-resend.e2e.test.ts` and the new LIVE-STANDALONE-INT / LIVE-TEAM-INT cases in the AGY live recovery file.

## Latest Authoritative Result

- Result: `Pass`
- Final validation confidence: 95.4%
- Default `95%` confidence target met: `Yes`
- Any final applicable confidence category below `90%`: `No`
- Broader validation decision: `Required` — executed (Live API, Lifecycle, isolated desktop)
- Critical acceptance criteria lacking direct proof: None in API/E2E scope (AC-007 is Delivery/user by requirement)
- Next recipient: from `get_handoff_rules` (proportional test-code review requested)
