# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-markdown-link-clickability/tickets/in-progress/event-monitor-markdown-link-clickability/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-markdown-link-clickability/tickets/in-progress/event-monitor-markdown-link-clickability/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-markdown-link-clickability/tickets/in-progress/event-monitor-markdown-link-clickability/design-spec.md`
- Supplemental Task Artifacts: `None`
- Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-markdown-link-clickability/tickets/in-progress/event-monitor-markdown-link-clickability/solution-revision-record.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-markdown-link-clickability/tickets/in-progress/event-monitor-markdown-link-clickability/design-review-report.md`
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-markdown-link-clickability/tickets/in-progress/event-monitor-markdown-link-clickability/architecture-review-revision-record.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-markdown-link-clickability/tickets/in-progress/event-monitor-markdown-link-clickability/implementation-handoff.md`
- Implementation Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-markdown-link-clickability/tickets/in-progress/event-monitor-markdown-link-clickability/implementation-revision-record.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-markdown-link-clickability/tickets/in-progress/event-monitor-markdown-link-clickability/code-review-report.md`
- Code Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-markdown-link-clickability/tickets/in-progress/event-monitor-markdown-link-clickability/code-review-revision-record.md`
- Delivery Revision Record (delivery re-entry only): `N/A`
- Relevant Delivery Revision IDs: `N/A`
- API/E2E Revision Record (created after the first completed result): `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-markdown-link-clickability/tickets/in-progress/event-monitor-markdown-link-clickability/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- Current Investigation Round: `1`
- Trigger: `CRR-001` implementation-source review pass for commit `f809c765ddc2807bfc2a1c154fb906d92e24ea2a`
- Prior Investigation Reviewed: `N/A` (first API/E2E investigation)
- Latest Authoritative Investigation: This file, round 1

## Current Requirement And Design Basis

The approved change is a small frontend bug fix at the Event Monitor Markdown destination-policy seam. For an opted-in Event Monitor renderer, a decoded and normalized bare POSIX or Windows absolute Markdown destination whose shared `determineFilePreviewType()` result is `Unsupported` must return the existing `invalid-file` semantic. The existing `useMarkdownSegments` projection must therefore render the authored label as inert text rather than an ordinary anchor. The DOM must not expose an anchor, `href`, render-scoped action ID, raw local destination, or activation affordance; click, Enter, and Space must not emit `file-path-action`.

The supported local action path, supported empty-authority `file:` URI path, HTTP(S) external-link routing, generic Markdown opt-out, shared FileViewer eligibility policy, runtime/persistence boundaries, and no-filesystem/no-opener contract must remain unchanged. Acceptance criteria are AC-001 through AC-005. The implementation and source review confirm one production-line policy change plus durable policy/renderer regression tests; no API, backend, persisted-data, Electron IPC, or desktop-shell code changed.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| `BEH-001` / unsupported bare absolute Markdown destination | `Changed` | `requirements.md` R-001/R-002, AC-001/AC-002; `implementation-handoff.md`; `CRR-001` | Direct policy result and rendered DOM/activation assertions required. |
| `BEH-002` / supported local preview action | `Preserved` | `requirements.md` R-003, AC-003; reviewed implementation trace | Existing supported path and keyboard/action tests must remain green. |
| `BEH-003` / HTTP(S) external link | `Preserved` | `requirements.md` R-004, AC-004 | Existing delegated external-link test remains valid; no API test required. |
| `BEH-004` / generic renderer opt-out and invalid `file:` URI inertness | `Preserved` | `requirements.md` R-002/R-004, AC-002/AC-004 | Existing renderer coverage remains valid; verify no regression. |
| `BEH-005` / security and persistence boundary | `Preserved` | `requirements.md` R-005, AC-005; implementation persisted-data check | No filesystem, storage, runtime, or API setup; source/test inspection plus focused execution. |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | No | None | No backend files changed. | None in scope. | None |
| API / transport / contract | No | None | No API/GraphQL/REST/WS files or contracts changed. | None in scope. | None |
| Frontend component / state | Yes | `MarkdownRenderer` consumes `useMarkdownSegments` output; policy result changes. | Actual component mount and pure policy tests. | No real browser engine or complete Event Monitor host mount in focused test. | Browser or host-component probe, if material. |
| Browser integration / user journey | Indirect | Rendered anchor/span and delegated pointer/keyboard behavior. | `MarkdownRenderer.spec.ts` uses happy-dom and actual Vue renderer. | CSS/browser navigation/accessibility behavior outside happy-dom. | Browser validation. |
| Authentication / session / permissions | No | None | No auth/session data needed. | None. | None |
| Desktop renderer / web-equivalent UI | Yes | Event Monitor uses the shared web renderer; no Electron-only code changed. | Component DOM/action tests and Event Monitor opt-in wiring tests. | Browser engine and desktop shell not exercised. | Browser validation; desktop shell not justified. |
| Desktop shell / Electron-specific integration | No | No preload/IPC/window/lifecycle change. | Source review and existing external-link coverage. | Electron native routing is out of scope. | None |
| Process / lifecycle | No | None. | No process or service startup required. | None. | None |
| Persisted-data transition | No | Stored Markdown source remains unchanged; decision is `Not Affected`. | Implementation handoff persisted-data check and source inspection. | No migration lifecycle is applicable. | None |
| Worker / queue / distributed coordination | No | None. | No workers/queues/nodes involved. | None. | None |
| External integration | No | No external service/file access; HTTP(S) route is preserved only. | Existing mocked external-link authority test. | No live opener is needed for a pure classification change. | None |

## Project Execution Discovery

- Assigned task worktree / workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-markdown-link-clickability`
- Project type and runtime stack: TypeScript/Nuxt 3 frontend, Vue 3, Markdown-it/DOMPurify rendering, Vitest with `@nuxt/test-utils`, happy-dom component environment; Electron wrapper exists but is not changed.
- Conflicting, missing, or unclear project instructions: None material. The web guide specifies colocated Vitest coverage and `--run` for one-shot execution. No dedicated browser fixture exists for this Markdown-link case.
- Required environment variables or secrets available: `N/A`; focused tests need no service, account, or secret.

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `autobyteus-web/AGENTS.md` | Web developer/testing guide | Colocated tests; use `pnpm test:nuxt`; always use `--run`; browser probes use project scripts when applicable. |
| `autobyteus-web/README.md` | Frontend setup and testing | `pnpm test:nuxt <paths> --run`; `pnpm dev` is browser path; browser probes require a running target or a self-starting fixture and Chrome/Chromium. |
| `autobyteus-web/vitest.config.mts` | Nuxt test configuration | Nuxt environment with happy-dom, websocket/localization setup, standard exclusions. |
| `autobyteus-web/package.json` | Authoritative scripts/runtime | `test:nuxt`, `test`, and unrelated browser probes. No task-specific API endpoint or E2E suite. |
| Root `package.json` | Workspace package manager | pnpm `10.28.2`; no frontend API test command needed for this change. |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Nuxt/Vitest frontend harness | `autobyteus-web` | `pnpm test:nuxt <test paths> --run` | Uses existing ignored `node_modules`/Nuxt generated setup; no server. | Test runner exits with pass/fail. | Process exits automatically; no owned persistent resource. |
| Real browser | N/A | Not planned for round 1 | No Chrome/Chromium executable was found on this host; a browser fixture would require unrelated temporary setup. | N/A | N/A |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Markdown destinations | Inline strings in existing policy/renderer tests | No filesystem reads occur; paths are representative strings only. | No data created. |
| Authentication/session | None | No backend or protected route is exercised. | None. |

