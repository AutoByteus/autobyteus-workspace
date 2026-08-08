# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/design-spec.md`
- Supplemental Task Artifacts: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/qwen-native-provider-setup-ui-spec.md`
- Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/solution-revision-record.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/design-review-report.md`
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/architecture-review-revision-record.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/implementation-handoff.md`
- Implementation Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/implementation-revision-record.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/code-review-report.md`
- Code Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/code-review-revision-record.md`
- Delivery Revision Record (delivery re-entry only): `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/delivery-revision-record.md`
- Relevant Delivery Revision IDs: `DR-003`
- API/E2E Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-005`
- Current Investigation Round: `5`
- Trigger: `code_reviewer` integrated-source `CRR-010` `Pass` after `IR-007` resolved delivery blocker `DR-003` by merging protected checkpoint `49736ac6b73436b1643ed7959391bd3e934ae164` with `origin/personal@647b1119a9dc3ba2ba301243e1b5e752943454db` as merge commit `9817d3b1fdcbfec4c5249eb782ae2d9acfb25688`.
- Prior Investigation Reviewed: `Yes` — API-REV-004/CRR-009 remain useful pre-integration evidence but do not authorize the merge. Every current durable scenario was rechecked for validity against IR-007/CRR-010 and the integrated source before execution.
- Latest Authoritative Investigation: `This file — round 5 integrated-state investigation and completed execution are current.`

## CRR-010 Integrated-State Coverage Re-investigation

The merge conflict was confined to the production/test AppConfig boundary, but that boundary owns both the runtime database URL and the durable `QWEN_BASE_URL` file commit used by the Qwen lifecycle. Therefore pre-integration unit/API/browser passes were treated as scenario-design evidence only. The integrated built-server lifecycle and browser-equivalent journey executed again against `HEAD=9817d3b1fdcbfec4c5249eb782ae2d9acfb25688` before delivery resumes.

| Surface / Scenario | Current Coverage Decision | Integrated-State Rationale | Completion Evidence |
| --- | --- | --- | --- |
| AppConfig durable assignment plus Prisma SQLite URL ownership | `Still Valid — Passed` | The merged source deliberately composes latest-base `toPrismaSqliteUrl` behavior with SR-011 strict same-directory temporary write, fsync, atomic rename, failure cleanup/sanitization, and post-commit publication. Existing focused tests cover both sides without a new contract. | Five files passed with `73 passed / 1 intentional Windows-only skip`; integrated server/shared build and sanitized bootstrap passed. |
| `QW-E2E-001` configured/default restart state | `Still Valid — Passed` | The existing durable test starts built servers over an owned real runtime/vault/database, proves configured restart, then removes only the optional URL assignment and proves key-only/default restart. This directly crosses the resolved AppConfig conflict. | The integrated Qwen lifecycle E2E passed after a fresh build. |
| `QW-E2E-003` restart-backed fresh-process routing | `Still Valid — Passed` | CRR-009 verified that the child receives no explicit `QWEN_BASE_URL`. Normal AppConfig startup loads the GraphQL-persisted owned `.env`, and three exact requests assert the stored key, path, and model values. No test edit was required. | All three fresh-process loopback requests passed; integrity recheck confirms no explicit child endpoint override. |
| `QW-E2E-004` compensation and sanitized failure boundary | `Still Valid — Passed` | The durable test obstructs the real environment commit, checks previous-restored and repair-required GraphQL mappings, and scans owned outputs/files for generated canaries. This is the critical post-merge failure boundary. | The complete lifecycle test passed, including compensation, sanitized GraphQL responses, and secret scans. |
| `QW-E2E-002` exact native catalog plus `CUS-E2E-001` exact fallback/cleanup | `Still Valid — Passed` | The merge does not revise model requirements or provider ownership. Exact native identifiers/contexts, preview absence, duplicate wire-value ownership, advertised precedence, exact fallback, near-match unknowns, and provider-scoped cleanup remain approved. | Both GraphQL E2E files passed together: `2 files / 4 tests`. |
| Current Qwen Settings durable web coverage | `Still Valid — Passed` | The merge imports broad current-base web changes but does not conflict in the Qwen Settings owners. The five focused files still directly exercise form, manager, runtime, Apollo, and Pinia recovery semantics. | Five focused Nuxt/Vitest files passed `32/32`; web boundary/localization guards passed. |
| `QW-BRW-001`–`003` Settings save/recovery browser journey | `Repeated — Passed` | The live backend contains the conflict-resolved AppConfig, so the integrated merge needed a fresh browser run. | Owned Nuxt + built server + loopback provider + Chrome passed. The run forced one post-save settings rejection, held one required query in each reload path to prove success waited, recovered configured Qwen/exact models, and passed 390px overflow checks. |
| Historical `qwen3.8-max-preview` ledger fixtures | `Still Valid — Passed` | Merge changes do not turn these opaque custom-provider snapshots into native support, an alias, or compatibility behavior. | Inventory/source assertions remain unchanged; native/browser preview absence passed. |

