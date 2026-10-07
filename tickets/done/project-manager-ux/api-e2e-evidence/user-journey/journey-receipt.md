# USER-JOURNEY receipt: real user, real model, isolated desktop build (round 2, commit `8ef467696`)

- **Build:** `pnpm -C autobyteus-web build:electron:mac` passed (exit 0; all guards, incl. `audit:localization-literals` "zero unresolved findings").
  - Output: `electron-dist/mac-arm64/AutoByteus.app` (1.4.96-beta.1).
  - Log: `../r2/r2-electron-build.log`.
- **Instance:** `pnpm isolated-app start --from-worktree` → `iso-53469-f4cb`, control 53469, server 53470, private data root (`iso-start.json`).
  - An unrelated stopped record from another worktree (`iso-52489-3b32`) was left untouched.
- **Control:** attach-only CDP (`ui-cdp-helper.mjs`); the browser-automation launcher is absent on this machine. The helper never closes the app.
- **Setup through the UI:**
  - Settings → Agent Packages → import `test-agent-package/` (Launch Manager with Project tools; Copy Writer; Help Review Team);
  - Settings → Server Settings → Basics → Projects toggle (the first click did not register, see note);
  - Agents → Launch Manager → Run → model picker → Claude Agent SDK `claude-opus-5-5` (recommended).
- **Actions:** every action was a user action (chat messages, nav clicks, row/root clicks, left-panel terminate/delete with confirmation). The agents decided every tool call.

| # | User action | Observed in the app | AC | Shot |
| --- | --- | --- | --- | --- |
| 1 | Chat: "set up a Project … with two Tasks … don't delegate" → open Projects | Project card appeared live ~5 s after sending (no Refresh); then "2 open tasks" live | AC-001/002, SCN-002 | 01, 02 |
| 2 | Open the board | Both Tasks in To Do, no worker line | AC-009 | 03 |
| 3 | Left panel kept the Manager run on the board; click that (selected) run row | Opened `/chat?id=launch_manager_…` | AC-012, AC-013 | — |
| 4 | Chat: hand the Tasks to the Copy Writer and the Help Review Team → back to the board | Roots appeared live: "copy writer Running", "help review team Running" for ~8 s (real model), then Idle; both openable | AC-005, REQ-004 (real-provider status) | 04 |
| 5 | Click "Open copy writer" | Writer conversation in the Manager's run; writer row selected | AC-010 | 05 |
| 6 | Click "Open help review team" | Coordinator "help reviewer" selected; team expanded | AC-011 | 06 |
| 7 | Chat: release notes accepted, mark done → board | Row moved to Done (moved highlight); root Offline, `data-openable=false`, a `div` | AC-003, AC-008 | 07 |
| 8 | Chat: "one more round … same writer" → board | Done → In Progress (moved), root still Offline and not openable → then openable (briefly Offline while restoring) → Idle; writer row back in the left panel | AC-023 | 08, 09, 09b |
| 9 | Chat: review accepted → open the review Task page | Done; root Offline, not openable; no help line. The Manager finished before the page loaded, so this is the end state, not the in-place update (AC-004 in place is covered by PMU/FEED) | AC-008 | 10 |
| 10 | Chat: a one-off tweet | The Manager chose `send_message_to` (a collaborator) → no Temp task: the agent's choice, correct behavior | — | — |
| 11 | Chat: a one-off LinkedIn post "with delegate_task" → Projects page | "Temp tasks" button went from no pill to "1 open" ~3 s after sending | AC-016, AC-019 | 11 |
| 12 | Open the Temp tasks board, then the Task | Row in Open with "copy writer Idle" (openable). Read-only page: Open badge, Description, Assigned to, "Only agents change this Task."; no inputs; only the "Open copy writer" button | AC-017, AC-018 | 12, 13 |
| 13 | Left panel: terminate the chat, then Delete run permanently, then confirm "Delete" (Temp board open) | The Temp task left the board ~1 s later, staying on `/projects/temp-tasks`; the pill disappeared | AC-021 | 14 |
| 14 | Project board after the chat deletion | Both Project Tasks kept (In Progress / Done); roots Offline, not openable (host deleted) | AR-002 / P-004 | 15 |

- **Persisted:** `recipientAddress` `/copy_writer` and `/help_review_team` on the assignments (`final-state/`).
- **Cleanup:** `isolated-app stop iso-53469-f4cb` → `wasRunning: true`, `forced: false`, data root removed, both ports released.
- **Note (non-blocking):** the first click on the Projects toggle in Server Settings did not change it (`aria-checked` stayed false). A second click toggled it at once. The first click came right after the page opened, so this is most likely a click before the setting's state had loaded. It is outside this change's scope and is recorded only.
