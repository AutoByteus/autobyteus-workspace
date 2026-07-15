# API/E2E Execution Coverage Report

## Execution Round Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-full-width/tickets/in-progress/token-statistics-full-width/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-full-width/tickets/in-progress/token-statistics-full-width/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-full-width/tickets/in-progress/token-statistics-full-width/design-spec.md`
- Supplemental Solution Artifacts: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-full-width/tickets/in-progress/token-statistics-full-width/ui-ux-spec.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-full-width/tickets/in-progress/token-statistics-full-width/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-full-width/tickets/in-progress/token-statistics-full-width/implementation-handoff.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-full-width/tickets/in-progress/token-statistics-full-width/code-review-report.md`
- Coverage Investigation: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-full-width/tickets/in-progress/token-statistics-full-width/api-e2e-coverage-investigation.md`
- Current Execution Round: `1`
- Trigger: Source/architecture review passed commit `530587a707a48567d9bcf0a04736c091453f51fb` and requested API/E2E plus realistic browser execution.
- Prior Round Reviewed: `N/A`
- Latest Authoritative Round: `1`

## Round History

| Round | Trigger | Prior Unresolved Failures Rechecked | New Failures Found | Result | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Initial API/E2E execution | N/A | `BROWSER-002-RESIZE` | Fail | Yes | All other planned repository/build/browser scenarios passed or matched the unrelated baseline. |

## Investigation And Execution Basis

- Coverage investigation artifact: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-full-width/tickets/in-progress/token-statistics-full-width/api-e2e-coverage-investigation.md`
- Investigation completed before durable coverage changes or final execution: `Yes`
- Investigation plan followed: `Yes` — the successful production build was served directly instead of retaining the Nuxt development server because production static output gave the more stable and release-representative renderer surface. The changed evidence boundary was unchanged.
- Existing coverage decisions revised during execution: No. All relevant durable tests remain valid; none was added, updated, removed, or disabled.
- Reroute required before or during execution: `No` before execution; `Yes` after the live viewport-focus failure.
- Notes: The browser harness used the real production Nuxt/Vue/Pinia/Apollo/CSS renderer and local Chrome. Only the unchanged GraphQL backend responses and `/rest/health` were intercepted.

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No`
- Approved persisted-data transition followed without unnecessary migration or version-specific runtime fallback: `Yes`
- Durable coverage added or retained only for compatibility-only behavior: `No`
- If compatibility-related invalid scope was observed, reroute classification used: N/A
- Upstream recipient notified: N/A

## Changed Boundary And Evidence Matrix

