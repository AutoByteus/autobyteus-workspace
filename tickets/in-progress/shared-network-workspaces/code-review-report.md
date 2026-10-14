# Code Review Report

## Latest Authoritative Result / Review Meta

**CRR-005 — Fail / Design Impact. CR-003 P1 open (API-F002): the selected Linux NFS reference has a demonstrated directory-access compatibility failure.** This is **API/E2E Failure-Origin Review**, round5, scope **N/A — focused origin**. No full source audit/ten-category scorecard or successful-test review is issued. **API-REV002 remains Fail / confidence57.14% / broader validation Required.**

- Date2026-10-14. Task `shared-network-workspaces` / `project_task_0793009f-41bc-4684-9cbe-9a29ad26ed63`; **Large / High / Reviewed** unchanged; main Task open.
- Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/shared-network-workspaces`, branch `codex/shared-network-workspaces`, finalization `origin/personal`. Reviewed HEAD`57480943efcf6a4bd060953b48bafde7da616319`; API input`82dd5d9d53e2e4f5e022ff3f6f0e196ebd3602d8`; IR004 source`174e480bd0cfaee29f22fd46b1922afbb274e56b` unchanged. Production aggregate`497efd6abb0c2cfa4c740a87f005c529cbf026a6fa218b3acd345826f4a923da` independently recomputed.
- Authority: [Approved SR018 requirements](requirements-doc.md), [approval018](approval-record-sr018.md), [approval017](approval-record-sr017.md), [scope feedback](architecture-review-scope-feedback.md); [Ready SR019 design](design-spec.md), [investigation](investigation-notes.md), [solution history](solution-revision-record.md), [solution handoff](solution-design-handoff.md), [design review](design-review-report.md), [ARCH-REV003 history](architecture-review-revision-record.md); [IR004 handoff](implementation-handoff.md) and [IR001–004 history](implementation-revision-record.md).
- Trigger: API owner’s [API002 execution report](api-e2e-execution-coverage-report.md), [investigation](api-e2e-coverage-investigation.md), [revision history](api-e2e-revision-record.md), [case ledger](api-e2e-test-case-ledger.md). Complete still-relevant chain indexed by [API002 package](evidence/api-e2e/api-rev-002/package-index.json), including all prior feasibility/selection/source-policy/IR/CRR/API evidence. [Review history](code-review-revision-record.md) preserves CRR001–004; CRR004 was source Pass, not API qualification. DR **N/A — not performed**.
- Root DESIGN.md/TESTING.md and reviewer scenario gate apply; no closer NFS instructions. No production/durable-test change after CRR004 or by this reviewer. Scope excludes general test-suite review, unrelated source, source-size re-audit and the remaining executable matrix.

## Prior Finding Resolution — Rechecked First

| Finding | Current disposition / evidence |
| --- | --- |
| CR-002 / API-F001, Apple cold-start boundary | **Resolved independently at tested native-Mac cold-create scope.** API002 V02-repro11.571s and separate V01 22.772s pass with actual guest root077/nonroot501:20, original/mounted identity/bytes/private modes and running job; no manual reconnect. [Resolution receipt](evidence/api-e2e/api-rev-002/prior-failure-resolution.json). Not peer/reboot/physical/released-installer qualification |
| CR-001, restrictive-mask new-directory modes | **Remains resolved.** Source unchanged; actual Mac installation/nonroot traversal passes. Linux failure is later, after installed binary, source probe, engine and mount |
| FUP001, baseline updater classification | **Unchanged out-of-scope follow-up, PM custody.** Current Nuxt/Electron failures retained; removed candidate green logs not current-source proof. No repeat notification, Task, patch or score penalty |

## Supported Scenario / Forward Production Path

**Independent basis:** an owner with an ordinary nonempty ext4 project wants one-command native Ubuntu sharing, consents to its own installation, and expects a usable mounted path plus managed service. REQ001/003/004/006/014/017/018/019, AC012/018/019, SCN001/011/013; BEH001/004/005. Approved scope includes native Linux and ordinary directory operations; design §“Supported reference matrix” selects Ubuntu24.04, Ganesha VFS4.3 lineage and NFSv4.1. No kernel ceiling is specified. These are qualification targets, not already-published combinations. The actual guest is Ubuntu24.04.5 with Ubuntu kernel7.0.0-38-generic, not an injected outage or a contradictory workflow.

**Forward path:** public `create` -> ordinary sudo/root installation and consented plan -> `setup/apply.go` pinned Ubuntu packages -> nonroot original-source marker/health and file-handle qualification -> `backend/ganesha_native.go`/`ganesha.go` selected engine/config -> `platform.EnsureMount` hard TCP NFSv4.1 self-mount -> exact nonroot `service.NonrootProbe` -> `config.ReadMarker` confined directory traversal -> EREMOTEIO -> truthful incomplete/pending, before attachment job/hostReady. Normal public reconnect repeats the mounted probe and also fails. No peer network is required to reach this state.

- **BEH001 contradicted** at Linux reference first-use completion; **BEH004 confirmed** truthful incomplete/no local substitute, not proof of successful retry; **BEH005 source preservation confirmed at observed scope**, broader preservation tests remain.
- Original ext4 probe succeeds and regular mounted `cat` reads work. This is **not all reads failing**, a missing package, wrong UUID, root-mode regression or a demonstrated application confinement bug.
- Mac peer `mount_nfs60` timeout is separately accompanied by default-NAT routeREJECT/ping failure. No healthy-peer product defect or API-F001 recurrence is established. That environment limitation stays with API validation; no bridge/host network change is authorized here.

## Candidate Finding And Mechanism Gate

| Candidate / independent basis | Lifecycle, consequence and evidence | Disposition |
| --- | --- | --- |
| CAND007: selected Linux backend/client reference cannot reliably perform required ordinary directory access | Supported normal first create above; two API public failures after real mount. Corrected product strace locates repeated directory open EREMOTEIO. Independent Python replay on same image/kernel/packages/config reproduces without Go; guest-only delegation control removes and restoration returns the failure | **Promote — CR-003, this ticket.** Blocks native Linux qualification/AC012/018/019; not an unrelated upstream follow-up |
| Blame `os.Root`, its no-follow flags, credentials or marker contents from error text alone | Source probe passes; Python with equivalent flags also fails remotely; same identity/config/data pass with the diagnostic client feature disabled | **Reject that defect attribution.** Keep confinement/identity verification; no unsafe path fallback or weakened success assertion |
| Exact historical API packets proved GET_DIR_DELEGATION/OP_ILLEGAL mismatch | Upstream V4.3 dispatch, Linux decoder and accepted upstream fix support this mechanism, but API has no wire capture and reviewer capture contains no packet data | **Hold exact wire attribution.** Strong explanatory inference, not observed packet proof; no required workaround based solely on it |
| Blind retry, global kernel-policy change, protocol downgrade or outage isolation now required | No approved mechanism follows from the diagnostic success. Normal healthy directory access is the demonstrated obligation, not outage/deadline behavior | **Reject as prescribed machinery.** Designer must establish a compatible reference; D001/DEC015 remains deferred |

## CR-003 — P1: Selected Linux Reference Needs Compatibility Recovery

**Finding / scope:** normal native Linux setup using the selected Ubuntu/Ganesha reference cannot complete because ordinary directory access on the mounted filesystem intermittently returns EREMOTEIO. This is inherent to the ticket, not a pre-existing unrelated bug to waive. The implementation installs the exact reviewed pins; no after-review source change caused it. Current design selects a4.3-family engine and Linux kernel client without a demonstrated compatible disposition for this observed reference.

**Confirmed origin:** runtime NFS server/client interoperability at directory-delegation handling, exposed by the readiness reader. It is reproducible outside Go. **Classification: Design Impact**, owned by Solution Designer for selected-reference/dependency compatibility recovery. This is not an instruction to patch `ReadMarker`, remove its check or silently tune every host. The requirement for one-command ordinary shared files is clear; the technical reference needs recovery. No need to invent a new behavior or outage contract.

### Primary public evidence

Two fresh real guest creates, exact packages `nfs-common1:2.6.4-3ubuntu5.1`, `nfs-ganesha4.3-8ubuntu1`, `nfs-ganesha-vfs4.3-8ubuntu1`, nonroot1000:109, active Ganesha and successful NFSv4.1 mount, exit1 at marker probe in17.258s/16.252s. First exact command:

```sh
umask 077
exec /home/admin/ab-nfs-api002-linux-25fc064c-binary create \
  --source /home/admin/ab-nfs-api002-linux-25fc064c-source \
  --backend ganesha-native --endpoint 192.168.64.4 --allow 192.168.64.4 \
  --nodes none --yes --json
