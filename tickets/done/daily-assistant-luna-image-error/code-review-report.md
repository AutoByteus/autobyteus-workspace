# Code Review Report

## Review Round Meta

- Review entry point: `Implementation Review` (repeat after implementation-owned failure fix)
- Current review round: `5`
- Trigger: `IR-004` implementation-owned rework for `CR-003` after the supported web GraphQL contract regression.
- Prior review round reviewed: `4` (`Fail`, repeat implementation-source review)
- Latest authoritative round: `5`
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/daily-assistant-luna-image-error`
- Branch: `codex/daily-assistant-luna-image-error`
- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/daily-assistant-luna-image-error/tickets/done/daily-assistant-luna-image-error/requirements.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/daily-assistant-luna-image-error/tickets/done/daily-assistant-luna-image-error/investigation-notes.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/daily-assistant-luna-image-error/tickets/done/daily-assistant-luna-image-error/design-spec.md`
- Supplemental artifacts reviewed:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/daily-assistant-luna-image-error/tickets/done/daily-assistant-luna-image-error/runtime-probe-evidence.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/daily-assistant-luna-image-error/tickets/done/daily-assistant-luna-image-error/provider-media-recovery-analysis.md`
- Solution revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/daily-assistant-luna-image-error/tickets/done/daily-assistant-luna-image-error/solution-revision-record.md`
- Design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/daily-assistant-luna-image-error/tickets/done/daily-assistant-luna-image-error/design-review-report.md`
- Architecture review revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/daily-assistant-luna-image-error/tickets/done/daily-assistant-luna-image-error/architecture-review-revision-record.md`
- Implementation handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/daily-assistant-luna-image-error/tickets/done/daily-assistant-luna-image-error/implementation-handoff.md`
- Implementation revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/daily-assistant-luna-image-error/tickets/done/daily-assistant-luna-image-error/implementation-revision-record.md`
- Coverage investigation: `/Users/normy/autobyteus_org/autobyteus-worktrees/daily-assistant-luna-image-error/tickets/done/daily-assistant-luna-image-error/api-e2e-coverage-investigation.md`
- Execution coverage report: `/Users/normy/autobyteus_org/autobyteus-worktrees/daily-assistant-luna-image-error/tickets/done/daily-assistant-luna-image-error/api-e2e-execution-coverage-report.md`
- Failing scenario IDs: Prior `API-REV-002` setup gate retained as history; no new executable scenario failed in this source-review round.
- Exact failing commands / execution mode: Prior `pnpm secrets:import -- --source /Users/normy/.autobyteus/server-data/.env --database-url file:/Users/normy/autobyteus_org/autobyteus-worktrees/daily-assistant-luna-image-error/autobyteus-server-ts/db/test.db --dry-run`; IR-004 validation used `pnpm --filter autobyteus-server-ts build`.
- Failure evidence paths: `/Users/normy/autobyteus_org/autobyteus-worktrees/daily-assistant-luna-image-error/tickets/done/daily-assistant-luna-image-error/api-e2e-live-build.log`; IR-004 build result is recorded in `implementation-handoff.md` and `implementation-revision-record.md`.

## Round History

| Round | Trigger | Prior Unresolved Findings Rechecked | New Findings | Review Decision | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `IR-001` initial implementation handoff after `ARCH-REV-003` | N/A | `CR-001` | Fail | No | Static capability defaults removed supported Gemini audio/video from the outbound request path. |
| 2 | `IR-002` implementation rework for `CR-001` | `CR-001` | None | Pass | Yes | Gemini definitions now explicitly use all-media-supported capabilities; the prior reachable regression is resolved. |
| 3 | `API-REV-002` live-validation extension failure-origin review | None for this setup failure; Round 2 source Pass and CRR-003 test-code Pass remain valid history | `CR-002` | Fail | Yes | The mandatory server build fails on stale shared metadata consumers before importer, server, agent, or provider execution. |
| 4 | `IR-003` implementation rework for `CR-002` | `CR-002` | `CR-003` | Fail | Yes | Server build compatibility is restored, but the fix removes a GraphQL field still requested by the supported web model-catalog path. |
| 5 | `IR-004` implementation rework for `CR-003` | `CR-003` | None | Pass | Yes | The existing nullable GraphQL provenance contract is restored through a server-local presentation enum/mapping; shared ModelInfo and resolver authority remain unchanged. |

## Review Scope

