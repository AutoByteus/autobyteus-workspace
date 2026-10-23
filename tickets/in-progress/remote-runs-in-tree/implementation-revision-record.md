# Implementation Revision Record — remote-runs-in-tree (autobyteus-278)

The current code and `implementation-handoff.md` remain authoritative. This record locates the implementation baseline.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Architecture Reviewer, `design-review-report.md`, pass (ARCH-REV-002) | N/A | `Initial Baseline` | SR-005, ARCH-REV-002; CRR/API-REV/DR N/A | Implemented at `1046c6beb4`; ready for code review |
| IR-002 | Code Reviewer, `code-review-report.md`, CRR-001 | F-001 | `Local Fix` | SR-005, ARCH-REV-002, CRR-001; API-REV/DR N/A | Fixed at `1bdcff8ae2`; back to code review (Targeted Delta Review) |
| IR-003 | Code Reviewer, `code-review-report.md`, CRR-003 (failure origin of API-REV-001); Architecture Reviewer ARCH-REV-003 (SR-006) | F-002, F-003, F-004 (Local Fix); F-005 (Design Impact → SR-006 DS-004a); N-405 | `Local Fix` | SR-006, ARCH-REV-003, CRR-003, API-REV-001; DR N/A | Fixed at `e37ad88b98`; back to code review (Targeted Delta Review) |
| IR-004 | Architecture Reviewer ARCH-REV-005 on SR-008 (`design-spec.md` § Window Retry Rule; FU-004 pulled in by the user) | FU-004; N-405, N-407 | `Local Fix` (implementing the SR-008 design) | SR-008, ARCH-REV-005, CRR-004, API-REV-001; DR N/A | Implemented at `2aeccdd850`; to code review (Targeted Delta Review) |

## Revision Entries

### IR-001 — Remote delegated runs in the run tree, initial implementation

- **Triggering role, report path, and round:** Architecture Reviewer, the architecture review passed (ARCH-REV-002) on design `8dc717e39c` (SR-005). Report: `tickets/in-progress/remote-runs-in-tree/design-review-report.md`.
- **Triggering finding IDs:** N/A.
- **Classification:** Initial Baseline.
- **Prior authoritative result:** N/A.
- **Current authoritative result:** the design's change sequence 1–6 is implemented, and implementation-scoped checks pass (IMP-01 … IMP-09).
- **Related revision IDs:**
  - Solution: SR-005.
  - Architecture review: ARCH-REV-002.
  - Code review, API/E2E, delivery: N/A.
- **Why this baseline is recorded:** the first implementation handoff.
- **Approved behavior or requirement IDs affected:**
  - REQ-801 … REQ-808, DS-001 … DS-006;
  - AR-401 … AR-403, N-401 … N-404;
  - UIS / VIS of the UI/UX spec.
- **Implementation delta** (base `1c6614a481` → `1046c6beb4`):
  - `b902770615` contracts: remote task execution DTOs; the views', events' and refresh commands' fields; `dist/` rebuilt.
  - `189b02cb34` server, both sides:
    - B: the run-view routes, `RemoteRunViewProvider`, `PairedAgentAccess` per root kind.
    - A: `RemoteRunObservation`, the port and client calls, `RemoteRunLinks.ownerCommand`, remote child commands, the view and event projectors, the member-projection resolvers.
  - `188dc4b3ae` web: `useRemoteRunsStore`, the remote contexts of the three tree families, the row and the run view per the UI spec, strings (en, zh-CN).
  - `6695820605` web fix found by the rendered check (IMP-09): Retry also reads the selected remote child's conversation again.
  - `53c6624aea` fixes:
    - The Team's stored view (`getTeamRunResumeConfig`) carries the remote runs, so a stopped Team lists them.
    - One Team registry (`teamRemoteRunRegistry`).
    - Retry callbacks answer whether the node is being asked, so "Checking" always settles.
  - `678e81a501` docs: `collaboration_model.md` § 3/4/5, `remote_collaboration.md`, web `agent_execution_architecture.md`.
  - `1046c6beb4`: test fakes.
