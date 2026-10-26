# API/E2E Revision Record

## Revision Index
| Revision | Trigger | Upstream | Prior result/confidence | Current result/confidence |
|---|---|---|---|---|
| API-REV-001 | CRR-002 entry, user pause/resume, CRR-003 cumulative R2 review | R2/D4.1;SR-001..008;ARCH-REV-004;IR-004;CRR-003 | N/A | Pass executable-validation stage /95.3% |
| API-REV-002 | DR-001/CRR-005 integrated rerun | R2/D4.1;ARCH-REV-004;IR-005;CRR-005;DR-001 | API-REV-001 Pass95.3%, old source | Pass integrated executable stage /95.3%, newly assessed |
| API-REV-003 | DR-002/CRR-007 fresh MCP-base rerun | R2/D4.1;ARCH-REV-004;IR-006;CRR-007;DR-002 | API-REV-002 Pass95.3%, source2c47 | Pass fresh-base executable stage /95.3%, newly assessed |
| API-REV-004 | DR003 AC002 proof hold | R2/D4.1;IR006;CRR007/008;DR003 | APIREV003 reported95.3%, AC002 claim withdrawn | Pass95.3%, corrected new+retained proof |

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

## API-REV-003 — fresh MCP-base executable validation
- Trigger: Delivery DR-002 foundation integration, IR-006/CRR-007. R2/D4.1/SR001..008/ARCH-REV004; Large/High unchanged. Source9b10fcd4d3eee578b9d1d23e1d6ab47f9b950c5c, review13d7f4293e10c4b0f39114169a2e77455a9ef40e, base0fd9ca4b63bf86fad8e3fa357aa05016cc6d299e.
- Prior APIREV002 Pass95.3 is exact-source2c47 history. Current **Pass95.3%, independently reassessed** from seven renewed runners, Broader Required and completed; no category below90%. No product/fixture failure or case retry this round.
- Foundation1110 unique current cases reused at exact repository boundaries; IMP69 initial web10 failures retained, IMP70 environment-only correction replaces28/adds3, no double count. Dummy-secret MCP transport not live vault/GitHub. No Nuxt rerun needed; preserve diagnosed NODE_OPTIONS if those suites run later.
- API03 full standalone host.close838ms; API02/06B full Studio/native ended/adopted/resistant restart2675ms, retained-run full quit1319ms; API05 conflict/retry/data; API07 actual packaged IPC startup/failed/unconfirmed; API09 real conversation/query/panel natural0/reopen/reload; API09B foreground exclusion, two-run selection, nonzero7, inactive read, live Codex restart1591ms and full quit207ms; API10 actual unavailable5008ms/last-known recovery/no extra inference then active quit707ms. Exact PIDs/listeners/sentinels in raw receipts.
- New evidence/API-REV-003 only; prior evidence untouched. IMP72 beta10 full unsigned build/DMG verify and five direct source/package hash matches. IMP73 intercepted UI/no-work quit not elevated to active-work proof.
- No product, durable suite or existing probe changes. New sequential orchestration differs by source/output constants and missing-marker guard; preserves progress/stop-on-failure/refusal to duplicate. Durable CRR004 hashes retained.

### Prior failure resolution
DR002 source integration concerns resolved upstream IR006/CRR007; renewed executable proof now covers the current base. No prior API product failure or new failure IDs. Earlier foundation environment failures remain diagnosed upstream evidence, not silently erased.

- Canonical investigation/report current, progress append-only. Current summary/provenance/build/cleanup plus Cases/AC Proof index raw evidence. Final audit35 recorded test PIDs and7 private roots absent; all desktop cleanup forced=false, ports released; SDK outputs/build/worktree preserved.
- Next owner Code Reviewer for proportional successful orchestration/evidence review. Delivery retains fresh-base/raw-evidence/docs sync/AC006 finalization. No terminal delivery claim.
- Actual Windows/WSL, live vault/GitHub, paid inference, strict standalone vue-tsc, historical Nuxt incident, merge/push/release/install not claimed. No follow-up/scope change required.

## API-REV-004 — AC002 evidence correction
- Delivery DR003 correctly challenged our IMP68-only AC002 claim: actual executable tests did not exercise inspector execFile failure/deadline or non-address bind errno. Prior reported Pass95.3% did not establish AC002; confidence cannot waive that missing critical proof. Original report/logs retained at c6975088c. This was our coverage/reporting error, no product defect established.
- R2/D4.1/SR001..008/ARCHREV004/IR006/CRR007/008/DR003; Large/High unchanged. Docs-only merge53423ca/baseb5f302 retained; Delivery eight pending docs plus DR003 evidence checkpointed unchanged52a3434f5. Effective production/build remains9b10; prior1110 foundation and seven actual-system receipts valid at exact source, no broad rerun.
- Added two durable colocated suites PortOwnerInspectorFaults.spec.ts (11 cases) and BackendPortBindFaults.spec.ts (5). Actual execFile through private executables proves missing/denied, real timeout1010ms and PID23664 absent, output bound, empty/malformed/racing evidence and fresh recovery. Real availability/wait functions with injected bind events preserve valid-port non-EADDRINUSE errors and avoid diagnosis; EADDRINUSE positive control exercises actual inspector with failed callback.
- All16 cases passed first attempt, no fixture or product failure. Per-case data/listener sentinels preserved, process.kill guard untouched by advisory calls, private roots removed. Node's allowed own diagnostic-child termination distinguished from signaling listener owners. No new app/provider/secret/live-vault work or production edits.
- APIREV004 result **Pass95.3%** over corrected new proof plus unchanged retained receipts; temporary evidence-hold confidence85.0% blocked Pass until these tests. Broader product rerun **Not Required** by impact; prior actual broader evidence retained. No category below90% after repair. API11/12 logs and provenance committed; report Cases/AC Proof corrected, progress append-only.
- Next Code Reviewer for proportional successful durable-test review, then normal Delivery verification/finalization. Delivery hold not cleared by API writing its reports. AC006 remains Delivery-owned. Windows/WSL, live GitHub/vault/paid providers, historical Nuxt incident, strict vue-tsc, target merge/push/release/install still not claimed.
