# Investigation Notes — Preview Session Multi-Runtime Design

- **Ticket**: `preview-session-multi-runtime-design`
- **Date**: `2026-04-02`
- **Stage**: `1 Investigation + Triage`
- **Scope Classification**: `Large`
- **Status**: `Complete For v12 Design Re-Entry`

---

## Investigation Goal

Stage 8 is reopened again under the stricter product-quality bar. The current user-visible preview behavior is accepted, but the implementation still fails the two categories the user marked as decisive:

- ownership clarity and boundary encapsulation,
- no backward-compatibility / no legacy retention.

This re-entry is therefore a structural redesign pass, not a product-scope change. The next design basis must keep the working preview-tab behavior while fixing the remaining hidden ownership and contract drift.

The current accepted product behavior remains:

- right-side `Preview` tab,
- multiple internal preview sessions,
- eight browser-style preview tools,
- working packaged-app validation for the main preview path.

---

## Stage 8 Re-Entry Findings

### 1. Preview sessions are still effectively app-global instead of explicitly shell-owned

The remaining ownership problem is no longer in the renderer streaming boundary. It is in the shell-local preview ownership model:

- `autobyteus-web/electron/preview/preview-shell-controller.ts`
- `autobyteus-web/electron/preview/preview-session-navigation.ts`

Observed behavior:

- `focusSession()` removes a session from every registered shell before attaching it to the current shell,
- `findReusableSession()` still scans the app-global preview session registry by URL,
- session records and open requests do not carry shell ownership or explicit transfer semantics.

That means preview sessions are currently transferable by side effect rather than by an owned policy. One shell can silently steal another shell’s preview session. This is the clearest remaining ownership / boundary failure in the feature.

### 2. The stable preview contract still keeps hidden compatibility behavior

Alias keys were removed in the `v10` refactor, but the native contract is still not fully strict:

- `autobyteus-server-ts/src/agent-tools/preview/preview-tool-input-primitives.ts`

The parser still accepts:

- string booleans such as `"true"` / `"false"`,
- numeric strings such as `"200"`.

That is now a no-backward-compatibility failure, because the declared Codex and Claude schemas already require actual booleans and integers. The native path should not quietly widen the stable contract beyond those declared types.

### 3. The touched Codex runtime parser still owns an unsafe metadata fallback

The stricter review also surfaced a concrete runtime regression in a touched parser owner:

- `autobyteus-server-ts/src/agent-execution/backends/codex/events/codex-item-event-payload-parser.ts`

The live Codex backend suite now reproduces that:

- the preview scenario passes,
- but an existing `edit_file` scenario regresses because metadata reports `tool_name = run_bash`.

That means tool identity fallback policy is still owned too implicitly inside the generic segment metadata parser. Even though this is not the main product behavior the user cares about, it is additional evidence that ownership inside the runtime parser boundary is still too blurred.

### 4. Validation evidence is thinner than the public eight-tool surface implies

This is not the main re-entry driver for this round, but it remains a supporting signal:

- `tickets/in-progress/preview-session-multi-runtime-design/api-e2e-testing.md`

Only `open_preview` is currently exercised through the real Codex and Claude runtime adapter paths. The rest of the eight-tool public surface is still proven mainly by unit or Electron-local tests. That would be less concerning if the touched runtime parser boundary were fully green, but it currently is not.

---

## Investigation Outcome For The Next Design Pass

The investigation supports these redesign targets for Stage 3:

- keep preview-session lifecycle application-global, but encode shell projection through one explicit non-stealable lease owner instead of implicit transfer by side effect,
- carry lease claimability in session records and reuse decisions,
- remove stringly boolean and integer coercion from the stable preview contract so the native path matches the declared Codex and Claude schemas exactly,
- tighten Codex tool-metadata ownership so canonical tool identity is resolved from the right owner instead of falling back generically to `run_bash`,
- then strengthen live runtime validation after the structural redesign is complete.

---

## Current Architecture Findings

### 1. The backend already dispatches three runtime kinds through one manager

The server-side execution layer already resolves three distinct runtime kinds from one owner:

- `autobyteus`
- `claude_agent_sdk`
- `codex_app_server`

