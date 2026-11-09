# API/E2E Revision Record — phone-registered-folders-436 (autobyteus-436)

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Code Reviewer, `code-review-report.md` CRR-001 Pass, round 1 | SR-005, ARCH-REV-001, IR-001, CRR-001 | N/A | Pass / 95% |

## Revision Entries

### API-REV-001 — Baseline: node files on the phone, on a Docker node, and the preserved suites

- Triggering role, report path, and round: Code Reviewer (`code_reviewer_7e5608ab9b4746e0b613d7ffe65be112`), `code-review-report.md` CRR-001, API/E2E round 1, HEAD `ea51d4fddd`
- Triggering finding or case IDs: the handoff's "Still required": AC-005, AC-006; optional unreadable file, large PDF, remote run, C-03
- Related revision IDs: SR-005, ARCH-REV-001, IR-001, CRR-001
- Why this baseline was recorded: first API/E2E result
- Coverage decisions or durable test paths changed: baseline test fix in `autobyteus-web/tests/e2e/event-monitor-file-preview-probe.mjs` (`cf8035c849`)
- Cases added, changed, removed, or rechecked: R-IMP (reused), API-01 (full phone probe, run twice: run 1 cut off by an app restart), API-02/02b (Docker), API-03 (unreadable file), API-04 (desktop file probes), API-05 (server E2E + base comparison)
- Commands, environment, fixture, or broader-validation delta: test-owned image with this branch's server package; launcher with a temp state; scripted AGY CLI in a container; phone over Tailscale; base `97ed263074` in a temporary worktree

#### Prior Failure Resolution

None

- Canonical artifacts and sections updated: investigation, execution report, test progress log, `follow-ups.md` (FU-003, FU-004), evidence
- Prior result and confidence: N/A
- Current result and confidence: Pass, 95%
- New or remaining failure IDs: none in scope; pre-existing FU-003, FU-004
- Recommended owner: Code Reviewer (test-code review)
- Remaining risks, blocked evidence, or untested scope: C-03 (Windows), RSK-001 on a real phone, assumption 4 by spec only
