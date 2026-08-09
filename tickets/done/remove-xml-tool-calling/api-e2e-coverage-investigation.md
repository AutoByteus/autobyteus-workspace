# API/E2E Coverage Investigation

## Investigation Meta

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
- Delivery Revision Record (delivery re-entry only): N/A
- Relevant Delivery Revision IDs: N/A
- API/E2E Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-xml-tool-calling/tickets/in-progress/remove-xml-tool-calling/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- Current Investigation Round: `1`
- Trigger: `CRR-001` Pass at implementation commit `33f632054c39a088618723b506f368f5e934608f`; user additionally directed real-provider execution and explicit secret import from `/Users/normy/.autobyteus/server-data/.env`.
- Prior Investigation Reviewed: N/A
- Latest Authoritative Investigation: This file.

## Current Requirement And Design Basis

Provider-native API tool calls must be the only invocation transport. A tool-equipped phase always builds provider schemas and uses the native handler; a zero-tool phase uses pass-through. The native handler must preserve mixed output, indexed/parallel calls, call/name/turn identity, final provider JSON arguments and provider context, callback/segment order, live `write_file`/`edit_file` projection, and interruption/failure suppression. Ordered result ingestion, native histories, and context-file continuation remain exactly-once. XML/JSON/sentinel/`[TOOL_CALL]`-like assistant content is ordinary text without native deltas. The parser/manifest/text-history/public selection surfaces, server setting, and web card are intentionally removed. `AppConfig` alone discards and rejects the exact retired key without changing unrelated settings. AutoByteus conversation rendering remains ordinary content/media only. Supported native schema/request/public surfaces and unrelated XML/JSON/sentinel facilities remain operational.

The implementation handoff's legacy check is clean for production source. Its persisted-data result is `Discard or Rebuild`: exact-key initialization removal across loaded/process/writable state, exact-key write rejection, idempotence, unrelated-key preservation, and read-only-file session tolerance. No migration or compatibility reader is approved.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 / DS-001 / DS-005 native schema, streaming, invocation and execution | Preserved and simplified | REQ-001–REQ-004; AC-001/002; reviewed implementation | Retain and expand direct native handler, request payload, real agent/tool-loop coverage. |
| BEH-002 parser setting and text protocols | Removed | REQ-001/005/007; AC-003/004/008/009 | Remove protocol-only tests; add negative text-like output and retired-control absence coverage. |
| BEH-003 / DS-002 continuation and histories | Changed to unconditional native | REQ-002–REQ-004; AC-005/006 | Update mode-conditional assertions; retain ordered native provider/history/context-file scenarios. |
| BEH-004 / DS-003 no-tool streaming | Preserved | REQ-006; AC-007 | Retain pass-through lifecycle coverage and execute a real no-tool agent flow. |
| BEH-005 package/public contracts | Removed/preserved split | REQ-007/008; AC-004/010 | Remove tests of retired conveniences; add/retain supported import/build and absence scans. |
| BEH-006 AutoByteus conversation rendering | Changed | REQ-009; AC-011 | Replace XML tool-history emulation assertions with ordinary content/media and no tool-text emulation assertions. |
| DS-006 exact retired-key state | Added current invariant | REQ-005; AC-008/009 | Add durable `AppConfig` and GraphQL boundary evidence; realistic Settings journey. |
| Unrelated XML/JSON/schema/sentinel behavior | Preserved | REQ-010; AC-013 | Retain native JSON Schema, context-file XML, queue sentinel and lifecycle-label coverage; do not remove server prompt-engineering XML protocol tests, which are a separate subsystem. |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | Native handler/factory, continuation, rendering, config | Unit/integration tests and build | Mocked provider chunks do not prove a real model tool loop | Real provider agent/tool flow |
| API / transport / contract | Yes | Provider schemas/deltas/histories and server Settings GraphQL | Request-payload tests; GraphQL E2E | External provider behavior and populated live Settings | Real provider harness; live full stack |
| Frontend component / state | Yes | Basics card removal/localization | Nuxt component tests/build | Fully populated backend-bound page | Browser against real local stack |
| Browser integration / user journey | Yes | Settings Basics absence | Prior implementation-only partial render | Prior backend cards stayed loading | Browser journey |
| Authentication / session / permissions | No | No auth boundary changed | N/A | N/A | None |
| Desktop renderer / web-equivalent UI | Yes | Nuxt renderer used by Electron | Component/build coverage | Live populated grid | Browser-preferred validation |
| Desktop shell / Electron-specific integration | No | No preload/IPC/window/package behavior changed | N/A | None material | None; actual desktop is unjustified |
| Process / lifecycle | Yes | Stream finalization/interruption/failure; config initialization | Unit/config tests | Real provider completion lifecycle | Real provider harness |
| Persisted-data transition | Yes | Exact retired scalar discard/rejection | Planned durable config/API tests | Writable/read-only file behavior must be direct | Repository config tests/probe |
| Worker / queue / distributed coordination | No | Queue sentinel is explicitly unchanged, not a coordination change | Existing queue test | N/A | None |
| External integration | Yes | Supported providers must use their native channels | Provider request-shape tests | Real model may not follow/complete tool loop | Managed-secret real-provider E2E |

