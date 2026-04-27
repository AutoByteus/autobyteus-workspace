# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/external-channel-stream-output-dedupe/requirements.md`
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/external-channel-stream-output-dedupe/investigation-notes.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/external-channel-stream-output-dedupe/design-spec.md`
- Current Review Round: 1
- Trigger: Scoped rework architecture review requested by `solution_designer` for external-channel streamed output dedupe.
- Prior Review Round Reviewed: N/A
- Latest Authoritative Round: 1
- Current-State Evidence Basis: Scoped artifacts plus source spot-checks in `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-server-ts/src/external-channel/runtime/channel-output-event-parser.ts`, `channel-run-output-event-collector.ts`, `channel-run-output-delivery-runtime.ts`, existing runtime unit tests, and agent backend stream event converters. The current `replyTextFinal` corruption is upstream of gateway callback transport.

## Round History

| Round | Trigger | Prior Unresolved Findings Rechecked | New Findings Found | Review Decision | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Initial scoped rework review | N/A | No blocking findings | Pass | Yes | Design is appropriately scoped to server external-channel runtime parser/collector and excludes gateway inbox cleanup. |

## Reviewed Design Spec

`/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/external-channel-stream-output-dedupe/design-spec.md`

## Prior Findings Resolution Check (Mandatory On Round >1)

| Prior Round | Finding ID | Previous Severity | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| N/A | N/A | N/A | N/A | N/A | First review round. |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? (`Pass`/`Fail`) | Narrative Is Clear? (`Pass`/`Fail`) | Facade Vs Governing Owner Is Clear? (`Pass`/`Fail`/`N/A`) | Main Domain Subject Naming Is Clear? (`Pass`/`Fail`) | Ownership Is Clear? (`Pass`/`Fail`) | Off-Spine Concerns Stay Off Main Line? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Accepted external dispatch to callback outbox final reply text | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-002 | Parsed event text to collector final reply | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-003 | Team/agent runtime event to external reply publication | Pass | Pass | Pass | Pass | Pass | Pass | Pass |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? (`Pass`/`Fail`) | Reuse / Extend / Create-New Decision Is Sound? (`Pass`/`Fail`) | Supports The Right Spine Owners? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `external-channel/runtime` | Pass | Pass | Pass | Pass | Correct owner for parser, collector, text assembly, and runtime publication sequencing. |
| `external-channel/services` | Pass | Pass | Pass | Pass | Reused unchanged for delivery persistence; not asked to own content cleanup. |
| Messaging gateway runtime | Pass | Pass | Pass | Pass | Correctly left unchanged because persisted server `replyTextFinal` is already corrupted before transport. |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? (`Pass`/`Fail`) | Shared File Choice Is Sound? (`Pass`/`Fail`/`N/A`) | Ownership Of Shared Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Stream/final text assembly rules | Pass | Pass | Pass | Pass | `channel-output-text-assembler.ts` or collector-adjacent pure functions are justified and testable. |
| Parsed event text source/kind | Pass | Pass | Pass | Pass | Extending `ParsedChannelOutputEvent` avoids collector peeking into raw backend payloads. |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Pass`/`Fail`) | Redundant Attributes Removed? (`Pass`/`Fail`) | Overlapping Representation Risk Is Controlled? (`Pass`/`Fail`) | Shared Core Vs Specialized Variant / Composition Decision Is Sound? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `ParsedChannelOutputEvent.text` | Pass | Pass | Pass | N/A | Pass | Design keeps `text` as payload text and adds `textKind`/`textSource` for handling semantics. |
| `ParsedChannelOutputEvent.textKind` / `textSource` | Pass | Pass | Pass | N/A | Pass | Narrow values such as stream fragment vs final text are sufficient. |
| Text assembler helper input | Pass | Pass | Pass | N/A | Pass | String-only helper avoids broad event-model coupling. |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? (`Pass`/`Fail`) | Replacement Owner / Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Removal / Decommission Scope Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Ambiguous `mergeAssistantText` as one-size-fits-all policy | Pass | Pass | Pass | Pass | Must be removed/replaced/renamed so parser no longer owns accumulation policy. |
| Gateway-side text cleanup idea | Pass | Pass | Pass | Pass | Explicitly rejected in this scope. |
| Gateway stale inbox compatibility/reset | Pass | Pass | Pass | Pass | Explicitly out of scope per user-approved narrowed requirements. |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? (`Pass`/`Fail`) | Responsibility Matches The Intended Owner/Boundary? (`Pass`/`Fail`) | Responsibilities Were Re-Tightened After Shared-Structure Extraction? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/external-channel/runtime/channel-output-event-parser.ts` | Pass | Pass | Pass | Pass | Parser owns event normalization and text source classification, not pending state. |
| `autobyteus-server-ts/src/external-channel/runtime/channel-run-output-event-collector.ts` | Pass | Pass | Pass | Pass | Collector owns pending turns, assembly, and final reply selection. |
| `autobyteus-server-ts/src/external-channel/runtime/channel-output-text-assembler.ts` | Pass | Pass | N/A | Pass | Pure collector support is a sound small extraction. |
| `autobyteus-server-ts/tests/unit/external-channel/runtime/channel-run-output-event-collector.test.ts` | Pass | Pass | N/A | Pass | Directly covers the bug owner. |
| `autobyteus-server-ts/tests/unit/external-channel/runtime/channel-output-event-parser.test.ts` | Pass | Pass | N/A | Pass | Covers source classification. |
| `autobyteus-server-ts/tests/unit/external-channel/runtime/channel-run-output-delivery-runtime.test.ts` | Pass | Pass | N/A | Pass | Confirms server-side publish text before gateway. |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? (`Pass`/`Fail`) | Forbidden Shortcuts Are Explicit? (`Pass`/`Fail`) | Direction Is Coherent With Ownership? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Runtime orchestration | Pass | Pass | Pass | Pass | Runtime calls parser/eligibility/collector/persistence/publisher but does not patch strings directly. |
| Parser | Pass | Pass | Pass | Pass | Depends on runtime event types and exposes normalized parsed events only. |
| Collector | Pass | Pass | Pass | Pass | Depends on parsed event shape and text assembler helper, not raw backend payloads. |
| Gateway/callback service | Pass | Pass | Pass | Pass | Treats `replyText` as opaque content. |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? (`Pass`/`Fail`) | Internal Owned Mechanisms Stay Internal? (`Pass`/`Fail`) | Caller Bypass Risk Is Controlled? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `ChannelRunOutputEventCollector.processEvent` | Pass | Pass | Pass | Pass | Correct authoritative boundary for per-turn assembly. |
| `parseDirectChannelOutputEvent` / `parseTeamChannelOutputEvent` | Pass | Pass | Pass | Pass | Correct parser boundary for shape extraction and source classification. |
| `ReplyCallbackService.publishRunOutputReply` | Pass | Pass | Pass | Pass | Correctly not used for dedupe/content rewriting. |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? (`Pass`/`Fail`) | Responsibility Is Singular? (`Pass`/`Fail`) | Identity Shape Is Explicit? (`Pass`/`Fail`) | Generic Boundary Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- |
| `ParsedChannelOutputEvent` | Pass | Pass | Pass | Low | Pass |
| `ChannelRunOutputEventCollector.processEvent({ deliveryKey, event })` | Pass | Pass | Pass | Low | Pass |
| `appendOutputTextFragment(current, incoming)` | Pass | Pass | Pass | Low | Pass |
| `ReplyCallbackService.publishRunOutputReply` | Pass | Pass | Pass | Low | Pass |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? (`Pass`/`Fail`) | Folder Matches Owning Boundary? (`Pass`/`Fail`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/external-channel/runtime/` | Pass | Pass | Low | Pass | Existing flat runtime folder is acceptable for this scoped runtime fix. |
| `autobyteus-server-ts/tests/unit/external-channel/runtime/` | Pass | Pass | Low | Pass | Mirrors existing unit test organization. |
| Messaging gateway paths | Pass | Pass | Low | Pass | Not target placement because gateway is out of scope. |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? (`Pass`/`Fail`) | Reuse / Extension Decision Is Sound? (`Pass`/`Fail`) | New Support Piece Is Justified? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Direct/team event parsing | Pass | Pass | N/A | Pass | Extend existing parser. |
| Per-turn output collection | Pass | Pass | N/A | Pass | Extend existing collector. |
| Overlap-safe string policy | Pass | Pass | Pass | Pass | New pure helper is justified because current parser merge helper owns the wrong concern. |
| Transport delivery | Pass | Pass | N/A | Pass | Reuse unchanged. |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? (`Yes`/`No`) | Clean-Cut Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- |
| Gateway stale inbox statuses | No | Pass | Pass | Explicitly excluded; no legacy compatibility should be added. |
| Gateway regex/post-processing cleanup | No | Pass | Pass | Explicitly rejected. |
| Old ambiguous text merge | No after implementation | Pass | Pass | Replace with explicit assembler semantics. |

