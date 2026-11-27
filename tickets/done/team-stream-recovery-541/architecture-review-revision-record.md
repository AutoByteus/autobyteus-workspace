# Architecture Review Revision Record

## Revision Index

| Revision ID | Review Round / Trigger | Related Solution Revision IDs | Prior Decision | Current Decision | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| ARCH-REV-001 | Round 1 / Architecture Design Complete (2026-11-27) | SR-001 | N/A | Fail (Design Impact) | AR-001, AR-002 |
| ARCH-REV-002 | Round 2 / Revised package SR-002 (2026-11-27) | SR-002 | Fail | Pass | AR-001, AR-002 (resolved) |

## Revision Entries

### ARCH-REV-001 — Baseline review: the automatic replacement must keep the user's page-local state and start one way

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-stream-recovery-541/tickets/in-progress/team-stream-recovery-541/design-review-report.md`
- Review round and trigger: round 1; design-spec.md (the handoff file) at `4c5adb7ae4`.
- Triggering role, report path, and finding IDs: Solution Designer; `design-spec.md` at SR-001; N/A.
- Relevant solution revision IDs: SR-001.
- Prior authoritative decision: N/A.
- Current authoritative decision: `Fail` — `Design Impact`.
- What changed in the review result or what baseline was established: baseline.
  - These pass: A's cause and FIFO wire, B, C, D, E, and the classification (Large / High).
  - AR-001: the recovery's verified replacement swaps the whole Team context. Nothing carries the members' page-local state across (draft, attachments, skills, mentions, the 540 not-sent notice and returned text, pending send state). Automatic recovery makes that happen under the user's hands (MP-001; REQ-002, Preserved 540).
  - AR-002: starting the recovery from the store through a plugin-supplied starter or a lazy import hides a store ↔ coordinator cycle. `onStreamRecoveryRequired` defaults to a silent no-op (REQ-001; Principles 9, 13, 16).

#### Prior Finding Resolution

None.

- New or remaining finding IDs: AR-001, AR-002.
- Material classification changes: None.
- Recommended recipient: Solution Designer.
- Remaining risks or uncertainty: N-1 (recovery end conditions), N-2 (other `reopen_required` paths in specs), N-3 (an `Offline` context whose run is active again; spec it).

### ARCH-REV-002 — Page state carried at the commit; one-way recovery owner: Pass

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-stream-recovery-541/tickets/in-progress/team-stream-recovery-541/design-review-report.md`
- Review round and trigger: round 2; SR-002 (committed at `205ae5de64`).
- Triggering role, report path, and finding IDs: Solution Designer; `design-spec.md` A section (D-A1…D-A8, walks), `requirements-doc.md` REQ-002 and AC-010; AR-001, AR-002.
- Relevant solution revision IDs: SR-002.
- Prior authoritative decision: Fail (ARCH-REV-001).
- Current authoritative decision: Pass.
- What changed in the review result:
  - AR-001 resolved:
    - D-A6 carries the member contexts' page-local fields at `replaceFailedTeamStream`'s synchronous commit, for both the automatic and the reselect path, through one helper that owns the list;
    - `interruptPending` is not carried, because the Stops were settled before any commit;
    - D-A7 retargets an in-flight send to the current member context before any outcome;
    - walks are given, and AC-010 covers them.
  - AR-002 resolved: the store only publishes per-Team recovery state; a plugin-created owner drives the recovery; a missing owner throws; `onStreamRecoveryRequired` is required.
  - N-1…N-3 adopted.
  - New non-blocking notes: N-4 (do not end recovery for a stopped Team whose view is open, or record why) and N-5 (retargeting a held mention send adds no row).

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-001 | Open (blocking) | Resolved | SR-002 D-A6, D-A7, walks table, REQ-002, AC-010 | Read at `205ae5de64`; consistent with `agentTeamContextsStore.ts:76-89`, `AgentContext.ts:18-38` |
| AR-002 | Open (blocking) | Resolved | SR-002 D-A1, D-A2 (direction statement) | Read at `205ae5de64`; `TeamStreamingService.ts:91` default to be removed |

- New or remaining finding IDs: None blocking; N-4, N-5 non-blocking.
- Material classification changes: None (Large / High).
- Recommended recipient: Implementation Engineer; informational notice to the Solution Designer.
- Remaining risks or uncertainty: N-4, N-5.
