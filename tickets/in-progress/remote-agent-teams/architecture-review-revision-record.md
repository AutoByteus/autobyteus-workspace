# Architecture Review Revision Record — `remote-agent-teams` (autobyteus-247)

The latest `design-review-report.md` is authoritative. This record holds the baseline and the review deltas.

## Revision Index

| Revision ID | Review Round / Trigger | Related Solution Revision IDs | Prior Decision | Current Decision | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| ARCH-REV-001 | Round 1 / `Architecture Design Complete` | SR-005 | N/A | Fail | AR-301 |
| ARCH-REV-002 | Round 2 / SR-006 answers ARCH-REV-001 | SR-006 | Fail | Pass | AR-301 resolved |

## Revision Entries

### ARCH-REV-001 — First review: strong generalization; the idle stop must be a quiet shutdown

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/remote-agent-teams/tickets/in-progress/remote-agent-teams/design-review-report.md`
- Review round and trigger: round 1; `Architecture Design Complete` (SR-005, commit `73fd1e77ecf4b4d1cd88bf6487fb07e4cb623092`).
- Triggering role, report path, and finding IDs: Solution Designer, `handoff-architecture-review.md`; no prior findings.
- Relevant solution revision IDs: SR-005
- Prior authoritative decision: N/A
- Current authoritative decision: `Fail` (`Design Impact`)
- What was established:
  - The behavior basis is confirmed for BEH-301 … BEH-305, and `Large` / `High` is confirmed.
  - G-1 … G-9 each have one owner; `targetRoot` both ways, kinded links, Team links and `delegatedFrom` on Team trees pass.
  - Persisted data is `Not Affected`.
  - MP-301 (a member running a background task while the Team's idle timer fires) is reachable.

#### Prior Finding Resolution

None.

- New or remaining finding IDs: AR-301 (Medium): DS-004 must arm on the child schedule's signals and, on fire, shut down only if every started member prepares quiescent termination and the root has no open child work or lease, reusing the Team-copy quiet rule instead of the user Stop. Non-blocking: N-301 (one representation of the pair rule), N-302 (complete member mapping into `createTeamRun`; refuse on layout drift), N-303 (optional: link check before restore).
- Material classification changes: none.
- Recommended recipient: Solution Designer
- Remaining risks or uncertainty: RSK-201, RSK-301 (accepted); RSK-302 addressed by AR-301.

### ARCH-REV-002 — Round 2: quiet shutdown; Pass

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/remote-agent-teams/tickets/in-progress/remote-agent-teams/design-review-report.md`
- Review round and trigger: round 2; the Solution Designer's SR-006 (commit `173d336a2a`).
- Triggering role, report path, and finding IDs: Solution Designer, `handoff-architecture-review.md` § Round 2; AR-301, N-301 … N-303.
- Relevant solution revision IDs: SR-006
- Prior authoritative decision: `Fail` (ARCH-REV-001)
- Current authoritative decision: `Pass`
- What changed in the review result: AR-301 was verified against the reused code (`TeamRunBackend.tryPrepareTerminationIfQuiescent`, all-or-nothing in `flat-team-execution-manager.ts:237`; the same rule as `tryShutDownRootTaskTeamIfQuiet`). The notes were checked. N-304 was added.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-301 | Open (Medium) | Resolved | SR-006; DS-004; ownership `RemoteTeamIdleShutdown`; file mapping `root-team-run.ts` | Arms on the child signals; fires in the gate through `shutDownIfQuiet()`; skips open child work and leases; reuses the backend's all-or-nothing quiescence; no member interrupted; package kept; unit cases for a background task and an approval wait |
| N-301 | Note | Done | SR-006 | `pairedAgentRunIds` only; rules derived |
| N-302 | Note | Done | SR-006 | A config for every planned member; drift → `AGENT_CANNOT_RUN`, root terminated; nested sub-team test |
| N-303 | Note | Done | SR-006 | Stored link checked before restoring an inactive root; see N-304 for the owner |

- New or remaining finding IDs: none blocking. N-304 (route the pre-restore read through `RemoteRootDirectory`, per slice 1's rule that `remote-collaboration` never reads root trees).
- Material classification changes: none (`Large` / `High`).
- Recommended recipient: Implementation Engineer; informational notice to the Solution Designer.
- Remaining risks or uncertainty: RSK-201, RSK-301 (accepted).
