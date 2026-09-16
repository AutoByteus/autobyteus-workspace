Historical DS-001 / SR-003 sidebar-only design. Superseded by design-spec.md DS-REV-002. Not authority for expanded ticket.

> Current status: user expanded scope to Org avatar authoring and definition deletion. This DS-001 describes the already-approved sidebar work only; it is not authority to implement or finalize the new scope. Revised design/classification pending requirements approval.

# Design spec — Sidebar container avatars and Org run disclosure

## Solution And Approval Basis
Package **SIDEBAR-ORG-20260916-001**, **SR-003 / DS-001**, **Needs Revision for SR-004 extension; prior DS-001 sidebar basis preserved**. Approved REQ-001–003, AC-001–004, BEH/SCN-001–003 via USER-APPROVAL-20260916-001 in requirements-doc.md. User explicitly authorized design and Org avatar support if absent. E-005 confirms storage/API support already exists. Superseded always-icon SR-001 is NOT authority. Canonical evidence: investigation-notes.md and its three user screenshots. All relative paths below are under worktree recorded in requirements.

## Current-State Read
Avatar metadata and history are separate current owners: existing definition stores carry optional avatars; sidebar avatar composable looks up Team metadata, but Org catalog/bindings are not wired. Team fallback is initials; Org header always building icon. Org chevron lives inside open-run button and active+expanded skips toggle. Disclosure storage itself is already correctly independent. See E-001–006.

## Task Size And Architectural Risk (Mandatory)
**task_size: Medium; architectural_risk: Low.** Completed design changes several existing frontend files (avatar state and bindings, panel wiring, two renderers, localized labels and tests). No new runtime owner, public API, schema/migration, provider preparation, stream/selection concurrency, permissions or deployment behavior. Internal typed view-binding extension is additive and bounded; no external contract change. Content inventory is three screenshots/docs, not a complexity driver. Independent architecture review is not justified by this bounded Low-risk delta. Escalate via Design Impact if implementation requires backend/query contract, history persistence, new definition identity resolution, selection/lifecycle ownership or shared concurrency changes. Do not silently widen direct route.

## Architecture Investigation Evidence
E-001/E-004: artwork discrepancy. E-002/E-003: event conflation and current test gap. E-005: already available Org optional avatar end-to-end data field. E-006: frontend composition/binding seams and correct disclosure owner. Source inspection only; no runtime reproduction, tests or browser acceptance claimed.

## Intended Change
Avatar-first Team/Org group headers with respective generic glyph only when URL missing/blank or image failed. Wire existing Org definitions into sidebar without requiring catalog success for history. Separate Org root disclosure from open/select/inspect. Keep exact existing runtime behavior and Agent/mounted Team visuals outside scope.

## Relevant Behavior And Production-Path Map (Mandatory)
| Behavior / criteria | Approved trigger | Target production path | Lifecycle boundary / spine |
|---|---|---|---|
| BEH-001 / AC-001 | Browse Team/Org groups | Existing definition store → sidebar avatar state → typed bindings → corresponding group header | View metadata only / DS-001 |
| BEH-002 / AC-002–003 | Click/keyboard root chevron | Org collection disclosure → tree-state toggle(rootRunId) → descendants visibility | Mounted UI state only / DS-002 |
| BEH-003 / AC-004 | Click title / explicit navigation | Collection open → existing subject action → inspection/context/route → one-shot selected ancestry reveal | Existing read/navigation, not activation / DS-003 |

## Relevant Supplemental Task Artifacts
Three user screenshots in evidence/ (inventory in investigation). Current-state evidence only. No Product-owned prototype/spec, no additional behavior supplement. Prior tickets not reopened.

## Task Design Health Assessment (Mandatory)
Change posture bug fix + bounded presentation enhancement. Root cause **Local Implementation Defect / Missing Invariant**: open and disclosure were conflated in one DOM handler; Org presentation omitted already-supported metadata. **No subsystem refactor needed**: tree state, definition store, avatar state and action owners remain sound. Small local template event separation replaces faulty path, no new abstraction or generic container manager. Residual: avatars unavailable in missing/failed catalog fall back; this must not block history. No competing metadata authority or projection-copy introduced.

## Terminology
Definition header groups runs by definition. Org run row identifies an exact rootRunId; mounted Team row identifies a child address. Collapsing root is not stopping or selecting it. Avatar is optional existing definition metadata, not execution state.

