# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Design-ready — the original Codex basis and the refined Claude Agent SDK scope expansion were explicitly approved by the user on 2026-08-17.

## Goal / Problem Statement

Restore provider-session continuity for persisted Codex- and Claude-Agent-SDK-backed conversations on `origin/codex/agent-team-universal-task-delegation`. An agent-team conversation that is reopened after a full server/application restart must continue through the same external provider thread/session rather than displaying old local messages while silently creating a context-free replacement. Standalone external-provider runs must likewise hold a valid provider-native identity before restart continuity is relied upon.

The primary defect is in the new V1 TeamRun persistence path: it learns provider-native identities only inside mutable runtime-member contexts and never commits those bindings into the authoritative execution tree. Claude exposes a second timing defect: fresh creation initially publishes the local AgentRun ID as a provider-session placeholder and learns the real UUID only after the first provider stream begins. This requirements basis covers the general persisted team-agent binding invariant exposed by both providers, the Claude creation contract needed to make that invariant durable before input, standalone external-provider continuity, and preservation of native Autobyteus-runtime behavior.

## Current And Desired Behavior (Mandatory)

| Behavior ID | Current Behavior | Desired Behavior | Preserved / Unchanged Behavior | Related Requirement / Acceptance-Criteria IDs |
| --- | --- | --- | --- | --- |
| BEH-001 | A configured Codex team member creates a provider thread and completes turns, but its authoritative TeamRun node remains `platformAgentRunId: null`. After restart, the same local AgentRun ID creates a different Codex thread. | The first established provider ID is durably adopted by the matching authoritative execution-tree node and is used to restore that exact provider thread after restart. | The TeamRun ID, AgentRun ID, configured member identity, and normal conversation flow remain stable. | REQ-001, REQ-002; AC-001, AC-002, AC-004 |
| BEH-002 | Persisted local history is restored and displayed after restart even though the provider thread is not resumed. | Local history and provider continuation are both restored; visible history must not be used as a false signal that provider context was resumed. | Existing message visibility, order, and content remain unchanged. | REQ-007; AC-003 |
| BEH-003 | Both configured-agent and delegated task-agent execution-tree nodes have a provider-binding field, but the active runtime may update only its detached mutable context. | Every persisted external-provider team-agent execution adopts its provider binding through the same root-owned durable invariant, regardless of whether it is configured or created for a delegated task. | Native runtimes without a provider-native ID remain valid with a null binding. | REQ-003; AC-005 |
| BEH-004 | Standalone Codex AgentRuns persist `platformAgentRunId`, reconstruct a Codex runtime context from it, and request provider-thread restoration. | Standalone restoration continues to use its persisted provider ID without regression. | Standalone AgentRun persistence and restoration remain outside the team-tree ownership change. | REQ-008; AC-009 |
| BEH-005 | A genuinely fresh external-provider AgentRun with no prior provider binding creates a new provider thread. | Fresh runs continue to create a new provider thread and durably record the resulting binding before later restart-based continuation is relied upon. | No identifier is invented or guessed. | REQ-004; AC-006 |
| BEH-006 | When Codex `thread/resume` fails for a known persisted thread ID, the Codex adapter catches the failure and silently starts a new thread. | Failure to resume a known persisted provider thread is surfaced as an observable continuation failure; it must not silently replace the required context with a new thread. | Explicit creation remains available only for genuinely fresh runs. | REQ-005, REQ-006; AC-007, AC-008 |
| BEH-007 | A configured Claude team member completes a turn on a provider UUID, but its authoritative node remains null. Restart creates a second UUID, even while local history displays the earlier turn. | Fresh Claude execution obtains one valid UUID before it is released for input, durably binds it to the authoritative node, uses it to create the first SDK session, and resumes that exact UUID after restart. | Claude model selection, streaming, tools, local history, and normal same-process turns remain unchanged. | REQ-001 through REQ-004, REQ-009, REQ-010; AC-010 through AC-014 |
| BEH-008 | A fresh standalone Claude run initially persists its local AgentRun ID as `platformAgentRunId`; the provider UUID is learned asynchronously and may not be persisted before abrupt process loss. | Standalone Claude metadata holds the same valid UUID that is used for first-session creation and later resume, without depending on a later event or graceful termination. | Existing standalone AgentRun identity, history, lifecycle, and workspace behavior remain unchanged. | REQ-009, REQ-010, REQ-011; AC-014, AC-015 |

