# API/E2E Test Review Report — automatic-app-node-updates (autobyteus-356)

> **Latest round: 2 (CRR-008), after API-REV-004 Pass on the merge `08984df524`: `Not Applicable`.** No repository test code changed in round 4.
> - `git diff --name-only 482e9ce797 a14d4dc0f5` outside `tickets/` is empty.
> - The new `evidence/API-356-layouts.mjs` emulates window widths over CDP and measures the row's card, cell and switch. It is a temporary harness, kept as evidence.
> - The re-check ran on a real test node: one POST answered 202; one "Updated automatically"; one window GET per row per refresh; the switch inside the server cell in all three layouts, with the wide cell at 256 px.
> - O-7 (a 6 s window where the notice shows the window's own "Updated to …" before the automatic line replaces it) is the same as round 1's IMP-08 (h). It is not new, and not a test-code matter.
> - Recipient: delivery engineer. Round 1's content below stands.

All ticket paths are under `/Users/normy/autobyteus_org/autobyteus-worktrees/automatic-app-node-updates/tickets/in-progress/automatic-app-node-updates/`.

## Review Meta

- Review Round: 1
- Trigger:
  - API/E2E engineer, API-REV-003 (round 3), `Pass`, final confidence 93.9%.
  - Code `2e64cbb3d9`, from a clean checkout of `99b53b84e8`; evidence `b1bd6cce78`.
- Requirements Doc Reviewed As Context: `requirements-doc.md` (SR-002, sharpened in SR-004)
- Investigation Notes Reviewed As Context: `investigation-notes.md`
- Solution Revision Record Reviewed As Context: SR-001 to SR-006
- Design Spec Reviewed As Context: `design-spec.md` (SR-006)
- Supplemental Task Artifacts Reviewed As Context: `follow-ups.md` (FU-001 to FU-005; FU-006 added here)
- Architecture Review Revision Record Reviewed As Context: ARCH-REV-001 to ARCH-REV-005 (edits uncommitted in the worktree; owned by the architecture reviewer)
- Implementation Revision Record Reviewed As Context: IR-001 to IR-003
- Original Code Review Report: `code-review-report.md` (CRR-001 to CRR-005)
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-006`
- Coverage Investigation: `api-e2e-coverage-investigation.md`
- Execution Coverage Report: `api-e2e-execution-coverage-report.md`
- API/E2E Revision Record Reviewed As Context: API-REV-001 to API-REV-003
- Delivery Revision Record Reviewed As Context: N/A
- API/E2E Result: `Pass` (API-REV-003)
- Final Validation Confidence: 93.9%
- Prior unresolved test-review findings rechecked: None
- Project testing guideline applied: `TESTING.md`. Isolated copies with their own bundle id, caches and temp data roots; the user's updater caches matched the baseline, and the user's nodes were untouched. No conflicts.
- Supported Product Scenario Basis Confirmed: `Yes` (SCN-A, SCN-B)

## Changed Durable Test Scope

Temporary harness and probes are evidence, not durable test code. That covers `evidence/API-356-journey.sh`, `API-356-staged.sh` and `API-356-sampler.mjs` (new this round), the earlier harness, and the seeded record used for API-13.

| Durable Test Path | Change | Related Scenario / Requirement | Coherent Test Responsibility | Notes |
| --- | --- | --- | --- | --- |
| — | — | — | — | API/E2E added, updated or removed no durable test in API-REV-001 to API-REV-003. `git diff --name-only 99b53b84e8 b1bd6cce78` outside `tickets/` is empty. |

- No durable test file changed: `Yes`
- Review result when no durable test file changed: `Not Applicable`
- The branch's durable tests are the implementation's, reviewed in CRR-001, CRR-003 and CRR-005.

### Evidence-quality note

The F-API-003 proof rests on `API-356-sampler.mjs`'s 500 ms samples of state, health and the busy marker. The samples show the claims directly:

| Case | Wait | Server health | Stop to quit | Result |
| --- | --- | --- | --- | --- |
| API-02B-r3 (idle) | 36.3 s | 200 throughout | 0.1 s | V2 with `AUTO_UPDATED` |
| API-02D-r3 (load up to ~400) | 81 s | 200 throughout | 0.1 s | V2 with `AUTO_UPDATED`, no false failure |

They are outcome measurements, not proxies.

API-13's bound failure comes from a **seeded** record, because a live 15-minute bound was not reachable: every real native fetch answered or errored. So it proves the rendering and the no-retry rule, not the timer firing live. The timer is unit-tested (`appUpdaterAutomaticMac.spec.ts:171`).

## Proportional Test-Code Checks

N/A: no durable test changed during API/E2E.

## Findings

None.

## Follow-ups

- Added **FU-006** (O-6). The earlier hold CR-C19 is now resolved:
  - Squirrel **does** answer a second fetch once the first has finished (API-12a, API-12b, API-12c), so a good update does not hang for 15 minutes.
  - A second fetch that **overlaps** a running one fails cleanly (API-11b, API-11c: `ditto: … update.ORITSy2/… No such file or directory`), and blocks that version from automatic install. The server stays up, a click and a newer version still install, and nothing stops.
  - The design review predicted this as N-19 and called a fix not required. It needs a switch-off download, a check and a switch-on, all within Squirrel's ~36–80 s, so it is recorded as a follow-up, not a finding (Principle 6: two individually supported actions within seconds).

## Latest Authoritative Result

- Result: `Not Applicable` (pass to delivery)
- Changed durable test paths reviewed: none
- Unresolved finding IDs: None
- Recommended Recipient: delivery engineer
- Notes:
  - Code under delivery is the branch head through `2e64cbb3d9` (IR-001 to IR-003).
  - The architecture reviewer's edits to `design-review-report.md` and `architecture-review-revision-record.md` are still uncommitted in the worktree; delivery should get them committed by their owner, or confirm their status.
  - A Developer ID signed install is user-only (the first real update on the user's machine). Windows and Linux are not tested.
