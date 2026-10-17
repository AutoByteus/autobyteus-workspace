# API/E2E Coverage Investigation — token-meter-tps

## Investigation Meta / Authorities
Round 1; initial API/E2E baseline, requested by Implementation Engineer. Worktree `/home/autobyteus/workspace/.codex/worktrees/token-meter-tps`, branch `codex/token-meter-tps`, implementation cd28a009e / handoff 4eed0dbec. Canonical package in this ticket: requirements-doc.md R1/SR-001, investigation-notes.md E1–E14, design-spec.md D1/SR-002, solution-revision-record.md, solution-handoff.md, implementation-handoff.md IR-001 and implementation-revision-record.md: read before coverage edits. Screenshot is supporting only. Architecture/source reviews and their revision records: N/A — not applicable. Prior API or delivery rounds: N/A. Output report, revision record and ledger are canonical siblings of this file.

## Routing Classification
Medium / Low, Direct Low-Risk. Successful-output route: Delivery subject to rule lookup. Test review: Not Required — direct low-risk route. A failed acceptance criterion instead requires failure-origin review. No compatibility mechanism introduced; persisted data Not Affected (D1 and IR-001). No source changes planned.

## Requirement And Scenario Basis
SCN-001–004 and BEH-001–004: exact selected AgentRun report-pair TPS, not total/cost aggregate. Later normalized output / same-turn compatible observed-time interval, exclude first call/input/additional reasoning. Frozen estimated/last-reported identity/time; zero is distinct from missing. Reset discontinuity and identity changes; preserve normal false-call readings/reconciliation; history does not seed. No contrived stored-data corruption journey. No additional product scenario identified.

## Changed Surfaces
| Surface | Change / available evidence | Gap / planned surface |
|---|---|---|
| Frontend state/components; web-equivalent desktop renderer | Added helper/card and two existing live meter intakes; 144 upstream focused tests | Independent execution + durable browser probe |
| API/WS/runtime | No production change; existing adapters, timestamp/count normalization and presentation contracts supply inputs | Real test-owned server + scripted same-turn multi-call AGY + tool interval; Codex/Claude converter/fold tests |
| Selection / attribution | Exact context through all eight target variants, upstream store/projection cases | Browser selection and real server stream, retain Team effects and presentation assertions |
| Desktop full product journey | No shell code change | Isolated current worktree build per TESTING.md; never substitute browser proof |
| Auth, persistence, migration, workers/distributed protocol, native shell behavior | Not changed | N/A as changed boundaries; no new guarantees |

## Execution Discovery
Read root AGENTS.md, TESTING.md, DESIGN.md; web/server AGENTS.md; README.md packaged/full-stack sections; web README testing, server README tests; docs/isolated-app-instances.md including Linux safety; both package.json and Vitest configs; server tests/setup/{prisma-env,prisma-global-setup,prisma-test-config}. No closer testing guideline. Existing scripts define browser and server E2E ownership.
- `corepack pnpm` is available; direct pnpm is not. Use test-owned Corepack shim where nested scripts need pnpm. Dependencies already installed; build server dependencies and Prisma before server tests. Do not stage SDK dist or Electron output.
- Run server tests serially: their global setup resets assigned worktree `autobyteus-server-ts/tests/.tmp/autobyteus-server-test.db`. No other worker assigned this worktree. Clean env for E2E with private HOME, no inherited credentials/data roots. No paid inference required/planned.
- Real server: existing startStudioE2eRuntimeServer, free loopback ports, mkdtemp data/workspace, public GraphQL definition/run APIs, actual `/ws/agent/:id`, scripted AGY subprocess. Terminate run/delete own definition, close server/socket and remove own temp directory.
- Browser: temporary fixture route installed exclusively, production component/store/selection/stream adapter, owned Nuxt/Chromium, fresh output directory and browser-error gate. Own GraphQL/package-definition WS fixture boundaries for deterministic mode; real backend mode exercises actual endpoints. Cleanup on failure too; retain results/screenshots/hashes in evidence/api-001.
- Desktop: serialized build, private HOME/data/display, unprivileged runtime identity with sandbox preserved; record build/provenance/launch/cleanup and exact failures. No user app or data changes. No secrets needed for scripted proof.

