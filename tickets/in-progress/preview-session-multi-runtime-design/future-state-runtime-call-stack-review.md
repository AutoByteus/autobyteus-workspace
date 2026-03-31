# Future-State Runtime Call Stack Review

Use this document as the pre-implementation gate for future-state runtime-call-stack quality and use-case completeness.
This review validates alignment with target (`to-be`) design behavior, not parity with current (`as-is`) code.

## Review Meta

- Scope Classification: `Large`
- Current Round: `15`
- Current Review Type: `Deep Review`
- Clean-Review Streak Before This Round: `1`
- Clean-Review Streak After This Round: `2`
- Round State: `Go Confirmed`
- Missing-Use-Case Discovery Sweep Completed This Round: `Yes`
- New Use Cases Discovered This Round: `No`
- This Round Classification (`Design Impact`/`Requirement Gap`/`Unclear`/`N/A`): `N/A`
- Required Re-Entry Path Before Next Round: `N/A`

## Review Basis

- Requirements: `tickets/in-progress/preview-session-multi-runtime-design/requirements.md` (status `Refined`)
- Runtime Call Stack Document: `tickets/in-progress/preview-session-multi-runtime-design/future-state-runtime-call-stack.md`
- Source Design Basis:
  - `tickets/in-progress/preview-session-multi-runtime-design/proposed-design.md`
- Shared Design Principles: `shared/design-principles.md`
- Common Design Practices: `shared/common-design-practices.md`
- Artifact Versions In This Round:
  - Requirements Status: `Refined`
  - Design Version: `v6`
  - Call Stack Version: `v6`
- Required Persisted Artifact Updates Completed For This Round: `N/A`

## Review Intent (Mandatory)

- Primary check: the future-state runtime call stack is a coherent and implementable future-state model.
- Shared-principles rule: review uses `data-flow spine clarity`, `ownership clarity`, `off-spine concerns around the spine`, and ownership-driven dependency validation.
- Spine inventory rule: all relevant spines must be explicitly listed in the design basis, including bounded local spines when a local lifecycle materially affects behavior.
- Any finding with a required design/call-stack update is blocking.

## Round History

| Round | Requirements Status | Design Version | Call Stack Version | Findings Requiring Persisted Updates | New Use Cases Discovered | Persisted Updates Completed | Classification (`Design Impact`/`Requirement Gap`/`Unclear`/`N/A`) | Required Re-Entry Path | Clean Streak After Round | Round State | Gate (`Go`/`No-Go`) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Refined | v1 | v1 | Yes | No | Yes | Design Impact | `3 -> 4 -> 5` | 0 | Reset | No-Go |
| 2 | Refined | v2 | v2 | No | No | N/A | N/A | N/A | 1 | Candidate Go | No-Go |
| 3 | Refined | v2 | v2 | No | No | N/A | N/A | N/A | 2 | Go Confirmed | Go |
| 4 | Refined | v2 | v2 | Yes | No | Yes | Design Impact | `3 -> 4 -> 5` | 0 | Reset | No-Go |
| 5 | Refined | v3 | v3 | No | No | N/A | N/A | N/A | 1 | Candidate Go | No-Go |
| 6 | Refined | v3 | v3 | No | No | N/A | N/A | N/A | 2 | Go Confirmed | Go |
| 7 | Refined | v3 | v3 | Yes | No | Yes | Design Impact | `3 -> 4 -> 5` | 0 | Reset | No-Go |
| 8 | Refined | v4 | v4 | No | No | N/A | N/A | N/A | 1 | Candidate Go | No-Go |
| 9 | Refined | v4 | v4 | No | No | N/A | N/A | N/A | 2 | Go Confirmed | Go |
| 10 | Refined | v4 | v4 | Yes | No | Yes | Design Impact | `3 -> 4 -> 5` | 0 | Reset | No-Go |
| 11 | Refined | v5 | v5 | No | No | N/A | N/A | N/A | 1 | Candidate Go | No-Go |
| 12 | Refined | v5 | v5 | No | No | N/A | N/A | N/A | 2 | Go Confirmed | Go |
| 13 | Refined | v5 | v5 | Yes | No | Yes | Design Impact | `3 -> 4 -> 5` | 0 | Reset | No-Go |
| 14 | Refined | v6 | v6 | No | No | N/A | N/A | N/A | 1 | Candidate Go | No-Go |
| 15 | Refined | v6 | v6 | No | No | N/A | N/A | N/A | 2 | Go Confirmed | Go |

## Round Artifact Update Log (Mandatory)

