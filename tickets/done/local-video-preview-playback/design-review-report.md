# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/local-video-preview-playback/tickets/in-progress/local-video-preview-playback/requirements.md`
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/local-video-preview-playback/tickets/in-progress/local-video-preview-playback/investigation-notes.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/local-video-preview-playback/tickets/in-progress/local-video-preview-playback/design-spec.md`
- Supplemental Task Artifacts Reviewed:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/local-video-preview-playback/tickets/in-progress/local-video-preview-playback/runtime-probe-evidence.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/local-video-preview-playback/tickets/in-progress/local-video-preview-playback/url-identity-probe-evidence.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/local-video-preview-playback/tickets/in-progress/local-video-preview-playback/fetch-capability-probe-evidence.md`
- Current Review Round: `6`
- Trigger: `CR-005` / `MP-CR-005` Design Impact after real PDF.js XHR and Excel Fetch failed before `protocol.handle` under the reviewed two-privilege scheme.
- Prior Review Round Reviewed: `5`
- Latest Authoritative Round: `6`
- Current-State Evidence Basis: Explicitly approved video and unsupported-locator outcomes; cumulative core package and three supplements; current source at reviewed baseline `b658f16b53e494a5649e3a72cc136fdf039ff8df`; Electron 42.4.1 type definitions; code-review round-8 failure-origin report; API/E2E round-3 execution report; retained HTTP/file privilege matrix; retained ungated/gated requester-frame differential; current default-session, shell-registry, window-lifecycle, and browser-partition code.

## Round History

| Round | Trigger | Prior Unresolved Findings Rechecked | New Findings Found | Review Decision | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Initial approved solution package | N/A | None | `Pass` | No | Superseded after realistic Electron execution exposed the standard-scheme URL-identity conflict. |
| 2 | Revised fixed-authority package after `CR-001` | N/A | `AR-001`, `AR-002` | `Fail` / `Requirement Gap` | No | Required the raw external-locator transition and observable handler contract. |
| 3 | Revised migration/current-model package | `AR-001`, `AR-002` | `AR-003` | `Fail` / `Design Impact` | No | Unsupported current state still entered executable attachment transport. |
| 4 | Revised submission-plan/live-projection package | `AR-003` | `AR-004` | `Fail` / `Requirement Gap` | No | The new fresh-reload outcome required a user decision. |
| 5 | Explicit user choice of Option 1 | `AR-004` | None | `Pass` | No | Superseded after API/E2E proved the reviewed privilege set broke preserved PDF/Excel consumers. |
| 6 | Revised capability and requester-authorization design after `CR-005` | `AR-001` through `AR-004` | None | `Pass` | Yes | Exact four privileges are coupled to a default-session, live-workspace-main-frame gate before the existing handler. |

## Prior Findings Resolution Check (Mandatory On Round >1)

| Prior Round | Finding ID | Previous Severity | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| 2 | `AR-001` | High | `Remains Resolved` | Valid legacy raw locators transition through the isolated hydrator migration into current canonical state; historical records remain readable; the protocol remains current-only. | CR-005 changes no locator-transition owner. |
| 2 | `AR-002` | High | `Remains Resolved` | Requirements and design retain the proven split between raw-ingress enforcement and normalized-handler guarantees. | The pre-handler requester gate is independent of authored-URL adornment observability. |
| 3 | `AR-003` | High | `Remains Resolved` | DS-006 retains the current-kind submission plan, both run-store consumers, executable-array exclusion, current-message retention, and identity-matched live-echo merge. | CR-005 changes no web/server/runtime attachment contract. |
| 4 | `AR-004` | Medium | `Remains Resolved` | The user's approved Option-1 lifecycle remains explicit: current-session/live-echo retention and fresh-reload disappearance for newly unsupported metadata. | Valid attachment durability remains unchanged. |

