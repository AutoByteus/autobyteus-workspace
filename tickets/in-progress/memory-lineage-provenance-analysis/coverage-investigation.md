# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-lineage-provenance-analysis/tickets/in-progress/memory-lineage-provenance-analysis/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-lineage-provenance-analysis/tickets/in-progress/memory-lineage-provenance-analysis/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-lineage-provenance-analysis/tickets/in-progress/memory-lineage-provenance-analysis/design-spec.md`
- Supplemental Task Artifacts:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-lineage-provenance-analysis/tickets/in-progress/memory-lineage-provenance-analysis/memory-context-and-lineage-contract.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-lineage-provenance-analysis/tickets/in-progress/memory-lineage-provenance-analysis/use-case-data-flow-spine-map.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-lineage-provenance-analysis/tickets/in-progress/memory-lineage-provenance-analysis/provenance-methodology-analysis.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-lineage-provenance-analysis/tickets/in-progress/memory-lineage-provenance-analysis/compacted-memory-message-role-analysis.md`
- Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-lineage-provenance-analysis/tickets/in-progress/memory-lineage-provenance-analysis/solution-revision-record.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-lineage-provenance-analysis/tickets/in-progress/memory-lineage-provenance-analysis/design-review-report.md`
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-lineage-provenance-analysis/tickets/in-progress/memory-lineage-provenance-analysis/architecture-review-revision-record.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-lineage-provenance-analysis/tickets/in-progress/memory-lineage-provenance-analysis/implementation-handoff.md`
- Implementation Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-lineage-provenance-analysis/tickets/in-progress/memory-lineage-provenance-analysis/implementation-revision-record.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-lineage-provenance-analysis/tickets/in-progress/memory-lineage-provenance-analysis/code-review-report.md`
- Code Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-lineage-provenance-analysis/tickets/in-progress/memory-lineage-provenance-analysis/code-review-revision-record.md`
- Delivery Revision Record (delivery re-entry only): `N/A`
- Relevant Delivery Revision IDs: `N/A`
- API/E2E Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-lineage-provenance-analysis/tickets/in-progress/memory-lineage-provenance-analysis/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- Current Investigation Round: `1`
- Trigger: `CRR-002` implementation-source review `Pass` for `IR-002`, commit `394885c1090cfc8313f2864a2dbca541575bec2f`
- Prior Investigation Reviewed: `N/A`
- Latest Authoritative Investigation: This file, round 1

## Current Requirement And Design Basis

The validation basis is SR-004 and ARCH-REV-004, implemented through IR-002 and source-reviewed in CRR-002. The critical behavior is the current-schema-only native memory path:

1. A normal successful compaction requires non-empty newly selected raw-backed `R(n)`, archives exactly those active raw records, persists one-to-three episodes plus at most twenty semantics, then appends one reference-only lineage record. The valid lineage tail is the sole current-compaction authority.
2. Recurrent compaction is `M(n) = compact(M(n-1) + R(n))`. `M(n-1)` is visible to the compactor but is not re-archived; only the bounded complete `M(n)` is current.
3. The typed run-scoped resolver must distinguish direct from recursive roots, return `not_found` for unknown typed IDs, and fail integrity validation for broken current-format chains.
4. Finalized WorkingContext and schema-v5 snapshot own messages, media/tool payloads, and message-local constituent ranges only. No snapshot/state/manifest field owns compaction or output identity.
5. The required startup reset deletes exactly four pre-lineage derived files while preserving raw evidence. Required failures are durably recorded, aggregate across attempted migrations, reject `startConfiguredServer`, and prevent built-in bootstrap, app construction, and listen.
6. A supported native interruption writes a trusted raw `operation_boundary`; after the reset removes the snapshot, no-snapshot/no-lineage bootstrap restores that fence with raw/turn provenance, excludes untrusted variants, retains active natural history, writes valid v5, and carries the fence into the next follow-up request.
7. Compactor input is one natural, reasoning-free, ID-free, reserved-boundary-safe conversation block. Native compaction and generated Work Evidence share only the condensed readable value/tool-body policy; their source models and envelopes remain separate.
8. Event Monitor remains active-only, Work Evidence remains archive-plus-active, and external runtimes remain evidence-only for this ticket.

Critical acceptance criteria are `AC-003` through `AC-009`, `AC-011`, `AC-012`, `AC-014`, and `AC-015`. The required scenario set is `SCN-001` through `SCN-016`.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 / active raw evidence and Event Monitor | Preserved | REQ-001/002/008; AC-001/002 | Retain active-only projection/cursor coverage and prove no new snapshot/archive fallback. |
| BEH-002–003 / accepted compaction publication | Changed | REQ-003–005; AC-003/005/006; SCN-002/010/011 | Replace strategy-mutation fixtures with manager-owned accept/commit and exact archive/output/lineage assertions. |
| BEH-004 / typed origin resolution | Added | REQ-006; AC-004/012; SCN-012 | Add durable direct/root, dedup, not-found, and integrity scenarios. |
| BEH-005 / exact-head recurrent context | Changed | REQ-007; AC-007; SCN-003–007 | Replace mixed retrieval expectations and cover C1/C2 plus long-chain bounded current output. |
| BEH-006 / reset, v5, no-snapshot recovery | Changed | REQ-008; AC-008/009; SCN-008 | Remove gate/v4/rebuild fixtures; add current-only restore, exact reset, runner aggregation, real startup non-exposure, and trusted interruption recovery. |
| BEH-007 / explicit scope/provider wiring | Changed | REQ-009; design scope map | Cover standalone/team-member scope and provider resolution failure before acceptance. |
| BEH-008 / reachable failure/retry | Preserved and tightened | AC-011; SCN-013 | Prove runner/parser failure is pre-write and pending compaction ID is reused. |
| BEH-009 / compactor conversation | Changed | REQ-010; AC-014; SCN-015 | Replace obsolete labels/reasoning/call-ID assertions with one-boundary natural golden. |
| BEH-010 / shared presentation | Changed | REQ-011; AC-015; SCN-016 | Add redaction/serialization/omission/no-outcome goldens in core and Work Evidence. |
| External runtime evidence | Preserved | AC-010; SCN-009 | Reuse existing cross-runtime storage coverage; no native compaction claim. |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | Memory planning, proposal, acceptance, persistence, lineage, restore, rendering | Core Vitest unit/integration | Current suite is stale and lacks new owners | Durable integration |
| API / transport / contract | Yes, internal | Server origin service, compactor launch metadata, startup promise | Server unit/integration | No public GraphQL/UI provenance API is in scope | Server executable integration |
| Frontend component / state | No | No UI source changed | Existing projection coverage only | None introduced | None |
| Browser integration / user journey | No material web boundary | Interrupt command originates in UI, but changed behavior is core/server persistence and recovery | Existing UI/server command routing and backend interrupt coverage | Browser would not directly prove disk lineage/reset semantics | Not selected |
| Authentication / session / permissions | No | No auth behavior changed | Existing server suites | None material | None |
| Desktop renderer / web-equivalent UI | No | No renderer change | N/A | N/A | None |
| Desktop shell / Electron-specific integration | No | Startup change is server process, not Electron shell | Server lifecycle path | Electron adds no unique evidence for this ticket | None |
| Process / lifecycle | Yes | Required migrations gate real server startup; interrupt/reset/bootstrap/follow-up | Runner and runtime tests | Real caller non-exposure and reset-spanning resume missing | Lifecycle integration |
| Persisted-data transition | Yes | Four derived files discarded; raw evidence direct-use | Migration and file-store code | Exact product-path deletion/failure/idempotence evidence missing | Filesystem lifecycle |
| Worker / queue / distributed coordination | No | None | N/A | N/A | None |
| External integration | Optional credentialed evidence added | LLM compactor is exercised with deterministic runner doubles and through an imported-vault OpenAI run | Existing runner adapters plus built-server/WebSocket execution | Subjective provider summary quality is not an acceptance criterion | Credential-backed lifecycle |

## Project Execution Discovery

- Assigned task worktree / workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-lineage-provenance-analysis`
- Project type and runtime stack: pnpm TypeScript monorepo; Node `v22.23.1`; pnpm `10.28.2`; core/server Vitest `4.0.18`; Fastify server; file-backed memory; Prisma test setup for server suites.
- Conflicting, missing, or unclear project instructions: The core package has no `test` script but owns `vitest.config.ts`; use `pnpm exec vitest`. Server `AGENTS.md` requires `vitest run --no-watch` for non-watch execution. No browser or desktop execution is required because the changed boundary is backend/process/file persistence.
- Required environment variables or secrets available: `N/A` for deterministic scope. Server tests use `.env.test` and isolated test SQLite. External-provider credentials are not needed and unconfigured capabilities must not be represented as passed.

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| workspace `README.md` | Monorepo development/E2E | `pnpm test:e2e`; real-provider E2E is separately gated; development state must not be used for tests. |
| workspace `package.json` | Root scripts | `pnpm test:e2e` filters server `tests/e2e`. |
| `autobyteus-server-ts/AGENTS.md` | Closest server test instruction | Use `pnpm -C autobyteus-server-ts exec vitest run ... --no-watch`. |
| `autobyteus-server-ts/README.md` | Environment and lifecycle | Tests use `.env.test` and `tests/.tmp`; deterministic E2E is separate from `pnpm dev`; unavailable external capabilities are not passes. |
| `autobyteus-server-ts/vitest.config.ts` | Server runner | Node environment, forks, non-parallel files, Prisma setup/global setup. |
| `autobyteus-ts/vitest.config.ts` | Core runner | Node environment, `tests/setup.ts`, 20-second test timeout. |
| implementation handoff environment notes | Worktree dependency setup | Temporary `node_modules` symlinks to the main workspace are acceptable and must be removed after execution. |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Core package | `autobyteus-ts` | temporary dependency symlink; `pnpm build`; `pnpm exec vitest run ... --no-watch` | File-backed tests use temp dirs | build/test exit status | tests remove temp dirs; remove symlink |
| Server package | `autobyteus-server-ts` | temporary dependency symlink; build current core; server Vitest | `.env.test`, test-owned SQLite and temp dirs | test/global setup success | Vitest teardown; remove symlink |
| Real server startup boundary | Server Vitest process | invoke exported `startConfiguredServer` with hoisted module doubles around non-target setup | Must prove migration gate without opening a port on failure | promise rejection + spy order | no listener starts; mocks reset |
| Native runtime interrupt journey | Core Vitest integration | deterministic controllable LLM + real AgentRuntime/MemoryManager/file stores | No external provider; owned temp app data | runtime reaches idle/interrupted/follow-up | stop runtime; remove temp dir |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Standalone/team-member memory trees | Temp filesystem fixtures | Exact four derived files plus byte-recorded raw files/manifests | Test teardown recursive delete |
| Migration statuses | In-memory repository fixture | No production DB | Test-local |
| Current compaction chains | FileMemoryStore + FileCompactionLineageStore in temp dirs | Deterministic raw IDs and output rows | Test teardown recursive delete |
| Interrupted native turn | Existing controllable LLM/runtime harness | No provider/network access | Runtime stop and temp-dir removal |
| Work Evidence package | Existing projection service temp fixture | Generated files only under temp dir | Test teardown recursive delete |