- Rounds 1–2 completed the implementation-source review; Round 3 classified the API/E2E failure; Round 4 rechecked IR-003 and found `CR-003`; Round 5 rechecks IR-004 and the affected cross-package GraphQL/model metadata contracts without repeating unaffected source audit work.
- Rechecked `CR-003` resolution against the approved contract, current server behavior, and the existing web query, generated client, docs, and E2E contract witnesses.
- The Round 2 implementation rework delta was bounded to `supported-model-static-metadata.ts` and the three Gemini entries in `supported-model-definitions.ts`; this round additionally inspects the server consumers exposed by the failed build.
- Reviewed the changed/new TypeScript and Electron browser source listed in the handoff, including the request assembler and LlmPhase spine, media conversion/renderers, capability/static catalog/resolver/factory path, recovery boundary, ReadMediaFile, and browser screenshot boundaries.
- Reviewed the removal of `autobyteus-ts/src/llm/metadata/curated-model-metadata.ts` for cleanup and authority replacement.
- The separate proportional durable-test review is recorded in `api-e2e-test-review-report.md` and CRR-003; this source-review round does not reopen its passed scope.
- Reviewer verification: `git diff --check HEAD --` passed.
- Round 2 implementation-scoped checks, the API-REV-002 failure, and IR-003's server-only pass are retained as historical evidence. IR-004's server build passed after shared-package preparation, Prisma generation, server compilation, asset copy, and bootstrap smoke; source inspection confirms the existing web GraphQL consumer contract now has a matching server schema again.
- No secret import, database mutation, server start, agent execution, or live provider request occurred in API-REV-002.

## Prior Findings Resolution Check (Mandatory On Round >1)

| Prior Round | Finding ID | Previous Severity | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| 1 | `CR-001` | High | Resolved | `supported-model-static-metadata.ts:10-14` defines `GEMINI_MEDIA_CAPABILITIES` with image/audio/video all `supported`; `supported-model-definitions.ts:379,408,417` passes it to all three Gemini definitions; `llm-phase.ts` and `media-input-sanitizer.ts` therefore preserve those media sources for the Gemini outbound path. | Static inspection confirms 3/3 Gemini overrides; DeepSeek explicit unsupported values are unchanged. No executable test or live-provider sign-off is claimed. |
| 3 | `CR-002` | Blocking | Resolved in the server source, but the repeat review found a new cross-package contract finding | `autobyteus-server-ts` source no longer contains the removed enum/field/strategy references; IR-003 reports `pnpm --filter autobyteus-server-ts build` passed. `CR-003` below covered the remaining web/API consumer break. | Server-only compatibility was repaired; Round 4 remained blocked until the supported GraphQL consumer contract was reconciled. |
| 4 | `CR-003` | High / blocking | Resolved | `llm-provider.ts` restores the nullable `metadataProvenance` field with a server-local enum named `ModelMetadataProvenance`; `model-metadata-provisioning-service.ts` provides the server-local presentation value while keeping shared `ModelInfo` and resolver contracts clean. Server build passed, and the existing web query/generated types/docs/E2E field names match again. | No API/E2E or live-provider sign-off is claimed; this round validates source compatibility and implementation-scoped build only. |

## Behavior Basis And Production-Path Confirmation

The approved basis remains the requirements/design package, including preservation of existing successful media continuation. Round 2 revalidated the prior source finding and confirmed that the bounded override now keeps the reachable Gemini audio/video path intact.

| Behavior / Contract | Basis | Current implementation assessment |
| --- | --- | --- |
| `BE-001`–`BE-004` | `REQ-001`–`REQ-005`, screenshot/media production paths | Aligned in the reviewed source. |
| `BE-005`, `REQ-006`, `AC-010` | Known unsupported media is gated/sanitized, valid media remains available to compatible models, and DeepSeek image remains unsupported. | Aligned. The three Gemini built-ins explicitly use image/audio/video `supported`, while DeepSeek retains its explicit all-unsupported matrix. |
| `BE-006`–`BE-007` | Unknown-capability provider failure is a bounded LLM diagnostic with rollback; tool and provider ownership remain separate. | Aligned in source; executable validation remains downstream. |
| Catalog ownership | `REQ-006` and the approved static/live/unknown construction spine | Aligned. Static metadata remains definition-owned, and the Gemini capability exception is explicit rather than hidden in sanitizer/provider branching. |

The following size, structural, and scorecard sections preserve the Round 2 implementation-source evidence. Rounds 4–5 revalidate only the IR-003/IR-004 deltas and affected cross-package contracts; they do not turn the historical scorecard into a newly recomputed pass.

