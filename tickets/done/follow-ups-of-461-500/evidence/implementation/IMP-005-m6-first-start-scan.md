# IMP-005: M-6, the first-start byte pass on the founder's data (read-only)

- Script: `IMP-005-m6-first-start-scan.mts`, the migration's own folder listing (`listAttachmentLinkFolders`) and the frozen
  `listContextFileRecordSources`, then `fs.readFile` and the byte pre-check per trace file. Nothing is written; no migration ran.
- Command: `npx tsx IMP-005-m6-first-start-scan.mts ~/.autobyteus/server-data/memory`, twice back to back, from
  `autobyteus-server-ts` at the branch head of 2026-11-17 10:01. Load average 67-72 on 10 cores (other processes).
- Result:
  - pass 1: `{"files":7523,"gb":8.67,"candidates":155,"candidateMb":541,"seconds":13.014}`
  - pass 2: `{"files":7523,"gb":8.67,"candidates":155,"candidateMb":541,"seconds":10.457}`
- Cold: not strictly. `purge` needs sudo, which this session does not have. Pass 1 read data not read in the hours
  before, on a memory-pressured machine; pass 2 is warm. The design's probe: 9.3 s warm.
- Candidates: 155 files / 541 MB (the design's probe: 84 / 390 MB). The marker is `/agent-collaborations/`, broader than
  the design's `"/rest/agent-collaborations/` so that draft and absolute-URL forms are reported as warnings; candidates
  holding only text mentions are parsed and stay unchanged (already current).