## Persisted Data Transition Coverage Basis

- Approved decision: Raw evidence and current-format state are `Directly Usable — No Migration`; pre-lineage episode/semantic/snapshot/manifest are `Discard or Rebuild`.
- Design-spec and implementation-handoff references: design-spec `Persisted Data / State Transition Decision`, `Migration Plan`; implementation handoff `Persisted Data Transition Check`; REQ-008/AC-009.
- Representative existing-data setup and required behavior: standalone plus direct/nested team-member run directories containing all four obsolete derived files, active raw trace, completed archive raw trace, and raw manifest; missing-target rerun; forced deletion/discovery failure.
- Evidence planned: exact file deletion/preservation, byte comparison, idempotent skips, `FAILED` not warning-success, durable attempted results, typed runner throw, real `startConfiguredServer` rejection, and bootstrap/build/listen non-invocation.
- Migration-specific completion/recovery scenarios: `N/A` because the approved outcome is discard/rebuild, not content migration. The required app-data migration is the lifecycle boundary implementing the discard.
- Upstream ambiguity or reroute required: None.

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/tests/unit/memory/compacted-memory-schema-gate.test.ts` | v4 gate/reset/manifest behavior | Removed by REQ-008 | Stale / Remove | Import fails because production owner was deleted intentionally | Remove with no compatibility replacement; replace at startup migration/v5 boundary |
| `.../working-context-snapshot-serializer.test.ts` | v4 superset tolerance and loose message shape | AC-008/009 current-only v5 | Replace | Current serializer rejects pre-v5 and requires finalized provenance | Rewrite for v5 structural/tool/media/emoji ranges and strict invalid cases |
| `.../working-context-snapshot-bootstrapper.test.ts` and integration restore | schema gate, v4 cache, rebuild from old memory | AC-008/009; CR-PREM-001 | Replace | Old mocks omit lineage; assertions require removed paths | Rewrite for valid v5, absent-lineage active bootstrap, trusted boundary, untrusted exclusion, head-without-snapshot failure |
| `.../compacted-memory-context-projector.test.ts` | top-K retriever owns current projection | AC-007/008 | Replace | Retriever call is intentionally gone | Assert exact passed tail bundle and canonical composed user output |
| `.../working-context-compaction-prompt-builder.test.ts` | section labels, work notes, call IDs, unmatched result | AC-014 | Replace | All five assertions encode removed prompt contract | Rewrite as SCN-015 golden |
| parser/normalizer/summarizer tests | `episodic_summary`, tolerant extras, old metadata | AC-003/006/011 | Needs Update | Exact `episodes` contract rejects old shape | Update current schema, bounds, strict rejection, metadata hash/provider |
| planner tests | old `headMessages` plan shape | AC-007/014 | Needs Update | New plan keeps system in `units` and separates compacted-memory raw refs | Update expected units/R(n)-only archive |
| strategy registry/structured strategy tests | `compact()` with store mutation | proposal ownership | Replace | Strategy now exposes `propose()` only | Update construction and IDless/no-write assertions |
| pending executor tests | replacement context returned by strategy; manager without lineage | AC-003/011 | Replace | New baseline/accept/commit path requires real lineage/store | Rebuild around real file-backed manager and current proposal; cover retry non-mutation |
| file store and snapshot persistence tests | compacted manifest / loose provenance | AC-003/008 | Needs Update | Imports deleted source | Remove obsolete assertions and use current provenance/store APIs |
| tool protocol repairer tests | loose message provenance helper | AC-005/007/008 | Needs Update | Helper deleted; behavior remains | Port to current provenance API |
| existing raw archive, manager, tool, working-context tests that pass | active/archive/tool behavior | AC-001/003/007 | Still Valid | 85 tests passed in discovery run | Retain; strengthen current manager path separately |
| existing AgentRuntime interruption integration | native interrupt fence and follow-up without reset | CR-PREM-001 | Still Valid, Extend | Real runtime path exists | Add reset-spanning no-snapshot bootstrap/follow-up |
| server app-data migration runner tests | duplicate/stale/list behavior | AC-009 | Still Valid, Extend | Runner suite lacks aggregate required-result gate | Add all-attempt persistence and startable status cases |
| server Work Evidence projection tests | archive+active, reasoning omission, tool correlation | AC-015 | Still Valid, Extend | Existing path is direct but lacks long/redaction/no-outcome goldens | Add SCN-016 golden |
| Event Monitor projection and cursor tests | active-only source and cursor expiry | AC-002 | Still Valid | Existing run-history unit/E2E paths target active reader | Execute focused suites and retain |
| cross-runtime memory persistence tests | evidence-only external runtime | AC-010 | Still Valid | No changed semantic compaction claim | Execute relevant integration |

Discovery evidence: `pnpm exec vitest run tests/unit/memory tests/integration/memory --no-watch` reproduced the handoff baseline exactly: `17` failed / `14` passed files and `28` failed / `85` passed tests. Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-lineage-provenance-analysis/tickets/in-progress/memory-lineage-provenance-analysis/evidence/api-e2e/discovery-core-memory-suite-before.log`.