| Scenario ID | Requirement / Acceptance-Criteria IDs | Changed Boundary | Execution Surface / Mode | Evidence Type | Result | Evidence / Artifact |
| --- | --- | --- | --- | --- | --- | --- |
| `REPO-001` | `AC-001`–`AC-005`, `AC-007`–`AC-014` | Page/component/model/store contracts | Focused Vitest | Durable | Pass | `execution-evidence/focused-vitest.log`: 9 files / 46 tests |
| `REPO-002` | `AC-014` | Frontend regression | Full Nuxt Vitest | Durable | Pass for changed scope; suite baseline Fail | `execution-evidence/full-nuxt-vitest.log`: 356 files / 1,878 tests passed; 4 unrelated baseline failures; 1 skipped |
| `REPO-003` | `AC-013`, `AC-014` | Electron shell regression | Electron Vitest | Durable | Pass | 23 files / 97 tests passed; 1 file / 1 test skipped |
| `BUILD-001` | `AC-013`, `AC-014` | Browser production renderer | `pnpm build` | Live/build | Pass | `execution-evidence/nuxt-build.log` |
| `BUILD-002` | `AC-013`, `AC-014` | Electron renderer/main/preload target | `pnpm generate:electron` | Desktop/build | Pass | `execution-evidence/electron-generate.log` |
| `BROWSER-001` | `AC-003`, `AC-005`, `AC-006` | 1440x900 collapse/table geometry | Production renderer, headless Chrome | Browser | Pass | `browser-validation-results.json`; `desktop-token-statistics-1440x900.png` |
| `BROWSER-002` | `AC-003`, `AC-004`, `AC-010` | Manual expand/collapse, ARIA, visible focus, 16rem layout | Production renderer, headless Chrome | Browser | Pass | Same JSON: focus moved to each newly visible toggle; sidebar measured 256px |
| `BROWSER-002-RESIZE` | `REQ-009`, `AC-010`, `AC-014`; UI/UX accessibility rule | Desktop-to-narrow breakpoint while header toggle owns focus | Production renderer, Chrome viewport change | Browser | **Fail** | Expected focus not to be lost; actual `BUTTON[data-testid=settings-navigation-expand]` -> `BODY` |
| `BROWSER-003` | `AC-007`, `AC-011`, persisted-data `Not Affected` | Manager/data/interaction/scroll/request preservation | Production renderer with deterministic GraphQL | Browser/live | Pass | Same JSON: identical manager/table nodes, values, dates, grouping, sort, expansion/detail, scroll 220, storage, and two statistics requests before/after |
| `BROWSER-004-loading` | `AC-007`, `AC-011` | Toggle during in-flight paired queries | Delayed GraphQL | Browser/live | Pass | Same JSON: 2 requests before/after toggle |
| `BROWSER-004-error` | `AC-007`, `AC-011` | Toggle in explicit error state | GraphQL error response | Browser/live | Pass | Same JSON and `desktop-error-state.png` |
| `BROWSER-004-empty` | `AC-007`, `AC-011` | Task/model empty states and toggle | Empty GraphQL rows | Browser/live | Pass | Same JSON and `desktop-empty-state.png` |
| `BROWSER-005` | `AC-010`, `AC-012`, `AC-014` | 390x844 stacked layout/selection/containment | Production renderer, headless Chrome | Browser | Pass | Same JSON; `narrow-token-statistics-390x844.png` |
| `BROWSER-006` | `AC-001`, `AC-008`, `AC-009`, `AC-012` | Route normalization and Server Settings modes | Production renderer direct routes | Browser | Pass | Same JSON: `about`, `server-status`, invalid fallback, quick/advanced/migrations all active and open |
| `BROWSER-007` | `AC-002`, `AC-009`, `AC-013` | Shared icon geometry and Back route | Production renderer | Browser | Pass | Same JSON: exact shared 18x18 SVG markup/geometry and `/workspace` navigation |

## Additional Repository Coverage Execution

No repository commands were added after the post-repository confidence decision. The browser probe was the selected broader-validation surface.

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | Change | New / Final Supporting Evidence | Residual Uncertainty |
| --- | ---: | ---: | ---: | --- | --- |
| Requirement and acceptance-criteria proof | 92% | 88% | -4 | Nearly all material criteria passed directly; the reviewed viewport-focus rule failed | Exact repair/focus destination needs focused owner review |
| Changed-boundary execution directness | 90% | 98% | +8 | Real production Vue/CSS/focus boundary executed | None beyond the failed behavior itself |
| Cross-boundary integration realism and mock gap | 88% | 96% | +8 | Real Nuxt/Pinia/Apollo DOM executed; only unchanged server responses intercepted | Real backend was not needed for shell toggle behavior |
| Environment, configuration, identity, and fixture fidelity | 90% | 95% | +5 | Chrome, production build, representative rows, Electron target generation | Packaged Electron window not launched; no shell code changed |
| Failure, edge-case, lifecycle, and recovery evidence | 90% | 94% | +4 | Loading/error/empty and breakpoint transition executed | Viewport focus recovery fails |
| User-surface, browser, and desktop-shell confidence | 82% | 85% | +3 | Desktop/narrow geometry, focus, overflow and Electron renderer build directly evidenced | Applicable accessibility focus behavior fails; category remains below 90% |
| Durable regression coverage quality and relevance | 95% | 92% | -3 | Existing focused tests remain strong | No durable test catches real breakpoint focus loss |

