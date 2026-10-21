# Investigation Notes — remote-node-runtime-sign-in

## Investigation Meta

- Package identifier: `remote-node-runtime-sign-in`
- Request / ticket: Project Task "Agent Runtimes: allow account sign-in (Codex and others) for runtimes on a Docker/remote node", from `/project_task_manager` (run `project_task_manager_21a48907070a400cb84ae3c055534692`), 2026-10-21. Project task folder: `/home/ryan-ai/.autobyteus/server-data/projects/project_de48ed0e-f4a2-43d7-b22a-4c162c9b1dda/tasks/project_task_cd8178f2-8534-4aae-bfd0-b598a52fc105`.
- Workspace root: `/home/ryan-ai/hdd_drive/autobyteus_org/autobyteus-worktrees/remote-node-runtime-sign-in`
- Repository mode: Git
- Task worktree / branch: `/home/ryan-ai/hdd_drive/autobyteus_org/autobyteus-worktrees/remote-node-runtime-sign-in`, branch `feature/remote-node-runtime-sign-in`
- Resolved base remote / branch / revision: `origin/personal` at `a22394f0c` (fetched 2026-10-21; `origin/HEAD` → `origin/personal`)
- Finalization target remote / branch: `origin/personal`
- Bootstrap result: worktree created from the freshly fetched base; ticket folder `tickets/in-progress/remote-node-runtime-sign-in/`
- Bootstrap blocker: none
- Current solution revision ID: SR-002
- Authorities read (2026-10-21): requirements gate `references/requirements-engineering.md`; also `references/ticket-scope.md`, `references/finding-the-cause.md`, `references/handoff.md`. Architecture gate: see design-spec.md.
- Investigation status: complete for requirements and design.

## Initial Request And Clarifications

