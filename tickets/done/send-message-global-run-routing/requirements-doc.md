# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Design-ready — revised on 2026-06-12 after the user clarified the simplifying rule: `target_agent_run_id` delivery is only for a currently live/active `AgentRun`.

This revision supersedes both earlier design shapes:

- the original grant-first routing idea; and
- the broader global address-directory/team-claim design that would have routed to lazy team members or recoverable task agents.

`DirectAgentRunMessageGrant` remains in scope only as an optional narrowing policy for server-launched helper runs such as Skill Self-Evolver. It must not create, discover, restore, or route targets.

## Goal / Problem Statement

`send_message_to` must keep one public tool while supporting two clearly separated selector meanings:

1. `recipient_name`: a team-local roster alias. This selector is valid only when the sender has `MemberTeamContext` and continues through the team delivery owner.
2. `target_agent_run_id`: an exact globally unique `AgentRun.runId`. This selector is a live direct-run route and must resolve only through `AgentRunManager.getActiveRun(targetRunId)`.

The platform now centralizes AgentRunId allocation on `origin/personal`, so exact run-id addressing can be global. The target must still be live at delivery time. If the target run is unknown, terminated, inactive, only preallocated, lazy-startable, or only recoverable from task-agent state, direct exact-run delivery must fail closed.

This enables standalone helpers such as Skill Self-Evolver to send a detailed final outcome to the active target run by exact id, while avoiding a complex global registry that scans teams or resurrects old/lazy targets.

## Investigation Findings

- Latest tracked base inspected: `origin/personal` at `e76f16b3301e2003f3c715d0ff86661a8a3dbde1` (tag `v1.3.53`). The ticket worktree `HEAD` remains `d0bf457a43aa66a00b895e30d78f461bb496b58c` and is behind because implementation had already started and left partial uncommitted draft code; this design pass inspected baseline files from `origin/personal` with `git show` and treats draft implementation changes as non-authoritative.
- `AgentRunIdentityAllocator` allocates agent run ids and checks collisions across active standalone runs, standalone metadata, standalone memory dirs, team run ids, team member metadata trees, and team member run memory dirs.
- `AgentRunManager.createAgentRun(config, agentRunId)` requires the caller-provided normalized run id, rejects duplicate active ids, passes it to the backend, and verifies the backend returned that id.
- `AgentRunManager.getActiveRun(runId)` is the live registry lookup. It returns `null` for missing runs and unregisters inactive runs before returning `null`.
- Team member run ids are preallocated at team launch, but the actual member `AgentRun` is created later in `MixedAgentMemberHandle.ensureReady()` with `AgentRunManager.createAgentRun(memberRunConfig, memberRunId)`. Therefore a preallocated team member id is not necessarily a live direct-message target.
- Current `send_message_to` is team-bound: shared parser/contract files live under `agent-team-execution`, AutoByteus execution requires `MemberTeamContext`, and Codex/Claude exposure is built only by team-member bootstrap paths.
- Current team `target_agent_run_id` behavior includes active/recoverable task-agent feedback and Team Communication projection. That behavior is more than live direct-run routing and should not be copied into the global direct route.
- The frontend Self Evolution CTA is shown for selected active standalone runs and focused active team-member runs. It sends `runId` for standalone targets and `teamRunId + memberRunId` for team-member targets.
- Current self-evolution target resolution can resolve from metadata; the start path must add a live-target check so stale metadata alone cannot launch a helper that is expected to message a dead target.
- Current Skill Self-Evolver has only `run_bash`; completion uses a generic `SYSTEM_TASK_NOTIFICATION` for active idle standalone targets rather than a helper-authored outcome message with references.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Larger Requirement / Feature / Refactor
- Initial design issue signal (`Yes`/`No`/`Unclear`): Yes
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue; Duplicated Policy Or Coordination; File Placement Or Responsibility Drift; Legacy Or Compatibility Pressure
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Likely Needed
- Evidence basis: exact run ids are globally allocated, but `send_message_to` exact-run routing remains team-owned and team-described. Preserving old recoverable/lazy team exact-run behavior under global `target_agent_run_id` would keep dual semantics and require a broad target directory. The user clarified that exact-run targets must be live, so the authoritative lookup is `AgentRunManager.getActiveRun`.
- Requirement or scope impact: move shared tool contract/parser/dispatcher into a generic `agent-communication` capability, keep `agent-team-execution` authoritative for `recipient_name`, implement the global exact-run route as active-run-only, expose the tool for standalone configured agents, and update Skill Self-Evolver to report through the same live direct route.

