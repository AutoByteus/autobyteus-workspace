# API/E2E Execution Coverage Report — desktop-node-file-open-471 (autobyteus-471): the desktop opens node files; a remote run's path names its node; no phone size limit

## Round

- Coverage investigation: `tickets/in-progress/desktop-node-file-open-471/api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `tickets/in-progress/desktop-node-file-open-471/api-e2e-revision-record.md`, `API-REV-001`
- Test progress log: `tickets/in-progress/desktop-node-file-open-471/api-e2e-test-progress.md`
- Round and trigger: round 1; Implementation Engineer IR-001 (direct route), code `2e2b9ed436`, handoff `08d804cbb9` (base `origin/personal` @ `827f1e68dc`)
- Prior round reviewed: none
- Deviations from the investigation's plan, and why:
  - API-01 added path attachments (RU-05, recorded in the investigation): REQ-003 names them, and the attachment chip opens through the same Files panel store.
  - API-01's "other refusal" case uses a file-like link to `/dev/null` in the container (not a regular file → 400 `NODE_FILE_UNREADABLE`, the code EACCES gives): the image's server runs as root, so a mode-000 file is readable to it, and dropping its DAC capabilities stops the image's entrypoint (`mkdir /run/user/1000: Permission denied`). EACCES itself was proven on a real host node in autobyteus-436 (API-03).
  - The scripted AGY CLI in the container is a copy of `tests/fixtures/agy-failure-cli.mjs` next to its own `npm install @modelcontextprotocol/client@2.3.1` (the worktree's version): the image has no such module, so its `CALL_TOOL` (the delegation that makes the remote run) never answered (setup run in `API-01-docker-desktop/run1/`).
  - API-03, API-04 and API-05 needed environment reruns and two baseline test fixes (Cases Notes).
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/desktop-node-file-open-471/tickets/in-progress/desktop-node-file-open-471/evidence/api-e2e/`

## Routing Classification

- Task size: `Medium`
- Architectural risk: `Low`
- Input route: `Direct`
- Successful-output route: `Delivery` (not reached: this round fails)
- Proportional test-code review decision: `Not Required — direct low-risk route` (on Pass). This round: failure-origin review requested.

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-1 | code `2e2b9ed436` (HEAD `08d804cbb9`, then the probe fixes `32dccf58fa`, `b49b5c539f`) | macOS 26 arm64, Node 22.23.1 | packaged app `electron-dist/mac-arm64/AutoByteus.app` built by API-03 run 2 (`build:electron:mac`, from `08d804cbb9`) | isolated instances only (`iso-56258-274d`, `iso-56526-9bcf`, `iso-59405-31d0`), each stopped with its data root removed |
| ENV-2 | as ENV-1 | Docker Desktop linux/arm64 | `abtest471/autobyteus-server:test` = `autobyteus/autobyteus-server:beta` + this worktree's server package (`API-01-image.log`; server 1.5.13-beta.4) | container `abtest471-node-a` on `127.0.0.1:<free port>`, fresh volumes, `/tmp/abtest471/shared` at `/home/autobyteus/shared`; guarded docker wrapper (58 calls; the only one naming a user container is the wrapper's own refusal check) |
| ENV-3 | as ENV-1 | macOS | host node B (`dist/app.js`, temp data root, scripted AGY), paired with A as `host-b-471` | removed |
| ENV-4 | `b49b5c539f` | macOS, headless Chrome | phone bundle rebuilt (`API-05-mobile-web-build.log`), server `dist` of this worktree; clean env | probe-owned nodes, cleanup receipt |

