# API/E2E Execution Coverage Report — Background Agent Renderer Contention

## API-REV-003 Current Authoritative Result — Pass (2026-08-10)

- Trigger: `CRR-008` source-review Pass for IR-006 (`f0aa52702c96dafc1d24cef5b9292a05ffb914a9`; reviewed HEAD `1d6d9f2da40d30b9ef95faa04cf82a12b8e67d1f`).
- Prior result: `API-REV-002 Fail / 77.1%`.
- Current result: **Pass / 98.9%**.
- Prior critical failure: `API-F-001 / WORKSPACE-BOOT-001` (AC-007, AC-009, Directly Usable — No Migration).
- Prior-failure resolution: **Resolved on the exact formerly failing fresh real-data browser/backend boundary and independently corroborated against the active Electron backend.**
- Durable coverage changed in API-REV-003: `No`.
- Broader validation decision: `Required — completed`.
- Required recipient: `code_reviewer` for proportional test-code review (`Not Applicable` expected because no API/E2E-owned durable test changed), then delivery routing.

### Execution Order And Results

The mandatory coverage-investigation update preceded execution. `WORKSPACE-BOOT-001` was the first behavioral scenario; setup-only secret/package verification did not exercise product behavior.

| Order / Scenario | Exact execution mode or command | Expected | Observed | Result |
| --- | --- | --- | --- | --- |
| setup / `SECRET-IMPORT-003` | `pnpm secrets:import -- --source /Users/normy/.autobyteus/server-data/.env --database-url file:/tmp/autobyteus-api-rev-003-home-20260810T1010/.autobyteus/server-data/db/production.db --overwrite`; direct TTY `IMPORT` | owned real-data snapshot has required configured keys without exposing values | 19 migrations present / 0 pending; 9 secret identifiers replaced; no values recorded | Pass |
| setup / `AGENT-PACKAGE-003` | isolated backend package/team catalog inspection | requested package and Classroom teams available | `/Users/normy/autobyteus_org/autobyteus-agents`; 7 shared agents, 54 team-local agents, 13 teams, Classroom Simulation Team and Nested Classroom Test Team present | Pass |
| **1 / `WORKSPACE-BOOT-001`** | current branch backend `63931` + current branch Nuxt `63932` + new owned safe SQLite/data snapshot; real Chrome `/workspace` plus same-origin GraphQL assertions | all 26 returned workspaces visible immediately; no false empty state | API 26 workspaces / 18 history groups / 79 agent runs; UI exactly 26 visible workspace rows; `No run history yet.` absent | **Pass** |
| 2 / `WORKSPACE-BOOT-002` | current branch Nuxt `63933` -> active `/Applications/AutoByteus.app` backend `29695` -> `/Users/normy/.autobyteus/server-data`; real Chrome/read-only | all active-data workspaces visible immediately | API 26 workspaces / 28 history groups / 79 agent runs / 184 team runs; UI exactly 26 visible workspace rows; false empty state absent | **Pass** |
| `WORKSPACE-BOOT-002-RELOAD` | second full navigation to the same renderer/backend boundary | catalog survives a fresh reload | 26/26 visible rows again; first `2026-05-25-roma-fuqi-church`, last `Temp Workspace` | Pass |
| `NAV-STARTUP-003` | `pnpm test:nuxt --run components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.spec.ts components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.regressions.spec.ts composables/__tests__/useWorkspaceHistoryTreeState.spec.ts stores/__tests__/runHistoryStore.spec.ts stores/__tests__/runHistoryNavigationProjection.spec.ts` | empty-cache-to-populated-catalog ownership and affected navigation remain exact | 5 files / 126 tests | Pass |
| `WS-STATUS-003` | `pnpm test --run tests/integration/agent/agent-team-websocket.integration.test.ts tests/integration/agent/agent-status-websocket.integration.test.ts tests/unit/services/agent-streaming/agent-stream-websocket-egress.test.ts tests/unit/agent-execution/events/lifecycle-status-event-transformer.test.ts` | real standalone/team socket, cadence, canonical companions, transition-only UI statuses remain exact | 4 files / 57 tests | Pass |
| `FRONT-AFFECTED-003` | prior 28-file affected Nuxt matrix; exact command in log header | projection, Event Monitor, open/hydration, hierarchy/focus, input, voice remain correct | 28 files / 345 tests | Pass |
| `BG-BROWSER-000–007` | `pnpm test:e2e:background-contention -- --output-dir ../tickets/in-progress/background-agent-renderer-contention/api-e2e-execution-evidence/api-rev-003/background-contention-browser` | correctness and responsiveness stay inside approved limits | all scenarios green; 26/38 topology, latest-100 exact, hierarchy/focus exact, desktop/mobile/file/paste/voice green | Pass |
| `BUILD-GUARD-003` | `pnpm guard:web-boundary`; `pnpm guard:localization-boundary`; `pnpm audit:localization-literals`; `pnpm build` | structural boundaries and production web build green | all commands exited 0 | Pass |

