# Implementation Handoff

- Package: `release-smoke-new-run-skill-links` (Project Task autobyteus-149)
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/release-smoke-new-run-skill-links`
- Branch: `codex/release-smoke-new-run-skill-links`, base `origin/personal` @ `cba6b85122`
- Implementation head: `f9d1db2aa0` (IR-002: RELEASE.md Cost wording only). Code unchanged since `8f37ab5eb8` (IR-001). The ticket folder is committed on top of it; see the handoff message for that commit.

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: direct route. `task_size=Medium`, `architectural_risk=Low`; the Solution Designer's handoff rules sent it straight to implementation, with no independent architecture review.
- Requirements doc: `tickets/in-progress/release-smoke-new-run-skill-links/requirements-doc.md` (SR-001, Approved)
- Investigation notes: `tickets/in-progress/release-smoke-new-run-skill-links/investigation-notes.md`
- Solution revision record: `tickets/in-progress/release-smoke-new-run-skill-links/solution-revision-record.md` (SR-001)
- Design spec (required on every route): `tickets/in-progress/release-smoke-new-run-skill-links/design-spec.md` (SR-001, Ready)
- Supplemental task artifacts: `tickets/done/workspace-skill-collision-fix/` (evidence only)
- Design review report: `N/A — not applicable`
- Architecture review revision record: `N/A — not applicable`
- Triggering rework report, revision record, or evidence: IR-002 — `handoff-sr-003-release-cost-wording.md` (SR-003, SR-004), FU-002 in `follow-ups.md`, API/E2E `api-e2e-execution-coverage-report.md` / `api-e2e-revision-record.md` (API-REV-001)

## Current Implementation Summary

- Implementation cycle: `Rework` (IR-002, docs only)
- Implementation revision record: `tickets/in-progress/release-smoke-new-run-skill-links/implementation-revision-record.md`
- Current implementation revision ID: `IR-002`
- Related solution revision IDs: `SR-001`, `SR-003`, `SR-004`
- Related architecture-review revision IDs: `N/A`
- Related code-review revision IDs: `N/A`
- Related API/E2E revision IDs: `API-REV-001`
- Related delivery revision IDs: `N/A`
- Triggering finding IDs: `FU-002` (taken into this ticket by SR-002/SR-003)

What now exists:

1. `scripts/release_smoke.py` (new, stdlib Python 3.9+, no arguments). It is the release smoke policy owner: a fixed list of 13 required cases (Claude/Codex/Grok × 3 live scenarios, Antigravity × 2, AutoByteus × 2). It runs a preflight (`claude`/`codex`/`grok` (or `GROK_BUILD_COMMAND`) on `PATH`, `~/.codex/auth.json`). Then it runs three serial vitest steps, each with a clean environment and a JSON report in a `mkdtemp` folder outside the worktree. The verdict is fail-closed: each required case must match exactly one test, and that test must be `passed`. Any other failed test, any suite error and any change to `git status --porcelain` is a failure. It prints a runtime × scenario summary with the commit, models and step durations, and exits 0/1. On failure it keeps only the step logs and prints their folder.
2. `scripts/tests/test_release_smoke.py` (new, unittest, 21 tests): the verdict with synthetic reports (all pass, missing runtime, preflight reason, skipped, failed, other failed test, duplicate match, live ancestor matching, suite error, file-level error); preflight; per-step environments; the worktree guard; the models line; the failed-suite log reading; the summary. It also checks that every required title occurs exactly once in its suite source, so a renamed test breaks the unit test.
3. `workspace-skill-links-live.e2e.test.ts`:
   - pinned models (`haiku`, `gpt-5.6-luna`, `grok-4.7`) with the env overrides; an unavailable model throws `"<rt> model <m> is not offered; available: …"`. The stale candidates and the `available[0]` fallback are removed.
   - baseline fix: `ask` now also reads `SEGMENT_CONTENT_BATCH` (see Known Risks / IR-001).
   - the turn-error assertions carry the error text in their message.
   - header and `// Named by scripts/release_smoke.py` notes.
