# API-REV-002 executed commands / reproduction
Working directory for commands: `/Users/normy/autobyteus_org/autobyteus-worktrees/antigravity-tool-argument-visibility`. T = tickets/in-progress/antigravity-tool-argument-visibility; E = T/api-e2e-evidence/api-rev-002. All output retained there. All server Vitest jobs ran sequentially; web unit job completed before live Nuxt began.

## Native transport (4 Pass) and error transport (24 Pass,1 optional browser skip)
```bash
T="$PWD/tickets/in-progress/antigravity-tool-argument-visibility"
E="$T/api-e2e-evidence/api-rev-002"
AGY_ARGUMENT_LEDGER="$T/api-e2e-test-case-ledger.md" \
RUN_AGY_FAILURE_E2E=1 \
ANTIGRAVITY_CLI_COMMAND="$PWD/autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs" \
pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/agy-native-tool-arguments-transport.e2e.test.ts --no-watch
# retained native-transport-final.log, exit0
AGY_ERROR_LEDGER="$T/api-e2e-test-case-ledger.md" \
AGY_ERROR_EXECUTION_LOG="../../api-e2e-evidence/api-rev-002/runtime-error-transport.log" \
AGY_ERROR_EVIDENCE_DIR="$E/runtime-error" \
RUN_AGY_FAILURE_E2E=1 \
ANTIGRAVITY_CLI_COMMAND="$PWD/autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs" \
pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/agy-failure-transport.e2e.test.ts --no-watch
# retained runtime-error-transport.log, exit0
```
Native test hoists HOME before provider imports; no source mock. Error fixture uses fresh bound UUID/owned app/workspace, private diagnostic permission0o600 and explicit actual next-turn/restore assertion. CLI double is the only external dependency emulated in these transport cases.

## Broader server regression (23files292 Pass;3 opt-in files5 tests skipped)
```bash
RUN_AGY_FAILURE_E2E=1 \
ANTIGRAVITY_CLI_COMMAND="$PWD/autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs" \
pnpm -C autobyteus-server-ts exec vitest run \
 tests/unit/agent-execution/backends/antigravity \
 tests/unit/agent-memory/runtime-tool-trace-sequencer.test.ts \
 tests/e2e/runtime/agy-background-task-transport.e2e.test.ts \
 tests/e2e/runtime/agy-mcp-tool-call-transport.e2e.test.ts \
 tests/e2e/runtime/agy-native-image-step-output.e2e.test.ts --no-watch
# regressions.log, exit0
```
Error/native transport executed separately, not included or double-counted in292.

## Current production and focused-test compiler/syntax/whitespace
```bash
pnpm -C autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit
# source-typecheck.log exit0
# Install E/test-tsconfig.json exclusively as server/tsconfig.agy-api-renew-check.json;
# run from correct package location; remove only own temporary config afterwards.
pnpm -C autobyteus-server-ts exec tsc -p tsconfig.agy-api-renew-check.json
# initial test-typecheck.log exit2 TS2769 in incoming error it.each; final test-typecheck-final.log exit0
node --check autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs
node --check autobyteus-server-ts/tests/fixtures/agy-native-arguments-turn.mjs
git diff --check 4d5f96df..HEAD -- \
 autobyteus-server-ts/src/agent-execution/backends/antigravity \
 autobyteus-server-ts/tests/unit/agent-execution/backends/antigravity \
 autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs \
 autobyteus-server-ts/tests/fixtures/agy-native-arguments-turn.mjs \
 autobyteus-server-ts/tests/e2e/runtime/agy-native-tool-arguments-transport.e2e.test.ts
git diff --check -- autobyteus-server-ts/tests/e2e/helpers/runtime-error-case-evidence.ts
```
Focused config includes source/native/error/routing tests and maps ws to installed @types/ws8.18.1, with no dependency/ambient-any/policy change. Initial error was helper return-type erasure, corrected only with generic T; exact diff test-helper-typing.diff. Exclusive Python Path.open('x') created temp config, Path.unlink removed it. One rejected rm-f command never ran; no result inferred. General pre-existing TS6059 not rerun/not passed; reviewed IR-002 full build reused as upstream context only.

## Final runtime rerun after type-only helper change (28 Pass)
```bash
AGY_ARGUMENT_LEDGER="$T/api-e2e-test-case-ledger.md" \
AGY_ERROR_LEDGER="$T/api-e2e-test-case-ledger.md" \
AGY_ERROR_EXECUTION_LOG="../../api-e2e-evidence/api-rev-002/transport-after-typing-fix.log" \
AGY_ERROR_EVIDENCE_DIR="$E/runtime-error-final" \
RUN_AGY_FAILURE_E2E=1 \
ANTIGRAVITY_CLI_COMMAND="$PWD/autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs" \
pnpm -C autobyteus-server-ts exec vitest run \
 tests/e2e/runtime/agy-native-tool-arguments-transport.e2e.test.ts \
 tests/e2e/runtime/agy-failure-transport.e2e.test.ts --no-watch
# transport-after-typing-fix.log exit0;28 Pass1 browser opt-in skipped
```
The existing native ledger label native-transport-final.log was not changed in durable code; final rerun hook events resolve to transport-after-typing-fix.log as explicitly recorded in ledger/report. No case timestamps invented and no assertion suppression.

