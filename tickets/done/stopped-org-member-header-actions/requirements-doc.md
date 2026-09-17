# Requirements — ORG-STOPPED-CONFIG-20260917-001

## Document status
Approved SR-004 revised baseline — approval SR-005, 2026-09-17. User replied ‘confirm’ to the explicit two-part revised-scope request (source-configuration-seeded new Org draft and accurate missing-model hint). Prior SR-001/SR-002 authority remains for unchanged Settings requirements. This approval does not retroactively extend the narrower earlier Plus contract. IR-001 and its successful validation evidence are preserved; F-001/F-002 corrections now pass actual API-REV-002 browser checks. Current F-003 design recovery is scoped to existing standalone Team preservation REQ-006/AC-006; no changed intended behavior or new approval requested.

## Problem and desired outcome
Stopped Org members lose the monitor Settings and new-run (+) controls. At the initial baseline, unlike standalone Teams, the Org Settings surface was also entirely read-only. IR-001 now implements Settings and API has validated the native paths; the current recovery addresses Plus inheritance and empty-model feedback. A user should inspect and change a stopped configured member's model settings, preserve the existing conversation, and continue with the saved settings. Cover direct Org Agents and Agents in mounted Teams.

## Current, desired and preserved behavior
| ID | Scenario | Current evidence | Desired outcome | Preserved boundary |
|---|---|---|---|---|
| BEH-001 | SCN-001 | Org gates header and Settings entry on live access; stopped configured members are continuable | Settings and + available for a selected stopped configured member | Existing header placement, accessibility, active inspection |
| BEH-002 | SCN-001,003 | Org panel locks all settings; standalone editor saves model settings | Save selected member's compatible model and model-specific parameters while Org stopped | Runtime/workspace, other members and run identities unchanged; no active-run editing |
| BEH-003 | SCN-002 | Org + routes only definition defaults, losing source run values; actual API direct/mounted failure F-001 | New editable Org draft starts from existing enclosing run configuration, including saved member values | New run, not add-member/resume/history clone; source unchanged |
| BEH-004 | SCN-001,003 | Existing continuation restores root then sends to exact member | Saved configuration survives reopening and is used on ordinary continuation | History, Activity, attachments, drafts, member addresses, lazy startup and task policy |
| BEH-005 | SCN-005 | Empty model is reported as selected model unavailable by member diagnostic producer (F-002) | Accurate neutral missing-selection hint; actual unavailable/invalid selections keep real errors | Run disabled until valid; no invented/default-selected model |

## Actors and scope guardrail
Actor: user inspecting a retained Org run and preparing its next message.
- UC-001 / in scope: stopped configured-member Settings, inspect/edit/save/reopen/continue; both direct and mounted placements.
- UC-002 / in scope: stopped-member + creates an adjustable configuration-only seed from its enclosing existing Org run, for both direct/mounted entry points.
- UC-003 / in scope: active, stale-target and failure protection for these actions.
- UC-004 / in scope: correct initial-empty and runtime-cleared model diagnostics, preserving shared Team/member consumers.
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
| REQ-005 | + opens a NEW editable Org draft seeded from the enclosing existing run’s configuration, not definition defaults alone or only the clicked Agent. Preserve root settings and direct/mounted member choices as adjustable starting values, including runtime/model/parameters, tool policy and workspace selections supported by the launch form. Do not overwrite those values on async definition load. No provider activation or source modification on +. Creation later allocates fresh runtime identities; do not copy history, tasks, attachments or provider bindings. | BEH-003 |
| REQ-006 | Preserve standalone Agent/Team controls and current task/active-run restrictions; no new delegated-task editing capability. | BEH-001,002,004 |
| REQ-007 | Fresh incomplete Org draft (including runtime change clearing model) shows an accurate neutral model-required hint, not selected-model-unavailable. Keep Run disabled. Nonempty genuinely unavailable model, catalog/runtime failure and invalid schema retain correct blocking diagnostics; shared Team consumers must not regress. | BEH-005 |