- Durable repository coverage added, updated, or removed in API-REV-005: `No`. Current coverage remained valid and sufficiently direct; this round re-executed it against integrated state.
- Repository result: `Pass` — core `4 files / 25 tests`; server conflict-focused `5 files / 73 passed / 1 intentional skip`; web `5 files / 32 tests`; integrated server build; GraphQL E2E `2 files / 4 tests`; three web guards.
- Broader validation decision: `Required and completed — Pass` because the merge changes the backend AppConfig boundary reached by the browser save and the prior browser run did not execute merge commit `9817d3b1f`.
- Environment and safety plan: use generated canaries, unique SQLite/app-data targets, reserved loopback ports, an owned local OpenAI-compatible provider, and only owned server/Nuxt/Chrome processes. Do not use vendor credentials, stop unowned processes, or mutate shared/user state.
- Result/confidence after execution: `Pass / 96.4%`. The same numeric score is independently re-established for integrated HEAD; API-REV-004 was not inferred forward.
- Integrated execution evidence root: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/probes/api-e2e/` (`*-api-rev-005.*`).

## CRR-008 Corrective Coverage Re-investigation

The review findings are valid bounded test-proof defects and require no requirement, design, production-source, fixture-environment, or browser-journey reroute.

| Finding / Scenario | Validity Recheck | Current Defect | Corrective Durable-Coverage Decision | Required Rerun / Completion Evidence |
| --- | --- | --- | --- | --- |
| `TR-002` / `QW-E2E-003` | `Updated — Resolved` | The fresh Qwen request child received `QWEN_BASE_URL` as an explicit sanitized-environment override, so the request path could bypass the URL loaded from the GraphQL-saved owned runtime `.env`. | Removed the `qwenBaseUrl` child input and environment assignment. Retained `appConfigProvider.initialize({ appDataDir: runtimeRoot })`, the real vault/database, and exact captured Authorization/path/model assertions, so the child must load the persisted URL through normal AppConfig startup. | API-REV-004 combined rerun passed; all three loopback chat requests reached the saved `/compatible-mode/v1/chat/completions` path with the stored key and exact model values. |
| `TR-003` / `CUS-E2E-001` cleanup | `Updated — Resolved` | The post-delete assertion flattened wire values across all providers and required approved cross-provider duplicate values to be globally absent. | The query now includes each model's `providerId`; the test requires the deleted provider group to be absent and no remaining catalog model to be owned by `deletedProviderId`. Isolated provider-config absence remains. Global shared-value absence was removed. | API-REV-004 combined rerun passed all three custom-provider scenarios, including the corrected owner-scoped cleanup. |

- Repository-resident durable coverage changed in this corrective round: `Yes — updated the same two E2E paths; added/removed no file.`
- Existing browser evidence validity: `Still Valid` — no production or browser fixture behavior changed; CRR-008 explicitly identifies test-code proof only.
- Existing focused core/server/web/build evidence validity: `Still Valid` for unaffected production source. The two changed durable files were rerun together in the final API-REV-004 affected E2E command.
- Historical `qwen3.8-max-preview` classification: `Still Valid` and unchanged; neither finding concerns that fixture decision.
- Broader validation decision for round 4: `Not Required`. The corrected live E2E passed. The only gaps were the masked persisted-URL proof and an over-broad cleanup assertion inside durable API/E2E code; browser/server production behavior and environment topology are unchanged from the passing owned round-3 execution.
- Corrective rerun command: `pnpm exec vitest run tests/e2e/llm-management/qwen-configuration-lifecycle-graphql.e2e.test.ts tests/e2e/llm-management/custom-provider-model-metadata-graphql.e2e.test.ts --no-watch`
- Corrective rerun result: `Pass — 2 files / 4 tests`
- Corrective rerun evidence: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/probes/api-e2e/server-e2e-api-rev-004.log`
- Corrective integrity evidence: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/probes/api-e2e/repository-integrity-api-rev-004.log`
- Round-4 final validation confidence: `96.4%`, unchanged numerically from API-REV-003 but now supported by unmasked persisted-URL-to-request proof and a valid owner-scoped cleanup postcondition.

## Current Requirement And Design Basis

The current reviewed package is `SR-010`/`SR-011`, `ARCH-REV-005`, integrated implementation `IR-007`, and integrated source review `CRR-010`. It replaces the previously delivered endpoint-profile design and supersedes pre-integration authorization from IR-006/CRR-007/API-REV-004. The behavior to prove is:

1. Custom OpenAI-compatible discovery preserves valid advertised positive-integer metadata, otherwise fills each field only from an exact `SupportedModelDefinition.value` candidate, and otherwise leaves the field unknown. Endpoint URLs, profiles, aliases, suffixes, case folding, and family matching must not influence this decision (`REQ-001`–`REQ-004`, `REQ-009`; `AC-001`–`AC-006`).
2. Native Qwen exposes exact wire values `qwen3.8-max`, `deepseek-v4-pro`, and `glm-5.2`, with unique Qwen identifiers for the cross-provider duplicate values and Alibaba-route contexts `1,000,000`, `1,000,000`, and `198,000`. The preview value must not exist as a native definition/profile/alias (`REQ-007`; `AC-009`, `AC-010`).
3. Settings saves a Qwen Base URL/API-key pair only after a real `/models` probe. The key stays in the vault, the URL is atomically committed to `.env`, successful responses are restart durable, URL-write failure restores/removes the key, compensation double failure is repair-required, and GraphQL exposes only sanitized setup status/errors (`REQ-005`, `REQ-008`, `REQ-011`; `AC-007`, `AC-012`, `AC-013`).
4. Missing `QWEN_BASE_URL` is the current `DEFAULT` state and preserves existing key-only installations; an explicitly configured value equal to the default remains `CONFIGURED`. Newly constructed Qwen runtimes must route all three exact model values to the configured URL with the Qwen secret (`REQ-006`, `REQ-010`, `REQ-012`; `AC-008`, `AC-011`, `AC-014`).
5. The browser must render and validate the two-field form, keep plaintext masked/cleared, treat a committed mutation as success even if the subordinate provider-settings refresh fails, warn truthfully, and make both visible Reload Models paths await provider-settings plus catalog recovery before reporting success (`UXJ-001`–`UXJ-003`, `IR-005`, `IR-006`, `CRR-007`).

The implementation handoff's legacy check is clean. Its persisted-data decision is `Directly Usable — No Migration`: the existing `provider.qwen.api-key` secret is read unchanged and an absent optional URL has current default semantics. No compatibility branch, secret migration, or provider-record migration is approved.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| `BEH-001` / advertised custom metadata | Preserved | `REQ-001`, `REQ-008`; `AC-001`, `AC-002`; `IR-004` | Recheck parser/duplicate/resilience coverage and prove advertised values win over an exact native value through GraphQL. |
| `BEH-002` / exact-only fallback | Changed | `REQ-002`, `REQ-003`; `AC-003`, `AC-004`; `SR-010` | Recheck exact candidate/lowest-valid-field tests; update the existing custom-provider GraphQL E2E to use current DeepSeek/GLM exact and suffixed-near-match cases. |
| `BEH-003` / runtime/catalog/token flow | Preserved / Changed source union | `REQ-004`, `REQ-009`; `AC-005`, `AC-006` | Recheck provider/model projection, server provenance, budget/compaction, and known/unknown token-meter suites. |
| `BEH-004` / Qwen pair command and UI lifecycle | Added / Changed | `REQ-005`, `REQ-008`, `REQ-011`; `AC-007`, `AC-012`, `AC-013`; `IR-005`, `IR-006` | Add real loopback `/models` + GraphQL + vault/AppConfig lifecycle coverage, forced durable-write compensation, sanitized errors, and browser recovery execution. |
| `BEH-005` / native Qwen catalog/runtime | Added / Removed preview | `REQ-006`, `REQ-007`; `AC-008`–`AC-011` | Add executable GraphQL catalog/restart/runtime request coverage for all three values and assert native preview absence. |
| `BEH-006` / setup projection and recovery | Added / Changed | `REQ-010`, `REQ-012`; `AC-011`, `AC-014`; `CR-002`, `CR-003` | Prove default/configured source across restart and browser recovery after a forced subordinate refresh failure. |
| Historical token-usage preview fixture strings | Preserved historical data example | `IR-004` known risk; `CRR-007` downstream classification request | Determine whether each string asserts obsolete native support or merely opaque persisted custom-model identity. Current inspection shows only the latter; retain and recheck representative coverage. |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | Exact resolver, Qwen URL resolver/definitions, strict AppConfig write, pair command | Focused core/server unit tests | Unit mocks do not prove real file/vault/restart composition | Live GraphQL/lifecycle E2E |
| API / transport / contract | Yes | Qwen status/save GraphQL and provider/model catalog projection | Resolver unit and Apollo document/store tests | Real GraphQL schema, sanitized error payload, and exact catalog after save/restart are not yet direct | Live GraphQL E2E |
| Frontend component / state | Yes | Qwen form, save state, warning, reload coordination | Vue/Pinia/Apollo tests, including full recovery regression | Browser rendering, focus/masking, network sequencing, and actual server contract remain partially indirect | Browser against isolated real backend |
| Browser integration / user journey | Yes | Settings > API Keys > Qwen save/error/reload journey | happy-dom/component and Pinia/Apollo coverage | Real DOM, browser requests, responsive overflow, and post-commit warning/retry need independent execution | Playwright/Chrome browser-equivalent run |
| Authentication / session / permissions | Yes | Submitted bearer key to probe; vault persistence; runtime Qwen Authorization header | Unit mocks and vault suites | Same saved secret crossing probe, vault, restart, and Qwen request is unproven | Loopback provider + isolated vault runtime |
| Desktop renderer / web-equivalent UI | Yes | Nuxt Settings renderer shared with Electron | Vue tests; implementation self-check | Independent browser evidence required for the material renderer journey | Browser development path |
| Desktop shell / Electron-specific integration | No | No preload, IPC, native window, packaging, or shell lifecycle change | Existing desktop build evidence is superseded but shell is unaffected | None material to this change | None; do not disturb a running desktop app |
| Process / lifecycle | Yes | Durable `.env` plus vault state across server restart; new client construction activation | AppConfig/vault unit/restart suites separately | Qwen pair composition and routed request after restart are unproven together | Owned built-server stop/start plus runtime request |
| Persisted-data transition | Yes | Existing key stays directly usable; URL absence means current default | Unit status/default tests | Normal reader after restart and no-migration behavior need direct evidence | Isolated persisted server root |
| Worker / queue / distributed coordination | No | None | N/A | None | None |
| External integration | Yes, safely emulatable | OpenAI-compatible `/models` and `/chat/completions` | Discovery/OpenAI client unit/integration tests | Live vendor secrets/network are inappropriate; HTTP shape/routing can be proven locally | Owned loopback OpenAI-compatible server |

## Project Execution Discovery

- Assigned task worktree / workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata`
- Project type and runtime stack: pnpm workspace; TypeScript/Node/Vitest core and Fastify/GraphQL/Prisma server; Nuxt/Vue/Pinia/Apollo frontend; Electron wrapper.
- Conflicting, missing, or unclear project instructions: No root `AGENTS.md` exists, while the server and web `AGENTS.md` files defer to their repository developer guides and prescribe focused, one-shot tests. Root/server/web READMEs and package scripts are authoritative. Root development uses fixed ports `8000`/`3000`, but both were occupied by processes not owned by this validation, so they were not stopped or reused. Browser validation used owned server/Nuxt processes on reserved loopback ports with the documented backend wiring.
- Required environment variables or secrets available: `N/A` — real vendor secrets are neither available nor required. All credentials are synthetic canaries confined to an isolated test vault and loopback provider; no value will be recorded in durable reports/logs.

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/README.md` | Workspace build/dev/E2E authority | `pnpm dev` is the canonical full-stack topology; deterministic E2E uses `pnpm test:e2e`; development and test state must remain isolated. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/package.json` | Root scripts | Server E2E is `pnpm --filter autobyteus-server-ts test --run tests/e2e`; package manager is pnpm 10.28.2. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/autobyteus-server-ts/README.md` and `package.json` | Server runtime/test authority | Build before built-server lifecycle tests; invoke Vitest with `--run`; test runtime owns isolated SQLite/app-data. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/test-support/live-e2e/test-runtime-bootstrap.mjs` | Test process/data owner | `startBuiltTestServer`, loopback port reservation, immutable `.env.test`, owned runtime roots, and `removeOwnedTestRuntime` are the supported lifecycle mechanism. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/autobyteus-ts/package.json` and `vitest.config.ts` | Core build/test authority | Use package-local `pnpm exec vitest run ...`; production compile uses `pnpm build`. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/autobyteus-web/README.md`, `package.json`, and `vitest.config.mts` | Web/unit/browser authority | Use `pnpm test:nuxt <paths> --run`; browser development is Nuxt; existing probes use Playwright Core and owned processes/evidence directories. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/autobyteus-web/nuxt.config.ts` | Browser/backend wiring | In development, `BACKEND_NODE_BASE_URL` drives `/graphql` and `/rest` proxying and runtime default-node binding. |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Workspace dependencies | Worktree root | Existing lockfile installation; verify with `pnpm --version` and package Vitest versions | No new dependency is needed | Package command starts | No cleanup; ignored dependency state pre-exists |
| Core/server/web repository checks | Respective package roots | Package-local Vitest/build/guard commands recorded below | No persistent service | Exit code 0 | No process |
| Built server lifecycle E2E | `autobyteus-server-ts` | `pnpm build`, then focused Vitest E2E | Uses `tests/.tmp` and `db` targets created by `test-runtime-bootstrap.mjs` | Built server marker plus GraphQL readiness | Test stops child servers and calls `removeOwnedTestRuntime` |
| Loopback Qwen provider | Test/harness parent process | Node `http` server on reserved `127.0.0.1` port | Accepts only deterministic `/models` and `/chat/completions`; captures non-secret route/body metadata and compares Authorization to an in-memory canary | Listening address assigned | `server.close()` in `finally`/`afterAll` |
| Browser-equivalent stack | Worktree / web | Built server child plus `pnpm dev --host 127.0.0.1 --port <reserved>` with `BACKEND_NODE_BASE_URL=<owned server>` | Avoids occupied 8000/3000 and does not touch `.autobyteus/development`; uses isolated server test root | `/rest/health` and frontend HTTP 200 | Terminate only owned process groups; remove isolated server root and temporary harness |
| Chrome / Playwright Core | `autobyteus-web` | Local installed Chrome via Playwright Core | Desktop 1280x900 and narrow 390x844 | Page load and semantic DOM assertions | Close contexts/browser |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Qwen URL/key pair | Loopback HTTP Base URL plus synthetic canary | Canary never printed or copied to reports/screenshots; key stored only in isolated vault | Isolated database/runtime deleted |
| Qwen configured/default state | `qwenSetupStatus` before and after the real save and restart | URL is non-secret; key is returned only as a Boolean | Runtime deleted |
| Exact Qwen catalog | Normal `availableLlmProvidersWithModels` GraphQL query | Assert IDs/values/context/provider ownership and preview absence | No fixture persistence |
| Forced durable-write failure | Temporarily replace the owned runtime `.env` file with a directory after moving the file aside | Makes atomic rename fail without modifying production/shared paths; restore in `finally` | Original `.env` restored immediately |
| Browser post-commit refresh failure | Intercept exactly one post-mutation `GetProviderSettings` browser request and return a GraphQL error | Mutation and all other queries use the real isolated backend; no secret enters fixture | Route removed when page/context closes |

## Persisted Data Transition Coverage Basis

- Approved decision: `Directly Usable — No Migration`
- Design-spec and implementation-handoff references: design “Persisted Data / State Transition Decision”; implementation “Persisted Data Transition Check”.
- Representative existing-data setup and required behavior: First prove a key with no `QWEN_BASE_URL` projects `DEFAULT` and routes through the historical default by focused repository coverage. Then save a pair through GraphQL into an isolated vault/`.env`, stop the server, restart from the same root, and prove `CONFIGURED` plus key presence. No secret or provider record is rewritten into a new shape.
- Evidence planned for the approved direct-use outcome: existing default resolver/status tests; built-server GraphQL save; `.env` inspection; full stop/start; restarted status query; new Qwen client using the reopened vault/URL.
- Migration-specific completion/recovery scenarios, only when `Migration Required`: `N/A`.
- Upstream ambiguity or reroute required: `None`.

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Acceptance Criteria / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/tests/unit/llm/openai-compatible-endpoint-discovery.test.ts` | Advertised aliases, invalid fields, duplicates, HTTP/timeout and hygiene | `REQ-001`, `REQ-008`; `AC-001`, `AC-002` | Still Valid | Generic discovery behavior is preserved by `SR-010` | Re-run unchanged |
| `autobyteus-ts/tests/unit/llm/metadata/openai-compatible-endpoint-model-metadata.test.ts` | Advertised precedence, exact candidates, per-field lowest values/provenance, near-match unknown | `REQ-002`, `REQ-003`; `AC-002`–`AC-004` | Still Valid | Current file contains no endpoint/profile/alias input | Re-run unchanged |
| `autobyteus-ts/tests/unit/llm/openai-compatible-endpoint-provider.test.ts` and `tests/unit/agent/token-budget.test.ts` | Source-bearing model construction, stale/error preservation, known/unknown budgets and overrides | `REQ-004`; `AC-005` | Still Valid | Directly exercises current canonical model/runtime boundary | Re-run unchanged |
| `autobyteus-ts/tests/unit/llm/qwen-provider-config.test.ts` | Default/configured URL normalization and new client construction | `REQ-006`, `REQ-010`; `AC-008`, `AC-011` | Still Valid | Correct local boundary, but request/restart is indirect | Re-run; supplement with lifecycle E2E |
| `autobyteus-ts/tests/unit/llm/supported-model-definitions.test.ts` | Exact Qwen values/contexts, unique identifiers, native preview absence | `REQ-007`; `AC-009`, `AC-010` | Still Valid | Exact current assertions are present | Re-run; supplement with GraphQL catalog |
| `autobyteus-ts/tests/integration/llm/api/qwen-llm.test.ts` | Optional real-vendor Qwen completions when `DASHSCOPE_API_KEY` exists | General Qwen adapter behavior | Still Valid | Environment-gated vendor integration remains useful but is not deterministic and uses an older still-supported model | Do not change; use deterministic loopback runtime E2E for this ticket |
| `autobyteus-server-ts/tests/unit/config/app-config.test.ts` | Atomic write, CRLF/mode/cleanup/no-memory-mutation failure | `REQ-011`; `AC-013` | Still Valid | Direct strict persistence coverage | Re-run unchanged |
| `autobyteus-server-ts/tests/unit/llm-management/llm-providers/llm-provider-service.test.ts` | Default/configured status, probe/write order, old-key restoration, no-key removal, repair-required double failure | `REQ-005`, `REQ-011`, `REQ-012`; `AC-012`–`AC-014` | Still Valid | Complete command-local fault matrix, but dependencies are mocked | Re-run; supplement with real GraphQL/vault/filesystem lifecycle |
| `autobyteus-server-ts/tests/unit/api/graphql/types/llm-provider.test.ts` | Tight setup projection and allowlisted error codes | `REQ-008`, `REQ-012`; `AC-013`, `AC-014` | Still Valid | Direct resolver mapping, not full schema/transport | Re-run; supplement with GraphQL E2E |
| `autobyteus-server-ts/tests/unit/llm-management/model-metadata-provisioning-service.test.ts` | Reduced source union/coarse provenance | `REQ-004`, `REQ-009`; `AC-003` | Still Valid | Updated to `qwen3.8-max`; no endpoint source | Re-run unchanged |
| `autobyteus-server-ts/tests/e2e/llm-management/custom-provider-model-metadata-graphql.e2e.test.ts` | Real schema custom create/discover/catalog/stale/delete | `REQ-001`–`REQ-004`, `REQ-008`, `REQ-009`; `AC-001`–`AC-005` | Needs Update | Existing generic `gpt-5.5` exact row does not directly prove current Qwen-owned duplicate candidate/near-match behavior | Update fixture/assertions to live-over-exact `qwen3.8-max`, exact `deepseek-v4-pro`, conservative exact `glm-5.2`, and suffixed unknown |
| `autobyteus-server-ts/tests/e2e/llm-management/model-metadata-provenance-graphql.e2e.test.ts` | Built-in live/static GraphQL provenance | `REQ-004`, `REQ-009` | Still Valid | Preserved return boundary | Re-run if broader affected suite budget permits |
| `autobyteus-web/components/settings/providerApiKey/__tests__/QwenSetupForm.spec.ts` | Source labels, validation, duplicate submit, error styling, masked/cleared key | `AC-007`, `AC-014`; UI spec | Still Valid | Current component behavior | Re-run unchanged |
| `autobyteus-web/components/settings/providerApiKey/__tests__/providerSettingsApolloContract.spec.ts` | Committed-save authority and full rejected-refresh -> visible reload -> both query owners -> recovered state | `IR-005`, `IR-006`; `UXJ-001` | Still Valid | Actual Pinia/runtime/Apollo documents; reviewed at `CRR-007` | Re-run unchanged and validate in Chrome |
| `autobyteus-web/components/settings/providerApiKey/__tests__/useProviderApiKeySectionRuntime.spec.ts`, `components/settings/__tests__/ProviderAPIKeyManager.spec.ts`, `tests/stores/llmProviderConfigStore.test.ts` | Error mapping, form reset/warning, reload coordination, component notification | `AC-007`, `AC-012`, `AC-013`; `IR-005`, `IR-006` | Still Valid | Current source-review evidence | Re-run unchanged |
| Token Meter component/budget suites | Known percentage versus unknown prompt-only state | `REQ-004`; `AC-005`, `AC-006` | Still Valid | Preserved behavior, no Qwen-specific branch | Re-run focused suites |
| `autobyteus-server-ts/tests/{unit,integration,e2e}/token-usage/**` occurrences of `qwen3.8-max-preview` | Opaque historical custom-provider model identifier/value and provider-name snapshot display after rename/deletion | Historical persisted token event semantics; not `REQ-007` native catalog | Still Valid | Inspection shows no assertion that preview is a supported native definition, alias, or metadata profile; changing the opaque value would weaken historical snapshot realism and falsely imply data migration | Retain; re-run representative unit/integration cases; do not add compatibility behavior |

