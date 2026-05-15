# Investigation Notes

## Investigation Status

- Bootstrap Status: Complete
- Current Status: Investigation complete; requirements approved by user; design package ready for architecture review
- Investigation Goal: Determine where compression/compaction selects the built-in compression agent runtime/model, why missing configuration errors occur, and where fallback to the triggering agent's effective runtime/model should be owned.
- Scope Classification (`Small`/`Medium`/`Large`): Small-to-medium
- Scope Classification Rationale: The behavior change is localized to compactor runner configuration, but it crosses parent backend factory wiring, resolver tests, server docs/settings copy, and frontend settings summary copy.
- Scope Summary: Fix compactor runtime/model resolution so selected compactor defaults win, but missing required runtime/model fields inherit from the parent run that triggered compaction.
- Primary Questions To Resolve:
  - Where is compression/compaction invoked and which object owns runtime/model selection? Resolved: `ServerCompactionAgentRunner` creates the visible compactor run from `CompactionAgentSettingsResolver` output.
  - How are built-in compression agent definitions represented? Resolved: seeded normal shared agent under `autobyteus-memory-compactor` with `agent-config.json` `defaultLaunchConfig: null`.
  - Does the compression path have access to the triggering agent's effective runtime/model? Resolved: `AutoByteusAgentRunBackendFactory.buildAgentConfig()` has `AgentRunConfig` values when it creates the parent-bound runner, but does not pass them today.
  - What tests already cover compaction/compression and runtime/model fallback? Resolved: resolver, runner, and backend-factory tests exist; they currently assert failure on missing defaults and runner factory input without parent runtime/model.

## Request Context

