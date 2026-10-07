# Code Review Report — `reactivate-done-task-runs`

## Review Round Meta

- Review Entry Point: `Implementation Review`
- Requirements Doc Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/reactivate-done-task-runs/tickets/in-progress/reactivate-done-task-runs/requirements-doc.md` (SR-002, Approved)
- Investigation Notes Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/reactivate-done-task-runs/tickets/in-progress/reactivate-done-task-runs/investigation-notes.md`
- Solution Revision Record Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/reactivate-done-task-runs/tickets/in-progress/reactivate-done-task-runs/solution-revision-record.md`
- Design Spec Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/reactivate-done-task-runs/tickets/in-progress/reactivate-done-task-runs/design-spec.md` (SR-002)
- Supplemental Task Artifacts Reviewed As Context: None (the package declares none)
- Relevant Solution Revision IDs: `SR-002`
- Design Review Report Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/reactivate-done-task-runs/tickets/in-progress/reactivate-done-task-runs/design-review-report.md` (round 2, Pass)
- Architecture Review Revision Record Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/reactivate-done-task-runs/tickets/in-progress/reactivate-done-task-runs/architecture-review-revision-record.md`
- Relevant Architecture Review Revision IDs: `ARCH-REV-002`
- Implementation Handoff Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/reactivate-done-task-runs/tickets/in-progress/reactivate-done-task-runs/implementation-handoff.md`
- Implementation Revision Record Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/reactivate-done-task-runs/tickets/in-progress/reactivate-done-task-runs/implementation-revision-record.md`
- Relevant Implementation Revision IDs: `IR-001`
- Code Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/reactivate-done-task-runs/tickets/in-progress/reactivate-done-task-runs/code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-001`
- Current Review Round: `1`
- Review Scope: `Full Review`
- Review Scope Evidence (round >1): N/A
- Trigger: Implementation complete (IR-001) from `/implementation_engineer`, 2026-10-07
- Prior Review Round Reviewed: N/A (no prior code review)
- Latest Authoritative Round: `1`
- Coverage Investigation / Execution Coverage Report / API/E2E Revision Record: N/A (implementation review)
- Relevant API/E2E Revision IDs: N/A
- Delivery Revision Record / IDs: N/A
- Failing Scenario IDs / Commands / Evidence: N/A
- Reviewed code: worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/reactivate-done-task-runs`, branch `codex/reactivate-done-task-runs`, commit `3394e7078` against `origin/personal@cfeda548`.

## Routing Classification Review

- Task size: `Large`
- Architectural risk: `High`
- Selected route: `Implementation Review`
- Independent source review required by the classification: `Yes`
- Classification evidence or correction required: None. About 46 changed source files in the server, two contract packages and the web app. The change reverses "closed is forever", adds a persisted state transition, changes the Task ownership fence and adds a concurrency rule with DONE/release.

## Review Scope

- Changed implementation and behavior reviewed: assigner reactivation of a closed `assigned` entry (DS-001/DS-L1); the backend discard of released authority; the reopened event from root to projector to contract to web (DS-002); `target_kind` (DS-004); agent-facing texts and docs (REQ-011).
- Files / areas reviewed:
  - Server Task side: `task-agent-resources.ts`, `project-errors.ts`, `task-agent-resource-service.ts`, `project-task-service.ts`.
  - Runtime: `task-agent-resource-port.ts`, `root-task-execution-adapter.ts`, `root-task-execution-lifecycle.ts`, `root-task-execution-command-queue.ts`, `root-task-agent-resource-scope.ts`, `root-task-dispatch.ts`, `task-delegation-command.ts`.
  - Adapters (×3) and backends: root agent registry, root team directory, `TeamRun`, flat backend/manager, task agent and task team registries, `TeamRunResolver`.
  - Facades (×3), events (×3), projectors (×3), `task-delegation-result-contract.ts`, the LLM contract and the project-task tool contract.
  - Both stream-contract packages (`src`).
  - Web: `taskExecutionClosure.ts`, `teamExecutionViewState.ts`/`ViewModels.ts`, `agentRunCollaborationContext.ts`, `agentOrgExecutionContext.ts`; the streaming service and store callback were checked.
  - Docs.
  - New and changed tests.
