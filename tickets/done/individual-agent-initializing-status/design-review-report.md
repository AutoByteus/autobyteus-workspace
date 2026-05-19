# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/individual-agent-initializing-status/tickets/in-progress/individual-agent-initializing-status/requirements.md`
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/individual-agent-initializing-status/tickets/in-progress/individual-agent-initializing-status/investigation-notes.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/individual-agent-initializing-status/tickets/in-progress/individual-agent-initializing-status/design-spec.md`
- Reviewed Rework Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/individual-agent-initializing-status/tickets/in-progress/individual-agent-initializing-status/design-post-delivery-rework-notes.md`
- Current Review Round: 5 — post-delivery flicker rework, command-correlated overlay replacement
- Trigger: User validation of the delivered Electron app exposed standalone-only fast status flicker `offline -> initializing -> running -> initializing -> running` for inactive/offline individual Codex send after app restart.
- Prior Review Round Reviewed: Round 4 — backend-owned lifecycle design passed for implementation.
- Latest Authoritative Round: Round 5
- Current-State Evidence Basis: Revised requirements, investigation notes, design spec, post-delivery rework notes, and independent source inspection of the delivered `AgentRunCommandCoordinator`, including the current restore-snapshot bridge `clearOverlayForRuntimeOwnedStatus(activeRun, runId)` that clears command overlay and publishes `activeRun.getStatusSnapshot()` before command execution.

## Round History

| Round | Trigger | Prior Unresolved Findings Rechecked | New Findings Found | Review Decision | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Initial frontend accepted-send placeholder review | N/A | 1 | Fail | No | Historical; AR-001 found missing active team-member history/snapshot preservation. |
| 2 | Focused AR-001 re-review of frontend placeholder design | AR-001 | 0 | Pass | No | Historical; later superseded by backend-owned lifecycle architecture. |
| 3 | Fresh review of superseding backend-owned lifecycle design | AR-001 obsolete | 3 | Fail | No | Direction sound; AR-002/AR-003/AR-004 required concrete contracts. |
| 4 | Revised backend-owned lifecycle design after AR-002/AR-003/AR-004 rework | AR-002, AR-003, AR-004 | 0 | Pass | No | Backend-owned lifecycle design became actionable for implementation. |
| 5 | Post-delivery flicker rework | AR-002, AR-003, AR-004, new PD-001 | 0 | Pass | Yes | Rework correctly removes restored-runtime readiness as visible lifecycle truth during inactive-start command. |

## Reviewed Design Spec

The post-delivery rework correctly identifies the missing invariant in the delivered implementation: during an accepted command that starts from an inactive/offline standalone run, runtime readiness is not yet user-message command execution. Therefore restored runtime snapshots/status such as Codex `running`/`active`/`inprogress` must remain internal while the command overlay is `STARTING`.

The revised design makes a clean-cut architecture correction:

```text
SEND_MESSAGE accepted
-> command overlay Initializing
-> restore/create runtime
-> restored-runtime readiness remains internal
-> hand message to active AgentRun
-> only command-correlated live execution/terminal event clears or replaces overlay
```

This aligns standalone behavior with the stable team-member shape and removes the delivered restore-snapshot bridge rather than adding a compatibility branch or frontend workaround.

## Task Design Health Assessment Verdict

| Assessment Area | Result (`Pass`/`Fail`) | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | Requirements/design classify this as a larger architecture bug fix and explicitly add the post-delivery command-correlation invariant. | None. |
| Root-cause classification is explicit and evidence-backed | Pass | Investigation notes cite delivered `AgentRunCommandCoordinator.clearOverlayForRuntimeOwnedStatus()` and explain how Codex restored readiness can normalize to visible `running` before the accepted command executes. | None. |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | Design requires clean-cut removal of the restore-snapshot bridge with no legacy flag/branch. | None. |
| Refactor decision is supported by concrete design sections or residual-risk rationale | Pass | Requirements add UC-012, REQ-024/REQ-025, AC-017/AC-018; design adds PD-001, DS-010, forbidden bridge removal, dependency rule, examples, migration/test guidance. | None. |

## Prior Findings Resolution Check (Mandatory On Round >1)

