# API/E2E Execution Coverage Report

## Execution Round Meta

- Requirements Doc: /Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-persistence/tickets/token-statistics-persistence/requirements.md
- Investigation Notes: /Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-persistence/tickets/token-statistics-persistence/investigation-notes.md
- Design Spec: /Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-persistence/tickets/token-statistics-persistence/design-spec.md
- Supplemental Task Artifacts: /Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-persistence/tickets/token-statistics-persistence/api-e2e-test-review-report.md, docs-sync-report.md, electron-test-build-report.md, handoff-summary.md, and release-deployment-report.md (historical stopped-delivery package preserved for cumulative visibility).
- Solution Revision Record: /Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-persistence/tickets/token-statistics-persistence/solution-revision-record.md
- Design Review Report: /Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-persistence/tickets/token-statistics-persistence/design-review-report.md
- Architecture Review Revision Record: /Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-persistence/tickets/token-statistics-persistence/architecture-review-revision-record.md
- Implementation Handoff: /Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-persistence/tickets/token-statistics-persistence/implementation-handoff.md
- Implementation Revision Record: /Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-persistence/tickets/token-statistics-persistence/implementation-revision-record.md
- Code Review Report: /Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-persistence/tickets/token-statistics-persistence/code-review-report.md
- Code Review Revision Record: /Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-persistence/tickets/token-statistics-persistence/code-review-revision-record.md
- Delivery Revision Record (delivery re-entry only): /Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-persistence/tickets/token-statistics-persistence/delivery-revision-record.md
- Relevant Delivery Revision IDs: DR-001, DR-002, DR-003 (historical; delivery remains stopped until proportional durable-test review passes).
- Coverage Investigation: /Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-persistence/tickets/token-statistics-persistence/api-e2e-coverage-investigation.md
- API/E2E Revision Record: /Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-persistence/tickets/token-statistics-persistence/api-e2e-revision-record.md
- Current API/E2E Revision ID: API-REV-003
- Current Execution Round: 3
- Trigger: `CRR-004` Pass for corrected `IR-002` commit `0ce9d17b75195b0142abadc4593f6fea47893be0`; mandatory recheck of the `API-REV-002` real Team rejection, linked fresh-process reopen, and proportionate standalone live admission.
- Prior Round Reviewed: API-REV-002, Fail with 98.0% failure-origin confidence; its exact failure evidence and passing persistence differential were reused as the pre-fix baseline.
- Latest Authoritative Round: Round 3, completed 2026-08-20, **Pass at 98.3% validation confidence**.

## Investigation And Execution Basis

- Coverage investigation artifact: /Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-persistence/tickets/token-statistics-persistence/api-e2e-coverage-investigation.md
- Investigation completed before durable coverage changes or final execution: Yes
- Investigation plan followed: Yes for Round 3. The coverage investigation was updated before execution; source/contract/affected suites/build ran before broader validation; real Team, standalone, restart, screenshots, exact GraphQL comparison, and cleanup followed in the planned order. Historical Round-1 execution-order notes remain recorded below.
- Existing coverage decisions revised during execution, with evidence: The IR-002 Team transport regression is now directly adequate at the missing builder-to-strict-projector seam and passed 14/14 with adjacent suites. All retained persistence, store, component, race, and restart coverage remains Still Valid; no stale coverage was found.
- Reroute required before or during execution: No
- Notes: API/E2E Round 3 changed no repository-resident durable coverage. It executed the implementation-owned durable Team regression and temporary external-provider browser journeys. The cumulative package must return through `/code_reviewer` for proportional review of that durable change.

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: No
- Compatibility-only or legacy-retention behavior observed in implementation: No
- Approved persisted-data transition followed without unnecessary migration or version-specific runtime fallback: Yes
- Durable coverage added or retained only for compatibility-only behavior: No
- If compatibility-related invalid scope was observed, reroute classification used: N/A.
- Upstream recipient notified: N/A; no invalid compatibility scope was observed.

## Changed Boundary And Evidence Matrix

