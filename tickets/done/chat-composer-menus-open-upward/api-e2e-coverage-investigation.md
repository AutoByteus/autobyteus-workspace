# API/E2E Coverage Investigation — chat-composer-menus-open-upward

## Investigation Meta

Ticket folder `T` = `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-composer-menus-open-upward/tickets/in-progress/chat-composer-menus-open-upward`

- Requirements Doc: `T/requirements-doc.md` (Approved, SR-002 baseline, current SR-004)
- Investigation Notes: `T/investigation-notes.md`
- Solution Revision Record: `T/solution-revision-record.md` (SR-004)
- Design Spec (required on every route): `T/design-spec.md`
- Supplemental Task Artifacts:
  - Product UI/UX spec (behavior-defining, user-confirmed): `/Users/normy/autobyteus_org/autobyteus-web-prototype/tickets/done/chat-composer-menus-open-upward/ui-ux-spec.md`
  - Visual references VIS-001–010: `/Users/normy/autobyteus_org/autobyteus-web-prototype/tickets/done/chat-composer-menus-open-upward/visual-references/`
  - Design handoff: `T/handoff-architecture-design-complete.md`
  - Implementation rendered check (evidence, not sign-off): `T/implementation-checks/rendered-check.mjs`, `T/implementation-checks/rendered/results.json`
