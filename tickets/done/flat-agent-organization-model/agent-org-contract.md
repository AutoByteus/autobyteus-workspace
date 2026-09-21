# AgentOrg And AgentTeam Structure / Persistence Contract

## Contract Status

- Contract ID: `AORG-CONTRACT-001`
- Requirements package: `AORG-FLAT-TEAM-001`
- Requirements revision: `RER-033`
- Status: `Approved`
- Approval reference: Cumulative approval through RER-032 remains. On 2026-09-12 PKG-AUTH-002 records the user's explicit request via Code Reviewer/Architecture to rename only authored Org member refScope agent_org_owned to org_local. RER-033 defines that vocabulary and meaning-preserving owned transition; unversioned authoring, Team scope, separate ownership/IDs/paths, Product and runtime contracts remain unchanged.
- Owner/date: Requirements Engineer / 2026-09-12
- Purpose: Provide one normative configured-structure, launch/configuration/focus, handoff behavior/authoring, and on-disk execution-tree contract that Product Design and later Architecture Design must preserve after applicable approval.

This contract reuses the current TeamRun V2 child, handoff, launch, and task
records without changing the native standalone Team file family. AgentOrg is a
new root/file family over the same fixed-depth member/task topology. Target
modules/classes, internal abstractions, rollout mechanics, and implementation
sequencing remain Architecture Design-owned; the logical keys/versions and
canonical execution-tree paths below are contract inputs.

## Governing Configured Model

```text
AgentOrg                                  no coordinator
├── independent Agent                    /agent
├── AgentTeam                            /team  -> Team coordinator ingress
│   ├── Agent                            /team/agent
│   └── Agent                            /team/agent
└── AgentTeam                            /team
    └── Agent                            /team/agent
```

```text
AgentOrgDefinition
  coordinator: absent
  members: (AgentMemberRef | AgentTeamMemberRef)[]
  handoffs: AgentSource -> AgentOrTeamDestination

AgentTeamDefinition
  coordinator: exact direct Agent member
  members: AgentMemberRef[]
  handoffs: AgentSource -> AgentDestination within Team scope
```

1. `AgentOrg` is the only persistent multi-Team composition root.
2. AgentOrg may contain direct independent Agents and direct AgentTeams.
3. AgentOrg cannot contain AgentOrg and has no coordinator.
4. AgentTeam contains Agents only and has exactly one direct Agent coordinator.
5. `flat` is an AgentTeam invariant, not a subtype or type/file-name prefix.
6. One AgentOrg run owns one address, handoff, lifecycle, and persistence scope.
7. Standalone AgentTeams remain directly launchable and reusable in an AgentOrg.
8. Task Teams are runtime task executions beneath their exact host scope; they do not mutate configured membership.
9. AgentTeam supports progressive composition: the same definition may be tested standalone and later referenced directly by AgentOrg without copying or specialization.
10. AgentOrg activation and recipient focus are separate: `Run` opens Org configuration, launch activates the full Org without focus, and a later exact Agent/Team focus is required only for a recipient-requiring interaction.
11. AgentOrg configuration applies root choices across the scope, then direct Team placement and exact Agent placement overrides by increasing specificity; it does not mutate referenced definitions or alter Team coordinator ingress.
12. Standalone Team runs remain native Team V2 packages; AgentOrg runs use a separate AgentOrg V1 package/file. Shared record shapes do not imply a generic persisted root union.
13. Definition source ownership is independent of runtime snapshot ownership: external definition repositories are read-only dependencies for this ticket, while every server memory run package remains in the runtime transition cohort.
14. A direct Team placement in an AgentOrg retains one presentation-only aggregate status signal over the exact Agent statuses in its branch; this does not create Team-root lifecycle or persistence ownership.
15. AgentOrg Member overrides preserve the established AgentTeam launch hierarchy: the outer label carries the exact configurable-Agent count with an adjacent disclosure; the outer disclosure and every mounted-Team scope start collapsed; exact-scope inheritance/customization and exact coordinator-Agent identity are explicit; and Team/member controls are disclosed only on demand.

## Behavioral Contract Cases

### Definition And Composition

| Case ID | Trigger / Input | Required Outcome | Rejected Or Preserved Alternative |
| --- | --- | --- | --- |
| ORG-CASE-001 | Define AgentOrg with independent Agents only | Valid with unique, resolvable members | Org is not represented as AgentTeam. |
| ORG-CASE-002 | Define AgentOrg with AgentTeams only | Valid; every Team independently satisfies its coordinator invariant | No synthetic parent Team. |
| ORG-CASE-003 | Define AgentOrg with both direct member kinds | Valid; all placements share one Org scope | No implicit joining of unrelated root runs. |
| ORG-CASE-004 | Define AgentTeam | Valid only with Agent members and exactly one direct Agent coordinator | Team/Org members are rejected. |
| ORG-CASE-005 | Add AgentOrg below AgentOrg or Team | Reject before partial persistence/launch | No recursive Org composition. |
| ORG-CASE-006 | Add AgentTeam below AgentTeam | Reject before partial persistence/launch | No silent flattening or compatibility fallback. |
| ORG-CASE-007 | Launch standalone AgentTeam | Preserve coordinator-led Team lifecycle and task behavior | Org membership is not mandatory. |

### Entry And User Targeting

| Case ID | Trigger / Input | Required Outcome | Rejected Or Preserved Alternative |
| --- | --- | --- | --- |
| ORG-CASE-008 | Invoke `Run` for AgentOrg | Open one AgentOrg run-configuration journey; no Org coordinator or entry recipient is required | Do not open a separate pre-launch Agent/Team selector or infer leadership as runtime ingress. |
| ORG-CASE-009 | After launch, user focuses an independent Agent or an Agent inside a Team | Focus that exact mounted Agent execution | No first-member, name, or address-prefix fallback. |
| ORG-CASE-010 | After launch, user focuses an AgentTeam | Focus/deliver through that Team's exact direct coordinator | Org does not invent a second coordinator or broadcast to the Team. |
| ORG-CASE-011 | Recipient-requiring action has no valid post-launch focus | Reject and require an exact mounted Agent or Team selection from the active workspace | Launch/configuration/inspection remain valid without focus; do not target `/` or guess. |

### Addressing

| Case ID | Address | Required Subject / Outcome |
| --- | --- | --- |
| ORG-CASE-012 | `/independent_agent` | Exact direct Org Agent placement. |
| ORG-CASE-013 | `/team` | Exact direct Team placement; delivery uses Team coordinator ingress. |
| ORG-CASE-014 | `/team/agent` | Exact Agent placement inside Team. |
| ORG-CASE-015 | `/` | Structural root; not a collaboration recipient. |
| ORG-CASE-016 | `/team/subteam` where second segment is Team | Reject configured Team-in-Team composition. |
| ORG-CASE-017 | `/team/agent/deeper` | Reject configured placement deeper than target model. |
| ORG-CASE-018 | Bare/relative/parent-traversal/backslash/unknown/case-colliding address | Fail closed without fallback. |

