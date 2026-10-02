# Real desktop incident reproduction — 2026-10-02

## Scope and setup
User explicitly asked why a full test had not been done and requested the real tool path. This is additional causal investigation of the unchanged release, not implementation validation or fix approval.
Launched `pnpm --silent isolated-app start --app /Applications/AutoByteus.app` from workspace-superrepo. Installed release 1.4.92-beta.9; supported isolated profile; instance iso-52257-cc9e, control 52257, backend 52258. See instance.json. No production database/vault/session manipulation. AGY used its existing authenticated CLI capability; no key import performed.

Controlled only isolated CDP endpoint using browser-automation launcher `/Users/normy/autobyteus_org/autobyteus-skills/browser-automation/scripts/browser`, with `CHROME_REMOTE_DEBUGGING_PORT=52257 BROWSER_AUTOMATION_ATTACH_ONLY=1`; health-check, list-tabs, dom-snapshot/read-page before acting, run-script presentation helper for UI clicks/types. Initial model option was below the menu viewport; scrolled it into view before clicking. Rejected obscured clicks had no effect.

## Real user path (no mocked provider/IPC/browser)
1. New chat in isolated app: choose Antigravity CLI -> Gemini 3.8 Flash (Medium).
2. Type prompt asking exactly one configured AutoByteus MCP open_tab for `https://example.com/?autobyteus-browser-probe=20261002`, no OS open/run_command, no file changes, and stop/report result.
3. Submit through Send message UI. Built-in Daily Assistant run `daily_assistant_adf79ed263184529ae67d37d82d70b00` started. run-metadata.json verifies runtime/model/definition.
4. Agent read tool schema using view_file, invoked actual open_tab once, got tab c1c04e/status opened/title Example Domain. test-run-traces.json preserves actual execution/result. The event still has provider_state/output envelope.
5. Observed rendered Activity success; Activity selected, Browser unselected. Native IPC shell snapshot had null activeTabId and empty sessions. See after-open-state.json and agy-open-success-no-browser.png.
6. CDP target list independently showed the loaded page in the isolated Electron instance. Native page title and body verified, but viewport 0 x 0. See tabs-after-open.json and native-page-before-focus.json.
7. Manually clicked Browser through UI: shell still had no sessions. See manual-browser-empty.json. Merely switching panels is not enough to recover this orphaned projection.

## Diagnostic positive control (explicitly not a user-facing fix)
With Browser selected, called the existing isolated preload IPC `window.electronAPI.focusBrowserTab("c1c04e")`. It successfully attached that SAME tab, with title and URL intact. Shell snapshot showed c1c04e; viewport became 626 x 757, and a native screenshot rendered the loaded page. See explicit-focus-control.json, after-focus-state.json, native-page-after-focus.json/png. No source, bundle, payload or provider modification. This control verifies the focus path works when actually invoked; it is an internal diagnostic action, not a proposed normal recovery UI.

## Assertions and limitations
`node evidence/desktop/assert-desktop.cjs` (relative to ticket directory) asserts saved observations; assertions.json records PASS for the defect reproduction and control. An initial scratch assertion assumed example.com has an h1; observed DOM did not. Corrected to actual page title/body. Browser-projection assertions unchanged.
The real scenario includes model execution, tool gateway, browser engine, event conversion, streaming and rendered UI. Not an entire product regression suite; not a corrected-build validation. Original CEAC site not revisited and no form/auth work occurred. Earlier code-level reproduction remains useful in addition to this full scenario.

## Cleanup
`pnpm --silent isolated-app stop iso-52257-cc9e` succeeded gracefully; dataRootRemoved true, both ports released; cleanup.json. Follow-up list showed this instance absent; unrelated instance records left untouched.
