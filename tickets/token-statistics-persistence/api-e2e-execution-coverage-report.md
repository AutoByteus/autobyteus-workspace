# API/E2E Execution Coverage Report

## Execution Round Meta

- Requirements Doc: /Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-persistence/tickets/token-statistics-persistence/requirements.md
- Investigation Notes: /Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-persistence/tickets/token-statistics-persistence/investigation-notes.md
- Design Spec: /Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-persistence/tickets/token-statistics-persistence/design-spec.md
- Supplemental Task Artifacts: None.
- Solution Revision Record: /Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-persistence/tickets/token-statistics-persistence/solution-revision-record.md
- Design Review Report: /Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-persistence/tickets/token-statistics-persistence/design-review-report.md
- Architecture Review Revision Record: /Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-persistence/tickets/token-statistics-persistence/architecture-review-revision-record.md
- Implementation Handoff: /Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-persistence/tickets/token-statistics-persistence/implementation-handoff.md
- Implementation Revision Record: /Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-persistence/tickets/token-statistics-persistence/implementation-revision-record.md
- Code Review Report: /Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-persistence/tickets/token-statistics-persistence/code-review-report.md
- Code Review Revision Record: /Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-persistence/tickets/token-statistics-persistence/code-review-revision-record.md
- Delivery Revision Record (delivery re-entry only): N/A.
- Relevant Delivery Revision IDs: N/A.
- Coverage Investigation: /Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-persistence/tickets/token-statistics-persistence/api-e2e-coverage-investigation.md
- API/E2E Revision Record: /Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-persistence/tickets/token-statistics-persistence/api-e2e-revision-record.md
- Current API/E2E Revision ID: API-REV-001
- Current Execution Round: 1
- Trigger: CRR-001 source-review pass for implementation commit ec173d01be545d5df5ddecdf84b6d09393c0b62b and its residual restart, compound-identity, GraphQL race, and team single-flight risks.
- Prior Round Reviewed: None; no earlier completed API/E2E result exists.
- Latest Authoritative Round: Round 1, completed 2026-08-20, Pass at 97.3% confidence.

## Investigation And Execution Basis

- Coverage investigation artifact: /Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-persistence/tickets/token-statistics-persistence/api-e2e-coverage-investigation.md
- Investigation completed before durable coverage changes or final execution: Yes
- Investigation plan followed: No — after the narrow durable restart E2E and server build passed, the realistic browser/lifecycle probe was completed before the full existing repository regression matrix and formal post-repository scorecard. No product or test source changed after the final browser run; the complete repository matrix then passed. Evidence is still separated into post-repository and final scorecards by coverage type. The existing GraphQL run was also broadened to provider/safe-integer semantics, production Nuxt build and localization audit were added, and a seventh browser scenario recorded narrow-viewport containment.
- Existing coverage decisions revised during execution, with evidence: None. All relevant existing scenarios remained Still Valid; no stale coverage was found.
- Reroute required before or during execution: No
- Notes: One durable built-process restart E2E was added. Browser/live evidence used a ticket-scoped temporary fixture because retaining a test-only route and direct DB seeding UI would be inappropriate repository surface.

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

Browser artifacts in the matrix are below /Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-persistence/tickets/token-statistics-persistence/probes/api-e2e/evidence/. Command logs are below /Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-persistence/tickets/token-statistics-persistence/evidence/.

## Additional Repository Coverage Execution

