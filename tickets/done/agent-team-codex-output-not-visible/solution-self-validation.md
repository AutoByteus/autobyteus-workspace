# Solution Self-Validation

## Status

- Solution revision: `SR-003`
- Validation date: 2026-08-17
- Result: `Pass — ready for complete architecture re-review`
- Trigger: `ARCH-REV-002`, narrowed `DR-001`
- Approval applicability: `N/A` — this validates the approved requirements and current design; it adds no business behavior.

## Validation Basis

- Approved requirements: `requirements.md`
- Production evidence and current-state read: `investigation-notes.md`
- Target design: `design-spec.md`
- Triggering review: `design-review-report.md`; `architecture-review-revision-record.md`
- Base source: `origin/codex/agent-team-universal-task-delegation@37739aa2bd718e3e1a53587c1d8604d353d334cb`
- Governing design authority: `solution-designer/design-principles.md`

## ARCH-REV-001–002 / DR-001 Closure

| Review Concern | Current Production Witness | Current SR-003 Correction | Validation |
| --- | --- | --- | --- |
| Failed local Team selection never reaches hydration | `selectTreeRunFromHistory` reuses the registered context and `focusTeamMemberAndEnsureHydrated` only focuses | the same selection owner queries the per-root service; `reopen_required` routes to `reopenTeamRunAfterStreamLoss`, while healthy selection remains local | Pass |
| Per-Agent hydration can precede conversations covered by a later snapshot base | current hydration reads Agent projections without a root sequence watermark; the structural snapshot has no conversations | require checkpoint `N/no-open-work` before and after hydration, then require candidate snapshot base `N` before registry commit | Pass |
| Failed service/context replacement was not atomic | normal open publishes context before connecting/reusing the service | recovery uses unpublished candidates and commits context/service/selection only after exact candidate readiness | Pass |
| Background reconnect could revive stale state | current active-run synchronization reconnects a not-ready service | `reopen_required` has no same-instance transition to ready; ordinary connect is inert for that phase | Pass |
| Recovery projection result contradicted the current API | SR-002 expected successful `null` and a distinct provider failure, but the field/type are non-null and server normalization produces an empty bundle | use the existing non-null `TeamMemberRunProjectionPayload`; empty content is an object with empty arrays; add no recovery result variant | Pass |

The correction uses existing facts from `RootTeamRun.hasOpenExecutionWork()` and `TeamRunEventPublisher.getCurrentChangeSequence()` plus the existing snapshot barrier and Team-member projection payload. It does not add replay, an outbox, persistence, another event sequence, a provider-failure union, or a compatibility path.

## Approved Behavior Coverage

| Behavior ID | Supported Trigger / Contract | Target Outcome | Design Spine(s) | Result |
| --- | --- | --- | --- | --- |
| BEH-001 | Classroom Simulation Team + Codex/`gpt-5.6-luna` + user send | exact Professor response renders live and restores identically | DS-001, DS-003, DS-007 | Pass |
| BEH-002 | strict snapshot/live status contracts | snapshot retains address; live status excludes it; wire sequence remains contiguous | DS-002, DS-003 | Pass |
| BEH-003 | non-next root `change_sequence` | reject without mutation; enter one visible fail-closed transition | DS-004, DS-005 | Pass |
| BEH-004 | after work finishes, select the same failed Team member | bypass local focus; rebuild and commit only across a stable checkpoint/exact snapshot base | DS-005, DS-006 | Pass |
| BEH-005 | authorized isolated live validation | real package/provider/browser proof with no secret or protected-target mutation | DS-007 | Pass |

Every behavior begins at a supported user, system, operational, or strict-contract trigger and terminates at an observable or enforceable outcome.

## Data-Flow Spine Sufficiency

| Spine | Span Check | Governing Owner | Return / Failure Check | Result |
| --- | --- | --- | --- | --- |
| DS-001 normal response | composer -> exact AgentRun/Codex -> root stream -> exact browser Agent context | root execution plus browser stream/view owners | output, status, and terminal paths included | Pass |
| DS-002 snapshot status | root status capture -> specialized snapshot projector -> strict snapshot | snapshot/projector boundary | identity/address validation included | Pass |
| DS-003 live event | AgentRun event -> root sequence -> specialized projector -> strict browser admission | publisher/event/view owners | status and content remain exact and ordered | Pass |
| DS-004 gap admission | non-next message -> compare/latch -> one recovery effect | `TeamExecutionViewState` | no stale mutation or repeated effect | Pass |
| DS-005 loss visibility/action | rejected result -> service failure phase -> persistent instruction -> actual run-tree selection | stream service, store, selection action | failed instance never becomes ready | Pass |
| DS-006 checkpointed recovery | selection -> checkpoint A -> hydration -> checkpoint B -> candidate snapshot -> atomic commit | RootTeamRun, recovery open, hydration, registry owners | every mismatch cancels candidate and retains old state | Pass |
| DS-007 realistic proof | safe setup -> real package/provider/browser -> recovery/restore assertions -> cleanup | later API/E2E owner | safety and evidence path complete | Pass |

