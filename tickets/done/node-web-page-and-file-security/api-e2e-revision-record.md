# API/E2E Revision Record

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Code reviewer, `code-review-report.md` CRR-001 `Pass`, round 1 | SR-003, ARCH-REV-002, IR-001, CRR-001 | N/A | `Pass` / 95% |

## Revision Entries

### API-REV-001 — Baseline: the four ways closed and every supported surface working, on real browsers, peers, Docker and the packaged app

- Triggering role, report path, and round: code reviewer, `code-review-report.md` (CRR-001 `Pass`), round 1.
- Triggering finding or case IDs: the open criteria the implementation handoff and code review left to API/E2E (AC-004, AC-006, AC-008…AC-013, the AR-002 check, the probe decision).
- Related revision IDs: SR-003, ARCH-REV-002, IR-001, CRR-001.
- Why this baseline was recorded: first API/E2E validation of `da207045a5`.
- Coverage decisions or durable test paths changed: none in the repository. Temporary probes are in the ticket's `probes/` (`api-*`, `desktop-steps/`).
- Cases: API-00 (reused IMP-02…IMP-13), API-01…API-16 (see the execution report's Cases).
- Commands, environment, fixture, or broader-validation delta: broader validation ran on four surfaces. The isolated packaged desktop instance (`iso-57276-63dd`) covered API-07…API-12. Electron dev mode with the `e2e` launch profile covered API-13. `pnpm dev` covered API-14. Probe-owned nodes, a test-owned Docker node and Host-preserving TLS proxies covered API-02…API-06. A sweep of 11 changed probes is API-15, and a fresh-clone release build is API-16.

#### Prior Failure Resolution

None.

- Canonical artifacts and sections updated: `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, `api-e2e-test-progress.md`, `follow-ups.md` (FU-002, FU-003, FU-004).
- Prior result and confidence: N/A.
- Current result and confidence: `Pass`, 95% (post-repository 74%).
- New or remaining failure IDs: none in this ticket. The out-of-scope probe defects are FU-003 and FU-004. FU-002 is a non-blocking peer-error wording issue the new refusal surfaces.
- Recommended owner: code reviewer (proportional review of the temporary probes), then delivery.
- Remaining risks, blocked evidence, or untested scope:
  - A real tailnet, a real company proxy and the phone wrappers on devices: only the user can check these.
  - A desktop node window opened by the Mac's own `.local` name could not be resolved by Chromium here (the class is proven node-to-node).
  - Live-provider probes were not run.
  - Signing, notarization and other platforms need the release runner.
