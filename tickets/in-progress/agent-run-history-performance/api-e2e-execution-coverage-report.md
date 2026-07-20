# API/E2E Execution Coverage Report

## Execution Round Meta

- Requirements Doc: `/home/autobyteus/workspace/.codex/worktrees/agent-run-history-performance/tickets/in-progress/agent-run-history-performance/requirements-doc.md`
- Investigation Notes: `/home/autobyteus/workspace/.codex/worktrees/agent-run-history-performance/tickets/in-progress/agent-run-history-performance/investigation-notes.md`
- Design Spec: `/home/autobyteus/workspace/.codex/worktrees/agent-run-history-performance/tickets/in-progress/agent-run-history-performance/design-spec.md`
- Supplemental Task Artifacts: `/home/autobyteus/workspace/.codex/worktrees/agent-run-history-performance/tickets/in-progress/agent-run-history-performance/history-window-ui-ux-spec.md`
- Design Review Report: `/home/autobyteus/workspace/.codex/worktrees/agent-run-history-performance/tickets/in-progress/agent-run-history-performance/design-review-report.md` (round 4 Pass)
- Implementation Handoff: `/home/autobyteus/workspace/.codex/worktrees/agent-run-history-performance/tickets/in-progress/agent-run-history-performance/implementation-handoff.md`
- Code Review Report: `/home/autobyteus/workspace/.codex/worktrees/agent-run-history-performance/tickets/in-progress/agent-run-history-performance/code-review-report.md` (round 2 Pass)
- Coverage Investigation: `/home/autobyteus/workspace/.codex/worktrees/agent-run-history-performance/tickets/in-progress/agent-run-history-performance/api-e2e-coverage-investigation.md`
- Current Execution Round: `1`
- Trigger: Source/architecture review Pass for implementation source commit `0b35f3c567f7411df514c5d2e5c5231bdd73e54e`.
- Prior Round Reviewed: `N/A`
- Latest Authoritative Round: `1`

## Round History

| Round | Trigger | Prior Unresolved Failures Rechecked | New Failures Found | Result | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Code-review Pass | N/A | One obsolete archive-recovery test premise; corrected to approved active-only semantics | Pass | Yes | Repository, live HTTP, and Chromium validation passed. |

## Investigation And Execution Basis

