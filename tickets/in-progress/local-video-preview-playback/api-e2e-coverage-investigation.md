# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/local-video-preview-playback/tickets/in-progress/local-video-preview-playback/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/local-video-preview-playback/tickets/in-progress/local-video-preview-playback/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/local-video-preview-playback/tickets/in-progress/local-video-preview-playback/design-spec.md`
- Supplemental Task Artifacts: `/Users/normy/autobyteus_org/autobyteus-worktrees/local-video-preview-playback/tickets/in-progress/local-video-preview-playback/runtime-probe-evidence.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/local-video-preview-playback/tickets/in-progress/local-video-preview-playback/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/local-video-preview-playback/tickets/in-progress/local-video-preview-playback/implementation-handoff.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/local-video-preview-playback/tickets/in-progress/local-video-preview-playback/code-review-report.md`
- Current Investigation Round: `1`
- Trigger: Implementation-source review passed and requested independent API/E2E investigation and realistic Electron execution.
- Prior Investigation Reviewed: `N/A`
- Latest Authoritative Investigation: `Round 1`

## Current Requirement And Design Basis

The approved package requires the one trusted Electron `local-file` capability to register before ready with exactly standard/stream privileges, install after ready, validate every decoded absolute path, and serve MIME-correct full or single-range bytes through a cancellation-safe bounded stream. The exact reported H.264 MP4 must load approximately `330.533333s` metadata, play, pause, seek, and continue playing under Electron 42.4.1 or the packaged runtime. Native/resource failures must replace the failed video with localized accessible generic feedback and a fresh Retry attempt; a URL change must clear stale failure. Invalid methods, URLs, paths, file types, and ranges must return deterministic no-byte failures. Audio and the preserved image/PDF/Excel/text routes must not regress. Source bytes and persisted data are not affected.

The implementation and code-review handoffs explicitly leave AC-001 through AC-009, realistic later-range/cancellation evidence, shared-consumer execution, and platform residual classification to this stage. Live Windows is unavailable on the assigned macOS host; shipped Chromium codec support is intentionally not expanded.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type (`Added`/`Changed`/`Removed`/`Preserved`/`Unclear`) | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 / Electron video loading and playback | Changed | FR-001–003; AC-001–003, AC-009; DS-001 | Execute the actual Electron 42.4.1 custom scheme with the reported video and observe metadata, play, pause, seek, and resumed time advancement. |
| BEH-002 / Video failure and recovery UI | Added | FR-004; AC-004–005; DS-002 | Retain focused component assertions and exercise a native Electron media failure against the real `VideoPlayer` render, accessible alert, Retry identity, and URL recovery. |
| BEH-003 / trusted request-to-byte response | Changed | FR-001–002, FR-005, FR-007; AC-006–007; DS-003–004 | Run focused contract suites, then issue real Electron custom-protocol GET/HEAD/range/invalid requests and inspect statuses, headers, exact bytes, request ranges, and cancellation/closure behavior. |
| Obsolete inline `net.fetch(file:)` path | Removed | Design and implementation handoff clean-cut removal checks | Search for duplicate/legacy paths; do not add compatibility coverage. |
| BEH-004 / shared viewers and routes | Preserved (audio benefits from changed scheme) | FR-006; AC-008; DS-005 | Exercise local audio and representative image/PDF/Excel bytes in Electron; rerun File Viewer/Excel/routing tests including the unchanged local text IPC decision. |
| User-owned source files | Preserved | Persisted-data decision `Not Affected` | Read only; hash the reported fixture before/after; no migration or mutation scenario applies. |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? (`Yes`/`No`) | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | No | None | N/A | None | None |
| API / transport / contract | Yes | Electron protocol `Request -> Response` and byte-range contract | Focused response-policy tests | Chromium's real custom-protocol request sequence and cancellation | Project Desktop Validation |
| Frontend component / state | Yes | `VideoPlayer` native/resource failure and attempt state | Vue component tests | Actual Electron native media error event and rerender | Project Desktop Validation with temporary Nuxt page using the real component |
| Browser integration / user journey | No as an independent target | Browser mode cannot own `local-file`; renderer behavior is Electron-bound | Component tests | Browser-only testing would bypass the material shell boundary | None; Electron renderer instead |
| Authentication / session / permissions | Preserved | Trusted local capability gate and main-process validator | Routing and validator tests | Live filesystem rejection through custom protocol | Electron probe |
| Desktop renderer / web-equivalent UI | Yes | Native video/audio/image behavior and alert/retry UI | Component/unit tests | Real Chromium media pipeline and DOM state | Project Desktop Validation |
| Desktop shell / Electron-specific integration | Yes | Pre-ready privilege registration, post-ready handler, default-session protocol | Lifecycle tests and transpilation | Real Electron protocol/media element integration | Project Desktop Validation |
| Process / lifecycle | Yes | Registration ordering and stream completion/cancellation cleanup | Lifecycle and byte-stream tests | Chromium cancellation/seek against real file handles | Electron probe plus process/net evidence |
| Persisted-data transition | No | `Not Affected`; read-only source bytes | Source/contract evidence | Accidental fixture mutation | Before/after hash |
| Worker / queue / distributed coordination | No | None | N/A | None | None |
| External integration | No | No service needed for focused viewer/protocol validation | N/A | None | None |