`AgentRunManager` selects a backend factory based on `RuntimeKind`, which means any preview design that only fits one runtime path would be structurally incomplete for the current product shape.

### 2. The `autobyteus` runtime uses the shared local tool registry

The native `autobyteus` runtime builds tool instances from the shared `defaultToolRegistry`. Agent definitions list tool names, and the backend factory instantiates them directly from the registry before the run starts.

Implication:

- A preview capability for `autobyteus` can be exposed as a normal local tool registration if the core capability is reachable from the backend process.
- This path already fits a reusable internal service plus tool-wrapper model.

### 3. The Codex runtime has an explicit dynamic-tool injection path

The `codex_app_server` runtime has a dedicated dynamic-tool abstraction:

- `CodexDynamicToolRegistration`
- `buildCodexDynamicToolSpecs(...)`
- `buildCodexDynamicToolHandlerMap(...)`

The default Codex bootstrap strategy currently provides no dynamic tool registrations, but the team bootstrap path already injects a runtime-specific dynamic tool (`send_message_to`) through the same mechanism.

Implication:

- A preview tool surface can be added to Codex without changing the fundamental runtime model.
- The right design is to reuse the existing dynamic-tool registration path, not to special-case preview logic directly inside Codex thread handling.

### 4. The Claude runtime already has an SDK-local MCP bridge

The `claude_agent_sdk` runtime exposes tool surfaces differently:

- `ClaudeSdkClient.createToolDefinition(...)`
- `ClaudeSdkClient.createMcpServer(...)`
- `ClaudeSession.buildTeamMcpServers(...)`

Current Claude team tooling is already assembled as an MCP server configuration passed into the SDK query turn.

Implication:

- Preview can fit Claude cleanly as an SDK-local MCP tool surface.
- MCP is already a native adaptation mechanism for Claude, even if MCP is not the primary internal owner of preview sessions.

### 5. Shared MCP infrastructure already exists outside the Claude-specific path

The codebase already has a generic MCP tool stack:

- server config/discovery in `autobyteus-server-ts`
- shared tool registration and proxying in `autobyteus-ts`
- frontend configuration/management UI in `autobyteus-web`

Implication:

- MCP is a viable adapter layer for preview tools.
- MCP should not be the authoritative owner of preview sessions if Electron shell state and UI surfaces are involved.
- A cleaner design is an internal preview core with MCP as one optional exposure layer.

### 6. Electron main already owns application window lifecycle and typed IPC

The Electron shell already concentrates native responsibilities in `autobyteus-web/electron/main.ts` and exposes them via `preload.ts`:

- node-bound window open/focus/list
- server status queries and push updates
- node registry snapshot and update listeners
- app update state and other shell services

Implication:

- Preview session lifecycle belongs closer to Electron main than to the renderer.
- A preview owner in renderer state would fight Electron's actual ownership of windows/webContents lifecycle.

### 7. Existing node-bound windows are not suitable as-is for browser preview

Current node-bound windows:

- always load the app shell start URL,
- block navigation via `will-navigate`,
- block popup creation via `setWindowOpenHandler`,
- are keyed by `nodeId`.

Implication:

- Preview cannot just reuse the existing node-window helper unchanged.
- A separate preview session manager is required even if it reuses some window-management patterns.

### 8. The right-side tabs are static today

The right panel currently uses a fixed tab union and fixed tab list:

- `files`
- `teamMembers`
- `terminal`
- `vnc`
- `progress`
- `artifacts`

Implication:

- Dynamic creation of many outer right-side tabs would push against the current shell design.
- If preview is rendered inside the right panel later, the cleaner approach is one fixed `Preview` tab containing internal sessions, not one outer tab per preview.

### 9. The agent tool lifecycle already carries arbitrary tool results

The streaming protocol already supports:

- tool execution started
- tool execution succeeded with arbitrary `result`
- tool execution failed
- tool logs

The renderer activity store already persists arbitrary result payloads and logs per invocation.

Implication:

- `open_preview` can return structured session metadata through the existing tool lifecycle.
- The renderer does not need a brand-new agent-stream event family just to learn the preview session ID.

### 10. No preview-session subsystem exists yet

Searches across `autobyteus-web`, `autobyteus-server-ts`, and `autobyteus-ts` found no existing implementation for:

- `open_preview`
- `preview_session_id`
- preview session tracking
- screenshot/log capture over a preview session

Implication:

- This is a net-new capability area.
- Clean ownership boundaries matter up front because there is no existing preview structure to preserve.

---

## Cross-Cutting Constraints Confirmed By Investigation

### C-001. Three runtime kinds must be covered by the design

The preview capability cannot be designed as a Codex-only or Claude-only convenience path if it is intended to become a product feature.

### C-002. Session ownership and tool exposure are different concerns

The same preview core may need to be exposed through:

- shared local tools for `autobyteus`,
- dynamic tools for `codex_app_server`,
- SDK-local MCP for `claude_agent_sdk`,
- potentially a generic MCP server later.

That argues for a reusable internal preview capability with thin runtime-specific adapters.

### C-003. Electron main is the most defensible lifecycle owner

Because preview surfaces are native Electron entities, session lifecycle should be owned where windows/webContents are actually created, focused, observed, and destroyed.

### C-004. Renderer integration should stay projection-oriented

The renderer should project preview-session state and control requests, not own the real session truth. This keeps the frontend event model small and avoids runtime-specific UI logic.

### C-005. MCP is appropriate as an adapter, not as the session source of truth

MCP is useful for runtime/tool interoperability, but preview session state must stay aligned with Electron lifecycle. If an MCP server owned session state separately, shell/UI drift would be likely.

---

## Scope Triage

### Classification: `Large`

This work is classified as `Large` because a production implementation would touch multiple subsystems:

- Electron main-process session ownership
- Electron preload contract
- renderer session projection/store and optional shell surface
- `autobyteus` local tool registration
- Codex dynamic-tool registration/bootstrap
- Claude SDK-local MCP assembly
- optional shared MCP adapter design
- tool lifecycle/result handling expectations
- validation strategy across multiple runtime kinds

Even though the current ticket stops at design, the implementation surface is cross-cutting enough that the design must explicitly control ownership and API boundaries.

---

## Design Pressure / Risks Identified

### RISK-001. Letting each runtime invent its own preview tool path will duplicate behavior

If each runtime independently defines open/focus/screenshot/close semantics, the preview capability will drift and become hard to support.

### RISK-002. Letting renderer own preview state would create lifecycle mismatch

The renderer can disappear or rehydrate, but Electron main owns the actual native surfaces. Ownership split in the wrong direction would create stale sessions and messy reconciliation logic.

### RISK-003. Dynamic outer tabs would make the shell messy

The current right-side tab model is fixed. Forcing it into a one-tab-per-preview pattern would create avoidable UI and state complexity.

### RISK-004. Reusing node-bound windows directly would overconstrain preview navigation

Current node windows intentionally block navigation and popups for app-shell safety. Preview must be treated as a distinct surface type.

### RISK-005. Using MCP as the only internal abstraction would hide important shell ownership

MCP helps tool transport, but the preview owner still needs direct knowledge of Electron lifecycle, screenshots, logs, and cleanup behavior.

---

## Preliminary Direction Entering Design

The investigation supports this direction for Stage 3 design:

- create one reusable preview-session core/capability area,
- make Electron main the authoritative preview session owner,
- expose that core through runtime-specific adapters rather than runtime-specific implementations,
- use an app-owned opaque `preview_session_id` as the stable external contract,
- keep renderer integration minimal by reusing tool-result payloads plus a small preview-session snapshot/update channel,
- recommend a bounded v1 tool surface rather than full browser automation.

---

## Evidence Log

### Key files inspected

