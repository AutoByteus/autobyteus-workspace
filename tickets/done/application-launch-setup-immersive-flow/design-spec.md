# Design Spec

## Current-State Read

The current Applications route has the correct lower-level owners but the wrong top-level page composition for the desired UX. Architecture review already forced one revision to make the host-launch lifetime contract deterministic. Live local validation then exposed one more design gap: after `Enter application`, the hosted app can still surface pre-bootstrap placeholder copy like `Waiting for the host bootstrap payload…`, which means the design also needs an explicit post-click launch/bootstrap reveal contract.

Current execution path:

`Applications card -> /applications/:id -> ApplicationShell.vue -> ApplicationLaunchSetupPanel.vue -> pre-entry gate -> applicationHostStore.startLaunch(applicationId) -> ApplicationSurface.vue -> ApplicationIframeHost.vue`

Current ownership boundaries:

- `pages/applications/[id].vue` is a thin route entry that simply renders `ApplicationShell.vue`.
- `ApplicationShell.vue` is the governing route owner today, but it currently renders setup and in-app usage in one long standard-shell page.
- `ApplicationLaunchSetupPanel.vue` already owns the correct host-managed setup boundary: persisted slot configuration, supported launch defaults, save/reset flows, and `ApplicationLaunchSetupGateState` emission.
- `applicationHostStore.ts` is already the authoritative host-launch owner for backend readiness and `launchInstanceId` creation. Its current `startLaunch(applicationId)` contract accepts only `applicationId` and creates a new launch generation; it does not consume launch-setup state.
- `ApplicationSurface.vue` remains the authoritative iframe/bootstrap owner once a `launchInstanceId` exists.
- `appLayoutStore.ts` plus `layouts/default.vue` still own the immersive host-shell suppression boundary, but the current application route never asks for that presentation.

Current coupling and fragmentation problems:

1. **The route mixes two different product moments in one layout**
   - The current page stacks app notice/banner, metadata/details, setup form, pre-entry gate, and the live app surface vertically.
   - As a result, setup feels like the main experience even after the user has “entered” the app.

2. **The immersive boundary still exists, but the route no longer uses it**
   - Earlier immersive work established a clean boundary: page shell requests immersive host-shell presentation through `appLayoutStore`, and `default.vue` suppresses host chrome.
   - That boundary survived in code, but the application-owned-runtime refactor removed the post-entry immersive phase from `ApplicationShell.vue`.

3. **The setup owner is not the real problem**
   - `ApplicationLaunchSetupPanel.vue` already owns the right host-managed setup responsibilities.
   - Replacing that owner would be the wrong fix. The real problem is that `ApplicationShell.vue` does not treat setup and in-app usage as separate phases.

4. **The current post-entry experience is not app-first**
   - Even after the host launch is ready, the app remains visually subordinate to the standard host shell.
   - The user wants the app to become the dominant surface, with only a tiny setup/control trigger visible.

5. **The desired post-entry interaction is panel-based, not page-switch-based**
   - The approved requirement is not “restore a standard host page when the user wants controls.”
   - The approved requirement is: immersive by default, tiny trigger, secondary side panel, inline expandable items, and horizontal resizing.

6. **There is still no explicit user-visible launch/bootstrap transition gate**
   - The current implementation now enters immersive mode immediately, but once a `launchInstanceId` exists it mounts the iframe before bootstrap completes.
   - Built-in apps such as Brief Studio still initialize their business DOM with host-bootstrap waiting copy.
   - Because the surface does not define an opaque reveal gate, host/bootstrap lifecycle state can leak into what users perceive as the application homepage.

Constraints the target design must respect:

- Keep `ApplicationLaunchSetupPanel.vue` as the authoritative setup owner.
- Keep `applicationHostStore.ts` as the authoritative host-launch owner.
- Keep `ApplicationSurface.vue` as the authoritative iframe/bootstrap owner.
- Reuse the existing `appLayoutStore -> layouts/default.vue` immersive suppression boundary instead of bypassing it with ad hoc layout manipulation.
- Preserve the application-owned runtime model: host setup saves defaults and ensures backend readiness; the application still decides when to create runs.
- Do not preserve the current always-mixed layout as a compatibility mode.

## Intended Change

Refactor the route into a **two-phase route model with an explicit post-click reveal gate** governed by `ApplicationShell.vue` and `ApplicationSurface.vue`:

1. **Setup phase**
   - Default route state after opening an application.
   - Renders a setup-focused host screen with app summary/context plus the authoritative `ApplicationLaunchSetupPanel.vue` and the explicit enter gate.
   - Saved values are prefilled, and entry is enabled immediately when setup is already valid.

2. **Immersive phase**
   - Entered when the user chooses to enter the application.
   - `ApplicationShell.vue` requests `appLayoutStore.setHostShellPresentation('application_immersive')`, allowing `layouts/default.vue` to suppress competing host chrome.
   - The user-visible lifecycle inside immersive mode is:
     - `immersive launch/bootstrap transition` while the host launch and iframe bootstrap are still pending, then
     - `immersive app-ready view` once bootstrap succeeds and the app canvas is intentionally revealed.
   - Only a tiny host trigger remains visible by default.

Inside immersive phase, the shell adds one new focused UI owner:

- `ApplicationImmersiveControlPanel.vue`
  - owns the tiny trigger,
  - owns side-panel open/close UI,
  - owns local width state for horizontal resizing,
  - owns the inline expandable/disclosure interaction for menu items such as `Configure/Setup` and `Details`, and
  - emits explicit intents upward for route-level actions such as `Exit application` or `Reload application`.

The immersive control panel is **secondary chrome**, not a second page mode. Opening it temporarily narrows the application canvas, keeps the application visible, and expands content inline beneath the clicked item in the same panel.

`ApplicationLaunchSetupPanel.vue` is reused inside that panel through a presentation variant (`page` vs `panel`) so the same authoritative setup owner serves both:

- the full setup phase before entry, and
- the inline configure disclosure inside immersive mode after entry.

`ApplicationSurface.vue` remains the iframe/bootstrap owner. `ApplicationShell.vue` may show host-launch loading/error canvas states **before** a `launchInstanceId` exists, but once a `launchInstanceId` is available, `ApplicationSurface.vue` must own an explicit **bootstrap reveal gate**:

- it may mount the iframe and complete the reviewed ready/bootstrap handshake internally,
- it keeps the iframe business DOM visually hidden behind an opaque host-owned transition canvas until bootstrap succeeds,
- it keeps bootstrap failure UI in that same transition state instead of revealing the homepage, and
- it reveals the immersive app canvas only after successful bootstrap delivery to the matching iframe launch instance.

This means the user-visible lifecycle is:

`setup -> immersive launch/bootstrap transition -> immersive app-ready view`

without introducing a new iframe/backend protocol beyond the existing reviewed bootstrap boundary.

## Host-Launch Reuse / Invalidation Contract (Mandatory)

The revised design uses a **route-visit-scoped, setup-agnostic host-launch contract**.

### Why no setup-compatibility signal is added

