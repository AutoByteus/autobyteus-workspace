# Proposed Design Document

## Design Version

- Current Version: `v2`

## Revision History

| Version | Trigger | Summary Of Changes | Related Review Round |
| --- | --- | --- | --- |
| v1 | Initial draft | Introduced popup-to-preview-tab behavior with explicit popup event spine and best-effort embedded OAuth stance | 1 |
| v2 | Stage 6 design-impact re-entry | Replaced synthetic popup materialization with Electron `allow + createWindow(...) => WebContents` behavior | 2 |

## Artifact Basis

- Investigation Notes: [investigation-notes.md](/Users/normy/autobyteus_org/autobyteus-worktrees/preview-popup-tab-browser-behavior/tickets/in-progress/preview-popup-tab-browser-behavior/investigation-notes.md)
- Requirements: [requirements.md](/Users/normy/autobyteus_org/autobyteus-worktrees/preview-popup-tab-browser-behavior/tickets/in-progress/preview-popup-tab-browser-behavior/requirements.md)
- Requirements Status: `Design-ready`
- Shared Design Principles: [/Users/normy/.codex/skills/software-engineering-workflow-skill/shared/design-principles.md](/Users/normy/.codex/skills/software-engineering-workflow-skill/shared/design-principles.md)
- Common Design Practices: [/Users/normy/.codex/skills/software-engineering-workflow-skill/shared/common-design-practices.md](/Users/normy/.codex/skills/software-engineering-workflow-skill/shared/common-design-practices.md)

## Summary

Add browser-like popup handling to Preview by converting renderer-created `window.open()` / `target=_blank` requests into new in-app Preview sessions and tabs through Electron’s real popup boundary: `setWindowOpenHandler(...)-> { action: 'allow', createWindow: () => childWebContents }`. Preserve the current shell lease model by keeping popup-created sessions owned by `PreviewSessionManager` and projected into the correct shell only through `PreviewShellController`. Treat social/OAuth login as best-effort: popup flows should work inside Preview when providers allow embedded user agents, but the design will not promise universal provider compatibility.

## Goal / Intended Change

Enable popup/new-tab behavior inside Preview so X, LinkedIn, and similar sites can open secondary auth or browsing windows inside the app’s Preview tab system rather than failing on the current blanket popup block.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: remove the unconditional popup deny path from Preview and replace it with the popup-to-preview-tab flow built on Electron’s real popup semantics.
- Gate rule: design is invalid if it keeps the blanket deny as the steady-state popup policy or if it emulates popups only after denying the actual popup request.

## Requirements And Use Cases

| Requirement ID | Description | Acceptance Criteria ID(s) | Acceptance Criteria Summary | Use Case IDs |
| --- | --- | --- | --- | --- |
| R-001 | Preview no longer blanket-blocks popup/new-window requests | AC-001 | Popup becomes in-app Preview tab/session | UC-001, UC-002 |
| R-002 | Popup-created tabs stay inside Preview shell UX | AC-002 | Popup tab is focusable/switchable/closeable | UC-001, UC-002 |
| R-003 | Session/cookie continuity is preserved | AC-003 | Same persistent Electron session/profile is reused | UC-001, UC-002 |
| R-004 | Existing browser-use tools continue to work for popup-created tabs | AC-004 | Tool actions continue by `preview_session_id` | UC-002 |
| R-005 | Social/OAuth support is best-effort, not dishonest | AC-005 | Limitations are documented if provider rejects embedded login | UC-001 |
| R-006 | Shell ownership / lease behavior remains explicit and non-stealable | AC-006 | Popup flow does not bypass shell lease rules | UC-001, UC-002 |

## Current-State Read

