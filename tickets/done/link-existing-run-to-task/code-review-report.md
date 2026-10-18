# Code Review Report

## Review Round Meta

- Review Entry Point: `Implementation Review`
- Requirements Doc Reviewed As Context: `.../requirements-doc.md` (Approved; REQ-001..REQ-007, AC-001..AC-007, DEC-101..DEC-109)
- Investigation Notes Reviewed As Context: `.../investigation-notes.md` (through the design's evidence table)
- Solution Revision Record Reviewed As Context: `.../solution-revision-record.md` (SR-008)
- Design Spec Reviewed As Context: `.../design-spec.md` (SR-008, Ready)
- Supplemental Task Artifacts Reviewed As Context: `.../implementation-design-impact.md` (DI-001, resolved in SR-008); the 8641c0ac memory layout contract as cited
- Relevant Solution Revision IDs: `SR-003`..`SR-008`
- Design Review Report Reviewed As Context: `.../design-review-report.md` (ARCH-REV-004 Pass)
- Architecture Review Revision Record Reviewed As Context: `.../architecture-review-revision-record.md`
- Relevant Architecture Review Revision IDs: `ARCH-REV-004`
- Implementation Handoff Reviewed As Context: `.../implementation-handoff.md`
- Implementation Revision Record Reviewed As Context: `.../implementation-revision-record.md`
- Relevant Implementation Revision IDs: `IR-001` (`ef807beb6d`), `IR-002` (`4b0986363c`)
- Code Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/link-existing-run-to-task/tickets/in-progress/link-existing-run-to-task/code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-006`
- Current Review Round: `6`
- Review Scope: round 2 is a `Targeted Delta Review` of `4b0986363c` (5 source files within CR-001..CR-003, docs, 2 tests, e2e evidence). Round 1 was a `Full Review` (`2f211340ee..ef807beb6d`). All 27 changed source files were read in full; plus the 4 new and 2 updated test files and the 2 docs.
- Trigger: implementation_engineer, IR-002
- Prior Review Round Reviewed: `1` (CRR-001, Fail)
- Latest Authoritative Round: `2`

(`...` = `/Users/normy/autobyteus_org/autobyteus-worktrees/link-existing-run-to-task/tickets/in-progress/link-existing-run-to-task`)

## Routing Classification Review

- Task size `Large`; architectural risk `High`; route `Implementation Review`; independent review required: `Yes`. Classification confirmed: a run's identity class and runtime owner change, with crash-recoverable writes across four records.

## Review Scope

- **Read in full:**
  - `hand-started-run-adoption.ts`, `hand-started-runs.ts`;
  - the lifecycle branch and shared delivery, command queue, delegation error code, port additions, the active-root boundary;
  - `hand-started-run-adoption-shape.ts`, `task-agent-own-files.ts` additions;
  - the agent and team history catalogs and the extracted catalog state;
  - `existing-run-assignments.ts`, `project-task-service.ts`, `task-execution-resource-service.ts`, the release and domain helpers, `project-service.ts`;
  - the composition and both server entry points;
  - standalone root, builder, collaborators (`catalogAddressOf`), adapter (`commitAdoptedExecution`), `standalone-root-adoption.ts`;
  - the agent-facing texts.
- **Reviewer-run evidence:**
  - `tsc -p tsconfig.build.json --noEmit`: exit 0.
  - `--noUnusedLocals` over the touched files: 3 hits, all already present at base (CR-001).
  - The new and updated tests: 6 files / 50 tests pass.
  - **The e2e `collaboration-prompt-wording.e2e.test.ts` (scripted AGY, clean env): CPW-R3 fails on M-34** (CR-002); the other 10 pass.
  - Size: no changed source file is over 500 effective lines. `agent-run-history-catalog-service.ts` was over the limit at base and is now under it after the extraction. The two new files are 162 and 180 effective lines.
- **Explicit exclusions:** the full unit and integration suites were not rerun (the implementer reports them green). The remaining e2e suites were not run by the reviewer.

## Round 2 — Delta (IR-002, CRR-002)

- **CR-002:** `HandStartedRunLookup`'s not-found result carries `refusal: string | null`.
  - `null`: an unknown ID, another root's copy, or a member of another root's task agent team. `admit` then throws today's `notACopyOfThisRun`, unchanged; a non-host delegator naming such an ID gets the same.
  - Adoption-specific refusals only for runs the user started: never started; an agent run passed as a team (G1 plus a history row); a team run passed as an agent; an organization run.
  - The team-member hint requires `TeamRunPackageCatalog.isAdmitted`, so it's never given for a task agent team.
  - The generic "not a run the user started" text is removed.
- **E2E evidence:** `evidence/implementation/IR-002-delegate-task-refusal-e2e.log` (scripted AGY, clean env):
  - collaboration-prompt-wording 11/11, including CPW-R3 (M-34);
  - task-existing-copy-assignment 7 passed, 2 skipped (live Claude);
  - task-reactivation-root-visibility 6 passed, 1 skipped (a permanent `it.skip`).
- **CR-001:** the import is removed and both `memoryDir` values are plain constructor arguments. Reviewer: `--noUnusedLocals` shows 0 hits in touched files; tsc is clean.
- **CR-003:** `projects.md` now reads "step 1 with the eligibility checks, steps 2–4 on the root's queue".
- **Reviewer rerun:** `hand-started-run-adoption`, `hand-started-run-adoption-root` and `root-task-existing-copy-assignment`: 3 files / 59 tests pass.

## Round 6 — SR-009 Renderer Delta (IR-004, CRR-006)

- **Scope:** `Targeted Delta Review` of `fbc0f805bf` (web only):
  - new `stores/runHistoryRetiredRuns.ts`;
  - `runHistoryNavigationStoreActions.ts`, `runHistoryLoadActions.ts`, `agentRunCollaborationStreamingService.ts`, `agentRunCollaborationStore.ts`;
  - 4 specs, the docs, the rendered-check evidence.
- **Matches SR-009 "Sidebar After Adoption":**
  - Rule 1: `task_execution_started` on the delegator's stream → `retireTaskExecution`, then a topology refresh.
  - Rule 2: `reconcileHistoryRead` after each successful workspace read retires a run an earlier read listed and a later read no longer lists, and un-retires it if listed again.
  - `withoutRetiredRuns` filters only the sidebar's top-level sources (history rows, agent contexts, team contexts). The contexts and conversations stay usable.
- **Implementer's decisions, accepted:**
  - (4) Rule 1 is wired for the Agent root only: only Agent roots adopt (DEC-108), and Team / Org `task_execution_started` events name new copies, which are never top-level contexts, so a hook there would never fire.
  - (5) Rule 2 respects the agent history window. Reviewer verified the server takes the newest `limitPerAgent` runs **by `createdAt`** (`run-history/services/agent-run-history-service.ts:102-105`), which is exactly what `leftHistory` assumes, so a run that only fell out of the window is never hidden.
  - (6) Archive already removes the local context, so rule 2 doesn't change it (tested).
- **Reviewer checks:**
  - `runHistoryStore.spec`, `agentRunCollaborationStreamingService.spec`, `agentRunCollaborationDisclosure.spec`, `agentRunCollaborationStoreClosure.spec`: 4 files / 69 tests pass. Rule 1, rule 2, the window case, the never-listed case and archive are each covered.
  - Implementer's web run: 632 files / 4480 tests (`IR-004-web-unit.log`).
  - Rendered check (`IR-004-adoption-sidebar-check/evidence.json`): the agent left its own group in 3 ms and the team at the next read (4 s); neither returned after DONE, reopen or a reload.
- **Server unchanged;** F-001 and F-003 stay resolved. New file size 116 lines.

## Round 5 — API/E2E Failure-Origin Review, F-002 (API-REV-002, CRR-005)

- **Failure package:** API-REV-002 on `f5001b65c6`.
  - F-001 and F-003 are verified fixed: ADO-1..ADO-4 pass, and on the real app (Haiku 5.5 PM, DeepSeek V4 Flash writer and team) there's no rejection or fail-stop, and AC-003 DONE and reopen work.
  - F-002 stays.
  - Evidence: `evidence/api-e2e/round2/desktop/f002-run2-holders.json`, `f002-run2-after-fetch.txt`, `f002-after-app-restart.txt`.
- **F-002:** an adopted run the user opened in the current session stays in its own sidebar group (ADO Writer; TEAMS › ADO Review Team) after adoption, after DONE, and after the renderer's history read. It disappears only after an app restart. So the run shows twice for the session, against AC-001 ("not under TEAMS") and AC-003 ("removed from the sidebar on DONE").
- **Origin: Design Impact.** The code follows the design; the design's premise is wrong.
  - The design says: "the sidebar code (adopted runs … leave their group because their history row is removed)" is deliberately left alone, and step 4 publishes a history change. R-1 was accepted as "the UI sees it leave its group".
  - In fact the renderer adds every run context opened this session to the history tree as `source: 'local'` rows (`autobyteus-web/stores/runHistoryReadModel.ts:267-281`), and team contexts to `teamNodes` (`stores/runHistoryNavigationProjection.ts:180-187`), whatever the server's rows say.
  - The server has no history push, which the implementer flagged under Known Risks.
  - So removing the history row can't remove these rows. A renderer change, or a server event the renderer handles, is needed, and both are outside the design's Change Scope.
- **Reviewer confirmation:** the projection code read; the evidence shows the server history listing only the PM, and the restart removing the duplicate (`f002-after-app-restart.txt`).
- **Was it detectable in source review?** Not from the diff: the web code is unchanged by design, and the premise sat in the approved design. It would have needed a check of the renderer's sources for sidebar rows.
- **Not changed:** the server side; F-001 and F-003 stay resolved.

## Round 4 — F-001 / F-003 Delta (IR-003, CRR-004)

- **Scope:** `Targeted Delta Review` of `f5001b65c6` (3 source files, 2 tests, the e2e log).
- **F-001:**
  - `TokenUsageRunAccumulator.recordObservation` builds `run_summary_after_event` with `root_team_run_id` from the observation's own payload (its current execution context). The stored record keeps its earlier root (REQ-004).
  - For a run that never changes root the two values are equal, so behavior is unchanged.
  - The only other producers of run summaries are the stored Token Meter queries (`token-usage-run-store.ts:47-73`). They aren't validated against the live root, so the fail-stop path is fully covered.
  - Regression test: `token-usage-run-accumulator.test.ts` (fails without the fix).
- **F-003:** `buildAdoptedRunTaskMessage` ("New Task assigned to you: <key>. This is the work to do now.") shares the body with the existing-copy message. `deliverAssignedTask` picks it for adoptions, resumed ones included. The returning-copy text is unchanged.
- **Reviewer checks:**
  - tsc clean; `--noUnusedLocals` shows 0 hits in touched files;
  - `tests/unit/token-usage`, `tests/unit/agent-collaboration` and the adoption root test: 54 files / 675 tests pass;
  - `evidence/implementation/IR-003-ADO-e2e.log`: ADO-1..ADO-4 4/4, including ADO-4.
- **Recorded, not a finding:** an adopted run's usage stays one cumulative record, so the PM's Agent-root Token Meter includes its pre-adoption usage, while its own team row has left the history. Nothing is lost or double-counted. This follows from REQ-003 ("the delegator's delegated run"). If the user wants pre-adoption usage kept apart, that's a new requirement.
- **F-002** is still held: API/E2E rechecks the sidebar now that F-001 no longer fail-stops the PM.

## Round 3 — API/E2E Failure-Origin Review (API-REV-001, CRR-003)

- **Failure package:** API-REV-001 Fail (`api-e2e-execution-report.md`, `api-e2e-validation-ledger.md`).
  - Failing scenarios: AC-001/AC-003 (F-001), BEH-002 (F-002), REQ-002 wording (F-003).
  - Evidence: `evidence/api-e2e/ADO4-run3.log`; `desktop/failstop-app-log-excerpt.txt`.
  - Command: ADO-4 in `tests/e2e/projects/hand-started-run-adoption.e2e.test.ts` with the scripted-AGY gate on.
- **Scenario still approved:** yes. SCN-001/SCN-003: the PM adopts a team run that worked before, and the team keeps working under the PM (REQ-003, "coordinated … exactly like a run the delegator started").

| Failure | Origin | Evidence | Owner |
| --- | --- | --- | --- |
| F-001 (High) an adopted team's `TOKEN_USAGE_UPDATED` fail-stops the PM's Agent root | **Implementation defect caused by this change** (a code-review gap, see below). The run summary takes `root_team_run_id` from the run's latest stored token record (`token-usage/projections/token-usage-run-aggregate.ts:92`, `latest?.rootTeamRunId`). A team that worked before adoption has records under its own Team root. In an Agent root, `collaboration-agent-presentation-adapter.ts:166-169` rejects any summary that claims a Team root, and the rejection fail-stops the root (`standalone-agent-run-root.ts:347-349` → `enterFailStop`), shutting down every task agent | reviewer confirmed in code. `ADO4-run3.log`: "Rejected TOKEN_USAGE_UPDATED: agent token summary must not claim a Team root", then the timeout. The desktop log shows the shutdowns 45 ms later. The control (a new task team reporting the same usage) passes | `implementation_engineer`, `Local Fix` |
| F-002 (Medium) adopted runs stay in their own sidebar groups after reload | **Unclear, held for evidence.** `listWorkspaceRunHistory` no longer returns them, but the renderer keeps the writer as a `source: "local"` row and the team in `teamNodes`. API/E2E could not separate this from F-001: after the fail-stop the PM's UI context went `historical` | API/E2E report | recheck after F-001. If it persists, the renderer's source of those rows must be found. A renderer change is outside the design's Change Scope ("sidebar code left alone"), so it would go to the Solution Designer |
| F-003 (Low) the Task message to an adopted run says "Your previous Task is closed" | **Implementation, following the design literally.** The design named `buildExistingCopyTaskMessage` as the delivery (`task-execution-input.ts:72`), whose first line assumes an earlier Task. The intent was the delivery path (REQ-002: the Task as its next work), not that sentence | `task-execution-input.ts:67-73` | `implementation_engineer`, `Local Fix` |

- **Required for F-001:**
  - Events of an adopted run must attribute under its current root. The summary and usage published under the PM's Agent root must not claim the run's former Team root; derive the claimed root from the current execution context, not from the latest stored record.
  - The run's earlier records stay as they are (REQ-004).
  - Add a regression test (ADO-4 already exists at API/E2E).
  - If the fix needs a product decision about how the pre-adoption usage counts in the PM's Token Meter, stop and route it to the Solution Designer as `Design Impact`, rather than choosing one.
- **Required for F-003:** a variant of the Task message for an adopted run (or a neutral first line) that doesn't claim a previous Task. It's agent-facing text, so keep it short and record it in the handoff.
- **Was F-001 detectable in source review?** Partly; this is a gap in my review.
  - I traced DS-002 ("nothing new: existing delegated-run behavior applies") and accepted the design's premise. I didn't check which per-run state records the run's former root.
  - Token usage records do, and the presentation adapter validates the summary against the current root, so the defect was in reach of a check for state that carries root identity.
  - It is not visible in the diff itself (no token-usage file changed). The scenario needs a run that already reported usage, which the unit tests' hand-built runs didn't have.
  - Affected score rationale: Runtime Correctness 9.3 → 8.5 (re-score at the next round).
- **Durable test changes** (new `hand-started-run-adoption.e2e.test.ts`, the harness options, the TESTING.md temp-`HOME` rule): not reviewed in a failure-origin round; they're reviewed after an API/E2E pass.
- **Follow-up FU-2** (outside the ticket, reproduces on base): `terminateAgentRun` on an AGY run held mid-turn (`HOLD_TURN`) never returns. Repro: `evidence/api-e2e/followup-hold-terminate-repro.e2e.test.ts.txt`. Sent to `/project_task_manager`; folded into the Antigravity stop Task autobyteus-122 (TODO), with the repro attached.

## Upstream Behavior And Production-Path Basis Confirmation

- Behavior-basis status: `Confirmed`.
- DS-001 traced through the code: `assignToExistingCopy` → `isAdoptable` / `isInProgress` → `admit` (eligibility in the design's order, then step 1 `assignAdoptedRun`, re-checked under both orderings) → queue `adopt` → `complete` → shared `deliverAssignedTask`.
  - `complete` runs steps 2–4, each recognized from the files: release while idle; the additive / rebased own file; the read-back; the link through `commitTaskActivation`; history row removal plus exclusion.
  - `deliverAssignedTask` is the existing follow-up delivery and `markStarted`.
- Undo traced: DONE / CANCELLED (`closeAndWrite`), Task delete and Project delete → `revertUnfinishedAdoptions(neverStartedAssignments)` → composition → the active root's queue or the offline revert.
- The implementer's three choices where SR-008 was silent are consistent with the design's intent and with DEC-109:
  1. The undo needs "still listed" in addition to the design's two conditions, so a new copy that crashed before its link is never turned back into a hand-started run.
  2. "Or still listed" makes a stop after the link resumable.
  3. A reverted entry is closed on Task delete.

## Supported Product Scenario And Reachability Gate (Mandatory)

SCN-001..SCN-003 (Supported Normal). DEC-109's partial adoption is a Supported Explicit Edge Scenario: the same delegator's retry finishes it.

### Candidate Finding And Mechanism Gate

| Candidate ID | Observation | Scenario / Contract | Evidence | Disposition |
| --- | --- | --- | --- | --- |
| C-1 | Three unused declarations in touched files | Core Principle 7 | `--noUnusedLocals` | Promote → CR-001 |
| C-2 | In an Agent root (every root has adoption via `StandaloneRootBuilder`), a run ID that is neither in the tree nor a closed copy of this root goes to `admit`. When it's not a run the user started, the agent gets `notStarted` ("…is not a run the user started on this node…") instead of today's `notACopyOfThisRun` ("…is not one of your task agents. Use a run id that delegate_task returned to you…"). This covers an unknown ID and another root's copy. In addition, `notAnAgentRun` names a member of **any** `agent_teams/*` folder, including another root's task agent team, as "a member of team run X; use target_team_run_id X"; following that guidance then fails with `notStarted` | Preserved Behavior Boundary ("every current `delegate_task` mode … stay unchanged"); AC-006; the design's Removal plan: "the refusal stays for the rest"; result catalogue M-34 | Reviewer run of `collaboration-prompt-wording.e2e`: CPW-R3 fails on M-34. Pinned by `task-existing-copy-assignment.e2e.test.ts:445,767` (unknown ID; another root's Team copy). Unit fixtures pass only because they build the lifecycle without adoption | Promote → CR-002 |
| C-3 | `projects.md` "Path … steps 1–4 on the root's queue" (also stated in the handoff); step 1 (`admit` → `assignAdoptedRun`) runs before the queue | engineering contract (docs match code) | lifecycle: `await this.adoption!.admit(...)` then `queue.submit({kind: "adopt", … complete})` | Promote → CR-003 (Low) |
| C-4 | A stop after the link and before step 4, then the Task closed without a retry: the revert does nothing (link present), so the history row stays | DEC-109, REQ-003 | the readiness index admits no task-agent folder (G1/G2), so the stale row is never listed, and DONE stops the linked copy as usual | Reject (no visible consequence) |
| C-5 | `notAnAgentRun` reads every `agent_teams/*` folder on a refusal | DESIGN.md rule 3 | refusal-only path; one directory listing | Reject (proportionate on an error path). Its correctness part is in CR-002 |
| C-6 | Self-adoption (a PM passes its own run ID) | — | refused: a PM calling a tool is busy (`running`), and usually has its own copies | Reject (contrived; already refused) |
| C-7 | The history catalogs and readiness index instances created by `ProcessHandStartedRuns` might diverge from the app's | correctness | `agent-run-history-catalog-state.ts`, `root-run-package-readiness-index.ts` and the team catalog keep process-wide state per memory root | Reject (shared state) |

## Structural / Design Checks

| Check | Result | Evidence |
| --- | --- | --- |
| Design health preserved | Pass | one owner (`HandStartedRunAdoption`) on the existing path; no new subsystem |
| Matches supplements | Pass | own-file shape additive or rebased and exactly reversible; link `startedAt` equals the own file's |
| Spine clarity | Pass | DS-001 matches the design |
| Ownership boundaries | Pass | own-file IO in `TaskAgentOwnFiles`; history rows in the catalogs; the Task entry on the Task side; the shape module pure |
| Off-spine / reuse | Pass | the existing activation commit, delivery, catalog address map and release path are reused |
| Shared-structure tightness | Pass | no new persisted field |
| Separation / placement / layout | Pass | two extractions for size, both behavior-free |
| Interface clarity | Pass | port `currentAssignmentOf` / `assignAdoptedRun`; `UnfinishedAdoptionRevertRequest` |
| Naming | Pass | — |
| No unjustified duplication | Pass | — |
| Patch-on-patch | Pass | — |
| Dead code removed in touched files | Fail | CR-001 |
| Tests clear | Pass | refusals, every stop point, undo with the root active and not active, byte-identical own file on a later save, root-level integration |
| Preserved behavior | Fail | CR-002 |
| API/E2E readiness | Fail | the e2e suites weren't run by implementation, and the CR-002 regression shows up only there |

## Source File Size And Structure Audit (If Applicable)

| File | Before | After | `>500` | Notes |
| --- | --- | --- | --- | --- |
| `run-history/services/agent-run-history-catalog-service.ts` | 539 | 499 | Pass (now under) | state extracted to `agent-run-history-catalog-state.ts` |
| `projects/services/project-task-service.ts` | 436 | 429 | Pass | `existing-run-assignments.ts` extracted |
| `agent-collaboration/execution/task/root-task-execution-lifecycle.ts` | 390 | 418 | Pass | +49 |
| new `hand-started-run-adoption.ts` / `hand-started-runs.ts` | — | 162 / 180 | Pass | single concerns |

(Effective lines: non-empty, non-comment.)

## Legacy / Backward-Compatibility Verdict

| Check | Result | Notes |
| --- | --- | --- |
| No compatibility mechanisms | Pass | — |
| No legacy retention | Pass | — |
| Dead code in touched files | Fail | CR-001 |
| Persisted-data decision followed | Pass | `Not Affected`; current shapes only |
| No dual reads | Pass | the task-agent reader reads only rebased trees |

## Dead / Obsolete / Legacy Items Requiring Removal (Mandatory If Any Exist)

| Item | Type | Evidence | Action |
| --- | --- | --- | --- |
| `agent-collaboration/execution/services/active-collaboration-root-directory.ts:6` `cloneCollaborationMemberExecutionIdentity` import | DeadCode | TS6133 | remove |
| `run-history/services/agent-run-history-catalog-service.ts:63` `memoryDir` property | DeadCode | TS6138 | drop the parameter property, keeping the argument |
| `run-history/services/team-run-history-catalog-service.ts:53` `memoryDir` property | DeadCode | TS6138 | same |

All three were already present at base `2f211340ee`, in touched files.

## Docs-Impact Verdict

- Docs impact: `Yes`: `projects.md` gets §Ownership and §A Task for a run the user started; `collaboration_model.md` gets a CM-6 row. One inaccuracy (CR-003).

## Additional Material Premise Validation (When Required)

None beyond C-4..C-7.

## Review Scorecard (Mandatory)

- Overall score (`/10`): 9.3 (round 2)
- Overall score (`/100`): 93

| Priority | Category | Score | Why | Weak | Improve |
| --- | --- | --- | --- | --- | --- |
| 1 | Data-Flow Spine Inventory and Clarity | 9.3 | DS-001 visible end to end; steps recognized from the files | — | — |
| 2 | Ownership Clarity and Boundary Encapsulation | 9.3 | one owner; IO in the existing owners; pure shape module | — | — |
| 3 | API / Interface / Query / Command Clarity | 9.2 | small port additions; refusals with guidance | — | — |
| 4 | Separation of Concerns and File Placement | 9.2 | extractions keep files under the limit | — | — |
| 5 | Shared-Structure / Data-Model Tightness | 9.4 | no new persisted field | — | — |
| 6 | Naming Quality and Local Readability | 9.2 | clear names; the doc is accurate | — | — |
| 7 | API/E2E Readiness | 9.2 | root-level and unit coverage, plus the refusal e2e suites green | — | — |
| 8 | Runtime Correctness And Behavioral Fidelity | 9.3 | adoption, resume and undo correct; preserved refusals kept (CR-002 resolved) | — | — |
| 9 | No Backward-Compatibility / No Legacy Retention | 9.4 | — | — | — |
| 10 | Cleanup Completeness | 9.3 | `--noUnusedLocals` clean in touched files | — | — |

## Findings

CR-001..CR-003 are resolved in IR-002 (`4b0986363c`); none are open. Round 1 record:

| ID | Severity | Classification | Location | Evidence | Required Action |
| --- | --- | --- | --- | --- | --- |
| CR-001 | Low | `Local Fix` | the three items under Dead / Obsolete | `--noUnusedLocals`; present at base, in touched files (Principle 7) | remove them; confirm `--noUnusedLocals` is clean for the touched files |
| CR-002 | Medium | `Local Fix` | `hand-started-run-adoption.ts:66-67` (`admit`'s not-found refusal), `hand-started-runs.ts:52-53, 181-193` (`notStarted`, `notAnAgentRun`) | C-2. Reviewer run: `collaboration-prompt-wording.e2e` CPW-R3 fails on M-34. Also pinned by `task-existing-copy-assignment.e2e.test.ts:445` (unknown ID) and `:767` (another root's Team copy) | (a) When the named run is neither a run the user started nor one of this root's copies, refuse with today's `notACopyOfThisRun` text (M-34), unchanged. Keep the adoption-specific refusals (team-member / team-id / agent-id / organization / never started) only for runs the user started. (b) Have `notAnAgentRun`'s member guidance consider only team runs the user started (admitted team runs), so a task agent team's member gets today's refusal. (c) Run the e2e suites that pin delegate_task refusals (`collaboration-prompt-wording`, `task-existing-copy-assignment`, `task-reactivation-*`) with the scripted-AGY gate on, and record them in the handoff |
| CR-003 | Low | `Local Fix` | `docs/modules/projects.md` "Path (… steps 1–4 on the root's queue)"; the handoff says the same | step 1 runs in `admit` before the queue; steps 2–4 run on it | say "step 1 before, steps 2–4 on the root's queue" |

## Follow-ups

| Follow-up ID | What | Evidence | Why outside | Suggested Task |
| --- | --- | --- | --- | --- |
| FU-1 | The test `agent-team-collaboration-llm-contract.test.ts` has a case titled "delegation always does" create an agent | implementer's note | wording of a test title, outside the ticket's code | reword the title for the adoption mode |

- Sent to: `/project_task_manager` (CRR-001 follow-up message); recorded as an item in test-hygiene Task autobyteus-59 (TODO).

## Classification

N/A (Pass). Round 1 was `Local Fix` (CR-001..CR-003), resolved.

## Recommended Recipient

`/software_engineering_team/api_e2e_engineer` (primary); `/software_engineering_team/implementation_engineer` (informational).

## Residual Risks

- R-1 (sidebar removal waits for the next history read), R-2 (`not_confirmed` until a retry), R-3 (members remember `/` addresses): accepted in the design. The API/E2E real-app check covers R-1.
- A stop after step 4 and before delivery behaves like a copy whose delivery crashed (Assumption 2); accepted as existing behavior.

## Latest Authoritative Result

- Review Decision: `Pass`
- Review Entry Point: `Implementation Review` (round 6, Targeted Delta Review of SR-009 / IR-004)
- Supported Product Scenario Gate: `Pass`
- Material-Premise Gate: `Pass` (the sidebar premise corrected by SR-009 and implemented)
- Score Summary: 9.3/10; every category ≥ 9.0
- Recommended Recipient: `/software_engineering_team/api_e2e_engineer`
- Notes:
  - API/E2E reruns the web tests, the guards and D-1 on the real app: adopt a run opened this session, then DONE and reopen. Confirm it shows only under the PM, for an agent run and a team run, with the PM open and not open.
  - The server side stays valid.
  - Then the test-code review of API/E2E's durable changes.
