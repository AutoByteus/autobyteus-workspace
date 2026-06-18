# Investigation Notes

## Investigation Status

- Bootstrap Status: `Complete`
- Current Status: `Investigation complete; requirements approved; design produced`
- Investigation Goal: Determine the existing UI navigation/routing ownership for promoting `Nodes` to the home/workspace sidebar and removing `Media` from that sidebar.
- Scope Classification: `Medium`
- Scope Classification Rationale: The visible change is small, but the current shell primary navigation contract is duplicated in two components (`AppLeftPanel.vue` and `LeftSidebarStrip.vue`). A healthy implementation should centralize that menu/route/active-state policy while adding a `/nodes` page that reuses the existing `NodeManager` owner.
- Scope Summary: Move node-management access from settings/sidebar-only discoverability to first-level home/workspace navigation; remove first-level `Media` nav item; preserve node-management behavior; avoid duplicating shell navigation policy.
- Primary Questions Resolved:
  - Home/workspace sidebar ownership: `autobyteus-web/components/AppLeftPanel.vue` for expanded left panel and `autobyteus-web/components/layout/LeftSidebarStrip.vue` for collapsed icon strip.
  - `Media` route exists as `autobyteus-web/pages/media.vue`; menu entry is declared independently in both shell nav components.
  - Node management owner is already componentized as `autobyteus-web/components/settings/NodeManager.vue`, currently mounted only by `autobyteus-web/pages/settings.vue` when `activeSection === 'nodes'`.
  - `NodeManager` already reads `route.query.nodeTab`, so it can be reused by a dedicated `/nodes` page without duplicating node operations.

## Request Context

User request on 2026-06-18: "i want to move the nodes as a separate menu item under the home page. and remove the Media menu item. Because i have never used the Media menu item now. I will start to use this nodes more and more in the future. please analyse"

Reference screenshots:

- `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_2990c249917f45bc90ceb7d3afe9e17d/solution_designer_6cea066c071f4e48b18a893db3605130/context_files/ctx_14aa45dc35c5__image.png`
- `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_2990c249917f45bc90ceb7d3afe9e17d/solution_designer_6cea066c071f4e48b18a893db3605130/context_files/ctx_044260ef8c22__image.png`

## Environment Discovery / Bootstrap Context

- Project Type: `Git`
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/home-nodes-menu`
- Current Branch: `codex/home-nodes-menu`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo`
- Bootstrap Base Branch: `origin/personal`
- Remote Refresh Result: `git fetch origin --prune` completed before worktree creation; tag `v1.3.59` fetched.
- Task Branch: `codex/home-nodes-menu`
- Expected Base Branch: `origin/personal`
- Expected Finalization Target: `origin/personal`
- Bootstrap Blockers: `None`
- Notes For Downstream Agents: Source code edits are locked until requirements/design review gates are complete.

## Source Log

