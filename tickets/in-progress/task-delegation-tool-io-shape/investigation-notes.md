# Investigation Notes

## Investigation Status

- Bootstrap Status: Complete.
- Current Status: Downstream requirement-gap rework complete; refined requirement/design includes `submit_task_result`, user-approved on 2026-07-01, and ready for architecture review.
- Investigation Goal: Inspect task lifecycle tool input/output contracts and evaluate output noise for `delegate_task`, `submit_task_result`, and `review_task_result`.
- Scope Classification (`Small`/`Medium`/`Large`): Small.
- Scope Classification Rationale: Contract-shape investigation and refinement for three task lifecycle tools.
- Scope Summary: Locate task delegation tool definitions, parsers, service returns, tests, and downstream implementation artifacts.
- Primary Questions To Resolve:
  - What input arguments are accepted by `delegate_task`?
  - What output fields does `delegate_task` return, and who needs them?
  - What input arguments are accepted by `submit_task_result`?
  - What output fields does `submit_task_result` return, and who needs them?
  - What input arguments are accepted by `review_task_result`?
  - What output fields does `review_task_result` return, and who needs them?

## Request Context
User asked: “Can you please have a look at the input arguments and the return for delegate task and for both the delegate task and for the review task result, both input and output. Why do I feel like output has a lot of things which doesn't are not really needed? Can you please have a look?”

