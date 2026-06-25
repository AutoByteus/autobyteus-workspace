# Investigation Notes

## Investigation Status

- Bootstrap Status: Complete
- Current Status: Requirements approved; design spec produced and ready for architecture review.
- Investigation Goal: Understand the current `delegate_tasks` tool contract, service lifecycle, exposure paths, docs, and tests so the target singular `delegate_task` design can be scoped safely.
- Scope Classification (`Small`/`Medium`/`Large`): Medium
- Scope Classification Rationale: Public tool contract rename/shape change touches manifests, parsers, service types/results, runtime instructions, docs, and tests, but the lifecycle owner remains the same.
- Scope Summary: Replace model-facing plural batch delegation with singular task delegation and remove noisy negative field-list guidance from descriptions.
- Primary Questions To Resolve:
  - Which files expose or document `delegate_tasks`?
  - Is the current service internally batch-oriented or only public-schema batch-oriented?
  - Which durable tests prove lifecycle behavior and must be updated?
  - What exact wording should replace negative/noisy schema descriptions?

## Request Context

The user observed the current local tool schema for `delegate_tasks`, which exposes a required `tasks` array described as "One or more ready-to-run rich task envelopes..." and includes negative instructions such as "Do not pass delegator, task_name, dependencies, completion_criteria, expected_deliverables, or status...". The user wants the tool changed to singular `delegate_task` because each task-agent independently submits its result through `submit_task_result`; multiple task delegations can be represented by multiple singular tool calls. The user also wants the parameter/tool description to state only the correct positive input information, avoiding irrelevant negative guidance that introduces concepts the agent did not otherwise need.

