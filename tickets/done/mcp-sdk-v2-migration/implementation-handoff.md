# Implementation Handoff — mcp-sdk-v2-migration

- Ticket folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/mcp-sdk-v2-migration/tickets/in-progress/mcp-sdk-v2-migration/`
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/mcp-sdk-v2-migration`, branch `codex/mcp-sdk-v2-migration`, base `origin/personal` @ `dc530fdcb0`
- Implementation commits:
  - `bc8c1d72f3`, `feat(mcp): move the MCP client to @modelcontextprotocol/client 2.3.1`
  - `ae7e907bf2`, `test(mcp): match the v2 redirect wording in the discover assertion`
  - The ticket documents and evidence are committed after these.

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: architecture review was selected (`architectural_risk=High`) and passed (`ARCH-REV-002`). Source review is selected next: Code Reviewer.
- Requirements doc: `requirements-doc.md` (approved basis SR-002)
- Investigation notes: `investigation-notes.md`
- Solution revision record: `solution-revision-record.md`
- Design spec: `design-spec.md` (SR-004)
- Supplemental task artifacts: `probes/` and `probe-output.txt` (evidence only); `follow-ups.md`
- Design review report: `design-review-report.md` (round 2, Pass)
- Architecture review revision record: `architecture-review-revision-record.md` (`ARCH-REV-002`)
- Triggering rework report: N/A (initial implementation)

## Current Implementation Summary

`autobyteus-ts` now uses `@modelcontextprotocol/client` 2.3.1, pinned exactly, as its MCP client.
- The three managed-server adapters import it lazily and set no client options, so the client keeps the SDK defaults: `legacy` negotiation and `same-origin` redirects.
- `callTool` uses the v2 options position.

All test servers and test clients use the v2 packages, as devDependencies in both packages. No AutoByteus file or manifest names `@modelcontextprotocol/sdk`. The v1 package stays in the root lockfile only as the Claude Agent SDK peer (and the optional GenAI peer).

The dead Claude `createMcpServer` path (O-002) is removed. Two docs are updated.

- Implementation cycle: `Initial`
- Implementation revision record: `implementation-revision-record.md`
- Current implementation revision ID: `IR-001`
- Related solution revision IDs: SR-004 (design), SR-002 (requirements)
- Related architecture-review revision IDs: ARCH-REV-002
- Related code-review revision IDs: N/A
- Related API/E2E revision IDs: N/A
- Related delivery revision IDs: N/A
- Triggering finding IDs: N/A

## Routing Classification (Mandatory)

- Task size: `Medium`
- Architecture risk: `High`
- Design classification section / evidence reference: `design-spec.md`, "Task Size And Architectural Risk"
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale for confirmation or change: the implementation matches the predicted footprint.
  - 3 adapter files, 1 dead-code removal, 2 manifests, the root lockfile, 14 test and fixture files, and 2 docs.
  - No new owner, API, route or persistence.
  - The High drivers remain open and belong to validation: the blast radius under every runtime's MCP path, new runtime packages in the packaged app, R-002 and R-003.
