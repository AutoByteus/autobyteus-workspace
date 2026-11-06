# Requirements Document

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-002`
- Package identifier: `deepseek-dsh-runtime-investigation`
- Request / ticket: Project Task `autobyteus-387` (project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`)
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), for the user
- Requirements owner: Solution Designer
- Date: 2026-11-06
- Approved by and reference: `Solution Designer within the direction (user informed)`. The direction is the user's own words in the Solution Designer conversation of 2026-11-05/06 (quoted in `investigation-notes.md`, Initial Request And Clarifications): build the dsh runtime in this ticket, the key from the vault through our proxy, dsh changes handled as bugs, real-API experiments. The defaults in DEC-004…DEC-006 were presented to the user ("These defaults go in unless you say otherwise") before he answered "lets go with the ticket". The user was informed of this approval in the same conversation.
- Exact approved requirements baseline / solution revision: this document at SR-002
- Behavior-defining supplements and their approved versions: None

## Problem And Desired Outcome

- Problem: AutoByteus cannot run agents on DeepSeek's own agent program, DeepSeek Harness (`dsh`). dsh speaks ACP, but AutoByteus's shared ACP backend restores only with `session/load`, delivers instructions only through Grok-specific `_meta`, reads usage and compaction only from agent extension notifications, and dsh reports neither per-call usage nor compaction over ACP. Without compaction events, a dsh run's raw trace would grow without bound. dsh resolves its DeepSeek key from its own file or the environment, which the user's key rules forbid.
- Affected actors or systems: AutoByteus users; the server's run lifecycle, credential proxy, agent memory and Agent Runtimes page; DeepSeek's API.
- Desired outcome: DeepSeek Harness is a selectable runtime with the same run lifecycle as Grok Build. It uses the DeepSeek key from the AutoByteus vault through the credential proxy, never giving the key to dsh. Raw traces rotate on dsh's compactions, and per-call token usage is recorded.
- Observable definition of success: the acceptance criteria below pass against the real DeepSeek API with the test vault.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Related Scenario IDs | Evidence-Backed Current Behavior | Desired Behavior | Intentionally Preserved Behavior | Investigation Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | SCN-001 | No current supported behavior for dsh | A user creates a run with runtime DeepSeek Harness; one dsh process and session serve it | Other runtimes unchanged | BEH-001 notes |
| BEH-002 | User | SCN-002 | — | Messages, thoughts, tool calls with results and approvals appear as for Grok | Mid-turn input refused as for every ACP runtime | RT-003/006/008 |
| BEH-003 | User | SCN-003 | — | Stop ends the turn and the command | — | RT-013 |
| BEH-004 | System | SCN-004 | ACP restore requires `session/load` | A dsh run is restored with `session/resume` and continues its conversation | Grok restore by `session/load` unchanged | RT-002/009 |
| BEH-005 | User | SCN-005 | — | The model list shows dsh's models; the chosen model and reasoning effort apply | — | RT-001/002 |
| BEH-006 | System | SCN-001, SCN-004 | Instructions only at `session/new` via `_meta` | The agent's instructions reach dsh literally on every launch | Grok `_meta.rules` unchanged | RT-018 |
| BEH-007 | System | SCN-001 | Skills linked per runtime folder | The agent's configured skills, and only those, are available to dsh in any workspace | Other runtimes' folders unchanged | RT-010/011/012/018 |
| BEH-008 | System | SCN-002 | Agent Tools over HTTP MCP | Agent Tools are callable by dsh and shown under their AutoByteus names | — | RT-012 |
| BEH-009 | System | SCN-001, SCN-006 | Proxy forwards integration calls only | dsh's model calls go through the credential proxy, which adds the vault key; dsh and its shells never hold the key | Integration routes, passes and activity log unchanged | RT-007/018 |
| BEH-010 | System | SCN-007 | Rotation only on reported compaction or runtime switch | Each dsh compaction is a compaction boundary: raw traces rotate and a compaction status appears | Rotation rules unchanged | RT-014/017 |
| BEH-011 | System | SCN-002 | Per-call usage only from agent extensions | Each dsh model call records token usage | — | RT-021 |
| BEH-012 | System | SCN-008 | 300 s without an ACP frame fails the run | A run whose model is still streaming is never failed for idleness | Real silence still fails the run | RT-016 |
| BEH-013 | User | SCN-009 | — | Settings → Agent Runtimes shows dsh installed/version/update and whether the DeepSeek key is set | Other runtimes' rows unchanged | BEH-013 notes |
| BEH-014 | System | SCN-010 | Work Journal translation per runtime; runtime switch generic | dsh tool calls read naturally in the Work Journal; switching to and from dsh continues from the journal | Journal format unchanged | BEH-014 notes |
| BEH-015 | System | SCN-001 | — | dsh's own subagent, team, workflow, goal, plugin-install and ask-user tools are off; its session-log upload is off; the user's own `~/.dsh` is never read or written | — | RT-008/018, DEC-004/006/007 |