## Recommendations

1. Keep one public tool name: `send_message_to`.
2. Keep exactly-one selector validation: `recipient_name` OR `target_agent_run_id`, never both.
3. Use selector-first routing:
   - `recipient_name` -> team route; requires `MemberTeamContext`; may use existing lazy member/team projection behavior.
   - `target_agent_run_id` -> global live direct-run route; does not require `MemberTeamContext`; requires `AgentRunManager.getActiveRun(targetRunId)` to return a live run.
4. Make `target_agent_run_id` mean canonical globally unique `AgentRun.runId`, not a team-local alias and not a provider/platform id.
5. Remove the proposed global address directory/team-claim lookup from this ticket. The global direct route should not query `AgentTeamRunManager`, team rosters, task-agent recovery caches, or metadata trees.
6. Deliver global direct messages by posting a model-visible `AgentInputUserMessage` to the active target `AgentRun` and emitting a direct `INTER_AGENT_MESSAGE` event for that target run.
7. Do not synthesize Team Communication projection for the global direct route. Team Communication remains owned by the `recipient_name` team route.
8. Expose `send_message_to` to standalone AutoByteus, Codex, and Claude runs when the configured agent definition includes the tool name.
9. Keep `DirectAgentRunMessageGrant` as an optional policy overlay for server-created helpers. It can narrow target id, message types, reference roots/paths, delivery count, and expiry; it cannot resolve inactive targets or replace active-run lookup.
10. Update Skill Self-Evolver so the helper receives `send_message_to`, receives the target run id, and is instructed to send one final `self_evolution_outcome` message when it has a meaningful outcome.
11. Re-check the self-evolution target is live at start and rely on the router to re-check liveness again at final delivery.

## Scope Classification (`Small`/`Medium`/`Large`)

Large.

The live-only rule removes the broad target-directory/team-claim design, but the change still crosses shared tool contract ownership, runtime-specific tool exposure for AutoByteus/Codex/Claude, active-run direct delivery, optional helper policy grants, self-evolution prompt/record behavior, and executable coverage updates.

## In-Scope Use Cases

- UC-001: Preserve team-local `send_message_to({ recipient_name, ... })` behavior and Team Communication projection.
- UC-002: Treat `send_message_to({ target_agent_run_id, ... })` as global exact active-run addressing.
- UC-003: Allow standalone configured agents to use `send_message_to` with exact `target_agent_run_id`.
- UC-004: Allow a configured team member to send by exact run id to any currently active `AgentRun`, including active standalone runs and active team-member/task-agent runs.
- UC-005: Reject exact-run targets that are unknown, inactive, terminated, only preallocated, lazy-startable but not live, or only recoverable.
- UC-006: Allow Skill Self-Evolver helper runs to send a final outcome message to the active target run by exact `target_agent_run_id`.
- UC-007: Carry explicit `reference_files` through direct global messages using absolute-path validation and optional grant restrictions.
- UC-008: Reject ambiguous/malformed selector input and policy-denied helper deliveries with typed failures.
- UC-009: Record self-evolution outcome truthfully when the target becomes inactive before helper delivery.

## Out of Scope

