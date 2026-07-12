# Markdown Preview Relative Images — Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/markdown-preview-relative-images/tickets/in-progress/markdown-preview-relative-images/requirements.md`
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/markdown-preview-relative-images/tickets/in-progress/markdown-preview-relative-images/investigation-notes.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/markdown-preview-relative-images/tickets/in-progress/markdown-preview-relative-images/design-spec.md`
- Supplemental Solution Artifacts Reviewed: `None`
- Current Review Round: `2`
- Trigger: Revised package submitted after round-1 Design Impact finding `AR-MPRI-001`.
- Prior Review Round Reviewed: `1`
- Latest Authoritative Round: `2`
- Current-State Evidence Basis: Rechecked the complete revised package and current code at task base `73e2c333d89b09d70945139d3ce502230667a53f`, with focused comparison against `useAuthorizedObjectUrl.ts`, `authorizedResourceUrl.ts`, `authorizedTransport.ts`, and `mobileNodeSessionStore.activeCredential`.

## Round History

| Round | Trigger | Prior Unresolved Findings Rechecked | New Findings Found | Review Decision | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `1` | Initial review | `N/A` | `AR-MPRI-001` | `Fail` | `No` | Credential-change reactivity was required but not designed against the current authorized URL-map contract. |
| `2` | Revised package | `AR-MPRI-001` | `None` | `Pass` | `Yes` | The authorized-resource owner now has an explicit reactive credential-generation, invalidation, snapshot-fetch, commit, and stale-cleanup design. |

## Supplemental Artifact Coherence Verdict

`None`.

## Task Design Health Assessment Verdict

| Assessment Area | Result (`Pass`/`Fail`) | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | `Pass` | Bug-fix posture is explicit across all mandatory artifacts. | None |
| Root-cause classification is explicit and evidence-backed | `Pass` | Current code and probes demonstrate resource-context loss plus duplicated/inconsistent server containment. | None |
| Refactor needed now / no refactor needed / deferred decision is explicit | `Pass` | A bounded boundary and invariant refactor is explicitly required. | None |
| Refactor decision is supported by the concrete design sections or residual-risk rationale | `Pass` | Context propagation, opt-in rendering, authorized loading extension, and containment consolidation are reflected in spines, interfaces, files, and sequence. | None |

## Prior Findings Resolution Check (Mandatory On Round >1)

| Prior Round | Finding ID | Previous Severity | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| `1` | `AR-MPRI-001` | `High` | `Resolved` | Requirements explicitly cover credential establishment/replacement/removal with unchanged URLs; investigation identifies the current source-only watch; design `DS-MPRI-004`, bounded lifecycle, ownership, interfaces, file mappings, sequence, examples, risks, and coverage now define the extension. | The full credential value is observed inside the authorized-resource owner; one generation uses one explicit credential snapshot; published maps are invalidated before revocation/refetch; stale local blobs are cleaned; renderer stays credential-unaware. |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? (`Pass`/`Fail`) | Narrative Is Clear? (`Pass`/`Fail`) | Facade Vs Governing Owner Is Clear? (`Pass`/`Fail`/`N/A`) | Main Domain Subject Naming Is Clear? (`Pass`/`Fail`) | Ownership Is Clear? (`Pass`/`Fail`) | Off-Spine Concerns Stay Off Main Line? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `DS-MPRI-001` | Workspace Markdown image resolution | `Pass` | `Pass` | `Pass` | `Pass` | `Pass` | `Pass` | `Pass` |
| `DS-MPRI-002` | Authorized workspace image delivery | `Pass` | `Pass` | `Pass` | `Pass` | `Pass` | `Pass` | `Pass` |
| `DS-MPRI-003` | Visible image/failure return | `Pass` | `Pass` | `Pass` | `Pass` | `Pass` | `Pass` | `Pass` |
| `DS-MPRI-004` | Credential-reactive resource lifecycle | `Pass` | `Pass` | `N/A` | `Pass` | `Pass` | `Pass` | `Pass` |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? (`Pass`/`Fail`) | Reuse / Extend / Create-New Decision Is Sound? (`Pass`/`Fail`) | Supports The Right Spine Owners? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| File explorer state/preview | `Pass` | `Pass` | `Pass` | `Pass` | Explicit workspace-file identity is established by loading and adapted by `MarkdownPreviewer`. |
| Markdown rendering | `Pass` | `Pass` | `Pass` | `Pass` | Generic resolver and DOM lifecycle stay context-neutral. |
| Remote-access resources | `Pass` | `Pass` | `Pass` | `Pass` | Existing owner is correctly extended to observe the credential and own transactional source resolution. |
| Server workspaces | `Pass` | `Pass` | `Pass` | `Pass` | Canonical containment belongs in the existing workspace utility capability. |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? (`Pass`/`Fail`) | Shared File Choice Is Sound? (`Pass`/`Fail`/`N/A`) | Ownership Of Shared Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Markdown image resolution result | `Pass` | `Pass` | `Pass` | `Pass` | Tight direct/managed/blocked contract. |
| Workspace content URL policy | `Pass` | `Pass` | `Pass` | `Pass` | Existing media and Markdown use one explicit compound-identity builder. |
| Credential-aware resource generation | `Pass` | `Pass` | `Pass` | `Pass` | Existing authorized-resource files are extended instead of introducing caller coordination. |
| Workspace containment | `Pass` | `Pass` | `Pass` | `Pass` | One lexical containment invariant serves both server callers. |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Pass`/`Fail`) | Redundant Attributes Removed? (`Pass`/`Fail`) | Overlapping Representation Risk Is Controlled? (`Pass`/`Fail`) | Shared Core Vs Specialized Variant / Composition Decision Is Sound? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `FileRelativeResourceContext` | `Pass` | `Pass` | `Pass` | `Pass` | `Pass` | Workspace identity is discriminated; path remains authoritative in open-file state. |
| `MarkdownImageResourceResolution` | `Pass` | `Pass` | `Pass` | `Pass` | `Pass` | Result variants have singular meanings. |
| Managed-source inventory | `Pass` | `Pass` | `Pass` | `N/A` | `Pass` | Derived from one render model. |
| Credential snapshot/generation state | `Pass` | `Pass` | `Pass` | `Pass` | `Pass` | Full credential value, sources, token, and generation-local blob registry form one transaction without duplicating session ownership. |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? (`Pass`/`Fail`) | Replacement Owner / Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Removal / Decommission Scope Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Content-only Markdown preview handoff | `Pass` | `Pass` | `Pass` | `Pass` | Explicit context replaces the ineffective handoff. |
| Inline workspace URL construction | `Pass` | `Pass` | `Pass` | `Pass` | Canonical builder is named. |
| Source-only authorized-resource watch/invalidation behavior | `Pass` | `Pass` | `Pass` | `Pass` | Full source+credential generation and invalidate-before-revoke replaces it. |
| Duplicate/weak workspace containment | `Pass` | `Pass` | `Pass` | `Pass` | Both implementations move to one canonical invariant. |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? (`Pass`/`Fail`) | Responsibility Matches The Intended Owner/Boundary? (`Pass`/`Fail`) | Responsibilities Were Re-Tightened After Shared-Structure Extraction? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| File-state and preview files | `Pass` | `Pass` | `Pass` | `Pass` | State identity, preview adaptation, parsing, and DOM binding remain separated. |
| `useAuthorizedObjectUrl.ts` | `Pass` | `Pass` | `Pass` | `Pass` | Owns reactive generation and blob lifecycle, not credential mutation or Markdown policy. |
| `authorizedResourceUrl.ts` / `authorizedTransport.ts` | `Pass` | `Pass` | `Pass` | `Pass` | Snapshot-aware classification/fetch and header construction remain separate, singular concerns. |
| Server workspace files | `Pass` | `Pass` | `Pass` | `Pass` | Public workspace boundary and reusable internal invariant are distinguished. |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? (`Pass`/`Fail`) | Forbidden Shortcuts Are Explicit? (`Pass`/`Fail`) | Direction Is Coherent With Ownership? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Workspace Markdown adapter | `Pass` | `Pass` | `Pass` | `Pass` | Generic renderer cannot infer workspace or node state. |
| Authorized resource loader | `Pass` | `Pass` | `Pass` | `Pass` | Loader observes store state; renderer cannot observe credential/pairing or call refresh manually. |
| Snapshot-aware transport | `Pass` | `Pass` | `Pass` | `Pass` | One generation cannot reread/mix credentials. |
| Server workspace boundary | `Pass` | `Pass` | `Pass` | `Pass` | REST route must use `FileSystemWorkspace`, not its internal path utility directly. |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? (`Pass`/`Fail`) | Internal Owned Mechanisms Stay Internal? (`Pass`/`Fail`) | Caller Bypass Risk Is Controlled? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `MarkdownPreviewer` | `Pass` | `Pass` | `Pass` | `Pass` | Correct workspace-aware adapter. |
| `MarkdownRenderer` | `Pass` | `Pass` | `Pass` | `Pass` | Owns rendered DOM while delegating protected loading. |
| `useAuthorizedObjectUrl` / map | `Pass` | `Pass` | `Pass` | `Pass` | Owns credential observation, invalidation, stale suppression, and blobs without owning session mutation. |
| `FileSystemWorkspace.getAbsolutePath` | `Pass` | `Pass` | `Pass` | `Pass` | Canonical path utility stays internal to the public workspace boundary for REST. |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? (`Pass`/`Fail`) | Responsibility Is Singular? (`Pass`/`Fail`) | Identity Shape Is Explicit? (`Pass`/`Fail`) | Generic Boundary Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- |
| `FileRelativeResourceContext` | `Pass` | `Pass` | `Pass` | `Low` | `Pass` |
| Workspace Markdown resolver | `Pass` | `Pass` | `Pass` | `Low` | `Pass` |
| Generic Markdown resolver | `Pass` | `Pass` | `Pass` | `Low` | `Pass` |
| Authorized URL map | `Pass` | `Pass` | `Pass` | `Low` | `Pass` |
| Explicit-credential blob fetch/transport | `Pass` | `Pass` | `Pass` | `Low` | `Pass` |
| Workspace content URL builder | `Pass` | `Pass` | `Pass` | `Low` | `Pass` |
| Canonical server path resolver | `Pass` | `Pass` | `Pass` | `Low` | `Pass` |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? (`Pass`/`Fail`) | Folder Matches Owning Boundary? (`Pass`/`Fail`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Frontend preview/Markdown files | `Pass` | `Pass` | `Low` | `Pass` | Compact layout follows existing conventions. |
| Remote-access composable/utilities | `Pass` | `Pass` | `Low` | `Pass` | Reactive lifecycle, resource policy, and transport remain in established owners. |
| Server target mapping | `Pass` | `Pass` | `Low` | `Pass` | Canonical path utility stays in workspace capability area. |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? (`Pass`/`Fail`) | Reuse / Extension Decision Is Sound? (`Pass`/`Fail`) | New Support Piece Is Justified? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Markdown parser/renderer | `Pass` | `Pass` | `N/A` | `Pass` | Canonical pipeline is extended. |
| Protected resource loading | `Pass` | `Pass` | `N/A` | `Pass` | Correctly changed from reuse-only to extension of the authoritative owner. |
| Mobile credential authority | `Pass` | `Pass` | `N/A` | `Pass` | Full existing `activeCredential` ref is reused without duplicating state. |
| Workspace route/path containment | `Pass` | `Pass` | `N/A` | `Pass` | Existing route and workspace capability are appropriate. |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? (`Yes`/`No`) | Clean-Cut Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- |
| Markdown resolution | `No` | `Pass` | `Pass` | No global fallback or source rewrite. |
| Authorized-resource transport | `No` | `Pass` | `Pass` | Existing convenience APIs delegate to the same header owner; they are not parallel historical implementations. |
| Workspace containment | `No` | `Pass` | `Pass` | Weak/duplicate bodies are removed. |

## Persisted-Data Transition Verdict (When Applicable)

| Area / Stored Subject | Approved Decision | Representative Reader / Semantic / Invariant Evidence Is Sufficient? (`Pass`/`Fail`) | Direct Use, Rebuild, Or Migration Choice Is Proportionate? (`Pass`/`Fail`) | Migration Safety Is Complete If Required? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Markdown/image files and ephemeral open-file state | `Not Affected` | `Pass` | `Pass` | `N/A` | `Pass` | No source/storage schema changes; derived URLs remain ephemeral. |

## Change / Refactor Safety Verdict

| Area | Sequence Is Realistic? (`Pass`/`Fail`) | Temporary Seams Are Explicit? (`Pass`/`Fail`) | Cleanup / Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- |
| Workspace containment | `Pass` | `Pass` | `Pass` | `Pass` |
| Preview/context/render path | `Pass` | `Pass` | `Pass` | `Pass` |
| Credential-reactive resource lifecycle | `Pass` | `Pass` | `Pass` | `Pass` |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? (`Yes`/`No`) | Example Is Present And Clear? (`Pass`/`Fail`/`N/A`) | Bad / Avoided Shape Is Explained When Helpful? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Explicit identity and relative normalization | `Yes` | `Pass` | `Pass` | `Pass` | Concrete compound identity and traversal cases are shown. |
| Managed post-sanitize binding | `Yes` | `Pass` | `Pass` | `Pass` | Prevents an initial unauthenticated request. |
| Credential establishment/replacement/removal | `Yes` | `Pass` | `Pass` | `Pass` | Unchanged-URL and late-stale-completion cases explain the required transaction. |

## Missing Use Cases / Open Unknowns

`None that block implementation.`

## Review Decision

`Pass` — the revised design is complete, ownership-correct, actionable in the current codebase, and ready for implementation.

## Findings

`None`.

## Classification

`N/A — Pass`

## Recommended Recipient

`implementation_engineer`

## Residual Risks

- Async DOM replacement and blob completion require the specified generation/current-node guards and focused tests.
- Credential transitions during in-flight multi-source loads require deterministic cleanup of committed and generation-local blob registries.
- Symlink semantics remain explicitly unchanged and must not be broadened during implementation.
- Relative images for artifact/team-reference/conversation Markdown remain out of scope until those owners provide explicit identity.
- The stale server test remains a downstream coverage-classification issue, not implementation scope.

## Latest Authoritative Result

- Review Decision: `Pass`
- Notes: Round 2 resolves `AR-MPRI-001`. The cumulative reviewed solution package is approved for implementation.
