# API/E2E Execution Coverage Report

## Round

- Coverage investigation (the plan; it lists the upstream documents): `api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md`, `API-REV-001`
- Test progress log (when used): `api-e2e-test-progress.md`
- Round and trigger: round 1; code review pass CRR-001 (Large + High)
- Prior round reviewed: N/A
- Deviations from the investigation's plan, and why:
  - BS-06 reads a large draft back instead of finalizing it: `finalize` of an `agent_final` owner needs a run the node admits, which a bare built server has none of. Finalize and the agent's path are proven in MSP-53, where the real send finalizes and a scripted agent opens the file.
  - MSP-53 uses the scripted AGY CLI's `context_files` case (records the agent's input, opens each listed path, answers its SHA-256) for the "agent gets an absolute path to the full file" proof, which is stronger than the planned message check.
  - MSP-55 and MSP-53 pace and drop the upload through a TCP forwarder of the case in front of the node, not Chrome's network throttle: the throttle does not slow loopback (run 7: the 12 MiB upload finished at once), and one connection reset is retried by Chrome (run 8). Only a link kept down shows the interrupted line.
  - CF-014 adds the two settings with the Server Settings list's "new setting" row: a predefined setting with no value is not listed (see Finding F-001).
  - API-06 (a real native turn with a video over 25 MiB) was not run: no test vault.
- Evidence folder (absolute path; the handoff message gives the commit that holds it): `/Users/normy/autobyteus-org/autobyteus-task-worktrees/context-file-large-video-upload/tickets/in-progress/context-file-large-video-upload/evidence/`

## Routing Classification

- Task size (`Small`/`Medium`/`Large`): `Large`
- Architectural risk (`Low`/`High`): `High`
- Input route (`Reviewed`/`Direct Low-Risk`): `Reviewed`
- Successful-output route (`Code Review`/`Delivery`): `Code Review`
- Proportional test-code review decision: `Required` (changed durable test code: the built-server e2e file, the phone cases file, CF-014 and the two probe wirings)

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter (data, identity, locale, viewport) |
| --- | --- | --- | --- | --- |
| ENV-1 | `80f958bc5` sources (tests at `de0250122`, docs `8004c285b`) | macOS (Darwin 25.6), Node v26.12.0, pnpm 10.28.2 through a shim | `autobyteus-server-ts/dist/app.js` rebuilt from this worktree this round (`evidence/API-00-build-server.log`); test-owned data root and free port; owner credential from the helpers; `env -i` with a temp HOME | default limits unless a case sets them (API-01 sets 8 MiB / 2 MiB through the environment at start) |
| ENV-2 | same | same | phone bundle built this round (`pnpm -C autobyteus-web build:mobile-web`), served by the probe's node at `/mobile`; headless Google Chrome, 390×844, touch, `isMobile`, `192.168.77.40` mapped to loopback, paired through Phone Access (a phone credential, not the owner credential) | UI language zh-CN (stored preference); scripted AGY CLI (`context_files` case); a TCP forwarder of the case between the phone and the node |
| ENV-3 | same | same | real Nuxt dev frontend + built backend + headless Chrome, 1440×1000 | UI language zh-CN; probe-owned data root and ports; owner credential through the Nuxt dev proxy |
| ENV-4 | same | same | built `autobyteus-ts` (`dist`), plain Node | files on disk under a temp folder |

## Cases

