# Requirements Document — Saved team workspace clarity

## Document status
- **Package:** `team-workspace-saved-value-warning`; **revision:** SR-003 (approval capture); **status:** Approved.
- **Request:** User screenshot/report, 2026-09-26. **Owner:** Solution Designer.
- **Approval reference / approved baseline:** User's 2026-09-26 reply “Yeah … i meant use the path,” following the explicit proposal to show the saved path as the fixed value instead of requiring an ID-based picker. Approved behavior baseline: SR-001 as clarified by evidence-only SR-002; approval recorded in SR-003. This does not approve changing new-run workspace selection or other workspace-ID uses.
- **Behavior-defining supplements:** N/A. User screenshot is evidence, not a specification.

## Problem and proposed outcome
An existing Software Engineering Team run displays its saved Workspace Directory path in a disabled **New** control, then says “Saved value is unavailable in current options.” in orange and repeats the same path in a green `Workspace: …` line. The warning is not based on an actual availability check. **Approved outcome:** Show the saved path once as a read-only value, with neutral “Workspace is fixed for this saved run” context. Omit the Existing/New chooser, unverified warning, and redundant green success line in this fixed team-run context. Preserve the saved workspace and all model-editing behavior.

## Relevant behavior
| ID | Kind / scenarios | Evidence-backed current behavior | Approved desired behavior | Preserved behavior |
| --- | --- | --- | --- | --- |
| BEH-001 | User / SCN-001 | Saved team root shows disabled New path, orange warning, green duplicate. | Single fixed, read-only path with neutral context. | Exact persisted root path, immutability, other settings. |
| BEH-002 | User / SCN-002 | Saved member path uses same `historical-only` projection and selector. | Same fixed-path clarity for member rows. | Exact member paths and hierarchy. |
| BEH-003 | User / SCN-003 | New-run workspace selection is interactive; stopped saved team permits model edits but not workspace edits. | No change. | Existing launch selection, model edit/save and validation. |

## Stakeholders and scope guardrail
- **Actor:** User reviewing existing team configuration before resuming or changing permitted model settings.
- **UC-001:** View saved team root Workspace Directory. **UC-002:** View saved member Workspace Directory.
- **Out of scope:** Change or repair a saved workspace; remap a path to a current workspace ID; check filesystem existence; change backend availability policy, standalone Agent, Agent Org, new-team launch, or unrelated model warnings; migrate/rewrite run history.
- **Non-goal:** A new workspace-management capability.
- **Preserved boundary:** BEH-001–003 and AC-003; saved run path is not modified by model Save.
- **Review authority:** A blocking correction must cite an approved BEH/REQ/AC ID. New availability checking, path remapping or editability is a requirement gap requiring user approval, not an automatic design correction.

## Requirements
| ID | Requirement | Behavior | Priority / rationale |
| --- | --- | --- | --- |
| REQ-001 | For a saved team run with a nonempty stored path, show that exact root/member path once as a fixed, noneditable Workspace Directory value. | BEH-001–002 | Must; avoid implying an editable new choice. |
| REQ-002 | Do not claim the saved team workspace is unavailable without a real availability check; do not show selection-success feedback for a fixed saved value. | BEH-001–002 | Must; current state is contradictory and warning is unconditional. |
| REQ-003 | Do not alter saved paths, allow workspace editing on saved team runs, or affect new-team selection and stopped-run model edits/saving. | BEH-001–003 | Must; presentation-only scope. |

## Acceptance criteria
| ID | Related IDs | Trigger | Observable outcome | Alternate / verification |
| --- | --- | --- | --- | --- |
| AC-001 | REQ-001–003, SCN-001 | Open saved team configuration with nonempty root path. | Exact path appears once, read-only, with fixed-run context; no Existing/New chooser, unverified warning or duplicate green line. | Same neutral display even if path absent from current inventory; rendered app/component check. |
| AC-002 | REQ-001–003, SCN-002 | Expand saved team member with stored path. | Exact member path receives same fixed/read-only, nonduplicated presentation. | Null path is not invented or shown as success; component check. |
| AC-003 | REQ-003, SCN-003 | Start new team or save stopped-team model change. | New-run workspace picker still works; existing run's workspace remains fixed and unchanged by model Save. | Existing validation/error behavior preserved; regression tests. |

## Relevant scenarios and journeys
| ID | Validity / kind | Goal and supported trigger | Product-level sequence and expected outcome | Alternate / evidence |
| --- | --- | --- | --- | --- |
| SCN-001 | Supported Normal Scenario / User | Review saved root path; existing team run → Edit Config. | View Workspace Directory → understand exact fixed path without contradictory status. | Inventory mismatch is not presented as verified unavailability; user screenshot + live Electron reproduction. |
| SCN-002 | Supported Normal Scenario / User | Review saved member path; expand Team Members Override. | View member Workspace Directory → understand stored fixed path. | Null path stays empty/neutral; current form and projection source. |
| SCN-003 | Supported Normal Scenario / User | Choose workspace for new team or edit permitted stopped-run model. | Launch uses editable workspace selector; saved team retains model editing only. | Existing errors/validation preserved; form/store source. |

## UI and quality
- Existing UI surface only; no Product Design/Prototyping request, prototype, UI/UX specification or approved visual reference (`N/A — not applicable`).
- Approved normative interaction: one accessible read-only path and neutral fixed-run explanation; no chooser or availability/success feedback in stored team mode. Styling/wording may follow existing design language without changing meaning.
- QR-001 (REQ-003/AC-003, compatibility): No changed persisted run configuration or saved-model mutation payloads.

## Data continuity and contracts
- **Persisted data affected:** No expected data change. Preserve exact root/member path and run history; no acceptable loss or reset.
- Team execution tree contract carries `workspace_root_path: string | null` but no workspace ID or verified availability; a missing ID cannot prove unavailability (`autobyteus-team-stream-contracts/src/team-execution-view-dtos.ts`).
- Workspace ID is needed by the current **editable new-launch picker** to select registered metadata, but team launch payloads and saved execution use `workspaceRootPath`. No ID is needed merely to render the saved team's fixed path. See `investigation-notes.md` SR-002 source log.
- Physical directory existence is unknown and out of scope. No migration implied.

## Supplements, assumptions and decisions
- Evidence supplement: user screenshot at path in `investigation-notes.md`; not behavior-defining and not subject to approval.
- ASM-001: User wants clear read-only path display rather than requiring a workspace ID on this saved-run page — confirmed by user reply above. Saved-run workspace editing was not requested.
- DEC-001: Single fixed-path display approved by user reply above. The alternative disabled chooser was not selected.

## Traceability and architecture input
- REQ-001–002 → UC-001/002 → BEH-001/002 → SCN-001/002 → AC-001/002; evidence: screenshot, live reproduction, projection and selector code.
- REQ-003 → UC-001/002 → BEH-001–003 → SCN-003 → AC-003; evidence: form/store code.
- After approval, architecture must map SCN-001–003 to production paths, isolate stored team display from shared editable/Agent Org usages, and preserve path-authoritative history and model-only Save.

## Readiness
- Evidence-backed current behavior, proposed/preserved behavior, scope, scenarios, testable ACs and decision ownership: **Yes**.
- Content ready for explicit user approval: **Yes**. Approved basis ready for architecture: **Yes** — user reply above applies to the proposed saved-team page scope only.
