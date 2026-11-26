# API/E2E Revision Record — autobyteus-516

The latest coverage investigation ([api-e2e-coverage-investigation.md](api-e2e-coverage-investigation.md)) and execution coverage report ([api-e2e-execution-coverage-report.md](api-e2e-execution-coverage-report.md)) are authoritative.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Code reviewer, code-review-report.md, CRR-002 Pass | SR-006…SR-008, ARCH-REV-002, IR-002, CRR-002 | N/A | Pass / 95% |

## Revision Entries

### API-REV-001 — Stage 1 validated through the packaged desktop, a Docker node and real Voice Input

- Triggering role, report path, and round: `/code_reviewer`, `code-review-report.md` (CRR-002, Pass), round 1.
- Triggering finding or case IDs: the handoff's and review's open items: AC-003 through the page, AC-004, AC-008 (packaged), AC-009, AC-010, QR-002, the packaged attacher and `file://` origin (AR-003), the launch-profile probe after IR-002, the iOS demo build.
- Related revision IDs: SR-006, SR-007, SR-008; ARCH-REV-002; IR-001, IR-002; CRR-001, CRR-002.
- Why this baseline was recorded: first API/E2E round.
- Coverage decisions or durable test paths changed:
  - `autobyteus-web/tests/e2e/extensions-page-probe.mjs`: U1/U2 update cases (AC-003).
  - `composer-voice-lifetime-probe.mjs` + fixture page, `projects-voice-cases.mjs`: `GetExtensions` answered at the network (stale because of this ticket's window-start read).
  - Baseline fix (c322d76964): `projects-feature-probe.mjs` PT-E2E-005 localized attach text; `projects-voice-cases.mjs` microphone grant and B-003 Task title.
- Cases added: API-01…API-15 and reused API-R1…API-R7 (investigation's Planned Cases).
- Commands, environment, fixture, or broader-validation delta: packaged isolated instances with a development catalog through the data root's own `.env`; a test-owned linux-arm64 Docker node with this worktree's server package; temporary probes in `probes/api-e2e/`.

#### Prior Failure Resolution

None.

- Canonical artifacts and sections updated: investigation (new), report (new), progress log (new), `follow-ups.md` (FU-004).
- Prior result and confidence: N/A
- Current result and confidence: Pass, 95%.
- New or remaining failure IDs: none in scope. FU-004 (PT-E2E-017 under load, outside this ticket).
- Recommended owner: `/code_reviewer` for proportional test-code review.
- Remaining risks, blocked evidence, or untested scope: OS-level window focus delivery for AC-009 (listener, surface reopen and stale press proven); production catalog key (release blocker with the Solution Designer); Linux/Windows/Intel desktop builds only through the build-only run (API-15).
