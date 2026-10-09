# Docs Sync Report

## Scope

- Ticket: `delegated-copy-member-contact-delegator`
- Trigger: CRR-002 test-code review Pass. The cumulative reviewed package came from `code_reviewer`: `task_size=Medium`, `architectural_risk=High`, reviewed route.
- Bootstrap base reference: `origin/personal` @ `a573465d9`
- Integrated base reference used for docs sync: `origin/personal` @ `742a0df97`, merged into the ticket branch as `01ab8b7de` (checkpoint `73e871592` before it)
- Post-integration verification reference: `release-deployment-report.md` → "Initial Delivery Integration Refresh"; logs in `delivery-evidence/dr1-*.log`

## Why Docs Were Updated

- Summary: the standalone Agent root's collaborator port is now built per viewer, so members of a delegated copy can `@`-mention and discover the host (the run's own agent) and message it with `send_message_to`. Several shared contracts changed:
  - `MentionedCollaborator.inRun` became the three-state `presence` (`not_in_run` / `in_run` / `run_agent`), with new note wording for `run_agent` entries.
  - GraphQL `collaboratorMentionCandidates` takes `focusedAgentRunId`, required for Agent roots.
  - `rootDefinition()` became `ownDefinition()`.
  - The web caches candidates per focused agent.

  The long-lived docs still said "only the run's own definition is left out", described `inRun`, and showed the candidates query without `focusedAgentRunId`. That is no longer true for copy members.
- Why this should live in long-lived project docs: the per-viewer rule decides what every Agent-run composer, `@` note and `list_available_agents` call returns. Future collaborator, mention or tool work depends on it, and without it a reader would re-derive the old "the host is never offered" rule.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/agent_communication.md` | Owner doc for `@` resolution, discovery, in-run placement and candidates | `Updated` | `inRun` → `presence`, `ownDefinition()`, per-viewer Agent port, `run_agent` note wording, `focusedAgentRunId` |
| `autobyteus-server-ts/docs/modules/standalone_agent_run_root.md` | Owner doc for the Agent root | `Updated` | Per-viewer port paragraph, MP-001 known limit, GraphQL argument |
| `autobyteus-web/docs/chat.md` | Run-composer `@` options and scope | `Updated` | Per-focused-agent options and cache, host marked "the run's own agent", scope carries `focusedAgentRunId` |
| `TESTING.md` | Gated `@` delegation and ad-hoc Task E2E commands | `Updated` | New E2E command and DCM-001..007 summary; ad-hoc bullet clarified (own definition not offered *to the run itself*) |
| `autobyteus-server-ts/docs/modules/agent_tools.md` | `list_available_agents` contract | `No change` | Result shape unchanged; it defers eligibility to `agent_communication.md#collaborators`, which now documents the per-sender view |
| `autobyteus-server-ts/docs/modules/agent_orgs.md` | "never offered with `@`" statement | `No change` | Concerns Org roots; Team and Org behavior is unchanged (AC-007) |
| `autobyteus-web/docs/chat.md` New Chat Draft section (`draftMentionEligibility`) | "minus only the target's own definition" | `No change` | A New chat draft focuses the would-be host, which correctly gets the host view |
| `autobyteus-agent-presentation-contracts/README.md` | Possible mention-note contract description | `No change` | It doesn't describe the mention note; the wording is documented in the source and `agent_communication.md` |
| `autobyteus-server-ts/docs/modules/prompt_engineering.md`, `agent_definition.md`, `projects.md` | `list_available_agents` / prompt mentions | `No change` | Prompts and the work packet are unchanged (AC-008) |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/agent_communication.md` | Behavior + contract | The `@` bullet now covers:<br>• `presence` and the `ownDefinition()` rule;<br>• the per-viewer Agent port;<br>• that host self-mention is still rejected;<br>• the `run_agent` entry and its guidance sentence;<br>• that `delegate_task` to the host is still refused.<br>Discovery: the host rank and the per-sender view. In the run: the host. Candidates: `focusedAgentRunId` rules and that it is not membership-checked. | Removes "only the run's own definition is left out" as an absolute rule |
| `autobyteus-server-ts/docs/modules/standalone_agent_run_root.md` | Behavior + known limit | New paragraph on the per-viewer port (`collaboratorPortFor`, `standaloneRootCollaboratorPortFor`), the viewer per call, and MP-001. GraphQL bullet: `focusedAgentRunId` | Owner doc for the Agent root |
| `autobyteus-web/docs/chat.md` | UI behavior | Options per focused agent; a task child's composer offers the host; cache per focused agent with root-wide invalidation; "the run's own agent" note; scope carries `focusedAgentRunId` | Matches the shipped composer |
| `TESTING.md` | Test command + coverage | Added `delegated-copy-member-contact-host.e2e.test.ts` command (with the `env -u …` prefix), a DCM-001..007 summary and its evidence env var. Clarified the ad-hoc bullet | Requested delivery item; keeps the command discoverable |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Per-viewer Agent-root port | The viewer is the focused or sending agent. The host is always an in-run `run_agent` placement, and `ownDefinition()` is the host only for the host. The policy has no viewer branch | `design-spec.md` (SR-006), `implementation-handoff.md` | `standalone_agent_run_root.md`, `agent_communication.md` |
| `presence` and `run_agent` note | Three-state presence. The run-agent sentence uses `send_message_to` with no `delegate_task` alternative. Saved notes still parse | `design-spec.md`, contract source | `agent_communication.md`, `chat.md` |
| `focusedAgentRunId` | Required for Agent roots and ignored for Team/Org roots. It is not membership-checked; the send-time re-check verifies membership | `implementation-handoff.md` (Important Assumptions) | `agent_communication.md`, `standalone_agent_run_root.md`, `chat.md` |
| MP-001 | A host rename plus slug reuse can diverge catalog addresses between viewers, causing not-found only | `implementation-handoff.md` (Known Risks), AR-001 | `standalone_agent_run_root.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| `MentionedCollaborator.inRun` (boolean) | `presence: not_in_run \| in_run \| run_agent` | `agent_communication.md` (`@` bullet) |
| `CollaboratorRootPort.rootDefinition()` | `ownDefinition()` | `agent_communication.md` |
| `StandaloneAgentRunRoot.collaboratorPort()` (no viewer) | `collaboratorPortFor(viewerAgentRunId)` | `standalone_agent_run_root.md` |
| "Only the run's own definition is left out" (absolute) | Left out only for the viewer whose own definition it is | `agent_communication.md`, `chat.md`, `TESTING.md` |
| Per-root web candidate cache key | Per-focused-agent key; invalidation clears every key of the root | `chat.md` |

## Delivery Continuation

- Result: `Pass`
- Next delivery action: handoff summary and user-verification hold (AC-003 desktop check).
- Notes: a separate ticket could change the `@` menu header/footer copy ("… delegates the work"). It is still shown for the host entry, and docs record the current copy truthfully.
