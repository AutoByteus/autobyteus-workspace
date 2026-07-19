# API/E2E Execution Coverage Report

## Execution Round Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/local-video-preview-playback/tickets/in-progress/local-video-preview-playback/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/local-video-preview-playback/tickets/in-progress/local-video-preview-playback/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/local-video-preview-playback/tickets/in-progress/local-video-preview-playback/design-spec.md`
- Supplemental Task Artifacts:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/local-video-preview-playback/tickets/in-progress/local-video-preview-playback/runtime-probe-evidence.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/local-video-preview-playback/tickets/in-progress/local-video-preview-playback/url-identity-probe-evidence.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/local-video-preview-playback/tickets/in-progress/local-video-preview-playback/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/local-video-preview-playback/tickets/in-progress/local-video-preview-playback/implementation-handoff.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/local-video-preview-playback/tickets/in-progress/local-video-preview-playback/code-review-report.md`
- Coverage Investigation: `/Users/normy/autobyteus_org/autobyteus-worktrees/local-video-preview-playback/tickets/in-progress/local-video-preview-playback/api-e2e-coverage-investigation.md`
- Current Execution Round: `3`
- Trigger: Implementation-source review round 7 passed implementation/test commit `b658f16b53e494a5649e3a72cc136fdf039ff8df`; CR-004 was resolved and all six retained scenarios required fresh execution.
- Prior Round Reviewed: `Yes — round 2 was treated only as historical failure context.`
- Latest Authoritative Round: `3`

## Round History

| Round | Trigger | Prior Unresolved Failures Rechecked | New Failures Found | Result | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Initial reviewed implementation `f60718a63d8551bb31bc26913a3154dc0614bc95` | N/A | Empty-authority POSIX URL was rewritten by Electron standard-scheme parsing and valid files returned `404` | Fail | No | Classified Design Impact and returned through design review. |
| 2 | Fixed-authority implementation/test commit `02ca27faff5b0441488c2e1b1e65cd6cc2443c18` | Round-1 URL identity, video, and range failures | Scheme-registered renderer parsing corrupted legacy POSIX hydration before migration | Fail | No | E2E-PROTO-001, E2E-VID-001, and E2E-VID-002 passed; E2E-SEC-001/E2E-UI-001 failed AC-010. |
| 3 | Raw-ingress legacy POSIX fix `b658f16b53e494a5649e3a72cc136fdf039ff8df` | Round-2 AC-010 migration/lifecycle failure and the previously stopped representative viewer journey | Reviewed two-privilege scheme blocks preserved PDF XHR and Excel fetch before `protocol.handle` | Fail | Yes | Five scenarios pass; E2E-REG-001 fails FR-001/FR-006 and AC-008. |

## Investigation And Execution Basis

- Coverage investigation artifact: `/Users/normy/autobyteus_org/autobyteus-worktrees/local-video-preview-playback/tickets/in-progress/local-video-preview-playback/api-e2e-coverage-investigation.md`
- Investigation completed before durable coverage changes or final execution: `Yes`
- Investigation plan followed: `Yes` — focused and full repository suites were followed by an isolated exact Electron 42.4.1 real-component journey, lifecycle probe, and cleanup. After the representative viewer failure, privilege differentials were added to distinguish implementation behavior, development-origin artifacts, and scheme-capability design.
- Existing coverage decisions revised during execution, with evidence: `Yes` — the exact two-privilege assertion in `electron/local-file-protocol/__tests__/local-file-protocol.spec.ts` is no longer considered sufficient/valid preserved-viewer coverage after actual PDF/Excel execution. It should be updated only after upstream design revision. No durable test was changed in this failed round.
- Reroute required before or during execution: `Yes — after complete evidence capture.`
- Notes: The implementation conforms to the currently reviewed `{ standard: true, stream: true }` design. The failure is not attributed to a fixture or harness without focused review; both HTTP-origin and packaged/file-origin differentials reproduce it.

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No` — the isolated approved persisted-data migration is current-data transition policy, not an alternate runtime transport.
- Compatibility-only or legacy-retention behavior observed in implementation: `No`
- Approved persisted-data transition followed without unnecessary migration or version-specific runtime fallback: `Yes`
- Durable coverage added or retained only for compatibility-only behavior: `No`
- If compatibility-related invalid scope was observed, reroute classification used: `N/A`
- Upstream recipient notified: `Pending this report's Fail handoff to code_reviewer.`

