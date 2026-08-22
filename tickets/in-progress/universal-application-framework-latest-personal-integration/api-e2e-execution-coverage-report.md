# API/E2E Execution Coverage Report

## Execution Round Meta

- Requirements: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-latest-personal-integration/tickets/in-progress/universal-application-framework-latest-personal-integration/requirements.md`
- Investigation/design basis: `investigation-notes.md`, `design-spec.md`, `integration-strategy-analysis.md`, `integration-runtime-contracts.md`
- Upstream revisions: `SR-003`, `ARCH-REV-003`, `IR-006`, `CRR-009`
- Source-review decision: Pass / 93
- Reviewed implementation: `b3ddefe1a079e1bc52eb36688595462861b7415a`
- Executed reviewed HEAD: `e2c9e2e4c89875c61aad57dea5a40d45832e6884`
- API/E2E revision: `API-REV-004`
- Prior result: `API-REV-003` Fail / 93%
- Current result: **Pass / 98% validation confidence**
- Trigger: rerun `APIE2E-SOCRATIC-002` / `APIE2E-F004` after IR-006, then complete the retained current dual-host matrix

## Executive Result

IR-006 resolves the last critical real-user failure. In a fresh isolated Studio, the maintained Socratic package now accepts the initial lesson problem immediately after application-agent readiness, targets the exact binding-owned `/tutor` member run, streams a real Luna/Codex response and durably stores the tutor message. No reopen, retry, delay, direct database edit or file workaround was used.

The proportional retained matrix also passes: Socratic standalone and Studio, Brief standalone and Studio, real `publish_artifacts`, named `/writer` handoff, writer continuation and application projection, explicit remount, same-data restart/recovery, active child cleanup, internal Agent Tools versus Studio-only gateway separation, both maintained watcher modes, web/build gates and exact 73/73 package/authoring integrity.

Two cumulative API-owned fixtures initially exposed stale expectations that the public `/researcher` address would reach team dispatch unchanged. They were correctly updated to retain `/researcher` as public input while asserting the exact binding-owned runtime `agentRunId` at `RootTeamRun.postMessage`. The complete 16-file cumulative durable selection passes 77/77.

## Prior Failure Resolution

| Failure | Prior Result | API-REV-004 Result | Evidence |
| --- | --- | --- | --- |
| `APIE2E-F001` exact Socratic target | Resolved | Remains resolved; live binding and worker use exact `/tutor` member `agentRunId` | `api-rev-004-socratic-studio-correlation.json` |
| `APIE2E-F002` duplicate process owner | Resolved | Remains resolved across both hosts | Studio/standalone logs |
| `APIE2E-F003` missing fresh runtime cwd | Resolved | Remains resolved across fresh maintained standalone starts | standalone logs |
| `APIE2E-F004` fresh exact-member input rejection | Fail | **Resolved**; first problem accepted and real tutor response saved without retry | Socratic Studio browser/business/worker evidence |

## Requirement And Scenario Matrix

| Scenario | Boundary / Mode | Result | Primary Evidence |
| --- | --- | --- | --- |
| `APIE2E-REPO-004` | IR-006 exact member identity + architecture + TypeScript | **Pass: 4 files / 27 tests; tsc Pass** | `api-rev-004-ir006-focused.log` |
| `APIE2E-DURABLE-004` | cumulative current API/E2E fixtures | **Pass: 16 files / 77 tests** | `api-rev-004-cumulative-durable-matrix-rerun.log` |
| `APIE2E-SOCRATIC-002` / `F004` | fresh Studio initial input to exact member, real provider, browser and durable state | **Pass; F004 resolved** | Socratic Studio business/correlation/worker evidence |
| `APIE2E-SOCRATIC-STANDALONE-004` | real maintained standalone lesson and watcher restart | **Pass** | standalone business/restart evidence |
| `APIE2E-SOCRATIC-REMOUNT-004` | explicit Studio remount and state retention | **Pass; one iframe** | remount JSON/PNG |
| `APIE2E-BRIEF-STANDALONE-004` | real researcher/writer, tools, named handoff and projection | **Pass; two artifacts, `in_review`** | standalone business/projection/raw traces |
| `APIE2E-BRIEF-STUDIO-004` | same business path through Studio | **Pass; two artifacts, `in_review`** | Studio business/projection/raw traces |
| `APIE2E-ROUTES-004` | internal Agent Tools vs external gateway | **Pass** | `api-rev-004-route-separation.log` |
| `APIE2E-RESTART-004` | active Studio shutdown, same-data restart and both-app recovery | **Pass** | pre-stop/cleanup/restart recovery evidence |
| `APIE2E-DEV-004` | both maintained standalone `dev` watchers | **Pass** | standalone logs and ready-count evidence |
| `APIE2E-DEV-STUDIO-004` | both maintained `dev:studio` refresh loops | **Pass** | `*-dev-studio.log` |
| `APIE2E-PARITY-004` | immutable build-once package/authoring bytes | **Pass: 73/73** | pre/post hashes and watcher parity log |
| `APIE2E-WEB-004` | frontend boundary and production build | **Pass** | `api-rev-004-web-build.log` |
| `APIE2E-CLEANUP-004` | owned ports, workers/providers, roots and scratch | **Pass** | `api-rev-004-final-cleanup.log` |

## Repository Execution

| Order | Command / Selection | Result |
| --- | --- | --- |
| 1 | server, devkit, frontend SDK and both maintained package prerequisites | Pass |
| 2 | IR-006 three-file target selection plus architecture gate | 4 files / 27 tests Pass |
| 3 | `pnpm -C autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit` | Pass |
| 4 | initial cumulative API-owned selection | 75 Pass / 2 stale exact-identity expectations |
| 5 | two corrected fixtures, focused | 2 files / 3 tests Pass |
| 6 | complete cumulative API-owned selection | 16 files / 77 tests Pass |
| 7 | `pnpm -C autobyteus-application-devkit test` | 20/20 Pass |
| 8 | Brief and Socratic `validate` plus `typecheck:backend` | Pass |
| 9 | `pnpm -C autobyteus-web guard:web-boundary` | Pass |
| 10 | `pnpm -C autobyteus-web build` | Pass; warnings only for stale browser data and large chunks |

The first focused invocation before rebuilding generated workspace outputs failed only because cleanup had correctly removed SDK contract build products. The normal documented prerequisite build restored them; all accepted results above use that prerequisite-complete state.

The broad inherited whole-server failure baseline from API-REV-003 remains separate characterization and was not reused as Pass evidence. This round reran the direct changed, architecture, cumulative durable and realistic-system boundaries required by IR-006.

## Real Socratic Evidence

### Studio — exact prior failure path

- Isolated Studio backend `8015`, frontend `3015`, owned data root, maintained `pnpm dev:studio` and installed Chrome.
- Selected the exact local package with package-owned `/tutor` and Luna/Codex defaults; entry was valid and enabled.
- A fresh lesson's initial problem was accepted immediately after readiness. The real provider streamed and the UI reported `Tutor response saved` with two durable messages.
- Worker and binding correlation identify the exact attached member `agentRunId`; no public-address re-selection or coordinator fallback occurred.
- Explicit remount retained the transcript, connected tutor and exactly one iframe.

### Standalone

- Maintained `pnpm dev -- --port 43145 --no-open` listened and served the application.
- A fresh problem produced a real response and two durable messages.
- Touching the maintained frontend input triggered the supported pack/close/start cycle. The same browser retained the transcript and connected target after restart.

## Real Brief Evidence

### Standalone

- Maintained `pnpm dev -- --port 43146 --no-open` with package-owned researcher/writer Luna/Codex members.
- Researcher wrote and called actual `publish_artifacts`, then actual `send_message_to` for named `/writer`; writer continued, wrote and published.
- Browser/application state reached `in_review` with research and final outputs. Raw traces and projection snapshots prove the actual tool and application boundaries.

### Studio

- Exact package team and member bindings were selected and entered successfully.
- The same real publication/handoff/writer path completed to `in_review` with two projected outputs and no last error.
- The run was concurrent with the maintained Socratic graph and remained isolated by run IDs, roots and projections.

## Route, Restart And Cleanup Evidence

- Standalone internal Agent Tools without a valid scoped session: `401`; standalone `/mcp/gateway`: `404`.
- Studio internal Agent Tools without a valid scoped session: `401`; Studio-only external gateway MCP initialize: `200`.
- Before Studio stop there were two application workers and two Codex app-server children. Graceful backend stop freed port `8015` and removed all four exact children.
- Same-root backend restart remounted one iframe per application and retained the Socratic transcript plus completed Brief state.
- Final cleanup freed `8015`, `3015`, `43145` and `43146`; no owned worker/provider process remained. Isolated data, generated build/package outputs and test scratch were removed. `git diff --check` passes.

## Package Integrity And Maintained Watchers

- Both standalone `dev` logs gained a new ready marker after the source change.
- Both `dev:studio` logs gained a new package-ready marker and reported reload complete.
- SHA-256 rows for all 73 canonical package and authoring paths are identical before and after the four watcher loops.
- Canonical README metadata remained stable; no staging or previous-output residue remained.

## Durable Coverage Changes Requiring Review

Updated current-contract fixtures:

1. `autobyteus-server-ts/tests/integration/agent-tools/mcp/agent-tools-mcp-routes.integration.test.ts`
2. `autobyteus-server-ts/tests/integration/application-backend/application-agent-communication-ws.integration.test.ts`
3. `autobyteus-server-ts/tests/integration/application-backend/application-backend-custom-websocket.integration.test.ts`
4. `autobyteus-server-ts/tests/integration/application-backend/application-backend-mount-route-transport.integration.test.ts`
5. `autobyteus-server-ts/tests/integration/application-backend/application-backend-rest-ws.integration.test.ts`
6. `autobyteus-server-ts/tests/integration/application-backend/application-context-capabilities.integration.test.ts`
7. `autobyteus-server-ts/tests/integration/application-backend/brief-package-team-prompt.integration.test.ts`
8. `autobyteus-server-ts/tests/integration/application-backend/brief-studio-imported-package.integration.test.ts`
9. `autobyteus-server-ts/tests/unit/application-agent-streaming/application-agent-runtime-source.test.ts`
10. `autobyteus-server-ts/tests/unit/application-backend/app-owned-launch-request-correlation.test.ts`
11. `autobyteus-server-ts/tests/unit/application-backend/app-published-artifact-semantic-path-resolvers.test.ts`
12. `autobyteus-server-ts/tests/unit/application-backend/socratic-lesson-target-projection.test.ts`
13. `autobyteus-server-ts/tests/unit/application-bundles/file-application-bundle-provider.test.ts`
14. `autobyteus-server-ts/tests/unit/application-orchestration/application-agent-target-authorization-service.test.ts`
15. `autobyteus-server-ts/tests/unit/application-orchestration/application-orchestration-recovery-service.test.ts`
16. `autobyteus-server-ts/tests/unit/application-orchestration/application-run-binding-launch-service.test.ts`

Removed as stale:

- `autobyteus-server-ts/tests/integration/agent/team-lifecycle-websocket.integration.test.ts` — it protected the deliberately removed leaf-snapshot contract; current strict team event/status integration and unit coverage replace the durable intent.

Round-four-specific corrections are the exact binding-owned runtime-ID expectations in `application-agent-communication-ws.integration.test.ts` and `application-context-capabilities.integration.test.ts`. No new production behavior or fallback was added.

## Confidence Scorecard

| Category | Final | Evidence / Residual |
| --- | ---: | --- |
| Requirement and acceptance proof | 98% | all critical current dual-host scenarios pass |
| Changed-boundary directness | 100% | direct real-`RootTeamRun` tests plus live exact-identity correlation |
| Cross-boundary realism | 98% | real browser, network, worker, provider, tools and persistence |
| Environment/config/identity fidelity | 99% | current packages, exact IDs, isolated roots and real executable/Chrome |
| Failure/lifecycle/recovery | 98% | restart, remount, active-child shutdown and leak cleanup |
| User/browser/desktop-equivalent | 98% | both maintained apps pass both web-equivalent hosts; Electron downstream |
| Durable regression quality | 97% | cumulative 16 files / 77 tests green; stale contract removed |

- Overall final validation confidence: **98%** (simple average, rounded).
- Critical acceptance criteria all pass: **Yes**.
- Categories below 90%: **None**.
- Default clean Pass target met: **Yes**.

## Evidence Index

Evidence root:
`/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-latest-personal-integration/tickets/in-progress/universal-application-framework-latest-personal-integration/evidence/api-e2e/`

Key evidence:

- `api-rev-004-ir006-focused.log`
- `api-rev-004-durable-identity-update.log`
- `api-rev-004-cumulative-durable-matrix-rerun.log`
- `api-rev-004-durable-test-diff.log`
- `api-rev-004-maintained-application-validation.log`
- `api-rev-004-web-build.log`
- `api-rev-004-socratic-studio-business.json/.png`
- `api-rev-004-socratic-studio-correlation.json`
- `api-rev-004-socratic-studio-worker.log`
- `api-rev-004-socratic-standalone-business.json/.png`
- `api-rev-004-socratic-standalone-restart.json/.png`
- `api-rev-004-socratic-studio-remount.json/.png`
- `api-rev-004-brief-standalone-business.json/.png`
- `api-rev-004-brief-standalone-projection-tools.json`
- `api-rev-004-brief-standalone-researcher-trace.jsonl`
- `api-rev-004-brief-standalone-writer-trace.jsonl`
- `api-rev-004-brief-studio-business.json/.png`
- `api-rev-004-brief-studio-projection-tools.json`
- `api-rev-004-brief-studio-researcher-trace.jsonl`
- `api-rev-004-brief-studio-writer-trace.jsonl`
- `api-rev-004-route-separation.log`
- `api-rev-004-studio-stop-cleanup.log`
- `api-rev-004-studio-restart-recovery.json/.png`
- `api-rev-004-prewatch-hashes.log`
- `api-rev-004-postwatch-hashes.log`
- `api-rev-004-watcher-parity.log`
- `api-rev-004-final-cleanup.log`

## Residual Risks And Deferred Scope

- Electron shell/package execution remains downstream delivery-owned and is not claimed by browser-equivalent API/E2E evidence.
- This is not an assertion that every repository test or every external provider/model permutation was run. The affected/current durable, build, real Codex/Luna and dual-host boundaries required for this change were run and are green.
- Historical broad inherited server-suite debt remains separate characterization and is not attributed to IR-006 or used as Pass evidence.

## Outcome Routing

- Result: **Pass**.
- Validation confidence: **98%**.
- New or remaining current API/E2E failure IDs: **None**.
- Required recipient: `/code_reviewer` for proportional successful review of every cumulative repository-resident durable update/removal before delivery.
