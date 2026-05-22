# Investigation Notes

## Investigation Status

- Bootstrap Status: Complete; relevant superrepo identified and dedicated git worktree/branch created before deep code investigation.
- Current Status: Code investigation complete; requirements refined to `Design-ready`; design spec produced for architecture review.
- Investigation Goal: Identify current mobile UI ownership, redundant-copy sources, chat scroll containment root cause, Activity filter implementation, Tools copy locations, and Android launcher icon asset pipeline so the cleanup can be designed without ad hoc page edits.
- Scope Classification (`Small`/`Medium`/`Large`): Medium
- Scope Classification Rationale: Multiple mobile screens plus Android icon assets are affected, but the request is primarily frontend/mobile presentation and layout cleanup, plus one native resource sizing fix. No backend protocol change is required.
- Scope Summary: Simplify mobile Home, work shell/header, Chat target selector, Activity filters, Tools/Terminal/VNC copy, and launcher icon cropping while preserving desktop behavior, core store/API semantics, and accessibility.
- Primary Questions To Resolve:
  - Which files own the mobile route, home page, work shell/header, bottom nav, chat composer/layout, activity filters, tools tabs, and Android icon assets? Resolved.
  - Is redundant visible copy hardcoded in page components, shared components, or data-driven descriptors? Resolved: mostly hardcoded in mobile components; run type text comes from `types/mobileWork.ts`.
  - What layout CSS causes the mobile chat page/body to scroll into blank space below the composer/tab bar? Resolved design direction: missing end-to-end flex/overflow containment across mobile work shell and shared monitor boundaries.
  - Can the Activity `All` aggregate be removed locally, or does it drive shared logic/count aggregation? Resolved: local frontend filter state only.
  - Which Android icon resource is cropped and what safe-area sizing change is needed? Resolved: adaptive icon foreground vector content is too large for common launcher masks.

## Request Context

