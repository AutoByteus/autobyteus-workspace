# Design Spec — Embedded browser history

## Solution And Approval Basis
- Package `embedded-browser-history`; Task `autobyteus-workspace-1`; current SR-002.
- Requirements **R1 / SR-001 Approved**, by Solution Designer within Task direction; user informed by conversation message beginning “I’ve confirmed this is a missing AutoByteus browser control”. No behavior-defining supplements. Requirements unchanged by this design.
- Design status **Ready** (architecture review not yet performed).
- Canonical evidence: `/Users/normy/autobyteus-org/autobyteus-task-worktrees/embedded-browser-history/tickets/in-progress/embedded-browser-history/investigation-notes.md`.
- Authorities read 2026-10-26: skill references architecture-design.md, design-principles.md and handoff.md; design-spec template; project `/Users/normy/autobyteus-org/autobyteus-task-worktrees/embedded-browser-history/DESIGN.md`, AGENTS.md, TESTING.md, GLOSSARY.md, web AGENTS.md, browser_sessions.md and localization.md. No closer DESIGN applies. No general/project design conflict. The broad web architecture overview has historical server terminology; specific current Browser source/docs govern this path, not that overview.

## Current-State Read / Architecture Investigation Evidence
Investigation E1–E10 carry exact file/line references. BrowserPanel→Pinia→preload/IPC→BrowserShellController→BrowserTabManager→BrowserTabNavigation→Electron WebContentsView is the existing navigation path. Chromium already owns per-view history. Missing toolbar commands and missing shell capability fields are the gap, not a missing history store. Shell leases and snapshots already provide the correct boundaries. Manager observer code is an appropriate extraction seam because the manager is already 570 lines (E6). Native probe proves document, hash, pushState, same-URL entries and replaceState behavior on pinned Electron (E5).

## Intended Change
Expose existing native history through two toolbar controls and one narrowly typed shell history command. Publish native capability flags in shell snapshots. Do not implement a parallel history stack, add agent tools, or recreate views.

## Change Scope
- Covers UC-001–003 and all approved BEH/REQ/AC IDs. Modify only Browser chrome, shell projection/command boundary, native navigation/observation, their tests/locales and Browser docs.
- Derived consumers: BrowserShellTabSummary gains required `canGoBack` / `canGoForward`; update snapshot producer, store equality and component consumers, typed bridge and all relevant mocks/fixtures. No change to agent-facing `BrowserTabSummary`, `list_tabs`, bridge server, server SDK or tools.
- Deliberately untouched: browser partitions/auth storage, popup policy, other shell command semantics, app startup/deploy, running app, Galavion, remote browser services. Existing controls retained.
- FU-001 manual redirect projection; FU-002 remaining oversized manager/popup ownership. New observer extraction is in scope, broader refactor is not.

## Task Size And Architectural Risk
- `task_size: Medium`: several existing Browser components and shell bridge files, plus bounded observer extraction; not a cross-product feature.
- `architectural_risk: High`: a new renderer→main native-navigation mutation command and required shell snapshot fields are a material shell IPC contract extension. Need independent review of sender/lease/active-tab gating, event freshness and native lifecycle. No persistence or external server contract risk.
- Payload volume (few localized labels/fixture/docs) is not the reason for classification. Structural surfaces are the typed shell IPC, projection and native command path.
- Escalation: any need to persist history, alter agent tool contracts, change shell leasing, inject page history interception, recreate native views, or introduce broad navigation concurrency machinery returns Design Impact / Requirement Gap, not silent expansion.

## Relevant Behavior And Production-Path Map
| Behavior | Approved intent / criteria | Trigger | Current evidence | Target / spine |
|---|---|---|---|---|
| BEH-001 | REQ-001,003 / AC-001,003 | Back/Forward toolbar after link/SPA navigation | E1, E5–E7 | DS-001: shell command reaches native history; DS-002 projects resulting state |
| BEH-002 | REQ-002,004 / AC-002,004 | New page/history update, switch/close tab, stale request | E2–E6 | DS-002/003: native capability queries and active-tab guard, no custom history |
| BEH-003 | REQ-004,005 / AC-005,006 | Address, refresh, tab controls, emulation/full-view | E1–E4, E8–E10 | Preserve existing paths; only watch URL/tab identity rather than capability-only changes for address sync |

