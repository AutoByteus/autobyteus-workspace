# Requirements Document

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-006` (approved baseline `SR-002`; SR-006 refines REQ-007/AC-010 at the user's request, see Approval state)
- Package identifier: `delegated-launch-config-defaults`
- Request / ticket: Project Task from `/project_task_manager` (2026-10-12) — "Respect the runtime/model defaults configured on agent and team definitions everywhere an agent or team is started".
- Requirements owner: Solution Designer (`/software_engineering_team/solution_designer`)
- Date: 2026-10-12
- Approval state and reference: Approved by the user in the Solution Designer conversation on 2026-10-12. After the recommendations were explained (DEC-001 order; DEC-009 top selection; pre-fill behavior) and the user was asked to reply "approved" or request changes, the user replied: "I trust your reasoning. I think you have very, very good comments. You understand those user journey common sense very well." This is recorded as approval of the recommended options and of this requirements baseline.
- Exact approved requirements baseline / solution revision: `SR-002` (this document as of 2026-10-12), plus the SR-006 refinement of REQ-007/AC-010 requested by the user on 2026-10-12. The request was relayed by `/project_task_manager` with Task screenshots 40–42: "collapsed by default … with expand on click to see members and details; the same in running and stopped runs, consistent with how Member settings expands."
- Behavior-defining supplements and their approved versions: None

## Problem And Desired Outcome

- Problem: Agent, team and Org definitions can carry a `defaultLaunchConfig` (runtime, model, model settings) so the user can say "this agent runs on this runtime and model". Starting an agent from the app respects it, but:
  - a **delegated copy** (`delegate_task` to an available agent or team) and a **collaborator** (brought in with `send_message_to` or after an `@` mention) always run on the run root's runtime/model. Every member of a delegated or collaborator team gets the same value. Confirmed in `collaborator-entry-builder.ts` (`cloneLaunch(input.rootLaunchConfiguration)`) and `collaborator-source-projector.ts`.
  - a **user-started team or Org** applies only the team's or Org's own default to the root. Each member's own default is ignored.

  So when the Project Task Manager delegates to the Software Engineering Team, every member runs on the PM's runtime and model. The user cannot put the Implementation Engineer and Code Reviewer on Codex / Sol 6.1.
- Affected actors or systems: the user (definition author and launcher); delegating agents (Project Task Manager, coordinators, any member); delegated copies and collaborators; the server's collaboration/delegation subsystem; the web's launch surfaces and run Settings.
- Desired outcome: wherever an agent or team is started, each agent in it runs on its configured default according to one agreed priority order. A run inherits the starting run's runtime/model only when nothing usable is configured. A configured default that cannot be used falls back visibly. The user can see what each agent ran on and why.
- Observable definition of success: with Codex / Sol 6.1 set as the default of the Implementation Engineer and Code Reviewer, a Software Engineering Team that the PM delegates runs those two members on Codex / Sol 6.1 and the rest on the PM's runtime/model. The run's Settings shows this.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Related Scenario IDs | Evidence-Backed Current Behavior | Desired Behavior | Intentionally Preserved Behavior | Investigation Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | SCN-001, SCN-003 | Catalog copy (agent or team) runs every agent on the root launch configuration | Each agent resolved by the priority order (REQ-001..REQ-004) | Copy identity, addressing, handoffs, admission all-or-nothing | Source log: entry builder, admission |
| BEH-002 | System | SCN-002, SCN-003 | Collaborator bring-in (agent or team) runs every agent on the root launch configuration | Same as BEH-001 | One collaborator instance per definition; `@` only resolves | Source log: admission `ensure` |
| BEH-003 | System | SCN-004 | Extra copies at a collaborator address, and teammates delegated inside a copy, use the recorded team-level value | Use the recorded per-agent value | Reuse of the recorded snapshot (no re-read of definitions) | `collaborator-source-projector.ts` |
| BEH-004 | User | SCN-008 | Single agent start seeds from the agent default, then last chat model, then default runtime | Unchanged | All | `chatDraftStore.ts`, `startModelDefaults.ts` |
| BEH-005 | User | SCN-005 | Team / Org start seeds only the root from the team / Org default; members follow the root | Members are seeded from their own configured defaults per the priority order; the user may change anything before Run | Per-member editing, unresolved-row rules from `agent-team-member-runtime-selection` | `useDefinitionLaunchDefaults.ts`, `agentOrgLaunchDraftStore.ts` |
| BEH-006 | System | SCN-008 | Delegation to a configured placement uses that placement's launch configuration | Unchanged (it is the user's launch choice) | All | `team-task-source-resolver.ts` |
| BEH-007 | System | SCN-006 | Reopen restores collaborators/copies from recorded values | Unchanged for older runs; newer runs restore per-agent values and their source | Snapshot stability; older runs readable | run-history schemas |
| BEH-008 | User | SCN-007 | Settings lists the root and configured members only | Also lists collaborators and delegated copies, read-only, with runtime, model, source and any fallback note | Existing editing of root/configured members | `runMemberTree.ts` |
| BEH-009 | System | — | Application launch baselines layer team default before agent default | Unchanged (out of scope, DEC-006) | All | `application-launch-resource-baseline-builder.ts` |

## Stakeholders, Actors, And Outcomes

| Actor / Stakeholder | Goal Or Responsibility | Required Outcome | Important Constraint |
| --- | --- | --- | --- |
| User (definition author) | Configure where each agent runs, once, in its definition | The configuration is honored wherever the agent is started | No per-launch re-entry needed |
| User (launcher) | Start a run with an explicit choice | Explicit launch choices win for that run | Launch form shows what will run |
| Delegating agent | Delegate or bring in work | Delegation still succeeds when a configured runtime is unavailable, with a note | All-or-nothing admission kept |
| User (observer) | Know what each agent ran on | Per-agent runtime/model and source visible | Read-only for copies/collaborators |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Related Scenario IDs |
| --- | --- | --- |
| UC-001 | An agent delegates a copy of an available agent or team (`delegate_task` catalog copy) | SCN-001, SCN-003 |
| UC-002 | An agent brings in a collaborator agent or team (`send_message_to` to its address, including after a user `@` mention) | SCN-002, SCN-003 |
| UC-003 | An agent delegates an extra copy at a collaborator address, or delegates to a teammate inside a copy or collaborator team | SCN-004 |
| UC-004 | The user starts a team (New chat, mobile) or an Org (Org launch page) | SCN-005 |
| UC-005 | The user reopens a run with collaborators/copies | SCN-006 |
| UC-006 | The user views which configuration each agent of a run used | SCN-007 |

### Out Of Scope

- Runtime/model **routing** (the platform choosing a runtime/model from the Task when nothing is configured), Task `project_task_871c0af0-1467-4741-bf74-7acc0629882d`.
- Application launch baselines and their precedence (BEH-009). A follow-up candidate to align them is recorded under DEC-006.
- New definition fields, such as per-member launch settings inside `team-config.json`.
- Editing the runtime/model of an existing collaborator or delegated copy.
- Authentication checks beyond what runtime availability and the runtime's model catalog already detect (see UNK-001).
- Changing the inherited source from the run root to the delegating member (DEC-003).

### Non-Goals

- Re-resolving defaults for collaborators or copies that are already recorded when a definition changes later (DEC-008).

### Preserved Behavior Boundary

- BEH-004, BEH-006 and BEH-009 stay unchanged.
- Admission stays all-or-nothing: nothing is added when the delegation or bring-in fails.
- Workspace and auto-approve still come from the starting run. Antigravity's enforced auto-approve is unchanged.
- Older recorded runs restore exactly as before (AC-009).

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID that it protects.
- A finding that would introduce new product behavior, policy, threat model, migration obligation, compatibility promise, or operational contract is a `Requirement Gap`; it requires explicit user approval before becoming authoritative.
- An adjacent concern outside the approved boundary may be recorded as a non-blocking risk, recommendation, or separate-ticket candidate. It is not a required design correction.
- A downstream reviewer comment does not amend this requirements basis. The Solution Designer must update the canonical requirements and obtain renewed user approval before a scope-changing proposal can govern design or implementation.

## Requirements

| Requirement ID | Requirement | Related Behavior IDs | Priority / Criticality | Rationale | Source / Decision Reference |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | When an agent or team is started without an explicit user launch choice (catalog copy, collaborator), each agent in it gets its runtime, model and model settings from the first **usable** layer, in this order: (1) the agent's own definition default; (2) for a team member, its team definition's default; (3) inherited from the run root's launch configuration. | BEH-001, BEH-002 | Must | User direction; most specific configuration wins | DEC-001 (Needs user), DEC-003 |
| REQ-002 | Runtime, model and model settings are taken together from the one layer that wins. A layer is usable only if it names both a runtime and a model, the runtime is available, the model is offered by that runtime for the run's workspace, and its model settings are valid for that model. Workspace and auto-approve always come from the starting run. | BEH-001, BEH-002 | Must | Model identifiers belong to a runtime; same rule the app already uses for start defaults | DEC-002, DEC-004 |
| REQ-003 | When a configured layer is skipped because it is unusable (runtime unavailable, model not offered, settings invalid, or incomplete), the next layer is used. The agent starts, and a note records the agent, the skipped configuration, the reason and what was used instead. | BEH-001, BEH-002 | Must | "Falls back clearly, with a visible note" | Task "Done when" |
| REQ-004 | When no layer is usable, including the inherited one, the delegation or bring-in fails as it does today, with the reason, and nothing is started. | BEH-001, BEH-002 | Must | Preserve all-or-nothing admission | Preserved |
| REQ-005 | Each agent's resolved runtime, model, settings, source (agent default / team default / inherited) and any fallback note are recorded when the collaborator is added or the copy starts. Extra copies at that collaborator address, teammates delegated inside it, and restore all use the recorded values. | BEH-003, BEH-007 | Must | Snapshot stability; per-member truth | DEC-008 |
| REQ-006 | Older recorded runs restore with the same configuration they ran with. Every member of an older collaborator team or team copy keeps the recorded team-level value, and its source is shown as "not recorded". | BEH-007 | Must | No data loss | Data continuity |
| REQ-007 | The run's Settings view lists every collaborator and delegated copy, and each of their agents, read-only, with runtime, model, source and any fallback note. **(SR-006)** Each collaborator or copy is one row, collapsed by default in both running and stopped runs, and expands on click like the Member settings rows: a team shows its agents, and an agent shows its read-only settings, source and notes. | BEH-008 | Must | "The run shows which configuration was used" | DEC-005 |
| REQ-008 | When a fallback happened, the result of the delegation or bring-in shown in the delegating conversation includes the fallback note, so the user and the delegating agent see it where the delegation happened. | BEH-001, BEH-002 | Must | Visible note at the point of action | DEC-005 |
| REQ-009 | When the user starts a team or an Org, the launch form seeds each agent (and, for an Org, each placed team) from its own usable configured default by the same priority order, with the root seeded as today. A member whose configured default is unusable follows its parent, and its row shows a note. What the form holds at Run is what runs: the user's explicit choices win. | BEH-005 | Must | "Respected however started"; explicit user choice wins | DEC-001, DEC-007 |
| REQ-010 | In the user launch form, changing the root runtime/model does not overwrite members seeded from their own defaults. Each seeded member can be reset to follow its parent. | BEH-005 | Should | Consequence of member default over inherited | DEC-001, DEC-009 |
| REQ-011 | Delegation to a configured placement, single-agent start and application launches keep their current behavior. | BEH-004, BEH-006, BEH-009 | Must | Scope guardrail | DEC-006 |

## Acceptance Criteria

| Acceptance-Criteria ID | Related Requirement IDs | Related Behavior / Scenario IDs | Preconditions / Trigger | Observable Expected Outcome | Important Alternate Or Failure Outcome | Verification Intent |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001, REQ-002 | BEH-001 / SCN-001 | Root runs on runtime A/model a. Team T has no default. Members M1 and M2 have usable default Codex / Sol 6.1. M3 has none. An agent calls `delegate_task` to T's catalog address | M1 and M2 run on Codex / Sol 6.1 with their own settings. M3 runs on A/a. All share the root workspace and auto-approve | — | Server integration test; user verification |
| AC-002 | REQ-001 | BEH-001 / SCN-001 | Team T has usable default B/b. M1 has its own usable default; M3 has none | M1 uses its own default and M3 uses B/b (DEC-001) | — | Server test |
| AC-003 | REQ-001 | BEH-001 / SCN-001 | Agent G has a usable default; delegated as a catalog agent copy | G's copy runs on its default; without a default, on the root's | — | Server test |
| AC-004 | REQ-001, REQ-002 | BEH-002 / SCN-002 | An agent brings in agent G, or team T, with `send_message_to` | Same results as AC-001..AC-003 | — | Server test |
| AC-005 | REQ-003, REQ-008, REQ-007 | SCN-003 | M1's default runtime is unavailable, its model is not offered, its settings are invalid, or the default is incomplete | M1 starts on the next usable layer. The delegating conversation's delegation/bring-in result carries a note naming M1, the skipped configuration, the reason and what was used. Settings shows the same note | — | Server tests per reason; UI test for the note |
| AC-006 | REQ-004 | SCN-003 | No layer is usable for some agent | The delegation or bring-in fails with the reason, and nothing is added or started (as today) | — | Server test |
| AC-007 | REQ-005 | BEH-003 / SCN-004 | A collaborator team with per-member values exists. An agent delegates an extra copy at its address, or a teammate inside it | Each agent runs on its recorded value | — | Server test |
| AC-008 | REQ-005 | SCN-006 | After a copy starts, M1's definition default is edited | The existing copy and its restore keep the recorded values. A new copy started afterwards uses the new default | — | Server test |
| AC-009 | REQ-006 | BEH-007 / SCN-006 | A run recorded before this change, with a collaborator team and a catalog team copy, is reopened | Every member restores on the recorded team-level value. Nothing fails to load, and the source shows "not recorded" | — | Persistence/restore test with a fixture of the current shape |
| AC-010 | REQ-007 | BEH-008 / SCN-007 | User opens Settings of a run with collaborators and copies | Each collaborator and copy is listed read-only, one collapsed row each, with a chevron; expanding a team shows its agents, and expanding an agent shows runtime, model, settings, source and any note. The same holds for running and stopped runs. Root and configured members stay editable as today | — | Web component test; user verification |
| AC-011 | REQ-009 | BEH-005 / SCN-005 | User starts a team from New chat (and mobile) whose members have usable defaults | Member rows are seeded with their defaults, and members without one follow the root. Run launches exactly what is shown | Unusable member default: the row follows the root and shows a note | Web unit/component tests |
| AC-012 | REQ-009 | BEH-005 / SCN-005 | User opens the Org launch page for an Org whose placed teams and agents have defaults | The root is seeded from the Org default (as today). Placed teams are seeded from their team default and agents from their agent default | — | Web test |
| AC-013 | REQ-009, REQ-010 | BEH-005 / SCN-005 | In the launch form, the user changes the root model, then a member's model, then resets another member | Seeded members keep their defaults after the root change. The changed member launches with the user's choice. The reset member follows the root | — | Web test |
| AC-014 | REQ-011 | BEH-004, BEH-006, BEH-009 | Single-agent start; delegation to a configured placement; application launch | Behavior is identical to before | — | Existing tests pass |
| AC-015 | REQ-001..REQ-008 | SCN-001 | User sets Codex / Sol 6.1 as the default of `implementation-engineer` and `code-reviewer` in the Software Engineering Team. The PM delegates a Task to the team | Those two members run on Codex / Sol 6.1 and the rest on the PM's runtime/model, shown in Settings | If Codex is unavailable, the note is shown and they run on the PM's | User verification |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor / Initiator / Governing Contract | Coherent Goal Or Governing Event | Supported Trigger / Entry Surface | Starting Condition | Product-Level Steps Or Event Sequence | Expected Outcome | Supported Alternate / Error Behavior | Scenario Validity | Independent Evidence / Decision Reference | Related Requirement / AC IDs |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | System | Delegating agent (e.g. PM) | Hand a Task to an available team or agent | `delegate_task` to a catalog address | Target not in run; definitions may carry defaults | Agent delegates → copy is planned per agent by priority → copy starts → result returned | Each agent runs on its resolved configuration | SCN-003 | Supported Normal Scenario | User Task text; `collaborator-admission.ts` | REQ-001..005; AC-001..003, AC-015 |
| SCN-002 | System | Delegating agent; user `@` mention | Bring a collaborator into the run | `send_message_to` to an available address | Not yet in run | Bring-in planned per agent → committed → message delivered | Same as SCN-001 | SCN-003 | Supported Normal Scenario | `collaborator-admission.ts` `ensure` | REQ-001..005; AC-004 |
| SCN-003 | System | Delegating agent | Delegate when a configured runtime cannot be used | As SCN-001/002 | Configured runtime unavailable, model not offered, settings invalid, or default incomplete | Layer skipped → next layer used → note recorded and returned | Copy starts with a visible note; fails only if nothing is usable | — | Supported Explicit Edge Scenario | Task "Done when" (fallback note) | REQ-003, REQ-004, REQ-008; AC-005, AC-006 |
| SCN-004 | System | Delegating agent / teammate | Delegate again at a collaborator address or inside a copy | `delegate_task` | Collaborator/copy recorded | Source taken from the recorded entry | Recorded per-agent values | — | Supported Normal Scenario | `collaborator-source-projector.ts` | REQ-005; AC-007 |
| SCN-005 | User | User | Start a team or Org | New chat, mobile setup, Org launch page | Definitions may carry defaults | Form seeded → user optionally edits → Run | What is shown runs | Unusable member default: row follows parent with a note | Supported Normal Scenario | User direction "however started"; `useDefinitionLaunchDefaults.ts` | REQ-009, REQ-010; AC-011..013 |
| SCN-006 | User | User | Reopen a run | Run history | Run recorded before or after this change | Run restored | Same configuration as recorded | — | Supported Normal Scenario | run-history schemas | REQ-005, REQ-006; AC-008, AC-009 |
| SCN-007 | User | User | See what each agent runs on | Run Settings | Run has collaborators/copies | Open Settings | Read-only rows with runtime, model, source, note | — | Supported Normal Scenario | Task "Done when" | REQ-007; AC-010 |
| SCN-008 | User/System | User; delegating agent | Single agent start; delegation to a configured teammate | New chat; `delegate_task` to a configured placement | — | Unchanged | Unchanged | — | Supported Normal Scenario | Existing behavior | REQ-011; AC-014 |

## UI, Interaction, And Experience Requirements

- Applicable: `Yes` (small, within existing surfaces)
- Linked UI/UX or interaction supplement: N/A — not applicable (no Product Design requested)
- Linked runnable UI reference, separate design repository/root, UI/UX specification, and applicable support artifacts: N/A — not applicable
- Product ticket record and folder (externally owned): N/A — not applicable
- Design repository revision or commit: N/A — not applicable
- UI/UX user-confirmation reference: N/A — not applicable
- Approved visual-reference baseline: N/A — not applicable
- Normative visual and interaction details, including the approved final references: N/A — not applicable
- Explicitly illustrative fixture content or permitted implementation variation: Wording and layout of the source label and note follow existing Settings/launch-row patterns.
- Required screens, states, transitions, feedback, responsive behavior, or accessibility outcomes:
  - Run Settings: read-only collaborator/copy rows (AC-010).
  - Launch forms: seeded member rows and an unusable-default note (AC-011..013).
  - Delegating conversation: fallback note in the delegation/bring-in result (AC-005).
- Product decisions that need the user (with reasoning and recommendation): none beyond DEC-001.

## Quality And Non-Functional Requirements

| Quality ID | Related Requirement / AC IDs | Area | Measurable Requirement Or Constraint | Conditions / Scope | Verification Intent |
| --- | --- | --- | --- | --- | --- |
| QR-001 | REQ-002, REQ-003 | Performance | A delegation or bring-in checks each runtime's availability and model catalog at most once, whatever the number of agents | Per admission | Unit test on shared catalog evidence |
| QR-002 | REQ-005, REQ-006 | Compatibility | Every run recorded before this change loads and restores without error | All existing run records | AC-009 |

## Data Continuity And Acceptable Loss

- Persisted or external data affected: `Yes`
- Data or state that must be preserved: every recorded collaborator and delegated copy, with the launch configuration it ran with.
- Loss, reset, rebuild, or regeneration that is acceptable: none.
- Retention, privacy, compliance, volume, downtime, or operational constraints: none beyond normal startup.
- Unknowns requiring downstream investigation: the repository's persisted-data transition convention (architecture phase).

## External Contracts And Dependencies

| Contract / Dependency | Required Behavior Or Constraint | Evidence / Authority | Uncertainty Or Risk |
| --- | --- | --- | --- |
| Runtime availability and model catalogs (Codex, Claude, AGY, Grok, AutoByteus) | Decide whether a configured layer is usable | `runtime-availability-service.ts`, `run-model-selection-service.ts` | UNK-001: an unauthenticated runtime may pass these checks and fail only at the first turn. That failure is then reported as a run error, not a fallback |
| Team/collaboration view DTO packages | Carry per-agent values, source and note | `autobyteus-team-stream-contracts`, `autobyteus-collaboration-stream-contracts` | Contract change |

## Supplemental Artifacts

| Artifact Path | Purpose | Related Requirement / AC IDs | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- |
| None | — | — | — | — |

## Assumptions

| Assumption ID | Assumption | Why It Is Necessary | Validation Plan / Owner | Status |
| --- | --- | --- | --- | --- |
| ASM-001 | "Inherited from the starting run" means the run root's launch configuration, as today | Defines the fallback layer | DEC-003; confirmed by code | Accepted |
| ASM-002 | An unauthenticated runtime is detected only when availability or the model catalog fails | Bounds REQ-003 | UNK-001, architecture | Open |

## Decisions

| Decision ID | Question | Why It Matters | Options / Evidence | Reasoning And Recommendation | Decision Owner | Status |
| --- | --- | --- | --- | --- | --- | --- |
| DEC-001 | Priority order, and how a team default and a member default combine | Core behavior of the Task | (a) agent default > team default > inherited (PM's example). (b) team default > agent default > inherited (the existing application-launch order). | The agent's own default is the most specific statement of the user's intent: the user's example sets it per agent (IE, CR) and expects it to hold inside the team. Under (b), adding any team default would silently cancel every member default. A team author who wants one runtime for all members can leave member defaults empty and set only the team default. Team-local agents (like the SE team's) are the team's own per-member configuration, so (a) also respects the team author. For user starts, an explicit choice in the launch form wins over everything; the form is seeded by the same order. For Orgs: agent > its team > Org > root seed. **Recommend (a).** User chose (a), 2026-10-12. | User | Decided |
| DEC-002 | Combine fields across layers, or take one layer as a unit? | A model ID is only valid on its runtime | Per-field mixing (application builder) vs. one unit | Mixing can pair a runtime from one layer with a model from another and fail. **One unit**: runtime, model and settings from the same layer. Workspace and auto-approve stay with the starting run, since they are not part of definition defaults | Solution Designer | Decided |
| DEC-003 | Inherit from the run root or from the delegating member? | Fallback source | Root (current) vs. delegator | A collaborator is shared by the whole run and may be brought in by any member, so inheriting from the delegator would depend on who came first. The Task describes the current fallback as "the starting run's runtime/model". **Keep the root** | Solution Designer | Decided |
| DEC-004 | What makes a default usable; incomplete defaults | Fallback trigger | The app's existing start-default rule (`resolveStartModel`) | Reuse it for consistency: both runtime and model named, runtime available, model offered, settings valid. An incomplete default (runtime only or model only) is skipped with a note. Filling in a missing model is routing, which is out of scope | Solution Designer | Decided |
| DEC-005 | Where "which configuration was used" and fallback notes are shown | Visibility | Settings view; delegation result; per-copy header | Settings already shows per-member runtime/model, so extend it with read-only collaborator/copy rows. Put the fallback note in the delegation/bring-in result too, so the user and the delegating agent see it where it happened. **Both** | Solution Designer | Decided |
| DEC-006 | Change application launch baselines to the same order? | Consistency | Applications have their own baseline contract with provenance | Different contract and owners; changing it risks applications that are already published. **Leave unchanged**; record alignment as a follow-up candidate | Solution Designer | Decided |
| DEC-007 | Are user-started team/Org launches in scope? | "Done when" names only delegation | User direction says "however started: started by the user, …" | The user's direction names user starts explicitly, and the SE team started by the user would otherwise still ignore member defaults. **In scope** (REQ-009, REQ-010) | Solution Designer (within user direction) | Decided |
| DEC-009 | In a user launch, does the top (root) runtime/model selection override members that have their own default? | Defines "explicit user choice wins" in the launch form | (a) The top selection applies only to members without their own default; member rows show their seeded default and can be changed or reset. (b) The top selection overrides every member. | The top selection is usually the pre-filled value or a general preference. Under (b), the user would have to re-fix IE/CR on every launch, and member defaults would only matter for delegation. A member row is the explicit per-member choice, and the form shows exactly what runs. **Recommend (a).** User accepted (a), 2026-10-12 | User | Decided |
| DEC-008 | Re-read definitions for already-started copies? | Stability | Snapshot (current) vs. live | Existing runs must restore as they ran. **Snapshot at start**; later starts use the edited default | Solution Designer | Decided |

## Traceability

| Requirement ID | Use-Case IDs | Behavior IDs | Acceptance-Criteria IDs | Scenario IDs | Supplemental / Product Design Evidence |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | UC-001, UC-002 | BEH-001, BEH-002 | AC-001..004, AC-015 | SCN-001, SCN-002 | — |
| REQ-002 | UC-001, UC-002 | BEH-001, BEH-002 | AC-001, AC-005 | SCN-001..003 | — |
| REQ-003 | UC-001, UC-002 | BEH-001, BEH-002 | AC-005 | SCN-003 | — |
| REQ-004 | UC-001, UC-002 | BEH-001, BEH-002 | AC-006 | SCN-003 | — |
| REQ-005 | UC-003, UC-005 | BEH-003, BEH-007 | AC-007, AC-008 | SCN-004, SCN-006 | — |
| REQ-006 | UC-005 | BEH-007 | AC-009 | SCN-006 | — |
| REQ-007 | UC-006 | BEH-008 | AC-005, AC-010 | SCN-007 | — |
| REQ-008 | UC-001, UC-002 | BEH-001, BEH-002 | AC-005 | SCN-003 | — |
| REQ-009 | UC-004 | BEH-005 | AC-011, AC-012 | SCN-005 | — |
| REQ-010 | UC-004 | BEH-005 | AC-013 | SCN-005 | — |
| REQ-011 | — | BEH-004, BEH-006, BEH-009 | AC-014 | SCN-008 | — |

## Architecture Phase Input

- Approved scenario IDs and product-level behavior paths architecture must map: SCN-001..SCN-008.
- Product and system constraints architecture must preserve: all-or-nothing admission; snapshot restore; root workspace/auto-approve; older records readable.
- Decisions intentionally deferred to architecture design: the owner of per-agent resolution; the recorded shape and transition for per-agent values, source and note; DTO changes; tool-result wording; web seeding mechanics.
- Technical facts architecture should verify: UNK-001 (auth detection); repository migration conventions; tool-result contracts of `delegate_task` and `send_message_to`.
- Known feasibility or integration risks: persisted schema plus two contract packages; web launch drafts on three surfaces.

## Readiness Check

### Content Ready For Approval

- Relevant current behavior is evidence-backed: `Yes`
- Desired and preserved behavior are explicit: `Yes`
- Scope and non-goals are clear: `Yes`
- Requirements and acceptance criteria are testable and traceable: `Yes`
- Applicable scenarios are covered with validity and evidence: `Yes`
- Product design and supplemental evidence is integrated consistently: `N/A`
- Applicable UI/UX approval and final visual-reference basis are recorded: `N/A`
- Material assumptions and decisions are visible, each decision with reasoning and recommendation: `Yes`
- Content ready for user approval: `Yes`
- Remaining content blocker: None

### Approved Basis Ready For Design

- User approval received: `Yes` (2026-10-12, see Document Status)
- Exact requirements and supplement approval basis recorded: `Yes` (SR-002; no supplements)
- Approved requirements package ready for architecture design: `Yes`
- Remaining blocker: None
