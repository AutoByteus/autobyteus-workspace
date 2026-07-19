# Code Review Report

## Review Round Meta

- Review Entry Point: `API/E2E Failure-Origin Review`
- Requirements Doc Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/local-video-preview-playback/tickets/in-progress/local-video-preview-playback/requirements.md`
- Supplemental Task Artifacts Reviewed As Context:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/local-video-preview-playback/tickets/in-progress/local-video-preview-playback/runtime-probe-evidence.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/local-video-preview-playback/tickets/in-progress/local-video-preview-playback/url-identity-probe-evidence.md`
- Current Review Round: `8`
- Trigger: API/E2E round 3 `Fail` against reviewed commit `b658f16b53e494a5649e3a72cc136fdf039ff8df`; focused failure-origin review of preserved PDF XHR and Excel fetch under the reviewed local-file scheme privileges.
- Prior Review Round Reviewed: `7`
- Latest Authoritative Round: `8`
- Investigation Notes Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/local-video-preview-playback/tickets/in-progress/local-video-preview-playback/investigation-notes.md`
- Design Spec Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/local-video-preview-playback/tickets/in-progress/local-video-preview-playback/design-spec.md`
- Design Review Report Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/local-video-preview-playback/tickets/in-progress/local-video-preview-playback/design-review-report.md` (authoritative round 5 `Pass`)
- Implementation Handoff Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/local-video-preview-playback/tickets/in-progress/local-video-preview-playback/implementation-handoff.md`
- Coverage Investigation Reviewed (failure-origin entry point): `/Users/normy/autobyteus_org/autobyteus-worktrees/local-video-preview-playback/tickets/in-progress/local-video-preview-playback/api-e2e-coverage-investigation.md`
- Execution Coverage Report Reviewed (failure-origin entry point): `/Users/normy/autobyteus_org/autobyteus-worktrees/local-video-preview-playback/tickets/in-progress/local-video-preview-playback/api-e2e-execution-coverage-report.md`
- Failing Scenario IDs: `E2E-REG-001`; failing approved scope `BEH-004`, `FR-001`, `FR-006`, `AC-008`. `E2E-PROTO-001`, `E2E-SEC-001`, `E2E-VID-001`, `E2E-VID-002`, and `E2E-UI-001` pass.
- Exact Failing Commands / Execution Mode: repository commands recorded in the canonical coverage artifacts; then owned `pnpm dev --host 127.0.0.1 --port 43191` plus installed Electron `42.4.1` with `ELECTRON_RUN_AS_NODE` unset, isolated HOME/userData/default session, production-transpiled protocol, and real FileViewer/PdfViewer/ExcelViewer owners. A separate `file://`-origin differential represented packaged renderer origin.
- Failure Evidence Paths:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/local-video-preview-playback/tickets/in-progress/local-video-preview-playback/api-e2e-evidence/round-3-electron-result.json`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/local-video-preview-playback/tickets/in-progress/local-video-preview-playback/api-e2e-evidence/round-3-electron-probe.log`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/local-video-preview-playback/tickets/in-progress/local-video-preview-playback/api-e2e-evidence/round-3-fetch-privilege-fetch-only.json`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/local-video-preview-playback/tickets/in-progress/local-video-preview-playback/api-e2e-evidence/round-3-fetch-privilege-cors-only.json`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/local-video-preview-playback/tickets/in-progress/local-video-preview-playback/api-e2e-evidence/round-3-fetch-privilege-both.json`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/local-video-preview-playback/tickets/in-progress/local-video-preview-playback/api-e2e-evidence/round-3-file-origin-base.json`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/local-video-preview-playback/tickets/in-progress/local-video-preview-playback/api-e2e-evidence/round-3-file-origin-both.json`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/local-video-preview-playback/tickets/in-progress/local-video-preview-playback/api-e2e-evidence/round-3-cleanup.log`

## Round History

