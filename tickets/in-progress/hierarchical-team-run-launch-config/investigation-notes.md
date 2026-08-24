# Hierarchical TeamRun Launch Configuration — Investigation Notes

## Investigation Status

- Bootstrap Status: Complete
- Current Status: Active investigation; requirements remain Draft
- Investigation Goal: Trace every current TeamRun launch-configuration surface and establish the hierarchy, persistence, restoration, and UI requirements for treating nested teams as configuration scopes.
- Scope Classification: `Large`
- Scope Classification Rationale: The change crosses frontend types/store/UI/resolution, multiple launch surfaces, GraphQL, topology planning, persisted execution-tree schema, restore, and historical inspection.
- Scope Summary: Hierarchical TeamRun launch configuration; root global plus inherited/custom nested-team scopes plus Agent overrides. No live topology mutation.
- Primary Questions To Resolve:
  1. Which launch settings may vary per nested TeamRun?
  2. How do nested definition defaults interact with parent inheritance?
  3. Which authoring-intent and complete runtime/persistence shapes should remain distinct?
  4. Which launch surfaces must expose scoped editing versus root-only inheritance?
  5. How should older persisted runs truthfully project missing TeamRun defaults?

## Request Context

While bootstrapping Dynamic AgentTeam Runtime, the user observed that the current frontend gives only the root AgentTeam a global launch configuration. Nested teams are displayed as groups and their individual Agent descendants can be overridden, but the nested team itself cannot define a shared configuration. The user elevated this as a higher-priority prerequisite because every team should behave as a unit and a future dynamically added Agent should inherit from its containing TeamRun.

## Environment Discovery / Bootstrap Context

- Project Type: `Git` super-repository
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/hierarchical-team-run-launch-config`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/hierarchical-team-run-launch-config/tickets/in-progress/hierarchical-team-run-launch-config`
- Current Branch: `codex/hierarchical-team-run-launch-config`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/hierarchical-team-run-launch-config`
- Bootstrap Base Branch: `origin/personal`
- Remote Refresh Result: `git fetch origin personal` completed on 2026-08-24; worktree HEAD and upstream resolve to `c5b87df4d6db15969ba70adee9dfd8394b1e7385`.
- Task Branch: `codex/hierarchical-team-run-launch-config`
- Expected Base Branch: `personal`
- Expected Finalization Target: `personal`
- Bootstrap Blockers: None
- Notes For Downstream Agents: This ticket precedes `/Users/normy/autobyteus_org/autobyteus-worktrees/dynamic-agent-team-runtime`; Dynamic AgentTeam requirements currently contain a root-only inheritance assumption that must be revised to consume this ticket's approved hierarchy.

## Supplemental Task Artifact Inventory

| Artifact Path | Purpose And Scope | Evidence, Context, Or Decision Captured | Core Artifact(s) Supported | Related Requirement / Acceptance-Criteria IDs | Status | Approval Applicability / State | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/hierarchical-team-run-launch-config/tickets/in-progress/hierarchical-team-run-launch-config/hierarchical-launch-configuration-behavior.md` | Intended behavior, hierarchy examples, UI states, and launch-surface semantics | Target user/system behavior | Requirements; later design | R-001–R-034; AC-001–AC-025 | Draft | User approval required | Align after open decisions. |

## Source Log

