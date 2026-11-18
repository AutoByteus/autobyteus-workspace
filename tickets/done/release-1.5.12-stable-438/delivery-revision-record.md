# Delivery Revision Record — release-1.5.12-stable-438 (autobyteus-438)

## Revision Index

| Revision ID | Entry Point / Trigger | Prior Result | Current Result | Affected Canonical Artifacts |
| --- | --- | --- | --- | --- |
| DR-001 | Release Requested (Solution Designer): stable v1.5.12 from v1.5.12-beta.11 | N/A | Delivery Completed: stable `v1.5.12` published (4/4 workflows, 23/23 assets, Latest, Docker `:latest`) | `release-notes.md`, `release-deployment-report.md` |

## Revision Entries

### DR-001 — Stable v1.5.12 from the beta.11 content

- Trigger: `handoff-release-requested.md`.
- Settled with the user: smoke check waiver for Codex and Grok on token limits ("Waive for token limit"); the curated notes; the 447 judgement (sufficient, with the residual risk); 441 and 430 stated in the notes; Docker `:latest` moves; no license change.
- Finalization: merged `fd5cab4406`; release commit `8338f97e59`; annotated tag `v1.5.12`.
- Release, rollout and cleanup: recorded in `release-deployment-report.md`.
- Next recipient/action: the Solution Designer (terminal receipt).
- Outcome: the tag `v1.5.12` on `8338f97e59`. GitHub's incident against anonymous release downloads failed Android (attempts 1–8) and Desktop (attempts 1–3); reruns of the failed jobs only, at the user's request and then automatically while the failure stayed that download class; all four workflows succeeded. Three release-process follow-ups are recorded.
- Terminal return to the Solution Designer: `Sent` after cleanup.
