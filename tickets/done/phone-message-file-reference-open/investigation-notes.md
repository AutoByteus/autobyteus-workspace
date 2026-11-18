# Investigation Notes

## Investigation Meta

- Package identifier: `phone-message-file-reference-open` (Project Task `autobyteus-427`)
- Request / ticket: autobyteus-427
- Workspace root: `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-message-file-reference-open`
- Repository mode: `Git`
- Task worktree / branch: the path above, branch `codex/phone-message-file-reference-open`
- Resolved base remote / branch / revision: `origin/personal` @ `6225a734a3a7e76e7d75f8d937fec78295b681f8` (fetched 2026-11-07)
- Finalization target remote / branch: `origin` / `personal` (RELEASE.md)
- Bootstrap result: worktree created from the fresh `origin/personal`; `pnpm install --frozen-lockfile` and `pnpm -C autobyteus-web exec nuxt prepare` passed
- Bootstrap blocker: none
- Current solution revision ID: `SR-001`
- Authorities read (requirements reading gate): `references/requirements-engineering.md`, `references/finding-the-cause.md`, `references/ticket-scope.md` (2026-11-07). Design gate: `references/architecture-design.md`, `references/design-principles.md`, `DESIGN.md`, `docs/design-cases.md` Cases 1–2 and 16, `references/project-documents.md` (2026-11-07)
- Investigation status: complete; cause reproduced

## Initial Request And Clarifications

- Original request: the Task text (autobyteus-427), user's words: "on the desktop when I click the draft v3, I could open the file, but on the phone, when I click it, it does not open on the phone, weird … I don't know whether it's on purpose or it's a bug."
- Clarifications received: none needed (DEC-002 in the requirements)
- User-supplied facts and constraints: desktop screenshot (`user-desktop-screenshot.png`): Marketing Team, member `marketing_content_creator`, message "Draft Copy: `draft-v3.txt`" (code-style, underlined), Files tab showing `draft-v3.txt`. The phone runs the beta.7 Android app.
- Initial ambiguity: whether the phone is meant to open such a reference. Resolved: yes (277 DS-008).

## Product And Domain Understanding

- Product area: the phone shell (`/mobile`, loaded in the Android WebView) and the shared conversation view.
- Affected actors or systems: the user on the phone.
- Existing user or operational purpose: read files agents write, from the conversation.
- Relevant terminology: "file action" = a clickable file path in a rendered message (`AbsoluteFilePathAction`); "phone runtime" = `isMobileRemoteAccessRuntime()`.

## Source Log

| ID | Date | Source Type | Exact Source / Command / Query | Why Consulted | Relevant Finding | Follow-Up |
| --- | --- | --- | --- | --- | --- | --- |
| S-01 | 2026-11-07 | Doc | `autobyteus-android/README.md` | What the phone app is | A WebView shell of the node's `/mobile` page; no native message rendering | — |
| S-02 | 2026-11-07 | Code | `autobyteus-web/components/mobile/runScreen/MobileRunTargetView.vue:26-41` | How the phone shows a conversation | It mounts the shared `AgentEventMonitor`, the same view as the desktop | — |
| S-03 | 2026-11-07 | Code | `autobyteus-web/components/workspace/agent/AgentEventMonitor.vue:17-18, 81, 93-104` | Tap handling | File actions are on (`:enable-event-monitor-file-actions="true"`). `revealTool` is captured in setup (l.81). The handler awaits a dynamic import (l.99), then creates the opener (l.101) | — |
| S-04 | 2026-11-07 | Code | `autobyteus-web/composables/useMarkdownSegments.ts:195-357`; `utils/eventMonitorFilePaths/absoluteFilePathAction.ts` | What is clickable | Absolute paths only: Markdown link destinations (`/…`, `C:\…`, `file://`), inline code, prose, fenced code. Relative names are not clickable on either surface | ASM-001 |
| S-05 | 2026-11-07 | Code | `autobyteus-web/composables/useEventMonitorFilePreview.ts:22-28, 45-61, 64-69` | The opener | In the phone runtime it calls `useMobileNavigation()` at creation (l.28), then `openMobilePath` maps the path into the open run's workspace and calls `mobileNavigation.openFile` (l.60). Desktop: `fileExplorerStore.openFilePreview` + `revealTool('files')` | — |
| S-06 | 2026-11-07 | Code | `autobyteus-web/composables/mobile/useMobileNavigation.ts:27-29, 94-95` | Phone navigation | Calls vue-router `useRoute()` / `useRouter()` (Vue `inject`) when created; `openFile` reads `route.query` and pushes `screen=files&workspace&file` | — |
| S-07 | 2026-11-07 | Code | `autobyteus-web/composables/__tests__/useEventMonitorFilePreview.mobileBoundary.spec.ts:10`, `useEventMonitorFilePreview.spec.ts:42-43`, `components/workspace/agent/__tests__/AgentEventMonitor.spec.ts:9-10` | Why tests pass | Every test doubles `useMobileNavigation` or the whole opener, so the injection context never matters | Reproduction R-01 |
| S-08 | 2026-11-07 | Code | `autobyteus-web/tests/e2e/mobile-shell-probe.mjs:54-56, 1130-1142` | Browser coverage | MSP-08 opens a file from the Files tree and from a Messages reference; no case taps a file path inside the conversation | AC-001 |
| S-09 | 2026-11-07 | Code | grep `useMobileNavigation()` over `autobyteus-web` (non-test) | Other late callers | Callers: `useEventMonitorFilePreview.ts:28` (late), `useMobileRunOpening.ts:39`, `MobileRunScreen.vue:34`, `MobilePairedShell.vue:84`, `MobileFiles.vue:94`, `MobileMessages.vue:60`, `MobileNodeDesktop.vue:132`. All but the first run in setup | — |
| S-10 | 2026-11-07 | Code | `autobyteus-web/composables/workspace/useTargetConversation.ts:25-29`; `AgentEventMonitor.vue:23-32` | What the user sees on failure | The status line shows only when the conversation is not read-only | FU-001 |
| S-11 | 2026-11-07 | Data | `~/.autobyteus/server-data/memory` (search for "draft-v3.txt" / "Draft Copy" in team runs) | The user's raw message | Not on this machine: the run is on a node. No user data was copied | ASM-001 |
| S-12 | 2026-11-07 | Code | `autobyteus-web/localization/messages/en/workspace.ts:106-111` | Status texts | "Open {{file}} in Files", "This file is available only on the host workspace.", "The file preview could not be opened." | — |

