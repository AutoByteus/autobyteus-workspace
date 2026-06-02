# Investigation Notes

## Investigation Status

- Bootstrap Status: Complete
- Current Status: Requirements clarified and design-ready; implementation design pending
- Investigation Goal: Clarify current Codex full-access/auto-approve mapping and define the implementation scope needed to make auto-approval cover all Codex tool/access approval surfaces without silent failure.
- Scope Classification (`Small`/`Medium`/`Large`): Medium
- Scope Classification Rationale: Cross-cutting Codex approval behavior change across thread config, server-request handling, pending approval records, docs, and API/E2E validation.
- Scope Summary: Fix Codex auto-approve semantics so auto-approved runs automatically allow all tool access/permissions, while manual runs consistently gate dynamic tools and permission escalation through visible approval.
- Primary Questions To Resolve:
  - What does "full access" map to in Codex configuration? Answer: `CODEX_APP_SERVER_SANDBOX` -> `sandbox` on thread start/resume.
  - What does "approve all tool calls" map to in Codex configuration? Answer: `autoExecuteTools` -> `approvalPolicy` plus local MCP approval auto-accept.
  - Are the controls independent or coupled? Answer: independent axes in current code.
  - Why might auto-approval without full access behave strangely? Answer: `approvalPolicy: never` prevents prompts, while `sandbox: workspace-write` still restricts access.

## Request Context

User asked: "could you help me find out in our backend Codex runtime, what is the difference between full access and also approve all tool calls, what are thedifference between these two mappped to codex itself. Because i dont know why, without full access with just auto approve tool call, it seems something strange is happening"