## Investigation Findings

- The issue was reproduced through the real web UI with the requested `classroom-simulation-team`, `codex_app_server`, and `gpt-5.6-luna` against an isolated disposable database.
- Before restart, professor AgentRun `professor_6ae1faec0bc64239bb81d85caa39a5ad` used Codex thread `01a0104a-2dd9-7bd2-92f9-70a704a4dbf5`; after restart the same local AgentRun used a new thread, `01a0104c-1a48-7af2-a8bc-d9cb94e4ed12`.
- The persisted professor execution-tree node was `platformAgentRunId: null` both before and after restart. The server log recorded creation, not restoration, on both sides of the restart.
- The browser correctly reloaded the earlier marker exchange, but the post-restart request for the marker returned `codex-runtime-thread-resume-fix` instead of `COBALT-RIVER-9173`. The problem is provider continuity, not only UI rendering.
- The current V1 TeamRun manager writes the initial tree before provider initialization. `MixedAgentMemberHandle` later captures the ID only in its runtime context. No root-owned mutation commits the updated ID into the tree.
- `origin/personal` used a legacy metadata projection that rebuilt persisted metadata from the live member contexts after events. The V1 change removed that refresh path without replacing it with an authoritative execution-tree binding commit.
- The standalone AgentRun restore path already carries the persisted ID into the Codex runtime. The primary regression is specific to team execution persistence.
- The Claude failure was independently reproduced through the real browser UI with `classroom-simulation-team`, `claude_agent_sdk`, and the requested DeepSeek V4 Flash-backed selection against a second isolated disposable database.
- Before restart, professor AgentRun `professor_a3c8cb8a642e4ed1961f7651e28aae4a` used Claude provider session `11771792-3875-42a5-8f8a-455dd819af27`; after restart the same local AgentRun used `8ba2e83a-f5aa-4d9c-832b-49e1caaab420`.
- The Claude tree binding was null on both sides of restart. Local history displayed `AMBER-ORCHID-4821`, but the post-restart provider explicitly reported that no marker existed in its conversation.
- `origin/personal` uses the same Claude placeholder-then-stream-adoption backend behavior. Team continuity there came from a legacy stream-event metadata refresh that projected updated live member contexts. V1 removed that bridge without adding a root-owned replacement.
- The installed Claude Agent SDK supports a caller-selected valid UUID for a new conversation through SDK `sessionId`, separately from SDK `resume`. This permits Claude to establish the durable identity before first input rather than discovering it too late from a stream.
- Static tracing also found a standalone Claude timing gap: activation can persist the local AgentRun ID placeholder, while activity persistence is initiated immediately after asynchronous turn acceptance and may run before provider UUID discovery. Graceful termination can repair the metadata later, but abrupt restart cannot depend on it.
- A valid non-null provider ID is directly usable under the existing V1 schema. For already-affected V1 histories whose authoritative binding is null, the original provider thread cannot be safely inferred or reconstructed from canonical persisted state.

## Relevant Supplemental Task Artifacts

