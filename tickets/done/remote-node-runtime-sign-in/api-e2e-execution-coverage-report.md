# API/E2E Execution Coverage Report — remote-node-runtime-sign-in

The run record and the result. The plan is `api-e2e-coverage-investigation.md`; the history is `api-e2e-revision-record.md`.

## Round

- Coverage investigation: `api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md`, `API-REV-001`
- Test progress log: `api-e2e-test-progress.md`
- Round and trigger: round 1; implementation IR-001 (`c0b385524`) on the direct Medium / Low route
- Prior round reviewed: none
- Deviations from the investigation's plan, and why: API-07 ran twice. Run 1 failed only in new case ARP-11, on a defect in my probe code (a regex for the running-agent count could not span the nested objects of a row). I fixed it to a JSON parse; run 2 passed. The product was not involved.
- Evidence folder: `/home/ryan-ai/hdd_drive/autobyteus_org/autobyteus-worktrees/remote-node-runtime-sign-in/tickets/in-progress/remote-node-runtime-sign-in/evidence/`

## Routing Classification

- Task size: `Medium`
- Architectural risk: `Low`
- Input route: `Direct Low-Risk`
- Successful-output route: `Delivery`
- Proportional test-code review decision: `Not Required — direct low-risk route`

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-1 | `20f31117f` (source = `c0b385524` + ticket docs) + this round's test changes | Linux 7.0, node v22.23.2 | vitest, in-process studio server on port 0, scripted runtime CLIs | `env -i` clean environment, temp `HOME`; test server given `BROWSER` |
| ENV-2 | same | Linux 7.0 | Server `dist` built from this worktree (API-07 run 1); two probe backends (headless: `BROWSER`/`DISPLAY`/`WAYLAND_DISPLAY` empty; desktop: `BROWSER` set, Grok installed); Nuxt dev; headless Chrome 151 | Fresh temp roots, free ports, en + zh-CN, 1440 / 739 px |
| ENV-3 | same | Linux 7.0, Docker | Image `autobyteus/autobyteus-server:beta` 191a2073ebee with this worktree's server `dist` mounted read-only (only the 3 changed files differ, checked in the run); real Codex 0.163.0 / Grok 1.0.62 CLIs; node Chromium on Xvnc `:99`; Nuxt dev; headless Chrome 151 | Test-owned container `api08-signin-node` on 127.0.0.1, fresh volumes (signed out), shipped security options, `AUTOBYTEUS_VNC_SERVER_HOSTS` set; window bound as remote node `docker-node`; no vendor account |

