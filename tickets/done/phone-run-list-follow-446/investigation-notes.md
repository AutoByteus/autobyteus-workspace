# Investigation Notes — autobyteus-446

## Investigation Meta

- Package identifier: `phone-run-list-follow-446` (Project Task `autobyteus-446`)
- Request / ticket: autobyteus-446, "Phone: the run list still shows a team run that the desktop no longer shows after it was closed"
- Workspace root: `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-run-list-follow-446`
- Repository mode: `Git`
- Task worktree / branch: same path, branch `codex/phone-run-list-follow-446`
- Resolved base remote / branch / revision: `origin/personal` at `a85bf4f38d` (v1.5.12-beta.10), fetched 2026-11-09
- Finalization target remote / branch: `origin/personal`
- Bootstrap result: worktree created; `pnpm install --frozen-lockfile`, server `prebuild` + `build`, `nuxt prepare`, `build:mobile-web` passed.
- Bootstrap blocker: None
- Current solution revision ID: `SR-002` (requirements unchanged since SR-001)
- Authorities read (requirements gate; re-read in this conversation, 2026-11-08/09): `references/requirements-engineering.md`, `references/finding-the-cause.md`, `references/ticket-scope.md`, `references/handoff.md`, `TESTING.md`, `AGENTS.md`
- Investigation status: cause reproduced and established; requirements written.

## Initial Request And Clarifications

- Original request (2026-11-09, screenshot 5:56, phone connected to "AutoByteus Desktop"): after the PM closed autobyteus-440, its Software Engineering Team copy disappeared from the desktop's list at once but stayed on the phone's list.
- Clarifications (Task comments): it disappeared from the phone later by itself; "on the desktop it was super fast"; "maybe it could be caused by a network issue anyway; just dispatch the ticket to find out why". Dispatched as an investigation: measure, find the cause, say plainly whether it is a bug or a network delay, fix only if a bug.
- Constraints: the user's data is analysed read-only or on an isolated node; DESIGN.md and TESTING.md; release only on the user's word.

## Product And Domain Understanding

- The rows in the screenshot are **delegated runs listed under a parent run**: the indentation line on the left places them under the Project Task Manager (PTM) run above. The 440 team copy was the PTM's delegated Task work.
- When a Task closes (DONE/CANCELLED), its delegated runs ("task executions") stay in the host run's tree and Team tab but **leave the run list** (autobyteus-380). The node records this in the host's collaboration view (`closed_task_executions`) and publishes `task_executions_closed` on the host's live collaboration stream.
- Relevant terms: *host run* = the run that delegated (here the PTM, a standalone agent run); *stored view* = the host's collaboration view read once from the node (`agentRunCollaboration`); *listing* = the run list's rows.

## Source Log

| Date | Source Type | Exact Source / Command / Query | Why Consulted | Relevant Finding | Follow-Up |
| --- | --- | --- | --- | --- | --- |
| 2026-11-09 | User | Screenshot `ctx_0630a539fd69__2.jpg` | What is listed | The 440 team copy and other team copies are indented under a parent run (delegated rows) | — |
| 2026-11-09 | Code | `autobyteus-web/composables/mobile/useMobileRunTree.ts:46-48` | How the phone gets delegated rows | "A listed Agent run's delegated work comes from its stored view, read once (a live run's stream keeps it current)": `collaboration.ensureStoredView(runId, true)` | — |
| 2026-11-09 | Code | `autobyteus-web/stores/agentRunCollaborationStore.ts:332-334` | When the stored view is read | `ensureStoredView` reads only when no context exists: **once** | — |
| 2026-11-09 | Code | `autobyteus-web/composables/agentCollaboration/useAgentRunCollaborationSync.ts:15-33`; used by `MobilePairedShell.vue:100` and the desktop `AgentWorkspaceView.vue:47` | Which host gets a live stream | Only the **selected** agent run's collaboration stream is live (`syncHost`) | — |
| 2026-11-09 | Code | `autobyteus-web/services/agentCollaboration/agentRunCollaborationStreamingService.ts:248-249`, `agentRunCollaborationContext.ts:172` | Live closure | `task_executions_closed` on the live stream updates the context: rows leave at once | — |
| 2026-11-09 | Code | `autobyteus-web/stores/agentRunCollaborationStore.ts:196-233` (`refreshListedStatuses`, autobyteus-426 D-09), called by `composables/runHistory/useRunHistorySectionLoad.ts:51` on every history poll (desktop 5 s; phone 5 s on its list screen, at once when shown again) | Whether the poll catches a closure | It reads child **states** only (`agentRunCollaborationStatuses`: `runId`, `isActive`, `statuses[]`, `graphql/queries/collaboratorQueries.ts:36-46`) and re-reads the view only when the host's active state or its set of local children changes. A Task closing changes neither (closed executions stay children), so the closure is **never** picked up | Design |
| 2026-11-09 | Code | `autobyteus-web/components/workspace/history/AgentRunTaskRows.vue:61-63` | The desktop's rows | Same `ensureStoredView` (read once) and same store: the desktop has the same gap when the host is not its open run | — |
| 2026-11-09 | Code | `autobyteus-web/stores/runHistoryStoreSupport.ts:110-126` (`parseAgentOrgHistoryItem`), `utils/agentOrgHistoryRows.ts:117` | Org hosts | Org history rows carry `closedTaskExecutions` on every history read: Org hosts follow closures on the poll | — |
| 2026-11-09 | Code | `autobyteus-web/stores/runHistoryTeamExecutionRows.ts:32-44` | Team hosts | With a Team context: rows filtered by `isTaskExecutionRowListed` (live Team stream). Without one: from the history tree. Whether a closed execution is in the history tree is not yet verified (architecture) | Design |
| 2026-11-09 | Code | `autobyteus-web/tests/e2e/mobile-shell-probe.mjs:1372-1384` (MSP-14) | Why the existing test passes | MSP-14 closes Task A while the PTM is the phone's selected run (opened in MSP-03), so the live stream removes the row; the case does not cover a listed host that is not the selected run | — |
| 2026-11-09 | Command | `node evidence/repro/closed-task-rows-repro.mjs --output-dir=evidence/repro-run-1 --wait-s=120` | Reproduce and measure | See Runtime findings | — |

