# Hierarchical TeamRun Launch Configuration — Requirements

## Status (`Draft`/`Design-ready`/`Refined`)

`Draft` — bootstrapped on 2026-08-24. User approval is required before solution design.

## Goal / Problem Statement

Treat every configured AgentTeam placement as a real TeamRun launch-configuration scope. The root team keeps a required global launch configuration. Each nested team displays its own global configuration area, inherits its parent team's effective settings by default, and may override supported settings for its entire subtree. Individual Agent overrides remain available and resolve relative to the Agent's nearest containing team rather than directly against the root.

The completed launch configuration must be preserved by the backend so that every concrete TeamRun retains its effective default and every Agent retains its resolved launch configuration. This ticket is a prerequisite for Dynamic AgentTeam Runtime, where a future Agent addition must inherit the effective configuration of its containing TeamRun.

## Current And Desired Behavior (Mandatory)

| Behavior ID | Current Behavior | Desired Behavior | Preserved / Unchanged Behavior | Related Requirement / Acceptance-Criteria IDs |
| --- | --- | --- | --- | --- |
| BEH-001 | The workspace TeamRun form exposes one root global runtime/model/workspace/tool configuration. | The root remains the first configuration scope, and every nested team has its own visible global configuration area. | Root-only teams retain the current simple launch journey. | R-001–R-004, AC-001–AC-003 |
| BEH-002 | A nested team is rendered only as a visual group inside `MemberOverrideTree`; only leaf Agents can be configured. | A nested team is a configurable scope that inherits its parent by default and can define scoped overrides. | Canonical hierarchical team and Agent addresses remain the scope identities. | R-005–R-010, AC-004–AC-008 |
| BEH-003 | All leaf Agents resolve from the root globals unless an exact Agent override exists. | Resolution follows `Agent override > nearest containing team effective configuration > ancestor team configurations > root configuration`. | Exact Agent overrides remain supported. | R-011–R-015, AC-009–AC-012 |
| BEH-004 | Frontend launch state stores one root config and a flat per-Agent override map. | Frontend launch state represents root configuration, nested-team scoped overrides, and per-Agent overrides without duplicating resolved values as editable intent. | Launch drafts remain immutable snapshots edited through explicit store operations. | R-016–R-020, AC-013–AC-015 |
| BEH-005 | The frontend sends complete per-leaf Agent records; the backend compiles them into Agent nodes. Team nodes do not retain a launch default. | The launch contract also carries sufficient team-scope configuration, and each configured TeamRun persists its complete effective default while every Agent persists its complete resolved configuration. | Backend runtime construction continues to receive complete executable Agent settings. | R-021–R-026, AC-016–AC-019 |
| BEH-006 | A nested AgentTeam definition has its own `defaultLaunchConfig`, but root TeamRun template construction uses only the selected root definition's defaults. | The system applies one approved, explicit rule for how nested definition defaults relate to parent inheritance and user-edited scoped configuration. | Launch-time user configuration remains authoritative over definition suggestions. | R-027, AC-020 |
| BEH-007 | Historical TeamRun packages contain per-Agent launch snapshots but no team-scope defaults. | Current-schema runs display their hierarchical effective settings truthfully; older data is never presented as though an unknown team default were known. | Existing historical Agent launch details remain viewable. | R-028–R-031, AC-021–AC-023 |
| BEH-008 | Application/external team launch paths may supply only one team preset and per-leaf settings. | A root-only preset remains valid and means all nested teams inherit it unless that launch surface explicitly supplies scoped configuration. | Existing non-workspace launch surfaces remain able to start nested teams. | R-032–R-034, AC-024–AC-025 |

## Investigation Findings

