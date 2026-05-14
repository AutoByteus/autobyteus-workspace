# Requirements

- Status: `Design-ready`
- Ticket: `kimi-tool-stream-visibility`
- Revision: `canonical-invocation-identity-refactor`
- Last Updated: `2026-05-14`

## Goal / Problem Statement

Refactor the tool invocation identity path so AutoByteus uses one canonical invocation id for each logical tool call from runtime/provider event through backend stream events, websocket payloads, frontend transcript projection, Activity projection, approval handling, and file-change correlation.

The previous narrowed-alias hotfix is no longer an acceptable steady-state design. `invocationAliases.ts`, mirrored server alias helpers, Codex approval `itemId:approvalId` combined ids, and colon-splitting fallbacks preserve legacy/cross-stream behavior that violates the project design rule: **no backward compatibility or legacy retention for in-scope replaced behavior**. The target behavior is exact-id correlation only. Tool name, segment type, approval id, and file-change source metadata must remain separate metadata and must never be encoded into or decoded from `invocation_id` for correlation.

This revision supersedes the prior `:write_file`, `:edit_file`, and `:approval-N` alias design. Existing downstream implementation, validation, and delivery artifacts for that narrowed-alias design are historical context only and must not be used as the implementation basis for this refactor.

## Investigation Findings

- The original Kimi 2.5 bug is real and reproduced: AutoByteus/Kimi emitted distinct `run_bash:0..4` invocation ids, tools executed, files were created, the browser received later events, but the middle timeline and Activity panel collapsed later tool calls into the first visible tool entry.
- The primary visible-collapse defect is in our frontend projection, not the Kimi tool core. `autobyteus-web/utils/invocationAliases.ts` creates base aliases for colon-suffixed ids and is consumed by:
  - `autobyteus-web/services/agentStreaming/handlers/segmentHandler.ts`
  - `autobyteus-web/services/agentStreaming/handlers/toolLifecycleHandler.ts`
  - `autobyteus-web/services/agentStreaming/handlers/toolActivityProjection.ts`
- The same alias policy was mirrored in server file-change correlation:
  - `autobyteus-server-ts/src/agent-execution/domain/agent-run-file-change.ts`
  - `autobyteus-server-ts/src/agent-execution/events/processors/file-change/file-change-invocation-context-store.ts`
- Code history confirms this is our codebase behavior, not a provider requirement:
  - `43c89b60` on `2026-04-03` introduced `autobyteus-web/utils/invocationAliases.ts` and centralized frontend alias matching.
  - `83d1a8b2` on `2026-05-02` introduced Activity projection usage that made the Kimi collapse visible in Activity.
  - `0eba4c0f` on `2026-05-03` added the server-side file-change alias copy.
- AutoByteus/Kimi evidence shows exact ids are preserved through the runtime stream boundary; no AutoByteus provider-native path requires `call_3:write_file` or `approval-N` aliases.
- Codex MCP runtime evidence shows exact ids across `SEGMENT_START`, `TOOL_EXECUTION_STARTED`, `TOOL_APPROVAL_REQUESTED`, `TOOL_APPROVED`, `TOOL_EXECUTION_SUCCEEDED`, `SEGMENT_END`, and `TOOL_LOG` for the same `call_...` id. No alias is required.
- Claude Agent SDK runtime evidence shows exact ids across tool segment, lifecycle, approval, file-change, and result events for the same `call_...` id. No alias is required.
- Codex terminal approval has an adapter-level legacy shape in our code:
  - `codex-thread-server-request-handler.ts` constructs `primary: ${itemId}:${approvalId}` and stores `itemId` as an alias when `approvalId` exists.
  - `codex-thread.ts` stores approval records under aliases and falls back from `foo:bar` to `foo` in `findApprovalRecord()`.
  - `codex-item-event-payload-parser.ts` appends `approval_id`/`approvalId` to the public invocation id.
  This is our adapter/protocol design smell, not an SDK requirement the frontend should understand.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): `Refactor` plus `Bug Fix` and `Behavior Change`
- Initial design issue signal (`Yes`/`No`/`Unclear`): `Yes`
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): `Legacy Or Compatibility Pressure`, `Boundary Or Ownership Issue`, `Shared Structure Looseness`, and `Duplicated Policy Or Coordination`
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): `Needed now`
- Evidence basis: live Kimi reproduction, web/server code inspection, git history, Codex MCP runtime logs, Claude runtime logs, Codex thread approval code and integration test helper inspection.
- Requirement or scope impact: the target is no longer a narrowed alias allowlist. The target is canonical exact invocation identity and deletion of alias/fallback semantics across web, server file-change, and Codex approval adapter paths.

