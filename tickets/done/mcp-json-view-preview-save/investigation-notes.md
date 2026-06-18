# Investigation Notes: MCP JSON View Preview/Save Source-of-Truth UX

## Status

Stage 1 Investigation complete draft. Last updated: 2026-06-18 07:28:23 CEST.

## Investigation Goals / Questions

1. Explain why **Preview Tools** in JSON View reports missing server ID after the user pastes valid `mcpServers` JSON.
2. Identify the current input/state ownership model for Form View vs JSON View.
3. Verify how preview/save requests are sent to the backend and whether disk persistence format must change.
4. Locate current test/doc coverage and likely canonical placement for the fix.
5. Confirm workflow scope classification.

## Scope Triage

- Classification: `Small`.
- Rationale:
  - Expected durable source changes are localized to one frontend component, `autobyteus-web/components/tools/McpServerFormModal.vue`, plus a new colocated component test file under `autobyteus-web/components/tools/__tests__/` or equivalent existing test convention.
  - No backend GraphQL schema or persistence contract change is needed based on current backend shape.
  - Behavior crosses a frontend component boundary into Pinia store actions but does not require new service/API boundaries.
  - Existing docs mention the high-level workflow and may need a small update after implementation.
- Workflow depth: Small path (`implementation.md` solution sketch -> future-state call stacks -> Stage 5 review -> Stage 6 implementation).

## Sources Consulted

### Local source files

- `autobyteus-web/components/tools/McpServerFormModal.vue`
  - Template lines 115-130: JSON View textarea and **Apply JSON to Form** action.
  - Template lines 148-164: Footer actions **Preview Tools** and **Save Configuration** remain visible below both tabs.
  - Script lines 207-219: `form` and `jsonInput` are separate reactive state objects.
  - Script lines 233-270: switching to JSON tab calls `updateJsonFromForm()`, which serializes form state into `jsonInput` using placeholder `new-server` when `form.serverId` is empty.
  - Script lines 273-317: `syncFormFromJson()` parses `jsonInput` and copies the first `mcpServers` entry into `form`.
  - Script lines 319-324: `applyJsonToForm()` calls `syncFormFromJson()` and switches to Form View.
  - Script lines 399-420: `buildInput()` builds GraphQL input from `form`, not from `jsonInput`.
  - Script lines 422-434: `runPreview()` checks `form.serverId` and calls `store.previewMcpServer(buildInput())`; it does not parse `jsonInput` when JSON View is active.
  - Script lines 436-440: `save()` already calls `syncFormFromJson()` when active tab is JSON.
- `autobyteus-web/stores/toolManagementStore.ts`
  - Lines 195-229: `previewMcpServer(input)` sends GraphQL query `PREVIEW_MCP_SERVER_TOOLS` with the already-built `McpServerInput` payload and stores preview results/errors.
  - Lines 231-257: `configureMcpServer(input)` sends mutation `CONFIGURE_MCP_SERVER` and refreshes the server list.
- `autobyteus-web/graphql/queries/mcpServerQueries.ts`
  - Lines 30-38: preview query accepts `$input: McpServerInput!`.
- `autobyteus-web/graphql/mutations/mcpServerMutations.ts`
  - Lines 3-29: save mutation accepts `$input: McpServerInput!`.
- `autobyteus-server-ts/src/api/graphql/types/mcp-server-config.ts`
  - `McpServerInput` requires `serverId` and `transportType`, with `stdioConfig` or `streamableHttpConfig` depending on transport.
- `autobyteus-web/generated/graphql.ts`
  - `McpTransportTypeEnum` generated values are `STDIO` and `STREAMABLE_HTTP`, matching current form model.
- `autobyteus-server-ts/src/mcp-server-management/providers/file-provider.ts`
  - Lines 37-64: `toStandardEntry()` persists `BaseMcpConfig` to standard-ish `mcpServers` map entries without requiring `transport_type` for saved file shape.
  - Lines 78-96: `parseEntry()` infers transport as `streamable_http` when entry has `url`, otherwise `stdio`, then calls core parser with a constructed `transport_type`.
  - Lines 132-160: create/update write the normalized standard entry to `mcps.json`.
- `autobyteus-server-ts/src/mcp-server-management/services/mcp-config-service.ts`
  - Lines 138-165: bulk import parses top-level `mcpServers`, then currently delegates to core parser with server key and config details.
  - Lines 168-224: apply-and-register bulk path has same parse shape and later register behavior.
