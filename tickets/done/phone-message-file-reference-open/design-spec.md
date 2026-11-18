# Design Spec

## Solution And Approval Basis

- Current solution revision ID: `SR-001`
- Approved requirements baseline / revision, who approved, and approval reference: `requirements-doc.md` at SR-001, approved by the Solution Designer within the Task's direction, user informed in the Solution Designer's conversation on 2026-11-07
- Behavior-defining supplements and their approval references: none (autobyteus-277 DS-008 is the delivered governing design)
- User approval of the design, when the direction requires it: `Not required`
- Design status: `Ready`
- Canonical investigation-notes path: `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-message-file-reference-open/tickets/in-progress/phone-message-file-reference-open/investigation-notes.md`
- Authorities read (2026-11-07): `references/architecture-design.md`, `references/design-principles.md`, `DESIGN.md` (repository root), `docs/design-cases.md` (Cases 1, 2, 16), `references/project-documents.md`
- Project design-principle conflicts with the general principles, or discrepancies: none

## Current-State Read

The phone shows a run's conversation with the same `AgentEventMonitor` as the desktop (`MobileRunTargetView.vue:26-41`). A tap on a file link emits `file-path-action`; `AgentEventMonitor.handleFilePathAction` (`AgentEventMonitor.vue:93-104`) awaits a dynamic import of the opener (l.99) and creates it (l.101) with two capabilities: `revealTool`, captured in setup (l.81), and `isOriginCurrent`. On the phone, the opener acquires a third capability itself: `useMobileNavigation()` at creation (`useEventMonitorFilePreview.ts:28`). That composable calls vue-router's `useRoute()`/`useRouter()` (`useMobileNavigation.ts:28-29`), which are Vue `inject` calls. Created inside an async handler, the opener has no injection context, so the route is `undefined` and `openFile` throws at `route.query` (`useEventMonitorFilePreview.ts:60` → `useMobileNavigation.ts:94-95`). The open ends `failed` (Reproduced, investigation R-01; control R-02 opens).

The rest of the phone path is sound: path mapping into the open run's workspace (`openMobilePath`, l.45-61), the Files screen entry, and the Files viewer (MSP-08).

## Task Size And Architectural Risk (Mandatory)

- Task size: `Small`
- Size rationale and supporting evidence: two production files (`AgentEventMonitor.vue`, `useEventMonitorFilePreview.ts`), one option added, one internal call removed; the tests of those two files; one browser-probe case; one design-case entry. No new owner, file, route or contract.
- Architectural risk: `Low`
- Risk rationale and supporting evidence: within existing ownership (the monitor owns the tap; the opener owns the open); the same capability pattern the monitor already uses for `revealTool`. No change to API, persistence, security boundary (path mapping and server checks unchanged, QR-001), concurrency (origin checks unchanged), or deployment. The desktop path takes `mobileNavigation: null` and does not change.
- Escalation trigger if implementation or validation discovers new impact: the browser case shows the Files viewer cannot read the mapped file on the phone (a file-route or 403 issue), or another setup-only capability is reached late on the phone path. Either returns to the Solution Designer as `Design Impact`.

## Architecture Investigation Evidence

| Source / Command / Probe | Exact Path / Reference | Observation | Design Decision Supported | Remaining Uncertainty |
| --- | --- | --- | --- | --- |
| Read | `AgentEventMonitor.vue:81, 93-104` | `revealTool` captured in setup; opener created after `await import` | Capture the phone navigation in setup too | None |
| Read | `useWorkspaceToolReveal.ts:9-12` | "Capture in descendant setup; lazy action handlers receive this local capability explicitly." | Same pattern, existing convention | None |
| Read | `useEventMonitorFilePreview.ts:28, 45-61` | Opener acquires `useMobileNavigation()` itself | Remove that call; receive it in options | None |
| Read | `useMobileNavigation.ts:27-29, 94-95` | Setup-only (vue-router `inject`) | Leave unchanged | None |
| Reproduced | investigation R-01, R-02 | Fails without context; opens with it | Cause confirmed; fix direction confirmed | None |
| Read | grep (investigation S-09) | No other late caller | Scope stays at one caller | None |
| Read | `mobile-shell-probe.mjs:54-56, 1130-1142` | No conversation-file tap case | Add one (AC-001) | None |

