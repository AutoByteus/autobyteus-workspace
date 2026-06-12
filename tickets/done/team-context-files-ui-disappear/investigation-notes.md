# Investigation Notes

## Investigation Status

- Bootstrap Status: Complete
- Current Status: Root cause identified; user approved kicking off the refactoring design on 2026-06-11; package ready for architecture review.
- Investigation Goal: Determine why agent-team context files are delivered to backend/runtime but disappear from the frontend conversation/monitor UI after send, while independent-agent sent context files remain visible.
- Scope Classification (`Small`/`Medium`/`Large`): Medium
- Scope Classification Rationale: The immediate regression crosses frontend optimistic local submission, team streaming echo reconciliation, and backend team member-input event mapping. A secondary hydration gap touches run projection mapping.
- Scope Summary: Team context files vanish because a backend team member-input echo drops context-file metadata, then frontend dedupe reconciliation overwrites the richer local sent message with that empty echo. Independent-agent sends do not use that team echo path.
- Primary Questions To Resolve:
  - Where are context files attached in independent-agent send flow and how do they become visible on the sent user message? Resolved.
  - Where are context files attached in agent-team send flow and which UI-facing message/event shape drops them? Resolved.
  - Is the issue runtime-specific? Resolved: no; provided raw trace and code path show runtime receives the file before UI echo loss.
  - Is there a reload/hydration issue too? Partially resolved: frontend hydration currently drops user media into `contextFilePaths: []`.

## Request Context

User reports a recent regression: independent-agent context image attachments are shown correctly in the agent monitor area after sending, but agent-team context files disappear from the frontend UI immediately after send. The backend runtime still receives the files, independent of selected runtime. User provided two screenshot files and two absolute context image paths under `.autobyteus/server-data/memory/agent_teams/.../context_files/`.