On 2026-05-22 the user reported that the mobile AutoByteus remote access UI contains excessive redundant text and duplicate controls. The user specifically called out `Mobile Home`, `Current node`, `Current work context`, `Primary next action`, Activity `All`, Tools eyebrow text, work header `Agent run` / `Team run`, Chat `Message target`, `Current: ...`, explanatory target copy, a chat scrolling defect that moves the full UI upward leaving blank space below, and Android launcher icon cropping. The user attached screenshots showing home, Activity, Tools/Terminal/VNC, Chat, and Android launcher icon symptoms. In this turn, the user asked to work on the bootstrapped ticket under `/Users/normy/autobyteus_org/autobyteus-worktrees/mobile-ux-simplification-superrepo/tickets`.

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/mobile-ux-simplification-superrepo`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/mobile-ux-simplification`
- Current Branch: `codex/mobile-ux-simplification`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/mobile-ux-simplification-superrepo`
- Bootstrap Base Branch: `origin/personal`
- Remote Refresh Result: `git fetch --prune origin` succeeded on 2026-05-22 during bootstrap.
- Task Branch: `codex/mobile-ux-simplification` at `b64bfe508f1c8844a1f7e18f8a7fee4623c0e5d0`, tracking `origin/personal`.
- Expected Base Branch (if known): `origin/personal`
- Expected Finalization Target (if known): `personal`
- Bootstrap Blockers: None.
- Notes For Downstream Agents: Authoritative artifacts and implementation should use this dedicated superrepo worktree. Current worktree dependency install state is incomplete for web tests (`autobyteus-web/node_modules` absent).

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-05-22 | Command | `pwd; git rev-parse --show-toplevel; git status --short --branch; git remote -v; git branch -vv --no-abbrev` in `/Users/normy/autobyteus_org/autobyteus-com-workspace` | Bootstrap from provided environment. | Provided cwd was `autobyteus-com-workspace` on `main`, but later code searches found it was not the mobile app repo. | No |
| 2026-05-22 | Command | `rg -n "Mobile Home|CURRENT NODE|..." frontend admin-ui backend -S` in `autobyteus-com-workspace` | Check whether requested UI strings live in provided cwd. | No matching mobile remote access strings found in the website/admin/backend repo. | No |
| 2026-05-22 | Command | `rg -n "AutoByteus Remote Access|...|Workspace Terminal" /Users/normy/autobyteus_org -S ...` | Locate the relevant mobile app code. | Matches found under `autobyteus-workspace-superrepo` and related worktrees; `autobyteus-web` contains the mobile UI. | No |
| 2026-05-22 | Command | `git -C /Users/normy/autobyteus_org/autobyteus-workspace-superrepo remote show origin` | Resolve superrepo default/integration branch. | Remote HEAD branch is `personal`; current superrepo checkout tracks `origin/personal`. | No |
| 2026-05-22 | Command / Setup | `git -C /Users/normy/autobyteus_org/autobyteus-workspace-superrepo fetch --prune origin` | Refresh tracked remote refs before task worktree creation. | Fetch succeeded. | No |
| 2026-05-22 | Command / Setup | `git -C /Users/normy/autobyteus_org/autobyteus-workspace-superrepo worktree add -b codex/mobile-ux-simplification /Users/normy/autobyteus_org/autobyteus-worktrees/mobile-ux-simplification-superrepo origin/personal` | Create required dedicated task worktree/branch for the actual mobile app repo. | Worktree created at `b64bfe50` from `origin/personal`; branch tracks `origin/personal`. | No |
| 2026-05-22 | Command | `git status --short --branch; git rev-parse --show-toplevel; git rev-parse --abbrev-ref HEAD; git rev-parse HEAD; git rev-parse --abbrev-ref --symbolic-full-name @{u}` in task worktree | Verify authoritative task workspace branch/upstream. | Confirmed branch `codex/mobile-ux-simplification`, upstream `origin/personal`, current untracked ticket artifact folder only. | No |
| 2026-05-22 | Other | User screenshots Image #1 through Image #10 and narrated request text recorded during bootstrap. | Capture concrete observed UX defects and desired simplification. | Home, Activity, Tools, Chat, and launcher icon issues documented; chat scroll bug visible in screenshots with blank region below controls. | No |
| 2026-05-22 | Code | `autobyteus-web/pages/mobile.vue` | Confirm mobile route entrypoint. | `/mobile` uses `MobileRemoteAccessShell` with no default desktop layout. | No |
| 2026-05-22 | Code | `autobyteus-web/components/mobile/MobileRemoteAccessShell.vue` | Identify mobile shell owner and Home/Work routing. | Owns paired state, Home/Work/Troubleshooting screen selection, context switcher, recent/catalog refresh, and `continueLatestRun` handler used only by Home primary action. | Yes: remove now-unused continuation path with primary action. |
| 2026-05-22 | Code | `autobyteus-web/components/mobile/MobileHome.vue` | Locate Home redundant copy and duplicate action. | Hardcodes `Mobile Home`, `Current node`, `Current work context`, `Primary next action`; primary action button duplicates recent/current work selection. | Yes: implement removal and test updates. |
| 2026-05-22 | Code | `autobyteus-web/components/mobile/MobileWorkShell.vue`; `autobyteus-web/types/mobileWork.ts` | Locate work header subtitle/type labels. | Work header uses `mobileWorkContextSubtitle`; helper appends `Agent run` / `Team run` to status labels. | Yes: tighten helper to compact mobile metadata. |
| 2026-05-22 | Code | `autobyteus-web/components/mobile/MobileActivity.vue`; `autobyteus-web/components/mobile/MobileActivityDigest.vue` | Locate Activity filter implementation. | Digest owns local `ActivityFilter = 'all' | 'tasks' | ...`; `All` is local aggregate UI and can be removed without backend changes. | Yes: default to concrete category and keep issue filters. |
| 2026-05-22 | Code | `autobyteus-web/components/mobile/MobileTools.vue`; `autobyteus-web/components/workspace/tools/Terminal.vue`; `autobyteus-web/components/workspace/tools/VncViewer.vue` | Locate Tools/Terminal/VNC copy and ownership. | Mobile wrapper owns redundant copy; Terminal/VNC underlying owners are reused and do not need protocol changes. | Yes: remove routine wrapper copy only. |
| 2026-05-22 | Code | `autobyteus-web/components/mobile/MobileTeamMemberFocusBar.vue`; `autobyteus-web/components/mobile/MobileLaunchTargetPicker.vue`; `autobyteus-web/composables/mobile/useMobileTeamMemberFocusCoordinator.ts` | Locate chat target selector copy and behavior. | Focus bar owns visible label/current/explanation; coordinator owns focus state/update. Picker currently renders visible `label`. | Yes: preserve focus behavior while hiding redundant visible copy accessibly. |
| 2026-05-22 | Code | `autobyteus-web/components/mobile/MobileChat.vue`; `autobyteus-web/components/workspace/agent/AgentEventMonitor.vue`; `autobyteus-web/components/workspace/team/AgentTeamEventMonitor.vue`; `autobyteus-web/components/workspace/agent/AgentConversationFeed.vue`; `autobyteus-web/components/agentInput/AgentUserInputForm.vue` | Trace chat scroll/layout spine. | Chat relies on nested flex containers; monitor/feed/composer boundaries do not all enforce `min-h-0`, `overflow-hidden`, and `shrink-0`, matching whole-page scroll symptoms. | Yes: apply layout invariant and desktop smoke checks. |
| 2026-05-22 | Code | `autobyteus-web/composables/mobile/useMobileWorkCatalog.ts`; `autobyteus-web/stores/mobileWorkStore.ts` | Check recent/current work data ownership. | Recent work metadata already uses status + workspace, not run type; current context selection is local mobile state. | No backend change. |
| 2026-05-22 | Code | `autobyteus-web/components/mobile/__tests__/MobileUxRefinement.spec.ts`; `MobileRemoteAccessShell.spec.ts`; `MobileContextSelectionRegression.spec.ts` | Identify test coverage and old-copy expectations. | Tests cover affected components; several assertions expect old copy/primary action and must be intentionally updated. | Yes. |
| 2026-05-22 | Code | `autobyteus-android/app/src/main/res/drawable/ic_launcher_foreground.xml`; `ic_launcher_background.xml`; `mipmap-anydpi-v26/ic_launcher.xml`; `AndroidManifest.xml` | Locate launcher icon pipeline and cropping source. | Manifest uses adaptive icon; foreground vector fills almost the full 108dp viewport, outside common mask safe area. | Yes: rescale foreground artwork into safe zone. |
| 2026-05-22 | Doc | `autobyteus-web/docs/remote_access.md`; `docs/android_mobile_access.md`; `autobyteus-android/README.md` | Identify docs affected by copy/icon changes and validation gates. | Docs mention `Message target`, mobile Tools semantics, mobile-web/APK freshness, Android validation. | Yes: docs sync later. |
| 2026-05-22 | Command | `pnpm -C autobyteus-web test:nuxt --run components/mobile/__tests__/MobileUxRefinement.spec.ts components/mobile/__tests__/MobileContextSelectionRegression.spec.ts --reporter=dot` | Probe current testability of affected unit suites. | Failed before running tests: `sh: cross-env: command not found`; local `node_modules` missing. | Yes: implementation/validation needs deps or prepared workspace. |
| 2026-05-22 | Spec | `/Users/normy/autobyteus_org/autobyteus-agents/agent-teams/software-engineering-team/agents/solution-designer/design-principles.md` | Required design reference. | Use spine-first ownership, no compatibility dual paths, removal as first-class design work, and authoritative boundaries. | No |
| 2026-05-22 | Spec | `/Users/normy/autobyteus_org/autobyteus-agents/agent-teams/software-engineering-team/agents/solution-designer/references/design-examples.md` | Shape check for spine/ownership design. | Reinforced concrete spine inventory and avoiding helper/coordinator fragmentation. | No |

## Current Behavior / Current Flow

- Current entrypoint or first observable boundary: `/mobile` Nuxt page (`autobyteus-web/pages/mobile.vue`) renders `MobileRemoteAccessShell` without the desktop default layout.
- Current execution flow:
  - Mobile route -> `MobileRemoteAccessShell`.
  - Paired session -> `MobileHome` or `MobileWorkShell` based on shell screen state.
  - Work mode -> `MobileWorkShell` header/team focus bar/task surface/bottom nav.
  - Chat tab -> `MobileChat` -> shared `AgentEventMonitor` or `AgentTeamEventMonitor` -> `AgentConversationFeed` + composer.
  - Activity tab -> `MobileActivity` -> `MobileActivityDigest` local filters.
  - Tools tab -> `MobileTools` -> `Terminal` / `VncViewer` wrappers.
  - Android launcher -> `AndroidManifest.xml` -> `@mipmap/ic_launcher` adaptive icon -> foreground/background XML.
- Ownership or boundary observations:
  - Mobile copy policy belongs in the existing mobile shell/components, not backend services.
  - Work context subtitle policy belongs in `types/mobileWork.ts`; callers should not append or strip run type independently.
  - Activity filter policy belongs in `MobileActivityDigest.vue` and is local presentation state.
  - Team target state updates belong in `useMobileTeamMemberFocusCoordinator` / `mobileWorkStore`; visible target copy belongs in `MobileTeamMemberFocusBar.vue` and picker presentation.
  - Transcript/composer scroll containment crosses mobile and shared monitor boundaries; the shared monitor owner can be strengthened as long as desktop monitor users are verified.
  - Android icon sizing belongs in launcher resources, not app runtime code.
- Current behavior summary: Current mobile UI over-explains context through static labels and repeated paragraphs, exposes duplicate Home action surfaces, renders an aggregate Activity view, lacks a complete chat flex/overflow invariant, and draws Android launcher foreground content too large for adaptive mask safe areas.

## Design Health Assessment Evidence

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Behavior Change / Cleanup / Bug Fix
- Candidate root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Duplicated Policy Or Coordination; Missing Invariant; Local Implementation Defect.
- Refactor posture evidence summary: Targeted local refactor is needed: remove duplicate Home action path, tighten shared mobile subtitle helper, remove Activity aggregate state, make team focus picker hide visible label accessibly, and enforce layout containment. No broad backend/desktop subsystem refactor is needed.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| `MobileHome.vue` | Hardcoded labels and blue primary action duplicate nearby data/actions. | Duplicated presentation policy and duplicate action surface. | Remove, update tests. |
| `types/mobileWork.ts` | `mobileWorkContextSubtitle()` appends run type to compact status. | Shared mobile metadata helper is the right single owner for compact run metadata. | Tighten helper; update expectations. |
| `MobileActivityDigest.vue` | `all` is a local filter value and count aggregator. | No backend/API dependency; clean removal is local. | Remove aggregate state and adjust render logic. |
| `MobileTools.vue` | Generic explanatory copy appears on normal Terminal/VNC surfaces. | Mobile wrapper copy should distinguish routine state from actionable setup/error state. | Remove default helper paragraphs. |
| `MobileTeamMemberFocusBar.vue` | Visible `Message target`, `Current:`, and explanatory copy are separate from actual focus coordination. | UI copy can be simplified without changing focus owner or backend contracts. | Compact display with accessible label. |
| `AgentEventMonitor.vue` / `AgentTeamEventMonitor.vue` / `AgentConversationFeed.vue` | Nested flex scroll ownership is incomplete. | Missing layout invariant; shared monitor needs safe tightening. | Add containment; desktop smoke. |
| Android icon XML | Foreground artwork spans almost full 108dp viewport. | Local adaptive icon defect; no runtime boundary issue. | Rescale foreground into safe area. |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-web/pages/mobile.vue` | `/mobile` page entrypoint/head metadata. | Thin entry wrapper; loads `MobileRemoteAccessShell`. | No structural change needed. |
| `autobyteus-web/components/mobile/MobileRemoteAccessShell.vue` | Mobile paired-state shell, Home/Work/Troubleshooting routing, context switcher. | Wires `continueLatestRun` only for removed Home primary action. | Remove dead continuation path after Home action removal. |
| `autobyteus-web/components/mobile/MobileHome.vue` | Home status/current/recent work presentation. | Owns most Home redundant copy and duplicate primary action. | Direct cleanup owner. |
| `autobyteus-web/components/mobile/MobileWorkShell.vue` | Work header, task surface, team focus bar placement, bottom nav. | Header uses compact metadata helper; top-level frame needs stronger overflow containment. | Direct cleanup/layout owner. |
| `autobyteus-web/types/mobileWork.ts` | Mobile work context types and presentation title/subtitle helpers. | Appends run type to status. | Single helper to tighten; do not strip at callers. |
| `autobyteus-web/components/mobile/MobileActivityDigest.vue` | Activity digest cards and filters. | Owns `all` aggregate filter locally. | Remove aggregate state in owner. |
| `autobyteus-web/components/mobile/MobileTools.vue` | Phone-sized Terminal/VNC wrapper. | Owns redundant copy and workspace/VNC helper paragraphs. | Remove routine copy; keep actionable empty states. |
| `autobyteus-web/components/mobile/MobileTeamMemberFocusBar.vue` | Visible team-run target selector on Chat/Files/Activity. | Owns redundant target copy; focus behavior delegated to coordinator. | Compact visible target row; retain accessible semantics. |
| `autobyteus-web/components/mobile/MobileLaunchTargetPicker.vue` | Reusable searchable mobile picker. | Always renders visible label. | May need a label-visibility prop to support compact focus bar without duplicating picker logic. |
| `autobyteus-web/components/mobile/MobileChat.vue` | Mobile Chat surface and monitor selection. | Must remain `h-full min-h-0 overflow-hidden` participant. | Add/keep containment. |
| `autobyteus-web/components/workspace/agent/AgentEventMonitor.vue` | Shared agent transcript/composer layout. | Needs `min-h-0` / `overflow-hidden` / `shrink-0` invariant. | Safe shared layout fix with desktop checks. |
| `autobyteus-web/components/workspace/team/AgentTeamEventMonitor.vue` | Shared team monitor wrapper. | Must propagate `min-h-0` and `overflow-hidden` to nested agent monitor. | Safe shared layout fix with desktop checks. |
| `autobyteus-web/components/workspace/agent/AgentConversationFeed.vue` | Transcript scroll owner. | Already has overflow-y-auto but relies on parent height correctness. | Ensure feed remains only scrolling chat region. |
| `autobyteus-android/app/src/main/res/drawable/ic_launcher_foreground.xml` | Adaptive launcher foreground artwork. | Artwork too large for mask. | Rescale within 108dp safe-zone. |
| `autobyteus-android/app/src/main/res/drawable/ic_launcher_background.xml` | Adaptive launcher background. | Solid blue background. | Can remain; foreground rescale should solve crop. |
| `autobyteus-web/docs/remote_access.md` | Phone Access/mobile shell user and build docs. | Mentions `Message target` and mobile Tools behavior. | Docs sync likely needed. |
| `docs/android_mobile_access.md` / `autobyteus-android/README.md` | Android validation/build docs. | Cover APK/mobile-web freshness and validation evidence. | Docs sync should mention icon evidence if needed. |

## Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-05-22 | Setup | Dedicated superrepo worktree creation | Clean task branch available for investigation/design. | Safe to author artifacts and hand downstream work. |
| 2026-05-22 | Test probe | `pnpm -C autobyteus-web test:nuxt --run components/mobile/__tests__/MobileUxRefinement.spec.ts components/mobile/__tests__/MobileContextSelectionRegression.spec.ts --reporter=dot` | Failed before Vitest execution: `cross-env: command not found`; local package exists but node_modules missing. | Implementation/validation must install deps or use prepared workspace before relying on web test results. |

## External / Public Source Findings

None used. This task was resolved through local code/docs inspection.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: For final validation, mobile web should be built/served under `/mobile`; Android icon validation should use generated resources, preview evidence, emulator, or real device.
- Required config, feature flags, env vars, or accounts: None for source changes. Android build may require `ANDROID_HOME`; web tests require dependencies installed.
- External repos, samples, or artifacts cloned/downloaded for investigation: None.
- Setup commands that materially affected the investigation: `git fetch --prune origin`; `git worktree add -b codex/mobile-ux-simplification ... origin/personal`; attempted `pnpm -C autobyteus-web test:nuxt ...` which revealed missing deps.
- Cleanup notes for temporary investigation-only setup: None.

## Findings From Code / Docs / Data / Logs

