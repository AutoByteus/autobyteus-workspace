# Code Review Report

## Review Round Meta

- Review Entry Point: `Implementation Review`
- Requirements Doc Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/local-video-preview-playback/tickets/in-progress/local-video-preview-playback/requirements.md`
- Supplemental Task Artifacts Reviewed As Context:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/local-video-preview-playback/tickets/in-progress/local-video-preview-playback/runtime-probe-evidence.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/local-video-preview-playback/tickets/in-progress/local-video-preview-playback/url-identity-probe-evidence.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/local-video-preview-playback/tickets/in-progress/local-video-preview-playback/fetch-capability-probe-evidence.md`
- Current Review Round: `9`
- Trigger: architecture-round-6 CR-005 correction at implementation/test commit `0c9728b4a671526162c97b5a7999836f532aa3c9`, with cumulative artifact commit `99b8e465de6e6369fc101262db1af9b22f8c92a1`.
- Prior Review Round Reviewed: `8`
- Latest Authoritative Round: `9`
- Investigation Notes Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/local-video-preview-playback/tickets/in-progress/local-video-preview-playback/investigation-notes.md`
- Design Spec Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/local-video-preview-playback/tickets/in-progress/local-video-preview-playback/design-spec.md`
- Design Review Report Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/local-video-preview-playback/tickets/in-progress/local-video-preview-playback/design-review-report.md` (authoritative architecture round 6 `Pass`)
- Implementation Handoff Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/local-video-preview-playback/tickets/in-progress/local-video-preview-playback/implementation-handoff.md`
- Coverage Investigation Reviewed (failure-origin entry point): `N/A`; the existing round-3 artifact was consulted only as retained behavioral/runtime context.
- Execution Coverage Report Reviewed (failure-origin entry point): `N/A`; the existing round-3 artifact was consulted only as retained behavioral/runtime context.
- Failing Scenario IDs: `N/A` for this implementation-review round. Downstream must rerun all six scenarios, starting with `E2E-REG-001`.
- Exact Failing Commands / Execution Mode: `N/A`.
- Failure Evidence Paths: `N/A`; the reviewed design's evidence basis is recorded in `fetch-capability-probe-evidence.md` and its referenced round-3/solution-design probes.

## Round History

| Round | Trigger | Prior Unresolved Findings Rechecked | New Findings Found | Review Decision | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Initial implementation `f60718a63` | N/A | None | `Pass` | No | Superseded by realistic Electron URL-identity failure. |
| 2 | API/E2E round 1 failure | None | `CR-001` | `Fail` | No | `Design Impact`: standard scheme conflicted with the triple-slash POSIX identity. |
| 3 | Fixed-authority source `cdeb0aafb` | `CR-001` | `CR-002` | `Fail` | No | Legal POSIX backslashes were rewritten. |
| 4 | POSIX identity fix `09fe48665` | `CR-002` | `CR-003` | `Fail` | No | New real-file fixture was not Windows-portable. |
| 5 | Portable fixture fix `02ca27faf` | `CR-003` | None | `Pass` | No | API/E2E remained downstream. |
| 6 | API/E2E round 2 failure | None | `CR-004` | `Fail` | No | Raw legacy POSIX migration occurred after ambient URL parsing. |
| 7 | Raw migration fix `b658f16b5` | `CR-004` | None | `Pass` | No | Durable hostile-normalization regression added. |
| 8 | API/E2E round 3 failure | None | `CR-005` | `Fail` | No | `Design Impact`: two scheme privileges could not serve supported PDF XHR/Excel Fetch. |
| 9 | Reviewed CR-005 design implemented at `0c9728b4a` | `CR-005` | None | `Pass` | Yes | Exact four privileges are protected by one fail-closed registered-workspace-main-frame gate. |

## Prior Findings Resolution Check

