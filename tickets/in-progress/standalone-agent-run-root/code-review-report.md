# Code Review Report — standalone-agent-run-root

## Review Round Meta

- Review Entry Point: `Implementation Review` (round 7: delivery re-entry, IR-005 for DR-001).
  - Round 6 was an `Implementation Review` of SR-006 § 11, the root shutdown fence (IR-004).
  - Round 5 was an `API/E2E Failure-Origin Review` (F-02, Design Impact).
  - Round 4 was an `Implementation Review` targeted delta (Pass).
  - Round 3 was an `API/E2E Failure-Origin Review`; its section is kept below as the record of F-01's origin.
  - The round 1–2 checks and scorecard are carried forward except where noted.
- Requirements Doc Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/standalone-agent-run-root/tickets/in-progress/standalone-agent-run-root/requirements-doc.md` (Approved, SR-002)
- Investigation Notes Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/standalone-agent-run-root/tickets/in-progress/standalone-agent-run-root/investigation-notes.md` (E-01–E-21)
- Solution Revision Record Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/standalone-agent-run-root/tickets/in-progress/standalone-agent-run-root/solution-revision-record.md`
- Design Spec Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/standalone-agent-run-root/tickets/in-progress/standalone-agent-run-root/design-spec.md` (SR-005)
- Supplemental Task Artifacts Reviewed As Context:
  - `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/cross-scope-agent-mentions-sr008/ui-ux-spec.md` (VIS-004/009/012/013, RD-004).
  - The package path under `autobyteus-web-prototype` is stale; the implementation engineer used this canonical copy.
- Relevant Solution Revision IDs: SR-002 (requirements), SR-004 (design substance), SR-005 (base refresh), SR-006 (§ 11 root shutdown fence)
- Design Review Report Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/standalone-agent-run-root/tickets/in-progress/standalone-agent-run-root/design-review-report.md` (ARCH-REV-003 Pass)
- Architecture Review Revision Record Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/standalone-agent-run-root/tickets/in-progress/standalone-agent-run-root/architecture-review-revision-record.md`
- Relevant Architecture Review Revision IDs: ARCH-REV-002, ARCH-REV-003, ARCH-REV-004 (§ 11 Pass; notes N-1, N-2)
- Implementation Handoff Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/standalone-agent-run-root/tickets/in-progress/standalone-agent-run-root/implementation-handoff.md`
- Implementation Revision Record Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/standalone-agent-run-root/tickets/in-progress/standalone-agent-run-root/implementation-revision-record.md`
- Relevant Implementation Revision IDs: IR-001, IR-002 (CR-001 fix), IR-003 (CR-002 fix), IR-004 (SR-006 § 11), IR-005 (DR-001 harness import)
- Code Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/standalone-agent-run-root/tickets/in-progress/standalone-agent-run-root/code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-008`
- Current Review Round: 7
- Review Scope: `Targeted Delta Review`. Round 6 was a `Full Re-Audit`.
- CRR-007 was the separate proportional test review, `api-e2e-test-review-report.md`.
- Review Scope Evidence (round >1):
  - Round 7:
    - The delta `git diff 07ee58675..3c7b62f53` is one line: the import path in `test-support/native-input-history/native-accepted-input-history.integration.test.ts`.
    - No source change. Delivery's merge of `origin/personal@1b9739cad` (`1195f4356`) is delivery-owned.
  - Round 6:
    - The delta `git diff 470dd1d93..eccea069b` changes 2 source files (`agent-run-root-shutdown-fence.ts`, `agent-run.ts`) and adds tests in 3 files (append-only: +151/+77/+48, 0 deletions).
    - It changes shared lifecycle semantics on the Stop spine, hence a Full Re-Audit.
    - No other source changed since CRR-004, so the earlier structural evidence for unchanged files stays valid and is re-confirmed below. The new delta was reviewed in full against design § 11.
  - Round 4:
    - The delta `git diff dd97ff02c..782ec9f11` covers 8 web files, all on the CR-002 path. There is no server change.
    - The browse-subject union gains one variant. Its consumers are `eventMonitorActiveTracePageService` and `eventMonitorActiveTraceBrowse#subjectKey`, both now exhaustive switches. The Org, Team and host producers are unchanged (grep).
    - The `generated/graphql.ts` change is additive.
  - Round 2 (below):
  - The delta `git diff 7ef6f828a..c0e8ce7fd` touches 4 files.
  - Three are the CR-001 owners: the collaboration stream handler, the websocket composition line and the module doc. The fourth is the handler's unit test.
  - No shared interface, data shape or spine node outside CR-001 changed. The handler's constructor `Pick` gains `getActive`; its only production caller is `api/websocket/index.ts`, and the integration fixture passes the real manager.
  - Every round-1 check and score not affected by CR-001 is carried forward.
- Trigger: Local Fix complete IR-005 (DR-001 delivery blocker), from `/implementation_engineer`.
  - Round 6 was triggered by Implementation Complete IR-004 (SR-006 § 11, after ARCH-REV-004 Pass).
  - Round 5 was triggered by API/E2E Fail (API-REV-002, F-02).
  - Round 4 was triggered by Local Fix IR-003 (CR-002).
  - Round 3 was triggered by API/E2E Fail (API-REV-001, F-01).
  - Round 2 was triggered by Local Fix IR-002.
