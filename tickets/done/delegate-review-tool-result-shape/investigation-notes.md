# Investigation Notes

## Investigation Status

- Bootstrap Status: Complete on 2026-06-27.
- Current Status: User broadened scope from task-delegation-specific normalization to a general MCP effective-result projection; requirements and design spec revised to Design-ready.
- Investigation Goal: Determine exact backend return shapes for MCP-backed tool results, why `structuredContent`/`_meta` protocol fields appear in Activity, and where to project effective user-facing results.
- Scope Classification (`Small`/`Medium`/`Large`): Small investigation; small-to-medium potential follow-up fix.
- Scope Classification Rationale: Current user request asks to inspect/report what existing tools return; implementation scope depends on approval of a normalization change.
- Scope Summary: Backend MCP result return-shape inspection across native runtime comparison, Agent Tools/configured MCP envelopes, Codex/Claude projection, and frontend Activity display.
- Primary Questions Resolved: Which files define these tools? What do they return on success/failure? Is `structuredContent` expected protocol output or an accidental projection leak? Which consumers render or persist it?

## Request Context

User asked: "on the backend, we support delegate task tool, and review task result tool, could you have a look what these tools return, i saw that i even see the structuredContent this kinda result"

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git.
- Task Workspace Root: /Users/normy/autobyteus_org/autobyteus-worktrees/delegate-review-tool-result-shape
- Task Artifact Folder: /Users/normy/autobyteus_org/autobyteus-worktrees/delegate-review-tool-result-shape/tickets/done/delegate-review-tool-result-shape
- Current Branch: codex/delegate-review-tool-result-shape
- Current Worktree / Working Directory: /Users/normy/autobyteus_org/autobyteus-worktrees/delegate-review-tool-result-shape
- Bootstrap Base Branch: origin/personal
- Remote Refresh Result: `git fetch origin personal` succeeded on 2026-06-27 before creating the worktree; origin/personal advanced by one commit during bootstrap, and the task branch was fast-forwarded to `2eace62f19661abdea48904d53c92503c246403e` before deeper investigation.
- Task Branch: codex/delegate-review-tool-result-shape
- Expected Base Branch (if known): origin/personal
- Expected Finalization Target (if known): personal
- Bootstrap Blockers: None.
- Notes For Downstream Agents: Root superrepo had unrelated untracked files in the original checkout; this dedicated task worktree started clean and was fast-forwarded to the latest tracked origin/personal before deeper investigation.

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-06-27 | Command | `pwd && git rev-parse --show-toplevel && git status --short --branch && git remote -v && git branch -vv && git symbolic-ref refs/remotes/origin/HEAD` | Bootstrap environment discovery | Original checkout is git superrepo on `personal`, tracking `origin/personal`; remote default is `origin/personal`; original checkout had unrelated untracked files. | No |
| 2026-06-27 | Command | `git fetch origin personal` | Refresh bootstrap base before worktree creation | Succeeded. | No |
| 2026-06-27 | Command | `git worktree add -b codex/delegate-review-tool-result-shape /Users/normy/autobyteus_org/autobyteus-worktrees/delegate-review-tool-result-shape origin/personal` | Create dedicated task worktree/branch | Succeeded. | No |
| 2026-06-27 | Command | `git merge --ff-only origin/personal` | Ensure branch uses latest tracked base after origin/personal advanced during bootstrap | Succeeded; branch HEAD is `2eace62f19661abdea48904d53c92503c246403e`. | No |
| 2026-06-27 | Command | `rg -n "delegate[_ -]?task|review[_ -]?task|structuredContent|review_task|delegate_task|Delegate Task|Review Task|delegateTask|reviewTask|task result|review.*result" autobyteus-server-ts/src autobyteus-ts/src autobyteus-server-ts/tests autobyteus-ts/tests --glob '!**/dist/**' --glob '!**/node_modules/**'` | Locate task tools and structured-content paths | Found task delegation files under `autobyteus-server-ts/src/agent-tools/task-delegation`, task service under `autobyteus-server-ts/src/agent-team-execution/task-delegation`, MCP adapter/provider paths, Codex parser/converter paths, tests, and docs. | No |
| 2026-06-27 | Code | `autobyteus-server-ts/src/agent-tools/task-delegation/task-delegation-tool-manifest.ts` | Inspect canonical tool manifest and execution wiring | Manifest exposes `delegate_task`, `submit_task_result`, and `review_task_result`; entries execute `TaskDelegationToolService` methods and return typed task-delegation result objects. | No |
| 2026-06-27 | Code | `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-record.ts` | Inspect result DTO types | `DelegateTaskResult` and `ReviewTaskResultResult` are typed domain objects; neither type contains `content`, `structuredContent`, `_meta`, or `isError`. | No |
| 2026-06-27 | Code | `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-service.ts` | Inspect service return values | `delegateTask` returns target/task/execution/status/activation fields. `reviewTaskResult` returns active/accepted status, decision, review ids, notification/settlement status, and warnings. | No |
| 2026-06-27 | Code | `autobyteus-server-ts/src/agent-tools/task-delegation/delegate-task.ts` and `review-task-result.ts` | Inspect native AutoByteus BaseTool path | Native `_execute` serializes the typed result with `toTaskDelegationJsonString(result)`; errors throw a JSON-stringified `{ error: { code, message } }`. | No |
| 2026-06-27 | Code | `autobyteus-server-ts/src/agent-tools/mcp/providers/task-delegation-tools-mcp-adapter-provider.ts` | Inspect Agent Tools MCP adapter path | MCP adapter executes the same manifest and wraps the pretty JSON string via `createAgentToolsMcpSuccessResult(...)`; errors use `createAgentToolsMcpErrorResult(...)`. | No |
| 2026-06-27 | Code | `autobyteus-server-ts/src/agent-tools/mcp/agent-tools-mcp-result-mapper.ts` and `agent-tools-mcp-operation-result.ts` | Inspect MCP result envelope mapping | Operation results map to `{ content: [{ type: "text", text }] }`; `isError` is set for rejected operation results. `structuredContent` is only preserved when an adapter already returns `kind: "mcp_tool_result"`, which task delegation does not. | No |
| 2026-06-27 | Code | `autobyteus-server-ts/src/agent-execution/backends/codex/items/codex-tool-payload-parser.ts` and `events/codex-item-event-converter.ts` | Trace Codex lifecycle projection | `resolveToolResult` returns `payload.result` unchanged when present. Terminal tool events then publish that result after only browser-specific normalization. This preserves raw non-browser MCP result envelopes such as `{ content, structuredContent, _meta }`. | Yes, if fixing UI/history result shape. |
| 2026-06-27 | Code | `autobyteus-server-ts/src/agent-tools/browser/browser-mcp-result-normalizer.ts` | Compare family-specific normalization | Browser tools explicitly unwrap `structuredContent` or MCP text `content` into browser domain result objects. This proves provider envelopes are already treated as projection concerns for some families, but there is no general MCP effective-result projector. | Yes, generalize the projection boundary. |
| 2026-06-27 | Code | `autobyteus-web/stores/agentActivityStore.ts`, `autobyteus-web/services/agentStreaming/handlers/toolLifecycleHandler.ts`, `autobyteus-web/components/progress/ToolActivityItem.vue` | Trace rendering consumer | Frontend stores `payload.result` directly as Activity result and renders `JSON.stringify(activity.result)`, so any raw `structuredContent`/`content` envelope emitted by backend projection is visible in the UI. | No, backend normalization is the likely owner. |
| 2026-06-27 | Doc | `autobyteus-server-ts/docs/modules/agent_tools_mcp_server.md` and `autobyteus-server-ts/docs/modules/agent_execution.md` | Verify documented MCP result behavior | Existing docs describe raw MCP envelope preservation for configured MCP-origin tools. User clarification supersedes that as the desired Activity behavior: protocol envelopes may remain at MCP/debug boundaries, but app-facing Activity `result` should be effective output for all MCP-backed tools. | Yes, docs should be updated downstream if implementation changes behavior. |
| 2026-06-27 | Data | `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_555cf5801eb04a6ca574023041f1af68/solution_designer_563f4b8a6e9746559cb55ad43e8ae9a4/context_files/ctx_e3212810b097__image.png` | Inspect user-provided Codex runtime screenshot | Activity result for `delegate_task` displays raw MCP envelope with `content`, `structuredContent: null`, and `_meta: null`; the text block contains the escaped JSON task result. | No |
| 2026-06-27 | Data | `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_555cf5801eb04a6ca574023041f1af68/solution_designer_563f4b8a6e9746559cb55ad43e8ae9a4/context_files/ctx_297e7991c473__image.png` | Inspect user-provided AutoByteus runtime comparison screenshot | Activity result for `delegate_task` displays direct parsed task-domain object with `target`, `task_id`, execution ids, `status`, `activation_accepted`, and `message`, with no raw MCP envelope fields. | No |
| 2026-06-27 | Other | User clarification during design discussion: general solution required; Activity should show effective MCP tool results, not raw `content` / `structuredContent` / `_meta` envelopes for only selected tools. | Refine scope and design after initial task-delegation-specific analysis | The issue is a general MCP result projection invariant, not a three-tool special case. `_meta` is not normal user-facing result content. | Update requirements/design to general projector. |

