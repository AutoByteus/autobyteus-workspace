# Investigation Notes

## Investigation Meta

- Package: `remove-long-running-prompt-649` (Project Task `autobyteus-649`, delegated by `/project_task_manager`)
- Worktree / branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-long-running-prompt-649`, `codex/remove-long-running-prompt-649`
- Base: `origin/personal` @ `bc4351cad7` (fetched 2026-11-25); finalization target `origin/personal`
- Current solution revision: `SR-001`
- Authorities read: skill `SKILL.md`, `references/requirements-engineering.md`, `references/ticket-scope.md`; project `DESIGN.md` (this conversation)

## Request

The founder (2026-11-25, relayed in the Task): the "Long-Running Commands" section is not needed in the system prompt; "this belongs to global memory, does not belong to system instruction". Remove it from every runtime; keep the habit as a short global-memory note or drop it, as he decides.

## Evidence

| Source | Finding | Established |
| --- | --- | --- |
| `tickets/done/shell-command-time-limits-483/requirements-doc.md:96,113,114,179` | REQ-007 (section in every runtime's prompt), AC-011/AC-012, DEC-005 "Platform system prompt, one section per runtime", decided by the Solution Designer (me), not by the founder | Read |
| `autobyteus-server-ts/src/agent-execution/prompt/long-running-command-sections.ts:1-49` | six texts (Claude, Codex, Grok, Antigravity, generic for DeepSeek harness, native) | Read |
| `carpenter-prompt-composer.ts:37-40,82-89,104` | `composeSharedCarpenterPrompt` requires `longRunningCommandSection` and appends it last (throws when blank); `composeNativeAutoByteusPrompt` appends `NATIVE_LONG_RUNNING_COMMAND_SECTION` | Read |
| `git show c5f063f992^1:…/carpenter-prompt-composer.ts` | before 483 the shared prompt ended with the semantic memory sections and the native prompt with `FILE_AND_DIRECTORY_PRACTICE_SECTION`; removal restores that shape | Read |
| Callers | `claude-session-bootstrapper.ts:29,110`, `codex-thread-bootstrapper.ts:61,220`, `agy-agent-run-backend-factory.ts:30,72`, `acp-agent-run-backend-factory.ts:159`, `acp-agent-session-profile.ts:94-95`, `grok-build-session-profile.ts:25,41`, `deepseek-harness-session-profile.ts:13,39` | Read |
| Tests mentioning the section | 11 unit tests (composer, Claude/Codex/AGY/ACP/native backends, collaboration and semantic-memory sections, parity), 5 E2E tests/helpers (`collaboration-prompt-wording`, `claude-agent-websocket-interrupt-resume`, `configured-skill-on-demand-loading`, `agent-semantic-memory(-live)`, `claude-live-agent-harness`) | `grep -rln` |
| Docs | `autobyteus-server-ts/docs/modules/prompt_engineering.md:20,52,57,77,83-…` (file list, section table, order, "Long-Running Commands Section") | Read |
| This agent's own system prompt (a Claude runtime run of AutoByteus, 2026-11-25) | contains the `## Long-Running Commands` section — live evidence that it ships today. Its own Bash tool description (Claude Code's) already says: `run_in_background` re-invokes the agent when the command exits, "Do not wait with loops of `sleep`", "never start the same command again while it still runs", timeout max 7200000 ms | Observed |
| `autobyteus-ts/src/tools/terminal/tools/run-bash.ts:53-76` | the native `run_bash` tool's own description already says: `timeout_seconds` is the foreground limit; `run_in_background` returns at once and "you are notified when it ends"; long work should use it | Read |
| 483 `API-01 LCL-LONG-CLAUDE-HABIT` | the only evidence of benefit: one Claude run, no comparison run without the section | Read (Task) |
| `/Users/normy/.autobyteus/server-data/memory/semantic-global/` | two notes (`founder-rule-contract-first.md`, `autobyteus-logo.md`); a plain folder agents write files into; agents are told to read it "when you need such facts" — it is not loaded into their context automatically | Read |

## Conclusions

- The section duplicates what each runtime's own shell tool already tells the agent (seen for Claude and native; Codex, Grok and Antigravity bring their own tool descriptions). Its benefit was never measured.
- A global-memory note is read only when an agent looks for it, so it would not carry the habit into runs by itself.
- Removal is a clean cut back to the pre-483 composer shape; no stored data is involved.
- The archived 483 documents are history; this ticket records that it supersedes REQ-007, AC-011, AC-012 and DEC-005 (no edit to the archived folder).

## Temporary diagnostics / cleanup

None.
