# API, E2E, And Executable Validation Report

## Validation Round Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-runtime-access-mapping-analysis/tickets/codex-runtime-access-mapping-analysis/requirements-doc.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-runtime-access-mapping-analysis/tickets/codex-runtime-access-mapping-analysis/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-runtime-access-mapping-analysis/tickets/codex-runtime-access-mapping-analysis/design-spec.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-runtime-access-mapping-analysis/tickets/codex-runtime-access-mapping-analysis/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-runtime-access-mapping-analysis/tickets/codex-runtime-access-mapping-analysis/implementation-handoff.md`
- Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-runtime-access-mapping-analysis/tickets/codex-runtime-access-mapping-analysis/review-report.md`
- Current Validation Round: 1
- Trigger: Code-review Round 2 pass from `code_reviewer`; API/E2E validation requested before delivery.
- Prior Round Reviewed: N/A
- Latest Authoritative Round: 1

## Round History

| Round | Trigger | Prior Unresolved Failures Rechecked | New Failures Found | Result | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Code-review Round 2 pass | N/A | 0 | Pass | Yes | Added narrow durable validation after code review; must return through `code_reviewer` before delivery. |

## Validation Basis

Validation was derived from the approved requirements and acceptance criteria for Codex auto-approval/access mapping, the reviewed design spines DS-001 through DS-005, the implementation handoff's compatibility-removal check, and direct observation of the current code/test/runtime behavior.

Primary acceptance areas exercised:

- `autoExecuteTools=true` effective Codex config: `approvalPolicy: "never"` plus `sandbox: "danger-full-access"` on create/restore and thread start/resume payload boundaries.
- Dynamic `item/tool/call` auto execution, manual gating, manual approval exact-once execution, and denial without handler invocation.
- `item/permissions/requestApproval` auto session grant, manual turn grant, and manual no-grant denial response.
- Existing command/file/MCP approval surfaces remain on the correct auto/manual paths.
- Event stream and web lifecycle handling preserve meaningful dynamic-tool and permission-request card metadata.
- Codex App Server schema/runtime smoke evidence for permission/dynamic response shapes and auto-approved thread start config.
- Live gated Codex GraphQL/websocket runtime E2E with `RUN_CODEX_E2E=1`, `runtimeKind: "codex_app_server"`, `autoExecuteTools=true`, saved sandbox forced to `workspace-write` (full access off), and a real `run_bash` tool call that writes a dummy file outside the workspace, defaulting to `~/Downloads`, without approval requests.

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No`
- Durable validation added or retained only for compatibility-only behavior: `No`
- If compatibility-related invalid scope was observed, reroute classification used: N/A
- Upstream recipient notified: N/A

No legacy direct manual dynamic-tool execution path was observed in the validated code. Manual dynamic requests now queue approval records and only execute through `CodexThread.approveTool(...)`.

## Validation Surfaces / Modes

- Server unit/executable validation for Codex bootstrap, thread manager RPC payload mapping, request handling, pending approval records, dynamic tools, permission requests, and event conversion.
- Web unit/executable validation for lifecycle handling of permission approval cards.
- Live Codex App Server process smoke validation for JSON-RPC startup/thread start and generated protocol schema.
- Temporary probes for live auto-approved thread-start acceptance and permission-request/no-grant reproduction.

