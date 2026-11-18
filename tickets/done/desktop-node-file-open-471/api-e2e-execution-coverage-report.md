# API/E2E Execution Coverage Report — desktop-node-file-open-471 (autobyteus-471): the desktop opens node files; a remote run's path names its node; no phone size limit

## Round

- Coverage investigation: `tickets/in-progress/desktop-node-file-open-471/api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `tickets/in-progress/desktop-node-file-open-471/api-e2e-revision-record.md`, `API-REV-002`
- Test progress log: `tickets/in-progress/desktop-node-file-open-471/api-e2e-test-progress.md`
- Round and trigger: round 2; Implementation Engineer IR-002 (Local Fix for CRR-001 CR-001…CR-003 = API-REV-001 F-1…F-3), code `b0f3d1c42b`, handoff `a044b6652c`. Round 1: code `2e2b9ed436` (IR-001), Fail.
- Prior round reviewed: round 1 (API-REV-001); F-1, F-2, F-3 rechecked first.
- Rerun plan (TESTING.md, rerun by impact): `git diff --name-only a2f52db5b0 b0f3d1c42b` changes web source and specs only (`AgentEventMonitor.vue`, `UserMessage.vue`, `useEventMonitorFilePreview.ts`, `remoteRunFile.ts` (new), `mobileFileOpening.ts`, `useMobileAttachmentOpening.ts`, `fileExplorerContentActions.ts`, `fileExplorerState.ts`, locales, docs); no probe, no server file.
  - Rerun: API-03 (run view and link handler changed; it also builds the packaged app), API-01 D1–D3 and D7–D9 (store), API-02 D5–D6 (run view, attachments), API-04 (store), API-05 (phone run view, `mobileFileOpening`).
  - New: API-06, a phone link and path attachment in a remote run (F-1 named the phone link; round 1 proved it by code reading only).
  - Still valid from round 1: API-01 D4 (object-URL ownership; the URL code is unchanged, and D3 rechecks the release of all 5 store URLs).
- Deviations from the investigation's plan, and why:
  - API-01 added path attachments (RU-05, in the investigation): REQ-003 names them, and the attachment chip opens through the same Files panel store.
  - API-01's "other refusal" case uses a file-like link to `/dev/null` in the container (not a regular file → 400 `NODE_FILE_UNREADABLE`, the code EACCES gives): the image's server runs as root, so a mode-000 file is readable to it, and dropping its DAC capabilities stops the image's entrypoint (`mkdir /run/user/1000: Permission denied`). EACCES was proven on a real host node in autobyteus-436 (API-03).
  - The scripted AGY CLI in the container is a copy of `tests/fixtures/agy-failure-cli.mjs` next to its own `npm install @modelcontextprotocol/client@2.3.1` (the worktree's version): the image has no such module, so its `CALL_TOOL` (the delegation that makes the remote run) never answered (round 1 setup, `API-01-docker-desktop/run1/`).
  - Round 2 publishes node A also on this Mac's Tailscale address (as the launcher does) for the phone of API-06.
  - Baseline test fixes, each with its cause in the Cases notes: `32dccf58fa`, `b49b5c539f` (round 1), `23524436af` (round 2).
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/desktop-node-file-open-471/tickets/in-progress/desktop-node-file-open-471/evidence/api-e2e/` (round 2 files are prefixed `r2-` or in `r2/` folders)

## Routing Classification

- Task size: `Medium`
- Architectural risk: `Low`
- Input route: `Direct` (round 2 after a failure-origin review, CRR-001)
- Successful-output route: Code Reviewer for the proportional test-code review that CRR-001 asked for after this pass (`code-review-report.md` "Observations From API/E2E": this round's test commits and the new specs)
- Proportional test-code review decision: `Required` by CRR-001: `32dccf58fa`, `b49b5c539f`, `23524436af`, and the implementation's new specs

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-1 | round 2: code `b0f3d1c42b` (HEAD `a044b6652c`) | macOS 26 arm64, Node 22.23.1 | packaged app built by API-03 round 2 (`build:electron:mac` from `a044b6652c`) | isolated instances `iso-63841-ca1a` (API-03), `iso-64468-aa8d` (API-01/02), each stopped with its data root removed. Round 1: code `2e2b9ed436` |
| ENV-2 | as ENV-1 | Docker Desktop linux/arm64; Tailscale `100.127.30.107` | `abtest471/autobyteus-server:test` = `autobyteus/autobyteus-server:beta` + this worktree's server package (`r2-API-01-image.log`; server 1.5.13-beta.4) | container `abtest471-node-a` on `127.0.0.1` and the Tailscale address, fresh volumes, `/tmp/abtest471/shared` at `/home/autobyteus/shared`; guarded docker wrapper (no command on a user container except the wrapper's own refusal check) |
| ENV-3 | as ENV-1 | macOS | host node B (`dist/app.js`, temp data root, scripted AGY), paired with A as `host-b-471` | removed |
| ENV-4 | round 2: `a044b6652c` code, probe `23524436af` for MSP-20 | macOS, headless Chrome | phone bundle rebuilt after the packaged build (`r2-API-05-mobile-web-build.log`); clean env | probe-owned nodes, cleanup receipts |