## Project Execution Discovery

- Assigned task worktree / workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/local-video-preview-playback`
- Project type and runtime stack: pnpm workspace; Nuxt/Vue renderer; Electron desktop main process; Vitest Node and Nuxt suites; macOS arm64 host.
- Conflicting, missing, or unclear project instructions: Root declares pnpm 10.28.2 while `autobyteus-web` declares 10.28.1; installed CLI is 10.28.2 and existing handoff used it successfully. No repository-resident general Electron E2E runner exists. The shell exports `ELECTRON_RUN_AS_NODE=1`, so an unqualified `electron --version` reports the embedded Node version `24.16.0`; with that variable removed, the installed declared payload reports Electron `42.4.1` (Chromium 148). All desktop launches must use `env -u ELECTRON_RUN_AS_NODE`, and the running probe must capture `process.versions.electron`.
- Required environment variables or secrets available: `N/A`; the focused protocol/media/component journey needs no backend, account, or secret.

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/local-video-preview-playback/autobyteus-web/AGENTS.md` | Closest repository instructions | Use colocated tests; `pnpm test:nuxt ... --run`; Electron tests via `pnpm test:electron`; never stage all files. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/local-video-preview-playback/autobyteus-web/README.md` | Development, desktop build, and test authority | `pnpm dev` for renderer; `pnpm test`; `pnpm transpile-electron`; packaged macOS build path exists but is much broader than the focused custom-protocol boundary. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/local-video-preview-playback/autobyteus-web/package.json` | Executable scripts and runtime versions | Electron dependency is exactly `42.4.1`; focused `test:nuxt`, `test:electron`, guards, generation, transpilation, and build scripts are authoritative. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/local-video-preview-playback/autobyteus-web/electron/vitest.config.ts` | Electron test runner | Node environment rooted at `autobyteus-web/electron`; includes colocated JS/TS test/spec files. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/local-video-preview-playback/autobyteus-web/electron/tsconfig.json` | Executable main-process transpilation | CommonJS output in `autobyteus-web/dist`; production protocol modules can be exercised without modifying source. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/local-video-preview-playback/autobyteus-web/nuxt.config.ts` and `nuxt.electron.config.ts` | Renderer and Electron build setup | SPA renderer; Electron build entry is `electron/main.ts`; dev server can host a temporary page around the real component without starting the backend. |
| Upstream `runtime-probe-evidence.md` | Fixture/runtime evidence | Exact reported and 607 MB fixtures are available; isolated hidden Electron user-data directories avoid disturbing the user's running app. |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Dependencies | worktree root / `autobyteus-web` | Existing `pnpm install` state; launch with `env -u ELECTRON_RUN_AS_NODE` | Do not affect the separately packaged/running AutoByteus app | Runtime reports `process.versions.electron === 42.4.1` | Node modules remain ignored; no user app process touched |
| Repository suites | `autobyteus-web` | Focused Vitest commands, then full Electron/Nuxt suites and guards | No external services for selected suites | Exit 0 and expected suite counts | Test runners exit normally |
| Transpiled production protocol | `autobyteus-web` | `pnpm transpile-electron` | Produces ignored `dist` CommonJS from exact branch source | Command exit 0; target modules present | Retain ignored build output or remove probe-only files |
| Temporary Nuxt viewer surface | `autobyteus-web` | Create a scratch page, start `pnpm dev --port <owned-port>` | Backend proxy failures are irrelevant to isolated component; unique port avoids collisions | HTTP 200 for scratch route | Kill only owned dev-server process; remove scratch page |
| Isolated Electron probe | `autobyteus-web` | Launch declared Electron binary against temporary main script and unique user-data dir | Hidden window; imports exact transpiled production lifecycle/response modules; does not attach to running app | Probe emits structured runtime/scenario result and exits | Probe closes its window/app; remove temp main/user-data; retain logs |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Reported 330.533333s MP4 | Existing `/Users/normy/autobyteus_org/autobyteus-tutorial-videos/multi-nodes-part-2_youtube_smaller.mp4` | Read-only; known SHA-256 `613f4d...b76938c` | Retain; verify hash unchanged |
| Representative 607,568,129-byte MP4 | Existing `/Users/normy/autobyteus_org/autobyteus-tutorial-videos/autobyteus_software_engineering_team_combined_no_audio.mp4` | Read-only; used only for later-range/cancellation evidence | Retain; verify hash unchanged if consumed |
| Audio/image/PDF/Excel/text and invalid fixtures | Deterministically generate smallest valid WAV, PNG, PDF, XLSX/CSV/text plus missing/directory/malformed sources under probe-owned temporary root | No user data; names include spaces, Unicode, `%`, and `#` where relevant | Remove temporary fixture root after evidence capture |
| Identity/authentication | None | Trusted renderer capability is represented by the Electron shell plus independent main-process validation; no user account required | N/A |