- Further refactoring of AgentRunId generation; this ticket consumes the allocator already merged on `origin/personal`.
- Global run discovery/listing/search APIs for agents.
- `target_agent_id`, agent-definition-name routing, route-key aliases, or provider/platform id routing.
- Offline durable inbox, queued delivery to terminated runs, metadata-only delivery, lazy team-member startup by exact id, or task-agent recovery by exact id.
- New global registry that scans `AgentTeamRunManager` or team metadata for non-live targets.
- New multi-tenant/user ACL model. The design leaves a policy boundary for future user scopes but does not invent an incomplete ACL here.
- General UI redesign of Team Communication or global message history panels.
- Changing task-delegation lifecycle semantics (`submit_task_result`, `review_task_result`, settlement). Existing task tools remain their own channel.

## Functional Requirements

- REQ-001: `send_message_to` must remain one public tool with canonical fields `recipient_name`, `target_agent_run_id`, `content`, `message_type`, and `reference_files`.
- REQ-002: `send_message_to` must continue to reject calls that provide both selectors, neither selector, empty `content`, unsupported selector aliases (`recipient`, `recipientName`, `targetAgentRunId`), or malformed `reference_files`.
- REQ-003: `recipient_name` must remain a team-local roster selector and must require `MemberTeamContext` plus a team delivery handler.
- REQ-004: `target_agent_run_id` must be interpreted as a globally unique canonical `AgentRun.runId` allocated or accepted by the server-side identity model.
- REQ-005: Branch selection must be selector-based: `recipient_name` uses the team route; `target_agent_run_id` uses the global live direct-run route.
- REQ-006: The global exact-run route must resolve targets only through `AgentRunManager.getActiveRun(targetAgentRunId)`.
- REQ-007: The global exact-run route must fail closed with a typed inactive/not-found result when `getActiveRun` returns `null`.
- REQ-008: The global exact-run route must not call `AgentTeamRunManager`, team recipient resolvers, team member lazy-start APIs, task-agent recovery caches, or metadata-only lookup to make a target reachable.
- REQ-009: The global exact-run route must post a model-visible input to the active target run and emit a direct `INTER_AGENT_MESSAGE` event whose payload identifies sender run id/name, target run id, content, message type, reference files, and creation time.
- REQ-010: Global direct `INTER_AGENT_MESSAGE` payloads must not include or synthesize Team Communication records unless a future explicit feature designs such a projection.
- REQ-011: Existing team `recipient_name` delivery must retain roster resolution, lazy member lifecycle, task-agent behavior reachable through the team route, and Team Communication projection after accepted recipient input.
- REQ-012: Standalone AutoByteus, Codex, and Claude runtime bootstraps must expose `send_message_to` when the agent definition includes the tool name.
- REQ-013: Runtime tool handlers must bind a sender context containing at least sender run id, sender name/label when available, runtime kind when available, and optional `MemberTeamContext`; they must not infer sender identity from the target id.
- REQ-014: Shared parser/contract/reference-file normalization must move from team-specific ownership into a generic `agent-communication` owner.
- REQ-015: `DirectAgentRunMessageGrant` must remain available as an optional policy overlay, keyed to a sender run and purpose, that can narrow allowed target id, message types, reference roots/paths, delivery count, and expiry.
- REQ-016: When a sender has an active direct message grant, the global router must enforce that grant before delivery and record accepted/rejected usage for server-owned helper scenarios.
- REQ-017: The Skill Self-Evolver built-in agent definition must include `send_message_to` in addition to `run_bash`.
- REQ-018: The Skill Self-Evolver task prompt must include the target `agentRunId` and instruct the helper to call `send_message_to` exactly once at the end with `message_type: "self_evolution_outcome"` when it has a meaningful outcome to report.
- REQ-019: The self-evolution start path must require the target run to be live at start: standalone targets via `AgentRunManager.getActiveRun(runId)` and team-member targets via `AgentRunManager.getActiveRun(memberRunId)`.
- REQ-020: Self-evolver reference files must remain absolute paths and, when a grant is present, must be constrained to editable skill targets or other grant-approved paths.
- REQ-021: Self-evolution completion records must summarize whether an outcome message was sent, rejected, skipped, not attempted, or failed because the target was no longer active.
- REQ-022: The old generic `SYSTEM_TASK_NOTIFICATION` success path must not duplicate a successful helper-authored `send_message_to` outcome.
- REQ-023: All production creation paths for new agent runs in this change must continue using existing `AgentRunIdentityAllocator` / team run id owners; no new local id generator may be introduced.

