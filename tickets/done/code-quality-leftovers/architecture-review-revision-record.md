# Architecture Review Revision Record — code-quality-leftovers (autobyteus-357)

## Revision Index

| Revision ID | Review Round / Trigger | Related Solution Revision IDs | Prior Decision | Current Decision | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| ARCH-REV-001 | Round 1 / Architecture Design Complete | SR-001 | N/A | Fail | AR-001, AR-002, AR-003 |
| ARCH-REV-002 | Round 2 / Re-review of SR-002 | SR-002 | Fail | Pass | AR-001…AR-003 (resolved) |

## Revision Entries

### ARCH-REV-001 — Initial review: item decisions sound; 54.2 consumer inventory incomplete

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/code-quality-leftovers/tickets/in-progress/code-quality-leftovers/design-review-report.md`
- Review round and trigger: Round 1; Solution Designer's Architecture Design Complete (run `solution_designer_7591e3d191704d25a3396b3020a41127`), 2026-11-01.
- Triggering role, report path, and finding IDs: Solution Designer; `handoff-architecture-review.md`; N/A.
- Relevant solution revision IDs: SR-001.
- Prior authoritative decision: N/A.
- Current authoritative decision: Fail (Design Impact).
- What was established: a baseline at `09e99c33bb`. Every item claim was checked by repo-wide search; all hold except 54.2's "only consumer the deny-list". The drops (107, 124, 125.4, 158), the move-out (135 → FU-001), the `ProjectTaskService` split and the no-data decision pass.

#### Prior Finding Resolution

None.

- New or remaining finding IDs: AR-001 (blocking), AR-002, AR-003 (non-blocking; expected in the same revision).
- Material classification changes: none (Large / High confirmed).
- Recommended recipient: Solution Designer.
- Remaining risks or uncertainty: parallel-team overlap in `project-task-service.ts` and the persistence coordinators.

### ARCH-REV-002 — Re-review of SR-002: findings resolved; Pass

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/code-quality-leftovers/tickets/in-progress/code-quality-leftovers/design-review-report.md`
- Review round and trigger: Round 2; the Solution Designer's re-review request at `ebc5277e52`.
- Triggering role, report path, and finding IDs: Solution Designer; `handoff-architecture-review.md` § Re-review request — SR-002; AR-001…AR-003.
- Relevant solution revision IDs: SR-002.
- Prior authoritative decision: Fail (ARCH-REV-001).
- Current authoritative decision: Pass.
- What changed: under the user's direction, `logicalConversationId` is removed and its test readers are refactored to recognise compaction by the prompt the model receives. New in this revision: REQ-006/REQ-007, AC-006/AC-007 and `DESIGN.md` rule 11. AR-002 and AR-003 are applied.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-001 | Open (blocking) | Resolved | SR-002; investigation note 54.2; design Removal Plan, Final File Mapping, Concrete Examples, step 3 | `COMPACTION_SUMMARY_PROMPT` / `COMPACTION_SUMMARY_INSTRUCTION` exported (`compaction-summary-prompt.ts` 4, 15) and sent by `compaction-summarizer.ts` 71–72 |
| AR-002 | Open | Resolved | Design Removal Plan | `drain`/`inFlight` listed; tracker waits a macrotask |
| AR-003 | Open | Resolved | Design Change Scope, Ownership Map, File Mapping | Inventory, singleton and dependencies, per-stub 157 rule |

- New or remaining finding IDs: none.
- Material classification changes: none (Large / High).
- Recommended recipient: Implementation Engineer; Solution Designer informational.
- Remaining risks or uncertainty: retry counting by adjacency, custom summary prompts, parallel-team overlap (report Residual Risks).
