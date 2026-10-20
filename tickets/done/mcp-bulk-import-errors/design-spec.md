# Design Spec — MCP bulk import: per-entry reasons and the app's own entry shape

## Solution And Approval Basis

- SR-001; requirements approved by the Solution Designer within the direction of `autobyteus-190` (user informed 2026-10-20)
- Design status: `Ready`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/mcp-bulk-import-errors/tickets/in-progress/mcp-bulk-import-errors/investigation-notes.md`
- Authorities read: `references/architecture-design.md`, `references/design-principles.md`, `references/ticket-scope.md`, `/Users/normy/autobyteus_org/autobyteus-worktrees/mcp-bulk-import-errors/DESIGN.md`, `TESTING.md`
- Conflicts: none

## Current-State Read

Bulk import goes: web view → store → GraphQL `importMcpServerConfigs` → `McpConfigService.importConfigsFromJson` (server). The service parses each entry with the core `parseMcpConfigDict` and saves it with `configureMcpServer`. The service throws away failure reasons (F-1). The core parser requires `transport_type`, while the file loader infers it before calling the parser (F-2). The web reads `imported_count`, a field the API doesn't have (F-3). An unused apply-and-register method sits next to the import (F-4).

## Task Size And Architectural Risk (Mandatory)

- Task size: `Small`
- Size rationale:
  - core parser: about 10 lines;
  - file loader: about 5 lines removed;
  - server service: the result gains failures, and the dead method is removed;
  - GraphQL: one result field and one object type;
  - web: the mutation selection, store, view and 2 locales;
  - regenerated GraphQL types; tests.

  All within existing owners.
- Architectural risk: `Low`. The GraphQL change is additive. There is no persistence or deployment change, and the inference rule is moved, not changed, for the loader path.
- Escalation trigger: any loader behavior difference on a real stored `mcps.json` shape → Design Impact.

## Intended Change

- One transport inference rule, in the core parser.
- Per-entry failures in the import result.
- The web reads the correct fields, refreshes, and shows the failures.
- The dead apply method is removed.

## Change Scope (Mandatory)

- In scope: UC-001, UC-002.
  - `autobyteus-ts/src/tools/mcp/config-service.ts`
  - `autobyteus-server-ts/src/mcp-server-management/providers/file-provider.ts`
  - `…/services/mcp-config-service.ts`
  - `src/api/graphql/types/mcp-server.ts`, `mcp-server-config.ts`
  - `autobyteus-web/graphql/mutations/mcpServerMutations.ts`, `stores/toolManagementStore.ts`, `components/tools/McpBulkImportView.vue`, `localization/messages/{en,zh-CN}/tools.generated.ts`, `generated/graphql.ts`
  - tests; docs note in `autobyteus-web/docs/tools_and_mcp.md`
- Deliberately left alone:
  - the single-server form, including its client-side `normalizeTransport` (a separate surface, already consistent);
  - discovery at import;
  - the gateway.
- Follow-ups: none found.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior | REQ / AC | Path |
| --- | --- | --- |
| BEH-001 | REQ-001/002, AC-001 | DS-001 |
| BEH-002 | REQ-003/004, AC-002/003/006 | DS-001, DS-002 |
| BEH-003 | REQ-005, AC-004 | DS-001 (web) |
| BEH-004 | REQ-006, AC-005 | DS-001 |

## Task Design Health Assessment (Mandatory)

- Change posture: `Behavior Change` (small) plus a bug fix (F-3)
- Root cause classification: `Duplicated Policy Or Coordination` (transport inference only in the loader); `Local Implementation Defect` (the web field names; reasons discarded)
- Refactor needed now: `Yes`, bounded. Move the rule into its owner (the core parser).
- Design response: the core parser owns "what an MCP config dict means", including inference. The loader stops pre-processing.

## Legacy Removal Policy (Mandatory)

- Removed: `parseEntry`'s own inference (replaced by the core rule), `applyAndRegisterConfigsFromJson` and its integration test (dead), and the `imported_count` reads in the web.
- Compatibility wrappers: `None`.

## Persisted Data / State Transition Decision (Mandatory)

`Not Affected`: the `mcps.json` writer is unchanged. The reader gets the same result: `url` → HTTP, otherwise stdio. Previously, "neither" defaulted to stdio and then failed on an empty `command`; now it fails with a clearer message. Both are skipped by `getAll()`.

## Data-Flow Spine Inventory

| Spine | Start | End | Owner |
| --- | --- | --- | --- |
| DS-001 | Bulk Import view (paste, Import) | Result shown; list refreshed | Server `McpConfigService.importConfigsFromJson` |
| DS-002 | Startup / reads of `mcps.json` | Configs | `FileMcpServerConfigProvider` → core parser |

## Primary Execution Spine(s)

- DS-001: `McpBulkImportView → toolManagementStore.importMcpServerConfigs → GraphQL importMcpServerConfigs → McpConfigService.importConfigsFromJson (per entry: core parseMcpConfigDict [infer] → configureMcpServer; on error collect {serverId, reason}) → result {success, message, importedCount, failedCount, failures} → view (list, toast, refresh)`
- DS-002: `mcps.json → FileMcpServerConfigProvider.parseEntry (server_id, enabled default, spread) → core parseMcpConfigDict [infer]`

## Spine Narratives (Mandatory)

| Spine | Narrative |
| --- | --- |
| DS-001 | Each entry is parsed and saved independently. A failure records the entry's id and the error message, and the import continues. The resolver maps the failures into the result. The view lists them and stays open when any exist. |
| DS-002 | The loader no longer decides the transport; the core parser does, with the same rule. |

## Spine Actors / Main-Line Nodes; Ownership Map

- The core parser owns config meaning (aliases, inference, validation).
- The server service owns the import loop and failure collection.
- The resolver maps the domain result to GraphQL.
- The view owns presentation.

## Thin Entry Facades / Public Wrappers

The GraphQL resolver is a thin mapper.

## Removal / Decommission Plan (Mandatory)

| Item | Why | Scope |
| --- | --- | --- |
| `file-provider.ts` `parseEntry` transport inference | Duplicated policy; moved to the core | In This Change |
| `McpConfigService.applyAndRegisterConfigsFromJson` + its `ApplyResult` type + the integration test case | Dead: no production caller (grep) | In This Change |
| `imported_count` reads in `toolManagementStore.ts` / `McpBulkImportView.vue` | Wrong field | In This Change |

## Off-Spine Concerns Around The Spine

| Concern | Owner | Note |
| --- | --- | --- |
| Reason text | Server service | Use `error.message`. Config constructors name fields, not values; keep it that way (REQ-002). No env/header/token value may appear; test it with dummy values |

## Ownership Boundaries / Dependency Rules

- The web never infers transport for bulk import; the server does.
- The resolver must not re-parse.
- The loader must not re-implement inference.

## Interface Boundary Mapping

| Interface | Change |
| --- | --- |
| `McpConfigService.parseMcpConfigDict` (core) | When `transport_type` (after alias normalization) is missing: a non-empty `url` → `streamable_http`; a non-empty `command` → `stdio`; neither → error "Config for server '<id>' needs 'command' (stdio) or 'url' (streamable_http), or an explicit 'transport_type'." |
| `importConfigsFromJson` (server) | Returns `{ imported_count, failed_count, failures: { server_id, reason }[] }` |
| GraphQL `ImportMcpServerConfigsResult` | Adds `failures: [ImportMcpServerConfigFailure!]!` with `serverId: String!`, `reason: String!` |
| Web mutation | Selects `failures { serverId reason }` |

## Interface Boundary Check / Naming Check

Singular and explicit. `ImportMcpServerConfigFailure`, `failures`: natural.

## Existing Capability / Subsystem Reuse Check

| Need | Decision |
| --- | --- |
| Inference | Reuse the existing loader rule, moved into the core parser |
| Failure UI | The existing view; a simple list in its current style |

## Subsystem / Capability-Area Allocation; File Mapping (Final)

| File | Change |
| --- | --- |
| `autobyteus-ts/src/tools/mcp/config-service.ts` | Inference in `parseMcpConfigDict` |
| `autobyteus-ts/tests/unit/tools/mcp/config-service.test.ts` | Inference cases (url, command, neither, explicit wins, alias) |
| `autobyteus-server-ts/src/mcp-server-management/providers/file-provider.ts` | `parseEntry` without its own inference |
| `autobyteus-server-ts/src/mcp-server-management/services/mcp-config-service.ts` | Failures collected; dead method removed |
| `autobyteus-server-ts/src/api/graphql/types/mcp-server-config.ts`, `mcp-server.ts` | New object type and field; mapping; the catch path returns `failures: []` |
| `autobyteus-server-ts/tests/unit/mcp-server-management/services/mcp-config-service.test.ts` | AC-001, AC-005; secret-value check |
| `autobyteus-server-ts/tests/integration/mcp-server-management/mcp-config-service.integration.test.ts` | Remove the apply-and-register case |
| server e2e (existing GraphQL MCP e2e file or a new one) | AC-001 via GraphQL; AC-002: a round trip of the app's own `mcps.json` |
| `autobyteus-web/graphql/mutations/mcpServerMutations.ts`, `generated/graphql.ts` | Selection and types (codegen) |
| `autobyteus-web/stores/toolManagementStore.ts` | `importedCount`; refresh when > 0 |
| `autobyteus-web/components/tools/McpBulkImportView.vue` | Failure list; stay open on failures; toast by counts |
| `autobyteus-web/components/tools/__tests__/McpBulkImportView.spec.ts` (new or existing) | AC-004 |
| `autobyteus-web/localization/messages/{en,zh-CN}/tools.generated.ts` | Strings (e.g. "These entries were not imported:") |
| `autobyteus-web/docs/tools_and_mcp.md` | A short note (delivery may refine) |

## Concrete Examples

| Topic | Good | Avoided |
| --- | --- | --- |
| Result | `{ success:false, message:"Import complete. Imported: 1, Failed: 2", importedCount:1, failedCount:2, failures:[{serverId:"bad", reason:"Invalid 'transport_type' string 'websocket' for server 'bad'. Valid types are: stdio, streamable_http."},{serverId:"empty", reason:"Config for server 'empty' needs 'command' (stdio) or 'url' (streamable_http), or an explicit 'transport_type'."}] }` | A reason that echoes `env`/`headers` |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Decision |
| --- | --- |
| Keep the loader's own inference "as well" | Rejected (one rule) |
| Keep `applyAndRegisterConfigsFromJson` for future use | Rejected (dead) |

## Change / Refactor Sequence

1. Core inference and its tests.
2. Loader simplification; the existing loader tests stay green.
3. Server failures and dead-code removal, with tests.
4. GraphQL type and mapping; codegen.
5. Web store, view and locales, with the component test.
6. Server e2e (GraphQL import with failures; app `mcps.json` round trip).

## Risks

Low. A stored entry with neither `url` nor `command` gets a clearer skip message; nothing else changes.

## Guidance For Implementation

Dummy values only. Test that no env/header/token value appears in `failures` or the message.