- Selected route: `Code Review`
- Lightweight implementation self-review completed for the direct route: `Not Applicable` (High risk → Code Reviewer)
- New design impact or escalation trigger: `None`.
  - Two design expectations were corrected with evidence; neither changes behavior or scope (Important Assumptions, D-1 and D-2).
  - No escalation trigger fired. No real server failed. Lockfile resolution is as designed. No runtime behaved differently in the suites run. Nothing outside the listed files imports the SDK.

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001 | Stdio connect/list/call, env, cwd, exit/hang at start, close: preserved | `stdio-managed-mcp-server.ts`: `Promise.all([import('@modelcontextprotocol/client'), import('@modelcontextprotocol/client/stdio')])`, same transport options | Preserved: IMP-02, IMP-03 (Python via uv and Node fixtures), IMP-10 (`mcp-run-session-cleanup`, scripted AGY) |
| BEH-002 | Headers on every request; 401 fails: preserved | `http-managed-mcp-server.ts`: `const { Client, StreamableHTTPClientTransport } = await import('@modelcontextprotocol/client')`; `requestInit.headers` unchanged | Preserved: IMP-02 (HTTP unit), IMP-03, IMP-10 (`mcp-http-auth-remote-server`) |
| BEH-003 | Same-origin rule preserved; v2 wording | SDK default `redirectPolicy` (not set); comment names it | Preserved: IMP-02, IMP-10. Both e2e assertions (L146 preview, L152 discover) now check `Redirect to <url> not followed` and `(redirectPolicy: 'same-origin')` separately |
| BEH-004 | v2 error wording (DEC-003) | SDK | Observed: `SdkHttpError: Error POSTing to endpoint: Redirect to … not followed; use that URL as the endpoint if it is the intended server (redirectPolicy: 'same-origin')` (IMP-10 first-run note); docs updated |
| BEH-005 | All pages listed (DEC-004) | `BaseManagedMcpServer.listRemoteTools()` → v2 `listTools()` (aggregates pages); code unchanged | New test: paging low-level `Server` (2 pages) → 4 tools, 2 `tools/list` requests (IMP-02) |
| BEH-006 | 6-minute timeout, signal, tool errors, structured content: preserved | `base-managed-mcp-server.ts`: `callTool({ name, arguments }, { timeout: DEFAULT_MCP_TOOL_CALL_TIMEOUT_MS, signal })` | IMP-01: the old shape fails the real abort test (the call resolves after 10 s). After the fix, IMP-02: the abort rejects in under 5 s; a unit assertion checks that `{ timeout, signal }` reaches the SDK; tool error and structured content are covered in IMP-03 |
| BEH-007 | 2025 handshake, one start per connect (`legacy`) | No `versionNegotiation` set | New tests (IMP-02): the stdio start log has exactly 1 line. HTTP: first method `initialize`, no `server/discover`, later requests carry `mcp-protocol-version: 2025-11-25` |
| BEH-008 | Our endpoints serve v2 clients, default and `auto` | Endpoint source unchanged | Both real routes over loopback (IMP-05). In `auto` mode: `server/discover` → 400, then `initialize` → 200; era `legacy`; list and call work. Default-mode cases are migrated and pass. The negotiated version is `2025-03-26` (D-1) |
| BEH-009 | O-002 removed | `claude-sdk-client.ts` (509 → 438 lines); integration case removed | AC-008 greps empty (IMP-07); server typecheck (IMP-04); unit and integration suites pass (IMP-08, IMP-09) |
| BEH-010 | v2 in the packaged app and the image | Manifests only (`prepare-server.mjs` and Dockerfile unchanged) | `verify:runtime-deps` OK (IMP-04). The packaged-app check is left to API/E2E (R-002) |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`

## Key Files Or Areas

- Manifests and lockfile:
  - `autobyteus-ts/package.json`: deps `@modelcontextprotocol/client` 2.3.1; devDeps `@modelcontextprotocol/server` 2.3.1 and `@modelcontextprotocol/node` 2.1.1.
  - `autobyteus-server-ts/package.json`: the SDK dependency is removed; devDeps `client` 2.3.1, `core` 2.3.1, `node` 2.1.1, `server` 2.3.1.
  - `pnpm-lock.yaml`: regenerated by `pnpm install`. `autobyteus-ts/pnpm-lock.yaml` is untouched (FU-003).
- Production:
  - `autobyteus-ts/src/tools/mcp/server/{base,stdio,http}-managed-mcp-server.ts`
  - `autobyteus-server-ts/src/runtime-management/claude/client/claude-sdk-client.ts` (O-002)
- `autobyteus-ts` tests:
  - `tests/fixtures/mcp-stdio-fixture-server.mjs`: v2 packages, `z.object` schemas, `MCP_TEST_SERVER_START_LOG`
  - `tests/unit/tools/mcp/base-managed-mcp-server.test.ts`: new call shape; signal case
  - `tests/unit/tools/mcp/http-managed-mcp-server.test.ts`: v2 server, `registerTool`; the AC-006 handshake case and the AC-005 paging case
  - `tests/unit/tools/mcp/stdio-managed-mcp-server.test.ts`: the AC-006 one-start case and the AC-004 real abort case
- `autobyteus-server-ts` tests:
  - `tests/e2e/helpers/auth-required-mcp-server.ts`: v2 server and Node transport, `registerTool`
  - `tests/integration/mcp-gateway/mcp-gateway-routes.integration.test.ts`: v2 client and inline v2 stdio server; the AC-007 `auto` case
  - `tests/integration/agent-tools/mcp/agent-tools-mcp-routes.integration.test.ts`: v2 client; the AC-007 `auto` case
  - Import changes only:
    - `tests/e2e/runtime/mcp-run-session-cleanup.e2e.test.ts`
    - `tests/e2e/tool-management/mcp-http-auth-remote-server.e2e.test.ts`
    - `tests/e2e/helpers/collaboration-root-harness.ts`
    - `tests/fixtures/agy-failure-cli.mjs`
  - `tests/e2e/tool-management/mcp-http-redirect-and-transport.e2e.test.ts`: imports; L146 and L152 assertions; header wording
  - `tests/unit/agent-tools/team-communication/collaboration-result-contracts.test.ts`: `ToolSchema` from `@modelcontextprotocol/core`
  - `tests/integration/runtime-management/claude/client/claude-sdk-client.integration.test.ts`: the `createMcpServer` case and the unused `zod` import removed
- Docs: `autobyteus-server-ts/docs/modules/mcp_server_management.md` (Redirects; Verifying An MCP SDK Upgrade) and `agent_execution.md` (the Claude peer sentence)

## Important Assumptions

- **D-1: Design expectation corrected; negotiated version against our routes.**
  - The design expected `2025-11-25` for the AC-007 `auto` cases. Against the real routes, every SDK client negotiates `2025-03-26`.
  - The reason: the routes answer `initialize` with the version in the request's `mcp-protocol-version` header. The `initialize` request has no such header, so the routes use their default.
  - The design's probe stand-in echoed `params.protocolVersion`, so it could not show this.
  - IMP-06 runs v1 1.32.1, v2 default and v2 `auto` against the real `/mcp/gateway`. All three get `2025-03-26`, and every later request carries the same headers. So this is unchanged behavior, not a regression.
  - AC-007 requires a legacy-era connection, list and call, and all three hold.
  - The tests assert `2025-03-26`, with a comment explaining why. No endpoint change was made; the endpoints are out of scope.
  - The Solution Designer may want to correct the expected value in the design spec text (Final File Responsibility Mapping, the AC-007 rows).
  - The underlying endpoint behavior is recorded as FU-005.
- **D-2: Design expectation corrected; redirect e2e line 152.**
  - The design expected only line 146 to change; the probe notes said line 152 would still match.
  - The v2 discover message also has the advice text between "not followed" and "(redirectPolicy: …)". The first e2e run failed there (IMP-10 header).
  - Both lines now assert the two parts separately. This is the approved DEC-003 wording.
- The `toHaveBeenCalledWith(..., { timeout })` assertion in the existing base test still matches `{ timeout, signal: undefined }`. Vitest treats properties that are `undefined` as absent, as before. The new case asserts the signal explicitly.

## Known Risks

- R-002 (packaged-app dependency gap) and R-003 (v2 stricter than v1, including RR-001: draft-04 `outputSchema` rejected) are not settled here. They need the packaged before/after parity run with real servers.
- The `autobyteus-ts` dev-only packages `@modelcontextprotocol/server` and `/node` bring `hono` and `@hono/node-server` into dev installs only. `verify:runtime-deps` confirms that `dist` imports only declared runtime dependencies.
- The Node fixture (`autobyteus-ts/tests/fixtures/mcp-stdio-fixture-server.mjs`) now needs `autobyteus-ts`'s devDependencies (`@modelcontextprotocol/server`, `/node`). The server-ts runtime × MCP matrix runs it from the workspace, where they are installed.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Refactor (dependency migration) with Cleanup (O-002)
- Reviewed root-cause classification: No Design Issue Found (migration); Legacy Or Compatibility Pressure (O-002)
- Reviewed refactor decision: `No Refactor Needed` for the client structure; O-002 removal now
- Implementation matched the reviewed assessment: `Yes`. The adapter boundary absorbed the change in 3 files, and `ClientSessionLike` is unchanged apart from its type source.
- If challenged, routed as `Design Impact`: `N/A`
- Evidence / notes: D-1 and D-2 correct expected test values only. They do not challenge the assessment.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`. No wrapper, no option overrides, no v1 devDependency.
- Legacy old-behavior retained in scope: `No`
- Dead code in the touched files and modules removed (Core Principle 7): `Yes`. Removed: `createMcpServer`, `createToolDefinition`, `callSdkFunction`, the `createSdkMcpServer` union and type members, the integration case, and its orphaned `zod` import. `asObject` and `asString` are kept because they are still used.
- Dead code found elsewhere, added to `follow-ups.md`: None. FU-004 is a stale gated test, not dead code; FU-005 is endpoint behavior.
- Shared structures remain tight: `Yes`
- Canonical shared design guidance was reapplied during implementation, and file-level design weaknesses were routed upstream when needed: `Yes`
- Changed source implementation files stayed within proactive size-pressure guardrails: `Yes`. `claude-sdk-client.ts` went from 509 to 438 lines, so it is no longer over the limit. The managed-server files are 25 to 130 lines. No source file changed by more than 220 lines.
- Notes: the AC-001 grep is empty (IMP-07).

