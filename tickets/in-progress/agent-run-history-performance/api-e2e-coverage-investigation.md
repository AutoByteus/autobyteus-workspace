# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/home/autobyteus/workspace/.codex/worktrees/agent-run-history-performance/tickets/in-progress/agent-run-history-performance/requirements-doc.md`
- Investigation Notes: `/home/autobyteus/workspace/.codex/worktrees/agent-run-history-performance/tickets/in-progress/agent-run-history-performance/investigation-notes.md`
- Design Spec: `/home/autobyteus/workspace/.codex/worktrees/agent-run-history-performance/tickets/in-progress/agent-run-history-performance/design-spec.md`
- Supplemental Task Artifacts: `/home/autobyteus/workspace/.codex/worktrees/agent-run-history-performance/tickets/in-progress/agent-run-history-performance/history-window-ui-ux-spec.md`
- Design Review Report: `/home/autobyteus/workspace/.codex/worktrees/agent-run-history-performance/tickets/in-progress/agent-run-history-performance/design-review-report.md` (authoritative round 4, Pass)
- Implementation Handoff: `/home/autobyteus/workspace/.codex/worktrees/agent-run-history-performance/tickets/in-progress/agent-run-history-performance/implementation-handoff.md`
- Code Review Report: `/home/autobyteus/workspace/.codex/worktrees/agent-run-history-performance/tickets/in-progress/agent-run-history-performance/code-review-report.md` (authoritative round 3, Pass)
- Current Investigation Round: `2`
- Trigger: Source-review round-3 Pass for latest-base integration merge `c13ba233a435eb7c1d0cbd88556b93e77f7ad657`, reviewed-state checkpoint `9e06eff8a28ee3c5dc0a08c8432f24470e36c7e2`, integrated base `origin/personal@8c7e2c2aa591b174a3d5c90eb0d05584538bbf12`, and artifact HEAD `336b08502`.
- Prior Investigation Reviewed: `Round 1` — authoritative only for the pre-integration candidate and retained as history/context.
- Latest Authoritative Investigation: `2`

## Current Requirement And Design Basis

The normal standalone and team-member Event Monitor projection must read only `raw_traces_active.jsonl`, reconstruct complete active-file lifecycle evidence, and select the newest 100 canonical replay events before building the unchanged GraphQL conversation/activity bundle. Existing active/archive files are directly usable without migration and projection reads must not alter either file.

Frontend historical hydration, standalone/team production dispatch, local submission, Activity state, and the final compaction-aware feed must remain at or below 100 visual/activity records. Completed candidates are evicted before mutable candidates; a deterministic oldest-mutable fallback applies only after completed candidates are exhausted. The visible-presentation revision is based on bounded semantic pre/post equality: exact `MP-CR-001`, `MP-AR-003`, non-visible protocol traffic, and equal semantic replacement do not revise, while real retained content/card/order/membership/compaction changes revise once.

