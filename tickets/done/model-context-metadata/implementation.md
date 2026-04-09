# Implementation

## Scope Classification

- Classification: `Medium`
- Reasoning:
  - the change spans shared contract, provider discovery, metadata resolver selection, curated metadata, server projection, frontend consumption, and tests
  - the requirement-gap re-entry changed the architecture, so implementation must now preserve earlier useful work while re-centering on the resolver design

## Upstream Artifacts (Required)

- Workflow state: `tickets/in-progress/model-context-metadata/workflow-state.md`
- Investigation notes: `tickets/in-progress/model-context-metadata/investigation-notes.md`
- Requirements: `tickets/in-progress/model-context-metadata/requirements.md`
  - Current Status: `Refined`
- Runtime call stacks: `tickets/in-progress/model-context-metadata/future-state-runtime-call-stack.md`
- Future-state runtime call stack review: `tickets/in-progress/model-context-metadata/future-state-runtime-call-stack-review.md`
- Proposed design (required for `Medium/Large`): `tickets/in-progress/model-context-metadata/proposed-design.md`

## Document Status

- Current Status: `In Execution`
- Notes:
  - Stage 6 was reopened after a `Requirement Gap` re-entry
  - code edits were relocked for the latest-only cloud support-policy re-entry and will be unlocked again once the refreshed design/runtime artifacts are recorded
  - earlier Stage 6 work on shared contract, local runtimes, and projections remains reusable, but the registry/resolver architecture now also requires a current cloud-model registry refresh
  - Stage 6 is reopened again as a `Local Fix` because the Gemini supported-model entries were left on `2.5` even though the ticket's latest-only policy now requires the current Gemini 3 text model IDs
  - Stage 6 is reopened once more as a `Local Fix` after the independent review found two availability regressions in the new metadata/runtime enrichment paths

## Plan Baseline (Freeze Until Replanning)

### Preconditions (Must Be True Before Finalizing The Baseline)

- `requirements.md` is at least `Design-ready` (`Refined` allowed): `Yes`
- Acceptance criteria use stable IDs (`AC-*`) with measurable expected outcomes: `Yes`
- `workflow-state.md` is current and Stage 5 review-gate evidence is recorded: `Yes`
- Runtime call stack review artifact exists and is current: `Yes`
- All in-scope use cases reviewed: `Yes`
- No unresolved blocking findings: `Yes`
- Future-state runtime call stack review has `Go Confirmed` with two consecutive clean deep-review rounds (no blockers, no required persisted artifact updates, no newly discovered use cases): `Yes`
- Missing-use-case discovery sweeps completed for the final two clean rounds: `Yes`
- No newly discovered use cases in the final two clean rounds: `Yes`

### Solution Sketch

- Use Cases In Scope:
  - `UC-001` supported-model registry metadata propagation
  - `UC-002` LM Studio native discovery
  - `UC-003` Ollama supported/active context discovery
  - `UC-005` supported cloud model uses live metadata resolver
  - `UC-006` supported cloud model uses curated metadata
  - `UC-007` safe token budgeting with known or unknown metadata
  - `UC-010` latest-only supported cloud-model registry, provider defaults, and hardcoded fixtures stay aligned on current official model IDs
- Spine Inventory In Scope:
  - `DS-001`, `DS-002`, `DS-003`, `DS-004`
- Primary Spine Span Sufficiency Rationale:
  - implementation keeps the span from explicit support policy through metadata-source resolution to downstream consumer/runtime policy, instead of collapsing the work into only local field changes
- Primary Owners / Main Domain Subjects:
  - `LLMModel` / `ModelInfo`
  - supported model registry in `LLMFactory`
  - metadata resolver selector
  - curated metadata source
  - cloud-provider metadata resolvers
  - local runtime providers
  - server GraphQL mapper
  - frontend model-catalog consumer
- Requirement Coverage Guarantee:
  - every requirement maps to one or more implementation tasks and at least one test target
