# API/E2E Revision Record

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Code Reviewer, `code-review-report.md` CRR-001 Pass, round 1 | SR-002, IR-001, CRR-001 | N/A | Fail / 93% |

## Revision Entries

### API-REV-001 — Baseline: every surface proven; F-1, a same-size same-time replacement keeps the old version

- Triggering role, report path and round: Code Reviewer, `code-review-report.md` (CRR-001 Pass), round 1, code
  `950061c296`.
- Triggering finding or case IDs: none (baseline). The reviewer's C-2 (an input `avatarUrl: null` now clears) and held
  C-3 (no retry on the phone).
- Related revision IDs: SR-002, IR-001, CRR-001.
- Coverage decisions or durable test paths changed:
  - new `autobyteus-server-ts/tests/e2e/agent-definitions/definition-avatars-github.e2e.test.ts` (AV-01, AV-02);
  - `definition-avatars-probe.mjs`: D-002, D-003 (C-2 through the agent and team forms), P-002, P-003 (C-3 measured);
  - new `mobile-definition-avatar-cases.mjs`: MSP-121 (a peer row's fallback), run by `mobile-shell-probe.mjs`.
- Cases: API-001…018.
- Commands, environment, fixture or broader-validation delta:
  - the whole server e2e suite needs `test:integration:prepare` (Brief Studio) and a HOME that is a real path (the
    terminal spec compares `$PWD`);
  - the prepare's build folders were removed after the run.

#### Prior Failure Resolution

None.

- Canonical artifacts and sections updated: coverage investigation, execution report, progress log, follow-ups (FU-001),
  `evidence/api-e2e/`.
- Prior result and confidence: N/A.
- Current result and confidence: `Fail`, 93%.
- New or remaining failure IDs:
  - F-1: a package update that replaces a picture with one of the same size and the same whole-second time keeps the old
    address version. Clients revalidate to 304 and keep the old picture. This is design S-1 N-3's change signal, pinned
    by its unit spec;
  - FU-001 (base).
- Recommended owner: `/code_reviewer` (failure-origin review). Preliminary: `Design Impact`, with a small local fix in
  view.
- Remaining risks:
  - C-3 is measured as CRR-001 describes it: no recovery without a definition change or a reload. The fallback is
    correct, so the picture is only absent.
