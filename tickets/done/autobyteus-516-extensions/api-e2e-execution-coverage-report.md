# API/E2E Execution Coverage Report — autobyteus-516 Stage 1 (extension foundation, Voice Input)

## Round

- Coverage investigation (the plan; it lists the upstream documents): [api-e2e-coverage-investigation.md](api-e2e-coverage-investigation.md)
- API/E2E revision record and current revision ID: [api-e2e-revision-record.md](api-e2e-revision-record.md), `API-REV-001`
- Test progress log: [api-e2e-test-progress.md](api-e2e-test-progress.md)
- Round and trigger: round 1, after code review CRR-002 Pass.
- Prior round reviewed: none.
- Deviations from the investigation's plan, and why:
  - API-03, API-02 needed test fixes before they could prove anything (see their rows): three base causes fixed as a baseline-fix commit (TESTING.md Rule 9) and one stale-fixture cause from this ticket fixed in this ticket's test commit.
  - API-13: real OS window focus could not be driven in the isolated instance (see the row). The focus re-read was proven with the packaged renderer's own listener plus the two other real triggers (surface reopen, a stale press).
  - API-13 uses the Chat composer, not Memory search: on a fresh node Memory search is disabled until the memory is indexed (existing behavior, unrelated).
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-516-extensions/tickets/in-progress/autobyteus-516-extensions/evidence/api-e2e/`; temporary probes: `…/probes/api-e2e/`.

## Routing Classification

- Task size: `Large`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review` (proportional test-code review of the changed durable tests), then delivery.
- Proportional test-code review decision: `Required`

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter (data, identity, locale, viewport) |
| --- | --- | --- | --- | --- |
| ENV-1 | 8fcbb9bda3 (code 3961790ab6) | macOS 26 arm64 (10 cores, 64 GB) | Node 22.23.1; server `dist` rebuilt at the start of the round | `env -i PATH HOME=<fresh temp> TMPDIR`; load average 18–45 from other agents |
| ENV-2 | 8fcbb9bda3 (code 3961790ab6) | same | Packaged worktree build `autobyteus-web/electron-dist/mac-arm64/AutoByteus.app` (Electron 42.11.16), `pnpm --silent isolated-app start --from-worktree --data-root <own root>` | own data roots under `/private/tmp/516-api-iso-{a,b}`; the development catalog through the data root's own `server-data/.env` (`AUTOBYTEUS_EXTENSIONS_CATALOG_URL`/`_PUBLIC_KEY`, the documented developer override; the desktop writes that file only on the first run); en-US; CDP on the instance's control port |
| ENV-3 | same | Docker 29.0.1, linux/arm64 container | image `autobyteus/autobyteus-server:beta` with this worktree's server package (`docker buildx … --target server-package --platform linux/arm64`) mounted read-only over `/opt/autobyteus/server-package` | container `autobyteus-516-api-e2e`, `-p 127.0.0.1:57499:8000`, anonymous volumes, catalog via `host.docker.internal`; owner credential through a setup code exchanged by the desktop's `connectNode` (code in a mode-600 file, deleted, never printed) |
| ENV-4 | same | macOS arm64 | Development catalog `probes/api-e2e/dev-catalog.mjs`: throwaway Ed25519 key (memory only); voice-input 1.0.0 (repository pack, same SHA-256 as `autobyteus-extensions/dist`), 1.0.1, broken 1.0.2 (pins runtime 0.3.99), test extensions `hello-node`, `no-arm-build`, `broken-status` | loopback `127.0.0.1:53057`; host catalog = voice-input only; Docker catalog = all four |
| ENV-5 | 75eab7845a (this round's test commits) | macOS arm64 | Probe-owned stacks: `dist/app.js` node(s), Nuxt dev, headless Chrome 1440×900 / 390×844 | the probes' own temp roots and catalogs |
| ENV-6 | 75eab7845a | fresh clone `/tmp/516-api-05/clone` | `pnpm install --frozen-lockfile`, then the desktop job's build | release env of TESTING.md § Fresh-start build |
| ENV-7 | 75eab7845a | GitHub Actions runners | `release-desktop.yml` build-only (`pnpm release:test --ref codex/autobyteus-516-extensions`) | publishes nothing |

## Cases

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-R1 | AC-001…AC-006, AC-011 | server unit + architecture | Reused IMP-01 | — | Pass (reused) | handoff IMP-01 | — | Ran at 38058ec630; since then only a comment in `extension-catalog.ts` on the server |
| API-R2 | registerGraphql callers | server integration | Reused IMP-02 | — | Pass (reused) | handoff IMP-02 | — | Since d2934d630f: `rest/extensions.ts` (+2/−2) and a comment; no integration test reaches `/rest/extensions`. API-01 runs the full server again |
| API-R3 | AC-001…AC-008 (components) | web suite | Reused IMP-05 | — | Pass (reused) | handoff IMP-05 | — | Since cc3094a0cb only Electron files outside the Nuxt suite |
| API-R4 | removal plan | Electron main | Reused IMP-06 + IMP-09 | — | Pass (reused) | handoff | — | IMP-09 reran the IR-002 specs; API-06 runs the packaged harness |
| API-R5 | — | both typechecks | Reused IMP-07 + IMP-09 | — | Pass (reused) | handoff | — | Also inside API-05's build (`[typecheck] PASS`) and this round's packaged build (`/tmp/516-api-electron-build.log`: "production errors: 0 … [typecheck] PASS") |
| API-R6 | AC-002, AC-007, QR-001 | extensions repository | Reused IMP-08 | — | Pass (reused) | handoff | — | Repository unchanged (4d00904) |
| API-R7 | guards | negative controls | Reused IMP-04 | — | Pass (reused) | handoff | — | Guards unchanged since 38058ec630 |
| API-01 | REQ-005, QR-004 | every route through the node gate | `env -i PATH="$PATH" HOME=<fresh mktemp -d> TMPDIR="$TMPDIR" pnpm test:e2e` (repository root) | ENV-1 | Pass | `API-01-server-e2e.log` | "Test Files  128 passed \| 175 skipped (303)"; "Tests  575 passed \| 821 skipped (1396)"; no `×` lines | Skipped = gated suites without their gate |
| API-02 | AC-007 (composer surface) | renderer voice lifetime | `pnpm -C autobyteus-web test:e2e:composer-voice-lifetime --output-dir <new>` | ENV-5 | Pass (run 2) | `API-02-composer-voice/API-02-probe.log`, `API-02-evidence.json`, `API-02-run1-evidence.json` | run 2 "result Pass", B-001…B-007 Pass, `pageErrors []`, `failures []` | Run 1 Fail (B-001, no microphone button): stale fixture caused by this ticket. The new window-start read (plugin 22) is in flight before the fixture page's `fetch` stub; Apollo de-duplicates the page's own reads onto it; the probe's network route answered it with no extensions. Diagnosis: one `GetExtensions` fetch at 0.9 s from `directNodeApolloClient.boundedFetch`, store `availabilityGeneration` 3, `voiceInput` null. Fix (test only, 75eab7845a): the probe answers `GetExtensions` at the network |
| API-03 | AC-007 (Project description, Task description surfaces) | renderer voice in Projects, real nodes | `pnpm -C autobyteus-web test:e2e:projects --voice-input --skip-server-build --output-dir=<new>` | ENV-5 | Pass (run 5) | `API-03-projects-voice/API-03-probe.log`, `API-03-run5-result.json`, run 1/3/4 results and failure screenshots | run 5 "result Pass": PT-E2E-001…017 and B-001…B-006 Pass; cleanup all ports released, temp root removed | Runs 1–4 failed for test causes, each found before rerunning (log): (1) PT-E2E-005 stale since autobyteus-workspace-6 (localized "Couldn't attach failed.txt."), cascading to 006–011; (2) the voice cases read the microphone as denied after PT-E2E-017's clipboard-only `grantPermissions` (since 2026-10-17); (3) B-003 lacked the Task title required since autobyteus-260. Baseline-fix commit c322d76964. (4) the same window-start race as API-02 (this ticket; 75eab7845a). PT-E2E-017 failed once in run 3 at load ~26, passed in runs 2, 4, 5: FU-004 |
| API-04 | AC-001, AC-002, AC-003, AC-005, AC-007, REQ-012, SCN-A2 | Settings → Extensions through a real node, real runtime 0.3.2 | `pnpm -C autobyteus-web test:e2e:extensions-page --extensions-repo=/Users/normy/autobyteus_org/autobyteus-extensions --skip-server-build --output-dir=<new>` | ENV-5 | Pass (run 2) | `API-04-extensions-page/API-04-probe.log`, `API-04-evidence.json`, `API-04-U1-*.png`, `API-04-U2-update-failed.png`, `API-04-R*.png`; run 1: `API-04-run1-evidence.json`, `API-04-run1-U1-failure.png` | run 2 "result Pass", 10 cases Pass; `browserErrors []`, `refusedRequests []`; `u1.settings.language` "en", `u1.state` `{"voice-input":{"enabled":true}}`, `u1.workers` one PID, transcript "…Please summarize the meeting notes…"; `u2.message` "Update to 1.0.2 failed: Could not download https://github.com/AutoByteus/autobyteus-voice-runtime/releases/download/v0.3.99/voice-input-runtime-manifest.json: HTTP 404", one worker, transcript ok | Run 1: U1/U2 failed in the new probe helper (the card's settings section is collapsed after a page load); `API-04-run1-U1-failure.png` shows the update itself done (1.0.1, On). Helper fixed |
| API-05 | build inputs (DESIGN rule 12) | fresh runner | fresh `git clone --no-local`, checkout 75eab7845a, `pnpm install --frozen-lockfile`, `cd autobyteus-web && NO_TIMESTAMP=1 AUTOBYTEUS_BUILD_FLAVOR=personal PRISMA_CLI_BINARY_TARGETS=darwin-arm64,debian-openssl-1.1.x,debian-openssl-3.0.x CSC_IDENTITY_AUTO_DISCOVERY=false GITHUB_REPOSITORY=AutoByteus/autobyteus-workspace pnpm build:electron:mac -- --arm64`, then the job's "Verify bundled Prisma ARM64 engine target" and "Verify packaged terminal runtime ARM64" from the clone root | ENV-6 | Pass | `API-05-fresh-start-build.log` | "Lockfile is up to date, resolution step is skipped"; "[typecheck] production errors: 0; test-file errors: 85 in 35 files (baseline 85 in 35 files)", "[typecheck] PASS"; "Build completed"; build `exit 0`; "prisma verify: PASS"; "[terminal-runtime] ok: node-pty spawn probe", "terminal runtime verify: PASS" | The cross-package tests project that gained `voice-input-extension.integration.test.ts`: "cross-package tests (tsconfig.cross-package-tests.json): 0 errors". Signing, notarization and the other OS builds: API-15. Clone removed |
| API-06 | removal plan (CR-001) | packaged launch profile | `pnpm -C autobyteus-web test:e2e:electron`; `pnpm -C autobyteus-web test:e2e:electron:isolation` | ENV-2 | Pass | `API-06-electron-harness.log`, `API-06-electron-launch-profile-evidence.json` | `"type":"electron-e2e-ready"` and `exit 0`; "[electron-launch-profile-probe] passed" | The probe IR-002 changed is the `:isolation` one |
| API-07 | GraphQL operations / demo node | iOS demo bundle | `NUXT_TEST=true pnpm -C autobyteus-web exec vitest run scripts/__tests__/mobileBuildChecks.spec.ts`; `autobyteus-ios/scripts/prepare-demo-web.sh --build`; then `pnpm -C autobyteus-web build:mobile-web` | ENV-1 | Pass | `API-07-ios-demo.log` | spec "Tests  8 passed (8)"; "The demo answers all 261 compiled operations (handled or listed as unreachable)."; "The /mobile build holds no demo code."; each step `exit 0` | The phone bundle was rebuilt afterwards (the demo build overwrites it); no tracked file changed |
| API-08 | AC-008, SCN-004, SCN-A1 | packaged desktop start with an old install | `node probes/api-e2e/old-install.mjs /private/tmp/516-api-iso-a` (v2 + microphone registry shape, keys and layout checked read-only against a real install; stand-in files); start 1 `isolated-app start --from-worktree --data-root …`; Settings → Extensions; stop; catalog into `server-data/.env`; start 2; Settings → Extensions; Install (API-10) | ENV-2, ENV-4 | Pass | `API-08-old-install-before.txt`, `API-08-09-packaged-start-logs.log`, `API-08-start1-extensions.{json,png}`, `API-08-start2-extensions.{json,png}`, `API-10-install.json` | start 1 log: "[INFO] [electron] Removed the old desktop Voice Input install /private/tmp/516-api-iso-a/extensions; Voice Input is installed again from Settings → Extensions."; data root listing without `extensions`; start 2: `grep -c "old desktop"` → 0; start 2 card "Not installed", button `extension-install-voice-input` | Start 1 page: "Could not reach the list of extensions…" (the built-in catalog URL does not exist yet) and no cards; the app and node started (health 200) |
| API-09 | AC-008 failure outcome | packaged start, deletion fails | second root with `models/whisper-small-mlx` read-only (`--locked`); start; Settings → Extensions; stop; `chmod 755`; start | ENV-2 | Pass | `API-08-09-packaged-start-logs.log`, `API-09-start1-extensions.{json,png}` | "[WARN] [electron] Could not remove the old desktop Voice Input install /private/tmp/516-api-iso-b/extensions: EACCES: permission denied, unlink '…/weights.npz'. It is tried again at the next start."; health 200; page shown; next start "Removed the old desktop Voice Input install …" | |
| API-10 | AC-002 (packaged; AR-003 page check), AC-005, AC-007, REQ-012 | packaged window, real credential attacher, `file://` origin | Settings → Extensions → Install (`packaged-driver.mjs install-and-wait`); page in its frame, language `en` (`page-check`); the microphone panel's Test (`test`; microphone emulated); View log; no-credential requests by `curl` | ENV-2, ENV-4 | Pass | `API-10-install.{json,png}`, `API-10-install-busy.png`, `API-10-page-check.{json,png}`, `API-10-test.{json,png}`, `API-10-log.{json,png}`, `API-10-log-lines.json` | install `"seconds": 101`, phases "Installing: Downloading Voice Input 1.0.0" → "Preparing the speech model…" → "On: starting: Installed and on. Getting ready…" → "On"; `"refused": []`; page `frameSrc` `http://127.0.0.1:56339/rest/extensions/voice-input/ui/index.html`, `frameSandbox` "allow-scripts", facts "0.3.2 … whisper-small-mlx", `languageSaved` "en", responses 200 (ui, getSettings, setLanguage); Test `"ms": 360`, transcript "Please summarize the meeting notes and send them to the team."; log "install: voice-input 1.0.0 … installed and turned on … worker ready (mlx)" | Node side: `settings.json` `{"language":"en"}`, `state.json` `{"voice-input":{"enabled":true}}`. Without a credential: `GET …/ui/index.html`, `POST …/actions/getSettings`, `POST /graphql` → 401 `NODE_CREDENTIAL_REQUIRED` |
| API-11 | AC-003 (packaged) | packaged window | catalog `POST /control/voice?version=1.0.1`; reopen the page (section list); Update; Test; catalog 1.0.2; Update; Test | ENV-2, ENV-4 | Pass | `API-11-update-offered.{json,png}`, `API-11-update-1.0.1.{json,png}`, `API-11-test-after-1.0.1.json`, `API-11-update-1.0.2.{json,png}`, `API-11-test-after-failed-1.0.2.json`, `API-11-voice-input-extension.log` | badge "1.0.1 available"; after Update version "1.0.1", "On", language en, one worker (PID changed 97803 → 54746); Test transcript ok 332 ms; 1.0.2: message "Update to 1.0.2 failed: Could not download …v0.3.99/voice-input-runtime-manifest.json: HTTP 404", version "1.0.1", button `extension-update-voice-input` still there; log "update to 1.0.2 failed: … the installed version stays" then "worker ready"; Test after the failure ok | The page fetches the catalog when it opens (catalog server log: a fetch per open). `API-11-update-offered-failure.png` is a driver attempt blocked by the log dialog left open, not a product result |
| API-12 | AC-010, AC-004, AC-006 (spot), AC-011 (Linux, through the page), SCN-A3 | Docker linux-arm64 node in a packaged node window | Docker node started; `setup-code` → `upsertNodeRegistry` + `connectNode` + `openNodeWindow`; node window Settings → Extensions; Install Hello Node; its page; Install Broken Status; `docker restart`; Remove Hello Node; no-credential `curl` | ENV-2, ENV-3, ENV-4 | Pass | `API-12-docker-extensions.{json,png}`, `API-12-install-hello.json`, `API-12-hello-page.{json,png}`, `API-12-install-broken.{json,png}`, `API-12-hello-page-beside-broken.json`, `API-12-docker-after-restart.{json,png}`, `API-12-removed.{json,png}`, `API-12-docker-node.log` | node line "Extensions of Docker Test Node · 127.0.0.1:57499"; no `voice-input` card; voice note "Voice Input belongs to the computer you work at…"; `no-arm-build` "There is no build for this computer, Linux (ARM). Offered for macOS (Apple silicon), Linux (x64)."; container `installed-on.txt` "5586d8d241bc linux-arm64", embedded node has no `hello-node`; page answer `{"hostname":"5586d8d241bc","platform":"linux-arm64",…}` from `POST http://127.0.0.1:57499/rest/extensions/hello-node/actions/whereAmI` 200; Broken Status "Failed" "the status probe of Broken Status failed on purpose", Hello Node still On and its page answers; container log "EXTENSION_FAILED: broken-status: …"; after restart health 200, same states; Remove → container `extensions` holds only `broken-status`, `state.json` `{"broken-status":{"enabled":true}}`; no credential → 401 | |
| API-13 | AC-009, SCN-005, SCN-A4 | Docker node window dictating with this computer's Voice Input | in the Docker window's Chat composer: microphone, dictation (emulated microphone); main window Off; focus re-read; composer reopened; stale press; main window On | ENV-2, ENV-3 | Pass | `API-13-docker-chat-mic.json`, `API-13-docker-window-dictate.{json,png}`, `API-13-focus-reread.log` (`probes/api-e2e/focus-reread.mjs`, `probes/api-e2e/focus-dispatch.mjs`), `API-13-docker-window-surface-reopened-on.json`, `API-13-docker-window-surface-reopened-off.json`, `API-13-stale-button-press.{json,png}` | dictate: `inserted` ["Please summarize the meeting notes and send them to the team."], `transcribeRequests` `http://127.0.0.1:56339/rest/extensions/voice-input/actions/transcribe` 200 (the embedded node, not the Docker node 57499), not sent; after Off: focus event → `readGeneration` 9 → 10, `voiceInput.enabled` false, `micButtons` 0; reopened composer while Off `mic 0`, while On `mic 1`; stale press → 409 `{"code":"EXTENSION_OFF",…}` and `micAfter` 0 | Real OS focus could not be driven: in this isolated instance both windows report `document.hasFocus()` true, System Events lists no windows, and focus through the shell (`openNodeWindow` on an open window) delivered no `focus` event (`focus-reread.mjs`, raw CDP). The packaged renderer's own focus listener was exercised with a dispatched `focus` event. Memory search was not usable on the fresh node (disabled until the memory is indexed; existing behavior) |
| API-14 | QR-002 | warm transcription before/after | same 5.000 s clip, 1 + 10 runs each: base `VoiceInputRuntimeService` of fdde5406fa with runtime 0.3.0 (`probes/api-e2e/qr002-bench-base.ts`); packaged renderer → embedded node action route (`qr002-after-renderer.mjs`); each runtime's worker alone (`qr002-direct-worker.mjs`) | ENV-1, ENV-2 | Pass | `API-14-qr002-warm-transcription.log` | BEFORE `"medianMs":202`; AFTER `"medianMs":218`; worker alone 0.3.0 `"medianMs":208`, 0.3.2 `"medianMs":208`; "+16 ms (QR-002 limit +500 ms)" | BEFORE excludes the renderer → main IPC hop, which favours it; base runs in Node 22 (Electron main is Node 24) |
| API-15 | build inputs (DESIGN rule 12) | release runners | `bash scripts/check_secrets.sh origin/personal..HEAD` (PASS); `git push origin HEAD:refs/heads/codex/autobyteus-516-extensions`; `pnpm release:test --ref codex/autobyteus-516-extensions`; run 45869596069 | ENV-7 | Pass | `API-15-build-only-release.log` | "conclusion success", headSha 75eab7845a…; Build Linux x64, Linux ARM64, Windows x64, macOS ARM64, macOS Intel x64: success; signing and publishing skipped (build-only) | https://github.com/AutoByteus/autobyteus-workspace/actions/runs/45869596069 |

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | For A User-Only Or Accepted-Risk Part |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | API-04 (R1), API-08, API-10, API-R1 | Proven | — |
| AC-002 | Yes | API-04 (R2, R3, R8), API-10 (packaged install, page through the real attacher and `file://` origin), API-R1 | Proven | — |
| AC-003 | Yes | API-04 (U1, U2), API-11 (packaged) | Proven | — |
| AC-004 | Yes | API-12 (no Voice Input and the note on a Docker window; `no-arm-build` on linux-arm64); voice's own platform refusal unit-tested (API-R3) | Proven | The voice asset's "not available" on the desktop's own node needs a desktop platform without a voice build; none here (unit and component specs) |
| AC-005 | Yes | API-10 (View log), API-12 (Failed card with message), API-04 (R6), API-R1 | Proven | — |
| AC-006 | Yes | API-R1 (NAS-42/43), API-01, API-10 and API-12 (401 without credential on a real embedded and a real Docker node) | Proven | The phone-credential refusal on a live node is unit-level (NAS-43) |
| AC-007 | Yes | API-02 (composer), API-03 (Project and Task description), API-04 (R4, R5 Memory search), API-10/API-13 (packaged Test and composer), API-R6 | Proven | — |
| AC-008 | Yes | API-08, API-09 | Proven | — |
| AC-009 | Yes | API-13 | Proven | OS-level window focus delivery not driven (see API-13 Notes); the listener, surface reopen and stale-press triggers proven |
| AC-010 | Yes | API-12 | Proven | — |
| AC-011 | Yes | API-R1 (V12), API-12 (status failure beside a working extension, node restart) | Proven | Unreadable `state.json` / unreadable package: unit (API-R1) |
| AC-012 | No | code review CRR-002 | Proven (review) | — |
| QR-002 | — | API-14 | Proven | — |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | What Supports It (Case IDs) | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 80% | 96% | every AC above with direct cases | AC-009's OS focus delivery | a desktop session where windows can be activated by the OS |
| Changed-boundary execution directness | 80% | 96% | API-04, API-10…API-13 through the real node, packaged shell and container | microphone emulated in the packaged window | real microphone (OS permission prompt; unchanged by this ticket) |
| Cross-boundary integration realism and mock gap | 75% | 95% | API-12/13 two real nodes; API-11 real update path; API-14 | catalog key is a development key (release blocker with the Solution Designer) | the published catalog after the founder creates the key |
| Environment, configuration, identity, and fixture fidelity | 80% | 95% | packaged build of this commit, real attacher, real Docker linux-arm64 node, synthesized old install in the released shape | Linux x64 / Windows / Intel not run | release runners build them (API-15) |
| Failure, edge-case, lifecycle, and recovery evidence | 85% | 96% | API-09, API-11 (broken update), API-12 (Failed + restart), API-13 (stale press), worker exits with the app (0 workers after stop) | — | — |
| User-surface, browser, and desktop-shell confidence | 80% | 95% | API-02/03/04 browser; API-08…API-13 packaged | OS focus (see above) | as above |
| Durable regression coverage quality and relevance | 85% | 95% | API-04 U1/U2 added; voice probes repaired; baseline fixes | packaged and Docker journeys are temporary probes (ticket-owned) | — |

- Overall post-repository confidence: 81%
- Overall final confidence: 95% (96, 96, 95, 95, 96, 95, 95)
- Calculation method: simple average of the seven categories.
- Every critical acceptance criterion directly proven, apart from parts only the user can check or accepted as unverified risk: `Yes`
- Any final applicable category below `90%`: `No`
- Default final confidence target of `95%` met: `Yes`
- Confidence-limiting residual risks: OS focus delivery in AC-009; development catalog key (release blocker, not this stage's code).

## Broader Validation Decision (Mandatory)

- Decision: `Required` (executed)
- Execution mode: `Project Desktop Validation` (packaged isolated instance), `Worker or Distributed` (Docker node), `Browser` (probes), `Other` (QR-002 measurement)
- Confidence gap or residual risk it addresses, and the expected gain: the real attacher, `file://` origin, a second real node, the deletion step in a packaged start, the update path, QR-002 — none exercised by repository tests.
- Browser validation needed: yes, for the renderer journeys (probes); the shell-specific parts ran packaged.

## Desktop Application Validation

- Approach executed: isolated instances of this worktree's packaged build with own data roots, driven over CDP (`probes/api-e2e/packaged-driver.mjs`), the development catalog through the data root's own `.env`.
- Web-equivalent behavior: API-04, API-02, API-03. Shell-specific / lifecycle: API-06, API-08, API-09, API-10 (attacher, origin), API-12/13 (node windows).
- Effect on any already-running desktop application: `None`. Another engineer's instance (`iso-62641-58dd`) was left alone; nothing under `~/.autobyteus` was used (the founder's old registry was read once, read-only, for its keys and folder names only).
- Behavior not directly proven: OS-level focus delivery (AC-009 note); the real microphone device path in the packaged app (emulated; Chrome's fake device in the probes).

## Persisted-Data Transition Checks

- Approved persisted-data decision: `Discard or Rebuild` (DEC-016).
- Representative existing data used: synthesized v2-with-microphone registry and `voice-input/` layout (`downloads/`, `installation.json`, `models/`, `runtime/`, `temp/`, `.DS_Store`), keys checked read-only against a real install.
- Approved transition followed without an unnecessary migration: `Yes`
- Cases: API-08 (deleted once, second start nothing, Install works), API-09 (failure logged, start continues, retried).
- Version-specific runtime branch, dual read/write, or compatibility fallback observed: `No`
- Residual untested persisted-data risk: v1 / v2 shapes only in the runner spec (the step never reads the files, so the shape cannot change the outcome).

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No`
- Durable coverage added or retained only for compatibility-only behavior: `No`

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `Yes`

| Path / Test | Change | Case IDs | Notes |
| --- | --- | --- | --- |
| `autobyteus-web/tests/e2e/extensions-page-probe.mjs` | Updated | API-04 | U1/U2 update cases; `publish` on the catalog; `recordTest`; `voiceWorkers` (commit 75eab7845a) |
| `autobyteus-web/tests/e2e/composer-voice-lifetime-probe.mjs`, `tests/e2e/fixtures/composer-voice-lifetime.page.vue` | Updated | API-02 | `GetExtensions` answered at the network; fixture's copy removed; header (75eab7845a) |
| `autobyteus-web/tests/e2e/projects-voice-cases.mjs` | Updated | API-03 | network `GetExtensions` (75eab7845a); microphone grant for the page origin and B-003 title (baseline fix c322d76964) |
| `autobyteus-web/tests/e2e/projects-feature-probe.mjs` | Updated | API-03 | PT-E2E-005 expects the localized attach line (baseline fix c322d76964) |

- Added or updated paths attached for proportional test-code review: `Yes`

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| AutoByteus signed catalog | development catalog, throwaway key, via the documented override | built-in public key is empty (release blocker) | the production key and URL are untested until the founder creates them |
| Microphone in the packaged window | `getUserMedia` returns a Web Audio stream of a `say` clip; `enumerateDevices` / `permissions.query` answer one granted device | automation cannot use the OS microphone or answer its permission prompt | the OS device path (unchanged by this ticket) |
| Voice availability and transcription in API-02 / API-03 | the probes' own fixtures (as designed) | renderer lifetime probes | covered for real by API-04, API-10, API-13 |
| OS window focus | `focus` event dispatched on the window | no OS focus in the isolated instance | see API-13 |

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup Action | Result |
| --- | --- | --- | --- |
| isolated instances `iso-56207-7a75`, `iso-56338-577d`, `iso-57219-67c5`, `iso-57345-95cf` | Yes | `isolated-app stop` | stopped (`forced: true` each time, also without extensions; the embedded server logged "Server process exited with code 0" and 0 voice workers remained) |
| data roots `/private/tmp/516-api-iso-{a,b}` | Yes | `rm -rf` | removed |
| Docker container `autobyteus-516-api-e2e` + volumes | Yes | `docker rm -f -v` | removed |
| server package `/tmp/516-api-docker-pkg`, catalog state, diagnostics, QR-002 bench | Yes | `rm -rf` | removed |
| development catalog server, `/tmp/516-api-catalog` | Yes | killed | stopped |
| QR-002 base install `/tmp/516-api-qr002/run-030` | Yes | `rm -rf` | removed |
| probe stacks (API-02/03/04) | Yes | the probes' own cleanup | receipts: all terminated, temp roots removed |
| fresh clone `/tmp/516-api-05/clone` | Yes | `rm -rf` | removed (logs kept in `/tmp/516-api-05`) |
| temporary diagnostics (`TEMP-DIAG-516` in `projects-voice-cases.mjs`) | Yes | reverted before commit | reverted |
| ticket branch pushed to `origin` for API-15 | Yes | stays (delivery's branch) | pushed |

## Latest Authoritative Result

- Result: `Pass`
- Criteria not proven, parts only the user can check, or accepted as unverified risk: None
- Evidence decisions requested: None
- Next recipient from `get_handoff_rules`: `/code_reviewer` (Large / High: proportional test-code review of the changed durable tests)
- Notes: FU-004 recorded (PT-E2E-017 under load, outside this ticket). Release blocker unchanged and not this stage's code: the built-in catalog public key is empty (with the Solution Designer). Observation, not a finding: Apollo de-duplicates identical in-flight reads, so a voice availability read started just before a change can hand the earlier answer to the next read; in real use the window is milliseconds against human reaction time, and API-13 re-read correctly.
