# Requirements Document

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-004`
- Package identifier: `model-settings-reality`
- Request / ticket: Project Task `autobyteus-9` (Project `project_f34a9537-07d7-449a-b78f-16368f1aa619`): "Make model settings match reality: truthful Claude 'thinking Off', no stale config keys, LLM docs synced with the catalog, and newly released models usable without restarting the app." Absorbs autobyteus-10 and autobyteus-11.
- Requested by: `/project_task_manager` (run `project_task_manager_3a5fea41304e412da92575d61bd88570`), for the user
- Requirements owner: Solution Designer
- Date: 2026-11-10
- Approved by and reference: `Solution Designer within the direction (user informed)`; references: Solution Designer's message to the user, 2026-11-10 (SR-001); SR-002 clarifications (DEC-013..DEC-015) decided during design and reported to the user with the design, 2026-11-10; the user: "if you think it's clear now, then we could start to work on it now" (2026-11-10). Recorded in [solution-revision-record.md](solution-revision-record.md)
- Exact approved requirements baseline / solution revision: this document at SR-004 (SR-004 only states AC-012's failure alternate that QR-001 and REQ-013 already require; no new intended behavior)
- Behavior-defining supplements and their approved versions: None (evidence files are supporting, not behavior-defining)

## Problem And Desired Outcome

- Problem: Some model settings AutoByteus offers do not do what they say, some stored settings travel to providers or new runs although the model no longer declares them, the LLM docs describe removed models, and a model a provider releases while the app is running cannot be found or saved until the app restarts.
- Affected actors or systems: the user configuring, launching and editing agent/team/org runs; the AutoByteus runtime's provider requests; the Claude Agent SDK runtime's sessions; external runtimes' model lists; developers reading the LLM docs.
- Desired outcome: every setting shown has a real effect and its default is what the provider does when nothing is chosen; only declared settings reach providers and new runs; docs match the catalog; model pickers show the runtime's current models, refresh without a restart, and a refused Save says why and what to do.
- Observable definition of success: the acceptance criteria below pass, including live checks against Anthropic and a realistic app check where a runtime starts offering a new model while the app runs.

### Re-check against the latest origin/personal (user instruction, 2026-11-10)

Base `origin/personal` `310fc2745` (fetched 2026-11-10); rechecked against `fd0eb664c` later the same day: the 11 new commits (autobyteus-455) touch none of the cited files. Evidence: [investigation-notes.md](investigation-notes.md#re-check-against-latest-originpersonal-user-instruction-2026-11-10).

| Part | Still exists? | Evidence (short) |
| --- | --- | --- |
| A / FU-001 | Yes | Opus 5 and Fable 5 still use off shape `omit` (`anthropic-model-request-policy.ts` L38-39); live: both think with today's Off (PRB-A2) |
| A / FU-003 | The reported 400 **no longer reproduces**; Off is instead **ineffective** on the SDK runtime | live through Claude Code 2.1.280 and 2.1.322: `disabled` + xhigh accepted, and every current model still thinks with Off (PRB-A1) |
| B / FU-004 | Yes | 5 adapters + the OpenAI-compatible builder copy stored keys into requests (SRC-011) |
| B / FU-005 | Yes | `agent-run-provisioning-service.ts` L265 stores the submitted `llmConfig` unchanged (SRC-013) |
| C / FU-002 | Yes (wider than listed) | `rg "gemini-3.5-flash|kimi-k2" autobyteus-ts/docs` (SRC-016) |
| D | Yes, in the web client; the server already reads fresh lists | web store keeps the first list for the app's lifetime (SRC-023); server follows a Claude Code update without restart (PRB-D3) |

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Scenario IDs | Evidence-Backed Current Behavior | Desired Behavior | Intentionally Preserved Behavior | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | SCN-001 | AutoByteus Opus 5 "Off" sends nothing; the model thinks | Off turns thinking off (`disabled`), effort not sent | Effort levels and default (high) | PRB-A2, SRC-002 |
| BEH-002 | User | SCN-002 | AutoByteus Fable 5 offers Off, which cannot work | No Off; effort is the only setting (as Fable 5.1) | Effort levels and default (high) | PRB-A2, SRC-005 |
| BEH-003 | User | SCN-003 | Switch rows default to Off (`thinking_enabled:false`), unlike Anthropic (On) | Default = thinking On at the model's default effort | A saved explicit Off stays Off | SRC-003, SRC-009, SRC-005 |
| BEH-004 | User | SCN-001 | Sonnet 5 / Haiku 5.5 `disabled`, Sonnet 5.5 `between_tools`: real off; effort never sent with Off | Unchanged | Whole behavior | PRB-A2, SRC-004 |
| BEH-005 | User | SCN-004 | SDK runtime Off is passed to the CLI and has no effect on any current model | No thinking on/off choice on the SDK runtime; no `thinking` sent | Effort levels as the SDK reports them | PRB-A1, SRC-007/008 |
| BEH-006 | User | SCN-004 | SDK runtime writes and sends effort `medium` by default for every model | Unchosen effort sends nothing; shown as "Default" | A chosen level is sent | SRC-008/009 |
| BEH-007 | System | SCN-005 | Non-Anthropic AutoByteus adapters send every stored key | Only declared keys (+ model-owned defaults) reach the provider | Declared settings and model defaults are sent as today | SRC-011/012 |
| BEH-008 | User | SCN-005 | New standalone agent/team runs store the submitted config as is | Store and launch only declared keys | Launches that work today keep working | SRC-013/015 |
| BEH-009 | Contract | SCN-006 | Docs describe removed Gemini/Kimi rows | Docs describe only current catalog rows and current Claude settings | Rest of the docs | SRC-016 |
| BEH-010 | User | SCN-007, SCN-008 | Web pickers keep the first list per runtime until restart; no refresh control | Pickers refresh automatically when opened and on demand | Fast picker opening; selection flows | SRC-023/024/025 |
| BEH-011 | System | SCN-007, SCN-008 | Server reads each runtime's list fresh for options and validation | Unchanged | Whole behavior | PRB-D3, SRC-021 |
| BEH-012 | User | SCN-008 | Refused Save: "Model options for '<address>' are unavailable; saved settings were not changed." for both "not offered" and "list unreadable" | Names the model and scope, says nothing was saved and what to do; distinguishes an unreadable list | All-or-nothing Save | SRC-018/022 |

## Stakeholders, Actors, And Outcomes

| Actor / Stakeholder | Goal Or Responsibility | Required Outcome | Important Constraint |
| --- | --- | --- | --- |
| User (configures runs) | Choose model and thinking settings | Every option has an effect; defaults match the provider; new models usable without restart | No surprise failures; no restart |
| Provider APIs / runtimes | Receive requests | Only supported, declared settings | Anthropic per-model thinking rules |
| Developers | Read LLM docs | Docs match the catalog | — |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Related Scenario IDs |
| --- | --- | --- |
| UC-001 | Choose Claude thinking/effort on the AutoByteus runtime (composer, launch config, definitions, run settings) | SCN-001, SCN-002, SCN-003 |
| UC-002 | Choose Claude effort on the Claude Agent SDK runtime | SCN-004 |
| UC-003 | Launch or resume a run whose stored config holds keys the model does not declare | SCN-005 |
| UC-004 | Read the autobyteus-ts LLM design docs | SCN-006 |
| UC-005 | Find, select and launch with a model the runtime started offering after the app loaded its list | SCN-007 |
| UC-006 | Find, select and save such a model in a stopped run's settings (agent, team member, delegated copy, org scope), incl. after switching a scope's runtime | SCN-008 |

### Out Of Scope

- Adding new catalog rows to the AutoByteus runtime's built-in providers (e.g. `claude-fable-5-2`): their lists are curated in AutoByteus and arrive with an AutoByteus update (follow-up FU-001).
- Claude Code's own model-option caching and alias resolution (external, PRB-D4).
- Stabilizing Claude Agent SDK model identifiers across CLI versions; saved runs whose identifier disappears keep today's unavailable-model state.
- Non-Claude thinking menus (no evidence of an ineffective option was found or requested beyond Claude; the general rule is applied where this ticket changes settings).
- New validation refusals at launch for declared values (types/ranges) — launch keeps today's acceptance apart from dropping undeclared keys.

### Non-Goals

- Automatic background polling of model lists while no picker is open.
- Recommending effort levels per workload.

### Preserved Behavior Boundary

BEH-004, BEH-011; the all-or-nothing Save; Anthropic effort levels/defaults per model (autobyteus-8 REQ-002); validated save/edit/launch paths storing canonical selections (autobyteus-8 SR-005); runs naming a removed model keep the unavailable-model state; every saved run and definition keeps launching and resuming (DC below).

### Prerequisites

None.

| Prerequisite ID | Finding And Evidence | Blocks | Sent To / Task Key | Status |
| --- | --- | --- | --- | --- |
| — | — | — | — | — |

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID that it protects.
- A finding that would introduce new product behavior, policy, threat model, migration obligation, compatibility promise, or operational contract is a `Requirement Gap`; it requires explicit user approval before becoming authoritative.
- An adjacent concern outside the approved boundary may be recorded as a non-blocking risk, recommendation, or follow-up. It is not a required design correction, unless it is a prerequisite.
- A downstream reviewer comment does not amend this requirements basis.

## Requirements

| Requirement ID | Requirement | Related Behavior IDs | Priority | Rationale | Feasibility Evidence | Source / Decision |
| --- | --- | --- | --- | --- | --- | --- |
| REQ-001 | AutoByteus runtime, `claude-opus-5`: Off sends thinking `disabled` and no effort; thinking is then really off. | BEH-001 | Must | "If it can, Off must really turn it off." | PRB-A2: `disabled` → 0 thinking tokens; with no effort sent, no 400 | Task comment; DEC-001, DEC-003 |
| REQ-002 | AutoByteus runtime, `claude-fable-5`: no thinking on/off choice; effort (API default high) is its only setting; a stored `thinking_enabled` (any value) has no effect and never fails a request, launch or resume. | BEH-002 | Must | Fable 5 cannot turn thinking off. | PRB-A2 (`disabled` → 400; default thinks); SRC-004 L141-145 (local failure to avoid) | Task comment |
| REQ-003 | AutoByteus runtime: every Claude row with a thinking switch (Opus 5, Sonnet 5, Sonnet 5.5, Haiku 5.5) defaults to thinking On at the model's default effort; what the UI shows for an untouched setting equals what is sent. A saved explicit choice keeps its meaning. | BEH-003 | Must | "the provider's defaults are used as they are" | SRC-005 (all four default On) | Task comment; DEC-002 |
| REQ-004 | AutoByteus runtime: choosing Off on any Claude switch row never produces a rejected request, whatever effort is stored. | BEH-004 | Must (preserve) | "Off never fails" | PRB-A2 (only `disabled`+xhigh fails; effort not sent while Off) | Task comment |
| REQ-005 | Claude Agent SDK runtime: no thinking on/off choice is offered for any model, and AutoByteus sends no `thinking` setting; stored `thinking_enabled` values have no effect and never fail. | BEH-005 | Must | Off has no effect there; "if off does nothing, do not show it". | PRB-A1 (thinking continues with Off on every current model, both CLIs) | Task comment; DEC-004, DEC-012 |
| REQ-006 | Claude Agent SDK runtime: effort offers the levels the SDK reports for the model; an unchosen effort sends nothing and reads "Default"; a chosen level is sent. | BEH-006 | Must | Provider defaults as they are; the SDK reports no default level. | PRB-A1 (effort changes thinking 118→238→405 tokens); SRC-010 ("Default" rendering exists) | DEC-005 |
| REQ-007 | AutoByteus runtime (every provider adapter) and the Claude Agent SDK runtime: a request or session carries only the model settings the selected model's current schema declares (stored as top-level keys or inside the `extra_params` container), plus the model's own catalog defaults; any other stored settings key is not sent. Standard LLM config fields (`temperature`, `max_tokens`, penalties, stop sequences, limits) keep today's handling. | BEH-007 | Must | FU-004 | N/A | Task Part B; DEC-013 |
| REQ-008 | A new standalone agent or team run (from a definition default, the composer, or an application launch) stores and launches only declared settings: on the AutoByteus runtime the keys the selected model's schema declares (as REQ-007); on an external runtime the settings keys that runtime reads. Undeclared keys are dropped silently, standard LLM config fields are kept, and a launch that succeeds today still succeeds. | BEH-008 | Must | FU-005 | N/A | Task Part B; DEC-007, DEC-014 |
| REQ-009 | `autobyteus-ts` LLM design docs name only models in the current catalog as current, and describe the Claude thinking settings as delivered by this ticket. | BEH-009 | Should | FU-002 | N/A | Task Part C |
| REQ-010 | Every model picker (new-run launch config on desktop and mobile, application launch profiles, the composer's model choice where present, stopped-run settings for an agent, team member, delegated copy and org scope, including a scope switched to another runtime) refreshes the runtime's model list when it opens, without hiding or blocking the list already shown. | BEH-010 | Must | Lists stay current without a restart. | PRB-D3 (fresh server read follows a runtime update) | Task Part D; DEC-008, DEC-009 |
| REQ-011 | Every model picker offers a "Refresh models" action that re-reads the runtime's list (on the AutoByteus runtime also re-discovering Ollama, LM Studio and custom providers) and updates every picker showing that runtime. | BEH-010 | Must | The user can force a reload when he knows a model was released. | Existing server reload for discovered providers (SRC-017) | Task Part D; DEC-008, DEC-009, DEC-010 |
| REQ-012 | A model the runtime offers at the time of the action can be selected, launched and saved without restarting the app, in new-run launch config and in stopped-run settings (agent, team member, delegated copy, org scope). | BEH-010, BEH-011 | Must | Task "Done when". | PRB-D3 | Task Part D |
| REQ-013 | When a Save or launch is refused because the selected model is not in the runtime's current list, the message names the model and the scope, says nothing was saved, and tells the user to refresh the model list and choose again. When the runtime's list could not be read, the message says that instead and suggests trying again. | BEH-012 | Must | "the message should say what the user can do and that nothing was saved" | SRC-018 (read failures currently look like "not offered") | Task Part D; DEC-011 |
| REQ-014 | Refresh covers every runtime whose list comes from a live source: Claude Agent SDK, Codex, Antigravity, Grok Build, DeepSeek Harness, and the AutoByteus runtime's discovered providers. The AutoByteus runtime's built-in provider rows are curated in AutoByteus; refresh re-reads them but a newly released provider model there arrives with an AutoByteus update. | BEH-010 | Must | Scope of Part D. | SRC-017, SRC-020 | DEC-010 |

## Acceptance Criteria

| AC ID | Requirement IDs | Behavior / Scenario IDs | Preconditions / Trigger | Observable Expected Outcome | Alternate / Failure Outcome | Verification Intent |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001, REQ-004 | BEH-001, SCN-001 | AutoByteus runtime, `claude-opus-5`, Off, stored effort `max` | Request carries `thinking:{type:'disabled'}` and no effort; live response has no thinking (0 thinking tokens) and is not rejected | — | Unit (request shape) + live test asserting no thinking |
| AC-002 | REQ-002 | BEH-002, SCN-002 | Thinking menu for `claude-fable-5` (composer, launch config, definition, run settings) | Effort list only (Low…Max, default High); no Off | Stored `{thinking_enabled:false, reasoning_effort:'max'}` resumes and launches; request has adaptive thinking + effort `max`, no local failure | Unit (schema, adapter) + live resume/launch |
| AC-003 | REQ-003 | BEH-003, SCN-003 | New run on Opus 5 / Sonnet 5 / Sonnet 5.5 / Haiku 5.5 with settings untouched | Menu shows the model's default level (On); request = adaptive thinking (+ default effort or none) | A run saved with explicit Off still sends its Off shape | Unit (schema default, web default config) + rendered check |
| AC-004 | REQ-004 | BEH-004 | Each AutoByteus switch row, Off with stored `xhigh` / `max` | Live request accepted; thinking off (or `between_tools` on Sonnet 5.5) | — | Live test per row asserting acceptance and no up-front thinking where measurable |
| AC-005 | REQ-005 | BEH-005, SCN-004 | Claude Agent SDK runtime, any model's thinking menu | No Off/On choice; session options contain no `thinking` | Stored `{thinking_enabled:false, reasoning_effort:'xhigh'}` resumes; session has effort `xhigh`, no `thinking`, no failure | Unit (normalizer schema, session config) + live SDK session |
| AC-006 | REQ-006 | BEH-006, SCN-004 | Claude Agent SDK runtime, effort untouched | Menu reads "Default"; session options contain no effort; choosing `high` sends `high` | — | Unit + live SDK session |
| AC-007 | REQ-007 | BEH-007, SCN-005 | AutoByteus runtime, each adapter family (OpenAI-compatible, OpenAI Responses, Mistral, Gemini, Ollama), stored config with one declared key and one undeclared key | Provider request contains the declared key (and catalog defaults) but not the undeclared key | Model without a schema: no stored key is sent; catalog defaults still sent | Unit per adapter family (request capture) |
| AC-008 | REQ-008 | BEH-008, SCN-005 | Definition default / composer / application launch with `{reasoning_effort:'low', thinking_display:'omitted'}` (Claude), and a team launch likewise | New run's stored `llmConfig` = `{reasoning_effort:'low'}`; run starts and replies | A config with only undeclared keys stores `null` and launches | Server unit/integration + realistic launch check (API-11 rerun) |
| AC-009 | REQ-009 | BEH-009, SCN-006 | `rg -n "gemini-3.5-flash|kimi-k2" autobyteus-ts/docs` | No hit presenting a removed model as current; Claude settings described as delivered | — | Doc grep + review |
| AC-010 | REQ-010, REQ-012, REQ-014 | BEH-010, SCN-007 | App running; the runtime starts offering a new model (simulated: Claude Code CLI swapped/updated; or a new Ollama/custom model) | Opening the new-run launch config picker shows the new model within one refresh, without restart; selecting it launches the run | Refresh failure keeps the last list and shows the error with Retry | Realistic app check (isolated Electron, test vault, CLI symlink swap) + web unit tests |
| AC-011 | REQ-011, REQ-014 | BEH-010, SCN-007 | Picker open; user chooses "Refresh models" | List re-read for that runtime; every open picker for that runtime updates | On the AutoByteus runtime, discovered providers are re-discovered | Web unit + realistic check |
| AC-012 | REQ-010, REQ-012, REQ-013 | BEH-010/011/012, SCN-008 | Stopped team run; member or delegated copy switched to the Claude Agent SDK runtime after the CLI started offering a new model | The new model is listed, selected, Save succeeds and the stored selection names it | SR-004 (QR-001, REQ-013 on this surface): the runtime's list cannot be read — a refresh keeps the shown models and shows the refresh error with Retry; a first read shows the error with Retry; in both cases the saved model is not marked "No longer offered" and stays editable | Realistic app check reproducing the user's journey |
| AC-013 | REQ-013 | BEH-012, SCN-008 | Save with a selection the runtime's current list does not contain | Refusal text names the model and scope, says nothing was saved, and says to refresh the model list and choose again | List unreadable (e.g. runtime CLI failing): refusal says the list could not be read and to try again | Server unit tests per refusal site + rendered check |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor | Goal | Trigger / Entry | Start | Steps | Expected Outcome | Alternate / Error | Validity | Evidence | REQ / AC |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | User | User | Run Claude without thinking | Thinking menu → Off (composer, launch config, run settings) | AutoByteus runtime, Opus 5/Sonnet 5/Sonnet 5.5/Haiku 5.5 | Pick Off; send a message | No up-front thinking; never rejected | Stored xhigh/max ignored while Off | Supported Normal Scenario | PRB-A2 | REQ-001, REQ-004; AC-001, AC-004 |
| SCN-002 | User | User | Configure Fable 5 | Thinking menu | AutoByteus runtime, Fable 5 | Open menu; pick an effort | Effort list only | Old run with stored Off resumes normally | Supported Normal Scenario | PRB-A2 | REQ-002; AC-002 |
| SCN-003 | User | User | Start a run with defaults | New run, untouched settings | Switch row selected | Launch | Provider default (thinking On, default effort) | — | Supported Normal Scenario | SRC-005 | REQ-003; AC-003 |
| SCN-004 | User | User | Configure Claude on the SDK runtime | Thinking menu | Claude Agent SDK runtime | Open menu; leave Default or pick a level | Effort only; Default sends nothing | Stored Off/medium from earlier runs resume | Supported Normal Scenario | PRB-A1 | REQ-005, REQ-006; AC-005, AC-006 |
| SCN-005 | System | Run launch/resume | Send only declared settings | Launch from definition/composer/application; resume | Stored config holds an undeclared key | Launch or resume | Key not stored in a new run, not sent | — | Supported Normal Scenario | SRC-011, SRC-013, SRC-015 | REQ-007, REQ-008; AC-007, AC-008 |
| SCN-006 | Contract | Developer | Understand the LLM module | Read docs | — | — | Docs match catalog | — | Supported Normal Scenario | SRC-016 | REQ-009; AC-009 |
| SCN-007 | User | User | Use a just-released model in a new run | Open launch config model picker, or choose Refresh models | App running; runtime now offers a model it did not offer when the list loaded | Open picker (auto refresh) or Refresh → select → launch | Model listed, launch succeeds, no restart | Refresh fails → last list kept, error + Retry | Supported Normal Scenario | User report (autobyteus-11); PRB-D3 | REQ-010..012, REQ-014; AC-010, AC-011 |
| SCN-008 | User | User | Switch a stopped team member/delegated copy to a just-released model | Run settings → Team settings → member model picker | Stopped team run; runtime offers a new model | Open picker (auto refresh) → select → Save | Save succeeds | Model not offered any more / list unreadable → actionable refusal, nothing saved | Supported Normal Scenario | User report (autobyteus-11); SRC-021/022/024 | REQ-010, REQ-012, REQ-013; AC-012, AC-013 |

## UI, Interaction, And Experience Requirements

- Applicable: `Yes` (small, within existing components)
- Linked UI/UX or interaction supplement: N/A — not applicable (no Product Design requested)
- Linked runnable UI reference, separate design repository/root, UI/UX specification: N/A — not applicable
- Product ticket record and folder: N/A — not applicable
- Design repository revision or commit: N/A — not applicable
- UI/UX user-confirmation reference: N/A — not applicable
- Approved visual-reference baseline: N/A — not applicable
- Normative visual and interaction details: (1) thinking menus as today, minus the removed choices (REQ-002, REQ-005) and with "Default" for an unchosen SDK effort (REQ-006); (2) a "Refresh models" action inside each model picker, using the picker's existing look, with a busy state while reading and the existing error/Retry presentation on failure (REQ-011, QR-001); (3) refusal texts per REQ-013.
- Explicitly illustrative content or permitted variation: exact icon/label placement of the refresh action inside the picker; refusal wording beyond the required content.
- Required states: refreshing (current list still usable), refreshed, refresh failed (last list kept + error + Retry).
- Product decisions that need the user: none (DEC-008/009 decided within the Task's delegation to the team).

## Quality And Non-Functional Requirements

| Quality ID | Related REQ / AC | Area | Measurable Requirement Or Constraint | Conditions / Scope | Verification Intent |
| --- | --- | --- | --- | --- | --- |
| QR-001 | REQ-010, REQ-011; AC-010 | Performance | Opening a picker shows the current list immediately (no wait on refresh); a failed refresh never empties a list that loaded before | All pickers | Web unit tests with a slow/failing catalog response |
| QR-002 | REQ-010, REQ-011 | Reliability | Concurrent refreshes of one runtime result in at most one in-flight server read; a late response never overwrites a newer one | Web store | Web unit tests |
| QR-003 | REQ-008 | Performance | New-run creation adds no runtime catalog read (e.g. no Claude CLI spawn, ≈2.3 s) to launches | Standalone agent/team launch | Design + measured launch time in the realistic check |

## Data Continuity And Acceptable Loss

- Persisted or external data affected: `Yes` (stored `llmConfig` of runs, definitions, application launch profiles).
- Data or state that must be preserved: every saved run and definition keeps launching/resuming; explicit Off on AutoByteus switch rows keeps meaning Off (now real on Opus 5); stored effort choices keep their value.
- Loss, reset, rebuild, or regeneration that is acceptable: keys that no longer have an effect (`thinking_enabled` on Fable 5 and on the SDK runtime; undeclared keys) become inert and disappear at the next validated save; no migration.
- Constraints: no new launch/resume failure from stored data (AC-002, AC-005, AC-008).
- Unknowns requiring downstream investigation: how many stored SDK configs carry the earlier default `reasoning_effort:'medium'` (they keep sending medium; indistinguishable from a user's choice — accepted, DEC-005).

## External Contracts And Dependencies

| Contract / Dependency | Required Behavior Or Constraint | Evidence / Authority | Uncertainty Or Risk |
| --- | --- | --- | --- |
| Anthropic Messages API thinking/effort | Per-model Off shapes, defaults, rejections | SRC-005, SRC-006, PRB-A2 | Changes with new models |
| Claude Agent SDK 0.3.280 + Claude Code CLI | Model list, alias resolution, handling of `thinking`/`effort` | PRB-A1, PRB-D1..D4 | A future CLI could honor `disabled` (RSK-001) |
| External runtimes' model lists (Codex, Antigravity, Grok Build, DeepSeek Harness) | Read on demand | SRC-020 | Their own caching |

## Supplemental Artifacts

| Artifact Path | Purpose | Related REQ / AC | Status | Approval Applicability |
| --- | --- | --- | --- | --- |
| [evidence/probe-results-2026-11-10.md](evidence/probe-results-2026-11-10.md) | Probe outputs | REQ-001..006, REQ-010..014 | Final | Evidence only |
| [probes/](probes/) | Reproduction scripts | AC-001, AC-004..006, AC-010 | Final | Evidence only |

## Assumptions

| Assumption ID | Assumption | Why Necessary | Validation Plan / Owner | Status |
| --- | --- | --- | --- | --- |
| ASM-001 | The user's Part D refusal came from a stale client list against a fresh server read (or an unreadable list) | Exact incident not reproducible here | Covered by AC-010, AC-012, AC-013 regardless of which | Accepted |

## Decisions

| Decision ID | Question | Why It Matters | Options / Evidence | Reasoning And Recommendation | Decision Owner | Status |
| --- | --- | --- | --- | --- | --- | --- |
| DEC-001 | Keep Off on Opus 5? | User: show Off only if verified real | PRB-A2: `disabled` → 0 thinking tokens | Verified real; keep Off, sent as `disabled` with no effort | Solution Designer | Decided |
| DEC-002 | Default of switch rows | Visible default and cost | Anthropic default On for all four rows (SRC-005); today Off | The user's direction is "provider defaults as they are" and "what is shown must be what happens"; default On at the model's default effort. Costs more thinking tokens on new runs (RSK-004); saved runs keep their stored choice | Solution Designer (user's direction) | Decided |
| DEC-003 | Mention Opus 5's documented Off caveat? | Anthropic notes tool-call/XML leakage with thinking off on Opus 5 | SRC-005 | Keep Off and say it in the switch description so the choice is informed | Solution Designer | Decided |
| DEC-004 | SDK runtime: repair Off or remove it? | Task suggested "Off does not send a stored effort" | PRB-A1: Off does nothing on every current model, both CLIs; 400 no longer reproduces | Repairing the effort pairing would keep an option that has no effect; the user's rule says do not show it. Remove the switch and send no `thinking` | Solution Designer | Decided |
| DEC-005 | SDK runtime effort default | Shown default must be what happens | SDK reports levels, no default; today `medium` for all, though Fable/Sonnet default high | Inventing a per-model default for models AutoByteus does not know (e.g. Fable 5.2) would mislabel; show "Default" and send nothing until a level is chosen. Stored `medium` from before stays (indistinguishable from a choice) | Solution Designer | Decided |
| DEC-006 | Existing AutoByteus Opus 5 runs storing Off | Their behavior changes from thinking to not thinking | They show "Off" | Off means off; the stored choice is honored. No migration | Solution Designer | Decided |
| DEC-007 | Undeclared keys at new-run launch: drop or refuse? | Launch reliability | autobyteus-8 validator omits undeclared keys | Drop silently, consistent with validated paths; no new launch refusals | Solution Designer | Decided |
| DEC-008 | Refresh: automatic, on demand, or both? | Task leaves it to the team | Server read is fresh and per request (PRB-D3); Claude read ≈2.3 s | Both: automatic when a picker opens keeps lists current with no action; an explicit Refresh covers "I know it was just released" and gives feedback. Background, non-blocking (QR-001) | Solution Designer | Decided |
| DEC-009 | Where in the UI | Task leaves it to the team | All pickers share one store (SRC-025) | Inside every model picker (one shared control), not a separate settings page; refreshing one runtime updates all its pickers | Solution Designer | Decided |
| DEC-010 | Which runtimes/providers | Task leaves it to the team | SRC-017, SRC-020 | All live sources (REQ-014); built-in AutoByteus rows are curated code (new rows via update; FU-001 for Fable 5.2) | Solution Designer | Decided |
| DEC-011 | Refusal message content | User idea: say what to do and that nothing was saved | SRC-022, SRC-018 | Name model + scope; nothing saved; "refresh the model list and choose again"; distinct text when the list could not be read | Solution Designer | Decided |
| DEC-013 | Do settings inside the `extra_params` container count, and do standard fields? | Applications set AutoByteus model settings only through `extra_params` (portable launch schema); standard fields are typed config, not raw forwarding | `application-portable-launch-config-schemas.ts` L55-90; no in-repo application uses `extra_params` | Project both top-level settings and `extra_params` entries onto declared keys (otherwise the container is a bypass of REQ-007); leave standard fields untouched (they are a typed contract applications use) | Solution Designer | Decided (SR-002) |
| DEC-014 | What does "declared" mean for an external runtime at run creation? | The model's live schema needs a runtime catalog read (≈2.3 s Claude CLI spawn) on every launch (QR-003) | PRB-D1; backends read fixed keys (`claude-session-config.ts`, Codex normalizer, ACP launcher) | Use the keys the runtime's backend reads, exported by that backend; no launch-time catalog read. Residual: a key the runtime reads but a particular model does not declare is kept (as today) | Solution Designer | Decided (SR-002) |
| DEC-015 | Remove `thinking_enabled` from the application portable Claude launch schema? | It no longer has an effect on the SDK runtime | Removing it would make application bundles that declare it fail validation | Keep the portable schema; the key is dropped at run creation (REQ-008), so launches keep working | Solution Designer | Decided (SR-002) |
| DEC-012 | FU-003 as written | The 400 no longer reproduces | PRB-A1 | Record as no longer reproducing; superseded by DEC-004 (no `thinking` sent at all) | Solution Designer | Decided |

## Traceability

| Requirement ID | Use-Case IDs | Behavior IDs | AC IDs | Scenario IDs | Evidence |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | UC-001 | BEH-001 | AC-001 | SCN-001 | PRB-A2 |
| REQ-002 | UC-001 | BEH-002 | AC-002 | SCN-002 | PRB-A2 |
| REQ-003 | UC-001 | BEH-003 | AC-003 | SCN-003 | SRC-005 |
| REQ-004 | UC-001 | BEH-004 | AC-001, AC-004 | SCN-001 | PRB-A2 |
| REQ-005 | UC-002 | BEH-005 | AC-005 | SCN-004 | PRB-A1 |
| REQ-006 | UC-002 | BEH-006 | AC-006 | SCN-004 | PRB-A1 |
| REQ-007 | UC-003 | BEH-007 | AC-007 | SCN-005 | SRC-011 |
| REQ-008 | UC-003 | BEH-008 | AC-008 | SCN-005 | SRC-013, SRC-015 |
| REQ-009 | UC-004 | BEH-009 | AC-009 | SCN-006 | SRC-016 |
| REQ-010 | UC-005, UC-006 | BEH-010 | AC-010, AC-012 | SCN-007, SCN-008 | SRC-023..025 |
| REQ-011 | UC-005, UC-006 | BEH-010 | AC-011 | SCN-007 | SRC-017 |
| REQ-012 | UC-005, UC-006 | BEH-010, BEH-011 | AC-010, AC-012 | SCN-007, SCN-008 | PRB-D3 |
| REQ-013 | UC-006 | BEH-012 | AC-013 | SCN-008 | SRC-018, SRC-022 |
| REQ-014 | UC-005, UC-006 | BEH-010 | AC-010, AC-011 | SCN-007 | SRC-017, SRC-020 |

## Architecture Phase Input

- Approved scenario IDs: SCN-001..SCN-008.
- Constraints to preserve: Preserved Behavior Boundary; QR-001..QR-003; Data Continuity.
- Decisions deferred to architecture: owner of the declared-key projection (central config projection vs per adapter); schema source for new-run creation without a catalog read (QR-003); web store revalidation mechanism and the shared picker control; how `listModels` failures reach the refusal (REQ-013).
- Technical facts to verify: Fable 5 resume path with stored `thinking_enabled:false`; every consumer of `thinking_enabled` for the SDK runtime; team/org launch creation paths; composer model choice surfaces; Codex/Antigravity reads under concurrent refresh.
- Known risks: RSK-001..RSK-004 (investigation notes).

## Readiness Check

### Content Ready For Approval

- Relevant current behavior is evidence-backed: `Yes`
- Desired and preserved behavior are explicit: `Yes`
- Scope and non-goals are clear: `Yes`
- Requirements and acceptance criteria are testable and traceable: `Yes`
- Applicable scenarios are covered with validity and evidence: `Yes`
- Product design and supplemental evidence is integrated consistently: `N/A`
- Applicable UI/UX approval and final visual-reference basis are recorded: `N/A`
- Material assumptions and decisions are visible, each decision with reasoning and recommendation: `Yes`
- Content ready for approval: `Yes`
- Remaining content blocker: None

### Approved Basis Ready For Design

- Approval recorded: `Yes` (Solution Designer within the direction, user informed, 2026-11-10)
- Exact requirements and supplement approval basis recorded: `Yes` (SR-001)
- Approved requirements package ready for architecture design: `Yes`
- Remaining blocker: None
