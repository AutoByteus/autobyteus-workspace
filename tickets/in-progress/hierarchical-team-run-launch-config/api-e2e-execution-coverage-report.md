# API/E2E Execution Coverage Report

## Execution Round Meta

- Requirements Doc: `tickets/in-progress/hierarchical-team-run-launch-config/requirements.md`
- Investigation Notes: `tickets/in-progress/hierarchical-team-run-launch-config/investigation-notes.md`
- Design Spec: `tickets/in-progress/hierarchical-team-run-launch-config/design-spec.md`
- Supplemental Task Artifacts: `hierarchical-launch-configuration-behavior.md`, `team-execution-tree-v2-contract.md`, `recovery-audit.md`, `remote-recovery-branch-comparison.md`, and the integrated remote-workspace requirements/design/UI package referenced by CRR-013.
- Solution / Architecture / Implementation Records: `solution-revision-record.md`, `design-review-report.md`, `architecture-review-revision-record.md`, `implementation-handoff.md`, `implementation-revision-record.md`.
- Code Review Report / Revision Record: `code-review-report.md`, `code-review-revision-record.md` (`CRR-013` proportional `Fail`, `TR-003`).
- API/E2E Test Review Report: `api-e2e-test-review-report.md` (`CRR-013`).
- Delivery Revision Record / IDs: `delivery-revision-record.md`; `DR-001` historical integration context only, not delivery authorization.
- Coverage Investigation / API Revision Record: `api-e2e-coverage-investigation.md`, `api-e2e-revision-record.md`.
- Current API/E2E Revision ID / Round: `API-REV-007` / 7.
- Trigger: CRR-013 requested a bounded API/E2E-owned correction of the two stale v5 `sdkCompatibility` values in the capability integration's fake `ApplicationBundleService` output, followed by the affected application cohort, report/hash refresh, and repeat proportional review.
- Prior Round Reviewed: `API-REV-006` — execution `Pass` / `98%`; CRR-013 proportional result `Fail` solely for `TR-003`.
- Latest Authoritative Round: this report, `API-REV-007` — execution `Pass` / `98%` for HEAD `426bdf81ae5efcaf7e97e041c36a94d7349e610b` plus the uncommitted durable fixture correction recorded below.

## Investigation And Execution Basis

- Investigation completed before durable coverage change and execution: `Yes`; see “API-REV-007 Fresh Fixture-Correction Investigation — CRR-013 / TR-003” in `api-e2e-coverage-investigation.md`.
- Plan followed: `Yes`; exactly one durable fixture file was updated, no production source or assertion changed, and the two-file application integration cohort was rerun.
- Existing coverage decisions revised during execution: `No`.
- Reroute required: `No`.
- Prior evidence validity: CRR-013 explicitly preserves API-REV-006's actual one-click packaged result, stale repair, nested provider message/task flow, hierarchy lifecycle, migration, builds, and cleanup. Those boundaries were not rerun because the local change is limited to impossible metadata in a fake service output.

## Compatibility / Legacy Scope Check

- Invalid compatibility scope or implementation retention observed: `No`.
- Fixture compatibility contradiction observed: `Yes`, API/E2E-owned and resolved — the fake service output now uses the same exported v6 constants as the governing production parser.
- Approved persisted-data transition followed: `Yes`, through retained API-REV-006 4/4 direct migration evidence; unaffected this round.
- Durable coverage retained only for compatibility behavior: `No`.
- Upstream recipient: `/code_reviewer` for repeat proportional test-code review; not delivery.

## Changed Boundary And Evidence Matrix

| Scenario | Boundary / Requirement | Surface / Type | Result | Evidence |
| --- | --- | --- | --- | --- |
| API-E2E-018 / TR-003 | Current application discovery/service-output compatibility metadata plus preserved worker/host/imported-package/binding/recovery execution | Durable application integration | **Pass**, 2 files / 5 tests | `api-e2e-evidence/api-rev-007-application-integration-authoritative.txt` |
| API-E2E-014, 016, 019 | One-click nested Team launch, exact provider message/task lifecycle, stale repair | Retained actual `open_tab` / packaged API / disk evidence | Still valid; not rerun | CRR-013 and API-REV-006 browser evidence |
| API-E2E-003, 004, 017, 020 | API/restart/restore, V1->V2, workspace/store, allocation ordering | Retained durable evidence | Still valid; not rerun | API-REV-006 evidence and CRR-013 |

