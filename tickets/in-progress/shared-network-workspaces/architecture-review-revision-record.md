# Architecture Review Revision Record

The latest `design-review-report.md` is authoritative. This record indexes review decisions; it is not evidence that a finding is resolved.

## Revision Index

| Revision ID | Review Round / Trigger | Related Solution Revision IDs | Prior Decision | Current Decision | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| ARCH-REV-001 | 1 / Architecture Design Complete, Large/High | SR-017; retained SR009–016 evidence | N/A | **Fail — Design Impact** | D-001 |
| ARCH-REV-002 | 2 / Approved working-first SR018 re-review | SR-018; SR-017 history | Fail | **Pass** | D-001 deferred by approved scope, not repaired |
| ARCH-REV-003 | 3 / IR-001 IMP-D001 source-owner correction | SR-019 design; Approved SR-018 | Pass on SR018, then implementation Design Impact | **Pass on SR019** | IMP-D001 resolved in design; D-001 remains deferred |
| ARCH-REV-004 | 4 / CRR005 CR003/API-F002 Linux dependency recovery | SR-020 design; Approved SR-018 | Pass on SR019; later CRR005 Design Impact | **Pass on SR020** | CR003 design recovery accepted; product/API closure pending |
| ARCH-REV-005 | 5 / CRR008 CR005/API-F003 selected-client boot completion | SR-021 design; Approved SR-018 | Pass on SR020; later CRR008 Design Impact | **Pass on SR021** | CR005 design recovery accepted; product/API closure pending; API-F002 resolved at API003 scope |

## Revision Entries

