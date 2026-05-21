# Investigation Notes

## Investigation Status

- Bootstrap Status: Complete
- Current Status: Investigation complete; design produced from findings
- Investigation Goal: Determine why the mobile UI cannot list/select agents or teams when no run is active, then define parity-oriented mobile improvements for work selection, files, activity, Terminal, and VNC.
- Scope Classification (`Small`/`Medium`/`Large`): Medium
- Scope Classification Rationale: The change spans mobile route/shell, work/context selection, agent/team/workspace data loading, run setup entry, mobile Files/Activity presentation, mobile feature gates, and a new mobile Tools surface. It is expected to remain frontend-focused unless validation uncovers backend authorization issues.
- Scope Summary: Improve mobile web functionality parity without reducing desktop behavior.
- Primary Questions Resolved:
  - Desktop/right-panel Terminal and VNC already exist as browser-rendered components.
  - Mobile work catalog already pulls from desktop domain stores but hides load/failure state.
  - Mobile lacks a Tools surface by product-gating choice, not by a proven browser limitation.
  - Mobile Files default controls are more crowded than desktop-equivalent browsing and can clip on phone width.

## Request Context

The user reports that mobile web currently loses functionality compared to desktop/web. Screenshot 1 shows the Mobile Home page with a Switch Work bottom sheet open; the Agents tab says `No matching agents` even though the user expects selectable agents and teams to start new runs when no existing run is active. Screenshot 2 shows a mobile Files page that appears overcomplicated and not comparable to desktop; it asks to choose a workspace and has clipped/horizontally crowded chips. The user expects the mobile Chrome experience to provide the same functionality as desktop Chrome where technically feasible, including agent/team selection and feature surfaces such as VNC and Terminal.

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git
- Task Workspace Root: /Users/normy/autobyteus_org/autobyteus-worktrees/mobile-functionality-parity
- Task Artifact Folder: /Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/mobile-functionality-parity
- Current Branch: codex/mobile-functionality-parity
- Current Worktree / Working Directory: /Users/normy/autobyteus_org/autobyteus-worktrees/mobile-functionality-parity
- Bootstrap Base Branch: origin/personal
- Remote Refresh Result: `git fetch origin --prune` completed before worktree creation on 2026-05-21.
- Task Branch: codex/mobile-functionality-parity
- Expected Base Branch (if known): origin/personal
- Expected Finalization Target (if known): personal
- Bootstrap Blockers: None
- Notes For Downstream Agents: Do not work in /Users/normy/autobyteus_org/autobyteus-workspace-superrepo for this task; use the dedicated task worktree above.

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-05-21 | Command | `pwd; git rev-parse --show-toplevel; git status --short --branch; git remote -v; git symbolic-ref --short refs/remotes/origin/HEAD; ls -la` | Discover repository and base branch context | Superrepo is a Git repo on branch `personal` tracking `origin/personal`; web app under `autobyteus-web` | No |
| 2026-05-21 | Command | `git fetch origin --prune && git worktree list --porcelain` | Refresh remote refs and inspect existing worktrees | `origin/personal` is tracked default/integration branch; no matching mobile parity worktree found | No |
| 2026-05-21 | Command | `git worktree add -b codex/mobile-functionality-parity /Users/normy/autobyteus_org/autobyteus-worktrees/mobile-functionality-parity origin/personal` | Create dedicated ticket worktree/branch | Created task branch at commit `aa58fabc` from `origin/personal` | No |
| 2026-05-21 | Other | User screenshots #1 and #2 in task prompt | Capture observed mobile behavior | Switch-work Agents tab empty; Files screen requires workspace and has crowded/clipped controls | No |
| 2026-05-21 | Code | `autobyteus-web/components/mobile/MobileRemoteAccessShell.vue` | Find mobile shell owner | Owns Home/Work/Troubleshooting screens, context switcher, catalog refresh, and route unsupported messages | Yes |
| 2026-05-21 | Code | `autobyteus-web/composables/mobile/useMobileWorkCatalog.ts` | Inspect mobile catalog data source | Reads run history, agent definitions, team definitions, and workspaces from desktop domain stores; returns only item lists and aggregate success/failure booleans | Yes |
| 2026-05-21 | Code | `autobyteus-web/components/mobile/MobileContextSwitcher.vue` | Inspect empty Agents/Teams behavior | Renders `No matching <segment>` when the list is empty; has no loading/error/retry state | Yes |
| 2026-05-21 | Code | `autobyteus-web/components/mobile/MobileHome.vue` | Inspect no-recent primary path | Primary action opens context switcher; recent empty copy says choose agent/team/workspace | Yes |
| 2026-05-21 | Code | `autobyteus-web/components/mobile/MobileRuns.vue` and `MobileRunSetup.vue` | Inspect start-new flow | `MobileRunSetup` exists but is hidden behind a `Start new` toggle; selecting a definition lands on Runs but does not automatically show setup | Yes |
| 2026-05-21 | Code | `autobyteus-web/components/mobile/MobileWorkShell.vue` and `types/mobileWork.ts` | Inspect mobile task model | Mobile tabs are only `chat`, `runs`, `files`, `activity`; no Tools tab | Yes |
| 2026-05-21 | Code | `autobyteus-web/components/mobile/MobileFiles.vue` | Inspect Files screenshot source | Default header shows search plus chips for Folder, Recent, Attached, Markdown/code, Deep search; chip row can crowd/clip | Yes |
| 2026-05-21 | Code | `autobyteus-web/components/mobile/MobileActivityDigest.vue` | Inspect unsupported/errors/approvals behavior | Default Activity includes Errors and Approvals filter chips and an unsupported-terminal/browser/desktop-tool notice | Yes |
| 2026-05-21 | Code | `autobyteus-web/utils/mobileFeatureGates.ts` and `middleware/mobileFeatureGate.global.ts` | Inspect mobile capability gating | `terminal` feature id exists but is not supported; no `vnc` feature id; desktop routes are redirected to unsupported notices | Yes |
| 2026-05-21 | Code | `autobyteus-web/components/layout/RightSideTabs.vue`, `WorkspaceDesktopLayout.vue`, `WorkspaceMobileLayout.vue`, `composables/useRightSideTabs.ts` | Compare desktop and legacy responsive tools | Desktop right panel has Files/Team/Terminal/VNC/Artifacts/Browser/Activity; legacy responsive `/workspace` mobile layout had Tools rendering `RightSideTabs` | Yes |
| 2026-05-21 | Code | `autobyteus-web/components/workspace/tools/Terminal.vue`, `composables/useTerminalSession.ts` | Check Terminal feasibility on mobile | Terminal uses xterm in browser and `useTerminalSession`; session uses bound node terminal WebSocket and appends remote-access credential when present | Yes |
| 2026-05-21 | Code | `autobyteus-web/components/workspace/tools/VncViewer.vue`, `VncHostTile.vue`, `composables/useVncSession.ts` | Check VNC feasibility on mobile | VNC uses GraphQL-loaded server settings and noVNC browser client; component already supports fit/fullscreen/view-only controls | Yes |
| 2026-05-21 | Doc | `autobyteus-web/docs/remote_access.md` | Check documented mobile contract | Docs describe the phone shell as MVP with desktop-only feature gating; start-new support is documented but Terminal/VNC are not treated as supported mobile tools | Yes |
| 2026-05-21 | Command | `pnpm vitest run ...` in `autobyteus-web` | Try targeted current test run | Failed because dedicated worktree has no installed dependencies / `vitest` binary (`ERR_PNPM_RECURSIVE_EXEC_FIRST_FAIL Command "vitest" not found`) | Yes, implementation must set up deps before validation |