## Cases

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-01 | REQ-002, AC-005, QR-002 | Server rule, service, resolver | Reused IMP-02 | — | Pass | (IMP-02) | (IMP-02) | Ran on `c0b385524`; `git diff --name-only c0b385524 20f31117f` lists only ticket files |
| API-02 | — | Server typecheck | Reused IMP-03 | — | Pass | (IMP-03) | (IMP-03) | Same commit; my changes are test files outside `src` |
| API-03 | AC-001…AC-006, AC-008, REQ-007 | Web unit (manager, row, composable, catalogs) and guards | Reused IMP-04, IMP-05 | — | Pass | (IMP-04, IMP-05) | (IMP-04, IMP-05) | Same commit; no web source changed since |
| API-04 | regression | Full web unit suite | Reused IMP-07 | — | Pass | (IMP-07) | (IMP-07) | Same commit |
| API-05 | regression | Full server unit suite | Reused IMP-06, IMP-06b | — | Pass for this ticket; 3 failures in 2 files out of scope | (IMP-06, IMP-06b) | (IMP-06b) `Tests  2 passed (2)` at the same commit on tmpfs | The 2 files are outside the change's import graph and fail only in this HDD checkout (timing-sensitive waits); recorded as FU-003 by implementation |
| API-06 | REQ-002, QR-002, AC-001/AC-002 contract, AC-006 (preserved operations) | GraphQL over real HTTP, real studio server | `env -i PATH="$PATH" HOME="$(cd "$(mktemp -d)" && pwd -P)" TMPDIR="$TMPDIR" pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/agent-runtimes-graphql.e2e.test.ts --no-watch --reporter=verbose` | ENV-1 | Pass | `API-06-server-e2e-agent-runtimes-graphql.log` | `✓ … AR-13 the web's AgentRuntimes document reads the rows and the node's sign-in browser fact, which polls and sign-ins never change`; `Tests  13 passed (13)` | AR-13 is new; AR-01…AR-12 preserved (sign-in, Cancel, time-out, secret scan, server close) |
| API-07 | AC-001…AC-006, AC-008, AC-009, REQ-005, SCN-A3 | Real backends + Nuxt + headless Chrome | `cd autobyteus-web && node tests/e2e/agent-runtimes-settings-probe.mjs --skip-server-build --output-dir=/tmp/api07-probe-2` (run 1 without `--skip-server-build` built the server) | ENV-2 | Pass (run 2) | `API-07-settings-probe.log`, `API-07-settings-probe/result.json`, `API-07-settings-probe/ARP-08-VIS-019-remote-node.png`, `ARP-11a…d`, `ARP-12a…b` | `Pass ARP-11 …`, `Pass ARP-12 …`, `Pass ARP-08 …`, `Result: Pass`; `ARP-10-scan {"markers": 17, "graphqlResponses": 1189, "dataFiles": 2234, "hits": []}`; screenshot 11b: "Finish signing in to Codex in the browser on that node (VNC Viewer)." with Cancel and Grok's Sign in, hints "Sign in from its command line on that node.", no Update; 11d: status-only note after rebinding | ARP-11 also proves the sign-in runs on the bound node (its login pid, the other node runs nothing), no Update/blocked line with a running Codex agent read by the page, completion → Signed in + "Codex is signed in.", Grok waiting text + Cancel, rebinding to the headless node → status only. Cleanup receipt: both backends, frontend, browser, temp root |
| API-08 | AC-001/AC-002 (to the vendor page), AC-003, AC-004, AC-009, SCN-A1, SCN-A2 | Real Docker node, real vendor CLIs, node Chromium and VNC display, web page | `node tickets/in-progress/remote-node-runtime-sign-in/evidence/API-08-docker-node-remote-signin.mjs <worktree> /tmp/api08-run1` | ENV-3 | Pass | `API-08-docker-node-remote-signin.log`, `API-08-docker-node-remote-signin/result.json`, `API-08-D1-remote-docker-node.png`, `API-08-D2-page-signing-in.png`, `API-08-D2-node-vnc-display.png`, `API-08-D3-page-signing-in.png`, `API-08-D3-node-vnc-display.png`; script `API-08-docker-node-remote-signin.mjs` | `{"agentRuntimeSignInBrowserAvailable": true}`; D2 `redirect_uri http://127.0.0.1:1455/auth/callback`, `LISTEN … 127.0.0.1:1455 … users:(("codex",…))`, callback answers `404` (listening); D3 `LISTEN … 127.0.0.1:34707 … users:(("grok",…))`; D4 `"markers": 10, "graphqlResponses": 389, … "dataFiles": 39, "hits": [], "dataHits": [], "controlHits": 3`; VNC display screenshots: OpenAI "Welcome back" and xAI "Log into your account" in the node's Chromium | Temporary probe: needs Docker, the published image and live vendor sites. The control finds the same markers in the node Chromium's own profile, so the scan method can find them. Container removed, frontend terminated |

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | For A User-Only Part: What You Tried And Why It Still Needs The User |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | API-08 D2 (real node: page Sign in → vendor page in the node's Chromium on its VNC display, CLI callback listening on the node's loopback, Cancel), API-07 ARP-11 (states, waiting text, Cancel, completion → Signed in + announcement on a real backend), API-03 (did-not-finish), API-06 AR-09 (time-out) | Proven up to the vendor page; the end with a real account: Only The User Can Check | Tried: real Docker node of the same image with the real Codex CLI; the vendor page opens in the node's Chromium, the CLI's callback server listens on `127.0.0.1:1455`, the same loopback the node's Chromium uses for the redirect. Finishing needs the user's OpenAI account, and tests must not use the user's nodes (TESTING.md Rule 2). Check on the user's node running this build (R-01, R-02) |
| AC-002 | Yes | API-08 D3, API-07 ARP-11/ARP-12 (Grok waiting text, Cancel) | Proven up to the vendor page; the end: Only The User Can Check | Same as AC-001 with the real Grok CLI (callback on `127.0.0.1:34707`); needs the user's xAI account |
| AC-003 | Yes | API-07 ARP-11, API-08 D1, API-03 | Proven | — |
| AC-004 | Yes | API-07 ARP-11, API-08 D1, API-03 | Proven | — |
| AC-005 | Yes | API-07 ARP-08 (API fact `false` + status-only page), ARP-11 rebinding, API-01 (rule matrix) | Proven (Linux; on macOS/Windows every node has a desktop browser, so ARP-08 records Not applicable there) | — |
| AC-006 | Yes | API-07 ARP-01…ARP-07, API-03, API-06 AR-01…AR-12 | Proven | — |
| AC-007 | Yes | — | Only The User Can Check | Needs a signed-in Codex on the user's Docker node and a real model call on the user's account. The 401 cause was confirmed by the Solution Designer (E-07). The change does not touch the agent path (BEH-006 is outside the change) |
| AC-008 | No | API-07 ARP-12 (zh-CN remote note, hint, waiting text at 1440/739 px), API-03 (catalog spec), docs diff in `c0b385524` | Proven | — |
| AC-009 | Yes | API-08 D4 (real CLIs: live sign-in URLs and their parameter values absent from page, web storage, GraphQL responses, node server output and AutoByteus data, during and after; positive control), API-07 ARP-10, API-06 AR-11 | Proven | — |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | What Supports It | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 90% | 95% | API-03, API-06, API-07; final adds API-08 | Real-account completion (user-only, not a gap) | User check on the node |
| Changed-boundary execution directness | 90% | 95% | API-06 (field over HTTP), API-07 (page from real backends), API-08 (real node) | — | — |
| Cross-boundary integration realism and mock gap | 85% | 95% | API-08 real CLIs, node Chromium, VNC display, callback listener | Window bound through the renderer store, not an Electron window (shell code unchanged) | Isolated desktop instance with a registered node (no expected gain: no shell change) |
| Environment, configuration, identity, and fixture fidelity | 85% | 95% | API-08 uses the user's image with shipped options; dist difference limited to the change | The user's node still runs the image without the field until updated (R-02, delivery) | — |
| Failure, edge-case, lifecycle, and recovery evidence | 95% | 95% | Cancel on real node and probe; did-not-finish (unit), time-out with SIGTERM-ignoring CLI (AR-09); rebinding; headless node | Real 10-minute time-out not waited in a browser (same code path) | — |
| User-surface, browser, and desktop-shell confidence | 90% | 95% | API-07 en/zh-CN, 1440/739 px, announcements; API-08 rendered against the real node | Desktop shell N/A (unchanged) | — |
| Durable regression coverage quality and relevance | 95% | 95% | ARP-11/ARP-12, ARP-08 API fact, AR-13, unit specs | ARP-08's macOS/Windows "Not applicable" branch not run on those platforms here | Run the probe once on macOS |

