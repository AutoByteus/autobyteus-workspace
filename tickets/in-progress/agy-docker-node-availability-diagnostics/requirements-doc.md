# Requirements Document — Antigravity "Not installed" on a signed-out Docker node

## Document Status

- Status: **Approved** (baseline SR-002)
- Approved by: Solution Designer within the direction (user informed). The user directed the scope in the conversation on 2026-10-12: "fix the agy bug now. codex is not a bug, its working i will log out and login codex again".
- Current solution revision ID: SR-003 (design added; requirements unchanged since SR-002)
- Package identifier: `agy-docker-node-availability-diagnostics`
- Request / ticket: Project Task `project_task_4fbcd0c4-a279-4ead-85a3-17a2a7513e38` (URGENT, 2026-10-12)
- Requirements owner: Solution Designer (`/software_engineering_team/solution_designer`)
- Date: 2026-10-12
- Approval state and reference: Approved 2026-10-12 within the Task's direction plus the user's scope message. SR-001 was my first baseline. At SR-002, still before design, I narrowed it: no GraphQL contract change, after verifying that the app has no handling for an older remote node (investigation "Architecture Investigation Findings"). The user is told the final behavior in the result summary. There are no `Needs user` decisions.
- Exact approved requirements baseline: this document at SR-002
- Behavior-defining supplements: none

## Problem And Desired Outcome

- Problem: On Docker node 8003, `agy` is installed (`/usr/local/bin/agy`, v1.3.3) but **not signed in**. `agy models` exits 1 with "Please sign in to view available models…". The server turns this into a generic "model discovery failed; check authentication or network" reason. The chat model menu labels every unavailable runtime **"Not installed"**, whatever the reason, and shows the reason only as a hover tooltip. After signing in, the menu still doesn't show Antigravity until the app reloads, because it checks availability once per session. The image is current (`1.5.3-beta.1`); 8001 works because it is signed in.
- Affected actors: AutoByteus users choosing a runtime/model on any node; the node's server.
- Desired outcome:
  - The server's reason for an unavailable Antigravity CLI names the actual cause and the fix. A signed-out CLI gets: "Antigravity CLI is not signed in. Run `agy` in this node's terminal and complete sign-in, then try again."
  - The chat model menu no longer claims "Not installed". It shows each unavailable runtime's reason visibly.
  - After the user signs in, reopening the menu shows Antigravity with its models.
  - A signed-in node lists Antigravity models, and a run works.
- Observable definition of success: AC-001..AC-008.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Scenarios | Current behavior (evidence) | Desired behavior | Preserved behavior | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User/System | SCN-001 | `agy` installed, signed out → generic "discovery failed" reason → menu row "Not installed" | Server reason = sign-in text with the recovery step. Menu row shows it visibly | Discovery bounded; CLI output never shown | investigation R-03, R-04 |
| BEH-002 | User/System | SCN-002 | `agy` installed and signed in → Antigravity listed with models; runs work (8001) | Unchanged | Entire happy path | R-03/R-04 on 8001 |
| BEH-003 | User | SCN-003 | After signing in, reopening the menu still shows unavailable (session cache) | Reopening the menu re-checks unavailable runtimes, so a newly usable runtime appears | Available runtimes aren't re-checked on every open | `useChatModelCatalog.ensureAvailability` |
| BEH-004 | User/System | SCN-004 | Every unavailable runtime is labelled "Not installed" | Neutral "Unavailable" label plus that runtime's own server reason, visible under the name | Which runtimes are enabled; non-AGY reason texts | `ChatModelMenu.vue` L182/L191 |
| BEH-005 | User/System | SCN-005 | Launch/run-settings forms, AGY run start and AGY model replacement show the generic text for a signed-out CLI | They show the sign-in text (same server diagnostic) | Their layout/behavior | `useRuntimeScopedModelSelection.ts`, run factory L134, run-model-selection L55 |
| BEH-006 | Operational | SCN-006 | Docker README says CLIs are not pre-authenticated and to run `agy` to sign in. Nothing ties the in-app message to it | README mentions the in-app "not signed in" message and that each node signs in separately | Existing auth instructions | `docker/README.md` "CLI Auth Model" |
| BEH-007 | User/System | SCN-004 | AGY "not found" reason: "Antigravity CLI is unavailable; install or configure it and retry." AGY "missing flags": "…missing required features; update the CLI and retry." | Clearer wording naming the cause and fix (DEC-005) | Classification rules, bounds | `antigravity-cli-capability.ts` |

