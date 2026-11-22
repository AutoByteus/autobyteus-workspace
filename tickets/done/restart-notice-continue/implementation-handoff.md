# Implementation Handoff — autobyteus-585 (`restart-notice-continue`)

- Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/restart-notice-continue/tickets/in-progress/restart-notice-continue/`.
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/restart-notice-continue`.
- Branch: `codex/restart-notice-continue`, base `origin/personal` @ `0da6bfbfc1`.
- Commits: the code is `75e085d889`; the ticket documents and evidence are in the commit after it.
- Not pushed. No release.

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: `Architecture Design Complete`, `Small`/`Low`. Direct route; architecture review not selected.
- Requirements doc: `requirements-doc.md` (SR-001). The founder narrowed the scope to part 2 only (DEC-001).
- Investigation notes: `investigation-notes.md`
- Solution revision record: `solution-revision-record.md`
- Design spec: `design-spec.md` (SR-001, Ready)
- Supplemental task artifacts: the founder's screenshots in `evidence/*.jpg`
- Design review report: `N/A — not applicable`
- Architecture review revision record: `N/A — not applicable`
- Triggering rework report: N/A

## Current Implementation Summary

- **Rows** (`services/eventMonitor/recentEventMonitorWindow.ts`):
  - `buildRecentEventMonitorPresentation` turns each `system_task_notification` segment into `{ kind: 'notice', key: notice-<messageIndex>-<segmentIndex>, segment, messageIndex }`.
  - The run-collecting loop stops before a notice segment, so the agent's content before and after a notice becomes separate `message` items, in order.
  - `message` items carry `showsUsage`. `markUsageRows` sets it to true only on a message's last row, so a split message shows and counts its usage once. This also covers the older compaction splits.
- **Usage:**
  - `getRecentEventMonitorTotalUsageText` counts only `showsUsage` rows.
  - The witness passes usage text only on that row, and gives a `notice` item one `system_task_notification` token, with the same identity and values as the segment had before.
- **Drawing:**
  - The feed's latest rows are drawn by the new `components/workspace/agent/EventMonitorLatestRow.vue`: message with its usage line, notice, compaction. Deviation 1 below.
  - The feed keeps each row's element, key and `data-speaker`; notice rows get `system` from the existing expression.
- **Notice content** (`SystemTaskNotificationSegment.vue`):
  - Laid out as a turn: `conv-turn`; a `heroicons:information-circle` icon (slate) in `conv-avatar`; the label as the phone's `conv-speaker` and as a small muted line above the body on the desktop; a muted body (slate-600, dark slate-300); `role="note"` and `aria-label` equal to the label.
  - Labels:
    - **Agent runtime changed**: by sender;
    - **Application restarted**: by sender or header;
    - **Skill updated**;
    - **Tools updated**;
    - **Background tasks finished**: `system.background_task_notifier` or header;
    - otherwise **Platform notice**.
  - Body: a first line `[Platform notice — …]` and the blank line after it are dropped. Then the existing rules apply: tools shows changes only, and the restart time is shown in the viewer's zone.
- **Removed:**
  - the `system_task_notification` branch and its import in `AIMessage.vue` (dead);
  - the unused fallback aria-label key `…SystemTaskNotificationSegment.system_task_notification` (en, zh-CN `workspace.generated.ts`): every notice is labelled now.
- **Catalogs:** `applicationRestarted`, `backgroundTasksFinished`, `platformNotice` in `localization/messages/{en,zh-CN}/workspace.ts` ("Application restarted" / "应用已重启", "Background tasks finished" / "后台任务已完成", "Platform notice" / "平台通知").
- **Phone CSS:** the old `.system-task-notification` margin rule is replaced by hiding the desktop label inside the body; on the phone the label is the speaker line, and the row padding spaces the notice. No other rule was needed: the `system` row breaks the `agent + agent` rule, so the agent after it shows its avatar and name (MSP-99).
- **Docs:** `autobyteus-web/docs/agent_execution_architecture.md`, the event table row and the `systemTaskNotificationHandler.ts` section. The old "should read like ordinary chat content" line is replaced by the row model and the label list.
- **Tests:**
  - builder cases (AC-001, AC-002, AC-003 including hydration and a replayed frame, AC-007);
  - witness cases;
  - segment cases (AC-004 for each kind in en and zh-CN, QR-001, layout);
  - a feed case (AC-001, AC-007);
  - existing specs updated only where they asserted the old placement or the old item shape (AC-006): see Checks;
  - phone case **MSP-99** (`tests/e2e/mobile-restored-run-cases.mjs`, catalogue line in `mobile-shell-probe.mjs`);
  - desktop probe **`test:e2e:notice-row-presentation`** (new `tests/e2e/notice-row-presentation-probe.mjs` + `fixtures/notice-row-presentation.page.vue`);
  - the background-contention fixture counts a notice item as one visual.