Important user clarification: “the frontend disappears, but it seems the backend runtime actually received the file, its sent to the different runtimes”. This matches the investigation: runtime receipt works; frontend state reconciliation loses the display metadata.

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-context-files-ui-disappear`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-context-files-ui-disappear/tickets/team-context-files-ui-disappear`
- Current Branch: `codex/team-context-files-ui-disappear`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-context-files-ui-disappear`
- Bootstrap Base Branch: `origin/personal`
- Remote Refresh Result: `git fetch origin --prune` succeeded on 2026-06-11.
- Task Branch: `codex/team-context-files-ui-disappear` created from `origin/personal`.
- Expected Base Branch (if known): `personal` / `origin/personal`
- Expected Finalization Target (if known): `personal`
- Bootstrap Blockers: None
- Notes For Downstream Agents: Work in the dedicated task worktree, not `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo`.

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-06-11 | Command | `pwd && git rev-parse --show-toplevel && git status --short --branch && git remote -v && git branch --show-current` | Bootstrap repo context | Starting checkout was `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo` on branch `personal`, tracking `origin/personal`. | No |
| 2026-06-11 | Command | `git worktree list --porcelain`; `git symbolic-ref refs/remotes/origin/HEAD`; `git branch -r` | Determine existing task worktrees and base branch | No existing `codex/team-context-files-ui-disappear` worktree/branch; remote default is `origin/personal`. | No |
| 2026-06-11 | Command | `git fetch origin --prune` | Refresh tracked remote refs before creating task branch | Fetch succeeded. | No |
| 2026-06-11 | Command | `git worktree add -b codex/team-context-files-ui-disappear /Users/normy/autobyteus_org/autobyteus-worktrees/team-context-files-ui-disappear origin/personal` | Create dedicated task worktree/branch | Worktree created at commit `d0bf457a` (`chore(release): bump workspace release version to 1.3.51`). | No |
| 2026-06-11 | Data | User-provided screenshots and files `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_2b87d341cc1047bb853e23d9a47521db/solution_designer_aab72e84e9904401a9d4b280eab12c95/context_files/ctx_210ab6fbe340__image.png` and `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_2b87d341cc1047bb853e23d9a47521db/solution_designer_aab72e84e9904401a9d4b280eab12c95/context_files/ctx_1ffe3a4491b2__image.png` | Understand observed behavior | Team screenshot shows files stored in backend memory but no sent context preview in monitor; independent-agent screenshot shows `Context files` preview on sent user message. | No |
| 2026-06-11 | Command | `rg -n "Context Files|contextFiles|context_files|context files|contextFile|Context files|context_files" autobyteus-web autobyteus-server-ts autobyteus-ts applications -S` | Locate context-file frontend/backend paths | Found send stores, streaming services, external user message handler, backend stream handlers, team member-input payload builder, and context-file docs. | No |
| 2026-06-11 | Code | `autobyteus-web/stores/agentRunStore.ts` | Compare independent-agent send path | Independent send uses `beginLocalUserSubmission`, finalizes draft attachments, updates the same local user message, and sends over `AgentStreamingService`. It does not receive a team member-input echo. | No |
| 2026-06-11 | Code | `autobyteus-web/stores/agentTeamRunStore.ts` | Trace team send path | Team send uses `beginLocalUserSubmission`, finalizes draft attachments, assigns `messageId`/`dedupeKey`, then sends over `TeamStreamingService`. This creates a local message with attachments before the backend echo arrives. | No |
| 2026-06-11 | Code | `autobyteus-web/services/runSubmission/localUserSubmission.ts` | Verify composer clearing versus sent message state | `beginLocalUserSubmission` pushes a user message with `contextFilePaths: [...attachments]`, then clears `context.contextFilePaths = []`. Composer clearing is correct and separate from sent-message metadata. | No |
| 2026-06-11 | Code | `autobyteus-web/components/conversation/UserMessage.vue` | Verify rendering source | The sent-file preview renders from `(props.message.contextFilePaths ?? [])`. If that array becomes empty, the UI hides the `Context files` section. | No |
| 2026-06-11 | Code | `autobyteus-web/services/agentStreaming/handlers/externalUserMessageHandler.ts` | Inspect live echo reconciliation | Handler builds `contextFilePaths` from `payload.context_file_paths`; if a message with matching `messageId`/`dedupeKey` exists, it spreads `...existing, ...userMessage`, overwriting existing attachments with incoming attachments, including empty arrays. | No |
| 2026-06-11 | Code | `autobyteus-web/services/agentStreaming/TeamStreamingService.ts` | Confirm team echo dispatch | Team streaming dispatches `EXTERNAL_USER_MESSAGE` to the resolved member context and calls `handleExternalUserMessage`, so the echo can overwrite the local sent message. | No |
| 2026-06-11 | Code | `autobyteus-server-ts/src/services/agent-streaming/agent-team-stream-handler.ts` | Trace backend team `SEND_MESSAGE` handling | Team handler receives `context_file_paths` and `image_urls`, converts them to `ContextFile[]`, creates `AgentInputUserMessage` with `context_files`, and posts it to `teamRun.postMessage`. Runtime input is correct here. | No |
| 2026-06-11 | Code | `autobyteus-server-ts/src/agent-team-execution/backends/mixed/members/mixed-agent-member-handle.ts` | Locate backend member input echo publication | After `run.postUserMessage(message)` accepts, `publishMemberInput(message)` emits a `TeamRunEventSourceType.MEMBER_INPUT` event built from the same `AgentInputUserMessage`. | No |
| 2026-06-11 | Code | `autobyteus-server-ts/src/agent-team-execution/services/team-member-input-event-builder.ts` | Identify context metadata drop | `readContextFilePath` accepts string or object fields `path`, `locator`, `file_path`; `readContextFilePaths` calls `ContextFile.toDict()` for domain objects before passing to that function. `ContextFile.toDict()` does not emit these fields, so it drops context files. | No |
| 2026-06-11 | Code | `autobyteus-ts/src/agent/message/context-file.ts` | Check canonical context-file serialization | `ContextFile.toDict()` emits `{ uri, file_type, file_name, metadata }`. This is incompatible with team member-input builder's accepted field names. | No |
| 2026-06-11 | Code | `autobyteus-server-ts/src/services/agent-streaming/team-member-input-message-payload.ts` | Verify websocket payload | The websocket payload forwards `eventPayload.contextFilePaths` directly as `context_file_paths`; if the event builder emitted empty array, the frontend receives empty array. | No |
| 2026-06-11 | Trace | `python3` read of `/Users/normy/.autobyteus/server-data/memory/agent_teams/.../raw_traces.jsonl` | Verify actual runtime receipt for user-provided run | User trace `seq: 1` contains original bug-report content and `media.images` with both `/rest/team-runs/.../context-files/ctx_...__image.png` URLs. Confirms runtime/backend received images. | No |
| 2026-06-11 | Code | `autobyteus-web/services/runHydration/runProjectionConversation.ts` | Check reload/hydration behavior | For projected user messages, hydration currently sets `contextFilePaths: []` and does not derive attachments from `entry.media`. This is a secondary historical display gap. | Yes, if implementation includes reload acceptance. |
| 2026-06-11 | Command | `git blame -L 45,90 autobyteus-server-ts/src/agent-team-execution/services/team-member-input-event-builder.ts`; `git blame -L 60,100 autobyteus-web/services/agentStreaming/handlers/externalUserMessageHandler.ts`; `git blame -L 400,445 autobyteus-web/stores/agentTeamRunStore.ts` | Date recent refactor involvement | The team member-input builder and dedupe replacement lines trace to commit `998732fa` (2026-05-13 nested mixed team checkpoint). Local submission/dedupe assignment lines include `af9a99b8` (2026-05-17 merge/status UX). | No |
| 2026-06-11 | Doc | `autobyteus-server-ts/docs/FILE_RENDERING_AND_MEDIA_PIPELINE.md` | Confirm intended storage/serving contract | Finalized team-member uploads should be served as `/rest/team-runs/:teamRunId/members/:memberRouteKey/context-files/:storedFilename`; prompt/runtimes resolve final locators to local paths. | No |

## Current Behavior / Current Flow

- Current entrypoint or first observable boundary: User attaches context file in frontend composer and sends a message to an independent agent or a team member.
- Current team execution flow:
  1. Composer adds attachments to the active team member context.
  2. `agentTeamRunStore.sendMessageToFocusedMember` calls `beginLocalUserSubmission(focusedMember, { text, attachments })`; this pushes a local user message with `contextFilePaths` and clears the composer draft array.
  3. Draft uploads are finalized to team-member final locators.
  4. Local message is assigned `messageId`/`dedupeKey` and its attachments are updated to finalized locators.
  5. `TeamStreamingService.sendMessage` sends text plus partitioned `context_file_paths`/`image_urls` to the backend.
  6. Backend converts those locators to `ContextFile[]` and passes `AgentInputUserMessage` to the runtime; runtime trace confirms this works.
  7. Backend publishes a team member-input `EXTERNAL_USER_MESSAGE` echo.
  8. The echo has empty `context_file_paths` because the event builder drops `ContextFile.toDict()` records.
  9. Frontend handler dedupes by `messageId`/`dedupeKey` and overwrites the local message's non-empty `contextFilePaths` with the empty echo array.
  10. `UserMessage.vue` sees no `contextFilePaths` and hides the attachment preview.
- Current independent-agent execution flow:
  1. `agentRunStore.sendUserInputAndSubscribe` performs the same local message and finalize process.
  2. It sends over `AgentStreamingService` and receives command/status/runtime events, not the team member-input echo that overwrites the local message.
  3. The local message's `contextFilePaths` remains visible.
- Ownership or boundary observations:
  - `ContextFile` is the backend domain context-file model; `ContextFile.toDict()` is the canonical serialized shape for domain runtime messages.
  - `TeamRunMemberInputEventPayload.contextFilePaths` is the team streaming echo shape expected by the frontend.
  - The mapper between these shapes is too loose and currently accepts the wrong object fields.
  - Frontend live dedupe reconciliation lacks a richer-state-preservation invariant.
- Current behavior summary: The backend/runtime receives the file; the team UI loses the sent-file preview because a low-fidelity server echo replaces the local optimistic message. This is frontend-visible but rooted in a backend event-shape bug plus frontend merge fragility.

## Design Health Assessment Evidence

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Bug Fix
- Candidate root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Shared Structure Looseness and Missing Invariant
- Refactor posture evidence summary: A targeted normalizer/mapper correction is needed. No broad refactor is required; existing send/render ownership is otherwise coherent.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| `ContextFile.toDict()` | Emits `uri`, `file_type`, `file_name`, `metadata`. | Team event mapper must understand canonical backend shape. | Implement backend mapper fix + unit test. |
| `team-member-input-event-builder.ts` | Reads `path`, `locator`, `file_path`, and `type` only. | Shared structure looseness: mapper uses frontend-like names instead of backend domain names. | Add support for `uri` and `file_type` or centralize normalizer. |
| `externalUserMessageHandler.ts` | Overwrites existing local message with incoming message even when incoming attachment list is empty. | Missing reconciliation invariant: lower-fidelity echo can erase richer local sent state. | Add merge rule + unit test. |
| User raw trace | First user trace contains `media.images` with final team context-file URLs. | Runtime receipt is not the defect. | No runtime adapter changes needed. |
| `runProjectionConversation.ts` | Hydrated user messages always have `contextFilePaths: []`. | Secondary persistence/hydration display gap. | Map projected `media` to context attachments if in scope. |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-web/components/conversation/UserMessage.vue` | Renders user message text and sent context-file previews. | Uses `message.contextFilePaths` as the only attachment display input. | Fix must feed this field; do not add duplicate display source. |
| `autobyteus-web/services/runSubmission/localUserSubmission.ts` | Owns local optimistic submitted-message creation and composer clearing. | Correctly separates sent-message attachments from composer draft clearing. | No design issue here. |
| `autobyteus-web/stores/agentTeamRunStore.ts` | Orchestrates team member sends, finalizes attachments, assigns message identity, sends over team stream. | Correctly updates local message with finalized attachments before send. | Existing owner remains correct. |
| `autobyteus-web/services/agentStreaming/handlers/externalUserMessageHandler.ts` | Converts external/team user-message echoes into conversation messages and dedupes by identity. | Current merge replaces non-empty attachments with empty incoming attachments. | Add reconciliation invariant. |
| `autobyteus-web/services/agentStreaming/TeamStreamingService.ts` | Routes team websocket events to member contexts. | `EXTERNAL_USER_MESSAGE` goes through shared handler; routing is correct. | No routing change needed. |
| `autobyteus-server-ts/src/services/agent-streaming/agent-team-stream-handler.ts` | Converts frontend team `SEND_MESSAGE` payload into `AgentInputUserMessage` and posts to team run. | Runtime-bound message includes `ContextFile[]`; images are converted from `image_urls` to `ContextFile(..., IMAGE)`. | No runtime delivery change needed. |
| `autobyteus-server-ts/src/agent-team-execution/services/team-member-input-event-builder.ts` | Converts accepted team member input into team event payload for websocket/history consumers. | Drops `ContextFile.toDict()` output because it does not read `uri`/`file_type`. | Primary backend fix owner. |
| `autobyteus-server-ts/src/services/agent-streaming/team-member-input-message-payload.ts` | Converts team member-input event payload to websocket `EXTERNAL_USER_MESSAGE` payload. | Forwards `contextFilePaths` correctly if event builder supplies them. | No change except tests may verify context paths. |
| `autobyteus-ts/src/agent/message/context-file.ts` | Backend domain context-file model. | Provides canonical serialized fields. | Treat as source contract, not target for change. |
| `autobyteus-web/services/runHydration/runProjectionConversation.ts` | Converts persisted run projection entries into UI conversation messages. | User message hydration ignores `entry.media`. | Secondary fix for reload behavior. |

## Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-06-11 | Trace | `python3` script reading `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_2b87d341cc1047bb853e23d9a47521db/solution_designer_aab72e84e9904401a9d4b280eab12c95/raw_traces.jsonl` | The first `user` trace has `media.images` containing `/rest/team-runs/software_engineering_team_.../members/solution_designer/context-files/ctx_210...__image.png` and `ctx_1ffe...__image.png`. | Backend/runtime received and recorded the images; UI loss occurs after or outside runtime send. |
| 2026-06-11 | Static Trace | Manual path comparison: `AgentTeamRunStore` local message -> `TeamStreamingService` -> `AgentTeamStreamHandler` -> `MixedAgentMemberHandle.publishMemberInput` -> `TeamMemberInputEventBuilder` -> `TeamStreamingService` handler | Event builder emits empty context refs; frontend echo merge erases local refs. | Exact failure path identified. |

## External / Public Source Findings

No external/public sources consulted; this is an internal repo behavior bug.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: A focused unit reproduction can be built without launching the full app by testing `buildTeamMemberInputEventPayload` with `new AgentInputUserMessage('x', ..., [new ContextFile('/rest/team-runs/...png', IMAGE)])` and testing `handleExternalUserMessage` against an existing local message with the same `messageId`/`dedupeKey`.
- Required config, feature flags, env vars, or accounts: None for focused unit coverage.
- External repos, samples, or artifacts cloned/downloaded for investigation: None.
- Setup commands that materially affected the investigation: Dedicated worktree creation only.
- Cleanup notes for temporary investigation-only setup: None.