## Stakeholders, Actors, And Outcomes

| Actor | Goal | Required outcome | Constraint |
| --- | --- | --- | --- |
| App user | Use Antigravity on a node | Know why it's unavailable and how to fix it; see it once fixed | No app reload after sign-in |
| Node server | Report runtime availability truthfully | Distinguish sign-in from not installed | Never expose CLI output, paths or tokens |
| Operator of Docker nodes | Set up nodes | Docs match the app's message | — |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Scenarios |
| --- | --- | --- |
| UC-001 | Understand why Antigravity is unavailable on a node and how to recover | SCN-001, SCN-005 |
| UC-002 | Recover by signing in, then pick an Antigravity model and run without reloading | SCN-002, SCN-003 |
| UC-003 | See a truthful status for any unavailable runtime in the chat model menu | SCN-004 |
| UC-004 | Operator follows Docker docs from the in-app message | SCN-006 |

### Out Of Scope

- Codex: showing the ChatGPT plan, or why Codex lists fewer models (user: "codex is not a bug").
- New detection logic for Codex, Claude or Grok (their existing reasons are displayed as they are).
- Any GraphQL/API contract change (DEC-002).
- Signing in from inside the app, or storing credentials.
- Changing the Docker image, Dockerfile, preinstalled CLIs or volumes.
- Launch/run-settings form layout changes (they already show the server reason).
- AGY run protocol, tools, permissions, capsule or restore behavior.
- Translating server reason texts (they are English today on every surface).

### Non-Goals

- Detecting every future wording of agy's sign-in message. An unrecognised wording falls back to the existing generic failure text, which still doesn't claim "not installed".
- Background polling of availability.

### Preserved Behavior Boundary

- BEH-002 entirely; AC-006.
- Discovery bounds: 3 s help timeout, 15 s models timeout, 64 KiB / 1 MiB output limits. Classification: ENOENT → unavailable; missing flags → unsupported; timeout/oversize/failure/invalid catalog as today.
- CLI output, paths and credentials never appear in any user-facing message.
- Per-runtime availability stays independent (DESIGN.md rule 3 / §5).
- GraphQL `runtimeAvailability { runtimeKind enabled reason }` unchanged.

### Review Authority

- Every blocking finding must cite an approved REQ, AC or BEH ID.
- New behavior, policy or compatibility promises are a Requirement Gap needing the user's approval.
- Adjacent concerns are non-blocking recommendations or separate-ticket candidates.
- Reviewer comments don't amend this basis.

## Requirements

| ID | Requirement | Behaviors | Priority | Rationale | Source |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | When the Antigravity CLI is installed but its model listing fails because it isn't signed in, the server reports Antigravity unavailable. The reason is the fixed text "Antigravity CLI is not signed in. Run `agy` in this node's terminal and complete sign-in, then try again." Every consumer of the AGY diagnostic (availability, run start, model replacement, application launch validation) gets it. No CLI output is echoed. | BEH-001, BEH-005 | Must | Root cause on 8003 | Task direction; R-03/R-07/R-08 |
| REQ-002 | AGY reasons for other causes name the cause and the fix. Not found: says not installed/found and how to install or configure it. Missing required options: says too old, run `agy update`. Timeout, failed and invalid catalog keep their meaning. | BEH-007 | Should | "Show the actual reason … with a way to recover" | Task direction; DEC-005 |
| REQ-003 | The chat model menu never labels an unavailable runtime "Not installed". The row shows a neutral "Unavailable" label (en "Unavailable", zh-CN "不可用"). Under the runtime name it shows that runtime's server reason as visible text, at most two lines, with the full text in the row tooltip. With no reason, only the label shows. | BEH-001, BEH-004 | Must | The fixed label is false for most causes | Task direction; DEC-001, DEC-007 |
| REQ-004 | Opening the chat model menu re-checks each runtime currently shown as unavailable. A runtime that has become usable (e.g. after sign-in) appears enabled, and its models can be opened without reloading the app. Available runtimes are not re-checked on every open. | BEH-003 | Must | Recovery path | DEC-003 |
| REQ-005 | A signed-in, installed Antigravity CLI keeps working: listed with its models; a run starts and completes on a Docker node built from the released image. | BEH-002 | Must | Done criterion | Task "Done" |
| REQ-006 | The Docker docs tell an operator that the "not signed in" message means running `agy` in that node's terminal. They also say each node's `/root` volume keeps its own sign-in, separately per node, and across image updates. | BEH-006 | Should | Docs check requested | Task direction; R-06 |
| REQ-007 | Coverage at the right levels: server classifier/messages (unit, scripted CLI), availability via GraphQL (existing contract), frontend menu and re-check (component/composable), and executable validation on a Docker node signed out and signed in. | All | Must | Done criterion | Task "Done"; TESTING.md |