The browser-visible surface must preserve pinned bottom following, preserve a non-pinned viewport while showing the localized keyboard-operable jump action, clear it on activation/manual return, retain collapsed disclosure behavior, and omit the removed conversation-copy control. `AC-009` additionally requires direct measurement for a deterministic >=5 MB / >=600-display-entry active fixture and a <=2.0 second usable Event Monitor/composer result on the documented reference environment.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| `REQ-001`, `AC-001`, `AC-008` — projection source | Changed | Requirements and `DS-001`; reviewed provider implementation | Need real filesystem + GraphQL proof for standalone and team that archives are not opened/read and archive-only markers never appear. |
| `REQ-002`, `AC-002`, `AC-009` — canonical bound | Added | Requirements and server recent policy | Need >100 and >=600 canonical active-event GraphQL coverage, order assertions, payload/timing metrics. |
| `REQ-003`–`REQ-004`, `AC-003`–`AC-004` — client rolling | Added | Window/completion/selection design | Need >=1,000 production-dispatch events plus mixed/completed/mutable/compaction state/DOM bound evidence and duplicate checks. |
| `REQ-005`, `AC-005` — semantic revision | Changed | `CR-001`, `AR-003`, round-4 design | Need exact `MP-CR-001` and `MP-AR-003` through authoritative production dispatch, plus true visible-change and pinned/non-pinned browser behavior. |
| `CR-002` — team replacement baseline | Changed | Design, implementation, source review | Need non-live replacement reset and subscribed-live preservation execution. |
| `REQ-006`, `AC-006` — disclosure | Preserved | UI/UX spec | Existing assertions are incomplete for Thinking; add durable disclosure regression and validate after a rolling browser presentation. |
| `REQ-007` — Activity bound | Added | Store design/implementation | Need stress coverage confirming per-run Activity <=100 and derived state remains coherent. |
| `REQ-008`, `AC-007` — copy control | Removed | Requirements and reviewed view change | Existing component assertion remains valid; browser check should confirm absent control/no gap. |
| `REQ-009`, `AC-010` — persisted data | Preserved | Direct-use/no-migration decision | Need representative manifested and manifest-less direct reads, hashes/bytes unchanged, and no compatibility branch. |
| `AC-011` — locale/keyboard/a11y | Added | UI/UX spec | Need English and zh-CN visible labels, native button focus/Enter/Space, visible focus styling, and no token live region. |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | Active-only memory view and post-reconstruction newest-100 selector | Provider/policy unit tests | Real archive path access and >=5 MB fixture | GraphQL E2E + live HTTP probe |
| API / transport / contract | Yes | Existing GraphQL payload now intrinsically bounded | Existing unrelated run-projection GraphQL E2E | Standalone/team active+archive bound and payload size | GraphQL E2E/live API |
| Frontend component / state | Yes | Window, Activity cap, semantic witness, feed scroll/jump | Focused Vitest/component tests | >=1,000 messages, realistic DOM/disclosure/locales | Durable stress tests + browser |
| Browser integration / user journey | Yes | Dynamic scroll state, focus, localized action, disclosure | Implementation temporary browser evidence | zh-CN, rolling eviction, focus/Space/Enter, DOM count | Browser |
| Authentication / session / permissions | No | Unchanged | Existing app coverage | None for changed scope | None |
| Desktop renderer / web-equivalent UI | Yes | Shared Nuxt renderer used by Electron/web | Component tests and implementation browser evidence | Real browser layout/focus/scroll under rolling state | Browser development path |
| Desktop shell / Electron-specific integration | No | No preload/IPC/window/package change | N/A | None | None |
| Process / lifecycle | Yes | Historical hydration followed by live continuation and team reopen | Unit/service tests | Full server/frontend process and realistic transition | Live API + browser |
| Persisted-data transition | Yes | Direct read policy only; no migration | Source/unit evidence | Byte preservation with active+archive layouts | Filesystem GraphQL E2E |
| Worker / queue / distributed coordination | No | Unchanged | N/A | None | None |
| External integration | No | Unchanged | N/A | None | None |

## Project Execution Discovery

