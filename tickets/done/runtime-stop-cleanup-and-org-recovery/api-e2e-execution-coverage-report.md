# API/E2E Execution Coverage Report

## Execution Round Meta

All ticket paths below are under `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-stop-cleanup-and-org-recovery/tickets/in-progress/runtime-stop-cleanup-and-org-recovery/`.

- Requirements Doc: `requirements-doc.md` (SR-004: SR-001 + AC-B1 alternate clarification, user-approved 2026-09-29)
- Investigation Notes: `investigation-notes.md`
- Solution Revision Record: `solution-revision-record.md` (SR-001..SR-004)
- Design Spec: `design-spec.md` (SR-003 design + SR-004 note)
- Supplemental Task Artifacts: `probes/*`, `predecessor-delivery-receipt-verification.md`, `handoff-architecture-design-complete.md`
- Design Review Report: `design-review-report.md` (ARCH-REV-003 Pass, N-4)
- Architecture Review Revision Record: `architecture-review-revision-record.md`
- Implementation Handoff: `implementation-handoff.md` (IR-002, no code change)
- Implementation Revision Record: `implementation-revision-record.md`
- Code Review Report: `code-review-report.md` (CRR-003 Pass)
- Code Review Revision Record: `code-review-revision-record.md` (CRR-001..CRR-003)
- Delivery Revision Record: `N/A`
- Coverage Investigation: `api-e2e-coverage-investigation.md`
- API/E2E Test-Case Ledger: `api-e2e-test-case-ledger.md`
- API/E2E Revision Record: `api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-002`
- Current Execution Round: 2
- Trigger: CRR-003 Pass after SR-004 (ARCH-REV-003 N-4). Commit `299875113` is unchanged; verified with no src, unit or architecture diff.
- Prior Round Reviewed: round 1 (API-REV-001, Fail on F-API-B1-ALT)
- Latest Authoritative Round: 2

## Routing Classification