- **Changed files or areas:** see `implementation-handoff.md` § Key Files Or Areas.
- **Local validation and result:**
  - Server: typecheck, full unit (6538 passed) and integration (421 passed).
  - Contracts: 78 passed.
  - Web: full suite (4777 passed) and guards.
  - Focused remote suites.
  - Rendered check on a test-owned two-node stack (IMP-09).
- **Next recipient or routing:** Code Reviewer (Large/High).
- **Remaining limitations or risks:**
  - Roots without a live stream show remote rows without title or status (FU-002).
  - A remote run's files are not read (FU-001).
  - Team and Org roots were not rendered in the stack: unit coverage only.
  - The two-server E2E and the browser probe belong to API/E2E.

### IR-002 — A Team delegator's remote runs in delegation order (CRR-001 F-001)

- **Triggering role, report path, and round:** Code Reviewer, `tickets/in-progress/remote-runs-in-tree/code-review-report.md`, CRR-001.
- **Triggering finding IDs:** F-001 (Low, Local Fix).
- **Classification:** Local Fix.
- **Prior authoritative result:** IR-001. The Team family listed remote rows after all of the tree's rows (`teamExecutionViewState.ts` `navigationRows`; `teamRemoteExecutions.ts` "after the tree's rows").
- **Current authoritative result:** a Team root's remote runs sit among its root-level delegated copies by `started_at`, as in the standalone and Org families (UI spec line 111: one list in delegation order; REQ-806). The Team's own members, with the copies under them, keep their place first.
- **Related revision IDs:** SR-005, ARCH-REV-002, CRR-001; API-REV and DR: N/A.
- **Why this revision is recorded:** the code review's Local Fix.
- **Approved behavior or requirement IDs affected:** REQ-801, REQ-806; UI spec "one list".
- **Implementation delta (`1bdcff8ae2`):**
  - `teamRemoteExecutions.ts`: `remoteNavigationRows` becomes `teamNavigationRowsWithRemote`. It splits the tree's rows into the leading rows (the root and the members with their copies) and one block per root-level copy (the copy and the rows under it), dated by the root's `task_executions[].started_at`. It then merges the remote runs' blocks into them with the shared `mergeByStartTime`. `remoteRunRows` builds one remote run's rows, unchanged.
  - `teamExecutionViewState.ts` calls it (497 effective lines).
  - The sidebar (`buildRunHistoryTeamExecutionRows`) keeps the navigation order.
- **Changed files or areas:** `autobyteus-web/services/teamExecution/{teamRemoteExecutions,teamExecutionViewState}.ts`, `autobyteus-web/services/teamExecution/__tests__/teamExecutionRemoteRuns.spec.ts`.
- **Local validation and result:**
  - The new spec (`teamExecutionRemoteRuns.spec.ts`) has a remote Team started at 08:00 between two local root-level copies started at 07:00 and 09:00. The remote Team lists between them, with its members below it, and the Team's member row stays first. The spec fails without the fix.
  - Full web suite: 4778 passed (IMP-06). Focused remote specs: 59 passed (IMP-08). Guards pass (IMP-07). Type check: no errors in the touched files.
  - The server is unchanged, so IMP-01…05 still apply.
- **Next recipient or routing:** Code Reviewer (Large/High; Targeted Delta Review).
- **Remaining limitations or risks:** unchanged from IR-001. C-2 (B's own owner stopping the run does not end A's stream) is held by the reviewer for API/E2E.

### IR-003 — Owner heading, opening frame first, run end by any path, one view owner (CRR-003, SR-006)

- **Triggering role, report path, and round:**
  - Code Reviewer, `tickets/in-progress/remote-runs-in-tree/code-review-report.md` CRR-003, the failure-origin review of API/E2E API-REV-001.
  - Architecture Reviewer, ARCH-REV-003 (`design-review-report.md`) on SR-006 (`design-spec.md` DS-004a).
- **Triggering finding IDs:** F-002, F-003 and F-004 (Local Fixes); F-005 (Design Impact, resolved by SR-006 DS-004a); N-405 (non-blocking).
- **Classification:** Local Fix (implementing the SR-006 design for F-005).
- **Prior authoritative result:** IR-002. Four defects:
  1. B could send a live run's first frame before `{nodeId}`, so A ended the stream.
  2. The Team and Org families' remote run views lacked the affordances.
  3. B ended observations only after an owner-command terminate.
  4. The owner mark was unread metadata.
