# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-nested-agent-team/tickets/mixed-team-nested-agent-team/requirements-doc.md`
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-nested-agent-team/tickets/mixed-team-nested-agent-team/investigation-notes.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-nested-agent-team/tickets/mixed-team-nested-agent-team/design-spec.md`
- Additional Context Artifacts: `/Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-nested-agent-team/tickets/mixed-team-nested-agent-team/command-api-clean-cut-design-rework-note.md`, `/Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-nested-agent-team/tickets/mixed-team-nested-agent-team/upward-nested-team-reporting-design-rework-note.md`, `/Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-nested-agent-team/tickets/mixed-team-nested-agent-team/round5-live-transcript-projection-presentation-design-rework-note.md`, current protocol/module docs, prior implementation/review/validation artifacts, and prior review rounds in this canonical report.
- Current Review Round: 14
- Trigger: Re-review after solution design corrected `ARCH-CMD-001` from Round 13 and aligned the command API design to path/route-only public/domain command targets.
- Prior Review Round Reviewed: Round 13 in this same canonical file path.
- Latest Authoritative Round: 14
- Current-State Evidence Basis: Re-read the architecture-reviewer workflow, shared design principles, revised requirements, revised investigation notes, revised design spec, Round 20 command API clean-cut rework note, current protocol/module docs, and current command/selector code seams. Verified the exact stale-allowance grep has no hits for the previously blocking phrases and inspected relevant requirements/design/doc line ranges for path/route-only command identity.

## Round History

| Round | Trigger | Prior Unresolved Findings Rechecked | New Findings Found | Review Decision | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Initial architecture review before user-requested pause | N/A | None | Pass | No | Superseded by later design-owner revisions. |
| 2 | Review of refined package after design-owner recheck | No unresolved findings from round 1 | None | Pass | No | Superseded by naming and metadata revisions. |
| 3 | Naming revision review | No unresolved findings from round 2 | None | Pass | No | Superseded by metadata revisions. |
| 4 | Canonical metadata storage policy review | No unresolved findings from round 3 | None | Pass | No | Superseded by metadata item-type and no-backcompat clarifications. |
| 5 | Metadata item-type naming review | No unresolved findings from round 4 | None | Pass | No | Superseded by hard no-backward-compatibility clarification. |
| 6 | Historical flat metadata no-backcompat review | No unresolved findings from round 5 | None | Pass | No | Superseded by Round 7 full-pass review. |
| 7 | Independent deep full review requested by user | No unresolved findings from round 6 | 3 | Fail | No | Found public command selector, metadata store/projection, and subteam communication projection gaps. |
| 8 | Revised package after Round 7 design-impact rework | `ARCH-NESTED-001`, `ARCH-NESTED-002`, `ARCH-NESTED-003` | None | Pass | No | Round 7 findings were resolved. Superseded by full-stack UI validation rework. |
| 9 | Revised package after API/E2E frontend nested-team UI failure | Round 7/8 architecture findings and UI failure note | None | Pass | No | Frontend recursive display/read-model/route-key design was sufficient. Superseded by communication-roster design reset. |
| 10 | Revised package after communication-boundary/user-discussion reset | Round 7/8/9 architecture findings and validation-discovered gaps | 2 | Fail | No | Communication-roster direction accepted in principle, but representative delivery and descriptor/projection shapes needed rework. |
| 11 | Revised package after Round 10 design-impact response | `ARCH-COMM-001`, `ARCH-COMM-002` | None | Pass | No | Absolute-route representative delivery, descriptor coordinate semantics, and represented-subteam DTO flow became concrete enough for implementation. |
| 12 | LLM roster-manifest presentation refinement | Round 10/11 communication findings and Round 11 pass state | None | Pass | No | `TeamMembershipRosterManifest` is a clean prompt-presentation boundary derived from descriptors; routing contract remains unchanged. |
| 13 | Round 20 clean-cut command API rework | Round 12 pass state plus Round 20 command API conflict | 1 | Fail | No | Found stale authoritative bare-name/top-level-name command selector allowances. |
| 14 | Round 13 command API correction | `ARCH-CMD-001` | None | Pass | Yes | Stale command selector allowances are removed; design is ready to return to implementation. |

## Reviewed Design Spec

Reviewed `/Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-nested-agent-team/tickets/mixed-team-nested-agent-team/design-spec.md` as the current authoritative design package for the Round 13 correction to the Round 20 command API clean-cut rework.

The corrected design is architecturally sound:

- `TeamMemberSelector` is consistently specified as path/route-only: `{ kind: 'path'; memberPath: string[] } | { kind: 'route_key'; memberRouteKey: string }`.
- `top_level_name` is explicitly not a selector variant. Mixed runtime dispatch may derive an executable top-level segment only from an already accepted `memberPath[0]` or first route-key segment.
- `selectorFromMemberName` and `selectorFromOptionalTargetName` are explicitly required to be deleted or replaced for public/domain command paths.
- WebSocket/GraphQL team `SEND_MESSAGE` accepts only `target_member_path` / `targetMemberPath` or `target_member_route_key` / `targetMemberRouteKey`.
- Team approval/denial commands accept only emitted path/route identity (`source_*`, `member_*`, or `target_member_*` path/route fields) and reject scalar name/id fields.
- `send_message_to.recipient_name` remains correctly scoped as an LLM roster label resolved through `communicationRecipients`, not a public runtime command selector.
- The launch-config risk is now explicitly scoped outside runtime command/approval APIs and cannot reintroduce command target aliases.
- Protocol/module docs reviewed in this pass align with the clean-cut API contract.

## Task Design Health Assessment Verdict

| Assessment Area | Result (`Pass`/`Fail`) | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | Round 20 is treated as a design-impact command API cleanup caused by legacy/compatibility pressure. | None. |
| Root-cause classification is explicit and evidence-backed | Pass | Investigation notes identify scalar command aliases and current code seams; the design now corrects the boundary rather than preserving compatibility. | None. |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | The design requires deleting/replacing public/domain name-selector helpers and moving command edges to explicit path/route selectors. | None. |
| Refactor decision is supported by the concrete design sections or residual-risk rationale | Pass | Requirements, CR-007a, DS-004, DS-012, DS-024, interface mapping, removal table, protocol docs, and migration sequence all reflect the same path/route-only contract. | None. |

## Prior Findings Resolution Check (Mandatory On Round >1)

| Prior Round | Finding ID | Previous Severity | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| 7 | `ARCH-NESTED-001` | High | Resolved | Selector is the public/domain command boundary; current design now tightens it to path/route-only. | No regression. |
| 7 | `ARCH-NESTED-002` | High | Resolved | Canonical recursive metadata/no-backcompat policy remains unchanged. | No action. |
| 7 | `ARCH-NESTED-003` | Medium | Resolved / superseded by stronger design | Communication descriptors, represented-subteam metadata, roster manifest, and parent-boundary bridge remain intact. | No action. |
| API/E2E UI gap | `FS-UI-NESTED-001` | High | Resolved in design | Recursive frontend tree/focus/history requirements remain present. | No action. |
| API/E2E transcript/projection gap | `FS-TRANSCRIPT-001` | High | Resolved in design | `MEMBER_INPUT`, delivery trace IDs, projection dedupe, and presentation policy remain specified. | No action. |
| 10 | `ARCH-COMM-001` | High | Resolved | Absolute-route representative delivery remains canonical. | No action. |
| 10 | `ARCH-COMM-002` | High | Resolved | Descriptor coordinate shape and represented-subteam DTO flow remain concrete. | No action. |
| 13 | `ARCH-CMD-001` | High | Resolved | `design-spec.md:34` now rejects bare `memberName`, command-side `agent_name`/`agent_id`, top-level-name selectors, and scalar transport strings; `design-spec.md:947-960` states path/route-only selector variants and deletion/replacement of name selector helpers; `design-spec.md:1118` says bare names and agent id/name aliases are never command selectors; migration step `design-spec.md:1656` now says edge adapters parse explicit path/route fields and reject scalar string/name/id payloads. | Exact stale-allowance grep over requirements/design/investigation/rework/docs returned no matches. |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? (`Pass`/`Fail`) | Narrative Is Clear? (`Pass`/`Fail`) | Facade Vs Governing Owner Is Clear? (`Pass`/`Fail`/`N/A`) | Main Domain Subject Naming Is Clear? (`Pass`/`Fail`) | Ownership Is Clear? (`Pass`/`Fail`) | Off-Spine Concerns Stay Off Main Line? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001..DS-003 | Topology planning, launch config, create-run | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-004 | External command target normalization | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-005..DS-023 | User sends, subteam delivery, communication, metadata, frontend, lifecycle, roster manifest | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-024 | Command API selector spine | Pass | Pass | Pass | Pass | Pass | Pass | Pass |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? (`Pass`/`Fail`) | Reuse / Extend / Create-New Decision Is Sound? (`Pass`/`Fail`) | Supports The Right Spine Owners? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Transport/GraphQL command edge adapters | Pass | Pass | Pass | Pass | They parse explicit path/route fields and reject scalar aliases before domain/backend calls. |
| Domain command selector (`TeamMemberSelector`) | Pass | Pass | Pass | Pass | Shape is path/route-only; top-level execution lookup is internal derivation from accepted selectors. |
| Tool approval command routing | Pass | Pass | Pass | Pass | Approval commands round-trip emitted source/member/target path-route identity and reject scalar aliases. |
| LLM `send_message_to` roster path | Pass | Pass | Pass | Pass | `recipient_name` remains separate from public command selector identity. |
| Nested topology/metadata/frontend/communication roster | Pass | Pass | Pass | Pass | No regression found outside command API cleanup. |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? (`Pass`/`Fail`) | Shared File Choice Is Sound? (`Pass`/`Fail`/`N/A`) | Ownership Of Shared Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `TeamMemberSelector` | Pass | Pass | Pass | Pass | Canonical path/route-only command identity. |
| `team-member-selector-payload-adapter` | Pass | Pass | Pass | Pass | Correct owner for transport parsing and scalar-alias rejection. |
| `MemberCommunicationRosterBuilder` / `communicationRecipients` | Pass | Pass | Pass | Pass | Correct owner for tool `recipient_name` lookup. |
| `TeamMembershipRosterManifest` | Pass | Pass | Pass | Pass | Presentation-only shape remains sound. |
| Recursive `TeamRunMetadata.memberTree` | Pass | Pass | Pass | Pass | No command API impact. |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Pass`/`Fail`) | Redundant Attributes Removed? (`Pass`/`Fail`) | Overlapping Representation Risk Is Controlled? (`Pass`/`Fail`) | Shared Core Vs Specialized Variant / Composition Decision Is Sound? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `TeamMemberSelector` | Pass | Pass | Pass | Pass | Pass | Only path and route-key variants remain in target design. |
| Public command payloads | Pass | Pass | Pass | Pass | Pass | Path/route input fields are the only accepted target fields. |
| Tool roster `recipient_name` | Pass | Pass | Pass | Pass | Pass | Distinct meaning from command target identity. |
| Outbound display aliases (`agent_name`, `agent_id`) | Pass | Pass | Pass | Pass | Pass | Allowed only as non-authoritative display metadata, not command input. |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? (`Pass`/`Fail`) | Replacement Owner / Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Removal / Decommission Scope Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Scalar command target aliases | Pass | Pass | Pass | Pass | Requirements, design, docs, and ACs require invalid-target rejection. |
| `TeamMemberSelector.kind = top_level_name` | Pass | Pass | Pass | Pass | Explicitly not a selector variant; implementation must derive top-level handle internally from path/route if needed. |
| `selectorFromMemberName` / `selectorFromOptionalTargetName` for command paths | Pass | Pass | Pass | Pass | Explicitly required to be deleted or replaced for public/domain command paths. |
| Command-side `agent_name` / `agent_id` approval fallback | Pass | Pass | Pass | Pass | Approval commands must use emitted path/route identity only. |
| LLM tool `recipient_name` | Pass | Pass | Pass | Pass | Correctly retained because it is not a public command selector. |
| Metadata compatibility paths | Pass | Pass | Pass | Pass | No regression. |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? (`Pass`/`Fail`) | Responsibility Matches The Intended Owner/Boundary? (`Pass`/`Fail`) | Responsibilities Were Re-Tightened After Shared-Structure Extraction? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `team-run-member-identity.ts` | Pass | Pass | Pass | Pass | Target responsibility is canonical path/route selector identity plus helper derivation from accepted selectors. |
| `team-member-selector-payload-adapter.ts` | Pass | Pass | Pass | Pass | Correct target owner for transport parsing/rejection. |
| WebSocket/GraphQL command handlers | Pass | Pass | Pass | Pass | Edge adapters reject scalar aliases and call domain/backend only with selectors. |
| Frontend `TeamStreamingService` / protocol types | Pass | Pass | Pass | Pass | Correctly identified as structured selector senders. |
| Tool adapters / communication roster files | Pass | Pass | Pass | Pass | They resolve `recipient_name` through descriptors before delivery. |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? (`Pass`/`Fail`) | Forbidden Shortcuts Are Explicit? (`Pass`/`Fail`) | Direction Is Coherent With Ownership? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Transport/GraphQL edge -> selector adapter -> domain command | Pass | Pass | Pass | Pass | No scalar alias normalization path remains in target design. |
| Domain/backend command chain | Pass | Pass | Pass | Pass | `TeamRun`, `TeamRunBackend`, and `TeamManager` accept selectors, not raw strings. |
| Mixed dispatch -> executable handle lookup | Pass | Pass | Pass | Pass | Top-level handle segment is internal derivation from accepted path/route selector. |
| Tool adapter -> `communicationRecipients` | Pass | Pass | Pass | Pass | Correctly separate from public command selectors. |
| Outbound event/display mapper -> UI display | Pass | Pass | Pass | Pass | Non-authoritative aliases remain output-only. |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? (`Pass`/`Fail`) | Internal Owned Mechanisms Stay Internal? (`Pass`/`Fail`) | Caller Bypass Risk Is Controlled? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Public command transport boundary | Pass | Pass | Pass | Pass | Explicit path/route payload fields only. |
| `TeamRun` / backend command boundary | Pass | Pass | Pass | Pass | Selector-bearing signatures prevent raw string targeting. |
| `MixedTeamManager` nested routing boundary | Pass | Pass | Pass | Pass | Path/route selectors remain the routing authority. |
| LLM `send_message_to` roster boundary | Pass | Pass | Pass | Pass | Roster lookup stays descriptor-owned. |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? (`Pass`/`Fail`) | Responsibility Is Singular? (`Pass`/`Fail`) | Identity Shape Is Explicit? (`Pass`/`Fail`) | Generic Boundary Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- |
| `TeamMemberSelector` | Pass | Pass | Pass | Low | Pass |
| WebSocket/GraphQL `SEND_MESSAGE` target payload | Pass | Pass | Pass | Low | Pass |
| Tool approval/denial command target payload | Pass | Pass | Pass | Low | Pass |
| `TeamRun.postMessage` / `TeamRunBackend.postMessage` / `TeamManager.postMessage` | Pass | Pass | Pass | Low | Pass |
| `send_message_to.recipient_name` | Pass | Pass | Pass | Low | Pass |
| Outbound event/display DTO aliases | Pass | Pass | Pass | Low | Pass |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? (`Pass`/`Fail`) | Folder Matches Owning Boundary? (`Pass`/`Fail`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `agent-team-execution/domain/team-run-member-identity.ts` | Pass | Pass | Low | Pass | Correct place for path/route selector identity. |
| `services/agent-streaming/*` command handlers | Pass | Pass | Low | Pass | Correct place for WebSocket command edge rejection. |
| Frontend protocol/service files | Pass | Pass | Low | Pass | Correct place to send structured selector fields. |
| Docs under `docs/modules` and `docs/design` | Pass | Pass | Low | Pass | Reviewed docs align with scalar-alias rejection. |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? (`Pass`/`Fail`) | Reuse / Extension Decision Is Sound? (`Pass`/`Fail`) | New Support Piece Is Justified? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Command target identity | Pass | Pass | N/A | Pass | `TeamMemberSelector` remains the right reusable structure after tightening. |
| Transport payload parsing | Pass | Pass | N/A | Pass | Edge adapter/parser remains the right capability to reject scalar aliases. |
| Tool roster delivery | Pass | Pass | N/A | Pass | Existing communication roster capability remains separate and correct. |
| Protocol docs | Pass | Pass | N/A | Pass | Updated protocol docs are consistent with the no-legacy contract. |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? (`Yes`/`No`) | Clean-Cut Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- |
| Scalar command target aliases | No in target design | Pass | Pass | Rejected unconditionally. |
| `top_level_name` selector variant | No in target design | Pass | Pass | Explicitly not a selector variant. |
| `selectorFromMemberName` / `selectorFromOptionalTargetName` as command adapters | No in target design | Pass | Pass | Must be deleted/replaced for public/domain command paths. |
| Outbound display aliases | No command compatibility intended | Pass | Pass | May remain emitted as non-authoritative display metadata. |
| `send_message_to.recipient_name` | No public command compatibility | Pass | Pass | Explicitly retained as a separate LLM roster argument. |
| Flat metadata compatibility | No | Pass | Pass | No regression. |

## Migration / Refactor Safety Verdict

| Area | Sequence Is Realistic? (`Pass`/`Fail`) | Temporary Seams Are Explicit? (`Pass`/`Fail`) | Cleanup / Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- |
| Public command signature cleanup | Pass | Pass | Pass | Pass |
| Transport/GraphQL/frontend/E2E payload update | Pass | Pass | Pass | Pass |
| Domain selector cleanup (`top_level_name` removal) | Pass | Pass | Pass | Pass |
| Tool roster `recipient_name` preservation | Pass | Pass | Pass | Pass |
| Docs/protocol sync | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? (`Yes`/`No`) | Example Is Present And Clear? (`Pass`/`Fail`/`N/A`) | Bad / Avoided Shape Is Explained When Helpful? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Valid command target payload examples | Yes | Pass | Pass | Pass | CR-007a, AC-033, and protocol docs name path/route fields. |
| Invalid scalar alias examples | Yes | Pass | Pass | Pass | Requirements/design/docs list rejected aliases. |
| Distinction from `send_message_to.recipient_name` | Yes | Pass | Pass | Pass | Design makes this distinction explicit. |
| Unambiguous top-level/bare-name rejection | Yes | Pass | Pass | Pass | Correction explicitly rejects scalar string/name/id payloads unconditionally, including top-level or otherwise unambiguous names. |

## Missing Use Cases / Open Unknowns

| Item | Why It Matters | Required Action | Status |
| --- | --- | --- | --- |
| None blocking. | N/A | N/A | Closed. |

## Review Decision

- `Pass`: the design is ready for implementation.

## Findings

None.

## Classification

No blocking classification. Round 13 `Design Impact` finding `ARCH-CMD-001` is resolved.

## Recommended Recipient

`implementation_engineer`

## Residual Risks

- Current implementation code still contains the old `top_level_name` selector variant and `selectorFromMemberName` / `selectorFromOptionalTargetName` helpers. This is expected pre-implementation state, but implementation must remove or replace them for public/domain command paths exactly as the design now says.
- Code review should verify WebSocket/GraphQL/frontend/E2E helpers reject `target_member_name`, `target_agent_name`, command-side `agent_name`, command-side `agent_id`, `member_name` as command target, and camelCase equivalents.
- Keep outbound `agent_name`/`agent_id` display metadata from leaking back into command parsing.
- Preserve the approved separation that `send_message_to.recipient_name` is an LLM tool roster value resolved through `communicationRecipients`, not a public command selector.
- Full-stack browser validation remains important because earlier loops exposed frontend topology, communication, and live transcript failures that backend-only checks missed.

## Latest Authoritative Result

- Review Decision: Pass
- Notes: Round 14 is the latest authoritative architecture review. The stale bare-name/top-level-name command selector allowance has been removed from the design package, and the clean-cut path/route-only command API is approved for implementation.
