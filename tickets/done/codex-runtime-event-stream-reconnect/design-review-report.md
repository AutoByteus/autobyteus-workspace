# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-runtime-event-stream-reconnect-release-v1.4.67/tickets/done/codex-runtime-event-stream-reconnect/requirements.md`
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-runtime-event-stream-reconnect-release-v1.4.67/tickets/done/codex-runtime-event-stream-reconnect/investigation-notes.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-runtime-event-stream-reconnect-release-v1.4.67/tickets/done/codex-runtime-event-stream-reconnect/design-spec.md`
- Supplemental Task Artifacts Reviewed: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-runtime-event-stream-reconnect-release-v1.4.67/tickets/done/codex-runtime-event-stream-reconnect/runtime-evidence.md`
- Solution Revision Record Reviewed: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-runtime-event-stream-reconnect-release-v1.4.67/tickets/done/codex-runtime-event-stream-reconnect/solution-revision-record.md`
- Relevant Solution Revision IDs: `SR-001`, `SR-002`, `SR-003`
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-runtime-event-stream-reconnect-release-v1.4.67/tickets/done/codex-runtime-event-stream-reconnect/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-003`
- Current Review Round: `3`
- Trigger: `SR-003` revision after round-2 `Design Impact` finding `AR-F-002`.
- Prior Review Round Reviewed: Round 2 / `ARCH-REV-002` / `Fail`
- Latest Authoritative Round: `3`
- Current-State Evidence Basis: The complete current solution package; the prior report and revision record; installed Codex `0.152.1` generated v2 contracts; retained production evidence; and current worktree source/tests at base `5fb16658e7bd2aefd750f99eb596a17382e161ac`. Re-review first verified `SR-003` at the current `CodexThread` mutation/emission boundary, then retraced approved `UC-003` through conversion, lifecycle/replay, wire mapping, and the current turn-blind frontend projection. The accepted `SR-002` cleanup design was also revalidated. No implementation changes were present or reviewed.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status (`Confirmed`/`Contradicted`/`Blocked`): `Confirmed`
- Approved requirements / intended behavior understood: `Yes` — requirements remain `Design-ready` and user-approved on 2026-09-02.
- Relevant existing behavior and evidence confirmed: `Yes` — current handler terminalizes all turn-associated native errors; exact-turn admission then rejects continuing events; current converter performs all-scope error cleanup; and current frontend terminal handlers apply an emitted stale boundary to the latest response.
- Scope guardrail confirmed (`In-Scope Use Cases` / `Out of Scope` / `Preserved Behavior Boundary` / `Review Authority`): `Yes`
- Approved change, preserved behavior, and outside scope understood: `Yes` — exact `willRetry` classification, active/correlation preservation, matching terminal behavior, stale old-turn protection, and common pipeline reuse are in scope; reconnect/replay redesign, admission weakening, frontend production redesign, persistence migration/backfill, and non-Codex expansion remain out of scope.
- Every prospective blocking `Design Impact` finding is traceable to an approved requirement, acceptance criterion, or preserved-behavior ID (`Yes`/`No`): `Yes` — no current blocking finding remains.
- Remaining material ambiguity, if any: None.

