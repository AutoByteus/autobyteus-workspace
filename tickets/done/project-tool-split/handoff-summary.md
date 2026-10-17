# Handoff Summary — project-tool-split

## What Shipped

- Two agent tools with one meaning each:
  - `create_project` `{name, description?, workspaces?}` creates a Project. It rejects `project_id` with `PROJECT_TOOL_ARGUMENT_INVALID`.
  - `update_project` `{project_id, name?, description?, workspaces?}` patches a known Project. It needs at least one change, and a supplied `workspaces` list replaces all links.
- Results and error codes are the same as the old tool's.
- Neither tool is added automatically. Native (AutoByteus) and Agent Tools MCP (Codex, Claude) exposure is the same, and both names are protected first-party names.
- `create_or_update_project` is kept unchanged (name, schema, description and behavior) and is deprecated. Its removal is FU-2, timed by the user (DEC-006).
- Docs: the server `docs/modules/projects.md` (`#project-and-task-agent-tools`), `agent_tools_mcp_server.md` and the web `docs/projects.md`. User-facing notes are in `release-notes.md`.

## Classification And Route

- `task_size`: Medium. `architectural_risk`: High. Route: Reviewed.
- Gates passed:
  - SR-001/SR-002
  - ARCH-REV-001 Pass
  - IR-001
  - CRR-001 source review Pass (9.5/10, no findings)
  - API-REV-001 Pass (95%)
  - CRR-002 test-code review Pass (no findings)
  - DR-001 delivery

## Commits On The Ticket Branch

- `285acae39a` feat: the split (code, tests, docs)
- `79c5d2c5ef` ticket package checkpoint
- Baseline test fixes under TESTING.md Rule 9:
  - `0205b9ed79` task-closure
  - `50f228811f` PMU-008
  - `dec87a3915` PMU-021
- `1c7eb70151`, `7af116e8de` TESTING.md (at the user's direction)
- `7458738938` delivery checkpoint of API/E2E and review artifacts
- `1e8d2b601d` merge of `origin/personal` @ `e579e82b7f`

## Integration And Post-Integration Check (DR-001)

- Base: `8a970f214c` → `e579e82b7f` (14 commits: web Team-status work, plus an additive `HOLD_TURN` mode in the AGY failure fixture). Merged with no conflicts. The only file both sides changed is `projects.md`, where they touch different sections.
- Checks on `1e8d2b601d` (logs in `evidence/delivery/dr-001/`):
  - `pnpm install --frozen-lockfile`: Pass
  - server build: Pass
  - server typecheck: Pass
  - server unit, clean env: 709 files and 5745 tests pass, 7 gated skips
  - `tests/e2e/projects`, clean env, scripted AGY: 16 of 17 files pass, 81 tests pass. This includes every file that covers this change (boundaries, node-locality, change-feed and the Task journeys).
- The 1 failing file, `task-copy-idle-lifetime.e2e.test.ts`:
  - It uses no Project tool, and this ticket does not change it.
  - It failed at host load averages of 58–138 on 10 cores. The full run's team and org `terminate` calls failed with `fetch failed`.
  - Run alone with cause diagnostics (`diag-task-copy-idle-lifetime-alone-1.log`), it failed differently:
    - the AGY `--help` probe timed out at `SHORT_PROBE_TIMEOUT_MS` = 3 s (`AGY_MODEL_DISCOVERY_TIMEOUT`);
    - a manager tool-result wait timed out;
    - an org shutdown was measured at 57.9 s against a 59 s floor.
  - Cause: CPU saturation of the shared host delays process start and the client-observed timings this test asserts.
  - API/E2E saw the same `AGY_MODEL_DISCOVERY_TIMEOUT` once under load. The file passed in both of API/E2E's branch runs.
  - At the user's direction, delivery did not investigate further. The user said another ticket is fixing the E2E test errors.

## Verification

- Judged from the evidence. Critical AC-001 to AC-006 are directly proven. Delivery opened these evidence files:
  - `app-new/journey/APP-NEW.json`, `APP-OLD.json`, `APP-MIX.json`, `REAL-NONE.json`
  - `app-release/journey/REL-MIX.json`
  - `ac005-probe-release-v1.5.5-beta.2.txt`
- They show: the exposure for each tool list; create and update results; `PROJECT_NAME_REQUIRED`, `PROJECT_PATCH_REQUIRED` and `PROJECT_TOOL_ARGUMENT_INVALID`; the old tool's schema and description unchanged; v1.5.5-beta.2 skipping the new names without an error; and Haiku 5.5 refusing when it has no Project tool.
- Confidence 95%, with no category below 90%.
- User check: the user decided to finalize on the evidence ("if this ticket is done, we could finalize", 2026-10-17). No separate in-app check.

## Release Decision

- No release. The user asked to finalize and did not ask for a release. RELEASE.md makes "no release" the default. The change ships with the next beta, as the Task's direction expects. A release is available on request.

## Residual Risks

- No AutoByteus-native agent was run in the app. Native registration is proven in the packaged server, and native/MCP parity by unit tests.
- The Codex runtime was not exercised live (no quota). Its MCP exposure is covered by unit parity and the same server path.
- PB-001 (agent-status-websocket cadence) is a known product defect, owned by `/project_task_manager`. Its two integration cases fail until it is fixed.

## Follow-Ups (Owned Elsewhere)

- FU-1: the Project Task Manager package lists the new names after the release (the PM creates the Task).
- FU-2: remove `create_or_update_project`, timed by the user (DEC-006). When it runs, also move `autobyteus-web/tests/e2e/team-status-live-probe.mjs` (added by the base) off the old name. That probe also lists the already-removed `create_or_update_task`.
- `task-copy-idle-lifetime` load sensitivity: the user says another ticket is handling the E2E test errors.
