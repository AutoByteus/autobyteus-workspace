# Docs Sync Report

## Scope

- Ticket: `task-delegation-resource-lifecycle`
- Trigger: Delivery handoff from `code_reviewer` after CRR-005 (source) Pass, API-REV-002 Pass and CRR-006 (test code) Pass on IR-004 / SR-007. Route: reviewed, `task_size=Large`, `architectural_risk=High`.
- Bootstrap base reference: `origin/personal` (worktree bootstrap); the implementation basis is `origin/personal@8f57d16d1`.
- Integrated base reference used for docs sync: `origin/personal@8c474e37a`, merged into the ticket branch as `743af3a7c` on top of the delivery checkpoint `a7bd0548d`.
- Post-integration verification reference: `release-deployment-report.md` › Verification Checks; logs in `delivery-evidence/`.

## Why Docs Were Updated

- Summary: this ticket replaces the delegated-task lifecycle (task records, task status machine, submit/review tools, task APIs and task UI) with a resource lifecycle for delegated children:
  - pure-spawn `delegate_task`;
  - idle shutdown after a configurable grace period;
  - same-root wake-on-message in `restore` mode;
  - one liveness predicate;
  - tolerant-read / exact-write execution trees without a schema version or migration.

  The long-lived server and web docs described the removed model in detail: submit/review, `task_delegation_records.json`, `TASK_DELEGATION_EVENT` / `TASK_AGENT_ACTIVATED`, the Tasks UI, "live-only" run-ID routing and `schemaVersion` trees. Every such passage had to change.