## Cases

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| R-IMP | AC-002…AC-004 (component), AC-001/002 (MSP-37 browser), AC-003/004 (MSP-16, 29), AC-003 grep | web | Reused: IMP-01…05 (`7917df2a15`; later commits change only probe files), IMP-06b, IMP-07 (`2e2b9ed436`) | — | Pass | `evidence/implementation/` | as in the handoff | their mocked specs call `useEventMonitorFilePreview` directly and do not pass through `AgentEventMonitor.vue` (F-1) or the attachment chip (F-2, F-3) |
| API-03 | AC-005 (embedded window local files) | packaged app | `pnpm -C autobyteus-web test:e2e:event-monitor-file-preview` (run 2 `--build`, run 3 `--skip-build`) | ENV-1 | Pass | `API-03-packaged/event-monitor-file-preview.log`, `…/event-monitor-file-preview/evidence.json`; runs 1–2 `*-run1*`, `*-run2*` | `"cases":{"N-001":"Pass",…,"N-009":"Pass"}`; `focusAfterContentMs` N-002 2, N-003 1 | run 1: the build's `pnpm install` under the temp HOME wanted to remove `node_modules` (`ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY`), a harness cause; run 2: N-003 asserted the tab focus one 50 ms poll before the handler's `setTimeout(0)` focus (its failure state shows the focus) → baseline fix `32dccf58fa` |
| API-01 | AC-001, AC-002, RU-01, RU-02, RU-04, RU-05; inside-folder preserved | packaged app's window on a test-owned Docker node | `API-01-image.sh`; `API-01-nodes-and-data.mjs`; `isolated-app start --from-worktree`; steps D1–D4, D7–D9 (`steps/`, run with `steps/cdp-eval.mjs`) | ENV-1, ENV-2 | **Fail (F-3)**; AC-001, AC-002 Pass | `API-01-docker-desktop/API-01-desktop-transcript.md`, `results/d3.json`, `results/d4.json`, `shots/d3-*.png`, `shots/d8-before-typing.png`, `shots/d9-after-save.png`, `API-01-nodes-and-data.log`, `API-01-node-a-container.log` | D1 "Needs connecting" → "Server 1.5.13-beta.4"; D3: md/png/pdf/wav `node-file 200`, read-only, no edit control; inside-folder: no node-file request; 404 "This file was not found on the computer."; 400 "This path is a folder, not a file."; 400 "The file preview could not be opened."; D4: every node-file object URL revoked on close; **D7–D9: a path attachment outside the run's folder opens the node file in the editor (`mode: "edit"`, `accessIntent: null`), typing is accepted, Cmd+S sends `WriteFileContent`, the node refuses ("The path must be relative to the workspace root."), no error is shown** | file unchanged on the node (checked in the container); setup run 1 in `run1/` (scripted CLI could not call tools); pdf.js worker blob URLs not revoked → FU-001 |
| API-02 | AC-003 (desktop) | the same window; the run A delegated to host-b-471 | steps D5, D6 | ENV-1, ENV-2, ENV-3 | **Fail (F-1, F-2)** | `API-01-desktop-transcript.md` (D5, D6), `results/d5.json`, `shots/d5-link.png`, `shots/d5-attachment.png` | **link → status line "That file is on host-b-471: open the run in that node's window to see it."** (REQ-003: "This file is on host-b-471, where this run runs."); **attachment → `GET 127.0.0.1:59343/rest/node-files/content` for B's path → 404, a hidden "not found" tab (`readOnly: null`), no remote-run message** | the stale status line under another run → FU-002 |
| API-04 | AC-005 (desktop Files panel) | browser probes | `env -i … pnpm -C autobyteus-web test:e2e:file-explorer-pending-save-draft`, `…:search-pdf-preview` | ENV-4 | Pass | `API-04-desktop-file-probes/*.log` and folders; `search-pdf-preview-run1*` | `PSD-001…011 Pass`; `{"API-002":"Pass","API-003":"Pass"}` | search-pdf-preview run 1 API-003: the probe read `content` right after reopening a workspace text file, which since autobyteus-450 (`edd84787f7`) re-reads it (`invalidateFileContent`) → baseline fix `b49b5c539f` |
| API-05 | AC-003, AC-004 (phone), AC-005 (phone); assumption 6 | phone bundle, all 38 MSP cases | `env -i … pnpm -C autobyteus-web test:e2e:mobile-shell --output-dir=<API-05-mobile-shell>` | ENV-4 | Pass for this ticket's cases; 3 out-of-scope failures | `API-05-mobile-shell.log`, `API-05-mobile-shell/mobile-shell-probe.json`, `API-05-mobile-web-build.log`; `API-05-mobile-shell-run1-no-bundle.log` | 35 of 38 `Pass` incl. MSP-16 (130,061-character file, last line), MSP-28…31, MSP-29 (toast "This file is on zeta-node, where this run runs."), MSP-37, MSP-38 (renumbered, ran); cleanup `rootRemoved: true`, `unknownBrowserErrors: 0` | MSP-24/34/35 fail on Task rows after TODO (autobyteus-469 model; nothing of this ticket) → FU-003. Earlier attempts stopped before any case: wrong `--output-dir` form, then the phone bundle missing after the packaged build |
| C-W | Windows/Linux desktop | — | — | — | Not Tested | — | — | macOS host only |

