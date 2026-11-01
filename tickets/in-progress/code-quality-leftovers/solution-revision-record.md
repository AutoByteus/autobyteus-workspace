# Solution Revision Record — code-quality-leftovers

| Revision ID | Phase | Trigger | Prior | Current | Result |
| --- | --- | --- | --- | --- | --- |
| SR-001 | Mixed | Task autobyteus-357 | N/A | Requirements Approved (within direction); design Ready; Large / High | To architecture review |
| SR-002 | Mixed | ARCH-REV-001 Fail; user direction (test-held code) | Design Ready | Design Ready (revised); DESIGN.md rule 11 | To architecture re-review |

### SR-001 — Baseline

- Trigger: autobyteus-357 from `/project_task_manager`, plus the user's addition relayed by the PM (drop gone/not-worth items; decide wire-or-remove when clear).
- Evidence: investigation-notes.md item table (all ten items checked at `efd28d5c4a`).
- Outcomes: fix 54.1–54.4, 125.1/2/3/5/6, 147, 157, 159, 178 (remove); dropped 107 (not worth it), 124 (already done), 125.4 (gone), 158 (already moved); moved out 135 (FU-001).
- Approval: Solution Designer within the direction; user informed. No `Needs user`.
- Classification: Large / High (public GraphQL field removal, BaseLLM interface, owner split).
- Next action: architecture review.

### SR-002 — Revision for ARCH-REV-001; the user's direction on test-held code

- Trigger: `design-review-report.md` ARCH-REV-001 (Fail; Design Impact AR-001, AR-002, AR-003), architecture reviewer run `architecture_reviewer_b0cc3811df7e474eb5031669010fe5f1`; the user's direction in the Solution Designer's conversation, 2026-11-01 (quoted in requirements-doc.md § User Direction).
- AR-001: my SR-001 claim on 54.2 was wrong (missed the test readers). Evidence corrected (notes 54.2). The user chose removal with a test refactor: test doubles recognise compaction requests by the prompt the model receives; example in design § Concrete Examples.
- AR-002: `TaskExecutionResourceRelease.drain` / `inFlight` removed too; tracker settles one more macrotask.
- AR-003: (a) inventory extended; (b) `getProjectTaskContextDrafts()` and shared dependencies; (c) per-test rule for 157 names.
- New: `DESIGN.md` rule 11 "Tests follow the code; they never hold it back" (user direction; written in this revision).
- Requirements: REQ-006, REQ-007, AC-006, AC-007 added; approval: user (direction) + Solution Designer within it.
- Classification unchanged: Large / High.
- Next action: architecture re-review.