### Real Browser And Performance Evidence

- **Fresh workspace startup:** the exact API-REV-002 failure is reversed without migration or manual registration. Both the owned current-branch backend and the active Electron backend returned 26 workspaces, and the current branch renderer produced exactly 26 visible workspace rows on initial navigation. The active-backend reload repeated 26/26.
- **Aggregate Files/Teams responsiveness:** 260 cadence windows / 520 dispatches in 6.5 seconds; p95 `6.9 ms` versus idle `6.7 ms` (`1.03×`); topology delta `0`; no long task.
- **One-run comparison:** p95 `7.1 ms` versus idle `6.7 ms` (`1.06×`).
- **Paste-to-placeholder:** aggregate p95 `7.6 ms` versus idle `8.0 ms`; 160 windows / 320 dispatches; topology delta `0`; no long task.
- **Voice fake-media:** aggregate click-to-Starting p95 `5.9 ms`; click-to-Recording p95 `32.5 ms`; both well under the acceptance bounds.
- **Correctness:** exact latest-100 (`retained-10` through `retained-109`), stable/task-agent/task-team hierarchy and focus, detail-only zero topology rebuild, repeated status zero presentation/navigation work, mobile 390 px controls/layout all passed.

### API-REV-003 Confidence Scorecard

| Category | Score | Evidence / residual uncertainty |
| --- | ---: | --- |
| Requirement and acceptance-criteria proof | 99% | All AC-001–AC-010 remain directly green; the only critical API-REV-002 failure passed twice on realistic boundaries. |
| Changed-boundary execution directness | 100% | Exact current panel/store code executed from a fresh real browser through current GraphQL/backend state. |
| Cross-boundary integration realism and mock gap | 99% | Real Chrome + current backend + active Electron backend + real data; deterministic load remains synthetic by design. |
| Environment/configuration/identity/fixture fidelity | 99% | Safe copy of user data with required secret import/package verification plus read-only active-data corroboration. |
| Failure, edge-case, lifecycle, and recovery evidence | 98% | Exact failure, independent corroboration, full reload, sockets, open/recovery/lazy hydration, and cleanup are green. |
| User-surface/browser/desktop-shell confidence | 99% | Real Chrome directly proves the web-equivalent renderer against the active Electron backend; prior actual-Electron shell smoke remains valid because IR-006 did not change shell code. |
| Durable regression coverage quality/relevance | 98% | IR-006 real store/panel composition test covers the missing transition; retained durable browser/socket coverage passed. No new API/E2E test edit was necessary. |

- Overall confidence: **98.9%** (simple average, rounded to one decimal).
- Default 95% target met: `Yes`.
- Any category below 90%: `No`.
- Critical acceptance criterion failing or unproven: `No`.
- Residual risk: actual packaged candidate was not relaunched because IR-006 is a web-equivalent renderer-only change and the user-owned app could not be disrupted. The prior actual-Electron shell evidence remains applicable; this round directly used its active backend and real data.

### Durable Coverage And Routing

- API/E2E-owned repository-resident durable coverage added: `None`.
- API/E2E-owned repository-resident durable coverage updated: `None`.
- API/E2E-owned repository-resident durable coverage removed: `None`.
- Existing retained coverage validity: `Still Valid`; the IR-006 source commit already contains the focused durable regression.
- Production source changed by API/E2E: `No`.
- Successful routing: return the cumulative package to `code_reviewer`; proportional test-code review should record `Not Applicable` for this round, then delivery may resume.

### Cleanup And Evidence

