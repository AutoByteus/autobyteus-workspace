# API/E2E Execution Coverage Report — html-preview-isolation (autobyteus-417)

## Round

- Coverage investigation (the plan; it lists the upstream documents): `api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md`, `API-REV-001`
- Test progress log (when used): `api-e2e-test-progress.md`
- Round and trigger: round 1; code review `Pass` CRR-001 on IR-001 (code `cdba18ba35`)
- Prior round reviewed: N/A
- Deviations from the investigation's plan, and why:
  - The scripted AGY fixture's default case answers every turn with an error; `AGY_FAKE_CASE=linked_skills` was added to the instance data root's `.env` (as the phone probe uses it) and the instance restarted once (`isolated-app restart`) before any case ran.
  - API-15 pairs the phone at the node's real private LAN address (`http://192.168.2.158:<port>`, where the embedded node already listens) instead of the phone probe's routed `192.168.77.10` host. Same shape as a real phone on the LAN, and the page's own requests keep their real `Origin: null` (a routed WebSocket would have rewritten it).
- Evidence folder (absolute path; the handoff message gives the commit that holds it): `/Users/normy/autobyteus_org/autobyteus-worktrees/html-preview-isolation/tickets/in-progress/html-preview-isolation/evidence/api-e2e/`

## Routing Classification

- Task size: `Small`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review`
- Proportional test-code review decision: `Required` (rule for `High`). No repository test code was added, updated or removed this round; the only test code is the ticket-owned harness in `evidence/api-e2e/harness/` (evidence, not durable coverage).

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter (data, identity, locale, viewport) |
| --- | --- | --- | --- | --- |
| ENV-1 | HEAD `2d59c0db2c` (code = `cdba18ba35`; later commits are ticket docs only) | macOS 26 (Darwin 25.5.0) arm64 | Isolated desktop instance `iso-50112-c4ac` of the worktree build (`pnpm --silent isolated-app start --build --data-root <temp>/data-root`; `electron-dist/mac-arm64/AutoByteus.app`, Electron 42.11.16, version 1.5.12-beta.5), embedded node on `127.0.0.1:50113` (also listening on the LAN address `192.168.2.158:50113`), control port 50112 | Test-owned data root; `.env`: `ANTIGRAVITY_CLI_COMMAND=<temp>/scripts/agy-artifact-cli.mjs`, `AGY_FAKE_CASE=linked_skills` (`ENV-instance-data-root.env`); synthetic workspace; scripted AGY agent "Preview Writer"; no provider keys; driver `playwright-core` over CDP; window 2400×1536 |
| ENV-2 | as ENV-1 | as ENV-1 | Google Chrome 156.0.8078.80 headless (`playwright-core`) against the ENV-1 node | API-14: top-level tab; API-15: phone emulation 390×844, `isMobile`, paired through Phone Access at `http://192.168.2.158:50113` |
| ENV-3 | as ENV-1 | as ENV-1 | Node v22, `vitest` server E2E (studio server composition, test-owned data dir) | `env -i PATH HOME=<resolved temp> TMPDIR` |

