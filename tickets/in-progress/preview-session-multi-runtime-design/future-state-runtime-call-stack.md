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
- Call Stack Version: `v8`
- Requirements: `tickets/in-progress/preview-session-multi-runtime-design/requirements.md` (status `Refined`)
- Source Artifact:
  - `tickets/in-progress/preview-session-multi-runtime-design/proposed-design.md`
- Source Design Version: `v8`
- Referenced Sections:
  - Spine inventory sections: `Data-Flow Spine Inventory`, `Primary Execution / Data-Flow Spine(s)`, `Return / Event Spine(s)`, `Bounded Local / Internal Spines`
  - Ownership sections: `Ownership Map`, `Subsystem / Capability-Area Allocation`, `Ownership-Driven Dependency Rules`

## Future-State Modeling Rule (Mandatory)

- Model target design behavior even when current code diverges.
- Every use case declares which spine(s) it exercises from the approved design basis.
- The bounded local session-owner and shell-attachment spines are modeled explicitly where they materially affect correctness.

## Use Case Index (Stable IDs)

| use_case_id | Spine ID(s) | Spine Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Governing Owner | Source Type (`Requirement`/`Design-Risk`) | Requirement ID(s) | Design-Risk Objective (if source=`Design-Risk`) | Use Case Name | Coverage Target (Primary/Fallback/Error) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| UC-001 | DS-001 | Primary End-to-End | `PreviewToolService` | Requirement | R-005, R-010 | N/A | local packaged app startup exposes preview capability only where supported | Yes/Yes/Yes |
| UC-002 | DS-002 | Primary End-to-End | `PreviewSessionManager` | Requirement | R-001, R-004, R-005, R-008, R-010 | N/A | `autobyteus` runtime opens a preview session | Yes/Yes/Yes |
| UC-003 | DS-002 | Primary End-to-End | `PreviewSessionManager` | Requirement | R-001, R-005, R-010 | N/A | `codex_app_server` opens a preview session through a dynamic tool | Yes/Yes/Yes |
| UC-004 | DS-002 | Primary End-to-End | `PreviewSessionManager` | Requirement | R-001, R-005, R-010 | N/A | `claude_agent_sdk` opens a preview session through run-level MCP tools | Yes/Yes/Yes |
| UC-005 | DS-004 | Primary End-to-End | `PreviewShellController` | Requirement | R-002, R-003, R-006, R-007 | N/A | tool success focuses the preview session in the current shell and reveals the outer `Preview` tab from controller state | Yes/Yes/Yes |
| UC-006 | DS-003 | Primary End-to-End | `PreviewSessionManager` | Requirement | R-001, R-004, R-008, R-009 | N/A | agent uses screenshot, console, JavaScript, or DevTools on an existing preview session | Yes/Yes/Yes |
| UC-007 | DS-005 | Return-Event | `PreviewShellController` | Requirement | R-003, R-006, R-007 | N/A | user switches internal preview tabs or resizes/hides the right panel | Yes/Yes/Yes |
| UC-008 | DS-006 | Return-Event | `PreviewSessionManager` | Requirement | R-003, R-009, R-011 | N/A | closing preview sessions invalidates them and hides the outer `Preview` tab when the last session closes | Yes/Yes/Yes |
| UC-009 | DS-007 | Bounded Local | `PreviewSessionManager` | Design-Risk | R-001, R-004, R-009 | session registry and per-session browser-control invariants must survive create/reuse/close/close-after-close paths | preview session owner lifecycle remains coherent | Yes/N/A/Yes |
| UC-010 | DS-008 | Bounded Local | `PreviewShellController` | Design-Risk | R-002, R-003, R-006, R-007 | host bounds and active-session attachment must stay coherent across tab switches, resize, and hidden-state transitions | shell attachment lifecycle remains coherent | Yes/N/A/Yes |
| UC-011 | DS-005 | Return-Event | `PreviewShellController` | Design-Risk | R-002, R-003, R-006, R-007 | shell reload/reconnect must recover the current preview projection without relying on tool-result replay or renderer-owned shadow state | shell renderer bootstrap/reconnect recovers authoritative preview-shell state | Yes/N/A/Yes |

## Transition Notes

- The target state removes dedicated preview-window behavior. No compatibility branch for popup-window preview remains.
- Reaching the target state may require extracting shell-window composition out of `electron/main.ts` into a shell-window owner, but the call stack below models only the target shape.

## Use Case: UC-001 local packaged app startup exposes preview capability only where supported

### Spine Context

