# Implementation Revision Record

The current code and `implementation-handoff.md` are authoritative. This record keeps the initial baseline and each later implementation round.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Architecture Reviewer, `design-review-report.md` (ARCH-REV-005 pass on SR-010; ARCH-REV-007 pass on the storage contract, SR-011/SR-012) | N/A (residual notes addressed) | `Initial Baseline` | SR-010, SR-011, SR-012, ARCH-REV-005, ARCH-REV-007 | Implemented; handed to Code Review |
| IR-002 | Architecture Reviewer, `design-review-report.md` ARCH-REV-009 (pass on SR-013/SR-014, after CRR-001) | CR-001 (Design Impact via SR-013 R-8, SR-014), CR-002, CR-003, CR-004 (Local Fix), N-1 | `Design Impact` realization + `Local Fix` | SR-013, SR-014, ARCH-REV-009, CRR-001 | Implemented; handed to Code Review |
| IR-003 | Code Reviewer, `code-review-report.md` CRR-002 (review of IR-002) | CR-005, CR-006, CR-007, CR-002 (remaining) | `Local Fix` | CRR-002 | Implemented; handed to Code Review |
| IR-004 | Code Reviewer, `code-review-report.md` CRR-004 (failure-origin review of API-REV-001); Architecture Reviewer ARCH-REV-010 (pass on SR-015) | F-1, F-2, F-3, F-4 (Local Fix); A-1 (via SR-015) | `Local Fix` + `Design Impact` realization | CRR-004, API-REV-001, SR-015, ARCH-REV-010 | Implemented; handed to Code Review |
| IR-005 | Code Reviewer, `code-review-report.md` CRR-006 (failure-origin review of API-REV-002) | F-5 | `Local Fix` | CRR-006, API-REV-002 | Implemented; handed to Code Review |
| IR-006 | Architecture Reviewer, `design-review-report.md` ARCH-REV-013 (pass on SR-016..SR-018, after delivery DR-001) | DR-001, AR-011, AR-012 | `Design Impact` realization | SR-016, SR-017, SR-018, ARCH-REV-011..013, DR-001 | Implemented; handed to Code Review |

## Revision Entries

### IR-001 — Org teams follow their definitions: the Org as a container of runs (initial implementation)

