# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/gemini-31-image-schema-dimensions/tickets/done/gemini-31-image-schema-dimensions/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/gemini-31-image-schema-dimensions/tickets/done/gemini-31-image-schema-dimensions/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/gemini-31-image-schema-dimensions/tickets/done/gemini-31-image-schema-dimensions/design-spec.md`
- Supplemental Task Artifacts: `/Users/normy/autobyteus_org/autobyteus-worktrees/gemini-31-image-schema-dimensions/tickets/done/gemini-31-image-schema-dimensions/gemini-image-schema-matrix.md`
- Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/gemini-31-image-schema-dimensions/tickets/done/gemini-31-image-schema-dimensions/solution-revision-record.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/gemini-31-image-schema-dimensions/tickets/done/gemini-31-image-schema-dimensions/implementation-handoff.md`
- Implementation Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/gemini-31-image-schema-dimensions/tickets/done/gemini-31-image-schema-dimensions/implementation-revision-record.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/gemini-31-image-schema-dimensions/tickets/done/gemini-31-image-schema-dimensions/code-review-report.md`
- Code Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/gemini-31-image-schema-dimensions/tickets/done/gemini-31-image-schema-dimensions/code-review-revision-record.md`
- API/E2E Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/gemini-31-image-schema-dimensions/tickets/done/gemini-31-image-schema-dimensions/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-002`
- Current Investigation Round: `2`
- Trigger: `code-reviewer` `CRR-004` source-review `Pass` for commit `650d6afd7`.
- Prior Investigation Reviewed: `API-REV-001` / prior `Fail` / `60.8%`; `API-FAIL-001` implementation rework.
- Latest Authoritative Investigation: This document.

## Current Requirement And Design Basis

The approved package requires model-specific `generation_config` schemas for
native Gemini image models, exact Flash and Lite allowlists, and common
`generate_image`/`edit_image` provider behavior. The critical provider
acceptance basis (`AC-003` and `AC-004`) says the selected snake_case controls
must reach the Gemini response-format image configuration and remain shared by
generation and editing. `AC-006` requires no-config behavior to remain
unchanged. `REQ-007` documentation remains delivery-owned.

The implementation-source review passed the catalog and focused mocked tests,
but explicitly requested independent Lite/Flash server projections, broader
media/provider-path validation, and rechecking the Lite 512 documentation
conflict.

The prior API/E2E round established that the installed `@google/genai`
Generate Content boundary requires `config.imageConfig`, and that the prior
`responseFormat.image` shape was discarded. Implementation rework
`IR-003` now constructs `config.imageConfig` and the focused raw serializer
test proves `generationConfig.imageConfig` reaches transport. This round
rechecked the corrected boundary through the actual database-backed vault,
Vertex Express runtime, real `GeminiImageClient`, and actual Google provider
for both Flash and Flash Lite generation/editing.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| `B-IMG-SCHEMA-001` native catalog -> media tool schema | Added | `ImageClientFactory` catalog schemas and `media-tool-parameter-schemas.ts` | Verify real server projections for Flash and Lite, both generation and editing. |
| `B-IMG-SCHEMA-002` tool config -> Gemini provider config | Corrected | `GeminiImageClient` normalizer and `REQ-003` | Mocked unit assertion is insufficient; inspect the installed SDK's actual serialized request. |
| `B-IMG-SCHEMA-003` edit path | Preserved/Corrected | `editImage()` delegates to `generateImage()` and retains inline references | Verify database-backed client path preserves reference content and config. |
| `B-IMG-SCHEMA-004` no-config and response handling | Preserved | Existing Gemini tests and handoff | Recheck no-config serialization and response extraction. |
| `B-IMG-SCHEMA-005` Lite allowlist | Changed | Corrected `SR-002`/`IR-002` and matrix | Verify all 14 ratios and exactly `1K`; provider docs remain partially contradictory. |
| `REQ-007` provider documentation | Unclear/pending | Requirements and code review | Delivery must sync docs or record no-impact after provider recheck. |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | No | No domain algorithm or persistence behavior changed. | Focused suites. | N/A. | None. |
| API / transport / contract | Yes | Dynamic media tool schema and Gemini SDK request config. | Server projection tests and provider unit tests. | Current tests stop before SDK serialization. | Real SDK serialization and live API if the request shape is corrected. |
| Frontend component / state | No | No frontend files or UI contract changed. | N/A. | N/A. | None. |
| Browser integration / user journey | No | No browser-specific behavior. | N/A. | N/A. | None. |
| Authentication / session / permissions | Yes (credential resolution only) | Database-backed provider secret and Gemini runtime selection are used by the real client boundary. | Secret vault and runtime resolver source; copied test DB evidence. | No live provider call was made after the local request-shape failure. | Database-backed executable probe; live API only after fix. |
| Desktop renderer / web-equivalent UI | No | No renderer behavior changed. | N/A. | N/A. | None. |
| Desktop shell / Electron-specific integration | No | No shell or IPC code changed. | N/A. | N/A. | None. |
| Process / lifecycle | No | Client promise/cache and service cleanup are existing behavior. | Existing client/service tests. | No restart/lifecycle risk is material to this failure. | None. |
| Persisted-data transition | No | In-memory schema/config only. | Requirements and handoff `Not Affected`; DB used only as credential fixture. | No migration scenario is required. | None. |
| Worker / queue / distributed coordination | No | No worker or distributed path. | N/A. | N/A. | None. |
| External integration | Yes | Google `@google/genai` Generate Content SDK and provider contract. | Installed SDK typings/serializer and official Google docs. | No real provider response yet; the request is already proven malformed/empty locally. | Live API after Local Fix. |

