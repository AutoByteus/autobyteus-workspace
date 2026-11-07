# API/E2E Execution Coverage Report

## Round

- Coverage investigation: `tickets/in-progress/phone-message-file-reference-open/api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `tickets/in-progress/phone-message-file-reference-open/api-e2e-revision-record.md`, `API-REV-001`
- Test progress log: `tickets/in-progress/phone-message-file-reference-open/api-e2e-test-progress.md`
- Round and trigger: round 1, implementation handoff IR-001 (direct Small/Low route)
- Prior round reviewed: none
- Deviations from the investigation's plan, and why: API-07 needed two baseline fixes in the desktop probe's own GraphQL fixture before it could reach its file-open cases (cause in the test, from app changes `03f2d4da05` and `7d689455ad` made after the probe; TESTING.md Rule 9). Committed separately as `419003d961`; recorded in API-07 Notes.
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-message-file-reference-open/tickets/in-progress/phone-message-file-reference-open/evidence/`

## Routing Classification

- Task size: `Small`
- Architectural risk: `Low`
- Input route: `Direct Low-Risk`
- Successful-output route: `Delivery`
- Proportional test-code review decision: `Not Required — direct low-risk route`

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-1 | `61c886c0fe` (implementation checks, reused) | macOS Darwin 25.5.0 | vitest, nuxt environment | — |
| ENV-2 | `6ccf01c10d` (production code = `61c886c0fe`) | macOS Darwin 25.5.0 | vitest, nuxt environment (`test:nuxt`) | — |
| ENV-3 | Phone bundle built with `AgentEventMonitor.vue`, `useEventMonitorFilePreview.ts`, `useMobileNavigation.ts` from base `6225a734a3`; server and probe from the ticket branch (probe now committed as `59b3ff975c`, identical file) | macOS Darwin 25.5.0 | `build:mobile-web` served by alpha at `/mobile`; headless Chrome (playwright-core); `autobyteus-server-ts` build | Phone 390×844, touch, `isMobile`, en-US; phone reaches alpha at `http://192.168.77.10:<port>` with Phone Access pairing; probe-owned alpha/beta, scripted AGY CLI, synthetic data |
| ENV-4 | Phone bundle built at `6ccf01c10d` (production code = `61c886c0fe`); probe as committed in `59b3ff975c` | same as ENV-3 | same | same |
| ENV-5 | `6ccf01c10d` packaged | macOS Darwin 25.5.0, arm64 | Packaged Electron isolated instance (`isolated-app start --build`), driven over CDP | Probe-owned fixture roots A/B/C; desktop window sizes as the probe sets |