- The dedicated worktree is based on latest `origin/personal` commit `c5b87df4d6db15969ba70adee9dfd8394b1e7385`.
- `TeamRunConfig` contains one root `runtimeKind`, `llmModelIdentifier`, `llmConfig`, workspace, auto-execute, and skill-access configuration plus a flat exact-address `memberOverrides` map.
- `TeamRunConfigForm.vue` renders one root `RuntimeModelConfigFields`, one workspace selector, and one auto-execute control before the member tree.
- `MemberOverrideTree.vue` renders an `agent_team` node as a label/group and recursively passes the same root globals to every leaf `MemberOverrideItem`; it has no team-scope editor.
- `buildTeamRunMemberConfigRecords` resolves every leaf from the same root global values plus an exact Agent override.
- `buildTeamRunTemplate` seeds only from the selected root AgentTeam definition's `defaultLaunchConfig`; it does not traverse nested definitions to create scoped defaults.
- The backend topology planner requires one complete launch record per leaf Agent and does not receive or persist an effective default for any team node.
- The backend execution tree already stores each configured Agent's complete resolved `launchConfiguration`, so hierarchical team defaults can be added without replacing that audit/restore snapshot.

## Relevant Supplemental Task Artifacts

| Artifact Path | Type / Purpose | Related Requirement IDs | Related Acceptance-Criteria IDs | Status / Approval | Relationship To Requirements |
| --- | --- | --- | --- | --- | --- |
| `hierarchical-launch-configuration-behavior.md` | Intended-behavior supplement with hierarchy, UI states, and resolution examples | R-001–R-034 | AC-001–AC-025 | Draft / user approval required | Clarifies the configuration hierarchy and user experience without replacing this document. |

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): `Behavior Change` and prerequisite feature
- Initial design issue signal (`Yes`/`No`/`Unclear`): `Yes`
- Root cause classification: `Shared Structure Looseness` plus `Boundary Or Ownership Issue`
- Refactor posture: `Likely Needed`
- Evidence basis: the current `TeamRunConfig` conflates a root-scope default with the complete run configuration; nested Team nodes are present in the definition tree but erased as configuration subjects when leaf records are built. Adding controls only to the recursive component would leave the store, resolution utility, launch API, backend TeamRun context, persistence, and restoration semantics inconsistent.
- Requirement or scope impact: the ticket must change the launch-configuration model and resolution spine, not only frontend rendering.

## Recommendations

1. Model root configuration separately from canonical-address nested-team overrides and canonical-address Agent overrides.
2. Resolve a complete effective configuration at every Team node by merging its explicit scoped override onto its parent's effective configuration.
3. Resolve each Agent from its containing Team's effective configuration plus the exact Agent override.
4. Show nested teams as expandable configuration scopes with inherited/custom state and a reset-to-parent action.
5. Persist a complete effective TeamRun default on each configured Team execution node, while retaining complete resolved Agent launch snapshots.
6. Keep root-only launch presets valid by treating missing nested-team overrides as inheritance.

## Scope Classification (`Small`/`Medium`/`Large`)

`Large`

The change affects reusable launch types, configuration stores, recursive UI, default seeding, validation/readiness, runtime catalog loading, member record construction, workspace/application launch paths, GraphQL input/output, backend topology planning, execution-tree persistence, restoration, and historical read-only projection.

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

- `UC-001` Configure and launch a root-only AgentTeam.
- `UC-002` View a nested team inheriting its parent's effective launch configuration.
- `UC-003` Customize a nested team's global configuration for its subtree.
- `UC-004` Configure multiple nested levels using nearest-team inheritance.
- `UC-005` Apply an individual Agent override relative to its containing team.
- `UC-006` Reset a nested team to inherited parent settings.
- `UC-007` Keep launch drafts valid when nested topology changes before launch.
- `UC-008` Launch, persist, query, and restore hierarchical TeamRun configurations.
- `UC-009` Display historical runs whose former team defaults are unavailable.
- `UC-010` Launch through a root-only application or external-channel team preset.

### Out of Scope

- Dynamic addition or removal of members from an already-running TeamRun.
- Dynamic AgentTeam reconciliation or native AgentOrg.
- Automatic filesystem watching.
- Live reconfiguration or restart of existing AgentRuns.
- A general AgentTeam definition editor redesign.
- Human nodes.
- Arbitrary configuration inheritance outside the AgentTeam/TeamRun address tree.

