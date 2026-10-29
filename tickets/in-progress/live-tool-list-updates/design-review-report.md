# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/live-tool-list-updates/tickets/in-progress/live-tool-list-updates/requirements-doc.md` (approved by the user at SR-001; SR-002 adds DEC-006, DEC-007, the AC-007 detail and application packages in UC-003, within the direction, user informed)
- Upstream Investigation Notes: `…/investigation-notes.md` (E-13…E-18 added)
- Upstream Solution Revision Record: `…/solution-revision-record.md` (SR-001, SR-002)
- Reviewed Design Spec: `…/design-spec.md` (SR-009, Ready)
- Supplemental Task Artifacts Reviewed:
  - `evidence/probe/*`, including the new `drive-codex-reopen.mjs`, `drive-grok-reopen.mjs`, `codex-reopen-*`, `grok-reopen-*` and `*-empty-*`;
  - `follow-ups.md` (FU-001, FU-002).
- Relevant Solution Revision IDs: `SR-001`…`SR-009`
- Architecture Review Revision Record: `…/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-009`
- Current Review Round: `9` (targeted: SR-009, a Team member's failed input as a run `ERROR` on the Team stream)
- Trigger: Solution Designer re-review request (SR-009, for ARCH-REV-008 AR-009), 2026-10-29
- Prior Review Round Reviewed: `8` (ARCH-REV-008, Fail: AR-009)
- Latest Authoritative Round: `9`
- Current-State Evidence Basis: worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/live-tool-list-updates` @ `9f7c9c10a6` (no source changes; ticket docs uncommitted). Round-1 code citations are still valid. New probe drivers were read. Round 3 also read `acp-agent-run-backend.ts:29-150` and `acp-agent-run-backend-factory.ts:75-200` (preparation owner, `release`, `cleanup`).

## Round 9 Scope (SR-009, Targeted)

- **Server:**
  - `postMessage` keeps the `lifecycleObserver` (`AgentRunInputOptions.lifecycleObserver`, `agent-run-input-contract.ts:69`).
  - On `failed` it publishes a run `ERROR { code, message }` with no evidence through `publishAgentEvent(identity, { kind: "agent_run", event })` (`configured-agent-execution-handle.ts:455`).
  - The adapter maps it, requiring only `code` and `message` (`collaboration-agent-presentation-adapter.ts:374-379`). The evidence union allows `{ errorScope: null, errorEffect: null, turnId: null }` (`agent-presentation-event.ts:35-38`), and the projector emits that shape (`agent-presentation-message-projector.ts:102`).
- **Web:** the `handleError` non-diagnostic branch (`agentStatusHandler.ts:129-167`) appends an `error` segment to the member's conversation and marks it complete. A reopen runs only with no active turn, so marking it complete changes nothing for a busy member.
- **No duplicate:** the event bypasses `AgentRun.publishEvent`, so single-run streams, input lifecycle and memory are unaffected. Single runs keep the command failure (`agent-run-command-coordinator.ts:169-176`). The handle exists only for members.
- **The test asserts what the Team stream receives** for that member, and nothing for the others. A web unit test covers the error segment.
- AR-009 is **resolved**. The pre-existing inert admission-rejection call (`:148`) is out of scope, as it does not affect AC-007.

## Round 8 Scope (SR-008, Targeted)

- **The choice is right:** report a Team member's post-admission dispatch failure from `ConfiguredAgentExecutionHandle.postMessage` through a `lifecycleObserver`. AC-007's Team clause is kept.
- **The chosen surface is a no-op once the member has a run.**
  - `publishCommandStatus` begins `if (this.agentRun) return false;` (`configured-agent-execution-handle.ts:461-463`). Its doc says "the overlay … is not [set] once a run exists".
  - `postMessage` first calls `startForInput` → `ensureReady`, which sets `this.agentRun = run` (`:160-165`, `:250`). Only then does it call `run.postUserMessage`.
  - So when the `failed` fact arrives, `this.agentRun` is always set, and `publishCommandStatus("error", fact.message)` returns `false` without effect. The overlay is also cleared on every run `AGENT_STATUS` (`:456`).
  - The existing admission-rejection call at `:148` has the same no-op for a live run. That is pre-existing.
- **An existing Team-visible surface does exist:** the `ERROR` presentation event. `AgentRunEventType.ERROR` is mapped by `CollaborationAgentPresentationAdapter` (`collaboration-agent-presentation-adapter.ts:374`) to `ERROR` (`agent-presentation-event.ts:139`). Member run events reach the Team stream through `publishAgentEvent(identity, { kind: "agent_run", event })` (`configured-agent-execution-handle.ts:455`).
- AR-009 stays open: the mechanism must be one that works with a live run.

## Round 7 Scope (SR-007, Targeted)

- **DEC-009** (the user's decision) is accepted. There is no failure notice: a failed reopen fails the `start_turn` dispatch with `RUNTIME_SESSION_REOPEN_FAILED` and the message "Couldn't give this run its new tools (<cause>). Send your message again to retry, or stop and resume the run." The removal plan covers every failure-notice piece, with a completion grep. This removes the Team-stream recognition problem entirely, and it is simpler.
- **Single runs: Pass.**
  - A non-forwarded dispatch fails the input entry with the result's code and message (`agent-run-input-admission-state.ts:218-230`, `failEntry` `:462-474`).
  - The entry's observer includes the stream's `lifecycleObserver`. For single runs, `AgentStreamHandler` wires `AgentRunCommandCoordinator`, which marks the command failed with that message (`agent-run-command-coordinator.ts:169-176`; `agent-stream-handler.ts:104-114`).
- **Team members: the claim "the web shows it like every failed message, on single runs and Team members alike" (SR-007) does not hold.**
  - A Team member's user message goes `AgentCollaborationStreamHandler` → `root.executeAgentCommand(post_message)` → `ConfiguredAgentExecutionHandle.postMessage` → `run.postUserMessage(message)`, with **no** `lifecycleObserver` (`configured-agent-execution-handle.ts:138-149`).
  - `postUserMessage` returns `accepted` at admission, before the dispatch runs (`agent-run.ts:209-239`). The stream then sends the `accepted` ack (`agent-collaboration-stream-handler.ts:168-177`).
  - When the reopen fails later, the `failed` fact reaches only the run's command observers (the memory recorder, `agent-run-manager.ts:157`). The only consumer of `failed` facts is the single-run `AgentRunCommandCoordinator`.
  - `AGENT_INPUT_STATE` lists only pending entries (`autobyteus-agent-presentation-contracts/src/agent-input-state-dto.ts:26-29`), and the failed entry is removed (`removeEntry`).
  - Result: on a Team member, a failed reopen shows **no error at all**. The message is acknowledged, then silently disappears. AC-007 requires "The message shows as failed with that error … also for a Team member". AR-009 stays open, reframed.

## Round 6 Scope (SR-006, Targeted)

- **The removal list is now complete.** It covers every consumer listed in round 5, plus a completion grep. DEC-001 is annotated. The new label "Tools not updated" is recorded in the requirements UI section; it is only the failure card's wording.
- **Single-run streams:** the dedicated sender `system.tool_list_update_failed` reaches the web as `sender_id` (`systemTaskNotificationHandler.ts:17`). The sender-only rule works.
- **Replay:** the notice is live only. It is not in `RECORDED_SYSTEM_NOTICE_SENDER_IDS` (`runtime-memory-event-accumulator.ts:25-30`). This is sound.
- **Team member streams: the design's claim "single runs and Team member streams alike" is false.** The collaboration adapter maps a run's `SYSTEM_TASK_NOTIFICATION` to `{ sender: { kind: "system" } | { kind: "execution", … }, content }` and drops `sender_id` (`collaboration-agent-presentation-adapter.ts:363-368`; projector `agent-presentation-message-projector.ts:78`). The previous web rule fell back to content for exactly this reason ("Team streams"). On a Team member, the sender-only rule therefore never fires: the failure shows as an unlabeled, untranslated English notice, not as the "Tools not updated" card. AR-009 stays open, narrowed.

## Round 5 Scope (SR-005, Targeted)

The delta reviewed:
- the requirement changes to REQ-010, AC-007, SCN-004, the UI section and DEC-008 (the user's decision);
- the design's Removal plan row and the Return/Event spine.

The implemented code at `5f3923c4cd`…`bba8117550` was searched for every use of the button, its action and its texts (`git grep restart_run|restartRunWithNewTools|Restart this run`). Sections not affected by SR-005 keep their round-4 verdicts.

- The requirement basis is confirmed: DEC-008 was decided by the user, so this is not a reviewer-authorized change. It narrows REQ-010 to a plain message plus retry at the next message. AC-007 adds the Team-member check.
- Removal completeness: **Fail** (AR-009). The plan omits consumers the search found, and it leaves the web's recognition of the failure notice unspecified.

## Routing Classification Review

- Task size: `Large` (about 35–45 files); architectural risk: `High`. Confirmed.
- Independent Architecture Review required by the classification: `Yes`

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed`
- SR-002 requirement additions reviewed:
  - DEC-006: one notice per message, tools first.
  - DEC-007: a failed reopen does not send the message.
  - AC-007 detail.
  - UC-003 names application packages.
  - Persisted data `Yes`.

  These are within the approved direction (REQ-006, REQ-010, UC-003). None widens product policy beyond the Task, so a technical review accepts them as the requirements owner recorded them.
- Every prospective blocking `Design Impact` finding is traceable: `Yes`
- Statements about existing code and evidence the design relies on:
  - The SR-002 code rows (E-16, E-17, E-18) match round-1 reads.
  - The probe evidence E-13 matches the Codex sequence: unsubscribe, then resume on the same client.
  - SR-003: the Grok sequence now follows E-14's measured order (end, then spawn and load), so AR-001 is resolved. The cited backend lines match: `handleSessionFailure` (`acp-agent-run-backend.ts:81-85`), the `start_turn`/append refusals (`:87-93`), `terminate` → `shutdown` → `input.cleanup()` (`:124-135`).
  - **Round 3, AR-008 (resolved in round 4):** the backend's `cleanup` is the factory's `release`. Its `releaseResources` closes `owner.session`, `owner.connection` or `owner.process` of the factory's `AcpPreparationOwner` (`acp-agent-run-backend-factory.ts:80-99,196`). The SR-003 sequence installs the new connection and session in the backend only (step 5) and says terminate calls "`cleanup()` as today" (step 7). After a reopen, release would close the already-ended original handles, and the reopened Grok process would never be ended. SR-004 makes the run's `AcpPreparationOwner` (`acp-agent-run-backend-factory.ts:79`; type at `:239-244`) the single holder across creation, restore and reopen. `AcpSessionLauncher` opens into it; the backend reads its handles from it; the reopen clears it, fills it, or empties it on failure. The existing `releaseResources` (`:84-94`) is null-safe (`owner.session?.close()`; connection, else process), so it ends whatever is current.

| Behavior ID | Kind | Design Alignment With Approved Intent | Approved Trigger / Contract And Current-State Evidence | Target Outcome / Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | Pass | Pass | Pass | Confirmed | — |
| BEH-002 | Contract | Pass | Pass | Pass: the session is never deactivated during a reopen; empty lists are valid | Confirmed | — |
| BEH-003 | User (preserved) | Pass | Pass | Pass: the skill notice sits behind the composite; DEC-006 defers it at most one message | Confirmed | — |
| BEH-004 | User (preserved) | Pass | Pass | Pass (stop after a reopen ends the current process: SR-004) | Confirmed | — |
| REQ-010 / AC-007 (SR-005…SR-009) | User | Pass | Pass | Pass: single runs show the command failure; Team members get a run `ERROR` on the Team stream, shown as an error segment (SR-009) | Confirmed | — |

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose And Scope Are Clear? | Linked To Relevant Core Artifacts? | Internally Complete? | Consistent With Related Core Artifacts? | Status And Approval Applicability Are Clear? | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| `evidence/probe/*` (incl. reopen and empty drivers) | Pass | Pass | Pass | Pass (SR-003 follows E-14) | Pass | — |
| `follow-ups.md` FU-001, FU-002 | Pass | Pass | Pass | Pass | Pass | — |

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present | Pass | Feature; four triggers named | — |
| Root cause explicit and evidence-backed | Pass | E-02, E-04, E-05, E-08, E-16 | — |
| Refactor decision explicit | Pass | One run operation, an always-present replaceable session, a composite port | — |
| Supported by concrete sections | Pass | Codex and Grok reopen sequences, composite, signal, store | — |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? | Narrative Is Clear? | Facade Vs Governing Owner Is Clear? | Main Domain Subject Naming Is Clear? | One Owner Per Node, In Call Order? | Off-Spine Concerns Stay Off Main Line? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-006 | Change signal, three sources | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-001 | Signal → runs | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-002 | Session replace + streams | Pass | Pass | Pass (authority → service) | Pass | Pass (service calls registry, then streams) | Pass | Pass |
| DS-003 | Immediate runtimes | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-004 | Reopen runtimes | Pass | Pass | Pass | Pass | Pass (Codex: the same preparation and thread object; Grok: the preparation owner holds the process across reopen) | Pass | Pass |
| DS-005 | Notices | Pass | Pass | Pass (composite → sources) | Pass | Pass | Pass | Pass |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? | Internal Owned Mechanisms Stay Internal? | Caller Bypass Risk Is Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `AgentRun.applyDefinitionTools` / `getToolNames` | Pass | Pass | Pass | Pass | — |
| `AgentToolMcpRunSessionAuthority` (+ scoped) | Pass | Pass | Pass | Pass | — |
| `AgentRunPlatformNotices` | Pass | Pass | Pass | Pass | `AgentRun` knows only the composite |
| `CodexThreadManager.reopenThread`; `AcpSessionLauncher` | Pass | Pass | Pass | Pass | — |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? | Forbidden Shortcuts Are Explicit? | Direction Is Coherent With Ownership? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `tool-list-updates` → agent-execution, agent-definition | Pass | Pass (never backends or `agent-tools`) | Pass | Pass | — |
| backends → run-session authority | Pass | Pass | Pass | Pass | — |
| composite in `agent-execution/domain`, ports only | Pass | Pass | Pass | Pass | — |

## Interface Boundary Verdict

| Interface | Subject Is Clear? | Responsibility Is Singular? | Identity Shape Is Explicit? | Generic Boundary Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `applyDefinitionTools(definition) → { kind, toolNames }` | Pass | Pass | Pass | Low | Pass |
| `replaceForRun` / `describeForRun` | Pass | Pass (no absence case) | Pass | Low | Pass |
| `takePreface(run, { dispatchKind })` | Pass | Pass | Pass | Low | Pass |
| `AgentDefinitionChangeSignal.notifyChanged/subscribe` | Pass | Pass | N/A (no IDs, by design) | Low | Pass |
| `reopenThread`, `AcpSessionLauncher.open` | Pass | Pass | Pass | Low | Pass |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? | Reuse / Extension Decision Is Sound? | New Support Piece Is Justified? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Notice ports | Pass | Pass (extend with the kind) | Pass (composite) | Pass | — |
| Seen record | Pass | Pass (copy of the store rules) | Pass | Pass | — |
| Reopen | Pass | Pass (Codex resume; ACP launch extracted) | Pass | Pass | — |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? | Reuse / Extend / Create-New Decision Is Sound? | Supports The Right Spine Owners? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| all rows of the design's allocation table, including compositions | Pass | Pass | Pass | Pass | — |

Kinds and forms now traced:
- runs with and without tools (the always-present session);
- `start_turn` vs `append_to_active_turn`;
- two notice sources;
- shared, team-local, org-owned and application-owned definitions, plus application packages;
- Codex threads with and without history.

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? | Shared File Choice Is Sound? | Ownership Of Shared Structure Is Clear? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Composite notice port | Pass | Pass | Pass | Pass | — |
| Seen-record store (copied rules) | Pass | Pass | Pass | Pass | — |
| External backends' `resolve exposure → replaceForRun → kind` | Pass | N/A | Pass | Pass | Recommendation: four external backends share this short sequence. Keep it in one helper if it grows beyond a few lines |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Overlapping Representation Risk Is Controlled? | Shared Core Vs Specialized Variant Decision Is Sound? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Session record | Pass | Pass | Pass | N/A | Pass | — |
| `seen_tool_names.json` `{ version, toolNames }` | Pass | Pass | Pass | N/A | Pass | — |

Derived consumers of a changed structure listed with a decision for each: `Pass`. Each start-time copy has a decision: Claude exposure and descriptor, Codex `appServerConfig`, the ACP descriptor, the AGY capsule, native `toolInstances`.

Domain vocabulary keeps one meaning per word: `Pass` ("reopen", "turn-start dispatch", "tool exposure").

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? | Matches Owner? | Re-Tightened? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| every row of the design's Final File Responsibility Mapping | Pass | Pass | Pass | Pass | The scoped authority, host, compositions and feed composition are now included |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? | Folder Matches Owning Boundary? | Mixed-Layer Or Over-Split Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `src/tool-list-updates/`, `agent-run-platform-notices.ts`, `acp-session-launcher.ts`, `agent-tools-mcp-session-streams.ts` | Pass | Pass | Low | Pass | — |

## Removal / Decommission Completeness Verdict

| Item / Area | Named? | Replacement Clear? | Scope Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| AGY header + 405; one-shot SSE; `listChanged: false` | Pass | Pass | Pass | Pass | — |
| `not_exposed` + null-descriptor branches (four backends) | Pass | Pass | Pass | Pass | — |
| Claude's cached activation; Agent Tools names in `allowedTools` | Pass | Pass | Pass | Pass | — |
| Dead Codex dynamic-tool path | Pass (FU-002, with evidence E-18) | N/A | Pass | Pass | Accepted as a follow-up: the path spans untouched approval code, and the change adds no use of it |
| Restart button and failure notice (SR-005…SR-007, DEC-008, DEC-009) | Pass (with a completion grep) | Pass (the dispatch failure replaces it) | Pass | Pass | — |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? | Clean-Cut Removal Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- |
| All rows of the rejection log | No | Pass | Pass | — |

## Persisted-Data Transition Verdict (When Applicable)

| Area / Stored Subject | Approved Decision | Representative Reader / Semantic / Invariant Evidence Is Sufficient? | Direct Use, Rebuild, Or Migration Choice Is Proportionate? | Migration Safety Is Complete If Required? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `<memoryDir>/seen_tool_names.json` (new) | `Directly Usable — No Migration` | Pass: tolerant reads; atomic writes; never creates the folder; "no record = has seen the current list" | Pass | N/A | Pass | — |

## Change / Refactor Sequence Verdict

| Area | Sequence Is Realistic? | Temporary Seams Are Explicit? | Cleanup / Removal Is Explicit? | Verdict |
| --- | --- | --- | --- | --- |
| Steps 1–7 | Pass. The Codex `enabled_tools: []` check comes early, under the escalation trigger | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? | Present And Clear? | Bad Shape Explained? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Reopen sequences, append vs start, zero tools, two notices | Yes | Pass | Pass | Pass | — |

## Material Premise Validation (Only When Needed)

- Round 5: no new premise. AR-009 follows from the code's current recognition rule; it is not a scenario.
- MP-001…MP-003 (round 1) are resolved by SR-002, and MP-004 (round 2) by SR-003. All are kept in the revision record. MP-004 is shown below as resolved for reference.

### `MP-004` — The Grok reopen opens a second process on the same session while the first is still alive

- Related requirement: REQ-003 (the conversation kept), REQ-010 / AC-007 (the failure path), BEH-004
- Relevant behavior ID(s): BEH-001 (SCN-002, SCN-004)
- Initiating basis kind: `User`
- Trigger: the user changes a Grok run's tools and sends the next message.
- Forward path: the design's Grok reopen, steps 3–4. `AcpSessionLauncher.open({ mode: "load" })` spawns a new process and calls `session/load` before the old process is ended. On failure, the old process is kept (step 6).
- Lifecycle state at the claimed point: two Grok processes hold the same session. The measured evidence covers only end-then-load (`drive-grok-reopen.mjs:37`). The product's restore path also starts from no live process.
- Material consequence: unknown and not measured. Grok may refuse to load a session that another live process holds, or two processes may write the same session history. The keep-the-old-one-on-failure rule depends on this overlap being safe.
- Reachability: `Reachable`. Every Grok reopen exercises this path; it is the design's own path, not a hypothetical one.
- Review consequence (round 2): AR-001 stays open, narrowed to Grok. **Round 3: resolved.** SR-003 ends the old process before the load (Grok steps 2–4).

### `MP-005` — A Grok run is stopped after a reopen

- Related requirement: BEH-004 (stop and resume), REQ-010 / AC-007 (the restart button is stop + restore)
- Relevant behavior ID(s): BEH-001, BEH-004 (SCN-002, SCN-004)
- Initiating basis kind: `User`
- Trigger: after a Grok run reopened (SCN-002), the user stops it, or clicks "Restart this run with the new tools" (SCN-004).
- Forward path:
  1. `AgentRun` terminate → `AcpAgentRunBackend.terminate` → `shutdown` → `this.input.session.close()` → `this.input.cleanup()` (`acp-agent-run-backend.ts:124-135`).
  2. `cleanup` is the factory's `release` → `releaseResources`, which closes `owner.session` and `owner.connection` (or stops `owner.process`) of the preparation owner captured at creation or restore (`acp-agent-run-backend-factory.ts:80-99,196`).
  3. SR-003 ended those original handles in step 2 and installed new ones in the backend only (step 5).
- Material consequence: the reopened Grok process is left running after stop. With the restart button, a second process is then started by restore. Each reopen followed by a stop leaks one process.
- Reachability: `Reachable` (normal stop after a normal reopen)
- Review consequence: AR-008. **Round 4: resolved by SR-004.**

## Unresolved Approved-Behavior Or Current-State Gaps

None.

## Review Decision

- `Pass`

## Findings

None open. AR-001…AR-009 are resolved (see ARCH-REV-002…ARCH-REV-009 in the revision record).

## Classification

N/A (Pass)

## Recommended Recipient

Implementation Engineer (`/software_engineering_team/implementation_engineer`)

## Residual Risks

- The reopen with a concurrent save is now handled: `reopenPending` is recomputed on success (SR-003, Codex and Grok step 5).
- A Grok reopen failure leaves the run with no runtime session until the next `start_turn` or the restart button. This is specified (step 7) and accepted (DEC-007).
- **Codex `enabled_tools: []`** is checked in step 1 under the escalation trigger.
- **AGY without the header against the product endpoint** has been measured only against the probe; the build confirms it.
- **U-01 / ASM-001 (narrowed by E-13).** Whether the model uses the new tool after a reopen awaits a model turn (DEC-004, accepted).
- **R-01:** runtime version drift.
- **SR-009 covers any post-admission failure of a member's direct input,** not only a failed reopen. Its `handleError` marks the member's conversation complete. For the reopen this always happens with no active turn. Another failure kind that arrives during an active turn would also mark it complete; this is existing `handleError` behavior and outside AC-007.
- **Teammate deliveries (`reserveInput`) are unchanged.** A reopen that fails on a delivered teammate message is reported by the existing delivery path, not by this event.

## Latest Authoritative Result

- Review Decision: `Pass`
- Material-Premise Gate: `Pass` (MP-001…MP-005 resolved; no new premise in rounds 5–9)
- Notes: task_size=Large, architectural_risk=High. The implementation rework is:
  - the SR-005…SR-009 removals with their completion grep;
  - the dispatch-failure message;
  - the Team-member `ERROR` publication with its Team-stream test;
  - CRR-001's CR-002 and CR-003.

  The design's escalation triggers still apply.
