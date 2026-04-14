# Design Spec

## Current-State Read

The current Browser execution path is:
`Renderer Browser UI / server browser bridge -> Browser shell IPC -> BrowserShellController -> BrowserTabManager -> BrowserViewFactory -> Electron WebContentsView / WebContents -> third-party site`.

Current ownership shape:
- `BrowserRuntime` composes the Browser subsystem and currently constructs `BrowserTabManager` with a plain `BrowserViewFactory`.
- `BrowserViewFactory` creates `WebContentsView` instances with secure web preferences (`nodeIntegration: false`, `contextIsolation: true`, `sandbox: true`) but does not specify `session` or `partition`, so Browser tabs fall back to Electron's default app session.
- `BrowserTabManager` owns Browser tab lifecycle, reuse, popup adoption, and shell lease state, but it does not own browser-profile/session policy.
- Popup-created tabs are adopted through Electron-provided `options.webContents`, and current code forwards those `webContents` into the view factory without validating `popupWebContents.session` against a Browser-owned session boundary.
- Repository docs/tests currently encode the assumption that Browser tabs share the default Electron session profile.

Current coupling / fragmentation problems:
- Browser-owned third-party browsing is mixed with the app's default Electron session/profile, so Browser-only network/session policy cannot be scoped cleanly.
- Popup adoption can bypass the intended new session boundary unless popup `webContents` ownership becomes an explicit Browser contract rather than an assumption about Electron inheritance.
- Any future Browser compatibility work (UA/header/client-hint shaping, cookie rules, permission shaping) would be tempted to mutate the default app session and risk side effects outside Browser.
- Tests and docs reinforce the wrong ownership boundary by asserting default-session behavior.

Constraints the target design must respect:
- Browser tabs must continue to be secure sandboxed `WebContentsView` surfaces with no preload bridge.
- Popup-created tabs must remain browser-like and share the Browser session with their opener in the normal/matching case.
- One-time re-login after rollout is acceptable, but repeated login prompts caused by non-persistent or split sessions are not.
- If Electron hands Browser a popup `webContents` from the wrong session, Browser must reject adoption explicitly rather than silently accepting boundary bypass.
- This change does not guarantee that Medium or every site will accept the embedded browser; it only fixes the Browser session boundary.

## Intended Change

Introduce one Browser-owned persistent Electron session boundary and route all Browser tab creation through it.

The Browser subsystem will gain a dedicated owner responsible for:
- defining the persistent Browser partition
- lazily resolving the Browser `Session`
- applying Browser-only session policy in one place
- validating whether an adopted popup `webContents` belongs to the Browser-owned session
- serving as the single source of truth for Browser session ownership

The Browser surface boundary will become explicit instead of overloaded:
- `BrowserViewFactory.createBrowserView()` creates a brand-new Browser `WebContentsView` on the dedicated Browser session.
- `BrowserViewFactory.adoptPopupWebContents(popupWebContents)` adopts an Electron-provided popup `webContents` only after the Browser session owner validates that `popupWebContents.session` matches the dedicated Browser session.

Popup mismatch behavior becomes explicit:
- matching-session popup `webContents` are adopted into Browser tabs normally
- mismatched-session popup `webContents` are rejected/aborted
- the foreign popup `webContents` is closed/destroyed as part of the abort path
- no child Browser session/tab record is created
- no `popup-opened` event is emitted
- the failure is surfaced as a dedicated popup-adoption error path, not silent fallback to default-session behavior

This design intentionally does **not** migrate old default-session cookies into the new Browser session. Users may need one-time re-login, but once they re-login, persistent auth behavior must remain browser-like across Browser tabs, popup flows, and app restarts.

## Terminology

- `Subsystem` / `capability area`: a larger functional area that owns a broader category of work and may contain multiple files plus optional module groupings.
- `Module`: an optional intermediate grouping inside a subsystem when the codebase benefits from it. Do not use `module` as a synonym for one file or as the default ownership term.
- `Folder` / `directory`: a physical grouping used to organize files and any optional module groupings.
- `File`: one concrete source file and the primary unit where one concrete concern should land.

## Design Reading Order

Read and write this design from abstract to concrete:

1. data-flow spine
2. subsystem / capability-area allocation
3. draft file responsibilities -> extract reusable owned structures -> finalize file responsibilities
4. folder/path mapping

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: identify obsolete legacy paths/files included in this scope.
- Treat removal as first-class design work: when clearer subsystem ownership, reusable owned structures, or tighter file responsibilities make fragmented or duplicated pieces unnecessary, name and remove/decommission them in scope.
- Decision rule: the design is invalid if it depends on compatibility wrappers, dual-path behavior, or legacy fallback branches kept only for old behavior.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | Browser UI / browser tool request | Third-party page loaded in Browser-owned session | `BrowserTabManager` + `BrowserSessionProfile` | Main Browser-tab creation path must stop using the default session |
| DS-002 | Return-Event | Popup/new-window request from Browser page | Popup tab projected back into the Browser shell | `BrowserTabManager` | Preserves login/OAuth and browser-like popup behavior in the matching-session case |
| DS-003 | Bounded Local | Browser runtime startup | Dedicated Browser session resolved and policy-applied once | `BrowserSessionProfile` | Defines the one-time session ownership and future compatibility-policy attachment point |
| DS-004 | Return-Event | Popup adoption attempt with foreign-session `webContents` | Popup adoption aborted with no Browser child session | `BrowserSessionProfile` + `BrowserTabManager` | Protects the Browser session boundary from popup bypass |

## Primary Execution Spine(s)

- `Renderer / BrowserTool -> BrowserShellController -> BrowserTabManager -> BrowserViewFactory.createBrowserView() -> BrowserSessionProfile.getSession() -> Electron Session/WebContents -> Third-Party Site`
- `Browser Page popup -> BrowserTabManager window-open handler -> BrowserViewFactory.adoptPopupWebContents() -> BrowserSessionProfile.assertOwnedPopupWebContents() -> BrowserShellController -> Browser shell`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | A Browser tab open/navigate request reaches Electron main, where `BrowserTabManager` asks `BrowserViewFactory` for a brand-new Browser surface. The factory obtains the Browser-owned persistent session from `BrowserSessionProfile` before creating the `WebContentsView`, so the loaded site uses Browser-owned cookies/storage rather than the default app session. | BrowserShellController, BrowserTabManager, BrowserViewFactory, BrowserSessionProfile, Electron Session | `BrowserTabManager` for tab lifecycle; `BrowserSessionProfile` for session ownership | tests/docs updates; future compatibility policy hook |
| DS-002 | When a Browser page triggers `window.open`, Electron delivers popup `webContents` to the Browser popup handler. Browser adopts the popup only through the explicit popup-adoption boundary, keeping popup auth/login flows inside the same Browser-owned browsing profile when the popup session matches the Browser session. | BrowserTabManager, BrowserViewFactory, BrowserSessionProfile, popup webContents, BrowserShellController | `BrowserTabManager` with `BrowserSessionProfile` enforcement | popup regression tests; Browser shell snapshot publishing |
| DS-003 | Browser runtime startup constructs the Browser session owner once. That owner lazily resolves the persistent partition-backed Electron session and applies Browser-only session policy there, creating one clear boundary for future UA/header shaping without touching the main app session. | BrowserRuntime, BrowserSessionProfile, Electron Session | `BrowserSessionProfile` | compatibility policy seam; persistent partition constant |
| DS-004 | If Electron hands Browser a popup `webContents` whose `session` is not the Browser-owned session, the Browser session owner rejects it. `BrowserTabManager` aborts adoption, closes the foreign popup `webContents`, emits no popup-opened event, and creates no child Browser session record. | BrowserSessionProfile, BrowserViewFactory, BrowserTabManager | `BrowserSessionProfile` for validation; `BrowserTabManager` for abort sequencing | dedicated error code; mismatch regression test |

## Spine Actors / Main-Line Nodes

- Renderer Browser shell UI / server browser bridge
- `BrowserShellController`
- `BrowserTabManager`
- `BrowserViewFactory`
- `BrowserSessionProfile`
- Electron `Session` / `WebContents`
- third-party site

## Ownership Map

- Renderer Browser shell UI: thin user-facing surface; owns display state only, not session policy.
- `BrowserShellController`: owns shell-scoped tab attachment, focus, and projection; not the browser profile.
- `BrowserTabManager`: owns Browser tab lifecycle, reuse, popup routing, popup adoption sequencing, and lease invariants.
- `BrowserViewFactory`: owns Browser surface creation and the explicit create-vs-adopt surface boundary.
- `BrowserSessionProfile`: governing owner for Browser session identity, persistent partition choice, one-time session policy application, popup `webContents` ownership validation, and future Browser-only compatibility settings.
- Electron `Session` / `WebContents`: platform mechanisms used by Browser-owned boundaries; must stay behind Browser subsystem ownership.