## Acceptance Criteria

- AC-001: Parser/selector tests pass and cover canonical selector names, exactly-one validation, alias rejection, content validation, and absolute `reference_files` validation under the new shared path.
- AC-002: Existing team `recipient_name` delivery tests pass unchanged in behavior, including Team Communication projection only after recipient input acceptance.
- AC-003: Existing team exact-run tests are updated for live-only semantics: active target ids deliver through the direct route, while recoverable, settled, unknown, or only preallocated target ids fail with a typed target-not-active/not-found result.
- AC-004: A standalone configured AutoByteus run with `toolNames: ["send_message_to"]` receives a usable bound tool and can send to an active target run id.
- AC-005: A standalone configured Codex run receives a dynamic `send_message_to` tool and can invoke the global active-run route.
- AC-006: A standalone configured Claude run receives the equivalent MCP/tool definition and can invoke the global active-run route.
- AC-007: A direct exact-run delivery to an active standalone target posts a model-visible `AgentInputUserMessage` and emits a direct `INTER_AGENT_MESSAGE` payload with no `team_run_id`.
- AC-008: A direct exact-run delivery to an active team member run succeeds without asking `AgentTeamRunManager` to claim the id and without creating a Team Communication record.
- AC-009: A preallocated but never-started team member run id returns a typed target-not-active/not-found failure and does not lazy-start the member.
- AC-010: A recoverable but inactive task-agent run id returns a typed target-not-active/not-found failure and does not restore the task agent.
- AC-011: A call with `recipient_name` from a standalone sender fails with a clear team-context-required error.
- AC-012: A direct-granted self-evolver helper can send one `self_evolution_outcome` message only to the granted active target run id.
- AC-013: A direct-granted helper is rejected for wrong target id, disallowed message type, expired/exhausted grant, disallowed reference path, or inactive target.
- AC-014: Self-evolution start rejects a stale/inactive target even if metadata exists.
- AC-015: A successful self-evolver outcome updates the self-evolution record summary as sent and avoids duplicate generic `SYSTEM_TASK_NOTIFICATION` success notification.
- AC-016: A completed self-evolution run whose helper never calls `send_message_to` records a not-attempted/skipped outcome rather than falsely reporting sent.
- AC-017: A self-evolution helper whose target terminates before final delivery records target-inactive/send-failed rather than sent.
- AC-018: Built-in Skill Self-Evolver config includes both `run_bash` and `send_message_to`.
- AC-019: No new production code path generates agent run ids outside `AgentRunIdentityAllocator` / existing team run id owners.
- AC-020: API/E2E coverage investigation explicitly classifies existing team send-message coverage as still valid or needing updates, and adds durable coverage for standalone/global active exact-run delivery plus inactive-target rejection.

## Constraints / Dependencies

- Latest tracked base inspected for this revision: `origin/personal` at `e76f16b3301e2003f3c715d0ff86661a8a3dbde1`.
- The ticket worktree contains paused incomplete implementation changes and is not a trustworthy implementation state.
- The global AgentRunId allocation refactor is a prerequisite and is present on `origin/personal`.
- `AgentRunManager` is the authoritative active run registry for live exact-run delivery.
- `agent-team-execution` remains the authoritative owner for team roster aliases and Team Communication.
- AutoByteus, Codex, and Claude runtime adapters must remain provider-specific wrappers around shared dispatcher semantics.

## Assumptions