## Persisted Data Transition Check (When Applicable)

- Approved decision: `Not Affected`
- Design-spec decision reference: `design-spec.md`, "Persisted Data / State Transition Decision"
- Implementation follows the approved decision without an unapproved migration or version-specific runtime fallback: `Yes`
- Direct-use evidence or discard/rebuild result: N/A
- Migration implementation and focused checks: N/A
- Deviation from the reviewed transition decision: `None`

## Environment Or Dependency Notes

- `pnpm install` at the root (pnpm 10.28.2). `pnpm why` shows `@modelcontextprotocol/sdk` 1.32.1 only as a `peer` under `@anthropic-ai/claude-agent-sdk` and `@google/genai` (IMP-07).
- Fresh worktree: `pnpm -C autobyteus-server-ts prebuild` (Prisma client) is needed before `typecheck`; the first typecheck attempt failed only on missing Prisma exports.
- The `autobyteus-ts` and server-ts test trees are not type-checked by the project gates. A diagnostic full `tsc` reports many errors in other test files (193 in `autobyteus-ts`; about 12k in server-ts, mostly TS4111 index-signature style). The `autobyteus-ts` MCP test files have none. The only errors in the server-ts files this change touched are on lines it did not change: TS4114 `override`, Fastify `CONNECT`, the `Ajv2020` construct, and the stale `openStreamingSession` call (FU-004).
- `docs/modules/agent_execution.md`: the rewritten Claude peer sentence also corrects `@anthropic-ai/sdk@0.128.0` to `0.132.1`, the manifest's exact version.

