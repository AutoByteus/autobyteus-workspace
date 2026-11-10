# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/small-follow-ups-batch-435/tickets/in-progress/small-follow-ups-batch-435/requirements-doc.md` (SR-003, `Approved`; REQ-005 clarified, AC-005-5…8, DEC-014…016)
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/small-follow-ups-batch-435/tickets/in-progress/small-follow-ups-batch-435/investigation-notes.md`
- Upstream Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/small-follow-ups-batch-435/tickets/in-progress/small-follow-ups-batch-435/solution-revision-record.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/small-follow-ups-batch-435/tickets/in-progress/small-follow-ups-batch-435/design-spec.md` (SR-003, `Ready`; delta limited to DS-006 entry form 2 and new DS-006b)
- Supplemental Task Artifacts Reviewed: `follow-ups.md` (FU-001…003); `handoff-architecture-design-complete.md`; `handoff-round-2-architecture-design-complete.md`; `handoff-round-3-architecture-design-complete.md`; `code-review-report.md` (CRR-001, CR-001). No behavior-defining supplement.
- Relevant Solution Revision IDs: `SR-001`, `SR-002`, `SR-003`
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/small-follow-ups-batch-435/tickets/in-progress/small-follow-ups-batch-435/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-003`
- Current Review Round: `3`
- Trigger: Solution Designer handoff `Architecture Design Complete`, round 3 (SR-003, after code review CRR-001 Design Impact CR-001), 2026-11-10
- Prior Review Round Reviewed: `2` (ARCH-REV-002, Pass)
- Latest Authoritative Round: `3`
- Current-State Evidence Basis: worktree `codex/small-follow-ups-batch-435` at `310fc27452` (no source changes). Opened during review: `WebSocketClient.ts`, `agentRunStreamReconnection.ts:25-100`, `TeamStreamingService.ts:268-275`, `agentRunCollaborationStreamingService.ts:84-106`, `agentOrgStreamingService.ts:100-140`, `FileExplorerStreamingService.ts:25-50,190-225`, `liveStreamReconnectScheduler.ts`, `pageResumeSignal.ts`, `nodeChangeFeed.ts`, `useTaskWorkerTasks.ts`, `taskWorkerTaskStore.ts:90-115`, `useAgentPackageDefinitionChangeFeed.ts`, `app.vue`, `MobileRemoteAccessShell.vue`, `MobilePairedShell.vue`, `mobileNodeSessionStore.ts:220-250`, `useMobileNavigation.ts`, `useMobileRunOpening.ts`, `useMobileRunTree.ts`, `MobileNewRun.vue`, `MobileRunSetup.vue`, `useMobileRunSetupController.ts:107-120`, `agentRunCollaborationStore.ts:195-245,430-458`, server `node-access-refusal.ts`, `open-socket-registry.ts`, `gated-websocket-route.ts`, `node-route-permissions.ts:27-40`, `standalone-agent-run-root-manager.ts:100-175,305-335,425-440`, `task-execution-closure.ts`, `task-execution-resource-service.ts:190-210`, Android `DesktopFullScreenController.kt`, `DesktopFullScreenRequest.kt`, probe `mobile-shell-probe.mjs` MSP-13 and verdict block. Round 2 also opened: `useRunHistorySectionLoad.ts:25-93` (`initialLoad` resolves after `load()`, which catches every read), `runHistoryLoadActions.ts:105-152` (a non-quiet `fetchTree` sets `store.error`), `agentRunCollaborationStore.ts:159-185` (`read` dedupes through `inspections` and settles with the published context or `errors[host]`), `mobileRunOpeningStore.ts` (`begin`/`commit`/`fail` are keyed by the row key; a new `begin` supersedes), `runListProjection.ts:79,98` (the two `agent:` keys), `useMobileRunSetupController.ts:1-25` (New run starts agent runs only). Round 3 opened (branch now at IR-001 `49c64e47ee`): `useChatRouteRunSync.ts` (D-13 rule), `agentContextsStore.ts:85-111` (`createRunFromTemplate` returns `temp-<ts>-<n>` and selects it, `selectRunWithoutShellNavigation` in mobile mode), `agentContextsStore.ts:160-173` (`promoteTemporaryId` re-keys the same `AgentContext` and moves the selection from the temp ID to P only when the temp ID is selected), `agentRunStore.ts:205-225` (promotion at `prepareAgentRun` success), and IR-001's `useMobileNavigation.ts:64-112` (`subjectKeys()` read from the route, so pushes after a replace carry P) and `MobilePairedShell.vue:173,183`.

## Routing Classification Review

- Task size: `Medium`
- Architectural risk: `High`
- Classification rationale reviewed: twelve bounded deltas inside existing owners (Medium); a stream-lifecycle change in all five web stream owners plus a page-wide close, a changed phone route contract with a page-start restore sequence, and a changed GraphQL answer for inactive hosts (High).
- Independent Architecture Review required by the classification: `Yes`
- Classification evidence or correction required: None. The classification matches the code read.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed`
- Approved requirements / intended behavior understood: Yes: twelve items, REQ-001…012, DEC-001…015 (SR-002 clarifies REQ-005 within the direction: both entry forms, "Opening…" while restoring, list fallback only after the reads settle, the list with its connection state when they fail; AC-005-5…7).
- Relevant existing behavior and evidence confirmed: Yes. Checked rule by rule: refused upgrades are accepted and closed with `4401/4403` and the refusal code as `reason` (`gated-websocket-route.ts:11-23`, `node-access-refusal.ts:53-54`, `open-socket-registry.ts:31`), so `isCredentialRefusalClose(code, reason)` gets the inputs it needs. `startOver()` sets the scheduler to `idle`, and a page resume does not attempt from `idle` (`liveStreamReconnectScheduler.ts:76-81,110-117`), so a final close stays final. The overlays in `app.vue:5-8` are gated only on `isEmbeddedWindow`. The inactive digest is `null` today (`standalone-agent-run-root-manager.ts:165-172`). `onLaunched` receives the run ID it now uses (`MobileNewRun.vue:20`, `MobilePairedShell.vue:170`).
- Scope guardrail confirmed: Yes.
- Approved change, preserved behavior, and outside scope understood: Yes. This includes DEC-008 (Phone Access off and network refusal stay retryable) and E-27 (the session ends only on a check).
- Every prospective blocking `Design Impact` finding is traceable: N/A in round 2 (no blocking finding remains).
- Remaining material ambiguity: None in requirements.
- Statements about existing code the design relies on: the cited lines were opened and match. Round 3: CR-001 corrected the premise behind AR-001's resolution. `onLaunched` gets the draft's `temp-*` ID, not the node run's. This review accepted that premise in rounds 1–2 (MP-001), and SR-003 corrects it. Round-2 claims also confirmed: `initialLoad` always resolves; a failed first read leaves `runHistoryStore.error` set; `collaboration.inspect` settles with the context published or `errors[host]`; New run starts agent runs only.