If a public facade exists, it is thin:
- `BrowserRuntime` is a composition/startup boundary. It wires owners together but does not become the Browser session-policy owner.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `BrowserRuntime` | `BrowserTabManager`, `BrowserShellController`, `BrowserViewFactory`, `BrowserSessionProfile` | Startup composition of Browser subsystem | session policy decisions, popup lifecycle, shell lease rules |
| Renderer Browser shell store / IPC handlers | `BrowserShellController` and Browser Electron owners | UI transport into Electron main | Browser session ownership or compatibility policy |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| Default-session assumption in `browser-view-factory.spec.ts` | Browser tabs will no longer intentionally use Electron's default session | Dedicated-session assertions driven by `BrowserSessionProfile` | In This Change | Replace expectation, do not keep dual assertions |
| Default-session language in `docs/browser_sessions.md` | Documentation would describe the wrong ownership boundary after refactor | Browser-owned persistent session narrative | In This Change | Update popup/login guidance accordingly |
| Ambiguous `createBrowserView({ webContents? })` ownership model | Optional `webContents` makes popup adoption look like an unvalidated special case instead of an explicit boundary | Separate create-vs-adopt BrowserViewFactory methods | In This Change | Remove the generic optional-adopt contract |
| Informal reliance on default session as Browser profile | Browser-specific compatibility work needs its own boundary | `BrowserSessionProfile` | In This Change | No fallback branch that sometimes uses default session |

## Return Or Event Spine(s) (If Applicable)

- Matching popup path: `Popup request -> BrowserTabManager -> BrowserViewFactory.adoptPopupWebContents() -> BrowserShellController snapshot publish -> renderer Browser UI`
- Mismatch popup path: `Popup request -> BrowserSessionProfile validation failure -> BrowserTabManager abort -> no popup-opened event / no child session`

## Bounded Local / Internal Spines (If Applicable)

