# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Design-ready

## Goal / Problem Statement

Design a new mixed-runtime agent-team orchestration path that allows team members to run on different runtimes while keeping v1 scope limited to **team communication**. The design must move mixed-team ownership to a server-owned team backend selected separately from member execution runtime, must build mixed communication on top of per-member `AgentRun`s, and must keep existing single-runtime team managers untouched for their current paths.

## Investigation Findings

- Current product behavior, as of 2026-04-23, is **single runtime per team run**; mixed-runtime launch is intentionally blocked.
- Current team orchestration is duplicated per runtime (`AutoByteus`, `Codex`, `Claude`) and each runtime-specific team manager owns its own member routing semantics.
- `AgentRunManager` and `AgentRunBackend` already provide a workable runtime-neutral member execution layer.
- Team-level backend selection currently reuses `RuntimeKind`, but architecture review confirmed that subject is wrong for mixed-team orchestration because `RuntimeKind` already means **member execution runtime** across runtime-management and model-catalog code.
- Codex and Claude current standalone team-member bootstrap paths are still same-runtime keyed: they receive raw `TeamRunContext` and gate on runtime-specific team ownership rather than on a runtime-neutral member-team contract.
- AutoByteus native `send_message_to` is tightly coupled to native `teamContext.teamManager`, while Codex/Claude already route through server-owned inter-agent delivery handlers.
- AutoByteus standalone `AgentRun` creation already supports arbitrary `initialCustomData`, but today it does **not** inject the team context stored in `AgentRunConfig.teamContext`.
- `AutoByteusAgentRunBackendFactory` currently instantiates every tool from `agentDef.toolNames`, but `defaultToolRegistry` / `ToolDefinition.category` / `ToolCategory.TASK_MANAGEMENT` provide a concrete runtime-bootstrap seam for stripping task-plan tools before mixed AutoByteus members ever expose them.
- Communication consumers in `autobyteus-ts` only need a small subset of team behavior: teammate identity, teammate list, outbound inter-agent dispatch, and sender-name resolution.

## Recommendations

- Add a **new mixed-team orchestration path** instead of retrofitting existing runtime-specific team managers.
- Introduce a dedicated **team backend selector** type at the team boundary; keep `RuntimeKind` exclusively for member execution runtime.
- Use **`AgentRun` as the per-member execution primitive** and move mixed-team communication ownership above runtimes.
- Introduce a runtime-neutral **member-team bootstrap context** for Codex, Claude, and AutoByteus standalone members so teammate instructions, recipient restrictions, and `send_message_to` wiring no longer depend on same-runtime team ownership.
- Limit v1 to **communication only**: targeted user messaging, inter-agent `send_message_to`, sender identity preservation, and mixed-team event routing.
- Keep task-plan-dependent features out of scope and make the **AutoByteus standalone runtime bootstrap owner** explicitly responsible for removing task-management tools from mixed members before exposure.
- Refactor AutoByteus communication consumers to depend on a **small communication context contract** that both native and mixed paths can provide.

## Scope Classification (`Small`/`Medium`/`Large`)

Large

## In-Scope Use Cases

- `UC-001` Create a mixed team run when the requested member runtime kinds span more than one runtime.
- `UC-002` Route targeted user messages from the team boundary to the intended mixed-runtime member run.
- `UC-003` Deliver `send_message_to` traffic between mixed-runtime members through one server-owned inter-agent communication path.
- `UC-004` Bootstrap Codex and Claude standalone team members from a runtime-neutral member-team context so teammate instructions, allowed-recipient lists, and `send_message_to` delivery wiring still work in mixed teams.
- `UC-005` Inject an AutoByteus mixed-team communication context into standalone AutoByteus member runs so AutoByteus `send_message_to` works inside mixed teams.
- `UC-006` Strip task-management tools from mixed AutoByteus standalone members before tool manifest/schema exposure so mixed v1 remains communication-only.
- `UC-007` Keep existing single-runtime team managers available for their current paths while ensuring the mixed-team path does not depend on them.
- `UC-008` Restore a mixed team run on the server using persisted per-member runtime identity and platform run ids so communication continues after restore.

## Out of Scope