## Relevant Supplemental Task Artifacts
Investigation inventory is canonical. Native probe source/result and initial race diagnosis guide event semantics and downstream tests. Screenshot supplies existing chrome context only; no external Product spec exists. `follow-ups.md` records out-of-scope concerns. No approval supplement.

## Task Design Health Assessment
- Posture: **Feature**. Root cause of user gap: absent controls/command/projection, not broken Chromium history.
- Existing design issue: **File Placement Or Responsibility Drift** risk from growing 570-line manager. `Refactor needed now: Yes`, narrowly extract native session observation into `browser-tab-observers.ts`; manager remains lifecycle owner and must shrink or at least not grow. No popup redesign.
- Triggers: capability-area reuse (existing native navigation and snapshot owners); derived data (capability projection and comparator); several forms (document and in-page, including same-URL); responsibility overload (manager line count). No new persistence model, generic service, cache or runtime owner needed.
- Observer extraction moves existing behavior wholesale then applies in-scope event synchronization. New native history logic belongs to existing BrowserTabNavigation, not manager or renderer.
- Residual oversized manager debt FU-002; this does not prevent coherent history feature. FU-001 is not fixed incidentally.

## Terminology
Existing Browser `tab_id` is a native Browser session handle; renderer request `tabId` is the same handle in existing shell naming. **Back/Forward** mean native history traversal, **canGoBack/canGoForward** mean native capability, not renderer-inferred URL count. No new domain vocabulary; project glossary unchanged.

## Legacy Removal Policy / Removal And Decommission Plan
| Remove or relocate | Reason | Replacement |
|---|---|---|
| Inline native title/navigation/destroy observers from manager | Clear observer boundary and prevent growth; remove old listeners after extraction, not duplicate registration | browser-tab-observers.ts |
| Broad `watch(activeSession)` address sync | New capability-only snapshots would overwrite an in-progress address edit (E1) | Watch active tab ID plus active URL; initial and explicit command sync retained as appropriate |
| URL/title-only session equality assumption | Drops same-URL history availability changes | Include both required history flags |
No alternate legacy history path exists. No new compatibility wrappers, version negotiation or fallback to URL-stack navigation. Implementation must check dead code in touched files and remove proven unreachability, not unrelated behavior. Current inspection found no other confirmed dead branch to mandate removing.

## Persisted Data / State Transition Decision
**Not Affected.** Live WebContents owns history; Browser persistent partition/auth storage unchanged. No saved-history schema, migration, clearing or rebuilding. No persistence migration plan needed. Session cookies, page data, profiles and user data must not be reset (REQ-004/005). Do not equate forward-branch truncation with a data migration.

## Data-Flow Spine Inventory
| Spine | Scope / behavior | Start → end | Governing owner | Purpose |
|---|---|---|---|---|
| DS-001 | Primary end-to-end; BEH-001 | Toolbar action → native traversal dispatch | BrowserShellController at shell boundary | Active-only, attached-tab command |
| DS-002 | Return/event; BEH-001/002 | Native navigation event → shell snapshot → buttons/address | BrowserTabManager for session truth, shell controller for its projection | Native history reflected even without URL change |
| DS-003 | Primary end-to-end; BEH-002/003 | Tab select/close → native view attachment → current snapshot → controls | BrowserShellController | Existing independent tab/view lifecycle |
| DS-004 | Bounded local; BEH-001 | Native capability check → goBack/goForward | BrowserTabNavigation | No-op unavailable direction without load wait |

