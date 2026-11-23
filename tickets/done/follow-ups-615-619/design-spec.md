# Design Spec

## Solution And Approval Basis

- Current solution revision ID: `SR-001`
- Approved requirements baseline: `requirements-doc.md` SR-001, approved within the direction (founder informed)
- User approval of the design: `Not required`
- Design status: `Ready`
- Authorities read (2026-11-23): `references/architecture-design.md`, `references/design-principles.md` (updated 2026-11-23: Principle 17, data contract first), `DESIGN.md`, `TESTING.md`
- Data contract (Principle 17): `N/A`. No stored or cross-boundary data shape changes. I-1b changes which existing rows a query lists.

## Current-State Read

See `investigation-notes.md` F-1…F-12. In short:
- two upgrade tests are not faithful upgrades;
- the Memory team lists treat a contained Team unit as a root (a 29 regression);
- a shared helper skips the acknowledgement;
- one unit test mixes path forms;
- one documentation file has duplicate numbers.

## Task Size And Architectural Risk (Mandatory)

- **Task size:** `Medium`. One product change (the team-memory explorer's root filter); a new shared test helper used by four upgrade E2E files; one shared E2E helper fix; one unit test; one documentation file.
- **Architectural risk:** `Low`. No contract, persistence, concurrency or ownership change. The product change narrows a list to its documented meaning (team roots), using a fact the tree already stores (`containedIn`).
- **Escalation trigger:** if the Org page depends on the team list to show its units' memory, or the Agents tab changed visibly with 29, return a `Design Impact`.

## Intended Change

| Item | Change |
| --- | --- |
| I-1a, I-1c | A faithful-upgrade ledger, through one shared helper |
| I-1b | The team-memory lists exclude contained Team runs |
| I-2 | The helper waits for its acknowledgement |
| I-3 | One path form in the test |
| I-4 | Renumber the cases |

## Change Scope (Mandatory)

- **In scope:** UC-001…003.
- **Derived consumers of the team-root list:**

  | Consumer | Decision |
  | --- | --- |
  | Memory page Agent Teams tab (`listAgentTeamsWithMemory`) | Excludes contained Team runs |
  | A definition's runs (`listAgentTeamRunsWithMemory`) | Excludes contained Team runs |
  | Org memory views (`listAgentOrgRunsWithMemory`, `org-unit-member-views.ts`) | Unchanged; they read the units themselves (verify AC-002) |
  | Memory search and the episodic catalog | Unchanged: an agent's own memory, not team roots |

- **Deliberately left alone:** 29's predecessor gate (FU-001); `received-files.ts`; the Agents tab (checked only).
- **Follow-ups:** FU-001.

## Relevant Behavior And Production-Path Map (Mandatory)

| BEH | REQ / AC | Path |
| --- | --- | --- |
| BEH-001 | REQ-001; AC-001 | The test sequence: faithful root, then released data, then the start under test |
| BEH-002 | REQ-002; AC-002 | `memory-explorer.ts:97-125` → `TeamMemoryExplorerService.listAgentTeamsWithMemory` / runs, which discovers team run folders → the new filter: the tree's `containedIn` is absent |
| BEH-003 | REQ-003; AC-003 | `restoreByMemberMessage`: send → wait for the acknowledgement of its own `command_id` (org) or `message_id` (team) → as today |
| BEH-004 | REQ-004; AC-004 | The test only |
| BEH-005 | REQ-005; AC-005 | `docs/design-cases.md` |

## Task Design Health Assessment (Mandatory)

- **Change posture:** `Bug Fix` (I-1b) plus test and documentation `Cleanup`.
- **Current design issue found:** `Yes`.
  - I-1b: the team list's notion of "root" did not follow 29's new kind of team run (contained). Classification `Missing Invariant`.
  - Tests: an unfaithful setup repeated in two files, while a correct pattern exists in two others.
- **Structural triggers:**
  - **Repeated coordination** fires: the faithful-upgrade ledger step is written in two tests and missing in two. Response: extract `tests/e2e/app-data-migrations/helpers/faithful-upgrade-ledger.ts` (the first start, the deletion of the never-ran rows, the remaining-count check), and use it in all four files. The two existing users are refactored to it.
  - **Several kinds or forms** fires: team runs are now a root or contained. The filter applies to both team lists (above); Org views are checked.
  - **Behavior by absence** checked: "a root" is decided by an explicit field (`containedIn` absent), not by a failed lookup.
- **Deliberate deviations:** none.
- **Refactor needed now:** `Yes`, the shared ledger helper only.

## Removal / Decommission Plan (Mandatory)

| Item | Why | Replaced By |
| --- | --- | --- |
| The inline ledger code in `append-only-message-logs-startup.e2e.test.ts:144-160` and `agent-org-units-conversion-cost.e2e.test.ts:88-93` | Duplicated | The shared helper |

## Interface Boundary Mapping

| Interface | Responsibility |
| --- | --- |
| `faithfulUpgradeRoot({ studio, neverRanFrom })` (test helper; final name for implementation) | Make a data root whose ledger records every migration this build has, except the ones from the first that the modeled release never ran. Return the root for placing released data. |
| `TeamMemoryExplorerService` root filter | A team run folder counts as a team root only when its tree's `containedIn` is absent |
| `restoreByMemberMessage` | Waits for the acknowledgement frame of its own command. A rejected acknowledgement throws, unless the run became active (the existing rule for a failing first turn). |

## Final File Responsibility Mapping

All paths under `autobyteus-server-ts/` unless noted.

| File | Change |
| --- | --- |
| `src/agent-memory/services/team-memory-explorer-service.ts` | The root filter for both lists, plus a unit test |
| `tests/e2e/app-data-migrations/helpers/faithful-upgrade-ledger.ts` | Add |
| `tests/e2e/app-data-migrations/collaborators-to-delegated-runs-startup.e2e.test.ts` | Use the helper (never ran: `20261015_collaborators_to_delegated_runs_v1` and every later migration) |
| `tests/e2e/run-history/removed-skill-access-mode-history-graphql.e2e.test.ts` | Use the helper. Never ran: every migration from the first one after the release whose data it models; implementation names it from the test's own fixture comment and checks it. |
| `tests/e2e/app-data-migrations/append-only-message-logs-startup.e2e.test.ts`, `agent-org-units-conversion-cost.e2e.test.ts` | Use the helper |
| `tests/e2e/helpers/restore-by-member-message.ts` | Wait for the acknowledgement |
| `tests/unit/agent-org-execution/container/org-units-remote-files-and-renewal.test.ts` | One root form (for example `memoryDir: os.tmpdir()` with the folders under it, or a canonical `data` used for both) |
| `docs/design-cases.md` (repository root) | 599's Case 26 becomes Case 29 and its Case 27 becomes Case 30, each with "Cited as Case 26 (27) in autobyteus-599's records". Put the sections in number order. Add a note at the top: take the next free number when merging; if two tickets took one number, renumber the later one and name the old number under it. |

## Change / Refactor Sequence

1. I-3, then I-4 (independent).
2. The faithful-ledger helper; refactor its two users (they must stay green); apply it to the two failing files. Record the migration statuses on the first start in each file's run log.
3. I-1b: the filter, a unit test, and `memory-collaboration-graphql` green with its expectations unchanged. Check the Org memory views and the Agents tab.
4. I-2: the helper, then `scoped-org-history-graphql` in a whole server E2E run, twice.
5. The whole server unit and E2E suites, with each remaining failure's cause named (TESTING.md rule 9).

## Risks

- RSK-001 (FU-001): out of scope.

## Guidance For Implementation

- Start from the failing runs (investigation F-1, F-6, F-7).
- TESTING.md: one heavy run at a time; synthetic data.