`applicationHostStore.ts` currently owns only generic host launch state: backend ensured ready, `launchInstanceId`, engine status, and errors. That is still the correct boundary. The host launch does **not** include launch-setup values in its identity because:

- `startLaunch(applicationId)` currently accepts only `applicationId`;
- the host launch exists only to ensure the application backend is ready and to mint an iframe bootstrap correlation id; and
- saved launch setup is consumed later through the application/backend resource-configuration boundary, not through iframe-bootstrap identity.

Therefore the revised design makes host launches **setup-agnostic by contract** instead of extending `ApplicationHostLaunchState` with setup fingerprints.

### Deterministic shell/store rules

1. **Enter application**
   - `ApplicationShell.vue` always calls `applicationHostStore.startLaunch(applicationId)` when the user commits from setup phase into immersive phase.
   - This always creates a fresh launch generation for that route visit.
   - The shell does **not** attempt to reuse a prior `ready` launch from an earlier route visit.

2. **Reload application**
   - `Reload application` is the only in-route action that intentionally replaces the current host launch.
   - The shell calls `applicationHostStore.startLaunch(applicationId)` again, which supersedes the prior generation with a fresh `launchInstanceId`.
   - Reload is therefore the explicit “re-bootstrap the iframe/app shell” action.

3. **Exit application**
   - `Exit application` is explicit teardown of the current immersive application visit.
   - The shell must call `applicationHostStore.clearLaunchState(applicationId)`, reset host-shell presentation to `standard`, and navigate back to `/applications`.
   - Because exit clears launch state, a later route entry starts from setup phase and a fresh host launch.

4. **Route unmount / route re-entry**
   - Leaving `/applications/:id` by any route navigation is treated the same as exit for host-launch lifetime.
   - On route unmount or route-parameter change away from the current `applicationId`, `ApplicationShell.vue` must clear that application's host launch state and reset host-shell presentation.
   - Therefore route re-entry never reuses a prior ready launch; it always returns to setup phase and a fresh `Enter application` launch.

5. **Post-entry setup saves**
   - Saving setup from inside the immersive side panel does **not** call `startLaunch()` and does **not** call `clearLaunchState()`.
   - The currently mounted immersive app remains visible.
   - The saved setup becomes available to future app-owned runtime decisions through the existing resource-configuration boundary.
   - If the user wants the application iframe/backend shell itself freshly bootstrapped after a save, they must use explicit `Reload application`.

### Resulting compatibility rule

- Host launch compatibility is **not derived from setup revision**.
- Host launch lifetime is instead defined by **route visit + explicit reload/exit actions**.
- This gives one deterministic rule set without leaking setup semantics into the host-launch store.

## Immersive Launch / Bootstrap Reveal Contract (Mandatory)

The revised design also defines one explicit **user-visible reveal contract** between `ApplicationShell.vue` and `ApplicationSurface.vue`.

### Why this contract is needed

Live validation showed that the immersive redesign can still leak host/bootstrap lifecycle messaging into the app homepage. The root cause is not the host-launch store anymore; it is that the iframe business DOM can exist before bootstrap completes, while sample apps such as Brief Studio still initialize homepage DOM with host-bootstrap waiting copy.

The fix is **not** a new backend/bootstrap protocol. Prior reviewed architecture already defines host bootstrap completion at bootstrap-envelope delivery. The missing piece is a visual/lifecycle gate around that existing boundary.

### Deterministic reveal rules

1. **Enter application immediately enters immersive mode, but not immediately the homepage**
   - Clicking `Enter application` switches the route into immersive mode right away.
   - The first user-visible immersive state is the **launch/bootstrap transition**, not the business homepage.

2. **Shell-owned transition before `launchInstanceId`**
   - While `applicationHostStore.ts` is still preparing and no `launchInstanceId` exists, `ApplicationShell.vue` owns the immersive loading/error canvas.
   - This is the host-launch portion of the transition.

3. **Surface-owned transition after `launchInstanceId`**
   - Once a `launchInstanceId` exists, `ApplicationSurface.vue` becomes the owner of the remaining bootstrap transition.
   - `ApplicationSurface.vue` may mount `ApplicationIframeHost.vue` and drive the existing ready/bootstrap handshake internally.
   - However, until bootstrap succeeds, the surface must keep the iframe business DOM **visually hidden** behind an opaque host-owned loading/failure canvas.

4. **Bootstrap success is the reveal gate**
   - The immersive app canvas is revealed only after the matching bootstrap envelope is successfully delivered to the current iframe launch instance.
   - No additional app-ready protocol event is introduced in this ticket.
   - This preserves the previously reviewed boundary that host bootstrap ends at bootstrap delivery.

5. **Bootstrap failure stays in the transition state**
   - Ready timeout, bridge failure, contract failure, or other bootstrap failure must keep the user in a host-owned immersive transition failure state.
   - Retry/exit affordances belong there.
   - The business homepage must not become the normal visible surface for these failure cases.

6. **App-local loading after reveal remains app-owned**
   - After bootstrap succeeds and the iframe is revealed, any first query / initial read-model load / empty state / business-local error remains app-owned UI inside the iframe.
   - The host must not reabsorb those app-local states.
   - The only thing excluded from the homepage is **host/bootstrap lifecycle messaging before bootstrap success**.

### Resulting UX rule

- Allowed:
  - `Enter application -> immersive loading canvas -> hidden iframe bootstrap -> reveal app homepage after bootstrap success`
- Forbidden:
  - `Enter application -> app homepage visible with "Waiting for the host bootstrap payload…" while bootstrap is still pending`

This keeps the reviewed protocol boundary intact while making the visible lifecycle unambiguous.

## Terminology

- `Setup phase`: the setup-first route presentation shown when the application route opens.
- `Immersive phase`: the app-first route presentation shown after the user enters the application.
- `Immersive launch/bootstrap transition`: the post-click immersive loading/failure state that exists before the app homepage is intentionally revealed.
- `Bootstrap reveal gate`: the rule that the iframe business surface remains visually hidden until bootstrap delivery succeeds for the current launch instance.
- `Immersive app-ready view`: the immersive state after the bootstrap reveal gate opens and the app canvas is intentionally visible.
- `Immersive trigger`: the tiny always-available host control visible in immersive mode.
- `Immersive control panel`: the resizable side panel opened from the immersive trigger.
- `Inline disclosure section`: an expandable content block rendered directly beneath a clicked panel item such as `Details` or `Configure/Setup`.
- `Host-launch state`: the `applicationHostStore` state (`idle` / `preparing` / `ready` / `failed`) that exists before or alongside iframe mount.

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
| `DS-LAUNCH-IMM-001` | `Primary End-to-End` | User opens an application from the catalog | Setup-first application route is shown with authoritative setup gating | `ApplicationShell.vue` | Establishes the new setup-first entry phase |
| `DS-LAUNCH-IMM-002` | `Primary End-to-End` | User clicks `Enter application` from the setup phase | Immersive mode becomes dominant, the launch/bootstrap transition resolves, and the app canvas is revealed only after bootstrap success | `ApplicationShell.vue` for route entry; `ApplicationSurface.vue` for post-launch reveal gating | Establishes the setup-to-immersive transition without leaking bootstrap lifecycle into the homepage |
| `DS-LAUNCH-IMM-003` | `Primary End-to-End` | User clicks the tiny immersive trigger | Resizable side control panel opens and exposes inline setup/details/actions | `ApplicationImmersiveControlPanel.vue` | Defines the new post-entry host interaction model |
| `DS-LAUNCH-IMM-004` | `Bounded Local` | `ApplicationLaunchSetupPanel.vue` loads or saves slot configuration | Updated `ApplicationLaunchSetupGateState` is emitted upward | `ApplicationLaunchSetupPanel.vue` | Keeps setup readiness authoritative and reusable in both presentations |
| `DS-LAUNCH-IMM-005` | `Bounded Local` | `ApplicationSurface.vue` receives a `launchInstanceId` | Hidden iframe bootstrap either reveals the app canvas on success or keeps failure inside the transition state | `ApplicationSurface.vue` | Protects iframe/bootstrap ownership while making homepage reveal deterministic |
| `DS-LAUNCH-IMM-006` | `Bounded Local` | Immersive trigger is clicked | Panel open state, active disclosure section, and width update locally while the app canvas remains visible | `ApplicationImmersiveControlPanel.vue` | Captures the disclosure-style interaction and resize behavior the user explicitly requested |

