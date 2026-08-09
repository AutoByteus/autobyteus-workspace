# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/design-spec.md`
- Supplemental Task Artifacts: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/qwen-native-provider-setup-ui-spec.md`; `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/custom-provider-readable-id-migration-spec.md`
- Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/solution-revision-record.md` (`SR-016` current for readable identity)
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/design-review-report.md` (`ARCH-REV-010`)
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/architecture-review-revision-record.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/implementation-handoff.md` (`IR-010`)
- Implementation Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/implementation-revision-record.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/code-review-report.md` (`CRR-012`, source `Pass` at `9.35/10`)
- Code Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/code-review-revision-record.md`
- Delivery Revision Record (historical context only): `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/delivery-revision-record.md`
- Relevant Delivery Revision IDs: `None` authorize SR-016; delivery retains tracked-base refresh/integration ownership.
- API/E2E Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-007` corrective execution completed `Pass / 96.4%`; proportional re-review is pending. API-REV-006 execution also passed, but CRR-013 rejected its incomplete secret postcondition.
- Current Investigation Round: `7`
- Trigger: `code_reviewer` CRR-013 found that RID-E2E-002 proves rejected-create provider/catalog absence but not the separately required real-vault secret absence.
- Prior Investigation Reviewed: `Yes`. API-REV-005 remains valid history for unchanged Qwen/exact-metadata scenario design, but every result predates SR-016 and supplies no current readable-identity authorization.
- Latest Authoritative Investigation: `This file — API-REV-007 baseline was written before the TR-004 edit/rerun and is now refreshed with the completed corrective evidence.`

## Current Requirement And Design Basis

SR-016 preserves exact-only custom metadata and configurable native Qwen, while replacing the UUID custom-provider lifecycle. New custom-provider IDs are deterministic name derivatives, with store-atomic canonical-name/ID uniqueness and no suffix. Upgrade behavior is intentionally destructive for provider records, Base URLs, and credentials: valid V1 becomes secretless V2, the final readable migration derives transient selector mappings from valid V2 names, rewrites only exact managed JSON/SQLite selectors with byte-identical model suffixes, publishes empty V3 last, and only then attempts removal-only cleanup for every trusted old V2 provider ID. Mapping collision, built-in-name conflict, or non-derivable name leaves selectors unchanged but does not suppress cleanup for trusted IDs; invalid/untrusted input supplies no cleanup identity.

The readable migration is final, requires exactly five terminal predecessor migrations, and is followed by a startup gate accepting only `SUCCEEDED | SUCCEEDED_WITH_WARNINGS`. A pre-V3 interruption is retried only through the ordinary stale-`RUNNING` policy; immediate recovery is explicitly out of scope. Until ordinary same-name recreation, selectors remain stored and raw-visible/unavailable, launches fail without fallback, and application setup must not clear the value. The existing `{name, baseUrl, apiKey}` create GraphQL/UI path must reject a bad pair without state, create the exact readable ID for a valid pair, store the new key, reload exact models, and restore same-name/exact-suffix selections.

Critical current proof targets are `REQ-013`–`REQ-015` and `AC-015`–`AC-019`; retained `REQ-001`–`REQ-012` / `AC-001`–`AC-014` must remain green. SR-013–SR-015 provider/secret preservation, reconnect, journal, backup, receipt, special runner recovery, and UUID alias behavior are obsolete and must not be protected by tests.

## CRR-013 / TR-004 Corrective Coverage Decision

This subsection is the mandatory API-REV-007 investigation update and was persisted before editing durable coverage or rerunning tests.

- Finding validity: `Valid Local Fix`. AC-019 requires a rejected public create to leave neither a provider record nor a readable consumer secret. The current settings query proves provider/catalog absence but cannot observe an orphan `secret_entries` row.
- Production inference: `None`. CRR-012 source remains Pass and the existing create path rejected the request in API-REV-006; only durable proof is incomplete.
- Durable action: immediately after the rejected mutation and before valid recreation, use the suite's existing real-database `listSecretIds()` helper to assert absence of `provider.openai-compatible.provider_alibaba_cloud_token_plan.api-key`.
- Execution action: rerun the same authoritative four-file serial E2E command so the corrected scenario is proven together with custom metadata, Qwen lifecycle, and metadata provenance. Then rerun `git diff --check`, exact assertion-source scan, secret-marker scan, and owned-runtime cleanup scan.
- Broader validation: `Not Required` for API-REV-007. API-REV-006's real Chrome/Nuxt/built-backend result remains applicable because no production or browser code changes; this correction strengthens only the repository-resident vault postcondition.
- Outcome routing: on pass, refresh the canonical execution/revision artifacts and return the full package to `code_reviewer` for proportional re-review. Delivery remains blocked.
- Corrective result: the exact readable secret ID is asserted absent immediately after the rejected mutation and before the valid create. The authoritative serial selection passed 4 files / 12 tests; diff/assertion-order/secret-marker/owned-runtime checks passed. `TR-004` is resolved in API/E2E evidence and awaits reviewer closure.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| `BEH-007` new readable identity | Changed | `REQ-013`; `AC-015`, `AC-016`; readable-ID spec | Prove exact `provider_alibaba_cloud_token_plan`, exact wire model suffix, no generated suffix, and ordinary API creation. |
| V1/V2 persisted transition | Changed | `REQ-014`; `AC-017`, `AC-018`; persisted-data decision | Existing secret-preserving V1 startup E2E is invalid and must be replaced with secretless reset proof. |
| Direct multi-version ordering | Added | `REQ-015`; `AC-019`; exact-order table | Unit mocks are insufficient alone; execute a real isolated migration runner/database/file fixture and prove prerequisite results/outputs precede empty V3. |
| Exact JSON and application SQLite selectors | Added | `REQ-014`; `AC-017`; selector inventory | Prove representative physical JSON and SQLite rows preserve exact suffix bytes and excluded/raw content. |
| Trusted-ID cleanup independent of mapping | Changed by IR-010 | `CR-004`; `PREM-CPMIG-005`; `CRR-012` | Retain direct collision/non-derivable unit proof and add executable boundary evidence where safely observable; never resolve/copy a legacy secret. |
| Startup / ordinary retry gate | Added | `REQ-015`; `AC-018` | Execute real failed/non-terminal startup and stale retry behavior where deterministic; recent `RUNNING` delay remains an explicit bounded residual. |
| Provider-absent and same-name recreation | Added | `REQ-015`; `AC-019` | Prove no provider/model after reset; migrated raw selector persists; bad create creates nothing; valid same-name create produces expected ID/models and makes the selector resolvable again. |
| Unavailable selector UI | Changed | `AC-019`; application-editor design | Retain focused component regression and perform browser-equivalent Settings/application setup only if repository/live evidence leaves a UI gap. |
| `BEH-001`–`BEH-006` exact metadata/Qwen | Preserved | `SR-010`–`SR-012`; CRR-012 | Re-run retained GraphQL/lifecycle and focused browser-equivalent coverage; do not infer pre-SR-016 passes forward. |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | Identity codec, strict V3 parser/store, migration mapping/cleanup | Focused core/server unit tests | Real file/database/runner composition | Lifecycle / Live API |
| API / transport / contract | Yes | Existing create/delete/settings GraphQL returns derived ID and current catalog | Custom metadata GraphQL E2E | Same-name recreation after real reset | Live API |
| Frontend component / state | Yes | Application selector remains raw/unavailable instead of clearing | Component test | Full browser composition with real catalog transition | Browser if repository/live composition is insufficient |
| Browser integration / user journey | Yes | Existing custom add form recreates a reset provider; Settings Qwen unchanged | Focused web tests; prior Chrome harness | Current SR-016 provider-absent -> recreate journey not yet executed | Browser |
| Authentication / session / permissions | No | Loopback owner surface has no changed auth policy | Existing server E2E harness | None material | None |
| Desktop renderer / web-equivalent UI | Yes | Nuxt renderer used by Electron Settings/application setup | Focused component/store tests | Current composed visual/state journey | Browser preferred |
| Desktop shell / Electron-specific integration | No | No preload/IPC/window/packaging boundary changed | N/A | None | None |
| Process / lifecycle | Yes | App-data runner, final migration, terminal startup gate, restart | Runner/startup unit tests | Actual built-process stop/start and failure gate | Lifecycle |
| Persisted-data transition | Yes | V1/V2 -> exact selectors + empty V3 + cleanup | Strong unit fixture | Direct multiversion physical-store ordering and restart | Lifecycle |
| Worker / queue / distributed coordination | No | Startup is single-process and pre-listen | N/A | No changed distributed contract | None |
| External integration | Preserved | Qwen/OpenAI-compatible probe/request boundary | Loopback vendor emulation | Real Alibaba availability/credentials/quota/region/TLS/payload drift | Not safely required; bounded residual |

## Project Execution Discovery

- Assigned worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata`
- Runtime stack: pnpm workspace; TypeScript core; Fastify/GraphQL/Prisma/SQLite server; Nuxt/Vue frontend; Vitest; Electron wrapper with web-equivalent renderer.
- Conflicting/missing instructions: Server README's legacy V1 migration paragraph still describes secret-preserving V2 and is stale under SR-016; current approved artifacts and source are authoritative. Delivery must later update docs. No test-command conflict exists.
- Required real vendor secret: `No`. Deterministic loopback OpenAI-compatible fixtures are sufficient to prove the approved protocol boundary without exposing a vendor credential.

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `autobyteus-server-ts/AGENTS.md` | Test command authority | Use `pnpm -C autobyteus-server-ts exec vitest run ... --no-watch`. |
| `autobyteus-server-ts/README.md` | Build/start/data-dir authority | Build with `pnpm -C autobyteus-server-ts build`; run `dist/app.js --data-dir`; app-data migrations execute before runtime consumers. |
| `autobyteus-server-ts/package.json`, `vitest.config.ts` | Script/runner config | Build regenerates Prisma and shared packages; tests are serial forks with Prisma global setup. |
| `test-support/live-e2e/test-runtime-bootstrap.mjs` | Owned live-server harness | Unique roots must stay below `autobyteus-server-ts/tests/.tmp`; database below `autobyteus-server-ts/db`; child environment is sanitized; only owned state/processes may be removed. |
| `autobyteus-web/package.json`, existing API-REV-005 probes | Web runner/browser precedent | Use focused Nuxt Vitest and browser-preferred validation for web-equivalent behavior; do not disturb the user's Electron process. |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Built server | worktree root | `pnpm -C autobyteus-server-ts build`; `startBuiltTestServer(...)` | Unique app-data and SQLite database; sanitized environment | Harness waits for exact listen marker | `server.stop()`; `removeOwnedTestRuntime()` |
| Loopback model fixture | Vitest/browser harness | ephemeral Node HTTP server | Generated credential; exact `/models` and request capture | Bound loopback port | Close owned HTTP server |
| Nuxt renderer | `autobyteus-web` | project dev/start command used by existing browser harness | Reserved loopback port and owned process only | HTTP readiness | Terminate owned process and Chrome profile |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| V1/V2 provider file | Write exact fixture below owned runtime `llm/custom-llm-providers.json` | Generated canaries; never use user data | Owned runtime removed |
| App migration ledger/token row | Apply real Prisma schema to unique DB, seed only exact rows | Preserve identifier bytes; no shared test row | Unique DB removed |
| JSON selectors | Exact agent/team/binding/run/resume/improver fixtures under owned runtime | Include excluded raw/unrelated canaries | Owned runtime removed |
| Application SQLite selectors | `node:sqlite` exact table fixture under owned application package | One owned DB/transaction | Owned runtime removed |
| Recreated provider/model | GraphQL create against loopback fixture | Generated key not written to durable report/log | Delete provider then remove runtime/database |

