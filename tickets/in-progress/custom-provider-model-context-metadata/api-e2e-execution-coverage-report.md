# API/E2E Execution Coverage Report

## Execution Round Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/design-spec.md`
- Supplemental Task Artifacts: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/qwen-native-provider-setup-ui-spec.md`
- Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/solution-revision-record.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/design-review-report.md`
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/architecture-review-revision-record.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/implementation-handoff.md`
- Implementation Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/implementation-revision-record.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/code-review-report.md`
- Code Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/code-review-revision-record.md`
- Delivery Revision Record (delivery re-entry only): `N/A` — prior delivery evidence is superseded by `SR-010`/`SR-011` and `IR-006`.
- Relevant Delivery Revision IDs: `N/A`
- Coverage Investigation: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/api-e2e-coverage-investigation.md`
- API/E2E Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-004`
- Current Execution Round: `4`
- Trigger: `code_reviewer` `CRR-008` proportional durable-test review `Fail — Local Fix`, findings `TR-002` and `TR-003`; `CRR-007` implementation source remains `Pass`.
- Prior Round Reviewed: `Yes` — API-REV-003 current-contract execution and CRR-008's two proof findings were rechecked before corrective edits. API-REV-001/002 remain historical endpoint-profile rounds.
- Latest Authoritative Round: `API-REV-004 corrective affected rerun and this report`

## Investigation And Execution Basis

- Coverage investigation artifact: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/api-e2e-coverage-investigation.md`
- Investigation completed before durable coverage changes or final execution: `Yes`
- Investigation plan followed: `Yes` — round 4 removed the explicit `QWEN_BASE_URL` child override identified by `TR-002` and replaced the global shared-wire-value deletion postcondition identified by `TR-003` with deleted-provider ownership assertions.
- Existing coverage decisions revised during execution, with evidence: `Yes` — `QW-E2E-003` and the `CUS-E2E-001` cleanup were reclassified `Needs Update`, corrected, and passed together. Historical `qwen3.8-max-preview` strings remain `Still Valid` opaque custom-model ledger identities.
- Reroute required before or during execution: `No`
- Notes: The API-REV-004 affected rerun and integrity checks passed. Round-3 focused/build/browser evidence remains applicable because no production source or runtime fixture topology changed. `TR-002` and `TR-003` were test-code proof defects only and are resolved pending proportional re-review.

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No`
- Approved persisted-data transition followed without unnecessary migration or version-specific runtime fallback: `Yes`
- Durable coverage added or retained only for compatibility-only behavior: `No`
- If compatibility-related invalid scope was observed, reroute classification used: `N/A`
- Upstream recipient notified: `N/A`

The retained preview fixture strings exercise historical custom-provider event identity and provider-name snapshots after rename/deletion. They do not register, resolve, alias, or advertise a native Qwen preview model and therefore do not constitute invalid compatibility coverage.

## Changed Boundary And Evidence Matrix

| Scenario ID | Behavior / Requirement / Acceptance-Criteria IDs | Changed Boundary | Execution Surface / Mode | Evidence Type | Result | Evidence / Artifact |
| --- | --- | --- | --- | --- | --- | --- |
| `CUS-E2E-001` | `REQ-001`–`REQ-004`, `REQ-008`, `REQ-009`; `AC-001`–`AC-005` | Custom discovery -> exact metadata -> GraphQL catalog | Current durable GraphQL E2E with synthetic custom provider | Durable / Live | `Pass` | Live `qwen3.8-max` metadata wins, exact DeepSeek/GLM fallbacks resolve, suffixed/unknown values remain null, stale/security behavior remains correct; API-REV-004 cleanup proves deleted provider group/model ownership/config absence without forbidding approved shared values |
| `QW-E2E-001` | `REQ-005`, `REQ-008`, `REQ-010`–`REQ-012`; `AC-007`, `AC-011`, `AC-014` | Qwen save -> probe -> vault + `.env` -> configured restart; representative key-only state -> default-source restart | Three built Fastify/GraphQL server starts, real SQLite vault, real owned file system, loopback provider | Durable / Live | `Pass` | New lifecycle E2E and `server-e2e.log`; key-only restart returned default URL/source with the existing key still configured |
| `QW-E2E-002` | `REQ-007`; `AC-009`, `AC-010` | Native definitions -> runtime registry -> GraphQL catalog | Live catalog before and after restart | Durable / Live | `Pass` | Exact values, unique Qwen identifiers, 1m/1m/198k contexts, duplicate provider ownership, and native preview absence |
| `QW-E2E-003` | `REQ-006`; `AC-008`, `AC-011` | Persisted Qwen pair -> normal fresh-process AppConfig/vault startup -> client -> provider request | Three newly constructed Qwen clients in a sanitized fresh owned process with no explicit `QWEN_BASE_URL`, real loopback `/chat/completions` | Durable / Live | `Pass` | API-REV-004 captured the saved path, stored Authorization, and exact wire model for all three values after AppConfig loaded the owned persisted `.env` |
| `QW-E2E-004` | `REQ-008`, `REQ-011`; `AC-012`, `AC-013` | Probe/durable-write/compensation/error boundary | 401 probe, atomic file obstruction, GraphQL responses, repair mapping, canary scan | Durable / Live | `Pass` | No-prior and prior-key URL failure return previous-restored; prior status survives; repair-required mapping is sanitized; no generated secret/provider private payload in responses, owned files, either server output, or fresh-process output |
| `QW-REP-001` | All current core/server/web requirements | Focused source and component boundaries | Core/server/web Vitest suites, build, guards | Durable | `Pass` | 154 focused tests plus build/smoke and three web guards |
| `QW-BRW-001` | `REQ-005`, `REQ-010`, `REQ-012`; `AC-007`, `AC-011`, `AC-014`; `UXJ-001`–`003` | Chrome DOM -> Pinia/Apollo -> live backend -> provider | Nuxt browser-development path and headless Google Chrome | Temporary / Browser / Live | `Pass` | Default source, invalid absolute URL, mask/show/hide, real save/probe, configured state, cleared plaintext, exact Qwen model identifiers |
| `QW-BRW-002` | `IR-005`, `IR-006`, `CR-002`, `CR-003` | Committed mutation plus subordinate refresh failure/recovery | Exactly one intercepted post-save `GetProviderSettings`; live mutation/catalog; visible global reload | Temporary / Browser / Live | `Pass` | Provider settings cleared while committed setup remains; amber warning appears without save error; `ReloadLLMModels` precedes both refresh queries and success appears only after recovery |
| `QW-BRW-003` | `IR-006`; responsive UI requirements | Selected-provider reload and narrow renderer | Visible Qwen provider reload plus 390x844 viewport | Temporary / Browser / Live | `Pass` | `ReloadLLMProviderModels` precedes both refresh queries; Qwen remains configured; document 390/390 px with form inside viewport |
| `HIST-001` | Historical token ledger semantics; no native compatibility behavior | Persisted custom-model display snapshot | Focused server projection/integration suites plus string inventory | Durable | `Pass` | `qwen3.8-max-preview` occurrences are unchanged and remain opaque custom-provider values only |

## Additional Repository Coverage Execution

API-REV-004 reran exactly the two durable files affected by `TR-002` and `TR-003`. No production, focused core/server/web, build, or browser suite needed repetition because CRR-008 found only bounded test-code proof defects and the corrected live E2E composes the relevant AppConfig/vault/catalog boundaries.

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| 1 | `pnpm exec vitest run tests/e2e/llm-management/qwen-configuration-lifecycle-graphql.e2e.test.ts tests/e2e/llm-management/custom-provider-model-metadata-graphql.e2e.test.ts --no-watch` | `autobyteus-server-ts` | Unmasked persisted `.env` URL -> normal fresh-process Qwen requests; deleted-provider-scoped catalog cleanup | `Pass` — 2 files / 4 tests | `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/probes/api-e2e/server-e2e-api-rev-004.log` |
| 2 | `git diff --check` plus focused source checks for absent child override and owner-scoped cleanup | Worktree root | `TR-002`/`TR-003` corrective integrity | `Pass` | `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/probes/api-e2e/repository-integrity-api-rev-004.log` |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | Change | New / Final Supporting Evidence | Residual Uncertainty |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | `96%` | `97%` | `+1` | Browser directly proved the visible pair-save/recovery journeys and both reload controls | Vendor metadata remains source-dated |
| Changed-boundary execution directness | `96%` | `97%` | `+1` | Chrome submitted the real mutation; API-REV-004's sanitized fresh process loaded the saved owned `.env` through AppConfig with no explicit endpoint override and made the exact requests | Real Alibaba service not contacted |
| Cross-boundary integration realism and mock gap | `94%` | `96%` | `+2` | Nuxt, Chrome, Apollo, GraphQL, vault/AppConfig, configured/key-only restarts, fresh process, and loopback provider are composed; cleanup is scoped to actual provider ownership | External network behavior is locally emulated |
| Environment, configuration, identity, and fixture fidelity | `95%` | `95%` | `0` | Owned real files/DB/processes and generated canaries provide strong local fidelity | No vendor credential/quota/region enforcement |
| Failure, edge-case, lifecycle, and recovery evidence | `96%` | `97%` | `+1` | Forced rejected provider-settings refresh preserved committed UI state; both reload paths recovered only after both queries | Catastrophic double compensation is fault-injected rather than produced by corrupting two real stores simultaneously |
| User-surface, browser, and desktop-shell confidence | `90%` | `96%` | `+6` | Chrome semantic assertions plus desktop/narrow screenshots prove the web-equivalent renderer; Electron shell is unaffected | Actual Electron shell not launched because no shell boundary changed |
| Durable regression coverage quality and relevance | `97%` | `97%` | `0` | New lifecycle E2E and updated custom GraphQL E2E are narrow and passed together; existing component/Apollo coverage remains direct | Proportional code review is still required by workflow |

- Overall post-repository confidence: `94.9%`
- Overall final confidence: `96.4%`
- Calculation method: Simple average of seven applicable category scores, rounded to one decimal.
- Confidence change produced by broader validation: `+1.5 percentage points`; it closed the frontend/live-contract and user-surface gaps.
- Every critical acceptance criterion directly proven: `Yes`, using complementary durable, live lifecycle/API, and browser evidence.
- Any final applicable category below `90%`: `No`; every category is at least `95%`.
- Default final confidence target of `95%` met: `Yes`
- Confidence-limiting residual risks: Real Alibaba endpoint availability, current vendor payload quirks, quota/region policy, and source-dated model facts were not tested. The local provider emulates the approved OpenAI-compatible contract. Electron shell execution is not relevant to the changed renderer-only path. Proportional review of changed test code is pending.
- API-REV-004 confidence reassessment: `96.4%` remains the current final score. CRR-008 exposed that two durable assertions did not support their claims; the corrected live rerun now supplies that support. No runtime behavior, browser evidence, or residual-risk category changed enough to alter the numeric score.

## Broader Validation Decision And Execution

- Decision and selected execution mode from the coverage investigation: Round 3 `Required` and completed via browser-equivalent Nuxt/Chrome journey. Round 4 `Not Required` because only durable test proof changed; the corrected live E2E passed and all production/browser evidence remains applicable.
- Material deviation from the planned mode or rationale: Desktop viewport was `1280x900` rather than the forecast `1440x1000`; narrow remained `390x844`. Both global and selected-provider Reload Models paths were exercised, exceeding the initial recovery-only plan.
- Confidence gap or residual risk actually addressed: Real browser rendering and validation; client/backend runtime wiring; actual pair mutation/probe; committed-state authority across one rejected subordinate query; both refresh owners after each reload mutation; narrow overflow.
- Startup order, commands, and readiness results: Existing built server artifact; owned provider; `startBuiltTestServer`; `pnpm exec nuxt dev --host 127.0.0.1 --port <reserved>`; frontend HTTP 200; form visible; Chrome launched.
- Environment choices that materially affected the run: All three services used reserved `127.0.0.1` ports because unowned fixed dev ports were not touched. `BACKEND_NODE_BASE_URL` and explicit backend endpoint variables targeted the owned server. English locale, fresh browser context, isolated SQLite/vault/app-data, generated in-memory key.
- Seed data, fixtures, identities, authentication, permissions, or session state: No application account or seed. UI saved the only Qwen pair through GraphQL. The provider accepted the generated key and returned the approved model IDs. The key was never written to evidence.

| Scenario / Journey Step | Expected Observable Result | Actual Observable Result | DOM / Screenshot / Log / API / Process Evidence | Result |
| --- | --- | --- | --- | --- |
| Open Settings and select Qwen | Default endpoint badge; password field masked | Badge read `Using default endpoint`; input type was `password` | Semantic DOM assertions in `qwen-settings-browser-evidence.json` | `Pass` |
| Visibility and validation | Toggle reveals/remasks; non-absolute URL blocks submit and shows validation | Types changed `password -> text -> password`; absolute URL message visible; button disabled | Browser assertion log | `Pass` |
| Save real pair | Live `/models` uses Authorization; mutation commits; key clears/remasks | Provider recorded one authenticated `/compatible-mode/v1/models`; configured badge/key state visible; plaintext empty | Evidence JSON and backend log | `Pass` |
| Reject subordinate provider-settings refresh | Save remains successful; stale provider rows clear; warning tells user to reload; no save error | Exactly one `GetProviderSettings` was intercepted; committed Qwen setup persisted, row cleared, warning visible, no Qwen save error | GraphQL event sequence and Chrome console's expected injected-error trace | `Pass` |
| Global Reload Models | Mutation followed by catalog and settings; success only after both; provider/model state recovers | `ReloadLLMModels`, then both queries; Qwen row/configured state and exact identifiers visible; success notification | Evidence JSON and desktop screenshot | `Pass` |
| Selected Qwen Reload Models | Provider reload followed by catalog and settings; success after both | `ReloadLLMProviderModels`, then both queries; `Models reloaded for Qwen` visible | Evidence JSON and screenshots | `Pass` |
| Narrow 390x844 | No document horizontal overflow; form inside viewport | document/client widths `390/390`; form left/right `45/345` | Evidence JSON and narrow screenshot | `Pass` |

Observed non-failing diagnostics: the forced GraphQL rejection produced the expected application `console.error`; Chrome emitted verbose password-form advisories from the broader Settings surface; Nuxt development warmup logged transient `#app-manifest` pre-transform diagnostics while still reaching ready state and rendering the journey. There were no unexpected browser `error`/`pageerror` events, and all asserted interactions completed.

