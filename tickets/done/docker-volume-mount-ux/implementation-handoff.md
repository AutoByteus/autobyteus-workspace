# Implementation Handoff

## Upstream Artifact Package

- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/docker-volume-mount-ux/requirements.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/docker-volume-mount-ux/investigation-notes.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/docker-volume-mount-ux/design-spec.md`
- Design review report: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/docker-volume-mount-ux/design-review-report.md`

## What Changed

- Added default-on shared workspace bind mounts to both public launchers while preserving the existing three named-volume mounts unchanged.
- Added launcher-managed shared workspace layout:
  - host root default: `$HOME/.autobyteus/docker-server/shared-workspace` on Bash/macOS/Linux and `%LOCALAPPDATA%\AutoByteus\docker-server\shared-workspace` on PowerShell/Windows.
  - override: `AUTOBYTEUS_DOCKER_SHARED_WORKSPACE_DIR`.
  - node workspace: `shared-workspace/nodes/<node-name>` -> `/home/autobyteus/workspace`.
  - shared collaboration folder: `shared-workspace/shared` -> `/home/autobyteus/shared`.
- Set launched containers with `AUTOBYTEUS_TEMP_WORKSPACE_DIR=/home/autobyteus/workspace`.
- Bumped launcher config hash version to `v2` and included shared workspace root/path targets plus temp workspace env in the hash so stale containers are recreated safely.
- Added public launcher inspection/apply commands:
  - `autobyteus-docker workspace paths [--name <node>] [--all]`
  - `autobyteus-docker workspace apply [--name <node>] [--all]`
  - `autobyteus-docker storage [--name <node>] [--all]`
- Updated Settings -> Nodes command catalog/card copy and tests to surface workspace/storage commands and the private-data vs user-workspace mental model.
- Updated root/server Docker documentation with the named-volume preservation contract, shared workspace host layout, safe apply workflow, old temp workspace preservation note, and Linux root-owned file warning.
- Added fake-Docker launcher unit coverage for Bash behavior and PowerShell parity contract checks.

## Key Files Or Areas

- `scripts/public/docker/autobyteus-docker.sh`
- `scripts/public/docker/autobyteus-docker.ps1`
- `scripts/tests/test_public_docker_launcher_shared_workspace.py`
- `autobyteus-web/utils/dockerNodeLauncherCommands.ts`
- `autobyteus-web/utils/__tests__/dockerNodeLauncherCommands.spec.ts`
- `autobyteus-web/components/settings/DockerNodeStartGuideCard.vue`
- `autobyteus-web/components/settings/__tests__/DockerNodeStartGuideCard.spec.ts`
- `autobyteus-web/localization/messages/en/settings.ts`
- `autobyteus-web/localization/messages/zh-CN/settings.ts`
- `README.md`
- `autobyteus-server-ts/README.md`
- `autobyteus-server-ts/docker/README.md`

## Important Assumptions

- New containers should receive shared workspace bind mounts by default.
- Existing managed containers adopt the new bind mounts only through config-change recreate during lifecycle commands or explicit `workspace apply`.
- Existing named volume names and targets are authoritative and unchanged.
- Host-backed `/home/autobyteus/data` migration/export remains out of scope.
- Settings UI remains a command/copy guidance surface; Docker run policy stays in `autobyteus-docker.*`.

## Known Risks

