# API/E2E Revision Record — agent-run-termination-extraction

## Revision Index

| Revision ID | Trigger | Related Upstream IDs | Prior | Current |
| --- | --- | --- | --- | --- |
| API-REV-001 | `code_reviewer` CRR-001 Pass | SR-003, ARCH-REV-001, IR-001, CRR-001 | N/A | **Pass / 94%** |

## Revision Entries

### API-REV-001 — Behavior-neutral refactor validated live; pre-existing busy-quit leak found

- Triggering role, report path, and round: `/code_reviewer`, `code-review-report.md`, CRR-001.
- Cases T-01 to T-09 (see the ledger).
- Durable coverage changes: none.

#### Prior Failure Resolution

None.

- Result: **Pass, 94%**. New failure IDs: none for this ticket.
- Separate pre-existing defect: app quit or server SIGTERM with a busy Codex turn leaves the server and agent processes orphaned until the turn ends. It is base-identical. Recommended as a new ticket.
- Remaining risks: the defect above; base-identical model flakiness; the F-4 rejection path was not exercised live.
