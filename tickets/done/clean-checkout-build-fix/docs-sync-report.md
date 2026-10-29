# Docs Sync Report

## Scope

- Ticket: `clean-checkout-build-fix` (autobyteus-282), URGENT. `Medium` / `Low`, direct route (architecture, source and test-code review `N/A — not applicable`).
- Trigger: DR-001, API/E2E's handoff (API-REV-001, Pass, 95.5%)
- Bootstrap and integrated base: `origin/personal` @ `1c9edce551`. The branch was current: 0 commits behind at delivery start and again before the merge.
- Post-integration verification reference: API-02..API-09 in a fresh clone of `828c88b2a2`. The tree is the delivered one, apart from ticket documents and this docs edit.

## Why Docs Were Updated

- Summary: autobyteus-280 moved frozen memory modules under `frozen/autobyteus-ts/memory/`, which the server's bare `memory` ignore rule hid from git. A clean checkout of `personal` could not build. This ticket tracks the files, anchors the rule to `/memory/`, and adds a tracked-imports check. The implementation documented the check in `TESTING.md` and in `RELEASE.md`'s Workflow Reference, and the copy-and-prune method in the data migration guideline. Delivery added the check to `RELEASE.md`'s list of what the pre-tag hygiene check rejects, which delivery reads before tagging.
- Why this should live in long-lived project docs: it is a release-time check, and the failure it catches is invisible in a worktree.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `TESTING.md` | Tracked imports rule and test | No change (implementation's text is accurate) | Names `tests/architecture/tracked-imports.test.ts` and `--only tracked-imports` |
| `RELEASE.md`, Workflow Reference | Hygiene script description | No change (implementation updated it) | — |
| `RELEASE.md`, Checks Before Tagging | The list of what the hygiene check rejects | **Updated** | The list lacked the new group |
| `autobyteus-server-ts/docs/design/data_migration_guideline.md` | Copy the files whole, then prune with `scripts/prune-frozen-layer.mjs` | No change | Matches the restored files |
| `autobyteus-server-ts/.gitignore` (config, not a doc) | `/memory/` comment | No change | — |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `RELEASE.md` | Correction | "Checks Before Tagging" now lists tracked code that imports a file git does not track, and why a worktree hides it | The guide's list is what delivery checks before tagging |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source | Target |
| --- | --- | --- | --- |
| Ignored source files | A worktree can build with files git does not track. Only a clean checkout or the tracked-imports check shows it | investigation notes; API-02/05 | `TESTING.md`, `RELEASE.md` |

## Removed / Replaced Components Recorded

| Old | Replacement | Where Documented |
| --- | --- | --- |
| Bare `memory` rule (with `!/tests/e2e/memory/` exceptions) in `autobyteus-server-ts/.gitignore` | `/memory/` (root runtime data only) | `.gitignore` comment |

## Delivery Continuation

- Result: `Pass`
