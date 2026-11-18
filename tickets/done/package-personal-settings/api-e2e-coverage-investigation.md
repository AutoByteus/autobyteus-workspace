# API/E2E Coverage Investigation — package-personal-settings (autobyteus-95, stage 1)

The plan: what must be proven, how, the decisions about existing tests, and the planned cases. Results, scores and the broader-validation decision are in `api-e2e-execution-coverage-report.md`.

## Investigation Meta

(Paths starting with `...` are in `/Users/normy/autobyteus_org/autobyteus-worktrees/package-personal-settings/tickets/in-progress/package-personal-settings/`.)

- Requirements Doc: `.../requirements-doc.md` (SR-006, Approved)
- Investigation Notes: `.../investigation-notes.md` (F-01..F-10, AF-01..AF-11)
- Solution Revision Record: `.../solution-revision-record.md`
- Design Spec: `.../design-spec.md` (SR-006, Ready)
- Supplemental Task Artifacts: `.../personal-settings-file-contract.md` (normative, approved 2026-11-09); `.../evidence/validate-personal-settings-file.mjs`
- Design Review Report: `.../design-review-report.md`
- Architecture Review Revision Record: `.../architecture-review-revision-record.md` (ARCH-REV-002)
- Implementation Handoff: `.../implementation-handoff.md` (IR-001)
- Implementation Revision Record: `.../implementation-revision-record.md`
- Code Review Report: `.../code-review-report.md` (CRR-001, Pass, 9.3/10)
- Code Review Revision Record: `.../code-review-revision-record.md`
- Delivery Revision Record: N/A
- API/E2E Revision Record: `.../api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- Current Investigation Round: 1
- Trigger: the code reviewer's implementation-review pass (CRR-001) of code `2c4ba2c51e` (ticket commit `4e7c74b274`); `48f4443fe6` is a test-only baseline fix
- Prior Investigation Reviewed: None
- Latest Authoritative Investigation: this round

## Current Requirement And Design Basis

Stage 1 (UC-001..UC-005).

- **Where personal settings apply.** Tools, skills, avatar and runtime/model of agents (Teams and Orgs: avatar and runtime/model) are personal settings, for:
  - definitions from a registered agent package (GitHub or local folder);
  - built-in agents.
- **Storage and reading.** They are kept in `<app-data>/agent-packages/personal-settings.json` (contract §2–§4, tolerant reader, atomic writer). Every store-backed read of the three definition services returns the effective value (contract §5). This includes lists, details, admission lists, run start, member resolution and delegated copies (DS-001).
- **Saves.**
  - A save splits: personal fields go to the file as differences from the base; package files are written only when the other fields render differently (DS-002).
  - Reset removes one field.
  - One announce function tells the web and running agents (DS-004).
- **GitHub update** (click or automatic):
  1. Download the installed revision.
  2. Back up every differing file to `backups/<install key>/<UTC time>/` (5 kept).
  3. Capture edits of the four settings from package files into personal settings.
  4. Then update as before (DS-003).
  - Only a failed download, backup or personal-settings write stops the update (Capture Failure Rules).
  - A package update never changes the personal settings file otherwise (REQ-005).
- **Texts.** REQ-007 texts (automatic update switch and confirmation) in en and zh-CN.

## Supported Scenarios And Real Usage

- Designer scenarios: UC-001..UC-005 with AC-001..AC-008 (AC-009 is stage 2, not in this round).
- Real-use scenarios added:
  - RUS-001: a running agent's tools follow a personal change without a restart (DS-004, tool-list updates).
  - RUS-002: repeated GitHub updates with edits each time keep the latest 5 backups (DEC-008).
  - RUS-003: a personal record survives a remove and re-import (contract §6, last bullet): reused unit evidence only.
- Contrived scenarios: none recorded upstream.

## Changed Behavior Summary

| Behavior / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-002..004 effective reads | Added | REQ-001/002; DS-001 | Server E2E through GraphQL; runs through scripted AGY with `LIST_TOOLS` |
| BEH-002..004 split saves and reset | Added | REQ-003/004; DS-002 | E2E: no package file write (hash / `git status`); reset |
| BEH-001 capture and backup on GitHub update | Added | REQ-005/006; DS-003 | E2E with fake GitHub (real installer download and pipeline) by click and by the automatic pass; packaged instance with real GitHub |
| BEH-001 failure rules | Added | AC-004 | E2E: installed archive unavailable, click and automatic; unit (reused) |
| Built-in agents keep personal settings across restarts | Added | DEC-009 | Reused IMP-09b; E2E restart |
| REQ-007 texts | Changed | AC-008 | Rendered en/zh-CN in the packaged instance |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | `PersonalSettingsService`, store, record, three services, capture | IMP-02/02b (unit on package fixtures, fake installer) | Whole chain with the real installer and pipeline | Server E2E |
| API / transport / contract | Yes | GraphQL fields, reset mutations, effective reads | IMP-03 (integration), IMP-08 (codegen) | Real HTTP server | Server E2E |
| Frontend component / state | Yes | Editors' note, mark, reset; REQ-007 texts | IMP-07, IMP-09b | Runtime/model mark rendered; REQ-007 texts rendered | Isolated instance |
| Browser integration / user journey | Yes | Editors | IMP-09a/b | — | — |
| Authentication / session / permissions | No | — | — | — | — |
| Desktop renderer / web-equivalent UI | Yes | as above | IMP-09b | runtime/model picker with a configured runtime | Isolated instance |
| Desktop shell / Electron-specific | No | — | — | — | — |
| Process / lifecycle | Yes | restart keeps personal settings; announce to running agents | IMP-09b (restart) | Running agent tool-list update | Gated server E2E (scripted AGY) |
| Persisted-data transition | Yes (new files only) | `personal-settings.json`, `backups/` | store unit tests | Unreadable file end to end; backups on disk after real updates | Server E2E |
| Worker / queue / distributed | Yes (automatic pass) | update pass calls the same update with capture | IMP-04 (210 suite revised) | Capture in the automatic pass with edits | Server E2E |
| External integration | Yes | codeload download of the installed revision | fake archives | Real GitHub archives of real revisions | Isolated instance + real `AutoByteus/autobyteus-agents` |

## Project Execution Discovery

- Assigned worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/package-personal-settings`, branch `codex/package-personal-settings`
- Project testing guideline: `/Users/normy/autobyteus_org/autobyteus-worktrees/package-personal-settings/TESTING.md` (root; no closer guideline)
- Changed build-input paths (`git diff --name-only a85bf4f38d...HEAD` against TESTING.md "Fresh-start build"): `autobyteus-web/generated/graphql.ts`. No new workspace-package import in type-checked files. Fresh-start build case: API-01.
- Conflicting or unclear instructions: none found so far.
- Required secrets: `N/A` (no provider keys; scripted runtimes).

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `TESTING.md` | Layers, rules, Fresh-start build | Fresh clone, `pnpm install --frozen-lockfile`, the release job's `build:electron:mac -- --arm64` with its env, the job's verify steps; one heavy run at a time; clean env for E2E; node credentials attached by the test server helper |
| `.github/workflows/release-desktop.yml` (macOS ARM64 job) | Release build order | Install → build (env `NO_TIMESTAMP=1 AUTOBYTEUS_BUILD_FLAVOR=personal PRISMA_CLI_BINARY_TARGETS=…`) → verify Prisma → verify packaged terminal runtime (incl. spawn probe) → verify signing policy (runner only) |
| `docs/isolated-app-instances.md` | Instances | `--app <bundle>`, `--data-root`, `stop`, `list` |
| `autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs` (`linked_skills`) | Scripted AGY runs | `LIST_TOOLS` → the run's Agent Tools MCP tools; `RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<path>` |
| `tests/e2e/update-notifications/update-notifications-live.e2e.test.ts` | Fake GitHub with archives per revision, fake clock for the automatic pass | Pattern reused |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Fresh clone build | `/private/tmp/pps/fresh/repo` | `/private/tmp/pps/scripts/fresh-start-build.sh` | ~15–20 min | script `DONE` | removed after the instance journeys |
| Isolated instance | worktree | `isolated-app start --app <fresh clone>/autobyteus-web/electron-dist/mac-arm64/AutoByteus.app --data-root <own>` | own data root; scripted Codex via the data root `.env` for the runtime/model picker | `start` JSON | `stop`; remove data root |
| Server E2E | `autobyteus-server-ts` | `env -i PATH HOME=<tmp> TMPDIR vitest run <file> --no-watch` (+ `RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=…` for the gated file) | test-owned data | vitest | test removes its root |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Package revisions with known tool changes | E2E: fixture package written per revision, archives served by the fake GitHub; instance: real `AutoByteus/autobyteus-agents`, an older real commit installed by replacing the managed install with that commit's codeload archive and its revision in the registry (a faithful older install; ASM as 209/210) | Real repository read-only | Removed |
| A local package checkout | Temp git repository with an agent, a Team and a team-local member | Test-owned | Removed |
| Running agents | Scripted AGY (`linked_skills`) | No model | Terminated |

