# Docs Sync Report

## Scope

- Ticket: `collaboration-member-artifact-hydration`
- Trigger: Code Reviewer re-handoff after the DR-001 Local Fix: IR-002 `dc552c3ab`, CRR-003 Pass 9.4, CRR-004 N/A, API-REV-002 Pass 95%.
- Bootstrap base reference: `origin/personal@db39803d4`
- Integrated base reference used for docs sync: `origin/personal@f777a6559`, merged as `b11448837`.
  - The earlier merge `692509f83` brought in `3c8e49ad5`.
- Post-integration verification reference: `delivery-evidence/web-vitest-integrated-round2.log`

## Why Docs Were Updated

- Summary:
  - The web Artifacts owner table still named `runContextHydrationService.ts` as the only artifact hydration owner.
  - The Team and Org docs did not say that member artifacts are hydrated with member state.
- Why this should live in long-lived project docs:
  - The ticket introduces a shared owner (`memberRunStateHydration.ts`) and a durable consistency rule: member Artifacts are complete after a reload or on historical runs, as for standalone agents.
  - It also sets a failure policy. Artifacts follow the member projection's failure behavior.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `autobyteus-web/docs/agent_artifacts.md` | Frontend Artifact owners | Updated | Owner table split into fetch/commit, standalone and collaboration-member rows |
| `autobyteus-web/docs/agent_teams.md` | Team open/hydration behavior | Updated | Member artifacts hydrate with the projection; live-merge and failure policy |
| `autobyteus-web/docs/agent_orgs.md` | Org hydration owner list | Updated | Member and nested-Team member artifacts hydrate with the projection; failure fails the open |
| `autobyteus-web/docs/agent_execution_architecture.md`, `settings.md` | Mention `RunFileChangesStore` reopen hydration from `getRunFileChanges(runId)` | No change | Still accurate at that level of detail |
| `autobyteus-server-ts/docs/modules/agent_artifacts.md`, `features/artifact_file_serving_design.md`, `modules/run_history.md` | Server hydration API | No change | No server change. They already describe `getRunFileChanges(runId)` per run, including member run ids. |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-web/docs/agent_artifacts.md` | Owner table | The single hydration row is replaced by `runFileChangeHydrationService.ts` (fetch/replace/merge), `runContextHydrationService.ts` (standalone) and `memberRunStateHydration.ts` (Team/Org members). | Reflects the new shared owner |
| `autobyteus-web/docs/agent_teams.md` | Behavior paragraph | Member artifacts are fetched and committed with the projection; newer live rows are kept; focused and non-focused failure policy | Durable Team behavior |
| `autobyteus-web/docs/agent_orgs.md` | Owner list entry | Org hydration commits member artifacts, including nested-Team members; a failure fails the open | Durable Org behavior |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Member run-state hydration | Projection and artifacts are fetched in parallel. They are committed together under one Activity revision guard, and a conflict writes nothing. | `design-spec.md`, `implementation-handoff.md` | `agent_artifacts.md` |
| Failure policy (AC-007) | An artifact fetch failure is handled like a projection failure on the same path. No new policy is introduced. | `requirements-doc.md` | `agent_teams.md`, `agent_orgs.md` |
| Live merge (REQ-003) | Hydration merges and keeps live entries with a newer `updatedAt`. | `requirements-doc.md`, `design-spec.md` | `agent_artifacts.md`, `agent_teams.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| `commitTeamRunHydrationActivities` | `commitTeamRunHydration` (no alias) | Code. The old name was not in the long-lived docs. |
| Org `commitActivities`, `activityReplacements` | Org `commit`, `memberRunStates` (no alias) | Code. The old names were not in the long-lived docs. |

## Delivery Continuation

- Result: `Pass`
- Next delivery action: write the handoff summary, then hold for user verification.
