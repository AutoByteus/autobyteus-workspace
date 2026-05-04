# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-message-referenced-artifacts/tickets/in-progress/team-message-referenced-artifacts/requirements.md`
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-message-referenced-artifacts/tickets/in-progress/team-message-referenced-artifacts/investigation-notes.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-message-referenced-artifacts/tickets/in-progress/team-message-referenced-artifacts/design-spec.md`
- Runtime Parser Evidence Note: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-message-referenced-artifacts/tickets/in-progress/team-message-referenced-artifacts/runtime-investigation-message-reference-parser.md`
- Current Review Round: 3
- Trigger: Superseding explicit `send_message_to.reference_files` design requested on 2026-05-04 after runtime/parser evidence showed content scanning is brittle and over-eager.
- Prior Review Round Reviewed: Round 2 (`Pass`) in this same report path; Round 2 team-level Sent/Received artifact model remains approved, while its content-scanning/parser implementation direction is superseded.
- Latest Authoritative Round: Round 3
- Current-State Evidence Basis:
  - Revised requirements/design package and runtime parser evidence at the paths above.
  - Existing send-message public/adapter contract files named by the design: `autobyteus-server-ts/src/agent-execution/backends/codex/team-communication/codex-send-message-tool-spec-builder.ts`, `autobyteus-server-ts/src/agent-execution/backends/claude/team-communication/claude-send-message-tool-definition-builder.ts`, `autobyteus-server-ts/src/agent-team-execution/services/send-message-to-tool-argument-parser.ts`, `autobyteus-server-ts/src/agent-team-execution/domain/inter-agent-message-delivery.ts`, and native `autobyteus-ts/src/agent/message/send-message-to.ts`.
  - Existing protected conversation display path remains `INTER_AGENT_MESSAGE -> TeamStreamingService -> handleInterAgentMessage -> InterAgentMessageSegment`.
  - Existing event-sidecar seam remains `AgentRunEventPipeline` plus `publishProcessedTeamAgentEvents` for accepted synthetic team-manager events.
  - Current in-ticket code still contains parser/content-scanning and prior authority surfaces that this design explicitly removes/refactors, including `extractMessageFileReferencePathCandidates`, content-derived declaration tests/docs, and any receiver-scoped route/query/store/storage remnants.

## Round History

| Round | Trigger | Prior Unresolved Findings Rechecked | New Findings Found | Review Decision | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Initial architecture review of receiver-scoped design package | N/A | No | Pass | No | Superseded by user clarification toward team-level Sent/Received projection. |
| 2 | Superseding team-level Sent/Received design review | No prior unresolved findings | No | Pass | No | Team-level projection and Sent/Received UI remain approved; content-scanning parser source is now superseded. |
| 3 | Superseding explicit `reference_files` design review | No unresolved findings; Round 2 model rechecked for compatibility with explicit references | No | Pass | Yes | Explicit `reference_files` source, no content-scanning fallback, and existing team-level projection model are ready for implementation. |

## Reviewed Design Spec

Reviewed `/Users/normy/autobyteus_org/autobyteus-worktrees/team-message-referenced-artifacts/tickets/in-progress/team-message-referenced-artifacts/design-spec.md` as the authoritative Round 3 design. Round 3 preserves the approved team-level **Agent Artifacts** / **Sent Artifacts** / **Received Artifacts** product model and changes the source of message references from implicit content parsing to explicit optional `send_message_to.reference_files`.

## Task Design Health Assessment Verdict

| Assessment Area | Result (`Pass`/`Fail`) | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | Design classifies the work as a behavior change plus bounded refactor of an additive feature. | None. |
| Root-cause classification is explicit and evidence-backed | Pass | Design identifies `Boundary Or Ownership Issue` plus `Legacy Or Compatibility Pressure`: natural prose, explicit reference intent, event derivation, and persisted artifact projection have separate authorities. | None. |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | Design states refactor is needed now and explicitly defers historical backfill, agent-to-user references, uploads, content scanning, and counts/history UI. | None. |
| Refactor decision is supported by the concrete design sections or residual-risk rationale | Pass | File mapping, removal plan, migration sequence, validation requirements, and examples all target `reference_files` as the only declaration source. | None. |

## Prior Findings Resolution Check (Mandatory On Round >1)

