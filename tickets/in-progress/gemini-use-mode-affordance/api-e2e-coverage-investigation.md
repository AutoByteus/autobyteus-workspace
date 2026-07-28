# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/gemini-use-mode-affordance/tickets/in-progress/gemini-use-mode-affordance/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/gemini-use-mode-affordance/tickets/in-progress/gemini-use-mode-affordance/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/gemini-use-mode-affordance/tickets/in-progress/gemini-use-mode-affordance/design-spec.md`
- Supplemental Task Artifacts: `/Users/normy/autobyteus_org/autobyteus-worktrees/gemini-use-mode-affordance/tickets/in-progress/gemini-use-mode-affordance/ui-ux-spec.md`
- Solution Revision Record: `N/A`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/gemini-use-mode-affordance/tickets/in-progress/gemini-use-mode-affordance/implementation-handoff.md`
- Implementation Revision Record: `N/A`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/gemini-use-mode-affordance/tickets/in-progress/gemini-use-mode-affordance/code-review-report.md`
- Code Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/gemini-use-mode-affordance/tickets/in-progress/gemini-use-mode-affordance/code-review-revision-record.md`
- API/E2E Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/gemini-use-mode-affordance/tickets/in-progress/gemini-use-mode-affordance/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- Current Investigation Round: `1`
- Trigger: Implementation source review pass for commit `a00dc0ee2beb3c162d8c2bd2988d758d203320d5`.
- Prior Investigation Reviewed: `N/A`
- Latest Authoritative Investigation: This file.

## Current Requirement And Design Basis

The approved change is a presentation-only Gemini settings affordance correction. For a configured, non-active Gemini option, the existing 44px activation button must render Iconify `heroicons:check-circle`; its accessible name/title, `data-testid`, click payload, disabled behavior, focus/hover classes, and parent activation path remain unchanged. The activating state must continue to render only the spinner and remain disabled. Active options keep the existing active marker and have no activation action. Not-configured/unavailable options must not gain an activation action. No API, persistence, authentication, migration, compatibility, or Electron-shell contract changed.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| `BEH-001` configured non-active idle glyph | Changed | `requirements.md`, `design-spec.md`, `ui-ux-spec.md`, reviewed `GeminiConfigurationOptionCard.vue` | Focused component assertion plus browser-rendered Iconify SVG check. |
| `BEH-002` activation/pending semantics | Preserved | Implementation handoff and code review report | Focused component test verifies spinner substitution and disabled state; no live click used to avoid mutating shared server state. |
| `BEH-003` active marker and action gating | Preserved | Implementation handoff and code review report | Focused component test and live/emulated browser checks verify active marker/no action and unavailable gating. |
| `BEH-004` parent settings journey | Preserved | `GeminiSetupForm.vue`, `ProviderAPIKeyManager.vue`, code review report | Live Nuxt route through Settings → Gemini exercised with real backend data; idle state used a read-only GraphQL response emulation. |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | No | None | No backend files changed. | None in scope. | None. |
| API / transport / contract | No | None | Existing Apollo contract/runtime tests; live backend query observed. | No API contract change. | Live browser route. |
| Frontend component / state | Yes | `GeminiConfigurationOptionCard.vue` idle Iconify leaf. | 7 focused tests; 22 provider API-key tests; 185 settings tests attempted. | Pixel/runtime Iconify rendering is not provided by the stubbed unit test. | Browser. |
| Browser integration / user journey | Yes | Settings provider selection and Gemini cards. | Live Nuxt route and real backend; emulated idle config browser path. | Shared backend's current data had only active Vertex Express, so idle configured data required response emulation. | Browser with read-only fixture. |
| Authentication / session / permissions | No | None | No auth boundary changed. | N/A. | None. |
| Desktop renderer / web-equivalent UI | Yes | Same Nuxt/Vue renderer used by Electron. | Browser dev server exercises renderer; real Iconify SVG observed. | Electron preload/IPC not involved. | Browser is sufficient for web-equivalent path. |
| Desktop shell / Electron-specific integration | No | None | No Electron source changed. | Shell behavior not relevant to presentation-only leaf. | None. |
| Process / lifecycle | No | None | No lifecycle change. | N/A. | None. |
| Persisted-data transition | No | None; approved `Directly Usable — No Migration`. | Handoff confirms presentation-only change. | N/A. | None. |
| Worker / queue / distributed coordination | No | None. | No such code changed. | N/A. | None. |
| External integration | No | None. | No external provider call needed to render this state. | Browser idle state used a read-only GraphQL fixture. | None. |

## Project Execution Discovery

- Assigned task worktree / workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/gemini-use-mode-affordance`
- Project type and runtime stack: Nuxt 3.21.1 / Vue 3.5.28 / Vite 7.3.1 frontend, Vitest 3.2.4 with Nuxt test utilities, Iconify Vue runtime, browser validation with Playwright Core and installed Google Chrome.
- Conflicting, missing, or unclear project instructions: None material. Existing implementation handoff notes browser connector/Playwright limitation; local Chrome was available for this round.
- Required environment variables or secrets available: `N/A` for this presentation-only check. Backend URL was set to the already-running local node; no secret values recorded.

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/gemini-use-mode-affordance/README.md` | Workspace setup and project map | Use pnpm workspace; frontend is `autobyteus-web`. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/gemini-use-mode-affordance/autobyteus-web/AGENTS.md` | Web testing guidance | Colocated tests; use `pnpm test:nuxt ... --run`. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/gemini-use-mode-affordance/autobyteus-web/GEMINI.md` | Duplicate web developer/testing guidance | Vitest Nuxt tests; always use `--run`. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/gemini-use-mode-affordance/autobyteus-web/README.md` | Browser probe and frontend runtime instructions | Browser development at a local Nuxt URL; Playwright Core may need an explicit Chrome executable. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/gemini-use-mode-affordance/autobyteus-web/package.json` | Authoritative scripts/dependencies | `test:nuxt`, `dev`; Playwright Core and `@iconify/vue` are installed. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/gemini-use-mode-affordance/autobyteus-web/vitest.config.mts` | Test runner configuration | Nuxt environment with happy-dom and localization/websocket setup. |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Existing local backend node | Existing process owned outside this run | Already running on `http://127.0.0.1:29695`; not started/stopped by this run | Existing packaged AutoByteus server; read-only query observed. | `curl -I http://127.0.0.1:29695/` returned HTTP 404; browser `/rest/health` returned 200 `status: ok`. | No action; process was not owned by this run. |
| Target Nuxt dev server | `autobyteus-web` | `BACKEND_NODE_BASE_URL=http://127.0.0.1:29695 pnpm dev --host 127.0.0.1 --port 29696` | Worktree frontend; isolated port 29696. | Nuxt reported `http://127.0.0.1:29696/`; browser loaded `/settings`. | Sent Ctrl-C; port 29696 confirmed closed. |
| Chrome / Playwright Core | `autobyteus-web` | Inline temporary Node probe; executable `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome` | Headless Chrome, 1440x1000, DPR 1. | Actual Iconify SVG rendered in DOM. | Browser closed after each probe. |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Live provider settings | Existing backend provider settings query | Read-only; current state was Vertex Express active and no non-active configured Gemini row. | No mutation. |
| Configured non-active Gemini state for browser proof | Playwright route interception only for `GetGeminiSetupConfig`, returning `AI_STUDIO` configured and `VERTEX_EXPRESS` active | Temporary in-memory response emulation; provider list and all other calls remained real. No credentials or persistence changed. | Browser context closed; no fixture retained beyond evidence log/screenshot. |

