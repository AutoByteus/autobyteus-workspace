# Investigation Notes

## Investigation Status

- Bootstrap Status: Complete
- Current Status: Root cause identified; requirements refined after user clarified no backward compatibility; revised design spec produced.
- Investigation Goal: Explain why a valid-looking delegated task reference file returns HTTP 400 in Team > Tasks and define the clean-cut fix.
- Scope Classification (`Small`/`Medium`/`Large`): Medium
- Scope Classification Rationale: Spans task-delegation tool input validation, task record/reference persistence, backend content readback, adjacent Team Communication reference policy, tool descriptions, runtime instructions, and tests.
- Scope Summary: Task-delegation reference inputs must be brought into the same absolute-local-file invariant that content readback and message references already use.
- Primary Questions To Resolve:
  - What endpoint is called when clicking a Team > Tasks reference file? Resolved: `TeamTaskReferenceViewer.vue` builds `/team-runs/:teamRunId/task-delegations/:taskId/references/:referenceId/content`.
  - Why does the endpoint return 400? Resolved: the stored task reference path is relative and `TaskDelegationReferenceContentService` rejects non-absolute paths as `INVALID_REFERENCE_PATH`.
  - How do message reference files work? Resolved: `send_message_to.reference_files` requires absolute local file paths in tool descriptions and validation before persistence; the message content service is also absolute-only.
  - Should task references support relative paths? Resolved by user clarification: no. Task references should mimic message references and require absolute local file paths; no backward compatibility is required.

## Request Context

User initially reported: “the teacher actually called delegate task, and then the task has reference file. i actually checked the file, the file exists, but why on the frontend, when i click the file itself, it shows the file reference content 400”. Screenshots showed:

- Team > Tasks details panel for a delegated `task_team` task with reference `math_problem_train_bird.txt` displays `Error! Failed to fetch reference content (400)`.
- Files tab search for `math_problem` opens `math_problem_train_bird.txt` successfully.

User then asked why references must be absolute and how backend message-reference fetching works. After comparison with `send_message_to`, user clarified: “no, we do not need backward compatibility,” and asked to update the design principles-based artifacts.

Provided image files:

