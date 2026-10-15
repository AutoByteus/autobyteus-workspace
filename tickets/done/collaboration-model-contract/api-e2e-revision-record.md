# API/E2E Revision Record

## Revision Index

| Revision ID | Trigger | Related Upstream | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | code review CRR-002 pass | SR-001..SR-003, ARCH-REV-002, IR-001, IR-002, CRR-001, CRR-002 | N/A | Pass / 94% |

## Revision Entries

### API-REV-001 — Baseline validation of the one-model collaboration contract

- Trigger: /Users/normy/autobyteus_org/autobyteus-worktrees/collaboration-model-contract/tickets/in-progress/collaboration-model-contract/code-review-report.md, round 2
- Finding IDs: none (implementer's risk: five stale e2e files; actual stale set found larger)
- Related revisions: SR-001..SR-003, ARCH-REV-002, IR-001, IR-002, CRR-001, CRR-002
- Why recorded: first API/E2E round
- Coverage decisions / durable paths changed: listed in the execution report ("Durable Coverage Changed In The Codebase"): 2 added, 13 server suites updated, 1 removed, 10 web probe files updated; 2 cases skipped with rationale
- Cases: see the ledger
- Commands, environment, fixture delta: base worktree comparison for every failure; live suites need `USER` and `LOGNAME` on macOS (first live run lost to "Not logged in"); source data for the startup test is synthesized with production key sets
- Process corrections (honest): (1) ran from the handoff list before writing the investigation; (2) ran four whole UI probe suites on the previous ticket without a scoped reason — this round I ran only probes whose code asserted removed behavior; (3) planned a startup run on a copy of the user's data, dropped on the user's direction (rule now in TESTING.md); (4) two of my own test bugs surfaced in live runs (a refusal-wait race, a probe field name) and were fixed and rerun

#### Prior Failure Resolution

None.

- Canonical artifacts updated: investigation, execution report, ledger, this record
- Prior result and confidence: N/A
- Current result and confidence: Pass, 94% (default 95% target not met)
- New or remaining failure IDs: none attributable to this change; pre-existing failures listed in the report
- Recommended owner: code_reviewer (test-code review of the changed durable tests); server and web test owners for the pre-existing failures; solution_designer for the `memory/imports` question
- Remaining risks: converted unowned run woken by run ID only in upstream integration; Codex Team/Org roots not run live; two start-failure triggers gone; web desktop shell untouched