## Current web consumer/error regression (10files87 Pass)
```bash
pnpm -C autobyteus-web test:nuxt \
 services/agentStreaming/handlers/__tests__/toolLifecycleHandler.spec.ts \
 services/agentStreaming/handlers/__tests__/toolLifecycleState.spec.ts \
 services/agentStreaming/handlers/__tests__/toolLifecycleParsers.spec.ts \
 services/agentStreaming/handlers/__tests__/toolLifecycleOrdering.spec.ts \
 services/runHydration/__tests__/runProjectionConversation.spec.ts \
 services/runHydration/__tests__/runContextHydrationService.spec.ts \
 services/runHydration/__tests__/runProjectionActivityHydration.spec.ts \
 components/progress/__tests__/ToolActivityItem.spec.ts \
 services/agentStreaming/handlers/__tests__/agentStatusHandler.spec.ts \
 components/conversation/segments/__tests__/ErrorSegment.spec.ts --run
# web-regressions.log exit0
```

## Current real-provider + actual integrated renderer (1 executable Pass,9 calls)
AGY installed/account configured, agy --version1.2.16 and agy models checked; no credential copy or user app access. Chrome at /Applications/Google Chrome.app/Contents/MacOS/Google Chrome and workspace playwright-core required. Copy E/live-rendered-probe.ts exclusively to the same-relative-depth temporary path; no durable cost-bearing provider test:
```bash
# Python Path.open('x') to avoid overwriting any preexisting test:
# E/live-rendered-probe.ts → autobyteus-server-ts/tests/e2e/runtime/agy-native-arguments-validation.tmp.test.ts
unset ANTIGRAVITY_CLI_COMMAND RUN_AGY_FAILURE_E2E AGY_FAKE_CASE AGY_FAKE_INPUT_LOG AGY_FAKE_ARGV_LOG
pnpm -C autobyteus-server-ts exec vitest run \
 tests/e2e/runtime/agy-native-arguments-validation.tmp.test.ts --no-watch
# live-validation.log exit0; remove only own temporary test using Path.unlink
```
Reproducibility source retains exact startup/GraphQL/WS/prompt/productionDOM assertions/cleanup, output directed to current E without overwriting round1 evidence. It copies E/native-arguments-integrated.page.vue to web/pages/api-e2e-native-arguments.vue using COPYFILE_EXCL, removes in finally. Real Studio public composition randomHTTP/WS/MCP owned app/workspace → actual new AGY Agent → free-port Nuxt with BACKEND_NODE_BASE_URL=owned Studio → production hydrateLiveRunContext and AgentStreamingService→ToolActivityItem. No inline input objects/mock routes/web-core import.
```bash
# Probe-owned startup from autobyteus-web, exact free port/backend recorded in launch/cleanup:
BACKEND_NODE_BASE_URL=<owned-Studio-origin> NODE_ENV=development \
 pnpm exec nuxt dev --host 127.0.0.1 --port <owned-free-port>
```
Live replacement DOM while actual commandRunning; actual terminate/cold reload/network-only saved hydration all9 JSON exact; collapse/disclosure/1100×850 and390×844 no documentoverflow/pageerrors0. Current session60463604-0f61-47ca-b34e-14228c362876. Reproduction must use a new owned session/workspace, never this cleaned root or user history. Source args actually supplied govern assertions; no fabricated optional flags. Not packaged desktop/full product navigation/error-quota/browser-other-ticket certification.

## Independent evidence/cleanup and scope
All138 upstream files hashed/present in intake-audit.json; all13 supplements retained. Native-rendered-comparison-audit.json independently reparses retained native/WS/raw/browser JSON and checks9 equalobjects/identity. runtime-error-comparison.json verifies21 supplied/public message captures and actual restore before/after helper fix. cleanup-audit.json checks only recorded own ports58227/58258 closed,5 exact owned app/HOME roots absent,3 tempfiles absent. Studio/browser/Nuxt/runs/definitions cleanup receipts checked. Own new CLI diagnostic metadata retained, unrelated registry/user app/processes/data untouched. Upstream untrackeddist/scratch untouched. Rawlogs retained unedited including emitted blank EOF; source/test scoped whitespace only, not blanket artifacts Pass. One generic test-helper commit ea59e612877b857c866ab508f995607ea9064cc4; no provider-source/dependency changes or remote finalization.

Artifact-inclusive git diff --cached --check before evidence commit exited2:6 rawlog EOF blanklines and one literal blank unified-diff context line. Exact output artifact-whitespace-check.log retained unedited; source/test scoped checks exit0. Temporary /tmp check output copied into evidence then unlinked. No blanket artifact whitespace Pass.
