# Investigation Notes

## Investigation Status

- Bootstrap Status: Complete — dedicated task worktree created from refreshed `origin/personal`.
- Current Status: Investigation complete; requirements refined and explicitly approved by the user on 2026-07-14. Architecture review Round 1 returned Fail for AR-001/AR-002; the canonical design package has been reworked and is ready for Round 2 review.
- Investigation Goal: Map current Grok support in `autobyteus-ts`, identify the obsolete and replacement model IDs, assess API/capability and persisted-config impact, and define a reviewable clean-cut design.
- Scope Classification (`Small`/`Medium`/`Large`): Medium
- Scope Classification Rationale: Bounded to one TypeScript package/provider but crosses model catalog, provider request invariants, metadata/pricing, tests, documentation, and credential-gated validation.
- Scope Summary: Keep only xAI `grok-4.5` in the active Grok catalog, remove `grok-4.3` and `grok-build-0.1`, remove active legacy references, and validate deterministically/live where region access permits.
- Primary Questions To Resolve:
  - What exact old Grok model IDs are active today? Resolved: `grok-4.3` is the active flagship row and `grok-build-0.1` is a separate active coding row. The integration test still uses retired `grok-4-1-fast-reasoning`; the user approved removing both active rows.
  - Which exact xAI model ID is the intended replacement? Resolved by current official docs: `grok-4.5`.
  - Where are model IDs registered, surfaced, routed, documented, and tested? Resolved: catalog, adapter default, curated metadata (currently absent), unit catalog/pricing tests, integration Grok test, metadata integration test, provider catalog docs.
  - Does the model change affect request parameters, streaming, tools, or SDK/API versions? Resolved: Chat Completions, streaming, and function calling remain supported; Grok 4.5 reasoning forbids presence/frequency/stop and exposes low/medium/high effort.
  - Are model IDs persisted, and what transition outcome is safe? Resolved for package scope: no package-owned catalog persistence; historical strings remain directly usable and old runtime selection is intentionally not aliased.
  - Can `.env.test` from the main repository worktree support realistic tests? The main `autobyteus-ts/.env.test` exists and was copied locally; the current EU Grok credential receives 403 for `grok-4.5` region access.

## Request Context

The user says `autobyteus-ts` supports Grok but its existing model is low performance and unused, while a new Grok model is good. They request investigation into removing the existing model and supporting the new model. They also instruct that, for later testing in a worktree, `.env.test` from the main repository should be copied into the worktree to enable testing.

