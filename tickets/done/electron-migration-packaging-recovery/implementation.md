# Electron Migration And Packaging Recovery — Implementation

## Scope Classification

- Classification: `Medium`
- Reasoning: two bounded defects cross migration lifecycle, TeamRun filesystem admission/recovery, token evidence, reusable fixtures, web dependency classification, and full AppImage validation.
- Workflow Depth: prior implementation -> `UV-002` requirement re-entry -> design/runtime v8 -> `SR-005` -> architecture `ARCH-REV-008` / workflow rounds 14–15 `Go Confirmed` -> implementation re-entry.

## Upstream Artifacts

- `workflow-state.md`: Stage 6 implementation re-entry, edits unlocked
- `investigation-notes.md`: current
- `requirements.md`: `Refined`
- `proposed-design.md`: `v8`
- `future-state-runtime-call-stack.md`: `v8`
- `future-state-runtime-call-stack-review.md`: round 15 `Go Confirmed`
- `solution-revision-record.md`: `SR-005`
- `design-review-report.md`: architecture round 8 `Pass`
- `architecture-review-revision-record.md`: `ARCH-REV-008`

## Document Status

- Current Status: `Stage 6 Complete — Ready For Stage 7`
- Notes: design/runtime v8 passed architecture rounds 7–8 / workflow rounds 14–15; `IR-003` implements the validated-root Team history projection without changing runtime index-driven reads.

## Plan Baseline

### Preconditions

- Stable acceptance criteria: `Yes` (`AC-MIG-001`–`020`, `AC-PKG-001`–`005`, `AC-TEST-001`)
- Stage 5 evidence current: `Yes`
- All 14 use cases reviewed: `Yes`
- Unresolved blocking findings: `No`; `F-003`–`F-006` resolved
- Go Confirmed after two consecutive clean re-entry rounds: `Yes` (workflow rounds 14 and 15)
- Missing-use-case sweeps clean in final rounds: `Yes`

### Runtime Call-Stack Review Gate Summary

| Round | Result | Required Updates | New Use Case | Updates Complete | Classification | Re-Entry | State | Clean Streak |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Fail | Yes | `UC-MIG-008` | Yes in v2 | Design Impact | `3 -> 4 -> 5` | Reset | 0 |
| 2 | Pass | No | No | N/A | N/A | None | Candidate Go | 1 |
| 3 | Fail | Yes | No | Yes in v3 | Design Impact | `3 -> 4 -> 5` | Reset | 0 |
| 4 | Pass | No | No | N/A | N/A | None | Candidate Go | 1 |
| 5 | Pass | No | No | N/A | N/A | None | Go Confirmed | 2 |
| 6 | Pass | No | No | N/A | N/A | None | Candidate Go | 1 |
| 7 | Pass | No | No | N/A | N/A | None | Go Confirmed | 2 |
| Stage 6 preflight | Fail | Yes | No | Yes in design v5 | Design Impact | `3 -> 4 -> 5` | Reset | 0 |
| 8 | Fail | Yes | No | Yes in design v6 / `SR-002` | Design Impact | `3 -> 4 -> 5` | Reset | 0 |
| 9 | Pass | No | No | N/A | N/A | None | Candidate Go | 1 |
| 10 | Fail | Yes | No | Yes in `SR-003` | Design Impact | `3 -> 4 -> 5` | Reset | 0 |
| 11 | Pass | No | No | N/A | N/A | None | Candidate Go | 1 |
| 12 | Pass | No | No | N/A | N/A | None | Go Confirmed | 2 |
| 13 | Fail | Yes | No | Yes in design/runtime v8 / `SR-005` | Design Impact | `3 -> 4 -> 5` | Reset | 0 |
| 14 | Pass | No | No | N/A | N/A | None | Candidate Go | 1 |
| 15 | Pass | No | No | N/A | N/A | None | Go Confirmed | 2 |

### Go / No-Go Decision

- Decision: `Go`
- Final round: `15`
- Clean streak: `2`
- Implementation can start: `Yes`

### Spine-Led Dependency And Sequencing Map