| Date | Source Type | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-06-18 | Command | `pwd && git rev-parse --show-toplevel && git status --short --branch && git remote -v && git branch --show-current && git symbolic-ref refs/remotes/origin/HEAD` | Resolve repo/worktree/base context | Repository root is `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo`; current shared checkout on `personal` with untracked `.article-work/` and `docs/articles/`; remote default `origin/personal` | No |
| 2026-06-18 | Command | `git worktree list --porcelain && git fetch origin --prune` | Check existing worktrees and refresh remote refs before ticket branch/worktree creation | No matching `home-nodes-menu` worktree existed; fetch completed and fetched tag `v1.3.59` | No |
| 2026-06-18 | Command | `git worktree add -b codex/home-nodes-menu /Users/normy/autobyteus_org/autobyteus-workspace-superrepo origin/personal` | Create dedicated ticket worktree/branch | Dedicated branch/worktree created at `7e507be0` | No |
| 2026-06-18 | Data | User screenshots listed in request context | Understand desired UI placement | `Nodes` appears under settings; `Media` appears in home/workspace sidebar | No |
| 2026-06-18 | Command | `find autobyteus-web -maxdepth 3 -type f \( -name '*.vue' -o -name '*.ts' -o -name '*.mts' \)` | Identify frontend structure | Relevant shell, settings, pages, tests live under `autobyteus-web` | No |
| 2026-06-18 | Command | `rg -n "shell\.navigation|navigation|Media|settings|nodes|NodeManager|Sidebar|side" autobyteus-web --glob '!node_modules' --glob '!dist' --glob '!*.generated.ts'` | Locate sidebar and node/media code | `AppLeftPanel.vue` and `LeftSidebarStrip.vue` declare duplicated shell nav; `pages/media.vue` exists; `pages/settings.vue` mounts `NodeManager` | No |
| 2026-06-18 | Code | `autobyteus-web/components/AppLeftPanel.vue` | Inspect expanded home/workspace sidebar | Duplicates primary nav key union, item list, route resolution, and active-route checks. Contains `media` item mapping to `/media`. | Yes: refactor into shared shell navigation model |
| 2026-06-18 | Code | `autobyteus-web/components/layout/LeftSidebarStrip.vue` | Inspect collapsed icon strip sidebar | Same duplicated primary nav key union, item list, route resolution, and active-route checks. Contains `media` item mapping to `/media`. | Yes: reuse shared model |
| 2026-06-18 | Code | `autobyteus-web/pages/settings.vue` | Inspect settings node mounting and query behavior | `NodeManager` is imported and mounted when `activeSection === 'nodes'`; `nodes` is a valid settings section; `?section=nodes` initializes it. | Decide whether settings `Nodes` remains or is removed |
| 2026-06-18 | Code | `autobyteus-web/components/settings/NodeManager.vue` | Inspect node-management ownership and route assumptions | Self-contained node UI; owns tabs via `nodeTab` query; initializes node and remote browser sharing stores; can be reused from `/nodes`. | No |
| 2026-06-18 | Code | `autobyteus-web/pages/media.vue` | Determine impact of removing menu item | Media library page exists and is more than a menu label. User requested menu removal, not necessarily backend/media-route decommission. | Decide if page remains deep-linkable |
| 2026-06-18 | Code | `autobyteus-web/localization/messages/en/shell.ts`, `autobyteus-web/localization/messages/zh-CN/shell.ts` | Inspect navigation labels | Shell nav has `shell.navigation.media`; no `shell.navigation.nodes`. | Add `nodes` label, remove unused `media` shell nav label if no longer referenced |
| 2026-06-18 | Code | `autobyteus-web/middleware/mobileFeatureGate.global.ts`, `autobyteus-web/utils/mobileFeatureGates.ts` | Inspect route feature gates | `/settings` is gated as `desktopSettings`; `/nodes` does not yet map to a mobile feature. | Add `/nodes` to `desktopSettings` gate if new page is desktop-only |
| 2026-06-18 | Code | `autobyteus-web/components/__tests__/AppLeftPanel.spec.ts`, `autobyteus-web/components/layout/__tests__/LeftSidebarStrip.spec.ts`, `autobyteus-web/middleware/__tests__/mobileFeatureGate.global.spec.ts` | Identify likely test impact | Existing tests assert old localized nav content in component files and application capability behavior. They should be updated to assert shared nav and Nodes/Media expectations. | Yes |
| 2026-06-18 | Command | `rg -n "Settings -> Nodes|Settings > Nodes|Settings.*Nodes|section=nodes|settings.page.sections.nodes|shell.navigation.media" autobyteus-web autobyteus-android autobyteus-ios docs autobyteus-server-ts/README.md` | Find docs/copy references affected by moving nodes out of settings | Found stale references in docs, Android/iOS recovery copy/tests, web mobile pairing copy, and shell/settings localization/code. | Yes: update during implementation/docs sync |