The current repository has more than one Grok row. The user explicitly selected a quality-first single-model catalog: keep the newly released flagship `grok-4.5` and remove both current rows (`grok-4.3` and `grok-build-0.1`) without compatibility aliases.

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/support-new-grok-model`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/support-new-grok-model/tickets/in-progress/support-new-grok-model`
- Current Branch: `codex/support-new-grok-model`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/support-new-grok-model`
- Bootstrap Base Branch: `origin/personal`
- Remote Refresh Result: `git fetch origin --prune` succeeded on 2026-07-14; `origin/HEAD` resolves to `origin/personal`.
- Task Branch: `codex/support-new-grok-model`
- Expected Base Branch (if known): `personal` / `origin/personal`
- Expected Finalization Target (if known): `personal` after downstream review and explicit delivery/finalization approval.
- Bootstrap Blockers: None for deterministic work; live Grok 4.5 access is region-blocked.
- Notes For Downstream Agents: `.env.test` was copied from `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-ts/.env.test` to the ignored task path `/Users/normy/autobyteus_org/autobyteus-worktrees/support-new-grok-model/autobyteus-ts/.env.test`. Do not print, attach, commit, or include it in any handoff reference files. `pnpm install --frozen-lockfile --ignore-scripts` installed dependencies locally; `node_modules` is ignored.

## Supplemental Solution Artifact Inventory

| Artifact Path | Purpose | Evidence Or Decision Captured | Related Requirement / Acceptance-Criteria IDs | Status | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/support-new-grok-model/tickets/in-progress/support-new-grok-model/grok-model-contract.md` | Exact Grok replacement/removal contract and active-reference removal matrix | Defines `grok-4.5` as the sole supported row, records xAI constraints and every active surface to update | REQ-001–REQ-008; AC-001–AC-007 | Approved — user selected Grok 4.5 only | Keep aligned with design and implementation |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/support-new-grok-model/tickets/in-progress/support-new-grok-model/design-review-report.md` | Architecture review evidence and Round 1 findings | Records AR-001 safe-normalization design impact and AR-002 retired-ID disposition gap; both are resolved in the revised package | REQ-001–REQ-008; AC-001–AC-007 | Round 1 Fail — rework completed for Round 2 | Include in the next cumulative architecture-review handoff |

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-07-14 | Command | `git fetch origin --prune` | Refresh tracked remote state before worktree creation | Succeeded; remote default is `personal`. | No |
| 2026-07-14 | Command | `git worktree add -b codex/support-new-grok-model /Users/normy/autobyteus_org/autobyteus-worktrees/support-new-grok-model origin/personal` | Isolate task artifacts and implementation | Dedicated worktree created at the task root. | No |
| 2026-07-14 | Code | `autobyteus-ts/src/llm/supported-model-definitions.ts:239-253` | Locate active Grok model catalog rows and pricing | Active rows are `grok-4.3` and `grok-build-0.1`; both use `GrokLLM`. | Replace both with one 4.5 row. |
| 2026-07-14 | Code | `autobyteus-ts/src/llm/api/grok-llm.ts:6-20` | Locate Grok provider owner and default model | `GrokLLM` extends `OpenAICompatibleLLM`, uses `GROK_API_KEY` and `https://api.x.ai/v1`, and defaults to `grok-4.3`. | Update fallback and enforce 4.5 invariants. |
| 2026-07-14 | Code | `autobyteus-ts/src/llm/api/openai-compatible-llm.ts:110-149` | Trace Grok request/response/stream path | Shared adapter calls `client.chat.completions.create`, supports streaming and tool-call deltas, and normalizes content/usage. | Keep transport; test 4.5 payload. |
| 2026-07-14 | Code | `autobyteus-ts/src/llm/api/openai-compatible-request-builder.ts:25-65` | Determine request fields emitted by shared builder | Builder emits temperature/top-p/penalties/stop/max tokens and extra params; model-specific filtering must occur before it for 4.5. | Design Grok-owned sanitization. |
| 2026-07-14 | Code | `autobyteus-ts/tests/integration/llm/api/grok-llm.test.ts:11-17` | Check durable Grok integration target | Test constructs retired `grok-4-1-fast-reasoning`, relying on xAI redirect. | Change to 4.5. |
| 2026-07-14 | Code | `autobyteus-ts/tests/unit/llm/supported-model-definitions.test.ts:25,152,314-326` | Find catalog membership/pricing assertions | Tests price/assert `grok-4.3`, retain Build, and assert old retired IDs absent. | Update to sole 4.5 catalog and pricing. |
| 2026-07-14 | Code | `autobyteus-ts/tests/integration/llm/llm-factory-metadata-resolution.test.ts` | Check metadata/listing coverage | No Grok-specific listing/metadata assertions exist. | Add Grok metadata assertions. |
| 2026-07-14 | Code | `autobyteus-ts/src/llm/metadata/curated-model-metadata.ts` | Check docs-backed Grok limits | No Grok curated metadata exists. | Add 4.5 context metadata only. |
| 2026-07-14 | Code | `autobyteus-ts/docs/provider_model_catalogs.md` | Check durable model catalog documentation | Latest additions omit Grok; document has no Grok provider policy section. | Add Grok 4.5 and Build notes. |
| 2026-07-14 | Command | `rg -n -i --hidden --glob '!node_modules/**' --glob '!dist/**' --glob '!*.lock' 'grok|xai' autobyteus-ts` | Inventory active and historical references | Active source/test refs listed above; historical ticket records also mention prior IDs. | Scan active refs after implementation; preserve historical records. |
| 2026-07-14 | Command | `find ... -name '.env.test'`; `sed -E 's/^...=.*/...=<redacted>/' .../.env.test` | Locate test credential source without exposing secrets | Main `autobyteus-ts/.env.test` exists with `GROK_API_KEY`; values were never printed. | Use only locally; remove/leave ignored after validation. |
| 2026-07-14 | Setup | `cp /Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-ts/.env.test autobyteus-ts/.env.test` | Follow user's worktree testing instruction | Copied into ignored task package path; no tracked diff. | No; preserve secret hygiene. |
| 2026-07-14 | Setup | `pnpm install --frozen-lockfile --ignore-scripts` in `autobyteus-ts` | Install exact lockfile dependencies for probes/tests | Installed with pnpm 10.28.2; no tracked lockfile change. | No. |
| 2026-07-14 | Test | `pnpm exec vitest run tests/unit/llm/supported-model-definitions.test.ts tests/integration/llm/api/grok-llm.test.ts` | Establish baseline catalog/Grok coverage | 2 files, 11 tests passed. Integration passed using the retired slug redirect. | Update test target to 4.5. |
| 2026-07-14 | Test | `pnpm exec vitest run tests/integration/llm/llm-factory-metadata-resolution.test.ts tests/unit/llm/api/openai-compatible-request-builder.test.ts tests/unit/llm/api/openai-compatible-llm.test.ts` | Establish baseline metadata/shared request behavior | 3 files, 18 tests passed; one intentional metadata-timeout warning. | Re-run after changes with Grok assertions. |
| 2026-07-14 | Probe | Node OpenAI client against `https://api.x.ai/v1/chat/completions` using `grok-4.5`, with and without `reasoning_effort: low`; response fields were redacted | Verify live provider access and transport | Both requests returned HTTP 403: `The model grok-4.5 is not available in your region.` No payload/result secret was printed. | Treat live validation as region-blocked, not as a code failure; retry only with eligible access. |
| 2026-07-14 | Review | `/Users/normy/autobyteus_org/autobyteus-worktrees/support-new-grok-model/tickets/in-progress/support-new-grok-model/design-review-report.md` Round 1 | Validate the complete solution package before implementation | Review passed catalog direction/ownership but returned blocking AR-001 for safe sync/stream normalization and AR-002 for `grok-code-fast-1` disposition. | Rework canonical requirements/contract/design and resend the cumulative package for Round 2. |