User states that compression uses a built-in compression agent and currently errors if the user did not configure runtime/model for that agent. User proposes defaulting missing compression-agent runtime/model to the runtime/model of the currently running agent.

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/compression-agent-default-runtime-model`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/compression-agent-default-runtime-model/tickets/done/compression-agent-default-runtime-model`
- Current Branch: `codex/compression-agent-default-runtime-model`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/compression-agent-default-runtime-model`
- Bootstrap Base Branch: `origin/personal`
- Remote Refresh Result: `git fetch --prune origin` completed successfully on 2026-05-15.
- Task Branch: `codex/compression-agent-default-runtime-model`
- Expected Base Branch (if known): `origin/personal`
- Expected Finalization Target (if known): `personal`
- Bootstrap Blockers: None
- Notes For Downstream Agents: Authoritative artifacts for this task are in the task worktree, not the shared superrepo checkout.

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-05-15 | Command | `pwd`, `git rev-parse --show-toplevel`, `git status --short --branch`, `git branch --show-current`, `git remote -v`, `git symbolic-ref refs/remotes/origin/HEAD` | Bootstrap repository context | Repo root is `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo`; current shared checkout was `personal` tracking `origin/personal`; remote default is `origin/personal`. | No |
| 2026-05-15 | Command | `git fetch --prune origin` | Refresh base refs before task worktree creation | Remote refresh succeeded. | No |
| 2026-05-15 | Command | `git branch codex/compression-agent-default-runtime-model origin/personal`; `git worktree add /Users/normy/autobyteus_org/autobyteus-worktrees/compression-agent-default-runtime-model codex/compression-agent-default-runtime-model` | Create dedicated task branch/worktree | Dedicated branch/worktree created at HEAD `bd0db54317173d8997a373a39b3373451874abae`. | No |
| 2026-05-15 | Doc | `/Users/normy/autobyteus_org/autobyteus-agents/agent-teams/software-engineering-team/agents/solution-designer/design-principles.md` | Required shared design reference | Design must keep runtime/model fallback owned by the authoritative boundary and avoid caller-specific duplicated fallback. | No |
| 2026-05-15 | Command | `rg -n "compaction|compact|compress|compression|compression agent|compactor" -S --glob '!node_modules' --glob '!tickets/done/**' --glob '!tmp/**' .` | Locate active compression/compaction code paths | Relevant code is mainly in `autobyteus-server-ts/src/agent-execution/compaction`, `autobyteus-ts/src/memory/compaction`, and docs/tests. | No |
| 2026-05-15 | Code | `autobyteus-server-ts/src/agent-execution/compaction/compaction-agent-settings-resolver.ts:38-69` | Identify current runtime/model resolution owner | Resolver loads the selected compactor definition, reads `definition.defaultLaunchConfig`, then throws if runtime/model is absent. It has no parent fallback input. | Yes: extend resolver API. |
| 2026-05-15 | Code | `autobyteus-server-ts/src/agent-execution/compaction/server-compaction-agent-runner.ts:54-70` | Identify compactor run creation boundary | Runner calls `resolve()`, then creates a normal visible agent run with resolved `runtimeKind` and `llmModelIdentifier`. | Yes: pass fallback context to resolver. |
| 2026-05-15 | Code | `autobyteus-server-ts/src/agent-execution/backends/autobyteus/autobyteus-agent-run-backend-factory.ts:94-99` and `:454-457` | Check parent-bound runner creation | Default runner factory receives only `workspaceRootPath`; build path passes only parent `agentDefinitionId` and workspace, despite having runtime/model options in scope. | Yes: extend factory input. |
| 2026-05-15 | Code | `autobyteus-server-ts/src/built-in-agents/templates/memory-compactor/agent-config.json:1-12` | Confirm built-in compactor launch defaults | Built-in compactor template sets `defaultLaunchConfig: null`, which triggers the current resolver error on fresh default compactor selection. | No |
| 2026-05-15 | Doc | `tickets/done/agent-based-compaction/design-impact-resolution-default-compactor-agent-and-e2e.md` | Understand prior product decision | Prior design intentionally chose `defaultLaunchConfig: null` and explicitly rejected parent fallback. User's new request supersedes this prior behavior decision. | Yes: update durable docs. |
| 2026-05-15 | Doc | `autobyteus-ts/docs/agent_memory_design_nodejs.md:325-330` and `:370-375`; `autobyteus-ts/docs/agent_memory_design.md` | Find durable docs that describe current behavior | Docs say selected compactor config supplies runtime/model/config and missing defaults fail; “there is no active-model fallback.” | Yes: update both docs. |
| 2026-05-15 | Code | `autobyteus-web/components/settings/CompactionConfigCard.vue:111-118`; localization messages in `autobyteus-web/localization/messages/en/settings.ts` and `zh-CN/settings.ts` | Check operator-facing settings summary | UI summarizes missing selected compactor runtime/model as “not configured,” which becomes misleading after fallback. | Yes: update summary/copy/tests. |
| 2026-05-15 | Test | `autobyteus-server-ts/tests/unit/agent-execution/compaction/compaction-agent-settings-resolver.test.ts:50-67` | Check current missing runtime/model tests | Test currently expects missing runtime/model to reject. It should be split into fallback success and no-fallback failure cases. | Yes |
| 2026-05-15 | Test | `autobyteus-server-ts/tests/unit/agent-execution/backends/autobyteus/autobyteus-agent-run-backend-factory.test.ts:327-383` | Check parent runner injection tests | Current test expects runner factory input only includes parent definition id and workspace. It should expect parent effective runtime/model too. | Yes |
| 2026-05-15 | Command | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-execution/compaction/compaction-agent-settings-resolver.test.ts tests/unit/agent-execution/compaction/server-compaction-agent-runner.test.ts tests/unit/agent-execution/backends/autobyteus/autobyteus-agent-run-backend-factory.test.ts` | Attempt focused test run in dedicated worktree | Failed with `ERR_PNPM_RECURSIVE_EXEC_FIRST_FAIL Command "vitest" not found`; dedicated worktree lacks installed dependencies/node_modules. | Yes: implementation validation should install/link dependencies or use prepared environment. |

## Current Behavior / Current Flow

