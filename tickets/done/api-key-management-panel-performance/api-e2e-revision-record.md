# API/E2E Revision Record

The canonical coverage investigation and execution coverage report remain the authoritative current validation result. This record preserves the concise baseline and later round deltas.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | `/code_reviewer`; `code-review-report.md` CRR-004; API/E2E round 1 | SR-005–SR-007, ARCH-REV-008, IR-006, CRR-004 | N/A | Pass / 96.7% |
| API-REV-002 | `/code_reviewer`; `api-e2e-test-review-report.md` / CRR-005; API/E2E round 2 | API-REV-001, CRR-005, TEST-001 | Pass / 96.7% | Pass / 96.7% |
| API-REV-003 | `/code_reviewer`; `code-review-report.md` / CRR-007; integrated API/E2E round 3 | IR-007, CRR-007, DR-001, API-REV-002, CRR-006 | Protected-checkpoint Pass / 96.7% | Integrated Pass / 96.7% |

## Revision Entries

### API-REV-001 — Current catalog-contract coverage and production-browser baseline

- Triggering role, report path, and round: `/code_reviewer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/api-key-management-panel-performance/tickets/in-progress/api-key-management-panel-performance/code-review-report.md` (`CRR-004`); API/E2E round 1.
- Triggering finding or scenario IDs: classify all repository-resident consumers of the intentionally removed aggregate provider/model contract before durable edits or final execution; validate `API-001`–`API-004`, `WEB-001`, `WEB-002`, `BROWSER-001`, `BROWSER-002`, and `COV-001`–`COV-005`.
- Related solution, architecture-review, implementation, code-review, or delivery revision IDs: `SR-005`–`SR-007`, `ARCH-REV-008`, `IR-006`, and `CRR-004`.
- Why this baseline or coverage/execution revision was recorded: this is the first completed API/E2E result. It establishes the current-contract coverage decisions, repository execution baseline, realistic production-renderer evidence, confidence result, and residual risks without inferring any earlier result.
- Coverage decisions or durable test paths changed:
  - Updated 21 server E2E paths under `autobyteus-server-ts/tests/e2e/**` to use current `providerCredentialSettings`, `providerModelCatalogSnapshots`, targeted ensure/reload/delete operations, exact result objects, and current lifecycle semantics.
  - Updated `autobyteus-server-ts/tests/integration/services/claude-model-catalog.integration.test.ts` and `autobyteus-server-ts/tests/integration/services/codex-model-catalog.integration.test.ts` to the current snapshot contract.
  - Updated `autobyteus-web/tests/e2e/fixtures/interrupt-result-presentation.page.vue` and `autobyteus-web/tests/e2e/interrupt-result-presentation-probe.mjs` to the current Team execution-view snapshot and exact AgentRun interrupt boundary.
  - Updated `test-support/live-e2e/live-e2e-harness.ts` to value-safely preflight the current credential and model-catalog capabilities.
  - Removed stale aggregate-query/coarse-result assertions inside those files; no complete durable file was removed and no production compatibility alias was added.
  - Replaced synchronous metadata-enrichment and warm post-create rediscovery expectations with locally curated zero-network metadata, warm-cache, and first-post-restart discovery evidence.
- Scenarios added, changed, removed, or rechecked: `API-001`–`API-004`, `WEB-001`, `WEB-002`, `BROWSER-001`, `BROWSER-002`, `COV-001`–`COV-005`; broader unchanged failures retained as `BASELINE-E2E-001`–`BASELINE-E2E-004`.
- Commands, environment, fixture, or broader-validation delta:
  - Focused built-server E2E: 7 files passed, 22 tests passed, 2 optional runtime tests skipped.
  - All updated server durable paths: deterministic scenarios passed after correcting one coverage-owned restart assertion; 50 optional capability scenarios skipped truthfully.
  - Focused SDK/server changed-boundary unit coverage: 12 files and 55 tests passed.
  - SDK build, server full build/bootstrap, live preflight (18/18), web affected tests (12 files/80 tests), guards, localization audit, production build, and current interrupt browser probe passed.
  - The full server E2E suite retained four failures in unchanged files; reruns and source audit classify them as unrelated repository baseline failures rather than ticket failures.
  - Authoritative browser validation used Chrome 151 against production Nuxt output, the actual built server with isolated SQLite/key material, and an owned deterministic Ollama-compatible HTTP fixture. Full navigation reached the credential surface in 180ms, and the journey proved pending-state form availability, reload, exact model replacement, failure/retry presentation, operation order, and 768px responsiveness.
  - Platform: macOS 26.5.2, Node 22.23.1, pnpm 10.28.2, server Vitest 4.0.18, web Vitest 3.2.4.

#### Prior Failure Resolution

None.

