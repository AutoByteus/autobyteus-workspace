# Requirements — Workspaces sidebar docking

## Document Status
- Package: `workspaces-sidebar-dock`; current requirements baseline **R2 / SR-003**. Prior approved R1/SR-001 retained in Git history and solution-revision-record.md.
- Status: **Approved**.
- Request: Project `project_f34a9537-07d7-449a-b78f-16368f1aa619`, Task `project_task_082715d8-9e38-4dc4-b89c-7a6b7d2a00ba`.
- Requested by: `/project_task_manager`, AgentRun `project_task_manager_2f7a8ea2d421446f8f22e4f616528547`.
- Owner: `/software_engineering_team/solution_designer`. R1 approval: within task direction, user informed2026-10-13. R2 approval: **User**, direct answer **“continue”** immediately after the explicit repository-only acceptance question2026-10-13. Scoped interpretation was stated to the user: repository-only finalization, installed identity/verification outstanding, no release/update/restart authority. Exact question/answer/context in `evidence/solution-acceptance-r2.md`.
- Exact R2 approval basis: unchanged functional BEH-001–003, SCN-001–003, REQ-001–004 and AC-001–006; source-only acceptance disposition for BEH-004/SCN-004/UC-004/REQ-005/AC-007/ASM-001 and DEC-004 below. R1 DEC-001–003 preserved. Approval supplement: `evidence/solution-acceptance-r2.md`, R2 context/version; user screenshots remain defect evidence, not normative fixture content.
- Authorities read: solution-designer SKILL.md; references/requirements-engineering.md; requirements and investigation templates; root AGENTS.md, DESIGN.md, TESTING.md; autobyteus-web/AGENTS.md; workspace_layout.md (2026-10-13).

## Problem And Desired Outcome
Opening Workspaces after collapsing navigation and moving the conversation/right-tool divider can cover and dim a wide layout. Open navigation beside content when docking is viable, reclaiming width rather than blocking the conversation/tools. Preserve genuine constrained-window drawers and all user work. Evidence and unknown runtime identity live in investigation-notes.md.

## Relevant Scenarios And Journeys
| ID | Actor / goal / trigger | Starting condition / product steps | Expected outcome and alternate | Validity / independent evidence | Requirement / AC |
| --- | --- | --- | --- | --- | --- |
| SCN-001 | User opens workspace navigation beside active conversation | Wide Team or agent/Activity view; collapse left; drag conversation/tool divider through default, intermediate, near maximum positions; click Workspaces | Docked navigation pushes content; chosen conversation and tool stay usable. When actual minimum widths cannot coexist, use existing responsive fallback | Supported Normal Scenario; user report plus collapsed/open Team and Activity screenshots | REQ-001–003 / AC-001–003 |
| SCN-002 | User repeats ordinary layout adjustments | Open/close left repeatedly, drag divider with left open/closed, shrink/grow window, switch Team/Activity | No stale scrim or hit blocker; usable panel bounds; retained user layout intent | Supported Normal Scenario; task done conditions and public collapse/drag/resize controls | REQ-002–003 / AC-003–004 |
| SCN-003 | User accesses navigation in genuinely constrained window | Narrow or short viewport; click Workspaces; dismiss via backdrop/Escape; keyboard navigate | Existing accessible drawer behavior and focus return; recovery to wide removes transient blockers | Supported Normal Scenario; task preserved behavior and workspace_layout.md | REQ-003–004 / AC-004–005 |
| SCN-004 | User selects work and receives a delivered fix | Workspace/run selection before/after layout adjustments; continue work; install/update only if chosen | Selection works without lost work; user-approved repository-only completion is permitted with installed-client identity/verification explicitly deferred; any actual release/runtime action remains separately authorized | Supported Normal Scenario; task preservation/delivery constraints and TESTING/RELEASE.md | REQ-004–005 / AC-006–007 |

## Relevant Current And Desired Behavior
| ID | Kind / scenarios | Evidence-backed current | Desired delta | Preserved |
| --- | --- | --- | --- | --- |
| BEH-001 | User / SCN-001 | Wide left-collapsed, user-sized right widths can cause open-drawer activation (baseline-policy-reproduction.json) | Viable docked Workspaces must reallocate horizontal space rather than cover/dim | Workspaces does not navigate, select a different run, change active tab or toggle tools off |
| BEH-002 | User/System / SCN-002 | Drag intent uses compact 200px center floor; measured effective right width is passed into shell policy | Stable capacity under collapse, expansion, drag and resize; preserve preferred width independently of temporary capacity | Existing default layout, left resize preference and tab ordering |
| BEH-003 | User/System / SCN-003 | <768px yields dual strips; short-height <=480px yields tools; modal lifecycle owns scrim/focus | Keep constrained fallbacks; no residual modality when docked | Escape, backdrop dismissal, focus trap/return, keyboard navigation, immersive and /mobile boundaries |
| BEH-004 | User/Operational / SCN-004 | Running user client identity not confirmed; supplied screenshots resemble macOS desktop | Regression proof on task-owned changed build; repository-only finalization accepted with installed identity/verification explicitly deferred, no updated-app claim | Conversations, Tasks, documents, active workers, other processes/data untouched |

