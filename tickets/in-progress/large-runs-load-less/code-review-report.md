# Code Review Report

## Review Round Meta

- Review Entry Point: `Implementation Review` (round 7, IR-006 for CR-004; SR-007/SR-008, ARCH-REV-008). Round 6: `API/E2E Failure-Origin Review` ( API-REV-002 API-08 L-002). Round 5: `Implementation Review` ( IR-005 for CR-003; SR-006, ARCH-REV-006). Round 4: `Implementation Review` ( IR-004 for CR-002; SR-004/SR-005, ARCH-REV-005). Round 3 was an `API/E2E Failure-Origin Review`. Rounds 1–2 were `Implementation Review`; their results stand except where round 3 updates them
- Requirements Doc Reviewed As Context: `requirements-doc.md` (approved SR-001; SR-003 adds DEC-004 with no visible change)
- Investigation Notes Reviewed As Context: `investigation-notes.md` (E-01…E-09, M-151/152/156/162/163, M-163b as cited)
- Solution Revision Record Reviewed As Context: `solution-revision-record.md` (SR-001…SR-003)
- Design Spec Reviewed As Context: `design-spec.md` (SR-003)
- Supplemental Task Artifacts Reviewed As Context: `evidence/IMP-clean-clone.log`, `evidence/IMP-local-checks.log`, `evidence/IMP-L010-ds007.log`
- Relevant Solution Revision IDs: SR-002, SR-003
- Design Review Report Reviewed As Context: `design-review-report.md` (ARCH-REV-003, Pass)
- Architecture Review Revision Record Reviewed As Context: `architecture-review-revision-record.md`
- Relevant Architecture Review Revision IDs: ARCH-REV-002, ARCH-REV-003
- Implementation Handoff Reviewed As Context: `implementation-handoff.md` (IR-002)
- Implementation Revision Record Reviewed As Context: `implementation-revision-record.md`
- Relevant Implementation Revision IDs: IR-001, IR-002, IR-003
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-007`
- Current Review Round: 7
- Round 7 Review Scope: `Full Re-Audit` of the changed areas, because the delta (`git diff 6ab1cfa81c 65a5b34c9b`, 109 files, mostly publisher constructions in tests) adds `last_message_change_sequence` to the three view contracts and changes the keep rule. Unchanged areas are carried forward from rounds 1–5
- Round 6 failure context:
  - API-REV-002 at head `6d717bed4a`; test changes in `59f4604da5`; server dist at `99cd853f79`.
  - Failing case: API-08 L-002 (one new delegation on a running hub), run with `pnpm -C autobyteus-web test:e2e:delegated-copies-large-hub --from-seed <--teams 12 --unrelated 50> --output-dir <fresh> --live [--cases L-001,L-002] --samples 1`, 4 of 4 runs.
  - Evidence: `evidence/api-e2e/API-08-r2-delegation-refetch.log`, `API-08-r2-hub-participant-requests.log` (lines 93/94), `API-07-08-r2-hub-probe-live.json`.
- Round 5 Review Scope: `Targeted Delta Review`. `git diff f11a8edeaa 99cd853f79` stays within CR-003's open path:
  - `RootEventPublisher.getLivePosition` / `RootTeamRun.getLivePosition`;
  - the Team resume config, its two additive GraphQL fields (`liveSequenceId`, `baseChangeSequence`) and the resolver;
  - the web read, the candidate's `rebuild`, and the commit;
  - regenerated `generated/graphql.ts` (two fields);
  - fixtures and docs.

  `585ae49761` and `24e96dd893` are ticket files only. The round-4 re-audit stands
- Round 4 Review Scope: `Full Re-Audit`, because the delta (`git diff 776d6b7d86 da91ae689a`, 82 files) adds a field to the three shared view contracts and the Team snapshot, and changes DS-002's reload rule. I re-audited the structural checks for the changed areas and the full scorecard; round-1 evidence for unchanged code is carried forward
- Review Scope: `Targeted Delta Review` (round 2). Round 1 was a `Full Review`; its evidence is carried forward
- Review Scope Evidence (round 2): `git diff e2aecff03e 438ea7fb65` stays within CR-001's files and behavior:
  - the two mobile screens;
  - a new 13-line status-words module;
  - the shared test stub;
  - the mobile spec.

  `b3e9f741a7` is ticket records only. No spine, interface or data shape changed.
- Trigger: implementation complete (IR-002), `Large`/`High` → source review
- Prior Review Round Reviewed: none
- Latest Authoritative Round: 1
- Coverage Investigation Reviewed (round 3): `api-e2e-coverage-investigation.md`
- Execution Coverage Report Reviewed (round 3): `api-e2e-execution-coverage-report.md` ("Failure Detail (API-08)", Cases, Acceptance-Criteria Proof)
- API/E2E Revision Record Reviewed (round 3): `api-e2e-revision-record.md`
- Relevant API/E2E Revision IDs: API-REV-001 (head `dc53699e92`; probes `161913c003`; baseline probe fix `ceb5e2d972`)
- Failing Scenario IDs: API-08 → SCN-001 (running hub), BEH-001/BEH-003 intent, DESIGN.md rule 3
- Exact Failing Commands / Execution Mode: `pnpm -C autobyteus-web test:e2e:delegated-copies-large-hub --from-seed <--teams 12 --unrelated 50> --output-dir <fresh> --live --large-shape unbroken --samples 1` (clean env, scripted AGY, test-owned data)
- Failure Evidence Paths: `evidence/api-e2e/API-08-hub-participant-reloads.log`, `evidence/api-e2e/API-07-08-hub-probe-live.json`
- Delivery Revision Record: N/A

## Round 7: CR-004 Rework (IR-006; SR-007, SR-008)

- **Changed.**
  - **Server publisher.** `RootEventPublisher` takes a required `isMessageEvent` predicate and keeps `lastMessageChangeSequence` (M). It is read in the same `RootLivePosition` as the live sequence and change sequence, and with the base in every snapshot connection. The predicates are exported beside each event union (hub and Org: `kind === "communication"`; Team: `eventSourceType === COMMUNICATION`) and passed at the three builders.
  - **Carriage.** Inspections, the projectors, the Team snapshot and `getTeamRunResumeConfig` carry M (`null` when stored).
  - **Contracts.** The Agent-root and Org views reject a live sequence without M (or the reverse) and an M past the base.
  - **Web keep rule.** `reloadRoot` keeps the lists and their in-flight loads for the same non-null live sequence with M ≤ C, then sets C := B. Anything else reloads. `rebuildOfView` maps a view to the rebuild at the hub, Org and Team call sites.
- **Verified.**
  - **The keep rule.** C means "the lists hold every message through C". M ≤ C means no message lies between C and B, so the lists hold every message through B and C := B is correct. When B < C (a recovery read), C only drops, which is conservative.
  - **M is exact.** The publisher gives each event its own sequence and sets M from that event (`root-event-publisher.ts:59-65`). Stream batches are contiguous downstream ranges, so a message is never folded under a lower sequence. The snapshot connection (`:85` onward) and `getLivePosition` read B and M together.
  - **The predicates match what the client lists.** `communication` / `COMMUNICATION` are the events the contexts append. A non-public hub message also bumps M, which reloads conservatively.
  - **Everything earlier still holds:** stored → reload; another live sequence → reload; Team open, recovery and stop/resume (SR-005, SR-006).
  - **Sizes:** `teamExecutionViewState.ts` 499; the owner 130; the publisher 108.
- **Tests.**
  - **Server:** a message advances M and a presentation event doesn't, per root kind; the position and the snapshot carry M.
  - **Contracts:** the pair and base checks.
  - **Owner spec (11):** base moved without a message keeps, and C becomes the base; a message past C reloads.
  - **Hub store and stream:** selection 1; new child 0; new child whose copy's output moved the base to 22 with no message: 0 (L-002); a message in the window: 1, shown once; a restart reloads.
  - **Team:** keep and reload by M; another live sequence reloads.
  - **Mutation:** comparing the base instead of M fails 3.
- **Checks.** `evidence/IMP-IR006-checks.log`: contracts 39/21; server typecheck 0, unit 7,674, integration 480 (FU-001 only); web typecheck PASS, 4,944; guards pass.
- **Result:** CR-004 resolved; `Pass`.

## Round 6: API/E2E Failure-Origin Review (API-08 L-002, round 2)

### What failed

- **Fixed, as SR-004/SR-005/SR-006 expected:**
  - selecting a running hub: 1 hub list fetch (round 1: 2);
  - stopped hub: 1; reopening a running hub: 1;
  - opening a running Team with the Team tab shown: 1;
  - a live message: 0; a stop and resume: 1 reload, and the list equals the stored log;
  - API-05 (dropped stream with a message sent while down): M3 reloads and shows once.
- **Still failing (L-002, 4/4 runs):** one new delegation on a running hub, with the hub's and one copy's lists loaded, adds no hub message (the stored hub list is 62 before and 62 after). Yet both loaded lists are fetched again in the same millisecond. SR-004 expects "a new child or settings Save with no message in the reconnect window: 0".

### Origin

1. **The sequence of events.** The delegation's single `task_execution_started` event returns `checkpoint_required`. The hub stream sets C to that event's sequence (`advance`, the SR-004 rule), closes the socket and reconnects for a fresh snapshot (`agentRunCollaborationStreamingService.ts`, the `checkpoint_required` branch; the protocol predates this ticket).
2. **The window.** The new copy starts at once and its events are published to the root's change sequence while the client is not subscribed: API/E2E observed `agent_presentation` × 16 plus a batch. They advance the root's sequence, so the reconnect snapshot's base B is greater than C.
3. **The reload.** `publish` → `reloadRoot` sees B > C and reloads every loaded list.
4. **Why the rule can't meet the expectation.** B counts **every** root change, while the expectation is about **messages**. Every new delegation produces non-message events in the reconnect window, so B > C holds for essentially every delegation. Advancing C on events applied after the reconnect cannot help: the keep-or-reload decision is made at the snapshot, before those events apply. No implementation of SR-004's rule as written gives "no message → 0".
5. **Classification.** `Design Impact` (the rule's measure, root changes, differs from its stated goal, messages), not a `Local Fix`. It is correct (complete lists) and much better than round 1, but each new delegation on a running hub still re-transfers the loaded lists, the hub's being nearly its whole log. That is against DESIGN.md rule 3 and the ticket's goal.
6. **Review gap (mine).** In CRR-004 and CRR-005 I verified the keep rule's **safety** (it never keeps a list that missed a message), and called the B > C reload "conservative". I did not check that the design's expected count of 0 for a delegation was reachable, although a new copy always produces events immediately.

### Candidate gate (round 6)

| Candidate ID | Observation | Scenario / Contract ID | Independent Trigger | Forward Path / Consequence | Evidence | Disposition | Scope | Reason |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C-16 | A new delegation on a running hub reloads every loaded list, although no message was written | SCN-001 running hub; SR-004 expected counts; DESIGN.md rule 3 | Delegate a new copy while the Team tab is loaded | `checkpoint_required` → C = its sequence → reconnect → the new copy's presentation events in the window → B > C → `reloadRoot` reloads | API-08-r2 log lines 93/94; 4/4 runs; hub messages 62 → 62 | Promote → **CR-004** | This ticket (Design Impact) | The measure (any root change) cannot express "a message could have been missed" |
| C-17 | Could advancing C on post-reconnect events fix it (API/E2E's Local Fix option)? | — | — | The decision happens at the snapshot, before those events are applied | Code (`publish` → `reloadRoot` on the snapshot) | Reject | — | Not a fix within the rule |
| C-18 | The same for the Org (checkpoint reconnect) and for a settings Save | — | — | The same rule and window; a Save may produce fewer window events | Code | Hold for Evidence | — | Cover in the same design decision |

## Round 5: CR-003 Rework (IR-005; SR-006)

- **Changed.**
  - **Server.** `RootEventPublisher.getLivePosition()` returns `{ liveSequenceId, changeSequence }` in one read, and `RootTeamRun.getLivePosition()` delegates to it. `TeamRunHistoryService.getTeamRunResumeConfig` reads it from `getManagedTeamRun(id)`, the root that makes `isActive` true and that the Team stream binds to: `liveSequenceId` and `baseChangeSequence`, or `null`/`0` when not managed.
  - **Web.** `GetTeamRunResumeConfig` requests both fields; `teamRunContextHydrationService` validates them into `candidate.rebuild`. `markCommittedTeamRunHydrationAuthority(candidate)` calls `reloadRoot('agent_team', id, candidate.rebuild)`, and IR-004's two-value flag is removed.
- **Verified, path by path.**
  - **Running open:** the commit sets or keeps the position at the read's live sequence and base. A Team-tab load follows, then the stream snapshot: at the same base the list is kept; past it, it reloads (an event happened after the read).
  - **A different publisher** between the read and the stream (stop/resume or restart): the IDs differ, so it reloads.
  - **Stream recovery:** the read lies between two equal checkpoints, so its base is at or below the position the candidate snapshot set, and the commit keeps the list, correctly.
  - **Stopped Team:** `null`, so it reloads.
  - **`isActive` semantics** are unchanged (`hasManagedTeamRun` ≡ `getManagedTeamRun(...) !== null`, `agent-team-run-manager.ts:218-224`).
  - **Size:** `root-team-run.ts` at 499, as base.
- **Tests.** Running-Team open keeps the list (1 fetch); a stopped Team reloads; the server resume config carries the position, or `null`/`0` when stopped; the resolver passes both; the publisher reads both together.
- **Checks.** `evidence/IMP-IR005-checks.log`: server typecheck 0, unit 7,671, integration 480 (FU-001 only); web typecheck PASS, 4,943 passed; three guards pass.
- **Result:** CR-003 resolved; `Pass`.

## Round 4: CR-002 Rework (IR-004; SR-004, SR-005)

- **Changed.**
  - **Server.** `RootEventPublisher.liveSequenceId` is a random ID per instance. It is carried by every live snapshot connection, and as `live_sequence_id` in the active Agent-root and Org views and the Team snapshot. Stored inspections carry `null`. Contracts and `dist/` were rebuilt.
  - **Web owner.** It keeps a per-root position (live sequence ID, consistent-through C). `advance` moves C within the same live sequence. `reloadRoot(kind, id, { liveSequenceId, baseChangeSequence })` keeps the lists and their in-flight loads only when the live sequence is non-null and the same, and B ≤ C. Anything else reloads, and `null` forgets the position.
  - **Advance sites.** Hub and Org advance after `applyEvent` (applied, or a single `checkpoint_required` event); Team advances after each applied message.
  - **Reload sites.** Hub `publish`, Org `publish`, the Team snapshot effect (which carries the rebuild), and the Team commit (`'stored_rebuild'` reloads; `'rebuilt_by_stream_snapshot'` does not).
- **Verified.**
  - **The advance condition.** `application === 'applied' || through === undefined` is exactly "applied, or a single `checkpoint_required`". `applyEvent` returns only those two values (`agentRunCollaborationContext.ts:38`, `agentOrgExecutionContext.ts:45`), and a sequence gap throws before anything is applied. No `checkpoint_required` event carries a message.
  - **Inspect → attach** on a running hub: same publisher; B' = B keeps; B' > B (something happened before the subscription) reloads, which is conservative.
  - **Stop and resume, or a restart:** a different live sequence or `null` reloads (SR-005).
  - **Team reconnect:** `liveSequenceId` is reset on disconnect, so `advance` with `null` moves nothing.
  - **Server:** active inspections and snapshots take the ID from the same publisher connection; stored ones get `null`.
- **Tests.**
  - The owner spec has 10 tests, including SR-004's four and SR-005's two.
  - The new `agentRunCollaborationParticipantReloads.spec.ts` drives the real hub store and stream: selection gives 1 fetch; a new child gives 0, or 1 with a message, and that message is shown; a new publisher reloads.
  - Team keep and reload across snapshots; Org advance on a batch and a checkpoint; the publisher identity on the server.
  - Mutations fail them as expected (always reload: 5; no-op `advance`: 2; ignore the identity: 2).
- **Checks.** `evidence/IMP-IR004-checks.log`: contracts 39/21; server typecheck, unit 7,670, integration 480 (FU-001 only); web typecheck PASS, 4,942 passed; three guards pass.
- **One gap, CR-003 (C-15).** Opening a **running Team** still fetches a loaded list twice. The open reads the Team through GraphQL hydration, which names no live sequence, and commits as `'stored_rebuild'` (`teamRunHydrationCommit.ts`; `teamRunOpenCoordinator.ts`). That forgets the root's position. The live stream's snapshot follows at once, and with no kept position `reloadRoot` reloads, so a Team-tab list loaded between the two is fetched again. This is the API-08 pattern (CR-002) for Team. The implementation records it as a known limitation "outside SR-005", but SR-004 states "one rule for hub, Team and Org", with an expected 1 fetch per selection, and ARCH-REV-005 does not address the Team open path. Closing it needs a design choice:
  - the Team open (or resume) read carries the live sequence ID and base of an active Team;
  - on a running Team, the Team-tab load starts only once the stream snapshot is applied;
  - or the limitation is accepted explicitly, with a follow-up.
- **Result:** CR-002 resolved for hub and Org; CR-003 is `Design Impact` → Solution Designer.

## Round 3: API/E2E Failure-Origin Review (API-08)

### What failed

- Every acceptance criterion passed, and so did every probe case. The request log shows the hub's participant list fetched again on every rebuild of a **running** hub's context, while it is loaded or loading. The hub's own list is close to its whole log (627,887 bytes in the seed; the PM's log is 6.7 MB).
  - Selecting a running hub (L-001, and L-004 on reopen) sends two hub `CollaborationParticipantMessages` requests 51 ms apart (log lines 84 and 86).
  - Each new delegation on a running hub (L-002) sends every loaded list again in the same millisecond (lines 94 and 95).
  - A stopped hub sends one request (line 19).
- Correctness is fine: lists are complete and ordered (API-05).

### Origin

- **The trigger.** `agentRunCollaborationStore.publish` calls `participantMessages.reloadRoot('agent', hostRunId)` on every publication (`stores/agentRunCollaborationStore.ts:77`).
  - On a running hub, a selection publishes twice: the inspection (`syncHost` → `inspect`), then the live attach snapshot. The Team tab's load from the first publish is abandoned and sent again.
  - Every new child, or every settings Save, makes the hub stream reconnect for a fresh snapshot (`checkpoint_required` → `closeSocket` + `connect`, `agentRunCollaborationStreamingService.ts:209-216`; unchanged by this ticket), which publishes again and reloads every loaded list.
- **The implementation follows the design.** DS-002 names exactly these call sites ("`agentRunCollaborationStore` `publish` of a new context instance (inspect, attach, gap `requireReopen` then reopen)"), and the Key Tradeoffs accept "a reconnect reloads the loaded lists once". Its stated reason is that events lost in a gap never reach the client.
- **The policy is too coarse for the ticket's goal.**
  - The inspect → attach double on selection is avoidable. The first load's window could be covered by starting the load once the live stream is ready, so no event can fall between the query and the subscription. No gap is involved.
  - The per-delegation reload is the price of the existing reconnect-for-snapshot protocol, where a short window without a subscription does exist. Whether to accept it, or to narrow it (for example a continuity check on the stream's change sequence, or a "messages since" read), is a design choice.
  - Either way, DESIGN.md rule 3 ("a new-row update must not trigger avoidable repeated full-history transfer"), which the design itself cites, and the ticket's outcome ("each screen asks for what it shows … one click reads once") are not met for running hubs.
- **Not a regression against base.** At base, the running view and every attach snapshot carried the log. The cost of item 162 is now confined to running hubs and moves through the participant query instead of the view.
- **Scope.** This ticket: it is a design problem in the code this change adds (`ticket-scope.md`), and it bears on the ticket's own goal for UC-001.
- **Review gap (mine).** In CRR-001 I verified the `reloadRoot` call sites for **correctness** (C-01…C-07), but did not check them against rule 3 for repeated transfer. The double publish on a running-hub selection was visible from `syncHost` (`inspect` then `attach`) plus `publish` → `reloadRoot`. The invariant to check: "a rebuild without a possible gap reloads nothing".

### Candidate gate (round 3)

| Candidate ID | Observation | Scenario / Contract ID | Independent Trigger | Forward Path / Consequence | Evidence | Disposition | Scope | Reason |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C-12 | A running-hub selection fetches the hub's participant list twice | SCN-001 (running hub); DESIGN.md rule 3; ticket outcome | Clicking a running hub with the Team tab shown | inspect `publish` → load → attach `publish` → `reloadRoot` → the load is abandoned and sent again; a log of up to MBs is transferred twice | API-08 log lines 84/86 and 124/126; `agentRunCollaborationStore.ts:77`; `syncHost` | Promote → **CR-002** | This ticket (Design Impact) | The reload policy needs a design decision |
| C-13 | Each new delegation (or settings Save) on a running hub fetches every loaded list again | Same | A new copy on a running hub with the Team tab loaded | `checkpoint_required` → reconnect → snapshot → `publish` → `reloadRoot` | API-08 log lines 94/95; `agentRunCollaborationStreamingService.ts:209-216` | Promote (folded into CR-002) | This ticket | It may be the price of the reconnect protocol, or narrowed; the Solution Designer decides |
| C-14 | Team and Org roots: the same policy? | — | — | Team `reload_collaboration_messages` on every snapshot, and the hydration commit; Org `publish` | Code (`teamExecutionViewState.ts`, `teamRunHydrationCommit.ts`, `agentOrgContextsStore.ts:81`) | Hold for Evidence | — | The same rule applies in code. API-08 measured only hubs. The Solution Designer should cover all three roots in one policy |

## Round 2: CR-001 Local Fix (IR-003)

- **Changed.**
  - `MobileTeamMessages.vue` reads `messagesStatus()`: a loading state, an unavailable state with the server's reason, and "No team messages yet" only for a loaded empty list.
  - The `MobileActivityDigest.vue` summary follows the same three states (on error: "These messages can't be shown: <reason>").
  - The words are the Team tab's `loading_messages` / `messages_unavailable` (en, zh-CN), through `services/collaborationMessages/participantMessagesStatusText.ts`.
- **Verified.**
  - The states match AC-006 and the design mapping.
  - The new module does not bypass `MobileRemoteAccessShell.spec.ts:442-480`. That guard keeps mobile "free from desktop shell imports" (it forbids component names such as `TeamCommunicationPanel`). The module imports no desktop component and owns the status words in the participant-messages service area, so the guard stays intact.
  - The shared `participantMessagesStub` keeps its default behavior; `clear` also clears hold and fail outcomes.
- **Tests.** Three new cases (loading, unavailable with the reason, loaded empty), each checking the screen and the digest summary.
- **Checks.**
  - `evidence/IMP-CR001-mobile-states.log`: the mobile specs 77/77; web typecheck PASS; three guards pass.
  - The shared stub serves five other specs that the log didn't rerun, so I ran all six stub-using specs on `b3e9f741a7`: 6 files / 62 tests passed.
- **Result:** CR-001 resolved; `Pass`.

## Routing Classification Review

- Task size: `Large`
- Architectural risk: `High`
- Selected route: `Implementation Review`
- Independent source review required by the classification: `Yes`
- Classification evidence or correction required: confirmed. The change spans three view contracts, a new GraphQL query, the readiness admission boundary, and the web contexts of all three root kinds (187 files with tests).

## Review Scope

- Changed implementation and behavior reviewed: `git diff efd28d5c4a b58a3106c3` (the code). `a0330adab1` adds ticket files only.
- Files / areas reviewed:
  - **Server:**
    - the new `collaboration-participant-messages.ts` query;
    - the three records owners (hub `getCollaborationRecordsSnapshot`, Team `TeamCommunicationProjectionService.getCollaborationRecordsSnapshot`, Org `AgentOrgRunManager.getCollaborationRecordsSnapshot`);
    - tree-only inspections and snapshots;
    - the three projectors;
    - the tree-only validators;
    - the readiness validator (`scanOne`, structure-only) and index (`admitCurrent`);
    - the hub reference route;
    - the removed whole-log query.
  - **Contracts:** the participant-messages DTO; message fields removed from the agent and org views, the correlation, and the Team snapshot.
  - **Web:**
    - `CollaborationParticipantMessages` (`collaborationParticipantMessages.ts`, `participantMessagesQuery.ts`, `participantMessageRows.ts`);
    - `MemberLoader` and its Team/Org/hub adapters;
    - Team open and recovery (`teamRunContextHydrationService.ts`, `teamRunHydrationCommit.ts`);
    - Org staging (`agentOrgContextHydration.ts`, `agentOrgContextsStore.ts`, `agentOrgStreamingService.ts`);
    - `teamExecutionViewState.ts` (live messages become effects);
    - `TeamStreamingService.ts`;
    - `agentRunCollaborationStore.ts` (`viewFor`, `syncHost`);
    - `existingRunConfigStore.ts`;
    - the Team tab Section and Panel (loading and error states);
    - the mobile message screens;
    - DS-006 (`useOncePerFrame.ts`, `AgentConversationFeed.vue`);
    - DS-007 (`longUnbrokenRun.ts`, `app.vue`, the four renderers).
  - **Tests:** the changed and new tests (60 web, 14 server), read for the behaviors they claim.
- Unchanged context read:
  - the strict resume loaders (`team-run-state-package-loader.ts:34`, `agent-org-state-package-loader.ts:29`);
  - the server Team reference-ID derivation (`team-reference-file-projection.ts`) against the web's `projectAgentOrgReference`;
  - the readiness index's rebuild and `mutationRevision`;
  - the Settings save path (`updateStoppedAgentRunSelection`).
- Explicit exclusions: FU-001 (pre-existing integration failures), FU-002; the browser measurement M-151 and the gated live suites (left to API/E2E).

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: REQ-001…REQ-005; AC-001…AC-008; QR-001…QR-006; DEC-001, DEC-002, DEC-003 and DEC-004.
- Design-spec behavior map verified against the implementation: DS-001…DS-007 are implemented as designed. D-IMP-1…D-IMP-6 are within the design (see C-01…C-06).
- Design review report and round confirmed: ARCH-REV-003 Pass. The AR-001…AR-004 resolutions are present in the code. The AR-003 test exists: `agentRunCollaborationChildHydration.spec.ts:240`, "a member loaded before a stream failure loads again on its next open".
- Behavior-basis status: `Confirmed`, except BEH-004 / AC-006 on the mobile message screens (CR-001).
- Changed or newly discovered behavior: none.
- Remaining material ambiguity: none.

| Behavior ID | Current Status | Current Implementation Path And Lifecycle Evidence | Contradicting Evidence |
| --- | --- | --- | --- |
| BEH-001 | Confirmed | The view projectors carry no log. Inspections read and validate the tree only (`agent-org-run-manager.ts` inspection; `standalone-agent-run-root-manager.ts` inspection). The query reads through the records owners and filters to the participant plus `isPublicMessage`. The web owner buffers before the request, merges by ID, and `reloadRoot`s on every rebuild (call sites: hub `publish`, Team snapshot effect and hydration commit, Org `publish`). Owner spec: live during load, gap after, gap during, error retry, release. QR-001: 176,226 bytes | — |
| BEH-002 | Confirmed | Team open and recovery stage the focused member exactly; Org stages `focus`; `MemberLoader` generations per root (`beginRoot` on every publish or snapshot); others load through `ensure`. Hub copies use the same loader | — |
| BEH-003 | Confirmed | `viewFor` awaits the in-flight inspection or returns the published view; `syncHost` reuses a settled historical view (D-IMP-6). QR-002: 0 view reads plus 1 participant read per click | — |
| BEH-004 | Confirmed on desktop and server; **contradicted on mobile** (CR-001) | Structure-only scan (tree + manifest + log presence); `admitCurrent` scans one package. The records owners validate tree plus log strictly, and resume uses the strict loaders. The desktop Team tab shows "messages unavailable" with the reason (`CollaborationMessagesPanel.vue`). QR-003: 85 ms at 100.4 MB | The mobile screens (`MobileTeamMessages.vue:6-8`, `MobileActivityDigest.vue:105-108`) ignore `messagesStatus()`. While loading, and permanently after a failed load (a damaged log), they say "No team messages yet for the focused member." |
| BEH-005 | Confirmed | DS-006: `useOncePerFrame` in `onUpdated`. DS-007: `hasLongUnbrokenRun` (linear, stops at the first run) plus the global class in `app.vue` on the four renderers. QR-004: 199 ms (base 87.0 s); words 294 ms | — |

## Supported Product Scenario And Reachability Gate (Mandatory)

| Scenario ID | Related Behavior / Contract IDs | Kind | Actor / Initiator | Coherent Goal Or Governing Event | Supported Entry Surface / Event | Scenario Shape | Forward Production Path / Lifecycle | Expected Outcome / Consequence | Independent Evidence | Scenario Validity | Review Use |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001…SCN-006 | BEH-001…BEH-005 | User/System | as requirements | as requirements | as requirements | Normal / Explicit Edge | DS-001…DS-007 | as AC-001…AC-007 | Requirements; measurements | Supported | Use |
| SCN-007-MOBILE | BEH-004, AC-006 | Operational/User | The user reads a Team run's messages on the mobile screen | See the run's messages, or why they are unavailable | Mobile → Activity → Team messages → Details | Explicit Edge (damaged log); Normal (loading) | `teamCollaborationMessagesView` → `loadMessages()` → owner `error` / `loading` → the screen reads only `listMessages()` | Approved: unavailable with the reason; never a silently empty log. Observed: "No team messages yet" | Design mapping ("components/mobile/…: Ask the owner on show; loading and error states"); AC-006 | Supported Explicit Edge Scenario | Use |

### Candidate Finding And Mechanism Gate

| Candidate ID | Observation Or Mechanism | Scenario / Contract ID | Independent Trigger | Forward Path / Lifecycle / Consequence | Evidence | Disposition | Scope, if promoted | Reason / Proportionate Response |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C-01 | D-IMP-1: the public scope (`isPublicMessage`) for every root kind, not only Agent roots | REQ-002 ("the loaded list equals the stored log for that participant") | — | All three base projectors applied it (`agent-collaboration-view-projector.ts:40`, `agent-org-execution-view-projector.ts:56`, `team-execution-view-projector.ts:67`), and the live streams publish only public messages | Code read | Reject | — | Keeps the Team tab as at base and keeps buffer-and-merge consistent |
| C-02 | D-IMP-3: Team reference IDs are derived on the web | Preserved reference-file links | — | Server `projectTeamReferenceFile` and web `projectAgentOrgReference` both compute `sha256(ownerId \0 path)` with the message ID as owner | Code read | Reject | — | Same derivation; links resolve |
| C-03 | D-IMP-4: member loads are shared and not tied to one selection | BEH-002 | — | A superseded selection's load still commits into its own member context, within the generation | `memberLoader.ts:89-145` | Reject | — | No stale or wrong-member write: the target is re-resolved and checked against the current generation and context |
| C-04 | D-IMP-6 / `viewFor`: a stopped hub's settled view is reused, so could Settings show stale copy settings after a save? | Preserved Settings content | Save in Settings | The stopped-hub save changes only the host's own selection (`updateStoppedAgentRunSelection`: runtime, model, config), re-read every time through `refreshAgentResumeConfig`; the copies' rows are read-only from the view | `existingRunConfigStore.ts:198-207,428-455`; mutation client | Reject | — | Nothing the user can change through Settings comes from the reused view |
| C-05 | `admitCurrent` no longer bumps `mutationRevision` | DS-005 | Run creation | `admitCurrent` awaits `awaitReady` (it joins an in-flight rebuild) and runs after the package is on disk, so a later rebuild includes the package anyway; `excludeCurrent` still bumps | `root-run-package-readiness-index.ts:32-34,51-63,78-97` | Reject | — | No lost admission |
| C-06 | The Team and Org records owners now throw for a run without a stored tree (base read "its own log") | BEH-004 preserved ("older runs still open") | — | The readiness scan requires the tree (`ROOT_RUN_PACKAGE_MISSING_TREE`), so such a run is never admitted or listed | `root-run-package-current-validator.ts:172-175` | Reject | — | Not reachable |
| C-07 | A damaged-log run is now admitted, so is resume still refused? | AC-006 | Resume | Resume uses the strict loaders (tree plus log) | `team-run-state-package-loader.ts:34`; `agent-org-state-package-loader.ts:29` | Reject | — | Refused with the reason, as AC-006 requires |
| C-08 | The mobile message screens show "No team messages yet" while loading and after a failed load | SCN-007-MOBILE; AC-006; design mapping | Open Team messages on mobile (or a damaged log) | `listMessages()` is empty while loading or failed; `messagesStatus()` is not read; the digest summary does the same | `MobileTeamMessages.vue:6-8`; `MobileActivityDigest.vue:105-108` | Promote → **CR-001** | This ticket | Use the view's `messagesStatus()` for a loading state and an unavailable-with-reason state, reusing the Team tab's strings; tests |
| C-09 | `existingRunConfigStore.ts` is at 503 effective lines (base 503, not grown) | Size rule | — | Already over, not grown by this change | Line count | Promote | Follow-up (FU-003) | Per the size rule |
| C-10 | `hasLongUnbrokenRun` runs on every render of the four renderers, and on the HTML of the markdown segment | DS-007 | — | One linear pass that stops early; a long attribute value can add the class, which only turns kerning off | `longUnbrokenRun.ts`; renderers | Reject | — | No visible or measurable cost (QR-004 words: 294 ms) |
| C-11 | Tool-call and reasoning renderers are not covered by DS-007 | REQ-005 | — | The design names four renderers; the handoff records the gap | Handoff Known Risks | Reject (as a finding) | — | Outside the design's mapping; residual for API/E2E |

## Structural / Design Checks

| Check | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Task design health assessment is present, evidence-backed, and preserved | Pass | The log left the view for one participant query with one client owner; one member loader; per-run admission | — |
| Implementation matches approved behavior-defining supplemental artifacts | Pass | None | — |
| Data-flow spine inventory clarity and preservation | Pass | DS-001…DS-007 map to code | — |
| Ownership boundary preservation and clarity | Pass | Only the records owners read logs; only the web owner fetches messages; only `MemberLoader` fetches member details; Settings reads the store | — |
| Off-spine concern clarity | Pass | `participantMessageRows.ts` (rows and order), `useOncePerFrame.ts`, `longUnbrokenRun.ts` | — |
| Existing capability/subsystem reuse | Pass | The two on-demand loaders were reduced to load-target adapters over `MemberLoader`; the stores and validators are reused | — |
| Reusable owned structures | Pass | One participant DTO; one row projector for all root kinds | — |
| Shared-structure/data-model tightness | Pass | Message fields removed from the views and snapshot; `baseChangeSequence` not added to the query result | — |
| Repeated coordination ownership | Pass | One loader, one message owner | — |
| Empty indirection | Pass | The Team/Org/hub adapters supply the load target only | — |
| Separation of concerns and file responsibility | Pass | No changed file goes over 500 (`AgentConversationFeed.vue` at 500, base 498) | — |
| Ownership-driven dependency check | Pass | Contexts use the owner and loader, not their queries | — |
| Authoritative Boundary Rule | Pass | Reference content reads through the hub records owner, not the inspection | — |
| File placement | Pass | `services/collaborationMessages/`, `services/runHydration/memberLoader.ts`, server `api/graphql/types/collaboration-participant-messages.ts` as mapped | — |
| Flat-vs-over-split layout | Pass | — | — |
| Interface boundary clarity | Pass | `collaborationParticipantMessages(rootKind, rootRunId, agentRunId)` rejects a non-participant; `ensure(rootKey, agentRunId, resolve)`; `admitCurrent(family, id)` | — |
| Naming quality / one vocabulary | Pass | "participant messages", "member loader", "records owner" as in the design | — |
| No unjustified duplication | Pass | — | — |
| Patch-on-patch complexity control | Pass | Removals outweigh additions in the old paths (whole-log query, two loaders, the Settings read) | — |
| Dead code removed in touched files | Pass | `team-communication.ts`, `teamCommunicationHydrationService.ts`, `teamCommunicationGraphqlDtoProjection.ts`, `TeamExecutionViewSnapshotSeed`, `CollaborationMessagesPerspective`, dead normalizers; grep of removed names is clean (remaining `communication_messages` are storage names) | — |
| Test scenarios and assertions are clear and requirement-aligned | Pass | **Server:** query tests (participant, non-participant, Org, Team, damaged log). Org inspection: damaged log fails only the read. Team API integration: damaged log reported. **Web:** owner spec (live during load, gap after and during, error, release); AC-004 count; per-frame; the generation test. The mobile states are untested (CR-001) | With CR-001 |
| Test fixtures/helpers reusable, structure coherent | Pass | `test-support/participantMessagesStub.ts` | — |
| No stale, duplicated, or compatibility-only tests | Pass | The whole-log hydration spec removed with its service | — |
| API/E2E readiness | Fail | CR-001 leaves the mobile message screens without the loading and error states | CR-001 |

## Source File Size And Structure Audit

Changed source files over 220 effective non-empty lines:

| Source File | Before | After | `>500` | `>220` Delta | SoC / Ownership | Placement | Classification | Action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `autobyteus-web/stores/existingRunConfigStore.ts` | 503 | 503 | Already over, not grown — follow-up | 0 | Pass | Pass | Follow-up | FU-003 |
| `autobyteus-web/components/workspace/agent/AgentConversationFeed.vue` | 498 | 500 | Pass (at the limit) | +2 | Pass (logic in `useOncePerFrame.ts`) | Pass | — | — |
| `autobyteus-web/services/teamExecution/teamExecutionViewState.ts` | 497 | 498 | Pass | +1 | Pass | Pass | — | — |
| `autobyteus-server-ts/src/agent-team-execution/domain/root-team-run.ts` | 499 | 497 | Pass | −2 | Pass | Pass | — | — |
| `autobyteus-server-ts/src/standalone-agent-run-root/domain/standalone-agent-run-root.ts` | 490 | 488 | Pass | −2 | Pass | Pass | — | — |
| `autobyteus-web/services/agentOrgExecution/agentOrgStreamingService.ts` | 483 | 484 | Pass | +1 | Pass | Pass | — | — |
| `autobyteus-server-ts/src/agent-org-execution/services/agent-org-run-manager.ts` | 470 | 475 | Pass | +5 | Pass | Pass | — | — |
| `autobyteus-server-ts/src/standalone-agent-run-root/services/standalone-agent-run-root-manager.ts` | 425 | 444 | Pass | +19 | Pass | Pass | — | — |
| `autobyteus-web/services/agentStreaming/TeamStreamingService.ts` | 431 | 437 | Pass | +6 | Pass | Pass | — | — |
| `autobyteus-web/stores/agentOrgContextsStore.ts` | 402 | 422 | Pass | +20 | Pass | Pass | — | — |
| `autobyteus-web/stores/agentRunCollaborationStore.ts` | 322 | 344 | Pass | +22 | Pass | Pass | — | — |
| `autobyteus-web/components/workspace/collaboration/CollaborationMessagesPanel.vue` | 316 | 335 | Pass | +19 | Pass | Pass | — | — |
| `autobyteus-server-ts/src/run-history/services/root-run-package-current-validator.ts` | 233 | 249 | Pass | +16 | Pass | Pass | — | — |
| Other files over 220 (`agentOrgExecutionContext.ts`, `agentRunCollaborationContext.ts`, `runHistoryQueries.ts`, `teamRunContextHydrationService.ts`, `activeContextStore.ts`, contract DTOs, team projector) | — | shrank | Pass | ≤ 0 | Pass | Pass | — | — |

## Legacy / Backward-Compatibility Verdict

| Check | Result | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms in changed scope | Pass | Fields and the old query removed; no optional fields kept |
| No legacy old-behavior retention | Pass | — |
| Dead code removed in touched files | Pass | — |
| Persisted-data transition decision followed | Pass | `Not Affected`; no stored format change |
| No version-specific dual reads/writes | Pass | — |
| Transition mechanics match the design | Pass | N/A |

## Dead / Obsolete / Legacy Items Requiring Removal

None.

## Docs-Impact Verdict

- Docs impact: `Yes`, done (`run_history.md`, `artifact_file_serving_design.md`, web `agent_artifacts.md`, `agent_execution_architecture.md`, `settings.md`).

## Additional Material Premise Validation

### Upstream Design-Review Material-Premise Decisions

| Premise ID | Current Status | Changed Evidence / Reason |
| --- | --- | --- |
| ARCH-REV-002/003 premises (AR-001…AR-004; DS-007) | Confirmed | Implemented; the AR-003 test is present |

No new premises beyond the candidate gate.

## Review Scorecard (Mandatory)

- Overall score (`/10`): 9.5 (round 2; round 1: 9.3)
- Score calculation note: simple average of the ten categories, for trend visibility only.

| Priority | Category | Score | Why This Score | What Is Weak / Holding It Down | What Should Improve |
| --- | --- | --- | --- | --- | --- |
| 1 | Data-Flow Spine Inventory and Clarity | 9.5 | Each spine maps to one owner in code | — | — |
| 2 | Ownership Clarity and Boundary Encapsulation | 9.5 | One log reader per root kind; one message owner; one member loader | — | — |
| 3 | API / Interface / Query / Command Clarity | 9.5 | Compound-identity query; non-participants rejected | — | — |
| 4 | Separation of Concerns and File Placement | 9.4 | As mapped; files shrank where code moved | `AgentConversationFeed.vue` at the 500 limit | — |
| 5 | Shared-Structure / Data-Model Tightness and Reusable Owned Structures | 9.5 | Views lost the log; one DTO and one row projector | — | — |
| 6 | Naming Quality and Local Readability | 9.4 | Clear comments stating why | — | — |
| 7 | API/E2E Readiness | 9.4 (round 2: CR-001 resolved; round 1: 8.9) | All suites green from a clean clone (FU-001 excepted); QR-001…004 met | CR-001: the mobile message screens have no loading or error state | Fix CR-001 with tests |
| 8 | Runtime Correctness And Behavioral Fidelity | 9.4 (round 2: CR-001 resolved; round 1: 9.0) | Ordering, merge, generations, admission and resume traced correct | CR-001: a damaged log is silently empty on mobile (AC-006) | Fix CR-001 |
| 9 | No Backward-Compatibility / No Legacy Retention | 9.6 | Clean removal | — | — |
| 10 | Cleanup Completeness | 9.5 | Removal plan applied; leftovers grep clean | — | — |

## Findings

| ID | Severity | Location | Problem | Required Action | Classification / Owner |
| --- | --- | --- | --- | --- | --- |
| CR-004 | — **Resolved (round 7)**: IR-006 `65a5b34c9b` (SR-007/SR-008, option (a)). Round 6 text: | The SR-004 keep rule (`collaborationParticipantMessages.ts` `reloadRoot`: B vs C over every root change), at the hub (and Org) checkpoint reconnect | After a new delegation (or a settings Save) on a running root, the reconnect snapshot's base counts the new copy's non-message events from the reconnect window. So B > C and every loaded list is fetched again, although no message was written. SR-004 expects 0 | The Solution Designer revises the measure. Options: (a) views and snapshots carry the change sequence of the root's latest communication message (for example `last_message_change_sequence`, per live sequence), and the lists are kept when it is at or below the sequence they are consistent through; (b) refresh the view on `checkpoint_required` without dropping the subscription (a query while the stream stays open), so there is no window; (c) accept the per-delegation reload as the protocol's cost and record a follow-up. Apply it to hub and Org (and Team where it reconnects) | `Design Impact` → Solution Designer |
| CR-003 | — **Resolved (round 5)**: IR-005 `99cd853f79` (SR-006, option (a)). Round 4 text: | `autobyteus-web/services/runHydration/teamRunHydrationCommit.ts` (`'stored_rebuild'` with `liveSequenceId: null`) with `teamRunOpenCoordinator.ts`; the Team snapshot effect's `reloadRoot` | Opening a running Team: the GraphQL-hydrated commit forgets the root's position, the live snapshot then reloads every list loaded in between, so a Team-tab list is fetched twice per running-Team open, which is the CR-002 pattern for Team. It contradicts SR-004's "one rule for hub, Team and Org" and its expected one fetch per selection; ARCH-REV-005 did not cover this path | The Solution Designer decides: (a) the Team open or resume read returns the active Team's `live_sequence_id` and base, so the commit is a live rebuild; (b) on a running Team, start the Team-tab load only after the stream snapshot is applied; or (c) accept and record the limitation as a follow-up | `Design Impact` → Solution Designer |
| CR-002 | **Resolved for hub and Org (round 4)**: IR-004 (`935c5c9fa9`, `da91ae689a`); Team open remains as CR-003. Round 3 text: | `autobyteus-web/stores/agentRunCollaborationStore.ts:77` (`publish` → `reloadRoot`); the DS-002 reload policy (and the same rule for Team and Org, C-14) | On a running hub, the participant lists (the hub's is close to its whole log) are fetched again on every context publication: twice per selection (inspect, then attach) and again on every new delegation or settings Save (a reconnect for a fresh snapshot). This is avoidable repeated full-history transfer (DESIGN.md rule 3) against the ticket's outcome. It is correct and complete (API-05), and no worse than base | The Solution Designer revises the reload policy. Options: (a) on a running root, start the Team-tab load only once the live stream is ready, and do not reload on the attach that follows an inspection; (b) reload on a reconnect only when a gap is possible (for example a continuity check of the stream's change sequence), or fetch only the messages since the last applied sequence; (c) accept the per-reconnect reload as the protocol's cost, fix only the selection double, and record the rest. Apply one policy across hub, Team and Org | `Design Impact` → Solution Designer |
| CR-001 | — **Resolved (round 2)**: IR-003 `438ea7fb65` | `autobyteus-web/components/mobile/MobileTeamMessages.vue:6-8`; `autobyteus-web/components/mobile/MobileActivityDigest.vue:105-108` | The mobile message screens read only `listMessages()`. While the focused member's list is loading they say "No team messages yet for the focused member.", and after a failed load (a damaged log, AC-006) they keep saying it, which is a silently empty log. AC-006 requires the messages to show as unavailable with the reason and never silently empty, and the design mapping gives these screens "loading and error states". The desktop Team tab does this correctly (`CollaborationMessagesPanel.vue`) | Read the view's `messagesStatus()` on both screens. Show a loading state while `loading`, and an unavailable state with `error` when `error`, reusing the Team tab's `loading_messages` / `messages_unavailable` strings (en, zh-CN). Keep "No team messages yet" for a loaded empty list only; the digest summary likewise. Add specs for loading, error-with-reason, and loaded-empty | `Local Fix` → Implementation |

## Follow-ups

- Follow-ups this review added: FU-003 (`existingRunConfigStore.ts` is at 503 effective lines on base and after; the change does not grow it).

## Classification

- Round 7: none (Pass). Round 6: `Design Impact` (CR-004), owned by the Solution Designer, resolved by SR-007/SR-008: SR-004's measure (any root change) cannot meet its own expected count for a delegation with no message. Round 5: none (Pass). Round 4: `Design Impact` (CR-003), owned by the Solution Designer, resolved by SR-006/IR-005: the Team open path is not covered by SR-004/SR-005 as designed. Round 3: `Design Impact` (CR-002), owned by the Solution Designer. The implementation follows DS-002's reload call sites as written. The policy itself causes the avoidable repeated transfer, and choosing a narrower trigger (or accepting part of it) is a design decision. Round 2: none (Pass). Round 1: `Local Fix`, owned by the Implementation Engineer: a bounded UI omission against the approved AC-006 and the design's own mapping. No design or requirement change is needed.

## Recommended Recipient

- Round 7: the API/E2E Engineer (primary pass recipient), to recheck API-08 L-002; informational notice to the Implementation Engineer. Round 6: the Solution Designer (CR-004). Round 5: the API/E2E Engineer (primary pass recipient), to recheck the API-08 counts for hub and Team; informational notice to the Implementation Engineer. Round 4: the Solution Designer (CR-003). Round 3: the Solution Designer. Then implementation, then a targeted source review, then API/E2E (API-08 request counts). Round 2: API/E2E Engineer. Round 1: Implementation Engineer.

## Residual Risks

- M-151 (opening a large Team/Org in the browser) is not measured; the request counts are proven by specs. Left to API/E2E.
- DS-007 does not cover the tool-call and reasoning renderers (C-11; outside the design's mapping). API/E2E can check a long token in a tool result.
- FU-001: 6 integration tests fail on base too, so the clean-clone integration run is `exit=1` by those only.

## Latest Authoritative Result

- Review Decision (round 7): `Pass`. CR-001…CR-004 resolved; scorecard 9.5/10, every category ≥ 9.4
- Review Decision (round 6, failure-origin): `Fail`. Origin: the SR-004 keep rule compares the snapshot base (all root changes) with C; a delegation's reconnect window always holds the new copy's non-message events, so every delegation reloads. Design gap, plus a review gap acknowledged. `Design Impact` → Solution Designer (CR-004)
- Review Decision (round 5): `Pass`. CR-001…CR-003 resolved; scorecard 9.5/10, every category ≥ 9.4 (Runtime Correctness and API/E2E Readiness back to 9.4)
- Review Decision (round 4): `Fail`. CR-002 resolved for hub and Org. CR-003 (running Team open fetches a loaded list twice) is `Design Impact` → Solution Designer. Scorecard 9.3/10 (Runtime Correctness 9.1, API/E2E Readiness 9.1). Everything else re-audited and holds
- Review Decision (round 3, failure-origin): `Fail`. Origin: the DS-002 reload policy (reload on every publication) causes avoidable repeated participant-list transfer on running hubs; design gap; review gap acknowledged. `Design Impact` → Solution Designer (CR-002)
- Review Decision (round 2): `Pass` ( CR-001 resolved; 9.5/10, every category ≥ 9.4). Round 1: `Fail`
- Review Entry Point: `Implementation Review`
- Supported Product Scenario Gate: `Pass` (SCN-007-MOBILE promoted)
- Material-Premise Gate: `Pass`
- Score Summary: 9.3/10. Below 9.2: API/E2E Readiness 8.9 and Runtime Correctness 9.0 (both CR-001)
- Failure Origin: N/A
- Recommended Recipient: API/E2E Engineer (round 2)
- Notes: otherwise a strong, faithful implementation. D-IMP-1…D-IMP-6 were checked and hold. The checks in `evidence/IMP-clean-clone.log` (at `b58a3106c3`) were reused, and none was rerun.
