# Docs Sync Report

## Scope

- Ticket: `backend-port-taken-by-agent-dev-server` (Project Task `autobyteus-restart-reliability-3`)
- Trigger: API/E2E `Pass` (API-REV-001, 95.4%), direct low-risk route (`task_size` Small, `architectural_risk` Low); delivery round DR-001
- Bootstrap base reference: `origin/personal` at `666b881b5`
- Integrated base reference used for docs sync: `origin/personal` at `26fa57697` (two docs-only commits: the autobyteus-277 beta v1.5.12-beta.4 release records, `tickets/done/mobile-experience-redesign/**` only), merged into the ticket branch as `5adead4e9`
- Post-integration verification reference: `evidence/delivery/DEL-01-post-integration-electron.log` (full Electron suite, 60 files passed / 1 skipped, 411 tests passed) and `evidence/delivery/DEL-02-post-integration-serverStore.log` (4/4), both on `5adead4e9`

## Why Docs Were Updated

- Summary: The desktop shell no longer puts `PORT`/`SERVER_PORT` into the embedded backend's environment, and an `ERROR` server now answers health with "Server is not running" while the renderer stops its fallback health poll outside `STARTING`/`RESTARTING`. The packaging doc described the old env list; it also had no statement of the ERROR-state health and polling rule.
- Why this should live in long-lived project docs: Both are standing rules for the desktop shell. The env rule explains why the composer must not add generic names that every spawned agent shell inherits. The ERROR-state rule is how the status, health and store polling agree. Neither is recoverable from the code without reading four files.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result (`Updated`/`No change`/`Needs follow-up`) | Notes |
| --- | --- | --- | --- |
| `autobyteus-web/docs/electron_packaging.md` | Describes the env the desktop composes for the backend, the port-conflict recovery and `ServerStatusManager` | `Updated` | Implementation already removed `PORT`/`SERVER_PORT` from the env list and explained why (lines ~1125-1135). Delivery added the ERROR-state health and polling rule to "Backend port conflict recovery". |
| `DESIGN.md` | Project design rules and design cases | `No change` | No rule it states changed. The lesson ("an environment composed for a long-lived parent is inherited by everything it spawns, so add no generic names such as `PORT`") is a design case; design cases are the Solution Designer's to add (its Recovery), and the packaging doc now carries the rule where the composer is described. |
| `TESTING.md` | Test layers and rules; FU-003 (32 web test files fail) touches how web tests are run | `No change` | It states no Node version. The cause of FU-003 is a Node 25+ built-in `localStorage` global (see FU-003); adding "run web unit tests on Node 22" is a rule change in an API/E2E-owned file and is proposed in FU-003, not made here (project-set rule; not this ticket's area). Nothing it describes changed in this ticket. |
| `RELEASE.md` | Finalization and release rules | `No change` | Followed for finalization. Two stale statements found (branch prefix and main-checkout path) are recorded in the release/deployment report as proposed fixes, not changed here (project-set rule; user agreement needed). |
| `autobyteus-web/README.md`, `docs/isolated-app-instances.md` | Mention `SERVER_PORT` names | `No change` | They name the launcher's own `AUTOBYTEUS_ELECTRON_SERVER_PORT` and the `SERVER_PORT_IN_USE` error code, which this ticket does not touch. |
| `autobyteus-server-ts/docker/starter/starter.mjs` | Reads `AUTOBYTEUS_SERVER_PORT` for Docker nodes | `No change` | A separate Docker path; the embedded desktop backend's env composer is not used there. |
| `DESIGN.md` rule 10 contract C4 (starter -> server package launch) | Lists the environment a server package is started with | `No change` | C4 names `AUTOBYTEUS_STARTER_SOCKET`, not `PORT`; the Docker starter is not affected. |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-web/docs/electron_packaging.md` | Implementation (earlier, IR-001) | Removed `PORT`/`SERVER_PORT` from the Electron-owned env list; added that the server's port travels only as `--port` and why no generic `PORT`/`SERVER_PORT` is set | The composed env no longer has them |
| `autobyteus-web/docs/electron_packaging.md` | Delivery (this round) | Added a paragraph to "Backend port conflict recovery": ERROR is a stopped state; `checkServerHealth()` answers `error` / "Server is not running"; the `serverStore` fallback poller calls health only in `STARTING`/`RESTARTING` and stops once `RUNNING`; entering ERROR clears the stale health text; Restart Server resumes the poll | Records REQ-004's durable behavior where the recovery flow is described |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Backend env carries no generic port names | The embedded backend gets its port only from `--port`. Everything the desktop spawns inherits the backend's environment (agent runtimes, tool shells), so a generic `PORT` would steer an agent's own dev server onto the backend's port. | `design-spec.md`, `investigation-notes.md` (E3, P1-P3), `bug-report.md` | `autobyteus-web/docs/electron_packaging.md` (env composition paragraph) |
| ERROR health and polling | In `ERROR` health says "not running"; the renderer polls only while `STARTING`/`RESTARTING`. | `requirements-doc.md` REQ-004, `design-spec.md` | `autobyteus-web/docs/electron_packaging.md` ("Backend port conflict recovery") |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| `PORT`/`SERVER_PORT` in the backend env and in `verify-packaged-server-startup.mjs` | Nothing; the port travels as `--port` only | `autobyteus-web/docs/electron_packaging.md`, code comments in `serverRuntimeEnv.ts` and the script |
| `port` field of `BuildServerProcessEnvInput` and the caller argument in `BaseServerManager` | Removed (no readers) | Code |
| "Server is not running or still starting" as the ERROR-state health answer | `error` / "Server is not running" | `autobyteus-web/docs/electron_packaging.md` |

## Delivery Continuation

- Result: `Pass`
- Next delivery action: archive the ticket, commit, Secret Gate, push the ticket branch, merge into `personal` through `finalize/<ticket-name>`, push, clean up.
- Notes: Problems found outside this ticket are in `follow-ups.md`: FU-003 now carries its root cause (Node 25+), found during delivery. No other new follow-up.