## Desktop Application Validation (When Applicable)

- Validation approach executed and any deviation from the investigation: Browser-first validation of the shared Nuxt renderer, as planned. Electron was not launched.
- Browser-tested web-equivalent behavior and evidence: Full Qwen Settings journey, GraphQL traffic sequencing, notifications, exact catalog display, and responsive layout.
- Shell-specific or lifecycle behavior and evidence: `N/A`; no preload, IPC, window, packaging, or native lifecycle source changed.
- Effect on any already-running desktop application: `None`; no fixed port or running process was stopped/reused.
- Behavior not directly proven and confidence consequence: Electron-shell embedding itself was not tested and creates no material confidence deduction for this renderer-only change.

## Platform / Runtime Targets

- Operating system / platform: macOS Darwin 25.5.0, arm64.
- Runtime and relevant framework versions: Node `22.23.1`; pnpm `10.28.2`; core/server Vitest `4.0.18`; web Vitest `3.2.4`; Nuxt `3.21.1`; Playwright Core `1.58.2`.
- Browser / engine and version: Google Chrome `151.0.7922.108`, headless.
- Device, viewport, locale, timezone, or accessibility settings: `1280x900` desktop then `390x844` narrow; English; host timezone Europe/Berlin; no special accessibility emulation.

## Lifecycle / Upgrade / Restart / Persisted-Data Checks