## Persisted Data Transition Coverage Basis (When Applicable)

- Approved decision (`Not Affected`/`Directly Usable — No Migration`/`Discard or Rebuild`/`Migration Required`/`Undetermined`): `Not Affected`
- Design-spec and implementation-handoff references: Design `Persisted Data / State Transition Decision`; handoff `Persisted Data Transition Check`.
- Representative existing-data setup and required behavior: Open the reported and larger user-owned videos read-only and return bounded byte windows without modifying the source.
- Evidence planned for the approved direct-use, discard/rebuild, or migration outcome: SHA-256/stat before and after; implementation path opens with mode `r`; no writer/migration exists.
- Migration-specific completion/recovery scenarios, only when `Migration Required`: `N/A`
- Upstream ambiguity or reroute required: None.

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Acceptance Criteria / Design | Validity Decision (`Still Valid`/`Needs Update`/`Stale / Remove`/`Replace`/`Out Of Scope`/`Unclear`) | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `electron/local-file-protocol/__tests__/local-file-protocol.spec.ts` (3 scenarios) | Exact privileges; single handler delegation; deterministic unexpected-failure response | FR-001, FR-005, FR-007 / AC-007, AC-009 / DS-001, DS-003 | Still Valid | Matches approved lifecycle and clean-cut owner | Execute focused and full Electron suites |
| `electron/local-file-protocol/__tests__/local-file-response.spec.ts` response policy (7 scenarios) | Full bytes/MIME; closed/open/suffix/clamped ranges; GET/HEAD; malformed/multipart/unsatisfiable ranges; empty file; invalid method/URL/path; significant paths and Windows shape | FR-002, FR-005–007 / AC-006–008 / DS-003 | Needs Update after design correction | Direct `Request(local-file:///tmp/...)` preserves an empty hostname, but Electron's registered standard scheme delivers `local-file://tmp/...`; the real boundary is not represented | Preserve owner-level cases, then add the revised standard-scheme POSIX URL contract after upstream resolves the design impact |
| Same file, byte-stream ownership (3 scenarios) | Bounded reads and one close on completion, cancellation, error, early EOF | FR-002, FR-005 / AC-003, AC-006–007 / DS-004 | Still Valid | Direct unit proof of handle ownership | Execute; supplement with Chromium cancellation/later-range observation |
| `electron/__tests__/localFileValidation.spec.ts` | Requires readable regular absolute file | FR-005 / AC-007 | Still Valid | Existing authoritative validator remains design owner | Execute focused/full Electron suite |
| `components/fileExplorer/viewers/__tests__/VideoPlayer.spec.ts` (6 scenarios) | no-source, controls/no autoplay, generic accessible native/resource error, Retry, URL reset | FR-003–004 / AC-004–005 / DS-002 | Still Valid | Exact reviewed viewer state model | Execute focused/full Nuxt suite; supplement native Electron failure |
| `stores/__tests__/fileExplorerNodeRouting.spec.ts` | Embedded local media uses `local-file:///tmp/...`; remote media does not; local text uses `readLocalTextFile` | FR-005–006 / AC-007–008 / DS-005 | Unclear pending design revision | Runtime proves the exact asserted POSIX shape is reinterpreted by the approved standard scheme, while the broader capability/text-routing assertions remain valid | Do not edit until the URL-encoding/decoding contract is revised and reviewed |
| `components/fileExplorer/__tests__/FileViewer.spec.ts` | Viewer selection and preserved text/image routing | FR-006 / AC-008 | Still Valid | Shared viewer dispatch is unchanged | Execute focused/full Nuxt suite |
| `components/fileExplorer/viewers/__tests__/ExcelViewer.spec.ts` | URL fetch to byte array and content fallback | FR-006 / AC-008 | Still Valid | Preserved Excel loading contract | Execute focused/full Nuxt suite |
| `composables/__tests__/useAuthorizedObjectUrl.spec.ts` | Direct-source and credential/object-URL generation correctness | FR-004, FR-006 / AC-005, AC-008 | Still Valid | Shared source resolver remains unchanged and is used by media/document viewers | Execute in full Nuxt suite |
| Unrelated browser responsive probe and backend/server suites | Other application behavior | None | Out Of Scope | Changed boundary is Electron custom scheme/viewer, not workspace responsiveness or backend | Do not execute solely for this change |