`CR-005` was not an earlier architecture-review finding; it is the confirmed downstream trigger for this round. Its design consequence is resolved by the revised scheme capability and requester-authorization contract reviewed below.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed`
- Approved requirements / intended behavior understood: Supported local video metadata/play/pause/seek and accessible failure-with-Retry remain approved. Option 1 for newly unsupported locator metadata remains approved. Existing PDF/Excel/image/audio/text/context-thumbnail behavior is a preserved contract rather than a new feature.
- Relevant existing behavior and evidence confirmed: At baseline, the fixed-authority/range/stream implementation passes image, audio, text, thumbnails, video, locator migration, and UI scenarios. Real PDF.js XHR and Excel Fetch do not reach the two-privilege handler from HTTP or packaged-representative `file://` shell origins. Electron 42.4.1 requires both `supportFetchAPI` and `corsEnabled` for those consumers; ungated use exposes bytes to foreign-HTTP and same-origin Blob child frames. `onBeforeRequest` retains exact frame identity that `protocol.handle` lacks.
- Approved change, preserved behavior, and outside scope understood: Extend only the protocol capability/lifecycle boundary and live shell identity query. Preserve viewer source, canonical URL, validator, response/range/stream, locator transition/submission, and VideoPlayer owners. No viewer-specific byte transport, browser-partition handler, token path, unrestricted `file://`, web-security relaxation, or extra scheme privilege is in scope.
- Remaining material ambiguity, if any: None. Real PDF.js execution-context and Electron frame-lifecycle behavior remain implementation-validation risks with fail-closed behavior, not undefined design intent.

| Behavior ID | Kind | Design Alignment With Approved Intent | Approved Trigger / Contract And Current-State Evidence | Target Outcome / Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | Pass | Pass | Pass | Confirmed | None. |
| BEH-002 | User | Pass | Pass | Pass | Confirmed | None. |
| BEH-003 | Contract | Pass | Pass | Pass | Confirmed | Implement the inseparable four-capability plus exact-main-frame gate and retain validation/range/stream policy. |
| BEH-004 | Contract | Pass | Pass | Pass | Confirmed | Preserve document viewers and prove real HTTP/file main-frame PDF/Excel plus child-frame denial in `E2E-REG-001`. |
| BEH-005 | User / persisted contract | Pass | Pass | Pass | Confirmed | None beyond preserving the reviewed DS-006 behavior. |

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose And Scope Are Clear? | Linked To Relevant Core Artifacts? | Internally Complete? | Consistent With Related Core Artifacts? | Status And Approval Applicability Are Clear? | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| `runtime-probe-evidence.md` | Pass | Pass | Pass | Pass | Pass | None. |
| `url-identity-probe-evidence.md` | Pass | Pass | Pass | Pass | Pass | None. |
| `fetch-capability-probe-evidence.md` | Pass | Pass | Pass | Pass | Pass | Preserve the raw matrix/gate evidence and rerun the designated realistic scenarios after source review. |

The supplement inventory in `investigation-notes.md` is canonical, and each evidence-only supplement is linked from every materially supported core artifact with approval applicability `N/A`.

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | Bug-fix posture and cumulative boundary/ownership causes are explicit. | None. |
| Root-cause classification is explicit and evidence-backed | Pass | The missing cross-process URL owner and omitted scheme/requester-frame invariant are tied to real Electron 42.4.1 failures and differential evidence. | None. |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | The design calls for a bounded extension of the protocol lifecycle owner and shell identity registry while preserving passing owners. | None. |
| Refactor decision is supported by concrete design sections or residual-risk rationale | Pass | Spines, interfaces, file mapping, rejected alternatives, sequence, tests, and residual risks all implement the same correction. | None. |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? | Narrative Is Clear? | Facade Vs Governing Owner Is Clear? | Main Domain Subject Naming Is Clear? | Ownership Is Clear? | Off-Spine Concerns Stay Off Main Line? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Supported local-video selection through playable/seekable controls | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-002 | Media/resource failure return | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-003 | Retry through a fresh media attempt | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-004 | Default-session request authorization through validated response/resource cleanup | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-005 | Preserved non-video/context-thumbnail viewer paths | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-006 | Raw locator through migration, presentation, submission, echo, runtime, and reload | Pass | Pass | Pass | Pass | Pass | Pass | Pass |