| Round | Findings Requiring Updates (`Yes`/`No`) | Updated Files | Version Changes | Changed Sections | Resolved Finding IDs |
| --- | --- | --- | --- | --- | --- |
| 1 | Yes | `proposed-design.md`, `future-state-runtime-call-stack.md`, `future-state-runtime-call-stack-review.md`, `workflow-state.md` | design `v1 -> v2`; call stack `v1 -> v2` | explicit spine inventory, spine narratives, use-case spine mapping, bounded local spine, template-complete review history | `F-001` |
| 2 | No | N/A | N/A | N/A | N/A |
| 3 | No | N/A | N/A | N/A | N/A |
| 4 | Yes | `proposed-design.md`, `future-state-runtime-call-stack.md`, `future-state-runtime-call-stack-review.md`, `workflow-state.md` | design `v2 -> v3`; call stack `v2 -> v3` | narrowed v1 scope, added `PreviewToolService`, removed preview-specific renderer projection path, regenerated call stacks, and restored review history after re-entry | `F-002`, `F-003` |
| 5 | No | N/A | N/A | N/A | N/A |
| 6 | No | N/A | N/A | N/A | N/A |
| 7 | Yes | `proposed-design.md`, `future-state-runtime-call-stack.md`, `future-state-runtime-call-stack-review.md`, `workflow-state.md` | design `v3 -> v4`; call stack `v3 -> v4` | explicit canonical preview contract section, MCP-fit evaluation, adapter-to-service boundary correction, backend preview-shell rationale correction, and regenerated call stacks | `F-004`, `F-005` |
| 8 | No | N/A | N/A | N/A | N/A |
| 9 | No | N/A | N/A | N/A | N/A |
| 10 | Yes | `proposed-design.md`, `future-state-runtime-call-stack.md`, `future-state-runtime-call-stack-review.md`, `workflow-state.md` | design `v4 -> v5`; call stack `v4 -> v5` | narrowed wait semantics to Electron-grounded readiness states, added explicit closed-vs-not-found lifecycle rules and tombstone semantics, regenerated call stacks, and restored the review history after re-entry | `F-006`, `F-007` |
| 11 | No | N/A | N/A | N/A | N/A |
| 12 | No | N/A | N/A | N/A | N/A |
| 13 | Yes | `proposed-design.md`, `future-state-runtime-call-stack.md`, `future-state-runtime-call-stack-review.md`, `workflow-state.md` | design `v5 -> v6`; call stack `v5 -> v6` | moved preview-specific contract, shared server-side coordination, and bridge client into `agent-tools/preview`; removed the generic backend shell boundary from the design basis; regenerated call stacks and restored the review history after re-entry | `F-008` |
| 14 | No | N/A | N/A | N/A | N/A |
| 15 | No | N/A | N/A | N/A | N/A |

## Missing-Use-Case Discovery Log (Mandatory Per Round)

| Round | Discovery Lens | New Use Case IDs (`None` if no new case) | Source Type (`Requirement`/`Design-Risk`) | Why Previously Missing | Classification (`Design Impact`/`Requirement Gap`/`Unclear`/`N/A`) | Upstream Update Required |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Requirement coverage / boundary crossing / fallback-error / design-risk | None | N/A | design issue was missing explicit spine inventory and spine-first structure, not a missing use case | Design Impact | Yes |
| 2 | Requirement coverage / boundary crossing / fallback-error / design-risk | None | N/A | N/A | N/A | No |
| 3 | Requirement coverage / boundary crossing / fallback-error / design-risk | None | N/A | N/A | N/A | No |
| 4 | Requirement coverage / boundary crossing / fallback-error / design-risk | None | N/A | review found ownership and simplification issues in existing use cases rather than a missing use case | Design Impact | Yes |
| 5 | Requirement coverage / boundary crossing / fallback-error / design-risk | None | N/A | corrected v3 design and call stacks closed the prior ownership/simplification gap without exposing a new use case | N/A | No |
| 6 | Requirement coverage / boundary crossing / fallback-error / design-risk | None | N/A | second clean verification of the corrected v3 basis did not surface any new use case | N/A | No |
| 7 | Requirement coverage / boundary crossing / fallback-error / design-risk | None | N/A | review found contract-definition and boundary-ownership issues in existing use cases rather than a missing use case | Design Impact | Yes |
| 8 | Requirement coverage / boundary crossing / fallback-error / design-risk | None | N/A | corrected v4 design and call stacks closed the prior contract/boundary gap without exposing a new use case | N/A | No |
| 9 | Requirement coverage / boundary crossing / fallback-error / design-risk | None | N/A | second clean verification of the corrected v4 basis did not surface any new use case | N/A | No |
| 10 | Requirement coverage / boundary crossing / fallback-error / design-risk | None | N/A | review found contract-implementability and error-semantics issues in existing use cases rather than a missing use case | Design Impact | Yes |
| 11 | Requirement coverage / boundary crossing / fallback-error / design-risk | None | N/A | corrected v5 design and call stacks closed the prior contract semantics gap without exposing a new use case | N/A | No |
| 12 | Requirement coverage / boundary crossing / fallback-error / design-risk | None | N/A | second clean verification of the corrected v5 basis did not surface any new use case | N/A | No |
| 13 | Requirement coverage / boundary crossing / fallback-error / design-risk | None | N/A | review found file-placement and capability-area ownership drift in existing use cases rather than a missing use case | Design Impact | Yes |
| 14 | Requirement coverage / boundary crossing / fallback-error / design-risk | None | N/A | corrected v6 design and call stacks closed the prior file-placement and ownership drift without exposing a new use case | N/A | No |
| 15 | Requirement coverage / boundary crossing / fallback-error / design-risk | None | N/A | second clean verification of the corrected v6 basis did not surface any new use case | N/A | No |