## Changed Boundary And Evidence Matrix

| Scenario ID | Behavior / Requirement / Acceptance-Criteria IDs | Changed Boundary | Execution Surface / Mode | Evidence Type | Result | Evidence / Artifact |
| --- | --- | --- | --- | --- | --- | --- |
| E2E-PROTO-001 | BEH-001/003; FR-001/002/005/007; AC-001/003/006/007/009 | Renderer URL -> Electron handler -> validated byte response | Exact Electron 42.4.1 request matrix with production codec/protocol/response | Temporary + Desktop | Pass | `api-e2e-evidence/round-3-electron-result.json`, `round-3-electron-probe.log` |
| E2E-SEC-001 | BEH-003/005; FR-002/005/007; AC-006/007/010 | Raw locator ingress, canonical handler identity, no-byte rejection, executable exclusion | Exact Electron normalization/request matrix plus production hydration/submission lifecycle | Temporary + Desktop | Pass | Main result plus `round-3-migration-resolution-result.json` and log |
| E2E-VID-001 | BEH-001/002; FR-001–005/007; AC-001–005/009 | Native media, custom protocol, failure/retry/recovery UI | Real `VideoPlayer` and exact reported MP4 in Electron renderer | Temporary + Desktop | Pass | E2E-VID-001 record in main result/log |
| E2E-VID-002 | BEH-001/003; FR-001–003; AC-003/006/009 | Large media seek, later ranges, cancel/handle lifecycle | Real 607,568,129-byte MP4, Chromium Range trace, explicit abort, `lsof` | Temporary + Desktop | Pass | E2E-VID-002 record in main result/log |
| E2E-UI-001 | BEH-002/005; FR-004/005/007; AC-004/005/010 | Accessible error/retry, attachment UI, live/fresh lifecycle | Real Vue DOM in Electron plus executable owner lifecycle | Temporary + Desktop | Pass | E2E-UI-001 record in main result/log |
| E2E-REG-001 | BEH-004; FR-001/005/006; AC-008 | Preserved image/audio/PDF/Excel/text viewers and thumbnails over shared routes | Real `FileViewer`/media/components in Electron; focused privilege differentials | Temporary + Desktop | Fail | Main result/log; `round-3-fetch-privilege-*`; `round-3-file-origin-*` |

## Additional Repository Coverage Execution

No repository command was added after the post-repository scorecard. The authoritative focused/full repository commands and results remain in the coverage investigation. The post-gate work was realistic Electron execution and focused temporary differentials, recorded below.

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | Change | New / Final Supporting Evidence | Residual Uncertainty |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 90% | 86% | -4 | Direct proof now exists for every scenario, but AC-008 fails for required preserved PDF/Excel routes | AC-008 cannot pass until reviewed design/source rework succeeds |
| Changed-boundary execution directness | 92% | 99% | +7 | Exact production codec, protocol, response, media, migration, presentation, and viewer consumers executed | Only live Windows remains platform-residual |
| Cross-boundary integration realism and mock gap | 86% | 98% | +12 | Real Electron renderer -> Chromium -> handler -> filesystem plus actual PDF XHR and Excel fetch were observed | Packaged artifact was represented by a file-origin differential rather than a full distributable build |
| Environment, configuration, identity, and fixture fidelity | 93% | 98% | +5 | Exact Electron/Chromium/Node versions, isolated default session/profile, canonical URLs, exact source hashes, deterministic fixtures, and file-origin differential | macOS only; codec support remains bounded by shipped Chromium |
| Failure, edge-case, lifecycle, and recovery evidence | 91% | 97% | +6 | Full range/method/no-byte matrix, Retry/URL recovery, invalid quarantine, explicit abort and FD release, and privilege-mode failure isolation | No Windows process-level execution |
| User-surface, browser, and desktop-shell confidence | 83% | 88% | +5 | Real DOM/native media/image/audio/text UI passed; actual PDF and Excel UI failed deterministically | Two required preserved viewer surfaces remain broken |
| Durable regression coverage quality and relevance | 98% | 84% | -14 | Focused repository suite is broad, but the exact privilege lifecycle assertion protected a premise while mocked viewer coverage missed its real XHR/fetch consequence | Durable coverage must be revised after design/source rework |

