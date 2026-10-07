# Requirements — Project workspace paths

## Document Status
- Package: `project-workspace-path`; baseline: `SR-002`; Status: **Approved**.
- Current solution revision: **SR-003** (architecture complete; intended requirements remain SR-002).
- Owner: Solution Designer; date: 2026-10-07.
- Authorities read: solution-designer skill and full requirements-engineering.md; all three requirements-phase templates; root/server/web AGENTS.md; full root DESIGN.md and TESTING.md.
- User clarified path/description-only entries and picker-as-convenience on 2026-10-07 (DEC-003/004 below). Full SR-002 approved by AP-001. Historical `create-or-update-project-tool` SR-002/AP-001 covered ID-based links, not this path-based request.
- Behavior-defining supplements: N/A — not applicable.

## Problem And Desired Outcome
The user requests analysis of replacing `workspace_id` with a workspace path plus optional description in `create_or_update_project`, including path-based Project JSON. Current tool/service/storage membership is ID-based even though JSON also contains the root path. Agents should express the user's folder directly, rather than discover opaque registry IDs.

## Relevant Current / Desired / Preserved Behavior
| ID | Scenarios | Current (evidence in investigation notes) | Approved desired outcome | Preserved |
| --- | --- | --- | --- | --- |
| BEH-001 | SCN-001/002 | Tool row requires workspace_id; workspace_path is rejected | Row requires workspace_path and accepts description?; acknowledgement identifies saved paths | Project create requires name; patch requires explicit project_id; authorization/native-MCP parity |
| BEH-002 | SCN-001/002/003 | Stored links require workspaceId + workspaceRootPath + description + addedAt; membership and availability use ID | Each durable workspace entry contains only workspaceRootPath and description; no workspaceId or addedAt | Existing paths/descriptions and Project/Task data survive; unavailable links remain representable |
| BEH-003 | SCN-002/003 | Omitted list preserves; supplied list replaces; [] unlinks only; retained omitted description preserves | Same behavior using paths to identify links | No workspace directory creation/deletion; no Task/delegation change |
| BEH-004 | SCN-004 | New tool links require prior node-local registration; UI can first register a root | A Project association accepts an absolute folder path directly without prior workspace registration; selecting a registered workspace is only a convenient way to supply its path | Node-local interpretation; no implicit remote access |

## Scope Guardrail
| Use case | Scope | Scenarios |
| --- | --- | --- |
| UC-001 | Create named Project with optional path/description links | SCN-001 |
| UC-002 | Update/clear Project links and link descriptions by path | SCN-002 |
| UC-003 | Reopen existing saved Projects and continue UI editing/unlinking | SCN-003 |
| UC-004 | Associate a supplied folder path without an ID-discovery/registration prerequisite | SCN-004 |
Out of scope: replacing workspace IDs throughout the application, new discovery tools, filesystem creation/deletion, Task behavior, delegation, UI redesign, release/deployment. Necessary adaptation of existing Project UI/API consumers is in scope, not a new product surface. Saving a Project association does not automatically register the path or create a directory. Existing workspace registration elsewhere is unchanged.
Preserved boundary: BEH-001–003. No reset/deletion of unrelated state.
Review authority: blocking design/implementation findings must cite approved REQ/AC/preserved behavior; new product policy, migration obligation, compatibility promise or threat model is a Requirement Gap requiring user approval. No downstream finding amends this approved basis itself.

## Requirements And Acceptance Criteria (Approved SR-002)
| REQ | Intended outcome | AC / observable verification | Traceability |
| --- | --- | --- | --- |
| REQ-001 | Optional workspaces array has rows `{workspace_path, description?}` rather than workspace_id; path is an explicit absolute node-local filesystem path, not a project ID; description remains optional | AC-001: native/MCP schemas and calls accept path rows, return path-identifiable saved links; malformed/old ID rows reject rather than guessing | UC-001/002, BEH-001, SCN-001/002 |
| REQ-002 | Persist each workspace association using only workspaceRootPath and description; retain the existing path field name, remove workspaceId and addedAt from the current entry shape | AC-002: newly saved workspace entries contain exactly workspaceRootPath and description, and survive save/reload without an ID or timestamp requirement | UC-001/003, BEH-002, SCN-001/003 |
| REQ-003 | Preserve existing Project create/patch semantics and list replacement/clearing, with path-based duplicate identity | AC-003: omitted list/retained description stays; [] unlinks; explicit blank description clears; duplicates and invalid inputs do not partially save Project metadata | UC-002, BEH-001/003, SCN-002 |
| REQ-004 | Preserve existing valid stored Project paths, descriptions, Project identities and Task/context/assignment data; no new bulk data migration or historical rewrite is required | AC-004: existing entries with path/description plus extra workspaceId/addedAt remain readable; reads do not rewrite files; ordinary saves emit only the current fields; absent registry membership never silently drops an existing link | UC-003, BEH-002/003, SCN-003 |
| REQ-005 | Existing Project list/detail/edit/unlink and live updates remain consistent with path-authored links | AC-005: path-authored links render, edit, unlink and reload through existing surfaces; no folder or unrelated registry changes from unlink | UC-002/003, BEH-002/003, SCN-002/003 |
| REQ-006 | Allow folder paths directly without prior workspace registration; the frontend selector supplies the selected root path, not a persisted ID | AC-006: tool and frontend manual-path authoring save path/description without registry or filesystem side effects; picker-selected path saves the same representation; folder-access/existence checks are not a prerequisite for storing this metadata reference | UC-004, BEH-004, SCN-004 |

