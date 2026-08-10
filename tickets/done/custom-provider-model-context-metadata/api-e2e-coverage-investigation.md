# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/design-spec.md`
- Supplemental Task Artifacts: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/qwen-native-provider-setup-ui-spec.md`; `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/custom-provider-readable-id-migration-spec.md`
- Solution / Architecture Basis: current `SR-017` / `ARCH-REV-011`, retaining `SR-010`–`SR-012`, `SR-016`, `ARCH-REV-005`, and `ARCH-REV-010`
- Implementation Handoff / Revision: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/implementation-handoff.md`; `IR-013`
- Code Review: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/code-review-report.md`; `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/code-review-revision-record.md`; `CRR-019 Pass / 9.44`
- Triggering Delivery Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/delivery-revision-record.md` (`DR-006`)
- Current Source Subject: `331ff94da3c2c9a2a07e11efff68f5307a4cfabb` plus reviewed uncommitted `IR-013` changes to the shared web label owner and three focused durable web tests
- Current API/E2E Revision ID: `API-REV-010 Pass / 97.3%`; prior full-ticket result `API-REV-008 Pass / 96.9%`
- Prior API/E2E Result: `API-REV-009 targeted Pass / reproduced`, now superseded only for visible Qwen labels by `SR-017`; its backend identity and unprefixed-wire evidence remains valid context.
- Investigation Round: `10`
- Latest Authoritative Investigation: `This file. API-REV-010 was refreshed before execution and completed with current focused, production-build, live-browser, shared-selection, exact-selector, and outbound-wire evidence.`

## API-REV-010 SR-017 Friendly-Qwen Coverage Investigation

### Current Delta And Boundaries

- `BEH-008`, `REQ-016`, `AC-020`, and `AC-021` change presentation only: a live `providerType=QWEN` catalog row with a trimmed nonblank `name` must display that friendly name across Settings and shared catalog-backed selectors.
- The changed production boundary is the existing shared `autobyteus-web/utils/modelSelectionLabel.ts` owner. Settings, runtime-scoped, binding, application/member, and media catalog consumers already use this helper; no GraphQL, catalog, provider, persistence, factory, or request-builder source changed.
- Selection and routing identities are deliberately distinct and must be correlated in execution: visible label `GLM-5.2 (Qwen)` -> selected/persisted `qwen:glm-5.2` -> provider request `glm-5.2`. Direct-provider selectors remain unprefixed and separate.
- A blank Qwen catalog name and a stored selector missing from the live catalog must remain exact raw identifiers. Generic non-Qwen built-ins keep identifier labels, while custom OpenAI-compatible rows retain friendly labels.
- Electron shell behavior is unchanged. The user-reported behavior is renderer/API-equivalent, so current Nuxt in real Chrome connected read-only to the already-running DR-009 embedded backend is the preferred live validation surface. The packaged DR-009 frontend predates IR-013 and is not itself current label evidence.

### Current Coverage Classification

| Durable Path / Scenario | Classification | SR-017 Rationale / API-REV-010 Action |
| --- | --- | --- |
| `autobyteus-web/utils/__tests__/modelSelectionLabel.spec.ts` | `Needs Re-execution` | Implementation-owned update directly proves three friendly Qwen names, unchanged identifiers, blank-name raw fallback, and retained generic/custom policies. |
| `autobyteus-web/components/settings/providerApiKey/__tests__/ProviderModelBrowser.spec.ts` | `Needs Re-execution` | Implementation-owned update proves the actual Settings cards render friendly names and do not expose the three prefixed selectors. |
| `autobyteus-web/composables/messaging-binding-flow/__tests__/launch-preset-model-selection.spec.ts` | `Needs Re-execution` | Implementation-owned update proves a shared selector displays friendly option/selected labels while `updateModel` stores the exact `qwen:glm-5.2` selector. |
| `autobyteus-web/components/applications/setup/__tests__/ApplicationAgentLaunchProfileEditor.spec.ts` | `Still Valid; re-execute` | Retains raw unavailable-selector behavior required by AC-021 without inventing historical labels. |
| `autobyteus-server-ts/tests/e2e/llm-management/qwen-configuration-lifecycle-graphql.e2e.test.ts` | `Still Valid; targeted re-execution` | Server source is unchanged, but the real GraphQL/provider lifecycle remains the direct proof that catalog identifiers are prefixed while `value` and observed outbound request bodies are exact and unprefixed. |
| API-REV-009 live Settings reproduction | `Stale expectation; replace live probe` | Its live backend triples remain valid, but its expectation that Settings visibly show `qwen:...` is superseded. Replace with current-source Nuxt/Chrome friendly-label evidence against the same real embedded backend. |
| API-REV-008 setup/durability, exact metadata, SR-016, compensation, and recovery evidence | `Still Valid for unchanged behavior` | None of those source boundaries changed in IR-013; retain as regression context rather than rerunning the prior full 252-test/build matrix for a 43-line web presentation delta. |

