# Code Review Report

## Review Round Meta

- Review Entry Point: `API/E2E Failure-Origin Review`
- Requirements Doc Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/nested-team-history-restart-hydration/requirements.md`
- Investigation Notes Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/nested-team-history-restart-hydration/investigation-notes.md`
- Design Spec Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/nested-team-history-restart-hydration/design-spec.md`
- Supplemental Task Artifacts Reviewed As Context: the original restart reproduction and browser captures listed in the cumulative package, plus the API/E2E failure evidence listed below.
- Solution Revision Record Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/nested-team-history-restart-hydration/solution-revision-record.md`
- Relevant Solution Revision IDs: `SR-004`
- Design Review Report Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/nested-team-history-restart-hydration/design-review-report.md`
- Architecture Review Revision Record Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/nested-team-history-restart-hydration/architecture-review-revision-record.md`
- Relevant Architecture Review Revision IDs: `ARCH-REV-002`
- Implementation Handoff Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/nested-team-history-restart-hydration/implementation-handoff.md`
- Implementation Revision Record Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/nested-team-history-restart-hydration/implementation-revision-record.md`
- Relevant Implementation Revision IDs: `IR-001`
- Code Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/nested-team-history-restart-hydration/code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-002`
- Current Review Round: `2`
- Trigger: authoritative `API-REV-001` `Fail` after the `CRR-001` implementation-review pass.
- Prior Review Round Reviewed: `CRR-001`
- Latest Authoritative Round: `CRR-002`
- Coverage Investigation Reviewed: `/Users/normy/autobyteus_org/autobyteus-worktrees/nested-team-history-restart-hydration/api-e2e-coverage-investigation.md`
- Execution Coverage Report Reviewed: `/Users/normy/autobyteus_org/autobyteus-worktrees/nested-team-history-restart-hydration/api-e2e-execution-coverage-report.md`
- API/E2E Revision Record Reviewed: `/Users/normy/autobyteus_org/autobyteus-worktrees/nested-team-history-restart-hydration/api-e2e-revision-record.md`
- Relevant API/E2E Revision IDs: `API-REV-001`
- Delivery Revision Record Reviewed: `N/A`
- Relevant Delivery Revision IDs: `N/A`
- Failing Scenario IDs: `NTH-BR-001`; `AC-002`; browser portion of `AC-012`.
- Exact Failing Commands / Execution Mode: no single repository command represents the failure. The executed mode was a real private Nested Classroom package and agent package, real `deepseek-v4-flash` provider, isolated production-like data/database, built backend, current Nuxt renderer in Chrome, abrupt backend `SIGKILL`, correctly configured cold restart, then the normal workspace-history surface and `live-classroom-cold-ui-gap-probe.mjs`. Root TeamRun `nested_classroom_test_team_ef79cfb19d364f558b6f5e5ae2e08194`; task TeamRun `team_local_team_nested_classroom_test_student_st_1eb9bd0abbba4bb587c2af48aafe4bfc`; task AgentRun `student_one_e7a87cdb646e4678ac5ffacf5a82dcbe`.
- Failure Evidence Paths:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/nested-team-history-restart-hydration/api-e2e-evidence/real-classroom/cold-task-browser-failure-analysis.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/nested-team-history-restart-hydration/api-e2e-evidence/real-classroom/live-cold-ui-gap-result.json`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/nested-team-history-restart-hydration/api-e2e-evidence/real-classroom/live-active-task-member-before-cold-restart.png`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/nested-team-history-restart-hydration/api-e2e-evidence/real-classroom/live-active-cold-ui-team-control-and-missing-task-row.png`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/nested-team-history-restart-hydration/api-e2e-evidence/real-classroom/live-active-graphql-after-restart-summary.json`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/nested-team-history-restart-hydration/api-e2e-evidence/real-classroom/live-active-byte-preservation-summary.txt`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/nested-team-history-restart-hydration/api-e2e-evidence/real-classroom/backend-active-cold-restart.log`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/nested-team-history-restart-hydration/api-e2e-evidence/real-classroom/cleanup-report.txt`

## Review Scope

