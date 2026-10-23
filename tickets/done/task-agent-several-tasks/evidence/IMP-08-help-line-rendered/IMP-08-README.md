# IMP-08 — "Assigned to" help line rendered on a real stack (AC-011)

- Command: `node autobyteus-web/tests/e2e/tmp-imp08-help-line-probe.mjs --output-dir /tmp/task-several-ir3/imp08 --cases IMP-08`. The probe is a temporary copy of `project-manager-ux-probe.mjs` plus the case in `IMP-08-case-source.mjs.txt`; the copy was deleted after the run.
- Commit tested: `1fa3a1d87e`. The server was built with `pnpm -C autobyteus-server-ts prebuild && build` on the same commit.
- Environment: macOS 26.5.2, Node v22.23.1, headless Chrome 156.0.8078.47. The probe uses its own temporary data root (removed), free ports, a Nuxt dev frontend, the built backend, and the AGY runtime with the scripted CLI `agy-failure-cli.mjs`. No user data and no installed app were used.
- Date: 2026-10-23 15:57 CEST
- Result: **Pass**. In `IMP-08-evidence.json`: `result: "Pass"`, `failures: []`, `cleanup.dataRootRemoved: true`.

## Steps and what to look for

1. A Manager Agent run delegates Task A to a new copy of the worker. It then gives Task B to the same copy with `delegate_task` `target_agent_run_id` while A is open. Both roots name the same `ingressAgentRunId`, and neither is closed (`details.a`, `details.b`).
2. Each Task page is opened in en-US and zh-CN, at 1440×1000 and 390×844. `details.pages.*.text` is "This agent or team stops when its last open Task is Done or Cancelled." / "这个智能体或团队会在它最后一个未完成的任务完成或取消后停止。" on both Task pages.
   - The style is 12 px / 20 px, color slate-400 `rgb(148, 163, 184)`, the same as before.
   - At 1440 the line is one line (926×20). At 390 it wraps to two lines (266×40).
   - `clipped: false` everywhere.
3. Task B is set to DONE. B's page shows the root muted Offline and no help line (`bClosedHelpShown: 0`). A's root stays open, and A's page still shows the help line (`pages.en-after-B-done-A`).

## Screenshots

- `IMP-08-en-US-1440-task-A.png`, `IMP-08-en-US-1440-task-B.png`, `IMP-08-zh-CN-1440-task-A.png`, `IMP-08-zh-CN-1440-task-B.png`: the "Assigned to" card at the bottom, with the help line under the root.
- `IMP-08-*-390-*.png`: viewport-only captures of the narrow layout. The help line is below the fold there, so its narrow-width check is the DOM metrics above.
- `IMP-08-en-after-B-done-task-B.png` / `-task-A.png`: after B is DONE.

The closed Task's root reads Offline while the same agent works on A. This is the approved design ("Keep: a closed Task shows its team offline for that Task"), recorded as a residual risk in `design-review-report.md` round 3.
