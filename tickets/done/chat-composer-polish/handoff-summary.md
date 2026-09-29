# Handoff Summary — chat-composer-polish

## Status

- Stage: Delivery round 1 (DR-001). The package is merged with the latest `origin/personal`, checked and docs-synced. **The user verified it on 2026-09-29 and it is finalized into `personal`.** The user did not request a release.
- Classification (preserved): `task_size=Medium`, `architectural_risk=Low`, route `Direct`. Architecture, source and test-code review: `N/A — not applicable`.
- Validation: API/E2E API-REV-001 Pass (95%, no category below 90%). Browser probe T01–T07 all pass.
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/thinking-selector-auto-enable`
- Ticket branch: `codex/thinking-selector-auto-enable` at `641bacc03` (see `release-deployment-report.md` for final push/merge state)
- Finalization target: `personal` (remote `origin`)

## Integrated State For Verification

- Bootstrap base: `origin/personal@c8c7351e5`.
- Commits on the ticket branch:
  - `3c7ad1ad0`: the implementation.
  - `f671f2c13`: delivery checkpoint with the durable browser probe, the `test:e2e:chat-composer-polish` script and the ticket artifacts.
  - `b72dbea87`: merge of `origin/personal@50c05b45f`. It brought 1 commit that only touches `tickets/done/chat-interface-entry/` delivery records. There were no conflicts and no code overlap.
  - `641bacc03`: delivery docs sync.
- Uncommitted: only this round's delivery artifacts in this folder.
- Excluded untracked build output from the local build: `autobyteus-application-backend-sdk/dist/`, `autobyteus-application-sdk-contracts/dist/`.

### Post-integration checks (2026-09-29, on `b72dbea87`)

| Check | Result |
| --- | --- |
| Focused vitest on the 6 changed spec files (adapter, menu model, thinking control, composer menus, workspace menu, ModelConfigSection) | 57/57 pass (`delivery-evidence/post-integration-focused-vitest.log`) |
| `guard:web-boundary`, `guard:localization-boundary`, `audit:localization-literals` (the first steps of `build:electron:mac`) | pass; see `delivery-evidence/delivery-electron-build.log` |
| Why no broader rerun | The merged commit changes only ticket docs under `tickets/done/`. The R1/R2 suites and the browser probe from API-REV-001 still hold for the code. |

## What Changed (user-facing)

- **Thinking menu (New chat).** For models with an on/off switch (Claude SDK `thinking_enabled`, DeepSeek-style `thinking_type`), the menu is one list: Off · Low · Medium · High · Xhigh · Max, or Off · On when there are no levels.
  - Picking a level turns thinking on at that level. Off turns it off.
  - Exactly one row is checked.
  - The button shows the level in use, "On", or "Off", and the bulb is muted when off.
  - Budget and display settings appear below a divider; changing one also turns thinking on.
  - Codex and other models without a switch keep the old per-parameter menu.
- **Run settings / launch form.** Changing an Advanced thinking setting while Thinking is off turns Thinking on (REQ-008).
- **Workspace search (New chat).** A search box is focused on open and filters by name or path. There is an empty state, and "Open another folder…" is always shown. Arrow keys and Enter work; Escape closes.
- **Placement.** The New chat composer sits lower: bottom bias 14vh → 6vh.

## Validation Evidence

- API/E2E: `api-e2e-execution-coverage-report.md` (API-REV-001 Pass).
  - R1: focused vitest 807/807.
  - R2: full `test:nuxt`, 3357 pass. The 8 failures in 11 files are the pre-existing baseline and touch no changed file.
  - Browser probe T01–T07 (`pnpm test:e2e:chat-composer-polish`); evidence in `api-e2e-evidence/`.
- Docs: `docs-sync-report.md` — `autobyteus-web/docs/chat.md` and `autobyteus-web/docs/settings.md` updated.

## How To Verify (suggested)

1. Quit any running AutoByteus, then open the local build (User Verification below).
2. **Thinking:** on a New chat with a Claude SDK model, open the thinking menu. It should be one list, Off · Low … Max. Pick High: the button reads "High". Pick Off, then Medium.
3. **Run settings:** start a chat with thinking Off. In ⚙ → Advanced, change the effort; Thinking should switch on.
4. **Workspace search:** open the workspace menu and type part of a name or path. Try ↓ / Enter / Escape, and a query with no match.
5. **Placement (AC-009, user judgment):** the composer should sit a little lower than before, with nothing clipped at small window heights. If you want a different offset, say so.

## Residual Risks / Observations

- AC-002 (DeepSeek V4) and AC-003 (Anthropic API budget) are proven by unit/component tests only; there were no provider keys for live catalogs.
- The IME guard was verified with a synthetic `isComposing` event.
- Pre-existing, out of scope:
  - The server still sends `reasoning_effort` while thinking is off.
  - For a preselected model, the thinking control appears about 2 s after load, once the catalog arrives.
- Environment: this worktree's `autobyteus-application-sdk-contracts` had no `dist/`. That is unrelated to this change.

Rejected items go to `/solution_designer`.

## User Verification

- Status: **Verified 2026-09-29.** The user said: "The task is done. lets finalize". `origin/personal` was re-fetched after verification and was unchanged at `50c05b45f`, so no renewed verification is needed.
- **Test build (2026-09-29, from `641bacc03`):** a local unsigned macOS ARM64 build made with `NO_TIMESTAMP=1 APPLE_TEAM_ID= pnpm build:electron:mac`.
  - Log: `delivery-evidence/delivery-electron-build.log` (exit 0). The web-boundary and localization guards, the server `build:full` and its bootstrap smoke all passed.
  - App: `/Users/normy/autobyteus_org/autobyteus-worktrees/thinking-selector-auto-enable/autobyteus-web/electron-dist/mac-arm64/AutoByteus.app`
  - Installer: `autobyteus-web/electron-dist/AutoByteus_enterprise_macos-arm64-1.4.91.dmg` / `.zip`
  - The flavor resolved to `enterprise` because the branch is not `personal`. In `build/scripts/build.ts` the flavor only sets the artifact file name, so the app itself is the same.
  - The version string is the base's `1.4.91`; it is not a new release.

## Release

- `release-notes.md` is prepared. The user asked to finalize only, so no release was published. The notes remain available for a later release that includes this change.
