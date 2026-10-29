# Implementation Revision Record — one-nodes-tab

The current code and `implementation-handoff.md` remain authoritative. This record indexes the implementation rounds.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Architecture reviewer, `design-review-report.md`, round 3 (Pass) | N/A | `Initial Baseline` | `SR-006`, `SR-007`, `ARCH-REV-003`; `CRR-*` N/A; `API-REV-*` N/A; `DR-*` N/A | Implementation complete; code review CRR-001 Fail (4 local fixes) |
| IR-002 | Code reviewer, `code-review-report.md`, CRR-001 (Fail) | CR-001, CR-002, CR-003, CR-004 | `Local Fix` | `SR-007`, `ARCH-REV-003`, `CRR-001`; `API-REV-*` N/A; `DR-*` N/A | All four fixed; code review CRR-002 Pass (`code-review-report.md`); next: API/E2E (routed by the code reviewer) |
| IR-003 | Code reviewer, failure-origin review `CRR-003` of API/E2E `API-REV-001` (API-07 / NP-07) | CR-005 | `Local Fix` | `SR-007`, `ARCH-REV-003`, `CRR-003`, `API-REV-001`; `DR-*` N/A | Fixed; code review CRR-004 Pass (`code-review-report.md`); next: API/E2E reruns (routed by the code reviewer) |

## Revision Entries

### IR-001 — Initial implementation of one Nodes tab