## Stale Or Obsolete Coverage Decisions

None. No existing scenario asserts the removed `net.fetch(file:)` behavior or a legacy/compatibility path.

## Durable Coverage To Add

None were added before execution. Execution exposed a maintainable standard-scheme URL-boundary gap, but its corrected contract requires upstream design revision before durable tests can be changed. The rerun should add coverage that models Electron-delivered POSIX URL semantics without committing the external media fixtures or a parallel E2E framework.

## Durable Coverage To Update

Pending upstream design revision: the response-policy and File Explorer routing cases identified above must be revised or supplemented once the canonical POSIX URL contract is approved. No durable test was edited during this failed round.

## Durable Coverage To Remove

None.

## Repository Coverage Execution Plan And Results

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result (`Planned`/`Pass`/`Fail`/`Blocked`) | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| 1 | `pnpm test:electron --run electron/local-file-protocol/__tests__/local-file-protocol.spec.ts electron/local-file-protocol/__tests__/local-file-response.spec.ts electron/__tests__/localFileValidation.spec.ts` | `autobyteus-web` | Lifecycle, contract, invalid inputs, byte windows, cleanup, validator | Pass — 3 files / 14 tests | `api-e2e-evidence/repository-focused-electron.log` |
| 2 | `pnpm test:nuxt components/fileExplorer/viewers/__tests__/VideoPlayer.spec.ts components/fileExplorer/viewers/__tests__/ExcelViewer.spec.ts components/fileExplorer/__tests__/FileViewer.spec.ts stores/__tests__/fileExplorerNodeRouting.spec.ts --run` | `autobyteus-web` | Viewer error/retry and preserved routing/Excel/text behavior | Pass — 4 files / 20 tests | `api-e2e-evidence/repository-focused-nuxt.log` |
| 3 | `pnpm transpile-electron`; `pnpm guard:web-boundary`; `pnpm guard:localization-boundary`; `pnpm audit:localization-literals` | `autobyteus-web` | Executable main-process output and policy guards | Pass — all four commands | `api-e2e-evidence/transpile-and-guards.log` |
| 4 | `pnpm test:electron --run` | `autobyteus-web` | Broader Electron regression | Pass — 26 files / 111 tests; one intentionally skipped real-release test | `api-e2e-evidence/repository-full-electron.log` |
| 5 | `pnpm test:nuxt --run` | `autobyteus-web` | Broader renderer regression | Fail outside changed scope — 367 files / 2000 tests passed, 4 unrelated tests failed, one skipped | `api-e2e-evidence/repository-full-nuxt.log` |
| 6 | Focused rerun of the four failing full-Nuxt files | `autobyteus-web` | Failure isolation | Same four failures reproduced without changed-scope tests; none names or executes the local-file/video path | `api-e2e-evidence/repository-unrelated-failure-recheck.log` |