## Failures

| Failure ID | Case / Criteria | Expected | Observed | Preliminary Classification | Recommended Owner |
| --- | --- | --- | --- | --- | --- |
| F-1 | API-02 D5; AC-003, REQ-003 | A link in a remote run, on the desktop (and the phone): "This file is on host-b-471, where this run runs." | "That file is on host-b-471: open the run in that node's window to see it." `AgentEventMonitor.vue:96-100` (autobyteus-278) returns this text (`remote.filePath`) for any file path in a remote run before `useEventMonitorFilePreview.openPath` runs, so the new remote-run branch (`useEventMonitorFilePreview.ts` lines 71-72) is never reached from the run view. The phone's run view (`MobileRunTargetView.vue`) renders the same `AgentEventMonitor`, so a phone link takes the same branch (code reading; MSP-29 covers only the attachment chip). The design's DS-002 owners (`useEventMonitorFilePreview`, `mobileFileOpening`) leave out this component. | Local Fix (implementation; design owner map missed `AgentEventMonitor.vue`) | Implementation Engineer, through failure-origin review |
| F-2 | API-02 D5, D6; AC-003, REQ-003, REQ-001 ("when it is on the run's node") | A path attachment in a remote run: the remote-run message; nothing read from this window's node | The chip (`UserMessage.vue` → `contextAttachmentPresentation.openAttachment` → `fileExplorerStore.openFilePreview(<absolute path>)`) opens it as a node file of the window's node: `GET 127.0.0.1:59343/rest/node-files/content?path=<B's path>` → 404, a tab "not found" in the hidden Files panel (`readOnly: null`); no message. A file at the same path on node A would be shown as this attachment. | Local Fix (implementation) — or `Unclear` whether REQ-003's "(links and path attachments)" covers the desktop; the read from the wrong node is a defect either way | Implementation Engineer / Solution Designer for the REQ-003 wording, through failure-origin review |
| F-3 | API-01 D7–D9; REQ-001 (read-only) | A file named in a conversation opens read-only, wherever it is | A path attachment outside the run's folder (a run on the window's node) opens through `openFilePreview` without an access intent; the store now reads every absolute path in this window as a node file, so it opens in the Monaco editor in edit mode; typing is accepted and Cmd+S sends `WriteFileContent`, refused by the node ("The path must be relative to the workspace root."), with no error shown and the typed text kept. Before this ticket the same click did not open the file at all. | Local Fix (implementation: a node file opens read-only whoever asks, e.g. in `_openFileWithMode`/`_loadNodeFile`) | Implementation Engineer, through failure-origin review |

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | For A User-Only Part |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | API-01 (D1–D3), R-IMP (MSP-37) | Proven for links (Markdown, image, PDF, audio; read-only; real Electron window on a test-owned Docker node with the owner credential from a setup code). F-3: path attachments open editable | — |
| AC-002 | Yes | API-01 (D3), R-IMP | Proven (missing, folder, other refusal) | — |
| AC-003 | Yes | API-05 (MSP-29, phone attachment), API-02 | **Not Proven**: desktop link F-1 (and phone link by code reading), desktop attachment F-2 | — |
| AC-004 | Yes | API-05 (MSP-16), R-IMP | Proven | very large files on a real phone (RSK-001, accepted) |
| AC-005 | Yes | API-03, API-04, API-05, API-01 (inside-folder) | Proven for this ticket's preserved behavior; MSP-24/34/35 out of scope (FU-003) | — |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | What Supports It | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 75% | 50% | AC-001/002/004/005 proven | AC-003 failing (F-1, F-2), read-only broken for attachments (F-3) | the fixes, then API-01/02 again |
| Changed-boundary execution directness | 75% | 95% | real packaged window, real node, real credential | — | — |
| Cross-boundary integration realism and mock gap | 70% | 90% | Electron + Docker + peer node; the specs bypassed `AgentEventMonitor` and the attachment chip | — | durable cases for both |
| Environment, configuration, identity, and fixture fidelity | 85% | 90% | setup code, launch credentials, scripted runtime | the root-run image needed a device link for the refusal | — |
| Failure, edge-case, lifecycle, and recovery evidence | 75% | 90% | refusals, object-URL lifecycle | — | — |
| User-surface, browser, and desktop-shell confidence | 75% | 60% | real window journeys | F-1…F-3 are visible to the user | — |
| Durable regression coverage quality and relevance | 80% | 70% | two stale probes fixed | no durable case for the remote-run link/attachment through the run view, nor for attachment read-only | a desktop-window MSP case and an `AgentEventMonitor` component case |

