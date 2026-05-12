# Investigation Notes

## Investigation Status

- Bootstrap Status: Complete
- Current Status: Investigation complete; design-ready findings recorded.
- Investigation Goal: Identify why single-agent workspace history rows can show the latest user message while team run rows keep the opening message, then define the correct owner and target behavior.
- Scope Classification (`Small`/`Medium`/`Large`): Medium
- Scope Classification Rationale: The visible bug is one row label, but the correct fix crosses backend run-history summary invariants and frontend active-history projection.
- Scope Summary: Stabilize single-agent workspace history row titles on the initial user message, consistent with team run title behavior.
- Primary Questions To Resolve:
  - Where is the workspace sidebar row label for single-agent runs sourced? Resolved: `RunTreeRow.summary` rendered by `WorkspaceHistoryWorkspaceSection.vue`.
  - Where is the team row label sourced, and why is it stable? Resolved: team rows use team history `summary`; team history also has coordinator-message recovery when stored summary is empty.
  - Which path can update single-agent run metadata/title on follow-up user messages? Resolved: WebSocket `SEND_MESSAGE` records every accepted message as candidate `summary` through `AgentRunService.recordRunActivity`.
  - Should the fix live in backend or frontend? Resolved: both boundaries should be tightened: backend owns durable invariant; frontend live projection should guard active rows from stale/latest summaries.

## Request Context

The user reports that a single Codex agent run row under `Workspaces > autobyteus-workspace-superrepo > Codex` displays `do it`, a later user message. The user expects both single-agent and agent-team run rows to always show the first/initial message. Agent-team rows reportedly already behave correctly.