| Case ID | Criteria (AC / Requirement IDs) | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-R01 | AC-002, 003, 004, 012; BEH-001, 003, 008 | Server unit | `IMP-01` | n/a | Pass | implementation handoff, `IMP-01` row | `Tests  615 passed (615)` | Reused: `git diff --name-only 5fad14c5a HEAD` outside the ticket folder lists only two web `.vue` files, so no server source changed since IMP-01 |
| API-R02 | AC-001..004, 007, 008, 012, 015 | Server in-process HTTP | `IMP-02` | n/a | Pass | `IMP-02` row | `Tests  15 passed (15)` | Reused, same reason |
| API-R03 | AC-012, 013; BEH-005, 006, 008, 010 | Server REST + Project Task e2e | `IMP-03` | n/a | Pass | `IMP-03` row | `Tests  133 passed \| 123 skipped (256)` | Reused, same reason; its Project Task cases run on the production server composition |
| API-R04 | typing | Server typecheck | `IMP-04` | n/a | Pass | `IMP-04` row | `production errors: 0` | Reused; rerun in API-08 with the new test file |
| API-R05 | AC-011 | autobyteus-ts unit | `IMP-05` | n/a | Pass | `IMP-05` row | `Tests  1068 passed (1068)` | Reused: `autobyteus-ts` unchanged since `5fad14c5a` |
| API-R06 | AC-005..009, 012 | Web unit | `IMP-06` | n/a | Pass | `IMP-06` row | `Tests  179 passed (179)` | Reused: ran at `80f958bc5`, the tested code commit |
| API-R07 | localization | Web guards | `IMP-08` | n/a | Pass | `IMP-08` row | `Passed with zero unresolved findings` | Reused, same |
| API-R08 | AC-001, 005, 007, 009 (desktop, en-US) | Desktop browser probe | `IMP-10` (CF-002, CF-008, CF-013) | n/a | Pass | `IMP-10` row | `CF-013: Pass` | Reused: `composer-context-file-removal-probe.mjs` changed only by the added CF-014, its header and the case list; CF-013 and CF-008 code unchanged |
| API-01 | AC-001, 002, 003, 004, 006 (server answer), 008, 013; REQ-001, 002, 004; QR-002, QR-004 | Built production server, real HTTP, node gate, real settings storage | `cd autobyteus-server-ts && env -i PATH="$PATH" HOME="$(cd "$(mktemp -d)" && pwd -P)" TMPDIR="$TMPDIR" pnpm exec vitest run tests/e2e/context-files/context-file-size-limits-built-server.e2e.test.ts --no-watch --reporter=verbose` | ENV-1 | Pass | `evidence/API-01-built-server-small-limits.log` | `Tests  7 passed \| 1 skipped (8)`; BS-01 limits 8 MiB / 2 MiB from the environment, at-limit 200, +1 → 413 `maxBytes`; BS-02 phone credential reads `size-limits` and uploads, forged credential refused; BS-03 `updateServerSetting` 8→4 MiB: the same 8 MiB upload goes 200 then 413 `maxBytes` 4 MiB with no restart; BS-04 `0`, `abc`, `10241`, `-5`, `1.5`, `1025` refused and the limit unchanged; BS-05 415 and a socket dropped at 3 MiB leaves no file and `/rest/health` 200; BS-06 a 6 MiB draft read back with the sent SHA-256; BS-07 `/upload-file` 26 MiB → 413 | Two earlier runs failed on harness defects only (an `ENOENT` race while listing a folder the server was removing; a finalize call BS-06 wrongly made); fixed before the committed run |
| API-02 | AC-001, AC-015; REQ-001; QR-001 | Built server, default limits, GiB bodies | `RUN_LARGE_CONTEXT_FILE_E2E=1 env -i … pnpm exec vitest run tests/e2e/context-files/context-file-size-limits-built-server.e2e.test.ts -t BS-10 --no-watch --reporter=verbose` | ENV-1 | Pass | `evidence/API-02-built-server-large-upload.log` | `BS-10 accepted 1536 MiB: server RSS baseline 296 MiB, peak 419 MiB over 21 samples` and `BS-10 refused 2 GiB + 1 MiB: server RSS peak 431 MiB`; the stored file's size and SHA-256 equal what was sent; the 2 GiB + 1 MiB video was refused 413 with `maxBytes` 2147483648, no file left, `/rest/health` 200 | Memory grew about 123 MiB for 1.5 GiB and about 135 MiB while 2 GiB were read and discarded: flat, not proportional. The first run failed only the sample-count assertion (a 250 ms sampler against a 1.5 s upload); the interval is 50 ms now |
| API-03 | AC-001, 005, 006, 007, 008; REQ-001, 005..009; QR-002; ASM-001 (derivation) | Phone bundle in headless Chrome, zh-CN, paired phone credential | `cd autobyteus-web && PATH=<pnpm and corepack shims> node tests/e2e/mobile-shell-probe.mjs --cases=MSP-53,MSP-54,MSP-55 --output-dir=<fresh>` | ENV-2 | Pass | `evidence/API-03-mobile-shell-summary.log`, `API-03-mobile-shell-probe.json`, `API-03-MSP-53-agent-input.log`, `API-03-MSP-53-uploading-zh-CN.png`, `-MSP-53-attached.png`, `-MSP-53-sent.png`, `-MSP-54-over-limit-zh-CN.png`, `-MSP-54-attached-after-raise.png`, `-MSP-54-server-413-zh-CN.png`, `-MSP-55-uploading-before-cancel.png`, `-MSP-55-after-cancel.png`, `-MSP-55-interrupted-zh-CN.png` | `mobile-shell probe: Pass`; MSP-53: `fileType: video/mp4`, `percentagesSeen: [0, 8]`, `sendBlockedWhileUploading: true`, `uploadStatuses: [200]`, `draftSize` = `finalSize` = 27262976 (26 MiB), `pathInAgentInput: true`, `agentOpenedWholeFileSha256Matches: true`; the agent-input log line `SENT-VIDEO-WS6 a 26 MiB video\n\nReference files:\n- /…/context_files/ctx_…__video-26mib.mp4`; MSP-54: lines `无法附加 big-clip.mp4：文件超过 3 MB 大小限制。` and `无法附加 big-spec.pdf：文件超过 1 MB 大小限制。`, `refusedUploads: 0`, `limitReads: 1`, after the raise `uploads: [200]`, stale read `sent: [413]` and the same `…超过 3 MB…` line; MSP-55: `cancelLines: []`, `cancelLabel: 取消上传 drop-clip.mp4`, `dropLines: 无法附加 drop-clip.mp4：上传中断，请检查网络后重试。`, `draftFilesAfterDrop: 0`, `sendUsable: true`; cleanup `serversLeft: 0` | Run 11 is the recorded run. Earlier runs failed on case-code defects only (a shadowed variable; a setting the node does not let you delete; Chrome's throttle and single reset not dropping a loopback upload), recorded in the progress log. The page's `File.type` comes from the extension in headless Chrome: ASM-001 for a real phone is not proven (Not Tested below) |
| API-04 | AC-004, 005; REQ-002, 005, 012 | Desktop browser: Server Settings page + open composer | `cd autobyteus-web && PATH=<shims> node tests/e2e/composer-context-file-removal-probe.mjs --cases CF-014 --output-dir <fresh>` | ENV-3 | Pass | `evidence/API-04-composer-probe-summary.log`, `API-04-composer-probe-evidence.json`, `API-04-settings-invalid-refused.png`, `API-04-settings-saved.png`, `API-04-settings-composer-zh-CN-refused.png` | `Composer context-file removal probe: Pass`; `listedAtStart: {video: false, other: false}`; refusal `Audio/video size limit must be a whole number of MiB from 1 through 10240.` for the add row and for an edit of the row; `listed: {video: "3", other: "1"}`; composer lines `无法附加 clip-big.mp4：文件超过 3 MB 大小限制。` and `无法附加 doc-big.pdf：文件超过 1 MB 大小限制。` with no reload and no upload request; defaults restored; cleanup `dataRootRemoved: true` | Earlier runs failed on harness defects only (English-only helper selectors under zh-CN; the unlisted setting; the two console errors the settings store logs for refused saves, now asserted as exactly two) |
| API-05 | AC-011; REQ-010; QR-003 | Built `autobyteus-ts` sanitizer + built Gemini prompt renderer on real files | `node evidence/API-05-gemini-request-probe.mjs <worktree>/autobyteus-ts <empty data folder>` | ENV-4 | Pass | `evidence/API-05-gemini-request-probe.log`, `evidence/API-05-gemini-request-probe.mjs` | `"diagnostics": ["image:too_large","audio:too_large","video:too_large"]`; kept video `video-25mib.mp4`, `video-3mib.mp4`, the data URI; the rendered request has 4 `inlineData` parts (1 image, 2 videos, 1 data URI) and none for the 26 MiB video, audio or image; `pathsStillInText: true`; `canonicalUntouched: true`; `urlKept: true`; `PASS` | Temporary probe (not durable: the unit suite IMP-05 is the durable proof; this shows the built module and the renderer that makes the request body) |
| API-06 | AC-011 live; SCN-006 | Native runtime, real provider turn, video over 25 MiB | none | n/a | Not Tested | none | none | The test vault is not set up on this machine (`pnpm test-vault status`: `STATE NOT_FOUND`, `TEST_VAULT_NOT_FOUND`); only the user sets one up. Covered at the module that builds the request by API-05 and IMP-05 |
| API-07 | AC-014; REQ-012 | Documentation review | read `autobyteus-server-ts/docs/FILE_RENDERING_AND_MEDIA_PIPELINE.md` "Context-file size limits", `autobyteus-web/docs/settings.md` "Server Settings: Context File Size Limits", `GLOSSARY.md` "Context Files" | n/a | Pass, with F-001 | the files named | settings, defaults, ranges, the per-type rule, the 24 h cleanup and the 25 MiB inline rule are documented | One statement is imprecise: `settings.md` says the settings are in Server Settings "the advanced list, with the other predefined keys". Observed (CF-014): a setting with no value is not listed; the owner adds it with the list's new-setting row |
| API-08 | typing | Server typecheck | `pnpm -C autobyteus-server-ts typecheck` | ENV-1 | Pass | `evidence/API-08-server-typecheck.log` | `production errors: 0; test-file errors: 1180 in 364 files (baseline 1180 in 364 files)` and `[typecheck] PASS` | The new e2e test file adds no error |
| API-09 | node-credential and import rules | Server architecture tests | `env -i … pnpm exec vitest run tests/architecture --no-watch` | ENV-1 | Pass | `evidence/API-09-server-architecture-tests.log` | `Test Files  13 passed (13)`, `Tests  72 passed (72)` (`e2e-node-credential-paths`, `tracked-imports` among them) | Run at `de0250122`, with the new test file committed |

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical (`Yes`/`No`) | Proven By Case IDs | Result | For A User-Only Part: What You Tried And Why It Still Needs The User |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | API-02, API-03 (MSP-53), API-R02, API-R08 | Proven (apart from a real phone's `File.type`, see ASM-001 below) | A 26 MiB video on the phone bundle attached with progress and was sent; the agent opened the whole file at its absolute path; 1.5 GiB streamed on the production server. The 200 MiB figure in the criterion is covered by those two sizes. A real device is not available (see Not Tested) |
| AC-002 | Yes | API-01 (BS-01), API-02, API-R01, API-R02 | Proven | |
| AC-003 | Yes | API-01 (BS-01 PDF at 2 MiB and +1; BS-07), API-R01..R03 | Proven | |
| AC-004 | Yes | API-01 (BS-03, BS-04), API-03 (MSP-54 raise), API-04 | Proven | |
| AC-005 | Yes | API-03 (MSP-54), API-04, API-R06 | Proven | |
| AC-006 | Yes | API-03 (MSP-54 stale read), API-01 (BS-03 server answer) | Proven | The stale client is emulated by answering the phone's one read of the limits with the earlier value (a route answer); the node's 413 and the phone's line are real |
| AC-007 | Yes | API-03 (MSP-55 cancel), API-R08 (CF-013), API-R02 | Proven | |
| AC-008 | Yes | API-03 (MSP-55 drop), API-01 (BS-05) | Proven | |
| AC-009 | Yes | API-R06 (the reported-string regression), API-R08 (CF-008), API-03/API-04 (the lines are exactly the localized sentences) | Proven | |
| AC-010 | No | API-R01 (the draft cleanup unit tests) | Proven | A 24 h wait was not run; the unchanged cleanup is covered by the existing unit tests |
| AC-011 | Yes | API-05, API-R05 | Proven at the module that builds the request; the live provider turn is `Only The User Can Check` | Tried: the built sanitizer and Gemini renderer on real files (API-05). A real turn needs a provider key; the test vault is `NOT_FOUND` and only the user can set it up |
| AC-012 | No | API-R01..R03, API-R06 | Proven | Reused checks; the Project Task upload runs on the production server composition in IMP-03 |
| AC-013 | No | API-01 (BS-07), API-R03 | Proven | |
| AC-014 | No | API-07 | Proven, with F-001 (one imprecise sentence) | |
| AC-015 | Yes | API-02, API-R02 | Proven | RSS stayed within about 135 MiB of its baseline while 1.5 GiB was stored and 2 GiB were read |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | What Supports It (Case IDs) | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 90% | 96% | every AC above; API-01..05, R01..R08 | AC-011 live turn and ASM-001 are user-only; AC-010 is unit evidence only | The user's real-phone attach and a vault-backed Gemini turn |
| Changed-boundary execution directness | 94% | 96% | API-01, API-02 on the built server; API-03 on the phone bundle with the real send path; API-04 on the real Settings page | The native-runtime boundary is exercised at the sanitizer and renderer, not a live request | A live turn |
| Cross-boundary integration realism and mock gap | 85% | 94% | real built server, real settings storage, real node-access gate with a paired phone credential, real browser uploads; mocks are the scripted AGY CLI (agent), the stale-limits route answer for one read, and the forwarder that paces and drops the link | The agent is scripted, not a model; the link drop is emulated at TCP level | A device on a real network; a real model |
| Environment, configuration, identity, and fixture fidelity | 90% | 95% | test-owned data roots and ports, owner and phone credentials, env at process start and GraphQL settings, no shared state touched | Node 26.12 here; headless Chrome stands in for an Android WebView | An Android emulator or device (none on this machine) |
| Failure, edge-case, lifecycle, and recovery evidence | 90% | 95% | at-limit/+1, 2 GiB+1 MiB refusal, invalid values, lowered limit, stale client, cancel, link drop, dropped socket on the server, 415, no draft left in every case, Send usable after the drop | A drop on a real mobile network (slow loss, no reset) is not shown: the client sets no upload timeout, so a link that goes silent without a reset ends when the operating system gives up | A device test |
| User-surface, browser, and desktop-shell confidence | 70% | 94% | MSP-53..55 (390×844, zh-CN, touch), CF-014 (desktop zh-CN), IMP-10 (desktop en-US); screenshots read | No real WebView; keyboard and focus on the cancel control not exercised; the English `Context Files (n)` header is FU-003 | A device or emulator pass |
| Durable regression coverage quality and relevance | 92% | 95% | new built-server e2e (7 default cases, 1 gated), phone cases MSP-53..55, CF-014; all fail on a wrong limit, a missing refusal or a left-over file by their assertions; typecheck and architecture rules pass | The new cases were not mutation-tested (IMP-12 did that for the drain in the implementation's tests) | A mutation pass on the writer and the pre-check |

- Overall post-repository confidence: 87%
- Overall final confidence: 95%
- Calculation method: simple average of the seven categories (87.3% and 95.0%), over the scope that can be proven without the user (a real phone's `File.type` and a real provider turn are listed as user-only parts, not scored as gaps)
- Every critical acceptance criterion directly proven, apart from parts only the user can check: `Yes`
- Any final applicable category below `90%`: `No`
- Default final confidence target of `95%` met: `Yes` (95.0%, no category below 94%)
- Confidence-limiting residual risks: a real Android phone's `File.type`, progress and abort in the real WebView, behavior on a silent (no reset) network loss, and a live provider turn; none is reproducible on this machine

## Broader Validation Decision (Mandatory)

- Decision: `Required`, and executed
- Execution mode (`Browser`/`Live API`/`Project Desktop Validation`/`CLI`/`Lifecycle`/`Worker or Distributed`/`Other`/`None`): Browser (phone bundle and desktop) + Live API (built server) + Lifecycle (cancel, drop, restart-free settings change)
- Confidence gap or residual risk it addresses, and the expected gain: the post-repository scorecard (87%) was limited by the phone/zh-CN surface (70%), the production-composition and GiB-size behavior and the live settings path; the cases above raised those to 94–96%
- Browser validation needed, and why or why not: yes. TESTING.md requires the phone bundle for behavior the phone offers; uploads, progress, cancel, and WebView-equivalent XHR are browser behavior
- If `Not Required`: N/A
- If `Blocked`: not blocked. Only the live provider turn and the real device are unavailable, and they are marked user-only

## Desktop Application Validation (When Applicable)

- Approach executed, and any deviation from the investigation's plan: no desktop-shell case: no Electron main, preload, IPC, window or packaging file is in the diff. CF-014 ran on a real Nuxt dev frontend (web-equivalent renderer)
- Cases proving web-equivalent behavior, and cases proving shell-specific or lifecycle behavior: web-equivalent API-04, API-R08; shell-specific none
- Effect on any already-running desktop application: `None` (probe-owned ports and data roots; the user's `AutoByteus.app` and its data were not touched)
- Behavior not directly proven and its confidence consequence: none relevant to a shell change

## Persisted-Data Transition Checks (When Applicable)

- Approved persisted-data decision: `Not Affected`
- Representative existing data used: existing draft and final context-file readers ran in IMP-03; this round read a draft back (BS-06) and a final file (MSP-53)
- Approved transition followed without an unnecessary migration: `Yes`
- Cases proving the direct-use, discard/rebuild, or migration outcome: API-R03, API-01 (BS-06), API-03 (MSP-53)
- Version-specific runtime branch, dual read/write, or compatibility fallback observed: `No`
- Residual untested persisted-data risk: none

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No`
- Durable coverage added or retained only for compatibility-only behavior: `No`
- If compatibility-related invalid scope was observed, reroute classification used: N/A
- Upstream recipient notified: N/A

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `Yes` (commit `de0250122`)

| Path / Test | Change | Case IDs | For A Removal: Obsolete Assertion, Upstream Evidence, And Replacement Or No-Replacement Rationale |
| --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/context-files/context-file-size-limits-built-server.e2e.test.ts` | Added | API-01, API-02 | N/A |
| `autobyteus-web/tests/e2e/mobile-context-file-size-cases.mjs` | Added | API-03 | N/A |
| `autobyteus-web/tests/e2e/mobile-shell-probe.mjs` | Updated (header, import, one call) | API-03 | N/A |
| `autobyteus-web/tests/e2e/composer-context-file-removal-probe.mjs` | Updated (case CF-014, header, case list) | API-04 | N/A |

- Added or updated paths attached for proportional test-code review: `Yes`
- Diff or repository evidence supplied for removed paths: N/A (nothing removed)

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| The agent (a model) | the repository's scripted AGY CLI (`AGY_FAKE_CASE=context_files`) | No test vault; also deterministic | It proves the agent receives the path and can open the whole file, not what a model does with it |
| The phone's read of the limits (MSP-54 stale case only) | a Playwright route answer for that one GET | A real race (the owner lowers the limit between the phone's read and its upload) cannot be timed in a browser | The node's 413 and the phone's line are real |
| The phone's network | a TCP forwarder of the case that paces the upload and resets connections, kept down until restored | A real mobile link cannot be made to drop on demand; Chrome's throttle does not slow loopback | A real network may stall without a reset |
| A real phone | headless Chrome at 390×844 with touch, paired as a phone credential | No device, emulator or Android SDK on this machine | `File.type` and WebView behavior are Chrome's here |

## Temporary Methods And Cleanup

| Item | Owned By This Run (`Yes`/`No`) | Cleanup Action | Result |
| --- | --- | --- | --- |
| Built servers of API-01, API-02 and their data roots | Yes | `server.stop()`; roots removed in `afterAll` | `tests/.tmp` holds only the harness's own `autobyteus-server-test.db` files |
| Probe stacks (Nuxt dev, nodes alpha, beta, eta, Chrome) of API-03, API-04 | Yes | the probes' `finally` | `cleanup: {frontendExited: true, serversLeft: 0, rootRemoved: true}` and `dataRootRemoved: true`. One earlier run (msp-run4) hung in teardown after a case failure; I killed its own processes (probe, `nuxt dev`, its two node children) and nothing else |
| TCP forwarder of MSP-53..55 | Yes | closed in `finally` | no listener left |
| `pnpm` and `corepack` shims, API-05 data files, run folders | Yes | `/tmp/api-e2e-ws6` (shims and typecheck log remain until the end of the session; data and run folders removed) | Evidence copied into the ticket's `evidence/` first |
| Built outputs: `autobyteus-server-ts/dist`, `autobyteus-web/dist`, `dist-mobile` | Yes | left in place (untracked or ignored) | Not committed |

## Preliminary Classification (On `Fail`)

Not applicable: no case failed. Failures in earlier runs of API-01..API-04 were defects of my case code, each recorded in the progress log and fixed before the recorded run.

## Latest Authoritative Result

- Result: `Pass`
- Criteria not proven, or parts only the user can check (IDs): the real phone's `File.type` and WebView upload progress/abort (ASM-001, AC-001 on a device); a real native-runtime turn with a video over 25 MiB (AC-011 live)
- Preliminary classification and recommended owner (on `Fail`): N/A
- Finding F-001 (non-blocking, documentation; owner: delivery engineer's documentation sync or the implementation engineer): `autobyteus-web/docs/settings.md` says the two settings are in Server Settings "the advanced list, with the other predefined keys". A predefined setting with no value is not listed (`ServerSettingsService.getVisibleSettingKeys`; the same for the idle-shutdown setting), so on a node that never set them the owner finds them only by adding the key with the list's new-setting row (which validates and then lists them with their descriptions). The behavior matches the existing pattern and AC-004; the sentence should say so.
- Next recipient from `get_handoff_rules` (`Blocked` -> user request): the `Pass` rule for the reviewed Large/High route (proportional test-code review by the code reviewer; checked with `get_handoff_rules` before sending)
- Notes: RC-001 (release with or after Memory Sync Task `autobyteus-workspace-7`) is delivery's. CR-001 (unreachable `disabled` styles in `ContextFilePathInputArea.vue`) is still open for the implementation engineer.
