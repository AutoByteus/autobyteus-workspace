# Handoff — prompt-section-tests-517, SR-001

- Result: `Architecture Design Complete`; `task_size=Small`, `architectural_risk=Low` → direct implementation
- Package: `prompt-section-tests-517`; Project Task `autobyteus-517`, item 1 only (FU-002..FU-005 stay for later, per the dispatch)
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/prompt-section-tests-517`, branch `codex/prompt-section-tests-517`, base `origin/personal` @ `2e9ac1e65b` (beta.10 released). Dependencies installed and Prisma client generated (Node 22.23.1). Ticket documents not committed yet; commit them with the change.

## Request

Founder (beta.10, Task comment 2026-11-18): "create a follow-up, and if the fix is extremely easy, just fix it". Fix the stale heading list in `autobyteus-server-ts/tests/e2e/runtime/configured-skill-on-demand-loading.e2e.test.ts` (~line 291), check the other prompt-section tests, add the TESTING.md rule only if easy.

## Findings

- Reproduced (`evidence/SD-01-repro-before-fix.log`): 1 failed / 3 passed, `:291:70`; the only difference is `"## Long-Running Commands"` between `"## File And Directory Practice"` and `"## Skills"` (added by autobyteus-483; the product is right).
- No other test asserts a complete prompt-section list; the others assert single headings or order, or already include the section.
- The rule is easy: one row in TESTING.md "Choosing the path" (text in design-spec.md), like the existing "tools a run gets" row.

## Build

1. Add the one line in the test; rerun it (AC-001).
2. Run the prompt unit tests and member-collaboration parity (AC-002).
3. TESTING.md row, own commit `docs(testing): …`; TESTING.md is the API/E2E engineer's document, so it confirms the row (AC-003).

Release only on the founder's word. After delivery: the full cleanup and a record copy (PM's request).

## Route record

- 2026-11-18: rule "Small or Medium and Low" → `/implementation_engineer`.