## Acceptance Criteria

| ID | REQ | Behavior / Scenario | Trigger | Expected outcome | Alternate / failure | Verification |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001 | BEH-001 / SCN-001 | `agy --help` OK; `agy models` exits non-zero and its output contains sign-in wording ("Please sign in…", "not logged in", "log in"/"login") | `runtimeAvailability(antigravity_cli)` → `enabled:false`, `reason` = the fixed sign-in text. No CLI output in the reason | A non-zero exit without sign-in wording (e.g. "Eligibility check failed … connection refused") → existing discovery-failed text | Server unit test with a scripted CLI (both cases, including a secret-looking string in stderr) |
| AC-002 | REQ-002 | BEH-007 | CLI not found; required option missing | New not-found and update texts returned. Timeout/failed/invalid texts keep their meaning | — | Server unit test |
| AC-003 | REQ-003 | BEH-001, BEH-004 / SCN-001, SCN-004 | Menu opened with an unavailable runtime that has a reason | Row shows "Unavailable" (en/zh-CN) on the right and the reason text under the name. No "Not installed" anywhere. Row stays non-selectable, `aria-disabled`, skipped by arrow keys | Reason null → label only | Component test |
| AC-004 | REQ-004 | BEH-003 / SCN-003 | Antigravity unavailable; the CLI becomes usable; user reopens the menu | Antigravity row becomes enabled and its models load, no app reload | While re-checking, the row keeps its last state. A failed re-check keeps it unavailable with the new reason | Composable/component test; live check on a Docker node |
| AC-005 | REQ-004 | BEH-003 | Menu opened while all runtimes are available | No forced re-check request | — | Composable/component test |
| AC-006 | REQ-005 | BEH-002 / SCN-002 | Docker node from the released image, `agy` signed in | Antigravity listed with models; a run starts, streams and completes | — | Executable validation on a Docker node; user verification on 8003 after sign-in |
| AC-007 | REQ-001 | BEH-005 / SCN-005 | Start an AGY run, or replace its model, while signed out | Error/diagnostic carries the sign-in text | — | Server unit test via existing consumers of `toAgyDiscoveryDiagnostic` / the thrown error |
| AC-008 | REQ-006 | BEH-006 / SCN-006 | Read `autobyteus-server-ts/docker/README.md` | "CLI Auth Model" covers the in-app message, its fix, and per-node sign-in persistence in `/root` | — | Docs review |

## Relevant Scenarios And Journeys

