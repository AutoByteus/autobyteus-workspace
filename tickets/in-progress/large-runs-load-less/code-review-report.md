# Code Review Report

## Review Round Meta

- Review Entry Point: `API/E2E Failure-Origin Review` (round 3). Rounds 1–2 were `Implementation Review`; their results stand except where round 3 updates them
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
- Current Code Review Revision ID: `CRR-003`
- Current Review Round: 3 (failure-origin)
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
| CR-002 | Blocking (round 3) | `autobyteus-web/stores/agentRunCollaborationStore.ts:77` (`publish` → `reloadRoot`); the DS-002 reload policy (and the same rule for Team and Org, C-14) | On a running hub, the participant lists (the hub's is close to its whole log) are fetched again on every context publication: twice per selection (inspect, then attach) and again on every new delegation or settings Save (a reconnect for a fresh snapshot). This is avoidable repeated full-history transfer (DESIGN.md rule 3) against the ticket's outcome. It is correct and complete (API-05), and no worse than base | The Solution Designer revises the reload policy. Options: (a) on a running root, start the Team-tab load only once the live stream is ready, and do not reload on the attach that follows an inspection; (b) reload on a reconnect only when a gap is possible (for example a continuity check of the stream's change sequence), or fetch only the messages since the last applied sequence; (c) accept the per-reconnect reload as the protocol's cost, fix only the selection double, and record the rest. Apply one policy across hub, Team and Org | `Design Impact` → Solution Designer |
| CR-001 | — **Resolved (round 2)**: IR-003 `438ea7fb65` | `autobyteus-web/components/mobile/MobileTeamMessages.vue:6-8`; `autobyteus-web/components/mobile/MobileActivityDigest.vue:105-108` | The mobile message screens read only `listMessages()`. While the focused member's list is loading they say "No team messages yet for the focused member.", and after a failed load (a damaged log, AC-006) they keep saying it, which is a silently empty log. AC-006 requires the messages to show as unavailable with the reason and never silently empty, and the design mapping gives these screens "loading and error states". The desktop Team tab does this correctly (`CollaborationMessagesPanel.vue`) | Read the view's `messagesStatus()` on both screens. Show a loading state while `loading`, and an unavailable state with `error` when `error`, reusing the Team tab's `loading_messages` / `messages_unavailable` strings (en, zh-CN). Keep "No team messages yet" for a loaded empty list only; the digest summary likewise. Add specs for loading, error-with-reason, and loaded-empty | `Local Fix` → Implementation |

## Follow-ups

- Follow-ups this review added: FU-003 (`existingRunConfigStore.ts` is at 503 effective lines on base and after; the change does not grow it).

## Classification

- Round 3: `Design Impact` (CR-002), owned by the Solution Designer. The implementation follows DS-002's reload call sites as written. The policy itself causes the avoidable repeated transfer, and choosing a narrower trigger (or accepting part of it) is a design decision. Round 2: none (Pass). Round 1: `Local Fix`, owned by the Implementation Engineer: a bounded UI omission against the approved AC-006 and the design's own mapping. No design or requirement change is needed.

## Recommended Recipient

- Round 3: the Solution Designer. Then implementation, then a targeted source review, then API/E2E (API-08 request counts). Round 2: API/E2E Engineer. Round 1: Implementation Engineer.

## Residual Risks

- M-151 (opening a large Team/Org in the browser) is not measured; the request counts are proven by specs. Left to API/E2E.
- DS-007 does not cover the tool-call and reasoning renderers (C-11; outside the design's mapping). API/E2E can check a long token in a tool result.
- FU-001: 6 integration tests fail on base too, so the clean-clone integration run is `exit=1` by those only.

## Latest Authoritative Result

- Review Decision (round 3, failure-origin): `Fail`. Origin: the DS-002 reload policy (reload on every publication) causes avoidable repeated participant-list transfer on running hubs; design gap; review gap acknowledged. `Design Impact` → Solution Designer (CR-002)
- Review Decision (round 2): `Pass` ( CR-001 resolved; 9.5/10, every category ≥ 9.4). Round 1: `Fail`
- Review Entry Point: `Implementation Review`
- Supported Product Scenario Gate: `Pass` (SCN-007-MOBILE promoted)
- Material-Premise Gate: `Pass`
- Score Summary: 9.3/10. Below 9.2: API/E2E Readiness 8.9 and Runtime Correctness 9.0 (both CR-001)
- Failure Origin: N/A
- Recommended Recipient: API/E2E Engineer (round 2)
- Notes: otherwise a strong, faithful implementation. D-IMP-1…D-IMP-6 were checked and hold. The checks in `evidence/IMP-clean-clone.log` (at `b58a3106c3`) were reused, and none was rerun.
