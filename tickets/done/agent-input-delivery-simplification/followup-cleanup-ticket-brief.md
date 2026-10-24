# Follow-Up Cleanup Ticket Brief — Simplify Agent Input Delivery And Member Activation

- Origin: code review failure-origin review CRR-002 for `delegated-team-member-lazy-activation` (finding CR-FO-003, Residual Risks)
- Requested by: the user, 2026-10-08. The user agreed to a bounded refactor inside the current ticket and to this broader cleanup as its own ticket.
- Author: code_reviewer
- Source snapshot: worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-team-member-lazy-activation`, HEAD `d30c11204`
  - All paths below are relative to `autobyteus-server-ts/src/`.
  - Line numbers are as of that HEAD.
- Status: candidate. The Project Task Manager still has to create the ticket, and Solution Designer still has to run requirements, design and classification.

## 1. Why this ticket exists

DTL-003 failed in API/E2E for the current ticket. A teammate `send_message_to` reached a not-started member that could not start. The sender got an MCP `-32603 Internal error`, and the member stayed `offline` instead of showing `error`.

The fix itself was small. The bug was hard to see:
- the design spec traced teammate messages through `postMessage`;
- the Implementation Engineer believed the same;
- in reality they go through `reserveInput`.

When the people building a feature cannot tell which path a message takes, the design has too many parallel paths. The root cause is duplication: the same job is written separately on several paths and in several layers, and the copies drift apart.

The current ticket fixes only the part that caused the bug. In `ConfiguredAgentExecutionHandle`, one shared "start, or report failure" step replaces the separate handling in `postMessage` and `reserveInput`, and the unconsumed `readiness_failure` event is removed. This ticket handles the rest.

## 2. Background: the two ways to give an agent a message

| | `postUserMessage` | `reserveUserMessage` |
| --- | --- | --- |
| Meaning | Accept and start processing now | Hold a slot. Processing starts only after the caller commits; the caller can cancel |
| Why it exists | Input that needs no durable write first: UI input, application input, the delegated seed | Agent-to-agent messages that must also be written to the saved message history. "Saved" and "delivered" must succeed or fail together |
| Flow | admit → dispatch | reserve → caller persists the message (`commitAppend`) → commit (or cancel) → release → dispatch |

The two-phase reservation is a legitimate need. The problem is how it is layered and duplicated around that core.

## 3. Problems found (evidence)

### P1. `AgentRun` has two independently written input entry points that behave differently

- `domain/agent-run.ts:171-202` `postUserMessage` and `:204-233` `reserveUserMessage`.
- At the lowest level the design is already unified: `input/agent-run-input-admission-state.ts:95-98`, `admit()` = `reserve()` + `commitReservation()` + `releaseReservation()`.
- One level up, the two methods differ:

| Step | `postUserMessage` | `reserveUserMessage` |
| --- | --- | --- |
| Runtime reconcile | `reconcileRecovery()` (`:388-391`): lifecycle reconcile **plus** `inputAdmissionState.observeRecovery(compactionRecovery.reconcile())` | lifecycle reconcile only (`:213`) |
| Compaction recovery | `compactionRecovery.claimAdmission(...)` and later `compactionRecovery.authorize(retry)` | none |
| Dispatch | immediate, inside the same `dispatchQueue` step (`claimNextInput` / `startInputDispatch`) | deferred: commit → `eligibilityChanged` → microtask `drainInputAfterLifecycleChange()` (`:370-377`) |
| Input-state publish | `publishInputState()` | not at reserve time |

- **Open question (must be answered first):**
  - Does input that arrives through a reservation (teammate messages) need the compaction-recovery steps?
  - If posted input is what unblocks an agent stuck in compaction recovery, a teammate message might not unblock it.
  - This has not been traced, so it is not a confirmed bug. It must be investigated before any merge.

### P2. Duplicated validation in the admission state

- `input/agent-run-input-admission-state.ts:80-93` (`admit`) repeats the same "accepting?" and "non-empty content?" checks that `reserve()` runs at `:107-120`. `admit()` then calls `reserve()`, so the checks run twice.

### P3. Activation-failure handling and failure reporting are duplicated and inconsistent

- `agent-collaboration/execution/backends/configured-agent-execution-handle.ts`: `postMessage` and `reserveInput` each start the member and handle failure separately.
  - The current ticket's refactor unifies this inside the handle.
- Two result shapes with different code vocabularies remain across the codebase:
  - `AgentOperationResult` (`accepted: boolean`, free `code`);
  - `AgentRunInputReservationResult` (`reserved: boolean`, closed `AgentRunInputRejectionCode` union in `agent-execution/input/agent-run-input-contract.ts:35-39`).
  - This ticket should decide whether one input-outcome shape can serve both.

### P4. A teammate message passes through about nine layers, several of which only forward

Teammate delivery path (`send_message_to` → recipient):

1. `agent-collaboration/execution/communication/root-communication-engine.ts:26-74` `RootCommunicationEngine.deliver`
2. Communication adapter `reserveRecipientInput`, one per root kind:
   - `standalone-agent-run-root/services/standalone-root-communication-adapter.ts:43-45`
   - `agent-org-execution/services/agent-org-communication-adapter.ts:41-42`
   - `services/team-communication/team-communication-adapter.ts:~71`
   - The standalone and Org adapters only forward to an injected function.
3. Root delivery `reserveAgentInput`:
   - `standalone-agent-run-root/services/standalone-root-message-delivery.ts:154-167`
   - `agent-org-execution/services/agent-org-run-message-delivery.ts:111-120`
4. Either `agent-collaboration/execution/backends/root-agent-execution-registry.ts:208-211`, **or** `agent-team-execution/domain/team-run.ts:44-45` `TeamRun.reserveDirectAgentInput` (forwarding only)
5. `agent-team-execution/local/flat-team-run-backend.ts:27-28` (forwarding only)
6. `agent-team-execution/local/flat-team-execution-manager.ts:144-158` `reserveDirectAgentInput`
7. `agent-team-execution/local/registries/task-agent-execution-registry.ts:221-224`, **or** `agent-team-execution/local/flat-team-agent-execution-handle.ts:60-61` (forwarding only)
8. `ConfiguredAgentExecutionHandle.reserveInput`
9. `AgentRun.reserveUserMessage` → `AgentRunInputAdmissionState.reserve`

There are also three `commitAppend` implementations, one per root kind (standalone, Org, Team adapters), which persist the message and commit the reservation.

### P5. Other message routers also post directly to agent runs

`postUserMessage` is called from many places:
- `configured-agent-execution-handle.ts`
- `application-platform/execution/application-execution-scope.ts:141`
- `agent-team-execution/services/inter-agent-message-router.ts:11`
- `agent-execution/services/agent-run-command-coordinator.ts:124,135`
- `standalone-agent-run-root/services/standalone-root-message-delivery.ts:96`
- `skill-improvement/services/improver-session/skill-improvement-improver-session-service.ts:88`
- `agent-communication/services/global-agent-run-message-router.ts:177`

`inter-agent-message-router.ts` and `global-agent-run-message-router.ts` look like further agent-to-agent routes besides `RootCommunicationEngine`. This ticket should establish:
- which of them are live production paths;
- whether they overlap with root communication;
- whether any is obsolete.

### P6. Heavy lifecycle state in `ConfiguredAgentExecutionHandle`, not yet checked against real scenarios

- The handle tracks: `activationOperation`, `configurationPreparing`, `readinessAttempt`, a `retrySafe` flag, `rootShutdownFenced`, `runtimeReleased`, quarantined/indeterminate failures, and `cleanupConfirmed`.
- Fences are checked repeatedly:
  - `assertInputAllowed`, `executionAdmissionFence`;
  - `assertDeliveryAllowed`, called three times in `RootCommunicationEngine.deliver` (`:40`, `:61`, `:63`).
- Some of this may be needed, for example for root shutdown during activation. Each mechanism must be tied to a supported scenario (actor or system event, entry surface, consequence) before it is kept, merged or removed. Do not remove machinery just because it looks heavy.

## 3a. Recommendation: one input entry point, not two

The user discussed this with the code reviewer on 2026-10-08 and agreed with the direction.

**Recommendation.** `AgentRun` should have one input entry point with an optional step before work starts, instead of separate `postUserMessage` and `reserveUserMessage` methods.
- Every message goes through reserve → optional caller step → commit/release.
- Agent-to-agent delivery puts "save to history" in the optional step.
- UI input, application input and the delegated seed have no step and commit immediately.
- "Post" is then just "reserve with an empty middle step".

**Why one method is better:**
1. **It is one job.** Both methods put a message into the same queue, in the same order, with the same checks. The only difference is whether the caller does something before the agent starts. That is an option, not a different operation.
2. **Two methods drift, and drift caused DTL-003.** Every rule must be written twice and kept in sync, and it already was not in sync in two places:
   - start-failure handling (`postMessage` reported it, `reserveInput` threw);
   - compaction recovery (only `postUserMessage` runs it; P1).
3. **Two methods hide the real path.** The design spec and the implementation both assumed teammate messages used `postMessage`. With one entry point there is nothing to guess.
4. **The lowest layer already proves the design.** `AgentRunInputAdmissionState.admit()` is literally `reserve()` + `commitReservation()` + `releaseReservation()` (`input/agent-run-input-admission-state.ts:95-98`). The cleanup applies the same idea to the layers above.

**Caveat to verify (not a reason to keep two methods).**
- Today `postUserMessage` admits and dispatches in a single `dispatchQueue` step.
- With one entry point, posted input commits right after reserving, so dispatch timing changes slightly (reserve currently drains through a microtask after commit).
- This must be tested across all post callers (P5).

**Second decision, after the entry point is unified: is the held slot needed at all?**
- Alternative: save the message to history first, then post it. If the agent refuses it, record it in history as "not delivered: <reason>".
  - The agent still never acts on an unsaved message.
  - The history shows failed deliveries, which may be more honest for the user.
- Costs:
  - writing "not delivered" records;
  - with concurrent senders to one recipient, saved-history order may differ slightly from processing order.
- Whether those costs matter is a product question. Solution Designer should settle it with the user (new investigation question Q6).

**Why this is not done in `delegated-team-member-lazy-activation`:**
- The duplication that caused DTL-003 is in `ConfiguredAgentExecutionHandle`. That ticket's CR-FO-003 refactor (one "start, or report failure" step, `readiness_failure` removed, one failure code) fully removes it.
- The `AgentRun`-level split did not cause DTL-003. Unifying it:
  - must first answer Q1 (compaction recovery), or posted input may lose recovery behavior;
  - touches about eight `postUserMessage` callers (P5), meaning every way an agent receives input, not only Teams;
  - changes dispatch timing (Q2).
- Doing it there would move that ticket from Small/Low to Large/High and delay its user-visible fix.

## 4. Proposed goals

1. **One input path into an agent.** Posting is reserve plus immediate commit/release, as the admission state already does. Any post-only extras live in one documented place, or apply to both paths if the investigation shows they should.
2. **One input-outcome vocabulary** for "accepted or not, and why", used by posted and reserved input.
3. **One root delivery implementation** shared by the standalone Agent, Team and Org roots, with root-specific differences injected as data or small strategies rather than copied services. Remove pure pass-through hops.
4. **A clear answer on the other routers** (P5): kept with a stated purpose, merged, or removed.
5. **A lifecycle-state audit of the handle** (P6): each state or fence is kept with its scenario, merged, or removed.
6. **Up-to-date docs**, including `docs/modules/agent_team_execution.md` and any delivery/communication module doc, so the real path is written down.

## 5. Investigation required before design

- Q1: Must the compaction-recovery steps that only `postUserMessage` runs also apply to reserved input? Trace `compactionRecovery.claimAdmission`, `observeRecovery` and `authorize`. Is there a supported scenario (a teammate message to an agent blocked in compaction recovery) that currently behaves differently from operator input?
- Q2: Can `postUserMessage` become reserve-then-commit without a visible change?
  - Posting currently admits and dispatches in one `dispatchQueue` step.
  - Splitting it changes timing for UI input, application input and the delegated seed.
- Q3: Which agent-to-agent routers (P5) are live, and for which product surfaces?
- Q4: What is truly different between the three roots' delivery and `commitAppend` (persistence target, message schema, open checks), and what is copy?
- Q5: For each handle lifecycle state and fence, which supported scenario needs it?
- Q6: After unification, keep the held slot (reserve → save → commit), or switch to save-first with a "not delivered: <reason>" history record? This depends on whether history order must exactly match processing order for concurrent senders, and on whether users should see failed deliveries in the history. It needs a product decision from the user.

## 6. Out of scope

- No change to product behavior: message ordering, delivery semantics, handoff rules, status meaning and the `send_message_to` / `delegate_task` tool contracts stay as they are, unless Solution Designer finds a real defect (for example via Q1) and gets user approval for it.
- No provider/runtime internals (Codex, Claude, AGY backends).
- No persisted-data shape change, unless the design shows it is unavoidable. Persisted collaboration messages must stay readable.

## 7. Suggested acceptance criteria (for Solution Designer to refine)

- Exactly one code path admits user input into an `AgentRun`. Posting reuses it.
- Exactly one place starts a not-started configured member and reports failure, already delivered by the current ticket. The rest of the stack does not duplicate it.
- Teammate delivery has one implementation across the three root kinds, with no pure pass-through layers left.
- One input-outcome vocabulary is used by both posted and reserved input.
- Q1–Q5 are answered in the investigation notes. Every removed mechanism has a recorded reason, and every kept one has a recorded scenario.
- All existing unit, integration and E2E suites pass, including:
  - `delegated-team-lazy-member-activation` (DTL-001..008);
  - task-copy idle lifetime, task reactivation, ad-hoc delegation, task closure, Org publication;
  - compaction-recovery tests.

## 8. Dependencies, size and risk

- **Dependency:** start after the current ticket `delegated-team-member-lazy-activation` (with its CR-FO-003 refactor) is merged, because this ticket builds on its single "start, or report failure" step.
- **Likely classification:** `Large` / `High`. It touches the shared input and delivery spine for every agent, team and org, and changes timing-sensitive code. Expect architecture review and independent code review.
- **Possible split:** the Project Task Manager may split this into ordered tasks, for example:
  1. investigation (Q1–Q5);
  2. unify `AgentRun` input entry and outcome vocabulary;
  3. unify root delivery and remove pass-through layers;
  4. handle lifecycle-state audit and cleanup.
- **Main risks:**
  - timing changes on the posting path (Q2);
  - accidentally dropping a compaction-recovery behavior (Q1);
  - breadth of callers (P5).
