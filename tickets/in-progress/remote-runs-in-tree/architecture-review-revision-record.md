# Architecture Review Revision Record — `remote-runs-in-tree` (autobyteus-278)

The latest `design-review-report.md` is authoritative. This record holds the baseline and the review deltas.

## Revision Index

| Revision ID | Review Round / Trigger | Related Solution Revision IDs | Prior Decision | Current Decision | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| ARCH-REV-001 | Round 1 / `Architecture Design Complete` | SR-004 | N/A | Fail | AR-401, AR-402, AR-403 |
| ARCH-REV-002 | Round 2 / SR-005 answers ARCH-REV-001 | SR-005 | Fail | Pass | AR-401 … AR-403 resolved |
| ARCH-REV-003 | Round 3 (delta) / SR-006 answers CRR-003 F-005 | SR-006 | Pass | Pass | None new; N-405, N-406 |

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

### ARCH-REV-002 — Round 2: per-kind sources on B, frame identity, unexpected end; Pass

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/remote-runs-in-tree/tickets/in-progress/remote-runs-in-tree/design-review-report.md`
- Review round and trigger: round 2; the Solution Designer's SR-005 (commit `8dc717e39c`).
- Triggering role, report path, and finding IDs: Solution Designer, `handoff-architecture-review.md` § Round 2; AR-401 … AR-403, N-401 … N-404.
- Relevant solution revision IDs: SR-005
- Prior authoritative decision: `Fail` (ARCH-REV-001)
- Current authoritative decision: `Pass`
- What changed in the review result: each finding was verified in the revised spec. `terminateTeamRun` was checked against `agent-team-run-manager.ts:341` (it is the stop path and keeps the package).

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-401 | Open (High) | Resolved | SR-005; Current-State Read; DS-006; § sources on B; file list; CM-11 | Manager-owned `observePairedAgents` / `executeOwnerCommand` behind `RemoteRootDirectory`; standalone through the host (`onHostReady`, `postToHost`, interrupt, `stopRoot`); Team through the filtered publisher and the directory listener (member commands, `terminateTeamRun`) |
| AR-402 | Open (Medium) | Resolved | SR-005; frame contract; A's mapping | `{agentRunId, message}` for paired agents only; A maps to the stored link and drops unknown IDs |
| AR-403 | Open (Low) | Resolved | SR-005; DS-005 | An unexpected end runs one summary fetch that sets the row; no reconnect |
| N-401 … N-404 | Notes | Done | SR-005 | `{nodeId}` first frame; pinned projector test; `remoteChildOf`; the user informed |

- New or remaining finding IDs: none.
- Material classification changes: none (`Large` / `High`).
- Recommended recipient: Implementation Engineer; informational notice to the Solution Designer.
- Remaining risks or uncertainty: RSK-801, RSK-802, RSK-201, RSK-401.

### ARCH-REV-003 — Round 3 (delta): the owner mark as a content heading; Pass

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/remote-runs-in-tree/tickets/in-progress/remote-runs-in-tree/design-review-report.md`
- Review round and trigger: round 3; the Solution Designer's SR-006 (head `dfbfb28615`; the handoff names `f4bb9e72f1`), answering the code reviewer's CRR-003 F-005.
- Triggering role, report path, and finding IDs: Solution Designer, `handoff-architecture-review.md` § Round 3; `code-review-report.md` CRR-003 F-005 (Design Impact), with F-002 … F-004 (Local Fixes).
- Relevant solution revision IDs: SR-006
- Prior authoritative decision: `Pass` (ARCH-REV-002)
- Current authoritative decision: `Pass`
- What changed in the review result:
  - Reviewed with the updated method (`autobyteus-agents` `4c8fb00`, `e84471d`): DS-004 redrawn in call order, with one owner per node; the cited lines opened (`paired-agent-access.ts:30`, `task-execution-input.ts:43`); the consumer table checked against the window code.
  - One consumer added as a note: the window's local echo, replaced by identity match (N-405).
  - The title row's claim is confirmed but uncited (N-406).

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-401 … AR-403 | Resolved | Resolved (unchanged) | — | — |
| CRR-003 F-005 (code reviewer's) | Design Impact | Resolved in design | SR-006 DS-004a; AC-803 | The heading is composed by `remoteOwnerUserMessage`; the metadata is removed; consumer table |

- New or remaining finding IDs: none blocking. N-405 (the echo consumer row plus an E2E assertion), N-406 (cite the title claim). Local Fixes F-002 … F-004 are passed to implementation.
- Material classification changes: none (`Large` / `High`).
- Recommended recipient: Implementation Engineer; informational notice to the Solution Designer.
- Remaining risks or uncertainty: RSK-801, RSK-802, RSK-201, RSK-401.