| Prior Round | Finding ID | Previous Severity | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| 1 | N/A | N/A | Superseded, no unresolved findings | Round 1 had no findings but receiver-centric direction is obsolete. | No finding IDs to carry. |
| 2 | N/A | N/A | Partially retained and partially superseded | Team-level projection/Sent/Received model remains; implicit content-scanning source is replaced by explicit `reference_files`. | No finding IDs to carry. |

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
| Team communication tools | Pass | Pass | Pass | Pass | Codex, Claude, and native/autobyteus public schemas are extended with the same optional field. |
| Shared send-message parsing/delivery | Pass | Pass | Pass | Pass | `send-message-to-tool-argument-parser.ts` and `InterAgentMessageDeliveryRequest` are the right boundary for normalized `referenceFiles`. |
| Runtime/event builders | Pass | Pass | Pass | Pass | Builder owns generated recipient **Reference files:** block and accepted event payload `reference_files`. |
| Agent event processing | Pass | Pass | Pass | Pass | Existing `MessageFileReferenceProcessor` remains the sidecar owner but changes source from content scanning to explicit refs. |
| Message reference services | Pass | Pass | Pass | Pass | Existing team-level projection/content services remain the authority. |
| Frontend artifacts | Pass | Pass | Pass | Pass | Existing Sent/Received selectors/UI remain the perspective owner and must not scan messages. |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? (`Pass`/`Fail`) | Shared File Choice Is Sound? (`Pass`/`Fail`/`N/A`) | Ownership Of Shared Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Parsed explicit reference list | Pass | Pass | Pass | Pass | Shared parser or explicit reference normalizer prevents provider-specific validation drift. |
| Delivery/event reference shape | Pass | Pass | Pass | Pass | `referenceFiles`/`reference_files` are one semantic list, not an attachment object with upload metadata. |
| Declaration payload | Pass | Pass | Pass | Pass | Event-domain payload stays distinct from projection and UI perspective types. |
| Projection entry | Pass | Pass | Pass | Pass | Team-level persisted row remains canonical and deduped by team/sender/receiver/path. |
| Frontend perspective item | Pass | Pass | Pass | Pass | Sent/Received direction is derived, not persisted. |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Pass`/`Fail`) | Redundant Attributes Removed? (`Pass`/`Fail`) | Overlapping Representation Risk Is Controlled? (`Pass`/`Fail`) | Shared Core Vs Specialized Variant / Composition Decision Is Sound? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `reference_files: string[]` | Pass | Pass | Pass | Pass | Pass | Name is precise: path references, not uploaded blobs. |
| `InterAgentMessageDeliveryRequest.referenceFiles` | Pass | Pass | Pass | Pass | Pass | Normalized to an empty array when omitted. |
| `INTER_AGENT_MESSAGE.payload.reference_files` | Pass | Pass | Pass | Pass | Pass | Only event source for declarations; content remains natural prose. |
| `AgentRunMessageFileReferencePayload` | Pass | Pass | Pass | Pass | Pass | No direction, counts, raw content, or run-file-change fields. |
| `MessageFileReferencePerspectiveItem` | Pass | Pass | Pass | Pass | Pass | UI-only derived view. |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? (`Pass`/`Fail`) | Replacement Owner / Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Removal / Decommission Scope Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Content scanning fallback | Pass | Pass | Pass | Pass | Replaced by explicit `reference_files`; no compatibility fallback. |
| Markdown-wrapper/free-text path parser | Pass | Pass | Pass | Pass | Runtime parser evidence is retained only to justify removal. |
| `extractMessageFileReferencePathCandidates` production path/tests | Pass | Pass | Pass | Pass | Remove or replace with explicit path-list normalization tests. |
| Receiver-scoped route/query/store/storage | Pass | Pass | Pass | Pass | Replaced by team-level query/content route/store selectors. |
| Raw path content endpoint | Pass | Pass | Pass | Pass | Persisted `teamRunId + referenceId` route remains. |
| References in `runFileChangesStore` | Pass | Pass | Pass | Pass | Message references stay in dedicated store/services. |
| Message linkification/click-created references | Pass | Pass | Pass | Pass | Explicit backend contract replaces UI authority. |
| `attachments` alias | Pass | Pass | Pass | Pass | Rejected to avoid two schema names and upload semantics. |
| Counts/occurrence history UI | Pass | Pass | Pass | Pass | Latest-wins dedupe remains. |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? (`Pass`/`Fail`) | Responsibility Matches The Intended Owner/Boundary? (`Pass`/`Fail`) | Responsibilities Were Re-Tightened After Shared-Structure Extraction? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Codex `codex-send-message-tool-spec-builder.ts` | Pass | Pass | N/A | Pass | Schema description/examples only. |
| Codex dynamic tool registration | Pass | Pass | N/A | Pass | Thin adapter passes parsed `referenceFiles`. |
| Claude tool definition builder | Pass | Pass | N/A | Pass | Provider schema only. |
| Claude tool call handler | Pass | Pass | N/A | Pass | Thin adapter passes parsed `referenceFiles`. |
| `send-message-to-tool-argument-parser.ts` | Pass | Pass | Pass | Pass | One parse/validation/dedupe policy for server providers. |
| `inter-agent-message-delivery.ts` | Pass | Pass | N/A | Pass | DTO extension only. |
| `inter-agent-message-runtime-builders.ts` | Pass | Pass | Pass | Pass | Generated recipient block and event payload mapping belong here. |
| Team manager files | Pass | Pass | N/A | Pass | Preserve normalized `referenceFiles`; no reference persistence. |
| `message-file-reference-processor.ts` | Pass | Pass | Pass | Pass | Explicit refs only; no content scanning or IO. |
| `message-file-reference-paths.ts` | Pass | Pass | N/A | Pass | Remove or replace with explicit list normalizer; no free-text parser. |
| Native `autobyteus-ts` send-message/event/message/handler files | Pass | Pass | Pass | Pass | Mirror field and generated block to avoid provider drift. |
| `services/message-file-references/*` | Pass | Pass | Pass | Pass | Existing team-level persistence/content owner remains correct. |
| Frontend store/components | Pass | Pass | Pass | Pass | Continue Sent/Received/Agent Artifacts composition with no message parsing. |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? (`Pass`/`Fail`) | Forbidden Shortcuts Are Explicit? (`Pass`/`Fail`) | Direction Is Coherent With Ownership? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Provider adapters | Pass | Pass | Pass | Pass | May depend on shared parser/delivery; must not persist references or read files. |
| Shared parser | Pass | Pass | Pass | Pass | Owns validation/normalization before delivery. |
| Runtime builders | Pass | Pass | Pass | Pass | Own generated block/event payload; managers avoid duplicate formatting. |
| Event processor | Pass | Pass | Pass | Pass | Reads `payload.reference_files`; content scanning and filesystem IO are forbidden. |
| Projection/content services | Pass | Pass | Pass | Pass | Own persisted identity, team-level storage, read validation, and content serving. |
| Frontend store/UI | Pass | Pass | Pass | Pass | Consumes canonical refs/selectors; no Markdown/message click derivation. |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? (`Pass`/`Fail`) | Internal Owned Mechanisms Stay Internal? (`Pass`/`Fail`) | Caller Bypass Risk Is Controlled? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Shared send-message parser | Pass | Pass | Pass | Pass | Centralizes explicit list validation and concise validation errors. |
| `InterAgentMessageDeliveryRequest` | Pass | Pass | Pass | Pass | All providers deliver through one normalized request shape. |
| Runtime builders | Pass | Pass | Pass | Pass | Generated recipient block and event field mapping are not duplicated in managers. |
| `MessageFileReferenceProcessor` | Pass | Pass | Pass | Pass | Sidecar derivation remains behind pipeline. |
| `MessageFileReferenceProjectionService` | Pass | Pass | Pass | Pass | GraphQL/content services should not read JSON directly. |
| `MessageFileReferenceContentService` | Pass | Pass | Pass | Pass | REST route stays thin and no raw path authority is introduced. |
| `messageFileReferencesStore` | Pass | Pass | Pass | Pass | Perspective grouping is not duplicated in components. |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? (`Pass`/`Fail`) | Responsibility Is Singular? (`Pass`/`Fail`) | Identity Shape Is Explicit? (`Pass`/`Fail`) | Generic Boundary Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- |
| `send_message_to` with optional `reference_files` | Pass | Pass | Pass | Low | Pass |
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
| `services/message-file-references` | Pass | Pass | Medium | Pass | Projection/content are mixed but share one subject; transport remains separate. |
| `autobyteus-ts` native communication contracts | Pass | Pass | Low | Pass | Correct public/native contract placement. |
| Frontend stores/components | Pass | Pass | Low | Pass | Store owns selectors; components own rendering/viewer only. |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? (`Pass`/`Fail`) | Reuse / Extension Decision Is Sound? (`Pass`/`Fail`) | New Support Piece Is Justified? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Send-message public contract | Pass | Pass | N/A | Pass | Same tool with one optional field. |
| Shared send-message parsing | Pass | Pass | N/A | Pass | Existing parser is right shared policy owner. |
| Recipient input/event shaping | Pass | Pass | N/A | Pass | Existing runtime builders are right shared formatter/event shaper. |
| Message-reference derivation | Pass | Pass | N/A | Pass | Existing processor is retained but source changes. |
| Path text extraction | Pass | Pass | N/A | Pass | Removed because explicit list replaces it. |
| Team-level storage/content | Pass | Pass | N/A | Pass | Existing message-reference service area remains. |
| Frontend perspective state | Pass | Pass | N/A | Pass | Existing Sent/Received store/selectors remain. |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? (`Yes`/`No`) | Clean-Cut Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- |
| Content scanning fallback | No in target design | Pass | Pass | Explicitly rejected as a hard block. |
| Markdown/free-text parser target behavior | No in target design | Pass | Pass | Runtime note retained only as superseded evidence. |
| `attachments` alias | No | Pass | Pass | One field name prevents schema ambiguity. |
| Receiver-scoped route/query/store/storage | No in target design | Pass | Pass | Must not remain as compatibility wrappers. |
| Per-direction persisted rows | No | Pass | Pass | Direction remains perspective-derived. |
| Raw path content endpoint | No | Pass | Pass | Persisted reference id remains authority. |

## Migration / Refactor Safety Verdict

| Area | Sequence Is Realistic? (`Pass`/`Fail`) | Temporary Seams Are Explicit? (`Pass`/`Fail`) | Cleanup / Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- |
| Tool schemas and shared parser | Pass | Pass | Pass | Pass |
| Delivery DTO and runtime builders | Pass | Pass | Pass | Pass |
| Native/autobyteus contract parity | Pass | Pass | Pass | Pass |
| Processor refactor from content scan to explicit refs | Pass | Pass | Pass | Pass |
| Parser/scanner decommission | Pass | Pass | Pass | Pass |
| Existing team-level projection/content/frontend Sent/Received retention | Pass | Pass | Pass | Pass |
| Docs/tests/grep evidence update | Pass | Pass | Pass | Pass |
| Runtime concise diagnostics | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? (`Yes`/`No`) | Example Is Present And Clear? (`Pass`/`Fail`/`N/A`) | Bad / Avoided Shape Is Explained When Helpful? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Tool call with explicit refs | Yes | Pass | Pass | Pass | Clearly distinguishes natural prose from structured references. |
| Recipient-visible generated block | Yes | Pass | Pass | Pass | Clarifies recipient runtime can see refs without requiring sender to duplicate paths in prose. |
| Processor source | Yes | Pass | Pass | Pass | Directly contrasts `payload.reference_files` with old content scanner. |
| UI projection | Yes | Pass | Pass | Pass | Confirms canonical row, derived Sent/Received sections. |
| Content read | Yes | Pass | Pass | Pass | Confirms team/reference route, no raw path authority. |

## Missing Use Cases / Open Unknowns

| Item | Why It Matters | Required Action | Status |
| --- | --- | --- | --- |
| Invalid `reference_files` entries: fail whole tool call vs drop invalid entries | This determines whether the explicit contract is strict and predictable or permissive and partially lossy. | Architecture review confirms the current fail-fast design is sound: invalid explicit references should reject the tool call before delivery with a concise corrective error and no partial message. | Closed / approved. |
| Generated block label: **Reference files:** vs **Attached reference files:** | Copy could imply upload semantics if poorly named. | Architecture review confirms **Reference files:** is clear and consistent with `reference_files`; no product ambiguity remains. | Closed / approved. |

## Review Decision

- `Pass`: the revised explicit-reference design is ready for implementation.

## Findings

None.

## Classification

N/A - no blocking findings.

## Recommended Recipient

`implementation_engineer`

## Residual Risks

- Agents may omit `reference_files` while mentioning paths in prose; this is an accepted product tradeoff and should be mitigated by positive schema descriptions/examples.
- Fail-fast validation is correct, but error messages must remain concise and corrective so agents can retry successfully.
- Implementation must remove or make unreachable all production content-scanning paths; grep/test evidence should cover `extractMessageFileReferencePathCandidates`, Markdown-wrapper parser tests, and docs.
- Provider implementations must not diverge; Codex, Claude, and native/autobyteus paths need shared parser/contract tests.
- Runtime builders must keep conversation display content natural; the generated **Reference files:** block belongs in recipient runtime input, while UI rows come from `payload.reference_files` sidecar derivation.
- Existing team-level projection/content endpoint and Sent/Received UI must remain separated from run-file-change **Agent Artifacts**.

## Latest Authoritative Result

- Review Decision: Pass
- Notes: Round 3 is authoritative. Implement explicit optional `send_message_to.reference_files`, derive message references only from `INTER_AGENT_MESSAGE.payload.reference_files`, remove content scanning/parser fallback, and keep the approved team-level **Agent Artifacts** / **Sent Artifacts** / **Received Artifacts** model and team-level content endpoint.
