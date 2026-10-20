# Implementation Handoff — mcp-http-error-status

Ticket folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/mcp-http-error-status/tickets/in-progress/mcp-http-error-status`
Worktree / branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/mcp-http-error-status`, `codex/mcp-http-error-status`
Code commit: `bb1d3cd28c` (on ticket docs `90d5f11a6b`, base `origin/personal` `66d834b0ac`)

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: Small / Low → direct implementation (Solution Designer handoff `handoff-sr-001.md`); architecture review not selected
- Requirements doc: `requirements-doc.md` (SR-001, Approved)
- Investigation notes: `investigation-notes.md`
- Solution revision record: `solution-revision-record.md` (SR-001)
- Design spec (required on every route): `design-spec.md` (SR-001, Ready)
- Supplemental task artifacts: `probes/http-status-message.probe.test.ts`, `probes/probe-output.txt` (evidence only)
- Design review report: `N/A — not applicable`
- Architecture review revision record: `N/A — not applicable`
- Triggering rework report, revision record, or evidence: N/A (initial)

## Current Implementation Summary

`HttpManagedMcpServer.createClientSession()` now catches a failure of `client.connect(transport)`. When it is the SDK's `SdkHttpError` (checked with `SdkHttpError.isInstance`, the class taken from the existing dynamic import), it throws `new Error("HTTP <status>[ <statusText>]: <SDK message>", { cause: sdkError })`; any other error is rethrown unchanged. `BaseManagedMcpServer.connect` cleanup, the resolver and the web are untouched, so the visible texts become e.g. `Failed to preview tools for MCP server: Error: HTTP 401 Unauthorized: Error POSTing to endpoint: unauthorized` (preview) and `Error: HTTP 401 Unauthorized: …` (discover).

- Implementation cycle: `Initial`
- Implementation revision record: `implementation-revision-record.md`
- Current implementation revision ID: `IR-001`
- Related solution revision IDs: `SR-001`
- Related architecture-review revision IDs: `N/A`
- Related code-review revision IDs: `N/A`
- Related API/E2E revision IDs: `N/A`
- Related delivery revision IDs: `N/A`
- Triggering finding IDs: `N/A`

## Routing Classification (Mandatory)

- Task size: `Small`
- Architecture risk: `Low`
- Design classification section / evidence reference: `design-spec.md` → Task Size And Architectural Risk
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale: one production file (23 → 33 lines); one existing unit file extended; one new e2e file. No schema, persistence, security, concurrency, deployment or ownership change. Escalation triggers checked: no consumer inspects the thrown error's type or `code` (search of `autobyteus-server-ts/src`, `autobyteus-server-ts/tests`, `autobyteus-web` components/stores, `autobyteus-ts/src` for `SdkHttpError`/`Error POSTing`/`statusText`: only the new code and tests); every in-scope HTTP failure arrived as `SdkHttpError` (probe IMP-08, units IMP-02).
- Selected route: `Direct API/E2E`
- Lightweight implementation self-review completed for the direct route: `Yes` (below)
- New design impact or escalation trigger: `None`

### Lightweight self-review

