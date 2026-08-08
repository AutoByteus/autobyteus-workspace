# API/E2E Revision Record

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | `api_e2e_engineer`; first completed coverage/execution round | `SR-005`–`SR-008`, `ARCH-REV-002`–`ARCH-REV-003`, `IR-001`–`IR-003`, `CRR-001`–`CRR-002` | N/A | `Pass` / `95.3%` |
| API-REV-002 | `code_reviewer` CRR-003 `TR-001`; rerun round `2` | `API-REV-001`, `CRR-003`, `IR-003`, `CRR-002` | `Pass` / `95.3%` | `Pass` / `95.3%` |
| API-REV-003 | `code_reviewer` CRR-007; current exact-only/Qwen round `3` | `SR-010`–`SR-011`, `ARCH-REV-005`, `IR-006`, `CRR-007` | `Pass` / `95.3%` (historical contract, superseded) | `Pass` / `96.4%` |
| API-REV-004 | `code_reviewer` CRR-008 `TR-002`/`TR-003`; corrective round `4` | `API-REV-003`, `CRR-008`, `IR-006`, `CRR-007` | `Pass` / `96.4%` execution; proportional review `Fail` | `Pass` / `96.4%`, pending re-review |
| API-REV-005 | `code_reviewer` CRR-010; integrated-state round `5` after IR-007/DR-003 | `API-REV-004`, `CRR-009`, `DR-003`, `IR-007`, `CRR-010` | Pre-integration `Pass` / `96.4%`; merge not authorized | Integrated `Pass` / `96.4%` |

## Revision Entries

### API-REV-001 — Initial custom-provider metadata coverage and isolated GraphQL validation

- Triggering role, report path, and round: `api_e2e_engineer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/api-e2e-coverage-investigation.md` and `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/api-e2e-execution-coverage-report.md`; round `1`.
- Triggering finding or scenario IDs: Initial downstream validation after CRR-002 PASS; `COV-001`–`COV-008`.
- Related solution, architecture-review, implementation, and code-review revision IDs: `SR-005`–`SR-008`; `ARCH-REV-002`–`ARCH-REV-003`; `IR-001`–`IR-003`; `CRR-001`–`CRR-002`.
- Why this baseline or coverage/execution revision was recorded: This is the first completed API/E2E result; no prior result or confidence is inferred. It records the required investigation, durable coverage additions/updates, focused repository checks, and isolated custom-provider GraphQL execution.
- Coverage decisions or durable test paths changed:
  - Expanded discovery coverage to every documented metadata alias, invalid/nested/unrelated fields, synthetic response projection, HTTP failure, timeout, and credential/raw-payload hygiene.
  - Added custom model `toModelInfo`, known token-budget, unknown-null-budget, and explicit override assertions.
  - Added server live/inferred/unknown source-preservation and coarse-provenance assertions.
  - Added an isolated GraphQL E2E covering custom provider creation, advertised/inferred/unknown catalog rows, stale last-known-good reload, config/secret hygiene, and cleanup.
  - No durable coverage was removed.
- Scenarios added, changed, removed, or rechecked: `COV-001`–`COV-005` added/updated; `COV-006` existing GraphQL provenance rechecked; `COV-007` token-meter states rechecked; `COV-008` type/build contract rechecked. The existing exact resolver regressions for query/hash near-misses and the DeepSeek alias were rechecked and passed.
- Commands, environment, fixture, or broader-validation delta: Installed lockfile dependencies; generated Prisma client and Nuxt config; ran 49 affected TS tests, 27 affected server unit tests, 9 token-meter tests, 3 custom GraphQL E2E tests, 4 existing GraphQL provenance E2E tests, both TS/server typechecks, server build/sanitized smoke, web guards/audit, and diff checks. E2E used an isolated SQLite/app-data/secret-vault runtime and a deterministic synthetic `/models` response; no real vendor credential or endpoint was used.

#### Prior Failure Resolution

None. `API-REV-001` is the initial baseline; the prior source-review `CR-001` was already resolved and closed by IR-003/CRR-002 before this stage.