- Design Review Report: `N/A — not applicable`
- Architecture Review Revision Record: `N/A — not applicable`
- Implementation Handoff: `T/implementation-handoff.md`
- Implementation Revision Record: `T/implementation-revision-record.md` (IR-001)
- Code Review Report: `N/A — not applicable` (direct low-risk route)
- Code Review Revision Record: `N/A — not applicable`
- Delivery Revision Record (delivery re-entry only): `N/A`
- Relevant Delivery Revision IDs: `N/A`
- API/E2E Revision Record (created after the first completed result): `T/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- API/E2E Test-Case Ledger: `T/api-e2e-test-case-ledger.md`
- Current Investigation Round: 1
- Trigger: `Implementation Complete` from `implementation_engineer`, IR-001 (SR-004), commit `67c9e2e5f`
- Prior Investigation Reviewed: none exists for this ticket
- Latest Authoritative Investigation: this file

## Routing Classification

- Task size: `Small`
- Architectural risk: `Low`
- Input route: `Direct Low-Risk`
- Successful-output route: `Delivery`
- Proportional test-code review decision: `Not Required — direct low-risk route`

## Current Requirement And Design Basis

On the new-chat page (`/chat`) at window widths ≥640px, the `@`, `/`, Workspace, Model and Thinking menus always open upward (REQ-001). `@`/`/` sit 6px above the composer card; Workspace, Model and Thinking sit above their trigger; the Model runtime flyout is bottom-aligned with its runtime row (`bottom: -5px`) and grows upward. Menus never flip down: max height = min(preferred, top of the positioning box − 6 − 16), rounded down, with preferred heights 300 / 300 / 420 / 360 / 240 and a flyout list max of min(320, row bottom + 5 − 12 − 10); lists scroll and header/footer rows stay visible (REQ-003). The column padding is `pt-[14vh] pb-10`, still flex-centered, which lowers the group by 10vh − 40px (REQ-002). The hint line stays directly under the composer and is never covered; the <640px bottom sheet and the running-conversation `/` menu are unchanged; menu contents, search, keyboard, focus and selection are unchanged (REQ-004).

Design: opt-in `{ placement: 'above' }` policy on `useAnchoredPopover`, measured from the menu's containing block; default `auto` unchanged for `useSkillTagMenu`.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 / REQ-001 — five menus + flyout open upward at ≥640px | Changed | requirements, UI spec "Menu placement", design map | Needs real-layout proof: jsdom unit tests stub geometry and cannot prove CSS placement |
| REQ-003 — never flip; shrink and scroll; header/footer visible | Added | DEC-003, UI spec "Height rule" | Needs real layout at short windows, with lists long enough to scroll |
| BEH-002 / REQ-002 — padding `pt-[14vh] pb-10` | Changed | DEC-002 | Needs computed-style and geometry proof; invalidates the `6vh` assertion in the existing probe |
| BEH-003 — <640px bottom sheet | Preserved | REQ-004, VIS-009 | Regression proof in a real browser |
| BEH-004 — running-conversation `/` menu | Preserved | REQ-004, VIS-010 | Needs a real run view; not rendered by the implementer |
| Menu content, search, keyboard, focus, selection | Preserved | REQ-004 | Existing polish probe T01/T05/T07 plus light checks in the new probe |
| `flyoutOffset` | Removed | design Legacy Removal Policy | Verified by source diff and flyout geometry |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | No | — | — | — | — |
| API / transport / contract | No | — | — | — | — |
| Frontend component / state | Yes | `useAnchoredPopover` policy; four chat menu components; `ChatNewSurface` padding | 21 new unit/component tests (jsdom, stubbed geometry) | Real CSS layout: containing block, `bottom-full`, flex shrink, scroll, clipping | Browser |
| Browser integration / user journey | Yes | New-chat composer menus in a real layout at several viewports | Existing browser probe `chat-composer-polish-probe.mjs` (T06 stale) | All of AC-001–AC-005 at the specified viewports | Browser dev-path probe |
| Authentication / session / permissions | No | — | — | — | — |
| Desktop renderer / web-equivalent UI | Yes | Same renderer code runs in Electron; behavior is web-equivalent | Same as above | None specific to the shell | Browser dev-path probe (per `TESTING.md`) |
| Desktop shell / Electron-specific integration | No | No main/preload/IPC/window change | — | — | — |
| Process / lifecycle | No | — | — | — | — |
| Persisted-data transition | No | Presentational only | — | — | — |
| Worker / queue / distributed coordination | No | — | — | — | — |
| External integration | No (used only as a fixture) | A real model run is needed to reach the run view for VIS-010 | — | — | Browser + real Claude Agent SDK run |

## Project Execution Discovery

- Assigned task worktree / workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-composer-menus-open-upward` (branch `codex/chat-composer-menus-open-upward`, `67c9e2e5f`)
- Project type and runtime stack: pnpm workspace; Nuxt 3 / Vue 3 renderer (`autobyteus-web`), Node backend (`autobyteus-server-ts`), Electron shell
- Project testing guideline path(s): `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-composer-menus-open-upward/TESTING.md` (no closer `TESTING*.md` under `autobyteus-web/`)
- Conflicting, missing, or unclear project instructions: none
- Required environment variables or secrets available: `Yes` (logged-in `claude` CLI 2.1.283 for the real run; no secret values recorded)

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `TESTING.md` | Workspace testing guideline | "Renderer UI … → Web unit tests + a browser dev-path probe". Probes live in `autobyteus-web/tests/e2e/`, run as `pnpm -C autobyteus-web test:e2e:<name>`. Never test against the user's running AutoByteus or `~/.autobyteus`. Assertions first; screenshots are supporting evidence. Keep artifacts in the ticket folder. Stop what you started. |
| `autobyteus-web/AGENTS.md` | Web developer guide | `pnpm test:nuxt … --run`; never `git add .` |
| `autobyteus-web/package.json` | Scripts | `test:nuxt` = `cross-env NUXT_TEST=true vitest`; `test:e2e:chat-composer-polish`; no lint script |
| `autobyteus-web/tests/e2e/chat-composer-polish-probe.mjs` header | Probe prerequisites and the established owned-stack pattern | `pnpm -C autobyteus-server-ts build` first (contract packages need `dist/`); Chrome; logged-in `claude` CLI; owned temp data root, free ports, sanitized env |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Server build | worktree root | `pnpm -C autobyteus-server-ts build` | Recreates `dist/` in the two SDK packages (untracked) | `autobyteus-server-ts/dist/app.js` exists and the backend boots | Remove the two untracked SDK `dist/` folders afterwards |
| Backend (owned) | `autobyteus-server-ts` | `node dist/app.js --host 127.0.0.1 --port <free> --data-dir <tmp>` (spawned by the probe) | Temp data root, SQLite, sanitized env | `GET /rest/health` | Probe sends SIGTERM to its process group and removes the temp root |
| Nuxt dev (owned) | `autobyteus-web` | `pnpm dev --host 127.0.0.1 --port <free>` with `BACKEND_NODE_BASE_URL` (spawned by the probe) | Free port | `GET /chat` | Same |
| Headless Chrome | — | `playwright-core` with the installed Google Chrome | `deviceScaleFactor` 1, `en-US` | — | `browser.close()` |

