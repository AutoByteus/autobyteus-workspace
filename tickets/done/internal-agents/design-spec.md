# Design Spec — Internal Agents (autobyteus-308)

## Solution And Approval Basis

- Current solution revision ID: `SR-001`
- Approved requirements baseline: `requirements-doc.md` SR-001, approved by the Solution Designer within the direction (user informed, 2026-10-25).
- Behavior-defining supplements: none.
- Design status: `Ready`
- Canonical investigation-notes path: `tickets/in-progress/internal-agents/investigation-notes.md`
- Authorities read (2026-10-24/25): `references/architecture-design.md`, `references/design-principles.md`, `DESIGN.md`, `docs/design-cases.md`, `GLOSSARY.md`.
- Project design-principle conflicts or discrepancies: none.

## Current-State Read

- `agent-config.json` is read by `normalizeAgentConfigRecord` and written by `buildAgentConfigRecord` / `mergeAgentConfigRecord` (C-01); every definition source (shared, team-local, application-owned) goes through it.
- The user-facing agent list has one owner, `AgentDefinitionService.getVisibleAgentDefinitions` (C-02): GraphQL `agentDefinitions` (Agents page, all web pickers via `agentDefinitionStore`, mobile) and the application resource resolver.
- Agent-facing eligibility has one owner, `CollaboratorCandidatePolicy.isEligibleAgent` (C-03): `listEligible` (→ `list_available_agents`, peer `RemoteCatalogLister`), `listCandidates` (@ options), `requireEligible`/`requireAdmissible` (@ by ID), and the catalog address map (→ `delegate_task`, peer delegation). Built-in agents are already excluded there.
- Run browsing: `AgentRunHistoryService.listRunHistory` (C-04, feeding workspace run history) and `AgentMemoryExplorerService.listAgentsWithMemory` / `listAgentRunsWithMemory` (C-05). `list_agent_definitions` (C-06) lists all definitions.
- Settings: `AUTOBYTEUS_*` keys registered in `server-settings-service.ts`, read through small config modules on each use (C-07).
- No design problem; the feature extends these owners.

## Task Size And Architectural Risk (Mandatory)

- Task size: `Medium`
- Size rationale: about 14 source files within existing owners: agent-definition (config, model, service, GraphQL field), one new config module + visibility owner, collaboration policy (one rule), run history and memory explorer (one filter each), the `list_agent_definitions` tool, settings registration, web (toggle card, badge, refresh), i18n, docs.
- Architectural risk: `Low`
- Risk rationale: no new subsystem or ownership change; one additive optional attribute and one setting (no migration); one additive GraphQL field; the eligibility change narrows an existing rule in its existing owner, and peers derive from it unchanged.
- Escalation trigger: any surface found that lists agents or runs outside these owners; any need to hide internal agents from direct ID access.

## Architecture Investigation Evidence

| Source | Observation | Decision Supported |
| --- | --- | --- |
| C-01 | Config read/written in one module; merge keeps unknown keys | Model `internal` there |
| C-02 | One visible list | One filter |
| C-03 | One eligibility rule; peer catalog and delegation derive from it | One rule; no peer-specific work |
| C-04, C-05 | Two run-browsing owners | One filter each |
| C-06 | Agent tool lists all definitions | Same rule |
| C-07, C-08 | Settings and Basics-card patterns | New config module + card |

## Intended Change

Add `internal` to agent definitions and one owner, `InternalAgentVisibility`, that answers "is this definition hidden now?" (internal and the setting off). The visible list, the collaboration eligibility rule, run history, the Memory page and `list_agent_definitions` ask it. A Basics card toggles the setting; the Agents page badges internal agents when shown.

## Change Scope (Mandatory)