- Canonical artifacts and sections updated:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/api-e2e-coverage-investigation.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/api-e2e-execution-coverage-report.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/api-e2e-revision-record.md`
- Prior result and confidence: `N/A`.
- Current result and confidence: `Pass`, `95.3%`; all applicable categories are at least 90% and the default 95% target is met.
- New or remaining failure IDs: `None`.
- Recommended recipient: `code_reviewer` for proportional review of changed durable coverage code; then `delivery_engineer` after review.
- Remaining risks, blocked evidence, or untested scope: Source-dated Alibaba profile freshness and actual vendor enforcement remain residual risks; the external endpoint was synthetically emulated. Full browser/Electron shell validation and distributed-worker validation were out of scope because no corresponding boundary changed.


### API-REV-002 — Resolve TR-001 with post-delete catalog observability

- Triggering role, report path, and round: `code_reviewer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/api-e2e-test-review-report.md` CRR-003; round `2`.
- Triggering finding or scenario IDs: `TR-001` (`Local Fix`) in the cleanup test; related `COV-005`.
- Related solution, architecture-review, implementation, and code-review revision IDs: `SR-005`–`SR-008`; `ARCH-REV-002`–`ARCH-REV-003`; `IR-001`–`IR-003`; `CRR-001`–`CRR-003`.
- Why this revision was recorded: CRR-003 correctly found that asserting only the delete mutation's `true` result did not prove provider/catalog or derived-model absence. The durable E2E now uses the supported normal provider/catalog query after deletion.
- Coverage delta: After deletion, the E2E asserts the synthetic provider ID is absent from `availableLlmProvidersWithModels`, all three derived model values are absent, and the isolated provider config no longer contains the provider ID. Existing key/raw-payload assertions, secret hygiene, and owned runtime cleanup were retained.
- Commands and evidence: The affected custom GraphQL E2E passed 3/3 at `/tmp/custom-provider-metadata-custom-graphql-e2e-api-rev-002.log`; focused server typecheck passed at `/tmp/custom-provider-metadata-server-tsc-api-rev-002.log`; `git diff --check` and untracked-file whitespace checks passed.

#### Prior Failure Resolution

| Finding ID | Prior Classification | Resolution | Evidence |
| --- | --- | --- | --- |
| `TR-001` | `Local Fix` | `Resolved` | Updated cleanup test with post-delete catalog/provider/model absence assertions; API-REV-002 affected E2E passed. |

- Current result and confidence: `Pass`, `95.3%`; all applicable categories remain at least 90% and the default 95% target remains met.
- New or remaining failure IDs: `None`; implementation source remains CRR-002 `Pass`, with no implementation reroute required.
- Recommended recipient: `code_reviewer` for proportional CRR-004 review of the updated durable test; delivery remains blocked until that review passes.
- Remaining risks, blocked evidence, or untested scope: Source-dated Alibaba profile freshness, real vendor API enforcement/payload variation, and full browser/Electron/distributed-worker execution remain outside the approved safe scope.


### API-REV-003 — Current exact-only metadata and native Qwen lifecycle/browser baseline

- Triggering role, report path, and round: `code_reviewer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/code-review-report.md` CRR-007; execution round `3` recorded in the canonical coverage investigation and execution report.
- Triggering finding or scenario IDs: Current `SR-010`/`SR-011` product contract; `CUS-E2E-001`, `QW-E2E-001`–`QW-E2E-004`, `QW-BRW-001`–`QW-BRW-003`, and `HIST-001`.
- Related solution, architecture-review, implementation, code-review, or delivery revision IDs: `SR-010`–`SR-011`; `ARCH-REV-005`; `IR-006`; `CRR-007`. Prior delivery and endpoint-profile API/E2E results are superseded for current-result purposes.
- Why this revision was recorded: The approved design removed endpoint profiles/aliases and added a native Qwen configuration pair, exact catalog values, strict cross-store compensation, restart durability, and reviewed Settings recovery behavior. The historical round-1/2 result could not be inferred to validate this materially different contract.
- Coverage decisions or durable test paths changed:
  - Added `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/autobyteus-server-ts/tests/e2e/llm-management/qwen-configuration-lifecycle-graphql.e2e.test.ts` for real probe, GraphQL save/error boundaries, vault/`.env`, configured and representative key-only restarts, exact catalog, fresh-process Qwen requests, and secret hygiene.
  - Updated `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/autobyteus-server-ts/tests/e2e/llm-management/custom-provider-model-metadata-graphql.e2e.test.ts` to prove advertised precedence and exact-only Qwen-owned duplicate candidate behavior with suffixed/unknown near misses.
  - Removed no durable coverage. Classified every historical `qwen3.8-max-preview` token-usage fixture as `Still Valid` opaque custom-provider ledger history, not native support or compatibility behavior.
- Scenarios added, changed, removed, or rechecked: Added `QW-E2E-001`–`004` and `QW-BRW-001`–`003`; updated `CUS-E2E-001`; rechecked `HIST-001` and 154 focused core/server/web tests; removed none.
- Commands, environment, fixture, or broader-validation delta: Built the current server/shared packages, ran 37 core + 76 server + 41 web focused tests, ran the two changed GraphQL E2E files (4 tests), ran web boundary/localization guards, and executed headless Chrome 151 through owned Nuxt/built-server/loopback-provider processes. The browser forced exactly one post-save provider-settings rejection and proved committed-state authority plus global and selected-provider reload recovery.

#### Prior Failure Resolution

None. `API-REV-002` had no unresolved failure. The older endpoint-profile result is superseded by an approved product-contract revision, not reclassified as a failure. Two local lifecycle-harness defects found during this round were corrected before the authoritative rerun; the final combined E2E command passed.

- Canonical artifacts and sections updated:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/api-e2e-coverage-investigation.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/api-e2e-execution-coverage-report.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/api-e2e-revision-record.md`
- Prior result and confidence: `Pass`, `95.3%`, for the historical endpoint-profile contract; explicitly superseded and not reused as current proof.
- Current result and confidence: `Pass`, `96.4%`; every applicable category is at least 95%, the default clean target is met, and every critical current acceptance criterion has direct complementary evidence.
- New or remaining failure IDs: `None`.
- Recommended recipient: `code_reviewer` for proportional review of the two changed durable E2E paths; delivery waits until that review passes.
- Remaining risks, blocked evidence, or untested scope: Real Alibaba availability, credentials, quota/region enforcement, TLS, and undocumented payload variation were not exercised; the approved OpenAI-compatible boundary was deterministically emulated. Electron shell and distributed-worker execution are inapplicable to the changed boundary.


