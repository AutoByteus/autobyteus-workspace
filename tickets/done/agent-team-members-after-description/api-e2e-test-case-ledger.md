# API/E2E Test-Case Ledger
Round 1 / IR-001. Worktree /Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-members-after-description. Coverage investigation: /Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-members-after-description/tickets/in-progress/agent-team-members-after-description/api-e2e-coverage-investigation.md. Execution report/revision pending. Initialized before execution, 2026-10-13. Multi-case renderer/repository validation; not every assertion a case.

## Planned Cases
| ID | Journey / expectation | AC | Surface |
| --- | --- | --- | --- |
| R01 | Focused detail suite passes | 001–004 | Nuxt component |
| R02 | Actual page/store journeys and related child/scoped suites pass | 001–004 | Nuxt integration/component |
| R03 | Boundary/localization/artifact/diff guards pass | 003 | repository guards |
| B01 | Long-content detail desktop/narrow order/columns/containment/card/rules proof | 001/002/004 | owned browser fixture |
| B02 | Shared/local View, Back/Edit, disclosure, delete-cancel preserved | 002/003 | owned browser fixture |
| B03 | Alternate ownership/empty handoffs and missing Team preserved | 001/003/004 | owned browser fixture |

## Execution Events
No case started yet. Browser probe records each completed case before beginning the next; partial checkpoints do not imply Pass.

R01 Started — focused component suite.

R01 Completed — exit 0; api-focused.log.

R02 Started — parent/store and related suites.

R02 Completed — exit 1; api-related.log.

R02 Checkpoint — authoring localization mismatch corrected; original fixtures confirmed 17/17 green but swallowed I/O/missing-field errors in api-baseline-before.log. Baseline fixture correction rerun 17/17, zero missing-field/unexpected I/O messages in api-baseline-fixed.log; separate labelled baseline-fix commit. R02 final rerun next.

R02 Rerun Completed — exit 0; api-related-final.log.

R03 Started — web/localization/diff/artifact guards.

R03 Completed — exit 0; api-guards.log.

2026-10-13T03:39:08.454Z B01 Started — Long-content production detail order, roster and responsive geometry. Evidence: /Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-members-after-description/tickets/in-progress/agent-team-members-after-description/api-browser-01/evidence.json.

2026-10-13T03:39:09.012Z B01 Completed Pass — Long-content production detail order, roster and responsive geometry. Evidence: /Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-members-after-description/tickets/in-progress/agent-team-members-after-description/api-browser-01/evidence.json.

2026-10-13T03:39:09.016Z B02 Started — Real controls: disclosure, shared/local View, Edit/Back and Delete cancel. Evidence: /Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-members-after-description/tickets/in-progress/agent-team-members-after-description/api-browser-01/evidence.json.

