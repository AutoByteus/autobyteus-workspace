# Implementation Handoff — mcp-http-auth-headers

- Ticket folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/mcp-http-auth-headers/tickets/in-progress/mcp-http-auth-headers/`
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/mcp-http-auth-headers`, branch `codex/mcp-http-auth-headers`, base `origin/personal` @ `d6f2d6ceb5`
- Implementation commits: `b109a62ea6` (fix), `d89135a832` (web-only cleanup, see Legacy check). The ticket artifacts and evidence are in a later commit on the same branch; see the handoff message for its hash.
- Note: `origin/personal` has moved one docs-only commit ahead (`c64a45b871`, RELEASE.md and the migration guideline); not merged here, as it does not touch this change.

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: Small / Low, direct route. Solution Designer's `handoff.md` records the matched rule. My `get_handoff_rules` result: direct API/E2E (`/software_engineering_team/api_e2e_engineer`).
- Requirements doc: `requirements-doc.md` (SR-001, Approved)
- Investigation notes: `investigation-notes.md`
- Solution revision record: `solution-revision-record.md`
- Design spec: `design-spec.md` (SR-001, Ready)
- Supplemental task artifacts: probes in `/Users/normy/autobyteus_org/autobyteus-worktrees/jira-mcp-server-presets/tickets/in-progress/jira-mcp-server-presets/probes/` (shape reference only)
- Design review report: `N/A — not applicable`
- Architecture review revision record: `N/A — not applicable`
- Triggering rework report: N/A (initial)

## Current Implementation Summary

- Implementation cycle: `Initial`
- Implementation revision record: `implementation-revision-record.md`
- Current implementation revision ID: `IR-001`
- Related solution revision IDs: `SR-001`
- Related architecture-review / code-review / API/E2E / delivery revision IDs: `N/A`
- Triggering finding IDs: `N/A`

What now happens:

- `StreamableHttpMcpServerConfig` (`autobyteus-ts/src/tools/mcp/types.ts`) owns the effective headers. The token is trimmed and a blank token becomes `null`. A token together with any-case `Authorization` header throws `Streamable HTTP MCP server '<id>' sets both 'token' and an 'Authorization' header; use one of them.` The new `requestHeaders()` returns a copy of `headers`, plus `Authorization: Bearer <token>` when a token is set.
- `HttpManagedMcpServer` builds `new StreamableHTTPClientTransport(new URL(url), { requestInit: { headers: config.requestHeaders() } })`. The SDK applies these headers to every POST and to the SSE GET.
- `FileMcpServerConfigProvider.toStandardEntry` writes `token` when it is set. `token` and `headers` stay separate fields.
- `McpServerFormModal.vue`: the Form → JSON view includes non-empty `headers`. A hint under the Token field is linked with `aria-describedby`; text in en and zh-CN.
- A docs section, "Remote (Streamable HTTP) Server Credentials", is added to `autobyteus-server-ts/docs/modules/mcp_server_management.md`.

## Routing Classification (Mandatory)

