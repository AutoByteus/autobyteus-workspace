# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/design-spec.md`
- Supplemental Task Artifacts: `None`
- Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/solution-revision-record.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/design-review-report.md`
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/architecture-review-revision-record.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/implementation-handoff.md`
- Implementation Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/implementation-revision-record.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/code-review-report.md`
- Code Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/code-review-revision-record.md`
- Delivery Revision Record (delivery re-entry only): `N/A`
- Relevant Delivery Revision IDs: `N/A`
- API/E2E Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-002`
- Current Investigation Round: `2`
- Trigger: `code_reviewer` CRR-003 proportional durable-test review found Local Fix finding `TR-001` after API-REV-001.
- Prior Investigation Reviewed: `API-REV-001` Pass / `95.3%`; CRR-003 `TR-001`
- Latest Authoritative Investigation: `This file — API-REV-002 complete`

## Current Requirement And Design Basis

The reviewed change must retain valid custom OpenAI-compatible `/models` identifiers and optional positive integer metadata, resolve each limit by `advertised live -> exact endpoint/model profile or explicit wire-alias reference -> exact built-in value as explicitly inferred -> unknown`, and carry non-secret per-field source/provenance through `LLMModel.toModelInfo()` and server enrichment. Endpoint profile identity is exact protocol/hostname/port/base-path plus model value; non-empty URL query/hash inputs are not profile-addressable. The existing runtime token-budget/compaction path must consume the resolved model fields without a provider-specific runtime branch. Existing discovery timeout/error and last-known-good behavior, persisted custom-provider configuration, built-in live-over-static behavior, and secret boundaries remain unchanged. The token meter must preserve known-capacity progress and show the latest prompt plus an explicit `context limit unavailable` state when capacity is unknown.

Critical acceptance criteria are AC-001 through AC-014, with direct coverage required for the changed discovery, resolver, custom model, server, runtime budget, GraphQL, and token-meter boundaries. The implementation handoff's `Legacy / Compatibility Removal Check` is clean and its `Persisted Data Transition Check` is `Not Affected`; validation must confirm no compatibility shim or metadata persistence is introduced.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 / discovery normalization | Changed | REQ-001, REQ-005; AC-001, AC-002; IR-003 | Verify every advertised alias, strict JSON-number validation, row/field precedence, duplicate/model sorting, mixed row shapes, and no raw response/key retention. |
| BEH-002 / endpoint/profile/fallback resolver | Added / Changed | REQ-002, REQ-003, REQ-010–REQ-012; AC-004, AC-012–AC-014 | Verify exact profile and wire-alias provenance, canonical endpoint identity, query/hash refusal, near-miss rejection, duplicate built-in conservative selection, and unknown behavior. |
| BEH-003 / custom model to runtime budget | Changed | REQ-004; AC-009, AC-010 | Exercise a constructed custom model through `resolveTokenBudget`, including known profile/inferred capacity, unknown null budget, and preserved explicit override. |
| BEH-004 / source propagation and catalog | Added / Preserved | REQ-006, REQ-009; AC-003, AC-008, AC-011 | Verify live/profile/inferred/unknown fields survive `toModelInfo`, server enrichment, and GraphQL coarse provenance. Verify reload/stale preservation. |
| BEH-005 / token meter | Changed | REQ-007; AC-005, AC-006 | Keep existing known denominator/progress assertion and verify unknown prompt-only state with no percentage or fake denominator. |
| Persisted custom-provider records | Preserved / Not affected | REQ-005, REQ-008; AC-007 | Use isolated temporary server app-data in E2E; verify create/read/delete works while derived metadata is not persisted and synthetic credentials/raw payloads do not escape. |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | `autobyteus-ts` discovery, exact resolver, custom model, shared source union | Focused unit tests exist for normalization, resolver, provider, model, generic metadata, budget | Some alias combinations and full model-to-budget propagation are not yet asserted together | Direct unit/in-process executable probe |
| API / transport / contract | Yes | Synthetic `/models` request and `ModelInfo`/server contract | Discovery unit boundary and server unit source-preservation test; no custom live request through server yet | Authorization/response shape and model metadata crossing the server catalog need direct evidence | Synthetic live API + GraphQL E2E |
| Frontend component / state | Yes | `TokenUsageMeterPanel.vue` unknown-capacity branch | Existing component test covers known and unknown render states | No full app browser session; no browser-specific behavior changed | Existing renderer test; browser only if residual risk remains |
| Browser integration / user journey | Limited | Token meter component render only; no route/auth/browser API change | Nuxt/Vue component tests | Full workspace routing/data fetch not exercised | Not required initially; use browser only if repository evidence leaves material UI gap |
| Authentication / session / permissions | No material product change | Existing custom discovery credential handoff remains | Provider/service tests and synthetic secret usage | Real secret vault + authenticated remote provider not used | Isolated server E2E with synthetic secret vault |
| Desktop renderer / web-equivalent UI | No material shell change | Same Vue token panel rendered by Nuxt | Component renderer tests | Browser/Electron shell not relevant to changed logic | Not required |
| Desktop shell / Electron-specific integration | No | No preload/IPC/window/package change | Existing shell suites are out of scope | None material | None |
| Process / lifecycle | Limited | Discovery stale/error reload and cache invalidation | Provider stale/error unit test; server E2E cleanup path | Full server restart/reload with persisted provider is not yet direct evidence | Isolated E2E create/reload/delete |
| Persisted-data transition | Yes, preservation only | Derived metadata must not alter version-2 custom-provider config/secrets | Requirements/implementation transition evidence; no new metadata persistence assertion in this scope | Direct temp-store read after E2E create is useful | Isolated server E2E, no migration |
| Worker / queue / distributed coordination | No | None | Not applicable | None | None |
| External integration | Yes, bounded | OpenAI-compatible `/models` and GraphQL catalog assembly | No real vendor call is allowed/needed; synthetic fetch is safe and deterministic | Vendor-specific live response semantics/profile freshness remain residual risk | Synthetic local endpoint / stubbed fetch; no vendor secret |

## Project Execution Discovery

- Assigned task worktree / workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata`
- Project type and runtime stack: Git monorepo; TypeScript/Node/Vitest (`autobyteus-ts`, `autobyteus-server-ts`), Nuxt/Vue/Vitest (`autobyteus-web`), GraphQL/type-graphql server, optional Electron shell.
- Conflicting, missing, or unclear project instructions: No conflicting instructions found. The worktree has no local `node_modules` or `.bin` executables, so dependency installation is required before execution. Do not use the user's live server-data or credentialed endpoint; create an isolated E2E runtime root.
- Required environment variables or secrets available: No real secret is required. Synthetic values only; do not record them as production credentials or log them. Server E2E uses its documented temp database/runtime bootstrap and restores environment variables.

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/autobyteus-server-ts/AGENTS.md` | Server test authority | Use `pnpm -C autobyteus-server-ts exec vitest run <file> --no-watch`; integration tests are separately scoped. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/autobyteus-web/AGENTS.md` | Web test authority | Use `pnpm test:nuxt ... --run`; use colocated Nuxt/Vue tests; browser is not imposed for backend-local changes. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/autobyteus-ts/package.json` | TS build/dependency authority | Build uses `tsc -p tsconfig.build.json`; no package test script, so invoke workspace Vitest through `pnpm exec`. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/autobyteus-server-ts/package.json` | Server build/test authority | `typecheck`, `build`, and `test` scripts; server test setup uses Prisma temp DB/global setup. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/autobyteus-web/package.json` | Web build/test authority | `test:nuxt` invokes Vitest; always pass `--run`. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/autobyteus-ts/vitest.config.ts` | TS test config | Node environment, `tests/setup.ts`, 20s timeout, excludes tickets/tmp. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/autobyteus-server-ts/vitest.config.ts` | Server test config | Fork pool, serial files, Prisma setup/global setup; E2E test files are included. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/autobyteus-web/vitest.config.mts` | Web test config | Nuxt/happy-dom environment and localization/websocket setup. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/README.md` | Repository build/test overview | Root helper commands exist; package-local documented commands are preferred for focused checks. |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Workspace dependencies | Worktree root | `corepack pnpm install --frozen-lockfile` (or repository-supported equivalent if Corepack is unavailable) | Installs temporary dependency state only; no source/test artifact change | `pnpm -C autobyteus-ts exec vitest --version`, server/web equivalent | Remove only install artifacts if they were created solely for this run; do not alter tracked files |
| TS focused tests/build | `autobyteus-ts` | `pnpm exec vitest run ... --no-watch`; `pnpm exec tsc -p tsconfig.build.json --noEmit` | Node/Vitest; no service | command exits 0 | No process |
| Server focused unit/E2E | `autobyteus-server-ts` | `pnpm exec vitest run ... --no-watch`; server E2E uses its existing `test-support/live-e2e/test-runtime-bootstrap.mjs` | Temp Prisma DB/runtime root owned by test | Vitest setup/global setup succeeds | Test `afterAll` plus `removeOwnedTestRuntime`; verify temp root absent |
| Web focused renderer | `autobyteus-web` | `pnpm test:nuxt <spec> --run` | Nuxt/happy-dom; no backend | Vitest exits 0 | No process |
| Browser / Electron | `autobyteus-web` | Not planned initially | No shell-specific change and direct renderer test exercises changed DOM branch | N/A | N/A |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Synthetic `/models` response | `fetchImpl` in TS unit tests; `vi.stubGlobal('fetch')` in server E2E | Use fixed non-secret model rows; assert Authorization is synthetic and never included in model info/log assertions | In-memory only |
| Custom provider record/secret in E2E | GraphQL `createCustomProvider` against isolated app-data and secret vault | Synthetic API key only; no live endpoint; no raw response persistence | GraphQL delete mutation and test runtime cleanup |
| Known/inferred/unknown model rows | Synthetic JSON fixture containing advertised live, exact built-in fallback, profile/alias, and unknown rows | No vendor payload or production model record copy | In-memory/isolated temp DB only |

## Persisted Data Transition Coverage Basis

- Approved decision: `Not Affected`
- Design-spec and implementation-handoff references: `design-spec.md` “Persisted Data / State Transition Decision”; `implementation-handoff.md` “Persisted Data Transition Check”.
- Representative existing-data setup and required behavior: Use the server's isolated temporary app-data root; create a custom provider through the normal GraphQL/service path, then verify the provider record remains the version-2 identity/name/type/base-url shape and that derived metadata is returned only in the in-memory model/catalog projection.
- Evidence planned for the approved outcome: GraphQL create/reload/query/delete with isolated runtime, plus source/unit assertions that `resolved_model_metadata` is projected but not part of custom-provider config. No migration or version-specific runtime fallback is permitted.
- Migration-specific completion/recovery scenarios: `N/A`.
- Upstream ambiguity or reroute required: `None`.

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Acceptance Criteria / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/autobyteus-ts/tests/unit/llm/openai-compatible-endpoint-discovery.test.ts` — alias and duplicate tests | Fixed top-level alias allowlist, positive numeric validation, duplicate rows, per-field fall-through, mixed row shapes | REQ-001/REQ-005; AC-001/AC-002 | Needs Update | Current file covers representative aliases and duplicates, not every alias/failure/security boundary | Add table-driven full alias and synthetic fetch/secret-hygiene cases |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/autobyteus-ts/tests/unit/llm/metadata/openai-compatible-endpoint-model-metadata.test.ts` — resolver suite | Exact Alibaba profile, advertised precedence, near-match, duplicate built-in lowest field, canonicalization, profile reference, DeepSeek wire alias, query/hash refusal | REQ-002/003/010–012; AC-004/012–014; CR-001 | Still Valid | Current focused suite directly exercises the reviewed resolver and rework regression | Re-run unchanged; add no redundant resolver path unless execution finds a gap |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/autobyteus-ts/tests/unit/llm/openai-compatible-endpoint-provider.test.ts` — ready/error/stale/profile/factory tests | Custom model construction, profile value, stale last-known-good, error status, factory authentication | REQ-004/005/008; AC-007/009/010 | Needs Update | Stale/error and profile model are valid; runtime token-budget and source projection are not asserted | Add known/unknown budget and direct source-bearing `ModelInfo` assertions |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/autobyteus-ts/tests/unit/llm/models.test.ts` — custom projection | Custom identifier/provider/host and unknown resolved metadata construction | REQ-006/009; AC-011 | Needs Update | Does not assert `resolved_model_metadata` survives `toModelInfo` | Extend existing custom model assertion with non-secret source-bearing fields |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/autobyteus-ts/tests/unit/llm/metadata/model-metadata-resolver.test.ts` — ordinary built-in provider resolver | Existing live/static/unknown strategies, timeout/failure, invalid values, `models/` lookup | Existing built-in behavior; AC-008 | Still Valid / Out Of Scope for custom fallback | This task must not remove the general built-in provider lookup policy; exact custom fallback is a separate index | Re-run unchanged; do not delete `models/` coverage |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/autobyteus-ts/tests/unit/agent/token-budget.test.ts` — shared budget | Existing override, context/input caps, reservation, null behavior | REQ-004; AC-009/010 | Still Valid but incomplete | Tests prove algorithm policy, not custom model fields reaching it | Add custom-model construction integration case in provider-focused file or a narrow new test |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/autobyteus-server-ts/tests/unit/llm-management/model-metadata-provisioning-service.test.ts` — source/value preservation | Profile source and values survive server enrichment; built-in live/static/fallback behavior | REQ-006/009; AC-003/008/011 | Needs Update | Existing custom profile case is valid but live/inferred/unknown coarse distinctions and no-secret projection are not all explicit | Add source-matrix assertions, keeping built-in cases unchanged |
| `/Users/normy/autobyteus_org/autobyteus-server-ts/tests/e2e/llm-management/model-metadata-provenance-graphql.e2e.test.ts` — assembled GraphQL provenance | Real schema and GraphQL projection for LIVE/CURATED_FALLBACK/CURATED_ONLY Gemini modes | REQ-006/009; AC-008/011 | Still Valid | Direct GraphQL mapping evidence exists for the public enum, but not custom provider live/inferred/unknown rows | Re-run; add a separate synthetic custom-provider GraphQL E2E rather than weakening this Gemini coverage |
| `/Users/normy/autobyteus_org/autobyteus-web/components/workspace/usage/__tests__/TokenUsageMeterPanel.spec.ts` — known/unknown UI | Existing known-capacity progress display and explicit unknown-capacity prompt state | REQ-007; AC-005/006 | Still Valid | Current component renderer directly asserts prompt, unavailable copy, no bar, no fake denominator | Re-run unchanged |
| `/Users/normy/autobyteus_org/autobyteus-web/stores/__tests__/tokenUsageMeterStore.spec.ts` — usage source state | Live/hydrated usage aggregation and known/unknown token fields | AC-005/006/008 | Still Valid / adjacent | Store retains null/known fields; component owns presentation | Re-run targeted only if renderer/store contract changes |
| `/Users/normy/autobyteus_org/autobyteus-server-ts/tests/unit/llm-management/llm-providers/llm-provider-service.test.ts` and custom runtime sync tests | Provider create/probe credentials and stale/status handling | REQ-005/008; AC-007 | Still Valid / adjacent | Existing synthetic credential tests cover service boundary, but not metadata content | Re-run targeted if E2E reveals service regression |

