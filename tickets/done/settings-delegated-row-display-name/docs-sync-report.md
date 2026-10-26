# Docs Sync Report

## Scope

- Ticket: `settings-delegated-row-display-name` (Project Task `autobyteus-208`), SR-001 / IR-001 / API-REV-001
- Trigger: API/E2E validation Pass (API-REV-001), direct low-risk route (`task_size=Small`, `architectural_risk=Low`)
- Bootstrap base reference: `origin/personal` @ `1138e8fbef`
- Integrated base reference used for docs sync: `origin/personal` @ `20dc05ab1c`, merged into the ticket branch as `32637c224e`
- Post-integration verification reference: DEL-01…DEL-03 (`evidence/DEL-0*.log`)

## Why Docs Were Updated

- Summary: `autobyteus-web/docs/settings.md` said delegated-copy rows were named after "the role, else the last address segment". The implementation (`5af1a03e11`) replaced that with the sidebar's rule. Delivery added to `autobyteus-web/docs/agent_teams.md` that `teamMemberName` is the single owner of the Team naming rule, used by the sidebar rows, the member contexts and the Run Settings rows (REQ-003).
- Why this should live in long-lived project docs: the rule had been written out twice and Settings had a third, different rule. Naming the owner keeps future code from adding another copy.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `autobyteus-web/docs/settings.md` (delegated copies, ~line 1352-1357) | Owns the Settings rows' names | Updated (by implementation; verified) | Merged cleanly with autobyteus-265's "Save recovery" sentence; both are present on `32637c224e` |
| `autobyteus-web/docs/agent_teams.md` (~line 316-323) | Describes the Team naming rule (`readsAsDisplayName`) | Updated (by delivery) | Names `teamMemberName` as the owner and its three users |
| Search for `last address segment`, `nameAt`, `readsAsDisplayName`, `teamMemberName`, `address basename` across non-ticket `*.md` | Other descriptions of the old Settings naming | No change | `autobyteus-server-ts/docs/modules/agent_memory.md:389` is about memory labels, a different surface. The `nameAt` hits are code in other surfaces (Org/Agent contexts already use `memberDisplayName`; `runMemberTree.ts` names the configured Members rows, which are out of scope) |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-web/docs/settings.md` | Correction (in `5af1a03e11`) | Delegated-copy rows are named as the sidebar names the copy | REQ-001, REQ-002 |
| `autobyteus-web/docs/agent_teams.md` | Ownership note | `teamMemberName` is the one owner of the Team naming rule, used by sidebar rows, contexts and Settings rows | REQ-003 |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| One Team naming rule | Name a Team copy through `teamMemberName`; Org and Agent roots use `memberDisplayName` | `design-spec.md`, `requirements-doc.md` REQ-003 | `agent_teams.md`, `settings.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| `nameAt` (basename) in `utils/runSettings/delegatedLaunchRows.ts`; the two inline copies of the Team rule | `teamMemberName` (Team) and `memberDisplayName` (Org/Agent) | `agent_teams.md`, `settings.md` |

## Delivery Continuation

- Result: `Pass`
- Next delivery action: verification from the evidence, then finalization
- Notes: no follow-ups were found.
