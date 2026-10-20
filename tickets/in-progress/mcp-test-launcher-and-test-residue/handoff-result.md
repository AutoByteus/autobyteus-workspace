# Handoff Result: Architecture Design Complete

- Package: `mcp-test-launcher-and-test-residue` (Project Task `autobyteus-199`, part of `autobyteus-195`), `SR-001`
- Result: **Architecture Design Complete**; `task_size=Small`, `architectural_risk=Low`
- Route: direct implementation → `/software_engineering_team/implementation_engineer` (handoff rule for Small/Medium and Low). Architecture review not selected.
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`)
- Approval: requirements `Approved` by the Solution Designer within the Task's direction; the user was informed in the Solution Designer conversation on 2026-10-20 (see requirements DEC-001…DEC-006)

- Applied rule (2026-10-20): `get_handoff_rules` → Small/Medium + Low → `/software_engineering_team/implementation_engineer`; ticket documents committed as `eb2e63a188`

## Workspace

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/mcp-test-launcher-and-test-residue`
- Branch: `codex/mcp-test-launcher-and-test-residue`
- Base: `origin/personal` @ `dc530fdcb0`; finalization target `origin/personal`; no release (Task)
- Ticket folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/mcp-test-launcher-and-test-residue/tickets/in-progress/mcp-test-launcher-and-test-residue/`
- Install and `autobyteus-server-ts prebuild` are done in the worktree. The server is **not** built yet; build it before `pnpm test:e2e`. The base probe runs left residue in the worktree (`autobyteus-ts/{mcp-config-*,tmp-*-file-*,memory/}`, `autobyteus-server-ts/workspaces.json`, `autobyteus-server-ts/dist/`). Remove it before the AC-005 before/after check.

## Original Request (summary)

- O-1: the uv test server's location variables must not depend on the product's stdio env delivery (`/usr/bin/env NAME=value uv run …`).
- O-2: the preparation-failure skip reason is cut where `uv` wraps its line.
- O-4: `autobyteus-ts` tests leave `mcp-config-*` / `tmp-edit-file-*` folders in the package root.
- 193 O-2: a server e2e test writes `autobyteus-server-ts/workspaces.json`.
- Done when: the above are fixed and `git status --ignored` is clean after a unit and an e2e run; merged; no release.

## What the investigation found

- All four confirmed by probes (investigation notes P-1…P-5).
- O-4 is wider than stated: also `tmp-read-file-*`, `tmp-write-file-*` (integration file tools) and `autobyteus-ts/memory/agents/…` (agent-runtime "Agent facade" case).
- `workspaces.json` comes from five e2e files.
- Server unit leaves nothing.
- All of these are in scope (DEC-001).

## Design (see design-spec.md D-1…D-5)

- D-1: the launcher's Python command is `/usr/bin/env UV_PROJECT_ENVIRONMENT=… UV_CACHE_DIR=… PYTHONDONTWRITEBYTECODE=1 <uv> run …`, and its config `env` is `{}`.
- D-2: `uvError` returns the whole error block up to `help:`.
- D-3: five core test files use a file-local `realpath(mkdtemp(os.tmpdir()/<same prefix>))` and remove the dirs in `afterEach`.
- D-4: the agent-runtime case at L567 uses a temp `memoryDir` from the existing `memoryDirs` list.
- D-5: five server e2e files set `appConfigProvider.config.setCustomAppDataDir(<temp>)` in `beforeAll` and remove the dir in `afterAll`, the same pattern as `workspace-content-rest.e2e.test.ts`.
- 11 test files are modified. No product `src` change.

## Constraints and preserved behavior

- Test-only. Every test keeps its assertions.
- The MCP env/cwd and pid-file cases still prove product env delivery (REQ-002).
- A preparation failure is a skip with its reason, never a pass.

## Open risks

- RSK-001 / ASM-001: the e2e residue probe ran without a server build, so the build-dependent e2e cases were not probed. AC-005, run with a build, covers them. A writer there that needs more than the same local pattern is an escalation trigger (design spec).
- FU-001 (follow-up, not this ticket): a server unit failure on the base in `project-task-index-status.test.ts`.
- On the base without a build, e2e had 28 failures, mostly `TEST_SERVER_BUILD_REQUIRED` / missing `dist/app.js`.

## Expected output

The implementation and its handoff per the team route. Validation evidence for AC-001…AC-006, including the AC-005 before/after `git status --ignored` diff around `pnpm -C autobyteus-ts test`, `pnpm -C autobyteus-server-ts test:unit` and `pnpm test:e2e` (clean env, server built).

## Documents

- `requirements-doc.md`
- `investigation-notes.md`
- `design-spec.md`
- `solution-revision-record.md`
- `follow-ups.md`
- this file

## SR-002 addition (2026-10-20)

- Trigger: the Project Task Manager added FU-003 of `autobyteus-211` to the Task.
- New: REQ-007 / AC-007 / D-6. Implementation of SR-001 continues unchanged.
- **Rebase first.** Rebase the branch onto current `origin/personal` (`aac5da3112`, which contains `autobyteus-211`'s merge `e9a76b84ab`) before touching `autobyteus-server-ts/tests/e2e/runtime/team-task-event-current-contract.e2e.test.ts`. `personal` changed only that file and `memory-collaboration-graphql.e2e.test.ts` since our base, so there are no conflicts with this branch's files. The rebase also removes the base's failures of those two e2e files seen in probe P-4.
- D-6: in the second case, add the first case's agent `source` to both `TASK_EXECUTION_STARTED` payloads, keeping each named defect (`settled_at: null`; missing `delegator_agent_run_id`).
- AC-007 proof: the file passes; then two uncommitted mutations, one at a time (remove `settled_at`; add `delegator_agent_run_id`), each make that case fail. Probe P-6 confirms that the product parser accepts the valid control and rejects each field on its own.
- Route: still `Small` / `Low` → `/software_engineering_team/implementation_engineer`.
