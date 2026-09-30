# API/E2E Coverage Investigation — chat-composer-polish

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/thinking-selector-auto-enable/tickets/in-progress/chat-composer-polish/requirements-doc.md` (Approved; SR-002 content)
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/thinking-selector-auto-enable/tickets/in-progress/chat-composer-polish/investigation-notes.md`
- Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/thinking-selector-auto-enable/tickets/in-progress/chat-composer-polish/solution-revision-record.md` (SR-003)
- Design Spec (required on every route): `/Users/normy/autobyteus_org/autobyteus-worktrees/thinking-selector-auto-enable/tickets/in-progress/chat-composer-polish/design-spec.md` (Ready)
- Designer handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/thinking-selector-auto-enable/tickets/in-progress/chat-composer-polish/handoff-architecture-design-complete.md`
- Supplemental Task Artifacts: None
- Design Review Report: `N/A — not applicable` (direct route)
- Architecture Review Revision Record: `N/A — not applicable` (direct route)
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/thinking-selector-auto-enable/tickets/in-progress/chat-composer-polish/implementation-handoff.md`
- Implementation Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/thinking-selector-auto-enable/tickets/in-progress/chat-composer-polish/implementation-revision-record.md` (IR-001)
- Code Review Report: `N/A — not applicable` (direct low-risk route)
- Code Review Revision Record: `N/A — not applicable`
- Delivery Revision Record (delivery re-entry only): N/A
- Relevant Delivery Revision IDs: N/A
- API/E2E Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/thinking-selector-auto-enable/tickets/in-progress/chat-composer-polish/api-e2e-revision-record.md` (created after the first completed result)
- Current API/E2E Revision ID: `N/A` (API-REV-001 once round 1 completes)
- API/E2E Test-Case Ledger: `/Users/normy/autobyteus_org/autobyteus-worktrees/thinking-selector-auto-enable/tickets/in-progress/chat-composer-polish/api-e2e-test-case-ledger.md`
- Current Investigation Round: 1
- Trigger: Direct-route implementation handoff from `implementation_engineer` (IR-001, commit `3c7ad1ad0`)
- Prior Investigation Reviewed: None (first round)
- Latest Authoritative Investigation: this file

## Routing Classification

- Task size: `Medium`
- Architectural risk: `Low`
- Input route: `Direct Low-Risk`
- Successful-output route: `Delivery`
- Proportional test-code review decision: `Not Required — direct low-risk route`

## Current Requirement And Design Basis

These behaviors must be proven:

- **Thinking (REQ-001, 001a, 002, 003, 004; AC-001–005).** Switch-bearing schemas show one merged list in the new-chat thinking menu: `Off · effort levels`, or `Off · On` when there is no effort list. Budget and display settings sit below a divider. Picking any dependent value turns thinking on and stores the chosen value in one action. Exactly one primary item is checked. The trigger shows Off / level / On, with a muted bulb when off. Off works in one click.
- **Run-config form (REQ-008; AC-010).** Changing an Advanced dependent setting while the Thinking toggle is off turns the toggle on. Automatic default and sanitize writes do not.
- **Preserved (AC-006).** OpenAI, Gemini, GLM and other non-switch schemas keep the per-parameter menu and stored values.
- **Workspace search (REQ-005, 006, 009; AC-007, 008; QR-001).** A search row is focused on open and filters by name or path, case-insensitively. There is an empty state. ArrowDown/ArrowUp/Enter/Escape work, and "Open another folder…" stays available.
- **Layout (REQ-007; AC-009).** The bias changes from `pb-[14vh]` to `pb-[6vh]`, so the composer sits about 4vh lower. Nothing overlaps or is clipped at about 700px height. The final offset is user-verified.
- **Design refinement A-1 (handoff).** Merged effort options use explicit-choice semantics (`applyThinkingParamChoice`), so re-picking the stored effort while Off still turns thinking on.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 chat thinking dependent pick auto-enables | Changed | REQ-001/001a, AC-001–003 | Unit + component; browser journey with the real Claude SDK schema and the launched run's recorded `llmConfig` |
| BEH-002 one checked item; secondary checks hidden while Off | Changed | REQ-002, AC-004, QR-002 | Component + browser DOM `aria-checked` |
| BEH-003 trigger label and bulb tint | Changed | REQ-003, AC-001/004 | Component + browser computed color |
| BEH-004 one-click Off; a level re-enables | Preserved/Changed | REQ-004, AC-005 | Component + browser |
| BEH-001 (REQ-008) form auto-enable | Changed | AC-010 | Component; browser on the real run-settings form (historical projection path) with a backend save |
| AC-006 non-switch schemas | Preserved | design parameters mode | Unit parity specs; browser check on a real non-switch catalog model when available |
| BEH-005 workspace search | Added | REQ-005/006/009, AC-007/008 | Component; browser at desktop width with many workspaces (scrolling list) |
| BEH-006 composer offset | Changed | REQ-007, AC-009 | Browser geometry at ~700 and ~1000px heights; user verification remains the final visual authority |
| Removed: two-group menu for switch schemas; raw writes; select-option-on-open focus | Removed | design Removal Plan | Browser asserts that no `chat-thinking-option-thinking_enabled-*` group appears in merged mode |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | No | None; the server is unchanged | N/A | Server consumes stored `llmConfig` as before | Recorded run config via GraphQL |
| API / transport / contract | No (shape unchanged) | Values the UI sends in `llmConfig` | None directly | Whether the chosen config reaches the created run unchanged through the draft→launch path | Live API read of `getAgentRunResumeConfig` after a browser launch |
| Frontend component / state | Yes | Adapter, menu model, `ChatThinkingControl`, `ModelConfigSection`, `ChatWorkspaceMenu` | Unit/component specs with fixture schemas | Real catalog schemas (SDK-reported effort levels); real store wiring | Browser |
| Browser integration / user journey | Yes | New-chat composer menus, run-settings form | jsdom only | Desktop-width anchored popovers, focus, keyboard, scroll, real layout | Browser (headless Chrome, dev path) |
| Authentication / session / permissions | No | — | — | — | — |
| Desktop renderer / web-equivalent UI | Yes | Same renderer as the browser | — | Covered by the web-equivalent browser path | Browser |
| Desktop shell / Electron-specific integration | No | No main/preload/IPC change | — | — | None |
| Process / lifecycle | No | — | — | — | — |
| Persisted-data transition | No (`Not Affected`) | Existing stored `{thinking_enabled:false, reasoning_effort:'medium'}` must read as Off | Menu-model spec | Real recorded run config read by the form | Browser run-settings form on a run recorded with Off |
| Worker / queue / distributed | No | — | — | — | — |
| External integration | Indirect | Claude SDK runtime reports the model catalog and effort levels | None | Real SDK effort list shape | Owned backend with the real Claude SDK catalog |

## Project Execution Discovery

- Assigned worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/thinking-selector-auto-enable` (branch `codex/thinking-selector-auto-enable` @ `3c7ad1ad0`)
- Project type: pnpm monorepo. Nuxt 3 / Vue 3 renderer (`autobyteus-web`), Node/TypeScript server (`autobyteus-server-ts`), Electron shell.
- Project testing guideline: `/Users/normy/autobyteus_org/autobyteus-worktrees/thinking-selector-auto-enable/TESTING.md`. No closer `TESTING*.md` exists under `autobyteus-web`.
- Conflicting, missing, or unclear instructions: TESTING.md says `pnpm -C autobyteus-web test:nuxt`. The worktree needs `NUXT_TEST=true` (the IE used `pnpm exec cross-env NUXT_TEST=true vitest run`), and `autobyteus-web/AGENTS.md` says to add `--run`. Either works. `vue-tsc` is not installed.
- Required secrets: no provider API keys are needed. The Claude SDK runtime uses the locally installed, logged-in `claude` CLI (2.1.283) through the sanitized `HOME`, the same path as the existing `chat-entry-live` probe. No secret values are recorded.

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `TESTING.md` | Workspace testing guideline | Renderer UI or client–server behavior that also runs in a browser → web unit tests plus a browser dev-path probe (`autobyteus-web/tests/e2e/*`, `test:e2e:<name>` scripts). Never touch the user's running AutoByteus or `~/.autobyteus`. Assertions first; screenshots are supporting. Stop what you started. Keep artifacts in the ticket or test-output folder. |
| `autobyteus-web/AGENTS.md` | Web developer guide | Colocated `__tests__`; run vitest once with `--run`; never `git add .` |
| `autobyteus-web/package.json` | Scripts | `test:nuxt`, `test:e2e:*` probe scripts |
| `autobyteus-web/tests/e2e/chat-entry-live-probe.mjs` | Existing live chat probe | Owned temp data root, `prisma migrate deploy`, `dist/app.js` on free ports, `pnpm dev` with `BACKEND_NODE_BASE_URL`, playwright-core + system Chrome, sanitized env, full cleanup |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Backend (worktree build) | `autobyteus-server-ts` | `node dist/app.js --host 127.0.0.1 --port <free> --data-dir <owned>/server-data` | SQLite in the owned root; free port | `GET /rest/health` | SIGTERM of the owned process group |
| Frontend (Nuxt dev) | `autobyteus-web` | `pnpm dev --host 127.0.0.1 --port <free>` with `BACKEND_NODE_BASE_URL` | Free port | `GET /chat` 200 | SIGTERM of the owned process group |
| Browser | — | playwright-core `chromium.launch` with system Chrome, headless | Own context; locale en-US | — | `browser.close()` |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| About 14 user workspaces (incl. two "mcps" names, one path-only match) | Folders under the owned root + GraphQL `createWorkspace` | Owned temp root only | Owned root removed |
| Claude SDK model with `thinking_enabled` + `reasoning_effort` | Real runtime catalog (`providerModelCatalogSnapshots`) | Uses the local `claude` CLI login; no AutoByteus data touched | N/A |
| Launched chat runs | Browser send on the new-chat page | Tiny prompt; runs are terminated by the probe | Owned root removed |

