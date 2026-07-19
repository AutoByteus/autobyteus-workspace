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
- Current Execution Round: `2`
- Trigger: Implementation-source review round 5 passed for current implementation/test commit `02ca27faff5b0441488c2e1b1e65cd6cc2443c18`; API/E2E was asked for an independent coverage refresh and realistic execution. Worktree HEAD at execution was artifact commit `895e1e40b538d976a3c85abd54a08139a2195581`.
- Prior Round Reviewed: `Yes — round 1 reports and failure evidence were treated as historical baseline, not current sign-off.`
- Latest Authoritative Round: `2`

## Round History

| Round | Trigger | Prior Unresolved Failures Rechecked | New Failures Found | Result | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Source review Pass at implementation `f60718a63d8551bb31bc26913a3154dc0614bc95` | N/A | Yes — old triple-slash current URL became hostname-bearing under Electron and valid POSIX files returned `404` | Fail | No | Current fixed-authority design/rework was required. |
| 2 | Source review round 5 Pass at `02ca27faff5b0441488c2e1b1e65cd6cc2443c18` | Yes — E2E-PROTO-001 and E2E-VID-001 rechecked the exact current URL/handler/media boundary and now pass | Yes — valid legacy POSIX hydration fails only in an actual renderer after the scheme is registered standard | Fail | Yes | E2E-PROTO-001, E2E-VID-001, and E2E-VID-002 pass. E2E-SEC-001/E2E-UI-001 fail AC-010; E2E-REG-001 live phase was not reached. |

## Investigation And Execution Basis

