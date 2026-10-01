# Implementation Revision Record

The current code and `implementation-handoff.md` remain authoritative. This record locates the initial
baseline and each later implementation round.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Architecture Reviewer / `design-review-report.md` / Round 2 (ARCH-REV-002 Pass) | N/A | `Initial Baseline` | SR-007, ARCH-REV-002 | Implemented; ready for code review |
| IR-002 | Code Reviewer / `code-review-report.md` / Round 1 (CRR-001 Fail — Local Fix) | CR-001 | `Local Fix` | SR-007, ARCH-REV-002, CRR-001 | Fixed; back to code review |
| IR-003 | Code Reviewer / `code-review-report.md` / Round 2 (CRR-002 Fail — Local Fix) | CR-002 | `Local Fix` | SR-007, ARCH-REV-002, CRR-002 | Fixed; code review Pass (CRR-003, round 3); handed to API/E2E by the reviewer |
| IR-004 | Architecture Reviewer / `design-review-report.md` / ARCH-REV-004 Pass on SR-010 (after CRR-004 and API-REV-001) | DI-001, CR-003, CR-004 (F-02, F-03, F-04) | `Design Impact` rework (revised design) + released `Local Fix` items | SR-010, SR-008, ARCH-REV-004, CRR-004, API-REV-001 | Implemented; code review Pass (CRR-005, round 5, 9.3/10); handed to API/E2E by the reviewer |

## Revision Entries

### IR-001 — Collaborators in every live run: `@` menu, collaborator entries in three roots, the Agent root, web views

- Triggering role, report path, and round: `/software_engineering_team/architecture_reviewer`,
  `tickets/in-progress/cross-scope-agent-mentions/design-review-report.md`, round 2 (ARCH-REV-002, Pass).
- Triggering finding IDs: N/A.
- Classification: `Initial Baseline`.
- Prior authoritative result: N/A.
- Current authoritative result: the branch `codex/cross-scope-agent-mentions` @ `a7b4ae621`. It holds the full design: contracts, collaborator entries and
  admission in the Team, Org and new Agent roots, the always-on tool rule and standalone prompt,
  the standalone Agent root (package, stream, GraphQL, context files, references), and the web
  `@` menu, chips, inline mentions, collaborator-aware Team/Org/Agent views, task rows and the
  failure notice.
- Related solution revision IDs: SR-007 (design basis), SR-004 (requirements).
- Related architecture-review revision IDs: ARCH-REV-002 (Pass; AR-001–AR-005 resolved in the design).
- Related code-review revision IDs: N/A.
- Related API/E2E revision IDs: N/A.
- Related delivery revision IDs: N/A.
- Why this baseline is recorded: first implementation handoff.
- Approved behavior or requirement IDs affected: BEH-001–BEH-013; REQ-001–REQ-012; AC-001–AC-014.
- Implementation delta: see `implementation-handoff.md` → "Reviewed Behavior Implementation Trace" and
  "Key Files Or Areas". Commits on the branch, in order: `6d7565c27` contracts, `6772e45b3` run-history
  collaborators, `03dc40c2c` `agent` root kind, `3afdd3615` hosting move, `c694a1617` collaborators module,
  `ec246cdb5` Team root, `2570d4775` Org root, `811b09e50` tool rule and prompt, `c2f69edde` Agent root,
  `2778292fa` Agent-root message references, `9d403f40b` web `@`/Team/Org/rows, `821ae4295` web standalone
  collaboration and notice, `99e12c78c` docs, `aeb0569f5` frontend source-lookup cleanup, `a7b4ae621` Agent-root
  display names (from the render check). Branch head at handoff: `a7b4ae621`.
- Changed files or areas: `autobyteus-*-contracts`, `autobyteus-server-ts/src/{agent-collaboration,agent-run-collaboration,
  agent-team-execution,agent-org-execution,agent-execution,run-history,context-files,api,services/agent-streaming}`,
  `autobyteus-web/{components,composables,services,stores,types,utils,localization,graphql}`, server and web docs.
- Local validation and result: see `implementation-handoff.md` → "Local Implementation Checks Run" and
  "Frontend Rendered-Result Check".
- Next recipient or routing: per `get_handoff_rules` (Large/High → code review).
- Remaining limitations or risks: see `implementation-handoff.md` → "Known Risks".

