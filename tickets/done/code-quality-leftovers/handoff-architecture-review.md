# Handoff — Architecture Design Complete: code-quality-leftovers (autobyteus-357)

- From: Solution Designer (run `solution_designer_7591e3d191704d25a3396b3020a41127`); to: architecture reviewer (rule: Large or High).
- Task: autobyteus-357 (Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`), from `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`). Ten older Tasks merged: 54, 107, 124, 125, 135, 147, 157, 158, 159, 178.
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/code-quality-leftovers`, branch `codex/code-quality-leftovers`, base `origin/personal` `efd28d5c4a`; finalization target `origin/personal`; no release unless asked.
- Result: `Architecture Design Complete`, task_size **Large**, architectural_risk **High**; SR-001.
- Approval: requirements approved by the Solution Designer within the direction (the user, via the PM: drop what is gone or not worth it; decide wire-or-remove when clear). No behavior change; no user decision needed.
- Documents: `requirements-doc.md`, `investigation-notes.md` (item table with evidence), `design-spec.md`, `solution-revision-record.md`, `follow-ups.md` (FU-001 = item 135), `merged-task-texts.md`.
- Look closely at: the `ProjectTaskService` split (drafts out, shared `TaskContextOwnership`, ≤ 470 target), the removal of `drainRuntimeReleases` with a test release tracker (DEC-001), the GraphQL `modelKind` removal (DEC-002), the 157 rename limited to current code (sealed/frozen keep released names), and the dropped/moved items' evidence.
- Expected next step: architecture review; on pass, implementation.

## Re-review request — SR-002 (2026-11-01)

| Finding | Resolution |
| --- | --- |
| AR-001 | Notes 54.2 corrected with every test, support file and doc reading `logicalConversationId`. The user decided (2026-11-01): remove it and refactor the tests ("If the tests that are holding us back, we should really do refactoring"). Test doubles use a `isCompactionSummaryRequest(messages)` helper based on the exported `COMPACTION_SUMMARY_PROMPT` / `COMPACTION_SUMMARY_INSTRUCTION`; retries are counted by the double (example in design § Concrete Examples); the live-e2e harness matches summary attempts by order. |
| AR-002 | `TaskExecutionResourceRelease.drain` and `inFlight` removed; the tracker's `settled()` waits one more macrotask. |
| AR-003 | (a) inventory extended; (b) `getProjectTaskContextDrafts()` singleton, same `store` / `contextStore` dependencies, shared by `TaskContextOwnership`; (c) a test's outcome names follow the code it feeds. |
| New | `DESIGN.md` rule 11 "Tests follow the code; they never hold it back", added by the Solution Designer at the user's request (REQ-007). |

Documents updated: requirements-doc.md (SR-002), investigation-notes.md, design-spec.md, solution-revision-record.md, DESIGN.md. Classification unchanged: Large / High.