- **Current authoritative result:**
  - The owner's message carries the heading.
  - `{nodeId}` is always first.
  - B ends the stream on stop, terminate or delete by any path, but not on idle shutdown.
  - Every family's remote run view comes from one owner.
- **Related revision IDs:** SR-006, ARCH-REV-003, CRR-003, API-REV-001; DR: N/A.
- **Why this revision is recorded:** the code review's Local Fixes and the SR-006 design change.
- **Approved behavior or requirement IDs affected:** REQ-802, REQ-803 (AC-803 heading), REQ-806, REQ-808; DS-004a, DS-006; N-401, N-405.
- **Implementation delta:**
  - `c7abe89186` server:
    - **F-005:** `remoteOwnerUserMessage` composes `From the owner of node "<name>":`, a blank line and the text, and drops `remote_owner`. `RemoteOwner` is `{nodeName}` only; IDs pass through.
    - **F-002:** the run-observations route holds sink frames until it has sent `{nodeId}`, then flushes them in order.
    - **F-004:** `observePairedAgents(runId, onPresentation, onEnded)`.
      - Standalone: `StandaloneAgentRunRootManager.onRunEnded`, reported by `stopRoot` and `endRoot` after the host stopped.
      - Team: `TeamRunLifecycleSnapshot.ending` (`idle_shutdown` | `stopped` | `null`), from `RootTeamRun`'s `onTerminated(ending)` through the materializer to the manager's `unregister`.
      - The provider closes the sink on `onEnded`, and its terminate-only `endObservations` is removed.
  - `57a022d0bb` and `0048cd8ae1` web (F-003): `useRemoteRunView`, the one owner of the chip, ⚙/＋, the notice and Retry, and the placeholder. `AgentWorkspaceSurface` and `TeamWorkspaceSurface` use it; `AgentWorkspaceView` drops its own remote placeholder.
  - `a0fa3f2fb0` docs: `remote_collaboration.md` (the heading, the opening frame, the end) and web `agent_execution_architecture.md` (the one view owner).
  - `e37ad88b98`: the integration lifecycle test expects `ending`.
- **Changed files or areas:**
  - `paired-agent-access.ts`, `remote-run-view-provider.ts`, `api/rest/remote.ts`;
  - `standalone-agent-run-root-manager.ts`, `standalone-paired-agent-access.ts`;
  - `team-run-lifecycle.ts`, `root-team-run.ts` (499 lines), `team-root-materializer.ts`, `agent-team-run-manager.ts`, `team-paired-agent-access.ts`;
  - `useRemoteRunView.ts`, `AgentWorkspaceSurface.vue`, `TeamWorkspaceSurface.vue`, `AgentWorkspaceView.vue`;
  - tests.
- **Local validation and result:**
  - New tests fail without their fix: `remote-run-observations-route.test.ts` (2 cases through the real WebSocket route) and `RemoteRunViewAffordances.spec.ts` (6 of 8).
  - New run-end coverage: `paired-agent-access.test.ts` (both kinds) and `standalone-agent-run-root.test.ts` (end after the host stopped). `team-remote-delegation.test.ts` shows a real idle shutdown keeps the observation. The integration test shows a real terminate reports `stopped`.
  - Full suites: server typecheck clean (IMP-01); server unit 6543 passed (IMP-03); integration 421 passed (IMP-04); focused server 194 passed (IMP-05); web 4786 passed (IMP-06); guards pass (IMP-07); focused web 67 passed (IMP-08).
- **Next recipient or routing:** Code Reviewer (Large/High; Targeted Delta Review), then API/E2E reruns the two-server E2E and the browser probe.
- **Remaining limitations or risks:**
  - API/E2E's RC-31 still expects the pre-heading content and scans for `remote_owner`; it needs updating for DS-004a. N-405's single-user-message assertion is theirs to add.
  - A Team terminate through the in-process fake runtime is not supported, so the Team `stopped` path is covered by the manager unit test and the real-root integration test rather than the two-node in-process case.
  - IMP-09 was not repeated for IR-003.