- Triggering role, report path, and round: architecture reviewer, `/Users/normy/autobyteus_org/autobyteus-worktrees/one-nodes-tab/tickets/in-progress/one-nodes-tab/design-review-report.md`, round 3 (`ARCH-REV-003`, Pass).
- Triggering finding IDs: N/A
- Classification: `Initial Baseline`
- Prior authoritative result: `N/A`
- Current authoritative result: superseded by IR-002 for the items CRR-001 found; otherwise unchanged.
- Related solution revision IDs: `SR-006`, `SR-007`
- Related architecture-review revision IDs: `ARCH-REV-003`
- Related code-review revision IDs: `N/A`
- Related API/E2E revision IDs: `N/A`
- Related delivery revision IDs: `N/A`
- Why this baseline is recorded: the first implementation of the reviewed design.
- Approved behavior or requirement IDs affected: BEH-701 … BEH-707; REQ-701 … REQ-714; AC-701 … AC-713 (Electron, Docker and E2E parts left to API/E2E).
- Implementation delta: server address resolution, classified causes, the new add input and queries; the desktop registry's `serverInstanceId` and `identify`; the web's one list, connector, other-node API, dialog and components; removal of the Remote Collaboration tab and the obsolete files; docs. Three design-text reconciliations (handoff § Important Assumptions A1–A3).
- Changed files or areas: handoff § Key Files Or Areas. Commits: `5fc0ad389a` (implementation) and `d62efda0ff` (baseline fix of one projects test's timing window, TESTING.md rule 9); rebuilt in IR-002 as `e16d848e0f` and `9457972953` (CR-004).
- Local validation and result: handoff § Checks Run (IMP-02 … IMP-08).
- Next recipient or routing: `/software_engineering_team/code_reviewer` (Large / High).
- Remaining limitations or risks: handoff § Known Risks; Electron shell, Docker node and E2E not run (API/E2E).

### IR-002 — CRR-001 local fixes

- Triggering role, report path, and round: code reviewer, `/Users/normy/autobyteus_org/autobyteus-worktrees/one-nodes-tab/tickets/in-progress/one-nodes-tab/code-review-report.md`, CRR-001 (Fail).
- Triggering finding IDs: CR-001, CR-002, CR-003, CR-004
- Classification: `Local Fix`
- Prior authoritative result: IR-001, code review Fail.
- Current authoritative result: all four findings fixed; classification Large / High unchanged; returned for the targeted delta review.
- Related solution revision IDs: `SR-007`
- Related architecture-review revision IDs: `ARCH-REV-003`
- Related code-review revision IDs: `CRR-001`
- Related API/E2E revision IDs: `N/A`
- Related delivery revision IDs: `N/A`
- Why this implementation revision is recorded: the code review's local fixes.
- Approved behavior or requirement IDs affected: none changed; TR-702/704/705/711/712 paths restructured without behavior change.
- Implementation delta:
  - CR-003: new `services/nodeCollaboration/windowNodeCollaborationConnector.ts` (the connector's wiring). `nodeListStore` owns rename and change address through the connector, each row's unfinished step and `changeSubjectOf`; `nodeChangeDialogStore` depends on the list only; `addNode` returns `confirm` and `AddNodePanel` opens the dialog; `NodeList` cancels the dialog on unmount.
  - CR-002: `planChangeAddress` → `[changeAddressHere(address)]`.
  - CR-001: `remoteCollaborationStore.loaded`/`loadError` removed; `load()` throws on failure; `nodeListStore.open` tolerates it.
  - CR-004: commits rebuilt (`9457972953` baseline test only; `e16d848e0f` implementation with the removals; `780e846d4a` docs), trees unchanged.
- Changed files or areas: `autobyteus-web/stores/{nodeListStore,nodeChangeDialogStore,remoteCollaborationStore}.ts`, `services/nodeCollaboration/{windowNodeCollaborationConnector,nodeCollaborationConnector,nodeChangePlan}.ts`, `components/settings/nodes/{AddNodePanel,NodeList,NodeConnectionDetails}.vue`; specs: new `stores/__tests__/nodeChangeDialogStore.spec.ts`, `components/settings/nodes/__tests__/AddNodePanel.spec.ts`; updated list-store, connector, row and remote-store specs. Commit `23f3feb193`.
- Local validation and result: IMP-09 (web suite 4733 passed), IMP-10 (guards), IMP-11 (rendered re-check on fresh test-owned servers). No server or Electron code changed, so IMP-02/03/06 stand.
- Next recipient or routing: `/software_engineering_team/code_reviewer` (targeted delta review), then API/E2E.
- Remaining limitations or risks: as IR-001.

### IR-003 — CR-005: the taken name on the row's "not finished" line

- Triggering role, report path, and round: code reviewer, failure-origin review CRR-003 (`code-review-report.md`), of API/E2E API-REV-001 (API-07 / NP-07; evidence `evidence/api-e2e/API-07-remote-nodes-page-run4/`).
- Triggering finding IDs: CR-005
- Classification: `Local Fix`
- Prior authoritative result: IR-002, code review CRR-002 Pass; API/E2E NP-07 Fail.
- Current authoritative result: fixed; classification Large / High unchanged.
- Related solution revision IDs: `SR-007`
- Related architecture-review revision IDs: `ARCH-REV-003`
- Related code-review revision IDs: `CRR-003`
- Related API/E2E revision IDs: `API-REV-001`
- Related delivery revision IDs: `N/A`
- Why this implementation revision is recorded: after a register step was refused with `PEER_NAME_TAKEN`, the row line read "mu already has a node named ." because the partial line did not carry the step's name (the dialog and the details passed it).
- Approved behavior or requirement IDs affected: § Naming Rule 4, VIS-015 (REQ-706 row line).
- Implementation delta: `RowLine.stepName` set from the unfinished step in `stores/nodeRowStatus.ts`; `components/settings/nodes/NodeRow.vue` passes it to `failureText`.
- Changed files or areas: `autobyteus-web/stores/nodeRowStatus.ts`, `autobyteus-web/components/settings/nodes/NodeRow.vue`, `NodeRow.spec.ts`, `nodeRowStatus.spec.ts`. Commit `02fd7bcd9a`.
- Local validation and result: IMP-12 (web suite 4736 passed), IMP-13 (guards).
- Next recipient or routing: `/software_engineering_team/code_reviewer` (targeted delta review), then API/E2E reruns the web suite and API-07.
- Remaining limitations or risks: as IR-001.