| Order | Spine | Owner | Task | Depends On | Why |
| --- | --- | --- | --- | --- | --- |
| 1 | `DS-MIG-001,004` | Migration domain/runner | Generic prerequisite contract, topology, admission | None | Attempt boundary must be stable first. |
| 2 | `DS-MIG-001` | Migration definitions | Move custom provider and V1 to generic prerequisites; remove special guard | 1 | Removes duplicate authority. |
| 3 | `DS-MIG-005` | Team migration classifier | Add exhaustive read-only root state model | None | Root routing precedes conversions. |
| 4 | `DS-MIG-007` | V1 recovery | Extract protected predecessor source resolver | 3 | Shared source authority serves both migrations. |
| 5 | `DS-MIG-002,006` | Canonical migration/token index | Preflight states/sources and state-aware task mappings | 3,4 | Canonical must converge before V1. |
| 6 | `DS-MIG-003` | V1 migration | Consume classifier/resolver and generic prerequisite | 1,3,4,5 | Successor closes migration spine. |
| 7 | `DS-MIG-002,003,008` | Team app-data migration evidence | Extract existing canonical exact/segment converter into a general normalizer; delegate canonical, older projection, and V1 message planning | 6 | Failed V1 retry and existing migration consumers must share one exact-root translation owner before promotion. |
| 8 | Migration verification | Server tests | Exact/released/malformed matrix plus operational-equivalent retry/idempotency | 1-7 | Proves behavior without operational writes. |
| 9 | `DS-PKG-001` | Web build boundary | Manifest/lock/guard/test correction | None | Independent packaging owner; already complete. |
| 10 | `DS-PKG-002` | Artifact validation | Canonical build and packaged server lifecycle | 8,9 | Rebuild follows focused green migration tests. |
| 11 | `DS-MIG-009,010` | Current run-history projection/store | Extract current row projector and add immutable strict snapshot | 6 | Current schema and persistence authority precede migration sequencing. |
| 12 | `DS-MIG-009,010` | V1 history reconciler/orchestrator | Project, preserve, back up, atomically commit, and report | 11 | Existing migration owns the persisted cutover. |
| 13 | `DS-MIG-009,010` | Server tests | Missing/malformed/current/partial/idempotent projection coverage | 11,12 | Proves storage and cross-boundary behavior before executable validation. |

### File Placement Plan

| Item | Current | Target | Owner | Action | Verification |
| --- | --- | --- | --- | --- | --- |
| Root classifier | Implicit in canonical/V1 | `src/app-data-migrations/migrations/team-run-migration-state-classifier.ts` | Team migrations | Promote shared | Classification matrix |
| Protected source lookup | V1 private method | `.../team-run-execution-tree-v1/team-run-predecessor-source-resolver.ts` | V1 recovery | Promote shared | Interrupted-promotion tests |
| Prerequisite admission | Runner + provider-specific guard | Migration domain/runner only | Migration lifecycle | Consolidate/remove | Truth-table tests + reference scan |
| Scenario fixtures | Archived ticket | `autobyteus-server-ts/tests/fixtures/app-data-migrations/team-run-execution-tree-v1/` | Server tests | Copy durable scenarios and repoint tests | No ticket path references |
| Dependency boundary | Web production dependencies | Web devDependencies + guard | Web build | Reclassify | Prod graph + Nuxt/build tests |
| Execution-address conversion | Existing `convertLegacyConversationAddress` plus duplicated stored-address parsing in the older projection migration | `src/app-data-migrations/migrations/team-execution-address-normalizer.ts` | Team app-data migrations | Extract existing capability and reuse across three consumers; keep flat projection adaptation local | Normalizer matrix + canonical/older migration regressions + V1 package conversion |
| Team history row projection | Catalog-private `rowFromTree` | `src/run-history/services/team-run-history-index-row-projector.ts` | Current run history | Promote shared | Catalog + reconciler tests |
| Strict Team history input | Tolerant store read only | `src/run-history/store/team-run-history-index-store.ts` | Run-history persistence | Extend | Missing/malformed immutable snapshot tests |
| V1 history reconciliation | Missing | `.../team-run-execution-tree-v1/team-run-history-index-reconciler.ts` | V1 persisted transition | Create | Reconciler unit + migration integration |

