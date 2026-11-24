# Release Requested — STABLE v1.5.14 (Project Task autobyteus-635)

- From: Solution Designer, 2026-11-24 · To: `/delivery_engineer`
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`); the Task states "Founder approved cutting **STABLE release `v1.5.14`** from the latest **`origin/personal`**".
- Release kind: **stable**, version **`v1.5.14`** (previous stable `v1.5.13`; latest beta `v1.5.14-beta.10`; `v1.5.14` exists neither locally nor on `origin`, checked 2026-11-24).
- Nothing to design: work already merged, no software change requested.

## Workspace

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/release-v1.5.14`
- Branch: `codex/release-v1.5.14`
- Base: `origin/personal` @ `fab18b2068` ("docs(delivery): record private-github-packages-627 finalization on personal, no release"), fetched 2026-11-24; 70 commits after `v1.5.14-beta.10`, with the merges of autobyteus-628 (`98ae80dcff`) and autobyteus-627 (`d4d399418b`), both archived under `tickets/done/`. A newer `origin/personal` at cut time is allowed by the Task.
- Finalization target: `origin/personal`
- Ticket folder: `tickets/in-progress/release-v1.5.14/` (this file)

## The Task's direction, in its words (follow `RELEASE.md` strictly)

1. **Base:** Latest `origin/personal` (`fab18b2068` or newer if already fast-forwarded on `origin/personal` at cut time). Consolidates everything shipped since stable **`v1.5.13`** (all `v1.5.14-beta.1..10` work plus `autobyteus-628` [conversation order & single node clock] and `autobyteus-627` [private GitHub repos for Agent Packages & Skills]).
2. **Pre-tag gates:**
   - Secret / leak gate (`gitleaks` / `RELEASE.md` checks).
   - Full live `release_smoke.py` (with `AUTOBYTEUS_TEST_VAULT=~/.autobyteus-test/vault`).
   - **Waiver gate (STRICT):** Standing waiver covers **Grok usage-limit failures only** ("Waive grok if no usage limit anymore"). **Codex is NOT pre-waived** — if Codex hits its usage limit (expected before Nov 27, 7:43 AM), **pause before tagging and ask the founder directly for his explicit verbatim waiver** (and record it verbatim in the release report). Any non-usage-limit failure on any runtime also stops and asks the founder.
3. **Release notes (since stable `v1.5.13`):**
   - Start with **"What you need to do"**:
     1. **Docker nodes:** `v1.5.14` moves Docker `:latest` to **System level 2** (`chrome-vnc:1.4.2`) — existing Docker nodes need `autobyteus-docker upgrade --all` (preserves volumes & ports).
     2. **One-way conversion (`autobyteus-29`):** First start converts saved organization runs **one-way** — do not downgrade to `v1.5.13` or older afterward.
     3. **Update app & paired nodes together (`autobyteus-615`, `autobyteus-628`):** Update desktop/phone app and paired Docker/remote nodes together so unified message reference links and node-stamped conversation timestamps work across nodes.
   - Summarize all major user-visible features & fixes since `v1.5.13`.
4. **Build & publish all four workflows together:**
   - **Desktop Release:** GitHub Release **`v1.5.14`** published as **Latest** (NOT pre-release; verify `latest*.yml` after all six server packages).
   - **Docker:** both **`:latest`** and **`:beta`** move to **`v1.5.14`** (System level 2).
   - **Android** and **iOS** (TestFlight upload).
   - Never move or delete a published tag.
5. **Finalization:**
   - Record commit on `origin/personal`, fast-forward the founder's checkout (`git fetch` + `git merge --ff-only`), remove release worktree/branch/temp files, and save the verified record copy under `/Users/normy/autobyteus_org/autobyteus-delivery-records/release-v1.5.14-<taskId>-20261124/`.

## Notes from the Solution Designer

- **Waiver route:** if the smoke needs the founder's word (a Codex usage limit, or any non-usage-limit failure), report `Blocked` to the Solution Designer with the evidence and options, as in beta.10; I ask the founder in my conversation and relay his words verbatim. Do not tag before that.
- **Unsoaked work:** autobyteus-628 and autobyteus-627 were merged after beta.10 and ship in this stable without a beta. From the diff `v1.5.14-beta.10..fab18b2068`, no migration, Prisma, Docker, workflow or script file changed (only a new E2E test and ticket evidence mention Docker); confirm with the release guide's checks, and make sure their user-visible changes (628's node-stamped times; 627's private GitHub repositories) are in the notes.
- **Codex before stable:** beta.10's FU-001 recommended a passing Codex smoke before stable; the Task's strict waiver gate covers it: Codex passes, or the founder waives it in his own words.
- Beta.8/9 FU-001 (the macOS in-job signing/notarization retry) is still unfixed; the job-level rerun is the known recovery.
- Return `Delivery Completed` to the Solution Designer when the completion gates pass.
