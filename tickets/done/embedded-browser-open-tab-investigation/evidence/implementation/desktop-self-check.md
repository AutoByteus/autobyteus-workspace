# IR-001 rendered desktop self-check — 2026-10-02

Implementation feedback loop only; not independent API/E2E sign-off.

## Build / isolation
- Source commit e67f6f4f3; worktree build version 1.4.92-beta.9. Command: pnpm --silent isolated-app start --build. Build succeeded, including server/shared compilation, sanitized bootstrap smoke, web guards, Nuxt generation, Electron transpilation and packaging.
- Packaged converter is byte-identical to worktree dist; SHA-256/path in desktop-build-identity.json. No installed-app substitution.
- Instance iso-58986-bbda; control 58986 / backend 58987. Fresh test-owned data root; user's running app/data never used.
- Browser-automation launcher: /Users/normy/autobyteus_org/autobyteus-skills/browser-automation/scripts/browser, always with CHROME_REMOTE_DEBUGGING_PORT=58986 BROWSER_AUTOMATION_ATTACH_ONLY=1. Health-check/list-tabs/DOM observation preceded interaction.
- Existing authenticated AGY CLI; no credentials imported or production vault read.

## Observed interaction
1. New chat, selected Antigravity CLI and Gemini 3.8 Flash (Medium) through UI. Model choice required scrolling the menu entry into view.
2. Daily Assistant run daily_assistant_920ef0b06be944fa91ed062f8e9e0a6c received a narrow prompt through textarea/Send message. Real tool read its schema and invoked own MCP open_tab for the harmless URL ending IR001, reuse_existing=false. No mocked provider/IPC.
3. First result 9a16eb was canonical and automatically assigned to the shell. My later Activity click overwrote panel selection before that state was captured; do not claim the first screenshot proves automatic Browser selection.
4. Asked for a second URL ending IR001-repeat. Initial typing was correctly blocked by the responsive drawer backdrop, with no submission. Closed backdrop via UI click, typed/submitted, immediately selected Activity through UI while the model ran. No Browser click or focus IPC was issued.
5. On completion, snapshot activeTabId=f23a11 matched the second canonical tool result; both sessions remained assigned. Browser aria-selected=true and Activity=false. Native target had the same URL/title, real DOM content and positive 400 × 608 viewport.
6. Main renderer and native screenshots inspected directly. Existing browser tab titles, selected-session styling and address controls are consistent. At 1200 × 768 the existing tools drawer overlays chat (expected responsive layout); native content captured separately because main-renderer CDP screenshots do not include the WebContentsView. No visual code changes or in-scope polish defects identified.

## Evidence
desktop-start.json; desktop-build.log; desktop-build-identity.json; desktop-submit.json; desktop-before.json; desktop-activity.json; desktop-repeat-submit.json (rejected obscured typing retained); desktop-repeat-submit-from-activity.json; desktop-repeat-after.json; desktop-tabs.json; desktop-open-events.json; desktop-run-metadata.json; desktop-native.json; desktop-browser-selected.png; desktop-native.png; desktop-observation-checks.json.

Saved observation checks correlate tool-result IDs, shell selection, Browser state, native URL/body and positive bounds. The only inspection IPC was read-only getBrowserShellSnapshot. No focusBrowserTab, payload injection or store mutation.

## Cleanup / limits
Stopped only iso-58986-bbda via isolated-app stop. desktop-cleanup.json confirms graceful stop, data root removed and ports released; desktop-list-after-cleanup.json confirms absence.
Independent owner still must extend/run durable MCP transport/history coverage and perform its own fixed-build repeat journey, preferably a test-owned local page. Saved-run reopen, broader viewports, other live runtimes, IPC failure handling and historical-session behavior were not exercised here. Existing unit guards cover remote/unavailable suppression. No claim all intermittent failures are fixed.
