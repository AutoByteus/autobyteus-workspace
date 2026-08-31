# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

`Refined` — the user requires the complete task-monitor display path to be corrected and explicitly rejected the prior frontend-only causal design after packaged-Electron verification. Agent prompt clarity, LLM tool choice, collaboration-tool semantics, persistence, and backend task-lifecycle behavior remain out of scope; the server's task-Agent event-egress boundary is now in scope because it is the proven missing input to the frontend monitor.

## Goal / Problem Statement

Correct delegated-task observability so the execution tree, workspace header, conversation/event monitor, Activity pane, and task lifecycle all describe the same exact task AgentRun. A user must be able to tell whether the task is formally in progress, awaiting review, revision-requested, accepted, or interrupted and whether its Agent execution is initializing, running, idle, errored, or offline without reloading the application or inferring status from an ordinary message.

The reported Prototype Bootstrapper completed substantive work and sent it to Product Prototyper. The code defect is end-to-end observability, not Agent behavior: an already-open UI can mark the exact task row current while rendering that task's local context as `Offline`/assignment-only even though the exact projection continues to accumulate work. The user reproduced the same failure in the delivered Electron package. A controlled live experiment against that package's embedded backend proves the task Agent's post-activation `AGENT_STATUS`, turn, content, and tool events never reach the root Team WebSocket; only task activation and separate Team communication events do. The frontend therefore has no live exact-run events with which to advance its early projection snapshot.

The observed `active` task record is valid under the existing lifecycle contract because no formal submission occurred. LLM tool choice, prompt quality, task submission/review policy, and lifecycle behavior are explicitly not defects addressed by this ticket. The required server correction is limited to releasing the existing task-Agent event publisher from its pre-durability buffer after activation commit so the already-defined root Team stream contract is actually fulfilled.

## Current And Desired Behavior (Mandatory)