### Preserved Behavior Boundary

- Preserve canonical rooted addresses, recursive AgentTeam definition resolution, one direct Agent coordinator per team, existing Agent override capability, immutable launch drafts, current TeamRun creation, runtime-kind/model validation, per-Agent resolved launch persistence, and read-only run configuration inspection.
- A TeamRun with no nested teams must not require additional interaction compared with the current launch flow.
- A launch surface that supplies only a root global preset remains supported by applying it to all descendants through inheritance.

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID that it protects.
- A finding that would introduce new product behavior, policy, threat model, migration obligation, or operational contract is a `Requirement Gap`; it must return for explicit user approval before becoming authoritative.
- An adjacent concern outside the approved boundary may be recorded as a non-blocking risk, recommendation, or separate-ticket candidate. It must not be treated as a required design correction.
- A downstream reviewer comment does not amend this requirements basis. The solution designer must update the canonical requirements and obtain renewed user approval before a scope-changing proposal can govern design or implementation.

## Functional Requirements

- `R-001` The TeamRun launch UI shall continue to show a required global configuration for the root TeamRun at address `/`.
- `R-002` A root-only team shall retain the existing configuration flow without additional nested-scope controls.
- `R-003` The root configuration shall provide the complete set of launch settings required by all descendants unless overridden at a supported lower scope.
- `R-004` The UI shall clearly identify the root settings as the root TeamRun defaults rather than implying they are unconditionally global to all nested teams.
- `R-005` Every nested AgentTeam placement shall be represented as a configuration scope identified by its canonical team address.
- `R-006` A nested-team scope shall inherit its parent TeamRun's effective configuration by default.
- `R-007` The user shall be able to customize supported settings for a nested-team scope.
- `R-008` The UI shall show whether a nested-team setting is inherited or explicitly customized.
- `R-009` The user shall be able to reset the complete nested-team scope to parent inheritance.
- `R-010` Resetting a parent scope shall recompute descendant effective values without deleting descendant overrides that remain semantically valid.
- `R-011` Each TeamRun's effective configuration shall be the result of its parent's effective configuration plus its own explicit scoped override; the root has no parent.
- `R-012` Each Agent's resolved launch configuration shall be its containing TeamRun's effective configuration plus its exact Agent override.
- `R-013` The nearest containing TeamRun shall win over more distant ancestors for every overridden field.
- `R-014` An exact Agent override shall win over all TeamRun scopes for that Agent only.
- `R-015` Runtime/model/LLM-config combinations shall remain coherent when inheritance inputs change; incompatible inherited model-specific configuration shall not be silently retained.
- `R-016` Editable launch state shall distinguish root configuration, nested-team scoped overrides, and Agent overrides as different subjects.
- `R-017` Nested-team and Agent override maps shall use canonical rooted addresses and reject unknown or noncanonical subjects.
- `R-018` The configuration store shall expose immutable launch-draft snapshots and explicit subject-specific edit operations.
- `R-019` Launch readiness shall validate every effective TeamRun and resolved Agent configuration needed by the candidate definition graph.
- `R-020` Runtime/model catalogs shall be loaded for every runtime kind referenced by root, team-scope, or Agent overrides.
- `R-021` The launch request shall carry sufficient policy information to reconstruct the effective configuration of every configured TeamRun, in addition to the complete resolved configuration of every Agent.
- `R-022` Backend topology planning shall validate team-scope configuration addresses against the resolved AgentTeam definition graph.
- `R-023` Every concrete configured TeamRun, including the root and each nested TeamRun, shall retain one complete effective default configuration in the runtime model.
- `R-024` Every configured Agent execution shall continue to retain one complete resolved launch configuration.
- `R-025` The persisted root execution tree shall store the effective TeamRun default on every configured Team execution node and the resolved Agent launch configuration on every configured Agent node.
- `R-026` Restore shall recreate the same effective TeamRun defaults and resolved Agent configurations without depending on frontend draft state or current definition defaults.
- `R-027` The treatment of a nested AgentTeam definition's `defaultLaunchConfig` shall be explicit and consistent across workspace, application, and external launch paths; the approved rule is pending user confirmation.
- `R-028` Current-schema history projections shall expose effective TeamRun defaults for the selected root or nested TeamRun.
- `R-029` Older stored runs shall continue to expose their known per-Agent launch configurations.
- `R-030` The UI shall not fabricate a historical TeamRun default when the stored package does not contain one.
- `R-031` Historical missing-default state shall be distinguishable from an explicitly empty/null model-specific configuration.
- `R-032` A root-only team launch preset shall mean every nested TeamRun inherits the root preset unless scoped configuration is supplied.
- `R-033` Existing application team launch profiles shall either carry the same hierarchical policy or use the explicit root-only inheritance behavior in R-032; they shall not resolve by a conflicting precedence rule.
- `R-034` All TeamRun creation paths shall produce the same backend hierarchical configuration contract for semantically equivalent launch intent.

