# Design Spec

## Solution And Approval Basis

- Current solution revision ID: `SR-001`
- Approved requirements baseline: `requirements-doc.md` at SR-001, approved by the Solution Designer within the direction (user informed, 2026-10-24)
- Behavior-defining supplements: none
- Design status: `Ready`
- Canonical investigation-notes path: `/Users/normy/autobyteus_org/autobyteus-worktrees/settings-delegated-row-display-name/tickets/in-progress/settings-delegated-row-display-name/investigation-notes.md`
- Authorities read (2026-10-24): `references/architecture-design.md`, `references/design-principles.md`, `DESIGN.md` (root), `TESTING.md`
- Project design-principle conflicts or discrepancies: none

## Current-State Read

`delegatedLaunchRows.ts` names every row with `nameAt` (the last address segment, line 72), for Team (`teamDelegatedLaunchNodes`) and Org/Agent (`collaborationDelegatedLaunchNodes`) roots. The Team sidebar and contexts use `readsAsDisplayName` to choose `memberDisplayName` or `memberAddressBasename`, written out in `teamExecutionTreeSelectors.ts:97-99` and `teamExecutionContextFactory.ts:67-70`. Org and Agent views use `memberDisplayName` for all (E-03).

## Task Size And Architectural Risk (Mandatory)