## Stale Or Obsolete Coverage Decisions

No current repository test asserts endpoint profiles, endpoint aliases, or native preview support. The old `API-REV-001`/`API-REV-002` narrative and result are superseded but remain immutable revision history; the canonical reports were replaced beginning with round 3 and now record integrated round 5.

| Path / Scenario | Obsolete Assertion | Why It Is Obsolete | Upstream Evidence | Replacement Coverage | No-Replacement Rationale |
| --- | --- | --- | --- | --- | --- |
| Prior round narrative only (`API-REV-001`/`002` canonical report content) | Exact Alibaba endpoint profile and DeepSeek wire-alias behavior | `SR-010` explicitly deletes that product contract | `SR-010`; `REQ-003`; `AC-004` | Current exact-only core and updated GraphQL E2E | History stays in revision record; it is not executable current coverage |

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Requirement / Acceptance Criteria / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| `QW-E2E-001` | Loopback `/models` probe -> GraphQL pair save -> vault/`.env` -> full configured restart; then representative key-only restart -> default source with retained key | `REQ-005`, `REQ-008`, `REQ-010`–`REQ-012`; `AC-011`, `AC-014`; DS-001 | `autobyteus-server-ts/tests/e2e/llm-management/qwen-configuration-lifecycle-graphql.e2e.test.ts` | This is the critical cross-store/process and direct-use persisted-data boundary and cannot be proven by mocked unit tests alone |
| `QW-E2E-002` | GraphQL catalog exact values/provider/contexts/identifiers and preview absence | `REQ-007`; `AC-009`, `AC-010`; DS-002/DS-004 | Same new E2E file | Proves real registry/server/GraphQL assembly, not only static definitions |
| `QW-E2E-003` | After restart, three newly constructed Qwen clients use the saved URL and Qwen secret for real loopback chat requests | `REQ-006`; `AC-008`, `AC-011`; DS-002 | Same new E2E file | Direct realistic routing/Authorization/wire-value proof materially closes the mock gap |
| `QW-E2E-004` | Forced strict URL failure through GraphQL restores/removes key and returns sanitized previous-restored code; repair-required transport mapping rechecked | `REQ-008`, `REQ-011`; `AC-012`, `AC-013`; DS-001 | Same new E2E plus existing unit fault matrix | Cross-boundary compensation and error hygiene are critical and reachable |