The full Nuxt failures are not implementation/API/E2E failures for this ticket: (1) a workspace-history fixture cannot resolve `/tmp/workspace-a`; (2) `MemoryHome.spec.ts` contradicts visible existing `Memory` labels; (3) `CodexFullAccessCard.spec.ts` expects stale copy; and (4) the zh-CN glossary sweep finds a pre-existing `代理` string in the settings catalog. The ticket changes none of the first three test/source areas. Its only file under the fourth command's broad directory is `zh-CN/tools.ts`; the reported failure is in the separate settings catalog and the changed tools strings contain no deprecated term. Relevant focused suites, guards, and the complete Electron suite pass.

## Post-Repository Confidence Scorecard (Mandatory)

| Confidence Category | Score (`0-100%`/`N/A`) | What Supports The Score | Remaining Uncertainty | Additional Validation That Could Improve It |
| --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 85% | Direct durable proof covers protocol contract, validation, UI recovery state, routing, and cleanup | AC-001–003 and AC-009 lack executed real Electron media proof | Execute Electron 42.4.1 media journeys |
| Changed-boundary execution directness | 82% | Response/stream owners execute directly in Node; exact component executes in Nuxt | Scheme registration and Chromium consumption remain mocked/separate | Exact transpiled modules in Electron |
| Cross-boundary integration realism and mock gap | 75% | Focused tests join adjacent source responsibilities and full Electron regressions pass | No repository suite crosses protocol -> Chromium media -> viewer | Isolated desktop probe with real filesystem/media |
| Environment, configuration, identity, and fixture fidelity | 90% | Declared Electron payload is verified as 42.4.1 when ambient run-as-Node override is removed; exact reported and large fixtures exist | Runtime has not yet consumed them | Launch isolated Electron and capture `process.versions` |
| Failure, edge-case, lifecycle, and recovery evidence | 88% | Exhaustive range/path failures and completion/cancel/error cleanup pass; native/resource Retry unit coverage passes | Real Chromium cancel and native media error recovery remain unexecuted | Later-seek cancellation plus real component error journey |
| User-surface, browser, and desktop-shell confidence | 75% | Real Vue component behavior passes with accessible alert and Retry; lifecycle registration shape passes | Actual Electron renderer/shell and native media controls are unproven | Hidden Electron renderer journey |
| Durable regression coverage quality and relevance | 96% | 34 focused relevant tests, all 111 Electron tests, guards, and 2000/2004 executed Nuxt tests pass; durable scenarios are requirement-aligned | Four isolated unrelated baseline failures prevent a green global Nuxt command | No ticket-scoped test change; address baseline failures separately |

- Overall post-repository confidence: `84.4%`.
- Calculation method: Simple average of seven applicable categories: `(85 + 82 + 75 + 90 + 88 + 75 + 96) / 7`.
- Every critical acceptance criterion directly proven: `No` — AC-001–003 and AC-009 still need the real Electron path.
- Any applicable category below `90%`: `Yes` — requirement proof, directness, integration realism, failure/lifecycle, and user/shell confidence.
- Default clean-confidence target of `95%` met: `No`.
- Material residual risks: real Electron metadata/play/pause/seek, later Range and cancellation, native UI failure integration, shared consumers, unavailable live Windows, and codec bounds. The four unrelated full-Nuxt baseline failures are preserved separately and do not weaken changed-boundary evidence.

