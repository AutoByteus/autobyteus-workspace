# IR-005 — Personal implementation checks and limits

## Authority and scope

2026-10-14. Implementation Complete — SR020 dependency recovery, **source review
required**, Large/High confirmed. Approved SR018 / Ready SR020 / ARCH-REV004 Pass;
trigger CRR005 CR-003 / API-REV002 API-F002. CRR005 Design Impact and API002
Fail/57.14%/broader Required remain their owners' current results, not overwritten
by these checks. Duplicate ARCH004 delivery was deduplicated. No delegation.

Input receipt `d1aceecc4888fe8b1d58be898337473cd4be8243`; implementation commit
`9992ffb30d4fbaab4852b87b2495738f1b5be908`. `source-audit.json` records all26 changed
paths and1030 unchanged source/authority/history paths. IR001–004, source/API
failure history and requirements/approvals are retained. Root DESIGN/TESTING and
implementation skill were followed; these are implementation checks, not broad
API/E2E execution or release qualification.

## Source identity

- Default unqualified release (`engine:null`) production hash:
  `302cdaf6b87e0ec4b0456376a2adba66be1b7294306c01f4f3df93ef285d4a1c`.
- Same implementation plus measured arm64 candidate manifest production hash:
  `588a8826111e970bee40f59fe62163d56c730f965d35fe15971dfe99a54e33b6`.
  This intentional difference comes from locked package identities, not different
  implementation code. Qualification arrays stay empty. No fabricated amd64 pair.
- Recipe SHA256 `34e28c622f598487af74a545115fa8dffe94e8f1aa5d85c091515aa187d66e4f`;
  production patch SHA256 `ba682b5c64e7f800c927f4c90b2a7bfb4b8d2a323ddc48c3d591db3d75799031`.
  Exact source inputs/accepted commit and newly built outputs are in
  `built-engine-manifest.json`. Prototype hashes/quilt attribution were not reused.
- New package revision `4.3-8ubuntu1+autobyteus1`. Fixed changelog/epoch is
  2026-10-14 UTC; automated build@example.invalid identity explicitly documented.
  The patch attributes the accepted upstream correction, not the recipe author.

## Durable tests and local commands

Exact commands, isolated HOME/TMPDIR/PATH, return codes and timings are in
`run-local-checks.py` / `local-checks-result.json`. Official Go1.27.2 download was
checksum-verified before use; the owned toolchain was removed with scratch.

| Check | Result / evidence |
| --- | --- |
| `go test -race -count=1 -v ./...` in autobyteus-nfs | Full7 packages pass; first `go-race.log`, final rerun after new complete-engine release-equality test in `go-race-final.log` also passes. No production changes after initial checks. |
| `go vet ./...` | Pass, `go-vet.log` (empty stdout) + command receipt. |
| Python unittest engine packaging, installer fixture, packaging/launcher | 12 enumerated,11 pass and1 standalone Go-child fixture skip. That child is executed through its actual Go permission-test parent; skip is not counted as standalone pass. `python-packaging.log`. |
| Four `go build -trimpath` targets, CGO_ENABLED=0 | Darwin/Linux arm64/amd64 compile; build logs/command exit0. Native version smoke passes. Crosscompile is not runtime/engine-package qualification. |
| Unqualified publication | Expected rc1 and refusal text in `publish-refusal.log`; not a published release. |
| Three disposable mutations | Skipped payload digest, skipped installed-version requery, stock APT engine arguments all fail the intended durable assertions; no compile-error substitution. `mutation-*.log`. Copies only, never canonical source. |

Durable coverage in backend engine_bundle/ubuntu_packages tests and CLI
engine_release_test: exact type/name/arch/version/hash/size/member validation,
wrong/missing/truncated bytes, no sidecar/fallback, exact0700/0600 staging and
nonrecursive cleanup, mask/APT/requery/cleanup failures, already-present exact
version handling, client-only behavior and full downloaded/embedded metadata
equality. Python tests cover source recipe identity, manifests and embedding,
qualification invalidation, bounds and Docker's selected pair contract. Tests do
not substitute for actual clean public setup or hosted release execution.

## Actual production-recipe build — isolated arm64 builder

`run-engine-build.py`, `engine-build-result.json`, `engine-build.log` and
`engine-build-cleanup.json`. Fresh owned VM `ab-nfs-ir005-build-38d60768` used
public pinned Ubuntu image
`ghcr.io/cirruslabs/ubuntu@sha256:94dbb9c4b94db827a208fea301cf33eacdcbfb801155b5702b9e2faa52473a2e`.
Ubuntu24.04.5 arm64/kernel7.0.0-38; no host shares/credentials. Distro build
prerequisites exist only in this builder. Actual production recipe verified exact
Noble source/delta/dsc and patch, used distro rules and built the pair. **Pass**.
No runtime engine package preinstall, export or NFS mount in builder.

Actual new output identities (not designer prototype output):

| Artifact | Bytes | SHA256 |
| --- | ---: | --- |
| nfs-ganesha arm64 .deb | 613976 | 0b5c78911cfc1b299e9894e1f841e74176fbb2cb45b158008e4530713549ebc8 |
| nfs-ganesha-vfs arm64 .deb | 48626 | 3bf06769646d93ea85f0277fe0726eb42d0d29a70c0108505706954e5e8d2ac6 |
| Corresponding modified source archive | 1930105 | eed35ab4b732ac05d2afc3531e70cdc27031fb414fdb52a0daf093f33daaec0a |
| Build inventory/buildinfo | 57836 | 56fad63c43f85091d84df347564dfd962a9afaafe519539849860b1807695761 |