## Primary Execution Spines And Narratives
**DS-001:** User clicks Back/Forward → BrowserPanel captures active tab ID → browserShellStore invokes typed preload → IPC uses `event.sender.id` → BrowserShellController validates request and attachment/lease/active selection → BrowserTabManager resolves session → BrowserTabNavigation queries native capability and dispatches native `navigationHistory.goBack()` / `goForward()` → Chromium navigates the same WebContents.

The action is **command acceptance**, not page-load completion: native methods return void. Controller returns a current snapshot without awaiting load and without assigning activeSessionId. Async native events provide final state. This avoids a new waiter hanging on same-document/no-op/unload cancellation/closed view and avoids late selection stealing. Do not pretend `getActiveIndex()` changing proves completion (probe evidence).

**DS-003:** Existing tab strip selection/close → store/preload/IPC → existing shell controller → manager/native view projection → shell snapshot → activeSession controls. Do not rebuild tab or history on switch/full-view.

## Return / Event Spine And Bounded Local Details
**DS-002:** Native page/title/navigation/stop/destroy event → `browser-tab-observers.ts` updates the existing record and notifies manager → manager emits existing session-upserted/session-closed → controller builds shell projection by querying native history for each retained session → shell `snapshot-updated` IPC → store applies snapshot including flag-only changes → activeSession-derived buttons and URL/tab watcher update UI.

The observer is an adapter for native events, not another tab registry. Preserve customTitle policy. Native main-frame URL must remain authoritative: never assign a subframe event URL as the tab URL. For in-page events affecting a child, either query the main WebContents URL and publish capability state, or preserve top URL while notifying; native joint-history availability can still change. Include a stop-loading refresh so failure/cancel paths reconcile availability without a stuck pending state. Destroy callback remains manager-owned cleanup. Popup creation continues to use the same observer attachment seam; window-open handler and popup authorization stay in manager.

**DS-004:** BrowserTabNavigation gets the record, reads `webContents.navigationHistory`; if requested native capability false, return without navigation; otherwise call native directional method. This is not `loadURL(previousUrl)` and must not append a new history entry. A thrown native call follows existing store lastError handling. Async failures are reflected by native page/events; no stronger load-success response is promised.

## Ownership Map / Thin Entry Facades / Boundaries
| Owner | Owns | Must not own |
|---|---|---|
| BrowserPanel | Accessible chrome, active-tab click intent, responsive layout | Native history or leases |
| browserShellStore | Snapshot projection, error presentation, command calls | URL stack or recomputed history capability |
| Preload + IPC registration | Typed transport; actual sender identity | Trusting renderer-supplied shell identity |
| BrowserShellController | Attachment/lease/active checks and shell snapshots | Direct native history calls through raw getSessionView bypass |
| BrowserTabManager | Session registry/lifecycle and public native-operation boundary | Growing new observer/history policy inline |
| BrowserTabNavigation | Native history query/dispatch and existing URL readiness owner | Persistent history or shell selection |
| browser-tab-observers.ts | Native events→record updates/notifications | Shell controller calls, popup policy, registry ownership |
| Chromium | Actual history entries and navigation semantics | N/A |

Thin preload/IPC wrappers are existing security/transport boundaries, not new empty services. Allowed dependencies follow DS-001; controller uses manager history APIs, manager uses navigation and observer mechanism. Forbidden: renderer executeJavaScript history commands, shell using native view directly for history, observer invoking shell policy, or server changes for a desktop-only feature.