- `autobyteus-ts/src/tools/mcp/config-service.ts`
  - Lines 140-156: core parser supports camelCase `transportType`/`toolNamePrefix`, but requires `transport_type` after normalization. This means frontend JSON parsing/inference must produce GraphQL `transportType`; backend bulk/file provider has separate inference paths in some contexts.
- `autobyteus-web/components/tools/McpBulkImportView.vue`
  - Lines 57-68: placeholder uses standard `command` entry and HTTP entry with `transportType`, showing JSON conventions are already exposed to users.
  - Lines 86-120: bulk import sends raw JSON string to store and backend.
- `autobyteus-web/components/tools/ToolsManagementWorkspace.vue`
  - Lines 77-83: `McpServerFormModal` owns add/edit form view and emits save/toast events to parent.
  - Lines 256-262: save-complete navigates to tools view when sync occurs, otherwise server list.
- `autobyteus-web/docs/tools_and_mcp.md`
  - Describes `McpServerFormModal.vue` features and states users can fill form or paste JSON, then click Preview and Save.
- `autobyteus-server-ts/docs/examples/codex_mcp_import.json` and `autobyteus-server-ts/docs/examples/alexa_mcp_import.json`
  - Current examples include `mcpServers` map and explicit snake_case `transport_type`/`tool_name_prefix`.

### Commands run

- `git status --short --branch`, `git remote -v`, `git symbolic-ref --short refs/remotes/origin/HEAD`, `git worktree list --porcelain` to bootstrap ticket context.
- `git fetch origin --prune` before creating worktree.
- `git worktree add -b codex/mcp-json-view-preview-save /Users/normy/autobyteus_org/autobyteus-worktrees/mcp-json-view-preview-save origin/personal`.
- `nl -ba autobyteus-web/components/tools/McpServerFormModal.vue | sed -n '1,480p'` to inspect template/script line-level behavior.
- `nl -ba autobyteus-web/stores/toolManagementStore.ts | sed -n '180,260p'` and GraphQL query/mutation inspections to verify preview/save contracts.
- `grep -R "McpServerFormModal\|previewMcpServer\|Apply JSON to Form\|mcpServers" ...` to locate related files and test coverage.
- `find autobyteus-web/components -path '*__tests__*' -type f` to inspect component test convention; no existing `components/tools/__tests__` tests were found.
- `nl -ba autobyteus-server-ts/src/mcp-server-management/providers/file-provider.ts` and related backend service/core parser files to verify persistence format and parsing constraints.
- `sed -n '1,260p' autobyteus-web/docs/tools_and_mcp.md` to inspect existing long-lived docs impact.

## Current Behavior Findings

### F-001: JSON View is currently a converter/import helper over form state

The component has two states:

- `form`: authoritative state for `buildInput()` and Form View controls.
- `jsonInput`: textarea contents in JSON View.

`syncFormFromJson()` copies `jsonInput` into `form`, but it is only called from **Apply JSON to Form** and from `save()` when active tab is JSON. This means JSON View is not currently a first-class action source for preview.

### F-002: Preview reads hidden form state even while JSON View is visible

`runPreview()` only checks `form.serverId` and then calls `store.previewMcpServer(buildInput())`. Because a newly opened modal starts with empty `form.serverId`, a user can paste valid JSON containing a server key like `VideoAudioServer`, but preview still reports `Server ID is required to run a preview.` until the user clicks **Apply JSON to Form**.

This exactly matches the reported UX problem: visible JSON contains the ID, hidden form state does not.

### F-003: Save already partly follows the desired active-view model

`save()` checks `activeTab.value === 'json'` and calls `syncFormFromJson()` before building payload. This is why clicking **Apply JSON to Form** is not conceptually required for Save, but Save still mutates form as an implementation detail. Preview should align with this active-view behavior.

### F-004: Current JSON parsing has standard-shape gaps

`syncFormFromJson()` sets transport via `(config.transportType || 'stdio').toUpperCase()`.

Implications:

- Standard STDIO entries with only `command` default to `STDIO` and work.
- Standard HTTP entries with only `url` but no `transportType` incorrectly default to `STDIO`; then `command` becomes empty.
- Snake_case `transport_type: "streamable_http"` becomes ignored because only camelCase `transportType` is read.
- Snake_case `tool_name_prefix` is ignored because only camelCase `toolNamePrefix` is read.

Given the product wants industry-standard `mcpServers` JSON as an input mode, JSON parsing should accept/infer:

- `command` => `STDIO`
- `url` => `STREAMABLE_HTTP`
- `transportType` or `transport_type` when explicitly present
- `toolNamePrefix` or `tool_name_prefix`

