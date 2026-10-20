# Handoff — autobyteus-ts-dependency-hygiene, SR-001: Architecture Design Complete

- Status: **Architecture Design Complete**; `task_size=Small`, `architectural_risk=Low`; route: direct implementation (no independent architecture review)
- Package: `autobyteus-ts-dependency-hygiene`; Project Task `autobyteus-224` (FU-003 and FU-006 of `autobyteus-182`)
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`)
- Ticket folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-ts-dependency-hygiene/tickets/in-progress/autobyteus-ts-dependency-hygiene/`
- Workspace: worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-ts-dependency-hygiene`, branch `codex/autobyteus-ts-dependency-hygiene`, base `origin/personal` @ `5de6a698b9` (fetched 2026-10-20). Finalization target `origin/personal`. No code changed; the ticket documents are uncommitted.

## Original request

1. Delete the stale `autobyteus-ts/pnpm-lock.yaml` after confirming that nothing installs `autobyteus-ts` outside the workspace; regenerate it instead if a standalone install is supported.
2. Remove the unused `"hono": "^4.0.0"` from `autobyteus-ts` `dependencies` after confirming that no runtime path needs it; rerun the build and the packaged smoke check.

Done when both are resolved or shown to be needed (with the reason), and the build and the packaged smoke check pass. No release is asked for.

## Approval basis

`requirements-doc.md` SR-001 is approved by the Solution Designer within the Task's direction; the user was informed in the Solution Designer conversation. Decisions:
- DEC-001: delete the lockfile rather than regenerate it.
- DEC-002: also delete the dead `autobyteus-ts/.github` workflow, as dead code in the touched package.

## What was found

- **The standalone lockfile is never read.** The standalone repos `AutoByteus/autobyteus-ts` and `autobyteus-server-ts` have been archived since February 2026. Running `pnpm install` inside `autobyteus-ts/` resolves all 13 workspace projects from the root lockfile, and neither lockfile changes (`probes/standalone-install-probe.txt`). Nothing references the file or uses `--ignore-workspace` for it.
- **`hono` is used nowhere.** No source, script, test or other manifest imports it. Its only user in the tree is the peer of `@hono/node-server`, and the two packages that use `@hono/node-server` (`@modelcontextprotocol/node` and `@modelcontextprotocol/sdk`) bring their own `hono`.
- **`verify:runtime-deps` can't fail on this.** It only flags imports missing from the manifest, never unused entries.
- **The nested workflow is dead.** `autobyteus-ts/.github/workflows/trigger-server-docker-rebuild.yml` never runs: GitHub runs only root workflows, and it targets an archived repo.

## What to do

`design-spec.md` has the file mapping and the change sequence:
- Delete `autobyteus-ts/pnpm-lock.yaml` and `autobyteus-ts/.github/`.
- Remove the `hono` line from `autobyteus-ts/package.json`.
- Run `pnpm install` at the root. The only expected lockfile change is the `autobyteus-ts` importer losing `hono`.
- Then check AC-001…AC-006: the install from inside `autobyteus-ts`, the builds and tests, and the packaged smoke check (`verify-packaged-server-startup.mjs` on a packaged macOS build of the branch), plus the core MCP integration.

## Risks and follow-ups

- R-002: a packaged path could need `hono`. The packaged smoke check settles it.
- FU-001 (not sent yet): the `autobyteus-web/.github` leftover workflow.

## Route record

- 2026-10-20: `get_handoff_rules` returned 3 rules. The matching rule is "Small or Medium and architectural_risk=Low" → `/software_engineering_team/implementation_engineer`.
