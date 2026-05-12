# Implementation Handoff

## Upstream Artifact Package

- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/docker-end-user-start-flow/tickets/done/docker-end-user-start-flow/requirements.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/docker-end-user-start-flow/tickets/done/docker-end-user-start-flow/investigation-notes.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/docker-end-user-start-flow/tickets/done/docker-end-user-start-flow/design-spec.md`
- Design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/docker-end-user-start-flow/tickets/done/docker-end-user-start-flow/design-review-report.md`
- Prior code review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/docker-end-user-start-flow/tickets/done/docker-end-user-start-flow/review-report.md`
- Prior API/E2E validation report: `/Users/normy/autobyteus_org/autobyteus-worktrees/docker-end-user-start-flow/tickets/done/docker-end-user-start-flow/api-e2e-validation-report.md`
- Install-once CLI design-impact rework: `/Users/normy/autobyteus_org/autobyteus-worktrees/docker-end-user-start-flow/tickets/done/docker-end-user-start-flow/design-impact-rework-install-once-cli.md`

## What Changed

- Added public no-clone Docker launcher scripts under `scripts/public/docker/`:
  - Bash/macOS/Linux entrypoint: `autobyteus-docker.sh`.
  - Windows PowerShell entrypoint: `autobyteus-docker.ps1`.
- Added install-once launcher support per architecture review round 4:
  - Bash `install`/`update` downloads the public launcher to `${AUTOBYTEUS_DOCKER_INSTALL_DIR:-$HOME/.local/bin}/autobyteus-docker`, marks it executable, and prints PATH/direct-path guidance.
  - PowerShell `install`/`update` downloads to `${AUTOBYTEUS_DOCKER_INSTALL_DIR:-%LOCALAPPDATA%\AutoByteus\bin}`, writes `autobyteus-docker.ps1` plus an `autobyteus-docker.cmd` shim, and prints User PATH/direct-path guidance without admin or Machine PATH changes.
  - Install/update runs before Docker assertions and does not touch launcher state, Docker containers, or Docker volumes.
- Applied architecture review round 5 ownership split:
  - `install`/`update` remains launcher-only and Docker-free.
  - `start` now owns server image/container refresh: it pulls/checks the configured image, compares current container image id plus launcher config hash, skips recreation when unchanged, starts an existing stopped current container, and recreates only when image/config changed or the managed container is missing.
  - Refresh preserves friendly node identity, named volumes, runtime state, and previous ports where possible; bind failures still fall back to fresh-port retry.
- Updated the primary Settings/docs UX from repeated `curl ... | bash -s -- start` lifecycle commands to `install once -> autobyteus-docker ...` direct local commands.
- Centralized command construction in `autobyteus-web/utils/dockerNodeLauncherCommands.ts` with raw GitHub owner/repo/ref/script paths, primary install commands, and direct installed-CLI commands.
- Added/updated the Settings → Nodes Docker guide (`DockerNodeStartGuideCard.vue`) to show:
  - step 1: macOS/Linux and Windows install commands,
  - step 2: direct local commands: `autobyteus-docker start`, `start --new`, `urls`, `status`, `logs`, and `stop`.
- Preserved previous lifecycle semantics:
  - plain `start` remains idempotent for the default node and no longer recreates an unchanged running container,
  - additional nodes use `start --new`,
  - friendly names, per-node named volumes, automatic port allocation, occupied-port retry, and no public `--project`/Compose terminology are retained.
- Preserved the published-image runtime contract in public `docker run` generation: restart policy, `SYS_ADMIN`, unconfined seccomp, backend/VNC/noVNC/debug port mappings, server/VNC env, root/data/workspace persistence, and published image default `autobyteus/autobyteus-server:latest`.
- Retained the Local Fix from API/E2E round 1: after `docker run -d`, Bash and PowerShell inspect container state and only write state/print URLs after `.State.Running=true`; bind/port allocation failures remove the created container and enter the fresh-port retry path.
- Updated root README, server README, Docker README, and web Settings docs so install-once is the primary no-clone path; direct `docker run` remains only as an advanced fallback where documented.
- Added/updated targeted unit/component tests for command catalog output, guide rendering/copy behavior, and NodeManager guide placement.

## Key Files Or Areas

- `scripts/public/docker/autobyteus-docker.sh`
- `scripts/public/docker/autobyteus-docker.ps1`
- `autobyteus-web/utils/dockerNodeLauncherCommands.ts`
- `autobyteus-web/components/settings/DockerNodeStartGuideCard.vue`
- `autobyteus-web/components/settings/NodeManager.vue`
- `autobyteus-web/localization/messages/en/settings.ts`
- `autobyteus-web/localization/messages/zh-CN/settings.ts`
- `README.md`
- `autobyteus-server-ts/README.md`
- `autobyteus-server-ts/docker/README.md`
- `autobyteus-web/docs/settings.md`
- Tests:
  - `autobyteus-web/utils/__tests__/dockerNodeLauncherCommands.spec.ts`
  - `autobyteus-web/components/settings/__tests__/DockerNodeStartGuideCard.spec.ts`
  - `autobyteus-web/components/settings/__tests__/NodeManager.spec.ts`

## Important Assumptions

- The public raw GitHub ref remains `personal`, matching the reviewed branch evidence; it is centralized in `dockerNodeLauncherCommands.ts` and in launcher install defaults.
- The default public image is `autobyteus/autobyteus-server:latest`; `--tag` and `--image` remain available for explicit override.
- Packaged-app users should install the launcher externally, run `autobyteus-docker start`, then paste the printed `Backend` URL into the existing Add Remote Node form.
- `docker-start.sh` remains the source-checkout/developer helper and is not used by the Settings guide or public launcher.

## Known Risks

- PowerShell install/shim/PATH behavior is implemented and statically checked, but this macOS environment does not have `powershell`/`pwsh`, so native Windows/PowerShell execution still needs downstream validation.
- Raw GitHub URLs for `personal` may 404 until these new public scripts exist on the tracked branch; delivery should recheck after integration/push.
- The Bash and PowerShell launchers are intentionally compact and under the source-size guardrail (`494` and `484` non-empty lines respectively); further scope should consider splitting installer/lifecycle concerns only if the public single-file delivery model can be preserved.
- Implementation did not repeat full real Docker API/E2E image startup; downstream validation should rerun real Docker startup and stale occupied-port recovery.

## Local Fix / Rework Updates

### API/E2E Round 1 Local Fix

- Trigger: API/E2E validation report scenario `V-006` showed Docker Desktop returning a successful `docker run -d` id while the container stayed `Created` with a bind error.
- Bash fix: `verify_container_started` polls Docker inspect state after `docker run`; non-running containers with bind errors are removed and retried with fresh ports. State/URLs are written only after `.State.Running=true`.
- PowerShell fix: `Get-ContainerStartFailure` applies the same post-run Docker inspect verification and feeds bind failures into the existing retry path.

### CLI Semantics Re-Review

- Trigger: architecture re-review clarified plain `start` as the idempotent default-node path and `start --new` as the additional-node command.
- Implementation check: public help/docs/UI/tests use `start --new`; no `start another` public command alias was introduced.

### Install-Once Design-Impact Rework

- Trigger: user clarified that repeated lifecycle use should not redownload/evaluate the raw script each time.
- Routed as `Design Impact`; solution design and architecture review round 4 passed the install-once design.
- Implementation now makes install/update the primary raw command, and direct local `autobyteus-docker ...` commands the repeated-use UI/docs path.
- One-shot raw lifecycle execution remains technically supported by the scripts and is demoted to advanced/temporary help text only, not the primary Settings/docs flow.

### Update vs Start Ownership Rework

- Trigger: architecture review round 5 clarified that `update` means launcher-script update only, while Docker server image/container refresh belongs to `start`.
- Bash and PowerShell now stamp managed containers with a launcher config hash label and compare that plus Docker image id after pull.
- If image/config is unchanged and the container is running, `start` writes/refreshes state and prints URLs without `docker rm` or `docker run`.
- If image/config is unchanged and the container is stopped, `start` attempts `docker start`; bind failures remove the stale container and enter the existing fresh-port retry path.
- If image/config changed, or if the container is missing, `start` recreates the managed container while keeping per-node named volumes and prior ports when possible.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: `Feature` plus `Local Fix` and approved `Design Impact` rework.
- Reviewed root-cause classification: `Boundary Or Ownership Issue` for public Docker lifecycle ownership; `Local Implementation Defect` for the post-run bind-failure false success; `Requirement/UX gap` for install-once repeated use, routed upstream and approved; ownership clarification for `update` vs `start`, routed upstream and approved.
- Reviewed refactor decision (`Refactor Needed Now`/`No Refactor Needed`/`Deferred`): `Refactor Needed Now`, bounded addition/extraction of a public Docker launcher boundary and install command catalog.
- Implementation matched the reviewed assessment (`Yes`/`No`): `Yes`.
- If challenged, routed as `Design Impact` (`Yes`/`No`/`N/A`): `Yes`; the install-once question and update/start ownership split were routed and reapproved before patching.
- Evidence / notes: Docker lifecycle policy is encapsulated in `scripts/public/docker/autobyteus-docker.*`; Settings/Nodes only renders/copies commands from the command catalog; node registration remains in Add Remote Node.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None` for the primary flow; one-shot raw lifecycle execution remains only as advanced/temporary launcher usage.
- Legacy old-behavior retained in scope: `No` for primary Settings/docs UX; repeated lifecycle examples now use direct installed CLI commands.
- Dead/obsolete code, obsolete files, unused helpers/tests/flags/adapters, and dormant replaced paths removed in scope: `Yes`; primary one-shot lifecycle command variants were removed from the frontend command catalog/tests/docs.
- Shared structures remain tight (no one-for-all base or overlapping parallel shapes introduced): `Yes`; command catalog types are scoped only to Docker launcher UI commands and separate install/direct phases.
- Canonical shared design guidance was reapplied during implementation, and file-level design weaknesses were routed upstream when needed: `Yes`.
- Changed source implementation files stayed within proactive size-pressure guardrails (`>500` effective non-empty avoided; `>220` assessed/acted on): `Yes`; `autobyteus-docker.sh` is `494` non-empty lines, `autobyteus-docker.ps1` is `484`, `NodeManager.vue` remains `493`, command catalog is `127`, and guide card is `132`.
- Notes: No source-tree Compose dependency or public `--project` command surface was introduced in the public launchers or Settings UI.

