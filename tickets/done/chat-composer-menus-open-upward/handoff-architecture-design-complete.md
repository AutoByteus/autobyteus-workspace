# Handoff — Architecture Design Complete — chat-composer-menus-open-upward

- Result classification: `Architecture Design Complete`
- From: Solution Designer (`/software_engineering_team/solution_designer`)
- Date: 2026-09-30
- Package identifier: `chat-composer-menus-open-upward`
- Current solution revision: `SR-004`
- task_size: **Small**; architectural_risk: **Low**. Route: direct implementation (independent architecture review not applicable).

## Original Request

> "look on the chat page, the input message box area is too hihg, causing the workspace dropdown goes down. i feel like its better to always make them go up and move down the input message box a bit. please talk to product prototyper for first fixing UI"

## Goal

On the new-chat page (≥640px wide), the `@`, `/`, Workspace, Model (including its runtime flyout) and Thinking menus always open upward. They shrink and scroll in short windows and never flip down. The new-chat group moves lower (`pt-[14vh] pb-10`). The narrow bottom sheet and the running-conversation `/` menu stay unchanged.

## Approval Basis

- Requirements **Approved**. The user replied "approve" on 2026-09-30 to the SR-002 baseline (REQ-001–004, AC-001–005, DEC-001–004).
- Behavior-defining supplement: the Product UI/UX spec (Approved, user-confirmed 2026-09-30) + VIS-001–VIS-010.

## Canonical Artifacts (absolute paths)

- Requirements: `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-composer-menus-open-upward/tickets/in-progress/chat-composer-menus-open-upward/requirements-doc.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-composer-menus-open-upward/tickets/in-progress/chat-composer-menus-open-upward/investigation-notes.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-composer-menus-open-upward/tickets/in-progress/chat-composer-menus-open-upward/design-spec.md`
- Solution revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-composer-menus-open-upward/tickets/in-progress/chat-composer-menus-open-upward/solution-revision-record.md`
- User screenshot: `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-composer-menus-open-upward/tickets/in-progress/chat-composer-menus-open-upward/user-screenshot-2026-09-30.png`
- Product UI/UX spec (external, Product-owned): `/Users/normy/autobyteus_org/autobyteus-web-prototype/tickets/done/chat-composer-menus-open-upward/ui-ux-spec.md`
- Final visual references: `/Users/normy/autobyteus_org/autobyteus-web-prototype/tickets/done/chat-composer-menus-open-upward/visual-references/` (VIS-001–010, manifest.json)
- Behavior matrix / validation evidence: `/Users/normy/autobyteus_org/autobyteus-web-prototype/tickets/done/chat-composer-menus-open-upward/ui-behavior-test-matrix.md`, `/Users/normy/autobyteus_org/autobyteus-web-prototype/prototype/scripts/validate-chat-composer-menus-open-upward.mjs`
- Architecture review artifacts: `N/A — not applicable` (Small/Low direct route)

## Workspace

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-composer-menus-open-upward`
- Branch: `codex/chat-composer-menus-open-upward`
- Base: `origin/personal@57df63f079363ccab4f2301213f9d8a3458f72fa`
- Finalization target: `personal`

## Design Summary (see design-spec.md for details)

1. `useAnchoredPopover.ts`: add an opt-in `{ placement: 'above' }`. The default `'auto'` is unchanged. Under `above`, the menu always opens up. `maxHeight = max(0, min(preferred, floor(box.top − 6 − 16)))`, where box is the menu's containing block: root if positioned, else `root.offsetParent`.
2. Opt in and apply non-narrow `maxHeight` in: `ChatMessageInput` (@ and /), `ChatWorkspaceMenu`, `ChatModelMenu`, `ChatThinkingControl`. Add `min-h-0` to the `ChatTargetMenu` and `ChatSkillMenu` roots and lists.
3. Model flyout: bottom-aligned (`bottom: -5px`), list max = `min(320, floor(rowBottom + 5 − 12 − 10))`; remove `flyoutOffset` (clean cut).
4. `ChatNewSurface.vue:3`: `pt-[14vh] pb-10`.
5. Do not touch `useSkillTagMenu.ts` or `agentInput/*`.

## Classification Evidence

Eight frontend files plus tests, within the existing composable/component ownership. The change is additive and opt-in, and the default behavior is preserved. There is no contract, persistence, security, concurrency or deployment impact. The prototype validated the same delta at 15/15.

## Open Risks

- The Model menu root must not get `overflow-hidden`, or the flyout would be clipped.
- jsdom has no layout, so unit tests need geometry stubs.
- `docs/chat.md:91` becomes stale (`pb-[6vh]`); Delivery handles docs sync.

## Expected Output

Implementation plus implementation-scoped checks (typecheck, lint, unit/component tests incl. new `useAnchoredPopover.spec.ts`) and `implementation-handoff.md`, then continue the standard downstream flow.

## Route Record

`get_handoff_rules` → matched "Architecture Design Complete with task_size=Small or Medium and architectural_risk=Low" → `/software_engineering_team/implementation_engineer`.
