# API/E2E Execution Coverage Report — phone-registered-folders-436 (autobyteus-436): the phone opens any file a conversation names, read-only

## Round

- Coverage investigation: `tickets/in-progress/phone-registered-folders-436/api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `tickets/in-progress/phone-registered-folders-436/api-e2e-revision-record.md`, `API-REV-001`
- Test progress log: `tickets/in-progress/phone-registered-folders-436/api-e2e-test-progress.md`
- Round and trigger: round 1; Code Reviewer CRR-001 Pass, HEAD `ea51d4fddd` (base `origin/personal` @ `97ed263074`)
- Prior round reviewed: none
- Deviations from the investigation's plan, and why:
  - API-01 ran twice: run 1 was cut off by the app's automatic update and restart (MSP-01…11 had passed); nothing was left running; run 2 is the result.
  - API-02: the phone's Files screen renders only inside an open run (`MobilePairedShell`: `viewTarget`), as in real use, so a direct `?screen=files&nodeFile=` link on a node without runs shows nothing. The phone journey therefore taps the names in a real run's conversation (API-02b), on a test-owned container of the same image with the scripted AGY CLI (`ECHO_INPUT`, as MSP-16). The launcher-made container (API-02) proved the launcher's publishing and shared-folder mount and the route on the container's paths; it cannot take extra environment for the scripted CLI. API-02b mirrors the launcher's shared mount and publishing.
  - API-03 ran its phone half through a conversation for the same reason.
  - API-04: `event-monitor-file-preview` needed a baseline test fix (its own read of the packaged app's node carried no credential since autobyteus-437).
  - API-05: 15 server E2E files failed; compared with the base in a temporary worktree (TESTING.md Rule 9).
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-registered-folders-436/tickets/in-progress/phone-registered-folders-436/evidence/api-e2e/`

## Routing Classification