- Why this should live in long-lived project docs: agents, runtime integrators and future designers read these module docs as the contract. The migration guideline (DEC-008) is project-wide policy that the user asked to commit with this ticket.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/agent_team_execution.md` | Design step 12 | Updated | Main owner of the new lifecycle description |
| `autobyteus-server-ts/docs/modules/agent_orgs.md` | Design step 12 | Updated | |
| `autobyteus-server-ts/docs/modules/agent_tools.md` | Design step 12 | Updated | |
| `autobyteus-server-ts/docs/modules/agent_tools_mcp_server.md` | Design step 12 | Updated | |
| `autobyteus-server-ts/docs/modules/codex_integration.md` | Design step 12 | Updated | |
| `autobyteus-server-ts/docs/modules/prompt_engineering.md` | Design step 12 | Updated | |
| `autobyteus-server-ts/docs/modules/agent_execution.md` | Design step 12 | Updated | Run-ID route wording |
| `autobyteus-server-ts/docs/modules/agent_definition.md` | Design step 12 | No change | Only states the automatic `get_handoff_rules` / `send_message_to` / `delegate_task` trio, which is still accurate |
| `autobyteus-server-ts/docs/modules/agent_communication.md` | Found in stale-term scan (run-ID route, submit/review) | Updated | Outside step 12 |
| `autobyteus-server-ts/docs/modules/run_history.md` | Stale-term scan (task records, `getTaskDelegationRecords`, `schemaVersion`) | Updated | Outside step 12 |
| `autobyteus-server-ts/docs/modules/agent_artifacts.md` | Stale-term scan (task references, task REST route) | Updated | Outside step 12 |
| `autobyteus-server-ts/docs/modules/agent_streaming.md`, `projects.md` | Stale-term scan | Updated | One line each |
| `autobyteus-server-ts/docs/design/agent_websocket_streaming_protocol.md` | `TASK_DELEGATION_EVENT` in the event list | Updated | |
| `autobyteus-server-ts/docs/design/data_migration_guideline.md` | DEC-008 guideline change (SR-007 delivery instruction) | Updated | Brought in from the `data-migration-guideline-refresh` worktree; one lessons-table row added |
| `autobyteus-server-ts/docs/features/task_agent_identity_future_improvements.md` | Named the removed `TaskDelegationService` and records | Updated | |
| `autobyteus-web/docs/agent_execution_architecture.md` | Tasks UI, retained inspection, live/historical navigation | Updated | |
| `autobyteus-web/docs/settings.md` | Contains an older near-copy of the execution-architecture text, including the same Tasks UI sections | Updated | The duplication is pre-existing docs debt and is not fixed here; the stale block was replaced with the synced text |
| `autobyteus-web/docs/agent_orgs.md`, `agent_teams.md`, `agent_artifacts.md`, `content_rendering.md`, `projects.md` | Stale-term scan (Tasks facet, task records, task reference viewer) | Updated | |
| Contract package READMEs, root `README.md`, `TESTING.md`, `docs/` | Stale-term scan | No change | No task-lifecycle content |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `agent_team_execution.md` | Rewrite of the "Server-Owned Task Delegation" section; new "Delegated Child Lifecycle" section; persistence section rewrite | Pure-spawn result union; single tree write and the `TASK_EXECUTION_STARTED` barrier; liveness, idle shutdown, grace setting, wake, open work, reopen and stop; same-root run-ID routing; tolerant read / exact write; records files unread; released migrations on frozen strict copies | Core behavior change |
| `agent_orgs.md` | Section rewrite | Delegated children in the tree and no records; shared lifecycle through `AgentOrgTaskExecutionAdapter`; tree file without version; removed Org task reference route | Org parity |
| `agent_tools.md`, `agent_tools_mcp_server.md` | Section rewrite | `delegate_task` only; `anyOf` result; error codes; reference-file rule (normalized absolute path of an existing file); exact run-ID selector semantics | Tool contract changed |
| `prompt_engineering.md` | Example and prose | The prompt example now matches `AGENT_TEAM_COLLABORATION_LLM_INSTRUCTION` ("Delegated Agents"); result shape | LLM contract changed |
| `codex_integration.md` | Live-test description | `mixed-task-delegation.e2e.test.ts` flags (`RUN_LMSTUDIO_E2E`, `RUN_CODEX_E2E`, `RUN_CLAUDE_E2E`, grace override) and the sanitized-environment warning | The old flags and review field no longer exist |
| `agent_communication.md`, `agent_execution.md` | Selector semantics | `target_agent_run_id`: a same-root path (wake, root communication) plus the global live-only path | Router behavior changed |
| `run_history.md`, `agent_artifacts.md` (server) | Persisted files, hydration, references | Records projection removed; tree read tolerantly; references live only in the work packet | Persistence and API removal |
| `data_migration_guideline.md` | Policy (DEC-008) | "Read tolerantly, write exactly, no schema version fields, never reuse a field name, released migrations keep strict classifiers"; lessons row for `legacy/released-run-package-shapes/` | User-directed project rule, committed with this ticket |
| Web docs (7 files) | Section rewrites | Messages-only collaboration panel; "Started by" rows; every placement navigable; shut-down = `offline`; composer wakes a child in an active root; inactive-Org delegated children read-only; removed Tasks/store/hydration/reference viewer | UI behavior changed |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Delegated child resource lifecycle | Liveness predicate, arm/cancel triggers (`idle`/`offline`/`error` arm, `running`/`initializing` cancel; R-6 wording per DS-005), queue-head shutdown, lease, precheck, error codes | `design-spec.md` (DS-002, DS-003, DS-005, Terminology, Guidance), `implementation-handoff.md` BEH-004/005 | `agent_team_execution.md` › Delegated Child Lifecycle |
| Tolerant read / exact write | Required fields, ignored fields, the invariant for a present delegator, V1 structural rejection, drop-on-next-save | `design-spec.md` › SR-007 (authoritative over earlier migration-era lines, R-12) | `agent_team_execution.md`, `agent_orgs.md`, `run_history.md`, `data_migration_guideline.md` |
| Released-migration stability | Frozen strict copies in `legacy/released-run-package-shapes/`; runtime never imports them | SR-007 › Released migrations; implementation README | `agent_team_execution.md`, `data_migration_guideline.md` |
| Run-ID routing | Same-root through the root (wake, communication); otherwise live-only | `design-spec.md` R-1 / ARCH-09, router source | `agent_communication.md`, `agent_team_execution.md`, `agent_tools.md` |
| Grace setting | `AUTOBYTEUS_TASK_EXECUTION_IDLE_SHUTDOWN_GRACE_MS`, default 600 000, range 60 000–86 400 000, read at arm time, predefined editable setting | `task-execution-idle-shutdown-setting.ts`, `server-settings-service.ts` | `agent_team_execution.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| `RootTaskLifecycleEngine`, task status machine, settlement, reopen repair | `RootTaskExecutionLifecycle` + Team/Org task-execution adapters | `agent_team_execution.md`, `agent_orgs.md`, `task_agent_identity_future_improvements.md` |
| `submit_task_result`, `review_task_result` | Nothing; two-way `send_message_to` by run ID | `agent_tools.md`, `agent_tools_mcp_server.md`, `prompt_engineering.md`, `agent_communication.md` |
| `delegate_task` `{task_id,status,...}` result | `{target_agent_run_id}` or `{target_agent_run_id:null,message}` | `agent_tools.md`, `agent_team_execution.md`, `agent_tools_mcp_server.md` |
| `task_delegation_records.json`, `agent_org_task_delegation_records.json` | The execution tree (`delegatorAgentRunId`); old files are left untouched and unread | `agent_team_execution.md`, `agent_orgs.md`, `run_history.md` |
| `TASK_DELEGATION_EVENT`, `TASK_AGENT_ACTIVATED` | `TASK_EXECUTION_STARTED` (Team), `task_execution_started` (Org) | `agent_team_execution.md`, `agent_websocket_streaming_protocol.md`, web `agent_execution_architecture.md` |
| `getTaskDelegationRecords`, task REST reference routes (Team and Org) | Removed | `run_history.md`, `agent_orgs.md`, `agent_artifacts.md` |
| Web Tasks section, navigator, detail pane, `taskDelegationStore`, task reference viewer, "Task:" labels, lifecycle badges | Messages-only panel; "Started by" rows with standard status | web `agent_execution_architecture.md`, `settings.md`, `agent_orgs.md`, `agent_teams.md`, `agent_artifacts.md`, `content_rendering.md` |
| Tree `schemaVersion` (Team 2, Org 1) and wire `schema_version` | No version field; structural recognition | `agent_team_execution.md`, `agent_orgs.md`, `run_history.md`, `data_migration_guideline.md` |
| "`target_agent_run_id` is live-only" | Same-root path with wake, plus the global live-only path | `agent_communication.md` and the tool docs |