| Scenario ID | Behavior / Requirement / Acceptance-Criteria IDs | Changed Boundary | Execution Surface / Mode | Evidence Type | Result | Evidence / Artifact |
| --- | --- | --- | --- | --- | --- | --- |
| API-TS-001 | Full strict cumulative team DTO and safe generation; REQ-003/004, AC-002/006 | Shared transport contract | Node contract build/test | Durable | Pass, 2/2 | tickets/token-statistics-persistence/evidence/api-ts-001-contract.log |
| API-TS-002 | Preserve/null/reject team event summary by exact identity; REQ-002/003/005, AC-004/006/007 | Server team transport adapter/projector | Server Vitest unit | Durable | Pass, 3/3 | tickets/token-statistics-persistence/evidence/api-ts-002-server-transport.log |
| API-TS-003 | Fresh-store standalone/member hydration after null live events; REQ-001/002/004, AC-002/003/004/005 | Pinia readiness plus Token Meter orchestration | Nuxt Vitest store/component | Durable | Pass | tickets/token-statistics-persistence/evidence/api-ts-003-005-web-focused.log |
| API-TS-004 | Higher-only run/member generations and exact compound team identity; REQ-003/005, AC-006/007 | Frontend cache admission | Nuxt Vitest store/component | Durable | Pass | tickets/token-statistics-persistence/evidence/api-ts-003-005-web-focused.log |
| API-TS-005 | Team aggregate dirty follow-up and maximum one in-flight request; REQ-003/005, AC-006/007 | Frontend aggregate state machine | Nuxt Vitest store | Durable | Pass; included in 20/20 focused tests | tickets/token-statistics-persistence/evidence/api-ts-003-005-web-focused.log |
| API-TS-006 | Direct-use current records survive a fresh backend process and retain exact full GraphQL meaning; REQ-001/004/005, AC-001/002/007/009 | SQLite to built process to HTTP GraphQL | Built-server lifecycle E2E | Durable + Live | Pass, 1/1 | autobyteus-server-ts/tests/e2e/token-usage/token-usage-record-restart-graphql.e2e.test.ts; tickets/token-statistics-persistence/evidence/api-ts-006-restart-e2e-final.log |
| API-REG-001 | Current-record components, cost/context/count, and team identity remain correct; AC-001/002/007/009 | Persistence provider | Server integration Vitest | Durable | Pass, 3/3 | tickets/token-statistics-persistence/evidence/api-current-store-integration.log |
| API-REG-002 | Run/team/member GraphQL, unit-price, provider, and safe-integer semantics; AC-001/002/007/008/009 | Prisma/schema/resolvers | Server E2E Vitest | Durable | Pass, 8/8 | tickets/token-statistics-persistence/evidence/api-graphql-existing.log |
| BROWSER-TS-001 | Fresh standalone store receives two null live snapshots before selection, then hydrates all cumulative fields; AC-002/003/005/008 | Nuxt/Pinia/Apollo/GraphQL/DOM | Headless Chrome against built server | Temporary + Live + Browser | Pass | results.json; standalone-live-before.png |
| BROWSER-TS-002 | Focused member and team total hydrate while same member under a foreign team remains absent; AC-004/005/007/008 | Exact client/API identity and rendered team selection | Headless Chrome against built server | Temporary + Live + Browser | Pass | results.json; team-live-before.png |
| BROWSER-TS-003 | Delayed generation-2 GraphQL response cannot overwrite newer generation-3 live summary; AC-006 | Actual Apollo request race and store admission | Headless Chrome with response timing control | Temporary + Live + Browser | Pass; final 215 tokens, generation 3 | results.json |
| BROWSER-TS-004 | Live-after-query generation 4 advances the cumulative summary without duplication; AC-006 | Live event after hydration | Headless Chrome/live API | Temporary + Live + Browser | Pass; final 230 tokens, four reports | results.json; standalone-live-during-after.png |
| BROWSER-TS-005 | Continuous team traffic coalesces callers and repeats sequentially until quiet; AC-006/007 | Aggregate request state across browser/API timing | Headless Chrome with actual GraphQL responses | Temporary + Live + Browser | Pass; 3 sequential requests, maximum active 1, final team total 130 | results.json |
| BROWSER-TS-006 | Fresh backend process and fresh renderer reopen the same standalone row; AC-001/003/009 | Backend and frontend lifecycle | Built-server restart + browser reload | Temporary + Live + Browser | Pass; 230 tokens and four reports restored | results.json; backend-first.log; backend-restarted.log |
| BROWSER-TS-007 | Token Meter remains contained at narrow width; AC-008 | Responsive renderer | Headless Chrome 390x844 | Temporary + Browser | Pass; total card x=66, width=308 within viewport | results.json; standalone-reopened-narrow.png |
| BUILD-GUARD-001 | Changed server/web source builds and existing boundary/localization rules stay intact | Source/build boundaries | TypeScript, Nuxt production build, guards, diff check | Durable executable checks | Pass | server-build-typecheck.log, web-build.log, web-boundary-guards.log, web-localization-guards.log, web-localization-audit.log, git-diff-check.log |
| LIVE-BROWSER-TS-008 | Exact prior real Team strict-admission failure; REQ-002/003/004/005, AC-002/004/006/007 | Provider observation -> builder -> Team WebSocket strict projection -> Nuxt Token Meter | Built backend + real external runtimes + actual `open_tab` | Temporary + Live + Browser | Pass; 42, two messages, zero red rejection, exact GraphQL convergence | `real-provider-evidence-api-rev-003/open-tab-live-team-evidence.json` and screenshots |
| LIVE-BROWSER-TS-009 | Fresh process/renderer exact real Team/member/message convergence; AC-001/002/004/007/009 | SQLite -> fresh built backend -> GraphQL -> fresh Nuxt state | Backend restart + fresh actual `open_tab` | Temporary + Live + Browser + Lifecycle | Pass; exact summaries/messages, zero rejection | `open-tab-restart-evidence.json` and fresh-process screenshots |
| LIVE-BROWSER-TS-010 | Shared builder standalone live admission; REQ-002/003/004, AC-002/003/005/006 | Provider observation -> standalone event -> Nuxt Token Meter | Built backend + real DeepSeek + actual `open_tab` | Temporary + Live + Browser | Pass; 6,137 tokens/1 report, zero red rejection | `open-tab-live-standalone-evidence.json` and screenshot |

Deterministic browser artifacts in the matrix are below `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-persistence/tickets/token-statistics-persistence/probes/api-e2e/evidence/`. Corrected real-provider `open_tab` artifacts are below `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-persistence/tickets/token-statistics-persistence/probes/api-e2e/real-provider-evidence-api-rev-003/`. Command logs are below those evidence roots and the ticket `evidence/` directory.

## Additional Repository Coverage Execution

API-REV-003 reran the shared strict contract (2/2), affected Team transport/fold/accumulator suites (14/14), production server build/bootstrap smoke, source-boundary inspection, and diff hygiene before broader execution. No repository test ran after the Round-3 post-repository gate; the later work was real-system execution and evidence/cleanup only.

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | Change | New / Final Supporting Evidence | Residual Uncertainty |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 95% | 98% | +3 | Retained full requirement matrix plus corrected real Team, standalone, restart, exact identities/messages, and Token Meter fidelity | No material acceptance criterion remains open |
| Changed-boundary execution directness | 96% | 99% | +3 | Real observation/fold/record/builder/strict projector plus real external runtime/browser paths executed | None material |
| Cross-boundary integration realism and mock gap | 85% | 99% | +14 | Built backend, migrated SQLite, provider calls, Team communication, WebSocket, GraphQL, Nuxt, and DOM executed together | Electron-only window/preload wrapper unchanged and not launched |
| Environment, configuration, identity, and fixture fidelity | 90% | 99% | +9 | Exact requested secret import, agent package, models/runtimes, persisted launch manifest, and isolated resources | Provider latency/token totals are naturally nondeterministic; identities were exact |
| Failure, edge-case, lifecycle, and recovery evidence | 85% | 98% | +13 | Exact prior-failure recheck, strict negative coverage, standalone admission, fresh-process equality, and retained race/single-flight evidence | Abrupt OS crash during a provider call is outside changed scope |
| User-surface, browser, and desktop-shell confidence | 75% | 98% | +23 | Actual `open_tab`, semantic zero counts, and inspected live/restart screenshots proved the corrected web-equivalent Electron renderer | Electron shell code is unchanged and was not launched |
| Durable regression coverage quality and relevance | 97% | 97% | 0 | Exact production builder-to-strict-Team regression plus retained restart/race/API coverage | Mandatory proportional review remains before delivery |

