# IMP-004 — CR-001: the picture cache keys on the file's identity

- Date: 2026-11-28. Local Fix CR-001 from CRR-002 (API/E2E F-1).
- Every run used `env -i PATH HOME TMPDIR USER`.

## The fix

`src/agent-package-definitions/domain/definition-avatar-file.ts`: `contentByPath` reuses a path's hash only while its
`size`, `mtimeMs`, `ctimeMs` and `ino` are unchanged, all from the same `lstat`.

Size and mtime alone were not enough. Tar and other time-preserving tools replace a file with one of the same size and
the same whole-second mtime. A replacement always changes `ctime`, which no tool can set, and normally the inode. N-3's
purpose is kept: an untouched picture is not read again.

## Unit case (`tests/unit/agent-package-definitions/definition-avatar-file.test.ts`)

The old N-3 case asserted the stale hash (an in-place rewrite at the same time kept the old one). It is replaced by two
cases:

- **Untouched:** "does not read an untouched picture again (N-3)". `fs/promises.open` is called once for the first read
  and not again for the second, and the result is equal.
- **Replaced:** "reads a replaced picture again, even of the same size with the same whole-second time (N-3, CR-001)". A
  new file of the same size is renamed over the old one, and `utimes` sets it back to the old whole-second time. The
  reader gives the new bytes' hash and a new version.

| Code | Result |
| --- | --- |
| Tested code (`950061c296`'s `definition-avatar-file.ts` swapped in, restored after, `cmp` checked) | `Tests 1 failed \| 16 passed (17)`: the replaced case fails |
| The fix | `Tests 17 passed (17)` |

## AV-02 (`tests/e2e/agent-definitions/definition-avatars-github.e2e.test.ts`, API/E2E's, with its pinned time)

| Code | Result |
| --- | --- |
| Tested code (swapped in, restored after) | `Tests 1 failed \| 1 passed (2)`: AV-02 "new bytes give a new version" |
| The fix | `Tests 2 passed (2)`, 3 runs of 3 |

## Checks

- `pnpm -C autobyteus-server-ts typecheck`: production 0 errors; tests 972 in 299 files (baseline).
- `pnpm -C autobyteus-server-ts test:unit`: `Test Files 1117 passed | 5 skipped (1122)`, `Tests 9309 passed | 9 skipped (9318)`.
- No temp file was left by the avatar tests.

## Not changed

The node's user-file ETag (`user-file-reply.ts`, `"<size>-<floor(mtimeMs)>"`) has the same weakness on every file route.
It is FU-002 in `follow-ups.md`, for the Solution Designer, and is not this ticket's. The avatar address's new `?v=` makes
a new address, so the avatar does not depend on that ETag.