- Owned browser tabs closed; owned frontends on `63932`/`63933` and owned backend on `63931` stopped.
- Owned real-data snapshot `/tmp/autobyteus-api-rev-003-home-20260810T1010` removed.
- Owned ports `63931–63933` verified free. The user-owned Electron backend on `29695` remained listening and was never stopped or modified.
- Evidence directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/background-agent-renderer-contention/tickets/in-progress/background-agent-renderer-contention/api-e2e-execution-evidence/api-rev-003`.
- Key files: `isolated-real-data-browser-summary.json`, `active-electron-backend-browser-summary.json`, `active-electron-backend-reload-summary.json`, corresponding screenshots, `workspace-navigation-matrix.log`, `server-focused-real-ws.log`, `frontend-affected.log`, `background-contention-browser/evidence.json`, `build-guards.log`, `source-diff-check.log`, `secret-import.log`, `package-team-catalog.json`, and `cleanup.log`.

## API-REV-002 Historical Result — Fail (2026-08-10)

- Trigger: user-reported delivered Electron startup with no visible workspaces after `DR-002`.
- Prior result: `API-REV-001 Pass / 98.4%`.
- Current result: `Fail / 77.1%`.
- Critical failing scenario: `WORKSPACE-BOOT-001` (AC-007, AC-009, Directly Usable — No Migration).
- Corroborating scenario: `WORKSPACE-BOOT-002` against the already-running Electron backend and the user's actual `/Users/normy/.autobyteus/server-data`.
- Durable coverage changed in API-REV-002: `No`.
- Required recipient: `code_reviewer` for focused failure-origin review. Delivery is not authorized to finalize the ticket from the superseded API-REV-001 Pass.

### What Was Executed

| Scenario | Exact execution mode | Expected | Observed | Result |
| --- | --- | --- | --- | --- |
| `WORKSPACE-BOOT-002` | reviewed branch Nuxt frontend on `63901` -> active `/Applications/AutoByteus.app` backend on `29695` -> `/Users/normy/.autobyteus/server-data` | existing workspace rows on fresh `/workspace` | API: 26 workspaces, 28 history groups, 79 agent runs, 184 team runs; UI: zero rows and `No run history yet.` | **Fail** |
| `WORKSPACE-BOOT-001` | reviewed branch backend on `63911` + frontend on `63902`; owned SQLite snapshot and copied workspace/history indexes | existing workspace rows on fresh `/workspace` | API: 26 workspaces and 18 history groups; UI: zero rows and `No run history yet.` | **Fail** |
| `SECRET-IMPORT-002` | `pnpm secrets:import -- --source /Users/normy/.autobyteus/server-data/.env --database-url file:/tmp/autobyteus-api-rev-002-home-20260810T0956/.autobyteus/server-data/db/production.db --overwrite`; direct TTY confirmation `IMPORT` | isolated test vault configured | 9 named secret identifiers replaced; 19 migrations found, zero pending; no values recorded | Pass |
| `AGENT-PACKAGE-002` | isolated GraphQL package import/list and team catalog | requested package and Classroom team available | import returned `already exists`; catalog confirms requested path, 7 shared agents, 54 team-local agents, 13 teams, and both Classroom definitions | Pass |
| `ELECTRON-PROVENANCE-002` | SHA-256/stat/process inspection | active installed app equals DR-002 candidate | active `/Applications` asar `14e4...b90a`; DR-002 candidate asar `a4a9...adf`; active app is older and not the candidate | Mismatch |

### Direct Failure Trace

1. `WorkspaceAgentRunsTreePanel` renders before its asynchronous `workspaceStore.fetchAllWorkspaces()` completes.
2. The IR-005 `runHistoryStore.getTreeNodes()` implementation sees a null cached navigation projection and seeds it from the then-empty workspace catalog.
3. The workspace API later returns 26 entries, but the panel's mount path never refreshes the cached navigation topology.
4. Subsequent reads see a non-null projection and keep returning the stale empty `workspaceNodes` array.
5. `origin/personal` dynamically rebuilt the tree from reactive workspace state; task commit `d1c48db5a` replaced that read with the cached projection without adding this initialization/invalidation edge.

This is a preliminary **implementation-source defect** in the new cached run-navigation initialization contract, with a durable-coverage gap: the panel test asserts that eager history fetch is absent but does not model the workspace store transitioning from initially empty to API-populated after the cache's first read.

### API-REV-002 Confidence Scorecard

| Category | Score | Evidence / limitation |
| --- | ---: | --- |
| Requirement and acceptance-criteria proof | 50% | AC-007/AC-009 and direct-use startup fail critically. |
| Changed-boundary execution directness | 100% | Exact reviewed store/component path reproduced in a real browser. |
| Cross-boundary integration realism and mock gap | 100% | Real GraphQL, real workspace catalog, real current backend, and isolated branch backend agree. |
| Environment/configuration/identity/fixture fidelity | 95% | Actual user data was read through the active Electron backend; isolated copy used required secret/package setup. The DR-002 app itself could not bind its fixed `29695` without disrupting the user-owned running app. |
| Failure, edge-case, lifecycle, and recovery evidence | 50% | Fresh boot fails; no fix exists yet to validate reload/recovery. |
| User-surface/browser/desktop-shell confidence | 95% | The web-equivalent renderer failure is direct and matches the user's Electron report. The active installed app is not the DR-002 artifact. |
| Durable regression coverage quality/relevance | 50% | Existing tests missed the empty-to-populated initialization transition; no API/E2E-owned test was changed before failure review. |

- Overall confidence: `77.1%` (simple average).
- Default 95% target met: `No`.
- Any category below 90%: `Yes`.
- Critical acceptance criterion failing: `Yes`.
- Broader validation decision: `Required — completed to a conclusive failure`.

### API-REV-002 Evidence

- `/Users/normy/autobyteus_org/autobyteus-worktrees/background-agent-renderer-contention/tickets/in-progress/background-agent-renderer-contention/api-e2e-execution-evidence/api-rev-002/active-electron-backend-browser-summary.json`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/background-agent-renderer-contention/tickets/in-progress/background-agent-renderer-contention/api-e2e-execution-evidence/api-rev-002/isolated-real-data-browser-summary.json`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/background-agent-renderer-contention/tickets/in-progress/background-agent-renderer-contention/api-e2e-execution-evidence/api-rev-002/electron-artifact-provenance.json`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/background-agent-renderer-contention/tickets/in-progress/background-agent-renderer-contention/api-e2e-execution-evidence/api-rev-002/source-failure-trace.txt`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/background-agent-renderer-contention/tickets/in-progress/background-agent-renderer-contention/api-e2e-execution-evidence/api-rev-002/isolated-real-data-secret-import-authoritative.log`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/background-agent-renderer-contention/tickets/in-progress/background-agent-renderer-contention/api-e2e-execution-evidence/api-rev-002/cleanup.log`
- Browser screenshots: `branch-frontend-real-data-no-workspaces.png`; `isolated-real-data-no-workspaces.png`.