DS-004 now starts before `protocol.handle`, so the capability grant, requester authorization, normalized URL, filesystem validation, response, and cleanup are represented as one complete security/resource spine. DS-005 reaches the real PDF.js XHR and Excel Fetch consumers rather than stopping at URL construction.

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? | Internal Owned Mechanisms Stay Internal? | Caller Bypass Risk Is Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Context locator migration via `hydrateContextAttachment` | Pass | Pass | Pass | Pass | Historical syntax stays isolated. |
| Current submission eligibility via `planContextAttachmentSubmission` | Pass | Pass | Pass | Pass | One current-kind policy serves both stores. |
| Identity-matched live projection merge | Pass | Pass | Pass | Pass | Member-input-only merge avoids external-user contamination. |
| Shared local-file URL codec | Pass | Pass | Pass | Pass | Current wire identity only; no authorization claim. |
| `WorkspaceShellWindowRegistry.isOwnedMainFrame` | Pass | Pass | Pass | Pass | Registry owns live exact identity only, not allow/cancel or URL/file policy. |
| `registerLocalFileProtocolScheme` / `installLocalFileProtocol` | Pass | Pass | Pass | Pass | One owner couples exact privileges, filtered pre-handler gate, and one handler. Current source has no competing `onBeforeRequest` listener. |
| Local response / validator / byte stream | Pass | Pass | Pass | Pass | Allowed requests still pass through the unchanged trusted file boundary. |
| Video and document viewer boundaries | Pass | Pass | Pass | Pass | Video recovery stays local; PDF/Excel remain unchanged protocol consumers. |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? | Forbidden Shortcuts Are Explicit? | Direction Is Coherent With Ownership? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Hydration -> migration -> current URL builder | Pass | Pass | Pass | Pass | Sound. |
| Run stores -> submission plan -> unchanged streaming services | Pass | Pass | Pass | Pass | Sound. |
| Renderer producers -> shared codec | Pass | Pass | Pass | Pass | Sound. |
| `main.ts` -> protocol lifecycle with injected registry predicate | Pass | Pass | Pass | Pass | Bootstrap remains thin; protocol does not enumerate windows and registry does not own request policy. |
| Protocol lifecycle -> default-session `webRequest` -> handler | Pass | Pass | Pass | Pass | The listener precedes the handler and is the sole default-session owner for this event. |
| Handler -> response -> codec/validator/stream/MIME | Pass | Pass | Pass | Pass | Requester authorization cannot be bypassed by a second handler or alternate byte path. |
| Document viewers -> existing URL transport | Pass | Pass | Pass | Pass | No IPC/Blob/token fallback or Electron dependency enters the viewers. |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? | Responsibility Is Singular? | Identity Shape Is Explicit? | Generic Boundary Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `migrateContextLocalFileLocator` | Pass | Pass | Pass | Low | Pass |
| `planContextAttachmentSubmission` | Pass | Pass | Pass | Low | Pass |
| `upsertUserMessageByIdentity(...retainExistingNonExecutable...)` | Pass | Pass | Pass | Low | Pass |
| `buildLocalFileUrl` / `parseLocalFileUrl` | Pass | Pass | Pass | Low | Pass |
| `WorkspaceShellWindowRegistry.isOwnedMainFrame(webContentsId, frame)` | Pass | Pass | Pass | Low | Pass |
| `registerLocalFileProtocolScheme()` | Pass | Pass | Pass | Low | Pass |
| `installLocalFileProtocol({ isOwnedMainFrame })` | Pass | Pass | Pass | Low | Pass |
| `createLocalFileResponse` / validator / byte stream | Pass | Pass | Pass | Low | Pass |
| Viewer component contracts | Pass | Pass | Pass | Low | Pass |

