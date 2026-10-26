# API/E2E Revision Record

## Revision Index
| Revision | Trigger | Upstream | Prior result/confidence | Current result/confidence |
|---|---|---|---|---|
| API-REV-001 | CRR-002 entry, user pause/resume, CRR-003 cumulative R2 review | R2/D4.1;SR-001..008;ARCH-REV-004;IR-004;CRR-003 | N/A | Pass executable-validation stage /95.3% |
| API-REV-002 | DR-001/CRR-005 integrated rerun | R2/D4.1;ARCH-REV-004;IR-005;CRR-005;DR-001 | API-REV-001 Pass95.3%, old source | Pass integrated executable stage /95.3%, newly assessed |

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

## API-REV-002 — renewed integrated-foundation validation
- Trigger: Delivery DR-001 foundation integration, IR-005/CRR-005. R2/D4.1/SR001..008/ARCH-REV004 and Large/High unchanged. Reviewed source2c47bcd646ccd371a180dbc510fd1e30aee9144f, reviewf4e7eb4eb1d4e600b286f2e22ca381e3903894ca, integrated base67994daba0adf6eb8c6bc05827b5fab6b2975aa4.
- Prior result API-REV-001 Pass95.3 at old source9bd72c208; not integrated proof. Current result **Pass95.3%, independently reassessed**, broader Required and completed, no category below90%.
- Existing durable validity unchanged; no suite or product changes. Six ticket probes gain evidence-directory override only; sequential orchestration prevents duplicate receipts and persists progress/results. Existing standalone durable test rerun unchanged after CRR-004.
- Current854 foundation cases reused from IMP52..55 at exact integrated source boundary, not old501/300 totals. API03/05/06B/07/09/09B/10 renewed on IMP56 build. API02 represented by06B, old04/06 not separately repeated.
- New real receipts: standalone close836ms; native ended/adopted/resistant restart2680ms and retained-run quit1317ms; Codex live restart2203ms/full quit101ms; actual query/panel natural0/nonzero7/foreground/selection/reload; actual timeout5003ms labelled last-known and recovery without model calls; conflict/retry/data; packaged IPC cancellation/failed/unconfirmed reporting. All seven runners pass on first attempt, no product or fixture failure this round.
- Current output under evidence/API-REV-002; prior files untouched. API-build-identity checks match compiled/packaged hashes and IMP56 provenance. Current full unsigned build/DMG verify pass supersedes historical IMP44 packaging failure, without installation/publication.

### Prior failure resolution
DR-001 integration failure was resolved upstream by IR-005 and reviewed CRR-005. These renewed API cases now provide the previously absent integrated executable proof. No prior API product failure; no new failure IDs.

- Canonical investigation/report/progress current; report Cases/AC Proof and current summary/provenance/cleanup point to raw evidence. Final audit35 recorded PIDs and7 private roots absent. SDK outputs/worktree/build preserved.
- Recommended owner: Code Reviewer, proportional renewed harness/evidence review; then Delivery's fresh-base/raw-evidence/docs/finalization gates. AC006 finalization remains downstream, not terminal acceptance here.
- Actual Windows/WSL, paid providers, strict standalone vue-tsc, historical Nuxt incident, target merge/push/release/install not claimed. No long-lived docs or incoming migration policy changes by API role.
