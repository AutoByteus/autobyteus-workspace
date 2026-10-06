# API/E2E Test-Case Ledger — task-run-resources-workspace-cleanup

Round 1 (`API-REV-001`). This ledger records in-flight progress; the execution coverage report is authoritative.

| Case ID | Scenario | Surface | Expected | Observed | Evidence |
| --- | --- | --- | --- | --- | --- |
| REPO-001 | Contracts (collab + team) | `pnpm -C <pkg> test` | New tests pass; pre-existing failures unchanged | 13/20 + 7/7; the 7 failures are identical on base | `api-e2e-evidence/REPO-contracts-*` |
| REPO-002 | Server build | prebuild + build | Pass | Pass | `REPO-server-build.log` |
| REPO-003 | Server affected suites | vitest | No new failures | 1103 pass / 7 pre-existing in 3 files | `REPO-server-suites.clean.log` |
| REPO-004 | Web full suite | `test:nuxt --run` | No closure-path failures | 3668 pass / 36 fail in 11 files, all pre-existing (same set as the handoff; `teamTaskApprovalHydration` fails on a missing `recoverableBlock` fixture field) | `REPO-web-full.clean.log` |
| C-07 | Codegen vs hand edit | live built server + graphql-codegen | Closure types identical | Pass (doc comment only) | `C07-*` |
| API-E2E-001a | Agent root real DONE chain (live, snapshot, stored, reopen, files, messages) | New durable server E2E | Pass | Pass (3 full runs) | `API-E2E-001/`, `API-E2E-001-final.log`, `API-E2E-001-rerun.log` |
| API-E2E-001b | Team root, same | same | Pass | Pass | same |
| API-E2E-001c | Org root, same + history item | same | Pass | Pass | same |
| API-E2E-001d | DONE by another Manager while the host root is stopped; Task delete | same | Pass | Pass (in each root case). Restart is covered by BR-005. | same |
| BR-001 | Agent root live DONE in a real browser: rows leave with motion; others stay; open worker conversation → Manager selected (AC-009); focus → run row; Team tab; reopen; Task Team via composer | Full stack + Chrome | Pass | Pass (3 runs) | `browser/journeys/evidence.json`, `agent-*.png` |
| BR-002 | Team root live DONE (same journey) | Full stack + Chrome | Pass | **Fail 4/4: Task A rows vanish without the 200 ms fade/collapse (stale `tree-row-move` overrides the leave transition).** Every other assertion passes. | `browser/journeys/evidence.json` BR-002, `team-*.png` |
| BR-003 | Org root live DONE (same journey) | Full stack + Chrome | Pass | Pass (3 runs) | `org-*.png` |
| BR-004 | Reduced motion (Agent and Team trees) | Full stack + Chrome (`reducedMotion: reduce`) | Instant removal, no fade | Pass (29–35 ms, no fade frames, focus → run row) | `*-reduced-motion-after.png` |
| BR-005 | Reload, then real backend restart + reload: closed rows never render | Full stack + Chrome | Pass | Pass (3 roots × 6 closed IDs, 0 seen; backend PID changed) | `*-reload.png` |
| REG-001 | Durable probes `agent-org-task-team-disclosure`, `task-agent-peer-sidebar`, `nested-team-hierarchy` | Browser probes | Pass | First run: 3 Fail (stale immediate-absence assertions after a collapse; the approved design animates collapse). Updated with `afterLeave`; rerun Pass 5/5, 3/3, 7/7. | `REG-001/` |
| REG-002 | `controlled-org-publication-http` + `scoped-org-history-graphql` E2E | Server E2E | Pass | Pass 1/1, 1/1 | `REG-002-*.log` |

| BR-006 | CR-001: the last task rows under a standalone Agent run leave, then the empty tree goes | Full stack + Chrome | Pass | Pass (234 ms fade, tree mounted until settled, focus → run row) | `agent-last-rows-after.png` |
| BR-007 | SP-3: a stopped Org run expanded from the history list before hydration | Full stack + Chrome | Pass | Pass (0 of 6 closed IDs rendered) | `org-history-first-render.png` |