- Changed implementation and behavior reviewed: focused classification of the settled delegated-task-Team historical-navigation failure after cold restart.
- Files / areas reviewed:
  - approved `BEH-001`, `UC-002`, `UC-003`, `REQ-002`, `REQ-007`, `AC-002`, and `AC-012` behavior;
  - design `DS-004`, Web allocation, change sequence, and implementation guidance;
  - `autobyteus-server-ts/src/run-history/services/team-run-state-package-loader.ts` restart settlement;
  - `autobyteus-web/services/runHydration/teamRunContextHydrationService.ts` historical context hydration;
  - `autobyteus-web/services/teamExecution/teamExecutionTreeSelectors.ts` navigation projection;
  - `autobyteus-web/services/teamExecution/teamExecutionViewState.ts` exact focus;
  - `autobyteus-web/services/runOpen/teamRunOpenCoordinator.ts` and `autobyteus-web/stores/runHistorySelectionActions.ts` normal historical-open path;
  - focused frontend tests that encode active/settled task visibility.
- Explicit exclusions: no repeated full implementation source audit or scorecard; no proportional review of the three API/E2E-owned durable server tests while the authoritative API/E2E result is `Fail`; no attribution based on the unrelated broad-suite baseline failures or the excluded misconfigured restart attempt.

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: `BEH-001`, `UC-002`, `UC-003`, `REQ-002`, `REQ-007`, `AC-002`, and `AC-012` unambiguously require a user to cold-reopen and select the exact delegated task-Team member and see its stored conversation/activity. This is not a new requirement created by the failing probe.
- Design-spec behavior map verified against the implementation: **Contradicted.** `DS-004` ends at generic projection/hydration and asserts that Web can be reused unchanged, but the normal user journey additionally traverses the workspace navigation projection and exact-focus gate. Existing source intentionally removes every settled task execution from that path.
- Design review report and round confirmed: `ARCH-REV-002` passed the same incomplete `DS-004` projection/UI path and accepted unchanged Web reuse.
- Behavior-basis status: `Contradicted`
- Changed or newly discovered behavior: no new intended behavior. The newly exposed lifecycle fact is that normal cold TeamRun recovery changes previously active/awaiting delegated work to `interrupted` and assigns the task execution `settledAt`; existing frontend tests and source then intentionally make that historical task non-navigable.
- Remaining material ambiguity: intended user behavior is clear. The design must now define how historical navigation/focus retains settled delegated executions while preserving any genuinely live-only execution semantics; this implementation choice was omitted from `DS-004`.

| Behavior ID | Current Status | Current Implementation Path And Lifecycle Evidence | Contradicting Or Newly Discovered Supported Behavior Evidence |
| --- | --- | --- | --- |
| `BEH-001` | `Contradicted` | Backend cold projection is correct, but `getTeamRunResumeConfig -> hydrateCurrentTeamRunContext -> createTeamExecutionViewState -> projectNavigationRows -> focusAgent` drops/rejects the settled task member before its already-hydrated conversation can be selected. | The real workspace surface shows the task member before restart, then zero historical task rows after restart; the normal exact focus returns `TEAM_AGENT_RUN_NOT_VISIBLE`. This violates `AC-002`/browser `AC-012` despite the exact task API remaining non-empty. |
| `BEH-002` | `Confirmed` | The exact task AgentRun projection has 4 conversation entries, 2 activities, 4 Event Monitor events, non-null last activity, and a byte-identical raw trace after restart. | This counter-evidence rules out the reviewed physical-scope writer/reader and migration as the failure origin. |
| `BEH-003` | `Confirmed` | The direct-root Teacher remains visible and renders non-empty prompt/delegation history in the same cold browser session. | The shared browser/backend environment is healthy and the defect is specific to settled delegated execution navigation. |

## Focused Failure-Origin Analysis

