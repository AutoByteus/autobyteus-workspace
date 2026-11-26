# IMP-002: the web's wider checks and the browser probes the change touches

- Commits: `666052a203`, `37c047cb59`, `11978136f1` (the suite and typechecks ran on the working tree equal to `37c047cb59` before its last one-line change, "1 run"; `MemoryBrowse.spec.ts` was rerun after it, 8 passed).
- Environment: macOS arm64, Node 22, `env -i`.
- Date: 2026-11-26.
- Result: **Pass.**

| Check | Command | Result |
|---|---|---|
| Whole web suite | `pnpm -C autobyteus-web test:nuxt` | 811 files passed; 6290 tests passed, 2 skipped |
| Web typecheck | `pnpm -C autobyteus-web typecheck` | production 0 errors; test files 86 in 36 (= baseline); PASS |
| Server typecheck (TESTING.md: both typechecks) | `pnpm -C autobyteus-server-ts typecheck` | production 0; tests 972 in 299 (= baseline); PASS |
| Guards | `pnpm guard:web-boundary`, `pnpm guard:localization-boundary` | both Passed |
| Literal audit | `pnpm audit:localization-literals` | Passed with zero unresolved findings |
| Icon bundle | `node scripts/build-icon-bundle.mjs`, then `--check` | "wrote 166 icons from 5 collections"; "the bundle is current". Every icon this change names (`heroicons:document-text`, `heroicons:document`, `vscode-icons:file-type-{js,typescript,vue,html,css,json}`, `heroicons:arrow-left-20-solid`, `heroicons:chevron-down-20-solid`, `heroicons:clipboard-document`, `heroicons:check-20-solid`) was already in the committed bundle, so the asset is unchanged |
| The fixture page this change edits | `pnpm -C autobyteus-web test:e2e:team-group-icon --output-dir <tmp>/team-group-icon` | Pass (4 cases); cleanup: route removed, ports released |
| The semantic-memory view probe (its stale checks updated in `11978136f1`) | `node autobyteus-web/tests/e2e/semantic-memory-view-probe.mjs --output-dir <tmp>/smv-3` (after `pnpm -C autobyteus-server-ts build`) | **Pass, 42/42 checks**, 0 page errors |

## The semantic-memory view probe's two earlier runs

1. **On the change, before its update:** it failed at SMV-021, "Back to Memory", the old Back link this change replaces. Then I updated its checks on changed markup:
   - SMV-021 and SMV-062: Back's text and accessible name.
   - SMV-030 and SMV-101: the path as Copy's tooltip.
   - SMV-033: the first root document opens on arrival.
   - SMV-065, new: no "Belongs to" when Back names the team.
   - SMV-070 and SMV-071: Global's sr-only heading and tab tooltip.
2. **After the update:** it failed later, waiting 30 s for `[data-test="chat-workspace-trigger"]` on the chat page, after 37 checks passed.
   - **Cause, found:** on the run's first visit to `/chat`, the cold Nuxt dev server found new dependencies, re-optimized them and reloaded the page mid-step. Its `frontend.log` says: `new dependencies optimized: @xterm/xterm, @xterm/addon-fit, @novnc/novnc` then `optimized dependencies changed. reloading`.
   - Those modules belong to the chat page's terminal and VNC panels, which this change does not touch.
   - A temporary copy of the probe that captured the page at that step (removed afterwards) passed with the cache warm: the chat page showed its "Temp workspace" trigger.
   - The final run (above) passed with no reload in its log (`grep -c reloading` = 0).
   - This is the harness effect TESTING.md's Browser probes section describes ("A cold Nuxt dev server re-optimizes dependencies and reloads pages"), not a product or change defect.
