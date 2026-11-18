# API/E2E Coverage Investigation

The plan: what must be proven, how, the decisions about existing tests, and the planned cases. Results go in `api-e2e-execution-coverage-report.md`.

Paths are relative to `/Users/normy/autobyteus_org/autobyteus-worktrees/settings-delegated-row-display-name/tickets/in-progress/settings-delegated-row-display-name/` unless absolute.

## Investigation Meta

- Requirements Doc: `requirements-doc.md` (SR-001, Approved)
- Investigation Notes: `investigation-notes.md`
- Solution Revision Record: `solution-revision-record.md`
- Design Spec: `design-spec.md` (SR-001; `Small` + `Low`)
- Supplemental Task Artifacts: `evidence/repro-delegated-row-names.spec.ts`, `evidence/SD-01-repro-base.log`
- Design Review Report / Revision Record: `N/A — not applicable`
- Implementation Handoff: `implementation-handoff.md` (IR-001)
- Implementation Revision Record: `implementation-revision-record.md`
- Code Review Report / Revision Record: `N/A — not applicable` (direct low-risk route)
- Delivery Revision Record: N/A
- API/E2E Revision Record: `api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- Current Investigation Round: 1
- Trigger: implementation complete (IR-001), direct API/E2E route
- Prior Investigation Reviewed: none
- Latest Authoritative Investigation: this file

## Current Requirement And Design Basis

- REQ-001 / AC-001: in a Team run a delegated-copy row is named by the Team rule: the display name outside the root Team's configured members (a catalog copy `scribe 5083` and its members), the basename otherwise (`code_reviewer`).
- REQ-002 / AC-002: Org and Agent runs name every copy row with `memberDisplayName`.
- REQ-003 / AC-003: one owner of the Team rule (`teamMemberName`), used by the sidebar rows, contexts and Settings; existing names unchanged.
- REQ-004 / AC-004: the DCR-001 probe header describes its check (review only, per the Task).
- AC-005: in the app, a catalog copy shows one name in Run Settings, the sidebar and the conversation.
- Implementation: code `5af1a03e11`, validated head `aa4d8b0b6f` (ticket files only after). It changes `teamExecutionTreeSelectors.ts` (`teamMemberName`), `teamExecutionContextFactory.ts`, `delegatedLaunchRows.ts`, the spec, `docs/settings.md`, and a comment in `delegated-copy-own-file-cases.mjs`.
- Legacy / Compatibility Removal Check: clean (`nameAt` removed). Persisted data: `Not Affected` (display only).
- Visible side effect named by implementation: `RunMemberRow` initials from a spaced name are two letters ("S5"); this is the component's existing rule for multi-word names.

## Supported Scenarios And Real Usage

- SCN-001 (Team run Settings → Delegated copies), SCN-002 (Org and Agent runs).
- Real triggers used: the user starts a run from the UI; the delegating agent's `delegate_task` call (scripted from the composer); the user opens Run Settings and the sidebar.
- Contrived scenarios: none recorded.

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Frontend component / state | Yes | row names in `delegatedLaunchRows`, Team rule | IMP-01, IMP-02 (data layer) | Real trees from a real backend; the rendered Settings rows vs the rendered sidebar | Browser probe |
| Browser integration / user journey | Yes (visible text) | Settings rows, sidebar rows, conversation title | none | as above | Browser probe |
| Desktop renderer (web-equivalent) | Yes | same renderer | — | — | Browser probe |
| Backend, API, persistence, shell, workers | No | — | — | — | — |

## Project Execution Discovery

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/settings-delegated-row-display-name`, branch `fix/settings-delegated-row-display-name` @ `aa4d8b0b6f`
- Testing guideline: `/Users/normy/autobyteus_org/autobyteus-worktrees/settings-delegated-row-display-name/TESTING.md` (renderer stores/components → web unit tests + a browser probe)
- Probe: `autobyteus-web/tests/e2e/delegated-launch-defaults-probe.mjs` (real Chrome → Nuxt dev → this worktree's `dist/app.js`, scripted runtimes, probe-owned data/ports, `--cases`, `--output-dir`, `--ledger-file`). Server built from this worktree (`prebuild` + `build`, exit 0).
- Secrets: none.

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related Requirement / AC | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/utils/runSettings/__tests__/delegatedLaunchRows.spec.ts` (2 new cases) | Team rows `scribe 5083`, `product team`, `tech lead`, `code_reviewer` equal `projectNavigationRows`' names; Org/Agent rows by display name | AC-001, AC-002, AC-003 | Still Valid | IMP-00 (fails on base), IMP-01 | Keep |
| `services/teamExecution` specs, `components/run-settings` specs | nav rows, contexts, Settings components | AC-003 | Still Valid | IMP-02 | Keep |
| Probe cases DLP-003, DLP-004, DCP-002, DCP-003, DCP-005, DCR-001, DCR-002 | open Settings with copies in Agent, Team and Org runs | AC-005 surface | Still Valid (they do not assert names) | — | Run with a temporary name observer |

## Planned Cases

| Case ID | Criteria | Boundary / Surface | Kind | Planned Command Or Steps | Why |
| --- | --- | --- | --- | --- | --- |
| API-01 | AC-001, AC-002, AC-003 | rows builders vs nav rows | Reused | IMP-01 (and IMP-00) | Ran on `5af1a03e11`; only ticket files changed since |
| API-02 | AC-003 | related web specs | Reused | IMP-02 | same |
| API-03 | — | web boundary guard, changed-file typecheck | Reused | IMP-03, IMP-04 | same |
| API-04 | AC-004 | DCR-001 header | Review | read `git diff 1138e8fbef 5af1a03e11 -- autobyteus-web/tests/e2e/delegated-copy-own-file-cases.mjs` against what DCR-001 does | Task: review, no rerun |
| API-05 | AC-005, REQ-001, REQ-002 | real stack: Settings copy rows vs sidebar copy rows vs conversation title | Existing Test + Temporary Probe (observer) | Untracked copy of `tests/e2e/` with a name observer (`/tmp/ab208e2e/apply-name-observer.py`); `node tests/.e2e-ab208-observer/delegated-launch-defaults-probe.mjs --output-dir <fresh> --ledger-file <ledger> --cases DLP-003,DLP-004,DCP-002,DCP-003,DCP-005,DCR-001,DCR-002`; compare with `/tmp/ab208e2e/compare-names.py` | The rendered names on the real stack, per run id |
| API-06 | AC-005 (detection power) | same, base row builders | Temporary Probe (calibration) | the same run with the three changed web sources from `1138e8fbef` (Nuxt dev serves them from source), then restore and check `git diff` | Shows the comparison catches the mismatch |

- Observer and comparison are temporary: the probe cases have no name assertions, and a durable name check belongs in the unit layer, which IMP-01 already provides with the sidebar's own function.
- Test progress log needed: `Yes`

## Durable Coverage To Add / Update / Remove

None.

## Desktop Application Validation Plan

- Web-equivalent renderer only; browser probe on a probe-owned stack. The user's running AutoByteus is not touched.

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Only The User Can Check? | Required Follow-Up Or Escalation |
| --- | --- | --- | --- | --- |
| None planned | — | — | — | — |

## Ambiguities Or Reroute Triggers

None.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `No`
- Reroute Required Before Validation Execution: `No`
