# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-message-referenced-artifacts/tickets/in-progress/team-message-referenced-artifacts/requirements.md`
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-message-referenced-artifacts/tickets/in-progress/team-message-referenced-artifacts/investigation-notes.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-message-referenced-artifacts/tickets/in-progress/team-message-referenced-artifacts/design-spec.md`
- Runtime Parser Evidence Note: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-message-referenced-artifacts/tickets/in-progress/team-message-referenced-artifacts/runtime-investigation-message-reference-parser.md`
- Current Review Round: 4
- Trigger: Addendum review after user clarified the instruction/UX invariant: `content` must remain natural, detailed, and self-contained like an email body that explains its attachments; `reference_files` is only the structured Artifacts registration list.
- Prior Review Round Reviewed: Round 3 (`Pass`) in this same report path. Round 3 explicit `reference_files` source remains approved; Round 4 verifies the added self-contained-content invariant and runtime coverage.
- Latest Authoritative Round: Round 4
- Current-State Evidence Basis:
  - Requirements/design package now encodes self-contained email-like `content` plus structured `reference_files`, including AC-020 and validation evidence requiring schema/instruction examples to avoid thin “See attached” content.
  - Design examples show complete content that may naturally mention paths and also lists Artifacts-eligible files in `reference_files`.
  - Design keeps **Reference files:** as the generated recipient-visible block, analogous to an email attachment/index list.
  - Runtime set is correctly scoped to Codex, Claude, and AutoByteus/native; all three paths are listed in the file responsibility mapping and validation requirements.
  - Previously reviewed invariants still apply: no content-scanning fallback, no raw-path linkification, team-level `message_file_references.json`, team-level content endpoint, and focused-member **Sent Artifacts** / **Received Artifacts** projection.

## Round History

| Round | Trigger | Prior Unresolved Findings Rechecked | New Findings Found | Review Decision | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Initial architecture review of receiver-scoped design package | N/A | No | Pass | No | Superseded by user clarification toward team-level Sent/Received projection. |
| 2 | Superseding team-level Sent/Received design review | No prior unresolved findings | No | Pass | No | Team-level projection and Sent/Received UI remain approved; content-scanning source later superseded. |
| 3 | Superseding explicit `reference_files` design review | No unresolved findings | No | Pass | No | Explicit `reference_files` source approved; addendum later tightened content-quality invariant. |
| 4 | Addendum review for self-contained content and three-runtime coverage | No unresolved findings; Round 3 rechecked for instruction/UX impact | No | Pass | Yes | Email-like content invariant is now explicit and compatible with the architecture. |

## Reviewed Design Spec

Reviewed `/Users/normy/autobyteus_org/autobyteus-worktrees/team-message-referenced-artifacts/tickets/in-progress/team-message-referenced-artifacts/design-spec.md` as the authoritative Round 4 design. The design preserves the Round 3 explicit-reference architecture while adding a critical UX/instruction invariant: `reference_files` supplements, but never replaces, a natural and self-contained message body.

## Task Design Health Assessment Verdict

| Assessment Area | Result (`Pass`/`Fail`) | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | Design still classifies the work as a behavior change plus bounded refactor of an additive feature. | None. |
| Root-cause classification is explicit and evidence-backed | Pass | Design identifies `Boundary Or Ownership Issue` plus `Legacy Or Compatibility Pressure`: natural prose, explicit reference intent, event derivation, and persisted artifact projection have separate authorities. | None. |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | Design states refactor is needed now and rejects content scanning, receiver-scoped authority, raw-path content, uploads, and thin attachment-only content examples. | None. |
| Refactor decision is supported by the concrete design sections or residual-risk rationale | Pass | File mapping, migration sequence, validation requirements, examples, and AC-020 target self-contained content plus structured `reference_files`. | None. |

## Prior Findings Resolution Check (Mandatory On Round >1)

