# Implementation Handoff — autobyteus-355

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: Small / Low; no architecture review selected; direct implementation (Solution Designer, "Architecture Design Complete, SR-001").
- Requirements doc: `tickets/in-progress/release-guide-notes-and-grok-smoke/requirements-doc.md` (REQ-001..REQ-006, AC-001..AC-005, DEC-001..DEC-004)
- Investigation notes: `investigation-notes.md` (E-01..E-13, A-01..A-03), plus `investigation-probe-nested-beforeall.test.ts.txt`
- Solution revision record: `solution-revision-record.md` (SR-001)
- Design spec (required on every route): `design-spec.md` (SR-001, Ready; D-1..D-4)
- Supplemental task artifacts: `handoff-architecture-design-complete.md`, `follow-ups.md`
- Design review report: `N/A — not applicable`
- Architecture review revision record: `N/A — not applicable`
- Triggering rework report, revision record, or evidence: `N/A` (initial)

## Current Implementation Summary

- **D-1 (RELEASE.md, template).**
  - "Release Decision → Beta" now points to the new rule.
  - "Cutting The Release" has a new subsection, "Beta notes with a user action". It has four steps: the ticket writes the section; delivery collects the sections before tagging; after all four workflows succeed, `gh release edit` puts them above the generated notes; the delivery report names the tickets.
  - "Workflow Reference → Release notes" adds that this section is added afterwards by hand.
  - `.github/release-notes/template.md` gets an optional first section, `## What you need to do`, with a one-line comment.
- **D-2 (live suite).**
  - The availability and model check moved from the shared `beforeAll` into a `beforeAll` inside `describe.each(enabledRuntimes)`.
  - `RUNTIMES` now holds `pin` and `override` separately.
  - The choice rule is `chooseLiveModel` in a small helper next to the suite, `tests/e2e/helpers/live-model-choice.ts`, so a unit test can import it without loading the gated suite.
  - Each runtime prints one `SKILL_LINKS_LIVE_MODEL` line.
  - The header comment states the rule. Test titles and the `describe.each` title are unchanged.
- **D-3 (runner).**
  - `read_models` collects every `SKILL_LINKS_LIVE_MODEL` line and notes a fallback.
  - `failed_suite_error` is replaced by `failed_suite_errors`. It returns `{runtime: error}` from `FAIL … > <runtime>` lines under "Failed Suites", with `""` meaning the whole file, and stops at "Failed Tests".
  - `evaluate` takes `runtime_errors`, which explain only that runtime's cases.
  - `main` keeps the fail-closed rules. A whole-file error still becomes the suite error. The "vitest exited N without a failed test" fallback is used only when no suite error and no failed test were found.
- **D-4 (proof).**
  - 5 unit tests for the choice rule.
  - 3 new or rewritten runner unit tests (23 in total).
  - A token-free fake Grok ACP CLI, `scripts/tests/fixtures/fake-grok-acp.mjs`, executable.
  - Two live-suite runs with only the fake Grok enabled, (a) and (b).
- Implementation cycle: `Initial`
- Implementation revision record: `implementation-revision-record.md`
- Current implementation revision ID: `IR-001`
- Related solution revision IDs: `SR-001`
- Related architecture-review revision IDs: `N/A`
- Related code-review revision IDs: `N/A`
- Related API/E2E revision IDs: `N/A`
- Related delivery revision IDs: `N/A`
- Triggering finding IDs: `N/A`
- Commits on `codex/release-guide-notes-and-grok-smoke`:
  - `6cc367a37e`: the change, plus the ticket folder as received;
  - `927e343504`: a docstring wrap in `release_smoke.py`;
  - the following docs commit: evidence, this handoff, the revision record, follow-up FU-1.

### Final RELEASE.md wording (for the report to the user)

Release Decision, Beta bullet (added sentence):

> When a ticket in the release needs an action from users, the beta's notes also carry it (see [Beta notes with a user action](#beta-notes-with-a-user-action)).

Cutting The Release, new subsection:

> ### Beta notes with a user action
>
> 1. A ticket whose change needs an action from users writes it under `## What you need to do` in its `release-notes.md`. Otherwise it leaves the section out.
> 2. Before tagging, list the release's tickets (the merges in `git log <previous-tag>..HEAD`) and collect their sections under one `## What you need to do` heading in `/tmp/actions.md`. With none, the generated notes stand alone.
> 3. After all four workflows have succeeded and the assets are complete (see [Watching The Rollout](#watching-the-rollout)), put the section above the generated notes:
>
>    ```bash
>    gh release view vX.Y.Z-beta.N --json body --jq .body > /tmp/generated.md
>    { cat /tmp/actions.md; echo; cat /tmp/generated.md; } > /tmp/notes.md
>    gh release edit vX.Y.Z-beta.N --notes-file /tmp/notes.md
>    ```
>
>    Only the notes change; the tag and the assets do not.
> 4. The delivery report names the tickets whose sections were used.

Workflow Reference → Release notes (added sentence on the pre-release line):

> A user-action section is added afterwards by hand, as [Cutting The Release](#beta-notes-with-a-user-action) says.

Template, new first section:

```markdown
## What you need to do
<!-- Only when users must act (for example: reinstall the Docker launcher, then run `autobyteus-docker upgrade --all`); otherwise remove it. -->
- ...
```

## Routing Classification (Mandatory)

- Task size (`Small`/`Medium`/`Large`): `Small`
- Architecture risk (`Low`/`High`): `Low`
- Design classification section / evidence reference: `design-spec.md` → "Task Size And Architectural Risk"
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale for confirmation or change:
  - Only these files changed: documentation, the template, one E2E test file, a new test helper and its unit test, the runner script and its tests, and one fixture.
  - No product code, workflow, `desktop-release.sh`, API, persistence or deployment change.
  - The escalation trigger (a workflow edit or a server code change) was not hit.
- Selected route (`Direct API/E2E`/`Code Review`/`Solution Designer`): `Direct API/E2E` (per `get_handoff_rules`)
- Lightweight implementation self-review completed for the direct route: `Yes` (below)
- New design impact or escalation trigger: `None`

### Lightweight self-review (Small / Low)

- **Scope.** Every changed file is in the design's Change Scope. There are two new files:
  - `tests/e2e/helpers/live-model-choice.ts`, the "small helper beside it" the design allows;
  - its unit test, `tests/unit/e2e-helpers/live-model-choice.test.ts`.
  Nothing was touched among the workflows, `desktop-release.sh`, the Claude/Codex pins, the waiver rule or product code.
- **Titles.** The `describe.each` title (`%s`) and the three test titles are byte-identical. The runner test `test_titles_exist_in_the_suites` passes.
- **Choice rule.**
  - An empty list is always an error.
  - An override is never replaced by a fallback.
  - Only `name === "grok"` falls back; Claude and Codex throw the same "not offered" error as before.
  - The shared `beforeAll` no longer checks availability per runtime: a runtime that is not enabled on the server now fails only its own group (REQ-003). This is intended.
- **Runner parsing.**
  - The parser stops at the "Failed Tests" heading, so test-level `FAIL … > grok > <title>` lines are never read as whole-file errors. A unit test covers this.
  - `❯` and `⎯` lines are skipped, as are the stack lines `❯ notOffered …` seen in IMP-05.
  - An error shared by several `FAIL` headers is assigned to each of them.
  - The old single-line reader and the single-error attribution are removed, with no dual read.
- **Fail-closed.**
  - Every required case must still pass.
  - Runtime errors only add a reason to rows that already fail.
  - A whole-file error still adds an `other` row.
- **Cleanup.** The removed items are the shared loop, `SKILL_LINKS_LIVE_MODELS`, `MODELS_LINE_RE`, `failed_suite_error` and "there is no fallback". There is no dead code left in the touched files.
- **Fixed during self-review.** I re-wrapped a docstring line I had lengthened past the file's width (`927e343504`).

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001 / REQ-001, REQ-002, AC-001 | A beta carries the user-action sections of its tickets above the generated notes; the template has the optional section | `RELEASE.md` (Release Decision → Beta; Cutting The Release → "Beta notes with a user action"; Workflow Reference → Release notes); `.github/release-notes/template.md` | Done. The wording is quoted above for the user. Stable releases take the section through the same template |
| BEH-002 / REQ-003, AC-002 | A runtime's model or catalog problem fails only that runtime's cases | `workspace-skill-links-live.e2e.test.ts`: per-runtime `beforeAll` inside `describe.each`; `release_smoke.py` `failed_suite_errors` + `evaluate(runtime_errors)` | IMP-01 (vitest behaviour), IMP-05 (Grok group skipped with "not offered"), IMP-03 `test_runtime_setup_error_fails_only_that_runtime`, IMP-06 (runner on the real log: only the Grok rows carry the error) |
| BEH-003 / REQ-004, AC-003 | Without an override, Grok uses `grok-4.7` if offered, else the first offered model; the summary names it | `live-model-choice.ts` `chooseLiveModel`; `SKILL_LINKS_LIVE_MODEL` line; `release_smoke.py` `read_models` | IMP-02, IMP-04 (`SKILL_LINKS_LIVE_MODEL {"runtime":"grok","model":"grok-4.5","pinned":"grok-4.7"}`), IMP-06 (`models    {"grok": "grok-4.5 (pinned grok-4.7 not offered)"}`) |
| BEH-003 / REQ-005, AC-004 | An override must be offered; no fallback | `chooseLiveModel` override branch | IMP-02, IMP-05 (`Error: grok model grok-4.7 is not offered; available: grok-4.5, grok-4.6`, 3 skipped) |
| REQ-006, AC-005 | No tokens, no keys | Fake Grok is the only runtime (`RUN_CLAUDE_E2E`/`RUN_CODEX_E2E` unset, temp HOME); the fake refuses prompts | IMP-04/05 cases fail at `ACP_PROMPT_FAILED … fake Grok refuses prompts` (expected); IMP-08 key scan 0 matches, gitleaks "no leaks found" |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`

## Key Files Or Areas

- `RELEASE.md`, `.github/release-notes/template.md`
- `autobyteus-server-ts/tests/e2e/runtime/workspace-skill-links-live.e2e.test.ts`
- `autobyteus-server-ts/tests/e2e/helpers/live-model-choice.ts` (new)
- `autobyteus-server-ts/tests/unit/e2e-helpers/live-model-choice.test.ts` (new)
- `scripts/release_smoke.py`, `scripts/tests/test_release_smoke.py`
- `scripts/tests/fixtures/fake-grok-acp.mjs` (new, mode 755)

## Important Assumptions

- The design's step 2 says to list tickets from the `git log <previous-tag>..HEAD` merges. The guide keeps that wording and does not add a script.
- The fake reports version 1.0.46 and the agent-help tokens the server's CLI check requires (`stdio`, `--model`, `--reasoning-effort`, `--no-leader`). It reports MCP servers ready, so runs reach the prompt quickly instead of waiting out the readiness timeout.

## Known Risks

- From the design: the first offered Grok model may cost more than `grok-4.7`. The summary names it.
- If a future vitest version renders "Failed Suites" differently, `test_failed_suite_errors_by_runtime` will catch it. It uses a log captured in the exact vitest 4.1.12 format, ANSI included.
- The full `release_smoke.py` run was not executed, because it enables Claude and Codex and would spend tokens. IMP-06 instead applies its parsing and verdict functions to the real proof logs.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: test tooling and documentation, Small / Low
- Reviewed root-cause classification: one shared `beforeAll` checked every runtime's model (E-07, E-09); the runner attributed one error to every skipped case (A-02)
- Reviewed refactor decision: `No Refactor Needed`
- Implementation matched the reviewed assessment: `Yes`
- If challenged, routed as `Design Impact`: `N/A`
- Evidence / notes: IMP-01 confirmed the vitest behaviour that the design relies on.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`. The old `SKILL_LINKS_LIVE_MODELS` line is no longer read.
- Legacy old-behavior retained in scope: `No`
- Dead code in the touched files and modules removed (Core Principle 7): `Yes`
- Dead code found elsewhere, added to `follow-ups.md`: FU-1. This is a broken import block, not dead code, in `tests/e2e/helpers/claude-live-agent-harness.ts`.
- Shared structures remain tight: `Yes`
- Canonical shared design guidance was reapplied during implementation: `Yes`
- Changed source implementation files stayed within size guardrails: `Yes`. `release_smoke.py` is 350 lines (298 non-empty). The other changed files are tests and fixtures.
- Notes: none

## Persisted Data Transition Check (When Applicable)

- Approved decision: `Not Affected`. No persisted data.

## Environment Or Dependency Notes

- The worktree needed `pnpm install` and `pnpm -C autobyteus-server-ts prebuild` (TESTING.md). These leave untracked `autobyteus-application-backend-sdk/dist/` and `autobyteus-application-sdk-contracts/dist/`, which were not committed.
- Proof scratch files are in `/tmp/ab355`: raw logs, JSON reports and the temp HOME.

## Checks Run

| Check ID | Command Or Steps | Commit Tested | Environment | Code It Exercises | Behavior / Criteria IDs | Result | Evidence Files | Look For |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-01 | The ticket's probe copied to `autobyteus-server-ts/tests/zz-ab355-probe.test.ts`, run with `vitest run --reporter=default --reporter=json`, then deleted | `efd28d5c4a` (base) | macOS, Node, vitest 4.1.12 | vitest nested `describe.each` `beforeAll` | REQ-003 basis (A-01) | Pass | `evidence/IMP-01-vitest-probe.log` | `FAIL  tests/zz-ab355-probe.test.ts > live suite > grok`; `Tests  4 passed \| 2 skipped (6)`; report `['live suite', 'grok'] case A skipped` |
| IMP-02 | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/e2e-helpers/live-model-choice.test.ts --reporter=verbose` | `6cc367a37e` | macOS, vitest 4.1.12 | `live-model-choice.ts` | REQ-004, REQ-005, AC-003, AC-004 | Pass | `evidence/IMP-02-choice-rule-unit.log` | `Tests  5 passed (5)` |
| IMP-03 | `python3 -m unittest -v scripts/tests/test_release_smoke.py` | `927e343504` | macOS, Python 3 | `release_smoke.py` | REQ-003, REQ-004, AC-002, AC-003 | Pass | `evidence/IMP-03-runner-unit.log` | `Ran 23 tests`, `OK`; `test_runtime_setup_error_fails_only_that_runtime ... ok` |
| IMP-04 | Live suite in a clean env with only the fake Grok enabled: `RUN_GROK_E2E=1 GROK_BUILD_COMMAND=<fake-grok-acp.mjs>`, temp HOME, no override | `6cc367a37e` | macOS, vitest 4.1.12; fake Grok | Live suite per-runtime `beforeAll`, `chooseLiveModel`, the fake | REQ-004, REQ-006, AC-003, AC-005 | Pass (the 3 cases fail at the fake's prompt refusal, as designed) | `evidence/IMP-04-fake-grok-run-a.log` | `SKILL_LINKS_LIVE_MODEL {"runtime":"grok","model":"grok-4.5","pinned":"grok-4.7"}`; `ACP_PROMPT_FAILED","message":"fake Grok refuses prompts` |
| IMP-05 | As IMP-04, plus `GROK_E2E_MODEL=grok-4.7` | `6cc367a37e` | Same | Same (override branch) | REQ-003, REQ-005, AC-002, AC-004 | Pass | `evidence/IMP-05-fake-grok-run-b.log` | `FAIL … > workspace skill links with real runtimes (REQ-105) > grok`; `Error: grok model grok-4.7 is not offered; available: grok-4.5, grok-4.6`; `Tests  3 skipped (3)` |
| IMP-06 | The runner's `parse_report`, `failed_suite_errors`, `read_models`, `evaluate` and `format_summary` applied to the IMP-04/05 logs and reports (Claude/Codex marked "disabled for this proof") | `6cc367a37e` | macOS, Python 3 | `release_smoke.py` on real vitest output | REQ-003, REQ-004, AC-002, AC-003 | Pass | `evidence/IMP-06-runner-on-proof-logs.txt` | (a) `models    {"grok": "grok-4.5 (pinned grok-4.7 not offered)"}`; (b) `grok        brand-new team member                FAIL    skipped: Error: grok model grok-4.7 is not offered; available: grok-4.5, grok-4.6` |
| IMP-07 | `tsc --noEmit` with a temporary tsconfig extending `autobyteus-server-ts/tsconfig.json` over the changed test files, compared with the base version of the live suite | `6cc367a37e` vs `efd28d5c4a` | tsc 5 | Changed test files | — | Pass (no new errors) | `evidence/IMP-07-typecheck-changed-tests.txt` | `none: the same 20 TS4111 … errors before and after; 0 errors in the two new files.` |
| IMP-08 | Key-shape grep and `gitleaks dir` over the proof logs; `scripts/check_secrets.sh origin/personal..HEAD`; artifact hygiene; licensing | `6cc367a37e` | macOS, gitleaks 8.30.1 | Logs, commit | REQ-006, AC-005 | Pass | `evidence/IMP-08-keys-gate-hygiene.txt` | 0 matches in each file; `no leaks found`; `secret gate: PASS (no secrets found)`; `Hygiene (exit 0)`; `Licensing is consistent.` |

- Not run, and why:
  - The full `python3 scripts/release_smoke.py`: it enables real Claude, Codex and Grok and spends tokens. It is the release-time check.
  - A live run against the real Grok CLI: this also spends tokens.
  - The server build typecheck: `tsconfig.build.json` covers `src` only, and no `src` file changed.

## Frontend Rendered-Result Check (When Applicable)

`Not Applicable`: the change covers documentation, test tooling and a release script; nothing is rendered.

## Downstream Coverage Hints / Suggested Scenarios

- Rerun IMP-04 and IMP-05 (token-free) if you want your own copy. Both commands are in the evidence headers. Leave Claude and Codex disabled.
- A mixed case: the fake Grok with `GROK_E2E_MODEL=grok-4.7`, plus one of Claude or Codex enabled. Only Grok's cases should be skipped. This needs a real Claude/Codex run, which costs tokens. It is not needed unless the user approves the spend; IMP-01 and the runner tests cover the mixed shape without tokens.
- Read the RELEASE.md wording as a delivery engineer would follow it (AC-001).

## API / E2E / Executable Coverage Investigation And Execution Still Required

- API/E2E judges AC-001..AC-005 from this evidence or its own token-free reruns. No release and no tokens.