## Review-Note Dispositions

- **R-6** (stale DS-002 wording, "idle/offline-only arming"): the long-lived docs use the authoritative DS-005 rule (`idle`/`offline`/`error` arm; `running`/`initializing` cancel; lease release also arms). The ticket `design-spec.md` belongs to the Solution Designer and was not edited.
- **R-12** (migration-era statements superseded by SR-007): no long-lived doc describes Team tree v3 / Org tree v2, a delegator migration, or a required `delegatorAgentRunId`. The SR-007 section is the only source used. The stale lines inside the ticket `design-spec.md` remain Solution Designer-owned; they are recorded for its next design touch.
- **R-11** (stale Migration Plan trigger wording): moot, because SR-007 removed the migration; nothing in the long-lived docs depends on it.
- **DEC-008 guideline:** the handoff message described it as "a separate docs worktree plus a follow-up ticket". The authoritative `design-spec.md` › "Project practice (user direction, DEC-008)" says the user decided on 2026-09-29 that there is **no** follow-up ticket and that the guideline is committed **with this ticket**. Delivery followed the design spec:
  - Copied `autobyteus-server-ts/docs/design/data_migration_guideline.md` from branch `codex/data-migration-guideline-refresh` (uncommitted change on `f2924a2b0`).
  - Upstream has not changed that file since `f2924a2b0`, so no reconciliation was needed.
  - Added one lessons-table row for the new shared frozen module.
  - The docs worktree and branch are scheduled for removal in delivery cleanup.

## No-Impact Decision

N/A (docs updated).

## Delivery Continuation

- Result: `Pass`
- Next delivery action: handoff summary and user verification (including R-4).
- Notes: existing inaccuracies corrected in passing:
  - the docs claimed a "direct child of the caller's immediate Team" rule for `delegate_task` that the code did not enforce at base or at head;
  - the Codex live-test flags were out of date.
