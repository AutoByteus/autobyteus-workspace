# API/E2E Execution Coverage Report

## Execution Round Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-lineage-provenance-analysis/tickets/in-progress/memory-lineage-provenance-analysis/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-lineage-provenance-analysis/tickets/in-progress/memory-lineage-provenance-analysis/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-lineage-provenance-analysis/tickets/in-progress/memory-lineage-provenance-analysis/design-spec.md`
- Supplemental Task Artifacts:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-lineage-provenance-analysis/tickets/in-progress/memory-lineage-provenance-analysis/memory-context-and-lineage-contract.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-lineage-provenance-analysis/tickets/in-progress/memory-lineage-provenance-analysis/use-case-data-flow-spine-map.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-lineage-provenance-analysis/tickets/in-progress/memory-lineage-provenance-analysis/provenance-methodology-analysis.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-lineage-provenance-analysis/tickets/in-progress/memory-lineage-provenance-analysis/compacted-memory-message-role-analysis.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-lineage-provenance-analysis/tickets/in-progress/memory-lineage-provenance-analysis/memory-compactor-prompt-content-contract.md`
- Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-lineage-provenance-analysis/tickets/in-progress/memory-lineage-provenance-analysis/solution-revision-record.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-lineage-provenance-analysis/tickets/in-progress/memory-lineage-provenance-analysis/design-review-report.md`
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-lineage-provenance-analysis/tickets/in-progress/memory-lineage-provenance-analysis/architecture-review-revision-record.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-lineage-provenance-analysis/tickets/in-progress/memory-lineage-provenance-analysis/implementation-handoff.md`
- Implementation Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-lineage-provenance-analysis/tickets/in-progress/memory-lineage-provenance-analysis/implementation-revision-record.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-lineage-provenance-analysis/tickets/in-progress/memory-lineage-provenance-analysis/code-review-report.md`
- Code Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-lineage-provenance-analysis/tickets/in-progress/memory-lineage-provenance-analysis/code-review-revision-record.md`
- Delivery Revision Record (delivery re-entry only): `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-lineage-provenance-analysis/tickets/in-progress/memory-lineage-provenance-analysis/delivery-revision-record.md`
- Relevant Delivery Revision IDs: `DR-001` through `DR-007`; SR-015 delivery pending.
- Coverage Investigation: `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-lineage-provenance-analysis/tickets/in-progress/memory-lineage-provenance-analysis/coverage-investigation.md`
- API/E2E Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-lineage-provenance-analysis/tickets/in-progress/memory-lineage-provenance-analysis/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-009`
- Current Execution Round: `9`
- Trigger: `CRR-013 Fail — Local Fix` for `TCR-002` and `TCR-003`; implementation source remains `CRR-012 Pass` at commit `d9753e69c1244bf88c0bc6816306495430047a35`.
- Prior Round Reviewed: `API-REV-008 / Pass / 98%`; `CRR-013` retained that execution result while requesting two bounded durable-test corrections.
- Latest Authoritative Round: This file, round 9 (`API-REV-009 / Pass / 98%`).

## Investigation And Execution Basis

- Coverage investigation artifact: `coverage-investigation.md`, round 9.
- Investigation completed before the bounded durable corrections and final reruns: `Yes`.
- `TCR-002` validity: `Confirmed`. API-REV-008 lacked direct changed-test assertions for exact checkpoint settlement on real `LlmPhase` Tool ingestion and retained interruption.
- `TCR-003` validity: `Confirmed`. The canonical scenario IDs were reversed in reporting, and zero-byte-lineage eligibility lacked a direct server migration fixture.
- Corrections made:
  - added real native Tool-call and interrupted-stream branches to the existing `LlmPhase` recovery owner, with direct capture/commit/restore spies and retained context/raw-trace assertions;
  - parameterized the native standalone-v4 migration case over absent and zero-byte lineage;
  - corrected current report/revision traceability so `SCN-020` is request recovery and `SCN-021` is native migration.