- Original request (Task): on a remote Docker node (`http://localhost:8002`, REMOTE, ready) Settings → Agent Runtimes shows "Status only. Update these runtimes on that node's computer.", every runtime "Not signed in", and no Sign in button. On the embedded node, Sign in works for Codex. The Docker node runs Chromium on its desktop (seen through the app's VNC view), so a sign-in started from the app could run its browser flow there.
- First question to answer: why is sign-in missing for Codex on the Docker node, and why do some providers support in-app sign-in while others don't.
- Also: confirm or rule out that the chat's repeated "An Error Occurred, Reconnecting… n/5" comes from the runtimes not being signed in.
- Done: explanation; sign-in on Docker/remote nodes where a runtime supports it, status then Signed in; what can't be supported explained and recorded as a follow-up; merged, verified against a running Docker node, cleaned up.
- Clarifications received: none needed.

## Product And Domain Understanding

- Product area: Settings → Agent Runtimes (shipped by ticket `runtime-lifecycle-review`, `tickets/done/runtime-lifecycle-review/`).
- Actors: the user in an AutoByteus window bound to a remote node (usually a Docker node started from the AutoByteus server image); the node's server; the vendor CLIs on the node; the node's desktop browser (Chromium under VNC).
- Terms: *own node* = the desktop app's embedded node; *remote node* = any other registered node; *Docker node* = a node running the `autobyteus/autobyteus-server` image, which ships a VNC desktop with Chromium.

## Source Log

| Date | Source Type | Exact Source / Command / Query | Why Consulted | Relevant Finding | Follow-Up |
| --- | --- | --- | --- | --- | --- |
| 2026-10-21 | User | Task screenshots, copied to `evidence/user-01…03-*.png` | Problem evidence | Remote page has no Sign in; chat shows "An Error Occurred / Reconnecting… 2/5…5/5"; VNC shows the node's Chromium | — |
| 2026-10-21 | Doc | `tickets/done/runtime-lifecycle-review/requirements-doc.md` (D-3, UD-006, UD-008, REQ-006, REQ-007, AC-010), `investigation-notes.md` E-R08, E-R09, E-R21, `follow-ups.md` | Why sign-in is hidden; why per-runtime differences | E-01, E-02 | — |
| 2026-10-21 | Code | `autobyteus-web/components/settings/agent-runtimes/AgentRuntimesManager.vue`, `AgentRuntimeRow.vue`, `agentRuntimesPresentation.ts`, `localization/messages/{en,zh-CN}/agentRuntimesSettings.ts`, `docs/settings.md` §Agent Runtimes | Where sign-in is hidden | E-03 | — |
| 2026-10-21 | Code | `autobyteus-server-ts/src/runtime-management/agent-runtimes/*`, `src/api/graphql/types/agent-runtimes.ts`, `docs/modules/agent_runtimes.md` | Does the server refuse remote sign-in? | E-04 | — |
| 2026-10-21 | Code | `autobyteus-server-ts/docker/Dockerfile.monorepo`, `supervisor-autobyteus-server.conf`, `open-vnc-browser-url.sh`, `xdg-open-root-bridge.sh`, `exo-open-root-bridge.sh`, `docker-compose.yml` | Where a server-started browser opens in a Docker node | E-05 | — |
| 2026-10-21 | Runtime | `docker ps`; `docker inspect autobyteus-server-1` (env, mounts, security options; secrets filtered); `docker exec autobyteus-server-1` read-only: `env`, `which`, `codex --version`, `ps` | The user's running Docker node (read only, nothing changed) | E-06 | — |
| 2026-10-21 | Runtime | `docker exec autobyteus-server-1 … /var/log/supervisor/autobyteus_server.err.log` (read only) → `evidence/SD-02-docker-node-codex-401.log` | Cause of "Reconnecting… n/5" | E-07 | FU-001 |
| 2026-10-21 | Command | `evidence/SD-probe-remote-signin.sh` on a throwaway container of the same image → `evidence/SD-03-probe-run.log`, `evidence/SD-01-grok-signin-opened-in-node-chromium.png` | Does a server-started sign-in reach the node's Chromium? | E-08 | — |
| 2026-10-21 | Command | `codex login` and `grok login --oauth` inside the probe container with `DISPLAY` and `BROWSER` unset and the xdg-open bridge off the PATH, `timeout 6` | What happens on a node without a desktop | E-09 | — |
| 2026-10-21 | Code | `autobyteus-web/components/workspace/tools/VncViewer.vue`, `utils/vncHosts.ts`, `composables/useTerminalSession.ts`, `localization/messages/en/shell.ts` | How the user sees the node's desktop and command line from the app | E-10 | — |
| 2026-10-21 | Code | `autobyteus-server-ts/src/api/security/remote-access-route-policy.ts` | Who may call the node's GraphQL mutations | E-11 | — |

## Evidence

- **E-01 Why sign-in is hidden on remote/Docker nodes (Read).** Decision D-3 of `runtime-lifecycle-review`: "Update and Sign in on remote/Docker nodes? … Containers lose updates on rebuild; remote sign-in needs codes → Desktop's own node only; remote status only", decided by that ticket's Solution Designer as recommended, user informed (not separately answered). Its E-R21 "Remote/Docker" paragraph assumed "the browser is on the desktop, the engine on the node", so remote sign-in would need device codes shown in AutoByteus; it chose "Status only on remote nodes for the first version". REQ-007 / AC-010 made it the shipped behavior. It was a first-version scoping choice, not a technical or vendor limit, and it did not consider that Docker nodes have their own desktop browser.
- **E-02 Why only Codex and Grok have in-app sign-in (Read).** Per runtime (from E-R08, E-R09, E-R21 and UD-006/UD-008 of the earlier ticket):
  - Codex: `codex login` opens the browser with a local callback; OpenAI allows local/open-source apps to use Codex sign-in. In-app.
  - Grok: `grok login --oauth` opens the browser with a local callback; xAI states no restriction. In-app.
  - Claude: Anthropic's Agent SDK terms: "Unless previously approved, Anthropic does not allow third party developers to offer claude.ai login or rate limits for their products…". The user decided (UD-006): no Claude Sign in button, a hint to sign in from its command line. Technically it would work (`claude auth login`); the reason is policy.
  - Antigravity: no login command exists (1.4.3); sign-in happens only inside the interactive `agy` screen, which needs a pseudo-terminal; Google's position on third-party apps is unclear (earlier FU-001). The user decided (UD-008): command line only.
- **E-03 The hiding is in the web client only (Read).** `AgentRuntimesManager.vue`: `isOwnNode = windowNodeContextStore.isEmbeddedWindow` with the comment "Update and Sign in run only on the desktop's own node; a remote/Docker node window is status only (D-3)". `AgentRuntimeRow.vue` renders actions, the command-line hint and the sign-in outcome only `v-if="isOwnNode"`. The remote note copy is `settings.agentRuntimes.node.remoteNote` (en + zh-CN). `offersSignIn(runtime)` = installed, route `BROWSER`, account `SIGNED_OUT`.
- **E-04 The server already accepts sign-in on any node (Read; Reproduced in E-08).** `startAgentRuntimeSignIn` / `cancelAgentRuntimeSignIn` have no own-node check; `AgentRuntimeStatusService.startSignIn` spawns `signInArgv` through `RuntimeProcessOperation` with `env: process.env`, no stdin, 10-minute time-out; when the process exits it reads the account again and ends at Signed in or `DID_NOT_FINISH`. Server doc: "The web client hides Update and Sign in there".
- **E-05 A Docker node routes browser opens to its VNC Chromium (Read).** The image sets `BROWSER=/usr/local/bin/open-vnc-browser-url.sh` (Dockerfile `ENV` and the supervisor program environment) and installs `xdg-open` / `exo-open` bridges that, when called by root, run `open-vnc-browser-url.sh`. That script runs `xdg-open <url>` as `vncuser` on `DISPLAY=:99`. The server runs as root with `HOME=/root`.
- **E-06 The user's Docker node (Read; nothing changed).** `autobyteus-server-1` from `autobyteus/autobyteus-server:beta`, ports 8002→8000 and 6081→6080; env `DISPLAY=:99`, `BROWSER=/usr/local/bin/open-vnc-browser-url.sh`, `HOME=/root`, `AUTOBYTEUS_VNC_SERVER_HOSTS=localhost:6081` (the app's VNC Viewer reads this node setting). Codex 0.163.0 at `/usr/bin/codex`, also `claude`, `grok`, `agy`. Chromium runs as `vncuser` with `--remote-debugging-port=9222`. `/root` is the named volume `autobyteus-server-1-root-home`, so vendor sign-ins written under `/root` survive container re-creation, while the runtime binaries live in the image (an update would be lost on re-creation, the D-3 Update reason, still valid). Security options `seccomp=unconfined`, `CAP_SYS_ADMIN`.
- **E-07 The chat errors come from Codex not being signed in (Read, from the node's log).** The Docker node's server error log has 6 lines at 2026-10-21T06:55:26–32Z: `[CodexAppServerClient] stderr: … codex_api::endpoint::responses_websocket: failed to connect to websocket: HTTP error: 401 Unauthorized, url: wss://api.openai.com/v1/responses` (`evidence/SD-02-docker-node-codex-401.log`). Six attempts within 6 s matches one try plus Codex's own 5 retries; "Reconnecting... n/5" is Codex's own retry message, which the web shows as an error segment (fixture `autobyteus-web/tests/integration/codex-turn-lifecycle-native-to-live-projection.integration.test.ts` line 183, message `'Reconnecting... 1/5'`). The account read for the same node says Codex Not signed in (user screenshot). Conclusion: confirmed as the cause, by reading; not re-run with an account. Signing Codex in should end it (checked in the final verification, AC-007). The generic error text, which does not say "not signed in", is FU-001.
- **E-08 A sign-in started through the node's API opens in the node's Chromium (Reproduced).** `evidence/SD-probe-remote-signin.sh` starts a throwaway container of `autobyteus/autobyteus-server:beta` with fresh volumes and the same security options, then calls the node's own GraphQL `startAgentRuntimeSignIn`:
  - Codex: `codex login` started (`/usr/bin/codex login`), listening on `127.0.0.1:1455` (its callback), the node's Chromium opened `https://auth.openai.com/log-in`; row `SIGN_IN RUNNING`; Cancel → operation cleared.
  - Grok: `grok login --oauth` started, callback listening on `127.0.0.1:<port>`, the node's Chromium opened `https://accounts.x.ai/sign-in?…` (screenshot `evidence/SD-01-grok-signin-opened-in-node-chromium.png`); Cancel worked.
  - Both callbacks listen on the container's loopback, which the container's Chromium reaches, so finishing sign-in in that browser completes the vendor's flow. Not completed (no account used; the user's real-account check is AC-007). Log: `evidence/SD-03-probe-run.log`; container removed by the script.
  - Side finding: without `seccomp=unconfined` and `SYS_ADMIN` the image's Chromium crash-loops ("Failed to move to new namespace … Operation not permitted"); the shipped compose/start scripts pass these, the user's node has them.
