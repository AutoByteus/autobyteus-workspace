# Requirements — ORG-STOPPED-CONFIG-20260917-001

## Document status
Approved SR-001 baseline; approval recorded as SR-002; Solution Designer; 2026-09-17. User explicitly affirmed the proposed Team-parity scope and clarified same-runtime model switching and settings for the same model. No implementation assignment yet.

## Problem and desired outcome
Stopped Org members lose the monitor Settings and new-run (+) controls. Unlike standalone Teams, the current Org Settings surface is also entirely read-only. A user should inspect and change a stopped configured member's model settings, preserve the existing conversation, and continue with the saved settings. Cover direct Org Agents and Agents in mounted Teams.

## Current, desired and preserved behavior
| ID | Scenario | Current evidence | Desired outcome | Preserved boundary |
|---|---|---|---|---|
| BEH-001 | SCN-001 | Org gates header and Settings entry on live access; stopped configured members are continuable | Settings and + available for a selected stopped configured member | Existing header placement, accessibility, active inspection |
| BEH-002 | SCN-001,003 | Org panel locks all settings; standalone editor saves model settings | Save selected member's compatible model and model-specific parameters while Org stopped | Runtime/workspace, other members and run identities unchanged; no active-run editing |
| BEH-003 | SCN-002 | Org + opens new Org configuration | Same new-run action accessible from stopped member | Never repurpose + as add-member or modify existing run |
| BEH-004 | SCN-001,003 | Existing continuation restores root then sends to exact member | Saved configuration survives reopening and is used on ordinary continuation | History, Activity, attachments, drafts, member addresses, lazy startup and task policy |

## Actors and scope guardrail
Actor: user inspecting a retained Org run and preparing its next message.
- UC-001 / in scope: stopped configured-member Settings, inspect/edit/save/reopen/continue; both direct and mounted placements.
- UC-002 / in scope: stopped-member + enters ordinary new Org configuration.
- UC-003 / in scope: active, stale-target and failure protection for these actions.
- Out of scope/non-goals: changing runtime/provider family or workspace on existing runs; editing definitions; bulk Org/Team defaults propagation; editing delegated task configurations; migration/data repair; redesign; Electron packaging/release.
- Preserve BEH-003/004 and standalone Team/Agent behavior. No history or data loss is acceptable.
- Review authority: blocking corrections must trace to approved REQ/AC/BEH; new policy or adjacent scope requires a requirements revision and user approval.

## Requirements
| ID | Requirement | Behavior |
|---|---|---|
| REQ-001 | Selected stopped configured direct/mounted Org members expose Settings and + in the existing monitor header. | BEH-001 |
| REQ-002 | Settings shows the selected member's persisted model configuration and permits compatible model/parameter edits with explicit Save, following existing stopped-Team validation conventions. Save affects that member only. | BEH-002 |
| REQ-003 | Existing runtime and workspace remain locked. Editing is allowed only while the enclosing Org is authoritatively inactive, not merely because one leaf is Offline. Active inspection remains read-only. Stale selection, activation, invalid values and failed/uncertain persistence must not report a successful save or apply to another member. | BEH-002,004 |
| REQ-004 | Inspecting/saving does not activate providers. Saved settings persist through reopening and ordinary continuation, retaining identities, history/Activity, drafts/attachments and unaffected members. | BEH-004 |
| REQ-005 | + opens ordinary new Org configuration without activating or altering the existing Org. | BEH-003 |
| REQ-006 | Preserve standalone Agent/Team controls and current task/active-run restrictions; no new delegated-task editing capability. | BEH-001,002,004 |