None. The updated coverage investigation contains all planned and completed repository commands and their evidence. No repository check was added or rerun after the post-repository confidence gate.

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | Change | New / Final Supporting Evidence | Residual Uncertainty |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 95% | 98% | +3 | Seven browser/lifecycle scenarios closed AC-003 through AC-007 user-path and timing gaps while repository evidence covered AC-001/002/008/009 | No material requirement gap; real external model production is intentionally outside scope |
| Changed-boundary execution directness | 95% | 98% | +3 | Production Pinia store, composable, Apollo mapper, Token Meter, built GraphQL server, and SQLite records executed together | Electron-only wrapper was unchanged and not launched |
| Cross-boundary integration realism and mock gap | 91% | 97% | +6 | Actual HTTP GraphQL responses crossed built backend and Nuxt/Apollo; timing interception delayed real responses rather than synthesizing data | Live event delivery was invoked through the production store entrypoint rather than a running model stream |
| Environment, configuration, identity, and fixture fidelity | 96% | 98% | +2 | Migrated isolated SQLite, unique standalone/two-team identities, dynamic loopback ports, production-built backend, Nuxt dev, and Chrome all executed | No user profile, auth, or external provider was relevant |
| Failure, edge-case, lifecycle, and recovery evidence | 95% | 97% | +2 | Fresh process restart, null snapshots, wrong-team lookup, delayed stale response, live-after response, and traffic-during-request all passed | Abrupt OS crash mid-SQLite transaction was not in changed scope |
| User-surface, browser, and desktop-shell confidence | 90% | 96% | +6 | Semantic DOM assertions and four inspected screenshots proved desktop/narrow rendering using the web-equivalent Electron renderer code | Electron preload/window/package integration was unchanged and not exercised |
| Durable regression coverage quality and relevance | 97% | 97% | 0 | Existing focused durable coverage plus the new reusable built-process restart E2E protect stable invariants | Mandatory proportional review of the new durable file remains before delivery |

- Overall post-repository confidence: 94.1% (659 / 7).
- Overall final confidence: 97.3% (681 / 7, rounded to one decimal).
- Calculation method: Simple average of the seven mandatory applicable category scores; a passing overall score does not mask a weak category.
- Confidence change produced by broader validation: +3.2 percentage points, primarily closing real Nuxt/Apollo, request-ordering, lifecycle, and visible-rendering gaps.
- Every critical acceptance criterion directly proven: Yes
- Any final applicable category below 90%: No
- Default final confidence target of 95% met: Yes
- Confidence-limiting residual risks: Only unchanged/out-of-scope Electron-shell integration and external provider production remain unexecuted. These do not materially affect this renderer/readiness fix.

## Broader Validation Decision And Execution

- Decision and selected execution mode from the coverage investigation: Required — Browser + Live API + Lifecycle.
- Material deviation from the planned mode or rationale: None. One additional narrow-viewport screenshot scenario was recorded. Response interception controlled timing only; all summary bodies came from the actual backend GraphQL endpoint.
- Confidence gap or residual risk actually addressed: Fresh Nuxt store plus actual Apollo/HTTP; persistent rows across a backend restart; live-before/during/after ordering; exact compound identity; sequential team aggregate coalescing; and visible field/layout fidelity.
- If Not Required, direct evidence that made broader validation unnecessary: N/A.
- If Blocked, exact unavailable dependency or access and attempted alternatives: N/A.
- Startup order, commands, and readiness results: pnpm --filter autobyteus-server-ts build passed; then node tickets/token-statistics-persistence/probes/api-e2e/token-usage-browser-probe.mjs reserved ports, started the built backend, seeded current records, started Nuxt, and launched Chrome. Backend readiness was observed on 127.0.0.1:49573, Nuxt on 49586, and the fixture DOM marker became ready. Final command output is tickets/token-statistics-persistence/evidence/browser-probe-rerun-3.log.
- Environment choices that materially affected the run: APP_ENV=test, isolated migrated SQLite/runtime, unique per-run IDs, loopback-only ports, no credentials, Node 22.23.1, and a headless isolated Chrome context.
- Seed data, fixtures, identities, authentication, permissions, or session state: Priced standalone current record plus Team A focused/other members and Team B member; later observations used the production accumulator/store. There is no authentication boundary on the isolated local GraphQL surface.

| Scenario / Journey Step | Expected Observable Result | Actual Observable Result | DOM / Screenshot / Log / API / Process Evidence | Result |
| --- | --- | --- | --- | --- |
| Fresh standalone, two null events before open | GraphQL still runs and full durable cumulative summary renders | 2 reports, 175 tokens, $0.0045, model/runtime/prompt/context and price status rendered | results.json, standalone-live-before.png, GraphQL operation log | Pass |
| Focused member under exact Team A | Member remains primary, team total hydrates, wrong-team cache remains absent | Member 75 tokens/2 reports; team 105 tokens/3 reports; foreign lookup null | results.json, team-live-before.png | Pass |
| Stale GraphQL response during newer live event | Lower generation must not replace newer cumulative snapshot | Delayed generation 2 was ignored; generation 3 remained at 215 tokens | results.json | Pass |
| Live event after hydration | Higher generation advances once | Generation 4 rendered 230 tokens/4 reports | results.json, standalone-live-during-after.png | Pass |
| Team traffic while aggregate response is pending | At most one request active; dirty follow-ups continue until stable | Exactly 3 sequential aggregate requests, max active 1, final 130 tokens, record_backed | results.json | Pass |
| Stop/start backend and reload fresh renderer | Same row reopens without migration or replay | New backend PID returned identical standalone total of 230 and four reports | backend-first.log, backend-restarted.log, results.json | Pass |
| Narrow viewport | Cards remain within 390px viewport | Total card x=66, width=308; inspected screenshot showed no horizontal escape | standalone-reopened-narrow.png, results.json | Pass |

