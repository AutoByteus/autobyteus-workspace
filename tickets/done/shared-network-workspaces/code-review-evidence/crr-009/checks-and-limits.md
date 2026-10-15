# CRR009 personal checks and limits

2026-10-15. Source review of IR007/SR021/ARCH005 against unchanged Approved SR018.
No delegation, source/test fix or actual runtime deployment. Input/source and
full counts/hashes: source-audit.json; forward caller/contracts: source-trace.md.

## Personally executed on current source

`run-reviewer-checks.py` and checks-result.json retain exact argv/cwd/rc/duration.
Final nine commands all have expected outcomes:

- Official SHA-verified Go1.27.2 local toolchain; `go version`.
- `go test -race -count=1 -v ./...` in autobyteus-nfs:7 packages pass.
  Exact raw enumeration:52 top-level tests,51 Pass and1 standalone child-helper
  skip;100 direct subcases Pass. Parent fixture launches actual Go child twice
  (fixture check, then mac/linux directory-mode pair); both pass. The skipped
  direct helper is not skipped implementation coverage. IR007's prose count
 51top/105subcases is inherited, not the reviewer's counting convention.
- `go vet ./...`: Pass.
- Four Python modules engine_packaging/installer_fixture/packaging_and_launcher/
  release_workflow:18 enumerated,17 Pass,1 standalone Go-child-only skip. The Go
  parent actually exercised that child above. Real bash Stop function runs with
  a fake Docker command; asserts single Stop/no policy rewrite and truthful text.
- Bash syntax of changed launcher commands: Pass.
- Default source hash recomputation:968f6d000d4b6c2cc3c66cd3add5845cb30385cdad752fe831b564823db9b764.
- Default `release.py --check-publish`: expected rc1, no qualified targets.
- Mutation copies only: accepting current policy=no fails intended negative
  assertion with an observed unwanted Start; removing write-ahead fails exact
  record-before-Start assertion. Both rc1 with named failed tests, not build errors.

Separate nonmutating command:
`PYTHONDONTWRITEBYTECODE=1 python3 autobyteus-nfs/packaging/release.py --source-hash --engine-manifest autobyteus-nfs/out/ir005-local-candidate/engine-candidate/engine-manifest.json`
recomputes51f81cd187caf269ecffa83fecc35a4f665b70942716d7858fa7d964d3b335ed.
This does not build/publish an engine or CLI. Source commit whitespace check Pass.

`audit-source.py`: all739 incoming references exist; all15 IR007 paths match the
source audit;1350 protected prior package paths match;11 retained IR005 files and
4 current IR007 CLI/metadata/README files match hash/size. Base/prior/current
source counts independently computed, max267nonempty/no>500/no>220delta. Test
files and README excluded from production thresholds. Approval/design/architecture/
implementation/API/prior-review artifacts match received HEAD before review update.
No claim of rerunning IR007's62634-file full-repository content audit; current
Git/source identity and affected/protected artifact checks are the reviewer's proof.

## Evidence read, not executed by reviewer

Current implementation four-target compile/seven mutation controls/arm64 CLI
builds/embedded metadata checks/initial attempts and cleanup. Current IR007
candidate is ignored, unqualified and has no Docker image identity. API must
bind its actual owned current Docker image. Exact IR005 engine pair/corresponding
source unchanged; no engine rebuild needed or done. Default Guide remains unavailable.
API003 actual raw two-boot failure and same-ID diagnostic repair establish the
independent normal scenario; new fixtures are not actual Docker boot execution.
Prior API-F002 resolution and API003 mounted API/PTY/locks/desktop gains retained
only at their recorded scopes. No older failed result relabelled a new Pass.

## Attempts / cleanup

Attempt1 downloaded/hash-checked official archive then failed before any product
command because system Python3.9 lacks tarfile.extractall(filter=...). Original
runner/traceback/toolchain/cleanup retained. Corrected to system tar on the same
SHA-verified archive. Attempt2 official download stalled in observed IPv6 SYN_SENT;
interrupted exact owned process with SIGINT, finally cleaned scratch. Original
runner/traceback/cleanup retained. Final download uses curl -4 only for that
request, connect20s/max180s; no system network alteration. Read-only bad template
path and cwd typo also recorded, no product effects. See audit-attempts.json.
Final scratch/toolchain/private HOME/caches/copies removed by finally; Unix/test
resources owned by fixtures cleaned. No real daemon/VM/root/source mount/app/
provider/user resources acquired. Five prior dist trees and all retained candidate
inputs untouched. Raw Go output includes child-fixture whitespace; preserve it,
validate authored artifacts separately and do not normalize test evidence.

## Meaning of Pass

CR005 source correction can proceed to independent API validation. API003 remains
Fail57.14%/broaderRequired/API-F003 OPEN. Fresh public setup + TWO ordinary host
reboots without manual Start/reconnect, actual API/mounted bytes/same identity/
private/source preservation and real normal-stop/policyNo/unselected controls
remain FIRST. Remaining full product/bothOS/native/Docker/physical/runtime/assets/
restore/preview/user/docs/finalization/authorized-release gates are not waived.
No hosted workflow/signing/public installer/amd64-engine/physical/inference claim.
No successful test-code review, merge/push/release or TaskDone here.