| Prior Round | Finding ID | Previous Severity | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| 1 | AR-001 | High | Obsolete / superseded | Backend lifecycle status remains authoritative; frontend placeholder preservation is historical only. | No action. |
| 3 | AR-002 | High | Still resolved | Command identity/idempotency/concurrency policy remains intact and is not weakened by this rework. | Same-id retry/different-id rejection still apply. |
| 3 | AR-003 | High | Resolved and tightened | Projection precedence still has command overlay first, and now explicitly states overlay `initializing` overrides active restored runtime snapshots until command-correlated replacement. | The rework strengthens the previous overlay lifecycle contract. |
| 3 | AR-004 | High | Still resolved | Prepared identity activation remains below the coordinator; rework applies equally to restore/create readiness during inactive-start commands. | No new prepared-run gap found. |
| 5 | PD-001 | High | Resolved in design | Design forbids publishing `activeRun.getStatusSnapshot()` while a `STARTING` command overlay is active, removes the `clearOverlayForRuntimeOwnedStatus` shape, and requires command-correlated overlay replacement. | New post-delivery finding reviewed in this round. |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? (`Pass`/`Fail`) | Narrative Is Clear? (`Pass`/`Fail`) | Facade Vs Governing Owner Is Clear? (`Pass`/`Fail`/`N/A`) | Main Domain Subject Naming Is Clear? (`Pass`/`Fail`) | Ownership Is Clear? (`Pass`/`Fail`) | Off-Spine Concerns Stay Off Main Line? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Existing active standalone send | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-002 | Existing offline standalone send | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-003 | New standalone first message | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-004 | Slow Codex restore/start | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-005 | Command overlay/status projection | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-006 | Command-correlated runtime replacement | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-007 | Per-run command execution and idempotency | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-008 | Team member reference behavior | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-009 | External standalone dispatch | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-010 | Restored-runtime `running` guard | Pass | Pass | Pass | Pass | Pass | Pass | Pass |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? (`Pass`/`Fail`) | Reuse / Extend / Create-New Decision Is Sound? (`Pass`/`Fail`) | Supports The Right Spine Owners? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Backend standalone command lifecycle | Pass | Pass | Pass | Pass | Coordinator remains the correct owner for overlay publication, runtime activation, forwarding, and command-correlated replacement. |
| Backend status overlay/projection | Pass | Pass | Pass | Pass | Overlay remains authoritative while command is `STARTING`; projection keeps overlay above active runtime snapshots. |
| Runtime restore/create mechanics | Pass | Pass | Pass | Pass | Runtime readiness remains internal below command lifecycle during inactive-start sends. |
| Standalone websocket transport | Pass | Pass | Pass | Pass | Transport must not synthesize lifecycle status from restored runtime snapshots. |
| Frontend status rendering/history | Pass | Pass | Pass | Pass | Frontend continues consuming backend projection/events, not applying a local workaround. |
| Team lifecycle reference | Pass | Pass | Pass | Pass | Design explicitly matches team behavior: restore/ensure member runtime does not publish an intermediate restored-runtime `running`. |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? (`Pass`/`Fail`) | Shared File Choice Is Sound? (`Pass`/`Fail`/`N/A`) | Ownership Of Shared Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Command overlay replacement gate | Pass | Pass | Pass | Pass | Belongs in `AgentRunCommandCoordinator`, not in stream transport or frontend. |
| Projection precedence | Pass | Pass | Pass | Pass | Existing `AgentRunStatusProjectionService` remains the right read-side owner. |
| Command registry state | Pass | Pass | Pass | Pass | `STARTING` vs `FORWARDED` remains useful for gating replacement and retry behavior. |
| Regression event sequence test shape | Pass | N/A | Pass | Pass | AC-017/AC-018 define the important emitted/visible sequence. |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Pass`/`Fail`) | Redundant Attributes Removed? (`Pass`/`Fail`) | Overlapping Representation Risk Is Controlled? (`Pass`/`Fail`) | Shared Core Vs Specialized Variant / Composition Decision Is Sound? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `status` vs runtime readiness | Pass | Pass | Pass | N/A | Pass | Rework separates internal readiness from visible command lifecycle status. |
| `COMMAND_OVERLAY` status source | Pass | Pass | Pass | N/A | Pass | Overlay source explicitly remains visible while inactive-start command is `STARTING`. |
| Command-correlated event concept | Pass | Pass | Pass | N/A | Pass | The design defines allowed replacement sources as events after message handoff/equivalent execution evidence, not generic runtime attachment. |
| `AgentRunStatusProjection` | Pass | Pass | Pass | Pass | Pass | Projection shape remains coherent and now covers active runtime snapshot suppression under overlay. |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? (`Pass`/`Fail`) | Replacement Owner / Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Removal / Decommission Scope Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `clearOverlayForRuntimeOwnedStatus(activeRun, runId)` restore-snapshot bridge | Pass | Pass | Pass | Pass | Must be removed entirely; no compatibility flag/alternate branch. |
| Publishing `activeRun.getStatusSnapshot()` as visible lifecycle while command is `STARTING` | Pass | Pass | Pass | Pass | Replaced by command-correlated overlay replacement gate. |
| Runtime readiness as command lifecycle truth | Pass | Pass | Pass | Pass | Runtime readiness stays internal until command execution evidence. |
| Frontend workaround/status optimism | Pass | Pass | Pass | Pass | Still rejected; backend boundary owns the correction. |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? (`Pass`/`Fail`) | Responsibility Matches The Intended Owner/Boundary? (`Pass`/`Fail`) | Responsibilities Were Re-Tightened After Shared-Structure Extraction? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `agent-run-command-coordinator.ts` | Pass | Pass | Pass | Pass | Owns the new replacement gate and removal of restore-snapshot publication. |
| `agent-run-command-status-overlay-store.ts` | Pass | Pass | Pass | Pass | Continues owning command overlay data, not correlation policy. |
| `agent-run-status-projection-service.ts` | Pass | Pass | Pass | Pass | Continues owning overlay-first projection and active-runtime fallback only after overlay clears. |
| `agent-stream-handler.ts` | Pass | Pass | Pass | Pass | Transport delegates command/status lifecycle. |
| `agent-run-service.ts` / runtime providers | Pass | Pass | Pass | Pass | Runtime readiness remains an internal lower-level fact. |
| Frontend stores/services | Pass | Pass | Pass | Pass | No lifecycle truth moves back to frontend. |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? (`Pass`/`Fail`) | Forbidden Shortcuts Are Explicit? (`Pass`/`Fail`) | Direction Is Coherent With Ownership? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Coordinator -> runtime service/active run | Pass | Pass | Pass | Pass | Coordinator may restore/activate runtime but must not expose readiness snapshot as visible lifecycle while `STARTING`. |
| Projection -> overlay/active/metadata | Pass | Pass | Pass | Pass | Projection can consult active runtime only after overlay precedence is honored. |
| Stream handler -> coordinator/projection | Pass | Pass | Pass | Pass | No direct restore/snapshot bridge in transport. |
| Frontend -> backend projection/events | Pass | Pass | Pass | Pass | Frontend does not locally patch flicker. |
| External facade -> coordinator | Pass | Pass | Pass | Pass | External sends inherit the same corrected lifecycle boundary. |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? (`Pass`/`Fail`) | Internal Owned Mechanisms Stay Internal? (`Pass`/`Fail`) | Caller Bypass Risk Is Controlled? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `AgentRunCommandCoordinator.postUserMessage` | Pass | Pass | Pass | Pass | The accepted user command remains the outer lifecycle boundary. |
| Command-correlated replacement gate | Pass | Pass | Pass | Pass | Runtime readiness and snapshots are lower-level internals until command execution evidence appears. |
| `AgentRunStatusProjectionService.getRunStatusProjection` | Pass | Pass | Pass | Pass | Read-side callers see overlay `initializing`, not active runtime `running`, while overlay is present. |
| Active `AgentRun` / provider backend | Pass | Pass | Pass | Pass | Provider status can be internally `running`; it does not own the accepted-command visible lifecycle during `STARTING`. |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? (`Pass`/`Fail`) | Responsibility Is Singular? (`Pass`/`Fail`) | Identity Shape Is Explicit? (`Pass`/`Fail`) | Generic Boundary Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- |
| `AgentRunCommandCoordinator.postUserMessage(input)` | Pass | Pass | Pass | Low | Pass |
| Command overlay replacement observer/gate | Pass | Pass | Pass | Medium | Pass |
| `AgentRunStatusProjectionService.getRunStatusProjection(runId)` | Pass | Pass | Pass | Low | Pass |
| `AgentStreamHandler.SEND_MESSAGE` | Pass | Pass | Pass | Low | Pass |
| `AgentRunService.restoreAgentRun(runId)` | Pass | Pass | Pass | Low | Pass as internal coordinator mechanic for send. |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? (`Pass`/`Fail`) | Folder Matches Owning Boundary? (`Pass`/`Fail`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-execution/services/agent-run-command-coordinator.ts` | Pass | Pass | Medium | Pass | Correct location for the command-correlated gate. |
| `autobyteus-server-ts/src/agent-execution/services/agent-run-status-projection-service.ts` | Pass | Pass | Low | Pass | Correct existing projection owner; no new generic layer needed. |
| `autobyteus-server-ts/src/services/agent-streaming/agent-stream-handler.ts` | Pass | Pass | Low | Pass | Correctly stays transport-only. |
| Test suites under `tests/unit/agent-execution` and streaming integration | Pass | Pass | Low | Pass | Correct validation locations for coordinator and websocket event sequence. |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? (`Pass`/`Fail`) | Reuse / Extension Decision Is Sound? (`Pass`/`Fail`) | New Support Piece Is Justified? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Runtime readiness observation | Pass | Pass | N/A | Pass | Reused internally, not exposed as lifecycle. |
| Command overlay | Pass | Pass | N/A | Pass | Existing overlay concept is sufficient once the premature bridge is removed. |
| Runtime live events | Pass | Pass | N/A | Pass | Reused only when command-correlated. |
| Team-member reference behavior | Pass | Pass | N/A | Pass | Design correctly uses the team path as evidence, not a new shared generic overlay. |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? (`Yes`/`No`) | Clean-Cut Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- |
| Restore-snapshot bridge | No intended retention | Pass | Pass | Remove; do not hide behind flag or alternate branch. |
| Runtime readiness visible as `running` during `STARTING` | No | Pass | Pass | Explicitly forbidden. |
| Frontend status workaround | No | Pass | Pass | Backend-owned lifecycle remains the target. |

