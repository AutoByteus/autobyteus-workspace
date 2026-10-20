# Investigation Notes — MCP bulk import: per-entry reasons and the app's own entry shape

## Meta

- Package: `mcp-bulk-import-errors`; Project Task `autobyteus-190`
- Workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/mcp-bulk-import-errors`, branch `codex/mcp-bulk-import-errors`, base `origin/personal` @ `41be799edbcd14266bc4ff2e63f8d21d69b7ce8b` (fetched 2026-10-20); finalization target `origin/personal`
- Authorities read (this conversation): `SKILL.md`, `references/ticket-scope.md`, `references/requirements-engineering.md`, `references/architecture-design.md`, `references/design-principles.md`, `DESIGN.md`, `TESTING.md`
- SR: `SR-001`. How the findings were established: **read** (code), plus the parity evidence of autobyteus-181 round 2 (**reproduced** there: "Bulk import rejects the app's own `mcps.json` shape")

## Source Log

| Source | Finding |
| --- | --- |
| `autobyteus-server-ts/src/api/graphql/types/mcp-server.ts` L162-184 `importMcpServerConfigs` | Returns `{ success, message: "Import complete. Imported: N, Failed: M", importedCount, failedCount }`. No per-entry data. A whole-input error (bad JSON, no `mcpServers`) is caught and returned as `success:false` with the message and 0/0 counts |
| `autobyteus-server-ts/src/api/graphql/types/mcp-server-config.ts` L157-170 `ImportMcpServerConfigsResult` | Fields `success`, `message`, `importedCount`, `failedCount` |
| `autobyteus-server-ts/src/mcp-server-management/services/mcp-config-service.ts` L138-166 `importConfigsFromJson` | Per entry: `parseMcpConfigDict` then `configureMcpServer` (save only, no discovery). On error it only does `logger.error(...)` and `failedCount++`; the reason is discarded |
| `…/mcp-config-service.ts` L168-225 `applyAndRegisterConfigsFromJson` | Per-entry results with messages, plus discovery. **No production caller** (grep: only `tests/integration/mcp-server-management/mcp-config-service.integration.test.ts` L193). Dead code in a touched file |
| `autobyteus-ts/src/tools/mcp/config-service.ts` L105-142 `parseMcpConfigDict` | Normalizes the `transportType`/`toolNamePrefix` aliases; **throws "missing 'transport_type' field" when absent**. That is the cause of rejecting the app's own shape |
| `autobyteus-server-ts/src/mcp-server-management/providers/file-provider.ts` L80-98 `parseEntry` | The app's own stored shape has **no `transport_type`** (`toStandardEntry` writes `url`… or `command`…). The file loader infers it (`url` → `streamable_http`, else `stdio`) before calling the core parser. So the inference rule lives only here: duplicated policy in the wrong owner |
| `autobyteus-web/stores/toolManagementStore.ts` L346-372; `components/tools/McpBulkImportView.vue` L86-116; `graphql/mutations/mcpServerMutations.ts` L72-82 | The mutation selects `importedCount`/`failedCount`, but the store and view read **`imported_count`** (undefined). Effects: the server list is never refreshed after an import; a partial import is shown as an error toast; `save-complete` is not emitted after a partial import. A bug in the functionality this ticket changes |
| `autobyteus-web/components/tools/McpServerFormModal.vue` `normalizeTransport` | The form's JSON tab already infers transport client-side from `url`/`command` (a separate input surface; consistent with the target rule) |
| `autobyteus-web/localization/messages/{en,zh-CN}/tools.generated.ts` | Import view strings live here (two locales) |
| Config constructors' error texts (`types.ts`, `config-service.ts`) | Name fields, not values (e.g. "'url' must be a non-empty string", "sets both 'token' and an 'Authorization' header"). An invalid transport message includes the transport string, which is not a secret. Per-entry reasons can be returned as is, but must never include env/header/token values |

## Findings

- F-1: per-entry failure reasons are discarded (Task).
- F-2: the app's own shape is rejected, because transport inference exists only in the file loader (Task; duplicated policy).
- F-3: the web reads the wrong field names (`imported_count`), so refresh and partial-success handling are broken (this ticket, per `ticket-scope.md`).
- F-4: `applyAndRegisterConfigsFromJson` is dead (touched file, so decided here).

## Prerequisites

None.