| Behavior ID | Kind | Design Alignment With Approved Intent (`Pass`/`Fail`) | Approved Trigger / Contract And Current-State Evidence (`Pass`/`Fail`/`Unclear`) | Target Outcome / Path / Spine Coherence (`Pass`/`Fail`/`Unclear`) | Status (`Confirmed`/`Needs Correction`/`Unclear`) | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| `BEH-001` | Contract / System | `Pass` | `Pass` — installed v2 `ErrorNotification` requires `willRetry`, `threadId`, and `turnId`; current handler ignores the boolean. | `Pass` — exact `true` produces a turn diagnostic without thread mutation or converter cleanup; non-exact-`true` retains conservative terminal handling. | `Confirmed` | None. |
| `BEH-002` | User / System | `Pass` | `Pass` — retained production evidence proves same-turn reasoning, tools, answer, and completion after retries; current rejection follows the false active-turn clear. | `Pass` — preserved identity admits later same-turn events through the existing canonical lifecycle, replay, wire, and frontend diagnostic path. | `Confirmed` | None. |
| `BEH-003` | Contract | `Pass` | `Pass` — current exact-turn guards protect B's thread state but current emission/conversion/projection can still damage B; `UC-003` and `AC-005` expressly govern this late-A/active-B path. | `Pass` — exact stale terminal/completion/turn-identified failed-status boundaries stop at `CodexThread`; emitted matching terminals use exact-turn converter cleanup; runtime-global and unclassified failures retain all-scope behavior. | `Confirmed` | None. |

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose And Scope Are Clear? (`Pass`/`Fail`) | Linked To Relevant Core Artifacts? (`Pass`/`Fail`) | Internally Complete? (`Pass`/`Fail`) | Consistent With Related Core Artifacts? (`Pass`/`Fail`) | Status And Approval Applicability Are Clear? (`Pass`/`Fail`) | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| `runtime-evidence.md` | `Pass` | `Pass` | `Pass` | `Pass` | `Pass` — `Complete`; approval `N/A` because it is evidence only. | None. |

The canonical supplement inventory is present in `investigation-notes.md`; the supplement is also linked from the requirements and design spec with consistent purpose, scope, status, and approval applicability.

## Task Design Health Assessment Verdict