## Intended Change

`AgentEventMonitor` captures the phone's navigation in setup, as it captures `revealTool`, and passes it to the opener. The opener stops acquiring it.

## Change Scope (Mandatory)

- In scope: UC-001. The tap-to-open path in `AgentEventMonitor.vue` and the opener's options in `useEventMonitorFilePreview.ts`; their unit tests; a regression spec with the real router; one `mobile-shell-probe` case; the `docs/design-cases.md` Case 2 entry; a TESTING.md rule for the stage that let it through (owner: API/E2E engineer).
- Derived consumers: `N/A` (no stored or shared structure changes; the options type has one production caller, `AgentEventMonitor.vue:101`, and test callers in `useEventMonitorFilePreview.spec.ts`, `useEventMonitorFilePreview.mobileBoundary.spec.ts`, `RightSideTabs.workspaceTarget.spec.ts:266`, `WorkspaceToolShell.spec.ts:104`, which pass the new option or rely on its absence as `null`).
- Deliberately left alone: `useMobileNavigation.ts` (a correct setup-only composable); path mapping and status texts (BEH-002); the desktop open path (BEH-003); clickable-path detection (`useMarkdownSegments.ts`); the server's file routes; the Android shell.
- Follow-ups: FU-001.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Approved Requirement / Intent And Acceptance-Criteria IDs | Approved Trigger Or Governing Contract | Relevant Existing Behavior And Evidence Reference | Approved Change Or Preserved Outcome | Target Production Path / Lifecycle And Spine ID(s) |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | REQ-001, REQ-004; AC-001, AC-002 | Tap a file link in a phone conversation (277 DS-008) | Throws; investigation R-01 | Opens the Files screen with the file | DS-001 |
| BEH-002 | User | REQ-002; AC-003 | Same, path outside the workspace / remote run | Status line; boundary spec | Preserved | DS-001 (the `unavailable` exit) |
| BEH-003 | User | REQ-003; AC-004 | Desktop click | Files tab | Preserved | DS-002 |

## Relevant Supplemental Task Artifacts

| Artifact Path | Purpose | Related Requirement / Acceptance-Criteria IDs | Relationship To This Design | Status / Approval Applicability |
| --- | --- | --- | --- | --- |
| `probes/probe427.mobileFileOpen.spec.ts` | Reproduction and control | REQ-001, AC-002 | The regression spec starts from it | Evidence |

## Task Design Health Assessment (Mandatory)

- Change posture: `Bug Fix`
- Current design issue found: `Yes`
- Structural triggers that fire: **Several kinds or forms** (Principle 1): two paths serve one capability, desktop open and phone open. The desktop path receives its context-bound capability from setup; the phone path acquired its own at an unsupported point, and only the doubled tests traced it. Ruled out: **Split sequence** (Principle 13). The opener still calls each mechanism itself in order (locate → check origin → open). Receiving a setup-captured capability is the file's existing convention for `revealTool`, not handing a collaborator's step to the opener. **Authoritative boundary**: no caller reaches past the opener. **Responsibility overload**: the opener's phone/desktop branch already exists and does not grow.
- Root cause classification: `Boundary Or Ownership Issue`, narrow. The opener reached into the component tree's injection context, which only the mounted component owns.
- Refactor needed now: `No`
- Evidence: investigation S-03, S-05, S-06, S-09, R-01, R-02.
- Design response: the component that owns the injection context (`AgentEventMonitor`) captures the phone navigation in setup and hands it to the opener, as it does `revealTool`.
- Refactor rationale: the owners are right; only where one capability is acquired is wrong.
- Intentional deferrals and residual risk: none.

## Terminology

- Phone navigation: the object `useMobileNavigation()` returns; the opener uses only its `openFile`. Existing word "mobile" is kept in identifiers (`useMobileNavigation`, `isMobileRemoteAccessRuntime`); no new domain word. No glossary change (`GLOSSARY.md` unaffected).

## Legacy Removal Policy (Mandatory)

