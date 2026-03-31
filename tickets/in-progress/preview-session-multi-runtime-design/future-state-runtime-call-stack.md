# Future-State Runtime Call Stacks (Debug-Trace Style)

Use this document as a future-state (`to-be`) execution model derived from the design basis.
It models the intended target behavior, not current-code parity.

## Conventions

- Frame format: `path/to/file.ts:functionName(args?)`
- Boundary tags:
  - `[ENTRY]` external entrypoint
  - `[ASYNC]` async boundary
  - `[STATE]` in-memory mutation
  - `[IO]` file/network/native IO
  - `[FALLBACK]` non-primary branch
  - `[ERROR]` error path

## Design Basis

- Scope Classification: `Large`
- Call Stack Version: `v6`
- Requirements: `tickets/in-progress/preview-session-multi-runtime-design/requirements.md` (status `Refined`)
- Source Artifact:
  - `tickets/in-progress/preview-session-multi-runtime-design/proposed-design.md`
- Source Design Version: `v6`
- Referenced Sections:
  - Spine inventory sections: `Data-Flow Spine Inventory`, `Primary Execution / Data-Flow Spine(s)`, `Return / Event Spine(s)`, `Bounded Local / Internal Spines`
  - Ownership sections: `Ownership Map`, `Subsystem / Capability-Area Allocation`, `Ownership-Driven Dependency Rules`

## Future-State Modeling Rule (Mandatory)

- Model target design behavior even when current code diverges.
- Every use case declares which spine(s) it exercises from the approved design basis.
- The bounded local preview-session-owner spine is modeled explicitly where it materially affects behavior.

## Use Case Index (Stable IDs)

| use_case_id | Spine ID(s) | Spine Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Governing Owner | Source Type (`Requirement`/`Design-Risk`) | Requirement ID(s) | Design-Risk Objective (if source=`Design-Risk`) | Use Case Name | Coverage Target (Primary/Fallback/Error) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| UC-001 | DS-001 | Primary End-to-End | `PreviewToolService` | Requirement | R-002, R-005, R-006 | N/A | local packaged app startup exposes preview capability only where supported | Yes/Yes/Yes |
| UC-002 | DS-002 | Primary End-to-End | `PreviewSessionManager` | Requirement | R-001, R-002, R-006, R-008, R-009 | N/A | `autobyteus` runtime opens a preview session | Yes/Yes/Yes |
| UC-003 | DS-002 | Primary End-to-End | `PreviewSessionManager` | Requirement | R-002, R-006, R-009 | N/A | `codex_app_server` opens a preview session through a dynamic tool | Yes/Yes/Yes |
| UC-004 | DS-002 | Primary End-to-End | `PreviewSessionManager` | Requirement | R-002, R-006, R-009 | N/A | `claude_agent_sdk` opens a preview session through run-level MCP tools | Yes/Yes/Yes |
| UC-005 | DS-003 | Primary End-to-End | `PreviewSessionManager` | Requirement | R-001, R-007, R-008, R-009 | N/A | agent captures a screenshot from an existing preview session | Yes/Yes/Yes |
| UC-006 | DS-004 | Return-Event | `PreviewSessionManager` | Requirement | R-003, R-004, R-005, R-007 | N/A | native preview close invalidates the session without renderer-specific projection | Yes/Yes/Yes |
| UC-007 | DS-005 | Bounded Local | `PreviewSessionManager` | Design-Risk | R-003, R-007 | session registry invariants and result/error discipline must survive mixed bridge/native inputs | preview session owner internal lifecycle remains coherent across open, reuse, close, and native-close | Yes/N/A/Yes |

Rules:
- Every in-scope requirement maps to at least one use case in this index.
- Every use case maps to at least one spine from the approved spine inventory.

## Transition Notes

- No temporary compatibility behavior is part of the target design.
- Remote-node preview is intentionally out of scope for v1; unsupported environments do not get a hidden fallback path.

## Use Case: UC-001 local packaged app startup exposes preview capability only where supported

### Spine Context

- Spine ID(s): `DS-001`
- Spine Scope: `Primary End-to-End`
- Governing Owner: `PreviewToolService`
- Why This Use Case Matters To This Spine:
  - preview exposure must be gated by real shell availability, not assumed by each runtime independently.

### Goal

Expose preview tools only when the packaged local shell owner is available to serve them.

### Preconditions

- Electron app is starting normally.
- Internal packaged backend server process will be launched by the Electron shell.