- `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_a346fa4fad27444ab706057ad4949640/solution_designer_9345f64feab84ebe891e27d9542bd091/context_files/ctx_cd5459d3075a__image.png`
- `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_a346fa4fad27444ab706057ad4949640/solution_designer_9345f64feab84ebe891e27d9542bd091/context_files/ctx_092aebc72b0e__image.png`

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/reference-file-content-400`
- Current Branch: `codex/reference-file-content-400`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo`
- Bootstrap Base Branch: `origin/personal`
- Remote Refresh Result: `git fetch --prune origin` succeeded on 2026-07-05.
- Task Branch: `codex/reference-file-content-400` aligned to `origin/personal` commit `1b5f6d435d9697db7d16548c429e1c2914aca00a` during bootstrap.
- Expected Base Branch: `origin/personal`
- Expected Finalization Target: `personal`
- Bootstrap Blockers: None.
- Notes For Downstream Agents: Work must remain in the dedicated task worktree/branch, not the shared `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo` checkout.

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-07-05 | Command | `pwd && git rev-parse --show-toplevel && git status --short --branch && git remote -v && git branch --show-current && git symbolic-ref refs/remotes/origin/HEAD` | Bootstrap repository state | Shared checkout is git repo on `personal`, remote default `origin/personal`, with unrelated untracked files. | No |
| 2026-07-05 | Command | `git fetch --prune origin`; `git worktree add /Users/normy/autobyteus_org/autobyteus-workspace-superrepo -b codex/reference-file-content-400 origin/personal`; later reset to latest `origin/personal` | Create and align dedicated task worktree/branch | Dedicated branch/worktree created and aligned to latest tracked remote state. | No |
| 2026-07-05 | Code | `autobyteus-web/components/workspace/team/TeamTaskReferenceViewer.vue` | Verify frontend content route construction | Builds task-owned content URL from `teamRunId`, `taskId`, and `reference.referenceId`; no raw path is sent. | No |
| 2026-07-05 | Code | `autobyteus-web/components/workspace/team/TeamReferenceFileViewer.vue` | Verify fetch and error display | Uses `authorizedFetch(contentUrl)` and displays `Failed to fetch reference content (${response.status})`; screenshot matches backend 400. | No |
| 2026-07-05 | Code | `autobyteus-server-ts/src/api/rest/task-delegation.ts` | Verify REST route and error mapping | Task route delegates to `TaskDelegationReferenceContentService`; `INVALID_REFERENCE_PATH` maps to HTTP 400. | No |
| 2026-07-05 | Code | `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-reference-content-service.ts` | Verify task reference content resolver | After resolving task reference identity, service rejects `!path.isAbsolute(resolved.reference.path)` with `INVALID_REFERENCE_PATH`; it is already absolute-only at readback. | No |
| 2026-07-05 | Code | `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-reference-file.ts` | Verify task reference record construction | Normalizes/stores paths without requiring absolute paths; builds `referenceId` from the normalized path. | No |
| 2026-07-05 | Code | `autobyteus-server-ts/src/agent-tools/task-delegation/task-delegation-tool-input-parsers.ts` | Verify task tool input validation | `reference_files` is parsed as `z.array(nonEmptyString(...)).default([])` for delegate/submit/review; no absolute-path validation exists. | No |
| 2026-07-05 | Code | `autobyteus-server-ts/src/agent-tools/task-delegation/task-delegation-tool-parameter-schemas.ts`; `autobyteus-server-ts/src/agent-team-execution/services/member-run-instruction-composer.ts` | Verify tool-facing task reference wording | Task schema descriptions are vague (`file/artifact paths or references`); runtime instructions mention optional `reference_files` but do not state absolute-only. | No |
| 2026-07-05 | Code | `autobyteus-server-ts/src/agent-communication/services/send-message-to-tool-contract.ts`; `autobyteus-server-ts/src/agent-tools/agent-communication/send-message-to-parameter-schema.ts` | Verify `send_message_to` tool description | Tool description and `reference_files` field description explicitly require absolute/absolute local file paths. | No |
| 2026-07-05 | Code | `autobyteus-server-ts/src/agent-communication/services/send-message-to-tool-argument-parser.ts`; `autobyteus-server-ts/src/agent-communication/services/agent-communication-reference-files.ts` | Verify message tool validation | `send_message_to.reference_files` validation rejects relative paths and returns an invalid-reference-files error requiring absolute local path strings. | No |
| 2026-07-05 | Code | `autobyteus-server-ts/src/api/rest/team-communication.ts`; `autobyteus-server-ts/src/services/team-communication/team-communication-content-service.ts`; `autobyteus-server-ts/src/services/team-communication/team-communication-reference-files.ts`; `autobyteus-server-ts/src/services/team-communication/team-communication-normalizer.ts`; `autobyteus-server-ts/src/services/team-communication/team-communication-identity.ts` | Compare message reference content fetching | Message reference content is fetched by identity and then served only if the stored path is absolute; projection normalization also uses absolute-path validation for explicit references. | No |
| 2026-07-05 | Data | `/Users/normy/.autobyteus/server-data/memory/agent_teams/nested_classroom_test_team_7d4b889e2d1a4d1aaaedc5414733676a/task_delegation_records.json` | Inspect failing task record | `task_0001` stores `referenceFiles[0].path = "math_problem_train_bird.txt"` and `referenceId = "task-reference:0:math_problem_train_bird.txt"`. | No |
| 2026-07-05 | Data | `/Users/normy/.autobyteus/server-data/memory/agent_teams/nested_classroom_test_team_7d4b889e2d1a4d1aaaedc5414733676a/team_run_metadata.json`; `/Users/normy/.autobyteus/server-data/temp_workspace/math_problem_train_bird.txt` | Confirm file existence and workspace context | The file exists at the workspace-resolved absolute path, but the clean-cut decision is not to support relative task reference readback. | No |
| 2026-07-05 | Trace | Teacher and StudentStudyGroup raw traces under the failing team run memory folder | Understand how relative reference was produced/used | Teacher created and delegated `math_problem_train_bird.txt`; student could read it from workspace cwd. This explains the mismatch but does not change the refined target behavior. | No |
| 2026-07-05 | Doc | `/Users/normy/autobyteus_org/autobyteus-agents/agent-teams/software-engineering-team/agents/solution-designer/skills/solution-designer/design-principles.md` | Re-read at user request before revision | Principles require clean-cut target design, no backward compatibility/legacy retention, explicit removals, spine-first ownership, and avoiding duplicated policies. | No |
| 2026-07-05 | Command | `git restore -- ... && rm -f ... && git status --short` | Remove obsolete workspace-relative draft implementation from the worktree | Reset stale workspace-relative resolver/code/test draft so implementation can follow the revised absolute-only design. | No |

## Current Behavior / Current Flow