## Persisted Data Transition Coverage Basis

- Approved decision: `Not Affected` for existing data (new files).
- Evidence planned:
  - an unreadable `personal-settings.json` at start: definitions load with base values, the file is kept, and the next save keeps a `.unreadable-<time>` copy (AC-007);
  - backups on disk after real updates.

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `tests/unit/personal-settings/*`, `tests/unit/agent-packages/package-edit-capture.test.ts` | Contract rules, write forms per kind on package fixtures, capture and every failure rule with a fake installer | REQ-001..006, AC-001..005 | Still Valid | IMP-02b | Reuse |
| `tests/integration/agent-team-definition/registered-package-team-update-graphql.integration.test.ts` | A package Team's runtime/model goes to personal settings | REQ-003 | Still Valid | IMP-03 | Reuse |
| `tests/e2e/agent-definitions/agent-packages-graphql.e2e.test.ts` (legacy record stops) | Unknown installed revision stops with the remedy | AC-004 (legacy) | Still Valid | IMP-04 | Reuse |
| `tests/e2e/update-notifications/update-notifications-live.e2e.test.ts`, live-refresh | Fake GitHub serves the installed revision | DS-003 step 1 | Still Valid | IMP-04 | Reuse |
| web specs (forms, Org component, stores, NotificationCenter automation) | Marks, reset, REQ-007 text | AC-005, AC-008 | Still Valid | IMP-07 | Reuse |

