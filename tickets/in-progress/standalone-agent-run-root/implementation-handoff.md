# Implementation Handoff — standalone-agent-run-root

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result:
  - Large/High, so independent architecture review applied.
  - ARCH-REV-003 passed SR-005 (delta review of the base refresh); ARCH-REV-002 passed the SR-004 substance.
  - The reviewer handed implementation to `/implementation_engineer`.
- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/standalone-agent-run-root/tickets/in-progress/standalone-agent-run-root/requirements-doc.md` (Approved, SR-002)
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/standalone-agent-run-root/tickets/in-progress/standalone-agent-run-root/investigation-notes.md` (E-01–E-21)
- Solution revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/standalone-agent-run-root/tickets/in-progress/standalone-agent-run-root/solution-revision-record.md` (SR-001–SR-005)
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/standalone-agent-run-root/tickets/in-progress/standalone-agent-run-root/design-spec.md` (SR-005, § Base Refresh Deltas D-R1–D-R7)
- Supplemental task artifacts: the predecessor UI/UX spec (VIS-004/009/012/013, RD-004).
  - The package path `/Users/normy/autobyteus_org/autobyteus-web-prototype/tickets/done/cross-scope-agent-mentions-sr008/ui-ux-spec.md` does not exist.
  - The same ticket is in the canonical design repository, which is what I used: `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/cross-scope-agent-mentions-sr008/ui-ux-spec.md`, with references in `.../visual-references/`.
- Design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/standalone-agent-run-root/tickets/in-progress/standalone-agent-run-root/design-review-report.md` (ARCH-REV-003 Pass)
- Architecture review revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/standalone-agent-run-root/tickets/in-progress/standalone-agent-run-root/architecture-review-revision-record.md`
- Triggering rework report: N/A (initial implementation handoff).

## Current Implementation Summary

- Implementation cycle: `Rework` (IR-003, Local Fix for CRR-003 / CR-002, from API/E2E F-01). Earlier rounds: IR-002 (CR-001), IR-001 (initial baseline).
- Implementation revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/standalone-agent-run-root/tickets/in-progress/standalone-agent-run-root/implementation-revision-record.md`
- Current implementation revision ID: `IR-003`.
- Related solution revision IDs: SR-005 (requirements SR-002).
- Related architecture-review revision IDs: ARCH-REV-003 (ARCH-REV-002 for the SR-004 substance).
- Related code-review revision IDs: CRR-001, CRR-002 (Pass), CRR-003. API/E2E revision IDs: API-REV-001. Delivery revision IDs: N/A.
- Triggering finding IDs: CR-002 (API/E2E F-01). CR-001 was resolved in IR-002.
- Code review status:
  - CRR-004 Pass: CR-002 resolved by IR-003, score 9.3/10 (`code-review-report.md`). The reviewer routed the package to `/api_e2e_engineer` for the AE-10 rerun and the web suites.
  - Earlier: CRR-002 Pass (CR-001 resolved by IR-002).
- Workspace: worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/standalone-agent-run-root`, branch `codex/standalone-agent-run-root`.
  - Base: `b37d7a934`.
  - Commits on the branch:
    - `9c3080a20`: checkpoint, in-progress implementation;
    - `b26f6436c`, `0b6fd46aa`: SR-005 and ARCH-REV-003 records;
    - `bccb1c095`: the IR-001 implementation;
    - `7ef6f828a`: IR-001 handoff artifacts;
    - `c0e8ce7fd`: the IR-002 fix for CR-001;
    - `782ec9f11`: the IR-003 fix for CR-002;
    - plus a commit with the updated artifacts.
- What the code now does:
  - Every collaboration-eligible standalone run is owned by one `StandaloneAgentRunRoot`. A root-owned host handle makes the host ready on every root path, so host crash recovery is uniform. `StandaloneAgentRunRootManager` replaces the old root manager, binding, statics and wake path.
  - Team-run collaborator Agents live in `TeamRootCollaboratorAgentRegistry`.
  - The three oversized files are at or under 400 lines.
  - Standalone self-delegation is rejected.
  - Deliveries state the sender's full address.
  - A standalone run's token totals include its children.
  - The "earlier events" page renders deliveries as "From <Sender>:".
  - The host's label in a collaborator's Team tab is title case.