- **E-09 On a node with no desktop, the vendor login just waits (Reproduced).** With `DISPLAY` and `BROWSER` unset and no bridge on the PATH: `codex login` prints "Starting local login server on http://localhost:1455. If your browser did not open, navigate to this URL … On a remote or headless machine? Use `codex login --device-auth` instead." and keeps waiting (killed by `timeout`, exit 124); `grok login --oauth` prints "Open this URL to sign in: <url>" and keeps waiting (exit 124). AutoByteus never shows that URL (privacy rule of the earlier ticket), so on such a node a Sign in button would only wait 10 minutes and end in "Sign-in didn't finish".
- **E-10 How the user reaches a node's desktop and command line from the app (Read).** The workspace's right-side tabs include **VNC Viewer** (`shell.rightTabs.vncViewer`), which connects to the hosts in the bound node's `AUTOBYTEUS_VNC_SERVER_HOSTS` setting (E-06: set on the Docker node), and **Terminal**, a PTY on the bound node (`useTerminalSession`, default cwd the server home). On a Docker node the Terminal runs as root with the server's environment, so `claude auth login` or `agy` run there would also open their pages in the node's Chromium (Read only; not run).
- **E-11 Who may start a sign-in on a node (Read).** GraphQL on a node is governed by its remote-access route policy (loopback trust, bearer credentials). The sign-in mutations are already reachable by every client the node accepts (E-04); this ticket changes only whether the button is shown, not who may call the API.