## Stale Or Obsolete Coverage Decisions

| Path / Scenario | Obsolete Assertion | Why It Is Obsolete | Upstream Evidence | Replacement Coverage | No-Replacement Rationale |
| --- | --- | --- | --- | --- | --- |
| `compacted-memory-schema-gate.test.ts` | runtime gate clears/accepts old derived state | Startup reset is sole historical filename owner; no runtime gate exists | REQ-008, AC-009, design removal plan | Reset migration + strict v5/bootstrap tests | Direct unit replacement of the deleted class would protect invalid compatibility |
| snapshot serializer v4 case | direct v4 superset read | Pre-v5 is discarded, never decoded | REQ-008, AC-008/009 | v5 strict root/message provenance cases | No tolerant legacy reader |
| snapshot restore rebuild cases | old-row/top-K/full-corpus fallback | Absent lineage means no memory; head requires exact rows/snapshot | REQ-007/008 | no-lineage active bootstrap + head integrity tests | No archive replay or inferred memory |
| prompt labels/work notes/call IDs | mechanical prompt/storage grammar | Natural context, no reasoning/IDs, one XML boundary | REQ-010, AC-014 | SCN-015 current golden | Old assertions are explicitly forbidden |
| `episodic_summary` and stale extras | tolerant old compactor response | Exact current schema only | REQ-005, clean-cut removal log | current parser/normalizer tests | No alias compatibility |
| strategy `compact()` and direct store mutation | strategy owns persistence/replacement | Strategy is IDless proposal-only | REQ-004/005 | proposal + manager accept/commit integration | Old seam violates owner boundary |
| mixed retriever current projection | historical top-K determines current | Lineage tail lists exact current rows | REQ-007/008 | exact current loader/projector tests | Retriever remains only for unrelated recall |

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Requirement / Acceptance Criteria / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| SCN-002/007/010/011 | C1/C2 accept/commit, R(n)-only archive, exact tail, 1–3/20 bounds, 1,000-record bounded head | AC-003/006/007 | core lineage/accepted-compaction integration tests | Central persistence invariant is new |
| SCN-012 | direct/root resolver, dedup, typed not-found, broken record/archive/output/cycle | AC-004/005/012 | core lineage resolver tests | New query boundary |
| SCN-008 | exact reset + runner + caller non-exposure + startable statuses | AC-008/009 | server migration/runner/startup tests | Critical lifecycle gate |
| SCN-008 / CR-PREM-001 | real native interrupt fence across snapshot deletion and no-lineage bootstrap into follow-up | AC-009 plus preserved safety contract | core AgentRuntime integration extension | Critical rework premise |
| SCN-015 | natural compactor prompt golden | AC-014 | core prompt/renderer tests | Old suite asserts the opposite |
| SCN-016 | shared renderer and Work Evidence golden | AC-015 | core presentation tests + server projection test | Shared low-level policy and separate envelopes |
| SCN-001/014 | active-only Event Monitor/cursor retained | AC-002 | execute existing run-history focused tests; add only if a gap is found | Preserved boundary must not regress |
| Scope/provider | standalone/team-member scope and provider failure before accepted output | REQ-009 | server factory/resolver tests | Product wiring changed |