## Source File Size And Structure Audit

Effective counts are current non-empty implementation-source lines. Tests and generated files are excluded. The removed curated table is shown as cleanup rather than a current source-size risk.

| Source file / group | Effective non-empty lines | Changed-line delta | `>500` check | `>220` delta check | Ownership / placement verdict |
| --- | ---: | ---: | --- | --- | --- |
| `autobyteus-ts/src/agent/llm-request-assembler.ts` | 105 | 46 | Pass | Pass | Request package and outbound boundary remain cohesive. |
| `autobyteus-ts/src/agent/loop/llm-phase.ts` | 370 | 36 | Pass | Pass | LLM sequencing/recovery owner remains cohesive. |
| `autobyteus-ts/src/llm/llm-factory.ts` | 488 | 21 | Pass | Pass | Explicit construction/registration owner. |
| `autobyteus-ts/src/llm/metadata/model-metadata-resolver.ts` | 165 | 180 | Pass | Pass | Field-level live/static/unknown merge owner. |
| `autobyteus-ts/src/llm/models.ts` | 156 | 16 | Pass | Pass | Runtime model capability/provenance storage remains bounded. |
| `autobyteus-ts/src/llm/supported-model-definitions.ts` | 492 | 57 | Pass | Pass | Static catalog owner; preserve the size guardrail. |
| `autobyteus-ts/src/memory/memory-manager.ts` | 499 | 17 | Pass, at limit | Pass | Recovery is added to the existing memory owner; do not grow without a real split. |
| Added capability/static/sanitizer/recovery files | 18 / 31 / 126 / 91 | Untracked additions | Pass | Pass | Each new file has a focused boundary. |
| Remaining changed media/browser/metadata files | max 231 | max 46 | Pass | Pass | Existing owners remain appropriate. |
| Removed `curated-model-metadata.ts` | Removed | 230 deletions | N/A | Cleanup deletion | Superseded authority is removed; no dual table remains. |

No current changed implementation source file exceeds 500 effective non-empty lines. No current source addition exceeds the 220-line delta pressure threshold.

## Structural / Design Checks

| Check | Result | Evidence | Required action |
| --- | --- | --- | --- |
| Task design health is preserved | Pass | The targeted catalog move, media invariants, outbound boundary, recovery boundary, and no-retry posture remain at the reviewed owners. | None. |
| Implementation matches approved observable behavior | Pass | `GEMINI_MEDIA_CAPABILITIES` restores the existing supported Gemini audio/video continuation before outbound sanitization; DeepSeek and other existing bounded defaults are unchanged. | None. |
| Data-flow spine clarity | Pass | The catalog -> LLMModel -> LlmPhase -> assembler -> sanitizer -> Gemini renderer path now preserves the supported media types. | API/E2E should execute the downstream continuation coverage. |
| Ownership boundaries | Pass | LlmPhase sequences recovery, MemoryManager owns snapshots, assembler owns canonical/outbound construction, sanitizer owns filtering, and definitions own static metadata. | None. |
| Off-spine concern clarity | Pass | Browser capture, conversion, renderers, tool capability gate, resolver, and factory remain attached to their owners. | None. |
| Existing capability/subsystem reuse | Pass | Existing Message, renderer, MemoryManager, LLMModel, ReadMediaFile, and browser contracts are extended rather than duplicated. | None. |
| Shared structure/data-model tightness | Pass | Capability type, static metadata, resolved numeric metadata, request package, and recovery snapshot are distinct and focused. | Preserve current separation. |
| Interface/dependency direction | Pass | Factory maps resolver output explicitly; providers receive outbound messages; canonical messages are not passed to provider adapters. | None. |
| File placement and flat-vs-over-split judgment | Pass | Added files sit in existing LLM/memory ownership areas; no pass-through layer or broad orchestration stack was added. | None. |
| Naming/local readability | Pass | `GEMINI_MEDIA_CAPABILITIES` clearly names the provider-specific verified exception and is passed at each definition site. | None. |
| Legacy/cleanup completeness | Pass | Curated metadata is deleted and no production dual authority/retry/fallback compatibility path was added. | Downstream stale tests still need validity decisions. |
| Persisted-data transition | Pass | Approved decision is Not Affected; recovery changes active context only and preserves raw traces/tool facts without schema migration. | None. |
| Relevant test readiness | Pass | No source finding remains. Existing stale tests and the blocked dependency environment are explicitly handed to API/E2E; this is not API/E2E sign-off. | API/E2E owns validity decisions, durable coverage, and execution. |
| Source-check readiness | Pass | `git diff --check`, 3/3 Gemini override inspection, DeepSeek-preservation inspection, and source-size guard pass. | Package typecheck/tests remain downstream environment work. |