## Current Behavior / Current Flow

- Current entrypoint or first observable boundary: `pages/mobile.vue` and `pages/index.vue` render `MobileRemoteAccessShell.vue` in mobile runtime.
- Current execution flow:
  - Paired phone initializes mobile node session and binds `windowNodeContextStore` to the paired node.
  - `MobileRemoteAccessShell.checkStatus()` concurrently fetches remote-access status and calls `refreshMobileWorkCatalog()`.
  - `useMobileWorkCatalog()` calls run history, agent definition, team definition, and workspace stores, then exposes computed item lists.
  - `MobileHome` opens `MobileContextSwitcher`; `MobileContextSwitcher` renders current list or a generic empty state.
  - Selecting a definition context calls `openContext()`, stores the context, switches to Work/Runs by `preferredTabForMobileContext`, and clears any selected stale run. Setup remains hidden until `Start new` is clicked.
- Ownership or boundary observations:
  - The existing mobile shell is the right UI owner, but it currently owns a reduced mobile-MVP boundary instead of a parity boundary.
  - Domain data remains correctly owned by existing stores; the missing piece is catalog state exposure and mobile presentation/state transitions.
  - Terminal/VNC lower-level owners already exist and should be reused through a mobile Tools wrapper rather than duplicating protocols or importing desktop layout.