- Reviewer verification run: `pnpm exec vitest run` on the three new reactivation test files, `tests/unit/standalone-agent-run-root`, `team-execution-view-projector.test.ts`, `root-task-execution-lifecycle.test.ts` and `task-agent-resource-dispatch.test.ts`: 8 files, 113 tests, all pass.
- Explicit exclusions:
  - Rebuilt contract `dist/` output was not reviewed line by line.
  - Rendered evidence was accepted as the implementer's self-check.
  - Real-runtime AC-001..015 and the browser restart journey belong to API/E2E.

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: Yes. The agent alone owns Task status. After the agent moves a DONE Task to TODO/IN_PROGRESS, a `send_message_to(target_agent_run_id)` from the recorded assigner to the assignment's ingress reopens exactly that entry, restores the copy with its conversation, delivers, and shows the rows again. A message while the Task is DONE, from another sender, or to a non-ingress run is refused with guidance and changes nothing.
- Design-spec behavior map verified against the implementation: Yes (table below).
- Design review report and round confirmed: ARCH-REV-002, Pass. AR-002 (queue-head `isOpen` skip), AR-003 (`prompt_engineering.md`) and AR-004 (no status write; AC-015) are all applied.
- Behavior-basis status: `Confirmed`
- Changed or newly discovered behavior: None.
- Remaining material ambiguity: None.

| Behavior ID | Current Status | Current Implementation Path And Lifecycle Evidence | Contradicting / Newly Discovered Evidence |
| --- | --- | --- | --- |
| BEH-001 | Confirmed | All three facades call `deliverToExactTarget`. `reactivateClosedTarget` runs: `ownerOf(target).open === false` → `taskExecutionWithIngress` → `assertReopenable` → queue `reopen` (AR-002 skip, `discardReleasedExecution`, `assertRestorableChain`) → `reopenAssignment` (under `serialize`) → publish → `withLiveLease(sender, deliver)` → result note | — |
| BEH-002 | Confirmed | `updateTask*`/`closeAndWrite` are not in the diff. `assertTaskNotDone` runs once as an advisory check and again under `serialize`. No `task.json` write on this path | — |
| BEH-003 | Confirmed | Publish only when `reopened`, after the commit. Projectors ×3, contract schemas, web `removeReopenedTaskExecutions` ×3. The snapshot follows the `swap` → `closedRunsByHostRootKey` | — |
| BEH-004 | Confirmed | Team adapters map a coordinator to `{teamRunId}`. Directory/resolver retire the terminated TeamRun into `releasedTeams`, and the restored run inherits the proof. The backend test restores a new TeamRun in all three root kinds | — |
| BEH-005 | Confirmed | `reopenTaskAgentResource` maps only the targeted key; helpers are refused (`role !== "assigned"`). The backend test checks that helper acquisition counts do not change | — |
| BEH-006 | Confirmed | A non-ingress target is refused in the lifecycle. A non-assigner gets `ASSIGNER_ONLY_REACTIVATION_MESSAGE` | — |
| BEH-007 | Confirmed | `dispatchTaskCopy` and `ensureTaskHelper` return `target_kind`; the strict schema requires it on success | — |
| BEH-008 | Confirmed | DONE path unchanged. Texts in both contracts and `prompt_engineering.md` updated; no "for good" / "unless its Task is DONE" remains in `src` or `docs` | — |

## Supported Product Scenario And Reachability Gate (Mandatory)

| Scenario ID | Related IDs | Kind | Actor / Initiator | Goal / Event | Entry Surface | Shape | Forward Path / Lifecycle | Expected Outcome | Independent Evidence | Validity | Review Use |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | BEH-001/002, REQ-001..003/007 | Contract | Assigning agent | Continue with the same agent worker after DONE | `create_or_update_task` then `send_message_to(target_agent_run_id)` | Normal | Router → sender root facade → DS-L1 → wake/restore → deliver | Worker restored; status as the agent set it | Requirements SR-002 (user 2026-10-07) | Supported Normal Scenario | Use |
| SCN-002 | BEH-004 | Contract | Assigning agent | Continue with the same team | Same, to the coordinator run ID | Normal | Same; team discard → restore new TeamRun | Team restored, coordinator receives | Requirements SR-002 | Supported Normal Scenario | Use |
| SCN-003 | BEH-003 | User | User | See the reactivated worker | Run tree (live, reload, restart) | Normal | Reopened event / snapshot view | Rows reappear | Requirements REQ-008 | Supported Normal Scenario | Use |
| SCN-004 | BEH-002/005/006, REQ-003..006 | Contract | Early assigner, other sender, wrong target | Refusal | `send_message_to` | Explicit Edge | DS-L1 refusals before the commit | Coded refusal; nothing changes | DEC-001/002, SR-002 | Supported Explicit Edge Scenario | Use |
| SCN-005 | BEH-008, REQ-009 | Contract | Assigning agent | Close again | DONE after reactivation | Normal | Unchanged DONE path | Closed, stopped, hidden | REQ-009 | Supported Normal Scenario | Use |
| QR-001 | REQ-001/003/009 | Contract | System | DONE concurrent with a reactivation | DONE + message | Explicit Edge | `serialize(taskId)` re-check | DONE wins entirely before or after | Requirements QR-001 | Supported Explicit Edge Scenario | Use |