| Assessment Area | Result (`Pass`/`Fail`) | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | `Pass` | Design identifies a small bug fix and records the two established defect consequences. | None. |
| Root-cause classification is explicit and evidence-backed | `Pass` | `Local Implementation Defect`: the existing Codex notification owner discards authoritative retry intent and emits a stale boundary that downstream projection cannot safely apply. | None. |
| Refactor needed now / no refactor needed / deferred decision is explicit | `Pass` | `No`; current thread and converter owners already have the necessary identities, lifecycle authority, result shape, and cleanup hooks. | None. |
| Refactor decision is supported by the concrete design sections or residual-risk rationale | `Pass` | `DS-003` extends one existing notification branch and `DS-004` extends one lifecycle-converter context; generic frontend/replay policy and public APIs stay unchanged. | None. |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? (`Pass`/`Fail`) | Narrative Is Clear? (`Pass`/`Fail`) | Facade Vs Governing Owner Is Clear? (`Pass`/`Fail`/`N/A`) | Main Domain Subject Naming Is Clear? (`Pass`/`Fail`) | Ownership Is Clear? (`Pass`/`Fail`) | Off-Spine Concerns Stay Off Main Line? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `DS-001` | Primary end-to-end request / single submission | `Pass` | `Pass` | `Pass` | `Pass` | `Pass` | `Pass` | `Pass` |
| `DS-002` | Native return event to replay/wire/UI or intentional stale stop | `Pass` | `Pass` | `Pass` | `Pass` | `Pass` | `Pass` | `Pass` |
| `DS-003` | Bounded local notification classification, mutation, and emission | `Pass` | `Pass` | `N/A` | `Pass` | `Pass` | `Pass` | `Pass` |
| `DS-004` | Bounded local lifecycle conversion and tracker cleanup | `Pass` | `Pass` | `N/A` | `Pass` | `Pass` | `Pass` | `Pass` |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? (`Pass`/`Fail`) | Internal Owned Mechanisms Stay Internal? (`Pass`/`Fail`) | Caller Bypass Risk Is Controlled? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `CodexThread.handleAppServerNotification` | `Pass` | `Pass` | `Pass` | `Pass` | Router continues through the thread; the internal handler owns exact native/current identity comparison, state mutation, and emit/no-emit. |
| `CodexThreadEventConverter.convert` | `Pass` | `Pass` | `Pass` | `Pass` | Trackers remain encapsulated; the lifecycle context exposes narrow existing turn-boundary and all-scope hooks. |
| `AgentRun` event pipeline | `Pass` | `Pass` | `Pass` | `Pass` | Only admitted canonical events enter lifecycle/persistence and outward streaming. |
| Frontend projector | `Pass` | `Pass` | `Pass` | `Pass` | It remains generic and unchanged; Codex-specific stale policy is not moved into the UI. |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? (`Pass`/`Fail`) | Forbidden Shortcuts Are Explicit? (`Pass`/`Fail`) | Direction Is Coherent With Ownership? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Codex native notification boundary | `Pass` | `Pass` | `Pass` | `Pass` | Uses exact protocol fields, current thread identity, existing resolvers, and existing handling-result shape; no downstream filtering or re-emission. |
| Codex lifecycle converter | `Pass` | `Pass` | `Pass` | `Pass` | Consumes normalized canonical evidence and owned cleanup hooks; does not mutate thread state or infer identity from runtime snapshots. |
| Common lifecycle/replay/transport/frontend | `Pass` | `Pass` | `Pass` | `Pass` | No dependency on native `willRetry`, no reconnect/replay bypass, and no non-Codex policy expansion. |
| Test-only full-path integration | `Pass` | `Pass` | `Pass` | `Pass` | Cross-workspace source imports are confined to one test; web production code and package dependencies must not depend on server implementation. |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? (`Pass`/`Fail`) | Responsibility Is Singular? (`Pass`/`Fail`) | Identity Shape Is Explicit? (`Pass`/`Fail`) | Generic Boundary Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- |
| `CodexThread.handleAppServerNotification(method, params)` | `Pass` | `Pass` | `Pass` | `Low` | `Pass` |
| Internal `handleAppServerNotification(codexThread, message)` | `Pass` | `Pass` | `Pass` | `Low` | `Pass` |
| `CodexThread.markTurnFailed(turnId)` / `markTurnCompleted(turnId)` | `Pass` | `Pass` | `Pass` | `Low` | `Pass` |
| `CodexNotificationHandlingResult` | `Pass` | `Pass` | `Pass` | `Low` | `Pass` |
| `CodexThreadEventConverter.convert` / lifecycle cleanup context | `Pass` | `Pass` | `Pass` | `Low` | `Pass` |
| `resolveAgentRunErrorEvidence` | `Pass` | `Pass` | `Pass` | `Low` | `Pass` |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? (`Pass`/`Fail`) | Reuse / Extension Decision Is Sound? (`Pass`/`Fail`) | New Support Piece Is Justified? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Native retry classification | `Pass` | `Pass` | `N/A` | `Pass` | Existing notification handler is the correct owner. |
| Stale identified lifecycle-boundary containment | `Pass` | `Pass` | `N/A` | `Pass` | Existing thread boundary is the earliest point with both identities and emission control. |
| Reasoning and ordered-tool cleanup | `Pass` | `Pass` | `N/A` | `Pass` | Reuses existing exact-turn and all-scope hooks. |
| Diagnostic lifecycle, replay, wire mapping, and UI projection | `Pass` | `Pass` | `N/A` | `Pass` | Existing common contract already preserves emitted diagnostics and continuation. |
| Historical repair / reconnect | `Pass` | `Pass` | `N/A` | `Pass` | Correctly rejected as unnecessary and out of scope. |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? (`Pass`/`Fail`) | Reuse / Extend / Create-New Decision Is Sound? (`Pass`/`Fail`) | Supports The Right Spine Owners? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Codex thread adapter | `Pass` | `Pass` | `Pass` | `Pass` | Extends the current identity/state/emission owner only. |
| Codex event conversion | `Pass` | `Pass` | `Pass` | `Pass` | Extends the current tracker owner with an explicit cleanup matrix. |
| Common AgentRun event processing | `Pass` | `Pass` | `Pass` | `Pass` | Reused unchanged for non-stale admitted events. |
| Streaming/frontend projection | `Pass` | `Pass` | `Pass` | `Pass` | Reused unchanged; stale Codex boundaries never reach this turn-blind projection. |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? (`Pass`/`Fail`) | Shared File Choice Is Sound? (`Pass`/`Fail`/`N/A`) | Ownership Of Shared Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Native retry/stale classification | `Pass` | `N/A` | `N/A` | `Pass` | One authoritative local branch; extraction would add empty indirection. |
| Canonical diagnostic/terminal evidence | `Pass` | `Pass` | `Pass` | `Pass` | Existing common error-evidence contract remains authoritative for emitted events. |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Pass`/`Fail`) | Redundant Attributes Removed? (`Pass`/`Fail`) | Overlapping Representation Risk Is Controlled? (`Pass`/`Fail`) | Shared Core Vs Specialized Variant / Composition Decision Is Sound? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Native `ErrorNotification` fields | `Pass` | `Pass` | `Pass` | `N/A` | `Pass` | Exact supported contract; no alias or retry-text representation. |
| Canonical `error_scope` / `error_effect` / `turn_id` | `Pass` | `Pass` | `Pass` | `Pass` | `Pass` | Valid evidence drives lifecycle and converter cleanup. |
| `CodexThreadEventMessage` and `CodexNotificationHandlingResult` | `Pass` | `Pass` | `Pass` | `Pass` | `Pass` | Existing branded event/result shapes express the full target behavior. |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? (`Pass`/`Fail`) | Responsibility Matches The Intended Owner/Boundary? (`Pass`/`Fail`) | Responsibilities Were Re-Tightened After Shared-Structure Extraction? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `codex-thread-notification-handler.ts` | `Pass` | `Pass` | `N/A` | `Pass` | Owns exact retry classification, exact stale comparison, thread mutation, and emit/no-emit. |
| `codex-thread-lifecycle-event-converter.ts` | `Pass` | `Pass` | `N/A` | `Pass` | Owns canonical error creation and no/exact-turn/all-scope structural cleanup selection. |
| Three named server unit suites | `Pass` | `Pass` | `N/A` | `Pass` | Cover thread state/emission, joined converter trackers, and tool correlation at their established owners. |
| `codex-stale-turn-boundary-projection.integration.test.ts` | `Pass` | `Pass` | `N/A` | `Pass` | One test-only joined regression owns the native-to-conversation projection consequence without adding production dependencies. |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? (`Pass`/`Fail`) | Folder Matches Owning Boundary? (`Pass`/`Fail`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/.../codex/thread/codex-thread-notification-handler.ts` | `Pass` | `Pass` | `Low` | `Pass` | Existing Codex native lifecycle owner. |
| `autobyteus-server-ts/.../codex/events/codex-thread-lifecycle-event-converter.ts` | `Pass` | `Pass` | `Low` | `Pass` | Existing Codex lifecycle conversion owner. |
| Corresponding server unit-test files | `Pass` | `Pass` | `Low` | `Pass` | Mirror the production owners and use the real thread/converter harness. |
| `autobyteus-web/tests/integration/codex-stale-turn-boundary-projection.integration.test.ts` | `Pass` | `Pass` | `Low` | `Pass` | Meaningful assertion ends in frontend state; cross-workspace imports are explicitly test-only. |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? (`Pass`/`Fail`) | Replacement Owner / Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Removal / Decommission Scope Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| All-native-errors-call-`markTurnFailed` assumption | `Pass` | `Pass` | `Pass` | `Pass` | Replaced in the single notification branch by exact retry effect. |
| Run-wide cleanup for every valid turn error | `Pass` | `Pass` | `Pass` | `Pass` | Replaced by the explicit `DS-004` matrix. |
| Emission of explicit stale turn boundaries | `Pass` | `Pass` | `Pass` | `Pass` | Replaced by the existing thread-owned no-emission result. |
| Retry-text/reconnect/replay/tombstone alternatives | `Pass` | `Pass` | `Pass` | `Pass` | Explicitly rejected; no parallel machinery remains. |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? (`Yes`/`No`) | Clean-Cut Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- |
| Native retry classification | `No` | `Pass` | `Pass` | Exact camel-case `willRetry`; no aliases, text parsing, or parallel handler. |
| Stale boundary containment | `No` | `Pass` | `Pass` | No tombstone, downstream compatibility event, or dual projection path. |
| Event persistence | `No` | `Pass` | `Pass` | Current schema remains directly usable. |