| Behavior ID | Current Behavior | Desired Behavior | Preserved / Unchanged Behavior | Related Requirement / Acceptance-Criteria IDs |
| --- | --- | --- | --- | --- |
| BEH-001 | In the supplied and packaged-Electron UIs, the exact task row is current while the header/monitor remain `Offline` and empty or assignment-only. The SR-006 live experiment selected the exact task at 1 conversation/1 Activity; the backend later reached 6/4 while the selected UI remained `Offline`/1/1 through +60 seconds. | Whenever a task row is current, the tree, header, center monitor, Activity pane, and other focused-run surfaces resolve and continue receiving state for the row's exact `agentRunId`. | Exact task identity remains internal; the ordinary task label does not expose task/run IDs. | R-001–R-004, R-006, R-010, R-013; AC-001–AC-003, AC-006–AC-007, AC-017 |
| BEH-002 | Full Team hydration can load a retained projection, but a locally materialized/live task context can exist before it is complete. The implemented selection correction performs one exact projection fetch; if the task is selected before later work, that early snapshot remains stale because the task Agent's subsequent events are trapped server-side. | Selecting a task with incomplete local monitor data loads and safely merges the exact retained projection, while the live Team stream continuously advances that same exact context after selection; loading/error/true-empty states remain honest. | Genuine empty task runs may still show an empty monitor once authoritative hydration succeeds. | R-002–R-004, R-013; AC-003, AC-006, AC-010, AC-017 |
| BEH-003 | Navigation selection is projected from `runHistoryStore.navigationProjection`, while header/monitor selection is read from `AgentTeamContext.view`; they aligned on the exact task ID in the deterministic reproduction, but supported structural update/repair paths still mutate them through separate owners and have no atomic convergence guarantee. | One exact focused-run invariant governs all surfaces across user selection, live task activation, snapshots, stream recovery, and history reopen. Selection/hydration failure leaves the previous coherent selection intact. | New task activation does not steal the user's current focus. Settlement continues to repair focus to a valid visible execution. | R-001–R-004, R-009; AC-001–AC-006, AC-009 |
| BEH-004 | Task rows carry both formal `taskStatus` and Agent `currentStatus`, but the row renders only a color/status dot for Agent execution; the header shows only Agent execution status. `active + idle` is therefore easy to misread as stopped or finished. | The task row and selected-task header expose visible, non-color-only lifecycle and execution labels, such as `In progress · Idle` or `Awaiting review · Idle`, and identify the selected execution as a task. | Lifecycle and execution status remain separate authoritative concepts; `Idle` does not mean task completion, and `active` does not mean the model is currently generating. | R-005–R-006, R-010; AC-004–AC-005, AC-011 |
| BEH-005 | The task Agent produced messages, tool activity, completed output, and ordinary handoffs that are retained in its exact projection. Separate Team communication events reach the Team pane, but the root Team stream omits the same task Agent's post-activation Agent events, so an early-selected exact monitor never advances. Its task record separately remains `active`. | Selecting the exact task AgentRun displays retained and live conversation/Activity independently of formal lifecycle state or LLM collaboration-tool choice. | Agent prompt behavior, tool choice, ordinary-message semantics, and the formal task state machine remain unchanged; the UI must not infer completion from message wording. | R-003, R-007–R-008, R-013; AC-003, AC-008, AC-012–AC-014, AC-017 |
| BEH-006 | The stable configured bootstrapper and fresh task bootstrapper share one logical name/address but have different AgentRun IDs. The configured parent is legitimately `Offline` and empty while the task run is `Idle` with retained work. | The stable parent and every fresh task execution remain distinct. Selecting one never copies or aliases the other's status, conversation, Activity, or lifecycle. Repeated tasks to the same address remain independently selectable. | Configured topology remains stable/address-based; exact execution identity remains AgentRun-ID-based. | R-001, R-009; AC-007, AC-015 |
| BEH-007 | `MixedTaskAgentExecutionRegistry.prepare()` binds the task Agent handle to `publish: event => retainedEvents.push(event)`. `releaseWork()` flushes the array once but never switches that closure to the root publisher. All later Agent events keep accumulating in the private array; the root Team WebSocket receives zero exact task-Agent Agent events, although root snapshots can later read the handle's true `Idle` status directly. | Before activation durability, task-Agent events remain private. After the durable task activation event is published, the gate drains buffered events exactly once in order and forwards every later task-Agent event directly to the root publisher/Team WebSocket. Abort publishes nothing and starts no work. | Existing Agent event DTOs, change sequencing, root isolation, task activation ordering, persistence, task lifecycle, and Team communication semantics remain unchanged. | R-004, R-007–R-008, R-013; AC-002–AC-003, AC-008, AC-014, AC-017 |

## Investigation Findings

- The Docker backend on `http://127.0.0.1:8001` has healthy authoritative data for task `task_dd50e47ec3c64e659cc9fac44ffb98a7` and exact task AgentRun `prototype_bootstrapper_59372829f6294393b6f83bb80a293260`.
- The task AgentRun's retained projection contains its completed work, completion summary, ordinary handoff, and 51 visible Activity events. The configured parent `prototype_bootstrapper_ae508a8a05114e4aa2345f66ba9c1848` has no projection activity and is `Offline`.
- A clean detached baseline frontend at commit `80e2bd195` reproduced the defect three times through a supported live flow on node 8001 using Nested Classroom Test Team, Codex runtime, and GPT-5.6 Luna. In the strongest round, the backend had five exact conversation entries and three Activity items more than six seconds before the click; the exact row, navigation focus, and execution-view focus then all selected `student_two_617e…`, but its local context remained `Offline` with zero conversation/Activity for at least ten seconds and issued zero exact projection requests.
- A fresh-open control requested the same exact task projection once and rendered its conversation/tool Activity correctly. This proved a real frontend late-hydration gap and justified the exact projection selection correction, but it did not prove that later live task events reached the browser.
- The delivered Electron candidate was then reproduced against its embedded backend on `http://127.0.0.1:29695` using configured `student_one` → task `student_two`, Codex runtime, and GPT-5.6 Luna. Selecting immediately loaded 1 conversation/1 Activity; by +30 seconds the exact backend projection contained 6/4, while the UI stayed `Offline`/1/1 through +60 seconds.
- The captured root Team WebSocket received 227 frames, including 221 configured `student_one` Agent frames, task activation, and two Team communication messages, but zero Agent frames whose `payload.agent_run_id` was the exact task AgentRun `student_two_64b95302c0324d69afc27fef4a55c912`. A new root snapshot reported that exact task Agent as `Idle`, proving the displayed `Offline` status was also stale.
- The packaged server contains the exact source defect: `MixedTaskAgentExecutionRegistry` permanently binds the task Agent handle to the preparation-only `retainedEvents` sink and only splices that array once during `releaseWork`; it never transitions to `this.options.publish` for post-durability events. Team communication uses a separate root service, explaining why messages appear in the Team pane while the Agent monitor stays stale.
- The task record itself is truthfully still `active`: the agent sent an ordinary message but never formally submitted a result. The runtime contract explicitly keeps ordinary messaging separate from task lifecycle, while the task agent's role handoff instruction directed it toward the ordinary handoff path and stop condition.
- Existing delegated-task requirements already require exact task AgentRun focus (`AC-052`) and truthful distinct status (`AC-054`); the supplied state is a regression of that established contract.

