# Design Spec

## Solution And Approval Basis

- Current solution revision ID: `SR-001`
- Approved requirements: `requirements-doc.md` at SR-001 (Solution Designer within the direction, user informed, 2026-11-22).
- Design status: `Ready`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-activity-details/tickets/in-progress/phone-activity-details/investigation-notes.md`
- Authorities read (2026-11-22): `references/architecture-design.md`, `references/design-principles.md`, `DESIGN.md` (one builder per derived fact; rule 11), `docs/design-cases.md` (Cases 3, 5, 6).

## Current-State Read

The phone row (`MobileRunActivityItem.vue`) prints `toolName` and `contextText || type` and the raw status; `contextText` is built by a duplicated rule (`toolActivityProjection.ts:98-109`, `runProjectionActivityHydration.ts:119-136`, carried by `teamMemberToolStateReconciliation.ts:149`) that falls back to the tool name and is never recomputed (`agentActivityStore.ts:280-292`). The shared summary owner is `getToolDisplaySummary` (`utils/toolDisplaySummary.ts:119-160`). Desktop details formatting, status labels and compaction rows live inside `ToolActivityItem.vue` (`:149-163, :248-274`) and `CompactionActivityItem.vue` (`:35-57`). The phone's screens are route query keys (`useMobileNavigation.ts:4-11`). The Nuxt type project misses `../dist-mobile-demo/**` (`nuxt.config.ts:249-263`).

## Task Size And Architectural Risk

- Task size: `Medium` — about 14 web files: three shared presentation builders extracted from two desktop components; two phone detail screens and the row; one navigation key; `contextText` removed from the model and its four writers (live, hydration, team reconciliation, demo content); `nuxt.config.ts`; `TESTING.md` sentence; localization; tests and one phone probe case.
- Architectural risk: `Low` — presentation and in-memory model only; no wire contract (the node's projection keeps its `contextText`; the web stops reading it), no persistence, no security change; owners stay where they are.
- Escalation trigger: a need to change the node's projection, or a desktop panel that would show different content.

## Design Decisions

- **D-1 (586 first) Type project excludes.** `nuxt.config.ts` exclude list gains `'../dist-mobile-demo/**'` next to `'../dist-mobile/**'`. Implementation lists every ignored output that exists after the desktop, mobile and demo builds (`git ls-files --others --ignored --exclude-standard --directory autobyteus-web`) and confirms each JS-holding one is excluded (by this list or Nuxt's own `../dist`, `../.data`); `TESTING.md:87` loses the workaround sentence. Proof: `build:mobile-web --demo`, then `pnpm -C autobyteus-web typecheck` at baseline.
- **D-2 One tool summary.** Every display of a tool activity's summary is `getToolDisplaySummary(activity.toolName, activity.arguments, { preferCompactPath: true })` (row) / `preferCompactPath: false` (detail screen's full line), computed at render from the current arguments. `ToolActivity.contextText` is removed with its rule and every writer (`toolActivityProjection.ts`, `runProjectionActivityHydration.ts` incl. `resolveContextText`, `teamMemberToolStateReconciliation.ts`, demo content `demo/world/content/*`, `demo/runtime.ts`, the e2e fixture page). Hydration ignores the projection entry's `contextText` (the node keeps sending it; FU-001).
- **D-3 Shared tool activity presentation** — `utils/activity/toolActivityPresentation.ts`: `toolActivityStatusPresentation(status) → { label, tone }` (the desktop's labels and tones, moved from `ToolActivityItem.vue:248-274`) and `toolActivityDetailSections(activity) → Array<{ key: 'arguments' | 'logs' | 'result' | 'error'; text: string; lines?: string[] }>` (present sections only; JSON formatting moved from `formatJson`). `ToolActivityItem.vue` consumes both (same rendering).
- **D-4 Shared compaction details** — `utils/compactionActivityPresentation.ts` (exists: `getCompactionPhasePresentation`) gains `compactionActivityDetailRows(activity)` moved from `CompactionActivityItem.vue:35-57`; the desktop item consumes it.
- **D-5 Phone row.** `MobileRunActivityItem`: tool row = name, then the D-2 summary when not null (one line, `title` = full text), the D-3 status chip; a failed one adds a two-line error excerpt; the whole row is a button (≥44 px) that opens D-6. Compaction row: as today plus tap → D-6. System instruction: unchanged (desktop component).
- **D-6 Phone detail screen.** `MobileActivityDetail.vue`, full screen with `MobileScreenBar` (title = tool name or "Memory compaction"), opened by a new route key `activityItem=<activityId>` under `screen=activity` (`useMobileNavigation`: key added to `SCREEN_KEYS`, `openActivityItem({ activityId })`, `openActivityItemId`); reads the activity from `agentActivityStore` by id (live); tool: status, full summary, the D-3 sections (each collapsible, open by default when short; monospace, `break-words`/`whitespace-pre-wrap`, horizontal overflow contained); compaction: the D-4 rows. An id no longer present shows "This activity is no longer available." Back (system or bar) pops the key; the list keeps its scroll (it stays mounted under the detail, as the file viewer does over Files, or restores its offset).
- **D-7 Background tasks.** `MobileBackgroundTasks`: a task row toggles expanded on tap (`aria-expanded`): command and end summary unclamped, as the desktop's expand. Title/command rules stay as they are (they already match the desktop's).

## Change Scope

- In scope: the files named in D-1…D-7, their specs, localization (en, zh-CN), `test:e2e:mobile-shell` (a new case file or a case in the existing activity cases).
- Derived consumers of the removed `contextText`: the four writers above and the e2e fixture; no reader remains (`rg "contextText" autobyteus-web` must be empty except the node's projection DTO type if mirrored — none on the web today).
- Derived consumers of the moved builders: `ToolActivityItem.vue`, `CompactionActivityItem.vue` (same output; their specs keep passing).
- Left alone: the node (`resolveContextText` in projections, FU-001), the desktop panel's look, the conversation tool cards, `SystemInstructionActivityItem`.
- Follow-ups: FU-001.

## Spines

- DS-001 row: `agentActivityStore activity → MobileActivity → MobileRunActivityItem → getToolDisplaySummary(current args) + toolActivityStatusPresentation → row`.
- DS-002 detail: `tap → useMobileNavigation.openActivityItem → MobilePairedShell (screen=activity, activityItem) → MobileActivityDetail → agentActivityStore by id (live) → toolActivityDetailSections / compactionActivityDetailRows → screen; Back → key removed → list`.

## Removal Plan

| Item | Why | Replaced By |
| --- | --- | --- |
| `ToolActivity.contextText` and its rule in `toolActivityProjection.ts`, `runProjectionActivityHydration.ts` (`resolveContextText`), `teamMemberToolStateReconciliation.ts`, demo content, fixture | No reader after D-5; duplicated, stale rule | `getToolDisplaySummary` at render |
| Status label/tone and `formatJson` inside `ToolActivityItem.vue` | Moved | D-3 |
| `detailRows` inside `CompactionActivityItem.vue` | Moved | D-4 |
| Phone row's `<details>` log excerpt | Replaced by the detail screen | D-6 |

## Persisted Data

- `Not Affected` (in-memory activity model; the node's stored projection unchanged).

## Change Sequence

1. D-1 (586) and its proof.
2. Failing unit tests: row summary (late `file_path`; `update_task` with nothing to summarize shows its name once), status labels, detail sections, compaction rows, background task expand.
3. D-3, D-4 extraction (desktop specs unchanged in outcome); D-2 model cleanup; D-5…D-7.
4. Phone probe (production bundle, scripted AGY): rows show summaries; a tool row opens its details with arguments/logs/result; a running tool's logs grow while open; a failed tool shows its error; a compaction row and a background task with a long command open their details; Back returns to the list at the same place; zh-CN labels.

## Risks

- R-1: a runtime whose arguments carry none of the summary keys shows the name only (correct, no duplicate).
- R-2: physical-device WebView rendering not tested (DEC-005).

## Guidance For Implementation

- Start from the unit tests of step 2 (the founder's screenshot is the reproduction); keep the desktop panel's specs green as the proof that the extraction changed nothing there.