- Reroute required before or during execution: `No`.
- Production-source delta in this round: `None`. Round-9 durable delta: `0 Added / 2 Updated / 0 Removed`; cumulative SR-015 delta remains `2 Added / 18 Updated / 1 Removed`.

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce or ambiguously retain backward compatibility: `No`.
- Compatibility-only or legacy-retention behavior observed in implementation: `No`.
- Approved persisted-data transition followed without unnecessary runtime fallback: `Yes` — one isolated required migration owns historical conversion; normal restore remains strict v5-only.
- Durable coverage retained only for invalid compatibility behavior: `No`.
- Compatibility reroute / notification: `N/A`.

## Changed Boundary And Evidence Matrix

| Scenario ID | Behavior / Requirement Basis | Changed Boundary | Execution Surface / Mode | Evidence Type | Result | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| SCN-020 | Pending compaction completes before stable-base capture; assembly/provider failure restores; successful/Tool/interrupted retained outcomes release exactly once; canonical composed User remains current | `LLMRequestAssembler` -> recovery boundary -> real `LlmPhase` final/Tool/interruption branches | Durable core unit/integration | Durable | Pass | `api-rev-009-tcr-002-focused-final.log`; `api-rev-009-request-recovery-broad.log` |
| SCN-021 | Exact native standalone/team v1/v3/v4/current-v5 conversion; absent/zero-byte eligibility; active provenance; identity/omission; nonempty-lineage exclusion; prerequisite order; strict restore and continuation | Core converter -> server migration -> ordinary runner -> strict bootstrap -> current snapshot | Durable unit/integration, real isolated files and migration repository | Durable | Pass | `api-rev-009-tcr-003-focused-final.log`; `api-rev-009-migration-broad.log`; `api-rev-008-core-memory-broad.log` |
| SCN-001–SCN-019 | Preserved current-only lineage, natural compactor, v5/tool/media, startup/provider/presentation and real-compactor contracts | Existing affected core/server surfaces | Affected broad suites, builds and root deterministic E2E | Durable | Pass | `api-rev-008-core-memory-broad.log`; `api-rev-008-server-migration-broad.log`; `api-rev-008-root-deterministic-e2e-final.log` |

Evidence paths in this report are under `tickets/in-progress/memory-lineage-provenance-analysis/evidence/api-e2e/` unless absolute.

## Additional Repository Coverage Execution

| Order | Command / Selection | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence |
| --- | --- | --- | --- | --- | --- |
| 1 | `vitest run tests/unit/agent/loop/llm-phase-tool-protocol-recovery.test.ts --no-watch` | `autobyteus-ts` | SCN-020 real Tool and retained-interruption exact settlement | Pass: 1 file / 4 tests | `api-rev-009-tcr-002-focused-final.log` |
| 2 | `vitest run tests/unit/app-data-migrations/migrate-native-working-context-snapshots-v5-migration.test.ts --no-watch` | `autobyteus-server-ts`; isolated real files/SQLite bootstrap | SCN-021 absent/zero-byte eligibility, exclusion, order, restore/continuation | Pass: 1 file / 6 tests | `api-rev-009-tcr-003-focused-final.log` |
| 3 | LLM phase + assembler + recovery state + runtime selection | `autobyteus-ts`; 4 files | SCN-020 broader stable-base and one-settlement regression | Pass: 4 files / 23 tests | `api-rev-009-request-recovery-broad.log` |
| 4 | Complete app-data migration/runtime selection | `autobyteus-server-ts`; 16 files | SCN-021 migration scanner/registry/repository/runner/runtime regression | Pass: 16 files / 71 tests | `api-rev-009-migration-broad.log` |
| 5 | `git diff --check`, source-delta check, cleanup, evidence credential scan | current worktree | Round-9 structural and execution hygiene | Pass | `api-rev-009-final-structural.log`; `api-rev-009-cleanup.log`; `api-rev-009-secret-leak-scan.log` |
| 6 | Prior full deterministic root E2E | repository root | Unchanged broad API/GraphQL/WebSocket/process surface | Retained Pass: 50 files / 175 tests; 14 files / 49 gated | `api-rev-008-root-deterministic-e2e-final.log` |
| 7 | Prior core build and server build-config TypeScript check | current implementation source | Unchanged production compile/runtime dependency surface | Retained Pass | `api-rev-008-core-build.log`; `api-rev-008-server-build-tsc.log` |

### Non-Authoritative Discovery Runs

