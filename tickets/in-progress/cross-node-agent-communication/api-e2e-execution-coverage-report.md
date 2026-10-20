# API/E2E Execution Coverage Report — autobyteus-191 (Slice 1: Remote Delegation, Text Only)

`…` = `/Users/normy/autobyteus_org/autobyteus-worktrees/cross-node-agent-communication-r2/tickets/in-progress/cross-node-agent-communication`

## Round

- Coverage investigation (the plan; it lists the upstream documents): `…/api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `…/api-e2e-revision-record.md`, `API-REV-001`
- Test progress log (when used): `…/api-e2e-test-progress.md`
- Round and trigger: round 1, from the code-review pass CRR-002 (code `744641b35c`). During the round the Solution Designer put change-sequence steps 3–6 on hold (ARCH-REV-003 Fail / Design Impact AR-005 … AR-007; SR-015 `f1d7dd9337`, documents only), so this round validates only the stable steps 0–2.
- Prior round reviewed: none
- Deviations from the investigation's plan, and why: every delegation and messaging case (API-02, API-04 … API-19, API-21 … API-23) is held until the SR-015 code arrives (the Solution Designer's request); none of them has run. The not-AutoByteus check in RC-03 is `expect.soft`, so the rest of the case reports past F-001.
- Evidence folder: `…/evidence/api-e2e/` (the handoff message gives the commit)

## Routing Classification

- Task size: `Large`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review`
- Proportional test-code review decision: `Required` (on Pass; this round ends `Fail` and asks for failure-origin review of F-001)

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter (data, identity, locale, viewport) |
| --- | --- | --- | --- | --- |
| ENV-1 | source `744641b35c` (HEAD `f1d7dd9337`; `git diff --name-only 744641b35c HEAD` lists only `tickets/`). `dist` was built 16:46:31; the implementation engineer's uncommitted SR-015 edits in this worktree start at 17:02:30 and do not touch `src/remote-collaboration/` or `src/api/`, so the run tested committed code | macOS 26.5.2 (Darwin 25.5), Node v22.23.1 | `autobyteus-server-ts/dist` built at API-00; two server processes `node dist/app.js --host 127.0.0.1 --port <free> --data-dir <temp>/<node>/data`; scripted AGY CLI `tests/fixtures/agy-failure-cli.mjs` (`linked_skills`) | clean environment (`env -i PATH HOME=<temp> TMPDIR`), each node with its own temp HOME, data root and port; each node's peer URL is a capturing proxy in the test process; canary provider keys saved on both nodes; idle grace 60 s |

