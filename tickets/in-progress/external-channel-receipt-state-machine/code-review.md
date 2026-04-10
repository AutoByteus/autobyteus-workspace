# Code Review

## Review Meta

- Ticket: `external-channel-receipt-state-machine`
- Review Round: `8`
- Trigger Stage: `8`
- Prior Review Round Reviewed: `7`
- Latest Authoritative Round: `8`
- Workflow state source: `tickets/in-progress/external-channel-receipt-state-machine/workflow-state.md`
- Investigation notes reviewed as context: `tickets/in-progress/external-channel-receipt-state-machine/investigation-notes.md`
- Earlier design artifact(s) reviewed as context:
  - `tickets/in-progress/external-channel-receipt-state-machine/proposed-design.md`
  - `tickets/in-progress/external-channel-receipt-state-machine/future-state-runtime-call-stack.md`
  - `tickets/in-progress/external-channel-receipt-state-machine/future-state-runtime-call-stack-review.md`
- Shared review authorities loaded for this round:
  - `/Users/normy/.codex/skills/software-engineering-workflow-skill/shared/design-principles.md`
  - `/Users/normy/.codex/skills/software-engineering-workflow-skill/shared/common-design-practices.md`
  - `/Users/normy/.codex/skills/software-engineering-workflow-skill/stages/08-code-review/code-review-principles.md`

## Scope

- Primary source files re-reviewed from the receipt-owned redesign:
  - `autobyteus-server-ts/src/external-channel/domain/models.ts`
  - `autobyteus-server-ts/src/external-channel/domain/receipt-workflow-state.ts`
  - `autobyteus-server-ts/src/external-channel/providers/channel-message-receipt-provider.ts`
  - `autobyteus-server-ts/src/external-channel/providers/file-channel-message-receipt-provider.ts`
  - `autobyteus-server-ts/src/external-channel/providers/file-channel-message-receipt-row.ts`
  - `autobyteus-server-ts/src/external-channel/runtime/receipt-effect-runner.ts`
  - `autobyteus-server-ts/src/external-channel/runtime/receipt-workflow-persistence.ts`
  - `autobyteus-server-ts/src/external-channel/runtime/receipt-workflow-reducer.ts`
  - `autobyteus-server-ts/src/external-channel/runtime/receipt-workflow-runtime.ts`
  - `autobyteus-server-ts/src/external-channel/services/channel-ingress-service.ts`
  - `autobyteus-server-ts/src/external-channel/services/channel-message-receipt-service.ts`
  - `autobyteus-server-ts/src/external-channel/services/channel-turn-reply-recovery-service.ts`
- Source files reviewed specifically for the final authoritative dispatch-binding slice:
  - `autobyteus-server-ts/src/external-channel/runtime/channel-dispatch-lock-registry.ts`
  - `autobyteus-server-ts/src/external-channel/runtime/channel-dispatch-turn-capture.ts`
  - `autobyteus-server-ts/src/external-channel/runtime/channel-agent-run-facade.ts`
  - `autobyteus-server-ts/src/external-channel/runtime/channel-team-run-facade.ts`
  - `autobyteus-server-ts/src/external-channel/runtime/channel-run-dispatch-result.ts`
  - `autobyteus-server-ts/src/agent-execution/domain/agent-operation-result.ts`
  - `autobyteus-server-ts/src/agent-execution/backends/codex/backend/codex-agent-run-backend.ts`
  - `autobyteus-server-ts/src/agent-execution/backends/claude/backend/claude-agent-run-backend.ts`
  - `autobyteus-server-ts/src/agent-team-execution/domain/team-run.ts`
  - `autobyteus-server-ts/src/agent-team-execution/backends/autobyteus/autobyteus-team-run-backend.ts`
