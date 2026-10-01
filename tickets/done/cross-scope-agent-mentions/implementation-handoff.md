# Implementation Handoff — cross-scope-agent-mentions

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: independent architecture review selected and passed
  (ARCH-REV-004, Pass, on SR-010). Route after implementation: Large/High → code review (per `get_handoff_rules`).
- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/cross-scope-agent-mentions/tickets/in-progress/cross-scope-agent-mentions/requirements-doc.md` (SR-008; RD-004 as REQ-014/AC-016)
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/cross-scope-agent-mentions/tickets/in-progress/cross-scope-agent-mentions/investigation-notes.md`
- Solution revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/cross-scope-agent-mentions/tickets/in-progress/cross-scope-agent-mentions/solution-revision-record.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/cross-scope-agent-mentions/tickets/in-progress/cross-scope-agent-mentions/design-spec.md` (SR-010)
- Supplemental task artifacts:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/cross-scope-agent-mentions/tickets/in-progress/cross-scope-agent-mentions/architecture-design-handoff.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/cross-scope-agent-mentions/tickets/in-progress/cross-scope-agent-mentions/product-design-revision-request-handoff.md`
  - Approved revised UI/UX spec and VIS-001–015: `/Users/normy/autobyteus_org/autobyteus-web-prototype/tickets/done/cross-scope-agent-mentions-sr008/ui-ux-spec.md`, `…/visual-references/`
- Design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/cross-scope-agent-mentions/tickets/in-progress/cross-scope-agent-mentions/design-review-report.md`
- Architecture review revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/cross-scope-agent-mentions/tickets/in-progress/cross-scope-agent-mentions/architecture-review-revision-record.md`
- Findings released with this package: `code-review-report.md` round 4 (CRR-004: CR-003, CR-004 F-02/F-03/F-04),
  `api-e2e-execution-coverage-report.md` (API-REV-001: DI-001), both in the ticket folder.

## Current Implementation Summary

- Implementation cycle: `Rework` (revised design)
- Implementation revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/cross-scope-agent-mentions/tickets/in-progress/cross-scope-agent-mentions/implementation-revision-record.md`
- Current implementation revision ID: `IR-004`
- Related solution revision IDs: `SR-010` (design), `SR-008` (requirements, RD-004)
- Related architecture-review revision IDs: `ARCH-REV-004`
- Related code-review revision IDs: `CRR-004` (CR-003, CR-004)
- Related API/E2E revision IDs: `API-REV-001` (DI-001)
- Related delivery revision IDs: `N/A`
- Triggering finding IDs: `DI-001`, `CR-003`, `CR-004` (F-02, F-03, F-04)
- Workspace: worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/cross-scope-agent-mentions`, branch
  `codex/cross-scope-agent-mentions` @ `bcff48200` (4 new commits on `5dcc5dc82`: `fdda4a2ed` contracts, `180a2d2d4`
  native memory, `33b0d1eef` server, `bcff48200` web), base `origin/personal` @ `8caa610ff`, finalization target
  `personal`. The ticket folder stays uncommitted, as received. The API/E2E engineer's uncommitted files were not
  touched (see Environment notes).

In one paragraph: a collaborator is now **one hosted instance per definition and run**, added when the user sends the
`@` message. Inside the root gate, admission plans the mentions (reusing an existing entry), checks every new placement
with `RunModelSelectionValidator.validateMany`, allocates the run IDs, prepares the hosted executions, commits the
entries in one tree write, publishes them Offline and emits `collaborator_added`, and only then composes the note and
posts. Any failure returns `COLLABORATOR_ADD_FAILED` with the collaborator's name: nothing is written or posted and the
client keeps the draft and shows the notice. Each root hosts collaborators in its existing backends (Org/Agent root:
`RootAgentExecutionRegistry` / `RootTeamExecutionDirectory`; Team root: the root `FlatTeamExecutionManager` and the new
`CollaboratorTeamExecutionRegistry`), restores them with the root and stops them with it. `send_message_to` reaches a
collaborator, a collaborator Team's coordinator or any collaborator Team member by address, and the first message starts
it (DI-001 fixed: teammates reach their own instances). `delegate_task` to a collaborator address starts an extra copy.
Inter-agent deliveries record their sender on the user trace and render as "From <Sender>:" live and on replay (RD-004).
The web shows collaborator rows from `collaborators`, holds only mention sends until acceptance, settles Team sends on
identity (CR-003), opens a collaborator Team once (F-02), names everything with one formatter (F-03) and gives the
Agent-root collaborator view its header controls and placeholder (F-04).