- Obsolete legacy paths and files in this scope: the opener's own `useMobileNavigation()` call and its import (`useEventMonitorFilePreview.ts:12, 28`).
- Compatibility wrappers, dual paths, or legacy fallbacks this design keeps: `None`

## Persisted Data / State Transition Decision

- Decision: `Not Affected`. No stored data is read or written differently.

## Data-Flow Spine Inventory

| Spine ID | Scope | Related Behavior ID(s) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-001, BEH-002 | Tap on a file link (phone) | Files screen with the file, or the status line | `AgentEventMonitor` (tap), opener (open) | The broken path |
| DS-002 | Primary End-to-End | BEH-003 | Click on a file link (desktop) | Files tab with the file | Same | Preserved; shares the owners |

## Primary Execution Spine(s)

- DS-001 (phone): `MobileRunTargetView → AgentEventMonitor (setup: capture mobileNavigation, revealTool=null) → MarkdownRenderer emits file-path-action → AgentEventMonitor.handleFilePathAction → await import → useEventMonitorFilePreview({ revealTool, mobileNavigation, isOriginCurrent }).openPath → openMobilePath: resolve workspace metadata → map path → check origin → mobileNavigation.openFile → router push screen=files → MobileFiles / MobileFileViewer`
- DS-002 (desktop): unchanged, `… openPath → fileExplorerStore.openFilePreview → revealTool('files')`, with `mobileNavigation: null`.

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | The monitor, while mounting on the phone, takes the phone navigation from its component context. On a tap it loads the opener and gives it that navigation. The opener maps the path into the open run's workspace, confirms the tap's run is still open, and pushes the Files screen entry; the viewer reads the file through the existing workspace file read | tap, file action, workspace-relative path, Files screen entry | `AgentEventMonitor` → opener | path mapping (`mapAbsolutePathToWorkspaceRelative`), workspace metadata (`workspaceStore`) |
| DS-002 | Unchanged | — | — | — |

## Spine Actors / Main-Line Nodes

`AgentEventMonitor`, `useEventMonitorFilePreview` (opener), `useMobileNavigation` (phone navigation), `MobileFiles`/`MobileFileViewer`.

## Ownership Map

- `AgentEventMonitor`: the tap, its lifecycle (`isLive`, `isOriginCurrent`), and the capabilities taken from its component context (`revealTool`, and now the phone navigation).
- Opener: the open sequence (locate, check origin, open). Takes no capability from a component context itself.
- Phone navigation: the phone's screen state (route query); unchanged.

## Thin Entry Facades / Public Wrappers (If Applicable)

N/A — none.

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Notes |
| --- | --- | --- | --- |
| `useEventMonitorFilePreview.ts:28` `const mobileNavigation = isMobileRemoteAccessRuntime() ? useMobileNavigation() : null;` and the import at l.12 | The navigation arrives in options | `AgentEventMonitor.vue` setup | `isMobileRemoteAccessRuntime` import stays (used at l.67) |
| `vi.mock('~/composables/mobile/useMobileNavigation', …)` in `useEventMonitorFilePreview.spec.ts:42-43` and `useEventMonitorFilePreview.mobileBoundary.spec.ts:10` | The opener no longer imports it; the doubles move into the `mobileNavigation` option | Same test files | Doubles of an unimported module are dead (Principle 7) |

## Return Or Event Spine(s) (If Applicable)

- The opener's result returns to `handleFilePathAction`, which sets `filePreviewStatus` (`AgentEventMonitor.vue:103`). Unchanged.

## Bounded Local / Internal Spines (If Applicable)

N/A.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Path mapping (`absoluteWorkspacePathMapping.ts`) | DS-001 | Opener | Keeps the phone inside the run's workspace | QR-001 | — (unchanged) |

## Ownership Boundaries

The mounted component owns everything that depends on its injection context (route, router, provided tool reveal). Code that runs later, such as a lazily loaded opener, receives those as values and never calls `inject`-based composables itself.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `AgentEventMonitor` setup | `useWorkspaceToolReveal()`, `useMobileNavigation()` | The opener (receives values) | The opener calling `useMobileNavigation()` / `useRoute()` itself | Add an option, as here |