- In scope: UC-001…UC-003. Areas: agent-definition (config record, domain model, GraphQL `internal` field, visible list), `agent-definition/services/internal-agent-visibility.ts` (new), `config/show-internal-agents-setting.ts` (new), `server-settings-service.ts` (register), `collaborator-candidate-policy.ts` (rule), `agent-run-history-service.ts`, `agent-memory-explorer-service.ts`, `list-agent-definitions.ts`; web: `ShowInternalAgentsCard.vue` (new) in `ServerSettingsBasicsPanel.vue`, agent card badge, `agentDefinitionStore` / run history refresh after the toggle, GraphQL query field, i18n en + zh-CN; docs (agent definition module doc, settings doc, GLOSSARY "internal agent").
- Derived consumers: `getVisibleAgentDefinitions` → GraphQL `agentDefinitions` → every web picker and the mobile apps; application resource resolver. `isEligibleAgent` → `list_available_agents`, @ candidates and by-ID mentions, catalog address map → `delegate_task`, `RemoteCatalogLister` and peer delegation. `listRunHistory` → `listWorkspaceRunHistory` / `getWorkspaceRunHistory`. Decision for each: they inherit the rule; no own filter.
- Deliberately left alone: lookups by ID (`getAgentDefinitionById`, run projection, `get_agent_definition`), token-usage statistics, agent package file management, team definitions (internal teams out of scope), the built-in exclusion.
- Follow-ups: none.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior | Requirement / AC | Target path |
| --- | --- | --- |
| BEH-001 | REQ-001, 003, 007; AC-001, 005..007 | DS-001 |
| BEH-002 | REQ-004, 008; AC-002 | DS-002 |
| BEH-003 | REQ-005; AC-003 | DS-003 |
| BEH-004 | REQ-006; AC-004 | DS-003 (tool) |
| BEH-005 | REQ-002; AC-005 | DS-004 |

## Relevant Supplemental Task Artifacts

None.

## Task Design Health Assessment (Mandatory)

- Change posture: `Feature`
- Current design issue found: `No`
- Structural triggers: *Repeated coordination* — "hidden now?" would be computed in five places → one owner `InternalAgentVisibility`. *Several kinds or forms* — agents and peers, lists and by-ID mentions, delegation: all traced to `isEligibleAgent` (C-03). *Derived data* — consumers listed in Change Scope.
- Root cause classification: `No Design Issue Found`
- Refactor needed now: `No`
- Evidence: C-01…C-08.

## Terminology

- **Internal agent** (GLOSSARY): an agent definition marked `"internal": true`: the system's own helper. Hidden from browsing, picking and delegation while "Show internal agents" is off. Not the same as a built-in agent (shipped by AutoByteus; may or may not be internal).

## Legacy Removal Policy (Mandatory)

- Obsolete paths: none. Compatibility wrappers kept: `None`.

## Persisted Data / State Transition Decision (Mandatory)

- `agent-config.json` optional `internal` (absent → normal); new setting (absent → off). Decision: `Directly Usable — No Migration` (an optional field with a truthful absent meaning).

## Data-Flow Spine Inventory

| Spine | Scope | Start | End | Owner |
| --- | --- | --- | --- | --- |
| DS-001 | Primary | GraphQL `agentDefinitions` / app resource resolver | list without hidden agents | `AgentDefinitionService.getVisibleAgentDefinitions` |
| DS-002 | Primary | `listWorkspaceRunHistory`; Memory page queries | rows/agents without hidden ones | `AgentRunHistoryService`, `AgentMemoryExplorerService` |
| DS-003 | Primary | `list_available_agents`, @, `delegate_task`, peer catalog, `list_agent_definitions` | hidden agents not offered/reachable | `CollaboratorCandidatePolicy.isEligibleAgent`; the tool |
| DS-004 | Primary | Basics toggle | setting saved; lists refreshed | server settings; web card |

## Primary Execution Spine(s)

- DS-001: `GraphQL agentDefinitions → AgentDefinitionService.getVisibleAgentDefinitions → [all definitions] → InternalAgentVisibility.isHidden → visible list`
- DS-003: `delegate_task(address) → catalogDefinitionAt → CollaboratorCandidatePolicy.catalogView → isEligibleAgent (→ InternalAgentVisibility.isHidden) → address map → "not an available agent"`

## Spine Narratives (Mandatory)

