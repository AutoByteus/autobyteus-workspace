# Implementation Revision Record — unified Team/Org run-history catalog policy

The current code and `implementation-handoff.md` are authoritative. This record indexes implementation rounds, not independent validation.

## Revision Index

| Revision ID | Triggering role / report / round | Finding IDs | Classification | Related revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Architecture Reviewer / `design-review-report.md` / initial implementation after ARCH-REV-002 | N/A; DR-001 resolved upstream | Initial Baseline | SR-001–004; ARCH-REV-001–002; CRR/API-REV/delivery N/A | Historical initial implementation handoff |
| IR-002 | Architecture Reviewer / SR-005 / ARCH-REV-003 after API-REV-001 and CRR-002 | F-001; CR-001 | Design-correction implementation | SR-005; ARCH-REV-003; CRR-001–002; API-REV-001; delivery N/A | Rework complete for independent source review |

## Revision Entries

### IR-001 — Shared index-authoritative catalog and inactive-history mutation baseline

- Triggering role, report path, and round: Architecture Reviewer, `/Users/normy/autobyteus_org/autobyteus-worktrees/unify-agent-team-org-history-policy/tickets/in-progress/unify-agent-team-org-run-history-policy/design-review-report.md`, ARCH-REV-002 Pass; initial implementation round.
- Triggering finding IDs: N/A. DR-001 was resolved in SR-004/ARCH-REV-002 before implementation.
- Classification: Initial Baseline; `task_size=Medium`, `architectural_risk=High` confirmed.
- Prior authoritative result: N/A.
- Current authoritative result: Implementation complete at code commit `b68847a8c`, ready for independent source review; not API/E2E passed.
- Related solution revision IDs: SR-001–SR-004, approved behavior baseline SR-002.
- Related architecture-review revision IDs: ARCH-REV-001–002.
- Related code-review, API/E2E, and delivery revision IDs: N/A.
- Why this baseline is recorded: First completed implementation of the approved Team/Org index-authority policy and the reviewed DR-001 manager-lane correction.
- Approved behavior/requirement IDs affected: BEH-001–004, REQ-001–007, AC-001–005, SCN-001–004.
- Implementation delta: Added family-keyed index-only catalog state/queue, admitted immutable query snapshots and first-summary policy; rewired Team and Org lifecycle catalogs; removed Org read-time tree reconciliation/pre-create initialization and obsolete Team diagnostic adapter; placed Team archive/unarchive/delete under the exact-root manager lane with archive compensation and delete verification; added offline/local dry-run-first missing-row repair, strict stores, backup/verification; retained isolated migration writers and invalidated catalog state at the Org family migration boundary.
- Changed areas: `autobyteus-server-ts/src/run-history/{services,store,maintenance}`, Team manager, Org run service, mixed-history consumer, Team memory stub, Org migration transition, repair script/docs and focused tests. The unmerged Org root memory-source file is not present on this base and was not invented or cherry-picked.
- Local validation: TypeScript build configuration typecheck passed; 14 focused unit/narrow-integration files, 82 tests passed; a final three-file summary-policy rerun, 20 tests passed; built repair CLI `--help` and isolated owned-profile dry-run passed. An initial migration fixture failure from a missing newly released token column was corrected by updating only the test fixture's applied migration list, then its 11 tests passed.
- Next recipient/routing: Code Reviewer, because `Medium` + `High` retains independent source review.
- Remaining limitations/risks: Independent API/E2E validation not performed here; Org memory-source integration is conditional on the separate unmerged branch landing; explicit repair cannot recreate already-lost index-only summary/termination facts and requires acknowledgement for a wholly missing index.

### IR-002 — Current Team imported-Memory same-snapshot location projection

- Triggering role, report path, and round: Architecture Reviewer ARCH-REV-003 Pass on SR-005, following API/E2E `api-e2e-execution-coverage-report.md` API-REV-001 Fail and Code Reviewer `code-review-report.md` CRR-002 Fail — Design Impact, all in this ticket directory.
- Triggering finding IDs: API-REV-001 F-001; CRR-002 CR-001. DR-001 remains resolved upstream.
- Classification: Design-correction implementation / Local Fix against revised authoritative design; `task_size=Medium`, `architectural_risk=High` confirmed.
- Prior authoritative result: IR-001 implementation was source-reviewed at CRR-001, then API-REV-001 failed AC-003; CRR-002 routed the failure to Solution Designer. The former pass is historical and does not validate this revision.
- Current authoritative result: Current Team Memory path corrected at code commit `49ce0d173` under SR-005/ARCH-REV-003; ready for new independent source review, not yet API/E2E passed.
- Related solution revision IDs: SR-005; approved requirements remain SR-002.
- Related architecture-review revision IDs: ARCH-REV-003 (current Pass); ARCH-REV-001–002 historical.
- Related code-review revision IDs: CRR-001 historical Pass; CRR-002 current failure-origin Fail pending this correction.
- Related API/E2E revision IDs: API-REV-001 Fail / F-001; rerun pending.
- Related delivery revision IDs: N/A.
- Why this revision is recorded: AC-003 applies now to the current imported Team Memory path; its per-root unscoped member-location lookup reread every stored tree, producing 12 reads for three admitted roots after readiness.
- Approved behavior/requirement IDs affected: BEH-003, REQ-001/005, AC-003, SCN-003, DS-004. No approval change, index authority change or persisted-data transition.
- Implementation delta: `TeamMemoryExplorerService.buildGroups()` passes its already-read validated tree to `TeamMemoryMemberTargetBuilder.buildFromTree`; `AgentMemoryLocationService.listTeamMemberLocationsFromTree` checks exact root identity, reuses `matchesTeam`, and maps a pure `TeamRunExecutionTreeLocationService.listAgentsInTree` projection through the existing `TeamExecutionIndex`/physical-path owner. Removed the explorer's unscoped per-root lookup; general location APIs remain for independent callers. Mismatched roots follow the existing safe-read skip path.
- Changed files/areas: four source files in `agent-memory/services` and `run-history/services`, plus focused Team Memory explorer and agent-memory location unit tests. The two E2E harness edits from API-REV-001 were already present in the shared worktree and are not claimed as this implementation delta.
- Local validation: TypeScript build-config typecheck passed; focused Team Memory/location tests passed (7 tests). The added test explicitly rebuilt readiness before spying on the tree store, exercised Team list and Team-run list separately with fresh service objects, asserted one tree read for each of the two admitted roots per request, and compared real SHA-256 hashes for every fixture file before/after each request. Location parity test preserved configured/task/nested physical paths and proved no additional store read from the tree-scoped method. These are implementation-scoped checks, not API/E2E sign-off.
- Next recipient/routing: Code Reviewer under the unchanged Medium/High route.
- Remaining limitations/risks: API-REV-001 and CRR-002 remain Fail until fresh source review and independent API/E2E rerun. Org imported-memory adapter remains conditional on the separate unmerged branch. The prior L-03 hard-coded byte-identity flag is not used as proof; the new test computes actual hashes.