## Platform / Runtime Targets

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-runtime-access-mapping-analysis`
- Branch: `codex/codex-runtime-access-mapping-analysis`
- Base/tracking branch: `origin/personal`
- OS/runtime observed: macOS host, Node `v22.21.1`, pnpm `10.28.2`
- Codex CLI observed during validation: `codex-cli 0.136.0`
- `OPENAI_API_KEY`: set in environment; value not printed.
- `RUN_CODEX_E2E`: unset by default; explicitly set to `1` for live client smoke and live GraphQL/websocket Codex runtime E2E tests.

## Lifecycle / Upgrade / Restart / Migration Checks

No installer, updater, migration, or restart lifecycle behavior is in scope. Restore/resume config mapping was covered at the bootstrapper and thread-manager boundaries. A direct live `thread/resume` smoke probe was not used as authoritative because a freshly-started live thread without rollout history returned `no rollout found`; the application `CodexThreadManager` already falls back to `thread/start` on resume failure, and durable tests assert the resume request payload when resume is attempted.

## Coverage Matrix

| Scenario ID | Requirement / AC | Surface | Mode | Evidence | Result |
| --- | --- | --- | --- | --- | --- |
| V-001 | REQ-1, AC-9 | Bootstrapper + thread manager + live app-server start | Auto | `bootstrapper.test.ts` create/restore effective sandbox tests; `codex-thread-manager.test.ts` start/resume payload test; live JSON-RPC `thread/start` accepted `approvalPolicy: "never"`, `sandbox: "danger-full-access"`. | Pass |
| V-002 | REQ-2, AC-2 | Codex dynamic tool coordinator | Auto | `codex-thread.test.ts` executes dynamic tool immediately in auto mode. | Pass |
| V-003 | REQ-3, REQ-4, AC-3, AC-4 | Codex dynamic tool coordinator + approval boundary | Manual approval | `codex-thread.test.ts` gates `send_message_to`, emits approval, does not call handler before approval, executes once after approval. CR-001 regression still passes. | Pass |
| V-004 | REQ-5, AC-5 | Codex dynamic tool coordinator + approval boundary | Manual denial | `codex-thread.test.ts` denies dynamic tool without invoking handler and returns failed dynamic result. | Pass |
| V-005 | REQ-2, REQ-4, REQ-5, AC-1, AC-6, AC-7 | Permission request coordinator + schema | Auto/manual approve/deny | `codex-thread.test.ts` auto grants session, manual approval grants turn, manual denial returns no-grant profile; Codex schema confirms `PermissionsRequestApprovalResponse` requires `permissions` and `scope` enum is `turn|session`. | Pass for backend/schema; live semantic residual noted below |
| V-006 | REQ-2, REQ-3, AC-8 | Command/file/MCP approvals | Auto/manual | Command auto/manual existing tests; new file-change manual denial regression; MCP auto/manual tests. | Pass |
| V-007 | REQ-3, REQ-7, AC-10 | Event stream + web lifecycle/UI card hydration | Manual approval cards | New event-converter tests for `send_message_to` and `request_permissions`; new web lifecycle handler test for permission approval card arguments; existing launch-copy component tests. | Pass |
| V-008 | Protocol/runtime smoke | Live Codex App Server | Process/JSON-RPC | `RUN_CODEX_E2E=1 pnpm -C autobyteus-server-ts exec vitest run tests/integration/runtime-management/codex/client/codex-app-server-client.integration.test.ts` passed, 2 tests; direct temporary JSON-RPC auto thread-start probe passed. | Pass |
| V-009 | REQ-1, REQ-2, AC-1, AC-2, AC-9 | GraphQL + websocket + live Codex runtime | Auto | `RUN_CODEX_E2E=1 pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/agent-runtime-graphql.e2e.test.ts -t "auto-executes Codex tool calls over websocket without approval requests"` passed. The test now supplies required command identity, forces saved `CODEX_APP_SERVER_SANDBOX=workspace-write`, creates a `codex_app_server` run with `autoExecuteTools=true`, observes `run_bash` start/success and idle/final response, asserts no `TOOL_APPROVAL_REQUESTED`, verifies the target path is outside the workspace, and verifies the dummy file content in the outside-workspace target directory (default `~/Downloads`). | Pass |

## Test Scope

Durable tests were kept narrow and boundary-local:

- Existing backend tests already covered dynamic/permission core behavior; validation added gaps around restore, start/resume payloads, file-change approval, and event-stream specificity.
- Existing frontend launch-copy tests were rerun; validation added a focused permission-card lifecycle test only.
- No implementation source changes were made during API/E2E; only repository-resident durable validation files were updated.

## Validation Setup / Environment

- Dependencies were already installed in the worktree.
- Web Nuxt generated types were refreshed with `pnpm -C autobyteus-web exec nuxi prepare` before focused web test execution.
- Codex App Server schema was generated with `codex app-server generate-json-schema --out <tmp>` from local `codex-cli 0.136.0`.
- Temporary live JSON-RPC probes spawned `codex app-server` in mktemp workspaces and removed probe files/directories afterward.

## Tests Implemented Or Updated

Repository-resident durable validation updated after code review:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-runtime-access-mapping-analysis/autobyteus-server-ts/tests/unit/agent-execution/backends/codex/backend/codex-thread-bootstrapper.test.ts`
  - Added restore coverage confirming auto-approved runs keep effective `danger-full-access` with saved `CODEX_APP_SERVER_SANDBOX=workspace-write`.