## Review Scorecard (Mandatory)

- Overall score: **9.14/10 (91.4/100)**
- Score calculation: simple average of the ten category scores. Every category meets the 9.0 clean-pass target; the score does not replace the finding-based decision.

| Priority | Category | Score | Why this score | What holds it down / required improvement |
| --- | --- | ---: | --- | --- |
| 1 | Data-Flow Spine Inventory and Clarity | 9.2 | Media, catalog, request, recovery, and Gemini continuation spines are traceable end to end. | Broader executable validation remains downstream. |
| 2 | Ownership Clarity and Boundary Encapsulation | 9.2 | Static exceptions are definition-owned and the outbound/recovery boundaries remain explicit. | Preserve the single catalog capability owner. |
| 3 | API / Interface / Query / Command Clarity | 9.1 | The capability contract and explicit definition override are clear at call sites. | Downstream tests must migrate to the current RequestPackage API. |
| 4 | Separation of Concerns and File Placement | 9.1 | The rework is limited to the static metadata helper and definition sites without new orchestration. | Keep future provider evidence in the catalog owner. |
| 5 | Shared-Structure / Data-Model Tightness | 9.1 | Generic defaults and provider-specific verified capabilities remain composable without renderer branches. | Do not broaden unsupported capability claims without evidence. |
| 6 | Naming Quality and Local Readability | 9.0 | `GEMINI_MEDIA_CAPABILITIES` communicates why the override exists and is used consistently. | None material. |
| 7 | API/E2E Readiness | 9.0 | No source finding remains and the package is ready for the next gate. | Dependencies, stale-test validity, and execution evidence remain downstream. |
| 8 | Runtime Correctness Under Edge Cases | 9.0 | Empty media, DeepSeek unsupported image, Gemini supported media, recovery, and no-retry paths are coherent in source. | No live provider execution was performed. |
| 9 | No Backward-Compatibility / No Legacy Retention | 9.4 | Curated authority and retry/fallback seams remain removed; the fix adds no compatibility wrapper. | None material. |
| 10 | Cleanup Completeness | 9.3 | The bounded rework is clean, source limits pass, and no duplicate capability machinery was added. | Downstream stale tests still require maintenance decisions. |

## Material Premise Validation

### P-001 — Built-in Gemini audio/video continuation is a supported reachable product path

- Related requirements/contracts: `REQ-006`, `AC-010`, preserved valid tool continuation under `BE-005`/`BE-007`.
- Independent initiating trigger: A supported agent turn selects a built-in Gemini model and invokes the existing `read_media_file` tool on a non-empty `.m4a` or `.mp4` file; direct user multimodal input is an additional supported message path.
- Independent support evidence: the three Gemini definitions map to `GeminiLLM`; `GeminiLLM` constructs the Gemini renderer path; `gemini-prompt-renderer.ts` processes image/audio/video as Gemini `inlineData`; existing continuation coverage exercises non-empty audio/video.
- Forward production path: user/agent turn -> Gemini model/tool invocation -> `ReadMediaFile` -> tool continuation -> `LlmPhase` -> assembler capability input -> sanitizer -> Gemini renderer/provider request.
- Current round consequence: `GEMINI_MEDIA_CAPABILITIES` now keeps image/audio/video in the outbound copy, so the prior consequence is resolved in source. Reachability remains **Reachable** and supports the preserved behavior requirement.

No findings are based on the unresolved dynamic-provider image-rejection premise `P-004`; no retry/classifier machinery was added.

## Findings (Prior Implementation-Source Round)

No new implementation-source findings were identified in Round 2. The current Round 3 failure-origin finding is recorded below.

### CR-001 — Resolved in Round 2

- Prior issue: The shared built-in capability default marked audio/video unsupported, so all three built-in Gemini definitions caused the outbound sanitizer to drop valid media before Gemini rendering.
- Resolution: `GEMINI_MEDIA_CAPABILITIES` now declares image/audio/video `supported`, and `supported-model-definitions.ts` passes it explicitly to `gemini-3.1-pro-preview`, `gemini-3-flash-preview`, and `gemini-3.5-flash`. DeepSeek keeps its explicit unsupported-image matrix.
- Verification: Current source inspection confirms all 3/3 Gemini definitions use the override; `git diff --check` and the existing source-size guard pass. Round 2 had no package test or live-provider sign-off; API-REV-001 later supplied focused repository execution, while API-REV-002 still did not reach a provider.

