# Code Review Report — cross-scope-agent-mentions

## Review Round Meta

- Review Entry Point: `Implementation Review` (round 5, SR-010 / IR-004). Rounds 1–3 were implementation reviews and round 4 was a failure-origin review; their sections are preserved below as history.
- Requirements Doc Reviewed As Context: `tickets/in-progress/cross-scope-agent-mentions/requirements-doc.md` (Approved, SR-004)
- Investigation Notes Reviewed As Context: `investigation-notes.md` (E-01–E-18, used for E-11/E-12/E-15)
- Solution Revision Record Reviewed As Context: `solution-revision-record.md`
- Design Spec Reviewed As Context: `design-spec.md` (SR-007)
- Supplemental Task Artifacts Reviewed As Context: `architecture-design-handoff.md`, `product-design-request-handoff.md`, the approved UI/UX spec `/Users/normy/autobyteus_org/autobyteus-web-prototype/tickets/done/cross-scope-agent-mentions/ui-ux-spec.md` (VIS-001–014, as context for the web slice), `implementation-evidence/render-check/render-check-report.json`
- Relevant Solution Revision IDs: `SR-007` (design), `SR-004` (requirements)
- Design Review Report Reviewed As Context: `design-review-report.md` (Round 2, Pass)
- Architecture Review Revision Record Reviewed As Context: `architecture-review-revision-record.md`
- Relevant Architecture Review Revision IDs: `ARCH-REV-002`
- Implementation Handoff Reviewed As Context: `implementation-handoff.md`
- Implementation Revision Record Reviewed As Context: `implementation-revision-record.md`
- Relevant Implementation Revision IDs: `IR-001`, `IR-002`, `IR-003`
- Code Review Revision Record: `tickets/in-progress/cross-scope-agent-mentions/code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-005`
- Current Review Round: `3`
- Round 3 trigger: IR-003, the Local Fix for CRR-002 / CR-002. The branch is at `5dcc5dc82`, one commit on `c8cd16a2b`.
- Round 3 scope: a focused re-review of `standalone-run-liveness.ts#releaseForHistory`, `AgentRunCollaborationRootManager.endRegisteredRoot`, the three catalog guards, the tests and the docs. No other source changed.
- Round 3 checks run by the reviewer:
  - `npx tsc -p tsconfig.build.json --noEmit` is clean.
  - `tests/unit/agent-run-collaboration`, `agent-run-history-catalog-service.test.ts`, `agent-run-history-service.test.ts` and `agent-run-termination-service.test.ts`: 34/34 pass.
  - The shared `dist/` output was removed afterwards.

The round 2 record below is kept for history:

- Trigger: IR-002, the Local Fix for CRR-001 / CR-001. The branch is at `c8cd16a2b`, one commit on `a7b4ae621`.
- Prior Review Round Reviewed: `1` (CRR-001, Fail)
- Latest Authoritative Round: `5` (implementation review of SR-010)
- Round 2 scope: a focused re-review of commit `c8cd16a2b`:
  - `standalone-run-liveness.ts` (new);
  - the catalog delete, archive and cancel guards;
  - `AgentRunCollaborationRootManager.hasRoot`/`hasRegisteredRoot`;
  - the tests and docs.
  Unaffected areas keep their round-1 evidence, because the diff touches no other source.
- Round 2 checks run by the reviewer:
  - `npx tsc -p tsconfig.build.json --noEmit` is clean.
  - `tests/unit/agent-run-collaboration`, `agent-run-history-catalog-service.test.ts` and `agent-run-termination-service.test.ts`: 24/24 pass.
  - The shared-package `dist/` output was removed afterwards.
- Coverage Investigation Reviewed (round 4): `api-e2e-coverage-investigation.md`
- Execution Coverage Report Reviewed (round 4): `api-e2e-execution-coverage-report.md` (authoritative)
- API/E2E Revision Record Reviewed (round 4): `api-e2e-revision-record.md`
- Relevant API/E2E Revision IDs: `API-REV-001`
- Delivery Revision Record: `N/A`
- Failing Scenario IDs (round 4): F-01 (AC-002/UXJ-001), F-02 (UXJ-001 step 7, VIS-004/006), F-03 (VIS-004/006/009), F-04 (VIS-013/UXJ-002), U-01 (C-02, UXJ-001 step 7)
- Exact Failing Commands / Execution Mode:
  - live browser on a real `pnpm dev` stack (Claude);
  - the F-01 deterministic web probe (`api-e2e-evidence/F-01-team-mention-send-probe.md`);
  - the live C-02 observation e2e on Claude (`api-e2e-evidence/c-02-observation.log`);
  - the web probe `tests/e2e/cross-scope-agent-mentions-live-probe.mjs` (T01).
- Failure Evidence Paths: `api-e2e-evidence/` (`F-01-team-mention-send-probe.md`, `c-02-observation.log`, `browser-4-team/T01-02…png`, `T01-03…png`, `browser/A01-05…png`)
- Round 4 reviewer verification: each failure was traced in the source at `5dcc5dc82`, and the screenshots were compared with VIS-004 and VIS-013 (see the Failure-Origin section).

## Routing Classification Review

- Task size: `Large`
- Architectural risk: `High`
- Selected route: `Implementation Review`
- Independent source review required by the classification: `Yes`
- Classification evidence or correction required: confirmed. There are 15 commits, about 300 files, three contract packages, a new root kind and new persisted families. No correction.

## Review Scope

- Changed implementation and behavior reviewed:
  - **Server:**
    - the collaborators module: policy, admission, entry builder, address allocator, source projector, errors, catalog;
    - the Team and Org root changes: the resolver split, source resolvers, collaborator owners, admission, stream handlers;
    - the new Agent root (`src/agent-run-collaboration/**`): root, manager, builder, host context, resolver, persistence;
    - the standalone lifecycle binding, command coordinator, `terminateAgentRun`, `launchPurpose`;
    - the tool-exposure rule and the standalone prompt section;
    - the collaboration stream, the GraphQL candidates and stored view, and supervisor wiring and shutdown order;
    - delete and history catalog interaction.
  - **Web:**
    - the `@` scope, menu and candidate cache;
    - mention text and note parsing;
    - the store submissions for all four transports;
    - the Agent-root store and streaming service, and the host-sync composable;
    - the failure-notice derivation and component.
  - **Contracts:** the mention note compose/parse.