- Parent owner: `BrowserSessionProfile`
- Arrow chain: `BrowserRuntime startup -> BrowserSessionProfile.getSession() -> session.fromPartition(persist:...) -> apply policy once -> share same Session for Browser views -> validate popup webContents.session on adopt`
- Why this bounded local spine matters: it is the exact point where persistence, compatibility scope, popup ownership enforcement, and session ownership become durable. If this owner is misplaced, Browser auth persistence and popup boundary protection fragment immediately.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Browser session policy application | DS-001, DS-003 | `BrowserSessionProfile` | Apply Browser-only session configuration once | Gives future compatibility work one safe hook | If scattered across callers, Browser identity changes become inconsistent and leak into app session |
| Popup ownership validation | DS-002, DS-004 | `BrowserSessionProfile` | Check whether adopted popup `webContents` belongs to Browser session | Prevents popup bypass of the Browser session boundary | If moved to callers ad hoc, mismatch handling becomes inconsistent |
| Popup abort cleanup | DS-004 | `BrowserTabManager` | Close/destroy foreign popup `webContents`, suppress Browser child-session creation/events | Keeps the failure path explicit and lifecycle-owned | If misplaced in session owner, lifecycle cleanup becomes fragmented |
| Browser shell snapshot publishing | DS-002 | `BrowserShellController` | Keep renderer Browser UI synced with tab/popup state | UI projection concern, not profile ownership | Would clutter main Browser tab lifecycle if mixed in |
| Regression tests | DS-001, DS-002, DS-003, DS-004 | Browser subsystem | Protect session ownership, popup match allow, popup mismatch abort, and persistent-profile assumptions | Prevents regression back to default-session or blind popup adoption behavior | If omitted, ownership drift can return silently |
| Documentation update | DS-001, DS-002, DS-004 | Browser subsystem readers | Remove stale default-session guidance and encode new Browser boundary | Keeps implementation/review understanding aligned | Stale docs would preserve wrong mental model |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Browser tab lifecycle | `electron/browser/browser-tab-manager.ts` | Reuse | Already owns session/tab records, popup routing, and lease state | N/A |
| Browser surface creation | `electron/browser/browser-view-factory.ts` | Extend | Already owns `WebContentsView` creation point where create-vs-adopt semantics belong | N/A |
| Browser session ownership | Browser subsystem, but no current owner | Create New | Session ownership needs a governing owner separate from tab lifecycle and shell projection | Existing files do not currently own persistent partition/policy concerns |
| Browser runtime composition | `electron/browser/browser-runtime.ts` | Extend | Correct composition boundary for wiring the new owner | N/A |
| Browser popup mismatch error code | `electron/browser/browser-tab-types.ts` | Extend | Existing Browser error boundary should own the explicit popup-adoption mismatch error shape | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Electron Browser runtime | Browser startup composition, owner wiring | DS-001, DS-003 | `BrowserRuntime` | Extend | Inject Browser session owner into factory/runtime path |
| Electron Browser session profile | Persistent partition, Browser session resolution, Browser-only session policy, popup session validation | DS-001, DS-003, DS-004 | `BrowserSessionProfile` | Create New | New explicit boundary for Browser profile ownership |
| Electron Browser surface factory | Brand-new view creation plus popup adoption boundary | DS-001, DS-002, DS-004 | `BrowserViewFactory` | Extend | Split create-vs-adopt semantics explicitly |
| Electron Browser tab lifecycle | Tab open/reuse/close, popup routing, popup abort sequencing, lease rules | DS-001, DS-002, DS-004 | `BrowserTabManager` | Reuse | No change in governing owner |
| Electron Browser shell projection | Shell attachment and snapshot publishing | DS-002 | `BrowserShellController` | Reuse | Session ownership stays outside this owner |
| Browser docs/tests | Documentation and regression coverage | DS-001, DS-002, DS-003, DS-004 | Browser subsystem | Extend | Remove default-session assumptions and add popup mismatch coverage |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/electron/browser/browser-session-profile.ts` | Electron Browser session profile | `BrowserSessionProfile` | Own persistent Browser partition + session + one-time policy application + popup session validation | Session ownership is one coherent concern | N/A |
| `autobyteus-web/electron/browser/browser-view-factory.ts` | Electron Browser surface factory | `BrowserViewFactory` | Separate create-new Browser surface path from adopt-popup path | Explicit create-vs-adopt contract belongs in one surface boundary | Consumes `BrowserSessionProfile` |
| `autobyteus-web/electron/browser/browser-tab-manager.ts` | Electron Browser tab lifecycle | `BrowserTabManager` | Route popup adoption through explicit factory contract and own mismatch abort sequencing | Popup lifecycle remains with lifecycle owner | Reuses `BrowserViewFactory` + Browser errors |
| `autobyteus-web/electron/browser/browser-tab-types.ts` | Browser error boundary | Browser tab error types | Add explicit popup-adoption mismatch error code/shape | Browser lifecycle errors already live here | Reuses Browser error model |
| `autobyteus-web/electron/browser/browser-runtime.ts` | Electron Browser runtime | `BrowserRuntime` | Compose Browser session owner with tab/shell/factory owners | Startup composition is already centralized here | Reuses `BrowserSessionProfile` |
| `autobyteus-web/electron/browser/__tests__/browser-view-factory.spec.ts` | Browser tests | test boundary | Verify create-new Browser view uses Browser session and adopt-popup path accepts/rejects correctly | Direct regression coverage for surface boundary | Reuses session-match contract |
| `autobyteus-web/electron/browser/__tests__/browser-tab-manager.spec.ts` | Browser tests | test boundary | Verify matching popup allow and mismatched popup abort/no-child-session behavior | Protects popup lifecycle invariants | Reuses popup mismatch error contract |
| `autobyteus-web/docs/browser_sessions.md` | Browser docs | docs boundary | Explain dedicated Browser session behavior and popup match/mismatch rules | Canonical Browser subsystem doc already exists | Reuses Browser ownership language |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Browser persistent-partition selection + one-time session configuration + popup session validation | `browser-session-profile.ts` | Electron Browser session profile | Centralizes Browser session identity once instead of repeating partition/session logic in runtime/factory/tests | Yes | Yes | a generic app-wide session helper |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `BrowserSessionProfile` partition + resolved session state + popup ownership validation | Yes | Yes | Low | Keep it Browser-only; do not add unrelated app-session concerns |
| `BrowserTabError` popup mismatch variant | Yes | Yes | Low | Add one explicit popup mismatch code instead of generic ad hoc error strings |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/electron/browser/browser-session-profile.ts` | Electron Browser session profile | `BrowserSessionProfile` | Own Browser partition constant, resolve persistent Electron session, apply Browser-only session policy once, expose Browser session, and validate popup `webContents` ownership | Single authoritative Browser-profile boundary | N/A |
| `autobyteus-web/electron/browser/browser-view-factory.ts` | Electron Browser surface factory | `BrowserViewFactory` | `createBrowserView()` for new Browser surfaces and `adoptPopupWebContents(...)` for validated popup adoption | Surface creation boundary should explicitly separate create vs adopt semantics | Uses `BrowserSessionProfile` |
| `autobyteus-web/electron/browser/browser-tab-manager.ts` | Electron Browser tab lifecycle | `BrowserTabManager` | Route popup createWindow callbacks through explicit popup adoption, own mismatch abort cleanup, and suppress child-session/event creation on rejection | Popup sequencing is lifecycle work, not session-policy work | Uses `BrowserViewFactory` + Browser errors |
| `autobyteus-web/electron/browser/browser-tab-types.ts` | Browser error boundary | Browser error types | Add `browser_popup_session_mismatch` (name illustrative) or equivalent explicit popup mismatch error | Keeps Browser error contract explicit and reusable in tests/logs | Reuses Browser error model |
| `autobyteus-web/electron/browser/browser-runtime.ts` | Electron Browser runtime | `BrowserRuntime` | Construct `BrowserSessionProfile`, inject it into `BrowserViewFactory`, and keep startup ownership explicit | Correct composition owner, no session logic leakage elsewhere | Uses `BrowserSessionProfile` |
| `autobyteus-web/electron/browser/__tests__/browser-view-factory.spec.ts` | Browser tests | Test boundary | Assert new Browser views use dedicated session and popup adoption succeeds/fails based on session match | Direct regression coverage on changed surface owner | Uses Browser session contract |
| `autobyteus-web/electron/browser/__tests__/browser-tab-manager.spec.ts` | Browser tests | Test boundary | Assert matching popup allow path and mismatched popup abort path (`no child session`, `no popup-opened`) | Protects the user-visible popup boundary | Uses popup mismatch contract |
| `autobyteus-web/docs/browser_sessions.md` | Browser docs | Docs boundary | Document dedicated persistent Browser session ownership, one-time re-login expectations, and popup match/mismatch behavior | Existing canonical doc should reflect target ownership | Uses Browser ownership terminology |