## Current Behavior / Current Flow

- Current entrypoint or first observable boundary: Tool manifest/native/MCP adapter under `autobyteus-server-ts/src/agent-tools/task-delegation`.
- Current execution flow:
  1. `TASK_DELEGATION_TOOL_MANIFEST` entry parses input and calls `TaskDelegationToolService`.
  2. `TaskDelegationToolService` routes to the active `TaskDelegationService` for the team run.
  3. `TaskDelegationService.delegateTask(...)` / `.reviewTaskResult(...)` returns typed domain result objects.
  4. Native AutoByteus tool classes stringify those objects as JSON.
  5. Agent Tools MCP adapter wraps the JSON string in standard MCP text `content`.
  6. Codex provider lifecycle events can include a raw MCP result envelope with `content`, `structuredContent`, and `_meta`; backend event conversion currently preserves that raw result for non-browser tools.
  7. Frontend Activity renders the emitted result object directly as JSON.
- Ownership or boundary observations: The task service owns task lifecycle policy and typed return values. Agent Tools MCP owns provider protocol wrapping. Codex/Claude converters own application-facing event normalization. Frontend Activity should not need to parse provider MCP envelopes.
- Current behavior summary: `structuredContent` is not part of the direct task-delegation domain result. It appears in Codex application-facing Activity results because Codex returns an MCP completion envelope and backend projection lacks a general MCP effective-result projector. User comparison screenshots confirm AutoByteus runtime already displays the desired effective result for the original task-delegation case.

