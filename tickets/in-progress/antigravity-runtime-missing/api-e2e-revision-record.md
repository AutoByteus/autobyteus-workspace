# API/E2E Revision Record
The canonical coverage investigation and execution report remain authoritative; this history is a delta locator.

## Revision Index
| ID | Trigger / upstream | Prior result / confidence | Current result / confidence |
| --- | --- | --- | --- |
| API-REV-001 | Implementation Complete / IR-001 / approved SR-003 | N/A / N/A | Fail (API-ENV-001) / 92.1% |

## API-REV-001 — Initial Version-Independent AGY Validation
- Round 1, 2026-09-27; triggering implementation-handoff.md / IR-001, source f590519ec and handoff 95637e21d. Related SR-003; ARCH-REV/CRR/DR N/A — not applicable. Triggering finding IDs N/A (initial baseline).
- Initial investigation, ledger and final execution report created in this ticket. Prior result/confidence N/A; no prior round inferred.
- API-001–006 all functionally pass. Focused backend 87, broad runtime final 68, frontend 19, controlled transport 2, installed factory restore 1, live tools/skill 2. Counts overlap discovery; do not sum as unique tests.
- Durable updates: agy-restore-live.test.ts (immutable bytes, current evidence, cleanup); codex-app-server-client.test.ts (strict env value assertion instead of obsolete reference equality). No source changes/removals. Initial Codex failure resolved within this round; evidence retained.
- Broader validation Required and completed: real installed 1.2.12 create/restore, workspace tools/skill, built API and unchanged rendered team selector with model and enabled launch draft.
- New finding API-ENV-001: initial owned backend inherited production SQL URL despite temporary data-dir. Stopped on detection, user notified, reran with explicit isolated SQL target. No pending schema migration logged, but absence of prior snapshot means zero SQL side effects unproven. Corrected rerun does not imply no original impact.
- Final score mean 92.1%; environment 75% prevents Pass; no AGY source defect identified. Result Fail / Local Fix (API-owned environment), pending focused failure-origin review. Medium/Low direct classification retained; this is not successful-test review or delivery.
- Cleanup complete for owned local processes/temp data, logs retained; provider synthetic metadata may remain. Installed app process not restarted/patched; production DB non-impact not claimed.
- Prior failure resolution: None (no prior completed round). Within-round Codex assertion resolved, initial browser harness retries resolved, API-ENV-001 unresolved.
- Canonical files: api-e2e-coverage-investigation.md; api-e2e-test-case-ledger.md; api-e2e-execution-coverage-report.md. Evidence: evidence/api-e2e/environment-incident.md and referenced logs/JSON/screenshot.
- Recommended recipient: Code Reviewer for focused failure-origin review; exact route subject to get_handoff_rules.