- Matches the design's code shape exactly (type-only `import type { Client, SdkHttpError }`, value from the dynamic import, module-local `withHttpStatus`). Lazy load kept: the emitted module has no top-level SDK import (IMP-05).
- Non-`SdkHttpError` errors are rethrown as the same object (refused → `TypeError: fetch failed`, IMP-02/IMP-08).
- Empty `statusText` (HTTP/2) yields `HTTP <status>: …` by the helper's branch; not reachable with Node's HTTP/1.1 test servers, so it is covered by reading only.
- No credentials in the new text: it adds only status and reason phrase (unit asserts `not.toContain('test-dummy')`; e2e scans responses and server output).
- Cleanup unchanged: the rethrow happens inside `createClientSession`, so `BaseManagedMcpServer.connect` still sets `FAILED` and runs cleanup (units assert `FAILED`).

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001 | Preview message gains `HTTP <status> <reason>:` | `http-managed-mcp-server.ts` `createClientSession` → `BaseManagedMcpServer.connect` → `McpToolRegistrar.listRemoteTools` → resolver `previewMcpServerTools` (unchanged) | Done: IMP-07 e2e asserts exact `Failed to preview tools for MCP server: Error: HTTP <status> <reason>: Error POSTing to endpoint: <body>` for 401/403/404/500; IMP-08 probe |
| BEH-002 | Discover/register message gains the status | same owner → `registerServer` → resolver `discoverAndRegisterMcpServerTools` | Done: IMP-07 asserts `{ success: false, message: "Error: HTTP <status> <reason>: …", discoveredTools: [] }` |
| BEH-003 | Tool call that connects reports the status | `BaseManagedMcpServer.callTool` → `connect` → same owner | Done: IMP-02 unit `fails a tool call that has to connect with the status in the message` (AC-006) |
| BEH-004 | Non-HTTP failures unchanged | passthrough branch `: error` | Done: IMP-02 unit refused → `TypeError`, message `fetch failed`; IMP-08 `refused` row unchanged. Stdio untouched (different class); its unit tests pass in IMP-03 |
| BEH-005 | No credential in messages | only status/reason added | Preserved: IMP-02 unit assertions; IMP-07 new e2e response + server-output scan; existing auth/redirect e2e pass |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`

## Key Files Or Areas

- `autobyteus-ts/src/tools/mcp/server/http-managed-mcp-server.ts` (Modify, +10 lines)
- `autobyteus-ts/tests/unit/tools/mcp/http-managed-mcp-server.test.ts` (Modify): new `HTTP error answers` block (401/403/404/500 with exact message + `cause` is `SdkHttpError` with the status + `FAILED`; empty-body 404; refused; tool call that connects); wrong-credential case now asserts the exact `HTTP 401 Unauthorized: …` text; cross-origin case asserts `HTTP 307 Temporary Redirect:` prefix, `Redirect to <url> not followed` and `(redirectPolicy: 'same-origin')`. Small helpers `startStatusServer`, `unusedLocalUrl`, `rejectionOf` (the two existing inline `.then(() => null, caught => caught)` blocks now use `rejectionOf`).
- `autobyteus-server-ts/tests/e2e/tool-management/mcp-http-error-status.e2e.test.ts` (Add): one built server, a plain `node:http` server per status, preview + configure + discover for 401/403/404/500 with exact messages; token absent from responses and server output.

## Important Assumptions

- ASM-001 (no `authProvider`, so a 401 is `SdkHttpError`) still holds: the transport is built with `requestInit` only.

## Known Risks

- None material. A later SDK could change `SdkHttpError`; the unit tests use the real SDK and the exact text, so they would catch it.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: `Behavior Change` (message text)
- Reviewed root-cause classification: `Local Implementation Defect`
- Reviewed refactor decision: `No Refactor Needed`
- Implementation matched the reviewed assessment: `Yes`
- If challenged, routed as `Design Impact`: `N/A`
- Evidence / notes: the only change is inside the SDK-transport owner; no layer above learned SDK types.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`
- Dead code in the touched files and modules removed (Core Principle 7): `Yes` (none found; every line of the touched file is reached by connect)
- Dead code found elsewhere, added to `follow-ups.md`: None
- Shared structures remain tight: `Yes` (no new type; plain `Error` with `cause`)
- Canonical shared design guidance was reapplied during implementation: `Yes`
- Changed source implementation files stayed within size guardrails: `Yes` (33 lines)
- Notes: none.

## Persisted Data Transition Check (When Applicable)

- Approved decision: `Not Affected` (design spec, Persisted Data / State Transition Decision). Nothing stored changes.

## Environment Or Dependency Notes