## Relevant Existing Behavior And Supported Product Paths

| Behavior ID | Kind | Supported Trigger Or Governing Contract | Current Supported Product Behavior Path / Lifecycle | Current Outcome / Invariants | Evidence | Confidence / Unknown |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | A Task with delegated runs is closed while its host run is the window's open run | Live collaboration stream → `task_executions_closed` → rows leave | Rows leave in 2 ms (phone); same code on desktop | Repro run 1 `goneAfterMs.host: 2` | Measured |
| BEH-002 | User | A Task is closed while its host run is only listed (another run is open), list on screen | Stored view read once; the 5 s poll reads states only | Rows stay listed indefinitely (120 s measured) | Repro run 1 `goneAfterMs.other: null`, `otherStillShownAtEnd` both rows | Reproduced |
| BEH-003 | User | The page reloads (or the host run is opened) | Fresh stored view or live snapshot | Rows gone | Repro run 1 `otherAfterReload: []` | Reproduced (reload); opening: Read |
| BEH-004 | User | Same as BEH-002 on the desktop | Same store and components | Same gap expected | Code | Read (not run) |
| BEH-005 | User | A Task reopened (DONE → IN_PROGRESS) while its host is only listed | Same as BEH-002 | Rows would stay hidden until reload/open | Code (`TASK_EXECUTIONS_REOPENED` is live-only) | Read |
| BEH-006 | User | Org host's Task closed | History read carries `closedTaskExecutions` each poll | Rows follow within a poll | Code | Read |

## Relevant Codebase And Technical Facts

| Path / Component / Contract | Current Responsibility Or Behavior | Requirement Implication | Architecture Question / Design Implication |
| --- | --- | --- | --- |
| `agentRunCollaborationStore.refreshListedStatuses` | The poll's per-listed-host refresh, decides when to re-read a view | REQ-001 | Make a closure (or reopening) a reason to re-read; the node owns "closed" |
| `agentRunCollaborationStatuses` GraphQL (server `api/graphql/types/agent-run-collaboration.ts`) | States-only answer | REQ-001 | Carry what the client needs to see that the closed set changed |
| `useAgentRunCollaborationSync` | Live stream for the selected host only | — | Unchanged (opening a stream per listed host would cost far more) |

## Structural And Payload Surface Inventory

- Payload surfaces: none persisted.
- Structural surfaces: the statuses GraphQL answer (server + client query), the store's poll decision.
- Potential structural impacts: a GraphQL field addition (contract), no persistence, no security change.

## Runtime, Probe, Or Reproduction Findings

| Method / Command | Scenario | Observation | Established | Requirement Implication | Artifact / Evidence Path |
| --- | --- | --- | --- | --- | --- |
| `closed-task-rows-repro.mjs --wait-s=120` (isolated node, scripted AGY, real phone bundle, two paired phones) | PTM delegates Task A (agent) and Task B (Team); phone-host last opened the PTM; phone-other last opened another run; both on the list; PTM closes both Tasks | phone-host: rows gone 2 ms after the close returned. phone-other: both rows still listed after 120 s of list polling; after a reload: gone | Reproduced, Measured | REQ-001 | `evidence/repro-run-1/repro-summary.json`, `host-*.png`, `other-*.png` |