### Implementation Work Table

| Change | Spine | Owner | Concern | Current | Target | Action | Depends | Status | Unit Test | Unit Status | Integration Test | Integration Status | Stage 8 | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `T-001` | `DS-MIG-001,004` | Runner/domain | Generic prerequisites/topology | types/runner/registry | same | Modify | None | Completed | runner test | Passed | N/A | N/A | Planned | Five-status truth table and registry topology enforced |
| `T-002` | `DS-MIG-001` | Migration definitions | Remove special guard | readable migration + guard | readable migration | Modify/Remove | T-001 | Completed | readable + runner tests | Passed | N/A | N/A | Planned | Special guard removed; generic declarations used |
| `T-003` | `DS-MIG-005` | Classifier | Four TeamRun states | implicit | new classifier | Create | None | Completed | classifier test | Passed | mixed migration test | Passed | Planned | Read-only four-state cohort model |
| `T-004` | `DS-MIG-007` | V1 recovery | Live/protected source resolution | V1 private method | new resolver | Move | T-003 | Completed | resolver test | Passed | interrupted promotion | Passed | Planned | Backup manifest/source authority validated |
| `T-005` | `DS-MIG-002,006` | Canonical/token | State/source-aware conversion and index | canonical/index/migrator | same | Modify | T-003,T-004 | Completed | canonical/token tests | Passed | mixed migration | Passed | Planned | Current V1 mapping uses validated package index |
| `T-006` | `DS-MIG-003` | V1 migration | State-aware promotion + prerequisite | V1 migration | same | Modify | T-001,T-003,T-004,T-005 | Completed | V1 test | Passed | mixed migration | Passed | Planned | Private fallback classification/source lookup removed |
| `T-007` | Test support | Server tests | Durable scenarios | ticket paths | server fixtures | Create/Modify | T-003-T-006 | Completed | four affected suites | Passed | migration suite | Passed | Planned | Server test references to ticket fixtures removed |
| `T-008` | `DS-PKG-001` | Web build | Production dependency boundary | manifest/lock/guard | same | Modify | None | Completed | web boundary test | Passed | Nuxt tests/generate | Passed | Planned | Installed production graph clean; workspace link unchanged |
| `T-009` | `DS-PKG-002` | Validation | AppImage lifecycle | N/A | evidence artifacts | Validate | T-001-T-008 | In Progress | N/A | N/A | canonical build/runtime | In Progress | Planned | Stage 7 uses disposable data only |
| `T-010` | `DS-MIG-002,003,008` | Team app-data migrations | Exact/released address normalization and V1 AgentRun resolution | canonical private converter + older migration duplicate + V1 strict parse | one shared normalizer + three consumers; projection flat adapter stays local | Create/Modify | T-006 | Completed | normalizer/canonical/older migration/V1 tests | Passed | mixed migration retry | Passed | Planned | No record reset, source rewrite, new migration ID, or runtime dual reader |
| `T-011` | `DS-MIG-001,003,008` | Server migration tests | Terminal-prerequisite failed-V1 retry and second-run inventory | existing synthetic cohort | operational-equivalent disposable cohort | Modify | T-010 | Completed | exact/released/malformed matrix | Passed | migration runner/integration fixture | Passed | Planned | Terminal attempts preserved; malformed cohort snapshot byte/path stable; successful second run no-op |
| `T-012` | `DS-MIG-009,010` | Run-history projection | One tree-to-current-index mapping | catalog private mapper | shared projector | Create/Modify | T-006 | Completed | catalog/reconciler tests | Passed | N/A | N/A | Planned | Tree owns overlap; summary/terminatedAt preserved |
| `T-013` | `DS-MIG-010` | Team history index store | Strict immutable source snapshot | tolerant read only | `readIndexStrict()` | Modify | None | Completed | store/reconciler tests | Passed | N/A | N/A | Planned | Missing is empty; malformed/unreadable throws |
| `T-014` | `DS-MIG-009,010` | V1 transition | Projection/equality/backup/atomic commit | missing | history reconciler | Create | T-012,T-013 | Completed | reconciler tests | Passed | mixed migration | Passed | Planned | No runtime scan or Agent-index write |
| `T-015` | `DS-MIG-009` | V1 orchestrator | Reconcile all validated current/promoted trees | packages only | existing V1 execute flow | Modify | T-014 | Completed | V1 migration test | Passed | mixed migration | Passed | Planned | Runs despite unrelated root details; failure stays retryable |
| `T-016` | `DS-MIG-009,010` | Server tests | Preservation, malformed atomicity, summary fallback, exact projection, idempotency | missing | durable unit/integration coverage | Create/Modify | T-012-T-015 | Completed | 10 focused tests | Passed | 7 integration tests | Passed | Planned | Stage 7 adds operational-copy/API/executable proof |