## Planned Cases

| Case ID | Criteria | Boundary / Surface | Kind | Planned Command Or Steps | Why |
| --- | --- | --- | --- | --- | --- |
| API-R01..R06 | as their IMP rows | typecheck, unit, integration, affected E2E, web | Reused | IMP-01..IMP-08 | All ran on `2c4ba2c51e`, the validated code |
| API-R07 | AC-001, AC-005, built-ins across restart | rendered editors | Reused | IMP-09b | same commit |
| API-01 | build inputs | Fresh-start build | Lifecycle | fresh clone, frozen install, release build, verify steps | TESTING.md: `generated/graphql.ts` changed |
| API-02 | AC-002 (click), REQ-005 | server E2E, fake GitHub | Durable | new `tests/e2e/personal-settings/package-personal-settings.e2e.test.ts`: personal edits by GraphQL (agent: tool added/removed, skill, avatar, runtime/model; Team avatar, runtime/model) → package files unchanged → update by click → all kept, new package tools/content, settings file byte-identical | First end-to-end proof |
| API-03 | AC-003 | same | Durable | edits inside the managed install → update → record captured, backup folder with the edited files, effective = AC-002 shape | — |
| API-04 | AC-002/003 (automatic) | same | Durable | file edits → the automatic pass (fake clock) → `AUTO_UPDATED`, captured, backed up | — |
| API-05 | AC-004 | same | Durable | the installed archive unavailable → click: `UPDATE_FAILED`, nothing changed (files, settings, backups); automatic: `AUTO_FAILED` | — |
| API-06 | DEC-008, RUS-002 | same | Durable | updates with edits until more than 5 backups → latest 5 kept | — |
| API-07 | AC-005 | same | Durable | reset per setting (agent tools, Team avatar) | — |
| API-08 | AC-007 | same | Durable | `{not json` at start → base values, file kept, warning; a save → `.unreadable-<time>` copy and a valid file | — |
| API-10 | AC-006, AC-001, RUS-001 | gated server E2E with scripted AGY | Durable | new `tests/e2e/personal-settings/personal-tools-in-runs.e2e.test.ts`: local git package; personal tools on a shared agent and a team-local member; `LIST_TOOLS` in a standalone run, a Team member, a delegated copy, and a running agent after a change; `git status` clean | Proves what agents actually get |
| API-10f, API-10g | AC-006 | same file | Durable (added during execution) | a Team run started directly (team-local lead, shared worker); an Org run with the package agent and the package Team as members; `LIST_TOOLS` per member | The reviewer's item 3 names Team and Org members at run start, not only delegated copies |
| API-11 | regression | server typecheck incl. tests | Repository | `pnpm -C autobyteus-server-ts typecheck` | New test files type-check against the baseline |
| API-M1..M4 | test strength | the new files | Mutation control | capture skipped; 6 backups kept; personal-settings publisher disconnected; personal settings not applied to team-local agents | Each must fail only the cases that own the behavior |
| API-20 | AC-002, AC-003, REQ-005 | packaged instance, real GitHub | Journey | real `AutoByteus/autobyteus-agents` at an older commit; personal edits in the app + edits in the install; Update by click; check record, backup folder, effective tools; then the automatic pass | Real archives and real revisions |
| API-21 | AC-008 | packaged instance | Journey | Notification Center automatic-update switch and confirmation for packages, en and zh-CN | Rendered texts |
| API-22 | UI runtime/model | packaged instance, scripted Codex models | Journey | agent editor: pick runtime/model → "Personal" mark → reset | Not rendered before |

