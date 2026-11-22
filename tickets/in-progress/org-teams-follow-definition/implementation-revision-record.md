# Implementation Revision Record

The current code and `implementation-handoff.md` are authoritative. This record keeps the initial baseline and each later implementation round.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Architecture Reviewer, `design-review-report.md` (ARCH-REV-005 pass on SR-010; ARCH-REV-007 pass on the storage contract, SR-011/SR-012) | N/A (residual notes addressed) | `Initial Baseline` | SR-010, SR-011, SR-012, ARCH-REV-005, ARCH-REV-007 | Implemented; handed to Code Review |

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
