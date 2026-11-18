# API-07 AC-003 / QR-002: independent RSS measurement (API/E2E engineer)

- Probe: `probes-api-e2e/ac003-measure.mjs` (scenarios `cold`, `staged30-then-big`); runners `run-ac003*.sh`. Raw per-run data: `API-07-node*.json` (sample counts, hash result, cleanup receipt).
- Commit under test: code `077fa6853` (HEAD `bfcd82366` adds documents only). macOS Darwin 25.6, two real built servers (`dist/app.js`, `--data-dir` temp roots, own HOME, launch owner credential), source -> hub directly over loopback, one `startMemorySync` mutation; RSS from `ps -o rss=` of each server process about every 50 ms (40 ms sleep + ps); baseline = RSS 4 s after the files were written and before the mutation; growth = peak RSS during the mutation minus baseline. File = repeated random 64 MiB block + a small trace; imported file SHA-256 compared to the source by stream (every row `identical true`).
- Date: 2026-11-15. Runtimes: Node 22.23.3 (release workflow and Docker image `node:22`), Node 24.15.0 (the Node of Electron 42.0; the app pins Electron 42.11.16, whose Node is a later 24.x; the desktop runs its server through `ELECTRON_RUN_AS_NODE`; installed from npm `node@24.15.0` for this run), Node 26.12.0 (this machine's default, the implementation's runtime).

| Run | Node | File | Source baseline -> peak (growth) MiB | Hub baseline -> peak (growth) MiB | Whole run (s) |
| --- | --- | --- | --- | --- | --- |
| node22-cold-2gib-a | 22 | cold 2048 MiB | 268.4 -> 430.7 (**162.3**) | 268.6 -> 350.4 (**81.8**) | 8.2 |
| node22-cold-2gib-b | 22 | cold 2048 MiB | 268.2 -> 419.1 (**150.9**) | 268.3 -> 372 (**103.8**) | 9.3 |
| node22-cold-2gib-c | 22 | cold 2048 MiB | 267.9 -> 439.4 (**171.5**) | 268.4 -> 349.8 (**81.4**) | 9.3 |
| node22-cold-4gib | 22 | cold 4096 MiB | 264.8 -> 436.6 (**171.8**) | 270.7 -> 372.7 (**102**) | 18.1 |
| node22-staged30-then-2gib-a | 22 | cold 30 MiB staged (control) | 268.3 -> 354.8 (**86.5**) | 267.8 -> 310.6 (**42.8**) | 0.2 |
| node22-staged30-then-2gib-a | 22 | warm 2048 MiB after 30 MiB | 354.8 -> 422.4 (**67.5**) | 328.5 -> 346.2 (**17.7**) | 9.1 |
| node22-staged30-then-2gib-b | 22 | cold 30 MiB staged (control) | 269.1 -> 344.5 (**75.4**) | 268.4 -> 308.7 (**40.3**) | 0.2 |
| node22-staged30-then-2gib-b | 22 | warm 2048 MiB after 30 MiB | 344.5 -> 416.4 (**71.9**) | 320.9 -> 356.8 (**35.9**) | 9.1 |
| node22-staged30-then-4gib | 22 | cold 30 MiB staged (control) | 268.9 -> 360.3 (**91.4**) | 267.9 -> 317.8 (**49.9**) | 0.2 |
| node22-staged30-then-4gib | 22 | warm 4096 MiB after 30 MiB | 360.3 -> 425.6 (**65.4**) | 328.2 -> 348 (**19.9**) | 18.2 |
| node24-cold-2gib-a | 24 | cold 2048 MiB | 355 -> 664.5 (**309.5**) | 356.5 -> 551.7 (**195.2**) | 9.9 |
| node24-cold-2gib-b | 24 | cold 2048 MiB | 354.2 -> 677 (**322.8**) | 354.1 -> 561.9 (**207.8**) | 9.8 |
| node24-cold-2gib-c | 24 | cold 2048 MiB | 361.7 -> 675.2 (**313.5**) | 372 -> 564.7 (**192.6**) | 10.0 |
| node24-cold-4gib-b | 24 | cold 4096 MiB | 356.8 -> 679.8 (**323**) | 355.1 -> 564.7 (**209.6**) | 19.8 |
| node24-cold-4gib-c | 24 | cold 4096 MiB | 355.7 -> 664.6 (**308.9**) | 355.5 -> 549.7 (**194.1**) | 19.4 |
| node24-cold-4gib | 24 | cold 4096 MiB | 372.6 -> 682.8 (**310.2**) | 354.1 -> 624.1 (**270**) | 19.9 |
| node24-cold-8gib-a | 24 | cold 8192 MiB | 353.5 -> 694.8 (**341.3**) | 357.8 -> 555.1 (**197.3**) | 38.7 |
| node24-cold-8gib-b | 24 | cold 8192 MiB | 355.1 -> 718 (**362.9**) | 363.9 -> 567.6 (**203.7**) | 38.7 |
| node24-staged30-then-2gib-a | 24 | cold 30 MiB staged (control) | 372.2 -> 514.5 (**142.3**) | 372.8 -> 452.9 (**80.1**) | 0.2 |
| node24-staged30-then-2gib-a | 24 | warm 2048 MiB after 30 MiB | 514.5 -> 668.6 (**154.2**) | 459.2 -> 567.5 (**108.3**) | 10.3 |
| node24-staged30-then-2gib-b | 24 | cold 30 MiB staged (control) | 354.1 -> 497 (**142.9**) | 370.8 -> 445.8 (**75**) | 0.2 |
| node24-staged30-then-2gib-b | 24 | warm 2048 MiB after 30 MiB | 496.9 -> 664.1 (**167.2**) | 458.4 -> 572.8 (**114.5**) | 9.9 |
| node24-staged30-then-4gib | 24 | cold 30 MiB staged (control) | 373.6 -> 516.9 (**143.3**) | 355.4 -> 437.3 (**81.9**) | 0.2 |
| node24-staged30-then-4gib | 24 | warm 4096 MiB after 30 MiB | 516.9 -> 670.8 (**153.9**) | 443.5 -> 572.7 (**129.2**) | 19.8 |
| node26-cold-2gib-a | 26 | cold 2048 MiB | 296.9 -> 601.3 (**304.4**) | 297.3 -> 465 (**167.6**) | 9.5 |
| node26-cold-2gib-b | 26 | cold 2048 MiB | 297.3 -> 576.6 (**279.3**) | 297.3 -> 486.6 (**189.3**) | 9.4 |
| node26-cold-2gib-c | 26 | cold 2048 MiB | 296.8 -> 569 (**272.3**) | 296.4 -> 486.1 (**189.7**) | 9.4 |
| node26-staged30-then-2gib-a | 26 | cold 30 MiB staged (control) | 298.6 -> 421.3 (**122.8**) | 296.5 -> 367 (**70.5**) | 0.2 |
| node26-staged30-then-2gib-a | 26 | warm 2048 MiB after 30 MiB | 421.3 -> 587.9 (**166.6**) | 372 -> 519.4 (**147.4**) | 9.5 |
| node26-staged30-then-2gib-b | 26 | cold 30 MiB staged (control) | 297.1 -> 419.6 (**122.4**) | 296.1 -> 369.2 (**73.1**) | 0.2 |
| node26-staged30-then-2gib-b | 26 | warm 2048 MiB after 30 MiB | 419.6 -> 593.3 (**173.7**) | 371.2 -> 485 (**113.8**) | 9.4 |
| node26-staged30-then-4gib | 26 | cold 30 MiB staged (control) | 296.9 -> 419.3 (**122.4**) | 296.4 -> 368 (**71.6**) | 0.2 |
| node26-staged30-then-4gib | 26 | warm 4096 MiB after 30 MiB | 419.3 -> 584.8 (**165.5**) | 371.4 -> 477 (**105.5**) | 18.1 |

