# API/E2E Test Progress

- Execution coverage report: `api-e2e-execution-coverage-report.md`
- Planned cases: the coverage investigation's Planned Cases (same case IDs)

| Time | Case ID | Event | Result | Note |
| --- | --- | --- | --- | --- |
| 2026-11-17T18:32:16Z | API-04 | Checkpoint | — | "Before" snapshots saved: `evidence/API-03-dockerhub-tags-before.tsv` (428 tags), `evidence/API-03-beta9-assets-before.tsv` (13 assets) |
| 2026-11-17T18:32:29Z | API-02 | Started | — | Branch pushed at 31dfe3dad0; build-only run 44148955212 dispatched (default variant) |
| 2026-11-17T18:33:15Z | API-08 | Started | — | zh build-only run 44149091734 dispatched |
| 2026-11-17T18:36Z | API-01 | Started | — | Local dry-run probe in /tmp/api520 against beta.8 digests |
| 2026-11-17T18:38Z | API-01 | Completed | Pass | `evidence/API-01-dry-run-shape-probe.log` |
| 2026-11-17T18:40Z | API-02 | Checkpoint | — | Both build legs running (amd64 started 18:32:38, arm64 18:32:41); waiting with background monitor |
| 2026-11-17T18:35:27Z | API-04 | Checkpoint | — | Renamed the snapshots to `evidence/API-04-dockerhub-tags-before.tsv` and `evidence/API-04-beta9-assets-before.tsv` (they belong to API-04) |
| 2026-11-17T18:35:35Z | — | Checkpoint | — | Correction: the times on the API-01 rows and the 18:40Z API-02 checkpoint above were estimated, not read from a clock; API-01 actually ran about 18:33-18:35Z, before the rename row |
| 2026-11-17T18:42:40Z | API-02 | Completed | Pass | Run 44148955212 success, 9m52s; jobs JSON and excerpt in evidence |
| 2026-11-17T18:43Z | API-03 | Started | — | Reading publish-image and package job logs of 44148955212 |
| 2026-11-17T18:44Z | API-03 | Completed | Pass | Dry-run index line present; package jobs used the checked digests, x64/arm64, signed (excerpt API-02-run-44148955212-excerpt.log) |
| 2026-11-17T18:44Z | API-08 | Completed | Pass | zh run 44149091734 success, 7m36s; package jobs skipped |
| 2026-11-17T18:44Z | API-04 | Started | — | After snapshots and diff |
| 2026-11-17T18:47Z | API-04 | Completed | Pass | Only new tag is 1.5.13-beta.9 from the beta.9 release run (18:44:08Z, after our runs ended, other digests); assets identical (API-04-nothing-published.log) |
| 2026-11-17T18:45Z | API-05 | Completed | Pass | API-05-secret-scan.log |
| 2026-11-17T18:46Z | API-07 | Completed | Pass | Free disk: arm64 98 GB, amd64 79/83 GB, package jobs 88 GB |
| 2026-11-17T18:48Z | API-09 | Completed | Pass | All four digests are single-platform manifests of the right arch (API-09-registry-digest-check.log) |
| 2026-11-17T18:50Z | API-06 | Started | — | Building the before/after timing table; beta.9 attempt 2 still running |
| 2026-11-17T18:49Z | API-06 | Completed | Pass | evidence/API-06-timing-table.md (beta.9 attempt 2 still running; final status filled later) |
| 2026-11-17T18:49:50Z | API-10 | Started | — | New case (AC-007): throwaway branch codex/api520-rerun-probe at 384fe90756 (31dfe3dad0 + a step failing arm64 on attempt 1); build-only run 44152041214 dispatched. Next: when attempt 1 completes, `gh run rerun 44152041214 --failed`; then delete the branch and the /tmp/api520/probe-wt worktree |
| 2026-11-17T18:57:35Z | API-10 | Checkpoint | — | Attempt 1 completed: arm64 failed at the probe step, amd64 success, publish-image and packages skipped; `gh run rerun 44152041214 --failed` requested |
| 2026-11-17T19:07:15Z | API-10 | Completed | Pass | Attempt 2: only arm64 reran; publish-image used the attempt-1 amd64 artifact (ID 14358444647); both packages signed. evidence/API-10-rerun-failed-leg.log |
| 2026-11-17T19:09Z | API-10 | Checkpoint | — | Cleanup done: remote and local branch codex/api520-rerun-probe deleted, /tmp/api520/probe-wt removed |
| 2026-11-17T19:11Z | — | Checkpoint | — | All planned cases completed (API-01..API-10 Pass; IMP-01..03 reused). Report, revision record written; /tmp/api520 removed. Next: commit and hand off |
