# API/E2E Revision Record — `collaboration-prompt-wording`

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | implementation_engineer, `implementation-handoff.md`, IR-001 (direct low-risk route), execution round 1 | SR-001, SR-002, IR-001 | N/A | Fail / 80% |
| API-REV-002 | implementation_engineer, IR-002 delta, execution round 2 (code review CRR-001) | SR-003, IR-002, CRR-001 | Fail / 80% | Fail / 85% |
| API-REV-003 | implementation_engineer, IR-003 + IR-004 delta, execution round 3 (code review CRR-002) | SR-004..SR-014, IR-003, IR-004, CRR-002 | Fail / 85% | Fail / 88% |
| API-REV-004 | code_reviewer CRR-005 pass of IR-005, execution round 4 | SR-015, SR-016, IR-005, CRR-005 | Fail / 88% | Pass / 93% |
| API-REV-005 | code_reviewer CRR-006 test-code review (Local Fix T-1, T-2) | CRR-006 | Pass / 93% | Pass / 93% |

## Revision Entries

### API-REV-001 — Baseline validation of collaboration texts written for the agent

- Triggering role, report path, and round: `implementation_engineer`, `tickets/in-progress/collaboration-prompt-wording/implementation-handoff.md`, round 1.
- Triggering finding or case IDs: none (initial validation).
- Related revisions: SR-001, SR-002 (solution); IR-001 (implementation `290d32dd4b`, artifacts `a1e080be08`); architecture-review, code-review, delivery: `N/A`.
- Why recorded: baseline of the first API/E2E validation of the package.
- Coverage decisions and durable test paths changed: added `autobyteus-server-ts/tests/e2e/helpers/collaboration-root-harness.ts` and `autobyteus-server-ts/tests/e2e/projects/collaboration-prompt-wording.e2e.test.ts` (CPW-P1..P3, R1, R2 skipped, M1..M3); updated `autobyteus-web/tests/e2e/cross-scope-agent-mentions-live-probe.mjs`.
- Cases added/changed/rechecked: R1–R6, D1–D3, P1–P4, L1–L3, J1–J4, F1 (ledger).
- Commands, environment, broader-validation delta: worktree build; clean-env scripted-AGY e2e; real HOME for signed-in Claude/Codex; isolated desktop instances of the worktree build on owned data roots; comparison runs on an untouched base build (3712cd9bf0) after failures.

#### Prior Failure Resolution

None.

- Canonical artifacts updated: coverage investigation (results and scorecard), execution coverage report, ledger, this record.
- Prior result and confidence: `N/A`.
- Current result and confidence: `Fail`, 80% (default 95% not met; all seven categories below 90%).
- New failure IDs: F-3 (AC-008, delegated agent does not reliably report by ID on Claude and native AutoByteus; Design Impact), F-1 (AC-005, cross-Task/closed-Task send_message_to text never reaches the agent; pre-existing; Design Impact / Requirement Gap), F-2 (P2, P3 probes fail identically on base; out of scope).
- Recommended owner: Code Reviewer for failure-origin review; Solution Designer for F-3 and F-1.
- Remaining risks / untested scope: native AutoByteus live prompt read-back; role on restore for a real runtime; Windows/Linux; texts reached only by unit tests (not delivered, root stopping, user stopping, restore failure, Tasks unavailable, already works on this Task, no Task, never started).

### API-REV-002 — Re-validation after IR-002 (SR-003: reply-call label, refusals, delivery-scope refusal)

- Triggering role, report path, and round: `implementation_engineer`, `implementation-handoff.md` (IR-002 delta), round 2; code review CRR-001 (`code-review-report.md`).
- Triggering finding or case IDs: F-3a, F-3b, F-1 (C-3 covered by F-3a); cases D2b/CPW-R2, L1x, L3, J1, J3.
- Related revision IDs: SR-003; IR-002 (`6a3f6628b1`, pointer `1ca0b23f14`); code review CRR-001.
- Why recorded: rerun of the failed scenarios and the revised AC-005/AC-008 bar.
- Coverage decisions or durable test paths changed: `CPW-R2` enabled by the implementer (passes); `CPW-R1` extended with the SR-003 refusal texts (name as address on both tools, unknown ID, message to oneself); no other durable change.
- Cases rechecked: R1–R6, D1–D3, P1, P3, P4, L1–L3, J1–J4 (ledger round 2). New: nothing; added sample counts (Claude 5, Codex 5, LM Studio 20 per side; journeys 5 per side).
- Commands, environment, broader-validation delta: base worktree with its own build and Electron app; isolated instances on both sides; LE-A1 batches keep each run's `memory/` (helper traces); journey sampler keeps task-agent traces and flags replies to the delegator's name.

#### Prior Failure Resolution