## Routing Classification (Mandatory)

- Task size: `Large`. Architecture risk: `High`.
- Design classification section: `design-spec.md` § Task Size And Architectural Risk.
- Classification: `Confirmed`. The implementation matches the designed scope: runtime ownership for every eligible standalone run, and a delivery-text change on every runtime.
- Selected route: `Code Review`.
- Lightweight self-review for the direct route: `Not Applicable` (Large/High).
- New design impact or escalation trigger: `None`.
  - No predecessor standalone E2E needed a behavior change.
  - Host activation runs inside the root gate without lock reversal.
  - Every runtime carries the new header (it is runtime-agnostic input text; checked live on Claude SDK and Codex).

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001 Standalone command (REQ-001) | One root owns the eligible run; the host is made ready in the root gate | `AgentRunCommandCoordinator` → `StandaloneRunCommandPort` (`StandaloneAgentRunRootManager.postUserMessage`) → `StandaloneAgentRunRoot.postHostUserMessage` [gate] → `StandaloneRootMessageDelivery.postToHost` → `StandaloneHostAgentHandle.ensureReady` → `StandaloneAgentRunLifecycleService.activateHost` [lane] → `run.postUserMessage` | Done (checkpoint). Live: General Agent on Claude SDK and Codex; reopen after Stop restored the host |
| BEH-002 Child → host (REQ-001) | Delivery to the host goes through `host.ensureReady`; no special wake. Child commands on the collaboration stream do not need the host (IR-002, CR-001) | `StandaloneRootMessageDelivery.deliverTo` (host branch); `AgentCollaborationStreamHandler.handleMessage` uses `manager.getActive ?? resolveRoot + ensureHostReady` | Done. Live: a collaborator `send_message_to` by sender address reached the host; after a killed Codex app-server, the next message restored the host |
| BEH-003 Stop / delete / archive / shutdown | `stopRoot` (children, then host) / `endRoot` / `stopAll` | `AgentRunService.terminateAgentRun` → `StandaloneRunLifecyclePort.stopRoot`; `standalone-run-liveness.ts` → `manager.endRoot`; supervisor → `stopAll` | Done. Live: Stop, archive refused while active, archive and delete after Stop |
| BEH-004 Team collaborator agent (REQ-002) | Collaborator Agents are held in a registry, not in configured-member structures | `agent-team-execution/local/registries/team-root-collaborator-agent-registry.ts`; `flat-team-execution-manager.ts` consults it; `FlatTeamMemberConfigResolver.addCollaborator` and `memberContexts.push` removed | Done (checkpoint) |
| BEH-005 Self-delegation (REQ-004) | `COLLABORATION_SELF_TARGET_REJECTED` | `StandaloneRootMessageDelivery.delegateTask` | Done (checkpoint) |
| BEH-006 Delivery text (REQ-005) | `sender name: …, sender address: …, sender id: …` | `root-communication-runtime-builder.ts` (Org and standalone roots); `inter-agent-message-runtime-builders.ts` (Team runs, see Assumptions); `global-agent-run-message-runtime-builders.ts` (when the sender has a member context); web `utils/collaboration/interAgentDelivery.ts` accepts both forms; released header frozen in the Org first-message summary migration | Done. Live: both directions carried the address; the web rendered "From Kid Story Teller:" |
| BEH-007 Token totals (REQ-006) | A standalone total includes collaborators, collaborator-Team members and copies, each record once; existing runs too | `token-usage/services/standalone-run-token-usage-summary-service.ts` → `TokenUsageRunStore.getStandaloneRunSummary` → `SqlTokenUsageRunRepository.listByRunIds` → `buildStandaloneRunTokenUsageSummaryFromRecords`; GraphQL `getStandaloneRunTokenUsageSummary`; web `tokenUsageMeterStore` (`standaloneRunSummaries`) and `useTokenUsageWorkspaceScope` | Done. See Assumptions on the host-owned context fields and refresh |
| BEH-008 Earlier events (REQ-007) | The page shows "From <Sender>:" | Server `event-monitor-active-trace-page-projection.ts` (`inter_agent` visual from a user trace with `senderId`, plus `resolveActiveTracePageSenderAddresses` in the Team, Org and standalone member page services); GraphQL `EventMonitorInterAgentVisual`; web `eventMonitorActiveTraceBrowsePresentation.ts` and `EventMonitorBrowseAssistantRow.vue` (`InterAgentMessageSegment`). Standalone children's pages use the `standaloneMember` subject → `agentRunCollaborationMemberEventMonitorActiveTracePage` (IR-003, CR-002) | Done (unit level). API/E2E F-01 (child page used the run query) fixed in IR-003 |
| BEH-009 Host label (REQ-008) | "Research Assistant" in a collaborator's Team tab | `services/agentCollaboration/agentRunCollaborationContext.ts#identityOf` (host → `memberTitleName`) | Done. Live: "from/to General Agent" in the collaborator's Team tab |
| BEH-010 Preserved (AC-010) | No other visible change | All of the above | Predecessor unit and integration suites (standalone root, Agent-root fixtures, Team, Org) pass; full unit/integration comparison shows no new or changed failures. The predecessor runtime E2E suites are opt-in live-provider suites and skip locally (see the last section) |
| REQ-003 File size | Each file ≤400 lines | `standalone-agent-run-root.ts` 399 lines (376 effective); `standalone-agent-run-lifecycle-service.ts` 347; `agent-org-run.ts` 392 | Done |
| REQ-009 Test health | Guard and model-save suites green, with recorded reasons | See "REQ-009 records" below | Done: guard 20/20, model-save 11/11 |
| REQ-010 | No change (recorded classification) | — | No code |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`.

### REQ-009 records

- **AFB-004 `AgentRunIdentityAllocator` inventory** (`tests/architecture/application-framework-boundaries.test.ts`): `requiredInputs` narrowed to `["agentDefinitionService"]`; the obligation entry is kept.
  - Reason: upstream `b5715ea5b` reduced the allocator's options to `agentDefinitionService` plus the `createToken` seam. The four other names no longer exist on the constructor type. Both construction sites (`application-execution-scope-kernel-builder.ts`, `general-process-run-supervisor.ts`) inject `agentDefinitionService`.
  - No production violation.
- **Tool-registration readiness list** (same file): added `{ key: "project_tasks", name: undefined, modulePath: "../agent-tools/project-tasks/project-task-native-tools.js", exportName: "registerProjectTaskTools" }` after `core` and before `browser`.
  - Reason: upstream `560a51129` registers it through the single readiness owner (`startup/agent-tool-loader.ts`, first `serverOwnedSpecs` entry). The inventory was stale.
  - The other assertions are unchanged. No production violation.
- **Model-save root cause** (`tests/unit/agent-team-execution/team-run-model-selection-save.test.ts`, 11 `NOT_FOUND`): upstream `6beda63e6` ("Fix startup admission…") made Team package admission strict and fail-closed. `AgentTeamRunManager.updateStoppedModelConfigs` now always awaits `packageCatalog.awaitReady()` and requires `isAdmitted`, where it used to skip the check while the catalog was uninitialized.
  - The fixture used a no-disk memory dir, so the startup admission scan admitted nothing and Save returned `NOT_FOUND` ("Team run is not an admitted current package").
  - The production behavior is intended (only admitted current packages are editable), so this is a fixture defect, not a production defect.
  - Fix (checkpoint): write a real admitted package (tree plus attachment sidecars) to a temp memory dir; canonical `startedAt` with milliseconds.
  - No Design Impact.

## Key Files Or Areas

- **IR-003 (CR-002).**
  - `autobyteus-web/stores/agentRunCollaborationStore.ts#childTargetFor`: standalone children use the `standaloneMember` browse subject.
  - `services/eventMonitor/eventMonitorActiveTracePageService.ts`: new subject, exhaustive switch.
  - `services/eventMonitor/eventMonitorActiveTraceBrowse.ts`: subject key.
  - `graphql/queries/runHistoryQueries.ts`: `GetAgentRunCollaborationMemberEventMonitorActiveTracePage`.
  - `generated/graphql.ts`: regenerated.