### Coverage Gap And Durable-Change Decisions

| Required Evidence | Decision | Reason |
| --- | --- | --- |
| Live Settings labels against real backend catalog | `Use Temporary Executable Probe Only` | No repository browser suite owns the user's Electron-equivalent Settings journey. A read-only Chrome/Nuxt run can directly prove the rendered current source without mutating user state. |
| Shared selection and exact persistence | Existing implementation-owned durable binding regression plus temporary live-catalog executable probe | The durable composable test protects the behavior. A temporary browser page using the production binding composable and catalog data can add independent interactive proof without adding a product route or permanent test-only surface. |
| Exact provider wire request | Existing durable server E2E; targeted current rerun | The loopback OpenAI-compatible server observes route, authorization, and exact request model values across Qwen offerings. |
| Additional repository-resident API/E2E coverage | `None planned` | CRR-019 reviewed the implementation-owned focused tests, and the remaining confidence gap is live composition, not a missing durable unit/API assertion. Update this decision before editing durable coverage if execution exposes a gap. |

### Planned Execution Before Final Result

1. Run the four CRR-019-focused Nuxt files and retain exact counts/output.
2. Run the current Qwen lifecycle GraphQL E2E for catalog `modelIdentifier`/`value`, restart-backed endpoint loading, provider routing, authentication, and unprefixed outbound request models.
3. Run relevant web boundary guards and the Nuxt production build to prove the shared helper compiles through active consumers.
4. Query the real running Electron backend read-only, then start an owned isolated current-source Nuxt process and use real Chrome to prove Settings displays the three friendly Qwen names and not their `qwen:` selectors.
5. Use a temporary, removed-after-run Nuxt probe that imports the production binding selection composable, loads the live catalog, selects a friendly Qwen option, and observes the exact bound selector. Do not persist or mutate Electron backend state.
6. Correlate the live GraphQL triples, binding selector, and server E2E request value; perform diff/conflict/secret/temporary-file scans; stop only API-REV-010-owned browser/frontend resources.

### Pre-Execution Confidence And Broader Gate

| Confidence Category | Score | Pending Gap |
| --- | ---: | --- |
| Requirement and acceptance-criteria proof | 88% | Current independent execution of AC-020/AC-021 is pending. |
| Changed-boundary execution directness | 84% | Reviewer tests passed, but API/E2E has not yet executed current source. |
| Cross-boundary integration realism and mock gap | 82% | Live catalog -> shared label/selector -> exact wire correlation is pending. |
| Environment, configuration, identity, and fixture fidelity | 92% | The actual embedded backend is available read-only; owned current frontend setup is pending. |
| Failure, edge-case, lifecycle, and recovery evidence | 94% | API-REV-008 remains current for unchanged failure/lifecycle behavior; raw missing/blank-label regression needs current rerun. |
| User-surface, browser, and desktop-shell confidence | 78% | The exact user-reported surface must be re-observed with IR-013. Electron shell itself is unchanged/N/A. |
| Durable regression coverage quality and relevance | 94% | CRR-019 approved focused coverage; independent execution is pending. |

