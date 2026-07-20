# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-mermaid-error-layout-overflow/tickets/done/event-monitor-mermaid-error-layout-overflow/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-mermaid-error-layout-overflow/tickets/done/event-monitor-mermaid-error-layout-overflow/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-mermaid-error-layout-overflow/tickets/done/event-monitor-mermaid-error-layout-overflow/design-spec.md`
- Supplemental Task Artifacts: `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-mermaid-error-layout-overflow/tickets/done/event-monitor-mermaid-error-layout-overflow/mermaid-body-leak-probe.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-mermaid-error-layout-overflow/tickets/done/event-monitor-mermaid-error-layout-overflow/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-mermaid-error-layout-overflow/tickets/done/event-monitor-mermaid-error-layout-overflow/implementation-handoff.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-mermaid-error-layout-overflow/tickets/done/event-monitor-mermaid-error-layout-overflow/code-review-report.md`
- Current Investigation Round: 1
- Trigger: source review pass for commit `752937fb149196ac98f73776db5545e3a1267256`
- Prior Investigation Reviewed: retained Mermaid body-leak probe and implementation-stage coverage claims; no prior API/E2E execution report exists for this ticket
- Latest Authoritative Investigation: this file

## Current Requirement And Design Basis

The reviewed fix changes the existing Mermaid vendor boundary to initialize Mermaid with `suppressErrorRendering: true`, so invalid parse/render promises still reject but Mermaid does not append fallback error SVGs or wrappers to `document.body`. `MermaidDiagram` remains the owner of the localized error state and now bounds its root/card/message with local min/max-width, overflow, and wrapping styles. Valid diagrams must still render inline, open the existing viewer, restore focus, and forward links. Repeated invalid renders, content updates, and unmounts must not accumulate body nodes. Rendering failures must not navigate, call external-link handling, access the backend, or mutate persistence. The application viewport/feed scroll ownership must remain unchanged.

The requirement basis is REQ-MER-001 through REQ-MER-006 and AC-MER-001 through AC-MER-007, with BEH-MER-001 through BEH-MER-006. The retained body-leak probe is evidence, not durable API/E2E coverage.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-MER-001 / REQ-MER-001/002 | Changed | Service suppression and MermaidDiagram catch path | Real Mermaid browser/JSDOM failure must show rejection, unchanged body, and local error card |
| BEH-MER-002 / REQ-MER-003 | Preserved through safety fix | Shell/feed containment sources and design | Measure document/viewport geometry and scroll surfaces after failures; do not mask body overflow |
| BEH-MER-003 / REQ-MER-004 | Preserved | MermaidDiagram/viewer source and existing tests | Run valid inline/viewer/focus/link regression in browser and repository suites |
| BEH-MER-004 / AC-MER-007 | Changed | renderGeneration and unmount lifecycle | Repeat invalid renders, update invalid/valid content, and unmount while settled; inspect no accumulated body nodes |
| BEH-MER-005 / REQ-MER-005 | Preserved | No router/backend/Electron/persistence path changed | Trace URL, request, websocket, external-link, and persistence boundaries in targeted browser probe |
| BEH-MER-006 / REQ-MER-006 | Added containment | MermaidDiagram CSS and component tests | Use narrow browser viewport and bounding rectangles to verify wrapping/no horizontal expansion |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | No | No backend/domain change | None needed | None | None |
| API / transport / contract | No direct change | No request/response or route change | No API-specific Mermaid path | Browser may still accidentally trigger request | Browser request trace |
| Frontend component / state | Yes | Mermaid service initialization, component local error state/CSS | 4 files/18 tests and changed TS pass | Mocked service tests do not exercise real vendor body mutation | Real browser page |
| Browser integration / user journey | Yes | Markdown Mermaid child failure and layout | Retained JSDOM probe; no product browser run yet | Actual DOM, viewport, scroll, and lifecycle uncertain | Playwright Core temporary probe |
| Authentication / session / permissions | No | Not involved | N/A | None | None |
| Desktop renderer / web-equivalent UI | Yes | Shared Vue/Nuxt Mermaid renderer | Nuxt prepare and component tests | Browser CSS geometry not proven by JSDOM | Nuxt dev + Playwright |
| Desktop shell / Electron-specific integration | Indirect/preserved | Same renderer in Electron; no shell code changed | Electron/TS checks to run | Packaged Electron bundle may differ in runtime config | Electron decision or package check |
| Process / lifecycle | Yes at component lifecycle | render generation, content watch, unmount | MermaidDiagram unit tests | Real repeated update/unmount can leak if vendor side effects differ | Browser lifecycle probe |
| Persisted-data transition | No | DOM/render-only transient state | Handoff says Not Affected | None | None |
| Worker / queue / distributed coordination | No | None | N/A | None | None |
| External integration | No direct change | Mermaid vendor library is the relevant embedded dependency | Real Mermaid 11.12.3 probe | Future dependency/version drift | Installed-version browser probe |

