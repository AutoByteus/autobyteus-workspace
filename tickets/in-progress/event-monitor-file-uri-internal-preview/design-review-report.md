# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-file-uri-internal-preview/tickets/in-progress/event-monitor-file-uri-internal-preview/requirements.md`
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-file-uri-internal-preview/tickets/in-progress/event-monitor-file-uri-internal-preview/investigation-notes.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-file-uri-internal-preview/tickets/in-progress/event-monitor-file-uri-internal-preview/design-spec.md`
- Supplemental Task Artifacts Reviewed: `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-file-uri-internal-preview/tickets/in-progress/event-monitor-file-uri-internal-preview/task.md`; `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-file-uri-internal-preview/tickets/in-progress/event-monitor-file-uri-internal-preview/user-verification-file-uri-display-preservation-report.md`
- Upstream finalized predecessor reviewed: `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-file-uri-internal-preview/tickets/done/event-monitor-absolute-path-file-preview/`
- Current Review Round: 2
- Trigger: Revised cumulative package submitted after round 1 finding AR-URI-001.
- Prior Review Round Reviewed: 1
- Latest Authoritative Round: 2
- Current-State Evidence Basis: Rechecked the revised requirements, investigation notes, design spec, task supplement, predecessor package, and current production paths in the dedicated worktree at base 29912db3b40d0563150d22a4a17e20448e70c997. No implementation has started.

## Round History

| Round | Trigger | Prior Unresolved Findings Rechecked | New Findings Found | Review Decision | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Initial review | N/A | 1 | Fail | No | Found a cross-artifact contradiction for valid but browser/remote-unmapped file URIs. |
| 2 | Revised package review | AR-URI-001 | 0 | Pass | Yes | The package now distinguishes lexical invalidity from activation-time runtime unavailability and aligns the affected artifacts. |

## Prior Findings Resolution Check (Mandatory On Round >1)

| Prior Round | Finding ID | Previous Severity | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| 1 | AR-URI-001 | High | Resolved | task.md, the user-verification supplement, requirements REQ-URI-003/004/005/010/011 and AC-URI-009/010/011-014, investigation BEH-URI-009 and the round 1 resolution record, and design D3/D4/D5/D6/DS-006 now all describe the selected activation-time host-only/unavailable contract. | Lexically invalid, malformed, incomplete, unsupported, or non-empty-authority links are inert. A syntactically valid supported URI remains a valid action; mapping failure returns status before Files, mobile preview, or content access. |

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status (Confirmed/Contradicted/Blocked): **Confirmed**
- Approved requirements / intended behavior understood: Yes. Event Monitor supports only valid, complete, supported, empty-authority file URI destinations; authored labels retain compact Markdown link treatment; explicit activation uses the existing read-only preview path when an owner is available. Lexically invalid or unsupported links remain source-faithful and inert. Syntactically valid but runtime-unmapped browser/remote/mobile links retain the valid affordance and return the existing localized host-only/unavailable result only after explicit activation.
- Relevant existing behavior and evidence confirmed: Yes. The raw MarkdownIt link token is available before sanitization; the existing descriptor registry and delegated renderer are the action boundary; generic external handling is HTTP(S)-only; the existing launcher performs Electron or active-workspace mapping; trusted owners perform content access.
- Approved change, preserved behavior, and outside scope understood: Yes. The change is Event Monitor-only and limited to standard empty-authority file URI destinations. Bare absolute-path actions, FileViewer ownership, Electron trust validation, workspace-relative mapping, mobile bridge, persistence boundaries, ordinary Markdown, and non-file links remain unchanged.
- Remaining material ambiguity, if any: None.

| Behavior ID | Kind | Design Alignment With Approved Intent (`Pass`/`Fail`) | Approved Trigger / Contract And Current-State Evidence (`Pass`/`Fail`/`Unclear`) | Target Outcome / Path / Spine Coherence (`Pass`/`Fail`/`Unclear`) | Status (`Confirmed`/`Needs Correction`/`Unclear`) | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-URI-001 | User | Pass | Pass | Pass | Confirmed | Add URI resolution at the existing raw link-token seam. |
| BEH-URI-002 | User/Contract | Pass | Pass | Pass | Confirmed | Neutralize invalid `file:` markers before generic external handling. |
| BEH-URI-003 | User/System | Pass | Pass | Pass | Confirmed | Preserve the authored label and compact valid-action treatment; use the selected runtime status contract when mapping is unavailable. |
| BEH-URI-004 | Contract/Security | Pass | Pass | Pass | Confirmed | Reuse absolute-path completeness and supported-preview policy. |
| BEH-URI-005 | Contract | Pass | Pass | Pass | Confirmed | Retain raw provenance in memory and safe IDs only in sanitized HTML. |
| BEH-URI-006 | Contract/Security | Pass | Pass | Pass | Confirmed | Reuse trusted Electron and active-workspace/mobile authorization owners. |
| BEH-URI-007 | User/System | Pass | Pass | Pass | Confirmed | Keep resolution pure and activation-only. |
| BEH-URI-008 | Contract | Pass | Pass | Pass | Confirmed | Keep non-file and non-Event-Monitor behavior unchanged. |
| BEH-URI-009 | User/System | Pass | Pass | Pass | Confirmed | Return localized host-only/unavailable status before any preview/content request when runtime mapping is absent. |

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose And Scope Are Clear? (`Pass`/`Fail`) | Linked To Relevant Core Artifacts? (`Pass`/`Fail`) | Internally Complete? (`Pass`/`Fail`) | Consistent With Related Core Artifacts? (`Pass`/`Fail`) | Status And Approval Applicability Are Clear? (`Pass`/`Fail`) | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| `user-verification-file-uri-display-preservation-report.md` | Pass | Pass | Pass | Pass | Pass | None; the revised supplement records the clarified runtime status distinction. |
| Finalized predecessor package | Pass | Pass | Pass | Pass | Pass | None; treated as upstream contract/context, not modified by this ticket. |

## Task Design Health Assessment Verdict

| Assessment Area | Result (`Pass`/`Fail`) | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | The design identifies a narrow protocol-link extension and navigation-safety correction. | None. |
| Root-cause classification is explicit and evidence-backed | Pass | The raw-token parser and invalid-file event boundary are identified from current code. | None. |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | No broad refactor; extend the existing policy/render-model seams. | None. |
| Refactor decision is supported by concrete design sections or residual-risk rationale | Pass | The three-way resolver, markers, event ordering, file mapping, and test sequence are concrete. | None. |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? (`Pass`/`Fail`) | Narrative Is Clear? (`Pass`/`Fail`) | Facade Vs Governing Owner Is Clear? (`Pass`/`Fail`/`N/A`) | Main Domain Subject Naming Is Clear? (`Pass`/`Fail`) | Ownership Is Clear? (`Pass`/`Fail`) | Off-Spine Concerns Stay Off Main Line? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| D1 | Raw URI classification | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| D2 | Sanitized visual render | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| D3 | Explicit activation | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| D4 | Environment-specific preview | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| D5 | Activation return/status | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| D6 | Pure URI/path policy loop | Pass | Pass | Pass | Pass | Pass | Pass | Pass |

D4/D5 now clearly distinguish a valid action-time mapping refusal from a lexical-invalid render-time inert result.

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? (`Pass`/`Fail`) | Internal Owned Mechanisms Stay Internal? (`Pass`/`Fail`) | Caller Bypass Risk Is Controlled? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Raw Markdown token -> URI policy | Pass | Pass | Pass | Pass | The proposed three-way resolver separates non-file, valid, and invalid-file outcomes. |
| Policy -> sanitized HTML | Pass | Pass | Pass | Pass | Only safe action/inert markers are emitted; raw paths stay out of HTML. |
| DOM -> typed action/no-op | Pass | Pass | Pass | Pass | Valid action markers are handled before generic links; invalid markers are consumed. |
| Event Monitor launcher -> File Explorer | Pass | Pass | Pass | Pass | Runtime-unmapped status is explicitly returned before Files/mobile/content access. |
| File Explorer -> trusted bytes | Pass | Pass | Pass | Pass | Existing Electron/server boundaries remain authoritative. |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? (`Pass`/`Fail`) | Forbidden Shortcuts Are Explicit? (`Pass`/`Fail`) | Direction Is Coherent With Ownership? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| URI utility | Pass | Pass | Pass | Pass | Pure path/type policy only. |
| `useMarkdownSegments` | Pass | Pass | Pass | Pass | Token decoration and sanitization, no preview/I/O. |
| `MarkdownRenderer` | Pass | Pass | Pass | Pass | DOM/event authority, no raw href authorization. |
| Existing launcher/viewer | Pass | Pass | Pass | Pass | Reuses predecessor owners; the mapping outcome is now explicitly defined. |
| Generic Markdown/external-link path | Pass | Pass | Pass | Pass | Capability-off behavior remains unchanged. |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? (`Pass`/`Fail`) | Responsibility Is Singular? (`Pass`/`Fail`) | Identity Shape Is Explicit? (`Pass`/`Fail`) | Generic Boundary Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- |
| `resolveEventMonitorMarkdownFileDestination(rawDestination)` | Pass | Pass | Pass | Low | Pass |
| `AbsoluteFilePathAction.rawDestination?` | Pass | Pass | Pass | Low | Pass |
| Valid/inert HTML markers | Pass | Pass | Pass | Low | Pass |
| `file-path-action` event | Pass | Pass | Pass | Low | Pass |
| Existing `useEventMonitorFilePreview.openPath` | Pass | Pass | Pass | Medium | Pass |
| Activation-time unmapped status | Pass | Pass | Pass | Low | Pass |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? (`Pass`/`Fail`) | Reuse / Extension Decision Is Sound? (`Pass`/`Fail`) | New Support Piece Is Justified? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| URI/path policy | Pass | Pass | Pass | Pass | Extend `absoluteFilePathAction.ts`; do not create a second action model. |
| Markdown token/render model | Pass | Pass | N/A | Pass | Existing `useMarkdownSegments` seam is the correct owner. |
| DOM activation and generic links | Pass | Pass | N/A | Pass | Existing `MarkdownRenderer`/external resolver remain the owners. |
| File preview and trusted content | Pass | Pass | N/A | Pass | No viewer, endpoint, or Electron ownership change is needed. |
| Invalid and runtime-unmapped presentation | Pass | Pass | N/A | Pass | Lexical-invalid links are inert; valid runtime-unmapped links use the existing localized status path. |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? (`Pass`/`Fail`) | Reuse / Extend / Create-New Decision Is Sound? (`Pass`/`Fail`) | Supports The Right Spine Owners? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Event Monitor Markdown capability | Pass | Pass | Pass | Pass | Raw-token protocol classification is scoped to the existing capability. |
| File URI/path policy | Pass | Pass | Pass | Pass | Pure resolver delegates completeness/type policy. |
| Event Monitor launcher/File Explorer | Pass | Pass | Pass | Pass | It owns runtime mapping, status, and read-only preview coordination. |
| Trusted Electron/remote boundaries | Pass | Pass | Pass | Pass | Existing security owners remain unchanged. |
| Durable coverage | Pass | Pass | Pass | Pass | Focused unit/component/browser scenarios are mapped. |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? (`Pass`/`Fail`) | Shared File Choice Is Sound? (`Pass`/`Fail`/`N/A`) | Ownership Of Shared Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `AbsoluteFilePathAction` | Pass | Pass | Pass | Pass | URI and bare-path actions share one preview identity. |
| Three-way URI resolution result | Pass | Pass | Pass | Pass | A private policy result is appropriate and prevents invalid-file fall-through. |
| Render-scoped action/inert markers | Pass | Pass | Pass | Pass | Markers are safe IDs/booleans and not authorization data. |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Pass`/`Fail`) | Redundant Attributes Removed? (`Pass`/`Fail`) | Overlapping Representation Risk Is Controlled? (`Pass`/`Fail`) | Shared Core Vs Specialized Variant / Composition Decision Is Sound? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `AbsoluteFilePathAction` plus optional raw provenance | Pass | Pass | Pass | Pass | Pass | Canonical path/type/action identity stays separate from raw source provenance. |
| Three-way resolver result | Pass | Pass | Pass | N/A | Pass | `not-file`, `valid`, and `invalid-file` have distinct downstream meanings. |
| Runtime mapping status | Pass | Pass | Pass | Pass | Pass | Mapping failure is an activation result, not a fourth render marker or a second action model. |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? (`Pass`/`Fail`) | Responsibility Matches The Intended Owner/Boundary? (`Pass`/`Fail`) | Responsibilities Were Re-Tightened After Shared-Structure Extraction? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `absoluteFilePathAction.ts` | Pass | Pass | Pass | Pass | Pure URI/path/type policy. |
| `useMarkdownSegments.ts` | Pass | Pass | Pass | Pass | Raw link decoration, safe markers, and descriptor registration. |
| `MarkdownRenderer.vue` | Pass | Pass | Pass | Pass | Valid action and invalid inert event ordering. |
| Existing launcher and File Explorer owners | Pass | Pass | Pass | Pass | Runtime mapping, preview, and bytes remain in existing authoritative owners. |
| Existing test suites | Pass | Pass | Pass | Pass | Coverage responsibilities are concrete. |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? (`Pass`/`Fail`) | Folder Matches Owning Boundary? (`Pass`/`Fail`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `utils/eventMonitorFilePaths/absoluteFilePathAction.ts` | Pass | Pass | Low | Pass | Correct pure policy location. |
| `useMarkdownSegments.ts` and `MarkdownRenderer.vue` | Pass | Pass | Medium | Pass | Existing token/render split is preserved. |
| Existing launcher/File Explorer/Electron/server paths | Pass | Pass | Low | Pass | No new cross-layer file is proposed. |
| URI and renderer test suites | Pass | Pass | Low | Pass | Appropriate durable coverage placement. |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? (`Pass`/`Fail`) | Replacement Owner / Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Removal / Decommission Scope Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Unrecognized Event Monitor `file:` fall-through | Pass | Pass | Pass | Pass | Replaced by explicit invalid-file neutralization. |
| `anchor.href` classification | Pass | Pass | Pass | Pass | Replaced by raw-token resolution/action IDs. |
| Duplicate viewer/endpoint/persistence path | Pass | Pass | Pass | Pass | Explicitly rejected. |
| Generic/non-Event-Monitor behavior | N/A | Pass | Pass | Pass | Preserved, not obsolete. |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? (`Yes`/`No`) | Clean-Cut Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- |
| Browser/native fall-through for invalid Event Monitor `file:` links | No | Pass | Pass | Clean-cut inert behavior is appropriate. |
| Browser-resolved `href` identity | No | Pass | Pass | Raw token contract replaces it. |
| Global Markdown protocol behavior | No | Pass | Pass | Capability remains opt-in. |
| New viewer/server/persistence compatibility path | No | Pass | Pass | Explicitly rejected. |

## Persisted-Data Transition Verdict (When Applicable)

| Area / Stored Subject | Approved Decision | Representative Reader / Semantic / Invariant Evidence Is Sufficient? (`Pass`/`Fail`) | Direct Use, Rebuild, Or Migration Choice Is Proportionate? (`Pass`/`Fail`) | Migration Safety Is Complete If Required? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Action descriptors, open tabs, references/artifacts, pending mobile state | Directly usable — no migration | Pass | Pass | N/A | Pass | No persisted schema or ownership change is proposed. |

## Change / Refactor Safety Verdict

| Area | Sequence Is Realistic? (`Pass`/`Fail`) | Temporary Seams Are Explicit? (`Pass`/`Fail`) | Cleanup / Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- |
| Three-way URI policy and normalization | Pass | Pass | Pass | Pass |
| Raw token/sanitizer/renderer markers | Pass | Pass | Pass | Pass |
| Invalid-file event ordering and generic fallback | Pass | Pass | Pass | Pass |
| Launcher/preview reuse | Pass | Pass | Pass | Pass |
| Coverage and cleanup | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? (`Yes`/`No`) | Example Is Present And Clear? (`Pass`/`Fail`/`N/A`) | Bad / Avoided Shape Is Explained When Helpful? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Valid POSIX label/action | Yes | Pass | Pass | Pass | Authored label and canonical path are explicit. |
| Windows `file:///C:/...` normalization | Yes | Pass | Pass | Pass | Drive-path conversion and encoded separator tests are required. |
| Invalid/unsupported inert shell | Yes | Pass | Pass | Pass | Non-anchor/no-op shape and no fallback are explicit. |
| Raw marker/sanitization | Yes | Pass | Pass | Pass | Safe IDs/boolean markers and post-sanitize tests are explicit. |
| Valid remote-unmapped behavior | Yes | Pass | Pass | Pass | Normal valid affordance followed by localized activation-time status with no preview/content request. |

## Material Premise Validation (Only When Needed)

None. The review is based on supported Event Monitor activation, the established Markdown renderer path, the existing launcher contract, and the explicit remote mapping result. No blocking conclusion depends on a speculative production scenario.

## Unresolved Approved-Behavior Or Current-State Gaps

None.

## Review Decision

**Pass** — the upstream behavior basis is confirmed, AR-URI-001 is resolved consistently across the cumulative package, the three-way raw-token policy and invalid neutralization are actionable, the Windows and sanitizer boundaries are explicit, and the design is ready for implementation.

## Findings

None. AR-URI-001 is resolved in the prior-findings table above.

## Classification

N/A — no blocking finding remains.

## Recommended Recipient

implementation_engineer

## Residual Risks

- Unit and browser coverage must lock the exact standard file URI grammar, empty authority, malformed percent escapes, query/fragment rejection, placeholder/traversal rejection, supported-type filtering, and POSIX/Windows canonical output. Include Windows drive-root and encoded separator cases in the pure policy matrix.
- DOMPurify must be verified on the post-sanitization DOM for valid action IDs, the invalid-file marker, and absence of raw filesystem destinations.
- Invalid nested/formatted/image labels require component coverage to confirm child content is preserved while anchor/navigation semantics are removed.
- Keyboard tests must verify Enter and Space produce exactly one typed action, while invalid shells are not focusable and do not reach generic external handling.
- API/E2E should verify valid owner paths reuse read-only Files/mobile behavior and runtime-unmapped paths announce the localized unavailable status without Files switching or content requests.
- No application runtime was started during investigation; focused execution remains downstream after implementation source review.

## Latest Authoritative Result

- Review Decision: **Pass**
- Material-Premise Gate (Pass/Fail/Blocked): **Pass**
- Notes: The revised cumulative package is ready for implementation. Preserve the exact three-way raw-token contract, the invalid non-anchor/sanitizer-safe neutralization, and the activation-time distinction between valid runtime-unmapped and lexical-invalid file links.