- Task size: `Medium`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review`
- Proportional test-code review decision: `Required`

## Investigation And Execution Basis

- Investigation completed before durable coverage changes and execution: `Yes`
- Plan followed: `Yes`. Round 1 deviations (fixture fix in LIVE-BG-001; Team restore-while-stopping checked via a live race) are recorded in the investigation.
- Round 2:
  - The second-Terminate assertions were aligned to SR-004 (N-4).
  - The whole recovery file was rerun.
  - A temporary Linux helper probe was added for REQ-A1's Linux clause.
- Reroute required: `No`

## Test-Case Ledger Reconciliation

- Ledger initialized before execution: `Yes`
- Every completed case recorded immediately: `Yes`
- Last durably recorded event: 16
- Cases not started or interrupted: none

| Case ID | Final Result | Last Event | Evidence |
| --- | --- | --- | --- |
| UNIT-001 | Pass (451 passed; 12 pre-existing failures identical at base) | 1 | console |
| E2E-REG-001 | Pass (8/8) | 2 | console |
| TSC-001 | Pass (rechecked after the round-2 edits) | 5 | console |
| LIVE-BG-001 | Pass | 12 | `evidence/live-bg-001-scn-001.json`, `live-bg-rerun.log` |
| LIVE-BG-003 | Pass | 4 | `evidence/live-bg-003-stop.json` |
| LIVE-ORG-B1 | Pass (round 2) | 15 | `evidence/live-org-b1.json`; round 1 in `round1-live-org-b1.json`, `attempt1-live-org-b1.json` |
| LIVE-ORG-B3 + LIVE-ORG-A2 | Pass (rounds 1 and 2) | 15 | `evidence/live-org-b3-a2.json` |
| LIVE-ORG-R7 | Pass (round 2) | 15 | `evidence/live-org-r7.json` |
| LIVE-TEAM-D4 | Pass (round 2) | 15 | `evidence/live-team-d4.json` |
| LIVE-SHUTDOWN-A2 | Pass (rounds 1 and 2) | 15 | `evidence/live-shutdown-a2.json` |
| LIVE-REG-B4 | Pass (2/2) | 14 | `evidence/live-reg-b4.log` |
| PROBE-LINUX-A1 | Pass (temporary) | 16 | ledger 16 |

## Compatibility / Legacy Scope Check

- Backward compatibility in scope: `No`
- Compatibility or legacy behavior observed: `No`
- Persisted-data decision (`No Migration Required`) followed: `Yes`. Restore reuses the persisted `platformAgentRunId` (`--conversation <id>`).
- Durable coverage for compatibility-only behavior: `No`

## Changed Boundary And Evidence Matrix

| Scenario ID | Req / AC | Boundary | Evidence Type | Result | Key Evidence |
| --- | --- | --- | --- | --- | --- |
| LIVE-BG-003 | AC-A1 | User Stop mid-turn → `AgyStreamProcess.stop()` → group SIGTERM | Durable (opt-in) + Live | Pass | Daemon in its own group (pgid = pid, parent = AGY), backgrounded more than 10 s before Stop; closed at the first check |
| LIVE-BG-001 | AC-A2 (run Terminate), AC-A3 | Idle run Terminate; turn end keeps the daemon | Durable + Live | Pass | Closed 1 ms after Terminate returned; 130 s quiet window with 0 events |
| LIVE-ORG-A2 | AC-A2 (Org), AC-A3 | Org Terminate → member stop | Durable + Live | Pass | Daemon alive after its turn end; closed 1 ms after Org Terminate |
| LIVE-TEAM-D4 | AC-A2 (Team) | Team Terminate → live member stop | Durable + Live | Pass | Closed 1 ms after |
| LIVE-SHUTDOWN-A2 | AC-A2 (graceful shutdown) | `app.close()` → supervisor `close()` → `stopAll*` (same path as SIGTERM/SIGINT) | Durable + Live | Pass | Standalone-run and Org-member daemons closed within 1 ms of close returning; AGY gone |
| PROBE-LINUX-A1 | REQ-A1 (Linux), QR-001, QR-002 | Real helper on Linux (Debian bookworm, Node 22) | Temporary | Pass | Selected only the AGY-led group; group and child stopped; unrelated detached process survived; `ps` 3 ms |
| LIVE-ORG-B1 | AC-B1, REQ-B4, AC-B2, ASM-001 | Crashed Org root member (`kill -9`) → Terminate → second Terminate → restore → resume | Durable + Live | Pass | Terminate `success:true`; config/inspection `false`/`false`. Second Terminate `{success:false,"Agent organization run not found."}` with the state unchanged (SR-004). Restore success; `agy --conversation 84317aac-…`; code recalled |
| LIVE-ORG-B3 | AC-B3 | Crashed Team member in an active Org → message | Durable + Live | Pass | ACK accepted; `--conversation`; code recalled; director pid unchanged and alive |
| LIVE-ORG-R7 | R-7, AC-B1..B3 | Stop-caused death: root agent → message; Team member → Org Terminate → restore → resume | Durable + Live | Pass | Both Stops interrupted with AGY gone; both members recalled their codes; SR-004 second-Terminate behavior |
| LIVE-TEAM-D4 | DEC-004, REQ-B1/B2/B4 | Standalone Team crash → Terminate → second Terminate → restore → resume; Terminate + restore race | Durable + Live | Pass | `{success:false,"Agent team run not found."}`, Team inactive (SR-004). Restore; code recalled. Race: both success, no "already managed", active after |
| LIVE-REG-B4 | AC-B4 | Healthy Team relay / Org members / terminate / restore | Durable (existing) | Pass | 2/2 |
| UNIT-001, E2E-REG-001 | QR-001, all | Unit / fake transport | Durable | Pass | — |

## Validation Confidence Scorecard

| Category | Post-Repo | Round 1 | Final | Final Evidence | Residual |
| --- | --- | --- | --- | --- | --- |
| Requirement and AC proof | 70% | 85% | 97% | Every AC, R-7, DEC-004 and ASM-001 proven live; AC-B1 per SR-004 | Non-live-reproducible edges (stream-failure stop with daemons) unit-only |
| Changed-boundary directness | 70% | 97% | 97% | All changed paths exercised with real processes | — |
| Integration realism / mock gap | 60% | 96% | 96% | No mocks on live paths | In-process server (same code as the packaged app) |
| Environment / fixture fidelity | 65% | 93% | 95% | Real AGY on macOS; real helper on Linux | Single model; no real AGY on Linux |
| Failure / lifecycle / recovery | 70% | 90% | 95% | Crash, Stop, second Terminate, race, shutdown | AGY crash orphans (DEC-001, documented) not exercised |
| User surface | 85% | 93% | 93% | GraphQL results and WebSocket ACKs end to end | No browser (no UI change) |
| Durable regression quality | 85% | 93% | 95% | Opt-in live recovery suite + updated daemon suite; deterministic unit coverage | Live suites are opt-in |

- Overall post-repository confidence: 72%
- Overall final confidence: 95% (simple average of 97, 97, 96, 95, 95, 93, 95 = 95.4%)
- Every critical AC directly proven: `Yes`
- Any final category below 90%: `No`
- 95% target met: `Yes`
- Confidence-limiting residual risks: single live model; Linux proven at the helper level only; opt-in live suites

## Broader Validation Decision And Execution

- Decision: `Required`, executed (Live API + Lifecycle with real AGY; plus a Linux container probe)
- Startup: in-process studio server with temp app data; GraphQL; WebSockets `/ws/agent-org`, `/ws/agent-team`, `/ws/agent`
- Environment: `RUN_AGY_RECOVERY_E2E=1`, `RUN_AGY_BACKGROUND_E2E=1`, `RUN_AGY_E2E=1`; model `gemini-3.8-flash-high`; evidence in `evidence/`
- The user's app (port 29695) and its L1/L2 Orgs were not touched

## Platform / Runtime Targets

- macOS 26.5.2, Node 22, AGY CLI 1.2.12
- Linux (Debian bookworm container, kernel 6.12 linuxkit), Node 22.22.3 — helper level only

## Lifecycle / Persisted-Data Checks

- `No Migration Required` followed; restore used the persisted bindings, and member conversations continued.
- No version-specific branches.

## Tests Implemented Or Updated

| Path | Change | Requirement / Boundary | Result |
| --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/runtime/agy-runtime-stop-recovery-live.e2e.test.ts` | Added | AC-A2 (Org / Team / shutdown), AC-B1 (SR-004)..B4, R-7, DEC-004, ASM-001 | Pass 5/5 (gate `RUN_AGY_RECOVERY_E2E=1`, about 3.5 min) |
| `autobyteus-server-ts/tests/e2e/runtime/agy-background-task-live.e2e.test.ts` | Updated | AC-A1 (Stop after backgrounding), AC-A2 (run Terminate) ≤ 5 s assertions; location-independent write-step check | Pass (gate `RUN_AGY_BACKGROUND_E2E=1`) |

