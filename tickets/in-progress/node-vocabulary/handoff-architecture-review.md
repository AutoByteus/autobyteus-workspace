# Handoff — Architecture Review — node-vocabulary (autobyteus-290)

- From: Solution Designer, 2026-10-24. Classification: `Architecture Design Complete`, `task_size=Large`, `architectural_risk=High`.
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/node-vocabulary`, branch `codex/node-vocabulary`, base `origin/personal` `c78ffb15a2`. Finalization target: `origin/personal`. No release unless the user asks.
- Original request: Task autobyteus-290. Make the node vocabulary and data model clean: every server is a node with one node ID; remote = location; peer = a registered remote node (relationship); embedded local = how the desktop started its server; consistent names everywhere.
- Approval:
  - requirements `Approved` at SR-002 (the user left U-1 and U-2 to the recommendation: keep stored names; rename the identity wire field to `nodeId`);
  - the user's tool name `list_peer_nodes`;
  - the new Principle 15 "One Vocabulary" (autobyteus-agents-57), which this design applies.
- Documents (in `tickets/in-progress/node-vocabulary/`):
  - `requirements-doc.md`
  - `investigation-notes.md` (audit V-01 … V-10, cited)
  - `design-spec.md` (SR-003)
  - `solution-revision-record.md`
  - `follow-ups.md` (FU-001, FU-002)
- Classification evidence: renames across server, web, Electron, iOS, the tool contract and the identity wire field; mapping owners for stored names; no behavior change intended.
- Please check in particular:
  - the stored-name mapping owners (one per stored shape);
  - the Step 4 classification of `nodeId` uses (entry vs node), with the compiler as the guard;
  - Step 3 as one step (coordination with autobyteus-260);
  - the glossary location and the `DESIGN.md` pointer;
  - V-10 left as FU-002.
- Coordination: autobyteus-260 (tool result files, running) and autobyteus-284 … 289 (per-node record: use `nodeId` from the start).
- Expected output: the architecture review report; on Pass, the reviewer's handoff to implementation.

## Round 2 — 2026-10-24 (SR-005), answering ARCH-REV-001

| Finding | Resolution |
| --- | --- |
| AR-901 | The user's decision: updating stored agent configs is out of this ticket (the Agent Package Creator's own later ticket); no migration, no alias; REQ-906 states the exception; release-note text in Step 3 |
| AR-902 | Step 4 lists the Electron string carriers with citations; AC-901 requires the implementation's list of every remaining `nodeId` with its meaning |
| AR-903 | REQ-910, Step 5b: `sourceId` / "Source ID" in code, GraphQL, hub wire and UI; stored names through their owners; FU-002 narrowed |
| N-901 … N-904 | `GLOSSARY.md` at repository level with a `DESIGN.md` pointer; iOS 426 branch removed; FU-001 marked; every mapping owner named |

## Round 4 — 2026-10-24 (SR-006): stored names follow the code (the user's U-3)

- The user reversed U-1 and changed the project rule (`DESIGN.md` rule 10; Data Migration Guideline § 2/§ 3; commit `b3d9c758f2`).
- New: design § Stored Names Migration:
  - SM-1 … SM-5 are server sealed migrations; SM-1 holds back the new capability `node_identity`, and REQ-913 says no new node ID is ever created;
  - SM-6 … SM-8 run in a new client sealed area, `autobyteus-web/client-data-migrations/`, with an Electron file runner and a browser-storage runner;
  - the checklist answers are in that section.
- Removed: every stored-name mapping owner. An entry keeps `id` on the record (`entryId` is used for references).
- Please check in particular:
  - the identity hold-back (REQ-913) and the crash-between-steps rule;
  - the client sealed area and where its two runners are called;
  - SM-7's scope (browser mode only);
  - that no old name remains in current code.
- Implementation is holding the mapping owners and continuing the plain renames.