| Artifact Path | Type / Purpose | Related Requirement IDs | Related Acceptance-Criteria IDs | Status / Approval | Relationship To Requirements |
| --- | --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-runtime-thread-resume-fix/tickets/in-progress/codex-runtime-thread-resume-fix/runtime-reproduction-evidence.md` | Live-browser reproduction and retained provider-identity evidence | REQ-001, REQ-002, REQ-007 | AC-001, AC-002, AC-003, AC-004 | Complete / Approval N/A | Evidence supporting the current-behavior and acceptance basis; it does not define intended behavior. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-runtime-thread-resume-fix/tickets/in-progress/codex-runtime-thread-resume-fix/claude-runtime-reproduction-evidence.md` | Claude live-browser restart evidence, provider lifecycle trace, installed SDK contract, and `origin/personal` comparison | REQ-001 through REQ-004, REQ-009 through REQ-011 | AC-010 through AC-015 | Complete / Approval N/A | Evidence supporting the expanded current-behavior and acceptance basis; it does not define intended behavior. |

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Bug Fix
- Initial design issue signal (`Yes`/`No`/`Unclear`): Yes
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Missing Invariant and Boundary Or Ownership Issue
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Likely Needed
- Evidence basis: The V1 execution tree is intended to be the authoritative persisted identity topology, but provider-ID adoption bypasses it and mutates only a detached runtime context. The root already owns a write-before-live-commit persistence coordinator, while the tree mutator has no binding-adoption operation. Claude additionally exposes an invalid lifecycle boundary by substituting a local AgentRun ID until the provider asynchronously supplies its UUID.
- Requirement or scope impact: The fix must establish a root-owned durable provider-binding operation for all persisted team-agent execution nodes rather than reintroducing a best-effort stream-handler metadata refresh or adding a provider-specific persistence shortcut. Claude must also allocate and persist a provider-valid UUID before input, then distinguish first-session creation from exact-session resume.

## Recommendations

1. Make provider-binding adoption an explicit RootTeamRun execution change that persists the next execution tree before publishing the binding to live state.
2. Route binding discovery from runtime member handles to that owner; do not treat mutable backend/member context as an independent persistence authority.
3. Apply the invariant to both configured and delegated task agents that carry external provider IDs, while leaving native null-binding runtimes unaffected.
4. Fail observably when a required known provider thread cannot be resumed, and distinguish that state from legitimate first-time thread creation.
5. Do not guess provider IDs for already-broken null-binding histories and do not add a data migration that cannot reconstruct their identity safely.
6. Preserve and extend realistic restart coverage so it verifies both physical persisted identity and semantic post-restart context.
7. For fresh Claude execution, reserve a valid UUID before input, use the SDK's new-session `sessionId` option exactly once, then use `resume` for subsequent/restored turns; never use the local AgentRun ID as a provider binding.
8. Treat a provider-reported Claude UUID that conflicts with the reserved/restored UUID as an invariant failure, not as permission to rebind.
9. Apply the Claude UUID lifecycle to standalone and team-managed AgentRuns so abrupt restart safety does not depend on event timing or graceful termination.

## Scope Classification (`Small`/`Medium`/`Large`)

Medium. The user-visible bug has a focused trigger, but its correct repair crosses team-runtime initialization, authoritative tree mutation, durable commit sequencing, restart hydration, provider-adapter failure semantics, and regression coverage.

## In-Scope Use Cases

- **UC-001 — Configured Codex team-member restart:** Complete a turn in a configured Codex team member, stop the server, restart against the same state, reopen the run, and continue on the same provider thread.
- **UC-002 — Same-process team continuation:** Continue sending turns without a restart while preserving one provider identity and normal behavior.
- **UC-003 — Generic persisted team-agent binding:** Adopt and persist external provider IDs for configured agents and task agents through the same authoritative mechanism; permit null only for runtimes that do not expose such an identity or executions that have not initialized one yet.
- **UC-004 — Previously affected null-binding history:** Reopen a run with evidence of prior external-provider activity but no canonical provider binding without guessing or silently creating a replacement continuation.
- **UC-005 — Standalone Codex preservation:** Restore a standalone Codex AgentRun with its existing persisted provider ID.
- **UC-006 — Fresh provider-backed team agent:** Start a team agent that has no prior activity or provider binding, create its first provider thread, and persist the binding for future restoration.
- **UC-007 — Configured Claude team-member restart:** Complete a turn in a configured Claude Agent SDK team member, stop the server, restart against the same state, reopen the run, and continue on the identical provider session with semantic context intact.
- **UC-008 — Standalone Claude abrupt restart:** Start a standalone Claude run, complete a context-bearing turn, terminate the server without relying on graceful run termination, restart, and resume the identical valid provider UUID.