| Area | Findings | Evidence (files/functions) | Open Unknowns |
| --- | --- | --- | --- |
| Entrypoints / Current Spine Or Fragmented Flow | Preview pages already live in `WebContentsView`, but popup requests are terminated at the view boundary | [preview-view-factory.ts](/Users/normy/autobyteus_org/autobyteus-worktrees/preview-popup-tab-browser-behavior/autobyteus-web/electron/preview/preview-view-factory.ts#L12) | None |
| Current Ownership Boundaries | `PreviewSessionManager` owns session lifecycle; `PreviewShellController` owns shell projection and lease attachment | [preview-session-manager.ts](/Users/normy/autobyteus_org/autobyteus-worktrees/preview-popup-tab-browser-behavior/autobyteus-web/electron/preview/preview-session-manager.ts#L48), [preview-shell-controller.ts](/Users/normy/autobyteus_org/autobyteus-worktrees/preview-popup-tab-browser-behavior/autobyteus-web/electron/preview/preview-shell-controller.ts#L48) | None |
| Current Coupling / Fragmentation Problems | Popup policy is hard-coded in `PreviewViewFactory`, and a synthetic “deny then create later” flow would still under-model real popup semantics | [preview-view-factory.ts](/Users/normy/autobyteus_org/autobyteus-worktrees/preview-popup-tab-browser-behavior/autobyteus-web/electron/preview/preview-view-factory.ts#L22) | None |
| Existing Constraints / Compatibility Facts | Some providers may still reject embedded auth even after popup support; current X + Google failure is due to popup deny; Electron supports stronger popup semantics through `createWindow(...) => WebContents` | [app.log](/Users/normy/.autobyteus/logs/app.log), [Google OAuth 2.0 Policies](https://developers.google.com/identity/protocols/oauth2/policies), [webContents](https://www.electronjs.org/docs/latest/api/web-contents) | Need Stage 7 evidence after implementation |
| Relevant Files / Components | Preview session owner, shell controller, shell host window, view factory | [preview-session-manager.ts](/Users/normy/autobyteus_org/autobyteus-worktrees/preview-popup-tab-browser-behavior/autobyteus-web/electron/preview/preview-session-manager.ts), [preview-shell-controller.ts](/Users/normy/autobyteus_org/autobyteus-worktrees/preview-popup-tab-browser-behavior/autobyteus-web/electron/preview/preview-shell-controller.ts), [workspace-shell-window.ts](/Users/normy/autobyteus_org/autobyteus-worktrees/preview-popup-tab-browser-behavior/autobyteus-web/electron/shell/workspace-shell-window.ts), [preview-view-factory.ts](/Users/normy/autobyteus_org/autobyteus-worktrees/preview-popup-tab-browser-behavior/autobyteus-web/electron/preview/preview-view-factory.ts) | Need exact popup details shape we expose from Electron callback |

## Current State (As-Is)

Preview sessions are already browser-like tabs backed by `WebContentsView`, but only for the initial tool-created navigation path. Any renderer-created popup or `target=_blank` navigation is denied at the view factory boundary, which prevents auth popups and breaks normal multi-tab browser behavior.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Owning Node / Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | Preview page renderer requests `window.open()` or `target=_blank` | Child `WebContents` exists and is attached as an in-app Preview tab in the same shell | `PreviewSessionManager` lifecycle + `PreviewShellController` shell projection | This is the core new popup-to-tab behavior |
| DS-002 | Return-Event | Popup-created session event emitted from session owner | Renderer receives updated shell snapshot showing the new Preview tab | `PreviewShellController` | This makes the new tab visible in the UI without bypassing shell ownership |
| DS-003 | Bounded Local | Window-open callback from one `WebContentsView` | Popup allow/deny decision + child session/child `WebContents` creation | `PreviewSessionManager` | The popup decision cycle materially shapes behavior and must be explicit |

## Primary Execution / Data-Flow Spine(s)

- `Preview Page WebContents -> PreviewViewFactory window-open boundary -> PreviewSessionManager popup boundary -> PreviewShellController -> WorkspaceShellWindow -> Renderer Preview tab strip`

## Spine Actors / Main-Line Nodes

| Node | Role In Spine | What It Advances |
| --- | --- | --- |
| Preview Page WebContents | Emits popup/new-window request | Starts popup/tab creation |
| PreviewViewFactory | Electron view boundary adapter | Forwards popup details and returns accepted child `webContents` |
| PreviewSessionManager | Authoritative lifecycle boundary for sessions and popup-created child sessions | Normalizes request, creates child session, returns child `webContents`, preserves shared session/profile, emits popup-opened event |
| PreviewShellController | Authoritative shell lease/projection boundary | Attaches child session to opener shell and activates it |
| WorkspaceShellWindow | Native host that projects the chosen `WebContentsView` | Shows the newly created tab content in the right-side Preview panel |
| Renderer Preview UI | Displays the new tab in shell UI | Reflects the session list and active tab state |

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | A previewed page asks to open a child window. The preview session owner accepts that popup through Electron’s popup boundary, creates the child Preview session immediately, returns the child `webContents` to Electron, then the shell controller leases it into the same shell and activates it as a new Preview tab. | Preview page, `PreviewViewFactory`, `PreviewSessionManager`, `PreviewShellController`, `WorkspaceShellWindow` | `PreviewSessionManager` for session lifecycle, `PreviewShellController` for shell projection | View factory callback wiring, popup request type, renderer snapshot projection |
| DS-002 | Once the child session exists, the shell controller publishes a new shell snapshot so the renderer tab strip reflects the new Preview tab. | `PreviewShellController`, renderer Preview store/UI | `PreviewShellController` | Snapshot IPC, title updates |
| DS-003 | Inside the session owner, a popup request is classified, URL-normalized, denied or accepted, and if accepted, materialized into a child session and child `webContents` without creating a separate OS window. | `PreviewSessionManager` local popup flow | `PreviewSessionManager` | Popup policy, child session creation helper |

## Ownership Map

| Node / Owner | Owns | Must Not Own | Notes |
| --- | --- | --- | --- |
| `PreviewSessionManager` | Popup request normalization, popup allow/deny policy, popup-created session lifecycle, child `webContents` creation/return, shared session continuity, popup-opened event emission | Shell UI state, renderer snapshot projection | Remains the authoritative boundary for session creation |
| `PreviewShellController` | Shell lease attachment, same-shell tab insertion, active-tab selection for popup-created sessions, snapshot publication | Session creation policy, popup URL validation | Must stay the authoritative shell boundary |
| `PreviewViewFactory` | Creating secure `WebContentsView` instances and forwarding Electron popup requests to its owner callback | Lifecycle or shell decisions | Thin adapter only |
| Renderer Preview store/UI | Displaying the new tab and active tab | Popup decision logic or session creation | Remains projection-only |

## Return / Event Spine(s) (If Applicable)

- `PreviewSessionManager popup-opened event -> PreviewShellController -> Preview shell snapshot IPC -> Renderer Preview UI`

## Bounded Local / Internal Spines (If Applicable)

- Parent owner: `PreviewSessionManager`
- Start: `setWindowOpenHandler` callback on one preview view
- End: `popup-opened` event emitted or popup denied
- Arrow chain: `window-open details -> popup request normalizer -> popup policy decision -> child session + child webContents creation -> popup-opened event`
- Why explicit: this local event/decision cycle is exactly where browser-like popup behavior replaces the current blanket deny.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Serves Which Owner | Responsibility | Must Stay Off Main Line? (`Yes`/`No`) |
| --- | --- | --- | --- |
| `PreviewViewFactory` popup callback wiring | `PreviewSessionManager` | Forwards Electron popup callback details and returns accepted child `webContents` | Yes |
| Shell snapshot IPC | `PreviewShellController` | Publishes updated tab state to renderer | Yes |
| Title update observers | `PreviewSessionManager` | Keeps popup-created tab titles current after load | Yes |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Session lifecycle for popup-created tabs | `autobyteus-web/electron/preview` session subsystem | Extend | The existing session owner already creates and tracks Preview sessions | N/A |
| Same-shell projection for popup-created tabs | `autobyteus-web/electron/preview` shell controller | Extend | The existing shell controller already owns Preview tab projection and leases | N/A |
| Popup request normalization/policy | `PreviewSessionManager` local popup concern | Extend | Popup policy is session lifecycle policy, not a new subsystem | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/electron/preview` | Popup request handling, child session creation, child `webContents` return, shell projection updates | DS-001, DS-002, DS-003 | `PreviewSessionManager`, `PreviewShellController` | Extend | No new subsystem needed |
| `autobyteus-web/electron/shell` | Native view attachment into workspace shell | DS-001 | `WorkspaceShellWindow` | Reuse | Existing shell host stays unchanged except for normal projection updates |
| Renderer Preview UI/store | New tab rendering after snapshot update | DS-002 | Preview renderer projection | Reuse | No new owner; snapshot shape should remain stable if possible |

## Ownership-Driven Dependency Rules

- Allowed dependency directions:
  - `PreviewViewFactory -> PreviewSessionManager popup callback interface`
  - `PreviewSessionManager -> PreviewShellController` only by emitted events/listener wiring through existing public callbacks, not direct calls
  - `PreviewShellController -> PreviewSessionManager` public session boundary
  - `Renderer -> PreviewShellController` only through existing IPC public boundary
- Authoritative public entrypoints versus internal owned sub-layers:
  - Session lifecycle authority: `PreviewSessionManager`
  - Shell lease/projection authority: `PreviewShellController`
- Authoritative Boundary Rule per domain subject (no boundary bypass / no mixed-level dependency):
  - Renderer must not depend on popup internals; it only sees shell snapshots.
  - `PreviewViewFactory` must not grow direct shell-controller knowledge; it forwards popup details only to the session owner boundary.
- Forbidden shortcuts:
  - `PreviewViewFactory -> PreviewShellController`
  - Renderer directly mutating shell state to add popup-created tabs
  - Session owner directly attaching views to `WorkspaceShellWindow`
- Boundary bypasses that are not allowed:
  - Any caller above `PreviewShellController` depending on both the controller and `WorkspaceShellWindow` preview attachment internals
  - Any caller above `PreviewSessionManager` depending on both the manager and popup helper internals
- Temporary exceptions and removal plan:
  - None

## Architecture Direction Decision (Mandatory)

- Chosen direction: `Extend the existing Preview session + shell boundaries with explicit popup event handling through Electron createWindow semantics`
- Rationale (`complexity`, `testability`, `operability`, `evolution cost`): This reuses the current browser-like Preview architecture and adds the missing browser popup behavior without creating a second browsing surface model or losing popup-window semantics.
- Data-flow spine clarity assessment: `Yes`
- Spine inventory completeness assessment: `Yes`
- Ownership clarity assessment: `Yes`
- Off-spine concern clarity assessment: `Yes`
- Authoritative Boundary Rule assessment: `Yes`
- File placement within the owning subsystem assessment: `Yes`
- Outcome (`Keep`/`Add`/`Split`/`Merge`/`Move`/`Remove`): `Add` popup event flow, `Modify` preview boundaries, `Remove` blanket popup deny behavior

## Common Design Practices Applied (If Any)

| Practice / Pattern | Where Used | Why It Helps Here | Owner / Off-Spine Concern | Notes |
| --- | --- | --- | --- | --- |
| Event callback + explicit owner boundary | Popup handling in `PreviewSessionManager` | Keeps popup decisions under the session owner instead of burying policy in the view factory | `PreviewSessionManager` | Replaces ad hoc deny behavior |
| Existing capability reuse | `PreviewShellController` and `WorkspaceShellWindow` | Avoids inventing a second shell projection path | `PreviewShellController` | Keeps UI behavior coherent |

## Ownership And Structure Checks (Mandatory)

| Check | Result (`Yes`/`No`) | Evidence | Decision |
| --- | --- | --- | --- |
| Repeated coordination policy across callers exists and needs a clearer owner | Yes | Popup policy currently leaks into `PreviewViewFactory`; move it to session owner | Extract clear owner |
| Responsibility overload exists in one file or one optional module grouping | No | Current scope can be handled by targeted preview files if popup logic is kept bounded | Keep |
| Proposed indirection owns real policy, translation, or boundary concern | Yes | View factory callback adapter and popup request normalizer both own real translation/boundary work | Keep |
| Every off-spine concern has a clear owner on the spine | Yes | View factory serves session owner; IPC snapshot serves shell controller | Keep |
| Authoritative Boundary Rule is preserved: authoritative public boundaries stay authoritative; callers do not depend on both an outer owner and one of its internal owned mechanisms | Yes | Popup event path remains `SessionManager -> ShellController`, not direct shell mutation from view factory | Keep |
| Existing capability area/subsystem was reused or extended where it naturally fits | Yes | Preview subsystem and shell host are reused; no new popup subsystem is introduced | Reuse/Extend |
| Repeated structures were extracted into reusable owned files where needed | No | No new shared structures are required beyond a popup request/result shape | Keep Local |
| Current structure can remain unchanged without spine/ownership degradation | No | The blanket popup deny violates the new browser-like requirement | Change |

## Optional Alternatives

| Option | Summary | Pros | Cons | Decision (`Chosen`/`Rejected`) | Rationale |
| --- | --- | --- | --- | --- | --- |
| A | Keep blanket deny and document unsupported popup auth | Minimal code | Fails the stated browser-like goal and real site flows | Rejected | Not acceptable for this ticket |
| B | Open popup requests as separate OS windows | Easier than internal tab integration | Breaks Preview shell UX and weakens tool/session coherence | Rejected | Wrong product behavior |
| C | Convert popup requests into new Preview sessions/tabs in the same shell using `createWindow(...) => WebContents` | Matches current Preview browser-like direction while preserving real popup semantics | Requires explicit popup event wiring and validation | Chosen | Best fit for the product goal |

## Change Inventory (Delta)

| Change ID | Change Type (`Add`/`Modify`/`Rename/Move`/`Remove`) | Current Path | Target Path | Rationale | Impacted Areas | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| C-001 | Modify | `autobyteus-web/electron/preview/preview-view-factory.ts` | same | Replace blanket popup deny with callback-driven `allow + createWindow(...)` forwarding | Preview view creation | No shell decisions here |
| C-002 | Modify | `autobyteus-web/electron/preview/preview-session-manager.ts` | same | Add popup request handling + child `webContents` creation + popup-opened event emission | Session lifecycle | Main popup owner |
| C-003 | Modify | `autobyteus-web/electron/preview/preview-shell-controller.ts` | same | Lease popup-created child session into the opener shell and activate it | Shell projection | Preserve non-stealable lease rule |
| C-004 | Modify | `autobyteus-web/electron/preview/preview-session-types.ts` | same | Add popup request/result internal types if needed | Shared preview structures | Keep internal, not public tool contract |
| C-005 | Modify | renderer Preview store/UI files as needed | same | Ensure new snapshot-driven tabs appear/activate correctly | Preview UI projection | Only if current snapshot projection needs small adjustment |
| C-006 | Remove | blanket popup deny behavior | `preview-view-factory.ts` old path | Old behavior becomes incompatible with the target browser-like capability | Preview popup path | Remove in this change |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| Blanket `return { action: 'deny' }` popup policy in `PreviewViewFactory` | Prevents browser-like popup/new-tab behavior and breaks popup window semantics | Callback-driven `allow + createWindow(...)` forwarding to `PreviewSessionManager` | In This Change | Keep protocol filtering, remove blanket deny |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/electron/preview/preview-view-factory.ts` | Preview native view creation | `PreviewViewFactory` | Create secure `WebContentsView` and forward popup requests through Electron’s popup boundary | Native view creation boundary | Yes, popup request shape if added |
| `autobyteus-web/electron/preview/preview-session-manager.ts` | Preview session lifecycle | `PreviewSessionManager` | Create child sessions and child `webContents` from popup requests, keep shared session continuity, emit popup-opened event | Session lifecycle authority | Yes |
| `autobyteus-web/electron/preview/preview-shell-controller.ts` | Preview shell projection | `PreviewShellController` | Attach popup-created session to opener shell and publish updated snapshot | Shell authority | Yes |
| `autobyteus-web/electron/preview/preview-session-types.ts` | Preview shared types | Preview session subsystem | Internal popup request/result types if needed | Tight shared preview type ownership | Yes |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Final Responsibility |
| --- | --- | --- | --- |
| `autobyteus-web/electron/preview/preview-view-factory.ts` | Preview | `PreviewViewFactory` | Native view construction + popup callback wiring only |
| `autobyteus-web/electron/preview/preview-session-manager.ts` | Preview | `PreviewSessionManager` | Session lifecycle + popup session/child `WebContents` creation + popup-opened event |
| `autobyteus-web/electron/preview/preview-shell-controller.ts` | Preview | `PreviewShellController` | Shell lease attachment + popup-created tab activation + snapshot publication |
| `autobyteus-web/electron/shell/workspace-shell-window.ts` | Shell | `WorkspaceShellWindow` | Unchanged native view host/attachment boundary |
| Renderer Preview store/UI files | Preview UI | renderer projection boundary | Reflect popup-created tabs from snapshot only |

## Folder / Path Mapping

- Reuse existing preview capability area:
  - `autobyteus-web/electron/preview/`
- Reuse existing shell host capability area:
  - `autobyteus-web/electron/shell/`
- No new top-level subsystem or module grouping is required for this ticket.

## Migration / Refactor Sequence

1. Add internal popup request forwarding to `PreviewViewFactory`.
2. Extend `PreviewSessionManager` to create child sessions and child `WebContents` from popup requests and emit a popup-opened event.
3. Extend `PreviewShellController` to lease the popup-created child session into the opener shell and activate it.
4. Adjust renderer snapshot projection only if the current tab strip does not already render the new session correctly.
5. Add executable validation for popup-to-tab behavior and best-effort OAuth/provider evidence.

## Concrete Example

Good shape:

`X preview tab -> Google sign-in popup request -> PreviewSessionManager creates child session and returns child webContents -> PreviewShellController attaches child session to same shell -> Renderer shows new Preview tab`

Bad shape:

`X preview tab -> PreviewViewFactory decides shell/UI behavior -> Renderer mutates tab list directly -> Shell controller catches up later`

The good shape keeps popup lifecycle owned by the session boundary and shell projection owned by the shell boundary.