## Relevant Supplemental Task Artifacts

| Artifact Path | Type / Purpose | Related Requirement IDs | Related Acceptance-Criteria IDs | Status / Approval | Relationship To Requirements |
| --- | --- | --- | --- | --- | --- |
| `tickets/in-progress/task-agent-monitor-visibility/ui-ux-spec.md` | Intended task-monitor journey, visible dual-status treatment, exact-focus interaction, and non-happy-path states | R-001–R-011, R-013 | AC-001–AC-015, AC-017 | `Refined` / user-approved behavior; technical dependency corrected under SR-006 | Behavior-defining supplement; part of this requirements basis. |
| `tickets/in-progress/task-agent-monitor-visibility/investigation-evidence/live-node-8001/live-selection-comparison.json` | Machine-readable fresh-open comparison against the Docker backend | R-001–R-004, R-009 | AC-001–AC-003, AC-007, AC-010 | Evidence / approval N/A | Demonstrates exact parent-versus-task identities, statuses, events, GraphQL requests, and absence of browser errors. |
| `tickets/in-progress/task-agent-monitor-visibility/investigation-evidence/live-node-8001/configured-parent-selected.png` | Browser evidence with configured parent selected | R-001, R-009 | AC-007, AC-015 | Evidence / approval N/A | Establishes the legitimate `Offline`/empty parent state. |
| `tickets/in-progress/task-agent-monitor-visibility/investigation-evidence/live-node-8001/task-run-selected.png` | Browser evidence with exact task AgentRun selected | R-001–R-004, R-009 | AC-001–AC-003, AC-010 | Evidence / approval N/A | Establishes that the retained task monitor is renderable from node 8001 after fresh alignment. |
| `tickets/in-progress/task-agent-monitor-visibility/investigation-evidence/live-node-8001/deterministic-reproduction/deterministic-reproduction-summary.json` | Canonical live reproduction, exact store/backend comparison, clean-baseline configuration, production path, repeatability, and fresh-open control | R-001–R-004, R-007–R-009 | AC-001–AC-003, AC-007–AC-010, AC-012–AC-015 | Complete evidence / approval N/A | Resolves `ARCH-F-006`/`MP-006` and independently proves the false-empty first-inspection frontend defect; SR-006 additionally proves the live event-egress defect. |
| `tickets/in-progress/task-agent-monitor-visibility/investigation-evidence/live-node-8001/deterministic-reproduction/student-two-monitor-probe-round3-after-click.png` | Strongest deterministic visual reproduction after backend work/message/tool data already existed | R-001–R-007, R-010 | AC-001–AC-005, AC-008, AC-010–AC-012 | Complete evidence / approval N/A | Shows the exact task row selected with `student_two · Offline` and a blank center while the Team pane shows one message and `In progress`. |
| `tickets/in-progress/task-agent-monitor-visibility/investigation-evidence/live-node-8001/deterministic-reproduction/round2-fresh-open-control-after-click.png` | Fresh-open control for the same defect class | R-001–R-004, R-007, R-009 | AC-001–AC-003, AC-007–AC-010 | Complete evidence / approval N/A | Shows that full hydration masks the live-created-shell defect by loading/rendering the exact task projection. |
| `tickets/in-progress/task-agent-monitor-visibility/investigation-evidence/user-verification-electron-29695/user-verification-summary.json` and paired screenshots/backend state | User verification of the delivered Electron candidate | R-001–R-004, R-007, R-009, R-011, R-013 | AC-001–AC-003, AC-007–AC-008, AC-011–AC-015, AC-017 | Complete evidence / approval N/A | Proves the packaged candidate still renders two worked task AgentRuns as `In progress · Offline` with assignment-only monitors. |
| `tickets/in-progress/task-agent-monitor-visibility/investigation-evidence/user-verification-electron-29695/LIVE_EARLY_SELECT_SR006_A-summary.json` | Canonical SR-006 live timeline and WebSocket comparison | R-003–R-004, R-007–R-008, R-011, R-013 | AC-002–AC-003, AC-008, AC-014, AC-017 | Complete evidence / approval N/A | Proves early selection, backend growth, frozen UI state, and zero exact task-Agent Agent frames on the root Team stream. |
| `tickets/in-progress/task-agent-monitor-visibility/investigation-evidence/user-verification-electron-29695/LIVE_EARLY_SELECT_SR006_A-reconnect-status.json` | Root snapshot control after task work | R-004, R-013 | AC-002, AC-017 | Complete evidence / approval N/A | Proves the live handle is actually `Idle`; the stale `Offline` UI is not the backend's current status. |
| `tickets/in-progress/task-agent-monitor-visibility/investigation-evidence/user-verification-electron-29695/reproduce-live-selected-before-work.cjs` and compressed raw capture | Repeatable current-source renderer + packaged embedded-backend probe | R-003–R-004, R-007, R-011, R-013 | AC-002–AC-003, AC-008, AC-011, AC-017 | Complete evidence script/raw trace / approval N/A | Captures DOM/Pinia, exact GraphQL projections, screenshots, and every WebSocket frame for the supported sibling-task flow. |

