# API/E2E Revision Record

Canonical coverage investigation/execution reports remain authoritative. API-REV-001 was the initial baseline; latest completed result is API-REV-003.

## Revision index
| Revision | Trigger/upstream | Prior result/confidence | Current result/confidence |
| --- | --- | --- | --- |
| API-REV-001 | CRR-001 Implementation Review Pass; SR-005, SR-007/DS-REV-001, ARCH-REV-001, IR-001; SR-008 evidence only | N/A / N/A | **Fail /72.1%** |
| API-REV-002 | CRR-004 / IR-002; SR-009/DS-REV-002, ARCH-REV-002, approved SR-005 unchanged | Fail /72.1% | **Fail /75.0%** |
| API-REV-003 | CRR-006 / IR-003; SR-010/DS-REV-003, ARCH-REV-003, approved SR-005 unchanged | Fail /75.0% | **Pass /95.6%** |

## API-REV-001 — real retained-browser status failure
- Initial baseline, 2026-09-14, AORG-FOLLOWUP-20260914-001, Medium/High reviewed route.
- SETUP/R01/R02/R03/ENV Pass: production/shared/bootstrap build, narrow56, broader348 including narrow, frontend39. Initial API-owned fixture errors/stale assertions corrected; original logs retained.
- Updated configured-scope-readiness.test.ts and team-agent-tools-mcp-lifecycle.integration.test.ts under autobyteus-server-ts/tests/integration/agent-team-execution. Added importable test-support/fixtures/lazy-configured-restore Agent/Team/Org package. No production edits or test removals.
- B01 **Fail F-001**: mounted-Agent headerIdle/sidebarOffline and zero actual backend candidates/active after kept-open owned restart; twice reproduced. Refocusing corrects status without work.
- B02/B03 full scenarios incomplete/Not Tested; B04 Not Tested. Actual Codex identity/recall and pasted attachment exact content verified; no native inference, real bound-empty, deliberate dedupe/uncertainty or task completion claims.
- Post-repository confidence66.4%; broader validation Required and executed; final72.1%, target not met.

### Prior failure resolution
None — initial baseline, prior result/confidence N/A.

- New unresolved F-001, preliminary Local Fix likely frontend retained status projection. Exact origin and commit attribution unconfirmed; Code Reviewer owns confirmation.
- Updated canonical coverage investigation, execution report, ledger, this record; retained logs/DOM/screenshots/current-tree proof.
- Owned processes/tabs stopped/closed; isolated reproduction data retained, user processes/data untouched.
- Recommended recipient: sole matching Code Reviewer rule for focused failure-origin review, not successful-test review. Delivery N/A.
- Next round rechecks F-001 first, then B02–B04 native/unused/task/failure evidence with same IDs.

## API-REV-002 — original status fixed; frontend task approval failure
- 2026-09-14, Medium/High reviewed route. Source8bc62ce5f, tested HEADc0bbe9c27, unchanged backend from prior round. Cumulative IR-001/002 and CRR-004.
- Prior API-REV-001 Fail72.1%; post-repository Round2 score70.0% recorded retrospectively, final75.0% (+2.9pp). No clean Pass gate met.
- Independently20 narrow and13files182 broader web tests Pass (20 included); no new full build/server aggregate/typecheck claim. Inherited typecheck failures/limits retained.
- **F-001 resolved:** real browser same-selected mounted/direct headers+rowsOffline/rootStopped after owned same-data restart, no refocus/reload/input, zero runtimes; deliberate frontend continuation and exact attachment content succeed. Team leaf Offline/continued and later never-used peer works; Team container can be active with zero providers, verified against actual root liveness.
- **New F-002:** normal frontend delegate approval then late task selection twice exposes Running/PARSED submit_task_result without Approve/Deny. Full captured second repro in runtime-probe-r2/approval-repro-*. Supported API approval unblocks, diagnostic only. Origin/introduced-regression attribution unconfirmed; Code Reviewer focus requested.
- **User-scenario correction:** former API-only duplicate-command F-003 candidate withdrawn from acceptance findings; no frontend automatic replay reproduced. Native direct/mounted actual API continuation supports integration but does not complete requested frontend native tests. No new protocol requirement inferred.
- B02/B03 full frontend matrix incomplete; B04 Fail/partial. Actual task records/settled nonrestart observed but API approval workaround means task journey not frontend Pass. Bound-empty fixture only one direct seeded, no replacement proof; remaining uncertainty/reopen/repair cases Not Tested.
- Prior two durable test edits/sample retained; no new durable edits or production changes this round. All reports/ledger updated, evidence retained.
- Owned services stopped, test tabs/data retained for diagnosis; no user state or deployment/integration touched.
- Sole applicable Fail route: focused F-002 failure-origin review. No successful-test review or Delivery pass. Next round recheck F-002 first, complete remaining acceptance through actual frontend actions with backend read-only corroboration.

## API-REV-003 — actual frontend approval closure and remaining user journeys
- 2026-09-14, Medium/High reviewed route. Source1f407b3bf, tested HEAD4b0d356ac; cumulative IR-001–003/CRR-006, SR-011 evidence only. Prior Fail75.0%; contemporaneous post-repository70.0%; final95.6% (+20.6pp prior round).
- **Prior failure resolution first:** F-002 actual frontend resolved. Two new manual tasks captured incoming exact approval and owning awaiting state while parent focused BEFORE first inspection; selection retained real controls, frontend Approve executed once, ordinary parent review accepted. Early-hydrated control also Pass. No API approval workaround. F-001 actual fix preserved through same-focused native mounted/direct and Team restart/continuation. F-003 remains withdrawn/rejected.
- Independently1file19 narrow /16files142 broader Pass (19 included). Prior348 backend/39 frontend/build and Round2 182 retained, not rerun. Inherited plain web/server strict typecheck failures and diagnostic limits remain; no new whole-build claim.
- Native actual frontend used/never-used direct/mounted/Team, newly UI-created native Team fresh laziness/coordinator, exact retained conversation markers; prior external identity/attachment/peer evidence preserved. Historical external direct bound-empty replaced provider while preserving local ID, one actual input.
- Actual frontend task wait→owned crash→natural Interrupted repair, settled A/B/C not restarted, new task assignment/submission/review once. Real accepted-generation loss and pending-first-Send loss safely reopen with draft/terminal policy and no automatic replay; deliberate Send once. Real isolated root EACCES rejects before durability, retry after restored permission accepts exactly once.
- Corrections explicit: first native pending attempt actually accepted; repeated frame receipt across tabs not duplicate input. Wrong initial mounted trace path zero invalidated; correct nested trace proves one accepted retry. Exact post-durable publication fault not injected live; durable owner coverage plus real surrounding failure journeys, not exhaustive fault/provider cross-product claim.
- Final scorecard[95,98,95,98,90,98,95]=95.6%; all critical ACs directly proven at owner and representative actual-user boundaries. No new unresolved failure or environment blocker. Two earlier API durable test edits/sample unchanged; IR-003 owner regressions reviewed upstream. No API production edits/test removals.
- Canonical report/investigation/ledger revised; runtime-probe-r3 proofs retained. All owned current services stopped, four Round3 tabs closed, temporary observer removed, permission0755 restored, ports empty. Isolated data/older diagnostic tabs retained; user state untouched.
- Sole most-specific reviewed Pass route: Code Reviewer proportional successful durable-test review. Delivery/user verification/finalization still pending downstream; no merge/push/release/deploy. Eventual target origin/requirements/flat-agent-organization-model, NOT personal.
