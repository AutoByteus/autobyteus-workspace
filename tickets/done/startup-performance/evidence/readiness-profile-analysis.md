# Measured repeat-startup bottleneck — SR-005

Package startup-performance-20260927. Measured 2026-09-27T06:10:24.768Z.

## Method and boundary
Read-only invocation of the installed v1.4.88 readiness classes, using the installed
Electron executable in Node mode. No server startup, migration runner, provider
turn, production restart, or production write was invoked. Script guards file
mutation calls; blocked write attempts: 0. Output writes only
its report to the task evidence file. This is application-level guarding, not an
OS sandbox. Live data was read, not a stopped-writer consistent snapshot.

The earlier interrupted run produced no report. A subsequent completed attempt
could not emit its report because the guard also denied stdout's writeSync.
Corrected only the probe's reporting sink (captured original writeSync to fd1);
imported runtime mutation calls remained denied. The successful run exited0.
No timings from failed/interrupted attempts are claimed.

## Observed phase measurements
| Phase | Elapsed |
| --- | ---: |
| Module import (outside rebuild) | 0.041s |
| Structural package validation | 0.455s |
| Current attachment-reference validation | 24.179s |
| Total readiness rebuild | 24.640s |
| Subsequent same-process awaitReady reuse | 0.0136ms |

Reference phase is 98.13% of this measured rebuild.
1030 structurally valid groups were reference-validated (545 Team,24 Org,461 agent).
Reference-phase instrumented fs/promises reads: 7,158 operations,
6,390,427,013 bytes (6.39GB decimal;
5.95GiB). JSON.parse calls: 1,073,318; measured
parse time 8.986s. Measured asynchronous readFile span sum
9.111s. Instrumented realpath calls16,098,lstat8,049.
Counts represent operations, not necessarily unique files, and JSON.parse calls
include supporting JSON/metadata, not only trace rows. Synchronous filesystem
calls are guarded but not included in fs/promises counters. Do not claim these
are exhaustive I/O totals or add overlapping operation sums into a CPU breakdown.

## Root cause and change origin
server-runtime.ts awaits RootRunPackageReadinessIndex.rebuild before server readiness.
The index performs structural scan, then sequential current-reference validation
for each package. That reads active,rotated and archived traces and typed sidecars.
transformContextFileRecordLocators splits/parses/rejoins JSONL even when the callback
returns exactly the same URI. The validator also checks physical containment and
exact ownership. No conversion is necessary for this work to execute.

Git recovery commit6beda63e6 changed the readiness index from structural package
validation to structural PLUS full typed-reference history validation; saved diff
is recovery-readiness-delta.diff. It also changed admitCurrent from local admission
to await global rebuild. Thus the added cost is connected to the latest attachment
recovery design, not merely an unexplained coincident migration. Earlier versions
already had structural startup scans; we did not benchmark an old executable and
do not claim an exact before/after release regression of24.18s.

This independently reproduces a large pre-readiness cost consistent with the
previous33.846s full installed startup.24.64s is an isolated instrumented class
probe, NOT a new full-app startup measurement. Warm filesystem caches, concurrent
live writes/load and instrumentation may change timing. New-run global rebuild is
source-confirmed, not measured through a live creation operation.

## Separate one-time cost
The old154.845s conversion attempt used363whole-record originals totaling722.23MiB,
multiple full-file transforms/hashes and repeated durable manifest saves. Those
copies preserve historical record bytes, not attachment image copies. This probe
did not time converter subphases; hashing's exact fraction remains unmeasured.
Terminal succeeded/warning migration is skipped, but readiness still scans history.

## Implication, not yet authoritative architecture
Correct the existing migration definition for pending/failed users as requested,
without a new ID or forcing terminal users to replay. Separately remove needless
full-history work from the repeated startup/new-run path while retaining exact
ownership, scoped dependency exclusion and original preservation. Whether current
proof is narrowed or deferred affects validation timing and needs an approved
requirements basis. Do not simply delete validation, trust the migration ledger,
or invent a persistent cache protocol. Existing backups must remain untouched.
No runtime source fix, release, or performance acceptance is claimed.