- Agent run ids are unique within the current server/memory-root scope because of the merged allocator and `AgentRunManager` active duplicate rejection.
- A target id known to an agent is sufficient to attempt delivery, but not sufficient to force delivery; target liveness and optional grant policy still decide.
- For this ticket, exact run-id messaging is server-local/in-process. Distributed routing or cross-process lookup is not designed here.
- Users trigger Skill Self-Evolver from UI surfaces representing active targets, but backend checks are still required because UI state can be stale.

## Risks / Open Questions

- Risk: global exact-run messaging is broad because any configured sender with a known active run id can attempt delivery. Mitigation: no discovery, exact id only, active-run requirement, optional policy grants, typed failures, and future ACL boundary left explicit.
- Risk: removing recoverable/lazy exact-run behavior can break existing tests or callers that used `target_agent_run_id` as a team-private recovery route. Mitigation: `recipient_name` remains the team semantic route; tests and tool descriptions must be updated to the new active-only semantics.
- Risk: direct messages to active team members will not create Team Communication records. Mitigation: document the distinction; use `recipient_name` when Team Communication projection is desired.
- Open question for future tickets: whether global direct messages need a UI history/projection distinct from Team Communication.

## Requirement-To-Use-Case Coverage

| Requirement ID | Covered Use Case(s) |
| --- | --- |
| REQ-001 | UC-001, UC-002 |
| REQ-002 | UC-008 |
| REQ-003 | UC-001 |
| REQ-004 | UC-002, UC-003, UC-004 |
| REQ-005 | UC-001, UC-002 |
| REQ-006 | UC-002, UC-005 |
| REQ-007 | UC-005 |
| REQ-008 | UC-005 |
| REQ-009 | UC-002, UC-003, UC-004, UC-006 |
| REQ-010 | UC-002, UC-004 |
| REQ-011 | UC-001 |
| REQ-012 | UC-003, UC-004, UC-006 |
| REQ-013 | UC-002, UC-003, UC-004 |
| REQ-014 | UC-001, UC-002 |
| REQ-015 | UC-006, UC-007, UC-008 |
| REQ-016 | UC-006, UC-007, UC-008 |
| REQ-017 | UC-006 |
| REQ-018 | UC-006 |
| REQ-019 | UC-009 |
| REQ-020 | UC-007 |
| REQ-021 | UC-006, UC-009 |
| REQ-022 | UC-006 |
| REQ-023 | UC-002, UC-003, UC-004 |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criteria ID | Scenario Intent |
| --- | --- |
| AC-001 | Protect the shared public tool contract. |
| AC-002 | Ensure existing team alias delivery remains stable. |
| AC-003 | Convert exact-run team coverage to live-only semantics. |
| AC-004 | Validate standalone AutoByteus exposure and delivery. |
| AC-005 | Validate standalone Codex exposure and delivery. |
| AC-006 | Validate standalone Claude exposure and delivery. |
| AC-007 | Validate direct active standalone target delivery. |
| AC-008 | Validate active team-member exact id is a direct run route, not team projection. |
| AC-009 | Validate no lazy team-member startup by exact id. |
| AC-010 | Validate no recoverable task-agent restore by exact id. |
| AC-011 | Validate `recipient_name` is still team-only. |
| AC-012 | Validate self-evolver successful exact target outcome. |
| AC-013 | Validate grant and active-target enforcement. |
| AC-014 | Validate live target requirement at self-evolution start. |
| AC-015 | Validate truthful success summary and no duplicate generic notification. |
| AC-016 | Validate no false sent state when helper does not call the tool. |
| AC-017 | Validate target died during helper run. |
| AC-018 | Validate built-in helper tool configuration. |
| AC-019 | Validate no id-generation regression. |
| AC-020 | Drive downstream coverage investigation and execution. |

## Approval Status

User direction recorded on 2026-06-12: revise the design so `target_agent_run_id` requires the target `AgentRun` to be live/active. This requirements basis is ready for architecture review.