| Behavior ID | Kind | Design Alignment | Trigger / Evidence | Target Path / Spine | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | Pass | Pass | Pass | Confirmed | — |
| BEH-002 | User | Pass | Pass | Pass | Confirmed | — |
| BEH-003 | Contract | Pass | Pass | Pass | Confirmed | — |
| BEH-004 | User | Pass | Pass | Pass | Confirmed | Implementation note in Residual Risks |
| BEH-005 | User/System | Pass | Pass | Pass | Confirmed | AR-001, AR-002 resolved (SR-002) |
| BEH-006 | User | Pass | Pass | Pass | Confirmed | — |
| BEH-007 | User | Pass | Pass | Pass | Confirmed | — |
| BEH-008 | User | Pass | Pass | Pass | Confirmed | — |
| BEH-009 | System | Pass | Pass | Pass | Confirmed | AR-003 resolved |
| BEH-010 | System | Pass | Pass | Pass | Confirmed | AR-004 resolved |
| BEH-011 | Contract | Pass | Pass | Pass | Confirmed | — |
| BEH-012 | Operational | Pass | Pass | Pass | Confirmed | — |

## Supplemental Artifact Coherence Verdict

None (no behavior-defining supplement; the probe text is inlined in design-spec § Concrete Examples).

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | Bug fix / cleanup per item | — |
| Root-cause classification is explicit and evidence-backed | Pass | Item 10: the close rule is repeated in five owners with different code sets (confirmed in the four close handlers), and no owner closes streams at session end. Item 12: three definitions. | — |
| Refactor decision is explicit | Pass | Yes for items 10 and 12; No for the others | — |
| Refactor decision is reflected in concrete sections | Pass | `credentialRefusalClose.ts`, `closeAllLiveStreams.ts`, registry close-all actions, contracts export | — |

## Spine Inventory Verdict

