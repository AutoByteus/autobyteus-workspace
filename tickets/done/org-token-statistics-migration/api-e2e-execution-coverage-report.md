# API/E2E Execution Coverage Report

## Latest authoritative result
**Pass — API-REV-001, 95% validation confidence.** Initial round, 2026-09-15. Medium task / High architectural risk retained. Required broader lifecycle validation completed using a scripted external backend, **not a live provider response**. No production-source changes or live-profile operations.

Final combined command: **402 tests / 79 files passed, zero skips**, 66.50s. Full server build/sanitized bootstrap, source compiler, selected-test compiler and whitespace checks pass. Ready for Code Review's proportional durable-test review, not delivery/final user acceptance.

## Meta / upstream package
Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/org-token-statistics-migration`, branch `codex/org-token-statistics-migration`; reviewed source eb306a0916b48e3251f6a2d8176703f9ebf9e1dd, package f9d86fcdb, base d60f74c21e4e4cf5ee23b97cb51cfa42bed3b009. No commit/push/merge. Eventual target requirements/flat-agent-organization-model, NOT personal.
All artifact names below resolve in `/Users/normy/autobyteus_org/autobyteus-worktrees/flat-agent-organization-model-base/tickets/done/org-token-statistics-migration`:
- Approved requirements-doc.md SR-003; investigation-notes.md INV-001–007; solution-revision-record.md SR-001–004; design-spec.md DS-001.
- intake-analysis-reference.md historical supplement; solution-handoff.md; no normative Product/UI supplement.
- design-review-report.md / architecture-review-revision-record.md ARCH-REV-001 Pass.
- implementation-handoff.md / implementation-revision-record.md IR-001; implementation-checks.md / implementation-local-checks.log.
- code-review-report.md / code-review-revision-record.md CRR-001 Pass; code-review-checks.log.
- API canonical investigation: api-e2e-coverage-investigation.md; ledger: api-e2e-test-case-ledger.md; history: api-e2e-revision-record.md API-REV-001.
Prior API result/confidence: **N/A**; no prior record existed. Delivery/DR and API test-review report: N/A — not yet performed.

## Investigation / plan / routing
Investigation and ledger persisted before durable edits or execution. Plan followed; discovered registry test name corrected to definition-nonmutation-startup.test.ts. Missing built-server setup, new fixture/assertion mistakes and existing shared fixture typing omission were fixed locally with evidence retained. No implementation failure or upstream behavior gap identified. API-C07 added for final combined/typechecking confirmation. Every meaningful completed case checkpointed; no case left running/unresolved.
Reviewed route, Medium/High. Successful output: Code Reviewer; proportional test-code review **Required** for five durable paths. No independent source-review reopening requested.

## Changed boundary / acceptance matrix and ledger reconciliation
| Case / result | Supported scenarios / AC | Direct evidence and boundaries | Log |
| --- | --- | --- | --- |
| API-C01 Pass | SCN-001–005, AC-002–005/007/008 | 54/4 focused checks: real SQLite three-field correction, >2^53 exact sentinel, checkpoint/digest/revision/timestamp/cost/facet preservation; native/absent/task controls; trigger rollback; marker/index/cycle retries; excluded-content I/O; runner success skip | api-e2e-focused.log |
| API-C02 Pass | SCN-003/004, AC-004/005 | 501 exact roots over three 250-root pages with duplicate claimants; 501 members including second-page conflict and whole-root rollback; third-page readiness corruption rejection; zero-write repeat and exact accounting | api-e2e-batches.log |
| API-C03 Pass | SCN-005, AC-007 | Candidate references existing current Org attachment; exact owner tree read/byte stat only, zero owner descendant enumeration/content reads/writes; deliberately invalid unrelated history ignored; referenced bytes and trace preserved | api-e2e-exact-reference.log |
| API-C04 Pass after setup correction | SCN-001–005, AC-001–008 supporting regression | 389/74 tests initially pass; one built-server test could not start before build. Documented full build then real child-process HTTP/GraphQL restart test passes. Registry/order/success skip, token materialization, Org lifecycle, projection/native controls included | api-e2e-regression.log, api-e2e-build.log, api-e2e-restart.log |
| API-C05 Pass | SCN-001, AC-001/003/006 | Real legacy SQL ledger materialization/deletion → same family migration → strict package load/token guard → real Org scope and mounted flat Team → lazy real AgentRun restore with same external thread → two commands/scripted backend responses → default event pipeline/actual SQLite fold → current Org presentation DTO → real external-runtime memory recorder. Duplicate zero-write; advancing total 120→240 and cost .0357→.0714; Org stays active, response/history/thread retained | api-e2e-continuation-first.log |
| API-C06 Pass | SCN-002, AC-002/003/006 | Same full production server lifecycle after already-moved history and newly materialized stale source attribution; family history phase reads only tree/index metadata, zero content/write/descendant traversal; same replay/advance/presentation outcome | api-e2e-continuation-rerun.log |
| API-C07 Pass | All relevant ACs | Final combined 402/79, no skips, including both new journeys and seven additional existing app-migration integration tests; no cross-test state leakage observed; selected-test compiler exit 0 | api-e2e-final-tests.log, api-e2e-test-typecheck.log |

Ledger final event API-C07 Completed Pass reconciled. Initial C05/C06 filtered runs skip only the counterpart; final combined run exercises both. No final failed/blocked/unstarted case.

## Exact commands / environment
Working directory for all root commands: assigned worktree above.
```bash
pnpm -C autobyteus-server-ts prepare:shared
pnpm -C autobyteus-server-ts build
pnpm -C autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit
pnpm -C autobyteus-server-ts exec vitest run tests/unit/app-data-migrations tests/unit/token-usage tests/unit/agent-org-execution tests/unit/agent-team-execution/team-agent-token-usage-event-transport.test.ts tests/integration/token-usage tests/integration/app-data-migrations tests/e2e/app-data-migrations/agent-org-token-continuation.e2e.test.ts tests/e2e/token-usage/token-usage-record-restart-graphql.e2e.test.ts tests/e2e/token-usage/token-usage-ledger-graphql.e2e.test.ts --no-watch
git diff --check
```
Logs record narrower commands/attempts. Selected-test compiler command: `pnpm -C autobyteus-server-ts exec tsc -p .api-e2e-tsconfig.json --noEmit`; temporary config (removed after successful run):
```json
{"extends":"./tsconfig.build.json","compilerOptions":{"rootDir":".","noEmit":true},"include":["tests/e2e/app-data-migrations/agent-org-token-continuation.e2e.test.ts","tests/helpers/org-migration-continuation-fixtures.ts","tests/integration/app-data-migrations/agent-org-exact-reference.integration.test.ts","tests/integration/app-data-migrations/agent-org-token-batch-boundaries.integration.test.ts"],"exclude":[]}
```
Create that config in the server directory to reproduce. This is a selected-test/source-build-settings check, **not** the default test-inclusive check. Default tsconfig.json TS6059 limitation remains as disclosed upstream. Initial experiment extending default tsconfig also pulled core source checks; production build config avoids claiming an unrelated global fix.

macOS Darwin arm64; local Node v22.23.1, pnpm 10.28.2, Vitest 4.0.18, Prisma 5.22.0/SQLite. No browser/device target. Runtime tests use disposable mkdtemp DB/memory, explicit Prisma client; documented global setup resets this worktree's tests/.tmp/autobyteus-server-test.db. Real HTTP restart uses project test-runtime-bootstrap.mjs, sanitized environment, unique test DB/runtime paths, ephemeral loopback port, ready-log signal and owned child stop. No secrets/provider accounts required or called. After cleanup regenerate prepare:shared before repeating (untracked generated SDK outputs removed).

## Confidence scorecard
Scores use skill anchors and equal-weight average; not a statistical guarantee or review score.
| Mandatory category | Post-repository | Final | Supporting delta / residual limit |
| --- | ---: | ---: | --- |
| Requirement / acceptance-criteria proof | 50% | 95% | Missing critical integrated journeys now execute migration, full restore, command and valid response/token projection. Native/absent/task and recovery controls covered separately. No live-profile proof |
| Changed-boundary execution directness | 95% | 95% | Real SQLite transactions, production metadata/files/indexes and real Org/Agent/pipeline; no source-boundary mock replaces correction or guard |
| Cross-boundary realism / mock gap | 75% | 95% | Files→SQL→scope→mounted Team/Agent→default pipeline→Org DTO→recorded history joined; real separate built HTTP restart. External backend event source is scripted; external provider adapter/service behavior unchanged and not certified |
| Environment / configuration / identity / fixture fidelity | 95% | 95% | Real strict released/current fixtures and same external-thread restore context, deterministic prices, explicit isolated stores and owned sanitized child processes; no user data or credentials |
| Failure / edge / lifecycle / recovery | 95% | 95% | Atomic SQL fault/contradictions, pagination, rename/index/source-marker/dependency cycles and truthful retry; failed-token restore guarded before materialization. Not concurrent old/new writers |
| User-surface / browser / shell | 75% | 95% | Actual accepted Org response/token DTOs have exact totals/costs; persisted history and GraphQL restart observed. No renderer/shell code changed; browser render/Electron not exercised |
| Durable regression quality / relevance | 95% | 95% | Five added cases across four new coherent files + narrow shared fixture correction; typed compilation and 402/79 final combined checks; all aligned with approved ACs |

Post-repository **82.86%** (580/7); final **95%** (665/7), +12.14 points. Every critical criterion directly proven at the changed application boundary: Yes. No category below 90%; default 95% clean target met. External scripted backend is explicitly **not** authenticated Codex/Claude execution. That unchanged boundary remains a limit, not a claimed complete real-provider/application-shell qualification.

## Broader validation decision / desktop strategy
**Required — Lifecycle / deterministic external backend emulation; completed.** Selected to close the explicit full restore→continuation gap left by the upstream scope-builder sentinel. Real external backend credentials/profile use is unnecessary to exercise this changed ownership invariant, and no real conversation was authorized. This test does not clear a scalar or suppress a warning: it materializes released token input and transforms all three ownership fields through the real migration, then runs current production scope/Agent/token/presentation logic.
Browser/actual desktop **Not Required** for this change: no frontend/shell code changes, and current DTO/data boundary directly exercised. No visual screenshot or browser evidence claimed. No app launch/stop. Global attachment readiness, app packaging, unrelated external integrations and live-provider authentication are outside this round's direct proof.

## Compatibility / persisted-data / operational checks
Migration Required faithfully exercised under the same family ID. Existing token chain prerequisite/registry test retained; successful ledger skipping unchanged. No new ID, automatic replay/reset, current-reader fallback or historical root allowance. Legacy decoding exists only in approved migration, not runtime. Non-candidate scan exclusion measured at this migration only, not total startup duration. No usage refold/reprice to perform ownership correction, no facet rebuild. Root SQL transaction and staged history/index retries remain distinct, not falsely described as one cross-store transaction.

## Durable changes
All paths relative to assigned worktree. No tests removed; no production-source changes.
| Path | Change | Purpose |
| --- | --- | --- |
| autobyteus-server-ts/tests/integration/app-data-migrations/agent-org-token-batch-boundaries.integration.test.ts | Added | Two actual SQL batch/rollback/readiness cases |
| autobyteus-server-ts/tests/integration/app-data-migrations/agent-org-exact-reference.integration.test.ts | Added | Exact non-global current-Org reference proof |
| autobyteus-server-ts/tests/e2e/app-data-migrations/agent-org-token-continuation.e2e.test.ts | Added | Two complete server lifecycle journeys, first upgrade and token-only rerun |
| autobyteus-server-ts/tests/helpers/org-migration-continuation-fixtures.ts | Added | Scripted external backend with real manager/scope/Agent/recording construction |
| autobyteus-server-ts/tests/helpers/token-usage-run-record-fixtures.ts | Updated | Six current nullable pricing-schedule metadata fields; type fidelity only |

All five paths attached to proportional test review. Existing fixture choices remain valid except explicit shape update; no stale/compatibility-only scenario retained or removed.

## Mock/emulation and temporary execution disclosure
| Dependency | Treatment / reason | Limitation |
| --- | --- | --- |
| External Codex/Claude backend/service | Deterministic AgentRunBackend factory responds to actual forwarded commands with canonical lifecycle/token/assistant events; exact restored thread asserted | No live provider IPC/network/model behavior certified |
| Token price/display lookup | Existing fixture passthrough store policy/display; default pipeline cost enrichment returns deterministic supplied cost | No live price/settings correctness claim; correction preservation and next accounting directly tested |
| MCP/file-change/artifact resources | No-op resource attachments; no tools used | Unrelated tooling/resource integrations not exercised |
| Org scope/Team/Agent, token store/accumulator, package stores, activity inspection, memory recorder | Real production implementations, test-owned data | No fake warning, scope sentinel or fake fold |
| Compiler config | Temporary selected-test config removed; reproduced above | Not default global test-inclusive typecheck |

## Cleanup / evidence retention
- Disposable migration fixtures disconnect SQL and remove their owned DB/memory roots in finalizers; runtime finalizers terminate Org and assert no active Agent runs.
- Built restart test stops only owned children and removes its unique test DB/runtime/root key; exact worktree built-app process-path check found no survivor.
- Initial fixture `/workspace` default registered only metadata in assigned server/workspaces.json. Exact one-entry file birth/mtime 2026-09-15 16:14:42 +02:00 corroborates this run's creation; removed after exact content check. Fixture now sets selected workspaceRootPath null. No `/workspace` contents touched; no live-profile access.
- Removed only validation-created untracked application-backend-sdk/dist and application-sdk-contracts/dist; temporary compiler config removed. Ignored standard worktree build/test caches retained.
- All api-e2e-*.log evidence retained here; raw logs preserve initial duplicate seed-id error, DTO expectation errors and missing-build setup failure rather than disguising them as implementation defects or omitting them. Final passes resolve each. Final status snapshot: api-e2e-final-worktree-status.log; no commit/push/merge.

## Classification / recommendation
No remaining failure; failure-origin classification N/A. No Requirement Gap, Design Impact or unclear supported scenario uncovered. Test/fixture/setup corrections handled locally. **Pass**, Medium/High, **95%**, broader lifecycle validation completed. Call get_handoff_rules and use its exact selected Pass recipient for proportional test-code review. Live-profile operational validation still requires separate user approval, stopped writers and matching SQLite-consistent DB/memory backups; no ledger preparation/reset is implied by this result.

## Handoff rule selection
get_handoff_rules returned the specific Pass + architectural_risk=High + proportional-test-review rule with exact recipient `/code_reviewer`. Selected this one rule only; direct-low-risk, failure-origin and upstream-gap rules do not match. Complete cumulative artifacts and five durable test/helper paths supplied for proportional test review. No duplicate notification or delivery forwarding.