- Task-plan support in mixed teams, including `assign_task_to`, task creation/update tools, and task-plan notifications.
- Frontend design for member-level runtime selection, reopen hydration, or mixed-team history UX.
- Removing or migrating the current single-runtime team managers.
- Full migration of native AutoByteus-only team execution from `autobyteus-ts` into `autobyteus-server-ts`.
- Broad capability parity beyond communication (for example mixed-runtime task planning, sub-team orchestration, or shared task-state projection).

## Functional Requirements

| requirement_id | Requirement | Expected Outcome | Use Case IDs |
| --- | --- | --- | --- |
| R-001 | The backend team-run create/restore path must resolve a **team backend selector** that is separate from member `RuntimeKind` and must use that selector to choose the governing team backend. | Team orchestration selection no longer overloads member runtime identity. | UC-001, UC-008 |
| R-002 | When requested member runtime kinds span more than one runtime, backend team creation must select the dedicated mixed-team backend instead of rejecting the request. | Mixed-runtime team creation becomes an explicit supported backend path. | UC-001 |
| R-003 | The mixed-team orchestration owner must create, restore, supervise, and route to per-member `AgentRun`s through `AgentRunManager`, not through runtime-specific team managers. | Mixed teams are governed by one server-owned orchestration owner over runtime-neutral member runs. | UC-001, UC-002, UC-003, UC-008 |
| R-004 | Inter-agent communication for mixed teams must be owned by a single server-side inter-agent router that accepts canonical delivery requests and targets the recipient `AgentRun` through the shared `postUserMessage(...)` boundary. | `send_message_to` works across runtime combinations without pairwise runtime-specific routing logic. | UC-003 |
| R-005 | The canonical mixed-team inter-agent delivery path must build message content that keeps sender identity visible to the recipient model while also preserving sender metadata for downstream event consumers. | Recipients on AutoByteus, Codex, and Claude can all understand who sent the message. | UC-003 |
| R-006 | Standalone Codex and Claude team-member bootstraps must consume a runtime-neutral member-team context for teammate instructions, allowed-recipient lists, and `send_message_to` delivery wiring rather than depending on same-runtime team ownership guards. | Codex and Claude mixed members retain communication affordances through one explicit member-team contract. | UC-004 |
| R-007 | AutoByteus standalone member runs created for mixed teams must receive a custom communication-focused team context through `initialCustomData`. | AutoByteus mixed members can participate in mixed-team communication without native `AgentTeam` ownership. | UC-005 |
| R-008 | `autobyteus-ts` communication consumers (`send_message_to`, sender-name resolution, and teammate manifest injection for communication) must depend on a narrow communication-context contract rather than directly on raw native `teamManager` ownership. | The same AutoByteus communication surfaces can work for both native and mixed team contexts. | UC-003, UC-005 |
| R-009 | The AutoByteus standalone runtime bootstrap owner must remove `ToolCategory.TASK_MANAGEMENT` tools from mixed AutoByteus members before tool instantiation/exposure while leaving native AutoByteus teams unchanged. | Mixed AutoByteus members remain communication-only and never expose task-plan tools. | UC-006 |
| R-010 | Existing single-runtime team managers may remain for their own paths, but the mixed-team path must not call into them, wrap them, or depend on them for routing. | The mixed path is a clean new orchestration path, not a hidden layering over legacy team managers. | UC-007 |
| R-011 | Server restore for mixed teams must reconstruct the correct team backend selection and per-member contexts from persisted member runtime metadata and platform run ids instead of collapsing the team back to one runtime owner. | A restored mixed team can resume communication without first-member-runtime inference. | UC-008 |

## Acceptance Criteria