## Durable Coverage To Update

| Scenario ID | Existing Path / Scenario | Required Update | Requirement / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| SCN-003–007 | existing planner/projector/manager/snapshot tests | current plan shape, exact bundle, canonical ranges/media/tool | AC-007/008 | Preserve valid tool/media cases |
| SCN-013 | pending executor, strategy, parser/summarizer | proposal/accept/commit and same-ID retry with zero file/context mutation | AC-011 | Use real file-backed seams where possible |
| SCN-015 | prompt builder | one XML block, escaped source tags, no reasoning/IDs, Tool result/error, long values | AC-014 | Golden should assert order and forbidden text |
| SCN-016 | Work Evidence projection | long message/args/result/error, secrets, short value, no-outcome, file/manifest/source invariants | AC-015 | Keep existing timestamped lowercase envelope |
| SCN-008 | snapshot/bootstrap/restore | valid v5 + strict failure shapes + trusted active recovery | AC-008/009 | Do not add v4 support |

## Durable Coverage To Remove

| Existing Path / Scenario | Removal Reason | Requirement / Design Evidence | Replacement Or No-Replacement Decision |
| --- | --- | --- | --- |
| `autobyteus-ts/tests/unit/memory/compacted-memory-schema-gate.test.ts` | Production owner and behavior intentionally removed | REQ-008; design removal plan | Replaced by reset migration and current-only restore coverage |