### Handoffs

| Case ID | Trigger / Input | Required Outcome | Rejected Or Preserved Alternative |
| --- | --- | --- | --- |
| ORG-CASE-019 | Team author defines Agent-to-Agent handoff | Preserve as Team-local and rebase once when mounted | Team-local scope cannot independently address Org peers. |
| ORG-CASE-020 | Org author defines independent Agent → Team handoff | Resolve in Org and deliver through Team coordinator | Nesting is not needed to authorize route. |
| ORG-CASE-021 | Org author defines Team Agent → peer Agent/Team/Team Agent | Resolve exact endpoints in same Org | No global/unrelated-run lookup. |
| ORG-CASE-022 | Handoff source is Team or Org | Reject; source must be Agent | No synthetic structural actor. |
| ORG-CASE-023 | Duplicate effective edge or self-resolving Team target | Reject deterministically | No duplicate/self delivery guidance. |
| ORG-CASE-024 | Agent calls `get_handoff_rules` | Return ordered outgoing rules for exact mounted Agent | Framework does not evaluate rule prose. |
| ORG-CASE-025 | Agent calls `send_message_to(recipient_address)` | Resolve only in active Org or standalone Team scope | No implicit cross-run routing. |

### Handoff Information And Required Authoring Capabilities — Approved In RER-012

One user-visible **Handoff** is one ordered directional endpoint pair with:

```text
From: exact Agent placement
To: exact Agent placement or, for AgentOrg-owned handoffs, direct Team placement
When: one or more ordered natural-language conditions
```

The current logical record remains `{ from, to, rules[] }`; `When` is the
user-facing name for each `rules[]` string. The prose guides the source Agent
when it reviews `get_handoff_rules`. It is not an executable expression, event
subscription, scheduler, or authorization rule. Additional conditions for the
same endpoint pair belong in the same Handoff because duplicate effective
`(from,to)` pairs remain invalid.

| Case ID | Trigger / Input | Required Outcome | Rejected Or Preserved Alternative |
| --- | --- | --- | --- |
| ORG-CASE-032 | Inspect a Handoff | Explicit `From`, `To`, and every `When` condition are unambiguous; exact canonical endpoint identity is readily inspectable | Do not replace the information with a nickname, generic arrow, inaccessible address, or ambiguous rule count. Product Design owns the concrete presentation. |
| ORG-CASE-033 | Author a `When` condition | Require one or more non-empty trimmed natural-language strings and preserve their order | No expression builder, automatic evaluation, scheduling, or authorization meaning. |
| ORG-CASE-034 | Choose AgentOrg-owned `From` | Offer direct Org Agents and Agents mounted inside direct Teams | Team, Org, task execution, root, unrelated-run, and out-of-scope subjects are not sources. |
| ORG-CASE-035 | Choose AgentOrg-owned `To` | Offer direct Org Agents, Agents mounted inside direct Teams, and direct Team placements | Org root, task execution, deeper, unrelated-run, and out-of-scope subjects are not destinations. |
| ORG-CASE-036 | Select or inspect a Team destination | Communicate the Team name/address and `Via coordinator <Agent>` meaning, with that coordinator's canonical Agent address readily inspectable | Do not imply Team broadcast or an Org coordinator. Product Design owns the concrete presentation. |
| ORG-CASE-037 | Author Team-local Handoff | `From` and `To` choices are direct Agent members of that Team; edit only from the Team surface | Team root `/`, Org peers, mounted-parent paths, and Team/Org subjects are not Team-local choices. |
| ORG-CASE-038 | Add, edit, delete, or reorder | Provide functional `Add handoff`, Edit, Delete, and handoff-order controls; within one Handoff provide add/edit/delete/reorder for When conditions | Do not expose an inert `Add rule` action or conflate endpoint pairs with conditions. |
| ORG-CASE-039 | Author self-resolving or duplicate effective endpoints | Block save and identify the affected Handoff; add another When condition to an existing pair instead of duplicating it | No duplicate pair, direct self-target, or Team target whose coordinator resolves to the source. |
| ORG-CASE-040 | Remove/rename a member used by a Handoff | Identify every affected Handoff and require explicit resolution before save | Do not silently delete, retarget, rebase, or persist a stale address. |
| ORG-CASE-041 | Cancel or save Handoff edits | All edits remain in the definition draft; Cancel discards them; one complete validated definition save commits atomically and gives visible success/failure feedback while retaining a failed draft | No per-control partial persistence, loss of a failed draft, or mutation before complete validation. |
| ORG-CASE-042 | View Org-owned versus Team-local Handoffs | Org surface edits Org-owned Handoffs only; Team surface edits Team-local Handoffs only; any compiled/effective combined view labels its owner and is read-only | Org editing never mutates the referenced Team or becomes a second Team-local editing authority. |

### AgentOrg Configuration, Activation, And Focus — Approved In RER-013

Configuration answers how every mounted execution will run; it does not answer
who the user will communicate with. The supported effective-setting order is:

```text
direct Org Agent: Agent placement override -> Org root choices
Team Agent:       Agent placement override -> Team placement override -> Org root choices
```

The AgentOrg definition's launch defaults seed the Org-root choices. A mounted
Agent or Team definition's own default launch preferences do not independently
replace the Org choices merely because that definition is referenced; those
defaults still seed the definition's standalone launch journey.

| Case ID | Trigger / Input | Required Outcome | Rejected Or Preserved Alternative |
| --- | --- | --- | --- |
| ORG-CASE-043 | Invoke AgentOrg `Run` | Proceed directly to one AgentOrg configuration journey covering the complete mounted scope | No separate pre-configuration entry selector. Product Design owns the concrete interaction solution. |
| ORG-CASE-044 | Set or change an Org-root launch choice | Apply it to every mounted execution that has no more-specific valid placement override | Do not require repeating the same choice per Team/Agent. |
| ORG-CASE-045 | Override one direct Team placement | Apply the Team override to that Team and its Agents unless an exact Agent override exists | Do not mutate the referenced Team definition or affect peer/direct Org Agents. |
| ORG-CASE-046 | Override an exact mounted Agent | Apply that override only to the exact Agent placement, with highest specificity | Do not change its containing Team, sibling Agents, or reusable Agent definition. |
| ORG-CASE-047 | Reference a Team or Agent whose definition has standalone launch defaults | Preserve those definition defaults for standalone launch, but do not let them silently supersede the active Org-root/placement choices | Referencing a definition is not an implicit run override or definition mutation. |
| ORG-CASE-048 | Launch a completely valid Org configuration | Activate one full Org execution scope with every mounted execution configured and no initially focused recipient | Do not launch a single chosen entry, auto-focus a member, or change Team coordinator ingress. |