- Coverage investigation artifact: `/Users/normy/autobyteus_org/autobyteus-worktrees/local-video-preview-playback/tickets/in-progress/local-video-preview-playback/api-e2e-coverage-investigation.md`
- Investigation completed before durable coverage changes or final execution: `Yes`
- Investigation plan followed: `Yes`. Focused repository checks ran before broader suites and exact-runtime execution. Attempts 1 and 2 revealed probe-only observation weaknesses around `reader.cancel()` and explicit media-source release; the harness was corrected to use `AbortController` and explicit source removal/DOM release. Attempt 3 is authoritative and exercised the intended production boundaries.
- Existing coverage decisions revised during execution, with evidence: `Yes`. `utils/contextFiles/__tests__/contextLocalFileLocatorMigration.spec.ts` remains requirement-relevant but is now `Needs Update`: its Node/Nuxt URL environment cannot model the URL parsing applied in a scheme-registered Electron renderer.
- Reroute required before or during execution: `Yes — after actual Electron execution found a critical AC-010 failure.`
- Notes: API/E2E changed no product source or durable test. The full Nuxt command's four failures are the same historical, unrelated baseline failures and reproduced alone; all focused changed-scope checks passed.

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No — the approved legacy-locator transformation is an isolated required persisted-data migration, not an ongoing request-time compatibility path.`
- Compatibility-only or legacy-retention behavior observed in implementation: `No`
- Approved persisted-data transition followed without unnecessary migration or version-specific runtime fallback: `No (reroute required) — current canonical and Windows-legacy cases behave correctly, but valid legacy POSIX convergence fails in the actual scheme-registered renderer.`
- Durable coverage added or retained only for compatibility-only behavior: `No`
- If compatibility-related invalid scope was observed, reroute classification used: `N/A`; the observed problem is failure of an approved migration requirement, preliminarily a `Local Fix`.
- Upstream recipient notified: Pending this report's mandatory failure handoff to `code_reviewer` for focused failure-origin review.

## Changed Boundary And Evidence Matrix

| Scenario ID | Behavior / Requirement / Acceptance-Criteria IDs | Changed Boundary | Execution Surface / Mode | Evidence Type | Result | Evidence / Artifact |
| --- | --- | --- | --- | --- | --- | --- |
| E2E-PROTO-001 | Full/range/HEAD/method/status/bytes; FR-001–002, FR-005, FR-007 / AC-003, AC-006–007, AC-009 | Fixed-authority renderer/request -> exact protocol lifecycle/validator/response/stream | Electron 42.4.1 `net.fetch` and actual media requests against transpiled production modules | Desktop / Temporary | Pass | `api-e2e-evidence/round-2-electron-result.json`, `round-2-electron-probe.log` |
| E2E-SEC-001 | Trusted-path rejection, deterministic no-byte failures, raw invalid quarantine, valid migration; FR-005, FR-007 / AC-007, AC-010 | Raw attachment hydration plus normalized handler enforcement | Exact Electron renderer and protocol matrix | Desktop / Temporary | Fail | Protocol/no-byte and invalid-quarantine subpaths passed, but valid legacy POSIX hydration failed; `round-2-migration-failure-result.json` and full result |
| E2E-VID-001 | Exact reported video metadata/play/pause/seek/recovery; FR-001–004, FR-007 / AC-001–005, AC-009 | Current URL -> real `VideoPlayer` -> Chromium media -> handler | Real Nuxt component in hidden Electron renderer | Desktop / Temporary | Pass | `round-2-electron-result.json`: duration `330.533333`, play/pause, seek `120`, continued playback, failure/Retry/URL recovery |
| E2E-VID-002 | Large seek/later Range/continued playback/cancellation; FR-002–003 / AC-003, AC-009 | Chromium range/cancel -> bounded stream/file handle | Electron renderer plus explicit `net.fetch` abort and process FD witness | Desktop / Temporary | Pass | `round-2-electron-result.json`: duration `2063.066667`, seek `1800`, later ranges, explicit abort, FD release |
| E2E-UI-001 | Native/resource error, localized accessible Retry/recovery; migration/quarantine/current/echo/fresh lifecycle; FR-004–005, FR-007 / AC-004–005, AC-010 | Real component DOM plus attachment hydration/model/submission/projection | Hidden Electron renderer with real Nuxt owners | Desktop / Temporary | Fail | Error/Retry/URL recovery and most lifecycle subpaths passed; valid legacy POSIX conversion failed before message-DOM completion; focused migration evidence |
| E2E-REG-001 | Representative audio/image/PDF/Excel/text, thumbnail, external locator; FR-006–007 / AC-008 | Shared viewer/preserved routes | Focused repository suites plus planned real FileViewer renderer phase | Durable / Desktop | Not Tested | Focused repository scope passed; live representative viewer phase did not run after the critical migration assertion stopped the probe |

## Additional Repository Coverage Execution

No repository command was added after the investigation's recorded post-repository confidence decision. The canonical investigation contains the exact command order and logs:

- Focused Nuxt: 16 files / 95 tests passed.
- Focused Electron: 3 files / 15 tests passed.
- Transpilation, boundary/localization guards/audit, clean-cut searches, and diff check passed.
- Full Electron: 26 files / 112 tests passed; one opt-in real-release test skipped.
- Full Nuxt: 371 files / 2020 tests passed, four historical unrelated failures, one skip; focused recheck reproduced exactly those four failures (11 pass / 4 fail).

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | Change | New / Final Supporting Evidence | Residual Uncertainty |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 88% | 75% | -13 | Current protocol/video/large-stream and recovery criteria were proven directly; actual AC-010 behavior was attempted and failed | AC-010 is contradicted; live AC-008 representative shared-viewer phase is incomplete |
| Changed-boundary execution directness | 90% | 98% | +8 | Exact transpiled lifecycle/response plus actual Nuxt migration/model/component owners ran under Electron 42.4.1 | No live Windows execution |
| Cross-boundary integration realism and mock gap | 85% | 96% | +11 | Authored/property/currentSrc/handler URLs, Chromium media ranges, DOM state, hydration, and file handles were observed across the real boundary | Packaged binary was not required or run; backend-independent viewer phase remained incomplete |
| Environment, configuration, identity, and fixture fidelity | 92% | 96% | +4 | Electron `42.4.1`, Chromium `148.0.7778.265`, Node `24.16.0`, macOS arm64, isolated profile, exact SHA-known videos, deterministic files | Live Windows unavailable; codecs remain bounded by shipped Chromium |
| Failure, edge-case, lifecycle, and recovery evidence | 90% | 92% | +2 | Full request failure matrix, Retry fresh attempt, URL recovery, later ranges, explicit abort, media release, quarantine/echo/fresh state were observed | Migration failure prevents successful persisted-transition completion |
| User-surface, browser, and desktop-shell confidence | 82% | 85% | +3 | Real VideoPlayer alert/Retry/recovery and media behavior ran in Electron | Attachment message DOM and representative shared FileViewer routes were not reached; no live Windows |
| Durable regression coverage quality and relevance | 97% | 80% | -17 | Broad focused coverage is coherent, but the passing migration test missed the scheme-registered renderer parsing behavior that failed in production-equivalent execution | Durable migration coverage needs update with the implementation fix |

- Overall post-repository confidence: `89.1%`
- Overall final confidence: `88.9%`
- Calculation method: Simple average of seven applicable final categories: `(75 + 98 + 96 + 96 + 92 + 85 + 80) / 7 = 88.9%`.
- Confidence change produced by broader validation: `-0.2 percentage points`. Runtime directness and fidelity increased substantially, but a critical requirement failure correctly reduced proof and durable-coverage scores.
- Every critical acceptance criterion directly proven: `No`
- Any final applicable category below `90%`: `Yes — requirement proof, user-surface/browser/desktop-shell confidence, and durable regression coverage quality.`
- Default final confidence target of `95%` met: `No`
- Confidence-limiting residual risks: actual AC-010 legacy POSIX convergence fails; E2E-REG-001 live regression journey is incomplete; live Windows is unavailable; codec support remains bounded by shipped Chromium. The score does not override the critical failure.

## Broader Validation Decision And Execution

- Decision and selected execution mode from the coverage investigation: `Required — Project Desktop Validation plus executable attachment lifecycle probe.`
- Material deviation from the planned mode or rationale: The exact mode ran. After E2E-PROTO-001/E2E-VID-001/E2E-VID-002 passed, the probe stopped at the first critical attachment-migration assertion; it did not fabricate a pass for message DOM or shared viewers. Attempts 1/2 were harness refinements only; attempt 3 is authoritative.
- Confidence gap or residual risk actually addressed: The run resolved the round-1 current URL premise, directly proved real media/range/cancellation behavior, and exposed that valid legacy POSIX migration depends incorrectly on the non-privileged Node/Nuxt `URL` interpretation.
- If `Not Required`, direct evidence that made broader validation unnecessary: N/A.
- If `Blocked`, exact unavailable dependency or access and attempted alternatives: N/A; this is a reproducible Fail, not Blocked.
- Startup order, commands, and readiness results: Preflight process/port/fixture checks; exact source hashes; `pnpm transpile-electron`; temporary Nuxt page; `pnpm dev --host 127.0.0.1 --port 43190`; HTTP readiness; `env -u ELECTRON_RUN_AS_NODE` exact Electron launch with isolated HOME/userData; authoritative probe; focused migration confirmation; cleanup. Exact command/runtime logs are retained.
- Environment choices that materially affected the run: Hidden sandboxed/context-isolated BrowserWindow, default Electron session with production scheme privileges/handler, isolated HOME/userData, owned port `43190`, no app backend or user profile.
- Seed data, fixtures, identities, authentication, permissions, or session state: Read-only exact 13 MB and 607,568,129-byte videos; deterministic significant-path 10-byte file, invalid sources, image/document fixtures, and attachment identities; no secrets/auth/backend writes.

| Scenario / Journey Step | Expected Observable Result | Actual Observable Result | DOM / Log / API / Process Evidence | Result |
| --- | --- | --- | --- | --- |
| Fixed-authority significant file full/range matrix | Current URL identity; exact `200`/`206`, MIME/length/range/no-store, exact bytes | Full `0123456789`; closed `2345`; open `6789`; suffix `789`; clamped `89`, with correct headers | Structured request entries and handler observations in `round-2-electron-result.json` | Pass |
| HEAD/malformed/multipart/unsatisfiable/method/invalid paths | HEAD no body; `416` + `bytes */10`; `405` + Allow; invalid `404`; no bytes | All expected statuses/headers and zero byte lengths; malformed URL threw before request | `round-2-electron-result.json`, scenario E2E-PROTO-001 | Pass |
| Renderer URL normalization witnesses | Canonical current URL remains exact; raw invalid shapes cannot bypass raw-ingress or handler gates | Canonical retained exact authored/property/currentSrc/handler identity; query/fragment/wrong/legacy handler shapes rejected. Chromium erased raw port/credentials before handler, confirming handler alone cannot enforce their raw-authored identity | Normalization matrix in full result | Pass with architecture note |
| Missing and decode failures, Retry, URL recovery | Accessible localized generic alert; failed element removed; Retry mounts fresh element/load; new valid URL recovers | English fallback alert and Retry observed under locale `de`; distinct attempt IDs after Retry; invalid decode gave same generic alert; exact reported video then recovered | Probe assertions before E2E-VID-001 record; `round-2-electron-probe.log` | Pass |
| Exact reported MP4 | Duration about `330.533333s`; play advances, pause stable, seek and continue; URL identity exact | Duration `330.533333`; `0 -> 1.162181`; pause stable at `1.162207`; seek `120`, continue `120.900975`; exact current handler URL | E2E-VID-001 in full result | Pass |
| Large MP4 later range and cleanup | Far seek uses nonzero later Range, continues, cancellation and source release close handles | Duration `2063.066667`; seek `1800`, continue `1800.901351`; later ranges from `525303808-` onward; abort after 65,536-byte first chunk; FD `1 -> 0` in `176ms`; media release FD zero | E2E-VID-002 in full result | Pass |
| Approved legacy POSIX hydration | `local-file:///tmp/.../probe%20image.png` migrates to `local-file://local/tmp/.../probe%20image.png`, remains openable | Node main parse preserves empty hostname, but scheme-registered renderer parse becomes hostname `tmp`/pathname without first segment; actual hydration returns non-openable `unsupported_local_file` | `round-2-migration-failure-result.json`, focused log | Fail |
| Remaining attachment lifecycle | Canonical idempotent; Windows legacy migrates; invalid quarantined/excluded; current/echo retention; historical readable; new invalid absent after fresh load | All returned structures match these expectations; embedded image also resolves canonical. Probe stopped before message-DOM assertions because legacy POSIX failed | Failure detail in full result | Pass subpaths; overall E2E-UI-001 Fail |
| Representative live audio/image/PDF/Excel/text | Shared/preserved routes remain functional | Not executed after critical migration assertion | Focused repository suites passed; no live result claimed | Not Tested |

