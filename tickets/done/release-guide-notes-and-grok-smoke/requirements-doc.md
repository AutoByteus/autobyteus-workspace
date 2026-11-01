# Requirements Document — autobyteus-355

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-001`
- Package: `release-guide-notes-and-grok-smoke`
- Request / ticket: Project Task `autobyteus-355` ("RELEASE.md and the release smoke check …")
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`); the user agreed, 2026-11-01: "it's good to update the release MD. So that's the important information can be in the release MD as well for a certain ticket, for example ... they use the need to reinstall the Docker launcher ... not every ticket need that, I would say the grog parts."
- Requirements owner: Solution Designer
- Date: 2026-11-01
- Approved by and reference: `Solution Designer within the direction (user informed)`, in my message to the user of 2026-11-01. Nothing here leaves the Task's direction. The final RELEASE.md wording is shown to the user in the final report, as the Task asks.
- Exact approved baseline: this document at SR-001
- Behavior-defining supplements: none
- Workspace: worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/release-guide-notes-and-grok-smoke`, branch `codex/release-guide-notes-and-grok-smoke`, base `origin/personal` @ `efd28d5c4a`, target `personal`

## Problem And Desired Outcome

- Problem 1: betas that need a user action (for example "reinstall the Docker launcher, then `upgrade --all`") had their notes added by hand, against RELEASE.md, three times.
- Problem 2: the release smoke check stops for Claude, Codex and Grok when the Grok CLI does not offer the pinned `grok-4.7`. xAI decides that list and changes it (F-02).
- Desired outcome:
  - RELEASE.md states when and how a beta carries a user-action section;
  - a Grok model-list change no longer stops the smoke check, and a runtime's catalog problem fails only that runtime's cases.
- Success: RELEASE.md says the rule; a token-free test or run with a Grok model list that lacks the pinned model shows the smoke check choosing an offered model, and a missing pinned model on one runtime failing only that runtime's cases.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Current | Desired | Preserved | Evidence |
| --- | --- | --- | --- | --- | --- |
| BEH-001 | Operational | Betas: generated notes only; user actions added by hand as a deviation | When an included ticket's `release-notes.md` has a "What you need to do" section, the beta's notes carry those sections above the generated notes; otherwise generated notes alone | Stable notes from the ticket's curated file; workflows never reuse a stale curated file for a beta | E-01..E-06 |
| BEH-002 | Operational | The live suite checks all runtimes' pins in one setup; one miss stops all runtimes | Each runtime's pin is checked in its own group; a miss fails only that runtime's cases | Fail-closed verdict; every required case must pass; Claude and Codex pins unchanged and strict | E-07..E-09 |
| BEH-003 | Operational | Grok pin `grok-4.7`, no fallback | With no `GROK_E2E_MODEL`: `grok-4.7` when offered, else the first model the CLI offers; the summary names the model used and that the pin was not offered. With `GROK_E2E_MODEL` set: that exact model is required | Override variables; models line in the summary | E-07, E-10..E-13 |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case |
| --- | --- |
| UC-001 | Delivery writes a beta's notes when an included ticket needs a user action |
| UC-002 | Delivery runs the release smoke check while the Grok CLI does not offer `grok-4.7` |
| UC-003 | A ticket author writes a user-action section in the ticket's `release-notes.md` |

### Out Of Scope

- Changes to the release workflows or `desktop-release.sh`.
- Fallback models for Claude or Codex.
- The waiver rule (it stays the user's explicit words).
- Any product code.
- A release.

### Non-Goals

- Predicting xAI's model list.
- Choosing the cheapest Grok model.

### Preserved Behavior Boundary

- BEH-001/BEH-002/BEH-003 preserved columns.
- RELEASE.md's other sections are unchanged except where they state the beta-notes rule.

### Prerequisites

None.

## Requirements

| Requirement ID | Requirement | Behavior | Priority | Feasibility Evidence | Source |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | RELEASE.md: a beta whose included tickets need a user action carries those tickets' "What you need to do" sections above the generated notes; a beta without one keeps the generated notes alone; the guide says how (after all four workflows succeed, edit only the body) | BEH-001 | Must | Done three times by hand without changing assets (E-05) | Task, user |
| REQ-002 | A ticket's `release-notes.md` (and the template) has an optional "What you need to do" section, used only when the change needs a user action | BEH-001 | Must | N/A | Task ("not every ticket needs one") |
| REQ-003 | A runtime's model or catalog problem in the live suite fails only that runtime's cases; the other runtimes' cases still run | BEH-002 | Must | vitest runs a nested `describe`'s `beforeAll` per group (to be shown by test) | Task |
| REQ-004 | Without `GROK_E2E_MODEL`, the Grok cases use `grok-4.7` when offered, else the first offered model; the summary's models line names it and says the pin was not offered | BEH-003 | Must | The catalog lists the offered models (E-07, E-12) | Task |
| REQ-005 | With `GROK_E2E_MODEL` set, that exact model is required (no fallback); a miss fails only the Grok cases | BEH-003 | Must | N/A | Explicit choice stays explicit |
| REQ-006 | Proof spends no tokens and prints no keys | — | Must | Fake Grok CLI over ACP; runner unit tests | Task constraints |

## Acceptance Criteria

| AC | REQ | Trigger | Expected outcome | Verification |
| --- | --- | --- | --- | --- |
| AC-001 | REQ-001, REQ-002 | Read RELEASE.md and the template | The rule, the section name, when it applies and the exact steps are stated; "betas use generated notes" no longer contradicts it | Review; the final wording is shown to the user |
| AC-002 | REQ-003 | Live suite with one runtime whose pinned model is not offered (fake Grok CLI) | Only that runtime's cases fail, with "not offered; available: …"; the runner summary shows the other runtimes' rows unaffected | Runner unit test with a report fixture; token-free suite run |
| AC-003 | REQ-004 | Fake Grok CLI offering `grok-4.5, grok-4.6`, no override | The Grok cases are set up with `grok-4.5`; the models line says `grok-4.5 (pinned grok-4.7 not offered)` or equivalent | Token-free run up to model selection; unit test of the choice rule |
| AC-004 | REQ-005 | Same, with `GROK_E2E_MODEL=grok-4.7` | The Grok cases fail "not offered"; no fallback | Same |
| AC-005 | REQ-006 | All proofs | No provider call with a prompt; no key in logs | Log scan |

## Decisions

| ID | Question | Reasoning and decision | Owner | Status |
| --- | --- | --- | --- | --- |
| DEC-001 | Automate the beta section in the workflows, or a guide step? | Automating needs a per-tag notes file and a stale-file guard in two workflows (the stale-curated-file problem E-02 already exists). Delivery's manual `gh release edit` after the four workflows worked three times without touching assets. Decision: a guide step, no workflow change | Solution Designer | Decided |
| DEC-002 | Which Grok model when the pin is missing? | xAI's list is what the account may use; the first offered model is the CLI's own order and needs no new knowledge. Decision: the pin, else the first offered model; an explicit override stays strict | Solution Designer | Decided |
| DEC-003 | Fallbacks for Claude and Codex too? | Their catalogs have been stable and their pins choose the cheapest paid model on purpose. Decision: no; they get only the per-runtime failure scope | Solution Designer | Decided |
| DEC-004 | Section name | Decision: "What you need to do", short and plain, for users | Solution Designer | Decided |

## Readiness Check

- Content ready: `Yes`
- Approval recorded: `Yes` (within the direction, user informed)
