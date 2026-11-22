# Investigation Notes

## Investigation Meta

- Package identifier: `stale-runtime-session-recovery` (autobyteus-599)
- Request / ticket: Project Task `autobyteus-599`
- Workspace root: `/Users/normy/autobyteus_org/autobyteus-worktrees/stale-runtime-session-recovery-599`
- Repository mode: `Git`
- Task worktree / branch: the path above, branch `codex/stale-runtime-session-recovery-599`
- Resolved base: `origin/personal` @ `0da6bfbfc1` (fetched 2026-11-22)
- Finalization target: `origin/personal`
- Bootstrap result: worktree created; `pnpm install --frozen-lockfile` and `prepare:shared` passed (`/tmp/599-install.log`, `/tmp/599-prepare.log`)
- Bootstrap blocker: none
- Current solution revision ID: `SR-001`
- Authorities read: requirements gate (`references/requirements-engineering.md` including the 2026-11-20 "Feasibility of the proof" rule, `finding-the-cause.md`, `ticket-scope.md`), read in this conversation. The design gate is listed in `design-spec.md`.
- Investigation status: complete

## Initial Request And Clarifications

- **Original request:** Task 599 (text in `requirements-doc.md`), from the founder's screenshot. A Team member (`architecture_reviewer`, Claude Agent SDK) answers every message with `CLAUDE_PROCESS_EXITED: Claude Code returned an error result: No conversation found with session ID: …`.
- **Clarifications received:** none needed.
- **Constraints:**
  - private run data read-only;
  - synthetic fixtures;
  - `DESIGN.md` and `TESTING.md`;
  - no release without his word.

## Source Log

| Date | Source Type | Exact Source / Command / Query | Why Consulted | Relevant Finding | Follow-Up |
| --- | --- | --- | --- | --- | --- |
| 2026-11-22 | Data | Read-only: the observed member's tree entry (`launchConfiguration`, `platformAgentRunId`) and its raw-trace timestamps and types (no content) | Root cause | Claude Agent SDK, workspace = the superrepo. Last answered turn on 2026-10-14; next message 36 days later | — |
| 2026-11-22 | Data | Metadata of `~/.claude/projects/*/*.jsonl` (count, modification times) and `~/.claude/settings.json` (`cleanupPeriodDays`) | Retention | 1,819 files, oldest 2026-10-23, 1 over 30 days; setting unset, so the 30-day default applies. The observed session file is absent. | DEC-005, FU-001 |
| 2026-11-22 | Data | Metadata of `~/.codex/sessions` | Codex retention | 134 rollouts back to 2026-02-23: no age cleanup | SCN-002 is an edge |
| 2026-11-22 | Command | PRB-001…PRB-008 (`probes/README.md`) | Each runtime's signal | See the table there | REQ-002 |
| 2026-11-22 | Code | `agent-execution/backends/claude/session/claude-session.ts:221-238` (`submitInput` opens the process lazily), `:416-423` (exit becomes `CLAUDE_PROCESS_EXITED`) | Claude path | Today the missing session is seen only at the first input, inside a turn | Claude must be checked at activation |
| 2026-11-22 | Code | `claude-provider-session-lifecycle.ts` (`restore` → `resume` binding), `claude-session-manager.ts:73-80`, `claude-agent-run-backend-factory.ts:32-44` | Claude restore | Restore only builds the binding; no open | Where the check goes |
| 2026-11-22 | Code | `runtime-management/claude/client/claude-sdk-session-opening.ts:50-60` | Init | The opening observes `initializationResult()` but does not await it | The check awaits it (PRB-007) |
| 2026-11-22 | Code | `backends/codex/thread/codex-thread-manager.ts:144-200` | Codex restore | `thread/resume` is called in the activation's preparation | Recognize the error there |
| 2026-11-22 | Code | `backends/antigravity/backend/agy-agent-run-backend-factory.ts:110-125`; `stream/agy-stream-process.ts:40-66` | AGY restore | `--conversation <id>`; a different `init.conversation_id` throws `AGY_CONVERSATION_ID_CONFLICT`; stderr is kept in `stderrTail` | Recognize via the stderr line |
| 2026-11-22 | Code | `backends/acp/session/acp-agent-session.ts:128-147`, `acp-session-launcher.ts:74`, `runtime-management/acp/acp-client-connection.ts:160-168` | ACP restore (Grok, DeepSeek) | `session/load` or `session/resume` during preparation | The profile classifies its not-found error |
| 2026-11-22 | Code | `agent-execution/services/standalone-agent-run-lifecycle-service.ts:214-358` | Standalone activation | `restoreStarted` (platform restore) and `activateSwitched` (begin, prepare new, record, commit) | The renewal reuses the switch steps |
| 2026-11-22 | Code | `agent-collaboration/execution/backends/configured-agent-activation-planner.ts`, `configured-agent-execution-handle.ts:431-445`, `configured-agent-switch-attempt.ts` | Members and delegated copies | The planner plans `restore_external`; the handle owns the operation and `switchAttempt` (record before commit, discard unless recorded) | The same renewal for members |
| 2026-11-22 | Code | `agent-collaboration/execution/domain/collaboration-agent-platform-binding.ts:20-100` | Member commit | `replace_without_conversation` is a compare-and-set replacement of the stored session ID | The renewal commit has the same shape |
| 2026-11-22 | Code | `agent-execution/domain/runtime-switch.ts` | Switch object | The key, marker ID and marker text are built in one place | Add the renewal builder there |
| 2026-11-22 | Contract | `tickets/done/cross-runtime-resume/run-runtime-switch-contract.md` §3.3–§3.7, I-1…I-11 | Archive, marker, notice, chat | Pending derivation by the marker; the chat reads `runtime_switch` segments | Reused unchanged |
| 2026-11-22 | Code | `agent-memory/services/agent-conversation-activity-inspector.ts`, `run-conversation-availability.ts` | autobyteus-198/461 | These check AutoByteus's own raw traces, not the runtime's session | Not the owner here |
| 2026-11-22 | Doc | `GLOSSARY.md:435-452` | Vocabulary | "Agent runtime switch", "Hand-over notice", "Switch marker" | Add "Lost runtime session" |

