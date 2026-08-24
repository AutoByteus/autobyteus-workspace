# Repository Placement Correction

## Status

- Package: `initial-prototype-baseline`
- Current requirements revision: `RER-007`
- Correction scope: repository-root placement, active path/provenance references,
  validation evidence, commit and push only
- Observable UI/UX change: **none**
- Approved baseline: `PPA-001` and the user's confirmation from `2026-08-22`
  remain authoritative
- Source pin: `8ef282ba77705180d985e7000d801f0e0068cdc1`

## Canonical Ownership

- Owning repository: `/home/autobyteus/workspace/autobyteus-workspace`
- Owning branch: `personal`
- Repository-relative project root: `autobyteus-web-prototype`
- Canonical absolute project root:
  `/home/autobyteus/workspace/autobyteus-workspace/autobyteus-web-prototype`
- Nested repository, submodule or gitlink: **none**
- Prior nested project path: **absent**
- The shared `ui-prototypes/` directory remains present because it contains five
  unrelated projects.

## Placement History And Provenance

The approved files were first placed in an external sibling directory and
mistakenly initialized as a standalone repository. Its local-only commit
`7ab23b60aa6fd85ff7ce62720a2fbc5ea41e01a6`, branch `main`, and repository
metadata are rejected as canonical owning history. That repository had no
remote, was never pushed, and no longer exists.

RER-004 then imported the intact package as ordinary content on the ticket
worktree branch of the owning repository. That intermediate nested placement
was valid repository content, but the user later clarified that this complete
prototype is a separate project that belongs at the owning repository root.
RER-007 supersedes only the intermediate filesystem locator and explicitly
authorizes a direct `personal` commit and push. It does not supersede the
approved UI/UX, parity evidence, or source pin.

## RER-007 Move Integrity

- Owning baseline before the move:
  `c5b87df4d6db15969ba70adee9dfd8394b1e7385`; local `personal` and
  `origin/personal` matched before work began.
- Pre-move approved inventory: **1,934 tracked files / 62,693,029 bytes**.
- All **1,934/1,934** approved files remain present after the move.
- Approved source/prototype evidence and final-reference image hashes:
  **808/808 preserved**.
- Normative final references: **15/15 preserved byte-for-byte**.
- Active path/provenance references were rewritten to the canonical root.
- Canonical package and requirements artifacts retaining an old project root:
  **0**.
- The old nested project directory is absent.
- The project is represented by ordinary file/symlink index modes only; no
  nested `.git`, submodule or gitlink is present.
- The five unrelated sibling project Git trees are unchanged:
  `memory-inspector-ux-redesign`, `memory-sync-transparency`,
  `mobile-pwa-navigation`, `taskagent-team-tab-active-tasks`, and
  `token-statistics-task-cost`.

The active-root rewrite changes path/provenance text only. Retained source
presentation, synthetic fixtures, browser scenarios, screenshot pixels and
approved observable behavior remain unchanged.

The deterministic final-reference clock remains
`2026-08-22T16:50:00.000Z`. It preserves the approved illustrative relative-time
labels in `VIS-005` and `VIS-006` without changing normal runtime behavior.

Because the project is a child of the owning pnpm workspace, clean installation
uses `pnpm install --ignore-workspace --frozen-lockfile`; the project lockfile
remains authoritative.

## RER-007 Validation

Validation from the canonical repository-root project:

- clean install using the isolated frozen lockfile: **pass**
- typecheck after deterministic `nuxt prepare`: **pass**
- lint: **pass**
- prototype tests: **7/7 pass**
- boundary/isolation checks: **13/13 pass**
- retained presentation audit: **369/369 exact**
- interaction discovery audit: **179 files / 925 cases / 17 groups**
- final-package consistency: **73/73 pass**
- production build: **pass**
- final browser references: **15/15**, zero browser errors, zero external
  resources, and exact approved image hashes
- repository placement/index/hash/sibling checks: **40/40 pass**
- active stale-root matches: **0**
- observable UI/UX change: **none**

The retained-presentation and interaction-discovery audits now read source
bytes directly from the immutable pinned Git object rather than from the later
moving ticket-worktree checkout. This preserves the accepted 369/369 and
179-file/925-case evidence boundary without refreshing the prototype.

Durable RER-007 evidence:

- `evidence/repository-placement/rer-007-pre-move-file-inventory.json`
- `evidence/repository-placement/rer-007-sibling-tree-baseline.json`
- `evidence/repository-placement/rer-007-validation.txt`
- `evidence/repository-placement/rer-007-final-reference-capture.txt`
- `evidence/repository-placement/rer-007-repository-placement-validation.txt`
- `evidence/repository-placement/rer-007-proof.json`

Earlier RER-004 logs remain as explicitly historical evidence. The final owning
commit, push, remote-equality and clean-status proof is returned to Requirements
Engineering because a commit cannot authoritatively contain its own hash.