- Task size: `Medium`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review`
- Proportional test-code review decision: `Required` (one probe file changed, `cf8035c849`)

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-1 | `ea51d4fddd` | macOS 26 arm64, Node 22.23.1 | server `dist` and phone bundle built after the last source commit (`dist/app.js` 05:15, `dist/public` 04:53 vs `4603511bfb` 04:51 local); headless Google Chrome 156 | clean env; probe-owned nodes |
| ENV-2 | `ea51d4fddd` | Docker Desktop linux/arm64; Tailscale `100.127.30.107` | `abtest436/autobyteus-server:test` = `autobyteus/autobyteus-server:beta` + this worktree's server package (`docker buildx … --target server-package`) | launcher state in `/tmp`; guarded docker wrapper (65 calls, none mutating the user's `autobyteus-server-0/1/2`) |
| ENV-3 | `ea51d4fddd` + `cf8035c849` | macOS arm64 | packaged desktop built by the probe (`isolated-app start --build`) | isolated instance, stopped |
| ENV-4 | base `97ed263074` | temporary worktree (removed) | its own `pnpm install --frozen-lockfile` and server build | API-05 comparison only |

## Cases

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| R-IMP | AC-002, AC-003 (server e2e), AC-004 (component), AC-001 (MSP-16/17) | server, web | Reused: IMP-01…10 at `271656acc0` | — | Pass | (implementation handoff Checks Run) | — | HEAD adds ticket docs only after `271656acc0` |
| API-01 | AC-001, AC-004, AC-006 (phone) | phone bundle, all 23 MSP cases | `env -i … pnpm -C autobyteus-web test:e2e:mobile-shell --output-dir=<API-01-mobile-shell>` | ENV-1 | Pass (cases) | `API-01-mobile-shell.log`, `API-01-mobile-shell/mobile-shell-probe.json`, `MSP-16-outside-*.png`, `MSP-17-*.png`; run 1: `API-01-mobile-shell-run1-interrupted*` | 23 `[mobile-shell] MSP-xx Pass` lines (MSP-01…23), receipt 23/23 `Pass`, cleanup `rootRemoved: true` | The probe exits 1 on 28 unknown console lines `phone console: … 401 (Unauthorized)` during MSP-21…23 (16/8/4): the original phone, revoked in MSP-13, keeps polling alpha without a credential (`server-alpha.log` 461–544: `NODE_CREDENTIAL_REQUIRED /graphql` ×4 and its run sockets, repeating). Not this branch (its only change on the phone's request path adds `/rest/node-files/` to the protected prefixes) → FU-003 |
| API-02 | AC-005 (route); REQ-006; RU-02 | launcher + container + route | `API-02-docker/API-02-launcher-and-image.sh`; route checks in `API-02-phone-route-and-deeplink.mjs` | ENV-2 | Pass (route) | `API-02-docker/API-02-launcher.log`, `API-02-phone-docker.log` | `Shared folder: /home/autobyteus/shared -> /tmp/abtest436/shared-host/shared`; `published: 100.127.30.107:8004 127.0.0.1:8004`; `PASS owner GET shared Markdown: 200 text/markdown nosniff=nosniff csp=set`; `PASS owner GET large PDF: 200 application/pdf 18000828 bytes`; `PASS owner GET a host path not mounted into the container: 404 NODE_FILE_NOT_FOUND`; `PASS owner GET a folder: 400 NODE_FILE_IS_FOLDER`; `/etc/hostname: 200` | its phone half (a direct Files link without a run) is replaced by API-02b |
| API-02b | AC-005; AC-001, AC-004 on a Docker node; REQ-006; RU-01, RU-02, RU-04; QR-001 | phone bundle served by the container, over Tailscale; a real run's conversation | `API-02-docker/API-02b-conversation-probe.mjs`: container with the scripted AGY CLI and the launcher's shared mount; an agent's own message names `/home/autobyteus/shared/ac005-notes.md`, `ac005-picture.png`, `ac005-large.pdf` (18 MB), a host path not mounted, a folder; Phone Access pairing on `http://100.127.30.107:<port>`; tap each name, Back | ENV-2 | Pass | `API-02-docker/API-02b-conversation.log`, `API-02b-phone-*.png`, `API-02b-container.log`; run 1 in `API-02-docker/run1/` | `PASS tap /home/autobyteus/shared/ac005-notes.md: opens read-only ("…SHARED-MARKER-436…"), nodeFile=/home/autobyteus/shared/ac005-notes.md, 284 ms, Back → conversation true`; `image naturalWidth [120]`; `ac005-large.pdf (18 MB): {"canvases":1,"drawn":true,"error":null}, 721 ms`; `"This file was not found on the computer."`; `"This path is a folder, not a file."`; `the container log names none of the opened paths` | run 1: the probe's folder link had no file-like name, so the conversation showed it as text (MSP-16 uses `reports-436.md`); one unexplained console line `net::ERR_CONNECTION_REFUSED` = the phone shell's `localhost:8000/health` check, also in API-01's failed requests (pre-existing) |
| API-03 | REQ-003/004 (`NODE_FILE_UNREADABLE` → "could not be opened"); QR-001 | host node as uid 501, a chmod-000 file | `API-03-unreadable/API-03-unreadable-probe.mjs` (node on `0.0.0.0`, scripted AGY, Phone Access over Tailscale, tap in the conversation) | ENV-1 | Pass | `API-03-unreadable/API-03-unreadable.log`, `API-03-phone-*.png`, `API-03-node.log` | `PASS GET a chmod-000 file: 400 NODE_FILE_UNREADABLE`; `PASS phone, the unreadable file: "The file preview could not be opened."`; `PASS phone, the readable file` | the log line marked FAIL is the probe's too-broad check, reviewed in the same file: the paths appear only in the access log's URL of the two refused requests (existing access-log policy; QR-001) |
| API-04 | AC-006 (desktop) | desktop file viewing | `test:e2e:event-monitor-file-preview` (packaged app), `test:e2e:search-pdf-preview`, `test:e2e:file-explorer-pending-save-draft` | ENV-1, ENV-3 | Pass | `API-04-desktop/*.log` and folders; run 1 `event-monitor-file-preview-run1*` | `"cases":{"N-001":"Pass",…,"N-009":"Pass",…}`, `{"API-002":"Pass","API-003":"Pass"}`, `PSD-001…` all `Pass` | run 1: N-009 `401 !== 200` — the probe's own Node `fetch` to the packaged node (no credential since 437) → baseline test fix `cf8035c849` (read through the app window) |
| API-05 | AC-006 (server suites) | server E2E | `env -i PATH HOME=<temp> TMPDIR pnpm -C autobyteus-server-ts exec vitest run tests/e2e --no-watch` | ENV-1 | Pass for this ticket's scope | `API-05-server-e2e.log`, `API-05-base-comparison.log` | `Test Files  15 failed | 106 passed | 122 skipped (243)`; passing incl. `node-files` (5), `node-access-model` (23), `search-files-through-gate`, workspaces and remote-access suites; base `97ed263074`: the same 15 files fail (`Test Files  15 failed (15)`), no test fails here and passes on base | the 15 failures are requests without the node credential or MCP gateway token (401, `MCP_GATEWAY_TOKEN_REQUIRED`) in suites untouched by this ticket → FU-004 |
| C-03 | Windows folder message | — | — | — | Not Tested | — | — | no Windows host |

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | For A User-Only Part |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | API-01 (MSP-16/17), API-02b | Proven | — |
| AC-002 | Yes | R-IMP (IMP-05 `node-files` e2e), API-05 (`node-files` 5 tests), API-02 (owner on a container) | Proven | — |
| AC-003 | Yes | R-IMP (IMP-03, IMP-05), API-02 (folder 400, not mounted 404) | Proven | — |
| AC-004 | Yes | API-01 (MSP-16), API-02b, API-03 | Proven | — |
| AC-005 | Yes | API-02, API-02b | Proven | — |
| AC-006 | Yes | API-01 (23/23 cases), API-04, API-05 (106 files; the 15 failing files fail identically on the base) | Proven for this ticket; pre-existing failures FU-003, FU-004 | — |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | What Supports It | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 90% | 96% | every AC on real surfaces | Windows (C-03) | a Windows node |
| Changed-boundary execution directness | 90% | 96% | real route, container paths, real permissions, real phone bundle | — | — |
| Cross-boundary integration realism and mock gap | 85% | 95% | Docker over Tailscale, scripted runtime producing the links | real Android device | user |
| Environment, configuration, identity, and fixture fidelity | 90% | 95% | real pairing, launch credential, launcher mount | — | — |
| Failure, edge-case, lifecycle, and recovery evidence | 85% | 95% | not found / folder / unreadable / unmounted; Back | large PDF on a real phone (RSK-001 memory) | user device |
| User-surface, browser, and desktop-shell confidence | 85% | 95% | phone probe 23/23, Docker phone journey, desktop probes | — | — |
| Durable regression coverage quality and relevance | 90% | 95% | node-files e2e/unit, MSP-16/17; one probe fixed | FU-003/FU-004 are outside this ticket | — |

