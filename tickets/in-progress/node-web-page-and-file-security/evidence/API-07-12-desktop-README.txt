# API-07 … API-12 (autobyteus-416): isolated desktop instance evidence
# Build: `pnpm --silent isolated-app start --build` from the worktree at fa59313c67 (source da207045a5; later commits
#   change tickets/ only). Packaged worktree build autobyteus-web/electron-dist/mac-arm64/AutoByteus.app, Electron 42.11.16.
#   Start result: API-07-isolated-instance-start.json (instance iso-57276-63dd, control 127.0.0.1:57276, node 127.0.0.1:57277,
#   own data root, removed at stop: API-07-12-isolated-app-stop.json).
# Env: macOS 26 (Darwin 25.5.0) arm64, normal graphical session, 2026-11-07 21:52–22:06 UTC. The user's own AutoByteus and
#   Docker nodes were not addressed.
# Driver: probes/api-desktop-step.mjs (playwright-core connectOverCDP to the instance's control port) running one module
#   from probes/desktop-steps/ per case; pages are opened in the in-app browser with the app's own
#   window.electronAPI.openBrowserTab / navigateBrowserTab. Fixtures: probes/api-desktop-fixtures.sh (temp dir, removed).
# Embedded node log: API-07-12-embedded-node-server.log (its server-data/logs/server.log). Line 99 (f=logcheck, Origin
#   http://localhost:5173) is the run's own log-location check by curl. Electron/app log: API-07-12-isolated-app.log.
# Each case folder holds <step>-result.json ({ ok, step, at, result }) and screenshots.
# Superseded attempts kept for traceability (step defects, not product): API-08-run1-step-defect (log index off by one;
#   popup opens only once the tab is attached), API-10-run1-step-checks (Monaco nbsp; preview frame read),
#   API-12-run1-dialog (collaboration confirmation not handled), API-12-local-name-chromium-resolution.json (Chromium in
#   the app: net::ERR_NAME_NOT_RESOLVED for the Mac's own .local name, before any request; the LAN IP was used instead).
