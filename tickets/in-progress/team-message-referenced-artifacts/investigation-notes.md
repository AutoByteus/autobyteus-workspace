# Investigation Notes

## Investigation Status

- Bootstrap Status: Complete; existing dedicated ticket worktree reused.
- Current Status: Requirements and design updated for explicit `send_message_to.reference_files`; ready for architecture review.
- Investigation Goal: Replace implicit message-content file-path scanning with a structured send-message reference-list contract while preserving the working team-level Sent/Received Artifacts model.
- Scope Classification (`Small`/`Medium`/`Large`): Medium.
- Scope Classification Rationale: The UI/projection/content serving path is already in the right general shape, but the source contract changes across tool schemas, delivery DTOs, synthetic events, processor input, tests, and instructions. No broad UI redesign or storage redesign is needed.
- Scope Summary: `send_message_to` should carry optional explicit `reference_files`; accepted inter-agent events should use that field as the only source for message-file-reference declarations. The frontend should keep **Agent Artifacts**, **Sent Artifacts**, and **Received Artifacts** sections backed by team-level canonical references.
- Primary Questions To Resolve:
  1. What should be the authoritative source of message-file references?
  2. How should recipient agents learn about explicit reference files without requiring noisy prose conventions?
  3. Which existing content-scanning pieces should be removed or refactored?
  4. Which implementation boundaries must be updated so Codex, Claude, and native/autobyteus send-message paths share the same contract?

## Request Context

The ticket began as a replacement for clickable message paths: preserve existing inter-agent conversation rendering and show referenced files in the Artifacts tab instead. User discussion first refined the model from receiver-scoped references to a canonical team-level projection shown as **Sent Artifacts** for the sender and **Received Artifacts** for the receiver.

After seeing the feature working, the user noticed that content-scanned references include many duplicate/context files and sometimes files not created by the sender. The user proposed improving `send_message_to` by adding an optional explicit reference/attachment list, then confirmed that scanning file paths out of message content should be removed rather than kept as fallback.

Design vocabulary from the discussion:

- Use a structured optional field for files the recipient may need to inspect.
- Keep message `content` natural and detailed.
- Prefer positive guidance about what goes in the reference list.
- Avoid adding unnatural defensive wording to the message content or agent-facing prose.
- Keep Sent/Received grouping simple; no occurrence count/history UI.

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git.
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-message-referenced-artifacts`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-message-referenced-artifacts/tickets/in-progress/team-message-referenced-artifacts`
- Current Branch: `codex/team-message-referenced-artifacts`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-message-referenced-artifacts`
- Bootstrap Base Branch: `origin/personal`.
- Remote Refresh Result: Existing worktree reused; no new worktree created during this design refactor round.
- Task Branch: `codex/team-message-referenced-artifacts`
- Expected Base Branch (if known): `origin/personal`
- Expected Finalization Target (if known): `personal`
- Bootstrap Blockers: None.
- Notes For Downstream Agents: Source edits should happen only in `/Users/normy/autobyteus_org/autobyteus-worktrees/team-message-referenced-artifacts`. Existing downstream implementation/review/validation artifacts predate this explicit-reference refactor and should be treated as stale where they mention content scanning or Markdown path extraction as target behavior.

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-05-04 | Other | User discussion in current session | Clarify product direction after Sent/Received UI was visible | User likes Sent/Received model but sees noisy/duplicated rows from content scanning. User proposed an optional send-message reference/attachment list and later confirmed content path detection should be removed. | Yes: update design and route back through architecture review. |
| 2026-05-04 | Other | User wording preference in current session | Decide schema/instruction phrasing | User prefers natural message content and positive guidance for the reference list. Avoid agent-facing negative/prohibitive wording about path handling in the message body. | Yes: tool descriptions should describe what `reference_files` is for. |
| 2026-05-04 | Command | `git status --short --branch` in ticket worktree | Verify dedicated branch/worktree state | Branch is `codex/team-message-referenced-artifacts`, tracking `origin/personal`; many source changes from earlier implementation exist, and ticket artifacts are untracked/modified. | No. |
| 2026-05-04 | Code | `autobyteus-server-ts/src/agent-execution/backends/codex/team-communication/codex-send-message-tool-spec-builder.ts` | Inspect Codex `send_message_to` schema | Schema currently has `recipient_name`, `content`, `message_type`; no `reference_files`. | Add optional array schema and examples. |
| 2026-05-04 | Code | `autobyteus-server-ts/src/agent-execution/backends/claude/team-communication/claude-send-message-tool-definition-builder.ts` | Inspect Claude `send_message_to` schema | Zod schema currently has `recipient_name`, `content`, `message_type`; no `reference_files`. | Add optional array with same semantics. |
| 2026-05-04 | Code | `autobyteus-server-ts/src/agent-team-execution/services/send-message-to-tool-argument-parser.ts` | Inspect shared server argument parser | `SendMessageToToolArguments` currently parses recipient/content/messageType only. | Add normalization/validation for `referenceFiles`. |
| 2026-05-04 | Code | `autobyteus-server-ts/src/agent-team-execution/domain/inter-agent-message-delivery.ts` | Inspect delivery DTO boundary | `InterAgentMessageDeliveryRequest` currently carries sender/team/recipient/content/messageType only. | Add `referenceFiles`. |
| 2026-05-04 | Code | `autobyteus-server-ts/src/agent-team-execution/services/inter-agent-message-runtime-builders.ts` | Inspect recipient-visible runtime input and synthetic event builder | Builds recipient-visible content and `INTER_AGENT_MESSAGE` payload. This is the right shared place to append a generated reference-files block and include `payload.reference_files`. | Modify builders; avoid provider-specific duplication. |
| 2026-05-04 | Code | `autobyteus-ts/src/agent/message/send-message-to.ts` | Inspect native/autobyteus send-message tool | Native tool schema and `_execute` path do not carry reference files. | Add matching schema and event fields. |
| 2026-05-04 | Code | `autobyteus-ts/src/agent-team/events/agent-team-events.ts` and `autobyteus-ts/src/agent/message/inter-agent-message.ts` | Inspect native inter-agent request/message DTOs | Current events/messages carry content/messageType but no explicit references. | Add `referenceFiles` to keep native path consistent. |
| 2026-05-04 | Code | `autobyteus-ts/src/agent/handlers/inter-agent-message-event-handler.ts` | Inspect recipient runtime handler in native package | Builds recipient-facing user message and notifier payload. Needs the same explicit reference context for native paths. | Add generated reference block/metadata where this path is used. |
| 2026-05-04 | Code | `autobyteus-server-ts/src/agent-execution/events/processors/message-file-reference/message-file-reference-processor.ts` | Inspect current reference declaration owner | Processor currently scans `payload.content` with `extractMessageFileReferencePathCandidates`. Processor boundary is still useful, but its source should become `payload.reference_files`. | Refactor, do not remove processor concept. |
| 2026-05-04 | Code | `autobyteus-server-ts/src/agent-execution/events/processors/message-file-reference/message-file-reference-paths.ts` | Inspect current implicit parser | Contains regex/Markdown-ish path extraction helpers. This is exactly the content-scanning behavior the new design removes. | Remove/decommission or replace with explicit list normalizer. |
| 2026-05-04 | Code | `autobyteus-server-ts/src/services/message-file-references/*`, `autobyteus-web/stores/messageFileReferencesStore.ts`, `autobyteus-web/components/workspace/agent/ArtifactList.vue` | Confirm team-level projection/UI direction | Current in-ticket code already largely follows team-level store/projection and Sent/Received UI. | Preserve, adjust only if payload/source changes require it. |
| 2026-05-04 | Log/Data | `/Users/normy/.autobyteus/logs/app.log`, `/Users/normy/.autobyteus/server-data/memory/agent_teams/team_classroomsimulation_4dcfd073` | Investigate earlier missing math-problem artifact | Historical sample showed a Markdown-bolded path in content was not detected by parser. | Superseded as implementation target; still evidence that content parsing is brittle. |
| 2026-05-04 | Other | User screenshots of working Software Engineering Team Artifacts tab | Verify current feature health | Sent/Received sections are visibly useful and working for some messages; issue is source noise/implicit extraction, not the broad UI direction. | Preserve UI shape. |

## Current Behavior / Current Flow

- Current entrypoint or first observable boundary: `send_message_to` tool calls in Codex/Claude/native team members.
- Current execution flow in the in-ticket implementation:
  1. A sender calls `send_message_to(recipient_name, content, message_type)`.
  2. Provider-specific tool handlers parse those fields and call `InterAgentMessageDeliveryHandler`.
  3. Team managers/builders create recipient-visible input and synthetic `INTER_AGENT_MESSAGE` run events.
  4. `MessageFileReferenceProcessor` scans `payload.content` and emits `MESSAGE_FILE_REFERENCE_DECLARED` for extracted paths.
  5. Message-reference services persist team-level references and stream/hydrate them to the frontend.
  6. Frontend store derives focused-member **Sent Artifacts**/**Received Artifacts** and the viewer fetches content by team/reference id.