## Relevant Scenarios And Journeys
| Scenario | Actor / goal / entry | Product-level sequence and outcome | Alternate/error | Validity and evidence |
| --- | --- | --- | --- | --- |
| SCN-001 | User asks selected agent to create Project for a folder | Agent supplies name + path + optional link description; saved Project exposes that folder association | Missing/invalid name/path rejects actionably | Supported Normal Scenario, approved path variation; user request + existing tool/UI |
| SCN-002 | User asks to update known Project's workspace links | Agent supplies explicit Project ID and complete desired list, or [] to unlink; retained omissions preserve description | Duplicate link or invalid row rejects Project mutation | Supported Normal Scenario; current tool contract and requested path substitution |
| SCN-003 | User opens an existing Project after update or unregistration | Existing links/Tasks still appear; link can be described/unlinked even if no longer registered | Unavailable folder does not erase recorded association | Supported Normal Scenario; existing Project docs/service and historical continuity |
| SCN-004 | User or agent supplies an absolute folder path, or user selects an existing workspace in the picker | Both authoring routes save the same path/description association without requiring the caller to obtain an ID | No automatic registration or directory creation; subsequent filesystem use retains its own access checks | Supported Normal Scenario (approved target); explicit user clarification that picker is convenience and tool callers do not know IDs |

## UI, Quality And Data Continuity
UI/UX specification/Product Team: N/A — not requested; preserve existing Project experiences rather than redesign. Quality: strict per-agent selection and native/MCP parity (REQ-001/AC-001); node locality, all-or-nothing invalid Project changes and no unrelated loss (REQ-003/004). Persisted data affected: Yes. Existing files contain root paths already; no evidence of a need to reconstruct paths from IDs. Data volume unknown (user data not inspected). No loss/reset of Project/Task content authorized. Workspace-entry IDs and addedAt are explicitly excluded from the desired representation and may disappear on ordinary save; Project-level timestamps remain unchanged in scope. Old files can retain obsolete extra fields until saved. This does not mean clearing old data or adding an upgrade rewrite.

## User Clarifications / Approval Basis
- DEC-001: user clarified that anyone managing a Project should pass a folder path directly, because tool callers do not know IDs. SR-002 approves registration-free Project associations; registration remains separate from storing a path reference.
- DEC-002: approved explicit absolute paths on the executing node, normalized by existing path conventions; no shell expansion/realpath/symlink-equivalence or filesystem-existence guarantee. A malformed path/row still rejects actionably.
- DEC-003 (user-directed, 2026-10-07): “The JSON itself should only contain the paths and description.” This means each workspace entry, not removal of top-level Project identity/name/description/timestamps. No per-link addedAt preservation requirement remains.
- DEC-004 (user clarification, 2026-10-07): frontend workspace selection is convenience; the saved value is its folder path, and callers can pass folder paths directly without knowing IDs. Tool/API/web consistency is therefore explicit scope, not a UI redesign.
- User also proposed no data migration because existing data is already there. Source confirms existing entries contain workspaceRootPath and description; retaining those fields makes obsolete-field tolerance feasible. No migration to rename the path field or eagerly scrub old JSON is proposed.
- Keep project_id and runtime workspace IDs elsewhere as-is. Only Project workspace associations become path/description-only.

## Architecture Phase Input / Readiness
Existing Project owner, persistence reader/writer, API/feed/web consumers and path utilities must consistently realize the approved behavior. Existing workspace runtime IDs outside Project associations need not be redesigned. Architecture must verify path normalization, exact writer/tolerant reader, changed ordering if addedAt is removed, and the released Projects migration's imported reader without inventing a new data migration.
Current evidence, scope, supported scenarios, continuity and ACs are established. Content ready for approval: **Yes (SR-002, full requirements above)**. Full SR-002 approved by AP-001, including no registration/existence side effects and absolute paths. Ready for architecture design: Yes. Architecture design completed in SR-003 (design-spec.md), Medium/High. Forward routing is subject to configured rules and independent review; no implementation/test result claimed. Independent review artifacts: N/A — not applicable yet.

## Approval AP-001 — 2026-10-07
- Exact user reply: “approve”.
- Directly answers the preceding scope-confirmation message: picker supplies a folder path; tool accepts workspace_path plus optional description; each stored workspace entry contains only workspaceRootPath and description, no workspaceId or addedAt; existing data is read without a separate migration and cleaned on ordinary saves; absolute paths require no prior registration/existence checking or directory creation.
- Approved baseline: SR-002, full requirements REQ-001–006/AC-001–006, BEH-001–004/SCN-001–004. No behavior-defining supplements.
- This is requirements approval, not independent review, implementation validation, user verification, finalization or release approval.