## Persisted Data Transition Coverage Basis

- Approved decision: `Directly Usable — No Migration`
- Design-spec and implementation-handoff references: `design-spec.md` and `implementation-handoff.md` both state presentation-only change with no persisted shape or reader/writer change.
- Representative existing-data setup and required behavior: Not applicable; no persisted data is read or written by the changed leaf.
- Evidence planned for approved outcome: Existing component and settings runtime tests plus live settings route; no migration command required.
- Upstream ambiguity or reroute required: None.

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/components/settings/providerApiKey/__tests__/GeminiSetupForm.spec.ts` | Gemini option rendering, active marker, activation event, save flow, disabled paths, refreshed setup | `BEH-001`–`BEH-004` | Still Valid | Existing 6 scenarios plus reviewed idle-icon and spinner assertions; focused run passed 7/7. | Retain; no additional durable test needed. |
| `autobyteus-web/components/settings/__tests__/ProviderAPIKeyManager.spec.ts` | Provider manager renders Gemini specialized UI and wires parent action | `BEH-004` | Still Valid | Related run passed 4/4. | Retain; rerun. |
| `autobyteus-web/components/settings/providerApiKey/__tests__/useProviderApiKeySectionRuntime.spec.ts` | Provider/Gemini runtime state, command and activation fencing | `BEH-002`, `BEH-004` | Still Valid | Included in 22/22 provider API-key suite. | Retain; rerun. |
| `autobyteus-web/components/settings/providerApiKey/__tests__/providerSettingsApolloContract.spec.ts` | Provider settings query contract | API boundary unchanged | Out Of Scope | Included in provider API-key suite; passes with existing Apollo deprecation stderr. | Retain; no changes. |
| Other colocated provider API-key/settings tests | Adjacent provider behavior | No unrelated acceptance criteria | Out Of Scope | Settings suite exercised adjacent coverage. | Retain; no changes. |

## Stale Or Obsolete Coverage Decisions

No durable coverage is stale or obsolete. The old empty-ring assertion was not present in the durable test; the new approved glyph assertion replaced no obsolete test behavior.

## Durable Coverage To Add

None. Existing focused coverage was updated by implementation and independently validates the changed state; adding a separate browser test would duplicate a narrow component assertion and the project has no Gemini-specific durable browser harness.

## Durable Coverage To Update

None for this API/E2E round. The implementation's `GeminiSetupForm.spec.ts` update is already included in the source review package and remains valid.

## Durable Coverage To Remove

None.

## Repository Coverage Execution Plan And Results

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| 1 | `pnpm test:nuxt components/settings/providerApiKey/__tests__/GeminiSetupForm.spec.ts --run --reporter=verbose` | `autobyteus-web`; shared dependency symlink and generated `.nuxt` from implementation setup | Direct Gemini component states; 7 tests | Pass | `/Users/normy/autobyteus_org/autobyteus-worktrees/gemini-use-mode-affordance/tickets/in-progress/gemini-use-mode-affordance/evidence/api-e2e-focused-gemini-vitest.log` |
| 2 | `pnpm test:nuxt components/settings/__tests__/ProviderAPIKeyManager.spec.ts --run --reporter=verbose` | `autobyteus-web` | Parent manager/provider selection boundary; 4 tests | Pass | `/Users/normy/autobyteus_org/autobyteus-worktrees/gemini-use-mode-affordance/tickets/in-progress/gemini-use-mode-affordance/evidence/api-e2e-manager-vitest.log` |
| 3 | `pnpm test:nuxt components/settings/providerApiKey --run --reporter=verbose` | `autobyteus-web` | All provider API-key tests; 5 files / 22 tests | Pass | `/Users/normy/autobyteus_org/autobyteus-worktrees/gemini-use-mode-affordance/tickets/in-progress/gemini-use-mode-affordance/evidence/api-e2e-provider-api-key-vitest.log` |
| 4 | `pnpm test:nuxt components/settings --run --reporter=dot` | `autobyteus-web` | Broader settings regression surface; 41 files / 185 tests | Fail, out-of-scope only | `/Users/normy/autobyteus_org/autobyteus-worktrees/gemini-use-mode-affordance/tickets/in-progress/gemini-use-mode-affordance/evidence/api-e2e-settings-vitest.log`; 40 files / 184 passed, unrelated `CodexFullAccessCard` wording assertion failed. Changed-path diff confirms no Codex source/test changes. |

## Post-Repository Confidence Scorecard (Mandatory)

| Confidence Category | Score | What Supports The Score | Remaining Uncertainty | Additional Validation That Could Improve It |
| --- | ---: | --- | --- | --- |
| Requirement and acceptance-criteria proof | 95% | Focused 7/7 tests cover icon identity, spinner substitution, active marker, actions, and gating; parent manager 4/4 passed. | Browser idle state is fixture-backed rather than current backend data. | None material; a real configured non-active backend row would remove the fixture caveat. |
| Changed-boundary execution directness | 95% | Component test directly mounts the changed card path; browser executes built Nuxt route and real Iconify runtime. | Unit Iconify child is stubbed. | None material after browser SVG evidence. |
| Cross-boundary integration realism and mock gap | 95% | Real Settings → ProviderAPIKeyManager → GeminiSetupForm route and real backend provider query were exercised; only Gemini config response was intercepted to avoid mutation. | No real backend state with configured non-active option was available. | A disposable isolated backend fixture with that state. |
| Environment, configuration, identity, and fixture fidelity | 95% | Worktree Nuxt dev server, real local backend health, actual Chrome, and project runtime configuration; no secrets required. | Idle-state API response was emulated. | Seed an isolated test node if available. |
| Failure, edge-case, lifecycle, and recovery evidence | 95% | Unit suite covers activating/disabled spinner, active marker, unavailable options, event payload, and refresh; browser confirms active/no-action and idle layout. | No live click/activation transition because it would mutate shared backend state; no Electron shell needed. | Isolated backend or durable browser fixture for live activation transition. |
| User-surface, browser, and desktop-shell confidence | 95% | Headless Chrome rendered the target route; actual SVG path, semantics, 44x44 hit area, active marker, and action gating were observed. Electron shell is unaffected/out of scope. | Screenshot is supporting evidence; no pixel-diff baseline. | None required for this narrow glyph change. |
| Durable regression coverage quality and relevance | 95% | Reviewed implementation test is colocated, deterministic, requirement-linked; provider runtime and parent suites pass. | No durable browser test exists for this leaf. | Add only if Gemini browser fixture becomes a project-supported reusable harness. |

- Overall post-repository confidence: `95%` (simple average of seven 95% applicable category scores)
- Calculation method: Simple average; all categories applicable and scored 95%.
- Every critical acceptance criterion directly proven: `Yes` (component tests plus browser DOM evidence; live backend state caveat is non-critical because no contract changed).
- Any applicable category below 90%: `No`.
- Default clean-confidence target of 95% met: `Yes` for repository evidence; broader browser validation is still recorded below.
- Material residual risks: No live backend configured non-active Gemini row was available without mutating shared data; Electron shell/IPC is not exercised but not relevant to the changed renderer leaf.

## Broader Validation Decision

- Decision: `Required` (before execution; completed in this round).
- Selected execution mode: `Browser` plus read-only live backend route.
- Specific confidence gap addressed: Live Iconify runtime rendering, actual 44px layout, parent settings route, and state gating were not proven by the mocked component test alone.
- Why selected mode materially improves confidence: It executes the worktree Nuxt renderer in Chrome and reaches the real Settings/provider manager path, proving actual SVG output rather than the unit stub.
- Expected confidence after selected validation: 95%.
- Browser-specific decision and rationale: Run; browser was available at `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`, unlike the earlier connector/Playwright environment. Use a read-only GraphQL fixture only for the missing idle configured state.
- If `Not Required`, evidence proving the real changed boundary: Not applicable.
- If `Blocked`, exact dependency: Not applicable; browser setup succeeded.

## Desktop Application Validation Decision

- Desktop framework / shell: Electron wrapper; no shell code changed.
- Relevant instructions: `autobyteus-web/README.md` and `ARCHITECTURE.md` distinguish browser renderer from Electron preload/IPC and recommend browser validation for web-equivalent behavior.
- Web-equivalent behavior: Settings provider selection and Gemini option rendering.
- Shell-specific or lifecycle behavior: None introduced or affected.
- Chosen validation approach and why: Browser Nuxt dev server; it proves the changed renderer leaf without touching the running packaged desktop process.
- Server/frontend setup when browser validation is used: Target worktree frontend on 29696; existing backend on 29695; target process stopped after validation.
- Effect on any already-running desktop application: `None`; the existing packaged app/backend on 29695 was not stopped or mutated.
- Behavior not directly proven and confidence consequence: Electron shell/IPC not tested; no material consequence for this DOM-only component change.

## Live Environment And Fixture Plan

- Startup order and commands: Reuse existing backend on 29695; start `BACKEND_NODE_BASE_URL=http://127.0.0.1:29695 pnpm dev --host 127.0.0.1 --port 29696`.
- Environment choices: Isolated frontend port 29696; headless Chrome 1440x1000 DPR 1.
- Health / readiness checks: Nuxt readiness log; browser `/rest/health` 200; page `/settings` loaded with no page errors.
- Seed data / fixtures: No persistent seed. Route-intercept `GetGeminiSetupConfig` only, setting AI Studio configured and Vertex Express active.
- Test identities/authentication/permissions: None required for local node.
- Requirement-linked journeys/scenarios: Open Settings, select Gemini, inspect configured non-active idle button, active marker/action omission, and not-configured action gating.
- Evidence to capture: Console JSON, DOM assertions, SVG path/class, bounding box, screenshot, and test logs.
- Owned processes and temporary state to clean: Nuxt process and browser contexts only; both closed. Port 29696 verified closed.

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| `E2E-GEMINI-001` | Playwright Core + Chrome at `/settings`; real backend; select Gemini | Real provider manager route and active/current-state rendering | Existing backend had only active configured state; no stable fixture harness in repository. |
| `E2E-GEMINI-002` | Same browser route with read-only `GetGeminiSetupConfig` response interception | Actual Iconify `heroicons:check-circle` SVG, semantics, 44x44 target, and configured non-active gating | Temporary emulation is environment evidence, not a durable test fixture; component test is the durable regression layer. |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Real backend configured non-active Gemini state | Current shared node has Vertex Express active and AI Studio/Vertex Project not configured; creating credentials/state would mutate shared data. | Low; state is directly covered by deterministic component test and browser response emulation. | None unless isolated backend fixture becomes available. |
| Live activation click and resulting backend transition | Would mutate shared local server configuration; no API change in this patch. | Low; existing component/runtime tests cover exact emitted payload and activation path. | None. |
| Electron preload/IPC/packaged app | No shell code changed; browser is the project-preferred equivalent path. | Low and out of scope. | None. |

## Ambiguities Or Reroute Triggers

| Issue | Classification | Evidence | Recommended Recipient |
| --- | --- | --- | --- |
| Broader settings suite has one unrelated `CodexFullAccessCard` wording failure (`Applies to new sessions.` expected; current text says `Applies to new non-auto-approved sessions.`). Neither Codex source nor test changed on this branch. | Local Fix, out of scope for this ticket | `/.../evidence/api-e2e-settings-vitest.log`; `git diff origin/personal...HEAD` shows no Codex path change. | `code_reviewer` for awareness only; do not reroute Gemini implementation. |

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `No`
- Post-repository confidence: `95%`
- Broader validation decision: `Required` and completed via Browser.
- Reroute Required Before Validation Execution: `No`
- Recommended Recipient If Reroute Required: `N/A`
- Notes: Scoped API/E2E result is Pass. The broader settings failure is unrelated to changed files and is preserved as an out-of-scope baseline signal.