## Durable Coverage To Update

| Scenario ID | Existing Path / Scenario | Required Update | Requirement / Acceptance Criteria / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| `CUS-E2E-001` | `autobyteus-server-ts/tests/e2e/llm-management/custom-provider-model-metadata-graphql.e2e.test.ts` | Replace the generic exact-row fixture with current Qwen-owned exact duplicates and add a suffixed near-match while preserving advertised precedence/security/stale/delete checks | `REQ-001`–`REQ-004`, `REQ-007`–`REQ-009`; `AC-002`–`AC-004` | No endpoint URL/profile assertion will be added |

## Durable Coverage To Remove

None. Historical `qwen3.8-max-preview` token-ledger fixtures remain valid opaque persisted custom identifiers and are not compatibility coverage.

## Repository Coverage Execution Plan And Results

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| 1 | `pnpm exec vitest run tests/unit/llm/openai-compatible-endpoint-discovery.test.ts tests/unit/llm/metadata/openai-compatible-endpoint-model-metadata.test.ts tests/unit/llm/openai-compatible-endpoint-provider.test.ts tests/unit/llm/qwen-provider-config.test.ts tests/unit/llm/supported-model-definitions.test.ts tests/unit/agent/token-budget.test.ts --no-watch` | `autobyteus-ts` | Generic exact metadata, Qwen URL/catalog, budgets | `Pass` — 6 files / 37 tests | `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/probes/api-e2e/core-focused.log` |
| 2 | `pnpm exec vitest run tests/unit/config/app-config.test.ts tests/unit/llm-management/llm-providers/llm-provider-service.test.ts tests/unit/api/graphql/types/llm-provider.test.ts tests/unit/llm-management/model-metadata-provisioning-service.test.ts tests/unit/token-usage/projections/token-usage-model-display-projection.test.ts tests/integration/token-usage/providers/statistics-provider.integration.test.ts --no-watch` | `autobyteus-server-ts` | Strict write/compensation/GraphQL/provenance and preview-fixture validity | `Pass` — 6 files / 76 tests | `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/probes/api-e2e/server-focused.log` |
| 3 | `pnpm test:nuxt components/settings/providerApiKey/__tests__/QwenSetupForm.spec.ts components/settings/__tests__/ProviderAPIKeyManager.spec.ts components/settings/providerApiKey/__tests__/useProviderApiKeySectionRuntime.spec.ts components/settings/providerApiKey/__tests__/providerSettingsApolloContract.spec.ts tests/stores/llmProviderConfigStore.test.ts components/workspace/usage/__tests__/TokenUsageMeterPanel.spec.ts --run` | `autobyteus-web` | Settings form/runtime/Apollo/recovery and token rendering | `Pass` — 6 files / 41 tests | `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/probes/api-e2e/web-focused.log` |
| 4 | `pnpm build` | `autobyteus-server-ts` | Current core/server compile, Prisma generation, built-in bootstrap smoke, and built server artifact | `Pass` | `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/probes/api-e2e/server-build.log` |
| 5 | `pnpm exec vitest run tests/e2e/llm-management/qwen-configuration-lifecycle-graphql.e2e.test.ts tests/e2e/llm-management/custom-provider-model-metadata-graphql.e2e.test.ts --no-watch` | `autobyteus-server-ts`; isolated built servers, SQLite/vault roots, fresh request subprocess, loopback provider | `QW-E2E-001`–`004`, `CUS-E2E-001` | `Pass` — 2 files / 4 tests | `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/probes/api-e2e/server-e2e.log` |
| 6 | `pnpm guard:web-boundary`; `pnpm guard:localization-boundary`; `pnpm audit:localization-literals` | `autobyteus-web` | Web/server boundary and localization hygiene | `Pass` | `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/probes/api-e2e/web-guards.log` |
| 7 | `git diff --check` plus current preview-string inventory | Worktree root | Patch integrity and historical fixture classification recheck | `Pass` | `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/probes/api-e2e/repository-integrity.log` |

