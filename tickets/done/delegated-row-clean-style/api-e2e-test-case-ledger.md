# API/E2E Test-Case Ledger — delegated-row-clean-style

Round: 1 (`API-REV-001`). Holds in-flight continuity only; the execution coverage report is authoritative.

| Case ID | Scenario | Surface | Expected | Observed | Evidence |
| --- | --- | --- | --- | --- | --- |
| REPO-001 | Changed-component and history tests | `pnpm -C autobyteus-web test:nuxt components/workspace/history --run` | Pass | Pass (11 files, 154 tests) | `api-e2e-evidence/history-tests.log` |
| REPO-002 | Full web components regression | `pnpm -C autobyteus-web test:nuxt components --run` | No new failures linked to the change | 9 files / 16 tests fail, all unrelated (identical set to the implementation report) | `api-e2e-evidence/components-tests.log` |
| E2E-001 | Agent root rows: rest/hover/keyboard focus, bolt Team, avatars, selection, Enter/Space/click, collapse | Temporary browser probe | Pass | Pass (attempt 4) | `api-e2e-evidence/browser/evidence.json` |
| E2E-002 | Agent root at 390×844 | Temporary browser probe | Pass | Pass | same |
| E2E-003 | Team root rows + selected parity with member row | Temporary browser probe | Pass | Pass (attempt 4) | same |
| E2E-004 | Org root task rows: style, focus ring, bolt, interaction | Temporary browser probe | Pass | Pass | same |
| E2E-005 | Org root at 390×844 | Temporary browser probe | Pass | Pass | same |
| E2E-006 | Branch-line geometry incl. delegated rows | `pnpm -C autobyteus-web test:e2e:nested-team-hierarchy` | Pass | Pass (NTHUI-BR-001..005) | `api-e2e-evidence/nested-team-hierarchy/` |
| E2E-007 | Team-root peer journey regression | `node tests/e2e/task-agent-peer-sidebar-probe.mjs` | Pass | Pass (PEER-001..003) | `api-e2e-evidence/task-agent-peer-sidebar/` |
| E2E-008 | Org task-Team disclosure regression | `pnpm -C autobyteus-web test:e2e:agent-org-task-team-disclosure` | Pass | Pass (API-TTRC-B01..B07) | `api-e2e-evidence/agent-org-task-team-disclosure/` |

## Checkpoints

- E2E-001: Fail — agent-root row Temporary task agent, computer use agent, level 1, idle, Started by research assistant, /computer_use_agent: row has a border. Evidence: /Users/normy/autobyteus_org/autobyteus-worktrees/delegated-row-clean-style/tickets/in-progress/delegated-row-clean-style/api-e2e-evidence/browser/evidence.json

- E2E-002: Fail — narrow agent-root Temporary task agent, computer use agent, level 1, idle, Started by research assistant, /computer_use_agent: row has a border. Evidence: /Users/normy/autobyteus_org/autobyteus-worktrees/delegated-row-clean-style/tickets/in-progress/delegated-row-clean-style/api-e2e-evidence/browser/evidence.json

- E2E-003: Fail — team-root row Temporary task agent, Worker, level 1, offline, Started by Reviewer, /Worker: row has a border. Evidence: /Users/normy/autobyteus_org/autobyteus-worktrees/delegated-row-clean-style/tickets/in-progress/delegated-row-clean-style/api-e2e-evidence/browser/evidence.json

- E2E-004: Fail — org row agent-org-task-team-row-ssg-task-1: row has a border. Evidence: /Users/normy/autobyteus_org/autobyteus-worktrees/delegated-row-clean-style/tickets/in-progress/delegated-row-clean-style/api-e2e-evidence/browser/evidence.json

- E2E-005: Fail — narrow org StudentStudyGroup, Started by Teacher, /StudentStudyGroup, ssg-task-1: row has a border. Evidence: /Users/normy/autobyteus_org/autobyteus-worktrees/delegated-row-clean-style/tickets/in-progress/delegated-row-clean-style/api-e2e-evidence/browser/evidence.json

- Attempt 1 (E2E-001..005) is void: a probe defect. The assertion expected `border-style: none`, but Tailwind preflight sets `solid` with 0px width. Measured border widths were 0px on every row. Evidence was moved to `api-e2e-evidence/browser-attempt1-probe-defect/`. Rerunning.

- E2E-001: Fail — agent-root row Temporary task agent, computer use agent, level 1, idle, Started by research assistant, /computer_use_agent: focus shows a browser outline. Evidence: /Users/normy/autobyteus_org/autobyteus-worktrees/delegated-row-clean-style/tickets/in-progress/delegated-row-clean-style/api-e2e-evidence/browser/evidence.json

- E2E-002: Pass — Agent root at 390x844 (VIS-008): rows fit, names truncate, style unchanged. Evidence: /Users/normy/autobyteus_org/autobyteus-worktrees/delegated-row-clean-style/tickets/in-progress/delegated-row-clean-style/api-e2e-evidence/browser/evidence.json

- E2E-003: Fail — team-root row Temporary task agent, Worker, level 1, offline, Started by Reviewer, /Worker: focus shows a browser outline. Evidence: /Users/normy/autobyteus_org/autobyteus-worktrees/delegated-row-clean-style/tickets/in-progress/delegated-row-clean-style/api-e2e-evidence/browser/evidence.json

