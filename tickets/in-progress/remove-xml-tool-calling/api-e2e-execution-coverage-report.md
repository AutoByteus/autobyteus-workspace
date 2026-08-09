# API/E2E Execution Coverage Report

## Execution Round Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-xml-tool-calling/tickets/in-progress/remove-xml-tool-calling/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-xml-tool-calling/tickets/in-progress/remove-xml-tool-calling/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-xml-tool-calling/tickets/in-progress/remove-xml-tool-calling/design-spec.md`
- Supplemental Task Artifacts: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-xml-tool-calling/tickets/in-progress/remove-xml-tool-calling/legacy-tool-calling-removal-inventory.md`
- Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-xml-tool-calling/tickets/in-progress/remove-xml-tool-calling/solution-revision-record.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-xml-tool-calling/tickets/in-progress/remove-xml-tool-calling/design-review-report.md`
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-xml-tool-calling/tickets/in-progress/remove-xml-tool-calling/architecture-review-revision-record.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-xml-tool-calling/tickets/in-progress/remove-xml-tool-calling/implementation-handoff.md`
- Implementation Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-xml-tool-calling/tickets/in-progress/remove-xml-tool-calling/implementation-revision-record.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-xml-tool-calling/tickets/in-progress/remove-xml-tool-calling/code-review-report.md`
- Code Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-xml-tool-calling/tickets/in-progress/remove-xml-tool-calling/code-review-revision-record.md`
- Delivery Revision Record: N/A
- Relevant Delivery Revision IDs: N/A
- Coverage Investigation: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-xml-tool-calling/tickets/in-progress/remove-xml-tool-calling/api-e2e-coverage-investigation.md`
- API/E2E Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-xml-tool-calling/tickets/in-progress/remove-xml-tool-calling/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- Current Execution Round: `1`
- Trigger: `CRR-001` Pass plus the user's explicit instruction to run real tests using keys imported from `/Users/normy/.autobyteus/server-data/.env` through the pnpm importer.
- Prior Round Reviewed: N/A
- Latest Authoritative Round: Round 1, this file.

## Investigation And Execution Basis

- Coverage investigation artifact: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-xml-tool-calling/tickets/in-progress/remove-xml-tool-calling/api-e2e-coverage-investigation.md`
- Investigation completed before durable coverage changes or final execution: `Yes`.
- Investigation plan followed: `Yes`, with two material safe deviations:
  1. Ports 8000/3000 were owned by unrelated processes, so the built backend and Nuxt dev frontend used reserved loopback ports rather than stopping unknown owners.
  2. The initial package-level `node_modules` link made the server's workspace `autobyteus-ts` dependency resolve to the installed superrepo checkout. Before authoritative server/live execution, the package-local dependency tree was materialized and the link was verified to resolve to this ticket worktree. All affected server, build, preflight, live, and browser evidence was then repeated.
- Existing coverage decisions revised during execution, with evidence: Two additional stale file-tool usage-helper assertions were found by the full core unit suite. XML usage coverage was removed, and JSON usage coverage was redirected to the supported native `ToolSchemaProvider`; the full core rerun passed 1,512 tests.
- Reroute required before or during execution: `No`.
- Notes: Initial non-authoritative setup diagnostics and the first authoritative external-model failure are retained rather than hidden.

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`.
- Compatibility-only or legacy-retention behavior observed in implementation: `No`.
- Approved persisted-data transition followed without unnecessary migration or version-specific runtime fallback: `Yes` — exact-key discard/rejection only.
- Durable coverage added or retained only for compatibility-only behavior: `No`.
- If compatibility-related invalid scope was observed, reroute classification used: N/A.
- Upstream recipient notified: N/A.

## Changed Boundary And Evidence Matrix