## Project Execution Discovery

- Assigned task worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-mermaid-error-layout-overflow`
- Project type/runtime: pnpm workspace; Nuxt 3/Vue 3 frontend; Vitest with JSDOM/happy-dom; Playwright Core executable probes; Electron 42.4.1; Mermaid 11.12.3
- Repository instructions: no `AGENTS.md` found in the worktree ancestry; package scripts, ticket artifacts, and existing E2E probes are the applicable instructions
- Required environment variables/secrets: None for Mermaid DOM behavior; no authentication or backend fixture needed

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `autobyteus-web/package.json` | Frontend test/build/guard scripts | `test:nuxt`, `test:electron`, `build`, `transpile-electron`, `guard:web-boundary`, `guard:localization-boundary`, `audit:localization-literals`, `dev`, `generate:electron` |
| `autobyteus-web/tests/e2e/diagram-zoom-viewer-probe.mjs` | Project-owned self-starting browser probe | Starts Nuxt, installs a temporary page, uses Playwright Core, records evidence/screenshots, and cleans up owned process/page |
| `autobyteus-web/tests/e2e/workspace-responsive-probe.mjs` | Responsive/layout executable coverage | Existing shell probe; relevant as regression context but not sufficient for Mermaid body leak |
| Current `task.md`, `design-spec.md`, and implementation handoff | Approved behavior/owner constraints | Use browser DOM/geometry, preserve viewer/link/focus, no global body-overflow workaround, no data path changes |
| `autobyteus-web/electron/tsconfig.json` and Electron Vitest config | Shell boundary | Run validator and TypeScript checks; packaged execution is a separate decision |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Frontend dependencies | worktree root | `pnpm install --offline --frozen-lockfile --ignore-scripts` only if needed | Ignored node_modules; avoid cross-worktree symlinks | `node_modules` resolves current worktree | Retain ignored setup or remove only task-owned temp |
| Nuxt dev renderer | worktree root | `pnpm --dir autobyteus-web exec nuxt dev --host 127.0.0.1 --port 3330` | Temporary Mermaid page installed under `autobyteus-web/pages` | Local URL/Nitro ready signal | Ctrl-C; remove temporary page |
| Existing viewer probe | `autobyteus-web` | `pnpm run test:e2e:diagram-zoom-viewer -- --port=3331 --output-dir=...` | Probe owns its temporary page and Nuxt process | Probe evidence JSON and exit code | Probe cleanup; remove output if not retained |
| Playwright Core | `autobyteus-web` | Required by existing probe or temporary browser script | Prefer `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome` if available | Browser opens local Nuxt page | Close browser/context |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Invalid/repeated Mermaid content | Temporary Nuxt page with `MermaidDiagram` instances | No backend/auth/data access | Remove page after probe; retain log/evidence |
| Valid Mermaid/viewer content | Existing `diagram-zoom-viewer-probe.mjs` fixture | Self-starting and task-owned | Probe cleans page/process; retain evidence |
| Backend/persistence | Not needed | Browser request trace confirms no unexpected request from failure path | No cleanup |

## Persisted Data Transition Coverage Basis

- Approved decision: `Not Affected`
- Design/handoff references: requirements Persisted Data Outcome; implementation handoff Persisted Data Transition Check
- Representative existing-data setup: N/A; Mermaid state is transient DOM/component state and no conversation content is modified
- Evidence planned: source/review checks, repository regressions, browser request/URL tracing
- Migration/recovery scenarios: N/A
- Upstream ambiguity/reroute: None

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Acceptance Criteria | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/services/__tests__/mermaidService.spec.ts` | Service initializes Mermaid with suppression and retains render/validate facade | REQ-MER-001; AC-MER-001/005 | Still Valid | Focused source review says pass | Re-run; no change |
| `autobyteus-web/components/conversation/segments/renderer/__tests__/MermaidDiagram.spec.ts` | Loading/error state, long-message containment classes, valid SVG, viewer, focus, stale generation, link exclusion, unmount | REQ-MER-002/004/006; AC-MER-002/004/006/007 | Still Valid | Focused source review says pass | Re-run; no change |
| `autobyteus-web/components/conversation/segments/renderer/__tests__/MermaidDiagramViewer.spec.ts` | Modal actions, zoom/pan/focus, close, link forwarding | REQ-MER-004/005; AC-MER-004/005 | Still Valid | Focused source review says pass | Re-run; no change |
| `autobyteus-web/components/conversation/segments/renderer/__tests__/mermaidDiagramViewport.spec.ts` | Geometry/zoom safety and bounded extents | REQ-MER-003/006; AC-MER-003/006 | Still Valid | Focused source review says pass | Re-run; no change |
| `autobyteus-web/tests/e2e/diagram-zoom-viewer-probe.mjs` + fixture | Real browser valid Mermaid SVG/viewer/zoom/link/focus/viewport lifecycle | REQ-MER-003/004/005/006; AC-MER-003/004/005/006 | Still Valid | Existing project-owned executable probe | Execute and retain evidence |
| Retained `mermaid-body-leak-probe.md` and disposable JSDOM probe | Reproduces vendor body leak and suppression | REQ-MER-001/003; AC-MER-001/003/007 | Still Valid as evidence; not durable product E2E | Pre-implementation reproduction | Re-run current revision with a temporary real Mermaid probe |
| `autobyteus-web/tests/e2e/workspace-responsive-probe.mjs` | Shell viewport/scroll and responsive regressions | REQ-MER-003; AC-MER-003 | Still Valid as adjacent regression | Existing project probe | Run only if environment cost is bounded; Mermaid-specific probe is primary |