Execution note: the first local lifecycle-E2E iteration exposed two fixture/harness defects, not product failures: the replacement URL accidentally probed an unsupported `/replacement/models` path, and direct post-restart request construction occurred in the Vitest process whose global Prisma URL targeted the suite database. The durable test was corrected to exercise the same reachable Base URL and to create Qwen clients in a fresh owned process using the restarted runtime's database/vault. The final combined E2E command passed and cleanup succeeded.

## Post-Repository Confidence Scorecard (Mandatory)

| Confidence Category | Score | What Supports The Score | Remaining Uncertainty | Additional Validation That Could Improve It |
| --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | `96%` | Exact resolver/catalog, pair command, compensation, restart, request routing, API projection, UI logic, and token semantics all passed focused coverage | The visible browser journey had not yet run | Execute the selected Chrome journey |
| Changed-boundary execution directness | `96%` | Built GraphQL servers, actual SQLite vault, atomic `.env` obstruction, full restart, and real loopback HTTP calls directly exercised the critical backend boundaries | Browser DOM/client wiring remained indirect | Execute Nuxt + Chrome against the built backend |
| Cross-boundary integration realism and mock gap | `94%` | One test composes GraphQL, service, AppConfig, vault, restart, registry, fresh process, and provider HTTP; web Apollo recovery is durable | Frontend-to-live-backend flow remained unexecuted | Execute the browser journey and request sequencing |
| Environment, configuration, identity, and fixture fidelity | `95%` | Owned loopback ports, real files/SQLite/vault, generated secret canaries, built server, and sanitized fresh request process | Alibaba itself is emulated | Browser with the same loopback provider; vendor remains intentionally residual |
| Failure, edge-case, lifecycle, and recovery evidence | `96%` | Probe rejection, no-prior and prior-key durable-write failure, compensation codes, repair mapping, restart, near matches, stale catalog, and security scans pass | User-visible post-commit recovery remained indirect | Inject exactly one subordinate browser refresh rejection and recover |
| User-surface, browser, and desktop-shell confidence | `90%` | Component, Pinia/runtime, Apollo contract, localization, and manager tests directly cover all states; shell is inapplicable | No independent Chrome render/runtime evidence yet | Required browser-equivalent run |
| Durable regression coverage quality and relevance | `97%` | Narrow requirement-linked durable E2E additions plus 154 focused unit/component/integration tests and 4 lifecycle/custom GraphQL E2E tests pass | Proportional reviewer assessment is pending | Route changed test code through `code_reviewer` |