- Ownership or boundary observations:
  - Tool schemas own the public agent contract and are currently too thin for explicit file references.
  - Runtime builders are the correct shared recipient-message/event shaping boundary.
  - The processor remains the correct sidecar event-derivation owner, but content scanning is the wrong source authority.
  - Message-reference services own persistence/content; frontend stores own projection for focused-member views.
- Current behavior summary: The broad projection/UI design is good, but file-reference intent is inferred from prose instead of explicitly declared.

## Design Health Assessment Evidence

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Behavior change plus bounded refactor.
- Candidate root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue and Legacy Or Compatibility Pressure.
- Refactor posture evidence summary: Adding `reference_files` while retaining content scanning would create dual authoritative inputs. Replacing content scanning with explicit references is a clean-cut refactor across the send-message contract and event processor.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| User screenshots/discussion | Sent/Received sections are valuable, but rows can be noisy/duplicated because every path in prose becomes an artifact. | UI direction should stay; source contract must change. | Yes. |
| `message-file-reference-processor.ts` | Processor scans `payload.content`. | Processor boundary is healthy; its input authority is wrong. | Refactor processor. |
| `message-file-reference-paths.ts` | Regex/parser logic exists solely to infer paths from content. | This file represents obsolete implicit API behavior. | Remove or replace with explicit reference-list normalization. |
| Send-message schemas | No `reference_files` field exists. | Public tool contract does not express artifact-sharing intent. | Add field across providers. |
| Team-level projection/store | Current direction uses canonical refs and Sent/Received selectors. | This owner/boundary remains correct. | Preserve. |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-execution/backends/codex/team-communication/codex-send-message-tool-spec-builder.ts` | Codex dynamic tool schema | Lacks explicit reference list | Add `reference_files` schema and positive description. |
| `autobyteus-server-ts/src/agent-execution/backends/codex/team-communication/codex-send-message-dynamic-tool-registration.ts` | Codex tool execution adapter | Delivers parsed args without reference files | Pass normalized `referenceFiles` to delivery. |
| `autobyteus-server-ts/src/agent-execution/backends/claude/team-communication/claude-send-message-tool-definition-builder.ts` | Claude MCP tool schema | Lacks explicit reference list | Add matching Zod schema. |
| `autobyteus-server-ts/src/agent-execution/backends/claude/team-communication/claude-send-message-tool-call-handler.ts` | Claude tool execution adapter | Delivers parsed args without reference files | Pass normalized `referenceFiles` to delivery. |
| `autobyteus-server-ts/src/agent-team-execution/services/send-message-to-tool-argument-parser.ts` | Shared server-side send-message parser | Reads only recipient/content/messageType | Add shared explicit reference parsing/validation. |
| `autobyteus-server-ts/src/agent-team-execution/domain/inter-agent-message-delivery.ts` | Delivery boundary DTO | No referenceFiles | Add `referenceFiles: string[]` or optional equivalent normalized to empty array. |
| `autobyteus-server-ts/src/agent-team-execution/services/inter-agent-message-runtime-builders.ts` | Shared recipient input and synthetic event builder | Centralizes accepted message content/event shape | Add generated **Reference files:** block and `payload.reference_files`. |
| `autobyteus-server-ts/src/agent-team-execution/backends/*/*team-manager.ts` | Team-manager delivery implementations | Normalize request before recipient input/event | Preserve thin managers; use shared builders and pass references. |
| `autobyteus-ts/src/agent/message/send-message-to.ts` | Native/autobyteus send-message tool | No reference_files schema | Add same public field. |
| `autobyteus-ts/src/agent-team/events/agent-team-events.ts` | Native team event DTO | No reference files | Add `referenceFiles`. |
| `autobyteus-ts/src/agent/message/inter-agent-message.ts` | Native recipient message DTO | No reference files | Add explicit references so recipient handlers/notifiers can render/carry them. |
| `autobyteus-ts/src/agent/handlers/inter-agent-message-event-handler.ts` | Native recipient runtime handler | Builds recipient-facing input | Append generated reference block/metadata for native path. |
| `autobyteus-server-ts/src/agent-execution/events/processors/message-file-reference/message-file-reference-processor.ts` | Derived message-reference event processor | Currently scans content | Keep file/class or rename, but process explicit refs only. |
| `autobyteus-server-ts/src/agent-execution/events/processors/message-file-reference/message-file-reference-paths.ts` | Free-text path extraction | Obsolete under explicit-reference design | Remove/decommission or replace with explicit list normalizer. |
| `autobyteus-server-ts/src/agent-execution/events/processors/message-file-reference/message-file-reference-payload-builder.ts` | Declaration payload builder | Normalizes path, infers type, builds id | Keep and reuse for explicit refs. |
| `autobyteus-server-ts/src/services/message-file-references/*` | Team-level projection/content services | Correct ownership for persisted references and content | Preserve team-level identity; no receiver-scoped authority. |
| `autobyteus-web/stores/messageFileReferencesStore.ts` | Frontend canonical reference state and Sent/Received selectors | Correct perspective owner | Preserve; payload source changes only. |
| `autobyteus-web/components/workspace/agent/ArtifactList.vue` and related viewer components | Artifacts composition/rendering | Current Sent/Received UI direction is good | Keep simple grouping; avoid duplicate/count UI. |

## Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-05-04 | Runtime screenshot | User showed Software Engineering Team Artifacts tab | **Sent Artifacts** and **Received Artifacts** are visible and useful. Rows include upstream files mentioned as part of handoff context. | UI/projection direction is correct; source selection is too implicit/noisy. |
| 2026-05-04 | Log/Data investigation | `/Users/normy/.autobyteus/logs/app.log` and classroom team memory files | Earlier `**/Users/.../math_problem.txt**` content path was not detected by the scanner. | Historical parser defect is now superseded; it reinforces that content parsing is brittle. |

## External / Public Source Findings

No internet or external sources were needed. The task is a local repository design refactor based on user discussion and code inspection.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: none for design update.
- Required config, feature flags, env vars, or accounts: none for design update.
- External repos, samples, or artifacts cloned/downloaded for investigation: none.
- Setup commands that materially affected the investigation: none beyond local `git status`, `rg`, and file inspection.
- Cleanup notes for temporary investigation-only setup: none.

## Findings From Code / Docs / Data / Logs

1. The correct artifact display model is already established: **Agent Artifacts** for produced file changes, **Sent Artifacts** for explicit references sent by the focused member, and **Received Artifacts** for explicit references received by the focused member.
2. The current source of message references should change from content scanning to explicit `reference_files`.
3. The processor should stay because it keeps derived reference declarations out of provider-specific tool handlers and frontend UI code.
4. The free-text path parser should be removed or replaced by a validator/normalizer for explicit list entries; Markdown wrapper detection should not be extended.
5. Recipient agents still need to see file paths in their actual runtime context; therefore shared runtime builders should render a generated **Reference files:** block from the structured list.
6. The content endpoint and projection service should continue resolving by persisted `teamRunId + referenceId`, not raw path URLs and not receiver-scoped URLs.

## Constraints / Dependencies / Compatibility Facts

- No backward compatibility fallback should keep content scanning alive for new accepted messages.
- No receiver-scoped route/query/store/storage should remain as an authority.
- Existing conversation rendering is protected and should remain separate from artifact projection.
- Existing `runFileChangesStore` and `/runs/:runId/file-change-content` remain authorities for generated **Agent Artifacts** only.
- Tool schemas and native/autobyteus contracts must be updated consistently to avoid provider-specific behavior drift.

## Open Unknowns / Risks

- Agents may omit `reference_files` when they mention file paths in prose. The schema description and member instructions should mitigate this with positive examples.
- Strict validation of invalid reference-list entries may reject a whole message instead of silently dropping one bad path; this is intentional for an explicit contract but should have a concise error.
- Existing tests and docs written for content scanning will need to be updated or removed.

## Notes For Architect Reviewer

Please review this as a superseding design round. The major Sent/Received/team-level direction is preserved; the refactor is specifically to make `send_message_to.reference_files` the sole file-reference authority and to decommission content-path scanning. The design intentionally keeps `MessageFileReferenceProcessor` as the sidecar derivation owner, because removing the processor would push projection concerns into provider-specific tool handlers.