- Overall pre-execution confidence: `87.4%`.
- Broader validation decision: `Required`. Repository tests alone cannot prove that the user's live backend catalog is rendered correctly by current source or that an interactive shared selection retains its exact internal ID.
- Current authorization before execution: proceed with the plan above; do not infer a current Pass from API-REV-008, API-REV-009, or CRR-019.

### API-REV-010 Execution Outcome And Final Coverage Decision

| Selected Evidence | Result | Direct Boundary Proven |
| --- | --- | --- |
| Four focused Nuxt files | `Pass — 4 files / 12 tests` | Shared helper, Settings cards, binding label/exact selector, blank/raw fallback |
| Qwen lifecycle GraphQL E2E | `Pass — 1 file / 1 test` | Exact catalog IDs/values, physical persistence/restart, fresh request process, exact auth/route/unprefixed request models, compensation/failure boundaries |
| Web guards and production build | `Pass — all guards; 15 routes prerendered` | Active-consumer compilation and web/localization boundaries |
| Current Chrome Settings -> actual running Electron backend | `Pass` | Friendly Qwen cards visible; three prefixed selectors absent; read-only GraphQL HTTP 200; no console error |
| Current Chrome temporary shared binding -> live backend catalog | `Pass` | Friendly option/selected text -> exact `qwen:glm-5.2` bound state -> exact live catalog `glm-5.2` value |
| Integrity, secret, temporary-resource, and ownership checks | `Pass` | No unmerged/whitespace defect, secret-shaped evidence, test route/script/process/port residue, or impact on the user's running Electron backend |

- API/E2E-owned repository-resident durable coverage added/updated/removed: `None`.
- The three modified durable web tests are implementation-owned IR-013 changes already reviewed in CRR-019; API-REV-010 executed them without further edit.
- API-REV-009 classification update: its backend identity/wire evidence remains valid, but its visible-prefix expectation is now historical and replaced by the successful API-REV-010 friendly-label browser evidence.
- Exact identity correlation: `GLM-5.2 (Qwen)` visible label -> `qwen:glm-5.2` selected/persisted identity -> `glm-5.2` live catalog/request value. The Qwen lifecycle E2E separately observed exact unprefixed provider requests for `qwen3.8-max`, `deepseek-v4-pro`, and `glm-5.2`.
- Final confidence: `97.3%`; all seven applicable categories are at least `96%`; every critical SR-017 criterion has direct evidence.
- Final broader decision: `Required and completed — Pass`.
- Current result: `Pass`; no product/test/environment failure ID and no solution/implementation reroute.
- Residual risk: real Alibaba availability, credentials, quota, region policy, TLS behavior, and undocumented payload variation remain untested. DR-009's packaged frontend predates IR-013, so delivery must create and verify a new package.

## API-REV-009 User-Reported Qwen Label Investigation

