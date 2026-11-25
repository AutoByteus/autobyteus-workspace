# Docs Sync Report — idle-run-discovery-638 (autobyteus-638)

## Scope

- Ticket: `idle-run-discovery-638` (autobyteus-638), `task_size: Medium`, `architectural_risk: High`, route `Reviewed` (architecture review ARCH-REV-001 Fail, ARCH-REV-002 Pass; source review CRR-001 Pass 9.5/10; API/E2E API-REV-001 Pass 95%; test-code review CRR-002 Pass).
- Trigger: the code reviewer's CRR-002 Pass (test-code review after API/E2E), which delivers the package.
- Bootstrap base reference: `origin/personal` @ `c1147c8917`.
- Integrated base reference used for docs sync: `origin/personal` @ `5c0db3a801` (48 commits: phone video, file viewer word wrap, byte-range file serving), merged into the ticket branch as `22dce6a27e` with no conflicts and no file changed by both sides. Delivery docs edits started only after this merge.
- Post-integration verification reference: `22dce6a27e`; see `release-deployment-report.md` § Initial Delivery Integration Refresh and `evidence/DEL-post-integration/`.

## Why Docs Were Updated

- Summary: every Agent and Team run a person started that was running at a stop (an update, Restart server, `docker stop`/start, a crash) is brought back running, idle, with its conversation and without any input. A transient record `<appDataDir>/restart-resume/running-runs.json` (one writer, `RunningRunRecorder`, rewritten every 2 s and at a graceful stop) feeds `RunningRunRestorer`, which works through the runs after the update wake, three at a time, and keeps the runs it has not handled in the record. Orgs, delegated runs and runs unloaded before the stop are not brought back.
- Why this should live in long-lived project docs: `restart_resume.md` is where the next change to startup, the update wake or the restart reminder reads how runs come back; the collaboration model's glossary defines "running agent" and must say that a restart does not end it.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `DESIGN.md` | Project design rules | No change | The ticket follows the rules (one writer of the record, visible failure, no new fallbacks) and adds none. |
| `TESTING.md` | New gated suites; a real-runtime restart | No change | It keeps no per-suite descriptions; the gates are in `restart_resume.md`. No build input changed (no fresh-start build needed). |
| `RELEASE.md` | Finalization and release rules | No change | Followed as written. |
| `GLOSSARY.md` | Terms | No change | "Restart reminder" is unchanged; "running agent" lives in `collaboration_model.md` § 1. |
| `autobyteus-server-ts/docs/design/collaboration_model.md` | § 1 "Running agent" | No change by delivery (already updated) | Verified: "A restart doesn't end the running of a run a person started … its Agent run's agent, or its Team's coordinator, is running again, idle, after the node starts". |
| `autobyteus-server-ts/docs/modules/restart_resume.md` | The owner of restart behavior | Updated | The implementation's "Running runs come back" section (which runs, the record, the restore, logging) and the source map, boot order and tests verified against `running-run-record.ts`, `running-run-recorder.ts`, `running-run-restorer.ts` and the E2E receipts. Delivery: the Tests bullet now also names the stop/kill in the middle of the restore, the gated external-runtime and Docker-node suites with their gates, and RR-01's added check. |
| `autobyteus-server-ts/docs/modules/agent_tools.md`, `agent_communication.md`, `remote_collaboration.md` | `list_running_agents` and "not running" refusals | No change | They describe a run as running while it is live; they do not say a restart unloads it. Searched for "unload", "stays stopped" and restart statements: none made false. |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `collaboration_model.md`, `restart_resume.md` | Update (code commit) | § 1 "Running agent"; the section "Running runs come back", the source map, the boot order | The ticket's behavior |
| `restart_resume.md` | Update (delivery) | The Tests bullet | The suites API/E2E added after the code commit |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Running runs come back | Which runs; the record and its one writer; the restore after the update wake, three at a time; a stop or crash during the restore keeps the unhandled runs; a failed run is logged and not retried | `design-spec.md` DS-001, DS-002, `requirements-doc.md` DEC-002 … DEC-005 | `restart_resume.md` |
| What a restart means for "running" | A restart does not end a person's run | `requirements-doc.md` | `collaboration_model.md` § 1 |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| "After a restart an idle run stays unloaded until its person opens or messages it" | The run comes back running, idle | `restart_resume.md`, `collaboration_model.md` § 1 |

## Delivery Continuation

- Result: `Pass`
- Next delivery action: verify from the evidence (done: `release-deployment-report.md` § Verification), commit, archive, finalize.
- Notes: no out-of-scope doc problem found; `follow-ups.md` keeps FU-001 and FU-002.