### Execution, Lifecycle, And Tasks

| Case ID | Trigger / Input | Required Outcome | Rejected Or Preserved Alternative |
| --- | --- | --- | --- |
| ORG-CASE-026 | Launch AgentOrg | Create and activate one Org-owned execution-tree root with all direct Agent/Team members and no initial focus | Root has no coordinator; activation does not require or infer a recipient. |
| ORG-CASE-027 | Activate Team in Org | Preserve Team definition/run identity, coordinator, launch config, Agents, tasks, events, stop, and restore | No configured child Team below it. |
| ORG-CASE-028 | Org member delegates task to Team | Fresh task TeamRun is stored beneath exact delegating host scope and starts through Team coordinator | It is not configured membership or a permanent address. |
| ORG-CASE-029 | Stop/restore AgentOrg | Apply lifecycle to complete Org scope using stored identities/snapshot | Do not reinterpret from mutable definitions. |
| ORG-CASE-030 | Launch/restore standalone Team | Preserve Team-owned lifecycle/tasks | No Org-only Team requirement. |

### Standalone-To-Org Reuse

| Case ID | Trigger / Input | Required Outcome | Rejected Or Preserved Alternative |
| --- | --- | --- | --- |
| ORG-CASE-031 | User adds a previously tested standalone AgentTeam definition to AgentOrg and authors Org-scoped handoffs | Org references the same Team definition identity and preserves its coordinator, Agent members, Team-local handoffs, independent launchability, and prior run history | No copy, fork, Org-specific Team subtype, or Team-within-Team placement is required. |

### Mounted Team Aggregate Status — Approved In RER-020

| Case ID | Trigger / Input | Required Outcome | Rejected Or Preserved Alternative |
| --- | --- | --- | --- |
| ORG-CASE-056 | Render a direct Team placement in an active AgentOrg hierarchy | Show one Team-row aggregate status in the established status position and retain every descendant Agent's exact status signal | The Team row is not status-less, and the aggregate does not replace or overwrite Agent-row states. |
| ORG-CASE-057 | Aggregate the mounted Team while its branch is expanded or collapsed, then inspect history/stopped state | Fold only exact Agent execution statuses projected inside that Team branch—including configured and task-scoped descendant Agents—with precedence `running > initializing > error > idle > offline`; unknown/missing/empty is `offline`; keep the Team signal visible while collapsed; historical/stopped presentation uses truthful historical/terminal Agent projection and never retains unowned stale live activity | The Team container, direct Org Agents, ancestors, sibling Teams, and rows outside the Team subtree do not contribute; no independent polling or alternate status authority is introduced. |
| ORG-CASE-058 | User perceives or interacts near the mounted Team status | Expose Team identity and aggregate state without color alone while preserving the original Team-tree appearance as far as the fixed-depth model allows | The signal is presentation-only: no Team-root persistence/transport field, independent Stop/restore/archive action, lifecycle ownership, focus/routing/readiness/command effect, or synthetic standalone mounted-Team run is created. |

### AgentOrg Member-Overrides Hierarchy — Behavior Approved In RER-022; Product Authority In RER-023

| Case ID | Trigger / Input | Required Outcome | Rejected Or Preserved Alternative |
| --- | --- | --- | --- |
| ORG-CASE-059 | User invokes AgentOrg `Run` and reaches configuration | Render `Member overrides (N)` collapsed initially, with `N` equal to the exact configurable Agent placements across direct Org Agents and mounted-Team Agents and with its accessible disclosure immediately beside the label; opening it exposes direct placement rows but keeps every mounted Team independently collapsed | Opening the outer disclosure does not automatically expose all Team Agent rows, and direct-to-Org configuration/full-scope launch semantics remain unchanged. |
| ORG-CASE-060 | User scans or expands one mounted Team under Member overrides | The collapsed Team row shows readable Team name, `TEAM`, exact mounted address, explicit `Inherited` or `Customized` Team-scope state, and an accessible expansion control. Expanding that Team reveals its Team-placement controls and exact direct-Agent rows in the established AgentTeam launch visual/control language while sibling Teams remain collapsed; coordinator identity appears on the exact coordinator Agent row only | No bespoke always-exposed child tree, implicit inherited state, Team-row/Org coordinator semantics, copied Team definition, configured nested Team, or shared Team/Org runtime payload is introduced. |
| ORG-CASE-061 | User changes a Team-placement value or one exact Team Agent value, collapses/reopens the Team, then launches | Each state label remains local to the exact placement: Team scope is customized only by its own override, each Agent remains inherited until its own override exists, and an Agent-only override does not relabel the Team scope. Draft values survive disclosure changes; effective configuration still resolves Agent override → Team override → Org root and complete launch validation remains authoritative | Collapse/expand never discards a valid draft, mutates the referenced Team definition, changes coordinator ingress, selects a recipient, or alters persistence/transport semantics. |

## Normative Definition Package And Admission Contract — Approved In RER-018; Authored Versions Superseded In RER-029

Authored definition configs have no `schemaVersion`. Runtime execution-tree
versions are independent and remain mandatory and unchanged. The normal server
admits only the strict current shape for the known Team or Org package family;
the related `team.md` and `org.md` continue to carry the definition's authored
name, description, category, and instructions.

### Current AgentTeam Definition Config

```text
AgentTeamDefinitionConfigFile
agent-teams/<teamDefinitionId>/team-config.json
```

```json
{
  "coordinatorMemberName": "researcher",
  "members": [
    {
      "memberName": "researcher",
      "ref": "researcher",
      "refScope": "team_local"
    }
  ],
  "handoffs": [],
  "avatarUrl": null,
  "defaultLaunchConfig": null
}
```

Current Team Definition rules:

1. Normal writes emit exactly the top-level keys shown above.
2. `schemaVersion` is absent, not an optional authoring field. Normal save/export output does not reinsert it.
3. A member has exactly `memberName`, `ref`, and `refScope`; it has no `refType` because every configured Team member is an Agent.
4. Supported `refScope` values remain `shared`, `team_local`, or `application_owned` when valid for the source owner.
5. `coordinatorMemberName` resolves to exactly one direct member.
6. A version-bearing file, member `refType`, Team/Org member, unsupported key/scope, unresolved reference, invalid coordinator, or wrong family fails target admission.

### Current AgentOrg Definition Config

```text
AgentOrgDefinitionConfigFile
agent-orgs/<orgDefinitionId>/org-config.json
```

```json
{
  "members": [
    {
      "memberName": "software_engineering_team",
      "ref": "software-engineering-team",
      "refType": "agent_team",
      "refScope": "shared"
    }
  ],
  "handoffs": [],
  "avatarUrl": null,
  "defaultLaunchConfig": null
}
```