## Persisted-Data Transition Verdict (When Applicable)

| Area / Stored Subject | Approved Decision | Representative Reader / Semantic / Invariant Evidence Is Sufficient? (`Pass`/`Fail`) | Direct Use, Rebuild, Or Migration Choice Is Proportionate? (`Pass`/`Fail`) | Migration Safety Is Complete If Required? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Application-owned JSONL run traces and derived run view | `Directly Usable — No Migration` | `Pass` | `Pass` | `N/A` | `Pass` | No schema change or historical rewrite; future canonical history intentionally excludes exact stale A boundaries and retains admitted diagnostics/B continuation. |

## Change / Refactor Safety Verdict

| Area | Sequence Is Realistic? (`Pass`/`Fail`) | Temporary Seams Are Explicit? (`Pass`/`Fail`) | Cleanup / Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- |
| Native notification classification and stale containment | `Pass` | `Pass` | `Pass` | `Pass` |
| Converter reasoning/tool lifecycle | `Pass` | `Pass` | `Pass` | `Pass` |
| Joined native-to-live-projection regression | `Pass` | `Pass` | `Pass` | `Pass` |
| Common lifecycle/frontend/persistence preservation | `Pass` | `Pass` | `Pass` | `Pass` |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? (`Yes`/`No`) | Example Is Present And Clear? (`Pass`/`Fail`/`N/A`) | Bad / Avoided Shape Is Explained When Helpful? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Exact `willRetry` classification | `Yes` | `Pass` | `Pass` | `Pass` | Shows exact boolean versus forbidden message parsing/aliases. |
| Diagnostic tracker preservation | `Yes` | `Pass` | `Pass` | `Pass` | Shows no cleanup and normal same-turn continuation. |
| Emitted terminal cleanup matrix | `Yes` | `Pass` | `Pass` | `Pass` | Distinguishes exact-turn from runtime-global/unclassified cleanup. |
| Explicit stale A / active B containment | `Yes` | `Pass` | `Pass` | `Pass` | Shows precise predicate, no mutation/no emission, and rejected downstream repair shapes. |
| Joined A/B user-visible projection | `Yes` | `Pass` | `Pass` | `Pass` | Drives B open content/tool state through late A error/completion, later B continuation, and B-only completion. |