| Round | Trigger | Prior Unresolved Findings Rechecked | New Findings Found | Review Decision | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Implementation handoff for `f60718a63d8551bb31bc26913a3154dc0614bc95` | N/A | None | `Pass` | No | Superseded by realistic Electron failure. |
| 2 | API/E2E round 1 failed at the standard-scheme POSIX boundary | None | `CR-001` | `Fail` | No | `Design Impact`: standard privileges conflicted with the old triple-slash identity. |
| 3 | Revised fixed-authority source `cdeb0aafb` after design round 5 | `CR-001` | `CR-002` | `Fail` | No | Fixed authority resolved `CR-001`; global backslash normalization corrupted legal POSIX paths. |
| 4 | Bounded POSIX-identity fix `09fe48665` | `CR-002` | `CR-003` | `Fail` | No | Source fixed; its new real-POSIX response fixture was not portable to Windows. |
| 5 | Portable response-fixture fix `02ca27faf` | `CR-003` | None | `Pass` | No | Cross-platform response coverage was restored; realistic API/E2E remained downstream. |
| 6 | API/E2E round 2 failed valid legacy POSIX hydration under the registered standard scheme | None | `CR-004` | `Fail` | No | `Local Fix`: migration called runtime `new URL` before recognizing the authored raw legacy POSIX form, contrary to the reviewed raw-ingress boundary. |
| 7 | Raw legacy POSIX migration fix `b658f16b5` | `CR-004` | None | `Pass` | No | Exact authored legacy POSIX recognition now precedes ambient URL construction and is protected by a normalization-hostile durable regression. |
| 8 | API/E2E round 3 completed the representative shared-viewer journey | None | `CR-005` | `Fail` | Yes | `Design Impact`: the explicitly reviewed two-privilege scheme blocks preserved PDF XHR and Excel fetch before the handler. |

## Prior Findings Resolution Check

| Prior Round | Finding ID | Previous Severity | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| 2 | `CR-001` | Critical | `Remains Resolved` | API/E2E round 2 proved fixed-authority authored/property/currentSrc/handler identity plus protocol and real-video journeys under Electron 42.4.1. | `E2E-PROTO-001`, `E2E-VID-001`, and `E2E-VID-002` pass. |
| 3 | `CR-002` | High | `Remains Resolved` | Real significant-path requests preserve `%5C`, spaces, Unicode, `%`, `#`, and exact bytes through the current codec/handler. | No compatibility or consumer workaround exists. |
| 4 | `CR-003` | Medium | `Remains Resolved` | Focused Electron coverage passes 3 files / 15 tests; the portable response fixture executes and the POSIX-only filename test remains explicitly platform-scoped. | The round-2 failure is unrelated to fixture portability. |
| 6 | `CR-004` | High | `Resolved and runtime-verified` | API/E2E round 3 proved actual Electron renderer parsing still reclassifies the legacy path, while corrected hydration returns the exact canonical openable attachment and the full AC-010 lifecycle passes. | `E2E-SEC-001` and `E2E-UI-001` pass; no unsupported protocol request occurs. |

## Review Scope

- Changed implementation and behavior reviewed: no broad source re-review. This focused round traced `E2E-REG-001` from supported PDF/Excel selection through real viewer XHR/fetch to the reviewed Electron scheme privilege boundary on commit `b658f16b53e494a5649e3a72cc136fdf039ff8df`.
- Files / areas reviewed: BEH-004/FR-001/FR-006/AC-008; design guidance line 638; `local-file-protocol.ts` and its exact lifecycle test; `PdfViewer.vue`/PDF.js XHR path; `ExcelViewer.vue`/`authorizedFetch`; canonical round-3 reports, main failure evidence, HTTP-origin privilege matrix, packaged-file-origin differential, and cleanup.
- Explicit exclusions: no repeated full implementation audit or scorecard, no successful API/E2E test-code review, no source/test changes, no live Windows validation, no branch refresh/integration, and no unrelated baseline remediation.

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: existing PDF and Excel preview presentation must remain functional through the canonical local-file URL, while protocol capability changes must preserve validation/security boundaries.
- Design-spec behavior map verified against the implementation: `Contradicted for BEH-004 by the reviewed privilege design; implementation conforms to that design`.
- Design review report and round confirmed: authoritative architecture round 5 `Pass`; `AR-001` through `AR-004` remain resolved.
- Behavior-basis status: `Contradicted`
- Changed or newly discovered behavior, if any: none.
- Remaining material ambiguity, if any: the required preserved behavior is clear, but the security/capability contract for enabling renderer XHR/fetch must be revised and reviewed upstream.

