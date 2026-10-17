# Delivery Revision Record — task-keys-declutter

The latest `docs-sync-report.md`, `handoff-summary.md` and `release-deployment-report.md` remain authoritative.

## Revision Index

| Revision ID | Entry Point / Trigger | Prior Result | Current Result | Affected Canonical Artifacts |
| --- | --- | --- | --- | --- |
| DR-001 | API-REV-001 Pass (direct route) from `/software_engineering_team/api_e2e_engineer` | N/A | Verified, docs synced, finalized (`be52a331a4`); stable `v1.5.5` released (`696e09b374`), **partial**: Android APK upload failed transiently, rerun pending the user's decision; **user check passed** | `docs-sync-report.md`, `handoff-summary.md`, `release-deployment-report.md`, `release-notes.md`, this record; `autobyteus-web/docs/projects.md` |
| DR-002 | The user's "retrigger the android" | DR-001 release Partial (APK missing), user check passed | **Delivery Completed**: Android republished by manual dispatch 39058604688; 17/17 assets | `release-deployment-report.md`, `handoff-summary.md`, this record |

## Revision Entries

### DR-001 — Verify, finalize, stable release v1.5.5

- Delivery round and trigger: first round. API-REV-001 Pass at 97.2%; `task_size=Small`, `architectural_risk=Low`, Direct route.
- Prior authoritative result: N/A
- Integration: current with `origin/personal@aa84fd026c` (0 behind). Delivery reran the full server unit suite: 5,811 passed.
- Docs sync: one stale sentence fixed in `autobyteus-web/docs/projects.md`.
- Verification: sufficient from the evidence. The user's check follows the release, as the Task asks.
- Release decision: **Stable `v1.5.5`**. The user said "stable please" (2026-10-17) and had said in advance that this task needs a stable release. That supersedes the Task's "beta release" wording. Curated `release-notes.md` covers every change since `v1.5.4`.
- Finalization: merge `be52a331a4`; release commit `696e09b374`; tag `v1.5.5`.
- Release: **Partial**. Desktop, iOS and Server Docker succeeded. Android built, but its APK upload failed on a GitHub server error, so the release has 16 of 17 assets (APK missing). The rerun of only the failed job (`gh run rerun 39055669125 --failed`, per `RELEASE.md` Recovery) waits for the user's decision.
- Path hygiene: before the push, three evidence logs with `:` in their names were renamed to `-`.
- User check: **Passed**. The user ran `v1.5.5` and replied "i checked now its working. thanks".
- Terminal return to `/solution_designer`: not yet sent. It follows once Android is complete, or once the user accepts the partial release.

### DR-002 — Android APK republished; Delivery Completed

- Trigger: the user said "retrigger the android".
- Prior result: DR-001. Stable `v1.5.5` was partial (APK missing after a transient GitHub upload error); the user check had passed.
- Action: GitHub refused a rerun of the failed job, so delivery used a manual dispatch of `release-android.yml` for `v1.5.5`, building from the tag with `prerelease=false`.
- Result: run 39058604688 succeeded. `v1.5.5` is Latest with 17/17 assets, and the APK checksum matches.
- Current authoritative result: **`Delivery Completed`**.
- Terminal return to `/solution_designer`: sent after this record's push.