## Primary Execution Spine(s)

- `ApplicationCard -> /applications/:id -> ApplicationShell (setup phase) -> ApplicationLaunchSetupPanel -> enter gate -> ApplicationShell (immersive launch/bootstrap transition) -> appLayoutStore -> default.vue -> ApplicationSurface (bootstrap reveal gate) -> ApplicationIframeHost -> immersive app-ready canvas`
- `Immersive trigger -> ApplicationImmersiveControlPanel -> inline disclosure item -> setup/details/action content -> ApplicationShell intent handling -> navigateTo('/applications') or ApplicationLaunchSetupPanel or applicationHostStore.startLaunch(...)`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| `DS-LAUNCH-IMM-001` | Opening an app always lands on a setup-focused host screen. `ApplicationShell.vue` loads the application, renders context plus the authoritative `ApplicationLaunchSetupPanel.vue`, and keeps entry gated until setup is ready. | `ApplicationCard.vue`, `pages/applications/[id].vue`, `ApplicationShell.vue`, `ApplicationLaunchSetupPanel.vue` | `ApplicationShell.vue` | localization, detail-item composition, `applicationHostStore` state read |
| `DS-LAUNCH-IMM-002` | When the user enters the application, the shell starts a fresh host launch for that route visit, switches to immersive mode, requests `application_immersive` host-shell presentation through `appLayoutStore`, and shows a launch/bootstrap transition instead of the business homepage. The shell owns loading/error before `launchInstanceId`; after that, `ApplicationSurface.vue` owns the remaining reveal gate until bootstrap succeeds. | `ApplicationShell.vue`, `applicationHostStore.ts`, `appLayoutStore.ts`, `layouts/default.vue`, `ApplicationSurface.vue` | `ApplicationShell.vue` for route entry; `ApplicationSurface.vue` for reveal gating | `ApplicationImmersiveControlPanel.vue`, host-launch error/loading states |
| `DS-LAUNCH-IMM-003` | Inside immersive mode, the tiny trigger opens a side panel that narrows the app canvas. Panel items such as `Details` and `Configure/Setup` expand their content inline beneath the clicked item, while route-level intents like `Exit application` emit back to the shell. | `ApplicationImmersiveControlPanel.vue`, `ApplicationShell.vue`, `ApplicationLaunchSetupPanel.vue` | `ApplicationImmersiveControlPanel.vue` for UI-local interaction, `ApplicationShell.vue` for route-level intents | detail-item data, resize handling, route navigation |
| `DS-LAUNCH-IMM-004` | The setup panel loads persisted slot state, manages drafts/save/reset, and emits authoritative gate readiness. The shell consumes the same emitted gate state whether the panel is shown in the setup phase or inside the immersive disclosure panel. | `ApplicationLaunchSetupPanel.vue` | `ApplicationLaunchSetupPanel.vue` | REST load/save helpers, launch-default field presenter |
| `DS-LAUNCH-IMM-005` | Once the host launch provides a `launchInstanceId`, the surface independently handles descriptor commit, hidden iframe mount, ready handshake, bootstrap delivery, retry, failure overlays, and the bootstrap reveal gate without leaking those concerns upward into the shell or control panel. | `ApplicationSurface.vue`, `ApplicationIframeHost.vue` | `ApplicationSurface.vue` | iframe contract helpers, transport builder |
| `DS-LAUNCH-IMM-006` | The control panel owns its own local UI cycle: trigger opens panel, panel width changes through drag-resize, one disclosure section expands inline, and closing the panel restores the fully immersive canvas. This interaction stays local to the panel presenter instead of polluting shell or layout ownership. | `ApplicationImmersiveControlPanel.vue` | `ApplicationImmersiveControlPanel.vue` | resize handle behavior, disclosure state |

## Spine Actors / Main-Line Nodes

- `ApplicationCard.vue`
- `pages/applications/[id].vue`
- `ApplicationShell.vue`
- `ApplicationLaunchSetupPanel.vue`
- `applicationHostStore.ts`
- `ApplicationImmersiveControlPanel.vue`
- `appLayoutStore.ts`
- `layouts/default.vue`
- `ApplicationSurface.vue`
- `ApplicationIframeHost.vue`

## Ownership Map

- `ApplicationCard.vue`
  - thin catalog-entry presenter
  - owns the open intent only
  - does **not** own route setup or immersive policy

- `pages/applications/[id].vue`
  - thin Nuxt route entry
  - does **not** own application setup, launch, or immersive behavior

- `ApplicationShell.vue`
  - governing owner of route phase (`setup` vs `immersive`)
  - governs transition from setup phase to immersive phase
  - governs when `appLayoutStore` should request immersive host-shell suppression
  - owns route-level actions such as enter, reload, and exit
  - owns host-launch loading/error presentation before `ApplicationSurface.vue` can mount
  - does **not** own setup form internals or iframe bootstrap/reveal internals once a `launchInstanceId` exists

- `ApplicationLaunchSetupPanel.vue`
  - authoritative owner of persisted resource-slot configuration, save/reset flows, and gate-state emission
  - may support `page` vs `panel` presentation variants
  - does **not** own route phase, immersive layout, or exit navigation

- `ApplicationImmersiveControlPanel.vue`
  - focused immersive presenter for the tiny trigger, side panel shell, local width state, and inline disclosure interaction
  - may own local panel-open / active-section / width state because these are UI-local concerns
  - emits route-level intents upward instead of mutating stores directly
  - does **not** own app launch state, route navigation, or persisted setup writes

- `applicationHostStore.ts`
  - authoritative host-launch boundary for backend readiness and `launchInstanceId`
  - does **not** own route presentation or setup validation

- `appLayoutStore.ts`
  - authoritative shared signal for outer host-shell presentation
  - does **not** own application route phase or setup panel state