| Behavior ID | Current Status | Current Implementation Path And Lifecycle Evidence | Contradicting Or Newly Discovered Supported Behavior Evidence |
| --- | --- | --- | --- |
| `BEH-004` | `Contradicted` | `FileViewer -> PdfViewer -> PDF.js XHR -> local-file://local/...` and `FileViewer -> ExcelViewer -> authorizedFetch -> fetch(local-file://local/...)` reach Chromium after only `{ standard: true, stream: true }` registration. | Both requests fail before `protocol.handle`: PDF reports status `0`, Excel reports `Failed to fetch`. Image, audio, thumbnails, and text pass. HTTP/file-origin differentials pass all PDF XHR/fetch and Excel fetch only when both tested fetch/CORS privileges are present. |

## Structural / Design Checks — Round 7 Historical Implementation Audit

This section records the round-7 full implementation audit and was not repeated in focused round 8. Its BEH-004/API-readiness conclusion is superseded by `CR-005` and the round-8 latest result.

| Check | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Task design health assessment is present, evidence-backed, and preserved by the implementation | Pass | Reviewed boundary/ownership correction remains implemented without fallback. | None. |
| Implementation matches approved behavior-defining supplemental artifacts | Pass | Fixed authority, complete path identity, response/ranges, and the authored-raw/current-handler boundary now match retained evidence/design. | None. |
| Data-flow spine inventory clarity and preservation under shared principles | Pass | BEH-001 through BEH-005 remain traceable through DS-001 through DS-006; the CR-004 fix restores DS-006 at its first raw transition. | None. |
| Ownership boundary preservation and clarity | Pass | The historical-format owner itself performs raw recognition and delegates only current construction; model, presentation, plan, echo, codec, protocol, and viewer ownership remain unchanged. | None. |
| Off-spine concern clarity | Pass | MIME/cache/logging/localization serve their owners and stay off the main spines. | None. |
| Existing capability/subsystem reuse check | Pass | Existing validator, resource resolver, routing, upload finalization, local submission, streaming, and projection are reused. | None. |
| Reusable owned structures check | Pass | Codec, migration result, unsupported variant, submission plan, and byte window live at their actual shared boundaries. | None. |
| Shared-structure/data-model tightness check | Pass | Specialized attachment state and retained/executable plan remain tight; no overlapping URL model exists. | None. |
| Repeated coordination ownership check | Pass | Both producers consume one codec; both stores consume one plan; identity upsert owns echo retention. | None. |
| Empty indirection check | Pass | Every extracted file owns substantive lifecycle, transition, policy, or resource behavior. | None. |
| Scope-appropriate separation of concerns and file responsibility clarity | Pass | Production and test responsibilities remain cohesive; POSIX-only fixture behavior is isolated explicitly. | None. |
| Ownership-driven dependency check | Pass | Renderer/main use the process-neutral codec; protocol does not import migration; no mixed-layer shortcut exists. | None. |
| Authoritative Boundary Rule check | Pass | `main.ts` and stores depend on public owners only. | None. |
| File placement check | Pass | Shared, context, Electron, viewer, and localization files match owning concerns. | None. |
| Flat-vs-over-split layout judgment | Pass | Capability layout remains shallow and cohesive. | None. |
| Interface/API/query/command/service-method boundary clarity | Pass | The migration API remains a tight discriminated result; `LEGACY_POSIX_LOCATOR` separates authored historical recognition from ambient current URL validation. | None. |
| Naming quality and naming-to-responsibility alignment check | Pass | Raw legacy POSIX matching, current authority parsing, and platform path behavior are explicit. | None. |
| No unjustified duplication of code / repeated structures in changed scope | Pass | No endpoint-local serializer/parser/eligibility logic returned. | None. |
| Patch-on-patch complexity control | Pass | No compatibility decoder, alternate transport, fallback, or consumer exception exists. | None. |
| Dead/obsolete code cleanup completeness in changed scope | Pass | Replaced inline owner/transport/serializers/decoder/partition/flag remain absent. | None. |
| Relevant test scenarios and assertions are clear and requirement-aligned | Pass | The new regression makes ambient `URL` hostile in the exact Electron-observed way and proves exact legacy migration with `%5C`, spaces, `%`, and `#`; invalid raw adornment/malformed cases remain asserted. | None. |
| Test fixtures/helpers are reasonably reusable and test structure remains coherent | Pass | The test-local `URL` subclass is bounded, restored in `finally`, and avoids adding production/runtime test hooks. Existing portable response fixtures remain coherent. | None. |
| No stale, duplicated, or compatibility-only tests are retained in changed scope | Pass | Tests protect current behavior and the approved isolated migration only. | None. |
| API/E2E readiness for the next workflow stage | Pass | `CR-004` is corrected at source, durable regression is target-behavior-specific, focused Nuxt/Electron checks and transpilation/guards pass, and the six scenario IDs remain explicit. | Proceed to API/E2E on `b658f16b53e494a5649e3a72cc136fdf039ff8df`. |

