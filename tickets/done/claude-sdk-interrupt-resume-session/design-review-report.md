# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-sdk-interrupt-resume-session/tickets/done/claude-sdk-interrupt-resume-session/requirements.md`
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-sdk-interrupt-resume-session/tickets/done/claude-sdk-interrupt-resume-session/investigation-notes.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-sdk-interrupt-resume-session/tickets/done/claude-sdk-interrupt-resume-session/design-spec.md`
- Current Review Round: 1
- Trigger: Initial design review handoff from `solution_designer` for the Claude Agent SDK interrupt/resume context-loss bug.
- Prior Review Round Reviewed: N/A
- Latest Authoritative Round: 1
- Current-State Evidence Basis: Requirements/investigation/design artifacts plus targeted source read of `ClaudeSession`, `ClaudeSessionManager`, `ClaudeSdkClient`, standalone/team stream handlers, `AgentRunService` restore metadata path, `TeamRunService` metadata refresh path, and Claude team member restore wiring.

## Round History

| Round | Trigger | Prior Unresolved Findings Rechecked | New Findings Found | Review Decision | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Initial design review handoff | N/A | No | Pass | Yes | Design is implementation-ready with metadata persistence kept as residual risk, not pulled into this same-active-session fix. |

## Reviewed Design Spec

Reviewed `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-sdk-interrupt-resume-session/tickets/done/claude-sdk-interrupt-resume-session/design-spec.md`. The design targets the correct runtime owner: `ClaudeSession` should choose SDK resume identity from real provider-session availability, while preserving the placeholder guard so local `runId` is never sent as Claude SDK `resume`.

## Task Design Health Assessment Verdict

| Assessment Area | Result (`Pass`/`Fail`) | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | Design classifies the task as a bug fix and names the current invariant defect. | None. |
| Root-cause classification is explicit and evidence-backed | Pass | Root cause is `Missing Invariant`; evidence cites `executeTurn` gating resume on `hasCompletedTurn` despite `adoptResolvedSessionId` being able to capture a provider id before completion. | None. |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | Design states no refactor needed now. | None. |
| Refactor decision is supported by the concrete design sections or residual-risk rationale | Pass | Ownership, boundary, file mapping, and migration all keep policy inside `ClaudeSession`; standalone restore-after-interrupt metadata freshness is explicitly deferred as residual risk. | None. |

## Prior Findings Resolution Check (Mandatory On Round >1)

| Prior Round | Finding ID | Previous Severity | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| N/A | N/A | N/A | N/A | N/A | First review round. |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? (`Pass`/`Fail`) | Narrative Is Clear? (`Pass`/`Fail`) | Facade Vs Governing Owner Is Clear? (`Pass`/`Fail`/`N/A`) | Main Domain Subject Naming Is Clear? (`Pass`/`Fail`) | Ownership Is Clear? (`Pass`/`Fail`) | Off-Spine Concerns Stay Off Main Line? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary interrupt/follow-up path | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-002 | Return-event session-id adoption path | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-003 | Bounded local interrupt settlement path | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-004 | Primary restore/history path | Pass | Pass | Pass | Pass | Pass | Pass | Pass |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? (`Pass`/`Fail`) | Reuse / Extend / Create-New Decision Is Sound? (`Pass`/`Fail`) | Supports The Right Spine Owners? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Claude session backend | Pass | Pass | Pass | Pass | Correct owner for provider identity and turn lifecycle. |
| Claude SDK client adapter | Pass | Pass | Pass | Pass | Reuse unchanged; should not infer placeholder semantics. |
| Agent/team stream services | Pass | Pass | Pass | Pass | Transport remains unchanged; validation may exercise it. |
| Test suites | Pass | Pass | Pass | Pass | Unit plus deterministic fake-SDK API/E2E/integration coverage is appropriate. |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? (`Pass`/`Fail`) | Shared File Choice Is Sound? (`Pass`/`Fail`/`N/A`) | Ownership Of Shared Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Provider-session resume predicate | Pass | Pass | Pass | Pass | Keep private in `ClaudeSession`; no premature shared helper. |
| Fake SDK query harness | Pass | Pass | Pass | Pass | Keep test-local unless repetition emerges. |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Pass`/`Fail`) | Redundant Attributes Removed? (`Pass`/`Fail`) | Overlapping Representation Risk Is Controlled? (`Pass`/`Fail`) | Shared Core Vs Specialized Variant / Composition Decision Is Sound? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `ClaudeAgentRunContext.sessionId` | Pass | Pass | Pass | N/A | Pass | Field remains current placeholder-or-provider id; private predicate controls provider-only use. |
| `ClaudeAgentRunContext.hasCompletedTurn` | Pass | Pass | Pass | N/A | Pass | Field remains lifecycle/restore signal, no longer sole resume authority. |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? (`Pass`/`Fail`) | Replacement Owner / Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Removal / Decommission Scope Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `hasCompletedTurn`-only resume guard | Pass | Pass | Pass | Pass | Remove this decision path from SDK query start input. |
| Temporary repro scripts | Pass | Pass | Pass | Pass | Durable tests replace investigation probes. |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? (`Pass`/`Fail`) | Responsibility Matches The Intended Owner/Boundary? (`Pass`/`Fail`) | Responsibilities Were Re-Tightened After Shared-Structure Extraction? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session.ts` | Pass | Pass | N/A | Pass | Single production change belongs in the provider session lifecycle owner. |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/claude/session/claude-session.test.ts` | Pass | Pass | N/A | Pass | Correct home for class-level invariant regression tests. |
| `autobyteus-server-ts/tests/e2e/runtime/claude-agent-interrupt-resume.e2e.test.ts` or equivalent | Pass | Pass | N/A | Pass | User-path validation belongs in runtime/API/E2E coverage; exact file can follow existing suite conventions. |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? (`Pass`/`Fail`) | Forbidden Shortcuts Are Explicit? (`Pass`/`Fail`) | Direction Is Coherent With Ownership? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `ClaudeSession` | Pass | Pass | Pass | Pass | May call SDK client; owns provider id normalization before adapter call. |
| `ClaudeSdkClient` | Pass | Pass | Pass | Pass | Maps already-normalized `sessionId` to SDK `resume`; no Autobyteus lifecycle semantics. |
| Frontend/WebSocket handlers | Pass | Pass | Pass | Pass | Must not send or inspect provider session ids. |
| Team/single-agent managers | Pass | Pass | Pass | Pass | Depend on run/session boundaries, not SDK resume internals. |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? (`Pass`/`Fail`) | Internal Owned Mechanisms Stay Internal? (`Pass`/`Fail`) | Caller Bypass Risk Is Controlled? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `ClaudeSession.sendTurn` / `executeTurn` | Pass | Pass | Pass | Pass | Resume predicate remains internal. |
| `ClaudeSdkClient.startQueryTurn` | Pass | Pass | Pass | Pass | Adapter boundary is preserved. |
| Stream handlers | Pass | Pass | Pass | Pass | Transport-only command boundary is preserved. |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? (`Pass`/`Fail`) | Responsibility Is Singular? (`Pass`/`Fail`) | Identity Shape Is Explicit? (`Pass`/`Fail`) | Generic Boundary Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- |
| `ClaudeSession.sendTurn(message)` | Pass | Pass | Pass | Low | Pass |
| `ClaudeSdkClient.startQueryTurn({ sessionId })` | Pass | Pass | Pass | Medium | Pass |
| WebSocket `SEND_MESSAGE` | Pass | Pass | Pass | Low | Pass |
| WebSocket `STOP_GENERATION` | Pass | Pass | Pass | Low | Pass |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? (`Pass`/`Fail`) | Folder Matches Owning Boundary? (`Pass`/`Fail`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `backends/claude/session/claude-session.ts` | Pass | Pass | Low | Pass | Existing session lifecycle owner. |
| `runtime-management/claude/client/claude-sdk-client.ts` | Pass | Pass | Low | Pass | No production change required. |
| `tests/unit/agent-execution/backends/claude/session` | Pass | Pass | Low | Pass | Existing unit-test ownership. |
| `tests/e2e/runtime` or equivalent integration area | Pass | Pass | Low | Pass | Final path can adapt to existing test harness layout. |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? (`Pass`/`Fail`) | Reuse / Extension Decision Is Sound? (`Pass`/`Fail`) | New Support Piece Is Justified? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Provider resume decision | Pass | Pass | N/A | Pass | Extend `ClaudeSession`. |
| SDK option mapping | Pass | Pass | N/A | Pass | Reuse `ClaudeSdkClient`. |
| API/E2E fake SDK validation | Pass | Pass | Pass | Pass | Test-local fake is justified for deterministic coverage. |
| Frontend send/stop routing | Pass | Pass | N/A | Pass | Reuse unchanged based on investigation evidence. |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? (`Yes`/`No`) | Clean-Cut Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- |
| Interrupted incomplete turns starting fresh | No | Pass | Pass | Design rejects preserving current behavior. |
| Frontend flag/provider id payload | No | Pass | Pass | Design rejects leaking provider resume policy to UI. |
| Placeholder `runId` as SDK `resume` | No | Pass | Pass | Design explicitly forbids this shortcut. |

## Migration / Refactor Safety Verdict

| Area | Sequence Is Realistic? (`Pass`/`Fail`) | Temporary Seams Are Explicit? (`Pass`/`Fail`) | Cleanup / Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- |
| Production predicate change | Pass | Pass | Pass | Pass |
| Unit regression coverage | Pass | Pass | Pass | Pass |
| Fake-SDK API/E2E/integration coverage | Pass | Pass | Pass | Pass |
| Non-Claude no-regression checks | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? (`Yes`/`No`) | Example Is Present And Clear? (`Pass`/`Fail`/`N/A`) | Bad / Avoided Shape Is Explained When Helpful? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Resume predicate | Yes | Pass | Pass | Pass | Shows replacement for `hasCompletedTurn ? sessionId : null`. |
| Placeholder protection | Yes | Pass | Pass | Pass | Prevents accidental placeholder resume. |
| Boundary shape | Yes | Pass | Pass | Pass | Keeps provider identity out of frontend payloads. |

## Missing Use Cases / Open Unknowns

| Item | Why It Matters | Required Action | Status |
| --- | --- | --- | --- |
| Interrupt before SDK emits provider `session_id` | No provider id exists to resume; false resume would be harmful. | Keep helper returning `null` for placeholder/missing ids and cover with a test. | Controlled residual risk. |
| Standalone restore-after-interrupt metadata freshness | Standalone `recordRunActivity` occurs at send acceptance, before provider id adoption; restoring after process/session loss may still use placeholder metadata. | Do not pull into this same-active-session fix. If API/E2E or follow-up scope targets restore-after-interrupt, route a separate metadata refresh design through `AgentRunService`/event observation rather than `ClaudeSession`. | Deferred residual risk. |
| Fake SDK singleton/test contamination | E2E validation may use cached SDK module seams. | Reset fake SDK/client state after each test. | Implementation guidance accepted. |

## Review Decision

Pass: the design is ready for implementation.

The targeted `ClaudeSession` invariant fix plus unit and fake-SDK API/E2E/integration validation is architecturally sufficient for the reported same-active-session interrupt/follow-up bug. Provider-session metadata persistence on adoption should not be pulled into this change unless validation proves the same active WebSocket/run path cannot be covered without it.

## Findings

None.

## Classification

N/A — no blocking findings.

## Recommended Recipient

`implementation_engineer`

## Residual Risks

- If an interrupt happens before Claude emits a real `session_id`, provider-level resume is impossible; implementation must not pass the placeholder `runId`.
- Restore after an interrupted first turn may still have standalone metadata freshness gaps because current activity recording can predate provider id adoption. This is outside the approved same-active-session scope and should be a follow-up unless validation exposes it as necessary for AC-005.
- Fake-SDK E2E must reset injected SDK/client state to avoid cross-test contamination.

## Latest Authoritative Result

- Review Decision: Pass
- Notes: Proceed to implementation with the design as written. Metadata persistence-on-adoption remains an explicit residual risk/follow-up, not an implementation prerequisite for this bug fix.