## Cases

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| R-IMP | AC-002…AC-004 (component), AC-001/002 (MSP-37), AC-003/004 (MSP-16, 29), AC-003 grep | web | Reused: IR-001's IMP-01…07; IR-002's IMP-10…16 (`b0f3d1c42b`), incl. the real-caller spec `AgentEventMonitor.remoteRunFiles.spec.ts` | — | Pass | `evidence/implementation/` | as in the handoff | the real-caller spec closes round 1's mock gap (it fails 3 of 4 cases without the fix, per IMP-10) |
| API-03 | AC-005 (embedded window local files) | packaged app | `pnpm -C autobyteus-web test:e2e:event-monitor-file-preview --output-dir …` (round 2 `--build`) | ENV-1 | Pass | `API-03-packaged/r2-event-monitor-file-preview.log`, `…/r2-event-monitor-file-preview/evidence.json`; round 1 `event-monitor-file-preview*` | `"cases":{"N-001":"Pass",…,"N-009":"Pass"}` | round 1: a harness HOME rerun, then N-003 asserted the tab focus one 50 ms poll before the handler's `setTimeout(0)` focus → baseline fix `32dccf58fa` |
| API-01 | AC-001, AC-002, RU-01, RU-02, RU-04, RU-05 (F-3); inside-folder preserved | packaged app's window on a test-owned Docker node | `API-01-image.sh`; `API-01-nodes-and-data.mjs` (`TS_ADDR` set); `API-01-attach-message.mjs`; `isolated-app start --from-worktree`; steps `d1-connect`, `d2-open-window`, `d3-open-node-files`, `r2-d9-attachment-readonly` via `steps/cdp-eval.mjs` | ENV-1, ENV-2 | Pass (round 2); round 1 Fail (F-3) | `API-01-docker-desktop/r2/{d1,d2,d3,d9}.json`, `r2/d3-*.png`, `r2/r2-d9-before.png`, `r2/r2-d9-after-save.png`, `API-01-nodes-and-data.log`; round 1 `API-01-desktop-transcript.md`, `results/`, `shots/`, `r1/` | D1 "Needs connecting" → "Server 1.5.13-beta.4"; D3: md/png/pdf/wav `node-file 200`, every tab `readOnly: true`, inside-folder with no node-file request, 404 "This file was not found on the computer.", 400 "This path is a folder, not a file.", 400 "The file preview could not be opened.", `storeObjectUrls 5, revokedOfThem 5`; **D9 (F-3): `mode: "preview"`, `accessIntent: {"source":"node-file","readOnly":true}`, `editModeControl: 0`, `typedShown: false`, `writes: []`; node file unchanged** | the pdf.js worker URLs (round 1 D4) → FU-001 |
| API-02 | AC-003 desktop (F-1, F-2) | the same window; the run A delegated to host-b-471 | step `r2-d5-remote-run` (window reloaded between the attachment and the link, so each starts from an empty status line) | ENV-1…3 | Pass (round 2); round 1 Fail (F-1, F-2) | `API-01-docker-desktop/r2/d5.json`, `r2/r2-d5-attachment.png`, `r2/r2-d5-link.png`; round 1 `results/d5.json`, transcript D5/D6 | `attachment` and `link`: `statusBefore: ""`, `status: "This file is on host-b-471, where this run runs."`, `drawer: 0`, `requests: []`, no file added; `oldText: false`, `hostWorkspaceText: false` | after a reload the window's deep link to A's run showed "This chat no longer exists"; the step opens A's run from the list (as a user would). The status line outliving a run switch → FU-002 |
| API-06 | AC-003 phone (F-1 phone link), REQ-003 attachments | phone bundle served by node A, paired over Tailscale | `API-06-phone-remote-run/API-06-phone-remote-run.mjs` (Phone Access pairing on `http://100.127.30.107:<port>`; A's run → its remote run; tap the link, then the path attachment) | ENV-2, ENV-3, headless Chrome 390×844 | Pass | `API-06-phone-remote-run/API-06-phone-remote-run.log`, `API-06-*.png`; first runs `first-*`, `API-06-phone-remote-run-first.log` | `link tap: {"status":"This file is on host-b-471, where this run runs.","viewerOpened":false,…,"nodeFileRequests":[]}`; `attachment tap: {"toast":"This file is on host-b-471, where this run runs.",…}`; `PASS no autobyteus-278 text` | 4 console errors, all `401 … @ /favicon.ico` (the browser's own favicon request carries no credential; the known case since autobyteus-437) |
| API-04 | AC-005 (desktop Files panel) | browser probes | `env -i … pnpm -C autobyteus-web test:e2e:file-explorer-pending-save-draft`, `…:search-pdf-preview` | ENV-4 | Pass | `API-04-desktop-file-probes/r2-*.log` and folders; round 1 files | `PSD-001…011 Pass`; `{"API-002":"Pass","API-003":"Pass"}` | round 1: search-pdf-preview API-003 read `content` before the re-read autobyteus-450 added on reopen → baseline fix `b49b5c539f` |
| API-05 | AC-003, AC-004, AC-005 (phone); assumption 6 | phone bundle, all 38 MSP cases | `env -i … pnpm -C autobyteus-web test:e2e:mobile-shell --output-dir=…`; then `--cases=MSP-20` after its fix | ENV-4 | Pass for this ticket's cases; 3 out-of-scope failures | `r2-API-05-mobile-shell.log`, `r2-API-05-mobile-shell/mobile-shell-probe.json`, `r2-API-05-MSP-20-diagnosis/`, `r2-API-05-MSP-20-after-fix.log` and folder; round 1 `API-05-mobile-shell*` | 34 of 38 `Pass` incl. MSP-16, MSP-28…31, MSP-29, MSP-37, MSP-38; MSP-20 after `23524436af`: `Pass`, `onRunScreen: 0`; cleanup `rootRemoved: true` | MSP-24/34/35 (Task rows after TODO) → FU-003, as in round 1. MSP-20 failed once (`onRunScreen: 1`): its window began ~0.69 s before the run screen showed and counted reads by answer time; three instrumented solo runs: polls every 5 s, none sent while the run screen was open → baseline fix `23524436af` (window from the run screen, reads by send time) |
| C-W | Windows/Linux desktop | — | — | — | Not Tested | — | — | macOS host only |