- Task size: `Small`
- Architecture risk: `Low`
- Design classification section: `design-spec.md` → "Task Size And Architectural Risk"
- Classification confirmed or changed: `Confirmed`
- Evidence: 5 production files across 3 packages, each a few lines inside its existing owner. No GraphQL or schema change. Persistence change is an additive optional key. A code search found only one HTTP transport builder (`http-managed-mcp-server.ts`) and one HTTP persistence writer (`file-provider.ts`). The SDK accepts `requestInit.headers`, which the real-SDK test proves. None of the escalation triggers fired.
- Selected route: `Direct API/E2E`
- Lightweight implementation self-review completed: `Yes` (diff reviewed for scope, value-free errors and logging, dead code, file size, boundary rules; see below)
- New design impact or escalation trigger: `None`

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001 | Headers sent on every request | `types.ts` `requestHeaders()` → `http-managed-mcp-server.ts` `requestInit.headers` → SDK | IMP-02 real-SDK test: initialize, tools/list and tools/call all carry the header; IMP-10: dev stack preview, dummy server logged `auth=expected` on every POST and the SSE GET |
| BEH-002 | Token persisted, sent as Bearer | `types.ts` (normalize, derive) → `file-provider.ts` writes `token` | IMP-02 token case; IMP-04 `file-provider.http-auth.test.ts` save → reload → `requestHeaders()` has Bearer; IMP-10 preview with token |
| BEH-003 | JSON view keeps headers | `McpServerFormModal.vue` `updateJsonFromForm` | IMP-06 spec (edit → JSON shows headers → save keeps them); IMP-10 step 5 |
| BEH-004 | Token + Authorization rejected | `types.ts` constructor; reached from GraphQL save/preview (`createDomainConfigFromInput`), import (`parseMcpConfigDict`) and load | IMP-02 `types.test.ts` (3 letter cases, no values in message), `config-service.test.ts` import path; IMP-10 step 3 (GraphQL preview through the UI) |
| BEH-005 | Unauthenticated/stdio unchanged | No change to stdio; no headers sent when none are configured | IMP-02 open-server case (no `authorization` header seen); full core/server suites green |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`

## Key Files Or Areas

- `autobyteus-ts/src/tools/mcp/types.ts`, `autobyteus-ts/src/tools/mcp/server/http-managed-mcp-server.ts`
- `autobyteus-server-ts/src/mcp-server-management/providers/file-provider.ts`
- `autobyteus-web/components/tools/McpServerFormModal.vue`, `autobyteus-web/localization/messages/{en,zh-CN}/tools.generated.ts`
- Tests:
  - `autobyteus-ts/tests/unit/tools/mcp/http-managed-mcp-server.test.ts` (rewritten, real SDK);
  - `autobyteus-ts/tests/unit/tools/mcp/types.test.ts`;
  - `autobyteus-ts/tests/unit/tools/mcp/config-service.test.ts`;
  - `autobyteus-server-ts/tests/unit/mcp-server-management/file-provider.http-auth.test.ts` (new);
  - `autobyteus-web/components/tools/__tests__/McpServerFormModal.spec.ts`.
- Docs: `autobyteus-server-ts/docs/modules/mcp_server_management.md`

## Important Assumptions

- ASM-001 (all runtimes reach external MCP tools only through the registry → `McpServerInstanceManager` → `HttpManagedMcpServer`) still holds. A grep found no other `StreamableHTTPClientTransport` construction in `autobyteus-ts/src` or `autobyteus-server-ts/src`.
- The SDK is pinned at `@modelcontextprotocol/sdk` 1.30.0. `loadSdk` now imports the named exports `Client` and `StreamableHTTPClientTransport` directly.

## Known Risks

- R-001 (accepted): the token is stored in plain text in `mcps.json` and returned to the UI like headers today. Moving it out is FU-2.
- Saved tokens are now returned to the edit form (existing GraphQL `token` field), as REQ-002's preserved behavior states.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Bug Fix
- Reviewed root-cause classification: Local Implementation Defect + Missing Invariant
- Reviewed refactor decision: `No Refactor Needed`
- Implementation matched the reviewed assessment: `Yes`
- If challenged, routed as `Design Impact`: `N/A`
- Evidence / notes: every fix landed inside its designed owner. No caller other than the config type composes `Authorization`: the web sends `token` and `headers` as entered, and the server persists them as separate fields.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`
- Dead code in the touched files and modules removed: `Yes`
  - `http-managed-mcp-server.ts`:
    - the ignored `url` and top-level `headers` transport options;
    - the single-argument `new Transport(options)` fallback;
    - the `client.initialize()` branch (SDK 1.30 `Client` has no `initialize` method; `connect()` initializes);
    - the `createClientInstance` no-arg constructor fallback (`Client` takes `clientInfo` and does not throw);
    - the export-alias fallbacks (`StreamableHttpClientTransport`, `default`, `default.Client`), which SDK 1.30 does not export.
  - Old mock-only test that asserted the bug.
  - `McpServerFormModal.vue`: the `Object.keys(config).forEach(… delete …)` undefined-key strip before `JSON.stringify`, which already leaves out undefined values (commit `d89135a832`).
- Kept per the design: the `HttpManagedMcpServer.setSdkLoader` seam. With the mock test replaced, no test calls it any more, so it is now test-only and unused. Listed as a follow-up below rather than removed, since the design spec says to keep it.
- Dead code found elsewhere, listed as follow-up:
  - `stdio-managed-mcp-server.ts` and `websocket-managed-mcp-server.ts` carry the same `client.initialize()` branch, constructor fallback and export-alias fallbacks. Evidence: SDK 1.30 `dist/esm/client/index.js` has no `initialize` method on `Client`.
  - `HttpManagedMcpServer.setSdkLoader` / `sdkLoader`: no caller after this change (`grep -rn "HttpManagedMcpServer.setSdkLoader"` → none).
  - O-001 (from the design): the WebSocket transport header handling and its stdio-shaped persistence.
