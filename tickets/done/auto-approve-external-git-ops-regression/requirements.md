# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Design-ready and user-approved on 2026-06-09. User explicitly approved restoring the original high-trust Codex auto-approve behavior from `origin/personal` and rejected the current branch team-member auto-decline behavior as an unacceptable regression.

## Goal / Problem Statement

Fix a regression on branch `codex/mixed-team-manager-simplification-analysis` where Codex team-member runs with `autoExecuteTools=true` no longer receive the high-trust auto-approve/access behavior that exists on `origin/personal`. In the reported UI, `run_bash` operations that need writes outside the configured workspace root, such as Git metadata writes for `git add` / `git commit` in an external task worktree, are denied with `Tool execution denied.` even though the team configuration has `Auto approve tools` enabled.

The expected behavior is the `origin/personal` behavior established by the prior `codex-runtime-access-mapping-analysis` ticket: Codex `autoExecuteTools=true` is a high-trust per-run policy that auto-approves Codex tool calls and permission/access requests and starts/resumes Codex with effective `danger-full-access`, while non-auto-approved runs remain governed by the normal sandbox/approval policy. The ticket also includes a targeted audit of AutoByteus and Claude runtime auto-approval/permission behavior so stale tests or refactor changes do not silently rewrite runtime semantics.

## Investigation Findings

- The prior intended-behavior ticket exists at `tickets/done/codex-runtime-access-mapping-analysis/` and documents that `autoExecuteTools=true` must map to high-trust Codex access: `approvalPolicy: "never"`, effective `sandbox: "danger-full-access"`, and auto-grant for permission requests.
- `origin/personal` matches that contract:
  - `autobyteus-server-ts/src/agent-execution/backends/codex/backend/codex-thread-bootstrapper.ts` maps `autoExecuteTools=true` to `CodexApprovalPolicy.NEVER` and `resolveEffectiveCodexSandboxMode(true) === "danger-full-access"` for all Codex runs.
  - `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-tool-approval-coordinator.ts` auto-accepts terminal/file/MCP approvals and permission requests whenever `codexThread.runContext.config.autoExecuteTools` is true.
- The current refactor branch changed that behavior in commit `244e1060185522b0ed4fb389b786ce33747a9469` (`chore(ticket): checkpoint remove native team candidate`):
  - It added `isCodexTeamMemberRunConfig(...)` and makes Codex team-member runs ignore `autoExecuteTools` for thread config by returning configured/default approval policy and `normalizeSandboxMode()` instead of `CodexApprovalPolicy.NEVER` and `danger-full-access`.
  - It added `shouldAutoApproveRuntimeTool(...)` and `shouldAutoDeclineRuntimeTool(...)`; for team-member runs with `autoExecuteTools=true`, command/file/MCP approvals are explicitly responded with decline/no-grant.
- This exactly matches the screenshot: a Codex team member runs in `workspace-write` with writable root `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo`; an outside-workspace Git operation requires permission; the current branch auto-declines/no-grants the request for team members, and downstream event conversion displays `Tool execution denied.`.


- Targeted Claude audit so far found no analogous bootstrapper regression: `autobyteus-server-ts/src/agent-execution/backends/claude/backend/claude-session-bootstrapper.ts` is unchanged vs `origin/personal`, and `resolveClaudePermissionMode(autoExecuteTools)` still maps `true -> "bypassPermissions"` without a team-member exception.
- Targeted AutoByteus audit so far found no analogous `autoExecuteTools` policy regression in core tool approval: `autobyteus-ts/src/agent/loop/tool-phase.ts` is unchanged vs `origin/personal`, and `AutoByteusAgentRunBackendFactory` still passes `autoExecuteTools` directly into `AgentConfig`. Current AutoByteus changes are around team context/prompt/tool binding, and still require implementation validation to ensure no stale E2E-driven behavior rewrite occurred.
- User raised an explicit risk that stale E2E tests may have caused source behavior to be changed to satisfy outdated expectations. The accepted approach is the opposite: approved runtime behavior is authoritative, and stale tests must be updated to match it.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Bug Fix / Regression fix
- Initial design issue signal (`Yes`/`No`/`Unclear`): Yes
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Missing Invariant + Boundary Or Ownership Issue
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Likely Needed, but narrowly scoped
- Evidence basis:
  - `origin/personal` and `tickets/done/codex-runtime-access-mapping-analysis/design-spec.md` define `autoExecuteTools=true` as the authoritative Codex high-trust access policy.
  - Current branch commit `244e1060` special-cases `memberTeamContext` inside the Codex bootstrapper and approval coordinator, overriding the run-level auto-approve invariant.
  - Current code returns `workspace-write` and `on-request`/configured policy for team-member auto mode, and then auto-declines runtime local tool approvals for team members.
- Requirement or scope impact:
  - Restore the invariant that `autoExecuteTools=true` has the same Codex access semantics for standalone and team-member runs.
  - Keep dynamic team communication tools (`send_message_to`, task delegation, etc.) under their existing team-safe exposure/handler boundaries; the fix must not bypass team communication ownership.
  - Remove or replace tests that assert team-member auto mode should auto-decline Codex local runtime tools.