## Checkpoints

- BR-001: Pass — Agent root live DONE: Task A rows (assigned, delegated, broughtIn) leave with a 200 ms fade, aria-hidden+inert at once; open worker conversation returns to the Manager, run row selected, focus to run row; Team tab keeps messages; reopen+redelegate shows the new run; Task Team + members leave after DONE typed in the composer. Evidence: /Users/normy/autobyteus_org/autobyteus-worktrees/task-run-resources-workspace-cleanup/tickets/in-progress/task-run-resources-workspace-cleanup/api-e2e-evidence/browser/journeys/evidence.json

- BR-001: Fail — [{"message":"A project named 'Prototype Launch BrAgent' already exists.","locations":[{"line":1,"column":38}],"path":["createProject"],"extensions":{"code":"PROJECT_NAME_TAKEN"}}]. Evidence: /Users/normy/autobyteus_org/autobyteus-worktrees/task-run-resources-workspace-cleanup/tickets/in-progress/task-run-resources-workspace-cleanup/api-e2e-evidence/browser/journeys/evidence.json

- BR-001: Pass — Agent root live DONE: Task A rows (assigned, delegated, broughtIn) leave with a 200 ms fade, aria-hidden+inert at once; open worker conversation returns to the Manager, run row selected, focus to run row; Team tab keeps messages; reopen+redelegate shows the new run; Task Team + members leave after DONE typed in the composer. Evidence: /Users/normy/autobyteus_org/autobyteus-worktrees/task-run-resources-workspace-cleanup/tickets/in-progress/task-run-resources-workspace-cleanup/api-e2e-evidence/browser/journeys/evidence.json

- BR-001: Pass — Agent root live DONE: Task A rows (assigned, delegated, broughtIn) leave with a 200 ms fade, aria-hidden+inert at once; open worker conversation returns to the Manager, run row selected, focus to run row; Team tab keeps messages; reopen+redelegate shows the new run; Task Team + members leave after DONE typed in the composer. Evidence: /Users/normy/autobyteus_org/autobyteus-worktrees/task-run-resources-workspace-cleanup/tickets/in-progress/task-run-resources-workspace-cleanup/api-e2e-evidence/browser/journeys/evidence.json

- BR-002: Fail — no visible fade frames. Evidence: /Users/normy/autobyteus_org/autobyteus-worktrees/task-run-resources-workspace-cleanup/tickets/in-progress/task-run-resources-workspace-cleanup/api-e2e-evidence/browser/journeys/evidence.json

- BR-003: Pass — Org root live DONE (same journey; fallback to the delegating Manager). Evidence: /Users/normy/autobyteus_org/autobyteus-worktrees/task-run-resources-workspace-cleanup/tickets/in-progress/task-run-resources-workspace-cleanup/api-e2e-evidence/browser/journeys/evidence.json

- BR-002: Fail — no visible fade frames. Evidence: /Users/normy/autobyteus_org/autobyteus-worktrees/task-run-resources-workspace-cleanup/tickets/in-progress/task-run-resources-workspace-cleanup/api-e2e-evidence/browser/journeys/evidence.json

- BR-002: Fail — no visible fade frames. Evidence: /Users/normy/autobyteus_org/autobyteus-worktrees/task-run-resources-workspace-cleanup/tickets/in-progress/task-run-resources-workspace-cleanup/api-e2e-evidence/browser/journeys/evidence.json

- BR-002: Fail — Task A rows: no visible fade/collapse frames (AC-010). Evidence: /Users/normy/autobyteus_org/autobyteus-worktrees/task-run-resources-workspace-cleanup/tickets/in-progress/task-run-resources-workspace-cleanup/api-e2e-evidence/browser/journeys/evidence.json

- BR-004: Pass — Reduced motion (Agent and Team trees): rows removed without fade; focus to run row. Evidence: /Users/normy/autobyteus_org/autobyteus-worktrees/task-run-resources-workspace-cleanup/tickets/in-progress/task-run-resources-workspace-cleanup/api-e2e-evidence/browser/journeys/evidence.json

