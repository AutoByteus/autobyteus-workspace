# Docs Sync Report — project-task-tool-context-files

## Scope

- Ticket: `project-task-tool-context-files` (`create_or_update_task` gains optional additive `context_files`).
- Trigger: CRR-002 Pass from `/software_engineering_team/code_reviewer` (reviewed route, `task_size=Medium`, `architectural_risk=High`).
- Bootstrap base reference: `origin/personal` @ `4a51482a5`.
- Integrated base reference used for docs sync: `origin/personal` @ `a0ded874b0d65f8cda668e440469a0cb6b64126d`, merged into the ticket branch as `a7b57e0cef682c6befe0dc1e2be25a104b2665c3` (after checkpoint `c16eba271`).
- Post-integration verification reference: `delivery-evidence/` (build, tsc, unit, unit-api, e2e-projects ungated and gated logs). All passed.

## Why Docs Were Updated

- Summary: The server module docs (`projects.md`, `agent_tools_mcp_server.md`) were already updated in implementation commit `741b05131` and still match the integrated code. Two docs outside that commit were stale or incomplete. The web Projects doc said "There is no batch or Task attachment mutation tool" and described `create_or_update_task` without `context_files`. TESTING.md did not list the new CTX-E2E cases or the new gated delegation suite.
- Why this should live in long-lived project docs: Agents can now put files into a Task, and the Task page shows those files. Web-side readers need the same contract the server doc gives. Testers need the exact gated command and what each suite does and does not prove.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/projects.md` | Owner of the Task tool contract and context-byte publication | No change | Updated in `741b05131`. Checked against the integrated code: additive semantics, policy, all-or-nothing behaviour, error codes, ad-hoc rejection, `importLocalFiles`, import before DONE. Accurate. |
| `autobyteus-server-ts/docs/modules/agent_tools_mcp_server.md` | MCP tool schema and description | No change | Updated in `741b05131`; accurate. |
| `autobyteus-web/docs/projects.md` | "Agent Tools / Scope Exclusions" section describes the tool from the app's side | Updated | Was stale: it had no `context_files` and said there was no Task attachment tool. |
| `TESTING.md` | Project Task regression commands | Updated | Added the context-file cases and the gated suite command. |
| `autobyteus-server-ts/docs/modules/agent_tools.md`, `agent_communication.md`, `prompt_engineering.md`, `agent_team_execution.md`, `standalone_agent_run_root.md`, `autobyteus-web/docs/chat.md` | They mention `create_or_update_task` | No change | Mentions are about DONE/reactivation and tool exposure only, and no file arguments are described. Still accurate. |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-web/docs/projects.md` | Contract correction | Added a `context_files` paragraph: absolute node-local paths, copied under the Task page upload policy (types by extension, 25 MiB), shown in Context Files like UI uploads and kept after the source is deleted, append-only, all-or-nothing including no DONE closure, refused on Tasks with no Project. Mentions `attachedContextFiles`. Replaced "no Task attachment mutation tool" with "no separate attachment tool; files are never removed through agent tools". | The old wording was now false. |
| `TESTING.md` | New regression entry | New block after the ad-hoc delegation section: the commands for the boundaries suite and the gated `project-task-context-files-delegation.e2e.test.ts`, what CTX-E2E-001/002/003 prove, the fixture `READ_REFERENCE_FILES` route, `TASK_CONTEXT_FILES_E2E_EVIDENCE_DIR`, and that the packaged-app Task page is left to user verification. | Testers could not find the gated suite. |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Agent-attached context files | Copy-at-call, additive, same policy as the UI, all-or-nothing, Project Tasks only | requirements-doc (SR-002), design-spec (SR-003) | `autobyteus-server-ts/docs/modules/projects.md` (in `741b05131`), `autobyteus-web/docs/projects.md` |
| Draft-less import path | `ProjectTaskContextStore.importLocalFiles` feeds the same in-lock commit as UI drafts; import runs before DONE closes runs | design-spec, implementation-handoff | `autobyteus-server-ts/docs/modules/projects.md` (in `741b05131`) |
| Validation layers | Ungated boundaries cases versus the gated live-worker delegation suite | api-e2e-execution-coverage-report | `TESTING.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| "There is no Task attachment mutation tool" (web doc) | `create_or_update_task.context_files` (additive only; no remove tool) | `autobyteus-web/docs/projects.md`, `autobyteus-server-ts/docs/modules/projects.md` |

## Delivery Continuation

- Result: `Pass`
- Next delivery action: Hand off to the user for explicit verification (AC-010 in the app), then finalize.
- Notes: The docs edits are uncommitted in the worktree until finalization. The untracked `autobyteus-application-*/dist/` folders are build output and will not be committed.
