# Code Review Revision Record

The canonical [code-review-report.md](code-review-report.md) is authoritative for the latest implementation/failure-origin result. CRR001 is the initial baseline, not an inferred previous pass; later entries append actual completed results. Proportional API/E2E test review has not occurred.

## Revision Index

| Revision ID | Canonical report | Entry point / trigger | Prior result | Current result | Finding IDs |
| --- | --- | --- | --- | --- | --- |
| CRR-001 | code-review-report.md | Initial Implementation Review after IR002 Large/High completion | N/A | **Fail — Local Fix** | **CR-001 open**; FUP001 outside scope |
| CRR-002 | code-review-report.md | IR003 Local Fix Complete / CR001 source re-review | CRR001 Fail — Local Fix | **Pass** | **CR-001 resolved**; FUP001 retained |
| CRR-003 | code-review-report.md | API-REV001 Fail / API-F001 focused failure-origin review | CRR002 source Pass; API001 Fail | **Fail — Local Fix (implementation-owned)** | **CR-002 open**; CR001 resolved; FUP001 retained |

## Revision Entries

### CRR-001 — first-use installer umask blocks nonroot executable traversal

- Date2026-10-13; canonical report updated: `code-review-report.md`.
- Entry point / round: **Implementation Review / 1**. Scope: **Full Review**.
- Trigger: `/software_engineering_team/implementation_engineer`, [implementation-handoff.md](implementation-handoff.md), IR002 Implementation Complete. Large/High retained.
- Source HEAD `f0456d1f92`; source commits `c57ab71c90930a0c98e1310d07b0808d28dfbd14`, `6717bcb221`, `f34fc81aa2`; reviewed upstream `65b0e6e57a0f93d8343ccbefc1b5227642d7e557`.
- Solution revisions: **Approved SR018 / Ready SR019**, retained SR017 matrix/trust/physical sequencing; source lease correction IR001/IMP-D001 understood.
- Architecture revision: **ARCH-REV-003 Pass** (D-001 deferred, not fixed).
- Implementation revisions: **IR-002**, cumulative IR-001 preserved.
- API/E2E revision: **N/A — not yet performed**. Delivery revision: **N/A — not yet performed**.
- Prior authoritative result: **N/A**. Current authoritative result: **Fail — Local Fix**, CR001/P1.
- Basis/result: approved normal fresh first installation SCN001/011/013 reaches installer077 -> default elevation -> RootDirectory0755 masked to0700 -> nonroot fixed-binary exec cannot traverse. Independent unprivileged diagnostic proves inherited mask/mkdir effect, not real privileged installation. Current source establishes root parents/credential drop; no contrived concurrency or outage premise.
- Scenario/material-premise changes: no intended behavior changed. BEH001 contradicted by CR001; MP001/002 deferred outage and MP003/004 independent source deletion confirmed. No source-pin/retirement/stream-worker mechanism required.

#### Prior Finding Resolution

**None.** IR001/IMP-D001 is upstream implementation/design history, not a previous code-review pass/finding. Its corrected source-ownership model is confirmed without claiming full native runtime validation.

- New/remaining finding: **CR-001 open**, bounded mode correction plus restrictive-mask install/nonroot traversal/public-parent regression. No source/test fix performed by reviewer.
- Score/classification: **9.3/10,93/100**; readiness7 and correctness6 due only to CAND001/CR001. Other categories have no promoted deficiency. Overall does not override Fail. **Local Fix**, not Design Impact/Requirement Gap.
- Evidence: [review checks and limits](code-review-evidence/crr-001/checks-and-limits.md), [permission trace](code-review-evidence/crr-001/installer-permission-trace.md), [diagnostic receipt](code-review-evidence/crr-001/installer-umask-result.json), [source audit](code-review-evidence/crr-001/source-audit.json), [source-size table](code-review-evidence/crr-001/source-size-audit.md), [focused checks receipt](code-review-evidence/crr-001/focused-checks-result.json).139 hash-matched paths/99 source files; no size violation. Reviewer personally ran6 packaging/installer tests and4files/26 server units, all pass; defect outside their fake executable boundary.
- Follow-up: **FUP001**, unchanged updater stack-path category failure. Current Nuxt/Electron failures preserved; candidate patch absent, candidate-only passes not substituted. Sent separately to requirements' `/project_task_manager`; accepted/DELIVERED to `project_task_manager_a5f6d9d306e54970bafdad895bdf731d` on2026-10-13. No scoring penalty/task delegation.
- Fresh rule selected: implementation-owned Local Fix or packaging defect before executable coverage -> exact `/software_engineering_team/implementation_engineer`. Fix -> source re-review -> API/E2E; no forward API handoff on this result.
- Remaining risks: native tools/assets/peer/restore and healthy current-product preview/mode tests, exact Docker preservation, authorized actual installer, physical topology, user verification and release remain downstream. DEC015 outage hardening remains deferred, not a required new gate.

