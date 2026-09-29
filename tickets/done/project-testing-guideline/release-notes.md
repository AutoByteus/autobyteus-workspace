# Release Notes — Testing guideline and page-dialog handling

## New

- **`TESTING.md`: one testing guideline for the workspace.** It covers the test layers and their commands, which path to choose for a change (browser dev path, isolated desktop instance, packaged harness, real providers), and the safety rules. It is linked from the README, the `AGENTS.md` files and the isolated-instance guide.

## Changed (autobyteus-mcps, browser-automation)

- **The agent now answers page dialogs.** Previously, `alert`/`confirm`/`prompt`/"Leave site?" dialogs raised during a command were silently cancelled, and the command still reported success. Now:
  - `run-script` and `navigate` accept `--dialog accept|dismiss` (and `--prompt-text`). The MCP equivalents are `dialog`/`prompt_text`.
  - Without a decision, the dialog is dismissed only to unblock the page, and the command fails with `DIALOG_DECISION_REQUIRED` and the dialog's message. Repeat the action with your decision.
  - `alert`s are closed and reported. Results list the command's own dialogs in `dialogs`.
- **A tab blocked by a dialog is reported quickly.** Instead of a misleading `BROWSER_UNAVAILABLE` after about 20 s, commands fail within about 8 s with `PAGE_BLOCKED`, listing the open tabs and remedies.

## Known limitations

- Dialogs left open between commands, or in other tabs, must be answered on screen: by the user, or with an OS-level screen-control tool where available.
- Electron apps (including AutoByteus) have no `window.prompt()`, so `--prompt-text` applies to browsers only.
- `list-tabs` can be slow with very many tabs (100+). This is pre-existing.