## Out of Scope

- The separately reported Electron startup/database migration failure and any inspection or mutation of the user's production database.
- Recovering an original provider thread ID when an already-persisted affected record contains no canonical binding.
- Replaying visible local history into a new provider thread as a substitute for exact provider-thread restoration.
- Changing agent/team identities, conversation-history presentation, agent package definitions, model selection, or unrelated task-delegation behavior.
- Broad Autobyteus-runtime changes unless required only to keep the generic provider-binding boundary correctly neutral for runtimes without an external identity.

## Functional Requirements

- **REQ-001:** When a persisted team-agent runtime establishes a non-null provider-native run/thread ID, the matching authoritative execution-tree node must durably adopt that exact ID through the RootTeamRun ownership boundary before the binding is considered committed.
- **REQ-002:** Restoring a persisted team run must supply each non-null stored provider ID to the matching runtime before its first post-restart turn, so the provider is asked to resume that exact session rather than create a replacement.
- **REQ-003:** The binding-adoption and restoration invariant must apply consistently to configured agent nodes and delegated task-agent nodes. Runtimes that legitimately have no provider-native ID must retain null without failure.
- **REQ-004:** An agent execution with no prior activity and no established provider binding must retain supported new-thread creation, then persist the returned binding for future continuation; no binding may be invented or guessed.
- **REQ-005:** If restoration is attempted with a known persisted provider ID and the provider cannot resume it, the operation must fail observably and must not silently fall back to new-thread creation.
- **REQ-006:** If an already-persisted team-agent execution has prior external-provider activity but its canonical binding is null, the system must not claim contextual continuation, guess an ID, or silently create a new thread as though it were the same conversation; it must expose an explicit non-resumable/context-loss outcome.
- **REQ-007:** Existing local history loading, ordering, content, and visibility after restart must remain unchanged and independent of whether provider restoration succeeds.
- **REQ-008:** Existing standalone AgentRun persistence and restoration must continue to propagate valid provider IDs and must obey the same no-silent-replacement rule for a known Codex thread.
- **REQ-009:** `platformAgentRunId` must contain only a provider-native identity for external runtimes. A local AgentRun ID, temporary sentinel, or unresolved placeholder must not be published or persisted as a provider binding.
- **REQ-010:** A fresh Claude Agent SDK execution must reserve one valid UUID before it is released for user input, durably bind that UUID through the applicable persistence owner, use that UUID as the SDK-selected ID for the first new session, and use the identical UUID for all later same-process and restored resume requests. The provider stream must confirm, not replace, the binding.
- **REQ-011:** Standalone Claude AgentRun metadata must durably contain its valid provider UUID before its first input can be relied upon for restart continuity; correctness must not depend on WebSocket presence, a later runtime event, or graceful run/server termination.

## Acceptance Criteria