| Date | Source Type | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-08-24 | Command | `git fetch origin personal`; `git worktree add -b codex/hierarchical-team-run-launch-config ... origin/personal` | Create a current isolated task workspace | Clean worktree at `c5b87df4d...`, tracking `origin/personal` | No |
| 2026-08-24 | Code | `autobyteus-web/types/agent/TeamRunConfig.ts` | Inspect authoring state | One root global config plus flat `memberOverrides`; no team-scope override subject | Yes |
| 2026-08-24 | Code | `autobyteus-web/components/workspace/config/TeamRunConfigForm.vue` | Inspect root UI | Root runtime/model/workspace/auto-execute controls render once, outside recursive member tree | Yes |
| 2026-08-24 | Code | `autobyteus-web/components/workspace/config/MemberOverrideTree.vue` | Inspect nested UI | Nested team renders only a group label; the same root globals are passed recursively to Agent items | Yes |
| 2026-08-24 | Code | `autobyteus-web/utils/teamDefinitionMembers.ts` | Inspect hierarchy identity | Recursive tree already contains canonical addresses and team/Agent kinds; suitable subject identity exists | No |
| 2026-08-24 | Code | `autobyteus-web/composables/useDefinitionLaunchDefaults.ts` | Inspect template seeding | `buildTeamRunTemplate` uses only selected root definition defaults; nested definition defaults are not projected | Yes |
| 2026-08-24 | Code | `autobyteus-web/stores/teamRunConfigStore.ts` | Inspect edits/invariants | Store edits root fields or exact Agent overrides; root changes prune some inherited model configs | Yes |
| 2026-08-24 | Code | `autobyteus-web/utils/teamRunMemberConfigBuilder.ts` | Trace effective resolution | Each leaf resolves from root globals plus its exact override; no nearest-team resolution | Yes |
| 2026-08-24 | Code | `autobyteus-server-ts/src/agent-team-execution/services/team-definition-topology-planner.ts` | Trace backend launch planning | API must provide complete settings for every leaf Agent; team nodes receive no launch default | Yes |
| 2026-08-24 | Code | `autobyteus-server-ts/src/agent-team-execution/domain/team-run-config.ts` | Inspect compiled runtime topology | Agent nodes contain complete settings; Team nodes contain topology/identity only | Yes |
| 2026-08-24 | Code | `autobyteus-server-ts/src/agent-team-execution/domain/team-run-execution-tree.ts` | Inspect persisted tree | Configured Agent nodes persist complete launch snapshots; configured Team nodes do not persist effective defaults | Yes |

## Relevant Existing Behavior And Production Paths

| Behavior ID | Kind | Current Supported Trigger Or Governing Contract | Current Production Path And Lifecycle | Meaningful Current Outcome / Invariants | Evidence |
| --- | --- | --- | --- | --- | --- |
| BEH-001 | User | Select AgentTeam and configure new TeamRun | Team definition -> root TeamRun template -> config store -> root form | One root global config is editable | Root form/template/store |
| BEH-002 | User | Expand Team members override panel | Definition tree -> `MemberOverrideTree` recursion | Nested teams group leaf controls but are not config subjects | Member tree component |
| BEH-003 | Contract | Build launch payload | Root config + exact Agent override -> leaf record builder | Every leaf is fully resolved directly against root | Member config builder |
| BEH-004 | Contract | Edit/lock/launch a draft | Pinia draft store -> immutable cloned config -> in-flight lock | Root and Agent edit subjects only | TeamRunConfig type/store |
| BEH-005 | System | Create and restore TeamRun | GraphQL `memberConfigs[]` -> planner -> compiled topology -> execution tree -> restore | Agent settings persist; TeamRun defaults do not | GraphQL/planner/domain/persistence |
| BEH-006 | Contract | Seed config from AgentTeam definition | `buildTeamRunTemplate(rootDefinition)` | Only root definition default seeds launch | Definition launch defaults |
| BEH-007 | User | Inspect selected historical TeamRun configuration | history tree/config projection -> read-only form | Known Agent details can be projected; no per-TeamRun default exists | History queries and TeamRun config read-only code (deeper trace pending) |
| BEH-008 | System | Application or external channel launches a team | launch profile/preset -> leaf settings or backend preset expansion -> normal create service | Root-only presets configure all leaves uniformly | Application launch utility; backend preset planner |

## Design Health Assessment Evidence