| Prior Round | Finding ID | Previous Severity | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| 2 | `CR-001` | Critical | `Remains Resolved` | Fixed-authority shared codec and strict current handler remain unchanged; earlier API/E2E proved authored/property/currentSrc/handler identity and video paths. | No compatibility decoder returned. |
| 3 | `CR-002` | High | `Remains Resolved` | Platform-aware codec still preserves POSIX `%5C`; focused codec/migration/response evidence remains in the package. | No global separator normalization. |
| 4 | `CR-003` | Medium | `Remains Resolved` | Portable general response fixture and platform-scoped POSIX-backslash real-file case remain intact. | No production change was involved. |
| 6 | `CR-004` | High | `Remains Resolved and runtime-verified` | Raw legacy POSIX recognition still precedes ambient `URL`; API/E2E round 3 verified actual Electron convergence and AC-010. | No protocol compatibility path. |
| 8 | `CR-005` | High | `Resolved in source; realistic verification required downstream` | Architecture round 6 passed the exact four-privilege plus main-frame-gate design. `local-file-protocol.ts` declares only the four approved flags, registers one filtered default-session listener before one handler, and fail-closes all rejected/exceptional identities. The registry permits only its current live exact main-frame object, and `main.ts` injects that public query after ready and before the first shell opens. | Real PDF/Excel top-frame success and child-frame/no-identity denial remain API/E2E obligations, not unit-test claims. |

## Review Scope

- Changed implementation and behavior reviewed: the cumulative ticket implementation from base `dbc83fdb51c1e158b5707c219dd8574dc49fa493` through `0c9728b4a671526162c97b5a7999836f532aa3c9`, with full attention to CR-005's scheme capabilities, pre-handler authorization, live shell identity, lifecycle order, and preserved protocol/viewer behavior.
- Files / areas reviewed: complete requirements/investigation/design/supplement/architecture package; implementation handoff; cumulative changed production files; CR-005 source and unit-test diff; Electron scheme registration, default-session request gate, response delegation, shell registration/unregistration, browser-partition separation, and bootstrap order; retained API/E2E evidence as behavioral context.
- Explicit exclusions: no new realistic Electron/PDF.js/Excel/browser execution, live Windows execution, branch refresh/integration, documentation edits, deployment work, unrelated baseline test remediation, or successful-test-code review. Those belong to later workflow stages.

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: supported video and existing local viewers must work through one canonical validated read-only protocol; only the exact main frame of a live registered workspace shell may cross the request boundary; unsupported attachments remain non-executable; no fallback or alternate byte transport is allowed.
- Design-spec behavior map verified against the implementation: `Confirmed` for BEH-001 through BEH-005 and DS-001 through DS-006.
- Design review report and round confirmed: architecture round 6 `Pass`, including the CR-005 capability/security correction and `MP-CR-005`.
- Behavior-basis status: `Confirmed`
- Changed or newly discovered behavior, if any: none.
- Remaining material ambiguity, if any: none for source review. Actual Electron requester identity for real PDF.js XHR/Excel Fetch and child frames is intentionally an executable downstream gate.

| Behavior ID | Current Status | Current Implementation Path And Lifecycle Evidence | Contradicting Or Newly Discovered Supported Behavior Evidence |
| --- | --- | --- | --- |
| `BEH-001` | `Confirmed` | File selection uses the shared fixed-authority codec; `VideoPlayer` reaches the four-capability scheme, pre-handler exact-main-frame gate, strict response/validator/range/stream owners, and native controls. CR-005 does not alter producer, response, or player source. | None. |
| `BEH-002` | `Confirmed` | `VideoPlayer` still owns native/resource failure containment, localized alert, keyed fresh Retry, and URL-change reset. | None. |
| `BEH-003` | `Confirmed` | Module-scope registration occurs before ready; after ready one `local-file://*/*` default-session listener asks the live registry predicate and cancels unless authorized, then one handler delegates to strict validation/range/stream response owners. | None. |
| `BEH-004` | `Confirmed` | The scheme has exactly `standard`, `stream`, `supportFetchAPI`, and `corsEnabled`; existing PDF/Excel/image/audio/thumbnail consumers are unchanged. Only a registered workspace-shell exact main frame can proceed; browser content remains on its separate partition. | None; realistic viewer/child-frame verification remains downstream. |
| `BEH-005` | `Confirmed` | Raw migration, current model/presentation, submission plan, agent/team projection, and identity-matched echo merge remain unchanged from the runtime-verified round-7 source. | None. |