## Source File Size And Structure Audit — Round 7 Historical Implementation Audit

Effective counts are current non-empty lines. Delta is additions plus deletions from base through `b658f16b53e494a5649e3a72cc136fdf039ff8df`. Tests and generated/manifest/config files are excluded from thresholds.

| Source File | Effective Non-Empty Lines | `>500` Hard-Limit Check | `>220` Delta Check | SoC / Ownership Check | Placement Check | Preliminary Classification | Required Action |
| --- | ---: | --- | --- | --- | --- | --- | --- |
| `components/conversation/UserMessage.vue` | 124 | Pass | Pass (8) | Projected attachment affordance owner | Pass | Pass | None |
| `components/fileExplorer/viewers/VideoPlayer.vue` | 95 | Pass | Pass (75) | Viewer-local media lifecycle owner | Pass | Pass | None |
| `electron/local-file-protocol/file-byte-stream.ts` | 74 | Pass | Pass (85) | Byte-window/handle owner | Pass | Pass | None |
| `electron/local-file-protocol/local-file-protocol.ts` | 26 | Pass | Pass (29) | Scheme lifecycle/public boundary | Pass | Pass | None |
| `electron/local-file-protocol/local-file-response.ts` | 141 | Pass | Pass (164) | Request-to-response policy owner | Pass | Pass | None |
| `electron/main.ts` | 452 | Pass | Pass (35) | Inherited bootstrap reduced to public calls | Pass | Pass | Keep protocol internals out |
| `localization/messages/en/tools.ts` | 18 | Pass | Pass (4) | English override catalog | Pass | Pass | None |
| `localization/messages/zh-CN/tools.ts` | 18 | Pass | Pass (4) | Simplified Chinese override catalog | Pass | Pass | None |
| `services/agentStreaming/handlers/memberInputMessageHandler.ts` | 17 | Pass | Pass (2) | Member-input entry | Pass | Pass | None |
| `services/agentStreaming/handlers/userMessageProjection.ts` | 105 | Pass | Pass (37) | Projection/identity merge owner | Pass | Pass | None |
| `shared/localFileUrl.ts` | 52 | Pass | Pass (62) | Shared codec with exact platform-aware path identity | Pass | Pass | None |
| `stores/agentRunStore.ts` | 362 | Pass | Pass (19) | Existing coordinator consumes plan | Pass | Pass | None |
| `stores/agentTeamRunStore.ts` | 454 | Pass | Pass (12) | Existing team coordinator consumes plan | Pass | Pass | None |
| `stores/fileExplorerContentActions.ts` | 300 | Pass | Pass (10) | Routing delegates codec | Pass | Pass | None |
| `types/conversation.ts` | 88 | Pass | Pass (11) | Tight current attachment union | Pass | Pass | None |
| `utils/contextFiles/contextAttachmentModel.ts` | 277 | Pass | Pass (27) | Current hydration/construction owner | Pass | Pass | None |
| `utils/contextFiles/contextAttachmentPresentation.ts` | 170 | Pass | Pass (34) | Current preview/open owner | Pass | Pass | None |
| `utils/contextFiles/contextAttachmentSend.ts` | 31 | Pass | Pass (24) | Retained/executable plan owner | Pass | Pass | None |
| `utils/contextFiles/contextLocalFileLocatorMigration.ts` | 94 | Pass | Pass (106) | Isolated historical convergence owner; raw recognition precedes ambient current parsing | Pass | Pass | None |