### Expected Outcome

- Electron main starts the preview bridge server and injects bridge configuration into the packaged internal server environment.
- Backend-side `PreviewToolService` can answer whether preview is supported.
- Runtime adapters expose preview tools only when support is available.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-web/electron/main.ts:app.whenReady() [ASYNC]
├── autobyteus-web/electron/preview/preview-bridge-server.ts:start() [ASYNC][IO]
├── autobyteus-web/electron/main.ts:buildInternalServerRuntimeEnv() [STATE]
│   └── inject preview bridge base URL + auth token into packaged server env [STATE]
└── autobyteus-web/electron/server/baseServerManager.ts:startServer() [ASYNC][IO]

[ENTRY] runtime bootstrap path [ASYNC]
├── autobyteus-server-ts/src/agent-tools/preview/preview-tool-service.ts:isPreviewSupported() [STATE]
│   ├── read preview bridge env [STATE]
│   └── return support decision to runtime bootstraps [STATE]
├── `autobyteus` local tool registration includes preview tools when supported [STATE]
├── Codex bootstrap includes preview dynamic tool registrations when supported [STATE]
└── Claude session build includes preview MCP tools when supported [STATE]
```

### Branching / Fallback Paths

```text
[FALLBACK] if preview bridge env is missing or invalid
preview-tool-service.ts:isPreviewSupported()
└── return false so preview tools are not exposed [STATE]
```

```text
[ERROR] if preview bridge server fails to start
autobyteus-web/electron/preview/preview-bridge-server.ts:start()
└── Electron startup logs failure and `PreviewToolService` resolves unsupported [STATE]
```

### State And Data Transformations

- bridge startup result -> preview capability env payload
- env payload -> backend capability decision
- capability decision -> runtime-specific exposure registration

### Observability And Debug Points

- preview bridge startup logs
- internal server env injection logs
- runtime bootstrap logs for preview exposure enable/disable

### Design Smells / Gaps

- Any legacy/backward-compatibility branch present? `No`
- Any tight coupling or cyclic cross-subsystem dependency introduced? `No`
- Any naming-to-responsibility drift detected? `No`

### Open Questions

- None.

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `Covered`

## Use Case: UC-002 `autobyteus` runtime opens a preview session

### Spine Context

- Spine ID(s): `DS-002`
- Spine Scope: `Primary End-to-End`
- Governing Owner: `PreviewSessionManager`
- Why This Use Case Matters To This Spine:
  - it is the canonical open-preview flow and the baseline semantic contract for every adapter.

### Goal

Allow a native `autobyteus` run to open a preview window and receive a stable `preview_session_id`.

### Preconditions

- Runtime kind is `autobyteus`.
- Preview capability is supported.
- `open_preview` is registered in the shared tool registry.

### Expected Outcome

- Preview session is created or reused.
- Tool result returns normalized `OpenPreviewResult`.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-ts/src/agent/handlers/tool-invocation-execution-event-handler.ts:handle(event, context) [ASYNC]
├── autobyteus-ts/src/agent/context/agent-context.ts:getTool('open_preview') [STATE]
└── autobyteus-server-ts/src/agent-tools/preview/open-preview.ts:execute(context, kwargs) [ASYNC]
    ├── autobyteus-server-ts/src/agent-tools/preview/preview-tool-contract.ts:parseOpenPreviewInput(kwargs) [STATE]
    └── autobyteus-server-ts/src/agent-tools/preview/preview-tool-service.ts:openPreview(input) [ASYNC]
        ├── autobyteus-server-ts/src/agent-tools/preview/preview-tool-service.ts:assertPreviewSupported() [STATE]
        ├── autobyteus-server-ts/src/agent-tools/preview/preview-tool-service.ts:assertOpenPreviewSemantics(input) [STATE]
        ├── autobyteus-server-ts/src/agent-tools/preview/preview-bridge-client.ts:openPreview(input) [ASYNC][IO]
        │   └── autobyteus-web/electron/preview/preview-bridge-server.ts:handleOpenPreview(request) [ASYNC][IO]
        │       └── autobyteus-web/electron/preview/preview-session-manager.ts:openSession(input) [ASYNC][STATE]
        │           ├── autobyteus-web/electron/preview/preview-session-manager.ts:findReusableSession(input) [STATE]
        │           ├── autobyteus-web/electron/preview/preview-session-manager.ts:createSessionRecord(input) [STATE]
        │           ├── autobyteus-web/electron/preview/preview-window-factory.ts:createPreviewWindow(session) [ASYNC][IO]
        │           ├── electron:BrowserWindow.webContents.loadURL(url) [IO]
        │           ├── autobyteus-web/electron/preview/preview-session-manager.ts:attachSessionObservers(session, webContents) [STATE]
        │           ├── autobyteus-web/electron/preview/preview-session-manager.ts:waitForRequestedReadyState(session, input.wait_until ?? 'load') [ASYNC][IO]
        │           │   ├── if `wait_until='domcontentloaded'` -> await electron:webContents:'dom-ready'
        │           │   └── if `wait_until='load'` -> await electron:webContents:'did-finish-load'
        │           └── autobyteus-web/electron/preview/preview-session-manager.ts:buildOpenPreviewResult(session) [STATE]
        └── autobyteus-server-ts/src/agent-tools/preview/preview-tool-service.ts:normalizeOpenPreviewResult(bridgeResult) [STATE]
```