## Desktop Application Validation (When Applicable)

- Validation approach executed and any deviation from the investigation: An isolated Electron 42.4.1 process imported the branch's exact transpiled protocol modules and loaded a temporary Nuxt route made from the real `VideoPlayer`, `FileViewer`, `UserMessage`, and attachment owners. It was the narrowest shell-specific validation that could exercise standard-scheme parsing and native media without repackaging or disturbing the user app.
- Browser-tested web-equivalent behavior and evidence: The real Nuxt components executed in Electron Chromium. Semantic alert/button/media element state, element attempt identities, current time, and URL properties were asserted. Standalone browser execution was intentionally not substituted for the Electron-owned `local-file` behavior.
- Shell-specific or lifecycle behavior and evidence: Pre-ready `{ standard: true, stream: true }` registration, post-ready handler installation, exact handler requests, Chromium Range churn, explicit cancellation, FD closure, and scheme-registered renderer URL parsing were directly observed.
- Effect on any already-running desktop application: `None`. `/Applications/AutoByteus.app` main PID `3405` was found before execution, was not stopped or reused, and remained running after cleanup.
- Behavior not directly proven and confidence consequence: Live Windows and live shared-viewer regressions remain incomplete; final result is Fail regardless of the 88.9% score.

## Platform / Runtime Targets