## Design Reading Order
Approved behavior/evidence → spines/ownership → local bindings and files → tests. Detailed sections below deliberately reuse current structure rather than invent architecture.

## Legacy Removal Policy (Mandatory)
No backward compatibility; remove replaced behavior cleanly. Replace Team group initials fallback only. Replace unconditional Org group icon with avatar-aware fallback. Remove root chevron from open button and old `!run.isActive || !isRunExpanded(...)` toggle rule. Preserve existing Agent/member avatar helpers and shared uses; do not delete helpers still needed elsewhere.

## Persisted Data / State Transition Decision (Mandatory When Persisted Data May Be Affected)
**Not Affected.** No definitions/history/serialization writes or schema delta. Already optional org-config.json.avatarUrl flows through version-agnostic read and current GraphQL/store. This adds a consumer, not migration. No backup/reset/rewrite operation required. Existing in-memory root expansion and failure flags used; no persistence guarantee across app restart added. Migration plan N/A.

## Data-Flow Spine Inventory
| ID / scope | Start → end | Owner / why |
|---|---|---|
| DS-001 Primary | Sidebar mount → existing catalog query/store → avatar metadata lookup → group image/icon | Definition store owns metadata; avatar state owns view fallback |
| DS-002 Primary | Chevron click or native keyboard → exact-root toggle → visible descendants and aria-expanded | Existing tree state; pure disclosure avoids navigation |
| DS-003 Primary preserved | Title click → inspection action → context/route → selected ancestry reveal/content | Existing subject actions/selection; preserves normal opening |
| DS-004 Return-event/local | Image load error → definition+URL failure key → fallback; new URL/catalog render → new image | Avatar state; bounded image behavior only |

## Primary Execution Spine(s)
DS-001: Sidebar panel mount → AgentOrgDefinitionStore.fetchAll → existing GetAgentOrgDefinitions → reactive definitions → useRunHistoryAvatarState → view bindings → Org collection image/fallback. Team uses its existing equivalent.
DS-002: User root-chevron activation → Org collection disclosure handler → state.toggleAgentOrgRun(rootRunId) → composable expansion map → rerender child visibility/ARIA.
DS-003: User row-title activation → ensure collapsed root opens → actions.onOpenAgentOrgRun → useWorkspaceHistorySubjectActions.execute(open) → existing openForInspection/context/router → existing ancestry reveal and workspace content.

## Spine Narratives (Mandatory)
DS-001 consumes existing optional metadata through the same composition seam as Team avatars. Until catalog arrives or if definition no longer exists, Org group stays visible using building fallback; when metadata arrives it updates reactively. DS-002 changes only visibility; it does not invoke inspection, begin a selection intent or touch focus. DS-003 retains actual title navigation; opening an already-expanded run does not collapse it. DS-004 marks only the failed definition/URL pair, so a newly supplied URL can display without restarting the sidebar.

## Spine Actors / Main-Line Nodes
Panel composes stores/bindings; definition store owns lookup data/fetch; avatar state owns lookup and broken-image flags; components render and dispatch UI intent; tree state owns expansion; subject actions own inspection/navigation. No component accesses providers or persisted files.

## Ownership Map
Metadata: existing Agent/Team/Org definition stores. Artwork failure: useRunHistoryAvatarState. Root/team disclosure: useWorkspaceHistoryTreeState. Open/Stop: useWorkspaceHistorySubjectActions. Render/layout: existing workspace-history components. Selection/focus: existing context/selection owners, unchanged.

## Thin Entry Facades / Public Wrappers (If Applicable)
N/A — no new facade. Extend existing typed presentation bindings rather than adding a pass-through service.

## Removal / Decommission Plan (Mandatory)
Remove only obsolete initials fallback at Team definition header, unconditional-only Org icon branch, and root disclosure/open conflation. No compatibility mode or live/stopped branch retained for disclosure. Existing action/store files remain authoritative.

## Return Or Event Spine(s) (If Applicable)
DS-004 image error uses the URL actually rendered, with exact definition ID; a late failure for old URL must not blacklist replacement URL. Store reactive update causes image/fallback refresh, not history mutation.

## Bounded Local / Internal Spines (If Applicable)
Disclosure is boolean flip in existing map. No pending timer, network, selection intent, queue or new state machine. Existing selected-ancestry watcher remains unchanged: actual new selection can reveal; unrelated topology/status refresh after manual collapse cannot force reopen.