### Requirement / Spine / Test Traceability

| Requirements | Acceptance | Spines | Use Cases | Tasks | Stage 6 | Stage 7 |
| --- | --- | --- | --- | --- | --- | --- |
| `R-MIG-001`–`003` | `AC-MIG-001`, `002`, `009`, `010` | `DS-MIG-002,003,005` | `UC-MIG-002,003,005` | T-003,T-005,T-006 | Classifier/migration tests | `SCN-MIG-001,005` |
| `R-MIG-004`–`005` | `AC-MIG-005`, `006` | `DS-MIG-001,004` | `UC-MIG-001,006` | T-001,T-002,T-006 | Runner truth-table tests | `SCN-MIG-004` |
| `R-MIG-006` | `AC-MIG-003` | `DS-MIG-006` | `UC-MIG-007` | T-005 | Token index tests | `SCN-MIG-002` |
| `R-MIG-007`–`010` | `AC-MIG-004`, `007`–`010` | `DS-MIG-002,003,007` | `UC-MIG-001,004,005,008` | T-003-T-007 | Mixed/interrupted/idempotent tests | `SCN-MIG-003,005` |
| `R-MIG-011`–`014` | `AC-MIG-011`–`014` | `DS-MIG-001,003,008` | `UC-MIG-004,009` | T-010,T-011 | Address matrix + operational-equivalent retry/idempotency | `SCN-MIG-006,007` |
| `R-MIG-015`–`020` | `AC-MIG-015`–`020` | `DS-MIG-009,010` | `UC-MIG-010` | T-012-T-016 | Reconciler/store/catalog unit + mixed migration integration | `SCN-MIG-008` |
| `R-PKG-001`–`005` | `AC-PKG-001`–`005` | `DS-PKG-001,002` | `UC-PKG-001`–`003` | T-008,T-009 | Guard/web tests | `SCN-PKG-001`–`003` |
| `R-TEST-001` | `AC-TEST-001` | Migration spines | `UC-TEST-001` | T-007 | Fixture/path audit | `SCN-TEST-001` |

### Stage 7 Planned Coverage

| Acceptance | Expected Outcome | Scenario | Level | Status |
| --- | --- | --- | --- | --- |
| `AC-MIG-001,002,009` | Exact classifier matrix and byte preservation | `SCN-MIG-001` | API/test executable | Planned |
| `AC-MIG-003` | V1 nested task-Team mapping | `SCN-MIG-002` | API/test executable | Planned |
| `AC-MIG-004,007,008` | Mixed convergence + idempotent second run | `SCN-MIG-003` | E2E executable | Planned |
| `AC-MIG-005,006` | Prerequisite/attempt truth table | `SCN-MIG-004` | API/test executable | Planned |
| `AC-MIG-010` | No compatibility/runtime legacy path | `SCN-MIG-005` | Audit | Planned |
| `AC-MIG-011,013` | Exact/released address equivalence and malformed/root-mismatch preservation | `SCN-MIG-006` | API/test executable | Planned |
| `AC-MIG-012,014` | Terminal prerequisite counts + failed V1 retry + second-run inventory | `SCN-MIG-007` | E2E executable | Planned |
| `AC-MIG-015`–`020` | Validated-root exact projection, preservation, partial cohort, malformed atomicity, idempotency, unchanged runtime/API boundary | `SCN-MIG-008` | API/E2E executable | Planned |
| `AC-PKG-001,004` | Production graph and unchanged link | `SCN-PKG-001` | Executable | Planned |
| `AC-PKG-002` | Contract-backed web behavior/generation | `SCN-PKG-002` | E2E/test executable | Planned |
| `AC-PKG-003`–`005` | AppImage build and server lifecycle | `SCN-PKG-003` | E2E executable | Planned |
| `AC-TEST-001` | Durable fixtures and no ticket test paths | `SCN-TEST-001` | Audit/test executable | Planned |

