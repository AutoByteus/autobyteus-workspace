# Implementation Revision Record — task-run-resources-workspace-cleanup

The current code and `implementation-handoff.md` are authoritative. This record only locates each implementation round.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | `/architecture_reviewer`, ARCH-REV-003 Pass (SR-008 resume; earlier ARCH-REV-002 Pass on SR-006) | N/A | `Initial Baseline` | `SR-006`, `SR-007`, `SR-008`, `ARCH-REV-002`, `ARCH-REV-003` | Implemented; local checks pass; routed to code review |
| IR-002 | `/code_reviewer`, `code-review-report.md` CRR-001 (Fail, Local Fix), round 2 | CR-001 | `Local Fix` | `SR-008`, `ARCH-REV-003`, `CRR-001` | Fixed; mounted-component test added; returned for delta review |
| IR-003 | `/code_reviewer`, failure-origin review CRR-003 of API-F-001 (BR-002), round 3 | CR-002 | `Local Fix` | `SR-008`, `ARCH-REV-003`, `CRR-003`, API/E2E BR-002 | Fixed; cascade regression test + real-Chrome check; returned for targeted review |
| IR-004 | `/architecture_reviewer`, ARCH-REV-004 Pass on SR-009, round 4 | N/A (SR-009 changes; notes R-5, R-6) | `Design Revision Implementation` | `SR-009`, `ARCH-REV-004` | Per-root closed index + protocol/module docs; returned for source review |

## Revision Entries

### IR-001 — Closed Task runs leave the Workspaces tree (Agent, Team, Org roots)

- Triggering role, report path, and round: `/architecture_reviewer`, `/Users/normy/autobyteus_org/autobyteus-worktrees/task-run-resources-workspace-cleanup/tickets/in-progress/task-run-resources-workspace-cleanup/design-review-report.md` (ARCH-REV-003 Pass), round 1 of implementation.
- Triggering finding IDs: N/A. Non-blocking notes R-1–R-3 applied; R-4 is a design-doc pointer (not implementation-owned).
- Classification: `Initial Baseline`
- Prior authoritative result: `N/A`
- Current authoritative result: REQ-001–REQ-009 implemented per SR-008; REQ-010 is out of this package (delivered as `delegated-row-clean-style`).
- Related solution revision IDs: `SR-006`, `SR-007`, `SR-008`
- Related architecture-review revision IDs: `ARCH-REV-002`, `ARCH-REV-003`
- Related code-review / API-E2E / delivery revision IDs: `N/A`
- Why this baseline is recorded: initial implementation handoff. Work began on SR-006, was paused by the user (SR-007), and resumed on base `5c74fed71` (SR-008). The rebase-reapplied work kept only the leave-motion hunks in the two restyle-owned components.
- Approved behavior or requirement IDs affected: BEH-002–BEH-006; REQ-001–REQ-009; AC-001–AC-010 (AC-011 moved out).
- Implementation delta: see `implementation-handoff.md` › Reviewed Behavior Implementation Trace and Key Files.
- Changed files or areas: collaboration and Team stream contracts (src, dist, tests); server port/Task side, shared closure function, root task scope/adapters, three roots, three root-kind managers, projectors, Team resume config and Org history item; web shared closure util, Agent/Team/Org contexts and stores, Team tree consumer, Org history rows, hydration, GraphQL queries and generated types, tree components (leave motion), fixtures and tests.
- Local validation and result: see handoff › Local Implementation Checks Run.
- Next recipient or routing: `/code_reviewer` (Large/High).
- Remaining limitations or risks: see handoff › Known Risks.

### IR-002 — The Agent tree keeps its last leaving rows' motion and focus move (CR-001)