- Assigned task worktree / workspace: `/home/autobyteus/workspace/.codex/worktrees/agent-run-history-performance`
- Project type and runtime stack: Git/pnpm monorepo; Node 22, TypeScript, Fastify/Mercurius/TypeGraphQL server, Nuxt/Vue/Pinia frontend, Vitest, Playwright Core with system Chromium.
- Conflicting, missing, or unclear project instructions: None. The implementation's previously timed-out full Nuxt typecheck was retried after the container memory increase. It completed in 27.25 seconds and reported 242 repository-baseline diagnostics; none name the modified production files or new durable test files. This is a completed baseline failure, not an inconclusive timeout or a task-source failure.
- Required environment variables or secrets available: `N/A`; deterministic local app data and in-process GraphQL require no external credentials.

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `autobyteus-server-ts/AGENTS.md` | Closest server test authority | Use `vitest run ... --no-watch`; run focused files before broader coverage. |
| `autobyteus-web/AGENTS.md` | Closest frontend authority | Use `pnpm test:nuxt ... --run`; browser dev path is supported; do not use broad git add. |
| `autobyteus-server-ts/README.md` | Server build/run/environment | Build with `corepack pnpm -C autobyteus-server-ts build`; start `node dist/app.js --data-dir ... --host ... --port ...`; custom data dir contains `.env`. |
| `autobyteus-web/README.md` | Frontend/browser/test instructions | `corepack pnpm test:nuxt ... --run`; `corepack pnpm dev`; standard Playwright-Core probe discovers `/usr/bin/chromium`. |
| `autobyteus-server-ts/package.json`, `vitest.config.ts` | Server scripts/config | Shared package prep is normally invoked by package test script; direct `exec vitest run` is available once workspace deps are built. |
| `autobyteus-web/package.json`, `vitest.config.mts` | Frontend scripts/config | Nuxt tests use happy-dom and localization/websocket setup; Electron suite is separate and not required for renderer-only change. |
| `autobyteus-web/tests/e2e/workspace-responsive-probe.mjs` | Browser probe convention | Playwright Core/system Chromium, explicit base URL/output directory, browser cleanup. |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| In-process GraphQL schema | `autobyteus-server-ts` | Focused Vitest E2E test builds schema against temp app data | No external server; real store/provider/GraphQL resolver | Test query succeeds | Vitest teardown removes temp data |
| Optional live Fastify backend | worktree root | build then `node autobyteus-server-ts/dist/app.js --data-dir <owned-temp> --host 127.0.0.1 --port <owned-port>` | Use owned temp DB/memory, no default user data | `/graphql` query/HTTP status | SIGTERM owned PID, remove temp dir |
| Nuxt browser renderer | `autobyteus-web` | `corepack pnpm dev -- --host 127.0.0.1 --port <owned-port>` with temporary probe page only if needed | Web-equivalent Electron renderer; no shell behavior claimed | HTTP 200 for probe route | SIGTERM owned PID; remove probe-only page/script |
| Chromium | system | Playwright Core with `/usr/bin/chromium` | Headless, explicit viewport/locale | page loads and DOM assertions run | `browser.close()` |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Standalone/team active+archive run | Existing metadata stores + `AgentMemoryLayout`; generated JSONL in temp app data | Markers only; no user conversation/tool data | Temp app data removed; aggregate evidence retained |
| >=5 MB / >=600 display active file | Deterministic generated JSONL user/assistant records with padding | Synthetic, no secrets; record exact byte/event counts | Remove raw fixture; retain metrics only |
| >=1,000 live messages | Production dispatch methods with deterministic stable IDs | In-memory test state | Test teardown |
| Browser mixed feed/compactions/locales | Temporary deterministic Nuxt probe page using production feed/components | No backend/user data required for UI-only journey | Remove temporary page after evidence; retain screenshots/metrics |

## Persisted Data Transition Coverage Basis

