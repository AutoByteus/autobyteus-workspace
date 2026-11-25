# Release Requested — v1.5.15-beta.1 (Project Task autobyteus-645)

- From: Solution Designer, 2026-11-25 · To: `/delivery_engineer`
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`); the Task states "Founder approved cutting beta release `v1.5.15-beta.1` from the latest `origin/personal`", with the founder's own words for the Codex waiver (below).
- Release kind: **beta**, version **`v1.5.15-beta.1`** (first beta after stable `v1.5.14`; no `v1.5.15*` tag exists locally or on `origin`, checked 2026-11-25).
- Nothing to design: work already merged, no software change requested.

## Workspace

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/release-v1.5.15-beta.1`
- Branch: `codex/release-v1.5.15-beta.1`
- Base: `origin/personal` @ `4a25b19dd7` ("docs(file-viewer-media-642): record the finalization (autobyteus-642)"), fetched 2026-11-25; 114 commits after `v1.5.14`, with the merges of 618 (`e192ee216e`), 574 (`7cbab1f7c2`), 638 (`c807d31108`) and 642 (`28c2509aa2`). A newer `origin/personal` at cut time is allowed by the Task.
- Finalization target: `origin/personal`
- Ticket folder: `tickets/in-progress/release-v1.5.15-beta.1/` (this file)

## The Task's direction, in its words (follow `RELEASE.md` strictly)

1. **Base:** Latest `origin/personal` (`4a25b19dd7` or newer if already fast-forwarded on `origin/personal` at cut time). Includes since stable `v1.5.14`:
   - **`autobyteus-618`:** File viewer opens text/code files word-wrapped by default on phone & desktop.
   - **`autobyteus-574` (+ `636`) & `autobyteus-642` (+ `639`):** Native Android (`Media3`) & iOS (`AVPlayer`) phone video & audio streaming via HTTP `Range` 206 (`playMedia` bridge, 2-byte `ETag` reopen cache, landscape fullscreen, iOS playback audio session, header-only in-memory auth), Range 206 on collaboration message references, desktop Files tab ≥ 400 px (stacking below), and Monaco + chat syntax highlighting (`yaml`, `toml`, `sh`, `go`, `rs`, `java`, `xml`, `ini`, `Dockerfile`, `html`, `vue`). *(Note `574` & `642` ship together in this release.)*
   - **`autobyteus-638`:** User-started Agent & Team runs that were running stay running & idle across restarts (update, server restart, `docker stop/start`, crash) with zero tokens spent, immediately discoverable via `list_running_agents` & reachable via `send_message_to`.
2. **Pre-tag gates & verbatim Codex waiver:**
   - Secret / leak gate (`gitleaks` / `RELEASE.md` checks).
   - Full live `release_smoke.py` (with `AUTOBYTEUS_TEST_VAULT=~/.autobyteus-test/vault`).
   - **Codex waiver (for `v1.5.15-beta.1` ONLY, usage-limit failures only):** Recorded verbatim from the founder (2026-11-25): "Now release a new beta. Waive for codex because I have no more codex usage limits now". Still run `release_smoke.py` normally; waive Codex only if Codex fails solely on usage limits (any non-usage-limit failure on Codex or any other non-Grok-usage-limit failure stops and asks the founder). Standing Grok usage-limit-only waiver also applies.
3. **Release notes:**
   - Start with **"What you need to do"** (normal update from `v1.5.14`; update Android APK & iOS TestFlight to get native `playMedia` streaming + fullscreen; keep `v1.5.14` notes for anyone upgrading from `v1.5.13` or older).
   - Summarize all user-visible changes since `v1.5.14`.
4. **Build & publish all four workflows together:**
   - Desktop Release (GitHub Pre-release; GitHub Latest stays **`v1.5.14`**; verify `latest*.yml` after all six server packages).
   - Docker (`:beta` moves to `v1.5.15-beta.1`; `:latest` stays on stable `v1.5.14`, System level 2).
   - Android and iOS (TestFlight upload).
   - Never move or delete a published tag.
5. **Finalization:**
   - Record commit on `origin/personal`, fast-forward the founder's checkout (`git fetch` + `git merge --ff-only`), remove release worktree/branch/temp files, and save the verified record copy under `/Users/normy/autobyteus_org/autobyteus-delivery-records/release-v1.5.15-beta.1-<taskId>-20261125/`.

## Notes from the Solution Designer

- **The Codex waiver is pre-given** in the founder's words above (relayed by the PM in the Task). Record them verbatim in the report, with its scope (this beta only, usage-limit failures only). Any other failure: report `Blocked` to the Solution Designer and do not tag.
- **Stable v1.5.14 FU-001** asked for a Codex smoke after Nov 27, 7:43 AM; this release is before that, so Codex will most likely still be refused. Record the result either way; the gap stays open until a Codex smoke passes.
- **Notes check:** from `git diff --name-only v1.5.14..4a25b19dd7`, only test files mention migrations or Docker (no released migration, Prisma, Docker, workflow or script file); confirm with the release guide's checks before writing "normal update".
- The macOS in-job signing/notarization retry (v1.5.14 FU-002) is still unfixed; the job-level rerun is the known recovery.
- Return `Delivery Completed` to the Solution Designer when the completion gates pass.
