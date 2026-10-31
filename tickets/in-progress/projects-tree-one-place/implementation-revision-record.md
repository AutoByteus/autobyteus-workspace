# Implementation Revision Record — projects-tree-one-place (autobyteus-353)

The current code and `implementation-handoff.md` are authoritative; this record locates each implementation round.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Solution Designer, `handoff-implementation.md` (Medium / Low, direct implementation) | N/A | `Initial Baseline` | SR-002; ARCH-REV / CRR / API-REV / DR: N/A | Implemented; local checks and in-app proof of AC-001 / AC-002 pass; to API/E2E |

## Revision Entries

### IR-001 — A Project lists only the runs started under it

- Triggering role, report path, and round: Solution Designer, `tickets/in-progress/projects-tree-one-place/handoff-implementation.md`, round 1 (SR-002; release decision added in `724bc349ff`).
- Triggering finding IDs: N/A (initial baseline).
- Classification: `Initial Baseline`.
- Prior authoritative result: N/A.
- Current authoritative result: the design's Removal / Decommission Plan implemented on `codex/projects-tree-one-place`; server and web typechecks, guards and full unit suites pass; AC-001 (the user's case) and AC-002 proven in the app on a script-owned stack.
- Related solution revision IDs: SR-002.
- Related architecture-review revision IDs: N/A.
- Related code-review revision IDs: N/A.
- Related API/E2E revision IDs: N/A.
- Related delivery revision IDs: N/A.
- Why this baseline is recorded: first implementation of the design (Change / Refactor Sequence steps 1–3; step 4, docs, is Delivery's).
- Approved behavior or requirement IDs affected: BEH-001…BEH-004; REQ-001…REQ-005; AC-001…AC-005.
- Implementation delta: server `projectRunHistory` = started runs only (no hosts, `scopes`, `agentOrgRuns`); `ProjectRunLinks.runLinksOf`, `TaskExecutionResourceService.runLinksOf` / `TaskRunLinks` / `damagedProjectIds`, `listAgentGroupsOf`'s `pinned` removed. Web: scope props and `taskExecutionScope.ts` removed; no Org rows; single ancestry; re-reads only on `connected`, Project list changes and web start / archive / delete / Stop of Agent and Team runs. Commits `60fc6161d2` and part of `724bc349ff` (see the handoff's Current Implementation Summary).
- Changed files or areas: handoff § Key Files Or Areas.
- Local validation and result: handoff § Checks Run, IMP-01…IMP-08, all Pass.
- Next recipient or routing: API/E2E engineer (Medium / Low, direct route).
- Remaining limitations or risks: handoff § Known Risks — the PRH e2e suite and the 347 probe assert the removed behavior and need API/E2E updates; docs are Delivery's; beta release after finalization (user's decision).
