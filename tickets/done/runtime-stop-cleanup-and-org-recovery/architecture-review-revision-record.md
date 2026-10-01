# Architecture Review Revision Record

The latest `design-review-report.md` remains authoritative.

## Revision Index

| Revision ID | Review Round / Trigger | Related Solution Revision IDs | Prior Decision | Current Decision | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| ARCH-REV-001 | Round 1 / Architecture Design Complete (SR-002) | SR-001, SR-002 | N/A | Fail (Design Impact) | AR-001, AR-002 |
| ARCH-REV-002 | Round 2 / Revised Architecture Design Complete (SR-003) | SR-001, SR-002, SR-003 | Fail (Design Impact) | Pass | AR-001, AR-002 (resolved) |
| ARCH-REV-003 | Round 3 / SR-004 requirements clarification (CRR-002 / CR-001) | SR-001..SR-004 | Pass | Pass | None new (CR-001 addressed upstream) |

## Revision Entries

### ARCH-REV-001 — Initial review: A and B-Org sound; Team restore entry and Org fail-stop retry need correction

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-stop-cleanup-and-org-recovery/tickets/in-progress/runtime-stop-cleanup-and-org-recovery/design-review-report.md`
- Review round and trigger: Round 1; `handoff-architecture-design-complete.md` from `/solution_designer` (2026-09-29)
- Triggering role, report path, and finding IDs: `/solution_designer`, `handoff-architecture-design-complete.md`, N/A
- Relevant solution revision IDs: SR-001, SR-002
- Prior authoritative decision: N/A
- Current authoritative decision: `Fail` — `Design Impact`
- What changed in the review result or what baseline was established: Initial baseline.
  - The behavior basis is confirmed against current code.
  - D-A1, D-B1 and D-B2 pass, with non-blocking notes R-1..R-5.
  - D-B4 for Orgs passes. D-B4 for Teams is unreachable because `TeamRunService.restoreTeamRun` pre-guards "already managed" (AR-001).
  - D-B3 retry loses the Org fail-stop origin (AR-002).
  - The delayed-SIGKILL pgid-reuse risk is accepted with no extra machinery (PR-003).
  - The Team frozen-scope caching question is resolved from code (R-8).

#### Prior Finding Resolution

None

- New or remaining finding IDs: AR-001 (Medium), AR-002 (Low)
- Material classification changes: None (Medium / High confirmed)
- Recommended recipient: `/solution_designer`
- Remaining risks or uncertainty: See the report's Residual Risks section. AGY `--conversation` resume after a crash is confirmed only by live validation.

### ARCH-REV-002 — Re-review of SR-003: AR-001 and AR-002 resolved; Pass

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-stop-cleanup-and-org-recovery/tickets/in-progress/runtime-stop-cleanup-and-org-recovery/design-review-report.md`
- Review round and trigger: Round 2; Revised Architecture Design Complete from `/solution_designer` (SR-003), 2026-09-29
- Triggering role, report path, and finding IDs: `/solution_designer`, updated `handoff-architecture-design-complete.md`, AR-001, AR-002, R-1..R-8
- Relevant solution revision IDs: SR-001, SR-002, SR-003
- Prior authoritative decision: `Fail` — `Design Impact` (ARCH-REV-001)
- Current authoritative decision: `Pass`
- What changed in the review result: Both findings verified resolved against the revised design spec and current code. R-1..R-8 are folded into D-A1, D-B1, D-B2, D-B3, Risks, Change Sequence and tests. The behavior basis, classification and persisted-data decision are unchanged. Three minor non-blocking notes (N-1..N-3) were added.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-001 | Open (Medium) | Resolved | SR-003; design-spec D-B4, Interface Boundary Mapping, Ownership Map, File Mapping, tests | `TeamRunService.restoreTeamRun` pre-transition `hasManagedTeamRun` guard is removed, so GraphQL `restoreAgentTeamRun` → service → `AgentTeamRunManager.restoreTeamRun` (inside `withRootTransition`) reaches the self-heal. `resolveActiveTeamRun`/`resolveManagedTeamRun` are explicitly unchanged, with a sound reason. Tests cover a registered-but-inactive Team being restored and a still-active Team being rejected. |
| AR-002 | Open (Low) | Resolved | SR-003; design-spec D-B3, example, tests | A persistent `AgentOrgRun.failStopped` field is set by `enterFailStop` and passed to every `terminateOnce`, matching `RootTeamRun.failStopped` (`root-team-run.ts`). A test covers fail-stop → failed first attempt → retry takes the drain path and returns accepted. |

- New or remaining finding IDs: None (non-blocking notes N-1..N-3)
- Material classification changes: None (Medium / High)
- Recommended recipient: `/implementation_engineer` (primary); informational pass to `/solution_designer`
- Remaining risks or uncertainty: See the report's Residual Risks section.

### ARCH-REV-003 — SR-004 AC-B1 alternate clarification: coherent with SR-003; Pass

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-stop-cleanup-and-org-recovery/tickets/in-progress/runtime-stop-cleanup-and-org-recovery/design-review-report.md`
- Review round and trigger: Round 3. The trigger is the revised package from `/solution_designer` (SR-004, requirements-only), after `/code_reviewer` CRR-002 / CR-001 (API/E2E F-API-B1-ALT).
- Triggering role, report path, and finding IDs: `/code_reviewer`, `code-review-report.md`, CR-001; `/solution_designer`, `handoff-architecture-design-complete.md` (SR-004 section)
- Relevant solution revision IDs: SR-001..SR-004
- Prior authoritative decision: `Pass` (ARCH-REV-002)
- Current authoritative decision: `Pass`
- What changed in the review result:
  - Verified the user-approved SR-004 AC-B1 alternate, option (b):
    - Retry after a failed or stuck attempt → D-B3 plus D-B4.
    - Already-stopped root → unchanged manager, service and resolver behavior. There is no side effect, and the existing `success:false` "…not found." response is preserved.
  - Confirmed against source and live evidence.
  - D-A1 and D-B1..D-B4 are unchanged, and "GraphQL/WebSocket/web: No change" remains correct.
  - Added an AC alternate-column mapping to the basis section.
  - Added note N-4.
- Review-gap acknowledgment: in ARCH-REV-002 I marked BEH-B1 `Confirmed` without mapping the AC-B1 "Alternate / Failure" column to a design decision or to confirmed unchanged behavior, which is the same gap CR-001 records for code review. The basis check now covers alternate columns explicitly.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-001 | Resolved (ARCH-REV-002) | Resolved (unchanged) | SR-003 | Design unchanged in SR-004 |
| AR-002 | Resolved (ARCH-REV-002) | Resolved (unchanged) | SR-003 | Design unchanged in SR-004 |
| CR-001 (code review; tracked here for architecture coverage) | Open downstream | Addressed at requirements/design level | SR-004 | The AC-B1 alternate is now approved as a retry that completes the stop plus the preserved existing response for an already-stopped root. It maps to D-B3/D-B4 and to verified unchanged code, `agent-org-run-manager.ts` `terminate` / `agent-team-run-manager.ts` `terminateTeamRun` → resolvers. Final closure belongs to code review after the API/E2E assertion update. |

- New or remaining finding IDs: None (non-blocking notes N-1..N-4)
- Material classification changes: None (Medium / High)
- Recommended recipient: `/implementation_engineer` (primary, per the handoff rules; no production change is required); informational pass to `/solution_designer`
- Remaining risks or uncertainty: Unchanged; see the report's Residual Risks section.