- BR-006: Pass — CR-001: the last task rows under a standalone Agent run fade out, the empty tree then disappears, focus to run row. Evidence: /Users/normy/autobyteus_org/autobyteus-worktrees/task-run-resources-workspace-cleanup/tickets/in-progress/task-run-resources-workspace-cleanup/api-e2e-evidence/browser/journeys/evidence.json

- BR-001: Pass — Agent root live DONE: Task A rows (assigned, delegated, broughtIn) leave with a 200 ms fade, aria-hidden+inert at once; open worker conversation returns to the Manager, run row selected, focus to run row; Team tab keeps messages; reopen+redelegate shows the new run; Task Team + members leave after DONE typed in the composer. Evidence: /Users/normy/autobyteus_org/autobyteus-worktrees/task-run-resources-workspace-cleanup/tickets/in-progress/task-run-resources-workspace-cleanup/api-e2e-evidence/browser/journeys/evidence.json

- BR-003: Pass — Org root live DONE (same journey; fallback to the delegating Manager). Evidence: /Users/normy/autobyteus_org/autobyteus-worktrees/task-run-resources-workspace-cleanup/tickets/in-progress/task-run-resources-workspace-cleanup/api-e2e-evidence/browser/journeys/evidence.json

- BR-005: Pass — Reload, then real backend restart + reload: closed rows never render (no flash); open rows render. Evidence: /Users/normy/autobyteus_org/autobyteus-worktrees/task-run-resources-workspace-cleanup/tickets/in-progress/task-run-resources-workspace-cleanup/api-e2e-evidence/browser/journeys/evidence.json

- BR-007: Fail — Org terminate failed. Evidence: /Users/normy/autobyteus_org/autobyteus-worktrees/task-run-resources-workspace-cleanup/tickets/in-progress/task-run-resources-workspace-cleanup/api-e2e-evidence/browser/journeys/evidence.json

- BR-007: Pass — SP-3: stopped Org run expanded from the history list before context hydration renders no closed rows. Evidence: /Users/normy/autobyteus_org/autobyteus-worktrees/task-run-resources-workspace-cleanup/tickets/in-progress/task-run-resources-workspace-cleanup/api-e2e-evidence/browser/journeys/evidence.json

- API-owned errors (not product findings), all retained:
  - API-E2E-001 attempts 1–7 were fixture/probe defects: a worker self-target, the Team manager lookup regex, and camelCase-only node parsing. The product was correct throughout.
  - Browser probe defects:
    - duplicate Project names;
    - two concurrent samplers mixing frames;
    - the BR-007 terminate after the restart had already stopped the root;
    - my wait loop matching itself in `pgrep`.
- The BR-002 motion failure was reproduced 4/4. The class history shows `tree-row-move` attached at the worker click (inspection line 28→50 px) and never removed before DONE.

## Round 2 (API-REV-002, IR-003 `3570b8c10`)

- BR-002: Pass — Team root live DONE (same journey; fallback to the delegating Manager). Evidence: /Users/normy/autobyteus_org/autobyteus-worktrees/task-run-resources-workspace-cleanup/tickets/in-progress/task-run-resources-workspace-cleanup/api-e2e-evidence/browser/journeys/evidence.json

- BR-002M: Pass — Team root live DONE with the leaving rows still carrying tree-row-move at leave start (round-1 failure state). Evidence: /Users/normy/autobyteus_org/autobyteus-worktrees/task-run-resources-workspace-cleanup/tickets/in-progress/task-run-resources-workspace-cleanup/api-e2e-evidence/browser/journeys/evidence.json

- BR-002R1: Pass — Team root live DONE, natural repeat. Evidence: /Users/normy/autobyteus_org/autobyteus-worktrees/task-run-resources-workspace-cleanup/tickets/in-progress/task-run-resources-workspace-cleanup/api-e2e-evidence/browser/journeys/evidence.json

- BR-002R2: Pass — Team root live DONE, natural repeat. Evidence: /Users/normy/autobyteus_org/autobyteus-worktrees/task-run-resources-workspace-cleanup/tickets/in-progress/task-run-resources-workspace-cleanup/api-e2e-evidence/browser/journeys/evidence.json