- Implementation cycle: `Initial`. Revision record: `implementation-revision-record.md`. Current revision: `IR-001`. Solution: `SR-001`. Other revision IDs: `N/A`. Triggering findings: `N/A`.

## Routing Classification (Mandatory)

- Task size: `Small`
- Architecture risk: `Low`
- Design classification reference: `design-spec.md` "Task Size And Architectural Risk"
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale:
  - The change is web presentation only: no server, transport, stored data or conversation model change.
  - The model's readers (dedupe, window enforcement, hydration) are unchanged.
  - The escalation triggers did not fire:
    - only the feed renders conversations (`AgentEventMonitor.vue` is its only product parent);
    - no reader outside the feed needed notices out of AI messages;
    - the phone uses the same feed.
- Selected route: `Direct API/E2E`
- Lightweight implementation self-review completed for the direct route: `Yes`. I read the diff against the Final File Responsibility Mapping and the builder example:
  - the split is in the builder only (no `v-if` filtering in templates);
  - no compatibility branch is kept;
  - the label mapping is explicit, with an explicit fallback;
  - the file-size check led to Deviation 1.
- New design impact or escalation trigger: `None`

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change | Implemented Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001 | Wake notice: own row between agent rows | `buildRecentEventMonitorPresentation` notice item → `EventMonitorLatestRow` → `SystemTaskNotificationSegment` | Builder AC-001 spec; feed spec; desktop probe IMP-05; phone MSP-99 wake case |
| BEH-002 | Notice starting a turn: own row before the agent row; mid-message: agent, notice, agent | Same | Builder AC-002 spec; MSP-99 restart case (agent turn → reminder → user's next message) |
| BEH-003 | Reload is the same as live | Hydrated conversation through the same builder; dedupe unchanged | Builder AC-003 spec (hydration + replayed frame); MSP-99 after a reload |
| BEH-004 | A label for every notice; no repeated header | `SystemTaskNotificationSegment.vue` label and `withoutHeaderLine` | Segment spec AC-004 (each kind, en + zh-CN) |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`. No server code or notice text changed (DEC-001); browse mode is untouched.

## Key Files Or Areas

- `autobyteus-web/services/eventMonitor/recentEventMonitorWindow.ts`, `recentEventMonitorUsagePresentation.ts`, `recentEventMonitorPresentationWitness.ts`
- `autobyteus-web/components/workspace/agent/AgentConversationFeed.vue`, `EventMonitorLatestRow.vue` (new)
- `autobyteus-web/components/conversation/segments/SystemTaskNotificationSegment.vue`, `components/conversation/AIMessage.vue`
- `autobyteus-web/localization/messages/{en,zh-CN}/workspace.ts`, `workspace.generated.ts`
- `autobyteus-web/assets/css/phone-conversation.css`
- `autobyteus-web/docs/agent_execution_architecture.md`
- Tests: the specs above; `tests/e2e/mobile-restored-run-cases.mjs`, `mobile-shell-probe.mjs` (catalogue), `notice-row-presentation-probe.mjs` + fixture, `fixtures/background-agent-renderer-contention.page.vue`; `package.json` script `test:e2e:notice-row-presentation`

## Important Assumptions

- **Deviation 1 (source-size guardrail):** the design put the notice branch in `AgentConversationFeed.vue`. That file was at 499 effective lines, and the branch would have taken it to 503, over the 500-line limit.
  - The latest-row content moved to `EventMonitorLatestRow.vue`: one latest-feed item (message + usage line, notice, compaction). This is the counterpart of the existing `EventMonitorBrowseAssistantRow.vue`.
  - The feed keeps the row element, `key`, `data-speaker` and the total usage line, and is now at 489 lines.
  - The behavior is the one the design describes. The feed specs mount the feed, so they cover the row component.
- **The restart reminder's place on the phone (MSP-99):** with a real node restart and an idle run, the reminder row comes right after the agent's long-build turn and before the user's next message. That is when the node delivers it. My first expectation (after the user's message) was wrong, and the case now asserts that order. The founder's shape (agent row, notice, agent row) is the wake case: a background-tasks notice in MSP-99, the restart reminder in the desktop probe.
- The muted body colour is set with scoped CSS on `.markdown-body`, because the markdown `prose` classes set their own colour. Dark mode follows `prefers-color-scheme`, as the app's `dark:` variants do.

## Known Risks

- The phone's notice body is muted slate-600 at the phone's text size. That is readable in the screenshots, but it is a visual call: compare `IMP-06-phone-msp99/*.png` with the founder's screenshot.
- MSP-99 ran alone (`--cases=MSP-99`), not the whole phone suite. Its stack is the restored-run cases' own node, delta.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: `Bug Fix`
- Reviewed root-cause classification: `Missing Invariant`
- Reviewed refactor decision: `No Refactor Needed`. The one extraction (Deviation 1) is driven by file size and is not a structural change.
- Implementation matched the reviewed assessment: `Yes`
- If challenged, routed as `Design Impact`: `N/A`
- Evidence / notes: the builder already split messages for compaction, and the notice split is the same mechanism.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`. The `AIMessage.vue` notice branch is removed.
- Dead code in the touched files and modules removed (Core Principle 7): `Yes`. Removed the notice branch, its import, the fallback aria-label key and its two catalog entries, and the `AIMessage` spec case for the removed branch.
- Dead code found elsewhere, added to `follow-ups.md`: None
- Shared structures remain tight: `Yes`. The `notice` item carries only the segment, not a copied message.
- Canonical shared design guidance was reapplied during implementation: `Yes`
- Deviations from a design principle decided during implementation: `None`. Deviation 1 follows the size rule; it is not a departure from a principle.
- Changed source files within the size guardrails: `Yes`
  - `AgentConversationFeed.vue`: 499 → 489;
  - `recentEventMonitorWindow.ts`: 186 → 224;
  - `SystemTaskNotificationSegment.vue`: 79 → 120;
  - witness: 149 → 158;
  - new row component: about 50.

## Persisted Data Transition Check (When Applicable)

- Approved decision: `Not Affected`. This is presentation only.

## Environment Or Dependency Notes

- Fresh worktree setup: `pnpm install --frozen-lockfile`, `pnpm -C autobyteus-web exec nuxi prepare`, and `pnpm -C autobyteus-ts build`. The spec `UserMessageStoredUploadNames.spec.ts` imports `autobyteus-ts` dist and fails to load without that build.
- The phone case also needs `pnpm -C autobyteus-server-ts build` and `pnpm -C autobyteus-web build:mobile-web` (TESTING.md). No `dist-mobile-demo/` was built.
- `autobyteus-application-backend-sdk/dist/` and `autobyteus-application-sdk-contracts/dist/` are untracked build leftovers, not staged.

## Checks Run

Evidence is in `evidence/impl/`. The checks ran on macOS arm64 on 2026-11-22, on the source committed as `75e085d889`:
- IMP-01..IMP-04 ran before the commit, on the same product source;
- after them only e2e files changed, and IMP-02 was rerun after that;
- IMP-05..IMP-07 ran on the final source.

| Check ID | Command Or Steps | Code It Exercises | Behavior / Criteria IDs | Result | Evidence Files | Look For |
| --- | --- | --- | --- | --- | --- | --- |
| IMP-01 | Reproduction first: the new builder cases on the base code fail (one agent row), then pass. The touched spec folders: `NUXT_TEST=true vitest run services/eventMonitor components/workspace/agent components/conversation` | Builder, usage, witness, feed, segment, AIMessage | AC-001..AC-004, AC-007, QR-001 | Pass (5 builder cases failed before the change) | Covered by IMP-04's full log | — |
| IMP-02 | `pnpm -C autobyteus-web typecheck` | All web source, specs and e2e fixtures | AC-006 | Pass | `IMP-02-web-typecheck.txt` | `test-file errors: 86 in 36 files (baseline 86 in 36 files)`, `[typecheck] PASS` |
| IMP-03 | `guard:web-boundary`, `guard:localization-boundary`, `audit:localization-literals` | Catalogs and literals | REQ-002 (en/zh-CN) | Pass | `IMP-03-*.txt` | exit 0 each |
| IMP-04 | Full web unit suite (`NUXT_TEST=true vitest run`) | All web specs | AC-006 | Pass | `IMP-04-web-unit-full.txt` (full), `.excerpt.txt` | `Test Files  793 passed (793)`, `Tests  5994 passed \| 2 skipped` |
| IMP-05 | `pnpm -C autobyteus-web test:e2e:notice-row-presentation` (desktop, 1280×900, Europe/Berlin, the founder's conversation) | Feed → row → notice on the desktop | AC-001, AC-005, AC-007 | Pass | `IMP-05-desktop-probe/evidence.json`, `desktop-notice-row.png` | `"result": "Pass"`, 8/8 checks, 0 browser errors; screenshot: info icon, "Application restarted", muted body `21 Nov 2026, 08:32 CET`, agent rows with avatar, one usage line |
| IMP-06 | Server build + `build:mobile-web` + `pnpm -C autobyteus-web test:e2e:mobile-shell --cases=MSP-99` | Phone bundle on a real node (delta): wake notice, real restart reminder, reload | AC-005, AC-003, REQ-004 | Pass | `IMP-06-phone-msp99.txt`, `IMP-06-phone-msp99/mobile-shell-probe.json` (`noticeRows`), `MSP-99-*.png` | `[mobile-shell] MSP-99 Pass`; `noticeRows.{wakeLive,restartLive,wakeReloaded,restartReloaded}.checks` all true; screenshot: "Background tasks finished" row, then "NR Notice Reader" |
| IMP-07 | `pnpm -C autobyteus-web test:e2e:background-contention` | The fixture's visual count with notice items | AC-006 | Pass | `IMP-07-background-contention.txt`, `IMP-07-background-contention/evidence.json` | `Background contention browser probe passed.` |

Existing specs changed only where they asserted the old placement or item shape (AC-006):
- `AIMessage.spec.ts`: the notice dispatch case and its stub are removed, because the branch was removed;
- `SystemTaskNotificationSegment.spec.ts`: "no label for an unknown notice" became "Platform notice" (REQ-002);
- `recentEventMonitorPresentationWitness.spec.ts`, `UserMessageHistoryFiles.spec.ts`: hand-built items gained `showsUsage: true`;
- `recentEventMonitorProductionDispatch.spec.ts`: the visual count treats a non-message item as one.

- Not run: the whole `test:e2e:mobile-shell` suite (about 25 minutes or more; only MSP-99 ran), and the zh-CN rendered probe (zh-CN is covered by the segment spec).

## Frontend Rendered-Result Check (When Applicable)

- Affected surfaces: the run conversation on the desktop and on the phone (`/mobile`), live and after a reload.
- References: REQ-001..REQ-004, AC-005; the founder's screenshots in `evidence/*.jpg`; DEC-002 (light, labelled, own row).
- Design system and adjacent surfaces reviewed: the `AIMessage`/`UserMessage` turn layout (`conv-turn`/`conv-avatar`/`conv-speaker`/`conv-body`), `phone-conversation.css`, `CompactionStatusRow`, and the local icon bundle (`heroicons:information-circle` is in it).
- Surfaces used: the desktop fixture page through `nuxi dev` (IMP-05); the production phone bundle served by a real node (IMP-06).
- States inspected:
  - desktop 1280 wide, light;
  - phone 390×844, live and after a reload;
  - a wake notice between agent rows;
  - a restart reminder before a user row;
  - the usage line.
- Defects found and corrected:
  - the feed file-size overrun (Deviation 1);
  - the fixture first rendered the feed without the stylesheet that `AgentEventMonitor.vue` loads, so the phone speaker line showed on the desktop page. That was a fixture artifact: the fixture now loads the stylesheet as the product does, and the probe asserts the desktop hides the phone speaker line.
- Limitations: dark mode and zh-CN were not rendered in a browser (zh-CN labels are in the segment spec). Remaining judgment: the muted body's contrast on the phone.

## Downstream Coverage Hints / Suggested Scenarios

- Run the whole `test:e2e:mobile-shell` once. MSP-75 to MSP-77 count `system-task-notification-segment` cards inside `mobile-run-conversation`; they still find them in the new rows, but I ran only MSP-99.
- A Team member's conversation and an Org member's conversation with a notice (the same feed).
- zh-CN rendering of a notice row; dark mode.
- Compare the phone screenshots with the founder's screenshot.

## API / E2E / Executable Coverage Investigation And Execution Still Required

- Independent API/E2E validation of AC-001..AC-007 and the confidence classification.