## Current Behavior / Current Flow

- Current entrypoint or first observable boundary: `LLMFactory` builds `LLMModel` instances from `supportedModelDefinitions`; callers select a model by exact API-runtime identifier.
- Current execution flow: `LLMFactory.createLLM(modelIdentifier, configInput?)` -> `GrokLLM` -> `OpenAICompatibleLLM._sendMessagesToLLM` / `_streamMessagesToLLM` -> `OpenAICompatibleRequestBuilder` -> official `openai` Node client `chat.completions.create` -> `https://api.x.ai/v1`.
- Ownership or boundary observations: `supported-model-definitions.ts` owns built-in catalog identity/pricing/schema; curated metadata owns docs-backed limits; `GrokLLM` is the provider adapter and should own Grok-specific request invariants; the shared request builder must remain provider-neutral.
- Current behavior summary: `grok-4.3` is the adapter fallback/catalog flagship; `grok-build-0.1` is a separate catalog row; a stale integration test uses retired `grok-4-1-fast-reasoning`, which xAI redirects; Grok requests use shared Chat Completions content/tool/streaming behavior. The approved target is one `grok-4.5` row with no old-ID fallback.

## Design Health Assessment Evidence

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Behavior Change + Feature + Cleanup
- Candidate root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Legacy Or Compatibility Pressure plus Missing Invariant
- Refactor posture evidence summary: The existing ownership model is healthy enough for a bounded provider replacement, but the provider adapter needs a small model-specific invariant layer because the generic builder emits fields xAI rejects for reasoning models.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| `supported-model-definitions.ts` | `grok-4.3` row and trusted pricing are active; Build 0.1 is a second current row | Catalog contraction/addition belongs in the existing catalog owner | Implement sole 4.5 row |
| `grok-llm.ts` | Default fallback is hard-coded to `grok-4.3` | Adapter default must move with catalog replacement | No |
| `openai-compatible-request-builder.ts` | Shared builder emits penalties/stop if present | Grok-specific request rule must be enforced inside `GrokLLM` | Add mocked payload tests |
| Integration test | Uses retired `grok-4-1-fast-reasoning` | Durable test does not validate the current target and masks stale support via provider redirect | Update test target |
| xAI reasoning docs | Grok 4.5 rejects presence/frequency/stop and requires enabled reasoning effort | New model support needs schema and request invariant coverage | Verify with eligible live account when possible |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-ts/src/llm/supported-model-definitions.ts` | Static built-in LLM catalog, pricing, config schemas | Contains Grok 4.3 and Build 0.1; no Grok reasoning schema | Replace 4.3 with 4.5 and add schema/pricing in existing catalog owner |
| `autobyteus-ts/src/llm/api/grok-llm.ts` | Grok provider adapter and default fallback | Uses xAI Chat Completions, default is 4.3, no provider-specific normalization | Make 4.5 the fallback and enforce reasoning-model request constraints here |
| `autobyteus-ts/src/llm/api/openai-compatible-llm.ts` | Shared OpenAI-compatible completion/stream/tool boundary | Already supports needed endpoint behavior | Reuse; do not add Grok conditionals here |
| `autobyteus-ts/src/llm/api/openai-compatible-request-builder.ts` | Shared provider-neutral request shaping | Emits configurable penalties/stop | Keep generic; pass Grok-sanitized config |
| `autobyteus-ts/src/llm/metadata/curated-model-metadata.ts` | Curated docs-backed context/output metadata | No Grok rows | Add `grok-4.5` 500k context metadata only |
| `autobyteus-ts/tests/unit/llm/supported-model-definitions.test.ts` | Catalog, pricing, and membership tests | Asserts 4.3 and retains Build in current expectations | Update to 4.5-only membership and clean-cut absence |
| `autobyteus-ts/tests/integration/llm/api/grok-llm.test.ts` | Credential-gated completion/stream smoke | Uses retired 4.1 slug and redirect | Test exact 4.5 target; classify region block truthfully |
| `autobyteus-ts/tests/integration/llm/llm-factory-metadata-resolution.test.ts` | Factory model-info/metadata integration coverage | No Grok assertions | Add 4.5 context/schema/listing checks |
| `autobyteus-ts/docs/provider_model_catalogs.md` | Durable catalog ownership, provider policy, testing hygiene | Omits Grok current rows/policy | Add current Grok contract and removal note |
| `autobyteus-ts/tests/setup.ts` / `.env.test` | Credential loading for tests | Loads local package env after workspace root env; copied file is ignored | Keep setup unchanged; do not commit secrets |

## Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-07-14 | Test | `pnpm exec vitest run tests/unit/llm/supported-model-definitions.test.ts tests/integration/llm/api/grok-llm.test.ts` | Baseline 11 tests passed; Grok integration completion/stream took 8.7s using retired slug | Current network smoke proves old redirect path, not target model support; update target before relying on it |
| 2026-07-14 | Test | `pnpm exec vitest run tests/integration/llm/llm-factory-metadata-resolution.test.ts tests/unit/llm/api/openai-compatible-request-builder.test.ts tests/unit/llm/api/openai-compatible-llm.test.ts` | Baseline 18 tests passed; metadata timeout warning is intentional test behavior | Existing shared paths are green before change |
| 2026-07-14 | Probe | Node `openai` client with `model: 'grok-4.5'` against xAI Chat Completions, both default and `reasoning_effort: 'low'` | Both returned HTTP 403 region restriction; no request content or secrets exposed | Live target validation is blocked in current EU region; deterministic tests remain required |
| 2026-07-14 | Setup | Copied main `autobyteus-ts/.env.test` into task `autobyteus-ts/.env.test`; installed with frozen lockfile | Vitest loaded 4 env entries from local file; no tracked changes | Downstream can repeat tests without rediscovering setup; keep env ignored |

## External / Public Source Findings

- Public API / spec / issue / upstream source:
  - `https://docs.x.ai/developers/grok-4-5` — exact model ID, API support, pricing, reasoning levels, and last-updated July 8, 2026.
  - `https://docs.x.ai/developers/models` — xAI model catalog, `grok-4.5` flagship role, 500k context, `$2/$6` pricing, `$0.50` cached input, and last-updated July 9, 2026.
  - `https://docs.x.ai/developers/release-notes` — July 8, 2026 API availability and pricing/reasoning announcement.
  - `https://docs.x.ai/developers/model-capabilities/text/reasoning` — `reasoning_effort` low/medium/high, high default, cannot disable, and invalid presence/frequency/stop fields.
  - `https://docs.x.ai/developers/model-capabilities/legacy/chat-completions` — Grok 4.5 supported on Chat Completions with streaming example; endpoint is legacy.
  - `https://docs.x.ai/developers/migration/may-15-retirement` — retired old slugs and redirects/recommended replacements; `grok-code-fast-1` maps to `grok-build-0.1`.
  - `https://docs.x.ai/developers/pricing` — current cache/read pricing table.
  - `https://x.ai/news/grok-4-5` — launch rationale/benchmark claims; not used as the sole contract source.
