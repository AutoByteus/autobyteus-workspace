# Docs Sync Report

## Scope

- Ticket: `remove-long-running-prompt-649` (Project Task `autobyteus-649`)
- Trigger: API/E2E `API-REV-001` passed (direct low-risk route, `Small`/`Low`); package for delivery
- Bootstrap base reference: `origin/personal` `bc4351cad7`
- Integrated base reference used for docs sync: `origin/personal` `bc4351cad7` (fetched 2026-11-25 at the start of delivery; the ticket branch already contains it, 0 commits behind)
- Post-integration verification reference: none needed. No base commit was integrated, so the state API/E2E validated (code `92d9b01ef3`, reports `a623139793`) is the state delivered.

## Why Docs Were Updated

- Summary: every runtime's system prompt lost its "Long-Running Commands" section (founder's direction), together with its texts file, the composer input `longRunningCommandSection` and the ACP profile field. The implementation already rewrote the two module docs that described it; delivery's sync found one more place that described the removed mechanism: the testing guideline's trigger row for a prompt change.
- Why this should live in long-lived project docs: a project document that names a mechanism the code no longer has misleads the next reader who decides which prompt tests to run.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result (`Updated`/`No change`/`Needs follow-up`) | Notes |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/prompt_engineering.md` | owns the prompt's sections, order and composer inputs | Updated (by implementation `92d9b01ef3`, checked by delivery) | TS Source line, table row, the shared and native orders, and the whole "Long-Running Commands Section" are gone. The shared order now ends with the Semantic Memory and Global Semantic Memory sections; the native order ends with File And Directory Practice, then the native core appends Skills. The text matches the code (`carpenter-prompt-composer.ts`). |
| `autobyteus-server-ts/docs/modules/agent_execution.md` | named the section ("Each runtime's system prompt teaches the long-job habit…") with a link that would break | Updated (by implementation, checked by delivery) | the sentence is removed; the surrounding paragraph on 483's 2-hour limits and the 35-minute live check stays true and reads on. |
| `TESTING.md` | row "A runtime's system prompt" says what triggers the prompt-test rule | **Updated by delivery** | the trigger read "the composer or a section in `…/prompt/`, **or the section a backend passes to it**". No backend passes a section to the composer any more (`SharedCarpenterPromptComposerInput` has the agent, member context, Project and the two memory folders only; the five callers pass those). The clause is removed. The rule itself (run every test that reads a run's composed prompt, gated suites included) is unchanged. |
| `DESIGN.md` | project design rules | No change | holds no statement about the section or the composer's inputs (searched `system prompt`, `section`, `Carpenter`). |
| `RELEASE.md` | release guide | No change | no prompt content; the ticket changes no release step. |
| `autobyteus-ts/docs/terminal_tools.md`, `autobyteus-server-ts/docs/features/memory_sync.md`, `autobyteus-web/docs/memory.md` | matched the search for "long-running" / "background run" | No change | they describe the native terminal tool's background mode and memory sync's own background runs, not the prompt section. The runtimes' own tool descriptions stay as they are (requirements, Out Of Scope). |
| Archived `tickets/done/shell-command-time-limits-483/` | the ticket that added the section | No change (DEC-001) | historical record; this ticket states that it supersedes 483's REQ-007, AC-011, AC-012 and DEC-005. |

- Repository search outside `tickets/` for `Long-Running Commands|LONG_RUNNING_COMMAND|longRunningCommandSection|long-running-command-sections|long-running-commands-section`: only the `not.toContain("Long-Running Commands")` absence assertions and their comments in nine test files (AC-001 asks for them); no source file or doc.
- Global memory (outside the repository): `semantic-global/best-practice-long-running-commands.md` holds DEC-003's text (checked, AC-004). It is the founder-approved replacement for the section; nothing in the repository describes it.

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/prompt_engineering.md` | Removal (implementation) | the section's file, table row, order mentions and its own subsection (−37 lines) | the code no longer has them |
| `autobyteus-server-ts/docs/modules/agent_execution.md` | Removal (implementation) | one sentence and its link | the claim is no longer true; the anchor is gone |
| `TESTING.md` | Removal (delivery) | the clause "or the section a backend passes to it" in the system-prompt row | the mechanism no longer exists; the rule is unchanged |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| The prompt carries no runtime-specific shell guidance; the habit lives as an optional note in global memory | A runtime's shell and background behavior is described by that runtime's own tools; the composed prompt adds only identity, collaboration, Project and semantic-memory sections (and the native runtime's own practice sections) | `requirements-doc.md` (DEC-002, DEC-003, DEC-005), `design-spec.md` | `prompt_engineering.md` (the section list and orders are the statement); the founder's caution about adding to system prompts is a proposal for global memory (FU-001 of this ticket, not mine to write) |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| `src/agent-execution/prompt/long-running-command-sections.ts` (six runtime texts) | nothing in the prompt; a global-memory note for agents that look for it | `prompt_engineering.md` (section list and order); `semantic-global/best-practice-long-running-commands.md` |
| `composeSharedCarpenterPrompt`'s required `longRunningCommandSection` input and blank check; `AcpAgentSessionProfile.longRunningCommandSection` | the pre-483 composer shape (`SharedCarpenterPromptComposerInput`, no alias) | `prompt_engineering.md` (composer description), the code |
| The "Long-Running Commands" section as the last Carpenter section of every runtime | the semantic-memory sections end the shared prompt; File And Directory Practice ends the native prompt | `prompt_engineering.md` |

## No-Impact Decision (Use Only If Truly No Docs Changes Are Needed)

- Not used: docs changed.

## Delivery Continuation

- Result: `Pass`
- Next delivery action: verify from evidence, archive the ticket, finalize on `origin/personal` without a release, update the founder's checkout, clean up.
- Notes: `TESTING.md` is the API/E2E engineer's document; the edit only removes a clause that described a deleted mechanism and leaves the rule untouched. API/E2E's report already treated the row as current ("TESTING.md's row for a system-prompt change says to run every test that reads a run's composed prompt"), so the rule it followed is the one kept.