- Overall post-repository confidence: 76%
- Overall final confidence: 78% (simple average); not a Pass: AC-003 fails and categories are below 90%
- Every critical acceptance criterion directly proven, apart from parts only the user can check: `No` (AC-003)
- Any final applicable category below `90%`: `Yes`
- Default final confidence target met: `No`

## Broader Validation Decision (Mandatory)

- Decision: `Required` (executed)
- Execution mode: `Project Desktop Validation` (isolated packaged instance), `Worker or Distributed` (test-owned Docker node + paired host node), `Browser` (phone and desktop probes)
- Gap it addressed: the real window kind, the Electron owner credential, a container's filesystem, a real remote run; it found F-1…F-3, which the mocked specs could not show

## Desktop Application Validation

- Surface: isolated packaged instance (`iso-59405-31d0`) of this worktree's build, driven over CDP; the user's running app and data untouched.

## Persisted-Data Transition Checks

- Approved decision: `Not Affected`

## Compatibility / Legacy Scope Check

- Backward compatibility introduced or retained: `No`. Note: F-1 shows the autobyteus-278 remote-run text still in use (`remote.filePath`), next to the new `file_on_other_node`.

## Durable Coverage Changed In The Codebase

| Path / Test | Change | Case IDs | Notes |
| --- | --- | --- | --- |
| `autobyteus-web/tests/e2e/event-monitor-file-preview-probe.mjs` | Updated (`32dccf58fa`, baseline fix): waits for the tab focus after the content shows | API-03 | timing of the handler's `setTimeout(0)` focus; not caused by this ticket |
| `autobyteus-web/tests/e2e/search-pdf-preview-probe.mjs` | Updated (`b49b5c539f`, baseline fix): waits for the re-read after reopening a text file | API-04 | stale since autobyteus-450 |

- Suggested durable coverage with the fixes: a desktop-window MSP case (next to MSP-37) clicking a link and a path attachment in a remote run and a path attachment outside the run's folder (read-only), and an `AgentEventMonitor` component case for a remote run's path.

## Dependencies Mocked Or Emulated

| Dependency | Method | Why | Limitation |
| --- | --- | --- | --- |
| Model inference | scripted AGY CLI (`linked_skills`) on both nodes | agent messages naming paths, a real delegation | transport only |
| An unreadable file | file-like link to `/dev/null` (400 `NODE_FILE_UNREADABLE`) | the image's server runs as root | EACCES proven in 436 |

## Temporary Methods And Cleanup

| Item | Owned | Cleanup | Result |
| --- | --- | --- | --- |
| Isolated instances `iso-56258-274d`, `iso-56526-9bcf`, `iso-59405-31d0` | Yes | probe cleanup / `isolated-app stop` | data roots removed, ports released; `isolated-app list` empty |
| Container `abtest471-node-a` (4 setup runs) and its volumes | Yes | `docker rm -f -v` | only the user's `autobyteus-server-0/1/2` remain, untouched |
| Image `abtest471/autobyteus-server:test` | Yes | `docker image rm` | removed |
| Host node B (4 data roots) | Yes | SIGTERM, `rm -rf` | removed |
| `/tmp/abtest471/state.json` (probe credential), `setup-code.txt` | Yes | deleted | — |
| Probe stacks (API-04, API-05) | Yes | probes' own cleanup | receipts clean |
| Evidence secret scan | — | `own_`/`mra_` 30+ chars, `access_token=…`, setup code | no match |

## Latest Authoritative Result

- Result: `Fail`
- Failing cases and criteria: API-02 (F-1, F-2; AC-003), API-01 (F-3; REQ-001 read-only)
- Next recipient: Code Reviewer — focused failure-origin review
- Notes: AC-001, AC-002, AC-004 and AC-005 are proven on the real surfaces; recheck API-01 (D3, D7–D9), API-02 and the phone link after the fix.