- Target Architecture Shape:
  - explicit normalized metadata fields in the shared contract
  - supported-model registry remains explicit and authoritative for product support
  - provider metadata resolver layer owns token/context sourcing
  - supported cloud-model definitions keep only current official IDs and remove stale/deprecated entries
  - curated metadata is isolated from the registry and used only where provider APIs are too thin
  - no fake universal default ceilings
- API/Behavior Delta:
  - model catalog responses expose normalized token metadata fields
  - local runtime discovery remains richer for LM Studio and Ollama
  - supported cloud models can resolve token metadata dynamically where official APIs allow it
  - thin provider APIs remain truthful through curated metadata or explicit unknowns
  - provider defaults and live/integration fixtures move with the refreshed registry so removed stale IDs cannot survive outside the authoritative support list
- Key Assumptions:
  - provider-specific metadata resolvers can be tested with mocked responses rather than live network dependence
  - the registry can keep product support decisions stable while token metadata resolution moves below it
- Known Risks:
  - provider-specific resolver failures must not degrade catalog availability
  - curated docs-backed values still need explicit refresh discipline for providers without machine-readable metadata
  - existing `LLMFactory` cloud entries must be carefully untangled so support policy remains explicit while token metadata moves out
  - stale model IDs now live in several direct provider/test call sites, so the support-policy refresh must be coordinated rather than limited to one registry file

### Runtime Call Stack Review Gate Summary

| Round | Review Result | Findings Requiring Persisted Updates | New Use Cases Discovered | Persisted Updates Completed | Classification (`Design Impact`/`Requirement Gap`/`Unclear`/`N/A`) | Required Re-Entry Path | Round State (`Reset`/`Candidate Go`/`Go Confirmed`) | Clean Streak After Round |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 3 | Pass | No | No | N/A | `N/A` | `N/A` | `Candidate Go` | 1 |
| 4 | Pass | No | No | N/A | `N/A` | `N/A` | `Go Confirmed` | 2 |

### Go / No-Go Decision

- Decision: `Go`
- Evidence:
  - Final review round: `4`
  - Clean streak at final round: `2`
  - Final review gate line (`Implementation can start`): `Yes`

### Spine-Led Dependency And Sequencing Map

| Order | Spine ID | Owner | Task / File | Depends On | Why This Order |
| --- | --- | --- | --- | --- | --- |
| 1 | `DS-001`, `DS-004` | `LLMModel` / `ModelInfo` | shared contract in `autobyteus-ts/src/llm/models.ts` | N/A | everything else depends on the normalized contract |
| 2 | `DS-003` | `LLMFactory` / supported registry | remove cloud token metadata from registry entries while preserving support allowlisting | `C-001` | the support policy boundary must be explicit before resolver ownership is introduced |
| 3 | `DS-001`, `DS-003` | metadata resolver selector | add `autobyteus-ts/src/llm/metadata/model-metadata-resolver.ts` and curated metadata source | `C-001`, `C-002` | source selection is the authoritative owner for resolver-vs-curated logic |
| 4 | `DS-003` | cloud provider resolvers | add Kimi / Mistral / Gemini metadata resolvers | `C-003` | provider-specific live metadata stays below the selector |
| 5 | `DS-002` | local runtime providers | preserve/adapt LM Studio and Ollama discovery to coexist with the resolver-based architecture | `C-001` | local runtime paths already work but must remain aligned with the normalized contract |
| 6 | `DS-001` | server/frontend consumers | GraphQL mapping, query, store, generated types | `C-001`, `C-003`, `C-004`, `C-005` | consumers should reflect the final contract shape only |
| 7 | `DS-004` | token-budget + tests | safe-budget handling and regression tests | `C-001`, `C-003`, `C-004`, `C-005` | verification closes on final metadata behavior |
| 8 | `DS-003` | supported registry + provider defaults/tests | refresh supported cloud-model IDs, curated keys, defaults, and fixtures together | `C-002`, `C-003`, `C-004`, `C-005` | the latest-only policy must be applied consistently across all hardcoded cloud-model call sites |

### File Placement Plan (Mandatory)

