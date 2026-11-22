# Contract Validation — `org-container-storage-contract.md`

Done by the Solution Designer on 2026-11-22, on the ticket worktree (base `9f6add773b` plus the implementation engineer's
in-progress, uncommitted schemas `agent-org-container-file-schema.ts`, `contained-in-schema.ts`, and changes to
`team-run-execution-tree-schema.ts`, `agent-run-metadata-types.ts`). Temporary test files were removed afterwards and
never committed (finding-the-cause.md, temporary diagnostics).

## V-1..V-4 Examples through the real validators (Measured)

A temporary vitest file loaded the contract's §2–§4 JSON examples (extracted from the contract text) and ran:

| ID | Check | Result |
| --- | --- | --- |
| V-1 | `validateAgentOrgContainerPayload(container, "sdd_org_1")` returns exactly the example (deep equal) | Pass |
| V-2 | `validateTeamRunExecutionTreePayload(team, "set_team_1")` returns exactly the example and keeps `containedIn` | Pass after a fix: the first run **failed** because the examples carried `skillAccessMode` in launch configurations; the current reader drops it. Fixed the examples, and the contract §9 now maps any launch key outside the current shape (e.g. released `skillAccessMode`) to "dropped". `remove-global-skill-discovery-mode` never visited Org trees, so an Org written before it can still carry the key |
| V-3 | `AgentRunMetadataStore.readMetadata("concierge_1")` of the §4 file returns `containedIn` and `address` | Pass |
| V-4 | The container refuses an Org rule whose `from` is outside every unit | Pass |

Command: `node_modules/.bin/vitest run tests/tmp-contract/contract.test.ts --no-watch` (in `autobyteus-server-ts/`): first run 2 failed / 2 passed; after the fix 4 passed.

## V-5 Conversion mapping walked over the user's real Org (Measured, read-only; nothing written, no conversion run)

Source: `/home/autobyteus/data/memory/agent_orgs/software_development_department_…/` (released Org tree v1).

| Check | Result |
| --- | --- |
| Every member's address is under its Team's address; every coordinator likewise (stripping the prefix is safe) | 8 members, all under their Team: OK |
| Rules: wholly inside one Team (→ Team file) vs Org-level (→ container) | 19 Team-own, 2 Org-level |
| Log lines: intra-Team / cross-unit / outside party / party not a member | 30 intra-Team, 2 cross-unit, 0 outside, 0 unmapped |
| Released keys outside the mapping | `rootOrg.collaborators` = empty list (dropped, §9); no extra member or Team-node keys |
| Fields the target needs but the source lacks | Team nodes have no `teamDefinitionName` → contract §9 reads it through the definition-names port |

## V-6 Use cases walked against the files (Read)

Each row of contract §10 was traced to the field that answers it: start (container `units` + unit `containedIn`), restore
(container → unit file → port), message by address (container `units`, Team `members` in team space plus prefix),
logs (both unit logs, `counterpart`), rules (Team `handoffs` with prefix + container `handoffs` from that Org address),
Team change (autobyteus-22 fields), Org rule naming a removed member (derived at use, not stored), Org change
(`units`/`formerUnits`), peer copy (Task entry `members`), conversion retry (target file with `containedIn`), view/rows/
history (container + units; contained runs under their Org), context files (`{orgRunId, agentRunId}` → unit folder),
delegation (unit run as delegating run). No use case needs a fact the files do not hold.

## Findings fed back

- F-1 (fixed in the contract): released launch keys outside the current shape are dropped by the conversion (V-2).
- F-2 (fixed in the contract): Team display name read through the definition-names port (V-5).
- F-3 (for the implementation engineer): the in-progress `agent-org-container-file-schema.ts` already matches §2; the
  Team and agent schemas accept `containedIn` as §3/§4 require.
