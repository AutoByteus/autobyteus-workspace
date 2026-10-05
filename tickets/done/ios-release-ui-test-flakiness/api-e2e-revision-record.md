# API/E2E Revision Record

The latest coverage investigation and execution coverage report remain authoritative.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | implementation_engineer / implementation-handoff.md / round 1 | SR-002, IR-001 | N/A | Fail (AC-I3: 3 passes, then failure at CI-4) |
| API-REV-002 | implementation_engineer Local Fix (IR-002) for CRR-001 F-001 / round 2 | SR-002, IR-002, CRR-001 | Fail | Pass / 96 % |

## Revision Entries

### API-REV-001 — Baseline validation; CI series failed at run 4

- Trigger: implementation_engineer "Implementation Complete", implementation-handoff.md, round 1 (IR-001, c314aa98c).
- Coverage changes: none by API/E2E.
- Cases: CFG-1, L1–L5, CI-1..CI-4 (CI-5..10 not run).
- Execution: pushed the feature branch only; 4 sequential dispatches with publish=false (publish jobs skipped in all).

#### Prior Failure Resolution

None (baseline).

- Current result: **Fail**.
- Failure ID F-1 (CI-4, run 37276561512): the unreachable-diagnostic UI test failed because the HTTP acknowledgement switch tap did not take effect on a slow hosted simulator (switch value 0 at failure). Connect therefore showed the acknowledgement warning and never attempted the connection.
- Preliminary classification: `Local Fix` (UI test should verify the switch value after tapping). Recommended owner: implementation_engineer, via failure-origin review.
- Remaining:
  - CI-5..10 not run.
  - User concern (2026-10-05): the 10-run series duration (~2–3 h hosted macOS). The run count for the rerun should be confirmed with the user or solution_designer.

### API-REV-002 — Re-validation after the switch-confirmation fix (IR-002)

- Trigger: implementation_engineer "Local Fix complete" (IR-002, commit 8d3cb19ea), resolving code_reviewer CRR-001 F-001.
- Coverage changes by API/E2E: none.
- Local: delay 0 both tests pass (20.8 / 14.6 s); delay 7 s passes (32.6 s); no-server negative still fails (swift:106/108).
- CI method change, approved by the user (2026-10-05). The user rejected the ~2 h sequential series ("please go ahead … lightweight … instead of two or more than two hours").
  - The 10 dispatches ran in parallel, each with a distinct dummy `release_tag` input (v0.0.0-ci1..10; no git tag created) and `release_ref` = the fix branch, so each got its own concurrency group.
  - publish_app_store_connect=false; the dry run of the metadata script confirmed publish_requested=false and the branch ref.
  - This keeps AC-I3's 10 first-attempt passes and no-publish conditions. The runs are independent hosted runs, not sequential ones.

#### Prior Failure Resolution

| Prior | Classification | Resolution | Evidence |
| --- | --- | --- | --- |
| F-1 (CI-4 run 37276561512: switch tap had no effect) | Local Fix (confirmed by CRR-001 F-001) | Resolved: the test now confirms the switch is on (bounded re-tap, never toggles off) and that the input holds the URL before Connect; 10/10 CI passes including a 136 s fake-node run and a 65.5 s unreachable run | ci-r2-results.jsonl, ci-r2-ui-durations.txt |

- Current result: **Pass**, 10/10 attempt-1 successes (runs 37285707436 … 37285740945), publish jobs skipped in all.
- Remaining: none blocking. Remote branch `codex/ios-release-ui-test-flakiness` is pushed (for delivery).
