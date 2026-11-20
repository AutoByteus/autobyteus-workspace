# Design Spec — autobyteus-526 round 2

- Revision `SR-001`; requirements approved by the user (2026-11-20); design `Ready`; user approval of design: `Not required`
- Authorities: `references/architecture-design.md`, `references/design-principles.md`, `/DESIGN.md`

## Task Size And Architectural Risk

- Task size: `Small` — removal of two unused components with their tests, keys and fixture part; two probes run and, if needed, their test setup aligned; one test confirmed
- Architectural risk: `Low` — no product behavior, contract, store or route change
- Escalation trigger: a remaining FU-008 failure caused by product code (not the test setup), or FU-001 failing again: report back as a Design Impact

## Intended Change And Removal Plan (Principles 7, 8)

| Item | Why | Notes |
| --- | --- | --- |
| `autobyteus-web/components/workspace/running/RunningTeamGroup.vue`, `RunningTeamRow.vue`, `__tests__/RunningTeamGroup.spec.ts`, `__tests__/RunningTeamRow.spec.ts` | Dead: mounted by no page; only their specs and one test fixture | keep `TeamMemberRow.vue` (used by `TeamTokenUsageSummary`) |
| 8 keys `workspace.components.workspace.running.RunningTeam*` in `localization/messages/{en,zh-CN}/workspace.generated.ts` | Dead with the components | follow the repo's generated-catalog convention (regenerate if a generator owns the file) |
| The `RunningTeamGroup` block of `tests/e2e/fixtures/team-activity-presentation.page.vue` and the probe steps that assert it | tests follow the code (DESIGN.md rule 11) | the probe keeps its `WorkspaceHistoryWorkspaceSection` cases; adjust `typecheck-baseline.json` if the fixture's entry changes |

FU-008: run `pnpm -C autobyteus-web test:e2e:background-contention` and `test:e2e:agent-org-draft-retention` on the base first; change only the probes' fixtures/harness when they fail for setup reasons (the 448 FU-008 row: fixture GraphQL operations and sockets the app now calls). FU-001: run the watcher test 20 times.

## Persisted Data

`Not Affected`.

## Guidance

Record each check's command and log under `evidence/`. Each round ends with cleanup and a record copy (founder's rule).
