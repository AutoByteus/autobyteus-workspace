# Final artifact navigation

Current canonical package is `tickets/done/context-compaction-simplification-analysis`
on `personal`; final local root is `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo`.
Historical reports/pins retain original absolute paths and stage-time verdicts.
Resolve the old task worktree prefix to this root and the ticket in-progress prefix
to done. Most evidence is byte-identical at the same ticket-relative path.

121 checkout-hostile paths (>200 chars after archive transition) are in
`evidence-long-paths.tar.gz`; `evidence-relocation.json` gives exact member paths,
sizes and SHA256. Do not mass-extract into a Windows checkout. The five short
historical SDK source-before files are explicitly tracked despite dependency
ignore patterns; these are evidence, not live dependencies. Seven ignored
node_modules symlinks are environment setup, preserved only in the safety archive.

Current direct authorities override historical archived snapshots. The API010
cumulative package and API012 resume archive retain their original bytes/hashes;
read them as stage evidence, not current approval. DR004 safety metadata gives
local backup paths for pre-finalization ticket, SDK generated outputs and test
data. No deletion of prior backups/stash, historical logs or unsupported-claim
annotations is part of finalization.