- Spine ID(s): `DS-001`
- Spine Scope: `Primary End-to-End`
- Governing Owner: `PreviewToolService`
- Why This Use Case Matters To This Spine:
  - preview tools must still be gated by real shell availability before any runtime adapter exposes them.

### Goal

Expose preview tools only when the packaged shell has a working preview bridge and shell-preview subsystem.

### Preconditions

- Electron app is starting normally.
- Internal packaged backend server process will be launched by the Electron shell.

### Expected Outcome

- Electron main starts the preview subsystem and seeds preview bridge env into the packaged server.
- Backend-side `PreviewToolService` can answer whether preview is supported.
- Runtime adapters expose preview tools only when support is available.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-web/electron/main.ts:bootstrap() [ASYNC]
├── autobyteus-web/electron/preview/preview-runtime.ts:startPreviewRuntime(...) [ASYNC]
│   ├── autobyteus-web/electron/preview/preview-session-manager.ts:constructor(...) [STATE]
│   ├── autobyteus-web/electron/preview/preview-shell-controller.ts:constructor(...) [STATE]
│   └── autobyteus-web/electron/preview/preview-bridge-server.ts:start() [ASYNC][IO]
├── autobyteus-web/electron/main.ts:setRuntimeEnvOverrides(...) [STATE]
└── autobyteus-web/electron/server/baseServerManager.ts:startServer() [ASYNC][IO]

[ENTRY] runtime bootstrap path [ASYNC]
├── autobyteus-server-ts/src/agent-tools/preview/preview-tool-service.ts:isPreviewSupported() [STATE]
├── native runtime tool registration includes preview tools when supported [STATE]
├── Codex bootstrap includes preview dynamic tool registrations when supported [STATE]
└── Claude run-level MCP build includes preview tools when supported [STATE]
```

### Branching / Fallback Paths

```text
[FALLBACK] if preview bridge env is missing or invalid
preview-tool-service.ts:isPreviewSupported()
└── return false so preview tools are not exposed [STATE]
```

```text
[ERROR] if preview runtime fails to start
preview-runtime.ts:startPreviewRuntime(...)
└── Electron logs the failure and preview support resolves unsupported [STATE]
```

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `Covered`

## Use Case: UC-002 `autobyteus` runtime opens a preview session

### Spine Context

- Spine ID(s): `DS-002`
- Spine Scope: `Primary End-to-End`
- Governing Owner: `PreviewSessionManager`

### Goal

Allow a native run to create or reuse a preview session backed by one independent `WebContentsView`.

### Preconditions

- Runtime kind is `autobyteus`.
- Preview capability is supported.
- `open_preview` is registered.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-ts/src/agent/handlers/tool-invocation-execution-event-handler.ts:handle(event, context) [ASYNC]
└── autobyteus-server-ts/src/agent-tools/preview/open-preview.ts:execute(context, kwargs) [ASYNC]
    ├── autobyteus-server-ts/src/agent-tools/preview/preview-tool-contract.ts:parseOpenPreviewInput(kwargs) [STATE]
    └── autobyteus-server-ts/src/agent-tools/preview/preview-tool-service.ts:openPreview(input) [ASYNC]
        ├── preview-tool-service.ts:assertPreviewSupported() [STATE]
        ├── preview-tool-service.ts:assertOpenPreviewSemantics(input) [STATE]
        └── autobyteus-server-ts/src/agent-tools/preview/preview-bridge-client.ts:openPreview(input) [ASYNC][IO]
            └── autobyteus-web/electron/preview/preview-bridge-server.ts:handleOpenPreview(request) [ASYNC][IO]
                └── autobyteus-web/electron/preview/preview-session-manager.ts:openSession(input) [ASYNC][STATE]
                    ├── preview-session-manager.ts:findReusableSession(normalizedUrl) [STATE]
                    ├── preview-session-manager.ts:createSessionRecord(normalizedUrl, title) [STATE]
                    ├── preview-session-manager.ts:createSessionView(session) [STATE]
                    ├── electron:WebContentsView.webContents.loadURL(url) [IO]
                    ├── preview-session-manager.ts:attachSessionObservers(session) [STATE]
                    ├── preview-session-manager.ts:waitForRequestedReadyState(session, input.wait_until ?? 'load') [ASYNC][IO]
                    └── preview-session-manager.ts:buildOpenPreviewResult(session) [STATE]
```

### Branching / Fallback Paths

```text
[FALLBACK] if reuse_existing=true and a matching ready session exists
preview-session-manager.ts:findReusableSession(normalizedUrl)
└── return existing session with status='reused' [STATE]
```