## Relevant Existing Behavior And Supported Product Paths

| Behavior ID | Kind | Supported Trigger Or Governing Contract | Current Supported Product Behavior Path / Lifecycle | Current Outcome / Invariants | Evidence | Confidence / Unknown |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | Tap a file link in a phone conversation (277 DS-008) | `MobileRunTargetView` → `AgentEventMonitor` → `MarkdownRenderer` emits `file-path-action` → `handleFilePathAction` → `await import` → `useEventMonitorFilePreview(...)` → `useMobileNavigation()` outside setup → `openMobilePath` → `openFile` throws | `failed`; the Files screen never opens; status "The file preview could not be opened." when writable, nothing when read-only | S-02, S-03, S-05, S-06, R-01 | High (Reproduced) |
| BEH-002 | User | Same, path outside the workspace or remote run | Same up to `openMobilePath` / remote check | `unavailable` / remote status | S-05, boundary spec | High (Read; spec) |
| BEH-003 | User | Desktop click | `AgentEventMonitor` → opener with captured `revealTool` → Files tab | Opens | S-03, S-05; user's screenshot | High |

## Relevant Codebase And Technical Facts

| Path / Component / Contract | Current Responsibility Or Behavior | Requirement Implication | Architecture Question / Design Implication |
| --- | --- | --- | --- |
| `AgentEventMonitor.vue` | Owns the tap; lazily loads the opener; captures `revealTool` in setup (l.81) | Tap path shared by desktop and phone | The phone's navigation can be captured the same way |
| `useEventMonitorFilePreview.ts` | Opener: locate, check the origin is current, open, reveal | Must open on the phone | Its creation happens outside setup; it must not call setup-only composables |
| `useMobileNavigation.ts` | The phone's screen state (route query), setup-only (vue-router `inject`) | Opens the Files screen entry | Unchanged |
| `useWorkspaceToolReveal.ts:9-12` | Comment: "Capture in descendant setup; lazy action handlers receive this local capability explicitly." | — | The established pattern for exactly this case |

## Structural And Payload Surface Inventory

### Payload Or Content Surfaces

- None.

### Structural Surfaces

- Shared conversation view `AgentEventMonitor.vue` and the opener `useEventMonitorFilePreview.ts` (options interface). No route, API, persistence, server or security change.

### Potential Structural Impacts To Investigate

- API or external-contract change: no
- Persistence schema or invariant change: no
- Security or privacy boundary change: no (the path mapping and the server checks are unchanged)
- Concurrency or lifecycle change: no (origin checks unchanged)
- Deployment, migration, ownership-boundary, architectural-pattern, or structural-refactoring change: no
- Confirmed absent.

## Runtime, Probe, Or Reproduction Findings