## Stale Or Obsolete Coverage Decisions

No existing coverage is stale or slated for removal. The ordinary `ModelMetadataResolver` `models/`/canonical lookup tests are not redundant with the new exact custom fallback index and must remain. No compatibility-only path is being preserved.

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Requirement / Acceptance Criteria / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| COV-001 | Full advertised alias allowlist, invalid types, nested/unrelated rejection, duplicate independent fall-through | REQ-001/005; AC-001/002 | `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/autobyteus-ts/tests/unit/llm/openai-compatible-endpoint-discovery.test.ts` | Contract is reusable for all compatible gateways and prevents silent metadata regression |
| COV-002 | Synthetic `/models` request preserves valid model output and does not expose auth/raw payload | REQ-005; AC-007 | Same discovery test file | Security/resilience boundary is repository-resident and deterministic; no real secret or vendor request needed |
| COV-003 | Custom model source-bearing `ModelInfo` projection and known/unknown runtime budget/override | REQ-004/006/009; AC-009–011 | `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/autobyteus-ts/tests/unit/llm/openai-compatible-endpoint-provider.test.ts` and/or `models.test.ts` | Proves metadata reaches the existing runtime owner, not just the pure resolver |
| COV-004 | Server source matrix and coarse provenance for live/profile/inferred/unknown fields | REQ-006/009; AC-003/011 | `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/autobyteus-server-ts/tests/unit/llm-management/model-metadata-provisioning-service.test.ts` | Protects cross-package source truth and server merge behavior |
| COV-005 | Normal-path custom provider `/models` -> model registry -> server GraphQL catalog with advertised, inferred/profile, and unknown rows | REQ-003–009; AC-003/007/008/011 | New `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/autobyteus-server-ts/tests/e2e/llm-management/custom-provider-model-metadata-graphql.e2e.test.ts` | Only an isolated real schema/provider path can prove API/catalog assembly and cleanup together |