- Test progress log needed: `Yes`

## Durable Coverage To Add

| Case ID | Planned Test Path | Why |
| --- | --- | --- |
| API-02..API-08 | `autobyteus-server-ts/tests/e2e/personal-settings/package-personal-settings.e2e.test.ts` | Real server chain for saves, reads, updates with capture, backups, failures, reset, unreadable file |
| API-10 | `autobyteus-server-ts/tests/e2e/personal-settings/personal-tools-in-runs.e2e.test.ts` (gated like the sibling scripted-AGY suites) | What runs, members, delegated copies and running agents actually get |

## Durable Coverage To Update

None planned.

## Durable Coverage To Remove

None.

## Desktop Application Validation Plan

- Web-equivalent: editors, panel texts. Shell: none changed (no Electron change).
- Approach: isolated instance of the fresh-clone build (the same commit as the release proof), own data root.
- No disturbance of the user's app: only instances this run starts. Scripted CLIs only, confirmed before use. No vendor update is run.

## Live Environment And Fixture Plan

- Order: fresh build → instance → import → shape an older install → edits → update → checks.
- Real GitHub: imports (2 REST each), head reads and codeload archives (quota-free).

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Only The User Can Check? | Required Follow-Up Or Escalation |
| --- | --- | --- | --- | --- |
| AC-009 | Stage 2 | — | No | Stage 2 |
| Signing policy step of the release job | Needs the runner's Apple certificate | Low | No | Delivery's build-only release run if RELEASE.md asks |
| Org runtime/model rendered | No editor (design R-1); appears only after a capture of an `org-config.json` edit | Low | No | Covered by component spec; tried in API-20 if the real package's Org config is edited |

## Ambiguities Or Reroute Triggers

None at planning time.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes` (added)
- Reroute Required Before Validation Execution: `No`