```text
[ERROR] if preview support is unavailable
preview-tool-service.ts:assertPreviewSupported()
└── throw normalized `preview_unsupported_in_current_environment` [STATE]
```

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `Covered`

## Use Case: UC-003 `codex_app_server` opens a preview session through a dynamic tool

### Spine Context

- Spine ID(s): `DS-002`
- Spine Scope: `Primary End-to-End`
- Governing Owner: `PreviewSessionManager`

### Goal

Keep the Codex path semantically identical to the native runtime path.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-server-ts/src/agent-execution/backends/codex/preview/build-preview-dynamic-tool-registrations.ts:handler(rawInput) [ASYNC]
├── preview-tool-contract.ts:parseOpenPreviewInput(rawInput) [STATE]
└── preview-tool-service.ts:openPreview(input) [ASYNC]
    └── same bridge + session-owner flow as UC-002 [ASYNC][IO][STATE]
```

### Branching / Fallback Paths

```text
[ERROR] if preview is unsupported for the run environment
build-preview-dynamic-tool-registrations.ts:buildPreviewDynamicToolRegistrations(...)
└── do not register preview dynamic tools [STATE]
```

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `Covered`

## Use Case: UC-004 `claude_agent_sdk` opens a preview session through run-level MCP tools

### Spine Context

- Spine ID(s): `DS-002`
- Spine Scope: `Primary End-to-End`
- Governing Owner: `PreviewSessionManager`

### Goal

Keep the Claude MCP path semantically identical to the native runtime path.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-server-ts/src/agent-execution/backends/claude/preview/build-claude-preview-tool-definitions.ts:toolHandler(args) [ASYNC]
├── preview-tool-contract.ts:parseOpenPreviewInput(args) [STATE]
└── preview-tool-service.ts:openPreview(input) [ASYNC]
    └── same bridge + session-owner flow as UC-002 [ASYNC][IO][STATE]
```

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `Covered`

## Use Case: UC-005 tool success requests focus for the preview session in the current shell and reveals the outer `Preview` tab from controller state

### Spine Context

- Spine ID(s): `DS-004`
- Spine Scope: `Primary End-to-End`
- Governing Owner: `PreviewShellController`

### Goal

After the backend successfully opens a preview session, the renderer window displaying the run requests focus for that session in its shell, and `PreviewShellController` makes the shell snapshot authoritative.

### Preconditions

- A preview session already exists in `PreviewSessionManager`.
- The renderer is displaying the run that produced the successful tool result.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-web/services/agentStreaming/handlers/toolLifecycleHandler.ts:handleSucceededTool(activity) [STATE]
└── autobyteus-web/stores/previewShellStore.ts:requestFocusFromOpenPreviewResult(activity) [ASYNC][STATE]
    └── autobyteus-web/electron/preload.ts:electronAPI.preview.focusSession(preview_session_id) [ASYNC][IO]
        └── autobyteus-web/electron/preview/preview-shell-controller.ts:focusSessionForCurrentShell(previewSessionId) [STATE]
            ├── preview-shell-controller.ts:resolveCurrentShellWindowId(eventSender) [STATE]
            ├── preview-shell-controller.ts:setActiveSession(shellWindowId, previewSessionId) [STATE]
            ├── preview-shell-controller.ts:reconcile(shellWindowId) [STATE]
            └── preview-shell-controller.ts:broadcastShellSnapshot(shellWindowId) [STATE]

[ENTRY] autobyteus-web/stores/previewShellStore.ts:handleShellSnapshot(snapshot) [STATE]
├── derive outer Preview tab visibility from snapshot.sessions.length [STATE]
├── derive internal preview tabs from snapshot.sessions [STATE]
└── derive active preview tab from snapshot.activePreviewSessionId [STATE]

[ENTRY] autobyteus-web/components/workspace/tools/PreviewPanel.vue:reportHostRect(...) [ASYNC][STATE]
└── autobyteus-web/electron/preload.ts:electronAPI.preview.updateHostRect(rect) [ASYNC][IO]
    └── autobyteus-web/electron/preview/preview-shell-controller.ts:updateHostRectForCurrentShell(rect) [STATE]
        ├── preview-shell-controller.ts:resolveCurrentShellWindowId(eventSender) [STATE]
        ├── preview-shell-controller.ts:reconcile(shellWindowId) [STATE]
        └── preview-shell-controller.ts:broadcastShellSnapshot(shellWindowId) [STATE]