- Approved decision: `Directly Usable — No Migration`
- Design-spec and implementation-handoff references: design “Persisted Data / State Transition Decision”; handoff “Persisted Data Transition Check”.
- Representative existing-data setup and required behavior: manifest-less active-only; active plus complete archive segment and manifest for standalone/team; current reader returns active recent window without touching archive bytes.
- Evidence planned: GraphQL E2E with filesystem read instrumentation; marker exclusion; before/after SHA-256 for active/archive/manifest; no writer or migration branch; both layouts query successfully.
- Migration-specific scenarios: `N/A`.
- Upstream ambiguity or reroute required: `No`.

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Acceptance Criteria / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/unit/run-history/projection/local-memory-run-view-projection-provider.test.ts` | Active-only options; explicit memoryDir; lifecycle-before-newest-100 | `REQ-001`–`REQ-002`, `AC-002` | Still Valid | Reviewed assertions match approved design | Run; supplement at real GraphQL/filesystem boundary. |
| `.../recent-run-projection-policy.test.ts` | Pure newest 100/order | `REQ-002`, `AC-002` | Still Valid | Direct policy proof | Run. |
| `autobyteus-server-ts/tests/e2e/run-history/run-projection-toolcalls-graphql.e2e.test.ts` | Existing standalone/team GraphQL replay/tool behavior; one cross-file scenario expected archived call arguments to repair an active result | Preserved GraphQL shape plus active-only boundary constraint | Needs Update | Expanded execution failed only because the cross-file assertion represented the removed archive-inclusive normal projection; approved active-only behavior requires a source-limited active result | Update scenario name and expected `toolArgs`/Activity arguments to source-limited values; retain exact-once/result/name assertions. |
| `autobyteus-web/services/eventMonitor/__tests__/recentEventMonitorWindow.spec.ts` | Completed-first, 101 mutable fallback/re-entry, combined compaction cap | `REQ-003`–`REQ-004`, `AC-003`–`AC-004` | Still Valid | Exact current semantics | Run. |
| `.../recentEventMonitorMutationCommit.spec.ts` | Exact `MP-CR-001`, retained change, eviction-only, `MP-AR-003` | `REQ-005`, `AC-005` | Still Valid | Direct commit owner proof | Run; supplement through production dispatch. |
| `.../recentEventMonitorPresentationWitness.spec.ts` | All kinds/order, exclusions, semantic equality, no recursion | `AR-003`, `AC-005` | Still Valid | Exhaustive semantic owner proof | Run. |
| `autobyteus-web/services/agentStreaming/__tests__/AgentStreamingService.spec.ts` | Standalone authoritative dispatch revision/no-op/tool-detail behavior | `DS-003`, `AC-005` | Still Valid | Production dispatcher with test context | Extend via new stress/edge test rather than overload general file. |
| `.../teamStreamGenericMessageDispatcher.spec.ts` | Team generic visible/no-op commit | `DS-003`, `AC-005` | Still Valid | Production dispatcher | Supplement production dispatch edge/stress. |
| `.../runOpen/__tests__/teamRunOpenCoordinator.spec.ts` | Non-live replacement reset and subscribed-live preservation | `CR-002`, `AC-005` | Still Valid | Both branches asserted | Run. |
| `autobyteus-web/stores/__tests__/agentActivityStore.spec.ts` | Completed-first Activity cap and derived repair | `REQ-007`, `AC-004` | Still Valid | Direct store proof | Run and include in stress flow. |
| `.../AgentConversationFeed.spec.ts` | Combined order and native jump button behavior | `AC-003`, `AC-005`, `AC-011` | Still Valid | Component scroll/jump assertions | Run; supplement real browser/locales. |
| `.../AgentWorkspaceView.spec.ts` | Copy control absent | `AC-007` | Still Valid | Direct component proof | Run and browser observe. |
| Existing `ToolCallIndicator.spec.ts` | Keyboard-navigable card behavior | `AC-006` preserved tool interaction | Still Valid | Current card interaction | Run. |
| No dedicated `ThinkSegment` disclosure spec | N/A | `AC-006` | Needs Update | Critical preserved behavior lacks direct durable assertion | Add focused durable test. |

## Stale Or Obsolete Coverage Decisions

| Path / Scenario | Obsolete Assertion | Why It Is Obsolete | Upstream Evidence | Replacement Coverage | No-Replacement Rationale |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/run-history/run-projection-toolcalls-graphql.e2e.test.ts` cross-file tool scenario | Normal GraphQL projection recovers archived call arguments for an active result | `REQ-001` forbids archive reads, and the design explicitly accepts source-limited tool evidence at an archive boundary | Requirements constraints; design `DS-001`; source-review pass | Same scenario updated to prove active result/name exact-once with null/empty source-limited arguments; new `API-001` proves no archive I/O | N/A |

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Requirement / Acceptance Criteria / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| `API-001` | Standalone and team GraphQL ignore archives, bound/order active events, preserve bytes for manifest/no-manifest layouts | `AC-001`, `AC-002`, `AC-008`, `AC-010`, `DS-001` | `autobyteus-server-ts/tests/e2e/run-history/recent-run-projection-graphql.e2e.test.ts` | Existing unit mocks cannot prove real file + resolver behavior or archive non-access. |
| `LIVE-001` | >=1,000 mixed standalone/team production dispatch messages; <=100 center and Activity; no duplicate stable IDs; MP paths | `AC-003`–`AC-005`, `DS-003` | `autobyteus-web/services/agentStreaming/__tests__/recentEventMonitorProductionDispatch.spec.ts` | Exact scale and authoritative dispatcher coverage are absent. |
| `UI-001` | Thinking collapsed initially and expands by native button activation | `AC-006` | `autobyteus-web/components/conversation/segments/__tests__/ThinkSegment.spec.ts` | Preserved disclosure behavior currently lacks direct durable proof. |

## Durable Coverage To Update