### Candidate Finding And Mechanism Gate

| Candidate ID | Observation Or Mechanism | Scenario / Contract ID | Independent Trigger | Forward Path / Lifecycle / Consequence | Evidence | Disposition | Reason / Proportionate Response |
| --- | --- | --- | --- | --- | --- | --- | --- |
| C-001 | Release settlement placed in `RootTaskAgentResourceScope.discardReleasedExecution` (reusing the extracted `settleExactRelease`) instead of each adapter, as the design text placed it | Design ownership map; Repeated Coordination trigger | SCN-001/002 | Same behavior; adapters only drop the exact authority | `root-task-agent-resource-scope.ts`; the DONE path calls the same `settleExactRelease` | Reject | This is a better fit for the ownership model, not a defect. The scope already owned release settlement, and the change avoids three copies of the policy. Recorded as an accepted deviation. |
| C-002 | Queue `reopen` discards released authority before the Task-side commit; a racing DONE or deletion can then refuse the commit | QR-001 | DONE between the queue step and `reopenAssignment` | The entry stays closed, and only an already released (fenced/terminated) authority was dropped. A later DONE release sees `EXACT_RELEASE_AUTHORITY_UNAVAILABLE` (= stopped); a later reactivation restores fresh | `root-task-execution-lifecycle.ts` `reactivateClosedTarget`; backends keep live/non-terminated runs; test "a DONE that commits while the stop is being settled wins" | Reject | No material consequence; no input reaches a closed run. |
| C-003 | Two concurrent reactivating messages (P-002) | Architecture P-002 (Unclear) | — | The AR-002 queue-head `isOpen` skip, plus backends keeping live handles | Two deterministic tests; mutation check reported | Reject | AR-002 guidance is applied. No further machinery is warranted for an `Unclear` premise. |
| C-004 | Standalone and Org adapters carry identical `discardReleasedExecution` / `taskExecutionWithIngress` bodies | Engineering contract: no unjustified duplication | — | 2 × ~8 lines | Both adapters already mirror each other (e.g. `releaseOwnedExecution`) | Reject | Follows the established per-root adapter structure. Extracting a shared adapter base would be out-of-scope refactoring. Non-blocking note only. |
| C-005 | Reactivation runs before the sender's live lease (order changed from the old facade) | SCN-001, SCN-004 | Assigner message | Open/unowned targets return `false` immediately, so the old path is unchanged. A closed target needs a verified assigner, and assigners are unowned | `deliverToExactTarget`; AC-014 test "a message to an open copy or to an unowned agent takes the unchanged path" | Reject | No behavior change for supported paths. |
| C-006 | `teamExecutionViewState.ts` at 494 effective lines | Source size rule (>500) | — | +11 lines | Line count | Reject | Under the hard limit and the delta is small. Size pressure is recorded as a residual risk. |

## Structural / Design Checks