## Exact Current Return Shapes

### Direct domain/service result: `delegate_task`

Source-derived type from `task-delegation-record.ts`:

```ts
type DelegateTaskResult = {
  target: { kind: "member" | "team"; name: string };
  task_id: string;
  execution_kind: "task_agent" | "task_team" | null;
  task_agent_run_id: string | null;
  task_team_run_id: string | null;
  status: "not_started" | "active" | "awaiting_review" | "accepted";
  activation_accepted: boolean;
  message: string | null;
};
```

Typical successful member-target result from integration coverage:

```json
{
  "target": { "kind": "member", "name": "worker" },
  "task_id": "task_0001",
  "execution_kind": "task_agent",
  "task_agent_run_id": "task-delegation-codex-run__worker__task_0001",
  "task_team_run_id": null,
  "status": "active",
  "activation_accepted": true,
  "message": null
}
```

### Direct domain/service result: `review_task_result`

Source-derived type from `task-delegation-record.ts`:

```ts
type ReviewTaskResultResult = {
  task_id: string;
  status: "active" | "accepted";
  decision: "accept" | "request_revision";
  review_id: string;
  reviewed_submission_id: string;
  notification_delivered: boolean | null;
  settlement_requested: boolean;
  warnings: TaskDelegationWarning[];
};
```

