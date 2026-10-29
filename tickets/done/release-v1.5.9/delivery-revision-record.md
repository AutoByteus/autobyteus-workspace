# Delivery Revision Record — release-v1.5.9 (autobyteus-319)

## Revision Index

| Revision ID | Entry Point / Trigger | Prior Result | Current Result | Affected Canonical Artifacts |
| --- | --- | --- | --- | --- |
| DR-001 | Solution Designer `Release Requested`: stable `v1.5.9` from `origin/personal` | N/A | `v1.5.9` released: Latest, 17/17 assets, 4/4 workflows, Docker `:1.5.9`/`:latest`/`:beta` | `release-notes.md`, `release-deployment-report.md`, `.gitleaks.toml` |

## Revision Entries

### DR-001 — Stable release v1.5.9

- Delivery round and trigger: round 1. The Solution Designer's `Release Requested` (`handoff-release-requested.md`), 2026-10-28.
- Prior authoritative result: N/A
- Current authoritative result: `v1.5.9` (`bd91eeebb6`) is published as GitHub Latest with 17 of 17 assets. Desktop, Docker, Android and iOS all succeeded. Docker `:1.5.9`, `:latest` and `:beta` point to one amd64/arm64 image.
- Release/publication/deployment report: `release-deployment-report.md`
- Release notes: `release-notes.md` (curated, with the Task's rollback warnings), copied into `.github/release-notes/release-notes.md` by the release script.
- Verification (the release guide's checks):
  - the Secret Gate, which blocked once on a synthetic AWS-shaped test fixture; I added an exact-value, AWS-rule-only allowlist entry (`c7d523adb4`), and the gate then passed over `v1.5.8..HEAD`;
  - the licensing and hygiene checks;
  - the Android versionCode check;
  - build-only run `40680505735`: 5/5 desktop builds.
- Terminal return to the Solution Designer: `Sent` (`Delivery Completed`).
- Why recorded: first delivery result for this release request.
- Next recipient/action: Solution Designer, for the receipt.
- Remaining items:
  - none for this release;
  - one guide proposal from autobyteus-294 (a local Docker build before tagging when the server inputs change) still awaits the user's answer.