- The initial focused stale run intentionally failed against obsolete assertions and established the replacement basis (`api-rev-008-stale-focused-discovery.log`).
- The first root run returned 49 passed / 1 failed files and exposed the final stale server-settings request call/assertion. The correction passed 10/10 and the final root run passed 50/50 executing files (`api-rev-008-root-deterministic-e2e.log`, `api-rev-008-server-settings-final.log`, final root log).
- An exploratory uncurated full core suite returned 423 passed / 35 failed files and 2,022 passed / 83 failed tests, with environment-gated skips and two MCP spawn errors (`api-rev-008-core-full-suite.log`). Remaining failures are pre-existing/out-of-scope broad harness/environment debt: missing `/opt/homebrew/bin/uv`, ambient provider/resolver configuration, stale unrelated LLM constructors/stream/parser/event expectations, and local model availability. All SR-015-related failures it exposed were corrected and passed authoritative focused/broad/build execution.
- A tests-inclusive full core TypeScript check also reports broad pre-existing test type debt (`api-rev-008-core-typecheck.log`). The authoritative production build configuration passed.

## Validation Confidence Scorecard

| Confidence Category | Post-Repository Score | Final Score | Change | Final Supporting Evidence | Residual Uncertainty |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 99% | 99% | 0 | Direct conversion/migration/restore/recovery and root E2E | No exhaustive product corpus inventory |
| Changed-boundary execution directness | 99% | 99% | 0 | Production converter, registry, runner, bootstrapper, assembler and phase invoked | None material |
| Cross-boundary integration realism and mock gap | 97% | 97% | 0 | Actual files, atomic migration path, ordinary runner, strict continuation and server E2E | Isolated fixtures rather than owner product data |
| Environment, configuration, identity, and fixture fidelity | 98% | 98% | 0 | Standalone/team metadata, run/member identity, old/current raw layouts, SQLite/app-data roots | Representative historical shapes, not exhaustive |
| Failure, edge-case, lifecycle, and recovery evidence | 99% | 99% | 0 | Invalid/unsupported/unsourced/conflict/zero/nonempty-lineage, thrown runner, render/provider restore, and direct final/Tool/interruption one-settlement evidence | Process crash between publication steps is out of scope |
| User-surface, browser, and desktop-shell confidence | N/A | N/A | N/A | No UI/browser/IPC/shell boundary changed | N/A |
| Durable regression coverage quality and relevance | 98% | 98% | 0 | Obsolete behavior replaced in existing owners; TCR-002/TCR-003 gaps now directly covered | Round-9 proportional re-review is pending |

- Overall post-repository confidence: `98%`.
- Overall final confidence: `98%`.
- Calculation method: rounded mean of the six applicable categories; no score overrides a critical criterion.
- Confidence change produced by broader validation: none numerically. API-REV-009 closes two durable-proof gaps through affected broader selections; API-REV-008 already established the unchanged lifecycle, root E2E, build, and real-model surfaces.
- Every critical acceptance criterion directly proven: `Yes`.
- Any final applicable category below `90%`: `No`.
- Default final confidence target of `95%` met: `Yes`.
- Confidence-limiting residual risks: no mutation of owner product data, non-exhaustive historical-shape sampling, unrelated old core live/harness debt, and explicitly out-of-scope process termination between publication steps.

## Broader Validation Decision And Execution

- Decision and execution mode: `Required and completed` through the affected broader request-recovery and migration/runtime selections.
- Material deviation from plan: `None`.
- Confidence gap addressed: direct settlement evidence on actual `LlmPhase` Tool/interruption branches and direct zero-byte-lineage migration eligibility.
- Full root/build rerun: `Not Required for this bounded local fix`. No production source, API contract, startup wiring, or cross-process code changed; API-REV-008 remains the authoritative passed full-root/build evidence.
- External live provider validation: `Not Required`. TCR-002 is deterministic request-checkpoint ownership after provider output enters `LlmPhase`; TCR-003 is deterministic filesystem migration eligibility. API-REV-007 remains the authoritative real DeepSeek/Qwen compactor evidence.
- Environment choices: worktree-only Vitest selections with isolated temp roots/SQLite initialization. `/Users/normy/.autobyteus/server-data/.env` was not read, sourced, modified, or imported; `.env.test` was not modified.

