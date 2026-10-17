# Investigation Notes — `collaboration-prompt-wording`

Base `origin/personal` `3712cd9bf0` (2026-10-15). The 126 commits since `5096011674` change none
of the files below (`git diff --stat 5096011674 3712cd9bf0 --` the collaboration, prompt, tool,
communication and Org directories is empty). Paths are under `autobyteus-server-ts/src/` unless
stated.

## IN-001 What an agent reads about collaboration, and where it comes from

| Text | Source |
| --- | --- |
| Prompt: identity, Team Instruction, collaboration sections | `agent-execution/prompt/carpenter-prompt-composer.ts` (`buildSharedCarpenterPromptSections`) |
| Standalone collaboration section | `agent-execution/prompt/standalone-collaboration-instruction.ts` |
| Addressing section | `agent-team-execution/services/member-collaboration-instruction-renderer.ts` (`AGENT_TEAM_ADDRESSING_INSTRUCTION_TEMPLATE`) |
| Team collaboration section | `agent-collaboration/domain/agent-team-collaboration-llm-contract.ts` (`AGENT_TEAM_COLLABORATION_LLM_INSTRUCTION`, `WORK_REQUEST_EXECUTION_LLM_INSTRUCTION`, `RULE_BASED_HANDOFF_LLM_INSTRUCTION`) via `team-collaboration-instruction-renderer.ts` |
| `send_message_to`, `delegate_task` descriptions | same LLM contract file (`SEND_MESSAGE_TO_*`, `DELEGATE_TASK_*`) |
| `list_available_agents` | `agent-tools/agent-discovery/list-available-agents-contract.ts` |
| `get_handoff_rules` | `agent-communication/services/get-handoff-rules-tool-contract.ts` |
| Task tools | `agent-tools/project-tasks/project-task-tool-contract.ts` (`PROJECT_TASK_TOOL_DESCRIPTIONS`) |
| Task message | `agent-collaboration/execution/task/task-execution-input.ts` (`buildTaskWorkText`, `buildExistingCopyTaskMessage`) |
| Received-message header | `agent-team-execution/services/inter-agent-message-runtime-builders.ts:32`, `agent-collaboration/execution/communication/root-communication-runtime-builder.ts:20`, `agent-communication/services/global-agent-run-message-runtime-builders.ts:62-66` |
| `@` note | `autobyteus-agent-presentation-contracts/src/collaborator-mention-note.ts` (compose/parse); presence from `agent-collaboration/collaborators/collaborator-admission.ts:72-90` |
| Refusals / results | `collaborator-errors.ts`, `execution/task/*` (`root-task-execution-lifecycle.ts`, `existing-copy-target.ts`, `root-task-execution-resource-scope.ts`, `root-task-dispatch.ts`, `task-execution-live-holds.ts`), `agent-tools/task-delegation/task-delegation-tool-input-parsers.ts`, `projects/domain/task-execution-resources.ts`, `projects/services/project-task-service.ts`, `projects/services/task-execution-resource-service.ts` |

All runtimes use these: the composer and constants are imported by the native tools, the MCP
adapter providers (`agent-tools/mcp/providers/*`), and the Codex, Claude, ACP and AGY
bootstrappers (`agent-execution/backends/*`).

## IN-002 The prompt is chosen by `teamScoped`, which mixes roles

`carpenter-prompt-composer.ts:38-47`: standalone section only when `!member.teamScoped`.
`teamScoped` is `true` for every member context built by Team roots
(`member-team-context-builder.ts:80`) and Org roots (`agent-org-execution-scope-builder.ts:86`),
including Agent task executions hosted there; in Agent roots it is
`ancestorTeamRunIds.length > 0` (`standalone-root-builder.ts:148`), and `false` for the host
(`standalone-host-member-context-builder.ts:47`). So a task agent created by the Project Task
Manager in an Org run gets the team prompt.

## IN-003 What decides an agent's role is already in one owner

`agent-collaboration/execution/domain/member-instance-scope.ts` `resolveMemberCollaborationScope`
is called by all three root kinds (Team: `member-team-context-builder.ts:50`; Org:
`agent-org-execution-scope-builder.ts:75`; Agent: `standalone-root-builder.ts:150`). It already
distinguishes (1) a direct member of a non-root Team instance (`hostTeam`, parent address equal),
(2) a root-level member at a configured placement "or a task copy at that address", (3) anything
else. It lacks only the run ID check that separates a configured root member from a task agent
at the same address; every caller has the agent's run ID (`identity.agentRunId`) and its
root's configured agents (Team: `teamContext.teamNode.children` with `agentRunId`; Org:
`tree.rootOrg.members` with `agentRunId`; Agent root: none).

