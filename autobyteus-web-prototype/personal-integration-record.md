# RER-011 Direct Personal Integration Record — Historical Provenance

## Scope And Authority

- Package: `initial-prototype-baseline`
- Requirements revision: `RER-011`
- User authorization: **“directly on the personal branch”**
- Approved UI/UX: cumulative `PPA-001` / `PPA-002`; unchanged
- Approved source pin: `8ef282ba77705180d985e7000d801f0e0068cdc1`; unchanged
- Historical RER-011 repository: `/home/autobyteus/workspace/autobyteus-workspace`
- Canonical branch: `personal`
- Historical RER-011 prototype root:
  `/home/autobyteus/workspace/autobyteus-workspace/autobyteus-web-prototype`
- Observable change: **none**

This record covers Git ancestry synchronization, canonical active locators,
validation, fast-forward promotion, and direct non-force push only. It does not
refresh the pinned source, redesign the UI, add production behavior, or reopen
the user-confirmed review decision.

RER-013 temporarily superseded these workspace-ownership locators with the
independent repository at
`/home/autobyteus/workspace/autobyteus-web-prototype`. RER-015 then restored
the active canonical root to
`/home/autobyteus/workspace/autobyteus-workspace/autobyteus-web-prototype` on
workspace `personal`. The RER-011 details below remain historical capture and
integration provenance.

## Rebase Preservation

The initial fresh fetch confirmed `origin/personal` at
`389748b0b9f0dea051aaed18641de131cf0adbbb`. A required pre-commit refetch then
detected three additional concurrent commits and advanced the final integration
base to `8d6b06b8cf15d1f355be86b02ef233a111998f07`. The original task branch was
seven remote commits behind and six task commits ahead from merge base
`52b4be02ea793f2071fe5a63a94664ab25196433`; the two changed-path sets had zero
intersection. The late remote paths also had zero intersection with the
canonical-locator changes.

The complete six-commit task history was rebased again onto the final fetched
remote head without conflict. Stable patch
IDs for all six commits, the full tracked prototype tree, and the requirements
tree match their pre-rebase values. The fetched remote head is an ancestor of
the rebased candidate. Exact mappings and tree proof are stored in
`evidence/integration/rer-011-rebase-preservation.json`.

## Canonical Locator And Evidence Policy

Active prototype-owned documentation, the runbook, evidence index, correction
reports, validators, and final-reference manifest use the canonical
personal-checkout root. Pre-promotion browser/result/build evidence retains its
task-worktree runtime path only as explicitly historical capture provenance; it
is not an active artifact locator.

All 17 normative final screenshot files retain the SHA-256 values in
`final-reference-screenshots/manifest.json`. The approved PPA-001/PPA-002
interaction and visual evidence is unchanged. The five unrelated sibling
projects under `ui-prototypes/` have the same Git tree IDs as the freshly
fetched remote base.

## Validation

After rebase and before promotion:

- PP-GAP-009 package: **20/20 pass**
- PP-GAP-010 package: **25/25 pass**
- final package: **86/86 pass**
- production build: **pass**
- production HTTP route check: **200**

The complete log is
`evidence/integration/rer-011-final-rebase-prepromotion-validation.txt`.
`corepack pnpm validate:personal-integration` validates ancestry artifacts,
active locators, ordinary Git index modes, sibling-tree preservation, source
pin, final-reference paths/hashes, and the pre-promotion terminal evidence.

The integration is complete only when the live Git proof returned with the
Product Prototyper handoff confirms that the validated task head, local
`personal`, and `origin/personal` are the same commit and both worktrees are
clean. The tracked record intentionally does not embed its own commit hash.
