# API/E2E Execution Coverage Report

## Execution Round Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/provider-catalog-pricing-error-messaging/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/provider-catalog-pricing-error-messaging/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/provider-catalog-pricing-error-messaging/design-spec.md`
- Supplemental Task Artifacts: `/Users/normy/autobyteus_org/autobyteus-worktrees/provider-catalog-pricing-error-messaging/provider-error-and-pricing-contract.md`; `/Users/normy/autobyteus_org/autobyteus-worktrees/provider-catalog-pricing-error-messaging/tickets/done/application-agent-streaming/application-agent-communication-contract.md`
- Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/provider-catalog-pricing-error-messaging/solution-revision-record.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/provider-catalog-pricing-error-messaging/design-review-report.md`
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/provider-catalog-pricing-error-messaging/architecture-review-revision-record.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/provider-catalog-pricing-error-messaging/implementation-handoff.md`
- Implementation Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/provider-catalog-pricing-error-messaging/implementation-revision-record.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/provider-catalog-pricing-error-messaging/code-review-report.md`
- Code Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/provider-catalog-pricing-error-messaging/code-review-revision-record.md`
- Delivery Revision Record: N/A
- Coverage Investigation: `/Users/normy/autobyteus_org/autobyteus-worktrees/provider-catalog-pricing-error-messaging/api-e2e-coverage-investigation.md`
- API/E2E Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/provider-catalog-pricing-error-messaging/api-e2e-revision-record.md`
- Current API/E2E Revision ID: API-REV-006
- Current Execution Round: 6
- Trigger: Solution-designer scope decision separating ticket-specific API/E2E Pass from non-gating broad live-capability residuals.
- Prior Round Reviewed: Round 5 / API-REV-005; prior feature evidence was complete but the aggregate live gate was reported blocked at 89%.
- Latest Authoritative Round: Round 6, this report.

## Investigation And Execution Basis

- Coverage investigation completed before durable coverage changes or final execution: **Yes**.
- Investigation plan followed: **Yes, with explicit provider-capability recovery**. The user-authorized importer was inspected and used only against the worktree test DB; preflight ran before direct provider execution; temporary provider probes were restored before final durable checks.
- Existing coverage decisions revised during prior rerun: `test-support/live-e2e/live-e2e-harness.ts` required `listTurnRawTraceCorpusOrdered()` instead of a removed method; `test-support/live-e2e/live-e2e-scenarios.mjs` required `gemini-3.7-flash` for current LLM fixtures. Round 3 added no durable edit; its temporary compaction-timing probes are recorded and restored.
- Reroute required before or during execution: **Yes, after Round 6** for delivery handoff with the feature-specific Pass and explicit non-gating residuals. No new Round 6 durable path was retained; CRR-006 remains the applicable test review and CRR-009 remains the failure-origin review.
- Compatibility / legacy scope: No compatibility wrapper, alias, historical price branch, or migration shim was added. Persisted-data decision remains `Directly Usable — No Migration`; stale saved models are rejected/reselected.

## Changed Boundary And Evidence Matrix

| Scenario ID | Behavior / Acceptance-Criteria IDs | Changed Boundary | Execution Surface / Mode | Evidence Type | Result | Evidence / Artifact |
| --- | --- | --- | --- | --- | --- | --- |
| API-ERR-001 | AC-013–015; REQ-008/009 | Standalone AgentRun native WebSocket | Fastify/WS integration with synthetic canonical provider error | Durable | Pass | `agent-status-websocket.integration.test.ts`: 7 tests; terminal wire payload asserts non-empty code, original message, safe provider evidence, and no raw secret. |
| API-ERR-002 | AC-013–015; REQ-008/009 | AgentRun → Team adapter → team wire → application projector | In-process team integration | Durable | Pass | `team-agent-segment-admission.integration.test.ts`: 11 tests; new provider-error scenario passed. |
| API-ERR-003 | AC-014/015; REQ-007–009 | Application SDK and communication WebSocket | Real Fastify WebSocket plus frontend SDK using Node `ws`; agent, team, selected member, input ACK, terminal ERROR, close, invalid target | Durable | Pass | `application-agent-communication-ws.integration.test.ts`: 1 test passed; application ERROR was exactly message-only and excluded provider metadata/raw secret. |
| API-ERR-005 | Current Team publisher contract; AC-014 adjacent | Sequenced Team root-event runtime source | Unit fixture repaired to current publisher envelope and producer identity | Durable | Pass | `application-agent-runtime-source.test.ts`: 2 tests passed. |
| API-ERR-006 | AC-001/002; DS-001 | GraphQL current Gemini catalog metadata | Test-owned SQLite/built server GraphQL E2E | Durable | Pass | `model-metadata-provenance-graphql.e2e.test.ts`: 4 tests passed after replacing retired ID with `gemini-3.7-flash`. |
| API-UNIT-001 | AC-001–009, AC-016–018 | Provider catalog, request policies, pricing, vault, orchestration | Focused `autobyteus-ts` and server unit suites | Durable | Pass | 32 `autobyteus-ts` tests and 47 server unit tests passed. |
| API-CONTRACT-001 | AC-013–015 | SDK/team/web contracts and handlers | SDK Node tests, type tests, team contract tests, Nuxt Vitest | Durable | Pass | Application SDK contracts 6; frontend SDK 12 runtime + type tests; team contracts 2; web 26 tests passed. |
| API-E2E-001 | AC-001–004, AC-008/009, AC-016/017; persisted data | GraphQL metadata/pricing/secret/import/token ledger | Test-owned SQLite GraphQL E2E | Durable | Pass | Selected E2E run: 18 passed, 28 explicitly skipped runtime tests. Import lifecycle passed despite its expected foreign-key diagnostic fixture. |
| API-REAL-001 | AC-005/007/010–012/014/017 as exercised; ticket-specific provider/error boundaries | Live and deterministic API/E2E coverage | Feature-specific requirements use deterministic fixtures and passed native/team/application/API coverage; broad LM Studio/DeepSeek/Kimi capability evidence is separately retained as non-gating residual. | Mixed evidence | Pass for ticket scope; residual broader live capability incomplete | Deterministic AC-010–012 provider-message fixtures and Docker-equivalent code/message tests passed; relevant catalog/pricing/runtime/API tests passed. Gemini, OpenAI, Anthropic, Grok, and GLM direct requests passed. DeepSeek/Kimi wrapper failures, LM Studio compactor leaf evidence, MiniMax/Gemini AI Studio, Docker identity, browser DOM, and live recovery remain non-gating residuals. |
| API-BROWSER-001 | AC-011/014/015; REQ-009/010 | Browser DOM/WebSocket journey | Not run; direct web handler/stream tests, Nuxt build, and real SDK WebSocket integration were run instead | Browser | Not Tested | No deterministic browser fixture for a provider failure was available; no Electron shell source changed. |

## Additional Repository Coverage Execution

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output |
| --- | --- | --- | --- | --- | --- |
| 1 | `pnpm -C autobyteus-server-ts exec vitest run tests/integration/agent/agent-status-websocket.integration.test.ts tests/integration/agent-team-execution/team-agent-segment-admission.integration.test.ts tests/integration/application-backend/application-agent-communication-ws.integration.test.ts --no-watch` | Worktree; server `.env.test`, isolated Prisma SQLite | Native/team/application WS repair | Pass | 3 files, 19 tests passed. |
| 2 | `pnpm -C autobyteus-ts exec vitest run tests/unit/llm/supported-model-definitions.test.ts tests/unit/llm/errors/provider-error.test.ts tests/unit/llm/api/grok-llm.test.ts tests/unit/llm/api/glm-llm.test.ts tests/unit/llm/api/kimi-llm.test.ts tests/unit/agent/events/notifiers.test.ts tests/unit/agent/streaming/events/stream-event-payloads.test.ts --no-watch` | Worktree | Catalog, request policy, error payloads | Pass | 7 files, 32 tests passed. |
| 3 | Focused server unit Vitest command covering pricing, vault resolver, projector, runtime source, and orchestration | Worktree; isolated Prisma SQLite | Pricing, missing key, runtime ownership, current team envelope | Pass | 6 files, 47 tests passed. |
| 4 | `pnpm -C autobyteus-web test:nuxt services/agentStreaming/handlers/__tests__/agentStatusHandler.spec.ts services/agentStreaming/protocol/__tests__/segmentTypes.spec.ts services/agentStreaming/__tests__/agentStreamMessageProjector.spec.ts --run` | Worktree; Nuxt test mode | Native web parsing/handler/projector | Pass | 3 files, 26 tests passed. |
| 5 | `pnpm -C autobyteus-application-sdk-contracts test && pnpm -C autobyteus-application-frontend-sdk test && pnpm -C autobyteus-team-stream-contracts test` | Worktree | SDK/team builds, runtime contracts, type contracts | Pass | Contracts 6; frontend SDK 12 + type tests; team contracts 2. |
| 6 | Selected server E2E Vitest command for metadata, pricing, token ledger, secrets, import, and runtime matrix | Worktree; test-owned SQLite/built test runtime | GraphQL API and persisted-data evidence | Pass | 10 files: 18 passed; 28 runtime cases explicitly skipped by their test guards. |
| 7 | `pnpm test:e2e:real:preflight` | Worktree; built server and sanitized persistent live-E2E runtime | Capability inventory and value-safe preflight | Pass | Build/bootstrap smoke passed; capability suite 18 tests passed; missing external keys reported without values; local LM Studio scenario reported ready. |
| 8 | `pnpm test:e2e:real` | Worktree; built server and persistent live-E2E runtime | Configured live provider scenario | Blocked | Command remained in the live capability run without a final result for about three minutes; interrupted with Ctrl-C. Owned processes were cleaned up. |
| 9 | `pnpm -C autobyteus-web build` | Worktree; Nuxt static production build | Frontend bundling and generated web output | Pass | Nuxt client/server/prerender build completed; only existing Browserslist/chunk-size warnings. |
| 10 | `git diff --check` | Worktree | Patch hygiene | Pass | No whitespace errors. |
| 11 | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/secret-management/live-e2e-harness.test.ts --no-watch` | Worktree; isolated Prisma SQLite | Rerun harness validity after CRR-003 | Fail initially | 18/19 passed; failure exposed stale `gemini-3-flash-preview` live fixture. |
| 12 | `pnpm test:e2e:real -- --scenarios=lmstudio.qwen36.compaction-agent-flow` | Built server; clean owned persistent live-E2E runtime | API-REAL-001 after stale store API repair | Fail | Preflight passed; real local compaction reached lifecycle and failed `LIVE_E2E_CANONICAL_COMPACTOR_LEAF_EVIDENCE_MISSING` because the selected compactor task did not contain the Unicode-boundary source. |
| 13 | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/secret-management/live-e2e-harness.test.ts --no-watch` | Worktree; isolated Prisma SQLite | Current live scenario fixture validity | Pass | 19 tests passed after current Gemini scenario identifiers were repaired. |
| 14 | `pnpm test:e2e:real -- --scenarios=lmstudio.qwen36.compaction-agent-flow` | Built server; clean owned persistent live-E2E runtime | API-REAL-001 after local corpus timing probe | Fail | Real local run again reached compaction and failed `LIVE_E2E_CANONICAL_COMPACTOR_LEAF_EVIDENCE_MISSING`; the experimental corpus-size change was reverted. |
| 15 | `pnpm test:e2e:real -- --scenarios=lmstudio.qwen36.compaction-agent-flow` | Built server; clean owned persistent live-E2E runtime; temporary combined-turn probe | API-REAL-001 focused scenario-selection probe | Interrupted / no final result | Two tool calls persisted in the first turn, but the local LM Studio worker produced no next turn or final result for over ten minutes; Ctrl-C stopped only owned processes. The combined-turn experiment was reverted. |
| 16 | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/secret-management/live-e2e-harness.test.ts --no-watch && git diff --check` | Worktree; isolated Prisma SQLite | Final durable test-support state | Pass | Harness 19 tests passed; diff check passed. |
| 17 | `pnpm test:e2e:real:preflight` | Built server; sanitized persistent live-E2E runtime | Final value-safe capability inventory | Pass | 18 tests passed; local LM Studio model READY; external provider keys missing; no values emitted. |
| 18 | `pnpm test:e2e:real -- --scenarios=lmstudio.qwen36.compaction-agent-flow` | Built server; clean owned persistent live-E2E runtime; unmodified durable scenario | Round 3 API-REAL-001 failure recheck | Fail | Preflight passed; the run completed one compaction and failed `LIVE_E2E_CANONICAL_COMPACTOR_LEAF_EVIDENCE_MISSING` after 159.43s. Safe budget probe: prompt tokens `[2561,15952,2897,3879,4102,5857,6056,6302]`, threshold `13043`, phases requested/started/completed; the first trigger occurred during Group A before Unicode evidence was selected. |
| 19 | `pnpm test:e2e:real -- --scenarios=lmstudio.qwen36.compaction-agent-flow` | Built server; temporary Group-A 40-record fixture plus short no-tool turn | Round 3 compaction-window probe 1 | Fail | Preflight passed, prompt tokens remained below threshold, no compaction phases occurred, and the run failed `LIVE_E2E_COMPACTION_LIFECYCLE_NOT_COMPLETED` after 82.62s. Temporary changes were restored. |
| 20 | `pnpm test:e2e:real -- --scenarios=lmstudio.qwen36.compaction-agent-flow` | Built server; temporary Group-A 40-record fixture plus large inert context-pressure marker | Round 3 compaction-window probe 2 | Interrupted / no final result | The local worker produced no final result in the bounded operator window; Ctrl-C interrupted only owned processes. Temporary changes were restored; no secrets or response bodies were recorded. |
| 21 | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/secret-management/live-e2e-harness.test.ts --no-watch && git diff --check` | Restored durable worktree | Round 3 post-probe durable-state verification | Pass | Harness 19 tests passed and diff check passed; no Round 3 durable scenario change remains. |
| 22 | pnpm secrets:import -- --source /Users/normy/.autobyteus/server-data/.env --database-url file:/Users/normy/autobyteus_org/autobyteus-worktrees/provider-catalog-pricing-error-messaging/autobyteus-server-ts/db/test.db --dry-run | Worktree-owned test vault; value-safe importer | Import plan | Pass | CREATE 9, BLOCKED 0; no values printed. |
| 23 | pnpm secrets:import -- --source /Users/normy/.autobyteus/server-data/.env --database-url file:/Users/normy/autobyteus_org/autobyteus-worktrees/provider-catalog-pricing-error-messaging/autobyteus-server-ts/db/test.db | Same worktree test vault; explicit confirmation | Materialize mapped provider capabilities | Pass | CONFIGURED 9, SKIPPED 0, REPLACED 0; only IDs/counts recorded. |
| 24 | pnpm test:e2e:real:preflight | Built server; restored durable scenario catalog; sanitized runtime | Final value-safe capability inventory | Pass | 18/18 tests passed. OpenAI, DeepSeek, Vertex Express Gemini, Anthropic, AutoByteus, and LM Studio were READY; Serper and Gemini AI Studio were missing. |
| 25 | pnpm test:e2e:real -- --scenarios=deepseek.llm,gemini.vertex-express.llm,openai.llm | Built server; imported worktree vault | Direct DeepSeek, Gemini, and OpenAI requests | Partial / Fail | Gemini and OpenAI passed; DeepSeek returned LIVE_E2E_PROVIDER_OPERATION_FAILED:deepseek.llm. Provider body/status details were withheld. |
| 26 | pnpm test:e2e:real -- --scenarios=grok.llm,kimi.llm,glm.llm | Built server; temporary probe-only scenarios; imported worktree vault | Direct Grok 4.6, Kimi K3, and GLM 5.3 requests | Partial / Fail | Grok and GLM passed; Kimi returned LIVE_E2E_PROVIDER_OPERATION_FAILED:kimi.llm. Temporary entries were restored. |
| 27 | pnpm test:e2e:real -- --scenarios=anthropic.llm | Built server; imported worktree vault | Direct Anthropic request | Pass | 2/2 tests passed. |
| 28 | pnpm -C autobyteus-server-ts exec vitest run tests/unit/secret-management/live-e2e-harness.test.ts --no-watch && git diff --check | Restored durable worktree | Final harness validity and patch hygiene | Pass | Harness 19/19 passed; diff check passed. |
| 29 | Solution-designer scope decision: LM Studio compaction and broad live-provider capability are not hard gates for this ticket | Approved requirements/design scope | Separate ticket-specific acceptance from broad live residuals | Pass | Requirements do not name LM Studio or compaction; deterministic provider-message fixtures and Docker-equivalent contract tests are authoritative for AC-010–AC-015. |
| 30 | Final focused API/E2E disposition after scope decision | Worktree; no source or durable coverage change | Ticket-specific API/E2E result and residual classification | Pass | Feature-specific API/E2E coverage is Pass. Broad live residuals remain explicit and non-gating; no delivery-ready claim is made for those residuals. |

## Validation Confidence Scorecard

| Confidence Category | Feature-Specific Result | Aggregate Broader Score | Residual Meaning |
| --- | --- | ---: | --- |
| Requirement and acceptance-criteria proof | Pass | 89% | Deterministic catalog/pricing/error/vault/API proof and relevant direct provider successes passed. Live DeepSeek/Kimi operation/body fidelity remains residual only. |
| Changed-boundary execution directness | Pass | 94% | Native/team/application WS, SDK, GraphQL, and relevant provider request paths passed. Docker identity is residual. |
| Cross-boundary integration realism and mock gap | Pass for ticket boundaries | 93% | Deterministic fixtures and Docker-equivalent contracts are authoritative for this ticket; broad provider/browser runtime gaps remain visible. |
| Environment, configuration, identity, and fixture fidelity | Pass for owned test runtime | 88% | Worktree vault import/preflight passed; MiniMax/Gemini AI Studio and Docker deployment identity remain unavailable. |
| Failure, edge-case, lifecycle, and recovery evidence | Pass for required deterministic error behavior | 89% | Provider body/status fidelity, LM Studio compactor leaf evidence, and live recovery remain non-gating residuals. |
| User-surface, browser, and desktop-shell confidence | Pass for tested web-equivalent contracts | 82% | Browser DOM/Electron execution was not required for this source change and remains untested residual scope. |
| Durable regression coverage quality and relevance | Pass | 91% | Seven reviewed durable paths remain current; no Round 6 durable changes were retained. |

- Feature-specific API/E2E result: **Pass**.
- Aggregate broader-validation confidence: **89%**, retained only to make non-gating residual uncertainty visible.
- Calculation method: simple average of broader applicable categories; aggregate confidence is not a ticket-specific failure score.
- Deterministic provider-message criteria AC-010–AC-012 and Docker-equivalent code/message criteria AC-013–AC-015: **Pass**.
- No live account balance or live provider response is required for the approved deterministic provider-message criteria.
- Residuals not promoted to Pass: DeepSeek/Kimi live operation/body fidelity, MiniMax/Gemini AI Studio, Docker build/port identity, browser DOM, LM Studio compactor leaf evidence, and live restart/recovery.

## Broader Validation Decision And Execution

- Feature-specific ticket decision: **Pass**.
- Aggregate broader live-capability decision: **Incomplete / non-gating residual**, not a ticket failure.
- Scope authority: the solution-designer decision confirms LM Studio compaction is not a named requirement or acceptance criterion. It was an available broad live capability, so its incomplete leaf evidence remains visible but does not block this ticket.
- Deterministic provider-message authority: AC-010–AC-012 are proven by safe deterministic provider-message fixtures, redaction tests, and transport assertions. No live account balance or live provider response is required.
- Transport authority: native/team/application API and Docker-equivalent contract tests passed, including canonical non-empty code plus original safe message and application SDK message-only ERROR projection.
- Relevant catalog/pricing/runtime/API coverage passed. Direct Gemini, OpenAI, Anthropic, Grok, and GLM requests passed; DeepSeek/Kimi wrapper failures remain external capability/body-fidelity residuals and are not source findings.
- Explicit residuals, not passes: DeepSeek/Kimi live operation/body fidelity; unavailable MiniMax/Gemini AI Studio; actual Docker build and port-8001 identity; browser DOM; LM Studio compactor leaf evidence; live restart/recovery.
- No Round 6 code or durable coverage change was made. CRR-006 remains the applicable proportional review and CRR-009 remains the focused failure-origin review.

| Scenario / Journey Step | Expected Observable Result | Actual Observable Result | Ticket Result |
| --- | --- | --- | --- |
| Missing-key behavior | No provider request; stable missing_api_key category and actionable message | Deterministic resolver/secret-management coverage passed | Pass |
| Provider-message fidelity | Original safe provider message preserved; no invented balance/quota/auth message | Deterministic fixtures, redaction, native/team/application transport passed | Pass |
| Catalog/pricing/runtime/API behavior | Current models, pricing schedule, runtime ownership, and API contracts work | Focused units, GraphQL E2E, runtime/API/WS/SDK coverage passed | Pass |
| Relevant configured provider requests | Current request boundary is exercised where capability exists | Gemini, OpenAI, Anthropic, Grok, and GLM passed | Pass |
| DeepSeek/Kimi live capability | Provider-specific live operation/body fidelity | Safe wrapper failures only; cause intentionally unclaimed | Residual / non-gating |
| LM Studio compactor scenario | Broad live compactor leaf evidence | Incomplete leaf evidence; not a named ticket criterion | Residual / non-gating |
| MiniMax/Gemini AI Studio/Docker/browser/recovery | Additional environment-specific evidence | Capability or environment unavailable/not run | Residual / non-gating |

## Desktop Application Validation

- Browser-tested web-equivalent behavior: no browser session; direct web handler/projector tests, frontend SDK runtime/type tests, real SDK WebSocket integration, and Nuxt build passed.
- Shell-specific validation: not required; no Electron preload/IPC/window/packaging source changed.
- Effect on any already-running desktop application: None; only worktree-owned test/build processes were started.
- Not directly proven: browser DOM rendering of a provider error, packaged Electron shell, live provider rejection, Docker node identity.

## Platform / Runtime Targets

- Operating system / platform: macOS arm64 worktree runner.
- Runtime: Node/pnpm monorepo; server Vitest v4.0.18; Nuxt/Vitest v3.2.4; Prisma SQLite test runtime; WebSocket via `ws`.
- Browser / engine: none executed.
- Test timezone: UTC-sensitive pricing tests use repository-controlled timestamps; no host-time assumption was introduced.

## Lifecycle / Upgrade / Persisted-Data Checks

- Approved persisted-data decision: **Directly Usable — No Migration**.
- Representative existing data: selected GraphQL token/pricing/secret/import E2E suites and orchestration stale-model tests used isolated SQLite; import lifecycle passed and old snapshots remain reader-compatible.
- Version-specific runtime branch, dual read/write, or compatibility fallback observed: **No**.
- Residual persisted-data risk: no full production database was touched; direct-use proof is test-owned and does not cover every deployed historical snapshot shape.

## Tests Implemented Or Updated

| Path / Scenario | Change | Requirement / Boundary | Execution Result | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/integration/agent/agent-status-websocket.integration.test.ts` | Updated | API-ERR-001; AC-013–015 | Pass, 7 tests | Canonical code/provider evidence and exact native wire assertion. |
| `autobyteus-server-ts/tests/integration/agent-team-execution/team-agent-segment-admission.integration.test.ts` | Updated | API-ERR-002; AC-013–015 | Pass, 11 tests | Added standalone → Team → wire → application projection error path. |
| `autobyteus-server-ts/tests/integration/application-backend/application-agent-communication-ws.integration.test.ts` | Updated | API-ERR-003; AC-014/015 | Pass, 1 test | Repaired stale current binding/envelope fixtures and added agent/team/member terminal errors over real WS. |
| `autobyteus-server-ts/tests/unit/application-agent-streaming/application-agent-runtime-source.test.ts` | Updated | API-ERR-005 | Pass, 2 tests | Replaced retired raw Team/task fixture with current sequenced root-event envelope. |
| `autobyteus-server-ts/tests/e2e/llm-management/model-metadata-provenance-graphql.e2e.test.ts` | Updated | API-ERR-006; AC-001/002 | Pass, 4 tests | Replaced retired Gemini identifier with approved `gemini-3.7-flash`. |
| `test-support/live-e2e/live-e2e-harness.ts` | Updated | API-REAL-001 support; compactor evidence inspection | Pass, 19-test harness suite | Replaced stale `listRawTraceCorpusOrdered()` call with the current `listTurnRawTraceCorpusOrdered()` API; no production source changed. The selected live scenario remains unresolved at a later leaf-evidence check. |
| `test-support/live-e2e/live-e2e-scenarios.mjs` | Updated | API-REAL-001 preflight fixture validity; current catalog | Pass, 19-test harness suite and 18-test preflight | Replaced retired Gemini LLM fixture identifiers with approved `gemini-3.7-flash`; no scenario was removed. |

