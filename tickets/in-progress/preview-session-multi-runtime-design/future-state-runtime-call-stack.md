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
- Call Stack Version: `v12`
- Requirements: `tickets/in-progress/preview-session-multi-runtime-design/requirements.md` (status `Refined`)
- Source Artifact:
  - `tickets/in-progress/preview-session-multi-runtime-design/proposed-design.md`
- Source Design Version: `v12`
- Referenced Sections:
  - Spine inventory sections: `Data-Flow Spine Inventory`, `Primary Execution / Data-Flow Spine(s)`, `Return / Event Spine(s)`, `Bounded Local / Internal Spines`
  - Ownership sections: `Ownership Map`, `Subsystem / Capability-Area Allocation`, `Ownership-Driven Dependency Rules`

## Future-State Modeling Rule (Mandatory)

- Model target design behavior even when current code diverges.
- Every use case declares which spine(s) it exercises from the approved design basis.
- The bounded local session-registry, navigation, page-operation, shell-attachment, and Codex parsing spines are modeled explicitly where they materially affect correctness.

## Use Case Index (Stable IDs)

| use_case_id | Spine ID(s) | Spine Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Governing Owner | Source Type (`Requirement`/`Design-Risk`) | Requirement ID(s) | Design-Risk Objective (if source=`Design-Risk`) | Use Case Name | Coverage Target (Primary/Fallback/Error) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| UC-001 | DS-001 | Primary End-to-End | `PreviewToolService` | Requirement | R-005, R-010 | N/A | packaged startup exposes preview capability from one shared tool manifest only when supported | Yes/Yes/Yes |
| UC-002 | DS-002 | Primary End-to-End | `PreviewSessionManager` | Requirement | R-001, R-004, R-008 | N/A | native runtime opens or reuses a preview session | Yes/Yes/Yes |
| UC-003 | DS-002 | Primary End-to-End | `PreviewSessionManager` | Requirement | R-001, R-005, R-010 | N/A | Codex opens a preview session through manifest-driven dynamic tools | Yes/Yes/Yes |
| UC-004 | DS-002 | Primary End-to-End | `PreviewSessionManager` | Requirement | R-001, R-005, R-010 | N/A | Claude opens a preview session through manifest-driven MCP tools | Yes/Yes/Yes |
| UC-005 | DS-004 | Primary End-to-End | `PreviewShellController` | Requirement | R-002, R-003, R-006, R-007 | N/A | successful tool result focuses the preview session and reveals the outer Preview tab | Yes/Yes/Yes |
| UC-006 | DS-003 | Primary End-to-End | `PreviewSessionManager` | Requirement | R-001, R-008, R-009 | N/A | follow-up preview tools operate on the same `preview_session_id` | Yes/Yes/Yes |
| UC-007 | DS-005 | Return-Event | `PreviewShellController` | Requirement | R-003, R-006, R-007 | N/A | shell host reload/resize/hide/select events keep preview projection authoritative | Yes/Yes/Yes |
| UC-008 | DS-006 | Return-Event | `PreviewSessionManager` | Requirement | R-003, R-009, R-011 | N/A | closing preview sessions invalidates them and hides the outer Preview tab when the last session closes | Yes/Yes/Yes |
| UC-009 | DS-007 | Bounded Local | `PreviewSessionManager` | Design-Risk | R-001, R-009 | registry/list/reuse/close invariants must remain readable and centralized after the split | preview session registry lifecycle remains coherent | Yes/N/A/Yes |
| UC-010 | DS-008 | Bounded Local | `PreviewSessionNavigation` | Design-Risk | R-001, R-008 | open/navigate readiness sequencing must stay explicit and separate from registry ownership | navigation and ready-state settlement remain coherent | Yes/N/A/Yes |
| UC-011 | DS-009 | Bounded Local | `PreviewSessionPageOperations` | Design-Risk | R-008 | page-read, DOM snapshot, screenshot, and JavaScript execution must stay grouped around one browser-operation owner | preview page-operation boundary remains coherent | Yes/N/A/Yes |
| UC-012 | DS-010 | Bounded Local | `CodexToolPayloadParser` | Design-Risk | R-005, R-010 | preview tool payload parsing must leave the all-purpose Codex item parser and keep one subject owner | Codex preview payload parsing remains coherent | Yes/N/A/Yes |
| UC-013 | DS-011 | Bounded Local | `PreviewShellController` | Design-Risk | R-006, R-009 | shell projection lease must be explicit and non-stealable even though session lifecycle remains global | preview shell lease remains coherent | Yes/N/A/Yes |