- Current behavior summary: Mobile has enough low-level capability to be parity-oriented, but current presentation/gating hides data failures, adds extra mobile-only complexity, and excludes tools.

## Design Health Assessment Evidence

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Larger Requirement / Bug Fix / Behavior Change
- Candidate root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue plus Legacy Or Compatibility Pressure
- Refactor posture evidence summary: Refactor needed now. The mobile shell's unsupported-feature/capability boundary is the source of the product mismatch; simply patching one empty state would leave direct-start, Tools, Files, and Activity parity unresolved.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| User screenshot #1 | Switch Work has Agents tab but shows `No matching agents` | Mobile catalog state is not trustworthy/actionable | Add catalog state and direct start flow |
| `useMobileWorkCatalog.ts` | Uses the correct domain stores but returns only lists and booleans | Existing ownership can be extended; no backend-first redesign needed | Extend catalog view model/state |
| `MobileContextSwitcher.vue` | Empty list always renders generic empty message | Missing invariant: only render empty after successful loaded empty catalog | Add loading/error/empty distinctions |
| `MobileRuns.vue` | New-run setup hidden unless Start new is clicked | Selecting a definition is not equivalent to starting/choosing work | Add setup intent from definition selection |
| `MobileWorkShell.vue` | No Tools tab | Functionality loss relative to desktop/legacy responsive layout | Add mobile Tools wrapper |
| `WorkspaceMobileLayout.vue` | Legacy mobile `/workspace` layout had Tools with `RightSideTabs` | Browser can host tools; dedicated phone shell removed them by policy | Reintroduce via mobile-owned wrapper |
| `Terminal.vue` / `useTerminalSession.ts` | Terminal is browser-based and already remote-auth aware | No technical reason to globally block Terminal on mobile | Expose with workspace-required state |
| `VncViewer.vue` / `useVncSession.ts` | VNC is browser/noVNC-based | No technical reason to globally block VNC on mobile; reachability may be config-dependent | Expose with config/reachability states |
| `MobileFiles.vue` | Header chip row is crowded and mobile-only | Default mobile UX drifted from desktop-equivalent file browsing | Simplify default controls |
| `MobileActivityDigest.vue` | Unsupported tools notice and Errors/Approvals chips | Mobile-specific copy/filters conflict with parity request | Remove notice; de-emphasize advanced filters |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-web/components/mobile/MobileRemoteAccessShell.vue` | Paired phone shell orchestration | Owns screen state, context switcher, catalog refresh, and openContext transition | Extend as mobile parity shell owner; do not move domain data here |
| `autobyteus-web/composables/mobile/useMobileWorkCatalog.ts` | Mobile work lists from existing stores | Correct data source, incomplete state model | Extend as catalog view-model owner with per-category load/error/retry state |
| `autobyteus-web/components/mobile/MobileContextSwitcher.vue` | Bottom sheet picker for recent/agents/teams/workspaces | Renders false empty states and has no retry | Accept richer catalog segment state and start-intent selection behavior |
| `autobyteus-web/stores/mobileWorkStore.ts` | Current mobile context/tab/draft attachments/team focus memory | No setup intent state | Add mobile run setup intent if needed to bridge picker selection to Runs setup |
| `autobyteus-web/types/mobileWork.ts` | Mobile context and tab types | No `tools` tab, no setup intent type | Extend with `tools` and optional launch intent types |
| `autobyteus-web/components/mobile/MobileRuns.vue` | Recent runs and start-new setup | Setup is hidden by default | Open setup when a mobile run setup intent exists |
| `autobyteus-web/components/mobile/MobileRunSetup.vue` | Mobile run launch form | Can preselect based on context but needs visible setup and explicit intent handling | Reuse with target preselection; avoid duplicating launch policy |
| `autobyteus-web/components/mobile/MobileFiles.vue` | Mobile file browsing/preview/attach | Crowded default discovery controls | Simplify default header; move advanced filters behind secondary control |
| `autobyteus-web/components/mobile/MobileActivityDigest.vue` | Mobile activity cards/filters | Unsupported Terminal/VNC notice and prominent extra filters | Remove obsolete notice; simplify default filters |
| `autobyteus-web/components/mobile/MobileWorkShell.vue` | Bottom navigation/task surface | No Tools surface | Add Tools tab and render new `MobileTools.vue` |
| `autobyteus-web/components/workspace/tools/Terminal.vue` | Browser terminal component | Uses workspaceStore active workspace | Reuse in `MobileTools`; ensure active workspace derives from mobile context |
| `autobyteus-web/components/workspace/tools/VncViewer.vue` | Browser/noVNC viewer | Uses server settings | Reuse in `MobileTools`; add mobile container affordances if needed |
| `autobyteus-web/utils/mobileFeatureGates.ts` | Mobile support/gating policy | Terminal not supported; VNC absent | Update support policy to match parity design |
| `autobyteus-web/docs/remote_access.md` | Phone Access behavior docs | Documents MVP gating posture | Update docs to parity posture with real constraints |
| `autobyteus-web/components/mobile/__tests__/*` and `utils/__tests__/mobileFeatureGates.spec.ts` | Regression coverage | Existing tests assert no `RightSideTabs` and unsupported MVP assumptions | Update/add tests for parity behavior |

## Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-05-21 | Test | `pnpm vitest run components/mobile/__tests__/MobileRemoteAccessShell.spec.ts components/mobile/__tests__/MobileUxRefinement.spec.ts utils/__tests__/mobileFeatureGates.spec.ts middleware/__tests__/mobileFeatureGate.global.spec.ts --reporter=dot` from `autobyteus-web` | Failed: `Command "vitest" not found`; dedicated worktree lacks installed dependencies | Downstream implementation must run dependency setup before validation |

## External / Public Source Findings

No external sources consulted. The task is internal codebase behavior and current browser support is already represented by existing components.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: For implementation validation, seed/mount Pinia stores with no recents plus at least one agent and one team; separately test catalog failure by mocking store errors/rejections.
- Required config, feature flags, env vars, or accounts: Mobile runtime under `/mobile` or mobile static build; paired `mobileNodeSession` state for shell tests.
- External repos, samples, or artifacts cloned/downloaded for investigation: None.
- Setup commands that materially affected the investigation: Dedicated worktree creation above.
- Cleanup notes for temporary investigation-only setup: Removed accidental local `typescript` transcript file produced during an early unquoted here-doc mistake.

## Findings From Code / Docs / Data / Logs

- Mobile work selection is not missing a data source; it is missing trustworthy state and direct-start transition handling.
- Mobile Tools are absent by design policy, not because Terminal/VNC require Electron. Terminal and noVNC are browser-based; Terminal already has remote-access credential support.
- The mobile feature-gate/docs stance is stale relative to the requested product posture and should be updated in the same change to avoid regression back to MVP restrictions.
- Mobile Files/Activity accumulated mobile-specific filters/notices that should be simplified or moved behind secondary controls.

## Constraints / Dependencies / Compatibility Facts

- Phone code paths must not call `window.electronAPI`; Terminal/VNC components inspected do not require Electron APIs.
- `Terminal.vue` depends on `workspaceStore.activeWorkspace`; mobile Tools must ensure the active workspace can be resolved from the mobile context or run config before rendering/connecting.
- VNC reachability depends on configured host URLs. If VNC settings contain desktop-loopback addresses unreachable from phone, the UI should show configuration/reachability guidance rather than hiding VNC.
- No backward compatibility with the reduced mobile-MVP unsupported Terminal/VNC copy is desired for in-scope behavior.

## Open Unknowns / Risks

- Whether all real backend deployments allow `/rest/health` and GraphQL catalog queries exactly as the frontend expects under remote-access credentials. If not, implementation may require a backend authorization fix.
- Whether VNC settings in common user deployments are phone-reachable or need a documented/proxied host recommendation.
- Touch keyboard ergonomics for xterm may need follow-up polish after initial parity exposure.
- Browser/application iframe parity is explicitly out of this task and will remain unsupported unless separately designed.

## Notes For Architect Reviewer

Review especially the boundary choice: the design keeps mobile shell ownership for responsive presentation while reusing domain stores and lower-level Terminal/VNC tool owners. It intentionally rejects the previous mobile-MVP unsupported-tool policy for Terminal/VNC and treats unsupported as a real technical/configuration condition only.