- Version / tag / commit / freshness: Official xAI pages were queried/opened on 2026-07-14; pages state last-updated dates July 7–9, 2026. Repository base is `fdb370d4` from refreshed `origin/personal`.
- Relevant contract, behavior, or constraint learned: `grok-4.5` is the current flagship, available through both Chat Completions and Responses, with configurable reasoning; current EU credential is region-blocked.
- Why it matters: It supports a focused catalog/adapter update without inventing a new transport, while requiring provider-specific invalid-field handling and truthful live-validation reporting.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: xAI API key for live Grok integration; deterministic unit tests use mocked OpenAI client.
- Required config, feature flags, env vars, or accounts: `GROK_API_KEY` from local `.env.test`; current key/region cannot access Grok 4.5. Never print values.
- External repos, samples, or artifacts cloned/downloaded for investigation: None.
- Setup commands that materially affected the investigation:
  - `cp /Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-ts/.env.test autobyteus-ts/.env.test`
  - `pnpm install --frozen-lockfile --ignore-scripts`
  - Baseline Vitest commands listed in the Source Log.
- Cleanup notes for temporary investigation-only setup: `autobyteus-ts/.env.test` and `node_modules/` are ignored. Remove the copied env after testing if local policy requires; never stage it.

## Findings From Code / Docs / Data / Logs

