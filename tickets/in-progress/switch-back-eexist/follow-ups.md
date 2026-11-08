# Follow-ups — switch-back-eexist

Considered and not raised: a user-readable message instead of the raw EEXIST text; the failure was a defect, not a state a message should explain.)

| ID | Found by | What is wrong, where | Evidence | Why outside this ticket | Urgent | Suggested Task | Sent |
| --- | --- | --- | --- | --- | --- | --- | --- |
| FU-1 | API/E2E engineer, round 1 | `tests/e2e/projects/delegated-copy-model-change.e2e.test.ts` DCM-009 failed once: its last assertion, the stop of the copy after the Grok switch, returned `success: false` (message not captured). Run with the same command (private HOME, three e2e files in one vitest run) it then passed nine times in a row, and alone with the documented real-HOME command and with a private HOME. Cause not established. | `evidence/api-e2e/API-05-regression-agy-and-delegated-copy.log` | Fails after every assertion of this ticket's behavior (the Antigravity capsule is not involved in the copy's Grok era); one occurrence in about eleven runs | No | Capture the stop result's `message` and `outcome` when it next fails (a test that prints them is a one-line change), then find the cause | Not sent (single occurrence) |

