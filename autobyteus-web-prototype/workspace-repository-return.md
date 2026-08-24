# Workspace Repository Ownership Return — RER-015

## Status And Scope

- Package: initial-prototype-baseline
- Requirements revision: RER-015
- Canonical root: /home/autobyteus/workspace/autobyteus-workspace/autobyteus-web-prototype
- Owning repository: /home/autobyteus/workspace/autobyteus-workspace
- Owning branch: personal
- Approved UI/UX: PPA-001 and PPA-002; unchanged
- Approved source pin: 8ef282ba77705180d985e7000d801f0e0068cdc1; unchanged
- Observable UI/UX change: none

RER-015 implements the user's latest ownership choice: the accepted prototype
is again ordinary root-level project content in autobyteus-workspace. It is not
inside the production frontend directory, a nested repository, a pnpm workspace
package, a submodule or a gitlink. The five unrelated ui-prototypes projects
remain unchanged.

## Historical Provenance

The protected migration source was the independent personal branch at commit
0b02b0e1fbdbdefb78b91b1705bd497663694e0f. Its complete 2,006-file Git tree was
materialized without standalone .git metadata before any active locator was
updated. The earlier approved workspace tree remains
ca1d3f9ed58f0fc1f673ff013a351841bf78e575 with 2,001 approved files.

The RER-013 repository and sibling checkout are historical provenance only.
The independent GitHub repository is not deleted, rewritten or force-pushed.
The redundant local sibling checkout is removed only after the workspace
personal branch is committed, pushed, remotely equal, validated and clean.

## Identity And Authorized Differences

All 2,001 approved files remain present. All 848 approved binary evidence and
assets, including VIS-001 through VIS-017, retain exact identity. JRN-050-A
through JRN-050-E, PPA-001/PPA-002, both user confirmations and the pinned
source remain exact.

The only approved-tree differences are the 18 active locator, provenance or
path-sensitive validation files enumerated in
evidence/workspace-ownership/rer-015-return-proof.json. The five RER-013
historical artifacts remain present, and RER-015 adds only this record, the
workspace ownership validator, its machine-readable proof and terminal
validation log.

## Validation

The terminal RER-015 gate covers:

- 20/20 PP-GAP-009 package consistency;
- 25/25 PP-GAP-010 package consistency;
- 86/86 final-package consistency;
- typecheck, lint and 2 files / 8 focused tests;
- 13/13 production-boundary isolation checks;
- 369/369 retained presentation matches;
- production build and loopback HTTP 200;
- clean browser capture of VIS-001 through VIS-017 with unchanged hashes;
- ordinary workspace Git ownership, modes, history, source/sibling isolation,
  local/remote personal equality and redundant-sibling removal.

Command evidence is stored at
evidence/workspace-ownership/rer-015-validation.txt. Machine-readable identity,
hash, path, tree and validation proof is stored at
evidence/workspace-ownership/rer-015-return-proof.json. The record intentionally
does not embed its own final workspace commit; live local/remote ref equality is
the terminal commit and push proof.