| Item | Current Path | Target Path | Owning Concern / Platform | Action (`Keep`/`Move`/`Split`/`Promote Shared`) | Verification |
| --- | --- | --- | --- | --- | --- |
| shared model metadata contract | `autobyteus-ts/src/llm/models.ts` | same | canonical shared model metadata boundary | `Keep` | confirm server/web consume fields only through `ModelInfo` |
| supported model registry wiring | `autobyteus-ts/src/llm/llm-factory.ts` | same | product support allowlist and registry initialization | `Keep` | confirm it does not remain the owner of resolver-backed token metadata |
| supported model definitions | `autobyteus-ts/src/llm/llm-factory.ts` | `autobyteus-ts/src/llm/supported-model-definitions.ts` | static support policy definitions under Stage 8 size-pressure control | `Split` | confirm support policy stays explicit while token metadata moves below the registry boundary |
| metadata resolver selector | `N/A` | `autobyteus-ts/src/llm/metadata/model-metadata-resolver.ts` | metadata source selection | `Add` | confirm provider-specific API logic stays below this selector |
| curated metadata source | `N/A` | `autobyteus-ts/src/llm/metadata/curated-model-metadata.ts` | docs-backed metadata ownership | `Add` | confirm docs-backed values are isolated from support registry wiring |
| cloud metadata resolvers | `N/A` | `autobyteus-ts/src/llm/metadata/*-model-metadata-provider.ts` | provider-specific API metadata resolution | `Add` | confirm each provider’s API parsing stays in its own file |
| LM Studio discovery | `autobyteus-ts/src/llm/lmstudio-provider.ts` | same | LM Studio runtime adapter | `Keep` | confirm native endpoint parsing remains local to the provider |
| Ollama discovery | `autobyteus-ts/src/llm/ollama-provider.ts` | same | Ollama runtime adapter | `Keep` | confirm detail/runtime parsing remains local to the provider |
| server model projection | `autobyteus-server-ts/src/api/graphql/types/llm-provider.ts` | same | GraphQL projection | `Keep` | confirm no provider logic leaks into server mapping |
| frontend catalog consumer | `autobyteus-web/stores/llmProviderConfig.ts` | same | UI/runtime model catalog state | `Keep` | confirm store remains a pure consumer |

### Implementation Work Table (Primary Tracker)