## Off-Spine Concerns Around The Spine
Native button handles Enter/Space; localized accessible expand/collapse labels use existing en/zh-CN workspace catalogs. Current status dots, timestamps, Stop pending/error and hierarchical branch rendering remain unchanged. Image sizing uses current small header footprint to avoid shifting labels/counts.

## Ownership Boundaries
Org history group carries definition identity, not duplicate avatar metadata. Org renderer does not import the store or fetch each row. Panel owns one catalog load alongside Agent/Team loads; errors are caught like those existing noncritical loads so available history remains usable. Metadata load is read-only, never provider preparation.

## Boundary Encapsulation Map
Component → presentation bindings → avatar-state owner → provided reactive definition collections. Component → expansion-state binding → tree owner. Title/Stop → action binding → subject owner. No bypass to backend/runtime internals.

## Dependency Rules
Reuse OrgDefinitionStore/GetAgentOrgDefinitions; do not query GraphQL directly from renderer. Do not add avatar to execution tree/history DTO or persist expansion. Do not call onOpenAgentOrgRun on disclosure. Do not add watcher that reopens a manually collapsed selected branch on every refresh. Do not change mounted Team click semantics or global Agent avatar fallback.

## Interface Boundary Mapping
Extend useRunHistoryAvatarState input with reactive `orgDefinitions` using tight ID + optional avatarUrl shape. Return `getOrgAvatarUrl(definitionId)`, `showOrgAvatar(definitionId)`, `onOrgAvatarError(definitionId, failedUrl)`; forward as explicit methods on WorkspaceHistoryAvatarBindings. Keep rootRunId exclusively for disclosure/actions. Pass avatar bindings from Section into Org collection. Update all typed callers/test fixtures; do not hide incomplete wiring with permanent optional no-op fallbacks.

## Interface Boundary Check
One meaning per identifier: Org metadata by definitionId; run disclosure by rootRunId. Internal view contract change only; no GraphQL or public API change. No new command combines open and toggle.

## Main Domain Subject Naming Check
Use existing AgentOrg/Team/history/avatar terminology. No generic SubjectManager, parallel history store or compatibility adapter.

## Existing Capability / Subsystem Reuse Check
Reuse existing avatar-state composable, Org catalog store, tree-state toggle, subject-action open and locale catalogs. No newly created production subsystem.

## Subsystem / Capability-Area Allocation
Extend workspace-history presentation only. Definition acquisition uses current store, unchanged API. Runtime, persistence, streaming and backend remain unchanged.

## Draft File Responsibility Mapping
Candidate files: panel for composition/catalog read; avatar state for lookup/error flags; contract for typed binding; Section for Team fallback and passing avatar binding; Org collection for avatar rendering and disclosure/title separation. Tests follow owners. No state duplicated inside renderers.

## Reusable Owned Structures Check
Within avatar-state composable reuse one minimal `DefinitionAvatarLike {id; avatarUrl?}` shape for Team/Org input instead of two identical interfaces. Agent specialized name field remains. A small private ID→URL projection helper can serve both maps; do not refactor unrelated Agent/member name matching. No standalone generic avatar framework needed.

## Shared Structure / Data Model Tightness Check
No history DTO change. Definition ID maps derive data instead of copying avatar into run projections. Failure keys are ID+URL under the Org-owned failure map, no ambiguous mixed Team/Org namespace. State clears on existing completed history loading lifecycle consistent with current owner; URL changes naturally yield new key. Avoid permanent failed-by-ID cache.

## Final File Responsibility Mapping
All paths below under autobyteus-web/:
- **Modify** `composables/useRunHistoryAvatarState.ts`: Org URL map/failure methods; minimal shared shape; preserve other avatar policies.
- **Modify** `components/workspace/history/WorkspaceAgentRunsTreePanel.vue`: instantiate Org definition store, fetchAll in existing mount flow with nonfatal failure handling, provide reactive definitions, forward Org avatar methods.
- **Modify** `components/workspace/history/workspaceHistorySectionContracts.ts`: explicit Org avatar bindings.
- **Modify** `components/workspace/history/WorkspaceHistoryWorkspaceSection.vue`: preserve supplied Team image/error path, replace only initials fallback with user-group glyph, pass bindings into Org collection.
- **Modify** `components/workspace/history/WorkspaceAgentOrgHistoryCollection.vue`: avatar-first Org header; independent root disclosure native button next to title button; truthful ARIA, stable control/tree selectors; title ensures expansion only if currently collapsed then invokes existing open.
- **Modify** `localization/messages/{en,zh-CN}/workspace.ts`: expand/collapse accessible text where not already reusable.
- **Add/extend** colocated avatar-state, Section/Org collection, tree-state and panel integration tests; update impacted stubs/fixtures in existing tests. No production backend changes or tree-state rewrite anticipated.