### Decommission Tasks

| Task | Item | Action | Verification |
| --- | --- | --- | --- |
| `DEL-001` | `custom-provider-readable-id-prerequisite-guard.ts` | Remove | No imports/references; runner tests cover behavior |
| `DEL-002` | Guard-specific test | Remove | Generic runner/registry coverage |
| `DEL-003` | V1 private `readCurrentPackage()` and broad residue fallback | Remove | Classifier/V1 tests and reference scan |
| `DEL-004` | V1 private `resolvePredecessorSources()` | Move | Shared resolver used by canonical/V1 |
| `DEL-005` | Ticket paths in four server test files | Remove references | `rg` audit |
| `DEL-006` | Canonical `convertLegacyConversationAddress` plus older migration `currentAddress`/stored-address segment reconstruction | Extract into one migration-owned normalizer; all stored exact/segment consumers delegate; projection-only flat fallback remains local | Reference scan + canonical/older migration/V1 tests |

### Step-By-Step Plan

1. Implement and test generic prerequisite contract/topology/admission.
2. Migrate custom-provider and V1 declarations; remove the special guard.
3. Implement classifier and protected predecessor source resolver with focused tests.
4. Route canonical/token/V1 through those owners and test mixed/interrupted/idempotent behavior.
5. Relocate all referenced scenarios into server fixtures and run affected suites.
6. Reclassify the web contracts dependency, update lockfile, extend the build guard/test, and run focused web validation.
7. Extract the existing canonical exact/segment converter into the general migration execution-address normalizer; delegate canonical and stored-address parsing in the older migration, keep its flat projection fallback local, and use the shared owner in V1 predecessor communication planning.
8. Add exact/released/malformed/root-mismatch unit coverage and an operational-equivalent terminal-prerequisite/failed-V1 retry integration scenario.
9. Run Stage 6 combined unit/integration checks, cleanup/reference/size audits, then re-enter Stage 7 and rebuild the AppImage.
10. Extract the current Team history row projector, add the store-owned strict snapshot, implement the V1 reconciliation boundary, and verify missing/malformed/preserved/idempotent behavior.
11. Run operational-copy workspace-history validation and rebuild/relaunch the AppImage in Stage 7.

### Guardrails

- Backward compatibility introduced: `None`
- Runtime legacy reader introduced: `No`
- Metadata fabrication or broad missing-file skip: `No`
- Workspace link mutation workaround: `No`
- Authoritative boundary: runner alone admits migration attempts.
- Shared structures: discriminated states and source paths stay narrow.
- File placement: classifier and execution-address normalizer under migrations; backup resolver under V1 recovery.
- Released address parsing remains migration-only; target V1/runtime state contains AgentRun IDs only.
- Terminal `20260701`/`20260801` records are never reset or rerun; no replacement migration ID is introduced.
- Terminal `20260521` is unchanged; `20260814` alone reconciles the Team index. Runtime remains index-driven and no Team member is added to standalone Agent history.
- Source size baseline: runner 219, canonical 136, token index 191, V1 migration 186, readable migration 327 effective lines. Any file approaching 500 or >220 changed lines triggers split/review.

### Test Strategy

