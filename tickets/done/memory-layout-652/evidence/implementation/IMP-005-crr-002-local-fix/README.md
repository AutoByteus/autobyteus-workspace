# IMP-005: CRR-002 Local Fix, CR-003 (owner and run headers wrap instead of hiding the name)

- Commits:
  - `413c2dcd83`: the fix.
  - `41bce17570`: a baseline fix in API/E2E's probe, SMV-034.
  - Both on `3b041cf3f6` (API/E2E round 2 and CRR-002).
- Environment: macOS arm64, `env -i`.
- Date: 2026-11-26.
- Result: **Pass.**

## The fix

All in `MemoryPageHeader`, plus one class each on the agent page's places line and the run page's name.

- **The left group's basis is its own width** (`flex-auto`, `flex: 1 1 auto`), not `flex: 1 1 0%`. The row is on one line when Back, the title and a run's title fit beside the actions; otherwise the actions wrap to their own row. This is the spec's Responsive rule: "one row when it fits, wraps otherwise".
- **Why not a fixed basis:** the review's example, `flex-[1_1_18rem]`, was tried first. It fixed the agent page, but on a run page Back (about 200 px, "Software Engineering Team") and the name (143 px) left the run title 34 px at 1024 and 16 px at 768. Any basis large enough for the run page would have wrapped the agent header at 1280 (filter and switch).
- **The places line** is `w-0 flex-1 basis-0`: it fills only what the name leaves and adds nothing to the header's own width. Otherwise its text would make the header wrap at 1440.
- **Sharing a too-narrow row:** Back's text (`min-w-0`, its arrow `flex-shrink-0`) and the run page's visible name, which is no longer `flex-shrink-0`, give way with the run title. Before, the title alone shrank.

## Specs, red then green

`npx vitest run components/memory`

| Run | Result |
|---|---|
| Red: the new `MemoryPageHeader.spec.ts` case on `3b041cf3f6`'s classes | 1 failed (the group is `flex-1`), 1 passed |
| Green: `413c2dcd83` | 13 files, 79 tests passed |

The spec pins:
- the left group: `flex-auto`, `min-w-0`, not `flex-1`;
- Back: `min-w-0`, its text truncating, its arrow kept;
- the places line: `w-0 flex-1 basis-0`.

## Rendered: owner and run headers, with the app's left panel open

API/E2E's `stack-r2.mjs` and its `hdr2.js`/`hdr3.js` steps, with my `view.mjs`, on my own stack (invented data, removed afterwards). Results are in `results/hdr*-<width>.json`, screenshots in `shots/`. "Name" is width / width needed, in px.

| Width | Project Task Manager (agent) | capacity-planner (a 550 px name) | Team Runs: name | Run page: Back, name, run title | Rows |
|---|---|---|---|---|---|
| 768×900 | 172/172 | 323/550 | 219/219 | 129, 83/143, 160/276 | agent: filter and switch each below; run: switch below |
| 900×768 | 172/172 | 439/550 | 219/219 | 171, 114/143, 219/276 | same |
| 1024×768 | 172/172 | 549/550 | 219/219 | 212, 142/143, 274/276 | agent: name and filter in row 1, switch in row 2; run: switch below |
| 1280×800 | 172/172 | 550/550 | 219/219 | 213, 143/143, 276/276 | agent and run: **one row** |
| 1440×900 | 172/172 | 550/550 | 219/219 | 213, 143/143, 276/276 | **one row** (VIS-004); the 550 px name wraps its switch |

Before the fix (API/E2E's API-016, and my own run of 18rem): at 1024 the agent's name was **0/172**, the team name 73/219 and the run title 34/276; at 768 the name was 36. 0 page and console errors at every width.

## API/E2E's probe: `semantic-memory-view-probe.mjs`

The result is in `probe-result.json`.

- **Pass, 55/55**, 0 page errors, no dev-server reload.
- SMV-120: the name whole at 1440 and 1280.
- SMV-121: the cards inside 390 px.
- SMV-122: at 1024 the name is 153/153.

**SMV-034, a baseline fix in the test** (`41bce17570`, Rule 9):
- With SMV-122 in place it failed twice: "a link row asks nothing of the node", listing `ListWorkspaceRunHistory` and `ListCollaborationRootHistory`.
- **Cause, from operation times logged by a temporary copy of the probe** (removed afterwards): the left panel re-reads the run lists every 5 s (`RUN_HISTORY_REFRESH_INTERVAL_MS = 5000`), here at 0.4 s and 5.4 s. SMV-034's 800 ms window now runs from 5.1 to 6.0 s, because SMV-120…122's viewport changes come before it, so it catches the 5.4 s re-read every run.
- Before SMV-122 the window opened about 2.4 s earlier. API/E2E's round-2 runs stopped at SMV-122 and never reached it.
- Those reads are not the link row's. SMV-034 now leaves out these two periodic reads and still fails on any other operation.
