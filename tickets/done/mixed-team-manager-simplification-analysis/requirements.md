# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Design-ready and user-approved for architecture review on 2026-06-06. User reviewed the design and approved sending it to architecture reviewer.

## Goal / Problem Statement

Analyze and design the simplification of server-owned team execution so the active server team spine becomes:

```text
TeamRun
  -> MixedTeamManager
      -> AgentRun(runtimeKind per member)
```

The retained manager name is intentionally `MixedTeamManager`, per user direction. The design goal is not a rename to `UnifiedTeamManager`; it is a clean-cut architecture where mixed is the general team manager because per-member runtime selection naturally includes homogeneous and heterogeneous teams.

## Current Design Basis Superseding Initial Draft Notes

Later investigation supersedes the initial caution about native AutoByteus task-plan preservation:

- The old native team task-plan subsystem has already been removed from `autobyteus-ts`; server-owned task delegation is now the authoritative team-task workflow.
- CLI/TUI removal has already landed in latest `origin/personal` and must remain a non-regression invariant.
- `MixedTeamManager` does not call Codex/Claude/AutoByteus team managers to create members. It creates member runs through `AgentRunManager`, which dispatches by per-member `runtimeKind`.
- Therefore all active server team runs, including all-AutoByteus teams, can be routed through `MixedTeamManager`.
- The remaining AutoByteus gap is prompt/context parity: mixed AutoByteus members currently get a simple native team manifest bridge, while Codex/Claude use richer server `MemberRunInstructionComposer` output. The design must refactor AutoByteus member prompt construction to use server `MemberTeamContext` semantics.
- Full deletion of the exported native `autobyteus-ts/src/agent-team` package surface is not required for the server mixed-only cutover, but the server and AutoByteus standalone member path should stop depending on native `AgentTeam` execution semantics.

## Investigation Findings

- Current backend selection is not mixed-only:
  - `TeamDefinitionTopologyPlanner.buildPlan(...)` selects `TeamBackendKind.MIXED` for nested teams and non-nested multi-runtime teams.
  - Non-nested single-runtime teams select `AUTOBYTEUS`, `CODEX_APP_SERVER`, or `CLAUDE_AGENT_SDK` through `resolveSingleRuntimeTeamBackendKind(...)`.
- `MixedTeamRunBackendFactory` and `MixedTeamManager` are structurally capable of same-runtime teams because each `MixedAgentMemberContext` carries its own `runtimeKind`, and `MixedAgentMemberHandle` creates/restores member `AgentRun`s through `AgentRunManager` using that per-member runtime.
- `CodexTeamManager` and `ClaudeTeamManager` are mostly duplicated single-runtime standalone-agent orchestration managers. Their responsibilities overlap strongly with `MixedAgentMemberHandle` / `MixedTeamManager`: lazy member `AgentRun` creation, restore by platform id, status overlays, event bridging, inter-agent message delivery, tool approval, interrupt, and termination.
- The native AutoByteus team path is not behaviorally equivalent to the mixed standalone-member path:
  - `AutoByteusTeamRunBackendFactory` creates a native `autobyteus-ts` `AgentTeam` runtime.
  - Documentation records that this preserves task-plan-aware native team behavior.
  - Mixed AutoByteus standalone members explicitly strip `ToolCategory.TASK_MANAGEMENT` tools and are documented as communication-only for mixed-team v1.
- Backend kind is not accepted from the GraphQL `createAgentTeamRun` input and is not stored in `TeamRunMetadata`; it is internally selected/restored from topology and member runtime kinds. This lowers external contract risk for Codex/Claude manager removal, but restore code currently re-selects specialized Codex/Claude backends for single-runtime historical metadata.
- Targeted test execution was attempted but the new dedicated worktree has no package `node_modules/.bin/vitest`; no implementation validation was run in this analysis pass.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Refactor / Cleanup / Architecture simplification.
- Design issue signal (`Yes`/`No`/`Unclear`): Yes.
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Duplicated Policy Or Coordination; Boundary Or Ownership Issue; Legacy Or Compatibility Pressure; Shared Structure Looseness in AutoByteus team prompt/context primitives.
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Needed now.
- Evidence basis:
  - `AgentTeamRunManager` currently owns four team backend factories and dispatches by `TeamBackendKind`, even though `MixedTeamManager` can model homogeneous and heterogeneous runtime compositions.
  - `TeamDefinitionTopologyPlanner` and restore support still choose specialized team backends for homogeneous runtime teams.
  - `MixedAgentMemberHandle` already delegates each agent member to `AgentRunManager`, which owns runtime-specific agent backend selection.
  - `CodexTeamManager` and `ClaudeTeamManager` duplicate member-run orchestration that mixed already owns.
  - Native task-plan behavior no longer justifies preserving native AutoByteus server team execution.
  - AutoByteus mixed member prompt construction needs a bounded refactor so AutoByteus consumes the same server `MemberTeamContext` semantics as Codex/Claude.
