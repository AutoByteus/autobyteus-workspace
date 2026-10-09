# API/E2E Execution Coverage Report

## Execution Round Meta

(`...` = `/Users/normy/autobyteus_org/autobyteus-worktrees/delegate-to-existing-copy/tickets/in-progress/delegate-to-existing-copy`)

- Requirements Doc: `.../requirements-doc.md` (Approved, SR-003)
- Investigation Notes: `.../investigation-notes.md`
- Solution Revision Record: `.../solution-revision-record.md`
- Design Spec: `.../design-spec.md` (SR-006)
- Supplemental Task Artifacts: None (`N/A — not applicable`)
- Design Review Report: `.../design-review-report.md`
- Architecture Review Revision Record: `.../architecture-review-revision-record.md`
- Implementation Handoff: `.../implementation-handoff.md` (IR-002)
- Implementation Revision Record: `.../implementation-revision-record.md` (IR-001, IR-002)
- Code Review Report: `.../code-review-report.md` (CRR-003, round 3: CR-001 resolved)
- Code Review Revision Record: `.../code-review-revision-record.md`
- Delivery Revision Record: N/A
- Coverage Investigation: `.../api-e2e-coverage-investigation.md`
- API/E2E Test-Case Ledger: `.../api-e2e-test-case-ledger.md`
- API/E2E Revision Record: `.../api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-002`
- Current Execution Round: 2
- Trigger: CRR-003 pass after the F-001 fix (server commit `88e59f500`, IR-002) → API/E2E rerun
- Prior Round Reviewed: round 1 (API-REV-001, `Fail` on F-001)
- Latest Authoritative Round: 2

### Round 3 delta (authoritative, API-REV-003)

Trigger: CRR-005, a re-entry after delivery's merge of `origin/personal` @ `927796780` (merge `97b767186`) and the test-only alignment `17a5f2125` (IR-003).

- **CRR-005 proportionate pass** (`api-e2e-evidence/round-3/`), on the integrated base:
  - typecheck: pass;
  - `tests/unit/standalone-agent-run-root/standalone-agent-run-root.test.ts`: 21/21 pass;
  - `delegated-copy-member-contact-host.e2e.test.ts` (includes DCM-005; scripted AGY): pass;
  - `task-existing-copy-assignment.e2e.test.ts` with `RUN_CLAUDE_E2E=1`: 8/8 pass (race again with both outcomes; cleanup clean; 766 feed frames, 0 invalid).