## IN-004 Handoff rules per agent are known at context build

`MemberCollaborationContext.outgoingHandoffs` (frozen at construction,
`member-execution-context.ts`). Case (2) of IN-003 gives a task agent at a configured address
the root's handoff rules — so a task agent can have handoff rules (DEC-007).

## IN-005 An address never reaches a task agent

Each root's `getMessagePlacement` returns only configured placements (Team:
`team-execution-index.ts:118`; Org: `agent-org-execution-index.ts:86`) or the host (Agent root:
`standalone-root-execution-index.ts:101`, "Delegated children are reached by run ID only").
`resolveMessageRecipient` (`message-recipient-resolution.ts:64-79`) first resolves inside the
sender's own team instances, then those placements. Yet task agents carry a `memberAddress`
(the source address) that the prompt states ("Your address in this run is …"), the task
message sends ("Task delegator address: …", `task-execution-input.ts:37`) and every received
message header sends ("sender address: …"). A reply to such an address reaches the configured
agent at that address, or nothing.

## IN-006 The own address is never needed

`get_handoff_rules` returns the agent's outgoing rules with `recipient_address`
(`get-handoff-rules-tool-contract.ts`); `list_available_agents` returns addresses; the `@` note
gives addresses; every received message gives the sender ID; delegation results give IDs.
`delegate_task` refuses own-team targets itself (`ownTeamDelegationRefusedMessage`). No flow
requires an agent to type its own address.

## IN-007 Received-message header readers accept the header without an address

`autobyteus-web/utils/collaboration/interAgentDelivery.ts:9`:
`/^You received a message from sender name: (.*?)(?:, sender address: \S+)?, sender id: (\S+)\r?\nmessage:\r?\n/`
— the address part is optional (older saved messages lack it). `autobyteus-ts`
`agent-input-pipeline.ts:148` already builds the header without an address. The Org history
migration reader (`app-data-migrations/.../agent-org-history-first-message-summary-evidence-reader.ts:28`)
is a frozen source shape and is not touched.

## IN-008 The `@` note is decided for the whole run, not the viewer

`collaborator-admission.ts:83`: presence is `run_agent`, `in_run` (any configured placement) or
`not_in_run`. The note's `IN_RUN_GUIDANCE` says "can instead be messaged directly … or use
delegate_task for a separate copy" — for a teammate `delegate_task` is refused
(`ownTeamDelegationRefusedMessage`, CM-1). Every root has the focused agent at the gate
(Team `root-team-run.ts:273`, Org `agent-org-run-message-delivery.ts:53`, Agent
`standalone-root-message-delivery.ts:67`) and an `isOwnTeamAddress(senderAgentRunId, address)`
on its index (Team `team-execution-index.ts:138`, Org `agent-org-execution-index.ts:101`, Agent
`standalone-root-execution-index.ts:107`). The note is parsed by the server stream handlers and
`autobyteus-web/utils/collaborators/collaboratorMentionText.ts`, `utils/runTreeSummary.ts`;
parse keeps earlier forms (`SAVED_NOTE_GUIDANCES`, `PREVIOUS_RELEASE_NOTE_GUIDANCE`).

## IN-009 Refusal and result texts use system vocabulary

Inventory (`grep` of string literals): see design spec §Concrete Examples, table T-3. Examples:
`messageTargetNotFoundMessage` ("is not in this run … send_message_to its run ID"),
`TASK_AGENT_RESOURCE_OWNED_SENDER` ("Task workers delegate sub-work without task_id."),
`existing-copy-target.ts` ("is not a delegated copy in this run"),
`task-execution-resources.ts` ("This copy belongs to no Task …").

## IN-010 Tests and docs that pin these texts

Snapshot `tests/unit/agent-execution/prompt/__snapshots__/carpenter-prompt-composer.test.ts.snap`;
contract tests `autobyteus-agent-presentation-contracts/tests/collaborator-mention-note.test.mjs`;
unit/integration/e2e tests asserting messages and "Task delegator" (e.g.
`tests/unit/agent-collaboration/root-task-execution-lifecycle.test.ts`,
`tests/integration/agent-team-execution/task-delegation-tool-lifecycle.integration.test.ts`,
`tests/e2e/projects/*.e2e.test.ts`); web probes (`autobyteus-web/tests/e2e/*probe*.mjs`). Docs:
`docs/modules/prompt_engineering.md`, `docs/modules/agent_communication.md`, and the module docs
the collaboration model links.
