# IMP-13 — web codegen against the built server
# Command: node /tmp/244-codegen/run.mjs <worktree> (startBuiltTestServer; BACKEND_GRAPHQL_BASE_URL=http://127.0.0.1:<port>/graphql pnpm -C autobyteus-web codegen; server stopped and its runtime removed)
# Commit: 7250e64c05 (server GraphQL) built into dist; output committed in ff58750ff7
# Environment: macOS Darwin 25.5.0, Node v22.23.1
# Date: 2026-10-26

- Codegen succeeded (`[SUCCESS] Generate to ./generated/graphql.ts`).
- The full output differed from HEAD in 99 hunks (1869 insertions), mostly unrelated drift (embedding, agent runtimes, project tasks …).
- Committed only the 28 MCP hunks (249 insertions, 22 deletions), applied by original line number.
- Three of them fix a mis-merge from autobyteus-190 in HEAD's file: `failures: Array<ImportMcpServerConfigFailure>` sat inside `MemoryExplorerSourceInput`, `ImportMcpServerConfigFailure` was out of place, and `ImportMcpServerConfigsDocument` lacked `failures`. `ImportMcpServerConfigsResult` is a type this ticket changes.
- After applying, `generated/graphql.ts` parses; `tsc` reports no error in it beyond the pre-existing unresolved `@vue/apollo-composable` / `@vue/composition-api` modules (IMP-15).