## Applied Patterns (If Any)
Existing composition/injected view bindings. Standard sibling native buttons distinguish disclosure from navigation. No new architectural pattern.

## Target Subsystem / Folder / File Mapping
Keep rendering in components/workspace/history, derived presentation state in composables, labels in localization/messages and tests in nearest __tests__. No move/new production folder. Concrete modify/add inventory above is authoritative; no mandatory new helper file.

## Folder Boundary Check
Existing view/composable/store separation is clear. Same-folder history components share one capability; flattening is not increased and new framework would over-split a bounded change.

## Concrete Examples / Shape Guidance (Mandatory When Needed)
Good: `[button: collapse] [button: run title] [button: Stop]` as siblings. Disclosure handler only `toggleAgentOrgRun(id)`; title `if (!isRunExpanded(id)) toggleAgentOrgRun(id); onOpenAgentOrgRun(run)`. Bad: clickable Icon nested inside title button that still bubbles open, or root collapse followed by route update that re-reveals it.
For artwork: URL A fails → fallback; definition changes to URL B → attempt B. Never mark B failed because A's late error fires. Missing catalog entry → icon, not missing history row.

## Backward-Compatibility Rejection Log (Mandatory)
Reject retaining old live/stopped disclosure logic behind a flag; clean replacement uses one local toggle. Reject new avatar schema/history-copy fallbacks; existing current definition query suffices. Ordinary missing/broken image icon is intended product fallback, not legacy compatibility.

## Derived Layering (If Useful)
N/A — current view/composable/store ownership already explains the change.

## Change / Refactor Sequence
1. Extend avatar input/bindings and wire existing Org store through panel/Section; update typed fixtures.
2. Avatar-first rendering: preserve Team image; replace initials only; add Org image with error fallback.
3. Split root disclosure/title controls, remove active-only toggle gate; keep subject action and selection watcher unchanged.
4. Add durable regressions and localization assertions; run appropriate colocated suites once with --run; inspect affected TS diagnostics honestly.
5. Hand off for actual supported browser validation; no provider startup to prove icon/collapse. Runtime-ful selected fixture may be used only in owned isolated API environment.

## Key Tradeoffs
One additional existing catalog read on sidebar mount vs inventing history-schema fields: use current store/cache and tolerate failure. Separate chevron/title adds a focusable control but preserves exact user intent and native keyboard behavior. No changes to definition editor/upload UI because avatars already supported as optional data and task is sidebar consumption.

## Risks
Tests with always-true expansion mocks can hide the bug. Need reactive owner/component coupling. Selection watcher can mask accidental open dispatch; assert no navigation/inspection. Missing catalog/stale image errors must not hide historical groups or poison new URL. Treat runtime/selection-owner change discovery as escalation, not speculative redesign now. Browser/Electron environment limitations must be reported, not converted to success claims.

## Guidance For Implementation
Durable acceptance mapping:
- AC-001: Team+Org supplied/missing/blank/broken image, catalog arrival/reactive URL replacement and exact ID isolation; icon attributes asserted, Agent artwork unchanged. Test nonfatal catalog failure keeps history.
- AC-002/003: real Org component plus reactive expansion owner (not constant mock): live/stopped × selected/unselected; collapse/re-expand including remembered expanded mounted Team and selected leaf; sibling root unchanged. Await ticks and topology refresh; no open/select/inspect/stop calls or route changes from disclosure. Keyboard/browser visibility and aria-expanded checks.
- AC-004: title opens exact run once and expands a collapsed run, does not close an expanded run; Stop remains separate; mounted Team toggle/navigation and genuine selection ancestry reveal unchanged. Preserve localization tests.
API/E2E should use actual sidebar: verify actual avatar load/fallback appearance for both groups, click Org root chevron while descendant selected, check content/draft unchanged through collapse+refresh+expand, keyboard disclosure, stopped/history case and title/Stop independence. Mocked renderer calls alone are not actual click acceptance. No broad all-provider/platform claim. Designer has run no tests or app sessions. No commit/push/merge/release authorization included. Follow current rule-selected direct route and escalate actual design impact rather than inventing new scope.