- Overall post-repository confidence: `90.4%`
- Overall final confidence: `92.9%`
- Calculation method: Simple average `(86 + 99 + 98 + 98 + 97 + 88 + 84) / 7 = 92.9%`.
- Confidence change produced by broader validation: `+2.5 percentage points and, critically, direct discovery of an AC-008 failure that repository coverage could not reveal.`
- Every critical acceptance criterion directly proven: `No — AC-008 was directly observed failing and therefore has no passing proof.`
- Any final applicable category below `90%`: `Yes — requirement/acceptance proof, user-surface/browser/desktop-shell confidence, and durable regression coverage quality.`
- Default final confidence target of `95%` met: `No`
- Confidence-limiting residual risks: Required PDF/Excel routes fail; live Windows is unavailable; codec compatibility is bounded by the shipped Chromium runtime. The score does not override the critical AC-008 failure.

## Broader Validation Decision And Execution

- Decision and selected execution mode from the coverage investigation: `Required — Project Desktop Validation plus focused executable lifecycle/shared-viewer probes.`
- Material deviation from the planned mode or rationale: `None`. A bounded privilege differential was added only after the planned full journey exposed the failure.
- Confidence gap or residual risk actually addressed: Electron standard-scheme normalization, current URL identity, native playback and recovery, later ranges/cancellation, actual legacy POSIX renderer hydration, attachment lifecycle, and representative shared viewers.
- If `Not Required`: N/A.
- If `Blocked`: N/A.
- Startup order, commands, and readiness results: Preflight confirmed commit/runtime targets, user app PIDs, free port `43191`, and source hashes; `pnpm transpile-electron` passed; the temporary Nuxt evidence page was mounted; `pnpm dev --host 127.0.0.1 --port 43191` returned HTTP 200; `ELECTRON_RUN_AS_NODE` was removed and the installed Electron binary ran `round-3-electron-probe.cjs` with isolated HOME/userData; focused migration and privilege differentials followed; cleanup verified processes, port, page, and fixtures absent.
- Environment choices that materially affected the run: Hidden 1000x800 sandboxed/context-isolated BrowserWindow; Electron default session; exact production scheme registration/handler; loopback Nuxt origin; isolated HOME/userData. A separate `file://` origin differential modeled packaged renderer origin without altering production code.
- Seed data, fixtures, identities, authentication, permissions, or session state: Exact read-only 13 MB and 607,568,129-byte videos; deterministic 10-byte significant path, missing/directory/unreadable/malformed sources, 3-second audio, 8x6 PNG, PDF, XLSX, and text fixtures; no account, secret, backend write, or shared profile.