1. `TeamRunStatePackageLoader.repairTasks()` converts stored `active`/`awaiting_review` tasks to `interrupted`, and `repairTree()` applies the recovery timestamp as `settledAt`. This is an existing normal TeamRun-reopen contract, not behavior introduced by commit `e6bca7a8b`.
2. `hydrateCurrentTeamRunContext()` still enumerates every execution Agent, fetches the exact projections, and constructs contexts for the settled task AgentRun. The non-empty backend data is therefore present in the hydrated client context.
3. `projectNavigationRows()` in `teamExecutionTreeSelectors.ts:166-175` unconditionally returns for `task.settled_at`; for a task Team this removes both the task-Team row and all of its member rows.
4. `focusAgent()` in `teamExecutionViewState.ts:310-318` first confirms the context exists, but then requires the AgentRun to appear in `projectNavigationRows()` and rejects the otherwise valid historical context as `TEAM_AGENT_RUN_NOT_VISIBLE` with “is not live.”
5. `openTeamRun()` in `teamRunOpenCoordinator.ts:29-48` applies the requested historical AgentRun through that focus gate, and `openTeamMemberRunFromHistory()` in `runHistorySelectionActions.ts:47-74` propagates the rejection to the exposed history surface.
6. The filtering/focus source and its explicit test (`teamExecutionViewState.spec.ts:273-302`) predate the reviewed branch (`3f3aafa7cf`, an ancestor of base `7edfb1625`); there is no diff in these files between the base and implementation commit. The failure is therefore not a regression introduced by the backend scope patch. It is a pre-existing frontend semantic that the approved change needed to alter for the already-approved cold historical task journey.

### Failure-origin verdict

- Direct technical origin: existing frontend task-navigation projection/focus semantics hide all settled task executions.
- Upstream origin: the reviewed design incompletely traced `DS-004`, explicitly classified Web as `Reuse unchanged`, and instructed implementation to expect no frontend production change despite `AC-002`/`AC-012` requiring settled historical task selection.
- Final classification: `Design Impact`.
- Why this is not `Local Fix`: a frontend-only patch would contradict the current approved design's subsystem allocation, change sequence, and implementation guidance. The solution package must first add the missing navigation/focus spine and define the historical-versus-live visibility boundary; the requirements themselves do not need clarification.
- Why this is not test/environment origin: the same production-like session proves live pre-restart selection, correct post-restart API/bytes, healthy direct-root UI, visible interrupted task record, and exact rejection through the normal history action. The excluded misconfigured restart is not used.

## Prior Review Gap And Affected Score Rationale

`CRR-001` contains a real source-review gap. The full production-path review accepted the design's “frontend production unchanged” premise and protected-surface audit without tracing `AC-002` through workspace historical navigation and exact focus. The contradictory invariant was reasonably discoverable in unchanged source: `projectNavigationRows()` removes `task.settled_at`, `focusAgent()` requires that row, and the focused unit test explicitly expects settlement to remove the task and repair focus to the Teacher.

The exact invariant that should have been caught was: **after a supported cold reopen settles an existing delegated task execution, the historical workspace path must still expose and focus the exact persisted task AgentRun required by `AC-002`/`AC-012`; live-only filtering cannot govern historical reachability.**

Accordingly, the prior `CRR-001` rationales for `Data-Flow Spine Inventory and Clarity`, `API/E2E Readiness`, and `Runtime Correctness And Behavioral Fidelity` are invalidated for the latest result. The historical `9.67/10` score remains recorded only as the round-1 result; no replacement scorecard is produced for this failure-origin-only round.

## Material Premise Validation

### Upstream Design-Review Material-Premise Decisions

| Premise ID | Current Status | Changed Evidence / Reason |
| --- | --- | --- |
| `MP-001` | `Confirmed` | API/E2E directly validated the approved two-path Memory Sync export/canonical semantic outcome; unrelated to this failure origin. |
| `MP-002` | `Confirmed` | API/E2E directly validated old flat remote retention plus canonical imported selection; unrelated to this failure origin. |

### `MP-003` — Cold historical open reaches a settled delegated execution

- Origin: `New`
- Related approved requirement or established contract: `UC-002`, `UC-003`, `REQ-002`, `REQ-007`, `AC-002`, `AC-012`; existing TeamRun reopen recovery contract in `TeamRunStatePackageLoader`.
- Relevant behavior ID(s): `BEH-001`
- Initiating basis kind: `User`
- Independent product-supported initiating trigger or applicable governing contract: after an operator performs the supported server/container restart in `UC-003`, a user opens the persisted TeamRun in the workspace history surface, expands the nested team, and selects the exact previously delegated task member, as required by `UC-002` and `AC-002`.
- Support evidence: the workspace tree is an exposed product surface; normal delegation produced the task-Team/member rows before restart, and the requirements explicitly require the same historical selection after restart. The real private-package/provider journey corroborates this supported path rather than defining it.
- Forward current or approved target production caller/event path that exercises the initiating basis and reaches the claimed state: stored active/awaiting task -> normal cold package repair in `TeamRunStatePackageLoader` -> task `interrupted` plus execution `settledAt` -> `getTeamRunResumeConfig` and exact member projections -> `openTeamMemberRunFromHistory` -> `openTeamRun` -> `hydrateLiveTeamRunContext` -> `createTeamExecutionViewState` -> `projectNavigationRows` -> `focusAgent` -> renderer.
- Lifecycle preconditions and material consequence at the claimed point: the run has a persisted delegated task Team/Agent and raw trace; restart recovery settles rather than resumes that task. The exact backend projection remains available, but unconditional settled-task filtering removes its row and causes exact focus to reject, so the user cannot reach the required history.
- Reachability: `Reachable`
- Review consequence / proportionate response: the failure may drive a finding and design reroute. Revise the design's frontend spine/boundary and mapped coverage, then implement and re-review the bounded source change before repeating API/E2E.

