# Code Review Report — remote-run-title (autobyteus-269)

## Review Round Meta

- Review Entry Point: `API/E2E Failure-Origin Review`
- Requirements Doc Reviewed As Context: `requirements-doc.md` (UC-601, REQ-601, AC-601, AC-605, DEC-601, DEC-602)
- Investigation Notes Reviewed As Context: `investigation-notes.md` (F-01 … F-07; F-04 is the window premise)
- Solution Revision Record Reviewed As Context: `solution-revision-record.md`
- Design Spec Reviewed As Context: `design-spec.md` (SR-003): "The window path is unchanged"; forbidden: "the window deriving titles for this case"; the rejected option "The window deriving the title from the loaded conversation … it would also show the packet header"
- Supplemental Task Artifacts Reviewed As Context: none
- Relevant Solution Revision IDs: SR-002, SR-003
- Design Review Report Reviewed As Context: N/A (direct route)
- Architecture Review Revision Record Reviewed As Context: N/A
- Relevant Architecture Review Revision IDs: N/A
- Implementation Handoff Reviewed As Context: `implementation-handoff.md` (Important Assumption 3, Known Risks)
- Implementation Revision Record Reviewed As Context: `implementation-revision-record.md`
- Relevant Implementation Revision IDs: IR-001
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-001`
- Current Review Round: 1. This is the first code-review result for the ticket (direct route).
- Review Scope: `N/A` (failure-origin round)
- Trigger: API/E2E API-REV-001 Fail, finding F-001
- Prior Review Round Reviewed: N/A
- Latest Authoritative Round: 1
- Coverage Investigation Reviewed: `api-e2e-coverage-investigation.md`
- Execution Coverage Report Reviewed: `api-e2e-execution-coverage-report.md`
- API/E2E Revision Record Reviewed: `api-e2e-revision-record.md`
- Relevant API/E2E Revision IDs: API-REV-001
- Failing Scenario IDs: API-03 (the browser journey: beta's sidebar, an active peer-started Agent run)
- Exact Failing Commands / Execution Mode: two dist servers and `nuxt dev` against beta, in a browser (`evidence/api-e2e/API-03-browser-journey.log`)
- Failure Evidence Paths: `evidence/api-e2e/API-03-browser-journey.log`, `evidence/api-e2e/API-03-beta-sidebar-active-runs.png`, `evidence/api-e2e/API-01-run1/remote-two-server-receipt.json`

## Routing Classification Review

- Task size: `Small`
- Architectural risk: `Low`
- Selected route: `API/E2E Failure-Origin Review`
- Independent source review required by the classification: `Failure-origin exception` (direct route)
- Classification evidence or correction required: the server change stays Small / Low. The fix needs a decision about the window's title rule, which the design explicitly left out.

## Review Scope

- Changed implementation and behavior reviewed: how the stored title (the server change, `05be574608`) reaches beta's sidebar for an active run.
- Files / areas reviewed:
  - `autobyteus-web/utils/runTreeLiveStatusMerge.ts` (`mergeHistoryRowWithContext`);
  - `utils/runTreeSummary.ts` (`resolveFirstUserMessageSummary`);
  - `stores/runHistoryReadModel.ts` (L86–95, L295);
  - `services/runHydration/runProjectionConversation.ts` (the `system_task_notification` mapping);
  - design and investigation premises, the handoff's assumptions, the API-03 evidence and the API-01 receipt.
- Explicit exclusions: the server change, whose E2E passed 30/30 (RC-05, RC-21, RC-22, RC-30).

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: UC-601, "the owner of a node sees what a peer-started run is about in its sidebar". AC-601 is the stored title; AC-605 is the user's goal, a real title in the sidebar.
- Design-spec behavior map: the server records the title, and the window path is unchanged. This rests on investigation F-04: "Once the stored summary is set, the window shows it", with the live fallback applying only to "a run whose conversation is loaded in the window".
- Behavior-basis status: `Contradicted`. The design's premise about the window doesn't hold.
- Changed or newly discovered behavior: see below.
- Remaining material ambiguity: which window rule to choose (a design decision).

| Behavior ID | Status | Implementation Path And Lifecycle Evidence | Contradicting Evidence |
| --- | --- | --- | --- |
| BEH-601 (the server title) | Confirmed | `RemoteMessageReceiver` → `recordRunTitle` → first non-empty; API-01 RC-05/RC-21/RC-22/RC-30 | — |
| BEH-601 / UC-601 (the sidebar shows it) | Contradicted for active peer-started Agent runs | `runHistoryReadModel` L295 → `mergeRunTreeWithLiveContexts` → `mergeHistoryRowWithContext` L46–51. Whenever the window has a live context for the run, the row's `summary` is replaced by `resolveFirstUserMessageSummary(context.state.conversation)`, whatever the stored summary is. The window creates live contexts for every active run on load: pinia `agentContexts.runs` held the Publisher run with nothing opened (API-03). | The work packet is in the conversation as `kind: "message", role: "user"` (`getRunProjection` on scripted AGY; 247's live check showed the same on the AutoByteus runtime). It becomes a `user` message, so the live summary is "You have a new task from the agent with sender run id …". The handoff's Assumption 3 ("a hydrated or streamed work packet is a `system_task_notification`") holds only where the runtime's projection emits that kind. The Known Risk ("an open run after an owner message") understated the scope: it applies to any active run, without an owner message. |

## Supported Product Scenario And Reachability Gate (Mandatory)

| Scenario ID | Related IDs | Kind | Actor | Goal | Entry Surface | Shape | Forward Path | Expected Outcome | Evidence | Validity | Use |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-F001 | UC-601, REQ-601, AC-601, AC-605 | User | Owner of the receiving node | See what a peer-started run is about in the sidebar, while it is working | beta's history sidebar (open, reload) | Normal | A peer delegates to a shared Agent; the run is active; the owner opens beta's window; the sidebar row of the run shows its title | The row shows "Cut the launch trailer and have it checked. Marker AGENT-TITLE." | API-03: the row shows the packet wrapper while active, also after a reload, and the stored title after the run stops. The Team row is correct | Supported Normal Scenario (the Task's own scenario: the user's real cross-node use) | Use |

### Candidate Finding And Mechanism Gate

| Candidate ID | Observation Or Mechanism | Scenario / Contract ID | Independent Trigger | Forward Path / Consequence | Evidence | Disposition | Scope | Reason / Proportionate Response |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C-1 (F-001) | For an active run, the window's live merge replaces the stored title with the first `user` message, which for a peer-started Agent run is the work-packet wrapper | SCN-F001 | A peer's delegation, while the run is active | The sidebar shows "You have a new task from …" instead of the title. UC-601 / AC-605 are not met for the commonest case, a run that is working | API-03 log and screenshot; `runTreeLiveStatusMerge.ts` L46–51; the projection role `user` | Promote | This ticket | It needs a decision about the window's title rule, which the design excluded and forbade. The owner is upstream |
| C-2 | An implementation-only fix (for example, filtering lines that start with "You have a new task" in the window) | — | — | It would make the window parse the packet's wording, a second owner of the packet text | — | Reject | — | It is a patch on text, not on ownership |
| C-3 | An open standalone run after an owner message shows the owner's message (the handoff's Known Risk) | SCN-F001 | — | It is the same mechanism as C-1 and is fixed by the same rule decision | handoff Known Risks | Promote (merged into F-001) | This ticket | Same root cause |

## Findings

| Finding ID | Severity | Path | Evidence | Required Action | Classification / Owner |
| --- | --- | --- | --- | --- | --- |
| F-001 (API/E2E's ID kept) | Medium | Design premise: investigation F-04, design "the window path is unchanged". Code: `autobyteus-web/utils/runTreeLiveStatusMerge.ts` L46–51 | See C-1 | Revise the design and decide the window's title rule for a run whose stored title exists. The options API/E2E named: (a) the live first-user-message summary applies only when the stored summary is empty (a draft or brand-new run), so a non-empty stored title wins. For user-started runs, both come from the same first message, so their rows read the same apart from the moment before the title is stored. Or (b) a work packet is never a `user` message in the window: the projection or runtime marks it as `system_task_notification` for every runtime. That is a wider change across runtimes, and it also changes how the conversation shows the packet. Option (a) looks smaller and keeps one title source (the server), in line with the design's own rejection of window-derived titles. Correct investigation F-04, the design's window statement, and Assumption 3 to match. Add a check of the sidebar row (Agent and Team, active and after a reload) to the validation plan; a durable browser probe or a merge unit test would also help. | Design Impact / `solution_designer` |

## Follow-ups

- Follow-ups this review added: None.

## Classification

- `Design Impact`. The design rests on a window premise that is wrong (F-04). It explicitly left out and forbade the window change that delivering UC-601 needs. Choosing between (a) and (b) is a design decision; the server change itself is correct.

## Recommended Recipient

- `/software_engineering_team/solution_designer`

## Residual Risks

- After the revision: rerun the browser check of the sidebar (Agent and Team, active and after a reload). API-01 stays valid if only the window changes.
- AC-605 is the user's check on his Docker node.

## Latest Authoritative Result

- Review Decision: `Fail`. The failure origin is confirmed as design (Design Impact).
- Review Entry Point: `API/E2E Failure-Origin Review`
- Supported Product Scenario Gate: `Pass` (SCN-F001 is the supported normal scenario)
- Material-Premise Gate: `Fail`. Investigation F-04 / design "the window shows the stored title" is contradicted.
- Score Summary: N/A (failure-origin round)
- Failure Origin: design premise. While a run is active, the window's live merge replaces the stored title with the first `user` message, and the work packet is a `user` message on the runtimes observed.
- Recommended Recipient: `/software_engineering_team/solution_designer`
- Notes: the server change (`05be574608`) is correct and needs no rework. API/E2E's preliminary classification is confirmed.
