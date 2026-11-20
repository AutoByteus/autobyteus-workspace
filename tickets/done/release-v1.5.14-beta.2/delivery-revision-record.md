# Delivery Revision Record — release beta v1.5.14-beta.2 (Task autobyteus-563)

| Revision ID | Trigger | Prior Result | Current Result | Artifacts |
| --- | --- | --- | --- | --- |
| DR-001 | Release Requested by the Solution Designer on the founder's authorization of 2026-11-19 ("Let's release a beta version please. Waive for grok is we don't have usage limits for grok"); addendum: waive only a usage-limit failure | N/A | Tagged `v1.5.14-beta.2`; Desktop failed on the Linux builds (production trust variable empty), Android, iOS and Docker succeeded: a partial release | `release-deployment-report.md` |
| DR-002 | The Linux team (Task 564) provisioned the trust; the Solution Designer asked to resume | DR-001 partial | Desktop failed jobs rerun on the same commit and succeeded; all four workflows green; 27 of 27 assets; notes updated; released | `release-deployment-report.md`, `release-notes.md` |

### DR-001 — first attempt
- The first smoke run failed one Grok scenario with `RUN_MODEL_NOT_OFFERED` (not a usage limit); reported to the Solution Designer under the addendum; the founder chose a rerun with a waiver only if the instability recurred. The rerun passed 13 of 13 with Grok pinned to `grok-4.7`: no waiver.
- Tagged at `a728fbcad3`. Both Linux desktop builds failed at "Prepare desktop public trust" (`Production desktop public anchor is not provisioned`): the repository variable `DESKTOP_RELEASE_PUBLIC_KEY` was empty. Classification: ours (configuration), not the platform. No key was created or set by delivery.

### DR-002 — resumed
- After the other team provisioned the trust, `gh run rerun 44685600710 --failed` reran the failed jobs on the same commit (`a728fbcad3`); the Linux builds, the signing job and the publish job succeeded.
- Terminal return: `Sent`.