## Relevant Existing Behavior And Supported Product Paths

| Behavior ID | Kind | Supported Trigger Or Governing Contract | Current Supported Product Behavior Path / Lifecycle | Current Outcome / Invariants | Evidence | Confidence / Unknown |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | A message to a stopped Claude run | `restoreStarted` → platform restore (binding `resume`) → commit → input → `ensureOpen` → CLI result error → exit → turn fails | The run shows `Error`, on every message | Screenshot; PRB-002; code | Reproduced (CLI); read (path) |
| BEH-002 | User | Codex | Platform restore → `thread/resume` error | The activation fails | PRB-003 | Reproduced (CLI) |
| BEH-003 | User | Antigravity | Platform restore → new conversation → conflict | The activation fails | PRB-004 | Reproduced (CLI) |
| BEH-004 | User | Grok / DeepSeek | Platform restore → `session/resume` error | The activation fails | PRB-005, PRB-008 | Reproduced (CLI) |

## Relevant Codebase And Technical Facts

See the Source Log. Key fact: Codex, Antigravity and ACP fail inside the activation's preparation. Claude fails only at the first input, because its process opens lazily.

## Structural And Payload Surface Inventory

### Payload Or Content Surfaces

- The run's raw traces (a segment and a marker), its metadata or tree entry (`platformAgentRunId`), and the chat or journal marker line.

### Structural Surfaces

- The activation lifecycles: standalone, and the member handle and planner.
- Four backend restore paths and one new typed error.
- The switch domain object, used in a second way.
- The member binding change.

### Potential Structural Impacts To Investigate

- API or external-contract change: none (no GraphQL or route).
- Persistence: an additive use of existing shapes (segment, marker, session ID). No new field and no migration.
- Concurrency or lifecycle: a new branch in two activation sequences, inside the existing transition lanes.
- Ownership: the backends recognize; the lifecycles recover.
- Confirmed present: lifecycle change across subsystems.

## Runtime, Probe, Or Reproduction Findings