## Structural / Design Checks

| Check | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Task design health assessment is present, evidence-backed, and preserved by the implementation | Pass | Round-6 design defines the exact capability/security tradeoff, live identity owner, lifecycle order, forbidden privileges/transports, and executable gates; source follows it. | None. |
| Implementation matches approved behavior-defining supplemental artifacts | Pass | Exact four flags and the frame gate match `fetch-capability-probe-evidence.md`; fixed authority/codec and runtime response behavior continue to match the earlier supplements. | None. |
| Data-flow spine inventory clarity and preservation under shared principles | Pass | DS-001/004/005 now visibly traverse `renderer -> session gate -> handler -> validator/response`; DS-002/003/006 remain unchanged. | None. |
| Ownership boundary preservation and clarity | Pass | Protocol owner owns descriptor/filter/order/handler; registry owns live shell/frame identity; response owner owns request policy; bootstrap only composes public boundaries. | None. |
| Off-spine concern clarity | Pass | Logging, MIME, validation, localization, and browser isolation continue to serve their owning spines without taking sequencing authority. | None. |
| Existing capability/subsystem reuse check | Pass | Existing `WorkspaceShellWindowRegistry`, protocol owner, default session, validator, codec, viewers, and browser partition are extended/reused; no duplicate registry or transport was added. | None. |
| Reusable owned structures check | Pass | Shared codec, attachment plan/model, response window, and shell registry remain single owners; the narrow requester predicate needs no duplicated DTO/helper. | None. |
| Shared-structure/data-model tightness check | Pass | Request identity is exactly `(webContentsId, WebFrameMain)`; it does not mix URL/path/origin or optional policy fields. Existing attachment structures remain tight. | None. |
| Repeated coordination ownership check | Pass | One protocol install owns the one listener and one handler; one registry query owns live-frame identity; prior shared codec/submission owners remain singular. | None. |
| Empty indirection check | Pass | The injected predicate is an explicit cross-owner contract; no pass-through wrapper or generic helper was introduced. | None. |
| Scope-appropriate separation of concerns and file responsibility clarity | Pass | Capability/authorization stays in `local-file-protocol.ts`, identity in the shell registry, lifecycle composition in `main.ts`, and detailed response work in existing protocol internals. | None. |
| Ownership-driven dependency check | Pass | `main.ts -> protocol public API + registry public query`; protocol receives the query by injection; registry imports only Electron frame type and shell type. No cycle or mixed-level dependency. | None. |
| Authoritative Boundary Rule check | Pass | Bootstrap does not register webRequest/handler or call response internals; protocol does not enumerate shells or inspect registry internals; registry has no scheme/path policy. | None. |
| File placement check | Pass | Protocol lifecycle, shell identity, bootstrap composition, and their focused tests reside in the existing owning areas. | None. |
| Flat-vs-over-split layout judgment | Pass | A small query was added to the existing registry and a small gate to the existing protocol owner; no artificial file split or broad blob was created. | None. |
| Interface/API/query/command/service-method boundary clarity | Pass | `installLocalFileProtocol({ isOwnedMainFrame })` requires one explicit predicate; `isOwnedMainFrame(id, frame)` answers one live-identity question. | None. |
| Naming quality and naming-to-responsibility alignment check | Pass | `isOwnedMainFrame`, `webContentsId`, `frame`, and `isAuthorized` accurately state identity and decision roles. | None. |
| No unjustified duplication of code / repeated structures in changed scope | Pass | No second listener, registration API, shell map, URL parser, viewer fetch wrapper, or byte route exists. | None. |
| Patch-on-patch complexity control | Pass | CR-005 is a clean lifecycle/authorization extension; no compatibility decoder, header-origin guess, fallback, token, query credential, or viewer exception was layered on. | None. |
| Dead/obsolete code cleanup completeness in changed scope | Pass | Prior inline handler and `net.fetch(file:)` remain absent; searches show one production registration owner, listener, and handler path. | None. |
| Relevant test scenarios and assertions are clear and requirement-aligned | Pass | Tests assert exact/no-extra privileges, filter/order/single handler, allowed identity, absent/rejected/throw cancellation, exact current main-frame equality, destruction, unregister, and replacement. | None. |
| Test fixtures/helpers are reasonably reusable and test structure remains coherent | Pass | Test-local frame/shell factories support the single protocol/registry subjects without product test hooks. | None. |
| No stale, duplicated, or compatibility-only tests are retained in changed scope | Pass | New tests protect current authorization behavior; prior historical-form tests remain confined to the approved migration boundary. | None. |
| API/E2E readiness for the next workflow stage | Pass | Source, focused checks, transpilation, guards, scenario IDs, and exact residual assertions are ready. Unit mocks do not overclaim real frame behavior. | Run `E2E-REG-001` first for real HTTP/file PDF/Excel plus child-frame denial, then rerun all six through the actual gate. |