- **PM tracking receipt (2026-10-13, informational only):** `/project_task_manager` found no duplicate Task and retained FUP001 at `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/task-plans/context/fup001-updater-stack-path-classification-candidate.md`, awaiting user approval to create a separate Task. Seven public artifacts are in originating Project context for durable custody. No Task, worker, dispatch, scope expansion, review waiver or duplicate technical handoff. CRR001 Fail/CR001 and its existing implementation route remain unchanged. No new review round/result; this appends only follow-up custody information.


### CRR-002 — exact new-directory modes resolve first-install permission defect

- Date2026-10-13; canonical [code-review-report.md](code-review-report.md) updated to latest complete result.
- Entry point / round: **Implementation Review / 2**. Scope: **Targeted Delta Review**.
- Trigger: `/software_engineering_team/implementation_engineer`, IR003 Local Fix Complete in [implementation-handoff.md](implementation-handoff.md), prior **CRR001/CR001 P1**.
- Reviewed HEAD `ac9887e215`, production fix `dfeac830f468994255fdafc31f66cdbeee1852cc`; previous review basis `caa318d795d73a85e8d3eb374d21ef532a8513f3` (CRR001 + PM receipt).
- Relevant solution revisions: **Approved SR018 / Ready SR019**, prior SR017 reference matrix retained. Architecture: **ARCH-REV-003**. Implementation: **IR-003**, IR001/002 history retained. API-REV: **N/A — not yet performed**. DR: **N/A — not yet performed**.
- Prior authoritative result: **CRR-001 Fail — Local Fix**. Current result: **Pass**.
- Scope rationale: one production file, two directly associated tests; exported API, shape, ownership and DS001–005 unchanged. Independently confirmed137 other IR002 paths unchanged, authorities unchanged before report update. Targeted review rechecks directory-helper consumers/tests and affected structural/score rows; other full-review evidence carried forward.
- What changed: successful newly created directories receive exact requested chmod after recursive parent trust/creation. Existing entries never chmodded, failed mkdir never reaches chmod, private0700 and bootstrap077 preserved. The only public entry fixes TrustedPath; fixture trust injection is private. No public bypass/migration/source permissions or new scenario.
- Supported scenario/material premise: unchanged SCN001/011/013 normal approved first install plus source/private preservation; BEH001 contradiction resolved. BEH005 trust/preservation revalidated. MP001–004/DEC015 unchanged; no source retention/outage machinery.

#### Prior Finding Resolution

| Finding | Prior status | Current status | Revisions | Verification evidence |
| --- | --- | --- | --- | --- |
| CR-001 | Open P1 / Local Fix, CRR001 | **Resolved** | IR003 / CRR002; Approved018 / Ready019 / ARCH003 | `platform/commands.go:75–91` only chmods newly created directories; production entry binds TrustedPath; all caller modes unchanged. New Go + extended Python bootstrap fixture assert077, every new parent0755, private0700/0600, descriptors0644; IR003 nested positive and three mutation controls support regression. Reviewer source/hash/call-site inspection and Python6pass/1skip. Actual root-owned different-UID install not executed/claimed. |

- New/remaining in-scope findings: **None**. FUP001 remains separate, PM receipt preserved without repeat notification/task/dispatch.
- Score changes: readiness7→10 and correctness6→10 restore only CR001 deductions. Eight other categories remain10 based on carried unchanged review evidence; **10.0/10,100/100** source-review summary, not all-green/executable qualification. Failure classification **N/A** on Pass.
- Evidence: [CRR002 checks and limits](code-review-evidence/crr-002/checks-and-limits.md), [independent delta audit](code-review-evidence/crr-002/delta-audit.json), [reviewer check result](code-review-evidence/crr-002/checks-result.json), [IR003 checks](implementation-evidence/ir-003/checks-and-limits.md), [IR003 final execution](implementation-evidence/ir-003/final-checks.json). commands.go78→86 nonempty; unchanged98 source-size rows carried. Tests exempt from thresholds.
- Personally executed only current Python packaging/installer scope:7 enumerated,6pass/1Go-child-only skip. Reviewed Go race/vet/bootstrap/negative controls/builds from IR003; no reviewer Go rerun or toolchain installation. No delegation, source/test fix, OS resource, Docker, providers, merge/push/release or user verification.
- Fresh handoff rule: implementation review passes and cumulative package ready for executable coverage -> exact `/software_engineering_team/api_e2e_engineer`. Complete cumulative chain goes to this single outcome recipient under the active communication rule; no extra same-outcome notification, Delivery or implementation work handoff.
- Remaining gates: actual authorized privileged install, selected modes/Docker, current native tools/assets/peer/restore/healthy mounted previews, independent physical topology, docs/finalization/user verification and permitted release. D001/DEC015 outage hardening stays deferred. Nuxt/Electron baseline updater3fail each remain visible; candidate-only passes not current-source proof.


