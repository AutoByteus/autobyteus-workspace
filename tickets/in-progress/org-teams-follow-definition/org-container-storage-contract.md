# Org Container Storage Contract

The exact on-disk shape of an Org run after `org-teams-follow-definition` (autobyteus-29), every file a use case reads or
writes, and how each released file maps to it. Code follows this document; tests and fixtures use its examples.
Normative for implementation (design SR-010, requirements SR-007). Requested by the user on 2026-11-22: "write the
contract … how you present data on disk … write down all the use cases and validate".

- Paths are under the server's memory directory (`<data-dir>/memory/`).
- Examples use synthesized IDs modelled on the user's Org (Software Development Department: two mounted Teams, no
  direct agents) plus one direct agent `/concierge` to show that kind. They are not copies of user data.
- Read tolerantly, write exactly, no version fields (data migration guideline §3).

## 1. Folder layout

Before (released Org tree v1):

```text
agent_orgs/sdd_org_1/
  agent_org_run_execution_tree.json
  agent_org_communication_messages_active.jsonl          # the Org's one log
  agent_org_task_delegation_records.json                 # released v1; read only by migrations (inert)
  set_team_1/                                            # a mounted Team: its run ID
    solution_designer_1/  raw_traces_active.jsonl, work_journal/, context files …
    code_reviewer_1/      …
  pdp_team_1/
    product_prototyper_1/ …
  concierge_1/                                           # a direct agent: its run ID
```

After:

```text
agent_orgs/sdd_org_1/
  agent_org_run_execution_tree.json                      # the container file (§2); no log, no member folders
  agent_org_task_delegation_records.json                 # unchanged inert residue (no current reader)
agent_teams/set_team_1/                                  # Team unit (§3), renamed from agent_orgs/sdd_org_1/set_team_1/
  team_run_execution_tree.json
  team_communication_messages_active.jsonl               # §5
  solution_designer_1/  raw_traces_active.jsonl, work_journal/, context files …
  code_reviewer_1/      …
agent_teams/pdp_team_1/ …
agents/concierge_1/                                      # agent unit (§4), renamed from agent_orgs/sdd_org_1/concierge_1/
  run_metadata.json
  <agent run log>                                        # §5
  raw_traces_active.jsonl, work_journal/, context files …
```

Rules:
- A unit keeps its run ID (the Team's `teamRunId`, the agent's `agentRunId` from the released tree). No ID is allocated
  by the conversion.
- Member folders are renamed, never copied (lesson `team-agent-memory-layout`). Their contents (traces, journals,
  context files) are untouched.

## 2. Container file `agent_orgs/<orgRunId>/agent_org_run_execution_tree.json`

```json
{
  "subjectKind": "agent_org",
  "createdAt": "2026-09-21T11:47:04.136Z",
  "archivedAt": null,
  "applicationBinding": null,
  "handoffs": [
    { "from": "/software_engineering_team/solution_designer", "to": "/product_design_prototyping_team/product_prototyper",
      "rules": ["When a product design request is ready."] },
    { "from": "/concierge", "to": "/software_engineering_team", "rules": ["When a software request arrives."] }
  ],
  "rootOrg": {
    "address": "/",
    "orgDefinitionId": "software-development-department",
    "orgDefinitionName": "Software Development Department",
    "orgRunId": "sdd_org_1",
    "defaultLaunchConfiguration": { "runtimeKind": "codex_app_server", "llmModelIdentifier": "gpt-6-astra",
      "llmConfig": null, "autoExecuteTools": true,
      "workspaceRootPath": "/home/u/workspace" },
    "units": [
      { "address": "/software_engineering_team", "kind": "agent_team", "runId": "set_team_1",
        "definitionId": "software-engineering-team" },
      { "address": "/product_design_prototyping_team", "kind": "agent_team", "runId": "pdp_team_1",
        "definitionId": "product-design-prototyping-team" },
      { "address": "/concierge", "kind": "agent", "runId": "concierge_1", "definitionId": "concierge" }
    ],
    "formerUnits": []
  }
}
```

- `handoffs`: **Org rules only** — rules of the Org definition that are not wholly inside one Team, in Org addresses. A
  Team's own rules live in its Team file (§3). The stored list holds every Org rule as compiled; which ones apply now is
  derived at use (a rule from or to a member that is not currently in its Team is left out: REQ-004), never stored twice.
- `units`: current units, unique addresses, each a direct Org address (one segment). `kind` is `agent` or `agent_team`.
- `formerUnits`: units removed by an Org definition change (REQ-009), same shape; a unit that rejoins moves back with
  its run ID.
- Invariants: unique unit addresses; every unit run ID (current and former) unique; every rule's `from` lies in a
  current unit (an agent unit's address, or under a Team unit's address).