## Recommendations

- Remove `autobyteus-web/utils/invocationAliases.ts` and all active imports/usages. Do not replace it with a narrower compatibility helper.
- Remove server-side `buildInvocationAliases()` / `invocationIdsMatch()` from `agent-run-file-change.ts` and stop re-exporting them from run-file-change service types.
- Refactor `FileChangeInvocationContextStore` to key, find, consume, and delete contexts by exact `sourceInvocationId` only.
- Refactor Codex approval identity so public `invocation_id` remains the canonical tool item/call id (`itemId`/`call_id`) and `approvalId` / `requestId` are separate record metadata.
- Remove Codex approval alias storage and colon-split fallback lookup.
- Update tests and docs to make old alias shapes negative cases, not supported compatibility cases.
- Keep provider/runtime exact-id tests for Kimi, Codex, and Claude so the invariant is guarded at stream boundaries.

## Scope Classification (`Small`/`Medium`/`Large`)

`Medium`. Code edits are localized, but the identity invariant crosses frontend projection, server file-change projection, Codex approval bridging, docs, and multi-runtime validation.

## In-Scope Use Cases

- `UC-001`: A Kimi 2.5 AutoByteus run emits multiple tool calls with ids such as `run_bash:0`, `run_bash:1`, and `run_bash:2`; each id remains distinct and renders as a separate middle-timeline tool segment and Activity event.
- `UC-002`: Segment-first and lifecycle-first events for the same logical tool call correlate only when their ids are exactly equal.
- `UC-003`: File-change context correlation attaches changes only to the exact invocation id that produced them.
- `UC-004`: Codex MCP approval/execution keeps one exact `call_...` id across segment, lifecycle, approval, result, and log events.
- `UC-005`: Codex terminal approval uses canonical `itemId` as the public invocation id while preserving `approvalId` and `requestId` as separate internal metadata.
- `UC-006`: Claude Agent SDK approval/file-write flow keeps exact `tool_use.id` across segment, lifecycle, approval, file-change, and completion events.
- `UC-007`: Existing docs explain exact canonical invocation identity and do not document alias exceptions.

## Out of Scope

- Redesigning unrelated chat UI rendering, Activity layout, or file browser layout.
- Changing provider credentials or model configuration.
- Adding new model providers.
- Solving unrelated Xiaomi/OpenAI-compatible `400 Param Incorrect` request-shape failures unless exact-id changes directly expose the same code path.
- Preserving compatibility for historical alias shapes such as `call_3:write_file`, `call_3:edit_file`, `bash-alias-base:approval-1`, or `itemId:approvalId`.

## Functional Requirements

- `REQ-001`: For every logical tool invocation, `SEGMENT_START.payload.id`, `SEGMENT_END.payload.id`, `TOOL_EXECUTION_STARTED.payload.invocation_id`, `TOOL_APPROVAL_REQUESTED.payload.invocation_id`, `TOOL_APPROVED.payload.invocation_id`, `TOOL_DENIED.payload.invocation_id`, `TOOL_EXECUTION_SUCCEEDED.payload.invocation_id`, `TOOL_EXECUTION_FAILED.payload.invocation_id`, and `TOOL_LOG.payload.tool_invocation_id` must refer to the same canonical id when they describe the same invocation.
- `REQ-002`: Frontend transcript and Activity projection must correlate tool events by exact id equality only. No colon parsing, suffix allowlist, prefix fallback, or alias expansion may participate in correlation.
- `REQ-003`: Server file-change context correlation must use exact `sourceInvocationId` keys only. A context recorded for `call_1` must not be found, consumed, overwritten, or deleted through `call_1:write_file`, `call_1:edit_file`, `call_1:approval-1`, or any other suffixed id.
- `REQ-004`: Codex approval handling must expose canonical public `invocation_id` as the Codex item/tool call id. `approvalId`, `requestId`, method, and response mode must be separate record fields and must not be concatenated into `invocation_id`.
- `REQ-005`: Codex approval record lookup and deletion must be exact-key operations. No alias record insertion and no `split(':')[0]` fallback are allowed.
- `REQ-006`: Codex item event parsing must not append `approval_id` / `approvalId` to the resolved public invocation id.
- `REQ-007`: AutoByteus/Kimi, Codex MCP, Codex terminal approval, and Claude runtime paths must continue to execute tools and emit visible lifecycle/projection events after the refactor.
- `REQ-008`: Documentation must describe canonical exact invocation identity and must remove prior alias examples/allowlists.
- `REQ-009`: Durable tests must encode old alias shapes as unsupported negative cases.

