# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Design-ready

## Goal / Problem Statement

Fix the Codex backend auto-approval semantics so `autoExecuteTools=true` behaves the way operators expect: tool execution and tool-related permission/access requests are automatically allowed instead of silently failing behind the workspace sandbox or bypassing only part of the approval surface. When `autoExecuteTools=false`, all Codex tool surfaces that need user consent must use the visible backend approval flow consistently.

## Investigation Findings

- "Codex full access" is a filesystem sandbox/access setting. It is stored as the server setting / env var `CODEX_APP_SERVER_SANDBOX`, normalized to one of `read-only`, `workspace-write`, or `danger-full-access`, and passed to Codex App Server as the `sandbox` field on `thread/start` and `thread/resume`.
- The Basics UI maps the full-access toggle as:
  - on -> `danger-full-access`
  - off -> `workspace-write`
  - default -> `workspace-write`
- "Auto approve tools" is a per-run launch configuration field named `autoExecuteTools`. For Codex, backend bootstrap currently maps it to `approvalPolicy`:
  - `autoExecuteTools: true` -> `approvalPolicy: "never"`
  - `autoExecuteTools: false` -> `approvalPolicy: "on-request"`
- Current backend approval handling is uneven:
  - Shell command approvals are handled via `item/commandExecution/requestApproval`.
  - File-change approvals are handled via `item/fileChange/requestApproval`.
  - Simple MCP tool elicitations are handled via `mcpServer/elicitation/request`, and are auto-accepted when `autoExecuteTools=true`.
  - Backend-registered Codex dynamic tools (`item/tool/call`, including `send_message_to`, browser, media, and `publish_artifacts`) execute directly once the request reaches the backend; there is no explicit backend approval gate when `autoExecuteTools=false`.
  - Codex App Server protocol includes `item/permissions/requestApproval`, but the current backend request handler does not support it.
- With `autoExecuteTools=true` and sandbox still `workspace-write`, Codex is told not to ask for approval (`approvalPolicy: never`) while still being sandbox-limited (`sandbox: workspace-write`). If a command/tool needs broader access, the user can see an internal failure or missing action instead of an approval prompt.
- User clarified the product expectation: `autoExecuteTools=true` means the run should automatically allow the access needed by tool execution. Silent internal failure due to suppressed/missing permission approval is a bug.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Bug Fix + Behavior Change
- Initial design issue signal (`Yes`/`No`/`Unclear`): Yes
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue + Missing Invariant
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Likely Needed
- Evidence basis: Local backend/frontend code, README/docs, Codex CLI app-server generated JSON schema.
- Requirement or scope impact: The Codex approval boundary must cover command/file approvals, MCP elicitations, dynamic tool calls, and permission-escalation requests. The `autoExecuteTools` contract must be enforced consistently in both auto and manual modes.

## Recommendations

- Make `autoExecuteTools` the authoritative per-run Codex tool-access policy for every Codex server-request tool surface.
- In `autoExecuteTools=true` mode, ensure tool execution does not silently fail because the sandbox/permission path still needs user approval. The target should either run the Codex thread with an effective full-access sandbox for that run or auto-grant Codex permission-escalation requests; the safest complete behavior is to do both defensively.
- In `autoExecuteTools=false` mode, dynamic tool calls and permission-escalation requests must surface `TOOL_APPROVAL_REQUESTED` and wait for user approval, matching command/file/MCP approval behavior.
- Add API/E2E tests that prove both auto and manual modes for dynamic tools and permission escalation, plus regression coverage that no dynamic tool handler runs before approval in manual mode.
- Update durable docs/UI copy so users understand that `autoExecuteTools=true` is a high-trust mode that auto-allows tool access for the run.

## Scope Classification (`Small`/`Medium`/`Large`)

Medium

## In-Scope Use Cases

- UC-1: Start a Codex run with `autoExecuteTools=true` and execute shell/file/MCP/dynamic tools without visible approval prompts.
- UC-2: Start a Codex run with `autoExecuteTools=true` and avoid silent failure when Codex needs broader tool permission/access.
- UC-3: Start a Codex run with `autoExecuteTools=false` and require visible user approval before shell/file/MCP/dynamic tool execution or permission escalation proceeds.
- UC-4: Approve or deny a pending Codex dynamic-tool or permission-escalation request through the existing backend approval boundary.

## Out of Scope

- Changing Claude or AutoByteus runtime approval semantics.
- Adding new UI approval choices such as "approve for session" unless needed by Codex permission response shape; existing approve/deny actions are sufficient.
- Replacing the global Codex full-access setting UI beyond copy/docs updates needed to explain the new relationship.
- Supporting persistent user-defined Codex exec/network policy amendments beyond the current approve/deny flow.

## Functional Requirements