## Design Health Assessment (Mandatory)

- Change posture: `Cross-boundary Bug Fix` with a bounded server event-egress correction and the already-reviewed frontend observability protections.
- Initial design issue signal: `Yes`.
- Root cause classification: primary `Local Implementation Defect` plus `Boundary Or Ownership Issue` in server task-Agent event publication; secondary proven frontend `Missing Invariant` in exact projection authority/hydration.
- Refactor posture: `Needed` — the approved design must remove the duplicate Team-focus patch path and replace the false hydration helper.
- Evidence basis: the early-selection experiment issued the implemented exact projection query at task creation and correctly rendered 1/1, yet the UI stayed 1/1 while the stored projection advanced to 6/4. The root stream contained no exact task-Agent Agent frames. Source and packaged JavaScript show the task handle's publisher remains permanently pointed at the preparation buffer after `releaseWork`. Fresh hydration/reconnect can mask the defect by rereading projection/status.
- Requirement or scope impact: preserve the reviewed exact-focus/hydration/status fixes and add the missing server event-egress spine. No prompt, tool, task-service policy, persistence, or lifecycle behavior changes. A polling workaround or Team-message-to-Agent-content inference is not acceptable because it would duplicate the canonical Agent event stream and still miss tasks that send no Team message.

## Recommendations

1. Replace the task-Agent preparation buffer's permanent sink with an explicit durability gate that withholds events before commit, drains them after `TASK_AGENT_ACTIVATED`, then forwards all future events directly and exactly once in order.
2. Retain exact `agentRunId` focus in the owning `AgentTeamContext.view` as the subject authority and derive history/navigation current-row projection from committed focus.
3. Retain explicit exact-run selection hydration for late inspection/recovery, with safe retained/live merge and honest loading/error states; do not use periodic polling as the normal live path.
4. Reconcile navigation topology after live task activation/snapshot/settlement and render formal task lifecycle plus Agent execution status together.
5. Add a real-backend regression that creates a sibling task, selects it before later work, and proves root-WebSocket Agent events and UI content/status continue advancing without reload/refocus. Include pre-durability/abort ordering tests at the server owner.

