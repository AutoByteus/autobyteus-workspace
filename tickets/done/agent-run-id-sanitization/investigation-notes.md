# Investigation Notes

- Ticket: `agent-run-id-sanitization`
- Date: `2026-04-10`
- Scope Triage: `Small`
- Status: `Current`

## User-Reported Symptom

Observed log evidence:

- missing memory file warning for `/Users/normy/.autobyteus/server-data/memory/agents/Xiaohongshu marketer_Xiaohongshu marketer_3615/raw_traces_archive.jsonl`
- agent runtime log line naming the live agent as `Xiaohongshu marketer_Xiaohongshu marketer_3615`

## Investigation Summary

- The missing `raw_traces_archive.jsonl` warning is real log output, but the file itself is optional and is only created when raw traces are pruned into the archive.
- The duplicated `Xiaohongshu marketer_Xiaohongshu marketer_3615` identifier comes from readable agent/run id generation that concatenates `name`, `role`, and a four-digit suffix.
- Team-member runtime ids are already generated through a separate sanitized hashed path and do not match the reported identifier shape.
- Memory folder creation and lookup were not using two different naming schemes for the reported case; both sides use the literal run id. The issue was the upstream run-id generator and the misleading optional-file warning.

## Root Cause Findings

### F-001 Readable agent ids duplicated `name` and `role`

- `autobyteus-ts/src/agent/factory/agent-factory.ts` creates new agent ids with `generateReadableAgentId(config.name, config.role)`.
- Before the patch, `autobyteus-ts/src/agent/factory/agent-id.ts` implemented `name_role_####` by trimming only, so spaces were preserved and duplicate `name`/`role` values were repeated verbatim.
- Therefore, if `name = Xiaohongshu marketer` and `role = Xiaohongshu marketer`, the generated id becomes `Xiaohongshu marketer_Xiaohongshu marketer_3615`.

### F-002 Standalone AutoByteus run ids duplicated the same logic on the server side

- `autobyteus-server-ts/src/agent-execution/services/agent-run-service.ts` provisions new standalone AutoByteus runs through `generateStandaloneAgentRunId(definition.name, definition.role)`.
- Before the patch, `autobyteus-server-ts/src/run-history/utils/agent-run-id-utils.ts` had its own copy of the same `name_role_####` formatter.
- This meant the server and runtime had duplicate readable-id formatting logic instead of one shared source of truth.

### F-003 The missing archive warning was misleading because the archive file is optional

- `autobyteus-ts/src/memory/store/file-store.ts` defines `raw_traces_archive.jsonl` as an append-only archive created only when compaction/pruning moves traces out of the active file.
- `autobyteus-server-ts/src/agent-memory/store/memory-file-store.ts` previously warned on any missing JSONL file, including archive reads via `readRawTracesArchive`.
- The result was a warning for a file that may legitimately never exist.

## Non-Root-Cause Findings

### N-001 Team-member run ids already use folder-safe deterministic generation

- `autobyteus-server-ts/src/run-history/utils/team-member-run-id.ts` normalizes `memberRouteKey`, converts it to a slug, and appends a hash.
- `autobyteus-server-ts/src/agent-team-execution/backends/autobyteus/autobyteus-team-run-backend-factory.ts`
- `autobyteus-server-ts/src/agent-team-execution/backends/codex/codex-team-run-backend-factory.ts`
- `autobyteus-server-ts/src/agent-team-execution/backends/claude/claude-team-run-backend-factory.ts`
- These team backends already provision `memberRunId` through `buildTeamMemberRunId(...)`, so they do not generate the reported `name_role_####` shape.

### N-002 Memory path lookup itself was not using a conflicting sanitization rule

- `autobyteus-server-ts/src/agent-memory/store/memory-file-store.ts` resolves `memory/agents/<runId>/...` directly from the supplied run id.
- `autobyteus-server-ts/src/agent-memory/store/agent-run-memory-layout.ts` also resolves run directories directly from the run id.
- For the reported case, create/read mismatch was not the failure mode; the issue was that the run id itself had been generated in an undesirable format.

## Broader Call-Site Inventory

### Readable standalone/new-agent id generation

- `autobyteus-ts/src/agent/factory/agent-id.ts`
- `autobyteus-ts/src/agent/factory/agent-factory.ts`
- `autobyteus-server-ts/src/run-history/utils/agent-run-id-utils.ts`
- `autobyteus-server-ts/src/agent-execution/services/agent-run-service.ts`

### Team/member id generation already on sanitized path

- `autobyteus-server-ts/src/run-history/utils/team-member-run-id.ts`
- `autobyteus-server-ts/src/run-history/utils/team-run-id-utils.ts`
- `autobyteus-server-ts/src/agent-team-execution/backends/autobyteus/autobyteus-team-run-backend-factory.ts`
- `autobyteus-server-ts/src/agent-team-execution/backends/codex/codex-team-run-backend-factory.ts`
- `autobyteus-server-ts/src/agent-team-execution/backends/claude/claude-team-run-backend-factory.ts`

### Archive warning/read path

- `autobyteus-server-ts/src/agent-memory/store/memory-file-store.ts`
- `autobyteus-server-ts/src/agent-memory/services/agent-memory-service.ts`
- `autobyteus-server-ts/src/run-history/services/agent-run-history-index-service.ts`

## Stage 1 Outcome

- Investigation is sufficient to move to Stage 2 requirements refinement.
- Current confidence: high that the bug is limited to readable standalone/new-agent id generation plus optional archive warning behavior, not a broad create/read path mismatch across all memory layout owners.
