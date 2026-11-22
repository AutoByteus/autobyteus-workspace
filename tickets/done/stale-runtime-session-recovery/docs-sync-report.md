# Docs Sync Report: autobyteus-599 (a lost runtime session is renewed from the work journal)

## Scope

- Ticket: `stale-runtime-session-recovery` (Project Task `autobyteus-599`)
- Trigger: the code reviewer's post-API/E2E test-code review `CRR-003` `Pass`, after API/E2E `API-REV-001` `Pass` (final confidence 95.5%), reviewed route (`task_size` Large, `architectural_risk` High; architecture review `ARCH-REV-001…003`; source review `CRR-001` `Fail` (`Design Impact`, CR-001 and CR-002, answered by SR-003 and DEC-007), `CRR-002` `Pass`; test-code review `CRR-003` `Pass`).
- Bootstrap base reference: `origin/personal` @ `0da6bfbfc1`
- Integrated base reference used for docs sync: `origin/personal` @ `d25b0c6983` (39 commits merged into the branch as `612e426e09`; the reviewer's uncommitted CRR-003 records were committed first as the checkpoint `18a0eebc85`)
- Post-integration verification reference: `release-deployment-report.md`, "Initial Delivery Integration Refresh" (both typechecks, the server build, the whole server unit suite, and the gated built-server E2E families, all run on `612e426e09`)

## Why Docs Were Updated

- Summary: a run whose runtime reports that the run's saved session does not exist now continues at activation in a fresh session of the same runtime and model, through the runtime-switch steps: the earlier records become one closed segment, a lost-session marker starts the new file, and the hand-over notice goes with the input. The recognition is per runtime and exact (Codex, Antigravity, Grok, DeepSeek Harness, Claude), and every composition that runs external-runtime agents (the studio, the application execution scope, the standalone application host) gives a renewal both parts, the switch memory and the notice. A restored Claude run now opens its CLI process at activation, to learn whether the CLI has the session. The implementation updated `GLOSSARY.md`, `agent_execution.md` and `run_history.md`, and the Solution Designer added design Cases 26 and 27. Delivery read every long-lived doc that describes restore, a lost or unknown session, the Claude process's opening, or the platform notices against the final code, and found five more places that now said something untrue.
- Why this should live in long-lived project docs: the rule "an unknown session is terminal" was written in four runtime docs and would send the next maintainer to remove the renewal as a bug; the Claude doc said a restored run opens its process lazily, which is now false and decides where a lost session is seen (at activation, not inside the first turn); and the composition rule (a renewal needs both parts in every composition) is what stops the next composition from renewing without context.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `DESIGN.md`, `docs/design-cases.md` | Project design rules and cases | No change by delivery | Cases 26 (a new kind in a union without its consumers) and 27 (a capability that needs two collaborators wired in only one composition) were added by the Solution Designer and match the final design. No rule added or changed |
| `TESTING.md` | Project testing guideline | No change; proposal | The ticket's tests follow it (gated live suites with a test-owned runtime home and the test vault, negative controls, built-server E2E). One gap, not delivery's document: it says how Codex and Antigravity get a throwaway home but not Claude, whose method this ticket established (`follow-ups.md` FU-003). The base's own change to `TESTING.md` (the demo build note) is unrelated |
| `RELEASE.md` | Project release guide | No change | No release step, check or workflow changed, and no build input changed (no lockfile, `package.json`, `tsconfig`, script, workflow, contract package or generated file in the ticket's diff), so the fresh-start build rule does not apply |
| `GLOSSARY.md` | "Lost runtime session", "Session renewal", "Switch marker" | Checked; already updated by the implementation | The two new entries and the marker entry match `buildSessionRenewal` (key `session_renewal:<runId>:<lost session ID>`, marker text) and `SavedRuntimeSessionMissingError` |
| `autobyteus-server-ts/docs/modules/run_history.md` | The switch steps, the compositions, the notice | Checked; already updated by the implementation | The session-renewal bullet (the steps, the commit `replace_lost_session`, what keeps the error: another failure, a quarantined cleanup, an unconfirmed release, a lifecycle without the port) and the compositions bullet (studio, application execution scope, standalone host) match `standalone-agent-run-lifecycle-service.ts`, `configured-agent-session-renewal.ts`, `application-execution-scope-kernel-builder.ts` and `start-standalone-application-host.ts` |
| `autobyteus-server-ts/docs/modules/agent_execution.md` | The restore rules, the Claude process, the platform notices | Updated | See Docs Updated. The new restore paragraph (the typed error and each runtime's signal) is the implementation's and matches the code |
| `autobyteus-server-ts/docs/modules/codex_integration.md` | Said a resume error "is terminal and never falls back to `thread/start`" | Updated | See Docs Updated |
| `autobyteus-server-ts/docs/modules/grok_build_runtime.md` | Said "an unknown session … is terminal; there is no silent new session" | Updated | See Docs Updated |
| `autobyteus-server-ts/docs/modules/deepseek_harness_runtime.md` | Describes restore | Updated | See Docs Updated |
| `autobyteus-server-ts/docs/modules/antigravity_cli_runtime.md` | Said a mismatched conversation "fails closed" | Updated | See Docs Updated |
| `autobyteus-server-ts/docs/modules/restart_resume.md`, `agent_team_execution.md`, `agent_tools_mcp_server.md`, `tool_list_updates.md` | Mention restore, resume or the platform notices | No change | They describe the restart notice, a member's lazy activation and MCP entries on `session/new`/`session/resume`; none states what happens to a session the runtime lost. Restart resume of a busy run whose session exists still resumes it (LC-02: no renewal) |
| `autobyteus-web/docs/settings.md` | Describes the marker "Agent runtime changed from … to …" for a user's switch | No change | It describes the user's switch and stays true; the renewal line uses the same marker row and presentation (checked in the reopened chat's stream, LC-01), so no web doc or component changed |
| `autobyteus-server-ts/src` comments and `tests/` headers | The code states the same rules | No change | `claude-session-resume-check.ts`, `codex-missing-thread.ts`, `runtime-switch.ts` and `errors.ts` carry doc comments that match the final behavior |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/agent_execution.md` | Reference | The Claude paragraph now says the process opens lazily on the first input of a new run, and a restored run opens it at activation to learn whether the CLI still has the saved session (`ClaudeSession.verifyResumable`). The platform-notice composition sentence now says the studio host and the standalone application host put the hand-over notice first and the application execution scope has it as its only notice | The doc said "lazily on the first input (new or restored run)", which the ticket made untrue; and it named the studio host only |
| `autobyteus-server-ts/docs/modules/codex_integration.md` | Reference | A resume error is terminal for the backend, which never falls back to `thread/start`; the one error the activation owner acts on is `no rollout found for thread id <id>` for exactly the saved thread, which starts a session renewal through the runtime-switch steps | The doc said every resume error is terminal |
| `autobyteus-server-ts/docs/modules/grok_build_runtime.md` | Reference | A load error or an id mismatch is terminal; a session Grok no longer has (the restore request fails with the data code `FS_NOT_FOUND`; a present session whose folder was removed still loads) is renewed in a fresh session with the hand-over notice and a chat line, never silently | The doc said an unknown session is terminal with no new session |
| `autobyteus-server-ts/docs/modules/deepseek_harness_runtime.md` | Reference | A session dsh no longer has (`-32602`, `Invalid params: session is not resumable: <id>`, for exactly the saved session) is a lost session and is renewed | Restore was described without its one recovered failure |
| `autobyteus-server-ts/docs/modules/antigravity_cli_runtime.md` | Reference | The mismatch stays `AGY_CONVERSATION_ID_CONFLICT`; the one mismatch acted on is AGY's stderr warning `conversation "<id>" not found` for the saved ID followed by a new conversation, renewed with the notice | The doc said a mismatched provider ID always fails closed |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Only the runtime's own exact "this session does not exist" answer starts a renewal | A transient or other failure must never cost a working native session; each runtime's signal is pinned from a probe (Claude `No conversation found with session ID: <id>` at initialization, Codex `no rollout found for thread id <id>`, AGY the stderr warning, Grok `FS_NOT_FOUND`, DeepSeek `session is not resumable: <id>`) and a changed wording shows as today's error, never as a wrong recovery | `requirements-doc.md` REQ-002, DEC-002; `investigation-notes.md` PRB-001…009 | `agent_execution.md`, the four runtime docs, `GLOSSARY.md` |
| A renewal is a switch with the same runtime on both sides | Same archive, marker, notice and chat rules; the key holds the lost session ID so a retry finds its own marker and segment | `design-spec.md` DS-001, DS-002 | `run_history.md`, `GLOSSARY.md` |
| Every composition needs both parts | A renewal without the hand-over notice looks like success and gives the user an agent with no memory of the work | `design-spec.md` SR-003 Compositions table | `run_history.md`, `docs/design-cases.md` Case 27 |
| Claude learns of a lost session at activation | A restore opens the CLI process and awaits the SDK's initialization, so the CLI's error result and exit come before any turn exists | `design-spec.md` DS-003 | `agent_execution.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| A restored Claude run's lazy open at its first input | The open at activation (`verifyResumable`) | `agent_execution.md` |
| "A resume or load error, an unknown session or a mismatched conversation is terminal" (Codex, Grok, Antigravity docs) | Terminal except the runtime's own exact not-found answer, which is renewed | the four runtime docs, `agent_execution.md` |
| The member binding payload named for the no-conversation case only, and the application scope and standalone host without the switch memory or the notice | `CollaborationAgentBindingReplacement`, shared by `replace_without_conversation` and the new `replace_lost_session` in all five consumers of the change union; the switch memory and the notice in both compositions | `run_history.md`, `docs/design-cases.md` Cases 26 and 27 |
| `RuntimeSwitch.cause` and `CodexAppServerRpcError.rpcCode` (CR-001, unread fields) | removed | N/A (code only) |

## No-Impact Decision (Use Only If Truly No Docs Changes Are Needed)

Not used: five docs changed in delivery, and three in the implementation.

## Delivery Continuation

- Result: `Pass`
- Next delivery action: handoff summary, release notes, verification record, archive, finalization (`release-deployment-report.md`)
- Notes: follow-ups FU-001 (Claude Code's cleanup period, the Solution Designer's, the founder's decision) and FU-002 (two E2E cleanup races, API/E2E's) were in `follow-ups.md`; delivery added FU-003 (`TESTING.md` lacks the Claude test-home method). The Solution Designer sends them.
