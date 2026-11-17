# Delivery / Release / Deployment Report

## Scope

Deliver `codex/follow-ups-of-461-500` (Project Task `autobyteus-500`, follow-ups of 461, deliveries 1 and 2; `task_size` `Large`, `architectural_risk` `High`, route `Reviewed`) into `origin/personal`. **Status (2026-11-17): `Blocked` at the initial integration refresh.** No docs sync, verification, archive or finalization has started.

## Release Decision

- `No release` unless the user asks (RELEASE.md default; the code reviewer's note: a release only on the founder's word). The build-only release run (`pnpm release:test --ref <branch>`) is still required before the merge (RELEASE.md "Build-only release run": FU-023 changes what the web build scans, G-1 changes the release script).

## Initial Delivery Integration Refresh

- Merge base `9695d310c5`; latest `origin/personal` `ff13782f36` (fetched 2026-11-17). The base advanced past two releases, `v1.5.13-beta.8` and `v1.5.13-beta.9`, plus later merges (448 part 1, 483, 458, 514, 515, 508, …).
- **Released migrations (the code reviewer's question):** neither beta.8 nor beta.9 shipped an app-data migration. The registry has the same entries at `v1.5.13-beta.7`, `v1.5.13-beta.8`, `v1.5.13-beta.9` and `origin/personal`, and the registry-order test's `RELEASED` still lists 45 IDs "as released in v1.5.13-beta.7". So `released-migration-order.json` (45 IDs) remains the true released list. The base did change the released `20261111` conversion's code (`run-file-conversion.ts`, `e0b58997f3`, autobyteus-508), which this branch does not touch.
- Local checkpoint commit: `281a09782c` (review documents that were untracked).
- Integration method: `Merge`. Result: **`Blocked`**, 4 conflicts; merge aborted, branch clean at `281a09782c`.

| File | Base side | This branch |
| --- | --- | --- |
| `autobyteus-server-ts/src/restart-resume/restart-notice.ts` (1 hunk) | autobyteus-448 part 1 restart reminder (`8b986307a8`, `d5e9f350cf`, `b78555d7bb`) | `75ee688dad` renames (FU-006, FU-010) |
| `autobyteus-server-ts/src/restart-resume/restart-resumer.ts` (1 hunk) | `8b986307a8` (448) | `75ee688dad` |
| `autobyteus-server-ts/docs/modules/restart_resume.md` (1 hunk) | 448 | 500 |
| `autobyteus-server-ts/tests/e2e/helpers/claude-live-agent-harness.ts` (1 hunk) | `30aec70770` (483), `ea86a9affe` (461 streams baseline) | `6107590026` (FU-011/018), `377e4bd319` (FU-036) |

## Escalation

- Classification: `Local Fix` (integration of the latest base).
- Recommended recipient: the implementation engineer, then the code reviewer's merge review (the reviewer asked for it), then the normal route.
