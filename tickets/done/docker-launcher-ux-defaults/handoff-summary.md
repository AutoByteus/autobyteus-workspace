# Handoff Summary — Docker Launcher UX Defaults

## Status

Ready for user verification before repository finalization.

## What changed

- macOS/Linux public launcher install now prints truthful PATH guidance:
  - installed executable path,
  - direct-path command that works immediately,
  - current-shell `export PATH=...`,
  - duplicate-safe persistent profile update when possible,
  - copy/paste persistent profile setup commands when automatic update is skipped, unavailable, or blocked,
  - explicit note that a child installer cannot mutate the already-running parent shell.
- Fresh indexed Docker nodes now prefer deterministic friendly host ports when available:
  - `autobyteus-server-0`: backend/VNC/noVNC/debug `8001/5908/6080/9228`,
  - `autobyteus-server-1`: `8002/5909/6081/9229`,
  - `autobyteus-server-2`: `8003/5910/6082/9230`, with later nodes continuing offsets.
- Existing saved ports remain authoritative unless unavailable; preferred-port collisions and real Docker bind/start failures fall back to fresh safe ports.
- Read-only discovery commands now show all managed nodes by default:
  - `autobyteus-docker urls`, `ports`, `workspace paths`, and `storage`.
- Explicit single-node forms remain available:
  - `urls <node>` / `ports <node>` or `--name <node>`,
  - `workspace paths --name <node>`,
  - `storage --name <node>`.
- Mutating or stream commands preserve safe explicit targeting:
  - `workspace apply` does not silently broaden to all nodes,
  - `upgrade` and `destroy` still require `--all`,
  - `logs` remains single-node,
  - `stop` remains default/single-node unless `--all` is supplied.
- Public docs and Docker Guide copy were synchronized for the final behavior:
  - `README.md`,
  - `autobyteus-web/localization/messages/en/settings.ts`,
  - `autobyteus-web/localization/messages/zh-CN/settings.ts`.

## Integration refresh

- Worktree: `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo-docker-launcher-ux-defaults`
- Ticket branch: `codex/docker-launcher-ux-defaults`
- Finalization target recorded by handoff: `origin/personal`
- Bootstrap/base reference before delivery refresh: `origin/personal@02440c9b357c7bf85d2bc7484a571fc0d58a55be`
- Latest tracked remote base checked: `origin/personal@02440c9b357c7bf85d2bc7484a571fc0d58a55be` after renewed `git fetch origin personal` on 2026-06-23.
- Ticket branch head at refresh: `02440c9b357c7bf85d2bc7484a571fc0d58a55be` with reviewed/API-E2E-round-2-passed changes uncommitted in the dedicated worktree.
- Ahead/behind after fetch: `0 / 0` for `HEAD...origin/personal`.
- Integration method: `Already current`; no merge/rebase was required because `HEAD`, `origin/personal`, and their merge-base were identical.
- New base commits integrated during delivery: `No`.
- Local checkpoint commit: `Not needed`; no base commits required integration before delivery-owned edits.
- Integration evidence:
  - `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo-docker-launcher-ux-defaults/tickets/done/docker-launcher-ux-defaults/logs/delivery-round2-pre-refresh-state.log`
  - `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo-docker-launcher-ux-defaults/tickets/done/docker-launcher-ux-defaults/logs/delivery-round2-fetch-origin-personal.log`
  - `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo-docker-launcher-ux-defaults/tickets/done/docker-launcher-ux-defaults/logs/delivery-round2-post-fetch-state.log`

## Validation evidence

Current authoritative upstream validation is API/E2E round 2:

- API/E2E result: `Pass`; current authoritative execution round: `2`.
- `bash -n scripts/public/docker/autobyteus-docker.sh scripts/public/docker/autobyteus-docker.d/bash/core.sh scripts/public/docker/autobyteus-docker.d/bash/docker-runtime.sh scripts/public/docker/autobyteus-docker.d/bash/commands.sh` — passed.
  - Log: `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo-docker-launcher-ux-defaults/tickets/done/docker-launcher-ux-defaults/logs/api-e2e-round2-bash-syntax.log`
- `python3 -m py_compile scripts/tests/test_public_docker_launcher_shared_workspace.py` — passed.
  - Log: `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo-docker-launcher-ux-defaults/tickets/done/docker-launcher-ux-defaults/logs/api-e2e-round2-py-compile.log`
- `python3 -m unittest scripts.tests.test_public_docker_launcher_shared_workspace scripts.tests.test_server_docker_cli_latest_defaults` — passed (`Ran 22 tests`, `OK (skipped=1)`).
  - Log: `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo-docker-launcher-ux-defaults/tickets/done/docker-launcher-ux-defaults/logs/api-e2e-round2-unit-tests.log`
- Focused installer-output probe — passed:
  - default managed update printed direct path/current-shell export/current-shell note, wrote one managed `.bashrc` block, and did not print duplicate manual persistent setup commands;
  - `install --no-update-path` with zsh-selected profile and install dir containing spaces plus a single quote printed a concrete persistent setup block;
  - the extracted emitted block ran twice and resulted in exactly one shell-safe export line.
  - Logs: `api-e2e-round2-install-output-rerun2.log`, `api-e2e-round2-install-persistent-block-rerun2.sh.txt`, `api-e2e-round2-install-profile-after-block-rerun2.txt`.