- Overall post-repository confidence: 89.0% (623 / 7).
- Overall final confidence: 98.3% (688 / 7, rounded to one decimal).
- Calculation method: Simple average of the seven mandatory applicable category scores; a passing overall score does not mask a weak category.
- Confidence change produced by broader validation: +9.3 percentage points, primarily resolving the prior real-stream failure and closing real provider/WebSocket/Nuxt/restart gaps.
- Every critical acceptance criterion directly proven: Yes
- Any final applicable category below 90%: No
- Default final confidence target of 95% met: Yes
- Confidence-limiting residual risks: Only unchanged Electron preload/window/package behavior remains unexecuted. Real external provider production now passed.

## Broader Validation Decision And Execution

- Decision and selected execution mode from the coverage investigation: Required — Browser + Live API + external runtimes + WebSocket + Lifecycle.
- Material deviation from the planned mode or rationale: Round 1 added narrow-viewport containment. Round 2/3 used actual `open_tab` at the user's direction instead of the initial Playwright driver; this improved fidelity without changing the target renderer boundary.
- Confidence gap or residual risk actually addressed: Fresh Nuxt/Apollo/HTTP state, persistent rows across restart, live-before/during/after ordering, exact compound identity, sequential team aggregate coalescing, visible field fidelity, and the exact real provider -> production builder -> strict Team/standalone live admission path that had previously failed.
- If Not Required, direct evidence that made broader validation unnecessary: N/A.
- If Blocked, exact unavailable dependency or access and attempted alternatives: N/A.
- Startup order, commands, and readiness results: the retained Round-1 probe started built backend/Nuxt/Chrome at 49573/49586. The authoritative corrected rerun then built the server, imported credentials, loaded the external agent package, started the built backend at 55972 and Nuxt at 55973, used actual `open_tab`, restarted the backend on the same DB, and completed cleanup. Evidence is split between the retained deterministic probe directory and `real-provider-evidence-api-rev-003`.
- Environment choices that materially affected the run: isolated migrated SQLite/runtime, unique run IDs and loopback ports, value-safe secret import, exact external package/model/runtime bindings, real provider calls, actual `open_tab`, and no user profile/data reuse.
- Seed data, fixtures, identities, authentication, permissions, or session state: retained fixed priced records cover deterministic races; API-REV-003 added a real Classroom Simulation Team and a real Daily Assistant run. Local GraphQL has no authentication boundary; provider credentials came only from the isolated secret vault.

| Scenario / Journey Step | Expected Observable Result | Actual Observable Result | DOM / Screenshot / Log / API / Process Evidence | Result |
| --- | --- | --- | --- | --- |
| Fresh standalone, two null events before open | GraphQL still runs and full durable cumulative summary renders | 2 reports, 175 tokens, $0.0045, model/runtime/prompt/context and price status rendered | results.json, standalone-live-before.png, GraphQL operation log | Pass |
| Focused member under exact Team A | Member remains primary, team total hydrates, wrong-team cache remains absent | Member 75 tokens/2 reports; team 105 tokens/3 reports; foreign lookup null | results.json, team-live-before.png | Pass |
| Stale GraphQL response during newer live event | Lower generation must not replace newer cumulative snapshot | Delayed generation 2 was ignored; generation 3 remained at 215 tokens | results.json | Pass |
| Live event after hydration | Higher generation advances once | Generation 4 rendered 230 tokens/4 reports | results.json, standalone-live-during-after.png | Pass |
| Team traffic while aggregate response is pending | At most one request active; dirty follow-ups continue until stable | Exactly 3 sequential aggregate requests, max active 1, final 130 tokens, record_backed | results.json | Pass |
| Stop/start backend and reload fresh renderer | Same row reopens without migration or replay | New backend PID returned identical standalone total of 230 and four reports | backend-first.log, backend-restarted.log, results.json | Pass |
| Narrow viewport | Cards remain within 390px viewport | Total card x=66, width=308; inspected screenshot showed no horizontal escape | standalone-reopened-narrow.png, results.json | Pass |
| `LIVE-BROWSER-TS-008` corrected real Team stream | Same mixed-runtime Team completes without red rejection and live totals match GraphQL | Answer 42, two messages, Professor 52,132/7, Student 84,231/6, Team 136,363/13; zero rejection/error counts | API-REV-003 live JSON/screenshots/log scan | Pass |
| `LIVE-BROWSER-TS-010` real standalone stream | Same shared builder admits standalone live update | Exact response; 6,137 tokens/1 report; zero rejection/error counts | standalone JSON/screenshot | Pass |
| `LIVE-BROWSER-TS-009` real restart/fresh tab | Exact Team/member/messages survive fresh process and renderer | Exact-equal summaries/messages and restored 42 with unchanged models/prices | restart JSON/screenshots/log | Pass |

## Desktop Application Validation (When Applicable)

- Validation approach executed and any deviation from the investigation: Browser-first web-equivalent renderer validation exactly as planned; no Electron process was launched.
- Browser-tested web-equivalent behavior and evidence: Production Nuxt/Pinia/Apollo/composable/Token Meter ran against built backends in the seven deterministic scenarios and three real-provider `open_tab` scenarios; evidence includes semantic JSON, inspected screenshots, GraphQL equality, and service logs.
- Shell-specific or lifecycle behavior and evidence: Backend process stop/start was directly tested. Preload, IPC, window management, packaging, and native APIs were unchanged, so actual desktop execution would not add material evidence.
- Effect on any already-running desktop application: None
- Behavior not directly proven and confidence consequence: Electron-only wrapper behavior was not tested; this leaves a negligible unchanged-shell residual represented by the 98% user-surface score.