## Ownership Boundaries

Authority changes hands at these points:
- `BrowserRuntime` composes but does not own Browser profile policy.
- `BrowserSessionProfile` is the authoritative boundary for Browser session identity, configuration, and popup ownership validation.
- `BrowserViewFactory` owns turning that session boundary into actual Browser surfaces through explicit create-vs-adopt methods.
- `BrowserTabManager` owns lifecycle sequencing and abort cleanup for popup adoption outcomes, but it must not choose or mutate Browser profile policy directly.
- `BrowserShellController` owns shell projection only.

The main encapsulation rule is:
- callers above `BrowserSessionProfile` may ask for Browser session-backed surfaces, but they must not configure Electron's default session directly, add Browser policy ad hoc elsewhere, or adopt popup `webContents` without going through the explicit validation boundary.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `BrowserSessionProfile` | persistent partition constant, resolved Electron `Session`, one-time policy application, popup `webContents.session` validation | `BrowserViewFactory`, `BrowserRuntime` | `BrowserRuntime` or `BrowserTabManager` mutating `session.defaultSession`, calling `session.fromPartition(...)` ad hoc, or comparing popup session identity themselves | Expand `BrowserSessionProfile` API, not the callers |
| `BrowserViewFactory` | non-popup Browser surface creation and explicit popup adoption contract | `BrowserTabManager` | `BrowserTabManager` constructing `WebContentsView` directly or passing arbitrary `webContents` into a generic create method | Add explicit `create...` / `adopt...` methods rather than bypassing |
| `BrowserTabManager` | Browser session/tab record lifecycle, popup routing, popup abort sequencing | `BrowserShellController`, Browser tool paths | UI/store code reaching into popup adoption or `WebContents` lifecycle directly | Strengthen manager API if more lifecycle actions are needed |