## Durable Coverage To Update

| Scenario ID | Existing Path / Scenario | Required Update | Requirement / Acceptance Criteria / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| COV-001 | Discovery tests | Add full alias matrix and fetch boundary | AC-001/002/007 | Keep current representative tests and expand only the missing contract cases |
| COV-003 | Provider/model tests | Assert source-bearing `toModelInfo`, known budget, unknown null budget, explicit override | AC-009/010/011 | No source implementation change planned |
| COV-004 | Server provisioning unit | Assert independent source preservation and coarse mapping | AC-003/011 | Existing Gemini cases remain unchanged |

## Durable Coverage To Remove

None planned.

## Repository Coverage Execution Plan And Results

The investigation preceded all durable coverage edits and final execution. The final repository plan and evidence are recorded below; the temporary setup corrections are environment-only and did not alter production source.

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| 1 | `corepack pnpm install --frozen-lockfile` | Worktree root | Dependency/setup readiness | Pass | `/tmp/custom-provider-metadata-install.log` (terminal evidence) |
| 2 | `corepack pnpm -C autobyteus-server-ts exec prisma generate --schema ./prisma/schema.prisma` | Worktree root | Generated Prisma client required by server tests | Pass | `/tmp/custom-provider-metadata-prisma-generate.log` |
| 3 | `corepack pnpm -C autobyteus-ts exec vitest run tests/unit/llm/metadata tests/unit/llm/openai-compatible-endpoint-discovery.test.ts tests/unit/llm/openai-compatible-endpoint-provider.test.ts tests/unit/llm/models.test.ts tests/unit/llm/supported-model-definitions.test.ts tests/unit/agent/token-budget.test.ts --no-watch` | `autobyteus-ts` | COV-001/COV-003; 8 files / 49 tests | Pass | `/tmp/custom-provider-metadata-ts-affected-final.log` |
| 4 | `corepack pnpm -C autobyteus-ts exec tsc -p tsconfig.build.json --noEmit` | `autobyteus-ts` | Cross-file TS contract | Pass | `/tmp/custom-provider-metadata-ts-tsc-final.log` |
| 5 | `corepack pnpm -C autobyteus-server-ts exec vitest run tests/unit/llm-management/model-metadata-provisioning-service.test.ts tests/unit/llm-management/services/model-catalog-service.test.ts tests/unit/llm-management/llm-providers/llm-provider-service.test.ts tests/unit/llm-management/providers/autobyteus-llm-model-provider.test.ts --no-watch` | `autobyteus-server-ts` | COV-004 and adjacent catalog/provider behavior; 4 files / 27 tests | Pass | `/tmp/custom-provider-metadata-server-affected.log` |
| 6 | `corepack pnpm -C autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit` | `autobyteus-server-ts` | Cross-package server contract | Pass | `/tmp/custom-provider-metadata-server-tsc-correct.log` |
| 7 | `corepack pnpm -C autobyteus-web exec nuxt prepare` | `autobyteus-web` | Generated Nuxt config prerequisite | Pass | Terminal evidence |
| 8 | `corepack pnpm -C autobyteus-web test:nuxt components/workspace/usage/__tests__/TokenUsageMeterPanel.spec.ts --run` | `autobyteus-web` | COV-007; 9 token-meter tests | Pass | `/tmp/custom-provider-metadata-web-token-meter-2.log` |
| 9 | `corepack pnpm -C autobyteus-server build` | `autobyteus-server-ts` | Built server required by E2E bootstrap | Pass | `/tmp/custom-provider-metadata-server-build.log` |
| 10 | `corepack pnpm -C autobyteus-server-ts exec vitest run tests/e2e/llm-management/custom-provider-model-metadata-graphql.e2e.test.ts --no-watch` | `autobyteus-server-ts` | COV-005; 3 isolated custom GraphQL E2E tests | Pass | `/tmp/custom-provider-metadata-custom-graphql-e2e-2.log` |
| 11 | `corepack pnpm -C autobyteus-server-ts exec vitest run tests/e2e/llm-management/model-metadata-provenance-graphql.e2e.test.ts --no-watch` | `autobyteus-server-ts` | COV-006; 4 existing GraphQL provenance tests | Pass | `/tmp/custom-provider-metadata-existing-graphql-e2e.log` |
| 12 | `corepack pnpm -C autobyteus-web run guard:localization-boundary && corepack pnpm -C autobyteus-web run audit:localization-literals && corepack pnpm -C autobyteus-web run guard:web-boundary` | `autobyteus-web` | Localization and web boundary constraints | Pass | `/tmp/custom-provider-metadata-web-guards.log` |
| 13 | `git diff --check` plus untracked-file whitespace checks | Worktree root | Durable test/report hygiene | Pass | Terminal evidence |