## Focused Failure-Origin Review (Round 3)

### Failure context and expected behavior

- `API-REV-002` attempted the user-authorized live-validation setup through the repository's documented root `pnpm secrets:import` command, using `/Users/normy/.autobyteus/server-data/.env` as the source and an isolated `autobyteus-server-ts/db/test.db` target. Values were not printed.
- The command performs the mandatory `autobyteus-server-ts` build before invoking the importer. The expected setup gate was a successful build followed by a dry-run plan; later import, server, agent, and provider execution were not reached.
- The authoritative observed evidence is `/Users/normy/autobyteus_org/autobyteus-worktrees/daily-assistant-luna-image-error/tickets/done/daily-assistant-luna-image-error/api-e2e-live-build.log`, which records exit code 2 during server `tsc`.

### Approved-behavior and reachability confirmation

| Premise | Independent product or contract basis | Forward path and consequence | Status |
| --- | --- | --- | --- |
| The setup command is an applicable operational contract | The repository root `secrets:import` script is the documented path for importing local environment secrets, and its recorded command invokes the server build first. | Root script -> shared package preparation -> server build -> stale server consumer errors -> importer is not started. | Reachable; directly evidenced by the build log. |
| The provisioning service is a supported server path | `ModelCatalogService.listLlmModels()` constructs/uses `ModelMetadataProvisioningService` and calls `enrichBestEffort()` for the default AutoByteus catalog (`autobyteus-server-ts/src/llm-management/services/model-catalog-service.ts:44-69`). | Server catalog path -> provisioning service -> current resolver/model contracts. The stale calls cannot compile even before the path can run. | Reachable by source and build contract. |
| The GraphQL model type is a supported compiled boundary | `autobyteus-server-ts/src/api/graphql/types/llm-provider.ts` maps `ModelInfo` into the server's model detail type. | Server build -> GraphQL type compilation -> removed resolver export/removed `ModelInfo` field errors. | Reachable by source and build contract. |

No conclusion here depends on provider credentials, network availability, a provider response, or a synthetic test. No live-provider scenario ID exists because the setup gate failed before a provider scenario began.

### Failure-origin analysis

The failure is an **implementation-source cross-package compatibility defect**, not a test, fixture, credential, network, or execution-environment defect:

- Shared `autobyteus-ts` preparation, SDK builds, and Prisma generation completed. The server compiler then reported concrete stale references in two server consumers.
- `autobyteus-server-ts/src/api/graphql/types/llm-provider.ts:14,40,89-90,190` imports/registers the removed `ModelMetadataProvenance` and reads the removed `ModelInfo.metadata_provenance`. The current `ModelInfo` contract contains numeric limits only (`autobyteus-ts/src/llm/models.ts:44-60`), and the approved design explicitly states that the runtime capability change does not require a `ModelInfo` or GraphQL change (`design-spec.md:588`).
- `autobyteus-server-ts/src/llm-management/services/model-metadata-provisioning-service.ts:26-43` calls `resolve` with the removed one-argument shape, omits the required static metadata argument, assigns `ResolvedMetadataField` wrappers to numeric `ModelInfo` fields, and reads removed `activeContextTokens` and `provenance` members. The current contract is `resolve(lookup, staticMetadata)` with per-field wrappers (`model-metadata-resolver.ts:8-18,112-139`); `activeContextTokens` is deliberately excluded from that resolved metadata (`requirements.md:197-198`).
- The same service returns the removed `CURATED_ONLY` strategy kind at line 82, matching the current compiler error and contradicting the approved live/static/unknown catalog construction contract. The implementation repair must not restore the deleted curated authority merely to make this consumer compile.

These are bounded source-consumer updates required to reconcile the server package with the approved shared-package migration. The exact compatibility-preserving mapping/removal is implementation-owned; this review does not invent a new GraphQL product field or server behavior. No design or requirement gap is present in the failure evidence.

### CR-002 — Server consumers still target the removed metadata contract

