# API/E2E Test Review Report

## Review Meta

- Review Round: `2`
- Trigger: api_e2e_engineer, API/E2E round 4 Pass at 93% (API-REV-004, IR-005 `5c94518446`); request for proportional test-code review (CRR-002 condition)
- Requirements / Solution Revision Record / Design Spec reviewed as context: `.../requirements-doc.md` (AC-008), `.../solution-revision-record.md` (SR-015, SR-016), `.../design-spec.md` (T-5)
- Supplemental Task Artifacts Reviewed As Context: `wording/collaboration-prompt-complete-views.md` (the file the suite reads)
- Architecture Review Revision Record: `N/A — not applicable` (direct route)
- Implementation Revision Record Reviewed As Context: `.../implementation-revision-record.md` (IR-005)
- Original Code Review Report: `.../code-review-report.md` (CRR-005, Pass)
- Code Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/collaboration-prompt-wording/tickets/in-progress/collaboration-prompt-wording/code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-007`
- Coverage Investigation / Execution Coverage Report: `.../api-e2e-coverage-investigation.md` (not re-read), `.../api-e2e-execution-coverage-report.md`
- API/E2E Revision Record Reviewed As Context: `.../api-e2e-revision-record.md` (API-REV-004)
- API/E2E Result: `Pass` on the judging runtimes the user set (Claude Agent SDK with Sonnet; AutoByteus with DeepSeek flash). The Codex clause of AC-008 was not run because of the usage limit (user decision).
- Final Validation Confidence: 93%
- Prior unresolved test-review findings rechecked: T-1, T-2 (CRR-006); both resolved (API-REV-005)
- Project testing guideline applied: `TESTING.md`; no conflict.
- Supported Product Scenario Basis Confirmed: `Yes` (SCN-001..SCN-005; AC-001, AC-002, AC-005, AC-006, AC-008, T-5)

(`...` = `/Users/normy/autobyteus_org/autobyteus-worktrees/collaboration-prompt-wording/tickets/in-progress/collaboration-prompt-wording`)

## Reviewer Evidence Check

At the user's earlier request I opened the evidence rather than relying on the summary:
- `evidence/round5/LE-A1-analysis.txt`:
  - genuine unprompted delegator sends: 0 in all 53 analysed runs; no loops;
  - every helper first reply on the branch went by run id or by a reaching address (wrongTarget False everywhere on the branch);
  - the one wrong-target first reply is on the base (DeepSeek run 4).
- `LE-A1-*.exits`:
  - branch DeepSeek: runs 4 and 6 fail, 15 of 17 pass;
  - base DeepSeek: run 2 fails, 15 of 16 pass;
  - Sonnet: 10/10 on both sides.
- The three failed runs' kept traces each contain "rolled back: provider or response ingestion failed before a usable response".
- `D-final.log`: the suite passed 11/11.
- `journeys-analysis.txt`: J1/J3, 5 per runtime per side; reported 20/20 on each side; branch task messages show address + run id (20/20); wrongOrBoth is empty on both sides.
- `j2-team-trace.txt`: the reviewer received `sender address "/writer" and sender run id "…"` and answered `/writer`; the writer received "APPROVED" with the address header and sent nothing back.

## Changed Durable Test Scope

| Durable Test Path | Change | Related Scenario / Requirement | Coherent Test Responsibility | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/projects/collaboration-prompt-wording.e2e.test.ts` | Added (uncommitted, 431 lines) | AC-001/002 (CPW-P1..P3), AC-005 (CPW-R1..R3), AC-006 (CPW-M1..M4), T-5 (CPW-H1) | the collaboration texts an agent reads, through real Agent, Team and Org roots | Gated by `RUN_AGY_FAILURE_E2E`; scripted AGY actor |
| `autobyteus-server-ts/tests/e2e/helpers/collaboration-root-harness.ts` | Added (uncommitted, 258 lines) | shared driver for the suite | data dir, server, roots, scripted tool calls, prompt read-back, scoped MCP calls | Owns and cleans its data dir and sockets |
| `autobyteus-server-ts/tests/e2e/runtime/agent-initiated-collaborators.e2e.test.ts` | Updated, already committed in `5c94518446` | CRR-002 fix | `callTool` takes the completion whose arguments carry the requested values, then waits for idle after it | Correct |

- No durable test file changed: `No`

## Proportional Test-Code Checks

