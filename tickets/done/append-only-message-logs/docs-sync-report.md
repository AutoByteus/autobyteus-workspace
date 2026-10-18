# Docs Sync Report — Append-Only Message Logs

## Scope

- Ticket: `append-only-message-logs`
- Trigger: test-code review pass CRR-002 from `/software_engineering_team/code_reviewer` (after CRR-001 and API-REV-001, 96%)
- Bootstrap base reference: `origin/personal` @ `65cf41c6b4`
- Integrated base reference used for docs sync: `origin/personal` @ `cf14704473` (v1.5.6-beta.5 bump), merged into the ticket branch as `afa05514f5`
- Post-integration verification reference: `release-deployment-report.md` > Initial Delivery Integration Refresh; evidence `evidence/delivery/`

## Why Docs Were Updated

- Summary: the implementation's own docs commit `265ad100ce` already describes the new on-disk format, rotation, read rules and the startup conversion. Delivery checked them against the integrated code and fixed one stale source doc comment (CR-001).
- Why this should live in long-lived project docs: the message-log file layout is a persisted-data contract. Readers of run folders, Memory Sync, migrations and support need the file names, the rotation rule and the fact that JSON logs are retired.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result (`Updated`/`No change`/`Needs follow-up`) | Notes |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/run_history.md` | Canonical home of persisted run files | No change (updated in `265ad100ce`) | "Message logs" section matches `MessageLog`: names per family, 4 MiB rotation, `\n`-terminated lines, torn tail, `createdAt` sort, no header, migration `20261018_append_only_message_logs_v1`, retired JSON residue |
| `autobyteus-server-ts/docs/modules/standalone_agent_run_root.md` | Host log location | No change (updated in `265ad100ce`) | — |
| `autobyteus-server-ts/docs/modules/agent_team_execution.md`, `agent_orgs.md`, `agent_memory.md`, `agent_artifacts.md` | Log file names per family | No change (updated in `265ad100ce`) | — |
| `autobyteus-server-ts/docs/design/collaboration_model.md` | Log owner per run | No change (updated in `265ad100ce`; the base's one-line change merged cleanly beside it) | — |
| `autobyteus-server-ts/docs/features/artifact_file_serving_design.md` | Reference resolution reads the log | No change (updated in `265ad100ce`) | — |
| `autobyteus-server-ts/src/app-data-migrations/legacy/released-run-package-shapes/README.md` | Frozen released shapes | No change (updated in `265ad100ce`) | Records the released JSON log shapes |
| `autobyteus-web/docs/agent_artifacts.md` | Web view of team message files | No change (updated in `265ad100ce`) | `team_communication_messages_*.jsonl` |
| `autobyteus-server-ts/docs/features/memory_sync.md` | Memory Sync copies changed files | No change | Does not name message-log files; generic file sync stays accurate |
| `autobyteus-server-ts/docs/design/data_migration_guideline.md` | One-way migration | No change | FU-4 (RELEASE.md rollback sentence vs one-way migrations) belongs to the Solution Designer |
| `autobyteus-server-ts/docs/modules/projects.md` (changed by the base: adoption) | Merged base docs could mention old log names | No change | No message-log file names |
| `autobyteus-server-ts/src/standalone-agent-run-root/domain/standalone-root-tree.ts` (doc comment) | CR-001 | Updated | See below |

A search of `src` and all docs for `communication_messages.json` outside migrations and frozen released shapes now finds only `RETIRED_JSON_MESSAGE_LOGS` in `root-run-package-current-validator.ts`, which is correct (it names the retired files).

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-server-ts/src/standalone-agent-run-root/domain/standalone-root-tree.ts:29` | Source doc comment | `StandaloneRootMessagesFile` described as the host's in-memory messages, stored on disk as the host's `MessageLog` in `collaboration/` (`communication_messages_*.jsonl`) | CR-001: the comment still named `communication_messages.json` |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Append-only message logs | File names, rotation at 4 MiB, sealed-file immutability and its one exception (DEC-008), read rules, no header | `design-spec.md`, `requirements-doc.md` DEC-002/004/007/008 | `run_history.md` > Message logs |
| JSON log retirement | Conversion at startup; a leftover JSON log is not read and the run is not admitted | `design-spec.md` R-3 | `run_history.md` > Message logs |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| `<base>.json` message logs (`communication_messages.json`, `team_communication_messages.json`, `agent_org_communication_messages.json`) with `schemaVersion` envelope | `<base>_active.jsonl` + sealed `<base>_<6 digits>.jsonl`, owned by `MessageLog` | `run_history.md` > Message logs |
| `TeamCommunicationStore` whole-file write in `TaskAgentOwnFiles.writeTeam` | `TaskAgentMessageLogs.createTeamLogIfMissing` | `run_history.md`; code |

## Delivery Continuation

- Result: `Pass`
- Next delivery action: verification, ticket archive, finalization
- Notes: the CR-001 edit is comment-only; it is committed with the delivery artifacts.