- Shared structures remain tight: `Yes`. `token` and `headers` are separate inputs, and the conflict rule enforces one source for `Authorization`.
- Canonical shared design guidance reapplied: `Yes`
- Changed source files within size guardrails: `Yes`
  - `McpServerFormModal.vue` was 499 effective non-empty lines. The fix took it to 501, and removing the redundant strip line brings it back to 500.
  - `types.ts`: 311 lines. `http-managed-mcp-server.ts`: 55. `file-provider.ts`: 163.
  - No file's change exceeds 220 lines (test files aside).
- Notes: none.

## Persisted Data Transition Check

- Approved decision: `Directly Usable — No Migration`
- Design-spec decision reference: "Persisted Data / State Transition Decision"
- Implementation follows the decision: `Yes`. The writer adds an optional `token`; the reader (`parseEntry` spread) is unchanged.
- Direct-use evidence: `file-provider.http-auth.test.ts` "loads an existing entry written without a token unchanged" (an existing-shape entry with only `url` and `headers` loads with `token=null` and the same headers). The save → reload and blank-token cases pass too.
- Migration implementation: N/A
- Deviation: `None`

## Environment Or Dependency Notes

- I ran `pnpm install --frozen-lockfile` in the fresh worktree; no lockfile change.
- `autobyteus-ts` must be built (`pnpm -C autobyteus-ts build`) before server tests, which import its output. Done at `b109a62ea6`.
- Untracked build outputs (`*/dist/`) are left unstaged, per TESTING.md.

## Checks Run

Evidence is in `tickets/in-progress/mcp-http-auth-headers/evidence/`. Each log starts with a header giving the command, commit, environment and date. Environment: macOS 26 (Darwin 25.5.0), node from the worktree shell, pnpm 10.28.2.

| Check ID | Command Or Steps | Commit Tested | Environment | Code It Exercises | Behavior / Criteria IDs | Result | Evidence Files | Look For |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-00 | `pnpm -C autobyteus-ts exec vitest run tests/unit/tools/mcp/http-managed-mcp-server.test.ts` with the new test on base source | base `d6f2d6ceb5` src + new test | local | old `http-managed-mcp-server.ts` | BEH-001/002 (red proof) | Fail (expected) | `IMP-00-core-real-sdk-red-on-base.log` | `Tests  3 failed \| 1 passed (4)` |
| IMP-01 | `pnpm -C autobyteus-ts build` | `b109a62ea6` | local | all of `autobyteus-ts` (tsc build) | — | Pass | `IMP-01-core-build.log` | `[verify:runtime-deps] OK` |
| IMP-02 | `pnpm -C autobyteus-ts exec vitest run tests/unit` | `b109a62ea6` | local | core incl. `tools/mcp` (real-SDK client test, types, config-service) | BEH-001..005; AC-001, AC-002 (core), AC-003 (config + import), AC-006 | Pass | `IMP-02-core-unit.log` | `Tests  2050 passed (2050)` |
| IMP-03 | `pnpm -C autobyteus-server-ts typecheck` | `b109a62ea6` | local | server `src` | — | Pass | `IMP-03-server-typecheck.log` | exit 0, no `error TS` lines |
| IMP-04 | `pnpm -C autobyteus-server-ts test:unit` | `b109a62ea6` | local, isolated env | server units incl. new `file-provider.http-auth.test.ts` | BEH-002; AC-002 (save → reload) | Pass | `IMP-04-server-unit.log` | `Tests  5999 passed \| 7 skipped (6006)` |
| IMP-05 | `pnpm -C autobyteus-server-ts test:integration:prepare` then `test:integration` | `b109a62ea6` | local, isolated env | server integration (MCP config service, agent-tools MCP, GraphQL) | AC-006 (preserved) | Pass | `IMP-05a-server-integration-prepare.log`, `IMP-05-server-integration.log` | `Tests  419 passed \| 70 skipped (489)` |
| IMP-06 | `pnpm -C autobyteus-web test:nuxt components/tools --run` | `d89135a832` | local | `components/tools/*` incl. `McpServerFormModal` | BEH-003; AC-004, AC-005 | Pass | `IMP-06-web-tools-components.log` | `Tests  16 passed (16)` |
| IMP-07 | `pnpm -C autobyteus-web guard:web-boundary` | `d89135a832` | local | web boundary rules | — | Pass | `IMP-07-web-guard-web-boundary.log` | `[guard:web-boundary] Passed.` |
| IMP-08 | `pnpm -C autobyteus-web guard:localization-boundary` | `d89135a832` | local | localization catalog rules | AC-005 | Pass | `IMP-08-web-guard-localization-boundary.log` | `[guard:localization-boundary] Passed.` |
| IMP-09 | `pnpm -C autobyteus-web audit:localization-literals` | `d89135a832` | local | localization literals | AC-005 | Pass | `IMP-09-web-audit-localization-literals.log` | `Passed with zero unresolved findings.` |
| IMP-10 | Rendered self-check on `pnpm dev` + a dummy header-protected MCP server; driven with browser-tab DOM assertions | `d89135a832` | local dev stack (8000/3000), worktree dev data root (removed after) | form, GraphQL preview/save, file provider, client | BEH-001..004; AC-003 (GraphQL preview), AC-004, AC-005 | Pass | `IMP-10-render-check.md`, `IMP-10-render-form-token-hint-en.png`, `IMP-10-render-edit-json-view-headers.png`, `IMP-10-render-form-token-hint-zh-CN.png`, `IMP-10-dummy-mcp-server.mjs` | `POST auth=expected … GET auth=expected`; `sets both 'token' and an 'Authorization' header; use one of them.`; JSON view shows `"headers": {"Authorization": "Bearer test-dummy"}` |
| IMP-11 | AC-008 scan: grep of evidence and of the branch diff for credential-like strings (`sk-…`, `Bearer …`, `Basic …`, `ghp_…`, `AIza…`) | `d89135a832` | local | evidence + diff | AC-008, REQ-007, QR-001 | Pass | (command and result in this row) | Only `test-dummy`, `test-wrong`, `test-other` and `<token>`; `sk-…` hits are test names such as `task-agent-…` |