## Current Behavior / Current Flow

- Current entrypoint or first observable boundary: Default Nuxt shell layout (`autobyteus-web/layouts/default.vue`) renders either `AppLeftPanel` when the left panel is expanded or `LeftSidebarStrip` when collapsed.
- Current execution flow:
  - Expanded shell: `layouts/default.vue` -> `AppLeftPanel.vue` -> local `allPrimaryNavItems` includes `media` -> `navigateToPrimary('media')` -> `/media` -> `pages/media.vue`.
  - Collapsed shell: `layouts/default.vue` -> `LeftSidebarStrip.vue` -> local `allPrimaryNavItems` includes `media` -> `handlePrimaryClick('media')` -> `/media` -> `pages/media.vue`.
  - Settings nodes: `/settings` -> `pages/settings.vue` -> sidebar button sets `activeSection = 'nodes'` -> `NodeManager` renders node management tabs and controls.
  - Deep-link settings nodes: `/settings?section=nodes` -> `onMounted()` normalizes section and sets `activeSection = 'nodes'`.
- Ownership or boundary observations:
  - `NodeManager.vue` is already the correct feature owner for node-management behavior; new home access should not duplicate node operations or stores.
  - Shell primary navigation policy is duplicated across two UI presentation components, so a route/menu change must currently be made twice.
  - Media has both a route/page owner and a menu entry; removing the menu does not inherently require deleting media storage/backend/tool behavior.
- Current behavior summary: User must access nodes from settings. Media is first-level in the home/workspace sidebar in both expanded and collapsed presentations.

## Design Health Assessment Evidence