- Trigger: the delivery-built Electron Settings screen visibly lists `qwen:deepseek-v4-pro`, `qwen:deepseek-v4-flash-0731`, and `qwen:glm-5.2`; the user requested a real reproduction and explanation.
- Boundary classification: renderer label selection -> live Electron backend GraphQL catalog -> internal model selector -> provider request wire value. Electron IPC/preload/window behavior is not implicated, so the documented browser frontend connected to the already-running embedded backend is the preferred direct reproduction.
- Approved-behavior check: REQ-007 and AC-010 explicitly require Qwen-prefixed **identifiers** for third-party duplicates while preserving exact unprefixed **wire values**. This is separate from the removed endpoint-profile machinery.
- Source trace to verify live: Qwen definitions provide friendly `name`, exact `value`, and collision-safe `modelIdentifierOverride`; GraphQL exposes all three; `ProviderModelBrowser` intentionally calls the shared default-runtime selection-label helper, which chooses `modelIdentifier` for built-in models.
- Existing coverage classification: API-REV-008's browser assertion is valid for the approved identifier contract but insufficient as an explanation of the identifier/name/value distinction. No durable coverage edit is planned unless live reproduction contradicts the approved/source contract.
- Execution plan: query the actual port-29695 Electron backend for Qwen `modelIdentifier`/`name`/`value`; start an owned Nuxt dev frontend against that backend on an isolated port; use real Chrome to inspect the Settings Qwen labels and capture DOM/GraphQL evidence; do not change user data; stop only the owned Nuxt/Chrome resources.
- Execution result: `Pass / reproduced`. The actual DR-009 backend returned collision-safe identifiers plus distinct friendly names and exact unprefixed values. Current Nuxt in real Chrome displayed exactly the three prefixed identifiers and no friendly aliases, matching the user's screenshot. All live backend operations were read-only and returned HTTP 200; no browser console error occurred.
- Root explanation: this is not profile residue. Direct DeepSeek/GLM providers already own `deepseek-v4-pro` / `glm-5.2`, so Qwen-routed duplicates need unique stored selectors (`qwen:...`) to resolve the Qwen provider. `ProviderModelBrowser` deliberately reuses the default-runtime selection label and therefore exposes that selector. The OpenAI-compatible request builder sends `this.model.value`, so Alibaba receives `deepseek-v4-pro`, `deepseek-v4-flash-0731`, or `glm-5.2` without the prefix; the retained lifecycle E2E directly observed those outbound values.
- Product classification: `No defect against current REQ-007/AC-010`. If friendly titles such as `DeepSeek V4 Pro (Qwen)` should replace identifiers only in visible UI, that is a presentation-requirement change; it must not collapse the distinct internal selectors.
- Durable coverage decision after execution: `No change`. No production or repository test file was edited.
- Cleanup: owned Chrome and Nuxt stopped; temporary probe removed; port 3137 is free; the user's Electron/backend remained running on 29695 and no user state was mutated.

## Current Behavior And Integration Delta

The current feature remains deliberately profile-free. A custom provider is configured with a name, Base URL, and API key; models are discovered from that endpoint; advertised metadata wins; otherwise only an exact built-in model value can provide curated fallback metadata. Near-match, suffix, alias, endpoint-profile, and URL-based inference do not exist. Native Qwen has its own Base URL/API-key pair and exact native catalog (`qwen3.8-max`, `deepseek-v4-pro`, `deepseek-v4-flash-0731`, `glm-5.2`). Historical `qwen3.8-max-preview` rows remain opaque history/custom values and are not native offerings.

SR-016 remains the current readable custom-provider identity/reset policy: exact deterministic V3 IDs, V1/V2 secretless reset, exact selector rewrite, empty V3 publication, post-commit trusted-ID removal-only cleanup, terminal startup gate, raw unavailable selectors, and same-name/exact-suffix recreation. API-REV-007's scenario definitions and CRR-014-reviewed durable coverage remain semantically current for that behavior.

IR-011 integrated a current-base AppConfig contract with the existing Qwen durability path. The exact retired `AUTOBYTEUS_STREAM_PARSER` setting is discarded at initialization and rejected by normal/durable writes while similarly named settings remain. Qwen persistence still uses same-directory exclusive temporary creation, full write/fsync, atomic rename, pre-commit cleanup, sanitized failure, runtime publication only after commit, and command-local key compensation. IR-012 closes the only integrated defect by explicitly applying the pre-existing `.env` permission bits with `fchmodSync` after `openSync("wx", mode)` so restrictive umask cannot narrow the committed file.

## Changed Surface And Boundary Classification