## Recovery Checkpoint Invariant

The candidate may be committed only if all statements are true:

1. checkpoint A belongs to the requested root and has `hasOpenExecutionWork === false`;
2. Team/task/message/workspace reads and one exact non-null `TeamMemberRunProjectionPayload` per current AgentRun are admitted after A; empty history is the existing payload with empty arrays, while GraphQL/transport/identity failure before payload admission aborts;
3. checkpoint B belongs to the same root, has no open execution work, and `B.changeSequence === A.changeSequence`;
4. the candidate stream accepts the exact root and its first structural snapshot has `base_change_sequence === A.changeSequence`;
5. the candidate context and service remain unpublished until conditions 1–4 complete.

The existing publisher queues every event after the accepted snapshot barrier, so normal delivery resumes at `N+1`. A structural snapshot is never treated as conversation history.

## Recovery Scenario Matrix

| Supported Case | Expected State / Outcome | Invalid Shortcut Prevented | Result |
| --- | --- | --- | --- |
| healthy local Team selection | focus registered Agent locally | unnecessary reopen/hydration | Pass |
| failed local Team selection | route through exact recovery entry | stale focus-only path | Pass |
| checkpoint A reports open work | return stable “Team still working” instruction; publish nothing | mid-turn false recovery | Pass |
| checkpoint changes during hydration | discard candidate context; retain failed entries | mixed history/snapshot interval | Pass |
| work closes but sequence changes | same as changed checkpoint | timing guess | Pass |
| Agent projection has no content | admit the exact non-null payload with empty arrays | invented nullable/union result | Pass |
| GraphQL/transport/identity admission fails | abort candidate; retain failed entries | recovery-side empty fabrication | Pass |
| candidate transport fails | dispose candidate; retain failed entries | partial replacement | Pass |
| candidate snapshot base differs from N | reject/dispose candidate; retain failed entries | false ready state | Pass |
| checkpoint stable and snapshot base is N | commit candidate context/service/selection once | dual registry authority | Pass |
| event published after accepted barrier | queued by existing publisher and delivered as N+1 | replay/second sequence | Pass |
| background connect on failed service | remain `reopen_required` | silent resurrection | Pass |
| repeated stale event | no mutation and no second recovery effect | recovery storm | Pass |

## Ownership And Boundary Validation

| Check | Decision | Result |
| --- | --- | --- |
| one root sequence owner | `TeamRunEventPublisher` remains authoritative | Pass |
| one root checkpoint facade | `RootTeamRun.getExecutionCheckpoint()` composes its existing public open-work fact and publisher sequence | Pass |
| one browser mutation/loss owner | `TeamExecutionViewState` | Pass |
| one stream synchronization owner | `TeamStreamingService` | Pass |
| one exposed recovery routing owner | `runHistorySelectionActions` decides healthy focus versus known-loss reopen | Pass |
| one context construction owner | normal and recovery hydration reuse one private current-context builder | Pass |
| one Agent projection result owner | AgentRun/Team-member projection services plus non-null GraphQL/generated payload | Pass |
| one candidate/registry owner | `agentTeamRunStore` commits ready replacement entries atomically | Pass |
| presentation remains derived | workspace banner reads store notice but cannot change lifecycle | Pass |
| transport remains generic | `WebSocketClient` receives no Team recovery policy | Pass |
| provider boundary preserved | no Codex-specific Team recovery or projection code | Pass |

## Shared-Shape Tightness

| Shape | Exact Fields / Meaning | Explicit Exclusions | Result |
| --- | --- | --- | --- |
| private status details | status, trigger, tool name, error message/details | AgentRun ID, address, sequence | Pass |
| snapshot status | AgentRun ID, member address, details | change sequence | Pass |
| live status | change sequence, AgentRun ID, details | member address | Pass |
| execution checkpoint | root TeamRun ID, current change sequence, open-work boolean | history, conversations, replay cursor, persisted revision | Pass |
| Team-member projection payload | AgentRun ID, conversation/activities arrays, summary/timestamp, earlier-trace flag | nullable payload, recovery status, provider error union | Pass |
| recovery effect | `team_stream_recovery_required` | connection parameters or history data | Pass |
| synchronization phase | one discriminant | overlapping readiness booleans | Pass |
| recovery notice | root ID, stable code, actionable localized message | raw payload or lifecycle duplication | Pass |

## Projection Result Validation

