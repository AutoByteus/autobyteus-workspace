# Requirements Document — autobyteus-646 Runtime fallback on a usage limit

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-007`
- Package identifier: `usage-limit-fallback-646`
- Request: autobyteus-646, "Smart runtime fallback on usage limit"
- Requested by: `/project_task_manager` (for the founder)
- Requirements owner: Solution Designer
- Date: 2026-11-25
- Approved by: **User (the founder)**, in conversation on 2026-11-25…27. Direction: "another agent should be notified … the router agent … find the next available runtime … continue"; "the model router agent will eventually learn a lot". The recommendations DEC-002/003/005/006 were shown twice and answered "Of course …" (2026-11-26). He reviewed the data contract (2026-11-27) and set the cost budget out of scope (FU-646-01)
- Evidence: [investigation-notes.md](investigation-notes.md)

## Problem And Desired Outcome

- **Problem:** when a run's runtime is out of its usage limit, the run goes to Error, and the person must switch the runtime and retry by hand.
  - New delegations keep choosing the exhausted default, because the "blocked" check runs only while Model Routing is on, and it is off by default (notes §1).
- **Desired outcome:** an exhausted runtime is remembered until its reset.
  - New runs don't start on it.
  - A run that hits the limit switches to the best usable runtime for that agent and continues by itself, with a notice saying what happened.
- **Success:** in the screenshot's case, the computer-use operator starts on its next-best usable runtime, or, if Codex runs out mid-work, it switches and carries on. The conversation shows "Codex usage limit reached (resets Nov 27, 09:00) — switched to Claude · opus".

## Relevant Behavior

| ID | Kind | Current | Desired | Preserved |
| --- | --- | --- | --- | --- |
| BEH-001 | System | A usage-limit failure is an ordinary Error | Recognized as a usage limit with its runtime, model and reset time | Other errors unchanged |
| BEH-002 | System | Nothing remembers it; with routing off, a new delegation starts on the exhausted default | Remembered until the reset; a new delegation skips that default | The layer order of CM-12 / model_routing.md |
| BEH-003 | User/System | The run stays in Error | The run switches runtime and continues; a notice row says why and to what | The existing runtime switch and hand-over (autobyteus-316, -599) |
| BEH-004 | System | — | The fallback is the agent's most-used usable runtime (history), per DEC-004 | — |

## Scope Guardrail

### In-Scope Use Cases

| ID | Use case |
| --- | --- |
| UC-001 | A new delegated run whose default runtime is exhausted starts on a fallback |
| UC-002 | A run whose turn fails on a usage limit switches and continues (a new run's first turn, or mid-work) |
| UC-003 | The exhausted runtime/model is remembered until its reset and shown with its reset time |
| UC-004 | No usable fallback: the run stays in Error with a message naming what is exhausted and until when |

### Out Of Scope

- Several accounts per provider (autobyteus-498): the record is keyed per runtime now.
- AutoByteus-native provider rate limits (API keys).
- Switching back automatically when the reset passes (DEC-005).
- Model Router changes beyond using it where DEC-004 says.

### Non-Goals

- Predicting exhaustion before a turn fails.

### Preserved Behavior Boundary

- Runtime switch and hand-over semantics.
- CM-6/CM-7 (Task-bound life).
- Model Routing's decision records.
- A person's explicit runtime choice is overridden only per DEC-003.

### Prerequisites

None.

## Requirements

| ID | Requirement | Behavior | Priority | Feasibility | Source |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | A turn that ends in a terminal error caused by the runtime's usage limit is recognized as such, with the runtime, the model and the reset time when the runtime reports it | BEH-001 | Must | Codex: structured `usageLimitExceeded`; all runtimes: the live limits read after the error shows the model `blocked: {until}` (0 tokens) — notes §3 | Task 1 |
| REQ-002 | The node remembers each exhausted runtime/model until its reset (or a cooldown when no reset time is known, DEC-006) | BEH-002 | Must | New small record (data contract in design) | Task 1 |
| REQ-003 | A new delegated run does not start on a remembered-exhausted default; it starts on the fallback (REQ-004), with a launch note | BEH-002 | Must | Delegation layer order exists | Task 1, 2 |
| REQ-004 | The fallback is a usable runtime and model (installed, signed in, not exhausted). **The node's Model Router agent chooses it** when told of the event, given the usable runtimes now, the agent's runtime/model history and its earlier switches. When the router is off, busy past its budget, or itself exhausted, the agent's most-used usable runtime (last 30 days, with the model it last used there) is taken | BEH-004 | Must | Router exists (40 s budget); history countable from run files (notes §4) | Founder 2026-11-25; DEC-001, DEC-004 |
| REQ-009 | A usage-limit failure is published as a **run event** (telemetry) on the node; reacting to it is the job of listeners, not of the run: the exhaustion memory and the Model Router. New event kinds and listeners can be added without changing runs | BEH-001 | Must | No node-wide run event stream exists yet (design) | Founder 2026-11-25 |
| REQ-010 | The Model Router learns over time: its request includes the agent's history and the outcome of earlier switches, and its decisions are recorded like routing decisions | BEH-004 | Should | Router keeps `knowledge.md` and decision statistics | Founder 2026-11-25 |
| REQ-005 | A run whose turn fails on a usage limit switches to the fallback through the existing runtime switch and hand-over, and is sent a short "continue" message. The input that failed is already in its conversation and is not sent again; the new runtime sees it through the hand-over | BEH-003 | Must | Runtime switch + hand-over exist | Task 3; founder 2026-11-25 |
| REQ-006 | The conversation shows the switch plainly: one notice row explaining it ("<Runtime> usage limit reached (resets <time>) — switched to <Runtime> (<model>). Chosen by …"), and the continue instruction the agent receives as a labelled system notice row, never as a message from the person. Nothing the agent is told is hidden from the person | BEH-003 | Must | Platform notice rows exist; every posted input is shown (IQ-003) | Task 3; SR-007 |
| REQ-007 | When no fallback is usable, the run stays in Error with a message naming each exhausted runtime and its reset time | UC-004 | Must | — | Task |
| REQ-008 | At most one switch per runtime per turn: a fallback that is exhausted too is skipped, and nothing loops | BEH-003 | Must | — | Safety |

## Acceptance Criteria

| ID | Req | Trigger | Expected | Verification |
| --- | --- | --- | --- | --- |
| AC-001 | REQ-001, REQ-002 | A Codex turn ends with `usageLimitExceeded` | Recorded as exhausted until the reset read from Codex's limits | Unit with recorded payloads; gated live case when an account is exhausted |
| AC-002 | REQ-003 | Delegate an agent whose default is remembered-exhausted | Starts on the fallback; the launch note names why | Server test, two-server E2E |
| AC-003 | REQ-005, REQ-006 | A run's turn fails on the usage limit (first turn, and mid-work) | Switches; the notice row is shown; the continue notice (C-5) is the new runtime's input, the failed input is not sent again, and the hand-over carries the work journal | Built-server E2E with scripted CLIs |
| AC-004 | REQ-007, REQ-008 | Every candidate is exhausted | One Error with the list; no loop | Server test |

## Decisions

| ID | Question | Why it matters | Options | Reasoning and recommendation | Owner | Status |
| --- | --- | --- | --- | --- | --- | --- |
| DEC-001 | Who chooses the fallback | Speed, cost, learning, decoupling | A: history ranking; B: the Model Router agent, told through a run event | The founder chose B: the run reports, the router decides and learns over time ("it will be able to make really smart decisions"). History stays as the safety net when the router can't answer | Founder | Decided (B), 2026-11-25 |
| DEC-002 | Automatic or opt-in | A run changes runtime without being asked | (a) automatic, with a switch in Settings → Model Routing to turn it off, active even while Model Routing (the delegation choice) is off; (b) opt-in, off by default | The point is that work doesn't stop; the notice row makes it visible and the person can switch back. **(a) on by default** | Founder | Decided (recommendation accepted, 2026-11-26) |
| DEC-003 | Which runs | A person picked the runtime of a run they started | (a) every run (started by a person, delegated, Team members); (b) delegated runs and their members only | The same stop happens to a person's run, and the notice says what changed. **(a)** | Founder | Decided (recommendation accepted, 2026-11-26) |
| DEC-004 | Fallback order | — | Router first; history when the router is off, past its 40 s budget or exhausted itself; Error when neither finds a usable runtime | Follows DEC-001 B | Founder | Decided, 2026-11-25 |
| DEC-005 | When the first runtime's limit resets | Cost/quality preference | (a) the run stays on the fallback; new runs use the default again; (b) switch the run back | Switching back mid-work is a second hand-over for no gain. **(a)** | Founder | Decided (recommendation accepted, 2026-11-26) |
| DEC-006 | No reset time known | — | cooldown 1 h, then usable again (a new failure records it again) | Avoids a runtime blocked forever on a wrong guess. **1 h** | Founder | Decided (recommendation accepted, 2026-11-26) |
| DEC-007 | Several accounts per provider (autobyteus-498) | Future | Keyed per runtime now; per account when 498 lands | No accounts exist yet. **Later** | Solution Designer | Decided |

## Architecture Phase Input

- **Data contract first, shown to the founder** (the Task asks):
  - the exhaustion record: runtime, model scope, `until`, source, recordedAt;
  - the notice row's facts;
  - the launch note.
- **To verify:**
  - Claude/Antigravity/Grok error payloads, against live-limit reads after an error;
  - a switch of a running (not stopped) run;
  - re-posting the failed input exactly once.

## Readiness Check

- Content ready: Yes. Approval recorded: Yes (founder). Ready for design: Yes.