## Dependency Rules

- `AgentEventMonitor.vue` may import `useMobileNavigation` and `isMobileRemoteAccessRuntime`.
- `useEventMonitorFilePreview.ts` must not import `useMobileNavigation` (or any `inject`-based composable); it may import the type only.
- `useMobileNavigation.ts` unchanged.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `useEventMonitorFilePreview(options: { revealTool: WorkspaceToolReveal \| null; mobileNavigation: MobileFileNavigation \| null; isOriginCurrent: () => boolean })` | One tapped file's open | Open on desktop or phone | `AbsoluteFilePathAction` (unchanged) | `mobileNavigation` is required in the type (explicit `null` on the desktop), like `revealTool` |
| `type MobileFileNavigation = Pick<ReturnType<typeof useMobileNavigation>, 'openFile'>` | — | What the opener needs from the phone navigation | `{ workspaceId, path }` (unchanged) | Exported from `useMobileNavigation.ts`, its owner |

## Interface Boundary Check

| Interface | Responsibility Is Singular? | Identity Shape Is Explicit? | Ambiguous Selector Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| opener options | Yes | Yes | Low | — |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? | Same Meaning And Name Everywhere It Appears, Per The Glossary? | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- | --- |
| Option | `mobileNavigation` (same name as today's local at l.28) | Yes | Yes | Low | — |
| Type | `MobileFileNavigation` | Yes | Yes | Low | — |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Pass a context-bound capability to a lazy action | `revealTool` capture pattern | Reuse | Same shape, same component | — |
| Phone Files screen entry | `useMobileNavigation.openFile` | Reuse | — | — |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision | Notes |
| --- | --- | --- | --- | --- | --- |
| Conversation view (`components/workspace/agent`) | Tap, captured capabilities | DS-001, DS-002 | — | Extend | — |
| File preview (`composables/useEventMonitorFilePreview.ts`) | Open sequence | DS-001, DS-002 | — | Extend (option) | — |
| Phone navigation (`composables/mobile`) | Screen state | DS-001 | — | Reuse (+ exported type) | — |

## Draft File Responsibility Mapping

See Final File Responsibility Mapping; no extraction step applies.

## Reusable Owned Structures Check

N/A — no repeated structure.

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Parallel / Overlapping Representation Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `MobileFileNavigation` (`Pick<…,'openFile'>`) | Yes | Yes | Low | — |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/components/workspace/agent/AgentEventMonitor.vue` | Conversation view | Tap owner | Capture `mobileNavigation` in setup (`isMobileRemoteAccessRuntime() ? useMobileNavigation() : null`, next to `revealTool`); pass it at l.101 | Existing | — |
| `autobyteus-web/composables/useEventMonitorFilePreview.ts` | File preview | Opener | Take `mobileNavigation` from options; remove the own call and import | Existing | `MobileFileNavigation` |
| `autobyteus-web/composables/mobile/useMobileNavigation.ts` | Phone navigation | — | Export `MobileFileNavigation` type | Its owner | — |
| `autobyteus-web/composables/__tests__/useEventMonitorFilePreview.spec.ts`, `useEventMonitorFilePreview.mobileBoundary.spec.ts` | Tests | — | Pass the double through the option; drop the module mock | Existing | — |
| `autobyteus-web/components/layout/__tests__/RightSideTabs.workspaceTarget.spec.ts`, `WorkspaceToolShell.spec.ts` | Tests | — | Pass `mobileNavigation: null` (type) | Existing | — |
| `autobyteus-web/components/workspace/agent/__tests__/AgentEventMonitor.spec.ts` | Tests | — | Assert `mobileNavigation` is passed (`null` off the phone) | Existing | — |
| New: `autobyteus-web/components/workspace/agent/__tests__/AgentEventMonitor.mobileFileOpen.spec.ts` | Tests | — | AC-002: real router, real `useMobileNavigation`, real opener; `AgentEventMonitor` mounted in the phone runtime; the feed emits a file action; route becomes the Files screen; no `inject()` warning | One regression concern | Starts from the probe |
| `autobyteus-web/tests/e2e/mobile-shell-probe.mjs` | Browser probe | — | AC-001/AC-003 case (API/E2E engineer) | Existing probe owns phone journeys | — |
| `docs/design-cases.md` | Design cases | Solution Designer | "Again in autobyteus-427" under Case 2 | Existing | — |
| `TESTING.md` | Testing guideline | API/E2E engineer | The rule that would have caught it | Existing | — |

## Applied Patterns (If Any)

- Capability captured in setup and passed to a lazily created action (the file's existing `revealTool` pattern).

## Target Subsystem / Folder / File Mapping

As in the Final File Responsibility Mapping; no new folder, no move.

## Folder Boundary Check

N/A — no folder change.

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Context-bound capability for a lazy action | `// AgentEventMonitor setup` `const revealTool = useWorkspaceToolReveal();` `const mobileNavigation = isMobileRemoteAccessRuntime() ? useMobileNavigation() : null;` … `useEventMonitorFilePreview({ revealTool, mobileNavigation, isOriginCurrent })` | `// inside the lazily created opener` `const mobileNavigation = useMobileNavigation(); // inject() outside setup → route undefined` | The bad shape passes every test that doubles `useMobileNavigation` and fails on every real phone |
| Calling it from a non-mounted helper | Do not wrap the opener in `app.runWithContext` | — | That was only the investigation's control; it hides the dependency instead of naming it |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep the opener's own `useMobileNavigation()` as a fallback when the option is absent | "Safety" | Rejected | The option is required; the own call is removed |
| Switch `useMobileNavigation` to Nuxt's `useRoute`/`useRouter` (work outside setup) | Would also fix it | Rejected | Changes a correct setup-only owner and hides the dependency; the phone screens all use it in setup |

## Derived Layering (If Useful)

N/A.

## Change / Refactor Sequence

1. Start from the probe (R-01 command); it fails.
2. Export `MobileFileNavigation` from `useMobileNavigation.ts`.
3. Add the `mobileNavigation` option to the opener; remove its own call and import.
4. Capture it in `AgentEventMonitor` setup and pass it.
5. Update the existing specs (option instead of module mock; `mobileNavigation` in `AgentEventMonitor.spec.ts`; `null` in the two layout specs).
6. Add `AgentEventMonitor.mobileFileOpen.spec.ts` (AC-002) from the probe; it passes. Do not commit the probe itself.
7. Run the web unit suites touched and `pnpm -C autobyteus-web typecheck`.

## Key Tradeoffs

- Capability in options vs. Nuxt router composables: options keep the phone navigation's owner unchanged and the dependency visible, matching `revealTool`.

## Risks

- Low. A future second phone capability taken late would fail the same way; the TESTING.md rule and the real-router spec guard the shape.

## Guidance For Implementation

- Reproduction to start from: `tickets/in-progress/phone-message-file-reference-open/probes/probe427.mobileFileOpen.spec.ts`; command: `cp` it to `autobyteus-web/composables/__tests__/` and `pnpm -C autobyteus-web exec vitest run composables/__tests__/probe427.mobileFileOpen.spec.ts --no-watch`. Its first case fails today. After the fix, the opener takes the navigation from options, so the probe's first case no longer compiles as written; the shipped regression is the new `AgentEventMonitor.mobileFileOpen.spec.ts`, which must fail on the base commit and pass after the fix. Record both runs.
- Validation for API/E2E: `mobile-shell-probe` gets a case: on a Team member's (or the Team lead's) conversation on the phone, a message naming a workspace file by absolute path; tap → `mobile-file-viewer` shows its text; URL `screen=files`; Back returns to the conversation. Also a path outside the workspace → no navigation, status line (AC-003). Desktop `event-monitor-file-preview-probe` stays green (AC-004). Test data is synthetic; no private data.
- TESTING.md (API/E2E engineer, `project-documents.md` "When a later stage catches a problem"): add the rule that would have caught it, for example: "A test of an action that runs after setup (an event handler, a lazy import) uses the real router and provide/inject, not a double of a composable that calls `inject`; and every phone action that the desktop also offers has a browser case on the phone bundle."