- **AC-001:** Given a configured Codex team member that completed a turn containing a distinctive fact, a full server stop/start and reopened conversation use the identical non-null Codex thread ID observed before restart.
- **AC-002:** A context-dependent first turn after restart returns the earlier fact without the client replaying or fabricating a replacement provider conversation.
- **AC-003:** Earlier locally persisted user and assistant messages remain visible after restart in their original order and are neither duplicated nor cleared by the fix.
- **AC-004:** After the first provider thread is established and before restart, the physically persisted execution-tree node for the configured agent contains that exact non-null provider ID.
- **AC-005:** Targeted automated coverage proves provider-binding adoption for both configured-agent and delegated task-agent execution-tree nodes, and proves a native/no-external-ID runtime remains valid with null.
- **AC-006:** A genuinely fresh provider-backed team agent creates a new thread normally, durably records the returned ID, and continues on that ID during the same process.
- **AC-007:** Reopening an affected historical execution with prior external-provider activity and a null canonical binding yields an explicit non-resumable/context-loss outcome and does not start a provider thread as a silent continuation.
- **AC-008:** A provider `thread/resume` failure for a known Codex thread ID is observable and does not invoke `thread/start` as fallback.
- **AC-009:** Standalone Codex AgentRun regression coverage continues to restore the same persisted provider thread ID, while unrelated native runtime behavior remains unchanged.
- **AC-010:** Given a configured Claude team member, the physically persisted execution-tree node contains the exact valid provider UUID selected for its first SDK session before restart rather than null or the local AgentRun ID. The retained failing evidence observed `11771792-3875-42a5-8f8a-455dd819af27` as the unpersisted pre-restart UUID.
- **AC-011:** After a full restart, the same Claude team AgentRun requests resume of its exact pre-restart provider UUID and does not create any replacement session. The retained failing evidence created `8ba2e83a-f5aa-4d9c-832b-49e1caaab420` as the replacement that must no longer occur.
- **AC-012:** The first context-dependent Claude response after restart returns `AMBER-ORCHID-4821`, while earlier local messages remain visible once and in their original order.
- **AC-013:** Focused Claude adapter coverage proves that a fresh run supplies a valid reserved UUID through the SDK new-session `sessionId` option, a materialized/restored run supplies the same UUID through SDK `resume`, and the two options are not conflated or sent together.
- **AC-014:** If a Claude stream reports a non-null UUID different from the reserved or restored UUID, the turn fails observably and neither team-tree nor standalone metadata adopts the conflicting value.
- **AC-015:** Standalone Claude restart coverage proves that persisted metadata contains the same valid provider UUID used by the first SDK session and that an abrupt process restart resumes that UUID without requiring a graceful AgentRun termination.

## Constraints / Dependencies

- Authoritative implementation and artifacts remain on `codex/codex-runtime-thread-resume-fix`, bootstrapped from `origin/codex/agent-team-universal-task-delegation`; `origin/personal` is comparison evidence only.
- The RootTeamRun execution tree is the V1 persisted identity authority and its existing persistence coordinator uses write-before-live-commit semantics.
- Codex provider ID discovery remains asynchronous; the design must define when and how root-owned adoption is committed without relying on WebSocket presence or later UI events.
- The installed Claude SDK supports a caller-selected UUID for new-session creation. The design must keep fresh-unmaterialized and existing/materialized state distinct so it can select SDK `sessionId` versus SDK `resume` without weakening exact restoration.
- Real Codex validation requires local authentication/model access and a restart boundary. The retained reproduction used the requested classroom simulation package and model.
- No production database mutation is authorized or required for this issue.

## Persisted Data Outcome (When Applicable)

- Stored subject / location: `platformAgentRunId` on configured-agent and task-agent nodes in `team_run_execution_tree.json`, plus existing standalone AgentRun metadata.
- Required outcome (`Not Affected`/`Directly Usable — No Migration`/`Discard or Rebuild`/`Migration Required`/`Undetermined`): Directly Usable — No Migration
- Existing data to preserve, discard/rebuild, transform, or quarantine: Preserve valid non-null provider bindings and all local history. Existing V1 schema and legacy-converted records with valid IDs are usable as-is. Treat already-affected prior-activity nodes with null, and standalone Claude records whose binding equals the local AgentRun ID placeholder, as explicitly non-resumable; do not fabricate a migration value.
- Unacceptable data loss or corruption: Replacing a valid provider ID, deleting or reordering local history, assigning one member's provider ID to another, or masking an unrecoverable null binding by starting a new provider thread.
- Relevant availability, maintenance-window, or rollout constraints: New and valid persisted runs must resume without manual repair. No bulk rewrite or production maintenance window is justified. Already-broken null records cannot be promised exact recovery.
- Related requirement and acceptance-criteria IDs: REQ-001 through REQ-011; AC-001, AC-003 through AC-015

