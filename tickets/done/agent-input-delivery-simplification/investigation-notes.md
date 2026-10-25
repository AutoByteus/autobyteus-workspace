# Investigation Notes — Agent Input Delivery Simplification

## Investigation Meta

- Package identifier: `agent-input-delivery-simplification`
- Request / ticket: Project Task `project_task_17bfe0fe-5c2b-47eb-9402-71687e7a52b8` ("Simplify agent input delivery and member activation", one ticket), delegated by `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`). Origin: `delegated-team-member-lazy-activation` (Project Task `project_task_1a47632c-fc7c-411b-83f0-5cd9f67adf5a`), code review CRR-002 / CR-FO-003.
- Workspace root: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-input-delivery-simplification`
- Repository mode: `Git`
- Task worktree / branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-input-delivery-simplification` on `codex/agent-input-delivery-simplification`
- Resolved base remote / branch / revision: `origin/personal` @ `048ea6cecb3f1999d4201be5b995157a8007d8e7` (fetched 2026-10-08). It includes merge `9d28c1b17` "Merge verified delegated-team-member-lazy-activation", so the prerequisite in the task ("start only after `delegated-team-member-lazy-activation` is merged") is satisfied.
- Finalization target remote / branch: `origin/personal`
- Bootstrap result: worktree and branch created; `pnpm install --frozen-lockfile --prefer-offline` succeeded (needed for the investigation probe).
- Bootstrap blocker: none
- Current solution revision ID: `SR-001`
- Authorities read (requirements reading gate; file and date): `.claude/skills/solution-designer/references/requirements-engineering.md` (2026-10-08); `AGENTS.md`, `autobyteus-server-ts/AGENTS.md` (2026-10-08). Architecture reading gate (`architecture-design.md`, `design-principles.md`, `DESIGN.md`) is deferred to the design phase after approval.
- Investigation status: Requirements-phase investigation complete (Q1–Q6 answered). Architecture-phase investigation to follow after approval.

## Initial Request And Clarifications

