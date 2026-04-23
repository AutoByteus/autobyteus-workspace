# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Refined

## Goal / Problem Statement

Design mixed-runtime agent-team support that is **usable from the app**, not only from backend APIs. The ticket now must cover both:

1. the server-owned mixed-team orchestration path for communication, and
2. the frontend workspace team-run configuration UX that lets a user choose **different runtimes for different team members** before launch.

The design must preserve a convenient team-level default runtime/model/config while letting individual members override runtime from the workspace team run form. The launched payload, temporary team context, reopen/hydration flow, and mixed-team backend must all preserve those per-member runtime decisions end-to-end.

## Investigation Findings

- Current product behavior, as of 2026-04-23, is still **single runtime per team run**; mixed-runtime launch is intentionally blocked on the backend.
- Current team orchestration is duplicated per runtime (`AutoByteus`, `Codex`, `Claude`) and each runtime-specific team manager owns its own member routing semantics.
- `AgentRunManager` and `AgentRunBackend` already provide a workable runtime-neutral member execution layer for the backend mixed path.
- The current frontend workspace team run form exposes only **one top-level runtime selector**.
- `MemberOverrideItem.vue` currently supports only model / auto-execute / llmConfig overrides; it has no per-member runtime field.
- `autobyteus-web/types/agent/TeamRunConfig.ts` does not include `runtimeKind` on `MemberConfigOverride`.
- `autobyteus-web/stores/agentTeamRunStore.ts` currently copies the single team runtime into every `memberConfigs[*].runtimeKind` during launch.
- `autobyteus-web/stores/agentTeamContextsStore.ts`, `autobyteus-web/utils/application/applicationLaunch.ts`, and `autobyteus-web/utils/teamRunConfigUtils.ts` also currently collapse runtime to one team-level value for temp contexts, application launch materialization, and reopen reconstruction.
- Existing frontend tests explicitly assert same-runtime fanout and dominant-runtime reconstruction.
- `teamRunConfigStore.isConfigured` currently returns `true` as soon as the top-level team model and workspace are present; it does not account for per-member runtime/model incompatibility.
- `RunConfigPanel.vue` still enables or disables the Run button from that global-only readiness getter, so a member runtime override can currently leave the workspace UI launch-ready even when one member no longer has a valid effective model.
- Existing `autobyteus-web/stores/__tests__/teamRunConfigStore.spec.ts` and `autobyteus-web/components/workspace/config/__tests__/RunConfigPanel.spec.ts` reinforce the current global-only readiness behavior.
- Team-level backend selection currently reuses `RuntimeKind`, but architecture review confirmed that subject is wrong for mixed-team orchestration because `RuntimeKind` already means **member execution runtime**.
- Codex and Claude current standalone team-member bootstrap paths are still same-runtime keyed: they receive raw `TeamRunContext` and gate on runtime-specific team ownership rather than on a runtime-neutral member-team contract.
- AutoByteus native `send_message_to` is tightly coupled to native `teamContext.teamManager`, while Codex/Claude already route through server-owned inter-agent delivery handlers.
- AutoByteus standalone `AgentRun` creation already supports arbitrary `initialCustomData`, but today it does **not** inject the team context stored in `AgentRunConfig.teamContext`.
- `AutoByteusAgentRunBackendFactory` currently instantiates every tool from `agentDef.toolNames`, but `defaultToolRegistry` / `ToolDefinition.category` / `ToolCategory.TASK_MANAGEMENT` provide a concrete runtime-bootstrap seam for stripping task-plan tools before mixed AutoByteus members ever expose them.
- Communication consumers in `autobyteus-ts` only need a small subset of team behavior: teammate identity, teammate list, outbound inter-agent dispatch, and sender-name resolution.

## Recommendations