- Change posture: `Behavior Change`
- Candidate root cause classification: `Duplicated Policy Or Coordination`
- Refactor posture evidence summary: Refactor is recommended now because the exact shell primary navigation contract is duplicated in `AppLeftPanel.vue` and `LeftSidebarStrip.vue`. Adding `Nodes` and removing `Media` by editing both places would preserve the existing drift risk.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| `AppLeftPanel.vue` | Defines `PrimaryNavKey`, `allPrimaryNavItems`, `resolvePrimaryRoute`, and `isPrimaryNavActive` | Expanded sidebar owns navigation policy locally | Extract shared shell primary navigation model |
| `LeftSidebarStrip.vue` | Repeats same primary nav definitions and route/active logic | Collapsed sidebar duplicates same policy | Extract shared shell primary navigation model |
| `NodeManager.vue` | Self-contained feature component with store initialization and tab routing | New `/nodes` page can reuse the existing feature owner | Add page wrapper only |
| `pages/settings.vue` | Mounts `NodeManager` only as a settings section | Current IA treats nodes as settings; user wants home-level access | Decide whether to remove settings nav entry |
| `pages/media.vue` | Full media library page exists | User asked to remove menu item; deleting page/backing APIs is larger and unnecessary unless explicitly approved | Keep route/page by default; remove from shell nav only |
| `mobileFeatureGates.ts` | `/settings` is gated as desktop settings; `/nodes` is not gated | New `/nodes` route could be incorrectly considered available in mobile remote runtime | Gate `/nodes` as `desktopSettings` |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-web/layouts/default.vue` | Default shell composition | Chooses expanded panel vs collapsed icon strip | No direct change expected; shell nav owners live in child components |
| `autobyteus-web/components/AppLeftPanel.vue` | Expanded left sidebar, including primary nav and run tree | Duplicates navigation contract | Should consume shared shell primary navigation model |
| `autobyteus-web/components/layout/LeftSidebarStrip.vue` | Collapsed icon strip primary nav + settings button | Duplicates navigation contract | Should consume shared shell primary navigation model |
| `autobyteus-web/components/settings/NodeManager.vue` | Node management UI and operations | Already reusable; depends on route query only for `nodeTab` | Should remain node-management owner and be mounted from `/nodes` |
| `autobyteus-web/pages/settings.vue` | Settings page section nav and section mounting | Currently hosts `NodeManager` under `nodes` section | Needs approved decision: remove settings entry or keep duplicate access |
| `autobyteus-web/pages/media.vue` | Media library page | Existing page should not be deleted merely because menu item is removed | Keep unless future explicit decommission request |
| `autobyteus-web/localization/messages/en/shell.ts` | English shell labels | Has `media`, lacks `nodes` | Update shell labels |
| `autobyteus-web/localization/messages/zh-CN/shell.ts` | Chinese shell labels | Has `media`, lacks `nodes` | Update shell labels |
| `autobyteus-web/utils/mobileFeatureGates.ts` | Route-to-feature mapping for mobile runtime gate | New route requires gate mapping | Add `/nodes` -> `desktopSettings` |
| `autobyteus-web/components/__tests__/AppLeftPanel.spec.ts` | Static regression for expanded shell nav | Assumes nav literals in component file | Update to shared-nav expectations |
| `autobyteus-web/components/layout/__tests__/LeftSidebarStrip.spec.ts` | Collapsed shell nav behavior tests | Should assert Nodes present and Media absent | Update/add tests |
| `autobyteus-web/middleware/__tests__/mobileFeatureGate.global.spec.ts` | Mobile route gate tests | Needs `/nodes` case | Add test |

## Runtime / Probe Findings

No runtime execution was needed for design analysis. Findings are from static code inspection.

## External / Public Source Findings

No external/public sources used; this is repository-local product behavior.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: For implementation validation, likely frontend unit tests under `autobyteus-web` are enough for navigation model/page gating; E2E/manual check can verify rendered sidebar click.
- Required config, feature flags, env vars, or accounts: Applications nav capability mock is already used in existing tests; no account expected.
- External repos, samples, or artifacts cloned/downloaded for investigation: None.
- Setup commands that materially affected the investigation: Dedicated worktree creation only.
- Cleanup notes for temporary investigation-only setup: None.

## Findings From Code / Docs / Data / Logs

1. The target home/workspace shell has two visual presentations that must stay equivalent:
   - expanded `AppLeftPanel`
   - collapsed `LeftSidebarStrip`
2. Both presentations currently embed the same shell nav model. This is the main design smell exposed by the task.
3. `NodeManager` is ready to be reused from a new page wrapper; no node store/API redesign is needed.
4. `Media` removal should be interpreted as shell menu removal, not media subsystem deletion, unless the user explicitly asks to retire media storage/library functionality.
5. If the settings `Nodes` item is removed as a true move, documentation and mobile recovery copy that says `Settings -> Nodes` will need update during docs/copy sync.

## Constraints / Dependencies / Compatibility Facts

- Source-code edits are prohibited during analysis/design stages.
- Preserve existing node-management functionality while changing discoverability/navigation.
- Avoid retaining duplicate shell navigation policy in the target design.
- Avoid deleting media backend/page behavior unless explicitly approved; menu removal and feature decommission are separate scopes.

## Open Unknowns / Risks

- Product decision resolved on 2026-06-18: user approved the recommended clean move. `Nodes` becomes top-level only and is removed from the Settings sidebar/section routing.
- Exact icon choice for `Nodes`. Recommendation: use the existing settings nodes icon family (`heroicons:circle-stack` / `i-heroicons-circle-stack-20-solid`) in shell nav for continuity.
- Whether `/media` should remain deep-linkable. Recommendation: yes, keep the page and backend media behavior; only remove the home/workspace menu item.

## Notes For Architect Reviewer

If the user approves the clean move, the design should require:

- Shared shell primary navigation model owner to eliminate duplicated route/menu/active logic.
- New `/nodes` page wrapper that mounts existing `NodeManager`.
- Removal of `media` from shell primary nav only, not media subsystem decommission.
- Decision on settings `nodes` entry before architecture review.
