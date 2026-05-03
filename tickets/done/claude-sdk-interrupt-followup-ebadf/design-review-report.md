# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-sdk-interrupt-followup-ebadf/tickets/claude-sdk-interrupt-followup-ebadf/requirements.md`
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-sdk-interrupt-followup-ebadf/tickets/claude-sdk-interrupt-followup-ebadf/investigation-notes.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-sdk-interrupt-followup-ebadf/tickets/claude-sdk-interrupt-followup-ebadf/design-spec.md`
- Current Review Round: 1
- Trigger: Initial architecture review request from `solution_designer` for Claude SDK interrupt/follow-up `spawn EBADF` bug.
- Prior Review Round Reviewed: N/A
- Latest Authoritative Round: 1
- Current-State Evidence Basis: Reviewed upstream artifacts, `architecture-reviewer/design-principles.md`, current Claude session/interruption code, SDK client query option mapping, team interrupt routing, frontend team/single-agent stop handlers, stream lifecycle handlers, and installed Claude Agent SDK type declarations documenting `Options.abortController`, `Query.interrupt()`, and `Query.close()`.

## Round History

| Round | Trigger | Prior Unresolved Findings Rechecked | New Findings Found | Review Decision | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Initial design review | N/A | None | Pass | Yes | Design is actionable; residual risks are implementation guardrails, not design blockers. |

## Reviewed Design Spec

The reviewed design proposes a clean-cut lifecycle fix rather than an error suppression workaround:

- `ClaudeSession` becomes the authoritative owner of active-turn interruption settlement.
- Per-turn `AbortController` is forwarded into Claude SDK query options.
- User interrupt becomes an interrupted terminal path, not a success or runtime error.
- Frontend stores stop treating STOP command submission as send-readiness completion.
- Deterministic unit coverage protects cancellation and settlement; live-gated Claude team E2E protects the reported business flow.

This shape matches the current code boundaries and directly addresses the race where backend/frontend readiness can be advertised before SDK query/process cleanup has settled.

## Task Design Health Assessment Verdict

| Assessment Area | Result (`Pass`/`Fail`) | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | Design spec includes mandatory assessment: bug fix plus validation coverage. | None. |
| Root-cause classification is explicit and evidence-backed | Pass | Classified as `Missing Invariant`; supported by current `ClaudeSession.interrupt()` emitting before detached turn cleanup and by missing SDK `abortController` forwarding. | None. |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | Refactor needed now is explicitly bounded to `ClaudeSession` lifecycle state and SDK cancellation boundary. | None. |
| Refactor decision is supported by the concrete design sections or residual-risk rationale | Pass | Active-turn execution record, migration sequence, removal plan, file mapping, and tests all align with the refactor decision. | None. |

## Prior Findings Resolution Check (Mandatory On Round >1)

| Prior Round | Finding ID | Previous Severity | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| N/A | N/A | N/A | N/A | N/A | Initial review round. |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? (`Pass`/`Fail`) | Narrative Is Clear? (`Pass`/`Fail`) | Facade Vs Governing Owner Is Clear? (`Pass`/`Fail`/`N/A`) | Main Domain Subject Naming Is Clear? (`Pass`/`Fail`) | Ownership Is Clear? (`Pass`/`Fail`) | Off-Spine Concerns Stay Off Main Line? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Stop/interrupt end-to-end | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-002 | Settled interrupt return/event path to frontend readiness | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-003 | Follow-up send after settled interrupt | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-004 | `ClaudeSession` active-turn state machine | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-005 | SDK adapter option forwarding | Pass | Pass | N/A | Pass | Pass | Pass | Pass |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? (`Pass`/`Fail`) | Reuse / Extend / Create-New Decision Is Sound? (`Pass`/`Fail`) | Supports The Right Spine Owners? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Web frontend agent/team stores | Pass | Pass | Pass | Pass | Removing optimistic stop readiness keeps lifecycle authority with backend events. |
| Server team streaming | Pass | Pass | Pass | Pass | Existing WS command surface is reused; no protocol churn. |
| Claude team execution | Pass | Pass | Pass | Pass | Manager remains member-run routing/reuse owner, not SDK lifecycle owner. |
| Claude agent session | Pass | Pass | Pass | Pass | Correct locus for the missing interrupt-settlement invariant. |
| Claude runtime SDK client | Pass | Pass | Pass | Pass | Correct adapter boundary for `abortController` option mapping. |
| Runtime tests | Pass | Pass | Pass | Pass | Live-gated E2E plus unit tests are correctly split by determinism/provider dependency. |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? (`Pass`/`Fail`) | Shared File Choice Is Sound? (`Pass`/`Fail`/`N/A`) | Ownership Of Shared Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Active-turn execution record | Pass | N/A | Pass | Pass | Keeping it private in `claude-session.ts` avoids a premature generic lifecycle abstraction. |
| E2E wait/send helper additions | Pass | Pass | Pass | Pass | Existing local E2E harness should be extended; no production helper needed. |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Pass`/`Fail`) | Redundant Attributes Removed? (`Pass`/`Fail`) | Overlapping Representation Risk Is Controlled? (`Pass`/`Fail`) | Shared Core Vs Specialized Variant / Composition Decision Is Sound? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Private active-turn execution record | Pass | Pass | Pass | N/A | Pass | Design explicitly avoids separate authoritative `signal` and controller fields. |
| Claude SDK start-turn options | Pass | Pass | Pass | N/A | Pass | `abortController` is the cancellation authority; no custom cancellation flag. |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? (`Pass`/`Fail`) | Replacement Owner / Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Removal / Decommission Scope Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Team frontend optimistic `isSending=false` on stop | Pass | Pass | Pass | Pass | Include in this change. |
| Single-agent frontend optimistic `isSending=false` on stop | Pass | Pass | Pass | Pass | Include for consistency because it is the same readiness-policy defect. |
| `ClaudeSession` reliance on `sdkClient.interruptQuery()` for string-prompt turns | Pass | Pass | Pass | Pass | `interruptQuery()` may remain in adapter for future streaming-input owner, but current session path must stop using it. |
| Successful completion emission/marking for interrupted turns | Pass | Pass | Pass | Pass | Interrupted path must not set `hasCompletedTurn` or append successful assistant completion. |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? (`Pass`/`Fail`) | Responsibility Matches The Intended Owner/Boundary? (`Pass`/`Fail`) | Responsibilities Were Re-Tightened After Shared-Structure Extraction? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session.ts` | Pass | Pass | Pass | Pass | Active-turn lifecycle and event timing belong here. |
| `autobyteus-server-ts/src/runtime-management/claude/client/claude-sdk-client.ts` | Pass | Pass | N/A | Pass | SDK option mapping belongs here; session should not import SDK directly. |
| `autobyteus-web/stores/agentTeamRunStore.ts` | Pass | Pass | N/A | Pass | Stop action sends command only; readiness remains event-driven. |
| `autobyteus-web/stores/agentRunStore.ts` | Pass | Pass | N/A | Pass | Same policy correction as team store. |
| `autobyteus-server-ts/tests/unit/runtime-management/claude/client/claude-sdk-client.test.ts` | Pass | Pass | N/A | Pass | Correct placement for adapter option test. |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/claude/session/claude-session.test.ts` | Pass | Pass | N/A | Pass | Correct placement for deterministic lifecycle invariant tests. |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/claude/session/claude-session-tool-gating.test.ts` | Pass | Pass | N/A | Pass | Existing private expectations should be updated if `executeTurn` input changes. |
| `autobyteus-server-ts/tests/e2e/runtime/claude-team-inter-agent-roundtrip.e2e.test.ts` | Pass | Pass | N/A | Pass | Correct live-gated business-flow test placement. |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? (`Pass`/`Fail`) | Forbidden Shortcuts Are Explicit? (`Pass`/`Fail`) | Direction Is Coherent With Ownership? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Frontend input/store boundary | Pass | Pass | Pass | Pass | UI/store may send commands and consume events, not decide runtime settlement. |
| Team streaming/manager boundary | Pass | Pass | Pass | Pass | Team layers call domain/runtime methods, not Claude SDK internals. |
| `ClaudeSession` | Pass | Pass | Pass | Pass | Session owns lifecycle and calls adapter, not SDK directly. |
| `ClaudeSdkClient` | Pass | Pass | Pass | Pass | Adapter owns SDK calls and must not know team/frontend concepts. |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? (`Pass`/`Fail`) | Internal Owned Mechanisms Stay Internal? (`Pass`/`Fail`) | Caller Bypass Risk Is Controlled? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `ClaudeSession` | Pass | Pass | Pass | Pass | Strong application of the Authoritative Boundary Rule. |
| `ClaudeSdkClient` | Pass | Pass | Pass | Pass | Session requests cancellation via adapter options; SDK option construction stays internal. |
| Frontend stream handlers | Pass | Pass | Pass | Pass | Backend lifecycle events remain authoritative for `isSending`. |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? (`Pass`/`Fail`) | Responsibility Is Singular? (`Pass`/`Fail`) | Identity Shape Is Explicit? (`Pass`/`Fail`) | Generic Boundary Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- |
| WS `STOP_GENERATION` / `TeamStreamingService.stopGeneration()` | Pass | Pass | Pass | Low | Pass |
| `TeamRun.interrupt()` | Pass | Pass | Pass | Low | Pass |
| `ClaudeSession.interrupt()` | Pass | Pass | Pass | Low | Pass |
| `ClaudeSdkClient.startQueryTurn(options)` | Pass | Pass | Pass | Low | Pass |
| `ClaudeSdkClient.closeQuery(query)` | Pass | Pass | Pass | Low | Pass |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? (`Pass`/`Fail`) | Folder Matches Owning Boundary? (`Pass`/`Fail`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `.../backends/claude/session` | Pass | Pass | Low | Pass | Existing session folder is the correct lifecycle owner. |
| `.../runtime-management/claude/client` | Pass | Pass | Low | Pass | Existing SDK adapter placement is correct. |
| `autobyteus-web/stores` | Pass | Pass | Low | Pass | Existing command/state store placement is correct. |
| `tests/e2e/runtime` | Pass | Pass | Low | Pass | Existing live Claude runtime E2E placement is correct. |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? (`Pass`/`Fail`) | Reuse / Extension Decision Is Sound? (`Pass`/`Fail`) | New Support Piece Is Justified? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Team stop transport | Pass | Pass | N/A | Pass | Reuse existing STOP command. |
| Claude turn lifecycle | Pass | Pass | N/A | Pass | Extend existing session owner. |
| SDK option mapping | Pass | Pass | N/A | Pass | Extend existing SDK client. |
| Frontend readiness projection | Pass | Pass | N/A | Pass | Reuse existing status/turn/error handlers. |
| Live E2E harness | Pass | Pass | N/A | Pass | Extend existing live-gated test file. |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? (`Yes`/`No`) | Clean-Cut Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- |
| Optimistic stop readiness | No | Pass | Pass | Removal is explicit. |
| `Query.interrupt()` in current string-prompt session path | No for target path | Pass | Pass | Do not keep dual cancellation in `ClaudeSession`. |
| Early idle emission | No | Pass | Pass | Terminal event waits for settlement. |
| EBADF suppression/retry workaround | No | Pass | Pass | Correctly rejected. |

## Migration / Refactor Safety Verdict

| Area | Sequence Is Realistic? (`Pass`/`Fail`) | Temporary Seams Are Explicit? (`Pass`/`Fail`) | Cleanup / Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- |
| SDK client option extension | Pass | Pass | Pass | Pass |
| `ClaudeSession` active-turn record and interrupt flow | Pass | Pass | Pass | Pass |
| Frontend stop readiness removal | Pass | Pass | Pass | Pass |
| Unit and E2E tests | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? (`Yes`/`No`) | Example Is Present And Clear? (`Pass`/`Fail`/`N/A`) | Bad / Avoided Shape Is Explained When Helpful? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Settled interrupt sequence | Yes | Pass | Pass | Pass | Clear good/bad shape provided. |
| SDK cancellation mechanism | Yes | Pass | Pass | Pass | Aligns with installed SDK contract. |
| Frontend readiness | Yes | Pass | Pass | Pass | Clarifies why single-agent store should also be corrected. |
| E2E business flow | Yes | Pass | Pass | Pass | Matches user-reported common path. |

## Missing Use Cases / Open Unknowns

| Item | Why It Matters | Required Action | Status |
| --- | --- | --- | --- |
| Exact low-level FD causing `spawn EBADF` was not live reproduced | Determines internal Node/SDK errno origin, but not needed to fix the violated ownership/lifecycle invariant. | Keep unit invariant tests deterministic and live E2E assertion focused on absence of `spawn EBADF`/runtime error after follow-up. | Residual risk, non-blocking. |
| Bounded wait/timeout behavior if SDK iteration hangs after abort/close | A timeout that emits idle before cleanup would reintroduce the architecture bug; an infinite wait can leave stop unresolved if SDK violates its close contract. | Architecture confirmation: do **not** implement a timer that marks `TURN_INTERRUPTED`/idle before active-turn settlement. If implementation needs a defensive timeout, it must fail closed (for example error/terminate the unsafe session) rather than advertise same-session send readiness; route back to `solution_designer` if that behavior cannot fit existing lifecycle semantics. | Residual implementation guardrail, non-blocking for current design. |
| Live Claude E2E model/tool-approval reliability | Provider/model behavior can be flaky. | Use strict prompt plus `autoExecuteTools=false`; rely on deterministic unit tests for CI invariant coverage when live E2E is skipped. | Residual risk, non-blocking. |

## Review Decision

- `Pass`: the design is ready for implementation.

## Findings

None.

## Classification

N/A — no blocking findings.

## Recommended Recipient

`implementation_engineer`

## Residual Risks

- The exact SDK/Node file descriptor source of `spawn EBADF` remains inferred rather than locally reproduced; accepted because the design fixes the stale-resource lifecycle condition and adds E2E coverage for the reported symptom.
- Interrupt cleanup should preserve the invariant over responsiveness. Do not emit interrupted/idle until the active turn is settled. Any defensive timeout discovered necessary during implementation must fail closed and should be routed back if it changes user-visible semantics.
- Live Claude E2E remains gated and may be provider-auth/model-behavior dependent; deterministic unit tests are mandatory.

## Latest Authoritative Result

- Review Decision: Pass
- Notes: Approved for implementation. Include both team and single-agent frontend optimistic stop-readiness removal. Use `AbortController` + `closeQuery()`/settlement for the current string-prompt Claude session path, not `Query.interrupt()`. Preserve `ClaudeSession` as the authoritative lifecycle boundary.