Downstream follow-up on 2026-07-01: after initial implementation/code review, the user asked why `submit_task_result` was not changed and requested that solution design apply the same meaningful public-result cleanup philosophy to `submit_task_result`.

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git.
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-delegation-tool-io-shape`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-delegation-tool-io-shape/tickets/in-progress/task-delegation-tool-io-shape`
- Current Branch: `codex/task-delegation-tool-io-shape`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-delegation-tool-io-shape`
- Bootstrap Base Branch: `origin/personal`
- Remote Refresh Result: `git fetch origin --prune` succeeded on 2026-07-01.
- Task Branch: `codex/task-delegation-tool-io-shape`
- Expected Base Branch (if known): `origin/personal`
- Expected Finalization Target (if known): `personal`
- Bootstrap Blockers: None.
- Notes For Downstream Agents: No downstream handoff unless user requests implementation.

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-07-01 | Command | `pwd && git rev-parse --show-toplevel && git status --short --branch && git symbolic-ref refs/remotes/origin/HEAD` | Bootstrap current repo state. | Shared checkout was `personal` with unrelated untracked files; default remote head `origin/personal`. | No |
| 2026-07-01 | Command | `git fetch origin --prune` | Refresh tracked base before worktree creation. | Succeeded. | No |
| 2026-07-01 | Command | `git worktree add -b codex/task-delegation-tool-io-shape /Users/normy/autobyteus_org/autobyteus-worktrees/task-delegation-tool-io-shape origin/personal` | Create dedicated task worktree. | Succeeded at HEAD `4331f101`. | No |
| 2026-07-01 | Command | `rg -n "delegate_task\|review_task_result\|submit_task_result\|TaskDelegation\|task_delegation" autobyteus-server-ts/src/agent-tools autobyteus-server-ts/src/agent-team-execution autobyteus-server-ts/tests -g '!**/node_modules/**'` | Locate task delegation tool contracts, service, and tests. | Found task delegation tool contracts/parsers/manifests under `src/agent-tools/task-delegation`, domain/service files under `src/agent-team-execution/task-delegation`, and unit/integration/e2e tests. | No |
| 2026-07-01 | Code | `autobyteus-server-ts/src/agent-tools/task-delegation/task-delegation-tool-input-parsers.ts` | Inspect accepted input schemas. | `delegate_task` and `review_task_result` inputs are strict and minimal; defaults fill `reference_files: []`; `request_revision` requires a non-empty `comment`. | No |
| 2026-07-01 | Code | `autobyteus-server-ts/src/agent-tools/task-delegation/task-delegation-tool-parameter-schemas.ts` | Inspect public argument schema exposed to tool callers. | Public schema matches parser: delegate target/description/reference_files; review task_id/decision/comment/reference_files. | No |
| 2026-07-01 | Code | `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-record.ts` | Inspect DTO result types. | `DelegateTaskResult` and `ReviewTaskResultResult` each expose 8 fields; many are lifecycle/diagnostic fields rather than necessary continuation data. | Possible follow-up simplification. |
| 2026-07-01 | Code | `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-service.ts` | Inspect result construction. | `delegateTask` directly returns target/task/execution/status/activation fields; `reviewTaskResult` returns review ids, notification/settlement telemetry, and warnings. | Possible follow-up simplification. |
| 2026-07-01 | Code | `autobyteus-server-ts/src/agent-team-execution/services/member-run-instruction-composer.ts` | Compare tool outputs against agent instructions. | Agent instructions only require generated `task_id` for later review; lifecycle notifications/work packets deliver task/revision details directly. | Supports smaller agent-facing outputs. |
| 2026-07-01 | Command | `rg -n "activation_accepted\|execution_kind\|task_agent_run_id\|task_team_run_id\|reviewed_submission_id\|settlement_requested\|notification_delivered\|review_id" autobyteus-server-ts/src autobyteus-web autobyteus-ts/src --glob '!**/*.test.ts'` | Check whether verbose tool result fields are consumed by production code. | Found these identities heavily used in event/websocket/task-team projection paths, but no production consumer requiring them specifically from the tool return object. | Keep rich event payloads; simplify only tool result if desired. |
| 2026-07-01 | Existing Artifact | `tickets/done/delegate-review-tool-result-shape/{requirements.md,investigation-notes.md,design-spec.md}` | Check prior related work around raw MCP envelopes. | Prior work already separated effective tool result projection from raw MCP `content`/`structuredContent`/`_meta`; current question is about the direct task-domain result being verbose. | No |
| 2026-07-01 | User Clarification | Conversation: user approved final recommended shapes and requested kickoff. | Lock target public result contract before design. | Final target uses `message?: string` as the single optional advisory field for both tools. `delegate_task` does not use rejection wording; message is only for activation failure. `review_task_result` uses message only for notification/lifecycle delivery issue. `target`, run ids, review ids, notification booleans, settlement booleans, and warning arrays should be removed from public results. | Produce design spec and route to architecture review. |
| 2026-07-01 | Artifact | `tickets/in-progress/task-delegation-tool-io-shape/design-spec.md` | Produce design artifact from approved requirements. | Design assigns public result projection ownership to `TaskDelegationService`; keeps parsers/input schemas and internal rich event/notification payloads unchanged; rejects compatibility retention of verbose public fields. | Initial design was routed and passed review. |
| 2026-07-01 | Message / Downstream Event | Message from `code_reviewer_a7b5b5fc821b4eaf986378a3a6c35d7e`: user wants `submit_task_result` included. | Capture downstream requirement gap and reset scope. | User wants `submit_task_result` to follow same meaningful result policy. Candidate shape: `{ task_id, status: "awaiting_review" }`, plus optional `message` only if reviewer/delegator notification delivery fails. | Refine requirements/design and present to user before architecture review. |
| 2026-07-01 | Code | `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-record.ts` after initial implementation | Inspect current implemented result types. | `DelegateTaskResult` and `ReviewTaskResultResult` are minimal; `SubmitTaskResultResult` still includes `submission_id`, `notification_delivered`, and `warnings`. | Include submit result in refined cleanup. |
| 2026-07-01 | Code | `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-service.ts` after initial implementation | Inspect current result construction. | `publishSubmissionTransition` still returns `submission_id`, `notification_delivered`, and raw warning array. Existing `notificationWarningMessage` helper can be reused to map delivery failure to concise `message`. | Design submit result mapping in service. |
| 2026-07-01 | Command | `rg -n "submission_id|notification_delivered|warnings|submitTaskResult|submit_task_result" ...tests...` | Identify affected tests. | Unit/integration tests assert old submit result fields in task-agent and task-team ingress paths. | Downstream implementation must update tests while retaining internal metadata/event assertions. |
| 2026-07-01 | User Approval | Conversation: user confirmed `submit_task_result` input is already clean and approved continuing to review/kickoff. | Approve refined package before architecture review. | Refined scope is approved: keep submit input unchanged; simplify submit output to `{ task_id, status: "awaiting_review" }` plus optional `message` only when notification delivery fails. | Route revised package to architecture review. |

## Current Behavior / Current Flow

- Current entrypoint or first observable boundary: `TASK_DELEGATION_TOOL_MANIFEST` entries for `delegate_task`, `submit_task_result`, and `review_task_result` execute `TaskDelegationToolService`, which routes to `TaskDelegationService`.
- Current execution flow:
  1. Tool parameter schema advertises allowed arguments.
  2. Zod parsers strictly validate and normalize tool arguments.
  3. `TaskDelegationToolService` resolves the owning task delegation service for the current team run.
  4. `TaskDelegationService.delegateTask(...)` creates a ledger record, activates a task-agent or task-team, then returns `DelegateTaskResult`.
  5. `TaskDelegationService.submitTaskResult(...)` / task-team ingress route resolves the bound task, records submission, publishes internal events, notifies the reviewer/delegator, then currently returns `SubmitTaskResultResult`.
  6. `TaskDelegationService.reviewTaskResult(...)` authorizes the original delegator, records review, publishes internal events, notifies revision targets or requests settlement on acceptance, then returns `ReviewTaskResultResult`.
- Ownership or boundary observations: Internal task delegation events need rich execution identity and status payloads. Agent-facing tool responses do not necessarily need the same telemetry because the framework routes packets/notifications and stores ledger state internally.
- Current behavior summary: Input contracts are compact; output contracts are service/debug oriented and expose more lifecycle detail than a model normally needs.

## Design Health Assessment Evidence

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Investigation / API contract simplification candidate.
- Candidate root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue.
- Refactor posture evidence summary: If output simplification is desired, add a public/tool-result projection or change the public result DTOs so internal lifecycle payloads remain rich while tool responses are minimal.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| Input parsers | Strict input schemas expose only needed arguments. | No input simplification appears necessary. | No |
| Tool result DTOs | Original delegate/review outputs were verbose; after initial implementation submit still exposes `submission_id`, `notification_delivered`, and `warnings`. | Submit result remains inconsistent with meaningful public-result policy. | Include in refined cleanup |
| Service output construction | Submit output is built from internal submission id and notification delivery outcome. | Tool response boundary currently mirrors internal state too closely for submit. | Include in refined cleanup |
| Production search | Verbose identities are needed by event/websocket paths, not clearly by the tool return object itself. | Do not remove internal/event fields; only shrink agent-facing tool output. | Yes, if implementing |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-tools/task-delegation/task-delegation-tool-input-parsers.ts` | Strict parser/normalizer for task delegation tool arguments | Delegate/submit/review inputs are small and well-scoped. | Keep input shapes. |
| `autobyteus-server-ts/src/agent-tools/task-delegation/task-delegation-tool-parameter-schemas.ts` | Tool argument schema shown to agents | Matches parser; no obvious extra arguments. | Keep schema except wording tweaks if desired. |
| `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-record.ts` | Domain/task delegation DTO definitions | After initial implementation, `SubmitTaskResultResult` still exposes `submission_id`, `notification_delivered`, and `warnings`. | Tighten submit public result shape too. |
| `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-service.ts` | Task lifecycle service and current output construction | `publishSubmissionTransition` still returns submission/notification internals to tool caller. | Best candidate for submit result projection. |
| `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-event-publisher.ts` | Internal team-run task delegation events | Publishes rich status/identity payloads that frontend/projections need. | Do not shrink these as part of tool-output cleanup. |
| `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-notification-dispatcher.ts` | Delivers result/revision notifications and warnings | Warning details can be useful only when delivery fails. | Tool output can omit empty warning arrays and success notification booleans. |

## Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |

## External / Public Source Findings

Not applicable.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: None so far.
- Required config, feature flags, env vars, or accounts: None so far.
- External repos, samples, or artifacts cloned/downloaded for investigation: None.
- Setup commands that materially affected the investigation: Dedicated worktree creation commands listed in Source Log.
- Cleanup notes for temporary investigation-only setup: None.

## Findings From Code / Docs / Data / Logs

### Current `delegate_task` input

Parser/schema:

```ts
{
  target: { kind: "member" | "team"; name: string },
  description: string,
  reference_files?: string[] // defaults to []
}
```

Assessment: this is already lean. `target` is needed to distinguish member vs team targets, `description` is the task packet, and `reference_files` is optional task context.

### Current `delegate_task` output

Type/service result:

```ts
{
  target: { kind: "member" | "team"; name: string },
  task_id: string,
  execution_kind: "task_agent" | "task_team" | null,
  task_agent_run_id: string | null,
  task_team_run_id: string | null,
  status: "not_started" | "active" | "awaiting_review" | "accepted",
  activation_accepted: boolean,
  message: string | null
}
```

Field assessment:

| Field | Keep in agent-facing response? | Reason |
| --- | --- | --- |
| `task_id` | Yes | Needed by the delegator/reviewer to identify the task later. |
| `status` | Yes | Confirms whether activation is active or not_started. |
| `target` | No | It only echoes the caller's chosen delegate target; on success the caller already knows who they delegated to, and invalid/ambiguous targets are rejected before success. |
| `message` | Conditional | Useful on activation rejection/failure; noisy as `null`. |
| `execution_kind` | Likely no | Internal routing/UI/debug; framework already knows how execution was activated. |
| `task_agent_run_id` | Likely no | Exact run routing should be handled by task lifecycle/system notifications, not manual agent usage. |
| `task_team_run_id` | Likely no | Same; needed in events/projections, not normal tool response. |
| `activation_accepted` | Likely no | Duplicates `status`/`message`; if activation rejects, `status: "not_started"` plus `message` is enough. |

