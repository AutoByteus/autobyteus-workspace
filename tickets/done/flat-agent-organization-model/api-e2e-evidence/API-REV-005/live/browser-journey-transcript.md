# API-REV-005 real browser journey transcript

## LIVE-001 — UI package import

- Browser: AutoByteus persistent `open_tab`, tab 6, production static renderer.
- Backend: owned isolated built server at `http://127.0.0.1:8467`.
- Setup correction: the initial static artifact was compiled for the default port
  8000. It was rebuilt using the repository's documented `BACKEND_*` build
  variables for port 8467; runtime requests then targeted only 8467.
- Settings > Agent Packages accepted the exact local fixture path and rendered
  `Agent package imported.`
- Package row: Shared Agents 4, Team-local Agents 0, Teams 2.
- Agent Orgs page rendered exactly `AORG E2E Direct Agents Org` and
  `AORG E2E Mixed Org`.
- Direct GraphQL catalog corroborated four Agents, two Teams, two Orgs and
  explicit submit/review task tools.
- Result: Pass.

## LIVE-002 — fresh standalone Team and selected task monitor

- Ran `AORG E2E Research Squad` in a new temporary workspace using
  `codex_app_server`, `gpt-5.6-sol`, reasoning `low`, auto-approve enabled.
- Fresh Team workspace initially rendered all stable members Offline and zero
  tasks. Sending the first prompt to `/lead` lazily activated the Team and
  produced `APIREV5-LEAD-FRESH-START` without manual restoration.
- `/lead` delegated exactly once to `/analyst`, returning task
  `task_67c02e48943849ffac37231cc7e2bf63` and fresh task AgentRun
  `aorg_e2e_analyst_875c5eba2b4442a5b161af199d41943a`.
- The task delivered two ordinary messages and submitted
  `APIREV5-TASK-SUBMISSION-V1`; the task panel showed one `Awaiting review`
  row, exact `/lead -> /analyst`, and Result 1.
- Expanded the stable `/analyst` row, exposing its one level-2 transient task
  Agent row. Its accessible state was `Awaiting review · Idle`, distinct from
  stable `/analyst`. Selected that exact task Agent.
- The selected task workspace hydrated the retained system/task prompt,
  `send_message_to` calls, first submission, dual lifecycle/execution status,
  exact task description and address.
- Without reload or refocus, sent later work directly to the selected task
  Agent. `APIREV5-TASK-LIVE-UPDATE` appeared while `aria-selected=true` and the
  task remained awaiting review.
- Selected `/lead` only to initiate formal `request_revision`, then immediately
  reselected the same task Agent before its revised work. The selected task
  changed to `Awaiting review · Running`, streamed the revision prompt and
  second `submit_task_result`, then returned to `Awaiting review · Idle` with
  `APIREV5-TASK-SUBMISSION-V2`. The task panel simultaneously showed Result 1,
  Revision requested, and Revised result Result 2.
- Durable execution-tree `startedAt` precedes the first provider trace by 5 ms;
  exact ordering is retained in `activation-before-events.md`.
- Result so far: task activation, exact selection, retained hydration, live
  updates, revision and resubmission Pass. Settlement/fallback continues in
  LIVE-003.

## LIVE-003 — task settlement fallback and true-empty boundary

- With the transient task Agent reselected, `/lead` accepted exact Result 2 using
  `review_task_result` and comment `APIREV5-ACCEPTED`.
- The transient task row disappeared after settlement and focus fell back to the
  valid stable `/lead` row; no dead task Agent remained selected.
- Task panel retained one authoritative task with `Accepted`, both submissions,
  revision, and exact accepted Result 2.
- Durable tree retained the exact task execution identity with non-null
  `settledAt`; durable task record status is `accepted` with the acceptance
  linked to Result 2.
- True-empty handling remains directly exercised by the current production
  `TeamWorkspaceSurface` Chromium fixture in REPO-004 and the current renderer
  unit cohort in REPO-003. A real Codex task necessarily has system/task input
  before it can be selected, so fabricating a live empty provider transcript
  would not be a realistic supported journey.
- Result: Pass.

## LIVE-004 — mixed Org and mounted Team task (Fail)

- Fresh mixed Org opened in approved no-focus state; direct concierge and two
  flat mounted Teams were visible with Team-level status indicators.
- `/concierge` sent exact ordinary message
  `APIREV5-ORG-MESSAGE-TO-RESEARCH-LEAD` to `/research-team/lead`; the mounted
  Team status changed Running then Idle, and focusing it rendered the exact
  received message.
- `/research-team/lead` delegated exact task to `/research-team/analyst`; the
  mounted task AgentRun sent `APIREV5-MOUNTED-TASK-MESSAGE` to `/concierge`,
  submitted V1, received a formal revision, and submitted V2. `/lead` then
  accepted exact Result 2. The durable sidecar contains the complete correct
  lifecycle and exact contextual address.
- Failure: while `research team` stayed selected, the Team task panel did not
  advance from In progress after V1/revision/V2. A focus-away/back retained
  hydration corrected it to Awaiting review with all updates. After acceptance,
  the task row disappeared but the still-selected Team panel remained Awaiting
  review rather than Accepted until another refocus.
- Result: Fail — API-FIND-015. Cumulative execution stops; later planned live
  cases remain Not Tested, while material prior/API-REV-005 passes are retained.