| Scenario / Journey Step | Expected Observable Result | Actual Observable Result | DOM / Log / API / Process Evidence | Result |
| --- | --- | --- | --- | --- |
| Fixed-authority significant full/range matrix | Stable authored/property/currentSrc/handler identity; exact `200/206`, MIME/length/range/no-store, and bytes | Canonical significant URL including `%5C` stayed exact; full `0123456789`, closed `2345`, open `6789`, suffix `789`, clamped `89` | Structured E2E-PROTO-001 records | Pass |
| HEAD, malformed/multipart/unsatisfiable, method, and invalid targets | HEAD no body; invalid ranges `416 bytes */10`; POST `405`; bad targets `404`; zero bytes | All expected status/headers and zero-byte bodies; malformed encoded URL threw before request | Main result/log | Pass |
| Exact legacy POSIX renderer hydration | Raw `local-file:///tmp/...` converges before hostile renderer normalization to current openable locator | Renderer URL parser still reports hostname `tmp`, but production hydration returns `local-file://local/tmp/...` and `external_url`/openable | Migration-resolution JSON/log and lifecycle record | Pass |
| Unsupported attachment lifecycle | Invalid locators quarantined/nonopenable/excluded; current and echo retain metadata; fresh reload excludes it | Canonical/Windows/legacy convergence, plan arrays, current/empty/mixed echo, history, fresh reload, and no unsupported request all match | E2E-SEC-001/E2E-UI-001 records | Pass |
| Missing/decode failure, Retry, URL recovery | Localized accessible alert; failed element removed; Retry creates fresh attempt/load; valid URL recovers | English fallback alert under locale `de`; fresh attempt identity; decode uses same generic UI; valid URL recovers | E2E-VID-001/UI records | Pass |
| Exact reported video | Duration about `330.533333s`; play advances, pause stable, seek to 120 and continue | Duration `330.533333`; playback advanced about `1.150s`; pause stable; continued near `120.9s` after seek | Main result/log | Pass |
| Large video and stream lifecycle | Far seek produces later nonzero ranges and continued playback; cancellation/source release closes handles | Duration `2063.066667`; continued near `1800.901s`; later ranges begin `525303808-`; explicit abort after 65,536 bytes; FD `1 -> 0` in about `175ms`; final media release FD zero | E2E-VID-002, request trace, `lsof` evidence | Pass |
| Message DOM and removal | Valid thumbnail is interactive; unsupported metadata is noninteractive and removable by identity | Canonical thumbnail loaded; unsupported label was `SPAN`, not inside button; removal left two valid attachments | E2E-UI-001 record | Pass |
| Representative image/audio/text | Canonical image/audio work; text remains existing non-protocol path | Image `8x6`; audio duration `3s` and advanced `0.353s`; text `Probe text OK Second line.`, zero protocol requests | E2E-REG-001 record | Pass subpaths |
| Representative PDF/Excel | PDF viewer loads through XHR; Excel loads through fetch; both reach handler and render | PDF alert: `Unexpected server response (0)`; Excel: `Failed to fetch`; neither request reached `protocol.handle` under reviewed privileges | E2E-REG-001 record and renderer console | Fail |
| Privilege differential, HTTP and packaged/file origins | Isolate whether failure is fixture/origin or scheme capability | `supportFetchAPI` only: all fail/no handler. `corsEnabled` only: PDF XHR 200, fetches fail. Both: PDF fetch/XHR and Excel fetch 200/exact bytes. File-origin base fails; file-origin both passes | Five JSON/log differential pairs | Confirms Design Impact signal |

## Desktop Application Validation (When Applicable)

- Validation approach executed and any deviation from the investigation: An isolated Electron 42.4.1 process imported the exact transpiled production modules and loaded a temporary Nuxt page composed of the real `VideoPlayer`, `FileViewer`, `UserMessage`, and attachment owners. No deviation.
- Browser-tested web-equivalent behavior and evidence: Semantic alerts/buttons/media state, attachment DOM, image/audio/PDF/Excel/text viewer output, and lifecycle projections ran inside the Electron renderer. Standalone browser evidence was not substituted for `local-file` behavior.
- Shell-specific or lifecycle behavior and evidence: Pre-ready scheme privileges, post-ready handler installation, authored/resolved/handler URL witnesses, Chromium Range churn, explicit cancellation, FD closure, renderer standard-scheme parsing, and request non-arrival for PDF/Excel were directly observed.
- Effect on any already-running desktop application: `None` — user-owned AutoByteus PIDs `3405` and `4013` were discovered, never stopped/reused, and remained running after cleanup.
- Behavior not directly proven and confidence consequence: Live Windows remains unavailable on this macOS host; deterministic cross-platform codec/migration coverage exists, but platform-complete confidence is not claimed. A full packaged build was not launched; file-origin execution proved the viewer failure is not specific to Nuxt's HTTP origin.

## Platform / Runtime Targets

