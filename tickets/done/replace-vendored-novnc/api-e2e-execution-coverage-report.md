# API/E2E Execution Coverage Report

## Execution Round Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/replace-vendored-novnc/tickets/in-progress/replace-vendored-novnc/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/replace-vendored-novnc/tickets/in-progress/replace-vendored-novnc/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/replace-vendored-novnc/tickets/in-progress/replace-vendored-novnc/proposed-design.md`
- Supplemental Task Artifacts: `/Users/normy/autobyteus_org/autobyteus-worktrees/replace-vendored-novnc/tickets/in-progress/replace-vendored-novnc/upstream-novnc-evaluation.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/replace-vendored-novnc/tickets/in-progress/replace-vendored-novnc/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/replace-vendored-novnc/tickets/in-progress/replace-vendored-novnc/implementation-handoff.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/replace-vendored-novnc/tickets/in-progress/replace-vendored-novnc/code-review-report.md`
- Coverage Investigation: `/Users/normy/autobyteus_org/autobyteus-worktrees/replace-vendored-novnc/tickets/in-progress/replace-vendored-novnc/api-e2e-coverage-investigation.md`
- Current Execution Round: 4
- Trigger: Required authoritative revalidation of correction commit `ba703f842d79dfab03f4c15add73396acdc247a9`, which resolves `CR-001` by separating generic web and Electron renderer notice outputs.
- Prior Round Reviewed: Yes — round 3's `VNC-PKG-DESKTOP-001` failure was rechecked first; round 2's 97.1% real VNC/browser pass remains authoritative for unchanged runtime surfaces.
- Latest Authoritative Round: Round 4; correction evidence under `probes/api-e2e/revalidation-ba703f842/` records a `Pass` at 96.9% final confidence.

## Round History

| Round | Trigger | Prior Unresolved Failures Rechecked | New Failures Found | Result | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | First realistic service/browser execution | N/A | Fixture password was not visible through server settings; later probe refinements exposed Teleport locator and CDP permission-setup errors. All were API/E2E-owned setup/test issues, not application failures. | Fail | No | Each attempt, JSON, screenshot, and service log is retained in `probes/api-e2e/vnc-live-attempt-*`. |
| 2 | Exact final probe recheck after GraphQL seeding, Teleport-safe locator, and context-specific permission corrections | Yes | None | Pass | No | All live scenarios passed in 15.0 seconds with no recorded failures; owned resources were removed. |
| 3 | Revalidate the reviewed delivery-owned notice packaging fix against real web and Electron generation/build sequencing | Yes — preserved unchanged runtime proof and rechecked the new durable contract | `VNC-PKG-DESKTOP-001`: documented Electron generation writes `dist/renderer`, but compiled packaging preflight requires missing `dist/public` and aborts before electron-builder | Fail | No | Frozen install, 36 focused tests, web/electron generation, notice bytes, transpilation, positive/negative harness controls, and cleanup were retained. |
| 4 | Revalidate `ba703f842` against the exact previously failing Electron generation/preflight/builder sequence | Yes — `VNC-PKG-DESKTOP-001` reused first | None | Pass | Yes | Clean generic/Electron generation, exact notice bytes/hash, 36 focused tests, compiled mapping, normal builder handoff, corrected negative preflight, and cleanup passed. |

## Investigation And Execution Basis — Round 2 Historical