| Prior Round | Finding ID | Previous Severity | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| 1 | N/A | N/A | Superseded, no unresolved findings | Round 1 had no findings but receiver-centric direction is obsolete. | No finding IDs to carry. |
| 2 | N/A | N/A | Partially retained and partially superseded | Team-level projection/Sent/Received model remains; implicit content-scanning source was replaced in Round 3. | No finding IDs to carry. |
| 3 | N/A | N/A | Retained with addendum | Explicit `reference_files` architecture remains; Round 4 adds self-contained-content invariant and confirms runtime coverage. | No finding IDs to carry. |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? (`Pass`/`Fail`) | Narrative Is Clear? (`Pass`/`Fail`) | Facade Vs Governing Owner Is Clear? (`Pass`/`Fail`/`N/A`) | Main Domain Subject Naming Is Clear? (`Pass`/`Fail`) | Ownership Is Clear? (`Pass`/`Fail`) | Off-Spine Concerns Stay Off Main Line? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Tool call with natural content and optional explicit references | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-002 | Accepted `INTER_AGENT_MESSAGE.payload.reference_files` to `MESSAGE_FILE_REFERENCE_DECLARED` | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-003 | Team-level canonical references to focused-member Sent/Received UI | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-004 | Referenced artifact selection to team/reference content stream or graceful failure | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-005 | Accepted references to recipient-visible runtime input block | Pass | Pass | Pass | Pass | Pass | Pass | Pass |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? (`Pass`/`Fail`) | Reuse / Extend / Create-New Decision Is Sound? (`Pass`/`Fail`) | Supports The Right Spine Owners? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Team communication tools | Pass | Pass | Pass | Pass | Codex, Claude, and AutoByteus/native schemas/instructions must all expose `reference_files` and show email-like content examples. |
| Shared send-message parsing/delivery | Pass | Pass | Pass | Pass | Parser owns `reference_files` validation; delivery DTO carries normalized `referenceFiles`. |
| Runtime/event builders | Pass | Pass | Pass | Pass | Builder owns generated **Reference files:** block as an attachment/index supplement to self-contained content. |
| Agent event processing | Pass | Pass | Pass | Pass | Processor consumes `payload.reference_files` only and does not inspect content. |
| Message reference services | Pass | Pass | Pass | Pass | Team-level projection/content services remain canonical. |
| Frontend artifacts | Pass | Pass | Pass | Pass | Sent/Received UI remains projection-only and must not derive from message content. |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? (`Pass`/`Fail`) | Shared File Choice Is Sound? (`Pass`/`Fail`/`N/A`) | Ownership Of Shared Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Parsed explicit reference list | Pass | Pass | Pass | Pass | Shared parser/normalizer prevents provider drift across Codex, Claude, and native. |
| Delivery/event reference shape | Pass | Pass | Pass | Pass | `referenceFiles`/`reference_files` remain a path-reference list, not uploaded attachment metadata. |
| Self-contained content examples | Pass | Pass | Pass | Pass | Examples belong in schemas/instructions/docs, not runtime parser or projection services. |
| Declaration payload | Pass | Pass | Pass | Pass | Event-domain payload stays distinct from projection and UI perspective types. |
| Projection entry | Pass | Pass | Pass | Pass | Team-level persisted row remains canonical and deduped. |
| Frontend perspective item | Pass | Pass | Pass | Pass | Sent/Received direction is derived, not stored. |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Pass`/`Fail`) | Redundant Attributes Removed? (`Pass`/`Fail`) | Overlapping Representation Risk Is Controlled? (`Pass`/`Fail`) | Shared Core Vs Specialized Variant / Composition Decision Is Sound? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `content` | Pass | Pass | Pass | Pass | Pass | Natural, detailed, self-contained body; may mention paths naturally but is not artifact authority. |
| `reference_files: string[]` | Pass | Pass | Pass | Pass | Pass | Structured path-reference/Artifacts-registration list; not a replacement for content. |
| Generated **Reference files:** block | Pass | Pass | Pass | Pass | Pass | Recipient runtime attachment/index supplement; not the conversation UI authority. |
| `INTER_AGENT_MESSAGE.payload.reference_files` | Pass | Pass | Pass | Pass | Pass | Only event source for declarations. |
| `MessageFileReferencePerspectiveItem` | Pass | Pass | Pass | Pass | Pass | UI-only derived view. |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? (`Pass`/`Fail`) | Replacement Owner / Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Removal / Decommission Scope Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Content scanning fallback | Pass | Pass | Pass | Pass | Replaced by explicit `reference_files`; no compatibility fallback. |
| Markdown-wrapper/free-text path parser | Pass | Pass | Pass | Pass | Runtime parser evidence remains superseded evidence only. |
| Thin `See attached`-style examples | Pass | Pass | Pass | Pass | Replaced by complete email-like examples that explain the handoff. |
| `attachments` alias | Pass | Pass | Pass | Pass | Rejected; use `reference_files` only. |
| Receiver-scoped route/query/store/storage | Pass | Pass | Pass | Pass | Replaced by team-level query/content route/store selectors. |
| Raw path content endpoint | Pass | Pass | Pass | Pass | Persisted `teamRunId + referenceId` route remains. |
| References in `runFileChangesStore` | Pass | Pass | Pass | Pass | Message references stay separate from generated artifacts. |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? (`Pass`/`Fail`) | Responsibility Matches The Intended Owner/Boundary? (`Pass`/`Fail`) | Responsibilities Were Re-Tightened After Shared-Structure Extraction? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Codex schema/registration files | Pass | Pass | N/A | Pass | Add `reference_files` and email-like examples; pass parsed refs to delivery. |
| Claude schema/handler files | Pass | Pass | N/A | Pass | Same contract and examples as Codex; no divergent parsing. |
| AutoByteus/native send-message/event/message/handler files | Pass | Pass | Pass | Pass | Mirror `reference_files` contract and generated block. |
| `send-message-to-tool-argument-parser.ts` | Pass | Pass | Pass | Pass | One validation/dedupe policy; fail-fast malformed entries. |
| `inter-agent-message-delivery.ts` | Pass | Pass | N/A | Pass | DTO extension only. |
| `inter-agent-message-runtime-builders.ts` | Pass | Pass | Pass | Pass | Self-contained content plus generated **Reference files:** block and event payload mapping. |
| `message-file-reference-processor.ts` | Pass | Pass | Pass | Pass | Explicit refs only; no content scanning or IO. |
| `message-file-reference-paths.ts` | Pass | Pass | N/A | Pass | Remove or replace with explicit list normalizer; no free-text parser target. |
| `services/message-file-references/*` | Pass | Pass | Pass | Pass | Existing team-level projection/content owner remains correct. |
| Frontend store/components | Pass | Pass | Pass | Pass | Keep Sent/Received/Agent Artifacts composition; no message parsing. |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? (`Pass`/`Fail`) | Forbidden Shortcuts Are Explicit? (`Pass`/`Fail`) | Direction Is Coherent With Ownership? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Provider adapters | Pass | Pass | Pass | Pass | May depend on shared parser/delivery; must not persist references/read files. |
| Shared parser | Pass | Pass | Pass | Pass | Owns validation before delivery. |
| Runtime builders | Pass | Pass | Pass | Pass | Own generated block; managers avoid duplicate formatting. |
| Event processor | Pass | Pass | Pass | Pass | Reads `payload.reference_files`; content scanning and filesystem IO are forbidden. |
| Projection/content services | Pass | Pass | Pass | Pass | Own persisted identity and read validation. |
| Frontend store/UI | Pass | Pass | Pass | Pass | No Markdown/message click derivation. |
| Tool/schema examples | Pass | Pass | Pass | Pass | Must guide complete content; not just attachment-only messages. |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? (`Pass`/`Fail`) | Internal Owned Mechanisms Stay Internal? (`Pass`/`Fail`) | Caller Bypass Risk Is Controlled? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Shared send-message parser | Pass | Pass | Pass | Pass | Centralizes explicit reference-list validation. |
| `InterAgentMessageDeliveryRequest` | Pass | Pass | Pass | Pass | All runtimes use one normalized request shape. |
| Runtime builders | Pass | Pass | Pass | Pass | Keep generated block and event field mapping behind one boundary. |
| `MessageFileReferenceProcessor` | Pass | Pass | Pass | Pass | Sidecar derivation remains pipeline-owned. |
| `MessageFileReferenceProjectionService` | Pass | Pass | Pass | Pass | GraphQL/content services do not bypass projection reads. |
| `MessageFileReferenceContentService` | Pass | Pass | Pass | Pass | REST route stays thin; no raw path authority. |
| `messageFileReferencesStore` | Pass | Pass | Pass | Pass | Perspective grouping is centralized. |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? (`Pass`/`Fail`) | Responsibility Is Singular? (`Pass`/`Fail`) | Identity Shape Is Explicit? (`Pass`/`Fail`) | Generic Boundary Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- |
| `send_message_to` with natural `content` + optional `reference_files` | Pass | Pass | Pass | Low | Pass |
| `parseSendMessageToToolArguments` | Pass | Pass | Pass | Low | Pass |
| `InterAgentMessageDeliveryRequest` | Pass | Pass | Pass | Low | Pass |
| `buildRecipientVisibleInterAgentMessageContent` | Pass | Pass | Pass | Low | Pass |
| `buildInterAgentMessageAgentRunEvent` | Pass | Pass | Pass | Low | Pass |
| `MESSAGE_FILE_REFERENCE_DECLARED` | Pass | Pass | Pass | Low | Pass |
| `getMessageFileReferences(teamRunId)` | Pass | Pass | Pass | Low | Pass |
| `GET /team-runs/:teamRunId/message-file-references/:referenceId/content` | Pass | Pass | Pass | Low | Pass |
| `messageFileReferencesStore.getPerspectiveForMember` | Pass | Pass | Pass | Low | Pass |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? (`Pass`/`Fail`) | Folder Matches Owning Boundary? (`Pass`/`Fail`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Provider team-communication folders | Pass | Pass | Low | Pass | Correct adapter/schema placement. |
| `agent-team-execution/services` parser/builders | Pass | Pass | Low | Pass | Correct shared delivery/control layer. |
| `agent-execution/events/processors/message-file-reference` | Pass | Pass | Low | Pass | Correct pure event derivation area. |
| `services/message-file-references` | Pass | Pass | Medium | Pass | Projection/content share one subject; transport remains separate. |
| `autobyteus-ts` native communication contracts | Pass | Pass | Low | Pass | Correct public/native contract placement. |
| Frontend stores/components | Pass | Pass | Low | Pass | Store owns selectors; components own rendering/viewing only. |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? (`Pass`/`Fail`) | Reuse / Extension Decision Is Sound? (`Pass`/`Fail`) | New Support Piece Is Justified? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Send-message public contract | Pass | Pass | N/A | Pass | Same tool with one optional field and stronger examples. |
| Shared send-message parsing | Pass | Pass | N/A | Pass | Existing parser is right shared policy owner. |
| Recipient input/event shaping | Pass | Pass | N/A | Pass | Existing runtime builders are right formatter/event shaper. |
| Message-reference derivation | Pass | Pass | N/A | Pass | Existing processor is retained, source is explicit refs only. |
| Path text extraction | Pass | Pass | N/A | Pass | Removed because explicit list replaces it. |
| Team-level storage/content | Pass | Pass | N/A | Pass | Existing message-reference service area remains. |
| Frontend perspective state | Pass | Pass | N/A | Pass | Existing Sent/Received store/selectors remain. |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? (`Yes`/`No`) | Clean-Cut Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- |
| Content scanning fallback | No in target design | Pass | Pass | Explicitly rejected as a hard block. |
| Markdown/free-text parser target behavior | No in target design | Pass | Pass | Runtime note retained only as superseded evidence. |
| Attachment-only content examples | No in target design | Pass | Pass | Explicitly rejected by addendum/AC-020. |
| `attachments` alias | No | Pass | Pass | One field name prevents ambiguity. |
| Receiver-scoped route/query/store/storage | No in target design | Pass | Pass | Must not remain as compatibility wrappers. |
| Per-direction persisted rows | No | Pass | Pass | Direction remains perspective-derived. |
| Raw path content endpoint | No | Pass | Pass | Persisted reference id remains authority. |

## Migration / Refactor Safety Verdict

| Area | Sequence Is Realistic? (`Pass`/`Fail`) | Temporary Seams Are Explicit? (`Pass`/`Fail`) | Cleanup / Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- |
| Tool schemas/examples for Codex/Claude/native | Pass | Pass | Pass | Pass |
| Shared parser and delivery DTO | Pass | Pass | Pass | Pass |
| Runtime builders generated block | Pass | Pass | Pass | Pass |
| Processor refactor from content scan to explicit refs | Pass | Pass | Pass | Pass |
| Parser/scanner decommission | Pass | Pass | Pass | Pass |
| Team-level projection/content/frontend Sent/Received retention | Pass | Pass | Pass | Pass |
| Docs/tests/grep evidence update | Pass | Pass | Pass | Pass |
| Runtime concise diagnostics | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? (`Yes`/`No`) | Example Is Present And Clear? (`Pass`/`Fail`/`N/A`) | Bad / Avoided Shape Is Explained When Helpful? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Tool call with self-contained content and explicit refs | Yes | Pass | Pass | Pass | Good example explains the handoff and lists the file. |
| Recipient-visible generated block | Yes | Pass | Pass | Pass | Clarifies the block supplements the body like an attachment list. |
| Processor source | Yes | Pass | Pass | Pass | Contrasts `payload.reference_files` with old content scanner. |
| UI projection | Yes | Pass | Pass | Pass | Confirms canonical row, derived Sent/Received sections. |
| Content read | Yes | Pass | Pass | Pass | Confirms team/reference route and no raw path authority. |

## Missing Use Cases / Open Unknowns

| Item | Why It Matters | Required Action | Status |
| --- | --- | --- | --- |
| Invalid `reference_files` entries: fail whole tool call vs drop invalid entries | Determines strictness of explicit contract. | Architecture review continues to approve fail-fast validation with concise corrective error and no partial message. | Closed / approved. |
| Generated block label: **Reference files:** vs **Attached reference files:** | Copy should avoid upload semantics. | Architecture review continues to approve **Reference files:**. | Closed / approved. |
| Self-contained content invariant | Prevents `reference_files` from becoming a replacement for meaningful handoff prose. | Architecture review confirms this invariant is required and must be covered by schema/instruction examples and validation evidence. | Closed / approved. |
| Runtime coverage | Ensures no provider path silently lacks `reference_files`. | Architecture review confirms the current runtime set is Codex, Claude, and AutoByteus/native; implementation must complete all three. | Closed / approved. |

## Review Decision

- `Pass`: the addendum-enhanced explicit-reference design is ready for implementation.

## Findings

None.

## Classification

N/A - no blocking findings.

## Recommended Recipient

`implementation_engineer`

## Residual Risks

- Agents may omit `reference_files` while mentioning paths in prose; accepted tradeoff, mitigated by examples and docs.
- Agents may write thin content if examples are poor; AC-020 and validation requirements now explicitly require complete email-like examples.
- Fail-fast validation is correct, but error messages must be concise and actionable.
- Implementation must remove or make unreachable all production content-scanning paths and receiver-scoped remnants.
- Codex, Claude, and AutoByteus/native implementations must stay contract-aligned and covered by tests or schema snapshots.
- Existing team-level projection/content endpoint and Sent/Received UI must remain separated from run-file-change **Agent Artifacts**.

## Latest Authoritative Result

- Review Decision: Pass
- Notes: Round 4 is authoritative. Implement `reference_files` without weakening `content`: content remains natural, detailed, and self-contained; `reference_files` is the structured Artifacts registration/attachment list. Complete Codex, Claude, and AutoByteus/native paths.