- No `members`, no log, no member state: the container stores no unit content.

## 3. Team unit file `agent_teams/<teamRunId>/team_run_execution_tree.json`

The current Team tree contract (team space), plus `containedIn`:

```json
{
  "createdAt": "2026-09-21T11:47:04.136Z",
  "archivedAt": null,
  "applicationBinding": null,
  "handoffs": [
    { "from": "/solution_designer", "to": "/architecture_reviewer", "rules": ["When the design is ready for review."] }
  ],
  "rootTeam": {
    "address": "/",
    "teamDefinitionId": "software-engineering-team",
    "teamDefinitionName": "Software Engineering Team",
    "teamRunId": "set_team_1",
    "coordinatorAddress": "/solution_designer",
    "defaultLaunchConfiguration": { "runtimeKind": "codex_app_server", "llmModelIdentifier": "gpt-6-astra",
      "llmConfig": null, "autoExecuteTools": true,
      "workspaceRootPath": "/home/u/workspace" },
    "members": [
      { "address": "/solution_designer", "agentDefinitionId": "team-local-agent:software-engineering-team:solution-designer",
        "role": null, "description": null, "agentRunId": "solution_designer_1", "platformAgentRunId": null,
        "launchConfiguration": { "runtimeKind": "codex_app_server", "llmModelIdentifier": "gpt-6-astra", "llmConfig": null,
          "autoExecuteTools": true, "workspaceRootPath": "/home/u/workspace" } },
      { "address": "/architecture_reviewer", "agentDefinitionId": "team-local-agent:software-engineering-team:architecture-reviewer",
        "role": null, "description": null, "agentRunId": "architecture_reviewer_1", "platformAgentRunId": null,
        "launchConfiguration": { "runtimeKind": "codex_app_server", "llmModelIdentifier": "gpt-6-astra", "llmConfig": null,
          "autoExecuteTools": true, "workspaceRootPath": "/home/u/workspace" } }
    ]
  },
  "containedIn": { "orgRunId": "sdd_org_1", "address": "/software_engineering_team" }
}
```

