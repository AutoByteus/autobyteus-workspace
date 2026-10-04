# Investigation Notes — standalone-agent-run-root

## Bootstrap
- **Package:** `standalone-agent-run-root`.
- **Worktree:** `/Users/normy/autobyteus_org/autobyteus-worktrees/standalone-agent-run-root`, branch
  `codex/standalone-agent-run-root`.
- **Base:** `origin/personal` @ `b37d7a934` since SR-005 (2026-10-04 rebase; E-15). Originally `2d3b66005` (fetched
  2026-10-02). Includes the finalized `agent-initiated-collaborators`
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

## Base refresh (SR-005, 2026-10-04)
- **E-15, rebase.** Requested by the user on 2026-10-04 ("update this branch on top of the latest origin personal").
  - Before: branch at `2d3b66005` with 0 commits of its own. In-progress implementation (62 tracked files plus 7 new
    source/test files) and this ticket folder were uncommitted.
  - Safety copies: `/Users/normy/autobyteus_org/solution-designer-reports/standalone-agent-run-root-backup-20261004/`
    (`tracked-changes.patch`, `untracked.tgz`, `status.txt`) and local branch
    `backup/standalone-agent-run-root-pre-rebase-20261004` (@ `366922405`).
  - The work was committed as one checkpoint and rebased onto `origin/personal` @ `b37d7a934` (181 upstream commits).
    The result is `9c3080a20`, 1 ahead and 0 behind. Untracked build outputs `autobyteus-application-backend-sdk/dist/`
    and `autobyteus-application-sdk-contracts/dist/` were left uncommitted.
  - Files changed on both sides: 7. Auto-merged: `collaboration-execution-location-service.ts`,
    `general-process-run-supervisor.ts`, `standalone-collaboration-instruction.ts` (moved path),
    `task-delegation-tool-lifecycle.integration.test.ts`, `agent-stream-handler.test.ts`.
  - Conflicts resolved:
    - `standalone-root-location-service.ts`: took upstream's removal of `containsRunId` (see E-16).
    - `tests/integration/standalone-agent-run-root/native-compaction-root-fixture.ts`: kept upstream's cleanup
      structure (owned-resource `close`, setup-failure cleanup) and applied this branch's API
      (`StandaloneAgentRunRootManager`, `activateHost`/`terminateHost`, `resolveRoot`, `endRoot`).
    - Upstream's new `native-root-fixture-cleanup.integration.test.ts` moved into
      `tests/integration/standalone-agent-run-root/`. Its import and spy now target
      `StandaloneAgentRunRootManager.prototype.endRoot` (was `AgentRunCollaborationRootManager.prototype.terminateRoot`).
  - No references remain to `agent-run-collaboration/`, `AgentRunCollaborationRootManager` or `containsRunId` in server
    `src`/`tests`.
- **E-16, run identity allocation (upstream `b5715ea5b`).** `AgentRunIdentityAllocator` now uses only the definition and a
  new UUID. `containsRunId` was removed from `CollaborationExecutionLocationService`, the Agent-root location service and
  the Team/Org location services. The design never relied on `containsRunId`. Consequence for E-10: run creation no longer
  reads standalone packages for uniqueness, so the E-10 failure mode no longer exists on the base. REQ-010 "no change"
  stands.
- **E-17, standalone instruction (upstream `3baede153`, `8d8d6889c`).** `standalone-collaboration-instruction.ts` gained a
  "Work Requests and Outcomes" section (`WORK_REQUEST_EXECUTION_LLM_INSTRUCTION`). The merge carried it to the moved path
  `agent-execution/prompt/standalone-collaboration-instruction.ts`. The contract now tells agents to "return the result
  or specific blocker to the requesting agent". REQ-005's sender address is what makes that reply addressable for
  senders inside a team. No design change.
- **E-18, General Agent (upstream `8a4177f5b`).** The built-in default chat agent is now named "General Agent". Its
  definition ID is still `autobyteus-daily-assistant`. Eligibility (`isCollaborationEligibleStandaloneRun`) does not depend
  on the ID or name. Terminology only.
- **E-19, documentation and web drift.** The `autobyteus-web/docs/chat.md` "earlier events" limit (E-07) moved from line
  262 to 295 and is unchanged. Upstream web changes to collaboration panels and mention composition
  (`88bd41620`, `006fd6928`, `376b5d5c4`) do not touch the REQ-007/REQ-008 owners
  (`eventMonitorActiveTraceBrowsePresentation.ts`, `services/agentCollaboration/*`, `memberDisplayName.ts`). The token
  usage and run-history projection modules have no upstream changes.
