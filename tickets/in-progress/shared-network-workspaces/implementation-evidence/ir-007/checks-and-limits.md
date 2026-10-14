# IR007 personal implementation checks and limits

2026-10-14. All work personal; no delegation/spawning. Scope: SR021 selected
Docker failed-start completion, not whole-product validation. Current source
`d318bd9db935affdf16d141ef4e88a6c0e4939b5`; input receipt
`50d9c9d0c883e1ad8d3a1808b9e980a7df4f132b` adds only solution history to ARCH005
`4cd2aae49b6e628084bc4d63fd6ef3b2719c3fc2`. Approved018 / Ready021 retained.

## Personally executed

- `go test -race -count=1 -v ./...`: all seven packages pass, 51 top-level tests,
  105 subcases. This includes actual restrictive-directory-mode child fixture.
- `go vet ./...`: pass. Darwin/Linux × arm64/amd64 compilation: pass. These four
  plain builds do not constitute four qualified package/physical targets.
- Four Python packaging/installer/launcher/workflow modules:18 enumerated,
  17 pass,1 standalone Go-child-only skip (child executed by Go parent).
- Real bash function execution against a fake Docker command: Stop forwarded
  once, no policy mutation, no-op/policy=no guidance printed. Bash syntax pass.
- Seven isolated source mutations fail intended assertions: missing fresh probe,
  missing write-ahead, consumed retry, policy=no acceptance, broad substring
  diagnostic, Start by name, unchecked volume driver. Not compilation failures.
- Public-field HTTP transport fixtures execute existing Probe/VerifyStarted/
  Store; selected-set Unix HTTP fixture discovers once, continues independent
  nodes, excludes unselected and stopped/policy-disabled controls, and rejects
  Docker work before failed host proof. They do not prove actual Docker reboot.
- State controls include exact captured signature, unknown/foreign errors,
  endpoint/export/options, all noneligible lifecycle states, current daemon,
  attachment/volume ownership, incomplete recreation, malformed attempts,
  after-probe policy/config/image/ID/state/volume/daemon changes, already-running,
  304 ambiguity, failed API verification, write failure and consumed retries.
- Current local CLI candidate built from a source copy differing only in release
  metadata + two embedded .debs. All11 IR005 retained files verified; engine NOT
  rebuilt. Linux arm64 binary and Darwin arm64 binary compiled; native version
  invoked, exact release JSON bytes verified embedded in both. No root install.
  Empty qualification/default publication refusal remains correct. The candidate
  is ignored `autobyteus-nfs/out/ir007-local-candidate`; four files retained and
  indexed in `build-result.json`, not released. No Docker image identity assigned.
- Source audit:15 changed paths,1350 prior active-package files byte-identical;
  62634 whole-repository tracked files outside approved deltas/current handoff
  exclusions matched initial hashes. Initial complete inventory was reduced to
  the1360 active-package paths for durable evidence after full comparison.
  Five preexisting dist trees untouched. Changed production sources max267
  nonempty lines (launcher commands); new implementation files117/92/42/65.
  No production delta >220; large new test files are not production modules.

## Attempts retained, not silently converted to pass

- Initial command attempted toolchain setup while input audit still running,
  before scratch-path existed; it failed without downloading or changing source.
  Waited for input audit, then checksum-verified Go1.27.2 in owned scratch.
- Initial existing Go suites passed. First new Docker fixture run correctly
  failed foreign-volume/wrong-driver negative cases: a generic incomplete result
  was incorrectly also eligible for a probe. No node Start occurred in those
  fixtures. Corrected to an explicit eligible observation, then reran all tests.
  `go-docker-first.log` retains the failed assertions.
- `candidate-1/` is a passing pre-polish candidate. Final code compares exact
  inspect Mounts entries independent of array order, based on API003's recorded
  Docker order changes, with a new positive regression. Opaque Config/HostConfig,
  image/ID/aliases and all mount entries still must match. Final suites rebuilt.
- `build-attempt-1/` retains an erroneous harness expectation that `version`
  prints source hash. Public command prints only version. Corrected harness
  asserts version and actual embedded metadata bytes; no production change.
- Final18 command receipts have expected exit codes. Historical failed runs and
  prototype/API failures are retained, not relabelled current success.

## Limits and next gate

No real daemon, VM, source mount, host-root installer/job, provider, live user
resources, desktop frontend, hosted workflow, physical or paid runtime test this
round. No merge/push/release/TaskDone. Source review FIRST. API-F003 ordinary host
reboot twice with current public setup and no manual Start/reconnect remains
OPEN; normal successful-running Stop, policy=no and unselected controls plus
same-object/API/mounted-byte/source/private-state preservation are mandatory.
API003 Fail57.14%/broader Required and CRR008 Fail remain authoritative. API-F002
is independently resolved at API003's fresh no-preinstall native-Ubuntu scope.

Primary contract read: https://docs.docker.com/engine/containers/start-containers-automatically/
and preserved versioned Moby29.1.3 source/observations in SR021. Docker owns
ordinary running-process restart policy. Unknown diagnostic grammar stays
incomplete. No manuallyStopped field/private veto/events/outage retry machinery.

D001/DEC015, IMP-D001, FUP001, prior source/API history, peer-NAT limit, remaining
bothOS/native/Docker-client/Linux-storage/current-product/physical/agent/asset/
preview/user/docs/finalization/release gates are unchanged. Only MacDocker
STORAGE hosting is deferred, not its clients. See current canonical handoff.

Artifact commit check note: raw final/candidate-1 Go race stdout contains eight
blank lines with spaces emitted by the existing installer child fixture. The
first all-artifact whitespace check stopped before commit. Raw logs are retained
byte-for-byte rather than normalized; source commit whitespace check passed.
Artifact check with only trailing-blank detection disabled passes; no source
whitespace exemption was used.