### IR-004 — One owner of the remote Retry rule (SR-008, FU-004)

- **Triggering role, report path, and round:** Architecture Reviewer, ARCH-REV-005 (`design-review-report.md`) on SR-008, `design-spec.md` § Window Retry Rule. FU-004 was pulled into this ticket by the user.
- **Triggering finding IDs:** FU-004; N-405 (still open from round 3); N-407 (non-blocking: the pseudocode governs).
- **Classification:** Local Fix (implementing the SR-008 design).
- **Prior authoritative result:** IR-003. Three per-family copies of the Retry rule that differed:
  - Standalone and Org fell back to `agents[0]`, and only when the refresh failed.
  - Team returned right after a successful refresh.
- **Current authoritative result:** one rule, `remoteRunsStore.retry(runId)`, following the design's pseudocode:
  1. `checking`;
  2. `refreshed ← refreshOnStream()`;
  3. `target ← selectedAgent()` when it is one of the run's agents, else the run's first agent not `isLoaded`;
  4. `started ← target ? rereadAgent(target) : false`;
  5. settle at once unless `refreshed` or `started`.

  A loaded selected agent is not replaced by another (N-407). Each family registers a `RemoteRunRetryAdapter` with only its own mechanisms.
- **Related revision IDs:** SR-008, ARCH-REV-005, CRR-004, API-REV-001; DR: N/A.
- **Why this revision is recorded:** the design change SR-008 (FU-004).
- **Approved behavior or requirement IDs affected:** REQ-804 (Retry), REQ-806 (the same in every family). The behavior changes per family are the ones the design lists.
- **Implementation delta (`f60f962d9d`, docs `2aeccdd850`):**
  - `remoteRunsStore.ts`: `RemoteRunRetryAdapter`; `register(execution, adapter)`; `retry` holds the rule.
  - Standalone `remoteRetryAdapter`: the collaboration stream, `selection`, `isChildHydrated`, and `ensureChildHydrated`, which returns `false` for a loaded child.
  - Org `remoteRetryAdapter`: the Org stream, the selected agent execution, `AgentOrgExecutionContext.isRemoteAgentLoaded` (new; `hydrateRemoteOrgMember` marks it after the commit), and `readRemoteMember`, skipped for a loaded agent.
  - Team `teamRemoteRetryAdapter` (`teamRemoteRunRegistry.ts`): `refreshTeamRemote`, the focused member, `isTeamMemberProjectionAuthoritative`, and `ensureAuthoritativeTeamMemberProjection`, skipped for a loaded member.
  - The copies `retryRemote` (standalone, Org) and `retryTeamRemoteRun` are removed.
  - `test-support/remoteRunRetryAdapter.ts`: a stream-only adapter for specs about other things.
- **Changed files or areas:**
  - `autobyteus-web/stores/{remoteRunsStore,agentRunCollaborationStore,agentOrgContextsStore}.ts`;
  - `services/agentOrgExecution/{agentOrgExecutionContext,agentOrgContextHydration}.ts`;
  - `services/teamExecution/teamRemoteRunRegistry.ts`;
  - specs;
  - web `agent_execution_architecture.md`.
- **Local validation and result:**
  - The rule spec (`remoteRunsStore.spec.ts`, 5 rule cases).
  - Per family:
    - standalone `agentRunCollaborationRemoteRetry.spec.ts` (new case: a live stream with nothing selected also reads the first unloaded agent);
    - Org `agentOrgRemoteRetry.spec.ts` (new);
    - Team `teamRemoteRunRegistry.spec.ts` (new).
  - N-405: `memberInputMessageHandler.spec.ts`, where the streamed owner message replaces its echo (one message, with the heading).
  - Full web suite: 4798 passed (IMP-06). Guards pass (IMP-07). Focused web: 84 passed (IMP-08). vue-tsc: no errors in the touched files.
  - The server is unchanged, so IMP-01 to IMP-05 still apply.
- **Next recipient or routing:** Code Reviewer (Large/High; Targeted Delta Review), then API/E2E.
- **Remaining limitations or risks:**
  - The end-to-end N-405 assertion (exactly one user message in alpha's view, carrying the heading) is API/E2E's.
  - IMP-09 was not repeated for IR-004.