2026-10-13T03:40:09.254Z B02 Completed Fail — locator.waitFor: Timeout 60000ms exceeded.
Call log:
[2m  - waiting for getByRole('button', { name: 'Delete definition', exact: true }) to be visible[22m
. Evidence: /Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-members-after-description/tickets/in-progress/agent-team-members-after-description/api-browser-01/evidence.json.

B02 local authoring fix — exact button label corrected from Delete definition to Delete Definition using current catalog source. First attempt fully cleaned; B03 not started. Repeat B01–B03 in fresh api-browser-02; earlier Fail retained, not ignored.

2026-10-13T03:40:44.197Z B01 Started — Long-content production detail order, roster and responsive geometry. Evidence: /Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-members-after-description/tickets/in-progress/agent-team-members-after-description/api-browser-02/evidence.json.

2026-10-13T03:40:44.747Z B01 Completed Pass — Long-content production detail order, roster and responsive geometry. Evidence: /Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-members-after-description/tickets/in-progress/agent-team-members-after-description/api-browser-02/evidence.json.

2026-10-13T03:40:44.748Z B02 Started — Real controls: disclosure, shared/local View, Edit/Back and Delete cancel. Evidence: /Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-members-after-description/tickets/in-progress/agent-team-members-after-description/api-browser-02/evidence.json.

2026-10-13T03:40:45.454Z B02 Completed Pass — Real controls: disclosure, shared/local View, Edit/Back and Delete cancel. Evidence: /Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-members-after-description/tickets/in-progress/agent-team-members-after-description/api-browser-02/evidence.json.

2026-10-13T03:40:45.455Z B03 Started — Alternate Team ownership/empty rules and not-found state. Evidence: /Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-members-after-description/tickets/in-progress/agent-team-members-after-description/api-browser-02/evidence.json.

2026-10-13T03:40:46.087Z B03 Completed Pass — Alternate Team ownership/empty rules and not-found state. Evidence: /Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-members-after-description/tickets/in-progress/agent-team-members-after-description/api-browser-02/evidence.json.

B01–B03 final attempt Pass; api-browser-02 exit 0, empty browserEvents, one health request, owned browser/process group/page/boundary/HOME removed and both ports free. R02 final source combined rerun Started.

R01/R02 final combined Completed — exit 0; api-combined-final.log.

R02 Started — final combined with unknown-I/O assertions.

R01/R02 hardened rerun Completed — exit 0; api-combined-hardened.log.

R03 final rerun Started — staged durable coverage guards.

R03 final rerun Completed — exit 0; api-guards-final.log.

## Final reconciliation
R01 Pass 9 tests; R02 Pass 31 tests; final hardened combined 5 files/40 tests. R03 Pass final guards/audit/syntax/diff/hygiene. B01/B02/B03 Pass api-browser-02 with no events/errors/unexpected calls; earlier B02 selector error resolved, first B03 unstarted superseded by actual completed B03, no inference. Cleanup independently confirmed and both screenshots inspected. No case running/interrupted/unstarted in final round. Reconciled Yes into /Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-members-after-description/tickets/in-progress/agent-team-members-after-description/api-e2e-execution-coverage-report.md case matrix / API-REV-001. Authoritative result Pass / 95.71%.

R03 artifact index completion Pass — canonical reports/evidence explicitly staged, artifact hygiene 61149 tracked/index paths Pass; api-artifact-final.log. Final reconciliation unchanged.

## Round 2 — planned real Electron cases (before execution)
User explicitly requested actual Electron user-style tests. Earlier round events/results retained.
| ID | Journey | Expected result / AC | Status |
| --- | --- | --- | --- |
| E01 | Current-worktree package, own/assigned isolated launch, health/control/provenance | Real isolated app contains changed source, private root/ports; no other app reused | Not Tested |
| E02 | Open Teams catalog → Team; long-content read/disclosure; real desktop/narrow layout | Description→Members→Instructions→Handoffs; count/coordinator/content/columns/containment, AC-001/002/003/004 | Not Tested |
| E03 | Member View→actual Agent→Back, Edit/cancel/Delete-cancel/Team Back | Exact destination/return/actions retained, AC-002/003 | Not Tested |
| E04 | Another Team + supported Org-context return journey | Universal order/identities/return, AC-001/002/003 | Not Tested |
| E05 | Close or explicit transfer own isolated app/resources | Safe cleanup or documented transfer only; other app/data untouched | Not Tested |
Checkpoint: Delivery's packaging active; ownership request delivered, no duplicate build or desktop control started.

E01 Started — exclusive instance transfer confirmed by Delivery DR-001; own source/health/control/asar receipt verification, then independent focused repository recheck.

E01 Completed Pass — source asar SHA256 independently matches DR-001 and original production blob unchanged; actual assigned Electron renderer /chat observed, backend health200, exclusive CDP connection only, no events. Independent current-source focused 2 suites/12 tests Pass (api-desktop-01/repository-recheck.log); integrated 40/40 from DR-001 reviewed. UI data-preparation checkpoints for E02 started, initial Agents catalog/form observed.

E02 Checkpoint — first Agent created via visible form, actual detail loaded; one console.error Apollo missing loadIssue in mutation cache write observed, retained e02-create-coordinator.json. UI behavior succeeded but clean error status unresolved; investigate real source/query contract while completing required Team journeys.

E02 setup authoring checkpoint — naive switch-count assertion failed (7, not6): real Team Canvas has6 coordinator switches plus a7th selected-member-details switch; readback proves exactly6 distinct Team members and same coordinator. No product defect, no action repeated; corrected scope. e02-team-members*.json/failure image retained.

E02 Completed Pass for actual catalog/detail rendering/disclosure: native1200x768, emulated1440/600 widths, matching DOM/geometry/count/coordinator/content/columns and eight handoffs; error-free target journey. Separate Agent-creation console error remains unresolved. E03 Started — actual member/actions/return and read-only definition integrity.

E03 Completed Pass — real shared member→Agent→same Team actual URLs, Edit/cancel, Delete modal/cancel, Team→catalog and Run→unsent New chat addressed to six-member Team. Definitions read through actual backend unchanged. Zero events; e03-member-and-actions.json durably recorded before E04, this ledger completion appended after initial E04 setup (reporting timing distinction retained).
E04 Started / checkpoint — second shared Team created through UI and observed same four-section order with empty handoffs; e04-create-alternate.json. No events. Now exercising Org return context.

2026-10-13T04:03:52.083Z Desktop step e04-org-create-form Completed Fail; browser events 0; /Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-members-after-description/tickets/in-progress/agent-team-members-after-description/api-desktop-01/e04-org-create-form.json. This is a case checkpoint, not automatic clean round sign-off.

2026-10-13T04:04:37.650Z Desktop step e04-org-form-readback Completed Pass; browser events 0; /Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-members-after-description/tickets/in-progress/agent-team-members-after-description/api-desktop-01/e04-org-form-readback.json. This is a case checkpoint, not automatic clean round sign-off.

2026-10-13T04:04:50.343Z Desktop step e04-org-team-picker Completed Pass; browser events 0; /Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-members-after-description/tickets/in-progress/agent-team-members-after-description/api-desktop-01/e04-org-team-picker.json. This is a case checkpoint, not automatic clean round sign-off.

2026-10-13T04:05:43.316Z Desktop step e04-org-roundtrip Completed Fail; browser events 1; /Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-members-after-description/tickets/in-progress/agent-team-members-after-description/api-desktop-01/e04-org-roundtrip.json. This is a case checkpoint, not automatic clean round sign-off.

E06 planned/Started — durable reproduction of actual UI Create Agent cache-contract error (baseline fields at73f7432, actual source update callback and current documents); expected no missing-field cache errors/full query usable. Source not modified.

2026-10-13T04:06:53.368Z Desktop step e04-org-create-readback Completed Pass; browser events 0; /Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-members-after-description/tickets/in-progress/agent-team-members-after-description/api-desktop-01/e04-org-create-readback.json. This is a case checkpoint, not automatic clean round sign-off.

E06 Completed — exit 1; cache-regression.log (current-cache contract reproduction, expected healthy data without console errors).

2026-10-13T04:08:24.775Z Desktop step e04-org-return-journey Completed Pass; browser events 0; /Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-members-after-description/tickets/in-progress/agent-team-members-after-description/api-desktop-01/e04-org-return-journey.json. This is a case checkpoint, not automatic clean round sign-off.

E06 initial Completed Fail: Agent loadIssue reproduced; Org response double missing __typename, corrected before final rerun; initial log renamed cache-regression-initial.log without overwrite. E06 rerun Started.

E06 final Completed — exit 1; cache-regression-final.log.

2026-10-13T04:09:26.303Z Desktop step e05-final-observation Completed Pass; browser events 0; /Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-members-after-description/tickets/in-progress/agent-team-members-after-description/api-desktop-01/e05-final-observation.json. This is a case checkpoint, not automatic clean round sign-off.

E04 Completed Pass for alternate Team/empty handoffs and real Org→Team→Agent→Team→same Org; e04-org-return-journey.json, zero target journey events. Org creation console loadIssues error recorded separately; first heading wait corrected to documented creation→edit→catalog→detail path, no duplicate creation. E05 cleanup Started; final actual server definitions/log captured, six Agents/two Teams/one Org disposable.

E05 Completed Pass — assigned isolated stop receipt ok, forced true (lifecycle helper escalation), own disposable data root removed, control/backend ports released; own lifecycle record absent; independent sockets/group/root confirmation all true in cleanup-check.json. Other instances/app/data not stopped. No active resource transfer outstanding.
E06 final Completed Fail — valid cache regression reproduces exact Agent loadIssue and Org loadIssues omissions (2 failed), existing mocked store tests5/5 passed. Both affected production queries/mutations/stores byte-identical between remote-base73f7432 and integratedHEAD59a5bd76de; not caused by template move. Preserve source baseline finding for failure-origin review.

E06 current committed-candidate rerun Completed — exit 1; cache-regression-verified.log.

## Round 2 final reconciliation
E01/E02/E03/E04/E05 Pass for actual app target journeys/source/cleanup. E06 Fail (API-F001/API-F002) from seven observed creation console errors plus two valid durable cache regressions; existing store5/5 and focused current12/12 Pass. Harness assumptions/errors resolved, raw artifacts retained. All final cases terminal; no active instance/task case. Reconciled into /Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-members-after-description/tickets/in-progress/agent-team-members-after-description/api-e2e-execution-coverage-report.md / API-REV-002: Fail91.43%, focused failure-origin review required. Original R1 behavior proof remains positive, no clean full-app Pass declared.

Round2 staged artifact hygiene Pass (61364 index/tracked paths, then own receipt added); diff whitespace Pass. API-F001/API-F002 failure-origin rule selected Code Reviewer.

## Round 3 — planned scoped UI disposition / API-REV-003 (before execution)
IR-004/SR-003; input HEAD52a5a1ee4ca88f35d2ee21b472018bb32d481360. Only R1 AC-001–004; prior API-REV-002 Fail/E06 unresolved outside UI scope, not rerun. Confirmed cache follow-up6b9ce371 and process follow-up4c7b3e0e TODO/not dispatched. New S01 is a preservation/scope case; R01/R02/R03/B01–B03 IDs reused.
| Case | Expected | Initial state |
| --- | --- | --- |
| S01 | Prior failure disposition, active source/test separation, preserved branch/patch/reproducer exact; current R1/runtime equality | Not Tested |
| R01 | Focused component9 pass | Not Tested |
| R02 | Actual-page/Org-owned/children31 pass | Not Tested |
| R03 | Guards/audit/syntax/diff/hygiene pass | Not Tested |
| B01 | Source-current long-content1440/600 order/geometry/cards pass | Not Tested |
| B02 | Disclosure/shared-local emits/Back/Edit/Delete cancel pass | Not Tested |
| B03 | Alternate ownership/empty handoffs/missing Team pass | Not Tested |
S01 Started — verify source/transfer and read prior confirmed failures without executing follow-up work.

S01 Checkpoint — receipt guard detected HEAD advanced from incoming52a5a1ee during coordination; no source assumption made and no new runtime/test launched. Read current commit/diff and pin before continuing. Initial read-only receipt attempt stopped at HEAD guard (AssertionError); not a product failure.

S01 Completed Pass — source/transfer integrity only: current37779bf701 adds only Solution receipt/SR-004 docs; empty baseline delta; runtime/UI coverage equals desktop-built59a5bd76de; d8 retained ref/full test/patch hashes exact; original two-case reproducer retrievable; historical Fail91.43% and seven raw creation errors retained, NOT resolved. No follow-up tests/build/run performed. Evidence: api-ui-03/source-and-transfer.json.

R01 Started — current source37779bf701 focused component rerun.

R01 Completed — exit 0; api-ui-03/focused.log.

R02 Started — actual pages/store scoped/shared/local routes and related preservation suites.

R02 Completed — exit 0; api-ui-03/related.log.

R03 Started — scoped guards/localization audit/syntax/diff.

R03 Repository checkpoint — exit 0; api-ui-03/guards.log (index hygiene rerun at final own staging).

R01/R02 reconciled Pass — current five suites/40 tests, 9 focused +31 related; both serialized commands exit0. R03 guards checkpoint Pass; final staged hygiene pending. Broader Required Browser with post-repository R1-only93.57%.

2026-10-13T04:46:22.884Z B01 Started — Long-content production detail order, roster and responsive geometry. Evidence: /Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-members-after-description/tickets/in-progress/agent-team-members-after-description/api-ui-03/browser/evidence.json.

2026-10-13T04:46:23.445Z B01 Completed Pass — Long-content production detail order, roster and responsive geometry. Evidence: /Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-members-after-description/tickets/in-progress/agent-team-members-after-description/api-ui-03/browser/evidence.json.

2026-10-13T04:46:23.446Z B02 Started — Real controls: disclosure, shared/local View, Edit/Back and Delete cancel. Evidence: /Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-members-after-description/tickets/in-progress/agent-team-members-after-description/api-ui-03/browser/evidence.json.

2026-10-13T04:46:23.934Z B02 Completed Pass — Real controls: disclosure, shared/local View, Edit/Back and Delete cancel. Evidence: /Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-members-after-description/tickets/in-progress/agent-team-members-after-description/api-ui-03/browser/evidence.json.

2026-10-13T04:46:23.934Z B03 Started — Alternate Team ownership/empty rules and not-found state. Evidence: /Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-members-after-description/tickets/in-progress/agent-team-members-after-description/api-ui-03/browser/evidence.json.

2026-10-13T04:46:24.381Z B03 Completed Fail — Browser errors
+ actual - expected

+ [
+   {
+     reason: {
+       errorText: 'net::ERR_ABORTED'
+     },
+     type: 'requestfailed',
+     url: 'https://api.iconify.design/heroicons.json?icons=arrows-right-left-20-solid%2Cchevron-down-20-solid'
+   }
+ ]
- []
. Evidence: /Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-members-after-description/tickets/in-progress/agent-team-members-after-description/api-ui-03/browser/evidence.json.

Round3 B01–B03 probe process finished exit 1; api-ui-03/browser-command.log; check final evidence/events/cleanup before reconciliation.

Round3 B03 attempt Fail preserved — Iconify external request aborted during rapid alternate→missing document navigation; B01/B02 Pass; cleanup Pass. API-owned readiness investigation/plan persisted before probe edit, no product or follow-up fix. B01–B03 fresh replay planned; all strict error and R1 assertions retained.

Round3 documented Nuxt dev preparation — exit 0; api-ui-03/nuxt-prepare.log.

2026-10-13T04:48:17.526Z B01 Started — Long-content production detail order, roster and responsive geometry. Evidence: /Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-members-after-description/tickets/in-progress/agent-team-members-after-description/api-ui-03/browser-rerun/evidence.json.

2026-10-13T04:48:18.072Z B01 Completed Pass — Long-content production detail order, roster and responsive geometry. Evidence: /Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-members-after-description/tickets/in-progress/agent-team-members-after-description/api-ui-03/browser-rerun/evidence.json.

2026-10-13T04:48:18.073Z B02 Started — Real controls: disclosure, shared/local View, Edit/Back and Delete cancel. Evidence: /Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-members-after-description/tickets/in-progress/agent-team-members-after-description/api-ui-03/browser-rerun/evidence.json.

2026-10-13T04:48:18.578Z B02 Completed Pass — Real controls: disclosure, shared/local View, Edit/Back and Delete cancel. Evidence: /Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-members-after-description/tickets/in-progress/agent-team-members-after-description/api-ui-03/browser-rerun/evidence.json.

2026-10-13T04:48:18.579Z B03 Started — Alternate Team ownership/empty rules and not-found state. Evidence: /Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-members-after-description/tickets/in-progress/agent-team-members-after-description/api-ui-03/browser-rerun/evidence.json.

2026-10-13T04:48:19.682Z B03 Completed Pass — Alternate Team ownership/empty rules and not-found state. Evidence: /Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-members-after-description/tickets/in-progress/agent-team-members-after-description/api-ui-03/browser-rerun/evidence.json.

Round3 B01–B03 replay process finished exit 0; api-ui-03/browser-rerun-command.log; reconcile after events/cleanup inspection.

R03 final source guards — exit 0; api-ui-03/guards-final.log; final artifact staging check pending.

S01 transfer checkpoint — Task Manager durable-copy acknowledgment now received in Solution doc-only051cbc06c2: six byte-equality claims/full regression/exact base64 gzip hashes, no review acceptance or dispatch. Manager receipt read; local originals independently match hashes (no independent server-copy check claimed). Expected two Solution records changed by their owner; ALL Delivery/protected other files unchanged. api-ui-03/final-source-and-transfer.json. Retained ref untouched.

B01/B02/B03 final replay Pass — api-ui-03/browser-rerun/evidence.json, zero browser events and only fixture health request; all Iconify requests response200 before next navigation, including previously aborted batch. Both widths inspected and failed initial missing-state screenshot inspected. First B03 remains Fail history, readiness correction resolved on current test helper. Independent cleanup-and-observations.json confirms Nuxt28779 group absent, renderer54528/boundary54527 ports released, fixture removed.

## Round3 final reconciliation
S01 Pass for preservation/source separation/confirmed transfer, NOT defect resolution. R01/R02 five suites40 Pass. R03 final guards Pass; staged artifact final checkpoint follows. B01/B02/B03 final browser-rerun Pass/zero events/200 icon responses after scoped readiness fix; initial B03 Fail retained/resolved as probe timing. Fresh widths/failure screenshot inspected, own both-attempt cleanup confirmed. No running/interrupted/unstarted final R1 case. Historical E06/API-F001/API-F002 remain Fail/Open deferred to confirmed cache follow-up, not rerun. Current canonical report/revision API-REV-003 scoped Pass95.71%, broader Required Browser completed; API-REV-002 expanded Fail91.43% unchanged. User acceptance/release/Delivery gates still open.

R03 Completed Pass for executable/source/report/hygiene gates — artifact-final.log scans61407 index paths, source/report whitespace clean; full raw-log whitespace scan reports ONLY two terminal blank EOF lines in focused.log/related.log (whitespace-check.json), preserved rather than rewriting raw output. No material source/report finding.