## Project Execution Discovery

- Assigned task worktree / workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/gemini-31-image-schema-dimensions`
- Project type and runtime stack: TypeScript pnpm workspace; `autobyteus-ts` multimedia clients; `autobyteus-server-ts` Fastify/GraphQL server; Vitest; Prisma SQLite; `@google/genai`.
- Conflicting, missing, or unclear project instructions: Server `typecheck` has a known baseline `TS6059` test-root mismatch from upstream review; package builds remain usable. No task-specific API/E2E setup conflict.
- Required environment variables or secrets available: `Yes` for Vertex Express through the copied database-backed vault; `GEMINI_API_KEY` in the supplied env file is empty, so AI Studio import was not applicable. The copied database contains `provider.google.vertex-express.api-key` and its sibling 32-byte root key.

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `autobyteus-server-ts/AGENTS.md` | Server test commands | Use `pnpm -C autobyteus-server-ts exec vitest run ... --no-watch`. |
| `autobyteus-server-ts/README.md` | Runtime, DB, secret, and server setup | SQLite DB/key are a pair; provider credentials are vault-backed; use the importer only for a source env assignment and explicit database URL. |
| Root `README.md` | Workspace/E2E commands | Repository E2E is deterministic and separate from live external-provider E2E. |
| `autobyteus-ts/package.json` | Image package build/dependency authority | `@google/genai` is a runtime dependency; package build uses `tsconfig.build.json`. |
| `autobyteus-server-ts/package.json` | Server build/test authority | `build` runs Prisma generation and sanitized bootstrap; `test` is Vitest. |
| Installed `@google/genai` declaration/serializer | Actual Generate Content transport contract | `GenerateContentConfig` exposes `imageConfig`; serializer emits `generationConfig.imageConfig` and drops unknown `responseFormat`. |
| Official Google docs, checked 2026-07-29 | Provider capability contract | Image guide documents Flash 14-ratio/512-1K-2K-4K; Lite prose says 1K only. Lite model page says 14 ratios but enumerates only the standard 10 in its bullet, so the narrow-four interpretation remains a documented inconsistency. |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts` image tests | Worktree root | `pnpm -C autobyteus-ts exec vitest run tests/unit/multimedia/image --no-watch` | Uses deterministic mocks. | Vitest summary. | Test process exits. |
| Server media unit tests | Worktree root | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-tools/media --no-watch` | Vitest uses its isolated temporary Prisma DB. | Vitest summary and migration output. | Test-owned temp DB cleanup. |
| Server media E2E test | Worktree root | `pnpm -C autobyteus-server-ts exec vitest run tests/e2e/media/server-owned-media-tools.e2e.test.ts --no-watch` | Registry and file-output E2E uses mocked provider factories. | Vitest summary. | Test-owned temp dirs/DB. |
| Database-backed Gemini client probe | Worktree root | Temporary Node module probe with copied DB/key and `globalThis.fetch` interception. | Uses real AppConfig, Prisma, SecretVault, runtime resolver, `ImageClientFactory`, `GeminiImageClient`, and installed SDK; provider network is intentionally intercepted. | Captured raw Generate Content request. | Prisma/vault closed; DB copy is ignored and retained only for this validation round. |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Vertex Express Gemini credential | Copied `/Users/normy/.autobyteus/server-data/db/production.db` and sibling `production.db.secret.key` into ignored worktree `autobyteus-server-ts/db/`. | Source values were not read or logged. Original user DB was not modified. | Worktree DB remains ignored for this run; remove after handoff/final cleanup if no longer needed. |
| AI Studio fallback import | Reviewed `/Users/normy/.autobyteus/server-data/.env` with importer dry-run. `GEMINI_API_KEY` is empty; existing Vertex Express credential is configured, so no import was executed. | No secret value recorded. | None. |
| Generated provider response | `globalThis.fetch` returned deterministic inline PNG data from the temporary probe. | No external request or billable provider call. | Probe log retained under task evidence. |

## Persisted Data Transition Coverage Basis

- Approved decision: `Not Affected`.
- Design-spec and implementation-handoff references: `requirements.md` and `implementation-handoff.md` persisted-data checks.
- Representative existing-data setup and required behavior: None required for the feature; the copied SQLite DB is only a credential-resolution fixture and was not used as product data evidence.
- Evidence planned for the approved outcome: Confirm no migrations or persisted model changes are part of the patch; close Prisma/vault and avoid altering the source DB.
- Migration-specific completion/recovery scenarios: N/A.
- Upstream ambiguity or reroute required: None for persistence.

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Acceptance Criteria / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/tests/unit/multimedia/image/image-client-factory.test.ts` catalog matrix | Exact native Gemini model IDs, ratios, sizes, Imagen isolation. | `AC-001`, `AC-002`, `AC-005`, `REQ-006`. | Still Valid | 13 tests pass; exact Lite/Flash arrays match approved matrix. | Retain. |
| `autobyteus-ts/tests/unit/multimedia/image/api/gemini-image-client.test.ts` request mocks | No-config, generation/edit translation, merged config, invalid value, response extraction, raw serializer. | `AC-003` through `AC-006`. | Still Valid | 6 tests pass; assertions now use `imageConfig` and raw `generationConfig.imageConfig`. | Retain. |
| `autobyteus-server-ts/tests/unit/agent-tools/media/media-tool-parameter-schemas.test.ts` Flash projection | Flash generate/edit nested schema and exact enum values. | `AC-001`, `AC-002`, `AC-005`. | Still Valid | 2 tests pass; direct real Flash/Lite projection and live provider probes also pass. | Retain; no durable test edit needed for this round. |
| `autobyteus-server-ts/tests/unit/agent-tools/media/media-generation-service.test.ts` orchestration | Service resolves model, forwards `generation_config`, writes output, cleans client. | `AC-004`, `AC-007`. | Still Valid | 4 tests pass. | Retain; mock gap is recorded. |
| `autobyteus-server-ts/tests/e2e/media/server-owned-media-tools.e2e.test.ts` local tool boundary | Registry, GraphQL schema mechanics, media path resolution, output file writes. | `AC-004`, `AC-007`. | Still Valid | 5 tests pass; provider factories are mocked. | Retain; real Gemini boundary requires the temporary/database-backed probe or future live coverage. |

