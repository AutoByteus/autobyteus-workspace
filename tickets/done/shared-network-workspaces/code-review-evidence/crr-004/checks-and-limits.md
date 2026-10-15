# CRR-004 — source re-review checks and limits

2026-10-14. Input `e1081e95db56c8f4b4a028404ab0365b70ad8308`; source fix `174e480bd0cfaee29f22fd46b1922afbb274e56b`; prior review receipt `4ed9a12720e04daa2fad0c5d3b8d20b5ceb62c79`.

## Personally performed

- Revisited code-reviewer skill/shared principles and Example9; root DESIGN.md/TESTING.md; Approved018 first-use/retry/preservation and Ready019 engine-before-mount/local-lock contracts. No closer NFS AGENTS/DESIGN found. Cumulative solution/architecture/IR/CRR/API package retained, with current IR004 handoff/history and evidence read.
- Read all four changed production files/new backend test; traced sole ApplyApple and EnsureApple callers from public create/pending reconnect and managed reconciliation. Endpoint is existing validated private IPv4; administrative lock remains inherited by synchronous commands; platform fixes C locale/absolute trusted commands. Real mount/nonroot verification/job sequencing is unchanged.
- Independently rehashed **906** unchanged source/authority/history paths against both current bytes and prior receipt using `git cat-file --batch`; five declared delta paths are the entire non-ticket committed delta. Independently checked hashes and nonempty-line counts; tests exempt. [delta-audit.json](delta-audit.json). Counts precede the current reviewer report/history update; canonical review files intentionally change in this round.
- Read new durable backend tests and IR004 full Go race/vet, packaging/build/mutation logs/runner. Three negative controls fail their intended assertions, not compilation. No candidate failure counted as current-source success.
- Parsed all eight retained native VM reports, exact public create commands, source/binary identities and cleanup. Independently checked final two full results, source inode/device/UID/GID/mode identity, original/mounted SHA, returned hostReady, private root owner/modes, installed binary SHA, live job and absence of reconnect command. [execution-evidence-review.json](execution-evidence-review.json). Times there are command times; IR004’s13.407s/11.496s include case wrapper overhead (commands13.406s/11.495s).
- Inspected current-source packet bytes at `ports-trace-packets.log:2599–2626` and `2745–2766`: matching transaction IDs, programs100003/100005 v3/procedure0 to ports2049/20048 and accepted-success replies. This corroborates serving checks, not export authorization; actual mount and nonroot file probe remain mandatory afterwards. The original ports-trace overall harness Fail stays Fail (unnecessary private GID0 assertion); two subsequent fresh full runs use corrected root-owner/private-mode assertion only.
- Consulted local `man rpcinfo` (read-only) for explicit-port TCP semantics and primary [NFSv3/MOUNT NULL definitions](https://www.rfc-editor.org/rfc/rfc1813.html#section-5.2.0) / [portmapper contract](https://www.rfc-editor.org/rfc/rfc1833.html#section-3). Prior pinned Apple activation/diagnostic sources retained under CRR003. A guessed Apple rpcinfo repository URL returned404 and was not used as evidence.

## Optional reviewer Go rerun did NOT execute

No Go binary was installed on PATH and implementation had removed its owned toolchain. Attempted to obtain the same pinned official archive for backend race/vet in a fresh private root. Both `go.dev/dl/` and direct `dl.google.com/go/` connections stalled before archive creation; reviewer interrupted the exact owned Python process with SIGINT. Their finally blocks removed their roots. **No Go version/test/vet command ran; no reviewer test Pass claimed.**

- First attempt: [checks-download-interrupted.json](checks-download-interrupted.json), [original script](run-reviewer-checks-initial.py).
- Second attempt: [checks-result.json](checks-result.json), [console](checks-console.log), [script](run-reviewer-checks.py). Its top-level Fail denotes download/setup interruption, not product/test failure. `commands: []` is authoritative.
- Source review therefore uses independently inspected code/tests plus retained IR004 execution, not a fictitious independent runtime rerun. This optional tooling interruption does not contradict the supplied current-source checks or establish a product defect. API owner must independently rerun API-F001 regardless.

## Current result and boundaries

CR002 resolved at source-review boundary; CR001 stays resolved. No new in-scope finding. Source Pass authorizes API re-entry, **not API Pass**: API001 Fail/confidence57.14% stays authoritative pending its owner’s next execution.

IR004 supplied evidence: seven-package race/vet pass, Python6pass/1standalone child skip with actual Go-parent child execution, four target builds/native-only smoke and unqualified publish refusal; two final fresh current native Mac full passes, retained baseline/candidate/harness failures, exact eight-clone/process cleanup. Reviewer did not run a VM, privileged install, mount/export, Docker, UI, provider, physical test, merge, push or release. Both reviewer temporary roots removed; preexisting five generated dist directories untouched. No delegation or background work remains.

D001/DEC015 outage hardening deferred/not fixed.30s observation is not a hard OS-command/file-operation bound; no new per-action probes/workers/leases/fallback. Source Update/Remove and IMP-D001 private-link/AGY/local policies unchanged. FUP001 PM custody and current-source Nuxt/Electron failures retained, no duplicate handoff or patch. Current platform/peer/native-runtime/mounted-preview/physical/user-verification/delivery/release matrix remains as API001 reports; unqualified release/Guide unavailable deliberate.