The new tests were also each shown to be red without their fix: the persistence test (1 of 3 failed without the `file-provider.ts` change) and the web spec (2 of 9 failed without the `.vue` change). These were run locally and are not separately logged.

- Not run, and why:
  - AC-007 (a selected agent on a real runtime calls a tool on a header-protected server through the AutoByteus server): owned by API/E2E.
  - Server E2E (`pnpm test:e2e`), browser probes, isolated desktop instance: owned by API/E2E.
  - `pnpm -C autobyteus-web test:nuxt` in full, and `test:electron`: only `components/tools` changed in the web package, and Electron is not touched.

## Frontend Rendered-Result Check

- Affected surfaces: Settings → MCP Servers → Add/Edit MCP Server (STREAMABLE_HTTP form; JSON view).
- References: REQ-004, REQ-005, AC-004, AC-005, DEC-003 (one hint line, label kept).
- Design system reviewed: the hint reuses the modal's existing helper-text style (`text-sm text-gray-500`, as on the JSON view description).
- Surface used: `pnpm dev` (README "Local full-stack development"), real backend with the worktree build, Nuxt dev frontend.
- States inspected:
  - Add form, en and zh-CN;
  - preview success;
  - preview rejection (token plus Authorization);
  - save from the JSON view;
  - reload → Edit → JSON view;
  - default desktop width.
- Issues found and corrected: none in the changed UI. (The untranslated "Add MCP Server", "Form View" and "Cancel" are existing strings, outside this ticket's scope.)
- Limitations: narrow widths and the dark theme were not inspected. See IMP-10.

## Downstream Coverage Hints / Suggested Scenarios

- AC-007 (required): a header-protected local MCP server, registered through GraphQL `configureMcpServer` or the UI. Then an agent whose `toolNames` select its tool calls it:
  - on the native runtime at least;
  - on Claude or Codex via `autobyteus_agent_tools` where the environment allows.
  - Cover both credential forms: `headers.Authorization`, and `token` (Bearer).
  - Assert the server saw the header on the tool call itself, not only on registration.
- Restart persistence: save with a token, restart the server (startup `loadAllAndRegister`), and confirm the tools register and are callable without re-entering the token.
- GraphQL `configureMcpServer`, preview and import with both token and Authorization: an error carrying the value-free message, and nothing saved.
- Wrong credential: the preview/connect error is reported (BEH-005); no header or token value appears in server logs.
- `IMP-10-dummy-mcp-server.mjs` is a ready dummy server: `node IMP-10-dummy-mcp-server.mjs <path to autobyteus-ts/node_modules/@modelcontextprotocol/sdk/dist/esm>`. It logs only `auth=expected/other/none`, never values.

## API / E2E / Executable Coverage Investigation And Execution Still Required

- AC-007, end to end through the AutoByteus server with a real runtime, as above.
- Independent confirmation of AC-001..AC-006 at the API layer, reusing IMP-02/04/06 where the code they exercise is unchanged.
- AC-008 scan of the API/E2E evidence.
