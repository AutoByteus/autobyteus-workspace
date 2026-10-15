# CRR-012 checks and limits

Focused failure-origin review only, personally performed. No delegation. No
production/durable-test edit, Go/test-suite rerun, build, VM, root, mount, Docker,
provider or user-app operation. Existing API scripts/raw execution evidence were
reviewed, not rerun or represented as reviewer execution. No resource cleanup was
needed for this review. API005 cleanup receipts remain upstream execution evidence.

Command: `python3 tickets/in-progress/shared-network-workspaces/code-review-evidence/crr-012/audit-failure-package.py`

The first audit execution passed. A separate routing-file serialization mistake
was corrected before writing; see attempts.md. Read-only checks independently verified 1283
incoming manifest file hashes/sizes, all1285 reference paths, 19 retained candidate
files and286 prior untracked dist files. Source comparison confirms no production
or durable-test delta after CRR011. Actual Mac observations (9 across second/third
boot receipts) were parsed; third-boot plist, unchanged saved record/hash, current
source identity and bytes, actual status and explicit reconnect errors asserted.
Four distinct kernel boot times establish three ordinary boots; initial successful
create and running-job evidence also reviewed. The first210s observation is not a
new SLA. Invalid earlier diskutil(directory), PATH and filename guesses are not
used as proof. No source identity bypass or proposed repair was executed.

CR006 closure was checked separately: all40 unique fixtures/80 native+HTTP reader
comparisons recomputed from current native/Docker storage results. Actual matching
SHA/length/first-exact timestamps <=5s, warm in-place source identity and atomic
inode change, fresh/normal-reconnect phases, nonroot identity, one generated expiry0
and activation receipts verified. Guest script's write flush/fsync/close precedes
timer, real HTTP/read_bytes enter production, polling only measures. This is
executed Linux scope, not full AC003 or physical/cross-OS qualification.

Some initial combined read commands truncated output; conclusions used subsequent
bounded reads and full-file programmatic parsing, not omitted output. Final review
checks protect prior input except the two owned review authorities; CRR001–011
remain an unchanged byte prefix. Root TESTING/DESIGN and Example9 applied; no closer
NFS/ticket AGENTS found. No new guideline conflict or out-of-scope follow-up.

API005 Fail57.14%/broaderRequired remains authoritative. Only MacDocker STORAGE is
deferred, not Mac clients or native storage reboot. D001/DEC015 deferred NOTfixed;
IMP-D001 current-source/private-link/independent Update-Remove/unchanged AGY policy;
FUP001 PM custody; full bothOS/physical/native-tool/preview/release gates retained.
No merge/push/tag/release, TaskDone or user-verification claim.