- Severity: **Blocking** for the requested live-validation gate.
- Origin: **Implementation source**, exposed by the mandatory server build in `API-REV-002`.
- Evidence: `/Users/normy/autobyteus_org/autobyteus-worktrees/daily-assistant-luna-image-error/tickets/done/daily-assistant-luna-image-error/api-e2e-live-build.log`; `autobyteus-server-ts/src/api/graphql/types/llm-provider.ts:14,40,89-90,190`; `autobyteus-server-ts/src/llm-management/services/model-metadata-provisioning-service.ts:26-43,79-103`; current shared contracts at `autobyteus-ts/src/llm/metadata/model-metadata-resolver.ts:8-18,112-139` and `autobyteus-ts/src/llm/models.ts:44-60`.
- Consequence: The documented secrets-import setup cannot reach even its dry-run importer, so the isolated live server and real agent/provider validation cannot start.
- Required response: Update the two server consumers against the current approved static/live/unknown metadata contract, preserve the existing supported `ModelInfo`/GraphQL behavior rather than reintroducing removed provenance or curated authority, and run the server build before returning for review.

### Prior-review gap and scope boundary

Round 2 implementation-source review did not detect this because the handoff checks and source audit were focused on the changed `autobyteus-ts`/Electron surfaces and did not run the cross-package `autobyteus-server-ts` build or search its consumers of the migrated contracts. The exact invariant that should have been checked was: **every workspace consumer of a removed export, changed resolver signature, and changed `ModelInfo` shape must compile under the repository's mandatory server build**. This is a bounded cross-package review gap; it does not change the repair owner or imply that API/E2E caused the defect.

The Round 2 source scorecard (9.14/10) and CRR-003 proportional test-code Pass remain historical results for their respective scopes. This focused failure-origin review does not recompute that scorecard or reopen the passed durable-test review.

## Repeat Implementation-Source Review (Round 4)

### CR-002 resolution check

- The two stale server consumers are reconciled with the current shared TypeScript API. `llm-provider.ts` now maps the current numeric/provider `ModelInfo` fields, and `model-metadata-provisioning-service.ts` calls `resolve(lookup, staticMetadata)`, maps `.value`, preserves dynamic `active_context_tokens`, and uses `LIVE_WITH_STATIC_FALLBACK`.
- The implementation evidence reports `pnpm --filter autobyteus-server-ts build` passing through shared preparation, Prisma generation, server compilation, asset copy, and bootstrap smoke. Current server-source search has no `ModelMetadataProvenance`, `metadata_provenance`, `metadataProvenance`, or `CURATED_ONLY` references.
- `CR-002` is therefore resolved within the server source. This result does not by itself prove that removing the GraphQL field is safe for existing clients.

### Approved-behavior and product-reachability confirmation for the remaining contract

| Premise | Independent product surface / supported action | Forward path and consequence | Status |
| --- | --- | --- | --- |
| The model-catalog GraphQL field is an existing supported contract | The desktop web model-selection/settings flow calls `llmProviderConfigStore.fetchProvidersWithModels()` (`autobyteus-web/stores/llmProviderConfig.ts:142-160`) through the Apollo query `GET_AVAILABLE_LLM_PROVIDERS_WITH_MODELS` (`autobyteus-web/graphql/queries/llm_provider_queries.ts:24-53`). | User opens or uses model selection -> Apollo sends `availableLlmProvidersWithModels` -> server schema no longer defines requested `metadataProvenance` -> GraphQL validation fails and the store clears the provider catalog in its catch path (`llmProviderConfig.ts:167-172`). | Reachable by normal product execution and source contract. |
| The field's intended behavior is documented and tested | Server module documentation describes nullable `ModelDetail.metadataProvenance` and its live/curated meanings; the server GraphQL E2E test queries and asserts it (`autobyteus-server-ts/docs/modules/llm_management.md:117,185`; `tests/e2e/llm-management/model-metadata-provenance-graphql.e2e.test.ts:43-65,143-243`). | Removing the field without migrating these consumers changes an existing API/schema contract and leaves the durable test/docs package inconsistent. | Reachable and contract-supported; not a hypothetical edge case. |

### CR-003 — IR-003 removes a GraphQL field still consumed by the web catalog