### API-REV-004 — Resolve persisted-route and provider-scoped cleanup proof defects

- Triggering role, report path, and round: `code_reviewer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/api-e2e-test-review-report.md` CRR-008; corrective execution round `4`.
- Triggering finding or scenario IDs: `TR-002` / `QW-E2E-003`; `TR-003` / `CUS-E2E-001` cleanup.
- Related solution, architecture-review, implementation, code-review, or delivery revision IDs: `SR-010`–`SR-011`; `ARCH-REV-005`; `IR-006`; `CRR-007`–`CRR-008`; `API-REV-003`. Delivery remains blocked pending re-review.
- Why this revision was recorded: CRR-008 correctly found that the request child received the expected URL directly and that cleanup globally forbade approved duplicate values. Both were bounded durable-test proof defects; no production defect or failed runtime execution was inferred.
- Coverage decisions or durable test paths changed:
  - Updated `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/autobyteus-server-ts/tests/e2e/llm-management/qwen-configuration-lifecycle-graphql.e2e.test.ts` to remove `qwenBaseUrl` from the fresh-child input and remove the explicit `QWEN_BASE_URL` sanitized-environment assignment. AppConfig must now load the GraphQL-persisted owned `.env` before all three captured requests.
  - Updated `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/autobyteus-server-ts/tests/e2e/llm-management/custom-provider-model-metadata-graphql.e2e.test.ts` to query model `providerId` after deletion and assert that neither a provider group nor any remaining model is owned by `deletedProviderId`; removed global shared-wire-value absence.
  - Added or removed no durable test file and changed no production source.
- Scenarios added, changed, removed, or rechecked: Corrected and rechecked `QW-E2E-003` and the cleanup portion of `CUS-E2E-001`; all other API-REV-003 scenarios remain valid and unchanged.
- Commands, environment, fixture, or broader-validation delta: Reran the two affected GraphQL E2E files together in the normal isolated Vitest environment. The command passed 2 files / 4 tests in 17.58 seconds. `git diff --check`, an explicit-child-override absence check, owner-scoped cleanup source check, and owned-runtime cleanup check passed. No browser rerun was required because production/browser behavior did not change.

#### Prior Failure Resolution

| Prior Scenario / Failure Reference | Previous Classification | Current Resolution | Evidence |
| --- | --- | --- | --- |
| `TR-002` / `QW-E2E-003` | `Local Fix`; blocking proportional review | `Resolved` | Fresh child environment contains no `QWEN_BASE_URL`; normal AppConfig startup loads the owned persisted `.env`; the three exact loopback requests still pass. `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/probes/api-e2e/server-e2e-api-rev-004.log` |
| `TR-003` / `CUS-E2E-001` cleanup | `Local Fix`; blocking proportional review | `Resolved` | Post-delete catalog asserts no provider/model owner equals `deletedProviderId` and retains config absence without forbidding native/shared wire values. Same affected E2E log passed. |