```

### Branching / Fallback Paths

```text
[FALLBACK] if host rect is not yet available
preview-shell-controller.ts:updateHostRectForCurrentShell(null)
└── keep the session visible in the shell snapshot but unattached until the renderer reports a visible host rect [STATE]
```

```text
[ERROR] if the session closes before the focus request is processed
preview-shell-controller.ts:focusSessionForCurrentShell(previewSessionId)
└── reject the focus request and keep the prior shell snapshot unchanged [STATE]
```

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `Covered`

## Use Case: UC-006 agent uses screenshot, console, JavaScript, or DevTools on an existing preview session

### Spine Context

- Spine ID(s): `DS-003`
- Spine Scope: `Primary End-to-End`
- Governing Owner: `PreviewSessionManager`

### Goal

Preserve browser-control capabilities per session after moving preview into the shell.

### Primary Runtime Call Stack

```text
[ENTRY] runtime-specific preview tool handler [ASYNC]
├── preview-tool-contract.ts:parseFollowUpInput(...) [STATE]
└── preview-tool-service.ts:<action>(input) [ASYNC]
    └── preview-bridge-client.ts:post(...) [ASYNC][IO]
        └── preview-bridge-server.ts:handle<Action>(request) [ASYNC][IO]
            └── preview-session-manager.ts:<action>(preview_session_id, ...) [ASYNC][STATE]
                ├── preview-session-manager.ts:getOpenSessionOrThrow(preview_session_id) [STATE]
                ├── if screenshot -> session.view.webContents.capturePage(...) [IO]
                ├── if console -> session.logBuffer.list(...) [STATE]
                ├── if javascript -> session.view.webContents.executeJavaScript(code) [ASYNC][IO]
                ├── if devtools -> session.view.webContents.openDevTools({ mode: 'detach' }) [STATE]
                └── normalize result [STATE]
```

### Branching / Fallback Paths

```text
[ERROR] if preview_session_id was already closed
preview-session-manager.ts:getOpenSessionOrThrow(preview_session_id)
└── throw normalized `preview_session_closed` [STATE]
```

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `Covered`

## Use Case: UC-007 user switches internal preview tabs or resizes/hides the right panel

### Spine Context

- Spine ID(s): `DS-005`
- Spine Scope: `Return-Event`
- Governing Owner: `PreviewShellController`

### Goal

Keep the active native preview attachment aligned with renderer shell state.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-web/components/workspace/tools/PreviewPanel.vue:onSessionSelected(preview_session_id) [ASYNC][STATE]
└── autobyteus-web/electron/preload.ts:electronAPI.preview.setActiveSession(preview_session_id) [ASYNC][IO]
    └── autobyteus-web/electron/preview/preview-shell-controller.ts:setActiveSessionForCurrentShell(previewSessionId) [STATE]
        ├── detach previous active session view [STATE]
        ├── attach selected session view to shell host [STATE]
        └── broadcastShellSnapshot(shellWindowId) [STATE]

[ENTRY] PreviewPanel.vue:resizeObserverCallback(rect) [ASYNC][STATE]
└── electronAPI.preview.updateHostRect(rect) [ASYNC][IO]
    └── preview-shell-controller.ts:updateHostRectForCurrentShell(rect) [STATE]

[ENTRY] PreviewPanel.vue:onHidden() [ASYNC][STATE]
└── electronAPI.preview.updateHostRect(null) [ASYNC][IO]
    └── preview-shell-controller.ts:detachForHiddenHostForCurrentShell() [STATE]
```

### Branching / Fallback Paths

```text
[ERROR] if the requested session is not owned by this shell projection
preview-shell-controller.ts:setActiveSessionForCurrentShell(previewSessionId)
└── reject request and keep prior active attachment [STATE]
```

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `Covered`

## Use Case: UC-008 closing preview sessions invalidates them and hides the outer `Preview` tab when the last session closes

### Spine Context

- Spine ID(s): `DS-006`
- Spine Scope: `Return-Event`
- Governing Owner: `PreviewSessionManager`

### Goal

Keep session invalidation and shell cleanup deterministic across both tool-driven and user-driven closes.

### Primary Runtime Call Stack

```text
[ENTRY] runtime preview close tool OR renderer close action [ASYNC]
└── autobyteus-web/electron/preview/preview-session-manager.ts:closeSession(preview_session_id) [ASYNC][STATE]
    ├── remove session from registry [STATE]
    ├── remember closed-session tombstone [STATE]
    ├── autobyteus-web/electron/preview/preview-shell-controller.ts:handleSessionClosed(preview_session_id) [STATE]
    │   ├── detach the active session view if attached [STATE]
    │   ├── select the next remaining session or none [STATE]
    │   └── broadcast shell snapshot to renderer [STATE]
    └── return normalized `closed` result [STATE]

[ENTRY] autobyteus-web/stores/previewShellStore.ts:handleShellSnapshot(snapshot) [STATE]
└── if no sessions remain -> outer Preview tab becomes hidden [STATE]
```