## Checks Run

Evidence is in `evidence/` in the ticket folder. Long runs keep their full logs in `/tmp`, which are not committed; the committed files hold excerpts.

| Check ID | Command Or Steps | Commit Tested | Environment | Code It Exercises | Behavior / Criteria IDs | Result (`Pass`/`Fail`) | Evidence Files | Look For |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-01 | Imports switched to v2 with `callTool(params, undefined, { timeout, signal })` kept, then `pnpm -C autobyteus-ts exec vitest run tests/unit/tools/mcp/stdio-managed-mcp-server.test.ts` | base `dc530fdcb0` + uncommitted step-1/2 edits | macOS, Node, real stdio fixture | v1 call shape against the v2 client | BEH-006, AC-004 | Fail (expected; proves the shape) | `IMP-01-old-call-shape-loses-signal.log` | `AssertionError: promise resolved "{ content: [ { type: 'text', …(1) } ] }" instead of rejecting`; `Tests  1 failed \| 3 passed (4)` |
| IMP-02 | `pnpm -C autobyteus-ts exec vitest run tests/unit/tools/mcp` | `ae7e907bf2` | macOS, Node | managed servers, fixture, real v2 client/server (stdio and HTTP) | BEH-001…007; AC-002…006 | Pass | `IMP-02-autobyteus-ts-mcp-unit.log` | `Tests  87 passed (87)` |
| IMP-03 | `env -i PATH="$PATH" HOME=<temp> TMPDIR="$TMPDIR" pnpm -C autobyteus-ts exec vitest run tests/integration/tools/mcp` | `ae7e907bf2` | macOS, clean env, Python via uv + Node | MCP client vs Python and Node fixtures, stdio and HTTP | BEH-001, 002, 006; AC-002 | Pass | `IMP-03-core-mcp-integration.log` | `Tests  22 passed \| 1 skipped (23)` (skip = gated `real-user-kind`); `python: used: python via uv` |
| IMP-04 | `pnpm -C autobyteus-ts build && pnpm -C autobyteus-server-ts typecheck` | `ae7e907bf2` | macOS | `autobyteus-ts` `src` + runtime-deps verifier; server `src` | REQ-001, REQ-008 | Pass | `IMP-04-build-and-typecheck.log` | `[verify:runtime-deps] OK`; `combined-exit=0` |
| IMP-05 | `pnpm -C autobyteus-server-ts exec vitest run tests/integration/agent-tools/mcp/agent-tools-mcp-routes.integration.test.ts tests/integration/mcp-gateway/mcp-gateway-routes.integration.test.ts tests/unit/agent-tools/team-communication/collaboration-result-contracts.test.ts --no-watch --reporter=verbose` | `ae7e907bf2` | macOS, loopback | real routes with v2 default and `auto` clients; v2 inline stdio server; `ToolSchema` from core | BEH-008; AC-007 | Pass | `IMP-05-endpoint-integration.log` | `✓ … serves an SDK client in auto negotiation mode, which falls back to the 2025 handshake` (2 lines, gateway and Agent Tools); `Tests  20 passed (20)` |
| IMP-06 | Scratch probe (saved as `IMP-06-route-version-parity-probe.test.ts.txt`) run with vitest from `autobyteus-server-ts/tests/.tmp/`, then deleted | tree of `bc8c1d72f3` (route source = base) | macOS, loopback; v1 from the Claude peer copy in `.pnpm` | real `/mcp/gateway` route with v1 1.32.1, v2 default, v2 `auto` | BEH-008; D-1 | Pass (observation) | `IMP-06-route-version-parity.log`, `IMP-06-route-version-parity-probe.test.ts.txt` | three lines, all `"negotiated":"2025-03-26"`; `auto` headers `["2026-07-28","-","2025-03-26",…]` |
| IMP-07 | AC-001 grep (design command), manifest grep, lockfile grep, `pnpm why @modelcontextprotocol/sdk` in both packages, AC-008 greps | `ae7e907bf2` | macOS | manifests, lockfile, all code | REQ-001, REQ-008; AC-001, AC-008 | Pass | `IMP-07-ac001-ac008-greps.log` | `AC-001 grep exit=1 (1 = no match)`; `@modelcontextprotocol/sdk 1.32.1 peer` (only); `AC-008a exit=1`, `AC-008b exit=1` |
| IMP-08 | `pnpm -C autobyteus-server-ts test:unit` | tree of `bc8c1d72f3` | macOS | whole server unit suite | REQ-008 (Claude suites), regressions | Pass | `IMP-08-server-unit.log` | `Test Files  752 passed \| 4 skipped (756)`; `Tests  6201 passed \| 7 skipped (6208)` |
| IMP-09 | `pnpm -C autobyteus-server-ts test:integration:prepare && pnpm -C autobyteus-server-ts test:integration` | `bc8c1d72f3` | macOS | whole server integration suite (incl. both endpoint files) | AC-007, AC-008, regressions | Pass | `IMP-09-server-integration.log` | `Test Files  78 passed \| 20 skipped (98)`; `Tests  421 passed \| 69 skipped (490)` |
| IMP-10 | Build both packages, then `env -i PATH HOME=<temp> TMPDIR RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<abs>/tests/fixtures/agy-failure-cli.mjs pnpm -C autobyteus-server-ts exec vitest run <mcp-http-auth-remote-server, mcp-http-redirect-and-transport, mcp-run-session-cleanup> --no-watch` | `ae7e907bf2` (server build of `bc8c1d72f3` source; the later commit is test-only) | macOS, clean env, scripted AGY (no model) | built server: GraphQL preview/discover/import, redirect rule, credentials, run-session cleanup, AGY fixture's v2 client | BEH-001…004, 008; AC-003 | Pass | `IMP-10-server-mcp-e2e.log` | `Test Files  3 passed (3)`; `Tests  9 passed (9)`; header records the first run's line-153 failure (D-2) |
| IMP-11 | `env -i PATH HOME=<temp> TMPDIR pnpm -C autobyteus-ts test` | `ae7e907bf2` | macOS, clean env | whole `autobyteus-ts` suite | regressions | Pass | `IMP-11-autobyteus-ts-full.log` | `Test Files  387 passed \| 26 skipped (413)`; `Tests  2361 passed \| 78 skipped (2439)` |