## Persisted Data Transition Coverage Basis

- Approved decision: `Not Affected`
- References: design-spec "Persisted Data / State Transition Decision"; handoff "Persisted Data Transition Check"
- Representative existing data: a run recorded with the default Off config `{thinking_enabled:false, reasoning_effort:'medium'}`. It must show as Off in the run-settings form and in the chat menu model.
- Evidence planned: browser run-settings form on a real recorded Off run (toggle reads Off); the menu-model spec for the chat side.
- Migration scenarios: N/A
- Upstream ambiguity: none

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Req / AC | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `utils/__tests__/llmThinkingConfigAdapter.spec.ts` (existing + 3 new cases) | Family detection, toggle defaults, dependent keys, choice and diff semantics | REQ-001, 008, AC-002/003/006 | Still Valid | Assertions match design + A-1 | Run |
| `components/chat/__tests__/chatThinkingMenu.spec.ts` (new, 9) | Merged/parameters shapes, design examples table, DeepSeek, budget, display, parity | AC-001–006 | Still Valid | Matches design examples | Run |
| `components/chat/__tests__/ChatThinkingControl.spec.ts` (new, 6) | Mounted control: muted bulb, pick emits, Off/level, budget, parameters | AC-001, 003–006 | Still Valid | — | Run |
| `components/chat/__tests__/ChatWorkspaceMenu.spec.ts` (new, 5) | Focus, filter, empty state, ArrowDown/Enter, Escape/reset | AC-007, 008, QR-001 | Still Valid | — | Run |
| `components/chat/__tests__/chatComposerMenus.spec.ts` (+1) | `filterWorkspaceOptions` | REQ-005 | Still Valid | — | Run |
| `components/workspace/config/__tests__/ModelConfigSection.spec.ts` (+3) | Advanced auto-enable (Claude, DeepSeek); unrelated/automatic writes stay off | AC-010 | Still Valid | — | Run |
| Other `components/workspace/config`, `components/launch-config`, `stores/__tests__` specs | Shared form/launch/draft behavior | Regression (shared `ModelConfigSection`) | Still Valid | — | Run |
| `tests/e2e/chat-entry-live-probe.mjs` C03 | Counts the thinking trigger only | — | Out Of Scope (does not assert menu contents) | Grep | None |