`decision="request_revision"` branch from service code:

```json
{
  "task_id": "task_0001",
  "status": "active",
  "decision": "request_revision",
  "review_id": "task_0001_review_0001",
  "reviewed_submission_id": "task_0001_submission_0001",
  "notification_delivered": true,
  "settlement_requested": false,
  "warnings": []
}
```

`decision="accept"` branch from service code:

```json
{
  "task_id": "task_0001",
  "status": "accepted",
  "decision": "accept",
  "review_id": "task_0001_review_0002",
  "reviewed_submission_id": "task_0001_submission_0002",
  "notification_delivered": null,
  "settlement_requested": true,
  "warnings": []
}
```

### Native AutoByteus `BaseTool` result

`DelegateTaskTool._execute` and `ReviewTaskResultTool._execute` return a `string`: pretty JSON from the direct result object above. On caught errors they throw an `Error` whose message is pretty JSON:

```json
{
  "error": {
    "code": "TASK_NOT_FOUND",
    "message": "Delegated task 'task_1234' was not found."
  }
}
```

### Agent Tools MCP route result

Task-delegation Agent Tools MCP adapters return an `operation_result`, not an `mcp_tool_result`. The MCP method result mapper converts this to standard MCP text content:

Success shape:

```json
{
  "content": [
    {
      "type": "text",
      "text": "<pretty JSON string of DelegateTaskResult or ReviewTaskResultResult>"
    }
  ]
}
```

Error shape:

```json
{
  "content": [
    {
      "type": "text",
      "text": "<pretty JSON string: { \"error\": { \"code\": string, \"message\": string } }>"
    }
  ],
  "isError": true
}
```

The backend mapper does **not** add `structuredContent` for these task-delegation operation results. It only clones `structuredContent` when a tool adapter already returns a raw `mcp_tool_result`.

### Application-facing Codex lifecycle result

For Codex local MCP completion events, if the provider supplies a `result` object, `CodexToolPayloadParser.resolveToolResult(...)` returns that object unchanged. `createTerminalToolExecutionEvent(...)` then emits it after only `normalizeBrowserMcpToolResult(...)`. Because task-delegation tools are not browser tools, a provider envelope such as this can reach frontend/run history unchanged:

```json
{
  "content": [
    {
      "type": "text",
      "text": "<pretty JSON string of the task-delegation result>"
    }
  ],
  "structuredContent": null,
  "_meta": null
}
```

This is the likely shape the user observed.