## Platform / Runtime Targets

- Operating system / platform: macOS 26.5.2, arm64.
- Runtime and relevant framework versions: Node.js 22.23.1; pnpm 10.28.2; Fastify ^4.29.1; Prisma ^5.22.0; Nuxt 3.21.1/Vue 3.5.28 during execution; server Vitest 4.0.18; web Vitest 3.2.4.
- Browser / engine and version, when applicable: Google Chrome 151.0.7922.138 via installed playwright-core.
- Device, viewport, locale, timezone, or accessibility settings, when applicable: Desktop screenshots at the default fixture viewport; narrow check at 390x844; English UI; host timezone Europe/Berlin. No accessibility mode override.

## Lifecycle / Upgrade / Restart / Persisted-Data Checks

- Approved persisted-data decision: Directly Usable — No Migration
- Representative existing data exercised: Priced deterministic standalone and cross-Team records; real DeepSeek standalone record; real DeepSeek Professor and Codex/gpt-5.6-luna Student current records; Team aggregate; two communication messages.
- Direct-use, discard/rebuild, or migration result and evidence: Pass. Round-1 built-process coverage preserved exact fixed rows. API-REV-003 independently restarted the built backend and recovered exact real Professor, Student, Team, standalone, and message values in a fresh `open_tab`.
- Migration completion/recovery evidence, only when Migration Required: N/A.
- Version-specific runtime branch, dual read/write, or compatibility fallback observed: No
- Residual untested persisted-data risk: None material. Crash-consistency during a write is unchanged and outside this request.

## Tests Implemented Or Updated

| Path / Scenario | Change | Requirement / Boundary | Execution Result | Notes |
| --- | --- | --- | --- | --- |
| autobyteus-server-ts/tests/e2e/token-usage/token-usage-record-restart-graphql.e2e.test.ts / API-TS-006 | Added | REQ-001/004/005; AC-001/002/007/009; fresh built process and direct-use persisted records | Pass, 1/1 in 11.53s final run | Uses existing lifecycle bootstrap and current-record fixture; asserts full standalone fields, exact member/team identity, wrong-team empty result, identical pre/post-restart GraphQL, and unchanged row identities/count |
| autobyteus-server-ts/tests/unit/agent-team-execution/team-agent-token-usage-event-transport.test.ts / corrected builder-to-strict-Team seam | Updated by IR-002 | REQ-002/003/005; AC-004/006/007; exact live Team DTO admission | Pass as part of 14/14 affected tests in API-REV-003 | Uses real observation/fold/record/builder/event/adapter/projector/parser and proves no statistics-only key leak; API/E2E did not author this change |

## Tests Removed As Stale Or Obsolete