Other processes seen on this machine (a prototype Nuxt dev on 3282 and an isolated AutoByteus instance from another worktree) are not owned by this run and will not be touched.

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Long `@` list | `createAgentDefinition` GraphQL mutation (9 agents) plus the seeded Daily Assistant | Owned temp data root only | Removed with the temp root |
| Long `/` list | `SKILL.md` folders written to `<dataRoot>/skills/` before the backend starts (same as `chat-entry-live-probe.mjs`) | Owned | Same |
| Long Workspace list | `createWorkspace` GraphQL mutation (14 folders under the temp root) | Owned | Same |
| Model and thinking menus | Real runtime catalogs (Claude Agent SDK, Codex when available) | Read-only catalog calls | — |
| A running conversation (VIS-010) | One short message sent to a real Claude Agent SDK run from the new-chat page | Uses the local `claude` login; one short prompt | Run terminated by the probe |

## Persisted Data Transition Coverage Basis (When Applicable)

- Approved decision: `Not Affected`
- Design-spec and implementation-handoff references: design "Persisted Data / State Transition Decision" (N/A); handoff "Persisted Data Transition Check" (`Not Affected`)
- Remaining fields: `N/A`

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Acceptance Criteria / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/composables/popover/__tests__/useAnchoredPopover.spec.ts` (10, new in IR-001) | `above` policy math, containing-block choice, `auto` regression | REQ-001, REQ-003, BEH-004 | Still Valid | Read against the design's interface mapping; the expected values follow `floor(min(preferred, top − 22))` | Run |
| `autobyteus-web/components/chat/__tests__/ChatMessageInput.spec.ts` (3, new) | `@`/`/` wrapper classes and `maxHeight`; narrow sheet unchanged | AC-001, AC-005 | Still Valid | — | Run |
| `…/ChatModelMenu.spec.ts` (5, new) | Menu above, flyout `bottom: -5px`, list height rule | AC-002, REQ-003 | Still Valid | — | Run |
| `…/ChatWorkspaceMenu.spec.ts` (+3), `…/ChatThinkingControl.spec.ts` (+3) | Above placement, `maxHeight`, narrow sheet | AC-002, AC-005 | Still Valid | — | Run |
| `…/ChatComposer.spec.ts`, `chatComposerMenus.spec.ts`, `chatThinkingMenu.spec.ts`, `composables/agentInput/**`, `components/agentInput/**` | Composer, menu data and run-input behavior | REQ-004 preservation | Still Valid | No placement assertions; untouched | Run |
| `autobyteus-web/tests/e2e/chat-composer-polish-probe.mjs` T01, T05, T07 | Thinking menu, workspace search, narrow sheet; each asserts the menu is inside the viewport | REQ-004 (contents, search, keyboard, focus, selection unchanged) | Still Valid | The assertions do not depend on placement direction | Run as regression |
| Same probe, T02–T04 | Real-run config recording; parameters-mode menu | Out of this ticket's changed behavior, but exercises menus | Still Valid | — | Run as regression |
| Same probe, **T06** | `padding-bottom` = 6vh; composer more than 3vh lower than with a 14vh bottom padding; no overlap/clipping; menus inside viewport | chat-composer-polish REQ-007 / AC-009, superseded by this ticket's REQ-002 | **Needs Update** | REQ-002 / DEC-002 replace `pt-10 pb-[6vh]` with `pt-[14vh] pb-10`. With `pb-10` the `6vh` assertion fails, and the "lower than 14vh bottom padding" comparison no longer describes approved behavior | Update T06 (see below) |
| `autobyteus-web/tests/e2e/chat-entry-live-probe.mjs` C03 | Menu contents (`/` skills, `@` targets, model rows) | REQ-004 | Still Valid, not run by default | No placement or layout assertion (`grep` for `6vh`, `top-full`, `bottom-full`: none) | Out of the required set; contents are covered by the new probe and polish T01/T05 |

## Stale Or Obsolete Coverage Decisions

| Path / Scenario | Obsolete Assertion | Why It Is Obsolete | Upstream Evidence | Replacement Coverage | No-Replacement Rationale |
| --- | --- | --- | --- | --- | --- |
| `chat-composer-polish-probe.mjs` T06 | `Math.abs(paddingBottom − 0.06·vh) < 1`; `composer.top − baseline(14vh bottom).top > 0.03·vh` | The approved padding is now `pt-[14vh] pb-10` | `requirements-doc.md` REQ-002 / AC-003 / DEC-002; UI spec "Layout of the new-chat group" | T06 keeps its still-valid parts (order, no overlap/clipping/overflow, menus inside the viewport) and asserts the current padding; the precise "how much lower" proof moves to the new probe's U01 | — |

## Durable Coverage To Add

New probe: `autobyteus-web/tests/e2e/chat-composer-menus-open-upward-probe.mjs`, script `test:e2e:chat-composer-menus-open-upward` in `autobyteus-web/package.json`. It follows the owned-stack pattern of the polish probe.

| Scenario ID | Behavior / Boundary | Requirement / Acceptance Criteria / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| U01 | New-chat layout at 1512x952, 1280x720, 1024x520, 1024x440: `padding-top` 14vh, `padding-bottom` 40px, flex-centered, order, hint directly under the composer, no overflow at the two reference sizes, heading top ≈379 / ≈246, and the group is 10vh − 40px lower than with the previous padding | REQ-002, AC-003, VIS-001, VIS-007 | new probe | Layout is only provable in a real browser |
| U02 | `@` and `/` open above the composer card at the four wide viewports: positioned against the card, 6px gap, height rule, never below, fully on screen, hint uncovered, header visible, list scrolls to its last row when limited; keyboard highlight, Enter/click choose, Escape and outside click | REQ-001, REQ-003, REQ-004, AC-001, AC-004, AC-005, VIS-002/003/007/008 | new probe | The user's reported defect; jsdom cannot prove it |
| U03 | Workspace, Model (+ runtime flyout, + search results) and Thinking open above their trigger at the four wide viewports: same geometry rule, footer/search rows visible, flyout `bottom: -5px` growing upward with the list rule, focus on open, selecting a model from the flyout still works | REQ-001, REQ-003, REQ-004, AC-002, AC-004, VIS-004–006 | new probe | Same |
| U04 | Very short window (1024x340/300/260) with the page scrolled: the Thinking menu is taller than its limit and scrolls inside it; `@`, Workspace and Model still open above and stay on screen | REQ-003 | new probe | Not rendered by the implementer |
| U05 | 390x844: `@`, `/`, Workspace, Model and Thinking are the unchanged bottom sheet (fixed, 8px insets, backdrop, no inline max-height) | REQ-004, AC-005, VIS-009 | new probe | Preserved behavior next to changed code |
| U06 | Running conversation at 1512x952: `/` opens the skill menu above the run composer with the unchanged `auto` policy (no inline max-height), and choosing a skill adds the chip | REQ-004, AC-005, BEH-004, VIS-010 | new probe (real Claude Agent SDK run) | Shares `useAnchoredPopover`; not rendered by the implementer |

## Durable Coverage To Update

| Scenario ID | Existing Path / Scenario | Required Update | Requirement / Acceptance Criteria / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| T06 | `autobyteus-web/tests/e2e/chat-composer-polish-probe.mjs` | Assert `padding-top` 14vh and `padding-bottom` 40px; drop the 14vh-bottom baseline comparison; keep order / no overlap / no clipping / no overflow / menus inside viewport; update the header comment and case title | REQ-002, AC-003 | The case keeps guarding the polish ticket's "no overlap or clipping" intent |

## Durable Coverage To Remove

None. No whole scenario is removed.

## Repository Coverage Execution Plan And Results

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| R1 | `NUXT_TEST=true pnpm exec vitest run components/chat composables/popover composables/agentInput components/agentInput --no-watch` | `autobyteus-web` | Policy math, component placement classes, run-input regression (jsdom) | Pass — 13 files, 82/82 | `T/api-e2e-evidence/R1-focused-vitest.log` |
| R2 | `NUXT_TEST=true pnpm exec vitest run --no-watch` | `autobyteus-web` | Web unit regression; compare the failure set with the implementer's 4 pre-existing failures | Pass for this scope — 3382 passed, 7 failed in 10 files, none touched by this ticket. 4 files are the implementer's pre-existing set. 6 files could not resolve `@autobyteus/application-sdk-contracts` (its `dist/` was absent) and pass after the server build: 12 files, 37/37 | `T/api-e2e-evidence/R2-full-test-nuxt.log`, `R2b-rerun-after-sdk-build.log` |

## Test-Case Ledger Plan (When Applicable)

- Ledger required: `Yes` — two repository runs, six new browser cases, seven regression cases with real model runs, and a negative control
- Canonical ledger path: `T/api-e2e-test-case-ledger.md`
- Ledger initialized before execution: `Yes`
- Case granularity: one row per repository run and per probe case

| Case ID | Case / Journey | Requirement / Acceptance-Criteria IDs | Boundary / Execution Surface | Planned Command Or Entry Point | Planned Order | Evidence Expected |
| --- | --- | --- | --- | --- | --- | --- |
| R1 | Focused vitest | all | Repository | see above | 1 | log |
| R2 | Full web unit suite | regression | Repository | see above | 2 | log |
| U01–U06 | New probe | AC-001–AC-005 | Browser (owned stack) | `pnpm -C autobyteus-web test:e2e:chat-composer-menus-open-upward -- --output-dir <T>/api-e2e-evidence/menus-open-upward` | 3 | evidence JSON, screenshots |
| N01 | Negative control: the new probe's U01–U03 against the base versions of the 8 source files | probe sensitivity | Browser | `git checkout 57df63f07 -- <8 files>`, run `--cases U01,U02,U03`, then `git checkout HEAD -- <8 files>` | 4 | evidence JSON showing failures; clean `git status` afterwards |
| T01–T07 | Polish probe with the updated T06 | REQ-004 regression; T06 → REQ-002 | Browser (owned stack, real Claude runs) | `pnpm -C autobyteus-web test:e2e:chat-composer-polish -- --output-dir <T>/api-e2e-evidence/polish-probe` | 5 | evidence JSON |

## Post-Repository Confidence Scorecard (Mandatory)

Scored after R1 and R2, before any browser run of my own. The implementer's rendered check (39/39) is supporting evidence only.

| Confidence Category | Score | What Supports The Score | Remaining Uncertainty | Additional Validation That Could Improve It |
| --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 60% | Unit tests prove the policy math and the classes each component renders | Every AC is a rendered-geometry statement; jsdom has no layout | Browser probe at the specified viewports |
| Changed-boundary execution directness | 60% | The composable and components run in the tests | Geometry, offset parent and computed position are stubbed | Browser probe |
| Cross-boundary integration realism and mock gap | 50% | — | Real CSS, real catalogs and list lengths, real run view | Browser probe on an owned backend |
| Environment, configuration, identity, and fixture fidelity | 70% | Standard vitest setup | No real viewport | Browser probe |
| Failure, edge-case, lifecycle, and recovery evidence | 65% | Zero clamp, no 220px floor, narrow breakpoint, `auto` regression in unit tests | Short windows and long lists in a real layout; Thinking and Model search when limited | Browser probe at 1024x520, 1024x440 and shorter |
| User-surface, browser, and desktop-shell confidence | 40% | None of my own | The whole user surface | Browser probe |
| Durable regression coverage quality and relevance | 75% | 21 focused unit tests that fail on base source | The only browser coverage of this layout (T06) is stale | New probe; update T06 |

- Overall post-repository confidence: 60%
- Calculation method: simple average of the seven categories
- Every critical acceptance criterion directly proven: `No`
- Any applicable category below `90%`: `Yes` — all seven
- Default clean-confidence target of `95%` met: `No`
- Material residual risks: real layout of all five menus and the flyout; short windows; the running-conversation menu; the stale probe case

## Broader Validation Decision (Mandatory)

- Decision: `Required`
- Selected execution mode: `Browser` (dev-path probe on an owned backend and Nuxt dev server, headless Chrome)
- Specific confidence gap or residual risk addressed: every acceptance criterion is a rendered-geometry statement; the unit tests stub geometry
- Why the selected mode can materially improve confidence: it measures the real layout at the specified viewports with real catalogs, long lists and a real run
- Expected confidence after the selected validation: ≥95%
- Browser-specific decision and rationale: `TESTING.md` prescribes "web unit tests + a browser dev-path probe" for renderer UI. No desktop-shell code changed, so an isolated desktop instance is not needed.
- If `Not Required`: `N/A`
- If `Blocked`: `N/A`

## Desktop Application Validation Decision (When Applicable)

- Desktop framework / shell: Electron
- Testing guideline used: `TESTING.md` "Choosing the path"
- Web-equivalent behavior: all of it (renderer components and one composable)
- Shell-specific or lifecycle behavior: none changed
- Chosen validation approach and why it fits the project: browser dev-path probe; the guideline reserves isolated desktop instances for shell behavior or full-product journeys
- Server/frontend setup when browser validation is used: owned backend + owned Nuxt dev on free ports, temp data root
- Effect on any already-running desktop application: `None`
- Behavior not directly proven and confidence consequence: window chrome of the packaged app may give a slightly different viewport height; the rule is viewport-relative and is proven at five sizes, so the consequence is negligible

## Live Environment And Fixture Plan (Required When Broader Validation Runs)

- Startup order and commands: server build → prisma migrate (temp DB) → write skills → backend → GraphQL fixtures → Nuxt dev → Chrome
- Health / readiness checks: `/rest/health`; `GET /chat`; `[data-test="chat-new"]` visible
- Seed data / fixtures: 9 agents, 12 installed skills, 14 workspaces
- Test identities: local `claude` login for one short run (U06) and the polish probe's T02/T03
- Requirement-linked journeys: U01–U06
- Evidence to capture: evidence JSON with measured geometry per case and viewport; screenshots as support; backend/frontend logs
- Owned processes and temporary state to clean up: backend, Nuxt dev, Chrome, temp root, the run; the two untracked SDK `dist/` folders

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| N01 | The new probe run once against the base source of the 8 changed files (temporary checkout, restored afterwards) | The probe fails on the old downward behavior, so its passes are meaningful | It is a one-time sensitivity check of the probe, not product behavior |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Re-measuring while a menu is open during a window resize | Explicitly out of scope in the UI spec | None | None |
| Pixel diff against the VIS images | The real app's sidebar and catalogs differ from the prototype fixtures; the spec lists those as illustrative | Low; the requirements-defining numbers are asserted | None |
| Packaged Electron window | No shell code changed; the rule is viewport-relative | Negligible | None |
| TypeScript typecheck of the changed files | `nuxt typecheck` cannot run in this repository (no `vue-tsc` dependency), as the implementer reported | Low; the files compile under Vitest and Nuxt dev and run in the probes | Tooling follow-up outside this ticket |

Observations from execution (not acceptance-criteria failures):

| ID | Observation | Evidence | Assessment |
| --- | --- | --- | --- |
| OBS-1 | In a window shorter than about 330px with the new-chat area scrolled, the Model menu's runtime rows overflow its height limit (175px limit against about 228px of content at 1024x300). | `api-e2e-evidence/menus-open-upward/U04-model-1024x300.png`; U04 details `model.rowsInside: false` | The runtime list has no scroll region by approved design (design-spec "Risks": it must not clip the flyout). At every AC viewport the limit (289px at 1024x440) exceeds the content. Not blocking; possible follow-up. |
| OBS-2 | At 1024px wide the runtime flyout opens to the left and about 19px of it sits under the app sidebar. | `U03-model-flyout-1024x440.png`; flyout left 302.8 on this branch and on base (negative control) | Existing behavior; the side logic is unchanged and the spec says "as today". Not blocking; possible follow-up. |
| OBS-3 | `autobyteus-web/docs/chat.md:91` still says `pb-[6vh]`. | `grep` | Delivery docs sync, already noted in the design. |

## Ambiguities Or Reroute Triggers

| Issue | Classification | Evidence | Recommended Recipient |
| --- | --- | --- | --- |
| None at investigation time | — | — | — |

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes` — added `autobyteus-web/tests/e2e/chat-composer-menus-open-upward-probe.mjs` and its `package.json` script; updated T06 in `autobyteus-web/tests/e2e/chat-composer-polish-probe.mjs`
- Post-repository confidence: 60%
- Broader validation decision: `Required` — Browser; executed, see `T/api-e2e-execution-coverage-report.md`
- Reroute Required Before Validation Execution: `No`
- Recommended Recipient If Reroute Required: `N/A`
- Notes: Plan changes made during execution: U04 became a deterministic very-short-window case (1024x300, page scrolled) instead of depending on a parameters-mode model, because that reliably makes the Thinking menu taller than its limit. U03 checks every enabled runtime's flyout.