## Relevant Existing Behavior And Supported Product Paths

| Behavior ID | Kind | Supported Trigger Or Governing Contract | Current Supported Product Behavior Path / Lifecycle | Current Outcome / Invariants | Evidence | Confidence / Unknown |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | Own-node window, Settings → Agent Runtimes | Codex/Grok signed out → Sign in → vendor page in the user's browser → "Finish signing in to <Runtime> in your browser." + Cancel → Signed in, or after 10 min "Sign-in didn't finish. Try again." | Shipped (REQ-006) | E-03, E-04 | High |
| BEH-002 | User | Own-node window | Claude/Antigravity signed out → "Sign in from its command line.", no button | Shipped (UD-006, UD-008) | E-02, E-03 | High |
| BEH-003 | User | Remote-node window | Same rows and statuses; note "Status only. Update these runtimes on that node's computer."; no Update, no Sign in, no hint | Shipped (REQ-007, D-3) | E-01, E-03 | High |
| BEH-004 | System | A Codex agent on a node where Codex is signed out | Codex gets 401 from OpenAI, retries 5 times; chat shows "An Error Occurred / Reconnecting… n/5" | Observed on the user's node | E-07 | High (read from log) |

## Relevant Codebase And Technical Facts

| Path / Component / Contract | Current Responsibility Or Behavior | Requirement Implication | Architecture Question / Design Implication |
| --- | --- | --- | --- |
| `autobyteus-web/components/settings/agent-runtimes/*` | Hides actions, hints and sign-in outcome unless own node | The change is mostly here | Replace the single `isOwnNode` gate by "can sign in here" for sign-in only |
| `autobyteus-server-ts/src/runtime-management/agent-runtimes/*` | Starts the vendor login on its node; no node restriction | Works for Docker nodes as is (E-08) | The node needs to say whether it can show a browser (E-09) |
| `autobyteus-server-ts/docker/*` | Routes `BROWSER`/`xdg-open` to the VNC Chromium | The Docker image already provides the browser | No image change needed |
| GraphQL `agentRuntimes` | Rows only, no node-level fact | Client cannot tell a desktop node from a headless one | New read-only node fact |

