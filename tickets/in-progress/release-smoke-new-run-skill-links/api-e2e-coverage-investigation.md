# API/E2E Coverage Investigation

The plan: what must be proven, how, the decisions about existing tests, and the planned cases. Results, confidence scores and the broader-validation decision are in the execution coverage report.

## Investigation Meta

- Requirements Doc: `tickets/in-progress/release-smoke-new-run-skill-links/requirements-doc.md` (SR-001, Approved)
- Investigation Notes: `tickets/in-progress/release-smoke-new-run-skill-links/investigation-notes.md`
- Solution Revision Record: `tickets/in-progress/release-smoke-new-run-skill-links/solution-revision-record.md` (SR-001)
- Design Spec (required on every route): `tickets/in-progress/release-smoke-new-run-skill-links/design-spec.md` (SR-001, Ready)
- Supplemental Task Artifacts: `tickets/done/workspace-skill-collision-fix/` (autobyteus-142; scenario basis, evidence only)
- Design Review Report: `N/A — not applicable` (direct route: Medium / Low)
- Architecture Review Revision Record: `N/A — not applicable`
- Implementation Handoff: `tickets/in-progress/release-smoke-new-run-skill-links/implementation-handoff.md` (IR-001)
- Implementation Revision Record: `tickets/in-progress/release-smoke-new-run-skill-links/implementation-revision-record.md`
- Code Review Report: `N/A — not applicable` (direct route)
- Code Review Revision Record: `N/A — not applicable`
- Delivery Revision Record (delivery re-entry only): `N/A`
- Relevant Delivery Revision IDs: `N/A`
- API/E2E Revision Record (created after the first completed result): `tickets/in-progress/release-smoke-new-run-skill-links/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- Current Investigation Round: 1
- Trigger: implementation handoff IR-001 from `/software_engineering_team/implementation_engineer` (direct API/E2E route)
- Prior Investigation Reviewed: none (first round)
- Latest Authoritative Investigation: this file

## Current Requirement And Design Basis

- One command, `python3 scripts/release_smoke.py`, run from the repository root on the commit to be tagged, decides fail-closed over 13 required runtime × scenario cases and exits non-zero unless all pass (REQ-001, REQ-005, AC-001, AC-004, AC-005).
- Live tier (Claude, Codex, Grok; real CLI through the in-process Studio server): (a) new run + restore in a linked workspace, (b) brand-new team member, (c/d) different same-named skill refuses a configured-skill run and is used by an all-installed agent (REQ-002, AC-002). The runner folds (a)+(b-restore) into one test and (d) into the collision test, per the design.
- Scripted tier (Antigravity scripted CLI, AutoByteus deterministic LLM at factory level): brand-new run and brand-new team member in a linked workspace, no provider call (REQ-003, AC-003, DEC-007).
- Cheapest pinned models (`haiku`, `gpt-5.6-luna`, `grok-4.7`), env override, no fallback; a missing model fails with the available list (REQ-004, AC-006).
- Per-runtime summary with commit, models and durations (REQ-006).
- RELEASE.md "Checks Before Tagging" / "Release smoke check" and one TESTING.md row (REQ-007, AC-007).
- Test-owned data only; worktree status unchanged; user CLI configs untouched (REQ-008, AC-008).
- Preserved: no production source change; touched suites keep their existing cases with their existing gates (BEH-003, AC-009).
- Implementation-handoff signals: `Legacy / Compatibility Removal Check` clean (stale model candidates and `available[0]` fallback removed, nothing retained). `Persisted Data Transition Check`: `Not Affected`, test-owned temp data only. Both match the diff `cba6b85122..8f37ab5eb8` (7 files: runner, unit test, 3 suites, RELEASE.md, TESTING.md; no `src/`, no workflows).

## Supported Scenarios And Real Usage

- Designer scenarios covered: SCN-001 (release owner runs the command), SCN-002 (RELEASE.md requires it), SCN-003 (simulated user runs with configured skills in a linked workspace, brand-new runs and members, restore, collision), SCN-004 (release owner learns why the check did not pass).
- Real-use scenarios added from investigating the implemented behavior, each with its real trigger:
  - SCN-004a **the regression the check exists for comes back**: a release candidate that again contains the v1.5.6-beta.2 skill-exposure code (fix `810408bcee` absent). Trigger: the release owner runs the command on that commit. This is the strongest real form of AC-005's "a regression"; IMP-08 proved only a deliberately broken assertion.
  - SCN-004b **CLIs signed out on the release machine** (RSK-001, REQ-005 "not signed in"). Trigger: the command run where the CLIs have no login. The runner's preflight only checks Codex's `auth.json`; how Claude and Grok without a login show up in the verdict (named reason, or a hang until the step timeout) is not yet observed.
  - SCN-001a **a Grok free-tier quota that is exhausted** (observed in IMP-07): the command fails closed with the 429 named. Observed already; it is a risk to report, not a case to provoke.
- Designer scenarios recorded as `Technically Possible but Unsupported/Contrived`: none. Gate unset (AC-004 example) cannot occur through the command, which always sets the gates; it is covered by the runner unit test's environment checks only.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 release smoke command + RELEASE.md step | Added | design DS-001, `scripts/release_smoke.py`, RELEASE.md diff | Full command run on the head (pass), negative runs (fail closed), doc review |
| BEH-002 pinned cheapest models, no silent skip | Changed | live suite diff (model pins, throw), runner preflight/verdict | Full run shows the models line; bogus model and missing CLI fail with reasons (IMP-08 reused); signed-out CLIs probe |
| BEH-003 run start on all runtimes | Preserved (observed) | no `src/` change | Full run passes all 13 cases; regression mutation shows the live tier detects a real run-start regression |
| Live suite text read (`SEGMENT_CONTENT_BATCH`) | Changed (baseline fix 8e65be9e6f) | handoff IR-001 | Grok team member case must pass on the head (not yet proven after the fix) |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | No | none (no `src/` change) | IMP-02 typecheck | — | — |
| API / transport / contract | No (observed only) | suites drive GraphQL/WebSocket of the in-process server | suites | — | — |
| Frontend component / state | No | — | — | — | — |
| Browser integration / user journey | No | — | — | — | — |
| Authentication / session / permissions | Yes (operational) | the command depends on signed-in host CLIs | IMP-08 (missing CLI) | signed-out CLIs: reason shown or hang | Signed-out probe (API-06) |
| Desktop renderer / web-equivalent UI | No | — | — | — | — |
| Desktop shell / Electron-specific integration | No | excluded by DEC-006 | — | — | — |
| Process / lifecycle | Yes | runner spawns vitest per step, clean env, temp HOME, verdict, exit code, worktree guard | IMP-01 unit tests (synthetic reports), IMP-06/07/08 | a fully green run; detecting a real regression | Full command runs (API-05, API-08) |
| Persisted-data transition | No | `Not Affected` | — | — | — |
| Worker / queue / distributed coordination | No | — | — | — | — |
| External integration | Yes | real Claude/Codex/Grok CLIs and their providers | IMP-07 (11/13) | Grok team member + collision after the baseline fix; Grok quota | Full command run on the head (API-08) |

## Project Execution Discovery

- Assigned task worktree / workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/release-smoke-new-run-skill-links`, branch `codex/release-smoke-new-run-skill-links`, head `27e197bd72` (code identical to `8f37ab5eb8`)
- Project type and runtime stack: pnpm monorepo; Node 22 / vitest 4.0.18 server E2E; Python 3.9.6 stdlib release scripts
- Project testing guideline path(s): `/Users/normy/autobyteus_org/autobyteus-worktrees/release-smoke-new-run-skill-links/TESTING.md` (only one; no closer `TESTING*.md`)
- Conflicting, missing, or unclear project instructions: none. Observation: TESTING.md's AGY sign-in gap names `agy` 1.3.5; not relevant here (AGY is scripted in the smoke; FU-2).
- Required environment variables or secrets available: `Yes` (host Claude, Codex and Grok sign-ins; no secret is read or recorded by this validation)

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `TESTING.md` | Testing guideline | Live suites need the real HOME + USER/LOGNAME; clean env; "A skip is not a pass"; never edit `~/.codex`/`~/.claude`/`~/.grok`; Rule 9 (find the cause of every failure); rerun by impact |
| `RELEASE.md` | Release rules | Smoke runs before every tag after `pnpm install` + `prebuild`; release script needs a clean worktree (untracked `*/dist/` deleted first) |
| `AGENTS.md`, `DESIGN.md` | Repository instructions | Read TESTING.md before validation; RELEASE.md before release work |
| `scripts/release_smoke.py` docstring | Runner usage | No arguments; model overrides `CLAUDE_E2E_MODEL`/`CODEX_E2E_MODEL`/`GROK_E2E_MODEL`, `GROK_BUILD_COMMAND` pass through |
| suite headers (3 files) | Gates and commands | Live: `RUN_CLAUDE_E2E`/`RUN_CODEX_E2E`/`RUN_GROK_E2E`, throwaway `CODEX_HOME`; AGY: `RUN_AGY_FAILURE_E2E=1`, `ANTIGRAVITY_CLI_COMMAND`; native: not gated |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Dependencies | worktree root | already done by implementation: `pnpm install --frozen-lockfile`, `pnpm -C autobyteus-server-ts prebuild` | builds untracked SDK `dist/` (pre-existing, unchanged) | `autobyteus-server-ts/node_modules/.bin/vitest` exists | none |
| Release smoke runner | worktree root | `python3 scripts/release_smoke.py` | spawns three serial vitest steps; in-process Studio server per suite on test-owned data | summary + exit code | runner removes its temp root on pass, keeps step logs on fail (outside the worktree) |
| Host CLIs | — | `claude` 2.1.302, `codex-cli` 0.163.0, `grok` 1.0.62 | Grok free tier: 600k tokens / rolling 24 h; one smoke run uses ~150–240k Grok tokens locally counted (4 turns) | `which` | none (sessions land in host CLI stores, as for every live suite) |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Package with configured skill, linked workspace, app data | created by each suite under `os.tmpdir()` | test-owned; no user workspace or `~/.autobyteus` | suites remove their roots in `afterAll` |
| Codex config | throwaway `CODEX_HOME` with a link to host `auth.json` (suite) | user `~/.codex/config.toml` untouched | suite removes it |
| Signed-out identity (API-06) | runner started with a throwaway `HOME` | CLIs write only into the throwaway HOME | removed after the probe |
| Regression mutation (API-05) | `git apply -R` of the `src/` part of `810408bcee`, uncommitted | worktree-local, temporary | `git checkout`/remove re-created files; `git status` compared with the pre-probe state |

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related Requirement / AC / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `scripts/tests/test_release_smoke.py` (21 tests) | verdict, preflight, envs, worktree guard, models line, failed-suite log reading, summary, required titles exist once in suite sources | REQ-001, 004–006, 008; AC-004/005 logic | Still Valid | read; IMP-01 | Reuse IMP-01 |
| `workspace-skill-links-live.e2e.test.ts` 3 tests × runtime | REQ-002 (a)–(d) through real server + CLI; pinned models, no fallback; reads Team socket batches | REQ-002, REQ-004; AC-002, AC-006 | Still Valid | diff read; assertions unchanged except error messages and batch read | Run through the command |
| `agy-linked-skills-transport.e2e.test.ts` E09, E10 | brand-new run / lazily started member of a package agent with a configured skill in a linked workspace; capsule links exactly the package skill; links untouched | REQ-003; AC-003 | Still Valid | diff read | Run through the command |
| `agy-linked-skills-transport.e2e.test.ts` E01–E08 | earlier AGY linked-skill cases | AC-009 | Still Valid | IMP-05 | Reuse |
| `configured-skill-on-demand-loading.e2e.test.ts` 2 release smoke cases | brand-new native run / member (memory folder absent) gets the skill catalog entry; SKILL.md path resolves to the package skill; links untouched | REQ-003; AC-003 | Still Valid | diff read | Run through the command |
| `configured-skill-on-demand-loading.e2e.test.ts` existing cases | on-demand skill loading | AC-009 | Still Valid | IMP-04 | Reuse |