## Repository Coverage Execution Plan And Results

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| 0 | `pnpm exec vitest run tests/unit/memory tests/integration/memory --no-watch` | `autobyteus-ts`; discovery before test maintenance | Existing-suite validity | Expected discovery failure: 17 failed / 14 passed files; 28 failed / 85 passed tests | `evidence/api-e2e/discovery-core-memory-suite-before.log` |
| 1 | Focused changed core suites, then the whole current memory suite | `autobyteus-ts`; worktree core | SCN-002–008, SCN-010–013, SCN-015–016 | Pass: final 33 files / 148 tests | `evidence/api-e2e/core-memory-suite-current-02.log` |
| 2 | `pnpm exec vitest run tests/integration/agent/runtime/agent-runtime.test.ts --no-watch` | `autobyteus-ts`; deterministic controllable LLM, real runtime/file stores | SCN-008 trusted interrupt/reset/bootstrap/follow-up plus runtime regression | Pass: 1 file / 12 tests | `evidence/api-e2e/core-agent-runtime-integration-current-02.log` |
| 3 | lineage/resolver and 1,000-tail focused suites | `autobyteus-ts` | SCN-007 and SCN-012 long-chain current-tail/direct-root/integrity | Pass: 18 focused tests; final 1,000-tail test 8/8 | `evidence/api-e2e/lineage-resolver-suite-01.log`; `evidence/api-e2e/lineage-1000-current-output-01.log` |
| 4 | migration/runner/startup-gate/scope/origin/Work Evidence focused suites | `autobyteus-server-ts`; current worktree core | SCN-008, SCN-016, scope/provider wiring | Pass: 7 migration, 1 startup-gate, 8 scope/origin, and focused Work Evidence scenario | `evidence/api-e2e/server-migration-suite-01.log`; `server-startup-migration-gate-02.log`; `server-scope-origin-suite-01.log`; `work-evidence-presentation-01.log` |
| 5 | broader affected server unit/integration selection | `autobyteus-server-ts`; current worktree core linked and built | Migration, origin, launch/provider, presentation, Event Monitor/current integration regression | Pass: 12 files / 62 tests | `evidence/api-e2e/server-affected-unit-integration-current-core-02.log` |
| 6 | memory/run-history GraphQL E2E selection | `autobyteus-server-ts`; isolated Prisma/temp app data | SCN-001, SCN-014, memory view/explorer and active-only projection | Pass: 4 files / 18 tests | `evidence/api-e2e/server-memory-run-history-graphql-e2e-01.log` |
| 7 | current-contract server-settings and guarded migration E2E | `autobyteus-server-ts` | Registered strategy uses manager accept/commit; required failure aggregates | Pass: 2 files / 12 tests | `evidence/api-e2e/server-stale-e2e-current-contract-fix-01.log` |
| 8 | `pnpm build` (core); `tsc -p tsconfig.build.json --noEmit`; `pnpm build` (server) | core/server with worktree core resolution | Compile/package/bootstrap integration | Pass | `evidence/api-e2e/core-build.log`; `server-typecheck-current-core.log`; `server-build-current-core.log` |
| 9 | actual-built-server secret/startup E2E | `autobyteus-server-ts`; freshly built server | Successful required migrations remain startable across real process startup/restart | Pass: 2 files / 8 tests | `evidence/api-e2e/server-actual-startup-secret-e2e-current-build-01.log` |
| 10 | `pnpm test:e2e` | root; full deterministic server E2E after current build | Broad API/process/filesystem regression | 47 files / 164 tests passed, 14 files / 49 tests skipped; one unrelated managed-gateway process-spawn flake failed, then its isolated 2-test file passed immediately | `evidence/api-e2e/root-test-e2e-current-03.log`; `server-managed-gateway-recovery-rerun-01.log` |
| 11 | `pnpm secrets:import -- --source /Users/normy/.autobyteus/server-data/.env --database-url file:/.../autobyteus-server-ts/db/api-e2e-live-compaction.db --dry-run`, then the same command with TTY confirmation | root; isolated owned SQLite database and adjacent vault key | Project-authoritative credential provisioning without ambient `.env` fallback or value output | Pass: dry run planned 9 creates; execution configured 9 secrets | `evidence/api-e2e/live-provider-secret-import-dry-run.log`; `live-provider-secret-import-execution.log` |
| 12 | temporary credential-backed built-server/WebSocket compaction journey | Fresh current server build; OpenAI `gpt-5.4-mini`; parent-run `llmConfig.compaction_ratio=0.0001`; isolated runtime/database/workspace | Real provider C1/C2, manager publication, recurrent predecessor, archive/output/lineage, v5 snapshot, and streamed product events | Pass: 2 turns, 2 linked lineage records, 2 distinct non-empty archives, 1 episode and 4 semantics per record, v5 snapshot | `evidence/api-e2e/live-provider-compaction-journey-01.log` |