1. The mobile UX is intentionally isolated from desktop shell imports. The cleanup should not route through desktop workspace layout or right-panel components.
2. Home primary action is not an authoritative use-case boundary; it is an extra presentation shortcut over `latestRunItem`. Removing it should also remove unused `continueLatest` plumbing.
3. Compact run metadata is centralized enough to fix once in `mobileWorkContextSubtitle()` rather than stripping `Agent run` / `Team run` in multiple components.
4. Activity filters are local render state; removing `All` does not affect the activity stores or backend event contracts.
5. Tools routine explanatory copy belongs to the mobile wrapper and can be removed while preserving no-workspace/setup copy and docs troubleshooting.
6. Chat target copy can be simplified in the focus bar while retaining focus coordinator behavior and remembered per-team focus state.
7. Chat scroll containment should be enforced as a structural layout invariant: shell fixed-height frame -> non-scrolling task surface -> monitor owns transcript/composer split -> transcript scrolls -> composer/nav shrink.
8. Android launcher cropping is caused by vector scale, not launcher manifest routing or WebView behavior.

## Constraints / Dependencies / Compatibility Facts

- Preserve desktop behavior and core store/API semantics. Core stores are existing capability providers; this ticket should not change their contracts or behavior.
- Preserve desktop behavior unless a shared component has explicit desktop checks.
- No backward-compatibility duplicate UI modes should be introduced; replace redundant mobile presentation cleanly.
- Preserve accessibility semantics when visible labels are removed.
- The Android shell loads `/mobile` from the desktop/server node; web and APK freshness are separate gates.
- `autobyteus-web/docs/remote_access.md` currently documents `Message target`; docs sync should align the wording after implementation.

## Open Unknowns / Risks

- Exact browser/WebView reproduction of blank-space scroll should be validated after implementation; static layout inspection is enough for design but not final proof.
- Whether all launcher masks on target Android devices render the rescaled icon identically requires device/emulator or generated preview evidence.
- If dependency install remains unavailable, implementation must document validation limitations and hand API/E2E a clear setup requirement.

## Notes For Architect Reviewer

Design is ready for architecture review. Key architectural decision: keep all product behavior inside existing mobile owners; chat scroll containment may use shared monitor layout only when it is mobile-scoped or behavior-neutral for desktop. Do not change core stores, backend APIs, desktop journeys, create a second mobile shell, or add compatibility modes.