## Findings From Code / Docs / Data / Logs

### Immediate live UI disappearance root cause

1. Team send locally creates the correct visible sent message with `contextFilePaths`.
2. The backend team echo should confirm that same sent message, but its attachment list is empty due to `ContextFile.toDict()` shape mismatch in `team-member-input-event-builder.ts`.
3. The frontend echo handler treats the echo as authoritative because it has the same `messageId`/`dedupeKey` and replaces the existing local message fields.
4. The empty echo attachment list overwrites the local non-empty attachment list.
5. The renderer hides the preview.

### Why independent agents do not show the same bug

The independent-agent path uses the same local submitted-message mechanism, but it does not receive and merge a team member-input `EXTERNAL_USER_MESSAGE` echo for the sent command. Therefore the local message's `contextFilePaths` survive.

### Why runtime selection does not matter

The drop happens in the team event echo and frontend reconciliation after the message has already been converted to `AgentInputUserMessage` and accepted by `run.postUserMessage(message)`. The user-provided raw trace confirms the runtime stored `media.images`, so the selected backend runtime is downstream of the faulty UI echo path.

### Recent-refactor signal

`git blame` shows the relevant team member-input builder and frontend echo dedupe/replacement code are from the nested mixed team/refactor area around 2026-05-13 (`998732fa`) and the local submission/dedupe identity flow around 2026-05-17 (`af9a99b8`). The regression likely appeared when local optimistic sent messages began deduping with server echoes whose context-file metadata was lower fidelity.