4. `agy-linked-skills-transport.e2e.test.ts`: E09 (a brand-new run) and E10 (a brand-new, lazily started team member). Both use an imported package agent with a configured skill, in a workspace with `.claude/.codex/.grok/skills` links to that skill. The scripted CLI's `READ_SKILLS` must show the capsule linking exactly the package skill (target, SKILL.md, sibling file). For E10, the member's memory folder must be absent before its first message. Both check that the workspace links are untouched and that nothing else was written into the workspace. The header is updated.
5. `configured-skill-on-demand-loading.e2e.test.ts`: two release smoke cases at factory level with the deterministic LLM: a brand-new run (memory folder absent) and a brand-new team member (team folder present, member folder absent), with the same package and linked workspace. One first message completes a turn. The model's system messages contain the skill's catalog entry, and its `SKILL.md` path resolves to the package skill. The memory folder exists afterwards and the links are untouched. `DeterministicLLM` now records the messages it receives; `createBackend` takes an optional workspace root and memory folder. A header comment was added.
6. `RELEASE.md`: "Checks Before Tagging" lists the command, and a new `### Release smoke check` subsection gives When / Prerequisites / Cost / Pass / Failure and waiver, plus the beta.2 reason. Since IR-002 the **Cost** bullet names the binding subscription quotas: Grok about 150–240k tokens per run against 600k per rolling 24 hours (roughly two runs a day), and Codex sharing the user's ChatGPT account quota. A quota refusal ("usage limit", 429) is handled like a runtime that cannot run: wait for the reset, or the user waives that runtime for this release and the waiver is recorded.
7. `TESTING.md`: one "Test layers" row, in its own `docs(testing)` commit (`8f37ab5eb8`).

Commits (base..head): `8e65be9e6f` baseline fix · `26a557f665` model pins · `3f02a176d4` AGY/native cases · `e918bb6c44` runner · `cbbb868f63` turn-error messages · `e8d2888695` runner names a failed suite hook · `6bd00b2f36` RELEASE.md · `8f37ab5eb8` TESTING.md · `f9d1db2aa0` RELEASE.md Cost wording (IR-002).

## Routing Classification (Mandatory)

- Task size: `Medium`
- Architecture risk: `Low`
- Design classification section / evidence reference: design-spec.md "Task Size And Architectural Risk"
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale: 8 files (3 suites, 1 runner + 1 unit test, RELEASE.md, TESTING.md, plus evidence). There is no production source, contract, persistence, security, concurrency, CI or workflow change. The only finding outside the planned delta is a stale frame read in the ticket's own live suite, fixed as a test-only baseline fix. None of the design's escalation triggers fired: no scenario needed a production change, no new server injection point was needed, and the vitest JSON report identifies tests per runtime through `ancestorTitles`.
- Selected route: `Direct API/E2E` (per `get_handoff_rules`)
- Lightweight implementation self-review completed for the direct route: `Yes` (see below)
- New design impact or escalation trigger: `None`

### Lightweight self-review

