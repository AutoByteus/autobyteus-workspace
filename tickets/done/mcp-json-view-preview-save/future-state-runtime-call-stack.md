# Future-State Runtime Call Stacks: MCP JSON View Preview/Save Source-of-Truth UX

## Design Basis

- Scope Classification: `Small`
- Call Stack Version: `v1`
- Requirements: `tickets/in-progress/mcp-json-view-preview-save/requirements.md` (`Design-ready`)
- Source Artifact: `tickets/in-progress/mcp-json-view-preview-save/implementation.md` solution sketch (`v1`)
- Last Updated: 2026-06-18 07:35:25 CEST

## Use Case Index

| use_case_id | Spine ID(s) | Spine Scope | Governing Owner | Source Type | Requirement ID(s) | Design-Risk Objective | Use Case Name | Coverage Target |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| UC-001 | DS-001, DS-002 | Primary End-to-End + Bounded Local | `McpServerFormModal.vue` | Requirement | R-001, R-002, R-005, R-006, R-007, R-008 | N/A | Preview from JSON View | Primary/Error |
| UC-002 | DS-001, DS-002 | Primary End-to-End + Bounded Local | `McpServerFormModal.vue` | Requirement | R-001, R-003, R-004, R-005, R-006, R-007, R-008 | N/A | Save from JSON View | Primary/Error |
| UC-003 | DS-001 | Primary End-to-End | `McpServerFormModal.vue` | Requirement | R-001, R-002, R-003 | N/A | Preview/save from Form View | Primary/Error |
| UC-004 | DS-002 | Bounded Local | `McpServerFormModal.vue` | Requirement | R-007 | N/A | JSON View recoverable validation error | Error |
| UC-005 | DS-002, DS-003 | Bounded Local + Primary End-to-End | `McpServerFormModal.vue` | Requirement | R-005, R-006 | N/A | Optional JSON-to-form conversion | Primary/Error |

## Transition Notes

- No migration or temporary compatibility behavior is planned.
- Current stale-form fallback in JSON View is removed for in-scope actions.
- Backend GraphQL and `mcps.json` persistence remain unchanged.

## Use Case: UC-001 Preview from JSON View

### Spine Context

- Spine ID(s): DS-001, DS-002
- Governing Owner: `McpServerFormModal.vue`
- Why This Matters: This is the failing user journey: paste JSON, click visible Preview, preview should use visible JSON.

### Goal

Build `McpServerInput` from current `jsonInput` and pass it to `toolManagementStore.previewMcpServer(...)` without requiring **Apply JSON to Form**.

### Preconditions

- `activeTab.value === 'json'`
- `jsonInput.value` contains exactly one `mcpServers` entry.

### Expected Outcome

- Valid JSON yields a normalized `McpServerInput` and preview store action is called.
- Invalid JSON yields a recoverable preview error and store action is not called.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-web/components/tools/McpServerFormModal.vue:runPreview()
├── autobyteus-web/components/tools/McpServerFormModal.vue:buildActiveInput()
│   └── autobyteus-web/components/tools/McpServerFormModal.vue:buildInputFromJson(jsonInput.value)
│       ├── JSON.parse(jsonInput.value)
│       ├── validate top-level mcpServers object
│       ├── validate exactly one server entry
│       ├── normalize serverId: props.server?.serverId ?? mcpServers map key [STATE]
│       ├── normalize transport from transportType/transport_type or infer from url/command [STATE]
│       ├── normalize toolNamePrefix/tool_name_prefix [STATE]
│       └── return McpServerInput [STATE]
└── autobyteus-web/stores/toolManagementStore.ts:previewMcpServer(input) [ASYNC]
    └── autobyteus-web/graphql/queries/mcpServerQueries.ts:PREVIEW_MCP_SERVER_TOOLS [IO]
```

### Error Paths

```text
[ERROR] invalid JSON or unsupported single-server shape
autobyteus-web/components/tools/McpServerFormModal.vue:buildInputFromJson(...)
└── autobyteus-web/components/tools/McpServerFormModal.vue:setPreviewError(message) [STATE]
    # No call to toolManagementStore.previewMcpServer; stale form state is not used.