`source-artifact-check.json` verifies actual archive original tar, modified dsc,
distro patches, exact production backport/current recipe, fixed changelog and
copyright. No claim of bit-reproducibility. Only arm64 packages were built here;
native amd64 build and hosted CI remain required.

## Actual package owner and Docker parity — clean second VM

`prepare-install-check.py`, `install-check-binaries.json`, `run-install-check.py`,
`install-result.json`, `install-cleanup.json`. Separate fresh owned VM
`ab-nfs-ir005-install-962c1d52`, same public Ubuntu image. Preflight: no engine
package, compiler, Docker or service state. The evidence-only compiled helper
calls actual backend.InstallUbuntuPackages through **existing platform.Lock and
Commands{Lock}**, trusted root0700 state and embedded actual pair. It is a narrow
package-owner check, **not public CLI consent/root-install/create qualification**.
`install-check-binaries-before-lock.json` is a superseded, unexecuted preparation
attempt; the final locked helper is the one actually executed.

- Corrupt embedded payload refused in0.051s before engine package mutation.
- Valid production package owner installs under inherited077 in16.840s. Installed
  nfs-common1:2.6.4-3ubuntu5.1 and main/VFS4.3-8ubuntu1+autobyteus1; private state
  root:root0700, no leftover staged directory/mask/receipt or active default engine,
  no compiler. Repeat exact-installed check passes in0.097s.
- Only after native check: installed build-only guest Docker tooling; built actual
  current Dockerfile from **the identical artifact pair** and locked Ubuntu base.
  Build Pass38.796s. No NFS engine export or server data setup.
- `docker run --rm --network none --entrypoint /bin/sh` inspects exact installed
  main/VFS versions, manifest pair hashes, cleaned staging and absence of compiler.
  Native and Docker `/usr/bin/ganesha.nfsd` hash identical:
  `ce7f607a149221c1d0ece6d3d4d9112174e138e43a0c52398061bcaf7406fcc8`.
  Image ID `sha256:347c7439994b0f7f80638c29e9437056f9ceeb96f2c04bfea0d7ffb1d510e8c9`.
- No NFS mounts in either VM. Docker packaging parity is **not** Docker NFS storage
  functionality or managed agent-client validation.

## Cleanup, artifacts and evidence hygiene

`cleanup.json` + two VM cleanup receipts confirm both exact owned processes/VMs
stopped/deleted, private caches and entire owned scratch/toolchain/copies removed.
Guest Docker resources disappear with the owned VM. No host mount, user source,
node/container/private volume/auth state, paid provider or existing app changed.
Five preexisting untracked dist trees left untouched. No worker was spawned.

Deliberately retained **ignored/unpublished local candidate**, not committed debs:
`/Users/normy/autobyteus_org/autobyteus-worktrees/shared-network-workspaces/autobyteus-nfs/out/ir005-local-candidate`.
`retained-candidate.json` records all11 file hashes/size/paths: exact arm64 pair,
source/notices/inventory/manifest,11,033,781-byte current CLI and release metadata.
CLI SHA256 `20022a9e553ce3d898531e66e48a843d9fd10fb2fd044474f1a471ed070b219e`.
This CLI was compiled, **not** used for public create in this round. Reuse exact
bytes after source review; rebuilding requires new identities/evidence.

Production unified-diff patch intentionally has Git whitespace warnings for the
context marker space preceding original upstream tabs. Do not normalize the
verified patch. Unmodified raw build logs may have upstream whitespace. Other
changed source/authored artifact whitespace checks are recorded separately in
`final-source-check.json`; no raw evidence is silently scrubbed into a pass.

## Limits and required next order

1. Independent **source re-review** of SR020 recovery first. Current CRR005/API002
   results remain unchanged until those owners replace them; DR not performed.
2. API-F002 public fresh create/reconnect first on Ubuntu24.04.5/ext4/kernel7.0.0-38,
   default directory delegationsY, native nonroot1000:109/no supplementary groups,
   nonempty original source, hard4.1, UUID/content/private mode/job checks, **without
   manually preinstalling the engine**. No probe bypass/kernel toggle/workaround.
3. Remaining full native/Docker clients on both OSes, Linux native/Docker storage,
   peer/restart/detach/concurrency/locks/Git, actual native linked skill tools and
   previously unread support assets/peer close/restore/Standalone-Team-Org,
   mounted healthy preview UI, independent physicalMac/Linux/Docker and user
   verification. Prior peer-network environment limitation remains separate.
4. Native amd64 engine/runtime/dependencies and actual hosted two-architecture
   workflow, bootstrap/signing/notarization/release assets are not run here.
   Qualification invalidation and artifact reuse are tested locally, not a claim
   that any release exists. Docs/finalization/release follow applicable gates.

CR001/CR002 scoped resolutions retained. D001/DEC015 outage stalls remain deferred,
not fixed. IMP-D001 current-source links/independent Update-Remove/AGY/local policy
unchanged. FUP001 remains PM-owned; historical full Nuxt/Electron non-green and
candidate-only green distinction retained. Those broad suites were not rerun for
this isolated Go/package delta. No API confidence upgrade, Task Done or release.
