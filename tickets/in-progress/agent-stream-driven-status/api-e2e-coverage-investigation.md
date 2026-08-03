# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-stream-driven-status/tickets/in-progress/agent-stream-driven-status/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-stream-driven-status/tickets/in-progress/agent-stream-driven-status/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-stream-driven-status/tickets/in-progress/agent-stream-driven-status/design-spec.md` (`SR-006`)
- Supplemental Task Artifacts: `production-trace-evidence.md`, `team-status-simplification-evidence.md`, and four user screenshots identified in the upstream package
- Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-stream-driven-status/tickets/in-progress/agent-stream-driven-status/solution-revision-record.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-stream-driven-status/tickets/in-progress/agent-stream-driven-status/design-review-report.md`
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-stream-driven-status/tickets/in-progress/agent-stream-driven-status/architecture-review-revision-record.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-stream-driven-status/tickets/in-progress/agent-stream-driven-status/implementation-handoff.md`
- Implementation Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-stream-driven-status/tickets/in-progress/agent-stream-driven-status/implementation-revision-record.md` (`IR-005`)
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-stream-driven-status/tickets/in-progress/agent-stream-driven-status/code-review-report.md`
- Code Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-stream-driven-status/tickets/in-progress/agent-stream-driven-status/code-review-revision-record.md` (`CRR-007`)
- Delivery Revision Record (delivery re-entry only): `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-stream-driven-status/tickets/in-progress/agent-stream-driven-status/delivery-revision-record.md`
- Relevant Delivery Revision IDs: `DR-004` is superseded verification-candidate context, not current sign-off.
- API/E2E Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-stream-driven-status/tickets/in-progress/agent-stream-driven-status/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-003`
- Current Investigation Round: `3` / first round for `SR-006`
- Trigger: `code_reviewer` source Pass `CRR-007` for `IR-005` / `SR-006`
- Prior Investigation Reviewed: `API-REV-002` / accepted `SR-005` baseline only; it does not cover the new binary presentation.
- Latest Authoritative Investigation: this completed `SR-006` investigation, created 2026-08-03 before any SR-006 API/E2E durable edit or final execution and updated from fresh evidence.

## Current Requirement And Design Basis

`SR-006` is a bounded frontend presentation correction on top of the accepted `SR-005` lifecycle and transport behavior. A root team run still owns only authoritative binary `isActive`. Every exact team-run row must render that exact boolean. A displayed team-definition/group row must render `runs.some(run => run.isActive)` over its final displayed children. The shared visual must be solid blue when active, solid neutral gray when inactive, never pulse, and expose localized accessible active/inactive meaning. Representative ordering, member `AgentStatus`, `isSubscribed`, Stop pending/failure, action availability, and socket activity must not affect either dot.

No backend, GraphQL, WebSocket, store, team lifecycle, Stop policy, task-team coordinate, persistence, or Electron-shell boundary changed. Prior `API-REV-002` remains valid preservation evidence for those unchanged boundaries, but is not counted as direct proof of `AC-026` or the new `REQ-020` presentation.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-006 / REQ-013, REQ-020 / AC-016, AC-026 | Changed | `requirements.md`, `design-spec.md`, `IR-005`, `CRR-007` | Prove definition groups have no five-state status and display any-child binary activity in both expanded and collapsed states. |
| BEH-008 / REQ-016, REQ-020 / AC-023, AC-026 | Changed | Same package | Prove each history/running run row reads only its own `isActive`, with mixed active/inactive siblings. |
| TeamActivityDot visual/accessibility | Added | `DS-010`, `IR-005`, `CRR-007` | Prove computed blue/gray treatment, no animation, `role=img`, localized `aria-label`, and `title` in a real browser engine. |
| Final active-to-inactive transition | Added presentation behavior | AC-026 | Prove exact active row and both parent groups react to the last active boolean becoming false. |
| Member/socket/action independence | Preserved ownership, newly displayed | REQ-015, REQ-018, REQ-020; AC-020, AC-022, AC-026 | Vary representative/member status, subscription, Stop pending/failure, and action facts without changing a dot unless `isActive` changes. |
| Accepted SR-005 agent/team lifecycle, transport, task and history contracts | Preserved | API-REV-002 / CRR-006 | Retain as baseline context; rerun only focused frontend regressions that protect the presentation boundary. |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | No | None | Accepted API-REV-002 | None introduced by SR-006 | None |
| API / transport / contract | No | None | Accepted WebSocket/GraphQL coverage | None introduced by SR-006 | None |
| Frontend component / state | Yes | Final group/run projection into `TeamActivityDot` | Five mounted/component suites, 16 tests | Happy DOM does not prove real CSS computed color, visibility after collapse, or browser accessibility attributes together | Browser |
| Browser integration / user journey | Yes | Rendered workspace-history and running-team hierarchy | No SR-006 browser test exists | Exact visual parity, collapse preservation, transition, and real DOM computed styles remain unobserved | Browser |
| Authentication / session / permissions | No | No auth change; deterministic fixture can isolate presentation | N/A | None | None |
| Desktop renderer / web-equivalent UI | Yes | Vue/Nuxt renderer shared by browser and Electron | Mounted tests | Real Chromium/Nuxt compilation and rendering not yet proven | Browser via Nuxt dev fixture |
| Desktop shell / Electron-specific integration | No | No preload, IPC, window, packaging, or lifecycle source change | Prior delivery package only | Rebuilding is delivery-owned; shell adds no evidence for boolean DOM behavior | None |
| Process / lifecycle | No | Upstream booleans unchanged | API-REV-002 | None introduced | None |
| Persisted-data transition | No functional change | Display-only reading of existing `isActive` | Direct-use history tests | No migration risk | Browser fixture with current/history-shaped nodes |
| Worker / queue / distributed coordination | No | None | N/A | None | None |
| External integration | No | None | N/A | None | None |

