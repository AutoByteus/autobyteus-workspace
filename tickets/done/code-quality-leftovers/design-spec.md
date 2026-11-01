# Design Spec — Code-quality leftovers (autobyteus-357)

## Solution And Approval Basis

- Current solution revision ID: SR-002 (ARCH-REV-001 AR-001…AR-003 and the user's direction on test-held code)
- Approved requirements: `requirements-doc.md` SR-002 (Solution Designer within the direction; 54.2's removal with test refactor and DESIGN.md rule 11 by the user's direction of 2026-11-01).
- Behavior-defining supplements: none.
- User approval of the design: `Not required` (no behavior change; the Task does not ask for it).
- Design status: `Ready`
- Investigation notes: `investigation-notes.md` (item table with file and line for every statement below).
- Authorities read: `references/architecture-design.md`, `references/design-principles.md`, root `DESIGN.md`, `autobyteus-server-ts/docs/design/data_migration_guideline.md` (Sealed migration area).
- Conflicts or discrepancies: none.

## Current-State Read

Each leftover is local to an existing owner (investigation notes, item table). The one structural item is `ProjectTaskService` (`autobyteus-server-ts/src/projects/services/project-task-service.ts`, 494 effective lines): it owns Task reads, commands, DONE closure, the runtime port, and the Task context-draft file operations used only by the REST route `src/api/rest/project-task-context-files.ts` 24–46 (`beginContextDraft` … `readSavedContextFile`, lines 256–282, with the private `assertDraftOwner` 465–469; `assertOwner` 458–464 and `reclaim` 475–481 are shared with create/update).

## Task Size And Architectural Risk (Mandatory)

- Task size: `Large` — many small changes across autobyteus-ts (LLM base, agent loop), the server (llm-management, run-history persistence coordinators, Codex admission, standalone location, agent memory, projects), the web (provider settings store and section, application launch utility), docs, and about 25 test files.
- Architectural risk: `High` — the public GraphQL `ModelSourceStatus` loses `modelKind` (one-release clean cut with its only reader), the autobyteus-ts `BaseLLM` interface loses a method, and `ProjectTaskService` is split (an owner boundary). No stored data, no new behavior.
- Escalation trigger: any search hit of a removed name outside this repo's packages; any stored record carrying a renamed outcome; any behavior difference in Settings or compaction.

## Architecture Investigation Evidence

See `investigation-notes.md` § Item-by-item findings (each row cites the file and line).

## Intended Change

Remove or rename each confirmed leftover; split the Task context-draft operations out of `ProjectTaskService`; update the two streaming docs. Nothing a user sees changes.

## Change Scope (Mandatory)

- In scope: UC-054, UC-125, UC-157, UC-159, UC-178, UC-147 (requirements doc).
- Derived consumers: GraphQL `ModelSourceStatus` → web query `llm_provider_queries.ts` 17, `llmProviderConfigSupport.ts` 62, `llmProviderConfig.ts` 58–354, `useProviderApiKeySectionRuntime.ts`, `useRuntimeScopedModelSelection.ts`, the e2e probe mocks `tests/e2e/fresh-run-auto-approval-probe.mjs` and `existing-run-model-config-probe.mjs`, generated GraphQL types, their tests, and server doc `llm_management.md` 91 (AR-003a); `logicalConversationId` → the test readers listed in investigation notes 54.2; write-result outcome type → every coordinator and manager that switches on it (15 current files, list in notes); `BaseLLM` → `LlmPhaseSummaryPort` and the three autobyteus-ts tests.
- Deliberately left alone: frozen copies and sealed migrations keep `not_renamed` / `renamed_finalization_indeterminate` (released names, Data Migration Guideline); `ModelKind` (used for model availability); the collaborator names (107); team scope structures (124); `TaskTeamExecution.taskExecutions` (135 → FU-001).
- Follow-ups: FU-001.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior | Kind | REQ/AC | Path | Outcome |
| --- | --- | --- | --- | --- |
| Compaction release step | System | REQ-001/002; AC-001/002 | `LlmPhaseSummaryPort` → `BaseLLM.releaseConversation` (no-op) | Removed; compaction unchanged |
| Provider settings sources | User | REQ-001/002; AC-002 | `DynamicModelSourceLifecycle` → GraphQL → `llmProviderConfig` store → provider section | Same sources and states, no kind |
| Persistence write results | System | REQ-001/002 | writer → coordinators/managers | Same outcomes, new names |
| Task context drafts (REST) | User | REQ-002/003 | REST route → draft operations | Same, new owner |
| DONE closure release | System | REQ-002 | `ProjectTaskService.update` → `TaskExecutionResourceRelease` | Same; only the test-only drain goes |

## Relevant Supplemental Task Artifacts

| Artifact | Relationship |
| --- | --- |
| `merged-task-texts.md` | The ten original Task texts |
| `follow-ups.md` | FU-001 (item 135) |

## Task Design Health Assessment (Mandatory)

- Change posture: Cleanup (with one Refactor, 147).
- Current design issue found: Yes.
- Structural triggers that fire: Legacy cleanup / dead code (Principles 7, 8): 54.1–54.4, 125.x, 178; Vocabulary drift (Principle 15): 157 (names say "renamed" for appends); Responsibility overload / file size (Principle 12): 147. Ruled out: persisted-data transition (no stored names change; 157's names are runtime results only).
- Root cause: `Legacy Or Compatibility Pressure` (leftovers of removed features), `File Placement Or Responsibility Drift` (147).
- Refactor needed now: Yes (147), in this change.
- Intentional deferrals: 135 (FU-001), with reason in the requirements.

## Terminology

- `not_committed` / `finalization_indeterminate`: a persistence write did not commit / committed but its finalization (rename or append sync) could not be confirmed. Replace `not_renamed` / `renamed_finalization_indeterminate` in current code. No project glossary entry needed (code-internal result names).

## Legacy Removal Policy (Mandatory)

- Obsolete paths: Removal Plan below.
- Compatibility wrappers kept: None. (Sealed migrations and frozen copies keep their own released names by rule; they are not current code.)

## Persisted Data / State Transition Decision (Mandatory)

`Not Affected`: no stored file, record or name changes.

## Data-Flow Spine Inventory

| Spine | Scope | Start | End | Owner |
| --- | --- | --- | --- | --- |
| DS-001 | Primary | REST context-draft request | Draft file operation result | `ProjectTaskContextDrafts` (new) |
| DS-002 | Primary | Settings provider section load/refresh | Source statuses shown | `llmProviderConfig` store (unchanged owner) |

Other items remove dead nodes from existing spines; no new spine.

## Primary Execution Spine(s)

- DS-001: `REST route (project-task-context-files.ts) → ProjectTaskContextDrafts (ownership check, reclaim) → ProjectTaskContextStore → reply`
- DS-002: `provider section → llmProviderConfig store → GraphQL modelSourceStatuses → DynamicModelSourceLifecycle.status(key, modelCount)`

## Spine Narratives (Mandatory)

| Spine | Narrative | Owner |
| --- | --- | --- |
| DS-001 | The route calls the drafts owner instead of `ProjectTaskService`. It checks Project and Task (or the draft's Task) exist, reclaims unpublished bytes on begin for an existing Task, and calls the context store, exactly as today. | `ProjectTaskContextDrafts` |
| DS-002 | Sources are all LLM sources: the store refreshes every source after a discovery-setting change instead of filtering by kind; the server status has no kind. | `llmProviderConfig` store |

## Spine Actors / Main-Line Nodes

DS-001: route, `ProjectTaskContextDrafts`, `ProjectTaskContextStore`. DS-002: provider section, store, resolver, `DynamicModelSourceLifecycle`.

## Ownership Map

- `ProjectTaskContextDrafts` (new, `src/projects/services/project-task-context-drafts.ts`): the six draft/saved-context file operations and the draft ownership check. Constructed like `ProjectTaskService`: optional `store` and `contextStore` dependencies defaulting to `getProjectStore()` / `getProjectTaskContextStore()`; the REST route gets the process instance through `getProjectTaskContextDrafts()` (a singleton accessor beside `getProjectTaskService()`, with `resetProjectTaskContextDraftsForTests()`), as it gets the service today (AR-003b). `TaskContextOwnership` takes the same `store` / `contextStore` getters from its owner.
- `TaskContextOwnership` (new, `src/projects/services/task-context-ownership.ts`): `assertOwner(projectId, taskId?)` and `reclaimUnpublished(projectId, taskId)` (today's private `assertOwner` and `reclaim`), shared by `ProjectTaskService` (create/update) and `ProjectTaskContextDrafts`. One owner of these two checks.
- `ProjectTaskService`: Task reads, commands, DONE closure, runtime port (unchanged otherwise).

## Thin Entry Facades / Public Wrappers

| Facade | Owner | Must not own |
| --- | --- | --- |
| REST `project-task-context-files.ts` | `ProjectTaskContextDrafts` | Ownership rules |

## Removal / Decommission Plan (Mandatory)

| Item | Why unnecessary | Replaced by |
| --- | --- | --- |
| `BaseLLM.releaseConversation` (`autobyteus-ts/src/llm/base.ts` 219–221) and the bounded release step + its timeout in `llm-phase-summary-port.ts` ~180–195; test stand-ins | Dead: no override (54.1) | — |
| `logicalConversationId` in `conversation-request.ts` 11, `llm-phase-summary-port.ts` 128, deny-list `provider-request-kwargs.ts` 2, and the `base.ts` doc mention | No production reader; only test doubles read it (54.2, DESIGN.md rule 11) | Test doubles recognise compaction requests by content (below) |
| `TaskExecutionResourceRelease.drain` and `inFlight` (`task-execution-resource-release.ts` 9, 13–20) | Only `drainRuntimeReleases` used them (AR-002) | — |
| `modelKind` on `DynamicSourceSpec`, `ModelSourceStatus` (server domain, lifecycle `status(key, modelKind, …)`, catalog-service 218/239/266, GraphQL type 66) | Always `LLM` (54.3) | — |
| Web `DISCOVERY_SETTING_MODEL_KINDS`, `affectedKinds` filtering, `modelKind` on the source status type and query | Same (54.4) | Refresh every source |
| `buildPreparedAgentLaunch`, `buildPreparedTeamLaunch` (`autobyteus-web/utils/application/applicationLaunch.ts` 77–~95) | Dead (125.1) | — |
| `AgentMemoryLocationService.getTeamAgentRunLocation` + test | Dead (125.2) | — |
| `buildTeamCommunicationMessageId` in the import of the sealed migration (125.3) | Unused name | — |
| `CODEX_SEGMENT_TURN_OMISSION_UNLISTED` branch + reason + test case (125.5) | Unreachable | — |
| `LocatedStandaloneRootAgentExecution.launchConfiguration` + computation + test assertion (125.6) | Unread | `locatedExecutionSource` (existing owner) |
| `ProjectTaskService.drainRuntimeReleases` (178) | Test-only | Test helper `tests/support/project-task-release-tracker.ts` (a `requestRelease` fake that records each call's promise; `settled()` awaits them and then one more macrotask, so the release's stop-result logging after the request promise has run; AR-002), used by the 18 test files |
| Context-draft methods and `assertDraftOwner` in `ProjectTaskService` (147) | Moved | `ProjectTaskContextDrafts` |
| Inline `import()` type for `searchCleanup` (147) | Formatting | Normal import and field |

## Return Or Event Spine(s)

N/A.

## Bounded Local / Internal Spines

N/A.

## Off-Spine Concerns Around The Spine

| Concern | Serves | Note |
| --- | --- | --- |
| `TaskContextOwnership` | `ProjectTaskService`, `ProjectTaskContextDrafts` | Shared checks, one owner |

## Ownership Boundaries

The REST route depends only on `ProjectTaskContextDrafts`; neither it nor `ProjectTaskService` reaches into the other's internals; both use `TaskContextOwnership` and `ProjectTaskContextStore`.

## Boundary Encapsulation Map

| Boundary | Callers | Forbidden bypass |
| --- | --- | --- |
| `ProjectTaskContextDrafts` | REST route, tests | Route calling `ProjectTaskContextStore` directly |

## Dependency Rules

New code: `api/rest → projects/services/project-task-context-drafts`; `project-task-context-drafts → task-context-ownership, project-task-context-store, project-store`. No other changes.

## Interface Boundary Mapping

| Interface | Change |
| --- | --- |
| GraphQL `ModelSourceStatus` | `modelKind` removed |
| `DynamicModelSourceLifecycle.status(key, modelCount)` | `modelKind` parameter removed |
| `BaseLLM` | `releaseConversation` removed |
| `ProjectTaskContextDrafts.{begin, upload, readDraftFile, removeDraftFile, discard, readSavedFile}` | Same signatures as today's six methods (names may stay as they are, e.g. `beginContextDraft`) |

## Interface Boundary Check

All singular, explicit identities (Project ID, draft ID, Task ID); no ambiguity.

## Main Domain Subject Naming Check

| Subject | Name | Note |
| --- | --- | --- |
| Write results | `not_committed`, `finalization_indeterminate` | Fixes vocabulary drift (157) |
| Drafts owner | `ProjectTaskContextDrafts` | Matches `ProjectTaskContextStore` |

## Existing Capability / Subsystem Reuse Check

Reuse `ProjectTaskContextStore`, `ProjectStore`; no new capability.

## Subsystem / Capability-Area Allocation

autobyteus-ts (llm, agent loop), server (llm-management, run-history store and coordinators, agent-execution codex, standalone-agent-run-root, agent-memory, projects services, api/rest, api/graphql), web (stores, settings section, utils), docs.

## Draft File Responsibility Mapping

See Final.

## Reusable Owned Structures Check

| Structure | File | Note |
| --- | --- | --- |
| Ownership check + reclaim | `task-context-ownership.ts` | Shared by two services |
| Release tracker (tests) | `tests/support/project-task-release-tracker.ts` | Replaces the test-only drain in 18 test files |

## Shared Structure / Data Model Tightness Check

`ModelSourceStatus` loses a single-valued field (tighter). Write-result union renamed, same members.

## Final File Responsibility Mapping

| File | Change |
| --- | --- |
| `autobyteus-ts/src/llm/base.ts`, `src/agent/loop/llm-phase-summary-port.ts`, `conversation-request.ts`, `src/llm/api/provider-request-kwargs.ts`; the test readers and docs listed in investigation notes 54.2 (~20 test/support files, 4 autobyteus-ts docs); new compaction-request helpers in autobyteus-ts test support and server test support (and the live-e2e harness) | 54.1–54.2 |
| `DESIGN.md` rule 11 | Done in this revision by the Solution Designer (user direction) |
| `autobyteus-server-ts/src/llm-management/llm-providers/domain/models.ts`, `services/dynamic-model-source-lifecycle.ts`, `services/model-catalog-service.ts`, `api/graphql/types/llm-provider-model-catalog.ts`; tests | 54.3 |
| `autobyteus-web/stores/llmProviderConfig.ts`, `llmProviderConfigSupport.ts`, `graphql/queries/llm_provider_queries.ts`, `components/settings/providerApiKey/useProviderApiKeySectionRuntime.ts`, generated types; tests | 54.4 |
| `autobyteus-web/utils/application/applicationLaunch.ts` | 125.1 |
| `autobyteus-server-ts/src/agent-memory/services/agent-memory-location-service.ts` + test | 125.2 |
| `.../migrations/team-communication-projection-address/team-communication-projection-address-migration.ts` | 125.3 |
| `.../codex/thread/codex-segment-turn-admission.ts` + test | 125.5 |
| `.../standalone-agent-run-root/services/standalone-root-location-service.ts` + test 300 | 125.6 |
| 157 tests: a test value follows the code it feeds (AR-003c): rename where the test drives current code (unit tests under `tests/unit/**` listed in the notes, and migration tests that drive current code such as `tests/app-data-migrations/team-context-file-execution-locators-v1/team-context-file-execution-locators-v1.test.ts`, which uses current `MessageLog`); keep released names where a stub feeds a frozen writer or a sealed migration (check each of `agent-org-context-file-locator-transition`, `collaborators-to-delegated-runs-v1`, `delegated-copy-own-file-complete-v1`, `task-agent-own-run-v1` tests by its import) | Modify | 157 |
| `run-history/store/{atomic-run-package-file-commit-writer,message-log,task-agent-message-logs,task-execution-tree-split}.ts`, `run-history/services/agent-org-run-history-catalog-service.ts`, `agent-org-execution/services/{agent-org-run-persistence-coordinator,agent-org-run-manager}.ts`, `agent-team-execution/services/{team-run-persistence-coordinator,agent-team-run-manager}.ts`, `standalone-agent-run-root/services/{standalone-root-persistence-coordinator,standalone-agent-run-root-manager}.ts`; tests | 157 (current code only) |
| `docs/design/agent_websocket_streaming_protocol.md`, `docs/modules/agent_streaming.md` (Team identity / stream contract / commands); other docs with `agent_execution` / `execution_address` (`streaming_parsing_architecture.md`, `ARCHITECTURE.md`, `features/artifact_file_serving_design.md`, `features/task_agent_identity_future_improvements.md`, `modules/{agent_orgs,agent_team_execution,run_history,remote_collaboration,codex_integration}.md`): fix where they describe the removed shapes; leave links to `agent_execution.md` and other true uses | 159 |
| `projects/services/project-task-service.ts` (drafts out, drain out, `searchCleanup` formatted), `projects/services/project-task-context-drafts.ts` (new), `projects/services/task-context-ownership.ts` (new), `api/rest/project-task-context-files.ts`; tests (3 context tests, 18 drain users, `tests/support/project-task-release-tracker.ts` new) | 147, 178 |

## Applied Patterns

None new.

## Target Subsystem / Folder / File Mapping

As above; new server files in `src/projects/services/`, test helper in `tests/support/`.

## Folder Boundary Check

No new folders.

## Concrete Examples / Shape Guidance

| Topic | Good | Avoided |
| --- | --- | --- |
| 54.2 test doubles | One helper per package's test support, `isCompactionSummaryRequest(messages)`: true when a message's content is `COMPACTION_SUMMARY_PROMPT` (transcript mode, system message) or the last message's content is `COMPACTION_SUMMARY_INSTRUCTION` (cached mode); both imported from `autobyteus-ts/memory/compaction/compaction-summary-prompt.js`. Retries: a double keeps `lastWasCompaction`; a compaction request right after a compaction request is the next attempt of the same operation, so the recovery fixture still calls `compress` once per operation: `if (isCompactionSummaryRequest(messages)) { if (!this.lastWasCompaction) this.operationOutcome = this.compress(); this.lastWasCompaction = true; yield …await this.operationOutcome… } else { this.lastWasCompaction = false; … }`. The live-e2e harness splits invocations and responses with the same helper and matches summary attempts by order (line 928). Provider tests drop the label from their inputs and their "stripped" assertions. | Reading `kwargs.logicalConversationId` | Rule 11: tests observe what the model receives |
| 178 tests | `const releases = trackReleases(); new ProjectTaskService({…, requestRelease: releases.request}); …; await releases.settled();` | A production method only tests call |
| 157 | `return { outcome: "not_committed" }` in current writers; frozen copies keep `"not_renamed"` | Renaming inside `app-data-migrations/frozen/**` or sealed migrations |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Decision |
| --- | --- |
| Keep `modelKind` always `LLM` for "future kinds" | Rejected (DEC-002) |
| Keep `drainRuntimeReleases` "for shutdown" | Rejected (DEC-001) |
| Alias old outcome names | Rejected (clean rename) |

## Derived Layering

N/A.

## Change / Refactor Sequence

1. 147 split (no behavior change) with 178 and the test helper; tests green.
2. 157 rename; tests green.
3. 54.1–54.2 (autobyteus-ts, with the test-double refactor first, so the doubles pass before the label is removed), then 54.3–54.4 (server + web, regenerate GraphQL types); tests and a Settings browser check.
4. 125.x removals.
5. 159 docs.
6. Record effective line counts and the AC-001 searches in the implementation handoff.

## Key Tradeoffs

- 135 deferred to keep this bundle free of contract-wide changes in the delegation area.
- The `ProjectTaskService` split takes the drafts concern (a clear REST facade) rather than the runtime port, which would touch ~30 test files; target ≤ 470 effective lines.

## Risks

- Parallel teams (318, 345, 358, 285, 337, 355) may touch `project-task-service.ts` or the persistence coordinators; delivery re-integrates.
- Sealed migrations importing current code would carry the old names: verified they import frozen copies (boundary test).

## Guidance For Implementation

- Reproduction: `None` (no defect).
- Start each item by re-running its search from the investigation notes; if any item's code changed since `efd28d5c4a`, report it rather than adapting silently.