- `layouts/default.vue`
  - authoritative renderer of host chrome suppression/restoration
  - does **not** own page-level decisions about when immersive mode should be active

- `ApplicationSurface.vue`
  - authoritative iframe/bootstrap owner once a `launchInstanceId` exists
  - owns the bootstrap reveal gate that keeps the iframe business surface hidden until bootstrap succeeds
  - does **not** own setup, route phase, or side-panel UI

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `pages/applications/[id].vue` | `ApplicationShell.vue` | Nuxt route entrypoint | setup/immersive behavior |
| `ApplicationCard.vue` | `ApplicationShell.vue` | catalog-to-route open affordance | launch gating or immersive state |
| `ApplicationImmersiveControlPanel.vue` | `ApplicationShell.vue` for route-level actions | focused immersive presenter | store mutation or navigation policy |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| Current always-stacked `ApplicationShell.vue` branch that keeps setup panel and live app surface in one long standard-shell page | It mixes setup and in-app usage as co-equal default content | Two-phase `ApplicationShell.vue` route model (`setup` / `immersive`) | `In This Change` | Clean-cut replacement; no mixed-layout fallback |
| Post-entry top-row `Reload` / `Details` as default page chrome | These actions should be secondary immersive controls, not primary layout chrome | `ApplicationImmersiveControlPanel.vue` actions/disclosures | `In This Change` | Preserve action reachability, but demote hierarchy |
| Post-entry visibility of app notice + metadata card in the main canvas hierarchy | The immersive app view should be dominant after entry | Setup-phase screen + immersive inline `Details` disclosure | `In This Change` | Metadata remains reachable, not primary |
| Dashboard-like framed `ApplicationSurface.vue` chrome | It visually reads as an embedded card instead of the main app canvas | Parent-height immersive surface styling inside `ApplicationSurface.vue` | `In This Change` | Remove card-first framing |
| User-visible pre-bootstrap homepage exposure such as `Waiting for the host bootstrap payload…` appearing as normal immersive content | Host/bootstrap lifecycle belongs to the launch transition, not the business homepage | Opaque bootstrap reveal gate inside `ApplicationSurface.vue` (and touched sample-app cleanup when needed) | `In This Change` | Prevent host lifecycle copy from leaking into the homepage experience |
| Any attempt to restore the old full-page mixed layout when the user wants setup/details after entry | Contradicts approved requirements | Inline disclosure content inside immersive side panel | `In This Change` | No compatibility branch |
| Stale session-centric / removed immersive-launch modal localization tied to no-longer-shipped application page flows | They no longer match the current or target application UX | New immersive panel copy plus active setup-first copy | `Follow-up` | Clean up as touched localization permits |

## Return Or Event Spine(s) (If Applicable)

Not modeled as a separate top-level spine because the user-visible return effects in scope are immediate route/UI state changes inside `ApplicationShell.vue`, `ApplicationImmersiveControlPanel.vue`, and `layouts/default.vue` rather than a distinct downstream event bus.

## Bounded Local / Internal Spines (If Applicable)

### BLS-LAUNCH-IMM-001 — Setup readiness loop
- Parent owner: `ApplicationLaunchSetupPanel.vue`
- Short arrow chain:
  `load saved config -> build drafts -> user edits/saves/resets -> recompute gate state -> emit ApplicationLaunchSetupGateState`
- Why it matters:
  The same authoritative setup owner must serve both setup phase and immersive-panel configure flows.

### BLS-LAUNCH-IMM-002 — Iframe bootstrap loop
- Parent owner: `ApplicationSurface.vue`
- Short arrow chain:
  `launchInstanceId -> launch descriptor commit -> hidden iframe mount -> ready signal acceptance -> bootstrap envelope delivery -> reveal app canvas | failed transition`
- Why it matters:
  Shell/panel redesign must not absorb iframe lifecycle work, but it also must not allow pre-bootstrap business DOM to become the visible homepage.

### BLS-LAUNCH-IMM-003 — Immersive control-panel interaction loop
- Parent owner: `ApplicationImmersiveControlPanel.vue`
- Short arrow chain:
  `tiny trigger -> panel open -> menu item selected -> inline section expands -> width drag updates panel -> panel close restores dominant canvas`
- Why it matters:
  This is the local interaction pattern the user explicitly approved, and it should stay a focused panel concern instead of spreading through the shell or layout.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| `applicationHostStore.ts` | `DS-LAUNCH-IMM-001`, `DS-LAUNCH-IMM-002` | `ApplicationShell.vue` | host-launch readiness, `launchInstanceId`, launch failure, and explicit route-visit teardown via `clearLaunchState()` | Host launch should stay outside view composition and remain setup-agnostic | Page shell would start owning backend-readiness policy or setup-compatibility policy |
