# API/E2E Coverage Investigation — e2e-task-execution-source-fixtures

## Investigation Meta

- Requirements Doc: `requirements-doc.md` (SR-001, Approved)
- Investigation Notes: `investigation-notes.md`
- Solution Revision Record: `solution-revision-record.md`
- Design Spec: `design-spec.md` (SR-001; Small / Low)
- Design Review Report / Architecture Review Revision Record: `N/A — not applicable` (direct route)
- Implementation Handoff: `implementation-handoff.md` (IR-001)
- Implementation Revision Record: `implementation-revision-record.md`
- Code Review Report / Revision Record: `N/A — not applicable` (direct route)
- Follow-ups: `follow-ups.md` (FU-001…FU-003)
- API/E2E Revision Record: `api-e2e-revision-record.md`; current revision `API-REV-001`; round 1; trigger IR-001

Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/e2e-task-execution-source-fixtures`, branch `codex/e2e-task-execution-source-fixtures`, base `dc530fdcb0`. Change commit `8a181fd642`; HEAD `cf88b340c0` adds ticket files only.

## Current Requirement And Design Basis

- REQ-001 / AC-001: the memory-collaboration e2e's task executions carry a valid `source` (record shape), and the whole file passes.
- REQ-002 / AC-002: both `TASK_EXECUTION_STARTED` payloads in the stream contract test carry a valid `source` (DTO shape), assertions unchanged, and both cases pass.
- REQ-003 / AC-003: no other test fails on `source`. That means full `pnpm test:e2e`, server unit and the three contract packages are green.
- DEC-001: shapes follow the existing valid examples. DEC-002: the ~30 passing fixtures stay as they are (FU-001).
- Implementation deviation: the org tree's two task executions also needed `source`, which surfaced once the first was fixed. Accepted: AC-001 is "the whole file passes", and REQ-003 covers it.

## Supported Scenarios And Real Usage

- The "users" here are developers and agents running the e2e suite (TESTING.md: green suites; Rule 9). The real trigger is `pnpm test:e2e` in a clean env after a server build.
- Added: red on base, which shows the same two files fail on `dc530fdcb0` with the `source` errors. That proves the fixtures, not something else, were the cause.
- FU-002 notes that a shared-foundation change needs the full e2e rerun (TESTING.md "Rerun by impact" rule 4). This round runs it independently.

## Changed Surface And Boundary Classification

Test fixtures only; no product surface. The exercised boundaries are the run-history record schema (`validateTeamRunExecutionTreePayload`, `validateAgentOrgRunExecutionTreePayload`), the team-stream contract parser, and the GraphQL memory views in the memory e2e. They are unchanged; the fixtures now satisfy them.

## Project Execution Discovery

- `TESTING.md`:
  - server E2E command `pnpm test:e2e`;
  - suites that start `dist/app.js` need `pnpm -C autobyteus-server-ts build` first (the IMP-02x setup gap);
  - clean env `env -i PATH HOME=<resolved temp> TMPDIR`;
  - Rule 9: fix or attribute every failure.

## Existing Durable Coverage Inventory

| Path / Test | Decision | Action |
| --- | --- | --- |
| `tests/e2e/memory/memory-collaboration-graphql.e2e.test.ts` | Needs Update (done by the ticket; assertions unchanged) | Validate red on base, green now |
| `tests/e2e/runtime/team-task-event-current-contract.e2e.test.ts` | Needs Update (case 1, done); case 2's weakness is FU-003 | Same |
| Server unit, contract packages | Still Valid (IMP-03, IMP-04) | Reuse: a test-fixture-only change in `tests/e2e` cannot affect them |

## Planned Cases

| Case ID | Criteria | Boundary | Kind | Steps | Why |
| --- | --- | --- | --- | --- | --- |
| API-R01 | AC-003 (unit, contracts) | server unit; three contract packages | Reused | IMP-03, IMP-04a/b/c | unchanged code; ran on `8a181fd642` |
| API-01 | AC-001, AC-002 (red proof) | both files as on base | Temporary Probe | copy the base versions (`git show dc530fdcb0:<file>`) into temporary sibling test files, run them, delete them | independent proof the fixtures were the cause |
| API-02 | AC-001, AC-002 | both files on HEAD | Existing Test | `env -i … vitest run <2 files>` | — |
| API-03 | AC-003 | full server e2e | Existing Test | `pnpm -C autobyteus-ts build`; `pnpm -C autobyteus-server-ts build`; `env -i … pnpm test:e2e` | independent rerun; TESTING.md rule 4 (FU-002) |

- Test progress log: `Yes`. Durable coverage by API/E2E: none. Broader validation: `Not Required` (no product change; the suites exercise the real schema and contract boundaries directly).

## Not Tested / Deferred

- FU-003 (case 2's `toThrow()` cannot tell its causes apart): recorded by the implementation with probe evidence, and outside this ticket. Not re-proven here.

## Investigation Decision

Proceed: `Yes`. Reroute: `No`.