- Triggering role, report path, and round: `/code_reviewer`, `/Users/normy/autobyteus_org/autobyteus-worktrees/task-run-resources-workspace-cleanup/tickets/in-progress/task-run-resources-workspace-cleanup/code-review-report.md` (CRR-001), implementation round 2.
- Triggering finding IDs: CR-001
- Classification: `Local Fix`
- Prior authoritative result: IR-001, commit `af690af33`. `AgentRunTaskRows.vue` used `v-if="rows.length || leaving"`. When the last rows left, the guard turned false in the same render (before `before-leave` raised `leaving`). The whole `TransitionGroup` unmounted, so there was no fade, no `aria-hidden`/inert, and focus fell to `body`.
- Current authoritative result: the Agent tree renders while `rendered` is true. `rendered` turns on when rows exist and off only when the last leave settles (`after-leave`/`leave-cancelled` with `leaving === 0` and no rows). After that, the empty list is not rendered (UI spec).
- Related solution / architecture / code-review revision IDs: `SR-008` / `ARCH-REV-003` / `CRR-001`
- Related API/E2E / delivery revision IDs: `N/A`
- Why recorded: code-review Local Fix.
- Approved behavior or requirement IDs affected: REQ-002 / AC-010, REQ-009 / AC-009 (Agent root).
- Implementation delta: `autobyteus-web/components/workspace/history/AgentRunTaskRows.vue` (guard → `rendered` ref, `onRowLeaveSettled`). The Team and Org trees are unchanged; they always keep stable member rows.
- Changed files or areas: `AgentRunTaskRows.vue`; new `components/workspace/history/__tests__/AgentRunTaskRowsLeave.spec.ts` (real `TransitionGroup`, not stubbed).
- Local validation and result:
  - New spec 2/2. The only row leaves through the hook (`aria-hidden`, inert), focus moves to the run row, and the tree is gone after the leave settles. A later new row renders again.
  - The spec fails 1/2 against the old guard (checked with a temporary revert, then restored).
  - Affected web suites (history components, Agent/Team/Org services, closure stores, utils): 101 files / 689 tests pass.
- Next recipient or routing: `/code_reviewer` (delta review of CR-001).
- Remaining limitations or risks: the Agent-tree last-row leave was verified in jsdom with the real `TransitionGroup`, not in a browser render.

### IR-003 — A leaving row that still carries the move class keeps its fade and collapse (CR-002)

- Triggering role, report path, and round: `/code_reviewer`, failure-origin review of API-F-001 / BR-002 (`code-review-report.md`, CRR-003), implementation round 3. API/E2E evidence: `api-e2e-evidence/BR-002-failure-summary.json`.
- Triggering finding IDs: CR-002
- Classification: `Local Fix`
- Prior authoritative result: IR-002 (`489268fc7`).
  - `treeRowLeave.css` declared `.tree-row-leave-active { transition: opacity, max-height, margin-top }` before `.tree-row-move { transition: transform }`. Both are equally specific, so for a row with both classes the later shorthand won (`transition-property: transform`).
  - Opacity and height jumped, and the row was removed by Vue's fallback timer.
- Current authoritative result:
  - `.tree-row-move` is declared first.
  - `.tree-row-leave-active` follows and lists `opacity`, `max-height`, `margin-top` and `transform` at 200 ms ease-out, so a leave always fades and collapses and still completes the move's transform.
  - Reduced motion still sets `transition: none` on both, via the last rule.
- Related solution / architecture / code-review revision IDs: `SR-008` / `ARCH-REV-003` / `CRR-003`
- Related API/E2E revision IDs: the API-F-001 / BR-002 round in `api-e2e-revision-record.md`. Delivery: `N/A`.
- Why recorded: failure-origin Local Fix.
- Approved behavior or requirement IDs affected: REQ-002 / AC-010 (all three trees share the CSS); AC-009 trigger path (a selected worker row grows and moves).
- Implementation delta:
  - `autobyteus-web/components/workspace/history/treeRowLeave.css`: rule order and the leave transition list.
  - `__tests__/useLeavingTreeRows.spec.ts`: updated rule assertion, plus a new cascade test that applies the real stylesheet to a row with `tree-row-move tree-row-leave-active tree-row-leave-to` and asserts its computed transition covers opacity, max-height, margin-top and transform, while a move-only row stays `transform 200ms ease-out`.