### Branching / Fallback Paths

```text
[FALLBACK] if reuse_existing=true and a matching ready session already exists
preview-session-manager.ts:findReusableSession(input)
└── return existing session with status='reused' [STATE]
```

```text
[ERROR] if preview support is unavailable
preview-tool-service.ts:assertPreviewSupported()
└── throw or return normalized error `preview_unsupported_in_current_environment` [STATE]
```

### State And Data Transformations

- tool args -> canonical `OpenPreviewInput`
- bridge request -> session record
- canonical wait mode -> Electron `dom-ready` or `did-finish-load` wait path
- session record -> bridge result -> normalized `OpenPreviewResult`

### Observability And Debug Points

- tool lifecycle started/succeeded events
- bridge request logs
- preview session creation logs

### Design Smells / Gaps

- Any legacy/backward-compatibility branch present? `No`
- Any tight coupling or cyclic cross-subsystem dependency introduced? `No`
- Any naming-to-responsibility drift detected? `No`

### Open Questions

- None.

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `Covered`

## Use Case: UC-003 `codex_app_server` opens a preview session through a dynamic tool

### Spine Context

- Spine ID(s): `DS-002`
- Spine Scope: `Primary End-to-End`
- Governing Owner: `PreviewSessionManager`
- Why This Use Case Matters To This Spine:
  - Codex uses a different tool transport, so the design must show adapter parity without changing semantics.

### Goal

Expose the same preview-open behavior to Codex through the existing dynamic-tool mechanism.

### Preconditions

- Runtime kind is `codex_app_server`.
- Preview support is available during Codex bootstrap.
- Preview dynamic tools are registered.

### Expected Outcome

- Dynamic tool call reaches the shared preview service and bridge boundary.
- Result returns canonical JSON text representing the shared `OpenPreviewResult`.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-server-ts/src/agent-execution/backends/codex/backend/codex-thread-bootstrapper.ts:bootstrapInternal(...) [ASYNC]
└── autobyteus-server-ts/src/agent-execution/backends/codex/preview/build-preview-dynamic-tool-registrations.ts:buildPreviewDynamicToolRegistrations(runContext) [STATE]
    └── autobyteus-server-ts/src/agent-tools/preview/preview-tool-service.ts:isPreviewSupported() [STATE]

[ENTRY] autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread-server-request-handler.ts:handleDynamicToolCallRequest(...) [ASYNC]
└── autobyteus-server-ts/src/agent-execution/backends/codex/preview/open-preview-dynamic-tool-handler.ts:handle(callInput) [ASYNC]
    ├── autobyteus-server-ts/src/agent-tools/preview/preview-tool-contract.ts:parseOpenPreviewInput(callInput.arguments) [STATE]
    ├── autobyteus-server-ts/src/agent-tools/preview/preview-tool-service.ts:openPreview(input) [ASYNC]
    │   ├── autobyteus-server-ts/src/agent-tools/preview/preview-bridge-client.ts:openPreview(input) [ASYNC][IO]
    │   │   └── autobyteus-web/electron/preview/preview-bridge-server.ts:handleOpenPreview(request) [ASYNC][IO]
    │   │       └── autobyteus-web/electron/preview/preview-session-manager.ts:openSession(input) [ASYNC][STATE]
    │   └── autobyteus-server-ts/src/agent-tools/preview/preview-tool-service.ts:normalizeOpenPreviewResult(bridgeResult) [STATE]
    └── autobyteus-server-ts/src/agent-execution/backends/codex/codex-dynamic-tool.ts:createCodexDynamicToolTextResult(serializedResultJson, true) [STATE]