English note: this is best described as "negative instruction noise", "irrelevant negative guidance", or "over-specified negative constraints" rather than "false negative information". In prompt/schema design, the principle is usually "prefer positive instructions over unnecessary negative instructions."

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/singular-delegate-task`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/singular-delegate-task/tickets/in-progress/singular-delegate-task`
- Current Branch: `codex/singular-delegate-task`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/singular-delegate-task`
- Bootstrap Base Branch: `origin/personal`
- Remote Refresh Result: `git fetch origin --prune` succeeded from `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo` on 2026-06-25.
- Task Branch: `codex/singular-delegate-task`, created from `origin/personal`.
- Expected Base Branch (if known): `origin/personal`
- Expected Finalization Target (if known): `personal`
- Bootstrap Blockers: None.
- Notes For Downstream Agents: The original checkout had unrelated untracked `.article-work/` and `docs/articles/`; all task artifacts and future changes should remain in the dedicated worktree above.

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-06-25 | Command | `pwd && git rev-parse --show-toplevel && git status --short --branch && git remote -v && git symbolic-ref refs/remotes/origin/HEAD` | Bootstrap repository/worktree/base discovery | Repo root is `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo`; current shared branch was `personal` tracking `origin/personal`; remote default points to `origin/personal`; unrelated untracked files exist in shared checkout. | No |
| 2026-06-25 | Command | `git fetch origin --prune` | Refresh tracked refs before creating task worktree | Fetch succeeded. | No |
| 2026-06-25 | Command | `git worktree add -b codex/singular-delegate-task /Users/normy/autobyteus_org/autobyteus-worktrees/singular-delegate-task origin/personal` | Create dedicated task worktree/branch | Worktree and branch created at base commit `5bd521b...`. | No |

## Current Behavior / Current Flow

- Current entrypoint or first observable boundary: Pending detailed investigation.
- Current execution flow: Pending detailed investigation.
- Ownership or boundary observations: Pending detailed investigation.
- Current behavior summary: Public tool currently appears as `delegate_tasks` with a required `tasks` array.

## Design Health Assessment Evidence

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Behavior Change / API Cleanup
- Candidate root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Shared Structure Looseness / Legacy Or Compatibility Pressure
- Refactor posture evidence summary: The public input shape is plural/batch even though the lifecycle is singular; clean-cut replacement likely requires coordinated rename and shape tightening across files.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| User request and screenshot | Schema exposes `delegate_tasks` and a `tasks` array with noisy negative field guidance. | Public API shape is less direct than the domain lifecycle; descriptions over-prime the model with irrelevant invalid fields. | Inspect exact implementation and docs. |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| Pending | Pending | Pending | Pending |

## Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |

## External / Public Source Findings

- Public API / spec / issue / upstream source: None used.
- Version / tag / commit / freshness: N/A.
- Relevant contract, behavior, or constraint learned: N/A.
- Why it matters: N/A.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: None for initial investigation.
- Required config, feature flags, env vars, or accounts: None for initial investigation.
- External repos, samples, or artifacts cloned/downloaded for investigation: None.
- Setup commands that materially affected the investigation: Dedicated worktree creation command above.
- Cleanup notes for temporary investigation-only setup: None.

## Findings From Code / Docs / Data / Logs

Pending detailed investigation.

## Constraints / Dependencies / Compatibility Facts

- No backward-compatible public `delegate_tasks` alias should be kept unless design review identifies an unavoidable hard constraint.
- Existing `submit_task_result` and `review_task_result` semantics should remain stable.

## Open Unknowns / Risks

- Need to confirm all active references and tests that must change from plural to singular.
- Need to decide whether service internals should be singular or can retain a private batch helper.

## Notes For Architect Reviewer

Pending detailed investigation and design.

## Detailed Current-State Findings Added 2026-06-25

### Source Log Additions

| Date | Source Type | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-06-25 | Command | `rg -n "delegate_tasks|DELEGATE_TASKS|DelegateTasks|delegateTasks|buildDelegateTasks|parseDelegateTasks|DelegateTasksInput|tasks: z\.array|One or more ready-to-run|Do not pass delegator" autobyteus-server-ts/src autobyteus-server-ts/tests autobyteus-server-ts/docs autobyteus-ts/docs` | Locate active public contract, tests, docs, and noisy description strings. | Found active plural contract in `src/agent-tools/task-delegation`, service/types in `src/agent-team-execution/task-delegation`, runtime instruction composer, docs, and unit/integration/e2e tests. | Use findings for design mapping. |
| 2026-06-25 | Code | `autobyteus-server-ts/src/agent-tools/task-delegation/task-delegation-tool-contract.ts` | Inspect canonical model-facing tool names and type mapping. | `DELEGATE_TASKS_TOOL_NAME = "delegate_tasks"`; canonical list is `delegate_tasks`, `submit_task_result`, `review_task_result`; input/result type maps key on `DELEGATE_TASKS_TOOL_NAME`. | Rename constant and mapped subject to singular. |
| 2026-06-25 | Code | `autobyteus-server-ts/src/agent-tools/task-delegation/task-delegation-tool-parameter-schemas.ts` | Inspect current parameter shape and noisy schema text. | `buildDelegateTasksParameterSchema` exposes only one top-level `tasks` array; its description contains the user-quoted negative field list and batch wording. Item schema already has the desired direct fields: `member_name`, `description`, `reference_files`. | Replace with direct singular schema and positive-only descriptions. |
| 2026-06-25 | Code | `autobyteus-server-ts/src/agent-tools/task-delegation/task-delegation-tool-input-parsers.ts` | Inspect parser strictness and input type shape. | `DelegateTasksInputSchema` requires `tasks: z.array(TaskInputSchema).min(1, "delegate_tasks requires at least one task")`; strict object rejection already enforces unknown-field validation. | Replace parser with singular direct `TaskInputSchema`; keep strict validation but error should reference `delegate_task`. |
| 2026-06-25 | Code | `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-record.ts` | Inspect domain input/result types. | `TaskDelegationTaskInput` is already singular and semantically tight. Public `DelegateTasksInput` wraps `tasks: TaskDelegationTaskInput[]`; public `DelegateTasksResult` wraps `createdTasks[]` and `activationResults[]`. | Prefer reuse/rename of `TaskDelegationTaskInput` as the public `DelegateTaskInput`; replace result with single-task result. |
| 2026-06-25 | Code | `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-service.ts` | Inspect service behavior. | `delegateTasks` validates context, builds create inputs for all `input.tasks`, creates records, calls `activateRunnableTasks`, then returns arrays. | Introduce singular `delegateTask` service method that creates one record and activates runnable tasks; avoid exposing batch result. Decide whether to retain private batch helper only if needed. |
| 2026-06-25 | Code | `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-activation-coordinator.ts` | Inspect activation behavior. | `activateRunnableTasks` loops all ledger `not_started` records, but creates one task-agent/work packet per record and returns one `TaskDelegationActivationResult` per task. Work packet renderer is called as `render([record])`, so actual activation is singular per task. | Singular public API aligns with activation reality; ensure `delegateTask` maps the matching activation result for its created task. |
| 2026-06-25 | Code | `autobyteus-server-ts/src/agent-team-execution/services/member-run-instruction-composer.ts` | Inspect runtime instructions shown to team members. | Instructions explicitly say `delegate_tasks`, one-item `tasks` list, and include negative field-list guidance. | Update delegation input guidance to `delegate_task(member_name, description, reference_files?)` and remove negative field-list wording. |
| 2026-06-25 | Code | `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-work-packet-renderer.ts` | Inspect task-agent packet. | Work packets are already singular in normal activation (`render([record])`), but renderer contains fallback plural wording for multiple records. It includes some negative lifecycle protocol guardrails unrelated to the user's schema field-list complaint. | Consider simplifying plural fallback if no longer used; lifecycle guardrails can remain if still necessary, but input-schema negative field list should be removed. |
| 2026-06-25 | Code | `autobyteus-server-ts/src/agent-tools/task-delegation/delegate-tasks.ts`, `register-task-delegation-tools.ts`, `task-delegation-tool-service.ts`, MCP adapter provider | Inspect runtime exposure paths. | Native AutoByteus local wrapper class is plural `DelegateTasksTool`; registration and MCP adapter use the canonical manifest, so changing manifest/contract plus wrapper should propagate through both exposure paths. | Rename wrapper file/class/function to singular or leave file only if migration strategy justifies it; design should prefer clean-cut singular naming. |
| 2026-06-25 | Test | `autobyteus-server-ts/tests/unit/agent-tools/task-delegation/task-delegation-runtime-descriptions.test.ts` | Identify durable schema/description coverage. | Test currently expects manifest list with `DELEGATE_TASKS_TOOL_NAME`, top-level `tasks` parameter, and description containing dependency negative guidance. | Update to assert singular direct schema and absence of noisy negative terms. |
| 2026-06-25 | Test | `autobyteus-server-ts/tests/unit/agent-team-execution/task-delegation-service.test.ts` | Identify core service lifecycle coverage. | Tests directly call `service.delegateTasks(...)` with arrays, including multi-task batch in one call, nested delegation, settled parent protection, and parser/tool list assertions. | Update to `delegateTask(...)`; replace multi-task-in-one-call tests with repeated calls proving independent lifecycles. |
| 2026-06-25 | Test | `autobyteus-server-ts/tests/integration/agent-team-execution/task-delegation-tool-lifecycle.integration.test.ts` | Identify integration coverage. | Harness uses `executeDelegateTasks`; two-step input batches two tasks in one call; tests validate lifecycle and rejected activation behavior. | Update helper and tests to repeated singular calls; rejected activation test may use one successful call then one rejected singular call. |
| 2026-06-25 | Test | `autobyteus-server-ts/tests/e2e/runtime/mixed-task-delegation.e2e.test.ts` | Identify provider/model-facing e2e coverage. | E2E prompt/toolNames expect `delegate_tasks` and exact JSON with `tasks`. | Update to `delegate_task` and singular exact JSON. |
| 2026-06-25 | Doc | `autobyteus-server-ts/docs/modules/agent_tools.md`, `agent_team_execution.md`, `agent_tools_mcp_server.md`, `agent_execution.md`, `agent_memory.md`, `docs/design/codex_raw_event_mapping.md`; `autobyteus-ts/docs/agent_team_runtime_and_task_coordination.md`, `agent_team_design.md` | Identify durable docs with old tool name. | Docs consistently describe `delegate_tasks` and batch `tasks` array; some include negative dependency guidance. | Update durable docs to singular API and positive input shape. |

## Current Behavior / Current Flow Refined

- Current entrypoint or first observable boundary: Model/runtime tool catalog exposes `delegate_tasks` through `TASK_DELEGATION_TOOL_MANIFEST`; Agent Tools MCP projects the same manifest, and native AutoByteus wrappers register a local `DelegateTasksTool` for mixed team contexts.
- Current execution flow: `Model tool call delegate_tasks({ tasks: [...] }) -> task-delegation parser validates top-level tasks array -> TaskDelegationToolService resolves bound TeamRun -> TaskDelegationService.delegateTasks creates one ledger record per task item -> TaskDelegationActivationCoordinator.activateRunnableTasks loops not-started records -> TeamRun.startTaskAgentInstance starts one task-agent per record with a direct work packet -> each task-agent later calls submit_task_result -> original delegator calls review_task_result`.
- Ownership or boundary observations: `TaskDelegationService` is the governing owner for task lifecycle state and transitions. `src/agent-tools/task-delegation` is the public model-facing schema/manifest boundary. The current public `delegate_tasks` input is batch-shaped, but `TaskDelegationTaskInput`, task-agent identity, work packet rendering, submission, and review all operate on one concrete task.
- Current behavior summary: Batch is a public/schema convenience over singular lifecycle records; the public result shape mirrors batch (`createdTasks[]`, `activationResults[]`). The quoted schema description includes negative field-list guidance even though strict schema validation already rejects unknown fields.

## Design Health Assessment Evidence Refined

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| `task-delegation-record.ts` | Singular `TaskDelegationTaskInput` already exists; `DelegateTasksInput` only wraps an array. | The domain already has a singular input shape; public API can be tightened without inventing a new subject. | Design direct public input around the existing singular task shape. |
| `task-delegation-service.ts` + activation coordinator | `delegateTasks` creates multiple records, but activation still processes one task-agent per record with `taskCount: 1`. | Singular tool more accurately reflects lifecycle and result ownership. | Design single result mapping. |
| `submit_task_result` / `review_task_result` contracts | Both downstream lifecycle tools are singular and task-context-bound / task-id-bound. | Current plural delegation is asymmetric with the rest of the lifecycle. | Rename/reshape delegation entrypoint. |
| Runtime/schema descriptions | Current guidance mentions non-schema fields (`delegator`, `task_name`, `dependencies`, etc.). | This is "negative instruction noise" / "over-specified negative constraints" that can distract models from the desired schema. | Replace with concise positive-only schema descriptions. |
| Tests/docs | Many exact `delegate_tasks` references exist across durable tests and docs. | This is a coordinated API cleanup, not one local string edit. | Design broad update list and validation plan. |

## Relevant Files / Components Refined

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-tools/task-delegation/task-delegation-tool-contract.ts` | Canonical model-facing task tool names and type maps | Plural constant/name is authoritative. | Rename to `DELEGATE_TASK_TOOL_NAME = "delegate_task"` and update maps/lists. |
| `autobyteus-server-ts/src/agent-tools/task-delegation/task-delegation-tool-manifest.ts` | Public tool manifest entries | Delegation entry uses plural description and calls `service.delegateTasks`. | Replace manifest entry with singular description and direct input parse/execute. |
| `autobyteus-server-ts/src/agent-tools/task-delegation/task-delegation-tool-parameter-schemas.ts` | Tool parameter schemas | Delegation schema top-level `tasks` array contains noisy negative field list. | Build singular direct schema using `member_name`, `description`, `reference_files` positive descriptions. |
| `autobyteus-server-ts/src/agent-tools/task-delegation/task-delegation-tool-input-parsers.ts` | Strict input parser | Parser requires array and error text says `delegate_tasks`. | Replace with direct strict singular parser. |
| `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-record.ts` | Domain task-delegation DTOs and result types | Singular task input exists; result is plural. | Introduce/rename singular `DelegateTaskInput` / `DelegateTaskResult`; avoid retaining batch public result. |
| `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-input-resolver.ts` | Context validation, member resolution, create input building | `buildCreateInputs` normalizes arrays. | Add singular `buildCreateInput` or change method to singular. |
| `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-service.ts` | Lifecycle governing owner | Public method is batch; validation and activation owner are otherwise correct. | Add/replace with singular `delegateTask`; preserve lifecycle invariants. |
| `autobyteus-server-ts/src/agent-team-execution/services/member-run-instruction-composer.ts` | Runtime guidance for configured tools | Contains one-item `tasks` list and negative field-list guidance. | Update to concise positive `delegate_task` guidance. |
| `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-work-packet-renderer.ts` | Task-agent direct work-packet rendering | Normal use is singular; renderer supports plural fallback. | Consider simplifying plural branches if no longer reachable. |
| `autobyteus-server-ts/tests/**` | Durable unit/integration/e2e coverage | Many exact plural references and batch-shaped inputs. | Update tests to singular and add repeated-call coverage. |
| `autobyteus-server-ts/docs/**`, `autobyteus-ts/docs/**` | Durable docs for model-facing task delegation | Docs describe plural tool and batch array. | Update to singular API and repeated-call multi-task guidance. |

