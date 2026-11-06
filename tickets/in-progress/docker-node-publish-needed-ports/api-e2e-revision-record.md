# API/E2E Revision Record — autobyteus-402

The latest coverage investigation and execution coverage report remain authoritative.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | implementation_engineer, `implementation-handoff.md`, round 1 | SR-001, IR-001 | N/A | Pass / 94.9% |

## Revision Entries

### API-REV-001 — Baseline: real Docker for both launchers, `localhost` VNC Viewer in the real app, fresh-start build

- Triggering role, report path, and round: implementation_engineer, `implementation-handoff.md` (IR-001, commits `2575d870e8` / `71dc90b1f1`), round 1, direct low-risk route
- Triggering finding or case IDs: N/A (initial)
- Related revision IDs: SR-001, IR-001
- Why this baseline was recorded: first validation of the change
- Coverage decisions or durable test paths changed: none. The implementation's updated launcher tests were judged valid against the approved behavior.
- Cases added: API-01..05 reuse IMP-01/02/04/05/07. New cases:
  - API-06: PowerShell under real pwsh, unit file + real v7→v8 node.
  - API-07: `localhost` VNC Viewer transport in Chromium + Node, with `::1` / LAN controls.
  - API-08: real loopback bind-failure retry.
  - API-09: `docker-start.sh` + compose on real Docker.
  - API-10: fresh-start desktop release build.
  - API-11: isolated desktop instance, node window VNC Viewer and the Docker Guide copy.
- Commands, environment, fixture, or broader-validation delta: temp state/shared dirs; test names `abx402-api-node`, `abx402-ps-node`, project `abx402-compose`. `new-container` was deliberately not used on real Docker, because it would have taken `autobyteus-server-3` and mounted the user's leftover `autobyteus-server-3-*` volumes. pwsh ran natively on arm64 after the amd64-emulated pwsh crashed.

#### Prior Failure Resolution

None.

- Canonical artifacts and sections updated: `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, `api-e2e-test-progress.md`, `evidence/API-*`
- Prior result and confidence: N/A
- Current result and confidence: Pass, 94.9%. Every critical AC is directly proven. The gap to 95% is PowerShell on a Windows host (no Windows machine) and the lack of a durable real-Docker suite (outside this ticket).
- New or remaining failure IDs: none
- Recommended owner: N/A
- Remaining risks, blocked evidence, or untested scope:
  - PS launcher on a Windows host is not run.
  - Wording: `autobyteus-docker start` in REQ-003/REQ-006/AC-003 and the design does not exist; `upgrade --all` / `workspace apply` were validated.
  - Observation for S1: the VNC Viewer port is IPv4-loopback only. Clients reach it through the `::1` → `127.0.0.1` fallback.