| Spine ID | Scope | Readable | Narrative | Facade vs Owner | Naming | One Owner / Call Order | Off-Spine Off Main Line | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-002 | Primary | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-003 | Return/Event | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-004 | Primary | Pass | Pass | N/A | Pass | Pass | Pass | Pass (inventory complete, AR-003) |
| DS-005 | Primary | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-006 write | Primary | Pass | Pass | N/A | Pass | Pass (row tap and Create run both traced) | Pass | Pass |
| DS-006b | Return/Event | Pass | Pass | N/A | Pass | Pass (`useMobileRouteRunSync` decides when, `useMobileNavigation.replaceRowKey` writes; stores stay unaware of the route) | Pass | Pass |
| DS-006 restore | Primary | Pass | Pass (steps 1–7, readiness per row kind, no timer) | N/A | Pass | Pass (`useMobileSubjectRestore` drives the order) | Pass | Pass |
| DS-007 | Primary | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-008 | Primary | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-009 | Primary | Pass | Pass | N/A | Pass | Pass | Pass | Pass |

## Boundary Encapsulation Verdict

| Boundary / Owner | Entry Point Clear | Internals Internal | Bypass Controlled | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Registry close-all actions | Pass | Pass | Pass | Pass | `closeAllLiveStreams` calls only store actions |
| `useMobileRunOpening` (`open`, `reopen`) | Pass | Pass | Pass | Pass | Restore does not call the selection actions itself |
| `probeNodeIdentity` | Pass | Pass | Pass | Pass | Both fetches inside the probe |
| `getAgentStatuses` → `TaskExecutionResourcePort` | Pass | Pass | Pass | Pass | No store read for inactive hosts |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Clear | Forbidden Explicit | Coherent | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `services/liveStreamLifecycle/*` | Pass | Pass | Pass | Pass | `credentialRefusalClose.ts` stays a leaf. `closeAllLiveStreams.ts` imports stores, and stores never import it. No file-level cycle. |
| `mobileNodeSessionStore` ↔ stream stores | Pass | Pass | Pass | Pass | The shell reacts; the session store stays unaware of streams |
| Android `SystemBarInsets` ↔ controller | Pass | Pass | Pass | Pass | Mode provider, no back-reference |

## Interface Boundary Verdict

| Interface | Subject | Singular | Identity | Generic Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `isCredentialRefusalClose(code, reason)` | Pass | Pass | Pass | Low | Pass |
| `closeAllLiveStreams()` | Pass | Pass | Pass | Low | Pass |
| Registry close-all actions | Pass | Pass | Pass | Low | Pass |
| `openRun({ orgQuery?, rowKey?, replace? })` | Pass | Pass | Pass (exactly one subject on every call, replace included) | Low | Pass |
| `agentRunRowKey(runId)` | Pass | Pass | Pass | Low | Pass |
| `useMobileRunTree.revealRow(key)` | Pass | Pass | Pass | Low | Pass |
| `useMobileNavigation.replaceRowKey(rowKey)` | Pass | Pass | Pass | Low | Pass |
| `useMobileRouteRunSync()` | Pass | Pass | Pass | Low | Pass (AR-005: reuse the D-13 detection, do not copy it) |
| `useMobileSubjectRestore({ tree, opening, navigation, initialLoad })` | Pass | Pass | Pass (readiness named per row kind) | Low | Pass |
| `refreshListedStatuses(listedAgentRunIds)` | Pass | Pass | Pass | Low | Pass |
| GraphQL `closedTaskExecutionsDigest` | Pass | Pass | Pass | Low | Pass (meaning written per state, AR-004) |
| `NodeConnectionFlow.retryUrlFor`, `fromHttpStatus(code, nodeName)` | Pass | Pass | Pass | Low | Pass |
| contracts `taskExecutionReferenceKey` | Pass | Pass | Pass | Low | Pass |

## Existing Capability / Subsystem Reuse Verdict

| Need | Checked | Sound | New Piece Justified | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Close classification / close-all | Pass | Pass | Pass | Pass | Extends `liveStreamLifecycle` |
| Session-end reaction | Pass | Pass | N/A | Pass | Existing `isPaired` watch |
| Restore lookup / open | Pass | Pass | Pass | Pass | Reuses tree and disclosure; `reopen` added |
| Inactive digest | Pass | Pass | N/A | Pass | Existing port |

## Subsystem / Capability-Area Allocation Verdict