## Assumptions

- A provider-native thread ID is opaque and may be used only for the exact agent execution that established it.
- Visible local history and provider-native context are separate state domains; one cannot prove or reconstruct the other.
- Prior external-provider activity can be distinguished from a genuinely fresh execution using canonical persisted run/history state; the design must verify the exact supported signal before implementation.
- The user's reported success on `origin/personal` is explained by its legacy live-context-to-metadata refresh path, not by a different Codex provider contract.
- The same legacy live-context-to-metadata refresh explains why a late-discovered Claude team session could be persisted on `origin/personal`; the Claude backend itself is not materially different at this boundary.
- A caller-reserved valid UUID passed as the Claude SDK new-session `sessionId` is a deliberate provider identity assignment, not an attempt to guess an already-existing provider session.

## Risks / Open Questions

- The precise product-facing representation of an unrecoverable historical null binding (existing error event versus a new structured error code) remains a design decision, but silent continuation is prohibited.
- The provider binding may become known at different lifecycle points across external backends; the target API must be idempotent and must reject conflicting rebinding.
- Existing live E2E coverage is environment-gated and appears stale relative to the reproduced branch. Downstream coverage investigation must decide what durable coverage to repair or add.
- A crash after durable UUID reservation but before the Claude provider materializes the new session can leave a known binding that the provider cannot resume. That narrow window must fail closed rather than silently create a different session; recovery ergonomics remain a design concern.

## Requirement-To-Use-Case Coverage

| Requirement ID | Covered Use Cases |
| --- | --- |
| REQ-001 | UC-001, UC-002, UC-003, UC-006, UC-007 |
| REQ-002 | UC-001, UC-003, UC-005, UC-007, UC-008 |
| REQ-003 | UC-003, UC-006, UC-007 |
| REQ-004 | UC-006, UC-007, UC-008 |
| REQ-005 | UC-001, UC-004, UC-005, UC-007, UC-008 |
| REQ-006 | UC-004 |
| REQ-007 | UC-001, UC-004, UC-007, UC-008 |
| REQ-008 | UC-005 |
| REQ-009 | UC-001, UC-003, UC-006, UC-007, UC-008 |
| REQ-010 | UC-002, UC-006, UC-007, UC-008 |
| REQ-011 | UC-008 |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criteria ID | Scenario Intent |
| --- | --- |
| AC-001 | Prove exact provider-thread identity continuity across a real process restart. |
| AC-002 | Prove semantic context continuity, not only a stored-field assignment. |
| AC-003 | Protect existing local-history restoration. |
| AC-004 | Verify the physical persisted-state invariant before restart. |
| AC-005 | Guard the generic configured/task execution-tree boundary and native null case. |
| AC-006 | Protect legitimate first-time provider-thread creation and same-process reuse. |
| AC-007 | Guard previously affected null-binding histories against false continuation. |
| AC-008 | Guard the provider adapter against silent resume-to-create fallback. |
| AC-009 | Protect standalone Codex restoration and unrelated native behavior. |
| AC-010 | Verify the physical Claude team binding before restart. |
| AC-011 | Prove exact Claude provider-session identity continuity across restart. |
| AC-012 | Prove Claude semantic context continuity while preserving local history. |
| AC-013 | Guard the Claude SDK wrapper's distinct new-session and resume contracts. |
| AC-014 | Prevent conflicting Claude UUID rebinding. |
| AC-015 | Protect standalone Claude against abrupt process restart. |

## Approval Status

Explicitly approved by the user on 2026-08-17. The approval covers the original Codex basis and the refined Claude Agent SDK expansion, including REQ-009 through REQ-011 and AC-010 through AC-015. Both runtime evidence supplements are approval-N/A because they record observed facts rather than intended behavior.
