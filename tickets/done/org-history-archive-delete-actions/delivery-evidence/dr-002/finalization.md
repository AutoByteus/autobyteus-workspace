# DR-002 Repository Finalization Evidence

Recorded: 2026-09-21 (Europe/Berlin)

- User acceptance: “its working. lets finalize and release a new version”.
- Refreshed target before finalization:
  `origin/personal@8db5101f413a88216b90d55ec563e3b5f80b1c9b`; no target-only commit.
- Accepted ticket commit and original remote ticket ref:
  `5d6031a6e6cab10691d8a29846e0530dde520a33`.
- Non-fast-forward target merge:
  `81039433fd3c208e4ed091a4b8966a8d8a0ac772`.
  - first parent: `8db5101f413a88216b90d55ec563e3b5f80b1c9b`
  - second parent: `5d6031a6e6cab10691d8a29846e0530dde520a33`
  - merge tree: exact accepted ticket tree
- Artifact-hygiene script: Pass; 31,442 tracked paths, threshold 200, maximum
  path length 199.
- Final release head after DR-003:
  `origin/personal@8af2ec935028f9fe7bc912b6bd2b9552c625c253`.
- Cleanup: dedicated task worktree removed; local and remote ticket branches
  deleted; worktree metadata pruned.

## Unrelated-state preservation

Archive directory:
`/Users/normy/.codex/delivery-archives/ORG-HISTORY-ARCHIVE-DELETE-v1.4.72-20260921T143627Z`.

- `unrelated-main-worktree-state.tar.gz` SHA-256:
  `0665053561128eab0d95b9a895b857bf4a723eced8c92efebcd5444fb5b48de4`.
- Restored `package.json` SHA-256:
  `724eb4a7e004688184c596a4f38139cce9b6c71ab63a40d274a194dfcfd72e92`.
- The archived checksum manifest passed for all restored untracked files.
- Exact restored inventories:
  - `.article-work`: 17 files, 1,146,227 bytes
  - `applications/brief-studio/dist`: 22 files, 187,412 bytes
  - `applications/socratic-math-teacher/dist`: 19 files, 209,798 bytes
  - `autobyteus-application-backend-sdk/dist`: 12 files, 15,569 bytes
  - `autobyteus-application-sdk-contracts/dist`: 52 files, 126,014 bytes

These paths are unrelated owner state and were deliberately excluded from all
feature, finalization, and release commits.