## Environment Or Dependency Notes

- `pnpm install --frozen-lockfile` and `pnpm -C autobyteus-web exec nuxi prepare` had been run earlier in this worktree for targeted Vitest execution; lockfile remained unchanged.
- `vue-tsc` is not installed in `autobyteus-web`, so no package typecheck command was available through that binary.
- Docker CLI is reachable locally for implementation checks; PowerShell is not installed, so native PowerShell parse/runtime checks remain downstream.
- The install local check used `AUTOBYTEUS_DOCKER_INSTALL_SOURCE_URL=file://...` to avoid relying on unpublished raw GitHub URLs.

## Local Implementation Checks Run

Record only implementation-scoped checks here, such as build, typecheck, unit tests, and narrow integration checks around the changed code. Do not stand up API/E2E validation environments or treat that work as part of this section.

- `bash -n scripts/public/docker/autobyteus-docker.sh` — passed.
- `shellcheck scripts/public/docker/autobyteus-docker.sh` — passed.
- `scripts/public/docker/autobyteus-docker.sh help` — passed; includes primary `install`, direct lifecycle commands, and demotes one-shot raw execution to advanced temporary use.
- Static grep verifying public launchers do not contain `docker-compose`, `COMPOSE_FILE`, `autobyteus-server-ts/docker`, or `--project` — passed.
- Bash install/update Docker-free check: `AUTOBYTEUS_DOCKER_INSTALL_DIR=<tmp> AUTOBYTEUS_DOCKER_INSTALL_SOURCE_URL=file://... scripts/public/docker/autobyteus-docker.sh install`, then installed `autobyteus-docker update`, with a fake `docker` that fails if called — passed.
- Mocked Bash `start` unchanged-image/config check — passed; second `start` printed URLs without a second `docker run` or `docker rm`.
- Mocked Bash `start` image-change check — passed; changed image id caused managed-container recreation while preserving saved ports.
- Mocked Bash launcher `start` with fake Docker where `docker run -d` exits 0 but Docker inspect reports `Created` plus bind error on the first attempt — passed; verified retry message, second run attempt, fresh saved port, and state write only after running-state success.
- PowerShell parse/runtime check — skipped because `pwsh`/PowerShell is unavailable in this macOS environment; PowerShell implementation received static review only.
- `NUXT_TEST=true pnpm -C autobyteus-web exec vitest run utils/__tests__/dockerNodeLauncherCommands.spec.ts components/settings/__tests__/DockerNodeStartGuideCard.spec.ts components/settings/__tests__/NodeManager.spec.ts` — passed (`3` files, `11` tests).
- `pnpm -C autobyteus-web guard:localization-boundary` — passed.
- `pnpm -C autobyteus-web audit:localization-literals` — passed with an existing Node module-type warning only.
- `pnpm -C autobyteus-web guard:web-boundary` — passed.
- `git diff --check` — passed.