## Transition Notes

- This re-entry does not change user-visible behavior from v9.
- The migration is structural:
  - keep the v10/v11 contract/manifest/session splits,
  - make shell projection lease explicit and non-stealable,
  - remove primitive-level string coercion from the strict preview contract,
  - tighten Codex tool-metadata ownership inside the subject parser.
- Temporary compatibility parsing is not allowed in the target state.

## Use Case: UC-001 packaged startup exposes preview capability from one shared tool manifest only when supported

### Spine Context

- Spine ID(s): `DS-001`
- Spine Scope: `Primary End-to-End`
- Governing Owner: `PreviewToolService`
- Why This Use Case Matters To This Spine:
  - preview tools must be exposed truthfully and once, without runtime-local duplication.

### Goal

Expose preview tools only when the packaged shell has a working preview subsystem, and derive the tool surface from one owned preview manifest.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-web/electron/main.ts:bootstrap() [ASYNC]
├── autobyteus-web/electron/preview/preview-runtime.ts:startPreviewRuntime(...) [ASYNC]
│   ├── autobyteus-web/electron/preview/preview-session-manager.ts:constructor(...) [STATE]
│   ├── autobyteus-web/electron/preview/preview-session-navigation.ts:constructor(...) [STATE]
│   ├── autobyteus-web/electron/preview/preview-session-page-operations.ts:constructor(...) [STATE]
│   ├── autobyteus-web/electron/preview/preview-shell-controller.ts:constructor(...) [STATE]
│   └── autobyteus-web/electron/preview/preview-bridge-server.ts:start() [ASYNC][IO]
├── autobyteus-web/electron/main.ts:setRuntimeEnvOverrides(...) [STATE]
└── autobyteus-web/electron/server/baseServerManager.ts:startServer() [ASYNC][IO]

[ENTRY] preview-capable runtime bootstrap [ASYNC]
├── autobyteus-server-ts/src/agent-tools/preview/preview-tool-service.ts:isPreviewSupported() [STATE]
├── autobyteus-server-ts/src/agent-tools/preview/preview-tool-manifest.ts:listPreviewToolDefinitions() [STATE]
├── autobyteus-server-ts/src/agent-tools/preview/preview-tool-parameter-schemas.ts:buildNativeParameterSchema(...) [STATE]
├── native tool registration path renders tools from the manifest [STATE]
├── Codex dynamic-tool builder renders tools from the manifest [STATE]
└── Claude MCP builder renders tools from the manifest [STATE]
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

## Use Case: UC-002 native runtime opens or reuses a preview session

### Spine Context

- Spine ID(s): `DS-002`
- Spine Scope: `Primary End-to-End`
- Governing Owner: `PreviewSessionManager`
- Why This Use Case Matters To This Spine:
  - the core preview contract still starts with one stable `preview_session_id`.

### Goal