## Stale Or Obsolete Coverage Decisions

None. No existing durable test asserts the removed two-group menu for switch-bearing schemas; `ChatThinkingControl` had no spec before this change.

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Req / AC / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| E2E-T01…T07 | Real-browser composer journeys at desktop width against the real Claude SDK catalog; launched-run `llmConfig`; run-settings form; workspace search; layout geometry | AC-001, 004–010, REQ-001–009, QR-001/002 | `autobyteus-web/tests/e2e/chat-composer-polish-probe.mjs` + `package.json` script `test:e2e:chat-composer-polish` | TESTING.md prescribes a browser dev-path probe for renderer UI. jsdom cannot prove anchored popover geometry, real focus, scrolling, layout offset, or that the chosen config reaches the created run. |

## Durable Coverage To Update

None planned.

## Durable Coverage To Remove

None.

## Repository Coverage Execution Plan And Results

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| R1 | `pnpm exec cross-env NUXT_TEST=true vitest run components/chat utils/__tests__/llmThinkingConfigAdapter.spec.ts utils/__tests__/llmConfigSchema.spec.ts components/workspace/config components/launch-config stores/__tests__` | `autobyteus-web` | Adapter, menu model, controls, form, workspace menu, draft/launch stores | Pass: 807/807 tests in 85 files. 1 file fails to load (`applicationHostStore.spec.ts`, unbuilt `@autobyteus/application-sdk-contracts`, pre-existing) | `api-e2e-evidence/R1-focused-vitest.log` |
| R2 | `pnpm exec cross-env NUXT_TEST=true vitest run` (full `test:nuxt`) | `autobyteus-web` | Regression across the renderer | Pass (no regression): 3357 passed / 8 failed in 11 files. All are the IE's pre-existing baseline files except `managedExtensionService.spec.ts`, which passes in isolation (load-flaky; electron code untouched). `UserMessageStoredUploadNames` passed this run. No failure touches a changed file. | `api-e2e-evidence/R2-full-test-nuxt.log` |