| Spine | Narrative |
| --- | --- |
| DS-001 | The visible list drops definitions the visibility owner calls hidden; every picker and the mobile apps follow. |
| DS-002 | Run history drops rows whose `agentDefinitionId` is a hidden definition (one `hiddenDefinitionIds()` set per call); the Memory page does the same for its agent list and the per-agent run list. |
| DS-003 | `isEligibleAgent` adds `!visibility.isHidden(definition)`; listing, @, by-ID mentions, the address map and therefore delegation and the peer catalog follow. `list_agent_definitions` filters with the same owner. |
| DS-004 | The card saves `AUTOBYTEUS_SHOW_INTERNAL_AGENTS`; the server reads it on each call; the web refetches agent definitions and run history after saving. |

## Spine Actors / Main-Line Nodes

`AgentDefinitionService`, `InternalAgentVisibility`, `CollaboratorCandidatePolicy`, `AgentRunHistoryService`, `AgentMemoryExplorerService`, the `list_agent_definitions` tool, the settings card.

## Ownership Map

- `InternalAgentVisibility` (`agent-definition/services/internal-agent-visibility.ts`): the one rule. `showInternalAgents(): boolean` (reads the setting through `config/show-internal-agents-setting.ts`), `isHidden(definition): boolean` (`definition.internal === true && !showInternalAgents()`), `hiddenDefinitionIds(): Promise<ReadonlySet<string>>` (from all definitions, for row filters).
- Consumers only ask it; none reads the setting or the attribute themselves.

## Thin Entry Facades / Public Wrappers (If Applicable)

N/A.

## Removal / Decommission Plan (Mandatory)

| Item | Why | Replaced By |
| --- | --- | --- |
| None | — | — |

## Return Or Event Spine(s) (If Applicable)

N/A.

## Bounded Local / Internal Spines (If Applicable)

N/A.

## Off-Spine Concerns Around The Spine

| Concern | Serves | Responsibility |
| --- | --- | --- |
| `config/show-internal-agents-setting.ts` | `InternalAgentVisibility` | Key, `true`/`false` parsing (anything else = off), `normalizeForPersistence` |

## Ownership Boundaries

- `InternalAgentVisibility` is the only reader of the setting; `agent-definition-config.ts` the only reader/writer of the attribute.

## Boundary Encapsulation Map

| Boundary | Encapsulates | Callers | Forbidden Bypass |
| --- | --- | --- | --- |
| `InternalAgentVisibility` | setting read, attribute check | the five consumers | A consumer reading `AUTOBYTEUS_SHOW_INTERNAL_AGENTS` or `definition.internal` itself |

## Dependency Rules

- Consumers → `agent-definition/services/internal-agent-visibility.ts` → `config/show-internal-agents-setting.ts`, `AgentDefinitionService` (for `hiddenDefinitionIds`). The collaboration policy gets it injected (through `createCollaboratorDefinitionCatalog` wiring), not by a process lookup inside the rule.

## Interface Boundary Mapping

| Interface | Subject | Notes |
| --- | --- | --- |
| `AgentDefinition.internal: boolean` (domain); `AgentConfigRecord.internal?: boolean` (file) | definition | Written only when `true` |
| GraphQL `AgentDefinition.internal: Boolean!` | definition | For the badge |
| `InternalAgentVisibility.isHidden(definition)`, `hiddenDefinitionIds()`, `showInternalAgents()` | rule | — |

## Interface Boundary Check

All singular, explicit identity; no generic selectors.

## Main Domain Subject Naming Check

| Subject | Name | Note |
| --- | --- | --- |
| Internal agent | `internal`, `InternalAgentVisibility`, `AUTOBYTEUS_SHOW_INTERNAL_AGENTS` | GLOSSARY entry; distinct from "built-in" |

## Existing Capability / Subsystem Reuse Check

| Need | Existing | Decision |
| --- | --- | --- |
| Setting | server settings + config module pattern | Reuse |
| Lists, eligibility, history | their owners | Extend |
| Rule | — | Create New (`InternalAgentVisibility`) |

## Subsystem / Capability-Area Allocation

`agent-definition` owns the attribute and the rule; consumers stay in their subsystems.

## Draft File Responsibility Mapping

Folded into the final mapping.

## Reusable Owned Structures Check

`InternalAgentVisibility` is the one shared rule; no other shared structure.

