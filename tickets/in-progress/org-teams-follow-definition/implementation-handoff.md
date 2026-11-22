# Implementation Handoff

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: independent architecture review was selected (Large / High). ARCH-REV-005 passed design revision SR-010 with residual notes; ARCH-REV-007 passed the storage contract (SR-011, SR-012). The handoff rule for Large / High routes to `/code_reviewer`.
- Requirements doc: `tickets/in-progress/org-teams-follow-definition/requirements-doc.md` (SR-007: REQ-001 … REQ-009, AC-001 … AC-008, DEC-001 … DEC-006)
- Investigation notes: `tickets/in-progress/org-teams-follow-definition/investigation-notes.md`
- Solution revision record: `tickets/in-progress/org-teams-follow-definition/solution-revision-record.md` (through SR-012)
- Design spec (required on every route): `tickets/in-progress/org-teams-follow-definition/design-spec.md` (SR-010 and its R-sections)
- Supplemental task artifacts: `org-container-storage-contract.md` (normative on-disk contract, §1 … §12), `contract-validation.md`, `follow-ups.md`, `handoff-architecture-design.md`, `release-notes.md` (draft written in slice 8)
- Design review report: `tickets/in-progress/org-teams-follow-definition/design-review-report.md` (ARCH-REV-005, ARCH-REV-007, ARCH-REV-009 on SR-013/SR-014)
- Triggering code review: `code-review-report.md` CRR-001 (CR-001 Design Impact; CR-002 … CR-004 Local Fix; N-1)
- Architecture review revision record: `tickets/in-progress/org-teams-follow-definition/architecture-review-revision-record.md`
- Working notes kept during the implementation: `implementation-progress.md` (slice plan and every decision taken)

## Current Implementation Summary

An Org run is now a **container of runs**. Each mounted Team is a Team run of its own and each direct agent an agent run of its own, each with the fixed back-link `containedIn { orgRunId, address }`. The container hosts no agent, has no message log and keeps its units, former units and Org-level rules (storage contract §2 … §4). On top of that:

- units message each other by Org address across their runs (both logs, `same_container`);
- a unit's rules are its own plus the Org rules from its Org address, filtered by member presence (REQ-004);
- Team units follow their Team definition through autobyteus-22 unchanged; the Org follows its Org definition (units join Offline, leave as former units, a running one finishes first, shown leaving);
- the Org view, rows and history are composed from the units, so the Org still looks and works as one;
- stored Org runs are converted at startup by `20261122_agent_org_units_own_runs_v1` with one follow-up per earlier writer or reader;
- FU-003: a peer Team copy's members are kept current on the delegating node by a signed notice after each change, reconciled from the run summary at the next contact.

The work was done in the eight slices of the design's Change Sequence; each kept the server build green.