## Cases

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-01 | AC-001 | Web component | Reused IMP-02 | — | Pass | (IMP-02) | (IMP-02) | Ran on `cdba18ba35`; `git diff --name-only cdba18ba35 HEAD` touches only the ticket folder |
| API-02 | AC-005 (server) | Static route | Reused IMP-03 | — | Pass | (IMP-03) | (IMP-03) | Same commit; no code change. API-14 adds the real-node header check |
| API-03 | AC-008 | Web neighbours (viewers, `ApplicationIframeHost`, mobile views) | Reused IMP-05 | — | Pass | (IMP-05) | (IMP-05) | Same commit; no code change |
| API-04 | — | Typecheck, guards | Reused IMP-06, IMP-07 | — | Pass | (IMP-06/07) | (IMP-06/07) | Same commit. The ENV-1 `--build` desktop build also ran the guards and typecheck and succeeded (it refuses to package otherwise) |
| API-05 | AC-002 (harness), AC-005, AC-007 | Electron 42.4.1/42.11.16 with app webPreferences + real route code | Reused IMP-08 | — | Pass | (IMP-08) | (IMP-08) | Same commit; supporting only, superseded for the real app by API-10/11/14 |
| API-06 | AC-003 (node side) | Node gate, real server | `env -i PATH="$PATH" HOME=<resolved temp> TMPDIR="$TMPDIR" pnpm -C autobyteus-server-ts exec vitest run tests/e2e/remote-access/request-origin-and-phone-routes.e2e.test.ts --no-watch` (worktree root) | ENV-3 | Pass | `API-06-server-e2e-null-origin.log`, `API-06-server-e2e-null-origin.full.log` | `Tests  7 passed (7)` | Includes "refuses a foreign or null Origin on every WebSocket route family before the route runs" (file line 107: `/ws/terminal/origin-probe`, `/graphql` … with `Origin: null` → 403, `TerminalHandler.connect` not called) |
| API-10 | AC-002, AC-003, AC-004, AC-007 | Real desktop app, Files-area workspace preview | Open the run in the sidebar (workspace → Preview Writer → run) → Files → click `hostile.html` (preview mode). Read the preview frame's `window.__report` through CDP (`act.mjs 50112 s-preview-report.js files … API-10`), then `checks.mjs` and `accesslog.py` | ENV-1 | Pass | `API-10-desktop-files-preview-report.json`, `API-10-desktop-files-preview.png`, `API-10-node-state.json`, `API-10-node-log-excerpt.txt` | report: `"sandbox": "allow-scripts"`, `"origin": "null"`, `"parent-document": "blocked: SecurityError"`, `"parent-electronAPI": "blocked: SecurityError"`, `"parent-electronAPI-call": "blocked: SecurityError"`, `"own-electronAPI": "undefined"`, `"localStorage": "blocked: SecurityError"`, `"ws-terminal": "closed code=1006 before open"`, `"graphql-post-json": "failed: TypeError"`, `"classic-script": "ran"`, `"other-site-script": "ran"`, `"css": "rgb(255, 0, 0)"`, `"img-relative": "loaded 3x3"`, `"module-script": "did-not-run"`, `"fetch-relative-json": "failed: TypeError"`, `"font-relative": "not loaded (WsFont:error)"`, `"worker": "blocked: SecurityError"`; app window `"electronAPI": "object"` (preload present). Node: `"markers": []`, `"hostileDefinitions": []`; log `Remote Access request refused REMOTE_ACCESS_ORIGIN_REFUSED /ws/terminal/hostile-ws?cwd=… origin null`, three `… /graphql origin null`, `GET /graphql?query=mutation… 405` | The GET mutation (no Origin) passed the Origin gate and was refused by Mercurius (405): REQ-003's no-Origin clause (ARCH-REV R-2) holds. Module, `fetch` and font requests were refused at the node (`… static/module.js origin null` 403) |
| API-11 | AC-002, AC-003, AC-004 | Real desktop app, Artifacts blob preview | Same run → Artifacts → `artifact.html` (an HTML artifact the scripted agent produced with `GENERATE_IMAGE`, content = synthetic page `ART-V1`); read frame report; `checks.mjs`; `accesslog.py` | ENV-1 | Pass | `API-11-desktop-artifacts-preview-report.json`, `API-11-desktop-artifacts-preview.png`, `API-11-node-state.json`, `API-11-node-log-excerpt.txt` | `"src": "blob:file:///…"`, `"sandbox": "allow-scripts"`, `"origin": "null"`, `"location-protocol": "blob:"`, `"inline-script": "ran"`, `"other-site-script": "ran"`, parent/preload/storage/credential `blocked: SecurityError`; node `"markers": []`, `"hostileDefinitions": []`, `REMOTE_ACCESS_ORIGIN_REFUSED /ws/terminal/hostile-artifact… origin null` | Relative classic script/CSS/image do not resolve in a Blob (`"classic-script": "did-not-run"`, `"img-relative": "error"`): documented non-goal, unchanged in effect (the removed `<base>` pointed at `file:///`) |
| API-12 | AC-003 (control) | Node, allowed client | `node control.mjs http://127.0.0.1:50113 <temp>`: from Node (no Origin) the same terminal WS with the same `touch` input, and the same `createAgentDefinition` mutation | ENV-1 | Pass | `API-12-positive-control.json`, `API-12-terminal-session-lines.txt` | `"ws": "opened"`, `"markerCreated": true`, `"graphqlStatus": 200`, `"CONTROL-api12"` in definitions; log `Terminal websocket attached for cwd …/markers`, `Closed PTY session control-api12` and no other PTY/terminal line in the run | Shows the detectors would have seen a breach: the hostile pages created no session, no marker and no definition |
| API-13 | AC-004 (refresh) | Real desktop app, Artifacts + Files area | (a) previewing `artifact.html` (ART-V1), the agent writes it again (`GENERATE_IMAGE`, ART-V2) → read frames after 6 s, no user action. (b) Files previewing `hostile.html` (WS-V1); file changed on disk → WS-V2, read after 10 s; → WS-V3, read after 5 s; → WS-V4, click `classic.js` then `hostile.html` → read | ENV-1 | Pass | `API-13-refresh.txt`, `API-13a-artifact-after-rewrite.png`, `API-13b-1…4-*.png` | (a) `"version": "ART-V2"` with a new `blob:file:///5d51e35f…` (was `3b309b7f…`); (b) `"version": "WS-V2"` 10 s after the change and `"version": "WS-V3"` 5 s after the second change with no user action; `"version": "WS-V4"` after reopening; every frame `"origin": "null"`, `"sandbox": "allow-scripts"`; log `Watcher detected modification: …/workspace/hostile.html` ×3 | **Measured result differs from R-3 / CAND-04 / FU-003:** the workspace preview does reload on its own when the open file changes. Cause (read after measuring): the watcher event calls `invalidateFileContent` (`stores/fileExplorerContentActions.ts:280-286`: `content = null`, refetch with `isLoading = true`); `FileViewer.vue` then renders its loading state (`v-if="loading"`), unmounting `HtmlPreviewer`, and a new `HtmlPreviewer` mounts and loads the static URL again. AC-004 as reworded in SR-004 is met (and exceeded); the reload is pre-existing and not touched by this change. See Notes in the result |
| API-14 | AC-005 | Static route opened top-level | `node toplevel.mjs <node>/rest/workspaces/<id>/static/hostile.html` (headless Chrome tab); `curl -s -D - -o /dev/null` for HTML, JS, CSS, PNG, a missing file and `/content` | ENV-2, ENV-1 | Pass | `API-14-static-url-top-level.json`, `API-14-static-url-top-level.png`, `API-14-static-route-headers.txt` | top-level `"origin": "null"`, `"localStorage": "blocked: SecurityError"`, `"ws": "closed code=1006 before open"`, `"css": "rgb(255, 0, 0)"`, `"img": "loaded 3x3"`, `"classic": "ran"`; headers `content-security-policy: sandbox allow-scripts` with `content-type: text/html`, `text/javascript`, `text/css`, `image/png`; `missing.html` → `404` JSON without CSP; `/content` → `200 text/html` without CSP | `/content` unchanged by design (FU-002) |
| API-15 | AC-006 | Phone web app (`/mobile` from the node) with a stored phone credential | `node phone.mjs http://192.168.2.158:50113 http://127.0.0.1:50113 <runId> …`: Phone Access on, pairing session, open the pairing link, Pair → run list; credential in `localStorage`; open the run → ⋮ → Artifacts → `artifact.html` (synthetic page `PHONE-V1`, node URL = the phone's node origin); read frame report; `checks.mjs`; `accesslog.py` | ENV-2, ENV-1 | Pass | `API-15-phone.json`, `API-15-phone-1-paired-list.png`, `API-15-phone-2-artifact-preview.png`, `API-15-node-state.json`, `API-15-node-log-excerpt.txt` | `"credential": { "present": true, … "origin": "http://192.168.2.158:50113" }`, `"src": "blob:http://192.168.2.158:50113/…"`, `"sandbox": "allow-scripts"`, `"origin": "null"`, `"parent-localStorage-phone-credential": "blocked: SecurityError"`, `"localStorage": "blocked: SecurityError"`, `"inline-script": "ran"`, `"pageErrors": []`; node `REMOTE_ACCESS_ORIGIN_REFUSED /ws/terminal/hostile-phone… origin null`, three `/graphql origin null`, the GET mutation `REMOTE_ACCESS_ROUTE_UNSUPPORTED … 404`; `"markers": [ "control-api12.marker" ]` (API-12's only), `"hostileDefinitions": []` | The credential stayed stored and unreadable to the preview (`"credentialStillStoredAfterPreview": true`) |
| API-16 | AC-007 (docs) | Docs | `git show cdba18ba35:autobyteus-web/docs/file_explorer.md` (HTML Preview Resource Contract) and `content_rendering.md` bullet, compared with API-10's measured losses | — | Pass | `API-16-docs-check.txt` | "cannot do: load relative `type="module"` scripts, `fetch`/XHR the workspace's files, load web fonts from the workspace, start Web Workers, or use browser storage … or cookies" = API-10 measured | Release notes are delivery's |

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | For A User-Only Part |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | API-01; real DOM in API-10/11/15 (`"sandbox": "allow-scripts"` on every preview iframe) | Proven | — |
| AC-002 | Yes | API-10 (workspace), API-11 (artifact) on the real desktop app; API-05 supporting | Proven | — (origin `null`; `parent.document`, `parent.electronAPI` and `localStorage` throw; the page cannot obtain the preload API, so no IPC call can be made: `parent-electronAPI-call` `blocked: SecurityError`, `own-electronAPI` `undefined`) |
| AC-003 | Yes | API-10, API-11, API-15 (pages), API-12 (control), API-06 (durable gate test) | Proven | — |
| AC-004 | Yes | API-10 (workspace page: inline, relative classic, relative CSS and image, CDN), API-11/15 (artifact inline + CDN), API-13 (artifact updates live; workspace shows the changed file after reopening, and also reloads by itself) | Proven | — |
| AC-005 | Yes | API-02, API-14 | Proven | — |
| AC-006 | Yes | API-15 | Proven | — |
| AC-007 | Yes | API-10 (losses measured), API-16 (docs) | Proven (docs part; release notes are delivery's) | — |
| AC-008 | Yes | API-03 | Proven | — |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | What Supports It (Case IDs) | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 75% | 97% | All eight ACs proven; AC-002/003/004/006 on the real app and node | SCN-003 (local absolute-path HTML) not driven as its own journey; same component branch as API-11 | A run with an absolute-path file link in the Event Monitor |
| Changed-boundary execution directness | 75% | 97% | API-10/11/14/15 exercise both changed lines (iframe attribute, CSP header) in the real renderer, real preload and real node | — | — |
| Cross-boundary integration realism and mock gap | 70% | 95% | Real worktree build, real embedded node and gate, real agent run (scripted runtime) producing the artifact, real phone pairing; API-12 control | Runtime scripted (AGY fixture) rather than a model; irrelevant to the preview | — |
| Environment, configuration, identity, and fixture fidelity | 75% | 95% | Packaged worktree build, isolated data root, real Phone Access credential, LAN origin as a phone uses it | Phone tested as Chrome mobile emulation, not iOS Safari/Android WebView (same HTML sandbox standard) | A real device |
| Failure, edge-case, lifecycle, and recovery evidence | 80% | 96% | Hostile attempts on window, preload, storage, cookies, workers, WS, JSON/simple/GET GraphQL; refresh after change; reopen; top-level URL; 404/`/content` headers | — | — |
| User-surface, browser, and desktop-shell confidence | 70% | 96% | Desktop shell (preload present in app window, unreachable from frame), Files and Artifacts surfaces, phone Artifacts, Chrome tab | Team/collaboration reference viewers not driven (same `HtmlPreviewer` blob branch) | Drive a team reference preview |
| Durable regression coverage quality and relevance | 92% | 92% | IMP-02/03 pin the attribute, Blob bytes and header and fail on the base (IMP-04); API-06 pins the node's null-Origin refusal | Real-browser enforcement is not in a durable repo probe (would need a packaged build per run); harness committed as evidence | A packaged-app probe if this boundary changes again |

- Overall post-repository confidence: 77% (repository/unit evidence only; the real app and phone were unexercised)
- Overall final confidence: 95.4% (simple average of the seven final scores)
- Calculation method: simple average
- Every critical acceptance criterion directly proven, apart from parts only the user can check: `Yes`
- Any final applicable category below `90%`: `No`
- Default final confidence target of `95%` met: `Yes`
- Confidence-limiting residual risks: durable coverage stays at unit + server-E2E level (by decision, see the investigation); SCN-003 and team/collaboration references covered through the shared component, not their own journeys.

## Broader Validation Decision (Mandatory)

- Decision: `Required` (executed)
- Execution mode: `Project Desktop Validation` (isolated desktop instance) + `Browser` (phone web app, top-level tab)
- Confidence gap or residual risk it addresses, and the expected gain: happy-dom does not enforce sandbox semantics and `fastify.inject` does not run a browser; AC-002/003/004/006 need the real renderer, preload, node gate and phone app. Gain: direct proof on every changed boundary.
- Browser validation needed, and why or why not: yes, for the phone web app (AC-006) and the static URL opened top-level (AC-005).
- If `Not Required`: N/A
- If `Blocked`: N/A

## Desktop Application Validation

- Approach executed, and any deviation from the investigation's plan: as planned (one `isolated-app restart` to set `AGY_FAKE_CASE`, before any case).
- Cases proving web-equivalent behavior, and cases proving shell-specific or lifecycle behavior: web-equivalent API-14, API-15; shell-specific API-10, API-11 (preload `electronAPI` is an object in the app window and unreachable from both preview kinds).
- Effect on any already-running desktop application: `None` (own instance, ports 50112/50113, own data root; the user's app and `~/.autobyteus` untouched; another worktree's `nuxt dev` on :3395 left alone).
- Behavior not directly proven and its confidence consequence: none material.

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No`
- Durable coverage added or retained only for compatibility-only behavior: `No`
- If compatibility-related invalid scope was observed, reroute classification used: N/A
- Upstream recipient notified: N/A

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `No` (rationale in the investigation § Durable Coverage To Add)

None.

- Added or updated paths attached for proportional test-code review: `Not Applicable`
- Diff or repository evidence supplied for removed paths: N/A

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| Agent runtime (model) | Scripted AGY CLI (temp copy of the repository fixture with a one-line change: `GENERATE_IMAGE` writes `<path>.next` content) | No model or keys needed; the artifact path (FILE_CHANGE → Artifacts → `ArtifactContentViewer`) is real | None for the preview |
| Other site (CDN) | `cdn-server.mjs` on its own loopback port | No internet dependency | None |
| Phone device | Chrome mobile emulation at the node's LAN origin | No device in scope | Same standard sandbox; WebKit not exercised |

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup Action | Result |
| --- | --- | --- | --- |
| Isolated instance `iso-50112-c4ac` | Yes | `pnpm --silent isolated-app stop iso-50112-c4ac` | `ok`, `controlPortReleased: true`, `serverPortReleased: true` (`ENV-instance-stop.json`); `isolated-app list` shows none of ours |
| Temp root (data root, workspace, markers, scripts, logs) and instance log | Yes | `rm -rf` | Removed; harness and excerpts kept in evidence |
| CDN stand-in, headless Chrome | Yes | killed / closed by the scripts | Port 50211 closed |
| `autobyteus-web/electron-dist/` | Yes (build output, untracked) | Kept (untracked build output; next build overwrites) | Not staged |

## Latest Authoritative Result

- Result: `Pass`
- Criteria not proven, or parts only the user can check (IDs): `None`
- Preliminary classification and recommended owner (on `Fail`): N/A
- Next recipient from `get_handoff_rules`: `/software_engineering_team/code_reviewer` (Pass, architectural_risk High)
- Notes:
  - **FU-003 / R-3 / CAND-04 measured (API-13):** the workspace preview reloads by itself after the open file changes (WS-V1→V2 within 10 s, →V3 within 5 s), through the watcher → `invalidateFileContent` → `FileViewer` loading state → `HtmlPreviewer` remount. The R-3 code reading missed that remount, so SR-004's correction of BEH-005/AC-004 and follow-up FU-003 rest on a premise the running app does not show. Nothing in this change is affected (AC-004 as worded is met). For the Solution Designer: FU-003 can be withdrawn and the original BEH-005 wording ("refreshes on content change") restored as evidence-only, before the follow-ups leave the team.
  - The node logs every refused preview request as `Remote Access request refused REMOTE_ACCESS_ORIGIN_REFUSED … origin null` (stderr): a page with module scripts, `fetch` or fonts adds such lines on every load (design Key Tradeoffs, accepted).
