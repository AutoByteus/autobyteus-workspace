# Delivery Revision Record — beta-release-v1.5.12-beta.2 (autobyteus-389)

The latest `release-deployment-report.md` remains authoritative.

## Revision Index

| Revision ID | Entry Point / Trigger | Prior Result | Current Result | Affected Canonical Artifacts |
| --- | --- | --- | --- | --- |
| DR-001 | Release Requested (Solution Designer, 2026-11-06; the user: "please release a new beta") | N/A | `v1.5.12-beta.2` released: 4/4 workflows, 23/23 assets, Docker `:beta`; Codex waived by the user; guide changes reconciled | `release-deployment-report.md`, `evidence/REL-01-release-smoke.txt`, `RELEASE.md` |

## Revision Entries

### DR-001 — The next beta after v1.5.12-beta.1

- Checks on `e00581d485`:
  - licensing, hygiene and Secret Gate pass;
  - release smoke 10/13: Codex refused by quota and waived ("waive Codex");
  - build-only `42157390815` passed after rerunning macOS Intel x64, an Apple stapling network failure classified `Platform`.
- Tag `v1.5.12-beta.2` on `4500e7278d`; all four workflows passed on their first attempt.
- The record was written late. The session that cut the release ended before it wrote its records; the Solution Designer found the gap and this entry closes it.
- The guide changes the user decided during this release were reconciled with autobyteus-390's (see the report).
- Terminal return: `Delivery Completed` to the Solution Designer.