- Coverage investigation artifact: `/Users/normy/autobyteus_org/autobyteus-worktrees/replace-vendored-novnc/tickets/in-progress/replace-vendored-novnc/api-e2e-coverage-investigation.md`
- Investigation completed before durable coverage changes or final execution: `Yes`
- Investigation plan followed: `Yes` — the planned owned Docker/Chrome mode ran. The password was seeded through the public GraphQL setting mutation rather than relying on an environment-only custom key, because the first attempt proved that the environment key was not visible in the frontend's server-settings response.
- Existing coverage decisions revised during execution, with evidence: No approved assertion changed. One exploratory assertion that the remote desktop resolution must shrink after Escape was rejected and removed because `AC-006` requires restoration of application view-only/scaling/remote-resize policy, not a second server-side resize after `resizeSession` is disabled. The existing deterministic policy test plus live `View Only` restoration remains the correct evidence.
- Reroute required before or during execution: `No`
- Notes: All failures during harness development were locally resolved within API/E2E ownership. The final browser run found no implementation failure.

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No`
- Approved persisted-data transition followed without unnecessary migration or version-specific runtime fallback: `N/A` — persisted data is `Not Affected`.
- Durable coverage added or retained only for compatibility-only behavior: `No`
- If compatibility-related invalid scope was observed, reroute classification used: N/A
- Upstream recipient notified: N/A

## Changed Boundary And Evidence Matrix — Round 2 Historical

| Scenario ID | Behavior / Requirement / Acceptance-Criteria IDs | Changed Boundary | Execution Surface / Mode | Evidence Type | Result | Evidence / Artifact |
| --- | --- | --- | --- | --- | --- | --- |
| `VNC-PKG-001` | Exact official package, root export, integrity, async clipboard content, no vendored tree; `REQ-001`, `REQ-002`, `REQ-005`, `REQ-006`; `AC-001`–`AC-003`, `AC-008` | Manifest/lock/resolved package/source/removal | Vitest integration plus structural process checks | Durable | Pass | `tests/integration/novnc-package-contract.integration.test.ts`; `probes/api-e2e/final-structural-checks.log` |
| `VNC-UNIT-001` | Supported credentials/shared constructor; current/stale session events; initial resize retry/policy restore; `REQ-003`, `REQ-004`; `AC-004`, `AC-006`, `AC-007` | `useVncSession` application policy boundary | Focused Vitest with package-root mock | Durable | Pass | `composables/__tests__/useVncSession.spec.ts`; `probes/api-e2e/final-targeted-vitest.log` |
| `VNC-BUILD-001` | Root package resolves in production and introduces no noVNC type delta; `AC-009`, `AC-010` | Nuxt/Vite production bundle and TS declaration | Repository generation/typecheck | Durable | Pass | Generation passed with 3,552 client modules; typecheck reproduced exactly 242 approved baseline errors with zero noVNC lines. |
| `VNC-LIVE-001` | Configured password/shared session, canvas/status, disconnect/reconnect and clean lifecycle; `AC-004`, `AC-007` | UI -> official RFB -> WebSocket -> websockify -> authenticated TigerVNC | Chrome against owned services | Live / Browser | Pass | Canonical `vnc-live-results.json`, WebSocket frame counts, Xvnc/websockify logs, connected screenshot |
| `VNC-LIVE-002` | Default/restored view-only policy, interactive toggle, maximize remote resize, Escape restore; `AC-006`, `AC-007` | Tile controls/ResizeObserver -> RFB properties -> VNC SetDesktopSize | Chrome plus remote `xdpyinfo` | Live / Browser | Pass | Canvas 336x252; remote display changed 1024x768 -> 1438x898; Escape restored the tile and `View Only` policy control. |
| `VNC-LIVE-003` | Permission-aware bidirectional clipboard; `REQ-002`, `REQ-003`; `AC-002`, `AC-005`, `AC-008` | Browser Clipboard/Permissions/focus -> package async clipboard -> VNC clipboard -> remote X | Chrome with granted permissions plus remote `xclip` | Live / Browser | Pass | Both unique local-to-remote and remote-to-local sentinels matched exactly in `vnc-live-results.json`. |
| `VNC-LIVE-004-denied` | Denied clipboard remains non-fatal; `AC-005` | Actual incognito-context clipboard permission state and live VNC | Chrome CDP permission state plus live server | Live / Browser | Pass | Read/write states `denied`, actual read produced `NotAllowedError`, VNC remained connected/interactive. |
| `VNC-LIVE-004-unsupported` | Missing Clipboard API remains non-fatal; `AC-005` | Browser capability fallback and live VNC | Fresh Chrome context with pre-document capability override | Live / Browser | Pass | `typeof navigator.clipboard === "undefined"`; VNC remained connected/interactive. |

## Additional Repository Coverage Execution — Round 2 Historical

The updated coverage investigation contains the authoritative final repository command table. No additional repository command was run after that table was finalized.

## Validation Confidence Scorecard — Round 2 Historical Pass

| Confidence Category | Post-Repository Score | Final Score | Change | New / Final Supporting Evidence | Residual Uncertainty |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 84% | 98% | +14 | Every `AC-001`–`AC-010` has direct structural, durable, build/type-delta, or live evidence; critical auth/clipboard/resize criteria executed successfully. | Future dependency upgrade behavior is outside this exact-pin validation. |
| Changed-boundary execution directness | 82% | 98% | +16 | Chrome loaded the real package-root module and crossed its actual RFB/WebSocket/canvas/clipboard boundary; no RFB mock remained in the live path. | None material for the selected version/current renderer. |
| Cross-boundary integration realism and mock gap | 75% | 98% | +23 | Nuxt frontend, GraphQL settings, Chrome permissions/clipboard, websockify, password-authenticated TigerVNC, X display, and `xclip` were exercised together. | Published server image is local Docker rather than a remote production host; protocol boundary is the same. |
| Environment, configuration, identity, and fixture fidelity | 75% | 97% | +22 | Fresh labelled container, unique loopback ports, public setting mutation, real VNC auth, official server image, Chrome incognito contexts, and deterministic cleanup. | Test fixture uses a blank Xvnc display rather than a long-running user desktop. |
| Failure, edge-case, lifecycle, and recovery evidence | 82% | 96% | +14 | Live disconnect/reconnect, denied and unsupported Clipboard API, unit credentials/security/stale-event paths, timer cleanup, and clean server disconnects all passed. | A deliberately wrong live VNC password was not retained as a final scenario; unit security/error translation covers that application-owned path. |
| User-surface, browser, and desktop-shell confidence | 75% | 97% | +22 | Semantic UI assertions, active canvas, maximize/Escape, interaction toggle, and screenshot were observed in Chrome at 1440x900. No Electron shell boundary changed. | Electron main/preload execution was intentionally not run; this is negligible for unchanged shell code. |
| Durable regression coverage quality and relevance | 95% | 96% | +1 | Exact package contract, focused lifecycle assertions, reusable owned-container-aware browser probe, named script, and retained evidence are requirement-linked and deterministic. | Full Nuxt suite remains red in four unrelated untouched areas, reported below. |

- Overall post-repository confidence: **81.1%**
- Overall final confidence: **97.1%**
- Calculation method: Simple average of all seven applicable categories. Final: `(98 + 98 + 98 + 97 + 96 + 97 + 96) / 7 = 97.14%`, rounded to 97.1%.
- Confidence change produced by broader validation: **+16.0 percentage points**.
- Every critical acceptance criterion directly proven: `Yes`
- Any final applicable category below `90%`: `No`
- Default final confidence target of `95%` met: `Yes`
- Confidence-limiting residual risks: The exact development build and narrow ambient declaration require deliberate review on future upgrades; four unrelated broader-suite assertions remain red; MPL-2.0 dependency-license handling remains a delivery-stage documentation/license check. None is a current requirement failure.

## Broader Validation Decision And Execution — Round 2 Historical

- Decision and selected execution mode from the coverage investigation: `Required`; Browser plus Lifecycle against an owned Docker VNC/websockify fixture.
- Material deviation from the planned mode or rationale: Only password fixture setup changed from an environment-only key to the server's public GraphQL setting mutation after the initial attempt showed the former was not frontend-visible.
- Confidence gap or residual risk actually addressed: Exact module runtime loading, configured VNC authentication, RFB/WebSocket interoperability, canvas/status lifecycle, disconnect/reconnect, fullscreen remote resize, Escape/view-only restoration, automatic bidirectional clipboard, and denied/unsupported fallback.
- If `Not Required`: N/A
- If `Blocked`: N/A
- Startup order, commands, and readiness results: `run-vnc-live-fixture.sh` allocated three unique ports, started the labelled published server image, waited for `/rest/health`, seeded the password, started Xvnc `:100` with `VncAuth` and websockify `6081`, verified `xdpyinfo` and HTTP readiness, started Nuxt with `BACKEND_NODE_BASE_URL`, then ran `pnpm test:e2e:vnc-live -- ...`. Every final readiness check passed.
- Environment choices that materially affected the run: loopback-only port mappings, fresh ephemeral container filesystem, `AlwaysShared`, `AcceptCutText`, `SendCutText`, Chrome headless incognito contexts, localhost secure context, viewport 1440x900, locale `en-US`, timezone `Europe/Berlin`.
- Seed data, fixtures, identities, authentication, permissions, or session state: One isolated VNC host, one non-production test password, blank Xvnc display owned by `vncuser`, unique clipboard sentinels, granted primary context, actually denied second context, and Clipboard-API-absent third context.

| Scenario / Journey Step | Expected Observable Result | Actual Observable Result | DOM / Screenshot / Log / API / Process Evidence | Result |
| --- | --- | --- | --- | --- |
| Backend and VNC readiness | Owned isolated dependencies are healthy before browser use. | `/rest/health` returned `status: ok`; password mutation succeeded; `xdpyinfo` and websockify HTTP readiness passed. | `backend-health.json`, `vnc-password-seed.json`, `xdpyinfo-initial.log`, `websockify-readiness.html` | Pass |
| Authenticated initial connect | Configured host reaches connected state with visible framebuffer and bidirectional WebSocket frames. | `Connected to VNC server`, visible 336x252 canvas, VNC socket 13 sent/7 received frames. Xvnc recorded `VncAuth(2)`. | JSON, screenshot, Xvnc/websockify logs | Pass |
| Disconnect/reconnect | User can cleanly disconnect and create a fresh connected session. | First VNC socket closed; second connected and carried 23 sent/12 received frames. Server logs recorded clean closure. | JSON WebSocket list and Xvnc log | Pass |
| Maximize/Escape and mode policy | Remote resize increases the desktop; Escape restores tile and prior view-only policy. | Remote dimensions increased 1024x768 -> 1438x898; `.vnc-maximized` detached on Escape and the `View Only` control reappeared. | Structured JSON plus semantic DOM assertions | Pass |
| Interactive local -> remote clipboard | Focusing interactive canvas sends browser text to VNC/X clipboard. | Remote `xclip` matched the unique browser-written sentinel exactly. | `vnc-live-results.json` | Pass |
| Remote -> browser clipboard | VNC server clipboard reaches browser Clipboard API. | `navigator.clipboard.readText()` matched the remote `xclip` sentinel exactly. | `vnc-live-results.json` | Pass |
| Denied permissions | Real denied state does not break connection/interaction. | Permission queries returned `denied`; read threw `NotAllowedError`; connected status remained visible. | JSON plus browser events | Pass |
| Unsupported Clipboard API | Missing API does not break connection/interaction. | Clipboard type was `undefined`; connected status remained visible after remote clipboard traffic. | JSON plus browser events | Pass |

## Desktop Application Validation — Round 2 Historical

- Validation approach executed and any deviation from the investigation: Chrome exercised the documented Nuxt development surface; no deviation.
- Browser-tested web-equivalent behavior and evidence: Entire changed VNC renderer boundary, including server settings, RFB, canvas, controls, resize, Clipboard/Permissions, and lifecycle.
- Shell-specific or lifecycle behavior and evidence: No preload, IPC, Electron window, native permission bridge, or main-process code changed. Production Nuxt generation covered renderer bundling.
- Effect on any already-running desktop application: `None`; no running AutoByteus process, launcher container, user port, browser profile, or data store was reused or stopped.
- Behavior not directly proven and confidence consequence: Electron shell startup/packaging was not rerun; negligible consequence because the shell boundary is unchanged and the renderer generated successfully.

## Platform / Runtime Targets

- Operating system / platform: macOS 26.5.2 build 25F84, arm64; Docker Desktop engine 29.0.1.
- Runtime and relevant framework versions: Node 22.23.1, pnpm 10.28.2, Nuxt 3.21.1, Playwright Core 1.58.2, `@novnc/novnc@1.7.0-g7c36fab`.
- Browser / engine and version: Google Chrome 150.0.7871.127.
- Device, viewport, locale, timezone, or accessibility settings: Desktop viewport 1440x900, `en-US`, `Europe/Berlin`, headless Chrome; clipboard permissions varied by scenario.

## Lifecycle / Upgrade / Restart / Persisted-Data Checks

- Approved persisted-data decision: `Not Affected`
- Representative existing data exercised: N/A
- Direct-use, discard/rebuild, or migration result and evidence: N/A
- Migration completion/recovery evidence: N/A
- Version-specific runtime branch, dual read/write, or compatibility fallback observed: `No`
- Residual untested persisted-data risk: None.

## Tests Implemented Or Updated — Through Round 2

| Path / Scenario | Change | Requirement / Boundary | Execution Result | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-web/tests/integration/novnc-package-contract.integration.test.ts` / `VNC-PKG-001` | Added | `AC-001`–`AC-003`, `AC-008`; exact resolved package/source/removal | Pass | Three contract tests; exact version and registry integrity cannot silently drift to stable 1.7.0. |
| `autobyteus-web/composables/__tests__/useVncSession.spec.ts` / `VNC-UNIT-001` | Updated | `AC-004`, `AC-006`, `AC-007`; supported constructor and lifecycle/event owner | Pass | Mock signature now accepts only supported connection options; four tests pass. |
| `autobyteus-web/tests/e2e/vnc-live-probe.mjs` / `VNC-LIVE-001`–`004` | Added | Real auth/RFB/canvas/resize/clipboard/permission/lifecycle boundary | Pass | Refuses arbitrary containers and requires the task owner label. |
| `autobyteus-web/package.json` / `VNC-SCRIPT-001` | Updated | Named durable execution entrypoint | Pass | Adds only `test:e2e:vnc-live`; fixture startup remains explicit. |

