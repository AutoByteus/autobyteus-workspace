# API/E2E Revision Record — autobyteus-261 (Remote discovery)

| Revision | Trigger | Code validated | Investigation round | Result | Durable coverage | Key evidence | Next |
| --- | --- | --- | --- | --- | --- | --- | --- |
| API-REV-001 | CRR-001 pass of IR-001 (Medium / High) | `93dc932920` (docs `d7bcd1b768`) | 1 | **Pass, final confidence 95%** (post-repository 94%; no category below 90%). Two-server E2E 29/29 in runs 2 and 3; same-node suites 42/43 (only 191's pre-existing FU-003); real-model check on AutoByteus (DeepSeek) and Claude (haiku). C-1 not observed | Scripted CLI `LIST_TOOLS`; E2E RC-26 … RC-29 new; RC-04, RC-19, RC-20 updated; set-up (Brief Studio on beta, Plain Helper, Scout) | `api-e2e-execution-coverage-report.md`; `evidence/api-e2e/API-run2`, `API-run3`, `API-30/`, `API-31-…` | Code reviewer: proportional test-code review |

## API-REV-001 notes

- Run 1 had two test defects, both fixed before runs 2 and 3: an exclusion regex that matched "Codex Writer", and RC-19's old unknown-node text.
- FU-003 was added to `follow-ups.md`: Claude-runtime agents get the signed-in user's claude.ai connectors. It is pre-existing and outside this ticket.
