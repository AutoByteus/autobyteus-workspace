# Architecture Review Revision Record — `remote-collaboration-without-publishing` (autobyteus-245)

The latest `design-review-report.md` is authoritative. This record holds the baseline and the review deltas.

## Revision Index

| Revision ID | Review Round / Trigger | Related Solution Revision IDs | Prior Decision | Current Decision | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| ARCH-REV-001 | Round 1 / `Architecture Design Complete` | SR-004 | N/A | Fail | AR-201, AR-202, AR-203, AR-204 |
| ARCH-REV-002 | Round 2 / SR-005 answers ARCH-REV-001 | SR-005 | Fail | Pass | AR-201 … AR-204 resolved |

## Revision Entries

### ARCH-REV-001 — First review: sound direction; Team refusal order, port tightness, refusal answer shape, stale requirement text

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/remote-collaboration-without-publishing/tickets/in-progress/remote-collaboration-without-publishing/design-review-report.md`
- Review round and trigger: round 1; `Architecture Design Complete` (SR-004, commit `707e8b6d951591be81e104f43d71b89926a7eb93`).
- Triggering role, report path, and finding IDs: Solution Designer, `handoff-architecture-review.md`; no prior findings.
- Relevant solution revision IDs: SR-004
- Prior authoritative decision: N/A
- Current authoritative decision: `Fail`
- What was established:
  - The behavior basis is confirmed for BEH-201 … BEH-204, and `Medium` / `High` is confirmed.
  - The design's main move is sound and verified in the code: remote targets go through `CollaboratorAdmission`, `CollaboratorCandidatePolicy`, `CatalogAddressMap` and `CollaboratorLaunchResolver` with a "no run" port, replacing slice 1's parallel publish resolution.
  - Persisted data is `Not Affected` (accepted).

#### Prior Finding Resolution

None.

- New or remaining finding IDs:
  - AR-201 (Medium): decide the target's kind before launch resolution, so a Team gets `REMOTE_TEAMS_NOT_SUPPORTED`.
  - AR-202 (Medium): replace `rootLaunchConfiguration()` on the port with `launchBase()` (one reader), and remove the dead `rootKind`.
  - AR-203 (Low): the refusal answer's shape for the Agent's name and the reason.
  - AR-204 (Requirement Gap, text): UC-204 / SCN-201 / AC-206 / the DEC-203 row contradict SR-003.
- Material classification changes: none.
- Recommended recipient: Solution Designer
- Remaining risks or uncertainty: RSK-201 (accepted); a node's local CLI runtime credentials serve any registered peer (consistent with CM-12; document it); the `inherited` path must stay unchanged.

### ARCH-REV-002 — Round 2: all four findings resolved; Pass

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/remote-collaboration-without-publishing/tickets/in-progress/remote-collaboration-without-publishing/design-review-report.md`
- Review round and trigger: round 2; the Solution Designer's SR-005 (commit `8755a19305c6449517676ea0e0eb3581f7d0de0e`).
- Triggering role, report path, and finding IDs: Solution Designer, `handoff-architecture-review.md` § Round 2; AR-201 … AR-204.
- Relevant solution revision IDs: SR-005
- Prior authoritative decision: `Fail` (ARCH-REV-001)
- Current authoritative decision: `Pass`
- What changed in the review result: each finding was verified in the current design spec, requirements and investigation notes. One implementation note was added (N-201).

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-201 | Open (Medium) | Resolved | SR-005; DS-001; ownership; interfaces | `catalogDefinitionAt` first (null → `AGENT_NOT_FOUND`, Team → `REMOTE_TEAMS_NOT_SUPPORTED`, no launch resolved), then `catalogTaskSourceOf`; local `catalogTaskSource` = both in order |
| AR-202 | Open (Medium) | Resolved | SR-005; ownership; file mapping; escalation trigger; A-04 | `launchBase()` replaces `rootLaunchConfiguration()` on the port; `rootKind` removed; A-04 says one reader |
| AR-203 | Open (Low) | Resolved | SR-005; § Contract Between Nodes; example | `{accepted: false, nodeId, code, message, targetName?}`; `peerRefusalText(node, code, message, targetName)` |
| AR-204 | Open (Low, Requirement Gap) | Resolved | SR-005; requirements UC-204, SCN-201, AC-206, DEC-203, REQ-206 | Text matches SR-003: no setting; auto-approve always on; DEC-203 "Decided (c)" |

- New or remaining finding IDs: none blocking. N-201 (take the Team's name from the eligibility owner).
- Material classification changes: none (`Medium` / `High`).
- Recommended recipient: Implementation Engineer; informational notice to the Solution Designer.
- Remaining risks or uncertainty: RSK-201 (accepted); local CLI credentials (now documented); the `inherited` path must stay unchanged.