## Legacy / Backward-Compatibility Verdict — Round 7 Historical Implementation Audit

| Check | Result | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms in changed scope | Pass | Runtime is current-only; approved historical reading is isolated to hydration. |
| No legacy old-behavior retention in changed scope | Pass | Old producer/decoder/transport/partition paths are absent. |
| Dead/obsolete code cleanup completeness in changed scope | Pass | No dormant wrapper, duplicate handler, or alternate transport remains. |
| Approved persisted-data transition decision is followed without unnecessary migration work | Pass | Pure read-time migration recognizes exact authored historical forms only; no store rewrite or durable unsupported-metadata transport. |
| No version-specific dual reads/writes or request-time old-shape fallback exists | Pass | Historical forms converge before current use; handler is strict current-only. |
| Approved transition mechanics match the reviewed design, including migration safety only when required | Pass | Exact raw legacy POSIX classification precedes ambient URL construction; exact rebuild rejects adornment/noncanonical encoding; valid results rebuild through the single current codec. |

## Dead / Obsolete / Legacy Items Requiring Removal

None found in the changed scope.

## Docs-Impact Verdict

- Docs impact: `Yes`
- Why: durable Electron/File Explorer docs should describe fixed authority, final reviewed scheme capabilities/security constraints, lifecycle ordering, validation/ranges, preserved PDF/Excel consumers, and viewer failure/Retry after executable validation passes.
- Files or areas likely affected: `autobyteus-web/docs/electron_packaging.md` and `autobyteus-web/docs/file_explorer.md`; delivery owns final sync.

## Material Premise Validation

### Upstream And Prior Material-Premise Decisions

| Premise ID | Current Status | Changed Evidence / Reason |
| --- | --- | --- |
| `MP-AR-004` | `Confirmed` | Current-session/live-echo retention and fresh-reload disappearance remain explicitly approved. |
| `MP-CR-001` | `No Longer Relevant as a blocking premise` | Fixed authority replaced the ambiguous old identity; API/E2E round 2 verified the current protocol/video path. |
| `MP-CR-002` | `Confirmed and resolved` | Exact source, migration, and response evidence preserve POSIX `%5C` identity. |
| `MP-CR-003` | `Confirmed and resolved` | General response fixture is cross-platform; literal POSIX-backslash fixture is skipped only on `win32`, where that filename cannot exist. |
| `MP-CR-004` | `Confirmed and runtime-verified resolved` | API/E2E round 3 proved actual Electron legacy POSIX hydration now converges exactly and AC-010 passes. |
| `MP-CR-005` | `Confirmed` | Existing PDF and Excel viewer consumers use XHR/fetch with canonical local-file URLs; the reviewed two privileges block those requests before the handler in both HTTP and packaged-file-origin execution. |

### `MP-CR-004` — registered-renderer URL normalization occurs inside the raw migration owner

- Origin: `New`
- Related approved requirement or established contract: `FR-005`, `FR-007`, `AC-010`; valid raw legacy empty-authority POSIX locators must transition before current presentation or send.
- Relevant behavior ID(s): `BEH-005`, `DS-006`
- Product-supported initiating trigger or governing contract, with evidence: Context Files paste or message/projection hydration supplies an already-authored valid legacy locator such as `local-file:///tmp/.../probe%20image.png`; requirements and design explicitly preserve this supported input.
- Actual production caller/event path from that trigger to the claimed state: `paste/projection -> hydrateContextAttachment -> migrateContextLocalFileLocator -> exact raw legacy classification -> buildLocalFileUrl -> current attachment` in a renderer after `{ standard: true, stream: true }` registration.
- Lifecycle preconditions and material consequence at the claimed point: Electron 42.4.1 would reclassify the first path segment if ambient `URL` received the raw locator. The corrected raw branch completes before that call, preserving the supported path and canonical eligibility; current/other historical validation continues through the later parser branches.
- Reachability: `Reachable`
- Review consequence / proportionate response: `CR-004 resolved and runtime-verified`; no further action specific to this premise.

