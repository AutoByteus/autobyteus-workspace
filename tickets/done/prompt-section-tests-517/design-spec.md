# Design Spec

## Solution And Approval Basis

- Current solution revision ID: `SR-001`
- Approved baseline: `requirements-doc.md` SR-001 (Solution Designer within the direction; user informed 2026-11-18)
- User approval of the design: `Not required`
- Design status: `Ready`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/prompt-section-tests-517/tickets/in-progress/prompt-section-tests-517/investigation-notes.md`
- Authorities read: `references/architecture-design.md`, `references/design-principles.md`, `references/project-documents.md`, `DESIGN.md` (rule 11), `TESTING.md` (update rules; Choosing the path).
- Conflicts: None.

## Current-State Read

The native prompt is composed by `composeNativeAutoByteusPrompt` (`carpenter-prompt-composer.ts`), which appends `NATIVE_LONG_RUNNING_COMMAND_SECTION` after File And Directory Practice; the test's exhaustive list at `configured-skill-on-demand-loading.e2e.test.ts:291-297` predates it (reproduced, `evidence/SD-01-repro-before-fix.log`).

## Task Size And Architectural Risk (Mandatory)

- Task size: `Small` — one line in one test file, one row in TESTING.md.
- Architectural risk: `Low` — no product code; no contract, persistence, security or runtime change.
- Escalation trigger: if the fixed test fails for a reason other than the heading list, return it as a finding; do not change product code.

## Intended Change

1. Test: add `"## Long-Running Commands",` between `"## File And Directory Practice",` and `"## Skills",` at line ~295.
2. TESTING.md: one row in the "Choosing the path" table, after the "tools a run gets" row:

   | A runtime's system prompt: the composer or a section in `autobyteus-server-ts/src/agent-execution/prompt/`, or the section a backend passes to it | The prompt unit tests (`tests/unit/agent-execution/prompt`, the backends' bootstrapper and factory tests), plus a search of every test layer, gated suites included, for exact prompt-section assertions (`match(/^## .+$/gm)`, `processedSystemPrompt`, `carpenterSystemPrompt`, prompt snapshots); run each file found: an E2E test lists a run's complete sections, so the unit tests alone miss it |

   Committed on its own as `docs(testing): a system prompt change runs every exact prompt-section test`. TESTING.md is owned by the API/E2E engineer (project-documents.md): implementation may draft the row; the API/E2E engineer confirms or rewrites it in its round.

## Change Scope (Mandatory)

- In scope: UC-001, UC-002; `autobyteus-server-ts/tests/e2e/runtime/configured-skill-on-demand-loading.e2e.test.ts`; `TESTING.md`.
- Derived consumers: N/A.
- Deliberately left alone: product prompt code; the other prompt tests (checked, not stale: investigation notes); FU-002..FU-005.
- Follow-ups: None new.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior | Requirement / AC | Change |
| --- | --- | --- |
| BEH-001 | REQ-001, AC-001 | test list updated |
| BEH-002 | REQ-003, AC-003 | TESTING.md row |

## Task Design Health Assessment (Mandatory)

- Change posture: `Cleanup` (stale test) plus the testing rule for a problem a later stage caught (project-documents.md).
- Current design issue found: `No`.
- Structural triggers: none fire (no product structure touched).
- Deviations: None.
- Root cause: `No Design Issue Found` in product code; the test was not run by 483's validation.
- Refactor needed now: `No`.

## Legacy Removal Policy / Persisted Data

- Legacy: None. Persisted data: `Not Affected`.

## Data-Flow Spines, Ownership, Interfaces, Files

N/A — test and doc only. Files: the two above.

## Removal / Decommission Plan (Mandatory)

None.

## Backward-Compatibility Rejection Log (Mandatory)

N/A.

## Change / Refactor Sequence

1. Fix the test; run the reproduction command (AC-001).
2. Run the prompt unit tests and member-collaboration parity (AC-002).
3. TESTING.md row in its own commit (AC-003).

## Guidance For Implementation

- Reproduction to start from: `cd autobyteus-server-ts && pnpm exec vitest run tests/e2e/runtime/configured-skill-on-demand-loading.e2e.test.ts --no-watch` (fails 1/4 before, `:291:70`).
- The worktree already has `pnpm install` and the Prisma client (Node 22.23.1).