None.

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed by API/E2E Round 3: No. The cumulative ticket contains the Round-1 restart E2E addition and the IR-002 Team transport regression update.
- Paths added or updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-persistence/autobyteus-server-ts/tests/e2e/token-usage/token-usage-record-restart-graphql.e2e.test.ts` (API/E2E Round 1 added); `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-persistence/autobyteus-server-ts/tests/unit/agent-team-execution/team-agent-token-usage-event-transport.test.ts` (IR-002 updated).
- Paths removed: None.
- Added or updated paths attached for proportional test-code review: Yes — included in the outgoing cumulative package.
- Diff or repository evidence supplied for removed paths: N/A.

## Other Execution Artifacts

| Artifact Path | Type / Purpose | Retained Or Temporary | Notes |
| --- | --- | --- | --- |
| /Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-persistence/tickets/token-statistics-persistence/evidence/ | Repository command logs | Retained ticket evidence | Includes focused suites, builds, guards, final restart, and exploratory authoring logs |
| /Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-persistence/tickets/token-statistics-persistence/probes/api-e2e/evidence/results.json | Machine-readable browser/lifecycle evidence | Retained ticket evidence | Final result Pass; seven scenario results and 29 observed GraphQL operations |
| /Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-persistence/tickets/token-statistics-persistence/probes/api-e2e/evidence/*.png | Browser screenshots | Retained ticket evidence | Four screenshots inspected; desktop field hierarchy and narrow containment were correct |
| backend-first.log and backend-restarted.log under the probe evidence directory | Process lifecycle logs | Retained ticket evidence | Distinct PIDs listened on the same owned backend port against the same DB |
| nuxt.log under the probe evidence directory | Nuxt service log | Retained ticket evidence | Nuxt 3.21.1 ready on owned port 49586 |
| /Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-persistence/tickets/token-statistics-persistence/probes/api-e2e/real-provider-evidence-api-rev-003/ | Corrected-commit real-provider `open_tab` evidence | Retained ticket evidence | Machine JSON, value-safe secret import/build logs, initial/restarted backend and Nuxt logs, semantic zero-rejection results, inspected screenshots, and cleanup evidence |

## Temporary Execution Methods / Scaffolding

| Path / Method | Why Needed | Result / Evidence | Cleanup Result |
| --- | --- | --- | --- |
| tickets/token-statistics-persistence/probes/api-e2e/token-usage-browser-probe.mjs | Orchestrate real backend, Nuxt, Chrome, persistence, timing, screenshots, and owned cleanup | Pass; browser-probe-rerun-3.log and results.json | Browser, Nuxt, backend, Prisma, runtime, and DB closed/removed |
| tickets/token-statistics-persistence/probes/api-e2e/token-usage-browser.page.vue copied temporarily to autobyteus-web/pages/api-e2e-token-usage.vue | Mount production store/composable/Token Meter without adding a permanent product route | Pass; seven scenarios | Copied route removed; source fixture retained only in ticket evidence |
| Playwright response delay for selected GraphQL requests | Make during-request ordering deterministic without replacing backend response data | Stale-response and team-dirty-loop scenarios passed | Isolated browser context closed |

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| External model/provider generation | Not mocked in the latest round: real AutoByteus/DeepSeek and Codex App Server/gpt-5.6-luna turns executed | N/A for API-REV-003; Round-1 deterministic observations remain useful race evidence | Provider totals/latency are nondeterministic, but exact runtime/model identities and summary convergence were asserted |
| Live stream transport | Not mocked in the latest round: real Team WebSocket events crossed the built backend and Nuxt renderer | N/A for API-REV-003; retained deterministic store tests isolate ordering invariants | None material for the corrected admission seam |
| Electron shell | Browser ran the same Nuxt renderer code | No preload/IPC/window/package code changed; launch could disrupt the user's app | Negligible unchanged-shell residual |

## Result Summary

| Result | Scenario IDs | Summary / Reason |
| --- | --- | --- |
| Pass | API-TS-001 through API-TS-006, API-REG-001/002, BROWSER-TS-001 through BROWSER-TS-007, LIVE-BROWSER-TS-008 through LIVE-BROWSER-TS-010, BUILD-GUARD-001 | All retained durable/API/race evidence and the corrected real Team, standalone, provider, browser, and restart journeys passed. |
| Out Of Scope | Electron-only preload/window/package wrapper | Shell-specific code is unchanged; actual `open_tab` directly exercised the renderer boundary that previously showed the red card. |

## Cleanup Performed

| Resource / Process / Data | Ownership | Cleanup Action | Result |
| --- | --- | --- | --- |
| Built backend processes | Ticket probe / lifecycle tests | Graceful stop with kill fallback only for owned children | Stopped; no owned process remains |
| Nuxt dev process | Ticket probe | Stopped owned child process | Stopped |
| Chrome/browser contexts | Ticket probe and actual `open_tab` | Closed all owned Playwright fixture contexts and all three API-REV-003 `open_tab` tabs | Closed; final tab session list empty |
| Prisma client | Ticket probe/tests | shutdownPrisma() | Closed |
| Isolated runtime, SQLite database, and sidecars | Ticket probe/tests | Existing removeOwnedTestRuntime cleanup | Removed |
| Temporary product route | Ticket probe | Removed autobyteus-web/pages/api-e2e-token-usage.vue | Removed and absence verified |
| User desktop app/profile/data | Not owned and never used | No action | Unaffected |

The intentional backend-stop interval caused three expected Nuxt health-poll HTTP 500 console messages on already-open fixture pages. There were zero browser pageerror events and zero Playwright requestfailed events; GraphQL scenarios and the restarted page passed. Early probe/test-authoring attempts were retained in ticket logs, but only the corrected final runs are authoritative; corrections changed test/probe expectations and harness behavior, not product source.

## Preliminary Classification

- The `API-REV-002` implementation-source defect is resolved by IR-002 and independently verified in `API-REV-003`; no failing implementation result remains.
- Historical Round-1 probe-authoring corrections remain local evidence history. The current differential is product behavior: pre-fix real Team token events were rejected; corrected real Team and standalone events were admitted with zero red cards and exact live/restart convergence.

## Recommended Recipient

/code_reviewer for proportional review of the one added repository-resident durable test. Delivery must wait for that review.

## Evidence / Notes

- Implementation under test: commit `0ce9d17b75195b0142abadc4593f6fea47893be0` on `codex/token-statistics-persistence`.
- API/E2E did not integrate or refresh the branch; integrated-state refresh remains delivery-owned.
- API/E2E Round 3 changed no schema, migration, product source, durable test, or localization file; it preserved shared uncommitted review/delivery/evidence artifacts.

## Latest Authoritative Result

- Revision: API-REV-003
- Result: Pass
- Final validation confidence: 98.3%
- Default 95% confidence target met: Yes
- Any final applicable confidence category below 90%: No
- Broader validation decision: Required and completed via Browser + Live API + Lifecycle.
- Critical acceptance criteria lacking direct proof: None.
- Required next recipient: /code_reviewer for proportional test-code review.
- Notes: The prior real Team failure is resolved; external provider execution now passed. Residuals are limited to unchanged Electron shell code. API/E2E Round 3 made no durable edit, but IR-002's updated durable Team regression requires workflow review.

## Round 2 Real-Provider `open_tab` Execution

### Round 2 Basis And Material Deviation

- The completed Round 2 investigation section in `api-e2e-coverage-investigation.md` was written before final real-provider execution.
- The user's explicit browser instruction superseded the initial Playwright-driver plan. The authoritative UI interaction used `mcp__autobyteus_agent_tools__open_tab`, `run_script`, `screenshot`, and `close_tab` against the real Nuxt frontend.
- No product source, shared contract, durable test, migration, or localization file was changed during this round.
- The prior repository suites were not rerun because Round 1 already recorded their passing evidence and Round 2 made no code change. Round 2 targeted the previously excluded runtime-to-Team-stream boundary.

### Real Environment Setup

| Setup / Boundary | Executed Result | Evidence |
| --- | --- | --- |
| Server build | Pass; built `autobyteus-server-ts` source executed | `real-provider-evidence/server-build.log` |
| Credential import | Pass; dry-run and confirmed real `pnpm secrets:import`; target READY; 9 configured, 0 skipped, 0 replaced | `secret-import-dry-run.log`, `secret-import-execute.log` |
| Agent package | Pass; `/Users/normy/autobyteus_org/autobyteus-agents` loaded; server discovered 9 agent definitions and 20 team definitions | `backend-open-tab.log` |
| Built backend | Pass; isolated app-data directory and migrated SQLite on `127.0.0.1:52967` | `backend-open-tab.log` |
| Development frontend | Pass; real Nuxt dev frontend on `127.0.0.1:52968` | `nuxt-open-tab.log` |
| Browser | Pass; actual `open_tab` tab `f4704b` for live execution and a fresh tab `b74dc6` after restart | Screenshots and `open-tab-results.json` |
| Runtime/model selection | Pass; Professor = AutoByteus / DeepSeek `deepseek-v4-flash`; Student = Codex App Server / `gpt-5.6-luna` | Config screenshots plus persisted `executionTree` in `open-tab-live-evidence.json` |
| Isolation | Pass; authoritative server log names only the API-REV-002 database. Fixed ports 8000/3000 and unowned applications were untouched | `backend-open-tab.log`, `run-state.env`, cleanup evidence |

The credential-import artifacts contain statuses and secret names only; no secret value is included.

### Round 2 Scenario Matrix

| Scenario ID | Expected Observable Result | Actual Observable Result | Result | Evidence |
| --- | --- | --- | --- | --- |
| `LIVE-BROWSER-TS-008` | The real Classroom Simulation Team completes a mixed-runtime exchange and every live `TOKEN_USAGE_UPDATED` event passes strict Team transport without a visible error card; Token Meter converges to persisted cumulative usage. | The live Professor -> Student -> Professor exchange completed and returned 42. Persistence and Token Meter updates succeeded, but repeated red `An Error Occurred` cards rejected every live token update because `observed_runtime_kinds`, `observed_model_identifiers`, and `observed_model_providers` were unrecognized. | **Fail** | `open-tab-live-token-rejection.png`, `open-tab-live-complete-with-token-rejection.png`, `open-tab-student-token-meter-with-rejection.png`, `open-tab-live-evidence.json`, `open-tab-results.json` |
| `LIVE-BROWSER-TS-009` | After terminate, fresh backend process, and fresh `open_tab`, the exact historical team and member summaries, conversation, and Token Meter reopen unchanged. | Fresh process/browser hydration restored the final report, two communication messages, Professor 44,254 tokens, Student 169,894 tokens, and Team 214,148 tokens. | Pass, linked failure remains | `backend-open-tab-restart.log`, `open-tab-restart-evidence.json`, `open-tab-fresh-process-reopen-history.png`, `open-tab-fresh-process-reopen-token-meter.png` |

### Browser Journey And Observed UI

The real prompt was:

> Run a short live classroom simulation. Professor: use send_message_to to ask /student to calculate 17 + 25 and reply. Student: answer with the number and a one-sentence explanation. Professor: report the student answer. This must invoke the configured live runtimes.

Observed successful portions:

1. Professor used `run_bash`, wrote `classroom-runs/arithmetic-demo/homework.md`, and delivered it to `/student` through `send_message_to`.
2. Student ran on `codex_app_server` with `gpt-5.6-luna`, wrote `student-answer.md`, and sent it to `/professor`.
3. Professor read the response and rendered the final answer `42` with the explanation `I added 17 and 25 to get 42.`
4. GraphQL persisted two communication messages and exact launch configuration.
5. The Token Meter rendered live server-accounted usage and prices for both members and the aggregate.

Observed failing portion:

- Red event-monitor error boxes appeared repeatedly during Professor and Student turns.
- The exact visible rejection was `Rejected TOKEN_USAGE_UPDATED` with `unrecognized_keys` for the three `observed_*` arrays.
- Ten rejection-text occurrences were present in the completed live browser event view. A single token observation can cause the diagnostic text to appear in the inline stream/error presentation more than once; the defect classification rests on the strict parser payload, not the display count.
- The screenshots supplied by the user and produced in this run match in message, keys, and red event-card presentation.

### Persisted API Evidence

Before restart, `open-tab-live-evidence.json` recorded:

| Subject | Runtime | Model / Provider | Total Tokens | Usage Reports |
| --- | --- | --- | ---: | ---: |
| `/professor` | `autobyteus` | `deepseek-v4-flash` / DEEPSEEK | 44,254 | 6 |
| `/student` | `codex_app_server` | `gpt-5.6-luna` / OPENAI | 169,894 | 8 |
| Team aggregate | latest `autobyteus` | latest `deepseek-v4-flash` | 214,148 | 14 |

After successful termination and a fresh backend process, `open-tab-restart-evidence.json` returned the same identities, totals, runtimes, models, timestamps, and two communication messages with `resume.isActive = false`. This proves that the failure is not token persistence or restart hydration.

### Failure-Origin Classification

**Preliminary classification: Implementation source defect.**

- Producer: `autobyteus-server-ts/src/token-usage/projections/token-usage-run-aggregate.ts:118-120` adds `observed_runtime_kinds`, `observed_model_identifiers`, and `observed_model_providers`.
- Composition: `buildTokenUsageRunSummaryFromRecords` spreads that aggregate into `TokenUsageRunSummaryPayload` at lines 124-145.
- Admission: `autobyteus-server-ts/src/agent-team-execution/services/team-agent-event-adapter.ts:141-155` parses the value through the strict shared DTO.
- Contract: `autobyteus-team-stream-contracts/src/token-usage-run-summary-dto.ts:33-88` admits no `observed_*` arrays and rejects unknown keys.
- The real provider journey, database writes, GraphQL readers, models, and browser all worked. Only the Team live event projection rejected the structurally over-wide summary.

The missing durable coverage seam is builder -> actual `TOKEN_USAGE_UPDATED` payload -> Team adapter/projector -> strict shared parser. Existing fixtures are manually contract-shaped and therefore did not expose the product builder's excess properties.

### Round 2 Failure-Confidence Scorecard

These scores measure confidence in the **Fail classification**, not readiness to ship.

| Confidence Category | Score | Direct Evidence | Residual Uncertainty |
| --- | ---: | --- | --- |
| Requirement/user-reported symptom reproduction | 100% | Exact red card and exact three keys reproduced in the real event monitor | None material |
| Changed-boundary execution directness | 100% | Built server, actual provider turns, real Team WebSocket projection, GraphQL, Nuxt, and `open_tab` executed together | None material |
| Cross-boundary integration realism | 100% | AutoByteus/DeepSeek Professor and Codex/gpt-5.6-luna Student completed a real bidirectional handoff | No Electron window wrapper; renderer path is identical and the user screenshot independently covers Electron |
| Environment/fixture fidelity and isolation | 98% | Real imported credentials/package, isolated migrated DB, exact persisted launch config | The requested arbitrary workspace field resolved to the server's isolated managed Temp Workspace; this did not affect the failing transport |
| Lifecycle/persistence differential diagnosis | 99% | Fresh backend and fresh tab restored identical summaries/messages without red historical diagnostics | A hard crash mid-write was not relevant |
| User-surface evidence quality | 100% | Multiple inspected screenshots show live Professor and Student red boxes, completion, Token Meter, and fresh reopen | None material |
| Durable regression-gap diagnosis | 89% | Exact missing builder-to-strict-parser seam identified | Correct fix ownership must be decided by code review before coverage is added |

- Failure-origin confidence: **98.0%** (`686 / 7`).
- Result: **Fail**. A high diagnostic-confidence percentage does not convert this into a pass.
- Default pass-confidence target: Not applicable while a critical real-browser scenario fails.

### Round 2 Cleanup

| Owned Resource | Cleanup Result |
| --- | --- |
| Team run | Terminated through GraphQL; `success: true` |
| Browser tabs | Both `open_tab` tabs closed |
| Backend processes | Initial and restarted owned built-server processes stopped |
| Frontend process | Owned Nuxt dev process stopped |
| Ports | No listener remains on 52967 or 52968 |
| Isolated data | Ticket runtime, requested workspace, SQLite DB, vault key, and DB sidecars removed |
| Unowned processes/data | Fixed ports 8000/3000, user Electron app, and user product data were untouched |

### Round 2 Durable Coverage Status And Routing

- Repository-resident durable coverage added/updated/removed in Round 2: **No**.
- Temporary evidence added under the ticket probe directory: Yes.
- Authoritative result: **Fail**.
- Recommended recipient: **`/code_reviewer`** for focused failure-origin review. Delivery must wait.
- Required post-fix proof: add or update durable coverage at the builder-to-strict-Team-transport seam, rerun the real `open_tab` journey until no red token rejection appears, then rerun the fresh-process reopen.

### Round 2 Evidence Index

Evidence root:

`/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-persistence/tickets/token-statistics-persistence/probes/api-e2e/real-provider-evidence`

Key artifacts:

- `open-tab-results.json` — machine-readable authoritative result and cleanup.
- `open-tab-live-evidence.json` — pre-restart persisted manifest, member/team summaries, and messages.
- `open-tab-restart-evidence.json` — fresh-process persisted evidence.
- `open-tab-live-token-rejection.png` — repeated red error card during the live Professor turn.
- `open-tab-live-complete-with-token-rejection.png` — completed bidirectional exercise plus red rejection.
- `open-tab-student-token-meter-with-rejection.png` — Student event stream red errors alongside persisted usage.
- `open-tab-student-codex-luna-pricing.png` — Student pricing details confirm `gpt-5.6-luna` / `codex_app_server`.
- `open-tab-professor-token-meter-with-rejection.png` — Professor live error and server-accounted Token Meter together.
- `open-tab-team-token-summary.png` — exact per-member/team totals.
- `open-tab-fresh-process-reopen-history.png` — fresh-process historical exchange.
- `open-tab-fresh-process-reopen-token-meter.png` — fresh-process Token Meter hydration.
- `classroom-homework.md` and `classroom-student-answer.md` — file-backed real exchange artifacts.

## Latest Authoritative Result — API-REV-002

- Result: **Fail**
- Failure-origin confidence: **98.0%**
- Failed scenario: `LIVE-BROWSER-TS-008`
- Passed linked lifecycle scenario: `LIVE-BROWSER-TS-009`
- Critical finding: real Team live token events are rejected by the strict transport because the run-summary builder leaks three aggregate-only `observed_*` fields.
- Required next recipient: `/code_reviewer`
- Delivery status: **Blocked pending source correction, durable regression coverage, and a clean real `open_tab` rerun.**

## Round 3 Corrected-Commit Real `open_tab` Execution

### Round 3 Repository Execution

| Order | Command / Inspection | Result | Evidence |
| --- | --- | --- | --- |
| 1 | Exact HEAD and explicit builder/strict-DTO inspection | Pass — `0ce9d17b75195b0142abadc4593f6fea47893be0`; no aggregate spread; strict DTO has no `observed_*` keys | `real-provider-evidence-api-rev-003/source-boundary-inspection.log` |
| 2 | `pnpm --filter @autobyteus/team-stream-contracts test` | Pass — 2/2 | `shared-contract.log` |
| 3 | Affected Team transport, run-fold, and accumulator Vitest files | Pass — 14/14 across 3 files | `affected-server-suites.log` |
| 4 | `pnpm --filter autobyteus-server-ts build` | Pass — production build and sanitized bootstrap smoke | `server-build.log` |
| 5 | `git diff --check` | Pass | `git-diff-check.log` |

Post-repository confidence was **89.0%** because the passing regression could not supersede the still-open critical real-stream failure. Broader validation was therefore Required.

### Real Environment Setup

| Setup / Boundary | Executed Result | Evidence |
| --- | --- | --- |
| Secret import | Real dry-run and interactive confirmed `pnpm secrets:import` from `/Users/normy/.autobyteus/server-data/.env` into the isolated DB; 9 configured | `secret-import-dry-run.log`, `secret-import-execute.log` |
| Agent package | `/Users/normy/autobyteus_org/autobyteus-agents` loaded; 9 agents and 20 Teams discovered | backend logs |
| Built backend | `dist/app.js`, isolated migrated SQLite/runtime, `127.0.0.1:55972` | `backend-open-tab.log`, `backend-open-tab-restart.log` |
| Frontend | Real Nuxt 3.21.1 dev server, `127.0.0.1:55973` | `nuxt-open-tab.log` |
| Browser | Actual `mcp__autobyteus_agent_tools__open_tab`; three separate live/standalone/fresh-process tabs | screenshots, `open-tab-results.json` |
| Isolation | Existing owners on fixed 8000/3000 were recorded and untouched; only unique ports/runtime/database/key/workspace were owned | `prestart-listeners.log`, `owned-resource-cleanup.json` |

The secret evidence includes value-free assignment names and status only. A non-selected optional Ollama discovery warning was observed; 46 models still loaded, and both requested provider/runtime paths executed successfully.

### Round 3 Scenario Matrix

| Scenario ID | Expected Observable Result | Actual Observable Result | Result | Evidence |
| --- | --- | --- | --- | --- |
| `LIVE-BROWSER-TS-008` | Mixed-runtime Classroom Simulation Team completes Professor -> Student -> Professor; live token events are admitted with no red rejection; member/team Token Meter equals GraphQL. | Professor AutoByteus/`deepseek-v4-flash` and Student Codex App Server/`gpt-5.6-luna` completed the file-backed exchange and reported `42`; two communication messages persisted. Professor = 52,132 tokens/7 reports, Student = 84,231/6, Team = 136,363/13. Browser and logs contained zero `Rejected TOKEN_USAGE_UPDATED`, zero three-key signatures, and zero `An Error Occurred`. | **Pass** | `open-tab-live-team-evidence.json`, `open-tab-live-team-complete-no-rejection.png`, professor/student Token Meter screenshots, `strict-event-error-scan.log` |
| `LIVE-BROWSER-TS-010` | A real standalone AutoByteus event crosses the same builder and strict frontend admission path without a red card; live Token Meter converges to GraphQL. | Daily Assistant on AutoByteus/`deepseek-v4-flash` replied exactly `standalone token check complete.` Token Meter and GraphQL both showed 6,137 tokens/1 report; rejection/error counts were zero. | **Pass** | `open-tab-live-standalone-evidence.json`, `open-tab-live-standalone-deepseek-token-meter-no-rejection.png` |
| `LIVE-BROWSER-TS-009` | After termination, a fresh backend process and fresh `open_tab` restore exact Team/member/messages and Token Meter without rejected diagnostics. | Professor, Student, Team summaries and two messages were exact-equal before/after. Every pre-captured standalone field also matched. Fresh history restored `42`; member/team totals, runtimes, models, and prices remained unchanged; rejection/error counts remained zero. | **Pass** | `open-tab-restart-evidence.json`, fresh-process history/Team/Student screenshots, restart backend log |

### Prior Failure Resolution And Differential Evidence

`API-REV-002` reproduced the user screenshot exactly: valid provider observations persisted, but the real Team strict projector rendered repeated red cards because the builder leaked three statistics-only keys. `API-REV-003` repeated the same package, Team, model/runtime identities, bidirectional communication, token UI, GraphQL, and fresh-process lifecycle on the corrected commit. The corrected run produced zero red cards and zero matching server/frontend rejection signatures while all live and persisted values converged. The strict DTO was not loosened.

This resolves `LIVE-BROWSER-TS-008`; no critical finding remains.

### Round 3 Confidence Scorecard

| Confidence Category | Post-Repository | Final | Evidence Gain |
| --- | ---: | ---: | --- |
| Requirement and acceptance-criteria proof | 95% | 98% | Corrected real Team, standalone, restart, identity, messages, and Token Meter passed |
| Changed-boundary execution directness | 96% | 99% | Production builder seam plus real external runtime streams executed |
| Cross-boundary integration realism and mock gap | 85% | 99% | Built backend/SQLite/provider/WebSocket/GraphQL/Nuxt/DOM executed together |
| Environment, configuration, identity, and fixture fidelity | 90% | 99% | Exact requested import/package/models/runtimes and persisted launch manifest |
| Failure, edge-case, lifecycle, and recovery evidence | 85% | 98% | Exact prior failure recheck plus fresh process and retained race/single-flight evidence |
| User-surface, browser, and desktop-shell confidence | 75% | 98% | Actual `open_tab`, semantic zero counts, inspected live/restart screenshots |
| Durable regression coverage quality and relevance | 97% | 97% | Exact implementation-owned production builder regression; proportional review pending |

- Overall post-repository confidence: **89.0%** (`623 / 7`).
- Overall final confidence: **98.3%** (`688 / 7`, rounded to one decimal).
- Every critical acceptance criterion directly proven: Yes.
- Any final category below 90%: No.
- Default clean target met: Yes.
- Material residual: Electron preload/window/package code is unchanged and not launched; browser exercises the same renderer boundary, and the user screenshot independently showed the old renderer error in Electron.

### Round 3 Cleanup

| Owned Resource | Cleanup Result |
| --- | --- |
| Team and standalone runs | Terminated successfully; Team was terminated again after fresh history open reactivated its logical resume package |
| Browser tabs | All three owned tabs closed; final browser session list empty |
| Backend/frontend | Both built-backend processes and Nuxt process stopped; no listeners on 55972/55973 |
| Data | Unique runtime, requested workspace, SQLite DB, vault key, and sidecars removed |
| Unowned state | Fixed ports 8000/3000, user Electron app, and `/Users/normy/.autobyteus/server-data` remained untouched except read-only secret-source access |

### Round 3 Durable Coverage And Routing

- API/E2E-owned durable coverage changed: **No**.
- Implementation-owned durable coverage executed: `autobyteus-server-ts/tests/unit/agent-team-execution/team-agent-token-usage-event-transport.test.ts`.
- Temporary real-system evidence root: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-persistence/tickets/token-statistics-persistence/probes/api-e2e/real-provider-evidence-api-rev-003`.
- Next recipient: `/code_reviewer` for proportional durable-test review. Delivery remains gated only on that required workflow review, not on an API/E2E failure.

## Latest Authoritative Result — API-REV-003

- Result: **Pass**
- Final validation confidence: **98.3%**
- Resolved scenario: `LIVE-BROWSER-TS-008`
- Passed linked scenarios: `LIVE-BROWSER-TS-009`, `LIVE-BROWSER-TS-010`
- Red `Rejected TOKEN_USAGE_UPDATED` cards observed on corrected commit: **0**
- Remaining API/E2E failure IDs: None
- Required next recipient: `/code_reviewer` for proportional durable-test review