- Operating system / platform: macOS `26.5.2`, Darwin arm64.
- Runtime and relevant framework versions: Electron `42.4.1`; embedded Node `24.16.0`; repository Nuxt `3.21.1`; Vue `3.5.28`.
- Browser / engine and version, when applicable: Chromium `148.0.7778.265` inside Electron.
- Device, viewport, locale, timezone, or accessibility settings, when applicable: Hidden 1000x800 BrowserWindow; Electron locale `de`, exercising English fallback localization; host timezone Europe/Berlin; semantic `role="alert"` and Retry button inspection.

## Lifecycle / Upgrade / Restart / Persisted-Data Checks

- Approved persisted-data decision: `Migration Required`
- Representative existing data exercised: Canonical fixed-authority image; valid legacy POSIX and Windows locators; raw credentials/port/query/fragment/wrong/opaque/malformed local locators; historical unsupported row; non-local external URL; current/echo/fresh executable projections.
- Direct-use, discard/rebuild, or migration result and evidence: Canonical current identity was idempotent; Windows legacy converged; unsupported invalid metadata was non-openable and excluded from executable arrays while retained in current/empty/mixed echo; historical unsupported remained readable; new unsupported disappeared from fresh executable-only hydration. Valid legacy POSIX convergence failed.
- Migration completion/recovery evidence, only when `Migration Required`: `Fail`. Expected fixed-authority current locator; observed `unsupported_local_file`. `round-2-migration-failure-result.json` is the canonical focused witness.
- Version-specific runtime branch, dual read/write, or compatibility fallback observed: `No`
- Residual untested persisted-data risk: Actual Windows execution remains residual; more importantly, actual macOS renderer migration is currently failing and requires rework before any Pass.

