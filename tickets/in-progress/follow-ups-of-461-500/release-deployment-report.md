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

## Second pass (2026-11-17/18)

- Integration: done by the implementation engineer (IR-004 merge `39325a1e50` of `ff13782f36`, IR-005 `eb741a097e`), merge review CRR-007/CRR-008 Pass. `origin/personal` still `ff13782f36`.
- Build-only release run (RELEASE.md, rule 12): `pnpm release:test --ref codex/follow-ups-of-461-500`, run 44191474370: Build macOS ARM64, macOS Intel x64, Linux x64, Linux ARM64, Windows x64 all success; Publish skipped. Pass.
- Post-integration check by delivery: server E2E folder on the merged state (`2dffa26760`, code `eb741a097e`, Node 22): stopped at the 2-hour background limit; 105 files reported, 21 with failures (48 tests), 12 of them not on API/E2E round 1's base-side list. Evidence `evidence/delivery/DEL-01-*`. **Delivery blocked**; routed to API/E2E (`Evidence Too Weak`: validate the merged state, separate branch / base / load).
- Docs sync so far: `RELEASE.md` "Cutting The Release" now describes G-1 (the script records `released-migration-order.json`), replacing the manual step from 461; the data migration guideline's matching sentence (`9314d13f48`). Release notes written (`fa4ac92497`).
- AC-008's user-only part (the migration on the user's own data) is not a finalization blocker: merging runs nothing on his data; it applies when a release carrying it reaches his machine (his decision), with M-5 backups.