- Overall post-repository confidence: `89.6%`
- Overall final confidence: `92.6%`
- Calculation method: Simple average of seven applicable categories.
- Confidence change produced by broader validation: `+3.0 points`, while also converting one material uncertainty into a confirmed failure.
- Every critical acceptance criterion directly proven: `No`
- Any final applicable category below `90%`: `Yes` — requirement proof (`88%`) and user-surface/browser confidence (`85%`).
- Default final confidence target of `95%` met: `No`
- Confidence-limiting residual risks: `REQ-009`/`AC-010` viewport focus loss and absence of durable browser-equivalent regression protection for that breakpoint transition.

## Broader Validation Decision And Execution

- Decision and selected execution mode from the coverage investigation: `Required — Browser`, plus Electron-target generation.
- Material deviation from the planned mode or rationale: Production static renderer served by a ticket-owned Python server replaced Nuxt dev-server serving; this improved release fidelity and stability without changing the UI boundary.
- Confidence gap or residual risk actually addressed: responsive geometry, all-column fit, focus, toggle-only requests, mounted manager identity, state/scroll/storage, error/loading/empty states, routes, Server modes, Back, icon rendering, and Electron renderer build.
- Startup order, commands, and readiness results:
  1. `pnpm build` — passed.
  2. `python3 -m http.server 3317 --directory autobyteus-web/dist/public` — successful HTTP readiness at `/settings/`.
  3. `node tickets/in-progress/token-statistics-full-width/execution-evidence/browser-validation.cjs` — completed all planned scenarios and returned Fail only for `BROWSER-002-RESIZE`.
  4. Server stopped; port 3317 and headless Chrome process checks were clean.
- Environment choices: isolated Chrome contexts; English/default font; `Europe/Berlin`; 1440x900 and 390x844.
- Seed data/fixtures: 20 representative task/team runs, one nested member, one model aggregate, plus deterministic delayed/error/empty phases. No persistent backend data or account was used.

| Scenario / Journey Step | Expected Observable Result | Actual Observable Result | Evidence | Result |
| --- | --- | --- | --- | --- |
| Direct Token at 1440x900 | Sidebar has zero rendered width; Created Time fits with no table horizontal scroll | Navigation `display:none`, 0 rects; content 1440px; table client/scroll width both 1342px; Created Time final header | JSON + desktop screenshot | Pass |
| Expand then collapse | Sidebar 256px; focus moves to close toggle, then open toggle; ARIA/control stable | Exactly observed; open control x=205 in 256px sidebar | JSON | Pass |
| Preserve active statistics state | No new requests/remount/reset and scroll remains | Same manager/table markers, request count 2, scrollTop 220, dates/group/sort/expansion/detail/storage unchanged | JSON | Pass |
| Resize focused collapsed Token from 1440x900 to 390x844 | Reviewed accessibility rule says viewport changes do not steal/lose focus | Active element changed from expand `BUTTON` to `BODY` when CSS hid the header | JSON | **Fail** |
| Select Token at 390x844 | Visible stacked nav retains focus; no header/rail; contained overflow | Nav 390px, token item focused, header hidden, 0 visible panel icons, document width 390px; table overflow local | JSON + narrow screenshot | Pass |
| Loading/error/empty toggles | Toggle stays usable; no toggle-only request | All phases retained 2 paired statistics requests | JSON + state screenshots | Pass |
| Direct route variants | Correct section/mode and non-statistics open layout | All six cases correct | JSON | Pass |
| Back/icon | `/workspace`; exact shared icon geometry | Route changed; 18x18 SVG with reviewed path/rect and 34x34 button geometry | JSON | Pass |

## Desktop Application Validation (When Applicable)

