# Investigation Notes

## Investigation Meta

- Package identifier: `delegated-launch-config-defaults`
- Request / ticket: Project Task from `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), 2026-10-12: "Respect the runtime/model defaults configured on agent and team definitions everywhere an agent or team is started".
- Workspace root: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-launch-config-defaults`
- Repository mode: `Git`
- Task worktree / branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-launch-config-defaults` / `codex/delegated-launch-config-defaults`
- Resolved base remote / branch / revision: `origin` / `personal` / `beb6b3b494779eba207feac94a70cb050db7dcbc` (fetched 2026-10-12; `origin/HEAD -> origin/personal`)
- Finalization target remote / branch: `origin` / `personal`
- Bootstrap result: Worktree and branch created from refreshed `origin/personal`; ticket folder `tickets/in-progress/delegated-launch-config-defaults/`.
- Bootstrap blocker: None
- Current solution revision ID: `SR-004`
- Authorities read (requirements reading gate; file and date): `.claude/skills/solution-designer/references/requirements-engineering.md` (2026-10-12); repository `AGENTS.md` (2026-10-12). Architecture gate (2026-10-12): `references/architecture-design.md`, `references/design-principles.md`, `DESIGN.md`, `autobyteus-server-ts/docs/design/data_migration_guideline.md`, `TESTING.md`, `autobyteus-server-ts/AGENTS.md`.
- Investigation status: Requirements and architecture investigation complete (2026-10-12).

## Initial Request And Clarifications

- Original request: see `requirements-doc.md` → Problem. Delegated copies and collaborators always inherit the starting run's runtime/model; the configured `defaultLaunchConfig` on agent/team/Org definitions is ignored there. User wants e.g. Implementation Engineer and Code Reviewer on Codex / Sol 6.1 when the PM delegates the Software Engineering Team.
- Clarifications received (from the Task text, user's direction): defaults must be respected however an agent or team is started (user start, `delegate_task` copy, collaborator via `send_message_to` or `@`); an explicit user launch choice wins for that run; inheritance is only the fallback; this team proposes the exact priority order; unavailable/unauthenticated configured runtime falls back with a visible note; the run shows which configuration was used. Routing (platform picks a runtime/model) is out of scope.
- Initial ambiguity: exact priority order; how team-level and member-level defaults combine; what "starting run" means for inheritance; where configuration is shown; whether user-started team/Org launches are in scope (they are named in the direction but not in "Done when").

## Product And Domain Understanding

- Product area: Agent/Team/Org launch configuration; task delegation (`delegate_task`), collaborator bring-in (`send_message_to`, `@`), run history/restore, run Settings view.
- Affected actors or systems: the user (definition author and run launcher); delegating agents (e.g. Project Task Manager, team coordinators); delegated copies and collaborators; the server collaboration/delegation subsystem; the web launch surfaces.
- Terminology:
  - **Definition default** = `defaultLaunchConfig` `{runtimeKind, llmModelIdentifier, llmConfig}` on an agent (`agent-config.json`), team (`team-config.json`) or Org definition.
  - **Root launch configuration** = the run root's `AgentLaunchConfiguration` (`runtimeKind, llmModelIdentifier, llmConfig, autoExecuteTools, workspaceRootPath`); today the "inherited" value.
  - **Catalog copy** = `delegate_task` to an available agent/team that is not in the run (recorded as a `TaskExecution` with a `source` snapshot).
  - **Collaborator** = one shared instance of an agent/team brought into a run by `send_message_to` to its address (`CollaboratorEntry`); `@` resolves the address and the agent brings it in.
  - **Extra copy at a collaborator address** = `delegate_task` to an address that is already a collaborator (or a member of a collaborator team).
  - **Configured placement** = an agent/team that is part of the user-launched run's own configuration.

## Source Log

| Date | Source Type | Exact Source / Command / Query | Why Consulted | Relevant Finding | Follow-Up |
| --- | --- | --- | --- | --- | --- |
| 2026-10-12 | Code | `autobyteus-server-ts/src/launch-preferences/default-launch-config.ts` | Shape of definition default | `{llmModelIdentifier, runtimeKind, llmConfig}`, each nullable; all-null normalizes to `null`. Partial defaults (runtime-only, model-only) are representable. | Partial-default handling decision (DEC-004). |
| 2026-10-12 | Code | `agent-definition/providers/agent-definition-config.ts:51`, `file-agent-definition-provider.ts:153`; `agent-team-definition/providers/agent-team-definition-config.ts:126`; `agent-org-definition/providers/agent-org-definition-config.ts:133` | Where defaults are read | Agent, team and Org definitions all parse and expose `defaultLaunchConfig`. Team members (`TeamMember{memberName, ref, refScope}`) have **no** per-member launch config in the team definition; per-member defaults live on the member's agent definition (team-local or shared). | — |
| 2026-10-12 | Code | `agent-collaboration/collaborators/collaborator-entry-builder.ts:74,96` | Lead from PM | Agent plan: `launchConfiguration: cloneLaunch(input.rootLaunchConfiguration)`; Team plan: `defaultLaunchConfiguration: cloneLaunch(input.rootLaunchConfiguration)`. No definition default is read. **Lead confirmed.** | — |
| 2026-10-12 | Code | `collaborator-admission.ts` (`ensure`, `catalogTaskSource`, `buildPlan`, `toTaskExecutionSource`) | Which paths use the builder | Both collaborator bring-in (`ensure`) and catalog copies (`catalogTaskSource`) build plans through `CollaboratorEntryBuilder` with `port.rootLaunchConfiguration()`. | — |
| 2026-10-12 | Code | `collaborator-source-projector.ts` (`projectCollaboratorTeamNode`, `resolveCollaboratorCopySource`, `projectTaskExecutionSource`, `projectTaskSourceMember`, `collaboratorExecutionSource`, `catalogCopyExecutionSource`) | How members get settings | Every member of a collaborator team / catalog team copy is spread `...entry.defaultLaunchConfiguration` (one team-level value). Extra copies and teammates inside copies reuse the same team-level value. | Per-member value must be recorded (see persisted data). |
| 2026-10-12 | Code | `collaborator-identity-allocator.ts` | Allocation | Team children built with `...plan.defaultLaunchConfiguration`. | — |
| 2026-10-12 | Code | `collaborator-runnability-validator.ts` | Current failure behavior | Before commit, every placement is validated with `RunModelSelectionValidator.validateMany` (runtime catalog for the workspace, model presence, model-config schema). Any failure → `CollaboratorAddError` → `COLLABORATOR_ADD_FAILED`; nothing is added. No fallback. | Fallback design. |
| 2026-10-12 | Code | `collaborator-root-port.ts`; `standalone-root-collaborators.ts:36`; `team-run-collaborators.ts:27`; `agent-org-run-collaborators.ts:38` | What "inherited" means | `rootLaunchConfiguration()` = the run **root's** launch configuration (standalone agent host's launch, root team default, root Org default), not the delegating member's own config. | DEC-003. |
| 2026-10-12 | Code | `run-history/domain/run-execution-tree-shared-records.ts` | Persisted shapes | `CollaboratorAgentEntry.launchConfiguration` (per agent); `CollaboratorTeamMember` has **no** launch config ("uses the Team's `defaultLaunchConfiguration`"); `TaskTeamExecutionSource.members` are `{address, agentDefinitionId}` only; `TaskAgentExecutionSource.launchConfiguration` (per agent). No provenance/fallback fields. | Persisted-schema change needed for per-member values. |
| 2026-10-12 | Code | `run-history/store/task-execution-source-schema.ts`, `run-execution-tree-shared-record-schemas.ts:343-366` | Readers | Strict `requireKeys` parsers; `source` optional for older records. | Migration-conventions investigation at architecture gate. |
| 2026-10-12 | Contract | `autobyteus-team-stream-contracts/src/team-execution-view-dtos.ts` (collaborator team `default_launch_configuration`, lines ~205-256); `autobyteus-collaboration-stream-contracts/src/agent-org-execution-dtos.ts:143` | View DTOs | Collaborator team members and catalog team-copy sources expose only a team-level launch configuration to the web. | DTO change needed to show per-member values. |
| 2026-10-12 | Code | `agent-team-execution/domain/team-run-config.ts` (`TeamRunAgentNode`, `TeamRunAgentTeamNode`) | Runtime node shape | Runtime agent nodes **already carry per-node** `runtimeKind/llmModelIdentifier/llmConfig`; mixed-runtime teams are supported at runtime (ticket `agent-team-member-runtime-selection`). | Feasible without runtime-engine change. |
| 2026-10-12 | Code | `autobyteus-web/composables/useDefinitionLaunchDefaults.ts` (`buildAgentRunTemplate`, `buildTeamRunTemplate`) | User launch seeding | Agent start seeds from the agent default. Team start seeds **root only** from the team default; `agentOverrides: {}` — member agent defaults are not applied. | BEH-005. |
| 2026-10-12 | Code | `autobyteus-web/stores/chatDraftStore.ts:230-320`; `utils/runSettings/startModelDefaults.ts` (`resolveStartModel`, `definitionStartOrder`) | User launch default resolution (REQ-021 of an earlier ticket) | Start surfaces try candidates in order (definition default → last chat model → default runtime's first model); a candidate is **usable only if it names both runtime and model, its runtime is enabled and the model is in that runtime's catalog**; the winning candidate's own `llmConfig` is kept. | Precedent for "usable default" (DEC-004) and fallback. |
| 2026-10-12 | Code | `autobyteus-web/services/chat/chatTeamLaunchConfig.ts`; `stores/agentOrgLaunchDraftStore.ts:220-235` | Team / Org user launch | New-chat team: composer runtime/model is root config, members follow unless customized. Org launch: root seeded from Org default; placed teams/agents not seeded from their definitions. | BEH-005. |
| 2026-10-12 | Code | `autobyteus-web/composables/mobile/useMobileRunSetupController.ts:75-77` | Mobile launch | Uses agent/team definition default model only. | Include in user-launch seeding scope. |
| 2026-10-12 | Code | `application-platform/launch-configuration/application-launch-resource-baseline-builder.ts:59-130,242-330` | Existing layered precedent | Application launch baselines layer **team default before member agent default** (first non-empty wins per field; llmConfig atomic only when runtime/model match), with provenance per field. Opposite of the PM's suggested order. | DEC-001 alternative; applications kept out of scope (DEC-006). |
| 2026-10-12 | Code | `skill-improvement/services/retrospective-skill-improver-agent-settings-resolver.ts` | Another precedent | Improver agent: own definition default → target run fallback, per field. | Supports member-default-over-inherited. |
| 2026-10-12 | Code | `runtime-management/runtime-availability-service.ts`; `llm-management/services/run-model-selection-service.ts` | Availability/auth detection | Availability = command presence (Codex, Claude), model discovery (AGY), probe (Grok). Model validation = runtime model catalog for the workspace + schema. Catalog load failure → `model_unavailable`. Authentication is not checked explicitly; whether an unauthenticated Codex/Claude fails catalog listing is unknown. | UNK-001. |
| 2026-10-12 | Code | `autobyteus-web/utils/runSettings/runMemberTree.ts:280-330`; `components/workspace/config/ExistingRunConfigEditor.vue`; `run-history/services/studio-run-model-config-service.ts:70-85` | Where a run's configuration is shown | The run Settings (Edit Config) view lists the root and **configured** members only, with runtime/model per member. Collaborators and delegated copies are not listed; the user has no surface showing a copy's runtime/model today. | REQ-007 surface decision (DEC-005). |
| 2026-10-12 | Data | `/Users/normy/autobyteus_org/autobyteus-agents/agent-teams/software-engineering-team/team-config.json` and `agents/*/agent-config.json` | User's target scenario | SE team members are `team_local` agents; their `agent-config.json` files hold `toolNames`/`skillNames` and can hold `defaultLaunchConfig` (none set today). Team has no `defaultLaunchConfig`. | Verification setup: set Codex / Sol 6.1 on implementation-engineer and code-reviewer `agent-config.json`. |
| 2026-10-12 | Doc | `tickets/done/agent-team-member-runtime-selection/requirements.md` | Related done ticket | Per-member runtime overrides for user-launched teams; team-level config stays the convenient default; incompatible member runtime/model rows become unresolved. | Preserved behavior for user launch editing. |

## Relevant Existing Behavior And Supported Product Paths

| Behavior ID | Kind | Supported Trigger Or Governing Contract | Current Supported Product Behavior Path / Lifecycle | Current Outcome / Invariants | Evidence | Confidence / Unknown |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | Agent calls `delegate_task` with a `recipient_address` of an available agent/team not in the run (catalog copy) | Admission builds a plan from the definition with the root launch configuration → runnability check → copy started; its `source` snapshot recorded | Agent copy and every member of a team copy run on the root's runtime/model/config; definition defaults ignored | `collaborator-admission.ts` `catalogTaskSource`; `collaborator-entry-builder.ts:74,96` | High |
| BEH-002 | System | Agent calls `send_message_to` with an available agent/team address (bring-in); also after a user `@` mention, which only resolves the address | Same plan → runnability → identities allocated → collaborator entry committed | Same as BEH-001 | `collaborator-admission.ts` `ensure`; `resolveMentions` | High |
| BEH-003 | System | `delegate_task` to a collaborator address, to a member of a collaborator team, or a teammate inside a catalog team copy | Source projected from the recorded entry/snapshot | Runs on the recorded value (team-level for all team members) | `collaborator-source-projector.ts` | High |
| BEH-004 | User | User starts an agent from New chat / mobile | Draft seeded from the agent default (if usable), else last chat model, else default runtime's first model; user may change before Run | Agent default respected | `chatDraftStore.ts`, `startModelDefaults.ts` | High |
| BEH-005 | User | User starts a team (New chat, mobile) or an Org (Org launch page) | Root seeded from the team/Org default; members follow root unless the user customizes them | Member agent defaults and (for Orgs) placed-team defaults are not applied | `useDefinitionLaunchDefaults.ts` `buildTeamRunTemplate`; `chatTeamLaunchConfig.ts`; `agentOrgLaunchDraftStore.ts` | High |
| BEH-006 | System | `delegate_task` to a configured placement (teammate in the user-launched run) | Copy uses the configured placement's launch configuration | User's launch choice governs | `team-task-source-resolver.ts` | High |
| BEH-007 | System | Reopen/restore a run with collaborators/copies | Restored from the recorded entries/snapshots, not re-read from definitions | Snapshot stability | `collaborator-entry-builder.ts` doc comment; `task-execution-source-schema.ts` | High |
| BEH-008 | User | User opens a run's Settings | Root and configured members' runtime/model shown | Collaborators/copies not shown | `runMemberTree.ts` | High |
| BEH-009 | System | Application launch | Layered baseline: team default before agent default, with provenance | Separate application contract | `application-launch-resource-baseline-builder.ts` | High |

## Relevant Codebase And Technical Facts

| Path / Component / Contract | Current Responsibility Or Behavior | Requirement Implication | Architecture Question / Design Implication |
| --- | --- | --- | --- |
| `CollaboratorEntryBuilder` | Snapshots definition into plan with root launch | The single place where catalog copies and collaborators get their launch values | Natural owner for per-member resolution, or a dedicated resolver it calls |
| `CollaboratorRunnabilityValidator` | All-or-nothing validation of root settings | Becomes "choose first usable layer per member, record fallback" | Merge resolution and validation so availability evidence is shared |
| `CollaboratorTeamMember`, `TaskTeamExecutionSource.members` | No per-member launch | Must record per-member resolved values + provenance | Persisted schema + DTO change; older records lack it |
| `TeamRunAgentNode` | Per-node runtime fields | Runtime already supports mixed-runtime teams | No runtime-engine change expected |
| Web launch templates | Team/Org seeds root only | Seed members from their own defaults | Frontend draft change; reuse `resolveStartModel` usability rule |

## Structural And Payload Surface Inventory

### Payload Or Content Surfaces

- Agent/team/Org definition files (`agent-config.json`, `team-config.json`, Org config) — read-only input; no format change needed.
- Persisted run execution trees (team/Org/standalone root records) containing `collaborators[]` and `taskExecutions[].source`.
- Evidence paths: `run-history/store/*schema*.ts`.

### Structural Surfaces

- Server: collaboration admission (`agent-collaboration/collaborators/*`), delegation source resolution (`agent-team-execution/task-delegation/*`), run-history domain/schema, stream/view contracts (`autobyteus-team-stream-contracts`, `autobyteus-collaboration-stream-contracts`), tool results of `delegate_task`/`send_message_to`.
- Web: launch drafts (`useDefinitionLaunchDefaults`, `chatDraftStore`, `agentOrgLaunchDraftStore`, mobile setup), run Settings view (`runMemberTree`, `ExistingRunSettings`).

### Potential Structural Impacts To Investigate

- API or external-contract change: Yes — view DTOs for collaborator team members / copy sources; possibly tool-result text.
- Persistence schema or invariant change: Yes — per-member launch values and provenance on collaborator team members and catalog copy sources.
- Security or privacy boundary change: No.
- Concurrency or lifecycle change: Low — resolution happens inside the existing admission gate.
- Deployment, migration, ownership-boundary: Persisted-data transition for older records (readers must accept absence); to be decided at architecture.
- Confirmed absent, present, or unknown: as above.

## Runtime, Probe, Or Reproduction Findings

| Method / Command | Scenario | Observation | Requirement Implication | Artifact / Evidence Path |
| --- | --- | --- | --- | --- |
| Static trace (no live run) | PM delegates SE team | All members built from `rootLaunchConfiguration` | Confirms reported problem | Source log rows above |

## Stakeholder And User Evidence

| Source / Actor | Need, Problem, Or Constraint | Evidence Strength | Requirement Implication | Open Question |
| --- | --- | --- | --- | --- |
| User via PM Task | IE and CR on Codex / Sol 6.1 when PM delegates the SE team; computer-use agent on a suitable runtime | Explicit | REQ-001..003 | Priority order (DEC-001) |
| User via PM Task | Explicit user launch choice still wins; inheritance only fallback | Explicit | REQ-005, REQ-004 | — |

## External Contracts, Standards, And Dependencies

| Contract / Dependency | Version / Authority | Relevant Behavior Or Constraint | Evidence | Unknown / Risk |
| --- | --- | --- | --- | --- |
| Codex App Server / Claude Agent SDK runtimes | Installed CLIs | Availability via command presence; models via runtime catalog | `runtime-availability-service.ts` | UNK-001 auth detection |

## Persisted Data And State Facts

- Affected stored subject: run execution trees' collaborator entries and catalog copy `source` snapshots.
- Location: server-data run-history store (`~/.autobyteus/server-data/...`).
- Current readers and writers: `run-execution-tree-shared-record-schemas.ts`, `task-execution-source-schema.ts`, team/Org/standalone tree schemas.
- Current unknown/extra-field behavior: strict `requireKeys` (required keys checked); extra-key policy to verify at architecture.
- Required semantics to preserve: every existing run restores with exactly the configuration it ran with (team-level value for every member of older collaborator teams/copies).
- Acceptable loss: none.
- Remaining evidence gap: repository migration conventions (architecture gate).

## Product Design Request Context

- Product Design request in the current input: `Not stated`.

## Product Design Findings

N/A — not applicable.

## Supplemental Artifact Inventory

| Artifact Path | Owner | Purpose | Scope | Related Requirement / AC IDs | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- | --- | --- |
| None | — | — | — | — | — | — |

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Why It Matters | Resolution / Owner | Status |
| --- | --- | --- | --- | --- | --- |
| UNK-001 | Unknown | Whether an unauthenticated Codex / Claude runtime is detectable before the copy starts (catalog listing failure) or only at the first turn | Defines what "unauthenticated falls back" can cover | Resolved 2026-10-12: Claude catalog is static and Codex lists through its app server, so login state is not detectable pre-start. Configured layers additionally use `RuntimeAvailabilityService` (detects a missing runtime). An installed but unauthenticated runtime surfaces at the first turn as a run error, within the approved Out of Scope | Resolved (bounded limitation) |
| RSK-001 | Risk | Application launch baselines use the opposite order (team before agent) | Inconsistent mental model across surfaces | Recorded; DEC-006 keeps applications unchanged; follow-up candidate | Open |
| RSK-002 | Risk | Per-member values on persisted records require a schema transition | Older runs must still restore | Resolved: optional fields with truthful absence; `Directly Usable — No Migration` (design-spec) | Resolved |

## Architecture Investigation Findings

| Source | Observation | Design implication |
| --- | --- | --- |
| `agent-collaboration/collaborators/message-recipient-resolution.ts:60-113`; `task-scoped-message-recipient.ts`; `catalog-delegation.ts` | Three non-user entry paths: bring-in (`catalog.bringIn` → `admission.ensure`), catalog copy (`resolveDelegationPlacement` → `catalogTaskSource`), and a task-owned sender's helper (`taskScope.bringIn` → `resolvePlacement` → `catalogTaskSource`). All converge on `CollaboratorAdmission.buildPlan` + runnability | One resolution point (design DS-001) |
| `agent-org-run-collaborators.ts`, `team-run-collaborators.ts`, `standalone-root-collaborators.ts` | Each root wraps `admission.ensure` / `catalogTaskSource` with its own port | Roots stay thin; no per-root resolution |
| `llm-management/services/model-catalog-service.ts:215-228` | Claude catalog is static (`claudeModelCatalog.selectionCatalog()`); Codex lists via app-server `model/list` (`codex-model-catalog.ts`); AGY/Grok list via CLIs | Catalog validation alone cannot detect a missing Claude executable, so `RuntimeAvailabilityService` is needed for configured layers. **UNK-001 resolved as a bounded limitation:** login state is not detectable pre-start for Codex/Claude; an unauthenticated runtime fails at the first turn as a run error |
| `runtime-management/runtime-availability-service.ts:136-142` | `getRuntimeAvailability(kind)` per runtime; providers use command discovery/probes | Check only runtimes named by configured candidates (DESIGN.md rule 5) |
| `run-history/store/run-execution-tree-shared-record-schemas.ts:34-41, 83-100, 330-370` | `requireKeys` checks presence only; parsers project known fields | Optional fields → `Directly Usable — No Migration` (migration guideline §3) |
| `agent-team-execution/task-delegation/task-delegation-result-contract.ts` | Strict zod union; success has no free text | Add optional `launch_notes` |
| `agent-communication/services/send-message-to-tool-result-contract.ts` | Accepted result has `message` | Append notes to `message` |
| `agent-collaboration/execution/task/root-task-dispatch.ts`, `root-task-execution-lifecycle.ts:104-140`, `task-delegation-command.ts` | Generic dispatch over placement `T`; outcome `{delegated, copy, taskId?}` | Outcome gains `launchNotes?` derived from the placement's catalog `source` |
| `autobyteus-collaboration-stream-contracts/src/agent-org-execution-dtos.ts:29-157`; `agent-run-collaboration-dtos.ts:24-34`; `autobyteus-team-stream-contracts/src/team-execution-view-dtos.ts` | Standalone, Org and Team views carry collaborator entries and task sources with strict schemas | Add optional DTO fields in both packages |
| `autobyteus-web/utils/teamDefinitionMembers.ts`; `stores/agentDefinitionStore.ts:325` | Web derives team-local member agent IDs; team-local definitions are in the store | Web seeding needs no new server API |
| `autobyteus-web/services/collaborators/agentSourceSelectors.ts:46,61,114,143` (ARCH-REV-001 AR-001, verified 2026-10-12) | Four selectors return the team-level launch for every collaborator-team / catalog-copy member (both DTO casings). They feed member conversation contexts (`teamExecutionContextFactory`, `teamRunContextHydrationService`, `teamMemberProjectionHydrationService`, `agentOrgExecutionContext`, `agentOrgExecutionViewIndex`, `agentRunCollaborationIndex`). Sweep: `grep -rn "default_launch_configuration\|defaultLaunchConfiguration" autobyteus-web/{services,stores,utils,composables,components}` found no other copy/collaborator member derivation; the remaining matches are configured teams' own values | Web needs the same single effective-member rule (contract packages) |
| `autobyteus-web/utils/runSettings/memberOverrides.ts:42-58,88,118`; `chatDraftStore.ts:429-442`; `agentOrgLaunchDraftStore.ts:291-330,377` (AR-003, verified) | `normalizeMemberOverride` drops runtime/model equal to the parent on every drawer edit/reset; Org launch re-normalizes team overrides at Run (harmless: values unchanged) | Seeded rows need a draft-held pin |
| `autobyteus-web/utils/teamRunLaunchConfigEdit.ts:63-77`; `composables/mobile/useMobileRunSetupController.ts:245-258` | Mobile team overrides are kept as set (no parent normalization); `setTemplate` is synchronous | Mobile needs async apply, no pin |
| `agent-collaboration/execution/task/root-task-execution-lifecycle.ts:219-240`; `task-scoped-message-recipient.ts:26-30`; `resolved-team-recipient.ts:4`, `standalone-root-task-execution-adapter.ts:49`, `agent-org-task-execution-adapter.ts:46` (AR-002, verified) | `ensureTaskHelper` reuses an existing helper or dispatches a new one; `bringIn` returns only a placement; all three roots' placements are aliases of `DelegationPlacement`; each root's `deliverToAddress` builds the send result after resolution | Notes only from fresh admission; single attachment in `dispatchTaskCopy`; `appendLaunchNotes` at the three deliveries |
| `autobyteus-web/services/chat/chatLaunchService.ts:68,176`; `stores/agentOrgLaunchDraftStore.ts`; `stores/teamRunConfigStore.ts:182` (mobile `setTemplate`) | Fresh-start surfaces; "+"/switcher copies keep settings (`useRunStart.ts:88`) | Seed only fresh starts |


## Requirement Implications

- The PM's lead is confirmed and is broader than reported: **both** catalog copies and collaborators, agent and team, ignore definition defaults; team members cannot even hold distinct values in the recorded snapshot today.
- User-started team/Org launches also ignore member defaults — in scope per the user's "however started" direction.
- An existing usability rule (both runtime and model named, runtime enabled, model in catalog) already governs start defaults in the web; reusing it keeps behavior consistent.
- No surface currently shows a copy's runtime/model, so "the run shows which configuration was used" needs a new read-only presentation.

## Notes For Architecture Design

- Map SCN-001..SCN-006 onto: admission plan building (`CollaboratorEntryBuilder`), runnability (`CollaboratorRunnabilityValidator`), identity allocation, source projection, persisted records + DTOs, tool results, web launch drafts and Settings.
- Keep inheritance from `rootLaunchConfiguration()` (DEC-003).
- Verify UNK-001 and the persisted-data migration convention before choosing the transition.