User clarification on 2026-06-02: `autoExecuteTools=true` means the user expects all tool-related access and permission to be automatically allowed for the run. A silent internal failure caused by suppressed/missing permission approval is considered a bug. User asked to kick off the implementation ticket after investigation.

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-runtime-access-mapping-analysis`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-runtime-access-mapping-analysis/tickets/codex-runtime-access-mapping-analysis`
- Current Branch: `codex/codex-runtime-access-mapping-analysis`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-runtime-access-mapping-analysis`
- Bootstrap Base Branch: `origin/personal`
- Remote Refresh Result: `git fetch origin --prune` completed successfully on 2026-06-02.
- Task Branch: `codex/codex-runtime-access-mapping-analysis`
- Expected Base Branch (if known): `origin/personal`
- Expected Finalization Target (if known): `personal`
- Bootstrap Blockers: None
- Notes For Downstream Agents: User requested kickoff. Proceed through design review and implementation for Codex approval-surface enhancement.

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-06-02 | Command | `pwd && git rev-parse --show-toplevel && git status --short --branch && git remote -v && git branch --show-current && git symbolic-ref refs/remotes/origin/HEAD` | Bootstrap repo context | Workspace is git repo on `personal`; origin default resolves to `origin/personal`. | No |
| 2026-06-02 | Command | `git fetch origin --prune` | Refresh tracked base branch before task worktree creation | Completed successfully. | No |
| 2026-06-02 | Command | `git worktree add -b codex/codex-runtime-access-mapping-analysis /Users/normy/autobyteus_org/autobyteus-worktrees/codex-runtime-access-mapping-analysis origin/personal` | Create dedicated task worktree | Dedicated worktree created at commit `1678dc82`. | No |
| 2026-06-02 | Doc | `README.md` lines 236-252 | Check documented full-access behavior | Full access is documented as `CODEX_APP_SERVER_SANDBOX=danger-full-access`; toggle off saves `workspace-write`; default `workspace-write`; changes apply to new/future Codex sessions. | No |
| 2026-06-02 | Doc | `autobyteus-web/docs/settings.md` lines 264-283 | Check UI settings documentation | Basics full-access card maps on to `danger-full-access`, off to `workspace-write`; advanced accepts three modes. | No |
| 2026-06-02 | Code | `autobyteus-server-ts/src/runtime-management/codex/codex-sandbox-mode-setting.ts` | Inspect sandbox setting type/normalizer | `CODEX_SANDBOX_MODES = ["read-only", "workspace-write", "danger-full-access"]`; default is `workspace-write`. | No |
| 2026-06-02 | Code | `autobyteus-server-ts/src/services/server-settings-service.ts` | Inspect server setting registration | `CODEX_APP_SERVER_SANDBOX` is editable predefined setting with allowed values and trim-before-persist. | No |
| 2026-06-02 | Code | `autobyteus-server-ts/src/config/app-config.ts` lines 454-463 | Confirm setting writes process env | `config.set` writes both `configData` and `process.env[key]`. | No |
| 2026-06-02 | Code | `autobyteus-web/components/settings/CodexFullAccessCard.vue` | Inspect Basics UI mapping | Toggle on persists `danger-full-access`; toggle off persists `workspace-write`; card only checks exact danger value as on. | No |
| 2026-06-02 | Code | `autobyteus-server-ts/src/agent-execution/domain/agent-run-config.ts` | Inspect run config field | `autoExecuteTools` is a required boolean on `AgentRunConfig`. | No |
| 2026-06-02 | Code | `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread-config.ts` | Inspect Codex thread config shape | Config has separate `approvalPolicy` and `sandbox` fields; approval enum currently has `never` and `on-request`. | No |
| 2026-06-02 | Code | `autobyteus-server-ts/src/agent-execution/backends/codex/backend/codex-thread-bootstrapper.ts` lines 103-118 and 257-272 | Inspect backend mapping | `autoExecuteTools` maps to `CodexApprovalPolicy.NEVER` or `ON_REQUEST`; sandbox maps through `normalizeSandboxMode()`. | No |
| 2026-06-02 | Code | `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread-manager.ts` lines 139-184 | Inspect call into Codex App Server | `thread/start` and `thread/resume` send `approvalPolicy: config.approvalPolicy` and `sandbox: config.sandbox` as separate params. | No |
| 2026-06-02 | Code | `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread-server-request-handler.ts` | Inspect approval bridge | MCP elicitations are auto-accepted when `runContext.config.autoExecuteTools` is true; otherwise recorded and emitted as local tool approval requests. Command/file approvals are supported separately. | No |
| 2026-06-02 | Code | `autobyteus-web/components/workspace/config/AgentRunConfigForm.vue`, `TeamRunConfigForm.vue`, `MobileLaunchRunOptionsCard.vue` | Inspect run setup UI | UI toggles write `config.autoExecuteTools`; mobile uses same field. | No |
| 2026-06-02 | Command | `codex --version` | Check local installed Codex CLI | Installed CLI is `codex-cli 0.135.0`. | No |
| 2026-06-02 | Command/Spec | `codex app-server generate-json-schema --out /tmp/codex-schema-57TtuR`; inspected `v2/ThreadStartParams.json`, `v2/ThreadResumeParams.json`, `ServerRequest.json` | Verify Codex App Server protocol fields | `approvalPolicy` accepts AskForApproval (`untrusted`, `on-failure`, `on-request`, `never`, or granular object); `sandbox` accepts `read-only`, `workspace-write`, `danger-full-access`; server requests include `item/permissions/requestApproval`. | Possible follow-up for unsupported permission request handling. |
| 2026-06-02 | Command | `rg -n "permissions/requestApproval|request_permissions|sandbox_approval|PermissionsRequest|item/permissions" autobyteus-server-ts/src autobyteus-server-ts/tests tickets/done` | Check whether permission approval request is supported | No current backend/test support found for Codex `item/permissions/requestApproval`. | Yes, if runtime emits this and user wants a fix. |
| 2026-06-02 | Spec | `/tmp/codex-schema-57TtuR/PermissionsRequestApprovalParams.json` and `PermissionsRequestApprovalResponse.json` | Inspect permission approval payload and response shape | Request includes `permissions` with fileSystem/network profiles; response requires `permissions` and optional `scope` (`turn` or `session`) and `strictAutoReview`. | Validate no-grant denial shape in implementation tests. |
| 2026-06-02 | Code | `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread-server-request-handler.ts`, `autobyteus-server-ts/src/agent-execution/backends/codex/codex-dynamic-tool.ts`, dynamic registration files | Inspect how autoExecuteTools=false affects dynamic tools | Shell/file/MCP approvals have pending-approval paths; backend dynamic tools invoked via `item/tool/call` execute directly without an explicit `autoExecuteTools` check in the backend handler. | Yes, if product wants Auto approve off to gate every dynamic tool. |

## Current Behavior / Current Flow

- Current entrypoint or first observable boundary:
  - Full access: Settings UI or server setting write to `CODEX_APP_SERVER_SANDBOX`.
  - Auto approve: run/team/mobile launch config write to `autoExecuteTools`.
- Current execution flow:
  - Full access: `CodexFullAccessCard.vue` or Advanced settings -> `ServerSettingsService.updateSetting` -> `AppConfig.set` -> `process.env.CODEX_APP_SERVER_SANDBOX` -> `CodexThreadBootstrapper.normalizeSandboxMode()` -> `CodexThreadConfig.sandbox` -> `CodexThreadManager.thread/start|thread/resume` `sandbox` param.
  - Auto approve: launch config `autoExecuteTools` -> `AgentRunConfig.autoExecuteTools` -> `CodexThreadBootstrapper.resolveApprovalPolicyForAutoExecuteTools()` -> `CodexThreadConfig.approvalPolicy` -> `CodexThreadManager.thread/start|thread/resume` `approvalPolicy` param; additionally `CodexThreadServerRequestHandler` auto-accepts simple MCP tool approval elicitations.
- Ownership or boundary observations:
  - Server settings own global future-session sandbox mode.
  - Agent/team run config owns per-run approval behavior.
  - Codex thread bootstrapper is the mapping boundary to Codex App Server params.
- Current behavior summary:
  - Controls are separate. Full access changes sandbox, auto approve changes approval policy and MCP approval bridge behavior.

## Design Health Assessment Evidence

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Bug Fix + Behavior Change
- Candidate root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue + Missing Invariant. `autoExecuteTools` is not the single authoritative owner for all Codex approval surfaces; permission requests are unsupported and dynamic tool calls bypass manual approval.
- Refactor posture evidence summary: Refactor needed now. The request-handler currently mixes request classification, auto-approval, pending-record creation, and direct dynamic execution; adding permission and dynamic manual-gating without extracting a cohesive approval owner would deepen the mixed boundary.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| `codex-thread-config.ts` | `approvalPolicy` and `sandbox` are separate fields. | Product/operator explanation must present them as independent axes. | No |
| `codex-thread-bootstrapper.ts` | `autoExecuteTools` maps to `never`/`on-request`; sandbox maps from env setting. | Auto-approve cannot grant sandbox access. | No |
| `codex-thread-manager.ts` | Both fields are passed separately to Codex App Server. | Mapping to Codex itself is explicit and independent. | No |
| Generated app-server schema | Codex supports `item/permissions/requestApproval`; backend does not. | Possible cause of permission-escalation weirdness under sandbox-limited runs. | Yes if user wants a fix. |
| `codex-thread-server-request-handler.ts` | Dynamic `item/tool/call` directly invokes handlers; permission request method is unsupported. | Approval policy boundary is incomplete and fragmented. | Yes |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-server-ts/src/runtime-management/codex/codex-sandbox-mode-setting.ts` | Codex sandbox setting constants/normalization | Defines valid modes and default `workspace-write`. | Sandbox/access authority. |
| `autobyteus-server-ts/src/services/server-settings-service.ts` | Server setting metadata and validation | Registers `CODEX_APP_SERVER_SANDBOX` allowed values. | Settings boundary enforces valid sandbox values. |
| `autobyteus-web/components/settings/CodexFullAccessCard.vue` | Basic UI full-access toggle | Maps on/off to `danger-full-access`/`workspace-write`. | UI intentionally hides `read-only` from Basics. |
| `autobyteus-server-ts/src/agent-execution/domain/agent-run-config.ts` | Run config domain model | Requires boolean `autoExecuteTools`. | Per-run approval behavior source. |
| `autobyteus-server-ts/src/agent-execution/backends/codex/backend/codex-thread-bootstrapper.ts` | Bootstrap mapping from run config/server setting to Codex thread config | Maps approval policy and sandbox. | Primary backend mapping boundary. |
| `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread-manager.ts` | Codex App Server thread start/resume | Sends `approvalPolicy` and `sandbox` as separate params. | Direct mapping to Codex App Server. |
| `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread-server-request-handler.ts` | Server-request/approval bridge | Supports command/file approval and MCP auto-approval, not permission approval. | Potential gap for sandbox permission requests. |

## Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-06-02 | Probe | `codex --version` | Local installed Codex CLI is `codex-cli 0.135.0`. | Protocol schema findings are from current local CLI. |
| 2026-06-02 | Probe | `codex app-server generate-json-schema --out /tmp/codex-schema-57TtuR` | Schema generated successfully. | Confirms app-server accepts the sandbox/approval fields that backend passes. |

## External / Public Source Findings

- Public API / spec / issue / upstream source: No internet sources used.
- Version / tag / commit / freshness: Local Codex CLI `0.135.0`; generated schema on 2026-06-02.
- Relevant contract, behavior, or constraint learned: `ThreadStartParams` and `ThreadResumeParams` include separate `approvalPolicy` and `sandbox` params. `approvalPolicy` supports `untrusted`, `on-failure`, `on-request`, `never`, or granular object. `SandboxMode` supports `read-only`, `workspace-write`, `danger-full-access`.
- Why it matters: Confirms our backend maps to two distinct Codex App Server knobs.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: None for mapping investigation.
- Required config, feature flags, env vars, or accounts: None.
- External repos, samples, or artifacts cloned/downloaded for investigation: None.
- Setup commands that materially affected the investigation: `git fetch origin --prune`; `git worktree add ...`; `codex app-server generate-json-schema --out /tmp/codex-schema-57TtuR`.
- Cleanup notes for temporary investigation-only setup: Dedicated worktree remains for artifacts. Generated schema temp dir is outside repo and can be deleted later.

