# Requirements — create or update Project tool

## Package And Approval
- Package: `create-or-update-project-tool`; baseline: `SR-002`.
- Status: **Approved**. User approval: **AP-001**, recorded 2026-10-06 after workspace-link/JSON clarification.
- Original request: “i foudn that we missed one tool creating or update project”, with screenshot of the Project Task Manager's selected Tools.
- Workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/create-or-update-project-tool`.
- Branch: `codex/create-or-update-project-tool`.
- Base: refreshed `origin/personal` at `68261f8111e2f0eb119824c91a2650410c9aeffa` on 2026-10-06.
- Finalization target: `origin/personal`; no release/deployment requested.
- Approved basis: this entire SR-002 requirements baseline. No behavior-defining supplements or Product UI/UX package.

## Problem And Goal
Project authoring already exists through the UI/service, but agents can only list Projects and author Tasks. Add the missing `create_or_update_project` capability, including selection by the shipped Project Task Manager, so user-requested Project creation and metadata/workspace-link editing can precede Task planning.

## Scope Guardrail
In scope: one node-local tool for Project name/description creation or explicit patch by Project ID, with optional links to existing registered workspaces; native/MCP parity and per-agent selection; shipped Manager tool configuration/instructions; existing project constraints; documentation and executable verification.
Out of scope: filesystem workspace creation/registration, new workspace-discovery tool, Project deletion, batch mutation, automatic run launch, Task behavior changes, UI redesign, auto-refresh, schema changes, feature-default changes, custom-agent automatic permission grants, release/deployment.
Blocking corrections must trace to approved REQ/AC/preserved behavior. New policies or capabilities require renewed user approval.

## Behavior
| ID | Current | Desired | Preserved |
| --- | --- | --- | --- |
| BEH-001 | Agents list Projects; no Project mutation tool exists | Agent creates a Project with required nonblank name and optional description/workspace links | Node-local identity, trimmed strings, case-insensitive name uniqueness; omitted workspaces create no links |
| BEH-002 | UI supports Project metadata editing; agent cannot edit it | Known explicit Project ID patches name, description and/or workspace list; omitted fields persist, blank description clears | Same identity and existing Tasks/context/assignments remain; omitted workspace list stays unchanged; unknown ID never becomes creation |
| BEH-003 | Manager selects three Project/Task tools | Manager also selects and explains the new tool; other agents can select it independently | Selection-based permission, no feature-flag coupling; existing discovery/delegation/status workflow |

## Supported Scenarios And Use Cases
| ID / Use case | Actor / goal / trigger | Product sequence | Outcome / relevant alternate | Validity / evidence |
| --- | --- | --- | --- | --- |
| SCN-001 / UC-001 | User asks Manager or a tool-enabled agent to create a named Project | Agent resolves ambiguity, discovers existing Projects, creates the requested new Project with optional known registered workspace IDs, retains returned ID for Task work | Saved Project is listed; missing/blank name or duplicate name is rejected without creating another Project | Supported Normal Scenario (proposed new agent path); user request + existing UI authoring |
| SCN-002 / UC-002 | User asks agent to rename, edit description or edit workspace links of an existing Project | Discover/resolve real ID, patch explicitly supplied fields and optionally supply the complete desired workspace list, confirm saved Project | Omitted fields preserved; blank description clears; supplied workspace list replaces links, [] unlinks all without deleting folders; unknown ID, empty patch or conflicting name rejected without unrelated changes | Supported Normal Scenario (proposed agent path); existing UI/service edit contracts |
| SCN-003 / UC-003 | A selected agent invokes mutation with invalid input or lacks selection | Reject malformed ID/type/unsupported arguments; no name-based implicit upsert; unselected tool cannot execute | Domain error is actionable; no false success or broad permission grant | Supported Explicit Edge Scenario; existing strict tool and session-selection contract |
| SCN-004 / UC-004 | User asks agent to link existing registered workspaces, edit link descriptions or remove links | Provide known workspace IDs and complete desired list; confirm Project links | Omitted list preserves all links; explicit [] clears only links; duplicate IDs or unregistered additions reject whole change | Supported Normal Scenario (proposed agent path); user clarification and existing Project editor/service aggregate forms |

## Requirements And Acceptance Criteria
| REQ | Requirement | AC / observable verification | Behavior / scenarios |
| --- | --- | --- | --- |
| REQ-001 | Expose `create_or_update_project` using `project_id?`, `name?`, `description?`, `workspaces?`; absent ID means creation with required name, optional description defaulting to empty | AC-001: native and MCP creation of trimmed name/description returns saved Project identity/metadata and workspace-link confirmation; `list_projects` includes matching saved values; creation without description saves empty string | BEH-001 / SCN-001 |
| REQ-002 | Present known ID means patch of at least one name/description/workspaces field; no implicit create; omitted values preserved | AC-002: name-only, description-only, workspace-only and combined patches retain ID and omitted metadata; explicit empty/whitespace description clears; persisted Tasks/context/assignments remain unchanged; omitted workspace list remains unchanged | BEH-002 / SCN-002 |
| REQ-003 | Strict argument validation and existing name constraints; reject null/blank ID rather than treating it as absent; description must be a string when provided | AC-003: missing/blank create name, null/blank ID, wrong types, unknown keys, empty patch, unknown ID and duplicate normalized name fail actionably without unintended mutation; errors/results have native/MCP parity | BEH-001/002 / SCN-001/002/003 |
| REQ-004 | New tool independently selectable per agent and node; shipped Project Task Manager selects it and uses it only for user-requested Project changes | AC-004: catalog/schema/native registration/MCP listing and selection recognize new tool; unselected session cannot call it; fresh bootstrapped Manager definition includes it and instructions resolve ID ambiguity; custom agents are not auto-granted it | BEH-003 / SCN-001/002/003 |
| REQ-005 | Preserve existing Project/Task and delegation behavior; do not claim success without confirmed saved result | AC-005: existing tool/permission/bootstrap regressions pass; feature default and UI Refresh behavior unchanged; uncertain save result does not assert rollback or confirmed success | BEH-001/002/003 / SCN-001/002/003 |
| REQ-006 | Accept optional `workspaces` array of `{workspace_id, description?}`. Create defaults to no links; update omission preserves all links, provided list is complete replacement, [] removes all links. Known retained links preserve root snapshot/added time and omitted link description; new links require current-node registration. Null list/rows/IDs, wrong types, duplicate IDs and unknown row keys are invalid | AC-006: native/MCP create-with-links, workspace-only replacement, explicit clearing and link-description patch persist correctly; omitted description for retained link persists and blank clears; invalid list/new unregistered IDs cause no partial metadata/link save; Tasks, workspace registrations and physical directories unchanged | BEH-001/002 / SCN-001/002/003/004 |

## UI And Product Design
No new UI layout/interaction spec. Existing agent detail Tools list reflects the additional selected tool through existing presentation. Product Team not requested; all Product-owned artifacts/visual baselines are N/A — not applicable.

## Data Continuity And Quality
Existing Project metadata and links are affected by intentional edits. Preserve Project identity, creation time, omitted metadata/links, Tasks, files, assignments and run history. Only explicitly supplied fields may change; description may be explicitly cleared and an explicit workspace list may replace/remove links. Workspace registrations and filesystem directories are never created, deleted or altered by this tool. No reset or unrelated deletion is acceptable. Node locality, strict selection authorization, input validation and serialized name uniqueness remain required. No new performance/availability claim. Tests must use isolated test-owned data, never the user's installed app/data.

## Contracts, Assumptions And Open Decisions
Existing service Project naming and persistence contract; shared native/MCP contract and session selection; built-in template bootstrap remain governing evidence. ASM-001 resolved by user request to add optional workspaces. Approved field is an array of `{workspace_id, description?}` objects referencing existing node-local registered workspaces. Approval AP-001 applies to revised baseline after the optional-list/replacement proposal and clarification of persisted workspace objects. Existing retained-link descriptions are preserved if omitted, and explicit blank description clears; new links default description to empty. Missing/unregistered new IDs and duplicate IDs reject the entire mutation before saving. No current workspace-discovery agent tool was found; callers must provide known registered IDs, and agents must not guess them. New discovery/registration tools are outside this request. No unresolved feasibility blocker found, but current service update takes a full name/description; architecture must establish omission-preserving atomic patch semantics rather than assume existing update is a partial patch.

## Architecture Phase Input
Map approved SCN-001–004 to existing project service, tool registration/manifest/MCP exposure and built-in template paths. Verify partial-update ownership, read-time view/write-failure semantics, runtime exposure and tests. These are questions/constraints, not an authoritative target design. Task size/risk: N/A until design complete. Architecture/code review: N/A — not applicable yet.

## Readiness
Problem/current behavior/scope/scenarios/traceable AC/data constraints: ready. Supplements: N/A. Requirements content ready: Yes. Explicit user approval received: Yes (AP-001). Ready for architecture: Yes. Ready for implementation: No, design/review/routing gates remain. Next action: complete architecture design from SR-002.


## Approval Record AP-001
- User message on 2026-10-06: “Yes, that makes sense then. Just I think it makes sense. Currently it's so we need to support an optional like workspaces in the arguments as well.”
- Context: explicitly requested approval of expanded create/update tool scope with optional array of existing registered workspace IDs, omitted-list preservation, complete-list replacement and [] unlinking only. User asked what link means and whether it is a JSON attribute; clarified that it is the existing stored workspaces array, not a shortcut or filesystem operation. User then affirmed the proposal and optional argument support.
- Approved requirements baseline: SR-002, REQ-001–006/AC-001–006, SCN-001–004; no additional behavior-defining supplements. Name/description create/patch, preserved data and Manager selection remain as presented. No release or workspace registration requested.
