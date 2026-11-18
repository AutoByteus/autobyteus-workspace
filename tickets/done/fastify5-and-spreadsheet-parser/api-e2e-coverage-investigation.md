# API/E2E Coverage Investigation — fastify5-and-spreadsheet-parser

The plan: what must be proven, how, the decisions about existing tests, and the planned cases. Results, confidence scores and the broader-validation decision are in `api-e2e-execution-coverage-report.md`.

## Investigation Meta

- Requirements Doc: `requirements-doc.md` (Approved, SR-004)
- Investigation Notes: `investigation-notes.md`
- Solution Revision Record: `solution-revision-record.md`
- Design Spec (required on every route): `design-spec.md` (SR-004, `Ready`)
- Supplemental Task Artifacts: `evidence/SD-01`..`SD-09`, `probes/`, `follow-ups.md` (FU-001..FU-007)
- Design Review Report: `design-review-report.md` (ARCH-REV-002, Pass)
- Architecture Review Revision Record: `architecture-review-revision-record.md`
- Implementation Handoff: `implementation-handoff.md` (IR-002)
- Implementation Revision Record: `implementation-revision-record.md`
- Code Review Report: `code-review-report.md` (CRR-002, Pass)
- Code Review Revision Record: `code-review-revision-record.md`
- Delivery Revision Record (delivery re-entry only): N/A
- Relevant Delivery Revision IDs: N/A
- API/E2E Revision Record (created after the first completed result): `api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- Current Investigation Round: 1
- Trigger: code review CRR-002 pass, handed to API/E2E by `/software_engineering_team/code_reviewer`
- Prior Investigation Reviewed: none (first round)
- Latest Authoritative Investigation: this file

All paths are relative to the ticket folder `/Users/normy/autobyteus_org/autobyteus-worktrees/fastify5-and-spreadsheet-parser/tickets/in-progress/fastify5-and-spreadsheet-parser/` unless absolute.

## Current Requirement And Design Basis

- **Server (BEH-001/002/004/005):** Fastify 5.12.7, mercurius 16.12.1, `@fastify/cors` 11, `/multipart` 10, `/websocket` 11. Every HTTP status, payload, header contract, remote-access classification and auth result is unchanged (REQ-002 invariant), except `/graphiql*`, which now returns 404 (DEC-001). The two MCP routes no longer carry `{ config: { cors: false } }`. That config had no effect on Fastify 4 (SD-06), and on Fastify 5 it would start suppressing the CORS plugin's headers.
- **Gateway (BEH-006):** its own pnpm workspace and lockfile, an audit with no high or critical advisories, and a Docker image that installs from that lockfile and copies only its build inputs (IR-002, CR-001).
- **Viewer (BEH-007):** SheetJS 0.20.3, a tarball pinned by integrity. `sheet_to_html` output is sanitised to table structure by DOMPurify. Hyperlinked cells show their text without a link (DEC-008).
- Runtimes: the packaged desktop app (Electron), the server Docker image (Node 22), the gateway image (Node 20). Termux is not run (see Not Tested).
- Code review CRR-002 passed with no open findings. FU-004 records 4 server e2e failures that are identical on base, with no cause established yet.

## Supported Scenarios And Real Usage

- Designer scenarios covered: SCN-001 (REST/WS clients incl. trusted-network clients and Docker clients), SCN-002 (GraphQL POST + WS subscriptions), SCN-003 (`/graphiql` page, now 404), SCN-004 (MCP JSON-RPC over HTTP from loopback runtimes), SCN-005 (gateway install/Docker), SCN-006 (open a spreadsheet in the desktop Files panel).
- Real-use scenarios added from investigating the implemented behavior:
  - SCN-A1 **Docker client from the host.** Requests that reach a container through Docker's port publishing arrive from a non-loopback address inside the container (trusted-network classification). Trigger: host HTTP to the published port.
  - SCN-A2 **Trusted-LAN client on a wildcard-bound server.** The server is bound to `0.0.0.0` (Docker, or a phone pairing over the LAN), and a client reaches it at the machine's LAN address, which gives a non-loopback socket address and a non-loopback `Host`. Trigger: HTTP to `192.168.x.y:<port>`.
  - SCN-A3 **Multipart upload near the 25 MiB limit.** The web app uploads to `/rest/upload-file` (media) and `/rest/context-files/upload` (draft attachments). Studio registers multipart with `limits.fileSize` only (default `throwFileSizeLimit`), while the integration tests use `throwFileSizeLimit: false` or a 1 KiB limit, so the studio configuration's oversize path is not exercised by repository tests. Trigger: a real multipart POST over HTTP.
  - SCN-A4 **Standalone application host with an explicit wildcard `--host`.** The devkit prints `handle.url`, which differs on Fastify 5 (Known Risk in the implementation handoff). Trigger: `autobyteus-app start --host 0.0.0.0`.
- Designer scenarios recorded as `Technically Possible but Unsupported/Contrived`: none.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 HTTP request handling on Fastify 5 | Preserved | IMP-07/09/11/15/17/19 | Server E2E folder over real HTTP/WS (API-03); live base-vs-branch probes (API-04, API-05) |
| BEH-002 GraphQL on mercurius 16 (POST, WS subscriptions) | Preserved | IMP-17, IMP-19 (connection_ack) | E2E folder; packaged-app run streaming (API-07); container WS subscription (API-08) |
| BEH-003 GraphiQL | Removed (`/graphiql*` → 404) | IMP-17, IMP-19 | Durable HTTP test (API-01); non-loopback probe (API-04) |
| BEH-004 MCP routes + CORS headers | Preserved | IMP-06 vs IMP-08 (inject only) | Durable real-HTTP header contract on the studio server (API-01) + base-vs-branch live probe (API-04) |
| BEH-005 Multipart upload limits | Preserved | integration suites (small/limitless configs) | Live base-vs-branch upload probe at the studio limit (API-05) |
| BEH-006 Gateway install/audit/Docker | Changed | IMP-10, IMP-20 | Reused (API-R4, API-R5) |
| BEH-007 Viewer parser + sanitiser | Changed | IMP-01/02/03/14 | Reused spec/rendered checks (API-R6); packaged-app Files-panel journey (API-07) |
| `listen()` return for a wildcard bind | Changed (not a contract) | IMP-13 | Optional standalone-host check (API-06) |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | No | — | — | — | — |
| API / transport / contract | Yes | Framework under every route; mercurius; multipart; websocket; MCP route config | Unit/integration (IMP-09/11), inject probes (IMP-06/08) | Real-socket behavior: remote address, CORS over HTTP, oversize multipart under the studio config, WS subscription data | Live API (built server, base vs branch); server E2E folder |
| Frontend component / state | Yes | `ExcelViewer.vue` sanitiser | Spec (IMP-02/03), rendered Chrome page (IMP-14) | Packaged renderer bundle with the CDN tarball, real Files-panel path | Project desktop validation |
| Browser integration / user journey | Yes | Open a spreadsheet; run streaming | IMP-14 (fixture page) | Real journey through the product UI | Isolated desktop instance |
| Authentication / session / permissions | Yes (preserved) | Remote-access classification under Fastify 5 (`request.raw.socket.remoteAddress`) | Policy unit tests; phone-access e2e (inject `remoteAddress`) | A real non-loopback socket | Live API from the LAN address; container from host |
| Desktop renderer / web-equivalent UI | Yes | Viewer in the renderer | IMP-14 | — | Isolated desktop instance |
| Desktop shell / Electron-specific integration | Yes (packaging) | Embedded server start with Fastify 5 in the packaged app; tarball in the packaged bundle | IMP-17 (start + smoke) | Agent run streaming through the shell's embedded server | Isolated desktop instance |
| Process / lifecycle | Yes | Container start (server, gateway) | IMP-19, IMP-20 | Fuller container check | Docker (test-owned container) |
| Persisted-data transition | No (`Not Affected`) | — | — | — | — |
| Worker / queue / distributed coordination | No | — | — | — | — |
| External integration | Yes | `cdn.sheetjs.com` tarball; LM Studio for the run journey | IMP-16 | — | Clean-clone builds |

## Project Execution Discovery

- Assigned task worktree / workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/fastify5-and-spreadsheet-parser`, branch `codex/fastify5-and-spreadsheet-parser`, HEAD `4dcdceea11` (code `25a45ee5d3`)
- Project type and runtime stack: pnpm monorepo; Fastify server (TypeScript, Node 22.23.1); Nuxt/Electron web app; standalone message gateway
- Project testing guideline path(s): `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/TESTING.md` (identical copy in the worktree root). No closer `TESTING*.md` in `autobyteus-server-ts/`, `autobyteus-web/` or `autobyteus-message-gateway/`.
- Conflicting, missing, or unclear project instructions:
  - TESTING.md Rule 9 says never to close a failure as pre-existing without its cause. FU-004 records 4 e2e failures without a cause, so API-03 has to find the cause of any failure it hits.
  - The shell inherits 24 `AUTOBYTEUS_*` variables and `LMSTUDIO_HOSTS` from the live app, so E2E runs use `env -i` (TESTING.md "Clean environment elsewhere").
