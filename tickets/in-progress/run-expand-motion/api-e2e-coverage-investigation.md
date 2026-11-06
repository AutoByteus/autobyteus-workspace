# API/E2E Coverage Investigation

The plan: what must be proven, how, the decisions about existing tests, and the planned cases. Results, confidence scores and the broader-validation decision go in the execution coverage report.

Paths are relative to `/Users/normy/autobyteus_org/autobyteus-worktrees/run-expand-motion/tickets/in-progress/run-expand-motion/` unless absolute.

## Investigation Meta

- Requirements Doc: `requirements-doc.md` (SR-001; REQ-001…REQ-003, AC-001…AC-004)
- Investigation Notes: `investigation-notes.md` (E-01…E-07; reproduction `evidence/repro-v-show.json`, control `evidence/control-v-if.json`)
- Solution Revision Record: `solution-revision-record.md` (SR-001)
- Design Spec (required on every route): `design-spec.md` (`Small` / `Low`)
- Supplemental Task Artifacts: the Solution Designer's reproduction and control under `evidence/`
- Design Review Report: `N/A — not applicable`
- Architecture Review Revision Record: `N/A — not applicable`
- Implementation Handoff: `implementation-handoff.md`
- Implementation Revision Record: `implementation-revision-record.md` (IR-001)
- Code Review Report: `N/A — not applicable` (direct route)
- Code Review Revision Record: `N/A — not applicable`
- API/E2E Revision Record (created after the first completed result): `api-e2e-revision-record.md`
- Current API/E2E Revision ID: `N/A` (round 1)
- Current Investigation Round: 1
- Trigger: IR-001, direct route
- Prior Investigation Reviewed: none
- Latest Authoritative Investigation: this file

## Current Requirement And Design Basis

- REQ-001 / AC-001: expanding an Agent run in the Runs view shows its delegated rows in their final place from the first frame, with no transform; a regression check fails on the base.
- REQ-002 / AC-002: collapsing removes them at once; nothing animates in from elsewhere.
- REQ-003 / AC-003: disclosure, rows and a stopped run's stored rows are the same after fold and unfold; selecting a delegated row and the DONE-row leave motion while expanded are unchanged; the suites pass.
- Fix: `AgentRunTaskRows` in `RunListRow.vue` is mounted only while the run is expanded (`v-if`, was `v-show`). Escalation trigger R-01: the stored view no longer shows after fold and unfold.
- Legacy check and persisted data: none / `Not Affected`; they match the implementation.

## Supported Scenarios And Real Usage