## Project Execution Discovery

- Assigned task worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-stream-driven-status`
- Project stack: Nuxt 3 / Vue 3 / Pinia / Tailwind; Vitest with Vue Test Utils; Electron wrapper; Playwright Core browser probes.
- Conflicting, missing, or unclear instructions: none. `autobyteus-web/AGENTS.md` requires `--run` for Nuxt Vitest. Browser probes in `autobyteus-web/tests/e2e` establish the project pattern of temporarily installing a fixture page, starting owned Nuxt dev on an ephemeral loopback port, launching local Chrome through Playwright Core, recording JSON/screenshots/logs, then removing the installed page and terminating the owned process group.
- Required environment variables or secrets available: `N/A`; the planned deterministic presentation fixture requires no backend or authentication.
- Browser availability discovered before execution: local Google Chrome exists at `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`.

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `autobyteus-web/AGENTS.md` | Repository developer/test instructions | Use `pnpm test:nuxt ... --run`; never use watch mode for one-shot validation. |
| `autobyteus-web/README.md` | Web/Electron development | `pnpm dev` is the browser-equivalent Nuxt path; browser mode normally uses a backend, but this fixture is presentation-local. |
| `autobyteus-web/package.json` | Authoritative scripts/dependencies | `test:nuxt`, localization guards, `playwright-core`, Nuxt dev. |
| `autobyteus-web/tests/e2e/diagram-zoom-viewer-probe.mjs` | Project-owned fixture-page browser pattern | Install a temporary page, choose an ephemeral port, own and clean Nuxt/browser processes, retain evidence. |
| `autobyteus-web/nuxt.config.ts` and Vitest configuration | Rendering/test configuration | Production component imports and Tailwind styles are available in the fixture and mounted tests. |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Focused Vitest | `autobyteus-web` | `pnpm test:nuxt <files> --run` | Existing dependencies | Exit status and Vitest summary | Process exits |
| Nuxt fixture | `autobyteus-web` | Probe-owned `pnpm exec nuxi dev --host 127.0.0.1 --port <ephemeral>` | Temporary page under `pages/`; no backend | HTTP route plus fixture ready marker | Probe terminates owned process group and deletes installed page |
| Chromium | Probe-owned Playwright context | `chromium.launch({ executablePath })` | Headless local Chrome | Semantic locator visible | Close context/browser in `finally` |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Mixed sibling team runs | Deterministic fixture page constructs active/inactive `AgentTeamContext` and history-shaped `TeamTreeNode` values | No user data, server, workspace, or secrets | Fixture source retained; installed page removed |
| Member/status/socket/action variants | Fixture control mutates only local reactive inputs | Proves independence without pretending to execute backend lifecycle | Reset by browser/context close |
| Active-to-inactive transition | Fixture control sets the sole active run's `isActive=false` | Directly exercises Vue reactivity and parent recomputation | Ephemeral |
| Locales | Project localization preference control or fixture-visible locale controls | English and Simplified Chinese only | Browser storage/context removed |

## Persisted Data Transition Coverage Basis

- Approved decision: `Directly Usable — No Migration`; SR-006 itself does not change persisted data.
- References: `requirements.md` persisted-data outcome; `design-spec.md`; `implementation-handoff.md` Persisted Data Transition Check.
- Representative setup: current/history-shaped run nodes with existing `isActive` values are passed through the normal display-group builder and production history surface.
- Planned evidence: unit builder coverage plus browser rendering of the production history surface; no migration/recovery scenario applies.
- Upstream ambiguity or reroute required: none.

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Acceptance Criteria / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `components/workspace/common/__tests__/TeamActivityDot.spec.ts` | Boolean classes, no pulse, role/label/title, reactive transition | REQ-020; AC-023/026 | Still Valid | Source inspection and CRR-007 | Rerun; browser probe supplements computed-style proof. |
| `components/workspace/history/__tests__/workspaceHistoryTeamDefinitionGroups.spec.ts` | Any-child over final runs, representative/member independence, history and leftover paths | REQ-013/020; AC-016/026 | Still Valid | Source inspection and CRR-007 | Rerun. |
| `components/workspace/history/__tests__/WorkspaceHistoryWorkspaceSection.spec.ts` | Mixed sibling exact dots, parent transition, collapsed run state, action independence | REQ-013/016/020; AC-016/023/026 | Still Valid | Source inspection and CRR-007 | Rerun; browser probe covers real collapsed group visibility and visual output. |
| `components/workspace/running/__tests__/RunningTeamGroup.spec.ts` | Any-child and last-active transition; subscription variation | REQ-020; AC-026 | Still Valid | Source inspection and CRR-007 | Rerun. |
| `components/workspace/running/__tests__/RunningTeamRow.spec.ts` | Exact-run dot independent of subscription/member/action | REQ-016/020; AC-023/026 | Still Valid | Source inspection and CRR-007 | Rerun. |
| `stores/__tests__/agentTeamRunStore.spec.ts` | Real Stop pending/failure and lifecycle ownership | REQ-018; AC-018/022 | Still Valid (preservation) | IR-005 and prior API-REV-002 | Focused regression rerun; do not modify. |
| `services/agentStreaming/__tests__/TeamStreamingService.spec.ts` | Lifecycle/subscription separation and batching | REQ-018/020; AC-019/026 | Still Valid (preservation) | IR-005 and prior API-REV-002 | Focused regression rerun; do not modify. |
| `utils/__tests__/workspaceStatusDotPresentation.spec.ts` and agent dot coverage | Agent five-state visual remains agent-only | REQ-015/017/020; AC-020/023 | Still Valid (negative preservation) | IR-005 / CRR-007 | Focused regression rerun. |
| Prior ten-file API/E2E durable server set | Team lifecycle, exact leaf, Stop, task, history contracts | SR-005 / AC-001–025 | Still Valid baseline, not SR-006 sign-off | API-REV-002 / CRR-006 | Do not rerun wholesale because no backend/API/store source changed. |
| Existing browser probes (`workspace-responsive`, `diagram-zoom-viewer`, `vnc-live`) | Other product journeys | No SR-006 presentation assertion | Out Of Scope | Source inventory | Reuse their harness pattern, not their scenarios. |

## Stale Or Obsolete Coverage Decisions

None. No existing SR-006-relevant assertion is obsolete, and no test will be removed or disabled.

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Requirement / Acceptance Criteria / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| API-E2E-017 | Production history and running surfaces in real Chromium with mixed siblings, collapsed group signal, last-active transition, exact labels/title/role, solid computed colors/no animation | BEH-006/008; REQ-013/016/020; AC-016/023/026 | `autobyteus-web/tests/e2e/team-activity-presentation-probe.mjs`; fixture `tests/e2e/fixtures/team-activity-presentation.page.vue` | Existing mounted tests do not prove real Nuxt/Tailwind/Chromium rendering and collapse visibility together. |
| API-E2E-018 | Dot independence from representative/member AgentStatus, `isSubscribed`, and Stop pending/failure/action facts | REQ-015/018/020; AC-020/022/026 | Same probe and fixture | Direct browser observation prevents a passing unit test from hiding an integration coupling. |
| API-E2E-019 | Localized accessible meaning in English and Simplified Chinese | REQ-020; AC-026 | Same probe and fixture | Tests current catalogs and production `$t` resolution in the actual renderer. |

## Durable Coverage To Update

None planned. If browser execution reveals a real durable gap in existing component tests, update this investigation before editing them.

## Durable Coverage To Remove

None.

## Repository Coverage Execution Plan And Results

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| 1 | `pnpm test:nuxt` with the exact five SR-006 component/projection files and `--run` | `autobyteus-web` | Direct changed component/projection behavior | Pass — 5 files / 16 tests | `api-e2e-evidence/sr006-repository/focused.log` |
| 2 | `node tests/e2e/team-activity-presentation-probe.mjs --output-dir ...` | `autobyteus-web`; owned ephemeral Nuxt/Chrome | API-E2E-017–019 real browser-equivalent journey | Pass — 4/4 browser scenarios after one retained harness-only failed attempt | `api-e2e-evidence/sr006-browser/evidence.json`; screenshots; `attempt-1-*` |
| 3 | Expanded relevant frontend regression set | `autobyteus-web`; 13 explicit files, `--run` | Presentation plus unchanged agent-dot, team store Stop, stream lifecycle/subscription boundaries | Pass — 13 files / 84 tests | `api-e2e-evidence/sr006-repository/expanded.log` |
| 4 | `pnpm guard:web-boundary`, `pnpm guard:localization-boundary`, `pnpm audit:localization-literals` | `autobyteus-web` | Web/localization boundary and catalog integrity | Pass — all three guards; zero unresolved literals | `api-e2e-evidence/sr006-repository/guards.log` |
| 5 | Production forbidden-coupling scans and `git diff --check` | Worktree root | No aggregate status, AgentStatus conversion, pulse, socket/action coupling, malformed patch, fixture leak, or owned Nuxt process | Pass | `api-e2e-evidence/sr006-repository/structural.log` |

### Execution-Informed Investigation Update — Browser Harness Attempt 1

- The focused five-file run passed `16/16`.
- The first browser-probe attempt reached the production surfaces and directly observed the expected active blue. It then failed on a test-harness expectation, not product behavior: this repository intentionally overrides Tailwind `gray-400` to `#999999` (`rgb(153, 153, 153)`), while the probe assumed Tailwind's stock `rgb(156, 163, 175)`. `bg-gray-400` remains the reviewed neutral-gray implementation.
- Nuxt's first Vite dependency-optimization warm-up also produced aborted-module/504 console noise, and the deliberately unreachable health URL used by the fixture produced unrelated browser errors. The durable probe will be corrected to use the repository's authoritative custom gray token, intercept the unrelated global health request, warm/reload once after dependency optimization, and clear startup-only browser events before scenario observation.
- Coverage validity and product expectations are unchanged. This is a `Local Fix` to the API/E2E-owned durable probe before rerun. The failed attempt remains retained at `api-e2e-evidence/sr006-browser/evidence.json` until the authoritative rerun replaces it; command log/status preserve the chronology.