## Scenarios and acceptance criteria
SCN-001/003/004 retain approved SR-001/SR-002 scope. Revised SCN-002 and new SCN-005 are SR-004 approved consolidated clarification (SR-005), sourced to API-recorded user directions. Normal scenario basis is the user's screenshots/request and existing Team Settings/new-run flows. Alternate/failure basis is existing stopped-run validation and retained identity contract, not a new recovery product.
| Scenario | Validity, trigger and sequence | Expected outcome / alternate | AC / requirements |
|---|---|---|---|
| SCN-001 | Supported Normal Scenario: user opens stopped Org history, selects configured direct or mounted member, opens Settings, changes valid model/parameter, saves, returns/reopens and sends an ordinary message | Controls visible; exact canonical values; durable selected-member change; continuation uses new values and preserves conversation; no startup on inspection/save | AC-001: both placements show controls and gear opens exact member; AC-002: save/reopen/continue verifies values and unchanged peer; AC-003: zero startup on read/save and retained identity/history/Activity/draft/attachments. REQ-001,002,004 |
| SCN-002 | Supported Normal Scenario: select stopped direct or mounted member → + → inspect/adjust new draft → create when valid | Both entries seed the same enclosing Org root/default/member configuration; edits isolated; async loading must not reset seed; actual new creation has fresh root/member IDs and no cloned history/bindings; source remains stopped/unchanged. If source configuration cannot be resolved, show clear failure rather than silently substituting blank/default values | AC-004 (revised); REQ-005 |
| SCN-003 | Supported Normal Scenario alternates: active Org with offline leaf; invalid settings; ordinary service failure; user changes selection while Settings request pending; another connection activates root before Save | Active remains noneditable; validation is visible; no false success, cross-target write or implied saved state; user can retry/reload after uncertain persistence | AC-005; REQ-003 |
| SCN-004 | Supported Normal Scenario preservation: inspect standalone Agent/Team, active Org and historical task | No regression in existing controls or policy; task configuration is not made editable | AC-006; REQ-006 |
| SCN-005 | Supported Normal Scenario: fresh Org launch chooses runtime before model; or changes runtime so selection clears; then selects valid/unavailable model | Neutral missing-selection hint for empty value; valid choice clears hint once other requirements hold; unavailable selected model and real errors stay accurate; Run stays blocked as appropriate | AC-007 (new); REQ-007 |

Verification intent: durable rendered header/editor plus real owner/store/API tests; actual UI stopped direct and mounted Settings→Save→reopen→Send and + journeys. No manually calling an API substitutes for supported UI reachability. Live validation uses isolated data and owned services, not the user's running conversations.

## UI and quality
Use current gear/+ layout and forms, keyboard-operable labelled controls, explicit loading/error/Save feedback. Product prototype N/A: no redesign requested; screenshots are evidence, not new prototype authority. QR-001 (REQ-003/AC-005): no incorrect success or wrong-target persistence. QR-002 (REQ-004/AC-003): zero runtime/provider activation on inspect/save. QR-003 (REQ-005/AC-004): new draft is isolated from source and seeds are not lost during initialization. QR-004 (REQ-007/AC-007): incomplete draft is not misclassified as failed selected model; launch readiness is not weakened.

## Data continuity and dependencies
Persisted run configuration is affected. Preserve root/member IDs, routing addresses, runtime references, history, raw traces, Activity, attachments, drafts and all untouched configuration. No reset, conversion, deletion or repair authorized. Definition packages remain unchanged. Existing model compatibility/schema validation and retained-run continuation are dependencies; architecture must establish Org-owned canonical persistence rather than assume standalone mutation is suitable.