## Additional Repository Coverage Execution

| Order | Command | Working Directory | Boundary | Result | Evidence |
| --- | --- | --- | --- | --- | --- |
| 1 | `pnpm exec vitest run tests/integration/application-backend/application-context-capabilities.integration.test.ts tests/integration/application-backend/brief-studio-imported-package.integration.test.ts --no-watch` | `autobyteus-server-ts` | Corrected capability fixture through real worker/host plus unchanged imported Brief Studio cohort | Pass, 2 files / 5 tests | `api-e2e-evidence/api-rev-007-application-integration-authoritative.txt` |
| 2 | `git diff --check`; durable SHA-256; modified-source-path audit | worktree root | Formatting, exact durable identity, no production-source working-tree modification | Pass | `api-e2e-evidence/api-rev-007-static-hash-audit.txt` |

## Validation Confidence Scorecard

CRR-013 preserved the successful API-REV-006 system evidence. API-REV-007 directly resolves the only identified durable-quality contradiction without changing a runtime boundary, so the retained scores remain applicable and the durable-quality score reflects the corrected fixture and successful affected-cohort execution.

| Category | Post-Repository | Final | Final Basis | Residual |
| --- | ---: | ---: | --- | --- |
| Requirement and acceptance-criteria proof | 99% | 99% | Retained direct API-REV-006 critical-path proof; no requirement surface changed | None material |
| Changed-boundary execution directness | 99% | 99% | Corrected fake service output executed through the affected worker/host cohort | Manifest parser remains intentionally bypassed by this service-level fixture; constants eliminate contradiction |
| Cross-boundary integration realism and mock gap | 99% | 99% | Retained actual browser/API/disk/provider evidence plus current application integration | Stale repair refresh remains an injected browser setup as previously scoped |
| Environment, configuration, identity, and fixture fidelity | 99% | 99% | Fixture metadata now matches current exported v6 contract; prior isolated profile/provider evidence retained | Secret values intentionally not retained |
| Failure, edge-case, lifecycle, and recovery evidence | 98% | 98% | Affected recovery cohort 5/5; prior restart/migration/repair evidence retained | Unrelated providers not exhaustive |
| User-surface, browser, and desktop-shell confidence | 98% | 98% | CRR-013 explicitly preserved actual `open_tab` and packaged-shell evidence | Unchanged native IPC/window behavior out of scope |
| Durable regression coverage quality and relevance | 97% | 97% | `TR-003` corrected with production constants; all 5 affected tests pass; no assertion weakened | Repeat proportional review remains procedural gate |

- Overall post-repository confidence: `98%` (rounded simple average).
- Overall final confidence: `98%`; no broader validation ran because it could not improve evidence for the two mocked metadata fields.
- Every critical acceptance criterion directly proven: `Yes`, using current API-REV-007 evidence plus expressly retained API-REV-006 evidence.
- Applicable category below 90%: `No`.
- Default 95% target met: `Yes`.

## Broader Validation Decision And Execution

- Decision: `Not Required`.
- Rationale: the correction changes only two compatibility values in a fake `ApplicationBundleService` output. The two-file integration cohort is the direct executable boundary; browser/provider/lifecycle/migration reruns cannot establish those mocked values more directly. CRR-013 explicitly retained all API-REV-006 real-system evidence and requested no full provider/browser rerun.
- Startup, seed, identity, or external provider changes this round: none.

## Desktop Application Validation

- Not rerun in API-REV-007. API-REV-006's actual `open_tab` tab `2d23c2`, current packaged backend, private nested-classroom Team, Codex `gpt-5.6-luna` root, AutoByteus `deepseek-v4-flash` nested Team, exact V2 disk, ordinary message, formal task submission/acceptance, and owned cleanup remain valid under CRR-013.
- No desktop-shell or renderer source changed in this round.

## Lifecycle / Upgrade / Persisted Data

- Not rerun because no production/API/persistence source changed. API-REV-006's current hierarchy 7/7 and production-upgrade 4/4 remain valid under CRR-013.
- Version-specific runtime branch or dual read/write observed: `No`.

