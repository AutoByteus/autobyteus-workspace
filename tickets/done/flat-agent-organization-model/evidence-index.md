# Cumulative evidence and archived paths

The current source-branch result is in `handoff-summary.md`. The complete
6,504-reference lookup index is
`delivery-evidence/dr-010/cumulative-reference-files.txt`; its
`reference-resolution.json` maps original in-progress paths to this archived
folder. Original authority, review and execution files retain their own dates,
results, receipts and path text. A later acceptance does not rewrite them.

## Publication boundary

Canonical reports, acceptance, known issues, selected current summaries and
Delivery verification records are explicitly published with the source branch.
`delivery-evidence/dr-010/publication-allowlist.json` inventories newly selected
files. Already tracked historical evidence remains tracked. Remaining raw
execution snapshots, dumps and archives stay local in this retained worktree
and the restricted backup identified by `preservation-result.json`; they are
not newly bulk-published. A clone therefore does not contain every raw file in
the local cumulative index. Obtain those exact archived files from their owner
when a future investigation requires them; absence in a clone is not a Pass.

Eleven Product references remain in the separately owned prototype repository;
no external authority was copied or rewritten. New clone locations must resolve
the recorded repository prefix to their checkout rather than treating an
absolute path as a portable command.

Do not blindly run retained execution helper scripts: they record historical
ports, fixtures and ownership. A future ticket must establish its own isolated
setup and authorization. Do not reset/replay migration state or touch a live
installation merely to reproduce old evidence. IR049's actual-installation
cutover decision remains separate and Architecture-owned.