- PowerShell native parse/runtime check could not be executed locally because `pwsh` is not installed in this environment. The added Python test checks PowerShell source parity strings and skips native parse when unavailable.
- Real Docker multi-node bind-mount visibility was not run by implementation; fake-Docker checks cover argument construction/recreate semantics only. API/E2E should run real Docker validation if available.
- Linux bind-mounted files may be root-owned because the container currently runs as root; documented as residual risk.
- The public launcher scripts were already over the 500 effective-line source guardrail and remain over it after this change. This task stayed within per-file diff pressure (`169` added/`10` removed Bash, `175` added/`10` removed PowerShell) and preserved the reviewed self-contained public launcher boundary, but future work should consider a generation/splitting strategy if the public installer contract allows it.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: `Feature` / `Behavior Change`
- Reviewed root-cause classification: `Boundary Or Ownership Issue`
- Reviewed refactor decision (`Refactor Needed Now`/`No Refactor Needed`/`Deferred`): `Refactor Needed Now`
- Implementation matched the reviewed assessment (`Yes`/`No`): `Yes`
- If challenged, routed as `Design Impact` (`Yes`/`No`/`N/A`): `N/A`
- Evidence / notes: Docker mount/path/hash/recreate policy was implemented inside the public Bash/PowerShell launcher boundary. UI/docs only present launcher-owned commands and explanatory copy. Server runtime code was not changed; it already consumes `AUTOBYTEUS_TEMP_WORKSPACE_DIR`.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No` for superseded default temp workspace behavior after apply; existing named-volume mounts are intentionally retained per requirement, not as a compatibility shim.
- Dead/obsolete code, obsolete files, unused helpers/tests/flags/adapters, and dormant replaced paths removed in scope: `Yes`
- Shared structures remain tight (no one-for-all base or overlapping parallel shapes introduced): `Yes`
- Canonical shared design guidance was reapplied during implementation, and file-level design weaknesses were routed upstream when needed: `Yes`; no design-impact reroute was needed. File-size pressure remains noted for reviewer awareness.
- Changed source implementation files stayed within proactive size-pressure guardrails (`>500` avoided; `>220` assessed/acted on): `No (pre-existing public launcher files remain >500 effective non-empty lines; per-file diff stayed below >220 and the reviewed design requires self-contained public launchers)`
- Notes: No dual/manual raw Docker mount primary path was introduced. Advanced direct Docker fallback remains secondary in docs.

## Environment Or Dependency Notes

- Installed frontend dependencies with `pnpm --dir autobyteus-web install --frozen-lockfile` to run targeted Vitest checks. No tracked dependency files changed.
- Ran `pnpm --dir autobyteus-web exec nuxi prepare` to generate `.nuxt/tsconfig.json` required by Vitest in this fresh worktree. Generated files are ignored/untracked.
- `pwsh` is unavailable in this environment.

## Local Implementation Checks Run

- `bash -n scripts/public/docker/autobyteus-docker.sh` — passed.
- `shellcheck scripts/public/docker/autobyteus-docker.sh` — passed.
- `python3 -m unittest discover scripts/tests -v` — passed (`8` tests, `1` skipped because `pwsh` unavailable).
- `pnpm --dir autobyteus-web exec nuxi prepare` — passed.
- `pnpm --dir autobyteus-web exec vitest run utils/__tests__/dockerNodeLauncherCommands.spec.ts components/settings/__tests__/DockerNodeStartGuideCard.spec.ts` — passed (`2` files, `4` tests).
- `git diff --check` — passed.
- PowerShell native parse check — skipped; `pwsh not installed`.

## Downstream Validation Hints / Suggested Scenarios

- Real Docker: create two nodes and verify both retain existing named volumes plus new bind mounts.
- Real Docker: write a file under node 0 `/home/autobyteus/workspace` and verify it appears only in host `shared-workspace/nodes/autobyteus-server-0`.
- Real Docker: write a file under `/home/autobyteus/shared` from one node and verify the other node sees it without additional Docker recreation.
- Existing container transition: create a container with old launcher config if possible, then run `workspace apply --all` and verify named volumes, ports, friendly node identity, and image are preserved where possible.
- Windows PowerShell: run native parse and fake/real Docker equivalent checks on Windows or a pwsh-enabled environment.

## API / E2E / Executable Validation Still Required

- Real Docker lifecycle/API/E2E validation remains required downstream.
- PowerShell native execution validation remains required downstream where `pwsh`/Windows is available.
