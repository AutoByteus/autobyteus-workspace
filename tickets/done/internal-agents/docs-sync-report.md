# Docs Sync Report — autobyteus-308 (internal agents)

## Scope

- Ticket: `internal-agents` (Project Task autobyteus-308, part of autobyteus-32)
- Trigger: API/E2E API-REV-001 Pass on the direct route (Medium / Low)
- Bootstrap base reference: `origin/personal` @ `651071758f`
- Integrated base reference used for docs sync: `origin/personal` @ `651071758f` (not advanced; the branch was already current)
- Post-integration verification reference: `evidence/delivery/DEL-01-internal-agents-e2e-rerun.log` (5/5)

## Why Docs Were Updated

- Summary: the implementation documented the attribute, the setting, the one visibility rule and its surfaces (`agent_definition.md`), the Basics card (`settings.md`) and the vocabulary (`GLOSSARY.md`). Delivery checked them against the code and closed these gaps:
  - `run_history.md`, `agent_memory.md`, `remote_collaboration.md` and `agent_communication.md` list what their lists or policies leave out, but did not mention hidden internal agents.
  - The surface table in `agent_definition.md` named `list_agent_definitions` without saying that no agent can reach that tool today (FU-001).
  - Neither doc named the new tests.
- Why this should live in long-lived project docs: the rule decides what users, agents and peer nodes can see. The Model Router (autobyteus-32) builds on it.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/agent_definition.md` | Owns the attribute, the setting and the rule | Updated | Implementation's section matches `internal-agent-visibility.ts`, `show-internal-agents-setting.ts` and the owners in its table. Delivery added the FU-001 note to the `list_agent_definitions` row and a Tests paragraph |
| `autobyteus-server-ts/docs/modules/run_history.md` | "Default History Visibility" lists exclusions | Updated | `listRunHistory` now skips hidden definitions' rows (`agent-run-history-service.ts`, `archivedAt \|\| hidden`) |
| `autobyteus-server-ts/docs/modules/agent_memory.md` | "Independent Agents" grouping rules | Updated | `buildGroups` skips hidden definitions, so their runs are not moved to `UNATTRIBUTED` |
| `autobyteus-web/docs/settings.md` | Owns the Basics card | Updated | Implementation's section matches `ShowInternalAgentsCard.vue`. Delivery added the tests |
| `GLOSSARY.md` | Internal vs built-in agent | No change | Accurate |
| `autobyteus-web/docs/memory.md`, `workspaces.md` | Mention of the same queries | No change | They describe the query contracts and point to the server docs; no exclusion lists to update |
| `autobyteus-server-ts/docs/modules/remote_collaboration.md` | Lists what peers can start | Updated | The list of exclusions ("never built-ins, Agent Orgs, team-local or application-owned") now adds internal agents while hidden |
| `autobyteus-server-ts/docs/modules/agent_communication.md` | `requireEligible` and `@` candidate exclusions | Updated | Both lists ("not a built-in", "minus built-ins") now add internal agents while hidden |
| `autobyteus-server-ts/docs/modules/agent_tools.md` | `list_available_agents` and `delegate_task` | No change | It points to `CollaboratorCandidatePolicy.listEligible` without listing exclusions |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/run_history.md` | Behavior | The default history also leaves out hidden internal agents' standalone runs, active or not; they stay recorded and open by run ID | The exclusion list was incomplete |
| `autobyteus-server-ts/docs/modules/agent_memory.md` | Behavior | Hidden internal agents' runs have no group and are not moved to `UNATTRIBUTED` | The grouping rules were incomplete |
| `autobyteus-server-ts/docs/modules/agent_definition.md` | Accuracy, tests | The `list_agent_definitions` row says the tool is registered on no node today (FU-001); a Tests paragraph names the unit, E2E and RC-38 coverage | Truthful surface table; the tests can be found |
| `autobyteus-server-ts/docs/modules/remote_collaboration.md`, `agent_communication.md` | Behavior | Three exclusion lists for peers, `@` mentions and `@` candidates include internal agents while hidden | The lists were incomplete |
| `autobyteus-web/docs/settings.md` | Tests | Component specs and `tests/e2e/internal-agents-probe.mjs` (`pnpm test:e2e:internal-agents`) | Same pattern as other settings sections |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| One visibility rule | `InternalAgentVisibility` is asked by every browsing owner; none reads the setting or attribute itself | design spec | `agent_definition.md` (implementation) |
| Hidden is not protected | By ID always works; refusal text reveals nothing | requirements DEC-002, REQ-008 | `agent_definition.md` (implementation) |
| History and Memory exclusions | Where runs disappear and where they don't | design spec, API-03 | `run_history.md`, `agent_memory.md` (delivery) |

## Removed / Replaced Components Recorded

None. The change only adds an attribute, a setting and a filter.

## Delivery Continuation

- Result: `Pass`
- Next delivery action: handoff summary, verification record, archive and finalization
- Notes: delivery found no new follow-up. FU-001 stays as API/E2E recorded it.