### `MP-CR-005` — preserved viewer requests require a scheme capability contract not present in the reviewed design

- Origin: `New`
- Related approved requirement or established contract: `FR-001`, `FR-006`, `AC-008`; existing PDF and Excel previews must remain functional through the canonical local-file URL.
- Relevant behavior ID(s): `BEH-004`, `DS-005`, `DS-004`
- Product-supported initiating trigger or governing contract, with evidence: a user selects an existing local PDF or Excel/CSV file from the embedded Electron File Explorer; requirements, design, routing policy, and existing viewers explicitly support both types.
- Actual production caller/event path from that trigger to the claimed state: `File item -> File Explorer canonical URL -> FileViewer -> PdfViewer/PDF.js XHR or ExcelViewer/authorizedFetch -> Chromium custom-scheme capability gate -> protocol.handle -> validator/response`.
- Lifecycle preconditions and material consequence at the claimed point: the scheme is registered before ready with only `{ standard: true, stream: true }`; from both HTTP development and `file://` packaged-origin representations, PDF XHR and Excel fetch fail before `protocol.handle`, leaving visible viewer errors instead of the preserved content.
- Reachability: `Reachable`
- Review consequence / proportionate response: `High Design Impact`. The reviewed scheme privilege/security contract cannot satisfy BEH-004. Return to solution design to reconcile required viewer access with least-privilege/security constraints, update exact lifecycle/test expectations, and pass architecture review before implementation resumes.

## Focused Failure-Origin Checks — Round 8

- Scenario validity: confirmed against BEH-004, FR-001, FR-006, AC-008, and the existing FileViewer routes.
- Production reachability: confirmed by `MP-CR-005` and real FileViewer execution under Electron 42.4.1.
- Implementation-origin decision: current source exactly matches design-spec line 638 and the exact lifecycle unit test; no post-review implementation drift exists.
- Test/fixture/environment origin rejected: valid image/audio/text and the same handler/fixtures pass; PDF/Excel requests do not reach the handler. HTTP-origin and packaged-file-origin base modes both fail. Focused differential evidence isolates distinct capability effects and passes all PDF XHR/fetch plus Excel fetch only in the tested combined mode.
- Earlier review-gap statement: the exact Electron 42.4.1 capability matrix required runtime evidence, but round-7 source review should still have challenged the reviewed premise because `ExcelViewer` directly calls `fetch(local-file://...)` while the design explicitly excluded `supportFetchAPI`. PDF's additional XHR/CORS requirement was not reasonably provable from source alone. This partial source-review gap does not change ownership: implementation complied with an inadequate reviewed design.
- No commands were rerun by code review; the canonical round-3 evidence is direct and sufficient for classification.

## Review Scorecard — Round 7 Historical Implementation Audit

No scorecard is recomputed for focused round 8. Round-7 `API/E2E Readiness` and `Runtime Correctness And Behavioral Fidelity` rationales no longer authorize progression for BEH-004; the remaining historical score rows are not reopened by this bounded origin review.

- Overall score (`/10`): `9.5`
- Overall score (`/100`): `94.9`
- Score calculation note: simple average. Every category meets the `9.0` clean-pass threshold; the score does not replace the pass decision.