| Prior Case / Failure Reference | Previous Classification | Current Resolution | Evidence |
| --- | --- | --- | --- |
| D2b / F-1 (cross-Task refusal reached the agent as `MCP error -32603`) | Requirement Gap (decided: fold in) | Resolved: `CPW-R2` passes; the refusal arrives as `{accepted:false, code, message}` | round2/D-final-…log |
| F-3b (refusals with no next step) | Design Impact | Resolved for the SR-003 texts: asserted over the real MCP path in `CPW-R1` | round2/D2-CPW-R1-extended.log |
| F-3a / L1x LE-A1 Claude 1/5 vs base 3/3 | Design Impact | Resolved on Claude (5/5 vs 5/5) and Codex (5/5 vs 5/5) | round2/LE-A1-*-claude-*, *-codex-* |
| L3 LE-A1 LM Studio (branch 0/2 vs base 1/1) | Design Impact (same mechanism assumed) | Not resolved, different cause: branch 7/20 vs base 14/20; the helper now reports by ID (19/20), the failures are the delegating agent's unprompted acknowledgements (12/20 vs 4/20) — new finding F-4 | round2/LM-trace-analysis.txt |
| C-3 (coordinator plain-text answer, J3 1 of 4) | Hold for Evidence | Not reproduced: J3 5/5 by ID on the branch (base 5/5) | round2/S-branch-j3.log |
| F-2 (probes PMU-008, PMU-021, TMV-002 on base and branch) | out of scope (FU-CPW-1) | Unchanged: P3 still fails only TMV-002 | round2/probes/P3.log |

- Canonical artifacts and sections updated: coverage investigation (round 2 section), execution coverage report (latest authoritative), ledger (round 2 section), this record.
- Prior result and confidence: Fail, 80%.
- Current result and confidence: `Fail`, 85% (95% target not met; four categories below 90%).
- New or remaining failure IDs: F-4 (AC-008 on the native AutoByteus runtime, Design Impact); F-2 (out of scope).
- Recommended owner: Code Reviewer for failure-origin review; Solution Designer for F-4 (wording authority).
- Remaining risks, blocked evidence, or untested scope: native AutoByteus prompt read-back; role on restore on a real runtime; refusal texts reached only by unit tests; the strict "no reply to the name" reading (refused attempts 4 and one delivered by an organization address in 20 Claude samples).

### API-REV-003 — Re-validation after IR-003 + IR-004 (SR-004..SR-014: run ID wording, header, own team first, catalogue); CRR-002 test fix

