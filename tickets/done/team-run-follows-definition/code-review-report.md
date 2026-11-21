# Code Review Report

## Review Round Meta

Latest round (round 6, `CRR-006`): **Implementation Review** of IR-004 (the CR-004 Local Fix). The round-5 delta review below holds the CR-003 trace and the reader table this result relies on. The round-3 full re-audit is the structural baseline.

- Review Entry Point (round 6): `Implementation Review`
- Current Code Review Revision ID: `CRR-006`
- Current Review Round: `6`
- Review Scope: `Targeted Delta Review`
- Review Scope Evidence: `9b0705a8ef..6c7af4a384` touches only CR-004's two files (`team-member-run-view-projection-service.ts` +4/−16; `team-run-execution-tree-location-service.ts` +2/−1), one test (−5) and evidence. No behavior, spine, interface or new-file change. Unaffected checks carry forward.
- Trigger: implementation engineer, IR-004 (commit `6c7af4a384`)
- Check reused, not rerun: IMP-22, read in `evidence/IMP-22-cr004-typecheck-tests.log`. Typecheck: production 0 errors, tests 1005 in 314 files (baseline). 96 files, 661 tests passed, including the CR-003 cases.

### CR-004 recheck

| Item | Evidence | Status |
| --- | --- | --- |
| `LocatedTeamAgentExecution.configuredPlacement` non-null, documented as the agent's own stored node | `team-run-execution-tree-location-service.ts:20-21` | Done |
| Unreachable "no configured launch placement or recorded source" throw removed | `requireLocation` returns `tagTeamAgentExecution(found)` | Done |
| `!` removed; `metadataFor` reads `location.configuredPlacement` | `:140-153` | Done |
| One derivation: `platformAgentRunId` from the same node; `ownNodeOf` and its second index removed; unused `locatedExecutionSource` import removed | diff; `TeamExecutionIndex` is still used by `senderAddresses` | Done |
| Stale test removed: it built `configuredPlacement: null`, which the type no longer allows | `team-member-run-view-projection-service.test.ts`. The remaining `configuredPlacement: null` fixtures are Org locations (`agent-org-execution-tree-location-service.test.ts:88`, `run-folder-discovery.test.ts:49`), whose type stays nullable. | Correct |

**CR-004: Resolved.**

### Candidate gate (round 6)

| Candidate ID | Observation | Scenario / Contract | Evidence | Disposition | Reason |
| --- | --- | --- | --- | --- | --- |
| C-18 | `run-folder-discovery.ts` `teamMembers` keeps `placement?.` / `?? null` on a value that is now non-null, and `agent-memory-location.ts` keeps a nullable `configuredPlacement` | Principle 7 (touched files) / Principle 11 | Neither file is touched by this ticket's IR-003/IR-004 delta. The optional chains are no-ops on a non-null value. The agent-memory type is a separate domain projection declared beside its Org twin. | Reject | Not in touched files. No reachable branch with behavior, and no consequence. Tightening them is a type-only nicety, not a follow-up. |

### Round-6 score revalidation (other categories as in round 5 / CRR-003)

- Shared-Structure / Data-Model Tightness: 9.0 → **9.4**. The team location type now says what the code guarantees, and there is one derivation of the member's node.
- Cleanup Completeness: 8.8 → **9.4**. The dead branch, the assertion, the second index, the unused import and the stale test are removed.
- Overall: 9.4/10 (simple average). Every category is ≥ 9.3.

Round 5 details follow.

Latest round (round 5, `CRR-005`): **Implementation Review** of IR-003 (the CR-003 Local Fix). The round-3 full re-audit below (`CRR-003`) stays as the structural baseline. Round 4's failure-origin record (CR-003) is in `code-review-revision-record.md` CRR-004.

- Review Entry Point (round 5): `Implementation Review`
- Current Code Review Revision ID: `CRR-005`
- Current Review Round: `5`
- Review Scope: `Targeted Delta Review`
- Review Scope Evidence: the changes since round 4 (`3d8e53cf0c..072bdb7217`) stay within CR-003's files and behavior:
  - `team-run-execution-tree-location-service.ts` (`toLocation`, +3/−2);
  - `team-member-run-view-projection-service.ts` (`ownNodeOf`, `metadataFor`, +7/−1);
  - one test file;
  - evidence.

  No spine, shared interface or data shape changes, and no new files. Unaffected checks and scores carry forward from CRR-003. CR-003 is rechecked first, then the delta, then the readers of the changed field (Principle 11).
