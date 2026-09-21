# API-FIND-020 — active task Team duplicates Agent statuses and makes the owning AgentOrg stream unavailable

## Classification

- API/E2E result: **Fail**.
- Scenario: `LIVE-003` in cumulative `API-REV-014`.
- Requirement/design boundary: `REQ-015`, `AC-010`, retained task-Team lifecycle/visibility, strict complete-root stream recovery (`DS-016`–`DS-018`, `DS-020`–`DS-022`).
- Preliminary origin: **Local Fix / server implementation**, subject to Code Review failure-origin confirmation.
- Tested source/artifact: `f519a2093c98f265df9ea958bb5be15d6a5b2494` / `3656220d2f7a1551aa54d8e7e9d3eb8d767b96f6`.

## Expected

An Org member may delegate a task to a flat Team. The fresh task-scoped Team execution remains owned by the exact AgentOrg host and its Agent identities appear once in the complete strict root snapshot. Materializing it must not make the current AgentOrg stream invalid, hide a durably active task, publish a partial/stale projection, or exhaust automatic recovery.

## Real execution mode

1. Started the exact production-built server on isolated ports `8594`/`37875` with an isolated copied database, data directory and workspace.
2. Opened the production renderer at `127.0.0.1:3594` with the actual AutoByteus `open_tab` tool.
3. Imported the retained four-Agent/two-Team/two-Org package through the normal **Settings -> Agent Packages -> Import Package** UI.
4. Launched mixed Org `aorg_e2e_mixed_org_909a9d8d7fa14337ae99b850f6303574` using real Codex App Server / `gpt-5.6-sol` Agents.
5. From configured mounted Agent `/research-team/lead`, called the current `delegate_task` tool with `recipient_address=/support-team` and an instruction to remain active.
6. Correlated the durable task sidecar, task-Team runtime traces, browser projection and fresh WebSocket traffic while performing the supported exact-root reselect. No manual `Reconnect` action exists or was used.

## Exact active identities

- Delegator: `/research-team/lead` / `aorg_e2e_lead_f86044fef6b845e4b607c8eeba38e096`.
- Task: `task_a7edf3fb6dfe49e3b032e0a18b4c270f`, status `active`, zero submissions.
- Task TeamRun: `aorg_support_pair_381ed079b0f64287a7b9a38108a90371`.
- Task-Team coordinator AgentRun: `aorg_e2e_lead_279d32a369bc4e83b2adffa867ae2ebc`; its raw provider trace contains exactly one `APIREV14-TASK-TEAM-READY`.
- Other task-Team member AgentRun identified by the strict error: `aorg_e2e_verifier_633875fceb00419a88e9120551a5f18f`.

## Observed correlated boundary

- The authoritative task sidecar contains **three** active tasks: two task Agents and the task Team above.
- Immediately after the task Team became active, the browser displayed the automatic-recovery terminal notice: `Live updates could not recover automatically. Select this Agent Org again to reload a verified complete conversation.`
- The left tree marked all previously rendered configured/task Agents `offline`, the Tasks facet remained at **2 tasks**, and the task Team was not projected.
- The configured lead center remained stale in a running/Stop state after its provider reply had completed, so the planned configured-to-task-team-member message could not be started from a truthful live surface.
- Supported exact-root reselect opened **five** fresh WebSockets. Every socket received `CONNECTED`, then `ERROR code=AGENT_ORG_STREAM_UNAVAILABLE` with both exact issues:
  - `AgentOrg status for AgentRun 'aorg_e2e_lead_279d32a369bc4e83b2adffa867ae2ebc' is duplicated.`
  - `AgentOrg status for AgentRun 'aorg_e2e_verifier_633875fceb00419a88e9120551a5f18f' is duplicated.`
- None of the five supported recovery attempts published a valid complete snapshot. The terminal notice remained, task count remained two, and all visible members remained offline.
- There were zero correlated HTTP failures, page exceptions or console errors. The server process and GraphQL/HTTP listener remained alive. This is not a browser connectivity failure.

## Preliminary source correlation for focused review

The strict contract correctly rejects duplicate `agent_run_id` entries in `autobyteus-collaboration-stream-contracts/src/root-execution-view-dtos.ts:122-130`.

The snapshot source in `autobyteus-server-ts/src/agent-org-execution/domain/agent-org-run.ts:148-152` concatenates `getLeafAgentStatusSnapshots()` from every Team registered in the Org-private directory. A task Team delegated from a mounted Team is owned by that mounted `TeamRun` and is also committed into `AgentOrgTeamExecutionDirectory` through `reserveTaskSubtree(...)` in `agent-org-task-lifecycle-adapter.ts`. The mounted parent recursively reports the task Team's leaves, while the directory-level list appears able to report the same task Team again. This is the evidence-consistent candidate mechanism; Code Review owns final source attribution.

No timeout, permissive deduplication, validation weakening, manual reconnect, or alternate lifecycle owner is proposed.

## Evidence

- `LIVE-003-task-team-create.json` — durable activation and task-Team binding.
- `LIVE-003-task-team-ready-correlation.json` — exact coordinator readiness trace.
- `LIVE-003-task-team-stream-recovery.json` — before/after DOM, all five WebSocket sessions/messages, assertions, and zero browser/network errors.
- `LIVE-003-task-team-stream-recovery-rerun.log` — production-browser probe result.
- `screenshots/LIVE-003-task-team-stream-failure.png` and `screenshots/LIVE-003-task-team-stream-recovery.png` — terminal notice, stale two-task projection and offline tree.
- `../runtime/server-data/memory/agent_orgs/aorg_e2e_mixed_org_909a9d8d7fa14337ae99b850f6303574/agent_org_task_delegation_records.json` — authoritative three-task sidecar.
- `server-isolated.log` — exact server startup paths, published runtime identities and process continuity.
- `api-e2e-test-case-ledger.md`, sequences 69–72 — immediate case/checkpoint record and fail-fast disposition.

## Scope and fail-fast disposition

`LIVE-003` is **Fail**. Its configured-to-task, task-to-configured and task-to-task exclusions passed before task-Team materialization; the task-team-member variant could not be completed because that supported materialization made the current root snapshot invalid.

`LIVE-004`, `LIVE-005`, `LIVE-006`, and `MIG-001` are **Not Tested — fail-fast** on IR-031. The earlier API revisions remain historical evidence only and are not inferred onto this failing artifact. All API-REV-014-owned resources were closed after evidence capture; direct SIGTERM completed cleanly, the browser tab/renderer were closed, ports are clear, and copied secrets/generated shared build outputs were removed.