- Add a **new mixed-team orchestration path** instead of retrofitting existing runtime-specific team managers.
- Introduce a dedicated **team backend selector** type at the team boundary; keep `RuntimeKind` exclusively for member execution runtime.
- Use **`AgentRun` as the per-member execution primitive** and move mixed-team communication ownership above runtimes.
- Keep the existing top-level team runtime/model/config as the **global default** for convenience, but add per-member runtime override UX in the workspace team form.
- Extend frontend `MemberConfigOverride` so runtime override, model override, auto-execute override, and llmConfig override can all be expressed together.
- Introduce a runtime-neutral **member-team bootstrap context** for Codex, Claude, and AutoByteus standalone members so teammate instructions, recipient restrictions, and `send_message_to` wiring no longer depend on same-runtime team ownership.
- Limit mixed-team v1 behavior to **communication only**: targeted user messaging, inter-agent `send_message_to`, sender identity preservation, and mixed-team event routing.
- Keep task-plan-dependent features out of scope and make the **AutoByteus standalone runtime bootstrap owner** explicitly responsible for removing task-management tools from mixed members before exposure.
- Refactor AutoByteus communication consumers to depend on a **small communication context contract** that both native and mixed paths can provide.
- Preserve per-member runtime truth when reopening or hydrating a team run in the app so the workspace config stays faithful to what actually launched.
- Define explicit row behavior for the case where a member runtime override makes the inherited team-default model/config invalid: the row must become unresolved, explain the problem, and require either a compatible member model override or removal of the runtime override.
- Make `teamRunConfigStore` the authoritative workspace launch-readiness owner for mixed-runtime teams, backed by one shared frontend readiness utility, and retarget `RunConfigPanel` to consume that boundary instead of the current global-only `isConfigured` rule.

## Scope Classification (`Small`/`Medium`/`Large`)

Large

## In-Scope Use Cases

- `UC-001` Configure a team-level default runtime/model/config from the workspace team run form.
- `UC-002` Override runtime for an individual team member from the workspace team run form while still allowing “use global default” behavior for members that do not need a custom runtime.
- `UC-003` Launch a team from the app such that the emitted `memberConfigs[]` preserve per-member runtime selections instead of forcing one team runtime onto all members.
- `UC-004` Materialize temporary in-app team member contexts with the correct per-member runtime before the first backend launch so the UI state matches the intended launch.
- `UC-005` Reopen or hydrate a stored team run in the app and reconstruct per-member runtime overrides from metadata instead of collapsing back to one dominant runtime.
- `UC-006` Create a mixed team run on the backend when the requested member runtime kinds span more than one runtime.
- `UC-007` Route targeted user messages from the team boundary to the intended mixed-runtime member run.
- `UC-008` Deliver `send_message_to` traffic between mixed-runtime members through one server-owned inter-agent communication path.
- `UC-009` Bootstrap Codex and Claude standalone team members from a runtime-neutral member-team context so teammate instructions, allowed-recipient lists, and `send_message_to` delivery wiring still work in mixed teams.
- `UC-010` Inject an AutoByteus mixed-team communication context into standalone AutoByteus member runs so AutoByteus `send_message_to` works inside mixed teams.
- `UC-011` Strip task-management tools from mixed AutoByteus standalone members before tool manifest/schema exposure so mixed v1 remains communication-only.
- `UC-012` Keep existing single-runtime team managers available for their current paths while ensuring the mixed-team path does not depend on them.
- `UC-013` Restore a mixed team run on the server using persisted per-member runtime identity and platform run ids so communication continues after restore.
- `UC-014` Change one member to a different runtime in the workspace form, discover that the inherited team-default model/config is no longer valid for that member, and be forced to resolve that member row before the team can launch.

## Out of Scope

- Task-plan support in mixed teams, including `assign_task_to`, task creation/update tools, and task-plan notifications.
- A new run-history list visualization or dashboard specifically for mixed-runtime teams beyond truthful config reconstruction when a run is opened.
- Removing or migrating the current single-runtime team managers.
- Full migration of native AutoByteus-only team execution from `autobyteus-ts` into `autobyteus-server-ts`.
- Broad capability parity beyond communication (for example mixed-runtime task planning, sub-team orchestration, or shared task-state projection).
- Non-workspace product surfaces that are not required for workspace/app team launch correctness in this ticket.

## Functional Requirements