## Persisted Data Transition Coverage Basis

- Approved decision: `Not Affected`.
- Design-spec and implementation-handoff references: `design-spec.md` persisted-data decision; `implementation-handoff.md` persisted-data transition check; `requirements.md` R-005/AC-005.
- Representative existing-data setup and required behavior: Stored conversation text is read unchanged; only transient token classification and DOM projection differ.
- Evidence planned for the approved outcome: source review plus focused policy/renderer execution; no migration or persisted-data fixture is applicable.
- Migration-specific completion/recovery scenarios: `N/A`.
- Upstream ambiguity or reroute required: `None`.

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Acceptance Criteria / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/utils/eventMonitorFilePaths/__tests__/absoluteFilePathAction.spec.ts` | Pure path recognition, URI decoding, supported/unsupported FileViewer families, invalid URI handling, and action creation. Now includes parameterized unsupported bare destinations. | R-001/R-003/R-005; AC-001/AC-002/AC-003/AC-005 | `Still Valid` | Commit `f809c765d`; source review; table-driven policy cases. | Execute; no further change. |
| `autobyteus-web/components/conversation/segments/renderer/__tests__/MarkdownRenderer.spec.ts` | Actual Vue renderer DOM, action IDs, supported activation, invalid URI spans, external links, generic opt-in, keyboard behavior; now includes unsupported bare Markdown links. | R-002/R-003/R-004/R-005; AC-001 through AC-005 | `Still Valid` | Commit `f809c765d`; source review; new DOM/activation scenario. | Execute; no further change. |
| `autobyteus-web/composables/__tests__/useMarkdownSegments.spec.ts` | Existing supported Event Monitor path projects supported paths as compact action anchors and preserves generic image behavior. | R-003/R-004; AC-003/AC-004 | `Still Valid` | Existing source and focused test. | Execute as adjacent regression; no change needed. |
| `autobyteus-web/components/workspace/agent/__tests__/AgentConversationFeed.spec.ts` | Event Monitor file-action flag/event is forwarded through the feed. | R-003/R-004; AC-003/AC-004 | `Still Valid` | Existing pass-through test. | Execute as host-boundary regression; no change needed. |
| `autobyteus-web/components/workspace/agent/__tests__/AgentEventMonitor.spec.ts` | Event Monitor enables file actions on the feed and retains host layout/identity boundaries. | R-003/R-004; AC-003/AC-004 | `Still Valid` | Existing opt-in propagation test. | Execute as opt-in regression; no change needed. |
| `autobyteus-web/services/eventMonitor/__tests__/*`, `recentEventMonitorProductionDispatch.spec.ts` | Event monitor presentation/dispatch lifecycle and persistence behavior. | AC-005 only at boundary context | `Out Of Scope` | No production or persistence lifecycle changed. | No execution required for this policy-only change. |
| `autobyteus-web/tests/e2e/*` browser probes | Existing unrelated workspace/diagram probes. | No direct scenario for this destination policy. | `Out Of Scope` | Probes target other UI surfaces and require Chrome. | No reuse; browser decision recorded below. |

## Stale Or Obsolete Coverage Decisions

None. No existing test asserts the removed false ordinary-anchor behavior; no test is deleted or disabled.

## Durable Coverage To Add

None owned by API/E2E. The implementation commit already added the approved durable policy and renderer regression cases, and source review confirmed they are requirement-aligned. They remain subject to proportional test-code review after this validation pass.

## Durable Coverage To Update

None. Existing and implementation-added paths are valid as written; no fixture, assertion, or test-runner update is needed.

## Durable Coverage To Remove

None.

## Repository Coverage Execution Plan And Results

Executed plan and results:

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| 1 | `pnpm test:nuxt utils/eventMonitorFilePaths/__tests__/absoluteFilePathAction.spec.ts components/conversation/segments/renderer/__tests__/MarkdownRenderer.spec.ts --run` | `autobyteus-web`, `vitest.config.mts` | Direct policy and renderer AC-001/AC-002/AC-003/AC-004 checks. | `Pass` — 2 files / 63 tests | `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-markdown-link-clickability/tickets/in-progress/event-monitor-markdown-link-clickability/api-e2e-focused-tests.log` |
| 2 | `pnpm test:nuxt composables/__tests__/useMarkdownSegments.spec.ts components/workspace/agent/__tests__/AgentConversationFeed.spec.ts components/workspace/agent/__tests__/AgentEventMonitor.spec.ts --run` | `autobyteus-web`, same Nuxt config | Adjacent token projection and Event Monitor opt-in/event propagation. | `Pass` — 3 files / 21 tests | `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-markdown-link-clickability/tickets/in-progress/event-monitor-markdown-link-clickability/api-e2e-adjacent-tests.log` |
| 3 | `git diff --check origin/personal...HEAD` | Task worktree | Commit whitespace integrity. | `Pass` | `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-markdown-link-clickability/tickets/in-progress/event-monitor-markdown-link-clickability/api-e2e-diff-check.log` |
| 4 | `pnpm exec nuxt dev --host 127.0.0.1 --port 43127` plus temporary Playwright/Chrome probe | `autobyteus-web`; temporary route and probe removed after run | Real Nuxt web-equivalent DOM, pointer/keyboard inertness, supported action, and generic opt-out. | `Pass` | `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-markdown-link-clickability/tickets/in-progress/event-monitor-markdown-link-clickability/api-e2e-browser-evidence.json` |

## Post-Repository Confidence Scorecard (Mandatory)

Repository execution passed the direct policy/renderer suites (63 tests), adjacent token/host propagation suites (21 tests), and diff check. Before broader validation, happy-dom and adjacent host tests directly exercised the changed boundary, but no real browser engine had run yet.

| Confidence Category | Score | What Supports The Score | Remaining Uncertainty | Additional Validation That Could Improve It |
| --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | `100%` | Policy and renderer tests directly prove AC-001/AC-002/AC-003/AC-004; source/persistence inspection proves AC-005 boundary. | Native browser projection had not yet run. | Targeted browser route. |
| Changed-boundary execution directness | `100%` | Pure classifier and actual `MarkdownRenderer` mount executed; adjacent feed/monitor propagation tests pass. | No complete production conversation fixture. | Browser route if user-surface gap is material. |
| Cross-boundary integration realism and mock gap | `90%` | Real composable/renderer path and adjacent host propagation pass. | happy-dom/test Pinia; no browser or backend/preview owner. | Targeted browser validation. |
| Environment, configuration, identity, and fixture fidelity | `90%` | No external setup, identity, or fixture is required; representative paths are pure strings. | Nuxt test harness is not a production browser; no backend runtime. | Targeted browser validation. |
| Failure, edge-case, lifecycle, and recovery evidence | `95%` | Unsupported family matrix, invalid URI variants, encoded/Windows cases, pointer/Enter/Space inertness, and supported regressions pass; no lifecycle/API boundary applies. | Native browser default-event behavior not yet exercised. | Targeted browser validation. |
| User-surface, browser, and desktop-shell confidence | `90%` | Actual Vue DOM assertions pass; no Electron code changed. | No real browser/desktop shell. | Targeted browser validation. |
| Durable regression coverage quality and relevance | `95%` | Implementation-added tests are focused, table-driven, colocated, and source-review passed. | Separate proportional changed-test review remains downstream. | Code reviewer test-code review. |

- Overall post-repository confidence: `91.4%` (100+100+90+90+95+90+95 / 7)
- Calculation method: Simple average of the seven applicable category scores.
- Every critical acceptance criterion directly proven: `Yes`
- Any applicable category below 90%: `No`
- Default clean-confidence target of 95% met: `No` before broader validation; browser validation was selected to close the 90% categories.
- Material residual risks: Real browser engine and native user-surface behavior remained unverified at this point; no API/backend or Electron-shell change was present.

## Broader Validation Decision

- Decision: `Required` — completed
- Selected execution mode: `Browser`
- Specific confidence gap or residual risk addressed: Real browser DOM projection, native pointer/keyboard dispatch, supported action anchor behavior, and generic opt-out behavior beyond happy-dom.
- Why the selected mode can materially improve confidence: The changed user-visible contract is a frontend Markdown renderer; Chrome validates the actual web-equivalent surface and default-event behavior.
- Expected confidence after selected validation: At least 95% overall with no applicable category below 90%; achieved at `96.4%`.
- Browser-specific decision and rationale: Browser validation was proportionate because the defect is a false user-facing link affordance. A temporary route was used instead of the unrelated repository browser probes; the route and probe were removed after execution.
- If Not Required, evidence proving the real changed boundary without broader execution: `N/A`.

## Post-Broader Validation Reassessment

The targeted browser run passed through a temporary Nuxt route using Google Chrome 150.0.7871.187. It observed six inert unsupported labels, zero unsupported anchors/action IDs, zero inert events after click/Enter/Space attempts, one supported `href="#"` action, and zero generic action IDs. Final confidence is `96.4%` (100+100+95+95+95+95+95 / 7); all applicable categories are at least 95%, every critical acceptance criterion is directly proven, and the default clean target is met. The browser evidence records expected `localhost:8000/rest/health` connection refusals because no backend was started; this does not affect the renderer-only scenarios.

## Desktop Application Validation Decision

- Desktop framework / shell: Electron wrapper around the Nuxt/Vue renderer.
- Relevant README or development instructions: `autobyteus-web/README.md` development/testing sections and `autobyteus-web/AGENTS.md`.
- Web-equivalent behavior: Markdown token classification, sanitized DOM projection, delegated click/keyboard behavior, and Event Monitor opt-in propagation.
- Shell-specific or lifecycle behavior: None changed; no preload/IPC/window/server lifecycle path is involved.
- Chosen validation approach and why it fits the project: Nuxt Vitest component execution plus adjacent Event Monitor propagation tests; no actual desktop execution.
- Server/frontend setup when browser validation is used: Nuxt development server via `pnpm exec nuxt dev --host 127.0.0.1 --port 43127`; temporary route only; no backend.
- Effect on any already-running desktop application: `None`.
- Behavior not directly proven and confidence consequence: Electron preload/IPC/window lifecycle and the real preview side effect were not exercised; no shell/API code changed and the preview owner is covered by existing event propagation contracts.

## Live Environment And Fixture Plan

- Startup order and commands: From `autobyteus-web`, run `pnpm exec nuxt dev --host 127.0.0.1 --port 43127`; wait for the Nuxt local URL and route readiness; launch Playwright Core with the installed Google Chrome executable; terminate the owned Nuxt process after the probe.
- Environment choices that materially affect the run: macOS host; Nuxt development mode; Chrome headless mode; viewport 1280x900; no backend, auth, or persisted data because the route exercises pure renderer behavior.
- Health / readiness checks: `http://127.0.0.1:43127/api-e2e-event-monitor-markdown-link-clickability` became reachable; probe waited for `[data-test="event-monitor-markdown-link-probe"]`.
- Seed data / fixtures: Temporary page fixture with six unsupported destinations plus one supported and one generic Markdown renderer; representative paths only, no filesystem access.
- Test identities, authentication, permissions, or session state: None.
- Requirement-linked journeys or scenarios: AC-001/AC-002 six unsupported families; AC-003 supported `/tmp/report.md`; AC-004 generic renderer opt-out; pointer/click, Enter, and Space attempts on inert labels.
- DOM, screenshot, log, API, process, or other evidence to capture: `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-markdown-link-clickability/tickets/in-progress/event-monitor-markdown-link-clickability/api-e2e-browser-evidence.json`; browser console/request events retained in the same JSON.
- Owned processes and temporary state to clean up: Nuxt PID/process group on port 43127, temporary page, and temporary Playwright probe; all stopped/removed. No data or browser profile persisted.


## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| `BR-001` | Temporary Nuxt page plus `.tmp-api-e2e-browser-probe.mjs`, `pnpm exec nuxt dev --host 127.0.0.1 --port 43127`, Playwright Core with Chrome | Real browser rendering of six unsupported absolute destinations, inert click/Enter/Space, supported action anchor, and generic opt-out. | The durable policy and component tests are the maintainable regression layer; this one-off route exists only to close the browser confidence gap for the localized fix. Fixture and probe were removed after the run. |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Electron shell/preload/IPC/window lifecycle | No shell code changed and no shell-specific behavior is required by the acceptance criteria. | None material in scope. | No follow-up. |
| API/live backend and real FileViewer preview side effect | No API/backend boundary changed; supported action event/host propagation is covered by adjacent tests, while starting a backend would add no evidence for the policy branch. | Low and bounded to unchanged downstream preview behavior. | Revisit only if the task expands into runtime mapping or preview launch. |
| Persistence/migration/restart | Approved `Not Affected`; stored source unchanged. | None. | No follow-up. |

## Ambiguities Or Reroute Triggers

None. Requirements/design/code review resolve the intended unsupported-file behavior, and the current test cases align with the approved invalid-file path.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes` (completed)
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `No` (implementation-added durable coverage was executed; API/E2E owns no additional test edit)
- Post-repository confidence: `96.4%`
- Broader validation decision: `Required` — browser validation completed and passed
- Reroute Required Before Validation Execution: `No`
- Recommended Recipient If Reroute Required: `N/A`
- Notes: Direct policy/renderer checks, adjacent propagation checks, diff check, and temporary real-Chrome web-equivalent validation all passed. Proceed to the execution report and proportional test-code review handoff.
