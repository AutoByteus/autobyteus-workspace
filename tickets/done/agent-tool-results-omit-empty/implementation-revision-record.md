# Implementation Revision Record — agent-tool-results-omit-empty (autobyteus-260)

The current code and `implementation-handoff.md` are the authority. This record locates each implementation round.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Architecture reviewer: `design-review-report.md` rounds 1–3 (ARCH-REV-001 on SR-007, ARCH-REV-002 on SR-008, ARCH-REV-003 on SR-010) | AR-001–AR-008 (non-blocking guidance) | `Initial Baseline` | SR-007, SR-008, SR-010; ARCH-REV-001–003; CRR `N/A`; API-REV `N/A`; DR `N/A` | Implemented; ready for code review |
| IR-002 | Code reviewer: `code-review-report.md` round 2 (CRR-002, failure origin of API-REV-001), via architecture reviewer ARCH-REV-004 on SR-012 | CR-001, CR-002 | `Local Fix` (CR-002) and design-revision implementation (CR-001, SR-012) | SR-012; ARCH-REV-004; CRR-002; API-REV-001; DR `N/A` | Fixed; ready for code review |
| IR-003 | Code reviewer: `code-review-report.md` round 3 (CRR-003, Targeted Delta) | CR-003 (Low) | `Local Fix` | SR-012; ARCH-REV-004; CRR-003; API-REV `N/A`; DR `N/A` | Fixed; ready for code review |
| IR-004 | Delivery engineer: `delivery-revision-record.md` DR-001 (integration refresh with `origin/personal@63a36d00d8`) | DR-001 | `Local Fix` | SR `N/A`; ARCH-REV `N/A`; CRR-005; API-REV-002; DR-001 | Fixed; ready for code review |

## Revision Entries

### IR-001 — One result rule, Task title, short lists and `get_project_task`