| Scenario ID | Existing Path / Scenario | Required Update | Requirement / Acceptance Criteria / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| `API-002` | `run-projection-toolcalls-graphql.e2e.test.ts` cross-file lifecycle | Replace archive-recovered argument expectations with source-limited active-result expectations | `REQ-001`, `AC-001`, source-limited constraint | Discovered by expanded run-history suite after initial investigation; implementation behavior is correct. |

## Durable Coverage To Remove

None.

## Repository Coverage Execution Plan And Results

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| 1 | `pnpm exec vitest run tests/e2e/run-history/recent-run-projection-graphql.e2e.test.ts --no-watch --maxWorkers=1` | `autobyteus-server-ts` | `API-001` | Pass — 1 file / 2 tests | `evidence/api-e2e/server-focused.txt` |
| 2 | `pnpm test:nuxt ...recentEventMonitorProductionDispatch.spec.ts ...ThinkSegment.spec.ts --run --maxWorkers=2` | `autobyteus-web` | `LIVE-001`, `UI-001` | Pass — 2 files / 7 tests | `evidence/api-e2e/web-focused.txt` |
| 3 | relevant provider/policy/new/existing GraphQL run-history suite | `autobyteus-server-ts`; `--no-watch --maxWorkers=1` | backend regression, stale-test update | Pass — 4 files / 13 tests; 5,416,102-byte fixture; 37.637 ms in-process projection | `evidence/api-e2e/server-run-history.txt` |
| 4 | 19-file changed/relevant Nuxt suite | `autobyteus-web`; `--run --maxWorkers=2` | window/witness/dispatch/team reopen/submission/Activity/feed/disclosure regressions | Pass — 19 files / 174 tests | `evidence/api-e2e/web-expanded.txt` |
| 5 | `guard:web-boundary`, `guard:localization-boundary`, `audit:localization-literals` | `autobyteus-web` | boundary/catalog integrity | Pass — zero findings | `evidence/api-e2e/web-guards.txt` |
| 6 | `timeout 600s corepack pnpm exec nuxt typecheck` | `autobyteus-web` | repository static integration | Completed with repository-baseline failure — 242 diagnostics; no diagnostics in modified production files or new durable tests | `evidence/api-e2e/nuxt-typecheck-final.txt` |
| 7 | server package typecheck and production build | `autobyteus-server-ts` | server compile/package | Typecheck blocked by existing `TS6059` test/rootDir configuration; production build Pass | `evidence/api-e2e/server-typecheck.txt`, `evidence/api-e2e/server-build.txt` |

## Post-Repository Confidence Scorecard

| Confidence Category | Score | Repository Evidence / Residual Gap Before Broader Validation |
| --- | ---: | --- |
| Requirement and acceptance-criteria proof | 93% | Every criterion has direct repository coverage except realistic browser behavior and live HTTP timing. |
| Changed-boundary execution directness | 96% | Real stores/provider/GraphQL and production dispatch methods are exercised; browser scroll remained. |
| Cross-boundary integration realism and mock gap | 91% | In-process GraphQL and production components are direct, but no live socket/process/browser chain yet. |
| Environment, configuration, identity, and fixture fidelity | 95% | Real temp filesystem, metadata stores, active/archive/manifests, >=5 MB fixture, standalone/team identities. |
| Failure, edge-case, lifecycle, and recovery evidence | 96% | Exact material premises, all witness kinds/order, mutable fallback, replacement reset/live preservation, source-limited archive boundary. |
| User-surface, browser, and desktop-shell confidence | 86% | Happy-dom/component proof is strong; real Chromium focus/scroll/locales/disclosure still required. Electron shell is unchanged. |
| Durable regression coverage quality and relevance | 96% | Three focused additions plus one stale assertion correction; relevant expanded suites pass. |

- Overall post-repository confidence: `93.3%` (simple average of seven applicable categories).
- Categories below 90%: user-surface/browser `86%`; broader browser validation remains required.
- Repository execution notes: server production build passed. Nuxt typecheck now completes but fails on 242 pre-existing/baseline diagnostics outside the modified production files and new tests. Server full-package typecheck is prevented by the repository's existing `rootDir`/test inclusion configuration; neither is counted as task behavior failure.

## Broader Validation Decision

