# Investigation Notes

## Investigation Meta

- Package: `phone-activity-details` (Project Task autobyteus-590, absorbing autobyteus-586)
- Worktree / branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-activity-details`, `codex/phone-activity-details`
- Base: `origin/personal` at `0da6bfbfc1` (fetched 2026-11-22); finalization target `origin/personal`
- Bootstrap: `pnpm install --frozen-lockfile`, `nuxt prepare` passed (Node v22.23.1)
- Current solution revision ID: `SR-001`
- Authorities read (2026-11-22): the updated skill (`SKILL.md` Evidence Decisions; `references/requirements-engineering.md` feasibility of the proof; `templates/requirements-doc-template.md`), `references/finding-the-cause.md`, `ticket-scope.md`; `TESTING.md`; `DESIGN.md`; `reflections/lessons.md`
- Status: complete

## Request

Founder (2026-11-21, phone screenshot): every row of the phone Activity screen prints the tool name twice (`update_task` / `update_task`, `run_command` / `run_command`, …) with a `success` badge, and a row cannot be opened to inspect its arguments, logs, result or error as on the desktop. Bring the phone Activity to the desktop's parity, using the same shared model/formatter, covering background tasks and errors. PM comment (2026-11-22): first do autobyteus-586 — exclude `../dist-mobile-demo/**` from the Nuxt type project, check no other build output is type-checked, drop the workaround sentence in `TESTING.md`, and verify `pnpm -C autobyteus-web typecheck` with `dist-mobile-demo/` present.

## Source Log

| Type | Source | Finding |
| --- | --- | --- |
| Code | `autobyteus-web/components/mobile/views/MobileRunActivityItem.vue:1-23` | Tool row: line 1 `toolName`, line 2 `contextText \|\| type`, raw `status` badge; error clamped to 2 lines; logs in a `<details>` clamped to 6 lines; no arguments, no result |
| Code | `autobyteus-web/types/activity/RunActivity.ts:14-25` | `ToolActivity.contextText` (and `type`) |
| Code | `services/agentStreaming/handlers/toolActivityProjection.ts:98-109,139`; `services/runHydration/runProjectionActivityHydration.ts:119-136,176`; `services/runHydration/teamMemberToolStateReconciliation.ts:149` | `contextText` = `path`, else `command`, else **the tool name** — the same rule written twice; set once when the activity is created |
| Code | `stores/agentActivityStore.ts:280-292` (`updateToolActivityArguments`) | Arguments that arrive later never recompute `contextText`: an activity created before its arguments keeps the tool name as its summary |
| Code | `rg "\.contextText" autobyteus-web` | Read only by the phone row; the desktop Activity does not show it |
| Code | `utils/toolDisplaySummary.ts:119-160` (`getToolDisplaySummary`), used by `utils/toolCardPresentation.ts` (the desktop conversation's tool card, `ToolCallIndicator.vue:107`) | The shared summary of a tool call: command keys (`command`, `cmd`, `script`), file keys (`path`, `file_path`, …, compact path option), text keys (`query`, `title`, `name`, …); secrets redacted; returns null rather than the tool name |
| Code | `components/progress/ToolActivityItem.vue:1-163,248-260` | Desktop tool item: name, `#shortId`, status label (Success / Failed / Running / Review / Denied / Approved / Parsed), expandable Arguments (JSON), Logs, Result (JSON), Error; formatting (`formatJson`) inside the component |
| Code | `components/progress/CompactionActivityItem.vue:35-57` | Desktop compaction detail rows (turn, task, provider, model, counts, error…) built inside the component; the phone shows message · provider · turn only |
| Code | `components/progress/BackgroundTaskPanel.vue:80-99,192-196` vs `components/mobile/views/MobileBackgroundTasks.vue:10-22` | Desktop expands a task's full command and end summary; the phone clamps them (2 and 3 lines), no expand |
| Code | `components/mobile/views/MobileRunActivityItem.vue` system instruction branch | The phone already reuses the desktop `SystemInstructionActivityItem` |
| Code | `composables/mobile/useMobileNavigation.ts:4-11,41-48`; `components/mobile/MobilePairedShell.vue:47` | Phone screens are route query keys (Back walks them); the file viewer opens as a key under its screen |
| Code | `autobyteus-server-ts/src/run-history/projection/*` (`resolveContextText` in `raw-trace-to-historical-replay-events.ts:101`, `codex-run-view-projection-provider.ts:190`; used by `run-projection-dedupe.ts:238`) | The node computes its own `contextText` for stored runs (the same path/command/tool-name rule) and uses it in projection dedupe |
| Code (586) | `autobyteus-web/nuxt.config.ts:244-265`; generated `.nuxt/tsconfig.json` | The type project includes `../**/*` (allowJs); excludes `../electron-dist/**`, `../dist-mobile/**`, `../.output/**`, `../resources/**`, `../build/**`, `../electron/**`, and Nuxt itself adds `../dist`, `../.data`; `../dist-mobile-demo/**` is missing |
| Doc (586) | `TESTING.md:87` (GraphQL/demo row) | Carries the workaround sentence "remove it before the typecheck" |

## Root cause (Read; the founder's screenshot matches)

1. The phone row's second line is `contextText`, whose rule falls back to the tool name when the arguments have no `path` or `command` (task tools, and runtimes whose file key is `file_path`), and which is never recomputed when the arguments arrive after the activity was created. So the line repeats the tool name.
2. The phone row has no detail view: the details the desktop shows (arguments, logs, result, error; compaction rows; full background-task command and summary) exist in the store but the phone never renders them.
3. The summary rule exists three times on the web (live, hydration, the shared `getToolDisplaySummary`), and the desktop details formatting lives inside desktop components, so the phone had nothing shared to reuse.

- Reproduction: the founder's screenshot; implementation starts from unit tests of the row (an activity created with empty arguments that receive `file_path` later must show the path; a `update_task` with no summarizable argument must not repeat its name).
- Temporary diagnostics: None.

## Evidence feasibility

- Phone: the production phone bundle in `test:e2e:mobile-shell` (headless Chrome 390×844, touch) — the project's established phone evidence (TESTING.md). A physical phone is not available to the team; the risk that a physical WebView renders differently is low (same bundle, ordinary HTML/CSS) — accepted, see requirements DEC-005.

## Notes For Design

- One summary owner (`getToolDisplaySummary`), derived from the activity's current arguments at render; `contextText` then has no web reader (dead in touched files).
- One details builder per activity kind, used by the desktop components and the phone screens.
- The server's `contextText` is out of this ticket (follow-up).