## Stale Or Obsolete Coverage Decisions

No test file was removed or disabled. The prior `responseFormat.image`
assertions were corrected by implementation rework to the installed SDK's
`imageConfig` contract, including a raw serializer assertion. No stale coverage
remains in the current changed test path.

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Requirement / Acceptance Criteria / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| `GEMINI-API-E2E-001` | Raw `@google/genai` Generate Content serialization for Flash controls. | `AC-003`, `REQ-003`. | `autobyteus-ts/tests/unit/multimedia/image/api/gemini-image-client.test.ts`. | Already added by implementation rework and rechecked in this round; no further durable addition. |
| `GEMINI-API-E2E-002` | Lite and Flash real server tool-schema projection for both generate/edit. | `AC-001`, `AC-002`, `AC-005`. | Existing catalog matrix plus `evidence/real-media-schema-projection.json`. | The catalog matrix is durable for all native models; the generic server adapter and real probe cover both models. No additional durable test was required this round. |

## Durable Coverage To Update

| Scenario ID | Existing Path / Scenario | Required Update | Requirement / Acceptance Criteria / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| `GEMINI-API-E2E-001` | `autobyteus-ts/tests/unit/multimedia/image/api/gemini-image-client.test.ts` | Recheck corrected `imageConfig` provider shape and raw SDK serialization. | `REQ-003`, `AC-003`, `AC-004`, `AC-006`; installed SDK evidence. | Updated implementation/source review now covers this path; API/E2E reran it and live provider validation. |