- Prior Review Round Reviewed: Round 6 (CRR-006, Pass); test review CRR-007 (Not Applicable)
- Latest Authoritative Round: 7
- Coverage Investigation Reviewed: `/Users/normy/autobyteus_org/autobyteus-worktrees/standalone-agent-run-root/tickets/in-progress/standalone-agent-run-root/api-e2e-coverage-investigation.md`
- Execution Coverage Report Reviewed: `/Users/normy/autobyteus_org/autobyteus-worktrees/standalone-agent-run-root/tickets/in-progress/standalone-agent-run-root/api-e2e-execution-coverage-report.md`
- API/E2E Revision Record Reviewed: `/Users/normy/autobyteus_org/autobyteus-worktrees/standalone-agent-run-root/tickets/in-progress/standalone-agent-run-root/api-e2e-revision-record.md`
- Relevant API/E2E Revision IDs: API-REV-001, API-REV-002
- Delivery Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/standalone-agent-run-root/tickets/in-progress/standalone-agent-run-root/delivery-revision-record.md` (DR-001)
- Relevant Delivery Revision IDs: DR-001
- Failing Scenario IDs: F-01 (AE-10; AC-007 / REQ-007 / BEH-008 / DS-006), on standalone collaborator conversation pages
- Exact Failing Commands / Execution Mode:
  - TESTING.md dev stack (`pnpm dev`), with Chrome driven by playwright-core over CDP (trusted wheel and click input).
  - Data was seeded on the clean base and opened with the branch.
  - Failing request: web query `GetRunEventMonitorActiveTracePage(runId=echo_helper_b7ea_166c…)`. The server answers "Run package 'agent:echo_helper_b7ea_166c…' is unavailable."
- Failure Evidence Paths, under `api-e2e-evidence/`:
  - `browser/s08`, `s09`, `s10-after-retry.png` and `s11b-host-earlier-events.png`;
  - `ae10-collaborator-pages.json` and `ae10-host-pages.json`.

## Routing Classification Review

- Task size: `Large`
- Architectural risk: `High`
- Selected route: `Implementation Review`
- Independent source review required by the classification: `Yes`
- Classification evidence or correction required: none.
  - The scope is runtime ownership for every eligible standalone run, plus a delivery-text change on every runtime.
  - The classification stays correct.

## Review Scope

- **Changed implementation and behavior reviewed:** REQ-001–REQ-009 as implemented on `codex/standalone-agent-run-root`:
  - `git diff b37d7a934..HEAD`;
  - commits `9c3080a20`, `bccb1c095` and `7ef6f828a`;
  - 116 non-ticket files, +3521/−1718.
- **Files and areas reviewed:**
  - **Standalone root module:** `autobyteus-server-ts/src/standalone-agent-run-root/**`, in particular:
    - `domain/standalone-agent-run-root.ts` and `domain/standalone-host-agent-handle.ts`;
    - `services/standalone-agent-run-root-manager.ts`, `services/standalone-root-message-delivery.ts` and `services/standalone-root-location-service.ts`.
  - **`agent-execution`:**
    - `services/standalone-run-ports.ts`, `services/standalone-agent-run-lifecycle-service.ts` and `services/standalone-stopped-run-model-config-updater.ts`;
    - `services/agent-run-command-coordinator.ts`, `services/agent-run-service.ts` and `runtime/general-process-run-supervisor.ts`.
  - **Callers of the old root manager:** the collaboration stream handler, `standalone-run-liveness.ts`, the websocket, GraphQL and REST edges, and `collaborator-root-port-resolver.ts`.
  - **Team (REQ-002):** `team-root-collaborator-agent-registry.ts`, `flat-team-execution-manager.ts`, `flat-team-member-config-resolver.ts` and `configured-agent-execution-registry.ts`.
  - **Org (REQ-003):** `agent-org-run.ts` and `agent-org-run-message-delivery.ts`.
  - **REQ-005:**
    - the three header builders;
    - the Org first-message-summary migration reader;
    - web `interAgentDelivery.ts`.
  - **REQ-006:** the token summary service, store, repository and aggregate, `token-usage-stats.ts`, and web `tokenUsageMeterStore.ts` and `useTokenUsageWorkspaceScope.ts`.
  - **REQ-007:**
    - the active-trace page projection and its types;
    - the GraphQL visual;
    - the Team and Org member page services;
    - web `eventMonitorActiveTraceBrowsePresentation.ts` and `EventMonitorBrowseAssistantRow.vue`.
  - **REQ-008:** web `agentRunCollaborationContext.ts`.
  - **REQ-009:** `collaborator-definition-catalog.ts` and the guard edits.
  - **Tests:**
    - predecessor tests moved to `tests/{unit,integration}/standalone-agent-run-root/`, compared with the base;
    - the new root, handle, restore, lifecycle and stream-handler tests.
  - **Docs:** `standalone_agent_run_root.md` and related links.
- **Explicit exclusions:**
  - generated `autobyteus-web/generated/graphql.ts`, beyond confirming the new query type;
  - the 26 base failures (D-R4);
  - the 3 docs-only commits on `origin/personal`, which delivery integrates;
  - the AC-001 live-provider runtime E2E suites, which API/E2E owns.
- **Focused re-run by the reviewer** (`autobyteus-server-ts`, `npx vitest run`) covered:
  - `tests/unit/standalone-agent-run-root`;
  - `agent-collaboration-stream-handler`;
  - `agent-run-command-coordinator`;
  - `standalone-agent-run-lifecycle-service`;
  - `agent-run-restore-service`;
  - `tests/unit/token-usage`;
  - the root and Team builder tests;
  - `tests/architecture`.

  Result: 29 files and 212 tests, all passed.
- **Round 2 re-run** covered `agent-collaboration-stream-handler.test.ts`, `tests/unit/standalone-agent-run-root` and `tests/integration/standalone-agent-run-root`. Result: 6 files and 46 tests, all passed.

## Project Design Guideline

- At base `b37d7a934` the guideline is `SOLUTION_DESIGN_BEST_PRACTICES.md`. Upstream `f8300e7bd` renames it to `DESIGN.md`, which is not on this branch yet.
- I applied it together with the shared principles. Its rule 3 ("smallest coherent owner") and rule 4 ("preserve guarantees, not machinery") are the ones that bear most on this review.

## Upstream Behavior And Production-Path Basis Confirmation

- **Approved requirements basis understood:** Yes.
  - REQ-001–REQ-004 and REQ-009 are refactor and parity work with no user-visible change (Q-3, AC-010).
  - REQ-005–REQ-008 are small approved behavior changes. REQ-010 needs no code.
- **Design-spec behavior map verified against the implementation:** Yes.
  - I traced each BEH from its entry surface through the code.
  - One deviation from the design's explicit "Child commands are unchanged" (§1, AR-001 bullet) is recorded as CR-001.
- **Design review report and round confirmed:** ARCH-REV-003 Pass on SR-005.
- **Behavior-basis status:** `Confirmed`.
  - The basis itself is clear. CR-001 is an implementation deviation from it, not an upstream ambiguity.
- **Changed or newly discovered behavior:** none upstream.
- **Remaining material ambiguity:**
  - The live freshness of the standalone Token Meter roll-up when only a child reports usage is not specified by REQ-006/AC-006.
  - It is recorded as a residual risk, not a finding (CG-05).

| Behavior ID | Current Status | Current Implementation Path And Lifecycle Evidence | Contradicting Or Newly Discovered Supported Behavior Evidence |
| --- | --- | --- | --- |
| BEH-001 Standalone command | Confirmed | `AgentRunCommandCoordinator.post` → `StandaloneRunCommandPort.postUserMessage` (`StandaloneAgentRunRootManager.postUserMessage` → `resolveRoot`) → `StandaloneAgentRunRoot.postHostUserMessage` [gate] → `StandaloneRootMessageDelivery.postToHost`, which runs `host.ensureReady` → `onActiveRunReady` → admission → `run.postUserMessage(message, postOptions)`. Ineligible runs keep the plain `resolveCommandReadyAgentRun` path. Overlay and ack ownership stays in the coordinator. | — |
| BEH-002 Child → host | Confirmed | `StandaloneRootMessageDelivery.deliverTo`, host branch: `host.ensureReady()`, then `communication.deliver`. No wake path remains. | — |
| BEH-003 Stop / delete / archive / shutdown | Confirmed | `AgentRunService.terminateAgentRun` → `StandaloneRunLifecyclePort.stopRoot` → `root.stop()` (children, then `host.terminate()` → `lifecycle.terminateHost`) → unregister. Delete and archive go through `StandaloneRunLiveness` → `manager.endRoot`. Shutdown goes through supervisor `close` → `stopAll`. Outcome mapping matches the base `terminateAgentRun`. | — |
| BEH-004 Team collaborator agent | Confirmed | `FlatTeamExecutionManager.prepareCollaboratorAgent` → `TeamRootCollaboratorAgentRegistry.prepare/commit`. `getDirectAgent`, `directAgentHandles`, status, input snapshots, freeze and dispose all consult it. `addCollaborator` and `memberContexts.push` are removed, and no other `memberContexts` consumer depended on collaborators. | — |
| BEH-005 Self-delegation | Confirmed | `StandaloneRootMessageDelivery.delegateTask` throws `CollaborationContractError("COLLABORATION_SELF_TARGET_REJECTED")` before resolution (own address) and after resolution (resolved own placement). | — |
| BEH-006 Delivery text | Confirmed | Root builder, Team builder (`inter-agent-message-runtime-builders.ts`) and global builder (when the sender has a member context). The released header is frozen in the Org migration reader, and the web header regex accepts both forms. The native `autobyteus-ts` `InterAgentMessage` pipeline is not on the server delivery path. | — |
| BEH-007 Token totals | Confirmed | GraphQL `getStandaloneRunTokenUsageSummary` → `StandaloneRunTokenUsageSummaryService` (tree from the live root, else the stored package, via `StandaloneRootLocationService.listAgents`) → `TokenUsageRunStore.getStandaloneRunSummary` → `listByRunIds` (deduplicated) → `buildStandaloneRunTokenUsageSummaryFromRecords`. Web: `standaloneRunSummaries`, refetched on each host report. | — |
| BEH-008 Earlier events | Confirmed (round 4). Round 3 had it Contradicted (F-01). Now a standalone child's browse subject is `standaloneMember` → `agentRunCollaborationMemberEventMonitorActiveTracePage`; the host stays `run` | The page projection emits `inter_agent` for a user trace with `senderId`. The Team and Org member page services resolve `senderAddress`. Web presentation → `InterAgentMessageSegment`. | — |
| BEH-009 Host label | Confirmed | `agentRunCollaborationContext.identityOf`: host → `memberTitleName(address)`. | — |
| BEH-010 Preserved | Confirmed | Predecessor tests changed only by API substitution; I checked the old and new versions of the relocated tests side by side. Round 2: collaboration-stream child commands use `getActive(hostRunId) ?? readyRoot(hostRunId)`, the base semantics, so a crashed host is not restarted for a child command (CR-001 resolved). | — |

## Supported Product Scenario And Reachability Gate (Mandatory)

| Scenario ID | Related Behavior / Contract IDs | Kind | Actor / Initiator | Coherent Goal Or Governing Event | Supported Entry Surface / Event | Scenario Shape | Forward Production Path / Lifecycle | Expected Outcome / Consequence | Independent Evidence | Scenario Validity | Review Use |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SC-01 | BEH-001, AC-010 | User | User of a standalone run (e.g. General Agent) | Send a message, possibly with `@` mentions | Host composer → `/ws/agent/:runId` `SEND_MESSAGE` | Normal | Coordinator → port → root gate → `host.ensureReady` → post | Host replies; mentions admitted; overlay and ack as before | REQ-001, AR-002, live checks on Claude SDK and Codex | Supported Normal Scenario | Use |
| SC-02 | BEH-002 | System | A collaborator agent | Reply to the host by address | `send_message_to` tool | Normal | Root delivery → `host.ensureReady` → deliver | Host receives the delivery with the sender address | REQ-001, REQ-005, live check | Supported Normal Scenario | Use |
| SC-03 | BEH-003 | User | User | Stop, delete or archive a run with collaborators | Stop button; history delete/archive | Normal | `stopRoot` / `endRoot` | Children end before the host; the run is released | AC-001, CR-001/CR-002 predecessor tests | Supported Normal Scenario | Use |
| SC-04 | BEH-001/002, BEH-010, AC-001 | System + User | Host runtime crash, then the user keeps working | Continue the conversation and keep working with collaborators after the host's runtime died | Runtime crash (supported event, AC-001 "host crash"), then the host composer or the collaborator's composer, interrupt or approve on `/ws/agent-collaboration/:hostRunId` | Explicit Edge | Root survives the crash. A host command or child→host message restores the host. Child commands go to children (design: "Children keep running", "Child commands are unchanged") | Host restored on host-directed paths only; child commands unaffected | REQ-001 ("host crash recovery"), AC-001, design §1 "No user-visible change" and AR-001 bullet, base `agent-collaboration-stream-handler.ts` (`getActive ?? resolveCommandReadyRoot`) | Supported Explicit Edge Scenario | Use |
| SC-05 | BEH-007 | User | User watching the Token Meter of a standalone run while children work | See the total including children | Token Meter panel | Normal | Roll-up refetched on host reports and on panel open | Total = sum of the concrete records at fetch time | REQ-006, AC-006 | Supported Normal Scenario (freshness while only children report: `Unclear`, see CG-05) | Use / Investigate |
| SC-06 | BEH-008 | User | User paging back in an Event Monitor trace | Read old deliveries as "From <Sender>:" | Event Monitor "earlier events" | Normal | Page projection → presentation | "From <Sender>:" | REQ-007 | Supported Normal Scenario | Use |
| SC-07 | REQ-009 | Contract | Architecture guard suite | Boundary obligations hold | `tests/architecture` | Contract | Guard inventory | Green without weakened rules | REQ-009, D-R3, ARCH-REV-003 | Supported Normal Scenario | Use |

### Candidate Finding And Mechanism Gate

| Candidate ID | Observation Or Mechanism | Scenario / Contract ID | Independent Trigger | Forward Path / Lifecycle / Consequence | Evidence | Disposition | Reason / Proportionate Response |
| --- | --- | --- | --- | --- | --- | --- | --- |
| CG-01 | Collaboration-stream child commands (`SEND_MESSAGE`, `INTERRUPT_GENERATION`, `APPROVE_TOOL`/`DENY_TOOL` to a collaborator or copy) now always call `readyRoot` → `root.ensureHostReady()`. After a host crash, every child command first restores the host. If that restore fails, the child command fails with `AGENT_ROOT_COMMAND_FAILED`. | SC-04 | The host runtime crashes (a supported event, AC-001), then the user acts on a collaborator from its composer or controls | `AgentCollaborationStreamHandler.handleMessage` → `readyRoot` → `ensureHostReady` [root gate] → `lifecycle.activateHost` → only then `executeAgentCommand`. Before this branch: `getActive(hostRunId)` returned the surviving root and the command reached the child without touching the host. Consequences: an unrequested host restore (a new provider session; on Codex a new app-server) on the user's child action, and a child interrupt, approval or message blocked by a host-restore failure. | `src/services/agent-streaming/agent-collaboration-stream-handler.ts:125`; base handler line `this.roots.getActive(...) ?? await this.roots.resolveCommandReadyRoot(...)`; base manager comment "survives a host crash"; design §1 AR-001 bullet "Child commands are unchanged" and Key Tradeoffs; the docs (`standalone_agent_run_root.md` "Root lifetime") list user message, child message and connect as the host-ready triggers, not child commands | Promote → CR-001 | Restore the predecessor semantics: use the registered active root for commands (`manager.getActive(hostRunId)`), and fall back to `resolveRoot` + `ensureHostReady` only when no active root exists. Add a unit test: with a crashed host and a live root, a child command does not call `ensureHostReady`. |
| CG-02 | `StandaloneRunCommandPort`, the root manager and `CollaboratorAdmission` are bound to module-level process slots (`bindProcess…`/`getProcess…`), not passed through constructors everywhere. | Design dependency rules; engineering contract | — | The coordinator defaults to the bound process port. The supervisor binds and releases all three. `agent-execution` imports the root module only from the supervisor (the composition root). | `standalone-run-ports.ts:55-68`, `standalone-agent-run-root-manager.ts:270-290`, `general-process-run-supervisor.ts`; established local pattern (`bindProcessAgentRunService`, `AgentRunManager.getInstance`) | Reject | It follows the codebase's established process-binding pattern. The dependency direction holds, and the class statics the design removed are gone. It is not a maintainability defect. |
| CG-03 | Standalone Token Meter roll-up requests are coalesced without the generation check that `refreshTeamRunSummaryUntilStable` uses, so a host report during an in-flight refetch could be missed until the next one. | SC-05 | Two host usage reports within one localhost GraphQL round trip | Requires two LLM-call completions within milliseconds. Each server summary is record-backed (persisted before emit), so each single refetch after a report includes it. | `tokenUsageMeterStore.ts` `fetchStandaloneRunSummary`; `run_summary_after_event` record-backed contract | Reject (Technically Possible but Unsupported/Contrived: artificial timing) | No change required. |
| CG-04 | `StandaloneAgentRunRootManager.resolveRoot` after a root fail-stop or a failed Stop (the root is still in `active` but not admitting) would try to load a second root and hit the directory reservation. | — | Persistence fail-stop or child-termination failure, then a new command | Infrastructure failure states with no supported reproduction from a normal product action. The same shape existed in the base manager. | base `agent-run-collaboration-root-manager.ts` `ensureRoot` | Reject (Not Reachable from a supported scenario / out of scope by default) | No change required. |
| CG-05 | Roll-up freshness when only children report usage (e.g. a collaborator commanded from its own composer): the total updates on the next host report or panel open. | SC-05 | User watches the panel while only a child works | `useTokenUsageWorkspaceScope` refetches only on host report-count changes | Implementation handoff § Important Assumptions; REQ-006/AC-006 specify the total, not live freshness | Hold for Evidence | No requirement establishes live child freshness. Recorded as a residual risk for API/E2E and the solution owner, not scored. |
| CG-06 | The REQ-005 Team-run builder change is outside the design's file map. | REQ-005, AC-005 | — | Team deliveries use `inter-agent-message-runtime-builders.ts`; AC-005 requires "every runtime", including team-member senders | requirements-doc REQ-005/AC-005 | Reject as a finding (approved behavior; the design omission is editorial) | No action. |
| CG-07 | The frozen released header in the `agent-org-history-first-message-summary-v1` migration. | Persisted-data principle 5 | — | The migration matches historical raw traces, so following the current builder would silently break matching | evidence-reader diff, plus a new regression test in the migration suite | Reject as a finding (correct confinement of historical knowledge to the migration) | No action. |

## API/E2E Failure-Origin Review (Round 3, F-01)

### Approved behavior and scenario basis

- **The failing scenario still represents approved behavior.**
  - REQ-007 and AC-007: the Event Monitor "earlier events" page shows inter-agent deliveries as "From <Sender>:".
  - Design §7 and D-R6 remove the documented "earlier events" limit. This branch's `autobyteus-web/docs/chat.md` now states that the page works.
- **Scenario SC-06 (Supported Normal Scenario).** A user opens a standalone run's collaborator (or collaborator-Team member) conversation and pages back to older events.
  - In a standalone run, deliveries are received mainly by the collaborators. Their conversations are therefore the principal surface for AC-007, not an edge.
  - The entry surface is the collaborator conversation in the standalone run tree (`agentRunCollaborationStore.childTargetFor`), then the Event Monitor's earlier-events paging.

### Forward production path and evidence

1. `autobyteus-web/stores/agentRunCollaborationStore.ts:271`: a standalone child target sets `browse: { kind: 'run', runId: child.agentRunId }`.
2. `autobyteus-web/services/eventMonitor/eventMonitorActiveTracePageService.ts`: the subject union is `run | teamMember | agentOrgMember`.
   - A `run` subject calls `GetRunEventMonitorActiveTracePage(runId)`.
   - That query resolves a *top-level run package*. A standalone child is not one; it lives in its host's `collaboration/` package.
   - The server rejects the request: "Run package 'agent:<child>' is unavailable".
3. The correct server owner already exists: `agentRunCollaborationMemberEventMonitorActiveTracePage(hostRunId, memberAddress, agentRunId, beforeCursor)` in `api/graphql/types/agent-run-collaboration.ts`.
   - It was on the base and is served by `StandaloneRootMemberViewProjectionService.getActiveTracePage`.
   - API/E2E evidence: it returns 127 events, with both the pre-change and the new-header deliveries as `inter_agent` and `senderAddress: /general_agent` (`ae10-collaborator-pages.json`).
   - The web has no client query for it. A grep for `agentRunCollaborationMemberEventMonitorActiveTracePage` in `autobyteus-web` (outside `generated/`) finds nothing.
4. The host page passes. The host is a top-level run, so the `run` subject is correct there (`ae10-host-pages.json`, `s11b`).

### Failure origin

- **Classification: implementation defect.** It is web routing for standalone children; the store line and service were unchanged by the branch.
  - It existed on base `b37d7a934`, but there it was hidden behind the documented limit.
  - This ticket's approved AC-007, the D-R6 docs change, and the BEH-008 implementation claim now require that page to work.
- **Not a requirement gap.** AC-007 cannot be met on the run's main delivery surface without the page loading. The server-side owner and query already exist, so the fix is bounded wiring on the web side, not new behavior.
- **Not a test, fixture or environment issue.** The fixture is realistic: stored history was seeded on the clean base, and more than 100 events were reached through real paging. The failure is deterministic: retry fails the same way, and the request and response were captured.
- **Review gap (acknowledged).** In rounds 1–2 I confirmed BEH-008 as "page projection → presentation". I did not trace it forward from the supported entry surface (the standalone collaborator conversation) through the web fetch subject.
  - The evidence was available to source review: `agentRunCollaborationStore.ts:271` (`kind: 'run'` for a child) against the service's subject union.
  - The defect was detectable without runtime evidence. The BEH-008 row and Runtime Correctness score rationale are corrected below.

### Required fix (CR-002)

- Add a standalone collaboration-member subject to `EventMonitorActiveTraceBrowseSubject`, for example `{ kind: 'standaloneMember'; hostRunId; memberAddress; agentRunId }`.
  - It calls the existing `agentRunCollaborationMemberEventMonitorActiveTracePage`. Add the web GraphQL query and regenerate types.
- Use it for standalone children in `agentRunCollaborationStore.childTargetFor`, for both task Agents and task/collaborator-Team members. The host keeps `kind: 'run'`.
- Add a durable web test proving that a standalone child's browse subject routes to the member query, and that its `inter_agent` visuals render "From <Sender>:".
- No server change is expected.

### Other API/E2E observations (not classified as failures)

- **O-01 — Org root on Codex, "Agent organization run not found" on Stop, 1 of 3 executions under heavy load.**
  - `AgentOrgRun.terminate`/`terminateOnce` are unchanged, and the REQ-003 extraction is a faithful move: rounds 1–2 compared it line by line with the base.
  - There is no evidence linking it to the moved delivery or admission code. Disposition: `Hold for Evidence`. It is not attributed to this branch.
  - If it recurs, API/E2E should capture the server log around `terminateOnce` (fence or child-finish result) for a separate classification.
- **CG-05 (held):** observed as predicted (child-only usage appears on the next host report; the server is current immediately). It stays a residual risk.
- **TESTING.md** cites the old `tests/integration/agent-run-collaboration/…` path. This is a docs sync item for delivery, not a code defect.

## API/E2E Failure-Origin Review (Round 5, F-02)

### Failure context

- **Failing case.** F-02 (AE-03, LE-O1, Org root on Codex). This is the AC-001 live gate and the AC-010 preserved Org Stop. API-REV-002 reclassified it from O-01.
- **Command.** `RUN_CODEX_E2E=1 AIC_ROOT_RUNTIMES=codex_app_server pnpm exec vitest run tests/e2e/runtime/agent-initiated-collaborators.e2e.test.ts -t "codex_app_server: LE-O1"` (suite unchanged vs base).
- **Observed.**
  - `terminateAgentOrgRun` returns `success:false` ("Agent organization run not found."), and the Org stays registered.
  - Teardown then fails: `stopAllAgentOrgRuns` reports "AgentOrg … did not accept termination".
- **Frequency.** Branch 3 of 10; base 0 of 12.
- **Evidence** (all under `api-e2e-evidence/`):
  - `r2-o01-diag-le-o1-codex-4.log` (diagnostic output);
  - `r2-o01-le-o1-codex-3.log`;
  - `r2-o01-base-le-o1-codex-{1..10}.log`;
  - `probes/tmp-o01-diagnostic.diff` (reverted).

### Approved behavior and scenario basis

- **SC-03 extended to Org roots (Supported Normal Scenario).** The user stops a busy Org run, e.g. while an agent is still finishing a turn after receiving a delivery.
  - In LE-O1 the Stop is issued right after the helper's reply reaches the coordinator, which starts a new coordinator turn.
  - Stopping during activity is the ordinary purpose of Stop.
  - A turn ending naturally within the interrupt round trip is ordinary runtime timing; nobody contrives it. The race window is the provider RPC latency.
- **Approved basis:** AC-001 (the predecessor suites pass unchanged) and AC-010 (Stop is preserved). The failing scenario still represents approved behavior.

### Forward path and mechanism (current code)

1. `AgentOrgRun.terminateOnce` calls `frozenTerminationScope.fenceAgentRunsForRootShutdown()`, then `ConfiguredAgentExecutionHandle.fenceForRootShutdown`, then `AgentRun.fenceInputAndInterruptForRootShutdown`.
2. `AgentRun` (`agent-run.ts:257-270`) begins the irreversible `AgentRunRootShutdownFence`. Its `evaluate` (`agent-run-root-shutdown-fence.ts:33-47`) sees `hasActiveTurn` from the AgentRun's local `lifecycleState` and calls `interrupt()`.
3. Codex answers `-32600 no active turn to interrupt`; the provider's turn has already ended. `interrupt()` resolves `{accepted:false, RUNTIME_COMMAND_FAILED}`.
4. The fence re-reads `snapshot().quiescent`. Local quiescence lags while the turn-completed source events are still being dispatched, so it is still false, and the fence **settles the failure permanently** (`settle(result)`).
5. The latch is irreversible per AgentRun. Every retry returns the same failed result: the test Stop, the teardown `stopAll`, and the reused `frozenTerminationScope ??=` in `AgentOrgRun`. The diagnostic shows the identical message three times.
6. The Org root is then unstoppable for the rest of the process.

### Branch-change analysis

- **The whole fence chain is unchanged on this branch.** `git diff --stat b37d7a934..HEAD` over `src/agent-execution/domain`, `src/agent-collaboration/execution/backends`, `src/agent-execution/backends` and `src/runtime-management` is empty. `AgentOrgRun.terminate`/`terminateOnce` are byte-identical to the base.
- **REQ-003 Org extraction:** a line-for-line move (verified in rounds 1–2). It has no effect on termination sequencing.
- **REQ-002 registry:** applies to Team roots (`FlatTeamExecutionManager.prepareCollaboratorAgent`). Org collaborators are held by the Org's root registries.
  - The fenced handle set of a mounted Team is unchanged: before the branch, collaborator Agents were fenced as entries in `configured.listHandles()`; now they are fenced via `directAgentHandles()`.
- **Probable reason for the branch-only rate (not proven):** REQ-005, an approved behavior change.
  - Deliveries now carry `sender address`. Replies by address to senders inside teams (`/squad/lead`, copy members) now reach them, where on the base they failed (E-05).
  - That adds inter-agent turns in flight around the final Stop in LE-O1, so the shared fence's race window is hit more often.
  - This is a plausible exposure mechanism only. Nothing on the branch introduced the defect.

### Failure origin

- **Classification: Design Impact.** This is a pre-existing defect in the shared root-shutdown fence. It is exposed more often by this branch's approved behavior and is not an implementation defect in the changed scope.
  - **Mechanism:** an interrupt that the runtime rejects because the turn has *just* ended is treated as a terminal fence failure and latched irreversibly. It should be treated as a turn that is completing, with the fence waiting for local quiescence or retrying.
  - **Why it is not a Local Fix in this ticket:**
    - The owner (`AgentRunRootShutdownFence` and `AgentRun` fence/interrupt semantics) is shared by Team, Org and standalone roots on every runtime. Claude has the equivalent "has no active turn to interrupt" path.
    - It is outside this ticket's approved design and file map.
    - The correct semantics are a design decision with real risk: wait for quiescence or bound it, retryability of a settled latch, distinguishing "turn already ended" from other interrupt failures, and stale local active-turn state.
- **Not a test, fixture or environment issue.** The suite is unchanged, the base runs are clean, and the diagnosis is in production code.
- **Not a review gap.** The fence and runtime code are outside the changed scope and were not altered by the branch. The defect needs live provider timing to manifest, so source review of this diff could not reasonably detect it.
- **Proportionate direction for the solution owner (not prescriptive):**
  1. Decide whether the AC-001/AC-010 gate for this ticket needs the shared fence fixed here, or a separately tracked prerequisite.
  2. If it is fixed here, the likely minimal change is in `AgentRunRootShutdownFence.evaluate`: when an interrupt is rejected and the run is not yet quiescent, keep the fence open and settle on later quiescence, instead of `settle(result)`. A bounded wait, or recognizing the "no active turn" outcome from the backends, would avoid hanging on a genuinely stale active turn.
  3. Add a deterministic unit test that resolves the interrupt as rejected before the turn-completed event is dispatched.
- **Useful additional evidence:** log the fenced AgentRun ID and the local `activeTurn` at the moment of rejection. That would confirm the completion race against a stale turn, and identify which agent (coordinator, helper or copy member) is involved.

## Round 7 — Delivery Re-Entry (DR-001, IR-005)

- **Blocker.** `pnpm test:native-input-history`, the workspace native-to-web layer in TESTING.md, could not resolve `../../autobyteus-server-ts/tests/integration/agent-run-collaboration/native-compaction-root-fixture`. The folder was moved in IR-001.
- **Fix.** The import now points at `tests/integration/standalone-agent-run-root/native-compaction-root-fixture`.
  - The harness uses only fixture members that still exist: `manager.getInspection`, `root.executeAgentCommand`, `connect`, `send`, `close`, `run`, `native` and `compress`. None of them were renamed by the branch.
- **Verification.** My own re-run of `pnpm test:native-input-history` passed: 1 file, 2 tests.
- **Remaining old-path references** (tracked files, outside `tickets/`):
  - `TESTING.md:222`, which is delivery's docs sync;
  - `autobyteus-collaboration-stream-contracts/dist/*.map`, which is build output;
  - the deliberately kept API-contract names (`api/graphql/types/agent-run-collaboration.ts` and the contracts DTO module).
- **Review gap (acknowledged).** The round-1 cleanup check searched server `src` and `tests` only. It should have covered every workspace reference to moved test paths, including `test-support/` harnesses with their own Vitest configs. The impact was limited to a test harness, and delivery caught it.

## Round 6 — SR-006 § 11 Root Shutdown Fence Review (IR-004)

### Behavior basis

- **BEH-003a (Stop of a busy root while a turn is ending):** `Confirmed`.
  - Path: `AgentOrgRun.terminateOnce` / Team / standalone → frozen scope → `ConfiguredAgentExecutionHandle.fenceForRootShutdown` → `AgentRun.fenceInputAndInterruptForRootShutdown` → `AgentRunRootShutdownFence` attempt.
  - Scenario: SC-03 extended to Org roots (Supported Normal Scenario, CRR-005). Approved basis: AC-001 and AC-010, per design § 11.

### Rule-by-rule verification

| Rule | Result | Evidence |
| --- | --- | --- |
| F-1: a rejected interrupt is not a fence result | Pass | `onInterruptResult`: if the run is quiescent, it settles accepted; otherwise it keeps the attempt `pending` and starts the bounded timer. Later `evaluate()` calls (scheduled after each dispatched batch, unchanged) settle accepted on `isRootShutdownQuiescent`. `interruptRequested` prevents a second interrupt within an attempt. No error-text parsing. |
| F-2: bounded wait | Pass | `ROOT_SHUTDOWN_REJECTED_INTERRUPT_QUIESCENCE_TIMEOUT_MS = 5000`, injectable through options. On expiry it re-evaluates once: accepted if quiescent (N-2), otherwise the original `rejectedInterrupt`. `clearTimer` runs in `settle` and `fail`. The default timer is `unref`'d. |
| F-3: only acceptance is irreversible | Pass | State `pending → accepted / ended`; `isReusable` is false only for `ended`. `AgentRun` swaps the attempt inside the existing serialized dispatch-queue step, after the idempotent reconcile and input fence. Concurrent callers share a pending attempt, and `accepted` stays latched. A throwing interrupt goes to `fail` and ends only that attempt. The old `begin()` gate is replaced by lazy creation (`rootShutdownFence?.evaluate()` is a no-op before the first fence call), so pre-shutdown behavior is unchanged. |
| F-4: diagnostics | Pass | Warns at rejection and at expiry with the run ID, `activeTurn` (kind and turn ID), `hasPendingCommand`, and the interrupt code and message. The fence formats the text; `AgentRun` supplies state via the `diagnostics()` callback and `logger.warn`. |
| Scope (owner only) | Pass | Only the two named files changed. No root-specific, runtime-specific or input-admission change (diff stat). |
| Tests | Pass | They cover F-1, F-2 (fake timers), N-2, F-4 exact text with a visible turn change, F-3 latch and retry, the throwing interrupt, concurrency, the unref'd default timer, and Org first-Stop-fails then second-Stop-succeeds with a real `AgentRun`. Existing tests are untouched (0 deletions). My re-run of `agent-run`, `agent-run-root-shutdown-fence`, `agent-run-compaction-races`, `frozen-root-termination-scope`, `configured-agent-execution-handle`, `agent-org-run-termination` and `root-team-run-termination` passed: 8 files, 82 tests. |

### Candidate gate (round 6)

| Candidate ID | Observation | Scenario / Contract | Disposition | Reason |
| --- | --- | --- | --- | --- |
| CG-08 | The expiry callback evaluates outside the dispatch queue. | § 11 F-2 | Reject | The snapshot read is synchronous and the settle is idempotent. The pre-existing interrupt-result handler had the same shape. No supported interleaving produces a wrong result. |
| CG-09 | A genuinely stale local active turn makes Stop take up to 5 s and then fail (retryable). | § 11 F-2, ARCH-REV-004 N-1 | Reject as a finding | This is the designed bounded outcome. Live evidence of an IDENTIFIED turn at expiry escalates as Design Impact (N-1), which API/E2E owns. |
| CG-10 | `agent-run.ts` is at 498 effective lines (limit 500). | Size guardrail | Reject as a finding | It is within the limit; the delta adds 8 lines confined to attempt selection and diagnostics. Recorded as a residual risk: the next change to the file should extract a concern. |

## Structural / Design Checks

| Check | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Task design health assessment is present, evidence-backed, and preserved by the implementation | Pass | One owner per eligible run; the lifecycle holds no root reference; Team collaborators are in their own registry; files extracted to their natural owners | — |
| Implementation matches approved behavior-defining supplemental artifacts | Pass | VIS-013 host label via `memberTitleName`; RD-004 rendering via `InterAgentMessageSegment` | — |
| Data-flow spine inventory clarity and preservation under shared principles | Pass | DS-001–DS-006 trace as designed; the lock order is root gate, then lane, with no reverse call | — |
| Ownership boundary preservation and clarity | Pass | The root owns the host through its handle, and the manager is the registry. Round 2: child commands are no longer coupled to host readiness (CR-001 resolved) | — |
| Off-spine concern clarity | Pass | Host member-context builder, eligibility, summary service and `standalone-stopped-run-model-config-updater.ts` each serve one owner | — |
| Existing capability/subsystem reuse check | Pass | Reuses `RootOperationGate`, `RootTaskExecutionLifecycle`, `RootCommunicationEngine`, `FlatTeamAgentExecutionHandle`, the location service and the summary payload type | — |
| Reusable owned structures check | Pass | The Org delivery mirrors the Team and standalone delivery owners. Some delivery code (`withLiveLease`, `isLiveChild`) is similar across the three roots, as in the base; consolidating it is out of scope | — |
| Shared-structure/data-model tightness check | Pass | One new GraphQL visual (`EventMonitorInterAgentVisual`); the token payload type is reused; `StandaloneRunPostResult` is a tight discriminated union | — |
| Repeated coordination ownership check | Pass | Host readiness lives in one place (the handle), with joined activation | — |
| Empty indirection check | Pass | `postHostUserMessage` adds the gate and admitting check; `delivery.postToHost` owns sequencing; the manager's `postUserMessage` resolves the root | — |
| Scope-appropriate separation of concerns and file responsibility clarity | Pass | Root 376 effective lines (lifecycle, gate, API); delivery 241; manager 267; lifecycle 325 | — |
| Ownership-driven dependency check | Pass | `agent-execution` reaches the roots only through the two ports, plus the composition-root import in the supervisor | — |
| Authoritative Boundary Rule check | Pass | The stream, GraphQL, REST and history use the manager or root only. The coordinator and `AgentRunService` use the ports, never the lifecycle, for eligible runs. The lifecycle fails loudly when an eligible run is activated without its member context | — |
| File placement check | Pass | `src/standalone-agent-run-root/{domain,persistence,services}`; the registry is under `agent-team-execution/local/registries`; Org delivery is under `agent-org-execution/services` | — |
| Flat-vs-over-split layout judgment | Pass | Parallels `agent-org-execution` | — |
| Interface/API/query/command/service-method boundary clarity | Pass | Explicit `getStandaloneRunTokenUsageSummary` beside the exact-run query; `resolveRoot`, `stopRoot`, `endRoot` and `stopAll` each have one meaning | — |
| Naming quality and naming-to-responsibility alignment check | Pass | Names match the design (`StandaloneAgentRunRoot`, `StandaloneHostAgentHandle`, `TeamRootCollaboratorAgentRegistry`). The GraphQL resolver file keeps its API name `agent-run-collaboration.ts`, which is acceptable | — |
| No unjustified duplication of code / repeated structures in changed scope | Pass | The frozen header in the migration is intentional; the "duplicate" is a historical format | — |
| Patch-on-patch complexity control | Pass | Round 6: the fence change replaces latch semantics in its owner rather than layering a retry wrapper on top. Earlier: clean replacement of the old manager and binding; no layered workarounds | — |
| Dead/obsolete code cleanup completeness in changed scope | Pass | Round 7: the stale harness import (DR-001) is fixed; a workspace-wide grep leaves only TESTING.md (docs sync) and build-output maps. Earlier: No `agent-run-collaboration/`, `AgentRunCollaborationRootManager`, `resolveCommandReadyRoot`, `bindCollaboration` or `onHostPublished` references remain (grep over `src` and `tests`) | — |
| Relevant test scenarios and assertions are clear and requirement-aligned | Pass | Round 4 adds CR-002 tests: the store gives every standalone child `standaloneMember`; the service routes each of the four subjects with exact variables; the row renders "From General Agent:" without the raw header. Earlier rounds: new tests cover AR-001/002/003, handle concurrency, Stop order, REQ-004, the header on three builders, roll-up (stored, live, none), the page projection and the migration regression. Round 2 adds two CR-001 tests: a crashed host is not restored for a child send or interrupt, even when the restore would throw; and the fallback resolves the root only when no root is active | — |
| Test fixtures/helpers are reasonably reusable and test structure remains coherent | Pass | `tests/fixtures/standalone-run-roots-fixture.ts` is shared by the `AgentRunService` integration tests | — |
| No stale, duplicated, or compatibility-only tests are retained in changed scope | Pass | Predecessor tests were moved, not duplicated; removed assertions are API substitutions only (old and new versions compared side by side) | — |
| API/E2E readiness for the next workflow stage | Pass | CR-002 resolved; API/E2E reruns AE-10 and the web suites | — |

## Source File Size And Structure Audit (If Applicable)

| Source File | Effective Non-Empty Lines | `>500` Hard-Limit Check | `>220` Delta Check | SoC / Ownership Check | Placement Check | Preliminary Classification | Required Action |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `autobyteus-web/stores/tokenUsageMeterStore.ts` | 492 | Pass (near limit) | Pass (+53) | Pass | Pass | Watch | None now. The next addition should split the store (the handoff notes this too) |
| `src/agent-team-execution/local/flat-team-execution-manager.ts` | 485 | Pass | Pass (+40/−48) | Pass | Pass | OK | — |
| `src/agent-execution/runtime/general-process-run-supervisor.ts` | 444 | Pass | Pass | Pass (composition root) | Pass | OK | — |
| `src/standalone-agent-run-root/domain/standalone-agent-run-root.ts` | 376 | Pass (≤400, REQ-003) | Rename + restructure | Pass | Pass | OK | — |
| `src/agent-org-execution/domain/agent-org-run.ts` | 371 | Pass (≤400, REQ-003) | Pass | Pass | Pass | OK | — |
| `src/agent-execution/services/standalone-agent-run-lifecycle-service.ts` | 325 | Pass (≤400) | Pass | Pass | Pass | OK | — |
| `src/standalone-agent-run-root/services/standalone-agent-run-root-manager.ts` | 267 | Pass | New file (replaces the 259-line old manager) | Pass | Pass | OK | — |
| `src/standalone-agent-run-root/services/standalone-root-message-delivery.ts` | 241 | Pass | New file (extracted) | Pass | Pass | OK | — |
| `src/agent-org-execution/services/agent-org-run-message-delivery.ts` | 190 | Pass | New file (moved) | Pass | Pass | OK | — |
| `src/agent-execution/services/standalone-stopped-run-model-config-updater.ts` | 137 | Pass | New file (moved; identical logic to the base `updateStoppedModelConfig`) | Pass | Pass | OK | — |
| Other moved `standalone-root-*` files | ≤280 | Pass | Renames | Pass | Pass | OK | — |

## Legacy / Backward-Compatibility Verdict

| Check | Result | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms in changed scope | Pass | No aliases. The web header regex accepts both forms for stored history; this is a tolerant reader required by the design, not a dual path |
| No legacy old-behavior retention in changed scope | Pass | Binding, statics, wake path and `addCollaborator` removed |
| Dead/obsolete code cleanup completeness in changed scope | Pass | Verified by grep |
| Approved persisted-data transition decision is followed without unnecessary migration work | Pass | `Not Affected`; roll-up reads existing records and trees |
| No version-specific dual reads/writes or request-time old-shape fallback exists | Pass | — |
| Approved transition mechanics match the reviewed design | Pass | The existing migration keeps its released header frozen inside the migration boundary |

## Dead / Obsolete / Legacy Items Requiring Removal (Mandatory If Any Exist)

None.

## Docs-Impact Verdict

- Docs impact: `Yes`. Already updated in this branch:
  - `standalone_agent_run_root.md`;
  - `agent_communication.md`;
  - `agent_team_execution.md`;
  - `token_usage.md`;
  - `run_history.md`, `agent_tools.md`, `prompt_engineering.md` and `README.md` (links and paths);
  - web `chat.md`.
- Why: module rename and ownership, the new header, the registry, the roll-up, and the removed earlier-events limitation.
- Round 2: the "Root lifetime" and collaboration-stream sections in `standalone_agent_run_root.md` now state that child commands use the active root without restarting the host.

## Additional Material Premise Validation (When Required)

### Upstream Design-Review Material-Premise Decisions

| Premise ID | Current Status | Changed Evidence / Reason |
| --- | --- | --- |
| P-001–P-003 (ARCH-REV-002) | Confirmed | — |
| AFB-004 "hides a real violation" (ARCH-REV-003) | Confirmed `Not Reachable` | Both construction sites inject `agentDefinitionService`; the guard edit narrows `requiredInputs` and keeps the obligation |

New material premises: none beyond the candidate gate above (CG-01 is fully captured by SC-04).

## Review Scorecard (Mandatory)

- Overall score (`/10`): 9.3
- Overall score (`/100`): 93
- Score calculation note: simple average for trend visibility only. Round 2 re-scored only the categories CR-001 affected; the others are carried forward.

| Priority | Category | Score | Why This Score | What Is Weak / Holding It Down | What Should Improve |
| --- | --- | --- | --- | --- | --- |
| `1` | `Data-Flow Spine Inventory and Clarity` | 9.3 | DS-001–DS-006 are implemented as designed; the lock order is clean | — | — |
| `2` | `Ownership Clarity and Boundary Encapsulation` | 9.3 | One owner per run; ports keep `agent-execution` free of the root module; the lifecycle no longer knows roots. Child commands are independent of host readiness again (CR-001 resolved) | The stream handler now depends on two manager methods (`resolveRoot`, `getActive`); both are the manager's public API, so this is not a boundary bypass | — |
| `3` | `API / Interface / Query / Command Clarity` | 9.3 | Tight port types, explicit summary query, single-meaning manager methods | — | — |
| `4` | `Separation of Concerns and File Placement` | 9.3 | Cohesive extractions (delivery, Save updater, Org delivery); all targets ≤400 | `tokenUsageMeterStore.ts` is at 492 | Split the store on its next addition |
| `5` | `Shared-Structure / Data-Model Tightness and Reusable Owned Structures` | 9.1 | No new loose shapes; one mirrored GraphQL visual | Similar live-lease and liveness code in three root delivery owners (pre-existing pattern) | Optional future consolidation |
| `6` | `Naming Quality and Local Readability` | 9.3 | Domain names follow the approved terminology; comments explain lifecycle intent | — | — |
| `7` | `API/E2E Readiness` | 9.2 | Strong unit and integration coverage, including the CR-001 path | The AC-001 live-provider E2E is still to run (API/E2E scope) | Run AC-001 on Claude plus one other runtime |
| `8` | `Runtime Correctness And Behavioral Fidelity` | 9.2 | All REQs are correct on their supported paths. CR-001 was confirmed live by API/E2E; CR-002 is fixed and unit-tested | The standalone child earlier-events page has not yet been re-run live (AE-10) | API/E2E reruns AE-10 |
| `9` | `No Backward-Compatibility / No Legacy Retention` | 9.5 | Clean-cut removal; historical format confined to the migration | — | — |
| `10` | `Cleanup Completeness` | 9.4 | No leftover references; docs synced | — | — |

## Findings

### CR-002 — Standalone children's "earlier events" page requests the wrong query (AC-007)

- **Status:** `Resolved` in round 4 (IR-003, `782ec9f11`). Was Open in round 3. **Severity:** High for AC-007, because the page does not load on the run's main delivery surface.
- **Type:** behavioral fidelity, web routing. **Origin:** API/E2E F-01, with a review gap acknowledged above.
- **Location:**
  - `autobyteus-web/stores/agentRunCollaborationStore.ts:271`, where `browse` is `{ kind: 'run', runId: child.agentRunId }`;
  - `autobyteus-web/services/eventMonitor/eventMonitorActiveTracePageService.ts`, whose subject union has no standalone member subject.
- **Required action:** see "Required fix (CR-002)" above. Then rerun AE-10 and the web suites.

### CR-001 — Collaboration-stream child commands now restart a crashed host (preserved-behavior regression)

- **Status (round 2):** `Resolved` in IR-002 (`c0e8ce7fd`).
  - `handleMessage` uses `this.roots.getActive(session.hostRunId) ?? await this.readyRoot(session.hostRunId)`.
  - `api/websocket/index.ts` injects `getActive`, and `connect` is unchanged (AR-001).
  - The new unit test fails against the IR-001 handler (per the implementation engineer) and passes now; I re-ran it.
  - The docs were updated.
- **Severity:** Medium. **Type:** behavioral fidelity and ownership. **Candidate:** CG-01. **Scenario:** SC-04 (Supported Explicit Edge).
- **Location:** `autobyteus-server-ts/src/services/agent-streaming/agent-collaboration-stream-handler.ts`, `handleMessage` (`const root = await this.readyRoot(session.hostRunId);`).
- **What happens:**
  - Every collaboration-stream command for a child (send, interrupt, approve or deny) first runs `root.ensureHostReady()` inside the root gate.
  - After a host runtime crash the root survives, and its children keep running. A user acting on a collaborator then has the host restored first, which on Codex means a new app-server.
  - If that restore fails, the child command is acknowledged `failed` with `AGENT_ROOT_COMMAND_FAILED`. The user's message, interrupt or tool approval never reaches the collaborator.
- **Approved basis:**
  - Design §1, AR-001 bullet: "Child commands are unchanged".
  - Design Key Tradeoffs: "child commands no longer technically need the host running".
  - REQ-001 and AC-010: no user-visible change, crash recovery included.
  - Base handler: `this.roots.getActive(hostRunId) ?? await this.roots.resolveCommandReadyRoot(hostRunId)`. A surviving root served child commands without touching the host.
- **Required action (bounded local fix):**
  - Have the handler use the registered active root for commands, without host readiness. Fall back to `resolveRoot` + `ensureHostReady` only when no active root exists, as before.
  - For example, inject `getActive` alongside `resolveRoot` from `StandaloneAgentRunRootManager`.
  - Add a unit test: with an active root whose host is offline, a child `SEND_MESSAGE` or `INTERRUPT_GENERATION` does not call `ensureHostReady` and reaches `executeAgentCommand`.
  - Leave `connect` as is: it readies the host (AR-001).

## Classification

- Round 7: none (Pass).
- Round 6: none (Pass).
- Round 5: `Design Impact` (F-02). A pre-existing shared root-shutdown fence defect, exposed by this branch, that needs a scope and semantics decision.
- Round 4: none (Pass).
- Round 3: `Local Fix`, an implementation defect (CR-002) owned by `/implementation_engineer`.
- Round 2: none (Pass).
- Round 1 was `Local Fix` for CR-001, now resolved.

## Recommended Recipient

- `/api_e2e_engineer` (round 7 Pass): implementation-owned fixes return through API/E2E.
  - Scoped rerun: `pnpm test:native-input-history`, plus a confirmation that the rest of the API-REV-003 evidence carries forward, since no source changed.
  - Then API/E2E returns the package to delivery through the test review.
- Round 6 went to `/api_e2e_engineer`: LE-O1 on Codex at least 10 times in a row; the AC-001 suites on Claude and Codex; record any F-4 warning with its turn state (N-1).
- Round 5 went to `/solution_designer` (Design Impact for F-02).
- Round 4 went to `/api_e2e_engineer`, and F-01 has since been confirmed resolved live in API-REV-002.

## Residual Risks

- **Round 6:**
  - Live validation of § 11 (N-1) is pending.
  - `agent-run.ts` is at 498 effective lines (CG-10).
  - A Stop in the stale-turn case can take up to 5 s before a retryable failure (by design).

- **AC-001 runtime E2E not yet executed.**
  - `standalone-agent-collaborator-mention.e2e` and `agent-initiated-collaborators.e2e` (46 tests) are opt-in live-provider suites and skipped locally.
  - API/E2E must run them on Claude and at least one other runtime.
- **Base-failure masking (D-R4).** `agent-run-manager` sits on the host path, and its 16 base failures are identical by name and message. API/E2E should keep comparing by identity.
- **Roll-up freshness (CG-05, Hold for Evidence).**
  - Usage reported only by children shows on the next host report or when the panel is reopened.
  - API/E2E should exercise the downstream hint (child-only usage, then a host report). If live child freshness is expected, that is a requirement clarification for the solution owner.
- **`tokenUsageMeterStore.ts`** is at 492 effective lines; split it on its next change.
- **Team collaborator registry** has no dedicated unit test; coverage is through the Team-root suites. API/E2E should check restore after Stop of a Team run with a collaborator Agent, per the handoff hint.
- **The REQ-007 "earlier events" page and the rolled-up Token Meter** were not exercised live; they are covered only by unit and integration tests.
- **Delivery** must integrate the 3+ docs-only `origin/personal` commits, including the `DESIGN.md` rename.

## Latest Authoritative Result

- Review Decision: `Pass` (round 7, CRR-008, DR-001 harness import fixed).
- Round 6 (CRR-006) was a Pass: SR-006 § 11 implemented as designed.
- Round 5 (CRR-005) was a Fail: the failure origin of F-02, a Design Impact.
  - Round 4 (CRR-004) was a Pass on implementation review; the F-01/CR-002 fix was confirmed live.
- Review Entry Point: `Implementation Review` (Full Re-Audit of the Stop-spine delta)
- Supported Product Scenario Gate: `Pass` (CG-01 promoted in round 1 and resolved in round 2; CG-02/03/04/06/07 rejected; CG-05 held as a residual risk)
- Material-Premise Gate: `Pass`
- Score Summary: 9.3/10 (93/100). Every category is at or above 9.0; round 6 re-confirmed it. The fence change is clean, tightly owned and tested. The `agent-run.ts` size pressure is noted under CG-10.
- Failure Origin (round 5): a pre-existing defect in the shared `AgentRunRootShutdownFence`. A rejected interrupt during a natural turn-completion race is latched as a permanent fence failure. The branch exposes it more often (probably through REQ-005 inter-agent replies).
- Failure Origin (round 3): implementation defect (web routing for standalone children). Resolved in round 4.
- Recommended Recipient: `/api_e2e_engineer`
- Notes:
  - CR-001 is resolved with a minimal fix that restores the base semantics, and it is now tested.
  - The implementation is clean. The REQ-001 refactor faithfully replaces the binding, statics and wake path.
  - The REQ-002–REQ-009 changes are correct and well tested.
  - The flagged decisions (Team-run builder, frozen migration header, roll-up semantics, `memberTitleName`, prompt-fallback wiring) are all sound.