## Downstream Validation Hints / Suggested Scenarios

- On macOS/Linux with Docker, validate install-once flow from the public raw command, then direct commands:
  - `autobyteus-docker start` twice with unchanged image/config to confirm no unnecessary container recreation,
  - `autobyteus-docker start` after a published image update or pinned tag change to confirm managed-container recreation with preserved named volumes and ports where possible,
  - `autobyteus-docker start --new`,
  - `autobyteus-docker urls`, `status`, `logs`, `stop`, and `stop --all`.
- Rerun API/E2E `V-006` stale/occupied saved-port recovery against real Docker Desktop to confirm post-run inspect retry with the install-once/update-aware version.
- On Windows PowerShell, validate `irm ... | iex; autobyteus-docker install`, the written `.ps1` + `.cmd` shim, execution-policy behavior, User PATH guidance, direct-path fallback, and direct lifecycle commands.
- After launcher start, paste the printed `Backend` URL into Settings → Nodes → Add Remote Node and verify the existing probe/registration flow still owns node registry writes.
- Verify noVNC/VNC/debug ports and Codex/Claude auth persistence via per-node named volumes.

## API / E2E / Executable Validation Still Required

- Real Docker launcher startup and repeated `start` no-recreate/update-recreate behavior using the published image should be validated by API/E2E when image pull/runtime duration is acceptable.
- Real install-once raw GitHub commands should be rechecked after this branch is integrated/published to the configured raw ref.
- Windows PowerShell command execution requires downstream validation on a PowerShell-capable environment.
- End-to-end Settings → copy install command → install launcher → direct `autobyteus-docker start` → Add Remote Node flow remains downstream validation scope.