## API-REV-001 Historical Execution Round Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/background-agent-renderer-contention/tickets/in-progress/background-agent-renderer-contention/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/background-agent-renderer-contention/tickets/in-progress/background-agent-renderer-contention/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/background-agent-renderer-contention/tickets/in-progress/background-agent-renderer-contention/design-spec.md`
- Supplemental Task Artifacts: `performance-evidence.md`; `probe-evidence/`
- Solution Revision Record: `solution-revision-record.md` (`SR-004`)
- Design Review Report: `design-review-report.md`
- Architecture Review Revision Record: `architecture-review-revision-record.md` (`ARCH-REV-004`)
- Implementation Handoff: `implementation-handoff.md`
- Implementation Revision Record: `implementation-revision-record.md` (`IR-005`)
- Code Review Report: `code-review-report.md`
- Code Review Revision Record: `code-review-revision-record.md` (`CRR-005`)
- Delivery Revision Record: `N/A`
- Coverage Investigation: `api-e2e-coverage-investigation.md`
- API/E2E Revision Record: `api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- Current Execution Round: `1`
- Trigger: CRR-005 Pass for source implementation commit `81a8e8b64aad0fd2253081fe9a94f88e3a9ffa46`; reviewed clean HEAD `242b466d8497be1a00f65594df4503d40092a73c`
- Prior Round Reviewed: `N/A`
- Latest Authoritative Round: `API-REV-001`

## Investigation And Execution Basis

- Coverage investigation artifact: `/Users/normy/autobyteus_org/autobyteus-worktrees/background-agent-renderer-contention/tickets/in-progress/background-agent-renderer-contention/api-e2e-coverage-investigation.md`
- Investigation completed before durable coverage changes or final execution: `Yes`
- Investigation plan followed: `Yes`, with one evidence-strengthening addition requested by the user: a real DeepSeek Classroom Simulation Team run using the requested secret import and agent package.
- Existing coverage decisions revised during execution: the retained standalone WebSocket scenario was valid but five duplicate-status count assertions were stale. Its first unchanged run was intentionally executed first and preserved. The scenario was updated in place to the approved transition-only UI projection while retaining canonical subscriber proof.
- Reroute required before or during execution: `No`
- Notes: no production source was changed by API/E2E. Durable coverage did change, so the Pass must return through proportional test-code review.

## Compatibility / Legacy Scope Check

- Requirements/design introduce backward compatibility in scope: `No`
- Compatibility-only behavior observed in implementation: `No`
- Approved persisted-data transition followed: `Yes — Directly Usable / No Migration`
- Durable coverage added only for compatibility behavior: `No`
- Reroute classification: `N/A`
- Upstream recipient notified: `Pending this handoff to code_reviewer`

## Changed Boundary And Evidence Matrix

| Scenario ID | Behavior / IDs | Changed Boundary | Execution Surface / Mode | Evidence Type | Result | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| `WS-STATUS-001` | exact initial/transition-only status, canonical companions, reconnect, errors; FR-001/005, AC-001/007/008/009 | shared server presentation egress | real Fastify standalone and team WebSockets plus canonical subscriber | Durable / API | Pass | `ws-status-first-corrected.log`; `server-focused-and-real-ws.log` |
| `EGRESS-CONTROL-001` | filter/scheduler/observer composition; FR-007, AC-010 | typed egress controls | server unit + integration | Durable | Pass | `server-focused-and-real-ws.log` |
| `FRONT-EFFECTS-001` | explicit no-op/content/structural mutation effects; FR-002, AC-002/003 | production stream projectors/Event Monitor | Nuxt/Vitest production composition | Durable | Pass | `frontend-affected.log` |
| `NAV-PRIME-001` | one topology build, stable hierarchy/focus, final prime ownership/recovery/lazy history; FR-003/005, AC-002/003/007/009 | run-history projection/open/hydration | Nuxt/Vitest + rendered Chrome | Durable / Browser | Pass | `frontend-affected.log`; final browser evidence |
| `BG-BROWSER-000` | exact 26-workspace/38-team topology | production Pinia/projectors/components | Chrome | Durable / Browser | Pass | `background-contention-browser-final-pass/evidence.json` |
| `BG-BROWSER-001A/B/C` | idle, one-run, twenty-run aggregate-equivalent Files/Teams responsiveness; AC-004 | renderer event loop | Chrome | Durable / Browser | Pass | same evidence: `7.6/7.0/7.1 ms` p95, aggregate `0.934×` idle |
| `BG-BROWSER-002` | CONNECTED/repeated-status zero work; AC-002/003 | projector + navigation + Event Monitor | Chrome | Durable / Browser | Pass | same evidence |
| `BG-BROWSER-003` | exact latest-100; AC-003/007 | Event Monitor retention | Chrome | Durable / Browser | Pass | exact `retained-10`…`retained-109` |
| `BG-BROWSER-004` | collapsed/unfocused stable/task-agent/task-team hierarchy, focus, detail no-navigation; AC-002/007/009 | rendered navigation | Chrome desktop | Durable / Browser | Pass | same evidence and screenshot |
| `BG-BROWSER-005A/B` | delayed-upload paste placeholder; AC-006 | composer/event loop | Chrome | Durable / Browser | Pass | `8.1 ms` idle, `7.8 ms` aggregate p95 |
| `BG-BROWSER-006A/B` | fake-media Starting/Recording; AC-005 | media/composer/event loop | Chrome | Durable / Browser | Pass | Starting `6.2 ms`, Recording `24.5 ms` aggregate vs `31.1 ms` idle |
| `BG-BROWSER-007` | mobile controls/layout | mobile renderer | Chrome 390×844 | Durable / Browser | Pass | same evidence and screenshot |
| `TEAM-PRESENT-001` | existing rendered collapse/expand/activity presentation | workspace/team navigation | Chrome | Browser | Pass | `team-activity-presentation/evidence.json` |
| `ELECTRON-SMOKE-001` | actual Electron/preload/embedded server, native file bridge, aggregate file/panel and fake-media voice; AC-004/005/009 | desktop shell + renderer | actual unpackaged Electron 42 via CDP, isolated generated port/data | Desktop | Pass | `electron-contention-smoke.json`; screenshot/log |
| `REAL-CLASSROOM-001` | real provider/package/team streaming, files/tools/handoffs, live responsiveness, history selection; AC-004/007/009 | full frontend/backend/provider | real `deepseek-v4-flash` Classroom team in Chrome | Live / Browser | Pass | `real-classroom-validation-summary.json` and referenced raw evidence |
| `BUILD-GUARD-001` | production build, runtime dependencies, source guards | build boundaries | project commands | Durable | Pass | `build-guards-diff.log`; `electron-prepare-transpile.log` |

## Additional Repository Coverage Execution

All planned repository executions are authoritative in the updated investigation. No later corrective repository rerun was required after broader validation.

## Validation Confidence Scorecard

| Confidence Category | Post-Repository | Final | Change | Final Supporting Evidence | Residual Uncertainty |
| --- | ---: | ---: | ---: | --- | --- |
| Requirement and acceptance-criteria proof | 92% | 99% | +7 | all AC-001–AC-010 mapped to green durable/live/desktop evidence | aggregate-equivalent, not 20 external providers, as approved |
| Changed-boundary execution directness | 95% | 99% | +4 | real sockets, Chrome event loop, actual Electron | none material |
| Cross-boundary integration realism and mock gap | 90% | 98% | +8 | real Fastify/WebSocket, Electron embedded server, real DeepSeek team | deterministic stress source is synthetic by design |
| Environment/configuration/identity/fixture fidelity | 90% | 98% | +8 | isolated migrations, requested vault import/package/team/provider, exact topology | fake device for deterministic voice timing |
| Failure, edge-case, lifecycle, recovery | 94% | 98% | +4 | reconnect/error/terminal, recovery/lazy hydration, history reselect, cleanup | higher-scale parser/worker deliberately deferred |
| User-surface/browser/desktop-shell confidence | 82% | 99% | +17 | desktop/mobile Chrome, actual Electron/preload/file bridge/fake media, real UI | physical-device prompts are device-origin and were not needed |
| Durable regression quality/relevance | 97% | 98% | +1 | corrected socket contract and repeatable browser probe | proportional test-code review pending |

- Overall post-repository confidence: `91.4%`
- Overall final confidence: `98.4%`
- Calculation: simple average of seven applicable categories.
- Confidence change: `+7.0 percentage points`
- Every critical acceptance criterion directly proven: `Yes`
- Any final category below 90%: `No`
- Default 95% target met: `Yes`
- Confidence-limiting residual risks: only accepted/out-of-scope items—aggregate-equivalent rather than 20 live providers; no physical microphone prompt; much-higher-scale JSON parsing deferred.

## Broader Validation Decision And Execution

- Decision: `Required — completed`
- Selected modes: real WebSocket integration, durable Chrome, actual Electron, and user-directed real-provider Classroom UI.
- Material plan deviation: the initial plan said secrets were unnecessary. The user explicitly requested a real provider run, so an isolated vault import and agent-package/team import were added. No shared data was used.
- Startup order:
  1. real WebSocket regression and broader repository suites;
  2. durable Chrome contention probe and retained team presentation probe;
  3. isolated real backend/database, secret import, agent-package import, real Classroom UI;
  4. prepared server resources, transpiled Electron, isolated actual Electron shell;
  5. terminate owned runs/processes and remove owned data.
- Environment choices: ports `63362`/`63712` for Classroom and `63372`/CDP `63375` for Electron; isolated SQLite/HOME/user-data; current user app on `29695` untouched.
- Identity/fixture: `Classroom Simulation Team`, professor/student, `deepseek-v4-flash`, requested package path, a file-backed `17 × 6` exchange, exact marker.

| Journey Step | Expected | Actual | Evidence | Result |
| --- | --- | --- | --- | --- |
| Import secrets | value-free identifiers stored in isolated vault | 9 identifiers configured; no values printed | `real-classroom-secret-import-success.log` | Pass |
| Import package/team | Classroom team available from requested package | 7 shared agents, 54 team-local agents, 13 teams; Classroom discovered | import/discovery JSON | Pass |
| Run team through UI | real professor/student/tool/file exchange | 298 received frames, 2 send handoffs, 9 successful tools, exact marker in 14.27 s | validation summary, final screenshot, backend log | Pass |
| Live foreground navigation | no application-origin delay | 20 Files/Team switches, p95 `39.69 ms` | validation summary | Pass |
| Supported history reselect | persisted professor content/tools/thinking/file remain | exact marker, Thinking, `run_bash`, `send_message_to`, answer file visible | history follow-up JSON/screenshot | Pass |
| Durable aggregate browser | exact 40 windows/80 dispatches per second without global rebuild | 260/520, topology `0`, p95 `7.1 ms`, no long tasks | durable browser evidence | Pass |
| Electron shell | actual Electron/preload/server/file/media behavior green | all 14 assertions true | Electron JSON/screenshot/log | Pass |

The initial direct reload of an **unregistered temporary workspace** displayed `No run history yet`. That extra assertion is preserved in `real-classroom-ui-evidence.json`. The supported desktop flow explicitly registers a filesystem workspace before scoped history is loaded; the follow-up used that UI path and passed all persistence/reselection assertions. It is not hidden or cited as a successful direct-reload assertion.

## Desktop Application Validation

- Approach: actual Electron 42 dev runtime using production-prepared embedded server resources and worktree Nuxt renderer, connected via CDP.
- Browser-tested web-equivalent behavior: full aggregate hierarchy/navigation/paste/voice suite in Chrome.
- Shell-specific evidence: Electron UA, preload bridge, isolated embedded server status, exact native `readLocalTextFile`, fake media under load, no renderer errors.
- User application effect: `None`. Port `29695` remained listening throughout.
- Safety technique: only ignored transpiled `dist/shared/embeddedServerConfig.js` was temporarily changed from `29695` to `63372`, backed up, and restored. Repository source was never modified.
- Unproven shell behavior: real hardware permission prompt/device variance; classified device-origin rather than application scheduling risk.

## Platform / Runtime Targets

- OS: macOS arm64, Europe/Berlin host.
- Node: v22 for repository/browser probes; Electron runtime Node v24.16.0.
- Frontend: Nuxt 3.21.1, Vue 3.5.28, Pinia production stores.
- Browser: installed Google Chrome for durable/real UI; Electron 42.4.1 / Chrome 148.0.7778.265.
- Viewports: desktop `1440×1000`; mobile `390×844`; locale `en-US`.
- Backend: built TypeScript server with SQLite and 19 current migrations.

## Lifecycle / Upgrade / Restart / Persisted-Data Checks

- Approved decision: `Directly Usable — No Migration`.
- Representative data: current event/hierarchy projection, active/reconnect paths, real Classroom stored conversation/tool/team messages, workspace history and file-backed artifacts.
- Result: current readers rehydrated exact persisted content after normal workspace registration and team-member reselection. No migration or compatibility fallback was introduced.
- Version-specific branch/dual read-write observed: `No`.
- Residual risk: none material for the approved transition.

## Tests Implemented Or Updated

| Path / Scenario | Change | Requirement | Result | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/integration/agent/agent-status-websocket.integration.test.ts` | Updated | AC-001/008/009 | 7/7; broader server 57/57 | transition-only socket plus canonical companion proof |
| `autobyteus-web/tests/e2e/background-agent-renderer-contention-probe.mjs` | Added | AC-002–007/009 | Pass | repeatable real-browser metrics/evidence/cleanup |
| `autobyteus-web/tests/e2e/fixtures/background-agent-renderer-contention.page.vue` | Added | AC-002–007/009 | Pass | production source composition, 26/38 topology |
| `autobyteus-web/package.json` script | Updated | FR-006/AC-009 | Pass | adds `test:e2e:background-contention` |

