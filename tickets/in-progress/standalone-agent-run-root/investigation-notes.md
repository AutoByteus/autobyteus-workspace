# Investigation Notes — standalone-agent-run-root

## Bootstrap
- **Package:** `standalone-agent-run-root`.
- **Worktree:** `/Users/normy/autobyteus_org/autobyteus-worktrees/standalone-agent-run-root`, branch
  `codex/standalone-agent-run-root`.
- **Base:** `origin/personal` @ `2d3b66005` (fetched 2026-10-02). Includes the finalized `agent-initiated-collaborators`
  (merged and archived in `tickets/done/`) and `cross-scope-agent-mentions`. Finalization target: `personal`.
- **Origin:** code reviewer request on 2026-10-02, stated as user-agreed scope and naming. The user directed: "continue
  please with the improvement". Intake record: `/Users/normy/autobyteus_org/solution-designer-reports/standalone-agent-run-root-intake.md`.

## Evidence (base `2d3b66005`)
- **E-01, Agent-root holder shape (D-2).**
  - `agent-execution/services/standalone-agent-run-collaboration-binding.ts` defines the standalone lifecycle's port to
    the Agent root (`buildHostMemberExecutionContext`, `onHostPublished`, `terminateRoot`).
  - It is implemented by `agent-run-collaboration/services/agent-run-collaboration-root-manager.ts` (259 lines) and bound
    through `StandaloneAgentRunLifecycleService.bindCollaboration`.
  - The host AgentRun is owned by the standalone lifecycle and `AgentRunManager`. `AgentRunCollaborationRoot` (502 lines)
    only references it.
  - Costs recorded in the predecessors: the host-wake path (`resolveCommandReadyRoot`, DS-009), crash vs. Stop
    asymmetry, and history delete/archive having to end a lingering root (cross-scope CR-001/CR-002).
  - Eligibility: `isCollaborationEligibleStandaloneRun` (not a server helper, not application-owned).
  - Persisted data: `memory/agents/<id>/collaboration/` plus the catalog `hasCollaboration` flag.
- **E-02, Team-root collaborator agents (D-1).** `FlatTeamExecutionManager.prepareCollaboratorAgent` pushes into
  `runtimeContext.memberContexts` and calls `FlatTeamMemberConfigResolver.addCollaborator`, structures otherwise used
  for configured members. Collaborator teams already have `CollaboratorTeamExecutionRegistry`.
- **E-03, file sizes.** `agent-org-run.ts` 509, `agent-run-collaboration-root.ts` 502, `root-team-run.ts` 485 lines.
- **E-04, self-delegation (C-11).** The Team and Org roots reject delegating to one's own placement
  (`COLLABORATION_SELF_TARGET_REJECTED`). The Agent root does not.
- **E-05, sender address in deliveries.**
  - `root-communication-runtime-builder.ts:20`: the model sees `sender name: <basename>, sender id: <runId>`.
  - `sender_member_address` is in metadata only, so a reply by address to a sender inside a team (for example
    `/eng/lead` shown as "lead") fails.
  - Task copies already see the full delegator address in the work packet.
- **E-06, token usage.** `docs/modules/token_usage.md`: Team summaries sum records by `root_team_run_id`. Agent-root
  collaborators and copies carry no root attribution, so the standalone host's usage excludes them (deferred in the
  predecessor).
- **E-07, "earlier events" page.** `autobyteus-web/docs/chat.md:262` documents that the Event Monitor's active-trace
  "earlier events" page still renders inter-agent deliveries user-style (an RD-004 gap).
- **E-08, host label.** A collaborator's Team tab shows the host as "research assistant" (raw basename); VIS-013 shows
  "Research Assistant" (predecessor R-1).
- **E-09, tests.**
  - `tests/architecture/application-framework-boundaries.test.ts` ("SR-011 host definition" guard) flags
    `AgentDefinitionService.getInstance()` / `AgentTeamDefinitionService.getInstance()` in
    `agent-collaboration/collaborators/collaborator-definition-catalog.ts`.
  - `tests/unit/agent-team-execution/team-run-model-selection-save.test.ts`: 11 failures (`NOT_FOUND`), reported also on
    a clean base. Cause not yet known.
- **E-10, malformed standalone package (C-14).** One malformed `collaboration_tree.json` makes `prepareAgentRun` fail for
  new standalone runs, because the location service reads packages strictly during run-ID uniqueness checks.
  - Producers of a malformed file: writes are atomic (`atomic-run-package-file-commit-writer`), the format is new with
    no released predecessor, and readers are tolerant.
  - Only manual edits or unreleased developer data produce one. Principle 6 classification:
    `Technically Possible but Unsupported/Contrived`.

## Architecture investigation (SR-003)
- **E-11, callers of the Agent-root manager** (all must be rewired): `api/websocket/index.ts:30-31`,
  `api/graphql/types/agent-run-collaboration.ts:47`, `api/graphql/services/collaborator-root-port-resolver.ts:46`,
  `api/rest/agent-collaboration-references.ts:18`, `agent-execution/runtime/general-process-run-supervisor.ts`
  (`bindCollaboration`, `stopAll`, process instance), `agent-execution/services/agent-run-command-coordinator.ts:130`,
  `run-history/services/standalone-run-liveness.ts:38` (`endRegisteredRoot`).
- **E-12, lifecycle coupling.** `standalone-agent-run-lifecycle-service.ts:46,74-81` (binding), `:362` (`onHostPublished`
  after publish), `:422` (`buildHostMemberExecutionContext` pulled in `buildConfig`).
- **E-13, token API.** `getAgentRunTokenUsageSummary(runId)` is exact-run (`TokenUsageRunStore.getAgentRunSummary`).
  Team runs use `getTeamRunSummary` by `root_team_run_id`.
- **E-14, display names.** `autobyteus-web/utils/collaboration/memberDisplayName.ts` (lowercase rows) and
  `memberTitleName` (title case for "From"). Agent-root contexts use `nameAt = memberDisplayName` for every address,
  including the host.

## Supplement Inventory
| Supplement | Purpose | Status |
| --- | --- | --- |
| Predecessor UI/UX spec `/Users/normy/autobyteus_org/autobyteus-web-prototype/tickets/done/cross-scope-agent-mentions-sr008/ui-ux-spec.md` (VIS-001–015) | Normative look for host labels (VIS-013) and inter-agent rendering (RD-004) | Approved (user, predecessor) |
