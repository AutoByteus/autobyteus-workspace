# Primary platform contracts — CRR-012

Consulted official Apple documentation through web browsing on 2026-10-15. No
secondary forum/search-result claim is used for attribution.

- Apple's [stat(2) reference](https://developer.apple.com/library/archive/documentation/System/Conceptual/ManPages_iPhoneOS/man2/stat.2.html)
  identifies `st_dev` as the containing device ID. It does not establish a
  persistent cross-boot identity contract for this application.
- Apple's [getattrlist(2) reference](https://developer.apple.com/library/archive/documentation/System/Conceptual/ManPages_iPhoneOS/man2/getattrlist.2.html)
  maps ATTR_CMN_DEVID to stat's device field and distinguishes object IDs from
  permanent object IDs across mount cycles. This is API-contract context, not
  evidence that a particular proposed identifier is sufficient on every filesystem.
- Apple's [volumeUUIDString documentation](https://developer.apple.com/documentation/foundation/urlresourcevalues/volumeuuidstring)
  exposes a persistent volume UUID, with absence explicitly possible. This confirms
  a conceptual distinction from a current device observation; it is **not** a
  prescription to use Foundation/diskutil, accept UUID alone or drop directory checks.

Decisive current-platform evidence is API005's actual APFS third-boot receipts:
unchanged valid disk/volume UUID, directory inode/owner/mode and file/marker bytes,
changed stat device ID, unchanged saved descriptor and explicit source rejection.
The conclusion that the persisted full-pair predicate rejects this unchanged source
follows from those receipts plus `source.go:50–59`; no universal boot-frequency or
Linux failure is inferred from documentation. Designer must select and validate a
small platform-appropriate identity contract, preserving actual replacement refusal.
