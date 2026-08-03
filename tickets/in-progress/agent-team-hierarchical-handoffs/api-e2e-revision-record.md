# API/E2E Revision Record

The latest coverage investigation and execution coverage report are authoritative. This record preserves concise chronological validation history.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | `code_reviewer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/code-review-report.md`; Round 1 | SR-005; ARCH-REV-004; IR-002; CRR-002 | N/A | Pass / 97.0% |
| API-REV-002 | `code_reviewer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/api-e2e-test-review-report.md`; Round 2 | SR-005; ARCH-REV-004; IR-002; CRR-002; CRR-003 | Pass / 97.0% | Pass / 97.0% |

## Revision Entries

### API-REV-001 — Hierarchical AgentTeam handoff coverage baseline passes

- Triggering role, report path, and round: `code_reviewer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/code-review-report.md`; initial API/E2E round 1.
- Triggering finding or scenario IDs: CRR-002 Pass; API-DEF-001 through E2E-INGRESS-001.
- Related revision IDs: SR-005; ARCH-REV-004; IR-002; CRR-002.
- Why recorded: First completed API/E2E result after mandatory investigation and repair of stale repository coverage for the clean hierarchical addressing contract.
- Coverage decisions or durable test paths changed: 42 updated, 6 added, 0 removed. Flat rosters, synthetic representatives, bare logical names, old task target objects, and message-only provider assertions were replaced with strict paths, typed placements, task ownership, snapshots, lifecycle, and canonical envelopes.
- Scenarios added/changed/removed/rechecked: All 15 stable execution-report IDs were added or rechecked; no behavior was dropped without replacement.
- Commands/environment/broader-validation delta: `.env.test`/Prisma/Vitest; changed non-E2E 251/251; affected broad 229/229; deterministic E2E 178 passed/49 declared skipped; production typecheck/build passed.

#### Prior Failure Resolution

None. No prior completed API/E2E round existed. Baseline stale-test failures discovered within this round were validity findings, not a prior authoritative API/E2E result; their replacement and final evidence are in the canonical investigation/report.

- Canonical artifacts updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/api-e2e-coverage-investigation.md`; `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/api-e2e-execution-coverage-report.md`; this record.
- Prior result and confidence: `N/A`
- Current result and confidence: `Pass / 97.0%`
- New or remaining failure IDs: `None`
- Recommended recipient: `code_reviewer` for proportional durable test review.
- Remaining risk/untested scope: External Codex/Claude model processes were capability-gated and not counted as passed; deterministic adapter parity passed, leaving bounded non-material bootstrap drift. AC-021 remains delivery-owned.

### API-REV-002 — Correct approved lineage and reissue the passing handoff

- Triggering role, report path, and round: `code_reviewer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/api-e2e-test-review-report.md`; API/E2E reporting round 2.
- Triggering finding or scenario IDs: `CRR-003`; `TR-F-001`.
- Related revision IDs: SR-005; ARCH-REV-004; IR-002; CRR-002; CRR-003.
- Why recorded: The proportional review passed all 48 durable test files but found that API-REV-001 cited two nonexistent upstream identifiers. This reporting-only round corrects the factual lineage and reissues the unchanged passing API/E2E result.
- Coverage decisions or durable test paths changed: `None`. No executable test, fixture, source, coverage decision, confidence score, or scenario result changed.
- Scenarios added/changed/removed/rechecked: No scenario was added, changed, or removed. API-DEF-001 through E2E-INGRESS-001 retain their API-REV-001 results; the recheck was limited to revision lineage, canonical artifact consistency, evidence-path existence, and an unchanged 48-file content manifest.
- Commands/environment/broader-validation delta: No executable validation rerun was warranted because no executable artifact changed. Bounded verification used exact-ID searches against the solution/architecture records, API artifact consistency checks, `git diff --check`, referenced-path existence checks, and before/after SHA-256 comparison of all 48 reviewed durable test files.

#### Prior Failure Resolution

| Prior Scenario / Failure Reference | Previous Classification | Current Resolution | Evidence |
| --- | --- | --- | --- |
| `TR-F-001` / CRR-003 | `Local Fix` / API/E2E reporting | Resolved: both API-REV-001 related-revision fields now read `SR-005; ARCH-REV-004; IR-002; CRR-002`, and the index and detailed entry match. | `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/api-e2e-evidence/lineage-reissue-final.log` |

- Canonical artifacts updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/api-e2e-coverage-investigation.md`; `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/api-e2e-execution-coverage-report.md`; this record.
- Prior result and confidence: `Pass / 97.0%` (API-REV-001); CRR-003 proportional-review gate result was `Fail — Local Fix` solely for TR-F-001.
- Current result and confidence: `Pass / 97.0%`
- New or remaining failure IDs: `None`
- Recommended recipient: `code_reviewer` for bounded verification of the corrected lineage and reissued cumulative handoff.
- Remaining risk/untested scope: Unchanged from API-REV-001; external provider-process/bootstrap drift remains bounded and non-material, and AC-021 remains delivery-owned.