| Journey Step | Expected Observable Result | Actual Observable Result | Evidence | Result |
| --- | --- | --- | --- | --- |
| Tool retained outcome | Native Tool output path captures once, commits exact checkpoint once, never restores, and retains Tool message/raw provenance | Registered test Tool was ingested by real `LlmPhase`; exact spies and retained assistant Tool/raw trace passed | `api-rev-009-tcr-002-focused-final.log` | Pass |
| Interrupted retained outcome | Partial pre-fence output is retained; post-interrupt chunk is excluded; one capture/commit and zero restores | Real turn interruption rejected with `AgentInterruptionError`; composed User, partial Assistant and interruption raw provenance remained; exact settlement passed | `api-rev-009-tcr-002-focused-final.log` | Pass |
| Zero-byte migration eligibility | Existing zero-byte lineage is eligible like absent lineage and remains byte-exact empty | Strict-v5 publication, raw/manifest preservation, cleanup and idempotence passed for both parameter rows | `api-rev-009-tcr-003-focused-final.log` | Pass |
| Affected broader regression | Recovery and migration owner clusters remain green | Core 4/23 and server 16/71 passed | Round-9 broader logs | Pass |

## Desktop Application Validation

- Validation approach: `Not Applicable`.
- Browser/web-equivalent behavior: no changed UI or browser boundary.
- Shell-specific behavior: no Electron/preload/IPC/packaging boundary changed.
- Effect on an already-running desktop application: `None`.

## Platform / Runtime Targets

- Operating system: macOS `26.5.2` build `25F84`, Darwin `25.5.0`, arm64.
- Runtime/tooling: Node.js `v22.23.1`; pnpm `10.28.2`; repository-pinned Vitest/TypeScript/Prisma.
- Browser/engine: `N/A`.
- Locale/timezone/accessibility: backend/core behavior is locale-independent; execution timezone Europe/Berlin.

## Lifecycle / Upgrade / Restart / Persisted-Data Checks

- Approved persisted-data decision: `Migration Required` for exact metadata-classified native AutoByteus standalone/team snapshot locations with absent/zero-byte lineage; nonempty-lineage locations are excluded byte-for-byte.
- Representative data: schema v1/v3/v4/current-v5; standalone runId/team memberRunId; system/media/User/complete Tool; exact active raw facts; old compacted/current constituent; invalid JSON; unsupported schema; unsourced/incomplete/identity conflict; absent/zero/nonempty lineage.
- Migration result: valid candidates were strict-v5 validated then atomically published; exact obsolete memory files were cleaned; raw bytes/manifests were preserved; invalid identity did not mutate; no-survivor input published metadata-identified empty strict v5 with warnings.
- Completion/recovery: result statuses persisted through the ordinary repository; rerun/idempotence and warning retry passed; strict restore plus ordinary continuation passed.
- Version-specific normal-runtime branch, dual read/write, or fallback observed: `No`.
- Residual untested risk: exhaustive product corpus shapes and process termination between normal publication operations are outside approved scope.

## Tests Implemented Or Updated

| Path Group | Change | Boundary | Result |
| --- | --- | --- | --- |
| `native-working-context-snapshot-v5-converter.test.ts` | Added | Sole historical converter, identity/provenance/omission/Tool/media/empty candidate | Pass |
| `migrate-native-working-context-snapshots-v5-migration.test.ts` | Added cumulatively; updated in Round 9 | Standalone/team gate including direct absent/zero-byte rows, cleanup, raw preservation, registry pipeline, restore/continuation | Pass |
| App-data registry/runner/server startup and three token E2Es | Updated | Exact prerequisite order and ordinary nonblocking attempt/persist/continue behavior | Pass |
| Bootstrap/restore/incomplete-Tool/runtime integration owners | Updated | Strict v5-only restore, no raw replay/synthetic Tool repair, continuation/error behavior | Pass |
| Assembler/recovery/LLM phase and valid direct callsite owners | Updated | Stable-base identity; direct final/Tool/interruption exact-once settlement; canonical composed User | Pass |
| Server-settings GraphQL compaction journey | Updated | Current identity object and canonical `RequestPackage` field | Pass 10/10 and full root |