- **IR-002 (CR-001).**
  - `autobyteus-server-ts/src/services/agent-streaming/agent-collaboration-stream-handler.ts`: child commands use the active root without host readiness; `connect` is unchanged.
  - `autobyteus-server-ts/src/api/websocket/index.ts`: injects `getActive`.
  - Handler unit tests: offline-host child send and interrupt; no-active-root fallback.
  - Module doc wording.

- **Standalone root.** `autobyteus-server-ts/src/standalone-agent-run-root/**`:
  - root, host handle, manager, message delivery (now also child commands), builder, location, persistence;
  - moved from `src/agent-run-collaboration/`.
- **agent-execution.**
  - `standalone-agent-run-lifecycle-service.ts`: `activateHost`, `terminateHost`; the binding is removed.
  - `standalone-stopped-run-model-config-updater.ts` (new): stopped-run Save, run inside the lifecycle lane.
  - `standalone-run-ports.ts`, `agent-run-command-coordinator.ts`, `agent-run-service.ts`, `runtime/general-process-run-supervisor.ts`.
  - `prompt/standalone-collaboration-instruction.ts`: moved; keeps "Work Requests and Outcomes" (D-R2).
- **Team.** `agent-team-execution/local/registries/team-root-collaborator-agent-registry.ts`, `flat-team-execution-manager.ts`, `flat-team-member-config-resolver.ts`.
- **Org.** `agent-org-execution/services/agent-org-run-message-delivery.ts` (extraction, plus child commands this round); `domain/agent-org-run.ts`.
- **REQ-005.**
  - The three builders listed under BEH-006.
  - `app-data-migrations/migrations/agent-org-history-first-message-summary-v1/agent-org-history-first-message-summary-evidence-reader.ts` (frozen released header).
  - Web `utils/collaboration/interAgentDelivery.ts`.
