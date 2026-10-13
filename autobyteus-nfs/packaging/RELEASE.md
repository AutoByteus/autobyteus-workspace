# NFS distribution and qualification

Use the repository's existing `vX.Y.Z` / `vX.Y.Z-beta.N` stream and root RELEASE.md.
Do not tag, publish an engine/installer, or change the Guide's unavailable state
without the selected release decision and completed delivery gates.

`release-nfs.yml` supports manual **build-only** execution (`publish=false`), which
uploads candidate binaries and an OCI engine artifact but does not push an image,
create a release or upload public release assets. Version/package checks, native
architecture unit/vet/binary smoke checks and immutable engine inputs are explicit.
Mac runtime hosting/physical tests are not claimed by the CI binary smoke.

`release-lock.json` starts with **no qualified targets**. Its Ubuntu package/base
pins are the selected architecture-reference versions only. The release gate
requires current production-source hash, committed independent physical evidence
and explicit user verification before publishing. Delivery owns replacing these
fields from actual evidence and syncing related docs/Guide. To calculate the source
hash: `python3 autobyteus-nfs/packaging/release.py --source-hash` from the root.
Changing engine family/package/base pins requires renewed full mode evidence; no
unbounded apt upgrade occurs on normal reconnect.

Publication uses the same repository tag, an immutable Linux engine digest,
versioned `autobyteus-nfs-<version>-<os>-<arch>.tar.gz`,
`autobyteus-nfs-manifest.json`, `SHA256SUMS-nfs` and
`autobyteus-nfs-install.sh`. Only qualified target archives are published. The
installer script has a replaced **versioned tag**, never `latest`; source with its
unreplaced placeholder fails without downloading anything. Archive and embedded
manifest must agree. Checksums do not protect against a compromised publisher.

Publishing Mac binaries requires Developer ID signing and notarization. The job
requires `NFS_MAC_CERTIFICATE_P12_BASE64`, `NFS_MAC_CERTIFICATE_PASSWORD`,
`NFS_MAC_SIGNING_IDENTITY`, `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`,
`APPLE_TEAM_ID`. It uses an ephemeral runner keychain and cleans it. Signing and
notarization must pass before archive upload. The target GitHub release must already
exist; the NFS workflow must not create an independent release.

The Linux engine has no host-wide/private-data/Docker-socket bind and no privileged
mode. It receives only the exact source, generated config, private recovery state,
host networking and the specified Ganesha capability set. Distribution retains
package inventory and license notices. Review Docker/OS package lifecycle on each
qualified reference rather than treating unit fakes as proof.

No release has been published or authorized by the implementation work.