- BR-001: Pass — Agent root live DONE: Task A rows (assigned, delegated, broughtIn) leave with a 200 ms fade, aria-hidden+inert at once; open worker conversation returns to the Manager, run row selected, focus to run row; Team tab keeps messages; reopen+redelegate shows the new run; Task Team + members leave after DONE typed in the composer. Evidence: /Users/normy/autobyteus_org/autobyteus-worktrees/task-run-resources-workspace-cleanup/tickets/in-progress/task-run-resources-workspace-cleanup/api-e2e-evidence/browser/journeys/evidence.json

- BR-003: Pass — Org root live DONE (same journey; fallback to the delegating Manager). Evidence: /Users/normy/autobyteus_org/autobyteus-worktrees/task-run-resources-workspace-cleanup/tickets/in-progress/task-run-resources-workspace-cleanup/api-e2e-evidence/browser/journeys/evidence.json

- BR-004: Pass — Reduced motion (Agent and Team trees): rows removed without fade; focus to run row. Evidence: /Users/normy/autobyteus_org/autobyteus-worktrees/task-run-resources-workspace-cleanup/tickets/in-progress/task-run-resources-workspace-cleanup/api-e2e-evidence/browser/journeys/evidence.json

- BR-006: Pass — CR-001: the last task rows under a standalone Agent run fade out, the empty tree then disappears, focus to run row. Evidence: /Users/normy/autobyteus_org/autobyteus-worktrees/task-run-resources-workspace-cleanup/tickets/in-progress/task-run-resources-workspace-cleanup/api-e2e-evidence/browser/journeys/evidence.json

- BR-005: Pass — Reload, then real backend restart + reload: closed rows never render (no flash); open rows render. Evidence: /Users/normy/autobyteus_org/autobyteus-worktrees/task-run-resources-workspace-cleanup/tickets/in-progress/task-run-resources-workspace-cleanup/api-e2e-evidence/browser/journeys/evidence.json

- BR-007: Pass — SP-3: stopped Org run expanded from the history list before context hydration renders no closed rows. Evidence: /Users/normy/autobyteus_org/autobyteus-worktrees/task-run-resources-workspace-cleanup/tickets/in-progress/task-run-resources-workspace-cleanup/api-e2e-evidence/browser/journeys/evidence.json

- BR-001: Pass — Agent root live DONE: rows fade, fallback to the run row, focus, Team tab, reopen, Task Team via composer. Evidence: /Users/normy/autobyteus_org/autobyteus-worktrees/task-run-resources-workspace-cleanup/tickets/in-progress/task-run-resources-workspace-cleanup/api-e2e-evidence/round2/task-closure-tree-probe/evidence.json

- BR-002: Pass — Agent Team root live DONE (same journey; fallback to the delegating Manager). Evidence: /Users/normy/autobyteus_org/autobyteus-worktrees/task-run-resources-workspace-cleanup/tickets/in-progress/task-run-resources-workspace-cleanup/api-e2e-evidence/round2/task-closure-tree-probe/evidence.json

- BR-003: Fail — Agent Org root live DONE (same journey; fallback to the delegating Manager) (locator.click: Timeout 30000ms exceeded.
Call log:
  - waiting for locator('[data-test="right-side-tab-list"]').getByText('Team', { exact: true })
). Evidence: /Users/normy/autobyteus_org/autobyteus-worktrees/task-run-resources-workspace-cleanup/tickets/in-progress/task-run-resources-workspace-cleanup/api-e2e-evidence/round2/task-closure-tree-probe/evidence.json

- BR-004: Pass — Reduced motion (Agent and Team trees): removed at once; focus to the run row. Evidence: /Users/normy/autobyteus_org/autobyteus-worktrees/task-run-resources-workspace-cleanup/tickets/in-progress/task-run-resources-workspace-cleanup/api-e2e-evidence/round2/task-closure-tree-probe/evidence.json