| Surface / Boundary | Current Impact | Direct Evidence Needed | Residual Gap / Broader Candidate |
| --- | --- | --- | --- |
| Backend config / filesystem | Changed | Real `AppConfig.setDurably`; exact retired-setting behavior; restrictive-umask mode preservation; pre-commit cleanup | POSIX direct helper/unit is suitable; no browser can observe mode mechanics directly |
| Qwen service / GraphQL / vault | Revalidate | Probe, key save, URL commit, compensation, sanitized failure codes, status, exact catalog | Built server, physical `.env`/vault, restart, fresh request process, loopback Qwen |
| Process lifecycle / persisted config | Changed intersection | Restart must load persisted `QWEN_BASE_URL` without child override and route every native model | Critical Qwen lifecycle E2E |
| Current-base retired setting | Added by merge | Exact removal/rejection, suffix preservation, runtime inertness on failed cleanup | Focused AppConfig suite and production build |
| Readable-ID persisted transition | Preserved across merge | V1/V2 reset, exact JSON/SQLite selectors, trusted-ID cleanup, gates, recreation | Re-run physical four-file lifecycle selection; results cannot be inferred through merge |
| Exact custom metadata / catalog | Preserved across merge | Exact fallback only, readable IDs, owner-scoped deletion | Core/server focused and GraphQL E2E |
| Frontend Settings / Apollo | Preserved but cross-boundary Qwen save depends on changed backend commit | Base URL/API-key paste, configured/default state, exact native catalog, committed success and recovery | Focused Nuxt tests plus owned real Chrome/Nuxt/built-backend journey |
| Electron shell | Unchanged | None | Browser is preferred for renderer-equivalent Settings; no shell execution justified |
| External Alibaba service | Emulated only | Protocol-compatible `/models` and chat routing | Real credentials, availability, quota, region, TLS, and undocumented payload variation remain bounded risks |

## Project Execution Discovery