## Interface Boundary Mapping And Check
All interfaces singular, explicit identity, low selector ambiguity; new command input validated at main boundary.
- `BrowserShellHistoryNavigationRequest { tabId: string; direction: 'back' | 'forward' }` in existing `types/browserShell.ts`.
- `BrowserShellTabSummary`: add **required** booleans `canGoBack`, `canGoForward`. Same-release snapshot producer and consumers updated together. Do not add to agent-facing summary/list_tabs to avoid changing unrelated API contract.
- Preload `navigateBrowserHistory(request): Promise<BrowserShellSnapshot>` on channel `browser-shell:navigate-history`; corresponding type in `types/electron.d.ts`.
- Controller `navigateHistory(shellId, request)` validates nonempty tab handle and direction; rejects unattached/foreign-lease tab. If request's tab is no longer active in this shell, return current snapshot **without navigating or reselecting it**. No await between active/lease check and dispatch; no post-navigation reassignment of active state. Invalid direction must not default to Forward.
- Manager public `getSessionHistoryState(tabId)` and `navigateHistory(tabId, direction)` resolve session with existing error semantics and delegate to navigation. Capability query is an ephemeral projection, not stored new state. Main query returns `{canGoBack,canGoForward}`; use a tight shared type where reused, no separate URL/index/entry arrays in shell contract.
- Controller snapshot assembly combines existing summary with manager history state. Existing session-upsert notifications remain unchanged. New command may publish current snapshot, then native observers publish settled snapshots; neither response claims completion. Product tests must await page/URL/event states.

## Off-Spine Concerns / Capability Reuse / Shared Structure Checks
| Concern | Owner served / decision | Rule |
|---|---|---|
| Localization | BrowserPanel; Extend manual locale catalogs | en Back/Forward, zh-CN 后退/前进; title + aria-label |
| Errors | Store; reuse lastError | No new global retry/error manager |
| View bounds/emulation | Existing controller/device owner; reuse unchanged | Toolbar geometry measurement continues |
| Event adapter | Manager; extract one concrete file | Notification callbacks only; one listener registration per view |
| Shared shell types | Existing types/browserShell.ts; extend | Required flags, no redundant indexes/entries and no history persistence |
New flags are computed only by native query owner; store and UI consume them, not rederive them. Existing snapshot equality must compare them. Avoid broad JSON stringify or full-history serialization.

## Subsystem / Draft And Final File Responsibility / Target Mapping
All source paths below under `autobyteus-web/`. Existing folder boundaries remain; no new module hierarchy needed for one observer concern. Draft→tightening decision: rejected extending agent summary and rejected a standalone generic history service; final map:
| Change | File | Responsibility / why here |
|---|---|---|
| Modify | `types/browserShell.ts`, `types/electron.d.ts` | Shell-only command/projection and typed preload |
| Modify | `electron/preload.ts`, `electron/browser/register-browser-shell-ipc-handlers.ts` | Transport new shell command with true sender identity |
| Modify | `electron/browser/browser-shell-controller.ts` | Active/attached/lease checks, command acceptance, snapshot capabilities |
| Modify | `electron/browser/browser-tab-manager.ts` | Small public history methods and observer delegation; net no growth from 570 lines |
| Modify | `electron/browser/browser-tab-navigation.ts` | Native history query/dispatch; URL/reload readiness behavior unchanged |
| Add | `electron/browser/browser-tab-observers.ts` | Existing title/navigation/destroy observation extracted, extended for capability refresh and safe top URL |
| Modify if needed | `electron/browser/browser-tab-types.ts` | Main-owned direction/state types only if not shared through existing shell types; do not modify public tab summary/tool outputs |
| Modify | `stores/browserShellStore.ts` | History action, compare native flags, preserve authoritative snapshots |
| Modify | `components/workspace/tools/BrowserPanel.vue` | Back/Forward beside address controls, disabled/accessible states, narrow address watcher |
| Modify | `localization/messages/{en,zh-CN}/workspace.ts` | New manual catalog labels |
| Add/Modify | Colocated `__tests__` for controller/manager/navigation/observer, IPC, store and BrowserPanel | Regression at owning boundaries; update existing snapshot fixtures atomically |
| Add | Ticket-owned or appropriate `tests/e2e/` fixture/probe | API/E2E engineer owns final executable coverage and native interaction proof |
| Modify | `docs/browser_sessions.md` | Document controls, native semantics, shell-only acceptance/event contract and limitations |