- Real Docker Engine 29.1.3 probes with isolated launcher state/shared workspace and `nginx:alpine` — passed:
  - server-0/1/2 friendly sequential ports: `8001/5908/6080/9228`, `8002/5909/6081/9229`, `8003/5910/6082/9230`;
  - read-only defaults for `urls`, `ports`, `workspace paths`, `storage`, and `status` included all nodes;
  - explicit single-node output narrowed to server-1;
  - `logs` stayed explicit single-node; `upgrade`/`destroy` without `--all` rejected safely;
  - saved-port preservation after `stop` + `workspace apply --name` kept server-1 backend `8002`;
  - preferred backend fallback with `8001` held used fallback backend `48731` while other friendly ports remained selected;
  - saved-port start retry with `8001` held after stop reported saved ports unavailable and recreated with fresh backend `56455`.
  - Logs: `api-e2e-round2-real-docker-multinode.log`, `api-e2e-round2-real-docker-port-fallback.log`, `api-e2e-round2-real-docker-saved-port-retry.log` and their companion state/port files.
- `git diff --check` — passed during API/E2E round 2.
  - Log: `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo-docker-launcher-ux-defaults/tickets/done/docker-launcher-ux-defaults/logs/api-e2e-round2-git-diff-check.log`

Delivery integrated-state and docs-sync validation:

- `git fetch origin personal` — passed; base did not advance beyond reviewed/API-E2E-round-2-passed candidate state.
- No extra post-merge rerun was required because no base commits were integrated.
- `bash -n scripts/public/docker/autobyteus-docker.sh scripts/public/docker/autobyteus-docker.d/bash/core.sh scripts/public/docker/autobyteus-docker.d/bash/docker-runtime.sh scripts/public/docker/autobyteus-docker.d/bash/commands.sh` — passed.
  - Log: `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo-docker-launcher-ux-defaults/tickets/done/docker-launcher-ux-defaults/logs/delivery-round2-bash-syntax.log`
- `python3 -m unittest scripts.tests.test_public_docker_launcher_shared_workspace scripts.tests.test_server_docker_cli_latest_defaults` — passed (`Ran 22 tests`, `OK (skipped=1)`).
  - Log: `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo-docker-launcher-ux-defaults/tickets/done/docker-launcher-ux-defaults/logs/delivery-round2-unit-tests.log`
- `pnpm install --frozen-lockfile --ignore-scripts` and `NUXT_TEST=true pnpm exec nuxt prepare` had already restored local frontend test dependencies/types in this clean worktree during delivery; no tracked dependency manifests or lockfiles changed.
  - Logs: `logs/delivery-pnpm-install.log`, `logs/delivery-web-nuxt-prepare.log`
- `cd autobyteus-web && NUXT_TEST=true pnpm exec vitest run components/settings/__tests__/DockerNodeStartGuideCard.spec.ts utils/__tests__/dockerNodeLauncherCommands.spec.ts` — passed (`2 files`, `4 tests`).
  - Log: `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo-docker-launcher-ux-defaults/tickets/done/docker-launcher-ux-defaults/logs/delivery-round2-web-docker-guide-tests.log`
- `git diff --check` plus delivery artifact trailing-whitespace check — passed after docs sync and delivery artifact updates.
  - Log: `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo-docker-launcher-ux-defaults/tickets/done/docker-launcher-ux-defaults/logs/delivery-round2-git-diff-check.log`

## Documentation sync summary

- Docs sync artifact: `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo-docker-launcher-ux-defaults/tickets/done/docker-launcher-ux-defaults/docs-sync-report.md`
- Docs result: `Updated`.
- Docs / guide copy updated:
  - `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo-docker-launcher-ux-defaults/README.md`
  - `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo-docker-launcher-ux-defaults/autobyteus-web/localization/messages/en/settings.ts`
  - `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo-docker-launcher-ux-defaults/autobyteus-web/localization/messages/zh-CN/settings.ts`
- Reviewed with no change required:
  - `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo-docker-launcher-ux-defaults/docs/android_mobile_access.md`
  - `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo-docker-launcher-ux-defaults/docs/ios_mobile_access.md`
  - `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo-docker-launcher-ux-defaults/autobyteus-web/docs/remote_access.md`
  - `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo-docker-launcher-ux-defaults/autobyteus-web/utils/dockerNodeLauncherCommands.ts`

## Release / deployment status

- Release/publication/deployment: User requested a new version release after verification.
- Planned version: `1.3.71` / tag `v1.3.71`.
- Release notes: `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo-docker-launcher-ux-defaults/tickets/done/docker-launcher-ux-defaults/release-notes.md`.
- Current status: repository finalization and release are in progress; final results will be recorded in `release-deployment-report.md`.

## User verification and release authorization

User verification was received on 2026-06-23: `cooo. finalize and release a new version`. Ticket archival to `tickets/done/docker-launcher-ux-defaults` is complete in the ticket worktree. Repository finalization and the requested new version release are in progress; final commit/tag/push/release workflow results will be recorded in `release-deployment-report.md` after completion.