### IR-002 — A run with a registered Agent root is live for history delete and archive (CR-001)

- Triggering role, report path, and round: `/software_engineering_team/code_reviewer`,
  `tickets/in-progress/cross-scope-agent-mentions/code-review-report.md`, round 1 (CRR-001, Fail — Local Fix).
- Triggering finding IDs: CR-001 (Medium).
- Classification: `Local Fix`.
- Prior authoritative result: IR-001 @ `a7b4ae621`. `AgentRunHistoryCatalogService.deleteRun` checked only
  `agentRunManager.hasActiveRun`, so after a host crash (root still registered, children running) Delete removed
  `memory/agents/<runId>/` including `collaboration/` under a live root.
- Current authoritative result: `codex/cross-scope-agent-mentions` @ `c8cd16a2b`. Delete, archive and prepared-run
  cancel refuse a run whose host is active **or** whose Agent root is registered, with the existing
  "Run is active. Terminate it before …" message. Stop (`terminateAgentRun`) still ends the root first, after which
  delete succeeds.
- Related solution revision IDs: SR-007.
- Related architecture-review revision IDs: ARCH-REV-002.
- Related code-review revision IDs: CRR-001.
- Related API/E2E revision IDs: N/A.
- Related delivery revision IDs: N/A.
- Why this revision is recorded: code-review Local Fix.
- Approved behavior or requirement IDs affected: BEH-005, BEH-006 (DS-004 root lifetime); REQ-006, REQ-007.
- Implementation delta:
  - New port `src/run-history/services/standalone-run-liveness.ts`: `createStandaloneRunLiveness({ agentRunManager?,
    collaborationRoots? })` → `isLive(runId)` = host active || root registered. It also owns the process defaults
    (previously an inline default in the catalog), keeping the catalog under the size guardrail (490 lines).
  - `AgentRunHistoryCatalogService`: new optional `collaborationRoots` dependency; delete/archive/cancel use
    `liveness.isLive`.
  - `AgentRunCollaborationRootManager.hasRoot(runId)` (active or loading) and static `hasRegisteredRoot(runId)`
    (false when no process manager).
  - Docs: `agent_run_collaboration.md` (Root lifetime) and `run_history.md` (identity/storage rules).
- Changed files or areas: `autobyteus-server-ts/src/run-history/services/{standalone-run-liveness,agent-run-history-catalog-service}.ts`,
  `autobyteus-server-ts/src/agent-run-collaboration/services/agent-run-collaboration-root-manager.ts`, two unit tests, two docs.
- Local validation and result: server typecheck clean; new tests — real root manager + catalog: host crash → delete and
  archive refused, package files kept, Stop ends the root; catalog: registered root refuses delete/archive and child
  memory stays, unregistered root deletes. `tests/unit/{run-history,agent-execution,agent-run-collaboration}` and
  `tests/integration/run-history`: 1219 passed, 11 failed, all failing on the base as well.
- Next recipient or routing: code reviewer (Large/High).
- Remaining limitations or risks: unchanged from IR-001 (C-02 residual noted by the reviewer).

### IR-003 — History delete/archive end a lingering Agent root first instead of refusing (CR-002)

- Triggering role, report path, and round: `/software_engineering_team/code_reviewer`,
  `tickets/in-progress/cross-scope-agent-mentions/code-review-report.md`, round 2 (CRR-002, Fail — Local Fix).
- Triggering finding IDs: CR-002 (Medium). CR-001 was confirmed resolved in CRR-002.
- Classification: `Local Fix`.
- Prior authoritative result: IR-002 @ `c8cd16a2b`. `isLive = host active || root registered` refused delete/archive of
  any crashed eligible run, because every eligible run registers a root on host publish and the root outlives a crash.
  The row renders inactive and offers no Stop, so the user could not clean it up (regresses B-003).
- Current authoritative result: `codex/cross-scope-agent-mentions` @ `5dcc5dc82`. `StandaloneRunLiveness.releaseForHistory(runId)`:
  refuse while the host is active; if a root is registered, end it first through its owner (fence, stop every child,
  unregister — `AgentRunCollaborationRootManager.endRegisteredRoot` → `terminateRoot`), then proceed; refuse with the
  existing message only if the root cannot be ended. Nothing is deleted while the root is live.
