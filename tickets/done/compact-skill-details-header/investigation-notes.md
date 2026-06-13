# Investigation Notes: Compact Skill Details Header

## Status

Stage 1 investigation complete on 2026-06-13.

## Investigation Goals / Questions

1. Locate the frontend skill details page and identify the component that owns the large top area.
2. Determine whether the bottom file workspace can remain unchanged while only reducing the top header height.
3. Identify existing primitives for versioning controls, popover/dropdown behavior, localization, and tests.
4. Decide the scope size and implementation surface.

## Scope Triage

**Triage: Small**

Rationale:

- Expected source changes are limited to one UI component plus localization/test updates:
  - `autobyteus-web/components/skills/SkillDetail.vue`
  - `autobyteus-web/components/skills/SkillDetail.spec.ts`
  - `autobyteus-web/localization/messages/en/skills.ts`
  - `autobyteus-web/localization/messages/zh-CN/skills.ts`
- No schema, API, server, data persistence, or cross-process boundary changes are needed.
- The existing workspace component tree (`SkillWorkspaceLoader`, `FileExplorer`, `FileExplorerTabs`) can stay in place.
- The change is a localized view-level UX adjustment with a small popover interaction.

## Sources Consulted

### User Inputs / Visual Evidence

- Reference image #1: current full skill details page. Shows the large top area with back button, large skill title, full description, version status, and `Enable Versioning`, pushing the file workspace down.
- Reference image #2: cropped top area. Confirms the top section alone consumes substantial vertical height.
- User design direction in chat:
  - Likes `one-line description + More popover/expand`.
  - Likes `compact two line header`.
  - Wants bottom/main area to stay mostly unchanged and move upward.
  - Wants testing against the already-started Electron/frontend server.

### Local Files Read

- `autobyteus-web/components/skills/SkillDetail.vue`
  - Owns the skill details header and workspace composition.
  - Current template uses `.compact-header` but renders three vertical groups:
    1. `.header-top-row` with only the back button.
    2. `.header-main-row` with large title and versioning controls.
    3. `.description` paragraph with full description.
  - Current styles use `padding: 1.25rem 2rem`, title `font-size: 2rem`, and description `font-size: 1rem; line-height: 1.5; max-width: 800px`.
  - The workspace starts after this header and is already isolated in `SkillWorkspaceLoader`, `.workspace`, `.sidebar`, and `.editor-pane`.

- `autobyteus-web/components/skills/SkillVersioningPanel.vue`
  - Already supports `mode="compact"` and is used by `SkillDetail.vue`.
  - Compact versioning controls are suitable for row 1 and do not require changes.

- `autobyteus-web/components/skills/SkillDetail.spec.ts`
  - Existing unit tests cover missing-skill state and back recovery.
  - No current tests cover the skill detail header or description behavior.

- `autobyteus-web/pages/skills.vue`
  - Owns list/detail switching.
  - `SkillDetail` receives `skillName` and emits `back`; no route change needed.

- `autobyteus-web/localization/messages/en/skills.ts`
- `autobyteus-web/localization/messages/zh-CN/skills.ts`
  - Skill UI strings are localized here.
  - New user-facing strings should be added here instead of hard-coded in Vue.

- `autobyteus-web/package.json`
  - Relevant commands:
    - `pnpm test:nuxt`
    - `pnpm test:electron`
    - `pnpm guard:localization-boundary`
    - `pnpm audit:localization-literals`
    - `pnpm dev`
    - `pnpm start` for Electron.

### Commands Run

- `git fetch origin personal`
  - Refreshed tracked remote state for Stage 0 bootstrap.

- `git worktree add -b codex/compact-skill-details-header /Users/normy/autobyteus_org/autobyteus-worktrees/compact-skill-details-header origin/personal`
  - Created dedicated ticket worktree.

- `find . -maxdepth 2 -type d`, `find . -maxdepth 2 -name package.json ...`
  - Confirmed frontend lives under `autobyteus-web` in a pnpm workspace.