## Tests Removed

None.

## Durable Coverage Changed

- Added or updated: the two paths above (uncommitted in the worktree)
- Removed: none
- Attached for proportional test-code review: `Yes`

## Temporary Execution Methods

| Method | Why | Result | Cleanup |
| --- | --- | --- | --- |
| Base-code checkout of `src`/`tests` (round 1) | Prove the 12 unit failures are pre-existing | Identical failures at base | Restored; tree clean |
| PROBE-LINUX-A1 (`docker run --rm --network none node:22-bookworm`, helper mounted read-only) | REQ-A1 Linux clause; a durable Docker-based test does not fit the repository suite | Pass | Container auto-removed; `/tmp` probe deleted |

## Dependencies Mocked Or Emulated

A member crash is emulated with `kill -9` of the member's real AGY process. The Linux probe emulates AGY with a Node parent that spawns a `setsid`-detached command, which is AGY's observed pattern.

## Result Summary

| Result | Scenario IDs | Summary |
| --- | --- | --- |
| Pass | all (see ledger reconciliation) | Every AC proven, including AC-B1 as clarified by SR-004 |

## Cleanup Performed

| Resource | Action | Result |
| --- | --- | --- |
| Test servers, temp data, definitions, runs | `afterAll` | Done |
| Daemons and AGY processes | Stopped by the product; `afterAll` safety net | None remain (`lsof` / `ps` checked) |
| Linux probe | `--rm` container, probe dir deleted | Done |

## Preliminary Classification

N/A (Pass).

## Recommended Recipient

`/code_reviewer`, for proportional test-code review of the two durable test files.

## Evidence / Notes

F-API-B1-ALT is resolved by SR-004. The round 1 evidence already showed the clarified behavior, and round 2 asserts it and passes.

## Latest Authoritative Result

- Result: `Pass`
- Final validation confidence: 95%
- 95% target met: `Yes`
- Any final category below 90%: `No`
- Broader validation: `Required`, executed
- Critical acceptance criteria lacking direct proof: none
- Required next recipient: `/code_reviewer` (proportional test-code review)