- The project uses a static built-in model catalog and a separate curated metadata lookup; built-in Grok models are not dynamically discovered from xAI.
- `LLMFactory` clones model default configuration, then applies sparse user config; model/provider invariants belong after composition in the adapter. This supports a Grok-only request policy without changing shared config semantics.
- `OpenAICompatibleLLM` already normalizes completion content, streaming chunks, tool-call deltas, and token usage for the Grok path. xAI's Chat Completions support makes it reusable for Grok 4.5.
- The default integration test's retired slug is a validity defect: xAI's May retirement page says old slugs redirect, so a green test does not prove the requested current model is explicitly selected.
- No active application or server model default in the superrepo was found for Grok; the only active Grok identifiers are in `autobyteus-ts` source/tests/docs, with historical ticket records excluded from active removal. The user-approved single-model scope removes both old active rows.

## Persisted Data Transition Evidence (When Applicable)

- Current stored subject, location, representative shape, and approximate volume: No package-owned catalog store. `LLMModel` IDs are runtime objects; usage/compaction records store identifier/value strings as observations. No volume estimate is applicable.
- Relevant code-model, serialization, semantic, or physical-store change: Catalog membership/default ID changes; no serialized schema field changes.
- Normal readers and writers, including unknown/extra-field behavior: Historical usage/compaction readers treat model IDs as strings and do not resolve them against the current catalog for reading.
- Representative direct-read or compatibility evidence: Code search found model IDs in `llm-token-usage-observation.ts` and compaction reporting, but no active reader that requires the current catalog row to interpret historical strings.
- Required semantics and invariants preserved by direct use: `Yes` — historical IDs remain descriptive strings; active model creation intentionally uses only current catalog entries.
- Physical storage, privacy/security, disposal, rebuild, or operational constraints: No migration I/O; no secret data in artifacts. External persisted run/config owners must update selected IDs separately.
- Concrete benefit, cost, and risk of migration if it remains a candidate: Migration would add historical-ID branches without changing package-owned schema; benefit is none, so it is rejected.
- Existing migration framework or lifecycle constraints, only if migration may be required: Not applicable.

## Constraints / Dependencies / Compatibility Facts

- No compatibility wrappers, aliases, or fallback paths for removed `grok-4.3`,
  `grok-build-0.1`, or retired Grok IDs in active code. `grok-code-fast-1` may
  remain only in the intentional negative absence assertion and historical
  ticket/audit evidence.
- The xAI model pages are authoritative for current IDs/capabilities/pricing; current EU access is a temporary external constraint.
- Existing `openai` Node SDK and `GrokLLM` Chat Completions adapter are sufficient for the focused path.
- Shared builder changes are high fan-out; prefer Grok adapter-owned sanitization.
- `.env.test` from the main worktree is ignored and must not be part of the package handoff.
- Historical ticket/audit artifacts may mention old IDs and are intentionally excluded from active-reference removal.

## Open Unknowns / Risks

- User has explicitly approved removal of `grok-build-0.1`; no scope ambiguity remains.
- Round 1 architecture findings are resolved in the revised package: Grok
  normalization now specifies a fresh manual config copy, both sync/stream
  overrides, all requested raw spellings, and immutability coverage; the
  `grok-code-fast-1` disposition is aligned across requirements, contract,
  design, docs, and scan guidance.
- Live Grok 4.5 completion/stream/tool behavior remains unverified in the current EU region; use deterministic mocked payload tests and record the 403 blocker.
- Chat Completions is a legacy xAI endpoint; a future Responses migration may be warranted but is not required to add this model.
- xAI model pricing/limits may change after implementation; record exact verification date/source in code/docs.

## Notes For Architecture Reviewer

The revised package treats `grok-4.5` as the sole supported Grok row, removes `grok-4.3` and `grok-build-0.1` cleanly, and keeps the transport unchanged. The provider-boundary invariant design now explicitly uses a pure manual `LLMConfig` copy with fresh `extraParams`/stop-array state, normalizes kwargs through both Grok sync/stream overrides, and tests source immutability. `grok-code-fast-1` is explicitly historical/negative-assertion-only. Do not accept a design that relies on xAI redirect aliases or keeps removed identifiers in active catalog/test paths. The user has approved the requirements and supplement; the package is ready for Round 2 review.
