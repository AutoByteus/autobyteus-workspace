# Handoff Summary — mcp-http-error-status

## Ticket

- Package: `mcp-http-error-status`, the Project Task "Show the HTTP status in remote MCP connection errors" (FU-002 of `autobyteus-182`)
- Classification: `task_size=Small`, `architectural_risk=Low`. Route: direct low-risk. Architecture, source and test-code review: `Not Applicable`.
- Revisions: SR-001, IR-001, API-REV-001 (Pass, 95.4%), DR-001
- Archived ticket folder: `tickets/done/mcp-http-error-status/` on `personal`

## What Changed

- Product commit `bb1d3cd28c`: `autobyteus-ts/src/tools/mcp/server/http-managed-mcp-server.ts`. When `client.connect` fails with the SDK's `SdkHttpError`, it is rethrown with the status first and the SDK text kept: `HTTP 401 Unauthorized: Error POSTing to endpoint: unauthorized`. The original error is kept as `cause`. Any other failure is rethrown unchanged.
- What users see:
  - Preview: `Failed to preview tools for MCP server: Error: HTTP 401 Unauthorized: …`.
  - Discover: `{ success: false, message: "Error: HTTP 401 Unauthorized: …" }`.
  - Native agent tool call: `Error executing tool '<name>' (…): Error: HTTP 401 Unauthorized: …`.
  - A cross-origin redirect now also starts with `HTTP 307 Temporary Redirect: `.
- Unchanged:
  - Refused connections (`TypeError: fetch failed`), stdio failures (`SdkError: Connection closed`) and HTTP errors after connect.
  - No token or header value appears in any message.
- Tests (`1b167771a7`):
  - unit cases for 401/403/404/500, an empty-body 404, no-answer failures and a tool call;
  - built-server e2e `mcp-http-error-status.e2e.test.ts`;
  - a 307 assertion in the redirect e2e;
  - a native revoked-token agent run (gated `RUN_LMSTUDIO_E2E`).
- Docs: `autobyteus-server-ts/docs/modules/mcp_server_management.md` (see `docs-sync-report.md`).

## Integration

- `origin/personal` advanced from `66d834b0ac` to `7f41314aa8` (runtime-lifecycle-review and the `1.5.8-beta.2` version bump). No base commit touches MCP code or tests.
- Merged into the ticket branch (`8a804a1ee1`), with no conflicts.
- Rerun on the merged state (`evidence/DEL-01-integrated-rerun.log`), all passed:
  - builds of `autobyteus-ts` and `autobyteus-server-ts`;
  - `autobyteus-ts` MCP unit and integration: 116 passed, 1 skipped;
  - the three MCP HTTP e2e files on the built server: 8/8.

## Verification

- Judged from the evidence: sufficient. No user check is needed.
- Each acceptance criterion was checked in its evidence file:
  - AC-001/002: exact `toBe` texts per status in `mcp-http-error-status.e2e.test.ts`; passing lines in `API-08` and `DEL-01`.
  - AC-003: an empty-body 404 in the unit test (`IMP-02`) and in the e2e.
  - AC-004: refused and stdio texts with no status.
  - AC-005: auth and redirect suites 8/8, with the 307 assertion.
  - AC-006: `native-revoked.json` shows `statusInToolResult: true` and the wire text `Error: HTTP 401 Unauthorized: Error POSTing to endpoint: unauthorized`.
- Full regression on the candidate: `autobyteus-ts` 2368, server unit 6201 and server integration 421, all passed.
- Confidence: 95.4%, no category below 95%.

## Release

- `No release`. None was requested, and `RELEASE.md`'s default is to finalize only. The change ships with the next release; a beta or stable release can be cut on request.

## Residual Risks And Follow-ups

- FU-001 (not urgent): agents on AGY, Codex and Claude see JSON-RPC `Internal error` instead of any configured-MCP tool failure text, because of the Agent Tools MCP endpoint. This predates the change and is out of scope. The Solution Designer sends it.
- The HTTP/2 empty-reason-phrase branch is covered by reading only.
- Codex and Claude live runs were not run; they use the same Agent Tools path as AGY.
