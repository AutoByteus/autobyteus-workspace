# API/E2E Execution Index — API-REV-001

## Reproduction / Ownership
Working directory for every command: /Users/normy/autobyteus_org/autobyteus-worktrees/antigravity-marketing-turn-failure. Node 22.23.1, pnpm 10.28.2, macOS 26.5.2 (darwin-arm64), Nuxt 3.33.1, Vitest 4.0.18, Prisma 5.22.0, Claude SDK 0.3.280. Browser: owned headless installed Chrome 154.0.8037.97; locale en-US; 1280x900 and 390x900. Shell timezone Europe/Berlin; JSON timestamps UTC.

The fake CLI opt-in replaces external provider only. Real studio server/database/GraphQL/Agent, Team, Org WebSockets/projection readers are exercised. Never target localhost:8001, shared application data, real user messages or credentials. Suite setup owns its worktree test SQLite and temp data. Do not run concurrent server test processes against the same worktree SQLite. All services use assigned ephemeral loopback ports. The browser probe is durable but its Nuxt page installation is temporary, refused if an existing page is present. Prerequisites documented in TESTING.md and probe header; browser journey is not the full Library/launch route or Electron-shell validation.

Generated untracked SDK outputs and assigned test DB were removed after final checks; run setup again before a delivery recheck.

## Authoritative commands/results
Run from /Users/normy/autobyteus_org/autobyteus-worktrees/antigravity-marketing-turn-failure. Shell redirection paths shown below are optional retained transcripts, not runtime fixtures.

### Setup
```bash
pnpm -C autobyteus-server-ts prepare:shared
pnpm -C autobyteus-server-ts exec prisma generate --schema prisma/schema.prisma
NUXT_TEST=true pnpm -C autobyteus-web exec nuxt prepare
```
Pass; prepare-shared.log / nuxt-prepare.log; final server-build.log independently includes shared builds and Prisma generate. No secrets required.

### Focused producer/session/lifecycle/privacy coverage — API-U01
```bash
pnpm -C autobyteus-server-ts exec vitest run \
  tests/unit/agent-execution/backends/antigravity/agy-stream-event-converter.test.ts \
  tests/unit/agent-execution/backends/antigravity/agy-turn-lifecycle.test.ts \
  tests/unit/agent-execution/backends/antigravity/agy-provider-diagnostic-sink.test.ts \
  tests/unit/agent-execution/backends/claude/session/claude-session-output-events.test.ts \
  tests/unit/agent-execution/backends/claude/session/claude-session.test.ts \
  tests/unit/agent-execution/backends/claude/session/claude-turn-tracker.test.ts --no-watch
```
171 passed, 6 files, exit 0: focused-unit.log. Includes no arbitrary ordinary-message truncation, record/string/list shapes and auth/settlement controls.

### Preserved informative paths — API-U02
```bash
pnpm -C autobyteus-server-ts exec vitest run \
  tests/unit/services/agent-streaming/agent-run-event-message-mapper.test.ts \
  tests/unit/agent-execution/backends/autobyteus/events/autobyteus-stream-event-converter.test.ts \
  tests/unit/agent-execution/backends/codex/events/codex-thread-event-converter.test.ts \
  tests/unit/agent-execution/backends/acp/acp-agent-session.test.ts \
  tests/unit/agent-execution/backends/acp/acp-session-update-converter.test.ts --no-watch
```
120 passed, 5 files, exit 0: preserved-unit.log. ACP is the current Grok integration channel; no live Grok/Codex account invoked.

### Existing web boundary/card/handlers/streaming — API-W01
```bash
pnpm -C autobyteus-web test:nuxt   components/conversation/segments/__tests__/ErrorSegment.spec.ts   services/agentStreaming/handlers/__tests__/agentStatusHandler.spec.ts \
  tests/integration/web-boundary-guard.integration.test.ts   services/agentStreaming/__tests__/AgentStreamingService.spec.ts   services/agentStreaming/__tests__/TeamStreamingService.spec.ts   services/agentStreaming/__tests__/agentStreamMessageProjector.spec.ts --run
pnpm -C autobyteus-web guard:web-boundary
```
82 passed, 6 files, exit 0: web-unit.log. Actual unmodified production boundary guard passed: web-boundary.log (prerequisite, not full web build). Existing generic message remains readable by the current ErrorSegment; markup/details are inert. No web→core import added.