## Source File Size And Structure Audit

Effective counts are current non-empty lines. Delta is additions plus deletions from ticket base `dbc83fdb51c1e158b5707c219dd8574dc49fa493` through implementation commit `0c9728b4a671526162c97b5a7999836f532aa3c9`. Tests, artifacts, generated files, config, manifests, and lockfiles are excluded from thresholds.

| Source File | Effective Non-Empty Lines | `>500` Hard-Limit Check | `>220` Delta Check | SoC / Ownership Check | Placement Check | Preliminary Classification | Required Action |
| --- | ---: | --- | --- | --- | --- | --- | --- |
| `components/conversation/UserMessage.vue` | 124 | Pass | Pass (8) | Message attachment presentation | Pass | Pass | None |
| `components/fileExplorer/viewers/VideoPlayer.vue` | 95 | Pass | Pass (75) | Viewer-local attempt/failure lifecycle | Pass | Pass | None |
| `electron/local-file-protocol/file-byte-stream.ts` | 74 | Pass | Pass (85) | Byte window/read/closure | Pass | Pass | None |
| `electron/local-file-protocol/local-file-protocol.ts` | 57 | Pass | Pass (62) | Scheme capability, authorization, lifecycle boundary | Pass | Pass | None |
| `electron/local-file-protocol/local-file-response.ts` | 141 | Pass | Pass (164) | Request-to-response policy | Pass | Pass | None |
| `electron/main.ts` | 454 | Pass | Pass (37) | Existing bootstrap composes public owners only | Pass | Pass | Keep protocol internals out. |
| `electron/shell/workspace-shell-window-registry.ts` | 71 | Pass | Pass (16) | Live shell/frame identity | Pass | Pass | None |
| `localization/messages/en/tools.ts` | 18 | Pass | Pass (4) | English catalog | Pass | Pass | None |
| `localization/messages/zh-CN/tools.ts` | 18 | Pass | Pass (4) | Simplified Chinese catalog | Pass | Pass | None |
| `services/agentStreaming/handlers/memberInputMessageHandler.ts` | 17 | Pass | Pass (2) | Member-input entry | Pass | Pass | None |
| `services/agentStreaming/handlers/userMessageProjection.ts` | 105 | Pass | Pass (37) | Projection/identity merge | Pass | Pass | None |
| `shared/localFileUrl.ts` | 52 | Pass | Pass (62) | Shared current URL codec | Pass | Pass | None |
| `stores/agentRunStore.ts` | 362 | Pass | Pass (19) | Existing agent coordinator consumes plan | Pass | Pass | None |
| `stores/agentTeamRunStore.ts` | 454 | Pass | Pass (12) | Existing team coordinator consumes plan | Pass | Pass | None |
| `stores/fileExplorerContentActions.ts` | 300 | Pass | Pass (10) | Routing delegates codec | Pass | Pass | None |
| `types/conversation.ts` | 88 | Pass | Pass (11) | Tight current attachment union | Pass | Pass | None |
| `utils/contextFiles/contextAttachmentModel.ts` | 277 | Pass | Pass (27) | Current hydration/construction | Pass | Pass | None |
| `utils/contextFiles/contextAttachmentPresentation.ts` | 170 | Pass | Pass (34) | Current preview/open eligibility | Pass | Pass | None |
| `utils/contextFiles/contextAttachmentSend.ts` | 31 | Pass | Pass (24) | Retained/executable plan | Pass | Pass | None |
| `utils/contextFiles/contextLocalFileLocatorMigration.ts` | 94 | Pass | Pass (106) | Isolated historical convergence | Pass | Pass | None |