Current AgentOrg Definition rules:

1. Normal writes emit exactly the top-level keys shown above.
2. `schemaVersion` is absent, not an optional authoring field. Normal save/export output does not reinsert it.
3. A member has exactly `memberName`, `ref`, `refType`, and `refScope`; `refType` is exactly `agent` or `agent_team`.
4. Supported `refScope` values are `shared`, `org_local`, or `application_owned` when valid for the source owner. `org_local` refers to the same exact Agent/flat-Team definition bundled in the owning Org; it replaces only the former authored scope spelling, not its ownership or identity.
5. The config has no `coordinatorMemberName`, recipient, focus, or fallback field.
6. A version-bearing file, nested Org, Team-owned Team, unresolved reference, unsupported key/scope, wrong family, or Org referring to an unavailable Team fails target admission.

### Source Ownership And Normal Admission

| Source Class | This Ticket May Write/Migrate It? | Required Cutover Outcome |
| --- | --- | --- |
| Writable server data root, including `$DATA_DIR/agent-teams/**` | Yes | Migration-only legacy decoder may convert eligible sources to current Team Definition or current Org Definition before normal target-only admission. |
| Definitions versioned in the implementation repository, including `applications/**/agent-teams/**` | Yes | Update atomically with the server codec and validate as exact current shapes. In-repository test fixtures are validation assets, not customer migration records. |
| `/home/autobyteus/workspace/autobyteus-agents` | No | Separate owner publishes current Team/Org definition packages. This ticket reads it only through normal current-shape admission after cutover. |
| `/home/autobyteus/workspace/autobyteus-private-agents` | No | Separate owner publishes current Team/Org definition packages. This ticket reads it only through normal current-shape admission after cutover. |
| `$MEMORY_ROOT/agent_teams/*` execution packages | Runtime migration only; definition-source ownership is irrelevant | Every package present at cutover remains in scope under the approved Team V2 / AgentOrg V1 runtime-family transition. |

Normal admission never retries a versioned/retired definition parser after
target validation fails. It reports package root, definition identity/path,
expected current family/shape, and reason, and does not mutate the source. A rejected
external definition, plus an Org that depends on its unavailable Team, is
excluded from new-run catalog/launch/authoring until its owner publishes the
current format. Under the approved rollout policy, this per-definition
unavailability does not block server startup, compatible definitions, server
memory migration, or history/inspection of existing durable run snapshots.

| Case ID | Trigger / Input | Required Outcome | Rejected Or Preserved Alternative |
| --- | --- | --- | --- |
| ORG-CASE-049 | Admit exact current Team Definition Config without schemaVersion | Accept an Agent-only Team with one direct Agent coordinator | No `refType`, Team member, Org member, or implicit legacy normalization. |
| ORG-CASE-050 | Admit exact current AgentOrg Definition Config without schemaVersion | Accept direct Agents/Teams with explicit member kind and no coordinator | No Team-as-Org alias, coordinator, or recipient fallback. |
| ORG-CASE-051 | Normal admission receives version-bearing, retired-shape or family-mismatched definition | Reject with root, definition/path, expected current family/shape and actionable reason; absence of schemaVersion alone is valid | Do not retry a legacy codec, silently add/remove fields, or write the source. |
| ORG-CASE-052 | Ticket encounters either separately maintained external repository | Treat as read-only; record separate owner follow-up | Do not migrate, edit, commit, release, or claim completion for that project. |
| ORG-CASE-053 | Runtime inventory includes a run whose definition source is external/incompatible | Keep the run in the server runtime transition and history scope | Do not drop or skip runtime state because the current definition source is unavailable. |
| ORG-CASE-054 | Org definition references an unavailable/rejected Team definition | Reject the Org from new-run admission with the dependency diagnostic | Do not partially admit, copy, infer, or fall back to an old Team parser. |
| ORG-CASE-055 | Server cutover includes compatible and incompatible external definitions | Compatible definitions and server/history functions remain ready; incompatible definitions are individually unavailable until owner update | No global startup block and no hidden compatibility activation. |

### Authored-Field Removal And Bounded Transition — RER-029

These logical definition labels describe the current authored format, not a
required internal TypeScript rename. Normal admission remains one strict
current-shape contract per package family; removing `schemaVersion` does not
revive retired Team `refType`, recursive membership or other omitted required
fields. No other optional/defaultable-field change is authorized.

Previously valid version-bearing server-owned definitions are part of the
owned transition cohort. Preserve exact identity, metadata/instructions,
member/reference/coordinator meaning, handoffs and launch defaults while
removing only the superseded authored field from otherwise-current configs.
Already-current configs remain valid. Any handling of the previous format is
transition-only, not a permanent normal parser. Architecture owns inventory,
readiness, atomicity and transition mechanics under existing ownership and
preservation constraints. External repositories remain owner-maintained and
read-only here, with the existing diagnosed per-definition unavailability
policy. Runtime execution files, their versions and their approved migration
rules are unchanged; authoring simplification alone must not rewrite/replay
runtime migration.

| Case ID | Trigger / Input | Required Outcome | Rejected Or Preserved Alternative |
| --- | --- | --- | --- |
| ORG-CASE-062 | Author, save/reload, export and import a current Team or Org config | No schemaVersion required, persisted or reintroduced; all remaining authored values retain their semantics | No relaxed unrelated fields, retired-shape fallback or UI redesign. |
| ORG-CASE-063 | Transition otherwise-current version-bearing owned definitions | Remove only the superseded authored version, preserve identity/meaning and keep current configs valid | No external writes, normal versioned fallback, runtime schema change or new runtime migration. |

### Org-Local Authored Reference Vocabulary — Approved In RER-033

Org member `refScope` values are exactly `shared`, `org_local` and
`application_owned`. Team values remain `shared`, `team_local` and
`application_owned`. Normal Org authoring/read/write/import/export preserves
the new authored vocabulary and exact reference meaning; the retired
`agent_org_owned` authored scope fails normal admission with an actionable
package/definition/member-field diagnostic, not a permanent dual-name fallback.

Illustrative Org member referring to an already identified bundled Team
(the opaque ref is preserved, not renamed to match the scope):

```json
{
  "memberName": "research_team",
  "ref": "agent-org-owned-team:example-org:research-team",
  "refType": "agent_team",
  "refScope": "org_local"
}
```

Preserve previously valid otherwise-current server-owned Org definition
meaning through a bounded spelling transition, including exact refs/identities,
ownership, handoffs, launch defaults and other authored values. Current
org_local definitions remain valid. Inventory, transition/readiness and
technical mappings remain Architecture-owned; any retired-name handling is
transition-only. External repositories retain their approved read-only and
separate-owner availability boundary. This does not rename ownershipScope,
internal source kind, agent-org-owned-agent/team identity prefixes, directories
or runtime schemas, or authorize runtime-migration replay. Prior version-field
removal remains independent; neither change authorizes unrelated field loss.

