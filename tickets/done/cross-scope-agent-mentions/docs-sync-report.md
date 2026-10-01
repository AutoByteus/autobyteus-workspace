# Docs Sync Report — cross-scope-agent-mentions

## Scope

- Ticket: `cross-scope-agent-mentions` (`task_size=Large`, `architectural_risk=High`, reviewed route)
- Trigger: delivery package from `code_reviewer` on 2026-10-01. Source review CRR-005 Pass, API/E2E API-REV-002/003 Pass (95%), test-code review CRR-007 Pass.
- Bootstrap base reference: `origin/personal@8caa610ff` (`investigation-notes.md` › Bootstrap; finalization target `personal`)
- Integrated base reference used for docs sync: `origin/personal@8caa610ff`, re-fetched on 2026-10-01. The ticket branch `codex/cross-scope-agent-mentions@bcff48200` already contains it (merge-base = `8caa610ff`, 0 commits behind).
- Post-integration verification reference: no new base commits, so the API/E2E round-2 evidence on `bcff48200` remains the verification of record (see `release-deployment-report.md` › Initial Delivery Integration Refresh).

## Why Docs Were Updated

- Summary: implementation updated the main module docs to SR-010. Delivery then checked every long-lived doc that describes collaborators, task rows, delegation, or how inter-agent messages are shown. It found:
  - three docs still describing the superseded SR-007 model ("collaborators are task executions started by `delegate_task`", "the web turns a `delegate_task` null result into the add-failure notice", "`send_message_to` accepts configured placements only");
  - four places still describing the visible "Started by" line that REQ-009 removed;
  - no `autobyteus-ts` memory-doc note on the new inter-agent sender recording (RD-004).

  Delivery also recorded the residual limits R-3, the downgrade and the earlier-events page in the docs.