## Cases

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-01 | AC-002, AC-003 (component) | Real monitor, feed, MarkdownRenderer, opener, `useMobileNavigation`, vue-router | Reused IMP-02 (fails on base) and IMP-03 (passes) | ENV-1 | Pass | see IMP-02/IMP-03 in the implementation handoff | — | Still holds: `git diff --name-only 61c886c0fe 6ccf01c10d` touches only the ticket folder; logs have headers and the look-for lines (`expected 'run' to be 'files'`; `Test Files  1 passed (1)`) |
| API-02 | AC-003, AC-004 (unit) | Opener, monitor, layout file-open, phone screens | Reused IMP-04 | ENV-1 | Pass | see IMP-04 | — | Same reason; also inside API-04 |
| API-03 | — | Web typecheck | Reused IMP-05 | ENV-1 | Pass | see IMP-05 | — | Same commit; the probe changed here is `.mjs`, outside the typecheck |
| API-04 | Regression (REQ-003) | All web unit/component suites | `pnpm -C autobyteus-web test:nuxt` | ENV-2 | Pass | `API-04-test-nuxt.log` | `Test Files  713 passed (713)`, `Tests  5312 passed \| 2 skipped (5314)` | The 2 skips are platform-gated cases in `tests/integration/product-license-packaging.integration.test.ts` and `isolated-launch-marker.integration.test.ts`, unrelated |
| API-05 | AC-001, AC-003, REQ-004 (the case catches the bug) | Phone bundle in a browser against a real node | `pnpm -C autobyteus-web test:e2e:mobile-shell --cases=MSP-16 --output-dir=/tmp/427-runs/API-05-msp16-base` | ENV-3 | Fail (expected on base) | `API-05-msp16-base.log`, `API-05-mobile-shell-probe.json`, `API-05-MSP-16-file-open.png` | log: `MSP-16 Fail: a tap on the workspace file shows its text in the phone's file viewer`; JSON `cases.MSP-16.details.opened.query` = `{"screen": "run"}`, `consoleLines[0]` starts `warning: [EventMonitorFilePreview] File preview failed. TypeError: Cannot read properties of undefined (reading 'query')` `at Object.openFile`; screenshot: still the conversation, amber line "The file preview could not be opened." | The production bundle shows no `inject()` warning (Vue strips it); the failure is the TypeError, the same as investigation R-01 |
| API-06 | AC-001, AC-003, REQ-004; preserved MSP-08 | Phone bundle in a browser against a real node | `pnpm -C autobyteus-web test:e2e:mobile-shell --cases=MSP-08,MSP-16 --output-dir=/tmp/427-runs/API-06-msp08-16-head`. MSP-16 steps: lead's message `ECHO_INPUT … [draft-v3.txt](<ws>/drafts/draft-v3.txt) … [private.txt](<root>/alpha/outside-427/private.txt)` sent over the Team run's WebSocket; AGY replies with the text; phone opens the Delivery Team (lead); tap `draft-v3.txt`; system Back; tap `private.txt` | ENV-4 | Pass | `API-06-msp08-16-head.log`, `API-06-mobile-shell-probe.json`, `API-06-MSP-16-conversation.png`, `API-06-MSP-16-file-open.png`, `API-06-MSP-16-back.png`, `API-06-MSP-16-outside.png`, `API-06-MSP-08-file-open.png`, `API-06-MSP-08-reference-open.png` | log: `MSP-08 Pass`, `MSP-16 Pass`, `mobile-shell probe: Pass`; JSON `cases.MSP-16`: `opened` = `viewer: 1, text: true, query: {screen: "files", workspace: "agent_ws_bdff9c…", file: "drafts/draft-v3.txt"}, status: 0`; `back` = `state: "open", query: "?screen=run", composer: 1`; `outside` = `status: "This file is available only on the host workspace.", urlUnchanged: true, viewer: 0, leaked: false`; `consoleLines: []`; `summary.unknownBrowserErrors: 0`; `cleanup` = `frontendExited: true, serversLeft: 0, rootRemoved: true`; screenshot `API-06-MSP-16-file-open.png`: title `draft-v3.txt`, line 1 `DRAFT-V3-TEXT-5150: the third draft.` | `workspace` equals alpha's `workspaceMetadata(rootPath).workspaceId` for the folder (asserted). The two known browser lines are the pre-existing FU-002 of autobyteus-277 (definitions feed to `localhost:8000`), in setup |
| API-07 | AC-004 | Packaged desktop renderer + shell (real Markdown action → lazy monitor → Files tab, native bytes) | Run 1: `pnpm -C autobyteus-web test:e2e:event-monitor-file-preview --output-dir /tmp/427-runs/API-07-desktop --ledger-file /tmp/427-runs/API-07-ledger.md` (builds the app). Runs 2 and 3: the same with `--skip-build` and output `/tmp/427-runs/API-07b-desktop`, `/tmp/427-runs/API-07c-desktop` | ENV-5 | Pass (run 3) | `API-07-desktop-probe.log`, `API-07-run3-evidence.json`, `API-07-run3-ledger.md`, `API-07-run3-first-native-activation.png`, `API-07-run3-readonly-deduped.png`; failing runs: `API-07-run1-build-evidence.json`, `API-07-run1-failed-N-001.png`, `API-07-run2-evidence.json`, `API-07-run2-failed-N-001.png` | run 3 log: `"ok":true`, `"cases":{"N-001":"Pass","N-002":"Pass","N-003":"Pass","N-004":"Pass","N-005":"Pass","N-009":"Pass","N-006":"Pass","N-007":"Pass","N-008":"Pass"`; run 3 JSON `pageErrors: []`, `cleanup.stop.dataRootRemoved: true`; `appAsarSha256` `4fff865f…4366` in all three runs (one build); screenshot `API-07-run3-first-native-activation.png`: the Files tab shows `NATIVE SELECTED B PROOF` | Runs 1 and 2 failed in N-001 before any file action, not from this change. Run 1: the app showed "Saved Agent Org data is unavailable. No run was started." because the app reads an Org member's file changes with `GetAgentOrgMemberFileChanges` (since `03f2d4da05`, 2026-10-19) and the probe answered only `GetRunFileChanges`, so the read hit the real server for a fixture-only Org and hydration failed. Run 2 (fix 1): the Org loaded but the selected delegated copy `agent-task-lead` had workspace root `null`: a copy runs from its recorded launch snapshot (since `7d689455ad`, 2026-10-19) and the probe set the root only on the configured Team. Run 3 (fix 2) passes. Both fixes are in the probe fixture only, commit `419003d961` (baseline fix). The isolated instance `iso-55693-7b42` (from `/tmp/ab412-e2e`) seen in the probe's listing is not this run's and was left alone |

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | For A User-Only Part |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | API-06 (MSP-16), API-05 (the case fails on the base) | Proven | — |
| AC-002 | Yes | API-01 (IMP-02 fails on base, IMP-03 passes) | Proven | — |
| AC-003 | Yes | API-06 (MSP-16 outside tap), API-01 (IMP-03 case 2), API-02 (boundary spec, remote run) | Proven | — |
| AC-004 | Yes | API-07 (run 3), API-02 (IMP-04), API-04 | Proven | — |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | What Supports It (Case IDs) | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 80% | 97% | Repository: API-01..API-04 prove AC-002 directly, AC-001/AC-003 only in happy-dom. Final: API-06 proves AC-001 and AC-003 on the phone bundle, API-07 AC-004 on the packaged desktop | Remote-run variant of AC-003 proven by the boundary spec only (unchanged short-circuit) | A remote-run tap in MSP-16 (beta's run), low value |
| Changed-boundary execution directness | 80% | 97% | The changed boundary is where the inject-based navigation is taken; API-06 runs the production phone bundle's lazy opener chunk through a real tap; API-05 shows the same case fails on the base | — | — |
| Cross-boundary integration realism and mock gap | 75% | 95% | API-06: real node, real Team run and AGY-produced AI message through runtime, stream and projection, real `workspaceMetadata`, real file read under a Phone Access credential, real browser history. API-07: real packaged shell and native bytes | The model is scripted (irrelevant to the change) | — |
| Environment, configuration, identity, and fixture fidelity | 75% | 95% | Phone bundle served by the node at `/mobile`, private-network origin with Host/Origin kept, Phone Access pairing; packaged desktop app from this commit | Headless Chrome stands in for the Android WebView around the same bundle | An emulator run of the APK; not needed for a bundle-only change |
| Failure, edge-case, lifecycle, and recovery evidence | 85% | 95% | Outside-workspace tap (API-06, IMP-03), remote run (IMP-04), obsolete origin after await (IMP-04), desktop missing/directory/unreadable/pending metadata (API-07) | — | — |
| User-surface, browser, and desktop-shell confidence | 60% | 95% | API-06 screenshots and DOM: viewer text, URL, Back to conversation with composer, status line; API-07 packaged desktop Files tab | Physical-phone tap not run (same bundle) | — |
| Durable regression coverage quality and relevance | 90% | 97% | New MSP-16 fails on the base bundle and passes on the fix (API-05/API-06); real-router spec fails on base (IMP-02); TESTING.md rules for both stages that let the bug through; desktop probe repaired so it runs again | — | — |

- Overall post-repository confidence: 78%
- Overall final confidence: 96%
- Calculation method: simple average of the seven categories (post: 545/7 ≈ 78%; final: 671/7 ≈ 96%)
- Every critical acceptance criterion directly proven, apart from parts only the user can check: `Yes`
- Any final applicable category below `90%`: `No`
- Default final confidence target of `95%` met: `Yes`
- Confidence-limiting residual risks: the Android WebView itself was not driven (the bundle it loads was); the remote-run status line on the phone is proven at unit level only (unchanged code)

## Broader Validation Decision (Mandatory)

- Decision: `Required`
- Execution mode: `Browser` (phone bundle against probe-owned nodes) and `Project Desktop Validation` (packaged desktop probe)
- Confidence gap it addresses: repository evidence ran in happy-dom with a memory router; the bug lived in where an inject-based composable was called, which only the production bundle with its real router, lazy chunk and real history shows end to end, and the Files viewer reading the mapped file under a Phone Access credential is outside any unit test
- Browser validation needed: yes, AC-001 asks for it and the boundary is the phone's routing
- If `Not Required`: N/A
- If `Blocked`: N/A

## Desktop Application Validation

- Approach executed: packaged `event-monitor-file-preview-probe` on an isolated instance it owns
- Cases: web-equivalent phone behavior API-05/API-06; desktop renderer + shell API-07
- Effect on any already-running desktop application: None (isolated instance, own profile and ports)
- Behavior not directly proven: none material

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No` (the opener's own `useMobileNavigation()` call and the dead module mocks are removed; the option is required)
- Durable coverage added or retained only for compatibility-only behavior: `No`
- Reroute classification used: N/A
- Upstream recipient notified: N/A

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `Yes`

| Path / Test | Change | Case IDs | For A Removal |
| --- | --- | --- | --- |
| `autobyteus-web/tests/e2e/mobile-shell-probe.mjs` (case MSP-16 and its header line), commit `59b3ff975c` | Added | API-05, API-06 | — |
| `TESTING.md` (two rules under Test layers), commit `d124785e06` | Updated | — | — |
| `autobyteus-web/tests/e2e/event-monitor-file-preview-probe.mjs` (fixture answers `GetAgentOrgMemberFileChanges`; delegated copy's launch snapshot gets the workspace root), commit `419003d961` | Updated (baseline fix) | API-07 | — |

- Added or updated paths attached for proportional test-code review: `Not Applicable` (direct low-risk route)
- Diff or repository evidence supplied for removed paths: N/A

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| Model provider for the Team lead | Scripted AGY CLI (`agy-failure-cli.mjs`, `ECHO_INPUT` replies with the message text) | No model is needed to produce an AI message with given text; TESTING.md "Runtimes without a model" | None for this change: the message travels the real runtime, stream, projection and renderer |
| Physical phone / Android WebView | Headless Chrome with a 390×844 touch phone context loading the node-served phone bundle through a private-network origin | The APK is a WebView shell around the same bundle; no shell change here | Negligible |

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup Action | Result |
| --- | --- | --- | --- |
| Base production files checked out for the API-05 bundle | Yes | `git checkout HEAD -- <3 files>` right after the build; bundle rebuilt at HEAD before API-06 | Restored (`git status` clean for those files); HEAD bundle built 20:53 |
| alpha/beta servers, `nuxt dev`, Chrome, temp root (API-05, API-06) | Yes | Probe `finally` | Receipts: `frontendExited: true, serversLeft: 0, rootRemoved: true` (both runs) |
| Packaged isolated instances (API-07 runs 1-3: `iso-55152-ca8d`, `iso-55627-a837`, `iso-55817-e5a0`) | Yes | Probe N-008 stops each | All three stopped, data roots removed, ports released (`cleanup.stop` in each run's JSON). `iso-55693-7b42` belongs to another worktree; untouched |
| Desktop probe fixture roots | Yes | Probe removes them | `fixtureRemoved: true` |
| Build outputs (`autobyteus-server-ts/dist`, `autobyteus-web/dist`, `dist-mobile`, SDK `dist/`) | Yes | Left untracked (TESTING.md: build outputs are untracked) | Not committed |
| `/tmp/427-runs/*` raw probe outputs | Yes | Kept as full logs; excerpts and JSON copied into `evidence/` | Kept |

## Latest Authoritative Result

- Result: `Pass`
- Criteria not proven, or parts only the user can check (IDs): `None`
- Preliminary classification and recommended owner (on `Fail`): N/A
- Next recipient from `get_handoff_rules`: see the handoff message (direct low-risk route → delivery)
- Notes: on the base bundle the phone shows "The file preview could not be opened." after the tap (API-05 screenshot), not nothing; the user reported "does nothing" (perhaps the line was out of view or read-only). Either way the fix removes the failure. The desktop probe had been failing in its setup on every branch since 2026-10-19; it is repaired here as a baseline fix.