## Migration / Refactor Safety Verdict

| Area | Sequence Is Realistic? (`Pass`/`Fail`) | Temporary Seams Are Explicit? (`Pass`/`Fail`) | Cleanup / Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- |
| Regression tests first | Pass | Pass | Pass | Pass |
| Parser source-kind extension | Pass | Pass | Pass | Pass |
| Text assembler extraction | Pass | Pass | Pass | Pass |
| Collector update | Pass | Pass | Pass | Pass |
| Runtime publish verification | Pass | Pass | Pass | Pass |
| No-gateway-change confirmation | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? (`Yes`/`No`) | Example Is Present And Clear? (`Pass`/`Fail`/`N/A`) | Bad / Avoided Shape Is Explained When Helpful? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Overlap-safe assembly | Yes | Pass | Pass | Pass | Uses the user's exact visible bug shape. |
| Final text precedence | Yes | Pass | Pass | Pass | Clarifies that final snapshots supersede noisy stream fragments. |
| Gateway boundary | Yes | Pass | Pass | Pass | Makes content-agnostic transport boundary explicit. |

## Missing Use Cases / Open Unknowns

| Item | Why It Matters | Required Action | Status |
| --- | --- | --- | --- |
| None blocking | Requirements cover observed overlap duplication, delta fragments, cumulative snapshots, final snapshot precedence, callback preservation, and no gateway changes. | N/A | Closed for design review. |

## Review Decision

Pass: the scoped design is ready for implementation.

## Findings

None.

## Classification

N/A - no blocking design-review findings.

## Recommended Recipient

`implementation_engineer`

## Residual Risks

- The overlap assembler must be conservative: preserve normal true deltas and intentional repeated words as much as possible while fixing exact suffix/prefix overlap and cumulative snapshots.
- If a backend emits several independent final text segments in one turn, final-selection tests should ensure the collector does not discard legitimate multi-segment content. Prefer a narrow definition of final snapshot and keep tests representative.
- Parser changes must not include non-text tool/file/reasoning segments in external replies.
- Implementation must confirm no files under `autobyteus-message-gateway/` change for this ticket.

## Latest Authoritative Result

- Review Decision: Pass
- Notes: Approved for implementation. The boundary decision is sound: the corrupted `replyTextFinal` exists before callback transport, so the fix belongs in `autobyteus-server-ts/src/external-channel/runtime` parser/collector/text assembly, not in messaging gateway or callback transport.