- `autobyteus-server-ts/src/runtime-management/runtime-kind-enum.ts`
- `autobyteus-server-ts/src/agent-execution/services/agent-run-manager.ts`
- `autobyteus-server-ts/src/agent-execution/backends/autobyteus/autobyteus-agent-run-backend-factory.ts`
- `autobyteus-ts/src/tools/register-tools.ts`
- `autobyteus-ts/src/tools/registry/tool-registry.ts`
- `autobyteus-server-ts/src/agent-execution/backends/codex/codex-dynamic-tool.ts`
- `autobyteus-server-ts/src/agent-execution/backends/codex/backend/codex-thread-bootstrapper.ts`
- `autobyteus-server-ts/src/agent-execution/backends/codex/backend/codex-thread-bootstrap-strategy.ts`
- `autobyteus-server-ts/src/agent-team-execution/backends/codex/codex-team-thread-bootstrap-strategy.ts`
- `autobyteus-server-ts/src/agent-team-execution/backends/codex/codex-send-message-dynamic-tool-registration.ts`
- `autobyteus-server-ts/src/runtime-management/claude/client/claude-sdk-client.ts`
- `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session.ts`
- `autobyteus-server-ts/src/agent-execution/backends/claude/backend/claude-session-bootstrap-strategy.ts`
- `autobyteus-ts/src/tools/mcp/tool.ts`
- `autobyteus-ts/src/tools/mcp/tool-registrar.ts`
- `autobyteus-ts/src/tools/mcp/server/proxy.ts`
- `autobyteus-web/docs/tools_and_mcp.md`
- `autobyteus-web/electron/main.ts`
- `autobyteus-web/electron/preload.ts`
- `autobyteus-web/composables/useRightSideTabs.ts`
- `autobyteus-web/components/layout/RightSideTabs.vue`
- `autobyteus-web/services/agentStreaming/protocol/messageTypes.ts`
- `autobyteus-web/stores/agentActivityStore.ts`

### Representative commands run

- `git fetch --prune origin`
- `git remote show origin`
- `git worktree add -b codex/preview-session-multi-runtime-design /Users/normy/autobyteus_org/autobyteus-worktrees/preview-session-multi-runtime-design origin/personal`
- `rg -n "enum RuntimeKind|AUTOBYTEUS|CLAUDE_AGENT_SDK|CODEX_APP_SERVER" ...`
- `rg -n "dynamicToolRegistrations|CodexDynamicToolRegistration|open_preview" ...`
- `rg -n "createMcpServer|buildTeamMcpServers|buildClaudeTeamMcpServers" ...`
- `rg -n "ipcMain.handle|contextBridge.exposeInMainWorld|BrowserWindow|preview" ...`
- `rg -n "preview_session|open_preview|capture_preview|close_preview" autobyteus-web autobyteus-server-ts autobyteus-ts`

---

## Stage 8 Re-Entry Investigation Addendum

Stage 8 independent code review failed with `Design Impact`. The current implementation is functionally working, but the code no longer satisfies the workflow’s shared design principles and hard Stage 8 structural rules.

### Re-entry findings that must reshape the next design pass

#### RI-001. The bounded local preview-session spine is obscured inside one oversized Electron owner

`autobyteus-web/electron/preview/preview-session-manager.ts` is now `613` effective non-empty lines and mixes:

- session lifecycle and reuse,
- ready-state waiting,
- page read and cleaning,
- DOM snapshot execution,
- JavaScript execution,
- full-page screenshot resizing,
- view accessors and viewport mutation,
- tombstone retention and close cleanup.

This makes the bounded local preview-session spine hard to trace and violates the Stage 8 hard-limit rule.

#### RI-002. The preview tool boundary does not have a tight owned contract file

`autobyteus-server-ts/src/agent-tools/preview/preview-tool-contract.ts` is now `535` effective non-empty lines and owns:

- canonical tool names and DTOs,
- environment constants,
- coercion helpers,
- input parsers,
- semantic assertions,
- native `ParameterSchema` builders,
- preview error serialization.

That boundary is no longer “contract only”; it is a mixed concern blob and must be split before the next implementation pass.

#### RI-003. Runtime adapter surfaces still duplicate the preview tool manifest

The eight-tool preview surface is repeated in:

- `autobyteus-server-ts/src/agent-execution/backends/codex/preview/build-preview-dynamic-tool-registrations.ts`
- `autobyteus-server-ts/src/agent-execution/backends/claude/preview/build-claude-preview-tool-definitions.ts`

Both files restate the tool names, descriptions, parameter semantics, parse calls, and service dispatch. The next design pass must give that repeated structure one owner.

#### RI-004. The stable preview tool contract still preserves compatibility aliases

The current preview input parsing still accepts alternate spellings such as:

- `window_title`
- camelCase `waitUntil`
- camelCase `previewSessionId`
- camelCase `cleaningMode`
- camelCase `fullPage`
- camelCase `includeNonInteractive`
- camelCase `includeBoundingBoxes`
- camelCase `maxElements`

That violates the workflow’s no-backward-compatibility rule for the in-scope stable preview surface.

#### RI-005. Preview-related result parsing was added into an already-over-limit Codex payload parser

`autobyteus-server-ts/src/agent-execution/backends/codex/events/codex-item-event-payload-parser.ts` is now `514` effective non-empty lines and continues to accumulate unrelated runtime parsing responsibilities. The next design pass must decide how preview/tool-result parsing should be split out or otherwise stop growing this boundary.

### Investigation direction reopened by Stage 8

The next investigation/design chain must answer:

- what the tight owned split is for the Electron preview-session owner,
- what the tight owned split is for the preview tool contract boundary,
- which single owned structure should define the preview tool manifest across runtime adapters,
- where canonical preview request normalization belongs once compatibility aliases are removed,
- whether the Codex payload parser should split by subject or move preview/tool-result parsing into a tighter owned parser boundary.

### Current-state split targets identified during re-entry investigation

#### ST-001. Preview tool boundary split target

The next design pass should stop treating `preview-tool-contract.ts` as the universal file.
The current state supports a tighter split:

- keep one canonical contract file for:
  - stable tool names,
  - canonical request/result DTOs,
  - canonical error vocabulary,
- move request coercion / parsing into a separate input-normalization owner,
- move semantic validation into a separate validation owner or keep it only where it still fits tightly,
- move native `ParameterSchema` builders out of the contract file,
- introduce one owned preview tool manifest/catalog file that defines:
  - canonical tool descriptions,
  - canonical tool ordering,
  - canonical per-tool parameter intent,
  - canonical dispatch target / parser pairing used by runtime adapters.

The key rule is that the runtime adapters should no longer re-state the preview tool surface independently.

#### ST-002. Electron preview owner split target

The next design pass should preserve `PreviewSessionManager` as the authoritative session owner, but move non-lifecycle support concerns around it instead of leaving everything in one file.

Current-state facts suggest this split:

- one session contract/types file for request/result/error/record/summary shapes,
- one session-lifecycle owner file for:
  - open / reuse / navigate / close,
  - session registry invariants,
  - tombstones,
  - session identity generation,
  - view lookup / summary lookup,
- one navigation / ready-state concern for:
  - URL normalization,
  - ready-state wait,
  - page-title settlement,
- one page-operations concern for:
  - read page,
  - DOM snapshot,
  - JavaScript execution,
  - screenshot capture / full-page resize handling.

This keeps the bounded local preview-session spine visible while still allowing page-level behavior to remain under the preview subsystem rather than leaking outward.

#### ST-003. Runtime tool-surface reuse target

The repeated eight-tool surface in Codex and Claude should be owned once under `agent-tools/preview`, then projected outward.

The next design pass should evaluate one manifest/catalog shape that can drive:

- native preview tool registration,
- Codex dynamic tool registrations,
- Claude MCP tool definitions.

The adapter files should stay translation-only:

- Codex owns JSON-schema projection and dynamic-tool wrapper behavior.
- Claude owns Zod/MCP projection and MCP wrapper behavior.
- Neither runtime adapter should own the preview tool surface definition itself.

#### ST-004. Codex parser split target

The next design pass should treat `codex-item-event-payload-parser.ts` as an overgrown mixed parser and split it by subject.

The current-state candidate split is:

- core segment / invocation identity parsing,
- tool-invocation argument + tool-result parsing,
- web-search-specific parsing,
- reasoning/text collection helpers.

The preview work specifically increased the pressure on the tool-result part, so the redesign should make that a distinct owned parser concern instead of adding more result decoding into the top-level item parser.

### Investigation conclusion for re-entry

Stage 1 is now specific enough to reopen design:

- the re-entry is not a requirement problem,
- the re-entry is not mainly a validation problem,
- the re-entry is a structural ownership / bounded-local-spine problem,
- the redesign should focus on:
  - splitting oversized owners,
  - introducing one owned preview tool manifest,
  - removing compatibility aliases from the stable preview contract,
  - splitting the Codex payload parser by subject before more preview behavior lands there.