## Broader Validation Decision (Mandatory)

- Decision: `Required`
- Selected execution mode (`Browser`/`Live API`/`Project Desktop Validation`/`CLI`/`Lifecycle`/`Worker or Distributed`/`Other`/`None`): `Project Desktop Validation`
- Specific confidence gap or residual risk addressed: AC-001–003 and AC-009 require the Electron custom-scheme/media element; AC-004–005 benefit from a native media-error journey; AC-008 requires actual shared-scheme consumers; cancellation/later Range is not proven by mocks.
- Why the selected mode can materially improve confidence: It exercises Electron's scheme registration, default-session handler, Chromium request sequencing, native media decoder/player, renderer DOM, and real filesystem bytes while importing exact transpiled branch modules.
- Expected confidence after the selected validation: At least 95% overall with no category below 90% if all critical scenarios pass.
- Browser-specific decision and rationale: Standalone browser validation is not selected because browsers cannot register or exercise Electron's `local-file` scheme. A Nuxt page may host the real component only inside the Electron renderer; that remains desktop validation, not browser-only evidence.
- If `Not Required`, evidence proving the real changed boundary without broader execution: N/A.
- If `Blocked`, exact dependency or access that remains unavailable after safe setup/emulation attempts: N/A at investigation time.

## Desktop Application Validation Decision (When Applicable)

- Desktop framework / shell: Electron, declared version 42.4.1, Chromium engine bundled with that runtime.
- Relevant README or development instructions: `autobyteus-web/README.md`, `AGENTS.md`, `package.json`, `electron/tsconfig.json`, `nuxt.electron.config.ts`.
- Web-equivalent behavior: `VideoPlayer` alert/Retry/URL state and shared viewer rendering.
- Shell-specific or lifecycle behavior: Pre-ready scheme privileges, post-ready default-session handler, range requests, streaming cancellation, native media metadata/play/seek.
- Chosen validation approach and why it fits the project: Isolated hidden Electron process using the exact declared runtime and exact transpiled production protocol modules, optionally loading a temporary Nuxt route that mounts the real component. This is narrower and safer than launching the full package/server while directly proving the material boundary.
- Server/frontend setup when browser validation is used: A probe-owned Nuxt dev port only; no backend required for the isolated component route.
- Effect on any already-running desktop application: `None`; the post-poweroff run found no user AutoByteus process. The probes used isolated HOME/user-data and did not start the packaged app.
- Behavior not directly proven and confidence consequence: Live Windows drive-letter behavior cannot be executed on macOS and remains a bounded platform residual backed by deterministic parsing coverage. Codec support is limited to the shipped Chromium build and generic failure behavior.

## Live Environment And Fixture Plan (Required When Broader Validation Runs)