| Check | Result | Evidence / Notes |
| --- | --- | --- |
| Scenario grouping and names make intent clear | Pass | Case IDs map to §3 rows, catalogue IDs (M-xx) and T-5 |
| Assertions prove approved requirements | Pass | CPW-P compares each real run's prompt with the approved views; CPW-R3 collects all catalogue mismatches; CPW-H1 asserts both header and task-message forms in each root |
| Fixtures, setup and helpers reuse meaningful repetition | Pass | one harness shared by every case |
| Test isolation and determinism for the boundary | Pass | Round 2: the suite reads `tests/e2e/fixtures/collaboration-prompt-complete-views.md` by default; its six blocks are byte-identical to the approved views (reviewer-checked); nothing is read from `tickets/` |
| Large files coherent and navigable | Pass | — |
| No stale, duplicated, disabled-without-reason or compatibility-only tests | Pass | Round 2: the CPW-R2 comment now states what the case proves (refusal delivered as a result, design T-4) |
| Coverage agrees with investigation and execution evidence | Pass | see the evidence check above |
| Test callers exercise an independently established scenario | Pass | real roots and tools; only the external CLI is scripted |
| Each test enters through the real trigger without unrealistic setup | Pass | agents act through scoped MCP calls as their CLI makes them; members start on their first message, as in real use (`wake`) |

## Findings

| Finding ID | Test Path / Scenario | Evidence | Required Action | Classification / Owner |
| --- | --- | --- | --- | --- |
| T-1 | `collaboration-prompt-wording.e2e.test.ts:38-39` (`viewsPath`) | The default expected-views path is `tickets/in-progress/collaboration-prompt-wording/wording/collaboration-prompt-complete-views.md`. Delivery archives ticket folders to `tickets/done/<ticket>/` (e.g. `tickets/done/collaboration-prompt-wording` does not exist yet, and other delivered tickets live there). Once this ticket is delivered, every gated scripted run of the suite throws ENOENT in `viewBlocks()`. The comment ("which is archived with it") assumes the path survives. | Keep the expected text where the test lives: copy the approved complete-views blocks the suite needs into a test fixture (e.g. `tests/e2e/fixtures/collaboration-prompt-complete-views.md`) and read it by default. Keep `COLLABORATION_VIEWS_FILE` as an override if useful. Rerun the suite. | `Local Fix` / api_e2e_engineer |
| T-2 | `collaboration-prompt-wording.e2e.test.ts:237-240` (CPW-R2) | The comment says the cross-Task refusal "propagate[s] as a thrown error … `MCP error -32603: Internal error` … The approved text is asserted here; it passes when the refusal is returned". SR-003 T-4 fixed this, and the case passes, so the comment now describes the opposite of current behavior. | Replace it with one line stating what the case proves (the refusal reaches the agent as a result with the §7.3 text, SR-003 T-4). | `Local Fix` / api_e2e_engineer |

Non-blocking observations:
- `callTool` (committed) also accepts a completion whose arguments render as `{}`. That keeps runtimes that omit tool arguments working, but on such a runtime an unrequested call could again be attributed. It's acceptable as is; note it if a runtime without argument echo is added.
- M-27: the product text has no final period, but the views do. This is already recorded by API/E2E; it is for the Solution Designer or implementation, not test code.

## Follow-ups

None new.

- Sent to: `None`

## Carry-forward for the owner (not test code)

- **AC-008, Codex:** not run on IR-005 because of the Codex usage limit, which resets 2026-10-22 09:16. The user decided that Claude Sonnet and DeepSeek flash are the judging runtimes this round. The Solution Designer should record this against AC-008 or schedule Codex after the reset; round 3's loop was Codex-specific.

## Round 2 (API-REV-005)

- T-1 resolved: new fixture `autobyteus-server-ts/tests/e2e/fixtures/collaboration-prompt-complete-views.md`, with a header saying to update it with the approved wording. The default `viewsPath` points at it; `COLLABORATION_VIEWS_FILE` remains an override; the run command no longer names the ticket path.
- T-2 resolved: one accurate line on CPW-R2.
- Reviewer rerun with the scripted AGY CLI in a clean environment: `collaboration-prompt-wording.e2e.test.ts` 11/11 (matches `evidence/round5/D-final-after-CRR-006.log`).

## Latest Authoritative Result

- Result: `Pass`
- Changed durable test paths reviewed: `autobyteus-server-ts/tests/e2e/projects/collaboration-prompt-wording.e2e.test.ts`, `autobyteus-server-ts/tests/e2e/helpers/collaboration-root-harness.ts`, `autobyteus-server-ts/tests/e2e/fixtures/collaboration-prompt-complete-views.md` (all uncommitted); `agent-initiated-collaborators.e2e.test.ts` `callTool` (committed in `5c94518446`)
- Unresolved finding IDs: None
- Recommended Recipient: `/software_engineering_team/delivery_engineer`
- Notes:
  - Carry-forward: the AC-008 Codex clause was not run on IR-005 (usage limit until 2026-10-22 09:16; the user's decision to judge on Claude Sonnet and DeepSeek flash). API/E2E has sent the Solution Designer a note to record it or schedule it.
  - Non-blocking notes: `callTool` `{}` match; the M-27 trailing period (text).