## Tests Removed As Stale Or Obsolete

None. Only stale assertions inside the retained real-WebSocket scenario were replaced.

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage changed: `Yes`
- Added/updated paths: the four paths listed above.
- Paths removed: `None`
- Added/updated paths attached for proportional test review: `Yes`
- Removed-path evidence: `N/A`

## Other Execution Artifacts

| Artifact | Purpose | Status |
| --- | --- | --- |
| `api-e2e-execution-evidence/background-contention-browser-final-pass/` | authoritative durable Chrome JSON/screenshots/Nuxt log | retained |
| `api-e2e-execution-evidence/real-classroom-validation-summary.json` | concise authoritative real-provider result | retained |
| `api-e2e-execution-evidence/real-classroom-ui-evidence.json` | raw core UI run plus non-green direct-reload diagnostic | retained |
| `api-e2e-execution-evidence/real-classroom-ui-history-followup.json` | supported history registration/reselection proof | retained |
| `api-e2e-execution-evidence/electron-contention-smoke.json` | actual Electron shell metrics/assertions | retained |
| `api-e2e-execution-evidence/owned-team-run-termination.json` | GraphQL termination evidence | retained |
| `api-e2e-execution-evidence/cleanup.log` | ports/data/generated-state cleanup | retained |

## Temporary Execution Methods / Scaffolding