| ID | Kind | Actor | Goal / event | Trigger | Start | Steps | Expected outcome | Alternate | Validity | Evidence | REQ / AC |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | User | App user | See why Antigravity can't be chosen | Open chat model menu | agy installed, signed out | Open menu → read the Antigravity row | "Unavailable" + "Antigravity CLI is not signed in. Run `agy` in this node's terminal…" | Other causes → their own reasons | Supported Normal Scenario | User report; 8003 live | REQ-001, REQ-003; AC-001, AC-003 |
| SCN-002 | User | App user | Use Antigravity | Menu → Antigravity → model → send | agy installed + signed in | Pick model, run | Models listed; run completes | — | Supported Normal Scenario | 8001 live | REQ-005; AC-006 |
| SCN-003 | User | App user | Recover after signing in | Reopen menu after `agy` sign-in in the node Terminal | SCN-001 state | Terminal → `agy` → sign in → chat → reopen menu | Antigravity enabled with models, no reload | Sign-in not done → still the sign-in reason | Supported Normal Scenario | Task direction ("way to recover") | REQ-004; AC-004 |
| SCN-004 | User | App user | Understand any unavailable runtime | Open menu | Any runtime unavailable | Read row | Neutral label + that runtime's reason | — | Supported Normal Scenario | `ChatModelMenu.vue` | REQ-002, REQ-003; AC-002, AC-003 |
| SCN-005 | User/System | App user | Launch form, run start or model replacement while signed out | Select AGY / start / replace model | signed out | — | Sign-in text shown | — | Supported Normal Scenario | existing forms and run paths | REQ-001; AC-007 |
| SCN-006 | Operational | Operator | Set up a Docker node | Read Docker README | New node | — | Knows to sign in per node | — | Supported Normal Scenario | README | REQ-006; AC-008 |
| SCN-X1 | User | App user | New desktop app against an older remote node | Connect to a not-yet-updated node | — | — | (Would break if the query requested a new field) | — | Supported Normal Scenario (nodes and app update separately); drives DEC-002 | `docker ps` shows nodes on pulled images; no client/server version handling in `autobyteus-web` | DEC-002 |

## UI, Interaction, And Experience Requirements

- Applicable: Yes (small, within the existing chat model menu)
- Linked UI/UX supplement, runnable reference, Product ticket, design revision, UI/UX confirmation, visual baseline: N/A — not applicable (no Product Design request; the direction sets the outcome)
- Normative details:
  - The unavailable row keeps today's style: gray text, not selectable, `aria-disabled="true"`, skipped by arrow keys, no chevron, no count.
  - Right side: the "Unavailable" label in place of "Not installed".
  - Under the runtime name: the server reason in small gray text (the same size as the right-side label), wrapping, clamped to 2 lines. The row `title` holds the full reason.
- Illustrative / permitted variation: spacing; exact clamp mechanism.
- Product decisions that need the user: none.

## Quality And Non-Functional Requirements

| ID | REQ / AC | Area | Requirement | Verification |
| --- | --- | --- | --- | --- |
| QR-001 | REQ-001, AC-001 | Security/Privacy | CLI stdout/stderr, paths and tokens never appear in reasons | Unit test with a secret-looking string in stderr |
| QR-002 | REQ-001 | Reliability | Existing timeouts and output limits unchanged | Existing tests stay green |
| QR-003 | REQ-004, AC-004/005 | Performance | Opening the menu doesn't wait for re-checks; only unavailable runtimes are re-checked | Component/composable test |
| QR-004 | REQ-003 | Compatibility | No API contract change; a new app against an older node keeps working and shows that node's reasons | Design: no query change |

## Data Continuity And Acceptable Loss

- Persisted or external data affected: No. The CLI's credential files are only read by the CLI itself.

## External Contracts And Dependencies

| Dependency | Requirement | Evidence | Risk |
| --- | --- | --- | --- |
| `agy` 1.3.3 `models` subcommand | Non-zero exit + sign-in wording when signed out | R-03, R-08 | Wording may change → generic failure text (RSK-001) |
| Docker image 1.5.3-beta.1 | No change needed | R-05 | — |

## Supplemental Artifacts

| Path | Purpose | REQ / AC | Status | Approval |
| --- | --- | --- | --- | --- |
| `investigation-notes.md` | Evidence | All | Current | N/A (evidence) |

## Assumptions

| ID | Assumption | Why | Validation | Status |
| --- | --- | --- | --- | --- |
| ASM-001 | The user can complete `agy` sign-in in the node Terminal | Recovery path | 8001 was signed in that way; README documents it | Validated |
| ASM-002 | A Docker node can be validated signed-out with an empty `HOME`, and signed-in with an existing sign-in, without the user's credentials leaving the node | Executable validation | R-08 | Validated |

## Decisions