Execution-maintenance notes:
- The first root E2E attempt could not build two workspace SDK packages because their package-local dependencies were not linked in the worktree. Temporary links to the installed main-workspace dependency trees were added; both SDK builds passed, and the links were removed after execution.
- The first actual-server E2E broad run used a stale server `dist`; a fresh server build made all startup-secret scenarios pass. This was an execution setup issue, not a product defect.
- Two server E2E assertions were stale under the approved current contract: one created a lineage-less manager/old `compact()` strategy, and one expected `runPending()` to return a failed required result instead of throwing the typed aggregate. Both were updated and pass.
- `tsc -p tsconfig.json --noEmit` is not a usable repository check because that file includes `tests` while fixing `rootDir` to `src`, causing TS6059 for the entire test tree. The authoritative build config and full server build pass.
- An initial live setup applied the `0.0001` trigger through the documented process-global environment override. That also affected the built-in Memory Compactor agents and recursively triggered their own compaction, so the owned server was stopped and its runtime deleted. The successful target journey scoped the same low ratio to the parent run's supported `llmConfig`; compactor agents retained their normal threshold. This is recorded as a test-setup correction, not as evidence that a process-global ultra-low ratio is production-safe.

## Post-Repository Confidence Scorecard (Mandatory)

This score reflects focused and broad repository evidence before the two selected lifecycle journeys were counted as broader validation.

