# Code Review Report

## Latest Result / Review Meta

**CRR-003 — Fail / Local Fix (implementation-owned), CR-002 P1 open; API-F001 origin review.**

- Date: 2026-10-13. Entry point: **API/E2E Failure-Origin Review**, round3. Review scope: **N/A — focused failure-origin**, not a full source audit or successful-test review.
- Task: `shared-network-workspaces` / `project_task_0793009f-41bc-4684-9cbe-9a29ad26ed63`; **Large / High, Reviewed route retained**. Worktree branch `codex/shared-network-workspaces`, finalization `origin/personal`.
- Trigger: API owner’s **API-REV-001 Fail**, API-F001, confidence57.14%, broader validation Required. [Coverage investigation](api-e2e-coverage-investigation.md), [execution report](api-e2e-execution-coverage-report.md), [API revision record](api-e2e-revision-record.md), [case ledger](api-e2e-test-case-ledger.md).
- Reviewed HEAD `1009ce87e5df00b90480b689d9309331152ef3ba`; API input/source-review commit `3b7dd9a2895f4b8fedc5e1bcdd00c913d97fae2f`. Only non-ticket delta since that input is the API-owned workspace REST test correction `af9f23df93a63ca6c8305f51439a855acc2133c7`; no NFS production change.
- Prior result: **CRR-002 source Pass**, following IR003 correction of CR001. This latest focused Fail now governs further work; CRR002 remains the historical source-review result, never an API Pass. [Cumulative code-review record](code-review-revision-record.md) retains CRR001/002 and their scorecards’ disposition.
- Authorities reviewed as context: [Approved SR018 requirements](requirements-doc.md), [approval018](approval-record-sr018.md), [approval017](approval-record-sr017.md), [scope feedback](architecture-review-scope-feedback.md), [Ready SR019 design](design-spec.md), [investigation](investigation-notes.md), [solution history](solution-revision-record.md), [complete solution handoff](solution-design-handoff.md), [design review](design-review-report.md), [architecture history](architecture-review-revision-record.md) **ARCH-REV-003 Pass**; [implementation handoff](implementation-handoff.md)/[IR history](implementation-revision-record.md) **IR003**, IR001/002 retained. Independent focused hashes confirm these authorities and relevant NFS source unchanged.
- Relevant supplements remain indexed in the [complete cumulative API package](evidence/api-e2e/api-rev-001/package-index.json): original feasibility/selection/native/private-runtime/roundtrip reports and SR018/019 audits, IMP-D001 correction, IR002/003 and CRR001/002 evidence. They retain their original limits; this review does not reclassify them as current-product proof.
- Delivery revision: **N/A — not yet performed**. Proportional successful API/E2E test-code review: **not entered**; no test-review Pass issued.

## Scope And Approved Behavior Basis

Only API-F001’s fresh native-Mac create path, raw VM commands/results and its setup/OS boundary were investigated. Root DESIGN.md/TESTING.md and reviewer Example9 apply; no additional NFS/package AGENTS instructions found. Reviewer made no source/test fix and did not rerun the VM or repository matrix.

| Basis | Status and current forward path |
| --- | --- |
| BEH001; REQ006/013/018/019; AC012/018/019 | **Contradicted at first-create activation/mount boundary.** CLI create -> consent/elevation/root installation -> source qualification/persist intended configuration -> Apple activation -> host mount -> nonroot verification -> managed job -> ready. Two normal fresh executions stop at host mount. Intended behavior remains unambiguous |
| BEH005; REQ009/010/014/017 | Preservation and truthful incomplete state remain evidenced: original source retained, intended UUID saved, no false ready/local substitute. Successful public reconnect reuses UUID; that is recovery evidence, not first-command success |
| CR001’s directory-mode contract | **Remains resolved.** Unchanged IR003 code and actual V01 root0755/public0644/nonroot execution support the earlier fix; failures are later, inside mount_nfs |

No new behavior ID or approval is needed. Native Mac hosting and local advisory locking remain selected design policy. The one-command success obligation and the design’s engine-before-host-mount ordering independently establish the scenario; a failing test does not create it.

## Supported Scenario And Candidate Gate

| Scenario / actor / independent trigger | Supported entry, lifecycle, consequence | Validity / evidence / review use |
| --- | --- | --- |
| SCN001/011/013; storage owner wants to share an existing local project from a fresh supported Mac | Public `create`, choose original APFS source and trusted addresses, approve OS work. Newly activated native engine must support the same invocation’s own mount and verification before managed sharing is returned | **Supported Normal Scenario / Use.** Approved requirements scenario and AC rows; design first-use/configuration sections; actual CLI path. No competing action, injected outage or forced interleaving |
| REQ014 retry after partial setup | Public reconnect resumes saved intent and preserves source/UUID | Supported Explicit Edge / use as recovery evidence only; does not waive normal first use |