## Existing Durable Coverage Inventory / Validity
All paths relative to worktree.
| Path/group | Validity / rationale | Action |
|---|---|---|
| web stores/__tests__/tokenUsageThroughput.spec.ts | Still Valid: approved arithmetic, identity/time/quality/count/revision guards | Rerun |
| web stores/__tests__/tokenUsageMeterStore.spec.ts | Still Valid: accounting, hydration races, live-only sampling, actual Team two effects, presentation adapter, missing summaries | Rerun |
| web composables/__tests__/useTokenUsageWorkspaceScope.spec.ts | Still Valid: eight exact target kinds, offline/config identity and empty states | Rerun |
| web components/workspace/usage/__tests__ | Still Valid: qualification, help, locales, totals/card gates | Rerun |
| web activeContextStore, TeamStreamingService, teamExecutionViewState specs | Still Valid: selection and Team regressions | Rerun |
| server tests/e2e/runtime/agy-token-usage-transport.e2e.test.ts + agy-failure-cli usage_report | Still Valid for cross-turn accounting, INSUFFICIENT same-turn TPS proof | Retain; add separate bounded multi-call fixture/test |
| server Codex/Claude/AGY/native converters and token-usage fold/normalizer suites | Still Valid: current field/accounting source semantics | Focused execution, inspect source-shaped coverage |
| web tests/e2e/token-statistics-ui-probe.mjs | Out Of Scope (Settings analytics); setup precedent only | No modification |
| ticket implementation preview | Temporary implementation evidence, not durable downstream suite | Reuse into maintainable test fixture/probe, expand transport coverage |
No removal, stale assertion or requirement ambiguity identified.

## Durable Coverage Plan
| Case ID | AC / boundary | Action |
|---|---|---|
| TPS-REPO | AC-001–007 web unit/component/adapters | Run existing focused suites |
| TPS-RUNTIME | AC-002,004,005,007 source adapter and canonical counts | Existing focused server suites |
| TPS-BROWSER | AC-001,003–006 browser states/accessibility/localization | Add tests/e2e/token-meter-tps-probe.mjs + fixture and package script |
| TPS-TRANSPORT | AC-001–005,007,008 same-turn reports with tool gap | Add server runtime E2E + bounded scripted AGY fixture; link live browser service intake to server |
| TPS-DESKTOP | AC-002,006,008 full journey | Temporary ticket-owned isolated build probe; existing durable launch infrastructure sufficient |
| TPS-GUARDS | AC-007 source boundary/localization | Rerun 3 guards after test edits |

## Confidence And Broader Validation Plan
Post-repository scorecard pending own execution, not inherited passes. Broader validation Required: mocks bypass browser reactivity and real server normalization/timing, plus explicit full-product layer. Expected gain: direct DOM/state assertions, exact stream payloads and current-build desktop provenance. Clean target >=95% average, no category <90%, all critical ACs proven. Live paid runtime matrix remains explicit unrun, not automatically a blocker for this generic estimator. Mandatory categories will be scored after repository checks and after broader validation.

## Ledger / Decision
Ledger required (multiple independent cases, build and realistic long-running setups). `api-e2e-test-case-ledger.md` initialized before execution. Proceed: Yes. Add durable coverage: Yes; remove: None. Reroute before execution: No. Environment impossibility or real acceptance failure will be recorded rather than hidden.

## Post-Repository Checkpoint (2026-10-13)
TPS-REPO passed independently: 8 files / 144 tests (web-regression.log). Server normalization execution in progress. Provisional categories: acceptance 75%, directness 90%, integration realism 75%, fixture fidelity 75%, edge/recovery 95%, user surface 75%, durable coverage 90%; average 82.1%. Browser and real server + desktop remain Required. These are pre-broader scores, not a pass.