## Acceptance Criteria

- `AC-001` A root-only TeamRun config form renders and launches with the same required interactions as today.
- `AC-002` The root scope is labeled and addressable as `/` in the configuration model.
- `AC-003` Root validation prevents launch when its required effective settings are incomplete.
- `AC-004` A nested-team group displays an inherited TeamRun configuration summary before any customization.
- `AC-005` Customizing `/research` changes the effective configuration of Agents under `/research` but not sibling or root Agents.
- `AC-006` A nested team without overrides immediately reflects valid changes to its parent draft configuration.
- `AC-007` Resetting `/research` restores full parent inheritance and removes its explicit scoped override intent.
- `AC-008` Unknown or Agent-address subjects cannot be stored as team-scope overrides.
- `AC-009` In a three-level tree, an Agent inherits from its nearest customized containing team.
- `AC-010` An exact Agent override wins over its containing team's value without changing siblings.
- `AC-011` Removing an Agent override reveals the containing TeamRun's current effective value.
- `AC-012` Changing an inherited runtime/model cannot leave an invalid stale LLM configuration appearing effective.
- `AC-013` Launch drafts retain separate root, team-scope, and Agent-override intent through cloning, locking, and in-flight launch protection.
- `AC-014` Readiness and runtime catalog synchronization include every effective runtime/model needed anywhere in the hierarchy.
- `AC-015` A topology change before launch prunes or reports scoped overrides whose canonical subjects no longer exist.
- `AC-016` The create request carries hierarchical team-scope configuration plus complete leaf Agent launch configurations.
- `AC-017` Backend planning rejects duplicate, unknown, noncanonical, or kind-mismatched scope addresses.
- `AC-018` After launch, every configured Team execution node exposes its effective default and every Agent node exposes its resolved launch configuration.
- `AC-019` Restoring the run preserves AC-018 even if definition-level defaults later change.
- `AC-020` Nested definition default behavior matches the user-approved R-027 rule in every launch surface.
- `AC-021` A current-schema historical run displays the effective default for the selected root or nested TeamRun.
- `AC-022` An older run without stored team defaults displays an explicit unavailable/unknown state and retains known Agent details.
- `AC-023` Historical null `llmConfig` is not conflated with missing historical TeamRun-default data.
- `AC-024` An application/external root-only preset launches all descendants through root inheritance.
- `AC-025` Equivalent workspace, application, and external launch intent yields equivalent effective TeamRun and Agent configurations.

## Constraints / Dependencies

- Canonical rooted AgentTeam addressing and nested definition resolution from latest `origin/personal` are authoritative.
- Current backend Agent launch nodes already contain complete executable settings; the hierarchical policy must not make runtime construction depend on partial frontend override shapes.
- Runtime/model-specific `llmConfig` compatibility and catalog loading must remain correct across inherited changes.
- The frontend currently treats workspace and skill-access settings differently from runtime/model Agent overrides. Their participation in nested-team scopes must be decided before the requirements become Design-ready.
- Dynamic AgentTeam Runtime depends on the persisted/effective TeamRun configuration contract produced here.

