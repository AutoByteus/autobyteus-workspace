# Architecture Review Revision Record — `node-vocabulary` (autobyteus-290)

The latest `design-review-report.md` is authoritative. This record holds the baseline and the review deltas.

## Revision Index

| Revision ID | Review Round / Trigger | Related Solution Revision IDs | Prior Decision | Current Decision | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| ARCH-REV-001 | Round 1 / `Architecture Design Complete` (SR-003) with the SR-004 addendum | SR-003, SR-004 | N/A | Fail | AR-901, AR-902, AR-903 |

## Revision Entries

### ARCH-REV-001 — First review: careful vocabulary work; stored definitions, the compiler claim, Memory Sync's name

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/node-vocabulary/tickets/in-progress/node-vocabulary/design-review-report.md`
- Review round and trigger: round 1. `Architecture Design Complete` (SR-003, `5b6fd22982`), then the SR-004 addendum (`0b72123468`: Step 1b removes `compatibilityVersion`; the phone apps' saved records become entries). Reviewed at `0b72123468`.
- Triggering role, report path, and finding IDs: Solution Designer, `handoff-architecture-review.md`; no prior findings.
- Relevant solution revision IDs: SR-003, SR-004
- Prior authoritative decision: N/A
- Current authoritative decision: `Fail`
- What was established:
  - The behavior basis is confirmed, and `Large` / `High` is confirmed.
  - Reviewed under Principle 15 (`autobyteus-agents` `b87a507`) and the updated design examples.
  - The stored-name mapping owners, Step 1b and Step 3's single step pass.
  - The tool rename has an unlisted stored consumer: definitions' `toolNames`. The tool shipped in v1.5.8; exposure matches by name and ignores unknown names.

#### Prior Finding Resolution

None.

- New or remaining finding IDs:
  - AR-901 (Medium, Requirement Gap): a persisted-data decision for stored definitions naming `list_available_nodes`, either a sealed migration or an accepted behavior change, for the user to decide; schedule the PTM package update with the release.
  - AR-902 (Low): list the entry-ID carriers the compiler can't see; make AC-901's check concrete.
  - AR-903 (Low): rename Memory Sync's `sourceNodeId` / "Source node id" in code and UI, keeping its stored and wire names through their owners; FU-002 keeps the semantic question.
  - Non-blocking: N-901 … N-904.
- Material classification changes: none.
- Recommended recipient: Solution Designer
- Remaining risks or uncertainty: RSK-901 (accepted).