- Requirement or scope impact:
  - The clean target is one active server team manager: `MixedTeamManager`.
  - Runtime-specific behavior remains at `AgentRunManager` / per-runtime agent-run backends.
  - No specialized server team manager wrappers should remain after cutover.
  - Native `autobyteus-ts/src/agent-team` package deletion is separable from server mixed-only execution, but active server execution must not depend on native `AgentTeam` bootstrap/state/team manager.

## Recommendations

1. Make `MixedTeamManager` the sole active server team manager for all team compositions: all-AutoByteus, all-Codex, all-Claude, heterogeneous, and nested/subteam.
2. Keep the name `MixedTeamManager`; document that it is the general manager because per-member runtime selection includes homogeneous teams.
3. Move runtime-specific member behavior to the existing `AgentRunManager` boundary and per-runtime agent-run backends; do not preserve runtime-specific team managers as wrappers.
4. Refactor AutoByteus mixed-member prompt construction so it uses server `MemberTeamContext` / `MemberRunInstructionComposer` semantics and no longer relies only on native `TeamManifestInjectorProcessor`.
5. Remove specialized server team backend families after mixed-only parity is covered by tests.
6. Keep CLI/TUI deletion as a non-regression invariant; do not add replacement CLI/TUI adapters.
7. Treat full native `autobyteus-ts/src/agent-team` package/API decommission as an explicit optional expansion/follow-up unless the implementation owner accepts the broader package-surface cleanup.

## Scope Classification (`Small`/`Medium`/`Large`)

Large. The design touches team-run selection, restore, active run manager dependencies, specialized backend deletion, AutoByteus member prompt parity, tests, and documentation.

## In-Scope Use Cases

- UC-001: Any all-AutoByteus team run executes through `TeamRun -> MixedTeamManager -> AgentRun(runtimeKind=AUTOBYTEUS)` and receives team context/prompt parity.
- UC-002: Any all-Codex team run executes through `TeamRun -> MixedTeamManager -> AgentRun(runtimeKind=CODEX_APP_SERVER)`.
- UC-003: Any all-Claude team run executes through `TeamRun -> MixedTeamManager -> AgentRun(runtimeKind=CLAUDE_AGENT_SDK)`.
- UC-004: Heterogeneous and nested/subteam team runs continue to execute through mixed without regression.
- UC-005: Historical run metadata that previously would restore to specialized homogeneous team backends restores to `MixedTeamRunContext` and preserves member platform run ids.
- UC-006: AutoByteus mixed members can use `send_message_to` and server task-delegation tools through server-built team context.
- UC-007: Legacy CLI/TUI, old native task-plan behavior, and specialized team manager wrappers remain absent from active execution.

## Out of Scope

- Renaming `MixedTeamManager` to `UnifiedTeamManager` or any other name.
- Reintroducing native task-plan tools or native team task ledger behavior.
- Reintroducing CLI/TUI surfaces.
- Changing standalone single-agent runtime behavior outside the team-member context path.
- Deleting the entire exported native `autobyteus-ts/src/agent-team` package/API surface. User confirmed this should remain a follow-up cleanup, not part of this ticket.

## Functional Requirements