- `rg -n "Skill Details|skill details|Enable Versioning|Not versioned|versioning|Skill" autobyteus-web ...`
  - Located skill detail localization and component files.

- `find autobyteus-web/components autobyteus-web/pages -iname '*Skill*' ...`
  - Confirmed skill UI component set.

- `rg -n "Popover|Tooltip|..." autobyteus-web/components autobyteus-web/composables ...`
  - Found no reusable generic popover component; existing dropdowns implement local click-outside handling.

## Current Entrypoints / Execution Boundaries

### UI Entry Point

- `autobyteus-web/pages/skills.vue`
  - Shows `<SkillsList>` until a skill is selected.
  - Shows `<SkillDetail :skillName="selectedSkillName">` for details.
  - Receives `@back` to return to list.

### Skill Detail Flow

1. `SkillDetail.vue` mounts or `skillName` changes.
2. `loadSkillDetails()` calls `useSkillStore().fetchSkill(props.skillName)`.
3. If a skill is found:
   - `skill` ref is set.
   - `loadVersions()` fetches version list only when `skill.isVersioned`.
4. Template renders:
   - header
   - `SkillWorkspaceLoader`
   - `FileExplorer`
   - `FileExplorerTabs`
   - version compare modal if requested.

### Versioning Boundary

- `SkillDetail.vue` delegates versioning UI to `SkillVersioningPanel.vue` in compact mode.
- `SkillVersioningPanel.vue` emits `enable-versioning`, `activate-version`, and `compare-versions`.
- The compact panel already renders the status badge and enable/version controls shown in the reference image.

### Workspace Boundary

- The bottom/main content is owned by:
  - `SkillWorkspaceLoader`
  - `FileExplorer`
  - `FileExplorerTabs`
- These components are below the header and can be left unchanged. Reducing header height automatically moves this workspace upward.

## Current Behavior Findings

- Despite the comment `Compact Header`, the current header still behaves like a vertical hero:
  - Back button gets its own row.
  - Title row uses a large `2rem` title.
  - Description is a separate full paragraph that can wrap to multiple lines.
- The easiest and least risky UX improvement is to make the header truly compact:
  - Merge back button and title into row 1 with versioning controls at the right.
  - Move the description into row 2 as one-line truncated secondary text.
  - Expose full description through an absolutely-positioned popover so the workspace is not persistently pushed down.

## Owners / File Placement

- UI/page ownership: `autobyteus-web/components/skills/SkillDetail.vue` is the correct owner because the header belongs specifically to the skill detail view.
- Version controls remain owned by `SkillVersioningPanel.vue`; no change needed there.
- Localization keys belong in the skill localization catalogs:
  - `autobyteus-web/localization/messages/en/skills.ts`
  - `autobyteus-web/localization/messages/zh-CN/skills.ts`
- Component tests belong beside the component in `autobyteus-web/components/skills/SkillDetail.spec.ts`.

## Constraints

- Keep workspace unchanged except vertical position gained from compact header.
- Avoid introducing a new shared popover component because this is a single localized interaction and no reusable abstraction currently exists.
- Use existing local click-outside pattern rather than adding dependencies.
- Add localized strings for new visible/ARIA text.

## Unknowns / Risks

- Exact port/path of the already-started Electron/frontend server must be discovered during Stage 7 validation.
- Browser validation may depend on the running backend data state and available skill sources.
- If existing server points at a different worktree/build than this ticket worktree, automated browser validation may need a local dev server from this worktree for implementation verification while still checking the Electron-started frontend if available.

## Design Implications

- Implement as a single view-level refactor in `SkillDetail.vue`.
- Preserve the existing `SkillVersioningPanel` API.
- Add minimal local popover state and click-outside handling to `SkillDetail.vue`.
- Add tests for:
  - compact header renders loaded skill title and versioning stub.
  - description summary renders.
  - `More` opens/closes full description popover.
