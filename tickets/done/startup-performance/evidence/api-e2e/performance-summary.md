# Comparable performance evidence

One sequential instrumented trial per process scenario; baseline before candidate. Same Electron Node24.16.0 runtime, ordinary `startServer`, equivalent owned corpus. Neither isolated-class timing nor hash-only attribution. No universal SLA or cold-cache guarantee.

| Scenario | Baseline seconds | Candidate seconds |
|---|---:|---:|
| Process launch → health (first) | 191.052 | 41.155 |
| Process launch → health (retry) | 179.967 | 38.391 |
| Process launch → health (terminal) | 32.503 | 4.006 |
| Actual createAgentRun API | 36.939 | 1.215 |
| Actual Electron launch → health (terminal corpus) | 30.918 | 8.621 |

## Operation counts
| Candidate case | Transforms | Atomic record writes | Migration hashes | Backup reads/writes | Readiness trace reads |
|---|---:|---:|---:|---|---:|
| first | 7163 | 363 | 0 | 0/0 | 0 |
| retry | 7163 | 181 | 0 | 0/0 | 0 |
| terminal | 0 | 0 | 0 | 0/0 | 0 |

Readiness trace-read delta on actual new-run admission:
- baseline: 6023 calls; 6346303582 bytes.
- candidate: 0 calls; 0 bytes.

Counters observe application fs.promises.readFile and instrumented classes, not all kernel IO. Unit checks additionally verify one transform per unique source and changed-only writes. Structural metadata scans are allowed and remain; zero trace audit does not mean zero IO. Candidate terminal migration execute not called.

Initial retry benchmark is invalid: /var→/private/var fixture rebasing caused released journal reconciliation failure. Corrected lexical-path retry logs/results replace that timing; both corrected attempts completed SUCCEEDED_WITH_WARNINGS. Original evidence retained, not silently discarded. First desktop attempt ended during startup with cause unestablished; clean repeat passed; no source correction made.

Corpus:14,412 memory files/8,052,688,333 bytes, all8missing-tree roots retained, first restores363known old-source files; retry181old/182current plus a later write; terminal unchanged ledger. This is a frozen representative synthetic state built from released data/originals, not a globally atomic live backup: one active trace changed during initial read-only copy. No external writer during owned migrations. Current installed profile never reset/replayed.
