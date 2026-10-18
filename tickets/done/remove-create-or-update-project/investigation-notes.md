# Investigation Notes

## Investigation Meta

- Package identifier: `remove-create-or-update-project`
- Request / ticket: Project Task `autobyteus-121` from `/project_task_manager` (2026-10-18): remove the deprecated `create_or_update_project`; user go-ahead 2026-10-18.
- Workspace root / branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-create-or-update-project` / `codex/remove-create-or-update-project`
- Base: `origin/personal` @ `2f211340ee` (fetched 2026-10-18; after tags `v1.5.5`, `v1.5.6-beta.1`). Finalization target: `origin/personal`.
- Bootstrap: succeeded. Blocker: none.
- Current solution revision ID: `SR-002`
- Authorities read: `references/requirements-engineering.md`, `references/architecture-design.md`, `references/design-principles.md`, repo `DESIGN.md` (read in this conversation; the DESIGN.md delta since the last read, rules 7–8, was read on 2026-10-18 — neither applies). Data Migration Guideline: not applicable (no persisted data transformed).
- Status: investigation complete.

## Initial Request And Clarifications

- Task text (attached context: the split's receipt verification). User go-ahead: "We don't need this legacy tool since we have the new tool." The PTM package removes the old name in a parallel PR; it need not land first.

## Source Log

| ID | Date | Source | Exact Source | Finding | Implication |
| --- | --- | --- | --- | --- | --- |
| SRC-01 | 2026-10-18 | Code | `git grep -n create_or_update_project -- ':!tickets'` | 13 files: `.github/release-notes/release-notes.md` (2), server docs `agent_tools_mcp_server.md` (2: lines 253, 327), `projects.md` (2: lines 59-62, 454), web `docs/projects.md` (1: line 457), src `project-task-native-tools.ts` (3), `project-task-tool-contract.ts` (8), `project-task-tool-manifest.ts` (1), tests `e2e/projects/project-task-boundaries.e2e.test.ts` (8), `unit/agent-execution/shared/project-tool-runtime-parity.test.ts` (4), `unit/agent-tools/project-tasks/project-task-tools.test.ts` (18), migration fixture `retired-built-in-project-task-manager/{agent-config.json,agent.md}` (2), `autobyteus-web/tests/e2e/team-status-live-probe.mjs:141` (also lists `create_or_update_task`) | Full inventory |
| SRC-02 | 2026-10-18 | Code | `project-task-tool-contract.ts` lines 4-7 (names, `EffectiveProjectTaskToolName`), 14-15 (description), 52-58 (schema), 146-153 (`effectiveProjectTaskToolName`), 223-224 (parse dispatch); `project-task-tool-manifest.ts:58-60` (execute dispatch); `project-task-native-tools.ts:41-44, 58` | The old tool's entire footprint; `projectInput` stays (used by both project parsers, lines 126, 136) | Removal plan; `effectiveProjectTaskToolName` and `EffectiveProjectTaskToolName` become dead |
| SRC-03 | 2026-10-18 | Code | `autobyteus-agent-tool-resolver.ts` (unknown name → warn "not found in registry. Skipping."), `runtime-agent-tool-exposure.ts` (`isProjectTaskToolName` filter) | Unknown names skipped without error on all runtimes | REQ-002 needs no new mechanism |
| SRC-04 | 2026-10-18 | Docs | `.github/release-notes/release-notes.md` = v1.5.6-beta.1 notes ("create_or_update_project still works but is deprecated"); `RELEASE.md` lines 79-90, 181-183: the release helper writes this file from the ticket `release-notes.md` | Implementation doesn't edit it; delivery's release replaces it | DEC-004 |
| SRC-05 | 2026-10-18 | Tests | `tests/e2e/app-data-migrations/remove-built-in-project-task-manager-startup.e2e.test.ts:25` uses `fixtures/app-data-migrations/retired-built-in-project-task-manager` as "installedCopyFixture"; migration `remove-built-in-project-task-manager-migration.ts` deletes that installed folder | Fixture is a faithful copy of historical user data | DEC-002: keep |
| SRC-06 | 2026-10-18 | Tests | `tests/unit/agent-execution/shared/task-tool-runtime-parity.test.ts:60-76`; `tests/unit/agent-execution/backends/autobyteus/autobyteus-agent-tool-resolver.test.ts:114-123` | Precedent: removed-name skip tests (AC-007 of the task split) | Same shape for this removal (DEC-003) |
| SRC-07 | 2026-10-18 | Data | `grep -rl create_or_update_project ~/.autobyteus/server-data/{agents,agent-teams,agent-packages,skills}` → none; `autobyteus-agents` `origin/main` (`0705eb6`): PTM `agent-config.json` lists old + new names | Only the PTM package lists it, together with the new names | No data change; PTM unaffected |
| SRC-08 | 2026-10-18 | App | `/Applications/AutoByteus.app` = 1.5.6-beta.1 | user's current app has the new tools | — |

## Relevant Existing Behavior

| Behavior ID | Kind | Current | Evidence |
| --- | --- | --- | --- |
| BEH-001 | System | old tool registered, dispatching to the new paths | SRC-02 |
| BEH-002 | Contract | unknown names skipped | SRC-03 |
| BEH-003 | Contract | docs/release notes describe the deprecation | SRC-01, SRC-04 |

## Architecture Investigation

- DS-001 (tool call) after removal: `native class | MCP manifest -> parseProjectTaskToolInput(name) -> parseCreateProjectInput | parseUpdateProjectInput -> executeProjectTaskTool -> ProjectService`. The manifest's name set and the protected names follow `PROJECT_TASK_TOOL_NAMES`.
- DS-002 (launch) unchanged; the old name becomes an unknown name.
- Migration conventions: not applicable.

## Supplement Inventory

| Artifact | Purpose | Owner | Status | Approval |
| --- | --- | --- | --- | --- |
| `tickets/done/project-tool-split/` | origin, skip evidence | delivered ticket | archived | N/A |

## Unknowns

- None.