## Stakeholders, Actors, And Outcomes
User needs immediate reliable navigation and continuing work. Engineering owns safe investigation/change/evidence. Delivery owns finalization, user verification and any approved rollout; urgency does not authorize data resets or service restarts.

## Scope Guardrail
### In-Scope Use Cases
UC-001: open Workspaces beside content (SCN-001). UC-002: adjust panels and window (SCN-002). UC-003: constrained navigation/keyboard behavior (SCN-003). UC-004: preserve selection/work and deliver safely (SCN-004).
### Out Of Scope
Team member default-collapse, PDF preview, backend Tasks/storage/runtime models, new navigation design, unrelated history performance, mobile redesign, restarting/upgrading the user's 8001 server as a proxy for a renderer update.
### Non-Goals
No general responsive-layout rewrite, new universal screen breakpoint, pixel-match of screenshot text, or paid-provider test campaign.
### Preserved Behavior Boundary
BEH-001–004; REQ-003–005; AC-004–007. Temporary width reallocation is allowed; navigation/selection changes and data loss are not.
### Review Authority
Blocking corrections must cite an approved REQ/AC/BEH. New behavior/policy is a Requirement Gap requiring approval. Out-of-scope issues become follow-ups; reviewer proposals do not alter this authority.

## Requirements
| ID | Requirement | Behavior / priority / rationale |
| --- | --- | --- |
| REQ-001 | With collapsed navigation and docked user-sized right tools, Workspaces opens docked when the current navigation width, existing right-tool minimum, drag-enabled center minimum and resize handles can coexist. Assess space after reallocation, not whether the current divider position can remain unchanged. | BEH-001 / urgent / user's explicit push-not-overlay intent |
| REQ-002 | Reallocate current right-tool width when needed without losing its user-preferred width or resize intent. Preserve the right-tool minimum and the existing drag-enabled center floor. Re-expansion/collapse/resize must be deterministic and not create clipping or oscillation. | BEH-002 / urgent / fit both usable surfaces |
| REQ-003 | Docked navigation has no scrim, modal trap or invisible click blocker. Repeated transitions clean up transient modality and keep visible conversation/tool controls hit-testable. | BEH-001–003 / urgent / no dimming or blocked controls |
| REQ-004 | Preserve actual insufficient-capacity, narrow and short-height fallback behavior, keyboard/focus semantics, Workspaces non-navigation action, workspace/conversation selection, active tool/tab and all user work. | BEH-001–004 / critical / existing UX and data continuity |
| REQ-005 | Prove defect and regression via durable automated coverage and realistic rendered evidence on task-owned current source/build. For this user-approved repository-only delivery, explicitly report affected client/platform/version/server as unconfirmed and installed-app verification as deferred, alongside actual finalization, release/runtime, residual checks and cleanup state. Require separate confirmation/authorization before any later app-specific rollout or installed-runtime acceptance. Do not disturb user services or infer update from merged source. | BEH-004 / critical / user's safe delivery request |

## Acceptance Criteria
| ID | Links | Preconditions / action | Observable outcome / verification |
| --- | --- | --- | --- |
| AC-001 | REQ-001,003 / BEH-001 / SCN-001 | Wide 1000,1280,1440 CSS-px test windows at usable height; default 320px navigation; collapse, drag right panel to intermediate/near-maximum; click Workspaces in Team and Activity | Docked navigation; content starts to its right; right tools remain docked; no left scrim/dialog or blocked controls. Assertions on rects/presentation/hit tests plus screenshots |
| AC-002 | REQ-001,002 / BEH-002 / SCN-001 | Test exact minimum capacity boundary for current navigation width and neighboring pixels after explicit divider drag | Both docks above/at feasible boundary; right >=400px and center >=200px (current existing minima); below boundary preserve responsive fallback without invalid widths. Include non-default nav widths |
| AC-003 | REQ-002–003 / BEH-001–002 / SCN-002 | At least three open/close cycles and divider drag with left open/closed | No oscillation, clipping, stale shading or invisible hit blockers; preferred right width/intent retained; temporary effective width recovers with restored space |
| AC-004 | REQ-003–004 / BEH-003 / SCN-002–003 | Resize wide→narrow→wide including while drawer open | Correct surfaces; dismiss/transition removes stale scrim and modal ownership; controls usable after recovery |
| AC-005 | REQ-004 / BEH-003 / SCN-003 | 767/768 boundary, representative 700px and short 480px height; open/dismiss Workspaces; keyboard/Tab/Escape | Existing constrained drawer and focus behavior preserved; no forced dock into unusable space; no new /mobile or immersive behavior |
| AC-006 | REQ-004 / BEH-004 / SCN-004 | Realistic run/workspace navigation before/after adjustments | Workspaces itself changes no route/run/tab; explicit workspace and conversation selection still works; existing test-owned conversations/Tasks/documents/workers survive. No user-data mutation |
| AC-007 | REQ-005 / BEH-004 / SCN-004 | Completion package | Exact commands/results and build identity; rendered before/after evidence; repository finalization verified separately from installed-client/runtime state. Under approved R2, the affected-client/platform/version/server remains explicitly unconfirmed and installed-app verification deferred, not a blocker to source-only completion and never a passed installed-app check. No release, install/update/restart performed or implied. Durable paths, remaining user-only checks and owned-resource cleanup receipt required |