- Unit: runner truth table/topology, classifier matrix, source resolver, predecessor/current token mappings, V1 routing, exact/released/malformed communication-address normalization, and older migration regression.
- Integration: mixed cohort convergence, interrupted promotion, terminal-prerequisite failed-V1 retry, byte/backup/attempt idempotency, and web boundary manifest.
- Stage 7: canonical AppImage build, production graph/link snapshot, packaged server migration/health/shutdown.
- Operational `/home/ryan-ai/.autobyteus/server-data`: read-only; never used as a mutation target.

## Execution Tracking

### Kickoff Preconditions

- Workflow Stage 6 and edits unlocked: `Yes`
- Requirements/design/call stack current: `Yes` (requirements Refined; design/runtime v8)
- Go Confirmed: `Yes` (workflow rounds 14–15; `ARCH-REV-008`)
- Blocking findings: `None`

### Progress Log

- 2026-08-16: Stage 6 baseline finalized; implementation begins with `T-001`.
- 2026-08-16: Generic prerequisite admission, four-state classifier, protected predecessor resolver, canonical/token/V1 integration, durable fixtures, and packaging boundary completed.
- 2026-08-16: Source build check passed; 47 focused migration tests, 17 fixture-consumer tests, 23 focused web tests, Electron Nuxt generation, and Electron/build TypeScript compilation passed.
- 2026-08-16: Mixed-state integration proved a second run changes no bytes/paths/backups and increments no attempts. Stage 7 real AppImage/lifecycle validation started.
- 2026-08-16: Stage 10 real-data verification exposed `UV-001`; Requirement Gap re-entry completed through Refined requirements, design/runtime v4, and clean review rounds 6–7.
- 2026-08-16: Stage 6 re-entry baseline finalized; `T-010` begins with the migration-owned communication-address normalizer while prior completed work remains intact.
- 2026-08-16: Before any `T-010` source edit, preflight found existing canonical exact/segment conversion plus duplicated projection parsing. Classified as Design Impact, returned to Stage 3, locked source edits, and revised ownership in v5 to one general normalizer with three consumers and a local projection-only flat adapter.
- 2026-08-16: Design/runtime v6, `SR-003`, and architecture/workflow clean rounds 11–12 reached Go Confirmed; Stage 6 source edits unlocked and `T-010` resumed.
- 2026-08-16: Added `team-execution-address-normalizer.ts`; canonical structured conversion, older projection conversion, and V1 communication planning now delegate exact/segment values to it while the flat projection adapter remains local.
- 2026-08-16: 58 focused migration tests passed across eight files, including terminal `20260701`/`20260801` success plus failed V1 retry, released/null-optional address conversion, whole-cohort malformed preservation, and second-run byte/path/backup/attempt idempotency.
- 2026-08-16: `tsc -p tsconfig.build.json --noEmit` passed. The repository's broader `pnpm typecheck` remains blocked by its pre-existing `rootDir: src` plus `include: tests` TS6059 configuration and was not treated as a change failure.
- 2026-08-16: Code review `CRR-004` found `SRC-001`; local `IR-002` now preserves prior null-as-absent optional member path/route semantics, with 24 affected tests and build TypeScript passing before source re-review.
- 2026-08-16: `UV-002` re-entered requirements/design after eight validated V1 packages existed but only two Team history rows were indexed; design/runtime v8 passed clean rounds 14–15 after `F-006` tightened strict snapshot ownership.
- 2026-08-16: `IR-003` extracted the current Team history row projector, added immutable strict index snapshots, added the V1 history reconciler, and invoked it from the existing `20260814` migration.
- 2026-08-16: 15 focused unit/integration tests passed across reconciler, V1 migration, catalog/store, and mixed migration suites; server `build:full` and sanitized bootstrap smoke passed. Broad `tsc --noEmit` remains blocked only by the recorded pre-existing TS6059 rootDir/include mismatch.

### Downstream Status

| Stage | Artifact | Status | Notes |
| --- | --- | --- | --- |
| 7 | `api-e2e-testing.md` | Ready | `SCN-MIG-008` plus prior executable/package scenarios are inputs. |
| 8 | `code-review.md` | Not Started | Source/test review after Stage 7. |
| 9 | `docs-sync.md` | Not Started | Migration/build docs impact assessed after review. |

### Blocked Items

None.
