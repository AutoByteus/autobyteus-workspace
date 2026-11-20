# Investigation Notes — standalone-run-messages-565 (autobyteus-565)

## Investigation Meta

- Package identifier: `standalone-run-messages-565`
- Request / ticket: Project Task `autobyteus-565` (Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`), delegated by `/project_task_manager` (run `project_task_manager_7c8dce0c…`) for the founder
- Workspace root: `/Users/normy/autobyteus_org/autobyteus-worktrees/standalone-run-messages-565`
- Repository mode: `Git`; branch `codex/standalone-run-messages-565`
- Resolved base: `origin/personal` at `a728fbcad3` (fetched 2026-11-20); finalization target `origin/personal`
- Bootstrap result: worktree created; no blocker
- Current solution revision ID: `SR-001`
- Authorities read (requirements gate; read in full earlier in this conversation, 2026-11-18): `references/requirements-engineering.md`, `references/finding-the-cause.md`, `references/ticket-scope.md`
- Investigation status: requirements investigation complete; architecture investigation follows approval

## Initial Request And Clarifications

- Request (founder, 2026-11-20, via the PM, with a phone screenshot): a standalone agent run (such as the Project Task Manager) has no Messages view on the phone (⋮ menu: Artifacts, Files, Activity, Settings) nor a Messages tab on desktop, though it exchanges messages with its delegated task agents/teams and with other standalone or peer runs (e.g. the PM on `ryan-ai-linux`). Show a Messages view on desktop and phone with sender/recipient identity, node chip when cross-node, direction, timestamps, live updates and history. Preserve Team/Org Messages. Ask the founder about visibility and cross-node naming rules.

## Source Log

| Date | Source | Exact Source | Why | Finding |
| --- | --- | --- | --- | --- |
| 2026-11-20 | Code | `autobyteus-web/components/mobile/runScreen/MobileRunTargetView.vue:73-77` | Phone menu | `showMessages = MEMBER_KINDS.has(kind)`: never for `standalone_agent` |
| 2026-11-20 | Code | `autobyteus-web/stores/activeContextStore.ts:53-69`; `stores/agentRunCollaborationStore.ts:197-205`; `services/agentCollaboration/agentRunCollaborationContext.ts:55` | Desktop target | A standalone target carries `collaborationMessages` only when its view `hasDelegatedRuns` (a run in its tree, i.e. with an open Task); a view is read only for runs with `hasCollaboration` (`ensureStoredView`) |
| 2026-11-20 | Code | `autobyteus-web/composables/useRightSideTabs.ts:36-70`; `components/layout/RightSideTabs.vue:51-55` | Desktop tab | The `teamMembers` tab ("Team"/"Org") shows when the target has `collaborationMessages`; it renders `CollaborationOverviewPanel` → the focused agent's messages |
| 2026-11-20 | Code | `autobyteus-web/types/workspace/collaborationMessagesContextView.ts` | View contract | Already supports `rootKind: 'agent'`; rows are the focused agent's `sent`/`received` messages with a counterpart identity (`configured`, `delegated`, `past`) |
| 2026-11-20 | Code | `autobyteus-server-ts/src/api/graphql/types/collaboration-participant-messages.ts:66-95` | Stored read | Keeps only messages whose two agents are in the run's tree (`isPublicMessage`) or with a past participant (delegated runs only): messages with unrelated local runs or other nodes are dropped |
| 2026-11-20 | Code | `src/agent-collaboration/delegation/run-messages-feed.ts`; `root-communication-engine.ts` (`acceptFromRemote`/`commitSentToRemote` publish nothing); autobyteus-492 DEC-014 (`publishToViews: false` for unrelated) | Live path | Unrelated and cross-node messages never reach a run view live |
| 2026-11-20 | Code | `src/agent-collaboration/execution/communication/collaboration-communication-message.ts` | Stored shape | A log line holds run IDs, content, type, files, time: no node. A linked remote counterpart's node is in the Task entry (`nodeId`); an unlinked one (492 `run-messages`) is recorded nowhere |
| 2026-11-20 | Code | `autobyteus-web/services/collaborationMessages/participantMessagesQuery.ts`; `components/mobile/views/MobileMessages.vue` | Payload | One query returns all of a participant's messages; the phone renders every message's full content |
| 2026-11-20 | Data (counts and sizes only; no content read) | `~/.autobyteus/server-data/memory/agents/project_task_manager_7c8dce0c…/communication_messages_*.jsonl` | Volume, counterparts | 2,506 messages (2026 Nov), content 5.4 MB (median 1.76 KB, max 10.5 KB), files 7.3 MB. Counterparts: 2,137 team/org members, 364 local agent runs, 5 not on this node (a remote PM, a remote task agent) |
| 2026-11-20 | User | screenshot in the Task | Symptom | Phone ⋮ menu without Messages for the PM |

## Relevant Existing Behavior

| ID | Current behavior | Evidence | Confidence |
| --- | --- | --- | --- |
| BEH-001 | Phone: no Messages for a standalone run | `MobileRunTargetView.vue:77`, screenshot | High (Read + user) |
| BEH-002 | Desktop: "Team" tab for a standalone run only while it has an open delegated run | store/context lines above | High (Read) |
| BEH-003 | Stored read drops messages with unrelated local runs and other nodes | `collaboration-participant-messages.ts:81-88` | High (Read) |
| BEH-004 | Live: unrelated and cross-node messages are not published to run views | engine, feed, 492 DEC-014 | High (Read) |
| BEH-005 | Team/Org Messages: the focused member's messages within the tree | view contract, panels | High (Read) |
| BEH-006 | All messages load at once | query, mobile view | High (Read; size Measured) |

## Requirement Implications

- The run's own message log already holds every message its agent sent and received (CM-9): no new store is needed; the read and the live publication decide what the view shows.
- Showing peer messages reverses 492's DEC-014 for the standalone run's own Messages view (the founder now asks for them).
- A cross-node counterpart of an unlinked message has no recorded node: the node chip needs the node (and ideally the agent's address) recorded with such messages from now on.
- 5.4 MB for one PM: the view must load in pages (newest first).

## Persisted Data And State Facts

- Subject: per-run message logs (`communication_messages_*.jsonl`), append-only, rotating at 4 MiB. Readers: run views, participant messages, package validators. A new optional field on new lines is read by tolerant readers; old lines stay valid. Exact transition decided in design (Data Migration Guideline).

## Supplemental Artifact Inventory

| Artifact | Purpose | Status |
| --- | --- | --- |
| Task screenshot (path in the Task's context files) | Symptom | User-supplied |

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Resolution |
| --- | --- | --- | --- |
| UNK-001 | Unknown | Live two-node check of the node chip | Two-server E2E in the build |
| RSK-001 | Risk | Shared paging change could alter Team/Org Messages | Decided in DEC-004; regression tests |

## Architecture Investigation Findings

Added after approval.