- Current entrypoint or first observable boundary: Team > Tasks task reference row click in the frontend.
- Current execution flow:
  1. `TeamTaskReferenceViewer.vue` builds `/team-runs/:teamRunId/task-delegations/:taskId/references/:referenceId/content` from task identity.
  2. `TeamReferenceFileViewer.vue` calls `authorizedFetch(contentUrl)`.
  3. `registerTaskDelegationRoutes()` calls `TaskDelegationReferenceContentService.resolveContent({ teamRunId, taskId, referenceId })`.
  4. The content service resolves the task reference from active or persisted task records.
  5. The content service rejects non-absolute `resolved.reference.path` as `INVALID_REFERENCE_PATH` before checking file existence/readability.
- Creation-side mismatch:
  - `delegate_task`, `submit_task_result`, and `review_task_result` parsers accept any non-empty reference path strings.
  - Task tool descriptions do not state absolute-only.
  - Therefore a relative path can be persisted even though content readback cannot serve it.
- Current behavior summary: task reference readback has an absolute-only invariant, but task reference input does not enforce it.

## Message Reference Backend Comparison

Message references work differently because their absolute-only invariant is enforced end-to-end:

1. `send_message_to` tool and field descriptions tell agents to provide absolute local file paths.
2. `send-message-to-tool-argument-parser.ts` calls `normalizeExplicitAgentCommunicationReferenceFiles()` and rejects relative paths before dispatch.
3. Team communication projection normalization uses equivalent absolute-path validation for explicit references.
4. `TeamCommunicationContentService.resolveContent()` fetches by `teamRunId + messageId + referenceId`, then rejects non-absolute stored paths as invalid.

Conclusion: task delegation should not add workspace-relative readback. It should mimic the message contract by validating absolute local reference paths before persistence.