## Migration / Refactor Safety Verdict

| Area | Sequence Is Realistic? (`Pass`/`Fail`) | Temporary Seams Are Explicit? (`Pass`/`Fail`) | Cleanup / Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- |
| Remove `clearOverlayForRuntimeOwnedStatus` bridge | Pass | Pass | Pass | Pass |
| Refine coordinator observer/gate | Pass | Pass | Pass | Pass |
| Projection overlay precedence regression | Pass | Pass | Pass | Pass |
| Unit regression for restored snapshot `running` | Pass | Pass | Pass | Pass |
| API/E2E/manual validation of `offline -> initializing -> running` | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? (`Yes`/`No`) | Example Is Present And Clear? (`Pass`/`Fail`/`N/A`) | Bad / Avoided Shape Is Explained When Helpful? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Flicker sequence | Yes | Pass | Pass | Pass | Good and forbidden sequences are explicit. |
| Restored-runtime `running` guard | Yes | Pass | Pass | Pass | UC-012/DS-010 make the path concrete. |
| Live replacement | Yes | Pass | Pass | Pass | Example says clear only on command-correlated runtime execution/terminal events. |
| Regression coverage | Yes | Pass | N/A | Pass | AC-017/AC-018 are directly testable. |

## Missing Use Cases / Open Unknowns