- Files / areas reviewed: see "Changed implementation" above. Every implementation file named in the handoff's key-files list was reviewed at file or diff level. The deepest reading covered `agent-run-collaboration-root.ts`, `agent-run-collaboration-root-manager.ts`, `agent-run-collaboration-root-builder.ts`, `agent-run-collaboration-host-context-builder.ts`, `collaborator-*.ts`, `team-recipient-resolver.ts`, `team-task-source-resolver.ts`, `team-task-execution-adapter.ts`, `root-team-run.ts` (diff), `agent-org-run.ts` (message and delegation paths), `agent-org-recipient-resolver.ts`, `agent-org-task-source-resolver.ts`, `agent-collaboration-stream-handler.ts`, `agent-run-collaboration.ts` (GraphQL), `collaborator-root-port-resolver.ts`, `agent-run-command-coordinator.ts`, `standalone-agent-run-lifecycle-service.ts`, `agent-run-service.ts`, `runtime-agent-tool-exposure.ts`, `claude-session-tooling-options.ts`, `autobyteus-collaboration-tool-exposure.ts`, `global-agent-run-message-router.ts`, `agent-run-history-catalog-service.ts`, `collaboratorAddFailures.ts`, `CollaboratorAddFailureNotice.vue`, `useRunMentionMenu.ts`, `runMentionScope.ts`, `collaboratorCandidatesService.ts`, `collaboratorMentionText.ts`, `agentRunCollaborationStore.ts`, `agentRunCollaborationStreamingService.ts`, `agentRunCollaborationContext.ts#applyEvent`, and the store diffs.
- Explicit exclusions:
  - Visual fidelity against VIS-001–014 beyond the implementation's render evidence. It is API/E2E-owned, and Team/Org menus and the VIS-007 notice were not rendered live.
  - Committed contract `dist/` output.
  - Tests are reviewed only proportionately, for readiness.
- Independent checks run by the reviewer:
  - `npx tsc -p tsconfig.build.json --noEmit` (server): clean.
  - Focused server suites (11 files, 82 tests, including `task-delegation-tool-lifecycle.integration.test.ts` 12/12): all pass. This needed `pnpm prepare:shared`; the untracked build output was removed afterwards and the worktree is as received.
  - Focused web suites (8 files, 46 tests): all pass.

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: Yes. REQ-001–012, AC-001–014, DEC-U1 and OQ-1/2/3 are understood.
- Design-spec behavior map verified against the implementation: Yes (BEH-001–013 below).
- Design review report and round confirmed: ARCH-REV-002, Round 2, Pass. AR-001–AR-005 are reflected in the code: `resolveCommandReadyRoot`, the `agent_collaboration_member_*` owners, `teamScoped`, the AR-004 in-run rule, and AR-005.
- Behavior-basis status: `Confirmed`
- Changed or newly discovered behavior, if any: none.
- Remaining material ambiguity, if any: none that blocks. See Residual Risks for task-Team teammate messaging, which is existing behavior preserved by design.

