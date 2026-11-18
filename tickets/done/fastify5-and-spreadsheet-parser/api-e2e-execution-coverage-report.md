# API/E2E Execution Coverage Report — fastify5-and-spreadsheet-parser

The run record and the result. The plan is in `api-e2e-coverage-investigation.md`; the history across rounds is in `api-e2e-revision-record.md`.

## Round

- Coverage investigation: `api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md`, `API-REV-001`
- Test progress log: `api-e2e-test-progress.md`
- Round and trigger: round 1, after code review CRR-002 passed (handoff from `/software_engineering_team/code_reviewer`)
- Prior round reviewed: none
- Deviations from the investigation's plan, and why:
  - **API-03b added.** The E2E folder hit one failure. TESTING.md Rule 9 requires finding the cause and fixing a test-caused failure in the branch as its own baseline commit, so the cause was reproduced, fixed (`09baa03b86`) and the file rerun.
  - **API-06 needed a throwaway `CODEX_HOME`.** The only bundled applications refuse to start the standalone host without a signed-in Codex account. A throwaway `CODEX_HOME` holding only a symlink to the user's `auth.json`, the pattern TESTING.md allows, got past that. No Codex run was started.
  - **API-07 registered the workspace through GraphQL.** The fixture workspace was created with GraphQL `createWorkspace` (a public API) and then chosen in the composer through the "Open another folder…" typed-path form. The Browse… button opens a native picker, which automation cannot drive.
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/fastify5-and-spreadsheet-parser/tickets/in-progress/fastify5-and-spreadsheet-parser/evidence/` (files `API-*`). The probes used are in `probes/api-04-live-http-probe.mjs` and `probes/api-05-upload-limit-probe.mjs`.

## Routing Classification

- Task size: `Medium`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review` (proportional test-code review of the changed durable tests)
- Proportional test-code review decision: `Required`

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-1 | worktree `4dcdceea11` (code `25a45ee5d3`); test commits `09baa03b86`, `8e5967e393` | macOS 26.5.2 arm64 | Node 22.23.1, pnpm 10.28.2; `pnpm install --frozen-lockfile`, `prebuild`, server `build` at HEAD; fastify 5.12.7, mercurius 16.12.1 | `env -i PATH HOME=<temp> TMPDIR` for every vitest and server run (the shell carries 24 live-app `AUTOBYTEUS_*` variables) |
| ENV-2 | base `ddd6fdcdf6` in `/tmp/ab-api/base` (clone) | same | same tooling; fastify 4.29.1, mercurius 13.4.1, multipart 8.3.1 | separate test DB and data dirs; clean env |
| ENV-3 | ENV-1 and ENV-2 builds running `node autobyteus-server-ts/dist/app.js --host 0.0.0.0 --port <free> --data-dir <test-owned>` | same | `.env` = `APP_ENV=production`, `AUTOBYTEUS_SERVER_HOST` (as `docker/entrypoint.sh` writes) | clients: `127.0.0.1` and the LAN address `192.168.2.158` (en0), a non-loopback socket address and `Host` |
| ENV-4 | clean clone of `4dcdceea11` (`/tmp/ab-api/clone`) | Docker 29.0.1 (macOS host) | image `ab-server-api:test` from `autobyteus-server-ts/docker/Dockerfile.monorepo`; Node 22.23.3 inside | test-owned container on `127.0.0.1:<free>`, no volumes; the user's `autobyteus-server-*` containers untouched |
| ENV-5 | same clean clone | macOS 26.5.2 arm64 | packaged AutoByteus.app (Electron) via `isolated-app start --build`, instance `iso-57435-8370`, own data root and ports | LM Studio `qwen/qwen3.6-35b-a3b` at `127.0.0.1:1234` (local, no key); browser-automation attach-only on the control port; window viewport 2400×1536 |
| ENV-6 | ENV-1 | same | `autobyteus-application-devkit/dist/cli.js start` for `applications/brief-studio` | `--host 0.0.0.0 --public-base-url http://192.168.2.158:<port>`; throwaway `CODEX_HOME` (empty `config.toml`, `auth.json` symlink) removed afterwards |

