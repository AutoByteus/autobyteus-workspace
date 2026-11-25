# Requirements Document

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-001`
- Package identifier: `remove-long-running-prompt-649`
- Request / ticket: Project Task `autobyteus-649`
- Requested by: `/project_task_manager`, on the founder's words of 2026-11-25
- Requirements owner: Solution Designer
- Date: 2026-11-25
- Approved by and reference: `User` (the founder), 2026-11-25, in the Solution Designer's conversation, verbatim: "Yeah you should then to be in the system prompt the reason it started it's so specific you know and it could be in some kind of global memory and as a you know as a best practice who knows or for a specific best practice for specific runtime but it shouldn't be in the season prompt because we should be really really cautious what we added to the system problem". Read as: remove the section from every system prompt (REQ-001, REQ-002); keep the habit as a best-practice note in global memory (DEC-002 = keep, the text shown to him, DEC-003).
- Supplements: none

## Problem And Desired Outcome

- Problem: since autobyteus-483 every agent's system prompt ends with a "Long-Running Commands" section. The founder does not want it there ("this belongs to global memory, does not belong to system instruction"). Its benefit was never measured, and each runtime's own shell tool already describes background runs (investigation notes).
- Desired outcome: no runtime's system prompt contains the section; the rest of 483 stays; the habit is either a short global-memory note or dropped, as the founder decides.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Current | Desired | Preserved | Evidence |
| --- | --- | --- | --- | --- | --- |
| BEH-001 | System | Every runtime's system prompt (Claude, Codex, Grok, Antigravity, DeepSeek harness, native AutoByteus) ends with its `## Long-Running Commands` section | No runtime's prompt contains it; each prompt otherwise unchanged | All other sections, their order and texts | `long-running-command-sections.ts`; this agent's own prompt |
| BEH-002 | Operational | No global-memory note on long jobs | A short note, or none (DEC-002) | Existing global notes | `semantic-global/` |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case |
| --- | --- |
| UC-001 | A run of any runtime starts and gets its system prompt |
| UC-002 | Agents read the node's global semantic memory |

### Out Of Scope

- The rest of autobyteus-483: Claude's 2-hour shell limits, background tasks' end reason and exit code on desktop and phone, the Background Tasks panel's no-run state.
- The runtimes' own tool descriptions (Claude Code, Codex, Grok, Antigravity) and the native `run_bash` tool description.
- Agent skills in the agents repository.

### Non-Goals

- Measuring whether agents wait well without the section.

### Preserved Behavior Boundary

BEH-001 preserved column; everything 483 delivered except REQ-007.

### Prerequisites

None.

### Review Authority

- Every blocking finding must cite an approved REQ, AC or preserved behavior. New behavior or policy is a `Requirement Gap` needing the founder's approval.

## Requirements

| Requirement ID | Requirement | Related Behavior | Priority | Rationale | Feasibility | Source |
| --- | --- | --- | --- | --- | --- | --- |
| REQ-001 | No runtime's system prompt contains a "Long-Running Commands" section; the other sections and their order are unchanged | BEH-001 | Must | Founder's direction | N/A | Task; supersedes 483 REQ-007 |
| REQ-002 | Code, tests and the prompt documentation no longer describe or require the section | BEH-001 | Must | No dead code or stale docs | N/A | Task; DESIGN.md |
| REQ-003 | The global semantic memory holds the founder-approved note on long jobs, or none if he drops the habit | BEH-002 | Must | Founder's direction | N/A | DEC-002 |

## Acceptance Criteria

| AC ID | REQ | Trigger | Expected Outcome | Verification |
| --- | --- | --- | --- | --- |
| AC-001 | REQ-001 | Compose the prompt for each runtime (Claude, Codex, Antigravity, Grok and DeepSeek via ACP, native) | No `Long-Running Commands` text; the prompt ends as before 483 (shared: after the semantic memory sections; native: after the file and directory practice section) | Unit: composer and each backend's prompt test |
| AC-002 | REQ-001 | One live run on one runtime | Its system prompt has no `Long-Running Commands` section | Live prompt check (one runtime) |
| AC-003 | REQ-002 | Repository search | No source, test or doc in `autobyteus-server-ts` mentions the section, except historical ticket records | `grep` |
| AC-004 | REQ-003 | After the change | The note in `semantic-global/` is the founder-approved text, or no note when he dropped the habit | File check |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Trigger | Outcome | Validity | Related |
| --- | --- | --- | --- | --- | --- |
| SCN-001 | System | Run start, any runtime | Prompt without the section | Supported Normal | REQ-001, AC-001, AC-002 |
| SCN-002 | Operational | An agent reads global memory | Finds the note (or none) | Supported Normal | REQ-003, AC-004 |

## UI, Interaction, And Experience Requirements

- Applicable: `No` — N/A (the prompt is visible in the Activity tab only as its text).

## Data Continuity And Acceptable Loss

- Persisted data affected: `No`. Saved runs keep the prompts they were started with; new runs and restored runs compose the new prompt.

## Decisions

| Decision ID | Question | Why It Matters | Options / Evidence | Reasoning And Recommendation | Owner | Status |
| --- | --- | --- | --- | --- | --- | --- |
| DEC-001 | Amend the archived 483 documents? | 483 REQ-007/AC-011/AC-012/DEC-005 now describe removed behavior | Archived ticket folders are historical records of what was decided then | Do not edit them; this ticket states it supersedes REQ-007, AC-011, AC-012 and DEC-005, and the living doc (`prompt_engineering.md`) changes | Solution Designer | Decided |
| DEC-002 | Keep the habit as a global-memory note, or drop it? | The founder's direction allows both | Each runtime's own shell tool already describes background runs and completion notices (Claude Code's Bash tool, native `run_bash`); a global note is read only when an agent looks for it, so it would not reach runs by itself; the benefit was never measured | Recommend **drop**. If kept, the note is the short text in DEC-003 | Founder | Decided by the founder 2026-11-25: keep, as a best practice in global memory |
| DEC-003 | The note's text, if kept | Shared by every agent | — | "# Long-running commands (2026-11-25)\n\nStart a long build or test suite once, in the background when your shell tool offers it, and act on its completion notice. Do not wait with `sleep` loops, and never start the same job again or a second command that only waits for it while it runs." | Founder | Decided: the text shown to him; landed as `semantic-global/best-practice-long-running-commands.md` (title "Best practice: long-running commands") |
| DEC-004 | 483's DEC-005 was decided without the founder | It changed every agent's system prompt | — | A change to every agent's system prompt is visible product behavior and goes to the founder as `Needs user` (lesson recorded in the Solution Designer's reflections) | Solution Designer | Decided |
| DEC-005 | The founder's standing rule from his answer | "we should be really really cautious what we added to the system prompt" | — | Applied here; recorded in the Solution Designer's lessons (L1); proposed to him for global memory as a founder rule (not written without his approval) | Founder | Proposed |

## Traceability

| REQ | UC | BEH | AC | SCN |
| --- | --- | --- | --- | --- |
| REQ-001 | UC-001 | BEH-001 | AC-001, AC-002 | SCN-001 |
| REQ-002 | UC-001 | BEH-001 | AC-003 | SCN-001 |
| REQ-003 | UC-002 | BEH-002 | AC-004 | SCN-002 |

## Readiness Check

- Content ready for approval: `Yes`
- Approval recorded: `Yes` (founder, 2026-11-25)
- REQ-003 / AC-004: done by the Solution Designer on 2026-11-25 (the note exists)