## Tests Removed As Stale Or Obsolete

| Path | Obsolete Assertion | Upstream Evidence | Replacement |
| --- | --- | --- | --- |
| `autobyteus-server-ts/tests/unit/app-data-migrations/reset-pre-lineage-memory-app-data-migration.test.ts` | Required destructive pre-lineage reset/deletion before current startup | SR-015 requires exact native conversion, not reset or compatibility restoration | New native migration suite plus registry/runner/strict restore coverage |

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage changed: `Yes — 2 Added, 18 Updated, 1 Removed`.
- Added:
  - `autobyteus-ts/tests/unit/memory/native-working-context-snapshot-v5-converter.test.ts`
  - `autobyteus-server-ts/tests/unit/app-data-migrations/migrate-native-working-context-snapshots-v5-migration.test.ts`
- Updated:
  - `autobyteus-server-ts/tests/e2e/server-settings/server-settings-graphql.e2e.test.ts`
  - `autobyteus-server-ts/tests/e2e/token-usage/token-usage-custom-provider-model-value-backfill-startup.e2e.test.ts`
  - `autobyteus-server-ts/tests/e2e/token-usage/token-usage-legacy-path-columns-drop-startup.e2e.test.ts`
  - `autobyteus-server-ts/tests/e2e/token-usage/token-usage-provider-name-snapshot-backfill-startup.e2e.test.ts`
  - `autobyteus-server-ts/tests/unit/app-data-migrations/app-data-migration-runner.test.ts`
  - `autobyteus-server-ts/tests/unit/app-data-migrations/raw-trace-active-file-name-migration.test.ts`
  - `autobyteus-server-ts/tests/unit/server-runtime-app-data-migration-gate.test.ts`
  - `autobyteus-ts/tests/integration/agent/incomplete-tool-call-resume-recovery.test.ts`
  - `autobyteus-ts/tests/integration/agent/memory-llm-flow.test.ts`
  - `autobyteus-ts/tests/integration/agent/memory-tool-call-flow.test.ts`
  - `autobyteus-ts/tests/integration/agent/read-media-file-continuation-flow.test.ts`
  - `autobyteus-ts/tests/integration/agent/runtime/agent-runtime.test.ts`
  - `autobyteus-ts/tests/integration/agent/working-context-snapshot-restore-flow.test.ts`
  - `autobyteus-ts/tests/unit/agent/llm-request-assembler.test.ts`
  - `autobyteus-ts/tests/unit/agent/loop/llm-phase-tool-protocol-recovery.test.ts`
  - `autobyteus-ts/tests/unit/memory/llm-request-recovery.test.ts`
  - `autobyteus-ts/tests/unit/memory/memory-tool-continuation-reasoning.test.ts`
  - `autobyteus-ts/tests/unit/memory/working-context-snapshot-bootstrapper.test.ts`
- Removed:
  - `autobyteus-server-ts/tests/unit/app-data-migrations/reset-pre-lineage-memory-app-data-migration.test.ts`
- Added/updated paths attached for proportional review: `Yes`, through the cumulative handoff reference-file list.
- Removed-path evidence: repository diff plus the stale discovery and replacement migration suite.

## Other Execution Artifacts

| Artifact | Purpose | Status |
| --- | --- | --- |
| `api-rev-009-tcr-002-focused-final.log` | Direct real-`LlmPhase` Tool/interruption settlement proof | Pass: 1/4 |
| `api-rev-009-tcr-003-focused-final.log` | Direct absent/zero-byte native migration proof | Pass: 1/6 |
| `api-rev-009-request-recovery-broad.log` | Affected request-recovery regression | Pass: 4/23 |
| `api-rev-009-migration-broad.log` | Affected migration/runtime regression | Pass: 16/71 |
| `api-rev-009-final-structural.log` | Diff/source-delta and evidence summary | Pass |
| `api-rev-009-cleanup.log` | Owned resource/process cleanup | Pass |
| `api-rev-009-secret-leak-scan.log` | Round-9 evidence credential-pattern scan | Pass |
| `api-rev-008-root-deterministic-e2e-final.log` | Prior unchanged broad server/API/process validation | Retained Pass |
| `api-rev-008-core-full-suite.log`, `api-rev-008-core-typecheck.log` | Prior disclosed uncurated/pre-existing debt | Retained; non-authoritative |