## Material Premise Validation (Only When Needed)

None. The retrying same-turn path and late old-turn boundary path are already established by approved `UC-001`/`UC-003`, `BEH-001`/`BEH-003`, and `AC-001` through `AC-005`, with current source and retained runtime/contract evidence. `SR-003` adds no machinery for an unsupported scenario.

## Unresolved Approved-Behavior Or Current-State Gaps

None.

## Review Decision

`Pass` — the behavior basis is confirmed, `AR-F-001` and `AR-F-002` are resolved in the current design, and the design is ready for implementation.

## Findings

None.

## Classification

`N/A` — no current blocking finding.

## Recommended Recipient

`/implementation_engineer`

## Residual Risks

- Retry diagnostics may still look visually severe; presentation redesign remains out of scope.
- Future incompatible Codex protocol revisions may require separate contract work; no retry-text inference is authorized.
- Previously discarded historical events remain absent and are not backfilled.
- Identity-missing or otherwise malformed errors retain existing conservative terminal/all-scope handling rather than gaining an unsupported compatibility policy.
- The joined projection regression requires explicit test-only cross-workspace dependency setup; implementation must keep those imports out of web production code and must record any environment limitation rather than changing the ownership boundary.

## Latest Authoritative Result

- Review Decision: `Pass`
- Material-Premise Gate (`Pass`/`Fail`/`Blocked`): `Pass`
- Notes: `SR-003` resolves `AR-F-002` at the earliest identity-owning Codex boundary: an exact stale terminal/completion/turn-identified failed-status boundary causes neither mutation nor emission, so it cannot reach converter, replay, wire, or frontend projection. `SR-002`'s accepted `DS-004` matrix remains coherent for all emitted errors. Matching-active terminal behavior, runtime-global/unclassified cleanup, exact-turn admission, common diagnostic projection, and the explicit rejection of reconnect/replay/frontend/persistence expansion remain preserved.
