# Investigation Notes — GPT-6 and Claude Opus 5.5 support

## Investigation Meta

- Package identifier: new-models-gpt6-opus55
- Request / ticket: User request of 2026-09-23
- Workspace root: `/home/autobyteus/workspace/.codex/worktrees/new-models-gpt6-opus55`
- Repository mode: Git
- Task worktree / branch: `/home/autobyteus/workspace/.codex/worktrees/new-models-gpt6-opus55` / `requirements/new-models-gpt6-opus55`
- Resolved base remote / branch / revision: `origin/personal` / `467c1bc12d439ee79243d124402c2f65f25c3cd2` (fetched 2026-09-23)
- Finalization target remote / branch: `origin/personal`
- Bootstrap result: Isolated worktree created successfully; shared `personal` checkout not used for authoring.
- Bootstrap blocker: None
- Current solution revision ID: SR-002
- Investigation status: Requirements investigation complete for approval; architecture investigation pending approval.

## Initial Request And Clarifications

- Original request: Support new OpenAI GPT-6 models shown in Codex and Anthropic 5.5. OpenAI/Anthropic API keys are not available; unit tests for API and Autobyteus runtime are acceptable, while real testing can be done for Codex runtime.
- User-supplied image references: `/home/autobyteus/data/memory/agent_teams/software_engineering_team_7b09c9321ae14dedb10bb883bcc3dc5e/solution_designer_2d7ec7b6bc3342b1b45292aeedaf8d0d/context_files/ctx_19a376757fd4__image.png`, `ctx_ec3bdcdb7a05__image.png`, `ctx_71e5f1a2564e__image.png` in the same directory.
- Clarifications received: “continue” after interrupted investigation; later user suggested checking and updating “the Claude SDK” to latest because they were unsure whether it already was.
- Follow-up after ARCH-REV-001: user asked whether current Anthropic LLM is known not to work for Opus 5.5 and suggested upgrading the library first, inspecting it, then modifying `AnthropicLLM`. No live failure has been observed without an API key; the catalog absence and code-level signed-thinking replay defect are established. The suggested implementation order is adopted in SR-004 without changing the approved behavior.
- Initial ambiguity: Exact product surfaces and pricing/accounting scope require repository investigation.

## Initial External Contract Findings