| Boundary | Exact Current / Target Result | Recovery Interpretation | Result |
| --- | --- | --- | --- |
| `AgentRunViewProjectionService` | projection bundle; provider `null`/caught local failure becomes exact empty bundle | factual server result; no recovery status added | Pass |
| `TeamMemberRunViewProjectionService` | validates root/AgentRun placement and maps the bundle | exact AgentRun correlation | Pass |
| GraphQL/generated client | non-null `TeamMemberRunProjectionPayload` | successful empty is an object with empty arrays, never null | Pass |
| normal hydration | may catch query error and use current nullable local state | preserved existing best-effort UI policy | Pass |
| recovery hydration | consumes the non-null payload directly | GraphQL/transport/identity failure aborts candidate; no empty payload is fabricated client-side | Pass |

## Product-Reachability Gate

| Premise | Classification | Independent Trigger / Capability | Design Consequence | Result |
| --- | --- | --- | --- | --- |
| MP-001 status projection failure | Reachable | supported Team launch/send | exact status variants | Pass |
| MP-002 dead recovery effect | Reachable | same turn plus next-sequence contract | effect executes despite rejected delta | Pass |
| MP-003 persisted response restoration | Reachable | normal refresh/reopen | no migration | Pass |
| MP-004 Codex generation defect | Not Reachable for this ticket | real Codex turn completed | no provider machinery | Pass |
| MP-005 post-personal regression | Reachable historical comparison | exact base ancestry | bounded correction, no rollback | Pass |
| MP-006 background resurrection | Reachable | active-run synchronization | failed instance cannot reconnect | Pass |
| MP-007 full context hydration | Reachable | current normal Team open | reuse current builder | Pass |
| MP-008 failed local reselect | Reachable | exact run-tree selection | branch at actual selection owner | Pass |
| MP-009 active-turn interval | Reachable | gap occurs before later turn events | stable quiescent checkpoint required | Pass |
| MP-010 root sequence/open-work capability | Reachable contract capability | current RootTeamRun/publisher methods | one read-only checkpoint | Pass |
| MP-011 provider-failure result distinction | Not Reachable for this ticket | only injected unit behavior; current production contract normalizes to exact empty bundle | no recovery result machinery | Pass |
| MP-012 post-terminal recorder race | Not Reachable | synchronous recorder work inside drained microtasks | no durability barrier | Pass |

No target mechanism is driven by a hypothetical-only state.

## Persisted-Data Decision

| Question | Evidence | Decision |
| --- | --- | --- |
| Is stored meaning incorrect? | no; exact responses restored | No |
| Does the current reader understand it? | yes; normal hydration rebuilt conversations | Yes |
| Is any persistent model changed? | no; checkpoint and sync state are in-memory only | No |
| Transition outcome | current data used directly | `Directly Usable — No Migration` |

No migration, compatibility reader, dual schema, data rewrite, fallback, or replay is justified.

## Requirement / Acceptance-Criteria Mapping

| Requirement / AC Range | Design Authority | Planned Proof | Result |
| --- | --- | --- | --- |
| R-001–R-004 / AC-001–AC-006 | DS-001–DS-003 | exact projector/handler seams plus real browser trace | Covered |
| R-005–R-006 / AC-007–AC-009 | DS-004–DS-006 | gap, failed selection, checkpoint, candidate, and visibility seams | Covered |
| R-007–R-008 / AC-010–AC-011 | no-migration decision plus exact variants | restore equality and strict object-key tests | Covered |
| R-009–R-011 / AC-012–AC-015 | DS-007 | isolated real provider validation and cleanup audit | Covered |
| AC-016 | downstream coverage ownership | coverage investigation after source review | Covered |

## Removal And Forward-Only Check

| Current Item | Target Action | Alias / Fallback Allowed? | Result |
| --- | --- | --- | --- |
| `projectTeamAgentStatusDto` | remove | No | Pass |
| snapshot object spread into live status | remove | No | Pass |
| `connectedRootAccepted` / `applicationReady` | replace with one phase | No | Pass |
| `snapshot_refresh_required` / `needsSnapshotRefresh` | replace with stream-recovery names | No | Pass |
| blind reconnect after known loss | remove | No | Pass |
| local focus reuse for a failed service | replace only in failed branch | No compatibility branch | Pass |
| strict current contracts and healthy local focus | retain | N/A | Pass |

## Residual Risks And Deferrals

1. Automatic recovery without a user action remains intentionally absent. A premature reselect commits nothing and tells the user to retry after current Team work finishes.
2. Ordinary transport reconnect before a sequence gap is observed remains current behavior. Silent-outage recovery without a correlated conversation authority is outside this proven defect.
3. Codex is the required real witness; downstream coverage should re-evaluate another supported Team runtime proportionately because the corrected owners are provider-neutral.

## Final Verdict

`Pass.` SR-003 preserves every previously passed boundary, closes DR-001 through the actual exposed selection path and one stable quiescent root checkpoint, and uses the implementable non-null projection payload end to end. The new stream cannot be called ready until conversation hydration and the root snapshot barrier agree on the same sequence, and no candidate state is published before that condition succeeds.
