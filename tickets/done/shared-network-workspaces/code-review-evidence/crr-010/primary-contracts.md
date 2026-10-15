# CRR-010 — exact dependency/cache contract

Authority: Approved SR018 REQ004 / AC003 / QR001 and SCN002, not these dependency
mechanisms. Normal source-folder writes and fresh participating-client reads
are already supported. The requirement is five seconds after successful
sync/close, not eventual visibility or already-open-reader coherence.

## Independently checked facts

The exact retained corresponding-source archive has SHA256
`eed35ab4b732ac05d2afc3531e70cdc27031fb414fdb52a0daf093f33daaec0a`.
The nested original archive has SHA256
`d4efd020edf4dfe65abfd0f0f66eb4390613360f99dce4354467ab297e0e1c0f`.
Read-only member hashes and numbered excerpts are in `engine-source-audit.json`.
No Debian patch in that retained source mentions the inspected attribute-expiry
symbols. This verifies the relevant source, not a live cache trace.

- `src/include/nfs_exports.h:185` sets default attribute expiry to60.
  `src/support/exports.c:65–73,1999–2010,2074–2085,3385–3414` initializes and
  inherits the selected export's expiry when configuration does not specify it.
  The versioned [upstream export configuration contract](https://github.com/nfs-ganesha/nfs-ganesha/blob/V4.3/src/doc/man/ganesha-export-config.rst)
  independently documents this default and client/export/default inheritance.
- `mdcache_helpers.c:815–830` assigns the export expiry to a newly cached
  attribute set when the lower layer does not supply one;3560–3577 preserves
  entry expiry on refresh. See [versioned upstream helper](https://github.com/nfs-ganesha/nfs-ganesha/blob/V4.3/src/FSAL/Stackable_FSALs/FSAL_MDCACHE/mdcache_helpers.c).
- `mdcache_int.h:865–916` accepts trusted, complete regular-file attributes
  until integer-second age exceeds expiry (with distinct delegation rules);
  expiry zero instead fails the validity check. See [versioned validity predicate](https://raw.githubusercontent.com/nfs-ganesha/nfs-ganesha/V4.3/src/FSAL/Stackable_FSALs/FSAL_MDCACHE/mdcache_int.h).
- `mdcache_handle.c:941–996` returns cached attributes when that predicate
  succeeds; otherwise it refreshes from the underlying FSAL. It is not sufficient
  to shorten only a Linux client's attribute cache and assume every server reply
  contains fresh backing-file attributes.

## Production trace / inference boundary

`setup/apply.go:97–104` -> native `InstallGanesha` or Docker `WriteGanesha` ->
`backend/ganesha.go:13–56` generates the VFS export. Native
`ganesha_native.go:18–31,33–53,55–82` writes the owned private configuration and
starts the actual engine with that file. `platform/mounts.go:67–79` bounds
**client** attributes to1s; `docker/volume.go:17–18` reuses it with nosharecache.
The API004 captured live native configuration matches this omission of
Attr_Expiration_Time, and actual findmnt shows all four attribute bounds at1.

The source actor modifies the original ext4 file outside Ganesha's NFS write
path. Readers reopen through the OS NFS client, either directly or through
`src/api/rest/workspaces.ts:16–39` and a fresh createReadStream. API004 has
already demonstrated staleness without the HTTP layer. A server-side cached
attribute reply is a strong explanation for both readers retaining old data
until roughly61s, but that is **inference**, not a packet/invalidation trace or
proof that one particular configuration value alone repairs every operation.
No new renderer, REST, retry, drop-cache, proxy or notification mechanism follows
from this evidence. Native Linux hosting is reproduced; common code alone is
not Docker STORAGE reproduction. No configuration modification was performed.

The reviewed design's filesystem-semantics paragraph specifies client actimeo1
and the end-to-end5s promise, but leaves the selected server's cache policy
unresolved. This is a bounded design-contract gap, not approval to replace the
storage backend or relax the requirement. Existing generated-config guards
(`WriteGanesha`/`VerifyGanesha`) also mean a future config change needs an explicit
supported apply/reconnect disposition; do not bypass guards or invent a migration
framework in this review.
