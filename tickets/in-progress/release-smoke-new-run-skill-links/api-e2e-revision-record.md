# API/E2E Revision Record

The coverage investigation and execution coverage report remain authoritative; this records each completed round.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Implementation engineer, `implementation-handoff.md` (IR-001), round 1; resumed by the Solution Designer 2026-10-29 | SR-001 (+ addendum), IR-001 | N/A | Blocked / 92.5% |
| API-REV-002 | Implementation engineer, `implementation-handoff.md` (IR-002), round 2 | SR-003, SR-004, IR-002 | Blocked / 92.5% | Pass (user-accepted gap) / 94% |

## Revision Entries

### API-REV-001 — Baseline: release smoke validated except one green run (Codex quota)

- Triggering role, report path, and round: `/software_engineering_team/implementation_engineer`, `implementation-handoff.md` IR-001, round 1. Resumed 2026-10-29 by `/software_engineering_team/solution_designer`.
- Triggering finding or case IDs: N/A (baseline)
- Related revision IDs: SR-001 (scope and the documented RELEASE.md step confirmed by the user in the addendum; requirements unchanged), IR-001
- Why this baseline was recorded: first completed API/E2E result
- Coverage decisions or durable test paths changed: none. All implementation-added coverage `Still Valid`.
- Cases added, changed, removed, or rechecked:
  - Reused: API-01/02/03/07 (IMP-01/02/04/05/08).
  - New: API-04 doc review; API-05 regression mutation (the beta.2 code reintroduced temporarily, detected); API-06/06b signed-out CLIs; API-08 full run on the head.
- Commands, environment, fixture, or broader-validation delta: `python3 scripts/release_smoke.py`, run from the repository root on the release machine. Throwaway HOMEs for the signed-out runs.

#### Prior Failure Resolution

| Prior Case / Failure Reference | Previous Classification | Current Resolution | Case IDs Now Proving It |
| --- | --- | --- | --- |
| IMP-07: Grok brand-new team member and different same-named skill hit HTTP 429 `free-usage-exhausted` | External quota (implementation) | Both pass at the head after the baseline fix `8e65be9e6f` | API-08 |

- Canonical artifacts and sections updated: coverage investigation (API-06b, observations), execution coverage report (all sections), `follow-ups.md` (FU-001, FU-002), evidence API-04/05/06/06b/08
- Prior result and confidence: N/A
- Current result and confidence: `Blocked`, 92.5%
- New or remaining failure IDs: none. AC-001 is blocked by the Codex account usage limit, which resets 2026-11-04 07:11Z.
- Recommended owner: the user, through the Solution Designer: Codex usage, or a decision on AC-001's evidence
- Remaining risks, blocked evidence, or untested scope: AC-001 has no single green run. Live CLI subscription quotas can block a real release check (FU-002). The signed-out Grok reason text is misleading (FU-001).

### API-REV-002 — RELEASE.md cost wording rechecked; AC-001 accepted by the user

- Triggering role, report path, and round: `/software_engineering_team/implementation_engineer`, `implementation-handoff.md` IR-002, round 2 (2026-10-29)
- Triggering finding or case IDs: FU-002 (taken into this ticket, SR-002/SR-003); AC-001 verification basis (SR-004)
- Related revision IDs: SR-003, SR-004, IR-002 (`f9d1db2aa0` RELEASE.md, final commit `32ec7773d4`)
- Why this revision was recorded: the docs-only revision and the user's acceptance complete the round 1 result
- Coverage decisions or durable test paths changed: none
- Cases added, changed, removed, or rechecked: API-04 rechecked on `32ec7773d4` (Pass). Every executed case stays valid under TESTING.md "Rerun by impact": outside the ticket folder, only `RELEASE.md` changed since `8f37ab5eb8`.
- Commands, environment, fixture, or broader-validation delta: no execution; doc review only (ENV-4)

#### Prior Failure Resolution

| Prior Case / Failure Reference | Previous Classification | Current Resolution | Case IDs Now Proving It |
| --- | --- | --- | --- |
| API-08: Codex 3 cases refused by the account usage limit (AC-001 Blocked) | External quota (`Blocked`) | Accepted by the user (SR-004): "we can accept that the credit is not there and only codex app server is not tested … i will personally accept it"; "i waive that this time we we pass". Codex 3/3 from IMP-07 stands | IMP-07, API-08 (Codex run start up to the provider turn) |

- Canonical artifacts and sections updated: execution report (Round, environments, API-04, Acceptance-Criteria Proof, scorecard, decision, result), `evidence/API-04-doc-review.md` (round 2 section), progress log
- Prior result and confidence: `Blocked`, 92.5%
- Current result and confidence: `Pass` with a user-accepted gap, 94%
- New or remaining failure IDs: none
- Recommended owner: delivery engineer
- Remaining risks, blocked evidence, or untested scope: Codex has no pass at the head. Until 2026-11-04 07:11Z the release smoke check on a tag commit shows Codex FAIL and needs the user's recorded waiver at the release decision. FU-001 stays a follow-up.