## Round 1 Failures And Their Resolution

| Failure ID | Round 1 | Fix (IR-002) | Round 2 recheck |
| --- | --- | --- | --- |
| F-1 | remote run's link → autobyteus-278 text (`AgentEventMonitor.vue:100`) | the 278 branch and `remote.filePath` removed; `useEventMonitorFilePreview` decides from the conversation's run (`remoteRunFileNode`) | API-02 link (desktop) and API-06 link (phone): "This file is on host-b-471, where this run runs.", nothing read — Resolved |
| F-2 | remote run's path attachment read from the window's node (404, hidden tab) | `UserMessage` asks the run view (`refuseRemoteRunPath`) before opening a `workspace_path` attachment | API-02 attachment: the message, no request, no tab; API-06 attachment (phone): the message — Resolved |
| F-3 | attachment-opened node file editable, silent failed save | the store gives every node file `{ source: 'node-file', readOnly: true }` when the caller gave none | API-01 D9: preview, read-only, no Edit Mode control, no write — Resolved |

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | For A User-Only Part |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | API-01 (D1–D3, D9), R-IMP (MSP-37) | Proven: Markdown, image, PDF and audio outside the run's folder open read-only in a real Electron window on a test-owned Docker node, from links and path attachments | — |
| AC-002 | Yes | API-01 (D3), R-IMP | Proven (missing, folder, other refusal) | — |
| AC-003 | Yes | API-02, API-06, API-05 (MSP-29), R-IMP (IMP-07 grep, IMP-10) | Proven on the desktop and the phone, links and path attachments; no host-workspace or autobyteus-278 text | — |
| AC-004 | Yes | API-05 (MSP-16), R-IMP | Proven | very large files on a real low-end phone (RSK-001, accepted by the user) |
| AC-005 | Yes | API-03, API-04, API-05, API-01 (inside-folder) | Proven; MSP-24/34/35 are outside this ticket (FU-003) | — |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | What Supports It | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 90% | 97% | every AC on real surfaces, both clients and both entry forms | Windows/Linux not run | another OS |
| Changed-boundary execution directness | 88% | 97% | real packaged window, real node, real credential, real remote run, real phone bundle over Tailscale | — | — |
| Cross-boundary integration realism and mock gap | 90% | 95% | Electron + Docker + peer node + phone; the new real-caller spec covers the run view | — | — |
| Environment, configuration, identity, and fixture fidelity | 85% | 93% | setup code, launch credentials, the launcher's publishing, scripted runtime | the root-run image needs a device link for the "other refusal" case (EACCES proven in 436) | — |
| Failure, edge-case, lifecycle, and recovery evidence | 85% | 95% | refusals, object-URL release, read-only save attempt, reloads | — | — |
| User-surface, browser, and desktop-shell confidence | 85% | 96% | desktop window and phone journeys, all three failures rechecked | — | — |
| Durable regression coverage quality and relevance | 88% | 93% | `AgentEventMonitor.remoteRunFiles.spec.ts`, store read-only cases, MSP-16/29/37; three stale probes fixed | the Electron/Docker and phone remote-run journeys are temporary probes (machine-specific) | a desktop-window MSP case for a remote run's link and attachment |