- Trigger: implementation engineer, IR-003 (commit `072bdb7217`; the first handoff named `74a7ce4c7c` in error, corrected by the engineer)
- Implementation Handoff / Revision Record Reviewed: `implementation-handoff.md` (IR-003 summary, trace row, IMP-18..IMP-21), `implementation-revision-record.md` (IR-003)
- Checks reused, not rerun (the code they exercise is unchanged since they ran):
  - IMP-18 typecheck at baseline;
  - IMP-19 96 files / 662 tests;
  - IMP-20 TF suite 12/12, with `TF-03.json` `openedProjection: "ok"` and `openedFileChanges: "ok"`;
  - IMP-21 rendered probe, real Codex: `TFU-04-observed.approvalShown: true`, `ran: true`, `approvedByStream: []`, row released.

  I read the values in the evidence files themselves, not only the handoff.

### CR-003 recheck (scenario traced from its real trigger)

Scenario SCN-003a: the user opens a "Leaving" row to answer the member's pending approval. Path read:
1. The row's `openTarget` (`{ runKind: "agent_team", runId, agentRunId }`, `run-tree-view.ts`) leads to the web member open.
2. GraphQL `getTeamMemberRunProjection` / `getTeamMemberFileChanges` call `TeamMemberRunViewProjectionService.requireLocation` (`:128-141`).
3. That calls `TeamRunExecutionTreeLocationService.findAgent` → `findInTree` (former members included by run ID) → `toLocation` (`:184-206`). `configuredPlacement` is now the located agent's own stored node (`agent.source`, `leaving` stripped).
4. `locatedExecutionSource` is non-null, so `metadataFor` builds the metadata with the member's own launch and provider binding, and the projection loads.

The rendered result: IMP-21 TFU-04 (real Codex) shows the member focused with its pending `run_bash` and Approve/Deny; approving ran the command and the row was released. A stopped former member opens by run ID too (unit test, REQ-002). The swap case (another member now at the same address) gets its own node, not the current member's (unit test). **CR-003: Resolved.**

### Readers of the changed field (`configuredPlacement` of a team location; Principle 11)

| Reader | Effect of the change | Verdict |
| --- | --- | --- |
| `TeamMemberRunViewProjectionService` (`requireLocation`, `metadataFor`) | Opens leaving and former members | Intended (CR-003) |
| `RunFileChangeProjectionService` (`locatedLaunchConfiguration` → workspace) | A former member's file changes resolve against its own workspace | Intended |
| `run-folder-discovery.ts:205-217` (memory page, search, episodic catalog) | A former member gets its own runtime kind, workspace and agent-definition attribution (was `null` since IR-001) | Consistent with REQ-002 (its memory stays readable and attributed) |
| `collaboration-member-memory-targets.ts:62`, `agent-memory-location-service.ts:107,117` | Former member's `agentDefinitionId` is now set | Same |
| Current members | `agent.source` is the same node `getConfiguredPlacement(address)` returned before (one member per address in `members`) | Unchanged |

No reader uses a non-null `configuredPlacement` to grant an action (start, input, delete), so no removed member becomes addressable through this change.

### Candidate Finding And Mechanism Gate (round 5)

| Candidate ID | Observation | Scenario / Contract | Evidence | Disposition | Scope | Reason / Proportionate Response |
| --- | --- | --- | --- | --- | --- | --- |
| C-15 | `requireLocation`'s `if (!locatedExecutionSource(location)) throw … "has no configured launch placement or recorded source"` can no longer run: `toLocation` is the only constructor of a team location (`grep "configuredPlacement:"`: team `:202` only) and now always sets it. `metadataFor`'s `!` asserts the same. | Principle 7 (a branch that can never run, in a touched file; holds in every context) | `team-run-execution-tree-location-service.ts:184-206`; `team-member-run-view-projection-service.ts:137-139,152` | Promote | This ticket | Remove the dead branch and the assertion. Tighten `LocatedTeamAgentExecution.configuredPlacement` to non-null (the Org location keeps its nullable field) so the type says what the code guarantees. |
| C-16 | `ownNodeOf` builds a second `TeamExecutionIndex` to find the member's node again. `metadataFor` already holds that node as `source`, the location's own stored node, which carries `platformAgentRunId`. | Principle 11 (each fact derived by one owner) | `team-member-run-view-projection-service.ts:144-148,164` | Promote | This ticket | One derivation: use `source.platformAgentRunId` and remove `ownNodeOf`. Concrete problem: two places choosing "the member's node" by different rules is exactly how CR-003 arose (the location picked by address, `metadataFor` by `getAgent`). A second derivation can drift again. |
| C-17 | Memory-page attribution of former members changes from `null` to their agent definition | REQ-002 | Reader table above | Reject | — | Approved behavior, an improvement |