- Overall post-repository confidence: `94.9%`
- Calculation method: Simple average of the seven applicable category scores, rounded to one decimal.
- Every critical acceptance criterion directly proven: `No` at this gate — the material visible recovery journey still required browser execution.
- Any applicable category below `90%`: `No`; user-surface confidence was exactly `90%`.
- Default clean-confidence target of `95%` met: `No` at the post-repository gate.
- Material residual risks: vendor facts are source-dated; real Alibaba availability/credentials are not used; the Electron shell is unaffected and not executed; durable test-code review remains pending.

## Broader Validation Decision (Mandatory)

- Decision: `Required` and completed with `Pass`.
- Selected execution mode: `Browser` plus the repository-resident `Lifecycle`/`Live API` E2E above.
- Specific confidence gap or residual risk addressed: Browser rendering, masked/cleared secret state, real form validation, actual GraphQL mutation, post-commit refresh warning, visible Reload Models recovery, both refresh-query completion, responsive layout, and cross-boundary request wiring.
- Why the selected mode can materially improve confidence: happy-dom and mocked Apollo prove logic but do not execute Chrome DOM, Vite proxy/runtime binding, or the real GraphQL command. A real isolated backend plus one deliberately intercepted subordinate refresh exposes the reviewed reachable recovery path without fabricating the mutation result.
- Expected confidence after the selected validation: `>=95%`; achieved final confidence is `96.4%`, with no category below `95%`.
- Browser-specific decision and rationale: Required because the task materially changes a visible Settings journey and the clean target could not be met using component mocks alone. The owned Chrome run passed default status, validation, masking, real save/probe, forced post-commit refresh failure, truthful warning, global and selected-provider reload recovery, exact identifiers, preview absence, and narrow layout.
- If `Not Required`, evidence proving the real changed boundary without broader execution: `N/A`
- If `Blocked`, exact dependency or access that remains unavailable after safe setup/emulation attempts: `N/A`