- Why this should live in long-lived project docs: the one-hosted-instance collaborator model, `send_message_to` as the way to brief a collaborator, `delegate_task` as an extra copy, and the "From <Sender>:" presentation are durable product and runtime behaviors. Future readers of the tool, Team, Org and memory docs must not learn the SR-007 model.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/agent_communication.md` | Collaborators section; RD-004 sender | Updated | SR-010 content was already accurate. Delivery added known limits: cross-root reach of a live collaborator by run ID (R-3) and the downgrade |
| `autobyteus-server-ts/docs/modules/agent_tools.md` | `delegate_task` resolution and results | Updated | Removed the SR-007 claims; documented the extra copy and the `send_message_to` resolution |
| `autobyteus-server-ts/docs/modules/agent_run_collaboration.md` | Agent-root hosting | No change | Matches SR-010 (hosting, admission, package, surfaces) |
| `autobyteus-server-ts/docs/modules/agent_team_execution.md` | Team-root collaborators (AR-006) | No change | Matches SR-010 (registry, index, restore, `COLLABORATOR_ADDED`/`COLLABORATOR_ADD_FAILED`) |
| `autobyteus-server-ts/docs/modules/agent_orgs.md` | Org collaborators | No change | Matches SR-010 |
| `autobyteus-server-ts/docs/modules/run_history.md` | `senderId` replay, collaborator packages | No change | RD-004 replay item documented |
| `autobyteus-server-ts/docs/modules/README.md` | module index | No change | Agent Run Collaboration listed |
| `autobyteus-web/docs/chat.md` | live-run `@`, held send, notice, rows, RD-004 | Updated | Added the browser-probe test entry and the earlier-events-page known limit |
| `autobyteus-web/docs/agent_teams.md` | Team rows | Updated | Replaced the SR-007 "collaborator task rows" paragraph; fixed the stale "Started by" line |
| `autobyteus-web/docs/agent_orgs.md` | Org rows | Updated | Replaced the SR-007 paragraph; fixed two stale "Started by" passages |
| `autobyteus-web/docs/settings.md` | transient-row presentation (near-copy of the architecture doc) | Updated | REQ-009 row presentation |
| `autobyteus-web/docs/agent_execution_architecture.md` | transient-row presentation | Updated | REQ-009 row presentation |
| `autobyteus-ts/docs/agent_memory_design_nodejs.md` | user raw-trace recording | Updated | RD-004 `sender_id` recording |
| `autobyteus-ts/docs/agent_memory_design.md` | near-copy of the above | Updated | same |
| `autobyteus-server-ts/docs/modules/agent_artifacts.md`, `autobyteus-web/docs/agent_artifacts.md` | inter-agent message references | No change | Unaffected |

## Docs Updated

Delivery changed 9 files. Implementation commits had already updated 10.

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/agent_tools.md` | Correction | `delegate_task` to a collaborator address starts an extra copy and leaves the instance unchanged. `send_message_to` resolves configured members, collaborators and collaborator-Team members, and the first message starts them. Add failures are `COLLABORATOR_ADD_FAILED` at the `@` send, never a `delegate_task` result | SR-007 text contradicted SR-010 (BEH-005, BEH-013, AR-007, removed `delegate_task`-null derivation) |
| `autobyteus-server-ts/docs/modules/agent_communication.md` | Addition | "Known limits" under Collaborators: R-3 and the downgrade | Residual risks named in the delivery package |
| `autobyteus-web/docs/agent_teams.md` | Correction | A collaborator is one hosted instance per `root_team.collaborators` entry, projected by `withCollaboratorExecutions` (never persisted). `COLLABORATOR_ADDED` places it Offline at once, a Team opens once (`opensOnAppear`), and names come from `memberDisplayName`. Also: no visible "Started by" | SR-010 web (F-02, F-03) and REQ-009 |
| `autobyteus-web/docs/agent_orgs.md` | Correction | Collaborators come from `rootOrg.collaborators` (`collaboratorExecutionNodes`) and `collaborator_added` is applied in place (no checkpoint). Also: no visible "Started by" (2 places) | SR-010 web and REQ-009 |
| `autobyteus-web/docs/chat.md` | Addition | `pnpm test:e2e:cross-scope-agent-mentions` probe entry; earlier-events-page known limit | Durable test added by API/E2E; residual code note |
| `autobyteus-web/docs/settings.md`, `autobyteus-web/docs/agent_execution_architecture.md` | Correction | Task-Agent member marker, starter only in the aria-label, straight branch lines | REQ-009 (product-wide) |
| `autobyteus-ts/docs/agent_memory_design_nodejs.md`, `autobyteus-ts/docs/agent_memory_design.md` | Addition | `MemoryIngestInputProcessor` records `resolveInterAgentSenderId(metadata)` as the user raw trace's `sender_id`; old traces stay user-style | RD-004 change in `autobyteus-ts` |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| One hosted collaborator per mention | Admission at send, inside the root gate: validate → allocate → prepare → commit → publish → note → post. All-or-nothing `COLLABORATOR_ADD_FAILED` | `design-spec.md` DS-001, BEH-003 | server `agent_communication.md` (impl.), `agent_tools.md` (delivery) |
| `send_message_to` first | Briefing and reports are ordinary messages (Team/Org tab rows); the first message starts the collaborator | REQ-003/005, BEH-005 | server `agent_communication.md`, `agent_tools.md` |
| Extra copy | `delegate_task` to a collaborator address is an ordinary delegated child | REQ-013, BEH-013 | server `agent_tools.md`, web `agent_teams.md`/`agent_orgs.md` |
| RD-004 sender | `sender_id` recorded on user traces; "From <Sender>:" live and on replay; old traces unchanged | REQ-014, BEH-014 | server `run_history.md` (impl.), `autobyteus-ts` memory docs (delivery) |
| Product-wide task rows | Member marker, no visible "Started by" | REQ-009 | web `agent_teams.md`, `agent_orgs.md`, `settings.md`, `agent_execution_architecture.md` |
| Residual limits | R-3 cross-root run-ID reach; downgrade; earlier-events page | `api-e2e-execution-coverage-report.md`, `implementation-handoff.md` | server `agent_communication.md`, web `chat.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| Collaborators as root task executions started by `delegate_task` (SR-007) | One hosted instance per entry in `collaborators`, added at the `@` send | server `agent_communication.md` › Collaborators; `agent_team_execution.md`, `agent_orgs.md`, `agent_run_collaboration.md` |
| Web `delegate_task`-null failure derivation (`deriveCollaboratorAddFailures`, `parseDelegateTaskResult`) | `COLLABORATOR_ADD_FAILED` → `CollaboratorAddRejection` on every transport | web `chat.md` › Failure notice; server `agent_tools.md` |
| `collaboratorAddressMessageHint`, in-run-by-task rule (`hasTaskExecutionAt`) | `getMessagePlacement` per root; entries count as in the run | server `agent_communication.md` |
| Per-surface name helpers (`collaboratorDisplayName`, local `nameAt`) | `utils/collaboration/memberDisplayName.ts` | web `chat.md`, `agent_teams.md` |
| Visible "Started by" line, dotted task-Agent ring | Member marker; starter in the aria-label | web `agent_teams.md`, `agent_orgs.md`, `settings.md`, `agent_execution_architecture.md` |
| User-style rendering of agent-to-agent deliveries | "From <Sender>:" (`InterAgentMessageSegment`, `inter_agent_message` replay item) | web `chat.md`; server `run_history.md`, `agent_communication.md` |

## No-Impact Decision

- Not applicable: docs were updated.

## Delivery Continuation

- Result: `Pass`
- Next delivery action: write the handoff summary and release notes, then hold for user verification.
- Notes:
  - Docs follow-up (not a blocker): `autobyteus-web/docs/settings.md` still duplicates `agent_execution_architecture.md`. Both were updated identically, as in the previous ticket.
  - Earlier tickets left task-row presentation text in more web docs than the ones listed above. A scan for "Started by" now finds only accessible-label wording.