## Cases

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-00 | all | build | `pnpm -C autobyteus-server-ts build` | ENV-1 | Pass | `evidence/api-e2e/API-00-server-build.log` | `Built-in agents bootstrap smoke check passed.` then `exit=0` | built at `676ecbbb7a`; the source is the same at `f1d7dd9337` |
| API-R1 | AC-112 (unit level), all | unit | Reused: IMP-11 | — | Pass | IMP-11 | — | source unchanged since `744641b35c`; to be rerun by impact on the SR-015 code |
| API-R2 | BEH-101 … BEH-106 in process, CR-001 | unit | Reused: IMP-03, IMP-10 | — | Pass | IMP-03, IMP-10 | — | same; covers the in-process A↔B only (mocked HTTP and runtimes) |
| API-R3 | REQ-115 | web | Reused: IMP-04, IMP-05, IMP-08 | — | Pass | IMP-04/05/08 | — | `autobyteus-web` unchanged since `8491e0d916` |
| API-R4 | REQ-114 (N-3) | route policy | Reused: IMP-07 (mobile credential on `/rest/remote/*`) | — | Pass | IMP-07 | `403` | `api/security/` and `api/rest/remote.ts` unchanged since `4c07f5b268` |
| API-01 | AC-101, AC-111 | settings, gateway (two real servers) | `cd autobyteus-server-ts && env -i PATH="$PATH" HOME=<temp> TMPDIR="$TMPDIR" RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND="$PWD/tests/fixtures/agy-failure-cli.mjs" REMOTE_E2E_EVIDENCE_DIR=<evidence>/API-03-stable-run2 ./node_modules/.bin/vitest run tests/e2e/remote-collaboration/remote-delegation-two-server.e2e.test.ts --no-watch -t "RC-(01\|03\|20) "` (case RC-01) | ENV-1 | Pass | `API-03-stable-run2.log`; `API-03-stable-run2/remote-two-server-receipt.json` (`cases.RC-01`) | `✓ RC-01 AC-101/AC-111: off by default; …`; receipt `"code": "REMOTE_COLLABORATION_OFF"` for both `start` and `message` | both nodes `DEFAULT_DISABLED`, no switch line in `.env`; `addPeerNode` refused while off and nothing contacted (`captured` empty) or recorded |
| API-03 | AC-101, AC-102, AC-103, AC-111, REQ-114 | settings, `PeerClient` identity probe, `PeerGateway` (two real servers, proxies) | same command (case RC-03) | ENV-1 | Fail (F-001) | `API-03-stable-run2.log`; receipt `cases.RC-03`; `API-03-stable-run1.log` (first run, stopped at F-001) | log: `AssertionError: http://127.0.0.1:64002/missing is reached but is not an AutoByteus node`; receipt `"message": "http://127.0.0.1:64002 could not be reached: Unexpected token '<', \"<html>rout\"... is not valid JSON."` and `"message": "http://127.0.0.1:64002/missing could not be reached: HTTP 404."`, both `"code": "PEER_UNREACHABLE"` | **F-001.** Everything else in RC-03 passed (the case reached its `record`): switch on → `SERVER_SETTING` and `ENABLE_REMOTE_COLLABORATION=true` in `.env`; inbound before registration → `PEER_NOT_REGISTERED`; A and B register each other through the proxies, each pinned to the other's `serverInstanceId` (identity GETs captured `toBeta` then `toAlpha`); dead URL → `PEER_UNREACHABLE` "could not be reached: fetch failed."; a refused URL records nothing; rename and back; `peers.json` keys `addedAt, baseUrl, name, nodeId`; gateway: wrong `toNodeId` → `PEER_IDENTITY_MISMATCH` for both kinds, unregistered caller → `PEER_NOT_REGISTERED`, malformed bodies → `400` with `nodeId` and `REMOTE_REQUEST_INVALID`; publishing refuses a missing workspace (`LAUNCH_SETTINGS_INVALID` "is not a folder on this node") and an unknown model ("is not available on antigravity_cli") and records nothing; publish → address `/fragile`, `published-agents.json` keys as designed; unpublish → empty; nothing published on A by default |
| API-20 | AC-111, REQ-113 | captured requests between the nodes | same command (case RC-20) | ENV-1 | Pass (partial scope) | receipt `cases.RC-20`, `captured` | `"counts": {"status": 2}`; `headerNames` `accept, accept-encoding, accept-language, connection, host, sec-fetch-mode, user-agent` | only the two identity GETs were exchanged in this round; neither carries a credential header or a canary key. The delegation and message requests are audited after the revision |
| API-02, API-04 … API-19 | AC-101 (delegate), AC-103 … AC-110, QR-102 | delegation, messages, lifecycle | the same file, cases RC-02, RC-04 … RC-19 | — | Not Tested | — | — | held by the Solution Designer (steps 3–6 under revision, SR-015) |
| API-21, API-22 | AC-112, QR-105 | same-node E2E suites, switch off / on | — | — | Not Tested | — | — | held: the revision changes the roots and engine these suites exercise |
| API-23 | AC-110 | browser on B | — | — | Not Tested | — | — | held (needs a remote run) |

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | For A User-Only Part |
| --- | --- | --- | --- | --- |
| AC-101 | Yes | API-01 (inbound and settings with the switch off), API-03 (on → evaluated) | Not Proven (the `delegate_task` part, API-02, is held) | — |
| AC-102 | Yes | API-03 (registration, pinning, dead URL, rename, nothing recorded) | Not Proven (F-001: the reason for a non-AutoByteus URL; identity-mismatch and removal cases API-16/19 held) | — |
| AC-103 | Yes | API-03 (publishing settings and their validation) | Not Proven (delegation parts API-04/17 held) | — |
| AC-104 … AC-109 | Yes | — | Not Proven (held) | — |
| AC-110 | Yes | — | Not Proven (held) | — |
| AC-111 | Yes | API-01, API-03 (one gateway entry per kind, its order), API-20 (identity GETs), API-R4 | Not Proven (the delegation and message requests are not captured yet) | — |
| AC-112 | Yes | API-R1 (unit, switch off) | Not Proven (API-21/22 held) | — |
| AC-113 | Yes | — | Only The User Can Check | needs the user's desktop node, a Docker node and signed-in runtimes in both directions; delivery takes it to the user after the E2E passes |

## Validation Confidence Scorecard (Mandatory)

Scored over the whole slice, so the held criteria weigh as missing evidence.

| Confidence Category | Post-Repository Score | Final Score | What Supports It (Case IDs) | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 25% | 25% | API-01, API-03, API-20 | AC-104 … AC-112 unproven; F-001 | the held cases on the SR-015 code |
| Changed-boundary execution directness | 40% | 40% | two real processes over real HTTP for settings and gateway | delegation and messaging boundaries not exercised | RC-04 … RC-19 |
| Cross-boundary integration realism and mock gap | 40% | 40% | real identity probe and gateway between two servers | roots, engine and runtimes across nodes only in process (mocked HTTP) | same |
| Environment, configuration, identity, and fixture fidelity | 90% | 90% | clean env, separate HOMEs/data/ports, pinned real `serverInstanceId`s, canary keys | desktop + Docker networking (AC-113) | the user's check |
| Failure, edge-case, lifecycle, and recovery evidence | 30% | 30% | refusals of settings and gateway | idle, restarts, partition, Task closure not run | RC-12 … RC-15 |
| User-surface, browser, and desktop-shell confidence | 60% | 60% | IMP-08 reused (Nodes tab) | AC-110 not observed | API-23 |
| Durable regression coverage quality and relevance | 60% | 60% | the new two-server E2E (all 20 cases written, 3 executed) | 17 cases not yet executed, so their assertions are unproven | run them on the revised code |

