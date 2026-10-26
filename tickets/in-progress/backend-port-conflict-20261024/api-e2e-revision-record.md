# API/E2E Revision Record

## Revision Index
| Revision | Trigger | Upstream | Prior result/confidence | Current result/confidence |
|---|---|---|---|---|
| API-REV-001 | CRR-002 entry, user pause/resume, CRR-003 cumulative R2 review | R2/D4.1;SR-001..008;ARCH-REV-004;IR-004;CRR-003 | N/A | Pass executable-validation stage /95.3% |

## API-REV-001 — current composed lifecycle and read-only visibility
- First completed API/E2E result; earlier pause preserved partial evidence but was not a validation verdict. Same canonical run resumed after user direction and current review gate.
- Plan investigated all R1/R2 scenarios, durable validity and real boundaries; current source9bd72c208/reviewa201abe848. Original API-04/06 receipts remain at their old revision. Current runtime impact requires API-06B/09B follow-ons.
- Added gated real standalone-host E2E and companion fixture under `autobyteus-server-ts/tests/e2e/shutdown/`; no production changes/removals. Full host/app-worker/SDK/native commands, first ended initiator plus second live run, adopted/resistant commands, actual absence, unrelated/data sentinels, bounded cleanup.
- API-01/08 reuse applicable implementation tests without conflating mock and system proof. API-03/05/06B/07/09A/09B/10 provide actual current standalone/desktop/native/Codex/query/UI/IPC evidence. API-02 Studio boundary is satisfied by current full packaged native case, avoiding a duplicate run.
- Actual local deterministic model fixtures do not use paid inference. Real Codex CLI/tools, safe panel running/natural0/nonzero7, foreground exclusion, two-run selection/reload, provider timeout/last-known recovery and full restart/quit all tested. No query interception/fake contexts.

### Prior Failure Resolution
No prior API/E2E product failure. Initial fixture-only failures (wrong catalog API/field, async selection timing, missing explicit restart trigger, direct-backend .env bootstrap) were diagnosed and corrected narrowly; original evidence preserved and never labelled product failures or successful cleanup. One successful standalone case reran after final safety-bound helper refinement.

- Canonical investigation/report/progress updated; report Cases and AC Proof identify evidence per requirement. API-validation-provenance/summary and API-final-cleanup index exact files.
- Prior result/confidence N/A; current **Pass /95.3%**, Broader Validation Required and completed; no applicable category below90%.
- Open product/API failures: none. Recommended next owner: Code Reviewer for proportional successful-test review, then normal Delivery route.
- Limits: actual Windows/WSL not run (deterministic mocks not certification); updater installation/paid providers/historical incident not tested. IMP-44 DMG overall build failure unresolved for Delivery, despite available/tested unpacked app. Delivery owns AC-006 integrated-base/finalization receipt; no merge/release/install or final ticket acceptance inferred.
- Final cleanup:49 exact recorded test PIDs absent,12 private roots absent. Current worktree/build and untracked SDK prerequisites preserved.