| Method / Command | Scenario | Observation | Established | Requirement Implication | Artifact / Evidence Path |
| --- | --- | --- | --- | --- | --- |
| PRB-001, PRB-002 | Claude, missing session | Error result and exit 1 before any input | Reproduced | REQ-001, REQ-002 | `probes/README.md` |
| PRB-003 | Codex | `no rollout found for thread id <id>` (-32600) | Reproduced | same | same |
| PRB-004 | Antigravity | stderr `conversation "<id>" not found`, and a new conversation | Reproduced | same | same |
| PRB-005 | Grok | `FS_NOT_FOUND` (-32603) | Reproduced | same | same |
| PRB-006 | Claude SDK `getSessionInfo` | `undefined` for missing, and also for "no extractable summary" | Reproduced | Not an exact check; rejected | same |
| PRB-007 | Claude SDK initialization | Rejects for missing (0.9 s), resolves for present (0.26 s); no input, no model call | Reproduced | Exact activation-time check | same |
| PRB-008 | DeepSeek | `session is not resumable: <id>` (-32602) | Reproduced | REQ-002 | same |
| PRB-009 (N-1, implementation, DEC-006) | Grok, a PRESENT session whose workspace folder (cwd) was removed | `session/resume` succeeds (the session's models come back, no error); `session/new` with the removed cwd also succeeds; a random missing session still answers `FS_NOT_FOUND` | Reproduced, 2026-11-22, isolated HOME and XDG folders, key from the test vault to the Grok child only, no prompt | `FS_NOT_FOUND` stays the exact signal of a missing session; no narrowing needed (a removed cwd is not reported as not found) | `probes/README.md`, `probes/grok-resume-removed-cwd.mjs` |
| Data counts | Retention | Claude's 30-day cleanup is in effect; Codex has none | Measured | SCN-001 normal; SCN-002 edge | `probes/README.md` |

- Temporary diagnostics: none. The probes ran in `/tmp/599-probes/` against temp folders and an isolated `CLAUDE_CONFIG_DIR`, never the founder's sessions. Copies are in `probes/`.
- Reproduction for implementation to start from: PRB-007 (Claude, both cases, no model call) and PRB-003/005/008 (JSON-RPC shapes for unit fixtures).

## Stakeholder And User Evidence

| Source / Actor | Need, Problem, Or Constraint | Evidence Strength | Requirement Implication | Open Question |
| --- | --- | --- | --- | --- |
| Founder (screenshot, 2026-11-21) | An older member cannot continue | First-hand | REQ-001 | — |

## External Contracts, Standards, And Dependencies

| Contract / Dependency | Version / Authority | Relevant Behavior Or Constraint | Evidence | Unknown / Risk |
| --- | --- | --- | --- | --- |
| Claude Code / Agent SDK | 2.1.330 / 0.3.280 | Missing session fails initialization with an exact text | PRB-007 | RSK-001: text may change |
| Codex app-server | 0.171.0 | `no rollout found for thread id` | PRB-003 | RSK-001 |
| Antigravity CLI | 1.5.14 | stderr warning and a new conversation | PRB-004 | RSK-001 |
| Grok ACP | 1.0.92 | `FS_NOT_FOUND` | PRB-005 | RSK-001 |
| DeepSeek Harness ACP | 0.2.2-rc.5 | `session is not resumable: <id>` | PRB-008 | RSK-002: "not resumable" may also cover other states |

## Persisted Data And State Facts

- **Affected:** the run's raw-trace files (a new `runtime_switch` segment and a marker, as a switch writes), and `platformAgentRunId` in the metadata or tree.
- **Readers:** the chat projection (§3.7), the journal (§3.4), the hand-over notice (§3.6), memory search, the episodic catalog. All already read switch segments.
- **Required semantics:** I-1…I-11 hold, with `from = to` for a renewal.
- **Acceptable loss:** the runtime's native session, which is already gone.
- **Remaining evidence gap:** none.

## Product Design Request Context

- `Not stated`. The one chat line reuses the existing marker row.

## Supplemental Artifact Inventory

| Artifact Path | Owner | Purpose | Scope | Related Requirement / AC IDs | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- | --- | --- |
| `probes/README.md`, `probes/*.mjs` | Solution Designer | Runtime signals and data counts | Synthetic | REQ-001, REQ-002 | Evidence | Not behavior-defining |

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Why It Matters | Resolution / Owner | Status |
| --- | --- | --- | --- | --- | --- |
| RSK-001 | Risk | A runtime update changes its not-found text | Recognition misses, and the run fails as today (never a wrong recovery) | Tests pin each shape; a miss is visible | Accepted |
| RSK-002 | Risk | DeepSeek's "not resumable" may cover states other than missing | A renewal where a session existed | Match the exact message with the same ID; dsh only reports it for an unknown session in PRB-008 | Accepted, noted |
| RSK-003 | Risk | Claude's restore now opens the process at activation instead of at the first input | Timing change for every Claude restore | Activation is caused by an input (or a restart restore) and the process is needed at once; PRB-007 shows 0.26 s | Design |
| UNK-001 | Unknown | Antigravity's own retention | Frequency only | Not needed | Closed |

## Architecture Investigation Findings

- **Root cause:** an external runtime's session can disappear independently of AutoByteus: Claude's 30-day cleanup, a moved home, a rebuilt node. AutoByteus treats the saved ID as always resumable. No owner recognizes "the session is gone", and no path continues the run without it, although the runtime-switch path already continues a run in a fresh session from its journals.
- **Owners today:**
  - each backend factory owns its restore and knows its runtime's errors;
  - the standalone lifecycle and the member handle own activation sequencing and the commit;
  - the switch memory (`RuntimeSwitchRecorder`) owns archive and marker;
  - the notice service derives the hand-over from the marker.
- **Constraint:** both activation owners already implement "fresh session, archive, marker, commit" for switches. The renewal must reuse that, not copy it.

## Requirement Implications

- PRB-007 makes an exact Claude check at activation possible, so REQ-002 holds for Claude without guessing.
- The retention data makes SCN-001 a normal scenario and SCN-002 an edge.

## Notes For Architecture Design

- One typed error, raised by each backend only on its exact signal.
- One renewal builder beside the switch builder.
- Both activation owners catch the typed error from platform restore and run their existing switch steps with the renewal.
- Claude's restore preparation opens the process and awaits initialization.
