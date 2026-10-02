# API/E2E Revision Record

## Revision Index
| Revision | Trigger / round | Related upstream revisions | Prior result / confidence | Current result / confidence |
|---|---|---|---|---|
| API-REV-001 | Code Reviewer CRR-001, initial source-review Pass / Round1 | cumulative SR-001–015; ARCH-REV-001 history/ARCH-REV-002 Pass; IR-001; CRR-001 | N/A | Blocked /90.7% |
| API-REV-002 | Direct user voice-validation waiver / Round2 | same SR-015/ARCH-REV-002/IR-001/CRR-001, prior API-REV-001 | Blocked /90.7% | Pass — user-authorized scope /95.0% |

| API-REV-003 | Code Reviewer CRR-003 /IR-002 Delivery Local Fix re-entry /Round3 | SR-015/ARCH-REV-002/IR-002/CRR-003/DR-001/DLF-001–002; preserved CRR-001/002/API-REV-001/002 | Pass — scoped/as-of pre-integration /95.0% | Pass — bounded current integrated scope /95.0% |

## Revision Entries
### API-REV-001 — Initial actual-boundary validation; real voice dependency blocked
- Date/ticket/worktree: 2026-10-02, PROJ-TASK-MANAGER-20261002-001, `/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-manager-foundations`; Large/High Reviewed route.
- Trigger: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-manager-foundations/tickets/in-progress/project-task-manager-foundations/code-review-report.md` / CRR-001 Implementation Review Round1; no source finding. Independent source score10/10 not runtime acceptance.
- Related upstream: current SR-015/SD-AP-001 core/SD-AP-002 Refresh/UF-017, ARCH-REV-002 Round2 Pass; prior ARCH-REV-001 Fail/ARCH-F-001 preserved; IR-001. Delivery revision N/A.
- Why recorded: first completed staged API/E2E result, not inferred prior Pass. Investigation/ledger created before durable test changes. Core cases passed; installed optional voice runtime cannot be proven without new consent/dependency.
- Durable paths: existing Projects GraphQL schema assertion updated; new project-task-boundaries.e2e.test.ts and server tests/fixtures/project-task-tool-writer.mjs; current16-case ordinary Projects probe replaces obsolete overlay/card blocks; immutable extension archive fixture update. All absolute paths/diff/checkpoint in report/package inventory.
- Added/rechecked cases: API-MCP/FILES/AGG, REPO-SERVER/WEB, TYPECHECK, WEB-PAGES/REFRESH PT-E2E-001–016, DESKTOP typed/unavailable/physical Refresh, DESKTOP-VOICE Blocked. Same case IDs reused across within-round harness reruns; no fake switching journey.
- Execution delta: shared preparation/server150/150 (20 files)/build, renderer113/113 (12 files), Electron9/9 (4 files); final HTTP13/13 subset after physical cleanup proof; browser16/16 real ordinary triggers/actual backend restart; owned packaged Electron build and actual native typed save/detail/Refresh.
- Latest checker after test-code edits exit2/387 vs source-base exit2/388: no new exact failing sites/codes; initial full-message comparison0added/1removed; latest existing websocket.ts:15:3 TS2322 message shape changed, origin not fully attributed. No full checker Pass/suppression or all defect-owner attribution. Post-package broad-glob output caused an OOM attempt; identical checker after own output relocation completed, outputs restored and backup removed.

#### Prior Failure Resolution
None — prior API/E2E round result N/A. Within this initial round, stale contextChanges assertion and harness locator/Host/Retry/writer architecture/row prefix/router settlement/capability-source/Settings exit issues were API/E2E Local Fixes, corrected and rerun. Concurrent `.nuxt` regeneration was owned validation interference; serialized final run. Electron initial8/9 transient install failure not reproduced on base/serial current; stable once-built archive fixture correction verified9/9, no exact root cause or production failure asserted. Historical logs remain retained rather than rewritten.

- Canonical artifacts updated: coverage investigation, execution coverage report, test-case ledger and this history; package inventory/durable diff supporting evidence.
- Prior result/confidence: **N/A**.
- Current result/confidence: **Blocked /90.7%**, clean ≥95% unmet; user-surface 75% below90. Every critical AC direct proof No: installed/enabled real voice AC-018 only; typed/unavailable branch proved.
- New/remaining failure IDs: no supported implementation failure; dependency case DESKTOP-VOICE Blocked; web checker remains failed with no new failing sites/codes and one existing message-shape delta.
- Recommended owner/next step: user approval for isolated official Voice Input install/enable, microphone permission/device and short spoken phrase. No team handoff while Blocked; successful test-code review remains Required via get_handoff_rules when resumed gate passes.
- Cleanup: all owned browser processes/root; own isolated instance stopped/root removed/ports released; baseline worktree removed; own untracked SDK outputs/temp scripts removed. Other instances/user data untouched; desktop launcher log removed by lifecycle, not falsely listed as retained.
- Remaining scope: real device/transcript/recording/no-speech/permission/IPC late-cancel not runtime-proven; mocked repository contracts not upgraded. Deferred Manager/team/scheduler/sidebar/stopping/client/skills/phone and unsupported MP-004 not reopened. No push/integration/release/installed-setting changes.

### API-REV-002 — User waives optional microphone retest; scoped Pass
- Trigger: direct user reply captured verbatim in `/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-manager-foundations/tickets/in-progress/project-task-manager-foundations/api-e2e-user-voice-validation-waiver.md`. Initial reviewed request also described actual desktop microphone validation as optional.
- Prior report/round: API-REV-001 Round1, Blocked /90.7%, optional DESKTOP-VOICE. Prior result remains historical; missing or waived execution is not Pass evidence.
- Related revisions: cumulative SR-001–015/current SR-015; SD-AP-001/002/UF-017; ARCH-REV-001 historical Fail/ARCH-REV-002 Pass; IR-001; CRR-001; delivery N/A. Large/High Reviewed unchanged.
- Basis: user declines further real voice testing and accepts progression. Optional hardware surface excluded from the current validation gate; actual capability remains Not Tested/user-waived, independently UNVERIFIED. No change to product AC-018, production design/source or preserved voice regression tests.
- Coverage/execution delta: documentation-only scope and result reassessment; no new suite/browser/app/mic execution or durable test code change. Verified clean branch, prior345 package hashes and unchanged test checkpoint e4764d76a34328bacd62e76856689e6da6300da4. Reuse all prior case IDs and exact successful results: server150/150, renderer113/113, Electron9/9, HTTP13/13 subset, browser16/16 and real packaged typed/detail/Refresh.

#### Prior Failure / Blocker Resolution
| Case | Previous classification/result | Current resolution | Evidence |
|---|---|---|---|
| DESKTOP-VOICE | Optional dependency Blocked, no supported implementation failure | Not Tested — user-waived; withdraw further hardware check, not a test Pass | Direct user waiver supplement; no fabricated runtime evidence |
| TYPECHECK | Actual command Fail387 vs base388; investigation completed | Unchanged known debt; zero new exact failing sites/codes; one old message-shape delta still disclosed | Existing comparison and raw logs; no suppression or full checker Pass |

- Canonical artifacts updated in place: investigation, report, ledger, this history, package inventory; new user-direction supplement. No versioned report copy or rewritten old history.
- Current result/confidence: **Pass for user-authorized validation scope /95.0%** (seven categories95%, 665/7); no category below90. Comparison to prior90.7% is scope reassessment only, not new runtime evidence. Current critical gate directly proven; installed real voice branch explicitly outside independent runtime claim.
- Broader validation: required actual API/browser/lifecycle/desktop completed previously; **additional Not Required**, based on existing direct boundary evidence and explicit waiver.
- Remaining residuals: real device/permission/transcript/worker/IPC branch independently unverified and user-waived; full typecheck Fail, message-shape origin not fully attributed; no model/Manager/team/new coordination/phone proof. No new supported implementation failure.
- Durable coverage paths from API-REV-001 unchanged; all five require proportional successful test-code review on Large/High route. Full cumulative package plus waiver/tests/diff/logs attached through get_handoff_rules recipient. No Delivery bypass.
- Cleanup: unchanged; all own validation processes/root removed, package output retained ignored, branch/evidence clean. No new installation/setting/permission/audio changes, integration/push/release.

### API-REV-003 — Current merged correction revalidation and preserved-caller Local Fixes
- Trigger: CRR-003 Implementation Review Round2 Pass, latest code-review-report/history; IR-002 after DR-001 Blocked /DLF-001–002. Current canonical investigation/report/ledger refreshed, prior histories untouched. Large/High/Reviewed unchanged; ARCH-REV-001 Fail /ARCH-REV-002 Pass /IR-001 /CRR-001 /API-REV-001 Blocked /API-REV-002 scoped Pass /CRR-002 test Pass preserved as-of.
- Basis: incoming dba9a6b90, preserved merge a5123e7d0 and parents; IR-002 correction4d88b42e2/handoffff4aafa28. Own two-test checkpointe9828bb5134bc44d777bf52417862bf7a5a961a1. No fetch/reset/replay/remerge/push/release/production source change. Delivery16 pre-existing untracked files preserved, not globally clean tree.
- Investigation before execution/edits;457/459 incoming SHA match, two expected CRR-003 report/history snapshot updates. Full463 incoming references/original129 retained plus own new artifacts/current test paths. Implementation Legacy None/Data Directly Usable checks reread.
- Coverage delta: both IR-002 files unchanged/revalidated. API-LF-003A/B add target cancellation mock to focusedInterrupt and rename source→target mock in TeamComposerPublication; entire files otherwise byte-equal to parent, all1+4 bodies/assertions preserved. Existing parser/mirror probe inspected/reused, not new public Team/run delivery. No skipped/weakened/retried tests/checksums or production compatibility fallback.
- Execution: narrow11/11 mentions and2/2 immutable fixture; exact Delivery renderer125/125/13files; additional caller3files initially5Fail/5Pass/14errors → two fixture fixes →10/10; final combined135/135/16files includes125+10. Electron9/9/4files; shared and fresh serverbuild/TS/bootstrap exit0; serial postbuild server150/150/20files includes13 HTTP cases. First150 passed with~1.4s build overlap due yielded-session mistake, retained but not acceptance basis; repeat serialized after build. Repeats/subsets not extra unique coverage.
- Broader delta: current merged runtime independently rerun SERIAL; native-renderer fixture B01–04 **4/4**, candidates/upload/admission/scope doubles disclosed; real2-node Projects PT-E2E-001–016 **16/16** incl actual native tool writes/physical Refresh/error/ordinary route/bytes/backend process restart/full counts, zero pageerrors both. No new full web build/checker/package/app/device run. Prior packaged evidence remains pre-integration; hardware waiver preserved.

#### Prior Failure Resolution
| Case | Prior classification | Current resolution / evidence |
|---|---|---|
| DLF-001 |Delivery preliminary Local Fix — stale mention double; IR-002/CRR-003 correction verified |Independent11/11,125/125 and135/135; all11 bodies unchanged. DR-001 decision remains Delivery-owned/as-of |
| DLF-002 |Delivery intermittent install result unexplained; separate mutable archive hazard reproduced |Independent2/2 manifest/repeated >1100ms bytes/SHA/later manifest plus install/enable/fake worker; passes current. Original intermittent cause **UNPROVEN**, no hardware defect claim |
| DESKTOP-VOICE |API-REV-001 optional dependency Blocked, API-REV-002 user-waived |Unchanged Not Tested — user-waived, independently UNVERIFIED; AC-018 not changed; no new capture/install/permission requested |
| TYPECHECK |Last executed full checkerFail387/base388; one existing TS2322 message origin partly unattributed |Not rerun current round; historical failure retained, no current full checker/new-type-origin/full build/package Pass |
| API-LF-003A/B |New current composer test double failure at target watch/unmount, null-VNode cascades |Only mock interface updates; same10/10 and combined135/135/no unhandled errors. Valid bodies/assertions unchanged; no remaining supported source fault |

- Confidence: post-repository90.7% (635/7), user-surface75 → broaderRequired. After current browser/runtime proof all7 scoped categories95%, final **95.0% (665/7)**; no applicable category<90; critical retained slice proof complete, full installed AC-018 branch excluded from independent runtime claim. Percentage is scoped validation confidence, not line coverage/production certification.
- Current result: **Pass for user-authorized bounded correction/current integrated Projects scope**. Prior API-REV-002 scoped95% is pre-integration, not reused as renewed runtime evidence. Additional broaderNotRequired; new desktop/package not selected for unchanged production shell/test-only correction, no final-product claim.
- Cleanup: browsers/Nuxt/nodes stopped, own Project root/temp page removed, five owned ports not accepting, only absent-at-entry generated SDK dist removed; Delivery16 byte-identical/untracked/unstaged, installed app/data/defaults/audio untouched. Rebuild shared prerequisites for future checks. No owned case/process outstanding.
- Next: proportional successful durable test-code review for current4 correction paths and cumulative package via exact returned rule, not Delivery. CRR-002 test review remains unchanged/as-of. DR-001 not declared unblocked. Delivery owns current-base/docs, explicit integrated user verification/finalization; voice waiver not finalization approval, no terminal eligibility.

- Rule selection: final get_handoff_rules returned4; first Pass+Large/High proportional test-review rule most specifically applies, exact recipient /software_engineering_team/code_reviewer only. Failure/direct-low-risk/upstream-gap rules inapplicable; no Delivery bypass. Evidence round-3-evidence/handoff-rule.json.
- Hygiene: all4 test correction deltas and canonical API docs git diff --check Pass; staged raw new evidence logs exit2/148 output lines of whitespace warnings, retained/disclosed in artifact-hygiene.json. No raw Delivery/previous API/IR logs normalized or changed.
