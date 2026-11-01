# Docs Sync Report — restart-resume (autobyteus-285)

## Scope

- Ticket: `restart-resume`, Project Task `autobyteus-285`. After an update restart, the runs that were mid-turn resume by themselves, each with one notice. `task_size` `Large`, `architectural_risk` `High`, route `Reviewed`.
- Trigger: CRR-004 (test-code review Not Applicable) from the code reviewer, after API-REV-002 Pass.
- Bootstrap base reference: `origin/personal` @ `efd28d5c4a`.
- Integrated base reference used for docs sync: `origin/personal` @ `bea544af1b` (49 commits), merged as `1459807ff9`.
- Post-integration verification reference: `release-deployment-report.md` § Initial Delivery Integration Refresh.

## Why Docs Were Updated

- Summary: the change added `restart_resume.md` and updated `agent_execution.md`, `remote_collaboration.md`, the module index and `docs/design-cases.md`. Delivery checked them against the integrated code and the merged base: the release stamp in `build:full`, the record under `<appDataDir>`, delete-before-resume, at most 3 posts at once, the re-check after restore, and first-input-only admission. They are accurate. No further doc change was needed.
- Why this should live in long-lived project docs: resuming starts paid agent turns without a human, so the rule for which runs resume and when must be findable without the ticket.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/restart_resume.md` | New module doc | Updated (by the change) | Matches `src/restart-resume/*`, `server-runtime.ts`, `write-release-identity.mjs`. Its "Docker in-place update" claim holds on the merged base: the in-place package is copied out of the image built with `build:full` and `pnpm deploy` keeps `dist/` (345's `files` whitelist) |
| `autobyteus-server-ts/docs/modules/agent_execution.md` | Shutdown order; first-input rule | Updated (by the change) | Merged cleanly with 339's and 349's sections |
| `autobyteus-server-ts/docs/modules/remote_collaboration.md` | Shared root resolver; remote children not recorded | Updated (by the change) | 349's prepared-run sentence intact |
| `docs/design-cases.md` | Design case from CRR-002 | Updated (by the change) | — |
| `autobyteus-server-ts/docker/README.md` | Docker update effect on agents | No change | Makes no claim that an update loses mid-turn agents |
| `autobyteus-web/docs/electron_packaging.md`, `settings.md` | Desktop update flow | No change | Install path unchanged (339); the resume is server-side |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/restart_resume.md` | New (change) | Scope, recording, resuming, notice, eligibility | REQ-001..006 |
| `autobyteus-server-ts/docs/modules/agent_execution.md` | Behavior (change) | "Busy runs are recorded first, and resumed after an update"; first-input-only admission | D2, SR-005 |
| `autobyteus-server-ts/docs/modules/remote_collaboration.md` | Behavior (change) | Shared `CollaborationRootResolver` | D5 |
| `docs/design-cases.md` | Design lesson (change) | CRR-002 eligibility race | — |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| What resumes | Update restarts only (stamp differs), busy runs only, root-held runs only; never stopped, archived, deleted, Task-closed or already-messaged runs | requirements DEC-001, REQ-003; SR-005 | `restart_resume.md` |
| Release stamp | `dist/release-identity.json` from the web package version; a server run from `src` never counts as updated | design D1 | `restart_resume.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| Inbound remote root resolution of its own | `CollaborationRootResolver.resolveOrRestore` (shared) | `restart_resume.md`, `remote_collaboration.md` |

## No-Impact Decision

Not applicable (docs updated by the change, checked by delivery).

## Delivery Continuation

- Result: `Pass`
- Next delivery action: verification from evidence, archive, finalization (no release by default).