### Creation window from git history

The defect was introduced in two related steps:

1. **2026-05-13, commit `998732fa` (`chore(ticket): checkpoint nested mixed team round 6 candidate`)** introduced the new backend `team-member-input-event-builder.ts` and the frontend dedupe merge in `externalUserMessageHandler.ts`. The newly added backend builder already had the shape mismatch: it converted `ContextFile` objects through `toDict()` but only read `path`, `locator`, and `file_path`, not canonical `uri` / `file_type`. The same commit added frontend merge logic that replaces an existing message when `message_id` or `dedupe_key` matches.
2. **2026-05-17, commit `af9a99b8` (`merge origin/personal into nested mixed team`)** and nearby local-submission work wired local optimistic team messages more tightly to the backend echo using `messageId` / `dedupeKey`. That made the 2026-05-13 empty-attachment echo visibly overwrite the local message's attachment list.

So the underlying backend echo data bug dates to **May 13, 2026**. The user-visible “sent attachment appears then disappears” behavior likely became observable once the identity-based local-message reconciliation was active, around **May 13-17, 2026** depending on the branch/runtime state the user ran.

### Why `externalUserMessageHandler` is in the path for a laptop/local send

The name is misleading for this use case. The user's laptop send is not an external-channel message. However, the backend maps **team member input events** to websocket message type `EXTERNAL_USER_MESSAGE` in `team-run-event-websocket-message-mapper.ts`:

- `TeamRunEventSourceType.MEMBER_INPUT` -> `ServerMessageType.EXTERNAL_USER_MESSAGE`
- `TeamStreamingService` dispatches that websocket type to `handleExternalUserMessage`

In practice, `EXTERNAL_USER_MESSAGE` currently means “a user-side/input message that originated outside the member runtime's assistant-output stream,” not necessarily “from Telegram/WhatsApp/another external provider.” That naming is a design/naming smell, but the code path is real and is the path that overwrites the local team user message.

## Constraints / Dependencies / Compatibility Facts

- Existing context-file storage and REST serving routes are correct for this bug.
- The backend domain shape (`ContextFile.toDict()`) must not be changed casually because runtime and pipeline code depend on it.
- The frontend conversation renderer should continue using `UserMessage.contextFilePaths`; adding parallel fields would worsen representation drift.
- The fix should be a clean-cut mapper/reconciliation correction, not a runtime-specific workaround.

## Open Unknowns / Risks

- Whether all historical projection providers can expose user-message context/media references; current local memory provider does expose `media`, but other providers may not.
- Whether exact upload display names beyond stored filename inference need to survive through team echoes. Current event type does not carry display name.
- Whether there are existing tests that intentionally expected empty team member-input `contextFilePaths`; those should be updated if they only reflected the old incomplete fixture.

## Notes For Architect Reviewer

- Recommended design posture: targeted protocol/boundary refactor plus context-file mapping fix, not broad runtime refactor.
- Main invariant: a server echo must not erase richer local sent-message attachment state, and backend team member-input event mapping must preserve the canonical `ContextFile` reference shape.
- Naming/boundary decision: internal team/member accepted-input echoes should no longer route through true external-channel `EXTERNAL_USER_MESSAGE`; introduce a distinct internal member-input message boundary such as `MEMBER_INPUT_MESSAGE` and route it to a `memberInputMessageHandler`.
- Primary backend owner: `team-member-input-event-builder.ts`.
- Primary frontend owner: new/split `memberInputMessageHandler.ts` plus shared user-message projection helper; keep `externalUserMessageHandler.ts` for true external-channel traffic.
- Secondary frontend owner: `runProjectionConversation.ts` for reload/hydration display.