- Designer scenarios: UC-001 (expand or collapse an Agent run's delegated work in the Runs view).
- Added from investigation, each with its real trigger:
  - an Agent run that handed Project Tasks to several Team copies, as a Project Task Manager run does (delegation through the agent's own `delegate_task` call), expanded and collapsed by the user in the Runs view;
  - a delegated Task closed (DONE) by the agent while the run is expanded: its rows leave with the designed motion;
  - the run stopped, the app reopened, the run folded, the view switched (Runs → Workspaces → Runs), the run unfolded: the stored rows show, without a second read; a delegated row is selected from the list.
- Contrived: none.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| REQ-001 expand | Changed | E-05, E-06; IMP-03/04 | Frame sampling on the fixture (reused) and in the live app |
| REQ-002 collapse | Changed | design Intended Change | Tree absent from the DOM from the first frame, live |
| Stored delegated view across fold/unfold (R-01) | Preserved | design Ownership; IMP-01 | Live: stopped run, reload, fold, view switch, unfold; read count on the wire |
| DONE-row leave while expanded | Preserved | design Change Scope; `treeRowLeave.css` | Live: a Task closed while expanded; leave classes and fading frames |
| Selection of a delegated row | Preserved | requirements AC-003 | Live: click a delegated row, `aria-current` |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | No | — | — | — | — |
| API / transport / contract | No | — | — | — | — |
| Frontend component / state | Yes | `RunListRow` mounting of `AgentRunTaskRows` | IMP-01 (component, hydration mocked) | Real store hydration and the real stored view | Live browser stack |
| Browser integration / user journey | Yes | rendering and transitions in a real browser | IMP-03/04 (fixture page, fake data) | Real rows from a real run, the live leave on DONE, reload, view switch | Live browser stack (real Chrome → Nuxt dev → `dist/app.js`, scripted AGY) |
| Authentication / session / permissions | No | — | — | — | — |
| Desktop renderer / web-equivalent UI | Yes (same renderer) | as browser | as above | — | Browser covers the renderer |
| Desktop shell / Electron-specific integration | No | — | — | — | — |
| Process / lifecycle | No | — | — | — | — |
| Persisted-data transition | No | — | — | — | — |
| Worker / queue / distributed coordination | No | — | — | — | — |
| External integration | No | — | — | — | — |

## Project Execution Discovery

- Assigned task worktree / workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/run-expand-motion` (branch `codex/run-expand-motion`, head `85bf73750b`, base `4500e7278d`)
- Project type and runtime stack: pnpm workspace; Nuxt 3 web/Electron renderer; Node server (`autobyteus-server-ts/dist/app.js`)
- Project testing guideline path(s): `/Users/normy/autobyteus_org/autobyteus-worktrees/run-expand-motion/TESTING.md` (present). It has no build-input path list. This round adds a Fresh-Start Build section with that list, derived from `.github/workflows/release-desktop.yml` (own `docs(testing)` commit), as the skill requires.
- Conflicting, missing, or unclear project instructions: TESTING.md and DESIGN.md rule 12 require the fresh-start proof only "for a change to a build step or gate". The skill requires it whenever a changed path is a build input. Here `autobyteus-web/package.json` (a new script) changed, and the release build's `pnpm typecheck` also checks test files, which brings the new spec in. The proof is run.
- Changed build-input paths: `autobyteus-web/package.json`, plus `autobyteus-web/components/runList/__tests__/RunListRow.agent.spec.ts` (checked by the build's `typecheck`). Fresh-start build case: API-06.
- Required environment variables or secrets available: no provider keys needed (scripted AGY). The Apple signing secrets are not available (the signing and notarization step is Not Tested).

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `TESTING.md` | testing guideline | web specs + browser probe for renderer changes; one heavy run at a time; clean env; scripted AGY; never the user's app or data |
| `DESIGN.md` rule 12, `RELEASE.md` | fresh start | clean clone, `pnpm install --frozen-lockfile` only, then the job's build |
| `.github/workflows/release-desktop.yml` | release build job | macOS ARM64: `pnpm install --frozen-lockfile`; `cd autobyteus-web && pnpm build:electron:mac -- --arm64` (guards, `typecheck`, `prepare-server`, `generate:electron`, build), then signing and verification |
| `autobyteus-web/tests/e2e/delegated-launch-defaults-probe.mjs` | live stack with case modules | real Chrome → Nuxt dev → `dist/app.js`, scripted AGY with `CALL_TOOL:{…}` |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Server build | `autobyteus-server-ts` | `pnpm prebuild && pnpm build` | this worktree | exit 0 | — |
| Live stack | `autobyteus-web` | the launch-defaults probe | owned ports, data root, HOME | `/rest/health`, Nuxt route | removed by the probe |
| Fresh clone | `/tmp/rxm-390/clean-clone` | `git clone --no-local`, checkout `85bf73750b` | no build output | — | removed after the run |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| An Agent run with several delegated Team copies under Project Tasks | public GraphQL (agent, team, project, tasks), then the agent's own `delegate_task` calls from the composer | probe-owned data root | removed with the stack |

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related Requirement / AC | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `RunListRow.agent.spec.ts` | fold removes the tree; unfold same rows, one read; disclosure; no Team/Org tree on a folded Agent row | AC-002, AC-003, R-01 | Still Valid | IMP-01 at `7cc31409af` | Reuse |
| `run-expand-motion-probe.mjs` (REM-01…04) | fixture frames on the product row; fails on the base | AC-001, AC-002 | Still Valid | IMP-03, IMP-04 at `c5cc87d89d` | Reuse |
| Web suite, typecheck, guards | regressions | AC-003, AC-004 | Still Valid | IMP-02, IMP-05 | Reuse |
| `workspace-views-chooser-cases.mjs` WVC-003 | Runs view round trip, archive-older | Preserved | Out Of Scope (the window and archive are unchanged) | — | — |

## Planned Cases

| Case ID | Criteria | Boundary / Surface | Kind | Planned Command Or Steps | Why |
| --- | --- | --- | --- | --- | --- |
| API-01 | AC-003, AC-004 (suites) | web | Reused | IMP-01, IMP-02, IMP-05 | Only ticket documents changed after `7cc31409af` |
| API-02 | AC-001, AC-002 (regression check fails on base) | browser, fixture | Reused | IMP-03, IMP-04 | Same code; evidence has frames and the base failure |
| API-03 | AC-001, AC-002 | live browser | Durable (RXM-001) | Agent run that delegated 4 Project Tasks to Team copies from its composer; Runs view: collapse and expand with 4-frame sampling; the tree absent after collapse | Real rows from a real run |
| API-04 | AC-003 (DONE leave while expanded) | live browser | Durable (RXM-002) | The agent closes one Task (DONE) while the run is expanded: frames show the leaving row fading (`tree-row-leave-active`, opacity between 0 and 1), then the row is gone and the rest are at rest | The preserved motion |
| API-05 | AC-003, R-01 (stored rows, selection) | live browser | Durable (RXM-003) | Run stopped; app reopened; stored rows shown; fold; Runs → Workspaces → Runs; unfold: same rows, no `GetAgentRunCollaboration` read for the unfold; a delegated row clicked gets `aria-current` | Real stored view and reload |
| API-06 | AC-004 (build), the skill's fresh-start rule | release build | Journey | Fresh clone at `85bf73750b`, `pnpm install --frozen-lockfile`, `pnpm -C autobyteus-web build:electron:mac -- --arm64` without signing secrets | The new spec is a build typecheck input |

- Test progress log needed: `Yes`

## Durable Coverage To Add

| Case ID | Planned Test Path | Why Durable Coverage Is Needed |
| --- | --- | --- |
| API-03…API-05 | `autobyteus-web/tests/e2e/run-expand-motion-live-cases.mjs`, registered opt-in in `delegated-launch-defaults-probe.mjs`, script `test:e2e:run-expand-motion-live` | The live-app counterpart of the fixture probe: real hydration, the DONE leave and the stored view |

## Durable Coverage To Update

| Case ID | Existing Path / Test | Required Update | Notes |
| --- | --- | --- | --- |
| API-06 | `TESTING.md` | Add the Fresh-Start Build section with the build-input paths from the release workflow | Own `docs(testing)` commit |

## Durable Coverage To Remove

None.

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Only The User Can Check? | Required Follow-Up Or Escalation |
| --- | --- | --- | --- | --- |
| Signing, notarization and the signing-policy verification of the release build | Needs the Apple secrets of the release runner | Low (unchanged by this ticket) | No | — |
| Linux, Intel and Windows release builds | Other OS or architecture | Low (no platform-specific change) | No | — |

## Ambiguities Or Reroute Triggers

None. Escalation trigger R-01 (stored view lost after fold/unfold) is checked by API-05.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes` (added; TESTING.md section)
- Reroute Required Before Validation Execution: `No`
- Recommended Owner If Reroute Required: —
- Notes: the server `dist` is built from this worktree before the live run (TESTING.md), after the fresh-start build (one heavy run at a time).

## Round 2 (IR-002, SR-002 narrowed)

- Trigger: CRR-001 CR-001 (`Design Impact`) → SR-002 narrowed to the Runs view → IR-002 (`3e6b5a3dd4`): `RunListPanel` turns the `tree-row` move off inside its scroll container; `RunListRow` is back to `v-show`. New criteria: AC-001 now requires rows with their Task line from the first frame; AC-005 (no row slides in the Runs view: Team expand, late Task line; the DONE row still fades and the row below glides up); AC-006 (Workspaces and Projects keep their motion).
- Rerun plan (`git diff --name-only 85bf73750b 3f78b649ef`: `RunListPanel.vue`, `RunListRow.vue`, two specs, the fixture probe, my case module):
  - API-01 → reuse IMP-06, IMP-07, IMP-11; API-02 → reuse IMP-08 (fixture: late Task lines, Team expand, leave glide, REM-07 the move kept outside the Runs view), IMP-09 (fails on base), IMP-10 (fails on SR-001).
  - API-03 (RXM-001) rerun, extended: Task line in every frame after expand; a delegated Team's expand moves no row (AC-005).
  - API-04 (RXM-002) rerun, extended: the row below glides up by layout (several positions) with no transform (AC-005).
  - API-05 (RXM-003) rerun (the implementer's edit for `v-show`: hidden rather than removed; reviewed).
  - API-06 rerun: `autobyteus-web/package.json` changed after its run (a build input).
  - API-07 (new, AC-006): `task-closure-tree-probe.mjs` (the Workspaces tree's live DONE leave, BR-001…016), unchanged file.
- A late Task line in the live app is not forced here: its timing depends on the read; IMP-08 holds the answers back deterministically on the product panel.