- Changed files or areas: the two files above. The API/E2E-owned uncommitted test files were not touched.
- Local validation and result:
  - The new cascade test passes. Against the old CSS (temporary swap, restored) it fails exactly as reported: `'transform 200ms ease-out'` lacks opacity.
  - History component suites: 13 files / 160 tests pass.
  - Real Chrome (temporary page and runner, removed): a rendered scoped row given both classes computes `transition-property: opacity, max-height, margin-top, transform`, with opacity 0.32 and height 10 px at 100 ms. Under reduced motion it computes `none`.
  - A natural close-then-close overlap in the Org fixture faded over about 235 ms in 3 of 3 attempts, but did not reproduce the lingering move class.
  - Evidence: `implementation-evidence/ir-003-leave-during-move/` (`result.json`, `cascade-result.json`).
- Next recipient or routing: `/code_reviewer` (targeted review), then API/E2E reruns BR-002, BR-001, BR-003, BR-004 and BR-006.
- Remaining limitations or risks: the exact BR-002 Team-root trigger (an inspection line growing a selected row) was not reproduced locally; that is covered by the API/E2E rerun.

### IR-004 — Per-host-root closed index and protocol/module docs (SR-009)

- Triggering role, report path, and round: `/architecture_reviewer`, `design-review-report.md` (ARCH-REV-004 Pass on SR-009), implementation round 4.
- Triggering finding IDs: N/A. These are SR-009 design changes (AE-16, AE-17). Non-blocking notes R-5 (map name) and R-6 (module docs) are applied.
- Classification: `Design Revision Implementation` (approved design change; no intended-behavior change).
- Prior authoritative result: IR-003 (`3570b8c10`). `TaskAgentResourceService.closedAgentRunsIn` scanned every loaded Task file on each call, and the area contract `agent_websocket_streaming_protocol.md` did not describe the closure.
- Current authoritative result:
  - `closedAgentRunsIn(hostRoot)` reads a private `closedRunsByHostRootKey` map (host root key, then agent run key, to reference). It is updated only inside the synchronous `swap()`: the swapped Task's previous closed contributions are removed, then its entries with `closedAt !== null` are added.
  - Damaged files never reach `swap()`, so they contribute nothing.
  - Per call, the cost is now proportional to that root's closed runs, not all Tasks' entries.
  - Per R-5, the map is not named `closedByHostRoot`; that is an existing public method.
  - Docs:
    - protocol doc § Team Server Messages: `TASK_EXECUTIONS_CLOSED` (sequenced, idempotent, published before stop) and `TEAM_EXECUTION_VIEW_SNAPSHOT` with the required `closed_task_executions`; the tree stays unfiltered;
    - R-6 notes in `agent_communication.md`, `standalone_agent_run_root.md` and web `agent_orgs.md`.
- Related solution / architecture revision IDs: `SR-009` / `ARCH-REV-004`
- Related code-review / API-E2E / delivery revision IDs: `N/A` for this round (prior: CRR-004 Pass)
- Approved behavior or requirement IDs affected: REQ-004, REQ-005 (Org history list scaling); area contract. Behavior unchanged.
- Changed files or areas:
  - `autobyteus-server-ts/src/projects/services/task-agent-resource-service.ts`;
  - `autobyteus-server-ts/tests/unit/projects/task-agent-resources.test.ts` (new index test);
  - `autobyteus-server-ts/docs/design/agent_websocket_streaming_protocol.md`;
  - `autobyteus-server-ts/docs/modules/{agent_communication,standalone_agent_run_root}.md`;
  - `autobyteus-web/docs/agent_orgs.md`.
  - The uncommitted API/E2E-owned files were not touched.
- Local validation and result:
  - The new index test follows `swap()` through link, DONE, reopen plus a new link, repeated DONE (replaced, not duplicated), a second Task, and restart with a damaged file. At each step the index equals a scan of the committed file.
  - Server `tests/unit/projects`, `agent-collaboration`, `standalone-agent-run-root`, Org inspection, scoped Org history and Team projector: 31 files / 354 tests pass.
  - Server `tsc` is clean.
- Next recipient or routing: `/code_reviewer` (source review; Large/High).
- Remaining limitations or risks: none new. The docs were written by hand and not link-checked.
