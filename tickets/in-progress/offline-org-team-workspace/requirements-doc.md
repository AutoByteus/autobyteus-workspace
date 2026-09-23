# Requirements — Offline Org Team Workspace

## Document Status
- Package: `OFFLINE-ORG-TEAM-WORKSPACE-20260922`
- Status: **Approved**; requirements approval baseline `SR-002` (SR-001 behavior confirmed; screenshot identifies the existing control).
- Current cumulative solution revision: `SR-006`; approved behavior baseline remains `SR-002`.
- Owner: Solution Designer; date: 2026-09-22.
- Original request: analyze changing an internal Team's workspace in an offline AgentOrg, inherited by children and used on subsequent messages, preferably without migration.
- Approval reference `USER-20260922-SCOPE`: in response to the proposed scope, user supplied the mounted-Team screenshot and confirmed “when the team global workspace is updated, the agents inside agent team will be udpated as well”, followed after interruption by “continue please”. This approves the presented mounted-Team/all-configured-children scope and continuation into design; no implementation completion, independent-review bypass, merge or release is authorized by this record.

## Problem and desired outcome
A user launches an Org using its global workspace, later needs one mounted Team to work in a different directory, and currently cannot change that workspace on the retained stopped Org. Permit this without recreating the Org or losing conversations. Save must affect the selected Team and its configured children; normal subsequent messaging must use the saved workspace.

## Relevant current, desired and preserved behavior
| Behavior | Scenarios | Current (evidence in investigation) | Desired | Preserved |
| --- | --- | --- | --- | --- |
| BEH-001 | SCN-001 | Launch workspace inheritance is resolved and stored per scope (E02–E04). | Existing stopped Team default can be changed; all configured children receive its workspace. | Other model/runtime overrides remain independent. |
| BEH-002 | SCN-001,003 | Whole-Org Settings supports model-only edits; workspace locked (E01,E05–E08). | Selected mounted-Team workspace editable in eligible stopped Org; explicit Save/reopen. | Existing model editing, other locked fields, standalone/new-run behavior. |
| BEH-003 | SCN-002 | Restore uses each saved Agent launch path (E09–E13). | Next normal message restores same conversation at new workspace. | Run identities, conversation/provider continuation; no activation from inspect/Save. |
| BEH-004 | SCN-003,004 | Inactive-only aggregate save with canonical readback; memory is separate from workspace (E06,E14–E16). | Coherent, validated workspace save and canonical UI publication. | No partial success, stale-target write, history loss, or file relocation. |
| BEH-005 | SCN-004 | Fresh task creation uses current configured source; historical tasks separate (E17). | Future tasks sourced from edited Team use updated configured paths. | Existing task records and execution snapshots stay unchanged. |
| BEH-006 | SCN-001 | No current supported stopped-Team workspace edit. | Add precisely the proposed trigger below. | No silent expansion to root/global preferences or Team definitions. |

## Actors
- User of a retained, stopped, editable AgentOrg: change one mounted Team's working directory without starting over.
- Existing configuration/runtime/history owners: persist a coherent update, use it on restore, preserve unrelated state.

## Scope Guardrail
### In scope
- UC-001: In whole-Org Settings for an eligible stopped Org, choose a workspace for a selected configured mounted Team.
- UC-002: Apply the Team workspace to **all of that Team's configured Agents**, including coordinator and Agents with separate model/runtime overrides; Save, reopen, then continue.
- UC-003: Preserve identity/history and other scopes; handle invalid destination, stale/active state and uncertain save truthfully.
- UC-004: Preserve historical task executions; future delegation uses updated configured source paths.

### Out of scope / non-goals
- Changing Org-root workspace, direct-Org-Agent workspaces, standalone Team/Agent existing-run workspace editing, reusable definitions or global launch preferences.
- Per-Agent workspace editing UI or a new persistent inheritance/override model.
- Editing during an active/managed Org, even when a child looks offline or idle.
- Moving/copying project files, migrating conversation storage, rewriting historical path references/attachments, or resetting provider sessions.
- Rewriting historical delegated tasks, topology/handoffs, identities, runtime family, tool or skill policy.
- Product redesign, new runtime support, deployment or repository finalization.

### Preserved boundary
Only approved workspace values and explicitly requested existing model edits may change. BEH-003–005 / REQ-003–006 protect all other run state. A configured child with an already different stored workspace is explicitly included in “all configured Agents” for this proposed baseline; it is not silently preserved as a workspace override. This mounted-Team/all-configured-children interpretation was confirmed by USER-20260922-SCOPE; no root-workspace expansion was requested.

