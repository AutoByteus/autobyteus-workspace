# Solution Revision Record — `remote-agent-teams` (autobyteus-247)

## Revision Index

| Revision ID | Phase | Trigger | Prior | Current | Result |
| --- | --- | --- | --- | --- | --- |
| SR-001 | Requirements | autobyteus-247 from the PTM; the user's approval 2026-10-21 | N/A | Ready for Approval | Presented to the user (DEC-301, DEC-302) |

### SR-001 — Initial baseline (2026-10-21)

- Requirements REQ-301 … REQ-309, AC-301 … AC-306, decisions DEC-301 … DEC-304 (DEC-303 and DEC-304 decided by the Solution Designer).
- Next action: the user answers DEC-301 and DEC-302; then the design.

### SR-002 — Approval: any member linked; Teams before S3 (2026-10-21)

- Trigger: the user, 2026-10-21. Discussion of the local `send_message_to` rules and the on-disk model of local Team copies; "as long as you know the agent run ID … we don't want to limit us"; "Yeah, I think so. I think, great" to the Team link storing the coordinator's and members' run IDs.
- Changes:
  - DEC-301 → (b) any member, both ways, with waking; the members' run IDs are in A's Team link.
  - DEC-302 → Teams now, S3 later.
  - REQ-305 and AC-303 are updated.
  - "Global send across nodes" is recorded as FU-001.
- Approval: the User. Baseline: `requirements-doc.md` at SR-002.
- Next action: update the contract; validate the approach case by case; then the design.

### SR-003 — Contract updated; approach validated (2026-10-21)

- Trigger: the user asked to update the contract and validate the approach case by case.
- Contract (`autobyteus-server-ts/docs/design/collaboration_model.md` in this branch):
  - CM-10: the Team link holds the coordinator's and members' run IDs.
  - CM-11: every member is reachable, with waking; every message names its receiving root.
  - CM-12: Agent Teams are offered; members use their own defaults, else the Team's; auto-approve for every agent.
  - § 3 storage now shows the Team on both nodes; § 4 and § 5 are updated.
- Validation: `validation-cases.md`, C-01 … C-31 (Read). Verdict: the approach works. Design points G-1 … G-9, including G-2, a symmetric `targetRoot` on every message.
- Intended behavior changed: `No`.
- Next action: the design.

### SR-004 — Data model refinement (2026-10-21)

- Trigger: the Solution Designer's own review of the data model, asked by the user ("Do you think the data model is clean?"); the user: "If you think this is cleaner, then do it like this."
- Change:
  - A's remote Team link: `coordinatorAgentRunId` → `coordinatorAddress` (the coordinator is a member; one fact, one place; names as in the Team tree).
  - The delegated-runs Team answer uses the same names.
  - In memory, remote links are explicitly kinded (`agent` / `agent_team`).
- Files: `collaboration_model.md` (CM-10, § 3), `validation-cases.md` (G-1, G-7, refinement note), `requirements-doc.md` (Data Continuity).
- Intended behavior changed: `No`.

### SR-005 — Design complete (2026-10-21)

- Phase and classification: Design / `Architecture Design Complete`.
- Trigger: the user, 2026-10-21: "do another round of validation; if no problem … start your work with design and do handoffs." Validation round 2 found no problem (premises P-1 … P-4 reproduced, 60 tests).
- Design (`design-spec.md`) resolves G-1 … G-9:
  - kinded remote links and the Team link (`coordinatorAddress`, `members`);
  - `delegatedFrom` on B's Team tree;
  - `targetRoot` on every message, both directions; the delegated-runs answer union;
  - endpoint kind `delegated_team` and paired sets;
  - `RemoteTeamRunStarter`, the `TeamRunService` input, B's Team root back-link and `acceptRemoteWorkPacket`, `RemoteTeamIdleShutdown`;
  - `agentRunIdsOfTree` for Team links and Team back-links;
  - the refusal, fence and guidance lookups by team run ID.
- Health: `Shared Structure Looseness` (single-agent-shaped remote machinery); bounded refactor now.
- Classification: `Large` / `High`.
- Route: architecture review (see `handoff-architecture-review.md`).

### SR-006 — Quiet idle shutdown of a peer-started Team (ARCH-REV-001, 2026-10-21)

- Phase and classification: Design / `Design Impact` (AR-301; non-blocking N-301 … N-303 adopted).
- Changes:
  - **AR-301:** `RemoteTeamIdleShutdown` is a quiet shutdown. It arms and cancels on the delegated-child signals; at fire time, in the root's gate (`RootTeamRun.shutDownIfQuiet`), it skips open child work and live leases and uses the Team's existing all-or-nothing `TeamRunBackend.tryPrepareTerminationIfQuiescent()` (the same rule as a Team copy's idle shutdown). Background tasks and tool-approval waits keep it running. The package is kept. Unit cases are listed. Verified by reading `flat-team-execution-manager.ts:237-270`, `root-team-execution-directory.ts:277-300`, `standalone-host-idle-shutdown.ts`.
  - **N-301:** `pairedAgentRunIds` is the one representation; the rules are derived.
  - **N-302:** the starter passes every planned member and refuses a changed layout; a nested sub-team test.
  - **N-303:** a stored-link check before restoring an inactive root.
- Intended behavior changed: `No` (REQ-306's "once every member is quiet" is now met).
- Next action: round 2 to the architecture reviewer.
