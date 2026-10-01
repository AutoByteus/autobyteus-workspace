# Implementation Revision Record — chat-composer-menus-open-upward

The current code and `implementation-handoff.md` remain authoritative.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Solution Designer / `handoff-architecture-design-complete.md` / initial | N/A | `Initial Baseline` | SR-004; ARCH-REV N/A; CRR N/A; API-REV N/A; DR N/A | Implementation complete; handed to API/E2E on the direct Small/Low route |

## Revision Entries

### IR-001 — Initial implementation of upward-opening new-chat composer menus

- Triggering role, report path, and round: Solution Designer, `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-composer-menus-open-upward/tickets/in-progress/chat-composer-menus-open-upward/handoff-architecture-design-complete.md`, initial round
- Triggering finding IDs: N/A
- Classification: `Initial Baseline`
- Prior authoritative result: `N/A`
- Current authoritative result: `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-composer-menus-open-upward/tickets/in-progress/chat-composer-menus-open-upward/implementation-handoff.md` and the branch `codex/chat-composer-menus-open-upward`
- Related solution revision IDs: `SR-004`
- Related architecture-review revision IDs: `N/A`
- Related code-review revision IDs: `N/A`
- Related API/E2E revision IDs: `N/A`
- Related delivery revision IDs: `N/A`
- Why this baseline or implementation revision is recorded: first implementation handoff for the package
- Approved behavior or requirement IDs affected: BEH-001, BEH-002 (changed); BEH-003, BEH-004 (preserved); REQ-001–004; AC-001–005
- Implementation delta:
  - `useAnchoredPopover`: opt-in `{ placement: 'above' }` policy measured from the menu's containing block; `auto` unchanged.
  - `ChatMessageInput`, `ChatWorkspaceMenu`, `ChatModelMenu`, `ChatThinkingControl`: opt in and apply non-narrow `maxHeight`.
  - `ChatTargetMenu`, `ChatSkillMenu`: `min-h-0` on root and list.
  - `ChatModelMenu`: flyout bottom-aligned with a computed list height; `flyoutOffset` removed.
  - `ChatNewSurface`: `pt-[14vh] pb-10`.
- Changed files or areas: `autobyteus-web/composables/popover/`, `autobyteus-web/components/chat/` (8 source files, 5 spec files)
- Local validation and result: focused tests 82/82; full web unit suite 3398 passed with 4 failures that also fail on base source; repo guards passed; rendered check 39/39 at five viewports. Typecheck could not be obtained (tooling issue described in the handoff).
- Next recipient or routing: `/software_engineering_team/api_e2e_engineer` (rule: implementation complete, Small/Medium + Low, direct API/E2E)
- Remaining limitations or risks: probe case T06 in `chat-composer-polish-probe.mjs` is stale; VIS-010 and the Thinking scroll path were not rendered locally; `docs/chat.md:91` is stale for Delivery.