### CR-004 — dead null branch and a second derivation of the member's node, left by the CR-003 fix

- Evidence: C-15 and C-16 above. Both were created by this change: the fix made the null case impossible and added `ownNodeOf`.
- Required action (implementation decides the exact shape):
  - make `configuredPlacement` non-null on `LocatedTeamAgentExecution`;
  - remove the unreachable throw in `requireLocation` and the `!` in `metadataFor`;
  - take `platformAgentRunId` from `source` and remove `ownNodeOf`.

  No behavior changes. The CR-003 tests (`team-run-former-member-location.test.ts`) and the typecheck should stay green.
- Classification: `Local Fix`, implementation engineer.
- API/E2E impact: none on behavior. API/E2E can rerun TF-03, TFU-03 and TFU-04 on the commit that includes this cleanup.

### Round-5 score revalidation (other categories carried from CRR-003)

- Runtime Correctness And Behavioral Fidelity: 8.8 → **9.4**. CR-003 is resolved and proven in the rendered app with real Codex.
- API/E2E Readiness: 9.1 → **9.4**. TF 12/12 and TFU-01..06 pass on the built server.
- Shared-Structure / Data-Model Tightness: 9.4 → **9.0**. The team location type's `| null` no longer describes any value, and the member's node is derived twice (C-15, C-16).
- Cleanup Completeness: 9.5 → **8.8**. A dead branch in a touched file (C-15).
- Overall: 9.3/10 (simple average). Two categories are below 9.2, so the round does not pass cleanly.

Round 3 meta follows.