- Decision: `Required`
- Selected execution mode: `Live API` + `Browser`
- Specific confidence gap or residual risk addressed: >=5 MB/600-event GraphQL payload/timing; real browser hydration/DOM cap/scroll/focus/locales/disclosures; connection between bounded backend response and usable renderer; index/disclosure behavior under rolling retention.
- Why selected mode can materially improve confidence: repository tests use in-process GraphQL and happy-dom/mocks; live HTTP and Chromium directly exercise serialization, renderer layout, keyboard focus, and measured usability.
- Expected confidence after selected validation: >=95% with no category below 90% if all critical scenarios pass. Execution achieved live HTTP TTFB/total <=53.1 ms and Chromium usable time 929 ms, with all selected journeys passing; final scores are recorded in the execution report.
- Browser-specific decision and rationale: Required because dynamic scroll, focus-visible, native Enter/Space, localization, mounted DOM count, and disclosure state are material user-surface acceptance criteria.

## Desktop Application Validation Decision

- Desktop framework / shell: Electron-wrapped Nuxt renderer.
- Relevant README or development instructions: `autobyteus-web/README.md`, `ARCHITECTURE.md`.
- Web-equivalent behavior: Event Monitor projection consumption, feed rendering, scroll, focus, localization, disclosure, copy removal.
- Shell-specific or lifecycle behavior: None changed.
- Chosen validation approach: browser development renderer first; actual Electron execution is not justified because no preload/IPC/window/package boundary changed.
- Effect on any already-running desktop application: None; owned ports/temp data only.
- Behavior not directly proven: Electron packaging/native shell; `N/A` to changed scope and no confidence penalty.

## Live Environment And Fixture Plan

- Startup order and commands: create owned temp app data/fixtures; run focused GraphQL; if live HTTP required build/start backend on owned loopback port; run Nuxt on another owned loopback port; launch system Chromium.
- Environment choices: synthetic marker-only data, local loopback, headless Chromium, 1280x900 plus narrow viewport, English and zh-CN.
- Health checks: GraphQL HTTP response; Nuxt route HTTP 200; browser no console/page errors.
- Seed data: standalone/team active+archive fixtures; >=5 MB/600 event fixture; browser mixed 100-event presentation and compaction rows.
- Authentication/session: none required for local web-equivalent probe.
- Journeys: `API-001`, `PERF-001`, `LIVE-001`, `BROWSER-001` pinned/non-pinned/jump, `BROWSER-002` locales/keyboard/no-live-region, `BROWSER-003` disclosure/rolling retention/copy absence.
- Evidence: exact commands/logs, aggregate counts/bytes/TTFB/total/hydration/usable time, screenshots, DOM/state metrics, file hashes, cleanup.
- Cleanup: terminate owned PIDs, close browser, remove temp app data and temporary Nuxt page/scripts; retain only non-sensitive evidence.

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| `PERF-001` | Generated >=5 MB/600-event temp fixture; live/in-process GraphQL and timing script | payload/count/TTFB/total and <2s reference result | Environment timing thresholds and giant raw fixture are unsuitable as a routine deterministic CI assertion. |
| `BROWSER-001` | Temporary Nuxt probe page + Playwright Core | pinned/non-pinned scroll, jump, DOM cap, composer usability | Repository has no general feature-browser fixture framework; temporary page avoids shipping test-only route. |
| `BROWSER-002` | Same browser in en/zh-CN, Tab/Enter/Space/focus checks | `AC-011` | Locale/layout evidence is appropriate as targeted broader validation; semantics remain durably component-tested. |
| `BROWSER-003` | Same browser with retained Thinking/tool cards before/after rolling replacement | disclosure and key/regroup risk | A stable product data-seeding E2E API does not exist for this feed state. |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Electron shell packaging/native lifecycle | No shell-specific change | Negligible | None. |
| Very large active team fan-out | Separate residual risk; task criterion is per-projection bound | Bounded multi-member latency remains | Future focus-lazy investigation only if measured evidence warrants. |
| Single giant individual event byte size | Explicit accepted residual risk | One card can still be expensive | Separate byte/detail design if observed. |

## Ambiguities Or Reroute Triggers

