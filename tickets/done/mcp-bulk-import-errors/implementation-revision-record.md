# Implementation Revision Record — mcp-bulk-import-errors

The current code and `implementation-handoff.md` remain authoritative. This record locates each implementation round.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Solution Designer, `handoff.md` (Architecture Design Complete), round 1 | N/A | `Initial Baseline` | SR-001; ARCH-REV N/A; CRR N/A; API-REV N/A; DR N/A | Implementation complete; direct API/E2E route |

## Revision Entries

### IR-001 — Per-entry import failures, one transport rule, web import fixes

- Triggering role, report path, and round: Solution Designer, `/Users/normy/autobyteus_org/autobyteus-worktrees/mcp-bulk-import-errors/tickets/in-progress/mcp-bulk-import-errors/handoff.md`, round 1
- Triggering finding IDs: N/A
- Classification: Initial Baseline
- Prior authoritative result: N/A
- Current authoritative result: commits `df15c4385d` (the change) and `c5161eddc8` (render-check polish: scroll the failure list into view; English success-toast wording) on `codex/mcp-bulk-import-errors`
- Related solution revision IDs: SR-001
- Related architecture-review / code-review / API/E2E / delivery revision IDs: N/A
- Why this baseline is recorded: initial implementation handoff
- Approved behavior or requirement IDs affected: BEH-001..BEH-004; REQ-001..REQ-006; AC-001..AC-006
- Implementation delta:
  - Core `McpConfigService.parseMcpConfigDict`: transport inference in the new `transportTypeOf`.
    - An explicit type is used as given; a non-string is rejected.
    - Without one: url → streamable_http, command → stdio, neither → an error naming both.
  - Server `file-provider.ts` `parseEntry`: its own inference is removed.
  - Server `McpConfigService.importConfigsFromJson`:
    - returns `failures: { server_id, reason }[]`;
    - a non-object entry goes to the parser unchanged, so it reports "must be a dictionary";
    - `applyAndRegisterConfigsFromJson` and `ApplyResult` are removed.
  - GraphQL: `ImportMcpServerConfigFailure { serverId, reason }` and `ImportMcpServerConfigsResult.failures`; the resolver's error path returns `failures: []`.
  - Web:
    - the mutation selects `failures`;
    - `generated/graphql.ts` gets only the import-related codegen hunks (the committed file was behind the schema in unrelated places);
    - the store reads `importedCount` (was `imported_count`), typed with the generated mutation types;
    - `McpBulkImportView`: a failure list, toasts by counts (en, zh-CN) and navigation only on full success.
  - Docs: the `McpBulkImportView.vue` section in `autobyteus-web/docs/tools_and_mcp.md` rewritten (its "JSON array" line was wrong).
  - The dead gated integration case and its `TEST_MCP_CONFIG_JSON` helper are removed.
- Changed files or areas: see the handoff's Key Files
- Local validation and result: see the handoff's Checks Run. The core inference tests were red on the base parser (IMP-00), and the store refresh test was red on the base store. A rendered check (IMP-10) found the two polish items.
- Next recipient or routing: per `get_handoff_rules` (direct API/E2E for Small / Low)
- Remaining limitations or risks: none known