### Branching / Fallback Paths

```text
[ERROR] if a later tool call reuses the closed session id
preview-session-manager.ts:getOpenSessionOrThrow(preview_session_id)
└── throw normalized `preview_session_closed` [STATE]
```

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `Covered`

## Use Case: UC-009 preview session owner lifecycle remains coherent

### Spine Context

- Spine ID(s): `DS-007`
- Spine Scope: `Bounded Local`
- Governing Owner: `PreviewSessionManager`

### Goal

Keep session creation, reuse, and close invariants authoritative.

### Primary Runtime Call Stack

```text
[ENTRY] preview-session-manager.ts:openSession(...) [ASYNC][STATE]
├── normalize url + reuse decision [STATE]
├── create session record with one WebContentsView [STATE]
├── attach observers + load content [ASYNC][IO]
├── settle opening state -> open [STATE]
└── return result [STATE]

[ENTRY] preview-session-manager.ts:closeSession(...) [ASYNC][STATE]
├── invalidate registry entry [STATE]
├── remember tombstone [STATE]
└── notify shell controller [STATE]
```

### Branching / Fallback Paths

```text
[ERROR] if opening fails after session allocation
preview-session-manager.ts:openSession(...)
└── destroy the allocated session view, remove registry entry, and return normalized error [STATE]
```

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `Covered`

## Use Case: UC-010 shell attachment lifecycle remains coherent

### Spine Context

- Spine ID(s): `DS-008`
- Spine Scope: `Bounded Local`
- Governing Owner: `PreviewShellController`

### Goal

Ensure the shell host always shows the correct active preview view and never shows more than one attached active view in the same host.

### Primary Runtime Call Stack

```text
[ENTRY] preview-shell-controller.ts:reconcile(shellWindowId) [STATE]
├── resolve shellWindowId + shell host registration + host rect [STATE]
├── resolve claimed sessions for the shell window [STATE]
├── resolve active preview session [STATE]
├── detach no-longer-active view if present [STATE]
├── attach active session view if host is visible [STATE]
└── emit snapshot [STATE]
```

### Branching / Fallback Paths

```text
[ERROR] if the shell host is destroyed while a preview view is attached
preview-shell-controller.ts:onShellDestroyed(shellWindowId)
└── detach the view and leave the session unattached but valid [STATE]
```

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `Covered`

## Use Case: UC-011 shell renderer bootstrap/reconnect recovers authoritative preview-shell state

### Spine Context

- Spine ID(s): `DS-005`
- Spine Scope: `Return-Event`
- Governing Owner: `PreviewShellController`

### Goal

Ensure that a shell renderer mount, reload, or reconnect can recover the current preview-shell state without relying on replayed tool results or renderer-owned shadow state.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-web/components/workspace/tools/PreviewPanel.vue:onMounted() [ASYNC][STATE]
└── autobyteus-web/electron/preload.ts:electronAPI.preview.registerHost() [ASYNC][IO]
    └── autobyteus-web/electron/preview/preview-shell-controller.ts:registerHostForCurrentShell() [STATE]
        ├── preview-shell-controller.ts:resolveCurrentShellWindowId(eventSender) [STATE]
        ├── preview-shell-controller.ts:ensureShellState(shellWindowId) [STATE]
        ├── preview-shell-controller.ts:reconcile(shellWindowId) [STATE]
        └── preview-shell-controller.ts:broadcastShellSnapshot(shellWindowId) [STATE]

[ENTRY] autobyteus-web/stores/previewShellStore.ts:handleShellSnapshot(snapshot) [STATE]
├── rebuild visible preview-tab list from snapshot.sessions [STATE]
├── restore active preview tab from snapshot.activePreviewSessionId [STATE]
└── show or hide the outer Preview tab from the authoritative snapshot [STATE]
```

### Branching / Fallback Paths

```text
[FALLBACK] if the shell reconnects before the preview host reports bounds
preview-shell-controller.ts:registerHostForCurrentShell()
└── publish the current shell snapshot immediately, then attach the active session only after updateHostRect reports a visible host rect [STATE]
```

```text
[ERROR] if the shell window no longer owns any claimed preview session
preview-shell-controller.ts:reconcile(shellWindowId)
└── publish an empty snapshot and keep the outer Preview tab hidden [STATE]
```

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `Covered`
