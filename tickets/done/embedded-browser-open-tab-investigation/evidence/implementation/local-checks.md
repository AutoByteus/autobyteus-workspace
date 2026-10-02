# IR-001 implementation checks

These are implementation-scoped checks, not independent API/E2E sign-off.
Worktree: /Users/normy/autobyteus_org/autobyteus-worktrees/embedded-browser-open-tab-investigation.
Source commit: e67f6f4f3 (base 5e3cb2f720e6fc80173099075daf55594ed58de9).

## Commands and results
- `pnpm install --frozen-lockfile`: success. Fresh worktree had no node_modules. Workspace devkit bin warnings reflect not-yet-built optional workspace outputs.
- Before source fix, `pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-execution/backends/antigravity/agy-stream-event-converter.test.ts --no-watch`: **9 failed / 53 passed**. New canonical output assertions failed against the original wrapper. See converter-red.log.
- After fix, `pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-execution/backends/antigravity/agy-stream-event-converter.test.ts tests/unit/agent-tools/browser/browser-mcp-result-normalizer.test.ts tests/unit/run-history/projection/raw-trace-to-historical-replay-events.test.ts --no-watch`: **78 passed**, 3 files. See server-unit.log.
- `pnpm -C autobyteus-web test:nuxt services/agentStreaming/browser/__tests__/browserToolExecutionSucceededHandler.spec.ts --run`: **6 passed**. Canonical object/string, unrelated/missing ID, remote and unavailable guards. See renderer-unit.log.
- `pnpm -C autobyteus-web test:electron electron/browser/__tests__/browser-shell-controller.spec.ts electron/browser/__tests__/browser-tab-manager.spec.ts --run`: first attempt controller **8 passed**, manager suite unable to import Electron before its binary installation completed. After Electron's automatic installation, identical command **22 passed**. Preserve both electron-unit.log and electron-unit-retry.log.
- `pnpm -C autobyteus-server-ts exec tsc -p tsconfig.json --noEmit`: **failed**, 827 TS6059 rootDir/include configuration diagnostics. Existing unchanged config sets rootDir=src while including tests and paths to sibling source. Not a changed-source diagnostic; no out-of-scope config patch. See server-typecheck.log.
- `pnpm -C autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit`: **passed**; production build configuration. See server-build-typecheck.log (empty = no diagnostics).
- `git diff --check`: passed before source commit.

## Lightweight direct-route self-review
- Approved scope REQ-001–003/BEH-001–004 and design SR-005 retained.
- Only production delta: 7 added / 1 removed lines in AGY converter, 213 effective non-empty source lines after change. No >500 file or >220 changed-line pressure.
- Exact mcpCall.toolName comparison excludes native same-name tools and qualified third-party names. Error/denial and native-image branches remain earlier; background closure remains unchanged.
- Existing normalizer receives projected output, not the AGY envelope. No duplicated parser, output wrapper fallback, duplicated tab_id, or renderer/server import.
- Event provider_state, arguments, invocation/turn/run IDs and start/terminal deduplication preserved. Tests cover object, JSON, structured/text content, reused status, missing/null/malformed output, failures/denials and exclusions.
- Shared normalizer, window/node guards, IPC/lease/bounds ownership, native session/cookie data and history readers/writers untouched.
- Added history unit verifies historical nested and new direct payloads remain opaque and input records are not mutated.
- No new dependency, security policy, persisted schema, migration, recovery or visibility-acknowledgement mechanism.
- Task size Small / architectural risk Low confirmed. Local implementation defect, no refactor needed.
- Design's deterministic MCP transport fixture/test extension is deliberately left to API/E2E Engineer, which owns executable test authoring/execution under team workflow. No transport pass claimed here.

## Rendered build check
- pnpm --silent isolated-app start --build: passed; corrected isolated desktop inspected with real AGY. See desktop-self-check.md and desktop-observation-checks.json. Instance cleaned up. This is frontend implementation feedback, not API/E2E sign-off.
