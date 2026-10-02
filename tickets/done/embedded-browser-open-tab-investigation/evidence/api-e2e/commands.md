# Independent API/E2E commands
All repository commands from /Users/normy/autobyteus_org/autobyteus-worktrees/embedded-browser-open-tab-investigation.
Date 2026-10-02. Node v22.23.1, pnpm 10.28.2, macOS arm64 26.5.2. AGY 1.2.15.
## Repository
- C-001: `pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-execution/backends/antigravity/agy-stream-event-converter.test.ts tests/unit/agent-tools/browser/browser-mcp-result-normalizer.test.ts tests/unit/run-history/projection/raw-trace-to-historical-replay-events.test.ts --no-watch` → c001.log.
- All following AGY commands prefix `RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND="$PWD/autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs"`.
- C-002: `AGY_MCP_EVIDENCE_DIR="$PWD/tickets/in-progress/embedded-browser-open-tab-investigation/evidence/api-e2e" pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/agy-mcp-tool-call-transport.e2e.test.ts --no-watch` → c002.log.
- C-003: `pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/agy-failure-transport.e2e.test.ts tests/e2e/runtime/agy-background-task-transport.e2e.test.ts tests/e2e/runtime/agy-native-image-step-output.e2e.test.ts tests/e2e/run-history/run-projection-toolcalls-graphql.e2e.test.ts --no-watch` → c003.log; identical after fixture maintenance → c003-rerun.log.
- Final combined: same C-003 command plus tests/e2e/runtime/agy-mcp-tool-call-transport.e2e.test.ts and AGY_MCP_EVIDENCE_DIR as above → final-server-e2e.log.
- C-004: `pnpm -C autobyteus-web test:nuxt services/agentStreaming/browser/__tests__/browserToolExecutionSucceededHandler.spec.ts tests/integration/web-boundary-guard.integration.test.ts --run` → c004-renderer.log.
- C-004: `pnpm -C autobyteus-web test:electron electron/browser/__tests__/browser-shell-controller.spec.ts electron/browser/__tests__/browser-tab-manager.spec.ts --run` → c004-electron.log.
- `git diff --check`, `node evidence/api-e2e/assert-desktop.cjs` (actual script path under ticket).

## Desktop / local fixture
- `shasum -a 256 autobyteus-server-ts/dist/agent-execution/backends/antigravity/stream/agy-stream-event-converter.js autobyteus-web/electron-dist/mac-arm64/AutoByteus.app/Contents/Resources/server/dist/agent-execution/backends/antigravity/stream/agy-stream-event-converter.js` → build-identity.txt.
- `pnpm --silent isolated-app start --from-worktree` → desktop-start.json.
- `node tickets/in-progress/embedded-browser-open-tab-investigation/evidence/api-e2e/local-page-server.cjs` → local-page-server.json. Free loopback port 60426, owned PID 40950.
- Browser launcher on every invocation: `env CHROME_REMOTE_DEBUGGING_PORT=60354 BROWSER_AUTOMATION_ATTACH_ONLY=1 bash /Users/normy/autobyteus_org/autobyteus-skills/browser-automation/scripts/browser`.
- In order: health-check; list-tabs; dom-snapshot --tab-id 442B5F9EE0EC50D2DB4E20566C910CAB; run-script with __abDemo for model selection, textarea typing, Send message, Activity, Terminate run (--dialog accept), New chat, saved run button.
- Read-only observation script: `async () => ({snapshot:await window.electronAPI.getBrowserShellSnapshot(),tabs:[...document.querySelectorAll("[role=tab]")].map(x=>({text:x.textContent,selected:x.getAttribute("aria-selected")})),text:document.body.innerText})`.
- Native observation: `() => ({url:location.href,title:document.title,text:document.body.innerText,width:innerWidth,height:innerHeight,marker:document.querySelector("#marker").textContent})`, on observed targets EE452EE1327496D6E466C30256970185 (/second) and B6F42595A65E2C99BC97AC3621ABBE8D (/third).
- screenshot --tab-id <observed ID> --output-file tickets/in-progress/embedded-browser-open-tab-investigation/evidence/api-e2e/<name>.png --viewport-only. Native and renderer captured separately per documented WebContentsView limitation.
- Read owned raw_traces_active.jsonl / run_metadata.json from desktop-start.json dataRoot only; retain tool records/metadata. POST read-only GraphQL getRunProjection(runId) conversation/activities to reported backend 60355 after UI termination/reopen.
- `node tickets/in-progress/embedded-browser-open-tab-investigation/evidence/api-e2e/assert-desktop.cjs` → desktop-assertions.json.
- `pnpm --silent isolated-app stop iso-60354-9ef4`; `pnpm --silent isolated-app list` → cleanup/list receipts.
- `kill -TERM 40950` only owned local page PID; bind/release its port to verify free → local-page-cleanup.json.
No focusBrowserTab call, injected result, store mutation, manual Browser click or production app interaction.