## Cases

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-R1 | AC-001, AC-011, QR-001 | root lockfile audit | IMP-12 | — | Pass | (IMP-12) | (IMP-12 row) | Still holds: `git diff --name-only 5c7ab7426c HEAD -- pnpm-lock.yaml` is empty |
| API-R2 | AC-011, REQ-009, REQ-013 | clean-clone cold install | IMP-16 | — | Pass | (IMP-16) | (IMP-16 row) | Lockfiles unchanged since `29aeb5d721`. My clean clone also installed frozen (ENV-4/5) |
| API-R3 | AC-002 | server typecheck, unit, integration, build | IMP-07, IMP-09, IMP-11 + IMP-13, IMP-15 | — | Pass | (IMP rows) | (IMP rows) | Since `29aeb5d721`, only the gateway Dockerfile changed outside `tickets/`. My two test commits add one integration file (API-01) and change one e2e file (API-03b); both ran |
| API-R4 | AC-009, REQ-005..007 | gateway install/typecheck/test/audit | IMP-10 | — | Pass | (IMP-10) | (IMP-10 row) | Since `5c7ab7426c` only `docker/Dockerfile` changed in the gateway, which the install does not read |
| API-R5 | AC-010, REQ-008, REQ-013 | gateway image | IMP-20 | — | Pass | (IMP-20) | (IMP-20 row) | Ran on `25a45ee5d3`, the current gateway code, from a clean clone |
| API-R6 | AC-012, AC-013 | viewer spec (real parser), sanitiser mutation, rendered Chrome page | IMP-02, IMP-03, IMP-14 | — | Pass | (IMP rows) | (IMP rows) | `autobyteus-web` unchanged since `195db3c42e`. API-07 repeats the injection and hyperlink checks in the packaged app |
| API-01 | AC-003, AC-004, AC-005, REQ-004 | real studio server over HTTP (durable test) | `env -i … pnpm -C autobyteus-server-ts exec vitest run tests/integration/api/studio-server-http-contract.integration.test.ts --no-watch`, run three ways: (1) on base, (2) on the branch, (3) on the branch with `{ config: { cors: false } }` re-added to `mcp-gateway-routes.ts` (restored afterwards) | ENV-1, ENV-2 | Pass | `API-01-studio-http-contract-test.log` | Branch `Tests  4 passed (4)`. Base: `expected { path: '/graphiql', status: 200 } to deeply equal { path: '/graphiql', status: 404 }` and `:114:33` fail, while the two MCP cases pass (`Tests  2 failed \| 2 passed (4)`). Mutation: `adds the studio CORS plugin's headers…` fails at `:151:39` (`expected { vary: 'Origin' } to deeply equal { …(2) }`) | The base run shows the MCP header contract is the base contract and the GraphiQL cases detect the DEC-001 change. The mutation shows the test catches a `cors: false` regression |
| API-03 | AC-002, REQ-002 | server E2E folder (194 files) | `env -i PATH HOME=<temp> TMPDIR pnpm test:e2e` in the worktree, server dist built at HEAD | ENV-1 | Fail → resolved by API-03b (cause in the test, unrelated to the change) | `API-03-server-e2e-folder.log` | `Test Files  1 failed \| 100 passed \| 93 skipped (194)`, `Tests  1 failed \| 434 passed \| 458 skipped (893)`. The only failure is `phone-access-running-routes.e2e.test.ts:212:44` `expected 503 to be 200` | Skips are gated live suites (`RUN_*`). API-20/21/22 (FU-004) pass in the clean environment. Cause of the failure: the test builds its own app without startup capability readiness, so `NodeIdentityService` answers `NODE_IDENTITY_NOT_MIGRATED` (503). Reproduced on base, and passes with `configureNodeIdentityCapability(true)` (base clone, temporary edit reverted). Not caused by the Fastify move: no remote-access or node-identity code differs from base |
| API-03b | AC-002 | phone-access e2e after the baseline fix | `env -i … pnpm -C autobyteus-server-ts exec vitest run tests/e2e/remote-access/phone-access-running-routes.e2e.test.ts --no-watch` | ENV-1 | Pass | `API-03b-phone-access-baseline-fix.log` | the diff adding `configureNodeIdentityCapability(true);` and `Tests  2 passed (2)` | Baseline fix commit `09baa03b86` (TESTING.md Rule 9). With it the whole E2E folder has no failure on the branch |
| API-04 | AC-003, AC-004, AC-005 | live built servers, base vs branch, loopback and LAN clients | `node probes/api-04-live-http-probe.mjs <port> 192.168.2.158` against ENV-3 base, then branch; `diff` | ENV-3 | Pass | `API-04-live-http-base-vs-branch.log` | Under `## diff base -> branch`, only the `/graphiql*` lines (base `status=200 … text/html`, branch `status=404`) and the `WS /graphql graphql-transport-ws` line (base `timeout`, branch `first=connection_ack`) differ. Every MCP gateway line is the same (loopback POST `status=200` with `access-control-allow-origin`, LAN POST `status=401`, foreign `403`, preflights `204`), `lan \| GET /graphql…` is `404 … REMOTE_ACCESS_ROUTE_UNSUPPORTED` on both, and `WS /ws/projects` gives `first type=connected` on both | Base's GraphQL-WS failure: `Cannot read properties of undefined (reading 'protocol')` in mercurius 13.4.1 `lib/subscription.js` with `@fastify/websocket` 10 (Observation OBS-1) |
| API-05 | AC-006, BEH-005 | live multipart upload at the 25 MiB studio limit, base vs branch | `node probes/api-05-upload-limit-probe.mjs <port> <data dir>` against ENV-3 base, then branch | ENV-3 | Pass | `API-05-upload-limits-base-vs-branch.log` | `NO DIFFERENCE`. On both: `/rest/upload-file` `LIMIT`→`status=200`, `LIMIT+1`→`status=413 \| detail="Uploaded file is too large."` with `files>=1MiB after: []`; `/rest/context-files/upload` `LIMIT`→`200`, `LIMIT+1`→`status=400 \| detail="Uploaded file is too large."`, nothing left behind | Covers the studio's real multipart configuration (`limits.fileSize` only), which repository tests do not use |
| API-06 | implementation-handoff Known Risk (`listen()` return), REQ-002 | standalone host on an explicit wildcard bind | `autobyteus-app start --host 0.0.0.0 --port <p> --public-base-url http://192.168.2.158:<p>` in `applications/brief-studio`; fetch the printed URL and the LAN URL | ENV-6 | Pass | `API-06-standalone-wildcard-printed-url.log` | `Standalone application ready: http://127.0.0.1:57176`; `GET http://127.0.0.1:57176/ -> 200 text/html`; `GET http://192.168.2.158:57176/ -> 200 text/html`; one socket `node *:57176` | The printed URL changed form (Fastify 5) and works. A non-loopback bind requires `--public-base-url`. That comes from `standalone-application-host-config.ts`, which this ticket does not change (read, not run on base) |
| API-07 | AC-007, AC-014, REQ-003, REQ-010, REQ-011, REQ-013 | packaged desktop app from a clean clone | `isolated-app start --build`; LM Studio discovered in Settings; composer workspace `ws-fixture` and model `qwen/qwen3.6-35b-a3b`; message sent; Files panel → `generated-sample.xlsx` and `.xls`; DOM reads; stop | ENV-5 | Pass | `API-07-packaged-app-journey.log`, `API-07-packaged-app/API-07-xls-viewer.png`, `API-07-packaged-app/API-07-xls-fruits.png` | §2 `fastify@5.12.7 … mercurius@16.12.1`. §5 `/ws/agent/<runId>` `"SEGMENT_CONTENT": 19`, `"ASSISTANT_COMPLETE": 1`, `"TURN_COMPLETED": 1`, and "The fastify five check passed successfully." §6 `"graphqlRequests": 169, "byStatus": {"200": 169}`. §7/§8 for both files: `"tags": ["table","tbody","td","tr"]`, `"attrs": []`, `"anchors": 0`, cells including `"<b>bold?</b>"` and `"evil"`, `"pwned": null`, `"hashUnchanged": true`, the Notes tab active after the switch. §9 both fetched `status 200` from `/rest/workspaces/<id>/content` | Screenshots support the DOM proof; they show the reply and the `.xls` sheets. Earlier frames from this instance were stale; the DOM was read throughout |
| API-08 | AC-008, REQ-003, REQ-013, SCN-A1 | server Docker image from a clean clone | build from `/tmp/ab-api/clone`; `docker run -d -p 127.0.0.1:<free>:8000` without volumes; API-04 probe from the host; curl uploads; checks inside the container; versions; mobile bundle; `docker rm -f -v`, `rmi` | ENV-4 | Pass | `API-08-server-container.log` | `# build exit: 0`; `GET /rest/health \| status=200`; `POST /graphql \| status=200 … {"data":{"__typename":"Query"}}`; `WS /graphql graphql-transport-ws \| protocol=graphql-transport-ws first=connection_ack`; `WS /ws/projects \| first type=connected`; `upload-file LIMIT+1: … status=413`; `GET /graphiql -> 404` inside and from the host; host `GET /graphql` `404 … REMOTE_ACCESS_ROUTE_UNSUPPORTED` against inside `200`; `IDENTICAL to API-04 branch LAN-client lines`; mobile bundle `sanitize(o,{ALLOWED_TAGS:["table",…],ALLOWED_ATTR:["colspan","rowspan"],ALLOW_DATA_ATTR:!1}`; `xlsx@https+++cdn.sheetjs.com+xlsx-0.20.3`; `error-level (level 50) entries: 0` | Host clients arrive non-loopback inside the container (the trusted-network path). Cleanup at the end of the file |

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | For A User-Only Part: What You Tried And Why It Still Needs The User |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | API-R1 | Proven | — |
| AC-002 | Yes | API-R3, API-03, API-03b | Proven | — (the one E2E failure was test-caused, identical on base, and fixed as a baseline commit) |
| AC-003 | Yes | API-01, API-04, API-R3 (IMP-06/08, MCP suites) | Proven | — |
| AC-004 | Yes | API-01, API-04, API-08 | Proven | — |
| AC-005 | Yes | API-01, API-04, API-08 | Proven | — (`/graphiql*` 404 everywhere per DEC-001; `POST /graphql` unchanged; see OBS-1 for the WS handshake) |
| AC-006 | Yes | API-05, API-08, API-R3 | Proven | — |
| AC-007 | Yes | API-07 | Proven | — |
| AC-008 | Yes | API-08 | Proven | — |
| AC-009 | Yes | API-R4 | Proven | — |
| AC-010 | Yes | API-R5 | Proven | — |
| AC-011 | Yes | API-R1, API-R2, API-08 | Proven | — |
| AC-012 | Yes | API-R6, API-07 | Proven | — |
| AC-013 | Yes | API-R6, API-07 | Proven | — |
| AC-014 | Yes | API-07 | Proven | — |
| REQ-003 Termux part | No (no AC) | — | Only The User Can Check | No Android device or Termux environment here. The same server build runs on Node 22 in the packaged app (API-07) and in Docker (API-08), and Fastify 5 supports Node ≥20. A Termux check needs the user's phone |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | What Supports It (Case IDs) | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 80% | 95% | Repository: API-R1..R6, API-01, API-03/03b. Final: + API-04, 05, 07, 08 | Termux not run (user-only) | Termux run on a phone |
| Changed-boundary execution directness | 85% | 95% | Real HTTP on the real studio composition (API-01); live base vs branch over sockets (API-04/05); packaged app (API-07); container (API-08) | Agent-tools listener CORS is proven by inject (IMP-06/08) and the listener's HTTP test, not by a live run session | — |
| Cross-boundary integration realism and mock gap | 75% | 95% | Real LM Studio run streaming through the packaged app's embedded server; real multipart; real Docker NAT client | — | — |
| Environment, configuration, identity, and fixture fidelity | 85% | 95% | Clean clones; clean env; test-owned containers and data roots; generated fixtures only | LAN client is the same machine's NIC (a real non-loopback socket, not a second device) | A second device on the LAN |
| Failure, edge-case, lifecycle, and recovery evidence | 85% | 95% | Upload limit ±1 byte and no leftover file; foreign origin and preflight rejections; non-loopback refusals; injection and `javascript:` cell click; fetch error + Retry (IMP-02); container and instance start/stop | — | — |
| User-surface, browser, and desktop-shell confidence | 70% | 95% | API-07 (packaged shell, embedded server, renderer bundle), IMP-14 (Chrome), API-08 (mobile bundle carries the sanitiser) | The phone's mobile web viewer was not driven in a phone browser; it is the same component and bundle content as the proven ones | Drive `/mobile` in a mobile browser |
| Durable regression coverage quality and relevance | 90% | 95% | API-01 proven discriminating on base and by mutation; real-parser viewer spec; baseline E2E fix | — | — |