## Persisted Data Outcome (When Applicable)

- Stored subject / location: root TeamRun execution-tree packages and their GraphQL/history projections.
- Required outcome: `Undetermined`
- Existing data to preserve, discard/rebuild, transform, or quarantine: root/child TeamRun IDs, AgentRun IDs, configured topology, handoffs, application binding, task executions, and all known per-Agent launch configurations.
- Unacceptable data loss or corruption: inventing historical team defaults; losing known Agent launch settings; resolving restored runs from mutable current definition defaults.
- Relevant availability, maintenance-window, or rollout constraints: to be investigated from the V1 schema/store and representative stored packages.
- Related requirement and acceptance-criteria IDs: R-021–R-031; AC-016–AC-023.

## Assumptions

- Every configured Agent has exactly one nearest containing TeamRun.
- Team nodes define defaults for Agents but do not themselves launch an LLM runtime.
- Partial scoped overrides are authoring intent; runtime and persistence use complete effective TeamRun and Agent configurations.
- Missing a nested-team override means inheritance, not an empty configuration.

## Risks / Open Questions

1. **Nested definition defaults:** Recommendation: a nested placement inherits its parent by default. Its definition-level `defaultLaunchConfig` may be offered as an explicit “use this team's definition defaults” action rather than silently overriding the parent. Confirm this policy.
2. **Scoped fields:** Should nested-TeamRun scopes configure only runtime/model/LLM config/auto-execute, or also workspace and skill-access mode? Recommendation: treat TeamRun as a true unit and support the complete root configuration shape unless current runtime evidence shows a root-only invariant.
3. **Application setup UI:** Should hierarchical team controls be added to application launch-profile editing in the same ticket, or should application profiles remain root-only but use defined inheritance? Recommendation: use the same data contract and add scoped controls where the surface already supports per-member configuration.
4. **Historical data:** Older packages cannot reconstruct team defaults. Recommendation: preserve them without fabricating defaults and show an explicit historical-unavailable state; do not perform a lossy guessed migration.
5. **Override cleanup:** When a nested team is removed from an editable draft, should stale scoped overrides be immediately pruned or retained as invalid draft state? Recommendation: prune with a visible notice before launch.

## Requirement-To-Use-Case Coverage

| Use Case | Covered Requirements |
| --- | --- |
| UC-001 | R-001–R-004, R-011, R-016–R-026 |
| UC-002 | R-005–R-006, R-008, R-011, R-016–R-020 |
| UC-003 | R-005–R-015, R-016–R-026 |
| UC-004 | R-005–R-020, R-021–R-026 |
| UC-005 | R-011–R-020, R-024–R-026 |
| UC-006 | R-006–R-010, R-015–R-020 |
| UC-007 | R-017–R-020, R-022, R-027 |
| UC-008 | R-021–R-028, R-034 |
| UC-009 | R-028–R-031 |
| UC-010 | R-027, R-032–R-034 |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criteria | Scenario Intent |
| --- | --- |
| AC-001–AC-003 | Root-only preservation and root-scope validation |
| AC-004–AC-008 | Nested-scope inheritance, customization, reset, and identity validation |
| AC-009–AC-012 | Multi-level precedence, Agent overrides, and coherent inherited config |
| AC-013–AC-015 | Draft integrity, readiness/catalog coverage, and topology edits |
| AC-016–AC-020 | API, backend planning, per-TeamRun persistence, restore, and nested defaults |
| AC-021–AC-023 | Current and historical read-only configuration truthfulness |
| AC-024–AC-025 | Root-only preset compatibility and cross-surface semantic parity |

## Approval Status

- User has approved the problem priority and the high-level direction that each nested TeamRun should have a global configuration area and behave as a Team unit.
- The full Draft requirements, supplemental behavior contract, and open questions require explicit approval before design begins.