## Legacy / Backward-Compatibility Verdict

| Check | Result | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms in changed scope | Pass | Runtime protocol is canonical-only; historical locator knowledge remains confined to the approved hydration migration. |
| No legacy old-behavior retention in changed scope | Pass | Old authority, inline owner, `net.fetch(file:)`, fallback transport, and viewer-specific route are absent. |
| Dead/obsolete code cleanup completeness in changed scope | Pass | One codec, one protocol owner, one filter, one handler, and one validated byte path remain. |
| Approved persisted-data transition decision is followed without unnecessary migration work | Pass | Exact valid legacy locators converge at read/hydration; no store rewrite or new unsupported-state durable transport was added. |
| No version-specific dual reads/writes or request-time old-shape fallback exists | Pass | The handler accepts current canonical identity only; no CR-005 compatibility route exists. |
| Approved transition mechanics match the reviewed design, including migration safety only when required | Pass | Raw recognition and exact rebuild remain isolated; the authorization correction changes no persisted data. |

## Dead / Obsolete / Legacy Items Requiring Removal

None found in the changed scope.

## Docs-Impact Verdict

- Docs impact: `Yes`
- Why: durable Electron/File Explorer documentation should record the fixed authority, exact four scheme capabilities, registered-workspace-main-frame authorization boundary, lifecycle ordering, validation/ranges, preserved PDF/Excel consumers, and viewer failure/Retry behavior.
- Files or areas likely affected: `autobyteus-web/docs/electron_packaging.md` and `autobyteus-web/docs/file_explorer.md`; delivery owns final sync after executable validation.

## Material Premise Validation

### Upstream And Prior Material-Premise Decisions

| Premise ID | Current Status | Changed Evidence / Reason |
| --- | --- | --- |
| `MP-AR-004` | `Confirmed` | Approved current-session/live-echo retention and fresh-reload disappearance remain implemented and unchanged. |
| `MP-CR-001` | `No Longer Relevant as a blocking premise` | Fixed authority replaced ambiguous empty-authority identity and has already passed realistic protocol/video execution. |
| `MP-CR-002` | `Confirmed and resolved` | Exact codec/migration/response source still preserves POSIX `%5C`. |
| `MP-CR-003` | `Confirmed and resolved` | Portable general fixture plus platform-scoped POSIX-backslash file fixture remain correct. |
| `MP-CR-004` | `Confirmed and runtime-verified resolved` | Actual Electron legacy POSIX hydration converged and AC-010 passed in round 3. |
| `MP-CR-005` | `Confirmed; source correction matches the reviewed response` | Existing PDF.js XHR and Excel Fetch require both approved capabilities. The design-reviewed gate uses actual default-session requester identity and exact live main-frame equality to contain them. Source implements that exact contract; realistic end-to-end confirmation remains downstream. |

No new or reclassified material premise was introduced in round 9.

## Reviewer Checks