- Overall post-repository confidence: 81% (simple average)
- Overall final confidence: 95%
- Calculation method: simple average of the seven categories
- Every critical acceptance criterion directly proven, apart from parts only the user can check: `Yes`
- Any final applicable category below `90%`: `No`
- Default final confidence target of `95%` met: `Yes`
- Confidence-limiting residual risks: Termux not run; the mobile web viewer not driven in a phone browser; FU-008 (deprecation warning at startup, no behavior impact)

## Broader Validation Decision (Mandatory)

- Decision: `Required` (executed)
- Execution mode: `Live API` (API-04/05/06), `Project Desktop Validation` (API-07), `Other: Docker container` (API-08)
- Confidence gap or residual risk it addresses, and the expected gain: repository tests use `inject` and mocks for the socket address, CORS over HTTP, the studio multipart config, the packaged embedded server and WebSocket streaming. The live checks remove each of those gaps (81% → 95%)
- Browser validation needed, and why or why not: yes for the viewer in the real product. It was done inside the packaged Electron renderer (API-07) rather than a separate browser probe, because IMP-14 already proved the web-equivalent rendering in Chrome
- If `Not Required`: N/A
- If `Blocked`: N/A

## Desktop Application Validation

- Approach executed: isolated packaged instance from a clean clone, driven with browser-automation attach-only (API-07); as planned
- Cases proving web-equivalent behavior: API-R6 (IMP-14), API-07 viewer DOM. Cases proving shell-specific or lifecycle behavior: API-07 (embedded server start on Fastify 5, packaged renderer bundle, run streaming through the shell's server, instance stop and data-root removal)
- Effect on any already-running desktop application: `None`. The user's app, data and containers were not touched; the isolated-app `list` is empty afterwards
- Behavior not directly proven and its confidence consequence: none within the ACs

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No` (`/graphiql*` is a clean 404; no flag)
- Durable coverage added or retained only for compatibility-only behavior: `No`
- If compatibility-related invalid scope was observed, reroute classification used: N/A
- Upstream recipient notified: N/A

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `Yes`

| Path / Test | Change | Case IDs | For A Removal |
| --- | --- | --- | --- |
| `autobyteus-server-ts/tests/integration/api/studio-server-http-contract.integration.test.ts` (commit `8e5967e393`) | Added | API-01 | — |
| `autobyteus-server-ts/tests/e2e/remote-access/phone-access-running-routes.e2e.test.ts` (commit `09baa03b86`, baseline fix) | Updated | API-03, API-03b | — |

- Added or updated paths attached for proportional test-code review: `Yes`
- Diff or repository evidence supplied for removed paths: N/A (none removed)

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| Trusted-network client in API-01 | `fastify.inject({ remoteAddress: "192.168.1.50" })` | A durable test cannot rely on a machine's LAN interface | None: API-04 and API-08 use real non-loopback sockets |
| Model provider for the run | Local LM Studio model instead of a paid provider | No credit spend is needed to prove streaming | None for transport (TESTING.md: a local or scripted runtime proves the transport, not paid inference) |
| Codex login for API-06 | Throwaway `CODEX_HOME` with an `auth.json` symlink | The bundled applications require a signed-in Codex; no run was started | None |

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup Action | Result |
| --- | --- | --- | --- |
| Base clone `/tmp/ab-api/base`, clean clone `/tmp/ab-api/clone`, temp homes, live data dirs, fixtures | Yes | `rm -rf /tmp/ab-api` after the evidence was written | Removed |
| Live servers (ENV-3), standalone host (ENV-6) | Yes | `kill` / SIGINT; checked no leftover process | Stopped; 0 leftover |
| Container `ab-server-api-test`, image `ab-server-api:test` | Yes | `docker rm -f -v`, `docker rmi` | Removed (evidence end of API-08) |
| Isolated instance `iso-57435-8370` | Yes | `isolated-app stop` | `dataRootRemoved: true`, `list` empty |
| LM Studio `qwen/qwen3.6-35b-a3b`, loaded just-in-time by this run | Yes | `lms unload` | `not-loaded` |
| Renderer WebSocket recorder, `data-ab-target` marker attributes | Yes | In-memory only; gone with the instance | Removed |
| Temporary edits: base-clone phone-access diagnostic; `cors: false` mutation | Yes | Restored from copies | `git status` clean for `src/`; base clone removed |
| Throwaway `CODEX_HOME` | Yes | `rm -rf` | Removed |

## Observations (non-blocking)

- **OBS-1. GraphQL-over-WebSocket works on the branch and was broken on base.** On base (mercurius 13.4.1 with `@fastify/websocket` 10), every `/graphql` WebSocket closes with 1006 right after the upgrade. Base logs `TypeError: Cannot read properties of undefined (reading 'protocol')` at `mercurius/lib/subscription.js:13`: mercurius reads `connection.socket`, but websocket 10 passes the socket itself. The branch acks `graphql-transport-ws` (API-04, API-08). The server schema has no subscription fields, and the app streams over its own `/ws/*` routes, which behave the same on base and branch, so no product consumer saw either state. This is information for the Solution Designer and delivery: AC-005's "subscriptions unchanged" holds for everything a client can do. It is not a regression.
- **OBS-2 (FU-008).** Fastify 5.12 prints `FSTDEP023` (deprecated `disableRequestLogging`) twice at startup. It is not a contract change, so it is recorded as a follow-up.

## Latest Authoritative Result

- Result: `Pass`
- Criteria not proven, or parts only the user can check (IDs): REQ-003 Termux part (user-only; no AC)
- Preliminary classification and recommended owner (on `Fail`): N/A
- Next recipient from `get_handoff_rules`: code reviewer (proportional test-code review)
- Notes: FU-004 is updated with the causes found. FU-008 is added