The protocol gate rejects absent identity before calling the non-null registry query; the registry performs live lookup and strict object equality. This keeps optional Electron event fields out of the shell registry contract.

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? | Reuse / Extension Decision Is Sound? | New Support Piece Is Justified? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Cross-process URL identity and legacy locator transition | Pass | Pass | Pass | Pass | Prior reviewed owners remain sound. |
| Current submission and live message projection | Pass | Pass | N/A | Pass | Preserve passing DS-006 owners. |
| Local-file response/validation/range/stream | Pass | Pass | N/A | Pass | Real execution already validates these owners. |
| Scheme capabilities and pre-handler request authorization | Pass | Pass | Pass | Pass | Extend the existing protocol owner; exact Electron evidence justifies one filtered gate. |
| Live workspace-shell identity | Pass | Pass | N/A | Pass | The existing registry and live shell expose the precise identity required. |
| PDF.js XHR and Excel Fetch | Pass | Pass | N/A | Pass | Preserve existing consumers; do not create another byte transport. |
| Browser isolation | Pass | Pass | N/A | Pass | The existing `persist:autobyteus-browser` session remains outside the handler/gate. |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? | Reuse / Extend / Create-New Decision Is Sound? | Supports The Right Spine Owners? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Shared local-file URL contract | Pass | Pass | Pass | Pass | Preserve. |
| Context migration/model/presentation/submission/projection | Pass | Pass | Pass | Pass | Preserve. |
| Electron local-file protocol lifecycle/authorization | Pass | Pass | Pass | Pass | Exact capability and request policy remain under one public owner. |
| Workspace shell identity | Pass | Pass | Pass | Pass | Narrow registry extension only. |
| Local response/validation/stream | Pass | Pass | Pass | Pass | Remains behind authorization. |
| File Explorer document/media viewers | Pass | Pass | Pass | Pass | Preserve existing consumer ownership. |
| Browser runtime/session | Pass | Pass | Pass | Pass | Remains isolated and unchanged. |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? | Shared File Choice Is Sound? | Ownership Of Shared Structure Is Clear? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Current local-file URL codec | Pass | Pass | Pass | Pass | Preserve. |
| Raw locator migration and submission plan | Pass | Pass | Pass | Pass | Preserve. |
| Workspace-shell lookup | Pass | Pass | Pass | Pass | Extend the existing registry; do not add a second authorization registry. |
| Request allow/cancel policy | Pass | N/A | Pass | Pass | One small callback stays in `local-file-protocol.ts`; a new file would be empty indirection. |
| File byte window / response plan / media attempt | Pass | Pass | Pass | Pass | Preserve. |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Overlapping Representation Risk Is Controlled? | Shared Core Vs Specialized Variant / Composition Decision Is Sound? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Canonical local-file URL identity | Pass | Pass | Pass | Pass | Pass | One current wire representation. |
| Locator migration result / unsupported attachment variant | Pass | Pass | Pass | Pass | Pass | Preserve. |
| `ContextAttachmentSubmissionPlan` | Pass | Pass | Pass | Pass | Pass | Preserve. |
| Requester identity pair (`webContentsId`, `WebFrameMain`) | Pass | Pass | Pass | Pass | Pass | No URL/origin/path fields are mixed into the identity query. |
| `FileByteWindow` / private range plan | Pass | Pass | Pass | Pass | Pass | Preserve. |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? | Responsibility Matches The Intended Owner/Boundary? | Responsibilities Were Re-Tightened After Shared-Structure Extraction? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Shared codec and context migration/submission files | Pass | Pass | Pass | Pass | Preserve prior reviewed responsibilities. |
| Agent/team stores and projection handlers | Pass | Pass | Pass | Pass | Preserve prior reviewed responsibilities. |
| `electron/local-file-protocol/local-file-protocol.ts` | Pass | Pass | Pass | Pass | Owns exact descriptor, filtered gate, order, and handler; detailed response remains delegated. |
| `electron/shell/workspace-shell-window-registry.ts` | Pass | Pass | Pass | Pass | Adds only the live exact-main-frame identity query. |
| `local-file-response.ts`, `file-byte-stream.ts`, `localFileValidation.ts` | Pass | Pass | Pass | Pass | No CR-005 source change is designed. |
| `electron/main.ts` | Pass | Pass | Pass | Pass | Passes the narrow live identity dependency only. |
| `PdfViewer.vue`, `ExcelViewer.vue`, `authorizedTransport.ts` | Pass | Pass | N/A | Pass | Explicit no-source-change preservation. |
| VideoPlayer/localization/package/docs | Pass | Pass | N/A | Pass | Preserve except later delivery docs sync. |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? | Folder Matches Owning Boundary? | Mixed-Layer Or Over-Split Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `shared/localFileUrl.ts` | Pass | Pass | Low | Pass | Correct cross-process contract location. |
| `utils/contextFiles/`, run stores, and streaming handlers | Pass | Pass | Low | Pass | Preserve. |
| `electron/local-file-protocol/` | Pass | Pass | Low | Pass | Scheme-level authority belongs in the existing cohesive folder. |
| `electron/shell/workspace-shell-window-registry.ts` | Pass | Pass | Low | Pass | Correct existing live-shell identity owner. |
| Viewer and browser-session paths | Pass | Pass | Low | Pass | Viewers and isolated browser runtime remain unchanged. |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? | Replacement Owner / Structure Is Clear? | Removal / Decommission Scope Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Inline protocol owner, old `net.fetch(file:)`, old URL shapes, duplicate serializers | Pass | Pass | Pass | Pass | Prior removals remain preserved. |
| Type-only attachment partition and unsafe raw locator pass-through | Pass | Pass | Pass | Pass | Prior clean cut remains preserved. |
| Two-privilege lifecycle expectation | Pass | Pass | Pass | Pass | Replace exact test/source expectation with the four-capability descriptor. |
| Ungated four-capability shape | Pass | Pass | Pass | Pass | Explicitly rejected; the gate and privileges land together. |
| Viewer-specific IPC/Blob/token/fallback transport | Pass | Pass | Pass | Pass | Explicitly excluded; no decommission debt is introduced. |
| Main-process `net.fetch` test bypass | Pass | Pass | Pass | Pass | Replace the realistic harness path with authorized main-frame requests and assert identity-less cancellation. |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? | Clean-Cut Removal Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- |
| Electron protocol/runtime parser | No | Pass | Pass | Current fixed-authority only. |
| Context hydration migration | No | Pass | Pass | Historical recognition remains isolated before current-model use. |
| Scheme capability/authorization | No | Pass | Pass | One capability set, one gate, one handler, one session. |
| PDF/Excel transport | No | Pass | Pass | Existing transport is restored rather than paired with a fallback. |