| requirement_id | Requirement | Expected Outcome | Use Case IDs |
| --- | --- | --- | --- |
| R-001 | Frontend `MemberConfigOverride` must support an optional `runtimeKind` override while keeping team-level `TeamRunConfig.runtimeKind` as the global default runtime. | The app can represent mixed-runtime intent without losing the convenient team default. | UC-001, UC-002 |
| R-002 | The workspace team run form must let the user set a per-member runtime override with an explicit “use global runtime” fallback state. | Users can configure mixed-runtime teams directly from the app. | UC-001, UC-002 |
| R-003 | Member-level runtime/model/config UI must load model options against the member’s **effective runtime** (`override.runtimeKind ?? team.runtimeKind`) and must clear member-only model/config values when they become invalid for the newly selected effective runtime. | Per-member override editing stays runtime-correct and does not leak invalid model/config combinations. | UC-002 |
| R-004 | Frontend launch materialization (`agentTeamRunStore`, temporary team context creation, and shared application launch helpers) must resolve each member’s runtime as `override.runtimeKind ?? team.runtimeKind` rather than fanning out one team runtime to every member. | App launch paths preserve the per-member runtime choices the user configured. | UC-003, UC-004 |
| R-005 | Frontend reopen/hydration reconstruction must preserve per-member runtime truth by reconstructing runtime overrides for members whose runtime differs from the chosen team-level default. | Opened team runs remain editable/viewable with truthful mixed-runtime config. | UC-005 |
| R-006 | The backend team-run create/restore path must resolve a **team backend selector** that is separate from member `RuntimeKind` and must use that selector to choose the governing team backend. | Team orchestration selection no longer overloads member runtime identity. | UC-006, UC-013 |
| R-007 | When requested member runtime kinds span more than one runtime, backend team creation must select the dedicated mixed-team backend instead of rejecting the request. | Mixed-runtime team creation becomes an explicit supported backend path. | UC-006 |
| R-008 | The mixed-team orchestration owner must create, restore, supervise, and route to per-member `AgentRun`s through `AgentRunManager`, not through runtime-specific team managers. | Mixed teams are governed by one server-owned orchestration owner over runtime-neutral member runs. | UC-006, UC-007, UC-008, UC-013 |
| R-009 | Inter-agent communication for mixed teams must be owned by a single server-side inter-agent router that accepts canonical delivery requests and targets the recipient `AgentRun` through the shared `postUserMessage(...)` boundary. | `send_message_to` works across runtime combinations without pairwise runtime-specific routing logic. | UC-008 |
| R-010 | The canonical mixed-team inter-agent delivery path must build message content that keeps sender identity visible to the recipient model while also preserving sender metadata for downstream event consumers. | Recipients on AutoByteus, Codex, and Claude can all understand who sent the message. | UC-008 |
| R-011 | Standalone Codex and Claude team-member bootstraps must consume a runtime-neutral member-team context for teammate instructions, allowed-recipient lists, and `send_message_to` delivery wiring rather than depending on same-runtime team ownership guards. | Codex and Claude mixed members retain communication affordances through one explicit member-team contract. | UC-009 |
| R-012 | AutoByteus standalone member runs created for mixed teams must receive a custom communication-focused team context through `initialCustomData`. | AutoByteus mixed members can participate in mixed-team communication without native `AgentTeam` ownership. | UC-010 |
| R-013 | `autobyteus-ts` communication consumers (`send_message_to`, sender-name resolution, and teammate manifest injection for communication) must depend on a narrow communication-context contract rather than directly on raw native `teamManager` ownership. | The same AutoByteus communication surfaces can work for both native and mixed team contexts. | UC-008, UC-010 |
| R-014 | The AutoByteus standalone runtime bootstrap owner must remove `ToolCategory.TASK_MANAGEMENT` tools from mixed AutoByteus members before tool instantiation/exposure while leaving native AutoByteus teams unchanged. | Mixed AutoByteus members remain communication-only and never expose task-plan tools. | UC-011 |
| R-015 | Existing single-runtime team managers may remain for their own paths, but the mixed-team path must not call into them, wrap them, or depend on them for routing. | The mixed path is a clean new orchestration path, not a hidden layering over legacy team managers. | UC-012 |
| R-016 | Server restore for mixed teams must reconstruct the correct team backend selection and per-member contexts from persisted member runtime metadata and platform run ids instead of collapsing the team back to one runtime owner. | A restored mixed team can resume communication without first-member-runtime inference. | UC-013 |
| R-017 | When a member runtime override makes the inherited team-default model unavailable for that member’s effective runtime and the member has no compatible explicit model override, the member row must enter a blocking unresolved state that surfaces the mismatch, clears/suppresses the inherited effective model/config for that row, and requires the user to choose a compatible member model or remove the runtime override. | Users can see and correct the mixed-runtime incompatibility instead of silently launching a broken member configuration. | UC-014 |
| R-018 | `teamRunConfigStore` must become the authoritative workspace launch-readiness owner for team runs by evaluating both global requirements and per-member mixed-runtime unresolved state through one shared frontend readiness utility, and `RunConfigPanel` must use that readiness boundary instead of the current global-only `isConfigured` check. | Workspace Run button enablement/disablement matches the real mixed-runtime launchability of the team. | UC-003, UC-014 |
| R-019 | Frontend team-launch entrypoints that materialize or submit member configs must reject unresolved mixed-runtime member state instead of silently inheriting an invalid team-default model/config. | No frontend launch path emits a broken mixed-runtime member launch payload once the user has an unresolved row. | UC-003, UC-014 |

