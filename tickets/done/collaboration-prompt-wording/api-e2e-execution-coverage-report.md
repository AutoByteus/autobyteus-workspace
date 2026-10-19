# API/E2E Execution Coverage Report — `collaboration-prompt-wording`

## Execution Round Meta

- Requirements Doc: `tickets/in-progress/collaboration-prompt-wording/requirements-doc.md` (AC-008 as revised in SR-015)
- Investigation Notes / Solution Revision Record: `.../investigation-notes.md`, `.../solution-revision-record.md` (SR-001..SR-016)
- Design Spec: `.../design-spec.md` (T-4, T-5, F-5 no-reply rule); Supplemental: `.../wording/collaboration-prompt-wording-proposal.md`, `.../wording/collaboration-prompt-complete-views.md`
- Design Review Report / Architecture Review Revision Record: `N/A — not applicable`
- Implementation Handoff / Revision Record: `.../implementation-handoff.md` (IR-005), `.../implementation-revision-record.md`
- Code Review Report / Revision Record: `.../code-review-report.md` (CRR-005, pass 9.3/10), `.../code-review-revision-record.md` (CRR-001..CRR-005)
- Coverage Investigation / Ledger / Revision Record: `.../api-e2e-coverage-investigation.md`, `.../api-e2e-test-case-ledger.md`, `.../api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-005` (Local Fix of round 4 after CRR-006); Current Execution Round: 4
- Trigger: `code_reviewer` CRR-005 pass of IR-005 (`5c94518446`, pointer `88d1b8cd1f`, base `3712cd9bf0`), SR-015 route.
- Prior Round Reviewed: round 3 (`API-REV-003`, Fail, 88%, F-5 Codex echo loop)
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/collaboration-prompt-wording/tickets/in-progress/collaboration-prompt-wording/evidence/round5/` (folder numbers are mine and run one ahead of the round numbers: `evidence/` = round 1, `round2/` = round 2, `round3/` = an interrupted LM Studio attempt with no result, `round4/` = round 3, `round5/` = this round).

## Routing Classification

- Task size `Medium`; Architectural risk `Low`; Input route: reviewed (CRR-005); Successful-output route: proportional test-code review of my durable tests, which the code reviewer required in CRR-002 before they are committed, then delivery.

## Judging runtimes — the user's decision (this round)

- Codex could not run: the Codex CLI login on this machine is out of usage ("You've hit your usage limit … try again at Oct 22nd, 2026 9:16 AM", `evidence/round5/codex-usage-limit-probe.txt`). The 4 Codex runs started this round (2 per side) failed at the first model call, before any prompt text reached the model; they are excluded and say nothing about the wording.
- The user directed: test only **Claude Agent SDK with Sonnet** and the **AutoByteus runtime with DeepSeek flash** (`deepseek-v4-flash`), and "as long as Claude Sonnet and DeepSeek flash are successful then that's successful". AC-008's Codex clause (≥15 runs per side) is therefore not run; the Solution Designer should record this decision against AC-008 (or schedule a Codex rerun after the reset).
- Haiku runs started before the instruction are kept for reference only (`round5/haiku-and-codex-not-used/`): Claude Haiku LE-A1 5/5 on both sides; Haiku journeys did not judge.
- Credentials: the user's `/Users/normy/.autobyteus/server-data/.env` was imported into each instance's own test vault with the project importer (9 CONFIGURED, no values printed); the live suite's DeepSeek case takes the key from the environment into its own test vault, as the suite is designed.

## Investigation And Execution Basis

- Coverage investigation updated (round 4 section): `Yes`. Plan followed with the runtime change above.
- Coverage revised: `analyze-le-a1.py` now attributes each delegator call to its own turn (`turn_id`) and excludes the test's scripted contents. CRR-005 found that the round-3 counter counted the scripted "By address?" step on the base. Re-run on the round-3 traces, the corrected counter gives the base 0/15 genuine unprompted sends (round 3 reported 2) and the branch still 12/15, with 5 loops.
- New durable case: `CPW-H1` (T-5 sender address only where it reaches the sender).
- Reroute required: `No`.

## Compatibility / Legacy Scope Check

No backward-compatibility scope; the web reader and the contracts parser read released earlier forms by design; messages composed by intermediate (unreleased) branch builds no longer parse by design (CR-001) — not exercised, since no such data was released. Persisted data `Not Affected`.

## Acceptance-Criteria Proof

| AC | Critical | Proven By | Evidence | Result |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | `CPW-P1..P3` (ten rows from real roots equal the views), unit snapshots | `D-final.log`, `R2-unit.log` | Proven |
| AC-002 | Yes | `CPW-H1`; journey traces: address only where it reaches (T-5) | `D-final.log`, `journeys-analysis.txt`, `j2-team-trace.txt` | Proven |
| AC-003 | Yes | task message and headers in real traces; UI "From <name>" for new headers and stored earlier headers; stored earlier task message shown as stored | `screenshots/j2-writer-handoff.png`, `old-mention-note-and-header.png`, `old-header-org-ptm.png` | Proven |
| AC-004 | Yes | unit and MCP-route tests | `R2-unit.log`, `R3-integration.log` | Proven (repository) |
| AC-005 | Yes | `CPW-R1..R3` (19 catalogue entries through the real MCP path) | `D-final.log` | Proven for those; 26 entries unit-only |
| AC-006 | Yes | `CPW-M1..M4`; probe P1 4/4 on real Claude Sonnet; stored `[Mentioned collaborators]` note renders as a chip | `D-final.log`, `probes/P1.log`, `screenshots/old-mention-note-and-header.png` | Proven |
| AC-007 | Yes | vocabulary and catalogue scans | `R2-unit.log` | Proven |
| AC-008 | Yes | LE-A1 Claude Sonnet 10+10, DeepSeek flash 15+15 valid; J1/J3 5 per runtime per side; J2 in the UI | `LE-A1-*.log`, `LE-A1-analysis.txt`, `S-*.log`, `journeys-analysis.txt`, `traces/` | **Proven on the judging runtimes** (Codex not run: usage limit; user decision) |

## Live results (branch vs base)

LE-A1, the report-back case (helper and delegator traces kept for every run):

| Runtime | Branch pass | Base pass | Unprompted delegator sends after the report | Loops |
| --- | --- | --- | --- | --- |
| Claude Sonnet | 10/10 | 10/10 | 0 vs 0 | 0 vs 0 |
| DeepSeek flash | 15/15 valid (17 run) | 15/15 valid (16 run) | 0 vs 0 | 0 vs 0 |

The three DeepSeek failures (branch runs 4 and 6, base run 2) are the same provider failure: the first LLM request of that turn "rolled back: provider or response ingestion failed before a usable response", before any model output (helper trace for branch 4/6, delegator trace for base 2). I added replacement runs (branch 16 and 17, base 16) so each side has 15 valid samples; all three replacements passed.

Journeys on isolated desktop instances (5 samples per runtime per side; from the kept task-agent traces):

| Journey | Runtime | Branch: report reached the delegator | Base | Branch task-message form | Branch replies: both selectors / name / non-reaching address |
| --- | --- | --- | --- | --- | --- |
| J1 (standalone agent → task agent) | Sonnet | 5/5 | 5/5 | address + run id (5) | 0 / 0 / 0 |
| J3 (Project Task Manager → task agent team) | Sonnet | 5/5 | 5/5 | address + run id (5) | 0 / 0 / 0 |
| J1 | DeepSeek | 5/5 | 5/5 | address + run id (5) | 0 / 0 / 0 |
| J3 | DeepSeek | 5/5 | 5/5 | address + run id (5) | 0 / 0 / 0 |

The delegators' side of the same journeys (branch): every report arrived with a run-id-only header (the sender is a task agent, or a task agent team member writing from outside its team) in 10/10 J1 and 10/10 J3 runs; delegators sent nothing after a report (0).

J2 (team handoff, UI, Sonnet): the writer called `get_handoff_rules`, then `send_message_to /reviewer`. The reviewer received `You received a message from the agent with sender address "/writer" and sender run id "writer_…".` and answered by the reaching address. The writer received the "APPROVED" result and did not reply (no-reply rule held). See `j2-team-trace.txt` and `screenshots/j2-writer-handoff.png`.

Stored data written by the base build, opened in the branch app: the `[Mentioned collaborators]` note is hidden and shown as the `@Research Helper` chip; the earlier header shows as "From Research Helper:" / "From Coordinator:" with no raw header text; the earlier task message (`Task delegator address: …`) shows as stored.

## Repository checks

| Check | Result | Evidence |
| --- | --- | --- |
| typecheck | clean | `R1-typecheck.log` |
| server unit | 5687 pass, 7 skipped | `R2-unit.log` |
| contracts | 18/18 | `R4-contracts.log` |
| integration | only the 2 known `agent-status-websocket` baseline-exception tests fail. In the full run that suite failed to load with `ENFILE` (see Environment events); rerun alone, it shows exactly those 2 failures | `R3-integration.log`, `R3b-agent-status-rerun.log` |
| scripted-AGY e2e (`tests/e2e/projects` + live-refresh) | 90 pass, 4 skipped | `R6-agy-e2e.log` |
| `collaboration-prompt-wording.e2e.test.ts` | 11/11 (incl. new `CPW-H1`) | `D-final.log` |
| web specs (changed areas) + guards | 327 pass; guards exit 0 | `R5-*.log` |
| probe P1 cross-scope (real Claude Sonnet, A01 A02 T01 O01) | 4/4 | `probes/P1.log` |
| probe P4 task-closure-tree | pass on rerun. The first attempt could not spawn Node (`ENFILE`) and ran no test | `probes/P4-rerun.log` |
| probes P2, P3 | not rerun (known FU-CPW-1 failures, unrelated) | — |

## Environment events (not findings)

Twice the macOS system-wide open-file table was full (`ENFILE`): once when an integration suite was loading its files, and once when P4 spawned Node. Neither run reached a test; both reruns were clean. A read-only `lsof` count shows one system process (`com.apple…`, PID 74841) holding about 219,000 of the system's ~239,000 open files (limit 491,520). Everything else held under 3,000 each. Running many live batches at once (4 batches + 8 samplers + two Electron instances) took the system over the limit. Reported to the user; not caused by this change.

## Validation Confidence Scorecard

| Category | Round 3 | Round 4 | Supporting evidence | Residual uncertainty |
| --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 70% | 93% | AC-001..008 proven on the judging runtimes; F-5 gone | Codex not run (usage limit; user decision) |
| Changed-boundary execution directness | 93% | 95% | real roots, real tools, real runtimes, UI, stored data | — |
| Cross-boundary integration realism | 92% | 93% | two real runtimes, 50 LE-A1 runs, 20 journey samples, base comparison, kept traces | one model per runtime |
| Environment, configuration, identity, fixture fidelity | 90% | 92% | clean env, owned roots, user credentials through the importer, base build and app | macOS only; ENFILE events |
| Failure, edge-case, lifecycle, recovery | 88% | 90% | 19 catalogue entries through real tools; refusals; stored forms | 26 catalogue entries unit-only; role on restore not read from a real runtime |
| User-surface, browser, desktop-shell | 90% | 93% | J2 in the UI, chat for new and stored forms, P1 4/4, P4 | P2/P3 known failures not rerun |
| Durable regression coverage | 92% | 94% | `collaboration-prompt-wording.e2e` 11/11 incl. CPW-H1; attribution fix in the live suite | the no-loop rule is checked only by live runs |

- Overall final confidence: 93% (simple average). No category is below 90%.
- The 95% target is not met. The remaining gaps cannot be closed by more validation in this scope: Codex is unavailable and excluded by the user; the unit-only catalogue entries need Task state or stopped-run setups that the unit catalogue test already pins to the source.
- Every critical acceptance criterion directly proven on the judging runtimes: `Yes`.

## Durable Coverage Changed In The Codebase

| Path | Change | Result |
| --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/projects/collaboration-prompt-wording.e2e.test.ts` | Added in round 1. Round 3: `CPW-M4`, `CPW-R3`. Round 4: `CPW-H1` (T-5) | 11/11 |
| `autobyteus-server-ts/tests/e2e/helpers/collaboration-root-harness.ts` | Added in round 1 (MCP call, prompt reader, roots) | used |
| `autobyteus-server-ts/tests/e2e/fixtures/collaboration-prompt-complete-views.md` | Added (CRR-006 T-1): the approved prompt blocks the suite compares against, so the suite does not read the ticket folder | 11/11 (`D-final-after-CRR-006.log`) |
| `autobyteus-server-ts/tests/e2e/runtime/agent-initiated-collaborators.e2e.test.ts` | CRR-002 attribution fix (committed by the implementer) | used by LE-A1 |

