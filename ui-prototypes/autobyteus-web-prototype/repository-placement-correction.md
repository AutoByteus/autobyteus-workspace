# Repository Placement Correction

## Status

- Package: `initial-prototype-baseline`
- Requirements revision: `RER-004`
- Correction scope: repository ownership, filesystem placement, active absolute
  paths and validation provenance only
- Observable UI/UX change: **none**
- Approved baseline: `PPA-001` and the user confirmation from `2026-08-22`
  remain authoritative
- Source pin: `8ef282ba77705180d985e7000d801f0e0068cdc1`

## Corrected Ownership

- Owning repository: `/home/autobyteus/workspace/autobyteus-workspace`
- Existing ticket worktree:
  `/home/autobyteus/workspace/.codex/worktrees/initial-prototype-baseline`
- Existing branch: `codex/initial-prototype-baseline`
- Repository-relative path: `ui-prototypes/autobyteus-web-prototype`
- Canonical prototype root:
  `/home/autobyteus/workspace/.codex/worktrees/initial-prototype-baseline/ui-prototypes/autobyteus-web-prototype`
- Nested repository, submodule or gitlink: **none**

## Rejected Prior Placement Provenance

The approved files were previously placed in an external sibling directory and
were mistakenly initialized as a standalone repository. Its local-only commit
`7ab23b60aa6fd85ff7ce62720a2fbc5ea41e01a6`, branch `main` and repository
metadata are rejected as canonical owning history. That repository had no
remote and was never pushed. The prior files were used only as the intact
relocation source.

## Relocation Integrity

- Pre-relocation committed inventory: **1,924 files / 62,207,638 bytes**.
- Exact copy verification before path rewriting: **1,924/1,924** files present
  with matching SHA-256 hashes.
- Excluded transient/unversioned content: standalone `.git`, `node_modules`,
  `.nuxt`, `.output` and the live server log.
- Active root rewrite: **42 files / 1,441 exact replacements**.
- Binary files containing the rejected active root: **0**.
- Canonical package files retaining the rejected active root: **0**.
- Pre-relocation inventory:
  `evidence/repository-placement/pre-relocation-file-inventory.json`.
- Root rewrite record:
  `evidence/repository-placement/path-rewrite-summary.json`.

The active-root rewrite changes path/provenance text only. Retained source
presentation, synthetic fixtures, browser scenarios, screenshot pixels and
approved observable behavior remain unchanged.

An initial relocation recapture made two workspace images render the fixed run
timestamp as `2d` instead of the approved `12h`, because the recapture occurred
two calendar days after approval. The changed bounding box was the same
relative-time label in `VIS-005` and `VIS-006` (323 pixels per image). Final
reference capture now freezes its synthetic clock to
`2026-08-22T16:50:00.000Z`, the original approval-capture interval. This makes
the synthetic time label deterministic and restores the approved reference
pixels without changing the runnable application's behavior.

Because the prototype is now nested inside the owning pnpm workspace, clean
installation uses `pnpm install --ignore-workspace --frozen-lockfile` so its
isolated lockfile remains authoritative. Typecheck now runs `nuxt prepare`
first, removing reliance on a previously generated `.nuxt` directory. These
are repository-operability corrections only.

## Validation Evidence

Corrected-root results:

- clean nested-package install using the isolated frozen lockfile: **pass**
- typecheck after deterministic `nuxt prepare`: **pass**
- lint: **pass**
- prototype tests: **7/7 pass**
- boundary/isolation checks: **13/13 pass**
- retained presentation audit: **369/369 exact**
- interaction discovery audit: **179 files / 925 cases / 17 groups**
- final-package consistency: **73/73 pass**
- production build: **pass**
- final browser references: **15/15**, zero browser errors, zero external
  resources
- approved source/prototype evidence and final-reference images preserving
  their pre-relocation hashes: **808/808**
- final references preserving their approved hashes: **15/15**
- active stale-root files: **0**

The durable validation logs produced from the corrected root are:

- `evidence/repository-placement/correction-validation.txt`
- `evidence/repository-placement/final-reference-recapture.txt`
- `evidence/repository-placement/repository-placement-validation.txt`
- `evidence/repository-placement/stale-path-search.txt`
- `evidence/repository-placement/git-ownership-proof.txt`

The owning-repository commit and final clean-status proof are returned to
Requirements Engineering because a commit cannot authoritatively contain its
own hash.
