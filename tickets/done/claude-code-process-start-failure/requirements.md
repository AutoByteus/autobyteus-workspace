# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Refined

## Goal / Problem Statement

Fix the Claude Agent SDK runtime startup failure observed in a classroom simulation team inside the Docker/server environment. The reported UI error is `Error: Claude Code process exited with code 1`. In the reproduced container, the classroom team member `professor` was launched with `runtimeKind: claude_agent_sdk` and `autoExecuteTools: true`; the backend maps that AutoByteus auto-approval policy to Claude SDK `permissionMode: "bypassPermissions"`. Claude Code v2.1.195 refuses that mode when the server process runs as `root` in the Docker image, so the Claude Code child process exits with code 1 before the team member can respond.

The fix must separate AutoByteus tool auto-approval from Claude Code's root-forbidden dangerous permission bypass and must improve diagnostics so future Claude startup/auth failures surface the actionable cause instead of only `exited with code 1`.

## Investigation Findings

- Current container process list shows the server running as `root` with `node dist/app.js --host 0.0.0.0 --port 8000 --data-dir /home/autobyteus/data`.
- Server log `/home/autobyteus/data/logs/server.log` records the classroom run creation and then `Claude runtime turn failed for run 'professor_a3306d07a80e438880d0cf69fba14b9d': Error: Claude Code process exited with code 1`.
- Team metadata for `classroomsimulation_2ff73fe2fbb14f1cbd488b8971ead0c7` records the `professor` member with `runtimeKind: "claude_agent_sdk"`, `llmModelIdentifier: "default"`, `autoExecuteTools: true`, and workspace `/home/autobyteus/workspace`.
- Current code maps `autoExecuteTools=true` to `permissionMode: "bypassPermissions"` in `claude-session-config.ts`, then `ClaudeSdkClient.buildQueryOptions` passes that mode to the Anthropic SDK/Claude Code process.
- A focused probe matching the team member's effective Claude options (`--permission-mode bypassPermissions`) captured the real hidden stderr: `--dangerously-skip-permissions cannot be used with root/sudo privileges for security reasons`, followed by `Claude Code process exited with code 1`.
- A second probe with `permissionMode: "default"` confirmed the container currently also lacks usable Claude auth (`Not logged in · Please run /login` / `authentication_failed`). That is a separate environment prerequisite, but current runtime handling can also hide or misclassify it.
- Official Claude docs and local settings inspection confirm Claude's built-in sandbox is not enabled by default (`sandbox.enabled` default is false); users must explicitly enable Claude sandboxing or rely on an external container/VM boundary if they want execution isolation.
- User clarification on 2026-06-29 accepted the `permissionMode: "default"` direction but requires complete validation for write/delete and command behavior both inside the workspace and against a safe outside-workspace scratch path, because prior `bypassPermissions` usage may have masked outside-workspace permission prompts.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Bug Fix
- Initial design issue signal (`Yes`/`No`/`Unclear`): Yes
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Likely Needed
- Evidence basis: `autoExecuteTools` is an AutoByteus run-level approval policy, but current Claude session config encodes it as Claude Code `bypassPermissions`, a provider permission mode with stricter process/user constraints. This crosses the boundary between AutoByteus approval orchestration and Claude Code process permission mode.
- Requirement or scope impact: The fix must decouple approval policy from provider permission mode, preserve auto-approval semantics through the existing Claude tool permission coordinator / SDK `canUseTool` callback, and add diagnostic capture/classification at the Claude SDK process boundary.

## Recommendations

- Stop deriving Claude SDK `permissionMode` from `autoExecuteTools` for normal run/team launches. Use Claude `permissionMode: "default"` unless a future explicit provider-permission setting is introduced and validated.
- Store/pass AutoByteus `autoExecuteTools` as its own Claude runtime-context policy, and let `ClaudeSessionToolUseCoordinator` auto-approve permission checks when that flag is true.
- Pass a redacted stderr diagnostic collector into Claude SDK query options and use it when emitting/logging runtime startup failures.
- Treat Claude SDK terminal result chunks with `is_error: true` and/or `error: "authentication_failed"` as runtime errors, not successful completed turns.
- Update stale docs/tests that currently imply auto-approve or `CLAUDE_AGENT_SDK_PERMISSION_MODE=bypassPermissions` is the steady-state Docker launch behavior.
- Require coverage that proves `permissionMode: "default"` + AutoByteus auto-approval works for permission-gated write/delete/shell cases inside the workspace and in a safe disposable outside-workspace path without falling back to `bypassPermissions`.

## Scope Classification (`Small`/`Medium`/`Large`)

Medium

## In-Scope Use Cases

