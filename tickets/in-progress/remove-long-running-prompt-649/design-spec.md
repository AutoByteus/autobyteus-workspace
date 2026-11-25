# Design Spec

## Solution And Approval Basis

- Package: `remove-long-running-prompt-649` (Project Task `autobyteus-649`)
- Worktree / branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-long-running-prompt-649`, `codex/remove-long-running-prompt-649`; base `origin/personal` @ `bc4351cad7`; finalization target `origin/personal`
- Approved requirements: `requirements-doc.md` SR-001, approved by the founder 2026-11-25 (verbatim in its Document Status)
- Solution revision: `SR-002`
- Authorities read: skill `references/architecture-design.md`, `references/design-principles.md` (re-read 2026-11-25 after its update: The Approach, Principle 17, Practical Application Guide, Structural Triggers), `templates/design-spec-template.md` (updated); project `DESIGN.md`. No conflict.

## Current-State Read

`composeSharedCarpenterPrompt` (`autobyteus-server-ts/src/agent-execution/prompt/carpenter-prompt-composer.ts:82-89`) requires `longRunningCommandSection` (throws when blank) and appends it after the shared sections; `composeNativeAutoByteusPrompt` (`:91-105`) appends `NATIVE_LONG_RUNNING_COMMAND_SECTION` last. The six texts live in `long-running-command-sections.ts`. Callers pass them: `claude-session-bootstrapper.ts:29,110`, `codex-thread-bootstrapper.ts:61,220`, `agy-agent-run-backend-factory.ts:30,72`, and for ACP `acp-agent-run-backend-factory.ts:159` from the profile field `acp-agent-session-profile.ts:94-95`, set by `grok-build-session-profile.ts:25,41` and `deepseek-harness-session-profile.ts:13,39`. Before 483 (`c5f063f992^1`) the composer had neither the input nor the section.

## Task Size And Architectural Risk (Mandatory)

- `task_size`: `Small` — removal across one prompt module, its six callers, tests and one doc; no new code.
- `architectural_risk`: `Low` — restores the pre-483 composer shape; no persistence, API, security, concurrency or deployment change; the only cross-boundary effect is a shorter system prompt text for new and restored runs.
- Escalation trigger: any change to the rest of 483 (2-hour limits, background-task end reason) — out of scope.

## Architecture Investigation Evidence

`investigation-notes.md` § Evidence (callers, tests, docs, pre-483 shape, the runtimes' own tool descriptions, global memory).

## Intended Change

Remove the "Long-Running Commands" section from every runtime's system prompt, clean cut: delete its texts, the composer input and the ACP profile field, and their uses; update tests and `prompt_engineering.md`. The habit lives as a best-practice note in global memory (done, REQ-003).

## Change Scope (Mandatory)

- Remove: `autobyteus-server-ts/src/agent-execution/prompt/long-running-command-sections.ts`.
- Modify (source):
  - `src/agent-execution/prompt/carpenter-prompt-composer.ts`: drop `SharedCarpenterPromptComposerInput.longRunningCommandSection` (the type becomes the base input; keep or inline the exported type name as the code reads best, no alias), the blank check, the append, the native append and the import.
  - `src/agent-execution/backends/claude/backend/claude-session-bootstrapper.ts`, `codex/backend/codex-thread-bootstrapper.ts`, `antigravity/backend/agy-agent-run-backend-factory.ts`, `acp/backend/acp-agent-run-backend-factory.ts`: stop passing it; remove imports.
  - `src/agent-execution/backends/acp/acp-agent-session-profile.ts`: remove the `longRunningCommandSection` field; `grok/grok-build-session-profile.ts`, `deepseek-harness/deepseek-harness-session-profile.ts`: remove the value and import.
- Modify (tests): every test that names the section or passes the input (the 18 files in the investigation notes, incl. `__snapshots__/collaboration-prompt-sections.test.ts.snap`): delete assertions that the section exists; where a test asserts the full prompt or its last section, it now asserts the pre-483 ending; add to the composer test and each backend prompt test one assertion that the prompt contains no `Long-Running Commands` (AC-001).
- Modify (docs): `autobyteus-server-ts/docs/modules/prompt_engineering.md`: remove the file from TS Source (`:20`), the table row (`:52`), "then Long-Running Commands" from the order (`:57`), "and Long-Running Commands" from the native order (`:77`), and the whole "Long-Running Commands Section" (`:83-…`).
- Left alone: the rest of 483 (`claude-shell-time-limit-setting.ts`, background-task end reason and reporters, the Background Tasks panel); the runtimes' tool descriptions; the archived 483 ticket (DEC-001).
- Follow-ups: none found.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior | Requirement / AC | Trigger | Target Path | Spine |
| --- | --- | --- | --- | --- |
| BEH-001 | REQ-001, REQ-002; AC-001..003 | run start or restore, any runtime | backend bootstrapper/factory → `composeSharedCarpenterPrompt` / `composeNativeAutoByteusPrompt` → runtime's system prompt, ending with the (global) semantic memory sections (shared) or File And Directory Practice (native) | DS-001 |
| BEH-002 | REQ-003; AC-004 | agent reads global memory | `semantic-global/best-practice-long-running-commands.md` (done) | — |

## Task Design Health Assessment (Mandatory)

- Change posture: behavior change (removal).
- Root cause classification: `No Design Issue Found` in the code — the section was a requirement the founder now rejects; the composer and callers are otherwise healthy.
- Refactor needed now: no; a clean-cut removal of everything that existed only for the section.

## Terminology

No new words; "Long-Running Commands" leaves the vocabulary of the prompt docs.

## Legacy Removal Policy (Mandatory)

Clean cut: no flag, no empty-string default, no kept constant.

## Data Contract

Exchanged shape: the system prompt text each runtime receives. Change: one trailing section removed; no field added. Readers: the agent (model) only; no code parses the prompt. Walk: run start and restore compose the prompt once from current sections. No stored shape changes.

## Persisted Data / State Transition Decision

`Not Affected`: prompts are composed at start and restore; nothing stores the section.

## Data-Flow Spine Inventory / Primary Spine

- DS-001: `Run start/restore → runtime backend (bootstrapper / factory / ACP profile) → Carpenter composer → system prompt → runtime`. Owner: the composer (section order). Unchanged except one fewer section.

## Ownership Map

Composer owns the section list and order; each backend owns passing its run's inputs. Removing the input removes a dependency from five callers.

## Removal / Decommission Plan (Mandatory)

| Item | Why | Notes |
| --- | --- | --- |
| `long-running-command-sections.ts` (6 constants) | requirement removed | file deleted |
| `longRunningCommandSection` composer input + blank check | no section | |
| `AcpAgentSessionProfile.longRunningCommandSection` + Grok/DeepSeek values | no section | |
| Docs "Long-Running Commands Section" + mentions | no section | |
| Tests asserting the section | behavior removed | replaced by absence assertions |

## Dependency Rules / Interfaces

Backends no longer import a prompt-text module; the composer's input narrows. No new interface.

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Decision |
| --- | --- |
| keep the input optional for "future habits" | Rejected: dead input (Principle 7) |

## Change / Refactor Sequence

1. Composer and the file deletion. 2. Callers and the ACP profile. 3. Tests (incl. snapshot update). 4. Doc. 5. Checks: server typecheck, the touched unit tests, the listed E2E files that run without live providers; one live prompt check (AC-002).

## Key Tradeoffs

Agents no longer get the habit in their prompt; their runtimes' own shell tools describe background runs and completion notices (Claude Code, native `run_bash`), and the global note holds the habit. Accepted by the founder.

## Risks

- A live E2E (`claude-live-agent-harness`, `agent-semantic-memory-live`) asserting the prompt's end needs its expectation changed; run what the test vault allows.

## Guidance For Implementation

- Search after the change: `grep -rn "Long-Running Commands\|LONG_RUNNING_COMMAND\|longRunningCommandSection" autobyteus-server-ts` returns nothing outside `tickets/` (AC-003).
- AC-002 live prompt check: start one run on one runtime (Claude is cheapest via the test vault, per TESTING.md) and confirm its system prompt has no `## Long-Running Commands` (e.g. through the run's captured prompt in the E2E harness or the Activity view's system prompt); keep the evidence.
- Do not touch the 2-hour limit or end-reason code.