| Behavior ID | Current Status | Current Implementation Path And Lifecycle Evidence | Contradicting / Newly Discovered Evidence |
| --- | --- | --- | --- |
| BEH-001 | Confirmed | `resolveRunMentionScope` gives every live target kind. The launch draft and `temp-` IDs are excluded. The menu reads the GraphQL `collaboratorMentionCandidates` → `resolveCollaboratorRootPort` → `CollaboratorCandidatePolicy.listCandidates`. Built-ins are excluded by ID, Orgs are never listed, and the AR-004 rule is applied (`inRunDefinitionIds`). The list is refreshed on every open and invalidated on `collaborator_added`. | — |
| BEH-002 | Confirmed | The stores send `mentions` (`toCollaboratorMentionDtos`). The Team/Org/Agent-collaboration handlers and `AgentRunCommandCoordinator` call `root.admitCollaboratorMentions` in the root gate: plan (all or nothing), one commit, `collaborator_added`, then compose. The caller posts. `UserMessage` parses the note. | — |
| BEH-003 | Confirmed | `resolveDelegationPlacement` looks for a configured placement first, then a collaborator, in all three roots. `delegateToResolvedTarget` turns "not found" into `{target_agent_run_id:null, message}`. The source resolvers are used on activation, restore and `ingressOf`. | — |
| BEH-004 | Confirmed | The work-packet path is unchanged. The Agent root's communication adapter records v1 messages. The host delivery is shown on the host stream (`presentCommittedCommunication`). | — |
| BEH-005 | Confirmed | Entries are persisted in the trees, and the source resolvers restore children. Agent root: `resolveCommandReadyRoot` restores the host, and `ensureRoot` takes no gate. A crash survives the root (unit-tested), and an explicit Stop cascades (`terminateAgentRun` → `terminateCollaborationRoot`). | See CR-001 for the delete interaction with a surviving root. |
| BEH-006 | Confirmed | The lazy package is created on the first commit, with the catalog flag. The stream `/ws/agent-collaboration/:runId`. `agentRunCollaboration` never restores. `syncHost` uses the stream only while the host runs, and the stored view otherwise. | — |
| BEH-007 | Confirmed | `deriveCollaboratorAddFailures` reads the current turn's `delegate_task` calls to a collaborator address that returned no run ID. Null results come from `delegateToResolvedTarget` and `RootTaskExecutionLifecycle.delegate` (the existing catch). The card is not a failure. | — |
| BEH-008 | Confirmed | The row components were changed (the implementation's render check plus spec updates). | — |
| BEH-009 | Confirmed | `AgentUserInputTextArea` combobox attributes and keyboard handling in `useRunMentionMenu.onKeydown`. | — |
| BEH-010 | Confirmed | `agentSourceSelectors` is used by the Team/Org context factories and hydration. `findConfiguredAgentByAddress` stays only for configured-only focus and coordinator lookups, as the design allows. | — |
| BEH-011 | Confirmed | `buildConfig` attaches the host context for eligible runs. `automaticCollaborationToolNames` reads `teamScoped`. The Claude/Codex/AutoByteus paths read the context. Helper launches carry `launchPurpose:"server_helper"`. | — |
| BEH-012 | Confirmed | `resolveMessageRecipient` resolves configured ingress (Agent root: the host) and gives the hint for a collaborator address. There is no allocation on any messaging path. | — |
| BEH-013 | Confirmed | New chat `@` is untouched (`variant` defaults to `launch`). Tree readers default `collaborators` to `[]`. | — |

## Supported Product Scenario And Reachability Gate (Mandatory)

| Scenario ID | Related Behavior / Contract IDs | Kind | Actor / Initiator | Coherent Goal Or Governing Event | Supported Entry Surface / Event | Shape | Forward Production Path / Lifecycle | Expected Outcome / Consequence | Independent Evidence | Scenario Validity | Review Use |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| RS-001 | BEH-001/002/003, SC-001/004/007 | User | User in a live run | Bring an outside Agent or Team into the current run | Live composer `@` → send | Normal | composer → stream/coordinator → root admission (gate) → commit → note → post → the agent's `delegate_task` → resolver → lifecycle | The collaborator starts under the run | REQ-001–004, UXJ-001/004/005 | Supported Normal Scenario | Use |
| RS-002 | BEH-005/006, SC-008, DS-009 | Operational | User | Stop, reopen, then message a child | Stop, then the child composer | Normal | Stop → `terminateRoot` → children fenced → host terminated; later child send → `attach` → `connect` → `resolveCommandReadyRoot` → host restored → root ensured → child woken | Children are restored and wake | REQ-006, AC-006, design DS-004 | Supported Normal Scenario | Use |
| RS-003 | BEH-005, DS-004 "crash vs Stop" | System + User | Host runtime exits on its own; the user then manages the run from history | Clean up a run whose agent failed | Host runtime exit (explicitly supported: "the root stays registered and its children keep running"), then the history row's Delete action | Explicit Edge | host `isActive()` false → the `AgentRunManager.getActiveRun` guard passes → `AgentRunHistoryCatalogService.deleteRun` removes `memory/agents/<host>/` while the Agent root and its live children stay registered | The run directory, including `collaboration/` and child memory, is deleted under a live root | Design DS-004 and Risks ("Tests must cover both"); `agent-run-collaboration-root.test.ts:194`; `agent-run-activation-registry.ts:177-180`; `agent-run-history-catalog-service.ts:300-313` | Supported Explicit Edge Scenario | Use |
| RS-004 | BEH-007, SC-006 | System | Collaborator start fails | The user learns that nothing was added | `delegate_task` null result | Explicit Edge | resolver or lifecycle catch → null result → notice derivation | Red notice; no row | REQ-008 | Supported Explicit Edge Scenario | Use |
| RS-005 | BEH-011 | Contract | Every eligible standalone run bootstrap | Always-on tools (REQ-012) | Run config build | Normal | `buildConfig` → host context → exposure → runtime session | The tools exist from the first turn; the helpers are unchanged | REQ-012, AC-014 | Supported Normal Scenario | Use |
| RS-006 | OQ-1 | User | User in a child's composer | Mention from inside a collaborator | Agent-root child composer | Normal | `submit` → stream SEND_MESSAGE with mentions → root admission → `executeAgentCommand(child)` | The child receives the note | OQ-1 resolved | Supported Normal Scenario | Use |

### Candidate Finding And Mechanism Gate

| Candidate ID | Observation Or Mechanism | Scenario / Contract ID | Independent Trigger | Forward Path / Lifecycle / Consequence | Evidence | Disposition | Reason / Proportionate Response |
| --- | --- | --- | --- | --- | --- | --- | --- |
| C-01 | Deleting a standalone run is guarded only by the host runtime being active. It ignores an active Agent root that outlived a host crash. | RS-003 | The host runtime exits on its own (a design-supported state), then the user presses Delete on the history row | `deleteRun` → `removeCatalogRowAndDirectory` deletes the host directory, including `collaboration/collaboration_tree.json`, `communication_messages.json` and child memory dirs. The root stays in `ActiveCollaborationRootDirectory` with live children. Their later tree, message and trace writes go to a deleted package: they either recreate an orphan `memory/agents/<id>/collaboration/` fragment with no catalog row or metadata, or fail-stop the root. The children keep running with no row left to open or stop them. | `agent-run-history-catalog-service.ts:305` (`agentRunManager.hasActiveRun` only); `agent-run-activation-registry.ts:177-180` (`getActiveRun` returns only `isActive()` runs); `agent-run-collaboration-root-manager.ts` (the root ends only on `terminateRoot`/`stopAll`); `agent-run-service.ts#terminateAgentRun` already treats "root present, host inactive" as active | Promote → CR-001 | Bounded local fix: the standalone delete path must treat a registered Agent root as active. Either reject with the existing "Run is active. Terminate it before deleting history." or end the root first, as `terminateAgentRun` does. Add a unit test for crash → delete. |
| C-02 | Members of a collaborator task Team cannot `send_message_to` a teammate by address: only configured ingress (Agent root: only the host) resolves. Their rebased handoffs from `get_handoff_rules` name teammate addresses. | RS-001 (task Team) | A collaborator Team coordinator following its handoff | Rejected with "not found". Teammates can still be reached by run ID. | The Team root has the same rule for task-Team members today (`root-team-run.ts#resolveConfiguredRecipientIdentity`, `team-execution-index.ts#visitConfiguredRoot`). The design says "Messaging stays configured-only" and ARCH-REV-002 passed it. | Reject (pre-existing behavior preserved by the approved design; not introduced here) | Recorded as a residual risk for API/E2E to observe in UXJ-001 (task Team coordinator handoffs). If it matters for product use, it is a separate requirement or design question. |
| C-03 | `resolveAutoByteusExecutionToolNames` filters task-management tools whenever a member context exists, and every standalone run now has one. | RS-005 | Standalone AutoByteus run bootstrap | Tools in `LEGACY_LOCAL_TASK_PLAN_TOOL_NAMES` or `ToolCategory.TASK_MANAGEMENT` would be dropped | No such tool is registered: those names and that category have no registrations in `autobyteus-ts/src` or the server `src` | Reject (Not Reachable) | No change. |
| C-04 | `useAgentRunCollaborationSync` attaches the Agent-root stream for every running standalone run. Design connect trigger (a) also required `hasCollaboration` or a just-accepted mention. | Design DS-006 connect rule | Selecting a running standalone run | One extra WS plus a root snapshot for a running host. The host is already active, so nothing is restored. | `agentRunCollaborationStore.syncHost`; the manager `resolveCommandReadyRoot` returns the active host | Reject (no material consequence; the superset covers the "mention just accepted" case without extra state) | None. It could be tightened opportunistically. |
| C-05 | A stale "running" client status during a server restart could make `connect` restore a host by viewing. | DS-006 | Server restart while a client shows Idle | Requires a server restart racing with the client's status refresh | — | Reject (Technically Possible but Unsupported/Contrived: artificial timing) | None. |
| C-06 | The Agent-root stream reconnects on `task_execution_started`, which rejects a pending child command ack. | RS-006 | A child delegates in the same instant as a user send to a child | Requires a concurrent delegation during the ack window. `collaborator_added` is applied in place (no reconnect), so a mention send from a child is unaffected. | `agentRunCollaborationContext.ts:110-121` | Reject (artificial timing) | None. |
| C-07 | The Agent root keeps a launch snapshot from load time. A host model edit while the root survives a crash would not reach new entries. | OQ-2 | A host crash, then the user edits the model of the inactive run, then a mention | Settings edits are allowed only for inactive runs; the root ends on Stop and is reloaded from metadata | `run-model-config.ts` (editable only when inactive) | Reject (contrived three-step combination; OQ-2 says "snapshotted when attached") | None. |
| C-09 | Round 2: the CR-001 guard `isLive = host active \|\| root registered` applies to every eligible standalone run. `onHostPublished` → `ensureRoot` registers a root for every eligible run when its host starts, with or without collaborators. So after any host runtime exit, delete and archive are refused, and the refusal says "Terminate it". But the row is inactive, and `WorkspaceHistoryWorkspaceSection.vue` shows Stop only when `run.isActive`. | RS-003 (host exit, then history cleanup), including runs with no collaborators; preserved behavior B-003 / "Data Continuity" | The host runtime exits on its own, then the user presses Delete or Archive on the history row | Refused with no Stop control. The user can recover only by waking the host with a new message and then pressing Stop, or by restarting the server. Before this branch, the run could be deleted directly. | `agent-run-collaboration-root-manager.ts:132-137` (root ensured for every eligible run); `standalone-run-liveness.ts#isLive`; `agent-run-history-catalog-service.ts` delete/archive guards; `WorkspaceHistoryWorkspaceSection.vue:125-160` (Stop only if `isActive`; Delete/Archive only if not) | Promote → CR-002 | A bounded local fix. Delete (and archive) of a run whose host is inactive should end the registered root through its owner first, as `terminateAgentRun` does, and then proceed. Refuse only if the root cannot be ended. This keeps CR-001's integrity guarantee without blocking ordinary cleanup. |
| C-10 | Round 3: `releaseForHistory` checks that the host is inactive, then ends the root. A child report could wake the host between the two. | RS-003 | A child `send_message_to(host)` that lands in the same instant as the user's Delete | `terminateRoot` fences the gate and drains in-flight deliveries first; the host-wake race needs exact coincidence | `standalone-run-liveness.ts`; `agent-run-collaboration-root.ts#terminate` | Reject (artificial timing) | None. |
| C-08 | Concurrent same-definition admissions could allocate two entries. | RS-001 | Two sends in one root | Admission runs inside each root's single operation gate, so it is serialized: the second send sees the first commit and reuses its entry | `admitCollaboratorMentions` wraps `operationGate.run` or `materializationGate.run` | Reject (not reachable) | The handoff's "rare" risk is already prevented by the gate. |

## Structural / Design Checks

| Check | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Task design health assessment is present, evidence-backed, and preserved by the implementation | Pass | The resolver split per root, one task-source resolver per root, the hosting classes moved to `agent-collaboration/execution/backends/`, and `agent` branches in every root-kind switch (typecheck clean) | — |
| Implementation matches approved behavior-defining supplemental artifacts | Pass | The menu, chips, rows and Team tab match the render evidence (VIS-002/003/011–014). Team/Org menus and VIS-007 are unit-tested, with live rendering left to API/E2E. | — |
| Data-flow spine inventory clarity and preservation under shared principles | Pass | DS-001 (admission in the gate; the caller posts), DS-002 (resolver → unchanged lifecycle), DS-004/009 (the manager owns the lifetime; the host is woken through the lifecycle) are traceable in the code | — |
| Ownership boundary preservation and clarity | Pass | Only roots commit entries (`*Collaborators.commit` through each root's persistence coordinator). The Agent root never creates or terminates the host; it uses `resolveCommandReadyRun`. | — |
| Off-spine concern clarity | Pass | The allocator, entry builder, note and projector are stateless and port-based | — |
| Existing capability/subsystem reuse check | Pass | Reuses `RootTaskExecutionLifecycle`, `RootCommunicationEngine`, the flat Team factory and `ChatTargetMenu` (variant) | — |
| Reusable owned structures check | Pass | One `CollaboratorEntry` union in run-history, one projector, one note owner, one web selector module | — |
| Shared-structure/data-model tightness check | Pass | The entry is a discriminated union with no run IDs or names. The Team member settings come only from `defaultLaunchConfiguration`. | — |
| Repeated coordination ownership check | Pass | `CollaboratorMentionAdmission.admit` owns the plan → commit → compose sequence. `delegateToResolvedTarget` owns the not-found → null result. | — |
| Empty indirection check | Pass | `*Collaborators` classes own the port and commit/publish; they are not pass-through | — |
| Scope-appropriate separation of concerns and file responsibility clarity | Pass | See the size audit. The Agent root's recipients, collaborators, adapters and builder are extracted. | — |
| Ownership-driven dependency check | Pass | `collaborators/*` imports no root module. `agent-run-collaboration` does not import `agent-org-execution`. `agent-execution` depends on the binding type, not on the Agent-root module; the coordinator imports the manager, which the design allows. | — |
| Authoritative Boundary Rule check | Pass | Callers use `root.admitCollaboratorMentions`, `resolveDelegationPlacement` and `resolveCommandReadyRoot`. No caller reaches into the resolvers, index or persistence past the root. | — |
| File placement check | Pass | Files sit in the paths the design maps. The root-neutral moves are justified: the Agent root must not import the Org module. | — |
| Flat-vs-over-split layout judgment | Pass | `agent-run-collaboration/{domain,services,prompt}` mirrors `agent-org-execution` | — |
| Interface/API/query/command/service-method boundary clarity | Pass | The message and delegation resolution are split. The candidates query takes an explicit `(rootSubjectKind, rootRunId)`. The stream rejects host targets. | — |
| Naming quality and naming-to-responsibility alignment check | Pass | Names match their concerns (`resolveCommandReadyRoot`, `teamScoped`, `launchPurpose`, `collaboratorAddressMessageHint`) | — |
| No unjustified duplication of code / repeated structures in changed scope | Pass | The three `*Collaborators` owners share the admission coordinator. The per-root port builders differ in substance. | — |
| Patch-on-patch complexity control | Pass | The resolver split replaces the single resolver outright, with no flag | — |
| Dead/obsolete code cleanup completeness in changed scope | Pass | `resolveRecipient`, `AUTOMATIC_TEAM_TOOL_NAMES`, the Org-named hosting classes, `configuredAgentAtAddress` and the visible "Started by" are all removed (grep verified) | — |
| Relevant test scenarios and assertions are clear and requirement-aligned | Pass | As in round 1. Round 2 adds the crash → delete/archive refusal (real manager plus catalog) and the unregistered → delete case. A crashed run with no collaborators is not covered (CR-002). | Add with CR-002 |
| Test fixtures/helpers are reasonably reusable and test structure remains coherent | Pass | The fixture helpers are extended rather than copied | — |
| No stale, duplicated, or compatibility-only tests are retained in changed scope | Pass | The row tests were updated to REQ-009 | — |
| API/E2E readiness for the next workflow stage | Pass | Round 3: CR-001 and CR-002 are resolved and tested | — |

## Source File Size And Structure Audit (If Applicable)

| Source File | Effective Non-Empty Lines | `>500` Hard-Limit Check | `>220` Delta Check | SoC / Ownership Check | Placement Check | Preliminary Classification | Required Action |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `agent-team-execution/domain/root-team-run.ts` | 498 | Pass (near the limit) | Pass (+48) | Pass. The collaborator owner was extracted. | Pass | Pass (pressure noted) | Future growth should extract before adding |
| `run-history/services/agent-run-history-catalog-service.ts` | 494 | Pass | Pass (+13) | Pass | Pass | Pass | — (the CR-001 fix may belong in the history service or the delete path instead of growing this file) |
| `agent-org-execution/domain/agent-org-run.ts` | 486 | Pass | Pass (+66) | Pass | Pass | Pass | — |
| `agent-run-collaboration/domain/agent-run-collaboration-root.ts` (new) | 452 | Pass | Delta +476 → reviewed | Pass. Gate, lifecycle, delivery and termination are root-owned; recipients, collaborators, adapters and the builder are extracted. Comparable to the Org root. | Pass | Pass | — |
| `agent-run-collaboration/services/agent-run-collaboration-task-execution-adapter.ts` (new) | 251 | Pass | +266 → reviewed | Pass (one adapter concern) | Pass | Pass | — |
| `agent-collaboration/execution/backends/root-{agent-execution-registry,team-execution-directory}.ts` (moved) | 257 / 246 | Pass | Move → reviewed | Pass | Pass (root-neutral) | Pass | — |
| `agent-run-collaboration/services/agent-run-collaboration-root-manager.ts` (new) | 227 | Pass | +246 → reviewed | Pass | Pass | Pass | — |
| web `agentRunCollaborationStreamingService.ts` / `agentRunCollaborationContext.ts` (new) | 240 / 236 | Pass | +260 / +255 → reviewed | Pass | Pass | Pass | — |
| Other changed source files | < 220 delta | Pass | Pass | Pass | Pass | Pass | — |

## Legacy / Backward-Compatibility Verdict

| Check | Result | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms in changed scope | Pass | — |
| No legacy old-behavior retention in changed scope | Pass | — |
| Dead/obsolete code cleanup completeness in changed scope | Pass | — |
| Approved persisted-data transition decision is followed without unnecessary migration work | Pass | `Directly Usable — No Migration`: optional `collaborators` (read defaults to `[]`, always written), optional `launchPurpose` and `hasCollaboration`, and a lazy new package |
| No version-specific dual reads/writes or request-time old-shape fallback exists | Pass | The tolerant reader is a generic policy |
| Approved transition mechanics match the reviewed design | Pass | No migration |

## Dead / Obsolete / Legacy Items Requiring Removal (Mandatory If Any Exist)

None.

## Docs-Impact Verdict

- Docs impact: `Yes` (already addressed in the branch).
- Why: a new root kind, collaborators, the tool rule and the live `@`.
- Files or areas likely affected: server `docs/modules/{agent_communication,agent_team_execution,agent_orgs,run_history,agent_tools,agent_run_collaboration}.md`, web `docs/{chat,agent_teams,agent_orgs}.md`. All were updated. After CR-001, `agent_run_collaboration.md` and `run_history.md` should state the delete rule.

## Additional Material Premise Validation (When Required)

### Upstream Design-Review Material-Premise Decisions

| Premise ID | Current Status | Changed Evidence / Reason |
| --- | --- | --- |
| Crash vs Stop (design Risks; DS-004) | Confirmed | Implemented as designed. Its interaction with history delete is recorded as RS-003 / C-01. |

No new or reclassified premises beyond RS-003, which is captured in the scenario gate.

## Review Scorecard (Mandatory)

- Overall score (`/10`): 9.4
- Overall score (`/100`): 94 (round 3; the categories changed are 7 and 8)
- Score calculation note: simple average, for trend only; the decision follows the findings.

| Priority | Category | Score | Why This Score | What Is Weak / Holding It Down | What Should Improve |
| --- | --- | --- | --- | --- | --- |
| 1 | Data-Flow Spine Inventory and Clarity | 9.5 | DS-001/002/004/009 are traceable end to end, and admission and posting are cleanly separated | — | — |
| 2 | Ownership Clarity and Boundary Encapsulation | 9.4 | Roots are the only writers. The manager owns the Agent-root lifetime and the lifecycle owns the host. Lock order is honored. Round 2: liveness is a narrow owned port, and there is no bypass into root internals. | — | — |
| 3 | API / Interface / Query / Command Clarity | 9.4 | The message and delegation split, the explicit root-kind query, and host-command rejection on the child stream | — | — |
| 4 | Separation of Concerns and File Placement | 9.2 | Extracted owners keep the roots under 500 lines, and the root-neutral moves are justified | `root-team-run.ts` is at 498 lines | Extract before the next addition |
| 5 | Shared-Structure / Data-Model Tightness and Reusable Owned Structures | 9.5 | A tight discriminated entry, one projector and one note owner | — | — |
| 6 | Naming Quality and Local Readability | 9.3 | Clear names and short doc comments stating the invariants | — | — |
| 7 | API/E2E Readiness | 9.2 | Typecheck is clean, and the focused suites pass (round 3: 34/34 on the affected suites). The crash and cleanup journeys are covered by unit tests. | AGY/ACP, VIS-007 live, and Team/Org `@` rendering are left to API/E2E | Exercise them in API/E2E |
| 8 | Runtime Correctness And Behavioral Fidelity | 9.2 | CR-001 and CR-002 are resolved. History changes end a lingering root first, as Stop does; nothing is deleted under a live root, and ordinary cleanup works. | C-02 residual (task-Team address messaging, pre-existing) | Observe it in API/E2E |
| 9 | No Backward-Compatibility / No Legacy Retention | 9.5 | Clean-cut replacements; no migration | — | — |
| 10 | Cleanup Completeness | 9.4 | All decommissioned items are removed | — | — |

## Findings

### CR-001 — Standalone run history can be deleted while its Agent root and children are still live (host crashed)

- Severity: Medium. It affects data integrity and lifecycle for a supported explicit edge.
- Candidate: C-01. Scenario: RS-003 (Supported Explicit Edge Scenario).
- Basis:
  - The design deliberately keeps the Agent root alive when the host's runtime exits on its own. DS-004 says: "the root stays registered and its children keep running". The Risks section says: "Tests must cover both".
  - In that state, the host is not active. `AgentRunActivationRegistry.getActiveRun` returns only `isActive()` runs. So the history row is shown inactive and Delete is offered.
- Evidence:
  - `autobyteus-server-ts/src/run-history/services/agent-run-history-catalog-service.ts:300-313`: `deleteRun` guards only on `agentRunManager.hasActiveRun(runId)`, then removes the whole `memory/agents/<runId>/` directory. That directory includes `collaboration/`, which holds the root's package and its children's memory.
  - `agent-run-collaboration-root-manager.ts`: the root ends only on `terminateRoot`/`stopAll`. Nothing on the delete path calls them.
  - `agent-run-service.ts#terminateAgentRun` already treats "root registered, host inactive" as a live run. The delete path does not.
- Consequence:
  - Live children keep running and writing traces, tree and message files into a deleted package. That recreates orphan `collaboration/` fragments with no catalog row or metadata, or drives the root into fail-stop.
  - The root stays registered in `ActiveCollaborationRootDirectory` until server shutdown.
  - The user no longer has a row from which to open or stop those children.
- Required action (bounded):
  - On the standalone delete path, treat an active Agent root for the run as "active". Either return the existing "Run is active. Terminate it before deleting history." result, or end the root first through the Agent-root owner, as `terminateAgentRun` does.
  - Keep the check at the owning boundary: the history service, or a delete-readiness port. Do not reach into root internals.
  - Add a unit test: host crash → delete → rejected (or root terminated first), with no package files deleted under a live root.
  - Update the delete rule in `docs/modules/agent_run_collaboration.md` / `run_history.md`.

### CR-001 — Standalone run history can be deleted under a live Agent root — **Resolved (round 2)**

- `c8cd16a2b` adds a liveness check (`standalone-run-liveness.ts`). The delete, archive and prepared-cancel guards consult it.
- A registered root now blocks a destructive history mutation.
- Tests cover it: a real manager plus catalog show that delete and archive are refused after a host crash and that `collaboration/` survives.
- The data-integrity consequence is removed. How the guard reaches users is covered by CR-002.

### CR-002 — The CR-001 guard blocks delete and archive of any crashed standalone run, with no way to stop it from the UI — **Resolved (round 3)**

- `5dcc5dc82`: `releaseForHistory` refuses while the host is active. Otherwise it ends a registered root through its owner (`endRegisteredRoot` → `terminateRoot`: fence, stop children, unregister), then proceeds. It refuses only if the root cannot be ended.
- The tests cover:
  - a crash with a live child: the child is finished and the root unregistered before deletion, and the files still exist at that moment;
  - a crash with no collaborators: the run is deleted;
  - archive;
  - a root that cannot be ended: refused, and every file is kept;
  - an active host: refused, and the root is untouched;
  - no root: delete proceeds directly.
- The dependency shape is unchanged: a narrow port with a dynamic-import default.

The round 2 record follows:

- Severity: Medium. It regresses preserved behavior (B-003, "existing standalone Agent runs and history work unchanged") in a supported explicit edge.
- Candidate: C-09. Scenario: RS-003.
- Evidence:
  - Every eligible standalone run gets a registered Agent root when its host starts (`onHostPublished` → `ensureRoot`), with or without collaborators.
  - `isLive` is true while that root is registered. After a host runtime exit, the root stays registered by design.
  - So Delete and Archive return "Run is active. Terminate it before deleting history.", while the row renders as inactive, and the history row offers Stop only for `isActive` runs.
- Consequence: a user cannot clean up a crashed run, including one that never had a collaborator. The only ways out are to wake the host by sending a message and then press Stop, or to restart the server. Before this branch, such a run could be deleted directly.
- Required action (bounded):
  - For a history delete or archive of a run whose host is not active but whose Agent root is registered, end the root through the Agent-root owner first, as `terminateAgentRun` does: fence, stop the children, unregister. Then proceed.
  - Refuse with the existing message only when the root cannot be ended.
  - Keep the dependency direction as in `standalone-run-liveness.ts`: a narrow port with a process default, with no run-history import of root internals.
  - Tests:
    - a host crash with no collaborators, then delete, succeeds;
    - a host crash with a live child, then delete, stops the child and the root first, and deletes nothing while the root is live;
    - archive has the same two cases.
  - Adjust the two doc notes accordingly.
- Alternative, if ending on delete is judged too strong: treat the root as live only when it has task executions, and still end a childless root on delete so it does not linger.

## Classification

- Round 3: none. The review passes. CR-001 and CR-002 are resolved.

## Recommended Recipient

- Round 3: pass → `/software_engineering_team/api_e2e_engineer`. The implementation engineer gets an informational notice.

## Residual Risks

- **Collaborator task-Team teammate messaging by address (C-02).** A collaborator Team's members get rebased handoffs from `get_handoff_rules` that name teammate addresses. Messaging by address resolves configured ingress only (Agent root: only the host), so those sends are rejected and teammates must be reached by run ID. The Team root already works this way for task-Team members, and the design's "Messaging stays configured-only" covers it. API/E2E should observe UXJ-001 with a real collaborator Team. If coordinators rely on address handoffs, raise it as a requirement or design question.
- **Not exercised here.** AGY/ACP live tool exposure, VIS-007 with a real unrunnable collaborator, and Team/Org `@` menus rendered live. These are carried forward from the handoff.
- **Downgrade and token roll-up.** Both are accepted residuals in the design.
- **`onHostPublished` failures are only logged.** The run then works without a root: `delegate_task` returns "root not active" and a mention send is rejected. Acceptable, but worth watching in API/E2E logs.
- **`root-team-run.ts` is at 498 effective lines.**
- **Round 2:** the catalog is at 490 lines. The liveness logic was correctly extracted rather than inlined.

## Implementation Review — Round 5 (SR-010, IR-004)

### Round Meta And Basis

- Trigger: IR-004. The branch is at `bcff48200`, 4 commits on `5dcc5dc82`: `fdda4a2ed` contracts, `180a2d2d4` native memory sender, `33b0d1eef` server and `bcff48200` web. 190 files changed (+4657/−1207).
- Basis:
  - requirements SR-008 (approved 2026-10-01), including RD-004 as REQ-014/AC-016;
  - design SR-010;
  - ARCH-REV-004 Pass (AR-006–AR-008 resolved);
  - the approved UI spec `…/tickets/done/cross-scope-agent-mentions-sr008/ui-ux-spec.md` (VIS-001–015).
- Classification: `Large` / `High`, confirmed. Route: Implementation Review.
- Answers DI-001 (by design), plus CR-003 and CR-004 (F-02, F-03, F-04).
- Reviewer checks:
  - `pnpm prepare:shared` (the untracked `dist/` output was removed afterwards);
  - server `npx tsc -p tsconfig.build.json --noEmit`: clean;
  - focused server suites: 26 files, 222/222. These cover the collaborators module, Org collaborators, Agent root, `team-root-collaborators`, liveness, context files, tree records, the replay projection, stream handlers, exposure, prompt, the catalog and the Team delegation integration test;
  - `autobyteus-ts` memory-ingest: 4/4;
  - focused web suites: 36 files, 275/275. These cover the notice, the inter-agent segment, the workspace view, history rows, the Agent-root context and store, Org hydration, the streaming services including CR-003, member-input RD-004, selectors, held submission, the name formatter and the run-mention text area.
- API/E2E's uncommitted test files were left untouched.

### Behavior Basis (SR-010 map)

| Behavior | Status | Implementation Evidence |
| --- | --- | --- |
| BEH-001 (in-run rule) | Confirmed | `CollaboratorCandidatePolicy.inRunDefinitionIds`: every entry and the members of collaborator Teams count. A failed add commits nothing, so the definition is still offered (AC-011). |
| BEH-002/003 (DS-001 admission) | Confirmed | `CollaboratorMentionAdmission.admit`, inside each root's gate: plan (reuse by definition) → `CollaboratorRunnabilityValidator.validate` (one `validateMany` batch per send) → `CollaboratorIdentityAllocator` (pure ID allocation) → the root's `addEntries`. Each root's `add` is: prepare handles → durable tree commit → `commitAfterDurability` publishes the handles, replaces the tree and emits `collaborator_added`. Failure aborts the handles. All three roots follow this order. |
| BEH-004/005 (DS-002, DI-001) | Confirmed | `getMessagePlacement` in the Team, Org and Agent-root indexes resolves configured → collaborator Agent → collaborator Team (coordinator) → collaborator Team member. Teammates resolve to their own instance. The Team root removed `resolveConfiguredRecipientIdentity`, and liveness covers the collaborator kinds (`isLiveAgent`: the containing TeamRun is registered). |
| BEH-006 (hosting, restore, stop) | Confirmed | Org and Agent root: `prepareCollaboratorHandles` → `rootAgents.prepareConfigured` / `teams.prepareConfigured`. Team root: `FlatTeamExecutionManager.prepareCollaboratorAgent` / `prepareCollaboratorTeam`, `CollaboratorTeamExecutionRegistry` (lazy members via `TaskTeamExecutionFactory`, no idle shutdown), and `requireTeamRun` → `requireCollaboratorTeam`. Restore: `materializeTeamRoot` → `restoreCollaborators(mode)`, and the Agent-root builder restores in `restore` mode. Termination: collaborator Teams join `freezeForRootTermination` and the prepared-termination paths. Per-collaborator activation mode: `ConfiguredAgentExecutionHandle` switches to `restore` after its first activation, so keeping the added-with mode only affects the first start. |
| BEH-008 (DS-008) | Confirmed | `COLLABORATOR_ADD_FAILED` with `collaborator_name` reaches every transport. The web holds only sends that carry mentions (`beginLocalUserSubmission.held`). On rejection the draft is kept and the notice shown; acceptance shows the message (deduplicated by `messageId` against the echo). Agent-stream disconnects reject pending admissions. |
| BEH-013 (extra copy) | Confirmed | `resolveDelegationPlacement` returns a configured placement, a collaborator, or a collaborator member. The source resolvers project fresh identities. The Agent-root adapter is host-aware. |
| BEH-014 (RD-004) | Confirmed | `resolveInterAgentSenderId` is used by native `MemoryIngestInputProcessor` and the external `RuntimeMemoryEventAccumulator` → `senderId`. Replay: a user trace with `senderId` becomes `inter_agent_message`. System notices are a separate trace kind, so delegated children keep the system task notice. The web uses `memberInputMessageHandler` and `runProjectionConversation` → `InterAgentMessageSegment`. Old traces have no `senderId` and stay user-style. |
| CR-003 / F-02 / F-03 / F-04 | Confirmed | Identity-keyed settle; `opensOnAppear`; `memberDisplayName.ts`; header controls and the "Message <name>…" placeholder on the Agent-root child view (render evidence in `render-check-sr010/`). |
| Preserved (SR-007 pieces, New chat `@`) | Confirmed | Unchanged code paths, and the existing tests pass. |

### Candidate Gate (round 5)

| Candidate | Observation | Scenario / Contract | Disposition | Reason |
| --- | --- | --- | --- | --- |
| C-11 | The Agent root has no self-target guard: a collaborator Agent can `delegate_task` to its own address and start a self-copy. Team and Org reject self-targets. | REQ-013 ("as it can for configured members") | Reject | No supported goal requires an agent to delegate to its own address. The outcome is an ordinary extra copy with no harm or corruption. Noted for parity. |
| C-12 | Admission holds the root gate during `validateMany` (catalog evidence) and allocation | DS-001 (the design puts admission inside the gate) | Reject | This is the approved design. Latency is a measurement item for API/E2E, not a defect. |
| C-13 | If publication fails after the durable commit, admission reports `COLLABORATOR_ADD_FAILED` although the entry is durable | DS-001 fail-stop rule | Reject | It needs an infrastructure failure after durability. The root fail-stops per the design's indeterminate-publication rule. |
| C-14 | One malformed Agent-root package blocks `prepareAgentRun` (strict package reads in the location service) | Data continuity | Reject | Pre-existing since SR-007. It is reachable only through unreleased SR-007 developer data (disposable per the design) or manual tampering. |
| C-15 | `collaborator-root-port-resolver.ts:73` `emptyPort` still sets `hasTaskExecutionAt: () => false`, though that member was removed from `CollaboratorRootPort` | Cleanup contract | Reject as a finding (inert) | It is an extra property in a frozen object literal, never read, with no behavioral effect. Recorded for opportunistic removal at the next source touch. |
| C-02 → DI-001 | Collaborator task-Team teammate addressing | REQ-003 | Resolved | One hosted instance per collaborator; unit-tested in the Team and Agent roots. The live recheck is with API/E2E. |

### Structural Checks (round 5 delta)

- **Spine and ownership.** Roots remain the only tree writers, and the hosting backends hold handles only. AR-006 is followed: no cross-root hosting class. The shared `prepareCollaboratorHandles` serves the Org and Agent root, and the Team root extends its own `local` registries.
- **Authoritative boundary.** Transports call only `root.admitCollaboratorMentions`. Messaging and delegation go through the root resolvers. The Team root reaches collaborator TeamRuns through `collaboratorHost`, its own manager's narrow host type.
- **Shared structures.** `CollaboratorEntry` stays a discriminated union, now with identities. Team-entry `taskExecutions` holds only a collaborator Team's own delegations. Root `taskExecutions` holds only extra copies.
- **Removal.**
  - Removed: `collaboratorAddressMessageHint`, `hasTaskExecutionAt` (except the inert C-15 leftover), the web `delegate_task`-null derivation, the content-keyed settle, per-surface name helpers, and the collaborator task-execution paths.
  - The ignored `autobyteus-web/resources/server` copy is build output and not reviewed.
- **Legacy and persisted data.** No compatibility code. Entries require identities, and SR-007 shapes were never released. `senderId` is optional, and old traces are untouched (`Directly Usable — No Migration`).
- **Size audit.** No changed source file is over 500 lines. `memory-manager.ts` is at exactly 500 (+3), `root-team-run.ts` 495, `flat-team-execution-manager.ts` 487, `agent-org-run.ts` 480, `agent-run-collaboration-root.ts` 463. No changed source file has a delta over 220. These files are near the limit; extract before their next addition.

### Scorecard (round 5, authoritative)

- Overall: 9.3/10 (93/100). Every category is at 9.0 or above.

| Priority | Category | Score | Why | Weakness | Improve |
| --- | --- | --- | --- | --- | --- |
| 1 | Data-Flow Spine Inventory and Clarity | 9.5 | The DS-001 order is identical in all three roots. DS-002 has one resolution rule per root. | — | — |
| 2 | Ownership Clarity and Boundary Encapsulation | 9.4 | Root-only writes; hosting follows AR-006; no bypass | — | — |
| 3 | API / Interface / Query / Command Clarity | 9.3 | One typed rejection (`COLLABORATOR_ADD_FAILED` plus name); `getMessagePlacement` returns exactly one receiver | The Agent root's self-target parity gap (C-11, non-blocking) | Align when next touched |
| 4 | Separation of Concerns and File Placement | 9.0 | The validator and allocator are separate stateless owners; the Team-root registry sits in `local/registries` | Several root files are at 463–500 lines | Extract before the next growth |
| 5 | Shared-Structure / Data-Model Tightness | 9.4 | Tight entry union with identities; no overlap between `collaborators` and `taskExecutions` | — | — |
| 6 | Naming Quality and Local Readability | 9.3 | `prepareCollaboratorAgent`, `getMessagePlacement`, `resolveInterAgentSenderId`, `memberDisplayName` | — | — |
| 7 | API/E2E Readiness | 9.2 | Typecheck clean; focused suites 222 + 275 + 4 pass; render evidence for VIS-004/005/006/012/013/015 | Not exercised live: AGY/ACP, Org journeys, a real VIS-007 failure | API/E2E to cover these |
| 8 | Runtime Correctness And Behavioral Fidelity | 9.2 | DI-001 is resolved by construction; held sends; RD-004 live and on replay; first-start modes are correct | Latency of admission inside the gate is unmeasured | Measure in API/E2E |
| 9 | No Backward-Compatibility / No Legacy Retention | 9.5 | Clean replacement of SR-007 paths | — | — |
| 10 | Cleanup Completeness | 9.0 | Decommission list done | One inert leftover property (C-15) | Remove it at the next touch |

### Prior Findings (round 5)

| Finding | Status | Evidence |
| --- | --- | --- |
| CR-003 (Team send settle) | Resolved | `TeamStreamingService.resolveTeamSend` settles on identity; a spec with an echo of composed content passes |
| CR-004 (F-02/F-03/F-04) | Resolved (source and render evidence; live confirmation with API/E2E) | `opensOnAppear`; `memberDisplayName.ts` at the row, tab and "From" call sites; `AgentWorkspaceView.vue` header actions and `composerPlaceholder`; `render-check-sr010/` |
| DI-001 (collaborator Team handoffs) | Resolved in design (SR-010) and implementation | `getMessagePlacement` (collaborator Team member → own instance); `team-root-collaborators.test.ts`, Agent-root tests |
| CR-001, CR-002 | Resolved (unchanged) | `standalone-run-liveness.ts` is untouched by IR-004 |

## API/E2E Failure-Origin Review (Round 4)

The scenario basis was confirmed for every failure. All of them are product-reachable through normal UI or agent tool use, and none relies on synthetic setup alone. The F-01 probe only reproduces a path that the live browser run already established.

| Failure | Supported Scenario | Source Evidence (at `5dcc5dc82`) | Origin | Detectable In Source Review? | Classification / Owner |
| --- | --- | --- | --- | --- | --- |
| F-01: the next Team-member send after an `@` send fails with "already has a pending Team message admission" | RS-001 (UXJ-001, Supported Normal) | `agent-team-stream-handler.ts:171-194` posts `admission.content` (text plus the server note). The `MEMBER_INPUT_MESSAGE` echo carries that content. `TeamStreamingService.ts#resolveTeamSend` settles only if `pending.content === payload.content`, so the send never settles. `sendMessage` then refuses the next send while one is pending. Org and Agent-root clients settle on command acks. | Implementation defect, and a **review gap**: the server-side content rewrite (reviewed in round 1) breaks a pre-existing client invariant (correlation by content) that the round-1 review did not trace back to the Team client | Yes. Tracing DS-001 to the Team client's settle path would have shown it. | `Local Fix` → implementation. Settle on the exact identity (`recipient_agent_run_id`, `message_id`, `dedupe_key`), which is already unique, instead of content equality. Keep the identity-reuse guard at send time. Add a unit test for an echo with composed content. |
| F-02: a task Team added in a Team run appears collapsed | RS-001 (UXJ-001 step 7) | The UI spec (line 54 and UXJ-001 step 7) is normative: "A task Team brought in by `@` opens once when it appears". Only `agentRunCollaborationStore.openNewTaskTeams` implements it; the Team tree has no equivalent. | Implementation defect (a missed spec detail in the Team view) | Partly: round 1 excluded visual fidelity, and the rule is a single spec line. Not a scoring gap. | `Local Fix` → implementation. Team (and Org, if not already expanded) views open a newly appeared collaborator task Team once. |
| F-03: raw address segments in the Team-run row ("product_team") and the Team/Org-tab sender ("product_prototyper") | RS-001 / UXJ-004 | VIS-004 shows "product team" and "product prototyper"; names are illustrative only in VIS-006. `a7b4ae621` spaced the names for the Agent root only. | Implementation defect (an incomplete application of the display-name rule) | Not reasonably detectable without rendering | `Local Fix` → implementation. Use one shared display-name formatter for collaborator rows and tab senders in all three roots. |
| F-04: the Agent-root child view lacks the ⚙ and + header controls and the "Message <name>…" placeholder | RS-001 (UXJ-005 / UXJ-002) | VIS-013 shows both controls and "Message computer use agent…". UXJ-002: "The composer placeholder names it". The evidence `A01-05` shows neither, and the header is shorter. The live Org task-Agent view has both. | Implementation defect (the Agent-root child target is not wired into the header controls or the placeholder that other targets use) | Not reasonably detectable without rendering | `Local Fix` → implementation. |
| U-01 (C-02): members of a collaborator Team cannot follow their own authored address handoffs | RS-001 (UXJ-001: the task Team works and reports back). REQ-003/005: a collaborator task Team takes part in the run. | Live on Claude: the coordinator's `get_handoff_rules` returns `/obs_team/mate`, `send_message_to("/obs_team/mate")` returns `COLLABORATION_TARGET_NOT_FOUND`, and the coordinator reports "Cannot complete handoff rule". Code: the Agent-root `resolveMessageRecipient` accepts only the host, and Team/Org accept only configured ingress. A collaborator Team has no configured counterpart. | **Design Impact.** The approved design ("Messaging stays configured-only") gives collaborator task-Team members handoff rules (AR-003, `teamScoped`) whose targets messaging cannot resolve. Round 1 recorded this as C-02 and rejected it as pre-existing and design-preserved; the live evidence now establishes the material consequence, so it is **reclassified → Promote (DI-001)**. | Identified in round 1 as residual C-02; correctly not treated as a source defect, because it follows the approved design | `Design Impact` → solution designer. Decide how members of a task Team resolve teammate addresses: for example, scope-relative resolution inside the sender's task Team, or handoff rules rendered with run IDs. Check the effect on preserved Org/Team task-Team semantics. |

### Affected Findings (round 4)

- **CR-003 (new, High; F-01):** a Team-member send that carries mentions never settles on the client, which blocks every later send from that member. The fix is a bounded `Local Fix`; see the table above.
- **CR-004 (new, Medium; F-02, F-03, F-04):** rendered-fidelity defects against the normative VIS-004, VIS-013 and UXJ-001/002. These are three bounded `Local Fix` items.
- **DI-001 (new; U-01, reclassified C-02):** collaborator task-Team handoffs by address cannot be delivered. This is a `Design Impact`.

### Score Rationale Updates (affected only)

- Round 3 Runtime Correctness (9.2) is superseded by CR-003 and DI-001.
- Round 3 API/E2E Readiness (9.2) is superseded: the readiness evidence missed the Team client settle path.
- No other category changes.

### Classification (round 4)

- `Design Impact` (DI-001) → `/software_engineering_team/solution_designer`.
- The bounded `Local Fix` items CR-003 and CR-004 are implementation-owned. They are independent of DI-001, and the solution designer can release them to implementation together with, or ahead of, the revised design.
- After the fixes: source review again, then API/E2E again, then the proportional test-code review of the API/E2E durable test changes.
- The durable test changes from API-REV-001 are **not** reviewed in this failure-origin round. They will be reviewed after a passing API/E2E run.

## Latest Authoritative Result

- Review Decision: `Pass`
- Review Entry Point: `Implementation Review` (round 5, SR-010 / IR-004 @ `bcff48200`)
- Supported Product Scenario Gate: `Pass` (C-11 to C-15 rejected with reasons; DI-001, CR-003 and CR-004 resolved)
- Material-Premise Gate: `Pass`
- Score Summary: 9.3/10 (93/100). Every category is at 9.0 or above.
- Failure Origin: `N/A`
- Recommended Recipient: `/software_engineering_team/api_e2e_engineer`
- Notes:
  - API/E2E should re-run DI-001 live (a collaborator Team coordinator's authored handoff), plus VIS-004/005/007/010/013/015, RD-004 live and after reopen in Team, Org and Agent roots, and the held send with a real `COLLABORATOR_ADD_FAILED`.
  - Also needed: Org journeys live, AGY/ACP, and admission latency.
  - The proportional review of API/E2E's durable test changes (API-REV-001 and later) is still pending until a passing run.
