# Handoff Summary

## Summary Meta

- Ticket: `phone-activity-details` (Project Task `autobyteus-590`, absorbing `autobyteus-586`; requested by `/project_task_manager` for the founder, 2026-11-22)
- Date: `2026-11-22`
- Classification: `task_size: Medium`, `architectural_risk: Low`; route: direct low-risk (no architecture review, no source review, no test-code review by policy). The one review document is CRR-001, the failure-origin review of API-REV-001's failure (`Local Fix`, fixed by `70f7040ee1`). API/E2E `API-REV-002` Pass, final confidence 95.4 % (target met, no category below 90 %).
- Current Status: `Verified from evidence; finalized on personal; no release` (the finalization record is in `release-deployment-report.md`).
- Branch: `codex/phone-activity-details`, base `origin/personal` `0da6bfbfc1` at bootstrap; integrated once with `origin/personal` `20b627960c` (18 commits, clean merge `e08e5c1939`). Code through `70f7040ee1`; probes `648a8e0299`. The F-2 history rewrite (so the `docs(testing):` commit holds only `TESTING.md`) happened before the branch was first pushed; its hash map is in `implementation-handoff.md`.

## Delivery Summary

- Delivered scope:
  - **The phone's Activity rows are readable.** A tool call row shows its name and, below it, the shared summary of its current arguments (the one the desktop conversation's tool card shows): a command without a leading `cd <folder> &&`, a file, a query or pattern, "→ <recipient>" for `send_message_to` and `delegate_task`, the Task key for the Task tools; at most two lines; never the tool name twice; Antigravity's own tools show their file, query, pattern or folder. A success shows only a check icon (accessible name "Success"); every other status shows an icon and its word, the desktop's words; a failed call shows an error excerpt.
  - **A row opens its details.** A tap opens a full-screen detail over the list (a history entry; Back returns at the same scroll place) with the status, the full summary and the Arguments, Logs, Result and Error that exist, readable on a narrow screen and live while open (a running call's Logs grow and its status changes in place). A memory compaction row opens its rows, including its error; a background task unfolds in place and its title unclamps (decision 2).
  - **One owner per derived fact.** `utils/toolDisplaySummary.ts`, `utils/activity/toolActivityPresentation.ts` and `utils/compactionActivityPresentation.ts` are read by the phone and by the desktop: the summary by the conversation's tool card (`ToolCallIndicator.vue`), the status words and details sections by the Activity panel's `ToolActivityItem.vue`, the compaction rows by `CompactionActivityItem.vue`; the web's own `contextText` is gone (the node's stored `contextText` stays, FU-001).
  - **autobyteus-586:** `nuxt.config.ts` excludes `../dist-mobile-demo/**` and the Windows server staging folder `../.server-packaging-stage/**` from the Nuxt type project, so `pnpm -C autobyteus-web typecheck` passes with a demo build present; `TESTING.md`'s "remove it before the typecheck" sentence is gone (its own commit, `37ed9cdf00`).