## Findings From Code / Docs / Data / Logs

1. Full access mapping:
   - `CODEX_APP_SERVER_SANDBOX` is the backing setting.
   - Basic UI on/off maps to `danger-full-access` / `workspace-write`.
   - Backend default and invalid fallback are `workspace-write`.
   - The final Codex App Server field is `sandbox`.
2. Auto approve mapping:
   - `autoExecuteTools` is the backing per-run config field.
   - Backend maps true to `approvalPolicy: "never"` and false to `approvalPolicy: "on-request"`.
   - The backend also uses `autoExecuteTools` to auto-accept MCP tool approval elicitations.
   - The final Codex App Server field is `approvalPolicy`.
3. Interaction:
   - These are independent axes in current code.
   - `approvalPolicy: "never"` means no approval prompt; it does not imply `sandbox: "danger-full-access"`.
   - `sandbox: "workspace-write"` can still block or limit operations even if `approvalPolicy` is `never`.
4. Potential backend gap:
   - Local Codex schema includes `item/permissions/requestApproval`.
   - Current backend request handler does not support that method.
   - If Codex emits this request, the backend will respond with unsupported method, which may appear as strange behavior during sandbox-limited tasks.

5. Auto-approve-off behavior in current backend:
   - For Codex shell/terminal and file-change approvals, `autoExecuteTools: false` maps to `approvalPolicy: "on-request"`; Codex App Server emits approval server requests, the backend stores `CodexApprovalRecord`s, emits `TOOL_APPROVAL_REQUESTED`, and waits for UI/API approval before responding to the JSON-RPC request.
   - For simple MCP tool elicitations, `autoExecuteTools: false` causes the backend to emit a local approval request and wait; `true` auto-accepts immediately.
   - For backend-registered Codex dynamic tools (`item/tool/call`, including team communication, browser, media, publish artifacts), `handleDynamicToolCallRequest` directly invokes the registered handler. There is no explicit `autoExecuteTools` gate in that backend path. If Codex App Server does not gate these before sending `item/tool/call`, they execute even when `autoExecuteTools` is false.

## Constraints / Dependencies / Compatibility Facts

- Full-access setting changes apply to new/future Codex sessions, not necessarily already-active sessions.
- Auto-approve is per run/team/member config; team member overrides can vary it by member.
- Codex App Server supports more approval policies than the backend exposes through `autoExecuteTools`; current backend only uses `never` and `on-request`.
- Basics UI intentionally exposes only a full-access boolean; Advanced/API can set `read-only`, `workspace-write`, or `danger-full-access`.

## Open Unknowns / Risks

- The user's exact strange behavior was not reproduced; root cause could be a direct sandbox failure, unsupported permission request, command/file approval behavior, or an MCP approval bridge edge case.
- Need implementation validation to confirm permission no-grant denial response shape accepted by Codex App Server.

## Notes For Architect Reviewer

Architecture review handoff planned. Recommended implementation scope: cohesive Codex approval owner covering command/file/MCP/dynamic/permission request surfaces, effective auto-approved access behavior, docs/UI copy, and API/E2E validation.
