# Release Notes — Isolated app instances for agents

## New

- **Agents can run a separate, isolated AutoByteus instance.** `pnpm isolated-app start | list | stop | restart` launches the desktop app with its own ports, its own data root and its own process group. The main app keeps running untouched. Every command prints one JSON value. See `docs/isolated-app-instances.md`.
- **Isolated instances never inherit production settings.** In an isolated instance, the embedded server receives only a baseline set of environment variables plus the values Electron sets itself. Normal launches are unchanged.
- **Updates are disabled in isolated instances.** They show no update checks or toasts, and Settings → About shows "Disabled".
- **Build support check.** Packaged builds now carry an isolated-launch marker. `pnpm isolated-app` refuses builds without it (`APP_ISOLATION_UNSUPPORTED`). Installed releases up to 1.4.91-beta.5 are refused, so use a worktree build (`--from-worktree`/`--build`) or a release that includes this change. Packed Linux AppImages must be extracted first (`APPIMAGE_EXTRACTION_REQUIRED`).

## Known limitations

- Linux has not been validated yet. Validation was on macOS; Linux will be validated after release.
- Windows is not supported by `pnpm isolated-app`.
- An agent working *inside* an instance started via `pnpm isolated-app` may not find `pnpm`/nvm tools on its terminal PATH. A follow-up is under consideration.

## Related (autobyteus-mcps, browser-automation)

- New tools `start_recording` / `stop_recording` (CLI `start-recording` / `stop-recording`) record a tab to MP4 in the background.
- New `BROWSER_AUTOMATION_ATTACH_ONLY=1` attaches to an existing debugging port and never launches a browser.
- `run_script` now has a built-in presentation helper (visible cursor, captions) and supports async arrow scripts.
