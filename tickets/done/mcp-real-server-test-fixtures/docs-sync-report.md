# Docs Sync Report — mcp-real-server-test-fixtures

## Scope

- Ticket: `mcp-real-server-test-fixtures` (Project Task `autobyteus-189`, part of `autobyteus-195`); `task_size=Small`, `architectural_risk=Low`, direct low-risk route; test code only
- Trigger: API/E2E Pass `API-REV-001`, commit `629b8a63f7`
- Bootstrap and integrated base: `origin/personal` @ `df73618d78` (unchanged at delivery; branch already current)
- Post-integration verification: `evidence/DR-01-delivery-testing-md-command.log`

## Why Docs Were Updated

- The implementation already added the `TESTING.md` row "Core library MCP integration" in its own `docs(testing)` commit (`c4b4a4dca4`, AC-008).
- In the previous ticket, delivery added "Verifying An MCP SDK Upgrade" to the MCP module doc. That list left out the core integration tests, because they could not run then. They now run in any checkout, so they belong in that list.

## Long-Lived Docs Reviewed

| Doc Path | Why | Result | Notes |
| --- | --- | --- | --- |
| `TESTING.md` | The test-layer table | No change (by delivery) | The implementation's row was checked against the command, run in DR-01: accurate |
| `autobyteus-server-ts/docs/modules/mcp_server_management.md` | "Verifying An MCP SDK Upgrade" | Updated | See below |
| `autobyteus-ts/docs/*`, `autobyteus-ts/README.md` | References to `autobyteus_mcps` or `cert.pem` | No change | None found |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/mcp_server_management.md` | Added an item to the upgrade-check list | `autobyteus-ts/tests/integration/tools/mcp` (ungated; the `TESTING.md` row), with what it covers, the Python-via-`uv`/Node fallback and skip behavior, and the opt-in `real-user-kind-mcp-server.test.ts` gate | Future MCP SDK upgrades should run the core real-server tests first |

## Removed / Replaced Components Recorded

| Old | Replaced By | Where Documented |
| --- | --- | --- |
| Integration tests pointing at `<repo>/autobyteus_mcps` toy servers | Repository-owned fixtures `autobyteus-ts/tests/fixtures/mcp-test-server/` (Python, `uv`) and `mcp-stdio-fixture-server.mjs` (Node) | `TESTING.md` row; MCP module doc; test file headers |
| `autobyteus-ts/tests/fixtures/certificates/cert.pem` (unused) | Nothing | — |

## Delivery Continuation

- Result: `Pass`