- Approved persisted-data decision: `Directly Usable — No Migration`
- Representative existing data exercised: After proving the configured pair across restart and real Qwen requests, the owned runtime's optional `QWEN_BASE_URL` assignment was removed while the actual vault key was retained. A third full built-server start read that representative key-only installation through normal GraphQL status.
- Direct-use, discard/rebuild, or migration result and evidence: `Pass`. The configured restart returned `CONFIGURED` with key Boolean true, preserved the exact catalog, and supplied fresh Qwen clients without migration. The representative key-only restart returned the historical default URL, `DEFAULT`, and key Boolean true without rewriting or migrating the key.
- Migration completion/recovery evidence, only when `Migration Required`: `N/A`
- Version-specific runtime branch, dual read/write, or compatibility fallback observed: `No`
- Residual untested persisted-data risk: OS-specific filesystem/ACL behavior beyond macOS is covered only by repository tests, not live lifecycle execution in this round.

## Tests Implemented Or Updated

| Path / Scenario | Change | Requirement / Boundary | Execution Result | Notes |
| --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/autobyteus-server-ts/tests/e2e/llm-management/qwen-configuration-lifecycle-graphql.e2e.test.ts` | Added; corrected in API-REV-004 | `QW-E2E-001`–`004`; real Qwen save/probe/compensation/restart/catalog/request/error/security lifecycle | `Pass` — 1 test | Generated canaries and owned resources; fresh request process now receives no explicit Qwen endpoint and loads the saved runtime `.env` normally |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/autobyteus-server-ts/tests/e2e/llm-management/custom-provider-model-metadata-graphql.e2e.test.ts` | Updated; corrected in API-REV-004 | `CUS-E2E-001`; current exact duplicate candidates, advertised precedence, near-match unknown, owner-scoped deletion | `Pass` — 3 tests | Preserves stale/secret/raw-payload assertions; cleanup checks deleted provider/model ownership without forbidding shared wire values |

