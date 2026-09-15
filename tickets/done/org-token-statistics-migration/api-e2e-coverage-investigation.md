# API/E2E Coverage Investigation

## Meta and authority
Round 1, initial CRR-001 implementation-review Pass; no prior API result/confidence exists. Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/org-token-statistics-migration`, branch `codex/org-token-statistics-migration`, reviewed source eb306a0916b48e3251f6a2d8176703f9ebf9e1dd; base d60f74c21e4e4cf5ee23b97cb51cfa42bed3b009.
Canonical package: this directory. Inputs: requirements-doc.md (approved SR-003), investigation-notes.md (INV-001–007; INV-006 withdraws success hook), solution-revision-record.md (SR-001–004), design-spec.md (DS-001), intake-analysis-reference.md (historical only), solution-handoff.md, design-review-report.md, architecture-review-revision-record.md (ARCH-REV-001 Pass), implementation-handoff.md, implementation-revision-record.md (IR-001), implementation-checks.md/local log, code-review-report.md, code-review-revision-record.md (CRR-001)/checks log. No normative supplement. Delivery result/revision: N/A — not yet performed.
Current investigation and eventual execution report are authoritative, not review scores. API-REV-001 will be written at completion. Ledger: api-e2e-test-case-ledger.md, initialized before execution.

## Routing
Medium task / High architectural risk; Reviewed route. Successful output goes to Code Reviewer for proportional review of any durable test changes. No source implementation edits, live-profile operations, success-ledger reset, desktop launch/stop, commit, merge or push planned. Eventual integration target remains requirements/flat-agent-organization-model, NOT personal.

## Changed surfaces and requirement mapping
| Boundary | Change / preserved behavior | AC / scenario | Planned direct evidence |
| --- | --- | --- | --- |
| Persisted data / startup lifecycle | Same family migration after existing legacy token materialization; independent token/history source selection | AC-001/002/006, SCN-001/002 | Existing registry tests plus integrated legacy-to-current SQLite → same family → full restore → command/response/token projection journey |
| SQL domain | Exact three attribution fields only; checkpoint/cost/accounting/facets unchanged; native and absent controls | AC-003/004, SCN-001–003 | Actual SQLite migration/store tests plus batch boundary additions |
| Recovery / admission | Root atomic rollback; retained markers/index dependency effects; incompatible token state rejected before scope build | AC-005/008, SCN-004 | Existing SQL trigger/rename/index/retirement/cycle tests, rerun independently |
| Filesystem and selected indexes | Metadata-only exclusion; candidate-owned attachments preserved; no global current Org rebuild | AC-007/008, SCN-005 | Instrumented existing tests and exact referenced-current-Org lookup addition |
| API/presentation | Unchanged current event contract receives corrected persistent summary | AC-001/003/006 | Real Org/Agent execution and event pipeline with deterministic external backend emulation, no warning suppression |
| Browser/desktop renderer | No component, routing or browser storage changed | Indirect token user-surface risk only | Prefer contract/event projection evidence first; browser only if it closes an identified remaining gap |
| Electron shell / auth / worker-distributed | Not changed | N/A | No actual desktop or unrelated authentication test required |

## Execution discovery / safety
Read root README.md, server README.md, server AGENTS.md, root/server package.json, server vitest.config.ts and tests/setup/prisma-{env,global-setup,test-config}.ts. Vitest runs Node forks serially; use `vitest run ... --no-watch`. Global setup resets only assigned worktree tests/.tmp DB (verify configured path before run). `prepare:shared` regenerates required SDK/core builds; Prisma client generated already, regenerate if needed. Source build tsconfig.build.json is supported scoped compiler check; default test-inclusive TS6059 remains disclosed, not a passing full typecheck.
Setup: `pnpm -C autobyteus-server-ts prepare:shared`; checks from server directory. Disposable fixture DB/memory via tests/helpers/org-family-migration-fixtures.ts, explicit Prisma datasources, fs.mkdtemp and cleanup. No secrets needed for deterministic provider emulation, no remote paid provider calls. Do not read or mutate actual user conversations/profile. Test-owned process/global state must be restored. No service ports required for in-process path; use ephemeral loopback only if a transport probe becomes needed.

## Persisted transition basis
Migration Required, per DS-001 steps 1–11 and implementation-handoff Persisted Data Transition Check. Released nested Team metadata/sidecars/history plus nonzero token ledger/current records; target neutral Team attribution across all three fields. Current runtime stays strict; no compatibility-only test added. Token-only ordinary rerun and failed/interrupted work are supported; successful-ledger reopening and speculative global cross-cohort scans are not.

## Existing durable coverage decisions (before edits)
| Paths under server tests | Validity | Evidence/action |
| --- | --- | --- |
| unit/app-data-migrations/agent-org-token-attribution-transition.test.ts | Still Valid | Exact SQLite/accounting/native/settled participant/absent/rollback and duplicate/advancing adapter assertions match AC-002–005. Restore sentinel is correctly limited, not full AC-006. Retain. |
| unit/app-data-migrations/agent-org-history-candidate-safety.test.ts | Still Valid | Instrumented 21 MiB excluded content, no-candidate/index-only semantic preservation and seven durable failure phases/cycles match AC-007/008. Retain. |
| unit/app-data-migrations/agent-org-context-file-locator-transition.test.ts | Still Valid | Candidate archives/typed locators/bytes/retries; excluded synthetic links remain untouched per SR-003. Retain and add exact referenced-current-Org case. |
| unit/app-data-migrations/app-data-migration-{registry,runner}.test.ts; token-usage-run-records-v1* | Still Valid | Prerequisite order, same ID, success skip and materialization. Retain. |
| unit/token-usage; integration/token-usage; unit/agent-org-execution; unit/agent-team-execution/team-agent-token-usage-event-transport.test.ts | Still Valid | Fold/accounting/projection/runtime current guards and integration. Run relevant affected suites, distinguish mocked lifecycle cases. |
| e2e/runtime/token-usage-runtime-graphql.e2e.test.ts | Still Valid, optional live provider scope | Explicit opt-in external runtime/credentials; does not itself cover migrated Org. Do not enable ambient authenticated provider or assume skipped tests pass. |
| e2e/token-usage GraphQL/record restart suites | Still Valid | Downstream presentation/query checks; run appropriate no-secret paths after narrow checks. |

No removal, replacement or obsolete assertion identified. No source changes planned.

## Durable coverage decisions
- API-C02: Add boundary-focused durable tests for >250 source roots and exact member reads including a second-page contradiction; actual SQLite, rollback and retry (AC-004/005).
- API-C03: Add exact referenced-current-Org attachment lookup test preserving unrelated content-I/O exclusion (AC-007).
- API-C05/06: Add durable integrated migrated-Org continuation tests for first legacy materialization and token-only ordinary rerun (AC-001/002/003/006). Reuse fixture mechanics. Real current manager/scope/Agent run and token persistence/presentation; emulate only unavailable external backend dependencies and disclose limits.
- Existing broad unit and relevant integration/E2E checks retained; no temporary-only test substitutes for an automatable critical journey.

## Execution plan
API-C01 prepare/shared and focused existing suites; API-C02 SQL batches; API-C03 exact lookup; API-C04 broader affected repository suites/compiler; then confidence assessment and API-C05/06 integrated lifecycle/emulated-provider paths if still required. See initialized ledger for case commands and checkpoints. Each meaningful case completion is recorded before the next case.

## Confidence and broader gate
Not scored before execution. Initial known critical gap is complete migration→restore→continuation/token path. Broader validation provisionally Required (Lifecycle / deterministic external provider emulation), rather than browser/desktop: changed ownership is server persisted state and event acceptance, not shell behavior. Scores and final decision will be filled from actual execution, with no Pass while a critical criterion remains unproven. Live-provider/app-shell and global startup attachment readiness are not covered by local migration evidence.

## Repository evidence and mandatory intermediate confidence gate
API-C01 54/4 focused pass; API-C02 2/1 actual SQL batches pass after fixing copied fixture surrogate IDs; API-C03 exact reference 1/1 pass. API-C04 389/74 pass initially plus one restart setup error (`TEST_SERVER_BUILD_REQUIRED`); documented full server build passed, then built-server GraphQL restart passed (1/1), giving 390 successful relevant tests across 75 files across the initial command and focused rerun. Source compiler and diff check pass. Registry/order/success-skip coverage actually lives in `unit/app-data-migrations/definition-nonmutation-startup.test.ts` (included in broad suite), not a nonexistent registry-named file. No test skipped is counted as proof.

| Mandatory category | Post-repository score | Basis / remaining gap / next evidence |
| --- | --- | --- |
| Requirement and acceptance-criteria proof | 50% | Critical AC-001/006 complete migrated continuation still missing; API-C05/06 required |
| Changed-boundary execution directness | 95% | Actual SQLite and files, exact three fields, faults and selected I/O; runtime full integration remains |
| Cross-boundary integration realism/mock gap | 75% | Real persistence and separate built HTTP restart but migration/restore/provider lifecycle not yet joined |
| Environment/configuration/identity/fixture fidelity | 95% | Explicit isolated DB/memory and sanitized owned child servers; no live profile |
| Failure/edge/lifecycle/recovery | 95% | Root rollback, SQL batches, rename/index/dependencies/markers and true process restart covered |
| User-surface/browser/desktop-shell | 75% | Current adapter/GraphQL data proven separately; actual Org response outstanding; shell itself unchanged |
| Durable regression relevance/quality | 95% | Requirement-linked existing suite plus batch and exact lookup; integrated durable tests authored, not yet run |

Overall 82.86% (580/7); clean target not met; critical direct proof missing. Broader validation **Required**: lifecycle via real manager/scope/AgentRun/pipeline/SQLite/Org event presentation, deterministic external backend rather than live authenticated provider. Explicit backend emulation means not a live Codex response. Prefer this mode over browser because browser cannot close an absent server lifecycle chain. No Electron-specific boundary changed, no app process touched. Planned fixture-only price/display lookup and unrelated file relay/MCP no-ops are disclosed. Exact preserved external thread binding and real local history inspection/recording required. API-C05 first upgrade and API-C06 token-only rerun executed individually and checkpointed below.

### Coverage decision update before shared fixture edit
Targeted compiler for the four added durable files (temporary `.api-e2e-tsconfig.json`, extends production tsconfig.build.json with rootDir `.` and selected tests) exposed one existing imported fixture TS2740: `tests/helpers/token-usage-run-record-fixtures.ts` noLookupPricingPolicy omitted six current nullable pricing-schedule metadata fields. Decision **Needs Update**: add explicit null values to match current `ResolvedTokenPricingPolicy`, no pricing behavior change. Preserve existing passthrough policy and all scenarios; rerun affected token coverage. This is API-owned fixture correction, not implementation/design rework. No production file changes.
API-C07 added: final durable suite + targeted source-equivalent test compiler after fixture correction; all new tests run together to detect mock/state leakage. A full default test-inclusive typecheck is still not claimed.

## Final investigation state — API-REV-001
API-C05 and API-C06 each Pass; API-C07 final combined regression **402 tests / 79 files Pass**, no skips. Full server build (including sanitized bootstrap smoke), source-only compiler, selected-test compiler and whitespace check Pass. Selected-test compiler initially found local assertion typing mistakes and the existing shared fixture shape omission; all corrected. Its final config extends production `tsconfig.build.json` (paths cleared), not the default test-inclusive config. Default test-inclusive TS6059 is still an upstream-disclosed limitation, not silently fixed or passed.

Final confidence: **95%**, simple average of seven applicable 95% categories; detailed scorecard in api-e2e-execution-coverage-report.md. All critical ACs directly exercised at changed server boundaries; no scope-builder sentinel or fake token fold used in new integrated journeys. External backend **emulated**, price/display lookup deterministic. No live Codex/Claude response, user-profile validation, browser rendering or Electron-shell execution claimed. These unchanged external boundaries are residual validation limits, not evidence of a missing migration outcome. Additional browser/desktop validation Not Required for this backend-only change: real current response/token DTOs and separate built HTTP/GraphQL restart exercise the affected presentation/data contract; no renderer or shell changed. Broader lifecycle work was Required and completed, not retroactively classified unnecessary.

Added durable paths (server-relative):
1. tests/integration/app-data-migrations/agent-org-token-batch-boundaries.integration.test.ts
2. tests/integration/app-data-migrations/agent-org-exact-reference.integration.test.ts
3. tests/e2e/app-data-migrations/agent-org-token-continuation.e2e.test.ts
4. tests/helpers/org-migration-continuation-fixtures.ts
Updated: tests/helpers/token-usage-run-record-fixtures.ts (six explicit nullable metadata fields only). Removed: none. No implementation file edited. Proportional test-code review Required, reviewed Medium/High route.

Cleanup: test fixture DB/memory removed by fixture finalizers; owned built child servers terminated by their test harness, exact process-path check found none remaining. Early continuation fixture inherited `/workspace`, creating **only** a metadata registration in this worktree's server/workspaces.json (birth and mtime 2026-09-15 16:14:42 +02:00). Selected fixture now sets workspaceRootPath null; exact one-entry test-created registry removed, without touching `/workspace` or other registry entries. Generated untracked application SDK dist directories and temporary compiler config removed. Existing worktree test DB/build cache retained according to normal project execution. No user profile/ledger/app operation. Logs retained in this ticket, including initial failed attempts and their local resolutions. No reroute finding; Pass package ready for returned rule recipient.