| Scenario ID | Behavior / Requirement / Acceptance-Criteria IDs | Changed Boundary | Execution Surface / Mode | Evidence Type | Result | Evidence / Artifact |
| --- | --- | --- | --- | --- | --- | --- |
| NATIVE-HANDLER-001 | REQ-001–004; AC-001/002 | Mixed/native deltas, parallel calls, IDs/arguments/context, callback/segment order, live file projection, failure suppression | Core unit + AgentRuntime integration | Durable | Pass | `core-targeted.log`, `core-integration-native-flow.log` |
| NATIVE-TEXT-001 | REQ-001/007; AC-003 | XML/JSON/sentinel/`[TOOL_CALL]`-like content remains text and creates zero invocations | Native/pass-through unit | Durable | Pass | `core-targeted.log` |
| PUBLIC-SURFACE-001 | REQ-007/008/010; AC-004/010/013 | Removed exports/subpaths absent; supported native schema/streaming imports and unrelated facilities remain | Unit/build/static scan | Durable | Pass | `core-unit-full-rerun.log`, `core-build.log`, `static-legacy-scan.log` |
| NATIVE-CONT-001 | REQ-003/004; AC-005/006 | Ordered exactly-once native result ingestion, context-file carrier, provider-native histories | Unit + integration | Durable | Pass | `core-targeted.log`, `core-integration-native-flow.log` |
| NATIVE-NOTOOL-001 | REQ-006; AC-007 | No tools selects pass-through and sends no schema | Unit | Durable | Pass | `core-targeted.log` |
| CONFIG-RETIRE-001 | REQ-005; AC-008/009 | Exact retired-key initialization discard, set rejection, idempotence, unrelated preservation, read-only tolerance | AppConfig unit + Settings GraphQL E2E | Durable | Pass | `server-settings-targeted-worktree-core.log` |
| AUTOBYTEUS-CHAT-001 | REQ-009; AC-011 | Ordinary content/media only; no text tool-call/result emulation | Core unit | Durable | Pass | `core-targeted.log` |
| BUILD-001 | REQ-011; AC-012 | Core/server/web production compilation and stale coverage cleanup | Package builds + full core unit | Durable | Pass | `core-build.log`, `real-provider-preflight-worktree-core.log`, `web-build.log`, `durable-coverage-diff.txt` |
| LIVE-NATIVE-001 | AC-001/002/005/006 | Real DeepSeek provider, product AgentRun, native read/read/write, compaction/continuation and exact artifact | Managed-secret real E2E | Live | Pass on clean rerun | `real-provider-deepseek-rerun-worktree-core.log`; first attempt variance in `real-provider-execution-worktree-core.log` |
| LIVE-NOTOOL-001 | AC-007 | Real OpenAI no-tool product AgentRun | Managed-secret real E2E | Live | Pass | `real-provider-execution-worktree-core.log` |
| LIVE-AUTOBYTEUS-001 | AC-011 supplemental realism | AutoByteus remote ordinary LLM discovery/execution | Managed-secret real E2E | Live | Not Tested after readiness — capability unavailable | `AUTOBYTEUS_LLM_DISCOVERY_FAILED` explicit skip in `real-provider-execution-worktree-core.log` |
| BROWSER-SETTINGS-001 | AC-008/009/012 | Populated Basics and Advanced Settings views | Built backend + Nuxt + Chrome | Browser | Pass | `browser-settings-probe-worktree-core.log`, quick/advanced screenshots |

## Additional Repository Coverage Execution

The coverage investigation contains the authoritative repository command table. No extra repository-resident coverage was changed after the final repository gate; subsequent execution was live/provider/browser validation and one live rerun.

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | Change | New / Final Supporting Evidence | Residual Uncertainty |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 95% | 98% | +3 | Every AC has direct durable evidence; live native tool/no-tool and browser journeys close critical realism gaps | AutoByteus remote discovery unavailable; not a native tool provider boundary. |
| Changed-boundary execution directness | 95% | 98% | +3 | Worktree-resolved server executed the reviewed core through real AgentRun/tool and Settings GraphQL/browser paths | Not every provider called a real tool. |
| Cross-boundary integration realism and mock gap | 90% | 97% | +7 | Real provider SDK/network, SQLite vault, server, AgentRun, tools, memory, Nuxt proxy and DOM executed | One external provider capability unavailable. |
| Environment, configuration, identity, and fixture fidelity | 90% | 98% | +8 | Audited value-safe import to exact test DB; three secrets ready; built isolated server; verified worktree package resolution | Test vault is local SQLite rather than a packaged desktop data store, which is appropriate for scope. |
| Failure, edge-case, lifecycle, and recovery evidence | 95% | 95% | 0 | Durable interruption/failure/order/read-only cases pass; first DeepSeek run exposed invalid compactor JSON, runtime retry/completion, harness fail, then clean rerun pass | External model response variance can recur. |
| User-surface, browser, and desktop-shell confidence | 90% | 98% | +8 | Chrome loaded populated Basics and Advanced views; 7 current cards, table, negative key/text assertions, zero page/console errors; screenshots visually inspected | Electron-shell-only behavior not tested because unchanged. |
| Durable regression coverage quality and relevance | 95% | 96% | +1 | 1 added, 39 updated, 65 stale tests removed; 1,512-test core suite green; affected server/web tests pass | One unrelated Codex Settings wording assertion is stale; external removed-subpath consumers cannot be enumerated. |