### Final affected E2E state including real browser — authoritative
```bash
RUN_AGY_ERROR_BROWSER=1 RUN_AGY_FAILURE_E2E=1 \
ANTIGRAVITY_CLI_COMMAND="$PWD/autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs" \
AGY_ERROR_EXECUTION_LOG=final-e2e.log \
AGY_ERROR_EVIDENCE_DIR="$PWD/tickets/in-progress/antigravity-marketing-turn-failure/evidence/api-e2e" \
AGY_ERROR_LEDGER="$PWD/tickets/in-progress/antigravity-marketing-turn-failure/api-e2e-test-case-ledger.md" \
pnpm -C autobyteus-server-ts exec vitest run \
  tests/e2e/runtime/agy-failure-transport.e2e.test.ts \
  tests/e2e/runtime/claude-agent-websocket-interrupt-resume.e2e.test.ts \
  tests/e2e/runtime/agy-background-task-transport.e2e.test.ts \
  tests/e2e/runtime/agy-mcp-tool-call-transport.e2e.test.ts --no-watch
```
**36 passed, 1 skipped, 4 files passed; exit 0**, final-e2e.log, started 15:19:57 Berlin, duration 43.44s. AGY 25 passed (21 shape/scope + 2 privacy negatives +restore +outer browser), Claude 8 deterministic passed/1 real-provider skipped, shared-fixture 3 passed. UI-A01/UI-T01 each prove seven shapes and subsequent success, nested in the single outer API-B01; do not add UI subcases to Vitest totals. RUN_CLAUDE_E2E was not enabled; live-Claude success is **Not Tested**, never a pass.

The suite invokes `node autobyteus-web/tests/e2e/runtime-error-transport-probe.mjs --manifest <owned-data>/browser-manifest.json --output-dir <evidence>` with the actual server's manifest. The probe starts `pnpm exec nuxt dev --host 127.0.0.1 --port <ephemeral>` from /Users/normy/autobyteus_org/autobyteus-worktrees/antigravity-marketing-turn-failure/autobyteus-web, with NUXT_TEST=true and BACKEND_NODE_BASE_URL=<owned real-server URL>. Readiness is owned Nuxt route HTTP 200 then production streaming service ready, not sleeps. Browser assertions consume actual frames via current AgentStreamingService/TeamStreamingService and normal AIMessage/ErrorSegment. Socket IDs correlate actual outgoing command and exact received connection, not page-wide message deduplication. Final server port 64544, Nuxt 64578. Browser audit exactly 16 inputs, distinct conversations each with 7 error-turn inputs + 1 explicit continuation; no automatic/duplicate command.

### Strict production build and supplemental static checks
```bash
pnpm -C autobyteus-server-ts build
node --check autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs
node --check autobyteus-web/tests/e2e/runtime-error-transport-probe.mjs
git diff --cached --check
```
Build exit 0: server-build.log, includes prepare:shared, Prisma generate, strict production TypeScript/build assets, built-in bootstrap/sanitized built-module smoke without DATABASE_URL. Syntax and staged diff checks exit 0. First staged diff check rejected a trailing blank line in the new ledger helper; whitespace-only correction made before durable commit. No executable behavior changed after the final E2E suite. No full workspace/packaged-app build certification implied.

## Prior attempts and authored corrections — retained, not authoritative passes
All commands used the same worktree/setup. Controlled AGY prefixes were RUN_AGY_FAILURE_E2E=1 + ANTIGRAVITY_CLI_COMMAND=/Users/normy/autobyteus_org/autobyteus-worktrees/antigravity-marketing-turn-failure/autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs, with optional evidence/ledger env as above. Browser runs also used RUN_AGY_ERROR_BROWSER=1. Focused filters/suite paths below identify the exact scope; intermediate test source had since-corrected authored assumptions, so current HEAD should not reproduce those mistakes.