## Persisted Data Transition Coverage Basis

- Approved decisions: legacy provider records/Base URLs/credentials `Discard or Rebuild`; exact structured active/default/resumable selectors `Migration Required`; historical token model identifiers/traces/model-free indexes `Directly Usable — No Rewrite`; Qwen state `Directly Usable — No Migration`.
- References: requirements “Persisted Data Outcome”; design “Persisted Data / State Transition Decision”; implementation-handoff “Persisted Data Transition Check”; readable-ID spec.
- Representative setup: valid V1 and V2 UUID providers, exact composite selectors across representative JSON and application SQLite owners, a token ledger row missing provider name, and excluded raw/unrelated values.
- Required outcome: final strict empty V3, no legacy Base URL or credential value, exact selector prefix rewrite with suffix byte preservation, unchanged token model identifier, provider-name snapshot populated before reset when recoverable, no secret resolution/copy/save, post-V3 removal-only cleanup, and same-name recreation through the public GraphQL/UI flow.
- Recovery scenarios: fatal empty-V3 publication and terminal gate; pre-publication idempotent retry through ordinary stale record; cleanup failure warning with usable V3; recent `RUNNING` remains intentionally blocked for the ordinary window.
- Ambiguity/reroute: none. SR-016 explicitly decides each state class.

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Basis | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/secret-management/custom-provider-v1-startup-migration.e2e.test.ts` | V1 secret is vaulted, V2 providers stay listed/ready, restart preserves them | Superseded pre-SR-016 behavior | `Replace` | Directly contradicts REQ-014/AC-017 and empty-V3 recreation | Rename/rewrite as current readable startup lifecycle E2E. |
| `autobyteus-server-ts/tests/unit/app-data-migrations/custom-provider-readable-id-app-data-migration.test.ts` (10 scenarios) | V1/V2, all selectors, collision/non-derivable cleanup, skip/change, publish failure/retry, cleanup warning, prerequisite, invalid input | REQ-014/015; AC-017/018 | `Still Valid` | CRR-012 revalidated direct source assertions | Run first; retain. |
| `custom-provider-v1-app-data-migration.test.ts` | Secretless V2 staging/no vault | AC-017 | `Still Valid` | Current assertions match SR-016 | Run. |
| prerequisite/registry/runner/startup-gate unit tests | Exact five predecessors, readable-last, stale/recent `RUNNING`, terminal gate | AC-018/019 | `Still Valid` | Current source-reviewed proof | Run. |
| `token-usage-provider-name-snapshot-backfill-startup.e2e.test.ts` | Real Prisma name backfill/retry | AC-019 | `Needs Update` for current provider-reader composition, not obsolete | Existing test is real DB but uses a synthetic provider store and does not prove readable reset ordering | Keep existing scenario; add the direct composition to replacement lifecycle E2E rather than distort this owner-specific test. |
| `custom-provider-model-metadata-graphql.e2e.test.ts` | Public create/catalog/exact metadata/request hygiene/delete | AC-001–006, AC-015, AC-019 | `Needs Update` | Still valid API spine but should assert exact readable ID and no suffix | Strengthen exact ID and bad/same-name recreation assertions. |
| `qwen-configuration-lifecycle-graphql.e2e.test.ts` | Pair probe/commit/compensation/restart/exact request routing | AC-007–014 | `Still Valid` | SR-016 preserves Qwen; CRR-012 says retained path current | Re-run; no planned edit. |
| `ApplicationAgentLaunchProfileEditor.spec.ts` | Raw unavailable selector retained and blocks until available | AC-019 | `Still Valid` | Direct changed component behavior | Re-run; supplement with browser journey if necessary. |
| Core identity/config/store/service tests | deterministic normalization, V3 invariant, concurrent duplicate winner, create lifecycle | AC-015/016 | `Still Valid` | Direct source-reviewed assertions | Run. |
| Historical `qwen3.8-max-preview` token-usage fixtures | Opaque past custom-provider ledger identity | AC-009 / no compatibility alias | `Still Valid` | Value is historical row data, not native catalog behavior | Retain; verify native catalog/browser still omit preview. |

## Stale Or Obsolete Coverage Decisions

| Path / Scenario | Obsolete Assertion | Why It Is Obsolete | Upstream Evidence | Replacement Coverage |
| --- | --- | --- | --- | --- |
| `tests/e2e/secret-management/custom-provider-v1-startup-migration.e2e.test.ts` | V1 credentials move to vault; providers remain V2/ready across restart | User explicitly rejected provider/secret preservation and reconnect/recovery complexity | REQ-014; AC-017; SR-016; readable-ID spec “Legacy V1 Boundary” | `RID-E2E-001`/`002` current secretless reset, ordering, restart, recreation, and collision cleanup lifecycle. |

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Basis | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| `RID-E2E-001` | Real built-server V1 -> secretless V2 -> exact selector transition -> empty V3; no secret/Base URL; restart remains current | AC-017/019 | Replacement readable startup E2E | Mocks cannot prove ordinary runner/file/Prisma/startup composition. |
| `RID-E2E-002` | Direct V2 multiversion fixture: exact predecessor outcomes, token provider-name snapshot before reset, exact JSON/SQLite values, unchanged token identifier, provider absent, bad create no state, same-name recreate exact ID/models | AC-019 | Same replacement E2E | Critical cross-boundary acceptance criterion needs one coherent physical fixture. |
| `RID-E2E-003` | Mapping collision leaves selectors unchanged but trusted old IDs are removed after empty V3; warning/no fallback | AC-016/017; CR-004 | Same replacement E2E or focused lifecycle harness | IR-010 fixed a high-value boundary that needs evidence beyond a call-mocked coordinator where feasible. |
| `RID-BRW-001` | Provider-absent raw selection stays visible/unavailable; custom form bad pair then valid same-name pair restores selection availability | AC-019 | Temporary browser journey unless existing durable browser infrastructure makes repository residency proportionate | Browser composition materially closes UI/state confidence; UI harness need not become permanent if repository lacks this end-to-end layer. |

## Durable Coverage To Update

| Scenario ID | Existing Path / Scenario | Required Update | Basis | Notes |
| --- | --- | --- | --- | --- |
| `RID-E2E-001`–`003` | obsolete V1 startup E2E | Rename/rewrite from secret-preserving V2 expectations to readable reset/recreation lifecycle | REQ-014/015; AC-017–019 | Treat as replacement, not compatibility retention. |
| `CUS-E2E-READABLE` | custom provider metadata GraphQL E2E | Assert exact readable ID, bad-pair no record, same-name recreation and exact model identity/wire value | AC-015/019 | Preserve exact-metadata assertions and provider-scoped cleanup. |

## Durable Coverage To Remove

| Existing Path / Scenario | Removal Reason | Basis | Replacement Decision |
| --- | --- | --- | --- |
| Old V1 secret-vault/preserved-provider scenarios inside `custom-provider-v1-startup-migration.e2e.test.ts` | Protects explicitly removed behavior | SR-016; REQ-014 | Replaced by current readable reset E2E in the renamed file. |

## Repository Coverage Execution Plan And Results

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| 1 | Focused core exact identity/metadata/Qwen selection | `autobyteus-ts`; Vitest | Deterministic readable identity, exact-only metadata, native Qwen identifiers | `Pass` — 4 files / 21 tests | `probes/api-e2e/core-focused-api-rev-006.log` |
| 2 | Focused server migration/store/service/runner/gate selection | `autobyteus-server-ts`; Vitest | Direct local invariants, cleanup, failure/retry, startup gates | `Pass` — 10 files / 70 tests | `probes/api-e2e/server-focused-api-rev-006.log` |
| 3 | Focused renderer/settings/store selection | `autobyteus-web`; Nuxt Vitest | Raw unavailable selector retention, custom form, Qwen/settings recovery | `Pass` — 6 files / 33 tests | `probes/api-e2e/web-focused-api-rev-006.log` |
| 4 | `pnpm build` | `autobyteus-server-ts` | Compiled integrated shared/server/Prisma/bootstrap boundary | `Pass` | `probes/api-e2e/server-build-api-rev-006.log` |
| 5 | Four critical E2E files in one serial Vitest run; API-REV-007 corrective rerun | `autobyteus-server-ts`; isolated owned roots/databases | Real readable startup including rejected-create provider **and real-vault secret** absence, exact metadata, Qwen restart/routing, provenance | `Pass` — 4 files / 12 tests | `probes/api-e2e/server-e2e-api-rev-007.log` |
| 6 | Web boundary/localization guards and `pnpm build` | `autobyteus-web` | Static boundary, localization, production renderer bundle | `Pass` | `probes/api-e2e/web-guards-api-rev-006.log`; `web-build-api-rev-006.log` |
| 7 | `git diff --check`, exact TR-004 assertion ordering, secret-marker and cleanup scans | worktree root | Corrective repository integrity | `Pass` | `probes/api-e2e/repository-integrity-api-rev-007.log` |
| Observation | `pnpm typecheck` | `autobyteus-server-ts` | Optional package-wide test-source typing | `Non-authoritative repository configuration failure` — TS6059 reports every test outside configured `rootDir: src`; shared builds completed first, production build and all selected Vitest transforms passed | `probes/api-e2e/server-typecheck-api-rev-006.log` |

## Post-Repository Confidence Scorecard

| Confidence Category | Score | What Supports The Score | Remaining Uncertainty | Additional Validation |
| --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | `96%` | Current focused suites plus physical lifecycle/API E2E directly cover AC-015–019 while retained Qwen/exact-metadata paths stay green | Real Alibaba policy is emulated | Browser Settings journey selected to close the composed user proof. |
| Changed-boundary execution directness | `97%` | Actual built server, real migration runner, physical JSON/SQLite/Prisma, public GraphQL, restart, and fresh Qwen request child | No arbitrary process kill at each individual selector write | No additional repository surface needed. |
| Cross-boundary integration realism and mock gap | `96%` | Four-file serial E2E passes after explicit Prisma lifecycle isolation; server production build passes | External vendor remains loopback-emulated | Execute owned Nuxt + built backend. |
| Environment, configuration, identity, and fixture fidelity | `97%` | Unique app-data/database/key roots, real strict V1/V2/V3 files, exact selectors, generated credentials, sanitized child environments | No real vendor credential/region/TLS | Preserve as bounded external residual. |
| Failure, edge-case, lifecycle, and recovery evidence | `96%` | Recent `RUNNING` blocks a real child; ordinary stale retry converges; collision cleanup, bad key, compensation, restart and cleanup warnings are covered | No literal 15-minute sleep or crash at every write | No further delay injection justified. |
| User-surface, browser, and desktop-shell confidence | `92%` | Focused application selector and Settings tests pass | Current composed real browser save/delete journey not yet in repository evidence | Browser validation required. |
| Durable regression coverage quality and relevance | `94%` | Obsolete preserved-provider E2E replaced; exact ID/model and Prisma test isolation assertions added; critical E2E passes as one run | Proportional code review remains pending; lifecycle test is intentionally broad | Route all changed durable paths through reviewer after browser result. |

- Overall post-repository confidence: `95.4%` (simple average of seven applicable categories)
- Every critical acceptance criterion directly proven: `Yes`, using complementary durable unit/component/lifecycle/API evidence; browser remains required to raise composed user-surface confidence.
- Default clean-confidence target met: `Yes`, but broader validation remains mandatory because the user-facing Settings boundary materially benefits from a real composed run.
- Material residual risks: real Alibaba behavior; literal recent-`RUNNING` elapsed wait; genuine process interruption at arbitrary writes; invalid/untrusted cleanup absence by design; skipped selector targets outside approved managed stores; exact-name/suffix recreation dependence; delivery-owned base divergence; package-wide TS6059 test-root configuration.

## Broader Validation Decision

- Decision: `Required and completed — Pass`.
- Selected modes: `Lifecycle`, `Live API`, and `Browser`.
- Confidence gap addressed: repository E2E closed runner/file/SQLite/database/process/API gaps; headless Chrome then proved the actual Settings name/Base URL/API-key flow, invalid-key rejection without persistence, exact model preview/save/configured state/delete, exact-only metadata behavior, and 390px layout.
- Final confidence: `96.4%`; no category is below 90%.
- Browser rationale: browser is preferred for the Electron renderer-equivalent flow; no Electron shell behavior changed, so actual desktop execution would add risk without useful evidence.

## Desktop Application Validation Decision

- Framework: Electron wrapping Nuxt/Vue.
- Web-equivalent behavior: Settings custom-provider form, provider catalog, and application launch selector.
- Shell-specific behavior: none changed.
- Chosen approach and result: owned browser development path executed successfully after repository/API checks; the user's Electron instance was not launched or disturbed.
- Unproven shell behavior consequence: `N/A` for this change.

## Live Environment And Fixture Plan / Result

- Built shared/server first and used `startBuiltTestServer` with unique app-data/SQLite roots and sanitized environment.
- Seeded only exact legacy/provider/selector/token rows and loopback model fixtures with generated credentials.
- Completed journeys: direct V1/V2 reset, exact selectors/token snapshot, restart/no-op, collision cleanup, bad and valid same-name create, exact catalog, focused raw-unavailable selector, real Settings save/delete, and retained Qwen lifecycle.
- Retained exact commands, logs, value-free browser/API/catalog evidence, screenshots, and security scans below `probes/api-e2e/`.
- Stopped only owned children and removed owned runtime/database/browser state; credentials are absent from retained evidence.

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why Not Durable |
| --- | --- | --- | --- |
| `RID-BRW-001` | API-REV-005 pattern adapted to actual built server plus invalid/valid custom-provider Settings fixture | Composed name/Base URL/API-key probe, exact preview/save/configured state, exact-only metadata, delete, and responsive journey — `Pass` | Repository has focused component/store coverage but no established durable full-browser suite; retained value-free JSON/log/screenshot evidence instead. |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up |
| --- | --- | --- | --- |
| Real Alibaba endpoint/credentials/quota/region/TLS/payload drift | No safe credential is required; deterministic emulator exercises approved OpenAI-compatible contract | Vendor-specific availability remains unproven | Preserve as bounded residual, not a Pass claim. |
| Actual 15-minute recent-`RUNNING` wait | Unit test proves timestamp policy; sleeping 15 minutes adds no material confidence | Platform timing drift | Execute recent/stale runner assertions; record real-time wait as not run. |
| Genuine process kill at every selector write | Deterministic interruption/unit/ordinary-retry coverage is safer and more diagnostic | Narrow crash timing residual | Preserve approved optimistic risk. |

## Ambiguities Or Reroute Triggers

None identified before execution. Any current assertion conflict will first be classified against SR-016 before inferring a production defect.

## Investigation Decision

- Proceed To API/E2E Execution: `Completed — API-REV-007 corrective rerun passed`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes` — one bounded orphan-secret absence assertion will be added to the current readable lifecycle E2E.
- Post-repository/final confidence: `95.4% / 96.4%`, unchanged because the correction validates the already-executed behavior without changing production or user-surface evidence.
- Broader validation decision: `Not Required for API-REV-007`; API-REV-006 browser execution remains applicable to unchanged source.
- Reroute Required Before Validation Execution: `No`
- Notes: API/E2E considers `TR-004` resolved by direct real-vault absence proof and a 12/12 rerun. CRR-013 remains the current review result until `code_reviewer` performs proportional re-review; delivery remains blocked.