## Stale Or Obsolete Coverage Decisions

None. No existing test asserts the removed vendor fallback body behavior. The retained probe is evidence and is not a stale product test.

## Durable Coverage To Add / Update / Remove

- Add durable coverage: None in this source-fix round. Existing durable unit/component/viewer coverage is already present and no durable API/E2E test file was requested by implementation review.
- Update durable coverage: None; execute existing tests and temporary browser probes. If a browser probe becomes a stable project convention, record it as a separate downstream implementation request rather than changing scope here.
- Remove durable coverage: None.

## Repository Coverage Execution Plan And Results

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| 1 | `pnpm --dir autobyteus-web exec nuxt prepare` | web | Generated current Nuxt config/types | Pass | `api-e2e-r1-nuxt-prepare.log` |
| 2 | Focused 4-file Mermaid service/component/viewer/viewport Vitest | web | Direct changed behavior and preserved viewer/geometry | Pass — 4 files / 18 tests | `api-e2e-r1-focused.log` |
| 3 | Broad Mermaid/Markdown/conversation regression suites | web | Composition and valid-message regression | Pass — 11 files / 60 tests | `api-e2e-r1-broad.log` |
| 4 | Electron local/shell checks and changed-scope TS | web | Shared renderer/shell boundary | Pass — 27 files / 119 tests; Electron TS pass | `api-e2e-r1-electron.log`, `api-e2e-r1-electron-tsc.log` |
| 5 | localization audit/guards/web boundary/diff check | web/current commit | Guard integrity | Pass | `api-e2e-r1-guards.log` |
| 6 | Real Mermaid 11.12.3 JSDOM suppressed-render probe | web/temporary script | No body mutation after rejected invalid render, repeated failures | Pass — suppressed body stayed unchanged; unsuppressed control leaked | `api-e2e-r1-real-mermaid-probe.log` |
| 7 | Existing `diagram-zoom-viewer-probe.mjs` | web self-starting browser | Valid SVG/viewer/focus/link/geometry regression | Pass — 8 browser scenarios | `api-e2e-r1-valid-viewer/` |
| 8 | Temporary invalid/repeat/update/unmount browser page | Nuxt + Playwright Core | Body children, scroll dimensions, local error, wrapping, no URL/request effects | Pass — 5 browser scenarios | `api-e2e-r1-invalid-browser/` |