| Area | Allocation | Decision | Supports Owners | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| web live stream lifecycle | Pass | Pass | Pass | Pass | — |
| web phone shell (navigation/restore) | Pass | Pass | Pass | Pass | AR-001, AR-002 resolved |
| server standalone root | Pass | Pass | Pass | Pass | — |
| Android ui/connection/shell | Pass | Pass | Pass | Pass | — |
| contracts | Pass | Pass | Pass | Pass | — |

## Reusable Owned Structures Verdict

| Repeated Structure | Evaluated | File Choice | Ownership | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Credential-refusal close test | Pass | Pass | Pass | Pass | Not a full retry policy (owners keep their own final codes) |
| Task-execution key ×3 | Pass | Pass | Pass | Pass | — |
| Collaboration release loop | Pass | Pass | Pass | Pass | — |

## Shared Structure / Data Model Tightness Verdict

| Structure | One Meaning | Redundant Removed | Overlap Controlled | Core vs Variant | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `NodeProbeCause` | Pass | Pass | Pass | N/A | Pass | — |
| `closedTaskExecutionsDigest` | Pass | Pass | Pass | N/A | Pass | Meaning per state in the doc comment and GraphQL description (AR-004) |

Derived consumers listed with a decision for each: `Pass` (GraphQL reader, route readers, `NodeProbeCause` callers, key importers).

Vocabulary (Principle 15): `Pass` (`window_refused` is distinct from `refused`, `host_refused` and `network_refused`; `row` matches `MobileRunTreeRow.key`).

## File Responsibility Mapping Verdict

| File | Singular | Matches Owner | Re-Tightened | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| New `credentialRefusalClose.ts`, `closeAllLiveStreams.ts`, `useMobileSubjectRestore.ts` | Pass | Pass | Pass | Pass | — |
| `MobilePairedShell.vue` | Pass | Pass | N/A | Pass | Creates the restore in setup; `onLaunched(runId)` passes `agentRunRowKey(runId)` |
| `utils/runListProjection.ts`, `useMobileRunTree.ts` | Pass | Pass | N/A | Pass | The one writer of `agent:<id>`; `revealRow` uses the existing fold owners |
| Over-500-line files | Pass | Pass | N/A | Pass | Net ≤ 0 rule stated; FU-002 records the old excess |

## Subsystem / Folder / File Placement Verdict

| Path | Placement | Folder Match | Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `services/liveStreamLifecycle/` | Pass | Pass | Low | Pass | — |
| `composables/mobile/useMobileSubjectRestore.ts` | Pass | Pass | Low | Pass | — |

## Removal / Decommission Completeness Verdict

| Item | Named | Replacement | Scope Explicit | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `diagnosticFromWebSocketClose` + spec lines | Pass | N/A | Pass | Pass | grep evidence |
| `utils/dateUtils.ts` | Pass | N/A | Pass | Pass | grep evidence |
| Probe FU-003 exemption | Pass | Pass | Pass | Pass | — |
| Duplicate keys | Pass | Pass | Pass | Pass | — |
| `activeListedAgentRunIds` + spec | Pass | Pass | Pass | Pass | One caller |
| Inline release loop | Pass | Pass | Pass | Pass | — |

## Legacy / Backward-Compatibility Verdict

| Area | Retention | Clean Cut | Verdict | Notes |
| --- | --- | --- | --- | --- |
| Route without `row` | No | Pass | Pass | The normal no-subject path, not a compatibility branch |
| Key re-exports | No | Pass | Pass | Rejected explicitly |

## Persisted-Data Transition Verdict (When Applicable)

| Area | Decision | Evidence | Proportionate | Migration | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Android saved page URL | Not Affected | Pass | Pass | N/A | Pass | Saved verbatim; missing `row` means no subject |

## Change / Refactor Safety Verdict

| Area | Realistic | Seams | Cleanup | Verdict |
| --- | --- | --- | --- | --- |
| Steps 1–8 | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic | Needed | Present | Bad Shape | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Item 2 probe, item 10 owner and close-all, item 11 client | Yes | Pass | Pass | Pass | — |
| Item 6 route, Create run, restore | Yes | Pass | Pass | Pass | Good and avoided shapes given (timer; `toList` right after `initialLoad`; a second spelling of the key) |

## Material Premise Validation (Only When Needed)

### MP-001 — The phone's Create run leaves the route without the run's identity