## Tests Implemented Or Updated

| Path | Change This Round | Boundary | Result |
| --- | --- | --- | --- |
| `autobyteus-server-ts/tests/integration/application-backend/application-context-capabilities.integration.test.ts` | Updated `createBundle().backend.sdkCompatibility` to use `APPLICATION_BACKEND_DEFINITION_CONTRACT_VERSION_V6` and `APPLICATION_FRONTEND_SDK_CONTRACT_VERSION_V6`; no assertion or production change | Current synthetic `ApplicationBundleService` output and real worker/host integration | Pass in 2-file / 5-test cohort; SHA-256 `00ebf8044550437dda210de8c3e2289aea5f004a3e955f2f142f479e09a6a700` |

- `autobyteus-server-ts/tests/integration/application-backend/brief-studio-imported-package.integration.test.ts`: unchanged from API-REV-006; reran and passed; SHA-256 `9cb8d7fa7cd0a9bde32741da1b8ab1c31e3aebea8fc895b30e712031ea9d9df2`.
- `autobyteus-web/components/workspace/config/__tests__/RunConfigPanel.spec.ts`: unchanged from API-REV-006 and already proportionally passed by CRR-013; not rerun; SHA-256 `4a52952caa8cf0ac3b917dc219a7a4e578f0e7cae06fd9faffd80e2a9df02dd9`.
- Tests added or removed: none.

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage changed this round: `Yes`, one updated test path above.
- Production source changed this round: `No`.
- Added/removed test paths: none.
- Required review attachment: corrected capability integration file; Brief Studio and RunConfigPanel remain relevant cumulative paths but CRR-013 already passed their proportional review.

## Other Execution Artifacts

| Artifact | Purpose |
| --- | --- |
| `api-e2e-evidence/api-rev-007-application-integration-authoritative.txt` | Exact 2-file / 5-test execution log |
| `api-e2e-evidence/api-rev-007-static-hash-audit.txt` | v6 source excerpt, hashes, diff check, working-tree production-source audit |
| `api-e2e-evidence/api-rev-006-open-tab-integrated-browser-evidence.md` | Retained actual browser/package/provider evidence |
| `api-e2e-evidence/api-rev-006-browser-one-click-result.json` | Retained exact one-click result |
| `api-e2e-evidence/api-rev-006-stale-repair-probe-result.json` | Retained stale-repair result |

## Dependencies Mocked Or Emulated

| Dependency | Method | Why | Confidence Limitation / Resolution |
| --- | --- | --- | --- |
| `ApplicationBundleService` | Deterministic fake returns the synthetic capability bundle | Exercise orchestration worker/host without filesystem discovery coupling | It bypasses manifest parsing; API-REV-007 now derives both compatibility values from the same exported v6 contract constants, resolving `TR-003` |

## Result Summary

| Result | Scenario IDs | Summary |
| --- | --- | --- |
| Pass | API-E2E-018 / TR-003 | Corrected current-v6 service-output fixture passed the full affected 5/5 cohort; static/hash audit passed; no production or assertion change |
| Fail / Blocked | None | No current execution failure |

## Cleanup Performed

- Vitest-owned temporary database/application roots were cleaned by existing test teardown; command exited normally.
- No service, listener, browser tab, provider run, secret import, or external resource was created in API-REV-007.

## Preliminary Classification

- `TR-003`: API/E2E-owned `Local Fix`, resolved in execution. The fixture now uses current v6 constants and passes 5/5. Formal closure awaits repeat proportional review.
- No implementation defect, design impact, requirement gap, or unclear failure was found.

## Recommended Recipient

`/code_reviewer` for repeat proportional test-code review of the corrected capability integration path. Do not route to delivery until that review passes.

## Latest Authoritative Result

- Result: `Pass`.
- Final validation confidence: `98%`.
- Default 95% target met: `Yes`; applicable category below 90%: `No`.
- Broader validation: `Not Required`; prior CRR-013-preserved browser/package evidence remains valid.
- Current failure IDs: none. `TR-003` resolved by execution, pending reviewer closure.
- Next recipient: `/code_reviewer`; this is not delivery authorization.