| Confidence Category | Score | What Supports The Score | Remaining Uncertainty | Additional Validation That Could Improve It |
| --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 94% | All SCN-001–016 have mapped durable coverage and affected suites are green | Reset-spanning interrupt and real startup exposure still needed direct lifecycle execution at this gate | Execute selected lifecycle journeys |
| Changed-boundary execution directness | 93% | Real file stores, manager accept/commit, resolver, serializer, migration and GraphQL paths execute | Caller/process sequencing had not yet been counted | Execute real runtime and server-start caller |
| Cross-boundary integration realism and mock gap | 90% | Core integration and server API tests cross store/service/GraphQL boundaries | Provider is deterministic and startup failure uses controlled non-target doubles | Execute actual built-server success plus exported caller failure path |
| Environment, configuration, identity, and fixture fidelity | 94% | Project Vitest configs, Prisma, temp app data, standalone/team scopes | Worktree dependencies required temporary links | Build current packages and preserve setup evidence |
| Failure, edge-case, lifecycle, and recovery evidence | 93% | Retry non-mutation, integrity errors, deletion failure, wrong/blank boundaries and v5 failures are durable | Full interrupt/reset/follow-up sequencing remained | Execute lifecycle journey |
| User-surface, browser, and desktop-shell confidence | N/A | No UI, renderer, browser, preload, IPC, window or packaging behavior changed | None material to this ticket | N/A |
| Durable regression coverage quality and relevance | 96% | Stale compatibility assertions were replaced, not bypassed; current scenarios use exact contracts | Proportional test-code review is downstream | Code-review stage |

- Overall post-repository confidence: `93%`
- Calculation method: Simple mean of the six applicable categories, rounded to the nearest whole percent. The N/A UI/desktop category is excluded.
- Every critical acceptance criterion directly proven: `No` at this intermediate gate; the two selected lifecycle journeys remained.
- Any applicable category below `90%`: `No`
- Default clean-confidence target of `95%` met: `No`
- Material residual risks at this gate: caller/process sequencing for required migration failure; cancellation fence survival across actual reset/no-snapshot bootstrap and follow-up.

## Broader Validation Decision (Mandatory)