- Temporary diagnostics: None.
- Reproduction for implementation to start from: `node <worktree>/tickets/in-progress/phone-run-list-follow-446/evidence/repro/closed-task-rows-repro.mjs --output-dir=<fresh> --wait-s=120` after `pnpm -C autobyteus-server-ts build` and `pnpm -C autobyteus-web build:mobile-web` (about 2.5 min). Today `goneAfterMs.other: null`; after the fix ≤ 10 000.

## Stakeholder And User Evidence

| Source / Actor | Need, Problem, Or Constraint | Evidence Strength | Requirement Implication | Open Question |
| --- | --- | --- | --- | --- |
| User, screenshot + comments | Closed team stays on the phone; desktop fast | Strong; reproduced | REQ-001 | Why it later disappeared on his phone: most likely he opened the PTM run on the phone (he talks to the PM there) or the page reloaded; either refreshes the view (BEH-003). Not needed for the fix |
| User | "maybe a network issue" | Ruled out: reproduced on loopback with no network effect | — | — |

## External Contracts, Standards, And Dependencies

| Contract / Dependency | Version / Authority | Relevant Behavior Or Constraint | Evidence | Unknown / Risk |
| --- | --- | --- | --- | --- |
| Collaboration model (`autobyteus-server-ts/docs/design/collaboration_model.md`) | Repo | Closed Task executions leave the listing, stay in the tree | autobyteus-380 | — |

## Persisted Data And State Facts

- Not affected (read-only display behavior).

## Product Design Request Context

- Not stated. No UI change.

## Product Design Findings

N/A — not applicable.

## Supplemental Artifact Inventory

| Artifact Path | Owner | Purpose | Scope | Related Requirement / AC IDs | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- | --- | --- |
| `evidence/repro/closed-task-rows-repro.mjs` | Solution Designer | Reproduction | BEH-001…003 | AC-001, AC-004, AC-006 | Current | Evidence only |
| `evidence/repro-run-1/` | Solution Designer | Measured result (isolated node only) | — | — | Current | Evidence |

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Why It Matters | Resolution / Owner | Status |
| --- | --- | --- | --- | --- | --- |
| UNK-001 | Unknown | Team hosts' rows without a live Team context: do closed executions leave on the history read? | Several kinds (Principle 1) | Architecture investigation | Open |
| UNK-002 | Unknown | Exactly what removed the row later on the user's phone | Explanation only | Not needed; BEH-003 explains both likely causes | Accepted |

## Architecture Investigation Findings

(2026-11-09; all Read)

- The node holds each active host's closed set on its root: `standalone-agent-run-root.ts:428` (`closedTaskExecutions: this.taskExecutions.closedTaskExecutions()`, the same source as the view). Statuses are answered for active roots only (`standalone-agent-run-root-manager.ts:164-169`). For a stored tree, the closed set is computed via the Task resource port (`:429-433`).
- The client's context holds `closed_task_executions` and follows live close and reopen events (`agentRunCollaborationContext.ts:181, 191`).
- The task-execution key exists three times: contracts `root-execution-view-dtos.ts:25` (private), server `task-execution-reference.ts:7` (15 importers), web `taskExecutionClosure.ts:15` (2 importers). → FU-002.
- Team hosts (UNK-001): without a mounted Team context the run list shows the history tree's configured members only (`runHistoryTeamExecutionRows.ts:36-37`). With one, rows are filtered by `isTaskExecutionRowListed` and the Team stream keeps them current. Classified as not affected; validation checks it.
- Org hosts: history rows carry `closedTaskExecutions` on every read (`runHistoryStoreSupport.ts:110-126`).

## Requirement Implications

- It is a bug, not a network delay: the phone (and a desktop window) never re-reads a listed, non-open host's delegated rows when one of its Tasks closes; the 5 s poll looks only at states and children.
- The desktop looked fast because the PTM run was its open run (live stream).
- Fix where the poll decides to re-read: make a Task closure or reopening visible to it.

## Notes For Architecture Design

- Preserve the live path (BEH-001), the poll's cost profile (one batched states read per tick), the phone's no-polling-while-hidden rule, and the Org path (BEH-006).
- The node owns "closed" (`closed_task_executions`); the client must not derive it from Task statuses (Principle 11).