- REQ-001: All active server team creation paths must produce `TeamBackendKind.MIXED` and execute through `MixedTeamManager`, regardless of whether leaf members are homogeneous, heterogeneous, or nested.
- REQ-002: Per-member runtime selection must remain on `TeamRunMemberConfig.runtimeKind` / `AgentRunConfig.runtimeKind`, and runtime-specific creation must happen through `AgentRunManager`.
- REQ-003: `AgentTeamRunManager` must depend on one team backend factory, `MixedTeamRunBackendFactory`; it must not dispatch to AutoByteus/Codex/Claude team backend factories.
- REQ-004: Restore logic must normalize historical and current team metadata to `TeamBackendKind.MIXED` / `MixedTeamRunContext` while preserving member route keys, member run ids, platform agent run ids, task-agent identity, and nested subteam structure.
- REQ-005: Specialized server team backend families for AutoByteus, Codex, and Claude must be deleted or decommissioned after the mixed-only path covers their active responsibilities.
- REQ-006: `MixedTeamManager` and `MixedTeamMemberRegistry` must continue to support communication, tool approval, interrupt, settle, termination, status projection, file-change projection where applicable, and task-agent lifecycle for every supported member runtime.
- REQ-007: AutoByteus mixed members must receive team prompt/context parity using server `MemberTeamContext` and `MemberRunInstructionComposer` semantics; active prompt construction must not depend on native `autobyteus-ts` `AgentTeamContext`, native team state, or native team manager.
- REQ-008: AutoByteus `send_message_to` and task-delegation tools must continue to receive native-compatible team context data through `AgentConfig.initialCustomData.teamContext` and route delivery through server mixed communication.
- REQ-009: Legacy native task-plan behavior, legacy task-plan tool vocabulary, CLI/TUI code, and specialized team-manager wrappers must not be preserved as compatibility paths.
- REQ-010: Documentation and tests must describe `MixedTeamManager` as the single active server team manager while preserving the name `MixedTeamManager`.

## Acceptance Criteria

- AC-001: Launching all-AutoByteus, all-Codex, all-Claude, heterogeneous, and nested teams creates/restores `TeamRun` instances with `teamBackendKind === TeamBackendKind.MIXED`.
- AC-002: For each supported runtime, a member run is created/restored through `AgentRunManager` using that member's configured runtime kind; specialized team managers are not instantiated.
- AC-003: Historical single-runtime team metadata restores to `MixedTeamRunContext` and preserves platform run ids for native agent ids, Codex thread ids, and Claude session ids.
- AC-004: AutoByteus mixed member processed prompts include team instruction, agent instruction/base prompt, current member identity, allowed recipient roster, and task-delegation instructions when task-delegation tools are exposed.
- AC-005: When an AutoByteus member's team member name differs from `AgentDefinition.name`, the prompt does not list the current member as an available teammate.
- AC-006: AutoByteus `send_message_to` in mixed execution delivers through server mixed inter-agent delivery and rejects invalid recipients using the server-built roster.
- AC-007: Server task-delegation lifecycle works through mixed-only teams for all supported runtimes: delegate, activate task-agent instance, report completion/failure, notify original delegator/coordinator fallback, accept completed task, and settle task-agent instance.
- AC-008: Source no longer contains active server factory dispatch branches or imports for `AutoByteusTeamRunBackendFactory`, `CodexTeamRunBackendFactory`, or `ClaudeTeamRunBackendFactory`.
- AC-009: CLI/TUI files, exports, and dependencies remain absent; no implementation reintroduces them.
- AC-010: Docs no longer state that homogeneous teams use specialized team managers; they state that `MixedTeamManager` is retained by name and governs all server team runs.

## Constraints / Dependencies