| Change ID | Spine ID(s) | Owner | Concern | Current Path | Target Path | Action (`Create`/`Modify`/`Move`/`Split`/`Remove`) | Depends On | Implementation Status (`Planned`/`In Progress`/`Completed`/`Blocked`) | Unit Test File | Unit Test Status (`Planned`/`Passed`/`Failed`/`N/A`) | Integration Test File | Integration Test Status (`Planned`/`Passed`/`Failed`/`N/A`) | Stage 8 Review Status (`Planned`/`Passed`/`Failed`/`N/A`) | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `C-001` | `DS-001`, `DS-004` | `LLMModel` / `ModelInfo` | normalized metadata fields and truthful unknowns | `autobyteus-ts/src/llm/models.ts` | same | Modify | N/A | Completed | `autobyteus-ts/tests/integration/llm/models.test.ts` | Passed | `autobyteus-ts/tests/unit/agent/token-budget.test.ts` | Passed | Planned | reusable from the earlier Stage 6 pass |
| `C-002` | `DS-001`, `DS-003` | `LLMFactory` | keep support allowlisting explicit while removing resolver-backed token metadata from registry definitions | `autobyteus-ts/src/llm/llm-factory.ts` | `autobyteus-ts/src/llm/llm-factory.ts`, `autobyteus-ts/src/llm/supported-model-definitions.ts` | Modify | `C-001` | Completed | `autobyteus-ts/tests/integration/llm/llm-factory-metadata-resolution.test.ts` | Passed | `autobyteus-ts/tests/integration/llm/llm-reloading.test.ts` | Passed | Planned | extracted static definitions to keep `llm-factory.ts` under size pressure while preserving explicit support ownership |
| `C-003` | `DS-001`, `DS-003` | metadata resolver selector | choose resolver-vs-curated source for one supported model | `N/A` | `autobyteus-ts/src/llm/metadata/model-metadata-resolver.ts` | Create | `C-001`, `C-002` | Completed | `autobyteus-ts/tests/unit/llm/metadata/model-metadata-resolver.test.ts` | Passed | `autobyteus-ts/tests/integration/llm/llm-factory-metadata-resolution.test.ts` | Passed | Planned | resolver caches provider lookups and merges live metadata over curated fallbacks |
| `C-004` | `DS-003` | curated metadata source | docs-backed OpenAI / DeepSeek / Anthropic metadata and explicit unknowns | `N/A` | `autobyteus-ts/src/llm/metadata/curated-model-metadata.ts` | Create | `C-003` | Completed | `autobyteus-ts/tests/unit/llm/metadata/model-metadata-resolver.test.ts` | Passed | `autobyteus-ts/tests/integration/llm/llm-factory-metadata-resolution.test.ts` | Passed | Planned | curated metadata now covers docs-backed or fallback values without leaving token limits inline in the registry |
| `C-005` | `DS-003` | cloud provider resolvers | fetch and normalize Kimi / Mistral / Gemini metadata from official APIs | `N/A` | `autobyteus-ts/src/llm/metadata/kimi-model-metadata-provider.ts`, `autobyteus-ts/src/llm/metadata/mistral-model-metadata-provider.ts`, `autobyteus-ts/src/llm/metadata/gemini-model-metadata-provider.ts` | Create | `C-003` | Completed | `autobyteus-ts/tests/unit/llm/metadata/model-metadata-resolver.test.ts` | Passed | `autobyteus-ts/tests/integration/llm/llm-factory-metadata-resolution.test.ts` | Passed | Planned | live metadata fetch failures degrade to curated or truthful unknown metadata rather than dropping support |
| `C-006` | `DS-002` | runtime providers | preserve LM Studio and Ollama discovery under the normalized contract | `autobyteus-ts/src/llm/lmstudio-provider.ts`, `autobyteus-ts/src/llm/ollama-provider.ts` | same | Modify | `C-001` | Completed | `autobyteus-ts/tests/unit/llm/lmstudio-provider.test.ts`, `autobyteus-ts/tests/unit/llm/ollama-provider.test.ts` | Passed | `autobyteus-ts/tests/integration/llm/llm-reloading.test.ts` | Passed | Planned | reusable from the earlier Stage 6 pass |
| `C-007` | `DS-001` | server/frontend consumers | GraphQL/query/store/generated-type propagation | `autobyteus-server-ts/src/api/graphql/types/llm-provider.ts`, `autobyteus-web/graphql/queries/llm_provider_queries.ts`, `autobyteus-web/stores/llmProviderConfig.ts`, generated files | same | Modify | `C-001`, `C-003`, `C-004`, `C-005` | Completed | `autobyteus-server-ts/tests/unit/api/graphql/types/llm-provider.test.ts`, `autobyteus-web/tests/stores/llmProviderConfigStore.test.ts` | Passed | `N/A` | N/A | Planned | reusable from the earlier Stage 6 pass |
| `C-008` | `DS-004` | token-budget/tests | safe behavior with known or unknown metadata | `autobyteus-ts/src/agent/token-budget.ts` and related tests | same | Modify | `C-001`, `C-003`, `C-004`, `C-005` | Completed | `autobyteus-ts/tests/unit/agent/token-budget.test.ts` | Passed | `N/A` | N/A | Planned | runtime logic already degrades safely; final pass must revalidate after resolver work lands |
| `C-009` | `DS-003` | supported-model registry | latest-only current cloud-model definitions, curated metadata keys, and resolver lookup alignment | `autobyteus-ts/src/llm/supported-model-definitions.ts`, `autobyteus-ts/src/llm/metadata/curated-model-metadata.ts`, related metadata tests | same | Modify | `C-002`, `C-003`, `C-004`, `C-005` | Planned | `autobyteus-ts/tests/unit/llm/metadata/model-metadata-resolver.test.ts` | Planned | `autobyteus-ts/tests/integration/llm/llm-factory-metadata-resolution.test.ts` | Planned | Planned | remove stale cloud IDs and align curated metadata to the refreshed supported set |
| `C-010` | `DS-003` | provider wrappers + fixtures | refresh direct provider defaults, runtime mappings, and hardcoded live/integration model fixtures | `autobyteus-ts/src/llm/api/*.ts`, `autobyteus-ts/src/utils/gemini-model-mapping.ts`, impacted tests, related web/server fixtures | same | Modify | `C-009` | Planned | provider-specific test files | Planned | impacted live/integration tests | Planned | Planned | keeps removed stale IDs from surviving outside the authoritative supported-model registry |