The supplied screenshot shows the workspace history tree in the left sidebar. The relevant text is the child run row under a workspace and agent definition, not the center chat title (`Codex - 2901`) and not the separate compact running-run list component.

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/single-agent-run-title-initial-message`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/single-agent-run-title-initial-message/tickets/in-progress/single-agent-run-title-initial-message`
- Current Branch: `codex/single-agent-run-title-initial-message`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/single-agent-run-title-initial-message`
- Bootstrap Base Branch: `origin/personal`
- Remote Refresh Result: `git fetch origin personal` completed successfully on 2026-05-12.
- Task Branch: `codex/single-agent-run-title-initial-message`
- Expected Base Branch (if known): `origin/personal`
- Expected Finalization Target (if known): `personal`
- Bootstrap Blockers: None.
- Notes For Downstream Agents: The user's original checkout `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo` had local modified files and branch divergence; this task uses an isolated worktree from `origin/personal`.

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-05-12 | Command | `pwd && git rev-parse --show-toplevel && git status --short --branch && git remote -v && git branch --show-current && git symbolic-ref refs/remotes/origin/HEAD` | Bootstrap repository context from initial checkout | Initial checkout is `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo`, branch `personal`, remote default `origin/personal`, with modified files and ahead/behind divergence. | No |
| 2026-05-12 | Command | `git fetch origin personal` | Refresh tracked base before creating task worktree | Fetch completed successfully. | No |
| 2026-05-12 | Command | `git worktree add -b codex/single-agent-run-title-initial-message /Users/normy/autobyteus_org/autobyteus-worktrees/single-agent-run-title-initial-message origin/personal` | Create isolated ticket worktree | Worktree created at commit `56bd1b1e`, tracking `origin/personal`. | No |
| 2026-05-12 | Code | `autobyteus-web/components/workspace/history/WorkspaceHistoryWorkspaceSection.vue` | Identify left sidebar workspace row label source | Single-agent rows render `formatRunLabel(run.summary)`. Team rows render `formatTeamRunLabel(team)` using `team.summary`. | No |
| 2026-05-12 | Code | `autobyteus-web/components/workspace/history/WorkspaceAgentRunsTreePanel.vue` | Identify container/store wiring for workspace tree | The panel feeds `WorkspaceHistoryWorkspaceSection` from `runHistoryStore.getTreeNodes()` and `getTeamNodes()`. | No |
| 2026-05-12 | Code | `autobyteus-web/stores/runHistoryReadModel.ts` | Trace frontend projection from backend history/live contexts | Draft single-agent summaries already use the first non-empty user message. Persisted rows pass backend `summary` through, then call `mergeRunTreeWithLiveContexts`. | No |
| 2026-05-12 | Code | `autobyteus-web/utils/runTreeLiveStatusMerge.ts` | Check live active-row merge behavior | Live merge overlays only status and `lastActivityAt`, not summary. A live context's first user message is not used to protect an active persisted row label. | Yes: add summary overlay test/fix. |
| 2026-05-12 | Code | `autobyteus-web/stores/runHistoryTeamHelpers.ts` | Compare team live/history title behavior | Team node build preserves existing persisted summary; for live-only teams it derives summary from coordinator first user message. | No |
| 2026-05-12 | Code | `autobyteus-server-ts/src/services/agent-streaming/agent-stream-handler.ts` | Find single-agent message activity writes | `handleSendMessage` calls `agentRunService.recordRunActivity(activeRun, { summary: content, ... })` after every accepted user message. | No |
| 2026-05-12 | Code | `autobyteus-server-ts/src/services/agent-streaming/agent-team-stream-handler.ts` | Compare team message activity writes | Team WebSocket handler similarly passes every accepted user message as a candidate summary to `teamRunService.recordRunActivity`. | No |
| 2026-05-12 | Code | `autobyteus-server-ts/src/agent-execution/services/agent-run-service.ts` | Trace single-agent run activity into history index | `recordRunActivity` writes metadata and calls `AgentRunHistoryIndexService.recordRunActivity` with candidate summary. | No |
| 2026-05-12 | Code | `autobyteus-server-ts/src/run-history/services/agent-run-history-index-service.ts` | Check durable summary invariant | The service intends first-summary semantics through `resolveFirstSummary`, but it reads the existing row before queueing the write, so concurrent/overlapping updates can both see an empty summary. | Yes: make read-modify-write atomic. |
| 2026-05-12 | Code | `autobyteus-server-ts/src/run-history/services/team-run-history-index-service.ts` | Compare team durable summary invariant | Team index service has the same intended `resolveFirstSummary` pattern. Existing team behavior is better protected elsewhere by read-side recovery. | Consider shared/helper hardening without changing visible team behavior. |
| 2026-05-12 | Code | `autobyteus-server-ts/src/run-history/services/team-run-history-service.ts` | Find why teams self-heal | `resolveSummary` recovers empty team summaries from coordinator raw traces/projection and updates the team index. Single-agent history service lacks equivalent recovery. | Yes: add single-agent equivalent or active-row repair. |
| 2026-05-12 | Code | `autobyteus-server-ts/src/run-history/services/agent-run-history-service.ts` | Trace GraphQL workspace history source for single-agent rows | `listRunHistory` returns `row.summary` directly after metadata filtering; no repair from raw traces/projection. | Yes: add summary resolution path. |
| 2026-05-12 | Code | `autobyteus-server-ts/src/run-history/projection/run-projection-utils.ts` | Verify canonical projection summary semantics | Projection bundles derive summary from the first conversation entry where `role === "user"`. | No |
| 2026-05-12 | Test | `autobyteus-server-ts/tests/unit/run-history/services/agent-run-history-index-service.test.ts` | Check existing backend coverage | Sequential test asserts first summary is preserved, but no overlapping/concurrent write test exists. | Yes: add concurrency/atomicity coverage. |
| 2026-05-12 | Test | `autobyteus-web/utils/__tests__/runTreeLiveStatusMerge.spec.ts` and `autobyteus-web/stores/__tests__/runHistoryStore.spec.ts` | Check frontend projection coverage | Status/time overlay and team summary tests exist; no test asserts single-agent active live context first-message summary overlay. | Yes: add focused test. |
| 2026-05-12 | Command | `cd autobyteus-server-ts && pnpm test tests/unit/run-history/services/agent-run-history-index-service.test.ts --run` | Attempt focused backend test execution | Failed during `pretest`/`prepare:shared`: `tsc: command not found`; worktree local packages have no `node_modules`. | Implementation/validation may need install/bootstrap or use existing repo environment. |

## Current Behavior / Current Flow

- Current entrypoint or first observable boundary: Workspace history tree row under `Workspaces > <workspace> > <agent definition>`.
- Current execution flow:
  - Frontend creates/promotes a single-agent run through `agentRunStore.sendUserInputAndSubscribe`.
  - The first and later user messages are sent over WebSocket through `AgentStreamingService.sendMessage`.
  - Server `AgentStreamHandler.handleSendMessage` posts the message to the runtime and then records run activity with `summary: content` for every accepted user message.
  - `AgentRunService.recordRunActivity` forwards the candidate summary to `AgentRunHistoryIndexService.recordRunActivity`.
  - Workspace history GraphQL reads `AgentRunHistoryService.listRunHistory`, which returns the index row's `summary` directly.
  - Frontend `buildRunHistoryTreeNodes` projects the row and `WorkspaceHistoryWorkspaceSection` renders `run.summary`.
- Ownership or boundary observations:
  - `AgentRunHistoryIndexService` is the durable summary invariant owner for single-agent run history.
  - `AgentRunHistoryService` is the read/list owner for workspace history and currently does not repair single-agent summaries.
  - `mergeRunTreeWithLiveContexts` owns the frontend active-context overlay for persisted single-agent history rows.
- Current behavior summary: The code intends first-summary behavior, but the invariant is not atomically enforced and active frontend rows do not guard against stale/latest backend summaries using the live conversation's first user message.

## Design Health Assessment Evidence

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Bug Fix / Behavior Change
- Candidate root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Missing Invariant; small Duplicated Policy Or Coordination signal for first-summary logic shared across agent/team index services.
- Refactor posture evidence summary: A narrow refactor is needed to put first-summary preservation inside the atomic index write owner and to avoid duplicate ad hoc summary resolution. A broad UI refactor is not needed.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| `AgentRunHistoryIndexService.recordRunActivity` | Existing row read happens before write is queued; summary preservation depends on stale pre-write state. | Missing invariant at persistence boundary; overlapping activity records can allow later summary to win. | Yes |
| `TeamRunHistoryService.resolveSummary` | Teams recover empty summaries from coordinator first message. | Single-agent read model lacks equivalent self-healing. | Yes |
| `runTreeLiveStatusMerge.ts` | Live active merge updates status/time only. | Frontend does not use known live first user message to protect displayed active row title. | Yes |
| Existing tests | Sequential first-summary tests exist; no concurrency/live-title overlay tests. | Regression coverage is insufficient for reported behavior. | Yes |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-web/components/workspace/history/WorkspaceHistoryWorkspaceSection.vue` | Render workspace history rows | Renders `formatRunLabel(run.summary)` for single-agent rows and `formatTeamRunLabel(team)` for team rows. | Presentation should stay thin; do not put title policy here. |
| `autobyteus-web/stores/runHistoryReadModel.ts` | Build frontend workspace tree projection | Draft single-agent rows use first user message, but persisted rows use backend summary. | Reuse/extract first-user summary helper for live overlay. |
| `autobyteus-web/utils/runTreeLiveStatusMerge.ts` | Overlay live status onto persisted rows | Only overlays status/time. | Add first-user summary overlay for matching live single-agent contexts. |
| `autobyteus-server-ts/src/services/agent-streaming/agent-stream-handler.ts` | WebSocket command ingress for single-agent runs | Passes every accepted user message as a candidate summary. | Keep as candidate emission; do not make ingress own title immutability. |
| `autobyteus-server-ts/src/run-history/services/agent-run-history-index-service.ts` | Single-agent durable history index policy | Intended first-summary logic is not atomic across read/write. | Main backend fix owner. |
| `autobyteus-server-ts/src/run-history/services/agent-run-history-service.ts` | Single-agent history listing/GraphQL read model | Returns stored summary directly. | Add repair/recovery from projection where appropriate. |
| `autobyteus-server-ts/src/run-history/services/team-run-history-service.ts` | Team history listing/read model | Recovers summary from coordinator when stored summary is empty. | Pattern to mirror for agent history without changing team behavior. |
| `autobyteus-server-ts/src/run-history/projection/run-projection-utils.ts` | Projection summary construction | Canonical projection summary already means first user message. | Reuse as canonical source for repair. |

## Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-05-12 | Test | `cd /Users/normy/autobyteus_org/autobyteus-worktrees/single-agent-run-title-initial-message/autobyteus-server-ts && pnpm test tests/unit/run-history/services/agent-run-history-index-service.test.ts --run` | Failed in `prepare:shared`: `tsc: command not found`, with warnings that local package `node_modules` are missing. | Isolated worktree is not bootstrapped for test execution; downstream validation must bootstrap dependencies or run from a prepared environment. |

## External / Public Source Findings

- Public API / spec / issue / upstream source: None used.
- Version / tag / commit / freshness: N/A.
- Relevant contract, behavior, or constraint learned: N/A.
- Why it matters: The issue is internal to this repository.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: For implementation validation, focused unit tests should be enough for backend invariant and frontend projection; full UI validation can use the local app if bootstrapped.
- Required config, feature flags, env vars, or accounts: None identified for unit-level validation.
- External repos, samples, or artifacts cloned/downloaded for investigation: None.
- Setup commands that materially affected the investigation: Worktree creation from `origin/personal`.
- Cleanup notes for temporary investigation-only setup: None.

## Findings From Code / Docs / Data / Logs

1. The left sidebar workspace history row is summary-driven.
2. Draft single-agent rows already use first-message logic, so the reported problem concerns promoted/persisted runs.
3. Backend activity recording receives every user message as a candidate summary; the durable history owner must reject later candidates once a first summary exists.
4. The current durable owner has a race-prone read-before-queued-write shape.
5. Team history has stronger read-side recovery than single-agent history.
6. Frontend live merge can protect active single-agent rows immediately by deriving from live conversation first user message.

## Constraints / Dependencies / Compatibility Facts

- Public GraphQL field remains `summary`; target change tightens semantics rather than changing API shape.
- Existing team row behavior must not regress.
- No backward-compatible dual title sources should remain; `summary` should have one stable meaning in workspace history.
- Dependency installation/test environment is currently incomplete in the new worktree.

## Open Unknowns / Risks

- Existing inactive rows whose summary already mutated to a later message may need a broader migration if the user expects all historical rows repaired; this is not required for the immediate current/active-row fix.
- Concurrent update reproduction can be timing-sensitive; implementation should prefer deterministic unit harnesses around the new atomic store/service operation.
- Internal compaction runs may intentionally record synthetic summaries; implementation should decide whether first-message semantics apply there or whether compaction is outside workspace history title scope.

## Notes For Architect Reviewer

- The recommended design is a small boundary-hardening change, not a presentation-only UI patch.
- Main invariant: `RunHistoryItem.summary` / `RunTreeRow.summary` means the first non-empty user message used as the stable run title.
- Primary backend owner should be `AgentRunHistoryIndexService` plus the index store atomic write mechanism.
- Primary frontend owner should be `runTreeLiveStatusMerge` / shared run-summary helper, not the Vue row component.
