# API/E2E Revision Record — Shared Network Workspaces

Canonical current truth: [coverage investigation](api-e2e-coverage-investigation.md), [execution report](api-e2e-execution-coverage-report.md), [test-case ledger](api-e2e-test-case-ledger.md). Keep entries across later rounds; no missing result implies Pass.

## Revision index

| Revision | Trigger | Related upstream | Prior result/confidence | Current result/confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | code_reviewer / CRR002 Pass / first API execution | Approved SR018, Ready SR019, ARCH-REV003, IR003, CRR002; IR001/002 and CRR001 history retained | N/A | **Fail / 57.14%** |

## API-REV-001 — nativeMac first-use failure exposed through actual VM execution

- Trigger: complete source Pass package, Large/High, plus user suggestion to use Mac VM; no delegated workers. Personal validation round1 on branch `codex/shared-network-workspaces`.
- Baseline input HEAD `3b7dd9a2895f4b8fedc5e1bcdd00c913d97fae2f`. Durable test-only commit `af9f23df93a63ca6c8305f51439a855acc2133c7`; previous audited source bytes unchanged.
- Investigation/ledger written before execution. Cases N01–04 and V01–05 planned; added V02-repro when V02 first-create failed. No obsolete assertion removed.
- Coverage correction: `autobyteus-server-ts/tests/e2e/file-explorer/workspace-content-rest.e2e.test.ts` Needs Update after original route-only fixture failed five cleanup calls requiring process authorities. Reuse full test server composition, unregister before close; retain original response assertions and add actual HTTP HTML/relative-media replace/delete regression. Separate baseline-fix commit per TESTING9. Six-case rerun Pass; original failed output preserved. Not NFS/browser proof.
- Repository: Python39pass/3skip of42; seven Go test packages/race/vet/native build pass; server133pass; original public contracts35pass/5fixture-fail then corrected workspace6pass; scripted AGY8pass; Guide21pass; terminal109pass. Exact commands/gates in evidence. Existing full Nuxt/Electron three updater failures retained as FUP001, already in PM custody; no patch/suppression/re-notification.
- Post-repository score53.57%, broader Required. Built unqualified current native binary using private checksum-verified official Go. No public release metadata edit.
- V01: fresh disposable Mac26.6.2/APFS/Apple NFS3, actual sudo/root install under077, nonroot501:20 source/mount and same original content; hostReady, managed launchd. Narrow Pass, not released installer/guided password/physical peer/reboot proof.
- V02: fresh source-host create fails before peer/Docker/operation steps, mount_nfs exit74/rpc.statd RPC prog. not avail. V02-repro fresh single VM repeats same first-use failure with self+host allowlist; original V01 success retained. Postfailure diagnostics show later RPC registration. Public reconnect succeeds with same UUID/hostReady. Root cause not established, no production fix attempted. Normal first setup, not deferred outage injection.
- Original two-VM harness isolated each guest on its own subnet; future peer matrix needs shared owned network. SingleVM self-mount reproduces independently. Diagnostic nfsstat path typo recorded, not called product failure.

### Prior failure resolution

None from a prior API/E2E round (prior result/confidence N/A). CR001 permission correction is upstream CRR002/IR003; this round adds actual nativeMac root/different-UID evidence. Initial N03 fixture failure was found and corrected within this round; failed log is retained, not rewritten as Pass.

- Canonical artifacts updated: investigation postrepository/final decisions; report complete acceptance-criteria proof/commands/failure/score/cleanup; ledger reconciled all cases.
- New open failure: **API-F001** / V02 and V02-repro / AC012,018,019 (retry AC014 partially proven). Preliminary **Unclear**; recommended review focus native setup/service-start/mount implementation, but reviewer confirms origin and owner before rework.
- Final result **Fail /57.14%**; all categories below90%, target95% not met, missing/failing critical proof independently blocks Pass. Broader validation Required and executed, now reroute rather than repeat unrelated matrix work.
- Remaining scope: V02 later operations/native and Mac managedDocker clients/identity/preservation/normal restart; V03 Ubuntu/ext4/Ganesha/native+DockerLinux storage/Linux clients and independent physical peers; V04 current isolated desktop mounted previews/Guide; V05 actual native tools, support assets, peer close/restore, standalone/Team/Org/source policies. No user-only waiver. Default unqualified release retained; no published installer claim. DEC015 outage isolation remains deferred, not a new gate.
- Cleanup: all four exact owned clones/processes absent; own scratch/toolchain/data/binary removed; public VM cache and preexisting generated dist retained. No user app, node, data or credentials touched. Evidence under `evidence/api-e2e/api-rev-001/` retained for failure-origin review.
- Main Task stays open. Delivery/merge/push/release/user-verification not performed. Fresh rules select the next exact recipient; current Fail requests focused failure-origin review, not successful-test review.