- Canonical artifacts and sections updated:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/api-e2e-coverage-investigation.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/api-e2e-execution-coverage-report.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/api-e2e-revision-record.md`
- Prior result and confidence: API-REV-003 execution `Pass`, `96.4%`; CRR-008 proportional review `Fail` on `TR-002`/`TR-003`.
- Current result and confidence: `Pass`, `96.4%`; numeric confidence is unchanged, but its direct persisted-route and cleanup assertions are now valid. Proportional re-review remains required.
- New or remaining failure IDs: `None` in API/E2E execution; `TR-002`/`TR-003` await reviewer closure.
- Recommended recipient: `code_reviewer` for proportional re-review; then `delivery_engineer` only after a pass.
- Remaining risks, blocked evidence, or untested scope: Same bounded vendor residual risk as API-REV-003. No additional browser, Electron-shell, worker, or cross-platform execution was needed for test-only corrections.

### API-REV-005 — Integrated AppConfig/Qwen lifecycle and Settings recovery authorization

- Triggering role, report path, and round: `code_reviewer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/code-review-report.md` (`CRR-010`); integrated execution round `5`.
- Triggering finding or scenario IDs: delivery integration blocker `DR-003`, resolved implementation `IR-007`; revalidation of AppConfig/SQLite integration, `QW-E2E-001`–`004`, `CUS-E2E-001`, `QW-BRW-001`–`003`, and `HIST-001`.
- Related solution, architecture-review, implementation, code-review, API/E2E, and delivery revisions: `SR-010`–`SR-011`; `ARCH-REV-004`–`ARCH-REV-005`; `IR-007`; `CRR-009`–`CRR-010`; `API-REV-004`; `DR-003`.
- Integrated state: merge commit `9817d3b1fdcbfec4c5249eb782ae2d9acfb25688`, whose second parent is the recorded `origin/personal@647b1119a9dc3ba2ba301243e1b5e752943454db`.
- Why this revision was recorded: API-REV-004/CRR-009 passed the protected pre-integration checkpoint but did not authorize a later conflict resolution. The merged AppConfig path owns both Windows-safe Prisma SQLite URL initialization and the strict durable `QWEN_BASE_URL` commit used by Qwen restart/routing. Fresh integrated repository, lifecycle/API, and browser execution was therefore mandatory.
- Coverage investigation decision: all current durable scenarios remain `Still Valid`; none needed update, replacement, addition, or removal. Historical `qwen3.8-max-preview` ledger fixtures remain valid opaque custom-provider snapshots and not native/alias/compatibility behavior.
- Durable coverage delta: `None`. The Qwen lifecycle GraphQL E2E and custom-provider metadata GraphQL E2E are byte-unchanged from the CRR-009-reviewed checkpoint.
- Repository execution:
  - core exact metadata/Qwen: `4 files / 25 tests passed`;
  - merged server conflict/Qwen boundary: `5 files / 73 passed / 1 intentional Windows-only skip`;
  - current Qwen Settings: `5 files / 32 tests passed`;
  - integrated server/shared build, Prisma generation, built-in-agent bootstrap, and sanitized no-DATABASE_URL smoke: `Pass`;
  - live GraphQL lifecycle/custom-provider E2E: `2 files / 4 tests passed`;
  - web boundary, localization boundary, and localization literal audit: `Pass`.
- Broader validation: `Required and completed — Pass`. Headless Chrome ran through owned Nuxt and the integrated built backend. It saved through the real loopback probe, forced exactly one post-save provider-settings rejection, proved committed configured state and truthful warning, held global provider-settings and selected-provider catalog refreshes to prove neither success notification appeared early, recovered configured Qwen plus exact identifiers, preserved preview absence, and passed a 390px overflow check.
- Cleanup/security: unique app-data/database/key state removed; owned server/Nuxt/provider/Chrome processes stopped; temporary harness removed; generated secret absent from retained browser evidence and owned logs/runtime files; unowned state untouched.

#### Prior Failure / Authorization Resolution

| Prior Reference | Prior State | API-REV-005 Resolution | Evidence |
| --- | --- | --- | --- |
| `DR-003` | Delivery blocked; AppConfig production/test conflicts aborted | `Resolved upstream by IR-007/CRR-010 and executable authorization restored` | Integrated focused/build/lifecycle/browser checks all pass at merge HEAD |
| `API-REV-004` / `CRR-009` | Pass on pre-integration checkpoint only | `Not inferred; independently re-established` | API-REV-005 logs/evidence under `tickets/in-progress/custom-provider-model-context-metadata/probes/api-e2e/` |

- Canonical artifacts updated:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/api-e2e-coverage-investigation.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/api-e2e-execution-coverage-report.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/api-e2e-revision-record.md`
- Prior result and confidence: pre-integration API-REV-004 `Pass / 96.4%`, explicitly insufficient to authorize the merge.
- Current result and confidence: integrated API-REV-005 `Pass / 96.4%`; all applicable categories are at least 95%, every critical current acceptance criterion has direct complementary evidence, and broader validation passed.
- New or remaining failure IDs: `None`.
- Proportional durable-test review required: `No`; no durable repository coverage changed in API-REV-005, and CRR-009 already passed the unchanged test code.
- Recommended recipient: `delivery_engineer` to restart delivery from a fresh tracked-base refresh.
- Remaining risks: real Alibaba availability, credentials, quota, region policy, TLS behavior, undocumented payload variation, and future drift in source-dated vendor facts were not exercised. The loopback provider proves the approved OpenAI-compatible contract only.