| ID | Question | Why it matters | Options / evidence | Reasoning and recommendation | Owner | Status |
| --- | --- | --- | --- | --- | --- | --- |
| DEC-001 | Fix the menu label only for AGY, or for every runtime? | The fixed label is false for Grok/AGY timeouts and others too | (a) AGY only; (b) every row | (b). The label comes from one shared row, and showing each runtime's own reason costs nothing extra. This isn't Codex *plan* work, which the user excluded | Solution Designer | Decided |
| DEC-002 | Add a machine-readable cause to the GraphQL availability result, or keep the contract? | A cause field would allow localized short labels ("Sign in required"), but the app requests it from every node | Evidence: the app has no handling for an older remote node. A query naming a field the node doesn't know fails as a whole, and the store then marks **every** runtime unavailable on that node. Nodes (Docker images) and the desktop app update separately | **Keep the contract.** The server's reason text carries the cause and fix; the menu shows it visibly with a neutral label. Smallest change, no regression on older nodes (DESIGN.md rules 1 and 5). Supersedes SR-001 REQ-002/003 | Solution Designer | Decided (SR-002) |
| DEC-003 | How does the user recover after signing in? | Without it, "sign in, then try again" doesn't work | (a) "Check again" button; (b) re-check unavailable runtimes when the menu opens; (c) polling | (b): no new control, matches "reopen the menu", cheap (unavailable kinds only). Polling would spawn the CLI forever | Solution Designer | Decided |
| DEC-004 | How to detect "not signed in"? | agy has no auth-status command | Failed `agy models` output contains sign-in wording (R-03/R-08); network failure doesn't (R-07) | Classify only a failed `models` call whose bounded output matches sign-in wording. Never show the output; unknown wording → existing generic failure | Solution Designer | Decided |
| DEC-005 | Reason texts | Shown in the menu, forms and run errors | — | Sign-in: "Antigravity CLI is not signed in. Run `agy` in this node's terminal and complete sign-in, then try again." Not found: "Antigravity CLI is not installed or not on this node's PATH. Install it, or set ANTIGRAVITY_CLI_COMMAND, then try again." Too old: "Antigravity CLI is too old for AutoByteus (required options are missing). Run `agy update`, then try again." Others unchanged | Solution Designer | Decided |
| DEC-006 | Codex plan visibility | User asked | User: "codex is not a bug" | Out of scope | User | Decided |
| DEC-007 | Short label wording | Replaces "Not installed" | "Unavailable" vs per-cause labels (needs DEC-002 (a)) | "Unavailable" / "不可用": true for every cause; the reason line carries the specifics | Solution Designer | Decided |

## Traceability

| REQ | UC | BEH | AC | SCN |
| --- | --- | --- | --- | --- |
| REQ-001 | UC-001 | BEH-001, BEH-005 | AC-001, AC-007 | SCN-001, SCN-005 |
| REQ-002 | UC-003 | BEH-007 | AC-002 | SCN-004 |
| REQ-003 | UC-001, UC-003 | BEH-001, BEH-004 | AC-003 | SCN-001, SCN-004 |
| REQ-004 | UC-002 | BEH-003 | AC-004, AC-005 | SCN-003 |
| REQ-005 | UC-002 | BEH-002 | AC-006 | SCN-002 |
| REQ-006 | UC-004 | BEH-006 | AC-008 | SCN-006 |
| REQ-007 | all | all | all | all |

## Architecture Phase Input

- Scenarios to map: SCN-001..006.
- Constraints: sanitization, bounds, unchanged GraphQL contract, independent per-runtime checks.
- Deferred to design: where sign-in classification sits; menu re-check mechanics.
- Risks: RSK-001 (upstream wording), RSK-002 (re-check cost while signed out).

## Readiness Check

### Content Ready For Approval

- Current behavior evidence-backed: Yes
- Desired and preserved behavior explicit: Yes
- Scope and non-goals clear: Yes
- Requirements and ACs testable and traceable: Yes
- Scenarios covered with validity and evidence: Yes
- Product design / supplemental evidence: N/A
- UI/UX approval basis: N/A
- Decisions visible with reasoning: Yes
- Content ready for approval: Yes
- Remaining content blocker: none

### Approved Basis Ready For Design

- Approval recorded: Yes (Solution Designer within the direction; user's scope message recorded; user informed)
- Exact basis recorded: Yes (SR-002)
- Ready for architecture design: Yes
- Remaining blocker: none