| Method | Why Needed | Result | Cleanup |
| --- | --- | --- | --- |
| real Classroom driver/history follow-up scripts in evidence directory | user-specific external-provider and persisted UI evidence | Pass | browsers closed; scripts retained only as evidence |
| Electron CDP smoke driver | shell-specific proof without disrupting user app | Pass | app/server/CDP stopped; temp tree deleted |
| ignored generated Electron port override | fixed production port `29695` was user-owned | Pass on `63372` | original generated file restored |
| temporary Nuxt route installed from durable fixture | expose fixture inside Electron renderer | Pass | removed |

## Dependencies Mocked Or Emulated

| Dependency | Method | Rationale | Limitation |
| --- | --- | --- | --- |
| aggregate background providers | exact production projectors receive deterministic 40 windows/s across 20 targets | repeatable performance/structural proof | not 20 independent provider networks |
| browser voice hardware | Chromium/Electron fake media device | deterministic app scheduling/capture proof | excludes hardware/OS prompt variability |
| fixture-only backend queries | structured route stubs where the deterministic fixture does not need backend data | isolate renderer changed boundary | closed by real socket, actual Electron server, and real Classroom evidence |

The real Classroom scenario did **not** mock the LLM provider, team runtime, WebSocket, tool execution, files, persistence, or GraphQL creation/history path.