- Startup order and commands: verify and launch exact Electron 42.4.1 with the ambient run-as-Node override removed; run repository checks and transpile; create probe fixtures/page/main script; start unique Nuxt port; launch hidden Electron with isolated user-data; collect structured results; stop owned services and remove scratch state.
- Environment choices that materially affect the run: macOS arm64; Electron 42.4.1; English and Simplified Chinese locale checks; autoplay policy set only if needed for explicit script-initiated play; hidden BrowserWindow; no shared app user-data.
- Health / readiness checks: Nuxt scratch route HTTP 200; Electron `process.versions.electron`; reported file stat/hash; structured probe ready event.
- Seed data / fixtures: Two existing videos plus generated WAV, PNG, PDF, XLSX/CSV/text, missing/directory/invalid URL/range cases.
- Test identities, authentication, permissions, or session state: None.
- Requirement-linked journeys or scenarios: E2E-VID-001 metadata/play/pause; E2E-VID-002 seek/later-range/continued playback/cancel; E2E-PROTO-001 response matrix; E2E-SEC-001 rejection matrix; E2E-UI-001 native/resource failure/Retry/URL recovery/localization; E2E-REG-001 audio/image/PDF/Excel/text preserved routes.
- DOM, screenshot, log, API, process, or other evidence to capture: Structured JSONL results, Electron version, request headers, response statuses/headers/bytes, media events/times, DOM alert/button/attempt values, fixture hashes, cleanup and process exit.
- Owned processes and temporary state to clean up: Unique Nuxt process, Electron process/window, isolated user-data, generated fixtures, scratch page and main script.

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| E2E-VID-001 | Exact transpiled protocol modules + Electron 42.4.1 `<video>` on reported file | AC-001, AC-002, AC-009 | Executed — Fail: valid POSIX URL canonicalized to a hostname-bearing form, handler returned 404, UI showed the generic alert |
| E2E-VID-002 | Same runtime on 607 MB fixture with request observation and later seek | AC-003, AC-009, cancellation/later Range | Not executed after the prerequisite valid-file request failed; external 607 MB fixture remains unsuitable for repository inclusion |
| E2E-PROTO-001 | Electron `net.fetch` through the installed exact `local-file` handler | AC-006 full/range/HEAD/error contract at real scheme boundary | Executed — Fail: every valid POSIX request became hostname-bearing and returned 404 before range/method policy |
| E2E-SEC-001 | Invalid methods/URLs/paths/ranges through real scheme | AC-007 no-byte failures and trusted rejection | Executed partially — invalid requests returned no bytes, but valid-path method/range statuses were masked by the same 404 canonicalization failure |
| E2E-UI-001 | Temporary Nuxt page mounting real `VideoPlayer` inside Electron | AC-004–005 and localization/native failure integration | Executed partially: actual native failure removed the element and showed localized accessible Retry; Retry/fresh URL recovery was not continued after the critical happy-path failure |
| E2E-REG-001 | Electron media/elements/fetch plus focused existing viewer/routing tests | AC-008 | Not executed after the prerequisite scheme failure; focused repository preserved-route tests passed |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Live Windows drive-letter/custom-scheme execution | Assigned host is macOS arm64 | Bounded platform parsing/IO difference | Record residual; rely on deterministic Windows URL-shape coverage and require Windows release validation in normal platform CI/release |
| Every declared video container/codec | Chromium codec availability varies and codec expansion is out of scope | Unsupported content may fail | Prove representative supported H.264 and generic failure UI; document codec bound |
| Concurrent mutation/truncation of a source after stat | Explicitly outside approved scope | Stream fails if external writer mutates file mid-read | Unit early-EOF/error cleanup plus generic failure state are sufficient containment evidence |

## Ambiguities Or Reroute Triggers

| Issue | Classification (`Requirement Gap`/`Design Impact`/`Unclear`/`Local Fix`) | Evidence | Recommended Recipient |
| --- | --- | --- | --- |
| The reviewed design requires both `{ standard: true, stream: true }` and preservation of `local-file:///absolute/POSIX/path`, but Electron 42.4.1 standard-scheme canonicalization delivers that URL as `local-file://absolute/...` with the first path segment as hostname; `decodeLocalFilePath` rejects every multi-character hostname. | Design Impact (preliminary) | `api-e2e-evidence/electron-failure-origin-result.json`; exact valid reported file produced `Range: bytes=0-`, handler URL host `users`, 404, and real `VideoPlayer` alert | `code_reviewer` for focused failure-origin review and owner classification |

## Investigation Decision

- Proceed To API/E2E Execution: `Yes — executed; broader validation failed`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `No` in this round; pending reviewed design correction
- Post-repository confidence: `84.4%`.
- Broader validation decision: `Required — Project Desktop Validation; executed with Fail result`
- Reroute Required Before Validation Execution: `No`; reroute is required now after execution
- Recommended Recipient If Reroute Required: `code_reviewer` for focused failure-origin review
- Notes: Electron 42.4.1 and Chromium 148 were verified directly. AC-001–003, AC-006, and AC-009 fail or remain unproven because valid POSIX requests never reach file validation/range planning. Evidence and cleanup are preserved for focused failure-origin review.