| Priority | Category | Score | Why This Score | What Is Weak / Holding It Down | What Should Improve |
| --- | --- | ---: | --- | --- | --- |
| `1` | `Data-Flow Spine Inventory and Clarity` | 9.5 | All behaviors/spines are complete and traceable; DS-006 again begins with raw recognition before normalization. | Post-fix realistic execution remains downstream. | Preserve the inventory during execution. |
| `2` | `Ownership Clarity and Boundary Encapsulation` | 9.5 | Every transition, policy, resource, and presentation concern has one owner. | No material boundary weakness. | Preserve the clean cut. |
| `3` | `API / Interface / Query / Command Clarity` | 9.5 | The migration result remains narrow and now separates authored historical syntax from ambient current URL parsing explicitly. | Platform URL/path rules remain detail-sensitive. | Keep raw/current boundary regressions explicit. |
| `4` | `Separation of Concerns and File Placement` | 9.3 | New files match owners; large inherited coordinators changed minimally. | Inherited stores/main remain sizable but under limits. | Keep future policy out of them. |
| `5` | `Shared-Structure / Data-Model Tightness and Reusable Owned Structures` | 9.5 | Shared structures are tight and have singular meanings. | No material model weakness. | Preserve current shapes. |
| `6` | `Naming Quality and Local Readability` | 9.4 | Platform-specific transforms and test intent are explicit. | URL/range/resource rules remain inherently subtle. | Keep focused tests beside owners. |
| `7` | `API/E2E Readiness` | 9.4 | Focused checks, normalization-hostile durable coverage, portable fixtures, cleanup, and scenario inventory are ready. | Post-fix Electron and live Windows execution remain downstream. | Execute the six required scenarios and retain exact evidence. |
| `8` | `Runtime Correctness And Behavioral Fidelity` | 9.5 | The corrected first-step invariant preserves valid legacy POSIX identity while current protocol/video/range and invalid-quarantine paths remain intact. | Post-fix real renderer convergence and representative live viewers still need executable validation. | Rerun the required Electron journeys. |
| `9` | `No Backward-Compatibility / No Legacy Retention` | 9.7 | Runtime is current-only; historical migration is isolated and exact. | No material weakness. | Preserve the boundary. |
| `10` | `Cleanup Completeness` | 9.6 | Obsolete paths and scratch mechanisms remain absent. | Durable docs are downstream. | Delivery should sync docs after executable gates. |

## Findings

### `CR-001` — Standard-scheme and old triple-slash POSIX premises were incompatible

- Status: `Resolved in revised source`
- Previous severity/classification: `Critical / Design Impact`
- Resolution evidence: API/E2E round 2 passed fixed-authority protocol and real-video journeys under Electron 42.4.1.

### `CR-002` — Shared builder rewrote legal POSIX backslashes

- Status: `Resolved`
- Previous severity/classification: `High / Local Fix`
- Resolution: exact platform-aware builder/parser, migration, and response evidence passes.

### `CR-003` — POSIX-only response fixture was unguarded on Windows

- Status: `Resolved`
- Previous severity/classification: `Medium / Local Fix`
- Resolution: portable general response fixture restored; actual POSIX-backslash file test is explicitly skipped only on `win32`; pure contract assertions remain cross-platform.

### `CR-004` — Legacy POSIX hydration depended on runtime `URL` normalization before raw recognition

- Status: `Resolved and runtime-verified`
- Previous severity/classification: `High / Local Fix`
- Affected approved behavior/contracts: `BEH-005`, `DS-006`, `FR-005`, `FR-007`, `AC-010`.
- Material premise: `MP-CR-004` (`Reachable`).
- Resolution: `LEGACY_POSIX_LOCATOR` recognizes the exact authored lower-case empty-authority form before ambient `URL`, decodes once with NUL/malformed rejection, requires an exact legacy rebuild, and uses `buildLocalFileUrl` for the current result. Canonical, legacy Windows, wrong/opaque/adorned/malformed, and `%5C` behavior remain focused-covered.
- Regression evidence: the spec stubs ambient `URL` with the Electron-observed first-segment-as-host behavior; exact migration still succeeds and the global is restored in `finally`.
- Compatibility verdict: no protocol fallback, second wire shape, alternate transport, or consumer bypass was introduced.
- Runtime evidence: API/E2E round 3 proves exact Electron legacy POSIX convergence and the complete AC-010 lifecycle.