Allow the native runtime to open or reuse a preview session backed by one independent `WebContentsView`, while keeping session lifecycle global and making shell projection lease-aware.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-ts/src/agent/handlers/tool-invocation-execution-event-handler.ts:handle(event, context) [ASYNC]
└── autobyteus-server-ts/src/agent-tools/preview/open-preview.ts:execute(context, kwargs) [ASYNC]
    ├── autobyteus-server-ts/src/agent-tools/preview/preview-tool-input-parsers.ts:parseOpenPreviewInput(kwargs) [STATE]
    └── autobyteus-server-ts/src/agent-tools/preview/preview-tool-service.ts:openPreview(input) [ASYNC]
        ├── preview-tool-service.ts:assertPreviewSupported() [STATE]
        ├── autobyteus-server-ts/src/agent-tools/preview/preview-tool-semantic-validators.ts:assertOpenPreviewSemantics(input) [STATE]
        └── autobyteus-server-ts/src/agent-tools/preview/preview-bridge-client.ts:openPreview(input) [ASYNC][IO]
            └── autobyteus-web/electron/preview/preview-bridge-server.ts:handleOpenPreview(request) [ASYNC][IO]
                └── autobyteus-web/electron/preview/preview-session-manager.ts:openSession(input) [ASYNC][STATE]
                    ├── preview-session-manager.ts:findReusableSession(...) [STATE]
                    │   └── reuse only opening or unclaimed matching sessions [STATE]
                    ├── preview-session-manager.ts:createSessionRecord(...) [STATE]
                    ├── autobyteus-web/electron/preview/preview-session-navigation.ts:openSessionView(session, input) [ASYNC][IO]
                    └── preview-session-manager.ts:buildOpenPreviewResult(session, status) [STATE]
```

### Branching / Fallback Paths

```text
[FALLBACK] if reuse_existing=true and a matching ready session exists
preview-session-manager.ts:findReusableSession(...)
└── return existing session with status='reused' only when the session is not already claimed by another shell [STATE]
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

## Use Case: UC-003 Codex opens a preview session through manifest-driven dynamic tools

### Spine Context

- Spine ID(s): `DS-002`
- Spine Scope: `Primary End-to-End`
- Governing Owner: `PreviewSessionManager`

### Goal

Keep the Codex open-preview path semantically identical to the native path while deriving the dynamic tool surface from the shared manifest.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-server-ts/src/agent-execution/backends/codex/preview/build-preview-dynamic-tool-registrations.ts:handler(rawInput) [ASYNC]
├── autobyteus-server-ts/src/agent-tools/preview/preview-tool-input-parsers.ts:parseOpenPreviewInput(rawInput) [STATE]
└── autobyteus-server-ts/src/agent-tools/preview/preview-tool-service.ts:openPreview(input) [ASYNC]
    └── same bridge + session-owner flow as UC-002 [ASYNC][IO][STATE]
```

### Branching / Fallback Paths

```text
[ERROR] if preview is unsupported
build-preview-dynamic-tool-registrations.ts:buildPreviewDynamicToolRegistrations(...)
└── return no preview dynamic tools for the run [STATE]
```

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `Covered`

## Use Case: UC-004 Claude opens a preview session through manifest-driven MCP tools

### Spine Context

- Spine ID(s): `DS-002`
- Spine Scope: `Primary End-to-End`
- Governing Owner: `PreviewSessionManager`

### Goal

Keep the Claude MCP path semantically identical to the native path while deriving the tool surface from the same manifest.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-server-ts/src/agent-execution/backends/claude/preview/build-claude-preview-tool-definitions.ts:toolHandler(args) [ASYNC]
├── autobyteus-server-ts/src/agent-tools/preview/preview-tool-input-parsers.ts:parseOpenPreviewInput(args) [STATE]
└── autobyteus-server-ts/src/agent-tools/preview/preview-tool-service.ts:openPreview(input) [ASYNC]
    └── same bridge + session-owner flow as UC-002 [ASYNC][IO][STATE]
```

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `Covered`

## Use Case: UC-005 successful tool result focuses the preview session and reveals the outer Preview tab

### Spine Context

- Spine ID(s): `DS-004`
- Spine Scope: `Primary End-to-End`
- Governing Owner: `PreviewShellController`

### Goal

After `open_preview` succeeds, a preview-owned renderer boundary requests focus for the session in the current shell, the shell controller claims the session lease if it is available, and the authoritative shell snapshot reveals the Preview tab.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-web/services/agentStreaming/preview/previewToolExecutionSucceededHandler.ts:handlePreviewToolExecutionSucceeded(payload) [ASYNC][STATE]
├── autobyteus-web/stores/previewShellStore.ts:focusSession(previewSessionId) [ASYNC][STATE]
├── autobyteus-web/composables/useRightSideTabs.ts:setActiveTab('preview') [STATE]
├── autobyteus-web/electron/preload.ts:electronAPI.preview.focusSession(...) [ASYNC]
└── autobyteus-web/electron/preview/preview-shell-controller.ts:focusSession(shellId, previewSessionId) [ASYNC][STATE]
    ├── preview-shell-controller.ts:claimSessionLease(shellId, previewSessionId) [STATE]
    ├── preview-shell-controller.ts:setActiveSession(...) [STATE]
    ├── preview-shell-controller.ts:attachActiveSessionView(...) [ASYNC][STATE]
    └── preview-shell-controller.ts:publishSnapshot(shellId) [STATE]
