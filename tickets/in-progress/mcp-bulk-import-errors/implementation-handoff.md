# Implementation Handoff — mcp-bulk-import-errors

- Ticket folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/mcp-bulk-import-errors/tickets/in-progress/mcp-bulk-import-errors/`
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/mcp-bulk-import-errors`, branch `codex/mcp-bulk-import-errors`, base `origin/personal` @ `41be799edb`
- Commits:
  - `df15c4385d`: the change;
  - `c5161eddc8`: polish found by the render check;
  - ticket artifacts follow in the next commit (its hash is in the handoff message).

## Upstream Artifact Package

- Handoff-rule result: Small / Low, direct route. My `get_handoff_rules` result: direct API/E2E.
- Requirements doc: `requirements-doc.md` (SR-001)
- Investigation notes: `investigation-notes.md`
- Solution revision record: `solution-revision-record.md`
- Design spec: `design-spec.md` (SR-001)
- Supplemental artifacts: none
- Design review report / architecture review revision record: `N/A — not applicable`
- Triggering rework: N/A (initial)

## Current Implementation Summary

- Implementation cycle: `Initial`
- Implementation revision record: `implementation-revision-record.md`
- Current implementation revision ID: `IR-001`
- Related solution revision IDs: `SR-001`
- Related ARCH-REV / CRR / API-REV / DR: `N/A`
- Triggering finding IDs: `N/A`

What now happens:

- **One transport rule, in the core parser.** `McpConfigService.parseMcpConfigDict` (`autobyteus-ts`) resolves the transport through the new private `transportTypeOf`:
  - an explicit `transport_type` (or `transportType`) is used as given; a non-string is rejected;
  - otherwise, a non-empty `url` means `streamable_http` (it wins over `command`, as the loader's rule did);
  - otherwise, a non-empty `command` means `stdio`;
  - otherwise the error is: `Config for server '<id>' needs 'command' (stdio) or 'url' (streamable_http), or an explicit 'transport_type'.`

  The server's `mcps.json` loader (`file-provider.ts` `parseEntry`) no longer infers anything.
- **Per-entry failures.**
  - `importConfigsFromJson` returns `{ imported_count, failed_count, failures: { server_id, reason }[] }`. The reason is `error.message`; config errors name fields, never values.
  - A non-object entry is passed to the parser unchanged, so its reason is "must be a dictionary" (before, a string entry's characters were spread into a confusing config).
  - GraphQL adds `ImportMcpServerConfigFailure { serverId, reason }` and `ImportMcpServerConfigsResult.failures` (additive). On a whole-input error, the resolver returns `failures: []`.
- **Web.**
  - The mutation selects `failures`.
  - The store reads `importedCount` (it read `imported_count`, so the list never refreshed after an import) and types the call with the generated mutation types.
  - `McpBulkImportView`:
    - full success: a success toast ("MCP server configurations imported: N.") and a return to the list, as before;
    - partial: an info toast; the view stays open and lists the failed entries under the Import button, scrolled into view;
    - none imported: an error toast and the list;
    - whole-input error: the server's message, as before.
  - Strings are in en and zh-CN.
- **Dead code removed:** `applyAndRegisterConfigsFromJson`, its `ApplyResult` type, its gated integration case, and that case's `TEST_MCP_CONFIG_JSON` helper. There was no production caller.
- **Docs:** the `McpBulkImportView.vue` section in `autobyteus-web/docs/tools_and_mcp.md` is rewritten. It wrongly said "JSON array"; it now covers the inference rule, failures, stay-open and refresh behavior.

### Note on `generated/graphql.ts`

Running codegen against this branch's server also produced about 400 lines of **unrelated** drift: embedding-model types and others, from earlier features whose generated types were never committed. I committed only the four import-related hunks (14 lines) and left the drift out to keep the ticket in scope. The unrelated drift is listed as a follow-up below.

## Routing Classification (Mandatory)

- Task size: `Small`. Architecture risk: `Low`.
- Design classification section: `design-spec.md` → "Task Size And Architectural Risk"
- Classification confirmed or changed: `Confirmed`
- Evidence:
  - The GraphQL change is additive.
  - The loader's behavior is unchanged for every entry the app writes; `file-provider.http-auth.test.ts` and the new `file-provider.transport-rule.test.ts` load stored entries without `transport_type`.
  - The only loader difference is an entry with neither `url` nor `command`. It failed before (empty command) and fails now with a clearer message; `getAll()` skips it either way.
- Selected route: `Direct API/E2E`
- Lightweight implementation self-review completed: `Yes`
- New design impact or escalation trigger: `None`

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001 | Per-entry failures with reasons, no secret values | `importConfigsFromJson` → resolver → mutation → view | Server unit (secret-value check with dummy env, header, token and string values); IMP-07 GraphQL e2e; IMP-10 rendered |
| BEH-002 | Inferred transport; the app's own `mcps.json` imports fully | core `transportTypeOf`; loader drops its own rule | IMP-00 red on base; core unit; IMP-07 round trip (saved entries equal the originals); loader tests |
| BEH-003 | View: list, stay open, refresh, toasts by counts (en, zh-CN) | store `importedCount`; `McpBulkImportView.vue` | Store spec (red on base store); view spec (4 cases); IMP-10 rendered in en and zh-CN |
| BEH-004 | Whole-input errors as today | resolver catch → `failures: []`; the view shows the server message | Server unit (malformed JSON, missing `mcpServers`); view spec |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`

## Key Files Or Areas

- Core: `autobyteus-ts/src/tools/mcp/config-service.ts`
- Server:
  - `autobyteus-server-ts/src/mcp-server-management/providers/file-provider.ts`
  - `…/services/mcp-config-service.ts`
  - `src/api/graphql/types/mcp-server.ts`, `mcp-server-config.ts`
- Web:
  - `autobyteus-web/graphql/mutations/mcpServerMutations.ts`, `generated/graphql.ts`
  - `stores/toolManagementStore.ts`
  - `components/tools/McpBulkImportView.vue`
  - `localization/messages/{en,zh-CN}/tools.generated.ts`
  - `docs/tools_and_mcp.md`
- Tests:
  - `autobyteus-ts/tests/unit/tools/mcp/config-service.test.ts`
  - `autobyteus-server-ts/tests/unit/mcp-server-management/services/mcp-config-service.test.ts`
  - `…/file-provider.transport-rule.test.ts` (new)
  - `tests/integration/mcp-server-management/mcp-config-service.integration.test.ts` (dead case removed)
  - `tests/e2e/tool-management/mcp-bulk-import.e2e.test.ts` (new)
  - `autobyteus-web/stores/__tests__/toolManagementStore.mcpImport.spec.ts` (new)
  - `components/tools/__tests__/McpBulkImportView.spec.ts` (new)

## Important Assumptions

- Reasons are the server's English error messages, shown as-is in both languages. Only the view's own strings are localized.

## Known Risks

- None beyond the design's. The entry with neither `url` nor `command` gets a clearer skip message on load.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Behavior Change (small) + bug fix
- Reviewed root-cause classification: Duplicated Policy Or Coordination; Local Implementation Defect
- Reviewed refactor decision: `Refactor Needed Now` (bounded: the rule moved to its owner)
- Implementation matched: `Yes`
- If challenged, routed as `Design Impact`: `N/A`

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`
- Dead code in touched files removed: `Yes`. The apply method, its type, the gated test case and its env helper; the loader's duplicate rule; the wrong `imported_count` reads.
- Dead code found elsewhere, listed as follow-ups:
  - `autobyteus-web/generated/graphql.ts` lags the server schema by about 400 lines of unrelated types (found when running codegen). Regenerate it in its own change.
  - `McpBulkImportView.vue` still has hard-coded English labels ("Back", "Cancel", "Importing...", "Import Configurations"). These were already there before this change, and the localization audit passes with them.
- Shared structures remain tight: `Yes`
- Size guardrails: `Yes`. All touched source files are well under 500 lines; `McpBulkImportView.vue` is 145.

## Persisted Data Transition Check

`Not Affected`. The writer is unchanged, and stored entries load the same way (tests above).

## Environment Or Dependency Notes

- In the fresh worktree:
  - `pnpm install --frozen-lockfile`;
  - `pnpm -C autobyteus-ts build`;
  - `pnpm -C autobyteus-server-ts prebuild`;
  - the server build, which also served codegen on a free port (stopped after).
- The first full check run was cut short by a client restart: server integration was killed during its setup, with 0 tests run. I reran it and everything after it. The logs are the reruns.

## Checks Run

Evidence is in `tickets/in-progress/mcp-bulk-import-errors/evidence/`. Each log has a header with the command, commit, environment and date. Environment: macOS 26, node v22.

| Check ID | Command Or Steps | Commit Tested | Environment | Code It Exercises | Behavior / Criteria IDs | Result | Evidence Files | Look For |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-00 | `pnpm -C autobyteus-ts exec vitest run tests/unit/tools/mcp/config-service.test.ts`, with the new tests on the base parser | `41be799edb` parser + new tests | local | base core parser | AC-002/003 (red proof) | Fail (expected) | `IMP-00-core-inference-red-on-base.log` | `Tests  6 failed \| 12 passed (18)`; `Config data for server 'local' is missing 'transport_type' field.` |
| — | Store spec on the base store (run once, not logged) | base store + new spec | local | `imported_count` read | AC-004 (red proof) | Fail (expected) | — | `× … refreshes the server list when at least one entry was imported` |
| IMP-01/02 | `pnpm -C autobyteus-ts build`; `pnpm -C autobyteus-ts exec vitest run tests/unit` | `df15c4385d` | local | core | AC-003 | Pass | `IMP-01-core-build.log`, `IMP-02-core-unit.log` | `Tests  2096 passed (2096)` |
| IMP-03 | `env -i … pnpm -C autobyteus-ts exec vitest run tests/integration/tools/mcp` | `df15c4385d` | clean env, uv | MCP clients with the new parser | preserved | Pass | `IMP-03-core-integration-mcp.log` | `Tests  22 passed \| 1 skipped (23)` |
| IMP-04 | `pnpm -C autobyteus-server-ts typecheck` | `df15c4385d` | local | server src | — | Pass | `IMP-04-server-typecheck.log` | exit 0 |
| IMP-05 | `pnpm -C autobyteus-server-ts test:unit` | `df15c4385d` | isolated env | import service, resolver, loader tests | AC-001, AC-005, AC-006 | Pass | `IMP-05-server-unit.log` | `Tests  6174 passed \| 7 skipped (6181)` |
| IMP-06 | `test:integration:prepare` then `test:integration` | `df15c4385d` | isolated env | server integration (dead case removed) | — | Pass | `IMP-06a-…`, `IMP-06-server-integration.log` | `Tests  419 passed \| 70 skipped (489)` |
| IMP-07 | `env -i … vitest run tests/e2e/tool-management/mcp-bulk-import.e2e.test.ts tests/e2e/tool-management/mcp-http-auth-remote-server.e2e.test.ts` | `df15c4385d` | clean env, in-process server | GraphQL import end to end; `mcps.json` round trip; 179 auth (preserved) | AC-001, AC-002 | Pass | `IMP-07-e2e-mcp-bulk-import.log` | `Tests  4 passed (4)` |
| IMP-08 | `pnpm -C autobyteus-web test:nuxt components/tools stores/__tests__/toolManagementStore.mcpImport.spec.ts stores/__tests__/toolManagementStore.mcpGateway.spec.ts --run` | `c5161eddc8` | local | view, store | AC-004 | Pass | `IMP-08-web-tools-and-store.log` | `Tests  23 passed (23)` |
| IMP-09 | `guard:web-boundary`, `guard:localization-boundary`, `audit:localization-literals` | `c5161eddc8` | local | web rules, new strings | AC-004 | Pass | `IMP-09-web-*.log` | `Passed` / `Passed with zero unresolved findings.` |
| IMP-10 | Rendered check on `pnpm dev`: headless Chrome via `IMP-10-render-script.mjs` (en), plus the AutoByteus tab (zh-CN DOM) | `df15c4385d` + polish (then committed as `c5161eddc8`) | dev stack, worktree data root (removed) | the view end to end | AC-004, REQ-005 | Pass | `IMP-10-render-check.md`, `IMP-10-render-partial-import-en.png`, `IMP-10-render-failure-list-en.png`, `IMP-10-render-full-import-en.png` | `"listInViewport": true`, `"stillOnView": true`, `"toastText": "Imported 1; 2 failed. See the entries below."`; after a full import `"onView": false`, `"listShowsServer": true`; zh-CN toast `已导入 1 个，2 个失败。请查看下方条目。` |

- Not run, and why:
  - the full web suite: only `components/tools` and the store changed;
  - the full server e2e: for API/E2E;
  - an isolated desktop app: the web-equivalent behavior is covered by IMP-10, and the desktop shell is untouched.

## Frontend Rendered-Result Check

- Affected surface: Settings → MCP Servers → Bulk Import.
- References: REQ-005, AC-004, DEC-003; the view's existing styling (no Product Design).
- Surface used: `pnpm dev` (README local full-stack). Driven with headless Chrome (playwright-core with system Chrome, 1440×900). The AutoByteus browser tab was used for zh-CN; its viewport was 0×0 and hidden, so it could not give layout or screenshots.
- States inspected:
  - partial import (en, zh-CN);
  - full import (en; returns to the list, which shows the new server);
  - the list's placement, containment and overflow;
  - its visibility after an import.
- Issues found and corrected:
  1. The failure list was below the fold under the tall editor. It now scrolls into view.
  2. "Imported 1 MCP server configurations." was ungrammatical; it now reads "MCP server configurations imported: N."
- Limitations: no zh-CN screenshot; narrow widths and dark theme not inspected.

## Downstream Coverage Hints / Suggested Scenarios

- Paste a real exported `mcps.json` shape (several stdio servers with env and HTTP servers with headers or a token) into Bulk Import in an isolated app. Every entry should import, and no value should appear in the UI or the logs.
- A mixed paste in the UI: the failed entries are listed, the view stays open, and the list behind it refreshes.
- Whole-input errors (invalid JSON; no `mcpServers`) in the UI: the error toast as before, no list.

## API / E2E / Executable Coverage Investigation And Execution Still Required

- Independent confirmation of AC-001, AC-002 and AC-004, reusing IMP-07, IMP-08 and IMP-10 while the code is unchanged.
- A real-product (isolated-app) pass of the Bulk Import journey if wanted.
