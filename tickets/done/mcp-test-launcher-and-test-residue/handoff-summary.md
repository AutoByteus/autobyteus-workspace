# Handoff Summary — mcp-test-launcher-and-test-residue

## Ticket

- Package: `mcp-test-launcher-and-test-residue`; Project Task `autobyteus-199` (part of `autobyteus-195`), extended with FU-003 of `autobyteus-211`
- Classification: `task_size=Small`, `architectural_risk=Low`; route: direct low-risk (architecture, source and test-code review `N/A — not applicable`)
- Revisions: SR-002, IR-002, API-REV-001 (Pass, 96%), DR-001
- Archived ticket folder: `tickets/done/mcp-test-launcher-and-test-residue/` on `personal`

## What Changed (test code only)

- MCP test launcher (`autobyteus-ts/tests/integration/tools/mcp/mcp-test-server-launcher.ts`):
  - the Python server starts as `/usr/bin/env UV_PROJECT_ENVIRONMENT=… UV_CACHE_DIR=… PYTHONDONTWRITEBYTECODE=1 uv run …`; the stdio config `env` carries only test values, so uv's locations no longer depend on the product's env delivery;
  - the preparation-failure skip reason carries uv's whole error block on one line.
- Five `autobyteus-ts` test files and the agent-runtime test write into OS temp dirs and remove them in teardown (no more `mcp-config-*`, `tmp-*-file-*`, `autobyteus-ts/memory/`).
- Five server e2e files use a temporary app data directory (no more `autobyteus-server-ts/workspaces.json`).
- `team-task-event-current-contract.e2e.test.ts`: both rejection payloads carry a valid `source`, so each `toThrow()` fails only for the field it names.
- No product source changed; no assertion removed (per-file declaration counts unchanged).

## Integration

- `origin/personal` fetched 2026-10-20: still `aac5da3112`, which the ticket branch already contains (0 commits behind). Method: `Already current`.
- No rerun needed: the integrated state is the validated commit `7c9cadba2f` (code `9a1f560454`), on which API-01…API-09 ran.

## Verification

- Judged from the evidence; no user check needed. Opened the evidence files and confirmed the lines the report names:
  - AC-001/003: MCP folder `Tests 22 passed | 1 skipped (23)`; env/cwd and pid cases pass for Python and Node; fixture holds only `pyproject.toml server.py uv.lock`.
  - AC-002: probe shows `command=/usr/bin/env`, env of only the two test values, Python `prefix` in the temp venv with a `PATH,HOME`-only child env; removing `env: config.env` fails the env/cwd and pid cases while the fixture stays clean; the base launcher with the same mutation creates `.venv` (negative control).
  - AC-004: offline reason ends at the `.whl` URL with no `help:`; without uv `uv unavailable (not on PATH)`.
  - AC-005/006: after core, server unit and e2e on a built server, the `git status --ignored` diff is empty except a removed `tests/.tmp/…db-journal` (DEC-005); touched prefixes leave 0 temp entries; core 2356, unit 6201, e2e 93 files passed, 0 failed; touched files 72 + 23 passed, counts unchanged.
  - AC-007: file passes; each mutation fails at its own `toThrow()` (lines 91 and 108).

## Release

- `No release`: the Task says "merged; no release", which is also the `RELEASE.md` default. The change has no effect on users.

## Follow-ups

- No new follow-ups from delivery. `follow-ups.md` holds FU-001 (`project-task-index-status` unit failure on base, cause not investigated; passed 8/8 in API-08) and FU-002 (untouched tests leave folders in the OS temp dir). The Solution Designer sends them.