```

### Branching / Fallback Paths

```text
[FALLBACK] if the shell host is registered but the Preview tab is not active yet
preview-shell-controller.ts:publishSnapshot(shellId)
└── snapshot makes the outer Preview tab visible before attachment completes [STATE]
```

```text
[ERROR] if the requested preview session is already closed
preview-shell-controller.ts:focusSession(shellId, previewSessionId)
└── resolve canonical not-found/closed semantics from the session owner [STATE]
```

```text
[ERROR] if another shell already owns the session lease
preview-shell-controller.ts:claimSessionLease(shellId, previewSessionId)
└── keep the current owner attached; do not silently detach from another shell [STATE]
```

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `Covered`

## Use Case: UC-006 follow-up preview tools operate on the same `preview_session_id`

### Spine Context

- Spine ID(s): `DS-003`
- Spine Scope: `Primary End-to-End`
- Governing Owner: `PreviewSessionManager`

### Goal

Keep list/read-page/DOM-snapshot/screenshot/JavaScript/close operations session-oriented and routed to the correct preview owner.

### Primary Runtime Call Stack

```text
[ENTRY] preview tool entrypoint [ASYNC]
├── preview-tool-input-parsers.ts:parse<Operation>Input(...) [STATE]
├── preview-tool-service.ts:<operation>(input) [ASYNC]
├── preview-tool-semantic-validators.ts:assert<Operation>Semantics(input) [STATE]
├── preview-bridge-client.ts:<operation>(input) [ASYNC][IO]
├── preview-bridge-server.ts:handle<Operation>(request) [ASYNC][IO]
└── Electron preview boundary dispatches by subject [ASYNC][STATE]
    ├── list/close -> preview-session-manager.ts:<operation>(...) [STATE]
    ├── navigate -> preview-session-navigation.ts:navigateSession(...) [ASYNC][IO]
    └── read/dom/screenshot/js -> preview-session-page-operations.ts:<operation>(...) [ASYNC][IO]
```

### Branching / Fallback Paths

```text
[ERROR] if the session is already closed
preview-session-manager.ts:getRequiredSession(...)
└── throw canonical `preview_session_closed` [STATE]
```

```text
[ERROR] if the session ID was never issued
preview-session-manager.ts:getRequiredSession(...)
└── throw canonical `preview_session_not_found` [STATE]
```

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `Covered`

## Use Case: UC-007 shell host reload/resize/hide/select events keep preview projection authoritative

### Spine Context

- Spine ID(s): `DS-005`
- Spine Scope: `Return-Event`
- Governing Owner: `PreviewShellController`

### Goal

Keep shell projection authoritative through renderer lifecycle and layout changes without turning the renderer into a second owner.

### Primary Runtime Call Stack

```text
[ENTRY] renderer preview panel/store event [ASYNC]
├── electronAPI.preview.registerHost(...) / updateHostRect(...) / setPreviewVisibility(...) / selectInternalTab(...) [ASYNC]
└── preview-shell-controller.ts:<hostOperation>(...) [ASYNC][STATE]
    ├── preview-shell-controller.ts:updateHostRegistration(...) [STATE]
    ├── preview-shell-controller.ts:attachOrDetachForHostState(...) [ASYNC][STATE]
    └── preview-shell-controller.ts:publishSnapshot(shellId) [STATE]
