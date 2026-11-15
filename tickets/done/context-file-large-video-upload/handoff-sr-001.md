# Handoff SR-001 — limit recommendation before design (autobyteus-workspace-6)

- Package: `context-file-large-video-upload`; Project Task `autobyteus-workspace-6`
- From: Solution Designer (team coordinator, run `solution_designer_3855b5503ff54c0a9697dac79468a30b`)
- To: `/project_task_manager` (run `project_task_manager_89e33a2ea30f422fab0407e4dc2b13bb`), the requester
- Why now: the Task says "the manager decides the product numbers under the user's delegation, report your recommendation first if it changes limits materially". It does.
- Status: requirements `Ready for Approval` (SR-001). Architecture design starts when the number is answered. Nothing implemented.
- Worktree: `/Users/normy/autobyteus-org/autobyteus-task-worktrees/context-file-large-video-upload`, branch `task/context-file-large-video-upload`, base `origin/personal` @ `3d738de6e`; finalization target `origin/personal`, no release.

## Decision needed (DEC-001)

Default size limit for **video and audio** context files.

**Recommendation: 2 GiB (2048 MiB)**, configurable per node with `AUTOBYTEUS_CONTEXT_FILE_MEDIA_MAX_MB` (range 1–10240). Other file types keep **25 MiB**, configurable with `AUTOBYTEUS_CONTEXT_FILE_MAX_MB` (range 1–1024). Both also editable in the node's server settings, applied to the next upload without restart.

Reasoning:
- Current Android phones record about 130 MB per minute at 1080p and 350–400 MB per minute at 4K. 500 MiB is about 4 minutes of 1080p or 1.3 minutes of 4K; 1 GiB about 8 / 2.5 minutes; 2 GiB about 16 / 5 minutes. Telegram and WhatsApp documents allow 2 GB, so users expect it.
- A high ceiling costs nothing unless used: the upload streams with constant memory (measured: 600 MiB, server RSS peak 180 MiB), an aborted or refused upload leaves no file (reproduced), there is no proxy or timeout in the chain (Fastify has no request timeout; Electron and the Android app talk to the node directly; the nginx image serves static files only), and the web will refuse an over-limit file before sending any bytes.
- The only cost is disk on the node; the owner can lower the limit.
- Why other types stay at 25 MiB: images are base64-inlined into model requests; text and documents above 25 MiB are rare; keeping it changes nothing that works today.

If you prefer 500 MiB or 1 GiB, say the number; nothing else in the plan changes.

## Findings (all verified)

- Reproduced the user's message: the real upload route with the production multipart setup answers a 26 MiB mp4 with `400 {"detail":"Uploaded file is too large."}`, and the web prints `无法附加 {{name}}。` followed by that raw detail — exactly the screenshot.
- The chain that would block bigger files after raising the constant: only the policy constant and the one global multipart `fileSize` registration (which also governs the avatar route `/upload-file`, so the context routes will get their own per-request limit and the avatar route stays at 25 MiB). No body-size, timeout or buffering limit elsewhere (desktop and phone use the same route and component).
- Agent safety: every runtime gives the agent the absolute path of the file (`Reference files:`). Codex, Claude, Antigravity and ACP send video as a path only. The native `autobyteus` runtime on Gemini models base64-inlines video and audio into every request of the run; a large video would exceed Gemini's 100 MB inline limit or Node's string limit and break the run. Plan: local media above 25 MiB is never inlined (path kept); media up to 25 MiB is handled exactly as today.
- Project Task context files (web composer and `create_task` / `update_task` `context_files`) share the same policy; they follow the new per-type limits and the tool text drops the fixed "25 MiB".

## Urgent follow-up you may want as its own Task now (FU-001)

Memory Sync (opt-in, off by default) reads every memory file whole and sends it base64 in JSON batches of up to 25 files with no byte budget; the hub accepts 50 MiB per batch, and one failing batch fails the whole sync. Final attachments live in the synced folders, so on a node with Memory Sync on, one attachment above about 37 MiB (or two 25 MiB ones in a batch, already possible today) stops all syncing. I do not change Memory Sync in this ticket (other feature; the attach journey does not depend on it). Suggested Task: "Memory Sync: sync large files safely — byte-budgeted batches below the hub limit, streamed/chunked file transfer instead of whole-file base64, and a decision whether run attachments above a size are synced, skipped with a visible reason, or sent another way; one failing file must not stop the rest." FU-002 and FU-003 (minor) are in `follow-ups.md` and will be sent with the final result.

## Documents

- `requirements-doc.md` (SR-001, Ready for Approval; DEC-001 open, DEC-002..DEC-009 decided)
- `investigation-notes.md`
- `solution-revision-record.md`
- `follow-ups.md`
- `probes/large-upload-probe.integration.test.ts.txt`, `probes/probe-results-2026-11-15.txt`

All under `/Users/normy/autobyteus-org/autobyteus-task-worktrees/context-file-large-video-upload/tickets/in-progress/context-file-large-video-upload/`.

## Expected next action

The manager answers DEC-001 (the number, or "use the recommendation"), and says whether FU-001 becomes its own Task now. The Solution Designer then records approval, designs, classifies and routes the package by the team's rules.

## Route record

- Handoff rules checked 2026-11-15: no rule covers a pending requirements decision (all rules need Architecture Design Complete, Release Requested or a delivery receipt gap).
- Sent per the Task's instruction ("report your recommendation first") with `send_message_to` to run `project_task_manager_89e33a2ea30f422fab0407e4dc2b13bb`: delivered. Holding at `Ready for Approval` until the answer.