- **REQ-006.**
  - Server: `token-usage/services/standalone-run-token-usage-summary-service.ts` (new), `providers/token-usage-run-store.ts`, `repositories/sql/token-usage-run-repository.ts`, `projections/token-usage-run-aggregate.ts`, `api/graphql/types/token-usage-stats.ts`.
  - Web: `stores/tokenUsageMeterStore.ts`, `composables/useTokenUsageWorkspaceScope.ts`, `graphql/queries/token_usage_meter_queries.ts`, `generated/graphql.ts` (codegen against the live server).
- **REQ-007.**
  - Server: `run-history/projection/event-monitor-active-trace-page-{types,projection}.ts`, `api/graphql/types/event-monitor-active-trace-page.ts`, the Team, Org and standalone member view projection services.
  - Web: `graphql/queries/runHistoryQueries.ts`, `services/eventMonitor/eventMonitorActiveTraceBrowsePresentation.ts`, `components/workspace/agent/EventMonitorBrowseAssistantRow.vue`.
- **REQ-008.** Web `services/agentCollaboration/agentRunCollaborationContext.ts`.
- **REQ-009.** `tests/architecture/application-framework-boundaries.test.ts`, `collaborator-definition-catalog.ts` (checkpoint), the model-save test (checkpoint).
- **Docs.**
  - `autobyteus-server-ts/docs/modules/standalone_agent_run_root.md`: renamed from `agent_run_collaboration.md` and rewritten.
  - `agent_communication.md`: header, self-delegation.
  - `agent_team_execution.md`: registry.
  - `token_usage.md`: roll-up.
  - `run_history.md`, `agent_tools.md`, `prompt_engineering.md`, `README.md`: links and paths.
  - `autobyteus-web/docs/chat.md` (around line 295; D-R6): the earlier-events limit is removed; host label noted.

## Important Assumptions

- **REQ-005 covers the Team-run builder.**
  - The design's file map names the root builder and the global builder.
  - Team runs deliver through `TeamCommunicationAdapter` → `inter-agent-message-runtime-builders.ts`. REQ-005 and AC-005 require every delivery, including Team-member senders, to state the address.
  - I applied the same line there. This is the approved behavior on a sibling builder, not new behavior.
