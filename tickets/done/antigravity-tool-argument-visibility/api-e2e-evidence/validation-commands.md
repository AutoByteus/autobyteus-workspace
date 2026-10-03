# API-REV-001 executable commands
Working directory for all commands: `/Users/normy/autobyteus_org/autobyteus-worktrees/antigravity-tool-argument-visibility` (W). Ticket T is `W/tickets/in-progress/antigravity-tool-argument-visibility`. All output logs under T/api-e2e-evidence (E). These commands were executed, not merely proposed. No parallel server Vitest invocation sharing the project test DB.

## New deterministic transport, final exit0 / 4 tests
```bash
AGY_ARGUMENT_LEDGER="$PWD/tickets/in-progress/antigravity-tool-argument-visibility/api-e2e-test-case-ledger.md" \
RUN_AGY_FAILURE_E2E=1 \
ANTIGRAVITY_CLI_COMMAND="$PWD/autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs" \
pnpm -C autobyteus-server-ts exec vitest run \
 tests/e2e/runtime/agy-native-tool-arguments-transport.e2e.test.ts --no-watch
```
Hoisted disposable HOME before server/provider imports; new source/disk/WS/restore fixtures. Test-owned application root removed by afterAll. Native-transport initial log retained; final log contains corrected exact metadata binding and final optional ledger instrumentation.

## Preserved server regression, exit0 / 266 tests
```bash
RUN_AGY_FAILURE_E2E=1 \
ANTIGRAVITY_CLI_COMMAND="$PWD/autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs" \
pnpm -C autobyteus-server-ts exec vitest run \
 tests/unit/agent-execution/backends/antigravity \
 tests/unit/agent-memory/runtime-tool-trace-sequencer.test.ts \
 tests/e2e/runtime/agy-failure-transport.e2e.test.ts \
 tests/e2e/runtime/agy-background-task-transport.e2e.test.ts \
 tests/e2e/runtime/agy-mcp-tool-call-transport.e2e.test.ts \
 tests/e2e/runtime/agy-native-image-step-output.e2e.test.ts --no-watch
```
23 passed files, 3 opt-in skipped files; 266 passed tests, 5 skipped. No skipped provider suite counted as evidence. CLI fixture selected transports real server; units control only needed provider/time dependencies. Project Vitest reset normal worktree `server/tests/.tmp/autobyteus-server-test.db`.

## Compiler and syntax/whitespace checks, final exit0
```bash
pnpm -C autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit
cp "$PWD/tickets/in-progress/antigravity-tool-argument-visibility/api-e2e-evidence/test-tsconfig.json" \
 autobyteus-server-ts/tsconfig.agy-api-check.json
pnpm -C autobyteus-server-ts exec tsc -p tsconfig.agy-api-check.json
rm autobyteus-server-ts/tsconfig.agy-api-check.json
node --check autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs
node --check autobyteus-server-ts/tests/fixtures/agy-native-arguments-turn.mjs
git diff --check 990b2ffea..b297e0042e8eaf02f53af6048199c57af7587069 -- \
 autobyteus-server-ts/tests/e2e/runtime/agy-native-tool-arguments-transport.e2e.test.ts \
 autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs \
 autobyteus-server-ts/tests/fixtures/agy-native-arguments-turn.mjs
```
Source/test scoped diff check exits0. Artifact-inclusive cached check later flagged seven raw logs for emitted blank lines at EOF; preserved unedited evidence, not claimed a full artifact-inclusive whitespace Pass. Focused config includes source + new E2E test; ws maps to already installed workspace @types/ws 8.18.1. Initial missing declaration TS7016 retained; no ambient-any/dependency change. General tsconfig existing upstream TS6059 is not claimed passed.

## Current native provider + integrated renderer probe, final exit0
Temporary source E/live-rendered-probe.ts has exact startup/prompt/assertions/cleanup. Reproduce by copying it to the same depth indicated below; no runtime-source mocks, no credentials copying:
```bash
cp "$PWD/tickets/in-progress/antigravity-tool-argument-visibility/api-e2e-evidence/live-rendered-probe.ts" \
 autobyteus-server-ts/tests/e2e/runtime/agy-native-arguments-validation.tmp.test.ts
unset ANTIGRAVITY_CLI_COMMAND RUN_AGY_FAILURE_E2E
pnpm -C autobyteus-server-ts exec vitest run \
 tests/e2e/runtime/agy-native-arguments-validation.tmp.test.ts --no-watch
rm autobyteus-server-ts/tests/e2e/runtime/agy-native-arguments-validation.tmp.test.ts
```
Uses installed configured `agy` account, verified version1.2.16/models, gemini-3.8-flash-low. Requires Chrome at `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome` and workspace playwright-core. Creates new own application root/run/native conversation; no other data reuse. It starts real Studio using existing E2E composition on random port, then:
```bash
# Started by the probe in autobyteus-web, with its own backend URL/free frontend port:
BACKEND_NODE_BASE_URL=<owned-Studio-origin> NODE_ENV=development \
 pnpm exec nuxt dev --host 127.0.0.1 --port <owned-free-port>
```
The probe temporarily copies E/native-arguments-integrated.page.vue into web/pages/api-e2e-native-arguments.vue using COPYFILE_EXCL, refusing to overwrite any existing route. Loads production history hydrator and AgentStreamingService/ToolActivityItem, not fixture argument objects. Browser first asserts actual live JSON while command Running; then terminates actual run and reloads for fresh network-only history. All nine provider/canonical/terminal/raw/rendered JSON input objects exact. Own process groups/browser/server/run/data/route are cleaned even on failure; final temp test removed separately. Initial label-case and second data-test-locator fixture mistakes retained with cleanup evidence; final probe corrected only these assertions and compares actual optional fields, not requested but absent flags.

## Additional relevant web suites, exit0 / 59 tests
```bash
pnpm -C autobyteus-web test:nuxt \
 services/agentStreaming/handlers/__tests__/toolLifecycleHandler.spec.ts \
 services/agentStreaming/handlers/__tests__/toolLifecycleState.spec.ts \
 services/agentStreaming/handlers/__tests__/toolLifecycleParsers.spec.ts \
 services/agentStreaming/handlers/__tests__/toolLifecycleOrdering.spec.ts \
 services/runHydration/__tests__/runProjectionConversation.spec.ts \
 services/runHydration/__tests__/runContextHydrationService.spec.ts \
 services/runHydration/__tests__/runProjectionActivityHydration.spec.ts \
 components/progress/__tests__/ToolActivityItem.spec.ts --run
```
Executed after owned Nuxt stopped (no shared .nuxt interference). 8 files/59 tests Pass. No web source change.

## Evidence/cleanup checks
Independent read-only Python checks parsed all13 upstream factual supplements and verified eight historical native associations; no re-execution of upstream scripts against user data. Cleanup audit connected only to own recorded ports, confirmed all six closed and all three app roots absent, and asserted temp route/test/tsconfig absent. Newly CLI-created diagnostic provider metadata retained; no global registry edits. Current runtime observed: Darwin arm64, Node22.23.1, pnpm10.28.2, server Vitest4.0.18/web Vitest3.2.4, Chrome154.0.8037.97. Code coverage commit b297e0042e8eaf02f53af6048199c57af7587069; no source implementation change, push/merge/release/deployment.