- Severity: **High / blocking** for source-review pass.
- Origin: **Implementation-source cross-package contract regression** in the IR-003 fix, not an API/E2E environment or provider issue.
- Evidence: IR-003 removes `ModelDetail.metadataProvenance` and its enum registration/mapping in `autobyteus-server-ts/src/api/graphql/types/llm-provider.ts:1-84,167-202`, while the supported web query still requests `metadataProvenance` at `autobyteus-web/graphql/queries/llm_provider_queries.ts:24-53`; the web type/store still imports and models it at `autobyteus-web/stores/llmProviderConfigSupport.ts:1-36`; generated GraphQL types and the server docs/E2E tests retain the field (`autobyteus-web/generated/graphql.ts:1135,3397,7154`; `autobyteus-server-ts/docs/modules/llm_management.md:117,185`; `autobyteus-server-ts/tests/e2e/llm-management/model-metadata-provenance-graphql.e2e.test.ts:43-65`).
- Consequence: A normal provider/model catalog fetch can fail GraphQL validation against the repaired server schema, causing the client store to clear its model catalog. The server-only build does not exercise this client/schema boundary.
- Approved-contract conflict: The reviewed design states that this ticket does not require a `ModelInfo` or GraphQL change (`design-spec.md:588`), while the existing server docs and web query establish `metadataProvenance` as a supported contract. Removing it is not a compatible implementation of the approved change.
- Required response: Preserve the existing GraphQL contract through a compatible server-side mapping, or obtain an explicit approved behavior/design decision before removing it and update every web query/type/store/generated artifact, server test, and documentation consumer together. Do not claim the server-only build as sufficient validation.

The web query and server documentation are independent witnesses of product reachability; the removed server field cannot establish its own safety. No live provider request or browser session is needed to classify this source contract regression.

### Round 4 decision and scope

- `CR-002`: Resolved in the server package.
- `CR-003`: Open; current implementation-source review result is **Fail**.
- No new full scorecard is computed for this focused repeat review; the Round 2 9.14/10 score remains historical for its earlier scope.
- The API/E2E stage must not start until the implementation-owned GraphQL/web contract issue is repaired or explicitly rerouted as a design/requirement decision.

## Repeat Implementation-Source Review (Round 5)

### CR-003 resolution check

- The supported nullable `ModelDetail.metadataProvenance` field is restored in `autobyteus-server-ts/src/api/graphql/types/llm-provider.ts` using a server-local enum registered under the existing GraphQL name `ModelMetadataProvenance`; the field name and enum values remain compatible with the existing web query and generated client.
- `autobyteus-server-ts/src/llm-management/services/model-metadata-provisioning-service.ts` exposes the presentation value only at the server boundary. It keeps `ModelInfo` free of shared provenance fields, uses the current resolver's numeric `.value` fields and dynamic `active_context_tokens`, and does not restore the deleted curated metadata authority or resolver curated fallback behavior.
- `mapMetadataProvenance` maps the server-local union to the GraphQL enum explicitly, avoiding a generic spread or a shared-model compatibility field. The provider strategy remains `LIVE_WITH_STATIC_FALLBACK`; `CURATED_FALLBACK` and `CURATED_ONLY` are retained only as the pre-existing GraphQL presentation values.

### Cross-package contract recheck

| Contract / consumer | Current source result | Evidence |
| --- | --- | --- |
| Server GraphQL schema | Pass; nullable `metadataProvenance` is present under the existing enum name. | `autobyteus-server-ts/src/api/graphql/types/llm-provider.ts:38-46,92-96,203-207` |
| Server model enrichment | Pass; server-local presentation metadata is derived from resolved numeric fields and provider strategy fallback state; shared `ModelInfo` remains numeric/provider-only. | `autobyteus-server-ts/src/llm-management/services/model-metadata-provisioning-service.ts:19-74,83-151` |
| Supported web query/store/generated client | Pass by source contract; the query still requests the restored field and the generated/store types still use the same enum/value names. | `autobyteus-web/graphql/queries/llm_provider_queries.ts:24-53`; `autobyteus-web/stores/llmProviderConfigSupport.ts:1-36`; `autobyteus-web/generated/graphql.ts:1135-1147,3397,7154` |
| Existing docs and durable server E2E contract | Pass by source contract; the documented nullable field and existing assertions remain compatible. | `autobyteus-server-ts/docs/modules/llm_management.md:117,185`; `autobyteus-server-ts/tests/e2e/llm-management/model-metadata-provenance-graphql.e2e.test.ts:27,43-65,143-243` |

### Round 5 decision and scope

- `CR-003`: Resolved. No new implementation-source finding was identified in the IR-004 delta.
- Implementation-scoped verification: `pnpm --filter autobyteus-server-ts build` passed; `git diff --check` passed. No API/E2E, importer, server-start, real-agent, or provider sign-off is claimed.
- The Round 2 scorecard remains historical; this repeat review is a bounded finding-resolution review and does not recompute unaffected categories.
- **Review result: Pass.** Route the cumulative package to `api_e2e_engineer` for the documented server build/importer dry-run/import, isolated live-E2E server, and real agent/provider sequence.