### Requirement, Spine, And Design Traceability

| Requirement | Acceptance Criteria ID(s) | Spine ID(s) | Design Section | Use Case / Call Stack | Planned Task ID(s) | Stage 6 Verification (Unit/Integration) | Stage 7 Scenario ID(s) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `R-001` | `AC-001`, `AC-002` | `DS-001`, `DS-004` | `Summary`, `Final File Responsibility Mapping` | `UC-001`, `UC-007` | `C-001`, `C-007`, `C-008` | Unit + Integration | `AV-001`, `AV-006` |
| `R-003` | `AC-003` | `DS-002` | `Change Inventory`, `UC-002` | `UC-002` | `C-006` | Unit + Integration | `AV-002` |
| `R-004` | `AC-004` | `DS-002` | `Change Inventory`, `UC-003` | `UC-003` | `C-006` | Unit + Integration | `AV-003` |
| `R-005` | `AC-006` | `DS-001`, `DS-003` | `Summary`, `Ownership Map` | `UC-001`, `UC-005`, `UC-006` | `C-002`, `C-003` | Unit + Integration | `AV-001`, `AV-004`, `AV-005` |
| `R-006` | `AC-007`, `AC-008` | `DS-003` | `Change Inventory`, `Derived Implementation Mapping` | `UC-005` | `C-003`, `C-005` | Unit + Integration | `AV-004` |
| `R-007` | `AC-007`, `AC-009` | `DS-003` | `Change Inventory`, `Removal / Decommission Plan` | `UC-006` | `C-003`, `C-004` | Unit + Integration | `AV-005` |
| `R-008` | `AC-005` | `DS-001` | `Final File Responsibility Mapping` | `UC-001` | `C-007` | Unit | `AV-001` |
| `R-009` | `AC-010` | `DS-004` | `DS-004`, `UC-007` | `UC-007` | `C-008` | Unit | `AV-006` |
| `R-010` | `AC-011` | `DS-001`, `DS-002`, `DS-003`, `DS-004` | `Change Inventory` | `UC-001`, `UC-002`, `UC-003`, `UC-005`, `UC-006`, `UC-007` | `C-001`..`C-008` | Unit + Integration | `AV-001`..`AV-006` |
| `R-011` | `AC-012`, `AC-013` | `DS-003` | `Summary`, `UC-010` | `UC-010` | `C-009`, `C-010` | Unit + Integration | `AV-004`, `AV-005`, `AV-007` |

### Step-By-Step Plan

1. Preserve the shared contract and local runtime improvements already in place.
2. Refactor `LLMFactory` so support allowlisting stays explicit but cloud token metadata stops living there where resolvers can own it.
3. Add the metadata resolver selector and curated metadata source.
4. Add Kimi, Mistral, and Gemini metadata resolvers with mocked-test coverage.
5. Revalidate server/web projections and token budgeting against the resolver-backed architecture.
6. Refresh supported cloud-model definitions, curated metadata keys, provider defaults, and stale hardcoded fixtures to current official IDs.
7. Run targeted tests, then proceed into Stage 7 validation.

### Backward-Compat And Decoupling Guardrails (Mandatory)