## Reading (what to look for)

- **Size independence (REQ-002) holds.** Node 24 cold peaks: 2 GiB source 665-677 / hub 552-565; 4 GiB source 665-683 / hub 550-565 (one 4 GiB hub run peaked 624, `node24-cold-4gib`, not repeated in two further runs); 8 GiB source 695-718 / hub 555-568. Growing the file fourfold moves the peak by under 10 % (source) or not at all (hub). Warm: 4 GiB adds the same as 2 GiB on every runtime (Node 22 65 vs 67-72 source; Node 24 154 vs 154-167; Node 26 166 vs 166-174). Nothing allocates in proportion to the file.
- **Warm figure (a transfer after the process already ran one staged transfer): below 200 MiB on every runtime.** Source 65-72 (Node 22), 154-167 (Node 24), 167-174 (Node 26); hub 18-36, 108-129, 106-147.
- **Cold figure (the first transfer of a fresh process, the literal AC-003 setup): runtime-dependent.**
  - Node 22: source 151-172 and hub 81-104. Below 200 MiB.
  - Node 24 (the desktop app's server runtime; installed as 24.15.0, Electron 42.0's Node; the app pins Electron 42.11.16, a later 24.x): source 309-323 (2 GiB), 309-323 (4 GiB), 341-363 (8 GiB); hub 193-208 (2 GiB: 195.2, 207.8, 192.6), 194-210 (4 GiB; one outlier run 270), 197-204 (8 GiB). Source **above 200 MiB**; hub **at the line**.
  - Node 26: source 272-304 (above 200), hub 168-190.
- **First-use cost.** A 30 MiB staged control already adds 75-91 (Node 22), 142-143 (Node 24), 122-123 (Node 26) MiB to the source. A 1 KiB inline-only first sync adds none (round 1, `ac003-round1-250ms-sampling/`). So the cold overshoot is the first staged transfer of a process (first 8 MiB piece buffers, undici connection, hash streams, garbage not yet collected), not a function of file size. It is larger on the newer V8s (Node 24/26) for the same code.
- 250 ms sampling in round 1 (`ac003-round1-250ms-sampling/`) under-sampled the 0.2 s control runs; the series above (about 50 ms) replaces it. Round-1 figures agree with the series (Node 22 cold 2 GiB source 166-182; Node 26 cold 294).
- Verification time inside the commit request, from the whole-run times: 2 GiB runs finish in 8-10 s including hashing both ends and a 2 GiB verification; 8 GiB in 39 s (R-AR-1: far below the 300 s default fetch timeout).