Folder boundary check: electron/browser owns native policy; electron preload/IPC is transport; types is existing shared shell boundary; stores/components are projection/UI; localization owns copy. No persistence folder, mixed server changes or empty services. All new/touched-growing source files should remain below 500 lines; already oversized manager must not grow. Keep observer extraction minimal and retain lease/popup regression tests.

## Applied Patterns / Concrete Shape Guidance
Event adapter is a bounded native observer, not another manager. Good: flags from native history on every snapshot, with store comparing both flags. Bad: two URL arrays in Pinia or using `history.back()` inside the loaded website from renderer.

Example same URL entries: `/spa(state1)`→`/spa(state2)`; after Back, URL/title unchanged but Forward becomes true. That flag-only snapshot must reach UI **without resetting a half-typed address**. Example tab switch: request for T1 received while T2 active is inert; an accepted T1 request never sets T1 active later.

## Backward-Compatibility Rejection Log
Old/new snapshot negotiation, optional history fields for old preload, deprecated webContents history fallback, JS history injection, URL-stack simulation: **Rejected**. Project ships coordinated same-version components; use pinned navigationHistory API confirmed by native probe. No prior history implementation to preserve.

## Change / Refactor Sequence
1. Add shell-only types and native query/dispatch in navigation owner; unit-test guards/no-op/native calls.
2. Extract session observers with behavior parity, then add native completion/failure capability refresh/top-frame safety. Wire manager boundary with no net growth; regression popup/leases/full-document and same-document existing navigation.
3. Add controller active-only command and shell capability projection, IPC/preload; test forged/stale/foreign requests and no late selection mutation.
4. Extend store equality/action and toolbar/localization; narrow address watcher. Update all relevant fixtures, no compatibility branches.
5. Run focused regressions, Electron typecheck, localization checks. API/E2E validates actual worktree desktop journey with fixtures and rendered normal/full-view evidence. Delivery refreshes base, impact-plans reruns, merges and verifies, archives and cleans up, no release.

## Key Tradeoffs / Risks
Command dispatch rather than awaiting page load deliberately matches browser controls and avoids duplicating readiness logic with no-op/cancel/close hang paths. UI state converges via native events; do not show a false completed-load assertion from IPC success. Users can issue further actions naturally; no speculative global queue or mutex. The native probe showed command index can advance before actual event, so E2E must observe committed content/event state. Any observed ordinary-action failure gets diagnosed and a proportionate correction, not papered over.

Native engine dictates history behavior (including user-gesture filtering, SPA state, unload policies); no promise to defeat it. Probe proves normal user-gesture SPA/hash paths only. Full Electron app interaction is still needed, especially bounds, emulation, and native overlay rendering. Probe is not app-level verification.

## Guidance For Implementation And Validation
- Start from approved R1 and E1 absence, then native probe; no failing product test authored by Solution Designer. Implementation owns production code and self-checks; API/E2E owns executable coverage.
- Tests: full-page and same-document navigation; flag-only snapshots; no-tab/unavailable no-op; malformed/foreign/inactive IDs; per-tab switch/close; history errors; half-typed address unaffected by flag-only changes. Preserve native emulation/full-view and existing browser navigation tests.
- Render real worktree-built isolated Electron Browser with local A/B/C links, hash, pushState, same-URL state, replaceState, two tabs, Back→new link/address truncation. Assert actual page/URL/native capability and toolbar disabled state; retain screenshots plus interaction assertions at panel and full-view dimensions. No live registration pages or provider calls required.
- Read TESTING.md and isolated-app instructions before setup. Native probe executable available under ticket probes; no installed app counts as changed-build proof. Fresh dependencies/build are downstream normal setup, not a blocker.
- Required checks include focused `test:electron --run`, `test:nuxt ... --run`, `transpile-electron`, localization boundary/literal guards and real isolated desktop. Plan reruns by impact and retain version/commit/evidence ledger.
