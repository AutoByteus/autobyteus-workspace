# Investigation Notes

## Investigation Status

- Bootstrap Status: Complete
- Current Status: Investigation complete; design-ready requirements prepared
- Investigation Goal: Determine how to add dedicated mobile Artifacts and whether Browser can be mobile-supported.
- Scope Classification (`Small`/`Medium`/`Large`): Medium
- Scope Classification Rationale: Adds a mobile surface over existing artifact data/viewer infrastructure, with navigation/types/tests/docs updates and a small refactor to avoid duplicated mobile focused-run identity policy. Browser is analysis-only and explicitly out of implementation scope.
- Scope Summary: Mobile `/mobile` work shell should expose run-scoped generated/touched artifacts through a dedicated phone-first tab. Existing Electron Browser tab should remain desktop-only.
- Primary Questions To Resolve:
  - Which current owners provide artifact data and previewing?
  - Should mobile use a dedicated bottom tab or nest under Files?
  - What run identity should mobile Artifacts use for agent runs and focused team members?
  - Is Browser available in mobile runtime, or Electron-only?

## Request Context

User observed that desktop right-side tabs include Artifacts while mobile lacks it. User confirmed a dedicated mobile Artifacts surface is acceptable and requested work. User also asked whether Browser can be mobile-supported; initial suspicion was Browser is Electron-provided. Investigation confirmed Artifacts is server/store-backed and mobile-feasible, while Browser is Electron-owned and out of scope for the current mobile shell.

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/mobile-artifacts-tab`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/mobile-artifacts-tab/autobyteus-web/tickets/done/mobile-artifacts-tab`
- Current Branch: `codex/mobile-artifacts-tab`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/mobile-artifacts-tab`
- Bootstrap Base Branch: `origin/personal`
- Remote Refresh Result: `git fetch origin` completed successfully on 2026-05-22.
- Task Branch: `codex/mobile-artifacts-tab` tracking `origin/personal`
- Expected Base Branch (if known): `origin/personal`
- Expected Finalization Target (if known): `personal`
- Bootstrap Blockers: None
- Notes For Downstream Agents: Shared checkout `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo` has unrelated untracked `autobyteus-server-ts/tmp-repro-chokidar-spawn-ebadf.mjs`; authoritative work is in the dedicated worktree above.

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-05-22 | Command | `git fetch origin`; `git worktree add -b codex/mobile-artifacts-tab /Users/normy/autobyteus_org/autobyteus-worktrees/mobile-artifacts-tab origin/personal` | Create isolated task branch/worktree from fresh base | Dedicated worktree created successfully at commit `fcf435ec` | No |
| 2026-05-22 | Code | `autobyteus-web/types/mobileWork.ts` | Inspect mobile tab model | `MobileTaskTab` has only `chat`, `runs`, `files`, `tools`, `activity`; no artifact tab identity exists. | Yes: add `artifacts` |
| 2026-05-22 | Code | `autobyteus-web/components/mobile/MobileWorkShell.vue` | Inspect mobile work shell navigation/rendering | Shell renders only five task components and uses a five-column bottom nav. Team focus bar is shown for team-run tabs except `runs` and `tools`, so Artifacts can inherit the focus control if added as a normal work tab. | Yes: render `MobileArtifacts` and update nav |
| 2026-05-22 | Code | `autobyteus-web/components/mobile/MobileTools.vue` | Verify whether Artifacts should be nested under Tools | Tools owns only Terminal/VNC wrappers; adding Artifacts here would mix generated-output inspection with operational tools. | No: use dedicated tab, not Tools |
| 2026-05-22 | Code | `autobyteus-web/components/mobile/MobileActivityDigest.vue`; `autobyteus-web/components/mobile/MobileToolActivityList.vue` | Inspect existing mobile run identity logic | Both components duplicate agent/team focused run-id resolution using selection, active context, and team focus state. | Yes: extract composable before adding third consumer |
| 2026-05-22 | Code | `autobyteus-web/composables/useRightSideTabs.ts`; `autobyteus-web/components/layout/RightSideTabs.vue` | Inspect desktop right-side Artifacts and Browser surfaces | Desktop right tabs include `artifacts` and `browser`; `RightSideTabs` renders desktop `ArtifactsTab` and `BrowserPanel`. | No direct reuse of desktop layout for mobile |
| 2026-05-22 | Code | `autobyteus-web/components/workspace/agent/ArtifactsTab.vue` | Inspect artifact list ownership | Desktop tab gets artifacts from `runFileChangesStore.getArtifactsForRun(activeContextStore.activeAgentContext?.state.runId)` and maps through `toAgentArtifactViewerItem`. | Reuse store/item mapping in mobile |
| 2026-05-22 | Code | `autobyteus-web/components/workspace/agent/ArtifactContentViewer.vue` | Inspect preview/content ownership | Viewer supports live buffered write content, pending/failed states, content fetch via `/rest/runs/:runId/file-change-content`, `authorizedFetch`, media object URLs, and zen mode. | Reuse viewer; wrap in mobile layout |
| 2026-05-22 | Code | `autobyteus-web/stores/runFileChangesStore.ts` | Inspect artifact store authority | Store owns one row per `runId:path`, artifact statuses/types, live upsert, hydration replace/merge, and latest-visible artifact signals. | Reuse; mobile must not create parallel store |
| 2026-05-22 | Code | `autobyteus-web/services/runHydration/runContextHydrationService.ts`; `autobyteus-web/services/runHydration/runFileChangeHydrationService.ts` | Verify historical/live agent artifact hydration | Agent run hydration queries `GetRunFileChanges` and populates `runFileChangesStore`. | Supports mobile Artifacts for agent run contexts |
| 2026-05-22 | Code | `autobyteus-web/services/agentStreaming/handlers/fileChangeHandler.ts` | Verify live artifact ingestion | Live `FILE_CHANGE` payloads upsert into `runFileChangesStore`. | Supports live mobile Artifacts |
| 2026-05-22 | Code | `autobyteus-web/graphql/queries/runHistoryQueries.ts`; `autobyteus-web/services/runHydration/teamRunContextHydrationService.ts`; `autobyteus-web/stores/runHistoryTeamHelpers.ts` | Check team member projection hydration | `GetTeamMemberRunProjection` currently returns conversation/activities, not file changes. Focused team member runtime IDs are still represented by leaf `AgentContext` state. | Note existing historical team artifact hydration gap as out of scope |
| 2026-05-22 | Code | `autobyteus-web/stores/browserShellStore.ts`; `autobyteus-web/components/workspace/tools/BrowserPanel.vue` | Determine Browser mobile feasibility | Browser availability requires `window.electronAPI?.getBrowserShellSnapshot`; UI calls Electron browser IPC methods and syncs host bounds. | Browser tab cannot be added to current mobile shell |
| 2026-05-22 | Doc | `autobyteus-web/docs/browser_sessions.md` | Confirm Browser architecture boundary | Docs say renderer reports host bounds and Electron main attaches native `WebContentsView`; Browser UI is permanent desktop right-side tab. | Browser remains out of scope |
| 2026-05-22 | Code/Doc | `autobyteus-web/utils/mobileFeatureGates.ts`; `autobyteus-web/docs/remote_access.md` | Inspect mobile-supported feature list and docs | Supported mobile features include pairing/server/runs/files/terminal/vnc, but not artifacts. Docs say mobile owns Home, Chat, Runs, Files, Tools, Activity and Tools exposes Terminal/VNC. | Add run artifacts support/docs; do not add Browser |
| 2026-05-22 | Code/Test | `autobyteus-web/components/mobile/__tests__/MobileContextSelectionRegression.spec.ts`; `autobyteus-web/components/mobile/__tests__/MobileRemoteAccessShell.spec.ts`; `autobyteus-web/components/mobile/__tests__/MobileUxRefinement.spec.ts` | Identify test update points | Tests assert non-chat tabs fill viewport, mobile source files avoid desktop shell imports, and Tools/Activity behavior. | Update/add tests for Artifacts tab and source guard list |

## Current Behavior / Current Flow

- Current entrypoint or first observable boundary: `/mobile` renders `MobileRemoteAccessShell`, which renders `MobileWorkShell` once a work context is selected.
- Current execution flow:
  - `MobileRemoteAccessShell.openContext(context, tab?)` selects a `MobileWorkContext`, sets `mobileWorkStore.activeTab`, opens/hydrates the selected run context, and switches to the work screen.
  - `MobileWorkShell` renders one of Chat/Runs/Files/Tools/Activity based on `activeTab`.
  - `MobileTools` provides Terminal/VNC wrappers over existing browser-compatible owners.
  - `MobileActivityDigest` and `MobileToolActivityList` compute a currently active/focused run id to show activity/tool history.
  - No mobile component reads `runFileChangesStore` or renders `ArtifactContentViewer`.
- Ownership or boundary observations:
  - Mobile work navigation is mobile-owned and separate from desktop right-side tabs.
  - Agent artifact state is already owned by `runFileChangesStore` and hydrated/updated by shared run hydration/streaming services.
  - Artifact content preview is already owned by `ArtifactContentViewer` with mobile-compatible `authorizedFetch`.
  - Browser tab lifecycle/surface is owned by Electron Browser shell, not by server/mobile web runtime.
- Current behavior summary: Mobile can chat, browse workspace files, inspect activity, and use Terminal/VNC, but cannot inspect generated/touched run artifacts directly. Desktop can inspect those artifacts through the right-side Artifacts tab.

## Design Health Assessment Evidence

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Feature / mobile parity bug fix
- Candidate root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Duplicated Policy Or Coordination
- Refactor posture evidence summary: A small refactor is needed now to avoid a third local copy of mobile focused-run identity resolution.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| `MobileActivityDigest.vue` | Computes run id by checking agent selection/active context or team selection/focused member state. | This is policy, not presentation-only logic. | Extract reusable composable. |
| `MobileToolActivityList.vue` | Duplicates nearly identical run-id computation. | Adding Artifacts would duplicate policy a third time. | Reuse composable from existing and new consumers. |
| `ArtifactsTab.vue` | Desktop artifact display depends on active agent context run id. | Mobile can use same identity subject but should not import desktop layout. | New mobile component over same store/viewer. |
| `browserShellStore.ts` | Requires Electron preload browser APIs. | Browser is a hard runtime-boundary issue, not just missing UI. | Keep Browser out of mobile scope. |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-web/types/mobileWork.ts` | Mobile context/task type model | Lacks `artifacts` task tab | Extend existing mobile task model. |
| `autobyteus-web/stores/mobileWorkStore.ts` | Current mobile context, active tab, mobile launch/attachment transient state | Active tab type will accept `artifacts` once type extends | No behavior change beyond type support. |
| `autobyteus-web/components/mobile/MobileWorkShell.vue` | Mobile work frame and bottom task navigation | Renders five tabs/components | Add `MobileArtifacts`, sixth nav item, preserve bounded layout. |
| `autobyteus-web/components/mobile/MobileActivityDigest.vue` | Mobile task/messages/tools digest | Duplicates run-id resolution | Replace local run-id computation with composable. |
| `autobyteus-web/components/mobile/MobileToolActivityList.vue` | Compact tool activity rows | Duplicates run-id resolution | Replace local run-id computation with composable. |
| `autobyteus-web/stores/runFileChangesStore.ts` | Authoritative frontend artifact row store | Already supports live/hydrated rows and latest artifact signals | Reuse unchanged. |
| `autobyteus-web/components/workspace/agent/ArtifactContentViewer.vue` | Artifact content preview/fetch states | Uses `authorizedFetch`; viewer is not Electron-only | Reuse inside mobile wrapper. |
| `autobyteus-web/components/workspace/agent/ArtifactsTab.vue` | Desktop split/resizable artifacts layout | Desktop-specific layout unsuitable for phone | Do not import/use in mobile. |
| `autobyteus-web/stores/browserShellStore.ts` | Electron Browser shell state/IPC projection | Requires `window.electronAPI` | Browser is out of mobile scope. |
| `autobyteus-web/utils/mobileFeatureGates.ts` | Supported/unsupported mobile feature IDs | Does not list artifacts | Add mobile run-artifacts capability; do not add Browser. |
| `autobyteus-web/docs/remote_access.md` | Phone Access behavior/docs | Omits Artifacts from mobile shell contract | Update docs after implementation. |

## Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-05-22 | Static probe | `rg -n "MobileTaskTab|ArtifactsTab|browserAvailable|window\.electronAPI|GetRunFileChanges" autobyteus-web` plus targeted `sed` reads | Artifact state/viewing is store/REST-backed; Browser is Electron-API-backed. | Mobile Artifacts can be added locally; Browser cannot. |
| 2026-05-22 | Static test probe | `rg -n "mobile-tab|MobileWorkShell|MobileTaskTab|MobileTools|MobileActivity" autobyteus-web/components/mobile/__tests__` | Existing mobile tests cover tab rendering, viewport containment, source import guard, Activity and Tools behavior. | Add/update focused tests in existing mobile test suites. |

## External / Public Source Findings

- Public API / spec / issue / upstream source: None used.
- Version / tag / commit / freshness: N/A.
- Relevant contract, behavior, or constraint learned: N/A.
- Why it matters: This is codebase-local mobile shell/design behavior; local source and docs are authoritative.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: Unit/component tests with Pinia store seeding should cover design-critical behavior. Browser feasibility is static-code/doc backed.
- Required config, feature flags, env vars, or accounts: None identified for design.
- External repos, samples, or artifacts cloned/downloaded for investigation: None.
- Setup commands that materially affected the investigation: `git fetch origin`; `git worktree add ...`.
- Cleanup notes for temporary investigation-only setup: None.

