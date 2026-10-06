# Docs Sync Report — delegated-row-clean-style

## Scope

- Ticket: `delegated-row-clean-style` (SR-001, IR-001, API-REV-001). `task_size=Small`, `architectural_risk=Low`, direct low-risk route. The independent review gates are `Not Applicable`.
- Trigger: API/E2E validation Pass from `/api_e2e_engineer` (2026-10-06).
- Bootstrap base reference: `origin/personal@23d6c877ada66058453f3e466dd6c7d302972610`.
- Integrated base reference used for docs sync: `origin/personal@d7584b94f025905b0be2593b67df252c77dc14ae`, merged into the ticket branch as `fbe0154a3`.
- Post-integration verification reference: `delivery-evidence/vitest-history-integrated.log` (`pnpm -C autobyteus-web test:nuxt components/workspace/history --run`, 11 files, 154/154 pass).

## Why Docs Were Updated

- Summary: three long-lived web docs still described the removed delegated-row treatment: a dashed indigo row box and tint, plus a bordered bolt icon. The implementation replaced it with the ordinary tree-row style.
- Why this should live in long-lived project docs: these docs are the canonical description of the Workspaces tree row grammar. Leaving the old wording would steer future work back to the boxed treatment.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `autobyteus-web/docs/settings.md` | Its Workspaces tree section describes the transient row treatment | Updated | Replaced the dashed/bordered-bolt sentence |
| `autobyteus-web/docs/agent_execution_architecture.md` | Same paragraph as `settings.md` | Updated | Same replacement |
| `autobyteus-web/docs/agent_teams.md` | "Workspace History Sidebar Task Peers" said task rows keep a "distinct dashed treatment" | Updated | Now says the ordinary tree-row style |
| `autobyteus-web/docs/agent_orgs.md` | Org delegated rows | No change | Only lists `utils/agentOrgHistoryRows.ts` and has no styling claim |
| `autobyteus-web/docs/*.md` selected-row and focus-tooltip text (`settings.md` ~L539, `agent_execution_architecture.md` ~L531) | Selected treatment is shared with delegated rows | No change | Still accurate: 2px indigo inset, `#eef2ff`, zero radius |
| `autobyteus-server-ts/docs/modules/agent_orgs.md`, `agent_team_execution.md` | They mention delegated rows | No change | They cover server behavior only, with no styling |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-web/docs/settings.md` | Behavior/visual correction | Delegated rows under Agent, Team and Org roots use the ordinary tree-row style: no border or tint at rest, `gray-50` hover, 2px `indigo-500` `:focus-visible` ring, and member-row selection. A task-Team row is marked only by an unboxed 16px `slate-500` bolt and a semibold name. | Matches the implemented REQ-001 |
| `autobyteus-web/docs/agent_execution_architecture.md` | Behavior/visual correction | Same as above | Same |
| `autobyteus-web/docs/agent_teams.md` | Behavior/visual correction | "distinct dashed treatment" → "ordinary tree-row style (no dashed box or tint)" | Same |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Delegated-row visual grammar | Delegated rows are distinguished by their icon (Agent: status dot and initials; Team: slate bolt and semibold name), not by a row box | `requirements-doc.md`, `design-spec.md`, Product `ui-ux-spec.md` | `settings.md`, `agent_execution_architecture.md`, `agent_teams.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| Dashed indigo row border and `bg-indigo-50/40` tint on transient rows | Ordinary row (transparent at rest, `gray-50` hover) | The three docs above |
| Bordered/dashed bolt box (task Team), and the indigo user-group icon on Org task-Team rows | Unboxed 16px `slate-500` bolt and a semibold name | The three docs above |
| `.transient-execution-row > .hierarchy-branches { inset: -1px }` border offset | Not needed now that the row has no border; the branch box equals the row box (E2E-verified) | Code only (internal CSS detail) |

## Delivery Continuation

- Result: `Pass`
- Next delivery action: handoff summary and release notes, then wait for explicit user verification.
- Notes: the docs edits were made just before `origin/personal` advanced. They were stashed, the base was merged and they were restored, so they apply to the integrated state. The merged commit touches only `tickets/done/create-or-update-project-tool/**`, so there is no overlap with these docs.
