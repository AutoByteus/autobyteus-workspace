# Requirements — Code-quality leftovers, no behavior change (autobyteus-357)

## Document Status

- Status: `Approved`
- Current solution revision ID: SR-002
- Package: `code-quality-leftovers`; Project Task `autobyteus-357` (merges autobyteus-54, 107, 124, 125, 135, 147, 157, 158, 159, 178)
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`)
- Approved by: **Solution Designer within the direction** (the Task and the user's addition relayed by the PM on 2026-11-01: drop what is gone or not worth it, decide wire-or-remove when the code makes it clear; only product-behavior or scope questions go to the user). No item needs the user. User informed in the Solution Designer's conversation.
- Baseline: this document at SR-002 (SR-001 plus the user's direction of 2026-11-01 on test-held code and the new DESIGN.md rule).

## User Direction (2026-11-01)

After the architecture review showed that `logicalConversationId` is read only by test doubles: "If the tests that are holding us back, we should really do refactoring. Yeah, let's do it. … if you have some tests which are quite old … you cannot use the test or hold you back, because you want to keep up and keep your source code clean … it should be in the design MD".

## Problem And Desired Outcome

Ten small leftovers recorded weeks ago. Desired: each one fixed, or reported as already gone, not applicable or not worth it, with evidence; no behavior change; tests pass; finalized on `origin/personal`; a report listing each item's outcome. No release unless asked.

## Scope Guardrail

### In-Scope (fix)

| ID | Item | What is done |
| --- | --- | --- |
| UC-054 | 54.1–54.4 | Remove `BaseLLM.releaseConversation`, the bounded release step and `logicalConversationId` (autobyteus-ts), and refactor the tests and harnesses that read the label to recognise compaction requests by the prompt the model receives; remove the always-`LLM` `modelKind` from dynamic model sources, the GraphQL `ModelSourceStatus` and the web settings' multi-kind source logic |
| UC-125 | 125.1, 125.2, 125.3, 125.5, 125.6 | Remove dead web launch builders, the unused memory-location method, an unused import, the unreachable Codex admission branch, the unread location field |
| UC-157 | 157 | Rename write-result outcomes in current code |
| UC-159 | 159 | Bring the Team identity/stream sections of the two streaming docs up to the current contract; list other stale doc mentions found |
| UC-178 | 178 | Remove `drainRuntimeReleases`; tests synchronize through a test helper |
| UC-DES | DESIGN.md | Add rule 11: tests follow the code and never hold it back (the user's direction) |
| UC-147 | 147 | Split `ProjectTaskService` below the limit with headroom; format `searchCleanup` normally |

### Dropped or moved out (with evidence in investigation-notes.md)

- 107: dropped (cosmetic; large rename across the delegation path; no gain).
- 124: dropped (already done; no code serves only sub-teams of Team runs).
- 125.4: dropped (already removed, `ccd725cf80`).
- 158: dropped (already moved into the sealed migration area).
- 135: moved out as follow-up FU-001 (changes the public collaboration DTO and ~30 files; its own Task).

### Out Of Scope

Anything else in these areas; frozen migration copies and sealed migrations' names (they keep released names); Task records, run records, any stored data.

### Preserved Behavior Boundary

All product behavior, stored data and APIs except the GraphQL field `ModelSourceStatus.modelKind`, which is removed together with its only reader (this repo's web) in one release (DESIGN rule 9).

### Prerequisites

None.

### Review Authority

Blocking findings cite REQ/AC IDs below; anything changing behavior is a Requirement Gap.

## Requirements

| ID | Requirement | Source |
| --- | --- | --- |
| REQ-001 | Each in-scope item is removed or renamed as listed, with no caller left (search and typecheck). | Task |
| REQ-002 | No user-visible or stored-data behavior changes; the Settings provider sections show the same sources and statuses as before. | Task |
| REQ-003 | `project-task-service.ts` and every new or touched file stay under 500 effective lines; `project-task-service.ts` with clear headroom (target ≤ 470). | DESIGN.md |
| REQ-004 | The report (handoff summary at delivery) lists all ten items with their outcome and evidence. | Task |
| REQ-005 | Server, web and autobyteus-ts test suites and typechecks pass. | Task |
| REQ-006 | No production code keeps anything only tests read; tests that read `logicalConversationId` recognise compaction requests and retries from the requests themselves, with the same assertions as before. | User direction (DESIGN.md rule 11) |
| REQ-007 | `DESIGN.md` states rule 11 with the autobyteus-357 example. | User direction |

## Acceptance Criteria

| ID | REQ | Check |
| --- | --- | --- |
| AC-001 | 001 | `grep` finds no `releaseConversation`, `logicalConversationId`, `DISCOVERY_SETTING_MODEL_KINDS`, source `modelKind`, `buildPreparedAgentLaunch`, `buildPreparedTeamLaunch`, `getTeamAgentRunLocation`, `CODEX_SEGMENT_TURN_OMISSION_UNLISTED`, `drainRuntimeReleases`, current-code `not_renamed` / `renamed_finalization_indeterminate` |
| AC-002 | 002 | Settings → providers: dynamic sources (e.g. LM Studio/Ollama/custom) show their statuses and refresh as before (browser); compaction runs as before (autobyteus-ts compaction tests) |
| AC-003 | 003 | Effective line counts recorded for touched files |
| AC-004 | 005 | `pnpm` typecheck + unit suites for autobyteus-ts, server, web green; server E2E for projects green |
| AC-006 | 006 | `grep -rn logicalConversationId` over autobyteus-ts, autobyteus-server-ts, test-support finds nothing outside archived tickets; the server recovery fixture's 7 suites, the native-input-history suite, the autobyteus-ts compaction tests and the live-e2e harness pass (live e2e: unchanged assertions; run where credentials allow, else typecheck plus the scripted suites) |
| AC-007 | 007 | `DESIGN.md` rule 11 present |
| AC-005 | 001 | The two streaming docs' Team sections match `autobyteus-team-stream-contracts`; no `agent_execution` / `execution_address` left in them |

## Decisions

| ID | Question | Reasoning and decision | Owner | Status |
| --- | --- | --- | --- | --- |
| DEC-001 | 178: wire or remove? | Remove: roots already drain their own queues and stop their runs at shutdown; a drain of stop requests to roots that are stopping adds nothing; the method is test-only (dead by Principle 7). | Solution Designer | Decided |
| DEC-002 | 54.3: keep `modelKind` as an extension point? | No: dynamic sources are LLM-only today; a field that is always one value is dead; adding kinds later adds the field back with a real meaning. | Solution Designer | Decided |
| DEC-003 | 135 in this bundle? | No: it is a contract change across ~30 files; its own Task (FU-001). | Solution Designer | Decided |
