# API/E2E Coverage Investigation — run-settings-ui-unification

## Investigation Meta

- Requirements Doc: `requirements-doc.md` (SR-006, Approved)
- Investigation Notes: `investigation-notes.md` (AF-001..AF-016, SF-001..SF-010)
- Solution Revision Record: `solution-revision-record.md`
- Design Spec (required on every route): `design-spec.md` (SR-010, including the addendum: DI-001..DI-006, slices S1–S6)
- Supplemental Task Artifacts:
  - `architecture-handoff.md`, `product-design-request*.md`
  - Product `ui-ux-spec.md` and `visual-references/VIS-001..042`: `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/run-settings-ui-unification/`
- Design Review Report: `design-review-report.md` (ARCH-REV-003 Pass)
- Architecture Review Revision Record: `architecture-review-revision-record.md`
- Implementation Handoff: `implementation-handoff.md` (IR-005)
- Implementation Revision Record: `implementation-revision-record.md`
- Code Review Report: `code-review-report.md` (round 5, CRR-009 Pass)
- Code Review Revision Record: `code-review-revision-record.md` (CRR-009)
- Delivery Revision Record (delivery re-entry only): N/A
- Relevant Delivery Revision IDs: N/A
- API/E2E Revision Record: `api-e2e-revision-record.md` (created with the first result)
- Current API/E2E Revision ID: `API-REV-003`
- API/E2E Test-Case Ledger: `api-e2e-test-case-ledger.md`
- Current Investigation Round: 3, at **`a92004c9e`** (IR-005).
  - Round 2 was at `83ab477e4`.
  - Round 1 was at `81f9ff178`.
  - The round-0 partial was held at `c37b81de5`.
- Trigger: Code review pass CRR-003 (`c37b81de5`), held by CRR-004, then resumed after CRR-005 (`81f9ff178`, SR-010/IR-003)
- Prior Investigation Reviewed: none
- Latest Authoritative Investigation: this document, round 1

All ticket paths are relative to
`/Users/normy/autobyteus_org/autobyteus-worktrees/run-settings-ui-unification/tickets/in-progress/run-settings-ui-unification/`.

## Routing Classification