- Overall post-repository confidence: **93%**.
- Overall final confidence: **97%** (97.1%, rounded).
- Calculation method: Simple average of seven applicable categories.
- Confidence change produced by broader validation: **+4 percentage points**, primarily environment/cross-boundary/browser realism.
- Every critical acceptance criterion directly proven: `Yes`.
- Any final applicable category below `90%`: `No`.
- Default final confidence target of `95%` met: `Yes`.
- Confidence-limiting residual risks: bounded DeepSeek compactor JSON variance; AutoByteus remote discovery unavailable; not every provider exercised a real tool call; intentional external breaking-surface consumers are not enumerable.

## Broader Validation Decision And Execution

- Decision and selected execution mode from the coverage investigation: `Required` — `Live API` plus `Browser`.
- Material deviation from the planned mode or rationale: Canonical ports were occupied by unrelated processes, so equivalent project-supported backend/Nuxt components ran on reserved loopback ports. No unknown process was stopped.
- Confidence gap or residual risk actually addressed: Real native tool lifecycle/continuation, real no-tool response, managed credential fidelity, and populated Settings absence.
- If `Not Required`: N/A.
- If `Blocked`: N/A.
- Startup order, commands, and readiness results:
  1. `pnpm secrets:import ... --dry-run` — value-safe plan: 9 creates, initialization required.
  2. `pnpm secrets:import ...` in an actual TTY, confirmed with `IMPORT` — migrations applied, 9 secrets configured, values never output.
  3. Verified `autobyteus-server-ts/node_modules/autobyteus-ts` resolved to this ticket worktree.
  4. `pnpm test:e2e:real:preflight -- --scenarios=deepseek.compaction-agent-flow,openai.agent-flow,autobyteus.remote-llm` — all three `READY`.
  5. Combined real execution — OpenAI passed; AutoByteus explicitly skipped after discovery failure; first DeepSeek attempt failed the harness because an initial compactor response was invalid JSON even though a retry completed and exact artifact creation continued.
  6. Immediate DeepSeek-only rerun — clean Pass with one completed compaction and all exact assertions.
  7. Built backend + Nuxt on reserved ports, then headless Chrome semantic journey — Pass.
- Environment choices: Authorized owner-private source was importer input only, never sourced or copied. Exact target was `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-xml-tool-calling/autobyteus-server-ts/db/test.db`. Runtime roots and ports were isolated.
- Seed data, fixtures, identities, authentication, permissions, or session state: Harness-generated evidence A/B, temporary workspace/memory, exact artifact contract; managed secret resolver; local no-auth browser Settings.

| Scenario / Journey Step | Expected Observable Result | Actual Observable Result | Evidence | Result |
| --- | --- | --- | --- | --- |
| Secret import preview/execute | Exact test DB; value-free 9-secret plan/import | Initialization and 19 migrations completed; 9 configured; no values logged | `secrets-import-dry-run.log`, `secrets-import-actual-tty.log` | Pass |
| Real preflight | DeepSeek/OpenAI/AutoByteus credentials ready | All three `READY`, no missing IDs | `real-provider-preflight-worktree-core.log` | Pass |
| DeepSeek native tool/compaction | 2 reads, 1 write, no tool failure, completed compaction, exact artifact/memory/context | Clean rerun: `successfulToolCount=3`, `recoverableToolFailureCount=0`, one completed compaction, exact artifact/memory/context and canonical compactor all verified | `real-provider-deepseek-rerun-worktree-core.log` | Pass |
| DeepSeek first attempt recovery evidence | Harness must reject any failed compaction phase | Provider returned invalid compactor JSON; runtime emitted failed, retried, completed and produced the artifact; harness correctly returned `LIVE_E2E_COMPACTION_LIFECYCLE_NOT_COMPLETED` | `real-provider-execution-worktree-core.log` | Fail resolved by clean rerun; retained risk |
| OpenAI no-tool AgentRun | Real ordinary assistant completion, no tool schemas/invocations | Product AgentRun completed with observed events | `real-provider-execution-worktree-core.log` | Pass |
| AutoByteus remote ordinary LLM | Discover and call remote model when available | Credential ready, discovery returned `AUTOBYTEUS_LLM_DISCOVERY_FAILED`; explicit capability-unavailable skip | same log | Not Tested, not misreported |
| Settings Basics | Current endpoint/application/media/streaming/compaction cards visible; no parser control/text | 7 representative current cards visible; no retired strings; no initial read/console/page error | `browser-settings-probe-worktree-core.log`, `browser-settings-quick.png` | Pass |
| Settings Advanced | Current server settings table populated; retired key absent | Table visible; no retired key row/text | `browser-settings-advanced.png` | Pass |