Execution setup deviations were resolved before final results: the first server test invocation required Prisma generation; the first web test invocation required Nuxt preparation; the first new discovery test invocation required a missing `vi` import fix; and the timeout assertion was adjusted to attach rejection handling before advancing fake timers. No implementation failure or coverage reroute resulted.

## Post-Repository Confidence Scorecard (Mandatory)

Scores below are evidence-backed after the final focused repository checks and isolated E2E execution. The final score is unchanged after broader validation because the planned synthetic GraphQL E2E completed the remaining material confidence gap without introducing a new risk.

| Confidence Category | Score | What Supports The Score | Remaining Uncertainty | Additional Validation That Could Improve It |
| --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 92% | Post-repository unit/server/UI evidence covered the contract; isolated GraphQL E2E then proved the complete custom catalog path. | Real vendor enforcement/profile freshness is outside safe repository scope. | Revalidate source-dated vendor profile when vendor behavior changes. |
| Changed-boundary execution directness | 95% | Focused tests directly exercised discovery/resolver/model/budget/server/UI; E2E added the normal custom-provider path. | No real external vendor request. | A controlled vendor contract test would be additional evidence only if safely available. |
| Cross-boundary integration realism and mock gap | 82% | Before E2E, catalog/API assembly was unit-only; E2E then used the real GraphQL schema, custom store, secret vault, registry, catalog, and enrichment. | Real HTTP/TLS/provider payload variation is not exercised. | Safe provider contract fixture or staging endpoint. |
| Environment, configuration, identity, and fixture fidelity | 92% | Unit setup was valid; isolated E2E then exercised documented temp DB/app-data/secret-vault bootstrap and synthetic identity. | No production identity or vendor credential was used by design. | None needed for this change. |
| Failure, edge-case, lifecycle, and recovery evidence | 93% | Focused checks covered invalidity, timeout, HTTP error, unknown/query/hash/near-match; E2E added stale reload and cleanup/delete. | Full process restart with pre-existing custom configuration was not needed for `Not Affected`. | Restart probe only if persisted-data scope changes. |
| User-surface, browser, and desktop-shell confidence | 94% | Real `TokenUsageMeterPanel` Nuxt/happy-dom mount covers known and unknown DOM states; no Electron/preload/IPC boundary changed. | No full browser session or Electron package run. | Browser/Electron only if routing, browser APIs, or shell code changes. |
| Durable regression coverage quality and relevance | 96% | Added/updated tests are colocated, deterministic, synthetic, narrow, requirement-linked, and all pass; no stale coverage removed. | Proportional test-code review remains required. | `code_reviewer` proportional test review. |