```

### Branching / Fallback Paths

```text
[FALLBACK] if preview tools were not injected during bootstrap
codex-thread-server-request-handler.ts:handleDynamicToolCallRequest(...)
└── return "Dynamic tool 'open_preview' is unavailable." [STATE]
```

```text
[ERROR] if bridge request fails
open-preview-dynamic-tool-handler.ts:handle(...)
└── return error JSON text via createCodexDynamicToolTextResult(..., false) [STATE]
```

### State And Data Transformations

- Codex tool call args -> canonical `OpenPreviewInput`
- normalized `OpenPreviewResult` -> canonical JSON text
- JSON text -> Codex dynamic tool text content item

### Observability And Debug Points

- Codex bootstrap registration logs
- Codex dynamic tool call logs
- preview bridge logs

### Design Smells / Gaps

- Any legacy/backward-compatibility branch present? `No`
- Any tight coupling or cyclic cross-subsystem dependency introduced? `No`
- Any naming-to-responsibility drift detected? `No`

### Open Questions

- None.

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `Covered`

## Use Case: UC-004 `claude_agent_sdk` opens a preview session through run-level MCP tools

### Spine Context

- Spine ID(s): `DS-002`
- Spine Scope: `Primary End-to-End`
- Governing Owner: `PreviewSessionManager`
- Why This Use Case Matters To This Spine:
  - Claude already uses SDK-local MCP, so the design must show how preview joins that runtime without piggybacking incorrectly on team-only tooling.

### Goal

Expose preview-open behavior to Claude by merging a run-level preview MCP server map into the session's overall MCP configuration.

### Preconditions

- Runtime kind is `claude_agent_sdk`.
- Preview capability is supported.
- Claude runtime is building its run-level MCP server map.

### Expected Outcome

- Claude session receives preview MCP tools regardless of whether team send-message tooling is enabled.
- Preview MCP tool returns structured `OpenPreviewResult`.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session.ts:executeTurn(options) [ASYNC]
└── autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session.ts:buildRuntimeMcpServers() [ASYNC]
    ├── autobyteus-server-ts/src/agent-execution/backends/claude/preview/build-claude-preview-mcp-server.ts:buildClaudePreviewMcpServer(runContext, sdkClient) [ASYNC]
    │   ├── autobyteus-server-ts/src/agent-tools/preview/preview-tool-service.ts:isPreviewSupported() [STATE]
    │   ├── autobyteus-server-ts/src/agent-execution/backends/claude/preview/build-claude-preview-tool-definitions.ts:buildClaudePreviewToolDefinitions(...) [ASYNC]
    │   └── autobyteus-server-ts/src/runtime-management/claude/client/claude-sdk-client.ts:createMcpServer({ name, tools }) [ASYNC]
    ├── autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session.ts:buildTeamMcpServers(sendMessageToToolingEnabled) [ASYNC]
    └── autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session.ts:mergeMcpServerMaps(previewMcpServers, teamMcpServers) [STATE]

[ENTRY] autobyteus-server-ts/src/agent-execution/backends/claude/preview/open-preview-claude-tool-handler.ts:handle(rawArguments) [ASYNC]
├── autobyteus-server-ts/src/agent-tools/preview/preview-tool-contract.ts:parseOpenPreviewInput(rawArguments) [STATE]
├── autobyteus-server-ts/src/agent-tools/preview/preview-tool-service.ts:openPreview(input) [ASYNC]
│   ├── autobyteus-server-ts/src/agent-tools/preview/preview-bridge-client.ts:openPreview(input) [ASYNC][IO]
│   │   └── autobyteus-web/electron/preview/preview-bridge-server.ts:handleOpenPreview(request) [ASYNC][IO]
│   │       └── autobyteus-web/electron/preview/preview-session-manager.ts:openSession(input) [ASYNC][STATE]
│   └── autobyteus-server-ts/src/agent-tools/preview/preview-tool-service.ts:normalizeOpenPreviewResult(bridgeResult) [STATE]
└── return structured `OpenPreviewResult` [STATE]
```

### Branching / Fallback Paths

```text
[FALLBACK] if preview support is unavailable
build-claude-preview-mcp-server.ts:buildClaudePreviewMcpServer(...)
└── return null so preview tools are omitted from run-level MCP map [STATE]
```