- BR-005: Fail — Reload, then real backend restart + reload: closed rows never render (BR-005 needs BR-001..BR-003 in the same run). Evidence: /Users/normy/autobyteus_org/autobyteus-worktrees/task-run-resources-workspace-cleanup/tickets/in-progress/task-run-resources-workspace-cleanup/api-e2e-evidence/round2/task-closure-tree-probe/evidence.json

- BR-006: Pass — CR-001: the last task rows under an Agent run fade; the empty tree then disappears. Evidence: /Users/normy/autobyteus_org/autobyteus-worktrees/task-run-resources-workspace-cleanup/tickets/in-progress/task-run-resources-workspace-cleanup/api-e2e-evidence/round2/task-closure-tree-probe/evidence.json

- BR-007: Fail — SP-3: stopped Org run expanded from history before hydration renders no closed rows (BR-007 needs BR-003 in the same run). Evidence: /Users/normy/autobyteus_org/autobyteus-worktrees/task-run-resources-workspace-cleanup/tickets/in-progress/task-run-resources-workspace-cleanup/api-e2e-evidence/round2/task-closure-tree-probe/evidence.json

- Durable probe attempt 1: BR-003 failed on a probe selector defect (the Org root tab is "Org", not "Team"; the message was shown, see org-live-after.png). BR-005 and BR-007 depend on BR-003. Fixed the selector; rerunning.

- BR-001: Pass — Agent root live DONE: rows fade, fallback to the run row, focus, Team tab, reopen, Task Team via composer. Evidence: /Users/normy/autobyteus_org/autobyteus-worktrees/task-run-resources-workspace-cleanup/tickets/in-progress/task-run-resources-workspace-cleanup/api-e2e-evidence/round2/task-closure-tree-probe/evidence.json

- BR-002: Pass — Agent Team root live DONE (same journey; fallback to the delegating Manager). Evidence: /Users/normy/autobyteus_org/autobyteus-worktrees/task-run-resources-workspace-cleanup/tickets/in-progress/task-run-resources-workspace-cleanup/api-e2e-evidence/round2/task-closure-tree-probe/evidence.json

- BR-003: Pass — Agent Org root live DONE (same journey; fallback to the delegating Manager). Evidence: /Users/normy/autobyteus_org/autobyteus-worktrees/task-run-resources-workspace-cleanup/tickets/in-progress/task-run-resources-workspace-cleanup/api-e2e-evidence/round2/task-closure-tree-probe/evidence.json

- BR-004: Pass — Reduced motion (Agent and Team trees): removed at once; focus to the run row. Evidence: /Users/normy/autobyteus_org/autobyteus-worktrees/task-run-resources-workspace-cleanup/tickets/in-progress/task-run-resources-workspace-cleanup/api-e2e-evidence/round2/task-closure-tree-probe/evidence.json

- BR-005: Pass — Reload, then real backend restart + reload: closed rows never render. Evidence: /Users/normy/autobyteus_org/autobyteus-worktrees/task-run-resources-workspace-cleanup/tickets/in-progress/task-run-resources-workspace-cleanup/api-e2e-evidence/round2/task-closure-tree-probe/evidence.json

- BR-006: Pass — CR-001: the last task rows under an Agent run fade; the empty tree then disappears. Evidence: /Users/normy/autobyteus_org/autobyteus-worktrees/task-run-resources-workspace-cleanup/tickets/in-progress/task-run-resources-workspace-cleanup/api-e2e-evidence/round2/task-closure-tree-probe/evidence.json

- BR-007: Pass — SP-3: stopped Org run expanded from history before hydration renders no closed rows. Evidence: /Users/normy/autobyteus_org/autobyteus-worktrees/task-run-resources-workspace-cleanup/tickets/in-progress/task-run-resources-workspace-cleanup/api-e2e-evidence/round2/task-closure-tree-probe/evidence.json

## Round 3 (API-REV-003, HEAD `50b08001d`: IR-003 CSS + IR-004 closed index)