## Shared Structure / Data Model Tightness Check

`internal` has one meaning (system helper); absent = false.

## Final File Responsibility Mapping

| File | Kind | Concern |
| --- | --- | --- |
| `server/src/agent-definition/domain/models.ts` | Modify | `internal: boolean` on the domain definition |
| `server/src/agent-definition/providers/agent-definition-config.ts` | Modify | Read (`internal === true`), build (write only when true) |
| `server/src/agent-definition/providers/agent-definition-node-reader.ts`, `application-owned-agent-source.ts` (and any other builder of the domain object from config) | Modify | Carry `internal` |
| `server/src/agent-definition/services/internal-agent-visibility.ts` | New | The rule |
| `server/src/agent-definition/services/agent-definition-service.ts` | Modify | `getVisibleAgentDefinitions` filters hidden |
| `server/src/config/show-internal-agents-setting.ts` | New | Key, parse, persistence normalize |
| `server/src/services/server-settings-service.ts` | Modify | Register with description |
| `server/src/agent-collaboration/collaborators/collaborator-candidate-policy.ts`, `collaborator-definition-catalog.ts` | Modify | `isEligibleAgent` asks the rule (injected) |
| `server/src/run-history/services/agent-run-history-service.ts` | Modify | Drop hidden definitions' rows |
| `server/src/agent-memory/services/agent-memory-explorer-service.ts` | Modify | Drop hidden definitions in both lists |
| `server/src/agent-tools/agent-management/list-agent-definitions.ts` | Modify | Drop hidden |
| `server/src/api/graphql/types/agent-definition.ts` | Modify | `internal` field |
| `web/components/settings/ShowInternalAgentsCard.vue` (new), `ServerSettingsBasicsPanel.vue` | New / Modify | Toggle; refresh agent definitions and run history after save |
| `web/graphql/queries/agentDefinitionQueries.ts`, agent card component | Modify | Field; "Internal" badge |
| `web/localization/messages/{en,zh-CN}/…` | Modify | Texts |
| Docs: agent definition module doc, settings doc, `GLOSSARY.md` | Modify | — |

## Applied Patterns (If Any)

None beyond the existing settings pattern.

## Target Subsystem / Folder / File Mapping

As above.

## Folder Boundary Check

All files stay in their owners' folders.

## Concrete Examples / Shape Guidance (Mandatory When Needed)

```json
// agents/model-router/agent-config.json (autobyteus-32 will ship this)
{ "internal": true, "toolNames": ["list_available_agent_runtimes"], … }
```

```ts
// collaborator-candidate-policy.ts
private isEligibleAgent(definition) {
  return hasId(definition) && definition.ownershipScope === "shared"
    && !EXCLUDED_AGENT_DEFINITION_IDS.has(definition.id) && !this.visibility.isHidden(definition);
}
```

Avoided: each consumer reading `appConfigProvider.config.get("AUTOBYTEUS_SHOW_INTERNAL_AGENTS")` and `definition.internal` itself.

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Decision |
| --- | --- |
| Registry-only classification of internal built-in agents (earlier analysis) | Rejected: the Task asks for a definition attribute any agent can carry |

## Derived Layering (If Useful)

N/A.

## Change / Refactor Sequence

1. Attribute (config, domain, readers), GraphQL field; save keeps it (test).
2. Setting module + registration; `InternalAgentVisibility`.
3. Consumers: visible list, policy (injected), run history, Memory explorer, `list_agent_definitions`.
4. Web: card, refresh, badge, i18n.
5. Docs, GLOSSARY.

## Key Tradeoffs

- Read the setting on every call (cheap, live) vs. caching (needs invalidation).
- Generic refusal text vs. "internal" text (does not reveal hidden agents).

## Risks

- RSK-001 a missed browsing surface → API/E2E walks the Agents page, pickers (new run, team, Org, featured, application), history, Memory page, mobile API.

## Guidance For Implementation

- Tests with synthesized definitions only (one internal, one normal), for each consumer with the setting off and on; the peer catalog through `RemoteCatalogLister`; the save round-trip keeping `internal`.
- Reproduction to start from: none (new behavior).