- Validation approach executed: Browser-tested the complete web-equivalent renderer; executed Electron Vitest and `pnpm generate:electron`.
- Browser-tested web-equivalent behavior and evidence: All Settings layout, responsive, state, focus, route, data, and request scenarios above.
- Shell-specific or lifecycle behavior and evidence: No shell-specific source changed. Electron suite passed 97 tests and Electron target generated renderer/main/preload successfully.
- Effect on any already-running desktop application: `None`
- Behavior not directly proven and confidence consequence: Actual packaged Electron window not launched. This is a negligible residual because the failed and passed behavior lives wholly in shared renderer/CSS and no preload/IPC/window boundary changed.

## Platform / Runtime Targets

- Operating system / platform: macOS Darwin 25.5.0, Apple Silicon host.
- Runtime and relevant framework versions: Node 22.23.1; pnpm 10.28.x (root runtime 10.28.2; web manifest pins 10.28.1); Nuxt 3.21.1; Vue 3.5.28; Electron 42.4.1.
- Browser / engine and version: Google Chrome 150.0.7871.116 headless (Chromium engine).
- Device, viewport, locale, timezone, or accessibility settings: 1440x900 and 390x844; `en-US`; Europe/Berlin; default browser font.

## Lifecycle / Upgrade / Restart / Persisted-Data Checks

- Approved persisted-data decision: `Not Affected`
- Representative existing data exercised: Loaded task/model rows plus manager-owned dates/group/sort/expanded/detail/scroll state.
- Direct-use, discard/rebuild, or migration result: Same live manager/table nodes and all state survived two toggles; no statistics request or storage write occurred.
- Migration completion/recovery evidence: N/A
- Version-specific runtime branch, dual read/write, or compatibility fallback observed: `No`
- Residual untested persisted-data risk: None material.

## Tests Implemented Or Updated

None.

## Tests Removed As Stale Or Obsolete

None.

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `No`
- Paths added or updated: None
- Paths removed: None
- Added or updated paths attached for proportional test-code review: `Not Applicable`
- Diff or repository evidence supplied for removed paths: N/A

## Other Execution Artifacts