## Design Health Assessment Evidence

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Bug Fix + Behavior Tightening
- Candidate root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Missing Invariant; Duplicated Policy Or Coordination
- Refactor posture evidence summary: A shared absolute-local-reference validation owner is preferable to copying the existing agent/team communication validators into task delegation.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| User screenshots | Files tab opens the file; task reference preview returns 400. | The task reference record is not valid for the content endpoint despite the file existing. | Enforce valid task references at input. |
| Persisted task record | Stored path is `math_problem_train_bird.txt`, not absolute. | Task delegation currently persists a reference path shape that readback rejects. | Reject this at tool input going forward. |
| Task content service | Has absolute-only guard that throws `INVALID_REFERENCE_PATH`. | Readback invariant already exists. | Keep it. |
| Task parsers | Only validate non-empty strings. | Missing input invariant. | Add absolute local path validation. |
| `send_message_to` contract/parser | Explicitly documents and enforces absolute local paths. | Existing successful contract to mimic. | Reuse/extract validator. |
| Design principles | No backward compatibility/legacy retention; removal is first-class. | Do not add relative fallback. | Record removal/rejection explicitly. |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-web/components/workspace/team/TeamTaskReferenceViewer.vue` | Task-owned wrapper that builds content URL from task identity. | Correctly uses `teamRunId + taskId + referenceId`. | Keep frontend route shape unchanged. |
| `autobyteus-web/components/workspace/team/TeamReferenceFileViewer.vue` | Generic viewer that fetches reference content. | Displays backend status as `Failed to fetch reference content (400)`. | No root-cause change needed. |
| `autobyteus-server-ts/src/api/rest/task-delegation.ts` | REST route and error mapping for task reference content. | Maps `INVALID_REFERENCE_PATH` to 400. | Keep mapping. |
| `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-reference-content-service.ts` | Resolves task reference identity to file stream. | Already absolute-only at readback. | Keep absolute-only; do not add workspace resolver. |
| `autobyteus-server-ts/src/agent-tools/task-delegation/task-delegation-tool-input-parsers.ts` | Parses delegate/submit/review task tool inputs. | Missing absolute local path validation. | Primary task-side validation insertion point. |
| `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-reference-file.ts` | Builds task reference records and IDs. | Assumes incoming reference files are already valid. | Store normalized absolute paths from parser/service boundary. |
| `autobyteus-server-ts/src/agent-tools/task-delegation/task-delegation-tool-parameter-schemas.ts` | Task tool parameter descriptions. | Current reference wording is too vague. | Update to absolute local file paths. |
| `autobyteus-server-ts/src/agent-team-execution/services/member-run-instruction-composer.ts` | Runtime instruction text for team/task tools. | Task protocol does not specify absolute-only references. | Add explicit absolute-path guidance. |
| `autobyteus-server-ts/src/agent-communication/services/agent-communication-reference-files.ts` and `autobyteus-server-ts/src/services/team-communication/team-communication-reference-files.ts` | Existing absolute-path validators for message references. | Nearly duplicate each other. | Extract/reuse shared explicit absolute local reference-file validation. |

## Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-07-05 | Trace | Teacher raw trace `call_00_MU9guUXgESWHS20RKxEh4861` | Teacher created `math_problem_train_bird.txt` in workspace cwd. | Explains why relative path felt valid at runtime. |
| 2026-07-05 | Trace | Teacher raw trace `call_00_bpdpRgueT6f6q9hZXEsr6559` | Teacher called `delegate_task` with `reference_files:["math_problem_train_bird.txt"]`. | This input must be rejected after fix. |
| 2026-07-05 | Trace | Student raw trace `call_00_uXIgsOWj3dmKInklO6rt5324` | Student read `cat math_problem_train_bird.txt` from workspace cwd. | Runtime cwd support is not the same as reference-file attachment contract. |
| 2026-07-05 | Probe | Local Python inspection of record/workspace/file | Workspace-resolved file exists and is readable. | Confirms 400 is path-shape validation, not missing file. |

## External / Public Source Findings

- Public API / spec / issue / upstream source: None used.
- Version / tag / commit / freshness: N/A
- Relevant contract, behavior, or constraint learned: N/A
- Why it matters: N/A

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: No running server required for root-cause proof; persisted task record, metadata, and file are present under `/Users/normy/.autobyteus/server-data`.
- Required config, feature flags, env vars, or accounts: Default local AutoByteus memory/config.
- External repos, samples, or artifacts cloned/downloaded for investigation: None.
- Setup commands that materially affected the investigation: Dedicated worktree creation and later cleanup of obsolete workspace-relative draft code.
- Cleanup notes for temporary investigation-only setup: Obsolete workspace-relative draft implementation/test files were removed from the worktree; only ticket artifacts remain untracked.

## Findings From Code / Docs / Data / Logs

Root cause chain under the refined absolute-only contract:

1. Message references already have a coherent contract: tool description, parser validation, persistence normalization, and content readback all require absolute local file paths.
2. Task reference content readback is already absolute-only, but task-delegation tool input is not.
3. The teacher passed a relative reference path, so task delegation persisted a record that the content endpoint correctly classifies as invalid.
4. The file exists in the workspace, but the clean-cut target behavior is not to infer workspace context for task references.
5. The fix is to reject relative task `reference_files` before persistence and clarify all task-delegation tool guidance.

## Constraints / Dependencies / Compatibility Facts

- Route callers must not supply arbitrary raw filesystem paths; content readback remains task-identity-owned.
- Task `reference_files` must become absolute-only like `send_message_to.reference_files`.
- No backward compatibility: existing relative task records may remain invalid and no workspace-root fallback or migration is required.
- Existing message reference behavior must not regress.
- Avoid adding a third duplicated validator; make one absolute local reference-file validation owner or shared structure.

## Open Unknowns / Risks

- Existing historical relative task records will continue to show 400. This is accepted by the user's no-backward-compatibility clarification.
- Refactoring message validators into a shared owner may require updating unit-test imports/expectations without changing runtime behavior.
- If an agent writes a file with a relative path, it must obtain the absolute path before using it as a task reference.

## Notes For Architect Reviewer

Review the revised design against the no-backward-compatibility principle. The intended owner is an absolute local reference-file validation boundary reused by task delegation and message references. Task reference content readback should remain absolute-only; do not approve workspace-relative task reference fallback/resolution for this scope.

## Post-Review Cleanup Verification

Architecture review round 2 reported AR-001: the worktree still contained superseded workspace-relative implementation files despite the rework note saying they were cleaned. This finding was correct at the time of review.

Corrective action completed on 2026-07-05:

- Restored stale tracked files from `HEAD`:
  - `autobyteus-server-ts/src/agent-team-execution/services/member-run-instruction-composer.ts`
  - `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-reference-content-service.ts`
  - `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-reference-file.ts`
  - `autobyteus-server-ts/src/agent-tools/task-delegation/task-delegation-tool-parameter-schemas.ts`
  - `autobyteus-server-ts/tests/unit/agent-team-execution/task-delegation-reference-content-service.test.ts`
  - `autobyteus-server-ts/tests/unit/api/task-delegation-route.test.ts`
- Removed untracked superseded workspace-relative files:
  - `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-reference-path.ts`
  - `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-reference-workspace-resolver.ts`
  - `autobyteus-server-ts/tests/integration/api/task-delegation-reference-content-api.integration.test.ts`

Verification after cleanup:

- `git diff --stat -- autobyteus-server-ts` is empty.
- `git status --short --branch --untracked-files=all` shows only ticket artifacts as untracked.
- `TaskDelegationReferenceContentService` is back to the base absolute-only implementation and has no workspace metadata resolver dependency.

The source tree is now pre-implementation/base state. The absolute-only task schema/runtime wording remains required implementation work per the revised design; no stale workspace-relative implementation remains.