- Review Entry Point: `Implementation Review`
- Requirements Doc Reviewed As Context: `requirements-doc.md` (Approved; REQ-001..REQ-009, AC-001..AC-010, DEC-001..DEC-009)
- Investigation Notes Reviewed As Context: `investigation-notes.md`, through the design's citations
- Solution Revision Record Reviewed As Context: `solution-revision-record.md` (through SR-010)
- Design Spec Reviewed As Context: `design-spec.md` (SR-010; diff read against SR-008: DS-004, DS-007, D-INVALID, Member States, Interface Boundary Mapping, file mapping, Guidance)
- Supplemental Task Artifacts Reviewed As Context: `follow-ups.md` (FU-001..FU-004); design § Exact Texts
- Relevant Solution Revision IDs: SR-008, SR-009, SR-010
- Design Review Report Reviewed As Context: `design-review-report.md` (round 4, ARCH-REV-004 Pass; notes N-12, N-13, N-14)
- Architecture Review Revision Record Reviewed As Context: `architecture-review-revision-record.md` (ARCH-REV-003 Fail, ARCH-REV-004 Pass)
- Implementation Handoff Reviewed As Context: `implementation-handoff.md` (IR-002; Checks Run IMP-10..IMP-17)
- Implementation Revision Record Reviewed As Context: `implementation-revision-record.md` (IR-002)
- Relevant Implementation Revision IDs: IR-001, IR-002
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-003`
- Current Review Round: `3` (round 1 implementation review CRR-001; round 2 failure-origin CRR-002)
- Review Scope: `Full Re-Audit`
- Review Scope Evidence (round >1): IR-002 changes the data-flow spine (a new persisted `leaving` marker written under the lock, and a new release step owned by the committer), shared interfaces and data shapes (`TeamRunBackend`, `ActiveRootMessageBoundary.ownsAgentRun`, `FormerMemberExecutionNode`, `RunTreeRowDto.leaving`, `RunTreeSources.isLiveTeamRun`, `ChildRowRecord`), and files beyond CR-001/CR-002 (router, run-tree records and view, own-agents reader, composition, schema, planner, web rows). So all structural checks and the full scorecard are rerun. For files IR-002 did not change, the evidence is carried from CRR-001.
- Trigger: implementation engineer, IR-002 ready (design SR-010, CR-001, O-1, O-2, C-07)
- Prior Review Round Reviewed: CRR-002 (failure-origin), CRR-001 (implementation)
- Latest Authoritative Round: 3

Code reviewed: worktree `/home/autobyteus/workspace/.codex/worktrees/team-run-follows-definition`, branch `codex/team-run-follows-definition`, `git diff 443f1c2c0f..64a4b6100c` (`d005fa2a5b` IR-002 code, tests, web, docs; `64a4b6100c` handoff, evidence, O-2 warn-once). 37 source files (+412/−438) and 31 test files (+460/−87).

## Routing Classification Review

- Task size: `Large`
- Architectural risk: `High`
- Selected route: `Implementation Review`
- Independent source review required by the classification: `Yes`
- Classification evidence or correction required: None. This round adds a persisted marker, a lock-ordered release step, a routing contract and a row contract.

## Review Scope

- Changed implementation and behavior reviewed:
  - the leaving marker (plan, clear, restore clear);
  - the release step (`memberStopped`) and the manager's stop-only role;
  - `TeamRunMembership` reading leaving from the tree;
  - member rows through `teamMemberRowsOf` for own and copy paths, with liveness from the active root directory;
  - unregister refreshing rows (N-13);
  - `ownsAgentRun` routing (CR-001);
  - planner O-1/O-2 and warn-once;
  - web Leaving tag on both row components;
  - `TeamMembersPanel.vue` removal (CR-002);
  - C-07.
- Code I read outside the diff to confirm the paths:
  - `team-run-persistence-coordinator.ts:80-160`: an indeterminate write latches fail-stop and returns `finalization_indeterminate`; a definite failure returns `not_committed`.
  - `configured-agent-execution-handle.ts:211-213`: `isStopped` means the run is inactive and no activation, readiness or configuration is pending.
  - `team-run-execution-tree-mutator.ts:31,88,132`: `mapAgent` returns the node or a spread of it, so `leaving` survives binding writes.
  - `global-agent-run-message-router.ts:77-140`.
- Explicit exclusions: the rendered TFU-03 rerun and the real-runtime TFL-02 rerun (API/E2E). I did not rerun IMP-10..IMP-17: the code they exercise has not changed since they ran (IMP-17 ran the API/E2E TF suite 10/10 on the built server), and no finding needs a new check.

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: unchanged from CRR-001. SR-010 changes how leaving is carried (a stored marker, live-only) and where it is shown (run-tree rows), in line with DEC-002, REQ-008 and AC-003.
- Design-spec behavior map verified against the implementation: Yes.
- Design review report and round confirmed: ARCH-REV-004 Pass; N-12, N-13 and N-14 implemented (below).
- Behavior-basis status: `Confirmed`
- Changed or newly discovered behavior: None
- Remaining material ambiguity: None

| Behavior ID | Status | Current Implementation Path And Lifecycle Evidence | Contradicting / New Evidence |
| --- | --- | --- | --- |
| DS-001 live follow | Confirmed | `TeamMembershipCommitter.follow` → `commit(plan)`. Under the lock, `prepareAgainstCurrent` reads `teamRun.liveExecutionIds()` synchronously (N-14; `FlatTeamExecutionManager.liveExecutionIds`: handles not stopped) and runs `planTeamMembershipChange(tree, view, live)` → write → `replaceTree` (tree, index, `membership.replace`) → `applied`. | — |
| DS-004 leaving / release (AC-003, DEC-002) | Confirmed | The plan writes `leaving: true` for removed members with a live execution and clears stale markers (`clearStoppedLeavingMarkers`). `applied` → `followMembership(change.leaving, memberStopped)`; non-leaving removed and released members get `removeStoppedHandle` (only when stopped). Manager `tryRetire` stops when quiet and calls `stopped`; it never retries once the team is inactive. `memberStopped`: if not admitting, nothing; else `commit(leavingReleaseChange)` (write → replace), then `removeStoppedHandle` for the member and every released one, even if it rejoined (N-12), then `runPartsChanged`, then the view event. A definite failure logs `TEAM_MEMBER_RELEASE_NOT_SAVED` and keeps the marker; the next plan clears it. An indeterminate write fail-stops through the coordinator. | — |
| DS-002 restore | Confirmed | `followStored` = plan with nothing live, else `leavingReleaseChange(tree, ∅)`, so markers are always cleared, even for a run whose definition is not followed or read. Manager writes, materializes, registers, `followedStored`, then a live follow. | — |
| DS-007 rows (REQ-008, AC-003, AC-009) | Confirmed | `RunOwnAgentsReader.ownTreeOf` lists members, then `leaving` former members marked `leaving`. `teamMemberRowsOf(members, isLive)` serves both `RunTreeView` paths (own rows; copy rows via `localChildRecord` → `ownTreeOf`, AR-009). `isLiveTeamRun` = active root directory `resolve(team root) !== null`. `RunTreeRowDto.leaving` (strict schema, optional literal). Web: `runTreeDisplayRows` passes `leaving`; `WorkspaceTeamExecutionTree` keeps it on own rows; both `WorkspaceStableExecutionRow` and `WorkspaceDelegatedRunRow` show the localized tag, and the row still opens (its `openTarget` is unchanged). Unregister calls `runPartsChanged` after leaving the directory when markers exist (N-13). | — |
| REQ-009 / AC-010 by run ID (CR-001) | Confirmed | Router asks `ownsAgentRun`, which is required and checked at registration. Team root: `hasAgentExecution` or `formerMemberByRunId`; Org and standalone roots: `hasAgentExecution`. `hasAgentExecution` is unchanged, so `placeOf` is unchanged (`active-root-place-of.test.ts`). The integration test asserts the run-ID refusal; IMP-17 ran TF-02/TF-03 through the tool on the built server. | — |
| REQ-007 / AC-007 (O-1, O-2) | Confirmed | `viewFor`: a missing definition, a load issue (`listLoadIssues`), an unusable graph, an unknown agent (allocator refusal) or an unaddable coordinator each → `notFollowed`, warned once per run and reason, and cleared when the definition is valid again. | — |
| Other behaviors (add, swap, rejoin, rules, notices, view snapshot) | Confirmed | Unchanged paths from CRR-001. Rejoin now strips the marker (`stopped(node)`). A rejoined member that was leaving is excluded from `released`. Notices skip release-only changes (`changesTheTeam`). | — |

## Supported Product Scenario And Reachability Gate (Mandatory)

Scenario table as in CRR-001 (SCN-001..SCN-006 and AC-004, all `Supported Normal`, except SCN-003 `Supported Explicit Edge`), plus the SR-010 scenarios the design names:

| Scenario ID | Related IDs | Kind | Actor / Initiator | Goal / Event | Entry Surface | Shape | Forward Path | Outcome | Evidence | Validity | Use |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-003a | AC-003, DEC-002, REQ-008 | User | User with a removed member waiting for approval | Reach it to approve | Workspaces run tree | Explicit Edge | rows from `ownTreeOf` + `teamMemberRowsOf` | Row tagged "Leaving", opens the member | CRR-002 F-2; TFL-02 | Supported Explicit Edge Scenario | Use |
| SCN-003b | AC-003, AR-007 | User/System | User stops the team, or the server restarts, while a member is leaving | No phantom leaving | Stop / restart | Explicit Edge | unregister `runPartsChanged`; restore clears markers | No leaving row outside a live run | design DS-004/DS-007 | Supported Explicit Edge Scenario | Use |
| SCN-010 | AC-010, REQ-009 | System | Agent messages a removed member by run ID | Clear refusal | `send_message_to(target_agent_run_id)` | Normal | router → `ownsAgentRun` → `deliverToRunId` | Exact refusal | CRR-002 CR-001 | Supported Normal Scenario | Use |

### Candidate Finding And Mechanism Gate

| Candidate ID | Observation Or Mechanism | Scenario / Contract | Independent Trigger | Forward Path / Consequence | Evidence | Disposition | Scope | Reason |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C-09 | A stopped member that rejoins between its stop and its release write might keep its stopped handle in the registry, so its next message would reach a stopped handle | DEC-007, N-12 | Definition re-adds the member while it is stopping | The plan excludes it from `released`, so `applied` does not remove the handle, but `memberStopped` always removes the stopped member's handle (N-12). Its next message creates a fresh handle in restore mode. | `team-membership-committer.ts` `memberStopped`; `team-membership-change.ts` `released` filter | Reject | — | Covered by N-12 |
| C-10 | A definite release-write failure leaves the marker while the handle is removed | DS-004 (designed) | Disk error | The row reads "Leaving" until the next plan heals it; own commands answer "not found". The design accepts this explicitly. | design DS-004 | Reject | — | Designed behavior |
| C-11 | `liveExecutionIds` counts an idle member with a handle as live, so it is written `leaving` | DS-004 ("a removed idle member with a live handle is written leaving and released at once") | Remove an idle, started member | `tryRetire` stops it at once, then the release write follows | design Guidance; manager unit test | Reject | — | Designed |
| C-12 | O-2 detection relies on the run-ID allocator refusing an unknown agent; an unknown agent whose launch is also refused is skipped as `TEAM_MEMBER_NOT_ADDED` instead of failing the whole definition | D-INVALID (O-2) | Definition with an unknown agent and a team launch that is unusable | Run unchanged for that member and logged. The outcome is equivalent for REQ-007 (no unusable member is added; a warning names it). | `team-membership-planner.ts` `viewFor` order | Reject | — | No consequence against REQ-007 |
| C-13 | The planner's per-run warn-once map is never cleared on run deletion | Engineering contract | Many deleted runs over a process lifetime | One short string per run with a broken definition | Code read | Reject | — | Negligible; no supported consequence |
| C-14 | Deviation: the warning keeps `TEAM_RUN_DEFINITION_NOT_FOLLOWED: Team run '<id>' keeps its members: <reason>`, not D-INVALID's `…:<teamRunId>: <reason>` | D-INVALID wording (not an Exact Text) | — | Names the code, run and reason; matches the existing log lines and the TF suite | handoff deviation | Reject (`Pass — deviation recorded, reason holds`) | — | Only § Exact Texts is normative text; both formats carry the same facts |

## Structural / Design Checks

| Check | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Task design health assessment is present, evidence-backed, and preserved | Pass | One stored fact for leaving (the marker), one member source for both row paths; `TeamRunMembership` derives leaving from the tree | — |
| Implementation matches behavior-defining supplemental artifacts | Pass | Refusal and notice texts unchanged; refusal now reachable by run ID | — |
| Data-flow spine inventory clarity and preservation | Pass | DS-004 release: write → replace → handle removal → rows → event, in `memberStopped`; DS-007: marker → `ownTreeOf` → `teamMemberRowsOf` → DTO → web | — |
| Ownership boundary preservation and clarity | Pass | The committer owns every tree write and release ordering. The manager only stops handles and reports (no membership edits, no writes). Membership changes only via `replace`. | — |
| Off-spine concern clarity | Pass | Liveness for rows comes from the active root directory; live execution IDs come from the execution manager | — |
| Existing capability/subsystem reuse check | Pass | Reuses `commitExecutionTreeMutation`, `runPartsChanged`/`ChildRowsFeed`, the existing row components and row model | — |
| Reusable owned structures check | Pass | One `teamMemberRowsOf` for both paths; one `clearStoppedLeavingMarkers` for plan, release and restore | — |
| Shared-structure/data-model tightness check | Pass | `FormerMemberExecutionNode = ConfiguredAgentExecutionNode & { leaving?: true }`; schema accepts only `true`; DTO optional literal | — |
| Repeated coordination ownership check | Pass | Marker clearing has one owner (pure functions called inside the committer's lock and by `followStored`) | — |
| Empty indirection check | Pass | `TeamRun`/`FlatTeamRunBackend` forward `liveExecutionIds`/`removeStoppedHandle` along the existing root → backend → manager chain the design names (as `executeDirectAgentCommand`). The chain exists for the backend boundary, not added for this. | — |
| Scope-appropriate separation of concerns and file responsibility clarity | Pass | New logic in the membership files, run-tree view and records; root and manager get wiring | — |
| Ownership-driven dependency check | Pass | The composition passes `isLiveTeamRun` as data; run-tree code does not import team execution | — |
| Authoritative Boundary Rule check | Pass | The router asks the root boundary (`ownsAgentRun`), not the root's index; `placeOf` keeps `hasAgentExecution` | — |
| File placement check | Pass | As designed | — |
| Flat-vs-over-split layout judgment | Pass | — | — |
| Interface/API/query/command/service-method boundary clarity | Pass | `hasAgentExecution` (live own agents, placement) vs `ownsAgentRun` (routing, includes former), both documented on the boundary interface | — |
| Naming quality and naming-to-responsibility alignment (Principle 15) | Pass | "leaving" means a removed member with a live execution in the schema, DTO, row and docs; C-07 fixed | — |
| No unjustified duplication of code / repeated structures in changed scope | Pass | — | — |
| Patch-on-patch complexity control | Pass | IR-002 replaces the in-memory leaving set and `release` with the stored marker (removed, not layered); the manager lost its release role | — |
| Dead code removed in the touched files and modules | Pass | `TeamMembersPanel.vue` and all its locale keys (hand-written and generated, en and zh-CN) removed; `release` removed; navigation-row `leaving` removed; `grep TeamMembersPanel` finds nothing | — |
| Relevant test scenarios and assertions are clear and requirement-aligned | Pass | Committer release ordering, definite-failure heal, N-12 and ending-run tests; manager stop-only tests; restore clearing the marker (integration); run-ID refusal through the router; `placeOf` unchanged; schema `leaving`; row component tags; `teamMemberRowsOf`; planner warn-once | — |
| Test fixtures/helpers are reasonably reusable and test structure remains coherent | Pass | Existing harnesses extended | — |
| No stale, duplicated, or compatibility-only tests are retained in changed scope | Pass | Panel tests removed with the panel; selector spec updated | — |
| API/E2E readiness for the next workflow stage | Pass | Rerun TF-02, TF-03, TFU-03 (rendered tag on both row components, approve while leaving, Stop while leaving), and TFL-02 | — |

## Source File Size And Structure Audit (If Applicable)

Effective non-empty lines [raw `wc -l`], at `64a4b6100c`:

| Source File | Before (IR-001) | After | `>500` Hard-Limit Check | `>220` Delta Check | SoC / Ownership | Placement | Classification | Required Action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `domain/root-team-run.ts` | 465 [500] | 464 [499] | Pass (design raw ≤500) | Pass | Pass | Pass | — | — |
| `services/agent-team-run-manager.ts` | 459 [497] | 461 [499] | Pass (design raw ≤500) | Pass | Pass | Pass | — | — |
| `delegation/delegation-index.ts` | 490 [536] | 490 [536] | Pass | Pass | Pass | Pass | — | — |
| `local/flat-team-execution-manager.ts` | 338 | 344 | Pass | Pass | Pass | Pass | — | — |
| `delegation/run-tree-view.ts` | — | 251 | Pass | Pass | Pass | Pass | — | — |
| `membership/*` (committer 119, change 153, planner 143) | — | — | Pass | Pass | Pass | Pass | — | — |

## Legacy / Backward-Compatibility Verdict

| Check | Result | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms in changed scope | Pass | — |
| No legacy old-behavior retention in changed scope | Pass | In-memory leaving and `release` replaced, not kept |
| Dead code removed in the touched files and modules | Pass | See structural row |
| Approved persisted-data transition decision is followed without unnecessary migration work | Pass | `leaving` is an optional marker on new data; absent means stopped; no existing tree carries it |
| No version-specific dual reads/writes or request-time old-shape fallback exists | Pass | — |
| Approved transition mechanics match the reviewed design | Pass | Restore always clears markers |

## Dead / Obsolete / Legacy Items Requiring Removal (Mandatory If Any Exist)

None.

## Docs-Impact Verdict

- Docs impact: `Yes`, done (`agent_team_execution.md`, `agent_communication.md`, `GLOSSARY.md` updated for the marker, release, rows and `ownsAgentRun`). Delivery verifies the docs sync.

## Additional Material Premise Validation (When Required)

| Premise ID | Current Status | Changed Evidence / Reason |
| --- | --- | --- |
| MP-01..MP-04 | Confirmed | As in CRR-001 |
| N-8 ("two pictures, brief") | No Longer Relevant | Superseded by SR-010: both projections read the one stored marker; the rendered list is the run-tree rows (CRR-002 CR-002) |

## Review Scorecard (Mandatory)

- Overall score: `9.4/10` (simple average; not the decision rule)

| Priority | Category | Score | Why This Score | What Is Weak / Holding It Down | What Should Improve |
| --- | --- | --- | --- | --- | --- |
| `1` | `Data-Flow Spine Inventory and Clarity` | 9.5 | The release step is a second locked commit with the designed order; restore clears markers in the same function family | — | — |
| `2` | `Ownership Clarity and Boundary Encapsulation` | 9.5 | The committer owns writes and ordering; the manager stops only; membership derives from the tree; the router asks the root boundary | — | — |
| `3` | `API / Interface / Query / Command Clarity` | 9.4 | `ownsAgentRun` vs `hasAgentExecution` documented with their readers; `isLiveTeamRun` explicit | Two similar root questions need their doc comments to stay clear | — |
| `4` | `Separation of Concerns and File Placement` | 9.4 | Rows logic in the run-tree layer; root and manager at 499 raw lines within the design limit | Both files sit right at the limit | Future growth into owned files |
| `5` | `Shared-Structure / Data-Model Tightness and Reusable Owned Structures` | 9.4 | One marker, one row function, one clearing function | — | — |
| `6` | `Naming Quality and Local Readability` | 9.4 | Consistent "leaving"/"former" vocabulary; C-07 fixed | — | — |
| `7` | `API/E2E Readiness` | 9.3 | TF suite 10/10 on the built server (IMP-17); clear rerun plan | Rendered TFU-03 and real-runtime TFL-02 not yet rerun | API/E2E reruns |
| `8` | `Runtime Correctness And Behavioral Fidelity` | 9.3 | CR-001 path traced from the tool entry; marker lifecycle traced through stop, rejoin, restart, Stop and write failure | Rendered behavior is proven only by component specs so far | TFU-03 |
| `9` | `No Backward-Compatibility / No Legacy Retention` | 9.6 | Clean replacement | — | — |
| `10` | `Cleanup Completeness` | 9.5 | Dead panel, keys, `release` and nav field removed | — | — |

## Findings

| ID | Finding | Classification | Owner | Status |
| --- | --- | --- | --- | --- |
| CR-001 | Run-ID messages to leaving or former members did not reach the refusal (F-1) | Local Fix | Implementation | Resolved (CRR-003; runtime API-REV-002) |
| CR-002 | The "Leaving" visibility rule was on an unmounted component (F-2) | Design Impact | Solution Designer | Resolved (SR-010, IR-002; rendered API-REV-002) |
| CR-003 | A leaving or former member could not be opened: no launch source (F-3) | Local Fix | Implementation | Resolved (IR-003; IMP-20, IMP-21) |
| CR-004 | Dead null branch, nullable team location type, and a second derivation of the member's node, left by the CR-003 fix | Local Fix | Implementation | Resolved (IR-004; IMP-22) |

No open findings.

## Follow-ups

- Follow-ups this review added: None. FU-002, FU-003 and FU-004 remain.

## Classification

N/A: Pass.

## Recommended Recipient

API/E2E (primary pass rule): rerun TF-03, TFU-03 and TFU-04 on `6c7af4a384`, plus the cases these changes touch. Then an informational notice to implementation.

## Residual Risks

- Carried from CRR-003: a follower step that throws after a commit skips the rest of that change (C-04); a definite release-write failure keeps the "Leaving" tag until the next plan (C-10, designed); FU-003.
- The rendered approval (TFU-04) is proven by the implementation's IMP-21 run on IR-003. API/E2E's own rerun on `6c7af4a384` confirms it on the final commit.

## Latest Authoritative Result

- Review Decision: `Pass`
- Review Entry Point: `Implementation Review` (round 6, `Targeted Delta Review`)
- Supported Product Scenario Gate: `Pass`
- Material-Premise Gate: `Pass`
- Score Summary: 9.4/10 average; every category ≥ 9.3
- Failure Origin: N/A
- Recommended Recipient: API/E2E engineer
- Notes: CR-001..CR-004 are resolved. Classification Large/High is preserved.