- **REQ-005 migration safety.** `agent-org-history-first-message-summary-v1` rebuilt historical envelopes with the current root builder and matched them against raw traces written by released versions.
  - Changing the shared header would have silently broken that match.
  - The migration now holds a frozen copy of the released header, which confines historical-format knowledge to the migration (design principle 5). The persisted-data decision stays `Not Affected`.
  - A regression test fails if the migration follows the current builder.
- **REQ-006 semantics in the existing panel (no new visuals).** The standalone Token Meter panel is fed by one summary: cards, context meter and pricing details.
  - The roll-up sums totals, costs, pricing and report count over every record.
  - It keeps the latest prompt, context window, model, runtime and run identity from the host record. Otherwise the "Latest prompt" context card could show a collaborator's context.
  - The web keeps the host's exact live summary separate (`runSummaries`). The roll-up (`standaloneRunSummaries`) is refetched on each new host usage report.
  - Usage reported only by children appears on the next host report or when the panel is opened again, because child token events are not on the host stream.
- **REQ-008 formatter.** The host label uses `memberTitleName(hostAddress)`: REQ-008's "shared readable format", the same formatter as "From Research Assistant:".
- **REQ-003 measure.** The reviewer quoted total line counts (413/450), so every target file is at or under 400 total lines (which also meets the design's effective-line target). That includes `agent-org-run.ts`, which was 408 total and 387 effective. The two extractions are behavior-neutral moves.
- **AC-001.** Predecessor tests changed only through renames and API substitutions; no assertions were relaxed.
  - This round adds one wiring fix: `tests/integration/agent-execution/agent-run-prompt-fallback.integration.test.ts` now passes the standalone roots fixture, as the other `AgentRunService` integration tests do.
  - Without it, AR-003's loud bypass error made two base-failing tests fail with a different message.
  - With it, they fail exactly as on the base (`AgentCreationError … getCompactionRecovery is not a function`).

## Known Risks

- **REQ-001 blast radius:** every eligible standalone run, including General Agent.
  - Mitigation: the predecessor unit and integration suites pass, the full-suite comparison is clean, and live checks on Claude SDK and Codex passed (chat, `@` bring-in, child ↔ host messages, Stop/reopen, host crash, archive/delete).
  - The AC-001 runtime E2E gate has not been executed yet (opt-in live-provider suites; see the last section).
- **Base-failure masking (D-R4):** 147 server and 42–45 web tests fail on the clean base. The comparison is by test name and message (see Local Checks).
  - `agent-run-manager` (16, on the REQ-001 host path) fails identically.
- **`tokenUsageMeterStore.ts`** is 492 effective lines, close to the 500 guardrail; this round added 53. A future addition there should split the store.
- **`origin/personal` has moved** 3 docs-only commits past `b37d7a934` (`f8300e7bd`, `0a32261d6`, `7d880ee7e`: DESIGN.md rename, delivery records). The branch does not touch those files; delivery must integrate them.
- **Composer driving during live checks:** two scripted sends to the collaborator did not fire on the first try, and a later one did. I could not separate this from synthetic-event timing; no failure was seen through real-user-equivalent paths. Worth a real-click check downstream.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Refactor, plus a small behavior change.
- Reviewed root-cause classification: Boundary Or Ownership Issue, plus File Placement Or Responsibility Drift.
- Reviewed refactor decision: `Refactor Needed Now`.
- Implementation matched the reviewed assessment: `Yes`.
- If challenged, routed as `Design Impact`: `N/A`.
- Evidence / notes:
  - The lifecycle holds no root reference.
  - `agent-execution` reaches roots only through the two injected ports.
  - The size fixes moved cohesive concerns to their natural owners: child commands to delivery, and stopped-run Save to its own updater while the lane stays with the lifecycle.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`.
  - The web parser accepting both header forms is the design-required tolerant reader for stored history, not a dual path.
  - The frozen header lives only in the migration.
- Legacy old-behavior retained in scope: `No`.
- Dead or obsolete code removed in scope: `Yes`.
  - Removed: `standalone-agent-run-collaboration-binding.ts`, `AgentRunCollaborationRootManager` and its statics, `bindCollaboration`, `onHostPublished`, `resolveCommandReadyRoot`, the wake branch, `FlatTeamMemberConfigResolver.addCollaborator`, the `src/agent-run-collaboration/` folder.
  - No references remain in server `src` or `tests`.
- Shared structures remain tight: `Yes`. One new GraphQL visual type mirrors the user visual plus sender fields; the summary payload type is reused.
- Canonical shared design guidance reapplied: `Yes`.
- Changed source files within size guardrails: `Yes`.
  - No changed source file is over 500 effective lines.
  - Deltas over 220 lines are module moves or new files.
- Notes: none.

## Persisted Data Transition Check (When Applicable)

- Approved decision: `Not Affected` (design-spec § Persisted Data / State Transition Decision).
- Implementation follows it without an unapproved migration or a version-specific runtime fallback: `Yes`.
  - The token roll-up reads existing records and trees.
  - No package or metadata format changed.
  - New deliveries carry the new header text. Stored ones keep theirs and still render.
- Deviation from the reviewed transition decision: `None`. The frozen header in the existing migration preserves that migration's released behavior; it is not new migration logic.

## Environment Or Dependency Notes

- Ran `pnpm install --frozen-lockfile` at the worktree root.
- Clean-base comparison worktree, left for downstream reuse: `/Users/normy/autobyteus_org/autobyteus-worktrees/standalone-agent-run-root-cleanbase`.
  - Detached at `b37d7a934`, with dependencies installed, SDK contracts built, `pnpm prebuild` run and `nuxt prepare` done.
  - Delivery may remove it with `git worktree remove`.
- Dev live-check data is under the worktree's `.autobyteus/development/server-data/` (not tracked). The dev stack is stopped.

## Local Implementation Checks Run

All of these are implementation-scoped local checks, not API/E2E sign-off.

- **Server `tsc --noEmit`:** 0 errors apart from TS6059.
- **Web `tsc` over the Nuxt tsconfig:** 636 errors, identical to the clean base apart from absolute paths. `vue-tsc` is not installed.
- **Architecture guards and model-save:** `tests/architecture` plus `team-run-model-selection-save` pass, 55/55.
- **Focused suites:**
  - standalone root unit and integration;
  - Org unit and integration, plus the Org E2E folder: 147 passed, 1 skipped, 1 base failure, identical message;
  - prompt snapshots: unchanged and passing, "Work Requests and Outcomes" present;
  - token store integration (new roll-up case);
  - summary service unit (stored tree, live tree, no package);
  - page projection unit;
  - builder tests for the root, Team and global builders;
  - migration test (new released-header case);
  - web token panel, event-monitor presentation, agentCollaboration, and collaboration utils specs.
- **Full suites against clean `b37d7a934`, compared by test name and failure message:**
  - Server (`vitest run tests/unit tests/integration tests/architecture`): 147 failing on both sides, all identical; 0 new; 0 changed; 38 now passing.
    - The guard and composition-boundary tests and model-save pass because of this branch.
    - 9 application-backend worker tests and 14 file-system-watcher tests also pass here. They look environmental (the base run's worker and fs-event environment), not caused by this branch.
  - Web (`vitest run`): 45 failing on the branch and 45 on the base; 0 new.
    - 3 apparent message differences are in `FileExplorer.metadataActivation.spec.ts` and `RightSideTabs.workspaceTarget.spec.ts`, which this branch does not touch.
    - 6 runs per side gave the same failing set with equivalent frequencies (flaky) and identical messages; two parameterized tests had swapped in the first JSON comparison.
    - `AgentCompactionLiveFlow` and `WorkspaceAgentRunsTreePanel.regressions` fail identically on the base.
- **Live checks (D-R5)** on the dev stack (`pnpm dev`; backend :8000, frontend :3000) with General Agent (`autobyteus-daily-assistant`):
  - Claude SDK (claude-haiku-4-5):
    - chat ("pong");
    - `@Kid_Story_Teller` bring-in: package created, the collaborator received the header with `sender address: /general_agent`;
    - a collaborator command from its own composer: it messaged the host by address, the host received `sender address: /kid_story_teller` and the UI rendered "From Kid Story Teller:";
    - the Team tab showed "from/to General Agent";
    - Stop: stored view inactive;
    - reopen by sending: host restored through the root;
    - archive refused while active; archive and delete after Stop succeeded (package removed).
  - Codex (gpt-5.5):
    - GraphQL `createAgentRun` (AR-003 path: live root, host published);
    - chat ("pong");
    - host crash: killed only this dev server's `codex app-server` child. The next message restored the host (new app-server, reply "alive").
  - The `@`-on-Codex flow was not repeated.

## Frontend Rendered-Result Check (When Applicable)

- Affected surfaces / journeys:
  - the Token Meter panel for a standalone run (REQ-006);
  - Event Monitor "earlier events" paging (REQ-007);
  - a collaborator's Team tab (REQ-008);
  - "From <Sender>:" for the new header (REQ-005).
- Approved references: VIS-013 (Team tab "to/from Research Assistant"), RD-004 (`InterAgentMessageSegment` style). No new visuals.
- Existing components reused: `InterAgentMessageSegment`, `EventMonitorBrowseAssistantRow`, `TokenUsageMeterPanel` (unchanged markup), `memberTitleName`.
- Surface used: the TESTING.md full-stack dev path (`pnpm dev`), through the in-app browser tab (DOM/text inspection; the screenshot bridge returned no image bytes).
- States inspected:
  - live host conversation with a "From Kid Story Teller:" delivery;
  - collaborator conversation with "From General Agent:";
  - collaborator Team tab rows reading "from/to General Agent";
  - mention menu and chip;
  - stopped and reopened host;
  - Codex run view.
- Issues found and corrected: none in rendering.
- Remaining unverified:
  - The "earlier events" page was not reached live (it needs a long active trace). The REQ-007 rendering is covered by presentation and projection unit tests.
  - The rolled-up Token Meter total was not inspected live with child usage. It is covered by the store integration, service and panel tests.
  - Not checked visually by screenshot.

## Downstream Coverage Hints / Suggested Scenarios

- **REQ-007:** page back far enough on a collaborator or Team member conversation to reach the "earlier events" page; deliveries should show "From <Sender>:". Check a host page too (no resolved address; the name comes from the header).
- **REQ-006:** a standalone run with a collaborator, a collaborator Team and a copy. The Token Meter total should equal the sum of the exact-run summaries; the context card should stay the host's. Then a child-only usage report followed by a host report.
- **REQ-005:** on the AGY and Grok runtimes and on native AutoByteus, a reply by address to a Team-member sender (`/team/lead`) should reach it. Stored pre-change history should still render "From …".
- **REQ-002:** there is no dedicated unit test for `TeamRootCollaboratorAgentRegistry`; coverage is through the Team-root collaborator suites. A restore-after-Stop of a Team run with a collaborator Agent is worth a real check.
- **Real-click composer send** to a collaborator (see Known Risks).
- **AR-001:** opening a stopped run's collaboration view starts the host.

## API / E2E / Executable Coverage Investigation And Execution Still Required

- **AC-001 runtime E2E gate.** `tests/e2e/runtime/standalone-agent-collaborator-mention.e2e.test.ts` (10) and `tests/e2e/runtime/agent-initiated-collaborators.e2e.test.ts` (36) are opt-in live-provider suites.
  - Gates: `RUN_CLAUDE_E2E=1`, `RUN_CODEX_E2E=1`, `RUN_AGY_E2E=1`, `RUN_GROK_E2E=1` or `RUN_LMSTUDIO_E2E=1`, plus the runtime CLI.
  - Without a gate they skip (46/46 skipped locally), so they have not been executed for this branch.
  - They must be run, on Claude and one other runtime at least, to close AC-001.
- The server E2E suite (`pnpm test:e2e`) was not run.
- Real-provider and runtime E2E for the header across runtimes.
- Packaged Electron and isolated-desktop validation of the four changed web surfaces.