- Triggering role, report path, and round: architecture reviewer, `design-review-report.md`, rounds 1–3 (the SR-010 delta arrived mid-implementation: the user stopped the `task_ids` work; it was replaced by `get_project_task` before this baseline).
- Triggering finding IDs: AR-001–AR-008 (implementation guidance; AR-004's `task_ids: []` item obsolete with SR-010).
- Classification: `Initial Baseline`.
- Prior authoritative result: `N/A`.
- Current authoritative result: implementation complete on `codex/agent-tool-results-omit-empty` (commits in `implementation-handoff.md`), plus `codex/agent-tool-results-omit-empty` in `autobyteus-agents`.
- Related solution revision IDs: SR-007, SR-008, SR-010.
- Related architecture-review revision IDs: ARCH-REV-001, ARCH-REV-002, ARCH-REV-003.
- Related code-review revision IDs: `N/A`.
- Related API/E2E revision IDs: `N/A`.
- Related delivery revision IDs: `N/A`.
- Why this baseline is recorded: initial implementation handoff.
- Approved behavior or requirement IDs affected: REQ-001–REQ-017 (all), AC-001–AC-015.
- Implementation delta: see `implementation-handoff.md` (Reviewed Behavior Implementation Trace, Key Files).
- Changed files or areas: `autobyteus-ts/src/tools` (rule, background-process tools); `autobyteus-server-ts/src/agent-tools/**`, `agent-communication`, `agent-collaboration` (capability, Task line), the three roots, `projects/**`, GraphQL, the `project-task-titles` migration; `autobyteus-web` Task types, GraphQL, store, draft, editor, labels, i18n; docs and `GLOSSARY.md`; `autobyteus-agents` Project Task Manager skill and tool list.
- Local validation and result: `implementation-handoff.md` Checks Run (all `Pass`).
- Next recipient or routing: from `get_handoff_rules` (Large / High → code review).
- Remaining limitations or risks: `implementation-handoff.md` Known Risks; E2E files listed there for API/E2E.

### IR-002 — Titles migration after projects-per-folder-v1 only; the worker Task store keeps the title

- Triggering role, report path, and round: code reviewer, `code-review-report.md` round 2 (CRR-002, the failure-origin review of API/E2E round 1, API-REV-001: F-001 = API-03, F-002 = API-11c); CR-001 revised in SR-012 and passed in ARCH-REV-004 (`design-review-report.md`), which sent both findings here in one round.
- Triggering finding IDs: CR-001, CR-002.
- Classification: CR-001 `Design Impact` (resolved upstream in SR-012, implemented here); CR-002 `Local Fix`.
- Prior authoritative result: IR-001, `Pass` in CRR-001, then `Fail` in API-REV-001.
- Current authoritative result: both findings fixed on `codex/agent-tool-results-omit-empty` (`dfbd2621bb`, `52cbc28442`, plus the docs/ticket commit); `autobyteus-agents` unchanged.
- Related solution revision IDs: SR-012.
- Related architecture-review revision IDs: ARCH-REV-004.
- Related code-review revision IDs: CRR-002.
- Related API/E2E revision IDs: API-REV-001.
- Related delivery revision IDs: `N/A`.
- Why this implementation change is recorded: one Project that keys-v1 cannot key left titles `NOT_RUN` and hid every Project's Tasks (CR-001); the Workspaces tree crashed for a Project-Task worker because the store dropped `title` (CR-002).
- Approved behavior or requirement IDs affected: QR-002, AC-004 (migration; MP-001), AC-005, SCN-003 (tree label); BEH-002.
- Implementation delta:
  - CR-001: `prerequisiteMigrationIds` is `["20261005_projects_per_folder_v1"]`; new frozen validator `released-task-file-before-titles.ts` (`taskKey` optional; IDs match folders; non-blank description; released status; non-blank timestamps) replaces the keyed frozen `readTaskFile` import; `SKIPPED_NO_TITLE_LINE_WARNING` removed (a blank description is not a released Task file); `titleFromFirstLine` takes a string and throws on a blank one. Frozen layer not pruned (keys-v1 still uses it). keys-v1 and admission unchanged.
  - CR-002: `taskWorkerTaskStore.ts` maps each answer through `workerTaskOf`: Project Task with `title`, Temp task with `title: null`; a Project-Task answer without a title is refused.
  - Docs: `autobyteus-server-ts/docs/modules/projects.md` (titles after `projects-per-folder-v1`, unkeyed Tasks titled too).
- Changed files or areas: `autobyteus-server-ts/src/app-data-migrations/migrations/project-task-titles/{project-task-titles-app-data-migration,title-from-first-line,released-task-file-before-titles}.ts`; `tests/app-data-migrations/project-task-titles/project-task-titles-app-data-migration.test.ts`; `tests/e2e/projects/projects-startup-migration.e2e.test.ts`; `autobyteus-web/stores/taskWorkerTaskStore.ts`, `stores/__tests__/taskWorkerTaskStore.spec.ts`; `autobyteus-server-ts/docs/modules/projects.md`.
- Local validation and result: IMP-11 (typecheck), IMP-12 (migrations + architecture, 612 pass), IMP-13 (startup E2E, 6 pass), IMP-14 (web store and readers, 1269 pass); all `Pass`.
- Next recipient or routing: from `get_handoff_rules` (Large / High → code review).
- Remaining limitations or risks: API-03 and API-11c to be rerun by API/E2E; the live Workspaces tree was not rerun here.

### IR-003 — The registry comment states the titles dependency correctly

- Triggering role, report path, and round: code reviewer, `code-review-report.md` round 3 (CRR-003, Targeted Delta of IR-002; CR-001 and CR-002 resolved).
- Triggering finding IDs: CR-003 (Low).
- Classification: `Local Fix`.
- Prior authoritative result: IR-002, `Fail` in CRR-003 on CR-003 only.
- Current authoritative result: fixed in `56ceef568a`.
- Related solution revision IDs: SR-012.
- Related architecture-review revision IDs: ARCH-REV-004.
- Related code-review revision IDs: CRR-003.
- Related API/E2E revision IDs: `N/A` (API/E2E has not started on IR-002).
- Related delivery revision IDs: `N/A`.
- Why this implementation change is recorded: the registry comment (added in IR-001) still said the titles migration needs the Task keys, the dependency SR-012 removed.
- Approved behavior or requirement IDs affected: none (comment only); QR-002, AC-004 context.
- Implementation delta: `autobyteus-server-ts/src/app-data-migrations/app-data-migration-registry.ts` comment above `ProjectTaskTitlesAppDataMigration`: needs the per-Project folders, not the Task keys (SR-012); keys-v1 keeps a title it finds.
- Changed files or areas: that file only.
- Local validation and result: `pnpm -C autobyteus-server-ts exec vitest run tests/app-data-migrations/project-task-titles tests/architecture`: 75 passed. IMP-11–IMP-14 stand.
- Next recipient or routing: from `get_handoff_rules` (Local Fix, Large / High → code review).
- Remaining limitations or risks: as IR-002 (API-03 and API-11c reruns by API/E2E).

### IR-004 — `list_available_agent_runtimes` follows the one tool result rule

- Triggering role, report path, and round: delivery engineer, `delivery-revision-record.md` DR-001 (after merging `origin/personal@63a36d00d8`, merge `54cd6803f4`; evidence `evidence/DEL-01-integrated-architecture-and-agent-tools-unit.log`).
- Triggering finding IDs: DR-001.
- Classification: `Local Fix`.
- Prior authoritative result: IR-003, `Pass` in CRR-004/CRR-005 and API-REV-002; integrated state failed AC-002's guard.
- Current authoritative result: fixed in `7c60cb4909`.
- Related solution revision IDs: `N/A`.
- Related architecture-review revision IDs: `N/A`.
- Related code-review revision IDs: CRR-005.
- Related API/E2E revision IDs: API-REV-002.
- Related delivery revision IDs: DR-001.
- Why this implementation change is recorded: autobyteus-303's new tool serialized its own result on both routes (`JSON.stringify`, a `structuredContent:` literal), outside the one rule.
- Approved behavior or requirement IDs affected: REQ-001, REQ-002, AC-001, AC-002 (BEH-001).
- Implementation delta: local tool `toToolResultJson(report)`; MCP adapter `toAgentToolsMcpStructuredJsonResult(report)`; tool description: limit values and `until` appear when known. Result shape: null `remainingPercent`, `resetsAt`, `blocked.until` are left out; GraphQL unchanged.
- Changed files or areas: `autobyteus-server-ts/src/agent-tools/agent-runtimes/{list-available-agent-runtimes-tool,list-available-agent-runtimes-contract}.ts`, `src/agent-tools/mcp/providers/list-available-agent-runtimes-mcp-adapter-provider.ts`; `tests/unit/agent-tools/agent-runtimes/list-available-agent-runtimes-tool.test.ts`, `tests/e2e/runtime/available-agent-runtimes-graphql.e2e.test.ts`; `docs/modules/{agent_tools,agent_runtimes}.md`.
- Local validation and result: IMP-15 typecheck Pass; IMP-16 architecture + agent-tools + runtimes unit: 490 passed, the 1 failure is FU-008 (not this ticket's); IMP-17 runtimes E2E 6 passed after a build.
- Next recipient or routing: from `get_handoff_rules` (delivery Local Fix, Large / High → code review).
- Remaining limitations or risks: FU-008 stays open on `origin/personal`; `tests/unit/available-agent-runtimes` needed no change (it tests the service report, not the tool text).
