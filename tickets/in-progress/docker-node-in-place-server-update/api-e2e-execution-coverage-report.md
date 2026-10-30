# API/E2E Execution Coverage Report — autobyteus-305, build step 2 (starter and server-packages volume)

The run record and the result. The plan is `api-e2e-coverage-investigation.md`; the history is `api-e2e-revision-record.md`.

Round 1 validated build step 1: API-REV-001, Pass, 95%, merged into `personal` as `eec6522b27`. That report is in git at `48c2d82ea1`. This file now holds the round-2 result.

## Round

- Coverage investigation: `/Users/normy/autobyteus_org/autobyteus-worktrees/docker-node-in-place-server-update/tickets/in-progress/docker-node-in-place-server-update/api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md`, `API-REV-002`
- Test progress log: `api-e2e-test-progress.md` (section "Round 2")
- Round and trigger: round 2, after code review Pass of build step 2 (CRR-003)
- Prior round reviewed: round 1 (step 1, Pass). No prior failure was open.
- Deviations from the investigation's plan, and why:
  - **API-21's phone part failed in the first API-12 run because of my fixture.** I paired with `http://127.0.0.1:<port>`, and the pairing policy correctly refuses local-only addresses (`REMOTE_ACCESS_PAIRING_URL_LOCAL_ONLY`, `pairing-url-policy.ts:116`). A real phone pairs with the node's private address. The second run used the test daemon's private address.
  - **API-22 (phase E) failed in the first run.** The PowerShell launcher's `new-container` throws on a fresh port pick. The cause is a bug from 2026-05 in unchanged code, also present on `origin/personal`, recorded as FU-006 (API-22 Notes). The second run created the node with a temporary patched copy of the launcher, as a fixture. The **unpatched** launcher then ran the step-2 paths: `storage`, `upgrade --all`, plain `upgrade --all`, `destroy`.
  - API-15 (amd64) was not run, as planned.
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/docker-node-in-place-server-update/tickets/in-progress/docker-node-in-place-server-update/evidence/` (round-2 files: `API-10-step2-*`, `API-11-step2-*`, `API-12-step2-*`, `API-13-step2-*`, `API-14-step2-*`, `API-21-22-*`, `API-22-*`)

## Routing Classification

- Task size: `Large`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review`
- Proportional test-code review decision: `Not Applicable`. No durable test code changed this round. The reviewer still gets the result, per the Large/High pass rule.

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-1 | `6637b54d46`: docs only on top of `5939cc48be`; code `b1029fc1b0` | macOS 26.5.2 arm64, Docker Desktop 29.0.1 | `autobyteus-server-305-test:step2` `sha256:50b3211b4b38…` (arm64, built-in package `1.5.11-beta.5`); worktree `dist` rebuilt after the base merge; Node v22.23.1; headless Chrome | Clean `env -i`; probe-owned containers on `127.0.0.1` |
| ENV-3 | same | Test-owned `docker:dind` (server 29.9.2) on the host daemon, `DOCKER_HOST=tcp://127.0.0.1:<port>` | Published `:beta` (`sha256:9657209ba499…`, Docker Hub); `step1`, `step2` and a derived image labelled `1.5.12-beta.1` (O-5) in a registry inside dind; bash launchers: `origin/personal` @ `77fb8bf2d1` (v6, as users have it installed) and this branch (v7), run by macOS `/bin/bash` 3.2.57 | Only test nodes visible to `upgrade --all`; state and shared workspace under `/private/tmp/ab305-api-e2e/api12`, the same path inside dind |
| ENV-5 | same | Linux `pwsh` 7.4.22 (`mcr.microsoft.com/dotnet/sdk:8.0` arm64, plus the docker CLI from `docker:cli`) in dind's network namespace | This branch's `autobyteus-docker.ps1` | `AUTOBYTEUS_DOCKER_STATE_DIR`/`…SHARED_WORKSPACE_DIR` set; not Windows |
| ENV-4 | same | macOS arm64, Docker 29.0.1, Compose v2.40.3 | `step2` tagged `autobyteus-server:latest` by this run; `docker-start.sh up --no-build` | Project `ab305-api-compose`; `AUTOBYTEUS_SERVER_HOST` unset for the run |