## Supplements, assumptions and open decisions
Evidence: investigation-notes.md and four evidence/*.png (read-only user observations; not behavior supplements). No Product-owned artifacts.
Assumption ASM-001 confirmed by approval: parity means model/model-specific settings for the selected configured Agent, not changing all Org defaults or task runs. This follows the focused member Settings request.
DEC-001 resolved: user approved original SR-001 on 2026-09-17. DEC-002 resolved: explicit user “confirm” approves consolidated SR-004 Plus inheritance and missing-selection feedback baseline. API artifacts record the initiating user instructions; they do not retroactively extend the prior approval. Backend persistence/lifecycle integration is an architecture investigation question, not a user question.

## Traceability / architecture input / readiness
UC-001 → BEH-001/002/004 → REQ-001/002/004 → AC-001/002/003 → SCN-001.
UC-002 → revised BEH-003 → revised REQ-005/AC-004 → SCN-002; F-001/B03.
UC-004 → BEH-005 → REQ-007/AC-007 → SCN-005; F-002/B05.
UC-003 → REQ-003/006 → AC-005/006 → SCN-003/004.
Architecture must verify canonical Org configuration ownership, restore readers, inactive save guards and model selection validation. A header-only patch is insufficient. Completed DS-REV-002 classifies the cumulative solution Medium/High; current revised architecture review applies. Screenshot count does not determine classification.
Readiness: evidence, scope, intended/preserved behavior, traceable ACs and data constraints complete. SR-004 Approved in SR-005. Revised design may proceed; original Settings design/evidence retained. Consolidated scope changes are confined to REQ-005/AC-004 and REQ-007/AC-007.

## Approval reference — SR-002
User reply to scope approval request on 2026-09-17: “Yeah, basically the behavior should be similar to agent teams.” User further specifies: “for the same runtime ... change the model” and “change some configuration setting for the same model.” This approves the preceding SR-001 scope, including direct/mounted member parity, preserved runtime/workspace and existing + action. User requests studying origin/personal nested-Team implementation as evidence, not copy/paste or expanded nesting support.

Compatibility clarification (existing Team policy, reaffirmed by user): REQ-002/AC-002 replacement model uses the same runtime and verified context capacity >= the current model. Same-model parameter edits retain existing schema validation and do not require a replacement-capacity comparison. This is reuse, not a new selection policy.

## SR-004 clarification authority and limits
CRR-003 and API-REV-001 record user directions: Plus takes existing configuration as the new adjustable starting point; empty model is incomplete, not unavailable. These are recorded paraphrases in validation/api-live/f001-plus-inheritance.md and f002-empty-model-diagnostic.md, not a fabricated verbatim user quote. Reviewer requests upstream requirement/design correction. Source-only Team/personal seed comparison confirms configuration projection rather than execution-context cloning. Updated requirements do not authorize migrations, source-run repair, changed existing-run model policy or arbitrary package/definition edits. Definition topology changes, unavailable models/workspaces remain subject to ordinary launch validation; do not silently misapply member configuration to a different definition/placement. No all-provider or current Team live parity claim.

## Approval reference — SR-005
User message “confirm” on 2026-09-17, immediately following the Designer’s revised-scope confirmation request. Exact approved basis: SR-004 REQ-005/AC-004/BEH-003/SCN-002 and new BEH-005/REQ-007/AC-007/SCN-005, with all unchanged requirements preserved. No unapproved behavior supplement.


## SR-007 preservation interpretation — no intended-behavior change
CRR-005 F-003 is the supported SCN-004 / REQ-006 / AC-006 standalone Team control: after a successful canonical Settings Save, Back→Plus must use those current saved root/member values in the new adjustable Team draft. The new run has fresh IDs; original history/Activity/draft/attachments and source remain unchanged. Unsaved editor values are not canonical input. Both existing source-copy entry points (monitor Plus and selected/most-recent Team group create) use one source authority; ordinary definition-only fresh creation remains unchanged. This makes the existing preservation acceptance explicit, not a new authoring policy or backend feature. Source read failure must be truthful, not silently use stale values. User approval remains SR-004/SR-005 plus unchanged SR-001/SR-002. API must execute Save→Back→Plus→ordinary Create, not infer preservation from isolated shared-field tests. Prior source/personal reference did not establish this boundary and is corrected in DS-REV-003.