## Durable Coverage To Remove

None.

## Repository Coverage Execution Plan And Results

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| 1 | `pnpm -C autobyteus-ts exec vitest run tests/unit/multimedia/image --no-watch` | Worktree root | Catalog, Gemini client mocks, OpenAI/Imagen preservation. | Pass | `evidence/focused-autobyteus-ts-image.log` (5 files / 32 tests). |
| 2 | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-tools/media --no-watch` | Worktree root; isolated test DB. | Server resolver, parser, service, registry, projection. | Pass | `evidence/focused-server-media.log` (6 files / 23 tests). |
| 3 | `pnpm -C autobyteus-server-ts exec vitest run tests/e2e/media/server-owned-media-tools.e2e.test.ts --no-watch` | Worktree root; isolated test DB/temp dirs. | Local media-tool registry and GraphQL/file-output boundary. | Pass | `evidence/server-media-e2e.log` (5 tests). |
| 4 | Temporary actual SDK serializer probe using `@google/genai@1.42.0` | No network; `globalThis.fetch` capture. | `responseFormat.image` vs `imageConfig` transport behavior. | Fail | `evidence/gemini-sdk-serialization-probe.json`: `responseFormat` is dropped; `imageConfig` serializes to `generationConfig.imageConfig`. |
| 5 | Temporary database-backed Gemini boundary probe | Copied production DB/root key; real vault/runtime resolver/client; provider fetch intercepted. | Real credential resolution, Gemini runtime, generation/edit content assembly, SDK request. | Fail | `evidence/database-backed-gemini-boundary-probe.log`: both generation/edit requests omit image controls from raw `generationConfig`. |
| 6 | `pnpm -C autobyteus-ts exec vitest run tests/unit/multimedia/image/api/gemini-image-client.test.ts --no-watch` | Worktree root | Rerun of `GEMINI-API-E2E-003` corrected SDK mapping. | Pass | `evidence/round-2/gemini-image-client-focused.log` — 6 tests. |
| 7 | `pnpm -C autobyteus-ts exec vitest run tests/unit/multimedia/image --no-watch` | Worktree root | Full image regression after SDK mapping correction. | Pass | `evidence/round-2/focused-autobyteus-ts-image.log` — 5 files / 33 tests. |
| 8 | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-tools/media --no-watch` | Worktree root; isolated test DB. | Server media regression after SDK mapping correction. | Pass | `evidence/round-2/focused-server-media.log` — 6 files / 23 tests. |
| 9 | Database-backed Gemini boundary probe with intercepted fetch | Isolated copied DB/root key, real vault/runtime/client, no external network. | Rerun `GEMINI-API-E2E-004`/`005`; raw config, reference content, response extraction. | Pass | `evidence/round-2/database-backed-gemini-boundary-probe.log`; both requests contain expected `generationConfig.imageConfig`. |
| 10 | Live Google Flash generation/editing probe | Isolated copied DB/root key; actual Vertex Express provider. | Corrected live `GEMINI-API-E2E-004`/`005`; Flash 1:4/4:1 at 512. | Pass | `evidence/round-2/live-google-flash-validation.json`; output dimensions 256x1024 and 1024x256. |
| 11 | Live Google Flash Lite generation/editing probe | Isolated copied DB/root key; actual Vertex Express provider. | Model-specific Lite 1:4/4:1 at 1K. | Pass | `evidence/round-2/live-google-lite-validation.json`; output dimensions 512x2064 and 2064x512. |
| 12 | `pnpm -C autobyteus-server-ts exec vitest run tests/e2e/media/server-owned-media-tools.e2e.test.ts --no-watch` | Worktree root; isolated test DB/temp dirs. | Server media E2E regression. | Pass | `evidence/round-2/server-media-e2e.log` — 1 file / 5 tests. |
| 13 | `git diff --check` | Worktree root. | Patch hygiene. | Pass | `evidence/round-2/git-diff-check.log`. |

## Latest Confidence Scorecard (Mandatory)