- Overall post-repository confidence: `92.0%`
- Calculation method: Simple average `(92 + 95 + 82 + 92 + 93 + 94 + 96) / 7 = 92.0%`; final after broader validation is `95.3%`.
- Every critical acceptance criterion directly proven: `No — custom API/catalog seam was pending at the post-repository gate; final result is Yes after COV-005 E2E.`
- Any applicable category below 90%: `Yes — cross-boundary integration realism was 82% before broader validation; it rose to 94% after COV-005.`
- Default clean-confidence target of 95% met: `No` at the post-repository gate; `Yes` in the final execution report after broader validation.
- Material residual risks: Source-dated Alibaba profile facts can become stale; synthetic `/models` does not prove current vendor enforcement; no full browser/Electron shell journey was needed because only a component branch changed.

## Broader Validation Decision (Mandatory)

- Decision: `Required` — completed as isolated synthetic API/GraphQL E2E.
- Selected execution mode: `Live API` plus `Other` isolated server GraphQL E2E.
- Specific confidence gap or residual risk addressed: Normal custom-provider creation, secret-vault handoff, one-response discovery, registry/catalog reload, source/provenance projection, stale recovery, config hygiene, and derived-model cleanup.
- Why the selected mode materially improved confidence: It exercised the actual provider store, runtime sync, `LLMFactory`, model catalog, server enrichment, and GraphQL schema rather than only pure functions or mocked `ModelInfo` inputs.
- Expected confidence after selected validation: At least 95% if all critical scenarios passed and no category fell below 90%; achieved 95.3%.
- Browser-specific decision and rationale: `Not Required`. The only frontend change is a local Vue branch with no route, browser API, authentication, or client transport change; the real component DOM was mounted by the Nuxt/happy-dom suite.
- If `Not Required`, evidence proving the real changed boundary without broader execution: 9 direct renderer tests cover known and unknown meter states; the broader API/catalog boundary was separately executed through GraphQL E2E.
- If `Blocked`, exact dependency or access that remains unavailable after safe setup/emulation attempts: `N/A`.