- Task size: `Large`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review`
- Proportional test-code review decision: `Required` (the reviewed Large/High route)

## Current Requirement And Design Basis

The change rebuilds how runs start and how saved runs are edited. All changes are in `autobyteus-web`; the server is unchanged.

- **Agent and Team runs** start only from New chat (`/chat`), with the four chat controls. Teams add a members line and a Member settings drawer. The first message starts the run.
- **Agent Orgs** start from the Org launch page (`/workspace?…mode=configuration`), using `agentOrgLaunchDraftStore` and `agentOrgLaunchService`.
- **"+"** copies a run's settings into the right start surface. For an Agent this is the agent on screen, host or `@` collaborator (SR-009).
- **Saved runs** use a new settings view with stop, Cancel and Save.
- **`@`** inserts a collaborator mention everywhere, and the first send keeps it (AF-009: server admission is so far proven only by reading code).
- **Fast mode** (`service_tier`) gets its own chip or row (REQ-022).

The review guardrail: if the server rejects or drops a first-send mention, the result is a `Design Impact`.

## Supported Scenarios And Real Usage

- Designer scenarios covered: SCN-001..SCN-008.
- Real-use scenarios added from investigating the implementation, each with its real trigger:
  - **RU-01, Agent "+" from an `@` collaborator view.** Trigger: select the collaborator row in an Agent run, then the header "+" (CR-001/SR-009, CR-SCN-01).
  - **RU-02, Team New chat `@` exclusion.** Trigger: type `@` in a Team New chat. The list omits the team, its members and the built-in agents (design §Guidance AR-001).
  - **RU-03, resume after a saved edit.** Trigger: send to a stopped saved run after Save. The restored run uses the saved model config (SCN-004 continuation).
- Recorded as `Technically Possible but Unsupported/Contrived` (not tested): SCN-009 (start an Org from chat, or `@`-mention an Org).

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 Agent Run → New chat | Changed | REQ-005/006/021; DS-001 | Live journey: Run → New chat → send; run config on the server |
| BEH-002 Team New chat + member overrides | Changed | REQ-002/009/010; AC-004; AF-005 | Live: a customized member reaches the server-created team run's member config; the others inherit |
| BEH-003 Org launch page | Changed | REQ-007; AC-003; DS-002 | Live: Org Run with a member override and a placed-team workspace → the active Org config; failure copy and kept values |
| BEH-004 Saved-run settings | Changed | REQ-004/014..017; AC-009..011 | Live: stop → edit → Cancel → edit → Save → resume uses the saved config; locked-runtime menu |
| BEH-006 `@` mention-only + first-send mentions | Changed | REQ-011/012; AC-007; AF-009 | **Critical (guardrail):** live Agent and Team first sends with `@` must admit the collaborator on the server |
| BEH-007 "+" copy | Changed | REQ-013; AC-008; SR-009 | Live: Agent host, Agent `@` collaborator, Team (overrides), Org (overrides) |
| BEH-008 Removed forms/copy | Removed | REQ-018; AC-012 | Repository: `runSettingsCatalog.spec.ts`; probes no longer reference removed UI |
| BEH-009 Fast mode | Added | REQ-022; AC-019 | Live: `service_tier: "fast"` reaches the launched/saved run model config; Thinking independent |
| Mobile, Applications, definition launch prefs | Preserved | AC-015 | Repository mobile specs |
| Server contracts | Preserved | AF-009; design "no server change" | Live runs prove the existing contract accepts the new client inputs |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | No | Server unchanged (`git diff 19dee40b3 -- autobyteus-server-ts autobyteus-ts` is empty) | — | Server admission of client inputs it has not received before (first-send mentions, Team overrides from chat) | Live API through a real backend |
| API / transport / contract | Yes (client inputs) | New client inputs on existing GraphQL/WebSocket contracts: first-send `mentions`, Team `memberConfigs` from chat, Org placements from the new service, `service_tier` | Unit specs mock Apollo/stream | Whether the real server accepts them and persists them | Live backend + GraphQL readback |
| Frontend component / state | Yes | `components/run-settings/*`, the stores, `useRunStart` | ~30 colocated specs | Wiring across the real router, Pinia and Apollo | Browser |
| Browser integration / user journey | Yes | New chat, Org page, drawer, "+", saved-run view | Two mocked probes (`fresh-run-auto-approval`, `existing-run-model-config`) | Real catalog/model loading, real launch, navigation | Browser against a real stack |
| Authentication / session / permissions | No | — | — | — | — |
| Desktop renderer / web-equivalent UI | Yes | Same Nuxt renderer | — | Same as the browser rows | Browser dev-path (web-equivalent) |
| Desktop shell / Electron-specific integration | No | No main/preload/IPC change | — | — | — |
| Process / lifecycle | Yes (client side) | Stop from saved-run view, resume after Save | `useRunStopAction`, `existingRunConfigStore` specs | Real terminate and restore | Live |
| Persisted-data transition | No (server) | Local preference keys only | Specs | — | — |
| Worker / queue / distributed coordination | No | — | — | — | — |
| External integration | Yes (runtime) | Real Codex/Claude runtimes receive the model config | — | `service_tier` accepted by Codex | Live runtime |

## Project Execution Discovery

- Assigned task worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/run-settings-ui-unification`, branch `codex/run-settings-ui-unification`, head `c37b81de5`.
- Project type and runtime stack: pnpm monorepo. Nuxt 3 web renderer (`autobyteus-web`), Node/TS backend (`autobyteus-server-ts`, GraphQL + WebSocket), Electron shell. Agent runtimes: Codex App Server, Claude Agent SDK, Antigravity CLI.
- Project testing guideline: `/Users/normy/autobyteus_org/autobyteus-worktrees/run-settings-ui-unification/TESTING.md` (root). No closer `TESTING*.md`.
- Conflicting, missing, or unclear project instructions: none found so far.
- Required environment variables or secrets available: `Yes`. The local `codex`, `claude` and `agy` CLIs are installed and logged in; the probes pass only a sanitized env with `HOME`, so the runtimes use the CLI logins. No secret values are recorded.

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `TESTING.md` | Root testing guideline | Renderer/client–server change → web unit tests + browser dev-path probes (`pnpm -C autobyteus-web test:e2e:<name>`). Never use the user's app/data. Assertions first; screenshots are supporting evidence. Stop what you start. |
| `AGENTS.md`, `autobyteus-web/AGENTS.md` | Repo/package rules | `pnpm test:nuxt … --run`; never `git add -A` |
| `README.md` § Local full-stack development | Real stack | Backend `dist/app.js`, Nuxt dev; probes start their own on free ports |
| `autobyteus-web/package.json` | Probe scripts | `test:e2e:chat-entry-live`, `test:e2e:cross-scope-agent-mentions`, `test:e2e:chat-composer-polish`, `test:e2e:chat-composer-menus-open-upward`, `test:e2e:fresh-run-auto-approval`, `test:e2e:existing-run-model-config` |
| Live probe headers (`autobyteus-web/tests/e2e/*-live-probe.mjs`) | Per-probe prerequisites | `pnpm -C autobyteus-server-ts build`, Chrome, a logged-in runtime CLI. Each probe owns a temp data root, free ports and its processes. |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Backend (built) | `autobyteus-server-ts` | `pnpm -C autobyteus-server-ts build`; probes spawn `node dist/app.js --data-dir <owned tmp>` | SQLite in an owned temp root; free port | `/rest/health` | The probe's process-group SIGTERM/SIGKILL; temp root removed |
| Nuxt dev | `autobyteus-web` | Spawned by the probe: `pnpm dev --port <free>` with `BACKEND_NODE_BASE_URL` | Free port | HTTP 200 on `/chat` | Probe stops the group |
| Chrome | — | playwright-core, headless | `/Applications/Google Chrome.app` | — | `browser.close()` |
| Runtimes | — | Codex App Server / Claude SDK / AGY, spawned by the backend | Real model calls (small prompts) | — | Ended with the backend |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Agents, Teams, Org definitions | Product GraphQL mutations (`createAgentDefinition`, `createAgentTeamDefinition`, `createAgentOrgDefinition`), as in the existing probes | Owned temp data root only | Removed with the root (unless `--keep`) |
| Placed-team workspace folder | `mkdtemp` folder inside the owned root | — | Removed with the root |

## Persisted Data Transition Coverage Basis (When Applicable)

- Approved decision: `Not Affected` (server data); tolerant local preference keys.
- Design-spec and implementation-handoff references: design §Persisted Data; handoff §Persisted Data Transition Check.
- Representative existing-data setup and required behavior: existing saved runs keep their config through the new saved-run view. This is shown by the saved-run edit/resume case on runs created in the same probe, and by the existing `existing-run-model-config` probe for saved-config readers.
- Evidence planned: R07/R08 readback of the saved config; the mocked `existing-run-model-config` rerun.
- Migration-specific completion/recovery scenarios: N/A.
- Upstream ambiguity or reroute required: none.

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related Requirement / AC / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/**/__tests__` (new/updated specs listed in the handoff) | Store/composable/component rules | All REQs | Still Valid | Code review CRR-003 | Run the full web suite and compare with the baseline |
| `tests/e2e/fresh-run-auto-approval-probe.mjs` | New chat / switcher / drawer approval, mocked mutation boundary | REQ-021, REQ-009 | Still Valid (migrated in IR-001) | Handoff | Rerun |
| `tests/e2e/existing-run-model-config-probe.mjs` | Saved-run card/member rows, mocked | REQ-004/015..017 | Still Valid (migrated) | Handoff | Rerun |
| `tests/e2e/cross-scope-agent-mentions-live-probe.mjs` A01 (live-run `@`), N01 (New chat switcher + `@` list) | Live-run mention admission; New chat `@` excludes the target | REQ-011 | Still Valid; **gap: no first-send (New chat) mention admission case** | Probe source lines 326, 1006 | Run A01/N01; **add N02/N03** |
| `tests/e2e/chat-entry-live-probe.mjs` C01..C23 | Chat entry, run settings ⚙, catalog Run, Team quick path, "+" preset | REQ-005/013, BEH-004 | Mostly Still Valid. Cases written for the old forms (C08 "form unchanged", C10 "uniform member config", C16 "launch-form parity", C18 draft ⚙) need checking against the current behavior. | Titles | Run; decide per case from observed results |
| `tests/e2e/chat-composer-polish-probe.mjs` T01..T07 | Thinking menu, T03 via the card | REQ-001/022 | Still Valid (migrated) | Handoff | Run |
| `tests/e2e/chat-composer-menus-open-upward-probe.mjs` U01..U06 | Menu geometry; U02 on `run-mention-menu` | REQ-001 | Still Valid (migrated) | Handoff | Run |
| `tests/e2e/agy-large-org-launch-health-probe.mjs` | Large AGY Org launches through the Org launch page | REQ-007 | Still Valid (migrated) | Handoff | Run |
| Server suites | Server unchanged | — | Out Of Scope (no server diff) | `git diff` empty | Not rerun |

## Durable Coverage To Add

| Case ID | Behavior / Boundary | Requirement / AC / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| N02 | Agent New chat first send with `@Team` admits the collaborator on the server | REQ-012, AC-007, AF-009, review guardrail | `tests/e2e/cross-scope-agent-mentions-live-probe.mjs` | Critical, previously unproven server boundary; regression risk on either side |
| N03 | Team New chat: `@` list omits the team, its members and the built-ins; first send with `@Agent` admits it on the team root | REQ-011/012, AC-007, design AR-001 | same | Same; the client mirror of the server eligibility can drift |
| R01..R11 | Team overrides (R01), Chat nav/pencil (R11, DI-001), Fast mode (R09), "+" copies (R04/R05/R06), Org launch success/failure (R02/R03), saved Team/Org (R07/R08), DI-004 disabled-runtime readiness (R10) | AC-002/003/004/006/008/009/010/011/019; DI-001; DI-004 | New `tests/e2e/run-settings-live-probe.mjs` + script `test:e2e:run-settings-live` | No repository test crosses the real client → server boundary for these launch inputs; this replaces the old-form live coverage that was removed |

## Durable Coverage To Update

| Case ID | Existing Path / Test | Required Update | Requirement / AC / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| U01 | `tests/e2e/chat-composer-menus-open-upward-probe.mjs` `HEADING_TOP` | The heading reference was measured from the pre-change layout (hint under the composer). Updated to the VIS-001 layout (hint between heading and composer): 355/223 px. The padding rule is unchanged. | REQ-001, REQ-018 (removed "Files are saved in …" line), VIS-001 | Done; U01 passes |
| U02/U04 | same, `aboveFails` anchor identity | The menu now anchors on the composer's input area, not the `chat-composer` card (VIS-030 shows the menu overlapping the card header). The first update accepted an anchor whose top equals the card top; that is insufficient because the anchor is the input area. It must accept an anchor inside `chat-composer`. | REQ-011, VIS-030 | Partially done; still failing → API/E2E follow-up |
| pickModel (P-POL, P-UP, A01) and `chooseModel` (R*) | polish, menus-open-upward, cross-scope, run-settings-live probes | Enter the runtime flyout sideways at the runtime row's height. A diagonal pointer path crosses the next runtime rows; with Grok Build enabled here, it opens Grok's flyout and picks a Grok model. | Pre-existing hover-to-open menu behavior (unchanged from base) | Done; A01's model pick is now correct |
| C05/C08/C16/C18 | `tests/e2e/chat-entry-live-probe.mjs` | They assert removed UI: the catalog-Run old form (`main select`), the draft ⚙ editor, launch-form parity, and an always-visible ⚙ Save. They need rewriting onto New chat / the saved-run view, or removal where `run-settings-live` R01/R07/R09 now covers the scenario. | REQ-018, REQ-004 (Save only after a change) | Not done this round (the round fails on product defects); API/E2E owns it on the rerun |
| cross-scope A01 | assert details | Adds the host config to the root-settings assertion details (diagnostics) | — | Done |
### Round-3 updates (`a92004c9e`)

| Case ID | Existing Path / Test | Update | Evidence | Status |
| --- | --- | --- | --- | --- |
| R01/R02/R07 card geometry | `run-settings-live-probe.mjs` | Settings-card rows never overlap and stay inside the card. Drawer and Org at 880/804/390; saved-run cards at 880/804 (UIS-003 is specified at 880). 390 is recorded as an observation. | Reviewer request (saved-run card with a long model name) | Done; pass |
| R13 | same | VIS-017 tools docked; VIS-023/028 Org "Fast mode" row; VIS-014 unavailable copy | Closes uncaptured VIS states | Done; pass |

### Round-2 updates (`83ab477e4`)

| Case ID | Existing Path / Test | Update | Evidence | Status |
| --- | --- | --- | --- | --- |
| R12 + R04 geometry | `run-settings-live-probe.mjs` | New DOM check: footer controls never overlap at 1512/880/804/390 (VIS-020/021/042) | Round-2 visual check found the overlap | Done; fails on F-3 |
| C05/C06/C08/C16/C18 | `chat-entry-live-probe.mjs` | Migrated to New chat and the saved-run view (runtime-locked menu, Save only after a change, AR-003 no ⚙ on temp) | REQ-004/005/017/018 | Done; pass (C05 server residual after its assertions) |
| C03 | same | Picks the producer model before the search-empty assertion | Prevents cascade | Done |
| U02/U04, U03 | menus-open-upward | Anchor inside the composer (VIS-030); re-hover retry | — | Done; 6/6 |
| pickModel | polish, menus, cross-scope, chat-entry | `openRuntimeList` (hover/verify/click, sideways entry) | Hover-to-open menu (unchanged from base) | Done |
| scenario | `fresh-run-auto-approval-probe.mjs` | One retry only after a recorded Nuxt dependency reload; the first attempt is kept (TESTING.md) | — | Done; 8/8 |
| A01 F-04 | cross-scope | Accepts base's mention placeholder (2026-10-02 precedence) | CRR-006 | Done |

## Durable Coverage To Remove

None planned.

## Repository Coverage Execution Plan And Results

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| 1 | `pnpm -C autobyteus-server-ts build` | worktree | Current backend `dist` | Pass (exit 0) | `/tmp/rsui-api-server-build.log` |
| 2 | `pnpm -C autobyteus-web test:nuxt --run` | worktree @ `c37b81de5` | Full web suite vs. the baseline failing list | Pass vs baseline: 11 failing files (36 tests), all on the baseline list; 545 files / 3,608 tests pass | `evidence/api-e2e/web-suite.log` |
| 2b | `pnpm -C autobyteus-web test:e2e:cross-scope-agent-mentions --cases N01,N02,N03` | worktree @ `c37b81de5`; Claude SDK `haiku`; owned temp root | AF-009 first-send mention admission (Agent and Team) on a real server | Pass 3/3 | `evidence/api-e2e/cross-scope-mentions-N/` |
| 3 | `pnpm -C autobyteus-web test:e2e:fresh-run-auto-approval`, `test:e2e:existing-run-model-config` | worktree | Mocked renderer boundaries | Planned | `evidence/api-e2e/<probe>/` |
| 4 | `pnpm -C autobyteus-web test:nuxt --run` | worktree @ `81f9ff178` | Full web suite vs baseline (new head) | Pass vs baseline: the same 11 baseline files fail; 548 files / 3,622 tests pass (incl. `launchReadiness`, `builtInAgentDefinitionIds.contract`, `OrgLaunchPage`, `AppLeftPanel_v2`) | `evidence/api-e2e/web-suite-81f9ff178.log` |
| 5 | `…:cross-scope-agent-mentions --cases N01,N02,N03` | @ `81f9ff178` | AF-009 regression (S4) | Pass 3/3 | `evidence/api-e2e/cross-scope-mentions-N-81f9ff178/` |
| 6 | Live and mocked probes | @ `81f9ff178` | See the execution report | Mixed; see the ledger | `evidence/api-e2e/*` |

## Test-Case Ledger Decision

- Ledger required: `Yes`. There are many independent live cases with long real-model turns and a credible interruption risk.
- Canonical ledger path: `api-e2e-test-case-ledger.md`.

## Post-Repository Confidence Scorecard (Mandatory)

These are the scores after repository execution alone: the web suite and the existing mocked probes. Final scores after the live validation are in the execution report.

| Confidence Category | Score | What Supports The Score | Remaining Uncertainty | Additional Validation That Could Improve It |
| --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 60% | ~30 colocated specs cover the store and view rules | Server-side outcomes (AC-003/004/008/019, AF-009) are unproven | Live journeys with GraphQL readback |
| Changed-boundary execution directness | 55% | Stores and services are exercised | GraphQL and runtime are mocked | Real backend |
| Cross-boundary integration realism and mock gap | 50% | — | Every launch mutation is mocked | Real backend + runtimes |
| Environment, configuration, identity, and fixture fidelity | 60% | Nuxt test env | No real catalogs or runtime availability | Owned real stack |
| Failure, edge-case, lifecycle, and recovery evidence | 65% | Unit failure branches | Real stop/resume and server rejection unproven | Live stop/save/resume, server failure |
| User-surface, browser, and desktop-shell confidence | 60% | Component specs; two mocked probes | Real rendering with real catalogs | Browser vs VIS |
| Durable regression coverage quality and relevance | 75% | Specs migrated and relevant | No live regression for the new launch inputs | `run-settings-live` probe + N02/N03 |

- Overall post-repository confidence: 61%.
- Calculation method: simple average.
- Every critical acceptance criterion directly proven: `No`.
- Any applicable category below `90%`: `Yes`, all of them.
- Default clean-confidence target of `95%` met: `No`.
- Material residual risks: server admission and persistence of the new client inputs; real rendering.

## Broader Validation Decision (Mandatory)

- Decision: `Required`.
- Selected execution mode: `Browser` + `Live API` (real Nuxt dev → real built backend → real runtimes, owned temp data root), through the repository's live dev-path probes.
- Specific confidence gap: first-send mention admission (AF-009, critical), and client launch inputs reaching server-created runs. Repository specs mock both.
- Why the selected mode helps: it crosses the exact client → server → runtime boundary with GraphQL readback of the stored config.
- Expected confidence after the selected validation: ≥ 95% if the cases pass.
- Browser-specific decision: required. The changed surfaces are renderer journeys.

## Desktop Application Validation Decision (When Applicable)

- Desktop framework / shell: Electron wrapping the Nuxt renderer.
- Testing guideline used: `TESTING.md` "Choosing the path": renderer and client–server behavior → browser dev-path probe.
- Web-equivalent behavior: everything changed.
- Shell-specific or lifecycle behavior: none changed.
- Chosen validation approach and why it fits the project: browser dev-path against a real backend.
- Effect on any already-running desktop application: `None`. Owned ports and temp data root; the user's app and `~/.autobyteus` are untouched.
- Behavior not directly proven: packaged-shell rendering. It was not changed, so this has no confidence consequence.

## Live Environment And Fixture Plan (Required When Broader Validation Runs)

- Startup order and commands: each probe builds its own stack: temp data root → `prisma migrate deploy` → `node dist/app.js` → GraphQL seed → `pnpm dev` (Nuxt) → headless Chrome.
- Environment choices that materially affect the run:
  - Runtime per case: Codex App Server for Fast mode (it is the only runtime with `service_tier`); Claude Agent SDK `haiku` where the probe defaults to it.
  - Sanitized environment.
- Health / readiness checks: `/rest/health`; Nuxt `/chat` 200.
- Seed data / fixtures: GraphQL-created shared agents, teams and an Org with a direct agent and a placed team.
- Test identities, authentication, permissions, or session state: the local runtime CLI logins (via `HOME`).
- Requirement-linked journeys or scenarios: N01..N03, R01..R09; existing probe cases.
- Evidence to capture: probe JSON evidence (GraphQL readback), screenshots at 804/880/390, process logs, cleanup receipts.
- Owned processes and temporary state to clean up: backend, Nuxt and Chrome process groups; temp data roots.

## Temporary Executable Validation Plan

| Case ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| VIS | Screenshots from the probes compared by eye with VIS-001..042 | AC-014 visual fidelity | Judging visual fidelity is a human comparison; the screenshots are kept as evidence |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| `fresh-run-auto-approval` B03–B07 | The probe's Nuxt re-optimizes dependencies on every run ("vite config has changed") and reloads during B02 | Low: mocked boundary, covered by R01/R09/R11 live | Rerun next round; consider a warm-up in the probe |
| `chat-entry-live` C03 → C04/C06/C11/C23 | Model search stuck on "Searching all runtimes…" in this environment (search code unchanged from base), so no model is picked and the later cases cascade | Low for this ticket | Recheck next round |
| Packaged Electron shell | No shell change | None | — |
| Narrow tools drawer, Org blocked/preparing states (VIS-031/032/034/036/037..041) | Not captured this round | Low (component specs cover the states) | Capture on the rerun |

## Ambiguities Or Reroute Triggers

| Issue | Classification | Evidence | Recommended Owner |
| --- | --- | --- | --- |
| First-send mention admission | Resolved: proven (N02/N03 pass twice) | `cross-scope-mentions-N*/` | — |
| F-1: "+" / carry start path never loads the copied runtime's model catalog or runtime availability (`chatDraftStore.startForDefinition` → `applyCarriedModel` returns before `resolveStartModel`) → R04, R05, R10 | `Local Fix` (implementation) | Execution report §Failures | Implementation Engineer, via the Code Reviewer's failure-origin review |
| F-2: collaborator-view composer placeholder is generic once `@` is available there (A01 F-04) | `Unclear` | `cross-scope-mentions-A01*/` | Code Reviewer to classify |

## Investigation Decision

- Proceed To API/E2E Execution: `Yes` (executed; round 1 complete)
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes`
  - Added: `tests/e2e/run-settings-live-probe.mjs` + script `test:e2e:run-settings-live`; N02/N03.
  - Updated: the menus-open-upward, polish and cross-scope probe helpers and assertions.
- Post-repository confidence: 61% (final scores in the execution report).
- Broader validation decision: `Required`, executed (live browser + API against an owned real stack).
- Reroute Required Before Validation Execution: `No`.
- Round results:
  - Round 1: `Fail` (F-1, F-2).
  - Round 2: `Fail` (F-3); CR-004 resolved; 92%.
  - Round 3: **`Pass`**; F-3 resolved; **95%**; observations O-1/O-2/O-3.