| Check | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Task design health assessment preserved | Pass | Owners extended along seams. The only extraction (`settleExactRelease`) is private to the scope owner | — |
| Matches behavior-defining supplements | Pass | None declared | — |
| Data-flow spine inventory clarity and preservation | Pass | DS-001/DS-L1 lives in one method pair in the lifecycle; DS-002 is symmetric with closed; DS-004 is in dispatch | — |
| Ownership boundary preservation | Pass | Task side decides eligibility and commits; the lifecycle sequences; adapters/backends only drop exact authority | — |
| Off-spine concern clarity | Pass | Discard, publish and result note stay off the main line | — |
| Existing capability reuse | Pass | Reuses the queue, `serialize`, `assertRestorableChain`/`restoreChain`, the closure pipeline and the closed DTOs | — |
| Reusable owned structures | Pass | `settleExactRelease` shared by DONE and reactivation; `teamTaskExecutionsReopenedPayloadSchema` aliases closed | — |
| Shared-structure tightness | Pass | No new persisted field; `target_kind` is a two-value enum; `TaskAgentResourceReopenInput` is minimal | — |
| Repeated coordination ownership | Pass | One reactivation owner (lifecycle); facades only bind delivery | — |
| Empty indirection | Pass | `TeamTaskExecutionService.deliverToExactTarget` mirrors the existing `withLiveLease` forwarding of that service | — |
| Separation of concerns / file responsibility | Pass | Each change sits in its owning file | — |
| Ownership-driven dependency | Pass | `agent-collaboration` has no new `projects/*` import; the runtime reaches the Task side through the port only | — |
| Authoritative Boundary Rule | Pass | Facades → lifecycle only; lifecycle → port/adapter only; no caller reaches backend registries directly | — |
| File placement | Pass | No new source files | — |
| Flat-vs-over-split | Pass | DS-L1 kept in the lifecycle (+48 lines); the optional extraction was not needed | — |
| Interface clarity | Pass | Explicit `{agentRun, requestedBy}`; `taskExecutionWithIngress(agentRunId)`; exact-reference discards | — |
| Naming | Pass | `reopenAssignment`, `discardReleasedExecution`, `task_executions_reopened`, `target_kind` | — |
| No unjustified duplication | Pass | See C-004 (follows existing adapter mirroring) | — |
| Patch-on-patch complexity | Pass | Single coherent change | — |
| Dead/obsolete cleanup | Pass | "Closed is forever" comment and texts replaced; the facades' bare `withLiveLease` replaced | — |
| Test scenarios clear and requirement-aligned | Pass | Test names cite AC/REQ; real registries in the backend test; persistence and no-status-write asserted | — |
| Test fixtures/helpers reusable and coherent | Pass | Extends the existing `task-agent-resource-fixtures` and `task-release-generation-fixtures` | — |
| No stale/compat-only tests | Pass | Existing pins updated for `target_kind` and the new texts | — |
| API/E2E readiness | Pass | Refusal codes and messages documented in `docs/modules/projects.md`; coverage hints listed in the handoff | — |

## Source File Size And Structure Audit

All changed implementation-source files are ≤ 500 effective non-empty lines. No file has a delta above 220 lines.

| Source File | Effective Non-Empty Lines | `>500` | `>220` Delta | SoC / Ownership | Placement | Classification | Required Action |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `autobyteus-web/services/teamExecution/teamExecutionViewState.ts` | 494 | Pass (near) | Pass (+11/−1) | Pass | Pass | Size pressure only | None now (residual risk) |
| `.../local/flat-team-execution-manager.ts` | 457 | Pass | Pass (+4) | Pass | Pass | OK | — |
| `.../domain/root-team-run.ts` | 455 | Pass | Pass (+2/−1) | Pass | Pass | OK | — |
| `.../standalone-agent-run-root.ts` | 400 | Pass | Pass | Pass | Pass | OK | — |
| `.../agent-org-task-execution-adapter.ts` / `standalone-root-task-execution-adapter.ts` | 370 / 358 | Pass | Pass (+14) | Pass | Pass | OK | — |
| `src/projects/services/project-task-service.ts` | 347 | Pass | Pass (+36/−1) | Pass | Pass | OK | — |
| `.../task/root-task-execution-lifecycle.ts` | 298 | Pass | Pass (+48/−2) | Pass | Pass | OK | — |
| `src/projects/services/task-agent-resource-service.ts` | 227 | Pass | Pass (+29/−2) | Pass | Pass | OK | — |
| `.../task/root-task-agent-resource-scope.ts` | 118 | Pass | Pass (+37/−16) | Pass | Pass | OK | — |
| Other changed sources (all ≤ 312) | — | Pass | Pass | Pass | Pass | OK | — |

## Legacy / Backward-Compatibility Verdict

| Check | Result | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms | Pass | One reopen rule for old and new entries |
| No legacy old-behavior retention | Pass | Permanence wording removed |
| Dead/obsolete cleanup | Pass | — |
| Persisted-data decision followed (`Directly Usable — No Migration`) | Pass | Only `closedAt → null` on one entry, in one `store.update` under `serialize`; an already-open entry writes nothing |
| No version-specific dual reads/writes | Pass | — |
| Transition mechanics match the reviewed design | Pass | No migration; `task.json` untouched |

## Dead / Obsolete / Legacy Items Requiring Removal

None.

## Docs-Impact Verdict