- Coverage investigation artifact: canonical path above.
- Investigation completed before durable coverage changes or final execution: `Yes`.
- Investigation plan followed: `Yes` — live API and browser probes used owned ports and synthetic temporary data. The README-documented `node dist/app.js --data-dir ... --host ... --port ...` startup was used.
- Existing coverage decisions revised during execution, with evidence: one existing GraphQL test expected archived tool-call arguments to repair an active result. That premise contradicts `REQ-001`; the scenario now verifies source-limited active-result behavior and exact-once projection.
- Reroute required before or during execution: `No`.
- Notes: after the container memory increase, full Nuxt typecheck completed instead of timing out. It still exits nonzero on 242 repository-baseline diagnostics; no diagnostic names a modified production file or either new frontend durable test.

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`.
- Compatibility-only or legacy-retention behavior observed in implementation: `No`.
- Approved persisted-data transition followed without unnecessary migration or version-specific runtime fallback: `Yes`.
- Durable coverage added or retained only for compatibility-only behavior: `No`.
- Compatibility reroute: `N/A`.
- Upstream recipient notified: `N/A`.

## Changed Boundary And Evidence Matrix

| Scenario ID | Behavior / Requirement / Acceptance-Criteria IDs | Changed Boundary | Execution Surface / Mode | Evidence Type | Result | Evidence / Artifact |
| --- | --- | --- | --- | --- | --- | --- |
| API-001 | Active-only standalone/team projection, no archive I/O, newest 100/order, bytes unchanged (`AC-001`, `AC-002`, `AC-008`, `AC-010`) | Filesystem -> provider -> GraphQL | Real temp memory/metadata/files and in-process schema | Durable | Pass | `evidence/api-e2e/server-run-history.txt`; new GraphQL test |
| API-002 | Active result at archive boundary remains exact-once and source-limited (`REQ-001`) | Existing tool lifecycle GraphQL | In-process schema | Durable | Pass | `evidence/api-e2e/server-stale-test-update.txt` |
| PERF-001 | >=5 MB / 620 active events, bounded payload and <=2 s (`AC-009`) | Live Fastify/Mercurius HTTP | Owned server port 31247 and `curl` | Live | Pass | 5,422,080-byte live fixture; 100 rows; 868,855 bytes; TTFB 26.6–52.6 ms; total 27.1–53.1 ms; `live-http-*.txt/json` |
| LIVE-001 | 1,001 mixed live messages each for standalone and team; center/Activity <=100; no duplicate stable IDs (`AC-003`, `AC-004`) | Production dispatch -> state/window/Activity | Vitest with production dispatch methods | Durable | Pass | `evidence/api-e2e/web-focused.txt`; `recentEventMonitorProductionDispatch.spec.ts` |
| SEM-001 | Exact MP-CR-001 and MP-AR-003 neutral; true visible derivation revises (`AC-005`, AR-003, CR-001) | Production standalone/team dispatch -> semantic commit | Vitest | Durable | Pass | `evidence/api-e2e/web-expanded.txt`; 6-test production-dispatch spec plus 35-test witness suite |
| TEAM-001 | Non-live replacement resets revision; subscribed-live reuse preserves conversation/revision (`CR-002`) | Team run reopen/coordinator | Vitest | Durable | Pass | `teamRunOpenCoordinator.spec.ts` within `evidence/api-e2e/web-expanded.txt` |
| UI-001 | Thinking collapsed by default and explicitly toggled (`AC-006`) | Disclosure component | Vue component test | Durable | Pass | `ThinkSegment.spec.ts`; `evidence/api-e2e/web-focused.txt` |
| BROWSER-001 | 100 mounted rows, rolling retention, non-pinned viewport, jump focus/activation, composer usable (`AC-003`, `AC-005`, `AC-009`) | Real Nuxt feed in Chromium | Browser | Pass | 929 ms usable; stable scrollTop 0 before/after visible append; Enter jumps to bottom; browser metrics/screenshot |
| BROWSER-002 | English/zh-CN labels; native focus, Enter/Space; visible focus; no token live region (`AC-011`) | Localization + browser accessibility | Browser | Pass | `evidence/api-e2e/browser-probe.txt`, screenshot, metrics |
| BROWSER-003 | Thinking/tool interaction survives rolling retention; no copy control (`AC-006`, `AC-007`) | Production feed/renderers under rolling state | Browser | Pass | Browser probe and screenshot; expanded component suite |
| REG-001 | Standalone/team/submission/hydration/feed/tool/activity regressions | Cross-frontend changed paths | 19 relevant Nuxt files | Durable | Pass | 19 files / 174 tests, `evidence/api-e2e/web-expanded.txt` |

## Additional Repository Coverage Execution

The coverage investigation contains the authoritative complete command table. No additional repository behavior suite was required after the post-repository score. The Nuxt typecheck was rerun after broader validation only to remove the earlier memory-timeout uncertainty.

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| 1 | `timeout 600s corepack pnpm exec nuxt typecheck` | `autobyteus-web`, after temporary browser page removal | Full repository static check under increased memory | Fail — repository baseline: 242 diagnostics; no modified production/new-test diagnostic | `evidence/api-e2e/nuxt-typecheck-final.txt` |
| 2 | `git diff --check` | worktree | Patch whitespace/structural integrity | Pass | Final command recorded below |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | Change | New / Final Supporting Evidence | Residual Uncertainty |
| --- | ---: | ---: | ---: | --- | --- |
| Requirement and acceptance-criteria proof | 93% | 97% | +4 | Live timing and Chromium complete AC-009/AC-011 proof | Single giant event remains accepted risk |
| Changed-boundary execution directness | 96% | 98% | +2 | Actual Fastify/GraphQL HTTP and production Nuxt component | No real websocket server was required for deterministic dispatch semantics |
| Cross-boundary integration realism and mock gap | 91% | 95% | +4 | Real process/serialization/browser renderer added | Backend payload and UI probe were separate deterministic journeys |
| Environment, configuration, identity, and fixture fidelity | 95% | 97% | +2 | README startup, isolated app data, standalone/team identities, real Chromium | Reference hardware is this container only |
| Failure, edge-case, lifecycle, and recovery evidence | 96% | 97% | +1 | Rolling retention/disclosure and live replacement branches | Extreme multi-member fan-out not required |
| User-surface, browser, and desktop-shell confidence | 86% | 95% | +9 | Chromium scroll/focus/locale/keyboard/disclosure/no-copy evidence | Electron shell untested because unchanged |
| Durable regression coverage quality and relevance | 96% | 97% | +1 | Three focused additions, one stale correction, expanded suites | Browser probe is temporary rather than CI-resident |

- Overall post-repository confidence: `93.3%`.
- Overall final confidence: `96.6%`.
- Calculation method: simple average of seven applicable categories, rounded to one decimal.
- Confidence change produced by broader validation: `+3.3 percentage points`.
- Every critical acceptance criterion directly proven: `Yes`.
- Any final applicable category below `90%`: `No`.
- Default final confidence target of `95%` met: `Yes`.
- Confidence-limiting residual risks: one exceptionally large individual event can still produce an expensive card; multi-member team fan-out is not a per-projection acceptance criterion; repository-wide static baselines remain red outside this task.

## Broader Validation Decision And Execution

- Decision and selected execution mode from the coverage investigation: `Required` — Live API + Browser.
- Material deviation from planned mode or rationale: None. Browser used a temporary probe route with production components; backend used the built server and README command.
- Confidence gap addressed: live serialization/timing, real mounted row bound, scroll anchoring, keyboard focus, locale strings, disclosure retention, and absence of copy/live-region controls.
- Startup/readiness: built server -> synthetic temp data -> server on 127.0.0.1:31247 -> `/rest/health` HTTP 200 -> three GraphQL queries; Nuxt on 127.0.0.1:31173 -> HTTP route -> Chromium probe. All owned processes were stopped.
- Environment choices: Node 22.23.1, loopback only, isolated temp app data/SQLite/memory, no secrets, system Chromium, 1280x900, en-US then zh-CN.
- Seed/session: 620 deterministic user traces with 8,600-byte padding; mixed 100-row browser conversation retaining mutable Thinking/tool cards; no authentication needed.

| Scenario / Journey Step | Expected Observable Result | Actual Observable Result | Evidence | Result |
| --- | --- | --- | --- | --- |
| Live GraphQL warm/cold requests | 100 newest rows and <=2 s | 100 rows (`active-520`..`active-619`), 0 Activity; total 27.1–53.1 ms | curl metrics + response summary | Pass |
| Live source integrity | Projection is read-only | Active SHA-256 identical before/after | response summary | Pass |
| Initial browser hydration | <=100 DOM rows, usable <=2 s | 100 rows; ready 859.5 ms; wall 929 ms | browser metrics | Pass |
| Rolling retention/disclosure | Still 100; retained Thinking stays expanded; tool stays keyboard-operable | Assertions passed after 25 appended rows | browser probe | Pass |
| Non-pinned visible/no-op mutations | No-op adds no jump; visible change adds localized jump without moving viewport | No jump for no-op; scrollTop stayed 0 | browser probe | Pass |
| English activation | Focus visible; Enter jumps/clears | outline width 2px; scrolled to bottom | metrics | Pass |
| zh-CN activation | Correct label; Space jumps/clears | `有新动态 · 跳到最新` found and cleared | browser probe | Pass |
| Accessibility/removal | No streaming `aria-live`; no copy control | Both selectors absent | browser probe | Pass |

## Desktop Application Validation (When Applicable)

- Validation approach: web-equivalent Nuxt renderer in real Chromium.
- Browser-tested behavior: feed rendering, retention, scroll/jump, focus, locale, disclosure, copy removal.
- Shell-specific/lifecycle evidence: not executed; no Electron preload, IPC, packaging, window, or native lifecycle boundary changed.
- Effect on any already-running desktop application: `None`; owned ports and temporary data only.
- Confidence consequence: none for the changed renderer behavior; shell confidence is intentionally scoped out.

## Platform / Runtime Targets

- Platform: Linux ARM64 container.
- Runtime/framework: Node 22.23.1; Nuxt 3.21.1; Vue 3.5.28; Vite 7.3.1; Fastify/Mercurius built server.
- Browser: Chromium 149.0.7827.196 via Playwright Core.
- Browser settings: 1280x900, en-US context, in-app switch to zh-CN, UTC host timezone.

## Lifecycle / Upgrade / Restart / Persisted-Data Checks

- Approved persisted-data decision: `Directly Usable — No Migration`.
- Representative data: manifest-less active-only provider fixtures plus standalone/team active+rotated-archive+manifest GraphQL fixtures.
- Result: direct projection succeeded; archive-only markers excluded; read instrumentation observed active path and excluded archive/manifest paths; SHA-256 values remained unchanged.
- Migration-specific evidence: `N/A`; no feature migration exists or ran against projection fixtures.
- Version-specific branch/dual read-write/compatibility fallback observed: `No`.
- Residual persisted-data risk: none beyond malformed/corrupt files already outside the approved criterion.

## Tests Implemented Or Updated

| Path / Scenario | Change | Requirement / Boundary | Execution Result | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/run-history/recent-run-projection-graphql.e2e.test.ts` | Added | `API-001`, `AC-001/002/008/009/010` | Pass, 2 tests | Real temp files/stores/schema; archive I/O spies and hashes |
| `autobyteus-web/services/agentStreaming/__tests__/recentEventMonitorProductionDispatch.spec.ts` | Added | `LIVE-001`, `SEM-001`, `AC-003/004/005` | Pass, 6 tests | 1,001 messages on each dispatch path; material premises |
| `autobyteus-web/components/conversation/segments/__tests__/ThinkSegment.spec.ts` | Added | `UI-001`, `AC-006` | Pass, 1 test | Native disclosure collapsed/expand/collapse |
| `autobyteus-server-ts/tests/e2e/run-history/run-projection-toolcalls-graphql.e2e.test.ts` | Updated | `API-002`, active-only source limit | Pass, 7-file scenario suite overall | Removes obsolete archive-recovery expectation only |

