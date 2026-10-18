# Implementation Design Impact — link-existing-run-to-task (DI-001)

- From: implementation engineer, 2026-10-18, at the start of implementation (no code written).
- Basis: design-spec.md SR-007, ARCH-REV-003 Pass; base `origin/personal` `2f211340ee`.
- Classification: `Design Impact` (team-run adoption as designed cannot work; the fix changes the step-3 contract
  that ARCH-F-003 rests on).

## DI-001 — A hand-started team run is addressed at `/`; a task agent team is addressed under its catalog address

The design's step 3 for a team run is strictly additive: add only the top-level `taskAgent` key to the team's
`team_run_execution_tree.json`, then build the composed record by reading the file back through the task-agent
reader, and let the delegator adapter add it (the split write then writes only the link). That read-back and the
composed record are both rejected, because the two tree kinds use different address frames:

| Shape | Root address | Member addresses | Evidence |
| --- | --- | --- | --- |
| Hand-started team run (team-run reader) | must be `/` | direct children of `/` (`/lead`, `/designer`) | `run-history/store/team-run-execution-tree-schema.ts:40-46` |
| Task agent team own tree (task-agent reader) | non-root, equal to `taskAgent.address` | (any non-root) | `task-agent-team-tree-schema.ts:56` (`canonicalNonRootAddress(root.address)`), `:81-83` (`taskAgent.address` must equal `rootTeam.address`) |
| Task team record in the delegator's tree | the catalog address (`/software_engineering_team`) | direct members of it (`/software_engineering_team/lead`) | `run-history/store/task-execution-source-schema.ts:59-60`; `run-execution-tree-shared-record-schemas.ts:196` |

So after the additive write, the task-agent reader reports the team tree unreadable (`rootTeam.address` `/`), and
even a reader that accepted it would compose a record whose members are not under the link's address, which the
delegator's tree schema rejects. Handoff rules (`from` / `to` addresses) are in the same `/`-relative frame.

The agent-run path has no such problem: `run_metadata.json` has no address; `taskAgent.address` is the catalog
address and the composed record validates. (Implementation detail I will apply, no design change: the adoption link's
`startedAt` must equal the own file's `startedAt` — for a team, the tree's `createdAt` — or the split write
normalizes the own file at link time, because the candidate takes `startedAt` / `createdAt` from the link.)

## Options for the Solution Designer (my reading; your decision)

1. **Reversible address rebase for team runs.** Step 3 rewrites the team tree from the `/` frame into the catalog
   address frame (`/` → `/sw_team`, `/lead` → `/sw_team/lead`, handoffs likewise) and adds `taskAgent`, keeping every
   other key (`teamDefinitionName`, `role`, `description`, …) as it is. The close of an unfinished adoption removes
   `taskAgent` and rebases back to `/` (teams are flat, so the inverse is exact). Step 3 is then not strictly additive;
   the reversal restores a parsed-identical tree by the inverse rebase rather than by removing one key. ARCH-F-003's
   test (stopped inside step 3, then closed → listed and openable, parsed-identical) still applies.
2. **The task-agent team reader accepts the `/` frame** and composes the record into the catalog frame (a second
   accepted shape in a current reader — a dual-shape read, which the design rules disfavour).
3. **Agent runs only in this ticket**; team-run adoption as a follow-up. This drops AC-001 (team), which is the user's
   main case (411 team runs; the `autobyteus-10` worker may be either).

Option 1 looks smallest and keeps one current shape per reader, but it changes the "strictly additive" contract the
round-3 review accepted, so it needs your decision and probably a targeted re-review.

## Smaller points to settle in the same revision (not blocking on their own)

- **Archived hand-started runs.** A team run with `archivedAt` set: the task-agent team reader forces
  `archivedAt: null`, so the split write would normalize it at link time; an agent run's archive state lives only in its
  history row, which step 4 removes. Adopt archived runs (unarchived by adoption) or refuse them?
- **Where the close of an unfinished adoption runs.** The Final File Responsibility Mapping names no owner for "the
  close removes that `taskAgent` section" (Task DONE / CANCELLED on an entry whose run is not in the delegator's tree).
  I would put it in the Task-close release path for the host root (the delegator's standalone root, or offline when the
  root is not active); please confirm the owner, including when the delegator's root is not running at close time.
- **The catalog address of an adopted agent run** (`taskAgent.address`, the link's address): I would use the address
  the catalog delegation would give its definition (`resolveDelegationPlacement` / catalog-delegation addressing);
  please confirm, and what happens when the definition is no longer in the catalog (refuse, or use the recorded
  definition id with a derived address).