### `CR-005` — Reviewed scheme privileges cannot serve preserved PDF XHR and Excel fetch

- Status: `Open`
- Severity: `High`
- Affected approved behavior/contracts: `BEH-004`, `DS-005`, `DS-004`, `FR-001`, `FR-006`, `AC-008`.
- Material premise: `MP-CR-005` (`Reachable`).
- Failure origin: inadequate reviewed design plus a partial earlier source-review gap; not implementation drift, stale test, fixture/environment failure, or requirement redefinition.
- Source/design evidence: `local-file-protocol.ts` and its lifecycle test implement exactly `{ standard: true, stream: true }`, as design-spec line 638 mandates. `PdfViewer` passes the canonical URL to PDF.js XHR; `ExcelViewer` passes it to `authorizedFetch`/Fetch API.
- Runtime evidence: under actual Electron 42.4.1, PDF reports unexpected response `0` and Excel reports `Failed to fetch`; neither request reaches `protocol.handle`. Image, audio, thumbnails, text, protocol, security, video, and UI scenarios pass.
- Differential evidence: the failure reproduces from HTTP and packaged `file://` origins. In the focused matrix, the fetch-only mode serves neither viewer; the CORS-only mode serves PDF XHR but not fetch; the combined tested mode serves PDF XHR/fetch and Excel fetch with exact handler `200` bytes. This establishes a design input, not an instruction to enable both flags blindly.
- Review-gap statement: round-7 review should have challenged excluding `supportFetchAPI` while a preserved in-scope Excel consumer directly uses `fetch(local-file://...)`. The additional PDF XHR/CORS interaction required realistic runtime evidence and was appropriately downstream.
- Required action:
  1. revise the solution package's BEH-004/DS-005 scheme-capability contract using the retained round-3 differential evidence;
  2. evaluate least privilege, renderer origins, CORS/fetch exposure, and FR-005's no-general-filesystem-capability constraint before selecting any privilege or alternate owned byte-delivery design;
  3. define the exact reviewed lifecycle declaration, allowed dependency/ownership path, and durable unit/integration assertions for PDF XHR and Excel fetch without adding an unreviewed fallback or duplicate transport;
  4. update investigation/design and any affected requirement wording or supplemental evidence status, then return through architecture review;
  5. after reviewed implementation/test rework, rerun `E2E-REG-001` first for PDF XHR and Excel fetch from representative origins, then all six scenarios.
- Classification: `Design Impact`
- Owner: `solution_designer`

## Classification

`Design Impact — the explicit reviewed scheme privilege contract cannot satisfy preserved BEH-004 consumers`

## Recommended Recipient

`solution_designer`

## Residual Risks

- PDF and Excel local previews remain broken under the current reviewed privileges; AC-008 blocks release sign-off.
- Adding renderer fetch/CORS capability without reviewing its interaction with absolute-path access and FR-005 could widen local-file byte access; the differential flags are evidence, not an approved patch.
- Live Windows execution remains residual; deterministic Windows codec/migration coverage is portable and active.
- Chromium codec support remains platform/container dependent and is contained by the generic failure state.
- Newly unsupported metadata intentionally disappears after fresh reload under approved Option 1.
- Post-stat source mutation can still fail a stream; cleanup and viewer containment are present, while mutation reconciliation is out of scope.

## Latest Authoritative Result

- Review Decision: `Fail`
- Review Entry Point: `API/E2E Failure-Origin Review`
- Material-Premise Gate: `Fail — MP-CR-005 is reachable and contradicts the reviewed privilege design`
- Score Summary: `Not recomputed for focused round 8`; round-7 `9.5/10` (`94.9/100`) is historical and no longer authorizes progression.
- Failure Origin: `Design Impact with partial earlier source-review gap` — the implementation follows an explicit two-privilege design that cannot serve the supported PDF XHR and Excel fetch consumers.
- Recommended Recipient: `solution_designer`
- Notes: Revise the scheme capability/security design and return through architecture review before implementation resumes. `CR-001` through `CR-004` remain resolved; five of six round-3 scenarios pass, and `E2E-REG-001` is the only current failure.