- No dependency change. The e2e needs current builds: `pnpm -C autobyteus-ts build`, `pnpm -C autobyteus-server-ts prebuild`, `pnpm -C autobyteus-server-ts build` (the worktree's `dist/` folders are built from `bb1d3cd28c` source).
- Building the server created untracked `autobyteus-application-backend-sdk/dist/` and `autobyteus-application-sdk-contracts/dist/` (build outputs, not committed, per TESTING.md).
- Test-ownership note: TESTING-wise and per the team's split, E2E coverage and sign-off belong to API/E2E. I authored the new e2e file because the design spec's file mapping and change sequence (step 3) assign it to this change; API/E2E owns its review, any extension and the pass/fail classification.

## Checks Run

Evidence in `tickets/in-progress/mcp-http-error-status/evidence/`.

| Check ID | Command Or Steps | Commit Tested | Environment | Code It Exercises | Behavior / Criteria IDs | Result | Evidence Files | Look For |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-00 | `pnpm -C autobyteus-ts exec vitest run --root ../tickets/in-progress/mcp-http-error-status/probes --no-watch --silent=false` | `90d5f11a6b` (before fix) | macOS, node v22.23.1, real SDK | preview path via `McpToolRegistrar.listRemoteTools` | BEH-001 (reproduction) | Pass (reproduced) | `IMP-00-probe-before.log` | `SdkHttpError: Error POSTing to endpoint: unauthorized` (no status) |
| IMP-01 | `pnpm -C autobyteus-ts exec vitest run tests/unit/tools/mcp/http-managed-mcp-server.test.ts --no-watch` with the production file reverted to base | `bb1d3cd28c` tests + base source | same | `HttpManagedMcpServer` | AC-001, AC-003, AC-005, AC-006 (failing first) | Fail as expected (8 failed) | `IMP-01-unit-failing-first.log` | `Received: "Error POSTing to endpoint: unauthorized"` |
| IMP-02 | `pnpm -C autobyteus-ts exec vitest run tests/unit/tools/mcp/http-managed-mcp-server.test.ts --no-watch --reporter=verbose` | `bb1d3cd28c` | same | `HttpManagedMcpServer`, `BaseManagedMcpServer` connect/callTool, real SDK | BEH-001…005; AC-003, AC-004, AC-005 (unit part), AC-006 | Pass | `IMP-02-unit-http-managed.log` | `Tests  15 passed (15)` |
| IMP-03 | `pnpm -C autobyteus-ts exec vitest run tests/unit/tools/mcp --no-watch` | `bb1d3cd28c` | same | all `autobyteus-ts` MCP units incl. stdio | BEH-004 (stdio untouched) | Pass | `IMP-03-unit-mcp-folder.log` | `Tests  94 passed (94)` |
| IMP-04 | `env -i PATH="$PATH" HOME=<temp> TMPDIR="$TMPDIR" pnpm -C autobyteus-ts exec vitest run tests/integration/tools/mcp --no-watch` | `bb1d3cd28c` | clean env | MCP client vs. real tiny MCP servers (stdio, HTTP) | AC-005 (no regression) | Pass (opt-in real-user case skipped, gate unset) | `IMP-04-integration-mcp.log` | `Tests  22 passed \| 1 skipped (23)` |
| IMP-05 | `pnpm -C autobyteus-ts build`; inspect emitted module | `bb1d3cd28c` | same | tsc over `autobyteus-ts`; lazy SDK import | design Dependency Rules | Pass | `IMP-05-build-lazy-load.log` | `occurrences of modelcontextprotocol (only the dynamic import): 1` |
| IMP-06 | `pnpm -C autobyteus-server-ts typecheck` | `bb1d3cd28c` | same | server `src` | — | Pass | `IMP-06-server-typecheck.log` | `exit 0` |
| IMP-07 | builds as in Environment notes, then `env -i PATH="$PATH" HOME=<temp> TMPDIR="$TMPDIR" pnpm -C autobyteus-server-ts exec vitest run tests/e2e/tool-management/mcp-http-error-status.e2e.test.ts tests/e2e/tool-management/mcp-http-auth-remote-server.e2e.test.ts tests/e2e/tool-management/mcp-http-redirect-and-transport.e2e.test.ts --no-watch` | `bb1d3cd28c` (dist built from it) | clean env, built server | GraphQL preview/configure/discover through the built server | AC-001, AC-002, AC-005 | Pass | `IMP-07-e2e-mcp-http.log` | `Test Files  3 passed (3)`, `Tests  5 passed (5)` |
| IMP-08 | probe command as IMP-00 | `bb1d3cd28c` | same | preview path | BEH-001, BEH-004 | Pass | `IMP-08-probe-after.log` | `Error: HTTP 401 Unauthorized: Error POSTing to endpoint: unauthorized`; `refused` row still `TypeError: fetch failed` |

- Not run, and why: full `autobyteus-ts` test suite and server `test:unit`/`test:integration` (the change is one MCP client file; its consumers are covered by IMP-03/04/07; left to API/E2E's rerun-by-impact plan, which marks everything Rerun when `autobyteus-ts` changes). Gated runtime e2e that make agent tool calls (`mcp-http-auth-agent-tool-call`, `mcp-run-session-cleanup`; need `RUN_*` gates) not run; AC-006 is covered at unit level as the AC states. HTTP/2 empty-reason branch: by reading only.

## Frontend Rendered-Result Check (When Applicable)

Not Applicable — the web shows the server message verbatim; no frontend code changed (requirements: UI applicable `No`).

## Downstream Coverage Hints / Suggested Scenarios

- AC-001/AC-002 are covered by the new e2e at exact-text level; consider whether an empty-body 404 through GraphQL (AC-003 is unit-level now) adds value.
- AC-006 through a real agent run: the gated `mcp-http-auth-agent-tool-call` e2e could be extended with a revoked-token case if API/E2E judges it worth the gate.
- AC-004 stdio failure: no stdio code changed; existing stdio unit tests pass (IMP-03).

## API / E2E / Executable Coverage Investigation And Execution Still Required

- API/E2E coverage investigation, review of the new e2e file, rerun-by-impact plan and the execution report with pass/fail classification for AC-001…AC-006.