| Case ID | Trigger / Input | Required Outcome | Rejected Or Preserved Alternative |
| --- | --- | --- | --- |
| ORG-CASE-064 | Author/create/edit/save/read/export/import an Org using org_local for bundled Agents or flat Teams | Same exact definitions/refs resolve; authored scope uses org_local throughout the supported roundtrip | Shared/application-owned Org and all Team scope vocabulary remain unchanged; no renamed identity or global/basename fallback. |
| ORG-CASE-065 | Normal Org admission receives agent_org_owned, team_local or an unsupported/unresolved local scope | Reject with package/definition/member-field diagnostic and current allowed vocabulary | No second normal name, silent normalization or relaxed resolution. |
| ORG-CASE-066 | Transition an otherwise-current server-owned Org using the retired authored scope | Preserve identities/refs/ownership and all other meaning under org_local; current configs remain valid | No external writes, ownership/ID/path/schema rename, runtime rewrite/replay or new configured topology. |


## Current TeamRun V2 Assessment

### Current Native Team Contract

The supported standalone Team execution authority is already strict and
versioned:

```text
$MEMORY_ROOT/agent_teams/<rootTeamRunId>/team_run_execution_tree.json

TeamRunExecutionTreeFileV2
  schemaVersion: 2
  createdAt
  archivedAt
  applicationBinding
  handoffs
  rootTeam
    address: "/"
    teamDefinitionId
    teamDefinitionName
    teamRunId
    coordinatorAddress
    defaultLaunchConfiguration
    members[]
    taskExecutions[]
```

Authority:

- `autobyteus-server-ts/src/agent-team-execution/domain/team-run-execution-tree.ts`
- `autobyteus-server-ts/src/run-history/store/team-run-execution-tree-schema.ts`
- `autobyteus-server-ts/src/run-history/store/team-run-execution-tree-path.ts`
- `autobyteus-server-ts/src/run-history/store/team-run-execution-tree-store.ts`
- `autobyteus-server-ts/src/agent-memory/store/agent-memory-layout.ts`
- `autobyteus-team-stream-contracts/src/team-execution-view-dtos.ts`

The current file uses exact-key validation. `rootTeam` requires one direct Agent
coordinator. Configured Agent, configured Team, handoff, launch-configuration,
application-binding, timestamp, task Agent, task Team, and task-Team-member
records already contain the fields needed by the fixed-depth AgentOrg topology.

### Corrected Reuse Finding

The reusable asset is the **record topology**, not a mandate to replace the
native Team file family. The user's corrected boundary is:

1. a flat standalone AgentTeam continues to persist and restore as exact Team V2;
2. Team flatness is enforced by narrowing `rootTeam.members` to configured Agent records, not by changing Team JSON keys, version, file name, or package path;
3. AgentOrg gets a new AgentOrg V1 file/root family;
4. AgentOrg V1 reuses the current V2 envelope/member/handoff/launch/task field shapes where their meaning is common; and
5. generic readers expose an explicit root-kind union rather than forcing both files into one persisted generic root.

## Normative Durable File-Family Contract

### Family A — Native Standalone AgentTeam V2 (Preserved)

Canonical logical type and physical execution-tree location:

```text
TeamRunExecutionTreeFileV2
$MEMORY_ROOT/agent_teams/<rootTeamRunId>/team_run_execution_tree.json
```

The exact persisted envelope/root structure remains:

```json
{
  "schemaVersion": 2,
  "createdAt": "2026-08-31T00:00:00.000Z",
  "archivedAt": null,
  "applicationBinding": null,
  "handoffs": [],
  "rootTeam": {
    "address": "/",
    "teamDefinitionId": "software-engineering-team",
    "teamDefinitionName": "Software Engineering Team",
    "teamRunId": "software-engineering-team-run-id",
    "coordinatorAddress": "/architecture_designer",
    "defaultLaunchConfiguration": {
      "runtimeKind": "autobyteus",
      "llmModelIdentifier": "default",
      "llmConfig": null,
      "autoExecuteTools": true,
      "skillAccessMode": "PRELOADED_ONLY",
      "workspaceRootPath": null
    },
    "members": [
      {
        "address": "/architecture_designer",
        "agentDefinitionId": "architecture-designer",
        "role": null,
        "description": null,
        "agentRunId": "architecture-designer-run-id",
        "platformAgentRunId": null,
        "launchConfiguration": {
          "runtimeKind": "autobyteus",
          "llmModelIdentifier": "default",
          "llmConfig": null,
          "autoExecuteTools": true,
          "skillAccessMode": "PRELOADED_ONLY",
          "workspaceRootPath": null
        }
      }
    ],
    "taskExecutions": []
  }
}
```

Native Team V2 invariants after the model change:

- `schemaVersion` remains `2`; no Team V3 is created.
- The exact top-level keys and exact `rootTeam` keys remain unchanged.
- The file name remains `team_run_execution_tree.json`.
- The root package remains `$MEMORY_ROOT/agent_teams/<rootTeamRunId>/`.
- `rootTeam.coordinatorAddress` remains required and resolves to one direct configured Agent.
- `rootTeam.members` contains configured Agent records only. A configured Team or AgentOrg member is rejected before write/activation/restore.
- Existing flat Team V2 files already satisfying these invariants remain native and require no execution-tree rewrite, move, rename, or version bump.
- No `subjectKind`, generic `root`, `FlatTeam`, or other field is added to the Team V2 JSON.

### Family B — New AgentOrg V1

Canonical logical type and physical execution-tree location:

```text
AgentOrgRunExecutionTreeFileV1
$MEMORY_ROOT/agent_orgs/<orgRunId>/agent_org_run_execution_tree.json
```

The exact logical JSON contract is:

```json
{
  "schemaVersion": 1,
  "subjectKind": "agent_org",
  "createdAt": "2026-08-31T00:00:00.000Z",
  "archivedAt": null,
  "applicationBinding": null,
  "handoffs": [],
  "rootOrg": {
    "address": "/",
    "orgDefinitionId": "software-development-department",
    "orgDefinitionName": "Software Development Department",
    "orgRunId": "software-development-department-run-id",
    "defaultLaunchConfiguration": {
      "runtimeKind": "autobyteus",
      "llmModelIdentifier": "default",
      "llmConfig": null,
      "autoExecuteTools": true,
      "skillAccessMode": "PRELOADED_ONLY",
      "workspaceRootPath": null
    },
    "members": [
      {
        "address": "/requirements_engineer",
        "agentDefinitionId": "requirements-engineer",
        "role": null,
        "description": null,
        "agentRunId": "requirements-engineer-run-id",
        "platformAgentRunId": null,
        "launchConfiguration": {
          "runtimeKind": "autobyteus",
          "llmModelIdentifier": "default",
          "llmConfig": null,
          "autoExecuteTools": true,
          "skillAccessMode": "PRELOADED_ONLY",
          "workspaceRootPath": null
        }
      },
      {
        "address": "/software_engineering_team",
        "teamDefinitionId": "software-engineering-team",
        "role": null,
        "description": null,
        "teamRunId": "software-engineering-team-run-id",
        "coordinatorAddress": "/software_engineering_team/architecture_designer",
        "defaultLaunchConfiguration": {
          "runtimeKind": "autobyteus",
          "llmModelIdentifier": "default",
          "llmConfig": null,
          "autoExecuteTools": true,
          "skillAccessMode": "PRELOADED_ONLY",
          "workspaceRootPath": null
        },
        "members": [
          {
            "address": "/software_engineering_team/architecture_designer",
            "agentDefinitionId": "architecture-designer",
            "role": null,
            "description": null,
            "agentRunId": "architecture-designer-run-id",
            "platformAgentRunId": null,
            "launchConfiguration": {
              "runtimeKind": "autobyteus",
              "llmModelIdentifier": "default",
              "llmConfig": null,
              "autoExecuteTools": true,
              "skillAccessMode": "PRELOADED_ONLY",
              "workspaceRootPath": null
            }
          }
        ],
        "taskExecutions": []
      }
    ],
    "taskExecutions": []
  }
}
```

AgentOrg V1 exact-key and semantic invariants:

- Top-level keys are exactly `schemaVersion`, `subjectKind`, `createdAt`, `archivedAt`, `applicationBinding`, `handoffs`, and `rootOrg`.
- `schemaVersion` is `1`; `subjectKind` is exactly `agent_org`.
- `rootOrg` keys are exactly `address`, `orgDefinitionId`, `orgDefinitionName`, `orgRunId`, `defaultLaunchConfiguration`, `members`, and `taskExecutions`.
- `rootOrg.address` is `/`; `rootOrg` has no `coordinatorAddress`, interaction target, or recipient-default field.
- `defaultLaunchConfiguration` persists the Org-root run choices required by the approved configuration hierarchy; it is not coordinator or focus state.
- Direct `members` are current-format configured Agent or configured Team records.
- Every direct configured Team retains its current `coordinatorAddress`, launch configuration, task executions, and configured Agent member records. Its configured `members` contains Agents only.
- Org activation persists no initial recipient/focus. Later workspace focus is interaction state and MUST NOT be inferred from a removed legacy root coordinator.
- Configured addresses are limited to `/agent`, `/team`, and `/team/agent`; configured Team below Team and AgentOrg below any configured member are invalid.

### Shared Record Shapes — Reuse Without A Generic Persisted Root

| Record / Field Group | Team V2 | AgentOrg V1 | Required Contract |
| --- | --- | --- | --- |
| `createdAt`, `archivedAt` | Existing exact fields | Same exact fields | Preserve ISO-8601 UTC meaning. |
| `applicationBinding` | Existing exact field shape | Same exact field shape | Preserve application/binding identity or `null`. |
| `handoffs` | Existing `{from,to,rules[]}` records | Same exact record shape | Preserve order, rooted addresses, and natural-language conditions. |
| Launch configuration | Existing exact field shape | Same exact root/member field shape | Preserve runtime/model/tool/skill/workspace values. |
| Configured Agent | Existing exact record | Same exact record | Preserve address, definition/run identity, role/description, platform ID, and launch configuration. |
| Configured Team | Not valid in flat Team root after cutover | Reuse existing exact record | Constrain members to Agents; retain coordinator and task executions. |
| Task Agent | Existing exact record | Same exact record | Preserve target address, run IDs, timestamps, and settlement. |
| Task Team / task-Team member | Existing exact records | Same exact records | Preserve recursive task lineage; do not treat it as configured nesting. |

No new `kind` field is added to these persisted configured/task records. Their
existing AgentRun-ID-versus-TeamRun-ID exact-key unions remain the shared
record discriminator. Implementations may share internal types/validators, but
that does not merge the two persisted root families.

A task execution remains stored in the `taskExecutions` array of its exact
semantic host: native `rootTeam`, AgentOrg `rootOrg`, a direct configured Team,
or another task Team. It does not add configured membership or a permanent
address.

### Generic History, Catalog, Restore-Location, GraphQL, And Stream Projection

A consumer that can return both roots MUST expose the following logical
discriminated union (wire casing may follow the existing contract convention,
but the logical field and values are normative):

```text
RootExecutionTreeProjection =
  | {
      root_subject_kind: "agent_team",
      execution_tree: TeamRunExecutionTreeDtoV2
    }
  | {
      root_subject_kind: "agent_org",
      execution_tree: AgentOrgRunExecutionTreeDtoV1
    }
```

Rules:

1. `root_subject_kind` is mandatory on mixed-root history, catalog, stream, workspace, and generic execution-tree responses/events.
2. The `agent_team` variant carries/projects Team V2 semantics; the `agent_org` variant carries/projects AgentOrg V1 semantics.
3. Existing Team-only endpoints/DTOs may remain Team-specific and byte/wire compatible; they do not need a synthetic Org union.
4. Persistence discovery selects a validator from the known package family/path and then validates the exact schema version/root keys. It does not scan one family and reinterpret it as the other.
5. A generic reader MUST NOT infer kind from coordinator presence, display name, configured members, schema version alone, or whichever validator happens to accept the payload.
6. Package family, payload discriminator/root, and requested projection kind must agree; a mismatch fails closed and is not auto-moved or auto-retyped during ordinary read/restore.
7. Derived mixed indexes include the root kind and the matching definition/run identity so Team and Org identifiers are never conflated.

## Migration Preconditions / Preknown Conditions

1. Definition-source ownership and runtime-package ownership are separate. This ticket writes only server-owned definition sources and server memory runtime packages.
2. The two external definition repositories are read-only dependencies and separate owner work. Their 23 inspected roots remain topology evidence, not definition migration inputs.
3. Configured topology has at most one Team-membership edge: current root Team → optional direct child Team → Agents. No inspected server runtime has a grandchild configured Team.
4. Server memory runtime has exactly two configured cohorts: Agent-only roots and one-level organization-like roots. Every package present at cutover is inventoried regardless of definition origin.
5. Task-scoped Team lineage is not configured Team nesting and remains anchored to its exact runtime host.
6. A migration-only legacy definition decoder may operate on server-owned sources; normal target admission has no legacy fallback.
7. Migration does not need recursive flattening or a deep legacy compatibility branch. An unexpected in-scope precondition violation stops before writes; an incompatible external definition is rejected by admission rather than migrated.