## Tests Removed As Stale Or Obsolete

None.

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `Yes`
- Paths added or updated:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/autobyteus-server-ts/tests/e2e/llm-management/qwen-configuration-lifecycle-graphql.e2e.test.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/autobyteus-server-ts/tests/e2e/llm-management/custom-provider-model-metadata-graphql.e2e.test.ts`
- Paths removed: `None`
- Added or updated paths attached for proportional test-code review: `Yes`
- Diff or repository evidence supplied for removed paths: `N/A`

## Other Execution Artifacts

| Artifact Path | Type / Purpose | Retained Or Temporary | Notes |
| --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/probes/api-e2e/core-focused.log` | Core focused test log | Retained evidence | 6 files / 37 tests |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/probes/api-e2e/server-focused.log` | Server focused test log | Retained evidence | 6 files / 76 tests |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/probes/api-e2e/web-focused.log` | Web focused test log | Retained evidence | 6 files / 41 tests |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/probes/api-e2e/server-build.log` | Build/bootstrap smoke log | Retained evidence | Pass |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/probes/api-e2e/server-e2e.log` | Final lifecycle/custom GraphQL E2E log | Retained evidence | 2 files / 4 tests |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/probes/api-e2e/server-e2e-api-rev-004.log` | API-REV-004 corrective affected E2E log | Retained evidence | 2 files / 4 tests; `TR-002`/`TR-003` corrected proof |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/probes/api-e2e/web-guards.log` | Boundary/localization audit log | Retained evidence | All pass |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/probes/api-e2e/repository-integrity.log` | Diff and preview-fixture inventory | Retained evidence | Pass/classification locations |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/probes/api-e2e/repository-integrity-api-rev-004.log` | Corrective diff/source-shape verification | Retained evidence | Pass; explicit child override absent and cleanup owner-scoped |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/probes/api-e2e/qwen-settings-browser-evidence.json` | Sanitized semantic/request/browser evidence | Retained evidence | Pass; no generated secret |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/probes/api-e2e/qwen-settings-recovery-desktop.png` | Desktop browser screenshot | Retained evidence | Configured Qwen and selected-provider success |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/probes/api-e2e/qwen-settings-recovery-narrow.png` | Narrow browser screenshot | Retained evidence | 390px layout |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/probes/api-e2e/qwen-settings-browser-run.log` | Browser harness output | Retained evidence | Pass |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/probes/api-e2e/qwen-settings-browser-frontend.log` | Owned Nuxt log | Retained evidence | Secret scan passed |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/probes/api-e2e/qwen-settings-browser-backend.log` | Owned backend log | Retained evidence | Secret scan passed |