| Check | Result | Evidence |
| --- | --- | --- |
| Focused Electron protocol/response/registry tests | Pass | `pnpm test:electron --run electron/local-file-protocol/__tests__/local-file-protocol.spec.ts electron/local-file-protocol/__tests__/local-file-response.spec.ts electron/shell/__tests__/workspace-shell-window-registry.spec.ts` — 3 files / 20 tests passed. |
| Electron transpilation | Pass | `pnpm transpile-electron`. |
| Web boundary guard | Pass | `pnpm guard:web-boundary`. |
| Localization boundary guard | Pass | `pnpm guard:localization-boundary`. |
| Localization literal audit | Pass | `pnpm audit:localization-literals` with zero unresolved findings; existing package-type performance warning is unrelated. |
| Commit/diff hygiene | Pass | `git show --check 0c9728b4a671526162c97b5a7999836f532aa3c9`; worktree was clean before this report update. |
| Lifecycle/duplication search | Pass | One module-scope pre-ready registration, one post-ready install, one production default-session `onBeforeRequest`, and one handler owner; first shell opens after install. |

## Review Scorecard

- Overall score (`/10`): `9.5`
- Overall score (`/100`): `95.2`
- Score calculation note: simple average across the ten categories. Every category meets the `9.0` clean-pass threshold; the score does not replace the review decision.

| Priority | Category | Score | Why This Score | What Is Weak / Holding It Down | What Should Improve |
| --- | --- | ---: | --- | --- | --- |
| `1` | `Data-Flow Spine Inventory and Clarity` | 9.6 | All six spines cover initiating surface, authorization boundary, response owner, and meaningful result; CR-005 is explicit in DS-004/005. | Real request-frame observations remain executable evidence. | Preserve the exact spine in API/E2E. |
| `2` | `Ownership Clarity and Boundary Encapsulation` | 9.6 | Protocol, registry, response, bootstrap, viewer, codec, and migration owners are singular and non-bypassed. | No material source weakness. | Preserve one-listener ownership as the app evolves. |
| `3` | `API / Interface / Query / Command Clarity` | 9.5 | The install predicate and registry query have explicit identities and one responsibility. | Electron's frame object is lifecycle-sensitive by nature. | Keep fail-closed execution coverage. |
| `4` | `Separation of Concerns and File Placement` | 9.4 | CR-005 adds small cohesive responsibilities to the existing protocol and registry owners; bootstrap remains thin. | Inherited `main.ts` and team store are sizable, though below limits and minimally changed. | Keep future policy out of those coordinators. |
| `5` | `Shared-Structure / Data-Model Tightness and Reusable Owned Structures` | 9.5 | URL, attachment, byte-window, and requester-identity shapes remain tight and singular. | No material model weakness. | Avoid expanding requester identity with redundant URL/origin state. |
| `6` | `Naming Quality and Local Readability` | 9.4 | Names clearly distinguish authorization, liveness, main frame, and response ownership. | Cross-runtime URL/frame rules remain inherently subtle. | Keep focused tests adjacent to owners. |
| `7` | `API/E2E Readiness` | 9.4 | Source checks pass and the exact real viewer/security scenarios and no-bypass constraint are specified. | Real PDF.js/Excel and child-frame identity have not run against this commit. | Run E2E-REG first, then all six in actual Electron. |
| `8` | `Runtime Correctness And Behavioral Fidelity` | 9.5 | Source matches the evidence-reviewed capability/gate contract and preserves all previously verified response/video/migration behavior. | Live Windows and post-fix real viewer execution remain downstream. | Retain exact allow/cancel/handler-reached evidence. |
| `9` | `No Backward-Compatibility / No Legacy Retention` | 9.7 | Current protocol is canonical-only; approved historical convergence remains isolated; no fallback/alternate transport returned. | No material weakness. | Preserve the clean cut. |
| `10` | `Cleanup Completeness` | 9.6 | Obsolete handler, transport, duplicate codec, compatibility paths, and scratch route remain absent. | Durable docs remain a delivery-stage task. | Sync docs after executable gates pass. |

## Findings

### `CR-001` — Standard-scheme and old triple-slash POSIX premises were incompatible

- Status: `Resolved and runtime-verified`
- Previous severity/classification: `Critical / Design Impact`
- Current evidence: fixed authority remains the only current wire identity; prior realistic protocol/video paths passed.

### `CR-002` — Shared builder rewrote legal POSIX backslashes