## Post-Repository Confidence Scorecard

| Confidence Category | Score | What Supports The Score | Remaining Uncertainty | Additional Validation |
| --- | ---: | --- | --- | --- |
| Requirement and acceptance-criteria proof | 96% | Focused/broad tests plus real invalid and valid browser journeys cover local error, no leak, wrapping, lifecycle, valid viewer, focus/link, and no side effects | Exact production malformed payload and packaged runtime are not directly exercised | User/package validation only if those residuals become material |
| Changed-boundary execution directness | 96% | Real Mermaid 11.12.3 probe and real Nuxt/Chrome renderer execute the changed service/component boundary | Browser uses a temporary page rather than authenticated production feed | Durable authenticated journey is not required for this renderer-local change |
| Cross-boundary integration realism and mock gap | 94% | Nuxt dev renderer, installed Mermaid, Playwright Core, real SVG/viewer, URL/request trace, and production build all pass | No backend was started; unrelated health calls were filtered from the safety assertion | None material to the changed boundary |
| Environment/configuration/fixture fidelity | 93% | Current worktree install, Nuxt 3.21.1, Mermaid 11.12.3, Chrome 150, 390px viewport, and production build | Packaged Electron and Windows were not run | Preserve as bounded residual |
| Failure/edge/lifecycle/recovery evidence | 97% | Long invalid text, three concurrent errors, repeat update, unmount/remount, valid-to-invalid update, and real vendor suppressed/unsuppressed comparison pass | Future Mermaid-version drift is not covered | Keep installed-version probe on dependency changes |
| User-surface/browser/desktop-shell confidence | 95% | Real Chrome invalid geometry/outer-scroll and existing 8-scenario viewer/focus/link/viewport probe pass; Electron suite/TS pass | Packaged Electron launch and Windows geometry remain unproven | User/package validation if release risk warrants |
| Durable regression coverage quality/relevance | 95% | Existing durable 4-file changed-scope suite and 11-file regression suite remain valid; no durable test changes were needed | Body-leak browser journey remains temporary by design | Consider durable promotion only if malformed-render behavior becomes a recurring regression |

- Overall post-repository confidence: 96% (simple average of the seven scores, rounded)
- Every critical acceptance criterion directly proven: Yes for the reviewed web-equivalent scope
- Applicable categories below 90%: No
- Default 95% clean target met: Yes
- Material residual risks: exact production malformed source, packaged Electron/native launch, Windows runtime, and authenticated production-feed composition; these are bounded residuals because the changed boundary is shared web renderer code and repository Electron/TS/build checks pass

## Broader Validation Decision

- Decision: `Required` — completed
- Selected execution mode: Browser + temporary real-Mermaid probe + existing valid-viewer probe; Electron shell validation only if it materially adds evidence without taking over the user's desktop
- Confidence gap addressed: vendor body mutation in a real renderer, outer document/viewport geometry, local error wrapping, repeated lifecycle cleanup, valid viewer regression, and no navigation/request side effects
- Why selected mode materially improves confidence: these are DOM/layout/vendor-renderer behaviors that mocks cannot prove; the project already provides an owned Playwright Core probe pattern
- Actual confidence after validation: 96%
- Browser-specific decision: Required; browser is the authoritative web-equivalent surface for this change
- Desktop-specific decision: Repository Electron checks plus browser renderer are likely sufficient; packaged Electron remains a residual unless current package build can be run safely
- If Blocked: exact missing dependency would be a browser executable or ability to start Nuxt; current worktree contains Playwright Core and existing self-starting probes, so setup should be attempted before declaring blocked