## Temporary Execution Methods / Scaffolding

| Path / Method | Why Needed | Result / Evidence | Cleanup Result |
| --- | --- | --- | --- |
| `/tmp/qwen-settings-browser-probe.mjs` | No repository-wide Settings browser harness exists; one-time cross-boundary fault injection and semantic assertions closed the material gap without duplicating durable component/Apollo fixtures | Browser evidence and screenshots above passed | Script removed after evidence/report creation; all owned processes/state cleaned |
| Fresh inline Node process in durable Qwen E2E | The direct-use request must open the restarted runtime's real database/vault rather than Vitest's suite-global Prisma database | Three exact Qwen requests passed; output included in secret scan | Child exits per test; no retained process/state |

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| Alibaba/Qwen OpenAI-compatible service | Owned loopback HTTP server implementing `/models` and `/chat/completions`, checking bearer equality and capturing sanitized route/model metadata | No vendor credential was provided; real network is non-deterministic and unnecessary for the approved local routing/contract | Does not prove current vendor availability, quota/region rules, TLS, or undocumented payload variation |
| Post-save provider-settings failure | Browser route fulfills exactly one `GetProviderSettings` with a GraphQL error after the real mutation | Deterministically exercises the reviewed reachable recovery boundary while preserving real mutation/catalog/backend behavior | Does not simulate every possible network transport failure, but durable Apollo/runtime tests cover normalized rejection behavior |
| Durable environment commit failure | Owned `.env` is temporarily moved aside and its path replaced by a directory | Forces the real atomic rename to fail safely within owned state | Specific OS error differs across platforms; product compensation behavior is directly exercised |
| Repair-required double-failure API mapping | Real schema with service method fault-injected to throw the approved domain error; detailed service double-failure matrix runs in unit coverage | Corrupting both vault compensation and file storage in one live E2E would be brittle/destructive without adding contract confidence | Full physical double corruption is not replayed end-to-end; service logic and GraphQL sanitization are proven separately |