## Desktop Application Validation Decision (When Applicable)

- Desktop framework / shell: Electron wrapper exists, but no shell boundary changed.
- Relevant README or development instructions: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/autobyteus-web/AGENTS.md` and `README.md`.
- Web-equivalent behavior: Token meter component only.
- Shell-specific or lifecycle behavior: None introduced.
- Chosen validation approach and why it fits the project: Nuxt/happy-dom component test; no Electron execution.
- Server/frontend setup when browser validation is used: `N/A` initially.
- Effect on any already-running desktop application: `None`.
- Behavior not directly proven and confidence consequence: Electron packaging/preload/IPC remains out of scope and does not reduce confidence for this change.

## Live Environment And Fixture Plan

- Startup order and commands: No long-running service is required for the synthetic E2E; Vitest uses `test-support/live-e2e/test-runtime-bootstrap.mjs` and builds an isolated schema/runtime. If a service is required by the test harness, use its documented start/stop helpers only.
- Environment choices that materially affect the run: Temporary app-data/database root; blank/disabled unrelated remote provider hosts; no real user server-data; no real custom endpoint; synthetic `fetch` response only.
- Health / readiness checks: Dependency binary checks, Vitest setup/global setup, schema build, and test bootstrap completion.
- Seed data / fixtures: Synthetic custom provider created via normal GraphQL mutation and one deterministic `/models` payload with live, inferred/profile, and unknown rows.
- Test identities, authentication, permissions, or session state: Synthetic API key stored only in isolated secret vault; no user identity or permissions beyond normal local test path.
- Requirement-linked journeys or scenarios: COV-002 through COV-005; provider create -> discovery -> catalog query -> source/provenance assertions -> reload/unknown/stale behavior -> delete.
- DOM, screenshot, log, API, process, or other evidence to capture: Vitest stdout, GraphQL result assertions, discovery fetch call count/headers, isolated config file shape, and cleanup verification. Do not retain raw provider response or secret values.
- Owned processes and temporary state to clean up: Vitest child processes, temp DB/runtime directory, temp provider config, secret-vault entries, and generated test output owned by this run.

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| TMP-001 | If needed, a one-off Node/Vitest probe around a synthetic fetch response and `resolveTokenBudget` | Quick diagnosis of dependency/setup or model-to-budget seam before durable test edits | Only use for diagnosis; the durable contract belongs in colocated tests |
| TMP-002 | Optional isolated GraphQL query inspection if the new E2E fixture cannot be made deterministic | Identifies schema/provider wiring without persisting an ad-hoc script | The normal path is appropriate for durable E2E once stable |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Real Alibaba/vendor API and current documentation semantics | Real credential and external vendor dependency are not safe or reproducible; profile facts are source-dated | Vendor may change model fields/limits; synthetic test proves our contract, not vendor truth | Delivery retains profile freshness risk; no secret-bearing probe |
| Electron packaging/preload/IPC | No shell code changed | None material to metadata/catalog/UI branch | No follow-up unless implementation scope changes |
| Distributed workers/queues | No affected boundary | None | No follow-up |
| Full browser workspace journey | Direct component renderer coverage is sufficient for current branch; no route/client change | Small residual integration/rendering risk | Reconsider only if Nuxt renderer tests fail or app wiring changes |

## Ambiguities Or Reroute Triggers

| Issue | Classification | Evidence | Recommended Recipient |
| --- | --- | --- | --- |
| None identified before execution | `N/A` | Requirements, design, implementation handoff, and CRR-002 agree on exact precedence and non-profile-addressable query/hash behavior | `N/A` |
| Any test failure with implementation-origin behavior, wrong source/precedence, or contract mismatch | Preliminary `Unclear` until source review | Coverage execution report will include exact scenario, command, expected/observed result, and logs | `code_reviewer` for failure-origin review |
| Any durable test addition/update/removal after this investigation | Workflow trigger, not a defect | Team rule requires cumulative package plus coverage/execution report to return through code review | `code_reviewer` after execution |

## Rerun Update — API-REV-002 / TR-001

- Trigger: `code_reviewer` CRR-003 proportional durable-test review found `TR-001` in the cleanup E2E: the delete mutation's `true` result did not prove provider/catalog absence or derived-model removal.
- Prior result reviewed: `API-REV-001` execution `Pass` / `95.3%`; no implementation-source reroute is needed and CRR-002 remains `Pass`.
- Coverage decision: COV-005 remains valid, but its post-delete observable evidence is insufficient. Update only `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/autobyteus-server-ts/tests/e2e/llm-management/custom-provider-model-metadata-graphql.e2e.test.ts` to query the normal provider/catalog surface after deletion and assert the created provider and all three derived model values are absent. Retain existing isolated config/secret hygiene and runtime cleanup.
- Rerun plan: Re-execute the affected custom GraphQL E2E, rerun the server affected unit/type/build checks needed for the changed durable test, refresh the execution report and append `API-REV-002`, then return the cumulative package through proportional code review.
- Reroute required before rerun: `No`; classification is `Local Fix` owned by `api_e2e_engineer`.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes — API-REV-002 rerun complete`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes — COV-001 through COV-005 added/updated; no removals`
- Post-repository confidence: `92.0%`; final confidence remains `95.3%`
- Broader validation decision: `Required — completed via isolated synthetic API/GraphQL E2E`
- Reroute Required Before Validation Execution: `No`
- Recommended Recipient If Reroute Required: `N/A`
- Notes: API-REV-002 resolved CRR-003 finding TR-001 with a supported post-delete provider/catalog query. Existing relevant coverage remains valid and no stale tests were removed. The updated durable coverage, this investigation, the execution report, and the revision record must return through `code_reviewer` for CRR-004 before delivery.
