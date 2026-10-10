# Architecture Review Revision Record

The latest `design-review-report.md` remains authoritative. This record holds the initial baseline and each later review delta.

## Revision Index

| Revision ID | Review Round / Trigger | Related Solution Revision IDs | Prior Decision | Current Decision | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| ARCH-REV-001 | Round 1 / `Architecture Design Complete` (Large, High) | SR-001, SR-002, SR-003 | N/A | Fail | ARCH-001, ARCH-002, ARCH-003 |
| ARCH-REV-002 | Round 2 / re-review after SR-004 | SR-004 | Fail | Pass | ARCH-001, ARCH-002, ARCH-003 resolved |

## Revision Entries

### ARCH-REV-001 — Initial review: port architecture sound; compaction conversation identity, requirements consistency and attempt semantics need rework

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-prompt-cache-reuse/tickets/in-progress/compaction-prompt-cache-reuse/design-review-report.md`
- Review round and trigger: Round 1; `Architecture Design Complete` from `/software_engineering_team/solution_designer` (`solution-handoff.md`, 2026-10-09).
- Triggering role, report path, and finding IDs: Solution Designer; `solution-handoff.md`; N/A (initial review).
- Relevant solution revision IDs: SR-001, SR-002, SR-003
- Prior authoritative decision: N/A
- Current authoritative decision: `Fail`
- What changed in the review result or what baseline was established: established the baseline.
  - Confirmed:
    - core-owned `CompactionSummarizer` behind an agent-implemented `ConversationSummaryPort`;
    - the guard before and after compaction (preserved-thinking safe);
    - per-attempt compaction metering;
    - end-to-end setting removal with an inert leftover key;
    - ASM-001 (agent LLM idle at both sites);
    - no compaction callers outside `LlmPhase` and the assembler.
  - Found:
    - an undefined provider conversation identity and lifecycle for compaction requests (the AutoByteus RPA session would be corrupted; remote sessions leak);
    - the requirements doc contradicting REQ-005;
    - the attempt budget silently changed by dropping `single_attempt`.

#### Prior Finding Resolution

None.

- New or remaining finding IDs: ARCH-001 (High, blocking), ARCH-002 (Medium, blocking; editorial Requirement Gap), ARCH-003 (Low-Medium, blocking).
- Material classification changes: N/A (baseline). Premises: P-001 `Reachable`, P-002 `Reachable`.
- Recommended recipient: `/software_engineering_team/solution_designer`
- Remaining risks or uncertainty:
  - non-Anthropic instruction following;
  - large-context budget (include the output reservation);
  - server projection of the new ingestion kind;
  - overlap growth.

### ARCH-REV-002 — Re-review after SR-004: compaction conversation isolation, requirements alignment and single-attempt semantics resolved; Pass

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-prompt-cache-reuse/tickets/in-progress/compaction-prompt-cache-reuse/design-review-report.md`
- Review round and trigger: Round 2; re-review request from `/software_engineering_team/solution_designer` (SR-004).
- Triggering role, report path, and finding IDs: Solution Designer; `solution-revision-record.md` § SR-004; ARCH-001..003.
- Relevant solution revision IDs: SR-004
- Prior authoritative decision: `Fail` (ARCH-REV-001)
- Current authoritative decision: `Pass`
- What changed in the review result:
  - Compaction-scoped conversation ids per attempt, plus a new provider-neutral `BaseLLM.releaseConversation` (default no-op; `AutobyteusLLM` override). AC-009 added.
  - Requirements aligned with REQ-005.
  - `retryMode: 'single_attempt'` on both port requests; the attempt budget is stated in REQ-004.
  - The budget check includes the output reservation.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| ARCH-001 | Open (High, blocking) | Resolved | SR-004; BEH-001 preserved column; AC-009 | design-spec Intended Change 5, the port and `releaseConversation` interface rows, examples, the AC-009 tests; `AutobyteusClient.cleanup(id)` exists; `logicalConversationId` is filtered for API providers |
| ARCH-002 | Open (Medium, blocking) | Resolved | SR-004 | BEH-002, UC-001, REQ-001, AC-001 and SCN-002 corrected; REQ-004 trace fixed; investigation-notes header SR-004. Only DEC-001's historical option text remains (non-governing) |
| ARCH-003 | Open (Low-Medium, blocking) | Resolved | SR-004; REQ-004 | Intended Change 6, examples, port tests |

- New or remaining finding IDs: none.
- Implementation note N-1 (non-blocking): run the release in a `finally` with its own bounded controller, not the possibly aborted operation signal, and test the abort case.
- Material classification changes: none.
- Recommended recipient: `/software_engineering_team/implementation_engineer` (primary pass); `/software_engineering_team/solution_designer` (informational).
- Remaining risks or uncertainty:
  - non-Anthropic instruction following;
  - server projection of the new ingestion kind;
  - summary/tail overlap;
  - no cache benefit on AutoByteus RPA (accepted).