## Scope Classification (`Small`/`Medium`/`Large`)

`Medium`: the correction crosses one bounded server task-Agent event-egress owner, the root Team stream contract, frontend execution-view/hydration/presentation, and realistic browser/Electron-equivalent coverage. It changes no prompt, collaboration tool, task-service policy, persistence schema, or lifecycle transition.

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

- `UC-001` — A user selects a task Agent in an already-open live Team and sees that exact run across the full workspace without reload.
- `UC-002` — A user opens/restores a Team and selects either its configured Agent or a same-address task Agent without identity aliasing.
- `UC-003` — A task appears or the Team snapshot changes while the workspace is open; topology and focus remain coherent without stealing user focus.
- `UC-004` — A user can distinguish formal task lifecycle from current Agent execution status using visible text.
- `UC-005` — Exact task projection hydration loads retained conversation/Activity or exposes a recoverable loading/error/true-empty state.
- `UC-006` — A task Agent emits messages/tool activity or sends an ordinary handoff without a formal lifecycle transition; selecting that run still shows all retained/live task content and the truthful current lifecycle.
- `UC-007` — Repeated task AgentRuns at one logical address remain distinct and independently inspectable.
- `UC-008` — A task Agent created after the Team stream is connected emits status/turn/content/tool events; the already-open exact task monitor receives them continuously after activation durability without polling, reload, or refocus.

### Out of Scope

- Changing Agent prompts/system instructions, LLM reasoning or collaboration-tool choice, task submission/review policy, task-delegation target resolution, authorization, work packet content, or exact-run security.
- Automatically accepting a task when an assignee stops generating, becomes idle, sends a message, or claims completion.
- Retroactively inferring lifecycle transitions from historical ordinary messages or rewriting the observed active task record.
- Automatically focusing a newly activated task, changing settlement focus-repair policy beyond preserving a coherent valid selection, or redesigning the full workspace navigation.
- Changing stable configured Agent status semantics, general Agent execution status values, Activity retention/window policy, or task record schema.
- Redesigning the complete delegated-task detail/Team tab; this ticket only ensures consistent exact identity and the compact lifecycle/execution status needed in the execution tree/header.
- Docker node management, deployment, or release work beyond using node 8001 as a reproduction backend.

### Preserved Behavior Boundary

- Preserve BEH-005's existing Agent/prompt/tool/lifecycle behavior while making its emitted exact-run content visible, and preserve BEH-006's stable-parent/task-run isolation.
- Preserve existing exact task/run IDs, delegation authorization, task state machine, task detail history, configured topology, stream sequence validation/recovery, and valid settlement focus repair.
- Preserve current ordinary Agent/Team monitoring and keyboard activation unless explicitly constrained by R-010 and AC-011.
- `PB-001 — Standalone Agent projection-open preservation:` The shared Activity-adapter refactor shall preserve current standalone Agent history/open/recovery policy: an active subscribed context keeps its live conversation/Activity while merging allowed metadata/file changes; a replaceable projection is fully staged and committed before selection or stream connection.
- `PB-002 — Task activation durability gate:` No task-Agent event or work may escape before execution-tree/task-record activation is durable and `TASK_AGENT_ACTIVATED` is published. A failed/aborted preparation publishes nothing and does not start the task. After release, buffered and new Agent events preserve one root change-sequence order and are never duplicated or stranded.

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID that it protects.
- A finding that would introduce new product behavior, policy, threat model, migration obligation, or operational contract is a `Requirement Gap`; it must return for explicit user approval before becoming authoritative.
- An adjacent concern outside the approved boundary may be recorded as a non-blocking risk, recommendation, or separate-ticket candidate. It must not be treated as a required design correction.
- A downstream reviewer comment does not amend this requirements basis. The solution designer must update the canonical requirements and obtain renewed user approval before a scope-changing proposal can govern design or implementation.

## Functional Requirements