- **Packaged Electron journey, real model** (added at the user's request: an isolated desktop instance is the more realistic surface):
  - `pnpm isolated-app start --build` built this worktree's app (1.4.99-beta.7, build started 10:48, after the 10:43 merge, so the integrated product). It ran as `iso-54380-fba9` with its own ports and temp data; the user's app was not touched.
  - Setup: the agents-repo worktree (`0bd84e0`, with the updated PTM skill and board template) was imported as a local package through the app's GraphQL API. A small "Docs Review Team" (reviewer coordinator plus editor) was created.
  - In the UI, Chat → Project Task Manager → Claude Agent SDK `claude-haiku-5-5`. Every step after that is a real-model tool call:
    1. **Task A.** "Create a Project … add a Task … delegate it to the Docs Review Team". The PTM created the Project and Task A and delegated it to the team. Task A's root is Team copy `docs_review_team_58ad…` (coordinator `docs_reviewer_b148…`). The tree shows the Task Team under the Manager, with the coordinator live and the editor not started.
    2. **Task A DONE.** The team reported a blocker (no README file); the user supplied the text. The team proposed a cleanup, and the PTM marked A DONE. The Task Team left the tree, and A's root went closed/offline. The PTM recorded the copy under "Done dispatches" with `target_team_run_id` (new board template).
    3. **Follow-up Task B, worded without any tool or ID hint.** "Give it to the same team copy that did the review." The PTM read its board and called `delegate_task({"target_team_run_id":"docs_review_team_58ad…","task_id":"project_task_02d1…"})`. Result: `{"delegated":true,"target_kind":"team","target_team_run_id":"docs_review_team_58ad…","target_team_coordinator_agent_run_id":"docs_reviewer_b148…"}`.
    4. **The copy continued its conversation.** The Team tab shows "Task Assignment … New Task assigned to you: project_task_02d1…" to the reviewer. The team answered "Codeword: OSPREY-7314, as stated in the earlier Task", plus the final README. The PTM marked B DONE.
    5. **Board.** Both Tasks are in DONE, each with the root "docs review team" (same copy), shown Offline.
  - Evidence (`api-e2e-evidence/electron/`): screenshots `00`–`07`; a 6.4-minute recording `journey.mp4`; `manager-conversation.json` (tool calls and results); `start.json`, `stop.json`.
  - Cleanup: `stop` → `wasRunning: true`, `forced: false`, `dataRootRemoved: true`, both ports released.
  - Not covered in Electron: an app restart around the assignment. That is covered by BR-015 with a real backend restart (web-equivalent renderer).
  - Observed and unrelated: after an API-side package import, the renderer's agent catalog needed the Agents page's Reload before the Chat picker listed the new agents.
- **Durable coverage changes this round:** none. The suite, fixture, probe and TESTING.md were committed in `75bcb39c8` after the CRR-004 test review.
- **Confidence:** user-surface/desktop moves from 93% to 97% (real packaged app and a real model end to end). Overall is now about 96%.

### Round 2 delta

- F-001 recheck first: EXC-E2E-006 passes. The start-failed copy, found through `list_project_tasks` and with its Task CANCELLED, now gets `This copy never started, so it has no conversation to resume; or delegate Task <G> to a new copy with recipient_address.` Project files are byte-identical.
- Regression around the fix: the generic refusal is unchanged for an unknown ID (EXC-E2E-001..003) and another root's copy (EXC-E2E-005). The AC-008 other-kind, coordinator and member refusals are unchanged.
- Whole server suite: 8/8 pass, including the race again (24 rounds, both outcomes, invariants held) and the new **EXC-E2E-008**. In EXC-E2E-008 a real Claude (haiku) copy in an Org root gets a follow-up Task after its Task A is DONE, and answers with Task A's codeword (`HERON-5842`). AC-002's "answers B referencing its earlier conversation" is now proven with a real model.
- Other reruns:
  - typecheck and focused unit layers (1116 tests) pass;
  - the server rebuilt;
  - `task-reactivation-root-visibility` (shares the changed lifecycle) passes 6/6;
  - browser BR-012..016 pass on the rebuilt backend.
- BR-015's first round-2 attempt failed on a probe timing assertion. It read B3's root as `start: "starting"` in the designed window between delivery and `markStarted`. The probe now waits for `started` (30 s bound); rerun 5/5 pass.
- Not rerun in round 2, because the fix touches only the not-in-tree refusal path and none of these exercise it:
  - full unit/integration baseline;
  - other existing project E2E suites;
  - BR-001..011;
  - live collaborator suites.

  Round-1 results stand for them.
- Round-2 evidence: `api-e2e-evidence/round-2/`.

## Routing Classification

- Task size: `Large`; Architectural risk: `High`; Input route: `Reviewed`
- Successful-output route: `Code Review`
- Proportional test-code review decision: `Required` (this round is `Fail`: failure-origin review requested; test-code review of the added/updated durable tests can run in the same review)

## Investigation And Execution Basis

- Coverage investigation completed before durable coverage changes and final execution: `Yes`
- Plan followed: `Yes`. Deviations:
  - The damaged-data case moved to the browser probe (BR-016), because the resource service detects damage only at load and the in-process server cannot restart.
  - The never-started and lost-conversation refusals were split into EXC-E2E-006 and EXC-E2E-007.
- Existing coverage decisions revised: none (all inventoried suites stayed `Still Valid`).
- Reroute required before execution: `No`

## Test-Case Ledger Reconciliation

- Ledger initialized before execution, every case recorded, reconciled: `Yes`

| Case ID | Final Result | Evidence | Note |
| --- | --- | --- | --- |
| REPO-001 typecheck | Pass | `api-e2e-evidence/repo-001-typecheck.log` | |
| REPO-002 focused unit | Pass (139 files, 1115 tests) | `repo-002-focused-unit.log` | |
| REPO-003 focused integration | Pass (2 files, 17 tests) | `repo-003-focused-integration.log` | |
| REPO-004 full unit | Pass (668 files, 5160 tests, 7 skipped) | `repo-004-unit.log` | |
| REPO-004 full integration | Pass with the documented known exception (338 passed; 2 failed = the two `agent-status-websocket` content-cadence cases named in TESTING.md "Known exception") | `repo-004-integration.log` | |
| EXC-E2E-001..005, 007 | Pass | `exc-e2e-final.log`, `exc-e2e-final/task-existing-copy-assignment.json` | |
| EXC-E2E-006 | Round 1 **Fail** (F-001) → round 2 **Pass** | `round-2/exc-e2e-final/task-existing-copy-assignment.json` → `neverStarted` | F-001 resolved |
| EXC-E2E-008 (round 2, new) | Pass (real Claude haiku recalled `HERON-5842`) | `round-2/exc-e2e-final/…json` → `liveClaude` | |
| Round 2 reruns | Pass: typecheck; focused unit 1116; EXC-E2E-001..008; reactivation E2E 6/6; BR-012..016 | `round-2/*.log`, `round-2/browser-existing-copy/` | BR-015 probe wait fix |
| E2E-PRJ (11 existing project suites) | Pass, with one intermittent and unrelated idle-lifetime timing case | `e2e-prj-existing.log`, `e2e-idle-lifetime-rerun*.log` | O-001 |
| E2E-AGY-FIX | Pass | `e2e-agy-native-args.log` | |
| BR-001..BR-011 | Pass | `browser-task-closure-tree/evidence.json` | |
| BR-012..BR-016 | Pass | `browser-existing-copy/evidence.json` (BR-015 first attempt failed on a probe bug, fixed) | |
| E2E-LIVE | mixed-task-delegation Pass 4/4; agent-initiated Claude 4 pass, 2 unrelated fails; standalone mention 2 unrelated fails | `e2e-live-*.log` | O-003 |

## Compatibility / Legacy Scope Check

- Upstream introduces or tolerates backward compatibility: `No`
- Compatibility or legacy behavior observed in the implementation: `No`. Observed at the wire:
  - Team results carry no `target_agent_run_id`.
  - Assignment views carry no `targetAgentRunId`.
- Approved persisted-data transition followed: `Yes` (`Directly Usable — No Migration`; persisted names unchanged on disk; multi-entry files reloaded by a restarted backend)
- Compatibility-only durable coverage: `No`

## Changed Boundary And Evidence Matrix

All server E2E rows: real Studio HTTP/WS, scoped MCP, Project/Task services, the three roots, exact delivery, publishers and the AGY runtime. Only the AGY CLI is scripted.

| Case ID | Behavior / Requirement / AC IDs | Changed Boundary | Execution Surface | Evidence Type | Result | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| EXC-E2E-001/002/003 | AC-001: exact result keys for Team and Agent copies | MCP `delegate_task` result | server E2E, 3 roots | Durable | Pass | `exc-e2e-final.log` |
| same | AC-006: busy refusal names Task A with its status (TODO, IN_PROGRESS); every Project file byte-identical; no reopened frame | Task-side eligibility via MCP | same | Durable | Pass | same |
| same | AC-008: coordinator, member or team run ID as the wrong field; sub-work; unknown ID; both IDs, address + ID, missing `task_id` | `resolveExistingCopy`, parser | same | Durable | Pass | same |
| same | AC-007 / QR-002: non-assigner refused. Teammate (Team), Org member (Org), Task copy (`Task workers delegate sub-work without task_id.`, Agent root) | sender identity | same | Durable | Pass | same |
| same | AC-009: B DONE, B CANCELLED, unknown Task, latest assignment already B | Task-side rules | same | Durable | Pass | same |
| same | AC-002: same IDs back; exactly one reopened event `[team:T]`; one `--conversation` relaunch; earlier marker before `New Task assigned to you: B` and the reply; members unchanged; GraphQL and `/ws/projects` B root = copy, live; A DONE with root closed/offline; A's files byte-identical; B entry `assigned`/`started`/open | DS-002 end to end | same | Durable | Pass | same |
| same | AC-012 (same root): `TARGET_IS_TEAM_RUN` names the coordinator; coordinator message unchanged | router | same | Durable | Pass | same |
| same | AC-004: DONE → CANCELLED → DONE of A, each verified (detail below); then the coordinator accepts a message with no reactivation note | DS-003 release filter | same | Durable | Pass | same |
| same | AC-013: `assignments` / `closedAssignments` with exact explicit keys; no `targetAgentRunId` | `list_project_tasks` | same | Durable | Pass | same |
| same | AC-005: DONE of B → closure frame, process gone, snapshot closed | DS-003 | same | Durable | Pass | same |
| same | AC-010: the reopen hint names B (DONE) and the exact `delegate_task` next step; files unchanged | reopen path | same | Durable | Pass | same |
| same | AC-018: A → B → A (detail below) | append rule | same | Durable | Pass | same |
| same | AC-003 (+ AC-004/005 with CANCELLED): Agent copy C → D by `target_agent_run_id` (detail below) | Agent copy path | same | Durable | Pass | same |
| EXC-E2E-004 | QR-001 / MP-003: parallel DONE(X) + `delegate_task(target, Y)` in one Manager turn (detail below) | Task serialization vs root queue vs release | server E2E + fixture `CALL_TOOLS` | Durable | Pass | `exc-e2e-final/…json` → `race` |
| EXC-E2E-005 | AC-012 cross-root: `TARGET_IS_TEAM_RUN` naming the coordinator. AC-008: another root's copy refused, files unchanged. Inactive root keeps the not-active refusal | directory `findTeamCoordinator` | server E2E | Durable | Pass | same |
| EXC-E2E-006 | AC-009: a copy whose start failed, found via `list_project_tasks` (`outcome: failed`), given a follow-up | `resolveExistingCopy` → `refuseCopyOutsideTree` → Task-side never-started | server E2E | Durable | Pass (round 2; round 1 Fail F-001) | `round-2/exc-e2e-final/…json` → `neverStarted` |
| EXC-E2E-008 | AC-002 with a real model: the copy recalls Task A's codeword in follow-up Task B | full DS-002 with the Claude Agent SDK runtime | server E2E, `RUN_CLAUDE_E2E=1` | Durable (gated live) | Pass | `round-2/exc-e2e-final/…json` → `liveClaude` |
| EXC-E2E-007 | AC-009: saved conversation gone → `saved conversation is unavailable`; files unchanged; nothing published; process not started | queue step `assertRestorableChain` | server E2E | Durable | Pass | same |
| BR-012/013/014 | REQ-008, AC-002..005 rendered, Agent/Team/Org roots (detail below) | renderer tree + board | browser probe, built backend | Durable (probe) | Pass | `browser-existing-copy/evidence.json`, screenshots |
| BR-015 | AC-011, REQ-008/013 (detail below) | restart persistence | browser probe | Durable (probe) | Pass | same |
| BR-016 | AC-013 damaged + REQ-005 unreadable (detail below) | load-time damage | browser probe (API-level steps) | Durable (probe) | Pass | same |
| BR-001..011 | AC-016 (closure/reactivation unchanged) | tree | browser probe | Durable | Pass | `browser-task-closure-tree/evidence.json` |
| E2E-PRJ | AC-016 (existing delegation, reactivation, closure, CANCELLED, idle lifetime, lazy members, context files, boundaries, change feed) | preserved behavior | server E2E | Durable | Pass (O-001 intermittent, unrelated) | `e2e-prj-existing.log` |

Detail for the multi-step rows:

- **AC-004 (EXC-E2E-001..003).** After each of DONE → CANCELLED → DONE of A:
  - no closure frame for the copy within 2 s;
  - the same coordinator process is still live, with no relaunch;
  - the snapshot does not list the copy as closed;
  - A's file is byte-identical.
- **AC-018 (EXC-E2E-001..003).** The second delegation of A to the copy is accepted with a reopened event and the same provider conversation. A's file then holds two entries for the copy:
  - entry 1 is exactly the earlier closed entry;
  - entry 2 is open and `started`, linked after entry 1 closed.

  Afterwards: B's file is unchanged; A's root is the copy; `closedAssignments` lists the earlier period; there is one open entry across Tasks.
- **AC-003 (EXC-E2E-001..003).** The Agent copy C → D by `target_agent_run_id`:
  - only the worker reopens; its sub-work stays closed;
  - the conversation is continued, with a `--conversation` relaunch;
  - DONE of C again does not stop it; CANCELLED of D does.
- **QR-001 / MP-003 (EXC-E2E-004).** Offsets 0, 5, 7, 9, 11, 13, 15, 30, 60, 120 ms (assignment after the DONE) and −20, −60 ms (DONE after the assignment). Team and Agent copies, 24 rounds in total.
  - Both outcomes occurred on both copy kinds. The boundary fell between 5 and 7 ms (Team) and between 7 and 9 ms (Agent).
  - Every round ended with at most one open entry for the copy.
  - Every accepted round: the copy stayed live (same process) after a 2.5 s settle and after the next Task arrived, and it was not listed as closed.
  - Every refused round: the refusal named the open Task, the next Task got no entry, and the copy stopped with its DONE Task.
- **BR-012/013/014 (Agent, Team, Org roots).**
  - The Task Team row leaves at DONE of B and returns live (39 ms to 1 s after the call), without reload, with the same members and a live coordinator.
  - The board shows B2's root as the same copy (live) and B's root closed.
  - DONE → CANCELLED → DONE of B never removed the row (MutationObserver), and B2 stayed live.
  - The conversation continued (earlier marker before `New Task assigned to you: B2`); a fresh page load kept the row.
  - DONE of B2 removed the row and set B2 offline.
  - The Agent copy A → A2 brought back only the worker, without its helpers.
- **BR-015.** Real backend restart (new PID); then, per root:
  - the stopped copy is not listed;
  - `delegate_task(target_team_run_id, B3)` brings the row back live, and the conversation contains the earlier marker, B2 and B3;
  - B3's root is the copy and `started`.

  A second restart (new PID): the row is still listed, B3's assignment is still open, and the board's B3 root is the same copy.
- **BR-016.** A Task file was damaged before a real restart.
  - `list_project_tasks` returned `assignmentsUnavailable`.
  - The follow-up was refused (`Agent run resource data could not be read …`), with nothing written for A3 and the damaged file untouched.
  - After the file was restored and the backend restarted, the same follow-up was accepted and A3's root was the worker, live.

### Live-model suites

| Suite | Gate / config | Result | Evidence |
| --- | --- | --- | --- |
| `tests/e2e/runtime/mixed-task-delegation.e2e.test.ts` (Agent and Team results, exact keys) | `RUN_LMSTUDIO_E2E=1 RUN_CODEX_E2E=1 RUN_CLAUDE_E2E=1 LMSTUDIO_TARGET_TEXT_MODEL=qwen3.8 CODEX_E2E_TOOL_MODEL=gpt-5.6-luna`. The suite's default Codex list (`gpt-5.4-mini`…) is older than the installed models; the first attempt stopped at setup | **Pass**, 4/4 (LIVE-001..005, 891 s): real LM Studio qwen3.8, Codex gpt-5.6-luna and Claude haiku | `e2e-live-mixed-task-delegation.log` |
| `tests/e2e/runtime/agent-initiated-collaborators.e2e.test.ts` | `RUN_CLAUDE_E2E=1` | LE-A2, LE-A3, LE-T1, LE-O1 **Pass** (copies and Team copies through the updated `resultRunId`). LE-A1 and LE-F1 fail, unrelated (O-003) | `e2e-live-agent-initiated.log` |
| `tests/e2e/runtime/standalone-agent-collaborator-mention.e2e.test.ts` | `RUN_CLAUDE_E2E=1` | Both Claude cases fail at the `@`-mention step before any delegation result is read, unrelated (O-003) | `e2e-live-standalone-mention.log` |

## Validation Confidence Scorecard

| Confidence Category | Post-Repository Score | Final Score | Change | New / Final Supporting Evidence | Residual Uncertainty |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 70% | 97% (round 1: 85%) | +27 | Every AC directly proven at the real wire; F-001 resolved; AC-002 also with a real model | C-09 accepted residual (generic refusal while the failed copy's own Task is still open) |
| Changed-boundary execution directness | 70% | 97% | +27 | Real MCP/roots/delivery/processes in 3 roots; real restarts | — |
| Cross-boundary integration realism and mock gap | 70% | 96% (round 1: 94%) | +26 | AGY CLI scripted only in the deterministic journeys; real Claude existing-copy assignment (EXC-E2E-008); live LM Studio/Codex/Claude delegation | Real-model case covers the Agent copy in an Org root only |
| Environment, configuration, identity, and fixture fidelity | 80% | 95% | +15 | Real sender identities per root; cross-root sender; built backend | — |
| Failure, edge-case, lifecycle, and recovery evidence | 70% | 95% (round 1: 88%) | +25 | Race both orders (2 × 24 rounds); restart; damaged data; lost conversation; never-started | MP-003 residual is probabilistic |
| User-surface, browser, and desktop-shell confidence | 0% (none) | 93% | +93 | Tree + board in 3 roots, reload, restart (web-equivalent) | Packaged Electron not exercised (no shell change) |
| Durable regression coverage quality and relevance | 85% | 95% | +10 | New suite + 5 probe cases + TESTING.md | — |

- Overall post-repository confidence: ~64% (repository layers do not exercise the wire, rendering or restart).
- Overall final confidence (round 2): **95.4%** (simple average: 97, 97, 96, 95, 95, 93, 95). Round 1 was 92.4%.
- Every critical AC directly proven: `Yes`.
- Final categories below 90%: none (lowest: user surface 93%, web-equivalent, with no shell change).
- 95% target met: `Yes`.

## Broader Validation Decision And Execution

- Decision: `Required` → executed (Live API server E2E + Browser probe with a real built backend and restarts).
- Startup: suites own an in-process Studio server on port 0 with a temp data dir (server E2E); the probe owns `dist/app.js` on a free port, Nuxt dev on a free port, headless Chrome 154, and a private data root.
- Environment: `env -u AUTOBYTEUS_AGENT_PACKAGE_ROOTS -u AUTOBYTEUS_SKILLS_PATHS -u AUTOBYTEUS_APPLICATION_PACKAGE_ROOTS`; `RUN_AGY_FAILURE_E2E=1`; `ANTIGRAVITY_CLI_COMMAND=<worktree>/autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs`; `AGY_FAKE_CASE=linked_skills` (set by the suites).
- Data: all via public GraphQL mutations in test-owned data roots.

## Platform / Runtime Targets

- macOS (Darwin 25.5.0), Node v22.23.1, Vitest 4.0.18, headless Google Chrome 154.0.8037.98 (Playwright-core), Nuxt dev server; viewport 1440×1100, en-US.

## Lifecycle / Upgrade / Restart / Persisted-Data Checks

- Approved decision: `Directly Usable — No Migration`.
- Representative data:
  - current single-entry files written by the spawn path;
  - multi-entry files (A → B → A) written by the new path;
  - a copy appearing in several Task files (closed in older ones).
- Result:
  - files read back by a real restarted backend (BR-015) with the same current Task;
  - persisted names unchanged on disk (`agentRunResources`, `agentRun`, `coordinatorAgentRunId`; EXC-E2E entries assertion);
  - damaged file isolation and recovery (BR-016).
- Version-specific branch or fallback observed: `No`.

## Durable Coverage Changed In The Codebase

| Path / Test | Change | Requirement / Boundary | Execution Result |
| --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/projects/task-existing-copy-assignment.e2e.test.ts` | Added | EXC-E2E-001..008: AC-001..010, 012, 013, 018, QR-001/002; 008 = gated real-model AC-002 | Round 2: 8/8 pass |
| `autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs` | Updated | `CALL_TOOLS:[…]` parallel tool calls in one turn (RU-1) | routing unit + native-argument E2E pass |
| `autobyteus-web/tests/e2e/task-closure-tree-probe.mjs` | Updated | BR-012..BR-016; `openRoot(…, {requireTaskTree})` option; BR-015 waits for `start: started` | BR-001..016 pass (round 1); BR-012..016 pass (round 2) |
| `TESTING.md` | Updated | documents the new suite and cases | — |

- Added or updated paths attached for review: `Yes`

## Other Execution Artifacts

| Artifact Path | Type / Purpose | Retained Or Temporary |
| --- | --- | --- |
| `.../api-e2e-evidence/*.log` | command outputs | Retained |
| `.../api-e2e-evidence/exc-e2e-final/task-existing-copy-assignment.json` | server E2E receipt (race rounds, refusals, cleanup) | Retained |
| `.../api-e2e-evidence/browser-task-closure-tree/`, `browser-existing-copy/` | probe evidence.json, screenshots, backend/frontend logs | Retained |
| `.../api-e2e-evidence/exc-e2e-iter/`, `exc-iter.log` | earlier iteration receipts | Retained (superseded) |

## Temporary Execution Methods / Scaffolding

None (all methods are durable).

## Dependencies Mocked Or Emulated

| Dependency | Method | Why | Limitation |
| --- | --- | --- | --- |
| AGY CLI / model | repository scripted CLI (`linked_skills`) | deterministic tool calls, no quota | no provider inference in the AC journeys; live suites cover real models separately |
| Copy start failure | member configured with a model the runtime does not offer | the real start-failure path | — |
| Lost conversation | memory folder removed while the copy is stopped | data loss is not producible otherwise | emulates the loss outcome |

## Result Summary

| Result | Case IDs | Summary / Reason |
| --- | --- | --- |
| Pass | REPO-001..004, EXC-E2E-001..008, E2E-PRJ, E2E-AGY-FIX, BR-001..016, live mixed-task-delegation, live LE-A2/A3/T1/O1 | see matrix; EXC-E2E-006 passes since round 2 |
| Fail, not attributed to this change | live LE-A1, LE-F1, standalone-mention Claude cases | O-003 (base-stale `@` assertions; catalog drift) |

### F-001 — RESOLVED in round 2 (fix `88e59f500`, IR-002, CRR-003). Original round-1 finding below.

### F-001 (round 1) — a copy that never started gets "not a delegated copy in this run" instead of the never-started reason (AC-009, REQ-005)

- Scenario (RU-3, real use):
  - a Team-root Manager delegates Task F to `/worker`, whose model the runtime does not offer: `{delegated:false, message:"AGY_MODEL_UNAVAILABLE: exc-no-such-model"}`;
  - `list_project_tasks` lists F's assignment `{kind:"agent", agentRunId:"exc_worker_…", assignedBy:<manager>, outcome:"failed"}`;
  - the Manager sets F CANCELLED, then calls `delegate_task({target_agent_run_id:<that agentRunId>, task_id:G})`.
- Expected (REQ-005, AC-009 "copy whose start failed … refused with the specific reason; nothing changes"; design eligibility item 5 / R-2): a refusal naming that the copy never started, e.g. `This copy never started, so it has no conversation to resume; or delegate Task G to a new copy with recipient_address.`
- Observed: `{delegated:false, message:"exc_worker_… is not a delegated copy in this run. Use the ID delegate_task returned for a copy delegated in this run, or delegate to a new copy with recipient_address."}`. Nothing changed (Project files byte-identical).
  - The reason is wrong for this ID: the copy was delegated in this run, and this run's own Task lists it.
  - The guidance ("Use the ID delegate_task returned") points at an ID that does not exist (failures return none).
- Mechanism (source):
  1. `dispatchTaskCopy` links the Task entry, then the activation fails in `prepare()`, before `commit()`; the entry is marked `failed` and the copy never enters the root's tree.
  2. `RootTaskExecutionLifecycle.assignToExistingCopy` calls `resolveExistingCopy(adapter, copy)` before `port.assertAssignable(...)`.
  3. The adapter lookup misses, so the generic `TASK_COPY_NOT_ASSIGNABLE` refusal is thrown and the Task-side `everStarted` check (`assertTaskExecutionAssignable`, item 5) is never reached.

  For start failures at activation, the never-started rule is therefore unreachable. A never-started copy is reachable only when a committed copy's seed is not accepted.
- Reproduction: `RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<worktree>/autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs pnpm -C autobyteus-server-ts exec vitest run tests/e2e/projects/task-existing-copy-assignment.e2e.test.ts -t EXC-E2E-006 --no-watch`. Reproduced in 3 of 3 runs.
- Severity: low/medium. The safety invariant holds (refused, nothing changes); the agent-facing reason and next-step guidance are wrong.

### Non-blocking observations

- **O-001 (unrelated, intermittent): `task-copy-idle-lifetime.e2e.test.ts`.** The 3-line change on this branch only reads the explicit Team result field.
  - In an 11-file parallel run, the Team copy's `shutdownAfterEndMs` was 58,947 against a minimum of 59,000. The window compares client receive times of two different WS frames, so it is sensitive to delivery latency under load.
  - A solo rerun failed once on the Agent root's first delegation: `The model 'gemini-3.8-flash-low' is not available on antigravity_cli` (catalog validation, untouched here).
  - A second solo rerun passed.
  - Recommend a separate item for the suite's timing basis and catalog warm-up.
- **O-003 (unrelated, base-stale live assertions).** This branch changes no `@`-mention or collaborator-entry source (`git diff --stat 742a0df97 -- autobyteus-server-ts/src`).
  - `agent-initiated-collaborators` LE-A1 and `standalone-agent-collaborator-mention` (both Claude cases) assert that an `@` send adds a collaborator instance. Observed: `execution_tree.collaborators` is `[]`, or there is no `@` instance.
  - The base's current, documented behavior is "a `@` send adds no collaborator and stores the `delegate_task` note" (TESTING.md, ad-hoc delegation; `mention-delegation-dismissal`, commit `9ca13012f`). These gated live assertions predate it.
  - LE-F1 expects `claude-haiku-4-5-20251001` to be absent from the installed Claude catalog, but the current CLI lists it (environment drift).
  - Recommend a separate item for the owner of those suites (TESTING.md Rule 9). Not caused by this change.
- **O-002.** The unreadable-data refusal text says "Agent run resource data could not be read (<absolute path>) …". That is persisted vocabulary in an agent-facing message. Not required by REQ-014 (internal names) and design kept error codes; noted for a wording pass.

## Cleanup Performed

| Resource | Ownership | Action | Result |
| --- | --- | --- | --- |
| Server E2E data dirs, roots, in-process servers | suite | `afterAll`: terminate roots, `app.close()`, `rm` data dir | `dataRemoved: true`, `remainingRoots: 0`, `leftoverProcesses: []`, `errors: []`; `/ws/projects` frames 749, invalid 0 |
| Probe backend / Nuxt / Chrome / data root | probe | `finally` stop process groups, close browser, remove data root | backend exit 0, frontend SIGTERM, browser closed, `dataRootRemoved: true` (both runs) |
| Other isolated instance `iso-63369-6c20` (another worktree) | not owned | untouched | — |

## Preliminary Classification

- Round 2: no open failure. Round-1 F-001 (classified `Local Fix` → implementation) is resolved.
- Round-1 note: F-001: `Local Fix` → implementation.
  - The approved requirement (REQ-005 / AC-009) and design (eligibility item 5, R-2) already define the behavior.
  - The implementation's lookup order makes it unreachable for activation-time start failures.
  - Candidate direction: when the copy is not in the tree, ask the Task side for the copy's history; if it has entries in this root, apply `assertAssignable` before the generic refusal.
  - If the code reviewer judges that the design's lookup-first spine is the origin, it is a `Design Impact` for the Solution Designer.

## Latest Authoritative Result

- Result: `Pass` (round 3, API-REV-003, on the integrated base, plus a packaged Electron real-model journey; round 2 Pass; round 1 `Fail` on F-001, resolved)
- Final validation confidence: ~96% (round 3: user surface 97%; round 2: 95.4%)
- Round 3 test-code review: `Not Applicable` (no API/E2E-owned durable test changes in round 3)
- Default `95%` target met: `Yes`
- Final categories below 90%: none
- Broader validation decision: `Required` — executed (Live API server E2E incl. a real Claude case + Browser with real restarts)
- Critical AC lacking direct proof: none
- Residual risks:
  - MP-003 window, exercised probabilistically: 48 parallel-call rounds over two runs, no violation.
  - C-09 accepted residual: the refusal stays generic while the failed copy's own Task is open.
  - O-001, O-002 and O-003 (unrelated or non-blocking).
  - Packaged Electron not exercised (no shell change).
  - The agents-repo PTM skill (`0bd84e0`, unpushed) must ship with the server change.
- Test-code review: `Required` (Large/High) — requested from `/software_engineering_team/code_reviewer`
- Next recipient: `/software_engineering_team/code_reviewer`