## Constraints / Dependencies / Compatibility Facts Refined

- Agent Tools MCP exposure uses canonical manifest names; changing the canonical constant is the primary public-name change.
- Native AutoByteus wrappers are thin around the same manifest/service boundary; they must not keep an old plural tool registered after the clean-cut replacement.
- Parser strictness should remain, but descriptions should not pre-load irrelevant invalid fields. If callers actually supply unknown fields, validation errors can still report the parser's strict-object error.
- The activation coordinator currently activates all runnable not-started tasks in the ledger. With singular delegation, implementation must ensure the returned result corresponds to the created task and should avoid accidentally activating unrelated stale not-started records if such a state can exist.

## Open Unknowns / Risks Refined

- Whether to remove plural support from `TaskDelegationWorkPacketRenderer.render(records[])` entirely or leave it as an internal defensive shape depends on implementation impact; public behavior should be singular regardless.
- Some durable docs contain broader statements about removed legacy task-plan tools. Those negative guardrails may remain where they explain historical/runtime boundaries, but delegation schema descriptions should be positive-only.


## Requirement Approval Update 2026-06-25

The user approved the ticket direction and explicitly added one downstream validation requirement: API/E2E coverage must include a real end-to-end test path for this change. The expected evidence is not only direct parser, service, manifest, mocked unit, or narrow integration coverage. The durable E2E should drive the product-facing team runtime/tool exposure path, observe `delegate_task` execution, task-agent activation, `submit_task_result`, and `review_task_result` lifecycle events. Existing `autobyteus-server-ts/tests/e2e/runtime/mixed-task-delegation.e2e.test.ts` appears to be the most relevant current real E2E candidate because it creates definitions/runs through GraphQL/websocket, uses real runtime models/tool approval, and observes websocket lifecycle events.

## Design Source Reads 2026-06-25

| Date | Source Type | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-06-25 | Spec | `/Users/normy/autobyteus_org/autobyteus-agents/agent-teams/software-engineering-team/agents/solution-designer/skills/solution-designer/design-principles.md` | Required shared design guidance. | Use spine-first design, authoritative boundary rule, clean-cut no-compat replacement, singular explicit interface boundaries, semantic tightening of shared structures. | Applied in design spec. |
| 2026-06-25 | Spec | `/Users/normy/autobyteus_org/autobyteus-agents/agent-teams/software-engineering-team/agents/solution-designer/skills/solution-designer/references/design-examples.md` | Concrete design-shape reference for runtime/tool lifecycle and team orchestration. | Examples reinforced thin facade vs governing owner, scoped runtime/local spines, and explicit identity-specific boundaries. | Applied in design spec. |
| 2026-06-25 | User Approval | Current conversation | Confirm requirements approval and added E2E validation requirement. | User approved ticket direction and required real E2E evidence, not just mocked/service-level checks. | Included as FR-009 / AC-008. |
