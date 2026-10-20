# Docs Sync Report

## Scope

- Ticket: `mcp-test-launcher-and-test-residue` (Project Task `autobyteus-199`, part of `autobyteus-195`); `task_size=Small`, `architectural_risk=Low`, direct low-risk route
- Trigger: API/E2E `Pass` (API-REV-001, 96%) on the direct route, 2026-10-20
- Bootstrap base reference: `origin/personal` @ `dc530fdcb0` (later rebased by implementation onto `aac5da3112`)
- Integrated base reference used for docs sync: `origin/personal` @ `aac5da3112` (fetched 2026-10-20; ticket branch already contains it, 0 commits behind)
- Post-integration verification reference: no new base commits; the validated commit `7c9cadba2f` (code `9a1f560454`) is the integrated state. See the release/deployment report, Initial Delivery Integration Refresh

## Why Docs Were Updated

- Summary: no long-lived doc needed a change. The change is test-only: the MCP test launcher's Python command and skip reason, and where 12 test files write their temporary files.
- Why this should live in long-lived project docs: the one piece of durable knowledge (the uv location variables are on the launch command, not in the stdio config `env`) lives in the launcher's header comment, `autobyteus-ts/tests/integration/tools/mcp/mcp-test-server-launcher.ts`, which the implementation updated. That header is the canonical description of the launcher.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `TESTING.md` | "Core library MCP integration" row, clean-environment rule, server e2e build rule | `No change` | Commands and rules unchanged (design spec: "TESTING.md: no layer, command or rule changes"); the validation used them as written |
| `autobyteus-server-ts/docs/modules/mcp_server_management.md` (SDK-upgrade rerun list) | Describes the MCP fixture ("Python via `uv run`") and the skip behavior | `No change` | Still accurate: Python still starts via `uv run` (now behind `/usr/bin/env`), and a preparation failure still skips with its reason. The doc does not describe how location variables are passed |
| `autobyteus-server-ts/docs/modules/workspaces.md` | Mentions `workspaces.json` under the app data directory | `No change` | Product behavior unchanged; only five e2e tests now pass a temporary app data directory |
| `autobyteus-ts/tests/integration/tools/mcp/mcp-test-server-launcher.ts` header | Canonical launcher description | `Updated` by implementation (IR-001) | States the `/usr/bin/env UV_PROJECT_ENVIRONMENT=… UV_CACHE_DIR=… PYTHONDONTWRITEBYTECODE=1 uv run …` command and why |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| None by delivery | — | — | — |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| MCP test launcher file locations | The uv venv, uv cache and bytecode setting are fixed by the launch command, so a regression in the product's env delivery cannot make uv write into the repository | `design-spec.md` D-1 | Launcher header (already in code) |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| Location variables in the Python stdio config `env` | `NAME=value` arguments to `/usr/bin/env` | Launcher header |
| `uvError` fixed two-line cut | Whole uv error block up to `help:` | Launcher source (`uvError` doc comment) |

## No-Impact Decision

- Docs impact: `No impact`
- Rationale: test-only change; product behavior, test commands and documented rules are unchanged. The reviewed docs remain accurate, and the launcher's own header (updated in the change) carries the new launch shape.

## Delivery Continuation

- Result: `Pass`
- Next delivery action: handoff summary, verification record, archive, finalization (no release)
- Notes: no new follow-ups from delivery. FU-001 and FU-002 are in `follow-ups.md`.