- BR-001: Pass — Agent root live DONE: rows fade, fallback to the run row, focus, Team tab, reopen, Task Team via composer. Evidence: /Users/normy/autobyteus_org/autobyteus-worktrees/task-run-resources-workspace-cleanup/tickets/in-progress/task-run-resources-workspace-cleanup/api-e2e-evidence/round3/task-closure-tree-probe/evidence.json

- BR-002: Pass — Agent Team root live DONE (same journey; fallback to the delegating Manager). Evidence: /Users/normy/autobyteus_org/autobyteus-worktrees/task-run-resources-workspace-cleanup/tickets/in-progress/task-run-resources-workspace-cleanup/api-e2e-evidence/round3/task-closure-tree-probe/evidence.json

- BR-003: Pass — Agent Org root live DONE (same journey; fallback to the delegating Manager). Evidence: /Users/normy/autobyteus_org/autobyteus-worktrees/task-run-resources-workspace-cleanup/tickets/in-progress/task-run-resources-workspace-cleanup/api-e2e-evidence/round3/task-closure-tree-probe/evidence.json

- BR-004: Pass — Reduced motion (Agent and Team trees): removed at once; focus to the run row. Evidence: /Users/normy/autobyteus_org/autobyteus-worktrees/task-run-resources-workspace-cleanup/tickets/in-progress/task-run-resources-workspace-cleanup/api-e2e-evidence/round3/task-closure-tree-probe/evidence.json

- BR-005: Pass — Reload, then real backend restart + reload: closed rows never render. Evidence: /Users/normy/autobyteus_org/autobyteus-worktrees/task-run-resources-workspace-cleanup/tickets/in-progress/task-run-resources-workspace-cleanup/api-e2e-evidence/round3/task-closure-tree-probe/evidence.json

- BR-006: Pass — CR-001: the last task rows under an Agent run fade; the empty tree then disappears. Evidence: /Users/normy/autobyteus_org/autobyteus-worktrees/task-run-resources-workspace-cleanup/tickets/in-progress/task-run-resources-workspace-cleanup/api-e2e-evidence/round3/task-closure-tree-probe/evidence.json

- BR-007: Pass — SP-3: stopped Org run expanded from history before hydration renders no closed rows. Evidence: /Users/normy/autobyteus_org/autobyteus-worktrees/task-run-resources-workspace-cleanup/tickets/in-progress/task-run-resources-workspace-cleanup/api-e2e-evidence/round3/task-closure-tree-probe/evidence.json

### Round 2 / 3 reconciliation

| Case ID | Round 2 (IR-003 `3570b8c10`) | Round 3 (IR-004 `50b08001d`, authoritative) | Evidence |
| --- | --- | --- | --- |
| REPO web affected | 32 files / 281 tests Pass | Web source unchanged since round 2 (IR-004 touched web docs only) | `round2/REPO-web-affected.log` |
| REPO server build + suites | — | Build Pass; 1104 pass / 7 pre-existing in the same 3 files | `round3/REPO-server-*.log` |
| API-E2E-001 (durable, extended with repeated DONE) | 3/3 Pass | 3/3 Pass. The repeated DONE re-publishes the old Task A runs plus the redelegated run; stored = 5 refs after Task delete. | `round3/API-E2E-001*` |
| BR-002 (Team) | Pass ×4 (temporary journeys: natural, R1, R2, forced stale move), durable probe Pass | Durable probe Pass with `tree-row-move` on all leaving rows at leave start: 211 ms, 9 fade frames | `round2/…`, `round3/task-closure-tree-probe/` |
| BR-001, 003, 004, 006 | Pass | Pass (234/224 ms fade; reduced motion 33/34 ms; last rows 233 ms) | same |
| BR-005, BR-007 | Pass | Pass (restart PID 34552→36880; 0/6 closed IDs ever rendered; Org history item closure from the index) | same |
| REG-001 durable web probes | 5/5, 3/3, 7/7 Pass | Web source unchanged since round 2 | `round2/REG-001/` |
| Durable probe attempt 1 (round 2) | Probe selector defect (Org tab label "Org"); fixed | — | `round2/task-closure-tree-probe-attempt1/` |

No case is in flight. All owned processes and data roots are removed.