- Docs impact: `Yes`, done in this change.
- Why: the DONE contract changed from permanent to reactivatable; new event and result field.
- Files updated:
  - server `docs/modules/projects.md` (Reactivation section and refusal table), `agent_team_execution.md`, `agent_communication.md`, `standalone_agent_run_root.md`, `prompt_engineering.md`;
  - web `docs/projects.md`, `agent_teams.md`, `chat.md`;
  - root `TESTING.md`.
- Outside this repository (follow-up note): the agent repository's `project-task-management` skill text.

## Additional Material Premise Validation

### Upstream Design-Review Material-Premise Decisions

| Premise ID | Current Status | Changed Evidence / Reason |
| --- | --- | --- |
| P-001 (restore fails after commit) | Confirmed | Implemented as designed. The rejection message says the copy was reactivated but not reached; the entry stays open (tested) |
| P-002 (two concurrent reactivations) | Confirmed | Still `Unclear` as a scenario; the AR-002 guard is implemented and tested (C-003) |
| P-003 (closed published before reopened) | Confirmed | Publish runs synchronously after the commit; unchanged |

New or reclassified premises: None.

## Review Scorecard (Mandatory)

- Overall score (`/10`): 9.4
- Overall score (`/100`): 94

| Priority | Category | Score | Why This Score | What Is Weak / Holding It Down | What Should Improve |
| --- | --- | --- | --- | --- | --- |
| 1 | Data-Flow Spine Inventory and Clarity | 9.5 | DS-L1 reads top to bottom in one method; the facades show the spine entry clearly | — | — |
| 2 | Ownership Clarity and Boundary Encapsulation | 9.5 | Port/adapter seams respected. Eligibility stays on the Task side; settlement stays in the scope owner | — | — |
| 3 | API / Interface / Query / Command Clarity | 9.4 | Explicit identity shapes; `reopened` flag; coded refusals | The design's separate `TASK_REACTIVATION_REJECTION_CODES` list adds a second code list (justified so `delegate_task` mapping is unchanged) | — |
| 4 | Separation of Concerns and File Placement | 9.3 | Changes are in the owning files; no new source files | `teamExecutionViewState.ts` is near the size limit (pre-existing) | Consider splitting that file in a later change |
| 5 | Shared-Structure / Data-Model Tightness | 9.5 | Reopened DTOs alias the closed DTOs; no persisted shape change | — | — |
| 6 | Naming Quality and Local Readability | 9.3 | Names match responsibilities; doc comments explain the lifecycle intent | A few dense one-line statements in adapters (house style) | — |
| 7 | API/E2E Readiness | 9.3 | Refusal table documented; coverage hints precise; rendered self-check in 3 roots | Real-runtime and restart journeys still pending (expected for this stage) | — |
| 8 | Runtime Correctness And Behavioral Fidelity | 9.4 | Re-validation under `serialize`; publish only after the commit; AR-002 guard; backends keep live runs; real-registry tests per root kind | Discard before commit (C-002) is harmless but is an ordering readers must understand | — |
| 9 | No Backward-Compatibility / No Legacy Retention | 9.6 | One path; permanence wording removed | — | — |
| 10 | Cleanup Completeness | 9.4 | Texts, docs and tests updated; AR-003 applied | Agent-repo skill text is an external follow-up | — |

## Findings

None.

## Classification

N/A (Pass).

## Recommended Recipient

`/api_e2e_engineer` (per `get_handoff_rules`).

## Residual Risks

- `autobyteus-web/services/teamExecution/teamExecutionViewState.ts` is at 494 effective lines. The next addition there should split it.
- The late-DONE-release safety after a reactivation depends on `releaseTaskAgentResources` re-checking `isClosed` (ARCH residual risk carried forward).
- The real-runtime AC-001..015, AC-011 restart and AC-004 browser restart journeys are unverified until API/E2E. `tests/e2e/runtime/mixed-task-delegation.e2e.test.ts` key pins were updated but not run.
- Follow-up outside this repository: the agent repository's `project-task-management` skill text about DONE.

## Latest Authoritative Result

- Review Decision: `Pass`
- Review Entry Point: `Implementation Review`
- Supported Product Scenario Gate: `Pass`
- Material-Premise Gate: `Pass`
- Score Summary: 9.4/10 (94/100); every category ≥ 9.3
- Failure Origin: N/A
- Recommended Recipient: `/api_e2e_engineer`
- Notes: The deviation from the design text (release settlement in the scope owner instead of in each adapter) is accepted as a better ownership fit with the same behavior.