| Confidence Category | Score | What Supports The Score | Remaining Uncertainty | Additional Validation That Could Improve It |
| --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 95% | Corrected raw serializer, real database-backed generation/edit probes, and live Flash/Lite output dimensions prove AC-001 through AC-007 material behavior. | `AC-008` documentation synchronization remains delivery-owned. | Docs sync only. |
| Changed-boundary execution directness | 95% | Actual SDK serialization, real vault/runtime/client path, and live provider requests all exercised. | No every-ratio live matrix; representative extremes were selected. | Full provider matrix, not required for this patch. |
| Cross-boundary integration realism and mock gap | 95% | Actual Vertex Express Google generation/editing passed for Flash and Lite, with requested extreme ratios and sizes. | Provider service behavior can change over time. | Periodic provider contract refresh. |
| Environment, configuration, identity, and fixture fidelity | 95% | Copied production DB/root key, real encrypted Vertex Express credential resolution, and actual Google responses. | Original user DB was not used directly; isolated copy was used. | None material. |
| Failure, edge-case, lifecycle, and recovery evidence | 90% | No-config/invalid-value/reference/response tests pass; live generation/editing passed for extreme ratios. | Provider error/restart recovery is not in scope for this metadata/config patch. | Targeted provider failure probe if future risk warrants. |
| User-surface, browser, and desktop-shell confidence | N/A | No frontend/browser/desktop-shell change. | None applicable. | N/A. |
| Durable regression coverage quality and relevance | 95% | 33 image tests include raw SDK serializer; 23 server media tests and 5 media E2E tests pass; catalog matrix covers all native models. | Server projection durable assertion is Flash-focused; real Lite projection/live probe supplies direct evidence. | Add explicit Lite projection assertions in a future coverage-only cleanup if desired. |

- Overall latest validation confidence: `94.2%` (average of six applicable categories; rounded to one decimal).
- Calculation method: Simple average of applicable category scores; `N/A` user-surface category excluded.
- Every critical acceptance criterion directly proven: `Yes` for `AC-001` through `AC-007`; `AC-008` remains delivery-owned.
- Any applicable category below 90%: `No`.
- Default clean-confidence target of 95% met: `No` by the simple-average threshold; one bounded non-critical lifecycle/recovery category is 90% and no material changed-boundary uncertainty remains.
- Material residual risks: Lite's official documentation still claims 14 ratios while its visible model-page bullet enumerates ten; the guide/prose remains the basis for conservative Lite `1K` only. Durable provider-model docs and stale `responseFormat.image` terminology synchronization remain delivery-owned.

## Broader Validation Decision (Mandatory)

- Decision: `Required` for this rerun and completed successfully through `Live API` mode; no further broader validation is required before downstream test review.
- Selected execution mode: `Live API` plus database-backed actual SDK boundary; browser/desktop mode not applicable.
- Specific confidence gap or residual risk addressed: Whether corrected `imageConfig` reaches Google and produces requested extreme aspect ratios for generation/editing, including Lite's 1K-only path.
- Why the selected mode can materially improve confidence: It exercises the real encrypted credential, runtime selection, installed SDK, Vertex Express endpoint, provider response extraction, and actual output dimensions.
- Expected confidence after selected validation: At least 94%; one bounded lifecycle/recovery category remains 90% because restart/error recovery is not material to this config-only patch.
- Browser-specific decision and rationale: Not applicable; no UI boundary changed.
- If `Not Required`, evidence proving the real changed boundary without broader execution: N/A; broader validation was required and executed.
- If `Blocked`, exact dependency or access that remains unavailable after safe setup/emulation attempts: N/A.

## Desktop Application Validation Decision (When Applicable)

- Desktop framework / shell: N/A.
- Relevant README or development instructions: Server README only; no desktop behavior changed.
- Web-equivalent behavior: N/A.
- Shell-specific or lifecycle behavior: N/A.
- Chosen validation approach and why it fits the project: Backend SDK-boundary probe is more direct than browser or Electron execution.
- Server/frontend setup when browser validation is used: N/A.
- Effect on any already-running desktop application: `None`.
- Behavior not directly proven and confidence consequence: No desktop-specific behavior applies; backend live provider behavior was directly proven.

## Live Environment And Fixture Plan (Required When Broader Validation Runs)