## Project Execution Discovery

- Assigned task worktree / workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-xml-tool-calling`
- Project type and runtime stack: pnpm 10 TypeScript monorepo; Vitest; Node server/GraphQL; Nuxt renderer; Electron wrapper; provider SDK integrations; SQLite-backed managed secret vault.
- Conflicting, missing, or unclear project instructions: Worktree dependencies are absent. Upstream implementation temporarily linked package `node_modules` from the installed superrepo and removed links afterward. The root scripts are authoritative for the real-provider harness. Server `typecheck` has an upstream workspace dependency/DOM-global limitation, while `build:full` passed and is the production compile gate. No contradiction in test commands.
- Required environment variables or secrets available: `Yes`; the user explicitly authorized import from an owner-private `0600` source. Secret values will never be printed or copied to artifacts.

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-xml-tool-calling/README.md` | Workspace setup, dev, deterministic and real E2E | `pnpm install`; `pnpm dev`; `pnpm test:e2e`; `pnpm test:e2e:real:{preflight,}`; explicit secret importer. |
| `autobyteus-server-ts/AGENTS.md` | Server tests | `pnpm -C autobyteus-server-ts exec vitest run <path> --no-watch`. |
| `autobyteus-web/AGENTS.md` | Web tests | `pnpm test:nuxt <path> --run`; browser-preferred web-equivalent validation. |
| `autobyteus-server-ts/README.md` and `docs/modules/secret_management.md` | Safe secret import/test DB | Preview then execute `pnpm secrets:import -- --source <absolute> --database-url file:<absolute test.db>`; test DB only; values never output; explicit target never inferred. |
| `autobyteus-server-ts/.env.test` | Immutable test bootstrap | Test DB is `autobyteus-server-ts/db/test.db`, server loopback base is `http://127.0.0.1:8000`. |
| `test-support/live-e2e/run-live-e2e.mjs` and `live-e2e-scenarios.mjs` | Real provider harness | Builds/starts isolated test server, runs selected managed-provider scenarios, scans evidence, stops owned process, removes evidence dir. `--scenarios=` targets relevant capabilities. |
| `autobyteus-{ts,server-ts}/vitest.config.ts`, `autobyteus-web/vitest.config.mts` | Test selection/setup | Core and server use Vitest; server serializes forks and supplies Prisma setup; web uses Nuxt/happy-dom. |
| affected package manifests | Compile/test scripts | Core/server/web builds; targeted Vitest; Nuxt tests/build. |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Installed dependencies | Worktree packages/root | Temporary package/root `node_modules` links to installed superrepo dependency trees, following prior validated method | Links only; no dependency mutation | `pnpm exec vitest --version` / build resolution | Remove only links created by this run |
| Test secret vault | Workspace root | Import `/Users/normy/.autobyteus/server-data/.env` into absolute `file:.../autobyteus-server-ts/db/test.db`, dry-run then confirmed execution | Dedicated ignored test DB; source unchanged; values suppressed | Real-E2E preflight health | Retain intentional test-vault setup; harness owns per-run process/data |
| Real provider harness | Workspace root | `pnpm test:e2e:real:preflight -- --scenarios=...`; `pnpm test:e2e:real -- --scenarios=...` | Selected: real native tool loop, real no-tool flow, AutoByteus ordinary LLM if configured | Harness built-server health/preflight | Runner stops server/removes evidence dir |
| Full-stack Settings | Workspace root | `pnpm dev` with worktree-owned development state | Loopback backend/frontend; no user running app touched | exact endpoints reported/HTTP health | Ctrl-C owned launcher; remove only run-created state if appropriate |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Provider credentials | Generic value-safe importer from authorized owner-private source | Import only to dedicated test DB; never log values | Retain in ignored test vault for explicit real E2E unless user asks to remove |
| Real tool files/memory | `LiveE2eHarness.executeCompactionAgentFlow()` temporary owned roots | Absolute temp paths; read/write tools; exact artifact/continuation evidence | Harness removes owned root |
| Settings runtime | `pnpm dev` worktree-local `.autobyteus/development` | No production/user store | Stop owned processes; record any retained isolated state |

