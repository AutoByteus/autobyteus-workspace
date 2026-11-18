# API/E2E Revision Record

The latest coverage investigation and execution coverage report remain authoritative. This file records each completed validation round.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Code reviewer, `code-review-report.md` CRR-001 Pass, round 1 | SR-003, ARCH-REV-002, IR-001, CRR-001 | N/A | `Pass` / 95% |

## Revision Entries

### API-REV-001 — Baseline: retired items and built-ins removed; both AC-004 surfaces proven; three stale base tests fixed

- Triggering role, report path, and round: `/code_reviewer`, `code-review-report.md` (CRR-001 `Pass`), round 1
- Triggering finding or case IDs: N/A (first round)
- Related revision IDs: SR-003; ARCH-REV-002; IR-001; CRR-001
- Why this baseline was recorded: first API/E2E result for autobyteus-491
- Coverage decisions or durable test paths changed: RRB-3 added (`list_available_agents`, gated); SIR-002 extended to the Memory Compactor; baseline fixes `cbdf02f15a` (SIR-002 fixtures), `24582b576c` (LM Studio helper, `memory-llm-flow`), `0a7993c227` (`openai-read-file-strict-live`)
- Cases added, changed, removed, or rechecked: API-00…API-13 as planned; IMP-03/04/05/06/08 reused
- Commands, environment, fixture, or broader-validation delta: built-Studio starts, the SIR-002 browser probe, LM Studio and OpenAI live runs, a base worktree at `2e9ac1e65b` for E2E comparison (removed), a fresh-clone desktop build (removed)

#### Prior Failure Resolution

None.

- Canonical artifacts and sections updated: the coverage investigation, the execution report, progress log, `follow-ups.md` (FU-001…FU-003), `evidence/API-*`
- Prior result and confidence: N/A
- Current result and confidence: `Pass`, 95%
- New or remaining failure IDs: none caused by this change
- Recommended owner: `/code_reviewer` for proportional test-code review
- Remaining risks, blocked evidence, or untested scope: the founder's node (REQ-007, delivery gate); signing and the Docker image (release run); R-1 (user-made teams listing a retired agent); FU-001…FU-003