## Desktop Application Validation

- Validation approach executed: Browser-based web-equivalent renderer validation using project components and a built backend.
- Browser-tested web-equivalent behavior and evidence: `/settings?section=server-settings&mode=quick`; semantic data-testid assertions; Advanced navigation; populated cards/table; retired key/text absence; screenshots.
- Shell-specific or lifecycle behavior and evidence: N/A — no Electron/preload/IPC/window changes.
- Effect on any already-running desktop application: `None`.
- Behavior not directly proven and confidence consequence: Electron shell packaging not exercised; no confidence penalty because that boundary is unchanged.

## Platform / Runtime Targets

- Operating system / platform: macOS 26.5.2, Darwin arm64.
- Runtime and relevant framework versions: Node v22.23.1; pnpm 10.28.2; Vitest 4.0.18 core/server; Vitest 3.2.4 web; Nuxt 3.21.1.
- Browser / engine and version: Google Chrome 151.0.7922.108 through playwright-core 1.58.2.
- Device, viewport, locale, timezone, or accessibility settings: 1440×1100 headless desktop viewport; default browser locale; Europe/Berlin host timezone.

## Lifecycle / Upgrade / Restart / Persisted-Data Checks

- Approved persisted-data decision: `Discard or Rebuild`.
- Representative existing data exercised: Exact retired key in persisted `.env` and `process.env`, unrelated exact/suffix/custom keys, writable and read-only config files, repeated initialization, GraphQL list/update.
- Direct-use, discard/rebuild, or migration result and evidence: Exact key is discarded from runtime/file when writable, suppressed for the read-only session when persistence fails, exact later writes are rejected, unrelated keys survive, repeated cleanup is idempotent. GraphQL does not list the key and rejects update.
- Migration completion/recovery evidence: N/A; no migration is approved.
- Version-specific runtime branch, dual read/write, or compatibility fallback observed: `No`.
- Residual untested persisted-data risk: None material within approved exact-key scalar scope.

## Tests Implemented Or Updated

