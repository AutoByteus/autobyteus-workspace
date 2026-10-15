# CRR-003 focused failure-origin checks and limits

Date2026-10-13; reviewer’s work only. Input HEAD1009ce87e5df00b90480b689d9309331152ef3ba. This is API-F001 origin review, **not** full source/test review or an API rerun.

## Personally performed

- Read Approved018 requirements/approval and Ready019 design affected first-use/preservation/locking/lifecycle sections; ARCH003, cumulative solution/IR/CRR histories, API001 report/investigation/ledger and complete package inventory. Revisited root DESIGN.md/TESTING.md, code-reviewer failure-origin rules and Example9. No NFS/scripts package AGENTS additions apply.
- Traced public create/consent/elevation into Apply -> ApplyApple -> EnsureMount -> nonroot probe -> InstallJob; traced pending public reconnect through PendingPlan -> Apply (not just ordinary Reconnect). Read Apple plan/configuration, permission helper and lifecycle owners.
- Compared nine focused NFS production paths and12 upstream authority files byte-for-byte against source review/API input3b7dd9a; all equal. `git diff --name-status 3b7dd9a2895f4b8fedc5e1bcdd00c913d97fae2f HEAD -- ':!tickets'` reports only the API-owned workspace REST test. [focused-audit.json](focused-audit.json). No full139-path size audit repeated.
- Parsed the three retained VM JSON files, checked their common binary/source identity, selected exact create command rows, asserted rc sequence0/1/1 and public reconnect rc0; reviewed full diagnostics and executed harness for preconditions/control/cleanup. [execution-summary.json](execution-summary.json) is derived evidence, **not fresh executions**. Raw API receipts stay authoritative.
- Read primary Apple nfsd/mount helper published source, pinned to commit93733ffccece4daee73bf6306b291d1ae69130c0. URLs, independently fetched SHA256s, line ranges and limits are in [source-contracts.json](source-contracts.json). No external vendor source retained. Initial unpinned browsing/manual inspection was corroboration only; pinned raw source is the reproducible reference.
- Artifact JSON parse, local-link existence, source/report/history identity, explicit staging and whitespace checks are recorded in final consistency receipt.

No shell command operated nfsd, launchd, exports, mounts, Docker, VM or a provider in this reviewer round. No production/test fixes or test-suite execution, toolchain installation, source data mutation, delegation, merge/push/release. Files written only under this ticket’s canonical review report/record and crr-003 evidence directory. Prior five untracked generated dist directories left untouched.

## Evidence limits and ownership

API’s real VM execution is attributable to API001, not the reviewer. Actual root installation was executed there; its V01 success extends previous fixture-only confidence in CR001’s fix. V02 and single-VM cold first-create failures remain equally real. Later registered RPC services do not prove failure-time readiness. Recovery replays Apply and does not isolate one OS variable. No exact kernel/RPC cause claimed, no correlation-based allowlist diagnosis, no inference of broken local locks from error wording.

The supported one-invocation normal-create failure is implementation-owned at the activation/mount boundary. Correct that bounded outcome and investigate its exact transient cause within existing ownership; do not invent outage or distributed-lock guarantees. Source review should have questioned command completion as sufficient activation ordering; runtime was needed to expose this particular consequence.

API cleanup receipt and per-run finalizers report four exact owned clones/processes removed and scratch/toolchain/binary absent, public cache retained. Reviewer started none. Remaining platform/current-product/native-runtime/physical/user/release gates are not waived. FUP001 remains in PM custody, current repository not all-green.