### Review authority
Blocking technical findings must cite approved REQ/AC/BEH IDs. New behavior, migration duties, compatibility promises or operational policy are Requirement Gaps requiring renewed user approval, not automatic reviewer additions. Adjacent concerns remain nonblocking separate-ticket suggestions.

## Requirements
| ID | Requirement | Behavior | Priority / source |
| --- | --- | --- | --- |
| REQ-001 | Whole-Org Settings exposes workspace selection for a configured mounted Team only while the enclosing Org is authoritatively inactive, unarchived, not application-owned and otherwise eligible; explicit Save persists it and reopen shows canonical values. | BEH-002,006 | Must; user request and preserved current eligibility |
| REQ-002 | A Team workspace change updates its default and every configured Agent under that Team, irrespective of model/runtime overrides or an old distinct stored child workspace. Org root, sibling Teams and direct Org Agents keep their current workspaces. | BEH-001 | Must; user-confirmed “agents inside agent team” propagation |
| REQ-003 | Next normal message to an affected configured Agent uses the new workspace while continuing the same run and conversation. Never silently discard history or create a replacement conversation to make a workspace change appear successful. Opening/Save alone does not start an Agent or conversation. | BEH-003 | Must; user assumption made testable, continuity preservation |
| REQ-004 | Validate the destination and affected configuration; publish one coherent Team/children outcome. Invalid input applies no configuration changes. Active/managed/stale/archived/application-owned targets remain rejected; uncertain persistence requires canonical reconciliation without claiming success. | BEH-004 | Must; existing safety guarantees |
| REQ-005 | Keep identities, conversation/Activity, provider bindings, tasks/handoffs, attachments, composer state and unchanged settings intact. Switching workspace does not move/copy/delete user project files or rewrite historical references. File/explorer context must correspond to the canonical saved/active workspace, not stale metadata. | BEH-003,004 | Must; no-migration intent and current continuity |
| REQ-006 | Historical task execution configuration stays unchanged. A fresh delegation after restore derives workspace from updated configured recipient settings. | BEH-005 | Must; existing task/configured boundary |
| REQ-007 | Preserve existing Org model editing, launch behavior, and standalone Agent/Team Settings; no additional workspace-editing subjects are introduced. | BEH-002,006 | Must; focused scope |

## Scenarios and acceptance criteria
| Scenario | Actor / goal / supported trigger and sequence | Expected / alternate behavior | Validity and independent basis |
| --- | --- | --- | --- |
| SCN-001 | User launched Org with root workspace A; stops Org; opens existing Settings through a configured member; selects mounted Team workspace B; Saves and reopens. | Team and all its configured Agents show B; root/siblings unchanged. Invalid selection fails without partial config save. | Supported Normal Scenario; new edit explicitly requested by user, supported existing launch/stop/settings entrypoints E01–E05. |
| SCN-002 | User sends next message to a previously used Team Agent after SCN-001; also later contacts an unused child. | Working directory B, same run/conversation; lazy first activation also uses B. Resume failure is reported, not hidden by history reset. | Supported Normal Scenario; ordinary continuation E09–E13 plus request. |
| SCN-003 | Org restarts while Settings is open, target changes, destination fails validation, or Save outcome is uncertain. | No active/cross-target/partial configuration write; truthful refresh/error behavior. | Supported Explicit Edge Scenario under existing stopped-save contract E06,E16. |
| SCN-004 | Org contains retained task history and Team children with distinct model settings; edit workspace, restore, delegate a new task. | Models/history/task snapshots preserved; all configured children and new task source use B; old files stay in A. | Supported Normal Scenario; actual product model/task workflows E04,E17–E18. |