## Desktop Application Validation (When Applicable)

- Validation approach executed and any deviation from the investigation: Browser-first web-equivalent renderer validation exactly as planned; no Electron process was launched.
- Browser-tested web-equivalent behavior and evidence: Production Nuxt/Pinia/Apollo/composable/Token Meter ran against the built backend; evidence is the seven scenarios, JSON, screenshots, and service logs above.
- Shell-specific or lifecycle behavior and evidence: Backend process stop/start was directly tested. Preload, IPC, window management, packaging, and native APIs were unchanged, so actual desktop execution would not add material evidence.
- Effect on any already-running desktop application: None
- Behavior not directly proven and confidence consequence: Electron-only wrapper behavior was not tested; this leaves a negligible unchanged-shell residual represented by the 96% user-surface score.

## Platform / Runtime Targets

- Operating system / platform: macOS 26.5.2, arm64.
- Runtime and relevant framework versions: Node.js 22.23.1; pnpm 10.28.2; Fastify ^4.29.1; Prisma ^5.22.0; Nuxt 3.21.1/Vue 3.5.28 during execution; server Vitest 4.0.18; web Vitest 3.2.4.
- Browser / engine and version, when applicable: Google Chrome 151.0.7922.138 via installed playwright-core.
- Device, viewport, locale, timezone, or accessibility settings, when applicable: Desktop screenshots at the default fixture viewport; narrow check at 390x844; English UI; host timezone Europe/Berlin. No accessibility mode override.

## Lifecycle / Upgrade / Restart / Persisted-Data Checks

- Approved persisted-data decision: Directly Usable — No Migration
- Representative existing data exercised: Priced standalone two-report row, exact Team A member two-report row, distinct Team B member row, and a derived team aggregate; the browser run also used a second Team A member and later observations.
- Direct-use, discard/rebuild, or migration result and evidence: Pass. A new built server process queried identical HTTP GraphQL summaries against the same database; row count remained three with one row under each team root. Browser restart independently reopened the same four-report standalone record.
- Migration completion/recovery evidence, only when Migration Required: N/A.
- Version-specific runtime branch, dual read/write, or compatibility fallback observed: No
- Residual untested persisted-data risk: None material. Crash-consistency during a write is unchanged and outside this request.

## Tests Implemented Or Updated

| Path / Scenario | Change | Requirement / Boundary | Execution Result | Notes |
| --- | --- | --- | --- | --- |
| autobyteus-server-ts/tests/e2e/token-usage/token-usage-record-restart-graphql.e2e.test.ts / API-TS-006 | Added | REQ-001/004/005; AC-001/002/007/009; fresh built process and direct-use persisted records | Pass, 1/1 in 11.53s final run | Uses existing lifecycle bootstrap and current-record fixture; asserts full standalone fields, exact member/team identity, wrong-team empty result, identical pre/post-restart GraphQL, and unchanged row identities/count |

## Tests Removed As Stale Or Obsolete

None.

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: Yes
- Paths added or updated: /Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-persistence/autobyteus-server-ts/tests/e2e/token-usage/token-usage-record-restart-graphql.e2e.test.ts (added)
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

## Temporary Execution Methods / Scaffolding

