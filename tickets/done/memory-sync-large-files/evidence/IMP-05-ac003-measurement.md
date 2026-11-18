# IMP-05 AC-003 measurement: a 2 GiB file through two real server processes

- Steps: temporary vitest file (not committed; the same harness as `tests/e2e/memory-sync/memory-sync-large-files.e2e.test.ts` plus a
  250 ms `ps -o rss=` sampler of both server processes and per-request timing in the counting proxy). A file of 32 x the same 64 MiB random
  block (2 GiB) plus a small trace under one source run; one Sync now; imported file hashed by stream and compared.
- Commit: 3a78c3eee (code identical at the time of the runs). Environment: macOS Darwin 25.6, Node v26.12.0, hub and source `dist/app.js`.
- Date: 2026-11-15

| Run | File | Source RSS baseline -> peak (growth) | Hub RSS baseline -> peak (growth) | Hub commit request (verify 2 GiB + rename) | Whole run | Identical |
| --- | --- | --- | --- | --- | --- | --- |
| Cold (first sync of fresh processes) | 2 GiB | 297 -> 561 MiB (264) | 297 -> 488 MiB (191) | 5661 ms | 25673 ms | True |
| Cold | 4 GiB | 297 -> 584 MiB (288) | 293 -> 432 MiB (139) | 12826 ms | 53995 ms | True |
| Control: cold, a 30 MiB staged file | 30 MiB | 297 -> 413 MiB (116) | 297 -> 366 MiB (69) | n/a | n/a | n/a |
| Warm (a 30 MiB staged sync ran first) | 2 GiB | 413 -> 498 MiB (84) | 362 -> 436 MiB (74) | 6258 ms | 43552 ms | True |

Reading: the 4 GiB cold peak equals the 2 GiB cold peak (source 584 vs 561 MiB, hub 432 vs 488 MiB), so transfer memory does not grow
with file size (REQ-002). The cold growth (264 / 191 MiB) includes the one-time cost of the first sync in a fresh process; after a warm-up
sync the 2 GiB transfer adds 84 MiB (source) and 74 MiB (hub), below QR-002's 200 MiB.
The cold source figure (264 MiB) is above 200 MiB: reported, not hidden (see the handoff, Known Risks).
R-AR-1: the hub's verification of a staged 2 GiB file inside the commit request took 5661 ms cold and 6258 ms warm
(12826 ms for 4 GiB), against Node fetch's 300 000 ms default: about 2 % of it, so the 4 GiB per-batch budget (about 12 s) and a
10 GiB file (about 30 s) stay far inside it.
The control row shows the first sync in a fresh process already grows the source by 116 MiB with a 30 MiB file, so about 116 MiB of the cold 2 GiB growth is the first-sync cost, not the transfer.
Raw: `IMP-05-ac003-30mib-cold-control.json`, `IMP-05-ac003-2gib-cold.json`, `IMP-05-ac003-4gib-cold.json`, `IMP-05-ac003-2gib-warm.json`.