- Overall post-repository confidence: 88%
- Overall final confidence: 95% (95.3%, simple average)
- Every critical acceptance criterion directly proven, apart from parts only the user can check: `Yes`
- Any final applicable category below `90%`: `No`
- Default final confidence target met: `Yes`
- Confidence-limiting residual risks: C-03 (Windows); a large PDF on a real low-memory phone (RSK-001); a remote run's link (assumption 4) only by the link-handler spec

## Broader Validation Decision (Mandatory)

- Decision: `Required` (executed)
- Execution mode: `Browser` (phone bundle), `Worker or Distributed` (Docker container), `Project Desktop Validation` (packaged app probe), `Live API`
- Gap it addressed: container paths (REQ-006), the phone journey on another node over Tailscale, real file permissions, preserved phone/desktop/server behavior

## Desktop Application Validation

- The desktop branch of the link handler is unchanged; API-04's packaged-app probe (event-monitor-file-preview) passes. No effect on the user's running app.

## Persisted-Data Transition Checks

- Approved decision: `Not Affected`

## Compatibility / Legacy Scope Check

- Backward compatibility introduced or retained: `No`

## Durable Coverage Changed In The Codebase

| Path / Test | Change | Case IDs | Notes |
| --- | --- | --- | --- |
| `autobyteus-web/tests/e2e/event-monitor-file-preview-probe.mjs` | Updated (`cf8035c849`, baseline fix): N-009 reads workspace content through the app window | API-04 | stale since autobyteus-437, not caused by this ticket |

- Added or updated paths attached for proportional test-code review: `Yes`

## Dependencies Mocked Or Emulated

| Dependency | Method | Why | Limitation |
| --- | --- | --- | --- |
| Model inference | scripted AGY CLI (`ECHO_INPUT`) in the container and on the host node | the links come from a real agent message without provider calls | transport only |
| A real phone | headless Chrome at 390×844, `isMobile` | no device here | RSK-001 memory on a real phone |

## Temporary Methods And Cleanup

| Item | Owned | Cleanup | Result |
| --- | --- | --- | --- |
| Containers `autobyteus-server-3` (launcher), `abtest436-scripted` ×2 and their volumes | Yes | `docker rm -f -v`; 5 named volumes removed | only the user's `autobyteus-server-0/1/2` remain ("Up 2 hours") |
| Image `abtest436/autobyteus-server:test` | Yes | `docker image rm` | removed |
| Host nodes (API-03), probe stacks, packaged instance | Yes | SIGTERM / probes' own cleanup / `isolated-app stop` | none left; `isolated-app list` empty |
| Interrupted API-01 run's temp root | Yes | removed | — |
| Base worktree `/tmp/abtest436/base-wt`, scratch `/tmp/abtest436` | Yes | `git worktree remove --force`, `prune`, `rm -rf` | removed |
| One `setup-code` call without the temp launcher state | — | it refused (`No launcher state found for autobyteus-server-3`) after one `docker info`; the user's launcher state files unchanged | no effect |
| Evidence secret scan | — | `own_`/`mra_` 30+ chars, `access_token=…`, printed setup codes | no match |

## Latest Authoritative Result

- Result: `Pass`
- Criteria not proven, or parts only the user can check: none required; optional checks on a real phone (large PDF) and a Windows node (C-03) remain
- Next recipient: Code Reviewer — proportional test-code review
- Notes: pre-existing problems outside this ticket recorded as FU-003 (a revoked phone keeps polling without a credential; the full phone probe's late cases inherit its console lines) and FU-004 (15 server E2E files without the node credential since autobyteus-437, urgent).