- UC-001: A Docker-hosted classroom simulation/team member using Claude Agent SDK with `autoExecuteTools=true` does not launch Claude Code with the root-forbidden `bypassPermissions` mode.
- UC-002: Claude Agent SDK `autoExecuteTools=true` still auto-approves provider tool permission checks without a user approval stop.
- UC-003: Claude Agent SDK `autoExecuteTools=false` still preserves manual approval behavior.
- UC-004: When Claude Code exits during startup or returns a terminal auth/error result, the backend and UI expose an actionable sanitized cause.
- UC-005: Missing Claude authentication in the container is classified as an auth/runtime setup error, not as a successful assistant turn.
- UC-006: Claude Agent SDK auto-approval behavior is validated for representative write, delete, and shell-command operations under both the run workspace and a safe outside-workspace scratch directory.

## Out of Scope

- Implementing a new Claude account/login flow inside Autobyteus.
- Persisting or managing Anthropic secrets beyond existing Docker/root volume behavior.
- Reworking Codex runtime sandbox/full-access policy.
- Replacing the Anthropic Claude Agent SDK dependency.
- Changing model selection semantics for the `default` Claude model alias.

## Functional Requirements

- REQ-CLAUDE-START-001: Claude Agent SDK run/team launches MUST NOT translate AutoByteus `autoExecuteTools=true` into Claude SDK `permissionMode: "bypassPermissions"` for the standard runtime path.
- REQ-CLAUDE-START-002: Claude Agent SDK launches MUST preserve `autoExecuteTools=true` as an AutoByteus approval policy that auto-allows Claude SDK permission callbacks through the existing tool permission coordinator or equivalent SDK `canUseTool` boundary.
- REQ-CLAUDE-START-003: Claude Agent SDK launches with `autoExecuteTools=false` MUST continue to request user approval for permission-gated tools through the existing runtime approval lifecycle.
- REQ-CLAUDE-START-004: The Claude runtime MUST capture a sanitized bounded stderr/process diagnostic summary from Claude Code startup and include that summary in logs and runtime error payloads when the SDK only reports a generic process exit.
- REQ-CLAUDE-START-005: Claude SDK terminal result chunks that indicate provider/runtime failure (`is_error: true`, `error`, or authentication failure markers) MUST emit a runtime `ERROR` and error status instead of `TURN_COMPLETED`.
- REQ-CLAUDE-START-006: Authentication setup failures MUST surface an actionable message such as `Not logged in · Please run /login` when that message is emitted by Claude Code/SDK.
- REQ-CLAUDE-START-007: Durable tests MUST cover the run-level permission-policy mapping, auto-approval/manual-approval separation, root-forbidden bypass regression, and terminal auth/error classification without requiring live Claude credentials.
- REQ-CLAUDE-START-008: Documentation impacted by the changed Claude auto-approval/permission-mode behavior MUST be updated or explicitly recorded as no-impact by delivery.
- REQ-CLAUDE-START-009: Durable validation MUST cover permission-gated write, delete, and shell-command operations for `autoExecuteTools=true` using `permissionMode: "default"` both inside the run workspace and against a test-created safe outside-workspace scratch path, without requiring `permissionMode: "bypassPermissions"` and without a manual approval stop.
- REQ-CLAUDE-START-010: Durable validation MUST cover that `autoExecuteTools=false` still gates representative permission-sensitive operations, including at least one outside-workspace scratch-path case, until explicit approval is provided or denial/timeout occurs.

## Acceptance Criteria

- AC-CLAUDE-START-001: A unit/integration boundary test for a Claude run config with `autoExecuteTools=true` verifies the SDK query options use `permissionMode: "default"` (or omit provider bypass) and do not contain `permissionMode: "bypassPermissions"`.
- AC-CLAUDE-START-002: A test verifies `autoExecuteTools=true` causes the Claude permission coordinator/callback to approve a tool request without emitting a public approval-required stop.
- AC-CLAUDE-START-003: A test verifies `autoExecuteTools=false` still emits/awaits the normal approval request path before allowing a permission-gated tool.
- AC-CLAUDE-START-004: A mocked/stubbed Claude process or SDK test supplies stderr containing the root/sudo restriction; the runtime error/log output includes a sanitized actionable message instead of only `Claude Code process exited with code 1`.
- AC-CLAUDE-START-005: A mocked/stubbed Claude SDK stream with an authentication-failed assistant/result payload (`Not logged in · Please run /login`, `is_error: true`) produces runtime `ERROR`/error status and does not emit `TURN_COMPLETED` for that turn.
- AC-CLAUDE-START-006: Existing Claude session lifecycle behavior still emits `TURN_STARTED`, text/tool events, token usage, and `TURN_COMPLETED` for non-error successful result chunks.
- AC-CLAUDE-START-007: The classroom/team-member path remains covered: team launch preset -> mixed member config -> `AgentRunConfig.autoExecuteTools` -> Claude session runtime context -> SDK query options.
- AC-CLAUDE-START-008: A durable non-live test harness or controlled SDK/session integration test verifies `autoExecuteTools=true` auto-allows representative Claude tool requests for: workspace file write, workspace file delete, workspace shell command, outside-scratch file write, outside-scratch file delete, and outside-scratch shell command, while SDK options remain `permissionMode: "default"` / non-bypass and no approval-required stop is emitted.
- AC-CLAUDE-START-009: A manual-mode test verifies `autoExecuteTools=false` does not execute at least one representative outside-scratch permission-sensitive operation before the normal approval lifecycle resolves, proving the outside-workspace path did not become an unconditional bypass.
- AC-CLAUDE-START-010: Any outside-workspace test path is a disposable test-created scratch directory (for example under `/tmp`) and tests MUST NOT write/delete sensitive persistent locations such as `/root`, `/home/autobyteus/data`, repository control directories, or host-mounted production folders.