- Implementation cycle: `Rework` (IR-002: design revisions SR-013/SR-014 after CRR-001 CR-001, and CRR-001's Local Fixes)
- Implementation revision record: `tickets/in-progress/org-teams-follow-definition/implementation-revision-record.md`
- Current implementation revision ID: `IR-007` (IR-001 baseline, IR-002 SR-013/SR-014 and CRR-001, IR-003 CRR-002, IR-004 CRR-004 and SR-015, IR-005 CRR-006, IR-006 SR-016..SR-018 after DR-001, IR-007 CRR-009)
- Related solution revision IDs: `SR-010` … `SR-018`
- Related architecture-review revision IDs: `ARCH-REV-005`, `ARCH-REV-007`, `ARCH-REV-009`, `ARCH-REV-010`, `ARCH-REV-011` … `ARCH-REV-013`
- Related code-review revision IDs: `CRR-001` … `CRR-009`
- Related API/E2E revision IDs: `API-REV-001` (the failure CRR-004 reviewed), `API-REV-002` (the failure CRR-006 reviewed)
- Related delivery revision IDs: `DR-001` (integration refresh blocked; resolved here)
- Triggering finding IDs: IR-007: `CR-008`, `CR-009` (CRR-009 Local Fix). IR-006: DR-001 (via SR-016), AR-011 (via SR-017), AR-012 (via SR-018), passed by ARCH-REV-013. IR-005: `F-5` (CRR-006 Local Fix). IR-004: `F-1`, `F-2`, `F-3`, `F-4` (CRR-004 Local Fix) and SR-015 (CRR-004 A-1, passed by ARCH-REV-010). IR-003: `CR-005`, `CR-006`, `CR-007`, `CR-002` (remaining), all Local Fix. IR-002: `CR-001` (Design Impact, realized through SR-013 R-8 and SR-014), `CR-002`, `CR-003`, `CR-004` (Local Fix), `N-1` (deviations recorded below). IR-001: N/A (ARCH-REV-005 residual notes and ARCH-REV-007 items addressed below).
- Commits on `codex/org-teams-follow-definition` (base `origin/personal` `9f6add773b`; since IR-006 merged with `f2c0d2a902` in `21622d75e9` and `a07d6fbac8` in `b933110420`):
  - `1c77d18f56` slice 1 part 1; `7f37435ebc` slice 2; `a3a6b227b1`, `8755ed6343`, `254c5a3a4b`, `ac0825d43a` slice 3 parts 1 … 4; `b324211623` slice 4;
  - `f69004e722` slices 5 … 7: migration, Org follow (with the web Leaving tag and the Org follows e2e), FU-003, the stored-Org reader fixes, and the existing tests moved to the container end state;
  - the slice 8 commit that follows it: docs, release notes draft, this handoff, the revision record and the evidence.

## IR-007 (CRR-009 Local Fixes CR-008, CR-009)

- **CR-008: the node pass's byte pre-check is exact on every platform.**
  - The needles now come from the moves themselves (`moveNeedles`): each move's resolved old folder, stored raw and JSON-encoded (`JSON.stringify(from).slice(1, -1)`).
  - On Windows, a JSON or JSONL candidate stores `C:\\…\\agent_orgs\\<org>\\…`, which the old literal `agent_orgs/<orgRunId>/` never matched. The pass then parsed nothing, reported success, and the container file marked the Org converted with every path stale.
  - The needles are narrower than the Org ID. `movedPath` still decides exactly, and an injectable `PathSemantics` defaults to `node:path`.
  - The migration header and `org-path-rewrite.ts` note the platform point: the design's literal is POSIX shorthand.
  - Tests (`agent-org-units-path-rewrite.test.ts`, "CRR-009 CR-008"), with `path.win32`:
    - the needle finds a JSON-encoded Windows path, while the POSIX literal does not;
    - `movedPath` maps it, and leaves a sibling `team10` alone;
    - a real node pass on real files moves a log line's, a trace's and an ad-hoc Task's Windows paths, keeps prose and another drive's path, and a second pass moves nothing.

    The pass case fails with the old pre-check.
- **CR-009: an agent unit's cross-node file**, in `org-units-remote-files-and-renewal.test.ts`. The unit's own standalone root (`StandaloneAgentRunRootManager`, run file with `containedIn`) places a peer file by run ID in `agents/<runId>/received_files/<sender>/<name>`. The log line and the agent's input name it.
- Validation: see `evidence/implementation/ir-007/test-summary.md`.

## IR-006 (SR-016 re-integration with the base; SR-017 typed path rewrite; SR-018 gating)

- **SR-016: `origin/personal` is merged**: `f2c0d2a902` in merge commit `21622d75e9` (`git merge` worked here), then the newer `a07d6fbac8` (14 commits, autobyteus-579 and others; clean, one server file, `file-explorer.ts`) in `b933110420`. Org units are ordinary Team and agent runs, so autobyteus-587 (cross-node files) and autobyteus-599 (lost-session renewal) reach them through their own roots.
  - The 20 Org-hosting files the base extended stay deleted, and so does `tests/helpers/org-migration-continuation-fixtures.ts`.
  - The line conflicts take both sides, minus the Org-hosting code:
    - the `AgentOrgExecutionScopeBuilder` wiring in the supervisor;
    - `TeamRunMessageDelivery.deliverExact`, which the base removed (run-ID routing now goes through `sendToPeerRun` with `node`); this ticket's `addressSpace()` stays;
    - the Org root cases in `remote-message-view-sequence` and `org-owned-team-local-agent`;
    - the Org placements of `configured-root-first-work-fixture`;
    - `collaboration_model.md`: the base's CM-10 row, plus this ticket's CM-3 row.
  - FU-003's handler and the `peerRunMembers` path sit on the base's node path (`peer-gateway.ts`, `remote-collaboration-composition.ts`). The gateway tests and the two-server e2e list the path next to the base's received-files paths. RC-56's run-ID send now passes `node`, which 587 requires.
  - `remote-message-routing.test.ts` is dropped. This ticket's edit to it only removed the Org root case, and the base's replacement tests have none.
  - `LiveAgentOrgContainer.remoteNodeOf()` returns `null`.
  - `receivedFiles`: every unit run is created through the shared `TeamRunService.createTeamRun` and `AgentRunService.prepareAgentRun` (`agent-org-unit-runs.ts`), so nothing bypasses the base's wiring.
  - This ticket's tests take the base's new required inputs (`receivedFiles`, `nodes`, `outgoing`). The base's renewal test drops its unreachable Org branches.
- **SR-017: the typed path rewrite**, `org-path-rewrite.ts`, frozen with the migration.
  - An exact prefix map, compared after `path.resolve`: `<memoryDir>/agent_orgs/<org>/<runId>/` becomes `agent_teams/<runId>/` or `agents/<runId>/`. A path under another data directory is unchanged.
  - Fields rewritten, through the frozen visitor (`listContextFileRecordSources` / `transformContextFileRecordLocators`):
    - message lines' `referenceFiles` in every run's logs, active and sealed;
    - the released JSON logs and Task delegation records (`updates[]` too);
    - traces' `media.*` and `file_attachments[].uri` in every agent folder (active, rotated and archived).
  - This module adds what the visitor does not cover:
    - agent runs' own `communication_messages_*` logs;
    - ad-hoc `task.json` (`referenceFiles`, and a comment's if present), written in the store's shape;
    - a trace's unterminated last line, kept as it is.
  - Prose, journals, provider sessions and the Org folders' residue are not visited.
  - A byte pre-check (`agent_orgs/<orgRunId>/`) skips every other file. Changed files are written whole (a temporary file, then a rename).
  - Reference IDs: none is stored. The Org route and the Team projection hash `messageId` and path when they read, so the rewritten path opens.
  - The SR-017 predecessor check is recorded in the migration header.
- **SR-018: gating.**
  - One attempt runs: classify; steps 2–5 per pending Org; one node pass with the union of the pending Orgs' committed moves; then the container file per Org whose steps and pass part succeeded (`writeConvertedContainer`, last).
  - The moves come from tree v1: a unit counts when its target folder is present and its source is gone. They are joined even when the Org's own step failed.
  - The pass sits after `writeUnitLogs`, not in the per-unit loop. A file that fails fails each Org whose prefix it names.
  - The writers of touched files join R-4 (c): `PATH_WRITER_PREDECESSORS` gives them a wait and a follow-up each:
    - `raw_trace_rotation_layout`, `team_communication_projection_addresses`, `raw_trace_active_file_name`;
    - `append_only_message_logs_v1`, whose follow-up already existed;
    - `delegated_run_own_attachment_links` and its follow-up.

    Every follow-up's pass also covers converted Orgs, with moves from their container files.
  - Not writers, with the evidence in the header and the registry test:
    - the project-task migrations write Project `task.json`, which has no path field;
    - `raw_trace_manifest_runtime_names` writes manifests only;
    - no migration writes an ad-hoc `task.json`.
  - `removeOrgLog`'s doc comment now matches the code.
- Tests:
  - `agent-org-units-path-rewrite.test.ts`, with the fixture `writeBeta7CrossNodeOrg`:
    - SR-017: every typed field moves and the file exists; the Org route opens it for both units, as do the Team projection and the agent run's records; prose and the foreign prefix stay; a re-run and a follow-up change no byte; an unparseable trace of an unrelated run is never parsed;
    - SR-018: an interrupt before the pass, without and with step 4, then a retry and a third start that changes no byte; a pass that fails leaves tree v1, and the retry completes; an interrupt after the pass changes only the container file on retry; an Org whose step fails is isolated while its real moves still apply; a writer predecessor pending (`waiting_for_…`), whose late output its follow-up converts; a writer's follow-up over a converted Org;
    - cost.

    All but the interrupt-after-pass case fail with the migration source at HEAD.
  - `org-units-remote-files-and-renewal.test.ts`, SR-016:
    - the container is registered, answers `remoteNodeOf` null and hosts no agent;
    - a file from another node to a Team unit's member lands in `agent_teams/<team>/<member>/received_files/<sender>/`;
    - an agent unit and a Team unit's member renew through the real supervisor, each first input beginning with the hand-over notice.
  - `running-agents-messaging.test.ts`: an agent unit gets a file by run ID with `node` over the node path, in `agents/<unit>/received_files/`.
  - `agent-org-units-late-predecessors.test.ts`: the classification is updated.
- **Cost:** one node pass on the synthetic large Org (10 Teams, 40 agents, 40,000 log lines), plus 200 agent runs and 120 Team members, about 140 MB, takes **838 ms** for the whole conversion. The user's real layout sizes were not read: no user data is touched (standing rule). The node's size here is an assumption, recorded as such.
- Validation: see `evidence/implementation/ir-006/test-summary.md`.

## IR-005 (CRR-006 Local Fix F-5)

- **F-5 (OC-13; REQ-004/DEC-005, REQ-009): a running Org follows its Org definition while an Org rule names a member that left its Team.**
  - Before: the follow planner compiled the Org rules as a launch does. `planAgentOrgContainer`, via `compileOrg`, threw `AgentOrg endpoint 'P/x' was not found.`, so the Org ignored every change.
  - Now: one rule, in the one place Org rule endpoints resolve. `CollaborationHandoffCompiler.compileOrg(org, compilation)` takes an opt-in `OrgHandoffCompilation`, following the pattern of `TeamHandoffCompilation`:
    - `launch` is the default, strict as before, and every other caller uses it: launch, definition save, admission, `AgentOrgRunPlanner.build`;
    - `running_org` keeps an endpoint `P/x` as written, as `from` or `to`, when `P` is a mounted Team and `x` is not in its current definition.
  - Every other invalid rule is refused as before: an unknown placement, an Agent as an intermediate segment, more than two segments, empty or untrimmed rules, a self-target, duplicates.
  - `planAgentOrgContainer` passes an optional `compilation` through. Only `OrgMembershipPlanner.viewFor` passes `running_org`; the follow on reopen goes through `viewFor` too.
  - The container keeps the rule as written, so `orgRulesFrom` leaves it out until `x` returns (unchanged), with the notices as today.
  - The launch path is untouched.
- Tests, in `org-follows-definition.test.ts`:
  - `viewFor` with a definition naming the absent `P/architecture_reviewer` in both directions:
    - a view is returned and both rules are kept;
    - the new `/writer` agent is planned, with no not-followed warning;
    - `planAgentOrgContainer` without the opt-in still throws (launch strict).
  - Three invalid endpoints are still not followed, each with its reason: unknown placement, Agent intermediate, three segments. Empty rules are still not followed.
  - Reopen: the Org is stopped, then restored with the same definition. `/writer` is created and the kept rule is in the stored container.
  - The two positive cases fail without the planner's opt-in.
- Validation: see `evidence/implementation/ir-005/test-summary.md`.

## IR-004 (CRR-004 Local Fixes F-1 … F-4; SR-015)

- **F-1 (AC-002): a Team unit's leaving member stays in the Org's view, rows and composition until it stops.**
  - One owner: `teamUnitMembersInOrg(tree, space, withLeaving)` in `org-execution-tree-composition.ts`. It gives the current members, plus the `leaving` former members, at their Org addresses. Leaving members are included only for a live Team unit; outside a live run a leaving marker reads as former (autobyteus-22).
  - Its readers:
    - `composeOrgExecutionTree`: a Team unit file read from a live unit carries `live: true`. Both `OrgViewComposition`'s snapshot and `learnAgents` mark it.
    - `RunOwnAgentsReader.containerTreeOf`: the Team part's members, with `leaving` kept.
  - `RunTreeView` builds the Org's Team member rows with `teamMemberRowsOf(part.members, isLiveTeamRun(teamRunId))`, the same rule as a Team's own rows. So a leaving member is tagged only while its Team run is live.
  - The leaving member's frames and status are relayed until it is released; then it is gone from the snapshot.
- **F-2: `list_running_agents` no longer lists Org units.**
  - `RunOwnAgentsReader.listingFactsOf` counts a run as started by a person only without `delegatedFrom` and without `containedIn`, for both agent and Team runs.
- **F-3: a stopped Org's mixed save keeps `launchSource`.**
  - `container-config-trees.ts` writes an agent unit's `launchSource` in both `writeAgent` and `withLaunch` (it was dropped before).
  - `orgAgentNodeOf` composes it back, so a reread returns what was saved, for agent units and Team unit members.
- **F-4: a Team run restores after a member change.**
  - `validateTeamRunStatePackage` counts a former member as an endpoint of the run. Its lines with an outside endpoint (another Org unit, a peer run) no longer make the package invalid.
  - The run's records source (`run-records-source.ts`, Team `isOwnAgent`) uses the same rule, so the run's view keeps those lines.
  - Other Team-log readers I checked:
    - the log writer (`RootTeamRun.messageLogOwnerOf`) already counted former members as its own, which is why it wrote lines the validator then refused;
    - `team-communication-projection-service.ts` and the package loader go through the validator;
    - the frozen validator serves only packages from before task-agent-own-run, which have no former members, so it stays frozen;
    - the member-view projections' `ownAddressOf` is presentation only.
  - `RemoteMessageReceiver.resolve` now logs why a target root could not be found, checked or restored: `REMOTE_TARGET_ROOT_UNAVAILABLE` with the error text. The sender still reads "not found".
- **SR-015 (CRR-004 A-1, ARCH-REV-010): another unit's message to a Team unit's former or leaving member at `P/x` is refused by name.**
  - New port method `OrgContainerPort.formerMemberAt(orgRunId, orgAddress)`, answered by `OrgContainerDirectory`:
    - it finds the current Team unit `P` above the address and translates `P/x` to `/x` through `ContainedTeamAddressSpace`;
    - it asks the Team's own `TeamExecutionIndex.formerMemberAt('/x')` over its tree: the live tree when the Team run is live, else its stored file. A stopped unit is never restored to answer;
    - it names the member at its Org address.
  - `CollaborationTree.resolve` checks `formerUnitAt` first (as before), then `formerMemberAt`. Either throws `formerMemberRefusal`: code `COLLABORATION_TARGET_NOT_FOUND`, autobyteus-22's exact text.
  - `agent_orgs.md` says so.
- Tests (each fails without its fix):
  - F-1: `org-view-composition.test.ts` ("F-1 (AC-002)") and `org-container-stored.integration.test.ts` (rows tagged leaving only while live).
  - F-2 and F-3: `org-container-stored.integration.test.ts` (`listingFactsOf` false for both kinds; `launchSource` reads back equal for both kinds).
  - F-4:
    - `team-run-current-package-schema.test.ts`: a former member's lines with another unit load in both directions; a line with no own endpoint is still refused;
    - `remote-message-receiver.test.ts`: the log line.
  - SR-015: `org-follows-definition.test.ts`, three cases:
    - idle (former), stopped Team unit;
    - leaving, stopped Team unit;
    - leaving, live Team unit, with the stored file left unread.

    Each case covers an agent unit (`/concierge`) and another Team unit's member (`pdp_team_1`) messaging `/software_engineering_team/architecture_reviewer` and getting the exact text. A current member is still reached; an address no member had is not refused by name.
  - Built server: the Org follows e2e's OF-04 now also has the direct agent message the removed writer at `/team/writer` and get the exact refusal.
- Validation: see `evidence/implementation/ir-004/test-summary.md`.

## IR-003 (CRR-002 Local Fixes)

- **CR-005**: the container-chain relation now applies under the Task rule's own condition, the delegated run having an open Task entry (as `canMessage` counts it). This is one rule for both directions, and `chainedUnitOf` uses it too.
  - A closed delegation is therefore related to no unit. A unit agent's message to its own closed delegation reaches the assigner's continuation in `admit` again (reopened and delivered).
  - Any other unit gets `TASK_AGENT_RESOURCE_CLOSED`, as at base and in IR-001.
  - Tests go through `send_message_to`: the agent unit (`writer_copy`) and a Team unit member (`pdp_copy`) each continue their closed delegation after the Task is set back to TODO, and a non-delegating unit is refused. The case fails without the condition.
  - `agent_orgs.md` now says "while its Task is open".
- **CR-006**: `chainContainerOf` and `relatedThroughContainer` moved out of `DelegationIndex` into their own `agent-collaboration/delegation/container-chain-relation.ts`, as functions over the index (`chainOf`, `tasksOf`) and the container port. `delegation-index.ts` is back to 492 effective lines.
- **CR-007**: `PeerRunMembersReceiver` declares its own port, `PeerRunMembersTaskSide`. `remote-collaboration-composition.ts` and the receiver no longer import `projects/`, so `tests/architecture/projects-boundaries.test.ts` passes. `tests/architecture` (all 13 files) is now part of my runs.
- **CR-002 (remaining)**:
  - `run-history/store/agent-org-run-execution-tree-store.ts` is deleted (migrations use the frozen copy).
  - Its unused test imports are removed; two migration tests that read released trees now import the frozen store; the allocator test keeps its filesystem-read check.
  - The tolerance tests' store-only cases now check the same claims through `validateAgentOrgRunExecutionTreePayload`: the exact current shape, no released-only fields, no `skillAccessMode`.
- Validation:
  - typecheck: production 0 errors, tests 974 in 300 files (baseline);
  - 357 files / 2591 tests pass: architecture, collaboration, Org execution, communication, remote, run history, memory, API, projects, migrations, integration. `tracked-imports` passes once the new file is tracked.
  - The built-server e2e was not rerun: this round's runtime changes are the open-entry condition and a type-only port.

## IR-002

- **R-8 reach** (`agent-collaboration/delegation/collaboration-tree.ts`):
  - In `stepTwo`, an assigner that is a unit run contributes its container's placements at Org addresses (`containerReach`, shared with `containerStepTwo`): every unit's agents, a Team unit's members as `P/x`, a Team unit's `P` answered by its coordinator, and every agent unit at its address. A Team unit's team-space standing is never exposed. Assigner order and first-wins are unchanged; the contribution has rank `configured`.
  - An assigner that is the container itself gets the same contribution. That covers a converted delegation that named no delegator (contract §6), since a container's own parts are empty.
  - `delegationPlacementAt` answers a container-reached address from the container's delegation source.
  - `reachingAddressOf` names a unit sender by its Org address.
- **SR-014 delivery**:
  - `DelegationIndex.chainContainerOf` and `relatedThroughContainer` hold the one fact: two runs are related through a container when one is a unit of the container of a unit (or the container itself) in the other's delegation chain.
  - `CrossRunMessageDelivery.route` decides `same_container` first, then the extended related, then the Task rule.
  - A delegated run's message to a unit agent (`chainedUnitOf`) is delivered as `related` (`deliverToUnit`): the receiver unit is restored when stopped, and neither line records `counterpart`.
  - A unit's message to such a run by run ID is related through `admit`. The fact is symmetric, as when every Org member was part of the assigner run (design: "a unit's message to such a delegated run by run ID is related as today").
  - The converted line equals the live line; tested through the conversion's split.
- **CR-002**:
  - The released-tree branches and `AgentOrgRunExecutionTreeStore` use are removed from `agent-org-run-history-catalog-service.ts` (archive/delete of a non-container answers "not found") and `collaboration-root-history-service.ts`.
  - The orphaned `root-agent-execution-registry.ts` and `root-team-execution-directory.ts` and the `team-run-membership.ts` comment are removed.
  - Tests that drove the removed branches now use stored containers: the Org catalog service test, and the history public-projection and scoped tests. The catalog test's package-removal-failure case covered only the removed branch and is dropped. Container delete removes the history row first, then the folders; that is unchanged from IR-001.
  - The refusal catalogue's M-15 ("The agent '<run id>' is not running, so the message was not sent.") is withdrawn. Only the orphaned registry produced it, unreachable since slice 4.
- **CR-003**: the catalog's per-memory-folder state (type, map, `getState`, reset, `cloneRows`) moved to `run-history/services/agent-run-history-catalog-state.ts`. `agent-run-history-catalog-service.ts` is now 470 effective lines (507 raw); the registry imports the reset from the new file.
- **CR-004**: `DelegatedRunStatesHandler`'s doc comment is back above its type.
- **Docs**: `agent_orgs.md` § Addresses And Handoffs (unit runs as assigners, related chain messages) and `collaboration_model.md` CM-5 (container rule, chain relation).
- Typecheck baseline shrunk to 974 in 300 files (the rewritten catalog test lost an old error).
- **IR-002 validation** (`evidence/implementation/ir-002/`):
  - New `tests/unit/agent-org-execution/container/org-delegated-run-messaging.test.ts` (7), entering through `send_message_to` (the real `SendMessageToDispatcher` and `GlobalAgentRunMessageRouter`):
    - from runs delegated by an agent unit, by a Team unit member, and by the container itself (converted, no delegator), reaching (a) an agent unit, (b) `P/x` and (c) `P`, each with the receiver stopped (restored) and live;
    - a unit's message to another unit's delegated run, by run ID (related);
    - `same_container` unchanged;
    - view rule;
    - the live-vs-converted identity of a delegation-chain line.

    The file fails without the change (verified by stashing the source).
  - B-4 updated to the container rule (the harness's Org is a container with empty parts); it fails without R-8.
  - Built-server e2e OF-06 (`delegate_task` by the Team unit's lead to `/concierge`, then the copy's `send_message_to('/team/writer')`): delivered, no `counterpart` on either line. OF-01 … OF-05 and AOML-1/2 pass.
  - Server suites: every failure outside the environment list was rerun alone and passes. One concurrent e2e run had broken the shared test database (`tests/.tmp`), which was recreated.

## Recorded Deviations (CRR-001 N-1)

- **`OrgContainerPort` has nine read-only methods** where design R-2 named three (`placementAt`, `sameContainer`, `orgRulesFrom`): `containedInOf`, `sameContainer`, `unitOfAgent`, `placementsOf`, `delegationSourceAt`, `orgRulesFrom`, `formerUnitAt`, `loadContainer`, `orgAddressOf`.
  - Reason: each has one subject (one container or one unit run) and serves one named need, each read where today's code asks the same question: a unit's step 2 and the address boundary; the same-container admission; view commands; a copy's snapshot; the former-unit refusal; Org address presentation. None changes state.
  - Keeping one answerer (N-1) is what the design asked for; splitting the answers over callers would duplicate reads of the container file.
- **The view composition uses a synchronous relay with the live units' parts read at the base**, where design R-3'' asked for per-unit `openViewSnapshotConnection` with queued events.
  - Reason: unit roots publish synchronously to their subscribers (`org-unit-views.ts` subscribes to `root.subscribeToEvents` / `run.subscribeToEvents`), and `OrgViewComposition.snapshot` reads the live parts before its first await, in the base's synchronous step. So every frame relayed before the base is in the parts and every later one follows the base: exactly once, without per-unit connections or queues.
  - Tested in `org-view-composition.test.ts` with continuous publishing while two views open.

## Routing Classification (Mandatory)

- Task size (`Small`/`Medium`/`Large`): `Large`
- Architecture risk (`Low`/`High`): `High`
- Design classification section / evidence reference: `design-spec.md` § Task Size And Architectural Risk; ARCH-REV-005, ARCH-REV-007.
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale for confirmation or change: the change reshapes Org execution into a container, adds a sealed data migration of every stored Org run, a new signed peer request type, and touches messaging, rows, history, memory readers and the view composition, as the design names.
- Selected route (`Direct API/E2E`/`Code Review`/`Solution Designer`): `Code Review`
- Lightweight implementation self-review completed for the direct route: `Not Applicable`
- New design impact or escalation trigger: `None` (two implementation decisions the contract leaves open are recorded below for review: the agent unit's activation state and the rotated unit logs)

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| DS-001 / REQ-001 / AC-001 | Starting an Org creates the container and one run per unit (Offline), configured from the one launch page | `agent-org-execution/container/agent-org-container-plan.ts` (`planAgentOrgContainer`), `agent-org-container-manager.ts` (`create`: units first, then the file), `agent-org-unit-runs.ts` (Team units by `createTeamRun`, agent units by `prepareAgentRun`, `containedIn`, §11 ownership), `services/agent-org-run-service.ts` (`create`) | Unit run IDs come from their own services; a failed creation discards the units made |
| DS-002 / REQ-003 / AC-003 / R-1''' | Units message each other by Org address across runs; stored in both logs with the other side's Org address; a receiver not running is restored (DEC-006) | `container/org-container-directory.ts` (the one `OrgContainerPort`), `agent-collaboration/delegation/collaboration-tree.ts` (container step 2, `reachingAddressOf`, former-unit refusal in `resolve`), `communication/cross-run-message-delivery.ts` (`same_container`), `agent-team-execution/container/contained-team-address-space.ts` (the one address boundary of a Team unit) | e2e OF-02 (real tool call, both logs) |
| REQ-004 / AC-004 / DEC-005 / R-6 | A unit's rules = its run's + the Org rules from its Org address; a rule to a member not in its Team is left out until it returns; its sender gets one net notice | `org-container-directory.ts` (`orgRulesFrom` presence filter, `orgRuleChangesFor`, Team members known synchronously: `bindLiveTeams`, loaded with the container), `agent-team-execution/membership/team-change-notice-source.ts` (Team and Org rule parts in one pending notice, `bindOrgRules`, `recordOrgChange`), `services/member-team-context-builder.ts`, `collaboration-tree.ts` `agentCollaboration` | unit tests; e2e OF-04 (rule gone, told; back, told again) |
| DS-003 / REQ-005 | One Stop stops every unit (and every leaving unit); reopening reads the container, units restored when needed | `agent-org-container.ts` (`stop`), `agent-org-container-manager.ts` (`restore` releases stale markers, `stop` clears them), `agent-org-containers.ts` | — |
| DS-004 / REQ-006 / R-3'' / R-7 | The Org view, commands, rows, history, memory and REST edges composed from units; unit runs are not top-level runs | `container/org-view-composition.ts` (synchronous relay; the snapshot reads live units at the base; `unitsChanged`), `live-agent-org-container.ts` (commands to unit roots), `agent-collaboration/delegation/run-tree-view.ts` (`readAtBase` over units, `prepare` for a stored container), `run-history/services/delegated-run-agents-reader.ts` (`openRunsBelow` over units, `prepare`), `participant-messages-reader.ts`, `run-history/store/run-own-agents-reader.ts`, `services/agent-streaming/org-view-session.ts` | AOML e2e: the converted Org serves exactly its released messages and references, rows show units' delegated runs |
| DS-005 / REQ-007 / AC-006 / DEC-001 | Stored Org runs converted at startup (contract §1 … §6, §9, §11); late predecessors handled | `app-data-migrations/migrations/agent-org-units-own-runs-v1/` (`released-org-tree-v1.ts`, `org-unit-targets.ts`, `org-log-split.ts`, `org-delegations.ts`, `org-conversion.ts`, `agent-org-units-own-runs-v1-app-data-migration.ts`, `agent-org-units-follow-ups.ts`), registered last in `app-data-migration-registry.ts` | see Migration below |
| DS-006 / REQ-009 / AC-008 / DEC-002 | The Org follows its Org definition: new units Offline; removed units leave (a running one finishes, tagged leaving, then stops); former unit's address refused by name; Org rules follow; remaining agents told (`Joined:`/`Left:`) | `agent-org-execution/membership/org-membership-change.ts` (pure plan, `releaseStoppedUnits`), `org-membership-planner.ts` (definition view, warn once), `org-definition-change-listener.ts`; `container/agent-org-container-manager.ts` (`follow`, `releaseStopped`), `agent-org-containers.ts` (`followDefinition`, `retire`, `tell`; follow on reopen), `domain/agent-org-container-file.ts` + `run-history/store/agent-org-container-file-schema.ts` (`formerUnits[i].leaving`), `run-own-agents-reader.ts` + `run-tree-view.ts` (leaving rows), `agent-execution/runtime/general-process-run-supervisor.ts` (wiring); web `components/workspace/history/AgentOrgRunMemberTree.vue` (Leaving tag) | unit tests; e2e OF-05 |
| REQ-002 / AC-002 | A Team inside a running Org follows its Team definition with every autobyteus-22 behavior | Team units are ordinary Team roots (`followsTeamDefinition` admits contained Teams); notices name Org addresses (`ContainedTeamAddressSpace`) | e2e OF-03 |
| DS-007 / REQ-008 / AC-007 / DEC-003 | A peer Team copy's members follow on the delegating node: notice after each committed change; reconcile at the next contact | peer node: `agent-collaboration/execution/remote/peer-run-members-notice.ts` (`withPeerRunMembers` in `agent-team-execution/domain/root-team-run.ts`), `remote-collaboration/channel/peer-client.ts` (`deliveredRunMembers`), `inbound/peer-started-run-launches.ts` + `remote-run-view-provider.ts` (summary `team`); delegating node: `api/rest/remote.ts` (`/remote/peer-run-members`), `channel/peer-gateway.ts` (parse, admission), `inbound/peer-run-members-receiver.ts`, `projects/domain/task-execution-resources.ts` (`setPeerRunMembers`), `projects/services/task-execution-resource-service.ts` (`updatePeerRunMembers`), `compositions/collaboration-composition.ts` (reconcile in `peerSummary`), `channel/peer-run-view-answers.ts` (`remoteRunMembersOf`) | unit + in-process tests through the real client, gateway and Task side |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`

## ARCH-REV-005 Residual Notes And ARCH-REV-007 Items

- Self-target `send_message_to(P)` from the coordinator keeps today's refusal (slice 2, unchanged path).
- Migration classification: `agent-org-units-late-predecessors.test.ts` classifies every earlier migration (writer, reader, rebuilder or none, each with its evidence) and fails on an unclassified one; one parameterized follow-up per writer and reader (`ORG_UNITS_FOLLOW_UPS`, 18); reader-wait (`READER_PREDECESSORS`: every Org waits while one is not terminal, then its follow-up converts it); `team_run_history_index_v2` checked by a late run (none, not a rebuilder).
- §9 fixtures: every released shape (agents only, Teams only, both, application-owned, collaborators residue, no log yet, a large rotated log), retry after an interrupted conversion, repeat start, a bad Org (fails alone, not loaded), a tree-less Org folder (preserved skip), reader wait, a JSON log waiting for 20261018, index rows of units removed, and the cost on a synthetic large Org (10 Teams, 40 agents, 40,000 lines: about 190 ms). Hand-built data only; never real data or a copy.
- Exactly-once composition: `org-view-composition.test.ts` (continuous publishing while two views open).
- Release notes: `release-notes.md` says rollback is not possible and an older peer refuses FU-003's request.
- FU-001 stays a follow-up (`follow-ups.md`).
- ARCH-REV-007: §5 counterpart on both lines with Org addresses (tests and AOML e2e); §9 non-current launch keys dropped (`skillAccessMode`), the Team name from the definition-name port (its ID when unknown), the Task-records file left as residue; §11 ownership on units.

## Implementation Decisions For Review

- **Agent unit activation state (contract §4).** The contract says "the current standalone agent metadata". The conversion writes today's activation fields:
  - **started** (with the Org's `createdAt`) when the agent can be restored as it ran: an external runtime with its provider conversation, or the server runtime with its own trace;
  - **prepared** otherwise.

  Without these fields a converted agent unit cannot be activated. The AOML e2e found this: "not in a supported activation state".
- **Unit logs rotated (contract §5).** Each unit log is written in today's append-only layout, sealed at 4 MiB (a frozen constant). A large Org log split into units therefore stays within the limit; the AOML e2e checks a 9.6 MB log.
- **Leaving unit.** A removed unit that is running becomes a former unit marked `leaving`, like autobyteus-22's former member:
  - its rows are tagged leaving;
  - its agents still take the Org view's commands, so a pending approval can be answered;
  - it stops once its view reports no open work, then a release write clears the marker;
  - Stop and reopen clear markers.
- **Notice text.** Org-level `Joined:`/`Left:` lines use autobyteus-22's notice unchanged, as the design's Exact Texts say. Its header, "Your team changed: its definition was updated.", is therefore also what a direct Org agent reads. Solution Designer may want to word an Org header; nothing else depends on it.
- **Stored Org readers.** Rows and participant reads of a stored Org now read the container once, before their synchronous step (`prepare`).

## Key Files Or Areas

- New: `agent-org-execution/container/*` (slices 1 … 3), `agent-org-execution/membership/*` (slice 6), `app-data-migrations/migrations/agent-org-units-own-runs-v1/*` (slice 5), `agent-team-execution/container/*` (slice 2), `agent-collaboration/domain/org-container-port.ts`, `remote-collaboration/inbound/peer-run-members-receiver.ts`, `agent-collaboration/execution/remote/peer-run-members-notice.ts`.
- Removed (slice 4): the Org root and its hosting machinery (`domain/agent-org-run.ts`, scope builder, persistence coordinator, state package loader/validator, Org message delivery, communication port, recipient resolver, tree mutator, runtime config projector, status projector, Org log store).
- Docs: `autobyteus-server-ts/docs/design/collaboration_model.md` (§1, §2.1, CM-3, §3, §5), `docs/modules/agent_orgs.md` (new "Org Container" section, runtime, persistence), `docs/modules/agent_memory.md`, `docs/modules/agent_team_execution.md`, `GLOSSARY.md` ("Org Runs").
- File sizes: `root-team-run.ts` stays at 500 lines; `delegation-index.ts` was 536 at base and is 538.

## Validation Evidence

Evidence folder: `tickets/in-progress/org-teams-follow-definition/evidence/implementation/ir-001/`.

- **Server typecheck** (`node ./scripts/typecheck.mjs`): production 0 errors; test files 975 in 301 (the baseline, shrunk in slice 4).
- **Web typecheck** (`pnpm -C autobyteus-web typecheck`): production 0; test files 86 in 36 (the baseline). PASS.
- **Server suites** (`tests/unit tests/integration tests/app-data-migrations`): see `evidence/implementation/ir-001/test-summary.md` for the counts and the environment-dependent failures (not this ticket's).
- **Migration**: `tests/app-data-migrations/agent-org-units-own-runs-v1/` (19 tests), plus every existing migration suite (103 files) passing.
- **Built-server e2e** (`dist/app.js`, scripted AGY CLI, no provider inference):
  - `tests/e2e/agent-org-runs/org-follows-definition.e2e.test.ts` (new, OF-01 … OF-05): 5/5, receipts in the evidence folder;
  - `append-only-message-logs-startup` (AOML-1/2: a released Org converted on startup, then resumed and messaged across its units with real tool calls; rotated unit logs);
  - `team-run-v1-production-upgrade` (4/4), `task-agent-own-run-startup` (TAU-1), `removed-skill-access-mode-history-graphql`: all pass.
- **Web**: `WorkspaceAgentOrg*.spec.ts` (20 tests, including the Leaving tag).

## Not Done Here / For API/E2E

- The Verification Intent's real-provider proof is not run here: isolated instances with real runtimes from the test vault, a test package's Org edited while running, two paired instances for AC-007, and the web app against the instance. The built-server e2e above uses the scripted AGY CLI; FU-003 is proven in-process through the real client, gateway and Task side.
- AC-006 on a real install's shapes: the fixtures follow the released code's shapes and the contract (learned by reading); the conversion was never run on real data.

## Environment-Dependent Failures (Not This Ticket's)

These were seen in this worktree's container and are unrelated to Org data:

- file watcher and package-folder watcher tests: no built watcher runtime;
- application-backend and Brief Studio tests: no built application `dist/`;
- `app-config` env text, Socratic app tests, unreadable package root, package auto-refresh;
- the studio HTTP contract: the test client address is admitted here (403 expected, 200 got);
- `node-vocabulary-stored-names-startup`: no `sqlite3` binary;
- `remove-built-in-project-task-manager-startup` E-002/E-004: the injected removal failure cannot fail as root;
- `remove-retired-built-in-agents-startup` RRB-1 and `remove-skill-improvement-data-startup` SID-2: their byte snapshot opens the node's control socket (ENXIO). Not verified on the base build here; none of these tests touches Org data.