- **E-20, checks after rebase** (`autobyteus-server-ts`, after `pnpm install --frozen-lockfile`; upstream bumped
  `@google/genai`).
  - `pnpm typecheck`: 0 errors other than TS6059. TS6059 ("not under rootDir", from `tsconfig.json` including `tests`)
    comes from repository configuration this branch does not touch.
  - Ticket suites `tests/unit/standalone-agent-run-root`, `tests/integration/standalone-agent-run-root`, plus
    `tests/unit/agent-collaboration`, `tests/unit/agent-execution`, `tests/unit/services/agent-streaming` and
    `task-delegation-tool-lifecycle`: 1457 passed, 26 failed. The same 26 tests fail on a clean `origin/personal`
    @ `b37d7a934` worktree (`agent-run-manager` 16, `agent-run-provisioning-service` 1, `agent-api-status-projectors` 2,
    `autobyteus-status-projector` 1, `codex-tool-log-correlation` 4, `team-execution-view-projector` 2). These are
    base failures, not caused by this branch.
  - REQ-009 suites. On clean base: 14 failures (guard: SR-011 catalog, AFB-001–005 tree, tool-registration readiness;
    model-save: 11). On this branch: 2 failures, both in the guard and both from upstream drift:
    - AFB-004 `MISSING_REQUIRED_INJECTION` for `AgentRunIdentityAllocator.argument[0]`
      (`agentRunManager`, `agentRunMetadataService`, `teamRunExecutionTreeLocationService`, `memoryDir`) at
      `application-platform/execution/application-execution-scope-kernel-builder.ts:146`. The guard still requires
      dependencies that `b5715ea5b` removed.
    - The tool-registration readiness inventory lacks upstream's `registerProjectTaskTools` (`560a51129`).
    - The original E-09 failures (SR-011 catalog guard; 11 model-save failures) pass on the branch. The model-save root
      cause is not yet recorded (there is no implementation handoff yet).
- **E-21, implementation progress at refresh** (from the branch diff; no implementation handoff exists).
  - Present: the module move to `src/standalone-agent-run-root/`; root, manager, host handle and message delivery; the
    binding removed; `standalone-run-ports.ts`; `TeamRootCollaboratorAgentRegistry` (REQ-002); Org delivery extraction
    (REQ-003); the self-target rejection (REQ-004); catalog injection and model-save (REQ-009, original scope).
  - Not yet present: REQ-005 sender address (both builders unchanged); REQ-006 token roll-up service/GraphQL;
    REQ-007 and REQ-008 web changes (no `autobyteus-web` diff); the docs sync.
  - Size: `standalone-agent-run-root.ts` 413 lines and `standalone-agent-run-lifecycle-service.ts` 450 lines, above the
    REQ-003 target of 400.

## Root shutdown fence (SR-006, 2026-10-04)
- **E-22, F-02: a busy Org cannot be stopped on Codex (CRR-005, Design Impact).**
  - Source: code review `code-review-report.md` § "API/E2E Failure-Origin Review (Round 5, F-02)"; evidence
    `api-e2e-evidence/r2-o01-diag-le-o1-codex-4.log`, `r2-o01-le-o1-codex-3.log`, `r2-o01-base-le-o1-codex-{1..10}.log`,
    `probes/tmp-o01-diagnostic.diff`. Branch @ `f2c32a2cc`.
  - Frequency: LE-O1 on Codex fails on the branch in 3 of 10 runs and on the base in 0 of 12. The suite is unchanged.
  - Mechanism (code read on the branch; the files are identical to base `b37d7a934`):
    - `AgentRun.fenceInputAndInterruptForRootShutdown` (`agent-run.ts:257-270`) fences input, calls
      `rootShutdownFence.begin()`, schedules `evaluate()` and returns `rootShutdownFence.result`.
    - `AgentRunRootShutdownFence.evaluate` (`agent-run-root-shutdown-fence.ts:33-47`): if the run is not quiescent but has
      a local active turn, it calls `interrupt()` once. If the result is not accepted and the run is still not quiescent,
      it calls `settle(result)` immediately.
    - `settle` is irreversible for the AgentRun's lifetime (`settled = true`, one completion promise). Every later call
      returns the same failed result.
    - `evaluate()` already re-runs after every dispatched canonical event batch
      (`onCanonicalEventsDispatched → scheduleRootShutdownFenceEvaluation`, `agent-run.ts:290`, `:453-455`). So if the
      fence were still open, the turn-completion dispatch that follows a "no active turn" rejection would settle it as
      accepted.
    - The layer above already retries: `createFrozenRootTerminationScope.fenceAgentRunsForRootShutdown`
      (`frozen-root-termination-scope.ts:18-31`) clears its memo when a result is not accepted, so a later Stop
      re-invokes the handles. The irreversible failure latch in `AgentRunRootShutdownFence` defeats that retry.
    - Runtime rejection texts differ: Codex `RPC error -32600: no active turn to interrupt`; Claude `has no active turn
      '<id>' to interrupt` (`claude-session.ts:261`, `claude-turn-tracker.ts:398`). Both come back as
      `RUNTIME_COMMAND_FAILED`.
  - Shared owner: Team (`root-team-run.ts:409`), Org (`agent-org-run.ts:320`) and standalone
    (`standalone-agent-run-root.ts:348`) roots all go through the same AgentRun fence on every runtime.
  - Unknown: race versus stale local turn state, and which agent is involved. The diagnostic logged only the Org ID.
  - Existing tests: `tests/unit/agent-execution/agent-run.test.ts:779-903` (accepted-fence paths, interrupt of
    approval-wait and pre-turn work), `agent-run-compaction-races.test.ts`, `frozen-root-termination-scope.test.ts`,
    `agent-org-run-termination.test.ts`. None of them asserts that a failed fence stays latched.
  - Scenario: stopping a busy root is a Supported Normal Scenario (SC-03, AC-010). A turn ending inside the interrupt
    round trip is ordinary timing.

## Supplement Inventory
| Supplement | Purpose | Status |
| --- | --- | --- |
| Predecessor UI/UX spec `/Users/normy/autobyteus_org/autobyteus-web-prototype/tickets/done/cross-scope-agent-mentions-sr008/ui-ux-spec.md` (VIS-001–015) | Normative look for host labels (VIS-013) and inter-agent rendering (RD-004) | Approved (user, predecessor) |
