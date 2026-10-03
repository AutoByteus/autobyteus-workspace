# API/E2E Coverage Investigation

## Investigation Meta / Routing
Round 1, Initial IR-001; API-REV-001 will be created on completion. Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-reload-stale-member-instructions`. Canonical ticket: `tickets/in-progress/team-reload-stale-member-instructions/`. Read cumulative requirements, investigation, design, SR-001–003, architecture-design-result, implementation handoff/revision and real pre-fix reproduction/evidence inventory. A-001 approved. task_size=Small; architectural_risk=Low; Direct Low-Risk. Architecture/source review and their revision records: N/A — not applicable. Delivery/triggering rework: N/A — initial round. Test review: Not Required — direct low-risk route; expected successful route Delivery subject to final rule lookup.

## Current Requirement And Design Basis / Scenarios
SCN-001 / BEH-001 / REQ-001 / AC-001,002: real completed package edit, warm v1, Team Reload only, inspect current Team and scoped/shared members, repeat v3. SCN-002 / BEH-002 / REQ-002 / AC-003: initial discovery, unchanged IDs/scopes, no promotion or source/run/history writes. SCN-003 / BEH-003 / REQ-003 / AC-004: required read failure reaches existing feedback, loading terminates, same-button retry works. No added contrived scenarios, concurrent edits, node rebinding, watcher, provider/model run or installed-user-app test.

Explicit mutation → awaited public query-only Agent read/publication → existing Team read/publication. Team owns completion/errors. Package coordinator query-only action remains unchanged. No second mutation or legacy warm-only fallback. Implementation legacy check clean; persisted transition Not Affected, source/config/run formats unchanged. Validate write-path absence and byte-identical owned definitions across Reload, not a fabricated migration.

## Changed Surface And Boundary Classification
| Surface | Affected | Evidence / material gap / selected mode |
| --- | --- | --- |
| Frontend state + desktop web-equivalent renderer | Yes | Real-Pinia unit tests cover action; HTTP, actual routing and packaged renderer missing; real isolated desktop journey |
| API/transport integration | Yes, client sequence only | Mocked Apollo in units; observe real mutation/Agent/Team requests and real backend responses |
| Browser journey/loading/error | Yes | Stubbed component and controlled preview; prove actual product DOM and retry |
| Backend logic, identity/permissions | No production delta | Existing resolver refreshes both catalogs; real source fixture preserves TEAM_LOCAL/SHARED |
| Shell/process lifecycle | No production delta | Needed execution surface only, existing isolated launch lifecycle |
| Persistence, queue/distribution, auth, external providers | No | No changed writer, session/worker/provider behavior; no credentials required |

## Project Execution Discovery
Read root TESTING.md (no closer guideline), autobyteus-web/AGENTS.md, root README.md and web README testing/packaging sections, docs/isolated-app-instances.md, web package.json/vitest.config.ts and existing tests/e2e probes. Node/pnpm/dependencies already installed. TESTING requires one-shot `--run`; full-product validation uses isolated changed worktree build and reported ports, never user's data/app. Durable repository probes already use playwright-core and isolated CLI; extend that established executable surface rather than creating a new framework. No secret needed. Public package is read-only; generate minimal deterministic private fixture in owned output temp directory. Start uses root `pnpm --silent isolated-app start --build`; own isolated instance alone stopped by exact ID; preserve start/build/DOM/API/log/cleanup evidence. No release/push/integration authorized. Never stage generated SDK dist or git add . / -A.

## Existing Durable Coverage Inventory / Validity
| Artifact | Decision | Meaning / action |
| --- | --- | --- |
| stores/__tests__/agentTeamDefinitionRefresh.spec.ts | Still Valid | Operation-specific actual two-store warm/scoped/shared v1→v2→v3, serialization, six failure kinds/retry, query-only contract. Retain/run. |
| stores/__tests__/agentTeamDefinitionStore.spec.ts | Still Valid | Existing CRUD/explicit refresh contract strengthened by implementation. Retain/run. |
| stores/__tests__/agentDefinitionStore.spec.ts | Still Valid | Existing public Agent publication/visibility boundary. Retain/run. |
| components/agentTeams/__tests__/AgentTeamList.spec.ts | Still Valid | Delegation/loading/error/retry; mocked action is not freshness proof. Retain/run. |
| components/agentTeams/__tests__/AgentTeamDetail.spec.ts; components/agents/__tests__/AgentDetail.spec.ts | Still Valid | Initial/scoped lookup/detail/navigation. Retain/run. |
| tests/e2e/isolated-app-lifecycle-probe.mjs; electron-launch-profile-probe.mjs | Out Of Scope for rerun | Lifecycle machinery unchanged; use CLI safety contract, no unrelated exhaustive lifecycle rerun. |
| Other tests/e2e browser probes | Out Of Scope | No existing durable Team Reload source/HTTP journey located. |
| ticket pre-fix store-cache-probe.cjs / reproduction | Historical temporary evidence | Deliberately proves old bug; do not run as expected post-fix pass. |

## Durable Coverage To Add / Update / Remove
Add `autobyteus-web/tests/e2e/team-reload-member-freshness-probe.mjs` and `test:e2e:team-reload-member-freshness` package script: self-owned isolated instance + deterministic minimal linked package, first discovery, warm source v2/repeat v3 scoped/shared members, actual Reload operation order/no duplicate mutation, real HTTP/DOM, read failure/retry, source byte preservation and guaranteed cleanup. No existing tests need updating/removal. Durable because reproduces previously realistic-only bug at actual system boundary; portable macOS/Linux where isolated app supported. Failure injection covers legitimate read failure, not contrived user concurrency. Temporary exploration may discover semantic locators; never confuse exploratory harness issues with product defect.

## Repository Coverage Execution Plan
R-001: six directly relevant store/detail/list files via `pnpm -C autobyteus-web test:nuxt <paths> --run`; then R-002: broader catalog/package suites and guards. E-001: changed-build desktop startup; E-002: first discovery/scoping; E-003: v2 Team Reload and member navigation; E-004: repeated v3/scoped/shared; E-005: Agent-read failure/loading/error/retry; E-006: preservation/cleanup. Evidence in ticket `evidence/api-e2e/`. Ledger required: multiple independently meaningful cases and build interruption risk; `api-e2e-test-case-ledger.md` initialized before execution. Commands/results appended below.

## Confidence Gate / Broader Validation
Post-repository scorecard pending execution. Provisional gaps: mocked Apollo cannot prove source→HTTP→packaged member view. Broader validation Required; Project Desktop Validation + Live API/DOM with changed worktree build. Target ≥95% overall/no category below90% and critical AC direct proof. Browser dev fixture alone insufficient for this previously reproduced full-product failure. Shell-specific features unchanged/not independently under test; app packaging is fidelity check. Selected mode affects no existing app/data. Existing user's exact binary/registration is intentionally not inspected, and no claim about it will be made.

## Live Environment / Temporary Checks / Deferred / Reroutes
Generate one private shared worker plus one Team and scoped worker. Import through Settings Agent Packages. Warm by real Team/member navigation, edit source files only in owned fixture, Team Reload, inspect both member content and IDs, compare actual GraphQL sequence and response. Fault one required Agent HTTP request after real server refresh, retry normally. Capture DOM/screenshots as support, correlated requests/responses/server log and exact lifecycle JSON. Stop exact owned instance, verify ports released/root removed/instance absent. No persisted run launch is needed: source write-path inspection plus unchanged backend mutation and isolated snapshots supports preservation; real model calls/history behavior outside changed scope. No ambiguity/reroute found. Proceed Yes; durable coverage Add; no removal.

## Post-Repository Results / Mandatory Confidence Scorecard
R-001 Pass: 6 files/32 tests; evidence/api-e2e/narrow-tests.log. R-002 Pass: 5 files/26 tests; evidence/api-e2e/broader-tests.log; both web/localization guards and git diff --check pass. Expected injected-error stderr is not product failure.
| Category | Score | Evidence / remaining gap / gain |
| --- | --- | --- |
| Requirement/AC proof | 75% | Desired action and failure assertions direct in real stores; live complete journey missing |
| Changed-boundary directness | 90% | Actual production store action, mocked transport; packaged sequence will close gap |
| Cross-boundary realism/mock gap | 75% | Apollo double bypasses source/HTTP/backend |
| Environment/config/identity/fixtures | 75% | Actual scoped IDs in units, not packaged source registration |
| Failure/edge/lifecycle/recovery | 95% | Six failure kinds + serialized pending/read publication, actual list lifecycle; live retry strengthens |
| User-surface/browser/desktop | 75% | Actual component tests + upstream controlled preview, no real changed package |
| Durable regression quality | 90% | Narrow operation-aware multi-store regression/negative control; live durable probe planned |
Overall simple average: 82.14%. Critical AC-001/002 product journey not yet directly proven. Below90 categories explicitly prevent Pass. Broader Required as planned; target changed packaged source/HTTP/navigation and durable probe, no expansion of supported scope.

### Probe Development Observation
Initial probe attempt E-002 timed out seeking Agent Teams while still in the distinct Settings layout after cold renderer reload; failure DOM shows normal API Keys Settings, not stale member/product failure. Corrected harness to click existing Back to Workspace before sidebar Agent Teams. Preliminary origin: API/E2E-owned locator/journey setup (Local Fix), no production change. Attempt1 evidence retained; all owned processes/fixtures cleaned. Coverage decisions unchanged; repeat complete journey from owned new instance. E-007 separately records cleanup so an API-only case cannot imply cleanup success.
Attempt2 confirmed Back to Workspace visible label differs from accessible aria-label (`Back to workspace`). Use existing settings-nav-back test ID, not visible-label case assumption. No product code altered; owned cleanup passed. Preserve failed harness development observations without reporting an implementation regression.

### Completed Product Probe / Final Strengthening
Attempt3 all E-001–007 passed using real packaged source/HTTP/DOM, only one fault response mocked. Strengthen E-005 to completed source v4 before failed read and assert retry publishes v4 (not merely unchanged v3), package bytes preserved through failure/retry, no unexpected console/page errors and owned instance absent. Repeat full probe; retained initial-pass evidence. This narrows remaining recovery uncertainty without new production/scenario scope.

## Final Execution Update
Durable probe final E-001–007 Pass, including source v4 required-read error and current v4 retry. Final report scorecard 96.43%; broader Required/completed; no material residual approved-scope risk or reroute. All owned instances/roots/ports/fixtures cleaned. New probe/package script syntax, guards/diff Pass (`evidence/api-e2e/final-checks.log`). No existing test validity decision changed. Canonical report contains complete absolute cumulative artifact inventory and final runtime/provenance. Test review Not Required — direct low-risk route.