- Canonical artifacts and sections updated:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/api-key-management-panel-performance/tickets/in-progress/api-key-management-panel-performance/api-e2e-coverage-investigation.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/api-key-management-panel-performance/tickets/in-progress/api-key-management-panel-performance/api-e2e-execution-coverage-report.md`
  - This `api-e2e-revision-record.md` baseline.
- Prior result and confidence (`N/A` for `API-REV-001`): `N/A`.
- Current result and confidence: `Pass`, **96.7%** overall; all applicable categories are at least 96%; all critical changed-scope acceptance criteria have direct evidence.
- New or remaining failure IDs: no ticket failure. `BASELINE-E2E-001`–`BASELINE-E2E-004` remain in unchanged broader-suite files and are fully evidenced in `validation-evidence/03-server-e2e.log`, `03b-file-explorer-rerun.log`, and `03c-unrelated-failure-audit.log`.
- Recommended recipient: `/code_reviewer` for proportional review of the 26 changed repository-resident durable coverage paths; after that passes, `/delivery_engineer`.
- Remaining risks, blocked evidence, or untested scope: optional real external-provider success was not run where credentials/runtimes were absent; Electron shell launch/IPC/window behavior is out of scope because no shell boundary changed; four unrelated full-suite baseline failures remain; `autobyteus-web/docs/settings.md` still documents removed operations and is flagged for delivery-owned documentation sync.

### API-REV-002 — Independently enforce every removed query field

- Triggering role, report path, and round: `/code_reviewer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/api-key-management-panel-performance/tickets/in-progress/api-key-management-panel-performance/api-e2e-test-review-report.md` (`CRR-005`, proportional review round 1); API/E2E round 2.
- Triggering finding or scenario IDs: `TEST-001`, affecting `API-001` / `AC-022`.
- Related solution, architecture-review, implementation, code-review, or delivery revision IDs: `SR-005`–`SR-007`, `ARCH-REV-008`, `IR-006`, `CRR-004`, `CRR-005`, and `API-REV-001`.
- Why this baseline or coverage/execution revision was recorded: the first proportional review correctly found that negating one `arrayContaining` over five removed fields succeeds whenever any one name is absent. That matcher did not fail for every possible subset reintroduction and therefore under-proved clean schema removal.
- Coverage decisions or durable test paths changed: refined only `autobyteus-server-ts/tests/e2e/secret-management/provider-secret-lifecycle-graphql.e2e.test.ts`; replaced the weak aggregate negation with five explicit `expect(queryFields).not.toContain(...)` assertions. No production source, fixture, or other durable path changed in this round.
- Scenarios added, changed, removed, or rechecked: `TEST-001` resolved; `API-001` / `AC-022` rechecked. No scenario was added or removed.
- Commands, environment, fixture, or broader-validation delta:
  - `pnpm -C autobyteus-server-ts exec vitest run tests/e2e/secret-management/provider-secret-lifecycle-graphql.e2e.test.ts` from the worktree root: 1 file and 6 tests passed against the isolated Prisma/SQLite runtime.
  - Scoped production/durable removed-contract audit plus `git diff --check`: passed; all five names occur in the current schema test only as independent absence assertions, with the unchanged Electron probe's lexical `providerSettings` classified as a non-query evidence-object label.
  - No full repository or browser rerun was required because the correction changes only matcher strength and the focused real schema execution directly covers the affected boundary.

#### Prior Failure Resolution

| Prior Scenario / Failure Reference | Previous Classification | Current Resolution | Evidence |
| --- | --- | --- | --- |
| `TEST-001` / CRR-005 | `Fail / Local Fix` — one negated aggregate matcher did not reject every subset reintroduction | Resolved — every removed query name is asserted absent independently | `validation-evidence/08-provider-secret-test-001-fix.log`; `validation-evidence/08b-removed-contract-test-001-audit.log` |

- Canonical artifacts and sections updated: coverage investigation round meta/local-fix decision/execution results; execution report round meta/evidence/result/routing; this revision record.
- Prior result and confidence: `Pass`, 96.7% (`API-REV-001`); separate proportional test review `CRR-005` was `Fail / Local Fix` on `TEST-001`.
- Current result and confidence: `Pass`, **96.7%**. The bounded correction closes the assertion-quality finding without changing prior direct execution or residual-risk scoring.
- New or remaining failure IDs: no API/E2E ticket failure; `TEST-001` resolved. `BASELINE-E2E-001`–`BASELINE-E2E-004` remain unrelated unchanged repository failures.
- Recommended recipient: `/code_reviewer` for repeat proportional review of the single corrected durable path.
- Remaining risks, blocked evidence, or untested scope: unchanged from API-REV-001—optional external-provider success, out-of-scope Electron shell behavior, four unrelated broader-suite failures, and delivery-owned stale Settings documentation.

### API-REV-003 — Independently validate the latest-base integrated candidate

- Triggering role, report path, and round: `/code_reviewer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/api-key-management-panel-performance/tickets/in-progress/api-key-management-panel-performance/code-review-report.md` (`CRR-007`); integrated API/E2E round 3.
- Triggering finding or scenario IDs: delivery integration blocker `DR-001` resolved by `IR-007`; integrated rechecks of `API-001`–`API-004`, `WEB-001`, `WEB-002`, `BROWSER-001`, `BROWSER-002`, `COV-001`–`COV-006`.
- Related solution, architecture-review, implementation, code-review, or delivery revision IDs: `SR-005`–`SR-007`, `ARCH-REV-008`, `IR-007`, `CRR-007`, `DR-001`, plus protected-checkpoint history `API-REV-002` / `CRR-006`.
- Why this baseline or coverage/execution revision was recorded: merge commit `f6f4d532f78f3b418dca471881f65d3415693f99` combines checkpoint `16b5696716c4cab025ddb9b6bf420d8dea796f89` with latest base `7edfb162559ec5a6eb4c00c23a929920eabe3dc1`. Earlier API/E2E and proportional-review results could not be relabeled as proof of the merged runtime.
- Coverage decisions or durable test paths changed:
  - Reclassified the IR-007-resolved Gemini 3.7 actual-schema E2E as `Still Valid — Re-execute`; it passed 3/3 without API/E2E modification and proves the current snapshot remains credential-free/network-free with null live provenance.
  - Integrated execution found one stale incidental assertion in `autobyteus-server-ts/tests/e2e/llm-management/qwen-configuration-lifecycle-graphql.e2e.test.ts`: the separate built-in GLM owner expected removed `glm-5.2`. API/E2E changed that one expectation to current `glm-5.3` while preserving every Qwen-derived `qwen:glm-5.2` metadata/restart/routing assertion.
  - No production source, fixture, compatibility assertion, or other repository-resident durable path was added, updated, or removed in round 3.
- Scenarios added, changed, removed, or rechecked: added `COV-006` for the integrated Qwen/current-GLM distinction; rechecked `API-001`–`API-004`, `WEB-001`, `WEB-002`, `BROWSER-001`, `BROWSER-002`, and `COV-001`–`COV-005`; preserved `BASELINE-E2E-001`–`BASELINE-E2E-004` as unrelated unchanged-file broader-suite failures.
- Commands, environment, fixture, or broader-validation delta:
  - SDK focused merged-definition/source tests: 3 files/15 tests passed.
  - Server catalog/metadata/pricing/lifecycle units: 6 files/37 tests passed.
  - Six integrated built-server E2E files: 17/18 initially passed; the sole failure was the stale GLM-owner test assertion. The corrected full Qwen compensation/restart/routing lifecycle then passed 1/1.
  - SDK/server builds/bootstrap passed; current value-safe preflight passed 18/18 capability descriptions.
  - Integrated current analytics/API Keys Nuxt selection passed 15 files/53 tests; all web/localization guards, exact 594-key-per-locale composition, and the production build passed.
  - Current interrupt browser probe passed. The integrated production Settings journey passed at 200ms from full navigation start, with no console/page errors, all semantic lifecycle/order/failure/responsive assertions passing, three screenshots visually inspected, and all owned cleanup flags true.
  - Corrected authoritative audit passed exact merge identity/parents, no unmerged paths/conflict markers, removed production contract/type absence, independent schema removals, Qwen/current-GLM split, locale composition, source-size guard, one-path durable delta and `git diff --check`; the finalization audit also confirmed canonical API-REV-003 markers and owned-resource cleanup.

#### Prior Failure Resolution

| Prior Scenario / Failure Reference | Previous Classification | Current Resolution | Evidence |
| --- | --- | --- | --- |
| `DR-001` | Delivery `Blocked / Local Fix`; no integrated candidate | Resolved upstream by `IR-007`/`CRR-007` and independently executed at exact merge commit | `09a`–`09i` integrated evidence package |
| `COV-006` initial merged-state E2E failure | API/E2E-owned stale incidental assertion | Separate GLM owner now expects current `glm-5.3`; Qwen-owned GLM 5.2 remains; full lifecycle rerun passes | `validation-evidence/09c-integrated-server-e2e.log`; `09c2-integrated-qwen-coverage-fix.log`; `09h2-integrated-final-audit.log` |

- Canonical artifacts and sections updated: coverage investigation integrated-state classification/plan/results/confidence; execution report integrated meta/evidence/confidence/coverage/routing; this revision entry.
- Prior result and confidence: protected-checkpoint `API-REV-002` Pass at 96.7% and `CRR-006` Pass; not an integrated-state result.
- Current result and confidence: integrated `Pass`, **96.7%**; every applicable category is at least 96%, every critical changed-scope criterion is directly proven, and required merged-state browser validation completed.
- New or remaining failure IDs: no ticket failure. `COV-006` is resolved. `BASELINE-E2E-001`–`BASELINE-E2E-004` remain unrelated broader-suite baseline failures.
- Recommended recipient: `/code_reviewer` for proportional review of the one API/E2E-owned Qwen/current-GLM assertion correction, then `/delivery_engineer` if it passes.
- Remaining risks, blocked evidence, or untested scope: optional live success against unavailable external providers; Electron shell launch/IPC/window behavior outside the changed boundary; four preserved unrelated broader-suite failures; delivery-owned long-lived docs still describe removed aggregate/global-reload behavior.