```

Second fresh suffix5336c36d/self endpoint192.168.64.5. [First result](evidence/api-e2e/api-rev-002/linux-native-result.json), [second result](evidence/api-e2e/api-rev-002/linux-native-repro-result.json), [reconnect/read contrast](evidence/api-e2e/api-rev-002/linux-native-focused.json), [corrected strace](evidence/api-e2e/api-rev-002/linux-native-trace-corrected.json). Product error: `openat .autobyteus-nfs/storage.json: remote I/O error`; trace actually fails reopening **the directory**, not opening a regular JSON file as a directory. Source bytes/identity and mounted ordinary reads remain intact. Initial wrong-executable-path diagnostic remains explicitly invalid, not a create cause.

[Linux candidate provenance](evidence/api-e2e/api-rev-002/linux-candidate-build.json) uses documented build-only metadata with exact reference pins in an otherwise identical copy. Only copied `release.json` changed; qualifiedTargets empty. Candidate/installed SHA`9aae4944c680e3be1331f760f2c07794695a2dbea6327858ca87007b77111fd3`. No public qualification or release claim; this is a legitimate configured qualification candidate, not a fixture disabling production verification.

### Personally executed bounded diagnosis

[Diagnostic summary](code-review-evidence/crr-005/diagnostic-summary.json) and [full command receipt](code-review-evidence/crr-005/linux-dir-diagnostic.json): fresh owned Ubuntu image identical to API002, actual kernel7.0.0-38, same pinned packages, current Ganesha config template, hard TCP4.1 mount and exact1000:109/no supplementary groups. Manual diagnostic setup replays the observed open/stat/close/reopen sequence with Python, **not a new public CLI run or product fix**.

| Guest setting / same mounted source | Three Python trials |
| --- | --- |
| Original `directory_delegations=Y` | 2 EREMOTEIO (first/second directory opens),1 success |
| Diagnostic-only `N` | 3 successes |
| Restored original `Y` | Same2 EREMOTEIO,1 success |
| Original local ext4 control | 3 successes |

Thus Go is not necessary to trigger the defect, and not every open fails. No blanket retry is validated. Setting restored before disposal; no host kernel/network policy changed. First diagnostic attempt omitted the product's competing-default-unit mask and failed manual mount against an active distribution daemon; it is retained as a **reviewer harness failure**, not API-F002 evidence. Corrected second attempt masks that unit in its own new guest. [Attempts](code-review-evidence/crr-005/diagnostic-attempts.md).

**Limit:** passive packet capture produced only its header, zero packet records; capture stop rc5 after SIGINT is retained. The decoder's zero result is **not wire proof**. Upstream [V4.3 dispatch](https://github.com/nfs-ganesha/nfs-ganesha/blob/V4.3/src/Protocols/NFS/nfs4_Compound.c), [Linux v7 decoder](https://github.com/torvalds/linux/blob/v7.0/fs/nfs/nfs4xdr.c) and [accepted Ganesha correction](https://github.com/nfs-ganesha/nfs-ganesha/commit/98eb77c4fd94effa6882b214698a77752ec79f6e) support an inferred illegal-operation/expected-operation mismatch. [Primary contracts](code-review-evidence/crr-005/primary-contracts.md) distinguish that inference from executed evidence; no patched/new engine was installed or qualified.

### Proportionate Required Outcome / Review Accountability

Solution Designer should establish an evidence-backed compatible Linux engine/client/package reference and update affected authoritative design/investigation/history. Preserve one-command setup, ordinary files, nonroot squash/allowlists, confinement, source identity and existing supported roles. If resolution changes intended support/behavior, obtain renewed approval rather than silently excluding this reference. Do not treat the diagnostic sysctl toggle as an approved shipped policy. No specific replacement version, backport, kernel downgrade, retry framework or reader fallback is prescribed by this review.

The Go source correctly exposes an underlying error and refuses false readiness. This cross-stack behavior was **not reasonably inferable as a local Go source defect** from the reviewed calls alone; no new source-review mistake is asserted. Prior review deliberately left real Linux qualification to executable validation. What is now contradicted is the selected reference's compatibility premise. CRR004's100/100 remains historical source scoring, not current qualification; **no aggregate score/deduction is generated at this failure-only entry point**.

## Checks, Limits, Cleanup And Remaining Gates

[Focused audit](code-review-evidence/crr-005/focused-audit.json):29 relevant source/authority/history paths identical to API input before report update; all56 API002 manifest files match;276 unique referenced paths exist; no non-ticket source/test delta. [Checks and limits](code-review-evidence/crr-005/checks-and-limits.md) separates reviewed API execution from personal diagnostic. No repository suites rerun, source/durable-test fix, delegation, host-root/mount/network/Docker/user-data/provider action, merge/push/release or Task closure.

Both reviewer-owned clones/processes/private Ubuntu caches/scratch roots removed and rechecked absent; [cleanup](code-review-evidence/crr-005/cleanup.json), first-attempt cleanup and diagnostic-summary record exact ownership. Public prior Mac Tart cache and five generated SDK/BriefStudio dist directories retained untouched. No VM is left to inspect.

Current Nuxt/Electron remain non-green due FUP001 (three baseline updater failures each); candidate-only passes are not current source. IMP-D001 private links/source Update/Remove/AGY/local policies unchanged; D001/DEC015 outage hardening deferred/not fixed. Default unqualified release/Guide unavailable deliberate. Remaining both-OS native/managed-Docker clients, Linux native/Docker storage, healthy peers/normal operations/restart/detach/preservation, actual native tools/assets/peer-close/restore/Standalone-Team-Org, mounted desktop previews, independent physicalMac/Linux/Docker, docs/finalization/explicit user verification/authorized release remain gates. Only MacDocker STORAGE deferred. VM evidence alone does not complete testing.

## Routing / Next Action

**Fail / Design Impact -> `/software_engineering_team/solution_designer`**. Fresh rule: “When review identifies a Design Impact, Requirement Gap, or Unclear issue that requires upstream requirements or design revision.” Exact rules/receipt retained in CRR005 routing evidence. Only this outcome recipient is selected. Complete cumulative failure package travels with this report/history. No successful-test or Delivery forwarding. After design recovery and any implementation correction, require applicable source review and API-F002 public-create/reconnect revalidation first, then remaining approved matrix; do not replace failures with diagnostic-only successes.