## Planned Cases

| Case ID | Criteria | Boundary / Surface | Kind | Planned Command Or Steps | Why |
| --- | --- | --- | --- | --- | --- |
| API-01 | REQ-001, 004–006, 008; AC-004/005 logic | runner verdict logic | Reused | IMP-01 | Ran on `8f37ab5eb8`; `git diff --name-only 8f37ab5eb8 HEAD` touches only ticket files; evidence shows `Ran 21 tests` / `OK` |
| API-02 | AC-009 | production `src` typecheck | Reused | IMP-02 | Same commit basis; no `src/` change on the branch at all |
| API-03 | AC-003, AC-009 | native and AGY suites alone, existing gates | Reused | IMP-04, IMP-05 | Same commit basis; evidence shows 4 × passed and E01–E10 passed |
| API-04 | AC-007 | RELEASE.md, TESTING.md | Temporary Probe | Read both at the head against AC-007's list; check the `#release-smoke-check` anchor matches the heading; check consistency with "Cutting The Release" | A doc review is not durable test code |
| API-05 | AC-005, REQ-001, REQ-005; SCN-004a | full command over a real run-start regression | Temporary Probe | Temporarily reverse-apply the `src/` part of `810408bcee` (the autobyteus-142 fix); run `python3 scripts/release_smoke.py` with `grok` removed from `PATH` (no Grok tokens); restore; confirm `git status` | A reverted product fix cannot be committed; the probe proves the smoke catches the regression it was created for |
| API-06 | AC-004, REQ-005; SCN-004b, RSK-001 | full command with signed-out CLIs | Temporary Probe | `env -i PATH=… HOME=<throwaway resolved> USER LOGNAME TMPDIR python3 scripts/release_smoke.py`; observe the reasons, duration and exit | Needs a signed-out identity; cannot be durable without a CLI-less fixture |
| API-07 | AC-004, AC-005, AC-006 | full command negative paths | Reused | IMP-08 | Ran on `e8d2888695`; `git diff --name-only e8d2888695 HEAD` = RELEASE.md, TESTING.md, ticket files only; evidence names each reason and `exit=1` |
| API-08 | AC-001, AC-002, AC-003, AC-006, AC-008; QR-001/002/003 | full command on the head, all five runtimes | Journey | `git status --porcelain` + hashes of user CLI config files before; `python3 scripts/release_smoke.py`; the same after. Run once Grok's rolling 24 h quota has room (estimated from local session usage: after ~09:50Z on 2026-10-19) | AC-001/002 need one fully green run on the head; Grok's team member and collision cases are unproven after the baseline fix |