## Tests Implemented Or Updated

None by API/E2E in round 2.

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
| `/Users/normy/autobyteus_org/autobyteus-worktrees/local-video-preview-playback/tickets/in-progress/local-video-preview-playback/api-e2e-evidence/round-2-electron-result.json` | Authoritative structured exact-runtime result | Retained | Full request/media/normalization/lifecycle/failure detail; overall Fail |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/local-video-preview-playback/tickets/in-progress/local-video-preview-playback/api-e2e-evidence/round-2-electron-probe.log` | Authoritative Electron execution log | Retained | Electron versions, all scenario records, protocol traffic, failure |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/local-video-preview-playback/tickets/in-progress/local-video-preview-playback/api-e2e-evidence/round-2-migration-failure-result.json` | Focused canonical failure witness | Retained | Expected/actual hydration plus Node-main versus Electron-renderer URL parse |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/local-video-preview-playback/tickets/in-progress/local-video-preview-playback/api-e2e-evidence/round-2-migration-failure-probe.log` | Focused migration execution log | Retained | Exact Electron 42.4.1 reproduction |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/local-video-preview-playback/tickets/in-progress/local-video-preview-playback/api-e2e-evidence/round-2-electron-probe-attempt-1.log` | Harness refinement history | Retained | `reader.cancel()` did not give immediate bridge closure; not authoritative |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/local-video-preview-playback/tickets/in-progress/local-video-preview-playback/api-e2e-evidence/round-2-electron-probe-attempt-2.log` | Harness refinement history | Retained | Added explicit media release requirement; not authoritative |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/local-video-preview-playback/tickets/in-progress/local-video-preview-playback/api-e2e-evidence/round-2-repository-focused-nuxt.log` | Focused renderer coverage | Retained | 16 files / 95 tests passed |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/local-video-preview-playback/tickets/in-progress/local-video-preview-playback/api-e2e-evidence/round-2-repository-focused-electron.log` | Focused protocol coverage | Retained | 3 files / 15 tests passed |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/local-video-preview-playback/tickets/in-progress/local-video-preview-playback/api-e2e-evidence/round-2-repository-full-electron.log` | Full Electron regression | Retained | 26 files / 112 tests passed; one opt-in skip |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/local-video-preview-playback/tickets/in-progress/local-video-preview-playback/api-e2e-evidence/round-2-repository-full-nuxt.log` | Full Nuxt regression | Retained | Changed scope passed; 4 historical unrelated failures |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/local-video-preview-playback/tickets/in-progress/local-video-preview-playback/api-e2e-evidence/round-2-repository-failure-recheck.log` | Baseline failure isolation | Retained | Same four failures reproduced alone |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/local-video-preview-playback/tickets/in-progress/local-video-preview-playback/api-e2e-evidence/round-2-cleanup.log` | Cleanup/source integrity | Retained | Processes/port/temp root absent; videos unchanged; user app untouched |

## Temporary Execution Methods / Scaffolding

| Path / Method | Why Needed | Result / Evidence | Cleanup Result |
| --- | --- | --- | --- |
| `api-e2e-evidence/round-2-electron-probe.cjs` | Reproducibly drive exact production owners and real components under Electron | Authoritative attempt 3 passed protocol/media/stream and exposed migration failure | Retained as evidence only; process/profile exited/removed |
| `api-e2e-evidence/round-2-migration-failure-probe.cjs` | Isolate Node-main versus scheme-registered renderer parsing and actual hydration | Reproduced the exact AC-010 failure | Retained as evidence only; isolated process exited |
| `api-e2e-evidence/round-2-temporary-nuxt-probe-page.vue` | Retain the removed temporary route as reviewable probe evidence | Mounted production components/owners; not durable product code | Source route removed; evidence copy retained |
| Nuxt dev server on `127.0.0.1:43190` | Serve the real renderer component surface | HTTP 200 and Electron page readiness | Owned process stopped; listener absent |
| `/tmp/autobyteus-local-preview-round2.mN3euH` | Isolated fixtures, HOME, userData | Prevented collision and held deterministic files | Permissions restored; entire root removed |

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| AutoByteus backend/account | Omitted; temporary route exercised viewer and attachment owners locally | No backend source/transport is required for the changed protocol/media/hydration boundaries; executable projection arrays directly prove exclusion | Live shared-viewer phase remains incomplete, but omission did not cause the migration failure |
| Packaged AutoByteus shell/profile | Exact pinned Electron dependency with isolated profile and exact transpiled modules | Avoided disrupting the running user application; packaging does not change the registered scheme or renderer parser being proven | Packaging-specific smoke remains residual, not the failure origin |
| Windows host | Deterministic Windows codec/migration repository coverage only | Assigned environment is macOS | Live Windows remains a truthful platform residual |

## Prior Failure Resolution Check (Mandatory On Round >1)

| Prior Round | Scenario / Failure Reference | Previous Classification | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| 1 | E2E-PROTO-001: old triple-slash current POSIX URL became hostname-bearing and returned `404` | Design Impact | Resolved | Round-2 canonical significant URL is identical at authored/property/currentSrc/handler and full/range matrix passes | Fixed-authority current URL is proven in Electron 42.4.1 |
| 1 | E2E-VID-001: exact video could not load through old URL | Design Impact | Resolved | Duration `330.533333`, play/pause/seek/continued playback all pass | Failure/Retry and URL recovery also pass |
| 1 | E2E-VID-002: not reached | Not Tested | Resolved | Large seek/later ranges/cancellation/FD release pass | Actual Chromium range churn observed |
| 1 | E2E-REG-001: not reached | Not Tested | Still unresolved | Focused repository owners pass, but round-2 live phase stopped at new critical migration failure | Preserve scenario ID for rerun |

## Result Summary

| Result | Scenario IDs | Summary / Reason |
| --- | --- | --- |
| Pass | E2E-PROTO-001, E2E-VID-001, E2E-VID-002 | Current fixed-authority request/byte contract, exact video playback/recovery, and large seek/range/cancel/cleanup passed in Electron 42.4.1. |
| Fail | E2E-SEC-001, E2E-UI-001 | Their AC-010 scope requires valid legacy POSIX convergence; actual scheme-registered renderer hydration returns `unsupported_local_file`. Protocol invalid/no-byte and most UI/lifecycle subpaths passed but cannot override the critical failure. |
| Not Tested | E2E-REG-001 | Focused durable coverage passed; the live representative viewer phase was not reached after the critical migration assertion. |
| Out Of Scope | Full-Nuxt four-test baseline failures | Same unrelated workspace-history, MemoryHome, CodexFullAccessCard, and zhCnGlossaryConsistency failures reproduced independently. |

## Cleanup Performed

| Resource / Process / Data | Ownership | Cleanup Action | Result |
| --- | --- | --- | --- |
| Electron probe processes/windows/profiles | API/E2E-owned | Closed/exited; isolated HOME/userData removed | Complete; probe processes absent |
| Nuxt port/process `43190` | API/E2E-owned | Terminated only the owned process; checked listener | Complete; listener absent |
| Temporary Nuxt source page | API/E2E-owned | Removed from `autobyteus-web/pages`; retained evidence copy only | Complete |
| Temporary fixture root | API/E2E-owned | Restored unreadable fixture permissions and removed tree | Complete; root absent |
| Exact source videos | User-owned read-only | Verified post-run SHA-256 | Unchanged: `613f4d...b76938c`, `5051a1...f549b3` |
| Running `/Applications/AutoByteus.app` PID `3405` | User-owned | Not stopped, reused, or modified | Still running after cleanup |

## Classification

- Preliminary classification: `Local Fix`, likely implementation-owned.
- Basis: `contextLocalFileLocatorMigration.ts` calls `new URL(locator)` before recognizing the approved raw legacy POSIX syntax. After `{ standard: true }` registration, Electron's renderer URL parser converts `local-file:///tmp/...` to hostname `tmp` and drops `/tmp` from `pathname` before the migration logic can recognize it. The reviewed design already requires raw-locator transition before normalization, so the behavior can likely be corrected at the isolated raw migration boundary without adding protocol compatibility or changing the current wire contract. Final owner classification belongs to `code_reviewer`'s focused failure-origin review.