## Post-Repository Confidence Scorecard

This scorecard deliberately excludes the browser result to show why broader validation was required. The final browser-adjusted score is recorded in the execution report.

| Confidence Category | Score | What Supports The Score | Remaining Uncertainty | Additional Validation That Could Improve It |
| --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 96% | Five changed suites prove mixed siblings, any-child grouping, exact rows, final transition, accessibility attributes, and independence | Real browser output not included in this score | Browser journey |
| Changed-boundary execution directness | 96% | Production Vue components and builder mounted directly; 16/16 focused | happy-dom approximates CSS/rendering | Browser journey |
| Cross-boundary integration realism and mock gap | 92% | History/running surfaces, store Stop, stream lifecycle, recovery, and agent-dot regressions pass 84/84 | Deterministic component inputs rather than a real renderer | Browser fixture with both production surfaces |
| Environment, configuration, identity, and fixture fidelity | 90% | Typed current/history fixtures use exact run/member identities and current catalogs | Browser engine/Tailwind computed output absent | Nuxt/Chrome fixture |
| Failure, edge-case, lifecycle, and recovery evidence | 95% | Mixed siblings, final transition, Stop failure/pending store path, subscription separation, and recovery pass | Collapsed live transition not observed in browser | Browser journey |
| User-surface, browser, and desktop-shell confidence | 84% | Mounted surface semantics are strong; shell is not affected | No real browser CSS, visibility, or screenshot evidence | Required Chrome run |
| Durable regression coverage quality and relevance | 95% | Narrow requirement-linked component/projection tests and relevant regressions pass | Browser gap remains | Durable browser probe |

