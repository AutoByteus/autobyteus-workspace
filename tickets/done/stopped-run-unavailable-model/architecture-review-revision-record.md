# Architecture Review Revision Record

## Revision Index

| Revision ID | Review Round / Trigger | Related Solution Revision IDs | Prior Decision | Current Decision | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| ARCH-REV-001 | Round 1 / Architecture Design Complete (sent 2026-11-19, reviewed 2026-11-23) | SR-001..SR-005 | N/A | Fail | AR-001, AR-002 |
| ARCH-REV-002 | Round 2 / SR-006 revision for ARCH-REV-001 (2026-11-23) | SR-006 | Fail | Pass | AR-001, AR-002 (resolved) |

## Revision Entries

### ARCH-REV-001 — Initial review: sound design; one requirement inconsistency and an incomplete builder inventory

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/stopped-run-unavailable-model/tickets/in-progress/stopped-run-unavailable-model/design-review-report.md`
- Review round and trigger: Round 1; `Architecture Design Complete` from `/solution_designer` (2026-11-19, sent twice; package unchanged)
- Triggering role, report path, and finding IDs: solution_designer, `architecture-review-handoff.md`, N/A
- Relevant solution revision IDs: SR-001..SR-005
- Prior authoritative decision: N/A
- Current authoritative decision: `Fail` (`Requirement Gap` AR-001; `Design Impact` AR-002)
- Baseline established:
  - The behavior basis is confirmed against the code at `8430d9ef12` and re-checked on `origin/personal` @ `1f761bc8db` (757 commits later).
  - Medium/High is confirmed.
  - The decision owner, the rule rewrite, the `pendingRuntimeSwitch` deviation (reason holds) and `Directly Usable — No Migration` all pass.
  - The native fresh-session premise is verified (`createAgentWithId` takes no `restoreOptions`). autobyteus-599's same-runtime session renewal on the new base reuses the same switch steps.

#### Prior Finding Resolution

None.

- New or remaining finding IDs:
  - AR-001 (Medium, Requirement Gap): a third model ≥ the reference while a model hand-over is pending. REQ-004/AC-006 say "still pending"; REQ-003 and the decision table say "same session".
  - AR-002 (Low, Design Impact): three validation-context builders are missing from the inventory (Org create, launch usability check, Model Router settings), and the statement that the Model Router uses its own validator is false.
- Material classification changes: None
- Recommended recipient: `/solution_designer`
- Remaining risks or uncertainty: N-1 base drift (glossary, marker builder and activation step changed on the new base); N-2 AC-007 wording; N-3 unlisted DEC-005 consequences.

### ARCH-REV-002 — Re-review of SR-006: AR-001 and AR-002 resolved; Pass

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/stopped-run-unavailable-model/tickets/in-progress/stopped-run-unavailable-model/design-review-report.md`
- Review round and trigger: Round 2; SR-006 from `/solution_designer`
- Triggering role, report path, and finding IDs: solution_designer, `architecture-review-handoff.md` (Round 2 section), AR-001, AR-002
- Relevant solution revision IDs: SR-006
- Prior authoritative decision: `Fail` (ARCH-REV-001)
- Current authoritative decision: `Pass`
- What changed in the review result:
  - The behavior basis is reconfirmed on `1f761bc8db`, and the refreshed citations are correct.
  - DEC-009 brings REQ-004 and AC-006 (a)-(d) in line with REQ-003, within the user's rule.
  - The three launch validators get `no_session`, and the false statement is corrected.
  - N-1..N-3 are adopted, and the new Data Contract section passes.
  - The re-run data scan adds the non-blocking N-4: a stored same-runtime, same-model pending switch must keep today's marker text.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-001 | Open (Medium, Requirement Gap) | Resolved | SR-006; DEC-009; REQ-004; AC-006 (a)-(d); design case checks, Data Contract walk, sequence step 4 | A third model ≥ the reference → `same_session` (session resumes, pending cleared); < or unknown → `hand_over` (`from` kept). The requirements, decision table and rule shape agree |
| AR-002 | Open (Low, Design Impact) | Resolved | SR-006; Change Scope → Derived consumers; Final File Mapping | `agent-org-run-service.ts:157`, `launch-usability-check.ts:158` and `model-routing-settings.ts:137` are opened on `1f761bc8db` and get `no_session`. The model-routing statement is corrected (`:2, :105, :137`) |

- New or remaining finding IDs: None (N-4 is a non-blocking implementation note)
- Material classification changes: None (`Medium` / `High`)
- Recommended recipient: `/implementation_engineer`; informational notice to `/solution_designer`
- Remaining risks or uncertainty:
  - N-4 (marker text for a stored same-model pending switch);
  - the stale "baseline SR-005" line in the requirements Document Status;
  - the native→native path is proven only by the planned E2E (AC-002, AC-008).