## Routing Classification (Mandatory)

- Task size: `Large`
- Architecture risk: `High`
- Design classification section / evidence reference: `design-spec.md` (SR-010) "Task size: Large", "Architectural risk:
  High"; ARCH-REV-004.
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale: three contract packages, the persisted collaborator entry of three tree families, admission and
  hosting in three roots (including a new Team-root registry and lifecycle wiring), memory recording in two recorders,
  run-view projections, and product-wide web send/render paths (~190 files in 4 commits).
- Selected route: `Code Review`
- Lightweight implementation self-review completed for the direct route: `Not Applicable`
- New design impact or escalation trigger: `None`. Escalation triggers checked:
  - lazy `fresh` start: every root hosts collaborators as configured-style handles whose runtime is created on first
    input in the mode they were added with (`fresh` at admission, `restore` on reopen) — exercised live (Claude) in the
    Agent and Team roots and in unit tests for all three roots;
  - `validateMany` validates a Team's members together: one batch call per admission, one placement per member;
  - `senderId` on user traces: native AutoByteus (`MemoryIngestInputProcessor`) and every external runtime
    (`AgentRun` forwarded-input observer → `RuntimeMemoryEventAccumulator`) record it; no runtime-specific path exists
    outside these two.

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001/002 | `@` menu, structured mentions, note | Unchanged from SR-007; note wording `agent-presentation-contracts/src/collaborator-mention-note.ts` ("Message a collaborator with send_message_to and its address; it starts on its first message.") | Done. |
| BEH-003 (DS-001) | Admission adds the instance at send | `agent-collaboration/collaborators/collaborator-mention-admission.ts` (plan → `collaborator-runnability-validator.ts` → `collaborator-identity-allocator.ts` → root `addEntries` → compose); roots: `agent-org-run-collaborators.ts`, `team-run-collaborators.ts`, `agent-run-collaboration-collaborators.ts` (prepare handles → durable commit → `commitAfterDurability` publishes handles → `collaborator_added`) | Done. Tests assert the order (validate → allocate → add) and that a failure writes, hosts and publishes nothing (unit: admission, Org, Team root, Agent root). |
| BEH-005 (DI-001) | Messaging resolves collaborators | `getMessagePlacement` in `agent-org-execution-index.ts`, `team-execution-index.ts`, `agent-run-collaboration-execution-index.ts`; recipient resolvers in each root | Done. Live: Agent root (host ↔ collaborator), Team root (researcher ↔ product prototyper). Unit: lead → `/product_team/designer` reaches the designer's own instance (Team root, Agent root). |
| BEH-006 | Hosting, restore, stop | Org/Agent: `agent-collaboration/execution/backends/collaborator-handle-preparation.ts`, `agent-org-execution-scope-builder.ts`, `agent-run-collaboration-root-builder.ts` (async, restores in `restore` mode). Team: `flat-team-execution-manager.ts` (`prepareCollaboratorAgent`, `prepareCollaboratorTeam`, `requireCollaboratorTeam`, routing/status/termination include them), `local/registries/collaborator-team-execution-registry.ts`, `flat-team-member-config-resolver.ts` (collaborator nodes with their own mode), `configured-agent-execution-registry.ts` (honours that mode), `team-root-collaborator-hosting.ts`, `team-root-materializer.ts` (`restoreCollaborators`), `root-team-run.ts` (`requireTeamRun` → `requireCollaboratorTeam`) | Done. `mode` honoured per collaborator (not taken from the TeamRun) — recorded deliberately: added = `fresh`, restored = `restore`. Unit: Team-root Stop → reopen → send restores in `restore` mode with the same run IDs; interrupt and tool approval reach a collaborator; Agent root likewise. |
| BEH-007/008 (DS-008) | Rejection, draft kept, notice | Server: `CollaboratorAddError` → `COLLABORATOR_ADD_FAILED` + `collaborator_name` (agent ack via `agent-run-command-{coordinator,registry,types}.ts`, Team ERROR `agent-team-stream-handler.ts`, collaboration acks `agent-org-stream-handler.ts`, `agent-collaboration-stream-handler.ts`). Web: `services/collaborators/collaboratorAddFailures.ts` (`CollaboratorAddRejection`), `services/runSubmission/localUserSubmission.ts` (held submission), stores, `CollaboratorAddFailureNotice.vue` reads `AgentContext.collaboratorAddFailure` | Done. The `delegate_task`-null derivation is removed. |
| BEH-013 (DS-003) | `delegate_task` → extra copy | Source resolvers use `resolveCollaboratorCopySource` (entry, or a collaborator Team member); host = delegator's host (Org existing; Agent root made host-aware: `agent-run-collaboration-task-execution-adapter.ts`, `addAgentRunTaskExecution(host)`; Team via `TeamExecutionScopeResolver`) | Done. Tests: copy at root, teammate copy inside the collaborator Team's `taskExecutions` (Agent root, Team root, Org). |
| BEH-014 (DS-010, RD-004) | "From <Sender>:" live and replay | `autobyteus-ts/src/agent/message/inter-agent-sender.ts`, `memory-ingest-input-processor.ts`, `memory-manager.ts`, `raw-trace-ingestion.ts`; server `runtime-memory-event-accumulator.ts`, `external-runtime-memory-writer.ts`; replay `raw-trace-to-historical-replay-events.ts`, `historical-replay-events-to-conversation.ts`, `run-projection-types.ts` (`resolveInterAgentSenderAddresses`) in Team/Org/Agent-root member projections. Web: `memberInputMessageHandler.ts`, `runProjectionConversation.ts`, `utils/collaboration/interAgentDelivery.ts`, `InterAgentMessageSegment.vue` | Done. Old traces without `senderId` stay user-style (tested). Live rendered in both directions. |
| CR-003 | Team send settles on identity | `TeamStreamingService.resolveTeamSend` (no content check) | Done; test with composed note content. |
| F-02 | Collaborator Team opens once | Team: `opensOnAppear` on the row → `isTeamMemberExpanded(..., openByDefault)`; Org task Teams already default open; Agent root `onCollaboratorAdded` → `openNewTaskTeams` | Done; rendered (Agent and Team runs). |
| F-03 | One name formatter | `utils/collaboration/memberDisplayName.ts` used by Team collaborator rows and contexts, Team/Org tab labels, Org/Agent-root contexts, `runMentionScope`, Org history rows, "From" | Done. Configured Team member rows keep their existing names. |
| F-04 | Agent-root collaborator view | `AgentWorkspaceView.vue` (header actions for children, `composerPlaceholder`), placeholder threaded through `AgentWorkspaceSurface` → `AgentEventMonitor` → `AgentUserInputForm` → `AgentUserInputTextArea` | Done; rendered ("Message code reviewer…", ⚙ and ＋). |
| AR-007 | Hold only mention sends | `beginLocalUserSubmission` holds when `mentions` is non-empty; `acceptLocalSubmission` on acceptance (Team echo, Org/Agent-root ack, standalone `sendMessageAwaitingAdmission`) | Done. Sends without mentions keep the immediate echo. |
| Preserved | New chat `@`, SR-007 Agent root lifecycle, context files, `teamScoped`, `launchPurpose` | Unchanged | Preserved (existing tests pass). |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`

## Key Files Or Areas

- Contracts: `autobyteus-team-stream-contracts/src/{team-execution-view-dtos,team-agent-message-dtos}.ts`,
  `autobyteus-collaboration-stream-contracts/src/{agent-org-execution-dtos,root-execution-view-dtos}.ts`,
  `autobyteus-agent-presentation-contracts/src/collaborator-mention-note.ts` (dist rebuilt).
- Shared records: `run-history/domain/run-execution-tree-shared-records.ts`, `collaborator-entry-tree-mapping.ts` (new),
  `run-history/store/run-execution-tree-shared-record-schemas.ts` (identities, invariants incl. run-ID uniqueness and
  collaborator Team task owners) and the three tree schemas.
- Collaborators module: `collaborator-mention-admission.ts`, `collaborator-runnability-validator.ts` (new),
  `collaborator-identity-allocator.ts` (new), `collaborator-entry-builder.ts`, `collaborator-candidate-policy.ts`,
  `collaborator-source-projector.ts`, `collaborator-errors.ts`, `collaborator-definition-catalog.ts`.
- Roots: Org (`agent-org-run.ts`, `agent-org-execution-index.ts`, `agent-org-execution-scope-builder.ts`,
  `agent-org-recipient-resolver.ts`, `agent-org-task-source-resolver.ts`, `agent-org-run-collaborators.ts`,
  `agent-org-run-execution-tree-mutator.ts`); Team (`root-team-run.ts`, `team-execution-index.ts`,
  `team-recipient-resolver.ts`, `team-run-collaborators.ts`, `team-root-collaborator-hosting.ts`,
  `team-run-execution-tree-mutator.ts`, `member-team-context-builder.ts`, `team-flat-execution-callbacks.ts`,
  `team-root-materializer.ts`, `local/*`); Agent root (`agent-run-collaboration-root.ts`, `-root-builder.ts`,
  `-execution-index.ts`, `-recipient-resolver.ts`, `-task-source-resolver.ts`, `-task-execution-adapter.ts`,
  `-tree-mutator.ts`, `-collaborators.ts`, `prompt/standalone-collaboration-instruction.ts`).
- Web: see the trace table; plus `teamExecutionTreeSelectors.ts` (`withCollaboratorExecutions`), `teamExecutionViewState.ts`,
  `teamExecutionTreeMutations.ts`, `agentSourceSelectors.ts` (`collaboratorExecutionNodes`), Org/Agent-root index,
  context and context factories (`agentOrgMemberContextFactory.ts`, `agentRunCollaborationChildContextFactory.ts`, new).
- Docs: server `docs/modules/{agent_communication,agent_team_execution,agent_orgs,agent_run_collaboration,run_history}.md`;
  web `docs/chat.md`.

## Important Assumptions

- Collaborator Agents run with the run's root launch settings (unchanged rule); the runnability check uses
  `workspaceRootPath ?? process.cwd()` as the Team run manager does.
- A collaborator Agent directly under a Team root is a direct Agent of the root TeamRun (physical scope = root); members
  of a collaborator Team live under `[collaboratorTeamRunId]` (design table).
- The Team-root collaborator Team reuses `TaskTeamExecutionFactory` (`prepareFreshTaskTeam`/`prepareRestoredTaskTeam`) to
  build its TeamRun (lazy members, root callbacks); its registry has no idle shutdown.
- The Org and Agent-root web contexts add new collaborator contexts **in place** on `collaborator_added` (not by checkpoint
  reload), because a reload closes the socket and would drop the pending mention send's acknowledgement. The workspace
  metadata of such a context is taken from a sibling with the same root path or resolved right after.
- Collaborator rows reuse the task-row presentation (approved look); their accessible label still says "Temporary task
  …" as other delegated rows do (unchanged copy).
- Deviations from the design text, within scope:
  - The Agent root task adapter became host-aware (the design's "Same" extra-copy host rule); before, every Agent-root
    task was hosted by the root.
  - The replay inter-agent item is passed as GraphQL JSON (no contract schema exists for conversation items), so it is
    not added to `agent-presentation-contracts`; its shape is documented in `run_history.md` and typed on both sides.
  - `materializeTeamRoot` gained an optional `collaboratorAdmission` input (test seam, like the Org and Agent-root builders).

## Known Risks

- **Admission latency inside the root gate**: model validation (catalog evidence) and identity allocation run while the
  gate is held; other commands of that root wait. Not measured; in the live check the held composer cleared without a
  noticeable wait.
- **AGY / ACP** were not exercised live (Claude only, plus unit tests on the shared paths).
- **Prompt change** reaches every eligible standalone agent (snapshot updated).
- **Malformed Agent-root package blocks new standalone runs** (pre-existing since SR-007, surfaced here): the Agent-root
  location service reads every package strictly when checking run-ID uniqueness, so one invalid
  `collaboration_tree.json` makes `prepareAgentRun` fail. SR-007-shaped packages are invalid under SR-010 (disposable per
  the design); the worktree's dev data had one, which I deleted through `deleteStoredRun`. Team and Org packages are
  protected by the readiness index; Agent-root packages are not.
- **Concurrent same-definition admissions** are serialized by the root gate now (admission runs inside it), so the SR-007
  residual is closed for a single root.
- **Active-trace (earlier events) page** still shows inter-agent deliveries user-style; only the run-view conversation
  and live stream render "From <Sender>:" (design scope).
- **Downgrade** (residual, unchanged): an older build rejects trees with identity-bearing entries.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: `Larger Requirement` (revised)
- Reviewed root-cause classification: `Missing Invariant` (one instance per collaborator) + `Boundary Or Ownership Issue`
  (hosting in each root's backend)
- Reviewed refactor decision: `Refactor Needed Now`
- Implementation matched the reviewed assessment: `Yes`
- If challenged, routed as `Design Impact`: `N/A`
- Evidence / notes: no new cross-root hosting class (one helper function prepares Org/Agent-root handles); the Team root
  extends its own local registries; messages and delegations stay split per root.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`
- Dead/obsolete code removed in scope: `Yes` — collaborator runs as root task executions, `collaboratorAddressMessageHint`
  and its rejection, `hasTaskExecutionAt` (in-run-by-task rule), the web `delegate_task`-null failure derivation
  (`deriveCollaboratorAddFailures`, `parseDelegateTaskResult`), content-keyed Team settle, per-surface name helpers
  (`collaboratorDisplayName`, local `nameAt` copies), "use delegate_task" wording; the SR-007 collaborator tests in the
  Team integration file (replaced by `team-root-collaborators.test.ts` over the real flat manager).
- Shared structures remain tight: `Yes` (entry variants stay a discriminated union; member identity added per member).
- Canonical shared design guidance reapplied: `Yes`
- Changed source files within size guardrails: `Yes` — largest changed source files (non-empty lines): `memory-manager.ts`
  500 (kept at its base 499+1), `root-team-run.ts` 495, `flat-team-execution-manager.ts` 487, `agent-org-run.ts` 480,
  `agent-run-collaboration-root.ts` 463. No changed source file has a delta above 220 lines.

## Persisted Data Transition Check (When Applicable)

- Approved decision: `Directly Usable — No Migration` (SR-007 shapes never released; developer data disposable).
- Implementation follows the decision: `Yes` — entries require their identity fields; readers stay tolerant of a missing
  `collaborators`; raw traces gain the optional `senderId`; old traces project user-style.
- Direct-use evidence: `collaborator-tree-records.test.ts` (exact keys incl. identities, run-ID collisions, collaborator
  Team delegations), replay test (trace without `senderId` stays a user message).
- Deviation: `None`.

## Environment Or Dependency Notes

- Server type checking: `npx tsc -p tsconfig.build.json --noEmit` (after `pnpm prepare:shared`; the generated
  `autobyteus-application-*/dist` folders were removed afterwards). `autobyteus-ts` build output (ignored) was rebuilt so
  the server build resolves the new `inter-agent-sender` module.
- Contract `dist/` folders are committed and were rebuilt.
- Uncommitted files left as received (owned by the API/E2E engineer): `autobyteus-server-ts/tests/e2e/agent/standalone-error-termination-lifecycle.e2e.test.ts`,
  `tests/e2e/runtime/grok-build-runtime-replay.e2e.test.ts`, `tests/fixtures/grok-acp/fake-acp-agent.mjs`,
  `tests/skill-improvement/skill-improvement-improver-session-service.test.ts`, `autobyteus-web/package.json`, and the
  untracked `tests/e2e/runtime/standalone-agent-collaborator-mention.e2e.test.ts` and
  `autobyteus-web/tests/e2e/cross-scope-agent-mentions-live-probe.mjs`. The two collaborator probes were written for
  SR-007 (`delegate_task` to the collaborator) and will need updating to SR-010 by their owner.

## Local Implementation Checks Run

(Implementation-scoped only; not API/E2E sign-off.)

- Typecheck: server `tsc -p tsconfig.build.json` clean; `autobyteus-ts` clean; web `.ts` typecheck shows no errors in
  changed files.
- Contracts: mention-note, Team collaborator and Agent-root DTO tests pass.
- Server unit (`npx vitest run tests/unit`): 4029 tests, 78 failed — exactly the IR-003 baseline set of failing files
  (no new failing file). New/updated: `collaborator-mention-admission.test.ts` (10), `agent-org-collaborators.test.ts`
  (5), `agent-run-collaboration-root.test.ts` (6), `team-root-collaborators.test.ts` (5, new, real flat manager),
  `collaborator-tree-records.test.ts` (7), RD-004 accumulator/replay tests, prompt snapshot, liveness and context-file
  fixtures.
- Server integration (`tests/integration`): 380 tests, 46 failed — the same files and counts as the IR-003 baseline
  (environment-bound suites); `task-delegation-tool-lifecycle.integration.test.ts` 8/8.
- `autobyteus-ts` memory and input-processor tests: 250 passed (incl. the new sender test).
- Web (`NUXT_TEST=true npx vitest run`): 3462 tests, 4 failed — the IR-003 baseline failures (org-definition navigation,
  font-size audit, `StartupDelayLifecycle`, `WorkspaceAgentRunsTreePanel.regressions` ×2). New/updated: held submission,
  CR-003 settle, Team rejection, admission ack, RD-004 live/replay/segment, formatter, notice, F-04 view, Org in-place
  collaborator, Team view collaborator (F-02/F-03, collaborator Team delegation), Agent-root context/fixtures.

## Frontend Rendered-Result Check (When Applicable)

- Affected surfaces / journeys: send with `@` (held, Offline rows at once), collaborator rows in Agent and Team runs,
  briefing via `send_message_to`, "From <Sender>:" in both directions, Team tab rows, collaborator view (header, box),
  collaborator Team opened once, add-failure notice over a kept draft (UXJ-001/002/003/005; VIS-004/005/006/007/012/013/015).
- Approved references: revised `ui-ux-spec.md` and VIS-001–015 under
  `/Users/normy/autobyteus_org/autobyteus-web-prototype/tickets/done/cross-scope-agent-mentions-sr008/`.
- Testing guideline and rendered surface used: `TESTING.md` → `pnpm dev` in this worktree (backend `127.0.0.1:8000`,
  frontend `127.0.0.1:3000`, data under `<worktree>/.autobyteus/development`; the user's app and `~/.autobyteus` were
  not touched). Chrome headless via playwright-core, `implementation-evidence/render-check-sr010.mjs`, on real Claude
  Agent SDK runs (one standalone Agent run, one Team run). Runs were terminated and the dev stack was stopped.
- States inspected (screenshots in `implementation-evidence/render-check-sr010/`, report `render-check-report.json`):
  - `A1` right after sending `@Code Reviewer …`: the draft and chip stay until acceptance (held send); `A2` after
    acceptance: the collaborator row under the run (Offline, then Idle), the host's `send_message_to` card, the
    collaborator's report as "From Code Reviewer:", the Team tab with "to code reviewer" / "from code reviewer" rows (VIS-012/015).
  - `A3` collaborator view (VIS-013, F-04): header "code reviewer" with ⚙ and ＋, box "Message code reviewer…", the
    briefing as "From Research Assistant:", the run row not highlighted.
  - `A4` `@Product Team`: the Team row opened once with both members listed, Offline (F-02); the host briefed it with
    `send_message_to`; Code Reviewer and Product Team are no longer offered in `@` (the dev data's existing Product Team
    has team-local members, so the shared prototyper definitions stay offered — correct).
  - `B1` Team run, researcher sends `@Product Team …`: Team row and members Offline at once (VIS-015); `B2` later: the
    researcher's `send_message_to`, "From Product Prototyper:" report, Team tab rows "to product prototyper" / "from
    product prototyper" (VIS-004); `B3` the product prototyper's view starts with "From Researcher:" (VIS-005).
  - `C1` failure notice (VIS-007) above the kept draft "@Code Reviewer please check the copy." with its chip; dismiss
    works. The rejection was **injected** into the focused context (a collaborator that cannot run with the run's own
    settings cannot be produced from the UI); the transport-to-notice path is unit-tested (Team ERROR, agent ack,
    collaboration ack → `CollaboratorAddRejection` → kept draft + notice).
- Issues found and corrected during the check:
  - The Team-run collaborator member header read "product_prototyper"; collaborator contexts now use the shared
    formatter ("product prototyper"), configured members unchanged.
  - Stale SR-007 Agent-root data in the worktree dev root blocked new runs (see Known Risks); deleted via `deleteStoredRun`.
- Remaining limitations: Org-run journeys (VIS-008–010) were not rendered live; the Org web path is covered by unit
  tests (in-place `collaborator_added` with contexts and opened Team rows, view index, tab labels). VIS-014 (small window)
  and the `@` menu were unchanged in this round (rendered in IR-001).

## Downstream Coverage Hints / Suggested Scenarios

- Admission failure end to end: a Team or Org run whose root model is unavailable for a collaborator's placement →
  `COLLABORATOR_ADD_FAILED` with `collaborator_name`, nothing written, draft kept (all three transports).
- DI-001 on a live Team collaborator: coordinator's authored handoff → teammate's own instance (Team, Org, Agent roots).
- Stop → reopen → send to a collaborator Agent and to a collaborator Team member (restore mode, same run IDs) in each root.
- `delegate_task` to a collaborator address: extra copy with the system task notice and its own run IDs; teammate copy
  hosted by the collaborator TeamRun.
- RD-004 replay: reopen a run after a delivery → "From <Sender>:" with the sender's spaced name; an old run stays user-style.
- Org run journeys (VIS-008–010) live.

## API / E2E / Executable Coverage Investigation And Execution Still Required

Yes — owned by `api_e2e_engineer` after code review: the scenarios above, AGY/ACP sender recording and collaborator
messaging, and updating the SR-007 collaborator probes in the worktree to the SR-010 behaviour.