| Candidate | Independent path / consequence / evidence | Disposition and proportional scope |
| --- | --- | --- |
| CAND006 -> CR002/API-F001: first native activation hands off to a one-shot mount without settling ordinary service startup | Above approved normal scenario. Apple start/restart command completion -> immediate EnsureMount; a mount error exits Apply before nonroot mount verification/job install. V02 and single-VM repro fail, later unchanged public resume succeeds | **Promote — This ticket.** Implementation-owned activation-to-mount orchestration fails its normal first-use contract. Correct within existing backend/setup ownership; prove fresh one-invocation success without weakening readiness/preservation |
| Error wording proves local locks were ignored or statd must become a mandatory new dependency | No failure-time RPC trace or effective-option capture establishes either; source passes locallocks and Apple diagnostic is not lock-mode-specific | **Reject that attribution/prescription.** Do not change the approved locking contract based on this text |
| V02 peer subnet arrangement or allowlist length proves the cause | Peer communication never began; single VM repeats self-mount failure. No controlled allowlist-causality comparison | **Reject as established cause.** Future peer harness still needs a shared owned network; not a reason to discard this failure |
| DEC015 outage isolation or source-generation retention must now be added | Neither initiates this healthy cold-create failure; both retain their explicit upstream disposition | **Reject as required machinery.** No per-action workers, stream leases, local fallback, source pin/copy/refcount or retirement queue |

## CR-002 — P1: normal fresh native-Mac create exits before its own mount becomes usable

**Location:** `autobyteus-nfs/internal/backend/apple_apply.go:60–68`, composed with `internal/setup/apply.go:87–124` and `internal/platform/mounts.go:95–103`.

**Expected:** one approved fresh create invocation configures the native engine, verifies this host’s mounted original source and installs the managed service, then returns the usable path/hostReady. **Observed:** two clean native-Mac executions exit1 with mount_nfs exit74 before mounted verification and job installation. This is not a false-ready/data-loss finding; preservation/error reporting behaved correctly.

Exact single-VM reproduction (real admin user, real sudo/root install, inherited077; development-unqualified current binary, not a published bootstrap):

```sh
umask 077; exec /Users/admin/ab-nfs-api001-repro-c179ed61-binary create --source /Users/admin/ab-nfs-api001-repro-c179ed61-source --endpoint 192.168.128.2 --allow 192.168.128.2,192.168.128.1 --nodes none --yes --json
```

Retained error: `can't mount with remote locks when server (192.168.128.2) is not running rpc.statd: RPC prog. not avail`.

| Execution | Actual evidence and limit |
| --- | --- |
| V01 fresh self-only create | **Pass**, rc0/20.486s; root binary/public traversal, nonroot mounted bytes equal original SHA, launchd running. Preserve this success; not universal cold-start proof |
| V02 fresh source host | **Fail**, rc1/10.819s, before any peer/Docker action |
| V02-repro fresh single VM | **Fail**, rc1/11.035s, same self-mount error. No outage/loss injection |
| Postfailure diagnostics and public reconnect | RPC services registered later and nfsd running; not failure-time readiness. Public reconnect rc0/9.615s, hostReady, same UUID `2f6bed56-1950-43d4-822d-d3727cf20940`, no manual OS/config correction. Pending reconnect replays Apply, including Apple activation; it is not an isolated timing experiment or postretry byte/reboot proof |

Raw [V01](evidence/api-e2e/api-rev-001/mac-vm-result.json), [V02](evidence/api-e2e/api-rev-001/mac-matrix-result.json), [single-VM repro](evidence/api-e2e/api-rev-001/mac-repro-result.json), their executed `run-mac-*.py`, and [reviewer-derived command summary](code-review-evidence/crr-003/execution-summary.json) retain exact invocations/stdout/stderr. All use native binary SHA256 `ddf7f65c02d8326f8fbf83c332aa4863d63b5c7ce859fa584c5ae3ed919de68f`, macOS26.6.2/25G83 arm64 APFS, admin501:20, no host shares/credentials. The public baseline image and cleanup are recorded in those receipts.

### Failure origin, evidence versus inference