## Dependency Rules

- `BrowserRuntime` may depend on `BrowserSessionProfile`, `BrowserViewFactory`, `BrowserTabManager`, and `BrowserShellController` for composition.
- `BrowserViewFactory` may depend on `BrowserSessionProfile` but must not reach upward into shell/store concerns.
- `BrowserTabManager` may depend on `BrowserViewFactory` for Browser surface creation/adoption but must not directly create or configure Electron sessions outside the Browser session owner.
- `BrowserTabManager` may own popup-abort cleanup but must not decide popup session ownership itself.
- Tests may inspect the session contract but must not preserve assertions that Browser uses the default session or accepts any popup `webContents` blindly.
- Docs must describe the Browser-owned session boundary, not a mixed Browser/default-session model.

Forbidden shortcuts:
- no direct mutation of `session.defaultSession` for Browser-only behavior
- no per-call/per-tab ad hoc partition selection outside `BrowserSessionProfile`
- no generic `createBrowserView({ webContents? })` boundary that hides popup adoption semantics
- no popup path that accepts foreign-session `webContents`, falls back to isolated in-memory sessions, or silently reverts to the default app session

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `BrowserSessionProfile.getSession()` (name illustrative) | Browser session profile | Return the Browser-owned persistent Electron session, applying policy once if needed | none / Browser-owned implicit singleton | Should stay Browser-only, not generic app session lookup |
| `BrowserSessionProfile.assertOwnedPopupWebContents(popupWebContents)` (name illustrative) | Browser session profile | Validate that popup `webContents` belongs to Browser session and throw explicit mismatch error otherwise | `WebContents` | Prevents popup boundary bypass |
| `BrowserViewFactory.createBrowserView()` | Browser surface creation | Create a new Browser `WebContentsView` using the Browser-owned session | none | Non-popup path only |
| `BrowserViewFactory.adoptPopupWebContents(popupWebContents)` | Browser surface creation | Adopt Electron-provided popup `webContents` only after Browser-session validation | `WebContents` | Must not accept foreign-session popup content |
| `BrowserTabManager.openSession(...)` | Browser tab lifecycle | Open/reuse Browser tab records and new Browser views | Browser tab request | Continues to own tab lifecycle, not session policy |
| `BrowserTabManager` popup createWindow path | Browser tab lifecycle | Sequence popup adoption and abort cleanup based on factory/session validation result | opener session + popup `webContents` | Must suppress child-session creation on mismatch |

Rule:
- Do not use one generic boundary when the subject or identity meaning differs.
- Split boundaries by subject or require an explicit compound identity shape.

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `BrowserSessionProfile.getSession()` | Yes | Yes | Low | Keep it Browser-specific and singleton-like |
| `BrowserSessionProfile.assertOwnedPopupWebContents(...)` | Yes | Yes | Low | Keep ownership validation centralized here |
| `BrowserViewFactory.createBrowserView()` | Yes | Yes | Low | Keep create-new path separate from adopt path |
| `BrowserViewFactory.adoptPopupWebContents(...)` | Yes | Yes | Low | Reject foreign-session popup `webContents` explicitly |
| `BrowserTabManager.openSession(...)` | Yes | Yes | Low | Do not let it absorb session-policy logic |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| New Browser session owner | `BrowserSessionProfile` | Yes | Low | Keep Browser-specific; avoid generic `SessionManager` |
| Browser surface factory | `BrowserViewFactory` | Yes | Low | Keep it as physical surface owner with explicit create/adopt methods |
| Popup ownership validation API | `assertOwnedPopupWebContents` (illustrative) | Yes | Low | Prefer explicit ownership wording over generic `validatePopup` |
| Browser runtime composition | `BrowserRuntime` | Yes | Low | Keep composition-only role explicit |

## Applied Patterns (If Any)