- E2E-004: Fail — org row agent-org-task-team-row-ssg-task-1: focus shows a browser outline. Evidence: /Users/normy/autobyteus_org/autobyteus-worktrees/delegated-row-clean-style/tickets/in-progress/delegated-row-clean-style/api-e2e-evidence/browser/evidence.json

- E2E-005: Pass — Org root at 390x844 (VIS-008): delegated rows do not overflow the page; names truncate. Evidence: /Users/normy/autobyteus_org/autobyteus-worktrees/delegated-row-clean-style/tickets/in-progress/delegated-row-clean-style/api-e2e-evidence/browser/evidence.json

- Attempt 2 is void: a probe defect. The outline assertion expected `none`, but Tailwind 3 `outline-none` compiles to `2px solid transparent`. The ring was measured correctly (`rgb(99, 102, 241) 0px 0px 0px 2px`, `:focus-visible`). E2E-002 and E2E-005 passed. Evidence was moved to `api-e2e-evidence/browser-attempt2-probe-defect/`. Rerunning.

- E2E-001: Fail — agent-root selected task agent: selected style differs from member selection. Evidence: /Users/normy/autobyteus_org/autobyteus-worktrees/delegated-row-clean-style/tickets/in-progress/delegated-row-clean-style/api-e2e-evidence/browser/evidence.json

- E2E-002: Pass — Agent root at 390x844 (VIS-008): rows fit, names truncate, style unchanged. Evidence: /Users/normy/autobyteus_org/autobyteus-worktrees/delegated-row-clean-style/tickets/in-progress/delegated-row-clean-style/api-e2e-evidence/browser/evidence.json

- E2E-003: Fail — team-root selected delegated row: selected style differs from member selection. Evidence: /Users/normy/autobyteus_org/autobyteus-worktrees/delegated-row-clean-style/tickets/in-progress/delegated-row-clean-style/api-e2e-evidence/browser/evidence.json

- E2E-004: Pass — Org root (WorkspaceAgentOrgHistoryCollection): task Agent and task Team rows flat, hover/focus ring, slate bolt + semibold, click/Enter/Space. Evidence: /Users/normy/autobyteus_org/autobyteus-worktrees/delegated-row-clean-style/tickets/in-progress/delegated-row-clean-style/api-e2e-evidence/browser/evidence.json

- E2E-005: Pass — Org root at 390x844 (VIS-008): delegated rows do not overflow the page; names truncate. Evidence: /Users/normy/autobyteus_org/autobyteus-worktrees/delegated-row-clean-style/tickets/in-progress/delegated-row-clean-style/api-e2e-evidence/browser/evidence.json

- Attempt 3: E2E-002, E2E-004 and E2E-005 passed. E2E-001 and E2E-003 hit a probe timing defect: selection was measured during the 150 ms `transition-colors` (mid-transition color `rgb(58, 55, 125)`, background alpha 0.92; inset bar and square corners already correct). Added a 400 ms settle and a selected+focused parity check against a member row. Evidence: `api-e2e-evidence/browser-attempt3-probe-defect/`. Rerunning.

- E2E-001: Pass — Agent root (AgentRunTaskRows): delegated Agent, Team and Team-member rows render flat; hover, keyboard focus, Team bolt, Agent avatar, selection, Enter/Space/click, collapse. Evidence: /Users/normy/autobyteus_org/autobyteus-worktrees/delegated-row-clean-style/tickets/in-progress/delegated-row-clean-style/api-e2e-evidence/browser/evidence.json

- E2E-002: Pass — Agent root at 390x844 (VIS-008): rows fit, names truncate, style unchanged. Evidence: /Users/normy/autobyteus_org/autobyteus-worktrees/delegated-row-clean-style/tickets/in-progress/delegated-row-clean-style/api-e2e-evidence/browser/evidence.json

- E2E-003: Pass — Team root (WorkspaceTeamExecutionTree): delegated rows flat, hover/focus, bolt Team, selection identical to a member row. Evidence: /Users/normy/autobyteus_org/autobyteus-worktrees/delegated-row-clean-style/tickets/in-progress/delegated-row-clean-style/api-e2e-evidence/browser/evidence.json

- E2E-004: Pass — Org root (WorkspaceAgentOrgHistoryCollection): task Agent and task Team rows flat, hover/focus ring, slate bolt + semibold, click/Enter/Space. Evidence: /Users/normy/autobyteus_org/autobyteus-worktrees/delegated-row-clean-style/tickets/in-progress/delegated-row-clean-style/api-e2e-evidence/browser/evidence.json

- E2E-005: Pass — Org root at 390x844 (VIS-008): delegated rows do not overflow the page; names truncate. Evidence: /Users/normy/autobyteus_org/autobyteus-worktrees/delegated-row-clean-style/tickets/in-progress/delegated-row-clean-style/api-e2e-evidence/browser/evidence.json

- E2E-006, E2E-007 and E2E-008: Pass, run sequentially with clean cleanup receipts (owned Nuxt terminated, fixtures removed). Evidence is in `api-e2e-evidence/{nested-team-hierarchy,task-agent-peer-sidebar,agent-org-task-team-disclosure}/`.
- Final: every case passed. No temporary pages or Nuxt processes remain; `git status` shows only the untracked ticket folder.
