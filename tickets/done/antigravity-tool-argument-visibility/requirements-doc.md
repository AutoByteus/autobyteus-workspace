# Requirements — Antigravity tool argument visibility

## Document Status
- Package: `antigravity-tool-argument-visibility`; current revision: `SR-003`.
- Status: **Approved — future newly recorded calls only**.
- Owner: Solution Designer; date: 2026-10-03.
- Request: investigate incomplete native tool arguments in Agent Package Creator using Antigravity, including other tools and a direct runtime probe.
- Approval state/reference: USER-APPROVAL-2026-10-03-FUTURE-ONLY, the user reply immediately after SR-001 was presented: “Yeah, I mean for the past ones we don't care, right? And it is how it is. But for the future one we just fix for the future, you know. Of course, I mean if it's fixable, if it's not fixable, then I guess we have to keep it like it is.” The follow-up asks whether it is fixable. Feasibility is positively supported by native full-input and ACTIVE-timing evidence. This approves the proposed future-only scope with safe fallback, not historical repair or result recovery.
- Exact approved baseline: SR-001 requirements REQ-001–004, AC-001–006, UC-001–004, SCN-001–004, with unchanged intended behavior; approval captured at SR-002. No behavior-defining supplements. Evidence remains factual.

## Problem And Desired Outcome
Antigravity's stream supplies summary parameters rather than complete native tool inputs. AutoByteus currently records and displays those summaries as tool arguments. Actual replacement content and other input fields are available in the provider's local transcript but do not reach Activity or saved AutoByteus history.

Approved success: users can inspect the actual available native inputs, including edit/write content and search/command options, for newly recorded calls in live Activity and subsequently reopened history, without changing tool execution or inventing missing details.

## Relevant Current And Desired Behavior
| Behavior | Kind / Scenarios | Evidence-backed current behavior | Approved desired behavior | Preserved behavior | Evidence |
| --- | --- | --- | --- | --- | --- |
| BEH-001 | User/System; SCN-001 | Replacement/write arguments show path only. | Show actual provider-supplied replacement/write inputs, including original/replacement or written content and associated supplied options. | Native tool execution, selected target, content, provider status and invocation identity. | F-001–F-004 in investigation notes. |
| BEH-002 | User/System; SCN-002 | Read/search/command arguments omit supplied ranges, filters or working-directory/runtime options. | Retain actual available inputs for each configured native tool; do not expand the native-tool allowlist. | Tool names, execution behavior, MCP projection and native-image handling. | Production coverage and direct native comparison. |
| BEH-003 | User/System; SCN-003 | Saved history repeats the same summary arguments stored at start. | Newly recorded calls preserve complete verified inputs through reopen, whether the call occurred in a new or resumed run. | Existing saved traces remain readable and unchanged. | Recorder and historical replay evidence. |
| BEH-004 | System; SCN-004 | Stream summaries alone are sufficient for normal event conversion; provider internal records are not read for arguments. | If full input evidence is missing, unsafe, malformed or ambiguous, retain verified summary fields without borrowing another call's content or breaking execution. | Existing lifecycle/error semantics and usable summary data. | Provider-internal dependency and existing guarded brain readers. |

## Stakeholders, Actors, And Outcomes
| Actor | Goal | Required outcome | Constraint |
| --- | --- | --- | --- |
| Agent user | Inspect what an agent actually asked a tool to do. | Reliable call-specific input visibility. | Preserve existing runs and workspace content. |
| Runtime integration maintainers | Normalize provider evidence for the existing product path. | Live/saved parity without execution changes. | Undocumented provider files cannot be assumed permanently stable. |

## Scope Guardrail
### In-Scope Use Cases
| ID | Use case | Scenarios |
| --- | --- | --- |
| UC-001 | Inspect newly recorded Antigravity native edit/write inputs. | SCN-001 |
| UC-002 | Inspect newly recorded inputs of other configured Antigravity native tools. | SCN-002 |
| UC-003 | Reopen those calls in AutoByteus history. | SCN-003 |
| UC-004 | Continue normal execution when detailed argument evidence is unavailable or untrustworthy. | SCN-004 |

### Out Of Scope
- Changing provider execution, prompts, permission policy, model selection, configured tool availability, background-task semantics or orchestration.
- Redesigning Activity, adding a dedicated diff viewer, or recovering result/output bodies; the edit-output gap is a separate observed concern.
- Rewriting/backfilling previously stored incomplete calls. Old native transcripts may allow recovery, but that needs a separate explicit decision.
- Broad claims about every AGY release, remote runtime filesystem or unobserved native-tool families.
- Changes to Codex, Claude, AutoByteus-native or MCP-tool behavior.