### Current `submit_task_result` input

Parser/schema:

```ts
{
  message: string,
  reference_files?: string[] // defaults to []
}
```

Assessment: this is already lean. The submitting task execution is bound by task-agent/task-team context, so it should not pass `task_id`; the current parser explicitly rejects extra fields.

### Current `submit_task_result` output

Type/service result after initial two-tool cleanup:

```ts
{
  task_id: string,
  status: "awaiting_review",
  submission_id: string,
  notification_delivered: boolean,
  warnings: TaskDelegationWarning[]
}
```

Field assessment:

| Field | Keep in agent-facing response? | Reason |
| --- | --- | --- |
| `task_id` | Yes | Confirms which bound task was submitted. |
| `status` | Yes | `awaiting_review` tells the task execution it has successfully handed off for review. |
| `submission_id` | No | Internal audit/correlation id. The reviewer reviews by `task_id`, not by `submission_id`. |
| `notification_delivered` | No | Success is noisy; failure should become concise `message`. |
| `warnings` | No | Raw warning objects expose internal route/run ids; public result should use optional `message` only on delivery failure. |

### Current `review_task_result` input

Parser/schema:

```ts
{
  task_id: string,
  decision: "accept" | "request_revision",
  comment?: string | null, // required for request_revision
  reference_files?: string[] // defaults to []
}
```

Assessment: this is already lean. `task_id` is required because a reviewer may own multiple pending tasks. `comment` only needs to be required on revision, and that is already enforced.

### Current `review_task_result` output

Type/service result:

```ts
{
  task_id: string,
  status: "active" | "accepted",
  decision: "accept" | "request_revision",
  review_id: string,
  reviewed_submission_id: string,
  notification_delivered: boolean | null,
  settlement_requested: boolean,
  warnings: TaskDelegationWarning[]
}
```

Field assessment:

| Field | Keep in agent-facing response? | Reason |
| --- | --- | --- |
| `task_id` | Yes | Confirms what was reviewed. |
| `status` | Yes | `active` means revision requested; `accepted` means finalized. |
| `decision` | Maybe | Echoes input but useful confirmation. |
| `warnings` | Conditional | Useful only when non-empty, especially notification failure. |
| `review_id` | Likely no | Internal audit/debug id; not used in normal next actions. |
| `reviewed_submission_id` | Likely no | Internal audit/debug id; the reviewer only needs task-level lifecycle. |
| `notification_delivered` | Likely no | Mostly telemetry; failures are already represented by warnings. |
| `settlement_requested` | Likely no | Internal lifecycle action; agent should not act on it directly. |

### Suggested simplified public tool result contract

If user wants implementation:

```ts
type DelegateTaskToolResult = {
  task_id: string;
  status: "active" | "not_started";
  message?: string; // only on activation failure
};

type SubmitTaskResultToolResult = {
  task_id: string;
  status: "awaiting_review";
  message?: string; // only on reviewer/delegator notification delivery failure
};

type ReviewTaskResultToolResult = {
  task_id: string;
  status: "active" | "accepted";
  decision: "accept" | "request_revision";
  message?: string; // only on notification/lifecycle delivery failure
};
```

Important distinction: keep rich internal/event payloads unchanged because frontend task execution projection and diagnostics rely on explicit execution identities in websocket/event payloads.

User-approved wording/semantics:
- Do not call task activation failure "rejection"; the task target is not choosing to reject delegated work in the product model.
- Prefer `message?: string` over `warning?: string` or `error?: string` because the tool call may succeed while a side-effect delivery issue needs to be reported.
- Hard failures should still use the existing tool error path, not successful results with `message`.

## Constraints / Dependencies / Compatibility Facts

- Current tests assert the verbose output fields, so implementation would need unit/integration/e2e fixture updates.
- Event/websocket payloads should remain rich; do not use this cleanup to remove `execution_kind`, `task_agent_run_id`, `task_team_run_id`, or review/submission ids from internal events.
- Prior completed work under `tickets/done/delegate-review-tool-result-shape` handled raw MCP envelope leakage (`content`, `structuredContent`, `_meta`). This investigation is separate: the direct domain result itself is still verbose.

## Open Unknowns / Risks

- If implementation changes existing public output fields, confirm whether any external API clients rely on them beyond Activity display/tests.

## Notes For Architect Reviewer

No architecture review requested yet; investigation-only.