## Result Summary

| Result | Scenario IDs | Summary |
| --- | --- | --- |
| Pass | `WS-STATUS-001`, `EGRESS-CONTROL-001`, `FRONT-EFFECTS-001`, `NAV-PRIME-001`, `BG-BROWSER-000–007`, `TEAM-PRESENT-001`, `ELECTRON-SMOKE-001`, `REAL-CLASSROOM-001`, `BUILD-GUARD-001` | all approved critical behavior and metrics passed |
| Not Tested / accepted | 20 independent external providers; higher-scale parsing/worker; physical microphone prompt | aggregate-equivalent target is approved; other items are deferred/device-origin | no critical acceptance gap |

## Cleanup Performed

| Resource | Ownership | Action | Result |
| --- | --- | --- | --- |
| API-created and UI-created Classroom team runs | API/E2E | GraphQL terminate | both success |
| Classroom Nuxt/backend and Electron/CDP/backend | API/E2E | stopped owned sessions | ports `63362`, `63712`, `63372`, `63375` free |
| isolated Classroom DB/vault/workspaces | API/E2E | deleted whole temp tree | removed; imported secrets deleted |
| isolated Electron HOME/DB/user-data | API/E2E | deleted whole temp tree | removed |
| generated Electron port override | API/E2E | restore backup | restored to `29695` |
| temporary Nuxt route | API/E2E | removed | removed |
| current user Electron/backend | user | deliberately untouched | still listening on `29695` |