```

### Branching / Fallback Paths

```text
[FALLBACK] if the right panel is hidden
preview-shell-controller.ts:attachOrDetachForHostState(...)
└── detach active view but keep session state alive [STATE]
```

```text
[ERROR] if the shell host reloads before the renderer re-registers
preview-shell-controller.ts:handleHostLost(...)
└── keep shell snapshot recoverable and await new host registration [STATE]
```

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `Covered`

## Use Case: UC-008 closing preview sessions invalidates them and hides the outer Preview tab when the last session closes

### Spine Context

- Spine ID(s): `DS-006`
- Spine Scope: `Return-Event`
- Governing Owner: `PreviewSessionManager`

### Goal

Make close semantics deterministic for tool calls, shell UI closes, and later lookups.

### Primary Runtime Call Stack

```text
[ENTRY] close source [ASYNC]
├── tool path -> preview-tool-service.ts:closePreview(input) [ASYNC]
├── shell UI path -> preview-shell-controller.ts:closeSessionFromShell(...) [ASYNC]
└── preview-session-manager.ts:closeSession(previewSessionId) [STATE]
    ├── preview-session-manager.ts:removeActiveRecord(...) [STATE]
    ├── preview-session-manager.ts:recordClosedTombstone(...) [STATE]
    ├── preview-shell-controller.ts:onSessionClosed(previewSessionId) [STATE]
    └── preview-shell-controller.ts:publishSnapshot(shellId) [STATE]
```

### Branching / Fallback Paths

```text
[FALLBACK] if another session still exists
preview-shell-controller.ts:onSessionClosed(...)
└── select fallback active session and keep the outer Preview tab visible [STATE]
```

```text
[ERROR] if a second close hits the same session
preview-session-manager.ts:closeSession(previewSessionId)
└── resolve canonical `preview_session_closed` [STATE]
```

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `Covered`

## Use Case: UC-009 preview session registry lifecycle remains coherent

### Spine Context

- Spine ID(s): `DS-007`
- Spine Scope: `Bounded Local`
- Governing Owner: `PreviewSessionManager`

### Goal

Keep create/reuse/list/close invariants small, readable, and centralized.

### Primary Runtime Call Stack

```text
[ENTRY] preview-session-manager.ts:<lifecycleOperation>(...) [STATE]
├── preview-session-manager.ts:getSessionById(...) / findReusableSession(...) [STATE]
├── preview-session-manager.ts:createSessionRecord(...) [STATE]
├── preview-session-manager.ts:updateRegistry(...) [STATE]
└── preview-session-manager.ts:buildLifecycleResult(...) [STATE]
```

### Branching / Fallback Paths

```text
[ERROR] if registry lookup hits a previously closed ID
preview-session-manager.ts:getSessionById(...)
└── return canonical closed semantics rather than generic not-found [STATE]
```

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `Covered`

## Use Case: UC-010 navigation and ready-state settlement remain coherent

### Spine Context

- Spine ID(s): `DS-008`
- Spine Scope: `Bounded Local`
- Governing Owner: `PreviewSessionNavigation`

### Goal

Keep open/navigate load sequencing and ready-state semantics explicit and separate from registry ownership.

### Primary Runtime Call Stack

```text
[ENTRY] preview-session-navigation.ts:openSessionView(session, input) / navigateSession(session, input) [ASYNC]
├── preview-session-navigation.ts:normalizeUrl(...) [STATE]
├── electron:sessionView.webContents.loadURL(...) [IO]
├── preview-session-navigation.ts:waitForReadyState(...) [ASYNC][IO]
├── preview-session-navigation.ts:settleTitle(...) [STATE]
└── preview-session-navigation.ts:buildNavigationResult(...) [STATE]
```

### Branching / Fallback Paths

```text
[ERROR] if loadURL or readiness wait fails
preview-session-navigation.ts:waitForReadyState(...)
└── throw canonical `preview_navigation_failed` [STATE]
```

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `Covered`

## Use Case: UC-011 preview page-operation boundary remains coherent

### Spine Context

- Spine ID(s): `DS-009`
- Spine Scope: `Bounded Local`
- Governing Owner: `PreviewSessionPageOperations`

### Goal

Keep read-page, DOM snapshot, screenshot, and JavaScript execution behind one browser-operation owner around an existing session view.

### Primary Runtime Call Stack

```text
[ENTRY] preview-session-page-operations.ts:<operation>(session, input) [ASYNC]
├── preview-session-page-operations.ts:getLiveWebContents(session) [STATE]
├── read -> preview-page-cleaner.ts:cleanPage(...) [STATE]
├── dom snapshot -> preview-dom-snapshot-script.ts:runInPage(...) [ASYNC][IO]
├── screenshot -> electron:webContents.capturePage(...) [ASYNC][IO]
├── screenshot -> preview-screenshot-artifact-writer.ts:write(...) [ASYNC][IO]
└── javascript -> electron:webContents.executeJavaScript(...) [ASYNC][IO]
```

### Branching / Fallback Paths

```text
[ERROR] if page reading fails
preview-session-page-operations.ts:readPreviewPage(...)
└── throw canonical `preview_page_read_failed` [STATE]
```

```text
[ERROR] if DOM snapshot or JavaScript execution fails
preview-session-page-operations.ts:previewDomSnapshot(...) / executePreviewJavascript(...)
└── throw canonical `preview_dom_snapshot_failed` / `preview_javascript_execution_failed` [STATE]
```

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `Covered`

## Use Case: UC-012 Codex preview payload parsing remains coherent

### Spine Context

- Spine ID(s): `DS-010`
- Spine Scope: `Bounded Local`
- Governing Owner: `CodexToolPayloadParser`

### Goal

Keep preview tool argument/result parsing in one subject owner so preview payload growth does not re-bloat the generic Codex item parser and canonical tool identity does not silently fall back to `run_bash`.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-server-ts/src/agent-execution/backends/codex/events/codex-item-event-payload-parser.ts:parse(item) [STATE]
├── codex-item-event-payload-parser.ts:classifyItem(item) [STATE]
├── tool payload path -> autobyteus-server-ts/src/agent-execution/backends/codex/events/codex-tool-payload-parser.ts:parseToolPayload(item) [STATE]
├── reasoning path -> autobyteus-server-ts/src/agent-execution/backends/codex/events/codex-reasoning-payload-parser.ts:parseReasoningPayload(item) [STATE]
└── codex-item-event-payload-parser.ts:returnParsedPayload(...) [STATE]
```