- Triggering role, report path, and round: `implementation_engineer`, `implementation-handoff.md` (IR-004 section), round 3; code review CRR-002 (`code-review-report.md`).
- Triggering finding or case IDs: F-4 (resolved as a test artifact by CRR-002); cases L1–L3, J1–J3, U1–U3, D (new CPW-M4, CPW-R3).
- Related revision IDs: SR-004..SR-014; IR-003, IR-004 (`71db6bbdd8`, pointer `8b6ed16401`); CRR-002.
- Why recorded: rerun of AC-008 as revised and the new UI, `@` and catalogue checks.
- Coverage decisions or durable test paths changed: LE-A1 `callTool` and quiet-wait fix in `agent-initiated-collaborators.e2e.test.ts` (committed by the implementer); `CPW-M4` and `CPW-R3` added to `collaboration-prompt-wording.e2e.test.ts` (10/10).
- Cases rechecked: R1–R6, D1–D3, L1–L3 (LM Studio dropped; native runtime via DeepSeek with the user's credentials imported into test vaults), J1–J3, U1–U3, P1–P4.
- Commands, environment, broader-validation delta: Codex extended to 15 runs per side after a loop appeared at 5; journeys re-derived from kept traces (the sampler's flag did not recognise the native runtime's event name); base worktree kept for the next round.

#### Prior Failure Resolution

| Prior Case / Failure Reference | Previous Classification | Current Resolution | Evidence |
| --- | --- | --- | --- |
| F-4 / L3 LM Studio (branch 7/20 vs base 14/20) | Design Impact (preliminary) | Re-origined by CRR-002 as the test's step attribution (Local Fix); LM Studio dropped from the bar by the user; Claude LE-A1 now 5/5 vs 5/5 | CRR-002, round4/LE-A1-*-claude-* |
| F-3a on Claude and Codex (round 2: Claude 5/5, Codex 5/5) | Design Impact | Claude still 5/5; Codex now fails in a new way (F-5) | round4/LE-A1-*-codex-* |
| C-7 (delegator acknowledgements on the local model) | non-blocking | Seen again on Codex as unprompted echoes, now unbounded: F-5 | round4/LE-A1-analysis.txt |
| C-8 (name beside the ID) | non-blocking | Did not recur: 0 of 20 journey samples and 0 of 5 Claude LE-A1 runs used an address | round4/journeys-analysis.txt |
| F-2 (probes PMU-008, PMU-021, TMV-002) | out of scope (FU-CPW-1) | Unchanged | round4/probes/ |

- Canonical artifacts and sections updated: coverage investigation (round 3 section), execution coverage report (latest authoritative), ledger (round 3 section), this record.
- Prior result and confidence: Fail, 85%.
- Current result and confidence: `Fail`, 88% (95% target not met; requirement proof 70%, failure/edge 88%).
- New or remaining failure IDs: F-5 (AC-008 on Codex, Design Impact); F-2 (out of scope).
- Recommended owner: Code Reviewer for failure-origin review; Solution Designer for F-5.
- Remaining risks, blocked evidence, or untested scope: native-runtime result is provider-limited; live supplied-prompt read-back not repeated; role on restore; 26 catalogue entries unit-only; no durable test yet covers the echo loop.

### API-REV-004 — Validation of IR-005 (SR-015 no-reply rule, T-5 sender address, SR-016) on the user's judging runtimes

- Triggering role, report path, and round: `code_reviewer`, `code-review-report.md` (CRR-005), round 4.
- Triggering finding or case IDs: F-5 (round 3, Codex echo loop); CRR-005 note on the unprompted-send counter.
- Related revision IDs: SR-015, SR-016; IR-005 (`5c94518446`, pointer `88d1b8cd1f`); CRR-005.
- Why recorded: the revised AC-008 bar, the T-5 forms in real runs, and stored earlier forms.
- Coverage decisions or durable test paths changed: `CPW-H1` added to `collaboration-prompt-wording.e2e.test.ts` (11/11); `analyze-le-a1.py` corrected (turn attribution, scripted contents excluded; the round-3 base count drops from 2 to 0, the branch count stays 12/15).
- Cases rechecked: R1–R6, D, L1 (Sonnet), L2 (DeepSeek flash), J1–J3, U, P1, P4. LX (Codex) not run.
- Environment / broader-validation delta: Codex out of usage until Oct 22, 2026, and the user decided that Claude Sonnet and DeepSeek flash judge. User credentials imported into each instance's test vault with the project importer. Two system-wide `ENFILE` events, both rerun clean.

#### Prior Failure Resolution

| Prior Case / Failure Reference | Previous Classification | Current Resolution | Evidence |
| --- | --- | --- | --- |
| F-5 (Codex echo loop, branch 10/15 vs 15/15, 5 loops) | Design Impact | Wording fixed in SR-015. On the judging runtimes: 0 unprompted delegator sends and 0 loops in 50 LE-A1 runs and 20 journeys. Not re-measured on Codex (usage limit; user decision) | round5/LE-A1-analysis.txt, journeys-analysis.txt |
| Round-3 counter counted scripted sends on the base | test analysis error | Corrected (turn_id attribution) | round5/analyze-le-a1.py |
| F-2 (probes P2, P3) | out of scope (FU-CPW-1) | Unchanged; not rerun | — |

- Canonical artifacts and sections updated: investigation (round 4 section), execution report (latest authoritative), ledger (round 4 section), this record.
- Prior result and confidence: Fail, 88%.
- Current result and confidence: `Pass`, 93%. All categories ≥ 90%; 95% not met: Codex not run, 26 catalogue entries unit-only.
- New or remaining failure IDs: none.
- Recommended next: proportional test-code review of my durable tests (CRR-002), then delivery. The Solution Designer should record the user's runtime decision against AC-008's Codex clause.
- Remaining risks: Codex unmeasured on IR-005; role on restore not read from a real runtime; the double "You" bubble; M-27 punctuation.

### API-REV-005 — Local Fix from the test-code review (CRR-006: T-1, T-2)

- Triggering role, report path, and round: `code_reviewer`, `api-e2e-test-review-report.md` (CRR-006), Local Fix of round 4.
- Triggering finding IDs: T-1 (the suite read the views from the ticket folder, which delivery archives); T-2 (the CPW-R2 comment described the pre-T-4 behavior).
- Coverage change: new fixture `autobyteus-server-ts/tests/e2e/fixtures/collaboration-prompt-complete-views.md` (the six approved prompt blocks, byte-identical to the views'); the suite reads it by default (`COLLABORATION_VIEWS_FILE` still overrides); the ticket path is removed from the run command; the CPW-R2 comment now states what the case proves.
- Cases rechecked: `collaboration-prompt-wording.e2e.test.ts` only (scripted), 11/11 (`evidence/round5/D-final-after-CRR-006.log`). Live runs not repeated (unaffected).

#### Prior Failure Resolution

| Prior Case / Failure Reference | Previous Classification | Current Resolution | Evidence |
| --- | --- | --- | --- |
| T-1 views path into the ticket folder | Local Fix (test code) | Fixture next to the tests; default path changed | round5/D-final-after-CRR-006.log |
| T-2 stale CPW-R2 comment | Local Fix (test code) | Comment replaced | test file |

- Prior / current result: Pass, 93% / Pass, 93%.
- Remaining risks: unchanged (AC-008 Codex clause not run: usage limit until 2026-10-22 09:16, user decision; to be recorded against AC-008 or scheduled after the reset).