### Non-Goals
No promise of exact full inputs when the provider never records them or call association cannot be established. No new UI completeness badge or performance SLA is proposed.

### Preserved Behavior Boundary
BEH-001–BEH-004; REQ-003 and REQ-004. Existing runs, user files and stored history must not be reset or rewritten. Observation must not execute or replay tools.

### Review Authority
A blocking design/implementation finding must cite an approved REQ/AC or preserved-behavior ID. New product policies, compatibility/migration promises or adjacent improvements are requirement gaps needing user approval; reviewer suggestions do not amend this scope.

## Requirements
| ID | Approved requirement | Behavior | Priority | Rationale / Source |
| --- | --- | --- | --- | --- |
| REQ-001 | For newly recorded configured native calls, expose the actual input fields available in reliable, call-specific provider evidence, rather than treating display summaries as complete inputs. Preserve field names, JSON values/types and content exactly, including multiline text, false, zero, empty strings and collections when supplied. | BEH-001, BEH-002 | Must | Original investigation request and native reproduction. |
| REQ-002 | Keep verified tool arguments consistent between live Activity and subsequently reopened history, including new calls in resumed runs. | BEH-003 | Must | Existing live/history inspection product surfaces. |
| REQ-003 | Do not guess inputs, match by target path alone, substitute later file contents, or attach another step/conversation's inputs. Unavailable or unsafe detailed evidence must leave existing verified summary fields usable without failing the turn solely for observability. | BEH-004 | Must | Actual arguments must be trustworthy; existing guarded provider-file reads. |
| REQ-004 | Preserve tool execution, results/status conventions, names and exact invocation/turn identity, MCP projection, image-path behavior, other runtimes and pre-existing saved traces. | All | Must | Explicit narrow observability scope. |

## Acceptance Criteria
| ID | Requirements / Scenarios | Trigger | Observable expected outcome | Alternate / verification intent |
| --- | --- | --- | --- | --- |
| AC-001 | REQ-001, REQ-004; SCN-001 | A native replacement with known target/original/replacement strings and supplied options completes. | Its Activity Arguments show actual TargetContent, ReplacementContent and supplied range/options; the intended file change and status are unchanged. | Two edits to the same path remain distinguishable by invocation, not merely filename. Native runtime plus canonical-path checks. |
| AC-002 | REQ-001; SCN-001 | A native write supplies known CodeContent and Overwrite. | Actual written input text and supplied options appear with correct JSON types. | Empty/multiline content is preserved when actually supplied. |
| AC-003 | REQ-001, REQ-004; SCN-002 | Read, grep, find and shell calls supply ranges, filters, depth/type or Cwd/timing flags. | Those actual supplied inputs are visible per call; directory and image calls retain their previously available inputs/behavior. | No fields fabricated merely because a prompt requested them. Deterministic payload checks plus representative native probe. |
| AC-004 | REQ-002, REQ-004; SCN-003 | Reload/reopen a run containing newly recorded enriched calls. | The same typed arguments remain associated with the same calls; old incomplete history is still readable and unchanged. | New and resumed-run coverage; no native transcript required for reopening already recorded complete calls. |
| AC-005 | REQ-003, REQ-004; SCN-004 | Detailed evidence is unavailable, malformed, not safely readable, or ambiguously associated. | Existing verified summary inputs remain usable, no incorrect content is attached, and execution/lifecycle continue under existing semantics. | Failure-origin checks; unavailable evidence is not accepted as a successful completeness test. |
| AC-006 | REQ-004; all | Representative MCP calls, image path handling and normal failure/interruption paths run. | Existing names, input/result conventions and lifecycle identities remain unchanged; no tool is replayed. | Regression checks for the preserved boundaries; no image-generation spend needed merely to recheck unrelated argument recovery. |

## Relevant Scenarios And Journeys
| ID | Kind / actor / goal | Supported trigger and start | Product-level sequence / outcome | Alternate | Validity / evidence |
| --- | --- | --- | --- | --- | --- |
| SCN-001 | User/System; agent user wants to inspect a native file change. | Agent Package Creator performs a configured native write/replacement. | Agent changes file; user expands Activity Arguments and sees the actual requested input. | Repeated edits to one path must not mix call content. | Supported Normal Scenario: supplied screenshot, actual persisted run and native probe. Enhanced visibility approved at SR-002. |
| SCN-002 | User/System; user inspects a read/search/shell call. | A configured native tool runs in the selected workspace. | User opens its Arguments to understand supplied range/filter/working-directory options. | Provider may omit optional inputs; do not invent them. | Supported Normal Scenario: production coverage and representative direct CLI probe. |
| SCN-003 | User; user reviews a saved call. | Reopen an existing Agent run through normal history. | Saved Activity/conversation calls retain arguments recorded for each invocation. | Historical summary-only calls remain summary-only under this approved scope. | Supported Normal Scenario: history projection code and actual saved traces. |
| SCN-004 | Operational/System; normal execution must tolerate unavailable optional provider evidence. | CLI still provides valid native stream events but detailed argument evidence cannot be reliably read. | Preserve stream summary and provider lifecycle; do not corrupt observability or fail solely due to detail lookup. | Ambiguous call association stays unresolved rather than guessing. | Supported Explicit Edge Scenario: existing best-effort guarded brain-file access for native images/background tasks; intended extension approved at SR-002. |

