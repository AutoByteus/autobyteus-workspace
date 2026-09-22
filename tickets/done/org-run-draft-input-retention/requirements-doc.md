# Requirements Document

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-003`
- Package identifier: `org-run-draft-input-retention`
- Request / ticket: User-reported loss of unsent Agent Org member input and context files when navigating to another run/member and back (2026-09-22)
- Requirements owner: Solution Designer
- Date: 2026-09-22
- Approval state and reference: Explicitly approved by the user in conversation on 2026-09-22 ("approve")
- Exact approved requirements baseline / solution revision: `SR-002`
- Behavior-defining supplements and their approved versions: N/A — the supplied screenshots are investigation evidence, not a separate behavior-defining specification

## Problem And Desired Outcome

- Problem: An unsent Agent Org member draft is stored on an in-memory `AgentContext`, but leaving that Agent Org root currently disposes the entire retained root context. Reopening the root hydrates sent/server-backed conversation state into new `AgentContext` objects whose composer fields start empty, so unsent text and selected context files disappear.
- Affected actors or systems: AutoByteus desktop/web users composing messages in Agent Org members; Agent Org workspace navigation and retained execution context lifecycle. Standalone Agent and Agent Team paths are adjacent regression surfaces but current evidence does not show the same lifecycle defect.
- Desired outcome: During the current application session, users may draft text and context-file selections in any supported standalone Agent, Agent Team member, or Agent Org member composer, navigate to other runs or surfaces, and return without losing the draft. This applies equally to newly started and existing runs, with exact run/member isolation.
- Observable definition of success: The reported cross-Agent-Org navigation sequence restores the original draft exactly, and the same product contract holds across newly started and existing standalone Agent, Agent Team, and Agent Org runs; send, failure, stop, archive, delete, and sent-history behavior remains correct.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Related Scenario IDs | Evidence-Backed Current Behavior | Desired Behavior | Intentionally Preserved Behavior | Investigation Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | SCN-001, SCN-002 | Text and attachments are committed to the selected member's `AgentContext`, but cross-root or surface navigation causes `AgentOrgWorkspaceView` to call `disconnectAgentOrg`; `disconnect` deletes the root context, and later inspection creates empty composer state. | Retain the exact member draft across ordinary in-session navigation away from and back to an Agent Org root. | Composer remains local draft state until send; no new UI or prompt is required. | User screenshots; `AgentUserInputTextArea.vue:217-224`; `ContextFilePathInputArea.vue:200-240`; `AgentOrgWorkspaceView.vue:140-149`; `agentOrgContextsStore.ts:99-111`; temporary reproduction test. |
| BEH-002 | Contract | SCN-001, SCN-003 | Same-root member switching is already isolated by exact `AgentContext`; context attachments use `{orgRunId, agentRunId}` ownership. Cross-root disposal loses state rather than leaking it. | Preserve strict draft isolation by exact Agent Org root and agent execution identity; visiting or typing in one draft cannot overwrite or appear in another. | Exact upload/finalization ownership and current async target capture remain unchanged. | `AgentOrgExecutionContext` context map and selection; `contextFileOwner.ts`; existing Agent Org composer/context-file tests. |
| BEH-003 | User | SCN-006 | Successful sends clear local composer state and persist a user message; failed sends restore untouched drafts while newer edits win. Stopping an Org retains the draft. | Keep these existing outcomes unchanged. | Successful-send clearing/finalization, rejected-send recovery, newer-edit preservation, and stop/continuation behavior. | `agentOrgContextsStore.ts:179-230`; Agent Org composer/context-file/termination tests (82 passing). |
| BEH-004 | User | SCN-004 | Standalone Agent contexts and Agent Team contexts remain in central maps across ordinary navigation; their composer state is not removed by workspace unmount. Existing exact-member tests pass. | Enforce the same in-session draft-retention contract for standalone Agent and Agent Team as for Agent Org, for both newly started and existing runs. | Existing selection, hydration, focus, and draft isolation behavior. | User clarification on 2026-09-22; `agentContextsStore.ts`; `agentTeamContextsStore.ts`; `activeContextStore.spec.ts`; shared composer tests (41 passing with related suites). |
| BEH-005 | Operational | SCN-005 | Explicit archive/delete cleanup removes retained local run context. Application reload/restart also reconstructs stores; unsent text is not server-persisted. Uploaded draft files use the existing 24-hour cleanup policy. | Ordinary navigation must no longer act like disposal; explicit archive/delete and application-session end remain valid release boundaries. | No new cross-restart draft guarantee; no TTL extension or persistence/API contract change. | `runHistoryMutationActions.ts:72-78,245-294`; `context-file-draft-cleanup-service.ts:6-21`. |
| BEH-006 | User | SCN-006 | Sent messages are server-backed conversation data and rehydrate after reopening, explaining why the user does not see the same loss for already-sent content. | Keep sent conversation hydration unchanged. | Existing message persistence, history, and attachment finalization behavior. | `agentOrgContextHydration.ts`; `runProjectionConversation.ts`; user report. |

## Stakeholders, Actors, And Outcomes

| Actor / Stakeholder | Goal Or Responsibility | Required Outcome | Important Constraint |
| --- | --- | --- | --- |
| User composing an Agent Org message | Temporarily visit another run/member without redoing unfinished work | Original text and context-file selections reappear exactly on return | No cross-root/member leakage |
| User composing in standalone Agent or Agent Team | Continue relying on current draft retention | No regression from the Agent Org fix | Preserve exact context/member ownership |
| Frontend runtime | Own in-session composer and execution-view lifecycle | Retain local drafts while safely retiring inactive transport work | Do not keep duplicate authoritative contexts for the same root |
| Context-file service | Store and finalize uploaded draft files under exact ownership | Existing owner validation, deletion, finalization, and cleanup remain valid | No schema, locator, or TTL change in this task |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

- `UC-001`: Navigate from an Agent Org member with an unsent draft to a member of another Agent Org root, then return.
- `UC-002`: Navigate from an Agent Org member with an unsent draft to a standalone Agent, Agent Team, run configuration, or another normal workspace surface, then return during the same application session.
- `UC-003`: Switch between members within one Agent Org and retain each exact member's independent draft.
- `UC-004`: Preserve and regression-test standalone Agent and Agent Team draft retention and isolation across supported in-session navigation, for both newly started and existing runs.
- `UC-005`: Preserve existing successful-send, failed-send, stop/continuation, archive, delete, and sent-history behavior.
- `UC-006`: Complete an attachment upload that was started for one member even if navigation changes before completion, retaining it only on its captured draft owner.

### Out Of Scope

- Persisting unsent text or attachment-selection metadata across application reload, process restart, sign-out, or device transfer.
- Extending the existing 24-hour draft attachment file TTL.
- Redesigning the composer, navigation tree, Agent Org experience, or context-file UI.
- Changing Agent Org, Agent Team, or Agent runtime APIs, server message contracts, stored conversation schemas, or run-history schemas.
- Recovering draft attachments whose files already expired or were externally deleted.
- General autosave/version-history functionality.

### Non-Goals

- Do not turn unsent drafts into messages or server history entries.
- Do not preserve drafts after explicit archive or delete of the owning run.
- Do not introduce compatibility wrappers, dual draft stores, or cross-identity fallbacks.

### Preserved Behavior Boundary

- Preserve `BEH-002` through `BEH-006` and the outcomes in `REQ-002` through `REQ-006` / `AC-003` through `AC-010`.
- The fix must not weaken exact `{orgRunId, agentRunId}` attachment ownership or permit one composer to display another identity's state.

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID that it protects.
- A finding that would introduce new product behavior, policy, threat model, migration obligation, compatibility promise, or operational contract is a `Requirement Gap`; it requires explicit user approval before becoming authoritative.
- An adjacent concern outside the approved boundary may be recorded as a non-blocking risk, recommendation, or separate-ticket candidate. It is not a required design correction.
- A downstream reviewer comment does not amend this requirements basis. The Solution Designer must update the canonical requirements and obtain renewed user approval before a scope-changing proposal can govern design or implementation.

## Requirements

| Requirement ID | Requirement | Related Behavior IDs | Priority / Criticality | Rationale | Source / Decision Reference |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | During one application session, ordinary workspace navigation must preserve unsent composer text and selected context attachments for every supported standalone Agent, Agent Team member, and Agent Org member composer, whether the owning run is newly started or existing. | BEH-001, BEH-004 | Critical | Users must be free to switch runs without retyping unfinished work; run age/type does not change this expectation. | User report and clarification; SCN-001/002/004 |
| REQ-002 | Retained draft state must be isolated by exact Agent Org root and exact agent execution identity. A draft entered in one root/member must never appear in, overwrite, or be finalized for another root/member. | BEH-002 | Critical | Retention without identity isolation would create a privacy and correctness defect. | Existing exact-owner contracts; SCN-001/003 |
| REQ-003 | Navigation away from a root must be distinguished from explicit local-state release. Only an authoritative release boundary—successful archive/delete of the owning run or application-session teardown—may discard a non-submitted retained draft in this scope. | BEH-001, BEH-005 | Critical | The defect exists because normal view departure currently invokes full disposal. | Code and reproduction evidence |
| REQ-004 | Successful send, rejected/failed send, newer concurrent edits, async attachment completion, stop/continuation, stream recovery, and sent-history hydration must retain their existing semantics. | BEH-002, BEH-003, BEH-006 | Critical | A narrow navigation fix must not reopen already-hardened submission and recovery behavior. | Existing passing tests and code |
| REQ-005 | Standalone Agent and Agent Team composers must satisfy the same session-scoped navigation-retention and exact-identity isolation contract as Agent Org composers, for newly started and existing runs. | BEH-004 | Critical | The user explicitly confirmed this as a general product expectation, not merely an Agent Org-specific exception. Current evidence indicates these surfaces already behave correctly, but that behavior must be verified and preserved. | User clarification; code comparison; related passing tests |
| REQ-006 | The solution must not require a new backend persistence schema, API contract, message-history entry, or extension of draft-file TTL. | BEH-005, BEH-006 | High | The requested behavior is in-session retention and the loss is caused by frontend lifecycle disposal. | Current ownership and cleanup contracts |

## Acceptance Criteria

| Acceptance-Criteria ID | Related Requirement IDs | Related Behavior / Scenario IDs | Preconditions / Trigger | Observable Expected Outcome | Important Alternate Or Failure Outcome | Verification Intent |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001, REQ-002, REQ-003 | BEH-001, BEH-002 / SCN-001 | Org root A/member X has typed text and one or more context files; user opens Org root B/member Y and then returns to A/X in the same session | A/X shows exactly its prior text and file selections | B/Y's draft remains independent and does not appear in A/X | Frontend integration/component test plus realistic navigation validation |
| AC-002 | REQ-001, REQ-003 | BEH-001 / SCN-002 | Org A/X has a draft; user opens a standalone Agent, Agent Team, configuration view, or other supported workspace surface and returns | A/X's draft is unchanged | Temporary loading/recovery states do not clear it | Navigation integration coverage |
| AC-003 | REQ-002, REQ-004 | BEH-002 / SCN-003 | Two members of the same Org have different drafts | Switching repeatedly between them restores each exact draft | No member receives another member's text, file descriptors, upload result, or finalization owner | Existing exact-member tests plus new cross-navigation regression |
| AC-004 | REQ-002, REQ-004 | BEH-002 / SCN-003 | An attachment upload starts for A/X, then focus/root navigation changes before it resolves | Successful completion is attached only to A/X and is visible when returning | A failed upload reports failure without adding a phantom attachment to any draft | Async captured-target test |
| AC-005 | REQ-004 | BEH-003 / SCN-006 | User successfully sends A/X's current draft | Submitted text/files move through the existing local-submission/finalization path and the composer clears according to current behavior | A later new draft remains independent | Existing send tests and targeted regression |
| AC-006 | REQ-004 | BEH-003 / SCN-006 | Send/finalization/transport rejects while the user either leaves the draft untouched or edits it again | Untouched input is restored; newer edits remain authoritative; no duplicate message or replay is introduced | Submission-pending and exact-owner guards remain enforced | Existing rejection/recovery tests |
| AC-007 | REQ-004 | BEH-003 / SCN-005 | An Org run is stopped and later continued during the same session | Its unsent draft remains available under the same exact member identity | Task/read-only eligibility remains unchanged | Existing stop/continuation tests plus regression |
| AC-008 | REQ-003, REQ-006 | BEH-005 / SCN-005 | The owning Org run is successfully archived or deleted | Its retained local context is released and cannot leak into a future run | Ordinary navigation alone does not produce this outcome | Mutation cleanup test |
| AC-009 | REQ-001, REQ-005 | BEH-004 / SCN-004 | Newly started and existing standalone Agent and Agent Team runs/members contain independent drafts and the user navigates among supported runs/members | Each draft remains intact and isolated when its exact owner is revisited | No lifecycle change clears, aliases, or transfers a draft between runs or members | Store/component regression tests plus realistic navigation validation |
| AC-010 | REQ-004, REQ-006 | BEH-006 / SCN-006 | User reopens a run with already-sent messages | Sent message text and finalized attachments hydrate exactly as before | No unsent draft is written into persisted conversation history | Existing hydration/history tests |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor / Initiator / Governing Contract | Coherent Goal Or Governing Event | Supported Trigger / Entry Surface | Starting Condition | Product-Level Steps Or Event Sequence | Expected Outcome | Supported Alternate / Error Behavior | Scenario Validity | Independent Evidence / Decision Reference | Related Requirement / AC IDs |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | User | Desktop/web user | Compare or work in another Agent Org without losing unfinished input | Agent Org run/member rows in Workspaces navigation | Draft exists in A/X | Type/attach in A/X → open B/Y → optionally type there → reopen A/X | A/X draft returns unchanged; B/Y stays independent | Loading/recovery may delay display but cannot clear retained draft | Supported Normal Scenario | User report/screenshots; navigation code | REQ-001/002/003; AC-001 |
| SCN-002 | User | Desktop/web user | Temporarily use another workspace surface | Standalone Agent, Agent Team, config, or other supported workspace navigation | Agent Org draft exists | Leave Org surface → use another surface → reopen exact Org member | Draft remains during session | Explicit archive/delete is not ordinary navigation | Supported Normal Scenario | Shared workspace layout and route selection | REQ-001/003; AC-002 |
| SCN-003 | User | Desktop/web user | Compose independent messages for multiple members | Member rows inside one Agent Org | Same Org root has at least two agent executions | Draft in X → focus Y and draft → return X | Each member shows only its own draft | Async upload stays with captured owner | Supported Normal Scenario | Existing exact-member code/tests | REQ-002/004; AC-003/004 |
| SCN-004 | User | Desktop/web user | Continue standalone Agent / Agent Team drafts while navigating | Newly started or existing workspace/run navigation | Draft exists on a standalone Agent or Team member | Navigate to another supported run/member and return | The exact draft is preserved regardless of whether the run is new or existing | Explicit run archive/delete releases it | Supported Normal Scenario | User clarification; central context maps and selection paths | REQ-001/005; AC-009 |
| SCN-005 | User / Operational | User archive/delete or app-session teardown | Release a run or end local session | Archive/delete action or process teardown | Retained draft may exist | Confirm archive/delete, or end session | Local retained context may be discarded | Navigation without the explicit action must not discard it | Supported Explicit Edge Scenario | Existing mutation cleanup contract | REQ-003/006; AC-008 |
| SCN-006 | User / System | User send plus server acknowledgement/hydration | Submit or recover a message without corrupting a newer draft | Send action / stream acknowledgement / inspection | Valid draft or sent history | Send → local admission/finalization → ACK or failure → later hydration | Existing successful, rejected, newer-edit, and sent-history outcomes remain | Failed sends restore only when draft was not superseded | Supported Normal Scenario | Existing tests (82 passing) | REQ-004/006; AC-005/006/007/010 |

## UI, Interaction, And Experience Requirements

- Applicable: `Yes`
- Linked UI/UX or interaction supplement: User-provided screenshots recorded in investigation notes
- Linked runnable prototype, separate prototype repository/root, UI/UX specification, and applicable support artifacts: N/A — not applicable; no Product Design request was stated
- Product prototype ticket record and folder (externally owned): N/A — not applicable
- Prototype revision or commit: N/A — not applicable
- UI/UX user-confirmation reference: N/A — not applicable
- Approved visual-reference baseline: N/A — not applicable
- Normative visual and interaction details, including the approved final references: No visible redesign. The existing composer must redisplay the retained text and context-file list when its exact owner is revisited.
- Explicitly illustrative fixture content or permitted implementation variation: Screenshot run names, typed words, and image thumbnails are evidence fixtures only.
- Required screens, states, transitions, feedback, responsive behavior, or accessibility outcomes: Existing desktop/web composer and navigation behavior; no new feedback or control is required.
- Explicitly unresolved product decisions: None for `SR-001`; cross-restart persistence is explicitly out of scope.

## Quality And Non-Functional Requirements

| Quality ID | Related Requirement / AC IDs | Area | Measurable Requirement Or Constraint | Conditions / Scope | Verification Intent |
| --- | --- | --- | --- | --- | --- |
| QR-001 | REQ-002 / AC-001, AC-003, AC-004 | Privacy | Zero cross-root or cross-member draft visibility/finalization in covered navigation tests | All Agent Org configured/task member identities with composer access | Exact-identity assertions |
| QR-002 | REQ-001, REQ-003 / AC-001, AC-002 | Reliability | Draft text and attachment descriptor arrays compare equal before navigation and after return | Same application session and unexpired backing draft files | State identity/value assertions and realistic UI check |
| QR-003 | REQ-004, REQ-005 / AC-005-AC-010 | Compatibility | All affected existing focused tests continue passing and new regression coverage passes | Frontend Agent Org, Agent, Team, submission, attachment, stop, history | Targeted Vitest plus API/E2E validation |
| QR-004 | REQ-006 / AC-010 | Operability | No data migration, backend schema update, or deployment-time conversion is introduced | This task only | Review of change inventory and tests |

## Data Continuity And Acceptable Loss

- Persisted or external data affected: `Yes` — uploaded draft attachment bytes already live in server-side draft storage; unsent text and attachment-selection metadata are in-memory frontend state.
- Data or state that must be preserved: Within the current application session, exact unsent text plus the exact attachment descriptors for every retained Agent Org member context during ordinary navigation, stream refresh/recovery, and stop/continuation.
- Loss, reset, rebuild, or regeneration that is acceptable: Drafts may be discarded after successful archive/delete of the owning run or application-session teardown. Cross-restart restoration and recovery after the existing draft-file TTL expires are not promised.
- Retention, privacy, compliance, volume, downtime, or operational constraints: Keep exact root/member isolation; preserve the current 24-hour draft-file TTL; no downtime or migration.
- Unknowns requiring downstream investigation: Architecture must confirm the safe transport-retirement versus context-release boundary and all explicit release callers; no product-behavior decision remains open.

## External Contracts And Dependencies

| Contract / Dependency | Required Behavior Or Constraint | Evidence / Authority | Uncertainty Or Risk |
| --- | --- | --- | --- |
| Agent Org context-file owner descriptor | Continue using exact `{ kind: 'org_member_draft', orgRunId, agentRunId }` and matching final owner | Frontend/server context-file owner types and tests | None identified |
| Context-file draft cleanup | Preserve default 24-hour file cleanup policy | `context-file-draft-cleanup-service.ts` | Long-lived drafts beyond TTL remain out of scope |
| Agent Org inspection/stream hydration | May refresh server-backed projection without replacing retained local composer state for the same exact identity | `AgentOrgExecutionContext.adoptLocalContexts`; recovery tests | Architecture must keep one authoritative retained context per root |

## Supplemental Artifacts

| Artifact Path | Purpose | Related Requirement / AC IDs | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- |
| `/Users/normy/.autobyteus/server-data/memory/agent_orgs/autobyteus_org_1cf835f9b4ef4c5b82b317a150e78aeb/software_engineering_team_e8336f4ba2e74322af0333baf0f7755a/solution_designer_c43502df79274c1a98837de4d0619151/context_files/ctx_68d55dcb2023__image.png` | After-navigation empty-composer evidence | REQ-001 / AC-001 | Available | Evidence only; not separately behavior-defining |
| `/Users/normy/.autobyteus/server-data/memory/agent_orgs/autobyteus_org_1cf835f9b4ef4c5b82b317a150e78aeb/software_engineering_team_e8336f4ba2e74322af0333baf0f7755a/solution_designer_c43502df79274c1a98837de4d0619151/context_files/ctx_62d7b3dc8112__image.png` | Before-navigation populated-composer evidence | REQ-001 / AC-001 | Available | Evidence only; not separately behavior-defining |
| `/Users/normy/.autobyteus/server-data/memory/agent_orgs/autobyteus_org_1cf835f9b4ef4c5b82b317a150e78aeb/software_engineering_team_e8336f4ba2e74322af0333baf0f7755a/solution_designer_c43502df79274c1a98837de4d0619151/context_files/ctx_132f5fd25b04__image.png` | Other-Agent-Org/member navigation evidence | REQ-001, REQ-002 / AC-001 | Available | Evidence only; not separately behavior-defining |

## Assumptions

| Assumption ID | Assumption | Why It Is Necessary | Validation Plan / Owner | Status |
| --- | --- | --- | --- | --- |
| ASM-001 | “Come back” means returning during the same running application session, not after process restart. | Current comparable Agent/Team behavior is in-memory and the user described navigation, not restart. | Included explicitly in scope for user approval. | Proposed for approval |
| ASM-002 | Ordinary navigation includes switching Agent Org roots and leaving the Agent Org surface for other normal workspace surfaces. | Fixing only one click path would leave the same unmount disposal defect elsewhere. | Included in SCN-001/002 and AC-001/002. | Proposed for approval |

## Open Decisions And Questions

| Decision / Question ID | Question | Why It Matters | Options / Evidence | Decision Owner | Status |
| --- | --- | --- | --- | --- | --- |
| DEC-001 | Should unsent drafts persist across full app restart? | Would require a broader persistence/privacy/cleanup product decision. | Current request and clarification concern switching runs during the same application session; current text state is in-memory; uploaded files have a 24-hour TTL. | User | Resolved: `No — out of scope`; user approval of SR-002 on 2026-09-22 confirms |

## Traceability

| Requirement ID | Use-Case IDs | Behavior IDs | Acceptance-Criteria IDs | Scenario IDs | Supplemental / Prototype Evidence |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | UC-001, UC-002, UC-003, UC-004, UC-006 | BEH-001, BEH-004 | AC-001, AC-002, AC-004, AC-009 | SCN-001, SCN-002, SCN-003, SCN-004 | Three user screenshots and 2026-09-22 user clarification |
| REQ-002 | UC-001, UC-003, UC-006 | BEH-002 | AC-001, AC-003, AC-004 | SCN-001, SCN-003 | Exact-owner code/tests |
| REQ-003 | UC-001, UC-002, UC-005 | BEH-001, BEH-005 | AC-001, AC-002, AC-008 | SCN-001, SCN-002, SCN-005 | Lifecycle/disposal code and reproduction |
| REQ-004 | UC-003, UC-005, UC-006 | BEH-002, BEH-003, BEH-006 | AC-003-AC-007, AC-010 | SCN-003, SCN-006 | Existing Agent Org test suites |
| REQ-005 | UC-004 | BEH-004 | AC-009 | SCN-004 | 2026-09-22 user clarification; Agent/Team store and shared composer tests |
| REQ-006 | UC-005 | BEH-005, BEH-006 | AC-008, AC-010 | SCN-005, SCN-006 | Cleanup, mutation, hydration contracts |

## Architecture Phase Input

- Approved scenario IDs and product-level behavior paths architecture must map: Pending approval of SCN-001 through SCN-006.
- Product and system constraints architecture must preserve: Exact root/member identity; one authoritative retained context; existing stream/submission guards; explicit archive/delete release; 24-hour file TTL; no new backend persistence.
- Decisions intentionally deferred to architecture design: Where transport retirement and retained-context release are separated; naming and ownership of lifecycle APIs; exact file/test changes.
- Technical facts architecture should verify: All current callers of Agent Org `disconnect`; stream resource cleanup when roots are retained but not visible; bounded memory/session cleanup; selection/open behavior for already-retained roots; archive/delete cleanup; race behavior during inspection, streaming, and pending send.
- Known feasibility or integration risks: A simplistic removal of `disconnect` could retain WebSockets unnecessarily; a second draft cache would duplicate authority; full disposal must remain available for archive/delete/session teardown.

## Readiness Check

### Content Ready For Approval

- Relevant current behavior is evidence-backed: `Yes`
- Desired and preserved behavior are explicit: `Yes`
- Scope and non-goals are clear: `Yes`
- Requirements and acceptance criteria are testable and traceable: `Yes`
- Applicable scenarios are covered with validity and evidence: `Yes`
- Prototype and supplemental evidence is integrated consistently: `N/A`
- Applicable UI/UX approval and final visual-reference basis are recorded: `N/A`
- Material assumptions and open decisions are visible: `Yes`
- Content ready for user approval: `Yes`
- Remaining content blocker: Explicit user approval of `SR-001`.

### Approved Basis Ready For Design

- User approval received: `No`
- Exact requirements and supplement approval basis recorded: `No`
- Approved requirements package ready for architecture design: `No`
- Remaining blocker: Explicit user approval of `SR-001`; architecture design must not begin before approval.
