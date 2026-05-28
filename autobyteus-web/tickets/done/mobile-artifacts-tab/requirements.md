# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Design-ready

## Goal / Problem Statement

Add a dedicated mobile **Artifacts** surface to the `/mobile` Phone Access work shell so phone users can inspect files and generated outputs produced or touched by the current run. Desktop already exposes this capability through the right-side `Artifacts` tab, but the mobile work shell currently exposes only Chat, Runs, Files, Tools, and Activity. Without mobile Artifacts, generated files/images/audio/video/PDF/CSV/Excel outputs are not discoverable from phone unless they happen to be easy to find manually in workspace Files.

Browser parity was analyzed as part of the request. The current Browser tab is Electron-owned and depends on `window.electronAPI` plus native Electron `WebContentsView` projection. A mobile Browser tab is therefore out of scope for this change; adding one would require a separate remote-browser/snapshot/native-WebView design, not a simple mobile tab addition.

## Investigation Findings

- `types/mobileWork.ts` defines `MobileTaskTab` as only `'chat' | 'runs' | 'files' | 'tools' | 'activity'`.
- `components/mobile/MobileWorkShell.vue` hardcodes a five-item bottom navigation and renders only `MobileChat`, `MobileRuns`, `MobileFiles`, `MobileTools`, or `MobileActivity`.
- Desktop Artifacts are a UI surface over existing run-file-change state, not Electron-only infrastructure:
  - `stores/runFileChangesStore.ts` owns run-scoped artifact rows.
  - `services/agentStreaming/handlers/fileChangeHandler.ts` applies live `FILE_CHANGE` payloads.
  - `services/runHydration/runContextHydrationService.ts` hydrates agent run file changes through `GetRunFileChanges`.
  - `components/workspace/agent/ArtifactsTab.vue` lists artifacts for `activeContextStore.activeAgentContext?.state.runId`.
  - `components/workspace/agent/ArtifactContentViewer.vue` fetches content through `/rest/runs/:runId/file-change-content` using `authorizedFetch`, which is compatible with mobile remote access credentials.
- Mobile Activity already resolves a run id for agent runs and focused team-member runs, but the same run-id resolution is duplicated in `MobileActivityDigest.vue` and `MobileToolActivityList.vue`. Adding Artifacts should extract this policy into a mobile-owned composable instead of duplicating it a third time.
- Browser is not mobile-feasible under the current Browser tab implementation because `browserShellStore.ts` requires Electron preload APIs and `docs/browser_sessions.md` documents Electron main as the owner of native browser surface creation/projection.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Feature / mobile parity bug fix
- Initial design issue signal (`Yes`/`No`/`Unclear`): Yes
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Duplicated Policy Or Coordination
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Likely Needed
- Evidence basis: Mobile has no artifact tab while desktop artifact infrastructure is already reusable. The active/focused agent run id needed by Artifacts is currently duplicated in two mobile activity components and would be duplicated again if added locally.
- Requirement or scope impact: Add a dedicated mobile Artifacts tab and extract shared mobile focused-run identity resolution for Activity/Tools/Artifacts. Do not add Browser to mobile in this change.

## Recommendations

- Add `artifacts` as a dedicated `MobileTaskTab` and bottom-nav item in `MobileWorkShell.vue`.
- Add a new `MobileArtifacts.vue` component that presents a phone-first artifact list and preview surface while reusing the existing artifact store/viewer/content-fetching owners.
- Extract mobile active/focused run identity resolution into a composable under `composables/mobile/` and reuse it from existing mobile activity/tool components plus the new Artifacts component.
- Update mobile feature gating/docs to acknowledge run Artifacts as mobile-supported and Browser as Electron-only/out-of-scope.
- Add focused component/composable tests for artifact tab rendering, run-id scoping, empty state, selection/refresh behavior, and Browser non-support documentation/gating.

## Scope Classification (`Small`/`Medium`/`Large`)

Medium

## In-Scope Use Cases