- **R-001 — Exact focused-run invariant:** For a selected Team, one successfully committed exact `agentRunId` shall determine the current execution row, workspace header, conversation/event monitor, Activity data, token/artifact run scoping where already focus-dependent, and task-context presentation. No surface may independently retain a conflicting focused AgentRun.
- **R-002 — Atomic selection:** Selecting a focusable task/configured Agent row shall validate that the exact AgentRun belongs to the selected root TeamRun, ensure required monitor projection state is available, and then commit focus/current-row state as one observable success. A rejected or failed operation shall not mark the target row current or update selected-member metadata.
- **R-003 — Exact task projection hydration:** When the exact task Agent context is locally present but its retained projection is not authoritatively hydrated, selection shall fetch the existing `GetTeamMemberRunProjection(teamRunId, agentRunId)` contract, validate exact identity, merge retained conversation and Activity safely with newer live state, and expose loading/success/error state to the selecting surface.
- **R-004 — Live and recovery convergence:** Task activation, task settlement, root execution snapshot, stream recovery/reopen, and full history hydration shall refresh the navigation topology from the current execution view and reconcile focus. They shall preserve the current exact AgentRun when it remains visible and shall not require full page/application reload.
- **R-005 — Dual status presentation:** Each task Agent row shall present formal task lifecycle and Agent execution status as separate visible labels. The display lifecycle shall be derived from the existing record: `active` with a latest revision-request review maps to `Revision requested`; other `active` maps to `In progress`; `awaiting_review`, `accepted`, and `interrupted` map to `Awaiting review`, `Accepted`, and `Interrupted`. Execution uses the existing Agent status labels.
- **R-006 — Selected task context:** When an exact task AgentRun is focused, the header shall visibly identify it as a task and show its Agent execution status; the associated lifecycle label and full task description shall remain discoverable without exposing internal IDs.
- **R-007 — Task-content visibility independent of tool choice:** The exact task AgentRun monitor shall display all retained and subsequently streamed conversation and Activity belonging to that run, including tool calls, completed output, and ordinary inter-Agent handoffs, without requiring `submit_task_result`, `awaiting_review`, or any other lifecycle transition.
- **R-008 — Backend and Agent behavior preservation:** This change shall not alter system/user prompts, collaboration tools, LLM tool-selection behavior, task submission/review semantics, task persistence, or lifecycle transitions. The bounded server change may only correct delivery of already-defined task-Agent events into the existing root Team publisher; the frontend shall not infer completion from message text, `Idle`, or emitted output.
- **R-009 — Identity and focus isolation:** Configured AgentRuns and every task AgentRun at the same logical address shall retain separate context, status, conversation, Activity, and lifecycle associations. New task activation shall not steal focus. Repeated tasks shall remain distinct by exact run identity.
- **R-010 — Honest accessible states:** Current-row, loading, error, empty, lifecycle, and execution status shall be conveyed with visible text and appropriate accessible semantics, not color or spinner/dot appearance alone. Exactly one visible execution row may expose `aria-current="true"` for the selected Team member.
- **R-011 — Platform parity:** The exact-focus, hydration, and status behavior shall be the same in the browser-equivalent frontend and Electron client when connected to embedded or configured remote/Docker nodes.
- **R-013 — Post-durability task-Agent event egress:** Direct task-Agent preparation shall buffer events until durable activation. After `TASK_AGENT_ACTIVATED` is published, the same event boundary shall drain buffered events and forward every later task-Agent `TeamAgentEvent` to the root Team publisher exactly once and in order. Abort shall discard the buffer and start no work. Root change sequencing, DTO projection, AgentRun identity, Team isolation, and lifecycle policy remain owned by their existing services.

## Acceptance Criteria