- Tests reviewed:
  - `autobyteus-server-ts/tests/unit/external-channel/runtime/channel-dispatch-lock-registry.test.ts`
  - `autobyteus-server-ts/tests/unit/external-channel/runtime/channel-agent-run-facade.test.ts`
  - `autobyteus-server-ts/tests/unit/external-channel/runtime/channel-team-run-facade.test.ts`
  - `autobyteus-server-ts/tests/unit/external-channel/runtime/receipt-workflow-runtime.test.ts`
  - `autobyteus-server-ts/tests/unit/external-channel/services/channel-ingress-service.test.ts`
  - `autobyteus-server-ts/tests/unit/external-channel/services/channel-message-receipt-service.test.ts`
  - `autobyteus-server-ts/tests/unit/api/rest/channel-ingress.test.ts`
  - `autobyteus-server-ts/tests/integration/api/rest/channel-ingress.integration.test.ts`
- Directly impacted production files re-reviewed for the new Stage 7 validation delta:
  - `autobyteus-server-ts/src/external-channel/runtime/channel-binding-run-launcher.ts`
  - `autobyteus-server-ts/src/agent-execution/services/agent-run-service.ts`
  - `autobyteus-server-ts/src/agent-execution/services/agent-run-manager.ts`
- Legacy source removal still confirmed in scope:
  - `accepted-receipt-correlation-persistence.ts`
  - `accepted-receipt-dispatch-turn-capture-registry.ts`
  - `accepted-receipt-key.ts`
  - `accepted-receipt-recovery-runtime-contract.ts`
  - `accepted-receipt-recovery-runtime.ts`
  - `accepted-receipt-turn-correlation-observer-registry.ts`
  - `receipt-run-observation-registry.ts`
  - `channel-run-dispatch-hooks.ts`

## Prior Findings Resolution Check

| Prior Round | Finding ID | Previous Severity | Current Resolution (`Resolved`/`Partially Resolved`/`Still Failing`/`Not Applicable After Rework`) | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| 5 | `CR-006` | Blocker candidate | Resolved | `channel-dispatch-lock-registry.ts`, `channel-agent-run-facade.ts`, `channel-team-run-facade.ts`, lock/facade tests, Stage 7 round 4 pass | same-run dispatch serialization now makes dispatch-scoped delayed-turn capture authoritative under concurrency instead of only under ideal sequencing |
| 7 | `None` | N/A | Resolved | Stage 7 round 6 validation evidence, latest changed-scope review | prior round passed with no findings, and this validation-delta round did not uncover a new blocker |

## Source File Size And Structure Audit