- Status: `Resolved`
- Previous severity/classification: `High / Local Fix`
- Current evidence: platform-aware builder/parser and migration tests remain; no separator normalization regression exists.

### `CR-003` — POSIX-only response fixture was unguarded on Windows

- Status: `Resolved`
- Previous severity/classification: `Medium / Local Fix`
- Current evidence: portable fixture remains active and the literal POSIX-backslash filesystem case is platform-scoped.

### `CR-004` — Legacy POSIX hydration depended on ambient URL normalization before raw recognition

- Status: `Resolved and runtime-verified`
- Previous severity/classification: `High / Local Fix`
- Current evidence: raw recognition remains first, hostile-normalization coverage remains, and round-3 Electron execution passed AC-010.

### `CR-005` — Reviewed scheme privileges could not serve preserved PDF XHR and Excel Fetch

- Status: `Resolved in reviewed source; executable confirmation pending`
- Previous severity/classification: `High / Design Impact`
- Affected approved behavior/contracts: `BEH-003`, `BEH-004`, `DS-004`, `DS-005`, `FR-001`, `FR-005`, `FR-006`, `AC-007`, `AC-008`, `AC-009`.
- Material premise: `MP-CR-005` (`Confirmed`).
- Resolution evidence:
  1. architecture round 6 passed an evidence-backed exact capability/security design;
  2. scheme registration declares exactly `{ standard, stream, supportFetchAPI, corsEnabled }` and no other privilege;
  3. one default-session `local-file://*/*` `onBeforeRequest` listener is installed before the one handler;
  4. absent identity, registry rejection, and predicate failure cancel before response creation;
  5. the live registry requires registered/non-destroyed shell, webContents, request frame, matching webContents ID, and strict request-frame equality to the current non-destroyed main frame;
  6. bootstrap binds the registry query after ready and before opening the first workspace shell;
  7. PDF/Excel consumers, browser partition, response/validator/range/stream, codec, migration, and viewer source are unchanged; no bypass, token, fallback, or alternate transport exists.
- Remaining gate: API/E2E must prove the real PDF.js XHR and Excel Fetch requests carry the authorized top-frame identity from HTTP and packaged-representative file origins; foreign-HTTP and same-origin Blob/HTML child frames plus identity-less main-process fetch must be denied before the handler.

No new findings in round 9.

## Classification

`N/A — Pass`

## Recommended Recipient

`api_e2e_engineer`

## Residual Risks

- Real Electron 42.4.1 must confirm that PDF.js XHR and Excel Fetch are attributed to the registered shell main frame and render/parse successfully under the new gate.
- Real foreign-HTTP and same-origin Blob/HTML-preview child frames, unregistered/destroyed identities, and identity-less main-process requests must be observed canceled before `protocol.handle` with zero bytes.
- One Electron `webRequest` listener is allowed per event; future default-session code must not silently replace this gate.
- Live Windows remains a truthful platform residual; deterministic codec/migration coverage is portable.
- Chromium codec/container support remains platform-dependent and is contained by the generic accessible viewer failure state.
- Post-validation file mutation can still fail a stream; cancel/error/EOF closure and viewer containment are present, while mutation reconciliation remains out of scope.

## Latest Authoritative Result

- Review Decision: `Pass`
- Review Entry Point: `Implementation Review`
- Material-Premise Gate: `Pass — MP-CR-005 is confirmed and the source implements the architecture-reviewed exact capability/main-frame response without introducing a new premise`
- Score Summary: `9.5/10` (`95.2/100`); every category is at least `9.0`.
- Failure Origin (when applicable): `N/A`
- Recommended Recipient (when applicable): `api_e2e_engineer`
- Notes: `CR-001` through `CR-004` remain resolved; `CR-005` is resolved at the source-review gate. Run `E2E-REG-001` first with real HTTP/file PDF/Excel plus child-frame denial, adapt method/range requests to the authorized shell main frame without bypassing the gate, then rerun all six scenarios on `0c9728b4a671526162c97b5a7999836f532aa3c9`.