- Assigned worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata`
- `autobyteus-server-ts/AGENTS.md`: use `pnpm -C autobyteus-server-ts exec vitest run ... --no-watch`; use the repository build for compiled/bootstrap proof.
- `autobyteus-web/AGENTS.md` and `autobyteus-web/README.md`: use `pnpm test:nuxt ... --run`; browser development uses `pnpm dev`; browser validation is the normal renderer path, while Electron-specific execution is unnecessary absent shell changes.
- `autobyteus-server-ts/package.json`: `pnpm build` regenerates shared packages and Prisma, compiles production server output, copies assets, and runs sanitized bootstrap smoke.
- `test-support/live-e2e/test-runtime-bootstrap.mjs`: use unique owned app-data/database/key roots and sanitized child environments; remove only resources created by this run.
- `autobyteus-web/package.json`: guard web/localization boundaries and run the Nuxt production build after focused tests.
- No real vendor credential is required or safe for this validation. Loopback OpenAI-compatible fixtures provide deterministic request, authentication, route, model, and payload evidence.

## Prior Coverage Classification Against The Integrated Source

`Still Valid` means the assertion still represents approved current behavior. It does **not** carry API-REV-007's pass result through the merge; every selected scenario below requires current execution.

| Durable Path / Scenario | Validity | Integrated-State Rationale | API-REV-008 Action |
| --- | --- | --- | --- |
| `tests/unit/config/app-config.test.ts` | `Needs Re-execution` | IR-011 combined retirement and Qwen durability; IR-012 adds exact-mode/umask proof | Run all 27 tests; this implementation-owned unit edit is already source-reviewed, not an API-owned durable edit |
| `tests/e2e/llm-management/qwen-configuration-lifecycle-graphql.e2e.test.ts` / `QW-E2E-001`–`004` | `Still Valid` | Directly exercises the changed AppConfig caller boundary, vault compensation, physical restart, and fresh-process request routing | Mandatory current rerun |
| `tests/e2e/secret-management/custom-provider-readable-id-startup-migration.e2e.test.ts` / `RID-E2E-001`–`004` | `Still Valid` | Current SR-016 reset/recreation and CRR-014-reviewed test semantics remain approved | Mandatory current rerun because merge touches shared config/startup state |
| `tests/e2e/llm-management/custom-provider-model-metadata-graphql.e2e.test.ts` | `Still Valid` | Exact readable ID, exact metadata, real vault/database, owner-scoped delete remain current | Mandatory current rerun |
| `tests/e2e/llm-management/model-metadata-provenance-graphql.e2e.test.ts` | `Still Valid` | Exact provenance and wire behavior remain current | Run with critical E2E selection |
| Core identity/exact metadata/custom endpoint tests | `Still Valid` | No profile/alias behavior is permitted; exact-only resolver remains current | Re-run focused selection |
| Server readable migration/runner/gate/provider-service tests | `Still Valid` | Covers cleanup ordering, retry/status, startup gates, Qwen failure boundaries | Re-run focused selection including AppConfig |
| Qwen Settings form/runtime/Apollo/manager/store tests | `Still Valid` | Frontend source is unchanged but depends on current built backend contract | Re-run focused selection |
| Historical `qwen3.8-max-preview` fixture rows | `Still Valid` as opaque history only | Exact preview text is not a native Qwen offering, alias, or compatibility key | Retain; scan exact native definitions/catalog evidence for absence |
| API-REV-006 custom-provider Chrome journey | `Still Valid scenario`; result historical | Proves user pastes name/Base URL/API key and gets exact-only discovery, but predates current merge | Preserve as context; current broader run will target Qwen because AppConfig/Qwen is the changed integration |
| API-REV-005 Qwen Chrome recovery journey | `Still Valid scenario`; result historical | Covers the correct user flow but predates two integrations and IR-012 | Re-execute an owned current Qwen Settings journey |

## Stale / Obsolete Coverage Decision

| Path / Assertion | Decision | Reason / Replacement |
| --- | --- | --- |
| Removed `custom-provider-v1-startup-migration.e2e.test.ts` and any provider/secret preservation assertions | `Stale / Remove` remains correct | SR-016 requires secretless reset and empty V3; current readable lifecycle E2E is the replacement |
| Endpoint-profile, URL-profile, suffix/alias, `qwen3.8-max-preview` native offering assertions | `Stale / Remove`; none may reappear | Current exact-only resolver and exact native Qwen catalog replace that behavior |

No additional stale current repository coverage was found. No valid current test asserts profile-driven behavior.

## Coverage Gap Decisions

| Scenario | Decision | Rationale |
| --- | --- | --- |
| Restrictive-umask exact permission preservation | Existing implementation-owned durable unit + direct executable probe; no API-owned test addition | The actual filesystem boundary is fully observable through real AppConfig/helper execution. Browser automation would be indirect. |
| Integrated Qwen restart/fresh-process routing | Existing durable E2E is sufficient if current rerun passes | It removes the explicit `QWEN_BASE_URL` request-child override and therefore proves persisted state loading. |
| Current Qwen Settings Base URL/API-key flow | `Use Temporary Executable Probe Only` | Repository has strong focused renderer coverage but no established durable full-browser Settings harness; retain value-free evidence and clean the harness. |
| Real Alibaba service policy | `Not Testable In Scope` | No safe credential/account dependency; emulator proves the approved protocol boundary. |
| Literal 15-minute recent-RUNNING wait / arbitrary kill at every write | `Not Testable In Scope` | Timestamp injection, stale/recent assertions, commit/failure probes, and cleanup checks are safer and more diagnostic. |

## Durable Coverage Change Decision

- API-REV-008 repository-resident durable coverage planned: `None`.
- IR-012's `app-config.test.ts` update belongs to implementation and was reviewed in CRR-016; API/E2E will execute it without claiming ownership.
- Prior API-owned durable coverage from API-REV-006/007 is already reviewed at CRR-014 and is being re-executed unchanged.
- If execution exposes a real coverage gap that requires a durable edit, update this investigation before editing and return the cumulative package through `code_reviewer` after execution.

## Execution Plan

| Order | Planned Check | Boundary / Evidence |
| --- | --- | --- |
| 1 | AppConfig 27-test suite | Exact retired setting, atomic Qwen file commit, restrictive umask/mode, failure cleanup, sensitive policy |
| 2 | Focused core/server selections | Exact-only metadata, readable identity/migration/gates, Qwen provider/service/GraphQL behavior |
| 3 | Server production build | Shared/Prisma/compiled/bootstrap integration |
| 4 | Four critical serial E2E files | Physical migrations/files/SQLite/vault/GraphQL, Qwen compensation/restart/fresh routing, exact catalog/provenance |
| 5 | Focused Nuxt Settings/application/store tests, guards, and production build | Renderer contract, committed save/recovery, exact visible models, compiled frontend |
| 6 | Owned real Chrome -> Nuxt -> current built server -> loopback Qwen | Paste Base URL/key, save, configured status, exact native catalog, persisted endpoint evidence, responsive user surface |
| 7 | Integrity/security/cleanup scans | Diff whitespace, conflict markers, forbidden native preview/profile terms, secret-value absence, no owned process/runtime left |

## Pre-Execution Confidence And Broader Gate

The API-REV-007 result cannot be scored as current evidence. Current scenario design is strong, but the integrated source has not yet run through the actual process/API/browser boundaries.

| Confidence Category | Pre-Execution Score | Basis / Gap |
| --- | ---: | --- |
| Requirement and acceptance-criteria proof | 88% | Current tests map all critical criteria, but current merge/IR-012 results are pending |
| Changed-boundary execution directness | 85% | Reviewer unit/helper proof exists; API-owned current lifecycle execution pending |
| Cross-boundary integration realism and mock gap | 82% | Current build/E2E/browser composition pending |
| Environment, configuration, identity, and fixture fidelity | 90% | Prior owned harness design remains sound; current setup pending |
| Failure, edge-case, lifecycle, and recovery evidence | 86% | Scenarios cover the right failures, but current results pending |
| User-surface, browser, and desktop-shell confidence | 80% | Current Qwen browser composition pending; shell is inapplicable |
| Durable regression coverage quality and relevance | 94% | CRR-014 approved API tests; CRR-016 approved implementation regression |

- Overall pre-execution confidence: `86.4%`.
- Broader validation decision: `Required` after repository/API checks because Qwen Settings is the user-facing owner of the Base URL/API-key pair and the changed backend persistence path is material to its reported success.
- Selected broader mode: real browser through documented Nuxt development path with actual built server and deterministic loopback Qwen endpoint.
- Desktop decision: do not launch Electron; no preload, IPC, packaging, or shell lifecycle behavior changed.

## Repository And Broader Execution Results

| Order | Check | Result | Evidence |
| --- | --- | --- | --- |
| 1 | AppConfig focused suite | `Pass — 1 file / 27 tests` | `probes/api-e2e/app-config-api-rev-008.log` |
| 2 | Core exact identity/metadata/Qwen selection | `Pass — 5 files / 24 tests; 1 opt-in live file / 4 tests skipped` | `core-focused-api-rev-008.log` |
| 3 | Server migration/gate/provider/Qwen selection | `Pass — 12 files / 91 tests; 1 intentional platform test skipped` | `server-focused-api-rev-008.log` |
| 4 | Server production build/bootstrap | `Pass` | `server-build-api-rev-008.log` |
| 5 | Four critical serial E2E files | `Pass — 4 files / 12 tests` | `server-e2e-api-rev-008.log` |
| 6 | Focused Nuxt Settings/application/store selection | `Pass — 6 files / 33 tests` | `web-focused-api-rev-008.log` |
| 7 | Web boundary/localization guards and production build | `Pass — all guards; 15 routes prerendered` | `web-guards-api-rev-008.log`; `web-build-api-rev-008.log` |
| 8 | Current real Qwen browser journey | `Pass — 12 assertions` | `qwen-settings-browser-evidence-api-rev-008.json`; desktop/narrow screenshots and correlated logs |
| 9 | Integrity, secret, source, and owned-cleanup scans | `Pass` | `repository-integrity-api-rev-008.log` |

The critical E2E command passed all four files and all 12 tests. Vitest reported an unusually long `8736.57s` import phase while the test bodies themselves completed in `103.22s`; no assertion, process timeout, cleanup, subsequent build, or browser run failed. This runner/import-duration anomaly is recorded transparently but does not weaken the behavioral result.

The current browser path used headless Google Chrome -> documented Nuxt development proxy -> actual current built server -> owned loopback Qwen endpoint. The built backend child inherited umask `0077`; after startup its real `.env` was set to existing mode `0660`; the user pasted Base URL/key and saved through the actual UI; the committed file remained `0660`, contained the configured `QWEN_BASE_URL`, and contained no key. The configured status, cleared plaintext key, exact six native values and collision-safe identifiers, preview absence, authenticated `/models` probe, success notification, and 390px no-overflow state all passed. Desktop and narrow screenshots were visually inspected.

Temporary browser attempt 1 reached the configured state but failed only because the harness expected friendly model titles rather than the shared AutoByteus selection labels. Investigation was updated, and the final harness asserted the exact GraphQL `value`/`modelIdentifier` contract plus the visible collision-safe identifiers. No product or durable test code changed.

## Post-Repository And Final Confidence Scorecard

| Confidence Category | Post-Repository | Final | Evidence / Remaining Uncertainty |
| --- | ---: | ---: | --- |
| Requirement and acceptance-criteria proof | 96% | 97% | Current AppConfig, lifecycle/API, readable reset, exact catalog, and browser save directly cover all critical current criteria; real Alibaba policy remains external |
| Changed-boundary execution directness | 97% | 98% | Real `setDurably`, physical permissions, vault, `.env`, restart, fresh request child, GraphQL, and browser all execute current code |
| Cross-boundary integration realism and mock gap | 96% | 97% | Current builds, Prisma/SQLite, Nuxt proxy, built server, Chrome, and loopback provider compose together; vendor service is emulated |
| Environment, configuration, identity, and fixture fidelity | 97% | 97% | Unique roots/databases/ports, strict fixtures, sanitized children, inherited restrictive umask, and exact public identities are direct |
| Failure, edge-case, lifecycle, and recovery evidence | 96% | 96% | Compensation, sanitized failure, cleanup, recent/stale gates, restart, collision, bad create/key, and default/key-only state pass; literal 15-minute delay/arbitrary kill remain bounded |
| User-surface, browser, and desktop-shell confidence | 92% | 97% | Current Chrome proves the renderer journey and narrow layout; Electron shell is inapplicable because no shell boundary changed |
| Durable regression coverage quality and relevance | 96% | 96% | CRR-014 approved API durable coverage; CRR-016 approved the IR-012 regression; all selected current coverage passes unchanged |

- Overall post-repository confidence: `95.7%`.
- Overall final confidence: `96.9%` (simple average, rounded to one decimal).
- Every critical criterion directly proven: `Yes`.
- Any applicable category below 90%: `No`.
- Broader validation: `Required and completed — Pass`.
- Repository-resident durable coverage changed by API-REV-008: `No`.

## Environment, Evidence, And Cleanup Plan

- Build the actual current server first.
- Use unique owned app-data, SQLite, root-key, Nuxt port, backend port, loopback provider port, Chrome profile, and temporary harness paths.
- Never reuse or delete an unknown process/data store. Record PIDs and terminate only owned children.
- Retain command logs, value-free browser JSON, and screenshots below `tickets/in-progress/custom-provider-model-context-metadata/probes/api-e2e/`.
- Generated credentials stay in process memory and are not written to reports/evidence; retained logs receive a secret scan.
- Stop Chrome/Nuxt/backend/provider children and remove owned runtime/database/profile/harness state. Confirm no owned residue remains.

## Residual Risks To Preserve Truthfully

- Real Alibaba availability, credentials, quota, region policy, TLS behavior, and undocumented payload variation are not exercised.
- POSIX mode behavior is meaningful on POSIX; the restrictive-umask test intentionally skips Windows.
- A literal recent-`RUNNING` wait and arbitrary crash at every individual write are not exercised.
- Actual cleanup failure/interruption can leave an unreachable orphan by approved SR-016 policy; invalid/untrusted data supplies no cleanup IDs; skipped selectors stay stale; recreation requires the exact canonical name and still-advertised suffix.
- Delivery must perform a new tracked-base refresh; current branch divergence can change after API/E2E.
- The package-wide server test typecheck TS6059 and broad Nuxt typecheck limitations remain documented baseline tooling issues; production builds and focused transformations are authoritative for this round.

## Investigation Decision

- Proceed To API/E2E Execution: `Completed`.
- Repository-Resident Durable Coverage Added / Updated / Removed In API-REV-008: `None`.
- Broader Validation: `Required and completed — Pass`.
- Reroute Required: `No`.
- Temporary browser attempt note: attempt 1 used an invalid incidental display-title assertion; the corrected final run used exact current `value`/`modelIdentifier` evidence and passed without production or durable-test changes.
- Current result: `Pass / 96.9%`; API-REV-007/CRR-014 remain historical checkpoint context only.
