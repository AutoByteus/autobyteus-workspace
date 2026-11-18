# API/E2E Test Progress — phone-registered-folders-436 (autobyteus-436)

- Execution coverage report: `tickets/in-progress/phone-registered-folders-436/api-e2e-execution-coverage-report.md`
- Planned cases: the coverage investigation's Planned Cases (same case IDs)

| Time | Case ID | Event (`Started`/`Checkpoint`/`Completed`) | Result (`Pass`/`Fail`/`Blocked`/`Not Tested`) | Note (what is running and where, what to do next) |
| --- | --- | --- | --- | --- |
| 2026-11-09T04:32:30Z | API-01 | Started |  | full phone shell probe at ea51d4fddd |
| 2026-11-09T04:40:15Z | API-01 | Completed | Not Tested | run 1 cut off by the app restart after MSP-12 started (MSP-01…11 Pass so far); no process left; its temp root removed; rerun |
| 2026-11-09T04:40:15Z | API-01 | Started |  | run 2, full phone shell probe at ea51d4fddd |
| 2026-11-09T04:57:24Z | API-01 | Completed | Pass (cases) | run 2: MSP-01…23 all Pass; probe exit 1 on 28 unknown 'phone' 401 lines during MSP-21…23: the revoked original phone keeps polling /graphql and run sockets without a credential after MSP-13 (alpha log 461-544); not this branch (transport untouched) -> follow-up |
| 2026-11-09T04:57:24Z | API-02 | Started |  | /tmp/abtest436/api02.sh: server package, test image, launcher new-container, phone probe |
| 2026-11-09T05:06:09Z | API-02 | Checkpoint |  | launcher container: route checks Pass; phone run 1 waited for the run list (empty node) -> probe bug; deep link to Files without a run does not render (Files needs an open run) -> conversation journey API-02b on a scripted container; launcher container removed |
| 2026-11-09T05:06:09Z | API-02b | Started |  | scripted Docker node, conversation taps |
| 2026-11-09T05:07:26Z | API-02b | Completed | Pass | run 2 (run 1: probe's folder link had no file-like name) |
| 2026-11-09T05:07:26Z | API-03 | Started |  | unreadable file on a host node |
| 2026-11-09T05:09:25Z | API-03 | Completed | Pass | run 2: 400 NODE_FILE_UNREADABLE; phone 'The file preview could not be opened.'; log line = access-log URL of refused requests (existing policy, QR-001) |
| 2026-11-09T05:09:25Z | API-04 | Started |  | desktop file probes |
| 2026-11-09T05:24:23Z | API-04 | Completed | Pass | search-pdf-preview, file-explorer-pending-save-draft pass; event-monitor-file-preview N-009 401 (probe's own read to the packaged node without the credential, stale since 437) -> baseline test fix (read through the app window), rerun all N-cases Pass |
| 2026-11-09T05:24:23Z | API-05 | Started |  | server E2E suite, clean env |
| 2026-11-09T05:43:47Z | API-05 | Checkpoint | Fail | 15 files fail (51 tests): every failure a 401 / MCP_GATEWAY_TOKEN_REQUIRED on routes this branch does not touch -> base comparison |
| 2026-11-09T05:48:51Z | API-05 | Completed | Pass (in scope) | 106 files pass incl. node-files and the workspace/node-access/remote-access suites; 15 files fail identically on base 97ed263074 -> FU-004 (pre-existing, outside this ticket) |