- Scope Guardrail: no production source; no `.github/workflows` and no `desktop-release.sh` change; `test-support/live-e2e/` untouched. No autobyteus-148 suite was repaired; the one test fix is in this ticket's own live suite. F2/F3 are not asserted: the "links untouched" checks run while the run is active, before termination, and AGY's `.agents/skills` refusal is not exercised.
- Fail-closed paths: missing runtime → "not available: …" or "no result"; skipped → "skipped: <suite error>"; duplicate title → error; any other failed test, suite error or non-zero vitest exit with no failed test → failure row. Each of these has a unit test; the real ones are shown in IMP-06/07/08.
- Test-owned data only: temp roots in every suite; Codex uses its throwaway `CODEX_HOME` (unchanged); scripted steps get a temp `HOME`; the runner writes only under `mkdtemp`. `git status --porcelain` was unchanged across every full run (IMP-07, IMP-08).
- Dead code: the stale model candidates and the fallback are removed. Nothing else in the touched files became unused.
- Size: `release_smoke.py` is 325 lines (274 non-empty); test files are outside the limit.

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001 | Smoke check before every tag; failure blocks | `scripts/release_smoke.py`; RELEASE.md "Release smoke check"; TESTING.md row | Implemented. The runner is fail-closed; IMP-06/07/08 show named failures and exit 1 |
| BEH-002 | No silent skip; cheapest pinned model, no fallback | Live suite `RUNTIMES[*].model` + throw; runner `preflight` + required cases | Implemented. A dropped runtime shows "not available: grok not on PATH"; a bogus model shows the available list (IMP-08) |
| BEH-003 | Run start unchanged; observed only | AGY E09/E10, native release-smoke cases, live suite (unchanged scenario logic) | Preserved. No production change; Claude/Codex/AGY/AutoByteus pass, Grok new run + restore passes (IMP-07) |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`

## Key Files Or Areas

- `scripts/release_smoke.py`, `scripts/tests/test_release_smoke.py`
- `autobyteus-server-ts/tests/e2e/runtime/workspace-skill-links-live.e2e.test.ts`
- `autobyteus-server-ts/tests/e2e/runtime/agy-linked-skills-transport.e2e.test.ts`
- `autobyteus-server-ts/tests/e2e/runtime/configured-skill-on-demand-loading.e2e.test.ts`
- `RELEASE.md` (Checks Before Tagging), `TESTING.md` (Test layers)

## Important Assumptions

- ASM-001 holds on this host: Claude, Codex and Grok are signed in.
- `gpt-5.6-luna` is the cheapest Codex model in today's catalog. The catalog offers `gpt-5.6-luna, gpt-5.6-sol, gpt-5.6-terra, gpt-6-astra, gpt-6-luna, gpt-6-sol, gpt-6.1-sol` (IMP-08).

## Known Risks

- **Grok free-usage quota (external; documented in RELEASE.md since IR-002).** Run 2 hit `429 … subscription:free-usage-exhausted … tokens (actual/limit): 612809/600000` on a rolling 24 h window (IMP-07). The total includes the user's own Grok use that day. Grok's skill lookup reads widely ("Let me search more broadly", `grep`/`run_bash`), so one smoke run spends far more Grok tokens than "five short turns" suggests. With the quota exhausted, the check fails closed with the 429 named. The release owner then waits for the window or asks for the user's waiver. RELEASE.md now states this (IR-002, SR-003), together with the Codex ChatGPT account quota that API/E2E hit on 2026-10-29.
- **Grok team member and collision cases not yet proven after the baseline fix.** Run 1 (before the fix) passed Grok's new run + restore and its collision case; its team member failed only on the stale frame read. Run 2 (after the fix) passed new run + restore, then hit the quota. One Grok-enabled run after the quota resets is needed (API/E2E).
- Live answers are stochastic, and there is no retry by design. So far every non-quota live case passed first time.
- RSK-001/003 (expired login, retired model) produce named failures (IMP-08 shows the model case).

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Feature (operational check)
- Reviewed root-cause classification: No Design Issue Found
- Reviewed refactor decision: No Refactor Needed
- Implementation matched the reviewed assessment: `Yes`
- If challenged, routed as `Design Impact`: `N/A`
- Evidence / notes: the selection policy lives only in the runner; the suites have no smoke mode, only stable titles and header notes. The shared package and linked-workspace setup was not extracted: each suite's harness differs (HTTP GraphQL, in-process `execGraphql`), as the design expected.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`
- Dead code in the touched files and modules removed: `Yes` (stale `preferredModels` entries, `?? available[0]`)
- Dead code found elsewhere, added to `follow-ups.md`: None
- Shared structures remain tight: `Yes` (`RequiredCase` has 4 fields; the live suite's runtime grouping is one suite-level constant, `SUITES_GROUPED_BY_RUNTIME`)
- Canonical shared design guidance was reapplied during implementation: `Yes`
- Changed source implementation files stayed within size guardrails: `Yes`
- Notes: none

## Persisted Data Transition Check (When Applicable)

- Approved decision: `Not Affected` (design-spec "Persisted Data / State Transition Decision")
- Implementation follows it: `Yes`. Only test-owned temp data.
- Deviation: `None`

## Environment Or Dependency Notes

- `pnpm install --frozen-lockfile` and `pnpm -C autobyteus-server-ts prebuild` ran in the worktree. Install builds the untracked `autobyteus-application-backend-sdk/dist/` and `autobyteus-application-sdk-contracts/dist/`. They are untracked build output and not committed; RELEASE.md already says to delete untracked `*/dist/` before the release script.
- Implementation deviations from the design text, each a detail inside the runner's ownership:
  1. The runner calls `autobyteus-server-ts/node_modules/.bin/vitest` instead of `pnpm -C autobyteus-server-ts exec vitest`. With a temp `HOME`, corepack downloads pnpm again on every scripted step ("Corepack is about to download …pnpm-10.28.2.tgz" was seen). Calling the local vitest binary avoids that network dependency. A missing binary is reported with the install commands.
  2. On a failed run the runner keeps the step logs (only those) in its temp folder outside the worktree and prints the path, so the failure can be diagnosed (TESTING.md Rule 9). A passing run removes everything.
  3. vitest's JSON report marks the tests of a suite whose `beforeAll` threw as `skipped`, with no message (verified, IMP-08). The runner therefore reads the first error under the step log's "Failed Suites" heading; this is how the unavailable model reaches the summary.
  4. The live suite's turn-error assertions gained a message carrying the errors. The assertions themselves are unchanged. Without it, a provider failure reads `expected [ Array(1) ] to deeply equal []`.
- Python on this host is 3.9.6; the runner and its test run on it.

## Checks Run

| Check ID | Command Or Steps | Commit Tested | Environment | Code It Exercises | Behavior / Criteria IDs | Result | Evidence Files | Look For |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-01 | `python3 -m unittest scripts/tests/test_release_smoke.py -v` | `8f37ab5eb8` | macOS, Python 3.9.6 | `scripts/release_smoke.py` | REQ-001, 004–006, 008; AC-004/005 logic | Pass | `evidence/IMP-01-unit-release-smoke.log` | `Ran 21 tests` / `OK` |
| IMP-02 | `pnpm -C autobyteus-server-ts typecheck` | `8f37ab5eb8` | macOS, node 22 | production `src` (unchanged) | AC-009 | Pass | `evidence/IMP-02-typecheck-server.log` | `exit=0` |
| IMP-03 | `tsc -p <temp tsconfig>` over the 3 changed suites | `8f37ab5eb8` | macOS, node 22 | the 3 suites | AC-009 (supporting) | Pass for changed lines; 2 errors in older lines | `evidence/IMP-03-typecheck-suites.log` | `error count: 2`, both `processedSystemPrompt … possibly 'null'` at lines 287/478, which `git blame` dates to 2026-08-12 and 2026-09-30 |
| IMP-04 | native suite on its own, clean env, temp HOME | `8f37ab5eb8` | macOS, vitest 4.0.18 | `configured-skill-on-demand-loading` + native factory | REQ-003, AC-003, AC-009 | Pass | `evidence/IMP-04-native-suite.log` | 4 × `passed` |
| IMP-05 | AGY suite on its own, `RUN_AGY_FAILURE_E2E=1`, scripted CLI, temp HOME | `8f37ab5eb8` | macOS, vitest 4.0.18 | `agy-linked-skills-transport` + server AGY path | REQ-003, AC-003, AC-009 | Pass | `evidence/IMP-05-agy-suite.log` | E01–E10 all `passed` |
| IMP-06 | `python3 scripts/release_smoke.py` (first full run) | `cba6b85122` + uncommitted changes (before `8e65be9e6f`) | macOS, signed-in CLIs | all three steps | AC-005 (real), REQ-005/006 | Fail, as expected: found the stale frame read | `evidence/IMP-06-smoke-run-1.txt` | 3 × `brand-new team member  FAIL  failed: AssertionError: expected '' to contain 'LINKCODE-…'`; `"text":""` with `"tools":["Skill"]` |
| IMP-07 | `python3 scripts/release_smoke.py` | `e918bb6c44` | macOS, signed-in CLIs | all three steps | AC-001/002/003/006/008 (partial) | Fail on Grok's external quota; all other cases Pass | `evidence/IMP-07-smoke-run-2.txt` | 11 PASS; `grok brand-new team member FAIL`; `free-usage-exhausted`; `models {"claude": "haiku", "codex": "gpt-5.6-luna", "grok": "grok-4.7"}`; `git status --porcelain before == after: yes`; `duration live 99s, antigravity 19s, autobyteus 8s` |
| IMP-09 | `python3 scripts/check_repository_artifact_hygiene.py`; review of the RELEASE.md diff against design-spec "Guidance For Implementation" (SR-003) | `f9d1db2aa0` | macOS, Python 3.9.6 | `RELEASE.md` Cost bullet only | AC-007, REQ-007 | Pass | `git show f9d1db2aa0 -- RELEASE.md` (the commit is the evidence) | exit 0; `- **Grok:** one run uses about 150–240k tokens against the free tier's 600k`; `- **Codex:** it uses the same ChatGPT account quota`; `wait for the reset, or the user waives that runtime` |
| IMP-08 | negative: `PATH` without grok + `CODEX_E2E_MODEL=bogus-model-for-smoke` + a temporary broken native assertion (reverted) | `e8d2888695` + temporary edit | macOS | runner preflight/verdict, live model check, native case | AC-004, AC-005, AC-006 | Pass (fails as required, exit 1) | `evidence/IMP-08-smoke-negative.txt` | `grok … FAIL not available: grok not on PATH`; `codex model bogus-model-for-smoke is not offered; available: gpt-5.6-luna, …`; `autobyteus … FAIL failed: AssertionError`; `exit=1` |

- Not run, and why:
  - IR-002 is a docs-only change to RELEASE.md: no code, test or suite changed since `8f37ab5eb8`, so IMP-01..08 stay valid (TESTING.md "Rerun by impact"). Per SR-004 the user accepted the per-case proof for AC-001; no smoke rerun was made.
  - A fully green live smoke (AC-001) and Grok's team member and collision cases after the baseline fix: blocked by Grok's rolling 24 h free-usage quota (IMP-07). Left to API/E2E once the quota resets.
  - The full server E2E suite and other gated suites: not affected (test-only changes in three files) and owned by API/E2E or autobyteus-148.
  - The `docs(testing)` and RELEASE.md commits change no code; IMP-01..05 ran on `8f37ab5eb8`, which includes them.

## Frontend Rendered-Result Check (When Applicable)

`Not Applicable`: no rendered frontend or UI change; release tooling and server E2E tests only.

## Downstream Coverage Hints / Suggested Scenarios

- AC-001/002: one full `python3 scripts/release_smoke.py` from the repository root on the branch head once Grok's quota allows. Expect 13 PASS, exit 0, the models line, and `git status` unchanged. It costs about 15 live turns; Grok's token use per run is the expensive part.
- AC-004 can be repeated at zero live cost the way IMP-08 did it. The bogus Codex model stops the live suite in `beforeAll`, before any turn.
- AC-007: doc review of RELEASE.md "Release smoke check" (anchor `#release-smoke-check`, used by the TESTING.md row) and the TESTING.md row.
- AC-008: run `git status --porcelain` before and after; the runner also checks this itself and prints a `worktree` FAIL row on a change.
- Check that the runner's 13 required titles still match: the unit test `test_titles_exist_in_the_suites` does that statically.

## API / E2E / Executable Coverage Investigation And Execution Still Required

- A full green live smoke run on the branch head (AC-001, AC-002 for Grok's team member and collision cases), recorded as release evidence.
- The negative runs as the design lists them (AC-004/005/006), if API/E2E wants its own record beyond IMP-08.
- Doc review for AC-007.
- Decide how to report the Grok quota risk: in the validation report, and as a note to the Solution Designer if RELEASE.md should mention it.
