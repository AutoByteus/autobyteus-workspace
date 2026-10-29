# Delivery Revision Record

## Revision Index

| Revision ID | Entry Point / Trigger | Prior Result | Current Result | Affected Canonical Artifacts |
| --- | --- | --- | --- | --- |
| DR-001 | Release Requested: stable `v1.5.10` (the user's request, 2026-10-29) | N/A | Delivery Completed: stable v1.5.10 released (4/4 workflows, 17/17 assets, Latest; Docker 1.5.10/latest/beta) | release-deployment-report.md, release-notes.md; correction section in `tickets/done/web-ui-cleanup-round/release-deployment-report.md` |

## Revision Entries

### DR-001 — Stable release v1.5.10

- Trigger: Release Requested from the Solution Designer (`solution-designer-handoff.md`); no validated package, so the release guide's checks are the verification.
- Prior authoritative result: `N/A`.
- Content: `personal` @ `5562fc73e6`, which is the software of the tested beta `v1.5.10-beta.1` plus one ticket document.
- Also recorded: a correction of the `v1.5.10-beta.1` delivery record (wrong guide revision; no build-only run; runs watched one after another). The outcome was unaffected.
- Current authoritative result: Delivery Completed. Build-only run `40819786999` passed; tag `v1.5.10` on `d38cf5fb46`; 4/4 workflows; 17/17 assets; GitHub Latest; Docker `1.5.10`, `:latest` and `:beta` on one amd64/arm64 image; cleanup done. Details are in the release report's Release Record.