| `appLayoutStore.ts` | `DS-LAUNCH-IMM-002` | `layouts/default.vue` and `ApplicationShell.vue` | authoritative host-shell presentation signal | Keeps layout suppression behind one boundary | Page code would bypass layout authority |
| `ApplicationLaunchDefaultsFields.vue` | `DS-LAUNCH-IMM-004` | `ApplicationLaunchSetupPanel.vue` | slot-specific runtime/model/workspace defaults UI | Keeps setup sub-fields separate from panel orchestration | Setup owner would become overloaded |
| bootstrap reveal overlay / iframe-visibility policy inside `ApplicationSurface.vue` | `DS-LAUNCH-IMM-002`, `DS-LAUNCH-IMM-005` | `ApplicationSurface.vue` | keep host/bootstrap loading/failure outside the visible homepage until bootstrap succeeds | Prevents app business DOM from becoming the visible loading surface | Shell would start owning iframe bootstrap visuals, or the homepage would leak host lifecycle copy |
| localization catalogs | all visible spines | UI owners | user-facing text for setup-first and immersive-panel interactions | Target UX needs intentional copy, not stale session/modal wording | UI would mix new behavior with misleading old copy |
| detail-item composition in `ApplicationShell.vue` | `DS-LAUNCH-IMM-001`, `DS-LAUNCH-IMM-003` | `ApplicationShell.vue` | produce app metadata / engine state rows for setup or immersive details | Keeps business/engine summary centralized in route owner | Details presenter would start querying stores itself |
| local resize loop in `ApplicationImmersiveControlPanel.vue` | `DS-LAUNCH-IMM-003`, `DS-LAUNCH-IMM-006` | `ApplicationImmersiveControlPanel.vue` | panel width drag behavior | This resize is local to one immersive presenter | Shell/layout would take on presentation-only drag state |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Setup-first application route owner | `components/applications/ApplicationShell.vue` | `Extend` | Correct top-level owner already exists | N/A |
| Host-managed setup form | `components/applications/ApplicationLaunchSetupPanel.vue` | `Extend` | Correct authoritative setup owner already exists | N/A |
| Host-shell suppression | `stores/appLayoutStore.ts` + `layouts/default.vue` | `Reuse` | Authoritative immersive boundary already exists and is still valid | N/A |
| Embedded application surface | `components/applications/ApplicationSurface.vue` | `Extend` | Correct iframe/bootstrap owner already exists | N/A |
| Tiny-trigger + side-panel immersive controls | `components/applications` | `Create New` | No current focused owner exists for the approved panel behavior | Existing shell would become overloaded; setup panel is the wrong owner |
| Horizontal resize interaction | local component interaction | `Create New (local only)` | Panel width behavior belongs to the new immersive control presenter | Existing file-explorer/workspace resize patterns are separate local owners, not an applications boundary |
| Applications documentation | `autobyteus-web/docs/applications.md` | `Extend` | Durable doc must describe the new setup-first + immersive-after-entry flow | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `components/applications` | route shell, setup panel presentation variant, immersive control panel, immersive canvas surface | `DS-LAUNCH-IMM-001` through `DS-LAUNCH-IMM-006` | `ApplicationShell.vue`, `ApplicationLaunchSetupPanel.vue`, `ApplicationImmersiveControlPanel.vue`, `ApplicationSurface.vue` | `Extend` | Main UI redesign lives here |
| `stores` | host launch state + host shell presentation state | `DS-LAUNCH-IMM-002` | `applicationHostStore.ts`, `appLayoutStore.ts` | `Reuse` | Boundaries already exist |
| `layouts` | outer host shell suppression/rendering | `DS-LAUNCH-IMM-002` | `default.vue` | `Reuse` | Existing immersive suppression branch remains authoritative |
| `localization/messages` | route, setup, and immersive panel copy | all UI spines | UI owners | `Extend` | New trigger/panel/disclosure copy required |
| `docs` | durable Applications behavior documentation | `DS-LAUNCH-IMM-001` through `DS-LAUNCH-IMM-003` | documentation readers | `Extend` | Must describe setup-first and immersive control panel behavior |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/components/applications/ApplicationShell.vue` | `components/applications` | route owner | setup-vs-immersive phase, host-launch transition, route-level intents, layout-store synchronization | Route orchestration already belongs here | No |
| `autobyteus-web/components/applications/ApplicationImmersiveControlPanel.vue` | `components/applications` | immersive presenter | tiny trigger, side panel shell, inline menu/disclosure items, width drag, action emits | One focused immersive chrome owner is clearer than bloating the shell | No |
| `autobyteus-web/components/applications/ApplicationLaunchSetupPanel.vue` | `components/applications` | setup owner | authoritative setup flow with `page` / `panel` presentation variants | Same setup owner should serve both phases | No |
| `autobyteus-web/components/applications/ApplicationSurface.vue` | `components/applications` | app-surface owner | parent-height immersive canvas, hidden-iframe bootstrap reveal gate, iframe bootstrap lifecycle | Surface and reveal remain one concern | No |
| `autobyteus-web/components/applications/__tests__/ApplicationShell.spec.ts` | `components/applications/__tests__` | behavior test | setup-first phase, immersive transition, panel-driven actions | Existing shell behavior coverage belongs here | N/A |
| `autobyteus-web/components/applications/__tests__/ApplicationImmersiveControlPanel.spec.ts` | `components/applications/__tests__` | behavior test | inline disclosure, panel open/close, resize interaction, emitted intents | New focused presenter needs its own bounded coverage | N/A |
| `autobyteus-web/components/applications/__tests__/ApplicationLaunchSetupPanel.spec.ts` | `components/applications/__tests__` | behavior test | panel presentation variant still preserves setup ownership and gate emission | Existing setup owner coverage belongs here | N/A |
| `autobyteus-web/components/applications/__tests__/ApplicationSurface.spec.ts` | `components/applications/__tests__` | behavior test | bootstrap reveal gate, hidden-while-pending surface, failure stays in transition state | The new reveal contract must be directly covered at the surface owner boundary | N/A |
| `autobyteus-web/localization/messages/en/applications.ts` | `localization/messages` | copy boundary | English copy for setup-first and immersive-panel interactions | New UX needs intentional text | N/A |
| `autobyteus-web/localization/messages/zh-CN/applications.ts` | `localization/messages` | copy boundary | Chinese copy parity for setup-first and immersive-panel interactions | Current localization policy requires parity | N/A |
| `autobyteus-web/docs/applications.md` | `docs` | durable documentation | explain the two-phase route, immersive launch/bootstrap transition, and immersive control panel model | Canonical behavior doc must stay truthful | N/A |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| `ApplicationHostLaunchState` compatibility metadata | N/A | `stores` | Intentionally keep host-launch state setup-agnostic and scoped to route-visit lifetime rather than adding setup fingerprint fields | `Yes` | `Yes` | a mixed launch+setup compatibility record owned by the wrong boundary |
| None other extracted in this scope | N/A | N/A | Route phase keys and immersive panel disclosure keys remain local to their focused owners; extracting generic shared “view state” types would over-generalize UI-local concerns | `Yes` | `Yes` | a generic application-layout enum reused across unrelated owners |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `ApplicationHostLaunchState` (setup-agnostic launch state) | `Yes` | `Yes` | `Low` | Keep launch state keyed to backend readiness + launch identity only; do not mix in setup compatibility semantics |
| No new shared data structure extraction beyond existing launch/setup owners | `Yes` | `Yes` | `Low` | Keep route-phase and disclosure state local to owning components |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/components/applications/ApplicationShell.vue` | `components/applications` | authoritative route shell | load app, govern `setup` vs `immersive`, synchronize `appLayoutStore`, handle enter/reload/exit, perform route-unmount teardown, provide details/setup props/intents to immersive panel, render host-launch loading/error canvas before surface mount | One governing route owner should hold the two-phase UX, teardown contract, and layout synchronization | No |
| `autobyteus-web/components/applications/ApplicationImmersiveControlPanel.vue` | `components/applications` | focused immersive presenter | tiny trigger, side panel open/close UI, local width drag, inline `Details` / `Configure` disclosure sections, route-level action emits such as `exit-application` and `reload-application` | Keeps immersive chrome complexity out of the route shell and setup owner | No |
| `autobyteus-web/components/applications/ApplicationLaunchSetupPanel.vue` | `components/applications` | authoritative setup owner | persisted setup load/save/reset, gate-state emission, presentation variant for full setup page vs embedded side-panel configure disclosure | Same owner should govern setup semantics everywhere | No |
| `autobyteus-web/components/applications/ApplicationSurface.vue` | `components/applications` | authoritative app-surface owner | immersive parent-height canvas framing, iframe descriptor commit, ready/bootstrap/retry/failure lifecycle, and the bootstrap reveal gate that hides business DOM until success | Maintains strict separation between host-launch UX and iframe bootstrap while preventing homepage lifecycle leaks | No |
| `autobyteus-web/components/applications/__tests__/ApplicationShell.spec.ts` | `components/applications/__tests__` | shell behavior test | verify setup-first default, fresh-launch enter behavior, route-unmount cleanup, explicit reload, exit intent, and that immersive entry first shows transition UI rather than the old mixed post-entry hierarchy | Existing shell tests already own route-shell assertions | N/A |
| `autobyteus-web/components/applications/__tests__/ApplicationImmersiveControlPanel.spec.ts` | `components/applications/__tests__` | panel behavior test | verify trigger open/close, inline item expansion, emitted exit/reload intents, and width drag constraints | New immersive presenter needs bounded direct coverage | N/A |
| `autobyteus-web/components/applications/__tests__/ApplicationLaunchSetupPanel.spec.ts` | `components/applications/__tests__` | setup owner test | verify `panel` presentation variant preserves gate-state semantics and save behavior | Keeps setup semantics covered at the correct owner | N/A |
| `autobyteus-web/components/applications/__tests__/ApplicationSurface.spec.ts` | `components/applications/__tests__` | surface behavior test | verify hidden-until-bootstrapped reveal behavior, opaque loading/failure transition UI, retry, and that the iframe business surface is not the visible waiting state | The revised contract is owned by `ApplicationSurface.vue` and needs direct coverage there | N/A |
| `autobyteus-web/localization/messages/en/applications.ts` | `localization/messages` | copy source | add/update/replace copy for the immersive trigger, side-panel items, exit action, disclosure labels, and updated setup-first wording | All new UI copy belongs here | N/A |
| `autobyteus-web/localization/messages/zh-CN/applications.ts` | `localization/messages` | copy source | Chinese parity for the new route/panel behavior | Keep localization truthful in both supported catalogs | N/A |
| `autobyteus-web/docs/applications.md` | `docs` | durable behavior doc | document setup-first route entry, immersive launch/bootstrap transition, app-ready reveal, tiny trigger, resizable side panel, inline disclosure sections, and route-level exit semantics | The Applications doc is the authoritative durable behavior description | N/A |