## UI, Interaction, And Experience Requirements
- Applicable: Yes, argument content within existing Activity/history surfaces only.
- UI/UX supplement/prototype/repository/ticket/visual approval: N/A — no redesign or Product Design requested.
- Preserve existing JSON presentation and expand/collapse interaction. No normative screenshot style changes proposed.
- Product decision: approved future-only fix; previously stored incomplete calls explicitly remain unchanged.

## Quality And Non-Functional Requirements
| ID | Canonical requirements / ACs | Area | Constraint | Verification |
| --- | --- | --- | --- | --- |
| QR-001 | REQ-001, REQ-002; AC-001–AC-004 | Reliability | Exact call-specific typed inputs survive capture and reopen. | Native/canonical/saved comparisons. |
| QR-002 | REQ-003, REQ-004; AC-005–AC-006 | Reliability / Privacy | Do not read unrelated conversations or leak their inputs; observation cannot alter execution or existing data. | Association/read-boundary and regression checks. |

## Data Continuity And Acceptable Loss
- Affected persisted data: newly recorded tool-argument content in the existing history path.
- Preserve existing traces, invocation identities, statuses, conversation history, selected workspace and user files.
- Acceptable loss/reset/rebuild: none of existing AutoByteus data. Missing optional detail remains unavailable rather than reconstructed falsely.
- No historical rewrite or new retention/privacy policy proposed. Recovery of old calls requires a separate decision.

## External Contracts And Dependencies
Installed `agy` 1.2.16 stream is demonstrably summary-only for tested native tools; the provider's local full transcript stores typed actual inputs. That file layout is internal/undocumented. Scope does not guarantee every future release or unobserved runtime configuration. Existing new-run native allowlist remains unchanged.

## Supplemental Artifacts
All supplements are under this ticket's absolute `evidence/` directory, indexed in investigation notes. `production-coverage.json`, `production-selected-calls.json`, `native-comparison.json`, direct probe `stdout.jsonl`, `transcript_full.jsonl`, `summary.json`, `launch.json` and timing evidence are factual evidence, not behavior-defining supplements.

## Assumptions, Open Decisions And Questions
- ASM-001: full-input exposure is useful beyond replace_file_content; supported by evidence of the same omission in writes/read/search/shell calls. Approved by USER-APPROVAL-2026-10-03-FUTURE-ONLY.
- DEC-001: SR-001 approved by USER-APPROVAL-2026-10-03-FUTURE-ONLY; feasibility confirmed. No open intended-behavior decision.
- Historical backfill and result-body/diff recovery are intentionally outside this baseline, not hidden implementation obligations.
- Source selection, safe association, bounded access and lifecycle integration are defined in design-spec.md at SR-003, within this unchanged approved behavior.

## Traceability
| Requirement | Use cases | Behaviors | ACs | Scenarios |
| --- | --- | --- | --- | --- |
| REQ-001 | UC-001, UC-002 | BEH-001, BEH-002 | AC-001–AC-003 | SCN-001, SCN-002 |
| REQ-002 | UC-003 | BEH-003 | AC-004 | SCN-003 |
| REQ-003 | UC-004 | BEH-004 | AC-005 | SCN-004 |
| REQ-004 | UC-001–UC-004 | All | AC-001, AC-003–AC-006 | All |

## Architecture Phase Input
Approval was captured at SR-002; architecture evidence and technical realization are documented in investigation-notes.md and design-spec.md at SR-003. Preserve native/MCP/image/result/status and stored history boundaries. Technical feasibility evidence is not an authoritative design.

## Readiness Check
Current behavior evidenced; desired/preserved behavior explicit; scope/non-goals clear; REQ/AC/SCN traceability and verification intent present; material dependency risks explicit. No prototype or normative supplement applies. **Content ready: Yes. User approval received: Yes. Exact approved baseline recorded: Yes. Approved basis ready for architecture: Yes.** Architecture design and classification belong to design-spec.md when complete; independent review artifacts N/A until the configured review route completes.