```text
[ERROR] if bridge request fails during tool execution
open-preview-claude-tool-handler.ts:handle(...)
└── throw or return normalized preview error object [STATE]
```

### State And Data Transformations

- preview tool contract -> Claude tool definition schema
- raw Claude tool args -> canonical `OpenPreviewInput`
- bridge response -> normalized `OpenPreviewResult`

### Observability And Debug Points

- Claude MCP assembly logs
- preview bridge logs
- preview session creation logs

### Design Smells / Gaps

- Any legacy/backward-compatibility branch present? `No`
- Any tight coupling or cyclic cross-subsystem dependency introduced? `No`
- Any naming-to-responsibility drift detected? `No`

### Open Questions

- None.

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `Covered`

## Use Case: UC-005 agent captures a screenshot from an existing preview session

### Spine Context

- Spine ID(s): `DS-003`
- Spine Scope: `Primary End-to-End`
- Governing Owner: `PreviewSessionManager`
- Why This Use Case Matters To This Spine:
  - follow-up operations are the proof that `preview_session_id` is a real shared contract rather than a one-shot open response.

### Goal

Operate on an existing preview session using only `preview_session_id`.

### Preconditions

- A preview session already exists and is tracked by the owner.
- Agent/runtime has the `preview_session_id`.

### Expected Outcome

- Screenshot is captured from the correct session.
- Result returns a managed path tied to the same `preview_session_id`.

### Primary Runtime Call Stack

```text
[ENTRY] runtime-specific preview tool handler:capturePreviewScreenshot(input) [ASYNC]
├── autobyteus-server-ts/src/agent-tools/preview/preview-tool-contract.ts:parseCapturePreviewScreenshotInput(input) [STATE]
└── autobyteus-server-ts/src/agent-tools/preview/preview-tool-service.ts:capturePreviewScreenshot(canonicalInput) [ASYNC]
    ├── autobyteus-server-ts/src/agent-tools/preview/preview-tool-service.ts:assertPreviewSupported() [STATE]
    ├── autobyteus-server-ts/src/agent-tools/preview/preview-tool-service.ts:assertScreenshotSemantics(canonicalInput) [STATE]
    ├── autobyteus-server-ts/src/agent-tools/preview/preview-bridge-client.ts:capturePreviewScreenshot(canonicalInput) [ASYNC][IO]
    │   └── autobyteus-web/electron/preview/preview-bridge-server.ts:handleCapturePreviewScreenshot(request) [ASYNC][IO]
    │       └── autobyteus-web/electron/preview/preview-session-manager.ts:captureScreenshot(previewSessionId) [ASYNC][STATE]
    │           ├── autobyteus-web/electron/preview/preview-session-manager.ts:getSessionOrThrow(previewSessionId) [STATE]
    │           ├── electron:webContents.capturePage() [ASYNC][IO]
    │           ├── autobyteus-web/electron/preview/preview-screenshot-artifact-writer.ts:write(buffer, previewSessionId) [ASYNC][IO]
    │           └── return `CapturePreviewScreenshotResult` [STATE]
    └── autobyteus-server-ts/src/agent-tools/preview/preview-tool-service.ts:normalizeCapturePreviewScreenshotResult(bridgeResult) [STATE]
```

### Branching / Fallback Paths

```text
[FALLBACK] if session exists but needs focus/restore before capture
preview-session-manager.ts:captureScreenshot(previewSessionId)
└── restore/focus preview window before native capture [IO]
```

```text
[ERROR] if session was previously issued and later closed
preview-session-manager.ts:getSessionOrThrow(previewSessionId)
└── throw `preview_session_closed`
```

```text
[ERROR] if session ID was never issued or is malformed
preview-session-manager.ts:getSessionOrThrow(previewSessionId)
└── throw `preview_session_not_found`
```

### State And Data Transformations

- runtime tool args -> canonical `CapturePreviewScreenshotInput`
- `preview_session_id` -> session record lookup
- native page capture buffer -> artifact path
- artifact path -> normalized screenshot result

### Observability And Debug Points

- bridge screenshot request logs
- preview owner capture logs
- artifact writer output path logs

### Design Smells / Gaps

- Any legacy/backward-compatibility branch present? `No`
- Any tight coupling or cyclic cross-subsystem dependency introduced? `No`
- Any naming-to-responsibility drift detected? `No`

### Open Questions

- None.

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `Covered`

## Use Case: UC-006 native preview close invalidates the session without renderer-specific projection

### Spine Context