| AC | Requirements / behaviors / scenarios | Preconditions and trigger | Observable expected outcome / important failure | Verification intent |
| --- | --- | --- | --- | --- |
| AC-001 | REQ-001,002,007 / BEH-001,002,006 / SCN-001 | Stopped Org with root A and at least two mounted Teams; choose B for one Team and Save. | Reopen shows selected Team and every configured child B; other scopes A/unchanged. Existing model selection remains functional. | UI Save→reopen and persistence inspection |
| AC-002 | REQ-002,005 / BEH-001,004 / SCN-001,004 | Selected Team has model/runtime overrides and optionally a stored child path C. | All its configured child paths become B; model/runtime/tool/skill selections remain unchanged. | Propagation and preservation assertions |
| AC-003 | REQ-003,005 / BEH-003,004 / SCN-002 | Previously used native/Codex/Claude child and a never-used child; Save then ordinary Send. | Real cwd/file operation runs under B; retained conversation continues; no runtime activation at inspect/Save; no silently reset session. | Provider-aware continuation coverage, including real external cross-directory resume |
| AC-004 | REQ-004 / BEH-002,004 / SCN-003 | Active/managed root with offline leaf; stale selection; invalid destination; validation/write failure. | Rejected or truthfully reconciled; no partial Team/child or wrong-Org save; uncertain result not success. | Lifecycle/race/API and UI checks |
| AC-005 | REQ-005,007 / BEH-003,004 / SCN-001,004 | Retained messages/history/attachments/composer state and files in A. | State stays intact; no project file move; applicable workspace/file context resolves B; unrelated existing-run and launch workflows unchanged. | State-preservation assertions and rendered workspace check |
| AC-006 | REQ-006 / BEH-005 / SCN-004 | Old task snapshots exist; perform a fresh delegation after changed Org restore. | Old task snapshots unchanged; fresh task receives updated configured-source workspace. | Task owner-path regression |

## UI and experience
Applicable: Yes. Reuse established whole-Org Settings hierarchy and explicit Save/Back workflow. Team workspace selection is enabled only for eligible stopped Org; root and unsupported subjects remain locked. Give truthful validation/save status and reflect saved workspace in relevant workspace views.
User-specified location: the **Workspace Directory** control inside the expanded mounted-Team card shown in `evidence/user-subteam-workspace-control.png` (marketing_team example). Enable that control for eligible stopped Orgs; selecting Existing or entering/browsing New uses the established workspace selector. The displayed path/model/team names are illustrative current values, not hard-coded requirements. The screenshot is surface-location evidence, not a Product-owned normative final visual baseline. Product prototype/repository/ticket/UI/UX supplement: **N/A — not requested/applicable**.

## Quality and data continuity
- QR-001 reliability: REQ-004 / AC-004, all-or-none configured state and same-root inactive gate.
- QR-002 continuity: REQ-003,005 / AC-003,005, same identities/history and correct runtime workspace without file movement.
- Persisted data affected: Yes, saved Team/Agent workspace selections. No acceptable loss of existing conversation or task history. No user-data volume/retention policy changes.
- No schema migration prescribed. Existing field reuse appears feasible; architecture must determine the exact transition. User's no-migration assumption is supported for application data by E14–E15; actual external provider cross-directory resume not yet demonstrated.
- Contract dependencies: existing workspace validation/normalization, inactive Org manager, provider continuation, canonical frontend publication. Provider failure must remain visible rather than violating continuity.

## Supplements, assumptions and decisions
- `investigation-notes.md` is evidence authority; `evidence/current-owner-probe.json` is non-normative current-owner evidence.
- No behavior-defining supplement requires separate approval.
- DEC-001: Resolved by USER-20260922-SCOPE: all configured Agents in selected Team receive the selected workspace; historical task snapshots excluded as in presented scope.
- DEC-002: Resolved by USER-20260922-SCOPE: user identifies the mounted-Team Workspace Directory control; root Org global workspace remains unchanged as in presented scope.
- Assumption ASM-001: “offline” means stopped authoritative Org lifecycle, not network disconnection. Explicit in this baseline.
- Remaining technical uncertainty: real external session restore across directories and workspace-contextual configuration; investigate/validate without weakening preserved history.

## Traceability
| REQ | Use cases | AC | Scenarios |
| --- | --- | --- | --- |
| 001 | UC-001,003 | 001,004 | 001,003 |
| 002 | UC-002 | 001,002 | 001,004 |
| 003 | UC-002 | 003 | 002 |
| 004 | UC-003 | 004 | 003 |
| 005 | UC-002,003 | 002,003,005 | 001,002,004 |
| 006 | UC-004 | 006 | 004 |
| 007 | UC-001,003 | 001,005 | 001,004 |

## Architecture-phase input and readiness
Approved scenario basis: SCN-001–004, SR-002 / USER-20260922-SCOPE. Architecture must map existing stopped-save, persistence, propagation, restoration and canonical workspace-view boundaries. API/data-flow/files/size-risk decisions are intentionally deferred; source feasibility evidence is not an approved design.

Content ready and approved: **Yes** — scope confirmed, current/desired/preserved behavior, scenarios and ACs explicit.
User approval received / exact approved baseline / ready for architecture: **Yes**, SR-002 / USER-20260922-SCOPE. No other behavior-defining supplement pending. Design must complete before applicable handoff.