## Tests Removed As Stale Or Obsolete

None. Stale assertions were repaired in place; no compatibility-only coverage was retained.

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed in the overall package: **Yes**.
- Round 5 retained paths added or removed: **None**; the seven earlier reviewed paths remain unchanged.
- Temporary Grok/Kimi/GLM scenario entries were restored before final validation.
- Added or updated paths attached for proportional test-code review: **Yes, in the prior handoff; CRR-006 remains applicable for Round 5**.

## Other Execution Artifacts

| Artifact Path | Type / Purpose | Retained Or Temporary | Notes |
| --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/provider-catalog-pricing-error-messaging/api-e2e-coverage-investigation.md` | Authoritative coverage plan and validity record | Retained | Updated with execution-discovered stale fixtures and confidence. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/provider-catalog-pricing-error-messaging/api-e2e-execution-coverage-report.md` | Authoritative execution result | Retained | This report. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/provider-catalog-pricing-error-messaging/api-e2e-revision-record.md` | Round history | Retained | API-REV-001 baseline through API-REV-005 provider-capability recovery history. |
| `/tmp/live-e2e-evidence-*` | Sanitized live-run evidence scanner directory | Temporary | Runner removed its temporary evidence directory in its `finally` path. |

## Temporary Execution Methods / Scaffolding

| Path / Method | Why Needed | Result / Evidence | Cleanup Result |
| --- | --- | --- | --- |
| Test-owned Prisma SQLite under `autobyteus-server-ts/tests/.tmp` | Server unit/integration/E2E isolation | Migrations and selected E2E passed | Test hooks cleaned owned runtimes. |
| Documented built live-E2E runner | Value-safe preflight, direct configured-provider runs, temporary provider probes, and LM Studio compactor scenario | Final preflight 18/18; Vertex Express Gemini/OpenAI/Anthropic/Grok/GLM passed; DeepSeek/Kimi failed safe provider operation; LM Studio compactor remains unresolved | Runner cleanup completed after each run; temporary provider scenario entries restored; no matching worktree runner/server processes remained. |

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| Provider HTTP failure responses | Safe synthetic provider error payloads remain the deterministic error-fidelity proof; Round 5 also ran configured provider requests through the live boundary | Provider response bodies/status details are intentionally withheld by the live runner and no provider-error body assertion was retained | Does not prove every provider actual status/body shape or failure classification. |
| Agent/team runtime managers | In-process harnesses plus real Fastify/WS session and SDK | Docker node/build identity is not safely available | Does not prove container networking or deployed image identity. |
| Browser DOM | Nuxt Vitest handler/projector tests and production build | No deterministic provider-error browser fixture; browser run would not prove missing live provider behavior | DOM/layout and browser-native WS integration remain untested. |

## Result Summary

| Result | Scenario IDs | Summary / Reason |
| --- | --- | --- |
| Pass | API-ERR-001, API-ERR-002, API-ERR-003, API-ERR-005, API-ERR-006, API-UNIT-001, API-CONTRACT-001, API-E2E-001, API-REAL-001 | Ticket-specific API/E2E coverage passed for exercised requirements: catalog/pricing/runtime/API coverage, missing-key mapping, provider-message fixtures/redaction, canonical native/team transport, application message-only projection, and relevant configured requests. |
| Residual / Non-Gating | API-REAL-001 broader live capability | DeepSeek/Kimi body-fidelity/operation causes, LM Studio compactor leaf evidence, MiniMax/Gemini AI Studio, Docker identity, browser DOM, and live recovery remain explicitly unproven. |
| Not Tested | API-BROWSER-001 | Browser DOM journey was not run; it is residual and non-gating for this source change. |

## Cleanup Performed

| Resource / Process / Data | Ownership | Cleanup Action | Result |
| --- | --- | --- | --- |
| Vitest Prisma test databases and test runtime directories | Test hooks / worktree | Allowed hooks and runner cleanup to remove isolated stores | Complete; no development DB used. |
| Built live-E2E server and runner | This validation | Stopped/allowed cleanup after each selected run; interrupted only the owned combined-turn probe; verified no matching runner/server process remained | Complete. |
| Browser/Electron | None started | No cleanup required | Complete. |

## Preliminary Classification

- Ticket-specific classification: **API/E2E Pass** for the approved exercised requirements. Deterministic provider-message fixtures are authoritative for AC-010–AC-012; Docker-equivalent contract tests are authoritative for AC-013–AC-015; relevant catalog/pricing/runtime/API coverage passed.
- Residual classification: **API/E2E-owned external-provider/environment capability residual**, not a source failure and not a ticket-gating failure. DeepSeek/Kimi wrapper-level failures, LM Studio compactor evidence, unavailable providers, Docker identity, browser DOM, and live recovery remain visible.
- No provider response, source exception, incorrect payload, or deterministic application implementation failure was observed. CRR-002 source Pass, CRR-006 proportional test review, and CRR-009 failure-origin review remain authoritative.
- No Round 6 durable coverage change was retained. Delivery handoff is appropriate with residuals explicitly listed.

## Evidence / Notes

- All recorded provider-like messages and request IDs are synthetic safe fixtures; no API key, authorization header, raw exception, or secret value is included.
- The initial E2E metadata failure was a valid stale-test finding: the approved catalog removed `gemini-3-flash-preview`; the test now targets `gemini-3.7-flash` and passes.
- The initial runtime-source failure was a valid stale-test finding: current team publishers deliver `{ changeSequence, event }`; the test now uses that envelope and passes.
- The expected foreign-key diagnostic printed by the current-database import lifecycle is inside the test's transactional negative fixture; the test passed and no external DB was used.
- Round 2 selected-run evidence: LM Studio endpoint metadata was checked value-safely and exposed 15 local model IDs including `qwen/qwen3.6-35b-a3b`; no model response body, key, authorization header, or secret value was recorded. The final full preflight reported 18 passing capability checks.
- Round 2 focused failures: stale `FileMemoryStore` method caused the original topology misclassification; after repair, the live compactor reached one completed compaction but the selected task lacked the Unicode-boundary source, yielding `LIVE_E2E_CANONICAL_COMPACTOR_LEAF_EVIDENCE_MISSING`. The combined-turn experiment was reverted after no final result for >10 minutes.

## Round 3 Disposition And Additional Evidence

- Prior failure rechecked first with the unmodified durable scenario. Value-safe preflight passed, LM Studio was READY, and the run reached one completed compaction before failing `LIVE_E2E_CANONICAL_COMPACTOR_LEAF_EVIDENCE_MISSING`.
- The emitted budget probe was scanner-safe and contained only counts/phases: prompt tokens `[2561,15952,2897,3879,4102,5857,6056,6302]`, trigger threshold `13043`, phases `requested/started/completed`. This establishes that the large Group-A read crossed the trigger before the Unicode-boundary turn; the missing leaf source is a deterministic scenario-selection mismatch, not an observed provider or product failure.
- A temporary 40-record Group-A plus short acknowledgment probe kept prompt tokens below threshold and produced no compaction. A second temporary probe added inert context pressure but produced no final result in the bounded operator window and was interrupted. Both probes were restored; they are not durable coverage changes.
- Post-restoration harness validation passed 19/19 and `git diff --check` passed. The durable diff remains the two previously reviewed test-support repairs; no new Round 3 durable test/support path is retained.
- Disposition: **Fail / blocked completion gate** for API-REAL-001. The remaining issue is an API/E2E-owned test-support/capability-execution block. No implementation finding is opened. A truthful Pass requires a deterministic live compactor scenario result or an explicitly reviewed scenario redesign; neither was obtained.

## Round 4 Explicit Final Disposition

- CRR-007 confirmed the Round 3 failure evidence and requested either a deterministic reviewed live compactor result or an explicit disposition.
- No new safe configured provider/model, external credential set, Docker identity, or reviewed deterministic scenario redesign is available. Repeating the same LM Studio run without a changed capability would only reproduce the documented timing mismatch or local-model non-completion.
- Explicit result: **API-REAL-001 remains Fail / blocked for the completion gate**. Preflight and partial compaction are supporting evidence only and are not promoted to Pass.
- Classification remains **API/E2E-owned Local Fix — test-support/capability-execution disposition block**. CRR-002 source pass remains authoritative; no implementation finding is reopened.
- Resume condition: provide a deterministic reviewed live compactor capability or an explicitly reviewed scenario/test-support redesign that produces final scanner-clean leaf evidence without weakening the contract.
- No Round 4 code or durable coverage change was made; the seven previously reviewed paths and two accepted support repairs remain unchanged. Final confidence remains 87%; package is not delivery-ready.

## Round 5 Provider-Capability Recovery And Direct Provider Evidence

- User-authorized importer target was the worktree test DB. Dry run reported CREATE 9, BLOCKED 0; confirmed import reported CONFIGURED 9, SKIPPED 0, REPLACED 0. Values were never printed, logged, or written to the report.
- Final preflight passed 18/18. READY included OpenAI, DeepSeek, Vertex Express Gemini, Anthropic, AutoByteus, and LM Studio; Serper and Gemini AI Studio were missing. MiniMax was not eligible because no mapped credential was imported.
- Direct runs: DeepSeek/Gemini/OpenAI produced Gemini PASS, OpenAI PASS, DeepSeek FAIL with LIVE_E2E_PROVIDER_OPERATION_FAILED:deepseek.llm. Temporary Grok/Kimi/GLM produced Grok PASS, GLM PASS, Kimi FAIL with LIVE_E2E_PROVIDER_OPERATION_FAILED:kimi.llm. Anthropic passed 2/2 tests.
- Temporary Grok/Kimi/GLM entries were restored before final harness validation. Final harness validation passed 19/19 and git diff --check passed; no new Round 5 durable coverage remains.
- Result is not a completion Pass: DeepSeek/Kimi operation failures, unresolved LM Studio compactor leaf evidence, MiniMax/Gemini AI Studio absence, provider-error response-body fidelity, Docker identity, browser DOM, and live recovery remain unproven. No source finding is reopened.

## Round 6 Scope Disposition And Ticket-Specific Pass

- Solution-designer scope decision: LM Studio compaction is not a hard gate because it is not a named requirement or acceptance criterion. Its incomplete leaf evidence is a non-gating broad capability residual.
- Ticket-specific API/E2E result: **Pass**. Missing-key mapping, original provider-message preservation/redaction, canonical native code/message transport, native/team/application message-only projection, relevant catalog/pricing/runtime/API coverage, and relevant configured provider requests passed.
- AC-010–AC-012 authority: deterministic fixtures and redaction/transport assertions; no live account balance or live provider response is required.
- AC-013–AC-015 authority: Docker-equivalent native/team/application contract tests; the application SDK remains message-only with ERROR shape { type: ERROR, message: string }.
- Residuals retained and not promoted to Pass: DeepSeek/Kimi live body/operation fidelity, MiniMax/Gemini AI Studio, Docker build/port-8001 identity, browser DOM, LM Studio compactor leaf evidence, and live restart/recovery.
- No durable coverage or test-support change was made in Round 6. CRR-006 and CRR-009 remain applicable.
- Delivery status: feature-specific package is ready for delivery handoff with non-gating residual risks recorded.

## Latest Authoritative Result

- Ticket-specific result: **Pass** for the exercised API/E2E requirements.
- Aggregate broader live-capability result: **Incomplete / non-gating residual**, with aggregate confidence 89%.
- Passed ticket evidence: deterministic missing-key behavior; original provider-message fixture preservation/redaction; canonical native code/message; native/team/application message-only projection; catalog/pricing/runtime/API coverage; relevant configured provider requests.
- Residuals not promoted to Pass: DeepSeek/Kimi live operation/body fidelity; MiniMax/Gemini AI Studio capability; Docker build/port-8001 identity; browser DOM; LM Studio compactor leaf evidence; live restart/recovery.
- No live account balance or live provider response is required for AC-010–AC-012 under the approved scope.
- No Round 6 durable coverage change was retained. CRR-006 remains the proportional test review; CRR-009 remains the failure-origin review.
- Delivery handoff: **Ready for delivery review**, with residual/non-gating capability risks explicitly carried forward.

