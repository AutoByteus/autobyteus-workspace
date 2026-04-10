# Implementation

- Ticket: `agent-run-id-sanitization`
- Scope Classification: `Small`
- Document Status: `Review-Gate-Validated`
- Last Updated: `2026-04-10`

## Upstream Artifacts

- Workflow state: `tickets/done/agent-run-id-sanitization/workflow-state.md`
- Investigation notes: `tickets/done/agent-run-id-sanitization/investigation-notes.md`
- Requirements: `tickets/done/agent-run-id-sanitization/requirements.md`

## Solution Sketch

### Use Cases In Scope

- `UC-001` Standalone AutoByteus run creation generates a readable run id for a definition whose `name` and `role` may be identical.
- `UC-002` Direct runtime-created agent ids generated inside `autobyteus-ts` use the same readable-id normalization contract as standalone server-created run ids.
- `UC-003` Memory/archive reads for runs without `raw_traces_archive.jsonl` avoid misleading missing-file warnings.

### Spine Inventory In Scope

| Spine ID | Scope | Start | End | Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| `DS-001` | Primary End-to-End | `AgentRunService.createAgentRun(...)` | run id persisted under `memory/agents/<runId>` | `AgentRunService` + shared readable-id formatter | This is the standalone AutoByteus path that produced the reported duplicated/spaced run id. |
| `DS-002` | Primary End-to-End | `AgentFactory.createAgent(...)` | runtime agent created with readable `agentId` | shared readable-id formatter | This is the runtime-local path that owned the original readable-id generation logic. |
| `DS-003` | Return/Event | archive-memory read request | empty archive result returned without warning | `MemoryFileStore` | This controls the misleading missing-file warning surfaced in the user log. |

### Primary Owners / Main Domain Subjects

- `Readable agent/run id formatting`
  - authoritative owner: `autobyteus-ts/src/agent/factory/agent-id.ts`
- `Standalone AutoByteus run-id provisioning`
  - authoritative owner: `autobyteus-server-ts/src/run-history/utils/agent-run-id-utils.ts`
- `Optional archive-file read behavior`
  - authoritative owner: `autobyteus-server-ts/src/agent-memory/store/memory-file-store.ts`

### Requirement Coverage Guarantee

- `REQ-001`, `REQ-002`, `REQ-003`, `REQ-004`, `REQ-005`
  - covered by `DS-001` and `DS-002`
- `REQ-006`
  - covered by investigation-confirmed no-mismatch finding and by preserving literal run-id lookup behavior
- `REQ-007`
  - covered by `DS-003`
- `REQ-008`
  - covered by explicit forward-only generator change with no persisted-run migration
- `REQ-009`
  - covered by the investigation/design artifact set for this ticket

### Target Architecture Shape

- Keep one authoritative readable-id formatter in `autobyteus-ts`.
- Make server standalone AutoByteus run-id generation a thin wrapper around that formatter instead of owning duplicate formatting logic.
- Normalize readable-id segments into folder-safe slugs.
- Collapse identical normalized `name` and `role` stems into one stem before appending the numeric suffix.
- Preserve existing team-member hashed id generation without change.
- Preserve literal run-id-based memory directory lookup without adding a second sanitization layer in the storage path owners.
- Treat `raw_traces_archive.jsonl` as optional in the specific archive-read path by suppressing the missing-file warning only for that call.

### API / Behavior Delta

- New readable standalone/new-agent ids will be normalized, for example:
  - before: `Xiaohongshu marketer_Xiaohongshu marketer_3615`
  - after: `xiaohongshu_marketer_3615`
- Historical persisted run ids are unchanged and remain restorable as stored.
- Archive reads still return `[]` when the file does not exist, but no longer warn for that optional case.

### Planned Change Set

| Change ID | Spine ID(s) | Owner | Action | Target Files |
| --- | --- | --- | --- | --- |
| `C-001` | `DS-001`, `DS-002` | shared readable-id formatter | Modify | `autobyteus-ts/src/agent/factory/agent-id.ts` |
| `C-002` | `DS-001` | standalone run-id wrapper | Modify | `autobyteus-server-ts/src/run-history/utils/agent-run-id-utils.ts` |
| `C-003` | `DS-003` | optional archive read warning behavior | Modify | `autobyteus-server-ts/src/agent-memory/store/memory-file-store.ts` |
| `C-004` | `DS-001`, `DS-002`, `DS-003` | verification | Add/Modify tests | `autobyteus-ts/tests/unit/agent/factory/agent-id.test.ts`, `autobyteus-ts/tests/unit/agent/factory/agent-factory.test.ts`, `autobyteus-server-ts/tests/unit/run-history/agent-run-id-utils.test.ts`, `autobyteus-server-ts/tests/unit/agent-memory/memory-file-store.test.ts` |

### Key Assumptions

- No external contract requires new readable standalone run ids to preserve spaces.
- Team/member id generation is already correct and does not need redesign in this ticket.
- Forward-only change is acceptable for newly generated ids.

### Known Risks

- Any unobserved consumer that string-matches newly generated readable run ids with spaces would see a forward-format change.
- Shared formatter changes affect both standalone run ids and direct runtime-created agent ids, so tests must verify both call paths explicitly.

## Runtime Call Stack Review Gate Summary

| Round | Review Result | Findings Requiring Persisted Updates | New Use Cases Discovered | Persisted Updates Completed | Classification (`Design Impact`/`Requirement Gap`/`Unclear`/`N/A`) | Required Re-Entry Path | Round State (`Reset`/`Candidate Go`/`Go Confirmed`) | Clean Streak After Round |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Pass | No | No | N/A | `N/A` | `N/A` | `Candidate Go` | 1 |
| 2 | Pass | No | No | N/A | `N/A` | `N/A` | `Go Confirmed` | 2 |

## Go / No-Go Decision

- Decision: `Go`
- Evidence:
  - Final review round: `2`
  - Clean streak at final round: `2`
  - Final review gate line (`Implementation can start`): `Yes`

## Execution Tracking

### Change Status

| Change ID | Status | Notes |
| --- | --- | --- |
| `C-001` | Completed | Shared readable-id formatter now normalizes segments and deduplicates identical `name`/`role` stems. |
| `C-002` | Completed | Standalone AutoByteus run-id helper now delegates to the shared formatter. |
| `C-003` | Completed | Optional archive-file reads suppress misleading missing-file warnings only for the archive path. |
| `C-004` | Completed | Added and updated targeted unit tests in `autobyteus-ts` and `autobyteus-server-ts`. |

### Validation Completed During Stage 6

- `pnpm install --frozen-lockfile`
  - required once because the dedicated ticket worktree initially had no installed workspace dependencies
- `pnpm -C autobyteus-ts exec vitest --run tests/unit/agent/factory/agent-id.test.ts tests/unit/agent/factory/agent-factory.test.ts`
  - `Passed`
- `pnpm -C autobyteus-server-ts exec vitest --run tests/unit/run-history/agent-run-id-utils.test.ts tests/unit/agent-memory/memory-file-store.test.ts`
  - `Passed`

### Notes

- The earlier off-workflow implementation from the personal workspace has been migrated into the dedicated ticket worktree.