- Current entrypoint or first observable boundary: Parent AutoByteus runtime requests compaction in `autobyteus-ts` memory flow before the next LLM request. The server-backed compactor runner is injected by `AutoByteusAgentRunBackendFactory` when it builds the parent `AgentConfig`.
- Current execution flow:
  1. Parent `AgentRunConfig` reaches `AutoByteusAgentRunBackendFactory.buildAgentConfig(...)`.
  2. Factory creates parent LLM/runtime and workspace.
  3. Factory calls `compactionAgentRunnerFactory({ agentDefinitionId, workspaceRootPath })`.
  4. Default factory creates `new ServerCompactionAgentRunner({ workspaceRootPath })`.
  5. On compaction, `ServerCompactionAgentRunner.runCompactionTask(...)` calls `CompactionAgentSettingsResolver.resolve()`.
  6. Resolver loads selected compactor definition from `AUTOBYTEUS_COMPACTION_AGENT_DEFINITION_ID` and requires `definition.defaultLaunchConfig.runtimeKind` and `definition.defaultLaunchConfig.llmModelIdentifier`.
  7. If present, runner creates a normal visible compactor agent run through `AgentRunService.createAgentRun(...)` and posts the compaction task.
- Ownership or boundary observations:
  - `CompactionAgentSettingsResolver` is the correct owner for effective compactor runtime/model selection because all compactor run creation flows through it.
  - `AutoByteusAgentRunBackendFactory` is the correct owner to capture parent effective runtime/model because it creates a runner instance for one parent run and already has those values.
  - UI/settings must not own fallback; they can only describe it.
- Current behavior summary: Fresh built-in Memory Compactor selection produces a missing runtime/model error because the seed has no launch defaults and no parent fallback is passed to the resolver.

## Design Health Assessment Evidence

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Bug Fix / Behavior Change
- Candidate root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Missing Invariant, with a small boundary-context gap
- Refactor posture evidence summary: Local boundary extension is needed now. Keeping fallback in the caller or UI would duplicate policy and bypass the resolver owner.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| `compaction-agent-settings-resolver.ts` | Resolver requires compactor runtime/model from selected definition only. | Required fallback invariant is missing exactly where effective compactor launch settings are decided. | Add fallback input and precedence rules. |
| `server-compaction-agent-runner.ts` | Runner creates normal visible run from resolver output. | Runner is the authoritative execution boundary for compactor launch config. | Store/pass parent fallback to resolver. |
| `autobyteus-agent-run-backend-factory.ts` | Parent runtime/model are available when runner is created but are not included in runner-factory input. | Boundary-context gap; no broad architecture rewrite needed. | Extend factory input and tests. |
| Built-in compactor template | Default launch config is intentionally null. | Current fresh-install default is incompatible with resolver's required explicit config. | Keep template null; fix fallback. |
| Docs/settings copy | Durable docs explicitly say no active-model fallback. | Documentation will become stale and misleading. | Update docs and UI copy. |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-execution/compaction/compaction-agent-settings-resolver.ts` | Resolve selected compactor agent launch settings. | Throws on missing runtime/model and has no parent context. | Extend as authoritative fallback resolver. |
| `autobyteus-server-ts/src/agent-execution/compaction/server-compaction-agent-runner.ts` | Create visible compactor run, post task, collect output, terminate run. | Calls resolver with no fallback and passes output to `createAgentRun`. | Hold parent fallback launch context and pass it to resolver. |
| `autobyteus-server-ts/src/agent-execution/backends/autobyteus/autobyteus-agent-run-backend-factory.ts` | Build parent runtime agent config and inject server-backed compaction runner. | Has parent effective launch fields but passes only definition/workspace to runner factory. | Extend runner factory input; compute effective runtime once. |
| `autobyteus-server-ts/src/built-in-agents/templates/memory-compactor/agent-config.json` | Seed default Memory Compactor config. | `defaultLaunchConfig: null`. | Leave unchanged; fallback makes this viable. |
| `autobyteus-ts/src/memory/compaction/compaction-agent-runner.ts` | Shared runner interface/task/result metadata. | Does not need parent fallback fields because fallback is server-specific runner construction concern. | Avoid expanding shared task payload unnecessarily. |
| `autobyteus-ts/docs/agent_memory_design_nodejs.md` and `autobyteus-ts/docs/agent_memory_design.md` | Durable memory/compaction design docs. | Current behavior section says missing defaults fail and no fallback. | Update to new inheritance rule. |
| `autobyteus-server-ts/src/services/server-settings-service.ts` | Server setting descriptions. | Compactor setting description says configure runtime/model on selected agent. | Update to mention optional explicit override and parent fallback. |
| `autobyteus-web/components/settings/CompactionConfigCard.vue` and localization | Operator settings card. | Missing runtime/model shown as not configured. | Update summary to say missing values inherit from running agent. |

## Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-05-15 | Test | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-execution/compaction/compaction-agent-settings-resolver.test.ts tests/unit/agent-execution/compaction/server-compaction-agent-runner.test.ts tests/unit/agent-execution/backends/autobyteus/autobyteus-agent-run-backend-factory.test.ts` | Failed immediately: `vitest` not found in dedicated worktree. | Validation should be rerun after dependency setup in implementation stage. |

