# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-browser-open-tab-ui/tickets/done/claude-browser-open-tab-ui/requirements.md`
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-browser-open-tab-ui/tickets/done/claude-browser-open-tab-ui/investigation-notes.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-browser-open-tab-ui/tickets/done/claude-browser-open-tab-ui/design-spec.md`
- Current Review Round: 3
- Trigger: Expanded design after user confirmed Claude browser `open_tab` works and requested adding Claude SDK `send_message_to` parsed-only lifecycle bug.
- Prior Review Round Reviewed: 2
- Latest Authoritative Round: 3
- Current-State Evidence Basis: Re-read updated requirements, investigation notes, and design spec; inspected current `ClaudeSendMessageToolCallHandler`, `claude-send-message-tool-name.ts`, `ClaudeSessionEventConverter`, `ClaudeSessionToolUseCoordinator`, existing browser converter changes, and Codex parity test/code references for `send_message_to` lifecycle fan-out.

## Round History

| Round | Trigger | Prior Unresolved Findings Rechecked | New Findings Found | Review Decision | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Initial design review | N/A | No | Pass | No | Superseded by user clarification; frontend display-time MCP normalization became obsolete. |
| 2 | Revised design after user clarification | No unresolved findings; obsolete round-1 guidance rechecked | No | Pass | No | Backend Claude browser canonicalization became authoritative. |
| 3 | Expanded design for Claude SDK `send_message_to` parsed-only lifecycle bug | Round-2 backend-only/display-passive boundary rechecked and preserved | No | Pass | Yes | Adds backend Claude team-tool lifecycle contract fix while keeping browser fix intact. |

## Reviewed Design Spec

The expanded design keeps the already-working Claude browser MCP canonicalization and adds a second first-party MCP lifecycle contract fix for Claude SDK team communication. The design makes `ClaudeSendMessageToolCallHandler` the owner of handler-owned canonical `send_message_to` lifecycle emission, splits raw-MCP vs canonical send-message predicates, lets canonical handler-owned lifecycle events pass through `ClaudeSessionEventConverter`, and keeps raw SDK MCP `mcp__autobyteus_team__send_message_to` transport noise suppressed to avoid duplicate Activity entries. Frontend display/activity components remain passive consumers.

## Task Design Health Assessment Verdict

| Assessment Area | Result (`Pass`/`Fail`) | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | Spec identifies this as a bug fix with narrow backend event-contract refactor. | None |
| Root-cause classification is explicit and evidence-backed | Pass | Root cause is `Missing Invariant`: canonical team-tool lifecycle events are suppressed and start lifecycle is missing. Evidence references handler, converter predicate, coordinator suppression, and Codex parity. | None |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | Narrow refactor: split send-message predicates, add handler lifecycle start, change converter suppression, add backend tests. | None |
| Refactor decision is supported by the concrete design sections or residual-risk rationale | Pass | Ownership, file mapping, interface mapping, removal plan, and migration sequence all reflect the required backend change; historical parsed rows are explicitly deferred. | None |

## Prior Findings Resolution Check (Mandatory On Round >1)

| Prior Round | Finding ID | Previous Severity | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| 1 | N/A | N/A | Superseded | Round 1 had no findings but frontend display/result-normalization guidance is obsolete. | Continue to ignore round-1 frontend display guidance. |
| 2 | N/A | N/A | Preserved and expanded | Round 2 had no findings; its backend-only canonicalization and passive display boundary are retained. | Browser fix remains in scope and should not regress. |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? (`Pass`/`Fail`) | Narrative Is Clear? (`Pass`/`Fail`) | Facade Vs Governing Owner Is Clear? (`Pass`/`Fail`/`N/A`) | Main Domain Subject Naming Is Clear? (`Pass`/`Fail`) | Ownership Is Clear? (`Pass`/`Fail`) | Off-Spine Concerns Stay Off Main Line? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Claude browser MCP `open_tab` to visible Browser panel | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-002 | Claude `send_message_to` handler start to Activity executing | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-003 | Claude `send_message_to` delivery completion to Activity success/error | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-004 | Raw SDK MCP send-message chunks to no duplicate UI activity | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-005 | Backend lifecycle/tool state to passive UI rendering | Pass | Pass | Pass | Pass | Pass | Pass | Pass |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? (`Pass`/`Fail`) | Reuse / Extend / Create-New Decision Is Sound? (`Pass`/`Fail`) | Supports The Right Spine Owners? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Backend Claude team communication | Pass | Pass | Pass | Pass | `ClaudeSendMessageToolCallHandler` is the right owner for logical delivery start/completion events. |
| Backend Claude event conversion | Pass | Pass | Pass | Pass | Converter owns raw-vs-canonical mapping and must stop broad canonical suppression. |
| Backend Claude raw tool coordination | Pass | Pass | Pass | Pass | Coordinator remains the primary raw SDK chunk suppression boundary. |
| Frontend Activity/UI | Pass | Pass | Pass | Pass | Correctly reused unchanged as canonical lifecycle consumer. |
| Backend Claude browser conversion | Pass | Pass | Pass | Pass | Existing browser fix remains intact and should be regression-tested. |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? (`Pass`/`Fail`) | Shared File Choice Is Sound? (`Pass`/`Fail`/`N/A`) | Ownership Of Shared Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Send-message raw/canonical tool-name predicates | Pass | Pass | Pass | Pass | Splitting the broad predicate is required; one predicate cannot serve both suppression and pass-through contexts. |
| Handler-owned send-message lifecycle emitters | Pass | Pass | Pass | Pass | Existing handler is the correct file; no converter-fabricated start. |
| Browser result parser | Pass | Pass | Pass | Pass | Keep current backend browser helper; do not move to frontend. |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Pass`/`Fail`) | Redundant Attributes Removed? (`Pass`/`Fail`) | Overlapping Representation Risk Is Controlled? (`Pass`/`Fail`) | Shared Core Vs Specialized Variant / Composition Decision Is Sound? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `send_message_to` lifecycle payload | Pass | Pass | Pass | N/A | Pass | Must include invocation id, canonical `tool_name`, arguments, and result/error so Activity and memory can correlate states. |
| Send-message name utility | Pass | Pass | Pass | N/A | Pass | Explicit raw-MCP and canonical predicates avoid ambiguous broad matching. |
| UI `toolName`/status fields | Pass | Pass | Pass | N/A | Pass | UI continues to reflect backend-provided lifecycle data. |
| Browser canonical result object | Pass | Pass | Pass | N/A | Pass | Existing `open_tab` fix remains backend-normalized. |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? (`Pass`/`Fail`) | Replacement Owner / Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Removal / Decommission Scope Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Broad converter suppression of all send-message names | Pass | Pass | Pass | Pass | Replace with raw-MCP-only suppression in converter lifecycle/segment paths. |
| Missing handler-owned `ITEM_COMMAND_EXECUTION_STARTED` | Pass | Pass | Pass | Pass | Add in `ClaudeSendMessageToolCallHandler`. |
| Frontend Activity/ToolCall display/status workaround | Pass | Pass | Pass | Pass | Rejected; revert/avoid any such work. |
| Raw SDK duplicate entries | Pass | Pass | Pass | Pass | Coordinator suppression plus converter guard if raw events reach converter. |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? (`Pass`/`Fail`) | Responsibility Matches The Intended Owner/Boundary? (`Pass`/`Fail`) | Responsibilities Were Re-Tightened After Shared-Structure Extraction? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-execution/backends/claude/claude-send-message-tool-name.ts` | Pass | Pass | Pass | Pass | Split predicates and constants belong here. |
| `autobyteus-server-ts/src/agent-execution/backends/claude/team-communication/claude-send-message-tool-call-handler.ts` | Pass | Pass | Pass | Pass | Handler owns logical invocation, normalized args, delivery, and canonical lifecycle events. |
| `autobyteus-server-ts/src/agent-execution/backends/claude/events/claude-session-event-converter.ts` | Pass | Pass | Pass | Pass | Converter owns pass/suppress mapping, not delivery semantics. |
| `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session-tool-use-coordinator.ts` | Pass | Pass | N/A | Pass | Keeps raw SDK duplicate suppression; should not see handler-owned canonical events. |
| Backend converter/handler/coordinator tests | Pass | Pass | N/A | Pass | Test split is clear and necessary. |
| `ToolCallIndicator.vue` / `ActivityItem.vue` | Pass | Pass | N/A | Pass | No changes for MCP name/status repair. |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? (`Pass`/`Fail`) | Forbidden Shortcuts Are Explicit? (`Pass`/`Fail`) | Direction Is Coherent With Ownership? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `ClaudeSendMessageToolCallHandler` | Pass | Pass | Pass | Pass | May emit Claude session events; must not dispatch frontend messages directly. |
| `ClaudeSessionEventConverter` | Pass | Pass | Pass | Pass | May depend on name utilities; must not call delivery or frontend code. |
| `ClaudeSessionToolUseCoordinator` | Pass | Pass | Pass | Pass | Suppresses raw chunks; should not own logical delivery completion. |
| Frontend Activity/display | Pass | Pass | Pass | Pass | Consumes lifecycle events only; no MCP repair shortcuts. |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? (`Pass`/`Fail`) | Internal Owned Mechanisms Stay Internal? (`Pass`/`Fail`) | Caller Bypass Risk Is Controlled? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `ClaudeSendMessageToolCallHandler` | Pass | Pass | Pass | Pass | Correct owner for canonical start/completion because it has logical invocation id and normalized args/result. |
| `ClaudeSessionEventConverter` | Pass | Pass | Pass | Pass | Correct owner for raw-vs-canonical event conversion and duplicate suppression guard. |
| `ClaudeSessionToolUseCoordinator` | Pass | Pass | Pass | Pass | Correct raw SDK observation boundary; not the logical team-delivery owner. |
| Frontend Activity lifecycle handler | Pass | Pass | Pass | Pass | Receives canonical events rather than deriving state from display components. |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? (`Pass`/`Fail`) | Responsibility Is Singular? (`Pass`/`Fail`) | Identity Shape Is Explicit? (`Pass`/`Fail`) | Generic Boundary Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- |
| `emitSendMessageToolStart(...)` | Pass | Pass | Pass | Low | Pass |
| `emitSendMessageToolCompleted(...)` | Pass | Pass | Pass | Low | Pass |
| `isClaudeSendMessageMcpToolName(...)` | Pass | Pass | Pass | Low | Pass |
| `isClaudeCanonicalSendMessageToolName(...)` | Pass | Pass | Pass | Low | Pass |
| Current broad `isClaudeSendMessageToolName(...)` | Pass | Fail currently, fixed by design | Pass | High currently | Pass with required implementation split |
| `ClaudeSessionEventConverter.convert(...)` | Pass | Pass | Pass | Medium | Pass |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? (`Pass`/`Fail`) | Folder Matches Owning Boundary? (`Pass`/`Fail`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `backends/claude/team-communication` | Pass | Pass | Low | Pass | Logical team MCP handling belongs here. |
| `backends/claude/events` | Pass | Pass | Low | Pass | Event canonicalization belongs here. |
| `backends/claude/session` | Pass | Pass | Low | Pass | Raw SDK coordination/suppression belongs here. |
| `autobyteus-web/components/...` | Pass | Pass | Low | Pass | Presentation remains unchanged. |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? (`Pass`/`Fail`) | Reuse / Extension Decision Is Sound? (`Pass`/`Fail`) | New Support Piece Is Justified? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Team message lifecycle | Pass | Pass | N/A | Pass | Extend existing handler. |
| Claude event conversion | Pass | Pass | N/A | Pass | Extend existing converter. |
| Raw SDK suppression | Pass | Pass | N/A | Pass | Reuse coordinator with tests. |
| Frontend Activity/UI | Pass | Pass | N/A | Pass | Reuse unchanged. |
| Browser fix | Pass | Pass | N/A | Pass | Preserve current backend browser canonicalization. |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? (`Yes`/`No`) | Clean-Cut Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- |
| Broad send-message lifecycle suppression | Yes currently | Pass | Pass | Remove for canonical events; keep raw-MCP suppression. |
| UI status workaround | No planned | Pass | Pass | Correctly rejected. |
| Raw SDK lifecycle driving UI | No planned | Pass | Pass | Correctly rejected in favor of handler-owned canonical events. |
| Historical parsed-only rows | Yes historically | Pass | Pass | Explicitly deferred; replay/migration out of scope. |

## Migration / Refactor Safety Verdict

| Area | Sequence Is Realistic? (`Pass`/`Fail`) | Temporary Seams Are Explicit? (`Pass`/`Fail`) | Cleanup / Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- |
| Split send-message predicates | Pass | Pass | Pass | Pass |
| Add handler lifecycle start | Pass | Pass | Pass | Pass |
| Update converter pass/suppress conditions | Pass | Pass | Pass | Pass |
| Update converter/handler/coordinator tests | Pass | Pass | Pass | Pass |
| Preserve browser fix and frontend passive boundary | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? (`Yes`/`No`) | Example Is Present And Clear? (`Pass`/`Fail`/`N/A`) | Bad / Avoided Shape Is Explained When Helpful? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Canonical send-message start | Yes | Pass | Pass | Pass | Clearly shows `ITEM_ADDED` + `ITEM_COMMAND_EXECUTION_STARTED`. |
| Canonical send-message success/failure | Yes | Pass | Pass | Pass | Clearly rejects converter returning `[]` for canonical names. |
| Raw MCP duplicate suppression | Yes | Pass | Pass | Pass | Clearly distinguishes raw transport noise from handler-owned events. |

## Missing Use Cases / Open Unknowns

| Item | Why It Matters | Required Action | Status |
| --- | --- | --- | --- |
| Raw SDK may someday emit canonical `send_message_to` instead of MCP-prefixed raw name | Name-shape-only suppression could permit duplicates in that future/variant case. | Accepted residual risk; if observed, add source-aware coordinator tracking rather than frontend fixes. | Non-blocking |
| Historical parsed-only rows | Existing rows may remain parsed. | Out of scope unless replay/migration requested. | Non-blocking |
| Current worktree contains prior implementation changes | Some files may reflect round-1/round-2 work and must be reconciled with round-3 design. | Implementation should revert/replace obsolete frontend changes and update backend send-message logic. | Implementation action |

## Review Decision

- `Pass`: the expanded design is ready for implementation.

## Findings

None.

## Classification

N/A — no blocking findings.

## Recommended Recipient

`implementation_engineer`

## Residual Risks

- Converter should suppress raw MCP `mcp__autobyteus_team__send_message_to` segment/lifecycle events if they reach it, even though coordinator-level raw chunk suppression remains the primary duplicate-prevention boundary. This is a safe defensive conversion guard, not a replacement for coordinator suppression.
- Completion payloads should include normalized `arguments` on both success and failure so Activity/memory correlation matches Codex parity and requirements.
- The existing broad predicate can remain only in contexts that intentionally want broad matching; converter lifecycle decisions must use the raw-MCP predicate for suppression and must pass canonical `send_message_to`.
- Preserve the browser fix while adding send-message lifecycle changes; do not regress `open_tab` canonical result normalization.

## Latest Authoritative Result

- Review Decision: Pass
- Notes: The raw-vs-canonical send-message split is the correct ownership boundary. `ClaudeSendMessageToolCallHandler`, not the converter or frontend, should emit the missing canonical `ITEM_COMMAND_EXECUTION_STARTED` because it owns the logical invocation and normalized arguments. Converter-level raw MCP send-message suppression is appropriate as a defensive guard if raw events reach conversion, while coordinator-level raw chunk suppression remains the primary duplicate filter.