- Related solution revision IDs: SR-007.
- Related architecture-review revision IDs: ARCH-REV-002.
- Related code-review revision IDs: CRR-001, CRR-002.
- Related API/E2E revision IDs: N/A.
- Related delivery revision IDs: N/A.
- Why this revision is recorded: code-review Local Fix.
- Approved behavior or requirement IDs affected: BEH-005, BEH-006; preserved B-003 restored.
- Implementation delta:
  - `run-history/services/standalone-run-liveness.ts`: `StandaloneRunCollaborationRoots` gains `endRoot`;
    `StandaloneRunLiveness.isLive` → `releaseForHistory`; process default ends the root through the manager (same
    narrow-port shape, dynamic import, no run-history import of root internals).
  - `agent-run-history-catalog-service.ts`: delete/archive/cancel call `releaseForHistory`.
  - `agent-run-collaboration-root-manager.ts`: static `endRegisteredRoot(runId)`.
  - Docs: `agent_run_collaboration.md` (Root lifetime), `run_history.md`.
- Changed files or areas: the three source files above, `agent-run-collaboration-root.test.ts`,
  `agent-run-history-catalog-service.test.ts`, two docs.
- Local validation and result: server typecheck clean. Tests: real manager + catalog — crash with a live child, then
  delete: the root and child are ended first (the package still exists when the root is ended), then the run directory
  is removed; crash without collaborators, then delete: the empty root is ended and the run deleted. Catalog — delete and
  archive end the root first and succeed; a root that cannot be ended refuses delete and archive and keeps every file;
  an active host refuses without touching the root; no root deletes directly.
  `tests/unit/{run-history,agent-execution,agent-run-collaboration}` + `tests/integration/run-history`: 1224 passed,
  11 failed (the same files as before, all failing on the base).
- Next recipient or routing: code reviewer (Large/High).
- Remaining limitations or risks: unchanged (C-02 residual).

### IR-004 — One hosted instance per collaborator, added at send; messaging by address; RD-004; CR-003/CR-004

- Triggering role, report path, and round: `/software_engineering_team/architecture_reviewer`,
  `tickets/in-progress/cross-scope-agent-mentions/design-review-report.md` (ARCH-REV-004, Pass on SR-010). The revised
  design answers API-REV-001 (`api-e2e-execution-coverage-report.md`, DI-001) and CRR-004 (`code-review-report.md`
  round 4, CR-003 and CR-004 F-02/F-03/F-04).
- Triggering finding IDs: DI-001 (Design Impact), CR-003 (High), CR-004 F-02/F-03/F-04 (Medium); RD-004 (REQ-014/AC-016).
- Classification: rework on a revised design (`Design Impact` resolved upstream) with the released `Local Fix` items.
- Prior authoritative result: IR-003 @ `5dcc5dc82` (code review Pass, CRR-003). Collaborators were entries without runs;
  `delegate_task` started each instance as a root task execution; `send_message_to` to a collaborator address was rejected
  with a hint, so a collaborator Team's coordinator could not reach its teammates (DI-001); a Team send with mentions never
  settled (CR-003); rendering gaps F-02/F-03/F-04; inter-agent deliveries showed user-style.
- Current authoritative result: `codex/cross-scope-agent-mentions` @ `bcff48200` (`fdda4a2ed`, `180a2d2d4`, `33b0d1eef`,
  `bcff48200`). One hosted instance per collaborator, added inside the root gate at send (validate → allocate → prepare →
  commit → publish Offline → `collaborator_added` → compose); `COLLABORATOR_ADD_FAILED` with `collaborator_name` on
  failure; hosted in each root's backends, restored and stopped with the root; messages resolve collaborators and their
  Team members; `delegate_task` starts extra copies; `senderId` recorded and replayed as "From <Sender>:"; web rows from
  `collaborators`, held mention sends, identity settle, F-02/F-03/F-04.