Observed evidence: 23 external root definitions establish the zero/one-level
shape but are outside this ticket's definition writes. The original runtime
inventory contained 41 readable stored TeamRun trees (27 flat, 14 one-level).
The `RER-017` re-probe found 43 readable trees (27 flat, 16 one-level), none
deeper. The cutover inventory, rather than either historical count, is the
authoritative runtime workset.

## Fixed-Depth Family Transition

| Current TeamRun V2 Input | Agent-Only Root | One-Level Organization-Like Root |
| --- | --- | --- |
| Package family/path | Keep `$MEMORY_ROOT/agent_teams/<rootTeamRunId>/` | Convert canonical package to `$MEMORY_ROOT/agent_orgs/<orgRunId>/`; preserve the root run-ID value as `orgRunId` unless an independently approved identity mapping says otherwise. |
| Execution-tree file | Keep `team_run_execution_tree.json` | Write `agent_org_run_execution_tree.json`; retire the old Team execution-tree authority only after the Org package commit succeeds. |
| Version/root | Keep `schemaVersion: 2` and `rootTeam` | Set `schemaVersion: 1`, add `subjectKind: agent_org`, and project `rootTeam` to `rootOrg`. |
| Root identity | Preserve `teamDefinitionId`, `teamDefinitionName`, `teamRunId` | Project values to `orgDefinitionId`, `orgDefinitionName`, `orgRunId`. |
| Root coordinator | Preserve and validate as direct Team Agent | Remove coordinator semantics/field. Preserve the referenced Agent as an ordinary direct Org Agent; do not create initial focus or fallback. |
| Root default launch configuration | Preserve byte-equivalent fields | Preserve byte-equivalent fields as `rootOrg.defaultLaunchConfiguration`. |
| Direct Agent records | Preserve byte-equivalent fields | Preserve byte-equivalent fields as independent Org Agents. |
| Direct Team records | Invalid under the flat Team target; not present in this cohort | Preserve byte-equivalent configured Team records as direct Org Teams; enforce Agent-only members and coordinator validity. |
| Handoffs | Preserve unchanged | Preserve unchanged. |
| Root/Team/task-owned task executions | Preserve unchanged and at the same semantic host | Preserve unchanged and project only the root host name from `rootTeam` to `rootOrg`. |
| Content, memory, messages, task ledgers, history | Keep in native Team package; no destructive rewrite | Move/project to the Org package without identity/content loss; rebuild only derived indexes/caches after canonical commit. |
| Generic indexes/projections | Add/retain `root_subject_kind: agent_team` where mixed | Set `root_subject_kind: agent_org`; never infer from legacy coordinator. |

The runtime transition is fixed-depth and idempotent. It MUST commit and
validate the canonical AgentOrg execution package before retiring the legacy
organization-like Team runtime authority or rebuilding derived indexes. The
matching definition source is converted in the same ticket only when it is
server-owned; an external source remains separate owner work. Flat Team V2 run
packages are not migration output writes; they are already the native runtime
target. A crash or validation failure cannot leave both runtime families
simultaneously advertised as active canonical authority for the same root
identity.

## Contract Verification Matrix

| Verification ID | Scope | Verification Intent |
| --- | --- | --- |
| ORG-VERIFY-001 | ORG-CASE-001–007, ORG-CASE-031 | Definition/import/update, standalone-Team validation, and progressive Team-to-Org reuse. |
| ORG-VERIFY-002 | ORG-CASE-008–018 | Coordinator-free Org activation/post-launch targeting and strict addresses. |
| ORG-VERIFY-003 | ORG-CASE-019–025 | Team-local and Org-wide handoffs using reused address records. |
| ORG-VERIFY-004 | ORG-CASE-026–030 | Org/Team lifecycle and host-anchored task execution. |
| ORG-VERIFY-005 | Native Team V2 and AgentOrg V1 file-family contracts | Exact versions/keys/file names/package paths, strict family validation, flat Team invariants, coordinator-free Org root, reused child/task records, and restore. |
| ORG-VERIFY-006 | Preconditions and fixed-depth family transition | Flat Team V2 no-op classification, one-level Org conversion, identity/content preservation, atomic/idempotent authority cutover, and no deep topology branch. |
| ORG-VERIFY-007 | ORG-CASE-032–042 | Explicit From/To/When detail and authoring; eligible endpoint projection; coordinator indication; address visibility; CRUD/order/validation/cancel/atomic save; Org-versus-Team ownership separation. |
| ORG-VERIFY-008 | ORG-CASE-043–048 | Direct-to-Org configuration, Org → Team → Agent effective-setting precedence, referenced-definition immutability, complete launch validation, full-scope activation, and no initial focus. |
| ORG-VERIFY-009 | Mixed-root projection contract | Mandatory `root_subject_kind`, correct Team V2/AgentOrg V1 union branch, Team-only compatibility, package/payload/projection agreement, and failure-closed mismatch handling. |
| ORG-VERIFY-010 | ORG-CASE-049–055, ORG-CASE-062–066 | Unversioned current Team/Org definition shapes, org_local authored scope with exact reference preservation, authored roundtrip and bounded owned-definition transitions, source ownership, migration-only legacy decoding, target-only normal admission, external dependency diagnostics, runtime independence, and approved per-definition availability. |
| ORG-VERIFY-011 | ORG-CASE-056–058 | Mounted Team aggregate status over exact in-branch Agent projections; five-state precedence; collapsed visibility; accessible meaning; truthful stopped/history behavior; no Team-root lifecycle or persistence authority. |
| ORG-VERIFY-012 | ORG-CASE-059–061 | Exact-Agent count and adjacent accessible outer disclosure; outer and per-Team default collapse; established Team-scope identity/state/disclosure language; exact coordinator Agent identification; exact-placement-local inheritance/customization; sibling independence; draft preservation; unchanged effective-setting precedence, flat membership, coordinator-free Org, and distinct payload/runtime ownership. |

## Contract Non-Goals