- Docs synced (`docs-sync-report.md`): `autobyteus-web/docs/remote_access.md` (the phone's Activity), `autobyteus-web/docs/agent_execution_architecture.md` (the Activity components and the shared builders). `TESTING.md` was updated by the ticket and verified by delivery. `DESIGN.md`, `RELEASE.md`: no change.
- Durable coverage: phone cases `MSP-94…97` in `test:e2e:mobile-shell` (`mobile-activity-details-cases.mjs`): rows and details with a failed call and a JSON result, en-US and zh-CN; a compaction's rows; a background task unfolding and a running call's live status; all of Antigravity's own tool rows; and the gated live `MSP-98` (`RUN_MOBILE_SHELL_LIVE_TOOL_LOGS=1` and the test vault: a running native `run_bash` call's Logs grow while its details stay open). Unit specs for the summary (including Antigravity's keys), the status and sections owner, the compaction rows, the phone row and detail components, the desktop components that now read the builders, and the hydration.

## Verification Summary

- Verified from evidence by delivery. Every critical acceptance criterion (AC-001…AC-007) is directly proven. One part is accepted as unverified risk by an evidence decision, not left to the user: **DEC-005** (a physical phone). The requirements doc's DEC-005 (the Solution Designer's decision) says the production phone bundle in `test:e2e:mobile-shell` is the project's phone evidence, no physical phone is available, and the untested scope is a physical device's WebView rendering of ordinary HTML/CSS from the same bundle (low risk). That is exactly what API/E2E did not test (headless Chrome at 390×844 with touch on the production bundle), so the decision covers it.
- Final confidence 95.4 % (target 95 % met).
- Key evidence opened by delivery (details in `release-deployment-report.md`):
  - AC-001/AC-002: whole phone probe round 2 (`R2-WS-1`): MSP-94 rows `delegate_task` → "→ /researcher", `open_tab` → `about:blank`, a failed call `statusWord: "Failed"` with its error excerpt, every success `statusWord: ""` with `statusLabel: "Success"` (icon only); MSP-97 (after the CRR-001 fix): `write_to_file` and `replace_file_content` → `workspace/marker.txt`, `grep_search` → `AFTER`, `find_by_name` → `*.txt`, `list_dir` → `kappa/workspace`, `run_command` → `printf NATIVE_ARGUMENTS_PREFIX_VERIFIED`.
  - AC-003: MSP-94's detail of the failed call: Arguments, Result and Error sections, zh-CN section titles 参数 / 结果 / 错误, scroll `top` 70 before and after Back; MSP-98 with a real model: `runningStatus` Running with 2 log lines, `endStatus` Success with the full output, details open throughout.
  - AC-004/AC-005: MSP-95 (a memory compaction's rows, no horizontal overflow) and MSP-96 (the background task's title unclamps; a running call's status live).
  - AC-006: the whole web suite `Test Files 796 passed`, `Tests 6046 passed` and the three guards; no `contextText` in web source.
  - AC-007 and the build input (`nuxt.config.ts`): the web typecheck at baseline (`86 in 36 files`) with a 13 MB `dist-mobile-demo/` present; a fresh clone at `648a8e0299` with `pnpm install --frozen-lockfile` and the release job's macOS ARM64 build (DMG and zip built, the job's Prisma and terminal-runtime checks pass); and the build-only Desktop Release run 45029500186, which I read from GitHub: `success` at head `648a8e0299`, all five build jobs green, signing and publish skipped.
- Integrated-state check on the merged tree (`evidence/delivery/`): server typecheck at baseline (0 production errors, 1000 test-file errors in 313 files); web typecheck at baseline with `dist-mobile-demo/` present (0 and 86 in 36 files); the ticket's web specs 58 files / 560 tests; server and phone bundle rebuilt; MSP-94…97 pass on the merged build with no unknown browser error and `serversLeft: 0`.

## Residual Risks For The User

- **DEC-005 (accepted):** no physical phone was used; the phone evidence is the production bundle in headless Chrome at 390×844 with touch.
- **Not tested:** a real Antigravity binary (the cases replay its recorded step shapes through a scripted CLI), Codex's `TOOL_LOG` timing, signing and notarization (they need the runners).
- **FU-004:** an interrupted tool call is labelled "Unknown" with a wrench icon, as on the desktop before, and now on the phone too (it shares the desktop's words).
- **FU-005:** the event monitor's earlier trace page cards take their summary from the node's contract, which carries only path, command and text keys, so they miss the agent tools' recipient and Task.
- **Environment (outside this ticket):** the whole phone probe's verdict is Fail on MSP-44 and MSP-45 only (FU-006: they still assert that a relative link in a Markdown preview does nothing, which autobyteus-576 changed; they fail alone and on the base), and it logged one unknown browser error in MSP-55, which itself passes (FU-007).

## Follow-ups

- `follow-ups.md` lists FU-001…FU-007 for the Solution Designer to send (none sent yet; none urgent): FU-001 the node's own `contextText` and its projection dedupe; FU-002 a stale tracked `dist/` of the team-stream contract package; FU-003 `prepare-server.mjs` leaves its Windows staging folder untracked and un-ignored; FU-004 an interrupted call reads "Unknown"; FU-005 the earlier-trace cards' summary; FU-006 MSP-44/45 are stale since autobyteus-576; FU-007 (added by delivery) MSP-55's allowlist accepts only `ERR_CONNECTION_RESET`, while its own deliberate link cut can also produce `ERR_SOCKET_NOT_CONNECTED`, which MSP-21's already accepts. autobyteus-584's FU-001 (the heap exhaustion with a demo build present) is fixed by this change.

## Release

- No release: the user did not ask for one and `RELEASE.md` makes none the default. A release is available: `release-notes.md` holds the user-facing notes (no `## What you need to do`: no user action, no migration).