## Scenarios and acceptance criteria
All scenarios are approved SR-001 scope, confirmed in SR-002. Normal scenario basis is the user's screenshots/request and existing Team Settings/new-run flows. Alternate/failure basis is existing stopped-run validation and retained identity contract, not a new recovery product.
| Scenario | Validity, trigger and sequence | Expected outcome / alternate | AC / requirements |
|---|---|---|---|
| SCN-001 | Supported Normal Scenario: user opens stopped Org history, selects configured direct or mounted member, opens Settings, changes valid model/parameter, saves, returns/reopens and sends an ordinary message | Controls visible; exact canonical values; durable selected-member change; continuation uses new values and preserves conversation; no startup on inspection/save | AC-001: both placements show controls and gear opens exact member; AC-002: save/reopen/continue verifies values and unchanged peer; AC-003: zero startup on read/save and retained identity/history/Activity/draft/attachments. REQ-001,002,004 |
| SCN-002 | Supported Normal Scenario: selected stopped Org member → + | New Org configuration appears; old run remains stopped and unchanged; no provider launch merely opening form | AC-004; REQ-005 |
| SCN-003 | Supported Normal Scenario alternates: active Org with offline leaf; invalid settings; ordinary service failure; user changes selection while Settings request pending; another connection activates root before Save | Active remains noneditable; validation is visible; no false success, cross-target write or implied saved state; user can retry/reload after uncertain persistence | AC-005; REQ-003 |
| SCN-004 | Supported Normal Scenario preservation: inspect standalone Agent/Team, active Org and historical task | No regression in existing controls or policy; task configuration is not made editable | AC-006; REQ-006 |

Verification intent: durable rendered header/editor plus real owner/store/API tests; actual UI stopped direct and mounted Settings→Save→reopen→Send and + journeys. No manually calling an API substitutes for supported UI reachability. Live validation uses isolated data and owned services, not the user's running conversations.

## UI and quality
Use current gear/+ layout and forms, keyboard-operable labelled controls, explicit loading/error/Save feedback. Product prototype N/A: no redesign requested; screenshots are evidence, not new prototype authority. QR-001 (REQ-003/AC-005): no incorrect success or wrong-target persistence. QR-002 (REQ-004/AC-003): zero runtime/provider activation on inspect/save.

## Data continuity and dependencies
Persisted run configuration is affected. Preserve root/member IDs, routing addresses, runtime references, history, raw traces, Activity, attachments, drafts and all untouched configuration. No reset, conversion, deletion or repair authorized. Definition packages remain unchanged. Existing model compatibility/schema validation and retained-run continuation are dependencies; architecture must establish Org-owned canonical persistence rather than assume standalone mutation is suitable.

## Supplements, assumptions and open decisions
Evidence: investigation-notes.md and four evidence/*.png (read-only user observations; not behavior supplements). No Product-owned artifacts.
Assumption ASM-001 confirmed by approval: parity means model/model-specific settings for the selected configured Agent, not changing all Org defaults or task runs. This follows the focused member Settings request.
DEC-001 resolved: user approved SR-001 on 2026-09-17; no other product clarification needed. Backend persistence/lifecycle integration is an architecture investigation question, not a user question.

## Traceability / architecture input / readiness
UC-001 → BEH-001/002/004 → REQ-001/002/004 → AC-001/002/003 → SCN-001.
UC-002 → BEH-003 → REQ-005 → AC-004 → SCN-002.
UC-003 → REQ-003/006 → AC-005/006 → SCN-003/004.
Architecture must verify canonical Org configuration ownership, restore readers, inactive save guards and model selection validation. A header-only patch is insufficient. Final size/risk and review route are deferred until completed design; not classified as Small solely from screenshots.
Readiness: evidence, scope, intended/preserved behavior, traceable ACs and data constraints complete; Approved. Approved basis ready for design: Yes, SR-002 records explicit approval.

## Approval reference — SR-002
User reply to scope approval request on 2026-09-17: “Yeah, basically the behavior should be similar to agent teams.” User further specifies: “for the same runtime ... change the model” and “change some configuration setting for the same model.” This approves the preceding SR-001 scope, including direct/mounted member parity, preserved runtime/workspace and existing + action. User requests studying origin/personal nested-Team implementation as evidence, not copy/paste or expanded nesting support.

Compatibility clarification (existing Team policy, reaffirmed by user): REQ-002/AC-002 replacement model uses the same runtime and verified context capacity >= the current model. Same-model parameter edits retain existing schema validation and do not require a replacement-capacity comparison. This is reuse, not a new selection policy.