## Recommendations

1. Treat `CodexThreadBootstrapper` as the owner of effective Codex thread access configuration. Its `autoExecuteTools=true` mapping should not vary by `memberTeamContext`; both standalone and team-member Codex runs should receive `approvalPolicy: "never"` and effective `sandbox: "danger-full-access"`.
2. Treat `CodexToolApprovalCoordinator` as the owner of Codex server-request approval decisions. It should auto-approve/auto-grant all approval-capable Codex runtime surfaces when `autoExecuteTools=true`, including team-member runs.
3. Do not preserve the current branch's `auto-decline team-member runtime tools` policy. It contradicts the prior high-trust auto-approve contract and causes the reported denial.
4. Preserve team-scope safety by continuing to gate which dynamic tools are exposed to team members via configured tool exposure and team communication/task delegation handlers; do not use Codex approval policy to block all local runtime shell/file permissions for team members.
5. Add focused regression tests for Codex team-member `autoExecuteTools=true` create/restore config and permission/terminal approval handling.

## Scope Classification (`Small`/`Medium`/`Large`)

Medium. The code change should be small, but the fix touches a cross-cutting invariant between Codex thread bootstrap configuration and server-request approval handling, and it must intentionally reverse current-branch tests introduced during a large team-runtime refactor.

## In-Scope Use Cases

- UC-001: A Codex team member launched with inherited or overridden `autoExecuteTools=true` can perform a shell/Git operation that requires outside-workspace write permission; Codex is started/resumed in effective high-trust access mode and any emitted permission request is auto-granted.
- UC-002: A Codex standalone run with `autoExecuteTools=true` keeps existing high-trust behavior.
- UC-003: A Codex team member with `autoExecuteTools=false` continues to use normal visible approval/manual denial behavior for command/file/MCP/permission requests.
- UC-004: Team communication/task-delegation dynamic tools remain constrained by existing configured tool exposure and team-owned handlers; restoring runtime shell/file auto-approval must not create a new team message routing bypass.
- UC-005: The regression source is documented by comparing `origin/personal` with the current branch and the prior access-mapping ticket.
- UC-006: AutoByteus and Claude runtime auto-approval/permission behavior is audited against `origin/personal` so analogous silent refactor regressions are caught or explicitly ruled out.
- UC-007: Validation distinguishes stale/outdated E2E expectations from authoritative product behavior; source code must not be changed merely to satisfy stale tests.

## Out of Scope

- Broad redesign of Codex App Server sandbox modes.
- Unconditional full access for runs where `autoExecuteTools=false`.
- Reintroducing specialized Codex team managers removed by the mixed-team refactor.
- Changing team communication routing, recipient resolution, or dynamic tool exposure policy except where tests must assert they still remain separate from Codex shell/file approval.
- Rewriting AutoByteus or Claude runtime semantics unless the targeted audit finds a concrete regression against `origin/personal`/approved behavior.
- Changing deployment/finalization target away from `codex/mixed-team-manager-simplification-analysis`.

## Functional Requirements

- REQ-001: For every Codex run configuration, including team-member configurations with non-null `memberTeamContext`, `autoExecuteTools=true` MUST resolve to `CodexApprovalPolicy.NEVER` for `CodexThreadConfig.approvalPolicy`.
- REQ-002: For every Codex run configuration, including team-member configurations with non-null `memberTeamContext`, `autoExecuteTools=true` MUST resolve to effective `CodexThreadConfig.sandbox === "danger-full-access"` regardless of saved `CODEX_APP_SERVER_SANDBOX` value.
- REQ-003: For Codex server requests from a run with `autoExecuteTools=true`, including team-member runs, command execution, file change, MCP tool, and permission requests MUST be auto-accepted/auto-granted rather than declined/no-granted.
- REQ-004: For Codex server requests from a run with `autoExecuteTools=false`, existing manual approval behavior MUST remain: requests are recorded/emitted for user approval and are not auto-granted.
- REQ-005: Team-member dynamic tools MUST continue to execute according to existing configured tool exposure and handler registration rules; Codex runtime shell/file permission auto-approval MUST NOT become the owner of team communication routing.
- REQ-006: Tests that currently encode `auto-decline Codex local runtime tools for team members` MUST be replaced with tests that encode the restored high-trust auto-approve invariant.
- REQ-007: Investigation and handoff artifacts MUST cite the prior `codex-runtime-access-mapping-analysis` ticket and the current-branch commit that introduced the regression.
- REQ-008: The implementation/validation package MUST include a targeted AutoByteus audit proving that `autoExecuteTools` behavior remains aligned with `origin/personal` or documenting any concrete regression and routing it back through requirements/design before code changes.
- REQ-009: The implementation/validation package MUST include a targeted Claude audit, especially around `ClaudeSessionBootstrapper`, `resolveClaudePermissionMode(...)`, and tool permission handling, proving behavior remains aligned with `origin/personal` or documenting any concrete regression and routing it back through requirements/design before code changes.
- REQ-010: If a test expectation conflicts with approved runtime behavior, the test MUST be treated as stale until proven otherwise; source behavior MUST NOT be changed solely to satisfy stale E2E tests.
- REQ-011: Any E2E or unit test updated in this ticket MUST encode the approved behavior from `origin/personal`/this requirements doc, not the current branch's accidental team-member auto-decline behavior.