- **AC-001:** If the task row for `prototype_bootstrapper_59372829f6294393b6f83bb80a293260` is `aria-current="true"`, the header status, conversation/event monitor run ID, Activity query/store scope, and all focus-dependent surfaces resolve that same exact AgentRun, never `prototype_bootstrapper_ae508a8a05114e4aa2345f66ba9c1848`.
- **AC-002:** The exact-focus invariant passes both a fresh-open node-8001 journey and an already-open Team journey in which the task arrives or navigation state is refreshed after initial render; neither journey requires application reload.
- **AC-003:** With a live task context present but retained conversation/Activity not yet hydrated, selecting the task displays a loading state, requests the exact task projection, and then renders its retained work plus every subsequently received exact task-Agent live event without duplication or loss.
- **AC-004:** An `active + Running` task visibly reads `In progress · Running`; `active + Idle` reads `In progress · Idle`; neither is described as completed. After formal submission, the same execution visibly reads `Awaiting review · <execution status>` while it remains navigable.
- **AC-005:** The selected task header includes a visible `Task` marker, the logical Agent name, and execution status, while the full task description is accessible by title/label or nearby task context and internal task/run IDs remain hidden.
- **AC-006:** If exact projection fetch/validation fails, the previous coherent selection remains current and rendered; the target does not become `aria-current`, and the user sees `Couldn’t load task activity. Retry` (localized equivalent) with a working retry.
- **AC-007:** Selecting the configured parent shows its legitimate `Offline`/empty state; selecting its task child shows the task run's own status and retained monitor. Switching repeatedly never transfers data between contexts.
- **AC-008:** The observed task AgentRun renders its retained work, tool calls, completion output, and ordinary `send_message_to` handoff even while the formal task record remains `active` with no submission updates.
- **AC-009:** Live task activation adds/updates the execution row without changing the user's focused AgentRun. If settlement removes the currently focused task, existing valid focus repair selects a visible fallback and all surfaces converge on it.
- **AC-010:** After successful authoritative hydration with no retained or live events, the exact task monitor says `No activity recorded for this task yet.` (localized equivalent). It does not show the generic false-empty state while loading or after an error.
- **AC-011:** Keyboard Enter/Space selection follows the same atomic focus/hydration path as pointer selection; lifecycle and execution status are present in the accessible name; current selection is not represented by color alone; exactly one visible member row is current.
- **AC-012:** Task monitor visibility is not gated by raw or derived lifecycle status: `active`, `awaiting_review`, revision-requested, accepted, and interrupted records use the same exact-run conversation/Activity selection rules wherever the execution remains inspectable.
- **AC-013:** An ordinary message containing “finished”, “accepted”, “complete”, or similar wording remains visible in the exact task monitor but does not cause the frontend to change or relabel the backend-provided task lifecycle.
- **AC-014:** The implementation contains no server prompt, collaboration-tool, task-delegation policy/service, persistence, or lifecycle-state change. The only server behavior change is the `MixedTaskAgentExecutionRegistry` event gate forwarding already-defined post-durability Agent events to the existing root publisher; existing lifecycle semantics remain behaviorally unchanged.
- **AC-015:** Two task AgentRuns delegated to the same logical Agent address render as two distinct task rows; selecting either focuses and hydrates only its exact AgentRun while the configured parent remains separate.
- **AC-017:** In a real-backend already-open Team using Codex runtime and GPT-5.6 Luna, configured `student_one` delegates a marked task to configured `student_two`; the task row is selected before later work. The root Team WebSocket emits `TASK_AGENT_ACTIVATED` before any exact task-Agent Agent event, then emits exact-ID status/turn/content/tool events. Without reload/refocus, the selected UI advances beyond the assignment snapshot and ends with the same conversation/Activity content and current execution status available from the exact projection/root snapshot. A failed pre-durability activation emits none of those task-Agent events and starts no work.

## Constraints / Dependencies

- The current GraphQL exact projection and Team stream contracts are available and shall be reused rather than replaced with polling or a second task-monitor API. The existing Team stream contract already defines task-Agent Agent-event DTOs; the defect is that the task registry never hands its publisher over after durability.
- The task lifecycle state machine and formal collaboration tools remain the authority; UI labels may interpret existing status values but may not infer lifecycle from Agent status or message text.
- Retained projection/live-event merge must respect existing event identity/order/window rules and stream sequence recovery.
- Node `http://127.0.0.1:8001` is the authoritative reported-data reproduction target; frontend implementation must not hard-code that node or the observed IDs.
- Frontend dependencies are installed in the dedicated worktree; the temporary Nuxt process used for investigation was stopped.
- Clean-cut correction only: do not add a parallel focus store, compatibility fallback, projection polling loop, Team-message-to-Agent-Activity inference, task-data copy onto configured parents, or lifecycle heuristic.