## Design Health Assessment Evidence

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Bug fix / behavior normalization.
- Candidate root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Missing Invariant / Boundary Or Ownership Issue.
- Refactor posture evidence summary: A small general MCP effective-result projection change is likely sufficient; task lifecycle service design is healthy for the original task-delegation symptom.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| User report | `structuredContent` is visible in tool result output. | Projection exposes raw provider MCP envelope as user-facing result. | User clarified the desired UI contract: show effective MCP result generally. |
| `task-delegation-record.ts` | Direct result DTOs are task-domain objects only. | Core task service does not own MCP fields. | No service change needed. |
| `agent-tools-mcp-result-mapper.ts` | Operation results map to text content and only set `isError`; no `structuredContent` added. | Backend MCP protocol wrapper is standard. | Keep protocol envelope at MCP boundary, but project effective result at app boundary. |
| `codex-tool-payload-parser.ts` | Existing `payload.result` wins before text parsing. | Raw MCP envelope remains application-facing. | Add general MCP effective-result projector. |
| `browser-mcp-result-normalizer.ts` | Browser family has dedicated unwrapping. | Current code already accepts backend projection as the right layer, but family-only normalizers are incomplete for generic MCP tools. | Generalize result projection before/around family-specific post-processing. |
| `ToolActivityItem.vue` | UI renders result JSON directly. | UI showing `structuredContent` is expected once backend emits it. | Backend projection should own normalization. |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-tools/task-delegation/task-delegation-tool-manifest.ts` | Canonical task-delegation tool entries and service execution | Tool entries return typed service results. | Keep as canonical contract source. |
| `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-record.ts` | Task-delegation DTOs/types/errors | Defines `DelegateTaskResult` and `ReviewTaskResultResult`; no MCP envelope fields. | Domain result is clean. |
| `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-service.ts` | Authoritative task lifecycle policy and result creation | Returns typed task results for delegate/review branches. | No task service refactor needed. |
| `autobyteus-server-ts/src/agent-tools/task-delegation/delegate-task.ts` | Native AutoByteus delegate task tool | Serializes result to JSON string. | Native path does not expose `structuredContent`. |
| `autobyteus-server-ts/src/agent-tools/task-delegation/review-task-result.ts` | Native AutoByteus review task result tool | Serializes result to JSON string. | Native path does not expose `structuredContent`. |
| `autobyteus-server-ts/src/agent-tools/mcp/providers/task-delegation-tools-mcp-adapter-provider.ts` | Built-in task-delegation tools over Agent Tools MCP | Wraps JSON string as `AgentOperationResult`. | MCP content wrapper is protocol-level, not domain-level. |
| `autobyteus-server-ts/src/agent-tools/mcp/agent-tools-mcp-result-mapper.ts` | JSON-RPC/MCP result envelope mapper | Adds `content`, sets `isError`; only preserves `structuredContent` for raw `mcp_tool_result`. | Correct at MCP protocol boundary; app-facing events should project effective results for all MCP-backed tools. |
| `autobyteus-server-ts/src/agent-execution/backends/codex/items/codex-tool-payload-parser.ts` | Codex event payload parsing | Existing `payload.result` is returned before parsing text content. | This is where the raw MCP envelope becomes the terminal result. |
| `autobyteus-server-ts/src/agent-execution/backends/codex/events/codex-item-event-converter.ts` | Codex provider event to app event conversion | Applies browser normalization only. | Add general MCP effective-result projection here or immediately below parser boundary. |
| `autobyteus-server-ts/src/agent-tools/browser/browser-mcp-result-normalizer.ts` | Browser MCP result unwrapping | Existing good pattern for backend-side envelope unwrapping. | Keep browser-specific checks while adding a general MCP projector. |
| `autobyteus-web/services/agentStreaming/handlers/toolLifecycleHandler.ts` | Frontend lifecycle result application | Stores backend `payload.result` as segment/activity result. | Frontend should remain passive if backend projection normalizes. |
| `autobyteus-web/components/progress/ToolActivityItem.vue` | Activity result rendering | `JSON.stringify(activity.result)` shows raw fields if present. | UI display is not the root cause. |

## Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-06-27 | Static trace | Source inspection from manifest -> service -> MCP adapter -> Codex converter -> frontend Activity | Direct task returns are typed; raw `structuredContent` can be introduced/preserved by MCP provider envelope and projection. | Enough to classify without spinning up full runtime. |
| 2026-06-27 | Setup check | `pnpm exec vitest --version` under fresh worktree `autobyteus-server-ts` | Fresh dedicated worktree did not have executable test deps linked (`Command "vitest" not found`). | No runtime test executed in this investigation pass. |

## External / Public Source Findings

- Public API / spec / issue / upstream source: None used.
- Version / tag / commit / freshness: N/A.
- Relevant contract, behavior, or constraint learned: N/A.
- Why it matters: N/A.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: Not used.
- Required config, feature flags, env vars, or accounts: Not used.
- External repos, samples, or artifacts cloned/downloaded for investigation: None.
- Setup commands that materially affected the investigation: Dedicated worktree creation and fast-forward to origin/personal.
- Cleanup notes for temporary investigation-only setup: None.

## Findings From Code / Docs / Data / Logs

1. `delegate_task` and `review_task_result` domain returns are clean typed task lifecycle results.
2. Native tools stringify those typed results.
3. Agent Tools MCP wraps those strings in standard MCP `content` blocks.
4. The backend MCP result mapper itself does not add `structuredContent` to built-in task-delegation operation results.
5. Codex local MCP completion payloads can include `structuredContent: null` / `_meta: null` even when the underlying MCP result did not semantically use structured content.
6. Backend Codex projection currently unwraps browser MCP results, but does not have a general MCP effective-result projector.
7. Frontend Activity renders the resulting backend payload directly, so raw MCP wrapper fields become visible.

## Constraints / Dependencies / Compatibility Facts

- MCP protocol responses must remain protocol-correct at the MCP JSON-RPC/provider boundary.
- App-facing Activity `result` should be effective output for all source-confirmed recognizable MCP tool-result envelopes, including configured MCP tools.
- Browser/media tools already have dedicated result normalizers and should not regress.
- Task-delegation service ownership should remain unchanged; only provider/app-facing result projection should be considered.

## Open Unknowns / Risks

- User confirmed the desired scope is general MCP effective-result projection, not task-delegation-only normalization.
- Need a runtime or unit test once dependencies are available to verify actual Codex and Claude envelope shapes.
- Rich/multimodal MCP content may need future UI rendering improvements after the top-level envelope is removed.

## Notes For Architect Reviewer

Architecture handoff package should use the revised general design direction:

- Governing owner for task lifecycle remains `TaskDelegationService`.
- Governing owner for provider-to-application lifecycle event result projection should be a general source-gated MCP effective-result projector called by Codex/Claude event converters only after MCP source eligibility is established.
- Do not change the MCP protocol response itself; normalize app-facing lifecycle payloads/run history surfaces.
- Do not preserve raw `_meta`/`structuredContent`/`content` as the normal Activity `result` for source-confirmed configured MCP tools; project the effective output instead.


## Scope Refinement From User Discussion (2026-06-27)

The initial design targeted task-delegation tools because they were the observed symptom. The user clarified that this should be a general MCP result behavior: Activity should show the effective tool result for any MCP-backed tool, not the raw protocol envelope. Therefore the final design should introduce a generic MCP effective-result projector and apply it in Codex/Claude provider event conversion. The projector should require MCP source context, omit top-level protocol metadata such as `_meta` from normal Activity `result`, prefer non-null `structuredContent`, parse JSON text content when valid, and leave non-MCP result objects unchanged by never running on non-MCP/source-unknown lanes.


## Architecture Review Round 2 Findings And Rework (2026-06-27)

Architecture reviewer rejected the first general-projector design. Blocking findings:

- DR-001: value-only projector contract could rewrite exact-envelope-shaped non-MCP domain objects. Resolution: revised requirements/design require source-confirmed MCP eligibility and mandatory projector source context. Codex eligibility is `mcp_tool_call` item family or raw MCP wire tool name; Claude eligibility is raw MCP wire tool name or explicit future MCP marker. Non-MCP/source-unknown lanes must not call the projector.
- DR-002: multi-text/rich-content and `isError: true` output/error shapes were underspecified. Resolution: revised design specifies single-text JSON/text behavior, multi-text `\n\n` joining, mixed/rich `{ items: [...] }` sanitized block output, structuredContent precedence, empty-content `null`, and deterministic error-message precedence with failed events carrying `error` and no successful `result`.