## Per-Use-Case Review

| Use Case | Spine ID(s) | Architecture Fit (`Pass`/`Fail`) | Data-Flow Spine Clarity (`Pass`/`Fail`) | Spine Inventory Completeness (`Pass`/`Fail`) | Ownership Clarity (`Pass`/`Fail`) | Support Structure Clarity (`Pass`/`Fail`) | Existing Capability/Subsystem Reuse (`Pass`/`Fail`/`N/A`) | Ownership-Driven Dependency Check (`Pass`/`Fail`) | File Placement Alignment (`Pass`/`Fail`) | Flat-Vs-Over-Split Layout Judgment (`Pass`/`Fail`) | Interface/API/Method Boundary Clarity (`Pass`/`Fail`) | Existing-Structure Bias Check (`Pass`/`Fail`) | Anti-Hack Check (`Pass`/`Fail`) | Local-Fix Degradation Check (`Pass`/`Fail`) | Example-Based Clarity (`Pass`/`Fail`/`N/A`) | Terminology & Concept Naturalness (`Pass`/`Fail`) | File And API Naming Clarity (`Pass`/`Fail`) | Name-to-Responsibility Alignment Under Scope Drift (`Pass`/`Fail`) | Future-State Alignment With Design Basis (`Pass`/`Fail`) | Use-Case Coverage Completeness (`Pass`/`Fail`) | Use-Case Source Traceability (`Pass`/`Fail`) | Design-Risk Justification Quality (`Pass`/`Fail`/`N/A`) | Business Flow Completeness (`Pass`/`Fail`) | Scope-Appropriate SoC Check (`Pass`/`Fail`) | Dependency Flow Smells | Redundancy/Duplication Check (`Pass`/`Fail`) | Simplification Opportunity Check (`Pass`/`Fail`) | Remove/Decommission Completeness (`Pass`/`Fail`/`N/A`) | Legacy Retention Removed (`Pass`/`Fail`) | No Compatibility Wrappers/Dual Paths (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| UC-001 | DS-001 | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | N/A | Pass | Pass | Pass | Pass | Pass | Pass | N/A | Pass | Pass | None | Pass | Pass | Pass | Pass | Pass | Pass |
| UC-002 | DS-002 | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | N/A | Pass | Pass | Pass | Pass | Pass | Pass | N/A | Pass | Pass | None | Pass | Pass | N/A | Pass | Pass | Pass |
| UC-003 | DS-002 | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | N/A | Pass | Pass | Pass | Pass | Pass | Pass | N/A | Pass | Pass | None | Pass | Pass | N/A | Pass | Pass | Pass |
| UC-004 | DS-002 | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | N/A | Pass | Pass | Pass | Pass | Pass | Pass | N/A | Pass | Pass | None | Pass | Pass | N/A | Pass | Pass | Pass |
| UC-005 | DS-003 | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | N/A | Pass | Pass | Pass | Pass | Pass | Pass | N/A | Pass | Pass | None | Pass | Pass | N/A | Pass | Pass | Pass |
| UC-006 | DS-004 | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | N/A | Pass | Pass | Pass | Pass | Pass | Pass | N/A | Pass | Pass | None | Pass | Pass | Pass | Pass | Pass | Pass |
| UC-007 | DS-005 | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | N/A | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass | None | Pass | Pass | N/A | Pass | Pass | Pass |

## Findings

- `[F-001] Use case: design basis / all use cases | Type: Spine | Severity: Blocker | Confidence: High | Evidence: previous v1 artifacts modeled the flows but did not explicitly include the required data-flow spine inventory, spine-first organization, or use-case-to-spine mapping mandated by the workflow templates | Required update: rewrite proposed design and future-state runtime call stack to be spine-first and template-complete, then rerun review | Classification: Design Impact`
- Round 2 findings: `None`
- Round 3 findings: `None`
- `[F-002] Use case: UC-006 / DS-004 | Type: Simplification / Scope | Severity: Blocker | Confidence: High | Evidence: the approved MVP chooses dedicated preview windows, but the current design still adds `preload.ts` preview APIs, `previewSessionStore.ts`, and renderer snapshot/update flow as in-scope architecture. That creates avoidable UI/event surface area without serving the core preview-session contract. | Required update: narrow v1 so native close only updates authoritative owner state and later lookup semantics; move renderer preview projection out of v1 scope and remove it from the main spine inventory, file mapping, and call stacks. | Classification: Design Impact`
- `[F-003] Use case: UC-001, UC-002, UC-003, UC-004, UC-005 | Type: Ownership / Repeated Coordination | Severity: Blocker | Confidence: High | Evidence: capability gating and shared preview command semantics are still spread across runtime adapters plus the bridge client. The design lacks one backend-owned policy boundary for repeated preview coordination, which conflicts with the repeated-coordination trigger in the common practices. | Required update: introduce one backend `PreviewToolService` that owns capability checks, semantic normalization, and shared bridge delegation so runtime adapters remain translation-only. Regenerate the design basis and call stacks around that owner. | Classification: Design Impact`
- Round 5 findings: `None`
- Round 6 findings: `None`
- `[F-004] Use case: design basis / UC-002 / UC-003 / UC-004 / UC-005 | Type: Interface / Example Clarity | Severity: Blocker | Confidence: High | Evidence: the v3 design names `OpenPreviewInput`, `OpenPreviewResult`, and shared contract ownership, but it never actually shows the canonical field shapes for create/open, follow-up operations, or normalized errors. That leaves AC-002 under-specified and weakens adapter-parity and API-boundary clarity. | Required update: add an explicit canonical preview contract section with concrete request/response/error shapes, identity semantics for `preview_session_id`, and a short good-shape example. | Classification: Design Impact`
- `[F-005] Use case: UC-002 / UC-003 / UC-004 / UC-005 | Type: Boundary / Ownership | Severity: Blocker | Confidence: High | Evidence: the ownership map says runtime adapters own translation, but the future-state call stacks still pass `rawInput` into `PreviewToolService`, which then builds `OpenPreviewInput` and `CapturePreviewScreenshotInput` itself. The v3 text also overstates reuse of an existing backend `desktop-shell` boundary that does not currently exist in the codebase. This blurs the adapter/service boundary and weakens file-placement truthfulness. | Required update: make adapters or shared-contract parsers produce canonical input shapes before `PreviewToolService` is called, narrow `PreviewToolService` to support checks plus semantic/result normalization and bridge delegation, and correct the backend capability-area rationale to `Create New` with explicit justification. | Classification: Design Impact`
- Round 8 findings: `None`
- Round 9 findings: `None`
- `[F-006] Use case: UC-002 / UC-003 / UC-004 | Type: Contract / Implementability | Severity: Blocker | Confidence: High | Evidence: the canonical contract currently allows `wait_until='networkidle'`, but the v1 preview surface is modeled on Electron `webContents` loading events and `BrowserWindow.webContents.loadURL(...)`; the official Electron API documents load completion/failure events, not a native `networkidle` wait mode. That makes the public contract broader than the chosen owner/boundary can truthfully guarantee in v1. | Required update: narrow the canonical wait semantics to Electron-grounded modes for v1 and update the design/call-stack narratives accordingly. | Classification: Design Impact`
- `[F-007] Use case: UC-005 / UC-006 / UC-007 | Type: Contract / Error Semantics | Severity: Blocker | Confidence: High | Evidence: the design and call stack still say later lookups may throw either `preview_session_closed` or `preview_session_not_found`, but they never define when each one applies. Because both errors are part of the public session contract, the owner must specify the identity/lifecycle rule rather than leaving tests and adapters to infer it. | Required update: define explicit closed-vs-not-found semantics in the canonical contract and bounded local spine, then regenerate the affected call stacks to use the concrete rule instead of an ambiguous either-or branch. | Classification: Design Impact`
- Round 11 findings: `None`
- Round 12 findings: `None`
- `[F-008] Use case: design basis / UC-001 / UC-002 / UC-003 / UC-004 / UC-005 | Type: File Placement / Existing-Structure Reuse | Severity: Blocker | Confidence: High | Evidence: the v5 design still places preview-specific contract code in `autobyteus-ts/src/preview` and shared server-side preview coordination in a new `autobyteus-server-ts/src/desktop-shell/preview` capability area. The clarified ownership is narrower: preview exists only when the Electron shell is present, and all runtime adapters that need the preview contract already live in `autobyteus-server-ts`. Keeping preview-specific semantics in the common library and inventing a generic backend shell boundary weakens existing-structure reuse and file-placement truthfulness. | Required update: move the preview-specific contract, shared server-side preview coordination, bridge client, and native-runtime preview tool files under `autobyteus-server-ts/src/agent-tools/preview`, regenerate the subsystem/file mappings, and rerun the call-stack artifact against that placement. | Classification: Design Impact`
- Round 14 findings: `None`
- Round 15 findings: `None`

## Blocking Findings Summary

- Unresolved Blocking Findings: `No`
- Remove/Decommission Checks Complete For Scoped `Remove`/`Rename/Move`: `Yes`

## Gate Decision

- Implementation can start: `Yes`
- Clean-review streak at end of this round: `2`
- Gate rule checks (all must be `Yes` for `Implementation can start = Yes`):
  - Architecture fit is `Pass` for all in-scope use cases: `Yes`
  - Data-flow spine clarity is `Pass` for all in-scope use cases: `Yes`
  - Spine inventory completeness is `Pass` for the design basis: `Yes`
  - Ownership clarity is `Pass` for all in-scope use cases: `Yes`
  - Support structure clarity is `Pass` for all in-scope use cases: `Yes`
  - Existing capability/subsystem reuse is `Pass` or `N/A` for all in-scope use cases: `Yes`
  - Ownership-driven dependency check is `Pass` for all in-scope use cases: `Yes`
  - File-placement alignment is `Pass` for all in-scope use cases: `Yes`
  - Flat-vs-over-split layout judgment is `Pass` for all in-scope use cases: `Yes`
  - interface/API/method boundary clarity is `Pass` for all in-scope use cases: `Yes`
  - Existing-structure bias check is `Pass` for all in-scope use cases: `Yes`
  - Anti-hack check is `Pass` for all in-scope use cases: `Yes`
  - Local-fix degradation check is `Pass` for all in-scope use cases: `Yes`
  - Example-based clarity is `Pass` or `N/A` for all in-scope use cases: `Yes`
  - Terminology and concept vocabulary is natural/intuitive across in-scope use cases: `Yes`
  - File/API naming clarity is `Pass` across in-scope use cases: `Yes`
  - Name-to-responsibility alignment under scope drift is `Pass` across in-scope use cases: `Yes`
  - Future-state alignment with target design basis is `Pass` for all in-scope use cases: `Yes`
  - Scope-appropriate separation of concerns is `Pass` for all in-scope use cases: `Yes`
  - Use-case coverage completeness is `Pass` for all in-scope use cases: `Yes`
  - Use-case source traceability is `Pass` for all in-scope use cases: `Yes`
  - Requirement coverage closure is `Pass` (all requirements map to at least one use case): `Yes`
  - Design-risk justification quality is `Pass` for all design-risk use cases: `Yes`
  - Redundancy/duplication check is `Pass` for all in-scope use cases: `Yes`
  - Simplification opportunity check is `Pass` for all in-scope use cases: `Yes`
  - All use-case verdicts are `Pass`: `Yes`
  - No unresolved blocking findings: `Yes`
  - Required persisted artifact updates completed for this round: `Yes`
  - Missing-use-case discovery sweep completed for this round: `Yes`
  - No newly discovered use cases in this round: `Yes`
  - Remove/decommission checks complete for scoped `Remove`/`Rename/Move` changes: `Yes`
  - Legacy retention removed for impacted old-behavior paths: `Yes`
  - No compatibility wrappers/dual paths retained for old behavior: `Yes`
  - Two consecutive deep-review rounds have no blockers, no required persisted artifact updates, and no newly discovered use cases: `Yes`
  - Findings trend quality is acceptable across rounds: `Yes`

## Speak Log (Optional Tracking)

- Stage/gate transition spoken after `workflow-state.md` update: `Yes`
- Review gate decision spoken after persisted gate evidence: `Yes`
- Re-entry or lock-state change spoken (if applicable): `Yes`
- If any required speech was not emitted, fallback text update recorded: `N/A`
