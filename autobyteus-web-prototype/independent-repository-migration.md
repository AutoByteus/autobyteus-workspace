# Independent Repository Ownership Migration — Historical RER-013 Record

## Status And Scope

- Package: `initial-prototype-baseline`
- Requirements revision: `RER-013`
- Canonical repository: `https://github.com/AutoByteus/autobyteus-web-prototype.git`
- Canonical sibling checkout: `/home/autobyteus/workspace/autobyteus-web-prototype`
- Canonical branch: `personal`
- Approved UI/UX: `PPA-001` / `PPA-002`; unchanged
- Approved source pin: `8ef282ba77705180d985e7000d801f0e0068cdc1`; unchanged
- Observable UI/UX change: **none**

**Superseded by RER-015.** This file preserves the independently completed
RER-013 stage and commit `0b02b0e1fbdbdefb78b91b1705bd497663694e0f`
as historical provenance. The active prototype is now ordinary root-level
content at
`/home/autobyteus/workspace/autobyteus-workspace/autobyteus-web-prototype` in
the workspace repository on `personal`. The repository and sibling locators
below are historical RER-013 facts, not active package locators.

This migration separates the long-lived product prototype from the
`autobyteus-workspace` repository. The old workspace-contained project and its
task-worktree copy are prior ownership/capture provenance, not active artifact
locators. No submodule, gitlink, monorepo-history import, source refresh,
redesign, backend, production integration or production write is included.

## Clean-History Provenance

The independent repository was initialized from the complete approved
prototype tree only. Durable provenance is:

- prior workspace integration commit:
  `0100f78d34344d87cf8b6f3627d5df2b50c935d4`;
- approved workspace source commit:
  `8a4c3868c7c54a46991f45be22a68151076412b1`;
- approved prototype Git tree:
  `ca1d3f9ed58f0fc1f673ff013a351841bf78e575`;
- approved tracked inventory: **2,001 files**.

Before any active locator changed, `git write-tree` in the independent checkout
was exactly `ca1d3f9ed58f0fc1f673ff013a351841bf78e575`. The independent history then
records one prototype-focused initial commit. The commit objects from the
workspace integration and pinned source repository are intentionally not
imported; their identifiers are durable provenance text only.

## Identity And Approval Preservation

- Every approved file remains present.
- Every approved binary evidence, asset and final-reference image retains its
  exact Git blob / SHA-256 identity.
- `VIS-001`–`VIS-017` retain their manifest hashes, zero browser errors and zero
  external resources.
- `JRN-050-A`–`JRN-050-E` retain exact route, semantic, Pinia-state, focus and
  source/prototype screenshot contracts.
- The pinned source remains
  `8ef282ba77705180d985e7000d801f0e0068cdc1`.
- The explicit user confirmations **“approved”** (`2026-08-22`) and
  **“done. i checked. thanks”** (`2026-08-24`) remain authoritative.
- Only active root/repository/provenance text, path-sensitive validators and
  ownership evidence differ from the approved tree.

Machine-readable proof is in
`evidence/repository-independence/rer-013-approved-tree-inventory.json` and
`evidence/repository-independence/rer-013-migration-proof.json`.

## Validation And Terminal Ownership

The terminal migration gate requires:

- typecheck and lint;
- the focused prototype tests;
- **13/13** boundary/isolation checks;
- **369/369** retained-presentation checks;
- **20/20** PP-GAP-009, **25/25** PP-GAP-010 and **86/86** final-package
  consistency checks;
- production build and loopback HTTP 200;
- independent repository/root/branch/origin, no nested `.git`, no
  `.gitmodules`, no submodule and no gitlink;
- independent `personal` equal to `origin/personal`, with clean status; and
- removal of the superseded workspace copy only after the independent remote
  is fully verified.

The complete command evidence is
`evidence/repository-independence/rer-013-validation.txt`. The tracked record
intentionally does not embed its own final commit hash; terminal Git ref
equality is live proof returned with the handoff.

## Final Preservation Totals

The validated independent candidate preserves all **2,001/2,001** approved
files. **1,979** remain byte-identical to the approved tree and **22** differ
only for active locator/provenance text, path-sensitive validation, or
new-root-generated evidence metadata. All **848/848** approved binary
assets/evidence—including all 17 normative final screenshots—remain exact.
The final browser recapture completed **17/17**, and the manifest/hash gate
completed **86/86** afterward.
