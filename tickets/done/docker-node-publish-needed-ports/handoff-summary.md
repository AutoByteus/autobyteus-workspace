# Handoff Summary: docker-node-publish-needed-ports (autobyteus-402, slice S0 of autobyteus-394)

- Status: verified from the evidence (audited, not redone), archived and finalized on `personal`. **No release**: none was requested, and that is the release guide's default.
- Classification: `task_size=Small`, `architectural_risk=Low`, direct route. No independent reviews; test-code review Not Required. API/E2E API-REV-001 Pass, 94.9%, every critical AC directly proven, no category below 92%.

## What Changed

- Docker nodes made by the launcher (bash and PowerShell) publish two host ports instead of four:
  - `-p B:8000`: the Backend, on every interface, as before.
  - `-p 127.0.0.1:N:6080`: the VNC Viewer, on this computer only.
- VNC 5900 (no password) and Chromium DevTools 9223 are no longer published. The friendly ports are `8001+i` / `6080+i`.
- The state keeps only the Backend and VNC Viewer ports (`BACKEND_PORT`/`NOVNC_PORT`; `backendPort`/`noVncPort`).
- The config hash moves to `v8`. A v7 node is recreated once at `upgrade --all` / `workspace apply`, keeping its ports and named volumes. The next run reuses it.
- Compose and `docker-start.sh` publish the Backend and `127.0.0.1:<port>:6080` only.
- Launcher output and help, the in-app Docker Guide (en, zh-CN) and the three READMEs describe the two ports, with the VNC Viewer as "this computer only".
- Commits: implementation `2575d870e8`, handoff `71dc90b1f1`, API/E2E `0a92a03563`.

## Integration

- `origin/personal` had moved from `6324fb056d` to `9d8077fd2a` (autobyteus-401: `RELEASE.md`, `DESIGN.md` and ticket records; no code). Merged into the ticket branch as `65ebba8291`, with no conflicts.
- Rerun on the merged state: `python3 -m unittest scripts.tests.test_public_docker_launcher_shared_workspace scripts.tests.test_public_docker_launcher_update scripts.tests.test_public_docker_launcher_stop` → `Ran 46 tests` / `OK (skipped=2)` (the same pwsh and port-8001 skips as IMP-01; both ran under pwsh in API-06 a). Artifact hygiene passed.

## Verification (audit of the evidence)

- AC-001 (bash): IMP-01 `Ran 37 tests` / `OK`. On real Docker:
  - IMP-07-07, API-07-02: `{"6080/tcp":[{"HostIp":"127.0.0.1",…}],"8000/tcp":[{"HostIp":"",…}]}`.
  - The state holds only `BACKEND_PORT`/`NOVNC_PORT`.
  - API-08: Docker's real bind error on a loopback port triggers `Port bind failed; retrying with fresh ports (attempt 2/5).`, and the new ports are still `127.0.0.1`.
- AC-002 (PowerShell):
  - API-06 a: parse and collision tests `ok` under pwsh.
  - API-06 b: native pwsh 7.4.6 on the real engine, `127.0.0.1:56186->6080/tcp, 0.0.0.0:56184->8000/tcp`. The JSON holds only `backendPort`/`noVncPort`.
- AC-003 (v7 → v8 once, same ports, volumes kept, then reuse): bash IMP-07-05/08/09/10 and PS API-06b-04/05/06 show `recreating the managed container while keeping named volumes`, the same ports, the volume marker, then `already running with the current image and launcher config`.
- AC-004 (compose): API-09 `127.0.0.1:59112->6080/tcp, 0.0.0.0:59111->8000/tcp`; the env file has only the two ports; the LAN is refused; RFB works on localhost.
- AC-005 (wording): IMP-05 specs/guards, API-11 Guide rendered in the real app, PS `urls`/`help` (API-06b-07/08).
- AC-006 / QR-001 (nothing reachable from another device):
  - IMP-07-12 and API-07-03: the VNC Viewer port is `ECONNREFUSED` on the LAN IP and `RFB 003.008` on loopback.
  - `lsof`: `IPv4 … 127.0.0.1:58396 (LISTEN)`.
  - 5900/9223 have no `PortBindings`.
- AC-007 (desktop VNC Viewer still works): API-11 screenshot. The node window's VNC Viewer tab shows `localhost:60168`, "Connected to VNC server" and the node desktop, with a 1920x1080 canvas. API-07: real noVNC 1.7.0 in Chromium connects through `ws://localhost` (`::1` refused, falls back to `127.0.0.1`).
- Fresh-start build (TESTING.md build inputs): API-10 from a fresh clone. Hygiene, licensing, install, `build:electron:mac --arm64`, Prisma and terminal-runtime checks all `exit=0`; `[typecheck] PASS`.
- No user check is needed. Everything that can be checked was checked on real Docker and in the real app.

## Residual

- The PowerShell launcher was not run on a Windows host. The changed lines are values, and they ran for real under Linux pwsh 7.4.6.
- No durable test covers real-Docker behavior (IPv4-only listener, Docker's bind-error text). The repository has no gated real-Docker launcher suite.
- For S1: the VNC Viewer port listens on IPv4 loopback only. Clients reach it through the `::1` → `127.0.0.1` fallback (Chromium and Node do this); a client that dials `[::1]` explicitly is refused.
- Wording in this ticket's requirements/design: `autobyteus-docker start` (REQ-003, REQ-006, AC-003) does not exist. The real triggers are `upgrade --all` / `workspace apply`, which the docs name.

## Release

- None. The launcher change reaches users through the public install URL, which serves the launcher from `personal`. A user who reinstalls the launcher after this merge gets v8; `upgrade --all` then recreates their nodes. The Docker Guide copy, the server's compose files and `docker-start.sh` ship with the next release the user asks for. `release-notes.md` holds the user action for that release's notes.
