# Code Review Report — Shared Network Workspaces

## Review Round Meta

- **Latest result: Pass — CRR-002; CR-001 resolved.** Implementation-source review, not API/E2E signoff or proportional post-API test review.
- Reviewed2026-10-13 personally by `/software_engineering_team/code_reviewer`; no delegation.
- Task `project_task_0793009f-41bc-4684-9cbe-9a29ad26ed63`; worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/shared-network-workspaces`; branch `codex/shared-network-workspaces`; base/finalization `origin/personal`.
- Current source HEAD `ac9887e215`; fix `dfeac830f468994255fdafc31f66cdbeee1852cc`. Previous review basis `caa318d795d73a85e8d3eb374d21ef532a8513f3` includes CRR001 review `d4ac42107e` and FUP001 custody receipt. Original implementation `c57ab71c90`, baseline launcher `6717bcb221`, fixture-only core change `f34fc81aa2` remain.
- Current round **2 / Targeted Delta Review**. Trigger: **IR-003 Local Fix Complete** for CRR001/CR001. Prior authoritative result **CRR-001 Fail — Local Fix** was read, not inferred away. [Cumulative revision record](code-review-revision-record.md) preserves it and records resolution.
- Scope evidence: exactly **one production owner and two associated test files** since the last review; no shared public API, data shape, spine or source-ownership change. Independent [delta audit](code-review-evidence/crr-002/delta-audit.json) confirms137 other IR002 paths byte-identical. Full Re-Audit not triggered; unaffected structural checks are explicitly carried forward.
- Authorities: [requirements](requirements-doc.md) **Approved SR018**, [approval018](approval-record-sr018.md), [approval017](approval-record-sr017.md), [scope feedback](architecture-review-scope-feedback.md); [design](design-spec.md) **Ready SR019**, [investigation](investigation-notes.md), [solution history](solution-revision-record.md), [complete solution handoff](solution-design-handoff.md). All unchanged from previous review basis.
- Architecture: [design review](design-review-report.md), [architecture revision record](architecture-review-revision-record.md), **ARCH-REV-003 Pass**. D-001 remains deferred, not fixed.
- Implementation: [handoff](implementation-handoff.md), [cumulative IR record](implementation-revision-record.md), **IR-003**; IR001/IMP-D001 and IR002 preserved. Their mentions of CRR001 Fail describe this round's trigger; this canonical CRR002 result now governs source review.
- Supplemental chain carried from CRR001: [experiment index](evidence/feasibility/experiment-index.json), [feasibility](evidence/feasibility/feasibility-report.md), [Mac feasibility](evidence/feasibility/macos-vm-feasibility-report.md), [native-folder report](evidence/feasibility/native-folder-hosting-report.md), [backend correctness](evidence/feasibility/backend-correctness-report.md), [private-runtime skills](evidence/feasibility/private-runtime-skill-report.md), [native readiness](evidence/feasibility/native-private-readiness-report.md), [agent roundtrip](evidence/feasibility/real-agent-roundtrip-report.md), [SR017 selection](evidence/feasibility/sr017-selection-report.md), SR018/019 audits, Nodes guide reference, and [IR001 source-lease correction](implementation-evidence/ir-001/source-lease-design-impact.md). Still-relevant limits preserved; not re-executed or relabeled as current-product proof.
- Coverage investigation/execution reports, API-REV and DR: **N/A — not yet performed**. No API/E2E failure-origin review.

## Routing Classification Review

**Large / High; independent Implementation Review required.** The local correction does not reduce package size/risk. No design/requirement change or classification correction needed. Source Pass permits the configured API/E2E handoff, not release or delivery.

## Review Scope

Delta: `autobyteus-nfs/internal/platform/commands.go`, new `internal/platform/directory_modes_test.go`, changed `scripts/tests/test_nfs_installer_fixture.py`. Rechecked all production RootDirectory call sites, unchanged bootstrap/elevation/install/public config/nonroot probe path, complete tests, IR003 check runner, positive/mutation/cleanup evidence and claimed authority preservation.

CRR001 full review covered DS001–005 and139 non-ticket paths/99 source files; cumulative implementation now has140 paths (one new test). That unaffected review is carried forward by hashes, not rerun. Reviewer made no source/test fix. No Go toolchain installed, delegated worker, live install/mount/export/Docker/provider operation, merge/push/release or user verification. Pre-existing generated dist directories untouched.

## Upstream Behavior And Production-Path Basis Confirmation

Approved first-use and preservation contracts unchanged. **Behavior basis Confirmed** at source-review level; no ambiguous/new intended behavior. BEH001's prior contradiction is resolved by exact final directory modes; not by relaxing the installer mask, changing sudo policy or redefining an AC. Confirmation is not physical/native acceptance execution.

| Behavior | Status | Implementation / lifecycle evidence and disposition |
| --- | --- | --- |
| BEH001 | **Confirmed — revalidated** | DS001 bootstrap077 -> CLI approval/elevation -> root installer -> RootDirectory recursively creates new parents and chmods intended0755/0700 -> existing nonroot verification/public descriptor path. CR001 resolved; actual privileged flow still requires validation |
| BEH002 | Confirmed — carried | DS003 common admission/restore, shared binding, execution-private profiles, existing native process close; no source pin or shared publisher regression |
| BEH003 | Confirmed — carried | DS002 OS NFS same endpoint/marker; exact child Git trust; documented Apple local-lock versus Ganesha distributed-lock distinction |
| BEH004 | Confirmed — carried | Known bad setup/new-run binding refuses local-temp substitution; DEC015 outage stalls remain disclosed |
| BEH005 | Confirmed — affected boundary revalidated | TrustedPath remains sole production validator; only freshly created directories chmodded; existing entries, private config and unrelated source/node data unchanged; selected Docker/consent owners unchanged |
| BEH006 | Confirmed — carried | DS004 existing healthy REST/explorer/static/artifact readers/streams unchanged; no outage workers added |
| BEH007 | Confirmed — carried | DS005 Nodes guide/descriptor/copy/localization unchanged; default unqualified release correctly unavailable |

Prior-finding resolution was checked before result/score updates; see CRR002 in the revision record.

## Supported Product Scenario And Reachability Gate

| Scenario / contract | Actor, coherent goal and supported initiating surface | Validity / lifecycle path / expected result | Evidence / use |
| --- | --- | --- | --- |
| SCN001/011/013; BEH001; REQ006/013/018/019, AC012/018/019 | User/storage owner invokes first service command on a supported fresh computer and grants administrator approval | **Supported Normal Scenario**. Qualified bootstrap -> root binary/private/public installation -> selected setup and nonroot verification -> usable folder. Intended final modes must survive inherited077 | Approved requirements/design, not tests; **Use for CR001 resolution** |
| SCN005/008/009/012; BEH005 | Owner attaches/retries/detaches selected source/nodes without altering unrelated/private state | **Supported Normal / Explicit Edge Scenarios**. Validated parent and existing-path refusal; preservation across consent/apply/receipt lifecycle | Approved preservation contracts; **Use** to reject broad chmod/adoption and verify bounded correction |
| SCN002/003; BEH002/003 | Agents use selected shared project with ordinary tools and coordinated edits/Git | **Supported Normal Scenario**. Native profile/process -> OS filesystem -> peer fresh read | CRR001 unchanged witnesses carried; **Use** |
| SCN006 and SCN014; BEH006/007 | User reopens healthy previews / opens Nodes NFS Guide and copies command | **Supported Normal Scenario**. Existing readers or guide descriptor/copy -> expected content/truthful availability | Approved AC010/020 and CRR001 unchanged path evidence; **Use** |
| MP003 / MP004; source-owner contract | User confirms managed-source changed-revision Update / Remove (distinct supported operations) | **Supported Normal Scenario**. Existing source owner independently retires/deletes bytes; private links provide no retention | ARCH003, unchanged source hashes and CRR001 trace; **Use**, not a snapshot promise |
| DESIGN.md/shared principles and fixed-root authority | Maintainers preserve clear owner, trusted privilege boundary, testability without production bypass | **Supported engineering contract**. Exported RootDirectory fixes TrustedPath; unexported helper provides same recursion and bounded fixture seam | Current code/call-site search; **Use** |
| SCN004/MP001/002 | Storage loss during established work | Reachable **deferred v1 edge**; no bounded outage/unrelated-work responsiveness guarantee | Approved DEC015; disclosure only, no finding/deduction |
| SCN007 / invented retained-generation guarantee | Hypothetical automatic ingestion or source snapshot not approved | **Technically Possible but Unsupported/Contrived** for this package | Scope/SR019; **Reject**, no mechanism |
| Updater category contract / FUP001 | Existing updater classification independent of incidental stack paths | Supported existing contract, unaffected baseline problem outside NFS scope | CRR001 evidence/hash confirmed; **follow-up only**, no new notification |

### Candidate Finding And Mechanism Gate

| Candidate | Scenario, forward path / lifecycle / consequence | Current evidence | Disposition |
| --- | --- | --- | --- |
| CAND001 / CR001 | Approved fresh install's077 previously turned requested0755 root binary/public ancestors into0700 and blocked nonroot access | New chmod only after successful mkdir under recursively trusted parent; all requested new parent/private modes preserved. Source review + Go/bootstrap exact-mode tests and three negative controls | **Resolved**, no remaining finding; bounded correction implements existing contract |
| CAND002 / FUP001 | Existing stack-path network regex false-positive during normal updater-category validation | Classifier/spec byte-identical; retained current-source failures and PM custody | **Follow-up retained**, not a ticket deduction |
| CAND003 | Source-generation pinning hypothetical requirement | Unchanged approved source deletion authority | **Reject**, no new lease/copy/refcount |
| CAND004 | Reintroducing per-action outage isolation | Unchanged reachable but expressly deferred edge | **Reject as v1 requirement**, not as unreachable |
| CAND005 | Mac-client4.1 incompatibility hypothesis investigated in CRR001 | Existing native mount evidence/manual, unchanged options | **Rejected defect hypothesis carried**, no option rewrite |

No held or unclear candidate and no new actionable finding. The tests reproduce an independently approved install contract; they do not establish that contract themselves. Same-UID fixture reads alone would be insufficient: explicit0755 parent assertions and mutation failures are material evidence.

## Structural Design Checks

“Carried” means the CRR001 finding-free check remains valid on independently hash-confirmed unchanged source; affected checks were revalidated below.

| Check | Result / current evidence | Action |
| --- | --- | --- |
| Task design-health posture | Pass — bounded mode correction in existing platform owner; larger approved structure carried | None |
| Supplemental alignment | Pass — approval/design/reviewer basis unchanged, evidence limits preserved | None |
| Data-flow spine clarity/preservation | Pass — DS001 public path unchanged; DS002–005 carried | None |
| Ownership boundaries | Pass — fixed production TrustedPath, helper private; no new owner | None |
| Off-spine concern clarity | Pass — exact directory modes stay in privileged platform helper | None |
| Existing subsystem reuse | Pass — no new installation/config subsystem; other reuse carried | None |
| Reusable owned structures | Pass — existing recursive operation shared by production and fixture | None |
| Shared data-model tightness | Pass — no shape or persistence change | None |
| Coordination ownership | Pass — synchronous directory create/mode/validate remains one owner | None |
| Empty indirection | Pass — exported wrapper fixes mandatory production trust policy; not an arbitrary pass-through layer | None |
| SoC/file responsibilities | Pass —86-line platform owner, tests separated; other checks carried | None |
| Ownership-driven dependency | Pass — only os.Chmod and private callback seam; no reverse test dependency | None |
| Authoritative Boundary Rule | Pass — callers still use RootDirectory; none can supply fixture validator | None |
| File placement | Pass — platform implementation and same-package contract tests; existing installer test reused | None |
| Flat versus over-split | Pass — one private helper, no new framework/file for production | None |
| Interface clarity | Pass — public signature unchanged; callback is unexported implementation/test seam | None |
| Naming/responsibility alignment | Pass — rootDirectory/TrustedPath name existing obligations; rest carried | None |
| Duplication | Pass — same production mkdir/chmod recursion exercised; no test copy of fixed algorithm | None |
| Patch-on-patch complexity | Pass — one direct correction, no special-case node/OS chmod branches | None |
| Dead code | Pass — new helper called at sole production entry/recursion; no obsolete path introduced | None |
| Test scenarios/assertions | **Pass — revalidated**. Actual bootstrap mask, all new ancestors/private/public modes; negative controls detect missing leaf/node/intermediate chmod | CR001 test gap closed locally |
| Test fixtures/helpers | Pass — shared fake archive/downloader, owned-tree trust substitute; real-sudo limits explicit | Keep limits visible |
| Stale/compatibility-only tests | Pass — child-only skip has actual parent invocation in Go logs; no waived current case | None |
| API/E2E readiness | **Pass — revalidated for handoff**. No known source blocker after CR001; native/privileged/system execution remains API/E2E work | Forward complete package, not delivery |

## Source File Size And Structure Audit

Current delta table and independent hashes: [CRR002 checks/size](code-review-evidence/crr-002/checks-and-limits.md), [delta audit](code-review-evidence/crr-002/delta-audit.json). `commands.go`: **78→86 nonempty (+8)**, passes>500 and>220 delta gates, same owner/placement, no required structural action.

The other98 implementation-source rows of the complete [CRR001 size audit](code-review-evidence/crr-001/source-size-audit.md) are carried unchanged; commands.go's row is superseded by the one above. Still99 implementation source files, largest473, no >500 or >220 delta violation. Tests are excluded from source thresholds. No forced test split.

## Legacy / Backward-Compatibility Verdict

| Check | Result / evidence |
| --- | --- |
| No new backward-compatibility mechanisms | Pass — no release/migration branch or historical-shape reader |
| No old-behavior retention | Pass — requested final modes replace accidental umask behavior, no dual implementation |
| Dead code removed in touched scope | Pass — no unused helper/flag identified |
| Approved persisted transition followed | Pass — no persisted-shape change or new migration |
| No version-specific dual reads/writes | Pass — unchanged service descriptors and application state |
| Transition mechanics match design | Pass — private safety/ordinary local policies carried; no data/source adoption |

Dead/obsolete/legacy items requiring removal: **None identified**.

## Docs-Impact Verdict

**Yes for the overall feature; no new user-behavior documentation change for this fix.** It now honors the NFS README's separately traversable binary/public descriptor contract. Existing NFS/skills/launcher/guide/release docs and their limitations remain applicable. Final Delivery docs sync and actual qualified-release linkage still required; no public release asserted.

## Additional Material Premise Validation

| Upstream premise | Status / consequence |
| --- | --- |
| MP001 | Confirmed/carried — parent workspace-preview IO can stall during outage; DEC015 deferral unchanged |
| MP002 | Confirmed/carried — completed-artifact path IO has same disclosed limitation |
| MP003 | Confirmed/carried — source Update independently retires prior bytes; no profile retention |
| MP004 | Confirmed/carried — source Remove independent; AGY missing-source warn/skip unchanged |

No new or reclassified material premise. CR001's normal-install witness and its correction are fully recorded above and in [CRR002 evidence](code-review-evidence/crr-002/checks-and-limits.md). No root-policy bypass is inferred from the fixture callback; production always supplies TrustedPath.

## Checks And Evidence Limits

- **Personally executed:** current Python packaging/installer scope,7 enumerated/**6 pass,1 child-only skip**. Clean environment and temporary-root removal in [checks-result.json](code-review-evidence/crr-002/checks-result.json), exact output in [python-fixtures.log](code-review-evidence/crr-002/python-fixtures.log). This reviewer command does not execute the Go child.
- **Source/evidence reviewed, not rerun:** IR003 full7-package race/vet, native Go/bootstrap fixture, three expected-failing mutation controls, four-target compile and native version/unqualified refusal; [IR003 limits](implementation-evidence/ir-003/checks-and-limits.md), [final checks](implementation-evidence/ir-003/final-checks.json), [nested positive log](implementation-evidence/ir-003/go-race-final.log). Go toolchain was removed by implementation; reviewer did not reinstall it.
- The mode fixture substitutes root ownership only inside a disposable user-owned tree. Both OS layouts run on the native Mac. Neither same-UID nonroot fixture execution nor foreign compile proves actual root-owned different-UID installation or independent operating systems.
- **Not an all-green repository:** carried IR002 Nuxt4258 pass/3 fail/5 skip (611 passing files/1 failing/2 skipped) and Electron188 pass/3 fail/1 skip (35 passing files/1 failing/1 skipped). Same baseline updater category failures; diagnostic candidate patch remains absent and candidate-only green logs are not current-source passes.
- No new native inference, support-asset, peer/restore, mounted UI, real Docker, physical, release or user-verification proof. Earlier implementation/CRR001 passing suites are retained at their actual scope, not relabeled as reruns.

## Review Scorecard

**10.0/10 (100/100)**, simple average; prior93→100 restores only the7 points deducted for resolved CR001 (readiness7→10, correctness6→10). Other eight scores carried unchanged. These are source-review scores for known supported in-scope deficiencies, **not a claim of all-green tests, complete native/physical validation or perfection**. Score does not waive gates.

| Priority | Category | Score | Reason / weakness / expected improvement |
| --- | --- | ---: | --- |
| 1 | Data-Flow Spine Inventory and Clarity | 10 | DS001–005 unchanged, prior evidence carried; no promoted weakness; preserve paths |
| 2 | Ownership Clarity and Boundary Encapsulation | 10 | Mandatory TrustedPath fixed at public entry, private callback bounded; no promoted weakness; retain exact ownership |
| 3 | API / Interface / Query / Command Clarity | 10 | Public signatures/identity unchanged; no promoted weakness; no new interface needed |
| 4 | Separation of Concerns and File Placement | 10 | Direct mode correction in existing platform owner; no promoted weakness; preserve boundary |
| 5 | Shared-Structure / Data-Model Tightness and Reusable Owned Structures | 10 | Same recursive implementation reused by fixture, no shape growth; no promoted weakness; no extra machinery |
| 6 | Naming Quality and Local Readability | 10 | Clear successful-mkdir-only chmod and production trust binding; no promoted weakness; maintain explicit comments |
| 7 | API/E2E Readiness | 10 | CR001 regression now covers relevant modes/ancestors and preserved refusal; no known source blocker; perform downstream real validation, not a source-score deduction |
| 8 | Runtime Correctness And Behavioral Fidelity | 10 | CAND001 consequence removed under same approved install contract, existing/private modes preserved; no remaining promoted defect; actual privileged qualification still required |
| 9 | No Backward-Compatibility / No Legacy Retention | 10 | No new migration/retention/dual behavior; no promoted weakness; retain approved policy |
| 10 | Cleanup Completeness | 10 | No dead source, owned test resources cleaned and historical negatives retained; no promoted weakness; leave unrelated generated outputs alone |

## Findings

**No open in-scope findings. CR-001 resolved in CRR-002 / IR-003.**

Prior P1 location `platform/commands.go:71–82` is now corrected at75–91: recursive trusted parent, successful mkdir, exact final chmod, then trust validation. Only newly created directories are changed. Bootstrap077 remains, and public/private/binary consumers request their existing intended modes. The regression checks every necessary ancestor and both descriptor locations; mutation logs fail where leaf/node/intermediate correction is removed. This closes the independently supported first-install source defect without claiming an actual privileged installation. Prior finding and proof remain in CRR001 history/evidence; no finding ID was replaced or silently dropped.

## Follow-ups

These do not fail this review, lower its score, or enlarge this ticket.

| ID | Problem / location | Evidence | Why outside this ticket | Suggested Task |
| --- | --- | --- | --- | --- |
| FUP001 | Existing updater classifier searches Error.stack; a path containing `shared-network-workspaces/...appUpdateErrorClassifier` falsely satisfies network regex, misclassifying three normal category cases | `autobyteus-web/electron/updater/appUpdateErrorClassifier.ts:34–37,55–62,105–113`; unchanged source/spec hashes independently checked in review audit; [updater follow-up](implementation-evidence/ir-002/updater-follow-up.md), baseline finding/candidate disposition and current-source Electron result | Neither classifier nor spec changed by this feature; NFS source can be corrected/validated without redesigning updater classification. TESTING rule9 product-change follow-up applies | Make updater classification independent of incidental stack paths; preserve diagnostic stack separately and cover category behavior across checkout paths; rerun Nuxt/Electron current source |

- **Sent:** `/project_task_manager`, receipt `accepted:true / DELIVERED`, target AgentRun `project_task_manager_a5f6d9d306e54970bafdad895bdf731d`, 2026-10-13, message type `review_follow_up`. This is the requirements' Requested-by owner. No task/worker was created by this review.

- **PM tracking receipt (2026-10-13, informational only):** `/project_task_manager` found no duplicate Task and retained FUP001 at `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/task-plans/context/fup001-updater-stack-path-classification-candidate.md`, awaiting user approval to create a separate Task. Seven public artifacts are in originating Project context for durable custody. No Task, worker, dispatch, scope expansion, review waiver or duplicate technical handoff. That receipt did not change the then-current CRR001 Fail/CR001 route; CRR002 now resolves CR001 independently.

## Classification And Recommended Recipient

**Review outcome: Pass. Failure classification: N/A.** Large/High retained. The complete cumulative package is ready for configured API/E2E coverage work. Fresh `get_handoff_rules` selected the primary rule “When implementation review passes and the cumulative package is ready for API, end-to-end, and executable coverage work” -> exact `/software_engineering_team/api_e2e_engineer`. Apply the active single-outcome-recipient convention; no additional same-outcome notification or duplicate technical handoff. No implementation correction, upstream revision or delivery handoff is required.

## Residual Risks / Mandatory Downstream Gates

- Actual authorized privileged first install/start/restart and source/private preservation; native Mac APFS/Apple, Ubuntu ext4/Ganesha, Docker-on-Linux storage, native and managed Docker clients on **both** platforms. Only Mac-Docker storage hosting remains deferred.
- Real selected Docker image/Config/HostConfig/private volumes/auth/ports/aliases, consent/drain/recovery and launcher attachment retention.
- Current-product standalone/Team/Org native tools, previously unread support assets, separate peer close/restore; source Update/Remove and AGY/local policies. Signed-out metadata discovery is not this proof.
- Healthy mounted explorer/media/HTML/relative assets/completed-artifact previews through unchanged APIs; independent physical Mac/Linux/Docker evidence before delivery.
- Docs sync, integrated finalization/merge, explicit user verification and only authorized qualified release remain outstanding. Default unqualified release/Guide unavailable is truthful, not an installer-publication claim.
- D001/DEC015 outage stalls remain **deferred, not fixed**. No stream workers/action probes/cwd trampoline/source pin/copy/refcount or local substitute is required by this Pass.
- FUP001 baseline failures remain visible under PM ownership; no unrelated fix/waiver or new task/dispatch from review.

## Latest Authoritative Result

- **Pass — CRR-002, Implementation Review round2, Targeted Delta Review.**
- Supported Product Scenario Gate: **Pass**; Material-Premise Gate: **Pass**.
- CR-001: **Resolved**. New/open findings: **None**. Failure classification: **N/A**.
- Score10.0/10,100/100 at source-review scope; not an executable-validation result.
- Next stage: configured API/E2E handoff with full cumulative chain. API-REV/DR still N/A, not waived.
- No API/E2E pass, release, merge, explicit user verification, Task DONE or Terminal completion claimed.