## Test-Case Ledger Plan

- Ledger required: `Yes`. Two repository runs plus seven browser journeys, including real runtime launches, make this multi-case and interruption-prone.
- Canonical ledger path: `/Users/normy/autobyteus_org/autobyteus-worktrees/thinking-selector-auto-enable/tickets/in-progress/chat-composer-polish/api-e2e-test-case-ledger.md`
- Ledger initialized before execution: `Yes`
- Case granularity: one repository run or one browser journey

| Case ID | Case / Journey | Req / AC IDs | Boundary / Execution Surface | Planned Command Or Entry Point | Planned Order | Evidence Expected |
| --- | --- | --- | --- | --- | --- | --- |
| R1 | Focused vitest | all | Repository | see above | 1 | log |
| R2 | Full `test:nuxt` | regression | Repository | see above | 2 | log, failure set vs the IE baseline |
| T01 | Claude SDK merged menu at 1440×900: Off state, High, Off, Medium, Off→Medium (A-1) | AC-001, 004, 005; REQ-001a, 002, 003; QR-002 | Browser + draft store | `test:e2e:chat-composer-polish` | 3 | DOM/aria, bulb color, draft `llmConfig` |
| T02 | Launch at High → recorded run `llmConfig` | AC-001, REQ-001 | Browser → backend GraphQL | same | 4 | `getAgentRunResumeConfig` |
| T03 | Launch at Off → recorded Off → ⚙ run settings: Advanced effort change turns the toggle on → save → recorded | AC-010, REQ-008, persisted Off read | Browser real form → backend save | same | 5 | toggle state, saved `llmConfig` |
| T04 | Non-switch schema keeps parameters mode (real catalog model when available) | AC-006 | Browser | same | 6 | DOM, draft `llmConfig` |
| T05 | Workspace search at desktop width, 14 workspaces: focus, filter, path match, empty state, keys, IME Enter guard, Escape, reset | AC-007, 008; REQ-005, 006, 009; QR-001 | Browser | same | 7 | DOM, focus, selection, trigger |
| T06 | Layout at 1440×1000 and 1280×700: 6vh padding, ~4vh lower than 14vh, no overlap or clipping, menus inside the viewport | AC-009, REQ-007 | Browser geometry | same | 8 | bounding boxes, screenshots |
| T07 | Narrow bottom sheet (413×738) smoke: merged menu and workspace search | REQ-001a, 005 | Browser | same | 9 | DOM |

## Post-Repository Confidence Scorecard (Mandatory)