- Work must be done in the dedicated task worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-manager-simplification-analysis` on branch `codex/mixed-team-manager-simplification-analysis`.
- Base branch is latest `origin/personal`; this ticket branch was rebased to `74c0fd5905c85a4f52b7fecec16bf4c644a745de`.
- Primary affected package is `autobyteus-server-ts`; bounded AutoByteus prompt/context refactor touches `autobyteus-ts` only if native communication primitives are moved out of `agent-team`.
- The dedicated worktree currently has only untracked ticket artifacts; downstream implementation must install/use package dependencies before running test suites.

## Assumptions

- `MixedTeamManager` name stays unchanged.
- Old native task-plan behavior is not a product requirement; server task delegation is authoritative.
- Full removal of exported native `autobyteus-ts/src/agent-team` package/API is a follow-up, not required to make server execution mixed-only. User confirmed it is out of scope for this ticket.

## Risks / Open Questions

- Full native `autobyteus-ts/src/agent-team` package deletion is out of scope for this ticket by user decision; design keeps it separate from server mixed-only execution.
- AutoByteus prompt parity must avoid duplicating both server roster and old `TeamManifestInjectorProcessor` manifest. Server-managed AutoByteus team prompts use explicit sections, not `{{team}}` placeholder replacement, per user decision.
- File-change projection currently attaches only for `TeamBackendKind.AUTOBYTEUS`; mixed-only execution must reattach file-change observation based on member/runtime capability instead of team backend kind.
- Some tests still assert specialized backend behavior and must be rewritten around mixed-only invariants, not kept as compatibility assertions.

## Requirement-To-Use-Case Coverage

- UC-001: REQ-001, REQ-002, REQ-004, REQ-006, REQ-007, REQ-008
- UC-002: REQ-001, REQ-002, REQ-004, REQ-006
- UC-003: REQ-001, REQ-002, REQ-004, REQ-006
- UC-004: REQ-001, REQ-002, REQ-004, REQ-006
- UC-005: REQ-004
- UC-006: REQ-007, REQ-008
- UC-007: REQ-005, REQ-009, REQ-010

## Acceptance-Criteria-To-Scenario Intent

- AC-001 verifies universal mixed-only launch/restore.
- AC-002 verifies the authoritative runtime boundary is `AgentRunManager`, not specialized team managers.
- AC-003 verifies historical metadata compatibility without preserving old backend dispatch.
- AC-004 and AC-005 verify AutoByteus prompt parity and self-exclusion correctness.
- AC-006 verifies AutoByteus communication bridge behavior.
- AC-007 verifies server task delegation remains the team-task workflow.
- AC-008 verifies source-level removal of specialized server team manager dispatch.
- AC-009 verifies CLI/TUI removal non-regression.
- AC-010 verifies documentation reflects the simplified architecture.

## Post-Rebase Requirement Refinement: Native AutoByteus Is Now Migratable Through Mixed (2026-06-06)

After rebasing the ticket branch onto latest `origin/personal` (`c4a7c61394bda6789809473c4e170ce96b2c79ed`), the native AutoByteus caveat changed materially.

Current code no longer contains the earlier native `TaskPlan`/`taskPlan` implementation in the inspected server/native team paths. Instead, task work is now represented by server-owned task delegation under `autobyteus-server-ts/src/agent-team-execution/task-delegation/*` and `autobyteus-server-ts/src/agent-tools/task-delegation/*`.

Updated conclusions:

- `TeamRun` already owns the runtime-neutral command boundary needed by task delegation, including `startTaskAgentInstance(...)` and `settleTaskAgentInstance(...)`.
- `MixedTeamManager` already implements task-agent lifecycle through `MixedTeamMemberRegistry` and `MixedAgentMemberHandle`.
- Mixed AutoByteus standalone members now receive server-built team context with team/member/task-agent identity and may expose server task-delegation tools.
- Native pure AutoByteus teams currently skip task-delegation tools and return unsupported for task-agent start/settlement, so they are no longer a stronger task path than mixed; they are the legacy parallel team runtime.

This supersedes the earlier first-pass recommendation to retain native AutoByteus team execution for task-plan preservation. The target can now be scoped more aggressively: route all server team runs through `TeamRun -> MixedTeamManager -> AgentRun(runtimeKind per member)`.

### Revised In-Scope Use Cases

- UC-001: Non-nested all-Codex team runs execute through `MixedTeamManager` with all members using `RuntimeKind.CODEX_APP_SERVER`.
- UC-002: Non-nested all-Claude team runs execute through `MixedTeamManager` with all members using `RuntimeKind.CLAUDE_AGENT_SDK`.
- UC-003: Non-nested all-AutoByteus team runs execute through `MixedTeamManager` with all members using `RuntimeKind.AUTOBYTEUS`.
- UC-004: Existing heterogeneous and nested team runs continue to execute through `MixedTeamManager`.
- UC-005: Historical team metadata restores into `MixedTeamRunContext` for all runtime compositions.
- UC-006: Server-owned task delegation remains available through `TeamRun` and mixed member/task-agent handling for supported member runtimes.

### Revised Functional Requirements

- REQ-020: The active server team execution path must route every launchable team topology and runtime composition to `TeamBackendKind.MIXED` / `MixedTeamManager`.
- REQ-021: `TeamDefinitionTopologyPlanner.buildPlan(...)` must stop selecting team backend kind from member runtime homogeneity; topology and member runtime kinds must only shape `TeamRunConfig.memberTree` and member `AgentRunConfig`s.
- REQ-022: Team restore inference must construct `MixedTeamRunContext` for all historical metadata, including all-AutoByteus, all-Codex, all-Claude, heterogeneous, and nested teams.
- REQ-023: `AgentTeamRunManager` must not retain active create/restore dispatch to AutoByteus/Codex/Claude team backend factories after the mixed-only cutover.
- REQ-024: AutoByteus members running under `MixedTeamManager` must keep team communication, team manifest injection, memory layout, workspace binding, file-change projection, tool approval, interrupt, and task-agent identity behavior at parity with the server-owned member-run model.
- REQ-025: Server task delegation must remain runtime-neutral at `TeamRun` boundary and must not depend on native `autobyteus-ts` `AgentTeam` internals.
- REQ-026: Legacy local native task-plan tools that require native `teamContext.state` must remain filtered out or be removed/migrated; they must not be reintroduced as a reason to preserve native `AgentTeam` execution.
- REQ-027: Native `AutoByteusTeamRunBackend`, native team backend factory/context/event/status adapter code, Codex team backend code, and Claude team backend code must be removed from active server execution after parity validation. No compatibility wrappers should remain as steady state.
- REQ-028: Deleting the exported `autobyteus-ts/src/agent-team` package surface is a separate cleanup step unless the implementation also migrates CLI/examples/docs/tests and moves still-used utilities such as team-local definition-id helpers.

### Revised Acceptance Criteria

- AC-013: Creating an all-AutoByteus team through GraphQL produces a `TeamRun` whose backend kind is `MIXED`, whose members are `RuntimeKind.AUTOBYTEUS`, and whose member runs are created through `AgentRunManager` rather than native `defaultAgentTeamFactory`.
- AC-014: Creating all-Codex, all-Claude, heterogeneous, and nested teams all produces `TeamRun -> MixedTeamManager` execution without specialized team-manager fallback.
- AC-015: Restoring historical all-AutoByteus, all-Codex, all-Claude, heterogeneous, and nested metadata constructs `MixedTeamRunContext` and restores member platform run IDs where available.
- AC-016: AutoByteus mixed members can send/receive teammate messages through the server team communication context and preserve member route/run identity in emitted team events.
- AC-017: Server task-delegation lifecycle works through mixed-only teams: delegate, activate task-agent instance, report completion/failure, notify delegator/coordinator fallback, accept completed task, and settle task-agent instance.
- AC-018: Native pure-team unsupported-task-agent behavior is gone from the active server team path; no active server launch/restore creates an `autobyteus-ts` native `AgentTeam`.
- AC-019: Source and tests no longer contain active server factory dispatch branches for `AutoByteusTeamRunBackendFactory`, `CodexTeamRunBackendFactory`, or `ClaudeTeamRunBackendFactory` after the mixed-only cutover.
- AC-020: Documentation explains that `MixedTeamManager` is retained by name and is the general team manager because per-member runtime selection includes homogeneous teams.

### Revised Scope / Risk Classification

- Scope classification: Large if the first implementation removes all specialized server team backends including native AutoByteus; Medium if the cutover is implemented behind tests first and package-level `autobyteus-ts/src/agent-team` deletion is deferred.
- Key risk: deleting the entire native `autobyteus-ts` agent-team package surface too early breaks CLI, examples, docs, native tests, and utility imports. Server execution can stop using native `AgentTeam` before package API deletion.
- Key mitigation: split removal into two explicit layers:
  1. **Server execution cutover**: all `TeamRun` create/restore paths use `MixedTeamManager`.
  2. **Native package cleanup**: remove or replace `autobyteus-ts/src/agent-team` exports/CLI/examples/tests after no server execution path depends on them.

## Updated Approval Status

Approved by the user for architecture-reviewer handoff on 2026-06-06 after user design review.

## User-Confirmed Task-Plan Removal Clarification (2026-06-06)

The latest targeted reinvestigation confirms the user's correction: `autobyteus-ts` no longer contains the old native team task-plan subsystem in active source. Documentation explicitly records the removal, tests assert the legacy model-facing task tools are absent, and `src/task-management` now contains only personal per-agent ToDo tools.

This removes the earlier task-plan caveat completely for the server simplification. Native `AgentTeam` must not be retained as an active server team backend for removed task-plan behavior.

Additional requirements:

- REQ-029: The mixed-only server team-run cutover must not preserve native `autobyteus-ts` `AgentTeam` server execution for old task-plan behavior; the old native task-plan subsystem is out of scope because it has already been removed.
- REQ-030: Legacy team task-plan tool names (`assign_task_to`, `create_task`, `create_tasks`, `get_my_tasks`, `get_task_plan_status`, and old team-task `update_task_status`) must remain absent from default native local tools and filtered from mixed AutoByteus member exposure unless an explicit future product decision introduces different server-owned tools.
- REQ-031: Personal ToDo tools (`create_todo_list`, `add_todo`, `get_todo_list`, `update_todo_status`) must be treated as per-agent local checklist tools, not as team orchestration or team task-ledger behavior.
- REQ-032: The remaining native AutoByteus analysis must focus on non-task-plan parity: lifecycle, member routing, communication, event streaming/projection, CLI/package API impact, memory/workspace/file-change behavior, approval/interrupt behavior, and server task-delegation identity/settlement through `TeamRun`.

Additional acceptance criteria:

- AC-021: Source inspection or tests verify that no active server create/restore path uses native `autobyteus-ts` `AgentTeam` to provide removed task-plan behavior.
- AC-022: Existing legacy-tool removal guarantees remain valid after the mixed-only cutover: old task-plan tool names are not registered by native default tools and are not exposed to mixed AutoByteus members as local task-plan tools.
- AC-023: Documentation for the simplification states that server-owned task delegation is the authoritative team-task workflow, while native personal ToDo remains local per-agent state.

## Current Recommendation After Reinvestigation

Proceed toward a single active server team manager:

```text
TeamRun
  -> MixedTeamManager
      -> AgentRun(runtimeKind per member)
```

This includes all-AutoByteus teams. The task-plan removal means the native AutoByteus team backend is no longer needed for task-plan preservation. The practical migration risk is now package/API and runtime-behavior parity, not task-plan migration.

## Legacy-Test Cleanup Clarification (2026-06-06)

User clarified that tests dedicated only to proving removed task-plan tools are absent are themselves redundant legacy surface. The clean target should not keep old task-plan vocabulary alive through permanent tests, runtime instructions, docs, or guard lists unless a current non-legacy invariant requires it.

Additional requirements:

- REQ-033: Remove or rewrite `autobyteus-ts/tests/unit/task-management/tools/task-tools/legacy-task-tools-removed.test.ts`; steady-state validation should assert current behavior positively rather than preserve removed task-plan tool names as a permanent negative fixture.
- REQ-034: Active source, tests, docs, examples, and runtime instructions should not retain old task-plan tool names as steady-state guidance. Rewrite them around current personal ToDo tools and server task-delegation tools.
- REQ-035: Server-side legacy tool-name filters, including `LEGACY_LOCAL_TASK_TOOL_NAMES`, must be removed if active registries can no longer produce those tools. If any temporary guard is still needed for externally configured/custom tools, it must be explicitly marked transitional with a deletion condition.

Additional acceptance criteria:

- AC-024: The legacy-removal unit test is deleted or replaced by positive current-tool coverage that does not depend on old task-plan tool names.
- AC-025: Generic parser/streaming tests no longer use removed task-plan tool names as example tool names.
- AC-026: Runtime instructions and active docs describe the current task workflow without preserving removed task-plan vocabulary, except for any explicitly documented transitional guard with a planned removal condition.

## CLI Removal Scope Clarification (2026-06-06)

User clarified that the `autobyteus-ts` CLI is unused and should be removed completely. It should not be migrated, preserved, or used as a compatibility reason to keep native agent-team runtime code.

Additional requirements:

- REQ-036: Remove the complete `autobyteus-ts` CLI package surface, including `src/cli/**`, single-agent CLI exports, native agent-team TUI exports, and root package CLI re-exports.
- REQ-037: Remove CLI-specific tests under `autobyteus-ts/tests/unit/cli/**`; do not retain orphan tests for deleted CLI renderers/state stores/displays.
- REQ-038: Remove CLI-only dependencies such as `ink`, `react`, and `@types/react` after verifying no non-CLI code imports them.
- REQ-039: CLI compatibility must not block deletion of native `autobyteus-ts/src/agent-team` runtime/export surface. If native agent-team code remains temporarily, it must be for non-CLI, explicitly current reasons only.
- REQ-040: Do not introduce a replacement CLI or mixed-manager CLI adapter in this simplification; current product direction is server/UI/API execution, not command-line operation.

Additional acceptance criteria:

- AC-027: `autobyteus-ts/src/index.ts` no longer exports `./cli/index.js` or `./cli/agent-team/widgets/index.js`.
- AC-028: `autobyteus-ts/src/cli/**` and `autobyteus-ts/tests/unit/cli/**` are deleted.
- AC-029: Package dependency audit shows no remaining non-CLI usage of `ink`, `react`, or `@types/react`; those dependencies are removed if unused.
- AC-030: No active documentation or examples instruct users to launch or import the removed CLI.

## TUI Removal Clarification (2026-06-06)

The CLI removal scope explicitly includes all terminal UI code. The TUI must be deleted, not migrated to `MixedTeamManager`.

Additional requirement:

- REQ-041: Remove all TUI-specific code, especially `autobyteus-ts/src/cli/agent-team/**` Ink/React app, widgets, state store, renderables, and associated tests. No replacement TUI should be introduced in this simplification.

Additional acceptance criterion:

- AC-031: No active source or tests import `ink`/`react` for terminal UI rendering after cleanup; all `autobyteus-ts` agent-team TUI files and tests are gone.

## Latest Base Status After Rebase (2026-06-06)

The ticket branch was rebased onto latest `origin/personal` at `74c0fd5905c85a4f52b7fecec16bf4c644a745de`. The CLI/TUI removal scope has already been implemented upstream in the base branch:

- `autobyteus-ts/src/cli/**` is absent.
- `autobyteus-ts/src/index.ts` no longer exports CLI/TUI modules.
- `ink`, `react`, and `@types/react` are no longer package dependencies.
- `autobyteus-ts/tests/integration/public-surface/cli-tui-removal.test.ts` protects the removed public surface.
- `autobyteus-ts/docs/nodejs_architecture.md` documents that native CLI/TUI must not be reintroduced without a new design.

Requirement status update:

- REQ-036 through REQ-041 and AC-027 through AC-031 are now satisfied by latest base code and should be treated as non-regression requirements for this ticket.
- No implementation work should reintroduce `src/cli/**`, CLI/TUI exports, Ink widgets, or CLI/TUI compatibility wrappers.
- The remaining implementation scope is the server team-manager simplification: route all active team runs through `TeamRun -> MixedTeamManager -> AgentRun(runtimeKind per member)` and remove obsolete specialized team backend families after parity validation.

## AutoByteus Mixed Member Prompt-Construction Clarification (2026-06-06)

Current investigation confirms that mixed AutoByteus members already receive a server-built `MemberTeamContext` and a native-compatible `initialCustomData.teamContext`, and that native `send_message_to` can dispatch through the mixed server delivery bridge. But prompt construction currently only injects the native `TeamManifestInjectorProcessor`; unlike Codex and Claude, AutoByteus does not yet consume `MemberRunInstructionComposer` output.

Additional requirements:

- REQ-042: When an `AUTOBYTEUS` member runs inside `MixedTeamManager`, its prompt construction must be driven by the server `MemberTeamContext`; it must not depend on native `autobyteus-ts` `AgentTeamContext`, native team state, or a native team manager.
- REQ-043: AutoByteus mixed members must receive prompt parity with other mixed runtimes for current team semantics: team instruction, agent instruction/base prompt, current member identity, valid communication recipient guidance, roster visibility, and task-delegation protocol when task-delegation tools are exposed.
- REQ-044: AutoByteus team manifest rendering must identify and exclude the current member by `MemberTeamContext.memberName` / member route identity rather than assuming `AgentDefinition.name === team member name`.
- REQ-045: The mixed-only cutover must include executable or source-level validation that AutoByteus all-native teams still receive team prompt/context data through `MixedTeamManager -> AgentRunManager -> AutoByteusAgentRunBackendFactory`, not through native `AgentTeam` bootstrap.

Additional acceptance criteria:

- AC-032: A mixed-only all-AutoByteus team member's processed prompt includes the team definition instruction, the agent/member instruction content, the current team member identity, and a teammate roster with allowed recipient names.
- AC-033: If an AutoByteus member's team member name differs from its `AgentDefinition.name`, the generated prompt does not list the current member as an available teammate and still lists the other valid recipients.
- AC-034: AutoByteus `send_message_to` in mixed execution uses `initialCustomData.teamContext.communicationContext` to deliver through server mixed inter-agent delivery and rejects invalid recipient names using the server-built roster.
- AC-035: AutoByteus mixed prompt construction does not instantiate or restore native `autobyteus-ts` `AgentTeam` or native team manager objects.