- Related approved requirement: REQ-005, AC-005-1
- Relevant behavior ID(s): BEH-005
- Initiating basis kind: `User`
- Trigger: the phone user taps New run, then Create run (`MobileNewRun.vue`, `MobileRunSetup.vue`). The run opens in place of New run.
- Support evidence: `useMobileRunSetupController.ts:113-115` creates the run and calls `onLaunched(runId)`. `MobileNewRun.vue:20` emits `launched(runId)`. `MobilePairedShell.vue:170` calls `navigation.openRun({ replace: true })` without the ID.
- Forward path: Create run → run screen (no `row`) → messages or VNC Viewer (views carry only `orgKeys()`, `useMobileNavigation.ts:98-101`) → reload or Android process death → no `row` → no restore → the subject-less view redirects to the list.
- Consequence: a run started on the phone does not reopen after a reload or a restore, which REQ-005 requires.
- Reachability: `Reachable`
- Review consequence: AR-001. Round 2: resolved. DS-006 write entry form 2 passes `agentRunRowKey(runId)`; AC-005-6.

### MP-002 — A delegated task row does not exist yet when the first history load ends

- Related approved requirement: REQ-005, AC-005-1, AC-005-3
- Relevant behavior ID(s): BEH-005
- Initiating basis kind: `User` / `System`
- Trigger: the user taps a delegated task row (`agent:<id>/<rowKey>`; `useMobileRunOpening.ts:71-73`), opens a view, then reloads.
- Support evidence: task rows come from `collaboration.taskRows(host)`, filled only after `ensureStoredView(host)` publishes the host's stored view (`useMobileRunTree.ts:46-48,57`). That read is asynchronous and starts only when the listed entries exist, that is, after `initialLoad`.
- Forward path: page start → `checkStatus(true)` awaits `initialLoad` → restore looks for `agent:<id>/<rowKey>` → the host's stored view is still in flight → not found.
- Consequence: under the design as written ("bounded wait"), restore either guesses with a timer or falls back to the list while the row is about to appear.
- Reachability: `Reachable`
- Review consequence: AR-002. Round 2: resolved. Step 3 awaits `collaboration.inspect(host)` unless the host's context is already published, then reveals the row; AC-005-7.

### MP-003 — The first history load fails during a restore

- Related approved requirement: REQ-005
- Initiating basis kind: `System`
- Trigger: Android restores the page after process death while the node is unreachable or Phone Access is off. Both are supported states shown on the run list (`MobilePairedShell.vue:143-147`).
- Forward path: `checkStatus(true)` → `initialLoad` rejects (caught, `MobilePairedShell.vue:113`) → rows are empty → under the design, "not found" → `toList()`.
- Consequence: the subject is dropped even though the list never showed it gone. REQ-005's fallback is for "a subject that no longer appears in the run list".
- Reachability: `Reachable`
- Review consequence: part of AR-002. Round 2: resolved by DEC-014 (the list with its connection state) and step 6; AC-005-5.

### MP-004 — A draft is promoted while the phone shows it (SR-003 premise)

- Related approved requirement: REQ-005, AC-005-6, AC-005-8 (DEC-016)
- Initiating basis kind: `User`
- Trigger: New run → Create run → the user sends the first message.
- Forward path: `createRunFromTemplate` selects `temp-*` (mobile mode) → `onLaunched(temp)` → route `row=agent:temp-…` → send → `prepareAgentRun` succeeds → `promoteTemporaryId(temp, P)` re-keys the same context and moves the selection temp → P (`agentContextsStore.ts:160-173`) → the D-13 watch sees the selection change from the route's ID, with `getRun(P)` returning the displayed context → `replaceRowKey(agent:P)`.
- Consequence without DS-006b: a reload or restore finds no `agent:temp-…` row and shows the list, so AC-005-6 fails (CR-001).
- Reachability: `Reachable`
- Review consequence: DS-006b. Entries pushed before the send are replaced when visited. An entry never visited again keeps the draft key, and if reached after a reload it goes to the list. That is consistent with REQ-005's "gone" outcome and is the only option the History API allows.

## Unresolved Approved-Behavior Or Current-State Gaps

None.

## Review Decision

`Pass`

## Findings

No blocking finding.

### AR-005 — DS-006b should reuse the desktop's promotion detection, not copy it (non-blocking, Low)

