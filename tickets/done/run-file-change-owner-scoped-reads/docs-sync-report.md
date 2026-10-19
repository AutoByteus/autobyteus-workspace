# Docs Sync Report — run-file-change-owner-scoped-reads

## Scope

- Ticket: `run-file-change-owner-scoped-reads` (FU-3 of autobyteus-93): file-change reads name the run they belong to
- Trigger: code reviewer delivery handoff after CRR-003 Pass (test-code review) and API-REV-002 Pass (95.4%)
- Bootstrap base reference: `origin/personal` @ `cba6b85122`
- Integrated base reference used for docs sync: `origin/personal` @ `e677fe98da`, merged into the ticket branch by `34487d8878` (ticket head `aff2039205`; re-fetched at delivery start, 0 commits behind)
- Post-integration verification reference: `release-deployment-report.md` → Initial Delivery Integration Refresh (DLV-01..DLV-05)

## Why Docs Were Updated

- Summary: the long-lived docs described one run-id read surface for every Agent Artifact (`getRunFileChanges(runId)` and `/runs/:runId/file-change-content`), served for members by a cross-family lookup. The ticket replaced that with owner-scoped reads: one list query and one content route per owner (standalone run, team member, org member, delegated copy). The run-id reads now serve standalone runs only, with no fallback search. Team-member conversation lookups are team-root scoped. Team and org member reads use the live record while the root runs. Task agents' workspace-relative files resolve through `locatedExecutionSource`.
- Why this should live in long-lived project docs: the per-owner route table, the "run id means standalone run" rule and the response policy are API contracts between web and server. Future work, including FU-A (context files) and new clients, must follow them. Without the update, the docs would send a reader to the run-id route for members, which now answers 404.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result (`Updated`/`No change`/`Needs follow-up`) | Notes |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/features/artifact_file_serving_design.md` | Design step 7; owns the artifact list/content flow | Updated | Route table per owner, standalone rule, member location, live vs stored, workspace root, response rules |
| `autobyteus-server-ts/docs/modules/agent_artifacts.md` | Design step 7 | Updated | Per-owner list/content bullets replace the run-id-only bullets |
| `autobyteus-server-ts/docs/modules/run_history.md` | Design step 7; described run-id reads reaching team-member memory | Updated | Owner-scoped team/org reads; team-root `requireLocation` (REQ-004) |
| `autobyteus-server-ts/docs/modules/standalone_agent_run_root.md` | Design step 7; described the copy's run-id path and the stored-only lookup | Updated | Hub-scoped content route; run-id reads serve the host only |
| `autobyteus-server-ts/docs/FILE_RENDERING_AND_MEDIA_PIPELINE.md` | Found by delivery grep: two lines named the run-id content route as the only preview route | Updated | Points to the owner route and the route table |
| `autobyteus-web/docs/agent_artifacts.md` | Design step 7; line 215 named the run-id route for every row | Updated | Viewer resolution per owner (`runFileChangeContentPath`), fetch owner (`fetchRunFileChanges(subject)`), desktop/mobile subject sources |
| `autobyteus-web/docs/agent_teams.md` | Design step 7 | Updated | `getTeamMemberFileChanges(teamRunId, agentRunId)` |
| `autobyteus-web/docs/agent_orgs.md` | Design step 7 | Updated | `getAgentOrgMemberFileChanges(orgRunId, memberAddress, agentRunId)` |
| `autobyteus-web/docs/settings.md` | Found by delivery grep: the sidecar store reopen hydration named `getRunFileChanges(runId)` | Updated | Owner list query |
| `autobyteus-web/docs/agent_execution_architecture.md` | Same sidecar store paragraph (line 1820); line 128 (copy hydration uses the hub-scoped query, never the run-id one) | Updated (1820); No change (128) | Line 128 was already correct |
| `autobyteus-server-ts/docs/design/collaboration_model.md` | Ownership model reused by the design | No change | The ticket reuses the model without changing it |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/features/artifact_file_serving_design.md` | Flow + contract | Steps 6–7 name the owner's read; new owner route table and rules section | Canonical home of the artifact read contract |
| `autobyteus-server-ts/docs/modules/agent_artifacts.md` | Module responsibilities | Per-owner list/content; member-view services locate, file-change service serves; `locatedExecutionSource` | Removes the obsolete "serve by runId" rule |
| `autobyteus-server-ts/docs/modules/run_history.md` | Read path | Run-id = standalone (metadata); team/org owner-scoped reads; team-root member lookup | The old text said run-id reads reach team-member memory |
| `autobyteus-server-ts/docs/modules/standalone_agent_run_root.md` | GraphQL/REST surface | Hub-scoped content route; removed the "stored-only cross-family lookup" sentence | That fallback was removed |
| `autobyteus-server-ts/docs/FILE_RENDERING_AND_MEDIA_PIPELINE.md` | Pointer | Preview route is the owner's route | Consistency |
| `autobyteus-web/docs/agent_artifacts.md` | Frontend owners + viewer resolution | Owner subject flow and route per owner | Line 215 was stale |
| `autobyteus-web/docs/agent_teams.md`, `agent_orgs.md` | Hydration query names | Team/org scoped queries | Old run-id query no longer returns member files |
| `autobyteus-web/docs/settings.md`, `agent_execution_architecture.md` | Sidecar store | Owner list query | Same |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Owner-scoped reads | Every file-change list/content read names its owner; one route/query per owner; the server reads only that owner's tree | `design-spec.md` DS-001/DS-002, DEC-001/DEC-005 | `artifact_file_serving_design.md`, `agent_artifacts.md` (server and web) |
| Standalone discriminator | A run is standalone exactly when it has standalone run metadata; being active is not the discriminator (members share the activation registry) | `design-spec.md` Current-State Read (AR-001) | `artifact_file_serving_design.md`, `run_history.md` |
| No fallback | Run-id reads of members return empty / 404 with no search (DEC-002) | `requirements-doc.md` REQ-005 | `artifact_file_serving_design.md`, `agent_artifacts.md`, `standalone_agent_run_root.md` |
| Live while running | Team/org member lists and content use the live record while the root runs (409 for pending) | DEC-003, REQ-009 | `artifact_file_serving_design.md` |
| Task-agent workspace root | `locatedExecutionSource` is the one owner of a located member's launch source (AR-002) | `design-spec.md` | `artifact_file_serving_design.md`, server `agent_artifacts.md` |
| Response policy | One content response rule for every owner (bytes / 409 / 404 not available / 404 not found; 400 missing `memberAddress`) | REQ-008, `api/rest/run-file-changes.ts` | `artifact_file_serving_design.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| Collaboration fallback in `RunFileChangeProjectionService.readProjectionContext` (cross-family `findAgent` over all saved trees) | Member-view services locate in the named root; file-change service serves standalone runs and located members | `artifact_file_serving_design.md`, server `agent_artifacts.md` |
| `/runs/:runId/file-change-content` for every row | Four owner routes | `artifact_file_serving_design.md`, web `agent_artifacts.md` |
| `getRunFileChanges(memberRunId)` for team/org members | `getTeamMemberFileChanges`, `getAgentOrgMemberFileChanges` | web `agent_teams.md`, `agent_orgs.md`, server `run_history.md` |
| `RunFileChangeProjectionService.getEntry` (dead) | Removed | n/a (no doc named it) |
| Web `EventMonitorActiveTraceBrowseSubject` | `AgentRunReadSubject` (`types/agent/agentRunReadSubject.ts`) | web `agent_artifacts.md` |

## No-Impact Decision (Use Only If Truly No Docs Changes Are Needed)

- Docs impact: N/A (docs updated)
- Rationale: N/A

## Delivery Continuation

- Result: `Pass`
- Next delivery action: handoff summary, verification record, ticket archive, repository finalization per `RELEASE.md`
- Notes: All docs were edited on the integrated branch state (`aff2039205` + docs edits). The edits only describe implemented behavior. Each claim was checked against `api/rest/run-file-changes.ts`, the GraphQL resolvers, `run-file-change-projection-service.ts`, `runFileChangeContentPath.ts`, `runFileChangeHydrationService.ts`, `ArtifactsTab.vue` and `useMobileFocusedRunIdentity.ts`.