| Date | Source | Finding | Status |
| --- | --- | --- | --- |
| 2026-09-23 | [OpenAI API model catalog](https://developers.openai.com/api/docs/models) | Official IDs include `gpt-6-astra`, `gpt-6-sol`, `gpt-6-luna`; Responses API supported. | Verified |
| 2026-09-23 | [OpenAI GPT-6 guidance](https://developers.openai.com/api/docs/guides/latest-model) | Reasoning and tool-call compatibility differ across Astra versus Sol/Luna; must inspect relevant request paths. | Verified |
| 2026-09-23 | [Anthropic Opus 5.5 launch](https://www.anthropic.com/claude-opus-5-5) | Official Claude Platform ID `claude-opus-5-5`; input/output/cache rates announced; Sonnet/Haiku 5.5 are future, not launched. | Verified |

## Source Log And Evidence IDs

| ID | Date | Type / exact source or command | Observation / implication |
| --- | --- | --- | --- |
| I-01 | 2026-09-23 | [OpenAI Sol](https://developers.openai.com/api/docs/models/gpt-6-sol), [Luna](https://developers.openai.com/api/docs/models/gpt-6-luna), [Astra](https://developers.openai.com/api/docs/models/gpt-6-astra), [GPT-6 guide](https://developers.openai.com/api/docs/guides/latest-model), [pricing](https://developers.openai.com/api/docs/pricing) | Exact Sol/Luna IDs; 1,050,000 context, 128,000 output, `none/low/medium/high/xhigh/max` effort (default medium), Responses tool calling. Sol/Luna Chat Completions tool calls require `none`, so existing Responses path is appropriate. Standard Sol $2/$10, cached read $0.20/write $2.50; Luna $0.10/$0.50, cached read $0.01/write $0.125 per MTok. >272k input means 2x input/cache and 1.5x output for whole request. Astra excludes `none` and is already cataloged. |
| I-02 | 2026-09-23 | [Anthropic Opus 5.5 overview](https://platform.claude.com/docs/en/models/opus-5-5/overview), [what's new](https://platform.claude.com/docs/en/models/opus-5-5/whats-new-opus-5-5), [launch](https://www.anthropic.com/claude-opus-5-5) | Exact `claude-opus-5-5`; 1M context, 128K output; adaptive thinking always on, default effort medium; Standard $4/$20, cache read $0.20, writes $5 (5m)/$8 (1h). Explicit disabled/manual-budget thinking and forced tool choice (`any`/`tool`) return 400; thinking blocks require careful tool replay. Sonnet/Haiku 5.5 not yet released. |
| I-03 | 2026-09-23 | User screenshots: three absolute paths in Initial Request; `command -v codex; codex --version; test -f ~/.codex/auth.json` | Screenshot shows GPT-6 Astra/Sol/Luna in a Codex model picker, but is from a different Mac host and does not prove this local account's model list. Current host has `/usr/bin/codex`, `codex-cli 0.155.1` and an auth file (contents deliberately not read). Live model entitlement remains unverified. |
| I-04 | 2026-09-23 | `autobyteus-ts/src/llm/supported-model-definitions.ts`, `autobyteus-ts/src/llm/llm-factory.ts` | Direct-API models are static definitions with metadata/config/pricing; Astra already exists, Sol/Luna/Opus 5.5 absent. Factory provides model lookup and pricing. |
| I-05 | 2026-09-23 | `autobyteus-ts/src/llm/api/openai-llm.ts`, `openai-responses-llm.ts`, `tests/unit/llm/api/provider-native-request-payloads.test.ts` | OpenAI direct path uses Responses for send/stream, maps catalog `reasoning_effort` to `reasoning.effort`, and handles functions/usage. Prior Astra payload test exists. Provider validity still requires new-model assertions. |
| I-06 | 2026-09-23 | `autobyteus-ts/src/llm/api/anthropic-llm.ts`, `prompt-renderers/anthropic-prompt-renderer.ts`, `tests/unit/llm/api/anthropic-llm.test.ts` | Prefix policy treats `claude-opus-5-5` as Opus 5 for adaptive thinking/sampling. However renderer reconstructs tool-use assistant messages with text and tool-use blocks, not preserved original thinking blocks; exact Opus 5.5 agent-loop compatibility needs architecture investigation. Explicit `tool_choice` can pass via kwargs and must be handled if forced. |
| I-07 | 2026-09-23 | `autobyteus-server-ts/src/token-usage/pricing/token-price-config-provider.ts`, `token-cost-calculator.ts`; `autobyteus-ts/tests/unit/llm/supported-model-definitions.test.ts`; `autobyteus-server-ts/tests/e2e/token-usage/*` | Server pricing is derived from catalog/factory and durable snapshot; prior Astra/Fable coverage provides precedent. New IDs need exact Standard rate and token accounting checks, including tiers/cache. |
| I-08 | 2026-09-23 | `autobyteus-server-ts/src/llm-management/services/codex-model-catalog.ts`, `agent-execution/backends/codex/codex-app-server-model-normalizer.ts`, `thread/codex-thread-manager.ts`, `thread/codex-thread.ts`; `tests/integration/services/codex-model-catalog.integration.test.ts` | Codex `model/list` is paginated and normalized with advertised effort/Fast tier, then chosen ID goes to `thread/start` and `turn/start`. Existing live test is opt-in with `RUN_CODEX_E2E=1`; no static Codex row needed. |
| I-09 | 2026-09-23 | User request; `autobyteus-server-ts/AGENTS.md`; `autobyteus-web/AGENTS.md` | User explicitly lacks direct OpenAI/Anthropic API keys, accepts unit testing for API/Autobyteus runtime and asks for real Codex testing. Repo test guidance uses `vitest run --no-watch` and web `--run`. |
| I-10 | 2026-09-23 | `autobyteus-server-ts/src/llm-management/services/model-catalog-service.ts`, `claude-model-catalog.ts`, `runtime-management/claude/client/claude-sdk-client.ts` | Autobyteus list uses static factory, while Codex and Claude Agent SDK use live discovery. Static direct-API additions should not be misapplied to external runtime catalogs. |
| I-11 | 2026-09-23 | `autobyteus-server-ts/package.json`, `autobyteus-ts/package.json`, `pnpm-lock.yaml`; `npm view @anthropic-ai/claude-agent-sdk dist-tags --json`; `npm view @anthropic-ai/sdk dist-tags --json` | Exact current pins: Agent SDK `0.3.231` (server), Anthropic API SDK `0.116.0` (server and shared library). npm registry stable `latest` is `0.3.280` and `0.128.0`, respectively, as queried 2026-09-23. Both are behind. Current/latest Agent SDK peer ranges remain `@anthropic-ai/sdk >=0.93.0`, `@modelcontextprotocol/sdk ^1.29.0`, `zod ^4.0.0`; this is preliminary compatibility evidence, not a passing build. |
| I-12 | 2026-09-23 | [Anthropic Agent SDK changelog](https://github.com/anthropics/claude-agent-sdk-typescript/blob/main/CHANGELOG.md), [Anthropic API SDK release page](https://github.com/anthropics/anthropic-sdk-typescript/releases), `autobyteus-server-ts/docs/modules/agent_execution.md`, `src/runtime-management/claude/client/claude-sdk-client.ts` and its tests | Changelog includes SDK event/session/tool changes between pinned and latest; latest Agent SDK `0.3.280` has Claude Code parity. API SDK `0.128.0` released 2026-09-22. Repo intentionally pins exact SDK/peers and has runtime-specific query, model discovery, MCP, permission, interrupt and event behavior needing regression checks. |
| I-13 | 2026-09-23 | `autobyteus-ts/src/llm/api/anthropic-llm.ts` lines 130–317; `src/llm/converters/anthropic-tool-call-converter.ts`; `src/llm/prompt-renderers/anthropic-prompt-renderer.ts` | Both send and stream use Anthropic Messages API `client.messages.create`. Stream emits display reasoning and tool deltas but discards thinking signatures/redacted blocks and native assistant block order. Renderer rebuilds tool-use assistant content from text/tool calls, so a signed thinking+tool-use response cannot be replayed unmodified. Explicit forced `tool_choice` passes through request kwargs. |
| I-14 | 2026-09-23 | `autobyteus-ts/src/agent/loop/llm-phase.ts` lines 235–330; `src/llm/utils/response-types.ts`; `src/memory/memory-manager.ts` lines 258–307; `src/llm/utils/messages.ts` | Agent loop aggregates stream chunks into `CompleteResponse`, then memory writes a single assistant `Message` with text/reasoning and a tool-call batch. No response-level provider-native content currently crosses this boundary; adding signed thinking only to a tool-call start delta would lose block order/signature. |
| I-15 | 2026-09-23 | `autobyteus-ts/src/memory/working-context-snapshot-serializer.ts`, `src/memory/working-context-finalizer.ts`, `src/memory/compaction/working-context-compaction-output-validator.ts`, `src/llm/utils/tool-call-delta.ts` | Snapshot v5 serializes generic message metadata and native tool context and deserializes absent metadata; finalizer retains assistant messages; validator checks metadata object and tool protocol. A typed optional assistant-turn metadata payload can be directly absent in old snapshots without a schema-version migration, but requires shape validation and round-trip/compaction tests. No representative production snapshot or volume was accessed. |
| I-16 | 2026-09-23 | `autobyteus-server-ts/src/agent-execution/domain/agent-run-config.ts`, `services/agent-run-provisioning-service.ts`; `autobyteus-server-ts/src/token-usage/pricing/token-price-config-provider.ts`; `autobyteus-ts/src/llm/supported-model-definitions.ts` | Run model identifier is a string, provisioner trims it, and catalog/factory owns recognized direct-API IDs. Pricing provider resolves current catalog prices for new observations while historical usage stores a snapshot. New model IDs do not require a storage-enum migration; historical snapshots must remain untouched. |
| I-17 | 2026-09-23 | `autobyteus-server-ts/tests/unit/runtime-management/claude/client/claude-sdk-client.test.ts`; `tests/unit/agent-execution/backends/claude/**`; `tests/integration/services/codex-model-catalog.integration.test.ts`; `autobyteus-ts/tests/unit/llm/api/**` | Existing focused no-key Claude SDK, provider payload, catalog and Codex seams exist. Live Codex checks belong to validation; no local GPT-6 entitlement or provider-key success has been claimed. |
| I-18 | 2026-09-23 | Independent `ARCH-REV-001` report `design-review-report.md`, findings ARCH-F-001/002; [Anthropic preserved-thinking docs](https://platform.claude.com/docs/en/build-with-claude/preserved-thinking), especially prefix/sequence and client compaction sections | A thinking block is bound to preceding system/tools/messages; removing a thinking block from the middle while retaining later ones invalidates the later blocks. Removing **all** thinking blocks (or an oldest prefix) and never reintroducing them is allowed; model simply loses earlier reasoning. Client-authored keep-tail compaction with retained old thinking invalidates it; official non-beta alternative is to strip thinking/redacted blocks from kept turns while retaining text/tool-use. Never compact inside an active tool round before its tool-result continuation. |
| I-19 | 2026-09-23 | `autobyteus-ts/src/agent/llm-request-assembler.ts`, `src/agent/loop/llm-phase.ts`, `src/memory/compaction/pending-compaction-executor.ts`, `src/memory/compaction/accepted-compaction-builder.ts`, `src/memory/compaction/working-context-message-window-planner.ts`, `src/memory/memory-manager-working-context-controller.ts` | Request assembler executes pending compaction before appending the next input. The planner retains recent complete units and builder writes compacted-memory user message before them; it currently does not invalidate signed thinking. The compaction gate permits initial attempts independent of turn origin, so an LLM tool continuation can reach it. MemoryManager has a context replacement/persist boundary. LlmPhase knows whether a turn has tool-invocation batches. |
| I-20 | 2026-09-23 | `autobyteus-ts/src/agent/loop/llm-phase-tools.ts`, `src/llm/utils/media-input-sanitizer.ts`, [Anthropic preserved-thinking docs](https://platform.claude.com/docs/en/build-with-claude/preserved-thinking) | Tools are resolved from current agent tool instances/config on each LLM phase, and outbound media is re-sanitized on each request. Across natural turns, treating signed thinking as durable indefinitely would additionally require proving top-level tool/system and earlier media/message prefix stability. An active-tool-cycle-only signed retention window with an explicit turn-boundary reset is a provider-supported, smaller contract: preserve blocks for the immediate tool continuation; remove all old blocks before the next independent turn and never reinsert them. |
| I-21 | 2026-09-23 | Code Review `CRR-001` / `CR-F-001` in `code-review-report.md`; `awk 'NF{n++} END{print n}' autobyteus-ts/src/llm/supported-model-definitions.ts`; reviewer `git show HEAD^:...` audit | Commit `704e2108e` raised the changed static catalog from 500 to 538 effective nonempty lines, breaching the independent source-review `>500` hard limit. Behavior paths otherwise confirmed. This is a Design Impact in file responsibility, not a new product requirement; API/E2E cannot proceed before source re-review. |
| I-22 | 2026-09-23 | `autobyteus-ts/src/llm/supported-model-definitions.ts` lines 1–145 and 302–410; `qwen-supported-model-definitions.ts`; `llm-factory.ts` import of aggregator | Catalog combines a local reusable `pricing` constructor, provider schemas, and all provider rows in one 538-effective-line file. Existing Qwen provider rows already live in a provider-specific definition module; the aggregator remains the only list read by LLMFactory. Anthropic schemas plus rows are a coherent provider-owned group of roughly 150 nonempty lines. Moving them out and moving the genuinely shared `pricing` constructor to a small catalog-pricing helper lowers the changed aggregate safely below 500 without duplicate model IDs or a second runtime registry. |

## Relevant Existing Behavior And Supported Product Paths

| Behavior | Trigger / current product-level sequence | Invariant / confidence |
| --- | --- | --- |
| BEH-001 | User selects OpenAI row in existing model selector and starts an Autobyteus agent; static catalog resolves it, Responses provider handles request. | Astra path supported; Sol/Luna have no current supported behavior. High confidence from I-04/05. |
| BEH-002 | User selects Anthropic row and starts simple/agent tool turn; static catalog and Anthropic provider handle requests. | Opus 5 path supported; Opus 5.5 has no current supported behavior. Tool replay compatibility unknown (I-06). |
| BEH-003 | New usage observation reaches token meter; catalog pricing yields an estimate/snapshot or missing status. | Existing Standard pricing/snapshot contract supported (I-07). |
| BEH-004 | Codex runtime user chooses an advertised model; model discovery and runtime launch use the same ID. | Supported dynamic path; local GPT-6 entitlement unproven (I-03/08). |
| BEH-005 | Maintainer runs validation with currently available credentials. | Explicit operational edge scenario from user. |
| BEH-006 | Maintainer reacts to provider release and user SDK freshness request by checking current stable package versions and refreshing supported integrations. | Existing Claude Agent SDK runtime and direct Anthropic API paths are supported; installed package versions are behind registry latest (I-11/12). |

No new UI journey, provider account provisioning, or manual internal-state corruption is inferred from technical callability.

## Relevant Codebase, Structural And Payload Inventory

- Payload/content surfaces: `supported-model-definitions.ts` static rows and pricing; GraphQL model catalog payloads; persisted run model IDs and token-usage price snapshots; provider-native request/stream fixtures; exact package manifest/lockfile pins.
- Structural surfaces: Existing OpenAI Responses and Anthropic request adapters; factory/metadata resolver; server catalog and price calculator; dynamic Codex App Server client/normalizer/thread; Claude Agent SDK client/session/event adapters; Vue selectors consuming catalog rows. No new endpoint or persistence schema appears necessary on present evidence, but architecture must confirm.
- Existing readers/writers: LLMFactory and ModelCatalogService read definitions; server token meter creates snapshots; run storage carries model identifier; runtime adapters construct provider requests.
- Potential impacts: Provider API contract and request validity are in scope; Anthropic tool-turn replay may require structural changes across renderer/runtime. SDK upgrade could alter Claude session/event/tool behavior or dependency packaging; architecture must compare exact changelog and test seams. No new security/privacy/persistence schema/deployment change established; model-id persistence constraints remain an architecture question.

## Runtime / Probe Findings

- `git fetch origin personal` then isolated worktree creation: base `467c1bc12d439ee79243d124402c2f65f25c3cd2`, branch `requirements/new-models-gpt6-opus55`. Shared `personal` checkout remained clean before authoring.
- `codex --version` returned `codex-cli 0.155.1`; auth file presence only was checked, not its secret contents. No Codex live model list or turn executed during requirements investigation. API/E2E Engineer owns full validation.
- No API key values were inspected, created or used.

## Persisted Data And State Facts

Existing run configs include model identifiers; token-usage records include pricing snapshots. Volume unknown; no data loss or repricing is acceptable. This proposal adds new selectable IDs; no evidence of a required schema migration. Architecture must verify storage validation and reader compatibility.

## Stakeholder / External-Contract Implications

- User-supplied screenshots are corroborated by official OpenAI and Anthropic documentation; screenshots alone do not establish provider API semantics or local entitlement.
- Anthropic Opus 5.5 has breaking request/replay rules not safely addressed by merely appending a catalog row.
- Standard-price support is an existing model-catalog outcome; Fast/Batch/regional/account-specific billing is not inferred.
- Provider availability and live API behavior cannot be proved without keys; Codex account's actual advertised model set must be observed during validation.

## Assumptions, Unknowns And Risks

| ID | Type | Finding / why it matters | Resolution |
| --- | --- | --- | --- |
| U-01 | Unknown | Whether local Codex account advertises a new GPT-6 row and can complete a turn. | API/E2E live test; report blocker if unavailable. |
| U-02 | Risk | Anthropic thinking blocks are not visibly retained in current tool-use replay; Opus 5.5 preserved-thinking contract may fail an agent loop. | Architecture investigation and mocked replay test. |
| U-03 | Risk | `tool_choice` kwargs can pass through; forced choice is invalid for Opus 5.5. | Design request policy and tests against official contract. |
| U-04 | Assumption | Request is for released Opus 5.5, not future Sonnet/Haiku 5.5; support includes Standard pricing. | Explicit user approval of SR-001. |
| U-05 | Unknown | Whether stored model-ID validation or frontend schema constrains the new IDs. | Architecture investigation after approval. |
| U-06 | Risk | Agent SDK `0.3.231→0.3.280` spans event/session/tool behavior changes; API SDK `0.116.0→0.128.0` may change types or payload handling. | Architecture changelog/API surface review and focused no-key regression checks. |
| U-07 | Assumption | User's singular “Claude SDK” could refer only to Agent SDK; proposed coordinated update also includes direct Anthropic API SDK because both are stale and relevant to Opus 5.5. | Explicit approval of SR-002 two-package scope. |

## Architecture Investigation Findings

Approval of SR-002 recorded in requirements. I-13–I-17 establish a cross-boundary defect in the direct Anthropic tool cycle: provider-native signed thinking is reduced to display text before the agent-loop/memory boundary. ARCH-REV-001 adds two normal-lifecycle gaps (I-18–I-20): a later signed turn cannot follow a missing middle thinking block, and keep-tail compaction must not retain signed blocks bound to its replaced prefix. Revised design uses an **active tool-cycle retention window**: capture/replay complete signed tool-bearing assistant turns during their tool-result continuations; before the next independent turn, atomically remove every prior native thinking/redacted block while retaining text/tool-use and display reasoning, so no middle gap or reintroduction is possible. Defer client-side compaction while an active tool continuation needs signed blocks; at accepted compaction, strip all stale signed blocks from retained units. Both operations use one memory-owned transformation. This is the documented non-beta client strategy and does not change approved behavior. Request validation for Opus 5.5 belongs in the Anthropic adapter; old model policies should not change. Existing snapshot v5 metadata offers an optional field without requiring a rewrite. Direct OpenAI model additions reuse the static catalog/Responses/pricing path. Codex/Claude Agent SDK catalogs remain dynamic. Version compatibility is a validation obligation, not established by npm peer ranges alone.

Post-implementation CRR-001 Design Impact (I-21/I-22): approved model additions are behaviorally present in IR-001, but the static catalog file now violates the changed-source size contract. The proportionate solution revision extracts the existing Anthropic provider schemas/rows into one provider-owned catalog sublist and a small shared catalog-pricing helper, leaving `supported-model-definitions.ts` as the sole authoritative aggregate and preserving exact ordering, IDs, schema objects, metadata and rate semantics. No new API, persistence transition, provider runtime owner or UI change is implicated. This source-size finding does not reopen the approved requirements.

## Requirement Implications / Notes For Architecture

New model support requires exact IDs, valid request shapes, Standard pricing, and no-key test evidence. Codex live test is an explicit operational validation requirement. User follow-up adds a proposed stable latest refresh of both Anthropic SDK packages; current versions and registry latest are verified, but compatibility is not yet. Existing data/legacy model behavior must be preserved. No Product Design handoff is requested. Architecture may decide technical structure only after the user approves the revised `requirements-doc.md` SR-002 baseline.

## Supplemental Artifact Inventory

No behavior-defining supplements yet. The user's screenshots are input evidence, not an independent authoritative provider contract.

## Product Design Request Context

- Product Design request in the current input: Not stated.
- User's requested outcome: Runtime/model support and testing, not a redesigned interface.

## Remaining Investigation

Implementation must re-query stable npm dist-tags immediately before pinning and use TypeScript/test failures to identify exact SDK adaptation needs. API/E2E must observe this host's live Codex model list and model-specific turns. No direct OpenAI/Anthropic API credentials or representative production snapshots were available to inspect; validation must disclose that limit. These are execution evidence gaps, not blockers to the current architecture decision.
