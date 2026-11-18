# Merged Tasks: dead code, leftover names and small refactors, no behavior change. Full original texts, unchanged.

Index: autobyteus-54: Clean up dead machinery left after the remote AutoByteus provider removal. **No user-visible behaviour change.; autobyteus-107: Tracking (cosmetic, low priority, not to dispatch): rename the remaining catalog-only "collaborator" code name; autobyteus-124: Classify and remove sub-team launch scopes left in team-run launch configuration (tracking; no dispatch yet); autobyteus-125: Remove dead code left after refactors (tracking; small; no dispatch yet); autobyteus-135: Narrow the in-memory task-team record and remove the nested-task handling that can no longer happen (cleanup; ; autobyteus-157: Persistence write results: rename the outcome names that now also describe appends (no behavior change); autobyteus-158: Move migration-only code out of context-files: `context-file-record-locators.ts` under the app-data-migrations; autobyteus-159: Docs: the Team identity sections of the two server streaming docs still describe removed shapes; autobyteus-178: ProjectTaskService.drainRuntimeReleases() has no production caller: wire it into orderly shutdown, or remove i; autobyteus-147: Split `ProjectTaskService` before it goes over the file-size limit (code-quality refactor, no behavior change)


---

## autobyteus-54: Clean up dead machinery left after the remote AutoByteus provider removal. **No user-visible behaviour change.**

(created 2026-10-12, status TODO)

Clean up dead machinery left after the remote AutoByteus provider removal. **No user-visible behaviour change.**

Requested by the user on 2026-10-12, via the code reviewer of remove-autobyteus-remote-provider (merged as fffb4d15a). With the remote AutoByteus provider gone, some generic machinery no longer has a real user. Attached: that ticket's code-review report (follow-ups under "Latest Authoritative Result" and "Dead / Obsolete / Legacy Items"), the implementation handoff (follow-up list with evidence) and the design-review report (R-003).

## Leftovers found (facts and locations from the review; the team decides what to do with each)
1. **A conversation-release step that no longer does anything (autobyteus-ts).**
   - `BaseLLM.releaseConversation` is a default no-op (llm/base.ts ~l.219-221). Its only production caller is the bounded release step in `LlmPhaseSummaryPort` (agent/loop/llm-phase-summary-port.ts ~l.188).
   - The removed AutobyteusLLM was the only override, so in production this step and its timeout bounding do nothing.
   - Its tests now run against a test-only `SessionScriptedLLM`.
   - Remove it, or keep it deliberately as an extension point and say so.
2. **`logicalConversationId` is passed but only filtered out (autobyteus-ts).** It's set in conversation-request.ts ~l.11 and llm-phase-summary-port.ts ~l.128, and documented at base.ts ~l.219. Its only consumer is the deny-list in llm/api/provider-request-kwargs.ts ~l.2. It's tied to item 1.
3. **The server's dynamic-source `modelKind` is always 'LLM'.** See `DynamicSourceSpec.modelKind` and the status modelKind in llm-management/services/dynamic-model-source-lifecycle.ts, and its callers in model-catalog-service.ts. **Caution:** it feeds the GraphQL `ModelSourceStatus.modelKind` field the web reads, so this is a shared-contract **design decision** (R-003 from ARCH-REV-001), not a mechanical edit.
4. **Leftover multi-kind logic in the web settings,** coupled to item 3: autobyteus-web/components/settings/providerApiKey/useProviderApiKeySectionRuntime.ts (source freshness and status aggregation) and stores/llmProviderConfig.ts (`DISCOVERY_SETTING_MODEL_KINDS = {'LLM'}`).

Items 1–2 are autobyteus-ts only and low risk; items 3–4 go together through the GraphQL contract. Suggested size Small/Medium; the Solution Designer classifies.

## Done when
Each leftover is removed, simplified, or deliberately kept with a stated reason. No user-visible behaviour changes, existing tests pass (dead tests removed or replaced), and the contract change for items 3–4 (if any) is reviewed. Merged after the user's go-ahead.


---

## autobyteus-107: Tracking (cosmetic, low priority, not to dispatch): rename the remaining catalog-only "collaborator" code names

(created 2026-10-15, status TODO)

Tracking (cosmetic, low priority, not to dispatch): rename the remaining catalog-only "collaborator" code names

Raised 2026-10-15 by the Solution Designer of the collaboration-model-contract ticket (Task 259ddae7, merged eda468e014). Evidence: that ticket's design-spec.md (Change Scope) and code-review-report.md (FU-1), archived at tickets/done/collaboration-model-contract/ on personal.

After the collaboration model landed, collaborators no longer exist as runs. Some code names still say "collaborator" for catalog-only things: the candidate policy, the launch resolver, `CollaboratorEntryBuilder`, `AvailableCollaborator`, the mention-note symbols and the web `collaborators/` utilities. Rename them to catalog/candidate names, with no behaviour change.

Not urgent; do it when someone is working nearby, or cancel it.


---

## autobyteus-124: Classify and remove sub-team launch scopes left in team-run launch configuration (tracking; no dispatch yet)

(created 2026-10-17, status TODO)

Classify and remove sub-team launch scopes left in team-run launch configuration (tracking; no dispatch yet)

Follow-up to the nested task-team cleanup (Task 9942a43c, merged 8a8d322144; ticket tickets/done/remove-nested-task-team/), recorded by the Solution Designer of that team, 2026-10-17. Evidence in that ticket: design-spec Change Scope follow-up 1, and implementation-handoff.md line 150.

## Background
The cleanup removed every team-inside-a-team representation, but deliberately left launch-configuration team scopes, because organizations legitimately use them for their teams.

## Remaining candidates
- Web: `types/agent/TeamRunConfig.ts` (`teamOverrides`, `teamsByAddress`, the `StoredTeamRunMemberNode` `agent_team` kind) and `utils/teamRunLaunchHierarchy.ts`.
- Server: `TeamScopeLaunchSettings` users in `application-platform/launch-configuration/`.

## Direction
Classify each candidate: does it serve only sub-teams of team runs (dead since teams became flat on 2026-09-01), or does it serve organizations' team scopes (keep)? Remove what only served sub-teams of team runs, keep the organizations' team scopes, and add a small migration if stored configurations use the removed shapes (DESIGN.md rule: current code uses only current shapes; old shapes live only in migrations). Scope guardrail: only this leftover.

## Done when
No launch-configuration code exists only for sub-teams of team runs; organizations' launch settings work as before; tests; real-app check with a test data package; merged; a beta; the user's check.


---

## autobyteus-125: Remove dead code left after refactors (tracking; small; no dispatch yet)

(created 2026-10-17, status TODO)

Remove dead code left after refactors (tracking; small; no dispatch yet)

Collected from follow-ups of the nested task-team cleanup (Task 9942a43c, merged 8a8d322144), the delegated-copy memory refactor code review (Task 8641c0ac, CRR-001), the append-only message logs code review (autobyteus-114, CRR-001), the chat-socket cadence delivery (autobyteus-139, FU-A), the Codex segment-turn admission ticket (autobyteus-165) and the owner-scoped file reads ticket (autobyteus-153). Each needs an owner check for external callers first.

## Items
1. Web: remove `buildPreparedAgentLaunch` and `buildPreparedTeamLaunch` in autobyteus-web/utils/application/applicationLaunch.ts (evidence in tickets/done/remove-nested-task-team/: implementation-handoff.md line 171; code-review-report.md line 224). Believed dead.
2. Server (added 2026-10-17, from the memory refactor code review FU-1): `AgentMemoryLocationService.getTeamAgentRunLocation` (autobyteus-server-ts/src/agent-memory/services/agent-memory-location-service.ts:59) has no caller in src; only tests/unit/agent-memory/agent-memory-location-service.test.ts:226 calls it. Remove the method and its test. (The memory refactor has landed.)
3. Server (added 2026-10-18, from the autobyteus-114 code review FU-CR-1): in autobyteus-server-ts/src/app-data-migrations/migrations/team-communication-projection-address-migration.ts line 5, the import `buildTeamCommunicationMessageId` is never used (found with `tsc --noUnusedLocals`). Remove it, then confirm with `pnpm -C autobyteus-server-ts typecheck`. Small.
4. Server tests (added 2026-10-18, FU-A from autobyteus-139): delete or rewrite the stale, excluded autobyteus-server-ts/tests/integration/agent/agent-team-websocket.integration.test.js. It targets the removed Team API, and Vitest excludes `.js` files, so it never runs. Decide: delete, or rewrite as a current `.ts` test if the Team websocket integration is not already covered. Source: autobyteus-139's receipt verification (tickets/done/chat-socket-content-cadence/ on personal).
5. Server (added 2026-10-19, from autobyteus-165): the unreachable `CODEX_SEGMENT_TURN_OMISSION_UNLISTED` rejection branch in autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-segment-turn-admission.ts. Its only caller (`CodexThread.handleAppServerNotification`) calls the resolver only for governed event names, so the branch never runs (archived implementation-handoff.md l.85 in tickets/done/codex-segment-turn-admission-drops/). Remove the branch and its reason code; keep the admission matrix tests green.
6. Server (added 2026-10-19, FU-B from the autobyteus-153 code review, CRR-001, ticket run-file-change-owner-scoped-reads): the unread `LocatedStandaloneRootAgentExecution.launchConfiguration` field in autobyteus-server-ts/src/standalone-agent-run-root/services/standalone-root-location-service.ts (lines 27 and 213). It is still written but nothing in `src` reads it; it also recomputes the copy's catalog launch (`catalogCopyExecutionSource(taskExecutionListsOf(tree))`), which `locatedExecutionSource` in agent-collaboration/execution/services/collaboration-execution-location-service.ts now owns. The only other reference is the test assertion at tests/unit/standalone-agent-run-root/standalone-agent-run-root.test.ts:300. Remove the field and the assertion; no behavior change. Do this after autobyteus-153 merges (it depends on that branch).

## Done when
The listed code and its tests are gone with no caller left (shown by a search and the typecheck); tests pass; merged; no release needed unless bundled.


---

## autobyteus-135: Narrow the in-memory task-team record and remove the nested-task handling that can no longer happen (cleanup; after the memory refactor lands)

(created 2026-10-17, status TODO)

Narrow the in-memory task-team record and remove the nested-task handling that can no longer happen (cleanup; after the memory refactor lands)

Follow-up FU-4 from the delegated-copy-own-run-memory code review (CRR-003, Task 8641c0ac), reported by the code reviewer, 2026-10-17. Outside that ticket. Do it after the memory refactor has landed. Related: the nested task-team cleanup (done, 8a8d322144), whose purpose was the same: current code uses only current shapes.

## Problem
After the memory refactor, a task team never holds task executions: the stores compose `TaskTeamExecution.taskExecutions` as `[]`, a task team's own tree rejects entries, and the three tree mutators append only at the coordinating run's top level. The in-memory type was kept unchanged on purpose (design Key Tradeoffs: "28 consumers untouched"), so code that handles a task execution hosted by a task team is now unreachable.

## Unreachable code (Agent roots)
- autobyteus-server-ts/src/standalone-agent-run-root/services/standalone-root-task-execution-adapter.ts: the team-host branches of cancel, release, discard, status, isLive, restore (`teams.require(...).restoreTaskAgent/restoreTaskTeam`) and shutdown;
- standalone-root-message-delivery.ts:224;
- the nested visit in `visitTeamContents` of the standalone, team and Org execution indexes.
In Org roots the same adapter branches stay live: tasks hosted by a mounted team (shape C6). Keep those.

## Direction
Narrow `TaskTeamExecution.taskExecutions` to an empty list (or remove it) and delete the unreachable branches above, keeping the Org-root ones.

## Caution (important)
app-data-migrations/legacy/released-run-package-shapes/released-memory-locations-before-task-agent-own-run.ts (used by the released 20260731 snapshot migrations) imports the current TeamExecutionIndex and AgentOrgExecutionIndex and relies on their nested walk. Give it its own frozen walk BEFORE narrowing those indexes, or the released migrations' behavior changes.

## Done when
The unreachable branches and the unused field are gone; Org-root behavior unchanged; the released migrations behave exactly as before (shown by their tests); a real-app check with a test data package (TESTING.md); merged; no release needed unless bundled.


---

## autobyteus-157: Persistence write results: rename the outcome names that now also describe appends (no behavior change)

(created 2026-10-18, status TODO)

Persistence write results: rename the outcome names that now also describe appends (no behavior change)

Follow-up FU-2 of autobyteus-114 (append-only message logs), from its Solution Designer, 2026-10-18. Small refactor.

## What
The write-result outcome names `not_renamed` / `renamed_finalization_indeterminate` (in `atomic-run-package-file-commit-writer.ts`) now also describe appends, not only renames, so they mislead the reader of any caller.

## Direction
Rename to `not_committed` / `finalization_indeterminate` across all persistence coordinators that use them. No behavior change; callers, logs and tests updated together; check for external users of the names (stored records, API) before renaming.

## Done when
All uses renamed consistently with no behavior change (search shows no old names left outside migration/history code that must keep them), typecheck and tests pass, merged; no release needed unless bundled.


---

## autobyteus-158: Move migration-only code out of context-files: `context-file-record-locators.ts` under the app-data-migrations legacy folder (no behavior change)

(created 2026-10-18, status TODO)

Move migration-only code out of context-files: `context-file-record-locators.ts` under the app-data-migrations legacy folder (no behavior change)

Follow-up FU-3 of autobyteus-114 (append-only message logs), from its Solution Designer, 2026-10-18. Small refactor.

## What
`autobyteus-server-ts/src/context-files/services/context-file-record-locators.ts` is migration-only code, but it lives outside `app-data-migrations`.

## Direction
Move it under `src/app-data-migrations/legacy/` and update the migration imports. No behavior change. Check there is no non-migration caller first (if there is, say so and stop).

## Done when
The file lives under app-data-migrations/legacy, all imports updated, typecheck and tests pass, merged; no release needed unless bundled.


---

## autobyteus-159: Docs: the Team identity sections of the two server streaming docs still describe removed shapes

(created 2026-10-18, status TODO)

Docs: the Team identity sections of the two server streaming docs still describe removed shapes

Follow-up FU-B of autobyteus-139 (chat-socket-content-cadence), 2026-10-18, from its Solution Designer (receipt verification in tickets/done/chat-socket-content-cadence/ on personal, and autobyteus-worktrees/abt139-receipt-verification/receipt-verification.md). Docs only.

## What
The Team identity sections of both `agent_websocket_streaming_protocol.md` and `docs/modules/agent_streaming.md` ("Team Execution Identity", "Team Stream Contract", Team commands) still describe the removed `agent_execution` / `execution_address` shapes.

## Direction
Bring those sections up to the current Team identity and stream contract (check the code and the contract packages, not the old text), in the same pass look for other stale mentions of the removed shapes in docs. No code change.

## Done when
The sections describe the current shapes (verified against the code), a search finds no stale `agent_execution` / `execution_address` mention in the streaming docs, merged; no release needed.


---

## autobyteus-178: ProjectTaskService.drainRuntimeReleases() has no production caller: wire it into orderly shutdown, or remove it

(created 2026-10-19, status TODO)

ProjectTaskService.drainRuntimeReleases() has no production caller: wire it into orderly shutdown, or remove it

Follow-up FU-CR-003 from the code review of autobyteus-171 ("part of", task-part-of), 2026-10-19. Outside that Task: it predates the change, and removing it means reworking test synchronization in unrelated suites. Related: autobyteus-147 (split ProjectTaskService, depends on autobyteus-71), the same file; coordinate with it.

## What and where
autobyteus-server-ts/src/projects/services/project-task-service.ts:270. Its doc mentions "orderly shutdown", but no shutdown path calls it. 14 test files use it to settle releases.

## Direction
Decide: wire it into the server's orderly shutdown (so releases settle before exit), or replace the tests' synchronization and remove it (the no-dead-code rule). Say which and why; the team decides unless it changes behavior a user sees.

## Done when
`drainRuntimeReleases` either has a real production caller (with a shutdown test) or is gone with the 14 test files using a proper synchronization; no behavior change otherwise; tests pass; merged; no release needed unless bundled.


---

## autobyteus-147: Split `ProjectTaskService` before it goes over the file-size limit (code-quality refactor, no behavior change)

(created 2026-10-18, status TODO)

Split `ProjectTaskService` before it goes over the file-size limit (code-quality refactor, no behavior change)

Follow-up FU-CR-1 from the code review of autobyteus-71 (project-task-semantic-search, CRR-001), 2026-10-18. Outside that ticket's scope. Should start after autobyteus-71 merges, since that ticket touches the same file.

## Problem
`autobyteus-server-ts/src/projects/services/project-task-service.ts` has exactly 500 effective non-empty lines, which is the team's hard limit. It was already at 498 at base origin/personal @ 55bff1f5ee, and the autobyteus-71 design spec already called it overloaded. To stay at 500, autobyteus-71 put its new dependency field (`searchCleanup`) and that field's comment on one line, with an inline `import()` type (about line 49). Evidence: line counts before and after the change, on branch codex/project-task-semantic-search (and on personal once merged).

## Direction
Split the service along its existing concerns (the reviewer's example: Task reads and views, create/update/delete commands, assignment or execution-resource queries) so it is comfortably under the limit. The team decides the split with the design principles. Restore normal formatting of the `searchCleanup` dependency field. No behavior change; callers keep working.

## Done when
The file and its new parts are comfortably under the size limit, the `searchCleanup` field is formatted normally, no behavior changes, all existing tests stay green, merged. No release needed by itself.