### Branching / Fallback Paths

```text
[ERROR] if preview tool result content is malformed JSON text
codex-tool-payload-parser.ts:parseToolPayload(item)
└── return a canonical parse failure for the converter layer to map [STATE]
```

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `Covered`

## Use Case: UC-013 preview shell lease remains coherent

### Spine Context

- Spine ID(s): `DS-011`
- Spine Scope: `Bounded Local`
- Governing Owner: `PreviewShellController`

### Goal

Keep session lifecycle application-global while making shell projection an explicit, non-stealable lease so one shell cannot silently pull another shell's active preview away.

### Primary Runtime Call Stack

```text
[ENTRY] preview-shell-controller.ts:focusSession(shellId, previewSessionId) / handleHostLost(shellId) / onSessionClosed(previewSessionId) [ASYNC][STATE]
├── preview-shell-controller.ts:getShellState(shellId) [STATE]
├── preview-shell-controller.ts:getLeaseState(previewSessionId) [STATE]
├── preview-shell-controller.ts:claimSessionLease(shellId, previewSessionId) / releaseSessionLease(shellId, previewSessionId) [STATE]
├── preview-shell-controller.ts:setActiveSession(shellId, previewSessionId | null) [STATE]
├── preview-shell-controller.ts:attachActiveSessionView(shellId) / detachActiveSessionView(shellId) [ASYNC][STATE]
└── preview-shell-controller.ts:publishSnapshot(shellId) [STATE]
```

### Branching / Fallback Paths

```text
[FALLBACK] if the requested session is unclaimed
preview-shell-controller.ts:claimSessionLease(shellId, previewSessionId)
└── claim the lease, attach the active view, and publish the updated snapshot [STATE]
```

```text
[ERROR] if another shell already owns the session lease
preview-shell-controller.ts:claimSessionLease(shellId, previewSessionId)
└── reject the claim, leave the current owner unchanged, and surface a bounded ownership error path rather than silently transferring the session [STATE]
```

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `Covered`