- Overall post-repository confidence: `92.6%`
- Calculation method: simple average of seven categories, rounded to one decimal.
- Every critical acceptance criterion directly proven: `No` before browser — real user-surface portions of AC-026 remained indirect.
- Any applicable category below `90%`: `Yes` — user-surface/browser confidence 84%.
- Default clean-confidence target of 95% met: `No` before browser.
- Material residual risks: real CSS token output, collapse visibility, localized accessibility in Chromium, and cross-surface reactive parity.

## Broader Validation Decision

- Decision: `Required`
- Selected execution mode: `Browser`
- Specific gap: real Chromium/Nuxt/Tailwind rendering, collapse visibility, reactive final transition, computed solid colors/no animation, localized accessible DOM, and independence across both production surfaces.
- Why it materially improves confidence: the changed boundary is presentation. A browser engine directly evaluates the production components, styles, reactivity, and accessibility attributes that happy-dom component tests only approximate.
- Expected confidence after validation: met; final 97.1% is recorded in the execution report.
- Browser-specific rationale: required for this user-facing visual correction; actual Electron is unnecessary because no shell boundary changed.

## Desktop Application Validation Decision

- Framework: Electron wrapping the same Nuxt renderer.
- Relevant instructions: `autobyteus-web/README.md` web development and desktop build sections.
- Web-equivalent behavior: all SR-006 behavior is ordinary Vue/Nuxt DOM, styling, localization, and reactivity.
- Shell-specific behavior: none.
- Chosen approach: local Chrome against an owned Nuxt fixture page using production components.
- Effect on any already-running desktop application: `None`.
- Not directly proven: packaged Electron pixels; negligible because no IPC/preload/window/packaging or shell CSS boundary changed. Delivery remains responsible for rebuilding the superseded package.