Uncommitted (mine): the first two files above, the `api-e2e-*` artifacts and `evidence/`. Per CRR-002 they wait for the proportional test-code review.

## Cleanup Performed

All my instances are stopped; the data roots `cpw5-*`, the temporary keep-traces test copies and the base worktree `cpw-base-check` are removed. The user's running app, `~/.autobyteus` and `~/.codex` were not modified. Traces, logs, screenshots and analyses are kept in `evidence/round5/`.

## Findings

- F-5 resolved. No loop and no unprompted delegator send after a report in any of 50 LE-A1 runs or 20 journeys, on either judging runtime.
- T-5 behaves as designed in durable tests and in real traces.
- Observations, not caused by this change: the double "You" bubble after a `delegate_task` message; catalogue M-27 ends with a period in the views but not in the product text.
- C-8 (name next to the run id) did not recur: no branch reply used both selectors, a name, or a non-reaching address.

## Latest Authoritative Result

- Result: `Pass`, on the judging runtimes the user set (Claude Sonnet, DeepSeek flash).
- Final validation confidence: 93% (all categories ≥ 90%; 95% not met for the reasons above).
- Broader validation: `Required`, executed.
- Critical acceptance criteria lacking direct proof: none on the judging runtimes. AC-008's Codex clause was not run (usage limit until Oct 22, 2026; the user's decision to exclude Codex) — for the Solution Designer to record.
- Behavior only the user can check: `None`.
- Next: proportional test-code review of my durable tests (required by CRR-002), then delivery.