- Decision: `Required` — completed during execution round 1.
- Selected execution mode: `Lifecycle` plus broader `API/process E2E` and an imported-vault credential-backed built-server/WebSocket compaction journey.
- Specific confidence gap or residual risk addressed: real native interruption through trusted raw boundary, reset, no-snapshot/no-lineage bootstrap and follow-up; exported `startConfiguredServer` non-exposure on required failure; actual built-server startability; API projections over active memory; and real-provider C1/C2 execution through product creation, streaming, compactor launch, publication, and persisted v5 state.
- Why the selected mode materially improved confidence: these paths cross runtime eventing, file persistence, bootstrap, migration, application construction, server process, GraphQL, WebSocket, managed-secret resolution, and provider boundaries that isolated helper tests cannot prove.
- Expected confidence after selected validation: at least 95% overall with no applicable category below 90%.
- Browser-specific decision and rationale: Browser validation was not selected. The changed state is backend/process/file persistence, UI interrupt routing is unchanged, and a browser cannot observe lineage/reset/provenance ownership more directly than the durable runtime and server lifecycle paths.
- If `Not Required`: `N/A`
- If `Blocked`: `N/A`

## Desktop Application Validation Decision

- Desktop framework / shell: Electron exists elsewhere in the product but is not a changed boundary.
- Relevant instructions: workspace/server READMEs and server `AGENTS.md`.
- Web-equivalent behavior: no renderer change; memory/run-history GraphQL boundaries were exercised directly.
- Shell-specific or lifecycle behavior: no preload/IPC/window/package behavior changed; server lifecycle was validated without launching Electron.
- Chosen validation approach: core/server lifecycle plus GraphQL/process E2E.
- Effect on any already-running desktop application: None.
- Behavior not directly proven and confidence consequence: Electron wrapping was not run and causes no material deduction for this backend-only change.

## Live Environment And Fixture Plan

Completed as planned:
- built current core/shared SDKs and the current server;
- used deterministic controllable LLM/runtime fixtures, real file-backed memory stores, isolated SQLite/app-data roots and actual built-server child processes;
- used the project importer to copy configured provider credentials value-safely from the user-authorized owner-private source into a test-owned SQLite/vault pair, then executed two real OpenAI-backed native turns with a parent-scoped low compaction ratio;
- used standalone, direct team-member and nested team-member scopes;
- captured Vitest/build logs under `evidence/api-e2e`;
- stopped owned child processes, removed the live database/vault/runtime/workspace and owned test databases/temp workspace/dependency links, removed the temporary probe, and restored the main workspace's server-to-core link.

## Temporary Executable Validation Plan And Results

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Retention Decision |
| --- | --- | --- | --- |
| Structural clean-cut audit | Source/diff inspection plus current-only suite | No v4 gate/manifest/state-pointer compatibility was restored | Material result retained here and in reports; no scratch harness retained |
| Package resolution | Temporary worktree dependency links, then current core/server builds | Tests/builds resolved the implementation under review rather than stale main-core output | Links removed; setup evidence retained |
| Broad process E2E | Root `pnpm test:e2e` and isolated rerun of a non-target flaky process suite | All target API/lifecycle scenarios passed; unrelated transient spawn failure was non-reproducible | Logs retained |
| Credential-backed live compaction | Temporary value-safe built-server/GraphQL/WebSocket harness over an isolated imported vault | Two real provider turns published C1/C2 with correct predecessor, separate archives, bounded outputs, provider/model metadata and v5 snapshot | Harness and live state removed; value-free summary/import logs retained |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Process termination between archive/output/lineage/snapshot writes | Explicitly out of scope; no supported journal/recovery contract | Known non-atomic residual | None for this ticket |
| Subjective live-provider summary quality | Acceptance criteria specify schema/bounds/lineage, not paid-provider semantic evaluation | Low/out of scope | Future evaluation ticket if desired |
| Frontend provenance screen | Explicitly out of scope and no UI was added | None | None |

## Ambiguities Or Reroute Triggers

| Issue | Classification | Evidence | Recommended Recipient |
| --- | --- | --- | --- |
| None | N/A | SR-004/ARCH-REV-004/CRR-002 remained coherent; all target scenarios passed | N/A |

## Investigation Decision

- Proceed To API/E2E Execution: `Yes` — completed.
- Repository-Resident Durable Coverage Added / Updated / Removed: `Yes`
- Post-repository confidence: `93%`
- Broader validation decision: `Required — completed`
- Reroute Required Before Validation Execution: `No`
- Recommended Recipient If Reroute Required: `N/A`
- Notes: The final result and post-lifecycle score are authoritative in `execution-coverage-report.md`; no compatibility path was added to green stale expectations.
