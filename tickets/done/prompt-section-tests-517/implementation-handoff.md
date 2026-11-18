# Implementation Handoff — prompt-section-tests-517

Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/prompt-section-tests-517`, branch `codex/prompt-section-tests-517`, base `origin/personal` @ `2e9ac1e65b`. Paths below are relative to the worktree.

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: direct route (`task_size=Small`, `architectural_risk=Low`); `get_handoff_rules` → `/api_e2e_engineer`.
- Requirements doc: `tickets/in-progress/prompt-section-tests-517/requirements-doc.md` (SR-001)
- Investigation notes: `tickets/in-progress/prompt-section-tests-517/investigation-notes.md`
- Solution revision record: `tickets/in-progress/prompt-section-tests-517/solution-revision-record.md`
- Design spec: `tickets/in-progress/prompt-section-tests-517/design-spec.md` (SR-001)
- Supplemental: `evidence/SD-01-repro-before-fix.log`
- Design review report / architecture review revision record: `N/A — not applicable`

## Current Implementation Summary

- Implementation cycle: `Initial`; revision record `tickets/in-progress/prompt-section-tests-517/implementation-revision-record.md`; current `IR-001`; related `SR-001`; others `N/A`; triggering findings `N/A`.
- Commits: `71a0caeecc` test fixes; `7fffdadab7` `docs(testing): a system prompt change runs every exact prompt-section test` (TESTING.md alone); then the ticket-documents commit.

What changed (tests and TESTING.md only; product code unchanged, DESIGN.md rule 11):

1. `autobyteus-server-ts/tests/e2e/runtime/configured-skill-on-demand-loading.e2e.test.ts`: the native prompt's heading list gains `"## Long-Running Commands"` between `"## File And Directory Practice"` and `"## Skills"` (REQ-001).
2. **Beyond REQ-002's recorded finding** ("no other test … none"): two more suites assert how a composed prompt *ends*, and autobyteus-483 had made them stale too. The tests ended on the Project / Semantic Memory section, but every composed prompt now ends with the runtime's Long-Running Commands section.
   - `autobyteus-server-ts/tests/e2e/agent-definitions/agent-semantic-memory.e2e.test.ts` (scripted AGY CLI, `RUN_AGY_FAILURE_E2E=1`). Before: 6 of 9 failed. SM-03..SM-06 failed at their `endsWith` checks; SM-07 and SM-10 failed as knock-on effects (SM-04 stops before writing the document both read). The fix is in `composedOf`: it now checks that the section is present and nothing follows it, then returns the prompt before it. Every case still pins what comes before the section, unchanged. After: 9/9.
   - `autobyteus-server-ts/tests/e2e/runtime/agent-semantic-memory-live.e2e.test.ts` (gated live, Codex): the two `baseInstructions.endsWith(…)` checks (SML-CODEX-TEAM, SML-CODEX-OFF) go through the same rule (`beforeLongRunningCommands`). Not run (real Codex).

   This stays inside REQ-002's intent (other exact prompt-structure assertions match the product) and the Scope Guardrail (tests only, no product change). The Solution Designer may want to correct the investigation's finding ("the other prompt tests: checked, not stale").
3. `TESTING.md` "Choosing the path": one row after "The tools a run gets", as in the design, with one addition. The search terms also name `baseInstructions`, `promptOf` and `.endsWith(` on a prompt, and the reason says E2E tests "list a run's complete sections or check how its prompt ends": the design's terms alone did not find the two semantic-memory suites. TESTING.md is the API/E2E engineer's document: please confirm or rewrite the row (AC-003).

## Routing Classification (Mandatory)

- Task size `Small`, architecture risk `Low` (design-spec); `Confirmed` — three test files and one doc row, no product code.
- Selected route: `Direct API/E2E`; lightweight self-review: `Yes`; new design impact: `None` (the extra stale suites are the same kind of fix inside REQ-002's intent, noted above).

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001 (REQ-001/REQ-002) | Prompt-section E2E tests match the product | the three test files above | AC-001 4/4 (IMP-01); semantic-memory scripted 9/9 (IMP-03); AC-002 prompt unit + backend + parity 164/164 (IMP-04) |
| BEH-002 (REQ-003) | TESTING.md row | `TESTING.md` | AC-003: own commit `7fffdadab7`; API/E2E confirms |

- Changes stayed within the Scope Guardrail: `Yes`

## Key Files Or Areas

`autobyteus-server-ts/tests/e2e/runtime/configured-skill-on-demand-loading.e2e.test.ts`, `autobyteus-server-ts/tests/e2e/agent-definitions/agent-semantic-memory.e2e.test.ts`, `autobyteus-server-ts/tests/e2e/runtime/agent-semantic-memory-live.e2e.test.ts`, `TESTING.md`.

## Important Assumptions / Known Risks

- The live helper uses the same logic as the scripted suite's `composedOf`, which passed; the live suite itself was not run.

## Task Design Health Assessment Implementation Check

- Posture: test maintenance (tests follow the code); root cause: tests not updated with autobyteus-483 (my own round missed them: I searched gated suites for payload fixtures, not for prompt-structure assertions; the new TESTING.md row closes that gap). Refactor: none. Matched the assessment: `Yes`. Design Impact: `N/A`.

## Legacy / Compatibility Removal Check

- Compatibility mechanisms: `None`; legacy retained: `No`; dead code in touched files: `Yes` (none found); dead code elsewhere: None; shared structures: `Yes`; deviations: the TESTING.md row's added search terms (above); size guardrails: `Yes` (test files and a doc).

## Persisted Data Transition Check

`Not Affected`.

## Environment Or Dependency Notes

macOS 26.5.2, Node 22.23.1; the worktree's `pnpm install` and Prisma client as prepared by the Solution Designer.

## Checks Run

Evidence folder: `tickets/in-progress/prompt-section-tests-517/evidence/`.

| Check ID | Command Or Steps | Commit Tested | Environment | Code It Exercises | Criteria | Result | Evidence Files | Look For |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-00 | `cd autobyteus-server-ts && pnpm exec vitest run tests/e2e/runtime/configured-skill-on-demand-loading.e2e.test.ts --no-watch` (before) | `2e9ac1e65b` | Node 22 | native prompt sections | reproduction | Fail (expected) | `IMP-00-repro-before.log` | `:291:70`, `Tests  1 failed \| 3 passed (4)` |
| IMP-01 | same command, after the fix | `71a0caeecc` content (working tree) | Node 22 | same | AC-001 | Pass | `IMP-01-e2e-after.log` | `Tests  4 passed (4)` |
| IMP-02 | `env -i PATH="$PATH" HOME="$HOME" TMPDIR="$TMPDIR" RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=$PWD/autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs pnpm -C autobyteus-server-ts exec vitest run tests/e2e/agent-definitions/agent-semantic-memory.e2e.test.ts --no-watch` (before its fix) | `2e9ac1e65b` (+ IMP-01's line) | scripted AGY CLI, no inference | AGY composed prompt | REQ-002 (finding) | Fail (expected) | `IMP-02-semantic-memory-e2e-before.log` | `Tests  6 failed \| 3 passed (9)` |
| IMP-03 | same command, after the `composedOf` fix | `71a0caeecc` content | same | same | REQ-002 | Pass | `IMP-03-semantic-memory-e2e-after.log` | `Tests  9 passed (9)` |
| IMP-04 | `pnpm exec vitest run tests/unit/agent-execution/prompt` + Claude/Codex/AGY/ACP/native backend prompt tests + `member-collaboration-instruction-provider-parity.test.ts` | `71a0caeecc` content | Node 22 | composer, sections, each backend's prompt | AC-002 | Pass | `IMP-04-prompt-unit-and-parity.log` | `Test Files  9 passed (9)`, `Tests  164 passed (164)` |
| IMP-05 | `pnpm -C autobyteus-server-ts typecheck` | `71a0caeecc` content | Node 22 | server src + tests | — | Pass | `IMP-05-server-typecheck.log` | `(baseline 1012 in 316 files)`, `PASS` |
| IMP-06 | `pnpm -C autobyteus-web typecheck` | `71a0caeecc` content | Node 22 | web + cross-package tests | — | Pass | `IMP-06-web-typecheck.log` | `(baseline 87 in 37 files)`, `PASS` |

The search behind REQ-002 (no file needed beyond the list below): every test layer, gated suites included, for `match(/^## `, `processedSystemPrompt`, `carpenterSystemPrompt`, `baseInstructions`, `_meta.rules`, prompt `endsWith`, prompt snapshots, whole-prompt `toBe`. Results:
- Exact structure that needed a change: only the three files above.
- Everything else asserts single headings, order, `toContain`, compares a prompt with itself (`claude-agent-websocket-interrupt-resume`), builds its own literal prompt (`claude-session-manager.integration`), or uses fixture text (`system-instruction-activity-probe.mjs`).
- The unit-level ones are in IMP-04.

- Not run: `agent-semantic-memory-live.e2e.test.ts` (gated, real Codex/Claude/Grok/AGY/native; costs provider credits). The changed assertions are in SML-CODEX-TEAM and SML-CODEX-OFF (`RUN_CODEX_E2E=1`).

## Frontend Rendered-Result Check

`Not Applicable` — tests and TESTING.md only.

## Downstream Coverage Hints / API / E2E Still Required

- Confirm or rewrite the TESTING.md row (your document).
- Optionally run SML-CODEX-TEAM / SML-CODEX-OFF of the live semantic-memory suite (`RUN_CODEX_E2E=1`, header of the file) if you judge the live proof worth its cost.
