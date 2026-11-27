# Solution Revision Record

## Revision Index

| Revision ID | Phase | Trigger / Report / Round | Finding IDs | Prior Status | Current Status | Affected Behavior / Requirement IDs | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SR-001 | Evidence + Requirements | autobyteus-484 investigation | N/A | N/A | Ready for Approval (build waits for DEC-001) | BEH-001..005, REQ-001..007 | Analysis complete; report returned to the PM |
| SR-002 | Evidence | The founder (through the PM, 2026-11-17): compare the node-8001 relay sandbox; check provider terms | N/A | Ready for Approval | Ready for Approval (decisions open: DEC-001, DEC-002 revised, DEC-003, DEC-006, DEC-007) | DEC-002, new DEC-006/007, FU-003 | The relay complements the vault; see relay-comparison.md |
| SR-003 | Requirements | The user's decision, 2026-11-21 | N/A | Ready for Approval | 484 analysis complete; the build moves to a new Task | DEC-008 | Credential gateway approved as a new feature |

## Revision Entries

### SR-001: Analysis of the test vault in a fresh Docker server container

- Phase and classification: Initial Baseline (investigation result).
- Trigger: Task autobyteus-484 from `/project_task_manager`, 2026-11-12.
- Prior status: N/A. Current: requirements `Ready for Approval` as the basis of a possible build; no design.
- IDs: BEH-001..005, UC-001..003, REQ-001..007, AC-001..005, SCN-001..002, DEC-001..005.
- Why recorded: first coherent result for the user and the PM.
- Canonical sections: [analysis-report.md](analysis-report.md), [requirements-doc.md](requirements-doc.md), [investigation-notes.md](investigation-notes.md), [follow-ups.md](follow-ups.md).
- Supplements: `probes/` (disposable evidence).
- Intended behavior changed: No (no product change made).
- Approval impact: none yet; DEC-001..003 need the user.
- Design: N/A. There is no design until the user approves a build; the classification follows the design.
- Handoff: no handoff rule matches an investigation result, so it is returned to the delegating PM (`/project_task_manager`) with FU-001 and FU-002.
- Remaining gaps: UNK-001..003 (Linux mount, concurrent sandboxes, browser capabilities).
- Next action: the user decides DEC-001..003; the PM passes the report to agents-101 and, if wanted, creates the build Task.

### SR-002: The relay sandbox compared, and provider terms

- Phase and classification: Evidence-only clarification. Intended behavior unchanged; decisions added.
- Trigger: `/project_task_manager` message of 2026-11-17 relaying the founder's request; the 8001 guide copy at `autobyteus-delivery-records/sandbox-guide-from-node-8001-20261117/`.
- Result: [relay-comparison.md](relay-comparison.md). The relay complements the vault route (isolation and credential attachment outside the sandbox). API keys through the relay are clean under Anthropic's legal page. A relay that attaches the subscription login's token is not allowed as a product feature and is a grey area for the founder's own use. `claude setup-token` is the documented subscription route for scripts.
- New: DEC-006, DEC-007; DEC-002 revised (now: which Claude credential). FU-003 added.
- Approval impact: none yet; all build decisions are the founder's.
- Next action: the founder decides in the Solution Designer's conversation; the PM informs agents-101.

### SR-003: The user approves a credential gateway as a new feature

- Phase and classification: Requirement change by the user, outside this analysis ticket's scope, so it becomes a new Task.
- Trigger: the user in the Solution Designer's conversation, 2026-11-21: "let's build it … for other providers and including login token … we just don't use it is alright."
- Decision: DEC-008. A credential gateway: one URL setting on a node, current behavior when empty. All providers; API keys and login tokens; login-token use stays off. The 484 vault-in-container script and the relay isolation layer become parts of that feature.
- Approval: the user (direction). Detailed requirements are written and approved in the new Task.
- Next action: the PM creates the new Task for this team; 484 can close as analysis complete.

### SR-004: Draft data contract for 581, validated (Principle 17)

- Trigger: the user, 2026-11-26: "write a contract file … validate … whether it's clean or not."
- Result: [sandbox-relay-data-contract.md](sandbox-relay-data-contract.md), records C1–C8 (C9 open), walks W1–W5, checks run (a new measurement: mapped-folder ownership and a planted link that resolves to the host's file), findings V-1 to V-7, vocabulary change ("credential gateway" becomes "provider relay" / "relay node"), open items O-1 to O-5.
- Status: Draft supplement for autobyteus-581. Not approved; 581's requirements are not written yet.