## Desktop Application Validation Decision (When Applicable)

- Desktop framework / shell: Electron wrapper around the same Nuxt renderer.
- Relevant README or development instructions: root `README.md` local full-stack development; `autobyteus-web/README.md` browser probe guidance.
- Web-equivalent behavior: Entire changed Settings form, Apollo/Pinia coordination, catalog rendering, notifications, and responsive layout.
- Shell-specific or lifecycle behavior: None; no preload/IPC/window/native/packaging source changed.
- Chosen validation approach and why it fits the project: Chrome against an owned Nuxt development process and isolated built backend. This directly exercises the changed renderer without disturbing any running Electron application.
- Server/frontend setup when browser validation is used: Reserved loopback ports, `BACKEND_NODE_BASE_URL` pointing Nuxt at the owned built server, isolated server test runtime, loopback provider.
- Effect on any already-running desktop application: `None` — occupied fixed dev ports are not touched; actual Electron is not launched.
- Behavior not directly proven and confidence consequence: Electron-shell-only behavior is N/A for this source change; no confidence deduction.

## Live Environment And Fixture Plan

- Startup order and commands: built server artifact -> loopback provider -> isolated built server -> `pnpm exec nuxt dev --host 127.0.0.1 --port <reserved>` with backend env -> headless local Chrome 151 through Playwright Core 1.58.2.
- Environment choices that materially affect the run: loopback-only hosts; generated synthetic key; isolated test database/runtime; English locale; desktop `1280x900` and narrow `390x844`; no pre-existing fixed-port process was touched.
- Health / readiness checks: built-server listening marker and `/rest/health`; frontend HTTP 200; form visible.
- Seed data / fixtures: none beyond the Qwen pair saved through the real UI. The loopback provider returns the exact three model IDs and OpenAI-compatible completion responses.
- Test identities, authentication, permissions, or session state: no app auth layer; Qwen bearer canary is write-only and asserted only by equality in memory.
- Requirement-linked journeys or scenarios: default status; invalid URL; masked input/visibility; real save; one forced provider-settings refresh rejection after commit; warning and empty plaintext; visible Reload Models; provider/catalog recovery; configured status; exact models; narrow viewport/no overflow.
- DOM, screenshot, log, API, process, or other evidence captured: semantic assertion JSON, request operation order, sanitized provider request summary, browser console/page errors, desktop and narrow screenshots, and owned frontend/backend logs under `probes/api-e2e/`.
- Owned processes and temporary state cleanup: loopback server closed; built backend stopped; Nuxt process group terminated; Chrome context/browser closed; isolated server runtime/database removed; temporary `/tmp` harness removed after evidence/report creation.

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| `QW-BRW-001` | Temporary Playwright harness against owned Nuxt + real isolated backend + loopback provider | Browser default/validation/masking/save/configured state and exact model rendering | Repository already has durable component/store/Apollo coverage; no general Settings browser harness exists, while this one-time cross-boundary run supplies independent browser evidence without adding a ticket-specific maintenance surface |
| `QW-BRW-002` | Intercept exactly one post-save `GetProviderSettings`, then use visible global and selected-provider Reload Models controls | Truthful committed-save warning and both-query recovery before success for each supported reload path | The exact recovery algorithm is already durable in `providerSettingsApolloContract.spec.ts`; browser interception is execution evidence, not a second copy of the same fixture machinery |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Real Alibaba production endpoint, credentials, quotas, and current payload | No user credential; external service is non-deterministic and unnecessary to prove routing/contract | Vendor availability and source-dated metadata may change | Retain documented provenance risk; refresh vendor facts separately when official production docs stabilize |
| Electron shell execution | No shell boundary changed; browser directly exercises the shared renderer | Negligible for this change | None |
| Multi-node/worker behavior | No such boundary exists in scope | None | None |

