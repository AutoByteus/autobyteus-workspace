# Docs Sync Report — agent-initiated-collaborators

## Scope

- Ticket: `agent-initiated-collaborators` (`task_size=Large`, `architectural_risk=High`, reviewed route)
- Trigger: delivery package from `code_reviewer` on 2026-10-02 (source review CRR-006 Pass, API/E2E API-REV-003 Pass 96%, test-code review CRR-007 Pass)
- Bootstrap base reference: `origin/personal@84224a58d` (finalization target `personal`)
- Integrated base reference used for docs sync: `origin/personal@314b5a976`, merged into the ticket branch as `118758927` (after checkpoint `023279097`)
- Post-integration verification reference: `release-deployment-report.md` › Initial Delivery Integration Refresh; logs in `delivery-evidence/`

## Why Docs Were Updated

- Summary: the implementation commits updated the five main server module docs. Delivery checked them and the remaining long-lived docs against the integrated behavior and found:
  1. **C-01 premise.** Three server docs said concurrent first messages "serialize on the gate". The root gates are admission and drain barriers and admit operations concurrently. The per-root `CollaboratorAdmissionQueue` serializes `@` admissions and catalog bring-ins.
  2. **`agent_tools.md` predecessor text.** It said `delegate_task` covers configured placements and collaborators only, collaborators are added "only by the user's `@`", and `send_message_to` "creates nothing". All three are false now.
  3. **`prompt_engineering.md`.** The collaboration prompt example and narrative predated REQ-009, and even the predecessor's "Ordinary Communication" section. It also said standalone runs get no collaboration section.
  4. **Web docs.** They described collaborators as `@`-only and did not cover catalog copies (`source`) or placement by address (REQ-012).
  5. **Typo.** "An copy" in `agent_run_collaboration.md`.
  6. **Residual limits.** The `source` downgrade and C-11 self-delegation were not recorded.
- Why this should live in long-lived project docs: agent-initiated bring-in, catalog copies, instance-relative addressing (REQ-007), placement by address (REQ-012), and the prompt contract are durable runtime behavior. The concurrency mechanism matters to anyone changing admission.

## Long-Lived Docs Reviewed

| Doc Path | Result | Notes |
| --- | --- | --- |
| `autobyteus-server-ts/docs/modules/agent_communication.md` | Updated | Concurrency rewritten (queue, not gate); known limits: `source` downgrade, self-delegation (C-11) |
| `autobyteus-server-ts/docs/modules/agent_tools.md` | Updated | `delegate_task` resolution (configured → collaborator → catalog, incl. catalog-copy teammates), copies, placement, failure messages; `send_message_to` meaning; self-delegation per root |
| `autobyteus-server-ts/docs/modules/agent_team_execution.md` | Updated | Bring-in via `bringInAt` + queue; prompt paraphrase to REQ-009 |
| `autobyteus-server-ts/docs/modules/agent_orgs.md` | Updated | Bring-in via `bringInAt` + queue (link to resolution order) |
| `autobyteus-server-ts/docs/modules/agent_run_collaboration.md` | Updated | Queue note; "An copy" typo |
| `autobyteus-server-ts/docs/modules/prompt_engineering.md` | Updated | Narrative and example now match `AGENT_TEAM_COLLABORATION_LLM_INSTRUCTION` exactly (verified by rendering the source and diffing); standalone `## Collaboration` section documented |
| `autobyteus-web/docs/agent_teams.md` | Updated | Agent-initiated collaborators; catalog copies (`source`, `teamCatalogAgentSourceAt`, `source.coordinator_address`, `readsAsDisplayName`); placement by address |
| `autobyteus-web/docs/agent_orgs.md` | Updated | Agent-initiated collaborators; catalog copies (`catalogAgentSourceAt`/`catalogTeamSourceAt`); REQ-012 and REQ-007 behavior changes |
| `autobyteus-web/docs/chat.md` | Updated | Agent-initiated collaborators and catalog copies render like user-added ones |
| `autobyteus-server-ts/docs/modules/run_history.md` | Updated | Persisted optional `source` on catalog-copy task executions (shape, read-first, absent = configured/collaborator source); collaborators also come from agent bring-in |
| `autobyteus-server-ts/docs/modules/agent_execution.md` and the compaction docs (from the integrated base) | No change | Not affected by this ticket; the merge brought them up to date |

## Docs Updated

Delivery changed 10 files. Implementation had already updated 5 server docs.

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source | Target Doc |
| --- | --- | --- | --- |
| Admission concurrency | Gates do not serialize; `CollaboratorAdmissionQueue` per root serializes `ensure` and `bringInAt`; the second first message reuses the instance | `implementation-handoff.md` (Concurrency), code review C-01 | server `agent_communication.md`, `agent_team_execution.md`, `agent_orgs.md`, `agent_run_collaboration.md` |
| Catalog delegation | Copies only, never a collaborator; `source` recorded and read first; unlimited parallel copies; failure message shape | REQ-005, BEH-004 | server `agent_tools.md`; web `agent_teams.md`, `agent_orgs.md`, `chat.md` |
| One unit (REQ-007) and placement (REQ-012) | Instance-relative addressing; copies placed by address; Org behavior changes | REQ-007, REQ-012 | server docs (impl.), web `agent_orgs.md`, `agent_teams.md` |
| Prompt contract (REQ-009) | Exact team and standalone wording | BEH-007 | server `prompt_engineering.md`, `agent_team_execution.md` |

## Removed / Replaced Components Recorded

| Old | Replacement | Documented In |
| --- | --- | --- |
| "Two concurrent first messages serialize on the gate" | `CollaboratorAdmissionQueue` | server `agent_communication.md` |
| `collaborator-address-allocator.ts` (first-free allocator) | `CatalogAddressMap` | server `agent_communication.md` (impl.) |
| `CollaboratorMentionAdmission.admit` | `CollaboratorAdmission.ensure` | server `agent_communication.md` (impl.) |
| Copies hosted by the delegator's host | `resolveTaskCopyHost` (placement by address) | server root docs (impl.), web `agent_orgs.md`, `agent_teams.md` |
| `send_message_to` "creates nothing" | Bring-in on first use; by run ID still creates nothing | server `agent_tools.md`, `prompt_engineering.md` |

## Delivery Continuation

- Result: `Pass`
- Next delivery action: release notes and handoff summary, then the user-verification hold.
- Notes: `autobyteus-web/docs/settings.md` still duplicates `agent_execution_architecture.md` (known docs debt; unaffected here).