## Temporary Execution Methods / Scaffolding

| Method | Why Needed | Result | Cleanup |
| --- | --- | --- | --- |
| Vitest-created temp app-data roots and SQLite DB | Real file/migration/server lifecycle behavior | Pass | Exact owned residuals removed |
| In-memory migration repository inside durable integration test | Observe ordinary runner statuses deterministically while using real filesystem migration | Pass | Process-local only |

## Dependencies Mocked Or Emulated

| Dependency | Method | Rationale | Confidence Limitation |
| --- | --- | --- | --- |
| External LLM provider | Existing deterministic phase/renderer doubles | SR-015 changes request checkpoint/settlement, not provider semantics | Provider transport already covered in API-REV-007; no material gap here |
| Browser/desktop shell | Not used | No changed UI/shell boundary | None applicable |
| Product app-data corpus | Representative isolated metadata/raw/snapshot fixtures | Owner data must not be mutated; exact classification and shapes are deterministic | No exhaustive corpus inventory claim |

## Result Summary

| Result | Scenario IDs | Summary |
| --- | --- | --- |
| Pass | SCN-020 | Stable-base capture, exact restore/commit settlement, real Tool ingestion, retained interruption and canonical composed User passed. |
| Pass | SCN-021 | Exact absent/zero-byte conversion eligibility, migration/order/strict restore/continuation passed. |
| Pass | SCN-001–SCN-019 | Preserved affected contracts passed current broad/root execution; API-REV-007 real-model evidence remains valid. |

## Cleanup Performed

| Resource | Ownership | Action | Result |
| --- | --- | --- | --- |
| Server test SQLite DB and sidecars | API/E2E-created | Removed after final migration execution | Pass |
| Vitest/pnpm processes | API/E2E-created | Verified no owned process remains | Pass |
| Test-created OS temp roots | API/E2E-created | Suites removed their own exact roots; no matching residual found | Pass |
| Private `/Users/normy/.autobyteus/server-data/.env` | User-owned | Not read, sourced, modified, or imported | Preserved |
| Repository `.env.test` | Repository-owned | Not modified | Preserved |
| Round-9 evidence | Required retained evidence | Scanned for common assigned credential shapes | Pass; zero matches |

## Preliminary Classification

- `Pass / 98%`. `TCR-002` and `TCR-003` are resolved by direct durable assertions and passing focused/broader reruns.
- No production, design, requirement, compatibility, environment, or execution failure remains. Implementation review stays `CRR-012 Pass`; the next gate is proportional review of the two-path Round-9 test delta.

## Recommended Recipient

`code_reviewer` for separate proportional re-review of the two Round-9 updated durable paths. The cumulative SR-015 delta remains 20 added/updated paths and one removed stale path.

## Evidence / Notes

- `SCN-020` is the canonical request-recovery scenario; `SCN-021` is the canonical native migration scenario.
- The real Tool test registers a concrete deterministic test Tool rather than tolerating an unknown Tool; the global registry is restored in `finally`.
- Exact one-settlement means the phase calls capture once and commit once with the captured checkpoint, never calls restore on retained outcomes, and the recovery state owner separately rejects a second settlement.
- Zero-byte lineage is now a direct filesystem fixture, not an inference from absent lineage.
- API-REV-008 full-root/build and API-REV-007 real-model evidence remain valid because Round 9 changed test code only.

## Latest Authoritative Result

- Revision/result: `API-REV-009 / Pass / 98%`.
- Prior execution result: `API-REV-008 / Pass / 98%`; `CRR-013` did not invalidate it.
- Findings: `TCR-002 Resolved`; `TCR-003 Resolved`; no new failure ID.
- Default `95%` confidence target met: `Yes`; no applicable category below `90%`.
- Broader validation decision: `Required and completed` through affected core/server broader selections; unchanged full-root/build/live evidence retained.
- Critical acceptance criteria lacking direct proof: `None`.
- Production-source delta: `None`; Round-9 durable delta `0 Added / 2 Updated / 0 Removed`; cumulative `2 / 18 / 1`.
- Required next recipient: `code_reviewer` for proportional test-code re-review.