## Constraints / Dependencies

- The Docker all-in-one/server runtime currently runs the Node server as `root`; the fix must work in that environment.
- Claude Code v2.1.195 rejects dangerous skip/bypass permissions when running as root/sudo.
- `@anthropic-ai/claude-agent-sdk@0.2.71` exposes a `stderr` callback and `canUseTool` permission callback in query options.
- The container must still have usable Claude auth (CLI/OAuth or API-key mode) for successful live Claude runs; this ticket should surface missing auth but not create credentials.
- Maintain no backward-compatibility dual path for the incorrect auto-approve-to-bypass mapping.

## Assumptions

- `autoExecuteTools` is intended to mean AutoByteus auto-approval of model-selected tools, not provider-level dangerous permission bypass.
- `permissionMode: "default"` plus a `canUseTool` callback can preserve AutoByteus auto-approval semantics without invoking Claude Code's root-forbidden bypass mode.
- Claude's built-in sandbox is opt-in; the standard fix does not enable sandboxing. If users want a sandbox, they must enable Claude sandbox settings or run Claude inside an explicit container/VM/sandbox runtime.
- Safe outside-workspace coverage should use disposable scratch paths and should validate approval behavior, not arbitrary access to sensitive container or host data.
- Existing direct `ClaudeSdkClient` tests that intentionally pass `permissionMode: "default"` with `autoExecuteTools: true` represent the healthier target shape.

## Risks / Open Questions

- If future product requirements need explicit Claude `bypassPermissions`, that should be introduced as a separate provider-permission setting with root/sudo preflight validation, not coupled to `autoExecuteTools`.
- Live validation still depends on configuring Claude auth inside the container/root home or API-key environment.
- Some existing tests may assert the old `resolveClaudePermissionMode(true) === "bypassPermissions"` behavior and must be updated.
- Outside-workspace validation can be unsafe if it targets real persistent/server-owned paths; tests must use disposable scratch directories and cleanup.

## Requirement-To-Use-Case Coverage

| Use Case | Requirements |
| --- | --- |
| UC-001 | REQ-CLAUDE-START-001, REQ-CLAUDE-START-007 |
| UC-002 | REQ-CLAUDE-START-002, REQ-CLAUDE-START-007 |
| UC-003 | REQ-CLAUDE-START-003, REQ-CLAUDE-START-007 |
| UC-004 | REQ-CLAUDE-START-004, REQ-CLAUDE-START-005 |
| UC-005 | REQ-CLAUDE-START-005, REQ-CLAUDE-START-006 |
| UC-006 | REQ-CLAUDE-START-002, REQ-CLAUDE-START-003, REQ-CLAUDE-START-007, REQ-CLAUDE-START-009, REQ-CLAUDE-START-010 |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criterion | Scenario Intent |
| --- | --- |
| AC-CLAUDE-START-001 | Prevent the exact Docker/root `bypassPermissions` startup failure. |
| AC-CLAUDE-START-002 | Preserve auto-approve behavior after decoupling provider permission mode. |
| AC-CLAUDE-START-003 | Preserve manual approval behavior. |
| AC-CLAUDE-START-004 | Make hidden Claude Code stderr startup failures actionable. |
| AC-CLAUDE-START-005 | Classify missing auth/provider error results as runtime errors. |
| AC-CLAUDE-START-006 | Avoid regressing successful Claude turns. |
| AC-CLAUDE-START-007 | Ensure the team/classroom path, not only direct SDK calls, is covered. |
| AC-CLAUDE-START-008 | Prove auto-approval under default mode works for inside-workspace and safe outside-workspace write/delete/command operations without hidden prompts. |
| AC-CLAUDE-START-009 | Prove manual mode still gates outside-workspace permission-sensitive operations. |
| AC-CLAUDE-START-010 | Keep outside-workspace coverage safe and disposable. |

## Approval Status

Requirements are refined from the user's explicit bug report, current-container evidence, official Claude docs, and 2026-06-29 user clarification. User explicitly agreed with the `permissionMode: "default"` solution direction after confirming Claude sandboxing is manual/opt-in, and requested complete inside/outside-workspace coverage before task kickoff.