## Result Summary

| Result | Scenario IDs | Summary / Reason |
| --- | --- | --- |
| `Pass` | `CUS-E2E-001`, `QW-E2E-001`–`004`, `QW-REP-001`, `QW-BRW-001`–`003`, `HIST-001` | All current critical requirements passed focused durable coverage, realistic GraphQL/file/vault/restart/provider execution, and browser-equivalent Settings validation. No implementation or requirement failure remains. |
| `Out Of Scope` | Electron shell, distributed workers | No changed shell/IPC/worker boundary exists. |
| `Not Tested` | Real Alibaba production service | No credential; safely emulated contract leaves a bounded vendor residual risk. |

## Cleanup Performed

| Resource / Process / Data | Ownership | Cleanup Action | Result |
| --- | --- | --- | --- |
| Built server children in durable E2E | Created by test helper | Graceful stop; kill fallback in `afterEach` | `Pass`; none remain |
| Durable E2E app-data/SQLite/root-key files | Unique `tests/.tmp` and `db` names | `removeOwnedTestRuntime` | `Pass`; unique targets removed |
| Loopback provider servers | Created by tests/harness | `server.close()` | `Pass` |
| Browser backend/Nuxt/Chrome | Created by temporary harness on reserved ports | Close browser, stop backend, terminate Nuxt process group | `Pass`; none remain |
| Browser isolated runtime/database | Unique harness paths | `removeOwnedTestRuntime` | `Pass` |
| Generated secret canaries | In memory and isolated vault only | Runtime/database removal; content scans before cleanup | `Pass`; absent from retained evidence/logs/environment |
| Temporary browser harness | `/tmp` only | Removed after reports were prepared | `Pass` |
| Unowned fixed-port processes | Not owned | Not inspected beyond port-occupancy decision; not stopped/reused | `Unaffected` |

## Preliminary Classification

- Outcome classification: `Pass`. `TR-002` and `TR-003` were valid `Local Fix` test-code findings and are resolved by API-REV-004. No `Design Impact`, `Requirement Gap`, `Unclear`, or production finding is open.
- Corrective evidence: The fresh child has no explicit Qwen endpoint override yet all three saved-route requests pass; cleanup asserts deleted provider/model ownership rather than global shared-value absence. No source-owner reroute was required.

## Recommended Recipient

`code_reviewer` for proportional re-review of the two API-REV-004-corrected durable E2E test paths and closure of `TR-002`/`TR-003`. Delivery remains blocked until that review passes.

## Evidence / Notes

- The browser run proved both supported Reload Models paths. Each mutation was followed by both `GetAvailableLLMProvidersWithModels` and `GetProviderSettings`, and the success notification was observed only after the requests resolved.
- Qwen duplicate wire values render under unique Qwen identifiers (`qwen:deepseek-v4-pro`, `qwen:glm-5.2`), while `qwen3.8-max` retains its direct identifier. This is the intended exact catalog behavior.
- `qwen3.8-max-preview` remains present only in historical custom-provider token-ledger fixtures and explicit absence assertions. It is not a native definition, alias, fallback profile, or compatibility path.

## Latest Authoritative Result

- Result values: `Pass` / `Fail` / `Blocked`
- Result: `Pass`
- Final validation confidence: `96.4%`
- Default `95%` confidence target met: `Yes`
- Any final applicable confidence category below `90%`: `No`
- Broader validation decision: Round 3 `Required and completed`; round 4 `Not Required` because only durable test proof changed and the corrected live E2E passed.
- Critical acceptance criteria lacking direct proof: `None`
- Required next recipient: `code_reviewer` for proportional durable test-code review
- Notes: Prior endpoint-profile evidence is superseded. API-REV-004 is the current Qwen/exact-only result; `TR-002` and `TR-003` are resolved in the affected rerun. Delivery must not resume until proportional re-review passes.