## Ownership Boundaries

The design has four authoritative boundaries:

1. **Route boundary — `ApplicationShell.vue`**
   - authoritative for route phase, enter/reload/exit handling, and synchronization with `appLayoutStore`
   - upstream callers use the shell, not the immersive panel or setup panel directly, for route-level behavior

2. **Setup boundary — `ApplicationLaunchSetupPanel.vue`**
   - authoritative for persisted setup semantics and gate-state emission
   - the shell may place this owner in different presentations, but it must not reimplement setup logic itself

3. **Immersive panel boundary — `ApplicationImmersiveControlPanel.vue`**
   - authoritative for the UI-local trigger/panel/disclosure/resize interaction
   - it emits explicit intents upward instead of reaching into stores or routing directly

4. **Layout boundary — `appLayoutStore.ts` -> `layouts/default.vue`**
   - authoritative for outer host-shell suppression/restoration
   - the page shell requests presentation; the layout decides how to render itself

`ApplicationSurface.vue` remains a separate authoritative boundary for iframe/bootstrap behavior after host launch readiness is satisfied, including the reveal gate that prevents pre-bootstrap business DOM from becoming the visible homepage.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `ApplicationShell.vue` | route phase, host-launch transition, route-level action handling, route-unmount cleanup | route page, catalog navigation | `ApplicationImmersiveControlPanel.vue` calling `navigateTo()` or mutating `appLayoutStore` directly | add explicit emits/props on the shell-panel boundary |
| `ApplicationLaunchSetupPanel.vue` | setup drafts, save/reset, gate-state computation | `ApplicationShell.vue`, immersive control panel via slot/embed | shell duplicating setup validation or save logic | extend setup-panel props/events, not shell-local clones |
| `appLayoutStore.ts` | host-shell presentation signal | `ApplicationShell.vue` | shell directly toggling layout internals or `useLeftPanel()` | keep using `setHostShellPresentation()` |
| `ApplicationSurface.vue` | iframe descriptor, hidden-until-bootstrapped reveal gate, ready/bootstrap/retry lifecycle | `ApplicationShell.vue` | shell or control panel handling iframe ready/bootstrap state or revealing the iframe business DOM before bootstrap success | add/extend surface props only if framing API becomes too thin |

## Dependency Rules

- `pages/applications/[id].vue` may depend only on `ApplicationShell.vue`.
- `ApplicationShell.vue` may depend on:
  - `ApplicationLaunchSetupPanel.vue`
  - `ApplicationImmersiveControlPanel.vue`
  - `ApplicationSurface.vue`
  - `useApplicationStore()`
  - `useApplicationHostStore()`
  - `useAppLayoutStore()`
- `ApplicationImmersiveControlPanel.vue` may receive props and emit intents, but must not:
  - call `navigateTo()` directly,
  - call `appLayoutStore` directly,
  - call `applicationHostStore` directly.
- `ApplicationLaunchSetupPanel.vue` may keep its existing REST/setup logic and emitted gate state, but must not:
  - own route phase,
  - own immersive layout state,
  - own exit navigation.
- `ApplicationSurface.vue` may continue to own iframe/bootstrap lifecycle, but must not:
  - take over route phase,
  - own immersive control-panel interaction,
  - own setup-panel persistence.
- `ApplicationSurface.vue` must keep pre-bootstrap business DOM visually hidden until bootstrap succeeds for the current launch instance; it must not rely on app homepage placeholder copy as the visible loading surface.
- `ApplicationShell.vue` must use `appLayoutStore.setHostShellPresentation(...)` rather than layout internals.
- `ApplicationShell.vue` must call `applicationHostStore.clearLaunchState(applicationId)` on explicit exit and on route-unmount cleanup for the current application.
- `ApplicationShell.vue` must not infer host-launch compatibility from saved setup; post-entry setup saves stay within the setup boundary and do not mutate host-launch state.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `ApplicationLaunchSetupPanel` prop `presentation` | setup owner | choose page vs embedded panel styling only | `'page' | 'panel'` | Styling/presentation only; not setup semantics |
| `ApplicationLaunchSetupPanel` event `setup-state-change` | setup owner | publish authoritative gate readiness upward | `ApplicationLaunchSetupGateState` | Existing boundary stays authoritative |
| `applicationHostStore.startLaunch(applicationId)` | host-launch owner | create a fresh route-visit host launch and `launchInstanceId` | `applicationId` | Used by `Enter application` and `Reload application`; setup-agnostic by contract |
| `applicationHostStore.clearLaunchState(applicationId)` | host-launch owner | explicitly tear down stored launch state for one application | `applicationId` | Used by `Exit application` and route-unmount cleanup |
| `ApplicationImmersiveControlPanel` emits `exit-application` | route shell action | request navigation out of the application route | none | Panel emits intent only |
| `ApplicationImmersiveControlPanel` emits `reload-application` | route shell action | request a fresh host launch / iframe remount | none | Shell always calls `applicationHostStore.startLaunch()` for this explicit relaunch action |
| `ApplicationImmersiveControlPanel` slot/prop for configure content | immersive panel presenter | render embedded setup owner inline under `Configure/Setup` | slot content | Keeps setup owner separate from panel chrome |
| `appLayoutStore.setHostShellPresentation(presentation)` | outer layout state | request host-shell suppression/restoration | `'standard' | 'application_immersive'` | Existing boundary reused |

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `ApplicationLaunchSetupPanel.presentation` | `Yes` | `Yes` | `Low` | Keep it presentation-only |
| `ApplicationImmersiveControlPanel` emitted intents | `Yes` | `Yes` | `Low` | Use explicit event names per action |
| `applicationHostStore.startLaunch(applicationId)` | `Yes` | `Yes` | `Low` | Keep it fresh-launch only; no setup-compatibility branching |
| `applicationHostStore.clearLaunchState(applicationId)` | `Yes` | `Yes` | `Low` | Use only for explicit exit / unmount teardown |
| `appLayoutStore.setHostShellPresentation(...)` | `Yes` | `Yes` | `Low` | Reuse as-is |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| New immersive side panel presenter | `ApplicationImmersiveControlPanel.vue` | `Yes` | `Low` | Prefer this over vague names like `ApplicationSidebarHelper` |
| Route phase states | `setup` / `immersive` | `Yes` | `Low` | Keep phase names direct and product-facing |
| Inline panel items | `Details`, `Configure/Setup`, `Exit application` | `Yes` | `Low` | Keep action names literal and user-facing |

