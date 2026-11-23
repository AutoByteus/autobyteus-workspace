# Docs Sync Report: autobyteus-619 (the follow-ups of autobyteus-615: Memory team lists, faithful upgrade tests, two test helpers, design case numbers)

## Scope

- Ticket: `follow-ups-615-619` (Project Task `autobyteus-619`, which absorbs autobyteus-620; the merged follow-ups FU-001…FU-004 of autobyteus-615)
- Trigger: API/E2E `API-REV-001` `Pass` (final confidence 95.3%), then `API-REV-002` `Pass` after delivery's Local Fix round, direct route (`task_size` Medium, `architectural_risk` Low; architecture review, source review and test-code review `Not Applicable`).
- Bootstrap base reference: `origin/personal` @ `dad158474c`
- Integrated base reference used for docs sync: `origin/personal` @ `390179a50f` (3 commits, the v1.5.14-beta.8 release, merged into the branch as `540d5c0f6e`)
- Post-integration verification reference: `release-deployment-report.md`, "Initial Delivery Integration Refresh" (both typechecks, a fresh server build, the eleven files the changes reach, the whole server unit and E2E suites and the server integration suite, on `900cb3bef5`)

## Why Docs Were Updated

- Summary: one change is product behavior. An Org's mounted Team is a Team run of its own since autobyteus-29 (its tree carries `containedIn`), and `listAgentTeamsWithMemory` and `listAgentTeamRunsWithMemory` listed it as a team root, so the Memory page's Agent Teams list showed a Team that belongs to an Org as an Agent Team. The Memory page's team lists now hold team roots only (`TeamRootMemorySource.readRoot` returns no root for a tree with `containedIn`); the Org lists read the units themselves and are unchanged. The other items are test and documentation work: two upgrade E2E files and two more start from a faithful migration ledger (one helper, `faithful-upgrade-ledger.ts`) instead of an empty one, `restoreByMemberMessage` waits for its message's acknowledgement, one unit test uses one form of the root, and the design cases get unique numbers. Delivery read every long-lived doc that describes the Memory page's team lists, migration ledgers in tests, the restore helper, and the design case numbers against the final code.
- Why this should live in long-lived project docs: `agent_memory.md` already said "the Memory page lists units under their organization, not as top-level runs" (since autobyteus-29's REQ-006), but nothing said which list enforces it or that a team root is a Team run without `containedIn`; a maintainer who adds a Team-unit kind would not know where the rule lives.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `DESIGN.md`, `docs/design-cases.md` | Project design rules and cases | Updated by the implementation (design cases); checked | autobyteus-599's Case 26 and Case 27 became Case 29 and Case 30, each saying which number 599's records cite, and a note says a case takes the next free number when its ticket merges. `grep "^### Case"` on the merged state: 30 headings, no repeated number (`uniq -d` empty). No live document or code cites the old numbers (`git grep`); archived ticket records stay unchanged. No rule in `DESIGN.md` changed |
| `TESTING.md` | Project testing guideline | Updated by API/E2E (its document); checked | The test-data rule gained: a startup test that places data a released build wrote makes its migration ledger with `faithful-upgrade-ledger.ts`, never an empty ledger (an empty ledger reruns every earlier migration on data already past it). The helper exists with the named functions (`faithfulUpgradeLedger`, `migrationsFrom`, `migrationsOfStartUnderTest`) and four files use it. The older startup files not yet on it are `follow-ups.md` FU-004 (non-urgent; they pass today). The rule's guidance to run server E2E under `env -i` stands, and FU-003 (urgent) is the harness-side fix |
| `RELEASE.md` | Project release guide | No change | No release step, check or workflow changed, and no build input changed in this ticket's diff (no lockfile, `package.json`, `tsconfig`, script, workflow, contract package or generated file; the base's beta.8 files, `released-migration-order.json` and the web version, came from the base, not from this ticket), so the fresh-start build rule does not apply |
| `autobyteus-server-ts/docs/modules/agent_memory.md` | Describes the Memory explorer's GraphQL lists and Org members' memory | Updated | See Docs Updated |
| `autobyteus-web/docs/memory.md` | Describes the Memory page's lists | No change | It names the same queries and says what each returns ("memory-bearing agent-team groups"); the queries' names, arguments and shapes did not change, and the Org lists still carry the Team unit's member targets (checked in `memory-collaboration-graphql`'s Org assertions) |
| `autobyteus-server-ts/docs/modules/agent_orgs.md` | Describes an Org's unit folders (`agent_teams/<unit-team-run-id>/`, `containedIn`) | No change | It already says each mounted Team is a Team run of its own with `containedIn`, which is the field the fix reads |
| `autobyteus-server-ts/docs/design/data_migration_guideline.md` | The migration rules, including "faithful released-data fixtures" (section 5) and the released migration order | No change | Its rules on fixtures stay true; the ticket applies them to the ledger. The released migration order file is described there and was extended by the base's release, not by this ticket |
| `GLOSSARY.md`, `autobyteus-web/docs/**` other than `memory.md` | Terms for Org units, team roots, upgrade tests | No change | No term changed; the web renders the same fields |
| The test helpers' own comments (`faithful-upgrade-ledger.ts`, `restore-by-member-message.ts`) | The rules they implement | No change | The ledger helper's header states the model (a first start records every migration, then the rows of the migrations the modeled release never ran are removed); the restore helper's comment says it waits for the Org's `AGENT_COMMAND_ACK` and that a Team's wait is unchanged because its stream sends no acknowledgement (FU-002) |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/agent_memory.md` | Reference | Before "All list queries return a `MemoryExplorerPage` …": the team lists (`listAgentTeamsWithMemory`, `listAgentTeamRunsWithMemory`) hold team roots only; a Team unit of an Org is a team run of its own but not a root (its tree carries `containedIn`), so `TeamRootMemorySource` leaves it out and the Memory page shows it under its Org through the org lists (autobyteus-619) | The doc said units show under their organization but not which lists enforce it, and the lists did not until this ticket |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| An upgrade test must model the install it claims | A startup test on released-shape data needs the migration ledger that release left: every migration it ran recorded, the ones it never ran absent; an empty ledger runs old migrations on data already past them, so a test can fail, or pass, for that reason alone | `investigation-notes.md` F-1…F-5, `requirements-doc.md` DEC-001 | `TESTING.md` (API/E2E's), the helper's header |
| A test that models a release must not equate it with the growing release record | The released migration order grows with every release; a test that compares the modeled install's ledger with the whole record fails at the next release (it did at beta.8). The modeled install is the release before the migration under test: the record up to, not including, its first never-ran migration, and the test asserts that migration is in the record | `implementation-handoff.md` IR-002; `API-REV-002` | the test itself (`removed-skill-access-mode-history-graphql.e2e.test.ts`); not a project rule, since only that test models a release against the record (API/E2E checked the other readers of the record) |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| Empty-ledger startup in the four upgrade E2E files | `faithful-upgrade-ledger.ts` | `TESTING.md`, the helper |
| `restoreByMemberMessage` returning before its message was acknowledged | It waits for the Org's `AGENT_COMMAND_ACK` of its own `command_id` | the helper's comment |
| 599's design Cases 26 and 27 | Cases 29 and 30 (with "Cited as Case 26/27 in autobyteus-599's records") | `docs/design-cases.md` |

## No-Impact Decision (Use Only If Truly No Docs Changes Are Needed)

Not used: `agent_memory.md` changed in delivery; `TESTING.md` and `docs/design-cases.md` in earlier stages.

## Delivery Continuation

- Result: `Pass`
- Next delivery action: handoff summary, release notes, verification record, archive, finalization (`release-deployment-report.md`)
- Notes: follow-ups FU-001 (autobyteus-29's Org conversion gate leaves every Org unconverted while a predecessor stays `FAILED`; a migration-design question), FU-002 (the Team view stream sends no acknowledgement for an accepted message), FU-003 (**urgent**: server E2E setup does not strip the inherited `AUTOBYTEUS_*` roots and `DATABASE_URL`) and FU-004 (the older startup E2E files not yet on the faithful ledger) are in `follow-ups.md`; delivery adds none. The Solution Designer sends them.
