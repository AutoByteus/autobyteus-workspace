# Handoff Summary

## Summary Meta

- Ticket: `phone-web-followups-609` (Project Task `autobyteus-609`, absorbing `autobyteus-575`; requested by `/project_task_manager`, 2026-11-22)
- Date: `2026-11-23`
- Classification: `task_size: Large`, `architectural_risk: High`; route: reviewed (architecture review ARCH-REV-001…ARCH-REV-003; source review CRR-001 Pass, CRR-002 failure-origin of API-REV-001 (`Design Impact`, resolved by SR-004 / SR-005 and IR-002), CRR-003 Pass; API/E2E `API-REV-002` Pass, final confidence 95.6 %, no category below 90 %; test-code review CRR-004 Pass, no findings).
- Current Status: `Verified from evidence; finalized on personal; no release` (the finalization record is in `release-deployment-report.md`).
- Branch: `codex/phone-web-followups-609`, base `origin/personal` `f2c0d2a902` at bootstrap; integrated once with `origin/personal` `1956c232c8` (93 commits; merge `fecee4ad82`, one conflict, and three integration fixes by delivery, below).

## Delivery Summary

- Delivered scope (items A–J):
  - **A:** the node's history projection no longer computes or sends `contextText`.
  - **B:** the three contract packages' tracked `dist/` is rebuilt (the stale team-stream file) and `pnpm check:contract-dist` keeps it equal to its source; `TESTING.md` and `RELEASE.md` say so.
  - **C:** `prepare-server.mjs` removes its Windows staging folder at the end of every run, also on failure, and git ignores it.
  - **D and D2:** a tool call the user stopped reads **"Stopped"** with a stop icon on every surface (conversation card, desktop Activity, phone row and detail, earlier-trace cards), live and after the run is read back from the node, on every runtime. One node rule (`isInterruptedToolResult`) decides it from what each writer already stores; no migration; old runs read alike.
  - **E:** one summary key list (`TOOL_SUMMARY_ARGUMENT_KEYS` in the contracts package) is read by the web's summary and the node's earlier-trace page projection, so a page card shows the live card's summary; `summaryArgs` is a JSON object.
  - **F and G:** phone probe fixes (MSP-44/45/46 expect autobyteus-576's relative links; MSP-55 accepts the second code its own link cut can produce).
  - **H:** a relative Markdown link in a run's chat (`[clip](media/clip.mp4)`) opens that file of the run's own folder, for a standalone run, a Team member and a delegated run, on desktop and phone; a link out of the folder, a run with no folder and a missing file keep the existing messages; nothing outside the folder is read.
  - **I:** a stopped run's background tasks end as "Stopped: the run ended" when the list sees the run stop, even when the node's own end update was lost.
  - **J:** the REST workspace file routes restore a registered workspace, so the first read after a node restart answers 200.
  - **SR-005:** the unused Codex run view provider, thread-history reader and normalizer are removed (nothing but their own tests called them).
- Docs synced (`docs-sync-report.md`): three server docs that named the removed Codex files, `run_history.md` (the stopped-call rule, `contextText`, `summaryArgs`), `workspaces.md` (the REST lookup), `file_explorer.md` (run-relative links), `remote_access.md`, `agent_execution_architecture.md`, `chat.md`, `electron_packaging.md`. `TESTING.md` and `RELEASE.md` were updated by the ticket and verified. `DESIGN.md`: no change.
- Durable coverage: phone and desktop cases `MSP-99`…`MSP-103` as the ticket named them (MSP-99 is now `MSP-104`: see below), MSP-91's restart read, `AGENT_TOOL_STEPS` in the scripted Antigravity CLI, and server and web unit specs for every item.

## Delivery found and fixed three problems the merge brought (the base had moved 93 commits)

1. **A type break** (`pnpm -C autobyteus-web typecheck`: 4 production errors): the base's new `EventMonitorLatestRow.vue` (autobyteus-585) still typed the file-link event as `AbsoluteFilePathAction`, while this ticket's feed now emits the `ConversationFileLink` union. Its type is now `ConversationFileLink`; it only passes the event on.
2. **A case-ID collision**: the base's autobyteus-585 took `MSP-99` for a platform-notice case; this ticket's `MSP-99` (the lost task-end update, AC-I) collided, and the probe's own duplicate-ID check refuses to start. Delivery renumbered this ticket's case to `MSP-104` (three lines, `mobile-background-tasks-cases.mjs`). API/E2E's reports and evidence keep the old ID; the mapping is in `evidence/delivery/README.md` and the release/deployment report.
3. **A stale assertion**: autobyteus-579 (merged in the base) fixed what this ticket recorded as FU-005 (a missing workspace file showed the node's raw JSON). MSP-100's AC-H2 check read the raw text; it now reads the new error state (desktop "File not found: <path>", phone "Couldn’t open this file. Retry"), and the console line the case provokes on purpose is registered as expected. FU-005 is marked resolved.

The one textual conflict (`AgentConversationFeed.vue`, imports) was resolved by taking the base's usage import (the base moved the usage line into `EventMonitorLatestRow`) and this ticket's file-link type.

## Verification Summary

- Verified from evidence by delivery. Every critical acceptance criterion (AC-A…AC-J) is directly proven; nothing needs the user's check. No evidence decision (`DEC-*`) accepted an unverified risk; the physical phone was not required.
- Final confidence 95.6 % (target 95 % met).
- Key evidence opened by delivery (details in `release-deployment-report.md`):
  - AC-D: phone row `{"status":"interrupted","word":"Stopped"}` and detail "Stopped" for a call stopped with the desktop Stop and read back after 110 page events; the desktop Activity chip "Stopped"; the page card's `stopped: true`; MSP-103 for a Team member: phone live and a second phone's read-back both `interrupted`, desktop card `stopped: true`, no conflicts.
  - AC-H1/H2: MSP-101: the member's file shows `MATE-609-BODY` and the delegated run's `HOST-609-BODY`, each from its own folder, none from another; MSP-100: `docs-609/a.md#x` and `media-609/clip-609.txt` open, `../` shows "The file preview could not be opened.", nothing outside shown.
  - AC-I: MSP-104 (was 99): the phone's socket swallows every task update, the run is terminated, the row reads Stopped with "Stopped: the run ended".
  - AC-J: MSP-91: the first read after a real node restart answers 200; an unknown ID 404; no key 401; a path out of the folder 400. Integration `workspace-content-after-restart` passes.
  - AC-B/C: the base fails `check:contract-dist` naming `team-stream-server-message.d.ts`; the branch passes (delivery reran it on the merged tree: `PASS`, clean); the fresh-clone macOS build left no stage; the build-only Desktop Release run 45094535212, which I read from GitHub: `success`, all five build jobs, signing and publish skipped.
  - AC-A/E: no `contextText` in the node's source; the page's GraphQL answer carries JSON `summaryArgs`.
- Integrated-state checks (`evidence/delivery/`): both typechecks at baseline, `check:contract-dist` pass, server and web unit specs, the integration file, the whole web suite and the two GraphQL projection E2E files, server and phone bundle rebuilt, and 15 phone and desktop cases (this ticket's and the base's colliding ones) with a `Pass` verdict. Exact numbers in the report.

## Residual Risks For The User

- **C:** Windows success is proven by the release run only (a Windows runner; the local macOS run shows the same code path and no stage left).
- **I and J:** the design's own risks. I: a list opened after a stop (not mounted when the run stopped) still shows what the node last reported (FU-003). J: the lookup restores only registered folders and creates nothing for an unknown ID.
- **Not tested live:** a native-runtime or Codex call stopped mid-call (proven at the writer level by IMP-11's unit test, not by a live probe); a physical phone.
- **Environment (outside this ticket):** the whole phone probe is red on MSP-61 only (FU-006; red on the base); the whole server E2E has two failures on the base (FU-007: two migration tests that read the node's Unix socket).

## Follow-ups

- `follow-ups.md` lists FU-001…FU-007, FU-009 and FU-010 for the Solution Designer to send (none sent yet; none urgent): FU-001 which hop lost MSP-59's update (unknown; D-I meets the user-visible outcome); FU-002 the conversation tool card's icons differ from the Activity panel's; FU-003 a list opened after the stop; FU-004 the phone does not open 576's relative links in a workspace Markdown file; FU-006 MSP-61; FU-007 the two base E2E failures; FU-009 the unused `ClaudeRunViewProjectionProvider`; FU-010 a stopped call's stored "Tool execution interrupted." still shows as a red Error section in the detail and under the card. FU-005 is resolved by autobyteus-579; FU-008 was withdrawn in SR-005.

## Release

- No release: the user did not ask for one and `RELEASE.md` makes none the default. A release is available: `release-notes.md` holds the user-facing notes (no `## What you need to do`: no user action, no migration).