## UI, Interaction, And Experience Requirements
Applicable: Yes. Normative interaction is REQ/AC above. Product-owned UI/UX supplement, separate design repository, Product ticket/approval/runnable visual baseline: **N/A — not applicable**, bug fix not Product Design request. Screenshot contents are illustrative. Keep normal controls and keyboard behavior.

## Quality And Non-Functional Requirements
QR-001 (REQ-002–004, AC-002–006): reliability/usability — geometric minima, stable transitions and hit-testable controls. QR-002 (REQ-005, AC-007): operability/privacy — isolated execution with no user service/data disruption, measured evidence and cleanup.

## Data Continuity And Acceptable Loss
No persisted data or schema change authorized. Preserve every conversation, Task, document and active worker. No acceptable loss/reset. Layout preferences are existing in-memory state; retain user intent. Do not test on the user's live 8001 endpoint/data or replace its app to prove a fix.

## External Contracts And Dependencies
TESTING.md governs isolated test ownership; RELEASE.md governs source finalization and user-chosen release. Actual screenshot client/version/server remains unknown; the user-approved R2 source-only disposition permits repository finalization with that identity/verification explicitly deferred. It never permits claiming user runtime updated.

## Supplemental Artifacts
Investigation notes own screenshot paths and baseline-policy-reproduction.json. R2 acceptance/approval supplement: `evidence/solution-acceptance-r2.md`; exact direct question and user “continue”, with stated scoped interpretation. Screenshots are evidence-only. Product design/review supplements: N/A — not applicable.

## Assumptions And Decisions
| ID | Reasoning then recommendation / decision | Owner / status |
| --- | --- | --- |
| DEC-001 | User asks push rather than overlay, and existing right width is already a preference subject to capacity. Recommend and decide temporary right-width reallocation with preference retained, instead of simply forcing dock or hiding right tools. | Solution Designer / Decided within direction |
| DEC-002 | Existing 400px right minimum, 200px post-drag center floor and narrow/short fallbacks define usable bounds. Recommend retain them, not invent a screenshot-derived breakpoint. Default both-dock capacity after drag is 320+6+400+4+200=930px; depends on actual navigation width. | Solution Designer / Decided within direction |
| DEC-003 | Screenshots do not pin client build; upgrading a connected backend does not ship the renderer. Recommend separate source proof, affected-client confirmation and delivery approval. No release/update decision made here; default no release if user requests none per RELEASE.md. | Solution Designer / Decided; release choice belongs to user later |
| ASM-001 | Source defect is shared-renderer capacity policy; actual installed client/version/connection not inspected. R2 explicitly defers that identity and installed check for repository-only completion; it remains mandatory before any later installed-runtime acceptance. Existing source/native/browser proof retained, no new source issue inferred. | User-approved R2 deferral / remains unconfirmed, not a source-finalization blocker |
| DEC-004 | Browser and isolated Linux native evidence adequately prove shared-source behavior, but cannot identify the user's installed client. Recommend finishing repository-only now with unknown installed identity/verification explicit, rather than retesting sufficient source proof or touching live data. User answered “continue” after that specific proposal; proceed only with source finalization, no publication/update/restart. | User / Approved R2; exact context in evidence/solution-acceptance-r2.md |

## Traceability
REQ-001→UC-001→BEH-001→SCN-001→AC-001–002; REQ-002→UC-001–002→BEH-002→SCN-001–002→AC-002–003; REQ-003→UC-001–003→BEH-001–003→SCN-001–003→AC-001,003–004; REQ-004→UC-001–004→BEH-001–004→SCN-001–004→AC-004–006; REQ-005→UC-004→BEH-004→SCN-004→AC-007.

## Architecture Phase Input
Map SCN-001–004 to actual shell/drag/viewport/drawer lifecycle. Verify prospective fit vs currently measured right width, resolved width publication and focus cleanup. No persistence, backend or Electron-main change required on current evidence.

## Readiness Check
Problem/current evidence/desired-preserved/scope/testability/scenario validity/decisions: Yes. Evidence supplements consistent: Yes. Product approval: N/A. Approval recorded exact R2 source-only disposition and preserved R1 functional basis: Yes. Technical design remains valid and re-aligned to R2/SR-003, no production changes or duplicate implementation route needed. No material decision blocks source-only finalization. Installed runtime identity/verification explicitly deferred, not passed or waived silently; any later rollout requires its own authority.