### F-005: Disk persistence format does not need to change

Backend persistence provider writes `mcps.json` as top-level `mcpServers` entries with command/url-based standard entries. The GraphQL mutation can continue receiving `McpServerInput` while frontend JSON View converts visible JSON into that existing input contract. No backend storage migration is needed.

### F-006: Component test coverage for tools modal appears absent

There are many component tests under `autobyteus-web/components/**/__tests__`, but no existing tests under `autobyteus-web/components/tools/__tests__`. A new focused test file for `McpServerFormModal.vue` is the likely durable validation asset.

## Entry Points / Boundaries / Owners

- User entrypoint: `McpServerFormModal.vue` footer actions.
- UI state owner: `McpServerFormModal.vue` owns tab state, form state, JSON textarea state, conversion/validation, and emits UX toasts.
- Store boundary: `toolManagementStore.ts` owns GraphQL transport, loading/error/preview result state, and server/tool list refresh.
- Backend boundary: GraphQL `McpServerInput` remains authoritative preview/save API contract.
- Persistence owner: backend `FileMcpServerConfigProvider` owns `mcps.json` disk normalization and storage.

## File Placement Observations

- The primary behavior belongs in `autobyteus-web/components/tools/McpServerFormModal.vue`; current path matches UI ownership.
- A focused test belongs under the component test convention, likely `autobyteus-web/components/tools/__tests__/McpServerFormModal.spec.ts`.
- No new shared helper file is clearly needed yet because parsing is used only by one component. If implementation starts producing repeated or bulky parsing logic, reassess whether a local owned helper under `components/tools/` is justified.

## Runtime / Reproduction Understanding

No browser runtime was needed to reproduce because source path is deterministic:

1. New modal: `form.serverId = ''` from `createFreshForm()`.
2. User opens JSON tab: `updateJsonFromForm()` fills textarea from empty form using `new-server`; user then pastes their JSON.
3. User clicks Preview: `runPreview()` checks hidden `form.serverId`, not `jsonInput`.
4. Hidden `form.serverId` remains empty because `syncFormFromJson()` did not run.
5. Component patches preview error: `Server ID is required to run a preview.`
6. User clicks **Apply JSON to Form**: `syncFormFromJson()` copies `mcpServers` key into `form.serverId`.
7. Preview now uses populated form and succeeds if server itself is reachable.

## Constraints And Design Implications

- The visible editor should be the action source: Form View actions use form; JSON View actions parse JSON at action time.
- Avoid dual behavioral paths that can diverge. Prefer one local conversion function from JSON View contents to GraphQL `McpServerInput`, then reuse it for Preview and Save.
- Keep **Apply JSON to Form** optional. It can continue to call the same parser and then switch to Form View.
- Do not change backend storage format or GraphQL API unless implementation finds frontend conversion insufficient.
- Handle invalid JSON/shape before store calls so stale form state is never used as fallback in JSON View.
- Multi-server JSON in single-server modal should be explicitly rejected or guided to bulk import; silently choosing the first entry would be surprising in a single-server edit surface. This refines the draft assumption: for this ticket, JSON View should require exactly one server entry.

## Open Unknowns / Decisions For Requirements

- Edit mode server ID behavior: current code preserves `props.server!.serverId` even if pasted JSON key differs. This aligns with disabled server ID in Form View. Requirement should preserve this unless user explicitly asks to support renaming via JSON View.
- Button rename for **Apply JSON to Form** is optional. The core requirement is behavior, not copy. A small label change to **Apply JSON to Form** may be left unchanged to minimize localization churn unless UX copy is in scope.
- HTTP token vs headers: Form model supports `token` but not JSON `headers` UI editing for HTTP. GraphQL input supports headers. JSON View conversion should pass `headers` for HTTP when present; token should remain supported.

## Implications For Next Stages

- Requirements should move to `Design-ready` with clarified exact-one-server JSON View behavior and edit-mode ID preservation.
- Small-scope design should introduce a local parser/builder function inside `McpServerFormModal.vue`, e.g. `buildInputFromJson()` / `getActiveInputForAction()`, reused by preview/save/apply.
- Stage 7 durable validation should include unit/component tests proving:
  - JSON View preview calls store with JSON-derived STDIO payload without applying to form first.
  - JSON View save calls configure with JSON-derived payload without applying to form first.
  - JSON View HTTP payload infers `STREAMABLE_HTTP` from `url` and preserves `headers`.
  - invalid JSON shape does not call store action and emits/shows error.
  - Form View preview/save continue to use form state.