- Members, coordinator and the Team's own rules in **team space** (direct children of `/`); the Org address of a
  member is `containedIn.address + member.address` (presentation only, design R-1'''').
- `containedIn`: written once at creation (or by the conversion), never edited; a unit has no `delegatedFrom` and no
  `copiedFrom` (it is not a delegated run).
- `formerMembers`, `leaving` markers: autobyteus-22, unchanged.
- The Team follows its Team definition (autobyteus-22) with the Team's own rules compiled at its mount path and stored
  back in team space.

## 4. Agent unit file `agents/<agentRunId>/run_metadata.json`

The current standalone agent metadata, plus `containedIn`; `address` is its Org address:

```json
{
  "runId": "concierge_1",
  "agentDefinitionId": "concierge",
  "workspaceRootPath": "/home/u/workspace",
  "memoryDir": "<data-dir>/memory/agents/concierge_1",
  "llmModelIdentifier": "gpt-6-astra",
  "llmConfig": null,
  "autoExecuteTools": true,
  "runtimeKind": "codex_app_server",
  "platformAgentRunId": null,
  "containedIn": { "orgRunId": "sdd_org_1", "address": "/concierge" },
  "address": "/concierge"
}
```

- `containedIn.address` equals `address`; no `delegatedFrom`.

## 5. Message logs

- The container has **no log**. Every message is stored with the run(s) it belongs to (CM-9).
- A message between two members of one Team unit: one line in that Team's log, as today:

```json
{"messageId":"collabmsg_a","senderAgentRunId":"solution_designer_1","receiverAgentRunId":"architecture_reviewer_1","content":"…","messageType":"handoff","referenceFiles":[],"createdAt":"2026-11-22T10:00:00.000Z"}
```

- A message between two units (for example `/concierge` → `/software_engineering_team/solution_designer`): one line
  in **each** unit's log, same `messageId`, receiver's first; **both** lines record the other side with `counterpart`
  (its **Org address**, `nodeId: null` for this node), so each run names it after a reload. Recording rule (SR-012):
  `CrossRunMessageDelivery` records `counterpart` for a `same_container` pair exactly as for an unrelated pair, on both
  lines — the sender line at `cross-run-message-delivery.ts:214` (today `kind.related ? null : …`: `same_container`
  counts as not related for recording) with the receiver's Org address, and the receiver line at
  `root-communication-engine.ts:315` (today `input.senderIdentity.memberAddress`, which is team space for a contained
  Team member) with the sender's Org address given by the contained Team root's boundary (`toOrg`, design R-1''),
  i.e. the `senderAddress` the delivery already passes, never the raw member address. Test: a message between an agent
  unit and a Team unit member, then a reload of both logs: each line's `counterpart.address` is the other side's Org
  address, and it equals what the conversion writes for the same pair (§9).

```json
{"messageId":"collabmsg_b","senderAgentRunId":"concierge_1","receiverAgentRunId":"solution_designer_1","content":"…","messageType":"handoff","referenceFiles":[],"createdAt":"2026-11-22T10:05:00.000Z","counterpart":{"address":"/concierge","nodeId":null}}
```
  (in `agent_teams/set_team_1/` log; in `agents/concierge_1/` log the same line with `"counterpart":{"address":"/software_engineering_team/solution_designer","nodeId":null}`)

- A message between a unit's agent and a run delegated by a unit of this container (a delegation-chain message, design
  SR-014): **related**, one line in each run's log, **no `counterpart`** (as today's related line), shown in every view whose
  tree holds both runs.

```json
{"messageId":"collabmsg_c","senderAgentRunId":"pdp_copy_prototyper_1","receiverAgentRunId":"solution_designer_1","content":"…","messageType":"handoff","referenceFiles":[],"createdAt":"2026-11-22T10:10:00.000Z"}
```

- A message with a party outside the Org (another run, another node; autobyteus-565): one line in the member's unit
  log, every released field kept, `counterpart` as stored.
- A user message to a member: in that member's unit log, as for any run.

## 6. Delegations from an Org member

- A new delegation's Task entry and the delegated run's own `delegatedFrom` name the **unit run** as the delegating run:
  `{ "delegatingRun": { "kind": "agent_team", "runId": "set_team_1" }, "delegatorAgentRunId": "solution_designer_1" }`
  (an agent unit: `{ "kind": "agent", "runId": "concierge_1" }`).
- The conversion rewrites existing entries and `delegatedFrom`s that name `{ "kind": "agent_org", "runId": "sdd_org_1" }`
  with a `delegatorAgentRunId` to the delegator's unit run; entries without a delegator (contract E6) stay as preserved
  history naming the container.

## 7. Context files

- Physically in the member's folder (they move with it, §1).
- Owner forms: from the Org view, `{ orgRunId, agentRunId }` (routes `/drafts/agent-org-runs/:orgRunId/agent-runs/:agentRunId/context-files/…`
  and `/agent-org-runs/…`), resolved through the container (`agentRunId` is a member of one of its units) to the unit
  run's folder. Saved references keep this form; nothing is rewritten.

## 8. Run history indexes

- `agent_org_run_history_index.json`: one entry per Org container, as today.
- Unit runs are **not** added to the Team or agent run history indexes (they appear under their Org); readers that walk
  `agents/` and `agent_teams/` skip a run whose file has `containedIn` from top-level lists and attribute it to its Org
  (design R-5).

## 9. Conversion of a released Org (field by field)

| Released (Org tree v1) | Target |
| --- | --- |
| `subjectKind`, `createdAt`, `archivedAt`, `applicationBinding` | container, unchanged |
| `rootOrg.address/orgDefinitionId/orgDefinitionName/orgRunId/defaultLaunchConfiguration` | container `rootOrg`, unchanged |
| Any `launchConfiguration` / `defaultLaunchConfiguration` key outside the current launch shape (`runtimeKind`, `llmModelIdentifier`, `llmConfig`, `autoExecuteTools`, `workspaceRootPath`), e.g. released `skillAccessMode` (removed by `remove-global-skill-discovery-mode`, which never visited Org trees) | dropped (the current reader ignores it; the writer writes the exact current shape). Validated: the current Team tree reader drops `skillAccessMode` (contract-validation.md V-2) |
| `rootOrg.collaborators` (released residue, no current reader) | dropped from the container (inert; not read since `collaborators-to-delegated-runs-v1`) |
| `rootOrg.members[]` Team node `{address, teamDefinitionId, teamRunId, coordinatorAddress, defaultLaunchConfiguration, role, description, members[]}` | container unit `{address, kind:"agent_team", runId: teamRunId, definitionId: teamDefinitionId}` + Team file (§3): `applicationBinding` per §11, `rootTeam.teamRunId`, `teamDefinitionId`, `teamDefinitionName` (released Team nodes have no name: read through the migration runner's existing definition-names port, guideline §4 "Sealed migration area"; a definition that no longer exists → its definition ID), `defaultLaunchConfiguration` (Team node's), `coordinatorAddress` and each member's `address` with the Team address stripped, members' `agentDefinitionId/agentRunId/platformAgentRunId/launchConfiguration/role/description` unchanged; `createdAt`/`archivedAt` from the Org |
| `rootOrg.members[]` agent node `{address, agentDefinitionId, agentRunId, platformAgentRunId, launchConfiguration, role, description}` | container unit `{kind:"agent"}` + `run_metadata.json` (§4): `runId`, `agentDefinitionId`, `platformAgentRunId`, `address`, launch fields from `launchConfiguration`, `memoryDir` at its new place, `containedIn`, `applicationExecutionContext` per §11 |
| `handoffs[]` | wholly inside one Team (`from` and `to` under the Team's address) → that Team file, team space; every other → container `handoffs` |
| Org log line (keys `messageId, senderAgentRunId, receiverAgentRunId, content, messageType, referenceFiles, createdAt`, optional `counterpart`) | both parties in one Team → that Team's log, unchanged; parties in two units → each unit's log, with `counterpart` = the other's Org address, `nodeId: null`; one party outside the Org (with or without `counterpart`, classified by membership as `org-log-split.ts` does) → the member's unit log, unchanged (a line with a run the member delegated is a related line without `counterpart`, kept as is) |
| Task entries / `delegatedFrom` naming the Org | §6 |
| `agent_org_task_delegation_records.json` | left in place as inert residue: no current reader (only migrations read it), and nothing deletes history (design Removal Plan aligned, SR-012) |
| Member folders | renamed (§1) |

## 11. Application-owned Orgs (one rule for both unit kinds, SR-012)

- An Org started by an application has `applicationBinding` on its container. Each of its units carries the same
  ownership, written once at creation (or by the conversion) and never edited: a Team unit's `applicationBinding` is the
  container's; an agent unit's `applicationExecutionContext` is the one today's Org run gives that agent (built from the
  binding as `agent-org-execution-scope-builder.ts:143-146` does). An Org outside applications: `applicationBinding: null`
  on the Team unit, no `applicationExecutionContext` on the agent unit.
- Result, identical for both kinds and for the container: an application-owned unit is not followed (Out of Scope:
  application-bound runs) and its Settings are blocked, as an application-owned Org is today
  (`agent-org-run-manager.ts:244`).

## 10. Use cases against the files

| Use case | Files read / written | Answered by |
| --- | --- | --- |
| UC-001 start an Org | write container (§2), each Team file (§3), each agent file (§4) | `units` lists every unit; each unit's `containedIn` names the container |
| UC-001 restore after restart | read container, then a unit file when the unit is needed | `units` → run ID → unit file; `containedIn` → the unit's container port |
| UC-003 message by address | container `units`; Team file members | `/software_engineering_team/x` → Team unit `set_team_1`, member `/x`; `/concierge` → agent unit `concierge_1` |
| UC-003 log | both unit logs (§5) | same `messageId`, `counterpart` names the other side |
| UC-003 `get_handoff_rules` of `/software_engineering_team/solution_designer` | Team file `handoffs` (shown with the Team prefix) + container `handoffs` with `from` = that Org address | one Org address space |
| UC-002 Team gains/loses a member | Team file (autobyteus-22: `members`, `formerMembers`, `leaving`) | unchanged Team mechanism |
| UC-002 an Org rule naming a removed member | container `handoffs` + Team file `members` | the rule is left out while the member is absent (derived, not stored) |
| UC-006 Org mounts/unmounts a Team or agent | container `units` / `formerUnits`; new unit file | unit moves between lists; run ID kept |
| UC-005 peer Team copy changes | delegating node's Task entry `members` | updated by the peer notice or the next contact |
| UC-004 conversion retry | per unit: target folder + target file with `containedIn` | recognized as converted; the rest continues |
| Org view, rows, history | container + unit files | composed; contained runs under their Org (§8) |
| Context file from the Org view | container `units` + unit Team file members | `{orgRunId, agentRunId}` → unit folder (§7) |
| Delegation from an Org member | Task entry, child `delegatedFrom` | delegating run = the unit run (§6) |
| A run delegated by an Org member reaches the Org's agents by Org address (design R-8, SR-014) | child `delegatedFrom` → unit run → its `containedIn` → container `units` + unit files | the container's placements at Org addresses; the message is **related** (the Task rule extended through the delegation chain): stored as a related line (no `counterpart`), shown in every view whose tree holds both runs |
| Files from another node for an Org unit's agent (autobyteus-587; design SR-016) | the receiving agent's own memory folder: a Team unit member's (§3) or an agent unit's (§4) | the unit's root plans them as any Team or standalone root; nothing in the container |
| A unit agent's lost runtime session is renewed (autobyteus-599; design SR-016) | the unit agent's `work_journal/` in its own memory folder (moved with the folder by the conversion, §9) | the unit's root and its run's composition, as for any Team or agent run; nothing in the container |

## 12. Validation

See `contract-validation.md` (examples of §2–§4 run through the current/in-progress validators; use cases walked
against these files).
