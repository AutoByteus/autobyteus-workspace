# CRR005 checks and limits

Completed focused failure-origin review on2026-10-14; input57480943efcf6a4bd060953b48bafde7da616319, API002 Fail/API-F002. Result and routing authority: canonical `../../code-review-report.md`; history `../../code-review-revision-record.md`.

## Personally performed

- Read relevant approved scenario/scope/reference matrix, setup/package/backend/mount/probe/marker source and raw public-create/reconnect/strace/build/cleanup evidence. No general successful-test review.
- Independently hashed29 relevant paths against82dd5d9d53, checked56 API002 manifest entries and276 unique cumulative references; recomputed production hash497efd6abb0c2cfa4c740a87f005c529cbf026a6fa218b3acd345826f4a923da. `focused-audit.json`; report/history hashes represent pre-update basis, not final versions.
- Primary-source browsing/direct retrieval: V4.3 operation dispatch, accepted upstream fix, Linux7 procedure/decoder and Ubuntu package records. `primary-contracts.md` / `primary-source-fetch.json`. Guessed nfs4dir.c404 and missing parameter in super.c are not evidence; no downloaded source changed the repository.
- Executed `python3 tickets/in-progress/shared-network-workspaces/code-review-evidence/crr-005/run-linux-dir-diagnostic.py` from worktree, personally, twice with independent new roots/clones. First script/output/cleanup archived unchanged in `attempt-1/`; second root files are current diagnostic. Both command arrays, timings, stdout/stderr and environment in JSON.
- Attempt1 harness divergence: omitted default-unit mask, distribution Ganesha active, manual mount ENOENT. No diagnostic read/control executed. Not a product failure. Fixed only archived diagnostic script to mask competing default unit before apt; production installer already does so.
- Attempt2 actual Ubuntu24.04.5/aarch64/ext4/kernel7.0.0-38, exact packages, extracted current config template and same hard4.1 options. Python replays observed openat directory traversal, not a product binary/public create. Y2fail/1pass -> diagnosticN3pass -> restoredY2fail/1pass; local ext43pass. Exact1000:109 groups cleared. Same mounted source/config/identity across controls. `diagnostic-summary.json` is independently derived/asserted.
- Capture attempted in guest but retained output contains only header, no packets. `python3 .../decode-directory-rpc.py` reports0 records/pairs in `packet-decode-result.json`; not protocol proof. Capture stop rc5 after SIGINT preserved. Exact OP_ILLEGAL mechanism is source-supported inference; no claim of API historical packet correlation.
- Rechecked both exact VM PIDs absent and scratch roots nonexistent after stop/delete. All guest-only service/export/mount/sysctl/fixture actions disposed with clones. Old Mac public image/tool cache untouched. No host-root/mount/network/security changes.

## Reviewed, not personally rerun

API002 two fresh Mac passes resolvingAPI-F001; two Linux public-create failures plus both reconnect failures; original/mounted source identity/bytes and current-candidate provenance; current7-package Go race/vet and Python39pass/3skip. API001/IR003–004 previous validation remains attributed to its executors. No reviewer Go/toolchain build, full repository/API/native-runtime/UI/physical matrix run.

No production or durable-test edit, release-lock/qualification change, unsafe reader fallback, permanent kernel policy, delegation, credentials/provider inference, Docker/user-node mutation, merge/push/release or Task Done. No scorecard at failure-origin boundary. FUP001 baseline failures/PM custody and deferred outage/source policy constraints remain unchanged.

## Artifact navigation

- `api-execution-review.json`: exact retained public failures and relevant corrected source/mounted syscall rows, plus independent prior-Mac resolution context.
- `linux-dir-diagnostic.json`, stage JSONs, run script, diagnostic-summary: reviewer runtime boundary evidence and its limits.
- `attempt-1/`, `diagnostic-attempts.md`: original harness failure retained.
- `linux-dir-packets.log`, decoder and zero result: unsuccessful packet observation, not positive proof.
- `cleanup.json`, first-attempt cleanup, summary: exact clone/PID/root retirement; source/private data/user resources never shared with guests.
- `primary-contracts.md` / `primary-source-fetch.json`: primary URLs/hashes and bounded inference.
- Cumulative upstream references remain in API002 package-index; no source authority or prior failure erased.
