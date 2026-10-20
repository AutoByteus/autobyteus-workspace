# Code Review Report

Ticket `delegated-copy-restore-from-own-file` (autobyteus-197). Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copy-restore-from-own-file`, branch `codex/delegated-copy-restore-from-own-file`, base `origin/personal` @ `f171032e88`, head reviewed `da1d7f5524` (round 2; fix commit `96de77efb3`). Round 1 reviewed `0a303d3a5d`.

## Review Round Meta

- Review Entry Point: `Implementation Review`
- Requirements Doc Reviewed As Context: `requirements-doc.md` (Approved; REQ-001..REQ-012, AC-001..AC-011, DEC-001..DEC-010)
- Investigation Notes Reviewed As Context: `investigation-notes.md` (cited by the design; not re-audited)
- Solution Revision Record Reviewed As Context: `solution-revision-record.md` (SR-001..SR-008)
- Design Spec Reviewed As Context: `design-spec.md` (SR-008: D-1..D-9, M0..M5)
- Supplemental Task Artifacts Reviewed As Context: `implementation-design-impact-DI-001.md` (resolved by D-8), `implementation-design-impact-DI-002.md` (resolved by D-9)
- Relevant Solution Revision IDs: SR-001..SR-008
- Design Review Report Reviewed As Context: `design-review-report.md` (ARCH-REV-007, Pass)
- Architecture Review Revision Record Reviewed As Context: `architecture-review-revision-record.md`
- Relevant Architecture Review Revision IDs: ARCH-REV-003..ARCH-REV-007
- Implementation Handoff Reviewed As Context: `implementation-handoff.md`
- Implementation Revision Record Reviewed As Context: `implementation-revision-record.md`
- Relevant Implementation Revision IDs: IR-001, IR-002, IR-003
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-004` (CRR-003 was the separate test-code review)
- Current Review Round: 3
- Review Scope: `Targeted Delta Review`
- Review Scope Evidence (round 3): IR-003 merges `origin/personal` @ `ad784b0a8f` (46 commits; merge `26ad4ace20`, head `c5da4745e3`).
  - **Conflicts:** only in the three task-execution adapters. Base `a9b5230505` replaced `ingressAgentRunId` with `ingressMember(indexed): {address, agentRunId}` and resolved a Team copy's coordinator through `this.sources`, which this ticket removed. Reviewed with `git diff ad784b0a8f 26ad4ace20` on each adapter. The merged code is the round-2 adapter shape plus base's `ingressMember` signature, comment and return. `coordinatorAddress` comes from `indexed.source.source.coordinatorAddress`, the copy's own source. No `this.sources` and no stale `ingressAgentRunId` method remain.
  - **Base content:** none of the 46 commits' source files touches the record, own-file, migration or view code of this ticket, apart from the three adapters and `task-execution-conversation-availability.ts`, which uses only `ingressMember.{address, agentRunId}`. Their added lines contain no read of a copy's `source`, configured placement or own-file section. Base adds no app-data migration, so 20261019 stays last.
  - **Evidence:** IMP-15..IMP-23 on `26ad4ace20` (typecheck; server unit 6169; integration 419; build; base's unclean-shutdown delegated-team restore e2e 5/5; startup and upgrade e2e 9/9 with TAU-2; web unit 4565; guards; the AC-009 sweep extended to `this.sources` and the stale method, with no hits).
  - Every other check carries forward from rounds 1-2.
- Review Scope Evidence (round 2): `git diff 0a303d3a5d..da1d7f5524` changes two source lines-of-concern only:
  - `standalone-root-tree-schema.ts`: the CR-001 loop is removed;
  - `teamExecutionTreeSelectors.ts:162`: the same kind of dead absent-source fallback, removed.

  The rest of the diff is ticket documents and evidence. No spine, interface or data shape changed, and no new fixes are stacked on earlier fixes. Round-1 evidence for every other check carries forward.
- Trigger: implementation handoff IR-003 (INT-001 Local Fix, the merge resolution requested by delivery in DR-001) from `/software_engineering_team/implementation_engineer`. Round 2 trigger: IR-002 (CR-001).
- Prior Review Round Reviewed: 2 (`CRR-002`, Pass)
- Latest Authoritative Round: 3
- Failure-origin fields: N/A

## Routing Classification Review

- Task size: `Large`
- Architectural risk: `High`
- Selected route: `Implementation Review`
- Independent source review required by the classification: `Yes`
- Classification evidence or correction required: confirmed. The change covers three packages and the web app, a persisted-shape change with a new startup migration and a same-ID repair of a released one, and shared stream contracts. No correction is needed.

## Review Scope

- **Changed implementation and behavior reviewed:**
  - D-1 snapshot at birth (`configuredPlacementSource`, `sourcedPlacement`, the Team and Org recipient resolvers);
  - D-2 projection only (three task-execution adapters; resolvers and `readTaskSource` removed);
  - D-3 own-file single branch (`task-agent-own-records.ts`, `task-execution-tree-split.ts`, the tree shapes);
  - D-4 handoff invariant; D-5 member `launchConfiguration` + `followsTeam`; D-6 `configured` origin; D-7 web display names;
  - views: location service by `executionKind`, run-view `platformAgentRunId`, the org, team and standalone indexes, `mention-viewer.ts`, the stream projections, both contracts;
  - web: `agentSourceSelectors.ts`, view indexes, contexts, `delegatedLaunchRows.ts`, `agentOrgHistoryRows.ts`, `ExistingRunConfigEditor.vue`;
  - migrations: `20261019_delegated_copy_own_file_complete_v1` (M0..M5), the frozen `released-task-agent-own-files-with-origin.ts` with D-9, the repointed `coordinating-run-migration.ts`, the D-8 bridge and its four call sites, the registry;
  - docs (server modules, CM-8, web settings and agent orgs, the legacy README).
- **Files / areas reviewed:** every changed non-test source file listed by `git diff --stat origin/personal...HEAD` outside `dist/` and `tickets/`. Proportionate read of the new migration suite, the D-9 ownership tests, `collaborator-member-launch.test.ts`, `copy-execution-source.test.ts`, the adapted memory-sync F-X3 test and the DLP-006 probe change (`2253b8044b`).
- **Explicit exclusions:**
  - committed contract `dist/` (IMP-06 proves it matches a fresh build);
  - ticket evidence logs;
  - checks were not rerun: the recorded IMP-01..IMP-14 cover the reviewed commits, and no code they exercise changed after they ran (IMP-03/04/05/07/08 ran on `7d689455ad`; the later commits change only migration code, which IMP-09/11/12 cover, and the probe, which IMP-14 covers).

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: `Yes`. Every copy restores from its own file (REQ-001), a configured-place copy records its full snapshot when it starts (REQ-002), slot edits do not reach existing copies (REQ-003, DEC-001), views show the copy's own values (REQ-004), `origin` is gone (REQ-005), there is one conversion at upgrade (REQ-006..REQ-009) and explicit member facts (REQ-012, DEC-010).
- Design-spec behavior map verified against the implementation: `Yes`, traced forward on DS-001..DS-005 (below).
- Design review report and round confirmed: ARCH-REV-007, Pass; MP-001..MP-003 stand.
- Behavior-basis status: `Confirmed`
- Changed or newly discovered behavior: none.
- Remaining material ambiguity: none.

| Behavior ID | Current Status | Current Implementation Path And Lifecycle Evidence | Contradicting / New Evidence |
| --- | --- | --- | --- |
| BEH-001 | Confirmed | `composeTaskAgentRecord` / `composeTaskTeamRecord` always set `source` from the own file (`task-agent-own-records.ts`); restore uses `projectTaskExecutionSource(address, indexed.source.source)` in the team, org and standalone adapters | — |
| BEH-002 | Confirmed | The same restore path. The resolvers are deleted; the only source read is the record's `source`. `locatedExecutionSource` decides by `executionKind` (`collaboration-execution-location-service.ts:188-193`); the team run view takes `platformAgentRunId` from the execution itself (`team-member-run-view-projection-service.ts:131-132`) | — |
| BEH-003 | Confirmed | Follows from BEH-002 + BEH-005: a slot edit changes only `ConfiguredAgentExecutionNode.launchConfiguration`, which only `configuredPlacementSource` reads, at activation | — |
| BEH-004 | Confirmed | Server views as in BEH-002. Web: `teamAgentSourceOf` / `copyAgentSourceOf` / `copyTeamSourceOf` look up by run ID; `agentOrgExecutionViewIndex.ts` decides by `kind`; `delegatedLaunchRows.ts` reads only `task.source`; D-7 `readsAsDisplayName` uses the configured root-member set | — |
| BEH-005 | Confirmed | `TeamRecipientResolver` / `AgentOrgRecipientResolver` → `sourcedPlacement(address, configuredPlacementSource(node, index.tree.handoffs))` → adapter `projectTaskExecutionSource(placement.source)` → `projectTask*Execution({ source: placementSourceOf(...) })` → tree split → `taskAgentOwnMetadata` / `taskAgentTeamOwnTree` from `record.source` | — |
| BEH-006 | Confirmed | `delegated-launch-selection.ts` uses `task.source.launchConfiguration` / member `launchConfiguration` + `followsTeam`; `userLaunchSelection` is written beside the launch (`section(...)`) | — |
| BEH-007 | Confirmed | Catalog: `collaborator-launch-resolver.ts:123-128` (`followsTeam` = not on own default). Configured: `followsConfiguredTeam` (runtime, model, settings equal). Restore: `followerAddresses` from `member.followsTeam` | — |
| BEH-008 | Confirmed | `DelegatedCopyOwnFileCompleteV1AppDataMigration` (M0 discovery of `agents/*` and `agent_teams/*` only; M1..M4 in `own-file-completion.ts`; M5 gate in `predecessorPending`); D-9 `readReleasedOwnFileOwnership` in `isOwnedHere` / `partsAtL1` | — |

## Supported Product Scenario And Reachability Gate (Mandatory)

| Scenario ID | Related Behavior / Contract IDs | Kind | Actor / Initiator | Coherent Goal Or Governing Event | Supported Entry Surface / Event | Shape | Forward Production Path / Lifecycle | Expected Outcome | Independent Evidence | Scenario Validity | Review Use |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | BEH-001, 002, 006, 007 | User/System | User | Continue work with a delegated copy | Reopen a stopped run; send to a copy | Normal | DS-002 | Copy runs with its own settings | requirements SCN-001 | Supported Normal Scenario | Use |
| SCN-002 | BEH-005, 007 | User | Coordinating agent / user | Delegate to a configured member | `delegate_task` to a member address | Normal | DS-001 | Full snapshot in own file | requirements SCN-002 | Supported Normal Scenario | Use |
| SCN-003 | BEH-003 | User | User | Change a member's model for future work | Run settings of a stopped run | Normal | DS-001 + DS-002 | Old copy unchanged, new copy uses edit | requirements SCN-003 | Supported Normal Scenario | Use |
| SCN-004 | BEH-004 | User | User | See what a copy runs with | Run view / Settings | Normal | DS-003 | Copy's own values; names unchanged | requirements SCN-004 | Supported Normal Scenario | Use |
| SCN-005 | BEH-008 | Operational | App startup | Upgrade | First start of the new build | Normal | DS-004 | Copies restore as before; unconvertible left untouched, not loaded | requirements SCN-005; design shape inventory | Supported Normal Scenario | Use |
| C-AC009 | REQ-005 / AC-009; Core Principle 7 | Contract | — | No absent-source branch for copies, and no dead code in touched files | Code | — | — | — | requirements AC-009; design-principles §7 | Governing contract | Use |

### Candidate Finding And Mechanism Gate

| Candidate ID | Observation Or Mechanism | Scenario / Contract ID | Independent Trigger | Forward Path / Lifecycle / Consequence | Evidence | Disposition | Scope | Reason / Proportionate Response |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| CAND-01 | `standalone-root-tree-schema.ts:19-22` still checks `if (!task.source) throw … "has no catalog source"` | C-AC009 | Contract (AC-009, Principle 7) | `validateStandaloneRootTreePayload` builds `taskExecutions` with `parseTaskExecutions`, which now requires the `source` key (`run-execution-tree-shared-record-schemas.ts:184,195`) and parses it as an object; `TaskExecution.source` is required in the type. The branch can never run. The file is touched (the `validateCopyLayouts` rename) | code read; no test reaches the message (`grep "no catalog source" tests`: none) | Promote | This ticket | Remove the loop and its stale comment (3-4 lines). → CR-001 |
| CAND-02 | Web `delegatedLaunchRows.ts` keeps `recorded?.` / `follows_team ?? false` when a Team-copy member has no entry in its source | Contract: server `validateCopyLayouts` | None: the server rejects a Team copy whose members differ from its source, so the DTO never carries one | Not reachable through a supported path. It is needed for typing (`.find` may return undefined) and adds no recovery behavior | code read | Reject | — | Minimal type narrowing, not machinery |
| CAND-03 | `placementSourceOf` throws when placement kind ≠ binding kind | Engineering contract (placement kind = source kind) | None: `sourcedPlacement` derives the kind from `source.kind` | An internal invariant assertion; it never runs on a supported path | code read | Reject | — | An assertion replaces the former silent `null`. Acceptable |
| CAND-04 | A mirrored configured-place agent copy (F-X3b) appears under "Unattributed runs" on the Memory page (handoff Known Risk 1) | SCN-005 + design shape inventory row F-X3b | Memory Sync from a node still on 10-17 (2 such copies in the user's data) | The copy is not loaded in its imported source, as designed. The Memory explorer's existing rule lists any run whose metadata cannot be read as unattributed, so its memory stays reachable. Nothing is lost; the next sync after that node updates replaces the mirror | `memory-sync-task-agent-layout.test.ts` F-X3 case; design checklist item 8 | Reject (as a finding) | — | Consistent with REQ-008 ("not loaded") and DESIGN rule 7. The Memory page is outside the Change Scope (`imports/` left alone). Recorded under Residual Risks for delivery and the user |
| CAND-05 | DLP-006 probe now writes the released own-file shape and deletes the 20261019 ledger row | Probe models SCN-005 | Upgrade from a release before 20261019 | A release before this build never ran 20261019 and wrote `origin` with no member launch facts; the probe recreates exactly that state in its own data root, so the restart follows the real upgrade path. The old mechanism fed a pre-change shape to the post-change reader, which D-5 rightly rejects | `2253b8044b` diff; IMP-14 15/15 | Reject (as a finding) | — | Acceptable mechanism. Expectations are unchanged |
| CAND-06 | `followsConfiguredTeam` and the `configured` provenance constant exist in both runtime (`collaborator-source-projector.ts`) and the migration (`own-file-completion.ts`) | Data Migration Guideline §4; design "Reusable Owned Structures" row 1 | — | The design requires this: a migration must not import runtime code for its transformation | design-spec | Reject | — | Approved duplication |
| CAND-07 | Frozen file `released-task-agent-own-files-with-origin.ts` is a new 479-line file (518 physical) | Size rule | — | Under the 500 effective-line limit. A delta over 220 that is an approved frozen copy of released code (guideline §4), plus D-9's 35-line reader | `grep -cv '^\s*$'` = 479 | Reject | — | Pass on size; placement and ownership are correct |

## Structural / Design Checks

| Check | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Task design health assessment is present, evidence-backed, and preserved | Pass | Legacy-cleanup and repeated-coordination triggers resolved: one projection path, `source` required, resolvers gone | — |
| Implementation matches approved behavior-defining supplemental artifacts | Pass | None besides DI-001/DI-002, implemented as D-8/D-9 | — |
| Data-flow spine inventory clarity and preservation | Pass | DS-001..DS-005 traced end to end in code (behavior table) | — |
| Ownership boundary preservation and clarity | Pass | Snapshot building only in `collaborator-source-projector.ts`; adapters read only `source`; historical shapes only in migration-owned files | — |
| Off-spine concern clarity | Pass | `configuredPlacementSource` serves the recipient resolvers; the slot locator lives in the migration | — |
| Existing capability/subsystem reuse | Pass | Extends the projector; reuses `AtomicRunPackageFileCommitWriter` and the predecessor-gate pattern; frozen shapes in `legacy/released-run-package-shapes/` | — |
| Reusable owned structures | Pass | `sourcedPlacement` exported and reused by both resolvers; the runtime/migration duplication is approved (CAND-06) | — |
| Shared-structure/data-model tightness | Pass | `source` required with one meaning; member `launchConfiguration` + `followsTeam` required; agent own-file launch non-null; the presence-carries-meaning rule is gone | — |
| Repeated coordination ownership | Pass | The "source else slot" rule in about 12 server and web sites is replaced by a by-kind / by-run-ID decision | — |
| Empty indirection | Pass | Three resolvers, the `readTaskSource` port and the `RootTeamRun` `config` pass-through are removed | — |
| Separation of concerns / file responsibility | Pass | Migration split into discovery/IO (`…-app-data-migration.ts`) and pure per-file transformation (`own-file-completion.ts`) | — |
| Ownership-driven dependency | Pass | Current code imports no migration or legacy module. The 10-17 migration uses only the frozen file plus `taskExecutionLinkOf` and `TaskAgentMessageLogs` (unchanged shapes). The D-8 bridge is confined to the legacy folder | — |
| Authoritative Boundary Rule | Pass | Callers no longer depend on both the composed record and the coordinating tree's slot for a copy | — |
| File placement | Pass | New migration folder matches its siblings; the frozen file sits in the legacy shapes folder | — |
| Flat-vs-over-split layout | Pass | Two files for the migration, one frozen file | — |
| Interface boundary clarity | Pass | `DelegationPlacement.source` is required; `projectTaskExecutionSource` overloads keep the kind; web selectors take a run ID instead of an address | — |
| Naming quality | Pass | `copyExecutionSource`, `validateCopyLayouts`, `configuredPlacementSource`, `copyAgentSourceOf`, `readReleasedOwnFileOwnership` | — |
| No unjustified duplication | Pass | See CAND-06 | — |
| Patch-on-patch complexity control | Pass | D-9 is one narrow reader used at the two ownership checks only | — |
| Dead code removed in touched files and modules | Pass (round 2) | CR-001 resolved in `96de77efb3`. The same commit removes `team.source?.coordinator_address ?? team.address` in `teamExecutionTreeSelectors.ts` (`TaskTeamExecutionDto.source` is required). Round 1 missed this second instance because its sweep output was truncated. A fresh sweep of current server and web code for `source?.`, `!task.source`, `!team.source` and `.source ??` finds no copy-related hit; the remaining "has no catalog source" is in the frozen released schema, as released | — |
| Test scenarios and assertions clear and requirement-aligned | Pass | The migration suite names each fixture (F-A1..F-X3c) and AC, and asserts raw output, dispositions, byte-identity, write counts and store composition | — |
| Test fixtures/helpers reusable and coherent | Pass | `released-delegated-copy-own-file-fixtures.ts` is shared by the migration, memory-sync and D-9 suites | — |
| No stale, duplicated, or compatibility-only tests | Pass | Resolver tests removed with the resolvers; the 10-17 current-store read-back moved to the combined test, as planned (Change Sequence 1.3) | — |
| API/E2E readiness | Pass | Handoff names the AC-001/AC-003 journeys, the AC-004 run view and the unrendered "As configured in this run" label for API/E2E | — |

## Source File Size And Structure Audit

Effective non-empty lines. Only files over 400 lines or with deltas over 100 are listed; every other changed source file is well under both limits.

| Source File | Before | After | `>500` | `>220` Delta | SoC / Ownership | Placement | Classification | Required Action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `legacy/…/released-task-agent-own-files-with-origin.ts` | 0 | 479 | Pass | 518 (new; frozen copy + D-9) | Pass | Pass | Approved frozen shapes | — |
| `migrations/delegated-copy-own-file-complete-v1/own-file-completion.ts` | 0 | 255 | Pass | 275 (new) | Pass: pure per-file transformation | Pass | — | — |
| `migrations/delegated-copy-own-file-complete-v1/…-app-data-migration.ts` | 0 | 214 | Pass | 229 (new) | Pass: discovery, IO, result | Pass | — | — |
| `run-history/store/task-agent-own-records.ts` | 243 | 169 | Pass | 219 (net shrink) | Pass | Pass | — | — |
| `web/services/collaborators/agentSourceSelectors.ts` | 209 | 143 | Pass | 219 (net shrink) | Pass | Pass | — | — |
| `agent-collaboration/collaborators/collaborator-source-projector.ts` | 140 | 181 | Pass | 116 | Pass | Pass | — | — |
| `agent-org-execution/services/agent-org-run-manager.ts` | 466 | 462 | Pass | 4 | Pass | Pass | — | — |
| `agent-team-execution/domain/root-team-run.ts` | 456 | 448 | Pass | 8 | Pass | Pass | — | — |
| `web/services/teamExecution/teamExecutionViewState.ts` | 479 | 479 | Pass | 4 | Pass | Pass | — | — |

## Legacy / Backward-Compatibility Verdict

| Check | Result | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms in changed scope | Pass | DTO `source` required (clean cut, DESIGN rule 9); the current reader rejects old own-file shapes |
| No legacy old-behavior retention in changed scope | Pass | No slot fallback remains for copies (sweep: `configured_place`, `resolvePlace`, `readTaskSource`, `TaskSourceResolver`, `configuredFollows`, `catalog*SourceAt`, `memberFollowsTeam`, `effectiveMemberLaunchConfiguration` appear only in migration-owned code and its tests) |
| Dead code removed in the touched files and modules | Pass (round 2) | CR-001 resolved |
| Approved persisted-data transition decision followed | Pass | `Migration Required`, implemented as M0..M5 |
| No version-specific dual reads/writes or request-time old-shape fallback | Pass | Old shapes are read only by the migration, the frozen file and the D-8 bridge |
| Approved transition mechanics match the reviewed design | Pass | Atomic write + read-back per file; idempotent by shape; non-terminal predecessor gate; `imports/` never discovered; dispositions as designed, plus `PRESERVED_UNSUPPORTED` for a file that matches neither shape (left untouched, warning) |

## Dead / Obsolete / Legacy Items Requiring Removal

None remaining (round 2).

| Item / Path | Type | Evidence | Why It Must Be Removed | Status |
| --- | --- | --- | --- | --- |
| `standalone-root-tree-schema.ts:19-22`: the `if (!task.source) throw … "has no catalog source"` loop | DeadCode / LegacyBranch | `parseTaskExecutions` requires `source` | Core Principle 7; AC-009 | Removed in `96de77efb3` |
| `teamExecutionTreeSelectors.ts:162`: `team.source?.coordinator_address ?? team.address` | DeadCode / LegacyBranch | `TaskTeamExecutionDto.source` is required by the contract | Core Principle 7; AC-009 | Removed in `96de77efb3` (found by the implementer's sweep) |

## Docs-Impact Verdict

- Docs impact: `Yes`, and done in this change.
- Why: the record shape, the own-file shape, the launch origin and the migration are documented.
- Files: `run_history.md`, `agent_orgs.md`, `agent_communication.md`, `agent_team_execution.md`, `standalone_agent_run_root.md`, `collaboration_model.md` CM-8, web `settings.md` and `agent_orgs.md`, legacy `README.md`. They were read and are accurate.

## Additional Material Premise Validation

### Upstream Design-Review Material-Premise Decisions

| Premise ID | Current Status | Changed Evidence / Reason |
| --- | --- | --- |
| MP-001 | Confirmed | `followsConfiguredTeam` ignores `autoExecuteTools` and workspace; `collaborator-member-launch.test.ts:89` covers AC-011(a) |
| MP-002 | Confirmed | M4 `projectLaunch` reads only the 5 keys; the migration test asserts no `skillAccessMode` in any own file |
| MP-003 | Confirmed | `collaborator-launch-resolver.ts:126-127` keeps `launchSource` with the skipped fallback on a follower; F-T2b asserted |

New or reclassified premises: none.

## Review Scorecard (Mandatory)

- Overall score (`/10`): 9.45
- Overall score (`/100`): 94.5
- Score calculation note: simple average; the decision follows the findings and the per-category floor.

| Priority | Category | Score | Why This Score | What Is Weak / Holding It Down | What Should Improve |
| --- | --- | --- | --- | --- | --- |
| 1 | Data-Flow Spine Inventory and Clarity | 9.5 | DS-001..DS-005 read directly in code; birth, persistence, restore and view of a snapshot each have one path | — | — |
| 2 | Ownership Clarity and Boundary Encapsulation | 9.5 | Snapshot rule in the projector, record ⇄ file in own-records, historical shapes in migration-owned code only | — | — |
| 3 | API / Interface / Query / Command Clarity | 9.5 | Required `source` on placement, record and DTO; web lookups by run ID instead of an ambiguous address | — | — |
| 4 | Separation of Concerns and File Placement | 9.5 | Migration split into IO and pure transformation; new files placed with their owners | — | — |
| 5 | Shared-Structure / Data-Model Tightness | 9.5 | Optional `source` with two meanings and the presence-based follower rule are both gone | — | — |
| 6 | Naming Quality and Local Readability | 9.5 | Names follow the widened meaning (`copy*`); doc comments rewritten | — | — |
| 7 | API/E2E Readiness | 9.0 | Strong unit, migration and startup e2e coverage; clear hints for the next stage | AC-001/AC-003 journeys and the rendered "As configured in this run" label are not yet exercised at the system boundary | API/E2E covers them as the handoff lists |
| 8 | Runtime Correctness And Behavioral Fidelity | 9.5 | Equivalence checked: configured snapshot = the slot values the old resolvers used; D-7 names unchanged for every Team-root address; migration follows M1..M5, including D-9 | — | — |
| 9 | No Backward-Compatibility / No Legacy Retention | 9.5 | Clean cut throughout current code; round 2 removed the last two absent-source branches for copies (server and web) | — | — |
| 10 | Cleanup Completeness | 9.5 | Thorough removal (resolvers, port, helpers, contract helpers, web inputs, tree-shape members), with CR-001 and its web twin removed; a fresh sweep is clean | — | — |

## Findings

No open findings (round 2).

### CR-001 — Dead absent-source check in the Agent-root tree schema — **Resolved (round 2)**

- Resolution: `96de77efb3` deletes the loop and its comment and keeps `validateCopyLayouts` and `validateTaskExecutionDelegators`. The same commit removes the equivalent web fallback in `teamExecutionTreeSelectors.ts`. IMP-01, IMP-02 (6111 passed) and IMP-07 (4549 passed) were rerun on `96de77efb3`, per `IMP-00-summary.txt`, which records exit 0 for all three.
- Severity (round 1): Low. A bounded `Local Fix`.
- Scope: this ticket (Core Principle 7: dead code in a touched file; AC-009 / REQ-005).
- Where: `autobyteus-server-ts/src/standalone-agent-run-root/persistence/standalone-root-tree-schema.ts:19-22`.
- Evidence: CAND-01. `validateInvariants` runs only on the tree that `validateStandaloneRootTreePayload` builds with `parseTaskExecutions`. That parser now rejects a task execution without `source`, so `!task.source` is never true, and the error text "has no catalog source" can never be produced. No test exercises it.
- Required action: delete the loop and its comment. Keep `validateCopyLayouts([tree])` and `validateTaskExecutionDelegators(...)`. No test change is expected; rerun the standalone-root schema tests (or IMP-02) as the bounded check.

## Follow-ups

None new. F-1 (skill-improvement launch of a copy at a configured address) is already recorded by the Solution Designer.

- Sent to: `None`

## Classification

- None (round 2 passes). Round 1: `Local Fix` CR-001, resolved.

## Recommended Recipient

- `/software_engineering_team/api_e2e_engineer` (pass); informational notification to `/software_engineering_team/implementation_engineer`.

## Residual Risks

- **Mirrored copies (CAND-04):** until `docker-node-1` updates and syncs, its 2 configured-place agent copies are listed under "Unattributed runs" on the Memory page. The design's "not shown" refers to the imported source's run list, so this does not contradict it; nothing is lost. Delivery should mention it to the user with the AC-010 check.
- **Not yet proven at the system boundary:**
  - AC-001/AC-003 restore-after-slot-edit journeys;
  - AC-004 run view with the copy's runtime session id;
  - the rendered "As configured in this run" label (unit-proven only);
  - AC-011(a) end to end.

  These are API/E2E scope.
- **D-8 bridge:** it relies on a documented allow-list of current index methods that never read a copy's `source`. A future change to those methods must freeze them first, as the bridge's doc comment says.
- **Real-data conversion:** AC-010, delivery only, after the user's backup.

## Latest Authoritative Result

- Review Decision: `Pass`
- Review Entry Point: `Implementation Review` (round 3, Targeted Delta Review of the INT-001 merge)
- Supported Product Scenario Gate: `Pass`
- Material-Premise Gate: `Pass`
- Score Summary: 9.45 / 10 (94.5 / 100); every category ≥ 9.0.
- Failure Origin: N/A
- Recommended Recipient: `/software_engineering_team/api_e2e_engineer`
- Notes: `CRR-004`, against IR-003 @ `c5da4745e3` (merge `26ad4ace20`). The merge resolution keeps every copy's coordinator on its own source; no new findings. The classification Large / High is preserved. Because product code changed after API-REV-001, API/E2E revalidates by impact. The DCR-001..003 probe cases and the ingress path of the three adapters (message to a stopped Team copy by run ID) are the directly affected surface. Round 2 notes: `CRR-002` against IR-002 @ `da1d7f5524`; CR-001 resolved.