- UC-MART-001: A phone user with an active or reopened agent run opens the mobile Artifacts tab and sees the run's generated/touched artifacts.
- UC-MART-002: A phone user selects an artifact and previews its content using the existing artifact content viewer behavior, including text and media artifact types already supported by desktop.
- UC-MART-003: A phone user in a team run sees artifacts for the currently focused leaf agent member and can switch focus with the existing mobile team focus control.
- UC-MART-004: A phone user opens Artifacts before any run context is selected or before artifacts exist and receives a clear mobile empty state.
- UC-MART-005: The mobile feature set explicitly excludes the Electron Browser tab while retaining existing desktop Browser behavior unchanged.

## Out of Scope

- Implementing a mobile Browser tab or remote browser surface.
- Changing the server artifact/file-change persistence contract.
- Changing desktop `RightSideTabs.vue`, desktop `ArtifactsTab.vue`, or desktop Browser behavior except where shared tests/documentation require no-regression assertions.
- Changing team communication reference-file ownership. Inter-agent `reference_files` remain Team Communication references, not Agent Artifacts.
- Solving any pre-existing gap where historical team-member file changes are not hydrated by `GetTeamMemberRunProjection`; the mobile Artifacts tab should match the current focused-member run-id semantics and can show an empty state when the shared store has no rows.
- Adding offline caching or service-worker behavior for artifact content.

## Functional Requirements

- REQ-MART-001: The mobile work shell must include a dedicated `Artifacts` task tab reachable from the bottom navigation.
- REQ-MART-002: The mobile Artifacts tab must list artifacts from `runFileChangesStore.getArtifactsForRun(runId)` for the mobile-selected active/focused agent run id.
- REQ-MART-003: For an agent-run mobile context, the artifact run id must resolve only when the mobile selection still points to the same agent run and the active agent context matches that run.
- REQ-MART-004: For a team-run mobile context, the artifact run id must resolve to the currently focused leaf member's `activeContextStore.activeAgentContext?.state.runId` only when the selected team run and focused route key match the mobile context.
- REQ-MART-005: Mobile Artifacts must use existing artifact identity and content resolution shapes (`ArtifactViewerItem`, `toAgentArtifactViewerItem`, `ArtifactContentViewer`, `/rest/runs/:runId/file-change-content`) instead of creating a parallel artifact model.
- REQ-MART-006: Mobile Artifacts must have phone-first layout, not the desktop two-column resizable `ArtifactsTab.vue` layout.
- REQ-MART-007: Mobile Artifacts must handle no context, no run id, no artifacts, pending/failed artifacts, and deleted/unavailable content with explicit visible states inherited from or aligned with the current artifact viewer.
- REQ-MART-008: Live and hydrated artifact rows must remain owned by existing run-file-change ingestion/hydration; the mobile component must be read-only with respect to artifact store mutation except for local selection state.
- REQ-MART-009: The existing mobile Activity and tool-history components must reuse the extracted mobile focused-run identity composable instead of retaining duplicated run-id resolution logic.
- REQ-MART-010: The current Electron Browser tab must not be exposed as a mobile tab. Documentation/gating must make the non-support reason explicit.

## Acceptance Criteria

- AC-MART-001: In `MobileWorkShell.vue`, the bottom navigation contains a visible `Artifacts` tab and selecting it renders `MobileArtifacts.vue`.
- AC-MART-002: Given an active agent mobile context and seeded `runFileChangesStore` rows for that run, `MobileArtifacts.vue` renders those rows sorted newest first.
- AC-MART-003: Selecting an artifact in mobile shows the existing artifact viewer for that artifact and supports re-select refresh behavior or equivalent local refresh signaling.
- AC-MART-004: Given a team-run mobile context, changing the mobile focused member updates the artifact run-id source so the Artifacts tab reflects the focused member's artifact rows.
- AC-MART-005: Given no selected run context or no resolved run id, the Artifacts tab shows a clear mobile empty/choose-work state instead of leaking stale artifacts from another run.
- AC-MART-006: Given an artifact with media or non-text type, mobile preview delegates to the existing viewer/content-fetching path rather than trying to browse workspace files manually.
- AC-MART-007: Existing Activity tool-history behavior remains unchanged after extracting run-id resolution, proven by current mobile Activity tests plus new composable coverage.
- AC-MART-008: Mobile source guard tests continue to show mobile components do not import `RightSideTabs.vue` or desktop shell layout components.
- AC-MART-009: Browser does not appear in mobile bottom navigation, and docs/tests record that Browser remains Electron-only in the current implementation.
- AC-MART-010: Targeted tests for mobile components/composables pass.

