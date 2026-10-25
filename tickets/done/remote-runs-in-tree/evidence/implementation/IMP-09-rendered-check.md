# IMP-09 Rendered check: remote runs in alpha's run tree (standalone root)

- Check: IMP-09 (implementation self-validation of the rendered frontend, not API/E2E sign-off)
- Date: 2026-10-23
- Commits: server and contracts as built at 188dc4b3ae (`pnpm -C autobyteus-server-ts build`); web source 188dc4b3ae plus the Retry fix committed with this evidence (IMP-09 found it).
- Environment: a test-owned two-node stack (`IMP-09-stack.mjs.txt`, run with `env -i PATH HOME=<temp> TMPDIR`):
  - alpha and beta are `node dist/app.js` with temp data roots, HOMEs and free ports (63522, 63523);
  - the runtime is the scripted AGY CLI (`tests/fixtures/agy-failure-cli.mjs`, `linked_skills`);
  - remote collaboration is on for both, and each node registers the other (alpha names beta "docker");
  - beta has the shared Agent "Publisher" and the shared Team "Studio Team" (lead = Publisher, checker);
  - alpha's standalone "Manager" delegated `/publisher` and `/studio_team` to "docker" through the real `delegate_task` tool.
  - The Nuxt dev server ran with `BACKEND_NODE_BASE_URL=http://127.0.0.1:63522 npx nuxt dev --port 3278`; the browser tab was ~810–850 CSS px wide (the narrow layout, so the right panel opens as an overlay).
  - All processes were stopped afterwards; nothing touched the user's AutoByteus or `~/.autobyteus` data.
- Limitation: the browser tool's screenshots sometimes lagged the DOM (a stale frame). Each state below was read from the DOM (`aria-label`, `data-test`, text), and screenshots are attached only where they matched the DOM.

## Observed states

| # | Step | Observed (DOM) | Screenshot |
| --- | --- | --- | --- |
| 1 | Expand alpha's workspace › Manager | Two rows under the Manager run, in delegation order: `Temporary task agent, publisher, level 1, offline, Started by manager, /publisher, on docker, Task: Draft the October newsletter for the product launch` and `Temporary task team, studio team, level 1, … on docker, Task: Plan the October campaign across channels`; each has a `docker` chip between status dot and identity | `IMP-09-a-remote-rows-in-tree.png` |
| 2 | Open the Manager run (stream attaches, summaries fetched) | remote runs store: both runs `reachable: true` with beta's titles; both offline (beta had idled them out: beta's history `isActive:false`) | — |
| 3 | Open the publisher row | Header `publisher` + `docker` chip + `Offline`; no ⚙ or ＋; conversation read from beta (task message, `OK`); composer placeholder `Message publisher on docker…`, no Context Files area | — |
| 4 | Send "Please add a section on pricing" from alpha's composer | Beta restores the run; the user message and the reply `OK` stream into alpha's view; header and row go `Idle` with a Stop button (`Stop publisher`) | `IMP-09-b-owner-message-live-reply.png` |
| 5 | Right panel › Files | `remote-panel-note-files`: "On docker / The files of this run are on docker. Open it in that node's window to see them." | `IMP-09-c-files-panel-note.png` |
| 6 | Expand studio team, open `lead` | Members `lead`, `checker` (level 2, no chip of their own); lead's header `lead` + `docker` + `Offline`; conversation from beta; placeholder `Message lead on docker…` | `IMP-09-d-remote-team-member-view.png` |
| 7 | Row Stop on publisher | Beta's run `isActive:false`; the row `offline` and its Stop button gone | — |
| 8 | Stop beta's process, reload, open the Manager run and the publisher | Both rows: `Couldn't reach docker.` + `Retry` (`role="alert"`); the opened view: `docker isn't reachable / This run's conversation can't be loaded right now. Your other runs work. Retry when the node is back.` + Retry | `IMP-09-e-unreachable-notice-and-rows.png` |
| 9 | Restart beta (same port and data), Retry in the notice | **Defect found:** the notice cleared and the rows recovered, but the conversation stayed empty. With a live stream, Retry only asked the nodes for summaries, so the failed conversation read never ran again. | — |
| 10 | After the fix (Retry also reads the selected remote child again), repeat 8–9 | Notice gone; the conversation shows again (`Please add a section on pricing` present); both rows without the error line | — |

## Fix

- `autobyteus-web/stores/agentRunCollaborationStore.ts` and `autobyteus-web/stores/agentOrgContextsStore.ts`: `retryRemote` asks the live stream for summaries and also reads the selected remote child again.
- The Team path is not affected: a failed member read rejects the selection, so selecting the member again reads it.
- Regression test: `autobyteus-web/stores/__tests__/agentRunCollaborationRemoteRetry.spec.ts`. It fails without the fix (`AssertionError: expected false to be true`) and passes with it.

## Not exercised here

Team and Org roots with remote runs were not rendered in this stack. Their rows, contexts and Retry are covered by unit specs (`teamExecutionRemoteRuns.spec.ts`, `agentOrgHistoryRemoteRows.spec.ts`). The two-server E2E and the browser probe belong to API/E2E.