## Persisted-Data Transition Verdict (When Applicable)

| Area / Stored Subject | Approved Decision | Representative Reader / Semantic / Invariant Evidence Is Sufficient? | Direct Use, Rebuild, Or Migration Choice Is Proportionate? | Migration Safety Is Complete If Required? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Source files, workspace paths, and derived runtime URLs | `Not Affected` / directly usable | Pass | Pass | N/A | Pass | CR-005 changes no data shape or source bytes. |
| Existing valid legacy and unsupported locator records | `Migration Required` | Pass | Pass | Pass | Pass | Pure hydration transition remains unchanged. |
| Newly submitted unsupported locator metadata | Approved client-session quarantine / no durable write | Pass | Pass | N/A | Pass | The user's Option-1 decision remains unchanged. |

## Change / Refactor Safety Verdict

| Area | Sequence Is Realistic? | Temporary Seams Are Explicit? | Cleanup / Removal Is Explicit? | Verdict |
| --- | --- | --- | --- | --- |
| Registry identity query before protocol integration | Pass | Pass | Pass | Pass |
| Exact descriptor plus gate-before-handler installation | Pass | Pass | Pass | Pass |
| Thin bootstrap dependency injection | Pass | Pass | Pass | Pass |
| Preserve passing response/viewer/context owners | Pass | Pass | Pass | Pass |
| Source review, first-run regression, adapted protocol harness, full scenario rerun | Pass | Pass | Pass | Pass |

The sequence keeps the new session-wide capabilities inseparable from their pre-handler authorization and forbids a test-only bypass.

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? | Example Is Present And Clear? | Bad / Avoided Shape Is Explained When Helpful? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Fixed POSIX/Windows identity and raw migration | Yes | Pass | Pass | Pass | Preserve. |
| Exact privilege descriptor | Yes | Pass | Pass | Pass | Four required flags and every excluded privilege are explicit. |
| Request-frame authorization | Yes | Pass | Pass | Pass | Exact live object identity is contrasted with URL/header checks and ungated access. |
| Document-viewer preservation | Yes | Pass | Pass | Pass | Existing XHR/Fetch consumers and rejected duplicate transports are concrete. |
| Authorized E2E method/range harness | Yes | Pass | Pass | Pass | Main-frame matrix and identity-less `net.fetch` denial are distinguished. |

## Material Premise Validation (Only When Needed)

### `MP-CR-005` — preserved PDF/Excel consumers require both added capabilities, and ungated capabilities expose child frames

