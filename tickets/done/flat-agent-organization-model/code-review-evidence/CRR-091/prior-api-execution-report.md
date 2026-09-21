# API/E2E Execution Coverage — API-REV-038

## Final result
**Fail — 85.6% confidence; testing and cleanup completed.** One unwaived, bounded user-visible failure remains: **API-FIND-040**, the first sent native standalone text attachment initially opens an obsolete draft URL (404). Reload/reselect opens the finalized file with exact original bytes. No durable file loss is claimed. Source origin (pre-existing versus introduced) is not assigned.

Two separate prior deviations—eager pre-message Team Idle/green state and one unexpected mounted navigation—are **explicitly user-accepted, not fixed**. The user also accepted separate-link opening as original-personal behavior; that does not waive404. Further native image tests were excluded by the user, not markedPass.

No additional user-scenario tests are planned in this round. This is neither successful proportional test review nor Delivery/release/user acceptance.

## Round, authority and ownership
- Trigger: Code Reviewer CRR-090 Pass95.1, cumulative IR001–059; round38. Prior completed API37 Fail69.3 preserved byte-exact in API38/final/prior-* and immutable API37 evidence.
- RER033@f84c5299f10898f49acff6a0e481d1cd61c769a9; AD028@a87637d4f11934dd048d3ca617b19e643cc34df2; ARCH025Pass@fcd220b23bd377da2f488b51363787cc1065081a; AAV003 and valid AD027/cumulative supplements retained.
- Source6e2d7997444383d5585225d9febbc1ee54247714; artifactHEAD3155da09c33c0bb5aeea19d0b2243a8163cc9595. Large/High/Confirmed/Reviewed; focusedMedium/High. No new source/design/migration change.
- Canonical requirements-doc.md, investigation-notes.md, requirements-revision-record.md, design-spec.md, design-review-report.md, implementation-handoff.md/revision, code-review-report.md/revision, retained delivery-revision-record.md/DR007/009 and all supplements are indexed by authority-provenance.json and final/handoff-reference-files.txt. Route-specific architecture artifacts apply; no direct-route N/A substitution.
- API owns investigation, ledger, execution, cleanup and preliminary classification. Reviewer independently owns failure origin. Successful proportional review remains required for3carried API deltas after eventual cumulative Pass.

## Investigation and execution basis
Initial investigation and42-group ledger existed before execution. All current source814 and incoming2287reference witnesses verified; no claim that every historical line was freshly reread. Exact command/cwd/config/log receipts are authoritative. Initial decisions and corrections remain in final/in-progress-api-e2e-coverage-investigation.md and execution-plan*.md.

Repository: **34 main commands Pass;436 disjoint files/2708 tests** (server188/1065, web188/1318, core60/325). ActualApollo2files63tests, Stop50, readiness35 and Electron9/39 are included subsets, not additive. Current builds/Nuxt16routes/3guards/devkit/Brief/registered modelA–F/strict19-file fixture passed. No full-suite reruns after the user requested the final bounded scenarios. Additional API/process checks are separate supporting receipts.

Execution: **320 structured command receipts,37 original nonzero**, each retained and classified in final/failed-command-disposition.json. These are not320user journeys or37product bugs. One original mounted navigation failure is accepted; one confirmed live404 is unwaived; other entries include setup/oracle/selection/cleanup problems and observation attempts exposing that same404. Read-only discovery, supervisor/service exits and interim report/integrity diagnostics are separate. No accepted Run/Send/task/Stop replay.

## Prior failure resolution and current boundaries
- API-FIND039/038 / DS037 / VAL058:4fresh hosted direct/mounted1502/390cases pass. Actual successfulStop publishes inactive/noStop before old reads release and remains so after unchanged old-body consumption and latest rejection; failed/pendingStop controls, exactdraft/selection/conversation retained. Historical API37Fail not changed.
- VAL076–079:12new hosted root/member overlap cases pass (8member bothorders/topologies/widths;4root counterbalanced). Genuine backend/provider output and current Apollo/staging/identity/atomicity;5separate setup/oracle attempts retained, never relabeledPassing or a fifth API37failure.
- Current package/authoring/org-owned return/save/full package roundtrip/bilingual/override/strictnegative matrix, configured messaging/publication/task identities/relevance and notification evidence completed at indexed scopes. AAV002 Org-only unsupported roundtrip remains unadjudicated, not a passing negative.
- Nine required formal tasks/36accepted updates correlated in current Team-first/Team-repeat/Org/direct receipts. Historical API36ten/40 and18inputs are not inherited. Two new native attachment tasks separately terminate Interrupted; not additional accepted formal cycles.
- Real model Agent/Team save/reopen/continue, direct/mounted summary UI, connection retry/exhaustion/reselect, Stop/retained/cold/readiness and two main restart/Restore/continuation cycles completed. Missing/unreadable exact own clones support backend fail-close, not synthetic UI acceptance. API35missingRestorebody remains missing; current response bodies are independently captured.
- Codex attachment preparation/live/retained/cross-view original ownership and file bytes have current receipts. Native DeepSeek V4 Flash: GUI standalone draft→firstSend, no-context,39distinct growth messages→actual earlier-page Open1502/390; GUI Org→direct/mounted and delegated Agent/Team text/JSON→normalStop→8coldviews all pass apart from the immediate standalone live404. Exact task identities/raw associations/initial and typed-page IDs/no activation/write verified. No further images tested.