## Tests Removed As Stale Or Obsolete

No test file was removed. The obsolete cross-file assertion was updated in place and replaced by source-limited active-result assertions plus archive-I/O coverage.

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage changed: `Yes`.
- Paths added/updated: the four paths listed above.
- Paths removed: none.
- Added/updated paths attached for proportional test-code review: `Yes`.

## Other Execution Artifacts

| Artifact Path | Type / Purpose | Retained Or Temporary | Notes |
| --- | --- | --- | --- |
| `tickets/in-progress/agent-run-history-performance/evidence/api-e2e/server-run-history.txt` | Expanded backend log/metrics | Retained | 4 files / 13 tests; in-process 37.637 ms |
| `.../evidence/api-e2e/web-expanded.txt` | Expanded frontend log | Retained | 19 files / 174 tests |
| `.../evidence/api-e2e/live-http-curl-metrics.txt` | Live timing | Retained | Three HTTP measurements |
| `.../evidence/api-e2e/live-http-response-summary.json` | Live payload/hash summary | Retained | No raw content retained |
| `.../evidence/api-e2e/browser/event-monitor-browser-metrics.json` | Browser state/performance | Retained | No console/page errors |
| `.../evidence/api-e2e/browser/event-monitor-browser-en-zh.png` | Final browser screenshot | Retained | Synthetic content only |
| `.../evidence/api-e2e/nuxt-typecheck-final.txt` | Static baseline evidence | Retained | 242 baseline diagnostics, exit 1 |
| `.../evidence/api-e2e/server-build.txt` | Production build evidence | Retained | Pass |