## Acceptance Criteria

| acceptance_criteria_id | mapped_requirement_ids | Testable Criteria |
| --- | --- | --- |
| AC-001 | R-001, R-002 | In the workspace team run form, a member override row can be switched from “use global runtime” to a concrete runtime and back again, and the underlying `memberOverrides[memberName].runtimeKind` state is created/removed accordingly. |
| AC-002 | R-003 | When a member’s effective runtime changes in the form, the member’s model options reload for that runtime and any invalid member-only model/config values are cleared. |
| AC-003 | R-004 | Launching a temporary team from the app emits `memberConfigs[]` with different `runtimeKind` values when different member runtime overrides are configured. |
| AC-004 | R-004 | Temporary in-app team member contexts are created with `member.config.runtimeKind` matching the effective per-member runtime selection. |
| AC-005 | R-005 | Reopening a stored team run whose metadata contains multiple member runtime kinds reconstructs a truthful team config with a team default runtime plus runtime overrides on the members that differ. |
| AC-006 | R-006, R-007 | When `createTeamRun(...)` receives member configs containing at least two different runtime kinds, backend team creation resolves a mixed team backend selector and does not throw `[MIXED_TEAM_RUNTIME_UNSUPPORTED]`. |
| AC-007 | R-006, R-016 | When restoring a persisted mixed team run, the server resolves the mixed team backend selector from persisted member runtime metadata and restores a mixed team context instead of inferring a single governing runtime. |
| AC-008 | R-008 | A mixed team run can activate at least two members on different runtimes through `AgentRunManager`, and a targeted team-level user message reaches the intended member run. |
| AC-009 | R-009, R-010 | `send_message_to` from one mixed-team member to another succeeds across at least one cross-runtime pair and the recipient receives content that explicitly identifies the sender. |
| AC-010 | R-011 | A Codex mixed member and a Claude mixed member each receive teammate instructions, constrained recipient lists, and working `send_message_to` delivery wiring through the runtime-neutral member-team context rather than same-runtime team guards. |
| AC-011 | R-012, R-013 | An AutoByteus member running inside a mixed team can call `send_message_to` successfully using injected mixed-team communication context, while native AutoByteus team communication continues to function. |
| AC-012 | R-013 | AutoByteus teammate manifest / communication guidance can render from the new communication context contract without needing the full native `AgentTeamContext` object on the mixed path. |
| AC-013 | R-014 | Mixed AutoByteus members do not expose any `ToolCategory.TASK_MANAGEMENT` tools, including current task-plan tools such as `assign_task_to`, before tool manifest/schema exposure. |
| AC-014 | R-015 | Mixed-team routing code does not instantiate or delegate through the legacy runtime-specific team managers. |
| AC-015 | R-017 | When a member runtime override changes the member to a runtime that cannot use the team-default model, that row becomes visibly unresolved, instructs the user to choose a compatible member model or clear the runtime override, and no longer pretends to inherit the incompatible team-default model/config. |
| AC-016 | R-018 | While any member row is unresolved for this reason, `teamRunConfigStore` reports launch readiness as false and `RunConfigPanel` disables the Run Team action even if team-level model and workspace are populated; once the row is resolved, readiness can return to true. |
| AC-017 | R-019 | A frontend team-launch path that tries to materialize or submit member configs while such an unresolved row exists surfaces the blocking issue and does not emit `memberConfigs[]` that inherit the invalid team-default model/runtime combination. |

## Constraints / Dependencies

- `AgentRunManager`, `AgentRun`, and runtime-specific standalone agent-run backends must remain the execution foundation for mixed members.
- Existing single-runtime team managers and native AutoByteus team runtime must remain stable for their current paths.
- The team backend selector must stay confined to the team boundary and must not leak into member runtime-management or model-catalog concerns.
- The frontend must preserve the convenience of one team-level default runtime/model/config while still allowing per-member runtime override.
- AutoByteus communication refactoring must not break existing native task-plan tools, even though mixed-team v1 does not support them.
- The design must preserve deterministic member identity (`memberName`, `memberRouteKey`, `memberRunId`) across routing, eventing, launch, reopen, and restore.