## Recommended Recipient

`code_reviewer` — focused failure-origin analysis and owner classification, not proportional successful-test review.

## Evidence / Notes

- Failing scenarios: E2E-SEC-001 and E2E-UI-001.
- Failing requirements/criteria: FR-005, FR-007, AC-010.
- Exact input: `local-file:///tmp/autobyteus-local-preview-round2.mN3euH/probe%20image.png`.
- Expected: current openable `external_url` locator `local-file://local/tmp/autobyteus-local-preview-round2.mN3euH/probe%20image.png`.
- Observed Node-main parse: empty hostname and pathname `/tmp/autobyteus-local-preview-round2.mN3euH/probe%20image.png`.
- Observed registered Electron-renderer parse: href `local-file://tmp/autobyteus-local-preview-round2.mN3euH/probe%20image.png`, hostname `tmp`, pathname `/autobyteus-local-preview-round2.mN3euH/probe%20image.png`.
- Observed production hydration: non-openable `unsupported_local_file`, unchanged legacy locator, `previewUrl: null`.
- Canonical control remained a valid openable `external_url`.
- Although the full result records a preliminary protocol-only E2E-SEC-001 Pass before the later attachment phase, the canonical scenario result in this report is Fail because AC-010 migration is part of that scenario's required scope. The focused failure result and global `result: Fail` are authoritative.
- Expected `net::ERR_ABORTED` entries reflect media seek/cancellation churn; explicit FD evidence confirms release.
- API/E2E made no durable test changes, so proportional successful test-code review is not applicable.

## Latest Authoritative Result

- Result values: `Pass` / `Fail` / `Blocked`
- Result: `Fail`
- Final validation confidence: `88.9%`
- Default `95%` confidence target met: `No`
- Any final applicable confidence category below `90%`: `Yes — requirement proof, user-surface/browser/desktop-shell confidence, and durable regression coverage quality.`
- Broader validation decision: `Required — executed via Project Desktop Validation and executable lifecycle probe; Fail.`
- Critical acceptance criteria lacking direct proof: `AC-010 fails directly; AC-008's representative live shared-viewer regression phase remains incomplete.`
- Required next recipient: `code_reviewer` for focused failure-origin review.
- Notes: After classified rework, recheck E2E-SEC-001/E2E-UI-001 AC-010 first, then E2E-REG-001, followed by the full six-scenario current sign-off. Live Windows remains residual unless a suitable environment is provided; codec support remains bounded by shipped Chromium.