## Temporary Execution Methods / Scaffolding

| Path / Method | Why Needed | Result / Evidence | Cleanup Result |
| --- | --- | --- | --- |
| Temporary Nuxt probe page and Playwright script | Deterministic production-feed state without shipping a test-only route | Browser metrics/screenshot | Removed |
| `/tmp/autobyteus-api-e2e-live-*` app data | Isolated built-server GraphQL fixture | HTTP metrics/summary | Removed |
| Owned backend/Nuxt processes on 31247/31173 | Real process/browser execution | Server/Nuxt logs | Stopped; no matching process remains |
| Temporary raw HTTP response/query files | Parse aggregate count/order/hash | Response summary | Removed |

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| LLM/providers | Not invoked; deterministic stored run and protocol messages | Feature consumes run history/stream events, not provider generation | None for changed boundary |
| WebSocket transport in durable stress spec | Production dispatcher invoked directly | Deterministic 1,001-message state semantics; no socket framing change | Socket lifecycle itself unchanged and not claimed |
| Electron shell | Nuxt renderer in Chromium | Shell boundary unchanged | None for web-equivalent acceptance criteria |

## Prior Failure Resolution Check

`N/A` for round 1. The stale existing assertion found during this round was corrected and its focused plus expanded suites passed before final execution.