- Spine ID(s): `DS-004`
- Spine Scope: `Return-Event`
- Governing Owner: `PreviewSessionManager`
- Why This Use Case Matters To This Spine:
  - async native close is the main proof that Electron main, not renderer or the backend, owns session truth.

### Goal

Ensure native preview close updates authoritative session state without requiring a preview-specific renderer projection path, and makes later session lookups fail predictably.

### Preconditions

- A preview session is open.

### Expected Outcome

- Session is marked closed and invalidated immediately on native close.
- No preview-specific renderer IPC/store update is required in v1.
- Later preview tool lookups fail predictably.

### Primary Runtime Call Stack

```text
[ENTRY] electron:BrowserWindow:'closed' event [IO]
└── autobyteus-web/electron/preview/preview-session-manager.ts:handleWindowClosed(previewSessionId) [STATE]
    ├── autobyteus-web/electron/preview/preview-session-manager.ts:markSessionClosed(previewSessionId) [STATE]
    ├── autobyteus-web/electron/preview/preview-session-manager.ts:releaseNativeBindings(previewSessionId) [STATE]
    └── autobyteus-web/electron/preview/preview-session-manager.ts:finalizeClosedSession(previewSessionId) [STATE]
```

### Branching / Fallback Paths

```text
[FALLBACK] if an explicit close already invalidated the session before the native close callback lands
preview-session-manager.ts:handleWindowClosed(previewSessionId)
└── finalize idempotently and keep owner state authoritative [STATE]
```

```text
[ERROR] later preview tool call after native close
preview-session-manager.ts:getSessionOrThrow(previewSessionId)
└── throw `preview_session_closed` because the owner retains a closed-session tombstone [STATE]
```

### State And Data Transformations

- native close event -> session invalidation
- stale session lookup -> normalized error

### Observability And Debug Points

- native close logs
- preview owner invalidation logs

### Design Smells / Gaps

- Any legacy/backward-compatibility branch present? `No`
- Any tight coupling or cyclic cross-subsystem dependency introduced? `No`
- Any naming-to-responsibility drift detected? `No`

### Open Questions

- None.

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `Covered`

## Use Case: UC-007 preview session owner internal lifecycle remains coherent across open, reuse, close, and native-close

### Spine Context

- Spine ID(s): `DS-005`
- Spine Scope: `Bounded Local`
- Governing Owner: `PreviewSessionManager`
- Why This Use Case Matters To This Spine:
  - the session owner contains the real state machine; if it is implicit, the design is ownerless and fragile.

### Goal

Keep session-owner invariants coherent when bridge commands and native callbacks interleave.

### Preconditions

- Preview owner receives mixed inputs:
  - open/reuse requests
  - follow-up operation requests
  - native close events

### Expected Outcome

- One session ID maps to one authoritative record.
- Closed sessions cannot be reused accidentally.
- Closed sessions remain tombstoned so later lookups stay deterministic.
- Results and errors are emitted only after state truth is settled.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-web/electron/preview/preview-session-manager.ts:handleCommandOrEvent(input) [ASYNC][STATE]
├── normalize input kind (open / operation / native close) [STATE]
├── resolve session record or create candidate [STATE]
├── enforce invariants:
│   ├── one active native binding per open session [STATE]
│   ├── closed sessions cannot satisfy fresh open-reuse unless explicitly eligible [STATE]
│   ├── closed-session tombstones preserve deterministic `preview_session_closed` results [STATE]
│   └── malformed or never-issued IDs fail with `preview_session_not_found` before native action [STATE]
├── apply native action or invalidation [ASYNC][IO]
├── update final session state [STATE]
└── emit result or error only after final state is durable in memory [STATE]
```

### Branching / Fallback Paths

```text
[ERROR] if native callback arrives for unknown or already-released session binding
preview-session-manager.ts:handleCommandOrEvent(input)
└── log and ignore stale native callback after invariant check [STATE]
```

### State And Data Transformations

- mixed command/event input -> normalized owner action
- owner action -> session state transition
- final session state -> result or error decision

### Observability And Debug Points

- owner transition logs
- session lookup miss logs
- invalidation/idempotency logs when native callbacks arrive after state is already closed

### Design Smells / Gaps

- Any legacy/backward-compatibility branch present? `No`
- Any tight coupling or cyclic cross-subsystem dependency introduced? `No`
- Any naming-to-responsibility drift detected? `No`

### Open Questions

- None.

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `Covered`
