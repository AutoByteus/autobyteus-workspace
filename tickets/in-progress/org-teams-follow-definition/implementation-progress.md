# Implementation Progress (working notes, implementation engineer)

Working notes for the eight slices of design SR-010 (ARCH-REV-005). Authoritative results go to
`implementation-handoff.md` at the end; this file tracks the plan, decisions and status while the work is in progress.

## Approach

- Slices 1-3 build the container next to the existing Org root, under `agent-org-execution/container/`, selected by the
  stored file's shape (`rootOrg.units` = container; `rootOrg.members` = released Org tree v1, still served by the old
  root until slice 4). New Orgs are created as containers once the container covers start, messages, view, rows and
  readers (end of slice 3). Slice 4 removes the hosting root; slice 5 converts stored Orgs.
- Each commit: server typecheck passes at the baseline, the touched suites pass.

## Slices

| # | Slice | Status | Commit |
| --- | --- | --- | --- |
| 1 | `containedIn` on Team and agent runs; container file; `AgentOrgContainer` creates unit runs; Stop/reopen | part 1 done (building blocks; wiring with slice 3) | see git log |
| 2 | Container address resolution (step 2 via `OrgContainerPort`), `same_container` admission in `CrossRunMessageDelivery`, `ContainedTeamAddressSpace` (R-1''/R-1'''), Org rules merged into unit rules, delegation origin = unit run | | |
| 3 | `OrgViewComposition` (R-3''), command routing, run-tree rows, history/memory readers, the three Org REST edges (R-7); switch creation to containers | | |
| 4 | Remove the hosting machinery (Removal Plan, R-5 H rows) | | |
| 5 | Migration `20261122_agent_org_units_own_runs_v1` + follow-ups + §9 fixtures + registry classification | | |
| 6 | Org follow (DS-006) | | |
| 7 | FU-003 peer members notice + reconcile (DS-007) | | |
| 8 | Docs (collaboration model CM-3/§3/§5, agent_orgs, agent_memory, glossary), release notes | | |

## Decisions taken during implementation

- Slice 1 (part 1): `containedIn` is a shared domain type (`agent-collaboration/domain/contained-in.ts`) with one schema
  parser; the Team tree refuses `containedIn` together with `delegatedFrom`/`copiedFrom` (contract §3); the agent metadata
  reader refuses `containedIn.address` ≠ `address` and a contained run that is also delegated (contract §4).
- The container file is a new type and schema (`AgentOrgContainerFile`, `rootOrg.units`/`formerUnits`) on the same path as
  the released Org tree; `isAgentOrgContainerPayload` tells the two apart until slice 4 removes the old one.
- Units are created through their own run services (`AgentOrgUnitRuns` port): Team units by `createTeamRun` (team space,
  `containedIn`, the Org's `applicationBinding`), agent units by `prepareAgentRun` (Org address, `containedIn`, the Org's
  binding as `applicationBinding` → the agent's application context, contract §11). Run IDs come from those services.
- Startup's empty-never-started cleanup keeps contained agent runs (an Org agent unit stays prepared until its first work).

## Open questions

(none yet)