- `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-runtime-access-mapping-analysis/autobyteus-server-ts/tests/unit/agent-execution/backends/codex/thread/codex-thread-manager.test.ts`
  - Added start/resume RPC payload coverage for `approvalPolicy: "never"` and `sandbox: "danger-full-access"`.
- `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-runtime-access-mapping-analysis/autobyteus-server-ts/tests/unit/agent-execution/backends/codex/thread/codex-thread.test.ts`
  - Added file-change manual-denial regression coverage while retaining existing command/MCP/dynamic/permission coverage.
- `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-runtime-access-mapping-analysis/autobyteus-server-ts/tests/unit/agent-execution/backends/codex/events/codex-thread-event-converter.test.ts`
  - Added explicit local dynamic-tool and permission-request approval event conversion coverage.
- `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-runtime-access-mapping-analysis/autobyteus-web/services/agentStreaming/handlers/__tests__/toolLifecycleHandler.spec.ts`
  - Added permission approval-card argument hydration coverage.
- `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-runtime-access-mapping-analysis/autobyteus-server-ts/tests/e2e/runtime/agent-runtime-graphql.e2e.test.ts`
  - Updated the gated live Codex auto-execution E2E to use the current websocket command identity contract (`message_id`/`dedupe_key`) and to force the saved sandbox setting to `workspace-write` while verifying `autoExecuteTools=true` still executes a real shell tool call writing outside the workspace without approval prompts.

## Durable Validation Added To The Codebase

- Repository-resident durable validation added or updated this round: `Yes`
- Paths added or updated:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-runtime-access-mapping-analysis/autobyteus-server-ts/tests/unit/agent-execution/backends/codex/backend/codex-thread-bootstrapper.test.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-runtime-access-mapping-analysis/autobyteus-server-ts/tests/unit/agent-execution/backends/codex/thread/codex-thread-manager.test.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-runtime-access-mapping-analysis/autobyteus-server-ts/tests/unit/agent-execution/backends/codex/thread/codex-thread.test.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-runtime-access-mapping-analysis/autobyteus-server-ts/tests/unit/agent-execution/backends/codex/events/codex-thread-event-converter.test.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-runtime-access-mapping-analysis/autobyteus-web/services/agentStreaming/handlers/__tests__/toolLifecycleHandler.spec.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-runtime-access-mapping-analysis/autobyteus-server-ts/tests/e2e/runtime/agent-runtime-graphql.e2e.test.ts`
- If `Yes`, returned through `code_reviewer` before delivery: `Yes` (this report recommends and handoff routes to `code_reviewer`)
- Post-validation code review artifact: Pending code-review recheck of validation changes.

## Other Validation Artifacts

- Canonical validation report: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-runtime-access-mapping-analysis/tickets/codex-runtime-access-mapping-analysis/api-e2e-validation-report.md`

## Temporary Validation Methods / Scaffolding

- Live Codex App Server JSON-RPC thread-start probe:
  - Started `codex app-server`, initialized client, sent `thread/start` with `approvalPolicy: "never"` and `sandbox: "danger-full-access"`.
  - Result: passed; app server returned a thread id.
  - Temporary mktemp workspace removed.
- Codex schema inspection:
  - Generated local schema under `/tmp` and inspected `PermissionsRequestApprovalResponse.json` and `DynamicToolCallResponse.json` with `jq`.
  - Result: permission response requires `permissions`; scope default is `turn`; scope enum includes `turn` and `session`; granted permission profile accepts `fileSystem`/`network` as object or null; dynamic response requires `contentItems` and `success`.
  - Temporary schema directory removed.
- Permission no-grant live-turn probe:
  - Attempted a live prompt under read-only sandbox to force `item/permissions/requestApproval`, then respond with the no-grant profile.
  - Result: inconclusive; Codex did not emit a permission request or command approval in that turn and did not create the target file. This was not used as pass/fail evidence for no-grant live semantics.
  - Temporary script and mktemp directories removed.

## Dependencies Mocked Or Emulated

- Unit tests mock Codex App Server client request/response methods and dynamic tool handlers to deterministically validate request/approval behavior.
- Web lifecycle tests use existing mocked Pinia activity store.
- Live app-server smoke tests use the real local `codex` binary but do not require a deterministic model tool call.

## Prior Failure Resolution Check (Mandatory On Round >1)

| Prior Round | Scenario / Failure Reference | Previous Classification | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| N/A | N/A | N/A | N/A | N/A | First API/E2E validation round. |

## Scenarios Checked

### V-001 Auto-approved create/restore/start/resume config