| Source File | Effective Non-Empty Line Count | Adds/Expands Functionality (`Yes`/`No`) | `>500` Hard-Limit Check | `>220` Changed-Line Delta Gate | Scope-Appropriate SoC Check (`Pass`/`Fail`) | File Placement Check (`Pass`/`Fail`) | Preliminary Classification | Required Action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/external-channel/runtime/channel-dispatch-lock-registry.ts` | `48` | Yes | Pass | Pass (`48`, new file) | Pass | Pass | N/A | Keep |
| `autobyteus-server-ts/src/external-channel/runtime/channel-dispatch-turn-capture.ts` | `103` | Yes | Pass | Pass (`103`, new file) | Pass | Pass | N/A | Keep |
| `autobyteus-server-ts/src/external-channel/runtime/channel-agent-run-facade.ts` | `120` | Yes | Pass | Pass (`113`) | Pass | Pass | N/A | Keep |
| `autobyteus-server-ts/src/external-channel/runtime/channel-team-run-facade.ts` | `144` | Yes | Pass | Pass (`140`) | Pass | Pass | N/A | Keep |
| `autobyteus-server-ts/src/external-channel/runtime/receipt-effect-runner.ts` | `136` | Yes | Pass | Pass (`136`, new file) | Pass | Pass | N/A | Keep |
| `autobyteus-server-ts/src/external-channel/runtime/receipt-workflow-runtime.ts` | `381` | Yes | Pass | Pass (`381`, new file; rechecked in this round because it remains the central durable owner and did not absorb the facade-side serialization concern) | Pass | Pass | N/A | Keep |
| `autobyteus-server-ts/src/external-channel/services/channel-ingress-service.ts` | `264` | Yes | Pass | Pass (`145`) | Pass | Pass | N/A | Keep |
| `autobyteus-server-ts/src/external-channel/providers/file-channel-message-receipt-provider.ts` | `391` | Yes | Pass | Pass (`192`) | Pass | Pass | N/A | Keep |
| `autobyteus-server-ts/src/external-channel/services/channel-turn-reply-recovery-service.ts` | `117` | Yes | Pass | Pass (`117`, changed scope remains under the gate) | Pass | Pass | N/A | Keep |
| `autobyteus-server-ts/src/external-channel/domain/models.ts` | `215` | Yes | Pass | Pass (`32`) | Pass | Pass | N/A | Keep |

Delta-gate assessment note:

- No changed source file exceeds the `>500` hard limit.
- The central receipt-workflow owner file remains large but coherent; the new concurrency fix stayed out of it and landed at the facade boundary where the dispatch contract is owned.

## Independent Re-Review Notes

- The active primary spine is now:
  - `Inbound external message -> ChannelIngressService -> Channel*RunFacade -> ReceiptWorkflowRuntime -> ReplyCallbackService`
- The active return/event spines are now explicit and cleanly split:
  - dispatch-scoped delayed-turn capture at `Channel*RunFacade -> channel-dispatch-turn-capture.ts`
  - same-run dispatch serialization at `Channel*RunFacade -> ChannelDispatchLockRegistry`
  - known-turn live observation at `ReceiptEffectRunner -> Channel*RunReplyBridge`
  - known-turn persisted recovery at `ReceiptEffectRunner -> ChannelTurnReplyRecoveryService`
- The bounded local spine remains:
  - `receipt event queue -> load active receipt -> persist workflow event -> run next effect -> enqueue next fact`
- The critical architectural improvement in this round is not “more correlation metadata.” It is stronger ownership:
  - the external-channel facade boundary now owns delayed-turn capture and the sequencing needed to keep that capture authoritative
  - the receipt runtime remains the sole durable workflow owner
  - the generic runtime/core event surface stays client-agnostic
- The deeper contract check also holds:
  - `autobyteus-ts` still emits a generic `notifyAgentTurnStarted(turnId)` shape only
  - the AutoByteus server backend converts that stream event into server-side `AgentRunEventType.TURN_STARTED`
  - the external-channel facades listen to that generic server-side event at dispatch time and never require client-specific runtime payload changes
- There is no run-wide pending-turn owner left in the business path.
- There is no chronology-based live or degraded turn-binding rule left in the business path.
- Known-turn recovery is now truly subordinate: it only helps after authoritative binding is already established.
- The `Authoritative Boundary Rule` now holds cleanly:
  - callers above the receipt workflow use the receipt workflow
  - callers above the dispatch boundary use the dispatch boundary
  - no caller mixes facade-level dispatch capture with runtime-core internals or receipt-provider heuristics
- No active legacy workflow owner or compatibility branch remains in the reviewed scope.
- This round re-reviewed the validation-driven delta specifically:
  - the ingress integration harness now models a terminated direct run becoming inactive,
  - `ChannelBindingRunLauncher.resolveOrStartAgentRun()` is re-proven through the `restoreAgentRun(...)` path,
  - the same-thread second inbound message now has executable proof that it restores the bound run and then publishes a new reply without binding churn or manual recreation.
- The new restore-path test stays at the real ownership boundary:
  - it terminates through `AgentRunService`,
  - it forces the launcher to miss `getAgentRun(...)`,
  - it proves `restoreBackend` is called exactly once,
  - and it verifies a second routed receipt/publish on the same bound run id.
- No new boundary bypass, dual-path fallback, or legacy retention was introduced to support the stronger validation proof.

## Structural Integrity Checks

| Check | Result (`Pass`/`Fail`) | Evidence | Required Action |
| --- | --- | --- | --- |
| Data-flow spine inventory clarity and preservation under shared principles | Pass | primary spine, return/event spines, and bounded local spine are all explicit and materially different | Keep |
| Spine span sufficiency check | Pass | the reviewed spine reaches from ingress surface through authoritative dispatch binding to durable workflow owner and callback consequence | Keep |
| Ownership boundary preservation and clarity | Pass | dispatch capture plus serialization belong to the facade boundary; durable observation/finalization remain in the receipt runtime family | Keep |
| Off-spine concern clarity | Pass | capture helper, lock registry, reply bridges, recovery, persistence, and callback publication each serve one spine owner | Keep |
| Existing capability/subsystem reuse check | Pass | the fix stayed inside the existing external-channel subsystem and the existing shared run boundaries | Keep |
| Reusable owned structures check | Pass | `ChannelDispatchLockRegistry` and `channel-dispatch-turn-capture.ts` centralize repeated sequencing/capture policy once instead of duplicating it across facades | Keep |
| Shared-structure/data-model tightness check | Pass | `AgentOperationResult.turnId` remains a generic runtime-domain field and no client-specific shared shape was introduced | Keep |
| Repeated coordination ownership check | Pass | same-run delayed-turn coordination now has one clear owner at the facade boundary instead of being split across implicit run ordering and listener timing | Keep |
| Empty indirection check | Pass | the new lock registry owns real sequencing policy and cleanup; it is not a pass-through wrapper | Keep |
| Scope-appropriate separation of concerns and file responsibility clarity | Pass | facades, lock registry, one-shot capture, receipt runtime, reply bridges, recovery, and providers each keep one coherent concern | Keep |
| Ownership-driven dependency check | Pass | upper layers depend on public run boundaries and do not bypass into runtime internals or provider heuristics | Keep |
| Authoritative Boundary Rule check | Pass | the external-channel flow no longer mixes authoritative boundaries with their internals on either the dispatch or durable-workflow side | Keep |
| File placement check | Pass | the new lock registry sits beside the dispatch facades that own it; durable workflow code remains in the receipt runtime family | Keep |
| Flat-vs-over-split layout judgment | Pass | one new small file is justified because it owns a cross-facade policy without fragmenting the subsystem | Keep |
| Interface/API/query/command/service-method boundary clarity | Pass | shared run APIs stay generic while the external-channel facade absorbs its own sequencing/capture policy | Keep |
| Naming quality and naming-to-responsibility alignment check | Pass | `ChannelDispatchLockRegistry` and `channel-dispatch-turn-capture.ts` describe their real role directly | Keep |
| No unjustified duplication of code / repeated structures in changed scope | Pass | same-run sequencing and delayed-turn capture are each owned once rather than copied into both direct/team facades | Keep |
| Patch-on-patch complexity control | Pass | the fix removed the last implicit race instead of layering another fallback or compatibility path on top | Keep |
| Dead/obsolete code cleanup completeness in changed scope | Pass | old accepted-receipt runtime files, run-wide pending-turn ownership, and the rejected core-correlation slice remain absent | Keep |
| Test quality is acceptable for the changed behavior | Pass | lock-registry tests, facade tests, workflow-runtime tests, service tests, route tests, and ingress integration tests cover the changed architecture directly | Keep |
| Test maintainability is acceptable for the changed behavior | Pass | tests stay at the real ownership boundaries instead of mocking across unrelated layers | Keep |
| Validation evidence sufficiency for the changed flow | Pass | Stage 7 round 4 includes focused runtime tests, broad external-channel slice, ingress integration tests, and green build evidence | Keep |
| No backward-compatibility mechanisms | Pass | no compatibility wrapper or dual-path turn-binding logic remains in the business path | Keep |
| No legacy code retention for old behavior | Pass | legacy accepted-receipt runtime ownership and chronology-based pending-turn binding remain removed | Keep |

## Review Scorecard

- Overall score (`/10`): `9.7`
- Overall score (`/100`): `97`
- Score calculation note: simple average across the ten required categories. Every category is `>= 9.0`, and no mandatory structural check failed.

| Priority | Category | Score (`1.0-10.0`) | Why This Score | What Is Weak / Holding It Down | What Should Improve |
| --- | --- | --- | --- | --- | --- |
| `1` | `Data-Flow Spine Inventory and Clarity` | `9.5` | the primary spine and the materially distinct return/event spines are still easy to draw, and the new restore-path proof now stretches that spine through a real lifecycle interruption instead of only steady-state ingress | the subsystem remains workflow-heavy, so the spine inventory is not tiny | keep future changes attached to one of the existing declared spines |
| `2` | `Ownership Clarity and Boundary Encapsulation` | `9.8` | the restore-path validation strengthened the same ownership split rather than bypassing it: ingress stays ingress, launcher stays launcher, durable workflow stays receipt-owned | none material in changed scope | preserve the current authority split |
| `3` | `API / Interface / Query / Command Clarity` | `9.5` | the new validation uses the existing authoritative APIs cleanly: `terminateAgentRun`, then normal ingress, then launcher-owned restore | `AgentOperationResult.turnId` remains a shared contract expansion, though still justified and runtime-domain only | keep shared result types generic and subject-owned |
| `4` | `Separation of Concerns and File Placement` | `9.7` | no production file had to absorb test-only policy; the extra lifecycle behavior stayed inside the integration harness while the real restore logic remained where it belongs | `file-channel-message-receipt-provider.ts` remains a sizable persistence file, though still coherent | keep future provider cleanup independent of this ticket |
| `5` | `Shared-Structure / Data-Model Tightness and Reusable Owned Structures` | `9.5` | the reusable harness shape improved: one backend factory now models multi-post and restore lifecycle truthfully without creating a second fake path | the subsystem still contains several workflow structures because the problem domain is stateful | resist turning shared shapes into generic catch-alls |
| `6` | `Naming Quality and Local Readability` | `9.5` | the new test names and harness options are explicit about steady-state reuse versus terminate-and-restore behavior | some runtime names remain long because they are explicit | keep explicitness over shortening |
| `7` | `Validation Strength` | `10.0` | Stage 7 now proves the two highest-signal external-thread continuations in-repo: second message on the same run and second message after termination/restore, and the broader slice stayed green at `111/111` | none material for the in-scope server flow | preserve this stronger ingress lifecycle proof if the channel flow changes again |
| `8` | `Runtime Correctness Under Edge Cases` | `9.5` | the restore-after-termination lifecycle is now directly exercised, which materially reduces uncertainty around stale-active versus restored-run handling on the primary path | cross-process / distributed dispatch serialization is still outside the current single-process server scope | if multi-process dispatch becomes in-scope later, lift the same ownership rule to that deployment boundary |
| `9` | `No Backward-Compatibility / No Legacy Retention` | `9.8` | the stronger validation did not reintroduce compatibility wrappers, fallback branches, or legacy owners | none material in reviewed scope | keep enforcing clean-cut removal |
| `10` | `Cleanup Completeness` | `9.5` | the validation delta improved realism without leaving a second fake lifecycle path or stray compatibility scaffolding behind | Stage 9 docs sync is still separate work | keep the same cleanliness in docs sync |

## Findings

- None.

## Round History

| Round | Trigger | Prior Unresolved Findings Rechecked (`Yes`/`No`) | New Findings Found (`Yes`/`No`) | Gate Decision (`Pass`/`Fail`) | Latest Authoritative (`Yes`/`No`) | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Stage 7 pass on the transitional slice | N/A | Yes | Fail | No | architecture still retained the legacy accepted-runtime owner |
| 2 | Stage 7 pass after the first Design Impact re-entry | Yes | No | Pass | No | receipt-workflow owner redesign resolved the earlier blockers, but a deeper re-review was still pending |
| 3 | Stage 8 independent deep re-review against shared principles and no-legacy requirements | Yes | No | Pass | No | ownership and no-legacy posture held under independent review |
| 4 | Stage 8 deep re-review focused on pending-turn correlation and dispatch-to-turn contract strength | Yes | Yes | Fail | No | chronology-first pending-turn matching remained a blocker |
| 5 | Stage 8 re-review after the split-listener correction | Yes | No | Pass | No | dispatch-scoped capture moved to the external-channel facade boundary, but the same-run concurrency hole still required one more hardening pass |
| 6 | Stage 8 re-review after same-run dispatch serialization | Yes | No | Pass | Yes | authoritative delayed-turn binding now holds both under normal sequencing and under same-run concurrent dispatch attempts, with no legacy and no guessed fallback |
| 7 | Additional independent deep Stage 8 review after reloading the shared review authorities | Yes | No | Pass | No | the deeper contract path also holds: generic core `TURN_STARTED`, server-side stream conversion, facade-owned dispatch capture, and no runtime/client cross-contamination |
| 8 | Additional independent deep Stage 8 review after the terminate-and-restore Stage 7 re-entry | Yes | No | Pass | Yes | the stronger validation delta still respects the architecture: restore remains launcher-owned, ingress remains authoritative at the boundary, and no new structural findings were introduced |

## Gate Decision

- Latest authoritative review round: `8`
- Decision: `Pass`
- Implementation can proceed to `Stage 9`: `Yes`
- Mandatory pass checks:
  - Review scorecard recorded in canonical priority order: `Yes`
  - No scorecard category is below `9.0`: `Yes`
  - All changed source files have effective non-empty line count `<=500`: `Yes`
  - Required `>220` changed-line delta-gate assessments are recorded for all applicable changed source files: `Yes`
  - Data-flow spine inventory clarity and preservation under shared principles = `Pass`: `Yes`
  - Spine span sufficiency check = `Pass`: `Yes`
  - Ownership boundary preservation = `Pass`: `Yes`
  - Support structure clarity = `Pass`: `Yes`
  - Existing capability/subsystem reuse check = `Pass`: `Yes`
  - Reusable owned structures check = `Pass`: `Yes`
  - Shared-structure/data-model tightness check = `Pass`: `Yes`
  - Repeated coordination ownership check = `Pass`: `Yes`
  - Empty indirection check = `Pass`: `Yes`
  - Scope-appropriate separation of concerns and file responsibility clarity = `Pass`: `Yes`
  - Ownership-driven dependency check = `Pass`: `Yes`
  - Authoritative Boundary Rule check = `Pass`: `Yes`
  - File placement check = `Pass`: `Yes`
  - Flat-vs-over-split layout judgment = `Pass`: `Yes`
  - Interface/API/query/command/service-method boundary clarity = `Pass`: `Yes`
  - Naming quality and naming-to-responsibility alignment check = `Pass`: `Yes`
  - No unjustified duplication of code / repeated structures in changed scope = `Pass`: `Yes`
  - Patch-on-patch complexity control = `Pass`: `Yes`
  - Dead/obsolete code cleanup completeness in changed scope = `Pass`: `Yes`
  - Test quality is acceptable for the changed behavior = `Pass`: `Yes`
  - Test maintainability is acceptable for the changed behavior = `Pass`: `Yes`
  - Validation evidence sufficiency = `Pass`: `Yes`
  - No backward-compatibility mechanisms = `Pass`: `Yes`
  - No legacy code retention = `Pass`: `Yes`
- Notes:
  - The receipt remains the central durable owner.
  - The external-channel facade boundary now owns both delayed-turn capture and the sequencing required to keep that capture authoritative.
  - There is no chronology-based turn binding, no run-wide pending-turn owner, and no core/runtime pollution in the active design.