| acceptance_criteria_id | mapped_requirement_ids | Testable Criteria |
| --- | --- | --- |
| AC-001 | R-001, R-002 | When `createTeamRun(...)` receives member configs containing at least two different runtime kinds, backend team creation resolves a mixed team backend selector and does not throw `[MIXED_TEAM_RUNTIME_UNSUPPORTED]`. |
| AC-002 | R-001, R-011 | When restoring a persisted mixed team run, the server resolves the mixed team backend selector from persisted member runtime metadata and restores a mixed team context instead of inferring a single governing runtime. |
| AC-003 | R-003 | A mixed team run can activate at least two members on different runtimes through `AgentRunManager`, and a targeted team-level user message reaches the intended member run. |
| AC-004 | R-004, R-005 | `send_message_to` from one mixed-team member to another succeeds across at least one cross-runtime pair and the recipient receives content that explicitly identifies the sender. |
| AC-005 | R-006 | A Codex mixed member and a Claude mixed member each receive teammate instructions, constrained recipient lists, and working `send_message_to` delivery wiring through the runtime-neutral member-team context rather than same-runtime team guards. |
| AC-006 | R-007, R-008 | An AutoByteus member running inside a mixed team can call `send_message_to` successfully using injected mixed-team communication context, while native AutoByteus team communication continues to function. |
| AC-007 | R-008 | AutoByteus teammate manifest / communication guidance can render from the new communication context contract without needing the full native `AgentTeamContext` object on the mixed path. |
| AC-008 | R-009 | Mixed AutoByteus members do not expose any `ToolCategory.TASK_MANAGEMENT` tools, including current task-plan tools such as `assign_task_to`, before tool manifest/schema exposure. |
| AC-009 | R-010 | Mixed-team routing code does not instantiate or delegate through the legacy runtime-specific team managers. |

## Constraints / Dependencies

- `AgentRunManager`, `AgentRun`, and runtime-specific standalone agent-run backends must remain the execution foundation for mixed members.
- Existing single-runtime team managers and native AutoByteus team runtime must remain stable for their current paths.
- The team backend selector must stay confined to the team boundary and must not leak into member runtime-management or model-catalog concerns.
- AutoByteus communication refactoring must not break existing native task-plan tools, even though mixed-team v1 does not support them.
- The design must preserve deterministic member identity (`memberName`, `memberRouteKey`, `memberRunId`) across routing, eventing, and restore.

## Assumptions

- Mixed-team v1 is a backend/server-led architecture effort; frontend runtime-selection UX can land later.
- Team communication is the highest-value first capability; task planning can follow later on top of the mixed-team foundation.
- The dedicated team backend selector can be derived from member runtime composition on create/restore in v1; frontend callers do not need to send it yet.
- Category-level task-management stripping for mixed AutoByteus standalone members is acceptable for v1 because the goal is communication-only behavior.

## Risks / Open Questions

- `Q-001` The canonical recipient-visible message wording may need tuning so sender identity remains clear without degrading model behavior.
- `Q-002` Mixed AutoByteus v1 strips the full `ToolCategory.TASK_MANAGEMENT` surface. If later product scope wants some non-task-plan task tools back, the policy owner will need a narrower allow/deny rule.
- `Q-003` Frontend create/reopen/history contracts still assume one team runtime; product work will be needed later if mixed team selection is exposed in the UI.

## Requirement-To-Use-Case Coverage

| requirement_id | covered_use_cases |
| --- | --- |
| R-001 | UC-001, UC-008 |
| R-002 | UC-001 |
| R-003 | UC-001, UC-002, UC-003, UC-008 |
| R-004 | UC-003 |
| R-005 | UC-003 |
| R-006 | UC-004 |
| R-007 | UC-005 |
| R-008 | UC-003, UC-005 |
| R-009 | UC-006 |
| R-010 | UC-007 |
| R-011 | UC-008 |

## Acceptance-Criteria-To-Scenario Intent

| acceptance_criteria_id | Scenario Intent |
| --- | --- |
| AC-001 | Prove mixed-team creation becomes an explicit supported backend path with the right selector subject. |
| AC-002 | Prove restore uses team-backend selection correctly instead of collapsing to one runtime owner. |
| AC-003 | Prove the mixed team owner really governs per-member `AgentRun`s. |
| AC-004 | Prove cross-runtime inter-agent communication works and sender identity is preserved in delivered content. |
| AC-005 | Prove Codex/Claude mixed-member bootstrap no longer depends on same-runtime team ownership. |
| AC-006 | Prove AutoByteus mixed members can participate through injected custom context without breaking native AutoByteus communication. |
| AC-007 | Prove AutoByteus communication guidance can use the new shared communication context contract. |
| AC-008 | Prove mixed AutoByteus runtime bootstrap removes task-management tools before they surface. |
| AC-009 | Prove the mixed path is architecturally independent from legacy team managers. |

## Approval Status

User-reviewed before round-1 architecture review; this revision keeps the approved communication-only scope and incorporates architecture review findings `DAR-001`, `DAR-002`, and `DAR-003`.