- Overall post-repository confidence: 90%
- Overall final confidence: 95%
- Calculation method: simple average of the seven categories
- Every critical acceptance criterion directly proven, apart from parts only the user can check: `Yes`
- Any final applicable category below `90%`: `No`
- Default final confidence target of `95%` met: `Yes`
- Confidence-limiting residual risks: R-01 (real-account completion, user check), R-02 (the user's node must run a server with the field before the branch web can read it)

## Broader Validation Decision (Mandatory)

- Decision: `Required` (executed)
- Execution mode: `Browser` + `Live API` against a real Docker node
- Confidence gap or residual risk it addresses: repository evidence uses scripted CLIs; the real vendor CLIs, the node's browser bridge, its VNC display, the callback location and the privacy of live sign-in URLs needed a real node. Gain: cross-boundary realism and AC-009 on real URLs (85% → 95%).
- Browser validation needed: yes; the change is a renderer journey against a remote node.
- If `Not Required`: N/A
- If `Blocked`: N/A

## Desktop Application Validation (When Applicable)

- Approach executed: web-equivalent renderer in headless Chrome (API-07, API-08); no isolated desktop instance, as no shell code changed
- Cases proving web-equivalent behavior: API-07, API-08; shell-specific: none needed
- Effect on any already-running desktop application: `None` (user's containers `autobyteus-server-0/1` not touched; no Electron launched)
- Behavior not directly proven: the Electron path that opens a remote node's window (unchanged code)

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No` (the web reads the field unconditionally; `isOwnNode` removed)
- Durable coverage added or retained only for compatibility-only behavior: `No`
- Reroute classification used: N/A
- Upstream recipient notified: N/A

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `Yes`

| Path / Test | Change | Case IDs | For A Removal |
| --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/runtime/agent-runtimes-graphql.e2e.test.ts` (AR-13; `BROWSER` set for the test server and restored) | Added / Updated | API-06 | — |
| `autobyteus-web/tests/e2e/agent-runtimes-settings-probe.mjs` (desktop backend; ARP-11, ARP-12; ARP-08 API fact and Not applicable on macOS/Windows; ARP-10 scans both nodes; `bindWindow` helper) | Added / Updated | API-07 | — |

- Added or updated paths attached for proportional test-code review: `Not Applicable` (direct low-risk route)
- Diff or repository evidence supplied for removed paths: none removed

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| Runtime CLIs (API-06, API-07) | Scripted `agent-runtimes-fake-cli.mjs` | Deterministic, no account, no network | Covered by real CLIs in API-08 |
| Vendor version sources (API-06, API-07) | In-process stubs | Same | None for this change |
| Desktop browser (API-07 desktop backend) | `BROWSER` set to a path nothing runs | The fact is what is tested; real browser in API-08 | None |
| Vendor accounts | Not used | User's accounts; Rule 2 | Real-account completion is a user check |

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup Action | Result |
| --- | --- | --- | --- |
| API-07 backends, Nuxt dev, browser, temp root | Yes | Probe cleanup | `terminated` ×3, `closed`, `removed` (result.json) |
| Container `api08-signin-node` and its anonymous volumes | Yes | `docker rm -f -v` | `removed`; `docker ps -a` shows only the user's `autobyteus-server-0/1` |
| Exploration container `api08-explore` | Yes | `docker rm -f -v` | removed |
| API-08 Nuxt dev, browser | Yes | process-group SIGTERM, close | `terminated:119626`, `closed`; no Nuxt process left |
| `/tmp/api06`, `/tmp/api07-probe-*`, `/tmp/api08-run1` | Yes | Kept as raw output; evidence copied to the ticket | — |

## Latest Authoritative Result

- Result: `Pass`
- Criteria not proven, or parts only the user can check (IDs): AC-001 and AC-002 end (Signed in with a real account), AC-007 — only the user can check, on the user's Docker node once it runs this build (R-01, R-02)
- Preliminary classification and recommended owner: N/A
- Next recipient from `get_handoff_rules`: see the handoff
- Notes: FU-003 (two server unit test files fail only in this HDD checkout) stays out of scope, recorded by implementation.