| Transcript | Scope / command suffix | Observed | API/E2E-owned correction / final proof |
| --- | --- | --- | --- |
| transport-first.log | `vitest run tests/e2e/runtime/agy-failure-transport.e2e.test.ts --no-watch -t 'agent: supplied quota'` | 1 pass / 24 skip | Narrow actual quota proof, not full sign-off |
| transport-initial.log | same file, no filter | 16 pass / 8 fail / 1 skip | Team explicit memberConfigs required; restore selected nonexistent scalar fields. Corrected to current public schema |
| transport-corrected.log | same file, `-t 'team:\|restores'` | 7 pass / 1 fail / 17 skip | Remaining runtimeReference.platformAgentRunId assumption removed; correct current sessionId/threadId/metadata queried |
| restore-recheck.log | same file, `-t 'restores'` | 1 pass / 24 skip | Exact binding/config/work normal restore now passes |
| transport.log | same file, no filter; browser flag absent | 24 pass / 1 skip | Complete repository AGY matrix passes; browser still unproven then |
| shared-fixture.log | `vitest run tests/e2e/runtime/agy-background-task-transport.e2e.test.ts tests/e2e/runtime/agy-mcp-tool-call-transport.e2e.test.ts --no-watch` | 3 pass | Existing modes retained; rechecked in final full command |
| claude-wire-initial.log | `vitest run tests/e2e/runtime/claude-agent-websocket-interrupt-resume.e2e.test.ts --no-watch` | 4 pass / 4 fail / 1 skip | Invented code/first diagnostic assertion and split assistant-message fixture corrected |
| claude-wire-burst.log + claude-burst-evidence.json | same Claude file | 8 pass / 1 skip, **not accepted scenario fidelity** | Inspection found 3 extra segment diagnostics from unrealistic synchronous future terminal burst; changed fixture to normal external tool-start→completion→next model result phases; exactly 1 ERROR asserted |
| claude-wire.log | same Claude file | 8 pass / 1 skip | Correct normal sequence; actual code CLAUDE_RUNTIME_TURN_FAILED; source unchanged; final full run reconfirms |
| browser-server-initial.log + browser-evidence-initial.json + nuxt-initial.log + browser-process-initial.log | AGY file `-t 'closes real'`, browser flag enabled | 1 fail / 24 skip | Seven Agent cards pass, next-turn page-wide count 2 versus 1; Team not reached. Correlate outgoing command's exact socket, plus backend input audit |
| browser-server.log | same browser-only filter | 1 pass / 24 skip | Both browser journeys pass; final snapshots supersede intermediate passing snapshots |
| final-e2e-initial.log + browser-server-correlation-initial.json | final four-file command above | 35 pass / 1 fail / 1 skip; both browser journeys pass | Outer audit counted 44 earlier inputs + 16 browser inputs=60; capture auditStart before browser. API-B01 added to ledger; final run exactly 16 |

All failures/corrections remain in canonical investigation/ledger. No production-source fix, requirement/design change or weakened public behavior needed. Standard `pnpm -C autobyteus-server-ts typecheck` from implementation remains **failed** with 836 TS6059 rootDir/src versus tests/include errors (evidence/implementation/typecheck-limitation.txt and checks.md); not rerun or repaired here. Strict build is independent evidence, not a relabeled typecheck pass.

## Evidence map / latest-state files
- API-A/T/O-{quota,unfamiliar,structured,missing,empty,malformed,credential}.json: actual frames/public before→after→saved projections/provider input audit. JSON files updated to latest final run; earlier attempt failures are in retained logs/ledger.
- API-C02.json: exact saved launch config/conversation/work before and after normal stop/restore.
- API-CL01..04.json: corrected-phase actual Claude public frames/session identity, exactly 1 terminal ERROR each.
- browser-evidence.json: authoritative latest actual DOM/frame/state checkpoints, outgoing socket-correlated commands, zero recorded console/page errors/dialogs; own browser/Nuxt/page cleanup receipts.
- browser-server-correlation.json: authoritative exactly 16 provider inputs/two distinct conversations/normal projections; no private raw diagnostic included.
- Eight agent/team quota/credential screenshots at 1280/390 are supplemental. Visually inspected agent-quota-390.png and team-credential-1280.png; actual semantic assertions are the proof, not screenshots alone.
- cleanup.json: real studio app no longer listening, sockets closed, no remaining owned roots, temp data removed, no cleanup errors.
- final-cleanup.json: exact final server/Nuxt ports have no listeners, own temporary page/data absent; only assigned generated SDK outputs/test SQLite removed; production diff versus implementation empty.
- evidence-manifest.json: retained filenames/byte sizes/SHA256, excluding itself; not a product validation result.

## Scope limits / delivery work
No real provider exhaustion/reset or recovery, live provider credentials, user marketing state, installed app, full Library→launch UI path, packaged Electron shell, deployment or release executed. Existing regex redaction is reused, not a universal-secret guarantee. Chrome/macOS only; Windows/Linux/other browser certification not claimed. Delivery owns documentation sync (current AGY/runtime docs), explicit user verification, finalization to origin/personal and any applicable deployment. Final validation scoped Pass / 95%, not completion of these delivery gates.

## Artifact preservation note
The artifact-wide staged whitespace check reports extra EOF blank lines in raw Vitest/pnpm transcripts. These original transcript bytes are intentionally retained, not rewritten. The source/Markdown/JSON staged check excluding `*.log` passes; this is not a product or test execution failure. The earlier test-source helper EOF warning was corrected before the durable test commit.
