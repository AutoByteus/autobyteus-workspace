# Solution Revision Record — node-vocabulary (autobyteus-290)

## Revision Index

| SR | Date | Phase | Summary |
| --- | --- | --- | --- |
| SR-001 | 2026-10-24 | Requirements | The audit and the proposed renames |
| SR-002 | 2026-10-24 | Requirements | Approved; held for the naming principle |
| SR-003 | 2026-10-24 | Design | Design complete under Principle 15; Large / High |

## Revision Entries

### SR-001 — Audit and proposal (2026-10-24)

- Trigger: the PTM's delegation of autobyteus-290, with the user's correction.
- Prior status: N/A. Current status: `Ready for Approval`.
- Open: U-1, U-2 (the user).

### SR-002 — Approved; held for the naming principle (2026-10-24)

- The user left U-1 and U-2 to the Solution Designer's recommendation ("I think that you have much better language skill and you also understand our system much better than me now"): U-1 (a) keep stored names, U-2 (a) rename the identity wire field to `nodeId` (iOS `ConnectionValidator.swift` included).
- Status: `Ready for Approval` → `Approved`.
- The user then asked to improve the team's design principles first ("so that we can first work on the principle"). The proposal was sent to the PTM: `/Users/normy/autobyteus_org/autobyteus-task-results/autobyteus-290/naming-principle-proposal.md`. Design is held until the PTM reports the principle has landed.

### SR-003 — Design under Principle 15 (2026-10-24)

- Trigger: the PTM reports the naming principle landed (autobyteus-agents-57, PR #109, `179acb4`); the skill's principles and template were re-read.
- Audit additions: V-08 ("a delegated run is a peer" in the contract), V-09 (the mobile session's `nodeId` = its entry ID), V-10 (Memory Sync's "source node id", a third ID: FU-002). FU-001: `compatibilityVersion`, rule 9.
- Design: six steps, each with no behavior change. A glossary in `collaboration_model.md` § 1 with a `DESIGN.md` pointer. Stored names keep their form through one mapping owner each (U-1); the identity wire field becomes `nodeId` (U-2), with iOS included.
- Classification: `Large` / `High`. Route: architecture review.

### SR-004 — The version field removed; the phone apps' entries (2026-10-24)

- Trigger: the user on FU-001: "The version number like compatibility number, I think we should remove it … it's against our rule". The iOS app checks it (`ConnectionValidator.swift:135`, `>= minimumCompatibilityVersion`), which is a version check rule 9 rules out.
- Changes:
  - REQ-909 and design Step 1b: remove the field and the iOS check; the only intended behavior change.
  - REQ-901 and Step 4 extended to the phone apps' saved node records (iOS `SavedNodeProfile`, Android `NodeProfile` → entry), found while tracing the field.
- Approval: REQ-909 is the user's request; the entry naming is within the approved direction.
- Route: an addendum to the architecture review in progress.