- Not run, and why:
  - The before/after parity run (REQ-009, AC-009, AC-012) belongs to API/E2E. It covers packaged isolated apps, the gated runtime × MCP matrix, published `server-filesystem` 2026.8.31 and 2.0.0, test-owned `uv` server copies, timings, and each server's `outputSchema` dialect (RR-001).
  - Packaged desktop app and Docker image contents (R-002, QR-002) are left to API/E2E.
  - Live Claude suites (`RUN_CLAUDE_E2E`) need a signed-in CLI and paid inference. The remaining live cases in `claude-sdk-client.integration.test.ts` are already stale (FU-004).
  - The gated collaboration e2e that uses `collaboration-root-harness.ts` was not run; only its import changed. The same v2 client pattern is exercised by `agy-failure-cli.mjs` in IMP-10.

## Frontend Rendered-Result Check (When Applicable)

`Not Applicable`. This is a backend library migration. The only visible effect is SDK error wording (DEC-003), shown in existing error areas.

## Downstream Coverage Hints / Suggested Scenarios

- Before/after (base `dc530fdcb0` vs this branch): use "Verifying An MCP SDK Upgrade" in `mcp_server_management.md`, which now lists the new unit cases and the endpoint integration files.
- The packaged app must contain `node_modules/@modelcontextprotocol/client` and `@modelcontextprotocol/core`, plus `jose`, `pkce-challenge`, `eventsource` and `eventsource-parser`. `@modelcontextprotocol/sdk` should appear only as the Claude Agent SDK peer.
- Real servers:
  - Record tool counts. A paginating server now shows more tools (DEC-004).
  - Record the `outputSchema` `$schema` dialect of each server (RR-001).
  - Record error texts, which use the v2 wording (`Error POSTing to endpoint: …`).
- Our endpoints:
  - Through a v2 client, expect a negotiated `2025-03-26`, as on base (D-1, FU-005).
  - External CLIs (Claude, Codex, AGY, Grok) use their own MCP clients, so the parity run should check them as before.
- Cancellation: an agent run stopped during a long external MCP tool call should end that call promptly (the signal now in the v2 options position).

## API / E2E / Executable Coverage Investigation And Execution Still Required

- All of REQ-009 / AC-009 / AC-012 (parity report, same/different table, protocol-era statement per real server) and QR-001/QR-002.
- The R-002 and R-003 escalation triggers in `design-spec.md` still apply during validation.
- REQ-013: a protocol-caused failure returns to the Solution Designer for a design re-entry.