- Required environment variables or secrets available: `N/A`. No provider secret is needed: the run journey uses the local LM Studio server (no key) and the containers need none.

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `TESTING.md` | Test layers, environments, rules | `pnpm test:e2e`; clean env for E2E; `pnpm --silent isolated-app start --build`; Docker: test-owned container on `127.0.0.1`, never the user's node containers; LM Studio: one run at a time, small model `qwen/qwen3.6-35b-a3b`; stop what you start |
| `docs/isolated-app-instances.md` | Isolated desktop instance | Embedded server gets a system-baseline env only; drive with browser-automation `scripts/browser` attach-only on `controlPort` |
| `/Users/normy/autobyteus_org/autobyteus-skills/browser-automation/SKILL.md` | Browser CLI | `health-check`, `list-tabs`, `dom-snapshot`, `run-script` with `__abDemo`, `screenshot` |
| `package.json` (root) | Scripts | `test:e2e` = `pnpm --filter autobyteus-server-ts test --run tests/e2e`; `isolated-app` |
| `autobyteus-server-ts/package.json`, `src/app.ts` | Server scripts / entry | `node dist/app.js --data-dir <dir> --host <h> --port <p>` |
| `autobyteus-server-ts/docker/Dockerfile.monorepo` | Server image | Built from repo root; `EXPOSE 8000`; entrypoint runs `dist/app.js` |
| `implementation-handoff.md` Environment notes | Gotchas | Packaged build from a local-path clone needs `AUTOBYTEUS_UPDATER_REPOSITORY=AutoByteus/autobyteus-workspace`; fresh worktree needs `prebuild` |
| `autobyteus-ts/src/llm/lmstudio-provider.ts` L32 | LM Studio default host | `http://localhost:1234`, reachable from the isolated instance's baseline env |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Branch server build | worktree | `pnpm install --frozen-lockfile`; `pnpm -C autobyteus-server-ts prebuild`; `build` | Fastify 5.12.7 | build exit 0 | — |
| Base server build | `/tmp/ab-api/base` (clone of `ddd6fdcdf6`) | same | Fastify 4.29.1 | build exit 0 | `rm -rf /tmp/ab-api/base` |
| Live servers (API-04/05) | worktree / base clone | `node autobyteus-server-ts/dist/app.js --data-dir <tmp> --host 0.0.0.0 --port <free>` | Test-owned data dirs, free ports | `GET /rest/health` 200 | kill PID; remove data dirs |
| Clean clone for builds | `/tmp/ab-api/clone` (clone of `4dcdceea11`) | `git clone --no-hardlinks` | — | `git status` clean | `rm -rf` |
| Server image + container (API-08) | clean clone | `docker build -f autobyteus-server-ts/docker/Dockerfile.monorepo -t ab-server-api:test .`; `docker run -d -p 127.0.0.1:<free>:8000` | No volumes; never the user's `autobyteus-server-*` containers | `/rest/health` 200 | `docker rm -f -v`; `docker rmi` |
| Isolated desktop instance (API-07) | clean clone | `AUTOBYTEUS_UPDATER_REPOSITORY=AutoByteus/autobyteus-workspace pnpm --silent isolated-app start --build` | Own data root, free ports | start JSON `ok: true` | `pnpm --silent isolated-app stop <id>`; `list` empty |
| LM Studio | host (user's) | already running at `127.0.0.1:1234` | Shared compute: one run at a time | `/v1/models` lists `qwen/qwen3.6-35b-a3b` | Unload a model this run loaded JIT |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Spreadsheet fixtures (`.xlsx`, `.xls`) | `probes/make-fixtures.cjs` (generated; markup cell, `javascript:` hyperlink) | Generated only, never a real user file (REQ-012) | Fixture dir under `/tmp/ab-api` removed |
| Upload payloads at 25 MiB ± 1 byte | Generated zero-filled buffers in the probe | Test-owned data dir | Removed with the data dir |
| Agent definition + workspace in the instance | Created through the instance UI/GraphQL like a user | Isolated data root | Removed with the instance |
| Studio server for the durable test | `startStudioE2eRuntimeServer` with a temp app data dir | Integration isolation setup | `afterEach` removes the temp dir |

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related Requirement / AC / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/**` (194 files) | Real HTTP/GraphQL/WS journeys on test-owned servers | AC-002, REQ-002 | Still Valid | Not run yet on the branch (handoff "Not run") | Run all (API-03) |
| `tests/integration/agent-tools/mcp/agent-tools-mcp-routes.integration.test.ts` | Agent-tools MCP route behavior incl. one preflight header assertion | AC-003 | Still Valid | IMP-11 | Reused |
| `tests/integration/mcp-gateway/mcp-gateway-routes.integration.test.ts` | MCP gateway route behavior on its own instance (no cors plugin) | AC-003 | Still Valid | IMP-11 | Reused. It does not cover the studio's cors-plugin headers, the part that changed meaning on Fastify 5 |
| `tests/integration/application-backend/studio-agent-tools-listener.integration.test.ts` | Real studio server on a wildcard bind; MCP gateway Host gate; agent-tools listener | AC-002, AC-003 | Still Valid (updated in `29aeb5d721`; the update addresses the wildcard host explicitly, which is the same request as before) | IMP-13 | Reused |
| `tests/integration/api/rest/upload-file.integration.test.ts` | 413 + no persisted file over a 1 KiB limit | AC-006 | Still Valid | IMP-11 | Reused; studio-config oversize path covered live (API-05) |
| `tests/integration/api/rest/context-files.integration.test.ts` | Draft upload/finalize with `throwFileSizeLimit: false` | AC-006 | Still Valid | IMP-11 | Reused |
| `tests/e2e/remote-access/phone-access-running-routes.e2e.test.ts` | Remote-access classification with injected `remoteAddress` | AC-004 | Still Valid | FU-004: 1 case fails on base and branch | Run; find the failure's cause (API-03) |
| `autobyteus-web/components/fileExplorer/viewers/__tests__/ExcelViewer.spec.ts` | Real-parser viewer spec under jsdom | AC-012, AC-013 | Still Valid (replaces the mocked spec) | IMP-02, IMP-03 | Reused |
| No test asserts that `/graphiql` is gone, or the studio's MCP gateway CORS headers over real HTTP | — | AC-003, AC-005 | Gap | — | Add durable coverage (API-01) |

## Planned Cases

| Case ID | Criteria | Boundary / Surface | Kind | Planned Command Or Steps | Why |
| --- | --- | --- | --- | --- | --- |
| API-R1 | AC-001, AC-011, QR-001 | root lockfile audit | Reused | IMP-12 | `pnpm-lock.yaml` unchanged since `5c7ab7426c` (`git diff --name-only 5c7ab7426c HEAD -- pnpm-lock.yaml` empty) |
| API-R2 | AC-011, REQ-009, REQ-013 | clean-clone cold install with integrity | Reused | IMP-16 | Lockfiles unchanged since `29aeb5d721`; ran on a clean clone with an empty store |
| API-R3 | AC-002 | server typecheck, unit, integration, build | Reused | IMP-07, IMP-09, IMP-11 (+ IMP-13 fix), IMP-15 | `git diff --name-only 29aeb5d721 HEAD` outside `tickets/` is only the gateway Dockerfile |
| API-R4 | AC-009, REQ-005..007 | gateway install/typecheck/test/audit | Reused | IMP-10 | Since `5c7ab7426c`, only the gateway Dockerfile changed, and the install does not read it |
| API-R5 | AC-010, REQ-008, REQ-013 | gateway image | Reused | IMP-20 | Ran on `25a45ee5d3`, the current gateway code, from a clean clone |
| API-R6 | AC-012, AC-013 | viewer spec, mutation check, rendered Chrome page | Reused | IMP-02, IMP-03, IMP-14 | `autobyteus-web` unchanged since `195db3c42e` |
| API-01 | AC-003, AC-004, AC-005, REQ-004 | real studio server over HTTP | Durable | New `autobyteus-server-ts/tests/integration/api/studio-server-http-contract.integration.test.ts`. Run on the branch; run the same file on the base clone (the GraphiQL cases should fail there and the MCP cases pass); a mutation run with `{ config: { cors: false } }` temporarily re-added (the MCP header cases must fail) | Nothing durable asserts the GraphiQL removal or the studio's MCP CORS contract. A future `cors: false` would silently change BEH-004 |
| API-03 | AC-002, REQ-002 | server E2E folder | Existing Test | `env -i PATH HOME=<temp> TMPDIR pnpm test:e2e` in the worktree; find the cause of each failure (Rule 9); base run of the same files only if the cause stays unclear | Not run on the branch yet |
| API-03b | AC-002 | phone-access e2e file after a baseline test fix | Existing Test (updated) | Added during execution: the API-03 failure's cause was in the test (missing `configureNodeIdentityCapability(true)`), so per TESTING.md Rule 9 it is fixed as its own baseline commit and the file rerun | Rule 9 requires fixing test-caused failures in the branch |
| API-04 | AC-003, AC-004, AC-005 | live built server, loopback and LAN address, base vs branch | Temporary Probe | `node probes/api-04-live-http-probe.mjs <base-url-loopback> <base-url-lan>` against `dist/app.js` bound to `0.0.0.0` on base and branch; diff | The real socket address and `Host` header cannot be produced durably without a machine-specific LAN interface |
| API-05 | AC-006 | live built server multipart, base vs branch | Temporary Probe | `node probes/api-05-upload-limit-probe.mjs <url>`: `/rest/upload-file` and `/rest/context-files/upload` at exactly 25 MiB, and at 25 MiB + 1 byte; diff base vs branch | The 25 MiB payloads are too slow and large for the durable suite. The live studio configuration is what matters |
| API-06 | Known Risk (handoff), REQ-002 | standalone host printed URL | Temporary Probe | `autobyteus-app start --host 0.0.0.0` for `applications/brief-studio`; fetch the printed URL | Optional check suggested by code review |
| API-07 | AC-007, AC-014, REQ-003, REQ-013 | packaged desktop app from a clean clone | Journey | `isolated-app start --build` in `/tmp/ab-api/clone`. Create a workspace on a fixture dir. Create an AutoByteus agent with LM Studio `qwen/qwen3.6-35b-a3b`, send a message and observe streamed output (renderer DOM, WebSocket frames, GraphQL). Open `generated-sample.xlsx` and `.xls` in the Files panel and assert the DOM: cell text, tabs, no `a`/`href`/`on*`. Stop | Needs the real shell, the embedded server and the renderer bundle |
| API-08 | AC-008, REQ-003, REQ-013 | server Docker image from a clean clone | Journey | Build the image from `/tmp/ab-api/clone`. Run a test-owned container on `127.0.0.1:<free>` without volumes. From the host (non-loopback inside the container): `/rest/health`, GraphQL POST, `GET /graphql` (expect 404 LOCAL_DEV_ONLY), `/graphiql` 404, a WS `graphql-transport-ws` subscription that receives data, and an upload. From inside: loopback `GET /graphiql` 404. Then `docker rm -f -v` and `rmi` | Beyond the IMP-19 smoke: subscription data, the trusted-network classification from the host, uploads |

- Test progress log needed: `Yes` (`api-e2e-test-progress.md`)

## Durable Coverage To Add

| Case ID | Planned Test Path | Why Durable Coverage Is Needed |
| --- | --- | --- |
| API-01 | `autobyteus-server-ts/tests/integration/api/studio-server-http-contract.integration.test.ts` | Protects DEC-001 (no GraphiQL page on the app origin) and the BEH-004 header contract, which Fastify 5 made sensitive to route config, on the real studio composition over HTTP. Also covers the non-loopback classification of `GET /graphql` and `GET /graphiql` through the studio's real policy plugin |

## Durable Coverage To Update

| Case ID | Existing Path / Test | Required Update | Notes |
| --- | --- | --- | --- |
| API-03b | `autobyteus-server-ts/tests/e2e/remote-access/phone-access-running-routes.e2e.test.ts` | Call `configureNodeIdentityCapability(true)` in `beforeEach` | Added after API-03 found the cause (FU-004). Baseline fix, its own commit |

## Durable Coverage To Remove

None.

## Desktop Application Validation Plan

- Desktop framework / shell: Electron 42 packaged app with an embedded Node server
- Testing guideline used: TESTING.md "Isolated desktop instance", `docs/isolated-app-instances.md`
- Web-equivalent behavior: viewer rendering (already proven in Chrome by IMP-14)
- Shell-specific or lifecycle behavior: the embedded Fastify 5 server starting in the packaged app; the packaged renderer bundle with the CDN tarball; run streaming through the embedded server
- Chosen validation approach: an isolated instance built from a clean clone of HEAD, driven through browser-automation attach-only. This is the only surface that exercises the packaged shell and its embedded server together
- Server/frontend setup: none; the packaged app is used as is
- How the run avoids disturbing an already-running desktop application: the isolated instance uses its own data root and ports, and its server gets only a baseline environment. The user's app and data are not touched. The isolated-app `list` must be empty afterwards

## Live Environment And Fixture Plan

- Startup order and commands: base and branch `dist/app.js` one at a time on free ports (API-04/05); Docker build then container (API-08); isolated instance (API-07)
- Environment choices that materially affect the run: `env -i` with a temp `HOME` for every server I start, so no `AUTOBYTEUS_*` variable from the live app leaks in; the LAN address `192.168.2.158` (en0) for non-loopback clients
- Health / readiness checks: `GET /rest/health` 200; isolated-app start JSON `ok: true`
- Seed data / fixtures: generated spreadsheets (`probes/make-fixtures.cjs`); zero-filled upload buffers
- Test identities, authentication, permissions, or session state: none (loopback and trusted-network without credentials, as the product defines)
- Requirement-linked journeys or scenarios: see Planned Cases
- DOM, screenshot, log, API, process, or other evidence to capture: probe JSON and diff outputs; e2e summaries; DOM snapshots and screenshots of the instance; container command outputs
- Owned processes and temporary state to clean up: `/tmp/ab-api/*`, live server PIDs, the container, the image `ab-server-api:test`, the isolated instance

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Only The User Can Check? | Required Follow-Up Or Escalation |
| --- | --- | --- | --- | --- |
| Termux (Node ≥20 on Android) | No Android device or Termux environment on this machine. The packaged app (Node 22 inside Electron) and the Docker image (Node 22) run the same server build | Low: Fastify 5 supports Node ≥20 and no native module changed | Yes (needs the user's phone) | Delivery asks the user if a Termux check is wanted |
| Phone (mobile web) tap on a hyperlinked cell | DEC-008 removes the link. The DOM proof (no `a` element) holds for every surface | Negligible | No | — |

## Ambiguities Or Reroute Triggers

None at planning time.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes` (one added file, API-01)
- Reroute Required Before Validation Execution: `No`
- Recommended Owner If Reroute Required: —
- Notes: the case IDs here are reused in the execution report and the progress log