## Acceptance Criteria

- AC-001: A focused bootstrapper test shows a Codex team-member run with `autoExecuteTools=true` and saved sandbox `workspace-write` produces `approvalPolicy: "never"` and `sandbox: "danger-full-access"` for both create and restore.
- AC-002: A focused `CodexToolApprovalCoordinator`/`CodexThread` test shows a team-member `autoExecuteTools=true` command execution approval request responds `{ decision: "accept" }` and emits a local approved event instead of `{ decision: "decline" }`.
- AC-003: A focused permission-request test shows a team-member `autoExecuteTools=true` permission request responds with the requested permission profile and `scope: "session"` instead of a no-grant profile.
- AC-004: Existing standalone Codex auto-approve tests still pass.
- AC-005: Existing manual-mode Codex approval tests still pass.
- AC-006: Tests or source inspection show team dynamic tools remain handled through dynamic tool handlers / configured exposure, not through a broad team-routing bypass.
- AC-007: Documentation/investigation notes identify commit `244e1060185522b0ed4fb389b786ce33747a9469` as the current-branch change that overrode the `origin/personal` auto-approve/access behavior.
- AC-008: A targeted Claude audit is recorded; if no regression is found, it specifically states that `ClaudeSessionBootstrapper` and `resolveClaudePermissionMode(...)` match `origin/personal` for `autoExecuteTools=true`.
- AC-009: A targeted AutoByteus audit is recorded; if no regression is found, it specifically states that core `autobyteus-ts` tool approval behavior and server `AgentConfig(autoExecuteTools)` propagation match `origin/personal`.
- AC-010: Test changes are reviewed for stale-E2E risk; any changed test expectation has an evidence note tying it to approved behavior rather than adapting source code to outdated tests.

## Constraints / Dependencies

- Authoritative task worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/auto-approve-external-git-ops-regression`.
- Base branch for this ticket: `origin/codex/mixed-team-manager-simplification-analysis`, per user instruction.
- Comparison baseline: `origin/personal` at `36b2dbd6d5bfba4634db19d7fbb7e60df27487ec`.
- Prior intended-behavior artifact package: `tickets/done/codex-runtime-access-mapping-analysis/`.
- The task worktree currently lacks local `node_modules`/`vitest`; downstream implementation or validation may need dependency setup or use an existing prepared checkout for test execution.
- E2E tests are not authoritative when stale; product requirements and verified `origin/personal` behavior are authoritative for this regression.

## Assumptions

- The user-reported denied `run_bash` events are emitted by Codex App Server command execution approval/permission logic for Codex team-member runs.
- The intended product behavior is the documented `origin/personal` behavior: `Auto approve tools` is high-trust and grants effective full access for the run.
- Team members should not be less trusted than standalone Codex runs when the same per-run/team launch config has explicitly enabled auto-approval.

## Risks / Open Questions

- The refactor may have introduced the team-member auto-decline rule to mitigate an unstated safety concern. The proposed design keeps safety at the explicit `autoExecuteTools` switch plus existing dynamic tool exposure boundaries; if another safety invariant exists, architecture review should surface it explicitly.
- Full UI reproduction is not yet run in this worktree because dependencies are unavailable; focused unit tests should cover the owner logic directly.
- If Codex App Server has changed protocol response shapes after the prior ticket, API/E2E should revalidate permission grant responses, but current source still contains the prior response builders.

## Requirement-To-Use-Case Coverage

| Requirement | Use Case(s) |
| --- | --- |
| REQ-001 | UC-001, UC-002 |
| REQ-002 | UC-001, UC-002 |
| REQ-003 | UC-001 |
| REQ-004 | UC-003 |
| REQ-005 | UC-004 |
| REQ-006 | UC-001, UC-003 |
| REQ-007 | UC-005 |
| REQ-008 | UC-006, UC-007 |
| REQ-009 | UC-006, UC-007 |
| REQ-010 | UC-007 |
| REQ-011 | UC-001, UC-006, UC-007 |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criterion | Scenario Intent |
| --- | --- |
| AC-001 | Proves team-member bootstrap config no longer downgrades auto mode. |
| AC-002 | Proves the reported `run_bash` approval denial path is restored to accept. |
| AC-003 | Proves outside-workspace permission requests are auto-granted for trusted team-member auto mode. |
| AC-004 | Prevents standalone auto-approve regression. |
| AC-005 | Prevents unsafe over-approval in manual mode. |
| AC-006 | Preserves team communication ownership boundaries. |
| AC-007 | Satisfies the requested branch comparison/root-cause analysis. |
| AC-008 | Confirms Claude did not receive an analogous silent permission-mode regression, or routes any finding properly. |
| AC-009 | Confirms AutoByteus did not receive an analogous silent auto-approval regression, or routes any finding properly. |
| AC-010 | Prevents stale tests from becoming the de facto behavior owner. |

## Approval Status

User-approved on 2026-06-09. Proceed to design and architecture review.