## Tests Removed As Stale Or Obsolete

None.

## Durable Coverage Changed In The Codebase — Round 2 Historical Review Package

- Repository-resident durable coverage added, updated, or removed this round: `Yes`
- Paths added or updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/replace-vendored-novnc/autobyteus-web/tests/integration/novnc-package-contract.integration.test.ts`; `/Users/normy/autobyteus_org/autobyteus-worktrees/replace-vendored-novnc/autobyteus-web/composables/__tests__/useVncSession.spec.ts`; `/Users/normy/autobyteus_org/autobyteus-worktrees/replace-vendored-novnc/autobyteus-web/tests/e2e/vnc-live-probe.mjs`; `/Users/normy/autobyteus_org/autobyteus-worktrees/replace-vendored-novnc/autobyteus-web/package.json`
- Paths removed: None
- Added or updated paths attached for proportional test-code review: `Yes`
- Diff or repository evidence supplied for removed paths: N/A

## Other Execution Artifacts

| Artifact Path | Type / Purpose | Retained Or Temporary | Notes |
| --- | --- | --- | --- |
| `tickets/in-progress/replace-vendored-novnc/probes/api-e2e/vnc-live/vnc-live-results.json` | Canonical structured live result | Retained | Authoritative final scenarios, observations, socket frames, and browser events. |
| `tickets/in-progress/replace-vendored-novnc/probes/api-e2e/vnc-live/vnc-live-connected-interactive.png` | Supporting browser screenshot | Retained | Visually inspected: selected VNC Viewer, configured host, green connected state, canvas, and interactive control. |
| `tickets/in-progress/replace-vendored-novnc/probes/api-e2e/vnc-live/{xvnc-auth-display.log,websockify-auth-display.log}` | Real service correlation | Retained | Auth protocol, connections, clean closes, and proxy targets. |
| `tickets/in-progress/replace-vendored-novnc/probes/api-e2e/{final-targeted-vitest.log,full-nuxt-vitest.log,nuxt-generate.log,nuxi-typecheck.log,nuxi-typecheck-summary.txt}` | Repository execution evidence | Retained | Includes honest unrelated baseline failures. |
| `tickets/in-progress/replace-vendored-novnc/probes/api-e2e/{final-structural-checks.log,frozen-offline-install.log,runtime-metadata.log}` | Package/patch/environment evidence | Retained | Exact version/integrity/root, absent legacy tree/deep paths, install, runtime versions. |
| `tickets/in-progress/replace-vendored-novnc/probes/api-e2e/vnc-live-attempt-*` | Prior harness-development attempts | Retained | Preserves failure origin and local-resolution evidence; not authoritative final results. |

## Temporary Execution Methods / Scaffolding

| Path / Method | Why Needed | Result / Evidence | Cleanup Result |
| --- | --- | --- | --- |
| `tickets/in-progress/replace-vendored-novnc/probes/api-e2e/run-vnc-live-fixture.sh` | Reproducible one-off orchestration of isolated ports, server, password setting, Xvnc, websockify, frontend, evidence, and teardown | Final exit 0; canonical structured result passed | Frontend process group stopped; owned labelled container force-removed; no labelled containers remain. |

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| RFB in focused unit coverage | Package-root Vitest mock with supported constructor options and public properties/events | Deterministic timer, stale-event, credentials-required, and security-event assertions | None material after the same installed RFB package passed the live boundary. |
| Missing Clipboard API | Fresh context pre-document override sets `navigator.clipboard` to `undefined` | Modern Chrome normally exposes the API on localhost; capability absence must be induced to test fallback | Narrowly emulates absence only; actual denied state and full live VNC remain real. |

## Prior Failure Resolution Check

| Prior Round | Scenario / Failure Reference | Previous Classification | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| 1 | Attempt 1 authentication failure | `Local Fix` — API/E2E fixture | Seeded `AUTOBYTEUS_VNC_SERVER_PASSWORD` through public GraphQL mutation and verified visibility before browser start. | Final seed response; Xvnc `VncAuth(2)` success | Environment-only custom key was not returned by the settings API. |
| 1 | Attempt 2 timeout after maximize | `Local Fix` — durable probe | Used a page-root `.vnc-maximized` locator because Vue Teleport moves the tile outside `.vnc-viewer`. | Final maximize/Escape pass | Application behavior was correct; locator ownership was wrong. |
| 1 | Attempts 3/4 denied-permission setup | `Local Fix` — durable probe | Passed the incognito `browserContextId` to `Browser.setPermission` while retaining valid web permission descriptor names. | Final denied states both equal `denied` | Prior protocol calls either targeted the wrong context or used invalid descriptor names. |
| 1 | Exploratory remote-shrink assertion | `Local Fix` — invalid test assertion | Removed the assertion; verified required Escape/view-only/scale policy restoration instead. | Requirements `AC-006`, design `DS-006`, unit policy test, final DOM assertion | Remote resolution shrink is not approved behavior after `resizeSession` is disabled. |

## Round 3 Packaging Revalidation — Historical Failed Execution

### Investigation And Scope

- Updated coverage investigation: `/Users/normy/autobyteus_org/autobyteus-worktrees/replace-vendored-novnc/tickets/in-progress/replace-vendored-novnc/api-e2e-coverage-investigation.md`, round-2 addendum.
- Reviewed change: commit `7fe03f83e869d5badbf10a35d2898a185c190116` over runtime implementation `4ae4733637bc3d471051783b29894dad0d0e3c28`.
- Actual changed boundary: canonical noVNC notice content, Nuxt public-copy output, shared packaging paths, Electron `extraResources`, packaging preflight, and a fourth durable package-contract case.
- Runtime diff result: No manifest, lock, RFB provider, session, UI, clipboard, permission, backend, or persisted-data path changed.
- Browser/live VNC rerun decision: `Not Required`. Round 2's exact Chrome/TigerVNC/websockify evidence remains applicable, and another live VNC run would not exercise the new web/Electron distribution boundary.
- Packaging broader-validation decision: `Required` and executed. A full signed installer was not attempted because the changed compiled preflight fails before electron-builder; signing/resources cannot change the observed path mismatch.

### Round 3 Changed Boundary And Evidence

| Scenario ID | Requirement / Behavior Basis | Execution Surface | Expected | Observed | Result | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| `VNC-PKG-001` | `AC-001`–`AC-003`, `AC-008`, exact provider/notice drift contract | Focused Vitest | Original contract and new exact notice case pass | 4 files / 36 tests passed | Pass | `probes/api-e2e/revalidation/focused-novnc-vitest.log` |
| `VNC-PKG-WEB-001` | `BEH-004`, `DS-007`, required web notice distribution | `pnpm generate`, byte/hash inspection | Canonical notice appears exactly in web output | `dist/public/...` was 26,305 byte-identical bytes, SHA-256 `399fad4dac55bd3226ed40c5e4f5c366f44654e1738a037272ff3e6661a097b3` | Pass | `nuxt-generate.log`; `notice-and-structure.log` |
| `VNC-PKG-CONFIG-001` | Shared exact web/desktop mapping and preflight | `pnpm transpile-build`, compiled mapping and intercepted builder controls | Build scripts compile and exact mapping reaches builder when its declared inputs exist | Compilation passed; Mac and Windows intercepted builder calls each carried exactly one notice `extraResource` | Pass as a control | `transpile-build.log`; `compiled-mapping.json`; `packaging-captured-config*.json` |
| `VNC-PKG-DESKTOP-001` | Requirements license-distribution constraint; `BEH-004`; `DS-007`; delivery fix must ship notice in the documented Electron build | Real `pnpm generate:electron` followed by compiled `build.js --mac --arm64`; only server-resource existence/icon generation/electron-builder invocation intercepted | Electron generation produces the notice at the path required by preflight, then builder receives the mapping | Generation produced `dist/renderer/THIRD_PARTY_NOTICES/noVNC-1.7.0-g7c36fab.txt` and removed `dist/public`; compiled preflight required `dist/public/...`, exited 1, and never called electron-builder | **Fail** | `nuxt-generate-electron.log`; `packaging-normal-electron-flow.log`; `packaging-normal-electron-flow-summary.txt` |
| `VNC-PKG-PREFLIGHT-001` | Missing generated notice must fail before packaging | Temporary missing-output cwd through compiled build | Fail fast and do not call builder | Exit 1 with exact missing-output error; builder not called | Pass | `packaging-negative.log`; `packaging-negative-summary.txt` |

### Round 3 Repository And Executable Results

| Order | Command / Execution Mode | Result | Material Evidence |
| --- | --- | --- | --- |
| 1 | `pnpm install --offline --frozen-lockfile` | Pass | All 11 workspace projects; lock current; offline install completed. |
| 2 | `pnpm test:nuxt tests/integration/novnc-package-contract.integration.test.ts composables/__tests__/useVncSession.spec.ts components/layout/__tests__/WorkspaceAdaptiveLayout.spec.ts utils/__tests__/vncHosts.spec.ts --run` | Pass | 4 files / 36 tests. |
| 3 | `pnpm generate` | Pass | 3,552 client modules; `dist/public` notice generated. |
| 4 | `pnpm transpile-build` | Pass | Build scripts compiled to CommonJS. |
| 5 | Exact package/provenance/notice byte/hash/runtime-diff/forbidden-reference scans | Pass | Exact installed version/license/repository; canonical and web output identical; no runtime provider/session diff. |
| 6 | Intercepted compiled build after web generation, plus Mac/Windows capture validation | Pass as setup/control only | `dist/**/*`, publish `never`, and exact notice `extraResource` reached the captured builder calls. |
| 7 | `pnpm generate:electron` | Pass generation, exposes mismatch | Real output is `dist/renderer`, including the exact notice; `dist/public` is absent after the command. |
| 8 | Compiled build after the real Electron generation sequence | **Fail** | Exit 1: `Missing required noVNC third-party notice for packaging: dist/public/THIRD_PARTY_NOTICES/noVNC-1.7.0-g7c36fab.txt`; builder not called. |
| 9 | `git diff --check` and owned-resource scan | Pass | No whitespace error, task container, temp fixture, or active harness process remains. |

### Round 3 Failure Detail

- Failing scenario ID: `VNC-PKG-DESKTOP-001`
- Acceptance/design IDs: Requirements “Constraints / Dependencies” MPL-2.0 distribution obligation; `BEH-004`; `DS-007`; delivery-reroute requested packaging action 2 and verification action 4.
- Exact execution sequence:
  1. `pnpm generate:electron`
  2. `AUTOBYTEUS_REVALIDATION_STUB_SERVER=1 node -r <intercept-electron-builder.cjs> build/dist/build.js --mac --arm64`
- Interception boundary: Icon regeneration and unrelated prepared-server existence were stubbed; the real compiled notice paths, `existsSync` notice checks, branch selection, and build orchestration executed. `electron-builder.build` was intercepted only to avoid signing/packaging after preflight and to prove whether it was reached.
- Expected behavior: The normal Electron renderer output satisfies the required-notice preflight and passes the exact notice `extraResource` to electron-builder.
- Actual behavior: Electron generation writes and preserves the notice at `dist/renderer/...`; the compiled preflight checks `dist/public/...`, aborts, and does not invoke electron-builder.
- Reproduction stability: A prior positive builder capture succeeded only after `pnpm generate`, which creates `dist/public`. The documented `build:electron*` scripts run `generate:electron`, not `generate`; the clean normal sequence therefore reproduces the failure.
- Preliminary failure origin: `Local Fix / implementation_engineer`. Production mapping/preflight and the fourth package-contract case encode the wrong Electron generated-output directory. This is not caused by the fixture, signing, absent external access, or unchanged VNC runtime.
- Recommended correction scope: Align the shared packaging authority and durable contract with both actual Nuxt web output (`dist/public`) and actual Electron renderer output (`dist/renderer`), then re-run the same normal sequence. Do not change the provider/session runtime or restore vendored source.
- Focused failure-origin review requested: `Yes`, from `code_reviewer`.

### Round 3 Validation Confidence Scorecard

| Confidence Category | Round 2 Final | Round 3 Final | Supporting Evidence / Limitation |
| --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 98% | 50% | Runtime requirements remain proven, but the critical newly corrected desktop distribution obligation fails in the normal build sequence. |
| Changed-boundary execution directness | 98% | 98% | Real web and Electron generators plus compiled preflight/config orchestration directly exercised the changed boundary and made the failure unambiguous. |
| Cross-boundary integration realism and mock gap | 98% | 95% | Nuxt output and compiled packaging orchestration were real; builder/signing was intercepted only after the preflight boundary. |
| Environment, configuration, identity, and fixture fidelity | 97% | 92% | Exact reviewed commit, offline lock, installed package, macOS Electron target, actual output paths, and documented scripts were used; prepared server/signing resources were intentionally isolated. |
| Failure, edge-case, lifecycle, and recovery evidence | 96% | 98% | Both intentional missing-output fail-fast and unintended normal Electron-flow fail-fast were directly observed; builder non-invocation was captured. |
| User-surface, browser, and desktop-shell confidence | 97% | 75% | Prior real VNC/browser evidence remains strong, but current desktop distributable packaging cannot pass its preflight. |
| Durable regression coverage quality and relevance | 96% | 75% | The new case is relevant but asserts `dist/public` as the sole generated output and misses the documented `generate:electron -> dist/renderer` sequence. |

- Overall round-3 confidence: **83.3%** (`(50 + 98 + 95 + 92 + 98 + 75 + 75) / 7`).
- Every critical acceptance/distribution criterion directly proven: `No` — desktop notice packaging fails.
- Any applicable category below 90%: `Yes` — requirement proof, user/desktop packaging confidence, and durable coverage quality.
- Default 95% target met: `No`.
- Result override: The failing critical path blocks `Pass` regardless of average.
- Prior VNC browser/service confidence: Preserved at 97.1% for the unchanged runtime only; it does not offset the packaging failure.

### Round 3 Durable Coverage And Cleanup

- Durable test changed after prior proportional review: `Yes` — `tests/integration/novnc-package-contract.integration.test.ts` gained the fourth notice/packaging case in commit `7fe03f83e`.
- API/E2E-owned durable test edits in round 3: `None`.
- Successful proportional test-code review requested now: `No`; the package is failing and must first receive focused failure-origin review.
- Temporary harness: `probes/api-e2e/revalidation/intercept-electron-builder.cjs`, retained as execution evidence. It is not product/durable test code.
- Cleanup: Temporary `/tmp` negative fixture removed; no browser/container created; no harness process remains; generated ignored `dist`/build outputs remain as normal repository check artifacts.

## Round 4 CR-001 Correction Revalidation — Latest Authoritative Execution

### Investigation And Scope

- Updated coverage investigation: `/Users/normy/autobyteus_org/autobyteus-worktrees/replace-vendored-novnc/tickets/in-progress/replace-vendored-novnc/api-e2e-coverage-investigation.md`, round-3 correction addendum.
- Reviewed candidate: `ba703f842d79dfab03f4c15add73396acdc247a9` over failed packaging state `7fe03f83e869d5badbf10a35d2898a185c190116`; original runtime remains `4ae4733637bc3d471051783b29894dad0d0e3c28`.
- Mandatory prior failure recheck: `VNC-PKG-DESKTOP-001`.
- Actual changed boundary: generic `dist/public` and Electron `dist/renderer` notice identities, source+renderer packaging preflight tuple, and the fourth durable package-contract case.
- Runtime/provider/session diff result: None. Package version, lock integrity, RFB construction/events, view policy, clipboard behavior, browser UI, backend, and persisted-data paths are unchanged.
- Live VNC/browser rerun decision: `Not Required`. Round 2's 97.1% real Chrome/TigerVNC/websockify result remains direct evidence for the unchanged runtime; repetition would not exercise the corrected packaging path.
- Packaging broader-validation decision: `Required` and completed. The exact previously failing normal Electron sequence reached electron-builder with the corrected configuration.

### Round 4 Changed Boundary And Evidence

| Scenario ID | Requirement / Behavior Basis | Execution Surface | Expected | Observed | Result | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| `VNC-PKG-001` | `AC-001`–`AC-003`, `AC-008`; exact provider and notice drift contract | Focused Vitest plus frozen install | Corrected contract and unchanged provider/session tests pass | All 11 projects installed offline; 4 files / 36 tests passed | Pass | `revalidation-ba703f842/frozen-offline-install.log`; `focused-novnc-vitest.log` |
| `VNC-PKG-WEB-001` | `BEH-004`, `DS-007`; generic web notice distribution | Real `pnpm generate` and exact inspection | Canonical notice appears at `dist/public` only for generic mode | 3,552 modules; 26,305-byte byte-identical output; expected SHA-256; renderer output absent | Pass | `generic-generate.log`; `generic-notice-check.log` |
| `VNC-PKG-ELECTRON-001` | `BEH-004`, `DS-007`; Electron renderer notice distribution | Clean real `pnpm generate:electron` and exact inspection | Canonical notice appears at `dist/renderer`; stale generic output is absent | 3,552 modules; 26,305-byte byte-identical renderer output; expected SHA-256; `dist/public` absent | Pass | `electron-generate.log`; `electron-notice-check.log` |
| `VNC-PKG-CONFIG-001` | Single shared output/preflight/resource authority | `pnpm transpile-build` and compiled export validation | Both mode outputs, Electron-required tuple, and desktop mapping compile exactly | All expected paths and tuple/resource identities matched | Pass | `transpile-build.log`; `compiled-mapping.json`; `compiled-mapping-validation.log` |
| `VNC-PKG-DESKTOP-001` | Requirements MPL-2.0 distribution constraint; `BEH-004`; `DS-007`; exact prior failure | Real Electron-generated state followed by compiled `build.js --mac --arm64`; unrelated icon/server preparation and final builder execution intercepted | Renderer output passes preflight and builder receives exactly one canonical notice mapping | Exit 0; builder reached; `files` included `dist/**/*`; publish `never`; Mac arm64 dmg+zip target; exactly one canonical-source-to-`THIRD_PARTY_NOTICES/...` resource | **Pass** | `packaging-normal-electron-flow.log`; `packaging-normal-electron-flow-summary.txt`; `packaging-captured-config.json` |
| `VNC-PKG-PREFLIGHT-001` | Missing generated Electron notice must fail before packaging | Compiled build from isolated source-only temp cwd | Exact missing `dist/renderer/...` error; builder not called | Exit 1 with exact corrected path; no builder capture | Pass | `packaging-negative.log`; `packaging-negative-summary.txt` |

### Round 4 Repository And Executable Results

| Order | Exact Command / Mode | Result | Material Evidence |
| --- | --- | --- | --- |
| 1 | `pnpm install --offline --frozen-lockfile` from worktree root | Pass | All 11 workspace projects; exact lock remained usable. |
| 2 | `pnpm test:nuxt tests/integration/novnc-package-contract.integration.test.ts composables/__tests__/useVncSession.spec.ts components/layout/__tests__/WorkspaceAdaptiveLayout.spec.ts utils/__tests__/vncHosts.spec.ts --run` | Pass | 4 files / 36 tests. |
| 3 | `pnpm generate` plus exact canonical/generic inspection | Pass | 3,552 modules; both notice files 26,305 bytes; SHA-256 `399fad4dac55bd3226ed40c5e4f5c366f44654e1738a037272ff3e6661a097b3`; byte-identical. |
| 4 | `pnpm generate:electron` plus renderer/mode-separation inspection | Pass | 3,552 modules; exact notice at `dist/renderer`; `dist/public` absent after clean Electron generation. |
| 5 | `pnpm transpile-build` plus compiled mapping assertions | Pass | Generic and renderer identities, source+renderer required tuple, and canonical source -> desktop resource all matched. |
| 6 | Compiled `build.js --mac --arm64` from the Electron-generated state with final builder interception | **Pass** | Normal flow exited 0 and reached builder with exactly one noVNC `extraResource`; this directly resolves `VNC-PKG-DESKTOP-001`. |
| 7 | Isolated missing-renderer negative preflight | Pass | Exit 1 named the exact renderer output and never invoked builder. |
| 8 | Correction-scope, exact package/license/integrity, notice hash, vendored/forbidden-reference, diff, and cleanup scan | Pass | Current HEAD and four-file correction scope exact; package `1.7.0-g7c36fab`/MPL-2.0 exact; no vendored/deep/alias/fallback/patch path; no owned process/container/temp fixture. |

### Round 4 Validation Confidence Scorecard

| Confidence Category | Round 3 Failed | Round 4 Final | Supporting Evidence / Residual Limitation |
| --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 50% | 98% | Critical desktop notice distribution now completes its preflight and builder handoff; all original runtime acceptance criteria retain direct evidence. |
| Changed-boundary execution directness | 98% | 98% | Real Nuxt generic/Electron generators, compiled preflight, and complete builder request exercised the corrected paths directly. |
| Cross-boundary integration realism and mock gap | 95% | 97% | Real output and compiled orchestration crossed into electron-builder configuration; only the final external builder body was intercepted. |
| Environment, configuration, identity, and fixture fidelity | 92% | 95% | Exact reviewed HEAD, macOS arm64 target, frozen lock, real generated state, compiled code, and normal build arguments were used; signing/prepared server resources were intentionally not produced. |
| Failure, edge-case, lifecycle, and recovery evidence | 98% | 98% | The prior failure was reproduced historically then resolved; corrected missing-renderer fail-fast and builder non-invocation were directly verified. |
| User-surface, browser, and desktop-shell confidence | 75% | 96% | Round 2's real browser/service evidence remains authoritative; current renderer generation and shell packaging handoff pass. No signed installer was launched. |
| Durable regression coverage quality and relevance | 75% | 96% | The fourth contract case now distinguishes both Nuxt modes and the Electron-required tuple; all 36 focused tests pass. |

- Overall round-4 confidence: **96.9%** (`(98 + 98 + 97 + 95 + 98 + 96 + 96) / 7 = 96.86%`, rounded).
- Every critical acceptance/distribution criterion directly proven: `Yes`.
- Any applicable category below 90%: `No`.
- Default 95% target met: `Yes`.
- Prior live VNC browser/service confidence: Preserved at 97.1% for the unchanged runtime.
- Residual limitation: The final electron-builder implementation/signing and installed artifact launch were not run. This is a low packaging-finalization risk because the corrected failure was before builder, the full builder request was captured, the resource mapping is platform-neutral, and delivery owns final artifact/license verification.

### Round 4 Durable Coverage, Proportionality, And Cleanup

- Durable test changed in correction commit: `Yes` — the fourth case in `/Users/normy/autobyteus_org/autobyteus-worktrees/replace-vendored-novnc/autobyteus-web/tests/integration/novnc-package-contract.integration.test.ts`.
- API/E2E-owned durable test changes in round 4: `None`.
- Required next gate: Separate proportional review of the changed fourth package-contract case by `code_reviewer`; do not reopen the implementation-source scorecard.
- Temporary harness: `probes/api-e2e/revalidation-ba703f842/intercept-electron-builder.cjs`, retained only as execution evidence. It intercepts icon generation, prepared-server existence, and the final builder body; real generated files, compiled notice checks, branch/target selection, and request construction execute.
- Proportionate platform decision: Repeating Windows capture or producing a signed installer was not required. The failed/corrected check is platform-independent, and the exact Mac arm64 documented sequence plus complete mapping capture closes the identified gap.
- Cleanup: The isolated negative fixture was removed; harness processes exited; no browser or container was created; task-labelled container count is zero. Generated ignored `dist` and compiled build outputs remain as normal repository-check artifacts.

## Result Summary

| Result | Scenario IDs | Summary / Reason |
| --- | --- | --- |
| **Pass — latest round 4** | `VNC-PKG-DESKTOP-001`, `VNC-PKG-ELECTRON-001`, `VNC-PKG-WEB-001`, `VNC-PKG-CONFIG-001`, `VNC-PKG-PREFLIGHT-001`, `VNC-PKG-001` | `ba703f842` resolves the prior Electron output mismatch. Generic and Electron generation, exact notice identity, compiled mapping, normal Mac arm64 builder handoff, corrected fail-fast, and 36 focused tests all passed. |
| Pass — preserved round 2 | `VNC-UNIT-001`, `VNC-BUILD-001`, `VNC-LIVE-001`–`VNC-LIVE-004` | Exact provider and all critical real auth, lifecycle, resize, clipboard, and permission-fallback behavior remain authoritative for unchanged runtime scope. |
| Historical Fail — resolved | `VNC-PKG-DESKTOP-001` on `7fe03f83e` | The prior `dist/public` preflight mismatch is preserved under `probes/api-e2e/revalidation/`; current correction evidence supersedes it. |
| Out Of Scope | Multi-node VNC; persisted migration | No changed boundary or approved scenario requires them. |

## Cleanup Performed

| Resource / Process / Data | Ownership | Cleanup Action | Result |
| --- | --- | --- | --- |
| Round-2 Playwright browser, Nuxt process group, labelled Docker VNC/websockify container, setting/password/clipboard state | API/E2E-owned | Closed/stopped/removed by the live fixture | Pass; retained evidence confirms no owned runtime remained. |
| Existing user AutoByteus app, containers, ports, browser profile, and data | Not owned | Untouched | Pass |
| Round-4 temporary missing-renderer fixture | API/E2E-owned `/tmp` directory | Removed by bounded trap | Pass; zero matching directories. |
| Round-4 intercepted-builder process | API/E2E-owned child | Exited with command | Pass; zero matching active processes. |
| Round-4 Docker/browser resources | Not created | N/A | Pass; task-labelled container count zero. |
| Generated Nuxt/build outputs | Repository command output | Retained in ignored worktree paths for reproducibility | Expected; not a runtime resource. |

## Classification

- Latest result: `Pass`
- Prior implementation failure: Resolved. `VNC-PKG-DESKTOP-001` now passes at the same origin and normal sequence.
- API/E2E fixture/environment failure: `No`.
- Durable test-code review applicability: `Yes` — correction commit `ba703f842` changed the fourth package-contract case after the previous proportional review.

## Recommended Recipient

`code_reviewer` for the separate proportional review of changed durable test code only. The implementation-source review already passed round 4 and should not be reopened.

## Evidence / Notes

- The prior full Nuxt run remains not green: 365 files/1,986 tests passed and four assertions failed in untouched `workspace-history-draft-send`, `MemoryHome`, `CodexFullAccessCard`, and zh-CN glossary tests. They are unrelated to VNC/noVNC, and no affected-scope test failed.
- Prior `nuxi typecheck` reproduced the approved exact 242-error baseline with zero noVNC/local-declaration lines. The correction touches build paths and a contract assertion only, so repeating that known baseline was disproportionate.
- Round-4 generic and Electron notice outputs each matched the canonical 26,305-byte file and SHA-256 `399fad4dac55bd3226ed40c5e4f5c366f44654e1738a037272ff3e6661a097b3`.
- `VNC-PKG-DESKTOP-001` exited 0, reached electron-builder, and captured exactly one canonical-source -> `THIRD_PARTY_NOTICES/noVNC-1.7.0-g7c36fab.txt` mapping from the normal Electron-generated state.
- The exact development-build pin and narrow ambient declaration remain deliberate future-upgrade risks. Any upgrade must atomically update the versioned notice, provenance/source links, mapping, and contract. Delivery retains final documentation/license and packaged-artifact verification ownership.
- Historical round-3 failure logs remain preserved under `probes/api-e2e/revalidation/`; authoritative correction-pass logs are under `probes/api-e2e/revalidation-ba703f842/`.

## Latest Authoritative Result

- Result: `Pass`
- Final validation confidence: **96.9%**
- Default `95%` confidence target met: `Yes`
- Any final applicable confidence category below `90%`: `No`
- Broader validation decision: `Required` packaging-lifecycle validation completed successfully; browser/VNC rerun `Not Required` for unchanged runtime.
- Critical acceptance criteria lacking direct proof: `None`
- Required next recipient: `code_reviewer` for proportional review of the changed fourth package-contract case.
- Notes: No API/E2E-owned durable test changed in round 4. Delivery may resume after proportional test-code review passes.