- Factory: `BrowserViewFactory` remains the construction boundary for Browser surfaces, but now with explicit create-vs-adopt methods.
- Boundary validator: `BrowserSessionProfile` owns the Browser-session validation rule for popup `webContents`.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/electron/browser/` | Folder | Electron Browser subsystem | Browser lifecycle, shell projection, and Browser session ownership | Existing Browser owners already live here | renderer UI or generic app-session helpers |
| `autobyteus-web/electron/browser/browser-session-profile.ts` | File | `BrowserSessionProfile` | Dedicated persistent Browser session ownership, one-time policy application, and popup `webContents` session validation | New Browser-owned boundary belongs next to Browser runtime/factory owners | tab lifecycle, shell projection, UI state |
| `autobyteus-web/electron/browser/browser-view-factory.ts` | File | `BrowserViewFactory` | Explicit `createBrowserView()` and `adoptPopupWebContents(...)` boundaries | Existing surface-creation boundary is the right place for create-vs-adopt semantics | default-session assumptions or generic optional-adopt API |
| `autobyteus-web/electron/browser/browser-tab-manager.ts` | File | `BrowserTabManager` | Popup routing, popup adoption sequencing, mismatch abort cleanup, Browser session/tab lifecycle | Existing lifecycle owner should keep popup sequencing | Browser session policy or partition selection |
| `autobyteus-web/electron/browser/browser-tab-types.ts` | File | Browser error boundary | Browser lifecycle error codes including popup mismatch | Existing Browser error contract lives here | unrelated UI or session policy logic |
| `autobyteus-web/electron/browser/browser-runtime.ts` | File | `BrowserRuntime` | Compose Browser session owner with other Browser owners | Existing startup boundary | direct default-session mutation or duplicated partition logic |
| `autobyteus-web/electron/browser/__tests__/browser-view-factory.spec.ts` | File | Browser test boundary | Verify dedicated-session create/adopt behavior | Closest test to changed surface boundary | stale default-session assertions |
| `autobyteus-web/electron/browser/__tests__/browser-tab-manager.spec.ts` | File | Browser test boundary | Verify popup allow path and popup mismatch abort path | Popup/OAuth behavior is a critical user-facing invariant | unrelated shell projection assertions |
| `autobyteus-web/docs/browser_sessions.md` | File | Browser docs boundary | Canonical Browser subsystem docs including popup match/mismatch behavior | Existing Browser behavior document | stale default-session language |

Rules:
- If the design has meaningful structural depth, usually reflect it in folders rather than flattening everything into one mixed directory.
- Do not place transport entrypoints, main-line domain/control nodes, persistence, adapters, and unrelated off-spine concerns in one flat folder when that hides ownership or structural depth.
- A compact layout is acceptable when it remains easy to read for the scope. If you keep it flatter, state why that is the clearer tradeoff.
- Folder boundaries should make ownership and structural depth easier to read, not hide them.
- Shared-layer, feature-oriented, runtime-oriented, and hybrid projections can all be valid when they make the intended ownership and flow easier to understand.

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `autobyteus-web/electron/browser/` | Mixed Justified | Yes | Low | Existing Browser subsystem is already a compact Electron-only boundary; adding one Browser-session owner and explicit popup-adopt contract here is clearer than creating a new top-level folder |
| `autobyteus-web/electron/browser/__tests__/` | Off-Spine Concern | Yes | Low | Test coverage stays co-located with Browser owners |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Browser session ownership | `BrowserRuntime -> BrowserSessionProfile -> BrowserViewFactory.createBrowserView() -> BrowserTabManager uses created view` | `BrowserRuntime`, `BrowserTabManager`, and ad hoc helpers all call `session.fromPartition(...)` or mutate `defaultSession` independently | Shows why one Browser-owned session boundary is the correct shape |
| Persistent auth behavior | `log in once after refactor -> cookies persist in persist partition -> later Browser tabs/popups reuse same auth` | `new in-memory session per tab` or `popup on different session` causing repeated login prompts | Connects the design directly to the required usable user experience |
| Popup adoption allow path | `window.open -> createWindow callback -> BrowserViewFactory.adoptPopupWebContents(popup) -> BrowserSessionProfile.assertOwnedPopupWebContents(popup) passes -> child Browser tab created` | `BrowserTabManager passes any popup webContents into a generic create method` | Makes the normal popup contract explicit |
| Popup adoption mismatch path | `window.open -> createWindow callback -> assertOwnedPopupWebContents fails -> BrowserTabManager closes popup webContents -> no child tab / no popup-opened event` | `foreign popup webContents silently adopted` or `fallback to default session` | Protects the Browser boundary from bypass and satisfies AR-BROWSER-001 |

Use this section when the design would otherwise remain too abstract.

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep Browser tabs on default session and add Browser-specific default-session tweaks | Lowest code churn | Rejected | Move Browser to dedicated session owner and remove default-session assumptions |
| Dual-path support for both default-session Browser tabs and dedicated-session Browser tabs | Would soften rollout | Rejected | Clean-cut switch to dedicated Browser session; accept one-time re-login instead of long-lived dual behavior |
| Cookie migration from old default session | Would preserve current auth state | Rejected for this scope | One-time re-login accepted; no migration path added |
| Keep generic `createBrowserView({ webContents? })` API | Looks convenient for popup adoption | Rejected | Replace with explicit create-vs-adopt factory methods and popup session validation |

Hard block:
- Any design that depends on backward-compatibility wrappers, dual-path behavior, or retained legacy flow for in-scope replaced behavior fails review.

## Derived Layering (If Useful)

- Composition layer: `BrowserRuntime`
- Main-line Browser control layer: `BrowserTabManager`, `BrowserShellController`
- Browser session boundary: `BrowserSessionProfile`
- Browser surface creation boundary: `BrowserViewFactory`
- Platform mechanism layer: Electron `Session` / `WebContents`

## Migration / Refactor Sequence

1. Add `BrowserSessionProfile` in `autobyteus-web/electron/browser/` with the persistent Browser partition constant, one-time session resolution/policy application, and popup session-validation API.
2. Refactor `BrowserViewFactory` so the public boundary becomes explicit: `createBrowserView()` for new Browser surfaces and `adoptPopupWebContents(...)` for popup adoption after Browser-session validation.
3. Extend `browser-tab-types.ts` with an explicit popup-adoption mismatch error code/type so the mismatch path is durable and testable.
4. Update `BrowserTabManager` popup sequencing so `createWindow` callbacks route through the explicit adopt method, and mismatch failures close the foreign popup `webContents`, emit no popup-opened event, and create no child Browser session/tab record.
5. Update `BrowserRuntime` composition so the Browser session owner is created once and injected into the view factory before `BrowserTabManager` is constructed.
6. Update Browser tests to assert: (a) new Browser views use the dedicated session, (b) matching-session popup adoption succeeds, and (c) mismatched-session popup adoption aborts with no child session/event.
7. Update `docs/browser_sessions.md` to replace default-session language with dedicated persistent Browser-session ownership, one-time re-login expectations, and popup match/mismatch behavior.
8. Remove stale default-session assumptions completely; do not retain a compatibility path that still opens Browser tabs on the default session or accepts foreign popup `webContents`.

## Key Tradeoffs

- Benefit: Browser-only compatibility work gains one safe ownership boundary.
- Benefit: auth persistence becomes an explicit Browser-session responsibility instead of an accidental side effect of the default session.
- Benefit: popup adoption becomes explicit and reviewable rather than a hidden assumption about Electron inheritance.
- Cost: current Browser auth stored in the default session is not migrated; users may need one-time re-login.
- Cost: the surface factory API becomes a little more explicit/verbose because create and adopt are now separated deliberately.
- Tradeoff: introducing a new owner file and explicit popup contract slightly increases subsystem structure, but it prevents wider session-policy sprawl and popup-boundary leaks later.

## Risks

- Some sites may still reject embedded Browser usage even after the dedicated-session refactor.
- Popup mismatch cleanup must be implemented carefully enough that Electron does not leave a stray child surface after Browser rejects adoption.
- Future implementers may be tempted to place Browser-only UA/header policy back on `defaultSession`; dependency rules must prevent that.

## Guidance For Implementation

- Use a persistent partition (for example `persist:<browser-partition>`), not an in-memory session.
- Keep Browser session ownership Browser-specific; do not introduce a generic app-wide session manager.
- Ensure non-popup Browser views are explicitly bound to the dedicated Browser session.
- Treat popup adoption as an explicit adopt-only path with Browser-session validation, not a generic optional `webContents` shortcut.
- On popup mismatch, close/destroy the foreign popup `webContents`, create no child Browser session, and emit no popup-opened event.
- Protect both popup outcomes with regression tests: matching-session allow and mismatched-session abort.
- Update docs/tests in the same change so the repository stops teaching the wrong default-session ownership model.
- Do not add cookie migration or dual-session compatibility branches in this ticket.