- Test progress log needed: `Yes`

## Durable Coverage To Add

None. The implementation added the durable cases (AGY E09/E10, native release smoke cases, runner unit test); their validity is decided above.

## Durable Coverage To Update

None planned.

## Durable Coverage To Remove

None.

## Live Environment And Fixture Plan (When Broader Validation Is Likely)

- Startup order and commands: the command itself starts each in-process server; nothing else is started.
- Environment choices that materially affect the run: normal user shell from the worktree root (release-owner realism); `grok` removed from `PATH` for API-05; throwaway `HOME` for API-06.
- Health / readiness checks: the runner's step output and summary.
- Seed data / fixtures: created by the suites.
- Test identities: host CLI sign-ins (API-05, API-08); none (API-06).
- Evidence: the runner summary and exit code, the live step's `SKILL_LINKS_LIVE_*` lines (kept logs on failure), `git status --porcelain` before/after, SHA-256 of user CLI config files before/after (`~/.codex/config.toml`, `~/.claude/settings.json`, `~/.grok/config.toml`) and the top-level listing of `~/.autobyteus`.
- Owned processes and temporary state to clean up: the runner's temp roots it keeps on failure; the throwaway HOME; the reverted fix.

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Only The User Can Check? | Required Follow-Up Or Escalation |
| --- | --- | --- | --- | --- |
| Gate unset through the command | The command always sets the gates (not a real-use path) | none | No | — |
| Isolated desktop instance journey | Excluded by DEC-006 | none for this ticket | No | — |

## Ambiguities Or Reroute Triggers

| Issue | Classification | Evidence | Recommended Owner |
| --- | --- | --- | --- |
| One smoke run uses roughly a third of Grok's free 600k-token daily quota; RELEASE.md's "Cost" line names turns only | Not a reroute (risk; AC-007 asks for a cost statement, which exists). Report to the Solution Designer as a recommendation | IMP-07 429; local Grok session usage | Solution Designer (optional doc refinement) |

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `No`
- Reroute Required Before Validation Execution: `No`
- Recommended Owner If Reroute Required: `N/A`
- Notes: API-04, API-05 and API-06 run first (no Grok tokens); API-08 waits for the Grok quota window.