- Overall post-repository confidence: 49%
- Overall final confidence: 49%
- Calculation method: simple average of the seven categories
- Every critical acceptance criterion directly proven, apart from parts only the user can check: `No`
- Any final applicable category below `90%`: `Yes` — all but environment fidelity
- Default final confidence target of `95%` met: `No`
- Confidence-limiting residual risks: everything held; F-001

## Broader Validation Decision (Mandatory)

- Decision: `Required`
- Execution mode: `Worker or Distributed` (two server processes) and `Browser` (AC-110)
- Confidence gap or residual risk it addresses, and the expected gain: the whole delegation and messaging contract across real processes, lifecycle and restore, and B's run views; it is the slice's main evidence.
- Browser validation needed, and why or why not: yes, for AC-110 (B's history and run view of a remote run).
- If `Blocked`: not blocked by a missing dependency; held by the Solution Designer until the SR-015 code arrives.

## Persisted-Data Transition Checks

- Approved persisted-data decision: `Not Affected`
- Representative existing data used: real files written by the servers in this round: `peers.json`, `published-agents.json`, `.env` (exact keys checked)
- Approved transition followed without an unnecessary migration: `Yes` (for the files written so far)
- Cases proving the outcome: API-03 (settings files); the tree link, `delegatedFrom` and the prepared fields of SR-015 N-10 wait for the held cases
- Version-specific runtime branch, dual read/write, or compatibility fallback observed: `No`
- Residual untested persisted-data risk: links and back-links written by real servers and their survival across restarts (API-13)

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No`
- Durable coverage added or retained only for compatibility-only behavior: `No`
- If compatibility-related invalid scope was observed, reroute classification used: N/A
- Upstream recipient notified: N/A

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `Yes`

| Path / Test | Change | Case IDs | For A Removal |
| --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/remote-collaboration/remote-delegation-two-server.e2e.test.ts` | Added (gated `RUN_AGY_FAILURE_E2E=1` + `ANTIGRAVITY_CLI_COMMAND`; skipped otherwise) | API-01 … API-20 (RC-01 … RC-20) | — |

- Added or updated paths attached for proportional test-code review: `No` (not a Pass; attached for context of F-001)
- Diff or repository evidence supplied for removed paths: N/A

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| Runtime CLIs | scripted AGY CLI (`linked_skills`) | TESTING: a scripted runtime proves the transport; no provider spend needed | real inference is AC-113, the user's |
| The network between the nodes | capturing HTTP proxies on loopback | request capture (AC-111), partition, stop and retarget | LAN/VPN/Docker networking is AC-113 |
| A non-AutoByteus server | a test-owned HTTP server answering an HTML page or 404 | — | — |

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup Action | Result |
| --- | --- | --- | --- |
| Two server processes, proxies, foreign HTTP server | Yes | `afterAll` SIGTERM, proxies and server closed | receipt `"serversStopped": true` |
| Temp root (both data dirs and HOMEs) | Yes | removed in `afterAll` | receipt `"rootRemoved": true` |
| Scripted AGY processes | Yes | none started in this round | receipt `"leftoverAgy": []` |
| The runner's temp HOME | Yes | `rm -rf` after the run | removed |

## Preliminary Classification (On `Fail`)

- `Local Fix` (owner: Implementation Engineer). F-001, AC-102 / REQ-102: `PeerClient.fetchServerInstanceId` (`src/remote-collaboration/channel/peer-client.ts:89-100`) parses the answer with `response.json()` and throws on `!response.ok` inside the transport `try`, so a URL that answers but is not an AutoByteus node gets the transport reason "could not be reached" (with a raw JSON parse message for an HTML page) instead of the existing `PEER_NOT_AUTOBYTEUS` "<url> is not an AutoByteus node." The refusal itself happens and nothing is recorded; the reason the owner sees in the Nodes tab is wrong. The unit test models "not AutoByteus" only as JSON without the ID (`peer-client.test.ts:83`), so the mock never produced the real case. Expected: a reached server whose status route answers non-JSON, a non-2xx status, or JSON without a valid `serverInstanceId` → `PEER_NOT_AUTOBYTEUS`; only a transport error or timeout → `PEER_UNREACHABLE`.

## Latest Authoritative Result

- Result: `Fail` (partial round: stable steps 0–2 only; the rest is held)
- Criteria not proven, or parts only the user can check (IDs): not proven AC-101 … AC-112 (held, except the stable parts above); user-only AC-113
- Preliminary classification and recommended owner: `Local Fix`, Implementation Engineer (F-001)
- Next recipient from `get_handoff_rules`: `/software_engineering_team/code_reviewer` (failure-origin review of F-001)
- Notes: when the SR-015 code arrives, round 2 reruns API-00/01/03/20 by impact and runs every held case.