| Item | Why It Matters | Required Action | Status |
| --- | --- | --- | --- |
| Restored runtime reports `running` before command execution | This is the delivered standalone flicker. | None; UC-012/DS-010/REQ-024/REQ-025/AC-017/AC-018 cover it. | Closed. |
| Removal of restore-snapshot bridge | Avoids preserving the false intermediate `running` path. | None; removal is explicit and clean-cut. | Closed. |
| Command-correlated replacement owner | Prevents status truth from drifting to stream handler/frontend/provider readiness. | None; coordinator owns the gate. | Closed. |

## Review Decision

- `Pass`: the post-delivery command-correlated overlay replacement design is ready for implementation rework.

## Findings

None.

## Classification

No open `Design Impact`, `Requirement Gap`, or `Unclear` findings remain.

## Recommended Recipient

`implementation_engineer`

## Residual Risks

- Implementation must not replace the removed bridge with an equivalent indirect shortcut. In particular, `activeRun.getStatusSnapshot()`, active runtime `statusHint=ACTIVE`, websocket bind success, or metadata `lastKnownStatus=ACTIVE` must not publish visible `running` while the accepted inactive-start command is still `STARTING`.
- The implementation should not treat mere observer registration or runtime attachment as command correlation. The safe replacement evidence is command-start/local command event, `TURN_STARTED`, command-correlated `AGENT_STATUS running`, command-correlated terminal status, or explicit command failure/error after handoff.
- The regression test should include a restored runtime whose snapshot is immediately `running` before `postUserMessage`/command-correlated event, and should assert no visible `AGENT_STATUS running` is emitted until command-correlated execution evidence.
- Active existing runs should retain normal live status behavior; the suppression invariant is specifically for accepted commands that start from inactive/offline/prepared activation where command overlay is visible.

## Latest Authoritative Result

- Review Decision: Pass
- Notes: The rework is architecturally sufficient. It preserves the backend-owned lifecycle architecture while tightening the overlay replacement invariant to distinguish internal runtime readiness from user-visible command execution.