| Confidence Category | Score | What Supports The Score | Remaining Uncertainty | Additional Validation That Could Improve It |
| --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 85% | Every AC has a unit/component assertion (adapter, menu model, control, workspace menu, form) | AC-009 geometry and the launched-run config (AC-001's "manual" half) are unproven | Browser layout measurement; launch through the real send path |
| Changed-boundary execution directness | 80% | Components are mounted and driven through their events | jsdom has no layout, so real popover anchoring, scrolling and focus are unproven | Real browser at desktop width |
| Cross-boundary integration realism and mock gap | 70% | Store wiring is covered by existing store specs | Schemas are fixtures, not the real Claude SDK catalog; the draft→launch→recorded config path is not exercised; the run-settings form historical projection is not exercised with a real recorded run | Owned backend + real catalog + real launch + real form save |
| Environment, configuration, identity, and fixture fidelity | 75% | Worktree install, Nuxt test env | No real backend or runtime | Owned backend on a temp root |
| Failure, edge-case, lifecycle, and recovery evidence | 85% | A-1 edge, clearing (Default) edge, automatic writes, IME guard, empty state (component) | Real keyboard/focus order across a scrolling list; persisted Off read by the real form | Browser keyboard journey; recorded Off run in the form |
| User-surface, browser, and desktop-shell confidence | 60% | IE's narrow 413×738 rendered check (not API/E2E evidence) | Desktop width, ~700/~1000px heights, and anchored menus are unverified | Browser probe at 1440×900/1000 and 1280×700 |
| Durable regression coverage quality and relevance | 85% | 5 new/updated specs with AC-tagged names | No durable browser-level regression for the composer journeys | Durable dev-path probe |

- Overall post-repository confidence: 77% (simple average)
- Every critical acceptance criterion directly proven: `No` (AC-009 geometry and launched-run config not yet)
- Any applicable category below `90%`: `Yes`, all seven
- Default clean-confidence target of `95%` met: `No`
- Material residual risks: real-browser layout/popover behavior; real catalog schema shapes; the draft→launch→recorded config path; the real run-settings form

## Broader Validation Decision

- Decision: `Required` (confirmed after R1/R2: 77% overall, every category below 90%)
- Selected execution mode: `Browser` (dev-path probe per TESTING.md), plus a live API read of the created runs
- Confidence gap addressed: desktop-width anchored popovers, real focus and keyboard behavior, real catalog schemas, the draft→launch→recorded `llmConfig` path, the real run-settings form (historical projection), and layout at ~700/~1000px heights
- Browser-specific rationale: the change is renderer-only UI behavior, and jsdom specs cannot prove geometry, focus, scrolling, or the launch path
- Desktop shell: not affected; the web-equivalent renderer is sufficient
- Expected confidence after the selected validation: ≥95%

## Desktop Application Validation Decision

- Desktop framework / shell: Electron (unchanged by this ticket)
- Instructions used: `TESTING.md` "Choosing the path": renderer UI → web unit tests + a browser dev-path probe
- Web-equivalent behavior: all changed behavior (Nuxt renderer components)
- Shell-specific or lifecycle behavior: none changed
- Chosen approach: headless Chrome against the worktree Nuxt dev server + worktree backend (owned)
- Effect on any already-running desktop application: `None`. The user's AutoByteus and other isolated instances and Nuxt servers seen in `ps` were not touched; only free ports and an owned temp root were used.
- Behavior not directly proven: none material. The Electron shell renders the same renderer.

## Live Environment And Fixture Plan

- Startup order: `prisma migrate deploy` (owned SQLite) → backend `dist/app.js` on a free port → `createWorkspace` ×14 → `pnpm dev` (Nuxt) on a free port with `BACKEND_NODE_BASE_URL` → headless Chrome (playwright-core)
- Environment choices: sanitized env (HOME, PATH, USER, LANG, TMPDIR, SHELL, TERM only). `APP_ENV=development`, `DB_TYPE=sqlite`. Locale en-US. Viewports 1440×900 (default), 1440×1000, 1280×700, 413×738.
- Health checks: `/rest/health`, then `GET /chat` 200
- Seed data: 14 workspace folders under the owned root (one under `nested-dir/` for the path match)
- Identities: local `claude` and `codex` CLI logins (catalog + two short Claude SDK runs); no AutoByteus secrets
- Journeys: T01–T07 (see ledger)
- Evidence: DOM/aria/focus/computed style assertions, draft store reads, GraphQL `getAgentRunResumeConfig`, screenshots (supporting), backend/frontend logs, evidence JSON
- Cleanup: terminate the runs; SIGTERM the owned process groups; remove the owned temp root

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| DeepSeek V4 and Anthropic API budget/adaptive models in the real browser | Autobyteus-runtime provider catalogs need API keys; none are provisioned in the owned root | Low: AC-002/003 verification is specified as unit/component; adapter and menu specs cover the exact schema shapes | None |
| Final aesthetic offset | AC-009 verification is "Manual user verification" | Low | User verification at delivery |

## Ambiguities Or Reroute Triggers

None. Observations during execution, none of which is a reroute trigger:

- The new-chat thinking control appears 1.8–2.3 s after page load for a preselected model, once its runtime catalog arrives. This is existing behavior in the unchanged `chatDraftModelControls.ts`, outside this ticket's scope.
- The worktree lacked `autobyteus-application-sdk-contracts/dist`, so the backend could not start and the pre-existing application specs fail. This is an environment gap: it was built for the run and removed afterwards.

## Investigation Decision

- Proceed to API/E2E execution: `Yes`
- Repository-resident durable coverage will be added: `Yes` (browser dev-path probe + script)
- Post-repository confidence: 77%
- Broader validation decision: `Required` (Browser)
- Reroute required before validation execution: `No`
- Notes: Round 1 executed. Final result, confidence and evidence are in `api-e2e-execution-coverage-report.md`.
