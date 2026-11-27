# API/E2E Execution Coverage Report — autobyteus-661, build slice T-3 (node keys, one pairing model, migration)

## Round

- Coverage investigation: [api-e2e-coverage-investigation.md](api-e2e-coverage-investigation.md)
- API/E2E revision record and current revision ID: [api-e2e-revision-record.md](api-e2e-revision-record.md), `API-REV-001`
- Test progress log: [api-e2e-test-progress.md](api-e2e-test-progress.md)
- Round and trigger: round 1 (T-3), code review CRR-002 Pass.
- Prior round reviewed: none.
- Deviations from the plan: none in scope. Setup issues of my own, fixed and recorded per case (a probe path through the `/tmp` symlink; `test:integration:prepare` missing in my clone before the full E2E run; no `.nuxt` before the demo spec).
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-661-private-network/tickets/in-progress/autobyteus-661-private-network/evidence/api-e2e/`; temporary probes: `…/probes/api-e2e/`.

**Commit under test: b59628b4bf** (the reviewed T-3 commits 78d8aca27a, f31a8818e6, b59628b4bf **and 7f723d717b**, T-4 part 1, which is not code-reviewed: every case below ran that code too). All runs used API/E2E's own clone (`/tmp/661-api/clone`), never the shared worktree, whose uncommitted T-4 work is not part of any run.

## Routing Classification

- Task size: `Large`; architectural risk: `High`. Input route: `Reviewed`. Successful-output route: `Code Review` (proportional test-code review), then the next slice or delivery as the team decides.
- Proportional test-code review decision: `Required` (one new durable e2e file).

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-1 | b59628b4bf | macOS 26 arm64 (10 cores, 64 GB) | Node 22.23.1; clone with frozen install, `prepare:source`, server `build`, later `test:integration:prepare` | `env -i PATH HOME=<fresh temp> TMPDIR`; load average 40–70 from other agents |
| ENV-2 | b59628b4bf | Docker 29.0.1, linux/arm64 | this commit's server package (`docker buildx … --target server-package`, version 1.5.15-beta.2) mounted read-only over the image `autobyteus/autobyteus-server:beta` | containers started as the public launcher does (`AUTOBYTEUS_SERVER_HOST=http://localhost:<port>`, `-p 127.0.0.1:<port>:8000`); owner credentials by setup code + exchange, kept in memory or a 0600 file deleted after |
| ENV-3 | released 1.5.14-beta.7 | Docker linux/arm64 | the local image `autobyteus/autobyteus-server:beta` (8c29c938dec1), not pulled or retagged | test-owned named volumes, removed after |
| ENV-4 | b59628b4bf | macOS arm64 | "desk": this commit's built server on 127.0.0.1 with a launch owner credential, as the desktop starts its own node | stands for the desktop's embedded node (same server; the window's calls replayed exactly) |

## Cases

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-R1 | T-3 behavior | typechecks, unit, web specs, selected e2e, two-server e2e | Reused IMP-01…IMP-07 | — | Pass (reused) | handoff Checks Run | IMP-07 "61/61" two-server at b59628b4bf | Whole unit and integration rerun as API-06 (owners' inputs changed after IMP-03) |
| API-01 | AC-005, AC-007, NAS-49…51 | Pair → Accept / Reject / Cancel, three real servers over HTTP | `env -i PATH HOME=<temp> TMPDIR pnpm -C autobyteus-server-ts exec vitest run tests/e2e/remote-collaboration/pairing-requests-real-servers.e2e.test.ts --no-watch` (PRQ-01…03) | ENV-1 | Pass | `API-01-02-pairing-requests-real-servers.log`; also inside `API-05-server-e2e.log` | "✓ PRQ-01 …", "✓ PRQ-02 …", "✓ PRQ-03 …"; run 2 "Tests  5 passed (5)" | PRQ-01: waiting on both sides, nothing stored before Accept; both `teammate`, each holds the other's actual node key (read from the other's `node-key.pem`); signed requests both ways. PRQ-02: "declined", nothing stored. PRQ-03: Accept after Cancel → `PEER_PAIRING_REFUSED` "This node did not ask to pair, or withdrew it.", the accepting node's record removed again |
| API-02 | NAS-53, CR-001 | key rule over HTTP | same file (PRQ-04, PRQ-05) | ENV-1 | Pass | same | raw `POST /rest/remote/pair` naming paired alpha with another key → `{"status":409,"code":"PEER_KEY_CONFLICT"}` without and with a grant; the grant presented by gamma → `{"status":403,"code":"PAIRING_GRANT_INVALID"}` (and through gamma's Pair: `PEER_PAIRING_REFUSED` with that message); alpha (same key) pairs again with the grant once, a second use refused | Run 1 failed on my expectation only: Pair again keeps the row's existing name ("alpha-here"), as the handoff states ("Pair again replaces a row in place and keeps its name"); the grant's `nameForAsker` names only a new row |
| API-03 | AC-011, REQ-012, D-3, D-4 | migration on data a released build wrote; Pair again | released 1.5.14-beta.7 nodes a, b, c paired by invite text with the switch on (released GraphQL); containers removed, volumes kept; this commit's package on the same volumes and ports; one click Pair again from a's window; restart | ENV-2, ENV-3 | Pass | `API-03-released-data-migration.log`; scripts `probes/api-e2e/released-upgrade/` | released rows `{nodeId,name,baseUrl,addedAt,peerSecret}` → `{nodeId,name,address,addedAt}`; `.env` `ENABLE_REMOTE_COLLABORATION=true` (last line, no final newline) removed, other lines byte-identical ("after = released other lines + one final newline: true" ×3); modes 600/644 kept; ledger `20261127_peers_to_node_keys|…|SUCCEEDED|1|…|Scanned 2; migrated 2…` on each node; every row `paired:false relation:null` ("Pair again"); Pair again a+b, a+c `paired`, names kept, `relation own`, signed availability and offers true both ways; second start: file hashes unchanged, ledger still one row, attempts 1 | Released shapes with `role` are not producible by 1.5.14-beta.7 (predates sandboxes): the migration tests' fixtures cover them. The old shared secrets never appear (redacted, length kept) |
| API-04 | AC-004, CR-002, decision (b) | one click with Docker nodes | `node probes/api-e2e/docker-one-click-probe.mjs --server=<clone>/autobyteus-server-ts --package=<pkg> --image=autobyteus/autobyteus-server:beta --out=…` | ENV-2, ENV-4 | Pass | `API-04-docker-one-click/evidence.json`, `node-*.log` | D-1: desk keeps x at `http://127.0.0.1:<x>`, x keeps desk at `http://host.docker.internal:<desk>`; signed availability/offers both ways; Unpair removes both. D-2a-control: window's address alone → `PEER_UNREACHABLE`, nothing stored. D-2a: x keeps desk at `host.docker.internal:<desk>` (one of desk's own `addresses`). D-2b: x keeps y and y keeps x at `host.docker.internal:<port>` | Runs 1–2 failed in the probe only: the server path went through the `/tmp` symlink, so `app.js`'s main-module check did not match and it exited 0 (fixed with `realpath`) |
| API-05 | gate, credentials (TESTING) | every server E2E route | `env -i PATH HOME=<fresh temp> TMPDIR pnpm test:e2e` | ENV-1 | Pass | `API-05-server-e2e.log` | full run "Tests  568 passed \| 840 skipped", 126 files passed; 3 suites failed in setup "Brief Studio importable package missing … test:integration:prepare"; after that step the three files "Tests  12 passed (12)" | the setup step was mine (TESTING names it); no test failed |
| API-06 | owners' inputs | server unit + integration | `pnpm -C autobyteus-server-ts test:unit`; `test:integration` | ENV-1 | Pass | `API-06-server-unit-integration.log` | unit "Test Files  1101 passed \| 5 skipped", "Tests  9199 passed"; integration "Test Files  93 passed \| 21 skipped", "Tests  534 passed" | |
| API-07 | GraphQL operations | demo coverage + iOS demo build | `mobileBuildChecks.spec.ts`; `autobyteus-ios/scripts/prepare-demo-web.sh --build`; `build:mobile-web` | ENV-1 | Pass | `API-07-ios-demo.log` | "The demo answers all 259 compiled operations"; spec "Tests  8 passed (8)"; "The /mobile build holds no demo code." | spec run 1 collected nothing before the clone had `.nuxt` |
| API-08 | build input (`generated/graphql.ts`) | fresh-start build | fresh `git clone --no-local`, checkout b59628b4bf, `pnpm install --frozen-lockfile`, `build:electron:mac -- --arm64` with the release env, the workflow's two verify steps | fresh clone | Pass | `API-08-fresh-start-build.log` | "Lockfile is up to date, resolution step is skipped"; "[typecheck] production errors: 0; test-file errors: 85 in 35 files (baseline 85 in 35 files)", "[typecheck] PASS"; "Build completed"; "build exit 0"; "prisma verify: PASS"; "[terminal-runtime] ok: node-pty spawn probe", "terminal runtime verify: PASS" | signing, notarization and other OS builds need the runners; no build step or gate changed, so no build-only release run (RELEASE.md) |

## Acceptance-Criteria Proof

| Criterion | Critical | Proven By | Result | Note |
| --- | --- | --- | --- | --- |
| AC-004 (own nodes, one click; REQ-006) | Yes | API-04, API-03 (Pair again), API-R1 (two-server RC-03) | Proven | incl. CR-002 (a), (b) and decision (b) |
| AC-005 (Pair → Accept / Reject / Cancel) | Yes | API-01 | Proven | |
| AC-006 (signed requests and refusals; REQ-007) | Yes | API-R1 (unit, two-server RC-20, node-access-model e2e), API-01/03/04 (signed requests work after each pair), API-05 | Proven | the private-network machine rule has no producer before T-4 |
| AC-007 (pair by plain address) | Yes | API-01 (PRQ-01 by plain address) | Proven | |
| AC-008 (Unpair both sides) | Yes | API-R1 (two-server RC-19), API-04 D-1 | Proven | |
| AC-011 (after the update: Pair again, switch deleted) | Yes | API-03 | Proven | on data the released build wrote |
| NAS-53 (CR-001) | Yes | API-02 | Proven | over HTTP, with and without a grant |
| AC-001…003, 009, 010, 012, 013 | — | — | Not in T-3 | T-1/T-2/T-4/T-5/T-6 |

## Validation Confidence Scorecard (Mandatory)

| Category | Post-Repository | Final | What Supports It | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 85% | 96% | every T-3 criterion above | — | — |
| Changed-boundary execution directness | 85% | 96% | real servers over HTTP, real containers, a real released build's data | the window's calls replayed (UI is T-6) | T-6 probes |
| Cross-boundary integration realism and mock gap | 80% | 95% | three servers; Docker networking (container loopback, host alias); released → new upgrade | — | — |
| Environment, configuration, identity, and fixture fidelity | 85% | 95% | launcher-shaped containers; setup-code credentials; released data not hand-written | desk stands for the packaged desktop's embedded node | a packaged desktop run (T-6) |
| Failure, edge-case, lifecycle, and recovery evidence | 85% | 96% | Reject, Cancel, key conflict, grant misuse, address control, second start | — | — |
| User-surface, browser, and desktop-shell confidence | N/A | N/A | no T-3 UI (removals and API plumbing; T-6 owns the UI) | — | — |
| Durable regression coverage quality and relevance | 85% | 95% | new e2e file; whole suites green | Docker scenarios stay temporary probes | — |

- Overall post-repository: 84%; final: 95% (simple average of six applicable categories: 96, 96, 95, 95, 96, 95).
- Every critical criterion directly proven: `Yes`. Any category below 90%: `No`. Target met: `Yes`.
- Residual risks: 7f723d717b (T-4 part 1) ran unreviewed in every case; the T-6 UI and its probes are not covered here (FU-661-02).

## Broader Validation Decision (Mandatory)

- Decision: `Required` (executed): `Live API` (three real servers), `Worker or Distributed` (Docker nodes), `Lifecycle` (released upgrade, restart).
- Gap addressed: pairing across processes and networks, and the migration on real released data, which repository tests reached only in-process or on synthesized files.
- Browser validation: not needed for T-3 (no UI of its own; T-6).

## Persisted-Data Transition Checks

- Decision: `Migration Required` (`20261127_peers_to_node_keys`).
- Representative data: written by the released build 1.5.14-beta.7 (three nodes, three rows, switch on).
- Approved transition followed: `Yes`. Version-specific branch or fallback in runtime: `No` (rows without a key read as "Pair again" only).
- Residual: shapes with `role` (since 581) are covered by synthesized fixtures only.

## Compatibility / Legacy Scope Check

- Backward compatibility in scope: `No`; observed: `No` (old rows are converted, not read; no HMAC path; switch line removed).

## Durable Coverage Changed In The Codebase

| Path / Test | Change | Case IDs |
| --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/remote-collaboration/pairing-requests-real-servers.e2e.test.ts` | Added | API-01, API-02 (also run in API-05) |

- Attached for proportional test-code review: `Yes`.

## Dependencies Mocked Or Emulated

| Dependency | Method | Why | Limitation |
| --- | --- | --- | --- |
| The desktop window (connector) | its exact GraphQL calls replayed (`createPairingGrant`, then `pairWithNode(address = window's address, addresses, grant, nodeId)`), as the shared e2e helper `pairNodes` does | the Manage Nodes UI is T-6 | the UI wording and states are not covered |
| The desktop's embedded node | a built server on 127.0.0.1 with a launch credential | same server code, started the same way | not the Electron-bundled Node |

## Temporary Methods And Cleanup

| Item | Owned | Cleanup | Result |
| --- | --- | --- | --- |
| containers `661-api-rel-*`, `661-api-new-*`, `autobyteus-661-api-*` and volumes `661-api-rel-*-data` | Yes | `docker rm -f -v`, `docker volume rm` | removed (`docker ps -a` / `volume ls` show none) |
| owner credentials file, ledger DB copies | Yes | deleted | deleted |
| desk node and temp roots | Yes | stopped, removed | removed |
| clone `/tmp/661-api/clone`, server package `/tmp/661-api/pkg`, fresh clone `/tmp/661-api/fresh` | Yes | `rm -rf` after the round | removed |

## Latest Authoritative Result

- Result: `Pass`
- Next recipient: `/code_reviewer` (Large/High: proportional test-code review of the new e2e file).
- Notes: observations, not findings — (1) Pair by request takes about 5 s: the receiver waits for every address probe (≤ 5 s each) even after an earlier one answered (code review noted it for T-6 UX). (2) A node offers every non-loopback interface address it has, including its public IPv6 and Tailscale addresses, even when it listens on 127.0.0.1 only; they reach the other node in `pair` (by design, contract §2).
