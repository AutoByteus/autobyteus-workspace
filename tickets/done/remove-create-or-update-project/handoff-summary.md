# Handoff Summary — remove-create-or-update-project

## What Ships

- The deprecated `create_or_update_project` agent tool is removed: its contract entry, description, schema and dispatch rule, and the native `CreateOrUpdateProjectTool`. `create_project` and `update_project` are unchanged.
- An agent definition that still lists the old name launches normally. The name is skipped: the AutoByteus resolver logs a warning, and Codex and Claude filter it out. The agent keeps every other listed tool.
- A third-party MCP tool named `create_or_update_project` is no longer shadowed by a first-party tool.
- Docs: the server `projects.md` and `agent_tools_mcp_server.md`, and the web `projects.md`. The user-facing note is in `release-notes.md`.

## Classification And Route

- `task_size`: Small. `architectural_risk`: High. Route: Reviewed.
- Gates passed:
  - SR-001/SR-002
  - ARCH-REV-001 Pass
  - IR-001, then CRR-001 Fail (CR-001)
  - IR-002, then CRR-002 Pass (9.5/10)
  - API-REV-001 Pass (96%)
  - CRR-003 Pass, no findings

## Commits On The Ticket Branch

- `6ba0389741` feat!: the removal (code, tests, docs)
- `fec0ad5449` ticket package
- `4807095aed` CR-001 fix
- Baseline fixes under TESTING.md Rule 9:
  - `c740d16b3c` `task-copy-idle-lifetime`: an async, batched process scan, so the server under test is not blocked
  - `d1796f010d` `task-closure-tree-probe`: expects Task keys
- `20f554c6f2` delivery checkpoint of the API/E2E and review artifacts
- `8b3a202d27` merge of `origin/personal` @ `f3124db10f`

## Integration And Post-Integration Check (DR-001)

- Base: `2f211340ee` → `f3124db10f` (16 commits). Merged with no conflicts and no file overlap with this change. The base adds no reference to the old name.
- Targeted checks on `8b3a202d27` (logs in `evidence/delivery/dr-001/`):
  - `pnpm install --frozen-lockfile`: Pass
  - server build and typecheck: Pass. The base refactored 79 server files, which is why build and typecheck were rerun.
  - unit tests in this ticket's scope, clean env (`tests/unit/agent-tools/project-tasks`, project-tool runtime parity, AutoByteus tool resolver): 5 files, 135 tests pass
  - `tests/e2e/projects/project-task-boundaries.e2e.test.ts`, clean env: 13/13
  - AC-004 grep after the merge: only the allowed references
- Delivery ran only checks proportionate to the merged base. Everything else is proven by the API/E2E evidence.

## Verification

- Judged from the evidence. All critical ACs are directly proven, at 96% confidence with no category below 90%. Delivery opened:
  - `app/picker-available-tool-names.json`: no old tool; both new tools present (AC-001);
  - `app/journey/APP-OLD-MIXED.json` (AC-002): it launches, and the exposed tools match its list without the old name. A call to the old name is refused with `Unknown MCP tool`, and `create_project`/`update_project` work;
  - `APP-OLD-ALONE.json` and `NATIVE-LAUNCH.json`: they launch successfully;
  - `app/instance-log-excerpt.txt`: the AutoByteus resolver's "not found in registry. Skipping." line.
- User check: the user chose a beta on 2026-10-18 and checks by upgrading to it, as for `v1.5.6-beta.1`.

## Residual Risks

- The Codex runtime was not run live. It is covered by the unit runtime-parity skip test and the same MCP server path.

## Follow-Ups

- The Project Task Manager package PR (new names only) is being done in parallel under the PM.