## Current failure and accepted exceptions
| Observation | Disposition | Evidence |
|---|---|---|
| API-FIND-040 first native standalone text Open404; normal reopen200 | Unwaived current criterion failure; preliminary implementation LocalFix, origin unassigned | live/API-FIND-040-summary.json; original finding; NATIVE-file-only-result/open-initial-live/open-reopened; screenshots and original Prepare/Send/finalization |
| New standalone Team members Idle before any message versus original Offline | User explicitly accepts for this ticket; real lifecycle difference, not fixed | USER-pre-message-status-source-comparison.json; USER-ui-team-launch-adjudication.json; USER-two-known-issues-accepted.json |
| One mounted publication unexpectedly navigated to prior Team | User explicitly accepts; later distinct pulse did not reproduce, not evidence of fix | LIVE-PUB-mounted-result.json; USER-two-known-issues-accepted.json |
| Uploaded text/JSON opens separate link instead of Files tab | Existing opener/UserMessage/autoswitch byte-identical to local origin/personal5645b49; user accepts destination | USER-context-file-open-destination.json. This does not prove404preexists. |

## Ledger reconciliation
42 broad groups: **38Pass,3Fail(two accepted,one unwaived),1N/A**. Detailed requirement/scenario/evidence mapping is [case-reconciliation.md](api-e2e-evidence/API-REV-038/case-reconciliation.md) and its JSON; canonical api-e2e-test-case-ledger.md retains immediate checkpoints. All planned current user journeys stopped/completed. Excluded/unrun subscopes below are not hidden by group counts. Preparation interruptions are reconciled, not retrospectively calledPass.

## Confidence and broader validation
Broader validation **Required and executed**, based on prior realistic race and cumulative boundary risk. Post-repository78.6%; final85.6%, unweighted seven-category mean, **not a test pass rate**. Known first-sendOpen criterion prevents clean acceptance regardless of score; default95overall/no category<90not met.

| Category | Repository | Final | Final rationale |
|---|---:|---:|---|
| Requirement and AC proof | 75% | 50% | Unwaived first-send attachment Open criterion fails404. File is durable and reopen works, so this is bounded access friction, not data loss; strict clean acceptance still cannot pass. Two earlier exceptions separately accepted. |
| Changed-boundary directness | 90% | 98% | Four actual hosted Stop/history and12root/member overlap controls directly cross current compiled Apollo/HTTP/WS/backend/provider boundaries. Minor remaining permutations, not synthetic owner evidence. |
| Integration realism and mock gap | 75% | 96% | Current browser/task/provider/files/process paths and actual DeepSeek workers exercised. Controlled transport failures and metadata/API support are labeled; no claim every negative is normal UI. |
| Environment/config/identity/fixture fidelity | 90% | 95% | Fresh exact owned roots, real model configuration, strict19-file immutable package, preserved identities and authorized test-only secrets. Setup/oracle/cleanup errors fully disclosed; user source unchanged. |
| Failure/lifecycle/recovery evidence | 75% | 95% | Two main restart cycles, normal Stop/Restore/continuation and readiness/retry/missing-unreadable controls complete at stated scopes; no current active roots/tasks or cleanup residue. |
| User surface/browser/shell | 50% | 75% | Extensive real UI evidence at1502/390/en/zh, but immediate text link fails and two prior status/navigation deviations remain user-accepted. Native shell not executed; narrow fixture overflow disclosed. |
| Durable regression quality | 95% | 90% | Current2708repository tests and actualApollo63 fill prior race gap; first-send native live locator promotion lacks a proven durable regression assertion. Existing3API deltas unchanged, successful proportional review pending. |

## Environment, lifecycle and cleanup
Linux/Node22.23.2, installed Apollo3.14.0, real compiled Nuxt browser renderer and server8600/renderer3600; actual ChromiumCDP9222 retained. Desktop1502×844/narrow390×844; applicable en/zh-CN and UTC. Exact versions/config/scripts are in repository/environment receipts and package locks. Web-equivalent behavior and focused Electron39tests do not establish Electron-shell/AppImage behavior.