## Result Summary

| Result | Scenario IDs | Summary / Reason |
| --- | --- | --- |
| Pass | API-001, API-002, PERF-001, LIVE-001, SEM-001, TEAM-001, UI-001, BROWSER-001/002/003, REG-001 | All changed behavioral and critical acceptance paths passed. |
| Fail (baseline/non-task) | STATIC-001 | Nuxt full typecheck reports 242 repository-baseline diagnostics; server package typecheck has existing TS6059 configuration failure. Production server build passes and no diagnostic names modified production/new-test files. |
| Not Tested / Out of scope | Electron shell packaging, extreme team fan-out, giant single event | No changed shell boundary; accepted residuals. |

## Cleanup Performed

| Resource / Process / Data | Ownership | Cleanup Action | Result |
| --- | --- | --- | --- |
| Backend port 31247 process | API/E2E-owned | SIGINT | Stopped |
| Nuxt port 31173 process | API/E2E-owned | SIGINT | Stopped |
| Chromium | API/E2E-owned | `browser.close()` | Closed |
| Synthetic live app data/SQLite/memory | API/E2E-owned | Recursive removal after aggregate evidence | Removed |
| Temporary Nuxt route/probe/query/response | API/E2E-owned | Removed | Removed |
| Existing server on port 8000/user data | User-owned | Not modified or stopped by final isolated run | Preserved |

Isolation note: an initial backend-start attempt inherited the container's `DATABASE_URL` and performed a read-only "no pending migrations" check against the existing production database. It was stopped before any projection request. The authoritative live run explicitly unset inherited app/database/memory variables, created `/tmp/.../db/test.db`, and served every measured request from owned temporary data.

## Classification

No failure requiring rework. Repository-wide typecheck failures are pre-existing baseline/configuration issues and are truthfully retained as residual evidence, not attributed to this task.

## Recommended Recipient

`code_reviewer` for proportional review of the four durable test-code paths.

## Evidence / Notes

- Source under test: implementation commit `0b35f3c567f7411df514c5d2e5c5231bdd73e54e` plus API/E2E-owned durable test changes.
- No user content, credentials, or raw synthetic 5 MB response was retained.
- `git diff --check` passes at finalization.

## Latest Authoritative Result

- Result: `Pass`.
- Final validation confidence: `96.6%`.
- Default `95%` confidence target met: `Yes`.
- Any final applicable confidence category below `90%`: `No`.
- Broader validation decision: `Required and completed` — Live API + Browser.
- Critical acceptance criteria lacking direct proof: `None`.
- Required next recipient: `code_reviewer` for proportional test-code review.
- Notes: durable test changes are ready for review; repository static baselines remain red outside the changed paths.
