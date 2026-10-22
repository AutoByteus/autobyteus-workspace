# Investigation Notes — remote-run-title (autobyteus-269)

## Investigation Meta

- Package: `remote-run-title`; Task **autobyteus-269** (a bug from the user's first real cross-node delegation, 2026-10-21).
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/remote-run-title`, branch `codex/remote-run-title`, base `origin/personal` `33171e1385`. Finalization target: `origin/personal`.
- Authorities read: `solution-designer/SKILL.md`, `references/requirements-engineering.md`, `references/ticket-scope.md`, `references/finding-the-cause.md` (all read in this conversation).

## Initial Request

The user: on his Docker node, the Team run that his desktop's Project Task Manager started by `delegate_task` with `node: "docker"` shows as "New - Marketing Team" in the sidebar. A Team run he starts himself shows his first message as its title. "I think it's a bug."

## Findings

| ID | Finding | How | Source |
| --- | --- | --- | --- |
| F-01 | A run's history title (`summary`) is written only by the window's message paths: `AgentRunCommandCoordinator` (standalone send, `recordRunActivity` with the message) and `AgentTeamStreamHandler` / `AgentOrgStreamHandler` (Team and Org sends). The catalogs keep the **first non-empty** summary (`recordFirstSummary`), compacted to one line of at most 100 characters. | Read | `agent-run-command-coordinator.ts:99`, `agent-team-stream-handler.ts:228`, `agent-org-stream-handler.ts:182`, `team-run-history-catalog-service.ts:112`, `agent-run-history-catalog-service.ts:253`, `collaboration-run-history-catalog-core.ts:110`, `docs/modules/run_history.md:376` |
| F-02 | A peer's delegation reaches the node as a work packet. `RemoteMessageReceiver` → the root's `acceptRemoteWorkPacket` → `buildTaskAssigneeWorkPacket` is posted as the coordinator's or host's input. None of these records a summary. The raw task description arrives on the node as `input.description` (A sends `content: placement.description`). | Read | `remote-message-receiver.ts:60`, `team-run-message-delivery.ts:93-99`, `standalone-root-message-delivery.ts:165-172`, `remote-delegation.ts:116-118` |
| F-03 | **Reproduced** on two isolated servers: the existing two-server E2E (cases RC-01 … RC-11 and RC-21), plus a temporary diagnostic case (reverted, never committed) that read `listWorkspaceRunHistory` on both nodes. On beta, the Team run started by the remote delegation has `summary: ''`. Every remote Publisher (Agent) run's summary is the E2E harness's **later** owner message (`CALL_TOOL:{…send_message_to…}`), not the work packet. Because the first non-empty summary wins, this proves the packet set nothing for Agents either. In the user's real use there is no owner message, so his remote Agent runs would also show "New - <name>". | Reproduced | `evidence/reproduction-history-titles.json`; run log `/tmp/diag-269-run.log` (13 passed) |
| F-04 | **Corrected (SR-004, CRR-001).** The window shows `New - <name>` when the stored summary is empty (`DEFAULT_DRAFT_SUMMARY_PREFIX`). But for every run it holds a live context for (all active runs, from load), `mergeHistoryRowWithContext` (`utils/runTreeLiveStatusMerge.ts:46-51`) **replaces** the stored summary with the live conversation's first user-role message. The conversation header does the same (`composables/chat/useStandaloneRunTitle.ts:28`: live first, history second). A peer's work packet is projected as a `user` message (scripted AGY; AutoByteus in 247's check), so an active peer-started Agent row shows the packet wrapper even with a correct stored title. My earlier "once the stored summary is set, the window shows it" was wrong. | Read; confirmed by API/E2E (API-03 browser journey) and the code reviewer's CRR-001 | Read, plus 247 evidence `API-26-beta-team-run-history-and-packet.png` and the browser journey log line 31 | `autobyteus-web/stores/runHistoryReadModel.ts:86-95`, `runHistoryTeamHelpers.ts:17` |
| F-05 | Local delegated copies (an Agent or Team that a run on the same node delegates to) have no history row of their own; they appear inside their coordinating run. On alpha the local `/remote_worker` copy is not a row. Unaffected. | Reproduced (F-03 data) and Read | F-03 JSON (alpha) |
| F-06 | User-started runs: the title is the first accepted user message, unchanged. | Read; F-03 (alpha's rows) | F-01 |
| F-07 | Existing affected runs: their index row has an empty summary. The description is stored in the run's own memory (the first message of the host or coordinator: the work packet text) and in its `delegatedFrom` record. There is no index-only fact that was lost. The repository has a precedent for filling empty summaries from stored first messages with a registered startup migration (`20260905_agent_org_history_first_message_summary_v1`). | Read | `docs/modules/run_history.md:390`, `docs/modules/agent_orgs.md:532` |

| F-08 | Today the stored title of a user-started run is the content the window sent. When skill tags were used, that content starts with the skill instruction ("Use the X skill for this request.", composed by `skillRequestInstruction` in the window). The live first-message summary strips that prefix and the mention note; the stored one does not. So such a run's row reads differently while active (live) and when stopped (stored). This is pre-existing. | Read | `autobyteus-web/stores/agentRunStore.ts:164`; `utils/runTreeSummary.ts`; `agent-stream-handler.ts:379` |

## Supplemental Artifact Inventory

- `evidence/reproduction-history-titles.json`: the diagnostic output (both nodes' history rows after the cases ran).

## Notes For Architecture Design

- The title owner stays the history catalogs' first-non-empty rule. A remote work packet that its root accepts is one more trigger of `recordRunActivity`, with the raw description as the summary. The packet's wrapper text ("You have a new task from…") is not used.
