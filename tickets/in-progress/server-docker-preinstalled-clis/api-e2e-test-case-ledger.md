# API/E2E Test-Case Ledger

Round 1 / planned API-REV-001; SR-004 / IR-001. Initialized before execution. Canonical authority: api-e2e-coverage-investigation.md and api-e2e-execution-coverage-report.md. Worktree is server-docker-preinstalled-clis.

## Planned Cases
| ID | Requirement/AC | Scenario |
| --- | --- | --- |
| CASE-REPO | 001–006 | Focused source/shell regression checks |
| CASE-BUILD-default-arm64 | 001,003,004,006 | Full production build default-arm64 |
| CASE-CLI-default-arm64 | 001,002,003,004 | Offline default/root login shells and reused home default-arm64 |
| CASE-LIVE-default-arm64 | 002,004 | Server/browser startup + state-preserving recreate default-arm64 |
| CASE-BUILD-default-amd64 | 001,003,004,006 | Full production build default-amd64 |
| CASE-CLI-default-amd64 | 001,002,003,004 | Offline default/root login shells and reused home default-amd64 |
| CASE-LIVE-default-amd64 | 002,004 | Server/browser startup + state-preserving recreate default-amd64 |
| CASE-BUILD-zh-arm64 | 001,003,004,006 | Full production build zh-arm64 |
| CASE-CLI-zh-arm64 | 001,002,003,004 | Offline default/root login shells and reused home zh-arm64 |
| CASE-LIVE-zh-arm64 | 002,004 | Server/browser startup + state-preserving recreate zh-arm64 |
| CASE-BUILD-zh-amd64 | 001,003,004,006 | Full production build zh-amd64 |
| CASE-CLI-zh-amd64 | 001,002,003,004 | Offline default/root login shells and reused home zh-amd64 |
| CASE-LIVE-zh-amd64 | 002,004 | Server/browser startup + state-preserving recreate zh-amd64 |
| CASE-CACHE | 006 | Second cache-buster reacquisition |

## Execution Events