| Path / Scenario | Change | Requirement / Boundary | Execution Result | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-ts/tests/unit/legacy-tool-calling-public-surfaces-removed.test.ts` | Added | AC-004/010/013 | Pass | Supported native imports plus removed export/path absence. |
| Native handler/pass-through/factory/continuation/history/request/rendering/tool-schema tests | Updated | AC-001–007/010/011/013 | Pass | Final provider JSON authority, text-like negative matrix, native-only selection/history and supported schema path. |
| Core runtime/integration tests with retired selector setup | Updated | AC-005/006/009 | Pass where selected; compile/full unit pass | Removed inert legacy setup while preserving native scenarios. |
| Server AppConfig/settings/customization/GraphQL/runtime tests | Updated | AC-008/009/012/013 | 74 affected tests pass; build pass | Exact-key lifecycle plus server operator boundary. |
| Web Basics/compaction-failure tests | Updated | AC-008/012 | 4 changed tests pass; build/browser pass | Current card composition and negative parser control. |

## Tests Removed As Stale Or Obsolete

| Path / Scenario | Obsolete Assertion | Upstream Evidence | Replacement Coverage Or No-Replacement Rationale |
| --- | --- | --- | --- |
| Parser/adapters/parsing-handler/diagnostic tests | Assistant text becomes tool invocations | REQ-001/007; AC-003/004 | Negative surviving-handler coverage; no parser FSM replacement. |
| Manifest/example/text schema/registry/provider tests | Model-facing tools taught or selected through text | REQ-002/007/008; AC-004/010 | Provider-native JSON Schema and public-surface coverage. |
| Text-history renderer/selector tests | XML/text tool history or mutable mode | REQ-004/009; AC-005/006/011 | Unconditional provider-native histories and ordinary AutoByteus content/media. |
| XML/JSON text-invocation integration flows | Text protocol execution | AC-003/004 | Durable native integration plus real provider-native tool flow. |
| Web StreamingParser card test | Operator can select XML/API mode | REQ-005; AC-008 | Current Basics composition, GraphQL absence and browser absence. |

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `Yes`.
- Summary: **1 added, 39 updated, 65 removed**.
- Paths added:
  - `autobyteus-ts/tests/unit/legacy-tool-calling-public-surfaces-removed.test.ts`
- Paths updated:
  - `autobyteus-server-ts/tests/e2e/runtime/context-file-storage-runtime.e2e.test.ts`
  - `autobyteus-server-ts/tests/e2e/runtime/mixed-task-delegation.e2e.test.ts`
  - `autobyteus-server-ts/tests/e2e/server-settings/server-settings-graphql.e2e.test.ts`
  - `autobyteus-server-ts/tests/integration/agent-execution/autobyteus-agent-run-backend-factory.lmstudio.integration.test.ts`
  - `autobyteus-server-ts/tests/unit/config/app-config.test.ts`
  - `autobyteus-server-ts/tests/unit/services/server-settings-service.test.ts`
  - `autobyteus-server-ts/tests/unit/startup/agent-customization-loader.test.ts`
  - `autobyteus-ts/tests/integration/agent/agent-dual-flow.test.ts`
  - `autobyteus-ts/tests/integration/agent/agent-single-flow-ollama.test.ts`
  - `autobyteus-ts/tests/integration/agent/agent-single-flow.test.ts`
  - `autobyteus-ts/tests/integration/agent/edit-file-benchmark-flow.test.ts`
  - `autobyteus-ts/tests/integration/agent/edit-file-diagnostics.test.ts`
  - `autobyteus-ts/tests/integration/agent/handlers/mistral-tool-call-handler-live.test.ts`
  - `autobyteus-ts/tests/integration/agent/lmstudio-single-agent-run-bash-flow.test.ts`
  - `autobyteus-ts/tests/integration/agent/memory-compaction-strategy-tool-lifecycle.test.ts`
  - `autobyteus-ts/tests/integration/agent/openai-single-agent-flow.test.ts`
  - `autobyteus-ts/tests/integration/agent/provider-native-tool-continuation-flow.test.ts`
  - `autobyteus-ts/tests/integration/agent/run-bash-benchmark-flow.test.ts`
  - `autobyteus-ts/tests/integration/agent/runtime/agent-runtime-real-compaction-lmstudio.e2e.test.ts`
  - `autobyteus-ts/tests/integration/agent/runtime/agent-runtime.test.ts`
  - `autobyteus-ts/tests/unit/agent/context/agent-config.test.ts`
  - `autobyteus-ts/tests/unit/agent/loop/tool-result-continuation-builder.test.ts`
  - `autobyteus-ts/tests/unit/agent/pipelines/agent-input-pipeline.test.ts`
  - `autobyteus-ts/tests/unit/agent/streaming/handlers/api-tool-call-streaming-response-handler.test.ts`
  - `autobyteus-ts/tests/unit/agent/streaming/handlers/pass-through-streaming-response-handler.test.ts`
  - `autobyteus-ts/tests/unit/agent/streaming/handlers/streaming-handler-factory.test.ts`
  - `autobyteus-ts/tests/unit/agent/system-prompt-processor/register-system-prompt-processors.test.ts`
  - `autobyteus-ts/tests/unit/agent/tool-execution-result-processor/memory-ingest-tool-result-processor.test.ts`
  - `autobyteus-ts/tests/unit/llm/api/lmstudio-llm.test.ts`
  - `autobyteus-ts/tests/unit/llm/api/provider-native-request-payloads.test.ts`
  - `autobyteus-ts/tests/unit/llm/prompt-renderers/autobyteus-prompt-renderer.test.ts`
  - `autobyteus-ts/tests/unit/llm/prompt-renderers/provider-native-tool-history-renderers.test.ts`
  - `autobyteus-ts/tests/unit/tools/base-tool.test.ts`
  - `autobyteus-ts/tests/unit/tools/file/file-tool-schema.test.ts`
  - `autobyteus-ts/tests/unit/tools/file/read-file.test.ts`
  - `autobyteus-ts/tests/unit/tools/index.test.ts`
  - `autobyteus-ts/tests/unit/tools/registry/tool-definition.test.ts`
  - `autobyteus-web/components/settings/__tests__/ServerSettingsBasicsPanel.spec.ts`
  - `autobyteus-web/components/settings/__tests__/ServerSettingsCompactionFailure.spec.ts`
- Paths removed:
  - `autobyteus-ts/tests/integration/agent/agent-single-flow-xml.test.ts`
  - `autobyteus-ts/tests/integration/agent/streaming/full-streaming-flow.test.ts`
  - `autobyteus-ts/tests/integration/agent/streaming/json-tool-styles-integration.test.ts`
  - `autobyteus-ts/tests/integration/agent/streaming/parser/streaming-parser.test.ts`
  - `autobyteus-ts/tests/integration/tools/usage/formatters/anthropic-json-example-formatter.test.ts`
  - `autobyteus-ts/tests/integration/tools/usage/formatters/default-json-example-formatter.test.ts`
  - `autobyteus-ts/tests/integration/tools/usage/formatters/default-json-schema-formatter.test.ts`
  - `autobyteus-ts/tests/integration/tools/usage/formatters/default-xml-example-formatter.test.ts`
  - `autobyteus-ts/tests/integration/tools/usage/formatters/default-xml-schema-formatter.test.ts`
  - `autobyteus-ts/tests/integration/tools/usage/formatters/edit-file-xml-formatter.test.ts`
  - `autobyteus-ts/tests/integration/tools/usage/formatters/gemini-json-example-formatter.test.ts`
  - `autobyteus-ts/tests/integration/tools/usage/formatters/google-json-example-formatter.test.ts`
  - `autobyteus-ts/tests/integration/tools/usage/formatters/google-json-schema-formatter.test.ts`
  - `autobyteus-ts/tests/integration/tools/usage/formatters/mistral-json-schema-formatter.test.ts`
  - `autobyteus-ts/tests/integration/tools/usage/formatters/openai-json-example-formatter.test.ts`
  - `autobyteus-ts/tests/integration/tools/usage/formatters/run-bash-xml-formatter.test.ts`
  - `autobyteus-ts/tests/integration/tools/usage/formatters/write-file-xml-formatter.test.ts`
  - `autobyteus-ts/tests/integration/tools/usage/providers/tool-manifest-provider.test.ts`
  - `autobyteus-ts/tests/integration/tools/usage/registries/tool-formatting-registry.test.ts`
  - `autobyteus-ts/tests/integration/tools/utils.test.ts`
  - `autobyteus-ts/tests/integration/utils/tool-call-format.test.ts`
  - `autobyteus-ts/tests/unit/agent/streaming/adapters/tool-call-parsing.test.ts`
  - `autobyteus-ts/tests/unit/agent/streaming/adapters/tool-syntax-registry.test.ts`
  - `autobyteus-ts/tests/unit/agent/streaming/handlers/api-tool-call-text-diagnostic.test.ts`
  - `autobyteus-ts/tests/unit/agent/streaming/handlers/parsing-streaming-response-handler.test.ts`
  - `autobyteus-ts/tests/unit/agent/streaming/parser/event-emitter.test.ts`
  - `autobyteus-ts/tests/unit/agent/streaming/parser/events.test.ts`
  - `autobyteus-ts/tests/unit/agent/streaming/parser/invocation-adapter.test.ts`
  - `autobyteus-ts/tests/unit/agent/streaming/parser/json-parsing-states.test.ts`
  - `autobyteus-ts/tests/unit/agent/streaming/parser/json-parsing-strategies.test.ts`
  - `autobyteus-ts/tests/unit/agent/streaming/parser/parser-context.test.ts`
  - `autobyteus-ts/tests/unit/agent/streaming/parser/parser-factory.test.ts`
  - `autobyteus-ts/tests/unit/agent/streaming/parser/sentinel-parsing-state.test.ts`
  - `autobyteus-ts/tests/unit/agent/streaming/parser/state-factory.test.ts`
  - `autobyteus-ts/tests/unit/agent/streaming/parser/states/custom-xml-tag-run-bash-parsing-state.test.ts`
  - `autobyteus-ts/tests/unit/agent/streaming/parser/states/custom-xml-tag-write-file-parsing-state.test.ts`
  - `autobyteus-ts/tests/unit/agent/streaming/parser/states/xml-edit-file-tool-parsing-state.test.ts`
  - `autobyteus-ts/tests/unit/agent/streaming/parser/states/xml-run-bash-tool-parsing-state.test.ts`
  - `autobyteus-ts/tests/unit/agent/streaming/parser/states/xml-tool-parsing-state.test.ts`
  - `autobyteus-ts/tests/unit/agent/streaming/parser/states/xml-write-file-tool-parsing-state.test.ts`
  - `autobyteus-ts/tests/unit/agent/streaming/parser/stream-scanner.test.ts`
  - `autobyteus-ts/tests/unit/agent/streaming/parser/streaming-parser.test.ts`
  - `autobyteus-ts/tests/unit/agent/streaming/parser/text-state.test.ts`
  - `autobyteus-ts/tests/unit/agent/streaming/parser/xml-tag-initialization-state.test.ts`
  - `autobyteus-ts/tests/unit/agent/streaming/parser/xml-tool-parsing-state-registry.test.ts`
  - `autobyteus-ts/tests/unit/agent/system-prompt-processor/tool-manifest-injector-processor.test.ts`
  - `autobyteus-ts/tests/unit/llm/prompt-renderers/lmstudio-text-tool-history-renderer.test.ts`
  - `autobyteus-ts/tests/unit/tools/usage/formatters/anthropic-json-example-formatter.test.ts`
  - `autobyteus-ts/tests/unit/tools/usage/formatters/default-json-example-formatter.test.ts`
  - `autobyteus-ts/tests/unit/tools/usage/formatters/default-json-schema-formatter.test.ts`
  - `autobyteus-ts/tests/unit/tools/usage/formatters/default-xml-example-formatter.test.ts`
  - `autobyteus-ts/tests/unit/tools/usage/formatters/default-xml-schema-formatter.test.ts`
  - `autobyteus-ts/tests/unit/tools/usage/formatters/edit-file-xml-formatter.test.ts`
  - `autobyteus-ts/tests/unit/tools/usage/formatters/gemini-json-example-formatter.test.ts`
  - `autobyteus-ts/tests/unit/tools/usage/formatters/google-json-example-formatter.test.ts`
  - `autobyteus-ts/tests/unit/tools/usage/formatters/google-json-schema-formatter.test.ts`
  - `autobyteus-ts/tests/unit/tools/usage/formatters/mistral-json-schema-formatter.test.ts`
  - `autobyteus-ts/tests/unit/tools/usage/formatters/openai-json-example-formatter.test.ts`
  - `autobyteus-ts/tests/unit/tools/usage/formatters/run-bash-xml-formatter.test.ts`
  - `autobyteus-ts/tests/unit/tools/usage/formatters/write-file-xml-formatter.test.ts`
  - `autobyteus-ts/tests/unit/tools/usage/providers/tool-manifest-provider.test.ts`
  - `autobyteus-ts/tests/unit/tools/usage/registries/tool-formatting-registry.test.ts`
  - `autobyteus-ts/tests/unit/tools/utils.test.ts`
  - `autobyteus-ts/tests/unit/utils/tool-call-format.test.ts`
  - `autobyteus-web/components/settings/__tests__/StreamingParserCard.spec.ts`
- Added or updated paths attached for proportional test-code review: `Yes` — added/updated paths are included in the handoff reference package; this report and the durable diff enumerate all paths.
- Diff or repository evidence supplied for removed paths: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-xml-tool-calling/tickets/in-progress/remove-xml-tool-calling/validation-logs/round1/durable-coverage-diff.txt`.