- Original request: one ticket, refactor with no product behaviour change. One `AgentRun` input entry point (reserve → optional caller step → commit/release; posting = empty step), one outcome vocabulary, one root delivery implementation, router keep/merge/remove decisions, `ConfiguredAgentExecutionHandle` lifecycle-state audit, docs that describe the real path. Investigate Q1–Q6 first; Q6 is a user decision; report any real defect to the user rather than fixing it silently.
- Clarifications received: the task text corrects the brief: `delegated-team-member-lazy-activation` keeps the `readiness_failure` event (its SR-004; the member's conversation error card) and adds one shared start-or-report-failure step in `ConfiguredAgentExecutionHandle`. Verified in code: `configured-agent-execution-handle.ts:150-169` (`startForInput`) and `:354-363` (`readiness_failure` publish).
- User-supplied facts and constraints: user approved the cleanup 2026-10-08 and wants one ticket (may be staged internally); out of scope: product behaviour changes (unless a real defect is found and the user approves), provider internals, persisted-shape changes.
- Initial ambiguity: whether posted and reserved input must behave identically for compaction recovery (Q1), whether unification changes posting timing (Q2), router liveness (Q3), real root differences (Q4), handle-state justification (Q5), held-slot vs save-first (Q6).

## Product And Domain Understanding

- Product area: server-side agent input admission (`AgentRun`), member activation (`ConfiguredAgentExecutionHandle`), and agent-to-agent messaging across the three collaboration roots (standalone Agent root, Team root, AgentOrg root).
- Affected actors or systems: human operators (chat UI), applications (application platform), agents (`send_message_to`, handoffs, `delegate_task` seeds), Skill Improvement, root lifecycle (Task closure, root shutdown).
- Existing purpose: deliver every input to the right agent exactly once in FIFO order; teammate messages are also saved to the root's message history, and "saved" and "delivered" succeed or fail together.
- Terminology: *post* = admit input and start processing now; *reserve* = hold a FIFO slot that is invisible and undispatchable until the caller commits, cancellable; *held slot* = that reservation; *root* = Team / AgentOrg / standalone Agent root owning a message history file.

## Source Log

| Date | Source Type | Exact Source / Command / Query | Why Consulted | Relevant Finding | Follow-Up |
| --- | --- | --- | --- | --- | --- |
| 2026-10-08 | Doc | `followup-cleanup-ticket-brief.md` (latest copy with §3a/Q6; copied to ticket folder, identical to `tickets/done/delegated-team-member-lazy-activation/followup-cleanup-ticket-brief.md`) | Task brief | P1–P6, Q1–Q6, proposed goals | Verified each claim below |
| 2026-10-08 | Command | `git fetch --all --prune`; `git log origin/personal` | Prerequisite and base | `9d28c1b17` merge of the prerequisite ticket is on `origin/personal` | Base pinned |
| 2026-10-08 | Code | `autobyteus-server-ts/src/agent-execution/domain/agent-run.ts:171-232` | P1 | `postUserMessage` = one `dispatchQueue` callback: fence, `reconcileRecovery()`, `admit()`, `claimAdmission`, `claimNextInput`/`startInputDispatch`, `publishInputState()`; then `authorize(retry)` outside. `reserveUserMessage` = callback: fence, lifecycle reconcile only, `reserve()`; commit/release callbacks run synchronously outside the queue and schedule a microtask drain. | Q1, Q2 |
| 2026-10-08 | Code | `agent-execution/input/agent-run-input-admission-state.ts:75-136` | P2 | `admit()` repeats the accepting/content checks of `reserve()` and then calls `reserve()`, `commitReservation()`, `releaseReservation()` | Confirmed P2 |
| 2026-10-08 | Code | `agent-execution/input/agent-run-compaction-recovery.ts:33-40` | Q1 | `claimAdmission` returns null unless block `awaiting_user`, no claim yet, `sequence > admissionCut` **and `message.senderType === SenderType.USER`** | Q1 |
| 2026-10-08 | Code | `agent-collaboration/execution/communication/root-communication-runtime-builder.ts:23`, `agent-team-execution/services/inter-agent-message-runtime-builders.ts:52`, `agent-communication/services/global-agent-run-message-runtime-builders.ts` | Q1 | Every agent-to-agent input is built with `SenderType.AGENT` | Q1 |
| 2026-10-08 | Doc | `tickets/done/compaction-response-robustness/requirements.md` REQ-014/REQ-015 | Q1 | Approved: only a `SenderType.USER` turn may authorize a failed-compaction retry; agent/system entries stay queued and never authorize | Q1 |
| 2026-10-08 | Doc | `tickets/done/context-compaction-simplification-analysis/design-spec.md:377,474,478,480,638` | Q1 | Approved server design (SR029): user admission via `postUserMessage` only; "reservation release ... must never mint a recovery claim"; "Do not add ... reservation-to-user promotion"; "Preserve reservation transaction/FIFO semantics"; grant goes to the oldest FIFO entry, "do not skip older entries to pick the authorizing user" | Q1 answered |
| 2026-10-08 | Code/Test | `tests/unit/agent-execution/agent-run-compaction-recovery.test.ts` ("does not use an agent reservation release as retry intent", "grants oldest FIFO B from fresh C") | Q1 | The difference is intended and tested | Q1 answered |
| 2026-10-08 | Code | `autobyteus-ts/src/agent/compaction/compaction-retry-turn-admission-policy.ts`, `memory/memory-manager-compaction-coordinator.ts:253-285` | Q1 | Native permit binds to the next started turn regardless of origin; the server owns the user-only admission | Q1 |
| 2026-10-08 | Code | `grep -rn "postUserMessage\|reserveUserMessage" src` | P5/Q2 | Post callers: `configured-agent-execution-handle.ts:137`, `application-execution-scope.ts:141`, `inter-agent-message-router.ts:11`, `agent-run-command-coordinator.ts:135`, `standalone-root-message-delivery.ts:96`, `skill-improvement-improver-session-service.ts:88`, `global-agent-run-message-router.ts:177`. Reserve callers: `configured-agent-execution-handle.ts:126`, `standalone-root-message-delivery.ts:159` (host) | Q2/Q3 |
| 2026-10-08 | Code | `grep -rn "\.turnId" src`; `agent-operation-result.ts`; `application-execution-scope.ts:195-198`; `agent-run-command-coordinator.ts:53-215` | Q2 | No production code reads the `turnId` hint returned by `postUserMessage`; the command registry uses lifecycle-observer facts; application maps only `accepted`/`message` | Q2 |
| 2026-10-08 | Code | `autobyteus-web/services/agentStreaming/handlers/userMessageProjection.ts:113` | Q2 | Web pending-input projection ignores entries whose `sender_type !== 'user'` | OBS-002 has no visible effect |
| 2026-10-08 | Code | `agent-team-execution/services/inter-agent-message-router.ts`; `grep InterAgentMessageRouter src tests` | Q3 | No production caller; only `tests/unit/agent-team-execution/inter-agent-message-router-claude-input-admission.test.ts` (and an architecture-test allow-list entry) | Remove (REQ-009) |
| 2026-10-08 | Code | `agent-communication/services/send-message-to-dispatcher.ts:61-69`; `global-agent-run-message-router.ts:65-218`; `skill-improvement-improver-session-service.ts:74-82` | Q3 | Live: every `send_message_to(target_agent_run_id)`. Same-root target → root `deliverExactAgentMessage` (durable). Other target → grant check + live-only `postUserMessage` + `publishEvent` (no shared history). Used e.g. by a delegated copy replying to its delegator run ID, and by Skill Improvement grants | Keep (REQ-009) |
| 2026-10-08 | Code | `standalone-root-communication-adapter.ts`, `agent-org-communication-adapter.ts` | Q4 | Line-for-line copies; differ only in envelope (`subjectKind`/`hostRunId` vs `orgRunId`), validator, store call, code prefix (`AGENT_ROOT_` vs `AGENT_ORG_`). `reserveRecipientInput`, `isOpen`, `isCurrentAgent`, `assertDeliveryAllowed` only forward to injected functions | Q4 |
| 2026-10-08 | Code | `services/team-communication/team-communication-adapter.ts`, `team-communication-message-append-plan.ts`, `team-communication-service.ts`, `agent-team-execution/services/team-run-persistence-coordinator.ts:43-130` | Q4 | Team differs: recipient input builder (`team_run_id` metadata; id hash over `rootTeamRunId` vs `rootExecutionIdentityKey`), duplicate/accepting check **inside** the root lock (standalone/Org check before taking the lock), events `COMMUNICATION` + `MEMBER_INPUT`, codes `TEAM_MESSAGE_COMMIT_CONFLICT`/`TEAM_MESSAGE_HISTORY_COMMIT_FAILED`, extra `TEAM_RUN_NOT_ACCEPTING_MESSAGES` pre-check, indeterminate write returned as an outcome (adapter throws a generic `Error`) vs thrown `RootTaskPersistenceFinalizationIndeterminateError` | Q4 |
| 2026-10-08 | Code | `standalone-root-persistence-coordinator.ts:105-160`, `agent-org-run-persistence-coordinator.ts:92-153` | Q4/OBS-003 | Same commit protocol: lock → write → not_renamed ⇒ cancel + `*_HISTORY_COMMIT_FAILED`; indeterminate ⇒ latch fail-stop; success ⇒ `commitAfterDurability` inside a finalize that turns **any throw into root persistence fail-stop** | OBS-003 |
| 2026-10-08 | Code | `standalone-root-message-delivery.ts:154-168`, `agent-org-run-message-delivery.ts:111-121`, `root-agent-execution-registry.ts:208-213`, `agent-team-execution/domain/team-run.ts:44-52`, `local/flat-team-run-backend.ts:27-35`, `local/flat-team-execution-manager.ts:144-180`, `local/flat-team-agent-execution-handle.ts:60-63`, `local/registries/task-agent-execution-registry.ts:221-237` | P4 | Teammate path confirmed (9 layers). `TeamRun` has three input methods (`reserveDirectAgentInput`, `postMessage`→`deliverToDirectAgent`, `executeDirectAgentCommand(post_message)`); registries have `reserveInput` + `postMessage` + `executeCommand(post_message)`. `TaskAgentExecutionRegistry.reserveInput` has **no caller** (`FlatTeamExecutionManager` calls `taskAgents.get(id).reserveInput` directly) | P4 |
| 2026-10-08 | Code | `agent-team-execution/backends/team-run-backend.ts`; `grep "implements TeamRunBackend"` | P4 | One production implementation (`FlatTeamRunBackend`) plus test doubles; the seam carries every Team operation, not only input | Out of scope to remove the seam (see Notes) |
| 2026-10-08 | Code | `services/agent-streaming/agent-team-stream-handler.ts:205-222` | P3 | Operator surface depends on codes: `RUN_NOT_FOUND` or `*TARGET*` ⇒ invalid-target message; others ⇒ `TEAM_SEND_MESSAGE_REJECTED` with code | Codes are a preserved contract |
| 2026-10-08 | Code | `configured-agent-execution-handle.ts` (whole), `configured-agent-activation-planner.ts`, `flat-team-agent-execution-handle.ts` | Q5 | Handle state inventory; see Q5 table | Q5 |
| 2026-10-08 | Test | `tests/unit/agent-collaboration/configured-agent-execution-handle.test.ts`, `delegated-team-lazy-member-activation.test.ts`, `root-task-reactivation.test.ts:182`, `team-root-agent-initiated-collaborators.test.ts:55`, `agent-run.test.ts:781,1083` | Q5 | Each state maps to a tested scenario (see Q5 table) | Q5 |
| 2026-10-08 | Code | `root-communication-engine.ts:39-63`; `root-task-agent-resource-scope.ts:59-70` | OBS-003 | `assertDeliveryAllowed` (= Task message scope: sender/recipient Task open, same Task) runs before reserve, after reserve, and inside the guarded `commit()`/`release()` | OBS-003 |
| 2026-10-08 | Probe | `probes/task-close-during-delivery.probe.ts` run with `pnpm exec vitest run ... --no-watch` (then moved out of `tests/`) | OBS-003 | Task closes during the history write ⇒ `deliver` rejects with `RootTaskPersistenceFinalizationIndeterminateError: Agent root 'communication_messages' is durable but local publication failed: TASK_AGENT_RESOURCE_CLOSED`; `enterPersistenceFailStop` called once; reservation cancelled, not committed; next root write rejects `StandaloneRootPersistenceFailStoppedError` | DEC-001 |
| 2026-10-08 | Code | `agent-memory/services/runtime-memory-event-accumulator.ts:60`; `app-data-migrations/.../agent-org-history-first-message-summary-classifier.ts:25` | Persisted data | Raw traces persist `sourceEvent: "AgentRun.postUserMessage"` for every forwarded input (posted or reserved) and a migration classifier reads it | Literal must stay (REQ-013) |
| 2026-10-08 | Code | `collaboration-communication-message-v1.ts`, `-schema.ts` | Q6 | Saved message record has no delivery-status field | Save-first would need a persisted-shape change |
| 2026-10-08 | Doc | `autobyteus-server-ts/docs/modules/agent_execution.md:134,398-437`, `agent_communication.md:146-167,246,381`, `agent_team_execution.md:275-276,679`, `standalone_agent_run_root.md:142`, `agent_memory.md:185`, `codex_integration.md:236` | Goal 6 | `agent_execution.md:398` calls `postUserMessage` "the sole runtime-level input-admission"; `agent_communication.md:246` says every runtime projection ends at `postUserMessage` — both false for teammate delivery | REQ-011 |

## Relevant Existing Behavior And Supported Product Paths

| Behavior ID | Kind | Supported Trigger Or Governing Contract | Current Supported Product Behavior Path / Lifecycle | Current Outcome / Invariants | Evidence | Confidence / Unknown |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | Every input to an agent | Two independently written `AgentRun` entry points (post, reserve) over one admission state | FIFO; posted input dispatches in the same serialized step; reserved input is invisible/undispatchable until commit, drained by microtask after release | `agent-run.ts:171-232` | High |
| BEH-002 | Contract | Approved compaction-recovery design (REQ-014/015; SR029) | A posted `USER` message while recovery awaits the user mints one retry claim; agent/system input (posted or reserved) never does; after authorization the oldest FIFO entry dispatches | User-only authorization; FIFO grant; reservation release never claims | Q1 rows above | High |
| BEH-003 | Contract | Results to callers | Post ⇒ `AgentOperationResult {accepted, code?, message?, turnId?, agentRunId?, displayName?}`; reserve ⇒ `{reserved, code ∈ closed union, message}` | Input-level codes are the same three (`AGENT_RUN_INPUT_INVALID`, `AGENT_RUN_NOT_ACCEPTING_INPUT`, `AGENT_RUN_ACTIVATION_FAILED`); surface/routing codes (`RUN_NOT_FOUND`, `RUN_NOT_ACTIVE`, `TARGET_*`, root commit codes) differ per surface | `agent-run-input-contract.ts:35-42`; registries | High |
| BEH-004 | User/System | `send_message_to(address or same-root run ID)`, handoffs | Engine validates → recipient input built → reserve through ~9 layers → root saves the message (one of 3 adapters) → commit → events → release | Saved and delivered together; sender gets accepted or a code | P4 rows | High |
| BEH-005 | System | `send_message_to(target_agent_run_id)` outside the sender's root; Skill Improvement grant | Global router: grant check → live-only post → inter-agent event on target run | No shared history; live targets only | Q3 rows | High |
| BEH-006 | System | First input to a not-started member; Task closure; root shutdown; concurrent first inputs; indeterminate start failure | One start-or-report-failure step (prerequisite ticket) plus the handle state listed in Q5 | DTL-001..008 outcomes | Q5 rows | High |
| BEH-007 | Operational | Docs | Docs say posting is the only admission path | Inaccurate | Doc rows | High |
| BEH-008 | System | Task DONE/CANCELLED while a teammate message is being written | Message durably saved; recipient never gets it; sender gets an indeterminate error; **whole root enters persistence fail-stop** | Defect (OBS-003) | Probe | High (reproduced in isolation with real coordinator) |

## Relevant Codebase And Technical Facts

### Q1 — Must posting-only compaction-recovery steps apply to reserved input?

**Answer: No. The difference is intended, approved and tested. No defect.**

- `claimAdmission` mints a claim only for `SenderType.USER`. Every reserved input today is agent-origin (`SenderType.AGENT`). Even if reserved input ran `claimAdmission`, it would return `null`.
- The approved server design (`context-compaction-simplification-analysis` SR029) explicitly forbids a reservation release from minting a claim. It also forbids reservation-to-user promotion, and requires FIFO grant semantics: a user "continue" authorizes, and the oldest queued entry runs next even if it is agent-origin.
- `observeRecovery` (the held projection) is already reapplied for all entries on every canonical event and at every `claimNextInput`. Reserved entries reach the same held/resumed projection once they are forwarded. Reserve skips only the reconcile *before* allocating the sequence. That reconcile only moves `admissionCut`, which matters solely for `USER` claims.
- A teammate message to an agent blocked in recovery is therefore correctly queued and does not unblock it. That is the approved REQ-015 behaviour, not a bug.
- **Design constraint carried forward:** the unified entry point must mint recovery claims only for immediately committed `USER` input inside the same serialized step, never on a held-slot commit/release.

### Q2 — Is the timing change acceptable for every post caller?

**Answer: no timing change is needed.**

- The brief's caveat (posted input would reach dispatch through the post-commit drain) applies only if the empty-step case also commits outside the serialized step.
- The admission state already proves the alternative: `admit()` does reserve + commit + release synchronously. The unified entry point can do the same for input with no caller step, inside the one serialized `dispatchQueue` step, exactly as posting does today. Only input with a caller step (the history save) commits later.
- This keeps today's timing for UI, application, Skill Improvement, delegated seed and the global router.
- Two incidental items:
  - **OBS-001:** `postUserMessage` returns a claim-time `turnId` hint (an append's target turn). No production code reads it (it is documented as non-authoritative, `agent_execution.md:437`). One unit assertion uses it (`agent-run.test.ts:182`). The unified outcome may drop it; product-invisible.
  - **OBS-002:** reserved input does not publish an `AGENT_INPUT_STATE` snapshot at commit; posted input does at admission. All reserved input is agent-origin, and the web projection ignores non-user pending entries (`userMessageProjection.ts:113`), so unifying this is product-invisible.

### Q3 — Which agent-message routers are live?

| Router | Production callers | Product surface | Overlap with root communication | Decision proposal |
| --- | --- | --- | --- | --- |
| `RootCommunicationEngine` (+3 adapters) | Team/Org/standalone `deliverToAddress`, `deliverToRunId` | `send_message_to(recipient_address)`, handoffs, same-root `send_message_to(target_agent_run_id)` | — | Keep, unify (REQ-007) |
| `GlobalAgentRunMessageRouter` | `SendMessageToDispatcher` for every `target_agent_run_id` | Run-ID messaging: same-root → delegates to the root (durable); other roots/standalone runs → live-only direct post + inter-agent event; Skill Improvement grants | None (same-root already delegates to the root) | Keep with stated purpose; post through the one entry point (REQ-009) |
| `InterAgentMessageRouter` (`agent-team-execution/services`) | **None** (one unit test only) | None | Obsolete earlier Team path | Remove (REQ-009); move any still-valuable assertion (Claude active-turn append for agent input) onto the real path |

### Q4 — What really differs between the roots?

| Aspect | Standalone root | AgentOrg root | Team root | Classification |
| --- | --- | --- | --- | --- |
| Engine validation, record build, guarded reservation | shared engine | shared engine | shared engine (+ `TEAM_RUN_NOT_ACCEPTING_MESSAGES` pre-check in `TeamCommunicationService`) | Shared; Team pre-check overlaps the engine's own closed-root check (codes differ) |
| `isOpen`/`isCurrentAgent`/`assertDeliveryAllowed`/`reserveRecipientInput` | forwarders to injected functions | forwarders | forwarders (+ team lookup) | Pass-through (P4) |
| Recipient input builder | generic (`root_subject_kind`, `root_run_id`, id hash over `rootExecutionIdentityKey`) | generic | Team builder (`team_run_id`, id hash over `rootTeamRunId`) | **Real difference** (persisted `message_id`/`dedupe_key` in raw traces): keep as a per-root strategy |
| History envelope + validator + file | `{subjectKind:"agent", hostRunId}` | `{subjectKind:"agent_org", orgRunId}` | `{schemaVersion, rootTeamRunId}` | **Real difference** (persisted shapes): keep as per-root data/port |
| Duplicate/open check | before root lock | before root lock | inside root lock | Copy drift; inside-lock is the stricter form |
| Commit protocol | lock → write → cancel / latch / finalize | same | same via append plan | Copy (three implementations of one protocol) |
| Committed-message consequences | `publish(message)` + present (host: inter-agent event on host stream; child: member presentation) | `publish(message)` + member presentation | Team events `COMMUNICATION` + `MEMBER_INPUT` | **Real difference** (event contracts): keep as per-root strategy |
| Codes | `AGENT_ROOT_MESSAGE_COMMIT_CONFLICT`, `AGENT_ROOT_MESSAGE_HISTORY_COMMIT_FAILED` | `AGENT_ORG_…` | `TEAM_MESSAGE_…` | **Real difference** (observable): keep as per-root data |
| Indeterminate write | thrown finalization error | thrown finalization error | outcome ⇒ adapter throws generic `Error` | Copy drift |
| Recipient routing | host via host handle; child via root registry or Team | root registry or Team | `requireContainingTeamRun` → `TeamRun.reserveDirectAgentInput` | Same routing concept; layers 4–7 are forwarding |

### Q5 — Which supported scenario justifies each handle state and fence?

| Mechanism | Owner | Supported scenario that needs it | Evidence | Proposal |
| --- | --- | --- | --- | --- |
| `readinessAttempt` | Configured handle | Two inputs reach a not-started member concurrently ⇒ one start, shared | `team-root-agent-initiated-collaborators.test.ts:55`, `root-task-reactivation.test.ts:182` | Keep |
| `retrySafe` + `cleanupConfirmed` | Configured handle | A failed start that left nothing behind may be retried by the next input; an indeterminate one (binding durable but publication failed, cleanup unconfirmed, quarantine) stays failed so no second provider conversation is created | handle tests "marks publication failure after durability indeterminate…", "retains cleanup quarantine as nonretryable…" | Keep (one retry-safety decision) |
| `activationOperation` | Configured handle | Task closure or root shutdown during a member start releases the unpublished candidate | `releaseRuntime`, root-task lifecycle tests | Keep |
| `configurationPreparing` | Configured handle | Release requested while the config/workspace is being prepared ⇒ `RUNTIME_RELEASE_PENDING` so release is retried, never assumed | `releaseRuntime` | Keep; candidate to merge with `activationOperation` into one start-phase state |
| `rootShutdownFenced` (handle) | Configured handle | Root stop / app quit never re-activates a member | handle test "accepts the root-shutdown fence for a stale run and never re-activates it afterwards" | Keep |
| `rootShutdownFenced` + `construction` (flat wrapper) | `FlatTeamAgentExecutionHandle` | Same scenario, while the member context is still being built asynchronously | wrapper | Keep (corrected 2026-10-09). The original "Merge: one fence owner" proposal was imprecise. The two fences guard **different phases**. The wrapper fences the asynchronous member-context build, when no `ConfiguredAgentExecutionHandle` exists yet. The configured handle cannot exist before that build, because its constructor requires `memberExecutionContext` and checks identity against it. The configured handle fences activation. `createHandle()` re-checks the wrapper fence after `buildMemberExecutionContext` (`flat-team-agent-execution-handle.ts:114-125`), and `fenceForRootShutdown` awaits the construction and then forwards (`:69-71`). A single owner would need the configured handle to build its context lazily, which is a larger restructuring for no defect. |
| `runtimeReleased` | Configured handle | Task DONE/CANCELLED released the copy; repeated release is idempotent and input stays closed until reactivation builds a fresh handle | `root-task-reactivation.test.ts` | Keep; candidate to merge with the shutdown fence into one closed state |
| `quarantined` / indeterminate errors | Activation registry/planner | Unconfirmed cleanup must not be retried | planner `isRetrySafe` | Keep |
| `assertInputAllowed` (root option) | Root → handle | Task closure closes input to that copy | `root-task-agent-resource-scope.ts:59-61` | Keep |
| `executionAdmissionFence` | `AgentRun` | After force release, no queued input/tool approval reaches the provider | `agent-run.ts:130-137,289,329` | Keep |
| `assertDeliveryAllowed` ×3 | Engine | Task scope (open, same Task) at entry and across the reserve await. The commit/release re-check is the OBS-003 defect site | probe | Keep entry + post-await checks; commit-time behaviour per DEC-001 |

## Structural And Payload Surface Inventory

### Payload Or Content Surfaces

- Files: standalone `collaboration` messages file (`StandaloneRootMessagesFileV1`), Org communication messages file (`AgentOrgCommunicationMessagesFileV1`), Team communication messages file (`TeamCommunicationMessagesSnapshot` v1); raw traces with `sourceEvent: "AgentRun.postUserMessage"`, `message_id`, `dedupe_key`.
- Readers/writers: root persistence coordinators and stores; memory recorder; history projections; migration classifier.
- Evidence paths: as in the Source Log.

### Structural Surfaces

- `AgentRun` input API; `AgentRunInputAdmissionState`; `ConfiguredAgentExecutionHandle`; `FlatTeamAgentExecutionHandle`; registries (`RootAgentExecutionRegistry`, `TaskAgentExecutionRegistry`); `FlatTeamExecutionManager`; `TeamRun`/`TeamRunBackend`; `RootCommunicationEngine` + 3 adapters; root delivery services; persistence coordinators; global router; dispatcher.

### Potential Structural Impacts To Investigate

- API or external-contract change: internal only. Tool contracts (`send_message_to`, `delegate_task`), websocket/GraphQL and application contracts unchanged.
- Persistence schema or invariant change: none intended.
- Security or privacy boundary change: none. The grant registry is unchanged.
- Concurrency or lifecycle change: yes, internal (admission serialization, commit protocol, handle state). Must preserve all scenarios above.
- Deployment/migration/ownership/refactor: structural refactor across `agent-execution`, `agent-collaboration`, `agent-team-execution`, `agent-org-execution`, `standalone-agent-run-root`, `services/team-communication`, `agent-communication`.

## Runtime, Probe, Or Reproduction Findings

| Method / Command | Scenario | Observation | Requirement Implication | Artifact / Evidence Path |
| --- | --- | --- | --- | --- |
| Vitest probe with the real `RootCommunicationEngine`, `StandaloneRootCommunicationAdapter` and `StandaloneRootPersistenceCoordinator`; store write held open; Task scope closed during the write | SCN-014 | `deliver` rejected `RootTaskPersistenceFinalizationIndeterminateError … TASK_AGENT_RESOURCE_CLOSED`; fail-stop entered once; reservation cancelled; next root write rejected `StandaloneRootPersistenceFailStoppedError` | Real defect; user decision DEC-001 | `probes/task-close-during-delivery.probe.ts` |

Same code shape in Org (`agent-org-run-persistence-coordinator.ts:139-153`) and Team (`team-run-persistence-coordinator.ts:151-165`, append plan calls the guarded `reservation.commit()` inside `commitAfterDurability`). By code reading, all three roots behave the same way. The `AgentRun` fence (`commitEntry` asserts `executionAdmissionFence`) and the handle input fence can also throw at that point after a Task force release.

## Stakeholder And User Evidence

| Source / Actor | Need, Problem, Or Constraint | Evidence Strength | Requirement Implication | Open Question |
| --- | --- | --- | --- | --- |
| User, 2026-10-08 | Cleanup needed; one ticket; direction = one input entry point | Explicit | REQ-001..REQ-011 | Q6 decision |
| Code reviewer (brief) | Duplication hid the real path and caused DTL-003 | Strong | Goals 1–6 | — |

## External Contracts, Standards, And Dependencies

| Contract / Dependency | Version / Authority | Relevant Behavior Or Constraint | Evidence | Unknown / Risk |
| --- | --- | --- | --- | --- |
| Compaction recovery REQ-014/015; SR029 server design | Approved tickets | User-only authorization; reservation never claims; FIFO grant | Q1 rows | None |
| `send_message_to` / `delegate_task` tool results | Current contract | Codes and messages unchanged | dispatcher, roots | None |
| Team websocket SEND_MESSAGE | Current contract | Code-based invalid-target mapping | `agent-team-stream-handler.ts:213-222` | None |

## Persisted Data And State Facts

- Affected stored subjects: none intended. Three message-history files, raw traces.
- Current readers/writers: root stores/coordinators; memory recorder; migrations.
- Must be preserved: file shapes, `message_id`/`dedupe_key` derivation per root, `sourceEvent` literal.
- Acceptable loss: none.
- Remaining evidence gap: none for requirements.

## Product Design Request Context

- Product Design request in the current input: `Not stated` (backend refactor; no UI).

## Product Design Findings

- N/A — not applicable.

## Supplemental Artifact Inventory

| Artifact Path | Owner | Purpose | Scope | Related Requirement / AC IDs | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- | --- | --- |
| `followup-cleanup-ticket-brief.md` | code_reviewer (copied) | Origin brief with file/line evidence | P1–P6, Q1–Q6 | All | Input evidence | Not behaviour-defining; no approval |
| `probes/task-close-during-delivery.probe.ts` | solution_designer | Reproduction of OBS-003 | SCN-014 | REQ-012, AC-012 | Evidence (disposable, not in `tests/`) | Evidence; approval N/A |

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Why It Matters | Resolution / Owner | Status |
| --- | --- | --- | --- | --- | --- |
| RSK-001 | Risk | Breadth: every input path (UI, app, seed, teammate, run-ID, Skill Improvement) | Regression risk | Full suites + targeted tests; independent review | Open (design) |
| RSK-002 | Risk | Admission serialization subtleties (recovery claim, FIFO, held projection) | Q1/Q2 behaviour must be kept bit-for-bit | REQ-002/REQ-003 constraints; existing recovery suites | Open (design) |
| UNK-001 | Unknown | Whether `TeamRunBackend` seam should stay | Brief asks to remove pure forwarding hops | Scoped: input methods collapse to one per layer; seam itself stays (carries all Team operations) | Proposed |

## Architecture Investigation Findings

Recorded 2026-10-08, after SR-003 approval. Authorities read for this phase: `references/architecture-design.md`, `design-principles.md`, repository `DESIGN.md`.

| Source | Observation | Design implication |
| --- | --- | --- |
| `standalone-agent-run-root.ts:177-188`, `agent-org-run.ts:151-162` | Both roots build their adapter from the same eight injected functions. The adapter classes add only forwarders plus the copied `commitAppend`. | Delete both adapter classes. Each root supplies a plain port object. |
| `root-team-run.ts:144-153`, `team-communication-service.ts`, `team-communication-adapter.ts`, `team-communication-message-append-plan.ts` | The Team root wraps the shared engine in a service (pre-check `TEAM_RUN_NOT_ACCEPTING_MESSAGES`, envelope snapshot, own `accepting` flag), an adapter and a one-shot append plan. The plan already holds the stricter "check under the history lock" protocol. | Generalize the append plan into the engine. Delete the Team service, adapter and plan file. The Team `notAccepting` code becomes port data. |
| `standalone-root-persistence-coordinator.ts:105-120`, `agent-org-run-persistence-coordinator.ts:92-110`, `team-run-persistence-coordinator.ts:43-130` | Three message-commit methods with one protocol and two result styles (thrown vs returned indeterminate). | One `commitMessageAppend(append)` contract on each coordinator (each keeps its own lock, file, envelope and fail-stop latch). |
| `standalone-agent-run-root.ts:425-431`, `agent-org-run.ts:398-404`, `root-team-run.ts:387-398` | Persistence fail-stop closes admission **and terminates the whole root** (`queueMicrotask(() => terminate())`). | OBS-003 consequence is root teardown, not only refused writes. Strengthens REQ-012. |
| `root-team-run.ts:115,233,487-489`; `agent-org-run.ts:67,83,159,185`; `standalone-agent-run-root.ts:78,112,185,212`; `standalone-root-builder.ts:103`; `agent-org-run-manager.ts:138`; `team-communication-projection-service.ts:56` | Each root keeps its own `messages` envelope, updated by a `replaceMessages` callback after every commit, alongside the engine's own `current` list (two owners of one list). Readers: package snapshot, tree-commit package creation, projection. | The engine owns the list. Roots build their envelope from `engine.getMessages()`; the `replaceMessages` callbacks are removed. |
| `agent-collaboration/execution/task/root-task-agent-resource-scope.ts:134`; `task-delegation-command.ts:31` | A closed Task scope throws `TaskDelegationError("TASK_AGENT_RESOURCE_CLOSED")`. It is not a `CollaborationContractError`, so `SendMessageToDispatcher` rethrows it and the sender's tool call fails with that error. This is today's outcome for a Task closing just before the save. | REQ-012 target: a closure discovered after the durable write produces the same thrown `TaskDelegationError` as a closure just before it, without fail-stop. |
| `agent-run-input-reservation.ts:18-39`; `agent-run.ts:224-226`; `agent-run-input-admission-state.ts:138-158,342-355,399-415` | `reservation.commit()` throws when the AgentRun fence closed (Task force release), the entry was dropped (root shutdown fence), or the runtime failed (`observeRuntimeFailure`). All mean "recipient no longer accepts input". `cancel()` throws when the entry is already gone. | Post-durability reservation-commit failure = recipient-closed rejection (`AGENT_RUN_NOT_ACCEPTING_INPUT`), not fail-stop. Cancel failures after that are ignored. |
| `root-communication-engine.ts:61` | Release re-checks `assertDeliveryAllowed`. No await separates commit from release, so the check can only flip inside synchronous publication. | Drop the release-time re-check; commit-time check remains. |
| `agent-team-execution/local/registries/task-agent-execution-registry.ts:221-225`; `flat-team-execution-manager.ts:144-151` | `TaskAgentExecutionRegistry.reserveInput` unused (manager calls the handle directly). | Remove. |
| `team-run.ts`, `flat-team-run-backend.ts`, `flat-team-execution-manager.ts`, `flat-team-agent-execution-handle.ts`, `root-agent-execution-registry.ts` | The remaining recipient-routing hops each own something: the Team facade/backend seam (all Team operations), task-agent vs direct-handle lookup, lazy handle construction, root registry lookup. | Keep. They are not forwarding-only for the concern they own. |
| `tests/unit/agent-team-execution/inter-agent-message-router-claude-input-admission.test.ts`; `tests/architecture/agent-provider-composition-boundaries.test.ts:85` | The only users of `InterAgentMessageRouter`. The test proves Claude active-turn append for agent input via `postUserMessage`. | Re-target that assertion to the real teammate path (`reserveUserMessage` → commit → release); update the allow-list. |
| `tests/unit/services/team-communication/team-communication-service.test.ts`, `team-communication-message-append-plan-current.test.ts`; root suites listed in the grep | Tests bound to deleted Team classes. | Move their assertions to engine-level tests that run all three root ports. |

## Requirement Implications

- Q1/Q2 show that one entry point is achievable with **zero product-visible change**. No-step input keeps today's serialized admission+dispatch and recovery claim. Held-slot input keeps today's reservation semantics.
- Q4 separates the real per-root differences (envelope/file, recipient builder, events, codes) from copy (commit protocol, forwarders).
- The P6 audit justifies every mechanism; only duplicates are merged.
- One real defect (OBS-003) needs a user decision (DEC-001).
- Q6 is a product decision (DEC-002). Evidence favours keeping the held slot: save-first would need a new persisted delivery-status field (out of scope), would change what history shows, and contradicts the approved reservation/FIFO semantics.

## Notes For Architecture Design

- Map SCN-001..SCN-015 and BEH-001..BEH-008 to target paths.
- Keep `sourceEvent: "AgentRun.postUserMessage"` literal even if the method is renamed.
- Recovery claim only on immediately committed `USER` input inside the serialized step.
- Commit protocol: Team's inside-lock duplicate/open check is the stricter form to adopt for all roots.
- `TaskAgentExecutionRegistry.reserveInput` is dead; `InterAgentMessageRouter` is dead.
- Not in scope: root address resolution (`deliverToAddress` resolvers: host handling, catalog bring-in, Task scope). Only the path from a resolved recipient onward is unified.

## Re-bootstrap and problem recheck on the latest base (2026-10-09)

- At the user's direction, the ticket was re-bootstrapped from the latest `origin/personal`:
  - `git fetch origin --prune` → `46e94fdea`;
  - new worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-input-delivery-simplification`;
  - new branch `codex/agent-input-delivery-simplification-v2`.
- The handed-over commit `3e78b455e` is on no remote branch, so none of its work is on `origin/personal`. The old branch `codex/agent-input-delivery-simplification` is kept locally as a reference only.
- Each problem was rechecked against `46e94fdea`:

| Problem | Check | Result on `46e94fdea` |
| --- | --- | --- |
| P5 dead code | `ls src/agent-team-execution/services/inter-agent-message-router.ts`; importers grep excluding itself; `task-agent-execution-registry.ts:221` | **Still present**: router file exists with no importer; the registry `reserveInput` is still uncalled |
| P4 duplicated delivery | `standalone-root-communication-adapter.ts` (81 lines) vs `agent-org-communication-adapter.ts` (78 lines): 33 differing lines after the name normalization; `services/team-communication/` still has its own service, adapter and append plan | **Still present** |
| P2 duplicate validation | `agent-run-input-admission-state.ts:75-125` | **Still present**: `admit()` repeats both of `reserve()`'s checks |
| OBS-003 (Task closure during a history write fail-stops the root) | `git diff 048ea6cec origin/personal` on the engine, both adapters, the standalone persistence coordinator, the Team append plan/adapter and the admission state | **Still present**. All are unchanged since the probe base. The only change is the rename `root-task-agent-resource-scope.ts` → `root-task-execution-resource-scope.ts` (`c395e24a5`), with the same `closed()` code at line 134. The engine still runs `assertDeliveryAllowed` inside `commit`/`release` after the durable write (`root-communication-engine.ts:61`). The probe was not re-run; this is a code-path equivalence finding. |
| Docs | `docs/modules/agent_execution.md:398` | **Still present**: it claims `postUserMessage` is "the sole runtime-level input-admission" path |

- Conclusion: every in-scope problem from the approved SR-003 still exists on the latest base, so the ticket remains valid. The dropped items (SR-002/SR-003 "Not Pursued") remain dropped; the code reviewer withdrew §3a on 2026-10-09.

## Second recheck on the latest base (2026-10-24)

- User direction: "make sure your work tree is based on the latest version, and check again whether this ticket is really necessary or not".
- `git fetch origin --prune` → `origin/personal@8b34e8ae10`. New worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-input-delivery-simplification-v3` on branch `codex/agent-input-delivery-simplification-v3`, created from it.
- State of the earlier candidate:
  - `codex/agent-input-delivery-simplification-v2` @ `08a70d783f` passed every gate (ARCH-REV-001/002, CRR-002/004, API-REV-002) and waited for user verification after DR-002 (2026-10-11, base `359d2c0ef`).
  - It was never merged and is on no remote branch. It is now 1591 commits behind.
  - `git merge-tree origin/personal …-v2`: **26 conflicting paths**, including every core file (engine, port/adapter, all three roots, all three persistence coordinators, Team delivery, the Team service/adapter/plan as modify/delete) and their tests.
- Base changes in exactly this area since bootstrap (`git log 46e94fdea..origin/personal` on the communication paths):
  - `725fe7ed20` / `f6bf477c3f`: append-only message logs (JSON Lines) for every run family. Coordinators now call `store.appendMessage(…, logOwners)` instead of rewriting a whole history file.
  - `6bcb206e4e`: a task agent is a normal run with its own memory folder.
  - `4c07f5b268`, `6076a3aadf`, `744641b35c`, `31d46978ad` (autobyteus-191): remote collaboration. The engine gained `reserveAndCommit`, remote sends and refusals; both adapters gained `commitSentToRemote`.
  - `290d32dd4b`, `6a3f6628b1`, `71db6bbdd8`, `5c94518446`: agent-facing refusals and texts.

| Problem | Latest base `8b34e8ae10` |
| --- | --- |
| P5 dead code | **Still present**: `inter-agent-message-router.ts` exists; `task-agent-execution-registry.ts:227` `reserveInput` is still uncalled (by-type check repeated) |
| P4 duplicated delivery | **Still present, and grown**: standalone/Org adapters are 102 lines each with 41 differing lines after the name normalization; each now has two commit paths (`commitSentToRemote` + `commitAppend`); the Team service/adapter/plan still exist |
| P2 `admit()` duplicate validation | **Still present** (`agent-run-input-admission-state.ts:75-110`) |
| OBS-003 Task closure during a teammate save fail-stops the root | **Still present by code path**: `root-communication-engine.ts:198` re-checks scope in `commit`/`release`; `standalone-root-persistence-coordinator.ts` runs `commitAfterDurability` inside `finalize()`, which fail-stops on any throw (`:166-178`). Probe not re-run. |
| Docs | Not rechecked line by line; the v2 doc fixes were never merged |

- Conclusion:
  - The problems are still real, and the duplication has grown with remote collaboration.
  - The v2 candidate cannot be merged as is. It was designed against whole-file history writes, which no longer exist, and an engine that has since been extended.
  - Its intent (REQ-007..REQ-014) and test contract are reusable, but its design and code are not.

## Complete re-investigation on `origin/personal@8b34e8ae10` (2026-10-24)

- User direction: "do a complete re-investigation".
- Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-input-delivery-simplification-v3`, branch `codex/agent-input-delivery-simplification-v3`, dependencies installed (`pnpm install --frozen-lockfile --prefer-offline`).
- Paths below are under `autobyteus-server-ts/src/`.

### RI-1. The current teammate-delivery path (by code)

Same root, `send_message_to` / handoff:

`<root> message delivery` (`standalone-root-message-delivery.ts:290`, `agent-org-run-message-delivery.ts:110,129`, `team-run-message-delivery.ts:113,129`; Team goes through `TeamCommunicationService.deliver`)
→ `RootCommunicationEngine.deliver`
→ `reserveAndCommit`
→ `adapter.reserveRecipientInput`
→ `adapter.commitAppend`
→ coordinator `commitCommunication` / `commitReservedMessageAppend`
→ `store.appendMessage` (append-only JSON-Lines logs per owner: the coordinating log and task-agent logs)
→ `commitAfterDurability`, inside the coordinator's `finalize*`. That step:
  1. updates the list;
  2. runs the guarded reservation commit, which re-checks Task scope;
  3. publishes and presents;
  4. releases.

New since bootstrap (autobyteus-191, remote collaboration):

- `prepareRemoteSend` → `RemoteRunLinks.deliver` → `commitSentToRemote` (sender's log only), through `remote-message-send.ts`.
- `acceptFromRemote` → `reserveAndCommit` (receiver's log only; not published to the root view).
- `assignToExistingCopy` (`1e5d757a9`) delivers work through the same root delivery and engine.

### RI-2. Duplication (P4), current state

| Item | Evidence | Status |
| --- | --- | --- |
| Standalone vs Org adapter | 102 lines each. A name-normalized diff shows only names, file envelope (`subjectKind`/`hostRunId` vs `orgRunId`) and conflict codes (`AGENT_ROOT_…` vs `AGENT_ORG_…`) | Line-for-line copies |
| Two commit paths inside each adapter | `commitSentToRemote` and `commitAppend` each repeat the open/duplicate check and the envelope build | Duplication grew with remote collaboration |
| Team | `TeamCommunicationService` (57 lines) and `TeamCommunicationAdapter` (124 lines) mostly forward. The service keeps its own `accepting` flag although the engine already has `closeAdmission` + `adapter.isOpen()`; the only extra is the `TEAM_RUN_NOT_ACCEPTING_MESSAGES` code. `team-communication-message-append-plan.ts` (112 lines) is a third copy of the protocol. | Still present |
| Drifted protocol | Team checks open/duplicate **inside** the root lock (plan `prepareAgainstCurrent`); standalone/Org check **before** `commitCommunication` takes the lock (`standalone-root-communication-adapter.ts:70-72`) | Still drifted |
| **New: dead `nextMessages`** | Each adapter builds a whole-history `nextMessages` envelope per message (standalone `:74-79`, Org the same, Team plan `nextMessages`). No coordinator reads it any more: `grep nextMessages` finds only the input type declarations (`standalone-root-persistence-coordinator.ts:110`, `agent-org-run-persistence-coordinator.ts:95`, `team-run-persistence-contract.ts:56`). Leftover from the move to append-only logs (`f6bf477c3f`). | New finding |

### RI-3. Dead code (P5)

- `agent-team-execution/services/inter-agent-message-router.ts`: no production importer. Only its own unit test (`tests/unit/agent-team-execution/inter-agent-message-router-claude-input-admission.test.ts`) and an architecture-test allow-list entry reference it.
- `TaskAgentExecutionRegistry.reserveInput(agentRunId, …)` (`task-agent-execution-registry.ts:227`): no caller. `flat-team-execution-manager.ts:114` calls `taskAgents.get(id)` (returns `FlatTeamAgentExecutionHandle`), then the handle's own `reserveInput(message, options)`.

### RI-4. `admit()` duplicate validation (P2)

`agent-execution/input/agent-run-input-admission-state.ts:75-110`: `admit()` repeats both of `reserve()`'s checks before calling it. Still present.

### RI-5. OBS-003: Task closure during a teammate save terminates the root, **reproduced on `8b34e8ae10`**

- Probe: `autobyteus-server-ts/tests/probes/task-close-during-delivery-v3.probe.test.ts`. It is disposable and untracked, and uses the real `StandaloneRootPersistenceCoordinator`, `StandaloneRootCommunicationAdapter` and `RootCommunicationEngine`. The Task is closed while the append is in flight.
- Command: `pnpm exec vitest run tests/probes/task-close-during-delivery-v3.probe.test.ts --no-watch`. Result `/tmp/probe-v3-result.json`:
  - sender: rejected with `RootTaskPersistenceFinalizationIndeterminateError: Agent root 'communication_messages' is durable but local publication failed: The Task work for this agent run is closed…`;
  - `failStopEntered: 1`; `reservationCommitted: 0`; `cancelled: 1`;
  - next root write refused: `StandaloneRootPersistenceFailStoppedError`;
  - `engineMessages: 1` (the message is in the list and in the log, but was never delivered).
- Consequence: fail-stop schedules `terminate()` of the whole root in all three roots (`standalone-agent-run-root.ts:506-513`, `root-team-run.ts:411-418`, `agent-org-run.ts:451`).
- Team and Org reach the same `finalize*` with the same guarded commit (`team-communication-message-append-plan.ts` post-durability commit; `agent-org-run-persistence-coordinator.ts:113`). This is code-path equivalence; only the standalone root was run.
- **Changed contract to align with:** a Task closure found *before* the save is now an ordinary refusal `{accepted:false, code:"TASK_AGENT_RESOURCE_CLOSED"}` (`root-communication-engine.ts` `refuseOutsideTaskScope`, autobyteus SR-003 T-4). It is no longer a thrown `TaskDelegationError`, so the old REQ-012 wording ("thrown") is out of date.

### RI-6. Items that remain correctly not pursued (re-verified)

- **Two `AgentRun` entry points:** both still exist; recovery claiming is only on `postUserMessage` (`agent-run.ts:185-218`, `claimAdmission:201`). The Q1 basis is unchanged.
- **Result shapes, handle states, save-first history:** no new evidence; the user's SR-002/SR-003 decisions stand.

### RI-7. Docs

`docs/modules/agent_execution.md:401` still says `postUserMessage` is "the sole runtime-level input-admission". The v2 doc fixes were never merged.

### RI-8. Reusable from the unmerged v2 candidate (`08a70d783f`)

- Reusable as evidence and test ideas:
  - per-root baseline-contract approach (`ff25511f6`);
  - TDR race E2E design (`teammate-delivery-task-closure-race.e2e.test.ts`);
  - the `dropSlot()` lesson from CR-001 (`10b843f47`).
- Not reusable: its design and code, which target whole-file history writes and the pre-remote engine (26 merge conflicts).

### Conclusion

- The ticket is still necessary:
  - the duplication has grown;
  - dead code remains, including new dead data;
  - the root-termination defect is reproduced on the latest base.
- Requirements changes needed (user approval):
  - REQ-012 outcome must match today's before-save refusal;
  - REQ-013 must name the append-only logs;
  - scope must include the remote delivery paths and the dead `nextMessages`;
  - the Team service's duplicate `accepting` flag.

## Third check on `origin/personal@0216c6fb14` (2026-10-24)

- User direction: base the investigation on the latest code again.
- The v3 branch was fast-forwarded to `0216c6fb14` (79 commits after `8b34e8ae10`) and dependencies were reinstalled.
- Authorities: updated skill re-read (SKILL.md, `references/finding-the-cause.md`, `references/ticket-scope.md`).

What changed in the base:
- `git log 8b34e8ae10..0216c6fb14` on the engine, the three adapters, the Team service/adapter/plan, the three coordinators, `run-history/store` and `agent-execution/input`: **no commits**.
- Server source changes elsewhere: memory-sync, peer/node vocabulary, agent discovery tools, remote-access policy, `remote-refusal-codes.ts`, `remote-run-channel.ts`. None of them is on the teammate-delivery path.
- Merged tickets: `design-cases`, `nfs-guide-install-commands`, `node-vocabulary`, `test-and-tooling-hygiene`.

Each finding again, with how it was established:

| ID | Finding | How established | Result on `0216c6fb14` |
| --- | --- | --- | --- |
| RI-2 | Standalone/Org adapters are copies; two commit paths each; Team service/adapter/plan; drifted lock-time check | Read | Unchanged |
| RI-2 | Dead `nextMessages` (declared at `standalone-root-persistence-coordinator.ts:110`, `agent-org-run-persistence-coordinator.ts:95`, `team-run-persistence-contract.ts:56`; never read) | Read (grep plus coordinator bodies) | Unchanged |
| RI-3 | `InterAgentMessageRouter` has no `src` importer; `TaskAgentExecutionRegistry.reserveInput` (`:227`) has no caller | Read (import grep and type of `taskAgents.get`) | Unchanged |
| RI-4 | `admit()` repeats `reserve()`'s two checks | Read | Unchanged |
| RI-5 | Task closure during a teammate append fail-stops the root | **Reproduced** on the standalone root with real engine, adapter and coordinator. Team and Org are **Read** (same `finalize*` and guarded commit). | Unchanged; same result as on `8b34e8ae10` |
| RI-7 | `agent_execution.md:401` claims `postUserMessage` is the sole admission path | Read | Unchanged |

Reproduction handed over (per `finding-the-cause.md`):
- `probes/req-012-task-close-during-append.repro.test.ts` asserts the REQ-012 outcome:
  - `{accepted:false, code:"TASK_AGENT_RESOURCE_CLOSED"}`;
  - no fail-stop;
  - no reservation commit;
  - a later root write is accepted.
- It **fails today**. Run log: `probes/req-012-repro-run-0216c6fb14.log`.
- Command, from `autobyteus-server-ts/` after copying the file to `tests/probes/`: `pnpm exec vitest run tests/probes/req-012-task-close-during-append.repro.test.ts --no-watch`
- Working copies in the worktree's `autobyteus-server-ts/tests/probes/` are untracked and must not be committed. Implementation turns this into the durable per-root test.