- Backward-compatibility mechanisms introduced: `None`
- Legacy code retained for old behavior: `No`
- Dead/obsolete code or unused helpers/tests/flags/adapters left in scope: `No`
- Shared data structures remain tight (no kitchen-sink base or overlapping parallel shapes introduced): `Yes`
- Shared design/common-practice rules reapplied during implementation (and any file-level design weakness routed as `Design Impact` when needed): `Yes`
- Spine Span Sufficiency preserved (implementation still follows a global enough primary spine, not only a local touched path): `Yes`
- Authoritative Boundary Rule preserved (no boundary bypass / no mixed-level dependency): `Yes`
- Decoupling impact assessment completed: `Yes`
- New tight coupling or cyclic dependency introduced: `No`
- Changed source implementation files kept within proactive size-pressure guardrails (`>500` avoided; `>220` pressure assessed/acted on): `Yes`

## Execution Tracking

### Progress Log

- 2026-04-09: Initial Stage 6 work completed shared contract expansion, LM Studio/Ollama runtime metadata discovery, server/frontend projection, and baseline tests.
- 2026-04-09: Requirement-gap re-entry reset the plan around explicit support registry ownership plus metadata resolver selection for supported cloud models.
- 2026-04-09: Stage 5 re-review re-confirmed the resolver-based design and reopened Stage 6 with code edits unlocked.
- 2026-04-09: Implemented resolver-backed metadata sourcing for supported cloud models, split static support definitions out of `llm-factory.ts` for size-pressure control, added curated and live provider metadata sources, and revalidated `autobyteus-ts`, `autobyteus-server-ts`, and `autobyteus-web` targeted tests plus `autobyteus-ts` build.
- 2026-04-09: A second requirement-gap re-entry expanded the ticket to include a latest-only supported cloud-model policy; upstream artifacts now record the registry refresh plus coordinated provider-default/fixture cleanup before further code edits resume.
- 2026-04-09: Refreshed the supported cloud model registry to current provider IDs, updated provider defaults and fixtures, added Anthropic live metadata resolution plus curated fallback coverage, reran current-round Stage 7 executable validation, and closed Stage 8 review with no remaining findings after correcting the GLM endpoint.
- 2026-04-09: Post-review user feedback identified that Gemini text support still points at `gemini-2.5-pro` and `gemini-2.5-flash`; official Google docs now position `gemini-3.1-pro-preview` and `gemini-3-flash-preview` as the current Gemini 3 text models, so Stage 6 reopened for a targeted local fix and validation rerun.
- 2026-04-09: Completed the Gemini local fix by replacing the stale Gemini text model IDs with `gemini-3.1-pro-preview` and `gemini-3-flash-preview`, aligning the Gemini adapter default/runtime mapping and impacted fixtures, and rerunning the focused Stage 7 validation slice plus `autobyteus-ts` build.
- 2026-04-09: Independent review round three found two local-fix availability regressions: Ollama discovery drops listed models when `/api/show` enrichment fails, and resolver-backed factory initialization can stall on unbounded live cloud metadata fetches. Stage 6 reopened to harden those failure paths and add targeted failure-mode tests.
- 2026-04-09: Completed the availability-hardening local fix by bounding resolver-backed metadata load time during factory initialization, preserving Ollama discovery under `/api/show` enrichment failure, adding targeted failure-mode tests, and rerunning the focused Stage 7 validation slice plus `autobyteus-ts` build.

### Downstream Stage Status Pointers

| Stage | Canonical Artifact | Current Status | Last Updated | Notes |
| --- | --- | --- | --- | --- |
| 7 API/E2E + Executable Validation | `tickets/in-progress/model-context-metadata/api-e2e-testing.md` | `Pass` | 2026-04-09 | authoritative round 3 reran the availability-hardening validation slice and build after the independent-review findings |
| 8 Code Review | `tickets/in-progress/model-context-metadata/code-review.md` | `Pass` | 2026-04-09 | round 4 re-review closed cleanly after the timeout and Ollama-discovery local fixes |
| 9 Docs Sync | `tickets/in-progress/model-context-metadata/docs-sync.md` | `Not Started` | 2026-04-09 | docs impact to be assessed after code lands |