## Acceptance Criteria

- `AC-001`: Active source search for `buildInvocationAliases`, `invocationIdsMatch`, and `invocationAliases` returns no production source references in `autobyteus-web` or `autobyteus-server-ts`; the old web utility file and its old positive alias tests are removed.
- `AC-002`: Frontend handler tests prove `run_bash:0..4` produce five transcript tool segments and five Activity rows, and prove `call_1` and `call_1:write_file`, `call_1:edit_file`, `call_1:approval-1`, `run_bash:1`, and `run_bash` are all distinct ids.
- `AC-003`: Frontend ordering tests prove segment-first/lifecycle-first dedupe still works for exact same ids and does not dedupe for alias-shaped mismatches.
- `AC-004`: Server file-change tests prove exact-only `FileChangeInvocationContextStore` behavior: recording `call_1` cannot be found or consumed with `call_1:write_file`, and recording `call_1:write_file` cannot be found or consumed with `call_1`.
- `AC-005`: Codex parser/approval tests prove `approvalId` is not appended to `invocation_id`, approval records are stored and looked up by canonical item id, and `findApprovalRecord('item:approval')` does not fall back to `item`.
- `AC-006`: Focused Codex MCP and Claude runtime/e2e tests pass and show exact ids across tool segment/lifecycle/approval/result/log events.
- `AC-007`: Kimi/AutoByteus stream-boundary tests pass and preserve distinct `run_bash:N` ids.
- `AC-008`: `autobyteus-web/docs/agent_execution_architecture.md` and `autobyteus-server-ts/docs/modules/agent_artifacts.md` contain exact-id guidance and no supported alias examples.

## Constraints / Dependencies

- Work must happen in the dedicated ticket worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/kimi-tool-stream-visibility` on branch `codex/kimi-tool-stream-visibility`.
- `.env.test` may contain real provider credentials and must not be committed or quoted.
- The current branch already has uncommitted narrowed-alias changes; implementation must replace those with the exact-only design rather than layering on top.
- Approval UX must still have enough information to approve/deny Codex and Claude tool calls. Any provider-specific approval metadata must remain behind the runtime adapter/server approval owner, not leak into frontend id matching.

## Assumptions

- `invocation_id` is the public identity of a tool invocation, not a compound transport for approval, tool type, or segment metadata.
- Codex and Claude can be approved by the backend using internal approval records keyed by canonical id plus separate metadata; the frontend does not need alias semantics to approve a single-agent tool.
- Team approval tokens are a separate existing capability and are not a reason to encode provider approval ids in `invocation_id`.

## Risks / Open Questions

- Codex terminal approval paths with provider-supplied `approvalId` must be exercised carefully because current tests contain a helper that expects `${itemId}:${approvalId}`.
- Some old historical run data may contain alias-shaped ids. This refactor intentionally does not preserve compatibility for old runs; if historical display repair is desired, it must be designed as a separate migration/reporting feature, not hidden in live correlation.
- Existing docs and tests generated during the narrowed-alias hotfix are now stale and must be updated or removed.

## Requirement-To-Use-Case Coverage

| Requirement | Covered Use Cases |
| --- | --- |
| `REQ-001` | `UC-001`, `UC-002`, `UC-004`, `UC-006` |
| `REQ-002` | `UC-001`, `UC-002` |
| `REQ-003` | `UC-003`, `UC-006` |
| `REQ-004` | `UC-004`, `UC-005` |
| `REQ-005` | `UC-005` |
| `REQ-006` | `UC-005` |
| `REQ-007` | `UC-001`, `UC-004`, `UC-005`, `UC-006` |
| `REQ-008` | `UC-007` |
| `REQ-009` | `UC-001` through `UC-007` |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criterion | Scenario Intent |
| --- | --- |
| `AC-001` | Proves alias helper removal from active source. |
| `AC-002` | Guards the original Kimi visibility bug and old alias negative cases. |
| `AC-003` | Preserves exact-id lifecycle ordering behavior without aliases. |
| `AC-004` | Guards server file-change exact correlation. |
| `AC-005` | Guards Codex approval exact identity and metadata separation. |
| `AC-006` | Guards Codex MCP and Claude runtime exact-id behavior. |
| `AC-007` | Guards AutoByteus/Kimi stream-boundary exact-id behavior. |
| `AC-008` | Keeps durable project documentation aligned with the new invariant. |

## Approval Status

- Requirements approval state: `Approved for design by user direction on 2026-05-14`.
- Approval basis: user explicitly directed: “we definitely should do refactoring, remove all legacities… no legacies. now please start refactoring design”.