## Assumptions

- Mixed-team v1 is still communication-only from the backend capability perspective.
- The workspace team run form is the required user-facing entrypoint for this ticket’s mixed-runtime launch UX.
- The dedicated team backend selector can be derived from member runtime composition on create/restore in v1; frontend callers do not need to send it yet.
- Category-level task-management stripping for mixed AutoByteus standalone members is acceptable for v1 because the goal is communication-only behavior.

## Risks / Open Questions

- `Q-001` The member-override UX should stay compact enough to remain usable for large teams; the design should avoid turning each row into an overly heavy form.
- `Q-002` Mixed AutoByteus v1 strips the full `ToolCategory.TASK_MANAGEMENT` surface. If later product scope wants some non-task-plan task tools back, the policy owner will need a narrower allow/deny rule.
- `Q-003` Other product surfaces that consume `TeamRunConfig` may need follow-up work if they also expect one team runtime everywhere, even if the workspace launch path is corrected in this ticket.
- `Q-004` The canonical recipient-visible message wording may need tuning so sender identity remains clear without degrading model behavior.

## Requirement-To-Use-Case Coverage

| requirement_id | covered_use_cases |
| --- | --- |
| R-001 | UC-001, UC-002 |
| R-002 | UC-001, UC-002 |
| R-003 | UC-002 |
| R-004 | UC-003, UC-004 |
| R-005 | UC-005 |
| R-006 | UC-006, UC-013 |
| R-007 | UC-006 |
| R-008 | UC-006, UC-007, UC-008, UC-013 |
| R-009 | UC-008 |
| R-010 | UC-008 |
| R-011 | UC-009 |
| R-012 | UC-010 |
| R-013 | UC-008, UC-010 |
| R-014 | UC-011 |
| R-015 | UC-012 |
| R-016 | UC-013 |
| R-017 | UC-014 |
| R-018 | UC-003, UC-014 |
| R-019 | UC-003, UC-014 |

## Acceptance-Criteria-To-Scenario Intent

| acceptance_criteria_id | Scenario Intent |
| --- | --- |
| AC-001 | Prove the user can configure per-member runtime override state directly from the workspace form. |
| AC-002 | Prove the per-member override UI stays runtime-correct when runtime changes. |
| AC-003 | Prove the workspace launch path preserves mixed runtime into GraphQL member configs. |
| AC-004 | Prove temporary in-app team contexts also preserve mixed runtime truth before backend launch. |
| AC-005 | Prove reopened team config stays truthful instead of collapsing to one runtime. |
| AC-006 | Prove mixed-team creation becomes an explicit supported backend path with the right selector subject. |
| AC-007 | Prove restore uses team-backend selection correctly instead of collapsing to one runtime owner. |
| AC-008 | Prove the mixed team owner really governs per-member `AgentRun`s. |
| AC-009 | Prove cross-runtime inter-agent communication works and sender identity is preserved in delivered content. |
| AC-010 | Prove Codex/Claude mixed-member bootstrap no longer depends on same-runtime team ownership. |
| AC-011 | Prove AutoByteus mixed members can participate through injected custom context without breaking native AutoByteus communication. |
| AC-012 | Prove AutoByteus communication guidance can use the new shared communication context contract. |
| AC-013 | Prove mixed AutoByteus runtime bootstrap removes task-management tools before they surface. |
| AC-014 | Prove the mixed path is architecturally independent from legacy team managers. |
| AC-015 | Prove the UI exposes the blocking invalid-inherited-default case instead of silently inheriting the wrong model/config. |
| AC-016 | Prove workspace Run-button gating depends on real mixed-runtime readiness, not only team-global fields. |
| AC-017 | Prove frontend launch paths do not emit broken mixed-runtime payloads when a row is unresolved. |

## Approval Status

User reopened scope on 2026-04-23 and explicitly stated the ticket is not acceptable without user-facing per-member runtime selection from the app. This revision incorporates that requirement expansion plus the prior architecture-review findings `DAR-001`, `DAR-002`, and `DAR-003`. Architecture review round 3 then identified `DAR-004`, which reopens the package until the frontend invalid-inherited-default behavior and authoritative launch-readiness ownership are explicitly defined.