- Operating system / platform: macOS `26.5.2`, Darwin arm64.
- Runtime and relevant framework versions: Electron `42.4.1`; embedded Node `24.16.0`; Nuxt `3.21.1`; Vue `3.5.28`.
- Browser / engine and version, when applicable: Chromium `148.0.7778.265` inside Electron.
- Device, viewport, locale, timezone, or accessibility settings, when applicable: Hidden 1000x800 BrowserWindow; locale `de` exercising English fallback; Europe/Berlin host timezone; semantic `role="alert"` and Retry inspection.

## Lifecycle / Upgrade / Restart / Persisted-Data Checks

- Approved persisted-data decision: `Migration Required`
- Representative existing data exercised: Current canonical, exact legacy POSIX, legacy Windows, credentials/port/query/fragment/wrong/opaque/malformed local locators, non-local URL, historical unsupported metadata, current/empty/mixed live echo, and fresh executable-only hydration.
- Direct-use, discard/rebuild, or migration result and evidence: `Pass` — canonical is idempotent; exact legacy POSIX/Windows converge; unsupported values remain nonopenable and excluded from executable arrays while retained in permitted current/echo/history surfaces; fresh reload omits newly unsupported metadata.
- Migration completion/recovery evidence, only when `Migration Required`: Round-2 failure is resolved in actual Electron. `round-3-migration-resolution-result.json` records renderer-hostile URL parsing and successful production hydration to the canonical openable locator.
- Version-specific runtime branch, dual read/write, or compatibility fallback observed: `No`
- Residual untested persisted-data risk: Actual Windows execution remains residual; no current macOS migration defect remains.

## Tests Implemented Or Updated

None by API/E2E in round 3.

## Tests Removed As Stale Or Obsolete

None.

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `No`
- Paths added or updated: None.
- Paths removed: None.
- Added or updated paths attached for proportional test-code review: `Not Applicable`
- Diff or repository evidence supplied for removed paths: N/A.

## Other Execution Artifacts

| Artifact Path | Type / Purpose | Retained Or Temporary | Notes |
| --- | --- | --- | --- |
| `api-e2e-evidence/round-3-electron-result.json` | Authoritative six-scenario structured result | Retained temporary evidence | Overall Fail; five Pass, E2E-REG-001 Fail |
| `api-e2e-evidence/round-3-electron-probe.log` | Exact Electron execution log | Retained temporary evidence | Runtime, requests, scenario outcomes, failure |
| `api-e2e-evidence/round-3-migration-resolution-result.json` and `.log` | Focused CR-004 resolution witness | Retained temporary evidence | Actual renderer parsing and successful production hydration |
| `api-e2e-evidence/round-3-fetch-privilege-{fetch-only,cors-only,both}.{json,log}` | HTTP-origin capability differential | Retained temporary evidence | Isolates separate XHR/fetch requirements |
| `api-e2e-evidence/round-3-file-origin-{base,both}.{json,log}` | Packaged/file-origin differential | Retained temporary evidence | Base fails before handler; both flags pass exact bytes |
| `api-e2e-evidence/round-3-repository-focused-nuxt.log` | Focused changed-scope Nuxt evidence | Retained | 16 files / 96 tests passed |
| `api-e2e-evidence/round-3-repository-focused-electron.log` | Focused protocol/validator evidence | Retained | 3 files / 15 tests passed |
| `api-e2e-evidence/round-3-repository-full-electron.log` | Full Electron regression | Retained | 26 files / 112 tests passed; one opt-in skip |
| `api-e2e-evidence/round-3-repository-full-nuxt.log` and `round-3-repository-failure-recheck.log` | Broad Nuxt and baseline isolation | Retained | Changed scope passed; same four unrelated failures reproduced |
| `api-e2e-evidence/round-3-transpile-guards-searches.log` | Transpile/guard/clean-cut evidence | Retained | All required commands/searches passed |
| `api-e2e-evidence/round-3-cleanup.log` | Cleanup and source integrity | Retained | Processes/port/pages/fixture roots absent; sources unchanged |