## Structural And Payload Surface Inventory

### Payload Or Content Surfaces

- Localization catalogs `autobyteus-web/localization/messages/{en,zh-CN}/agentRuntimesSettings.ts`.
- Docs: `autobyteus-web/docs/settings.md` §Agent Runtimes; `autobyteus-server-ts/docs/modules/agent_runtimes.md`.

### Structural Surfaces

- GraphQL schema of the Agent Runtimes resolver (additive read-only field).
- No persistence, no migration, no new process, no new route.

### Potential Structural Impacts To Investigate

- API change: additive GraphQL field. Security boundary: unchanged (E-11). Concurrency: unchanged (one operation per runtime). Deployment: none; the Docker image already has the bridge. Confirmed absent: persistence, migration.

## Runtime, Probe, Or Reproduction Findings

| Method / Command | Scenario | Observation | Established | Requirement Implication | Artifact / Evidence Path |
| --- | --- | --- | --- | --- | --- |
| `evidence/SD-probe-remote-signin.sh` | Sign-in started on a Docker node through its API | Codex and Grok sign-in pages open in the node's Chromium; callbacks on the container loopback; Cancel works | Reproduced | Remote sign-in via the node's browser is feasible with today's server and image | `evidence/SD-03-probe-run.log`, `evidence/SD-01-…png` |
| `codex login` / `grok login --oauth` without display | Node without a desktop | Both wait with a URL on stdout | Reproduced | Do not offer Sign in on such a node | E-09 (command in Source Log) |
| Node log read | Chat "Reconnecting… n/5" | Codex 401 Unauthorized ×6 | Read | Cause confirmed: Codex not signed in | `evidence/SD-02-docker-node-codex-401.log` |

- Temporary diagnostics: none (no code edited; the probe container was removed).
- Reproduction for implementation to start from: `tickets/in-progress/remote-node-runtime-sign-in/evidence/SD-probe-remote-signin.sh` (server side already passes; the missing part is the client button, which the web unit tests and the settings probe cover).

## Stakeholder And User Evidence

| Source / Actor | Need, Problem, Or Constraint | Evidence Strength | Requirement Implication | Open Question |
| --- | --- | --- | --- | --- |
| User (Task) | Sign in runtimes on a Docker node from the app; finish in the node's browser via VNC | Direct | UC-001 | — |
| User (earlier UD-006/UD-008) | No in-app sign-in for Claude and Antigravity; abide vendor rules | Direct, still valid | Preserved | — |

## External Contracts, Standards, And Dependencies

| Contract / Dependency | Version / Authority | Relevant Behavior Or Constraint | Evidence | Unknown / Risk |
| --- | --- | --- | --- | --- |
| Codex CLI `codex login` | 0.163.0 | Opens `$BROWSER`/xdg-open; callback `127.0.0.1:1455`; waits until done or killed | E-08, E-09 | — |
| Grok CLI `grok login --oauth` | 1.0.62 | Opens the browser; loopback callback; waits | E-08, E-09 | — |
| OpenAI Codex sign-in terms | E-R09 of the earlier ticket | Local/open-source apps may use it; not commercial hosted services | earlier E-R09 | A user's own node is the user's own install; AutoByteus offers no hosted service here |
| Anthropic Agent SDK terms | earlier E-R09 | No offering of claude.ai login without approval | earlier E-R09 | Preserved: no Claude button |
| AutoByteus server Docker image | `autobyteus/autobyteus-server:beta` | `BROWSER` → VNC Chromium bridge; `/root` volume | E-05, E-06 | Chromium needs the shipped security options |