- Triggering role, report path, and round: Architecture Reviewer; `tickets/in-progress/org-teams-follow-definition/design-review-report.md`; ARCH-REV-005 (pass, residual notes) and ARCH-REV-007 (pass, storage contract).
- Triggering finding IDs: N/A.
- Classification: `Initial Baseline`.
- Prior authoritative result: N/A.
- Current authoritative result: commits `1c77d18f56` … `b324211623` (slices 1 … 4), `f69004e722` (slices 5 … 7) and the slice 8 commit (docs, handoff, evidence) on `codex/org-teams-follow-definition`.
- Related solution revision IDs: SR-010, SR-011, SR-012.
- Related architecture-review revision IDs: ARCH-REV-005, ARCH-REV-007.
- Related code-review revision IDs: N/A.
- Related API/E2E revision IDs: N/A.
- Related delivery revision IDs: N/A.
- Why this baseline is recorded: first implementation of the reviewed design and storage contract.
- Approved behavior or requirement IDs affected: REQ-001 … REQ-009; AC-001 … AC-008; DS-001 … DS-007; DEC-001 … DEC-006; R-1''' (address boundary), R-3'' (composition), R-6 (net notice), R-7 (REST edges); contract §1 … §12.
- Implementation delta, by slice:
  1. `containedIn` on Team and agent runs; the container file type and schema; units created through their own run services; Stop and reopen.
  2. The container directory, the one `OrgContainerPort`: container step 2 for unit runs, `same_container` cross-run delivery with `counterpart` on both lines, the Team unit's address boundary (`ContainedTeamAddressSpace`), Org rules merged into unit rules, the delegation origin is the unit run.
  3. The Org view composition (synchronous relay, snapshot at the base), the live container and command routing, creation switched to containers, rows, history, member views, memory attribution and sync exclusion, stopped-Org settings, the REST edges.
  4. The Org hosting machinery removed; the manager and readers are containers-only.
  5. Migration `20261122_agent_org_units_own_runs_v1` and its follow-ups:
     - 18 follow-ups;
     - the classification test;
     - fixtures of every released shape;
     - unit logs rotated;
     - agent units in today's activation state.

     Stored Orgs' rows and participants read through their units (`prepare`). Existing tests that run the production registry, or its later chain, now end with converted Orgs.
  6. The Org follows its Org definition:
     - the pure planner, the definition view and the listener, with a follow on reopen;
     - a committed change creates units first, then writes the file;
     - a removed unit that is running is marked leaving and released once it stopped;
     - the former unit's address is refused by name;
     - Org rules are filtered by member presence, with one net notice;
     - the web shows the Leaving tag on Org rows.
  7. FU-003: the signed `/rest/remote/peer-run-members` request, the receiver and the Task entry update on the delegating node, the notice from a peer-started Team root, and reconcile from run summaries.
  8. Docs (collaboration model, agent_orgs, agent_memory, agent_team_execution, glossary), the release notes draft, and the built-server Org follows e2e.
- Decisions recorded for review: the agent unit's activation state (contract §4), rotated unit logs (contract §5), the leaving unit's lifecycle, and the unchanged notice header for Org agents (see the handoff).
- Validation: see `implementation-handoff.md` § Validation Evidence and `evidence/implementation/ir-001/`.

### IR-002 — Step 2 and relation of runs delegated by an Org unit; CRR-001 Local Fixes

- Triggering role, report path, and round: Architecture Reviewer, `design-review-report.md` ARCH-REV-009 (pass on SR-013 R-8 and SR-014), which resolves the code reviewer's `code-review-report.md` CRR-001 CR-001; CRR-001's Local Fixes CR-002 … CR-004 and note N-1 in the same round.
- Triggering finding IDs: CR-001, CR-002, CR-003, CR-004, N-1.
- Classification: `Design Impact` (realized as designed) + `Local Fix`.
- Prior authoritative result: IR-001 (commits `1c77d18f56` … `46e53e9ed0`).
- Current authoritative result: the IR-002 commit on `codex/org-teams-follow-definition` (see `implementation-handoff.md` § IR-002).
- Related solution revision IDs: SR-013, SR-014. Related architecture-review revision IDs: ARCH-REV-009. Related code-review revision IDs: CRR-001.
- Approved behavior or requirement IDs affected: preserved boundary "delegation from Org units" (BEH-001, S-08); contract §2.3 step 2, §5, §6, §9, §10.
- Implementation delta:
  - step 2 of a run whose assigner is a unit run (or the container itself) is that container's placements at Org addresses;
  - a delegated run's messages to its container's units, and a unit's to such a run, are related (restored when stopped, no `counterpart`), decided after `same_container` and before the Task rule;
  - dead released-tree history branches and two orphaned hosting modules are removed (tests moved to stored containers; M-15 withdrawn);
  - the agent catalog's state moved to its own file (≤ 500 effective lines);
  - a doc comment is moved back;
  - two deviations are recorded with their reasons.
- Validation: see `implementation-handoff.md` § IR-002 and `evidence/implementation/ir-002/`.

### IR-003 — CRR-002 Local Fixes

- Triggering role, report path, and round: Code Reviewer, `code-review-report.md` CRR-002 (Fail; all open findings Local Fix).
- Triggering finding IDs: CR-005, CR-006, CR-007, CR-002 (remaining).
- Classification: `Local Fix`.
- Prior authoritative result: IR-002 (`5545e20f3a`). Current authoritative result: the IR-003 commit (see `implementation-handoff.md` § IR-003).
- Related code-review revision IDs: CRR-002.
- Implementation delta:
  - the container-chain relation applies only while the delegated run's Task entry is open, so a closed delegation is continued by its assigner again;
  - the relation moved to `container-chain-relation.ts`;
  - the FU-003 receiver has its own Task-side port (the projects boundary holds);
  - the unused live Org tree store is deleted, with its test imports and store-only cases, which now check through the schema.
- Validation: see `implementation-handoff.md` § IR-003.

### IR-004 — CRR-004 Local Fixes; SR-015 former-member refusal for other units

- Triggering role, report path, and round: Code Reviewer, `code-review-report.md` CRR-004 (failure-origin review of API/E2E's API-REV-001), with Local Fixes F-1 … F-4; its A-1 went to the Solution Designer, became SR-015 (DEC-007) and was passed by ARCH-REV-010 (`design-review-report.md`).
- Triggering finding IDs: F-1, F-2, F-3, F-4; A-1 (SR-015).
- Classification: `Local Fix` + `Design Impact` (realized as designed).
- Prior authoritative result: IR-003 (`1f0aad498b`). Current authoritative result: the IR-004 commit (see `implementation-handoff.md` § IR-004).
- Related solution revision IDs: SR-015. Related architecture-review revision IDs: ARCH-REV-010. Related code-review revision IDs: CRR-004. Related API/E2E revision IDs: API-REV-001.
- Approved behavior or requirement IDs affected: AC-002 (leaving member shown), REQ-006 (rows, view, listing), REQ-005 (stopped-Org settings, restore), REQ-009 / DEC-007 (refusal by name).
- Implementation delta:
  - a Team unit's leaving member stays in the Org view, rows and composition while its run is live: one owner, `teamUnitMembersInOrg`;
  - Org units are not listed as started by a person;
  - `launchSource` survives a stopped Org's mixed save;
  - a Team package with a former member's cross-unit lines validates, and its records source keeps them; the remote receiver logs why a root was unavailable;
  - `OrgContainerPort.formerMemberAt` lets `CollaborationTree.resolve` refuse `P/x` by name, answered from the Team's live or stored tree without a restore.
- Validation: see `implementation-handoff.md` § IR-004 and `evidence/implementation/ir-004/`.

### IR-005 — CRR-006 Local Fix F-5

- Triggering role, report path, and round: Code Reviewer, `code-review-report.md` CRR-006 (failure-origin review of API/E2E's API-REV-002, OC-13).
- Triggering finding IDs: F-5.
- Classification: `Local Fix`.
- Prior authoritative result: IR-004 (`cd6a777b24`). Current authoritative result: the IR-005 commit (see `implementation-handoff.md` § IR-005).
- Related code-review revision IDs: CRR-006. Related API/E2E revision IDs: API-REV-002.
- Approved behavior or requirement IDs affected: REQ-004 / DEC-005 (a rule to a member that left is kept and left out until it returns), REQ-009 (the Org follows its Org definition), DS-006.
- Implementation delta:
  - `compileOrg` takes an opt-in `running_org` compilation that keeps an endpoint `P/x` whose member is not in mounted Team `P`'s current definition;
  - only the Org-follow planner (`viewFor`, and so the follow on reopen) uses it;
  - launches and every other caller stay strict.
- Validation: see `implementation-handoff.md` § IR-005 and `evidence/implementation/ir-005/`.

### IR-006 — SR-016 re-integration with the base; SR-017 typed path rewrite; SR-018 gating

- Triggering role, report path, and round: Architecture Reviewer, `design-review-report.md` ARCH-REV-013 (pass on SR-016, SR-017, SR-018), after delivery `release-deployment-report.md` DR-001 (integration blocked by autobyteus-587 and -599).
- Triggering finding IDs: DR-001 (SR-016), AR-011 (SR-017), AR-012 (SR-018).
- Classification: `Design Impact` (realized as designed).
- Prior authoritative result: IR-005 (`cfc4bc67f2`). Current authoritative result: merge `21622d75e9` and the IR-006 commit (see `implementation-handoff.md` § IR-006).
- Related solution revision IDs: SR-016, SR-017, SR-018. Related architecture-review revision IDs: ARCH-REV-011, ARCH-REV-012, ARCH-REV-013. Related delivery revision IDs: DR-001.
- Approved behavior or requirement IDs affected: BEH-001..BEH-006, REQ-007 / AC-006 (conversion, including 587's received-file references); contract §1, §7, §9, §10.
- Implementation delta:
  - `origin/personal` `f2c0d2a902` merged: the base's 587/599 behavior reaches units through their own roots, and the Org-hosting additions are not ported;
  - `LiveAgentOrgContainer.remoteNodeOf()` returns null;
  - the conversion moves stored typed paths into renamed folders with one node pass (`org-path-rewrite.ts`);
  - the container file is written last, after that pass;
  - the path writer predecessors wait and have follow-ups whose pass also covers converted Orgs.
- Validation: see `implementation-handoff.md` § IR-006 and `evidence/implementation/ir-006/`.