- Changing native standalone Team V2 JSON keys, version, file name, or package path.
- A Team V3 schema, generic persisted root-union file, or migration rewrite for already-flat Team V2 packages.
- Duplicating or redesigning configured Agent/Team, handoff, launch, or task record shapes merely because AgentOrg has its own root/file family.
- `FlatTeam` domain/schema/file names.
- Recursive configured AgentTeam or AgentOrg definitions.
- A root AgentOrg coordinator, pre-launch exact-entry selector, automatic initial focus, or default recipient fallback.
- Shared Agent runtime instances across configured placements.
- Automatic cross-run logical routing.
- Live topology mutation/file watching.
- Recursive legacy topology migration.
- Removing supported task-scoped Team delegation.
- Executable/scheduled handoff policy, a graphical workflow engine, or automatic evaluation of `When` prose.
- Editing, migrating, committing, or releasing either separately maintained external definition repository.
- A normal dual parser, silent field normalization, or legacy definition fallback for out-of-scope packages.
- Making existing run history unavailable solely because its definition package has not yet published the current format.
- Persisting or transporting an independent mounted-Team aggregate status, registering a mounted Team as another collaboration root, or adding mounted-Team Stop/restore/archive lifecycle actions inside an AgentOrg.
- Retaining the superseded `VIS-015` always-exposed Team-child hierarchy, showing inherited Team scope only by the absence of a badge, or introducing a third Member-overrides interaction instead of preserving the established AgentTeam launch language.
- Interpreting presentation parity as configured Team recursion, AgentOrg coordinator semantics, Team-definition cloning, or shared Team/Org runtime and launch-payload ownership.

## Approval Basis

The 2026-08-31 approval recorded in `RER-009` confirms the product/domain basis:

1. AgentOrg is the only persistent multi-Team composition root and has no coordinator.
2. AgentTeam is Agent-only by invariant and retains its direct Agent coordinator.
3. The current generic V2 child/handoff/task topology is reused rather than replaced.
4. AgentOrg and AgentTeam preserve the same observable configured/member/task semantics without requiring recursive configured Teams.
5. AgentOrg root omits `coordinatorAddress`; direct Team nodes retain it.
6. Migration is a fixed-depth root-family projection, not tree reconstruction.
7. Task Teams remain under their exact runtime host and do not affect configured depth.
8. A standalone-tested AgentTeam is directly reusable by reference inside AgentOrg; Org-scoped handoffs are sufficient to connect it without copying or changing the Team.

The previously approved generic persisted V3 root union is the specific point
superseded by the user's later correction during the `RER-014` → `AD-REV-002`
impact round. The user explicitly approved the exact `RER-015` replacement
boundary on 2026-09-01; `RER-016` records the approval:

1. native flat Team runs remain exact `TeamRunExecutionTreeFileV2` under `agent_teams/<rootTeamRunId>/team_run_execution_tree.json`;
2. AgentOrg uses new `AgentOrgRunExecutionTreeFileV1` under `agent_orgs/<orgRunId>/agent_org_run_execution_tree.json`;
3. AgentOrg V1 has `subjectKind: agent_org`, coordinator-free `rootOrg`, and Org default configuration;
4. current configured Agent/Team, handoff, launch, application-binding, timestamp, and task record shapes are reused;
5. mixed history/stream/workspace contracts expose explicit `root_subject_kind`; and
6. flat Team V2 is a no-op cohort while one-level organization-like V2 roots convert atomically to AgentOrg V1.

The handoff semantic information and required authoring capabilities defined by
`ORG-CASE-032`–`ORG-CASE-042` were approved in `RER-012`. They constrain what
the experience must communicate and enable, not how Product Prototyper must
compose the UI. Product Prototyper owns the concrete prototype and visual/
interaction solution.

The external source ownership correction is explicit: this ticket does not
write `/home/autobyteus/workspace/autobyteus-agents` or
`/home/autobyteus/workspace/autobyteus-private-agents`. The user explicitly
approved the exact `RER-017` boundary on 2026-09-01; `RER-018` records approval:
the then-versioned Team Definition Config V2 / AgentOrg Definition Config V1
normal admission (authored numeric versions superseded in RER-029), no legacy fallback, and temporary unavailability limited to incompatible external
definitions and their dependent Orgs without globally blocking server readiness
or existing run history.

The launch/configuration/focus behavior defined by `ORG-CASE-008`–`ORG-CASE-011`
and `ORG-CASE-043`–`ORG-CASE-048` was approved in `RER-013` from the user's
explicit rejection of the `RV-009` selector. AgentOrg activation covers the
complete configured scope without a recipient; exact focus is chosen afterward
only when a recipient-requiring interaction needs it. The configuration
precedence adapts the current AgentTeam default/placement-override behavior to
the approved fixed-depth Org model without prescribing Product Design's UI or
Architecture Design's target implementation.

The user-approved Product UI package `RV-012` is integrated in `RER-014` and
remains authoritative except for its Placement Overrides lines 89–95 and
`VIS-015`, which `RER-022` behavior and the user-approved
`AORG-TEAM-OVERRIDES-001` presentation supersede for mounted-Team hierarchy/
disclosure/state presentation. The `RER-015` persistence-family correction does not
change its visible Team/Org, handoff, configuration, focus, or runtime/history
behavior; production mixed-root APIs must simply discriminate those approved
root identities truthfully.

The later user-authorized `API-FIND-007` correction is integrated in `RER-020`
and its Product evidence is approved in `RER-021`.
A configured Team row mounted beneath an AgentOrg retains the established
five-state aggregate over exact descendant Agent status projections, remains
visible when collapsed, and coexists with every Agent-row signal. The aggregate
is presentation-only and does not create a Team root, status authority,
persistence field, or lifecycle action. The user further confirmed that the UI
aggregation is behaviorally the same as the prior nested-AgentTeam aggregate;
this does not prescribe a component, state store, or code-reuse decision.

`/home/autobyteus/workspace/autobyteus-web-prototype/tickets/done/AORG-FLAT-TEAM-001/ui-ux-spec.md`
and `VIS-001`–`VIS-020` under that ticket's `visual-references/` directory are
the normative product presentation of the prior cases. The focused
`/home/autobyteus/workspace/autobyteus-web-prototype/tickets/done/AORG-FLAT-TEAM-STATUS-001/ui-ux-spec.md`
and `VIS-STATUS-001`–`VIS-STATUS-003` are the user-approved presentation
authority for `ORG-CASE-056`–`ORG-CASE-058` and supersede only the prior
`API-FIND-007` omission. The user-approved
`/home/autobyteus/workspace/autobyteus-web-prototype/tickets/done/AORG-TEAM-OVERRIDES-001/ui-ux-spec.md`
and `VIS-OVR-001`–`VIS-OVR-006` are the normative presentation authority for
`ORG-CASE-059`–`ORG-CASE-061` and supersede only the prior `VIS-015`
interaction slice. Product-declared fixture
names/values remain illustrative, and the prototype's local mocked persistence,
services, orchestration, streams, and writes do not define production
architecture.

RER-029 approval on 2026-09-11 explicitly removes the authored schemaVersion
attribute from both Team and Org configs. It supersedes the earlier numeric
definition-version requirement only; native Team V2 / AgentOrg V1 execution
files, runtime migration and all other cumulative constraints remain approved.

RER-033 additionally supersedes only the former authored Org member scope
spelling with org_local. Exact refs, ownership and runtime contract values
remain; no similarly named internal or opaque-identity field is renamed.
