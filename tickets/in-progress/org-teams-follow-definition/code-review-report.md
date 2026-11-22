# Code Review Report

## Review Round Meta

- Review Entry Point: `Implementation Review`
- Requirements Doc Reviewed As Context: `requirements-doc.md` (Approved, SR-007; REQ-001..REQ-009, AC-001..AC-008, DEC-001..DEC-006)
- Investigation Notes Reviewed As Context: `investigation-notes.md` (IF-01..IF-14, AF-01..AF-09), through the design's citations
- Solution Revision Record Reviewed As Context: `solution-revision-record.md` (through SR-012)
- Design Spec Reviewed As Context: `design-spec.md` (SR-010 with R-1''', R-2, R-3'', R-4, R-5, R-6, R-7, N-1, N-2)
- Supplemental Task Artifacts Reviewed As Context: `org-container-storage-contract.md` (normative, §1..§12), `contract-validation.md`, `follow-ups.md`, `release-notes.md`; autobyteus-22's approved behavior (reused unchanged)
- Relevant Solution Revision IDs: SR-002 (direction), SR-004/SR-007 (approval, DEC-006), SR-010, SR-011, SR-012
- Design Review Report Reviewed As Context: `design-review-report.md` (ARCH-REV-005 Pass with residual notes; ARCH-REV-007 Pass)
- Architecture Review Revision Record Reviewed As Context: `architecture-review-revision-record.md`
- Relevant Architecture Review Revision IDs: ARCH-REV-005, ARCH-REV-007
- Implementation Handoff Reviewed As Context: `implementation-handoff.md` (IR-001)
- Implementation Revision Record Reviewed As Context: `implementation-revision-record.md`
- Relevant Implementation Revision IDs: IR-001
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-001`
- Current Review Round: `1`
- Review Scope: `Full Review`
- Trigger: implementation complete (IR-001), from the implementation engineer
- Prior Review Round Reviewed: N/A
- Latest Authoritative Round: 1
- API/E2E and delivery records: N/A (implementation review)

Code reviewed: worktree `/home/autobyteus/workspace/.codex/worktrees/org-teams-follow-definition`, branch `codex/org-teams-follow-definition`, `git diff 755cea4711..46e53e9ed0` (base `origin/personal` `9f6add773b`; slices 1–8: `1c77d18f56` … `46e53e9ed0`). Source: 118 files, +4451/−1920; 214 files in total.

## Routing Classification Review

- Task size: `Large`
- Architectural risk: `High`
- Selected route: `Implementation Review`
- Independent source review required by the classification: `Yes`
- Classification evidence or correction required: None. The change restructures Org execution into a container, adds a sealed migration of every stored Org run, a new signed peer request, and touches messaging, rows, history, memory and the view composition, as the design states.

## Review Scope

- Changed implementation and behavior reviewed:
  - DS-001 start, DS-002 unit messaging, DS-003 Stop/reopen, DS-004 view/rows/history, DS-005 migration, DS-006 Org follow, DS-007 FU-003;
  - REQ-004 Org-rule merge and notices; R-1''' Team-unit address boundary; R-7 Org routes;
  - the removal plan (slice 4);
  - the web Leaving tag;
  - the four implementation decisions in the handoff.
- Files read in full: `agent-org-execution/container/{agent-org-container-plan, agent-org-unit-runs, agent-org-container-manager, agent-org-container, agent-org-containers, compose-agent-org-containers, org-container-directory, org-view-composition, org-unit-views}.ts`; `agent-collaboration/domain/org-container-port.ts`; `agent-team-execution/container/contained-team-address-space.ts`; `membership/team-change-notice-source.ts` (diff); `services/member-team-context-builder.ts` (diff); `team-run-message-delivery.ts`, `team-run-collaborators.ts` (diff); `agent-collaboration/communication/cross-run-message-delivery.ts`, `delegation/collaboration-tree.ts` (diff); the migration folder (`agent-org-units-own-runs-v1-app-data-migration.ts`, `org-conversion.ts`, `org-log-split.ts`, `org-unit-targets.ts`); FU-003 (`peer-run-members-notice.ts`, `peer-run-members-receiver.ts`, `peer-gateway.ts`/`remote.ts` diffs); `run-history/services/{agent-org-run-history-catalog-service, collaboration-root-history-service, org-unit-member-views}.ts`; `agent-org-execution-tree-location-service.ts` (diff); `run-own-agents-reader.ts`; web `AgentOrgRunMemberTree.vue` (diff).
- Paths traced from their real triggers:
  - `send_message_to('/x')` from a unit: own root miss, then `SendMessageToDispatcher.beyondOwnRun` → `CollaborationTree.resolve`, then the container step 2 → `GlobalAgentRunMessageRouter.deliver`, then `CrossRunMessageDelivery.route`, then `same_container` → `deliverInContainer`;
  - a Leaving unit row → `OrgUnitMemberViews.unitOf` → `OrgContainerDirectory.unitOfAgent` (leaving former units included);
  - a converted never-started agent unit vs. the prepared-run sweeper (`agent-run-provisioning-service.ts:194` skips `containedIn`);
  - archive/delete and the history projection of an Org vs. readiness admission (`root-run-package-current-validator.ts:213-215`, `collaboration-run-history-catalog-core.ts:73`).
- Explicit exclusions: real-runtime and two-node behavior, which belong to API/E2E. I did not rerun the recorded checks (typechecks, suites, migration tests, built-server e2e): no finding depends on a check nobody ran. The findings below are established by reading and are cited at file:line.

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: the Org becomes a container of runs and looks and works as today (DEC-004). Org Teams follow their Team definition (autobyteus-22). Units message each other by Org address with both logs. Org rules merge into unit rules, filtered by presence, with net notices. Stop and reopen work as today, and a message wakes a stopped unit (DEC-006). Stored Orgs are converted (DEC-001). The peer copy's members follow (DEC-003). The Org follows its Org definition (DEC-002). Preserved boundary: launch page, Org view, focus rules, Stop/reopen, **delegation from Org units**, Tasks, Memory page, history.
- Design-spec behavior map verified against the implementation: Yes, with one contradiction (BEH-001 delegation from Org units, below).
- Design review report and round confirmed: ARCH-REV-005, ARCH-REV-007.
- Behavior-basis status: `Contradicted` (one preserved behavior).
- Changed or newly discovered behavior: none new; one preserved behavior the design does not map (CR-001).
- Remaining material ambiguity: how step 2 composes for runs delegated by a unit (CR-001), which is the Solution Designer's decision.

| Behavior ID | Status | Current Implementation Path And Lifecycle Evidence | Contradicting Evidence |
| --- | --- | --- | --- |
| REQ-001 / DS-001 start | Confirmed | `AgentOrgContainers.create` → `AgentOrgContainerManager.create`. Units are created first through their own services (`createTeamRun` with `containedIn`; `prepareAgentRun`, Offline), then the container file. A failure discards the units already made. | — |
| REQ-003 / DS-002 unit ↔ unit | Confirmed | Traced above. Container step 2 (`containerStepTwo`, `placementsOf`), then the `same_container` admission (`sameContainer` from `containedIn`, one fact, N-1), then the receiver restored if not live (DEC-006), then both logs: the receiver line names the sender's Org address (`orgAddressOf`) and the sender line names the receiver's (`receiverOrgAddress`), contract §5 | — |
| REQ-004 / DEC-005 / R-6 | Confirmed | `MemberExecutionContextBuilder.withOrgRules`: Team rules `toOrg` plus `orgRulesFrom(P/x)`, none once left. `OrgContainerDirectory.orgRulesFrom`/`presentIn` filter by current members. `orgRuleChangesFor` → `TeamChangeNoticeSource.recordChange`: one net pending notice with Team and Org rule parts | — |
| REQ-005 / DS-003 | Confirmed | `AgentOrgContainer.stop` stops every unit and every leaving former unit. `restore` reads the file, releases stale markers and restores no unit. `AgentOrgContainers.restore` follows the definition after reopening | — |
| REQ-006 / DS-004 / R-7 | Confirmed | `OrgViewComposition` (relay from live units, snapshot at base, `composition_changed`), `LiveAgentOrgContainer` commands, `OrgUnitMemberViews`, the composed tree in the location service, rows from the container | Mechanism differs from R-3'' (N-1 below) |
| REQ-007 / DS-005 / DEC-001 | Confirmed | Migration: classify → rename folders → write the Team tree (team space) and the agent run file (`containedIn`) → split the log (deterministic; whole-file writes; sources kept until targets validate) → container file last (retry recognizes finished units). Reader-predecessor wait and 18 follow-ups (registry classification test) | — |
| REQ-009 / DS-006 / DEC-002 | Confirmed | `followDefinition` → `manager.follow` (plan under the transition, units created first, one write) → `retire` (leaving until no open work, then stop and a release write) → `tell` (net notices) → view and rows | — |
| REQ-008 / DS-007 / DEC-003 | Confirmed | `withPeerRunMembers` → `PeerRunMembersNotice` (serialized, best effort) → signed `/remote/peer-run-members` → `PeerGateway.admit` → `PeerRunMembersReceiver` (the link must name that run on the calling node) → `updatePeerRunMembers`. Reconciled from run summaries | — |
| BEH-001 preserved: delegation from Org units | **Contradicted** | A unit run is now the delegating run (contract §6), so a run an Org member delegates has that unit run as its step-2 assigner. `CollaborationTree.stepTwo` (`collaboration-tree.ts:175-194`) reaches only `standingOf(assigner)`. For a unit run that comes from its own file (`run-own-agents-reader.ts:74-79`): an agent unit's own agent, or a Team unit's members **in team space**. | Before, the assigner was the Org and its standing was every Org member and mounted Team at its Org address. The base test `collaboration-tree-reach.test.ts` B-4 ("a run delegated by an org reaches the org's agent … and the org's mounted team's member") and `docs/modules/agent_orgs.md:222-225` ("a member reaches the org's standing agents … by their org addresses (contract §2.3 step 2)", unchanged by this diff) state it. See CR-001. |

## Supported Product Scenario And Reachability Gate (Mandatory)

| Scenario ID | Related IDs | Kind | Actor / Initiator | Goal / Event | Entry Surface | Shape | Forward Path | Outcome | Evidence | Validity | Use |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| S-01 start | REQ-001, AC-001 | User | User | Start an Org | Org launch page | Normal | DS-001 | Container + Offline units | requirements | Supported Normal Scenario | Use |
| S-02 unit messaging | REQ-003, AC-003 | System | Unit agent | Hand off to another unit | `send_message_to` | Normal | DS-002 | Delivered, both logs | requirements | Supported Normal Scenario | Use |
| S-03 Org rules | REQ-004, AC-004 | System | Team change | Rules follow presence | Definition change | Normal | DS-006 / R-6 | Rule absent/back, notified | requirements | Supported Normal Scenario | Use |
| S-04 Stop/reopen | REQ-005, AC-005 | User | User | Stop and reopen | Org Stop/open | Normal | DS-003 | Units stopped / followed on reopen | requirements | Supported Normal Scenario | Use |
| S-05 conversion | REQ-007, AC-006 | Operational | Upgrade | Keep existing Orgs | Startup | Normal | DS-005 | Converted, nothing lost | DEC-001 | Supported Normal Scenario | Use |
| S-06 Org follow | REQ-009, AC-008 | User/System | Author | Mount/unmount | Definition change | Normal | DS-006 | Join Offline / leave | DEC-002 | Supported Normal Scenario | Use |
| S-07 peer members | REQ-008, AC-007 | System | Peer Team copy | Delegating node follows | Peer notice / contact | Normal | DS-007 | Entry updated | DEC-003 | Supported Normal Scenario | Use |
| S-08 delegation from an Org unit | Preserved boundary (requirements § Preserved Behavior Boundary: "delegation from Org units … look and work as today"); contract §2.3 step 2; `agent_orgs.md:222-225` | System | An Org agent or Team member delegates with `delegate_task` (a catalog run, or a copy of another unit, R-1''') | The delegated run works and hands off to the Org's units by their Org addresses, as its handoff rules say (`delegationSourceAt` gives a copy the Org rules from its members) | `delegate_task`, then the task agent's `send_message_to` | Normal | `delegate_task` → copy started with `delegatedFrom` = unit run (contract §6) → task agent `send_message_to('/software_engineering_team/solution_designer')` → own root miss → `CollaborationTree.resolve` → `stepTwo` → assigner = unit run → `standingOf(unit run)` | Reach the Org's agents by Org address, as before | B-4 test at base; docs; `delegationSourceAt` (`org-container-directory.ts:118-143`) writes Org rules into the copy | Supported Normal Scenario | Use |

### Candidate Finding And Mechanism Gate

| Candidate ID | Observation Or Mechanism | Scenario / Contract ID | Independent Trigger | Forward Path / Lifecycle / Consequence | Evidence | Disposition | Scope, if promoted | Reason / Proportionate Response |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C-01 | A run delegated by an Org unit no longer reaches the Org's agents by Org address (step 2) | S-08 | `delegate_task` by an Org member | Step 2's assigner is the unit run, and its standing is its own agents (team space for a Team unit). A copy's Org-rule handoff, or any address of another unit, is `COLLABORATION_TARGET_NOT_FOUND`. Converted delegations (migration §6 rewrites `delegatedFrom` to the unit run) lose it too. | `collaboration-tree.ts:175-194`; `run-own-agents-reader.ts:74-83`; base B-4 test; `agent_orgs.md:222-225` | **Promote** | This ticket (preserved boundary) | CR-001: the design must say how step 2 composes for a run whose assigner is a unit (for example the unit's container placements at Org addresses, and how a Team unit's team-space standing relates to them) |
| C-02 | Current runtime keeps released-Org-tree (pre-conversion) read/write branches beside the container path | Principle 5/8 (current-schema runtime; holds in every context); design § Persisted Data ("a failed Org run is isolated: excluded from lists and restore") | — (structural) | `agent-org-run-history-catalog-service.ts` archive/delete fall back to `AgentOrgRunExecutionTreeStore` for a non-container; `collaboration-root-history-service.ts:71-72` reads it with that store. Readiness never admits an unconverted Org (`root-run-package-current-validator.ts:213-215`); `getCatalogRow` returns null for unadmitted rows (`collaboration-run-history-catalog-core.ts:73`); lists are admitted-only. So the branches are unreachable through supported paths: dead legacy code in touched files | Code read | **Promote** | This ticket | CR-002 |
| C-03 | Slice 4 left two Org-only hosting modules with no importers: `agent-collaboration/execution/backends/root-agent-execution-registry.ts` (146 lines) and `root-team-execution-directory.ts` (91 lines, the "Org-mounted, fixed" `TeamRunMembership` branch); `team-run-membership.ts:15` still documents it | Principle 7; design Removal Plan ("member hosting inside `AgentOrgRun` … removed"; "`TeamRunMembership`'s 'Org-mounted, fixed' branch … Removed") | — | No importer in `src` or `tests` at HEAD (`git grep`); at base only the removed Org files imported them | `git grep` at `755cea4711` and `46e53e9ed0` | **Promote** | This ticket | Part of CR-002 |
| C-04 | `run-history/services/agent-run-history-catalog-service.ts` goes from 491 to 504 effective lines (532 → 546 raw) with `recordPreparedUnit` (+14) | Size rule (> 500, the change takes it over) | — | — | Size audit below | **Promote** | This ticket | CR-003: put the new method in an owned file (or move an existing cohesive block), as earlier tickets did |
| C-05 | The insertion separated `DelegatedRunStatesHandler`'s doc comment ("autobyteus-591 DN-2 …") from its type: it now sits above `PeerRunMembersHandler` (`peer-gateway.ts:98-105`) | Principle 15 (readability) | — | Misleading doc | Diff | **Promote** (minor) | This ticket | CR-004: move the comment back |
| C-06 | `OrgContainerPort` has 9 read-only methods; design R-2 named three (`placementAt`, `sameContainer`, `orgRulesFrom`) | Principle 10/13; design R-2 | — | Each added method has one subject (one container) and serves a named need (refusal, delegation source, view commands, Org address presentation). It delivers nothing. No problem caused, but the handoff does not record the deviation | `org-container-port.ts` | Reject as a defect; record | — | N-1: record it with its reason in the handoff (reason holds) |
| C-07 | View composition uses a synchronous relay with live parts read at the base; design R-3'' asked for per-unit `openViewSnapshotConnection` with queued events | design R-3'' (AR-002) | — | The exactly-once guarantee holds because unit roots publish synchronously to their subscribers (`org-unit-views.ts` `subscribe` on `root.subscribeToEvents` / `run.subscribeToEvents`) and the live parts are read before the first await (`org-view-composition.ts` `snapshot`). Tested (`org-view-composition.test.ts`). Not recorded as a deviation | Code read | Reject as a defect; record | — | N-1: record it with its reason (holds) |
| C-08 | Decision 1: converted never-started agent units are `prepared` with an expiry already past | Contract §4 | — | The sweeper skips contained runs (`agent-run-provisioning-service.ts:194`) and activation does not check expiry. No loss | Code read | Reject | — | Reason holds |
| C-09 | `encode` rewrites log lines with a fixed key set | Contract §5/§9 ("unchanged") | — | The stored line shape is exactly those seven keys plus `counterpart` (`collaboration-communication-message.ts`); the bytes change, the content does not | Code read | Reject | — | — |
| C-10 | The synchronous composed Org read fills agent units' launch from the Org default | Data tightness | — | Its only consumer, the context-file owner resolver, uses ownership and `memoryDir` only | `context-file-owner-resolver.ts:71` | Reject | — | No consequence |
| C-11 | Orphan unit runs if the process dies mid-create (units made before the container file) | Infrastructure failure | Crash | Out of scope by default (Principle 6) | — | Reject | — | — |
| C-12 | Decision 4: the Org-level notice keeps the header "Your team changed…" for a direct Org agent | design § Exact Texts | — | The design reuses autobyteus-22's texts unchanged | — | Reject | — | Follows the design; wording is the Solution Designer's |

## Structural / Design Checks

| Check | Result (`Pass`/`Pass — deviation recorded, reason holds`/`Fail`) | Evidence | Required Action |
| --- | --- | --- | --- |
| Task design health assessment is present, evidence-backed, and preserved by the implementation | Pass | Boundary issue resolved: units are runs, the container hosts nothing, Team logic runs once (Team roots) | — |
| Implementation matches approved behavior-defining supplemental artifacts | Pass | Storage contract §2–§6, §9, §11 match the writers and the conversion; autobyteus-22 texts reused | — |
| Data-flow spine inventory clarity and preservation | Pass | DS-001..DS-007 each have one driver in code | — |
| Ownership boundary preservation and clarity | Pass | Container lifecycle (manager), live view/commands (`LiveAgentOrgContainer`, `OrgViewComposition`), the one container-fact answerer (`OrgContainerDirectory`), the Team-unit address boundary (`ContainedTeamAddressSpace`) | — |
| Off-spine concern clarity | Pass | Unit run services behind `AgentOrgUnitRuns`; stores; notices through the existing source | — |
| Existing capability/subsystem reuse check | Pass | Cross-run delivery, Team roots, standalone roots, autobyteus-22 membership and notices, peer gateway, sealed migration runner | — |
| Reusable owned structures check | Pass | `composeOrgExecutionTree` serves view, history and location; `ContainedTeamAddressSpace` is the one translator | — |
| Shared-structure/data-model tightness check | Pass | Container file holds references only; `formerUnits[i].leaving` mirrors autobyteus-22 | — |
| Repeated coordination ownership check | Pass | `same_container` is decided once (N-1); Org-rule presence is derived once (`rulesFromIn`) | — |
| Empty indirection check | Pass | `AgentOrgUnitRuns` translates the plan into the run services' inputs and owns discard; not pass-through | — |
| Scope-appropriate separation of concerns and file responsibility clarity | Pass | `container/`, `membership/`, migration folder | — |
| Ownership-driven dependency check | Pass | Units hold only `containedIn` and ask the directory (passed by the composition root); the container drives the unit lifecycle | — |
| Authoritative Boundary Rule check | Pass | Readers ask `OrgContainerPort`; none read the container file and a unit's tree side by side | — |
| File placement check | Pass | As the design's mapping | — |
| Flat-vs-over-split layout judgment | Pass | — | — |
| Interface/API/query/command/service-method boundary clarity | Pass — deviation recorded, reason holds | `OrgContainerPort` grew to nine read-only methods, each with one subject (C-06). The reason holds, but it is recorded only here, not in the handoff | N-1: record in the handoff |
| Naming quality and naming-to-responsibility alignment (Principle 15) | Fail (minor) | C-05: misplaced doc comment in `peer-gateway.ts`; `team-run-membership.ts:15` documents a removed branch (part of CR-002) | CR-004, CR-002 |
| No unjustified duplication of code / repeated structures in changed scope | Pass | — | — |
| Patch-on-patch complexity control | Pass | Initial round | — |
| Dead code removed in the touched files and modules (Core Principle 7) | **Fail** | C-02 (released-tree branches and `AgentOrgRunExecutionTreeStore` use in two touched services), C-03 (two orphaned hosting modules, 237 lines) | CR-002 |
| Relevant test scenarios and assertions are clear and requirement-aligned | Pass | Container lifecycle, messaging, storage contract, composition exactly-once, migration fixtures for every shape, OF-01..05 e2e. Gap: no test for step 2 from a run delegated by a unit (CR-001) | With CR-001 |
| Test fixtures/helpers are reasonably reusable and test structure remains coherent | Pass | `released-org-tree-v1-fixtures.ts`, `stored-org-container.ts` | — |
| No stale, duplicated, or compatibility-only tests are retained in changed scope | Pass | Org-root tests removed with the root | — |
| API/E2E readiness for the next workflow stage | Fail | CR-001 contradicts a preserved behavior that API/E2E would test (delegation from Org units) | After CR-001 |

## Source File Size And Structure Audit (If Applicable)

Effective non-empty lines [raw `wc -l`], base `755cea4711` → `46e53e9ed0`:

| Source File | Before | After | `>500` Hard-Limit Check | `>220` Delta Check | SoC / Ownership Check | Placement Check | Preliminary Classification | Required Action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `run-history/services/agent-run-history-catalog-service.ts` | 491 [532] | **504 [546]** | **Fail — this change takes it over** | Pass | Pass | Pass | Local Fix | CR-003 |
| `agent-collaboration/delegation/delegation-index.ts` | 490 [536] | 492 [538] | Pass | Pass | Pass | Pass | — | — |
| `agent-execution/runtime/general-process-run-supervisor.ts` | 465 | 475 | Pass | Pass | Pass (wiring) | Pass | — | — |
| `agent-team-execution/domain/root-team-run.ts` | 464 [499] | 465 [500] | Pass | Pass | Pass | Pass | — | — |
| `agent-team-execution/services/agent-team-run-manager.ts` | 461 [499] | 462 [500] | Pass | Pass | Pass | Pass | — | — |
| `agent-collaboration/delegation/collaboration-tree.ts` | 260 | 360 | Pass | Pass (+125) | Pass | Pass | — | — |
| `agent-org-execution/services/agent-org-run-manager.ts` | 446 | 362 | Pass | Pass | Pass | Pass | — | — |
| New files (`container/*`, `membership/*`, migration) | 0 | ≤ 319 each | Pass | Pass | Pass | Pass | — | — |

## Legacy / Backward-Compatibility Verdict

| Check | Result | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms in changed scope | Fail | C-02: archive/delete and the history projection read the released Org tree with `AgentOrgRunExecutionTreeStore` beside the container path |
| No legacy old-behavior retention in changed scope | Fail | C-03: the Org root's hosting modules remain (unreferenced) |
| Dead code removed in the touched files and modules (Core Principle 7) | Fail | CR-002 |
| Approved persisted-data transition decision is followed without unnecessary migration work | Pass | `Migration Required`, as designed, with follow-ups and isolation |
| No version-specific dual reads/writes or request-time old-shape fallback exists | Fail | C-02 |
| Approved transition mechanics match the reviewed design | Pass | Ordering, retry recognition, residue, reader wait, failed-Org isolation (readiness) |

## Dead / Obsolete / Legacy Items Requiring Removal (Mandatory If Any Exist)

| Item / Path | Type | Evidence | Why It Must Be Removed | Required Action |
| --- | --- | --- | --- | --- |
| `agent-collaboration/execution/backends/root-agent-execution-registry.ts` | ObsoleteFile | No importer at HEAD (`git grep`); at base only the removed Org root files imported it | Removal Plan: member hosting inside the Org root is removed | Delete |
| `agent-collaboration/execution/backends/root-team-execution-directory.ts` | ObsoleteFile | Same | Removal Plan: the "Org-mounted, fixed" `TeamRunMembership` branch is removed | Delete; fix `team-run-membership.ts:15` |
| Released-tree branches in `run-history/services/agent-org-run-history-catalog-service.ts` (archive `:98-…`, delete `:143-…`, and their compensation/readback through `this.trees`) | LegacyBranch | Unadmitted Orgs never reach archive/delete through supported paths (readiness `root-run-package-current-validator.ts:213-215`; admitted-only rows) | Current runtime is current-schema-only (Principle 5/8); design isolates failed Orgs | Remove; the container path stays |
| Released-tree read in `run-history/services/collaboration-root-history-service.ts:71-72` (`this.orgTrees.read`) | LegacyBranch | `getCatalogRow` returns null for an unadmitted Org (`collaboration-run-history-catalog-core.ts:73`) | Same | Remove; a non-container Org is not projected (warn, as for an unreadable run) |
| `run-history/store/agent-org-run-execution-tree-store.ts` (and its writer use) | DormantPath | Its only current users are the two branches above (`grep`) | Same | Remove with them, unless another current reader remains after the change |

## Docs-Impact Verdict

- Docs impact: `Yes`. Done for the container. `docs/modules/agent_orgs.md:222-225` still describes step 2 from the Org's standing agents, which no longer applies (CR-001); it follows the Solution Designer's decision.
- Files: `collaboration_model.md`, `agent_orgs.md`, `agent_memory.md`, `agent_team_execution.md`, `GLOSSARY.md`, `release-notes.md`. Delivery verifies.

## Additional Material Premise Validation (When Required)

### Upstream Design-Review Material-Premise Decisions

| Premise ID | Current Status | Changed Evidence / Reason |
| --- | --- | --- |
| ARCH-REV-005 residual notes, ARCH-REV-007 items | Confirmed | As listed in the handoff (self-target refusal, migration classification test, §9 fixtures, exactly-once test, release notes, §5 counterpart both lines, §11 ownership) |

### `MP-CR-01` — step 2 for a run delegated by an Org unit

- Origin: `New`
- Related approved requirement or established contract: requirements § Preserved Behavior Boundary ("delegation from Org units … look and work as today"); contract §2.3 step 2 (`agent_communication.md:428`, `agent_orgs.md:222-225`)
- Relevant behavior ID(s): BEH-001, REQ-003 (addresses), S-08
- Coherent product goal or governing event: an Org member delegates work; the delegated run follows its handoff rules to the Org's units
- Scenario validity: `Supported Normal Scenario`
- Initiating basis kind: `User` / `System`
- Independent product-supported initiating trigger: `delegate_task` by an Org member (the R-1''' table allows a copy of another unit); the task agent's `send_message_to(<Org address>)`, which its rules name (`delegationSourceAt` includes the Org rules)
- Support evidence: base B-4 test; docs above
- Forward path: `delegate_task` → `delegatedFrom = { kind: agent | agent_team, runId: unit }` (contract §6) → task agent's `send_message_to` → own root miss → `CollaborationTree.resolve` → `stepTwo()` → `standingOf(unit run)`
- Lifecycle preconditions and material consequence: the Org address is not in the unit's standing, so `COLLABORATION_TARGET_NOT_FOUND`. A Team unit's standing exposes team-space addresses (`/solution_designer`) that collide with Org-space meanings. Converted delegations are affected too.
- Reachability: `Reachable`
- Review consequence: CR-001 (`Design Impact`)

## Review Scorecard (Mandatory)

- Overall score: `8.9/10` (simple average; not the decision rule)

| Priority | Category | Score | Why This Score | What Is Weak / Holding It Down | What Should Improve |
| --- | --- | --- | --- | --- | --- |
| `1` | `Data-Flow Spine Inventory and Clarity` | 9.3 | DS-001..DS-007 visible, each with one driver | — | — |
| `2` | `Ownership Clarity and Boundary Encapsulation` | 9.3 | Container hosts nothing; one directory answers container facts; one Team-unit address boundary | — | — |
| `3` | `API / Interface / Query / Command Clarity` | 9.2 | Single-subject, read-only port; signed peer request with link check | Port widened beyond the design without a recorded deviation (C-06) | N-1 |
| `4` | `Separation of Concerns and File Placement` | 8.9 | Owned folders for container, membership, migration | One file taken over 500 lines (CR-003) | CR-003 |
| `5` | `Shared-Structure / Data-Model Tightness and Reusable Owned Structures` | 9.2 | Container file references only; composition reused | — | — |
| `6` | `Naming Quality and Local Readability` | 9.0 | Consistent unit, container and former-unit vocabulary | Misplaced doc comment; a doc describing a removed branch | CR-004, CR-002 |
| `7` | `API/E2E Readiness` | 8.6 | Strong unit, migration and built-server coverage | A preserved behavior contradicted (CR-001), with no test for it | CR-001 |
| `8` | `Runtime Correctness And Behavioral Fidelity` | 8.5 | DS-001..DS-007 traced and correct; migration retry-safe; FU-003 linked | Runs delegated by Org units lose step-2 reach (CR-001) | CR-001 |
| `9` | `No Backward-Compatibility / No Legacy Retention` | 8.6 | Clean container runtime | Released-tree branches kept in two touched services (C-02) | CR-002 |
| `10` | `Cleanup Completeness` | 8.4 | Large removal done | 237 lines of orphaned hosting modules; dead legacy store use | CR-002 |

## Findings

| ID | Finding | Evidence | Required Action | Classification | Owner |
| --- | --- | --- | --- | --- | --- |
| CR-001 | Runs delegated by an Org unit lose step-2 reach to the Org's agents by Org address: the delegating run is now the unit run, whose standing is only its own agents (team space for a Team unit). This contradicts the preserved boundary "delegation from Org units … as today", contract §2.3 step 2 as documented (`agent_orgs.md:222-225`) and tested at base (B-4). A copy's own Org-rule handoffs (which `delegationSourceAt` gives it) point to addresses it cannot reach. Converted delegations are affected too. | C-01, MP-CR-01; `collaboration-tree.ts:175-194`; `run-own-agents-reader.ts:74-83` | Decide how step 2 composes when an assigner is a unit run (for example the container's placements at Org addresses, plus how the unit's own team-space standing relates to them). Add it to the design and implement it, with a test entering through `send_message_to` from a run delegated by an agent unit and by a Team unit member. Update `agent_orgs.md`. | `Design Impact` | Solution Designer |
| CR-002 | Dead legacy code left in touched code: released-Org-tree branches (archive, delete, history projection) and the `AgentOrgRunExecutionTreeStore` they use; the Org root's hosting modules `root-agent-execution-registry.ts` and `root-team-execution-directory.ts` (no importers), named in the Removal Plan; the stale doc at `team-run-membership.ts:15` | C-02, C-03; Dead / Obsolete table | Remove them as listed; a non-container Org is left out with a warning where it is met (it is never admitted) | `Local Fix` | Implementation engineer |
| CR-003 | `agent-run-history-catalog-service.ts` taken over 500 effective lines (491 → 504) | C-04 | Move `recordPreparedUnit` (or an existing cohesive block) into an owned file | `Local Fix` | Implementation engineer |
| CR-004 | Misplaced doc comment in `peer-gateway.ts:98-105` | C-05 | Move `DelegatedRunStatesHandler`'s comment back above its type | `Local Fix` | Implementation engineer |

Note N-1 (documentation, for the next implementation round): record in the handoff, as deviations with their reasons, (a) the widened `OrgContainerPort` (C-06) and (b) the synchronous relay in place of R-3''s per-unit snapshot connections (C-07). I judged both reasons to hold.

## Follow-ups

Findings outside this ticket go in the ticket's `follow-ups.md`.

- Follow-ups this review added: None.

## Classification

- CR-001: `Design Impact` (Solution Designer).
- CR-002, CR-003, CR-004: `Local Fix` (implementation), with N-1 documentation.
- Combined route: the ticket goes to the Solution Designer, because CR-001 needs a design decision. The local fixes do not depend on it and can go in the same implementation round.

## Recommended Recipient

Solution Designer (`get_handoff_rules`: Design Impact), with CR-002..CR-004 and N-1 included for the next implementation round. After it: source review again (a delta or a re-audit, depending on what the CR-001 change touches), then API/E2E.

## Residual Risks

- Real-runtime, two-node and rendered-view proof is pending (API/E2E per the Verification Intent).
- AC-006 conversion has been proven only on hand-built fixtures (correct by the guideline: never on real data).
- Decision 1 (`started`/`prepared` from traces or the provider conversation) depends on the released member folders being complete. An agent with history but no trace file would convert as `prepared` and start fresh. Unlikely, since released members wrote traces.
- FU-001 remains (memory sync of contained runs).

## Latest Authoritative Result

- Review Decision: `Fail`
- Review Entry Point: `Implementation Review`
- Supported Product Scenario Gate: `Fail` (S-08 contradicted)
- Material-Premise Gate: `Fail` (MP-CR-01)
- Score Summary: 8.9/10 average; below 9.2 in Separation of Concerns (8.9), Naming (9.0), API/E2E Readiness (8.6), Runtime Correctness (8.5), Legacy (8.6) and Cleanup (8.4)
- Failure Origin: N/A (implementation review)
- Recommended Recipient: Solution Designer
- Notes: Classification Large/High is preserved. The container, messaging, Org follow, migration and FU-003 paths are otherwise sound and well tested.