## Persisted Data And State Facts

- Affected stored subject: vendor credentials written by the vendor CLI under the node's home (`/root/.codex`, `/root/.grok` on Docker nodes). AutoByteus never reads, copies or stores them (unchanged rule).
- They persist with the node's home volume (E-06). Nothing in AutoByteus's own data changes.

## Product Design Request Context

- Product Design request in the current input: Not stated. Small copy additions on an approved page; no Product Design requested.

## Product Design Findings

- N/A — not requested.

## Supplemental Artifact Inventory

| Artifact Path | Owner | Purpose | Scope | Related Requirement / AC IDs | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- | --- | --- |
| `evidence/SD-probe-remote-signin.sh` | Solution Designer | Reproduction on a throwaway Docker node | E-08 | REQ-001, AC-001, AC-002 | Current | Evidence, not behavior-defining |
| `evidence/SD-03-probe-run.log`, `evidence/SD-01-grok-signin-opened-in-node-chromium.png` | Solution Designer | Probe output | E-08 | AC-001, AC-002 | Current | Evidence |
| `evidence/SD-02-docker-node-codex-401.log` | Solution Designer | Cause of the chat errors | E-07 | AC-007 | Current | Evidence |
| `evidence/user-01…03-*.png` | User (copied) | Problem screenshots | — | — | Current | Evidence |

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Why It Matters | Resolution / Owner | Status |
| --- | --- | --- | --- | --- | --- |
| R-01 | Risk | Finishing sign-in with a real account in the node's Chromium not yet observed | AC-001/AC-002 "Signed in" end state | Final verification against the user's running Docker node with his account (delivery / user) | Open |
| R-02 | Risk | Codex agents already running on the node may keep failing until a new message/run after sign-in | AC-007 | Verify a new message after sign-in | Open |
| U-01 | Unknown | Whether every remote node the user registers is a Docker node | Headless nodes must not show a button that cannot finish | Handled by REQ-002 (node reports whether it can show a browser) | Resolved by requirement |

## Architecture Investigation Findings

- A-01 (Read) `AgentRuntimeStatusService` is the server's only boundary; `RuntimeProcessOperation` spawns with `process.env`, so on a Docker node `BROWSER` and `DISPLAY` reach the vendor CLI (E-05, reproduced E-08).
- A-02 (Read) `agentRuntimes` resolver maps `AgentRuntimeStatus` rows; there is no node-level field; the web reads it in `composables/settings/useAgentRuntimes.ts` (polling 2 s / 10 s) through `graphql/queries/agentRuntimesQueries.ts`.
- A-03 (Read) On Linux the vendor CLIs need either `BROWSER` or a display (`DISPLAY` / `WAYLAND_DISPLAY`) to open a page (E-09). macOS and Windows open the default browser of the logged-in desktop session.
- A-04 (Read) `windowNodeContextStore.isEmbeddedWindow` is the client's own-node fact; Update and the blocked-update line keep using it.

## Requirement Implications

- The client gate (E-03) is the cause; the server and the Docker image already support the flow (E-04, E-05, E-08).
- A node without a desktop browser must not offer Sign in (E-09).
- Claude and Antigravity keep the command-line route (E-02, UD-006, UD-008); on a node with a desktop the app's Terminal gives that command line (E-10).
- Update stays own-node only (E-06: binaries live in the image).

## Notes For Architecture Design

- Map: Sign in button visibility = (own node) OR (node reports it can open a browser on its desktop).
- Keep the privacy rule: no URL, code or account detail reaches the page.
- Keep the server API unchanged except one additive read-only node fact.