All paths above are relative to `/Users/normy/autobyteus_org/autobyteus-worktrees/local-video-preview-playback/tickets/in-progress/local-video-preview-playback/`.

## Temporary Execution Methods / Scaffolding

| Path / Method | Why Needed | Result / Evidence | Cleanup Result |
| --- | --- | --- | --- |
| `api-e2e-evidence/round-3-electron-probe.cjs` | Drive all six scenarios through exact production owners and real components | Five Pass; preserved PDF/Excel failure captured | Retained as evidence; process/profile exited/removed |
| `api-e2e-evidence/round-3-migration-resolution-probe.cjs` | Recheck the precise round-2 hostile renderer parse | Resolved CR-004 in actual Electron | Process exited; fixture root later removed |
| `api-e2e-evidence/round-3-fetch-privilege-differential.cjs` | Isolate scheme flags and page-origin effects without product edits | Demonstrated both `supportFetchAPI` and `corsEnabled` are necessary in tested consumers | Processes exited; both fixture roots removed |
| `api-e2e-evidence/round-3-temporary-nuxt-probe-page.vue` | Preserve removed real-component route as reviewable evidence | Mounted production viewers/owners | Source page removed; evidence copy retained |
| Nuxt dev server on `127.0.0.1:43191` | Serve production renderer components | Ready HTTP 200 and exact Electron page load | Owned process stopped; port absent |
| Isolated `/tmp` roots | Hold fixtures, HOME, userData, and file-origin page | Prevented user-state collision | Removed; absence recorded |

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| AutoByteus backend/account | Omitted; temporary route exercised real local viewer and attachment owners | No backend source/transport changed; exact projection arrays prove executable filtering | None for the observed scheme/viewer failure; no end-to-end backend persistence claim |
| Packaged application profile | Exact pinned Electron plus isolated default session; separate `file://` page differential | Avoided disturbing the user's running app while reproducing the packaged-origin boundary | Full packaging/bundle smoke remains residual |
| Windows host | Deterministic repository codec/migration coverage only | Assigned environment is macOS | Live Windows residual remains explicit |

## Prior Failure Resolution Check (Mandatory On Round >1)

| Prior Round | Scenario / Failure Reference | Previous Classification | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| 1 | E2E-PROTO-001: old empty-authority POSIX current URL became hostname-bearing and returned `404` | Design Impact | Resolved | Round-3 authored/property/currentSrc/handler fixed-authority identity and full request matrix pass | Reconfirmed after current implementation |
| 1 | E2E-VID-001/002: exact and large videos could not complete required playback/seek | Design Impact / Not Tested | Resolved | Exact duration/play/pause/seek and large later-range/cancel/FD-release pass | Reconfirmed round 3 |
| 2 | E2E-SEC-001/E2E-UI-001: exact legacy POSIX renderer hydration became unsupported | Local Fix, implementation-owned | Resolved | Migration-resolution JSON plus current lifecycle/UI records | Raw recognition now precedes ambient URL construction |
| 2 | E2E-REG-001: live representative viewers stopped before execution | Not Tested | Executed; new failure | Image/audio/text/thumbnails pass; PDF/Excel fail before handler | This is the only current failing scenario |

## Result Summary

| Result | Scenario IDs | Summary / Reason |
| --- | --- | --- |
| Pass | E2E-PROTO-001, E2E-SEC-001, E2E-VID-001, E2E-VID-002, E2E-UI-001 | Protocol/security/migration, exact and large video, recovery UI, lifecycle, DOM/removal, and cleanup meet their required outcomes in Electron 42.4.1. |
| Fail | E2E-REG-001 | Required image/audio/text/thumbnails pass, but preserved PDF XHR and Excel fetch fail before the production handler under reviewed privileges, so AC-008 fails. |
| Out Of Scope | Full-Nuxt four-test baseline failures | The same unrelated workspace-history, MemoryHome, CodexFullAccessCard, and zhCnGlossaryConsistency failures reproduce alone; all changed-scope focused tests pass. |

## Cleanup Performed