- 2026-09-28T06:29:20.328186 CASE-REPO Started.
- 2026-09-28T06:29:24.099399 CASE-REPO Completed Pass: 16 tests, git diff --check; evidence api-e2e-evidence/repository.log. Source/mocked shell evidence only.
- CASE-BUILD-default-arm64 Started: full production Dockerfile, builder default, CLI_INSTALL_CACHE_BUSTER=api001-a, no push.
- CASE-BUILD-default-arm64 Checkpoint: explicit builder default rejected by Docker context binding before build. Local setup correction: use existing desktop-linux docker-driver builder with current desktop-linux context, no global context/builder changes. Initial error retained as build-default-arm64-setup.log.
- CASE-BUILD-default-arm64 Checkpoint: interrupted during pnpm dependency setup, no final image/process remained; restarting identical command, prior log retained as build-default-arm64-interrupted.log. No success inferred.
- CASE-BUILD-default-arm64 Checkpoint: dependency install completed in 70.5s, builder contract compilation in progress; CLI layer running concurrently. No final result yet.
- CASE-BUILD-default-arm64 Checkpoint: AGY 1.2.12/Grok 1.0.41 installed and post-cleanup probes passed; server build/bootstrap smoke and mobile web build completed; final image exporting. Still unresolved until exporter exits.
- CASE-BUILD-default-arm64 Completed Pass: full production image export exit 0; image sha256:4c0c11c1df531872a0111e92b333dd496ea190b24052ebeda3f41d043a71e1a1. Evidence build-default-arm64.log. Startup not yet tested.
- CASE-CLI-default-arm64 Started: durable offline image smoke.
- CASE-CLI-default-arm64 Completed Pass: full production image, no network, clean/default/login shells, old home binaries not selected, all marker/hashes retained across disposable recreation. AGY 1.2.12, Grok 1.0.41, Codex 0.157.1, Claude 2.1.283, Node22.23.3. Durable script ran exit 0; all volumes removed. Evidence cli-default-arm64.log.
- CASE-LIVE-default-arm64 Started: normal entrypoint, synthetic volumes, offline, server/browser/recreate smoke.
- CASE-LIVE-default-arm64 Completed Pass: normal entrypoint and two independent recreations ready at /rest/health; offline four CLI versions and marker checks pass; Chromium Chrome/153.0.8010.52 debug + real root bridge opens exact test URL. Port6080 responds with websockify directory listing (not proof of full noVNC client UI). Evidence live-default-arm64.log, exit0. All own containers/volumes removed. Late diagnostic startup-checkpoint.log queried an already removed container and is not failure evidence.
- 2026-09-28T04:45:36.334830+00:00 CASE-BUILD-zh-arm64 Started: docker buildx build --builder desktop-linux --progress plain --platform linux/arm64 --load --build-arg CLI_INSTALL_CACHE_BUSTER=api001-a --build-arg BASE_IMAGE_TAG=zh -f autobyteus-server-ts/docker/Dockerfile.monorepo -t autobyteus-cli-api001:zh-arm64 .
- 2026-09-28T04:46:36.339750+00:00 CASE-BUILD-zh-arm64 Checkpoint: running 60 seconds; evidence build-zh-arm64.log.
- CASE-FAIL-CLOSED Planned: AC-001/006 hermetic actual install-shell execution for acquisition and AGY soft-failure cases.
- CASE-FAIL-CLOSED Started: python3 -m unittest discover -s scripts/tests -p test_server_docker_cli_install_failures.py -v.
- CASE-FAIL-CLOSED Completed Pass: 3 hermetic tests execute exact install RUN; curl22, installer-success-without-payload, and empty successful version all fail before publication. Evidence fail-closed.log. No network/system writes; temporary host fixtures auto-removed.
- CASE-AUTH-SCOPE Planned/Started: inspect clean image environment/known credential paths and unchanged runtime source boundary; no secret values read.
- 2026-09-28T04:47:36.342936+00:00 CASE-BUILD-zh-arm64 Checkpoint: running 120 seconds; evidence build-zh-arm64.log.
- CASE-AUTH-SCOPE Completed Pass: no provider API-key env values, known token/config files absent in clean image, no GROK_HOME; implementation diff touches no runtime selector/auth/volume/base source. Evidence auth-scope.log. Not a universal secret scan or live auth/keyring persistence test.
- 2026-09-28T04:48:10.474992+00:00 CASE-BUILD-zh-arm64 Completed Pass: exit 0; evidence api-e2e-evidence/build-zh-arm64.log.
- 2026-09-28T04:48:10.475512+00:00 CASE-CLI-zh-arm64 Started: python3 scripts/tests/server_docker_cli_smoke.py --image autobyteus-cli-api001:zh-arm64 --platform linux/arm64
- 2026-09-28T04:48:18.919231+00:00 CASE-CLI-zh-arm64 Completed Pass: exit 0; evidence api-e2e-evidence/cli-zh-arm64.log.
- 2026-09-28T04:48:18.919421+00:00 CASE-LIVE-zh-arm64 Started: python3 /Users/normy/autobyteus_org/autobyteus-worktrees/server-docker-preinstalled-clis/tickets/in-progress/server-docker-preinstalled-clis/api-e2e-evidence/live_probe.py autobyteus-cli-api001:zh-arm64
- CASE-REPO Checkpoint/recheck Pass: after coverage additions, final focused suite is 19 passing tests (17 server Docker + 2 context). py_compile/diff checks pass; repository-final.log. No removed or changed production source.
- CASE-CACHE Started: full default-arm64 rebuild with CLI_INSTALL_CACHE_BUSTER=api001-b, tag default-arm64-refresh, unchanged production Dockerfile.
- 2026-09-28T04:48:56.689660+00:00 CASE-LIVE-zh-arm64 Completed Pass: exit 0; evidence api-e2e-evidence/live-zh-arm64.log.
- 2026-09-28T04:48:56.689835+00:00 CASE-BUILD-default-amd64 Started: docker buildx build --builder desktop-linux --progress plain --platform linux/amd64 --load --build-arg CLI_INSTALL_CACHE_BUSTER=api001-a --build-arg BASE_IMAGE_TAG=latest -f autobyteus-server-ts/docker/Dockerfile.monorepo -t autobyteus-cli-api001:default-amd64 .
- 2026-09-28T04:49:56.699149+00:00 CASE-BUILD-default-amd64 Checkpoint: running 60 seconds; evidence build-default-amd64.log.
- CASE-CACHE Checkpoint: api001-b executed new npm acquisition and official AGY latest query/download; installed agy1.2.12/grok1.0.41 again, layer DONE91.0s not CACHED; full image export still pending. Equal upstream versions are expected.
- 2026-09-28T04:50:56.700775+00:00 CASE-BUILD-default-amd64 Checkpoint: running 120 seconds; evidence build-default-amd64.log.
- 2026-09-28T04:51:56.706602+00:00 CASE-BUILD-default-amd64 Checkpoint: running 180 seconds; evidence build-default-amd64.log.
- 2026-09-28T04:52:56.712054+00:00 CASE-BUILD-default-amd64 Checkpoint: running 240 seconds; evidence build-default-amd64.log.
- CASE-CACHE Completed Pass: full production rebuild with buster api001-b exit0; runtime installation layer reexecuted (91.0s), Grok npm and official AGY release download/checksum observed. Fresh image offline clean/reused-home durable smoke passes; artifacts cache-refresh.log/cache-refresh-cli.log. Final image sha256:5ede84734d582e21a501746459d08fef464c66e9aae970d8c0f1536b9f57a471. Synthetic resources removed.
- 2026-09-28T04:53:56.713136+00:00 CASE-BUILD-default-amd64 Checkpoint: running 300 seconds; evidence build-default-amd64.log.
- 2026-09-28T04:54:56.715014+00:00 CASE-BUILD-default-amd64 Checkpoint: running 360 seconds; evidence build-default-amd64.log.
- 2026-09-28T04:55:56.720417+00:00 CASE-BUILD-default-amd64 Checkpoint: running 420 seconds; evidence build-default-amd64.log.
- 2026-09-28T04:56:45.740207+00:00 CASE-BUILD-default-amd64 Completed Pass: exit 0; evidence api-e2e-evidence/build-default-amd64.log.
- 2026-09-28T04:56:45.741727+00:00 CASE-CLI-default-amd64 Started: python3 scripts/tests/server_docker_cli_smoke.py --image autobyteus-cli-api001:default-amd64 --platform linux/amd64
- 2026-09-28T04:57:23.745337+00:00 CASE-CLI-default-amd64 Completed Pass: exit 0; evidence api-e2e-evidence/cli-default-amd64.log.
- 2026-09-28T04:57:23.745711+00:00 CASE-LIVE-default-amd64 Started: python3 /Users/normy/autobyteus_org/autobyteus-worktrees/server-docker-preinstalled-clis/tickets/in-progress/server-docker-preinstalled-clis/api-e2e-evidence/live_probe.py autobyteus-cli-api001:default-amd64
- 2026-09-28T04:58:23.755622+00:00 CASE-LIVE-default-amd64 Checkpoint: running 60 seconds; evidence live-default-amd64.log.
- 2026-09-28T04:58:30.121108+00:00 CASE-LIVE-default-amd64 Completed Pass: exit 0; evidence api-e2e-evidence/live-default-amd64.log.
- 2026-09-28T04:58:30.121378+00:00 CASE-BUILD-zh-amd64 Started: docker buildx build --builder desktop-linux --progress plain --platform linux/amd64 --load --build-arg CLI_INSTALL_CACHE_BUSTER=api001-a --build-arg BASE_IMAGE_TAG=zh -f autobyteus-server-ts/docker/Dockerfile.monorepo -t autobyteus-cli-api001:zh-amd64 .
- 2026-09-28T04:59:30.130230+00:00 CASE-BUILD-zh-amd64 Checkpoint: running 60 seconds; evidence build-zh-amd64.log.
- 2026-09-28T05:00:30.133001+00:00 CASE-BUILD-zh-amd64 Checkpoint: running 120 seconds; evidence build-zh-amd64.log.
- CASE-BUILD-zh-amd64 Checkpoint: second user interruption stopped matrix during mobile asset build; no final image/process or test containers remained. Preserved build-zh-amd64-interrupted.log; resume only zh-amd64, same args/source. Completed cases not invalidated, no success inferred.
- 2026-09-28T05:05:15.893215+00:00 CASE-BUILD-zh-amd64 Started: docker buildx build --builder desktop-linux --progress plain --platform linux/amd64 --load --build-arg CLI_INSTALL_CACHE_BUSTER=api001-a --build-arg BASE_IMAGE_TAG=zh -f autobyteus-server-ts/docker/Dockerfile.monorepo -t autobyteus-cli-api001:zh-amd64 .
- 2026-09-28T05:06:15.870803+00:00 CASE-BUILD-zh-amd64 Checkpoint: running 60 seconds; evidence build-zh-amd64.log.
- 2026-09-28T05:07:15.871479+00:00 CASE-BUILD-zh-amd64 Checkpoint: running 120 seconds; evidence build-zh-amd64.log.
- 2026-09-28T05:07:43.393117+00:00 CASE-BUILD-zh-amd64 Completed Pass: exit 0; evidence api-e2e-evidence/build-zh-amd64.log.
- 2026-09-28T05:07:43.393416+00:00 CASE-CLI-zh-amd64 Started: python3 scripts/tests/server_docker_cli_smoke.py --image autobyteus-cli-api001:zh-amd64 --platform linux/amd64
- 2026-09-28T05:08:24.156979+00:00 CASE-CLI-zh-amd64 Completed Pass: exit 0; evidence api-e2e-evidence/cli-zh-amd64.log.
- 2026-09-28T05:08:24.157288+00:00 CASE-LIVE-zh-amd64 Started: python3 /Users/normy/autobyteus_org/autobyteus-worktrees/server-docker-preinstalled-clis/tickets/in-progress/server-docker-preinstalled-clis/api-e2e-evidence/live_probe.py autobyteus-cli-api001:zh-amd64
- CASE-AUTH-SCOPE Recheck Completed Pass: final_inventory.py checked all four full production matrix images plus refreshed image, default image user root/HOME root, no GROK_HOME/provider key values/known token files. Both architectures report expected uname, Ubuntu24.04.5 and Node22.23.3. Exact image IDs/sizes in image-inventory.log, exit0.
- 2026-09-28T05:09:24.165294+00:00 CASE-LIVE-zh-amd64 Checkpoint: running 60 seconds; evidence live-zh-amd64.log.
- 2026-09-28T05:10:19.974629+00:00 CASE-LIVE-zh-amd64 Completed Pass: exit 0; evidence api-e2e-evidence/live-zh-amd64.log.

## Final Reconciliation
All 16 in-scope cases Pass; repository final recheck 19 tests. Both interrupted build cases resumed to completion; no unresolved/running case. Reconciled into api-e2e-execution-coverage-report.md, API-REV-001. Initial naive timestamps are Europe/Berlin; explicit +00:00 timestamps UTC. Cleanup inventory verified 27 owned volumes/37 named containers absent; image cleanup in cleanup.log.
- Cleanup complete: all six task-assigned image tags removed; 27 volumes/37 recorded containers absent. Shared builder/cache/base and unrelated resources untouched. No running validation process remains.
- Final artifact hygiene: trailing spaces/tabs normalized in retained text logs after staged diff check; no substantive output/status edits. Source/test code check unchanged.