## Persisted Data Transition Coverage Basis

- Approved decision: `Discard or Rebuild`
- Design-spec and implementation-handoff references: design lines 79–88; implementation handoff lines 89–96.
- Representative existing-data setup and required behavior: exact retired assignment plus unrelated assignments in process/config/writable file; after initialization the retired key is absent, unrelated values are byte/semantically preserved; exact later writes are rejected; repeated cleanup is safe; read-only-file failure does not restore runtime meaning.
- Evidence planned: durable `AppConfig` initialization/set tests, server Settings list/update GraphQL behavior, and focused file/process execution; no migration suite.
- Migration-specific completion/recovery scenarios: N/A.
- Upstream ambiguity or reroute required: None.

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Basis | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/tests/unit/agent/streaming/parser/**` and integration parser test | XML/JSON/sentinel FSM parses text into tools | Removed REQ-001/007; AC-003/004 | Stale / Remove | Production parser subtree deleted by reviewed design | Remove all 21 files; replace at surviving handler boundary. |
| Legacy adapter/parsing-handler/diagnostic tests | Text parsing, coercion, diagnostics | Removed REQ-007 | Stale / Remove | Owners deleted; no replacement protocol allowed | Remove. |
| Legacy manifest/example/text formatter/registry tests | Model-facing text schemas/examples/manifests | Removed REQ-002/007/008 | Stale / Remove | Source owners deleted | Remove deleted-owner tests; retain native JSON Schema provider tests. |
| `tool-call-format` unit/integration tests | Environment selector/defaults | Removed REQ-002/005/007 | Stale / Remove | Selector deleted | Remove. |
| XML/text-history renderer tests and mode-isolation portion of provider native renderer test | Text-encoded tool history / format selection | Removed REQ-004/007/009 | Stale / Remove or Needs Update | Native renderers are unconditional | Remove standalone text renderer test; update mixed provider-native file. |
| `streaming-handler-factory.test.ts` | API mode plus text modes/provider defaults/override | Sole tools/no-tools setup | Needs Update | Factory API contracted | Retain tools/no-tools and schema assertions; remove selector assertions. |
| `api-tool-call-streaming-response-handler.test.ts` | Mixed/native/file/parallel/failure/callback/reset | REQ-001/003; AC-001/002/003 | Needs Update | 15/16; one stale synthesized `content:''` expectation | Correct final-native-JSON expectation; add text-like assistant cases and strengthen ordering/identity. |
| `pass-through-streaming-response-handler.test.ts` | No-tool raw text and lifecycle | REQ-006; AC-003/007 | Still Valid | Already treats legacy tags as raw text | Expand syntax matrix if needed. |
| continuation/memory-result tests | Text and API modes; ordered native deferral/context file | REQ-004; AC-005 | Needs Update | Mixed obsolete/native assertions | Remove text-mode cases/fields; retain exactly-once native/context-file cases. |
| `provider-native-tool-history-renderers.test.ts` and request payload tests | Provider-native history/context/order/request shapes | REQ-003/004; AC-001/005/006 | Needs Update | Strong current coverage plus obsolete format selector/env setup | Remove only selector/env mechanics; keep provider breadth. |
| `autobyteus-prompt-renderer.test.ts` | Ordinary transcript/media plus XML tool call/result emulation | REQ-009; AC-011 | Needs Update | Production renderer now content/media-only | Replace XML assertions with absence/no-emulation assertions. |
| `lmstudio-llm.test.ts` and LM Studio integration setup | Format-dependent renderer/env | REQ-006/009 | Needs Update | Constructor is unconditional native renderer; env key inert | Remove env/mode expectations, retain native request/history. |
| native tool schema provider/formatter tests | Provider API JSON Schema | REQ-002/010; AC-001/010/013 | Still Valid | Surviving schema owners | Retain/execute. |
| `app-config.test.ts` | General config lifecycle only | REQ-005; AC-009 | Add Durable Coverage | No existing exact retirement assertions | Add initialization discard/rejection/unrelated preservation/idempotence/read-only behavior. |
| server settings service and GraphQL E2E | Currently advertises/validates parser setting | REQ-005; AC-008/009 | Needs Update | Import of deleted setting and obsolete cases | Remove predefined-setting cases; replace GraphQL cases with list absence/update rejection evidence. |
| runtime/context-file server tests that set `AUTOBYTEUS_STREAM_PARSER=api_tool_call` | Select native behavior through retired key | REQ-004/005; AC-005/006/009 | Needs Update | Key must have no runtime reader | Remove environment scaffolding while retaining actual native/context journeys. |
| web `StreamingParserCard.spec.ts` | Removed card toggle | REQ-005; AC-008 | Stale / Remove | Component deleted intentionally | Remove; no replacement component. |
| web `ServerSettingsBasicsPanel.spec.ts` | Composes/wires parser card among current cards | REQ-005; AC-008 | Needs Update | Basics panel no longer imports card | Assert current card composition and parser absence. |
| server prompt-engineering XML parser/formatter tests | Separate prompt-management tool grammar | REQ-010; AC-013 | Out Of Scope / Still Valid | Different capability and production subtree | Retain untouched. |
| unrelated context-file/XML, queue sentinel and tool lifecycle tests | Unrelated preserved facilities | REQ-010; AC-013 | Still Valid | Explicit protected scope | Retain and select representative execution. |

## Stale Or Obsolete Coverage Decisions

| Path / Scenario | Obsolete Assertion | Why It Is Obsolete | Upstream Evidence | Replacement Coverage | No-Replacement Rationale |
| --- | --- | --- | --- | --- | --- |
| Parser/adapters/parsing-handler subtree tests | Assistant text creates tool invocations | Prohibited and owners removed | REQ-001/007; AC-003/004 | Negative text-like output in surviving native/pass-through handlers | No parser-state replacement. |
| Text manifest/example formatter/registry/provider tests | Tools are taught through prompt text | Provider API schemas are sole setup | REQ-002/007/008 | Native schema provider/request payload tests | No manifest replacement. |
| Text-history renderer tests | Stored calls/results become XML/text | Native provider histories only | REQ-004/009; AC-005/006/011 | Provider-native renderer/request tests | No text renderer replacement. |
| Format resolver tests | Environment selects protocol | Selector has no supported meaning | REQ-002/005 | Factory tools/no-tools and exact-key tombstone | No selector replacement. |
| `StreamingParserCard.spec.ts` | User toggles XML/API modes | Control removed | REQ-005; AC-008 | Basics composition/browser absence | No alternate control. |
| Native handler final args `{path, content:''}` | Live projector synthesizes final argument | Final provider JSON is authoritative | REQ-003; approved design and CRR-001 | Same scenario expects `{path}` while live projection remains separately asserted | N/A. |

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Basis | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| NATIVE-TEXT-001 | XML/JSON/sentinel/`[TOOL_CALL]` assistant text produces zero invocations | AC-003 | native and pass-through handler tests | Critical negative invariant. |
| CONFIG-RETIRE-001 | Exact key discard/reject/idempotence/unrelated preservation/read-only tolerance | AC-008/009 | `autobyteus-server-ts/tests/unit/config/app-config.test.ts` | Current implementation has no durable regression. |
| SETTINGS-ABSENCE-001 | Parser key absent/rejected through GraphQL and UI | AC-008/009 | server GraphQL E2E; web Basics test | Proves operator boundary rather than source search alone. |
| PUBLIC-SURFACE-001 | Supported native imports survive; removed subpaths/exports absent | AC-004/010 | existing re-export/index tests plus build/static scan; add assertions if missing | Breaking removal and retained surface both matter. |

## Durable Coverage To Update

| Scenario ID | Existing Path / Scenario | Required Update | Basis | Notes |
| --- | --- | --- | --- | --- |
| NATIVE-ARGS-001 | native handler `emits write_file segments...` | Expect final `{path}` from provider JSON while retaining live content projection | REQ-003; CRR-001 | Known stale failure. |
| NATIVE-FACTORY-001 | factory test | Assert only no-tools/pass-through and tools/native-schema branches | REQ-002/006 | Delete mode fixtures. |
| NATIVE-CONT-001 | continuation/memory tests | Remove text-mode branch; assert ordered native batch/context carrier | REQ-004; AC-005 | Preserve exactly-once evidence. |
| NATIVE-HIST-001 | native renderer/request tests | Remove format selector/env; directly instantiate/assert all providers | AC-005/006 | Preserve native contexts and order. |
| AUTOBYTEUS-CHAT-001 | AutoByteus renderer test | Replace XML tool emulation with ordinary content/media-only behavior | REQ-009; AC-011 | No new native contract. |
| SERVER-SETTINGS-001 | settings service/GraphQL tests | Remove parser metadata/valid values; assert retired-key absence/rejection | REQ-005 | Keep generic settings cases. |
| WEB-SETTINGS-001 | Basics panel test | Remove card/toggle expectation; assert current cards and no parser control | AC-008 | Browser run follows. |
| RUNTIME-NATIVE-001 | server/core integration tests with retired env setup | Remove setting setup/restore; preserve native/context behavior | AC-005/006/009 | A retired key must not be required by tests. |

## Durable Coverage To Remove

| Existing Path / Scenario | Removal Reason | Basis | Replacement Or No-Replacement Decision |
| --- | --- | --- | --- |
| `autobyteus-ts/tests/{unit,integration}/agent/streaming/parser/**` | Deleted text parser implementation | REQ-007; AC-004 | Negative surviving-handler coverage; no FSM replacement. |
| Deleted adapter/parsing-handler/diagnostic owner tests | Deleted legacy boundary | REQ-001/007 | Native handler/factory coverage. |
| Deleted manifest/example/registry/text-history/format owner tests | Clean-cut public/runtime removal | REQ-002/004/007/008/009 | Native schema/history/request tests. |
| `autobyteus-ts/tests/integration/agent/streaming/json-tool-styles-integration.test.ts` and XML-only agent flow | Text invocation integration is prohibited | AC-003/004 | Native real-provider/tool-loop and negative text output. |
| `autobyteus-web/components/settings/__tests__/StreamingParserCard.spec.ts` | Component/control removed | AC-008 | Current Basics composition and live browser absence. |

## Repository Coverage Execution Plan And Results

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| 1 | Targeted 16-file core native handler/factory/pass-through/continuation/history/request/schema/public/AutoByteus selection | Worktree root; `pnpm -C autobyteus-ts exec vitest run ... --no-watch` | AC-001–007/010/011/013 | Pass — 16 files, 113 tests | `validation-logs/round1/core-targeted.log` |
| 2 | Full core unit suite, then focused stale file-tool correction rerun and full rerun | Worktree core with installed dependency links | Broad stale-import/legacy assertion cleanup | Initial 3 stale usage-method failures correctly classified as coverage-owned; corrected; final Pass — 287 files, 1,512 tests | `core-unit-full.log`, `core-stale-file-tool-tests-rerun.log`, `core-unit-full-rerun.log` |
| 3 | Native continuation, compaction lifecycle and runtime integration selection | Worktree core | AC-001/002/005/006/013 | Pass — 3 files, 18 tests | `core-integration-native-flow.log` |
| 4 | Core production build | Worktree core | AC-010/012 | Pass, including runtime dependency verification | `core-build.log` |
| 5 | AppConfig, settings service, customization loader and Settings GraphQL E2E | Worktree server, with the package-local dependency tree materialized so `autobyteus-ts` resolves to this ticket worktree | AC-008/009/012 | Pass — 4 files, 74 tests | `server-settings-targeted-worktree-core.log` |
| 6 | Server production build via real-E2E preflight | Root script builds core/contracts/server and runs sanitized bootstrap smoke | AC-010/012 | Pass | `real-provider-preflight-worktree-core.log` |
| 7 | Targeted changed Nuxt Settings tests | Worktree web | AC-008/012 | Pass — 2 files, 4 tests | `web-settings-targeted.log` |
| 8 | Broader Settings component suite | Worktree web | Surrounding Settings regression | 26 files / 129 tests passed; one out-of-scope `CodexFullAccessCard` wording assertion failed because current UI says “new non-auto-approved sessions” rather than older “new sessions” | `web-settings-suite.log` |
| 9 | Nuxt production build | Worktree web | AC-008/012 | Pass, including `/settings` prerender | `web-build.log` |
| 10 | Static legacy/public scan and `git diff --check` | Worktree | AC-004/010/013 | Pass; exact retired production key appears only in `AppConfig`; all retired owners absent; no removed-symbol production imports; diff clean | `static-legacy-scan.log` |

A diagnostic full server-unit run was also attempted before the package-local dependency tree was materialized. Its `autobyteus-ts` workspace link resolved to the installed superrepo checkout rather than this ticket worktree and produced widespread unrelated API-drift failures, so it is not treated as ticket-state execution evidence. The affected server tests and all production builds/real runs were repeated after `autobyteus-server-ts/node_modules/autobyteus-ts` was verified to resolve to this worktree. The diagnostic is retained at `validation-logs/round1/server-unit-full.log` for transparency.

## Post-Repository Confidence Scorecard (Mandatory)

| Confidence Category | Score | What Supports The Score | Remaining Uncertainty | Additional Validation That Could Improve It |
| --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 95% | Direct durable scenarios map every AC; core and affected server/web suites pass; builds and static absence checks pass | Real external model behavior and live browser surface not yet counted here | Execute selected live/provider/browser journeys. |
| Changed-boundary execution directness | 95% | Surviving handler, factory, continuation, provider history/request, AppConfig and GraphQL boundaries execute directly | Provider SDK/network behavior remains outside repository tests | Real provider AgentRun. |
| Cross-boundary integration realism and mock gap | 90% | Core AgentRuntime native continuation and server GraphQL execute cross-component paths | Provider and populated browser paths remain mocked/absent | Live API plus browser. |
| Environment, configuration, identity, and fixture fidelity | 90% | Isolated SQLite/Prisma settings E2E and production builds run with verified worktree package resolution | Authorized credentials and external services not yet exercised in this score | Explicit import/preflight/live run. |
| Failure, edge-case, lifecycle, and recovery evidence | 95% | Interruption/failure suppression, callback order, live file projection, exact-key read-only tolerance and runtime lifecycle cases pass | External model failure variance remains | Live provider rerun policy/evidence. |
| User-surface, browser, and desktop-shell confidence | 90% | Changed Nuxt component tests and production build pass; shell is not changed | Fully populated server-bound DOM not yet observed in this score | Browser against live local stack. |
| Durable regression coverage quality and relevance | 95% | One added, 39 updated and 65 obsolete tests removed with current-boundary replacements; core full suite green | One unrelated existing Settings wording assertion remains stale | Proportional test-code review; unrelated owner may update separately. |

- Overall post-repository confidence: **93%** (92.9%, rounded).
- Calculation method: Simple average of the seven applicable categories.
- Every critical acceptance criterion directly proven: `Yes` at repository seams; broader execution remains required to close realism risk.
- Any applicable category below `90%`: `No`.
- Default clean-confidence target of `95%` met: `No` at repository-only gate.
- Material residual risks: external provider compliance/compactor response variance; populated browser Settings integration; AutoByteus remote discovery availability; external consumers of intentionally removed package subpaths.

## Broader Validation Decision (Mandatory)

- Decision: `Required`.
- Selected execution mode: `Live API` plus `Browser`.
- Specific confidence gap or residual risk addressed: User explicitly requested real tests. Repository chunks/mocks cannot prove a live model performs the native read/read/write/continuation journey, and component tests do not prove populated server-bound Settings state.
- Why the selected mode can materially improve confidence: The managed-secret harness uses the product server, `AgentRun`, provider SDK, tool runtime, memory compaction and managed vault. The browser probe uses a built backend and Nuxt dev renderer with semantic DOM assertions.
- Expected confidence after selected validation: At least 95% if the real native tool rerun, no-tool flow, and populated Settings absence all pass with no unresolved critical failure.
- Browser-specific decision and rationale: Required for the web-equivalent Settings boundary. Electron shell execution remains unjustified because preload/IPC/window/package behavior did not change.
- If Not Required: N/A.
- If Blocked: N/A.

## Desktop Application Validation Decision

- Desktop framework / shell: Electron wrapping Nuxt.
- Relevant README or development instructions: root README; `autobyteus-web/AGENTS.md`, `README.md`, `ARCHITECTURE.md`.
- Web-equivalent behavior: Settings navigation, server-loaded Basics/Advanced views, and absence of the Streaming Parser/XML control/key.
- Shell-specific or lifecycle behavior: None changed.
- Chosen validation approach: Headless Chrome against the project built backend and Nuxt development frontend.
- Server/frontend setup: Ports 8000 and 3000 were already owned by unrelated long-running processes, so the safe project-supported components were started on test-reserved loopback ports rather than disrupting unknown owners. Backend used `startBuiltTestServer`; frontend used `nuxt dev` with the backend proxy/WS variables.
- Effect on any already-running desktop application: None.
- Behavior not directly proven and confidence consequence: Electron packaging/window integration is N/A to this change.

## Live Environment And Fixture Plan

- Startup order and commands: Preview and execute the explicit secret import; materialize package-local dependency links; run selected preflight; run DeepSeek/OpenAI/AutoByteus scenarios; start isolated built backend and Nuxt frontend; run semantic Chrome probe; stop only owned processes.
- Environment choices: The authorized `.env` was never sourced. The audited CLI imported to absolute `autobyteus-server-ts/db/test.db`; logs are value-safe. Package-local dependency resolution was verified to point to this ticket worktree before authoritative server/live execution.
- Health/readiness checks: Three selected managed secrets reported `READY`; built server readiness passed; Nuxt HTTP readiness passed; browser loaded backend data with zero console/page errors.
- Seed data/fixtures: Harness-owned temporary workspace/memory, two evidence files, exact retained JSON artifact, provider managed vault.
- Test identities/authentication/permissions: Local owner/test runtime; managed secret resolver; harness-owned auto-execute file tools only.
- Journeys: DeepSeek native read/read/write compaction flow; OpenAI no-tool AgentRun; AutoByteus remote discovery; Settings Basics and Advanced absence.
- Evidence: Value-safe logs, event/tool counts, exact artifact/continuation assertions, semantic DOM assertions and screenshots.
- Cleanup: Harness and browser probe stopped owned processes and removed temporary runtime/workspace roots. Test vault intentionally retained. Temporary dependency links/directories are removed before handoff.

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| LIVE-NATIVE-001 | Existing managed-provider `deepseek.compaction-agent-flow` | Real provider-native read/read/write calls, native continuation, completed compaction and exact retained artifact | Harness is already durable; only run evidence is temporary. |
| LIVE-NOTOOL-001 | Existing `openai.agent-flow` | Real ordinary no-tool AgentRun content/lifecycle | Harness is already durable. |
| LIVE-AUTOBYTEUS-001 | Existing `autobyteus.remote-llm` | Managed credential readiness and remote model discovery attempt | Discovery was unavailable; no new task-specific durable code is appropriate. |
| BROWSER-SETTINGS-001 | Temporary semantic Chrome probe against isolated built backend + Nuxt | Populated Basics/Advanced views contain no retired card/text/key | Task-specific negative probe; durable component/GraphQL coverage already protects the seams. |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Every supported provider making a real native tool call | Cost/credential/model/tool-compliance variance; provider request/history durable matrix covers adapters, and DeepSeek covers the live product tool loop | Low | Report exact live versus structural provider coverage. |
| AutoByteus remote ordinary response | Secret was ready, but remote LLM model discovery returned `AUTOBYTEUS_LLM_DISCOVERY_FAILED`; scenario was explicitly skipped, not called pass | Low for this task because durable AutoByteus content/media/no-emulation tests pass and this provider has no native tool contract | Recheck when the remote discovery service is available; no blocker to native-only tool change. |
| External consumers of removed broad package subpaths | Cannot enumerate outside repository | Intentional breaking change | Delivery release notes; no shim. |
| Actual Electron shell | No changed shell boundary | None material | N/A. |

## Ambiguities Or Reroute Triggers

| Issue | Classification | Evidence | Recommended Recipient |
| --- | --- | --- | --- |
| None requiring source/design reroute | N/A | The first authoritative DeepSeek attempt observed a provider compactor response that was not valid JSON; the runtime emitted failed then retried/completed and produced the exact artifact, while the harness correctly failed on any failed phase. An immediate clean rerun passed every assertion. This is external model variance, not evidence of the reviewed tool-calling source failing. | N/A; retain both logs and residual risk. |

## Investigation Decision

- Proceed To API/E2E Execution: `Yes` — completed.
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes` — 1 added, 39 updated, 65 removed.
- Post-repository confidence: **93%**.
- Broader validation decision: `Required` — completed; final result is authoritative in `api-e2e-execution-coverage-report.md`.
- Reroute Required Before Validation Execution: `No`.
- Recommended Recipient If Reroute Required: N/A.
- Notes: This artifact was created before durable coverage changes and final execution, then updated with observed repository evidence and the required broader-validation decision.