## Findings From Code / Docs / Data / Logs

- Mobile tabs are a separate phone-first shell, not a responsive reuse of desktop `RightSideTabs.vue`.
- Agent Artifacts are not desktop/Electron-specific; they are run-file-change projections and authorized REST content fetches.
- The existing artifact viewer already handles pending, failed, missing, text, previewable text, and media/blob paths.
- A mobile layout should avoid the desktop resizable split and own only presentation/selection state while reusing artifact data/viewer owners.
- Browser cannot be mobile-supported by adding a tab because the core Browser surface is created/projection-managed by Electron main and accessed through preload IPC.

## Constraints / Dependencies / Compatibility Facts

- `/mobile` must not call Electron preload APIs.
- `authorizedFetch` already injects mobile remote-access credentials for protected REST content.
- `runFileChangesStore` identity is run-id plus normalized path; mobile must preserve that identity rather than introducing workspace-path-only rows.
- Team Communication references are deliberately separate from Agent Artifacts per `docs/agent_artifacts.md`; mobile Artifacts must not merge reference files into Agent Artifacts.
- Current `GetTeamMemberRunProjection` does not include file changes; historical team member artifact hydration may need a separate follow-up if desktop/mobile parity demands it later.

## Open Unknowns / Risks

- Narrow phone visual fit with six bottom-nav items needs implementation/test attention.
- `ArtifactContentViewer` may need small mobile wrapper sizing constraints but should not be forked.
- If users expect historical team-run member artifacts immediately after reopening old team runs, the existing projection query may need future server/frontend hydration work. This task should not hide or worsen that existing limitation.

## Notes For Architect Reviewer

- The intended implementation is additive plus a small deduplication refactor; no backend/API change is planned.
- The key design decision is to create `MobileArtifacts.vue` instead of importing `ArtifactsTab.vue`, preserving mobile layout ownership while reusing artifact state/viewer owners.
- The Browser decision should remain explicit: no mobile Browser tab in this task because the current Browser subsystem is Electron-native.