### ARCH-REV-001 — Initial SR017 review; complete the shared-content reader boundary

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/shared-network-workspaces/tickets/in-progress/shared-network-workspaces/design-review-report.md`.
- Review round and trigger: Round 1, 2026-10-13; Solution Designer completed architecture handoff.
- Triggering role/report: `/software_engineering_team/solution_designer`; canonical `solution-design-handoff.md`; no prior reviewer findings.
- Relevant solution revisions: SR-017 current approved basis; earlier experimental/history revisions retained at their original scope.
- Reviewed package commit: `f22e8aeaa7e7b68e301c68446ac862d9c555f857` on `codex/shared-network-workspaces`.
- Prior authoritative decision: **N/A**. No prior report or revision record existed; absence was not treated as Pass.
- Current authoritative decision: **Fail — Design Impact**, task_size **Large**, architectural_risk **High**.
- Baseline: SR017 approval, selected native Mac/Linux/Docker matrix, plaintext trusted-network policy and pre-delivery physical gate accepted without reopening choices. Structural/persistence/runtime/lifecycle review completed. Independent source tracing identifies existing media/static and agent-artifact REST reads outside the proposed shared action owner. They perform parent synchronous checks and parent streams and can violate approved bounded diagnosis/unrelated-local responsiveness during SCN004 outages.

#### Prior Finding Resolution

None.

- New/remaining finding: **D-001**, High/blocking, Within Approved Scope; protects REQ007/008/011, AC006/010, BEH004/006 and local preservation. No intended-behavior change.
- Material-premise validation: **MP-001 and MP-002 Reachable**; UI-supported preview/result actions traced forward to exact current direct-read routes. Material-premise gate Pass; no new hypothetical fault contract.
- Required delta: allocate existing REST content readers to bounded shared IO ownership, specify binary/stream lifetime and response/disconnect/deadline semantics, map files/removals and validation. Reuse existing proposed capability rather than invent a general file service.
- Material classification changes: none from Large/High; new review outcome Design Impact, not missing approval/hardware.
- Recommended recipient: `/software_engineering_team/solution_designer`; configured rule to be applied after persistence. No implementation forwarding.
- Remaining risks: current-source setup/runtime/mode/UI and independent physical proof remain downstream obligations; historical probes are not product signoff. No live mounts/nodes/data/provider use or upstream/source modifications performed by this review.

## Post-ARCH-REV-001 User Scope Feedback — Not A Completed Review Round

On 2026-10-13 the user explicitly prioritizes a working normal-path v1 and defers the outage edge case explained for D-001. Exact context and requested Solution Designer reconciliation are in `architecture-review-scope-feedback.md`. D-001 is **not required as a v1 blocker under this direction**; its source facts are not claimed fixed. ARCH-REV-001 remains the completed review of SR017's former guarantees. No new architecture Pass/review result or new ARCH-REV ID is fabricated before a revised canonical package is available. Requirements/AC and architecture alignment belongs to Solution Designer; no duplicate user choice questionnaire is requested. Basic normal-use correctness and data/consent protections are not waived.


### ARCH-REV-002 — Pass On Approved Working-First SR018

- Canonical report: `/Users/normy/autobyteus_org/autobyteus-worktrees/shared-network-workspaces/tickets/in-progress/shared-network-workspaces/design-review-report.md`.
- Round/trigger: 2, 2026-10-13; Solution Designer revised approved requirements and architecture after direct-user working-first feedback.
- Triggering role/report: `/software_engineering_team/solution_designer`, `solution-design-handoff.md`; prior finding D-001.
- Relevant solution revisions: **SR-018** current; retained SR017 hosting/access/physical gate and earlier evidence.
- Reviewed package commit: `5251ab48bc7254f5643a4e34f7e9dfe0ffdb525d`.
- Prior authoritative decision: **Fail — ARCH-REV-001 on SR017**.
- Current authoritative decision: **Pass — ARCH-REV-002 on SR018**; Large/High retained.
- Review delta: confirmed renewed approval018 and exact user direction; rechecked D-001 first, then affected behavior/path, health, boundary, file/removal and validation maps. Requirements no longer promise bounded/unrelated-local response during lost storage; both D-001 REST expansion and broader action probe/worker/stream/trampoline machinery are removed. Existing healthy preview APIs and actual normal-use tests are explicit. Narrow binding checks, private skill/exact leases, scoped child Git environment, source/node preservation and downstream physical/user verification remain. Unchanged baseline source/transition evidence retained; no product tests or live operations performed.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| D-001 | High/blocking Design Impact under SR017 outage guarantees | **Deferred / obsolete as v1 blocker by approved scope; not technically repaired** | SR-018 DEC015; user scope feedback; approval018 | REQ007/008/011, AC006/007/010/019, SCN004, QR002; design application/preview, DS004, interfaces/file/removal/validation sections consistently retain normal IO and remove outage isolation |

- New/remaining blocking findings: **None**.
- Material classification changes: Fail -> Pass because the approved behavior and design are now aligned, not because unavailable-storage parent IO was fixed. MP-001/002 remain Reachable but explicitly deferred; material-premise gate Pass.
- Recommended recipients: fresh configured primary implementation recipient, then configured informational Solution Designer recipient after primary handoff succeeds. No duplicate forwarding request.
- Remaining risks: accepted outage stalls; product/current-build/mode/native-runtime/source/node/OS-consent proof not yet complete; independent physical Mac/Linux/Docker, merge/user verification and release-policy gates retained. Pass authorizes implementation routing, not live operations or release.


### ARCH-REV-003 — Pass On SR019 Source/Profile Ownership Correction

- Canonical report: `/Users/normy/autobyteus_org/autobyteus-worktrees/shared-network-workspaces/tickets/in-progress/shared-network-workspaces/design-review-report.md`.
- Round/trigger: 3, 2026-10-13; Implementation Engineer IR-001 / IMP-D001 found that source-byte leases required by SR018 do not exist; Solution Designer returned a technical correction for re-review.
- Triggering role/report: `/software_engineering_team/solution_designer`, cumulative `solution-design-handoff.md`; active triggering evidence `implementation-handoff.md`, `implementation-revision-record.md`, `implementation-evidence/ir-001/source-lease-design-impact.md` and `source-audit.json`.
- Relevant revisions: **SR-019** Ready design, **SR-018** approved requirements and approvals018/017 unchanged; **IR-001 / IMP-D001**. Prior ARCH-REV-002 Pass remains historical, not automatic approval of this correction.
- Reviewed package commit: `4c28e7865bba16218c721c60874f774837283e54`, branch `codex/shared-network-workspaces`, base/finalization `origin/personal`.
- Prior authoritative review decision: **Pass — ARCH-REV-002 on SR018**. That review incorrectly accepted source-lease reuse; the later implementation finding is confirmed, not dismissed because of the earlier Pass.
- Current authoritative decision: **Pass — ARCH-REV-003 on Ready SR019 / Approved SR018**; task_size **Large**, architectural_risk **High** retained for the whole implementation package.
- Review delta: re-established the affected behavior basis, independently traced supported source confirmation -> UI store -> GraphQL -> Update/Remove/source cleanup, current catalog lookup, path/link-holder release, AGY private linking/restore and current source policy. Verified exact profile/process cleanup is separate from source bytes. Current design consistently chooses links/current availability, no source leases/refcount/snapshot/copy fallback, unchanged deletion and AGY warn/skip restore. Rechecked all affected health/spine/interface/dependency/file/removal/persistence/validation maps. Unaffected service/hosting/client/guide/preview/data-preservation and DEC015 judgments retained from prior evidence.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| IMP-D001 | IR-001 Design Impact: source lookup/link holders falsely treated as reusable byte leases; not caught by ARCH-REV-002 | **Resolved in SR019 design only; implementation pending** | SR-019; IR-001; Approved SR018 unchanged | `skill-source-service.ts:154–219`, repository cleanup63–89, skill lookup170–173, materializer195–267/447–489, AGY linker38–109/restore85–110; design source/profile lifecycle, source interface, preserved files and transition/removal/test maps |
| D-001 | Deferred by approved DEC015, not repaired | **Still deferred / non-blocking** | SR-018 DEC015; SR-019 retains scope | Unchanged requirements/approvals and normal preview path; no outage workers or old response guarantee restored |

- Independent audit: all 11 IR001 source hashes match; requirements-doc.md and approval-record-sr018.md / sr017.md byte-identical to5251ab48bc; nine changed paths between ARCH-REV-002 commit and SR019 are ticket artifacts only. Raw FR014 line31 uses dereferenced copying and FR020 line13 copies fixtures; their proof cannot be extended to private linked discovery/retention. Existing source runtime E2E matrix was inspected, not executed.
- Material-premise result: **Pass**. MP-003 changed-revision Update and MP-004 confirmed Remove each have supported UI/contract-forward witnesses; preserve their independent source deletion, do not introduce snapshots or transactional race machinery. MP-001/002 remain reachable deferred outage cases, not new v1 blockers.
- New/remaining blocking findings: **None**. No new requirement or approval questionnaire, classification downgrade, source-retention guarantee or migration is introduced. The concrete implementation concern was resolved by correcting design, not claimed fixed in production.
- Validation performed: static source/docs/test/fixture reads, independent hash and approved-basis comparisons, canonical report/template and artifact whitespace checks. No product build/test, provider, runtime/native mount, live data/node/OS changes or release. No test resources started.
- Recommended recipients: fresh configured primary implementation recipient, then informational Solution Designer recipient after primary delivery succeeds. Cumulative handoff includes this result plus all active IR001 artifacts; no duplicate forwarding request.
- Remaining risks: native Claude/Codex/Grok linked-skill discovery/canonical paths/unread support assets, normal peer-stop/restore and unchanged source/AGY/local behavior require current-build tests; confirmed source changes may remove bytes (no snapshot). All service/setup/runtime/preview and physical Mac/Linux/Docker/user-verification/release gates remain downstream. Pass permits implementation routing, not live operations or delivery claims.


### ARCH-REV-004 — Pass On SR020 Linux Dependency Recovery Design

- Canonical report: `/Users/normy/autobyteus_org/autobyteus-worktrees/shared-network-workspaces/tickets/in-progress/shared-network-workspaces/design-review-report.md`.
- Round/date/trigger: 4, 2026-10-14; Solution Designer returns Ready SR020 for CRR005 CR-003 / API-F002 compatibility recovery. Same Task `project_task_0793009f-41bc-4684-9cbe-9a29ad26ed63`; Large/High remains.
- Reviewed package: `957b052f4b222b7ddb14e148fd5439ba10122379`, `codex/shared-network-workspaces`, finalization `origin/personal`; requirements/approvals remain ApprovedSR018 byte-identical. Original SR019 and implemented IR002–004 scope remain, not reset to unimplemented.
- Active triggering package: cumulative solution handoff and investigation, current CRR005 report/history, API002 execution/investigation/ledger/history, IR004 handoff/history; complete328-reference chain indexed in `evidence/design-recovery/sr020/package-index.json`. New source/prototype/attempt/cleanup/provenance evidence is included, with its clean-installer/architecture/peer limits.
- Prior authoritative architecture result: **ARCH-REV-003 Pass on SR019**, not an automatic Pass on SR020. Downstream current **CRR005 Fail/Design Impact** and **API002 Fail57.14%/broader Required** are not superseded by architecture review.
- Current authoritative architecture decision: **Pass — ARCH-REV-004 / Ready SR020 / Approved SR018**. No new blocking finding or requirement gap; no production qualification or release authorization.
- Review delta: confirmed normal public native-Ubuntu create path reaches the demonstrated directory-access incompatibility and the correction preserves the existing reader/UID/squash/allowlist/UUID/hard4.1/client/kernel. Independently read accepted upstream98eb77c, V4.3 NOTSUPP handler and published Ubuntu source hashes. Inspected all three prototype attempts, selected raw result fields/patch/package/source receipts and cleanup, not rerunning VMs. Narrow backport into distinct4.3-8ubuntu1+autobyteus1 is supported at prototype scope; original wire cause remains inference.
- Structural review: existing release owner builds/locks corresponding source+patch+package identities, supplies notices/modified source, embeds matching per-arch pair within verified CLI and gives identical pair to Docker. Existing backend owns validated0700/0600 staging/APT/mask/requery/cleanup under setup consent/lock. No sidecar, PPA, user compiler/new command, stock hosting fallback, kernel toggle, unsafe reader, blind retry or broad package service. File/ownership/removal/transition/qualification maps are coherent; existing completed reconnect is not an updater.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revisions | Verification Evidence |
| --- | --- | --- | --- | --- |
| CR-003 / API-F002 | CRR005 Design Impact/P1; API002 public Linux create/reconnect fail | **Design recovery accepted; implementation and independent API closure pending** | SR-020, CRR005, API002, IR004 | Actual install/apply/probe/reconnect source trace; upstream98eb77c and V4.3 handler; exact source hashes; scoped candidate create/reconnect/defaultY/hard4.1 receipts; explicit no-preinstall product revalidation and immutable native/Docker delivery contract |
| D-001 | Deferred by ApprovedSR018 DEC015, not fixed | **Still deferred/non-blocking** | SR-018/019/020 | No outage machinery or bounded/unrelated-local guarantees restored |
| IMP-D001 | Resolved in SR019 design; implementation subsequently progressed | **Source/profile policy preserved** | SR-019, ARCH003, IR/CR/API chain | No source lease/snapshot or changed Update/Remove/AGY/local policy in SR020 |
| CR001 / CR002 / API-F001 | Resolved at reported restrictive-mode/native-Mac cold-create scopes | **Retain recorded resolution only** | IR003–004, CRR004–005, API002 | Current source unchanged during recovery; independent Mac receipts and origin classification retained, not broadened to peer/reboot/physical qualification |

- Independent checks: production hash recomputed `497efd6abb0c2cfa4c740a87f005c529cbf026a6fa218b3acd345826f4a923da`; eight protected input hashes match SR020 audit; approvals/requirements match5251ab48bc; all328 incoming paths exist; recovery commit changes ticket artifacts only. Reviewer receipt audit: `architecture-review-evidence/arch-rev-004/review-checks.json`.
- Evidence limits: Attempt1 missing fakeroot, Attempt2 post-create harness failure retained. Candidate creates1.207s/1.154s; final reconnects0.445s/0.619s/sameUUID,60 nonroot directory iterations and normal operations observed in designer receipts. Packages were manually preinstalled with build dependencies: not new installer/runtime-dependency, Docker/amd64, peer/physical, native-agent/UI qualification. Experimental package bytes/template provenance are not production recipe inputs. Reviewer performed no build/product suite/VM/native/provider/live-resource test.
- Material-premise gate: **Pass**. MP-005 Supported Normal Scenario/Reachable has public user action -> production source -> actual failure witnesses independent of proposed patch. MP001–004 retain previous scope/dispositions; no speculative new machinery.
- Validation of review artifacts: canonical28-section template, UTF-8/table shape, source/approval/protected-input comparisons and whitespace checks. Untracked generated dist trees untouched. Only reviewer-owned records/evidence changed.
- Next: fresh primary configured implementation handoff, then informational Solution Designer notification after primary success. Preserve full cumulative evidence/current failed outcomes. Implement SR020 delta, applicable source review, then fresh API-F002 public create/reconnect **without manual engine preinstallation first**, followed by full approved matrix.
- Remaining risks/gates: backport maintenance/corresponding source/notices/immutable candidate identities, clean native+Docker package parity/both architectures, mask/staging failures and installer bound; broader runtime/preview/peer/physical/user-verification/release work. Separate peer-NAT environment limit and FUP001 PM custody remain. No duplicate forwarding, task closure, source/API score, published command or live-operation authority.

### ARCH-REV-005 — Pass On SR021 Selected Docker Failed-Start Completion

- Canonical report: `/Users/normy/autobyteus_org/autobyteus-worktrees/shared-network-workspaces/tickets/in-progress/shared-network-workspaces/design-review-report.md`.
- Round/date/trigger: 5, 2026-10-14; Solution Designer returns Ready SR021 for **CRR008 / CR-005 P1 / API-F003**. Same Task `project_task_0793009f-41bc-4684-9cbe-9a29ad26ed63`, cumulative **Large/High** retained.
- Reviewed package: `cd1519a798`, `codex/shared-network-workspaces`, finalization `origin/personal`; ApprovedSR018 requirements/approvals018/017 unchanged. Current implementation IR002–006 remains, not reset to an initial feature request.
- Triggering artifacts: cumulative solution handoff/design/investigation/history; CRR008 report/history and641-reference incoming chain; API003 Fail report/investigation/ledger/history and raw lifecycle/reboot/inspect/diagnostic evidence; SR021 source-contract/lifecycle investigation. Complete667-reference solution package indexed in `evidence/design-recovery/sr021/package-index.json`.
- Prior authoritative architecture decision: **ARCH-REV-004 Pass on SR020**. Subsequent CRR008 Design Impact establishes the earlier lifecycle review gap: first-use ordering and Docker restart policy did not prove completion of a failed pre-process NFS start. That prior Pass is not boot qualification or automatic approval of SR021.
- Current authoritative architecture decision: **Pass — ARCH-REV-005 / Ready SR021 / Approved SR018**. No new blocking finding/requirement gap. Current **API003 Fail57.14%/broader Required and CRR008 Fail** remain their owners' authoritative outcomes.
- Review delta: independently confirmed the normal OS reboot trigger, current CLI/job/lock/supervisor/Reconnect stopping at host readiness, selected client volume failure before process creation and same observed ID/config diagnostic repair. Traced existing status/discovery/snapshot/probe/recreation/Store/launcher Stop and versioned Moby start/stop/state/Reset contracts. No fresh runtime experiment was needed to accept the bounded technical selection; implemented/public controls remain unproven.
- Structural decision: existing setup owner sequences host proof then Docker current selected failure completion. Exact current daemon/container/owned-volume/policy/error -> fresh daemon-side current-image UUID/access probe -> reinspection -> atomic consumed-incarnation record -> one immutable-ID Start -> real API/shared-binding verification. No recreation/pull/config/policy change, stale receipt-derived running intent, arbitrary-error retry, global daemon ordering, extra job, app-entrypoint wait or active-process restart takeover. Shared read-only volume validator and cohesive file ownership are explicit.
- Stop/intent decision: normal Stop after a successful running state has no qualifying startup error and remains untouched; current policy=no vetoes both background and explicit reconnect. Docker Stop of an already-failed non-running node, including launcher forwarding, creates no new observable intent. Disclose that inherited limitation, not a fabricated inspect flag/private veto. `always` retains Docker's own boot semantics. Serial control validation is mandatory; no race-free contradictory external-command transaction is claimed.
- State decision: new current per-selected-node attempted-incarnation record, at most32, private0600 under existing0700 root; no desiredRunning/READY/config/auth, no history/expiry. Preserve across service restart, write before Start, remove exact entries after safe attachment removal. Existing records remain directly usable; no migration/global app gate. Explicit confirmed reconnect can authorize one further eligible attempt but cannot override current policy.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revisions | Verification Evidence |
| --- | --- | --- | --- | --- |
| CR-005 / API-F003 | CRR008 P1 Design Impact; two ordinary boots strand selected client | **Design recovery accepted; implementation/source/API closure pending** | SR021, CRR008, API003 | Actual host-only Reconnect trace; raw exited/error/policy/identity and same-object API repair; current target DS006/DS006-L eligibility, attempt, result, Stop/policy and validation contracts |
| CR-003 / API-F002 | ARCH004 accepted design; public correction unproved then | **Independently resolved at API003 fresh native-Ubuntu no-preinstall create/reconnect scope** | SR020, IR005/006, CRR007/008, API003 | Current API and failure-origin reports/raw indexed receipts; create16.778s, reconnect0.508s/0.605s; not broader mode/release qualification |
| CR001 / CR002 / API-F001 / CR004 | Resolved at recorded modes/native-Mac cold-create/release-source gate scopes | **Retain recorded resolution only** | IR/CRR/API chain | Current source unchanged by SR021; no new all-platform claim |
| D-001 | Deferred by ApprovedSR018 DEC015, not repaired | **Still deferred/non-blocking** | SR018–021 | No bounded/unrelated-local outage promise or per-action worker restored |
| IMP-D001 | Source/profile correction accepted and subsequently implemented | **Policy preserved** | SR019 onward | Current-source links, independent confirmed Update/Remove, AGY/local behavior; no pin/copy/refcount |

- Independent audit: `architecture-review-evidence/arch-rev-005/review-audit.py` and `review-checks.json`;667 unique existing references,650 protected current paths unchanged (excluding the two reviewer-owned current artifacts),11 ignored retained candidate files unchanged, approvals/requirements byte-identical to5251ab48bc. Recomputed production aggregate `4568593b99bb3dff263e9824ceb7176e04a95ec90e3cd14a9f7421b4e43055ac`. SR021 commit ticket-only; five preexisting dist trees untouched.
- Raw-receipt checks: distinct ordinary boot IDs;15 second-boot observations all selected-stopped/API-failing, later host ready; same Id/Image/Config/HostConfig across diagnostic/reconnect/reboot snapshots; source/mount same bytes/UUID. Diagnostic command used the node name; snapshots prove the same object, not an executed immutable-ID implementation. Source-derived normal-stop/policy controls are not counted as runtime passes.
- Material-premise gate **Pass**: MP006 normal reboot has a full independent production witness. MP007 ordinary Stop and MP008 already-failed no-op Stop have separate public control paths; they do not establish a concurrent contradictory workflow or a new run-intent system. MP001–005 retain their historical reachability/scoped dispositions, with MP005 now resolved at API003 native-Ubuntu scope.
- New/remaining blocking architecture findings **None**. No changed intended behavior, new questionnaire, classification downgrade, synthetic score or upstream/specialist edit.
- Validation performed: read-only source/primary-doc/raw-receipt/integrity audit; canonical28-section/template/Markdown/UTF-8/whitespace checks. No reviewer build/product suite/VM/runtime/provider/mount/user-resource or release operation. No new live resources requiring cleanup.
- Next: fresh configured primary implementation handoff, then informational Solution Designer notice after confirmed delivery; no delegation/spawning or duplicate work. Implement bounded SR021, source review, then **API-F003 fresh public selected setup/two ordinary host reboots first without manual Start/reconnect**, with same identity/private/source/UUID/API and normal-stop/disabled-policy/unselected controls. Retain whole remaining current-product/both-OS/physical/user/release gates and successful API test-code review.
- Residual risk: diagnostic grammar qualification, honest no-op Stop/policy guidance, ambiguous attempt requiring confirmed reconnect, full mode/physical/native-agent/linked-asset/preview proof. Retain exact engine pair; rebuild actual CLI metadata, no engine rebuild required. Nativeamd64/hosted workflow/signing/published bootstrap remain unqualified; Guide unavailable/empty qualifiedTargets are truthful. FUP001 PM custody and peer-NAT environment limit unchanged. No merge/push/release/TaskDone/user-verification or live-resource authority.
