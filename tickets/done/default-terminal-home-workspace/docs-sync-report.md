# Docs Sync Report

## Scope

- Ticket: `default-terminal-home-workspace`
- Trigger: Delivery-stage docs sync after code review and API/E2E validation passed, including post-validation durable-validation re-review.
- Bootstrap base reference: `origin/personal` at `d86b027eb595` (recorded in investigation notes when the ticket worktree was created).
- Integrated base reference used for docs sync: `origin/personal` at `bfd33cc36f70` after `git fetch origin --prune` on 2026-06-04.
- Post-integration verification reference: ticket branch `codex/default-terminal-home-workspace` at merge commit `7461e9c1351b` plus delivery docs edits in the worktree.

## Why Docs Were Updated

- Summary: The terminal behavior now supports opening the workspace Terminal without an active workspace/root target. In that omitted-cwd mode, the frontend omits `cwd`/`rootPath`, and the backend resolves, canonicalizes, validates, and starts the PTY in the backend server process user's home directory. Explicit cwd/rootPath requests remain validated and rejected before PTY creation when unavailable.
- Why this should live in long-lived project docs: This changes the user-visible default Terminal behavior and the backend WebSocket cwd contract, including remote/container behavior where the effective home belongs to the backend process rather than the browser host.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result (`Updated`/`No change`/`Needs follow-up`) | Notes |
| --- | --- | --- | --- |
| `autobyteus-web/docs/terminal.md` | Primary frontend Terminal behavior and WebSocket contract doc. | `Updated` | The implementation already documented omitted-cwd/server-home behavior; delivery tightened the overview and prompt language so it no longer preserves workspace-only assumptions. |
| `autobyteus-server-ts/docs/modules/terminal.md` | Primary backend Terminal route/lifecycle contract doc. | `Updated` | The implementation docs already record omitted `cwd`/`rootPath` -> `os.homedir()`, pre-PTY validation, and validation expectations. No extra delivery edit was needed after refresh. |
| `autobyteus-server-ts/docs/design/terminal_service_unification.md` | Older design note that still described terminal behavior as workspace-lifecycle based. | `Updated` | Delivery replaced the workspace-only note with the cwd-rooted model and default-home behavior. |
| `autobyteus-web/docs/file_explorer.md` | Related doc for Terminal/File Explorer separation. | `No change` | Existing related-doc note already states Terminal uses cwd/root path and is separate from File Explorer tree/search/watch state. |
| `autobyteus-ts/docs/terminal_tools.md` | Related doc distinguishing agent `run_bash` from interactive server/web Terminal sessions. | `No change` | Existing doc already points readers to `autobyteus-server-ts/docs/modules/terminal.md` for server/web Terminal routing and remains accurate. |
| `README.md` release workflow section | Checked whether this task requires release documentation or versioning changes. | `No change` | Release workflow docs remain accurate; this ticket does not introduce a new release process. |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-web/docs/terminal.md` | Behavior / protocol | Documents explicit workspace/root-path mode plus omitted-cwd backend server-home default; removes workspace-only prompt/overview wording. | Future frontend readers need to know that empty workspace state is valid and that backend home resolution is authoritative. |
| `autobyteus-server-ts/docs/modules/terminal.md` | Backend contract / validation expectations | Documents `/ws/terminal/{sessionId}` omitted query behavior, `os.homedir()` resolution, pre-PTY validation, cleanup guarantees, and durable validation expectations. | Future backend readers need to understand the route contract and keep omitted-cwd validation covered. |
| `autobyteus-server-ts/docs/design/terminal_service_unification.md` | Durable design note | Replaced the older workspace-lifecycle-only note with the cwd-rooted model and File Explorer independence. | Prevents future implementers from assuming Terminal requires workspace materialization. |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Omitted-cwd Terminal default | `/ws/terminal/{sessionId}` with no `cwd` or `rootPath` is a valid default-home request after authorization. | `requirements.md`, `design-spec.md`, `implementation-handoff.md`, `api-e2e-validation-report.md` | `autobyteus-web/docs/terminal.md`, `autobyteus-server-ts/docs/modules/terminal.md`, `autobyteus-server-ts/docs/design/terminal_service_unification.md` |
| Backend authority for home/path validation | Server home is resolved from the backend process (`os.homedir()`), canonicalized, and rejected before PTY creation when unavailable. | `requirements.md`, `design-spec.md`, `api-e2e-validation-report.md` | `autobyteus-server-ts/docs/modules/terminal.md`, `autobyteus-web/docs/terminal.md` |
| Terminal/File Explorer separation | Default-home Terminal startup does not materialize workspace metadata or acquire File Explorer watchers. | `design-spec.md`, `api-e2e-validation-report.md` | `autobyteus-web/docs/terminal.md`, `autobyteus-server-ts/docs/modules/terminal.md`, `autobyteus-server-ts/docs/design/terminal_service_unification.md` |
| Container/server-home caveat | In container/all-in-one deployments, server home may be `/root`; this is expected because the backend process home is authoritative. | `code-review-report.md`, `api-e2e-validation-report.md` | `autobyteus-web/docs/terminal.md`, `autobyteus-server-ts/docs/modules/terminal.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| Workspace-only Terminal startup assumption | Dual mode: explicit workspace/root target, or backend server-home default when no target exists. | `autobyteus-web/docs/terminal.md`, `autobyteus-server-ts/docs/modules/terminal.md`, `autobyteus-server-ts/docs/design/terminal_service_unification.md` |
| Frontend blocking banner for missing workspace/root target | Frontend connects in server-home default mode by omitting cwd/rootPath. | `autobyteus-web/docs/terminal.md` |
| Backend missing-cwd rejection as the only omitted-query behavior | Omitted query resolves to backend `os.homedir()`; explicit invalid/empty values still fail validation. | `autobyteus-server-ts/docs/modules/terminal.md` |

## No-Impact Decision (Use Only If Truly No Docs Changes Are Needed)

- Docs impact: N/A; docs were updated.
- Rationale: N/A.

## Delivery Continuation

- Result: `Pass`
- Next owner: `delivery_engineer`
- Notes: Docs sync completed after integrating latest `origin/personal`. Post-integration targeted frontend and backend terminal checks passed, and tracked `git diff --check` plus temporary-index candidate `git diff --cached --check` after docs sync / handoff artifacts passed. Delivery should now present the handoff and wait for explicit user verification before moving the ticket to `tickets/done/`, pushing, merging into `personal`, or running any release/deployment workflow.

## Blocked Or Escalated Follow-Up (Use Only If Docs Sync Cannot Complete)

- Classification: N/A.
- Recommended recipient: N/A.
- Why docs could not be finalized truthfully: N/A.