Fresh API38-owned POSIX backing, unchanged data alias/URI/owner/schema. Main final exact inventory26Orgs/3Teams/2standaloneAgents allinactive; alltaskexecutionssettled. Fourownedserverphases exit0 afterSIGTERM; rendererSIGTERM (notexit0claim). Earlier observers/inspector/collector removed; final twoownmain/controller tabs and2residualtest-filepopups closed, all4original targets preserved. No shared Chromium shutdown.

Gemini and user-authorized DeepSeek credentials were configured only in ownedtestvault. No Gemini worker/image journey completed. Original userenvironment hash unchanged; no full .envimport. Both consumers removed using correctly initialized application ESM service, then ownDBzeroentries/checkpoint/VACUUM before archival; prior credential-free environment restored. Initial CJS/ESM cleanup mismatch and all failed cleanup phases retained, not product-vault corruption claims.

**295runtimefiles** archived exactPAXbytes/modes/ns, verified and copied byte/modeexact; **295currentmtimequantizations** disclosed separately from historical API36/37(120/78). OwnPOSIXbacking removed. Fourinitiallyabsentbuildoutputs and17exactPID94923devkitdirs removed;17preexistingdirs and preexistingdist retained. Final integrity:63129/63129protectedregular,11symlinks,19fixturefiles,814sourceinventory and2287authorityrefs preserved; no unexpected/missing/staged/unmerged/source/durable changes. Only API canonical records and own evidence updated.

## Durable coverage and source boundaries
No durable test added/changed/removed this round; no product edit. Current physical Apollo63tests remain valid. New first-send native promotion→liveOpen gap requires focused regression/owner-origin assessment; do not silently bless existing passing tests as covering it.

Three carried API-owned deltas remain unstaged and unchanged:
- server tests/e2e/run-history/recent-run-projection-graphql.e2e.test.ts —63dcedbdf550619e41156e1b0923c7b8128ef24986460da0bcdba0f5c524f911 (+34).
- server tests/unit/agent-memory/team-memory-explorer-service.test.ts —617332f6b5d7770e8e23a609e95c2ade9bd2bfb6226a575b913647dcf3d5f3d2 (+16/−1).
- web tests/e2e/existing-run-model-config-probe.mjs —a25f958cfdee1c1f58120a2d7fc595d04378f8421268c1c8a22a2fa5cfaabef2 (+13/−2).
Separate api-e2e-test-review-report.md untouched. Eventual cumulativePass must return for successful proportional test-code review; current handoff is failure-origin review only.

No new backward-compatibility wrapper/dual reader/request-time upgrade/new migration/backfill introduced by API work. Reviewed removal/transition checks retained; disposable migration/recovery coverage is not an actualinstallationdecision. IR049actualinstallationBEFORECUTOVER remains Architecture-owned, not codinghold.

## Explicit remaining limits
- Further native image attachments: excluded by user request, notPass; earlier Codex image evidence retains only executed scope.
- Positive native unknown-file ingestion: not tested; real chooser octet-stream rejection400 before Send is valid negative, not ingestion proof. Historical unknown/native stall evidence remains scoped.
- Native Electron shell/AppImage/user verification/actual installation cutover/release: not executed or accepted here.
- Original API35 missing Restore body and API33 missing attachment associations are not reconstructed. API36/37 failure results and120/78mtime quantizations remain historical.
- First native standalone live404 confirmed only on desktop before reopen; no independent narrow first-send404 reproduction or introduced-commit attribution.
- Earlier directly API-created model fixtures remain setup, not normal GUI launch proof. Separate normal UI Team and DeepSeek Agent/Org launches supply user-path evidence.
- Temporary configured-message original interruption snapshot overwritten in earlier helper; no reconstruction. Original logs and accepted operation receipts remain.

Preserve CRR059/067/IR041/API27/29/DR007/009/API20firstguard, native/unknownstalls, AAV002complete-package-only/unadjudicatedOrg-only/AAV003 and native outer limits. No reset/replay/newmigration/backfill/rollout/nativeShell/AppImage/user/release/Delivery-readiness claim.

## Result routing
Reports, revision, ledger, exact original failures, current confidence, cleanup, manifest and complete cumulative references are persisted. Call fresh get_handoff_rules and send only its most-specific result recipient. Recommended boundary: CodeReviewer focused failure-origin assessment of API-FIND-040, explicitly distinguishing already user-accepted exceptions; not successful proportional review. No handoff success is claimed until tool receipt.