```

### State And Data Transformations

- JSON string -> parsed object -> single server key/config.
- Server key/config -> GraphQL `McpServerInput`.
- `command` config -> `transportType: "STDIO"`, `stdioConfig`.
- `url` config -> `transportType: "STREAMABLE_HTTP"`, `streamableHttpConfig`.

### Coverage Status

- Primary Path: Covered by planned `SCN-001`, `SCN-004`.
- Error Path: Covered by planned `SCN-005`.

## Use Case: UC-002 Save from JSON View

### Spine Context

- Spine ID(s): DS-001, DS-002
- Governing Owner: `McpServerFormModal.vue`
- Why This Matters: Save should mirror Preview's active-view source-of-truth and persist through existing backend path.

### Goal

Build `McpServerInput` from current `jsonInput`, save through existing store mutation, and keep storage format unchanged.

### Preconditions

- `activeTab.value === 'json'`
- `jsonInput.value` contains exactly one valid server entry.

### Expected Outcome

- `toolManagementStore.configureMcpServer(input)` is called with JSON-derived input.
- Optional sync still calls `discoverAndRegisterMcpServerTools(payload.serverId)` after save.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-web/components/tools/McpServerFormModal.vue:save()
├── autobyteus-web/components/tools/McpServerFormModal.vue:buildActiveInput()
│   └── autobyteus-web/components/tools/McpServerFormModal.vue:buildInputFromJson(jsonInput.value) [STATE]
├── autobyteus-web/stores/toolManagementStore.ts:configureMcpServer(input) [ASYNC]
│   └── autobyteus-web/graphql/mutations/mcpServerMutations.ts:CONFIGURE_MCP_SERVER [IO]
├── autobyteus-web/components/tools/McpServerFormModal.vue:emit('show-toast', success) [STATE]
├── [FALLBACK] if syncOnSave.value === true
│   └── autobyteus-web/stores/toolManagementStore.ts:discoverAndRegisterMcpServerTools(serverId) [ASYNC][IO]
└── autobyteus-web/components/tools/McpServerFormModal.vue:emit('save-complete', { serverId, didSync }) [STATE]
```

### Error Paths

```text
[ERROR] JSON parse/validation fails
autobyteus-web/components/tools/McpServerFormModal.vue:buildInputFromJson(...)
└── autobyteus-web/components/tools/McpServerFormModal.vue:emit('show-toast', error) [STATE]
    # No call to configureMcpServer; stale form state is not used.
```

```text
[ERROR] backend save fails
autobyteus-web/stores/toolManagementStore.ts:configureMcpServer(input)
└── autobyteus-web/components/tools/McpServerFormModal.vue:emit('show-toast', `Failed to save server: ...`) [STATE]
```

### Coverage Status

- Primary Path: Covered by planned `SCN-002`, `SCN-004`, `SCN-006`, `SCN-007`.
- Error Path: Covered by planned `SCN-005`.

## Use Case: UC-003 Preview/save from Form View

### Spine Context

- Spine ID(s): DS-001
- Governing Owner: `McpServerFormModal.vue`

### Goal

Preserve existing Form View behavior.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-web/components/tools/McpServerFormModal.vue:runPreview() or save()
├── autobyteus-web/components/tools/McpServerFormModal.vue:buildActiveInput()
│   └── autobyteus-web/components/tools/McpServerFormModal.vue:buildInputFromForm() [STATE]
└── autobyteus-web/stores/toolManagementStore.ts:previewMcpServer(input) or configureMcpServer(input) [ASYNC][IO]
```

### Error Paths

```text
[ERROR] form serverId missing
autobyteus-web/components/tools/McpServerFormModal.vue:runPreview() or save()
└── existing preview error / toast path [STATE]
```

### Coverage Status

- Primary Path: Covered by planned `SCN-003`.
- Error Path: Existing behavior; targeted regression can cover missing ID if needed.

## Use Case: UC-004 JSON View recoverable validation error

### Spine Context

- Spine ID(s): DS-002
- Governing Owner: `McpServerFormModal.vue`

### Goal

Reject invalid JSON View inputs before side effects.

### Error Runtime Call Stack

```text
[ENTRY] autobyteus-web/components/tools/McpServerFormModal.vue:runPreview() or save()
├── autobyteus-web/components/tools/McpServerFormModal.vue:buildActiveInput()
│   └── autobyteus-web/components/tools/McpServerFormModal.vue:buildInputFromJson(jsonInput.value)
│       ├── [ERROR] JSON.parse throws OR mcpServers missing/empty/multiple OR unsupported transport OR required command/url missing
│       └── throw/return validation error
└── autobyteus-web/components/tools/McpServerFormModal.vue:showJsonInputError(message) [STATE]
    # Store preview/save actions are not called.
```

### Coverage Status

- Error Path: Covered by planned `SCN-005`.

## Use Case: UC-005 Optional JSON-to-form conversion

### Spine Context

- Spine ID(s): DS-002, DS-003
- Governing Owner: `McpServerFormModal.vue`

### Goal

Keep **Apply JSON to Form** as an optional conversion action using the same parser as preview/save.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-web/components/tools/McpServerFormModal.vue:applyJsonToForm()
├── autobyteus-web/components/tools/McpServerFormModal.vue:buildInputFromJson(jsonInput.value)
├── autobyteus-web/components/tools/McpServerFormModal.vue:applyInputToForm(input) [STATE]
│   ├── reset form/envList/argList
│   ├── populate form.serverId/transportType/toolNamePrefix/enabled
│   ├── populate stdioConfig or streamableHttpConfig
│   └── populate argList/envList for Form View controls
├── autobyteus-web/components/tools/McpServerFormModal.vue:emit('show-toast', success) [STATE]
└── autobyteus-web/components/tools/McpServerFormModal.vue:activeTab.value = 'form' [STATE]
```

### Error Path

```text
[ERROR] JSON parse/validation fails
autobyteus-web/components/tools/McpServerFormModal.vue:buildInputFromJson(...)
└── autobyteus-web/components/tools/McpServerFormModal.vue:emit('show-toast', error) [STATE]
    # Active tab remains JSON View.
```

### Coverage Status

- Primary/Error Path: Covered by planned `SCN-008`, `SCN-005`.