- Startup order and commands: Initialize AppConfig against the isolated worktree data dir, initialize Prisma, initialize the SecretVault from the copied DB/root key, resolve Vertex Express, construct the real image client, first capture SDK serialization, then run actual Google Flash and Lite generation/editing.
- Environment choices that materially affect the run: Vertex Express mode; copied DB/root key; no plaintext secret copied into the worktree; live provider calls use the isolated vault credential.
- Health / readiness checks: SecretVault returned a usable provider runtime; actual Google requests returned one image for each generation/edit scenario.
- Seed data / fixtures: No product data seeded; one generated image was reused as the editing reference; deterministic prompts and extreme ratio/size values.
- Test identities, authentication, permissions, or session state: Vault-backed Vertex Express credential resolution; no user session or browser auth.
- Requirement-linked journeys or scenarios: `AC-003` generation config; `AC-004` edit/reference config; `AC-005` Lite model-specific controls; `AC-006` existing no-config path from repository tests.
- DOM, screenshot, log, API, process, or other evidence to capture: Raw serialized request JSON, database-backed boundary log, live JSON result, output files, MIME types, and parsed dimensions under `evidence/round-2/`.
- Owned processes and temporary state to clean up: No long-running process; Prisma and vault closed in the probe finally blocks. Ignored DB copy remains for possible rerun and must not be committed.

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| `GEMINI-API-E2E-001` | Updated durable raw serializer test plus `/tmp/gemini-sdk-serialization-probe.cjs`. | `imageConfig` serializes correctly; negative responseFormat control remains documented. | Standalone probe is redundant with durable test and retained only as round evidence. |
| `GEMINI-API-E2E-002` | `/tmp/gemini-real-boundary-probe-round2.mjs`; real DB/vault/runtime/client plus intercepted fetch. | Actual secret/runtime/client/provider request path and editing inline content. | Requires local user credential fixture and large ignored DB; not suitable for deterministic repository CI. |
| `GEMINI-API-E2E-003` | Built server projection script using real `ImageClientFactory` and `MediaModelResolver`. | Flash and Lite generation/edit tool schemas with exact enums. | Small executable snapshot is redundant with durable server tests once Lite cases are added. |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Full live provider matrix for every documented ratio/size combination | Representative Flash 512 and Lite 1K extreme-ratio generation/editing passed; a complete cross-product matrix is not necessary for this config mapping patch. | Low residual provider-contract risk; docs ambiguity remains. | Delivery preserves the dated docs risk; refresh the matrix if Google changes the contract. |
| Browser/Electron UI | No UI or shell files changed. | None for this scope. | N/A. |
| Persisted-data migration | Requirements mark `Not Affected`. | None. | N/A. |

## Ambiguities Or Reroute Triggers

| Issue | Classification | Evidence | Recommended Recipient |
| --- | --- | --- | --- |
| `API-FAIL-001`: corrected by `IR-003`; `GeminiImageClient` now maps into installed SDK `imageConfig`. | Resolved | `evidence/round-2/database-backed-gemini-boundary-probe.log`; live Flash/Lite evidence. | None; retain terminology/docs sync downstream. |
| Lite provider documentation says 14 ratios but the model page explicitly enumerates only ten standard ratios; the image guide's capability prose/table scope is not model-specific for Lite. | `Unclear` residual provider-contract risk. | Official docs checked 2026-07-29: `https://ai.google.dev/gemini-api/docs/image-generation` and `https://ai.google.dev/gemini-api/docs/models/gemini-3.1-flash-lite-image`. | `code_reviewer` now; `delivery_engineer` must preserve dated docs evidence or reroute if the approved matrix changes. |

## Investigation Decision

- Proceed To API/E2E Execution: `Yes` — corrected rerun and live validation complete.
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `No` in this round; source rework already added the raw serializer regression test.
- Latest validation confidence: `94.2%`; all critical behavior is directly proven, with a bounded non-critical lifecycle category at 90%.
- Broader validation decision: `Required`, executed successfully with actual SDK/database-backed and live Google API modes.
- Reroute Required Before Validation Execution: `No`.
- Recommended Recipient If Reroute Required: `N/A`; Pass routes to `code_reviewer` for proportional test-code review.
- Notes: API-FAIL-001 is resolved. Live Flash and Lite generation/editing returned requested extreme-ratio dimensions. Remaining work is proportional test review and delivery-owned documentation/terminology synchronization.