### Execution adjustment
TPS-RUNTIME passed 7 files / 174 tests (server-runtime.log), including actual Codex cumulative/context adapter→normalizer→fold, Claude recorded main-loop tracker→fold/result remainder, AGY/native converter and Grok fold source cases. Browser fixture passed with zero browser errors. Initial TPS-TRANSPORT setup failed before test: setting ANTIGRAVITY_CLI_COMMAND in beforeAll was too late for imported discovery owner. Private HOME correctly produced signed-out real AGY. Test now asserts exact fixture command supplied in process launch environment, before imports. This is an API/E2E fixture setup correction, no product failure or live-provider execution. Cleanup succeeded (transport-1-cleanup.json).

### Additional attribution coverage decision (before edit)
Existing Org/collaboration throughput test enters the presentation projector directly; it bypasses actual context membership/address admission. Add durable cases to existing `stores/__tests__/tokenUsageMeterStore.spec.ts` using real AgentOrgExecutionContext/AgentRunCollaborationContext and existing supported topology fixtures, concurrent distinct AgentRuns (including same address configured vs task copy), two report rounds, exact output/model assertions and invalid-address rejection. This closes SCN-002 / AC-002 at the actual web context boundary without inventing distributed product scenarios. Add TPS-ATTRIBUTION ledger case; no production source change.

## Post-Repository Confidence Scorecard (completed basis)
Scores captured at the repository-only boundary (TPS-REPO + TPS-RUNTIME), before counting browser/live results. Simple average **82.1%**; all critical ACs not yet proven; clean target not met.
| Mandatory category | Score | Support / uncertainty / next evidence |
|---|---|---|
| Requirement / AC proof | 75% | Arithmetic/guards/presentation tested; real transport and rendered/full-product paths pending |
| Changed-boundary directness | 90% | Actual store/Team effects and Vue components; browser event-to-render transition not exercised |
| Integration realism / mock gap | 75% | Provider adapters/fold execute, but repository mocks bypass actual sockets and server persistence-to-render |
| Environment / identity / fixture fidelity | 75% | Source-valid fixture shapes and all eight targets; process/runtime attribution needs real server |
| Failure / edge / lifecycle / recovery | 95% | Invalid output/identity/time, false calls, revisions/counts, history races and recovery explicitly exercised |
| User surface / browser / desktop | 75% | Component semantics only, not rendered geometry or actual packaged user journey |
| Durable regression relevance | 90% | Strong arithmetic and intake tests; durable browser/runtime cases being added |
Broader Required: fixture browser + real scripted server/renderer + isolated current desktop. No new contract, paid provider benchmarking or migration needed. Anticipated target >=95% only if these direct proofs succeed.

### Broader execution checkpoint
TPS-BROWSER browser-1 passed: 10 meaningful state/accessibility/locale checks; screenshot visually inspected at 320px. Card scroll/client width 286/286. No browser errors; route/Nuxt/browser cleaned.
TPS-TRANSPORT transport-2 passed after setup correction: actual AGY-shaped subprocess on a test-owned server, 3 reports in one turn, 999 excluded baseline, 200 then 150 outputs, real test-owned tool-file content in stream; 1.206s tool gap, latest 150 / 0.899s = 166.852... rendered. GraphQL totals 1349 and call count 3. Not provider inference. Enhanced durable assertion now explicitly captures second reading and verifies its 200/tool-gap divisor too; final rerun planned. Desktop build underway, not yet proof.

## Final Execution Update — API-REV-001
Plan completed, including added attribution checks. Authoritative command index, AC proof and runtime limitations: api-e2e-execution-coverage-report.md. TPS-REPO final **10 files/155**, TPS-RUNTIME **7/174**, attribution **4/43** overlapping web total; browser-2 and transport-3 pass; current-worktree Linux ARM64 Electron built and full UI journey passed at non-root UID61031 under owned Xvfb, sandbox intact. All three guards pass. No source/test assertion removed; no requirement/design change. Only fixture setup correction noted above. Every case reconciled in ledger. Final confidence **95%**, all categories 95%; broader Required and completed. Exact source/asar provenance, JSON assertions, screenshots and independent cleanup in evidence/api-001. Live paid inference unrun and not claimed. Scope stays Medium/Low; successful test review Not Required — direct low-risk route. Proceed to configured successful-output handoff after artifact persistence.