### CRR-003 — ordinary fresh native-Mac activation/mount fails before managed sharing

- Date2026-10-13; canonical `code-review-report.md` updated to latest complete **Fail / Local Fix (implementation-owned)**. Entry point **API/E2E Failure-Origin Review / round3**; scope **N/A — focused origin**, no full source audit/ten-category scorecard or successful-test review.
- Trigger: `/software_engineering_team/api_e2e_engineer`, **API-REV-001 Fail**, API-F001; reported confidence57.14% and broader validation Required remain unchanged. Prior source result **CRR002 Pass** is historical, not an API Pass or waiver.
- Reviewed HEAD1009ce87e5df00b90480b689d9309331152ef3ba; source/API input3b7dd9a2895f4b8fedc5e1bcdd00c913d97fae2f. Only non-ticket delta is API-owned REST fixture/coverage correctionaf9f23df93. Focused nine NFS source and12 authorities independently equal source-review input.
- Relevant revisions: **Approved SR018 / Ready SR019 / ARCH-REV003 / IR003**, cumulative prior history preserved; **API-REV001**; DR **N/A — not performed**. **Large/High Reviewed** retained.
- Supported basis: SCN001/011/013, BEH001, AC012/018/019 ordinary fresh native-Mac create with original APFS project and normal administrator consent. Source qualification -> Apple enable/restart -> immediate one-shot self-mount -> failure before nonroot mounted probe/job install. No injected outage/forced concurrency. New CAND006 promoted in ticket; no new intended behavior.

#### Prior Finding Resolution

| Finding | Prior status | Current status | Verification |
| --- | --- | --- | --- |
| CR-001 | Resolved by IR003/CRR002 | **Remains resolved** | commands.go unchanged; API V01 actual root0755/public0644/nonroot installation and mounted-byte/launchd proof; API-F001 occurs later inside mount_nfs |
| FUP001 | Outside scope, PM custody | **Unchanged follow-up** | API retains original current-source Nuxt/Electron failures and candidate-only distinction; no duplicate notification, patch, score penalty, Task or worker |

- New finding: **CR-002 P1 open**, linked **API-F001**. V01 fresh first create passed20.486s; V02 failed10.819s, single-VM repro failed11.035s with mount_nfs74/EPROGUNAVAIL diagnostic. Postfailure RPC registration plus unchanged public reconnect rc0/9.615s/sameUUID is recovery evidence only.
- Origin: implementation-owned fresh activation-to-mount orchestration defect. Published Apple source corroborates command completion is not serving-readiness proof; exact guest RPC/kernel timing remains uninstrumented, not claimed. Error text does not establish ignored locallocks, allowlist causation or a new statd/NLM prerequisite. Requirement clear; no demonstrated structural Design Impact. Proportionate correction stays in existing backend/setup owners and preserves true-error behavior/resources.
- Prior review gap: source-visible assumption that completed Apple activation followed by one unforgiving mount adequately implements ordinary engine-before-host-mount/one-command setup should have been challenged. Actual OS manifestation required runtime. Only affected correctness/readiness rationale superseded; no new aggregate score/full scorecard at this entry point. Historical CRR002100/100 is not current runtime qualification.
- Evidence: [CRR003 checks](code-review-evidence/crr-003/checks-and-limits.md), [focused hashes](code-review-evidence/crr-003/focused-audit.json), [derived execution summary](code-review-evidence/crr-003/execution-summary.json), [pinned primary contracts](code-review-evidence/crr-003/source-contracts.json); original API001 report/investigation/ledger/revision and mac-vm/mac-matrix/mac-repro JSON/harness files remain authoritative raw execution evidence.
- Reviewer personally performed source/authority comparisons, forward trace, raw evidence/harness review and primary-source research; no VM/repository rerun, source/test edit, privileged host action, provider call, delegation or release. API cleanup receipts retained; no new reviewer resource to retire.
- Required progression: implementation-owned correction and durable startup-boundary regression -> source re-review -> API failing fresh public create first, then remaining approved current-product/mode/physical matrix. No manual reconnect workaround counted as first-use success. No per-action outage machinery, fixed-sleep prescription or source-retention redesign.
- Routing: fresh returned **“When API/E2E failure-origin review confirms that the owning problem is an implementation defect.”** selects only `/software_engineering_team/implementation_engineer`; rule/receipt recorded in CRR003 routing evidence. Main Task open; no API/Delivery Pass. DEC015/D001 deferred/not fixed; IMP-D001/MP003004/source Update/Remove/AGY policy unchanged. Unqualified release/Guide unavailable deliberate. Remaining Linux/Docker/peer/native-runtime/mounted-UI/physical/user-verification/release gates retained.