## Desktop Application Validation Decision

- Framework/shell: Electron 42.4.1 sharing the Nuxt/Vue renderer
- Web-equivalent behavior: Mermaid service/component rendering, local error, body cleanup, geometry, viewer/focus/link behavior
- Shell-specific behavior: packaged bundle uses same source; no Electron API is in the changed boundary
- Chosen approach: browser first; run Electron validator/TS and make a targeted package decision rather than launching an uncontrolled desktop app
- Existing application impact: None; only task-owned dev server/browser/processes
- Behavior not directly proven by browser: packaging/native startup; record as residual if not run

## Live Environment And Fixture Plan

- Startup order: generate Nuxt config; create temporary invalid Mermaid page; start Nuxt on task-owned port; wait for route/app readiness; run Playwright invalid probe; remove page; run existing valid viewer probe separately; stop owned processes
- Environment: current worktree dependencies, Mermaid lockfile 11.12.3, task-owned ports/output directories; no backend/auth/database
- Readiness: Nuxt local URL, page test marker, local Mermaid error count and valid SVG/viewer controls
- Seed/fixtures: one temporary page with three invalid diagrams, long invalid error, valid diagram, toggle/update/unmount controls; existing valid viewer fixture
- Evidence: JSON scenario results, screenshots, console/pageerror/request logs, body child IDs, document/viewport dimensions, URL
- Cleanup: temporary page removed; dev server/browser processes terminated; output retained as report evidence

## Temporary Executable Validation Plan

| Scenario ID | Probe / Runtime Setup | Behavior Proven | Why Temporary |
| --- | --- | --- | --- |
| MER-E2E-INVALID-001 | Temporary Nuxt page with one invalid MermaidDiagram; Playwright waits for error | No body fallback, local error, no viewer | No authenticated fixture or stable dedicated browser harness; source fix narrow |
| MER-E2E-INVALID-002 | Three invalid diagrams + rerender/update/unmount/re-add | No accumulation, stable body/scroll metrics, lifecycle cleanup | Disposable stress journey for this ticket |
| MER-E2E-INVALID-003 | Narrow viewport and long invalid parser content | Root/message bounds and wrapping/no horizontal document expansion | Browser geometry is environment-specific; durable unit styles already cover classes |
| MER-E2E-VALID-001 | Existing `diagram-zoom-viewer-probe.mjs` | Valid SVG/viewer/zoom/focus/link and source updates | Existing project probe is sufficient; no new durable file needed |
| MER-E2E-SAFETY-001 | Browser request/URL trace while invalid state updates | No navigation/backend/external side effect | Temporary instrumentation only |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up |
| --- | --- | --- | --- |
| Packaged Electron/native launch | Shell boundary unchanged and actual package may be costly | Browser-equivalent proof does not prove packaging | Targeted package decision; user validation if material |
| Windows runtime | Current host is macOS | Platform-specific Mermaid DOM behavior likely low but unproven | Windows CI/user validation only if packaging exposes risk |
| Exact production malformed source | Original source unavailable | Probe uses equivalent invalid text, not exact input | Preserve as known limitation |
| Backend/persistence effects | No path is called by Mermaid failure | Low; browser request trace should confirm | Browser trace; no backend setup needed |

## Ambiguities Or Reroute Triggers

None currently. A browser assertion failure should be routed to `code_reviewer` for focused failure-origin analysis; a test-harness/environment failure returns to this role for local execution fix.

## Investigation Decision

- Proceed to API/E2E execution: Yes
- Durable coverage added/updated/removed: No planned
- Post-repository confidence: 96%
- Broader validation: Required and completed
- Reroute before execution: No
- Notes: Repository checks and real Mermaid invalid-lifecycle/valid-viewer browser probes passed. Preserve packaged, Windows, exact-production-input, and authenticated-feed residuals truthfully.
