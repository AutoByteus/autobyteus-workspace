# Delivery Revision Record — release beta v1.5.14-beta.3 (Task autobyteus-570)

| Revision ID | Trigger | Prior Result | Current Result | Artifacts |
| --- | --- | --- | --- | --- |
| DR-001 | Release Requested by the Solution Designer on the founder's authorization of 2026-11-20 ("If the iOS demo mode is finished we should release", confirmed as a beta that uploads the iOS Demo Mode build to TestFlight, not a submission to Apple App Review) | N/A | Smoke 10 of 13: Grok failed on `ACP_REQUEST_TIMEOUT` (not a usage limit); stopped and reported | `release-deployment-report.md` |
| DR-002 | The founder's decision: "Waive for grok" | DR-001 paused | Grok waived; tagged `v1.5.14-beta.3`; all four workflows green; 27 of 27 assets; iOS uploaded to TestFlight as 1.5.14 (343); released | `release-deployment-report.md`, `release-notes.md` |

- Terminal return: `Sent`.
