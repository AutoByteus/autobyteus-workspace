# SR023 primary contracts / provenance

Owner Solution Designer, 2026-10-15. Evidence, not requirement or independent product Pass.

1. Apple installed `diskutil(8)` documents `info -plist` as machine-readable information
   for the supplied disk. Retained `diskutil-installed-man.txt`, read-only original
   `/usr/share/man/man8/diskutil.8`, SHA256
   `49cb89da31420099bfb871e889cc72bde69606ca3a8abac1b4a4f2a87f84889e`.
   The system tool accepts the ACTUAL mounted device from Fstatfs; it is not a source-path
   resolver chosen by filename, volume name or guessed disk number. Actual guest outputs
   in prototype-result.json establish DeviceNode/MountPoint/FilesystemType/VolumeUUID
   field shape, and notably no `Mounted` key. Do not extrapolate a plist key merely from
   human-readable output or accept DiskUUID as an undocumented fallback.
2. Apple installed SDK `statfs(2)` (`statfs-installed-man.txt`, SHA256
   `0a31bf1b96a9bce33535b69c79bd3847d9c61e1e49d54ec89bb838fe1fb98ed7`) and pinned
   [XNU mount.h](https://raw.githubusercontent.com/apple-oss-distributions/xnu/xnu-12377.1.9/bsd/sys/mount.h)
   describe mount observation fields/local flag; retained header hash
   `049682e582ede05082580d55a5db0647d1ef057dc7966443fab54438f6acdeb5`.
   `MNT_LOCAL=0x00001000` was verified there; Go syscall did not export that constant
   in the chosen compiler. It is an observation qualification flag, not persistent ID.
3. [Apple getattrlist manual](https://developer.apple.com/library/archive/documentation/System/Conceptual/ManPages_iPhoneOS/man2/getattrlist.2.html)
   distinguishes device identity from object identity and constrains volume attribute
   requests. This legacy documentation is not proof of all modern APFS lifetimes.
   [Foundation volumeUUIDString](https://developer.apple.com/documentation/foundation/urlresourcevalues/volumeuuidstring)
   was consulted as discovery; the browser delivered only its JS shell, so it is NOT
   substantive evidence for the chosen implementation. Apple web diskutil manual and
   Foundation JSON fetch errors are not successful reads; installed manual + exact
   runtime outputs, not guessed web content, govern this package.
4. [Go syscall Darwin source](https://raw.githubusercontent.com/golang/go/go1.25.0/src/syscall/syscall_darwin.go)
   was inspected when comparing native attribute/syscall alternatives. No exported
   Getattrlist wrapper was found there; exploratory current x/sys inspection is not a
   versioned dependency selection. Raw syscalls/custom assembly/cgo are rejected as
   unnecessary for the already-built system diskutil route, not declared impossible.
5. [Official Go downloads](https://go.dev/dl/?mode=json) identified the downloaded
   go1.27.2.darwin-arm64.tar.gz: 68195916 bytes, SHA256
   `76812b213b1b2302c978d28fa52fa92d541704b9e7d9d5db8002c50e4018c4c5`.
   toolchain.json and probe-build.json record actual use. Both Darwin arm64 and amd64
   no-cgo probes compiled; ONLY arm64 executed. This is not a product toolchain upgrade.

Inference selected after runtime evidence: use stable APFS VolumeUUID + directory inode
for a persisted Mac source binding, while dev/fsid are short-lived mapping checks only.
Three fresh ordinary VM boots and same-path actual replacement volumes test this inference.
A copied filesystem image can preserve a volume UUID (the public clone baseline does);
this is NOT cryptographic anti-cloning or globally unique across independently cloned hosts.
No remote website or manual establishes corrected product lifecycle; that remains API-F005.
