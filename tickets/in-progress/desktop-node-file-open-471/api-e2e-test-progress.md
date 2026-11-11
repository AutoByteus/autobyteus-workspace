# API/E2E Test Progress — desktop-node-file-open-471 (autobyteus-471)

| Time (UTC) | Case ID | Event | Result | Notes |
| --- | --- | --- | --- | --- |
| 2026-11-11T13:19:43Z | API-03 | Started | — | packaged build (--build) + event-monitor-file-preview, HEAD 08d804cbb9 |
| 2026-11-11T13:21:50Z | API-03 | Checkpoint | run 1 not completed | build stopped: pnpm under the temp HOME wanted to remove node_modules (ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY); harness cause; rerun with the real HOME |
| 2026-11-11T13:32:18Z | API-03 | Checkpoint | run 2 Fail (N-003, probe timing) | N-003 asserted tab focus one poll before the handler's setTimeout-0 focus; baseline fix 32dccf58fa; rerun --skip-build |
| 2026-11-11T13:32:50Z | API-03 | Completed | Pass | run 3 (--skip-build, probe 32dccf58fa): N-001…N-009 Pass; focusAfterContentMs N-002 2, N-003 1; cleanup dataRootRemoved, ports released |
| 2026-11-11T13:32:50Z | API-01 | Started | — | test image build (buildx server-package of this worktree) |
| 2026-11-11T13:43:10Z | API-01 | Checkpoint | nodes ready | setup run 1: delegation never answered (the scripted CLI's @modelcontextprotocol/client is not resolvable in the container) and the image's server runs as root (mode 000 readable); run 4: CLI with its own client package, device link for the refusal; A 127.0.0.1:59343, B paired, remote run created |
| 2026-11-11T13:46:43Z | API-01 | Checkpoint | desktop connected | iso-59405-31d0 connected to docker-a-471 by setup code (Server 1.5.13-beta.4); A's window shows the run and the remote run; 8 links rendered; D3 next |
| 2026-11-11T13:57:21Z | API-01 | Completed | Pass | D3: 8 paths in A's window: md/png/pdf/wav open read-only via node-file 200; inside-folder as workspace file; 404/400/400 reasons; D4: every store object URL revoked on close (pdf.js worker URLs not, pre-existing) |
| 2026-11-11T13:57:21Z | API-02 | Started | — | remote run (host-b-471) in A's window |
| 2026-11-11T14:06:06Z | API-02 | Completed | Fail | D5/D6: remote run link -> 278 text 'That file is on host-b-471: open the run in that node's window to see it.' (AgentEventMonitor.vue:100 short-circuit), not REQ-003's; remote path attachment -> GET node-files on node A for B's path (404, hidden tab), no message (F-1, F-2) |
| 2026-11-11T14:06:06Z | API-01 | Checkpoint | Fail found | D7-D9: path attachment outside the run folder opens the node file editable (mode edit, accessIntent null); Cmd+S sends WriteFileContent, node refuses, no error shown (F-3). Stack stopped and removed |
| 2026-11-11T14:06:06Z | API-04 | Started | — | file-explorer-pending-save-draft, search-pdf-preview |
| 2026-11-11T14:09:06Z | API-04 | Completed | Pass | file-explorer-pending-save-draft PSD-001..011 Pass; search-pdf-preview run 1 API-003 Fail (probe read content before the 450 re-read) -> baseline fix b49b5c539f; run 2 API-002, API-003 Pass |
| 2026-11-11T14:09:06Z | API-05 | Started | — | full mobile-shell probe, clean env |
| 2026-11-11T14:09:22Z | API-05 | Checkpoint | not started | first command used '--output-dir <dir>'; the probe takes '--output-dir=<dir>' and stopped at argument parsing, before any case; rerun |
| 2026-11-11T14:10:44Z | API-05 | Checkpoint | not started | run 1 stopped before any case: 'Build the phone bundle first' (the packaged build replaced dist-mobile); rebuilt (API-05-mobile-web-build.log); rerun |
| 2026-11-11T14:37:26Z | API-05 | Completed | Pass for this ticket's cases; 3 out-of-scope fails | run 2 (bundle rebuilt): 35/38 Pass incl. MSP-16, 28-31, 37, 38; MSP-24/34/35 Fail: after a closed Task is set back to TODO the node no longer lists it closed but no phone/desktop list shows it again (469 task-tree model) -> FU-003 |
| 2026-11-11T14:39:00Z | — | Round result | Fail | F-1, F-2 (AC-003), F-3 (REQ-001 read-only); report and revision record API-REV-001 written |