- Change posture: `Behavior Change` and prerequisite feature
- Candidate root cause classification: `Shared Structure Looseness` plus `Boundary Or Ownership Issue`
- Refactor posture evidence summary: Team topology has Team subjects, but launch configuration flattens them away before resolution. A correct solution needs a tight shared hierarchy model and one resolution owner rather than recursive-component state or repeated caller-specific merging.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| `TeamRunConfig` | Root globals and Agent overrides coexist without Team scopes | Shape does not represent the actual nested TeamRun domain | Define tighter authoring hierarchy |
| `MemberOverrideTree` | Nested Team is display-only | UI can expose a team editor, but it cannot own resolution policy | Keep resolution in reusable owned utility/store boundary |
| Member config builder | One root-based merge per leaf | Nearest-team precedence needs one canonical resolver shared by all launch surfaces | Inventory all callers |
| Backend Team nodes | No effective launch default | Dynamic-team prerequisite would have no containing-Team default after restore | Extend runtime and persistence contract |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-web/types/agent/TeamRunConfig.ts` | Team launch draft config | Missing team-scope subject | Modify/tighten shared config shapes |
| `.../types/agent/TeamLaunchDraft.ts` | Explicit config edit commands | No team-scope edit operation | Add subject-specific team edit/reset commands |
| `.../stores/teamRunConfigStore.ts` | Draft lifecycle and edits | Root-only mutation/pruning policy | Remain draft owner; delegate hierarchy resolution to owned utility |
| `.../components/workspace/config/TeamRunConfigForm.vue` | Root config UI | Root controls render once | Compose reusable team-scope editor |
| `.../components/workspace/config/MemberOverrideTree.vue` | Recursive nested/Agent display | Team nodes have no editor | Render inherited/custom Team scope state recursively |
| `.../utils/teamDefinitionMembers.ts` | Canonical member tree | Already distinguishes Team and Agent addresses | Reuse as hierarchy input |
| `.../utils/teamRunMemberConfigBuilder.ts` | Complete Agent record projection | Root-only resolution | Replace with hierarchy-aware projection owner |
| `.../services/teamExecution/*` | Draft-to-execution projection | Tests encode root-only globals | Update all production projection paths |
| `.../api/graphql/types/agent-team-run.ts` | TeamRun create/history API | Only per-Agent create configs | Add team-scope contract |
| `.../services/team-definition-topology-planner.ts` | Definition graph + launch config compilation | Team nodes lack config | Validate/attach complete effective TeamRun defaults |
| `.../domain/team-run-config.ts` | Runtime compiled topology | Team node shape lacks default | Add complete effective default to Team node |
| `.../domain/team-run-execution-tree.ts` | Persisted rooted execution tree | Team execution shape lacks default | Persist/restore Team defaults |

## Runtime / Probe Findings

No runtime probes yet. Bootstrap evidence is a current production-path source trace. Later investigation must render the current nested config UI and inspect representative current run-history packages before the persisted-data decision.

## External / Public Source Findings

N/A. Repository-native behavior governs this change.

## Reproduction / Environment Setup

- No services or accounts required for bootstrap.
- Dedicated latest-base worktree created before artifact authoring.
- No temporary investigation files outside the ticket package.

## Findings From Code / Docs / Data / Logs

1. The user's report is confirmed: a nested team is a visual container, not a configuration scope.
2. Canonical Team addresses already exist in the frontend tree, so scope identity does not need a new naming system.
3. Current launch data has two semantic levels (root and Agent); target data needs three (root Team, nested Team, Agent).
4. Authoring intent should remain partial/inherited, but runtime/persistence shapes should be complete snapshots.
5. Backend persistence changes belong in this prerequisite, otherwise Dynamic AgentTeam would still be unable to restore a containing TeamRun's default.

## Persisted Data Transition Evidence (When Applicable)

- Current stored subject, location, representative shape, and approximate volume: TeamRun execution-tree V1 packages; volume/sample pending.
- Relevant code-model, serialization, semantic, or physical-store change: add complete effective launch configuration to root and configured nested-Team execution nodes and expose it through restore/history.
- Normal readers and writers, including unknown/extra-field behavior: execution-tree builder/schema/store, manager restore, GraphQL history converter, frontend read-only projection; deeper trace pending.
- Representative direct-read or compatibility evidence: not yet collected.
- Required semantics and invariants preserved by direct use: `Undetermined`; older packages do not contain the target meaning.
- Physical storage, privacy/security, disposal, rebuild, or operational constraints: run history is durable user data and must not be discarded solely for schema convenience.
- Concrete benefit, cost, and risk of migration if it remains a candidate: migration cannot reconstruct unknown former TeamRun defaults; a truthful missing-default projection is preferable to guessing.
- Existing migration framework or lifecycle constraints: pending schema/store investigation.

## Constraints / Dependencies / Compatibility Facts

- Latest hierarchical AgentTeam addressing is authoritative.
- Every Team placement has a canonical rooted address and concrete TeamRun identity at runtime.
- Agent runtime construction requires complete resolved settings.
- Root-only presets must remain meaningful through inheritance.
- Dynamic AgentTeam Runtime depends on this ticket, not vice versa.

## Open Unknowns / Risks

- Complete field set for nested-Team scope.
- Nested definition default policy.
- Application launch-profile UI scope.
- Historical storage transition.
- All history/config projection readers and launch callers.
- Whether current workspace loading assumes one workspace for the entire root TeamRun.

## Notes For Architecture Reviewer

No review is requested. Requirements remain Draft. The later design must trace distinct data-flow spines for workspace draft editing, hierarchy resolution, application/external launch projection, backend planning, persistence/restore, and historical read-only projection.