## Preliminary Classification

- Result: `Pass`
- Classification: `N/A — no implementation failure`
- Required review: proportional review of changed durable test/fixture/package-script code.

## Recommended Recipient

`code_reviewer`

## Evidence / Notes

- The unchanged WebSocket regression's initial 2-pass/5-fail result is intentionally retained and accurately classified as stale expectations, not an implementation failure.
- A first backend setup attempt inherited ambient `DATABASE_URL`; it was stopped before mutation and corrected to explicit isolated storage. The failed non-TTY secret import correctly demanded `IMPORT`. Neither attempt is cited as green proof.
- Secret evidence contains identifiers/counts only, not values.
- Repository-wide known typecheck baselines are not claimed green.

## Latest Authoritative Result

- Revision: `API-REV-003`.
- Result: `Pass`.
- Final validation confidence: `98.9%`.
- Default 95% target met: `Yes`.
- Any category below 90%: `No`.
- Broader validation: `Required — completed`.
- Critical acceptance criteria failing or unproven: `None`.
- Resolved failure: `API-F-001 / WORKSPACE-BOOT-001`.
- Required next recipient: `code_reviewer` for proportional test-code review (`Not Applicable` expected because API-REV-003 changed no durable test code), then delivery routing.
- Notes: API-REV-003 supersedes the API-REV-002 failure. No repository-resident durable coverage changed in API-REV-003, and all owned runtime resources were cleaned up.