## Cases

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-20 | AC-006 (selection), REQ-011, AC-009, DS-003, DS-007, BEH-001, REQ-013 | Starter units (real child processes), launcher fakes, C1 units, lints, image build, container boot/C1/supervision/selection | Reused IMP2-01..IMP2-08 | — | Pass | — | — | `git diff --name-only 82e2e7f931 6637b54d46` touches only `tickets/`, and IMP2-05..08 used the `b1029fc1b0` inputs. IMP2-07 (server crash: exit 137, supervisord restart; stop in 0.14 s) and IMP2-08 (installed package from the volume; older current) are the evidence for CR2-S2 and the installed branch, which this round's journeys cannot reach before step 3 |
| API-10 | RU-4 | Prisma Docker probe on `step2` (worktree `dist` read-only over the package's `dist`); server pid from `cli.mjs status` | `env -i PATH="$PATH" HOME=<tmp> TMPDIR=<tmp> RUN_PRISMA_ENGINE_DOCKER_E2E=1 pnpm -C autobyteus-server-ts test:e2e:prisma-engine-discovery:docker --image sha256:50b3211b4b38e5ec1acd4ed39b9ecd000445bf365ea5cdab19face738b55eac9 --output-dir evidence/API-10-step2-prisma` | ENV-1 | Pass | `API-10-step2-prisma/console.log`, `events.jsonl`, `backend-first.json`, `backend-recreated.json`, `cleanup.json` | `"API002","result":"Pass","details":"5758 dist entries audited; 0 allowed changes"`; API003..API005 `Pass`; `backend-*.json` `"pid": "105"` / `"109"` with `"noPins": "no explicit engine pins"`; `cleanup.json` `"containersRemaining": []` | The probe's `assert.equal(starterStatus.state, 'running')` held in both rounds of its own recreation |
| API-11 | RU-4 | Nodes page in headless Chrome with a Docker node from `step2` | `env -i … pnpm -C autobyteus-web test:e2e:nodes-docker-address --docker-image=autobyteus-server-305-test:step2 --output-dir=evidence/API-11-step2-nodes-docker-address` | ENV-1 | Pass | `API-11-step2-nodes-docker-address/README.txt`, `nodes-docker-address-probe.json`, `docker-node.log`, `ND-*.png` | `"result": "Pass"`; ND-01..ND-05 `Pass`; `"imageDistDiff": {"changed": [], …}`; `docker-node.log`: `"starter":"server-started","pid":101,"version":"1.5.11-beta.5","source":"builtIn"` | Host LAN, tailnet and IPv6 addresses redacted |
| API-14 | RU-24 | PowerShell launcher sources in a real `pwsh` | The durable test's command over all five modules, including the new `ContainerConfig.ps1`, plus a broken-copy control | ENV-5 | Pass | `API-14-step2-powershell-launcher-parse.log` | 5 × `parsed: …`, `exit 0`; control `Missing ')' in function parameter list.`, `control exit 1` | — |
| API-12 | CR2-S1, CR2-S3, CR2-S4, RU-21, RU-22, RU-23, RU-26, BEH-001, REQ-012/AC-006 (selection), BEH-007/REQ-011 | Real bash launchers on a real, test-owned daemon, phases A–D | `evidence/API-12-step2-launcher.sh <worktree> evidence/API-12-step2-launcher.log` | ENV-3 | Pass (phases A–D) | `API-12-step2-launcher.log`, `API-12-step2-launcher.sh` | Every phase A–D line is `CHECK PASS`. **A** (`:beta`, installed launcher, then new launcher): `config hash label changed (v7)`, `server-packages volume mounted at /home/autobyteus/server-packages`, `the four earlier volumes kept`, `cli.mjs status: {"version":"1.5.11-beta.5","state":"running","server":{…,"source":"builtIn"}`, `supervisord runs the starter; the server is its child, cwd the built-in package, socket in env`, `state.json records the built-in package as current`, `data and root-home kept`, `launcher storage lists the server-packages volume`; `docker stop / docker start` and `launcher stop, then plain upgrade --all`: `state.json unchanged`; `five named volumes kept`. **B** (step 1 → step 2): same checks. **C** (v6 launcher runs step 2): `no server-packages volume …; state.json in the container layer`, then `recreated once for the launcher config`, `server-packages volume now mounted`. **D**: `C2 state needsNewImage, version 1.5.12-beta.1, no server`, `message names the image needed and the launcher command`, `starter up with the same pid after 60 s (no restart loop)`, `nothing listens on 8000`, `state.json not overwritten by the older image`, the log line `"starter":"needs-new-image","code":"NEEDS_NEW_IMAGE"`, `the newer image runs again` | The run's final `CHECK FAILURES: 10` are the 3 invalid phone checks (API-21, fixture) and the 7 phase-E checks (API-22, FU-006), all redone in `API-21-22-rerun.log`. **CR2-N1, observed:** in phase D the launcher's `status` prints `autobyteus-server-0 … running`; the refusal shows only in `cli.mjs status` and the node log, as the review accepted. **O-5:** the "newer release" image is `step2` with `server-package.json` `version` set to `1.5.12-beta.1` (Dockerfile in the log), the only field the selection reads. The message's `--tag 1.5.12-beta.1` matches the published tag format (Docker Hub tags `1.5.11-beta.5`, `1.5.11-beta.4`, …). **RU-23 note for step 3:** a node the installed v6 launcher recreates on the starter image keeps `state.json`, and in step 3 its installed packages, in the container layer until the new launcher recreates it with the volume |
| API-21 | AC-009 (phone), REQ-011, C1 | C1 on real launcher nodes | Phase A of API-12 (targets), then `evidence/API-21-22-rerun.sh` (phone, through the node's private address `http://172.17.0.6:<port>`) | ENV-3 | Pass | `API-12-step2-launcher.log` (section "API-21: C1 …"), `API-21-22-rerun.log`, `API-21-22-rerun.sh` | `GET /rest/node-update -> 200 {"inPlaceUpdate":"available","version":"1.5.11-beta.5","update":{"state":"idle",…}}`; `relation` `newer`/`same`/`older` for `1.5.12`/`1.5.11-beta.5`/`1.5.10`; `?target=latest -> 400 {"code":"INVALID_VERSION",…}`. Rerun: `pairing exchange -> 201, credential mra_… (redacted)`; `control: phone credential on GraphQL -> 200`; `control: an unknown mra_ credential on GraphQL -> 401`; `phone credential on C1 -> 403 {…"code":"REMOTE_ACCESS_AUTH_INVALID","message":"Mobile credentials do not authorize owner-management routes."}`; `revoked credential no longer accepted`; `the credential value appears in no container log`; `CHECK FAILURES: 0` | First run: invalid fixture (loopback pairing URL; `pairing session -> 400`). Its "phone" requests carried `Bearer undefined`, which is no mobile credential, so their 200s prove nothing; I discarded them. The pairing code and credential are redacted in the logs |
| API-22 | RU-24, BEH-001, DEC-014 | The real PowerShell launcher against the test daemon | `evidence/API-21-22-rerun.sh` section API-22: node created by a patched copy (`,$ports`, diff in the log); the unpatched launcher runs `storage`, `upgrade --all --image <step2>`, plain `upgrade --all`, `destroy --all`; finally the unpatched `new-container` again | ENV-5 | Pass (step-2 paths); pre-existing bug reproduced → FU-006 | `API-21-22-rerun.log`, `API-22-cause.log`, `API-22-cause-demo.ps1` | `PowerShell storage lists the server-packages volume`, `PowerShell upgrade recreated the node`, `starter running the built-in package; state.json in the volume`, `no removed env from the PowerShell launcher`, `PowerShell plain upgrade keeps the container`, `PowerShell destroy kept the five volumes`; `BUG REPRODUCED: the unpatched new-container created no container`. Cause log: `ERR: You cannot call a method on a null-valued expression.` `at Pick-Port, … DockerRuntime.ps1: line 137`, the same on `origin/personal`; `0 port(s): '$p' returns null` | **Cause** (`API-22-cause.log`): `Get-UsedPorts` returns its `HashSet[int]` through the pipeline, so PowerShell unrolls it. An empty set comes back `$null`, one port an `Int32`, several an `Object[]`. `Pick-Port` then fails on `.Contains`/`.Add`. It is present since `517a0bce53` (2026-05) and on `origin/personal`, so this ticket did not cause it. Fresh port picks (`new-container`, `reset`, a recreate after "Saved ports are unavailable") fail. `upgrade --all` keeps saved ports, so the step-2 paths work. **Scope** (`ticket-scope.md`): node creation is not this ticket's functionality, and the in-scope paths pass with the unpatched launcher, so it is a follow-up, FU-006. Linux `pwsh`, not Windows: the unrolling is the same in Windows PowerShell 5.1 and 7 |
| API-13 | RU-25 | Compose with the step-2 image | `evidence/API-13-step2-compose.sh <worktree> evidence/API-13-step2-compose.log` (`docker-start.sh up --no-build -p ab305-api-compose`, `docker compose restart`, `down --volumes --delete-state`) | ENV-4 | Pass | `API-13-step2-compose.log`, `API-13-step2-compose.sh` | `server-packages volume mounted`, `starter running the built-in package`, `state.json is in the project's server-packages volume`, `healthy after compose restart`, `state.json unchanged after the restart`, `project container and volumes removed`, `CHECK FAILURES: 0` | The image build path is IMP2-05 |
| API-15 | — | amd64 | Not run | — | Not Tested | — | — | No amd64 step-2 image. The starter is architecture-independent JavaScript, its architecture-fit rule is unit-tested (IMP2-01), and the package build is unchanged since step 1's amd64 proof (round 1 API-15) |

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | For A User-Only Part |
| --- | --- | --- | --- | --- |
| AC-006 / REQ-012, boot-selection part: an older image never replaces the version a node already ran; it refuses with `NEEDS_NEW_IMAGE` and the command; a node keeps running the newest version it may run | Yes | API-12 D (through the launcher), API-20 (IMP2-01 8 selection cases; IMP2-08 installed-package and older-current boots) | Proven for step 2. "The node keeps C after an in-place update" needs step 3's update | — |
| BEH-001 / DEC-014: `upgrade --all` moves a node to the starter image once (v7), keeps every volume and the data, adds the server-packages volume; stop/start and plain upgrades keep the chosen package | Yes | API-12 A, B, C; API-22 (PowerShell); API-13 (compose) | Proven | — |
| REQ-011 / BEH-007, status part: the node reports its version, its last update state and the target relation (C2 and C1) | Yes | API-12 (every phase's `cli.mjs status`), API-21, API-10, API-20 (IMP2-06) | Proven for step 2 (the desktop display is step 4) | — |
| AC-009, phone part: a phone credential is refused on the update surface | Yes | API-21 (real paired phone: 403; positive and negative controls), API-20 (route-policy unit) | Proven. The agent-tool and log parts are steps 3–4 | — |
| DS-007: one owner of the server child; crash and stop behavior | Yes | API-20 (IMP2-01, IMP2-07), API-12 A (child of the starter in its own group; stop/start) | Proven | — |
| AC-001..AC-005, AC-007, AC-008, AC-010, AC-012, AC-013 | — | — | Not in step 2 | Steps 3–5 |

No criterion in step 2 needs the user.

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | What Supports It | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 85% | 95% | API-12, API-21, API-22, API-20 | The installed-package branch is reachable only through IMP2-08's written state until step 3 | Step 3 |
| Changed-boundary execution directness | 80% | 95% | Real launchers (bash v6 and v7, PowerShell), real daemon, a real paired phone, real compose | — | — |
| Cross-boundary integration realism and mock gap | 85% | 95% | The C1 relay over the real socket in launcher nodes; data written by released servers. The only emulation is the version label in phase D (O-5), the one field the selection reads | — | — |
| Environment, configuration, identity, and fixture fidelity | 85% | 95% | macOS `/bin/bash` 3.2, the installed launcher from `origin/personal`, Docker Hub `:beta`. PowerShell ran on Linux `pwsh`; the step-2 PowerShell change is platform-neutral argument and text building | Windows path specifics (unchanged by step 2) | A Windows host |
| Failure, edge-case, lifecycle, and recovery evidence | 90% | 95% | `NEEDS_NEW_IMAGE` with no restart loop, stop/start, launcher stop/start, v6 to v7, crash and stop timing (IMP2-07) | Boot recovery of a trial is reachable only from step 3 (D-3; unit-tested) | Step 3 |
| User-surface, browser, and desktop-shell confidence | 95% | 95% | API-11 | No UI change in step 2 | — |
| Durable regression coverage quality and relevance | 90% | 93% | 26 starter tests, C1 and route tests, launcher fake-docker tests, both Docker probes on the step-2 image | The PowerShell launcher has only text and parse tests; API-22 executed it once, and found a pre-existing bug (FU-006) the durable tests could not catch | FU-006's pwsh-executed test |

- Overall post-repository confidence: 87% (after the reused checks, API-10, API-11 and API-14; below 90% in four categories, so broader validation was required)
- Overall final confidence: 94.7% (simple average)
- Every critical acceptance criterion directly proven, apart from parts only the user can check: `Yes`
- Any final applicable category below `90%`: `No`
- Default final confidence target of `95%` met: `No`, 94.7%. The gap is durable execution coverage of the PowerShell launcher. The surface that closes it is a pwsh-executed launcher test, which is FU-006's fix of a pre-existing gap and outside this ticket. No in-scope behavior is unproven: API-22 executed every step-2 PowerShell path.
- Confidence-limiting residual risks: FU-006 (Windows owners cannot create nodes with the PowerShell launcher; pre-existing); CR2-N1 (accepted); RU-23 (installed-launcher users keep starter state in the container layer until they reinstall the launcher, relevant to step 3).

## Broader Validation Decision (Mandatory)

- Decision: `Required` (executed)
- Execution mode: `Lifecycle` (launchers on a test-owned daemon, compose), `Live API` (C1 with a real phone credential), `Browser` (API-11), `CLI` (`pwsh`, `cli.mjs`)
- Gap addressed: the repository evidence used fake docker for the launchers, started the image only bare (IMP2-06..08), used a made-up phone bearer, and never executed the PowerShell launcher.
- Browser validation: the existing probe (API-11), because a Docker node behind the Nodes page now runs under the starter.

## Persisted-Data Transition Checks (When Applicable)

- Approved decision: `Not Affected` for the data folder; new starter state with one writer.
- Representative existing data:
  - agent definitions written through GraphQL by the published `:beta` (A) and by step 1 (B, C), plus `/root` files;
  - `state.json` after boot.
- Approved transition followed without an unnecessary migration: `Yes`
- Cases proving it:
  - API-12 A/B/C: data read back after the move;
  - API-12 A and API-13: `state.json` unchanged across stop/start and a compose restart;
  - API-12 D: an older image does not overwrite `state.json`.
- Version-specific branch or fallback observed: `No`
- Residual: RU-23. With the installed v6 launcher, `state.json` lives in the container layer until the next recreate by the new launcher. In step 2 that loses nothing (the next boot chooses the built-in package again). For step 3, an in-place installed package on such a node would be lost on the old launcher's next image-change recreate. Noted for the Solution Designer as part of this result; no change is needed in step 2.

## Compatibility / Legacy Scope Check

- Backward compatibility introduced or tolerated in scope: `No`
- Compatibility-only or legacy-retention behavior observed: `No`. Phase C shows the new image running under the old launcher's arguments without any special path.
- Durable coverage only for compatibility: `No`

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `No`. The PowerShell parse test already lists `ContainerConfig.ps1`.
- Paths attached for test-code review: `Not Applicable`

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| The user's host daemon for `upgrade --all` | Test-owned `docker:dind` | `upgrade --all` reaches every launcher-labelled container (O-1) | None for the launcher logic |
| "A newer release" image | `step2` with `server-package.json` `version` = `1.5.12-beta.1` (O-5) | Only one real step-2 version exists | The server inside still reports its own package version; the selection reads only this field |
| Windows | Linux `pwsh` 7.4.22 | No Windows host | Windows default paths unexercised (unchanged by step 2) |
| The PowerShell `new-container` | A patched copy (`,$ports`) to create the test node | FU-006 blocks it in unchanged code | The step-2 PowerShell paths ran unpatched |

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup Action | Result |
| --- | --- | --- | --- |
| API-10/API-11 probe stacks | Yes | Probe cleanup | `containersRemaining: []`, `rootAbsent: true`; `serversLeft: 0`, `rootRemoved: true` |
| `ab305-api-dind` and its volume (all API-12/21/22 nodes, volumes, registry, the derived image, holder containers) | Yes | `docker rm -f -v`, `docker volume rm` | Removed |
| `ab305-api-pwsh-docker`, `mcr.microsoft.com/dotnet/sdk:8.0`, `docker:cli`, `docker:dind` | Yes | `docker image rm` | Removed |
| Compose project `ab305-api-compose` (volumes, network, `.runtime` env) and the `autobyteus-server:latest` tag | Yes | `down --volumes --delete-state`; untag | Removed |
| `/private/tmp/ab305-api-e2e` | Yes | `rm -rf` after commit; scripts are kept in `evidence/` | Removed |
| `autobyteus-server-305-test:step1`, `:step1-amd64`, `:step2`; container `ab305-extract` | No (implementation) | Not touched | Kept |
| `autobyteus-server-0/1/2` and their volumes | No (the user's) | Never touched | Untouched |

## Latest Authoritative Result

- Result: `Pass`
- Criteria not proven, or parts only the user can check: none for step 2
- Preliminary classification and recommended owner (on `Fail`): `N/A`
- Next recipient from `get_handoff_rules`: code reviewer (Large/High pass rule; no test code changed)
- Notes:
  - FU-006 is added to `follow-ups.md` (pre-existing PowerShell launcher bug, outside this ticket).
  - CR2-N1 was observed as the review described.
  - RU-23 is a design note for step 3.