## Live Environment And Fixture Plan

- Startup: probe copies its retained fixture to an otherwise absent temporary page, selects an ephemeral `127.0.0.1` port, starts Nuxt dev, waits for the route, then launches headless local Chrome.
- Environment: no backend, auth, user data, or external services; deterministic local presentation data only.
- Fixtures: one team definition with exact active and inactive siblings in history and running representations; varied member statuses, subscription/action/pending flags; reactive controls for collapse, independence mutations, locale, and final settlement.
- Journeys: inspect expanded mixed siblings; collapse group and verify parent remains visible/active; mutate unrelated facts and verify no dot changes; settle final active run and verify all exact/parent dots become inactive; switch locale and verify accessible labels.
- Evidence: JSON assertions, Nuxt log, browser events, screenshots before/after transition, computed styles, animation names, semantic attributes.
- Cleanup: close pages/contexts/browser; terminate only the probe-owned Nuxt process group; remove only the installed fixture page; verify no owned process remains.

## Temporary Executable Validation Plan

None. The browser coverage belongs in the repository as a durable probe because it validates a user-visible contract that can regress independently of unit tests.

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Packaged Electron rendering | No shell-specific source changed; browser exercises the shared renderer directly | Negligible SR-006 risk | Delivery rebuilds the superseded package after API/E2E/test review. |
| Authenticated real running-team backend journey | No API/store/lifecycle source changed; deterministic fixture isolates the exact presentation contract and avoids external state | Low; upstream boolean provenance remains accepted by API-REV-002 | None unless browser evidence exposes a source mismatch. |
| Repository-wide frontend typecheck | Current package records 5,457 baseline diagnostics at 8 GB and no IR-005 changed-file hit | Existing repository debt, not hidden as pass | Keep prior fresh implementation/review evidence; use runtime compilation and focused tests for current scope. |

## Ambiguities Or Reroute Triggers

None identified. Any browser observation contradicting AC-026 will be recorded as a fresh failure and routed through `code_reviewer` for origin classification.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes — completed`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes` — add the browser probe and deterministic fixture; update/remove none.
- Post-repository confidence: `92.6%` before the required browser run.
- Broader validation decision: `Required — Browser; completed Pass for 4/4 scenarios`
- Reroute Required Before Validation Execution: `No`
- Recommended Recipient If Reroute Required: `N/A`
- Notes: Because durable coverage will be added, any Pass returns through `code_reviewer` for proportional test-code review before delivery.