| Resource / Process / Data | Ownership | Cleanup Action | Result |
| --- | --- | --- | --- |
| Electron probe processes/windows/profiles | API/E2E-owned | Closed/exited and isolated HOME/userData removed | Complete; processes absent |
| Nuxt port/process `43191` | API/E2E-owned | Terminated only owned process and checked listener | Complete; listener absent |
| Temporary Nuxt source page | API/E2E-owned | Removed from `autobyteus-web/pages`; retained evidence copy only | Complete |
| Temporary main/file-origin fixture roots | API/E2E-owned | Restored unreadable permissions and removed trees | Complete; roots absent |
| Exact source videos | User-owned read-only | Verified SHA-256 after run | Unchanged: `613f4d1d...b76938c`, `5051a147...f549b3` |
| Running AutoByteus app PIDs `3405`, `4013` | User-owned | Never stopped, reused, or modified | Still running after cleanup |

## Classification

- Preliminary classification: `Design Impact`.
- Basis: The implementation and its exact lifecycle test match the reviewed instruction in `design-spec.md` line 638 to use only `{ standard: true, stream: true }` and not add `corsEnabled` or `supportFetchAPI` without new evidence. FR-006/AC-008 simultaneously require preserved PDF and Excel viewers. Real Electron 42.4.1 now supplies the missing evidence: PDF.js XHR reports status `0` and Excel fetch reports `Failed to fetch`, with no handler invocation under the reviewed privileges. HTTP-origin and `file://`-origin differentials show the failure persists outside the Nuxt-origin setup; in the tested runtime, `supportFetchAPI` alone does not allow either consumer, `corsEnabled` alone allows PDF XHR but not fetch, and both together allow PDF XHR/fetch and Excel fetch with exact `200` bytes. Choosing the revised capability/security contract belongs to reviewed design; API/E2E did not alter source or durable tests.

## Recommended Recipient

`code_reviewer` — focused failure-origin analysis and authoritative owner/classification routing, not proportional successful-test review.

## Evidence / Notes

- Failing scenario: `E2E-REG-001`.
- Failing behavior/requirements/criterion: `BEH-004`, `FR-001`, `FR-006`, `AC-008`.
- Execution mode: exact Electron `42.4.1` / Chromium `148.0.7778.265`, production transpiled protocol and real viewers, isolated default session/HOME/userData, Nuxt loopback origin followed by a separate packaged/file-origin differential.
- Expected: representative PDF loads through its existing XHR path and Excel loads through its existing fetch path via the canonical `local-file://local/...` URL; requests reach the validated handler and render.
- Observed: PDF presents `Error loading PDF:Unexpected server response (0) ...`; Excel presents `Failed to fetch`; no corresponding production handler request occurs.
- Differential: reviewed base flags fail at both HTTP and `file://` origins. In tested Electron, both `supportFetchAPI` and `corsEnabled` permit PDF and Excel exact-byte `200` responses; this is evidence for design review, not an API/E2E source-change prescription.
- E2E-REG-001 passing subpaths: canonical image `8x6`, 3-second audio playback, embedded/external thumbnails, and text through the preserved non-protocol path.
- No product source or durable test was changed. Temporary probe/report evidence is the only API/E2E worktree addition.

## Latest Authoritative Result

- Result values: `Pass` / `Fail` / `Blocked`
- Result: `Fail`
- Final validation confidence: `92.9%`
- Default `95%` confidence target met: `No`
- Any final applicable confidence category below `90%`: `Yes — requirement/acceptance proof, user-surface/browser/desktop-shell confidence, and durable regression coverage quality.`
- Broader validation decision: `Required — executed through exact Project Desktop Validation plus executable lifecycle/shared-viewer probes; Fail.`
- Critical acceptance criteria lacking direct proof: `AC-008 lacks passing proof because it is directly observed failing for PDF and Excel.`
- Required next recipient: `code_reviewer` for focused failure-origin review.
- Notes: After reviewed design/source/test rework, rerun E2E-REG-001 first for both PDF XHR and Excel fetch, then all six scenarios for current sign-off. Live Windows remains residual unless a suitable environment is available; codec support remains bounded by shipped Chromium.
