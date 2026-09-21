# Requirements Document — Stopped AgentOrg History Archive/Delete

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-001`
- Package identifier: `ORG-HISTORY-ARCHIVE-DELETE-20260921-001`
- Request / ticket: `org-history-archive-delete-actions`
- Requirements owner: Solution Designer
- Date: 2026-09-21
- Approval state and reference: Approved by the user on 2026-09-21: “basically, this functionality is similar to agent team, please now work on it”.
- Exact approved requirements baseline / solution revision: `SR-001`
- Behavior-defining supplements and their approved versions: The two user-supplied screenshots listed under Supplemental Artifacts; they evidence current behavior and the requested Team comparator but add no behavior beyond this document.

## Problem And Desired Outcome

- Problem: A stopped AgentOrg history row exposes neither **Archive** nor **Delete**, while a stopped standalone Agent Team history row exposes both.
- Affected actors or systems: Desktop/web users managing retained AgentOrg run history; AgentOrg history persistence and lifecycle owners.
- Desired outcome: A stopped AgentOrg root can be archived or permanently deleted from the same history-row surface and under the same user-facing policy as a stopped standalone Agent Team root.
- Observable definition of success: A stopped AgentOrg row shows both controls; Archive non-destructively removes the row from default history; Delete asks for confirmation and permanently removes that exact AgentOrg run package; active AgentOrg rows remain protected.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Related Scenario IDs | Evidence-Backed Current Behavior | Desired Behavior | Intentionally Preserved Behavior | Investigation Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | SCN-001, SCN-003 | A stopped AgentOrg history row has no Archive or Delete action. | Show Team-parity Archive and Delete controls on an eligible stopped AgentOrg history row. | Row disclosure/open, member selection, time label, whole-Org Settings, and sibling rows behave as before. | User screenshot; `WorkspaceAgentOrgHistoryCollection.vue`. |
| BEH-002 | System | SCN-001, SCN-004 | AgentOrg tree/index schemas already contain `archivedAt`, and the unified history reader already excludes inactive archived AgentOrg rows; no AgentOrg archive command writes the state. | Archive records the timestamp in the exact AgentOrg V1 tree and AgentOrg history index, retains all run-owned data, and removes the inactive row from default history. | No archived-list/unarchive UI is introduced; archived roots remain noneditable. | AgentOrg schemas/stores; `collaboration-root-history-service.ts`; Team archive contract. |
| BEH-003 | User / System | SCN-002, SCN-004 | An internal unused `deleteStored(orgRunId)` capability exists, but no GraphQL or web action exposes permanent AgentOrg history deletion. | Delete requires explicit confirmation, then removes only the exact stopped AgentOrg run package and its history-index row. | The AgentOrg definition, shared Agent/Team definitions, workspace registry, unrelated histories, and other roots are not changed. | AgentOrg catalog plus resolver/client absence. |
| BEH-004 | Contract | SCN-003, SCN-004 | Agent Team archive/delete is stopped-only, action clicks are isolated, and the server rejects active roots. | AgentOrg follows the same lifecycle guardrails: active roots show Stop only; stale/racing active roots reject archive/delete; action clicks do not open/collapse the row. | Stop remains the only active-root destructive lifecycle control; archive/delete never activates or restores. | Team row/service and AgentOrg manager/component. |
| BEH-005 | User / Operational | SCN-001, SCN-002, SCN-004 | No AgentOrg pending/error feedback exists for archive/delete. | Disable conflicting actions while pending; show truthful success/failure feedback; retain the row/selection on failure; after success remove the row and leave an exact selected hidden/deleted root safely. | Unrelated contexts, drafts, selections, histories and stored data remain unchanged. | Existing Team/Agent mutation pattern; AgentOrg route/context ownership. |

## Stakeholders, Actors, And Outcomes

| Actor / Stakeholder | Goal Or Responsibility | Required Outcome | Important Constraint |
| --- | --- | --- | --- |
| User managing history | Hide clutter or permanently discard one stopped AgentOrg history | Clear Archive/Delete controls and truthful feedback | Delete is destructive and must be confirmed. |
| AgentOrg lifecycle owner | Prevent mutation while the root is active or changing lifecycle | Serialize/check the exact root before mutation | Never restore or activate merely to archive/delete. |
| Run-history subsystem | Keep AgentOrg tree/index/package coherent | Archive retains the package; delete removes the exact package and row | No generic cross-family persisted schema. |
| Web history owner | Keep history, route and retained contexts coherent | Remove/retire only exact successful target state | Sibling state remains intact. |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

- `UC-001`: Archive one eligible stopped AgentOrg run from its workspace history row.
- `UC-002`: Permanently delete one eligible stopped AgentOrg run from its workspace history row after confirmation.
- `UC-003`: Reject archive/delete if the same root is active or in a conflicting lifecycle transition when the command reaches the authoritative boundary.
- `UC-004`: Reconcile the visible row, exact route/context and feedback after either operation.

### Out Of Scope

- Deleting an AgentOrg **definition** or shared Agent/Team definitions.
- Archived-history browser, unarchive, bulk operations, retention policy, trash/recovery, export or backup.
- Archive/delete on a mounted Team or Agent inside an AgentOrg; the AgentOrg root remains the lifecycle subject.
- Changes to Stop, restore-by-Send, whole-Org Settings, model/config policy, disclosure, status, summary or startup.
- Changes to standalone Agent/Team archive/delete semantics.
- Data migration, schema-version change, compatibility path or repair scan.

### Non-Goals

- Pixel-for-pixel code duplication where subject ownership differs.
- Certification of unrelated provider inference, tasks, attachments or deployment.

### Preserved Behavior Boundary

- Preserve `BEH-001` row disclosure/open/member navigation and sibling state.
- Preserve `BEH-004` active-root Stop-only policy and non-activation rule.
- Preserve `BEH-005` unrelated route, context, draft, attachment, message, task and Activity state.
- Archive/Delete apply to the top-level AgentOrg root only.

### Review Authority

- Blocking findings must protect an approved requirement, AC or preserved behavior ID.
- Unarchive, bulk operations, recovery/trash, retention, definition deletion, migration or mounted-Team lifecycle controls are requirement gaps needing separate approval.
- Downstream comments do not amend this boundary.

## Requirements

| Requirement ID | Requirement | Related Behavior IDs | Priority / Criticality | Rationale | Source / Decision Reference |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | The workspace history row for an inactive, non-pending AgentOrg root MUST expose Archive and Delete controls using the established Agent Team visual/action pattern. The controls MUST be independently actionable without triggering row open, selection, expansion or collapse. | BEH-001, BEH-004 | Critical | Direct requested parity. | User request/screenshots. |
| REQ-002 | Active AgentOrg roots MUST NOT expose Archive/Delete. The authoritative command boundary MUST reject a root that is active or in a conflicting lifecycle transition even if the client view was stale. | BEH-004 | Critical | Prevent destructive mutation of live work. | Team rule; AgentOrg ownership. |
| REQ-003 | Archive MUST set one canonical `archivedAt` on the AgentOrg V1 tree and project it to the history index, retain the entire root package and all members/messages/tasks/traces/attachments, and exclude the inactive root from default visible history. | BEH-002 | Critical | Matches current archive meaning and schema. | Run-history docs/source. |
| REQ-004 | Delete MUST require explicit confirmation and then permanently remove only the exact stopped AgentOrg package and its history-index row. It MUST NOT delete the AgentOrg definition, referenced/shared definitions, workspace registration or another root. | BEH-003 | Critical | Exact destructive scope. | User Team-parity request. |
| REQ-005 | Archive/Delete MUST use exact `orgRunId`, reject blank/path-unsafe/unknown roots, execute without activation/restore/provider calls, and not publish client success before authoritative success. | BEH-002–004 | Critical | Identity/lifecycle/storage safety. | Current layout/manager/catalog. |
| REQ-006 | While a mutation is pending, conflicting controls for that root MUST be disabled. Success MUST show success feedback, remove the row, release exact retained context and navigate away if that root owns the route. Failure MUST show an error and retain the row/selection/context. | BEH-005 | High | Avoid duplicates and stale center state. | Current history-mutation experience. |
| REQ-007 | Mutating one AgentOrg MUST preserve every unrelated Agent/Team/AgentOrg row, disclosure, selection, draft, conversation, task, Activity entry, attachment, provider binding and package. | BEH-001, BEH-005 | Critical | Scope isolation/data continuity. | Mixed history architecture. |
| REQ-008 | Use the current AgentOrg V1 tree/index/package directly. No migration, compatibility wrapper, alternate state file, generic cross-family schema, archived-list UI or mounted-Team lifecycle command is authorized. | BEH-002–004 | High | Existing representation is sufficient. | Source investigation. |
| REQ-009 | English and Simplified Chinese labels, confirmation, success and failure copy MUST identify AgentOrg history—not definition deletion—and icon controls MUST have accessible names and keyboard focus behavior consistent with Team. | BEH-001, BEH-003, BEH-005 | High | Prevent scope confusion and preserve accessibility. | UI/localization conventions. |

## Acceptance Criteria

| AC ID | Related Requirement IDs | Scenario | Observable Expected Outcome | Important Alternate / Failure Outcome | Verification Intent |
| --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001, REQ-002, REQ-009 | Render equivalent stopped and active AgentOrg rows. | Stopped row exposes named Archive/Delete icons in the Team-aligned action area; active row exposes Stop only. Action clicks do not open/collapse/select. | Pending controls issue no duplicates. | Component tests and actual browser. |
| AC-002 | REQ-003, REQ-005–007 | Archive a stopped AgentOrg with retained content and a sibling. | Tree/index share archive fact; row disappears; target content remains; exact selected route/context retires; sibling is unchanged. | Active/unsafe/unknown/persistence failure reports non-success without activation or false success. | Owner/GraphQL/store/component tests plus browser and preservation proof. |
| AC-003 | REQ-004–007 | Delete a stopped AgentOrg; cancel once, then confirm. | Cancel is no-op. Confirm removes exact package/index row and visible context, navigating away only when selected. Definitions/workspace/siblings remain. | Rejection/removal failure reports non-success and never presents a completed delete. | Owner/GraphQL/store/component tests plus browser/filesystem proof. |
| AC-004 | REQ-002, REQ-005, REQ-007 | Root becomes active/conflicting before commit. | Lifecycle owner rejects mutation; live root/package remain; client reports/refreshes rather than forcing removal. | No restore, provider or cross-root effect. | Deterministic concurrency/owner tests and API validation. |
| AC-005 | REQ-006, REQ-007, REQ-009 | Exercise success/failure, keyboard and narrow/desktop layouts. | Localized feedback is exact; controls remain discoverable/named; only target is busy/removed; unrelated state is stable. | Failure retains target and permits deliberate retry. | Component/a11y and browser validation. |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor / Goal | Trigger / Starting Condition | Product Sequence And Outcome | Alternate / Error | Validity | Related IDs |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | User | Hide a completed AgentOrg without data loss | Archive on a visible stopped root | Commit archive; reconcile; row disappears; package remains | Error keeps row and reports failure | Supported Normal Scenario | REQ-001–003, REQ-005–007; AC-001–002 |
| SCN-002 | User | Permanently discard one stopped AgentOrg | Delete and confirmation | Cancel is no-op; confirm removes exact package/row | Error keeps target and reports failure | Supported Normal Scenario | REQ-001, REQ-004–007; AC-001, AC-003 |
| SCN-003 | System/User | Protect a root after stale UI eligibility | Mutation reaches server after root becomes active/conflicting | Exact owner rejects; root remains | UI reports failure | Supported Explicit Edge Scenario | REQ-002, REQ-005; AC-001, AC-004 |
| SCN-004 | Contract | Preserve all non-target state | Any archive/delete attempt amid multiple roots | Only authorized target state changes or no mutation occurs | No cross-root/definition/workspace/provider effect | Supported Explicit Edge Scenario | REQ-003–009; AC-002–005 |

## UI, Interaction, And Experience Requirements

- Applicable: `Yes`
- Linked UI/UX supplement: The two supplied screenshots.
- Prototype/UI specification: N/A — existing Agent Team interaction is the accepted comparator; Product Design was not requested.
- UI/UX approval reference: Approved with `SR-001` by the user on 2026-09-21; existing stopped Agent Team Archive/Delete is the accepted comparator.
- Normative details: Place stopped AgentOrg Archive/Delete before relative time; follow Team desktop hover/focus and narrow visibility; stop propagation; provide accessible names; use shared destructive confirmation for Delete.
- Required states: active (Stop only), stopped eligible, archive/delete pending, delete confirmation, success, failure, selected-target success navigation.
- Illustrative only: Names, timestamps, avatar/status colors and exact widths in screenshots.
- Unresolved product decisions: None, subject to approval.

## Quality And Non-Functional Requirements

| Quality ID | Related IDs | Area | Constraint | Verification |
| --- | --- | --- | --- | --- |
| QR-001 | REQ-002, REQ-005, AC-004 | Reliability | No supported race may remove/hide a root active at the authoritative transition boundary. | Deterministic owner tests. |
| QR-002 | REQ-003, REQ-004, REQ-007, AC-002–003 | Data continuity | Delete changes only exact target package/index; Archive changes only canonical archive projections/visibility. | Hash/inventory proof. |
| QR-003 | REQ-009, AC-001, AC-005 | Accessibility/Localization | Controls are keyboard-focusable, named, and localized in English/zh-CN. | Component/browser inspection. |

## Data Continuity And Acceptable Loss

- Persisted or external data affected: `Yes`.
- Preserve: For Archive, the complete target package/index except canonical archive timestamps; for Delete, all non-target packages/index rows, definitions, workspaces and external state.
- Acceptable loss: Only the exact target package/index after explicit confirmed Delete. Archive permits no content loss.
- Operational constraints: Per-root interactive operation; no background retention sweep.
- Remaining unknown: None material to approval; design must specify lifecycle serialization and failure handling.

## External Contracts And Dependencies

| Contract / Dependency | Required Constraint | Evidence | Risk |
| --- | --- | --- | --- |
| AgentOrg V1 tree/index | Reuse current `archivedAt` and exact identity | Source schemas/stores | Low. |
| AgentOrg manager | Coordinate mutation with per-root lifecycle | Current transition lane | Requires narrow owned API. |
| GraphQL/Apollo | Explicit AgentOrg success/message mutations | Agent/Team pattern | Keep subject-explicit naming. |
| Mixed history UI | Reuse row/confirmation/toast conventions | Team path | Exact Org route/context cleanup differs. |

## Supplemental Artifacts

| Artifact Path | Purpose | Related IDs | Status / Approval |
| --- | --- | --- | --- |
| `/Users/normy/.autobyteus/server-data/memory/agent_orgs/software_development_department_75403d5130584669869fdd59725f6b3e/software_engineering_team_3e746e3211f34fb39aad3979b4751e04/solution_designer_b1a3b7b01d35499d9fa06baf799a2046/context_files/ctx_eb5d81993043__image.png` | Current stopped AgentOrg gap | REQ-001, AC-001 | Read-only; proposed SR-001 evidence. |
| `/Users/normy/.autobyteus/server-data/memory/agent_orgs/software_development_department_75403d5130584669869fdd59725f6b3e/software_engineering_team_3e746e3211f34fb39aad3979b4751e04/solution_designer_b1a3b7b01d35499d9fa06baf799a2046/context_files/ctx_95c5df976e09__image.png` | Current Team comparator | REQ-001, REQ-009, AC-001 | Read-only; proposed SR-001 evidence. |
| `tickets/done/flat-agent-organization-model/design-spec.md` (`DS-025`) | Historical typed subject archive/delete-port intent | REQ-001–008 | Historical context only; not current approval. |

## Assumptions And Open Decision

| ID | Type | Statement | Status |
| --- | --- | --- | --- |
| ASM-001 | Assumption | “Same as Agent Team” includes non-destructive Archive, confirmed permanent Delete, stopped-only eligibility and equivalent feedback. | Confirmed by the user’s explicit Team-parity approval of `SR-001`. |
| ASM-002 | Assumption | AgentOrg parity preserves the current lack of archived-list/unarchive UI. | Confirmed by the user’s explicit approval of the bounded `SR-001` scope. |
| DEC-001 | Decision | Approve the exact Team-parity scope in `SR-001`. | Approved by the user on 2026-09-21. |

## Traceability

| Requirement | Use Cases | Behaviors | ACs | Scenarios |
| --- | --- | --- | --- | --- |
| REQ-001 | UC-001, UC-002 | BEH-001, BEH-004 | AC-001, AC-003 | SCN-001, SCN-002 |
| REQ-002 | UC-003 | BEH-004 | AC-001, AC-004 | SCN-003 |
| REQ-003 | UC-001, UC-004 | BEH-002 | AC-002 | SCN-001, SCN-004 |
| REQ-004 | UC-002, UC-004 | BEH-003 | AC-003 | SCN-002, SCN-004 |
| REQ-005–009 | UC-001–004 | BEH-001–005 | AC-001–005 | SCN-001–004 |

## Architecture Phase Input

- Proposed approved scenarios: `SCN-001`–`SCN-004`.
- Preserve: AgentOrg root ownership, stopped-only mutation, non-destructive archive, exact confirmed delete, no activation, no cross-root/definition/workspace mutation.
- Deferred to design: Exact manager/catalog API, mutation result names, local cleanup owner, failure compensation and test inventory.
- Verified facts: Internal AgentOrg delete exists but is unwired; archive command is absent; tree/index already own `archivedAt`; history already hides inactive archived roots; selected route/context requires explicit success cleanup.
- Risk: A destructive operation must share the per-root lifecycle boundary; adding a third history subject must not create ambiguous generic-ID APIs or divergent confirmation policy.

## Readiness Check

### Approved Requirements Basis

- Current behavior evidence-backed: `Yes`
- Desired/preserved behavior explicit: `Yes`
- Scope/non-goals clear: `Yes`
- Requirements/ACs testable and traceable: `Yes`
- Scenarios covered: `Yes`
- Supplement evidence integrated: `Yes`
- UI/UX basis recorded: `Yes`
- Material assumptions visible: `Yes`
- Content ready for approval: `Yes`
- Remaining blocker: None.

### Approved Basis Ready For Design

- User approval received: `Yes`
- Exact approval basis recorded: `Yes` — user message on 2026-09-21: “basically, this functionality is similar to agent team, please now work on it”.
- Ready for architecture design: `Yes`
- Remaining blocker: None.