## Constraints / Dependencies

- The mobile shell runs in browser/PWA/Android WebView contexts and must not call `window.electronAPI`.
- Artifact content loading must continue to use authenticated mobile remote-access fetch behavior through `authorizedFetch`.
- Desktop Artifacts and Browser must keep their current behavior.
- The change must preserve fixed-height mobile shell containment (`h-screen`, `h-[100dvh]`, `min-h-0`, `overflow-hidden`) so adding a sixth task tab does not reintroduce document/body scrolling.
- Team Communication reference files remain separate from Agent Artifacts by design.

## Assumptions

- The user prefers a dedicated mobile Artifacts tab over nesting Artifacts under Files.
- Existing artifact content viewer support for text/media/PDF/CSV/Excel is sufficient for the first mobile Artifacts release.
- A six-item bottom nav is acceptable if styled compactly and tested on phone-sized layout assumptions.
- Historical team-member artifact hydration gaps, if any, are separate from adding the mobile surface and should be handled in a follow-up if parity evidence requires it.

## Risks / Open Questions

- Six bottom navigation items may be visually tight on narrow phones; implementation should keep labels compact and test presence/containment.
- `ArtifactContentViewer.vue` was designed for desktop panel use. Mobile can reuse it, but the wrapper must avoid the desktop resizable split layout and should verify the viewer fills a phone-sized panel cleanly.
- Historical team-run member file changes may remain unavailable if the current team-member projection query does not hydrate them; this is an existing cross-surface issue and should not block active/live mobile artifact support.

## Requirement-To-Use-Case Coverage

| Requirement | Covered Use Case(s) |
| --- | --- |
| REQ-MART-001 | UC-MART-001, UC-MART-004 |
| REQ-MART-002 | UC-MART-001, UC-MART-003 |
| REQ-MART-003 | UC-MART-001 |
| REQ-MART-004 | UC-MART-003 |
| REQ-MART-005 | UC-MART-002 |
| REQ-MART-006 | UC-MART-001, UC-MART-002 |
| REQ-MART-007 | UC-MART-004 |
| REQ-MART-008 | UC-MART-001, UC-MART-002, UC-MART-003 |
| REQ-MART-009 | UC-MART-001, UC-MART-003 |
| REQ-MART-010 | UC-MART-005 |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criteria | Scenario Intent |
| --- | --- |
| AC-MART-001 | Navigation presence and component routing |
| AC-MART-002 | Agent-run artifact list visibility |
| AC-MART-003 | Artifact selection and viewer refresh behavior |
| AC-MART-004 | Team focused-member artifact scoping |
| AC-MART-005 | Stale-artifact isolation / empty states |
| AC-MART-006 | Existing viewer/content-fetch reuse for generated outputs |
| AC-MART-007 | Refactor no-regression for Activity/Tools run-id policy |
| AC-MART-008 | Mobile shell remains independent from desktop right-panel layout |
| AC-MART-009 | Browser out-of-scope/non-support clarity |
| AC-MART-010 | Executable validation scope |

## Approval Status

Approved by user direction on 2026-05-22: user agreed that a dedicated mobile Artifacts surface is acceptable and requested the work. Browser is analyzed and explicitly excluded from this implementation scope because the current Browser tab is Electron-owned.