## Persisted Data Outcome (When Applicable)

- Stored subject / location: Team `execution_tree.json`, `task_delegation_records.json`, Team communication history, per-AgentRun raw traces/projections, and existing frontend-readable DTOs.
- Required outcome: `Directly Usable — No Migration`.
- Existing data to preserve, discard/rebuild, transform, or quarantine: preserve all existing records and exact IDs as-is; no data is discarded, transformed, or quarantined.
- Unacceptable data loss or corruption: loss/reordering of task updates, messages, projections, activities, execution containment, exact identities, or timestamps; cross-assignment of one AgentRun's monitor data to another; retroactive status mutation based on ordinary text.
- Relevant availability, maintenance-window, or rollout constraints: no maintenance window or storage rewrite; normal application upgrade only.
- Related requirement and acceptance-criteria IDs: R-009; AC-007, AC-013, AC-015. The `Directly Usable — No Migration` outcome above remains authoritative; no additional functional ID is created for it.

## Assumptions

- “Finished” in the user report means the bootstrapper completed and handed off its work output, not that the formal task state reached `accepted`.
- The right-side “Activity” area and center conversation/event monitor are both part of the focused-run experience and must share exact identity.
- `Idle` is a valid Agent execution state after a turn and may coexist with any live task lifecycle state that permits the execution to remain navigable.
- Compact dual status in the task row/header is acceptable if the full task description remains accessible and the tree does not expose internal IDs.

## Risks / Open Questions

- The current delivered failure is deterministically replayed by selecting a newly created task immediately: an exact 1/1 projection snapshot is loaded, the backend grows to 6/4, and the UI stays 1/1 because the root Team stream receives no exact task-Agent Agent events. Snapshot/recovery and fresh-open remain masking/recovery controls, not substitutes for the live-event proof.
- Mounted-context projection application must be guarded by exact Team/Agent context identity, the event-monitor presentation revision, and the Activity-store content revision; detected concurrent mutation retries or fails visibly rather than overwriting newer live state.
- The server durability gate must preserve activation-before-Agent-event ordering under synchronous/reentrant publication and abort. Agent prompt clarity and stochastic tool choice may still affect formal lifecycle, but remain outside this ticket.

## Requirement-To-Use-Case Coverage

| Requirement IDs | Covered Use Cases |
| --- | --- |
| R-001–R-004 | UC-001–UC-003, UC-005, UC-007–UC-008 |
| R-005–R-006, R-010–R-011 | UC-001–UC-005, UC-007 |
| R-007–R-008 | UC-006 |
| R-009 | UC-001–UC-003, UC-007 |
| R-013 | UC-001, UC-003, UC-006, UC-008 |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criteria | Scenario Intent |
| --- | --- |
| AC-001–AC-002 | Exact-focus regression in fresh and already-open/live Team sessions |
| AC-003, AC-006, AC-010 | Late exact projection hydration: success, failure/retry, and true empty |
| AC-004–AC-005, AC-011 | Visible/accessibly distinct task lifecycle, execution status, and task context |
| AC-007, AC-015 | Stable parent/task isolation and repeated same-address task identity |
| AC-008, AC-012–AC-014 | Exact task-content visibility independent of lifecycle/tool choice, with backend behavior preserved |
| AC-009 | Live activation focus preservation and settlement repair convergence |
| AC-017 | Real-backend post-durability task-Agent event delivery and early-selection UI convergence |

## Approval Status

Initial requirements/UI behavior were approved on 2026-08-31. The user then explicitly refined the behavior boundary: fix why the task monitor does not display exact task Agent messages/activity; do not change or evaluate Agent prompt clarity, LLM tool choice, collaboration tools, or backend lifecycle behavior. After the delivered Electron candidate still failed, the user explicitly rejected the earlier solution design and directed renewed reproduction, analysis, and correction. SR-006 preserves the same product behavior and prompt/tool/lifecycle exclusions while correcting the technical scope: the proven server task-Agent event-egress defect is part of the display pipeline and must be fixed alongside the frontend recovery/inspection protections.