| Artifact Path | Type / Purpose | Retained Or Temporary | Notes |
| --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-full-width/tickets/in-progress/token-statistics-full-width/execution-evidence/browser-validation-results.json` | Authoritative structured browser evidence | Retained ticket evidence | Contains the exact failed focus transition and all pass metrics |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-full-width/tickets/in-progress/token-statistics-full-width/execution-evidence/browser-validation.log` | Browser execution log | Retained | Final authoritative run |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-full-width/tickets/in-progress/token-statistics-full-width/execution-evidence/browser-validation.cjs` | Reproducible temporary harness | Retained ticket evidence | Not repository-resident durable test code |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-full-width/tickets/in-progress/token-statistics-full-width/execution-evidence/*.png` | Supporting screenshots | Retained | Geometry/state support; semantic JSON is authoritative |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-full-width/tickets/in-progress/token-statistics-full-width/execution-evidence/*vitest.log` | Repository test logs | Retained | Focused, full Nuxt, Electron |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-full-width/tickets/in-progress/token-statistics-full-width/execution-evidence/nuxt-build.log` | Production build log | Retained | Pass |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-full-width/tickets/in-progress/token-statistics-full-width/execution-evidence/electron-generate.log` | Electron target generation log | Retained | Pass |

## Temporary Execution Methods / Scaffolding

| Path / Method | Why Needed | Result / Evidence | Cleanup Result |
| --- | --- | --- | --- |
| `execution-evidence/browser-validation.cjs` | No project browser-E2E framework exists; direct geometry/focus evidence was required | 9 scenario groups passed; one breakpoint-focus scenario failed | Browser contexts/process closed; script retained only as ticket evidence |
| Python static server on port 3317 | Serve successful production static output | All browser scenarios executed | Process stopped; port closed |

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| GraphQL backend | Playwright route fulfilled current task/model query shapes and explicit loading/error/empty variants | Backend/API unchanged; shell-only toggle behavior needed deterministic request-count/state evidence | Does not prove backend computation, which is out of changed scope |
| Health endpoint | Local 200 response | Prevent unrelated server-status polling noise | None for Settings shell behavior |

## Prior Failure Resolution Check

Not applicable on round 1.

## Result Summary

| Result | Scenario IDs | Summary / Reason |
| --- | --- | --- |
| Pass | `REPO-001`, `REPO-003`, `BUILD-001`, `BUILD-002`, `BROWSER-001`, `BROWSER-002`, `BROWSER-003`, `BROWSER-004-*`, `BROWSER-005`, `BROWSER-006`, `BROWSER-007` | All directly relevant repository/build/live behaviors passed. |
| Fail | `BROWSER-002-RESIZE` | Chrome focus falls from the desktop collapsed-header button to `BODY` when resizing to narrow and the button becomes `display:none`. |
| Baseline Fail / changed scope unaffected | `REPO-002` | Four unrelated known full-suite failures; changed Settings focused tests and builds pass. |

## Cleanup Performed

| Resource / Process / Data | Ownership | Cleanup Action | Result |
| --- | --- | --- | --- |
| Static server, port 3317 | This validation run | Terminated via shell trap; listener check | Clean |
| Chrome contexts/process | This validation run | Closed in `finally` | Clean |
| GraphQL fixtures/storage | Isolated browser contexts | Context destruction | Clean |
| Production build artifacts | Repository-generated ignored outputs | Retained as normal local build output | No tracked source impact |

## Classification

- Preliminary classification: `Local Fix — implementation-owned focus/breakpoint behavior`, subject to `code_reviewer` focused failure-origin confirmation.
- Basis: The reviewed solution explicitly says viewport changes do not steal focus, while the live renderer has no breakpoint focus recovery and CSS hides the focused control. No backend, fixture, environment, stale-test, or compatibility issue caused the failure.
- Potential design nuance for reviewer: if the intended narrow destination for a formerly focused desktop toggle is not sufficiently specified, the reviewer may classify a design impact and return it through `solution_designer`; do not weaken the observed failure.

## Recommended Recipient

`code_reviewer` for focused failure-origin review, with likely rework owner `implementation_engineer`.

## Evidence / Notes

- Failing scenario: `BROWSER-002-RESIZE`
- Related IDs: `REQ-009`, `AC-010`, `AC-014`; `ui-ux-spec.md` Accessibility statement that viewport changes do not steal focus.
- Exact execution mode: production Nuxt static renderer, Google Chrome headless, 1440x900 Token Statistics collapsed state, focus on `settings-navigation-expand`, then `page.setViewportSize({ width: 390, height: 844 })`.
- Expected: Focus is not lost/stolen across the CSS breakpoint; it remains predictably owned by the Settings navigation interaction.
- Observed: `document.activeElement` changed from `{ tag: "BUTTON", testId: "settings-navigation-expand" }` to `{ tag: "BODY", testId: null }`.
- Exact evidence: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-full-width/tickets/in-progress/token-statistics-full-width/execution-evidence/browser-validation-results.json`

## Latest Authoritative Result

- Result: `Fail`
- Final validation confidence: `92.6%`
- Default `95%` confidence target met: `No`
- Any final applicable confidence category below `90%`: `Yes` — requirement proof (`88%`) and user-surface/browser confidence (`85%`).
- Broader validation decision: `Required and executed`
- Critical acceptance criteria lacking direct proof: `AC-010` is contradicted for a desktop-to-narrow viewport transition; `AC-014` is therefore not fully satisfied.
- Required next recipient: `code_reviewer` for focused failure-origin review.
- Notes: Do not route this package as a successful proportional test review. No durable test code changed. Recheck `BROWSER-002-RESIZE` first on rerun and reuse the scenario ID.