- REQ-1: When a Codex thread is created or resumed with `autoExecuteTools=true`, the backend must configure the thread so tool execution is not blocked by missing user approval or suppressed sandbox permission prompts.
- REQ-2: When `autoExecuteTools=true`, backend handling for `item/commandExecution/requestApproval`, `item/fileChange/requestApproval`, `mcpServer/elicitation/request`, `item/tool/call`, and `item/permissions/requestApproval` must automatically approve, execute, or grant the requested action without surfacing a user approval prompt.
- REQ-3: When `autoExecuteTools=false`, backend handling for the same Codex server-request surfaces must either emit a visible `TOOL_APPROVAL_REQUESTED` event and wait for user approval, or reject invalid/unavailable tool requests with a clear tool result; it must not execute valid dynamic tool handlers before approval.
- REQ-4: Manual approval through existing GraphQL/WebSocket paths must resume the pending Codex action and respond to Codex App Server with the correct response shape for command/file, MCP, dynamic-tool, and permission-escalation requests.
- REQ-5: Manual denial must not execute dynamic tool handlers and must not grant requested permissions; Codex must receive a clear decline/no-grant/failure response so the turn can continue or report denial explicitly.
- REQ-6: The implementation must keep `autoExecuteTools` as the single per-run authority for Codex approval behavior and avoid duplicating policy across unrelated handlers.
- REQ-7: Durable docs and/or UI copy must state that Codex auto-approve is a high-trust mode that auto-allows tool access/permissions for the run, and that full-access settings still control non-auto-approved Codex sessions.
- REQ-8: API/E2E validation must cover dynamic tools and permission-escalation behavior in both `autoExecuteTools=true` and `autoExecuteTools=false` modes.

## Acceptance Criteria

- AC-1: A Codex run with `autoExecuteTools=true` no longer silently fails because Codex emits `item/permissions/requestApproval`; the backend handles the request and grants the requested permission automatically.
- AC-2: A Codex run with `autoExecuteTools=true` executes backend dynamic tools directly and produces normal lifecycle/result events without a user approval prompt.
- AC-3: A Codex run with `autoExecuteTools=false` emits `TOOL_APPROVAL_REQUESTED` for a backend dynamic tool call and does not invoke the dynamic handler before approval.
- AC-4: Approving that pending dynamic tool request invokes the handler exactly once and returns the handler result to Codex.
- AC-5: Denying that pending dynamic tool request does not invoke the handler and returns a clear failure/denial result to Codex.
- AC-6: A Codex run with `autoExecuteTools=false` emits a visible approval request for `item/permissions/requestApproval` and grants the requested permission only after approval.
- AC-7: Denying a permission-escalation request grants no additional filesystem/network permission.
- AC-8: Existing shell command, file-change, and MCP approval behavior continues to pass in both auto and manual modes.
- AC-9: Tests assert the effective Codex thread config for `autoExecuteTools=true` prevents workspace-sandbox permission dead ends according to the target design.
- AC-10: Documentation/UI copy communicates the high-trust auto-approve behavior clearly enough that a user is not surprised that access is automatically allowed for that run.

## Constraints / Dependencies

- Use local repository code as the implementation authority.
- Codex App Server protocol reference comes from local Codex CLI `0.135.0` generated JSON schema.
- Preserve existing GraphQL/WebSocket approval entrypoints and existing `TOOL_APPROVAL_REQUESTED` event naming where possible.
- Full-access server setting changes still apply to future sessions; this change may compute an effective per-run sandbox for auto-approved Codex runs.

## Assumptions

- "Backend Codex runtime" refers to the Codex App Server integration under `autobyteus-server-ts/src/agent-execution/backends/codex` and `autobyteus-server-ts/src/runtime-management/codex`.
- `autoExecuteTools=true` is intentionally a high-trust mode for Codex runs.
- A denied Codex permission request can be represented by returning an empty/no-op granted permission profile to Codex App Server; implementation should verify this with protocol tests and adjust if the generated schema requires a different denial shape.
- Existing approve/deny UI can carry dynamic-tool and permission-request approvals if payloads include `invocation_id`, `tool_name`, and arguments/reason details.

## Risks / Open Questions

- Permission-denial response semantics are less explicit than command/file/MCP denial because `PermissionsRequestApprovalResponse` contains a granted permission profile rather than a `decision` field. Validation should confirm the correct no-grant response shape.
- Automatically elevating effective sandbox/access when `autoExecuteTools=true` is security-sensitive; docs/UI copy must make the trust boundary clear.
- Live Codex E2E tests may be slow/flaky; add unit coverage for request-handler behavior plus live/integration coverage where practical.

## Requirement-To-Use-Case Coverage

- REQ-1 -> UC-1, UC-2
- REQ-2 -> UC-1, UC-2
- REQ-3 -> UC-3
- REQ-4 -> UC-4
- REQ-5 -> UC-4
- REQ-6 -> UC-1, UC-2, UC-3, UC-4
- REQ-7 -> UC-1, UC-2, UC-3
- REQ-8 -> UC-1, UC-2, UC-3, UC-4

## Acceptance-Criteria-To-Scenario Intent

- AC-1 -> auto-approved permission escalation does not silently fail.
- AC-2 -> existing dynamic-tool auto behavior remains immediate and visible.
- AC-3 -> manual mode gates dynamic tools before execution.
- AC-4 -> manual approval resumes dynamic tool execution.
- AC-5 -> manual denial blocks dynamic tool execution.
- AC-6 -> manual mode surfaces permission escalation.
- AC-7 -> manual denial does not grant permission.
- AC-8 -> existing approval paths do not regress.
- AC-9 -> config-level regression for effective auto-approved access.
- AC-10 -> operator expectation is documented and visible.

## Approval Status

Approved by user on 2026-06-02 in conversation: user stated the requirement is clear and asked to kick off the ticket.