| ID | Method / Command | Scenario | Observation | Established | Requirement Implication | Artifact / Evidence Path |
| --- | --- | --- | --- | --- | --- | --- |
| R-01 | `cp tickets/in-progress/phone-message-file-reference-open/probes/probe427.mobileFileOpen.spec.ts autobyteus-web/composables/__tests__/ && pnpm -C autobyteus-web exec vitest run composables/__tests__/probe427.mobileFileOpen.spec.ts --no-watch` (Vitest `nuxt` environment; real Vue, real vue-router memory router, real `useEventMonitorFilePreview` and `useMobileNavigation`; doubled: phone-runtime flag, Apollo, active target store) | A click handler awaits the dynamic import, then opens `/owned/B/draft-v3.txt` in workspace `/owned/B`, as `AgentEventMonitor` does | `[Vue warn]: inject() can only be used inside setup() or functional components.` ×2; `[EventMonitorFilePreview] File preview failed. TypeError: Cannot read properties of undefined (reading 'query') at openMobilePath (useEventMonitorFilePreview.ts:60)`; result `failed`; route stays `/mobile?screen=run` | `Reproduced` | BEH-001 is a bug | probe file |
| R-02 | Same file, control case | Same tap, opener created inside `app.runWithContext` | Result `opened`, route `/mobile?screen=files&workspace=B&file=draft-v3.txt` | `Reproduced` | The cause is the missing injection context only; the rest of the phone path works | probe file |

- Paths run: R-01/R-02 above. Paths only read: the Android WebView shell, the server's file routes (not involved: the failure is before any request), the phone Files viewer (covered by MSP-08).
- Temporary diagnostics: none. The probe was written in `autobyteus-web/composables/__tests__/` to run, then moved to the ticket folder; nothing is left in the source tree.
- Reproduction for implementation to start from: `probes/probe427.mobileFileOpen.spec.ts`, command R-01. Its first case fails today; the fix makes the shipped regression test (AC-002) pass, written from it. The probe itself is not committed into the source tree.

## Stakeholder And User Evidence

| Source / Actor | Need, Problem, Or Constraint | Evidence Strength | Requirement Implication | Open Question |
| --- | --- | --- | --- | --- |
| User (Task text, screenshot) | The phone tap does nothing | Direct report | REQ-001 | None |

## External Contracts, Standards, And Dependencies

| Contract / Dependency | Version / Authority | Relevant Behavior Or Constraint | Evidence | Unknown / Risk |
| --- | --- | --- | --- | --- |
| Vue `inject` | vue ^3.5.44 | Works only in setup, a functional component, or `app.runWithContext` | R-01, R-02 | None |
| vue-router `useRoute` / `useRouter` | ^4.6.4 | Plain `inject` of the router keys | R-01 | None |
| autobyteus-277 DS-008 | Delivered phone design | Phone opens a conversation file on its Files screen | S-05 comment l.26-27, l.44 | None |
| autobyteus-403 | Delivered | Phone credentials reach only phone routes | Task constraint | Unchanged |

## Persisted Data And State Facts

- Not affected.

## Product Design Request Context

- Product Design request in the current input: `Not stated`. The governing design (277) is delivered and approved; no new design is needed.

## Product Design Findings

- N/A — no new Product Design work.

## Supplemental Artifact Inventory

| Artifact Path | Owner | Purpose | Scope | Related Requirement / AC IDs | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- | --- | --- |
| `probes/probe427.mobileFileOpen.spec.ts` | Solution Designer | Reproduction and control | BEH-001 | REQ-001, REQ-004, AC-002 | Current | Evidence only |
| `user-desktop-screenshot.png` | User (copied from the Task context) | What the user saw on the desktop | SCN-003 | — | Current | Evidence only |
| `follow-ups.md` | All roles | Findings outside this ticket | — | — | Current | — |

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Why It Matters | Resolution / Owner | Status |
| --- | --- | --- | --- | --- | --- |
| U-01 | Unknown | The exact path in the user's message (inside or outside the run's workspace) | Decides whether, after the fix, his tap opens the file or shows the status line | Not needed for the fix (ASM-001); the browser case reproduces a file inside the workspace of a Team member | Accepted |

## Architecture Investigation Findings

- Entry point and lifecycle: the tap's handler (`AgentEventMonitor.vue:93-104`) runs after setup; the dynamic import (l.99) keeps the opener out of the conversation's initial bundle on purpose (comment l.95-96). Anything the opener needs from the component's injection context must be captured in setup and passed in, as `revealTool` already is (l.81, l.101; `useWorkspaceToolReveal.ts` comment).
- Root cause: the phone's navigation is a setup-only capability, acquired by the opener when it is created late (S-05 l.28). Two paths serve one capability (desktop open, phone open); the desktop path receives its capability from setup, the phone path takes its own (Principle 1, several forms; `docs/design-cases.md` Case 2).
- Only this late caller exists (S-09).
- No server or file-route involvement: the failure happens before any request, and MSP-08 shows the phone reads workspace files through the Files viewer.

## Requirement Implications

- The behavior is specified (DS-008) and broken: a bug (DEC-001). No widening of reads (REQ-002). Coverage gap at both test levels (REQ-004).

## Notes For Architecture Design

- Map SCN-001 to: `AgentEventMonitor` setup captures the phone navigation → handler → opener with the captured navigation → `openFile` → Files screen → `MobileFileViewer`.
- Keep the dynamic import and the origin checks.
- The stage that let the bug through: tests doubled the router-bound navigation, and no browser case tapped a conversation file on the phone. A TESTING.md rule (owner: API/E2E engineer) is the check (`project-documents.md`, "When a later stage catches a problem").