## Applied Patterns (If Any)

- **Focused presenter component**
  - `ApplicationImmersiveControlPanel.vue`
  - Solves: tiny trigger + resizable side panel + disclosure UI without bloating the route shell
  - Belongs to: immersive host chrome, not route/state orchestration

- **Adapter-like layout boundary reuse**
  - `ApplicationShell.vue -> appLayoutStore.ts -> layouts/default.vue`
  - Solves: immersive host-shell suppression without boundary bypass
  - Belongs to: layout presentation boundary

- **Bounded local state machine / interaction loop**
  - `ApplicationImmersiveControlPanel.vue`
  - Solves: open/close, active disclosure, resize interaction
  - Belongs to: one focused presenter only

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/components/applications/ApplicationShell.vue` | `File` | route shell owner | two-phase route UX, route-level intents, layout-store synchronization, host-launch loading/error states before surface mount | Existing route owner; main-line orchestration belongs here | setup save logic, iframe bootstrap internals, panel-local resize state |
| `autobyteus-web/components/applications/ApplicationImmersiveControlPanel.vue` | `File` | immersive presenter | tiny trigger, resizable side panel, inline disclosure items, route-action emits | New focused owner for approved immersive control behavior | direct store mutation, direct navigation |
| `autobyteus-web/components/applications/ApplicationLaunchSetupPanel.vue` | `File` | setup owner | authoritative persisted setup UI with `page` / `panel` presentation variants | Existing setup owner; behavior should remain centralized | route phase, layout suppression, navigation |
| `autobyteus-web/components/applications/ApplicationSurface.vue` | `File` | app-surface owner | immersive canvas frame, hidden-until-bootstrapped reveal gate, and iframe bootstrap lifecycle | Existing surface owner; must keep bootstrap authority and homepage-reveal policy together | setup gating, control panel UI |
| `autobyteus-web/components/applications/__tests__/ApplicationShell.spec.ts` | `File` | shell test | route-phase behavior coverage | Existing test home for shell behavior | panel-local interaction detail unrelated to shell ownership |
| `autobyteus-web/components/applications/__tests__/ApplicationImmersiveControlPanel.spec.ts` | `File` | immersive panel test | panel open/close, disclosure, resize, emitted intents | New focused test for new presenter | route-level store wiring |
| `autobyteus-web/components/applications/__tests__/ApplicationLaunchSetupPanel.spec.ts` | `File` | setup test | setup owner semantics under embedded panel presentation | Keeps setup owner validation local | shell orchestration assertions |
| `autobyteus-web/components/applications/__tests__/ApplicationSurface.spec.ts` | `File` | surface test | reveal-gate behavior, pending/failure transition visibility, and post-bootstrap reveal | Existing surface-owner test home for the new reveal contract | shell orchestration assertions |
| `autobyteus-web/localization/messages/en/applications.ts` | `File` | localization boundary | English copy updates | Existing Applications copy source | stale removed-flow wording after migration |
| `autobyteus-web/localization/messages/zh-CN/applications.ts` | `File` | localization boundary | Chinese copy updates | Existing Applications copy source | stale removed-flow wording after migration |
| `autobyteus-web/docs/applications.md` | `File` | durable doc | update route behavior description, including the launch/bootstrap transition before homepage reveal | Existing authoritative doc for Applications module | obsolete statement that the route ends at setup + iframe only |

Rules:
- Keep the new immersive control behavior inside `components/applications`; it is part of the Applications route shell, not a generic workspace layout concern.
- Do not create a generic shared “side panel framework” for this ticket. The approved interaction belongs to one route owner and one focused presenter.
- Reuse existing layout suppression boundaries rather than creating a second layout owner inside applications.

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `autobyteus-web/components/applications/` | `Mixed Justified` | `Yes` | `Low` | This folder already owns the route shell, setup owner, and surface owner for Applications UI. Adding one new immersive presenter here keeps route-local ownership readable without creating artificial subfolders for a small scope. |
| `autobyteus-web/components/applications/__tests__/` | `Off-Spine Concern` | `Yes` | `Low` | Existing focused test placement is already clear. |
| `autobyteus-web/localization/messages/` | `Off-Spine Concern` | `Yes` | `Low` | Copy belongs in the existing localization boundary. |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Immersive post-entry control behavior | `tiny trigger -> side panel opens -> click Details -> details expand inline below Details -> click Configure -> setup form expands inline in same panel -> drag panel wider -> close panel -> app returns to dominant immersive canvas` | `enter app -> restore standard host page -> show large setup form below app again` | Captures the exact interaction the user approved |
| Bootstrap reveal gating | `Enter application -> immersive loading canvas -> hidden iframe receives bootstrap -> reveal homepage only after bootstrap success` | `Enter application -> visible app homepage says "Waiting for the host bootstrap payload…"` | Makes the lifecycle boundary concrete and prevents host/bootstrap UX leakage into business surfaces |
| Authoritative layout boundary | `ApplicationShell -> appLayoutStore.setHostShellPresentation('application_immersive') -> default.vue suppresses host chrome` | `ApplicationShell -> useLeftPanel()` or direct DOM/layout manipulation | Prevents layout-boundary bypass |
| Setup ownership reuse | `setup phase uses ApplicationLaunchSetupPanel(page); immersive configure disclosure uses ApplicationLaunchSetupPanel(panel)` | `ApplicationShell reimplements a second smaller setup form just for immersive mode` | Keeps one authoritative setup owner |
| Ready-launch lifetime contract | `route open -> setup phase -> Enter application -> startLaunch(applicationId) -> immersive view -> save setup inside panel (no relaunch) -> explicit Reload starts fresh launch -> Exit or route leave clears launch state` | `reuse old ready launch after route re-entry because store still happens to contain one, or clear/relaunch unpredictably after setup saves` | Makes the revised shell/store contract concrete and deterministic |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep the current always-stacked mixed layout as a fallback when immersive panel work is unfinished | Incremental rollout convenience | `Rejected` | Replace it with the two-phase shell directly |
| Reopen setup/details after entry by switching back to the old full-page setup layout | Reuse current page composition | `Rejected` | Use inline disclosure content inside the immersive control panel |
| Let the new panel mutate routing/store/layout state directly | Reduce shell wiring | `Rejected` | Keep panel emitter-only for route-level actions |
| Bypass `appLayoutStore` and manipulate host chrome directly from the page | Faster implementation | `Rejected` | Reuse the existing layout presentation boundary |

Hard block:
- Any implementation that preserves the current mixed host layout as a parallel long-lived default after entry fails this design.

## Derived Layering (If Useful)

- **Route shell layer**: `pages/applications/[id].vue` -> `ApplicationShell.vue`
- **Focused route-presenter layer**: `ApplicationImmersiveControlPanel.vue`, `ApplicationLaunchSetupPanel.vue`, `ApplicationSurface.vue`
- **Shared route-support layer**: `applicationHostStore.ts`, `appLayoutStore.ts`, localization, docs

This layering is explanatory only. Ownership still controls the design.

## Migration / Refactor Sequence

1. **Refactor `ApplicationShell.vue` into explicit setup vs immersive route phases**
   - setup is the default route state on open
   - `Enter application` always starts a fresh host launch for the current route visit and then switches to immersive phase

2. **Define and implement the visit-scoped host-launch cleanup contract**
   - explicit `Exit application` clears host launch state and resets host-shell presentation
   - route unmount / navigation away from `/applications/:id` performs the same cleanup
   - post-entry setup saves do not clear or relaunch; explicit `Reload application` is the only in-route relaunch action

3. **Reuse the existing immersive host-shell boundary**
   - wire `ApplicationShell.vue` back to `appLayoutStore.setHostShellPresentation()`
   - ensure exit / unmount cleanup restores `standard`

4. **Add `ApplicationImmersiveControlPanel.vue`**
   - implement tiny trigger
   - implement panel open/close and inline disclosure interaction
   - implement local width drag behavior
   - keep route-level actions emitter-only

5. **Extend `ApplicationLaunchSetupPanel.vue` for embedded panel presentation**
   - add `page` / `panel` presentation variant only
   - preserve current setup load/save/gate logic unchanged in ownership terms

6. **Extend `ApplicationSurface.vue` with the bootstrap reveal gate**
   - keep the iframe mounted/handshaking internally as needed
   - keep pre-bootstrap business DOM visually hidden behind an opaque host-owned transition canvas
   - reveal the app canvas only after bootstrap delivery succeeds for the current launch instance
   - keep bootstrap failure/retry inside that same transition state

7. **Restyle `ApplicationSurface.vue` for immersive dominance**
   - remove dashboard-like framing assumptions
   - keep iframe/bootstrap lifecycle intact

8. **Update tests**
   - rewrite `ApplicationShell.spec.ts` around the setup-first + immersive-after-entry route model
   - add focused panel behavior coverage
   - add direct `ApplicationSurface.spec.ts` coverage for hidden-until-bootstrapped reveal behavior
   - keep setup-owner tests authoritative at the setup panel boundary

9. **Update localization and docs**
   - replace or add copy for the immersive trigger, panel items, and route description
   - document the two-phase route, the immersive launch/bootstrap transition, and the inline disclosure panel behavior

10. **Remove obsolete mixed-layout assumptions**
   - delete the old post-entry stacked layout branch rather than keeping it behind a flag or fallback path

## Key Tradeoffs

- **Local immersive panel state vs shell-owned panel state**
  - Decision: keep panel-open / width / active disclosure local to `ApplicationImmersiveControlPanel.vue`
  - Why: these are UI-local concerns and do not need to become route-shell or store-level policy

- **Reuse one setup owner vs create a lighter immersive-only settings form**
  - Decision: reuse `ApplicationLaunchSetupPanel.vue` with a presentation variant
  - Why: setup semantics and gate computation must stay authoritative in one owner

- **Immediate immersive transition on enter vs waiting in setup until ready**
  - Decision: immersive mode should begin immediately when the user commits to entry, but the first visible immersive state is the launch/bootstrap transition rather than the business homepage.
  - Why: this preserves the approved “enter app -> immersive mode immediately” expectation without leaking host/bootstrap lifecycle into the homepage.

- **Bootstrap reveal gate vs visible app-homepage waiting placeholder**
  - Decision: hide the iframe business surface until bootstrap succeeds for the current launch instance.
  - Why: built-in app homepages may contain placeholder/debug text before bootstrap; the host-owned transition must remain the only visible loading/failure surface until bootstrap completes.

- **Visit-scoped fresh launch vs cross-route ready-launch reuse**
  - Decision: clear host launch state on exit and route unmount, so route re-entry always starts fresh.
  - Why: this gives a deterministic contract without polluting `applicationHostStore` with setup-compatibility state, and it matches the explicit semantics of leaving the application.

- **Post-entry setup save vs automatic relaunch**
  - Decision: setup saves inside the immersive panel do not automatically relaunch or clear the current host launch.
  - Why: saved setup belongs to the resource-configuration boundary for later app-owned runtime decisions; explicit `Reload application` remains the one intentional re-bootstrap action.

- **No generic shared resize abstraction in this ticket**
  - Decision: keep resize logic local to the new immersive presenter
  - Why: a generic abstraction would broaden the scope into unrelated workspace/file-explorer owners without strong payoff for this ticket

## Risks

- The setup panel’s embedded `panel` presentation must remain readable at narrower widths; this is why horizontal resizing is part of the design, not a cosmetic extra.
- If the immersive panel starts accumulating unrelated operational flows, it could become a second shell owner. Keep it emitter-only for route-level actions.
- Localization cleanup may reveal additional stale strings from removed session/modal flows; implementation should clean touched copy intentionally instead of layering new copy over old semantics.
- If `ApplicationSurface.vue` uses a translucent rather than opaque transition overlay, pre-bootstrap business DOM can still bleed through visually. The reveal gate must be intentionally opaque.
- If the route later grows additional in-app host tools, they must still fit the inline-disclosure panel model or be treated as new design work.
- Fresh launch on every route visit increases backend-ensure-ready calls compared with speculative reuse, but that is an intentional tradeoff for deterministic ownership and teardown semantics in this scope.

## Guidance For Implementation

- Treat `ApplicationShell.vue` as the authoritative two-phase route owner and do not split route-phase policy across multiple files.
- Reuse `appLayoutStore` exactly as the layout boundary; do not add direct layout toggles in application components.
- Keep the immersive control panel emitter-only for route-level actions.
- Reuse `ApplicationLaunchSetupPanel.vue` rather than cloning setup behavior.
- Preserve `ApplicationSurface.vue` as the iframe/bootstrap owner; shell-level loading/error canvas states stop once a `launchInstanceId` exists, and the surface then owns the hidden-until-bootstrapped reveal gate.
- Do not add a new iframe/backend readiness protocol for this UX ticket; the reveal gate opens on the existing reviewed bootstrap-delivered boundary.
- Keep the host-launch contract explicit in code: `Enter` and `Reload` create fresh launches; `Exit` and route unmount clear launch state; post-entry setup saves do neither.
- When implementing the inline disclosure panel, prefer a one-open-section-at-a-time interaction unless direct requirements later expand it; that best matches the requested “click item -> content immediately extends below” feel.