## Stakeholders, Actors, And Outcomes

| Actor / Stakeholder | Goal Or Responsibility | Required Outcome | Important Constraint |
| --- | --- | --- | --- |
| User running agents | Use DeepSeek's agent program | dsh runs like the other runtimes | Key only in the vault |
| Server | Own run lifecycle, memory, usage | Same guarantees as Grok | No key in any child environment, log or file |
| DeepSeek API | Serve model calls | Receives the key only from the proxy | — |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Related Scenario IDs |
| --- | --- | --- |
| UC-001 | Create and use a dsh run (turns, tools, approvals, Agent Tools, skills, stop) | SCN-001, SCN-002, SCN-003 |
| UC-002 | Restore a dsh run | SCN-004 |
| UC-003 | Choose a dsh model and reasoning effort | SCN-005 |
| UC-004 | Supply the DeepSeek key to dsh runs from the vault | SCN-006 |
| UC-005 | Keep raw traces bounded and usage recorded for dsh runs | SCN-007, SCN-002 |
| UC-006 | Keep long model steps alive | SCN-008 |
| UC-007 | See dsh on the Agent Runtimes page | SCN-009 |
| UC-008 | Read dsh work in the Work Journal; switch runtimes | SCN-010 |

### Out Of Scope

- Image prompt blocks for ACP runtimes (images keep reaching agents as file paths; dsh reads them with its own tool).
- DeepSeek account (browser) login for dsh; dsh's `web`, `sdk` and `headless` profiles.
- Compaction status details beyond what the proxy observes (dsh's own summary contents).
- The server's loading of provider keys from the data-dir `.env` into every agent (FU-001).
- Installing dsh or Node for the user.
- Moving Antigravity onto ACP (autobyteus-386).

### Non-Goals

- No guards or version gates against future dsh changes (DEC-003, DEC-014).
- No mid-turn input for dsh.

### Preserved Behavior Boundary

- Grok Build behavior: BEH-004, BEH-006 preserved columns; AC-016.
- Credential proxy integration behavior: BEH-009 preserved column; AC-017.

### Prerequisites

None.

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID that it protects.
- A finding that would introduce new product behavior, policy, threat model, migration obligation, compatibility promise, or operational contract is a `Requirement Gap`; it requires explicit user approval before becoming authoritative.
- An adjacent concern outside the approved boundary may be recorded as a non-blocking risk, recommendation, or follow-up. It is not a required design correction, unless it is a prerequisite (Prerequisites above).
- A downstream reviewer comment does not amend this requirements basis. The Solution Designer must update the canonical requirements and obtain renewed user approval before a scope-changing proposal can govern design or implementation.

## Requirements

| Requirement ID | Requirement | Related Behavior IDs | Priority / Criticality | Rationale | Feasibility Evidence | Source / Decision Reference |
| --- | --- | --- | --- | --- | --- | --- |
| REQ-001 | DeepSeek Harness is a runtime kind users can select for agents, Teams and Orgs, with one dsh process and one ACP session per run | BEH-001 | Must | User goal | RT-001, RT-008 | User request |
| REQ-002 | A dsh turn shows assistant text, thoughts, tool calls with results, and approval requests the user can allow or reject; with auto-execute on, approvals are answered allow automatically | BEH-002 | Must | Runtime parity | RT-003, RT-006, RT-008 | DEC-005 |
| REQ-003 | Stopping a dsh turn ends it and its running command; the run accepts the next message | BEH-003 | Must | Runtime parity | RT-013 | — |
| REQ-004 | A dsh run restored after a server restart continues the same dsh conversation through `session/resume` | BEH-004 | Must | Runtime parity | RT-002, RT-009 | — |
| REQ-005 | The model list for dsh lists the DeepSeek models dsh offers; a run uses the chosen model and reasoning effort | BEH-005 | Must | Model choice | RT-001, RT-002 | DEC-013 |
| REQ-006 | The agent's composed instructions reach dsh as literal text on every launch (new and restore), including any `{{…}}` text | BEH-006 | Must | Agent identity | RT-018 | DEC-017 |
| REQ-007 | dsh sees exactly the agent's configured skills, in any workspace, including a workspace inside a larger repository | BEH-007 | Must | Skills parity | RT-010…RT-012, RT-018 | DEC-008 |
| REQ-008 | Agent Tools are available to dsh over HTTP MCP and are shown and recorded under their AutoByteus tool names | BEH-008 | Must | Collaboration | RT-012 | — |
| REQ-009 | dsh's model calls reach DeepSeek only through the credential proxy, which adds the vault's DeepSeek key; the key is never in dsh's environment, files, arguments, logs, or its shells; a call without the run's live pass is refused | BEH-009 | Must | User's key rules | RT-007, RT-008, RT-018 | DEC-001, DEC-012 |
| REQ-010 | Each dsh compaction is recorded as a provider compaction boundary for the run: the completed compaction rotates the run's active raw traces, and the run shows a compaction status | BEH-010 | Must | Bounded raw traces | RT-014, RT-017 | DEC-009 |
| REQ-011 | Each dsh model call (turn and compaction) records per-call token usage from DeepSeek's reported counts | BEH-011 | Must | Usage parity | RT-021 | — |
| REQ-012 | A dsh turn is not failed for idleness while DeepSeek is still streaming to it; 300 s with neither ACP frames nor model-stream activity still fails it | BEH-012 | Must | Long reasoning | RT-016 | DEC-010 |
| REQ-013 | Settings → Agent Runtimes shows dsh: installed or not, version, latest version and update command, and whether the DeepSeek key is configured in AutoByteus (with where to set it) | BEH-013 | Must | Operability | Code read | DEC-018 |
| REQ-014 | dsh's built-in tools render in the Work Journal like other runtimes' equivalents; a runtime switch to or from dsh continues from the journal | BEH-014 | Should | Journal parity | Code read | — |
| REQ-015 | dsh's own subagent, team, workflow, goal, plugin-install and ask-user tools are not offered; its session-log upload is off; dsh runs use an AutoByteus-owned dsh home and never read or write the user's `~/.dsh` | BEH-015 | Must | Collaboration via AutoByteus; privacy; isolation | RT-008, RT-018, RT-022 | DEC-004, DEC-006, DEC-007 |

## Acceptance Criteria

| Acceptance-Criteria ID | Related Requirement IDs | Related Behavior / Scenario IDs | Preconditions / Trigger | Observable Expected Outcome | Important Alternate Or Failure Outcome | Verification Intent |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001, REQ-002 | BEH-001/002, SCN-001/002 | dsh installed, test-vault DeepSeek key; create a dsh run and ask it to create and read a file | The file exists; the run shows text, a `run_bash`-style card and a read card with results; turn completes | dsh not installed → run creation fails with an install message | Live gated E2E (flash) |
| AC-002 | REQ-002 | SCN-002 | Auto-execute off; a command that writes outside the workspace with escalation | An approval request appears; allow runs it; reject fails the call | Auto-execute on → approved automatically and recorded as such | Live gated E2E + unit |
| AC-003 | REQ-003 | SCN-003 | Turn running `sleep 60` | Stop ends the turn interrupted within seconds; the command does not finish; the next message works | — | Live gated E2E |
| AC-004 | REQ-004 | SCN-004 | A dsh run with one finished turn; restart the server; send a message referring to the first turn | The answer uses the earlier conversation; no `session/load` is sent | dsh session missing → restore fails with dsh's message | Live gated E2E + unit |
| AC-005 | REQ-005 | SCN-005 | Open the model list for dsh | The list shows dsh's offered DeepSeek models with reasoning-effort choices; a run with model X and effort Y sends `set_config_option` for both and runs on X | dsh unavailable → catalog diagnostic | Unit + live |
| AC-006 | REQ-006 | SCN-001/004 | Agent instructions contain `{{name}}` text and a distinctive rule | The run follows the rule after create and after restore; no template error | — | Live gated E2E |
| AC-007 | REQ-007 | SCN-001 | Agent with one configured skill; workspace is a subfolder of a git repository | dsh loads that skill; a skill not configured for the agent (in the repo's `.agents/skills`) is not offered | — | Live gated E2E |
| AC-008 | REQ-008 | SCN-002 | Agent with Agent Tools; prompt that calls one | The call appears and is recorded under its AutoByteus name with its result | — | Live gated E2E + unit (projection) |
| AC-009 | REQ-009 | SCN-006 | A dsh run | dsh's environment holds a run pass, not the key; the proxy adds the key; a call with a wrong or revoked pass is refused before any upstream call; no key in run files, raw traces, logs | Vault has no DeepSeek key → creating or restoring the run fails with a message that the DeepSeek API key is not set and where to set it; a key removed later fails the next turn with the proxy's refusal text | Unit + live + key-absence scan |
| AC-010 | REQ-010 | SCN-007 | Forced low compaction threshold in the test; several long messages | Each completed compaction produces a `COMPACTION_STATUS` completed event and an archived raw-trace segment; the conversation continues | Failed compaction call → failed status, no rotation | Live gated E2E + unit |
| AC-011 | REQ-011 | SCN-002 | Any dsh turn | One `TOKEN_USAGE_UPDATED` per model call with input, output and cache counts | — | Unit + live |
| AC-012 | REQ-012 | SCN-008 | Model streaming longer than the idle timeout (test with a shortened timeout) | The run is not failed while streaming; a stalled run with no frames and no stream activity fails with `ACP_TURN_IDLE_TIMEOUT` | — | Unit + integration |
| AC-013 | REQ-013 | SCN-009 | Open Settings → Agent Runtimes | dsh row shows installed/version/update; key state "set" or "not set" with a pointer to the API key settings | dsh not on PATH → not installed with install link | Unit + UI check |
| AC-014 | REQ-014 | SCN-010 | dsh run with bash/read/write/edit/grep/glob/web calls | The Work Journal shows them like other runtimes; switching the run to another runtime continues with the journal | — | Unit |
| AC-015 | REQ-015 | SCN-001 | A dsh run | The model's tool list has none of dsh's subagent, team, workflow, goal, plugin-install or ask-user tools; requests carry no `dsh_session_log`; the user's `~/.dsh` is untouched | — | Live (request fingerprint) + unit |
| AC-016 | Preserved | BEH-004/006 | Grok Build run create/restore | Unchanged behavior; existing Grok tests pass | — | Existing tests |
| AC-017 | Preserved | BEH-009 | GitHub integration via the proxy | Unchanged behavior; existing proxy tests pass | — | Existing tests |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor / Initiator / Governing Contract | Coherent Goal Or Governing Event | Supported Trigger / Entry Surface | Starting Condition | Product-Level Steps Or Event Sequence | Expected Outcome | Supported Alternate / Error Behavior | Scenario Validity | Independent Evidence / Decision Reference | Related Requirement / AC IDs |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | User | User | Run an agent on dsh | Run config, runtime DeepSeek Harness | dsh installed; key in vault | Create run → first message → agent works | Agent answers with its own instructions and skills | dsh missing / key missing: clear failure | Supported Normal Scenario | User request | REQ-001/006/007/009/015; AC-001/006/007/009/015 |
| SCN-002 | User | User | Have the agent use tools | Chat | Run idle | Message → tool calls → approvals → result | Cards and usage recorded | Reject → call fails, agent explains | Supported Normal Scenario | Runtime parity | REQ-002/008/011; AC-001/002/008/011 |
| SCN-003 | User | User | Stop a long turn | Stop button | Turn running | Stop | Turn interrupted | — | Supported Normal Scenario | Parity | REQ-003; AC-003 |
| SCN-004 | System | Server restart | Continue a run later | Next message to a restored run | Server restarted | Restore → message | Conversation continues | — | Supported Normal Scenario | Parity | REQ-004/006; AC-004/006 |
| SCN-005 | User | User | Pick model and effort | Run config | dsh installed | Open list → choose → run | Run uses them | — | Supported Normal Scenario | Parity | REQ-005; AC-005 |
| SCN-006 | System | Run preparation | Give dsh access to DeepSeek | Run start | Key in vault | Pass issued → dsh calls proxy → key added | Calls succeed; key never at dsh | Key missing → named failure | Supported Normal Scenario | DEC-001 | REQ-009; AC-009 |
| SCN-007 | System | dsh compaction | Keep raw traces bounded | Long conversation | Context near threshold | dsh compacts → boundary → rotation | Archived segment, status | Failed call → failed status | Supported Normal Scenario | User concern; RT-014/017 | REQ-010; AC-010 |
| SCN-008 | System | Long model step | Finish long reasoning | Hard prompt, high effort | — | Minutes of streaming without ACP frames | Turn completes | Real stall → idle failure | Supported Normal Scenario | RT-016 | REQ-012; AC-012 |
| SCN-009 | User | User | Check runtime readiness | Settings → Agent Runtimes | — | Open page | dsh row with state | Not installed | Supported Normal Scenario | Parity | REQ-013; AC-013 |
| SCN-010 | User | User | Review work; switch runtime | Work Journal; runtime switch | dsh run with history | Open journal / switch | Readable journal; switched agent continues | — | Supported Normal Scenario | Parity | REQ-014; AC-014 |

## UI, Interaction, And Experience Requirements

- Applicable: `Yes` (existing surfaces only)
- Linked UI/UX or interaction supplement: N/A — not applicable
- Linked runnable UI reference, separate design repository/root, UI/UX specification, and applicable support artifacts: N/A — not applicable
- Product ticket record and folder (externally owned): N/A — not applicable
- Design repository revision or commit: N/A — not applicable
- UI/UX user-confirmation reference: N/A — not applicable
- Approved visual-reference baseline: N/A — not applicable
- Normative visual and interaction details: the runtime appears in existing runtime pickers, model routing colours and the Agent Runtimes page like Grok Build; its key-state line reads as the other runtimes' sign-in line, with a hint naming the API key settings.
- Explicitly illustrative fixture content or permitted implementation variation: colour choice and wording within the existing patterns.
- Required screens, states, transitions: dsh row states: not installed, installed + key set, installed + key not set.
- Product decisions that need the user: None.

## Quality And Non-Functional Requirements

| Quality ID | Related Requirement / AC IDs | Area | Measurable Requirement Or Constraint | Conditions / Scope | Verification Intent |
| --- | --- | --- | --- | --- | --- |
| QR-001 | REQ-009, AC-009 | Security | The DeepSeek key appears in no file, environment, argument, log or trace outside the server process and the TLS request to `api.deepseek.com` | All dsh runs | Key-absence scan after live runs |
| QR-002 | REQ-009 | Security | The model route accepts only loopback callers with a live run pass for a dsh run, and only `POST` to the Messages path | Proxy | Unit |
| QR-003 | REQ-012 | Reliability | Proxy stream activity keeps the run alive; no false idle failure for streaming steps up to the run's own limits | Long steps | Unit/integration |
| QR-004 | REQ-015 | Privacy | No `dsh_session_log` in any request | All dsh runs | Live fingerprint |

## Data Continuity And Acceptable Loss

- Persisted or external data affected: `Yes` (new values only)
- Data or state that must be preserved: all existing runs, manifests and usage records unchanged.
- Loss, reset, rebuild, or regeneration that is acceptable: dsh's own session store in the AutoByteus-owned dsh home is runtime state; if it is lost, those dsh runs cannot be restored (same as losing another runtime's own session store).
- Retention, privacy, compliance, volume, downtime, or operational constraints: none beyond QR-001/004.
- Unknowns requiring downstream investigation: None.

## External Contracts And Dependencies

| Contract / Dependency | Required Behavior Or Constraint | Evidence / Authority | Uncertainty Or Risk |
| --- | --- | --- | --- |
| dsh 0.2.2-rc.1 ACP profile | As recorded in investigation notes | RT-001…RT-022 | Developer preview (DEC-003) |
| DeepSeek Messages API | SSE, `x-api-key`, usage fields | RT-008/021 | — |
| ACP SDK 1.5.0 | `resumeSession`, `setSessionConfigOption` | `acp.d.ts:1591,1623` | — |

## Supplemental Artifacts

| Artifact Path | Purpose | Related Requirement / AC IDs | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- |
| `probes/`, `evidence/` | Reproductions and recorded frames | REQ-002…REQ-015 | Current | Evidence, not behavior-defining |

## Assumptions

| Assumption ID | Assumption | Why It Is Necessary | Validation Plan / Owner | Status |
| --- | --- | --- | --- | --- |
| ASM-001 | Users install dsh themselves (`npm install -g @deepseek-ai/dsh`, Node ≥ 24.9) | Same as other external runtimes | Agent Runtimes page shows install link | Accepted |
| ASM-002 | The compaction request header stays as observed in the pinned dsh version | REQ-010 | Live test; breakage is a bug (DEC-003) | Accepted |

## Decisions

| Decision ID | Question | Why It Matters | Options / Evidence | Reasoning And Recommendation | Decision Owner | Status |
| --- | --- | --- | --- | --- | --- | --- |
| DEC-001 | How does dsh get the DeepSeek key? | Key rules; one source of truth | dsh's own file; env injection; credential proxy | The proxy keeps the key in the server and uses the vault; RT-007/008 prove it works | User ("thats wonderful if it works") | Decided |
| DEC-002 | Investigate only, or build in this ticket? | Scope | Separate Task vs this ticket | — | User ("we do it now in this ticket") | Decided |
| DEC-003 | Guard against future dsh changes? | dsh is a developer preview | Version gates, compatibility checks, none | Breakage is reported and fixed as bugs | User ("we will just report a bug and no worry") | Decided |
| DEC-004 | dsh session-log upload | Privacy | On (dsh default) / off | Off: AutoByteus keeps its own records; nothing is lost | User (accepted default) | Decided |
| DEC-005 | Approval meaning for dsh | dsh asks only for sandbox escalations | Per-tool approval impossible (RT-004…RT-006) | Keep dsh's `workspace-write` sandbox; escalations ask; auto-execute answers allow | User (accepted default) | Decided |
| DEC-006 | dsh's own subagent/team/workflow/goal/plugin-install/ask-user tools | Collaboration goes through AutoByteus; no answerer for questions | On / off | Off, as for Grok | User (accepted default) | Decided |
| DEC-007 | Which dsh home do runs use? | A stored key in `$DSH_HOME` outranks the launch environment and would bypass the pass; isolation of the user's own dsh | User's `~/.dsh` / AutoByteus-owned home | AutoByteus-owned home under the server's app data | Solution Designer | Decided |
| DEC-008 | Which skills does dsh see? | AutoByteus agent definitions own the skill set | dsh default roots / configured skills only | Only the agent's configured skills (`includeDefaultRoots: false`), consistent with the agent definition | Solution Designer | Decided |
| DEC-009 | Compaction signal | dsh sends none over ACP; usage occupancy is not reliable (RT-014) | Read dsh's private log; infer from usage; proxy header | The proxy's view of `x-deepseek-harness-compact` (RT-017) | Solution Designer | Decided |
| DEC-010 | Idle liveness | 179 s silence measured | Longer timeout; proxy activity | Proxy stream activity refreshes the idle timer; the timeout value stays | Solution Designer | Decided |
| DEC-011 | Image prompt blocks | Shared ACP layer sends none | Add / keep | Keep: images reach dsh as file paths (`read_image`) | Solution Designer | Decided |
| DEC-012 | Where does the run pass travel? | Shells see the base URL but not `DEEPSEEK_API_KEY` (RT-018) | URL path / API-key header | API-key header; the base URL holds no pass | Solution Designer | Decided |
| DEC-013 | Which models are listed? | dsh owns its catalogue | Static list / dsh's offered options | dsh's offered options for the official DeepSeek provider | Solution Designer | Decided |
| DEC-014 | Minimum dsh version gate? | DEC-003 | Gate / none | None; the Agent Runtimes page shows the version | Solution Designer | Decided |
| DEC-015 | Processes per run | Isolation, Grok precedent | Shared / per run | One process per run | Solution Designer | Decided |
| DEC-016 | Runtime name | Brand guidelines restrict project names | `deepseek_harness` / "DeepSeek Harness" | Referring to the product by its name is not naming our project after it | Solution Designer | Decided |
| DEC-017 | How do instructions reach dsh literally? | Persona templates throw on unknown `{{…}}` | Persona field; first message; plugin section | An AutoByteus plugin section with `interpolate: false` reading a per-run file (RT-018) | Solution Designer | Decided |
| DEC-018 | What "signed in" means for dsh | Key comes from the vault | — | "Signed in" = the vault holds the DeepSeek key; hint points to the API key settings | Solution Designer | Decided |

## Traceability

| Requirement ID | Use-Case IDs | Behavior IDs | Acceptance-Criteria IDs | Scenario IDs | Supplemental / Product Design Evidence |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | UC-001 | BEH-001 | AC-001 | SCN-001 | RT-001/008 |
| REQ-002 | UC-001 | BEH-002 | AC-001, AC-002 | SCN-002 | RT-003/006 |
| REQ-003 | UC-001 | BEH-003 | AC-003 | SCN-003 | RT-013 |
| REQ-004 | UC-002 | BEH-004 | AC-004 | SCN-004 | RT-002/009 |
| REQ-005 | UC-003 | BEH-005 | AC-005 | SCN-005 | RT-001/002 |
| REQ-006 | UC-001, UC-002 | BEH-006 | AC-006 | SCN-001, SCN-004 | RT-018 |
| REQ-007 | UC-001 | BEH-007 | AC-007 | SCN-001 | RT-010…012/018 |
| REQ-008 | UC-001 | BEH-008 | AC-008 | SCN-002 | RT-012 |
| REQ-009 | UC-004 | BEH-009 | AC-009 | SCN-006 | RT-007/018 |
| REQ-010 | UC-005 | BEH-010 | AC-010 | SCN-007 | RT-014/017 |
| REQ-011 | UC-005 | BEH-011 | AC-011 | SCN-002 | RT-021 |
| REQ-012 | UC-006 | BEH-012 | AC-012 | SCN-008 | RT-016 |
| REQ-013 | UC-007 | BEH-013 | AC-013 | SCN-009 | — |
| REQ-014 | UC-008 | BEH-014 | AC-014 | SCN-010 | — |
| REQ-015 | UC-001 | BEH-015 | AC-015 | SCN-001 | RT-008/018/022 |

## Architecture Phase Input

- Approved scenario IDs: SCN-001…SCN-010.
- Constraints: no key outside the server (QR-001); Grok and integration behavior preserved (AC-016/017); one process per run.
- Decisions deferred to architecture: owner of the model route and its observation; shared-ACP seams; dsh home preparation; model discovery mechanism.
- Technical facts to verify: none outstanding.
- Known risks: RSK-001…RSK-006 (investigation notes).

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

- Approval recorded: `Yes`
- Exact requirements and supplement approval basis recorded: `Yes`
- Approved requirements package ready for architecture design: `Yes`
- Remaining blocker: None