- Overall post-repository confidence: 87%
- Overall final confidence: 95% (95.1%, simple average)
- Every critical acceptance criterion directly proven, apart from parts only the user can check: `Yes`
- Any final applicable category below `90%`: `No`
- Default final confidence target met: `Yes`
- Confidence-limiting residual risks: Windows/Linux desktop not run; RSK-001 (accepted)

## Broader Validation Decision (Mandatory)

- Decision: `Required` (executed in both rounds)
- Execution mode: `Project Desktop Validation` (isolated packaged instance), `Worker or Distributed` (test-owned Docker node + paired host node), `Browser` (phone over Tailscale; desktop and phone probes)
- Gap it addressed: the real window kind and credential, a container's filesystem, a real remote run on both clients, the attachment entry form; round 1's failures were found only here

## Desktop Application Validation

- Surface: isolated packaged instances of this worktree's build, driven over CDP; the user's running app and data untouched.

## Persisted-Data Transition Checks

- Approved decision: `Not Affected`

## Compatibility / Legacy Scope Check

- Backward compatibility introduced or retained: `No`. The autobyteus-278 `remote.filePath` text is removed (round 2).

## Durable Coverage Changed In The Codebase

| Path / Test | Change | Case IDs | Notes |
| --- | --- | --- | --- |
| `autobyteus-web/tests/e2e/event-monitor-file-preview-probe.mjs` | Updated (`32dccf58fa`, baseline fix): waits for the tab focus after the content shows | API-03 | the handler's `setTimeout(0)` focus; not caused by this ticket |
| `autobyteus-web/tests/e2e/search-pdf-preview-probe.mjs` | Updated (`b49b5c539f`, baseline fix): waits for the re-read after reopening a text file | API-04 | stale since autobyteus-450 |
| `autobyteus-web/tests/e2e/mobile-shell-probe.mjs` | Updated (`23524436af`, baseline fix): MSP-20's hidden-list window starts when the run screen shows; phone requests record their send time | API-05 | the window's edge counted a poll sent with the list on screen |

- Added or updated paths attached for proportional test-code review: `Yes`

## Dependencies Mocked Or Emulated

| Dependency | Method | Why | Limitation |
| --- | --- | --- | --- |
| Model inference | scripted AGY CLI (`linked_skills`) on both nodes | agent messages naming paths, a real delegation | transport only |
| An unreadable file | file-like link to `/dev/null` (400 `NODE_FILE_UNREADABLE`) | the image's server runs as root | EACCES proven in 436 |
| A real phone | headless Chrome 390×844, `isMobile`, over the real Tailscale address | no device here | — |

## Temporary Methods And Cleanup

| Item | Owned | Cleanup | Result |
| --- | --- | --- | --- |
| Isolated instances (round 1: 3; round 2: `iso-63841-ca1a`, `iso-64468-aa8d`) | Yes | probe cleanup / `isolated-app stop` | data roots removed, ports released; `isolated-app list` empty |
| Container `abtest471-node-a` (both rounds) and its volumes | Yes | `docker rm -f -v` | only the user's `autobyteus-server-0/1/2` remain, untouched |
| Image `abtest471/autobyteus-server:test` | Yes | `docker image rm` | removed |
| Host node B data roots | Yes | SIGTERM, `rm -rf` | removed |
| Phone pairings on node A (API-06) | Yes | removed with the container | — |
| `/tmp/abtest471/state.json` (probe credential), `setup-code.txt` | Yes | deleted | — |
| MSP-20 diagnosis instrumentation | Yes | the probe file restored before the fix commit | not committed |
| Probe stacks (API-04, API-05) | Yes | probes' own cleanup | receipts clean |
| Evidence secret scan | — | `own_`/`mra_` 30+ chars, `access_token=…`, setup code | no match |

## Latest Authoritative Result

- Result: `Pass`
- Criteria not proven, or parts only the user can check: none required; RSK-001 on a real phone (accepted); Windows/Linux desktop not run
- Next recipient: Code Reviewer — proportional test-code review (CRR-001's request)
- Notes: out-of-scope problems in `follow-ups.md`: FU-001 (pdf.js worker URL), FU-002 (stale status line across runs), FU-003 (MSP-24/34/35, Task rows after TODO).