## Downstream Test Validity And Coverage Hints (Historical Round 2 Handoff)

These were the Round 2 handoff hints, not new findings in this repeat source review. API-REV-001 migrated the stale assertions and added the focused durable coverage; the historical live-validation blocker `CR-002` and the Round 4 web/schema blocker `CR-003` are resolved, while API/E2E remains the next pending gate.

- API-REV-001 migrated assembler/integration assertions to `canonicalMessages`/`outboundMessages` and replaced the removed one-argument/curated-table resolver tests.
- `autobyteus-ts/tests/integration/llm/utils/media-payload-formatter.test.ts` uses a short `abc123` fixture that is no longer valid under the stricter base64 contract; update only if the test is intended to prove valid raw base64.
- The focused API/E2E run proved canonical/outbound separation, supported Gemini audio/video retention, and empty-image/provider-safe behavior; its 94% confidence and residual live/native-shell limits remain documented in the API/E2E artifacts.

## Legacy / Backward-Compatibility Verdict

| Check | Result | Notes |
| --- | --- | --- |
| No production compatibility wrapper or dual authority | Pass | `curated-model-metadata.ts` is removed; the factory uses definition-owned static metadata and resolver-owned numeric overlays. |
| No retry/fallback/classifier machinery | Pass | The implementation retains the approved no-retry posture. |
| Persisted-data transition | Pass | Not Affected; no schema migration or historical run rewrite was introduced. |
| Dead/obsolete production cleanup | Pass | The old curated authority is deleted; stale tests are routed downstream rather than preserved through a production compatibility API. |

## Docs-Impact Verdict

- Docs impact: **No material implementation-source documentation change identified.** The existing server LLM-management documentation remains aligned because the nullable `ModelDetail.metadataProvenance` contract is restored.
- Delivery still owns the normal documentation/record synchronization decision after the source contract is resolved. The capability correction should be reflected in any durable behavior record if the implementation changes the static matrix.

## Environment And Evidence Limits

- Round 2 began before dependency setup; API-REV-001 subsequently installed the frozen dependencies and passed the focused TypeScript/Electron checks and production-source typecheck.
- In API-REV-002, shared package builds and Prisma generation passed, but the mandatory server `tsc` failed on the concrete stale consumers described in `CR-002`; IR-003 reports that server build now passes.
- No API/E2E execution or live provider request was performed after IR-003. The web GraphQL query/schema mismatch in `CR-003` is established by source and contract evidence.
- Browser zero-dimension/visual correctness remains a separate residual risk; this review only checks the non-empty byte contract.
- Other built-in capability values were not promoted to additional findings without an independent supported production-path proof; the API/E2E focused Pass remains historical and the next API/E2E run is now source-gate eligible.

## Classification

- Review result: **Pass** (repeat implementation-source review)
- Failure classification: N/A
- Recommended recipient: `api_e2e_engineer`
- Rationale: `CR-002` and `CR-003` are resolved. The server-local GraphQL presentation mapping preserves the existing web contract without reintroducing shared ModelInfo provenance or curated resolver authority. Server build and diff checks pass; no executable/live-provider sign-off is claimed.
- Required next stage: API/E2E should rerun the importer dry-run/import, isolated live-E2E server, and requested real agent/provider path with exact cleanup and confidence evidence.

## Residual Risks

- The server build blocker `CR-002` and web/schema regression `CR-003` are resolved in source; the API-REV-001 focused repository Pass and CRR-003 durable-test Pass still do not cover live-provider execution.
- No live Gemini request was made; the requested live validation must be rerun after the source repair.
- The exact dynamic-provider image-rejection classifier remains unproven and correctly has no retry machinery.
- Byte non-emptiness does not establish visual screenshot quality or non-zero browser dimensions.

## Latest Authoritative Result

- Review decision: **Pass** (repeat implementation-source review)
- Review entry point: `Implementation Review`
- Material-premise gate: **Pass**; the normal web model-catalog action, GraphQL query, and documented/tested field contract are independently supported.
- Score summary: Round 2 source score remains **9.14/10** for its prior scope; no new full scorecard is assigned in this focused repeat review.
- Open findings: None; `CR-001`, `CR-002`, and `CR-003` are resolved.
- Classification: N/A
- Recipient: `api_e2e_engineer`
- Required next stage: rerun the API/E2E importer/live-validation sequence, including the isolated real agent/provider scenario.