- **Confirmed product boundary defect:** first-use native activation/mount orchestration does not reliably complete the approved ordinary fresh setup. Source waits for `nfsd enable`/`restart` command exit, then attempts mount once and propagates its failure; no orchestration bridges that normal activation interval. Intended source was accessible/qualified before this call and remains preserved afterwards.
- **Corroborating OS contract:** Apple’s published nfsd implementation delegates activation to launchctl and returns its exit status; PID presence/command completion is not proof that the selected export is serving requests. [Apple nfsd source](https://github.com/apple-oss-distributions/NFS/blob/93733ffccece4daee73bf6306b291d1ae69130c0/nfsd/main.c#L415-L427).
- **Diagnostic constraint:** Apple’s mount helper can print the statd/remote-lock message after EPROGUNAVAIL without checking the selected lock mode. Thus that message does not establish broken locallocks or a required NLM feature. [Apple mount helper source](https://github.com/apple-oss-distributions/NFS/blob/93733ffccece4daee73bf6306b291d1ae69130c0/mount_nfs/mount_nfs.c#L693-L705).
- **Inference, not separately proven kernel root cause:** transient cold service/RPC/export readiness explains the failure plus later unchanged recovery and is consistent with the source handoff. The exact RPC program, daemon scheduling and guest-kernel cause were not captured at failure. Published Apple source is corroboration, not claimed guest-binary identity. Local Fix ownership does not depend on pretending that narrower cause is known. Implementation should refine that diagnosis while correcting/proving the existing setup boundary; no fixed sleep, blanket retry or statd prerequisite is prescribed.
- **Not an implementation change after review:** focused hashes and API source audit show the relevant production path unchanged from CRR002. Not a stale test/fixture-only failure: the public current CLI genuinely returned the retained OS error in fresh normal preconditions. V02’s future peer-network arrangement and diagnostic `/usr/sbin/nfsstat` typo do not cause this earlier self-mount failure. Future diagnostics should use `/usr/bin/nfsstat`.
- **Review gap:** prior source review should have challenged the implicit sufficiency of activation-command exit followed immediately by one mount under the approved engine-before-host-mount/one-invocation contract. The actual OS timing and failure manifestation required runtime evidence, but the unbridged lifecycle boundary was source-visible. This supersedes only the affected CRR002 runtime-correctness/API-readiness rationale; no repeated ten-category scorecard or new aggregate score in this failure-only round.

### Required correction and revalidation

**Local Fix — implementation owner.** Complete normal native startup through the existing backend/setup boundary, preserving original source/UUID, exact owned resources, one outstanding administrative attempt, local-lock policy, permission fix and truthful unresolved failure. No requirements/design rewrite is indicated by current evidence. If investigation actually requires changing approved behavior or ownership, route that new impact to Solution Designer instead of expanding locally.

Add a durable regression at the activation-to-mount boundary that distinguishes not-yet-usable normal startup from genuinely invalid setup; command-return-only mocks/warm reconnect are insufficient proof of first create. Then personally validate fresh current native-Mac create under077 through the public entry, original/mounted bytes and managed job, without a manual reconnect workaround. Retain true-error/preservation/retry evidence. Implementation fix -> **source re-review -> API/E2E failing cold case first -> remaining approved matrix**. No reviewer production/test patch or delegation.

## Prior Findings, Limits And Remaining Gates

- **CR001 resolved**, not reopened. FUP001 remains the separately owned baseline updater issue with PM custody; no duplicate notification, patch, score penalty or invented Task/worker. Current-source Nuxt4258pass/3fail/5skip and Electron188pass/3fail/1skip remain non-green; removed-candidate green logs are not substituted.
- API repository passes, corrected coverage-owned REST fixture and scripted AGY/Guide/terminal evidence remain at their reported scope. Successful-test-code review of the changed REST test awaits a successful API package; unrelated to API-F001 origin.
- Current result neither erases V01 success nor converts VM evidence into independent physical proof. Remaining Mac/Linux native and managed Docker clients, Linux native/Docker storage, peer/normal operations/restart/detach, preservation, current mounted desktop healthy previews, real native tools/support assets/peer close/restore/Standalone-Team-Org policies, physical Mac/Linux, user verification and delivery/release gates remain open. Only Mac-Docker **storage hosting** is deferred.
- D001/DEC015 remains deferred/not fixed. MP003/004/IMP-D001 source Update/Remove and AGY policies unchanged; no source-retention machinery. Default unqualified release/Guide unavailable intentional, not a shipped installer claim.
- Reviewer checks: focused source/authority hashes, raw scenario/harness/control-path review, pinned primary-source research and artifact consistency only. No new runtime test execution, privileged OS action, user data, paid provider call, deployment, merge/push or release. [Checks and limits](code-review-evidence/crr-003/checks-and-limits.md).

## Classification And Routing

**Fail / Local Fix / implementation defect**, confirmed existing setup-boundary owner; earlier source-review gap noted above. **Large / High remains.** No requirement ambiguity or demonstrated structural Design Impact. Prior source Pass is not forward authorization while CR002 is open. Fresh returned rule **“When API/E2E failure-origin review confirms that the owning problem is an implementation defect.”** selects only `/software_engineering_team/implementation_engineer`; full cumulative failure package and this report/revision record accompany it. No additional same-outcome notification. [Routing record](code-review-evidence/crr-003/routing.json). Main project Task stays open.
