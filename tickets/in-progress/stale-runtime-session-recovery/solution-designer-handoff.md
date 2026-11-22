# Solution Designer Handoff — autobyteus-599 (stale-runtime-session-recovery)

- From: Solution Designer (`solution_designer_703182187282472484b90793eac8be40`), 2026-11-22
- Classification: `Architecture Design Complete`, `task_size = Large`, `architectural_risk = High`
- Solution revision: SR-001
- Approval: requirements approved by the Solution Designer within the direction; the founder was informed in this conversation on 2026-11-22. No design approval is required.

## Original request

Project Task `autobyteus-599` (Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`), from `/project_task_manager`, based on the founder's screenshot.

An older Team member (Claude Agent SDK) cannot continue: every message fails with `CLAUDE_PROCESS_EXITED: Claude Code returned an error result: No conversation found with session ID: …`. The Task asks to:
- investigate why the session was missing, and whether Codex, Antigravity and Grok have the same failure;
- design a clean recovery: a fresh session plus the work-journal hand-over notice, as a runtime switch does;
- verify with unit and E2E tests;
- merge, clean up and record.

Constraints: `DESIGN.md`, `TESTING.md`; private data read-only; synthetic fixtures; no release without his word.

## Findings (investigation-notes.md, probes/README.md)

- **Root cause (measured):** Claude Code's default 30-day session cleanup. The run was idle for 36 days; no Claude session file on the Mac is older than about 30 days.
- **Every external runtime has the dead end**, each with its own exact signal (reproduced with random IDs, no model call):

  | Probe | Runtime | Signal |
  | --- | --- | --- |
  | PRB-002 / PRB-007 | Claude | Error result and SDK initialization rejection before any input |
  | PRB-003 | Codex | `no rollout found for thread id` |
  | PRB-004 | Antigravity | stderr `not found` plus a new conversation, then `AGY_CONVERSATION_ID_CONFLICT` |
  | PRB-005 | Grok | `FS_NOT_FOUND` |
  | PRB-008 | DeepSeek | `session is not resumable: <id>` |

## Design summary (design-spec.md)

1. **Recognition:** each backend throws one typed error, `SavedRuntimeSessionMissingError`, from its platform restore, only on its exact signal.
2. **Claude** checks at activation: the restore preparation opens the process and awaits the SDK's initialization (PRB-007).
3. **Recovery:** both activation owners catch the typed error and run their existing runtime-switch steps with a renewal-built `RuntimeSwitch`:
   - the owners are the standalone lifecycle and the member handle with its planner;
   - `cause: "lost_session"`;
   - key `session_renewal:<runId>:<lostId>`;
   - the marker line is "The saved <runtime> session of this run was no longer available, so a new session continues from the work journal."
   The steps archive the records, write the marker, start a fresh session and commit the new ID (members: a compare-and-set `replace_lost_session`). The hand-over notice is then derived from the marker as today.
4. **Deliberate deviation D-1:** the stored boundary type stays `runtime_switch`; the glossary defines the shared meaning. Please judge it.
5. **Persisted data:** `Not Affected` (existing shapes on a new trigger).

## Points for review

- **D-1:** the vocabulary of `runtime_switch` and `RuntimeSwitch.cause`.
- **The Claude eager open on restore (RSK-003):** includes restart-resume.
- **Exactness of each recognition (REQ-002, AC-003).**
- **File size:** `configured-agent-execution-handle.ts` is already 529 lines. The design puts the branch in its own small file.

## Workspace

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/stale-runtime-session-recovery-599`
- Branch: `codex/stale-runtime-session-recovery-599`
- Base: `origin/personal` @ `0da6bfbfc1`
- Dependencies are installed.
- Ticket folder: `tickets/in-progress/stale-runtime-session-recovery/` (uncommitted)

## Documents

- `requirements-doc.md`
- `investigation-notes.md`
- `design-spec.md`
- `solution-revision-record.md`
- `follow-ups.md` (FU-001)
- `probes/`

## Routing record

- `get_handoff_rules`: the rule for Large or High sends to `/architecture_reviewer`.
- Sent 2026-11-22 to `/architecture_reviewer` (run `architecture_reviewer_e15cabc91ecb45a3a979819d39435d9f`): DELIVERED, with this file and the ticket documents attached.

## Round 2 (SR-002), 2026-11-22: response to ARCH-REV-001

- **AR-001, resolved in design:**
  - `replace_lost_session` carries `replacement: { binding, expectedPreviousPlatformAgentRunId }`, the same payload as `replace_without_conversation`;
  - each of the five consumers has its decision, in the design spec's Change Scope table;
  - the shared compare-and-set gets neutral code names;
  - the Team and Org files are added to the mapping;
  - AC-005 is verified through the real Team and Org roots, with delegated copies through the standalone lifecycle.
- **AR-002, resolved in design:** the staged member activation, its wrapper, and its tests and doubles are in the removal plan, with caller evidence.
- **N-1:** a probe in implementation on an isolated home; the result is pinned either way.
- **N-2, N-4:** the narratives are corrected.
- **Design case:** Case 26 added to `docs/design-cases.md`.
- Sent to `/architecture_reviewer` for round 2.
- 2026-11-22: ARCH-REV-002 **Pass** on SR-002 (AR-001 and AR-002 resolved). The reviewer delivered the package to `/implementation_engineer`. Informational, so no forwarding by the Solution Designer. The reviewer corrected their round-1 AR-002 evidence in their revision record: four test files do call the staged activation, and the Principle 7 basis stands.
