# Current docs status — DR-003 (2026-10-01)

Latest-base integration and focused validation completed; details in `latest-base-integration-result-20261001.md`. Expanded docs sync remains held for solution/readiness recovery, not missing source provenance. Original runtime doc and AGY TESTING entries are retained. No long-lived docs changed in this integration-only step. Frozen migration source/output fields are preserved; current API projections omit obsolete skill mode. Full combined docs accuracy must follow recovered design and final validation.

## Historical delivery doc notes

# DR-002 continuation status — 2026-10-01

Docs sync **held**: remote fetch succeeded, but source-scope reconciliation blocks safe integration. No runtime/testing documentation was changed this round. The two AGY command rows remain traceable to DR-001; the additional built-server testing note and root package-script change lack a recorded owning revision. See `release-deployment-report.md`. The following is historical DR-001 evidence only, not a claim that the current branch reflects latest personal.

# Docs Sync Report

## Scope

- Ticket: `agy-mcp-tool-call-presentation`
- Trigger: API/E2E pass (API-REV-001) on the direct route (`task_size=Small`, `architectural_risk=Low`; architecture review, code review and test-code review: `N/A — not applicable`).
- Bootstrap base reference: `origin/personal@5c6fb95ea`
- Integrated base reference used for docs sync: `origin/personal@cb01dea23`, merged into the ticket branch as `82996343c`
- Post-integration verification reference: `handoff-summary.md`, section "Post-integration checks"

## Why Docs Were Updated

- Summary: The runtime behavior was already documented by the implementation commit. Delivery added the missing instructions for running the opt-in Antigravity (AGY) E2E tests.
- Why this should live in long-lived project docs: The AGY E2E files are skipped by `pnpm test:e2e` unless an environment variable is set. Until now those variables were named only in the test file headers.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/antigravity_cli_runtime.md` | Canonical AGY runtime doc | No change (by delivery) | The implementation commit `34b310118` added the MCP presentation paragraph. It merged cleanly with the base's new Background Tasks text and matches the integrated code. |
| `TESTING.md` | API/E2E reported that the AGY opt-in variables are undocumented | Updated | Two rows added to the command table. |
| Other `*.md` outside `tickets/` | Searched for `call_mcp_tool` | No change | The only mentions are in the AGY runtime doc. |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `TESTING.md` | Addition | Rows "Antigravity (AGY) runtime E2E, fake CLI" and "Antigravity (AGY) runtime live E2E" with their variables and command | The new `agy-mcp-tool-call-transport.e2e.test.ts` and the other AGY E2E files are opt-in. |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| AGY MCP call presentation | Naming rule (bare name for AutoByteus Agent Tools, `mcp__<server>__<tool>` otherwise), arguments, structured output, fallback, old runs unchanged | `design-spec.md`, `implementation-handoff.md` | `autobyteus-server-ts/docs/modules/antigravity_cli_runtime.md` (done in `34b310118`) |
| Running AGY E2E | Opt-in variables and the fake CLI path | `api-e2e-execution-coverage-report.md` | `TESTING.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| None | N/A | N/A |

## Delivery Continuation

- Result: `Pass`
- Next delivery action: User verification hold.
- Notes: Not documented, because it was read in the code and not executed: after the merge, an MCP call still open when an AGY turn ends is reported to the base's new Background Tasks monitor under its presented tool name (kind `other`), not `call_mcp_tool`.
