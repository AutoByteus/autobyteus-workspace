# Handoff Summary — chat-composer-menus-open-upward

## Status

- Stage: Delivery round 1 (DR-001). The package is current with `origin/personal`, checked and docs-synced. **The user accepted it on 2026-09-30 ("finalie and release a new beta") and it is finalized into `personal` (merge `ca0b17d9c`) and released as `v1.4.92-beta.2` (release commit `59144618d`).** See `release-deployment-report.md` for the final state.
- Classification (preserved): `task_size=Small`, `architectural_risk=Low`, route `Direct`. Architecture, source and test-code review: `N/A — not applicable`.
- Validation: API/E2E API-REV-001 Pass (96%, no category below 93%). AC-001–AC-005 each proven in a real browser.
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-composer-menus-open-upward`
- Ticket branch: `codex/chat-composer-menus-open-upward` at `ce3852910` → archived at `b6a9e9b58`, pushed, and merged into `personal` as `ca0b17d9c` (pushed). The worktree and local branch were removed; the remote branch was kept.
- Finalization target: `personal` (remote `origin`)

## Integrated State For Verification

- Bootstrap base: `origin/personal@57df63f07`. Fetched again on 2026-09-30 at delivery start: unchanged, so no merge was needed.
- Commits on the ticket branch:
  - `67c9e2e5f`: the implementation.
  - `f6a99b9f9`: delivery checkpoint with the durable browser probe, the `test:e2e:chat-composer-menus-open-upward` script, the polish probe T06 update and the ticket artifacts.
  - `ce3852910`: delivery docs sync (`autobyteus-web/docs/chat.md`).
- Uncommitted: only this round's delivery artifacts in this folder.
- Excluded untracked build output: `autobyteus-application-backend-sdk/dist/`, `autobyteus-application-sdk-contracts/dist/`.

### Delivery checks (2026-09-30)

| Check | Result |
| --- | --- |
| Focused vitest on the 5 changed spec files (popover composable, message input, model menu, thinking control, workspace menu) | 35/35 pass (`delivery-evidence/delivery-focused-vitest.log`) |
| `build:electron:mac` including the web-boundary and localization guards and the server build | exit 0 (`delivery-evidence/delivery-electron-build.log`) |
| Why no broader rerun | The base did not advance, so the code is exactly what API-REV-001 validated. The docs commit changes one Markdown file. |

## What Changed (user-facing)

- **Menus open upward (New chat, windows ≥640px wide).** `@` and `/` open above the message box. Workspace, Model and Thinking open above their button. The Model runtime flyout grows upward from its row.
- **Short windows.** Menus never flip down. They get shorter and their list scrolls.
- **Placement.** The New chat group sits lower: padding `pt-10 pb-[6vh]` → `pt-[14vh] pb-10` (about 56px lower in a 952px-tall window).
- **Unchanged.** The workspace hint line stays under the message box and is not covered. Windows under 640px keep the bottom sheet. The `/` menu in a running conversation is as before.

## Validation Evidence

- API/E2E: `api-e2e-execution-coverage-report.md` (API-REV-001 Pass).
  - Focused web unit tests 82/82.
  - Full web unit suite: 3382 pass; 7 failures in 10 files, none touched by this ticket.
  - Browser probe U01–U06 (`pnpm -C autobyteus-web test:e2e:chat-composer-menus-open-upward`), two identical runs, plus a negative control against the base source.
  - Polish probe T01–T07 with the updated T06: pass.
- Docs: `docs-sync-report.md` — `autobyteus-web/docs/chat.md` updated.

## How To Verify (suggested)

1. Quit any running AutoByteus, then open the local build (User Verification below).
2. **`@` and `/`:** on a New chat, type `@` and then `/`. Each menu should appear above the message box and leave the hint line visible.
3. **Workspace, Model, Thinking:** open each from the footer. Each should open above its button. In Model, hover a runtime: the flyout should grow upward.
4. **Short window:** shrink the window height and reopen the menus. They should still open upward and scroll.
5. **Placement:** the message box should sit a bit lower than before. If you want a different offset, say so.

## Residual Risks / Observations

- OBS-1 (follow-up candidate): in a window shorter than about 330px with the page scrolled, the Model menu's runtime rows overflow its height limit. This list has no scroll region by approved design. The AC viewports are fine.
- OBS-2 (pre-existing): at 1024px wide, about 19px of the runtime flyout sits under the app sidebar. It is the same on the base.
- The packaged Electron window was not exercised by API/E2E (no shell code changed). The local build below covers it for user verification.
- `nuxt typecheck` cannot run in this repo.

Rejected items go to `/solution_designer`.

## User Verification

- Status: **Accepted 2026-09-30.** The user said: "finalie and release a new beta". `origin/personal` was re-fetched after that and was unchanged at `57df63f07`, so no renewed verification is needed.
- **Test build (2026-09-30, from `ce3852910`):** a local unsigned macOS ARM64 build made with `NO_TIMESTAMP=1 APPLE_TEAM_ID= pnpm build:electron:mac`.
  - App: `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-composer-menus-open-upward/autobyteus-web/electron-dist/mac-arm64/AutoByteus.app`
  - Installer: `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-composer-menus-open-upward/autobyteus-web/electron-dist/AutoByteus_enterprise_macos-arm64-1.4.92-beta.1.dmg` / `.zip`
  - The file name says `enterprise` because the branch is not `personal`; the flavor only sets the artifact name.
  - The version string is the base's `1.4.92-beta.1`; it is not a new release.

## Release

- The user asked for a new beta: `v1.4.92-beta.2` is published (https://github.com/AutoByteus/autobyteus-workspace/releases/tag/v1.4.92-beta.2), all four workflows succeeded. See `release-deployment-report.md`. `release-notes.md` stays archived for the next stable release (beta tags use GitHub-generated notes).