- Saved env scenario: `CODEX_APP_SERVER_SANDBOX=workspace-write` in tests.
- `resolveEffectiveCodexSandboxMode(false)` returns `workspace-write`.
- `resolveEffectiveCodexSandboxMode(true)` returns `danger-full-access`.
- `bootstrapForCreate(... autoExecuteTools=true)` produces `approvalPolicy: "never"`, `sandbox: "danger-full-access"`.
- `bootstrapForRestore(... autoExecuteTools=true)` preserves existing thread id and produces `approvalPolicy: "never"`, `sandbox: "danger-full-access"`.
- `CodexThreadManager` sends both `thread/start` and `thread/resume` payloads with `approvalPolicy: "never"`, `sandbox: "danger-full-access"` when given the auto-approved config.
- Live app server accepted `thread/start` with those fields.

### V-002/V-003/V-004 Dynamic tools

- Auto mode: dynamic handler is invoked immediately and sends successful `DynamicToolCallResponse`.
- Manual mode: `item/tool/call` records a pending approval, emits `LOCAL_TOOL_APPROVAL_REQUESTED`, and does not call the handler before approval.
- Manual approval: handler is invoked exactly once and response is sent exactly once.
- Repeated manual approval while the first handler is awaiting rejects with no pending approval and does not double-execute.
- Manual denial: handler is not called and a failed dynamic result is returned.

### V-005 Permission requests

- Auto mode returns requested permission profile with `scope: "session"`.
- Manual approval returns requested permission profile with `scope: "turn"`.
- Manual denial returns `{ permissions: { fileSystem: null, network: null }, scope: "turn" }`.
- Manual mode emits a visible `request_permissions` approval request containing requested permission profile, cwd, and reason.

### V-006 Existing command/file/MCP approvals

- Command execution auto-accept remains covered.
- Command execution manual approval by exact `itemId` remains covered.
- File-change manual denial now covered and returns `decision: "decline"` with `edit_file` metadata.
- MCP auto-accept/manual approval remains covered.

### V-007 UI/event stream

- Dynamic approval request converts to `TOOL_APPROVAL_REQUESTED` with `tool_name: "send_message_to"` and concrete arguments.
- Permission approval request converts to `TOOL_APPROVAL_REQUESTED` with `tool_name: "request_permissions"` and permissions/cwd/reason arguments.
- Web lifecycle handler stores and displays `request_permissions` approval-card arguments and marks segment/activity as awaiting approval.
- Existing launch-copy tests confirm high-trust auto-approve copy remains visible.

### V-008 Live process/schema smoke

- Live `CodexAppServerClient` integration passed with local `codex app-server` process.
- Live JSON-RPC `thread/start` accepted the auto-approved config.
- Generated schema matched the response shapes used by the backend.

### V-009 Live Codex GraphQL/websocket auto-execution E2E

- The gated Codex runtime suite was run with `RUN_CODEX_E2E=1`.
- The test creates a GraphQL-managed agent run with `runtimeKind: "codex_app_server"` and `autoExecuteTools: true`.
- The test forces saved `CODEX_APP_SERVER_SANDBOX=workspace-write` before run creation so full access is off at the saved setting and the ticket regression is exercised through real bootstrap.
- The test targets an outside-workspace dummy file path, defaulting to `~/Downloads/api-autoexec-outside-workspace-<uuid>.txt` unless `CODEX_E2E_FULL_ACCESS_TARGET_DIR` is set. It asserts the target path is outside the workspace.
- The test sends a websocket `SEND_MESSAGE` using the current `message_id`/`dedupe_key` command identity contract.
- The live Codex runtime starts and succeeds a real `run_bash` tool call, reaches idle/final assistant response, emits no `TOOL_APPROVAL_REQUESTED`, verifies the outside-workspace file content, and deletes the dummy file in cleanup.

## Passed

Commands run and passed:

- `pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-execution/backends/codex/thread/codex-thread.test.ts tests/unit/agent-execution/backends/codex/thread/codex-thread-manager.test.ts tests/unit/agent-execution/backends/codex/backend/codex-thread-bootstrapper.test.ts tests/unit/agent-execution/backends/codex/events/codex-thread-event-converter.test.ts` — passed, 4 files / 60 tests.
- `pnpm -C autobyteus-web exec vitest run services/agentStreaming/handlers/__tests__/toolLifecycleHandler.spec.ts` — passed, 1 file / 12 tests.
- `pnpm -C autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit` — passed.
- `pnpm -C autobyteus-web exec nuxi prepare && pnpm -C autobyteus-web exec vitest run components/workspace/config/__tests__/AgentRunConfigForm.spec.ts components/workspace/config/__tests__/TeamRunConfigForm.spec.ts components/mobile/__tests__/MobileUxRefinement.spec.ts services/agentStreaming/handlers/__tests__/toolLifecycleHandler.spec.ts` — passed, 4 files / 43 tests.
- `git diff --check origin/personal -- . ':!tickets/**'` — passed.
- `RUN_CODEX_E2E=1 pnpm -C autobyteus-server-ts exec vitest run tests/integration/runtime-management/codex/client/codex-app-server-client.integration.test.ts` — passed, 1 file / 2 tests.
- `RUN_CODEX_E2E=1 pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/agent-runtime-graphql.e2e.test.ts -t "auto-executes Codex tool calls over websocket without approval requests"` — passed, 1 file / 1 executed test, 17 skipped by name filter.
- `codex app-server generate-json-schema --out <tmp> && jq ...` — passed; inspected permission/dynamic response schema.
- Temporary live JSON-RPC `thread/start` auto-config probe — passed; returned thread id with `approvalPolicy: "never"`, `sandbox: "danger-full-access"`.

## Failed

No implementation or durable-validation failures were found in the authoritative validation suite.

## Not Tested / Out Of Scope

- Fully live Codex model-driven permission no-grant semantics remain not deterministically proven. A temporary live prompt did not cause Codex to emit `item/permissions/requestApproval`, so the result was inconclusive. Backend behavior and generated schema are covered; live semantic no-grant remains the only explicit residual risk.
- The prior stale `SEND_MESSAGE` websocket payload issue for the live Codex auto-execution scenario was fixed in durable E2E by supplying `message_id` and `dedupe_key`; the gated Codex runtime E2E now passes. A separate team-run resume metadata shape assumption remains unrelated and outside this standalone Codex approval/access runtime scenario.
- Browser visual UI interaction was not opened because the relevant approval-card behavior is stream/lifecycle data hydration and was covered by event-converter plus web handler tests.

## Blocked

None for the deterministic API/E2E sign-off. The live no-grant semantic check is recorded as a residual not-tested risk rather than a blocker because the implementation-side behavior and protocol shape are covered, and a deterministic live trigger was not available without broad unrelated E2E harness repair or model-dependent prompting.

## Cleanup Performed

- Removed temporary `/tmp` permission probe script.
- Removed temporary Codex schema/probe workspaces created by this validation round.
- No repository temporary scaffolding remains.

## Classification

No failure classification required. Result is `Pass`; durable validation was updated, so the next workflow step is narrow code-review recheck.

Failure classification definitions for reference:

- `Local Fix`: the main issue is a bounded implementation correction.
- `Design Impact`: the main issue is a weakness or mismatch in the reviewed design.
- `Requirement Gap`: intended behavior or acceptance criteria are missing or ambiguous.
- `Unclear`: the issue is cross-cutting, low-confidence, or cannot yet be classified cleanly.

## Recommended Recipient

`code_reviewer`

Reason: API/E2E validation passed, but repository-resident durable validation was added/updated after the prior code review. Per team workflow, the cumulative package must return to `code_reviewer` before delivery.

## Evidence / Notes

- No invalid compatibility wrapper, dual-path read/write, schema-upgrade shim, retained legacy branch, or old direct dynamic-tool manual execution path was observed.
- `CodexThread.approveTool(...)` still claims/deletes pending approvals before awaited handler execution, and the focused exact-once regression remains passing.
- The validation added only test coverage; implementation source files were not modified during API/E2E.
- After user challenge on live runtime coverage, the gated Codex GraphQL/websocket E2E was updated and rerun with `RUN_CODEX_E2E=1`, producing a real passing Codex runtime tool-execution check. After the follow-up challenge, it was further tightened to write a dummy file outside the workspace with saved full access off (`workspace-write`) and was rerun successfully.
- Live local Codex CLI version is `0.136.0`, while upstream investigation referenced `0.135.0`; generated response schemas for the affected dynamic/permission response shapes remain compatible with the implementation.

## Latest Authoritative Result

- Result values: `Pass` / `Fail` / `Blocked`
- Result: `Pass`
- Notes: No implementation failures found. Durable validation updates require code-review recheck before delivery. Live model-driven no-grant semantics remain a documented residual risk, but backend no-grant behavior and current generated schema shape are covered.
