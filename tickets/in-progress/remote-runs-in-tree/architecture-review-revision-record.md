# Architecture Review Revision Record — `remote-runs-in-tree` (autobyteus-278)

The latest `design-review-report.md` is authoritative. This record holds the baseline and the review deltas.

## Revision Index

| Revision ID | Review Round / Trigger | Related Solution Revision IDs | Prior Decision | Current Decision | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| ARCH-REV-001 | Round 1 / `Architecture Design Complete` | SR-004 | N/A | Fail | AR-401, AR-402, AR-403 |

## Revision Entries

### ARCH-REV-001 — First review: A-side ownership sound; the B side misses how a remote Agent runs

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/remote-runs-in-tree/tickets/in-progress/remote-runs-in-tree/design-review-report.md`
- Review round and trigger: round 1; `Architecture Design Complete` (SR-004, commit `fee1d70cda`).
- Triggering role, report path, and finding IDs: Solution Designer, `handoff-architecture-review.md`; no prior findings.
- Relevant solution revision IDs: SR-004
- Prior authoritative decision: N/A
- Current authoritative decision: `Fail` (`Design Impact`)
- What was established:
  - The behavior basis is confirmed, and `Large` / `High` is confirmed.
  - The five handoff points: A's root ownership and the shared `RemoteRunObservation` are sound; the distinct `remote_agent_presentation` event is right; the directory listener is right for Team roots; phase 1 is accepted; the REQ-803 clarification is accepted.
  - The B side does not hold for remote Agents. Verified against `standalone-host-agent-handle.ts`, `standalone-host-idle-shutdown.ts`, `standalone-agent-run-root.ts:207, 375-395` and `standalone_agent_run_root.md:16-17, 169-178`.

#### Prior Finding Resolution

None.

- New or remaining finding IDs:
  - AR-401 (High): a per-kind, root-owned way to observe and command a remote run's paired agents. On a standalone root this means the host's events through `onHostReady`, `postToHost`, host interrupt and `stopRoot`; on a Team root, the publisher filtered to members and the directory listener.
  - AR-402 (Medium): B sends only paired agents; A identifies frames by `agentRunId` against the stored link.
  - AR-403 (Low): an unexpected stream end runs the summary fetch once, so the row shows the truth.
  - Non-blocking: N-401 … N-404.
- Material classification changes: none.
- Recommended recipient: Solution Designer
- Remaining risks or uncertainty: RSK-801, RSK-802, RSK-201, RSK-401.