- Related approved requirement or established contract: `FR-001`, `FR-005`, `FR-006`, `FR-007`; `AC-007`, `AC-008`, `AC-009`.
- Relevant behavior ID(s): `BEH-003`, `BEH-004`; `DS-004`, `DS-005`.
- Product-supported initiating trigger or governing contract, with evidence: A user selects a supported local PDF or Excel file in the Electron Files viewer. Current `PdfViewer` uses PDF.js XHR and `ExcelViewer` uses `authorizedFetch`; real Electron 42.4.1 execution from HTTP and packaged-representative `file://` shell origins records both failing before the two-privilege handler.
- Concrete current or approved target production caller/event path from that trigger to the claimed state: `File item -> File Explorer canonical local-file URL -> FileViewer -> PdfViewer/PDF.js XHR or ExcelViewer/Fetch -> Chromium scheme capability gate -> default-session onBeforeRequest -> protocol.handle -> canonical parser -> validator/response`. The retained four-capability differential reaches exact bytes; the ungated/gated differential shows foreign-HTTP and sandboxed Blob child-frame requests before and after exact-main-frame authorization.
- Lifecycle preconditions and material consequence at the claimed point: Scheme privileges are declared pre-ready and apply session-wide; the workspace shell uses the default session, while browser views use `persist:autobyteus-browser`. Without both added privileges, preserved viewers fail. With both but without a gate, executable child frames receive local bytes. `protocol.handle` lacks usable requester headers; `onBeforeRequest` retains `webContentsId` and `WebFrameMain` and cancels unauthorized requests before bytes.
- Reachability: `Reachable`
- Review consequence / proportionate response: Extend the existing local-file lifecycle owner with exactly `supportFetchAPI` and `corsEnabled`, coupled to one scheme-filtered exact-live-main-frame gate before the existing handler. Reuse the existing registry identity and response transport; reject viewer-specific bytes, origin-string authorization, browser-session installation, and test bypasses. Require realistic PDF/Excel and child-frame proof after implementation.

## Unresolved Approved-Behavior Or Current-State Gaps

None.

## Review Decision

`Pass` — the round-6 package resolves the reachable `CR-005` Design Impact with one evidence-backed, fail-closed requester boundary. The behavior basis is complete, all prior architecture findings remain resolved, ownership and dependency directions are coherent, and the design is actionable for bounded implementation rework.

## Findings

None.

## Classification

`N/A — Pass`

## Recommended Recipient

`implementation_engineer`

## Residual Risks

- Real PDF.js internals may issue from a worker/non-main identity, and Electron may report a null/destroyed frame. The reviewed policy intentionally fails closed; `E2E-REG-001` from representative HTTP and packaged `file://` shell origins is authoritative before broader reruns.
- The implementation must preserve strict main-frame object equality across multiple shell windows, navigation/reload, closed/destroyed shells, and same-`webContentsId` subframes. The registry must use live state rather than cached frame identity.
- Electron allows one listener per `webRequest` event. Current source has no competing listener; the protocol owner must remain the sole default-session `onBeforeRequest` owner and future policies must compose there.
- Main-process `net.fetch` lacks an authorized renderer identity and must be canceled. The realistic protocol matrix therefore needs the approved shell-main-frame harness; no test-only gate bypass is acceptable.
- Exact capability and requester semantics can drift across Electron versions. Retain the versioned privilege matrix plus frame allow/cancel/handler witnesses.
- Windows live execution remains unavailable on this macOS host; explicit-platform codec/migration coverage and normal Windows release validation remain required.
- Existing platform codec risk, large-seek cancellation/cleanup, context-union exhaustiveness, hydration idempotence, mixed team echo, and current-session unsupported-metadata risks remain as recorded upstream.
- After implementation source review, run `E2E-REG-001` first, then preserve and rerun `E2E-PROTO-001`, `E2E-SEC-001`, `E2E-VID-001`, `E2E-VID-002`, `E2E-UI-001`, and `E2E-REG-001` under Electron 42.4.1.

## Latest Authoritative Result

- Review Decision: `Pass`
- Material-Premise Gate: `Pass`
- Notes: Round 6 supersedes round 5. `AR-001` through `AR-004` remain resolved; `MP-CR-005` is confirmed and answered proportionately by the exact four-capability plus registered-workspace-main-frame design. The cumulative reviewed package is ready for `implementation_engineer`.