## Ambiguities Or Reroute Triggers

| Issue | Classification | Evidence | Recommended Recipient |
| --- | --- | --- | --- |
| None at investigation time | N/A | `ARCH-REV-005` and `CRR-007` have no open finding; fixture validity is decidable from current persisted-token semantics | N/A |

## Investigation Decision

- Proceed To Integrated-State API/E2E Execution: `Completed — Pass`
- Repository-Resident Durable Coverage Added / Updated / Removed In API-REV-005: `No` — the previously reviewed Qwen lifecycle and custom metadata E2E files remain unchanged at merge commit `9817d3b1f`.
- Round-3 post-repository confidence: `94.9%`
- Round-3 broader validation decision: `Required and completed — browser-equivalent Settings run passed`
- Round-4 broader validation decision: `Not Required — only durable test proof changed; passing production/browser evidence remains applicable`
- Round-5 broader validation decision: `Required and completed — integrated browser-equivalent Settings recovery passed`
- Current final confidence: `96.4%`
- `TR-002` / `TR-003`: `Resolved in API-REV-004 affected rerun`
- Integrated source and prior proportional review: `CRR-010 Pass`; `CRR-009 Pass` remains the review of the unchanged durable test code.
- Reroute Required: `No` — no product, requirement, design, environment, or test-code failure was found.
- Recommended Recipient: `delivery_engineer` to restart delivery from a fresh tracked-base refresh against the API-REV-005-authorized integrated state.
- Notes: Historical preview strings remain valid only as opaque persisted custom-model identities, not native support or compatibility behavior. Integrated repository, lifecycle/API, browser, integrity, and cleanup checks passed. The bounded real-Alibaba residual risk remains explicit.