## External / Public Source Findings

- Public API / spec / issue / upstream source: None used.
- Version / tag / commit / freshness: N/A.
- Relevant contract, behavior, or constraint learned: N/A.
- Why it matters: This is an internal codebase behavior change.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: Unit tests can validate fallback using mocked definitions and mocked `AgentRunService`; no real model-provider calls are required.
- Required config, feature flags, env vars, or accounts: `AUTOBYTEUS_COMPACTION_AGENT_DEFINITION_ID` selected compactor id remains required for real compaction; unit tests can mock `ServerSettingsService`.
- External repos, samples, or artifacts cloned/downloaded for investigation: None.
- Setup commands that materially affected the investigation: Dedicated task worktree creation; attempted test run failed due missing local dependencies.
- Cleanup notes for temporary investigation-only setup: None.

## Findings From Code / Docs / Data / Logs

1. The immediate failure comes from `CompactionAgentSettingsResolver` requiring explicit compactor default runtime/model.
2. The built-in compactor seed intentionally omits those values, so the current fresh default is guaranteed to fail when compaction is triggered unless the user edits the compactor launch config.
3. The parent effective runtime/model are available earlier in the server AutoByteus backend factory and can be passed into the parent-bound compactor runner without touching the shared compaction task payload.
4. The previous product decision explicitly rejected active-model fallback; the user's new request should be treated as a superseding behavior change, not as an accidental regression in the seed template.
5. The clean design is to keep selected compactor definition ownership and visible normal runs intact, but change effective launch resolution from “explicit compactor only” to “explicit compactor over parent fallback.”

## Constraints / Dependencies / Compatibility Facts

- Explicit compactor runtime/model settings must remain authoritative over fallback.
- The fallback source must be the triggering/running parent agent's effective runtime/model, not a hard-coded global default.
- The selected compactor definition id remains required.
- No compatibility wrapper or dual execution path is needed; this is one clean replacement for the resolver's missing-field behavior.
- Existing visible compactor run status metadata should continue to report final effective runtime/model.

## Open Unknowns / Risks

- The exact UI wording should be confirmed, especially in Chinese localization, but behavior does not depend on UI changes.
- Dedicated worktree dependency setup is needed before tests can be run.
- If future runtimes require additional launch identity fields, the fallback context type may need to grow beyond runtime/model.

## Notes For Architect Reviewer

Recommended design posture: localized boundary extension. Add parent fallback launch context to the server compactor runner construction path, centralize precedence in `CompactionAgentSettingsResolver`, and update tests/docs/copy. Do not solve this by hard-coding built-in compactor defaults or by making each caller pre-fill runtime/model before invoking the runner.