- Related solution revision IDs: SR-010 (design), SR-008 (requirements).
- Related architecture-review revision IDs: ARCH-REV-004.
- Related code-review revision IDs: CRR-004 (CR-003, CR-004).
- Related API/E2E revision IDs: API-REV-001 (DI-001).
- Related delivery revision IDs: N/A.
- Why this revision is recorded: implementation of the revised design and the released code-review fixes.
- Approved behavior or requirement IDs affected: BEH-003, BEH-005, BEH-006, BEH-007, BEH-008, BEH-013, BEH-014;
  REQ-003, REQ-005, REQ-008, REQ-013, REQ-014; AC-016.
- Implementation delta:
  - Contracts: entry DTO identities and collaborator Team `task_executions`; `collaborator_name` on Team ERROR and
    collaboration acks; correlation of collaborator executions; note wording; `COLLABORATOR_ADD_FAILED`.
  - Server collaborators module: plan-only admission with reuse, `CollaboratorRunnabilityValidator`,
    `CollaboratorIdentityAllocator`, `CollaboratorAddError`, copy-source projection; hint removed; in-run rule = every entry
    and collaborator Team member.
  - Records/schemas: identity fields, run-ID uniqueness across the tree, collaborator Team task owners;
    `collaborator-entry-tree-mapping.ts` for the three mutators.
  - Roots: Org and Agent root host via `collaborator-handle-preparation.ts`; Team root via
    `FlatTeamExecutionManager.prepareCollaborator{Agent,Team}`, `CollaboratorTeamExecutionRegistry`, config resolver with
    per-collaborator activation mode, `TeamRunResolver` registration, `requireCollaboratorTeam`; indexes with
    `collaborator`/`collaborator_team_member`; message placements; live-tree member contexts with collaborator scopes;
    Agent-root task adapter host-aware; stream handlers and command coordinator carry the rejection.
  - RD-004: `inter-agent-sender.ts` (autobyteus-ts), native ingest and the external recorder store `senderId`; replay item
    `inter_agent_message` with `senderAddress` in member projections.
  - Web: `withCollaboratorExecutions` / `collaboratorExecutionNodes`, in-place collaborator contexts (Team, Org, Agent root),
    `opensOnAppear` (F-02), `memberDisplayName.ts` (F-03), F-04 header/placeholder, identity settle (CR-003), held
    submission + `CollaboratorAddRejection` + notice from `AgentContext.collaboratorAddFailure`, RD-004 rendering.
  - Removed: collaborator task-execution paths, `collaboratorAddressMessageHint`, `hasTaskExecutionAt`, the web
    `delegate_task`-null derivation, per-surface name helpers, the SR-007 Team integration collaborator tests.
  - Docs: server `agent_communication`, `agent_team_execution`, `agent_orgs`, `agent_run_collaboration`, `run_history`;
    web `chat`.
- Changed files or areas: ~190 files across `autobyteus-*-contracts`, `autobyteus-ts`, `autobyteus-server-ts`,
  `autobyteus-web` (see the handoff's Key Files).
- Local validation and result: server and `autobyteus-ts` typecheck clean; server unit 78 failed / 4029 (identical failing
  files to the IR-003 baseline); server integration 46 failed / 380 (identical files and counts to the baseline);
  web 4 failed / 3462 (baseline failures only); contract tests pass. Render check on real Claude runs in an Agent run and a
  Team run (`implementation-evidence/render-check-sr010/`), notice from an injected rejection.
- Next recipient or routing: code reviewer (Large/High).
- Remaining limitations or risks: admission latency inside the root gate (not measured); AGY/ACP not exercised live;
  prompt change for all eligible standalone agents; a malformed Agent-root package blocks `prepareAgentRun`
  (pre-existing, SR-007 dev data is invalid under SR-010); Org journeys not rendered live; the active-trace page shows
  deliveries user-style; the API/E2E engineer's SR-007 collaborator probes need updating.
- Review outcome (recorded after handoff): code review **Pass** — CRR-005 (round 5, IR-004 @ `bcff48200`, score 9.3/10);
  DI-001, CR-003 and CR-004 resolved. The reviewer handed the package to `/software_engineering_team/api_e2e_engineer`.
  Non-blocking notes for the next source touch: C-15 (inert `hasTaskExecutionAt` in `collaborator-root-port-resolver.ts`
  `emptyPort`), C-11 (no self-delegation guard in the Agent root, unlike Team and Org roots). No action taken now.