## Other Execution Artifacts

| Artifact Path | Type / Purpose | Retained Or Temporary | Notes |
| --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-xml-tool-calling/tickets/in-progress/remove-xml-tool-calling/validation-logs/round1` | Value-safe command logs and screenshots | Retained ticket evidence | No secret values; the real-E2E scanner remained clean. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-xml-tool-calling/tickets/in-progress/remove-xml-tool-calling/validation-logs/round1/browser-settings-quick.png` | Visual Basics evidence | Retained | Visually inspected; current cards shown, no parser card. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-xml-tool-calling/tickets/in-progress/remove-xml-tool-calling/validation-logs/round1/browser-settings-advanced.png` | Visual Advanced evidence | Retained | Visually inspected; populated table without retired key. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-xml-tool-calling/tickets/in-progress/remove-xml-tool-calling/validation-logs/round1/durable-coverage-diff.txt` | Per-path durable change inventory | Retained | Authoritative 1 A / 39 M / 65 D list. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-xml-tool-calling/tickets/in-progress/remove-xml-tool-calling/validation-logs/round1/final-artifact-verification.log` | Final artifact, credential-shape, cleanup and diff check | Retained | Required artifacts present; text evidence credential-shape scan, temporary setup cleanup, and `git diff --check` passed. |

## Temporary Execution Methods / Scaffolding

| Path / Method | Why Needed | Result / Evidence | Cleanup Result |
| --- | --- | --- | --- |
| `/tmp/remove-xml-tool-calling-browser-probe.mjs` | Semantic browser orchestration against isolated reserved ports | Pass with zero console/page errors | Removed before handoff. |
| Worktree/package `node_modules` links and materialized server dependency tree | Dependencies were absent; authoritative runtime needed workspace links to resolve to this ticket | Builds/tests/live/browser executed against verified worktree core | Removed before handoff. |
| `autobyteus-server-ts/tests/.tmp/remove-xml-tool-calling-browser-runtime` | Isolated browser backend state | Browser Pass | Removed by probe. |

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| Provider deltas/histories in durable core tests | Deterministic normalized chunk/request fixtures | Cover all providers, mixed/parallel/failure cases deterministically | Closed materially by real DeepSeek/OpenAI execution; not every provider live. |
| Persisted settings in unit tests | Temporary owner-private `.env` files and process environment | Safely exercise writable/read-only/idempotent boundaries | Closed by real built-server GraphQL/browser state for operator surface. |

## Result Summary

| Result | Scenario IDs | Summary / Reason |
| --- | --- | --- |
| Pass | NATIVE-HANDLER-001, NATIVE-TEXT-001, PUBLIC-SURFACE-001, NATIVE-CONT-001, NATIVE-NOTOOL-001, CONFIG-RETIRE-001, AUTOBYTEUS-CHAT-001, BUILD-001, LIVE-NATIVE-001, LIVE-NOTOOL-001, BROWSER-SETTINGS-001 | All critical acceptance criteria have direct durable evidence; real provider-native/no-tool and populated browser journeys passed after a clean DeepSeek rerun. |
| Not Tested | LIVE-AUTOBYTEUS-001 execution | Credential was ready but remote model discovery was unavailable; explicit skip, not a pass. |
| Out Of Scope | Unrelated broad-suite failures | One current Codex wording assertion and initial invalid dependency-link server diagnostics do not touch this change; authoritative affected tests/builds pass. |

## Cleanup Performed

| Resource / Process / Data | Ownership | Cleanup Action | Result |
| --- | --- | --- | --- |
| Real-E2E built servers/workspaces/evidence dirs | Harness-owned | Runner stop/finally cleanup | Complete. |
| Browser backend/frontend/Chrome/runtime root | Probe-owned | SIGTERM/close and recursive runtime cleanup | Complete. |
| Temporary browser script | API/E2E-owned `/tmp` | Deleted | Complete. |
| Temporary dependency links/materialized directory | API/E2E-owned worktree setup | Deleted after final commands | Complete before handoff. |
| Test DB/vault | User-authorized isolated test state | Intentionally retained for explicit future real E2E | Retained; source `.env` unchanged. |
| Unknown processes on ports 8000/3000 | Not owned | Not touched | Preserved. |

## Preliminary Classification

The first authoritative DeepSeek run failed because the external compactor model returned a response that was not valid JSON. The runtime emitted `failed`, retried, later emitted `completed`, and continued to the exact artifact; the harness correctly rejected any failed phase. A clean immediate rerun passed all tool, compaction, memory and exact-artifact assertions. Preliminary classification: external provider/model variance, resolved for this validation round; no source/design finding. AutoByteus discovery unavailability is an external capability limitation, not a task failure.

## Recommended Recipient

`code_reviewer` for mandatory proportional review of the 1 added, 39 updated and 65 removed repository-resident durable coverage paths before delivery.

## Evidence / Notes

- Authoritative implementation base reviewed: `33f632054c39a088618723b506f368f5e934608f` against recorded base `7f0fc49965950d9689726a048371f2e2b78eef31`.
- The first real execution log without the `-worktree-core` suffix is non-authoritative because the temporary server dependency link resolved core to the installed superrepo checkout. It is retained as setup history only.
- No secrets were printed, sourced, copied into ticket artifacts, or exposed through browser evidence.

## Latest Authoritative Result

- Result: **Pass**.
- Final validation confidence: **97%**.
- Default `95%` confidence target met: `Yes`.
- Any final applicable confidence category below `90%`: `No`.
- Broader validation decision: `Required` — completed with Live API and Browser evidence.
- Critical acceptance criteria lacking direct proof: None.
- Required next recipient: `code_reviewer` for proportional test-code review.
- Notes: Durable coverage changed and therefore must return through code review before delivery. AutoByteus remote discovery remains explicitly not tested; it does not block this native-only tool change.
