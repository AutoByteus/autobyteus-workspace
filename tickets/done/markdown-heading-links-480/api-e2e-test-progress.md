# API/E2E Test Progress — autobyteus-480

- Execution coverage report: `api-e2e-execution-coverage-report.md`
- Planned cases: the coverage investigation's Planned Cases (same case IDs)

| Time | Case ID | Event | Result | Note |
| --- | --- | --- | --- | --- |
| 06:00 | API-01 | Checkpoint | Reused | IMP-01…03 ran on `45e456b8b0`; only documents changed since (`0afe5ee975`) |
| 06:05 | API-02 | Completed | Pass | `build:mobile-web` from `0afe5ee975`, exit 0; `user-content-` in the bundle; server `dist` (06:00) newer than server source (2026-11-11) |
| 06:13 | MSP-44…46 | Started | — | debug run (not evidence): `--cases=MSP-44,MSP-45,MSP-46 --output-dir=/tmp/api480-dev-1` |
| 06:15 | MSP-44…46 | Completed | Fail (debug) | setup: no `REPLY:` answer. The probe's nodes run the scripted CLI's `linked_skills` case: a plain message gets "OK", and every echo is JSON-quoted. Changing the shared fixture would be a foundation change (TESTING.md), so the Markdown comes from another agent instead: a delegator's `send_message_to` (rendered by `InterAgentMessageSegment` → `MarkdownRenderer`) |
| 06:24 | MSP-44…46 | Completed | MSP-44 Pass, MSP-45 Pass, MSP-46 Fail (debug) | MSP-44/45: 25 of 25 anchors at offset 0 on the Files panel, the phone viewer and the Skills page. MSP-46: the task description shows as a plain-text notice, not Markdown → both Markdown messages are `send_message_to`; target `.inter-agent-content`; the delegated row's phone key is `agent:<host>/…` |
| 06:30 | MSP-46 | Completed | Pass (debug) | each entry scrolls within its own message on both surfaces; Enter; nothing for broken/relative; external 1 tab; mailto not prevented |
| 06:32 | API-04 | Completed | Fail as expected (red on base) | MSP-45 with base `MarkdownRenderer.vue` and `useMarkdownSegments.ts` (restored afterwards): 0 of 25 reached, 25 new tabs |
| 06:33 | API-03 | Started | — | full phone probe at `524e4f9be7` → `evidence/API-03-mobile-shell-probe/` |
| 07:02 | API-03 | Completed | Pass | 46 of 46 Pass; MSP-44: desktop and phone 25 of 25 reached, URL unchanged, 0 new tabs; MSP-45: 25 of 25 on `/skills`; MSP-46: own message's heading at offset 0 on both, the other message's out of view, Enter, external 1 tab, mailto not prevented; `unknownBrowserErrors 0`; cleanup clean |