- Protects: REQ-005 / AC-005-6 (same rule on both shells, per DEC-016); Principles 11 and 13 (one owner per derived fact)
- Scope status: `Within Approved Scope`; changes approved behavior: No
- Evidence: the design says detection is "the desktop chat's rule (`useChatRouteRunSync.ts:33-44`, D-13)" and maps `useMobileRouteRunSync.ts` as "promotion detection as `useChatRouteRunSync.ts`". That allows a second copy of the rule ("the selection moved from the route's ID, and the same context object is now under the new ID"). `useChatRouteRunSync`'s interface is already independent of the shell (`routeRunId: Ref`, `replaceRouteRunId(runId)`).
- Recommended update, for implementation and code review: `useMobileRouteRunSync` calls `useChatRouteRunSync`, or a shared detection extracted from it under a shell-neutral name that both use. It passes `routeRunId` = the agent ID of a top-level `agent:<id>` row only (null for child keys `agent:<host>/…` and `team:` keys). Its `replaceRouteRunId` records R → P and calls `navigation.replaceRowKey(agentRunRowKey(P))`. The Back-time replacement for recorded R stays in `useMobileRouteRunSync`.
- Recipient: implementation engineer (applied in the rework); the Solution Designer is told for the record.

### Resolved earlier

Round 1 findings, all resolved in SR-002 and checked against the current design spec and code (see `ARCH-REV-002`). AR-001's resolution rested on a premise CR-001 corrected; SR-003 fixes it with DS-006b, re-reviewed in `ARCH-REV-003`:

- AR-001 (Design Impact): Resolved. DS-006 write has entry form 2. `onLaunched(runId)` → `openRun({ replace: true, rowKey: agentRunRowKey(runId) })`. `agentRunRowKey` is the one writer of `agent:<id>` (`runListProjection.ts:79,98` use it). Every `openRun` call names exactly one subject. New run starts agent runs only (`useMobileRunSetupController.ts:14-19`).
- AR-002 (Design Impact): Resolved. Restore steps 1–7, owned by `useMobileSubjectRestore`:
  - `restoring` and `opening.begin` are set in setup, before the immediate watch.
  - Readiness per row kind: top-level rows → `runHistoryStore.error === null` after `initialLoad`, which always resolves (`useRunHistorySectionLoad.ts:29-38,83-85`), and a non-quiet `fetchTree` sets `error` (`runHistoryLoadActions.ts:148-152`). Team members → `revealRow` over `executionRows`. Delegated rows → `inspect(host)` settled (`agentRunCollaborationStore.ts:159-185`), then `revealRow`.
  - A missing row → the list. A failed read → the list with its connection state (DEC-014).
  - No timer. A new tap supersedes through the keyed pending open (`mobileRunOpeningStore.ts:16-26`).
- AR-003: Resolved. The DS-004 row lists the three other sockets and how each closes. FU-003 records the `NodeChangeFeed` retry.
- AR-004: Resolved. The meaning is written per state for the doc comment and the GraphQL description.

## Classification

N/A (Pass)

## Recommended Recipient

`/software_engineering_team/implementation_engineer`

## Residual Risks

- Item 10: desktop windows also stop reconnecting on a credential-refusal close, as DEC-008 intends. Change feeds keep their own retry (FU-003).
- Item 6, DS-006b implementation notes:
  - Required test (design Guidance): follow a real draft (`createRunFromTemplate`) through `promoteTemporaryId`. Cover the route before and after the send, a view pushed before the send, Back to the run-screen and list entries pushed before it, a reload before the send → list (AC-005-8), and a non-promotion selection change → no rewrite.
  - The Back-time replacement runs on a route change, so it must not fight the restore. At page start there are no records, so it cannot.
- Item 6, implementation notes:
  - When the restore ends because the session was rejected at the first check (the paired shell unmounts), it should stop acting once its scope is disposed, so it does not rewrite the route under the pairing screen.
  - The spec asked for in Guidance (mount with `?row=…&screen=desktop` and no target → no `toList` before the restore decides) is the key ordering test.
- Item 5, implementation note: keep `setLayoutInCutout` inside `setOn`'s on/off branches. A recreated-in-landscape activity goes through `clear()` → `reset()` before the page asks for full screen again (`DesktopFullScreenRequest.kt:21-24,30-37`). The emulator is API 35 (cutout forced to `ALWAYS`), so a unit test of the controller must cover API 28–34.
- Item 11 has not been run (same as 446). API/E2E runs it.
- UNK-001 (other cutout devices) stays open.

## Latest Authoritative Result

- Review Decision: `Pass`
- Material-Premise Gate: `Pass` (MP-001…003 reachable; each is addressed by the SR-002 design)
- Notes: SR-003's DS-006 delta (entry form 2 corrected, DS-006b) is ready. The rework is limited to DS-006 entry form 2 and DS-006b on top of IR-001, then the code reviewer's Targeted Delta Review. AR-005 is guidance for the rework.