None at investigation time.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes` — add three focused paths; remove none.
- Post-repository confidence: Pending.
- Broader validation decision: `Required` — live API/performance plus browser.
- Reroute Required Before Validation Execution: `No`
- Recommended Recipient If Reroute Required: `N/A`
- Notes: Full Nuxt typecheck was rerun after the container memory increase and is no longer inconclusive. It completed with a 242-diagnostic repository baseline failure; this is preserved truthfully and is not treated as a pass. Repository behavior checks and broader live/browser validation passed.

---

## Investigation Round 2 — Latest-Base Integrated Candidate

### Round-2 Scope And Changed Boundary Delta

Round 2 reopens execution because merge `c13ba233a` composes the already-reviewed newest-100/revision spine with capabilities landed on the new base. The core server projection implementation is unchanged, but its prior evidence must be rerun against the integrated dependency/lockfile state. The frontend now forwards opt-in absolute-path actions from retained Markdown through the same bounded `AgentConversationFeed` and `AgentEventMonitor`, while team member-input echoes replace attachment arrays inside the same pre/post semantic-witness transaction.

| Integrated Boundary | Current Owner | Existing Durable Evidence | Validity Decision | Round-2 Action |
| --- | --- | --- | --- | --- |
| Active-only/newest-100 GraphQL and >=5 MB performance | Server recent projection/provider + prior API/E2E test | `recent-run-projection-graphql.e2e.test.ts` | Still Valid, but prior run not authoritative for merge | Rerun focused/expanded, live built-server HTTP, hashes and timing. |
| Bounded feed + semantic revision + non-pinned jump | `AgentConversationFeed.vue`, witness/commit, production dispatch | Prior durable suite and browser probe | Still Valid, integration-sensitive | Rerun complete prior frontend set and composed browser journey. |
| Explicit absolute-path Markdown action | `MarkdownRenderer` -> retained `AIMessage` -> feed -> `AgentEventMonitor` -> `useEventMonitorFilePreview` | Base tests cover parsing/opt-in/click; conflict tests cover forwarding | Still Valid; browser status/passive-arrival composition remains critical | Add to focused/expanded execution; use a temporary real-browser journey that asserts no effect/status on arrival, explicit activation only, localized host-only status. |
| Member echo attachment retention/refresh/dedupe | `userMessageProjection.ts` within team dispatcher transaction | Handler tests cover merge cases; witness tests cover attachment primitives | Still Valid but cross-owner revision outcome is not directly asserted | Add one durable production-dispatch test covering equal resulting presentation (no revision), executable refresh/removal (revision), unsupported retention and dedupe. |
| Non-live team replacement vs subscribed-live preservation | `teamRunOpenCoordinator` | Existing 6-test coordinator suite | Still Valid | Rerun. |
| Static/source integration | Merged Nuxt/lockfile and resolved production files | Implementation/reviewer typecheck/diff evidence | Context only | Rerun final Nuxt typecheck; classify baseline vs changed path; server build; final diff check. |

### Round-2 Durable Coverage Update

| Scenario ID | Path | Planned Change | Direct Requirement / Integration Risk |
| --- | --- | --- | --- |
| `LIVE-002` | `autobyteus-web/services/agentStreaming/__tests__/recentEventMonitorProductionDispatch.spec.ts` | Add production team-dispatch attachment-echo transaction assertions: unchanged retained unsupported presentation is revision-neutral; executable incoming attachment refresh/removal revises; repeated equal echo does not revise; unsupported item remains deduplicated. | Integrated member-echo merge must remain subordinate to exact central attachment witness values, not handler booleans/deep equality. |

No other durable test change is justified: absolute-path parsing, supported families, explicit click/keyboard emission, generic-renderer inertness, feed forwarding, and monitor capability are already directly covered by repository tests from the integrated base. The real composed status/passive-arrival behavior is better proven through targeted Chromium because it depends on dynamic import, renderer event propagation, status DOM, and scroll state.

### Round-2 Repository Execution Plan

1. Focused integrated frontend: feed, monitor, Markdown absolute-path policy/rendering, member handler, production dispatch, witness, commit, window, team reopen.
2. Expanded prior 19-file Event Monitor regression plus integrated attachment/action/context-presentation suites.
3. Server recent projection focused and expanded run-history suite.
4. Web/localization guards, server production build, final Nuxt typecheck and changed-path diagnostic audit.
5. `git diff --check` and preservation check confirming the reviewer-authored `code-review-report.md` remains the only upstream modification.

### Round-2 Broader Validation Decision

- Decision: `Required`.
- Modes: isolated live built-server GraphQL HTTP + real Chromium/Nuxt composed Event Monitor.
- Browser journey must prove in one mounted Event Monitor: retained Markdown absolute path is actionable; passive arrival produces no preview/status effect; explicit activation produces host-only status; non-pinned visible revision shows the same localized jump action without moving the viewport; Enter/Space activation jumps and clears; rolling presentation remains <=100.
- Live API must reprove >=5 MB / 620 active events, newest 100/order, payload, TTFB/total <2 s, and source hash preservation against the integrated build.
- Pre-execution round-2 confidence: `89.9%` overall; browser composition and cross-owner member-echo revision are the material gaps.
- Expected final confidence: >=95%, no category below 90%, if every planned gate passes.

### Round-2 Reroute Decision

- Requirement/design ambiguity: `No`.
- Design impact: `No`.
- Local fix anticipated: only a bounded durable test addition; no implementation change expected.
- Proceed to execution: `Yes`.

### Round-2 Repository Execution Results And Post-Repository Score

| Order | Command / Scope | Result | Evidence |
| --- | --- | --- | --- |
| 1 | New `LIVE-002` production-dispatch test | Pass — 1 file / 7 tests; both 1,001-message cases 500–563 ms | `evidence/api-e2e-round2/member-echo-focused.txt` |
| 2 | Focused integrated action/attachment/revision/window/reopen suite | Pass — 12 files / 109 tests | `evidence/api-e2e-round2/web-focused-integrated.txt` |
| 3 | Expanded integrated frontend suite | Pass — 29 files / 239 tests | `evidence/api-e2e-round2/web-expanded-integrated.txt` |
| 4 | Server run-history projection suite | Pass — 4 files / 13 tests; >=5 MB in-process projection 36.465 ms | `evidence/api-e2e-round2/server-run-history-integrated.txt` |
| 5 | Web/localization guards | Pass — all three, zero unresolved literals | `evidence/api-e2e-round2/web-guards-integrated.txt` |
| 6 | Server production build | Pass | `evidence/api-e2e-round2/server-build-integrated.txt` |
| 7 | Full Nuxt typecheck | Repository-baseline failure — 241 diagnostics; no diagnostic in the integrated/ticket production paths or updated durable test | `evidence/api-e2e-round2/nuxt-typecheck-final.txt` |
| 8 | Server package typecheck | Existing `TS6059` rootDir/test-include baseline; production build remains authoritative for changed server source | `evidence/api-e2e-round2/server-typecheck-final.txt` |

Post-repository scores: requirement proof 95%, directness 97%, integration realism 92%, fixture fidelity 96%, edge/lifecycle 97%, browser 87%, durable quality 97%; overall `94.4%`. Browser remains the only category below 90%, so the Required broader validation decision stands.

### Round-2 Broader Validation Results

- Live built server on owned port `31248`, isolated test SQLite/memory: 5,423,940-byte / 620-event fixture; 100 newest rows (`active-520` through `active-619`); 868,858-byte response; TTFB 30.5–61.5 ms; total 31.1–63.1 ms; active SHA-256 unchanged.
- Chromium/Nuxt composed `AgentEventMonitor`: 100 rows; 965 ms usable wall; passive retained Markdown arrival left revision 0 and produced no status; explicit activation alone produced the English host-only status; Space after zh-CN switch produced the Chinese status; the sole `aria-live` region was this explicit-action status.
- The same monitor retained the Markdown action and expanded Thinking disclosure through 25 rolling events; a non-pinned visible revision kept scrollTop 0 and exposed the localized jump; English Enter and zh-CN Space jumped/cleared; no copy control, console error, or page error occurred.
- Owned backend/Nuxt/Chromium resources and temporary route/scripts/data were cleaned up.
- Final expected score based on completed evidence: `97.0%`, with all applicable categories >=95%. Canonical final scoring and result are in the execution report.