- Task size: `Small`
- Size rationale: three web source files (one extracted function, two call sites, the rows' builders), their specs, one docs sentence, one probe comment.
- Architectural risk: `Low`
- Risk rationale: presentation names only; no API, store or persistence change.
- Escalation trigger: if the look in the app shows another surface naming copies differently, return a Design Impact.

## Architecture Investigation Evidence

| Source | Path | Observation | Decision Supported | Uncertainty |
| --- | --- | --- | --- | --- |
| Code | E-01 | Basename for all rows | Pass the root's naming function | — |
| Code | E-02 | Team rule duplicated | Extract one owner | — |
| Code | E-03 | Org/Agent rule | `memberDisplayName` | — |
| SD-01 | evidence | Reproduced | Whole design | — |

## Intended Change

Extract the Team name rule into one exported function in `teamExecutionTreeSelectors.ts`. The Team navigation rows, the Team context factory and the Settings Team rows use it; Settings Org/Agent rows use `memberDisplayName`. Correct the DCR-001 header.

## Change Scope (Mandatory)

- In scope: UC-001, UC-002. `services/teamExecution/teamExecutionTreeSelectors.ts` (new export, `projectNavigationRows` uses it), `services/teamExecution/teamExecutionContextFactory.ts` (uses it), `utils/runSettings/delegatedLaunchRows.ts` (naming function per root; remove `nameAt`), `utils/runSettings/__tests__/delegatedLaunchRows.spec.ts` (names), `docs/settings.md` ("Delegated copies" → Row content: one sentence on the name), `tests/e2e/delegated-copy-own-file-cases.mjs` (header line 12, comment only).
- Derived consumers: none beyond the named call sites.
- Deliberately left alone: the Settings Members rows of configured members; `memberDisplayName` and `readsAsDisplayName` themselves; the Product design baseline (E-05).
- Follow-ups: none.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | REQ / AC | Trigger | Existing | Change / Preserved | Target Path |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | REQ-001, REQ-003, AC-001, AC-003, AC-005 | Team Settings | basename | Team rule | DS-001 |
| BEH-002 | User | REQ-002, AC-002, AC-005 | Org/Agent Settings | basename | `memberDisplayName` | DS-001 |
| BEH-003 | Operational | REQ-004, AC-004 | — | stale comment | corrected | — |

## Relevant Supplemental Task Artifacts

| Artifact | Purpose | Related IDs | Relationship | Status |
| --- | --- | --- | --- | --- |
| `evidence/repro-delegated-row-names.spec.ts` | Reproduction | AC-001, AC-002 | Basis of the regression test | Current |

## Task Design Health Assessment (Mandatory)

- Change posture: `Bug Fix`
- Current design issue found: `Yes`
- Structural triggers: *Derived data* fires. The Team name of an address is computed in two places today, and the fix would add a third (Principle 11), so extract one function. *Several kinds or forms*: three root kinds, each traced (E-02, E-03).
- Root cause classification: `Duplicated Policy Or Coordination` (the naming rule lives at each surface; Settings never got it).
- Refactor needed now: `Yes`, small: extract the Team rule and use it at its two existing sites and in Settings.
- Evidence: E-01…E-03, SD-01.
- Design response: as Intended Change.
- Intentional deferrals: none.

## Terminology

- *Display name*: `memberDisplayName(address)` (spaces for `_`/`-`); *basename*: last address segment.

## Legacy Removal Policy (Mandatory)

- Obsolete: `nameAt` in `delegatedLaunchRows.ts` (replaced). The two inline Team-rule expressions (replaced by the function). Compatibility wrappers kept: `None`.

## Persisted Data / State Transition Decision

- `Not Affected`.

## Data-Flow Spine Inventory

| Spine ID | Scope | Behavior | Start | End | Owner | Why |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-001, BEH-002 | `ExistingRunConfigEditor` `delegatedRows` | `RunMemberRow` name | `delegatedLaunchRows` builders (row facts) | The fixed path |

## Primary Execution Spine(s)

DS-001: `Settings draft (execution tree) -> ExistingRunConfigEditor.delegatedRows -> teamDelegatedLaunchNodes / collaborationDelegatedLaunchNodes -> builders (name via the root's naming function) -> runMemberTree.memberNode -> RunMemberRow`

## Spine Narratives (Mandatory)

| Spine ID | Narrative | Main Nodes | Owner | Off-Spine |
| --- | --- | --- | --- | --- |
| DS-001 | Settings builds copy rows from the tree; each row's name comes from its root's naming rule | editor, rows, member node | rows util | Team name rule (selectors) |

## Spine Actors / Main-Line Nodes

Editor, delegated rows util, member tree.

## Ownership Map

- `teamExecutionTreeSelectors.ts` owns how a Team run names the agent or Team at an address.
- `memberDisplayName.ts` owns the display-name text rule.
- `delegatedLaunchRows.ts` owns row facts; it asks the root's rule for names.

## Thin Entry Facades / Public Wrappers

N/A.

## Removal / Decommission Plan (Mandatory)

| Item | Why | Replaced By | Notes |
| --- | --- | --- | --- |
| `nameAt` (`delegatedLaunchRows.ts:72`) | Wrong rule | per-root naming function | — |
| Inline rule `teamExecutionTreeSelectors.ts:97-99` | Duplicate | exported function | — |
| Inline rule `teamExecutionContextFactory.ts:67-70` | Duplicate | exported function | Imports of `memberDisplayName`/`memberAddressBasename` there become unused if nothing else uses them: remove |

## Return Or Event Spine(s)

N/A.

## Bounded Local / Internal Spines

N/A.

## Off-Spine Concerns Around The Spine

| Concern | Spine | Serves | Responsibility | Why | Risk If Misplaced |
| --- | --- | --- | --- | --- | --- |
| Team name rule | DS-001 | rows, nav rows, contexts | One answer per address | Consistency | Drift |

## Ownership Boundaries

Settings depends on the Team selectors module for the rule. `utils` → `services/teamExecution/teamExecutionTreeSelectors` is an existing direction (`utils/teamCommunication/teamCommunicationPerspective.ts:2` imports `findContainingTaskExecutionRunId` from it).

## Boundary Encapsulation Map

| Boundary | Internal | Callers | Forbidden Bypass | If Too Thin |
| --- | --- | --- | --- | --- |
| Team name function | `readsAsDisplayName`, `memberDisplayName`, `memberAddressBasename` | nav rows, context factory, Settings rows | Re-composing the three at a call site | — |

## Dependency Rules

`utils/runSettings/delegatedLaunchRows.ts` → `services/teamExecution/teamExecutionTreeSelectors.ts` (pure function; existing direction, see Ownership Boundaries) and `utils/collaboration/memberDisplayName.ts`. Run `pnpm -C autobyteus-web guard:web-boundary` to confirm.

## Interface Boundary Mapping

| Interface | Subject | Responsibility | Identity | Notes |
| --- | --- | --- | --- | --- |
| `teamMemberName(tree, address)` (name chosen by implementation; must read as "the name a Team run shows for this address") | Team run address | Name | tree + address | Next to `readsAsDisplayName` |
| `builders(deps, control, rule, nameOf)` | rows | Name via `nameOf` | address | Internal |

## Interface Boundary Check

| Interface | Singular? | Explicit Identity? | Ambiguity | Action |
| --- | --- | --- | --- | --- |
| Team name function | Yes | Yes | Low | None |

## Main Domain Subject Naming Check

| Subject | Name | Natural? | Same Everywhere? | Drift | Action |
| --- | --- | --- | --- | --- | --- |
| Team name function | e.g. `teamMemberName` | Yes | Yes | Low | Doc comment cites F-03 / D-7 |

## Existing Capability / Subsystem Reuse Check

| Need | Existing | Decision | Why |
| --- | --- | --- | --- |
| Team rule | `readsAsDisplayName` | Extend (wrap with the name choice) | Owner |
| Org/Agent rule | `memberDisplayName` | Reuse | Owner |

## Subsystem / Capability-Area Allocation

| Subsystem | Owns | Spine | Owner Served | Decision |
| --- | --- | --- | --- | --- |
| `services/teamExecution` | Team rule | DS-001 | rows | Extend |
| `utils/runSettings` | rows | DS-001 | editor | Extend |

## Draft File Responsibility Mapping

As in the target mapping.

## Reusable Owned Structures Check

| Repeated Logic | Shared File | Owner | Why Shared | Redundant Removed? | Overlap Removed? | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Team name choice | `teamExecutionTreeSelectors.ts` | Team execution | 3 users | Yes | Yes | A generic naming hub for all roots |

## Shared Structure / Data Model Tightness Check

N/A.

## Final File Responsibility Mapping

As drafted.

## Applied Patterns

None.

## Target Subsystem / Folder / File Mapping

| Path | Kind | Owner | Responsibility | Why Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/services/teamExecution/teamExecutionTreeSelectors.ts` | Modify | Team selectors | Export the Team name function; `projectNavigationRows` uses it | Owner of `readsAsDisplayName` | — |
| `autobyteus-web/services/teamExecution/teamExecutionContextFactory.ts` | Modify | context factory | Use it | Remove duplicate | — |
| `autobyteus-web/utils/runSettings/delegatedLaunchRows.ts` | Modify | rows | `builders` takes `nameOf`; Team: the Team function with `tree`; Org/Agent: `memberDisplayName`; remove `nameAt` | Owner | — |
| `autobyteus-web/utils/runSettings/__tests__/delegatedLaunchRows.spec.ts` | Modify | tests | AC-001, AC-002 (catalog copy, catalog Team copy and members, configured copy) | Existing spec | — |
| `autobyteus-web/docs/settings.md` | Modify | docs | Row content: "A row is named as the sidebar names the copy." | Docs follow code | — |
| `autobyteus-web/tests/e2e/delegated-copy-own-file-cases.mjs` | Modify (comment line 12) | tests | Replace the "+" claim with: the Team context of each copy (what its conversation and composer run with) holds its own model, the slot its edit, all named "worker" | Task | Code changes |

## Folder Boundary Check

| Path | Depth | Clear? | Risk | Justification |
| --- | --- | --- | --- | --- |
| existing | as existing | Yes | Low | — |

## Concrete Examples / Shape Guidance

```ts
// teamExecutionTreeSelectors.ts
/** The name a Team run shows for the agent or Team at `address` (F-03 / D-7). */
export const teamMemberName = (tree: TeamRunExecutionTreeDto, address: string): string =>
  readsAsDisplayName(tree, address) ? memberDisplayName(address) : memberAddressBasename(address)

// delegatedLaunchRows.ts
const build = builders(deps, control, snakeRule, (address) => teamMemberName(tree, address))  // Team
const build = builders(deps, control, camelRule, memberDisplayName)                          // Org / Agent
```

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Why Considered | Decision | Replacement |
| --- | --- | --- | --- |
| None | — | N/A | — |

## Derived Layering

N/A.

## Change / Refactor Sequence

1. Put the reproduction into `delegatedLaunchRows.spec.ts`; see it fail.
2. Extract the Team function; switch the two existing sites (their specs stay green).
3. Pass naming functions into the row builders; remove `nameAt`.
4. Docs sentence; probe header comment.
5. Run the web specs for runSettings, teamExecution and the editor, plus `guard:web-boundary`.

## Key Tradeoffs

None material.

## Risks

None material.

## Guidance For Implementation

- Reproduction to start from: `tickets/in-progress/settings-delegated-row-display-name/evidence/repro-delegated-row-names.spec.ts`; copy into `autobyteus-web/utils/runSettings/__tests__/` and run `NUXT_TEST=true pnpm -C autobyteus-web exec vitest run utils/runSettings/__tests__/<file> --run`. It fails on base; fold its cases into `delegatedLaunchRows.spec.ts` and do not keep the probe file.