| Path / Method | Why Needed | Result / Evidence | Cleanup Result |
| --- | --- | --- | --- |
| tickets/token-statistics-persistence/probes/api-e2e/token-usage-browser-probe.mjs | Orchestrate real backend, Nuxt, Chrome, persistence, timing, screenshots, and owned cleanup | Pass; browser-probe-rerun-3.log and results.json | Browser, Nuxt, backend, Prisma, runtime, and DB closed/removed |
| tickets/token-statistics-persistence/probes/api-e2e/token-usage-browser.page.vue copied temporarily to autobyteus-web/pages/api-e2e-token-usage.vue | Mount production store/composable/Token Meter without adding a permanent product route | Pass; seven scenarios | Copied route removed; source fixture retained only in ticket evidence |
| Playwright response delay for selected GraphQL requests | Make during-request ordering deterministic without replacing backend response data | Stale-response and team-dirty-loop scenarios passed | Isolated browser context closed |

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| External model/provider generation | Deterministic token observations were recorded through the production current-record accumulator/store | Provider traffic requires credentials/cost and does not test the changed hydration/readiness boundary | None material; provider parsing/persistence was unchanged and existing semantics E2E passed |
| Live stream transport | Production store event entrypoints received exact cumulative summaries produced from persisted observations | The change is frontend admission/readiness, not WebSocket connection management; deterministic event timing was required | Small bounded residual reflected in 97% cross-boundary score |
| Electron shell | Browser ran the same Nuxt renderer code | No preload/IPC/window/package code changed; launch could disrupt the user's app | Negligible unchanged-shell residual |

## Result Summary

| Result | Scenario IDs | Summary / Reason |
| --- | --- | --- |
| Pass | API-TS-001 through API-TS-006, API-REG-001/002, BROWSER-TS-001 through BROWSER-TS-007, BUILD-GUARD-001 | All requirement-linked durable, API, lifecycle, browser, race, render, build, and guard checks passed. |
| Out Of Scope | Actual external provider/runtime turn; Electron-only wrapper | These boundaries were unchanged and would not materially improve proof of the approved fix. |

## Cleanup Performed

| Resource / Process / Data | Ownership | Cleanup Action | Result |
| --- | --- | --- | --- |
| Built backend processes | Ticket probe / lifecycle tests | Graceful stop with kill fallback only for owned children | Stopped; no owned process remains |
| Nuxt dev process | Ticket probe | Stopped owned child process | Stopped |
| Chrome browser/context | Ticket probe | Closed context/browser | Closed |
| Prisma client | Ticket probe/tests | shutdownPrisma() | Closed |
| Isolated runtime, SQLite database, and sidecars | Ticket probe/tests | Existing removeOwnedTestRuntime cleanup | Removed |
| Temporary product route | Ticket probe | Removed autobyteus-web/pages/api-e2e-token-usage.vue | Removed and absence verified |
| User desktop app/profile/data | Not owned and never used | No action | Unaffected |

The intentional backend-stop interval caused three expected Nuxt health-poll HTTP 500 console messages on already-open fixture pages. There were zero browser pageerror events and zero Playwright requestfailed events; GraphQL scenarios and the restarted page passed. Early probe/test-authoring attempts were retained in ticket logs, but only the corrected final runs are authoritative; corrections changed test/probe expectations and harness behavior, not product source.

## Preliminary Classification

- No failing implementation result remains, so failure-origin classification is not applicable.
- Resolved authoring issues were local API/E2E test/probe corrections: the wrong-team GraphQL reader truthfully returns an empty summary with rootTeamRunId null; localized copy says model calls; and temporary harness route/query/termination behavior was corrected. Final durable and temporary checks passed.

## Recommended Recipient

/code_reviewer for proportional review of the one added repository-resident durable test. Delivery must wait for that review.

## Evidence / Notes

- Implementation under test: commit ec173d01be545d5df5ddecdf84b6d09393c0b62b on codex/token-statistics-persistence.
- The worktree is recorded as eight commits behind its tracked remote base state. API/E2E did not integrate or refresh the branch; integrated-state refresh is delivery-owned.
- No schema, migration, product source, existing durable test, or localization file was changed during this stage.

## Latest Authoritative Result

- Result: Pass
- Final validation confidence: 97.3%
- Default 95% confidence target met: Yes
- Any final applicable confidence category below 90%: No
- Broader validation decision: Required and completed via Browser + Live API + Lifecycle.
- Critical acceptance criteria lacking direct proof: None.
- Required next recipient: /code_reviewer for proportional test-code review.
- Notes: One durable E2E test was added; no durable tests were updated or removed. Residuals are limited to unchanged/out-of-scope Electron shell and external provider execution.