## Findings

### `CR-001` — Settled delegated task history is unreachable through the normal workspace navigation path

- Severity: `Critical`
- Classification: `Design Impact`
- Affected approved behavior: `BEH-001`, `UC-002`, `UC-003`, `REQ-002`, `REQ-007`, `AC-002`, browser `AC-012`; reachable through `MP-003`.
- Source evidence: `teamExecutionTreeSelectors.ts:166-175` removes every settled task (and all task-Team descendants); `teamExecutionViewState.ts:310-318` rejects an exact context absent from that projection; `teamRunOpenCoordinator.ts:45-48` makes the rejection fatal to normal historical open. `teamExecutionViewState.spec.ts:273-302` codifies the incompatible settled-task disappearance.
- Runtime evidence: post-restart task projection `4` conversation / `2` activities / `4` Event Monitor events with non-null last activity and identical raw bytes, but the historical tree has `0` task rows and exact focus rejects as not live. Direct-root history and the interrupted task record remain visible.
- Design evidence: `design-spec.md` `DS-004`, the subsystem allocation, and guidance line 620 require unchanged frontend reuse and omit the history-navigation/focus segment; `ARCH-REV-002` passed that map.
- Required action: `solution_designer` must revise the solution/design package to include the historical workspace navigation and exact-focus path, define how settled historical task Agent/task-Team executions remain reachable without broadening genuinely live-only semantics, map the affected frontend owners/files and durable regression expectations, and return the revised design through architecture review. Implementation must then change the approved frontend source/tests, return through source review, and repeat API/E2E.

## Classification

- `Design Impact`
- The requirements are unambiguous and the backend implementation is correct at the failing boundary. The reviewed design is incomplete/wrong about unchanged Web reuse, so upstream design correction is required before implementation rework.

## Recommended Recipient

`/solution_designer`

## Residual Risks

- Configured nested-member browser `AC-001` remains separately unproven; it must still be executed after the revised implementation, even though `NTH-BR-001` already blocks acceptance.
- The frontend currently uses one navigation projection for both live and historical contexts. The revised design must avoid accidentally redefining task lifecycle, resumption, or genuinely live-only collection semantics while restoring historical reachability.
- The three API/E2E-owned durable server-test changes have passing execution evidence but are not proportionally reviewed while the API/E2E result is `Fail`. They return for the separate successful test-code review only after a later API/E2E pass.
- Five unrelated persistent server E2E failures and two concurrency-sensitive failures remain documented as baseline/non-ticket evidence; they do not affect this origin classification.

## Latest Authoritative Result

- Review Decision: `Fail`
- Review Entry Point: `API/E2E Failure-Origin Review`
- Material-Premise Gate: `Pass` — `MP-003` is independently product-reachable; `MP-001`/`MP-002` remain confirmed.
- Score Summary: no scorecard repeated for this bounded failure-origin round. The `CRR-001` `9.67/10` score is historical and is not the current decision; its spine/readiness/runtime rationales are invalidated as described above.
- Failure Origin: pre-existing frontend settled-task visibility/focus semantics plus an inadequate reviewed `DS-004`/Web-reuse design; not the backend physical-scope/migration patch, durable API/E2E test code, or environment.
- Recommended Recipient: `/solution_designer`
- Notes: `API-REV-001` remains authoritative `Fail` at `82.7%`. After revised design and architecture approval, implementation-owned source/tests must return through code review and full API/E2E; delivery must not begin.
