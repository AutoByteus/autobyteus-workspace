# Design Spec — Antigravity CLI Runtime Redesign

## Solution And Approval Basis

- Package: `antigravity-cli-runtime-redesign-20260924`; current revision `SR-021`.
- Approved requirements: `requirements-doc.md`, SR-016 baseline plus SR-021 status clarification. Approval references: user's 2026-09-24 ticket go-ahead after JSON experiments; explicit AGY-only default-on auto-execute and existing normalized raw-trace direction; and, after further command-outcome controls, “if they really do not have return result, then we simply map done to success thats it.” No behavior-defining supplement; provider probe files are evidence only.
- Status: **Architecture Design Complete — revised SR-021 basis ready for independent re-review** after Implementation Engineer IR-001 Requirement Gap. ARCH-REV-002 passed SR-019 but did **not** review this changed AGY `DONE` mapping. The partial implementation at `03bf9a370` is not accepted or Code Review/API-E2E-ready. Canonical evidence: `investigation-notes.md`. Workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/antigravity-cli-runtime-redesign-20260924`, branch `codex/antigravity-cli-runtime-redesign-20260924` from `origin/personal` `40b1783f40c072b577ad9d0c5d8fe4f5418c6c38`; finalization target `origin/personal`.

### DR-001 selected-workspace contract

The run capsule holds AGY configuration. The generated main-agent `agent.md` adds only simple working-environment guidance, with the selected real workspace resolved for this run:

```markdown
## Working Environment
- Agent workspace: `<selected real workspace>`
- Resolve task and project locations from the agent workspace unless an explicit target says otherwise.
```

Do not expose the capsule path or add elaborate command instructions to the agent text. Do not copy the native prompt's `pwd` claim: `init.cwd` remains the capsule. The selected workspace is the **task/project root for agent-directed file and command work**, not AGY's primary project/config root. `--add-dir` supplies access; this short system-level instruction supplies task-root meaning. It is model guidance, not a deterministic filesystem guard. The exact two-line wording produced a real-workspace `write_to_file` and a real-workspace shell-created file in disposable CLI 1.2.10 controls, while the reviewer's no-guidance relative-write control landed in the capsule. Verification must retain both positive and negative controls, inspect actual targets, and never infer correct targeting merely from a successful turn. See `agy-minimal-workspace-agent-probe/summary.json` and `investigation-notes.md` SR-019.

## Current-State Read

Current `origin/personal` has no AGY runtime. `AgentRunManager` prepares provider backends via explicit factories, then standalone or configured team/org activation demands an external platform ID before publishing. `AgentRunMemoryRecorder` writes normalized canonical events; the generic local-memory projection supplies conversation/Event Monitor history. Agent identity is composed centrally; frontend launch drafts and runtime availability/model catalog are separately owned. The old unmerged AGY work is stale relative to these boundaries and used first-user-message instructions/terminal assumptions. New integration must extend the current owners, not mechanically copy those paths. Evidence: architecture investigation table in `investigation-notes.md`.

## Task Size And Architectural Risk (Mandatory)

- **Task size: Large.** A new runtime owner spans server process I/O, factory/activation/restore, identity/MCP, event conversion/persistence, model discovery and frontend launch policy, plus standalone/team/org tests.
- **Architectural risk: High.** Material new external protocol, high-trust permission mapping, exact provider-ID data binding, durable identity snapshot, collaboration tool scope, concurrent real-workspace access, and cross-subsystem UX/trace contracts. Raw fixture count is payload evidence, not why the task is Large/High.
- Escalation: Any implemented AGY behavior that requires changing the approved UX/security/identity/trace contract returns as Requirement Gap for user approval. An unexpected provider or current-code boundary change with approved intent fixed returns as Design Impact for re-review; never silently widen scope.

## Architecture Investigation Evidence

| Evidence | Observation | Decision / remaining uncertainty |
| --- | --- | --- |
| `investigation-notes.md` SR-016/017 table; provider factory, manager, lifecycle and configured planner paths | Explicit backend family and prepublication external binding already exist. | Add AGY family; validate `init` before candidate publication. |
| `agy-cli-experiment-report.md`, `agy-tool-event-capture-analysis.md`, `agy-tool-event-capture/*.stdout.jsonl` | CLI 1.2.10 supports custom main agent, generated ID, multi-turn stream, tool events and exact resume; invalid ID may silently make a new conversation. | Run capsule, stream converter, exact-ID guard. Cross-version and MCP integration remain to validate. |
| `agy-minimal-workspace-agent-probe/summary.json` and raw JSONL; `design-review-report.md` DR-001 | Without workspace guidance a relative write landed in capsule. With the exact short stanza above, file and shell tasks landed in the selected real workspace; `init.cwd` remained capsule. | Keep capsule as provider config root, explicitly name selected task root in generated agent; verify ordinary targets rather than claiming deterministic enforcement. |
| `agy-capsule-mcp-probe/summary.json`, `agy-mcp-config-precedence-probe/summary.json` and raw JSONL | A capsule-local disposable MCP server received `tools/call`; with the same server key in capsule and added workspace, capsule config won in one CLI 1.2.10 control. | Run-scoped AutoByteus MCP entry stays in capsule; live AutoByteus/team tool call remains an implementation acceptance gate. Do not claim exclusive provider MCP access. |
| `agy-command-outcome-matrix-probe/summary.json` and raw JSONL; earlier `agy-tool-event-capture/run_command_nonzero.stdout.jsonl` | Exit 0, exit 8, and command-not-found/exit 127 all gave AGY `run_command` DONE without a structured shell exit code; denied command gave tool ERROR while turn status could still be SUCCESS. | Per SR-021 user approval, map tool DONE without explicit error to canonical success/green as a **provider-step** convention. Keep ERROR/denial failed, preserve exposed text and never fabricate exit code. |
| [AGY skills documentation](https://www.antigravity.google/docs/skills/), `agy-skill-discovery-probe.py`, `agy-added-dir-skill-probe.py` | Capsule skills and added-workspace skills are both discoverable; an empty agent `skills` list did not suppress added-workspace skills. Existing Codex/Claude `SkillAccessMode.NONE` skips AutoByteus-configured skill materialization but does not remove user/provider-owned workspace skills. | Mirror the existing configured-skill meaning, not an unproven universal AGY skill ban. Materialize configured skills in capsule only when enabled; leave user/global/provider skill discovery as provider behavior. |
| [AGY headless documentation](https://antigravity.google/docs/cli/headless/), [AGY MCP documentation](https://www.antigravity.google/docs/mcp) | Stream-JSON/stdin event contract, headless permission mode and project MCP config documented. | Pipes/no PTY; run-local MCP config, not global mutation. |
| Current memory recorder/projection, model catalog and web draft owners in canonical notes | Generic trace path exists; model catalog has a non-Claude→Codex branch; new drafts seed false. | Reuse trace path, explicitly branch AGY models, add shared AGY draft transition. |

## Intended Change

A selected AGY run behaves as an ordinary AutoByteus chat run. It starts from a **durable, run-owned AGY project capsule** containing a generated custom *main* agent whose body is the run-start snapshot of AutoByteus's composed identity **plus the short selected-workspace stanza above**, the run-scoped AutoByteus MCP entry, and enabled AutoByteus-configured skills. The capsule is AGY's config/project root; the selected real workspace is separately added and identified to the agent as its task root. Provider-native user/global workspace customizations may remain visible, but generated AutoByteus config never overwrites them. A child `agy` process uses ordinary stdin/stdout `stream-json` pipes. Before sending a real task, the backend captures AGY's generated `init.conversation_id`, and on restore compares it to the stored binding; mismatch is non-restorable. Provider events become canonical `AgentRunEvent`s, then the existing recorder/history/Event Monitor handles them. Per SR-021 user direction, AGY tool `DONE` without explicit error becomes canonical tool success/green, even though shell exit may be nonzero; AGY `ERROR`/denial remains failed/denied and no exit code is invented. New editable AGY launch scopes default auto-execute on, mapped to `--dangerously-skip-permissions`; explicitly off uses AGY's ordinary headless policy and truthful denials. Team/org members each use their own AGY **main** run; AGY-native subagent spawning/management is outside this ticket. No PTY, first-user identity prompt, separate production NDJSON archive, global AGY mutation, or imported old AGY runs.

## Relevant Behavior And Production-Path Map (Mandatory)

| ID | Kind; REQ/AC | Trigger / existing evidence | Target lifecycle and spine |
| --- | --- | --- | --- |
| BEH-001 | User; REQ-001/AC-001 | Select AGY; no current registration; dynamic `agy models`. | Availability/model catalog → launch selection → AGY backend; DS-001. |
| BEH-002 | Contract; REQ-002/AC-002 | Start selected agent/member; shared composer and custom-agent probe. | Compose identity + short selected-workspace stanza → snapshot custom main agent before AGY init; DS-001. |
| BEH-003 | Contract; REQ-003–004/AC-003 | Create/reopen; provider ID separate; invalid ID falls back. | Capture init → metadata; restore exact compare before input; DS-001/002. |
| BEH-004 | User/security; REQ-007–008/010, AC-006–007/009 | New AGY draft or tool turn; current draft false; headless denial probe. | Draft policy → effective config → CLI permission flag; denied tool event; DS-001/003. |
| BEH-005 | Operational; REQ-005/AC-004 | Two runs same workspace; reviewer's relative-write failure and SR-019 minimal-prompt controls. | Distinct durable capsules/IDs/config + shared `--add-dir` access + selected task-root instruction/target verification; DS-001. |
| BEH-006 | User/data; REQ-009/011, AC-008/010 | Provider tool/assistant events; existing recorder/projection; SR-021 command-outcome matrix and user mapping decision. | NDJSON converter (AGY DONE→success, ERROR/error→failed/denied) → canonical events → raw traces → green/red Event Monitor; DS-003. |
| SCN-005 preserved | Contract; REQ-006/AC-005 | Existing runtime selection/restore. | AGY-only branches; regression checks for AutoByteus/Codex/Claude; all spines. |

## Relevant Supplemental Task Artifacts

| Artifact | Purpose / status |
| --- | --- |
| `agy-cli-experiment-report.md` and its adjacent probe scripts/results | Provider-side feasibility/negative controls, not behavior authority or product integration proof. |
| `agy-tool-event-capture-analysis.md`, `agy-tool-event-capture/*.stdout.jsonl`/stderr and capture scripts | Exact tool-event fixture evidence for converter tests; not a production archive. |
| `agy-command-outcome-matrix-probe.py`, `agy-command-outcome-matrix-probe/*.stdout.jsonl`/stderr and summary | SR-021 success/nonzero/not-found/denial fixture matrix for approved AGY DONE/ERROR mapping; provider evidence, not AutoByteus E2E. |
| `implementation-handoff.md`, `implementation-revision-record.md` IR-001 | Partial unaccepted implementation and triggering Requirement Gap; implementation-owned, not an architecture approval or Code Review pass. |
| `design-direction-proposal.md` and old worktree ticket/code | Historical non-authoritative alternatives; superseded by this design. Do not copy mechanically. |
| Product Design artifacts | N/A — no Product Design/prototyping request or returned UI/UX spec. |

## Task Design Health Assessment (Mandatory)

- Change posture: **Feature / larger requirement**. Current design issue: **Yes, localized integration pressure**, not a general defect in existing runtimes. Root cause: **Boundary Or Ownership Issue** if AGY is added outside current factory, identity, external-binding or memory boundaries; current provider enumeration and model-catalog fallback also need tightening.
- Refactor needed now: **Yes, bounded**. Extend explicit provider composition and replace the external-model non-Claude→Codex fallback with exhaustive runtime selection; centralize AGY-only draft default policy across UI entrypoints. Do not refactor unrelated runtime internals.
- Evidence: named source paths in canonical notes; AGY differs from Codex App Server in permission response and provider ID semantics.
- Response/removal: no legacy AGY path exists on current base to keep. Avoid parallel PTY/NDJSON modes, first-user bootstrap and separate trace archive. Residual risk: provider custom-agent/MCP implementation is validated only in bounded portions and requires acceptance tests; do not defer a known broken path into delivery.

## Terminology

- **Run ID:** AutoByteus-owned execution identity. **Provider ID:** AGY-created `conversation_id`, persisted as `platformAgentRunId`.
- **Capsule:** per-run durable primary AGY project tree under that run's `memoryDir`, holding generated `.agents` configuration/identity/skills. It is not the user's real task workspace.
- **Selected task workspace:** the real absolute workspace resolved from the launch config; added to AGY with `--add-dir` and named in the generated main agent. `init.cwd` still identifies the capsule; no provider-level task-root guarantee is claimed.
- **Provider-step success convention:** AGY `tool` state `DONE` without explicit error maps to AutoByteus success/green by user direction. It does **not** prove an underlying shell command exited zero.

## Legacy Removal Policy (Mandatory)

Policy: **No backward compatibility; remove legacy code paths.** Current base has no AGY path to remove. Historical dirty worktrees are not production compatibility surfaces; do not merge or delete them as part of implementation. New integration must not retain a PTY mode, first-user identity fallback, last-conversation guessing, log-scraped ID fallback, parallel raw provider archive, or generic non-Claude→Codex model fallback. Remove temporary development seams before handoff.

## Persisted Data / State Transition Decision (Mandatory)

- Stored subject/location/shape: existing run metadata under run memory (`runId`, `runtimeKind`, nullable `platformAgentRunId`, `memoryDir`) and generic normalized raw trace items. AGY product-run count on the original integration base was **zero**. IR-001 created a local development run with neutral `completed_unverified` trace during implementation probing; it is not evidence of a released AGY population. Audit that local record if removing the neutral reader, but do not require a production data migration for it. Exact total counts of other runtimes are unnecessary because their format is unchanged.
- Change: add a new runtime enum case and newly created AGY capsule under AGY run memory. Existing metadata/trace serialization shape remains valid; no old AGY shape exists.
- Reader/writer evidence: lifecycle/metadata readers use the existing external binding field; memory recorder and local projection consume runtime-agnostic canonical events (canonical notes source table).
- Invariants: AGY metadata has one exact provider ID distinct from run ID; capsule belongs to one run and remains available while restorable; existing runtime records preserve their meaning. The provider ID cannot be silently replaced after restore mismatch.
- Operational/security: capsule contains agent instructions and run-scoped MCP endpoint; restrict it to run storage permissions and retention policy, avoid user workspace/global config edits, clean only with run-memory cleanup. Provider CLI may retain its own conversation store; do not claim AutoByteus owns that store.
- **Decision: Directly Usable — No Migration.** Existing records use unchanged fields and generic readers. Adding an enum value does not force rewriting current runs; there is no old AGY run data. A migration would add I/O/corruption/recovery cost without semantic benefit. Validate representative old-runtime restore and AGY new/restore flows. AC-003/004/005/008.
- Migration plan: N/A — not required.

## Data-Flow Spine Inventory

| ID | Scope; behavior | Start → end | Governing owner / importance |
| --- | --- | --- | --- |
| DS-001 | Primary end-to-end; BEH-001–005 | Launch config → run manager → AGY factory/capsule/process → provider init | AGY backend owns create/restore and exact binding. |
| DS-002 | Primary restore; BEH-002–003 | Stored metadata/capsule → restore context → AGY process init → binding check → input admission | Existing lifecycle/manager and AGY backend jointly enforce continuity. |
| DS-003 | Return-event; BEH-004/006 | AGY stdout → converter → `AgentRunEvent` → recorder/projection → frontend | Converter preserves exposed semantics and current trace pipeline. |
| DS-004 | Bounded local; BEH-003/006 | stdin dispatch → ordered step updates → result → next dispatch | One AGY process/turn controller prevents interleaved-turn misattribution. |

## Primary Execution Spine(s) And Narratives

- **DS-001:** UI selected runtime/model/auto-execute → existing launch/API config → `AgentRunManager.prepareNewAgentRun` → AGY backend factory → resolve/canonicalize the selected real workspace and agent/member context → compose identity plus the **two-line task-workspace stanza** → persist capsule/selected-workspace binding → activate run-scoped MCP and configured skills → spawn `agy --new-project --agent <generated-name> --add-dir <real-workspace> --input-format stream-json --output-format stream-json [--model ...] [--dangerously-skip-permissions if true]` with capsule as primary cwd → validate first `init` and provider ID → publish candidate/binding → admit user input. The capsule owns provider configuration, while agent-directed task files target the selected real workspace; ordinary file/shell tasks must be checked against that contract. Exact argument ordering/syntax must match installed CLI and be test-verified; no shell-string interpolation.
- **DS-002:** Stored run and exact provider ID → AGY restore context → verify existing capsule/identity fingerprint, saved selected-workspace path and local files → spawn in same primary cwd with the **same** `--add-dir <saved-real-workspace>` and `--conversation <stored-id>` (not `--continue` or guessed latest; do not use create-only `--new-project`) → require `init.conversation_id === stored-id` before dispatch. If the workspace moved, is missing or differs from stored binding, report non-restorable/reconfiguration-needed rather than silently changing the agent's task root. If AGY silently creates a different ID, terminate candidate and surface non-restorable; never overwrite stored binding. Reopen retains run-start agent instructions and workspace statement even when source definition changed.
- **DS-003:** The backend parses bounded NDJSON lines from stdout. `init` binds ID; `step_update` and `result` become canonical events; existing source-event batching, recorder, history projection, WebSocket and Event Monitor display them. AGY tool `DONE` without explicit error maps to existing `TOOL_EXECUTION_SUCCEEDED` and green success presentation as an approved **provider-step** convention; preserve AGY `provider_state: DONE`, exposed output and absence of shell exit code in the normalized trace. `ERROR` or explicit tool error maps failed/denied even if overall turn status is SUCCESS. The underlying command may have exited nonzero in a DONE step; do not claim or fabricate exit 0. The neutral `TOOL_EXECUTION_COMPLETED` branch introduced only for this unmerged AGY implementation should be removed if no other producer requires it; do not leave a parallel unused event/trace/UI state for this ticket. Stderr is diagnostic/error input, not assistant prose or a second trace channel. Submitted user text comes from AutoByteus dispatch/observer; provider `user_input` step marks sequence only.

## Spine Actors / Main-Line Nodes And Ownership Map

| Actor | Owns |
| --- | --- |
| Existing launch config/API and `AgentRunManager` | Selected effective config, run ID allocation, provider factory choice, candidate admission and exact restore comparison; no AGY JSON parsing. |
| `AgyAgentRunBackendFactory` / backend | One AGY run lifecycle; create/restore config, prepare capsule/process, expose provider ID, input/interrupt/terminate, source-event subscription. Thin factory is not a second lifecycle authority. |
| `AgyRunCapsule` materializer | Durable generated identity/MCP/configured-skill assets, selected-workspace binding, tool-frontmatter and path/permission/manifest validation; no CLI turn interpretation or project-file rewriting. |
| `AgyStreamProcess` | Child-process stdin/stdout/stderr, line framing, bounded buffers/timeouts, close/kill; no AutoByteus event meaning. |
| `AgyStreamEventConverter` | Provider event validation/correlation and canonical `AgentRunEvent` semantics; no persistence or workspace writes. |
| Existing recorder/projection | Normalized raw traces and replay; no AGY protocol knowledge. |

## Thin Entry Facades / Public Wrappers

`AgentRunManager` remains the public execution boundary over provider factories; backend factory is a construction seam. Existing frontend launch components remain UI adapters over a shared draft transition, not separate security-policy owners.

## Removal / Decommission Plan (Mandatory)

| Item | Scope / replacement |
| --- | --- |
| Non-Claude→Codex external-model fallback in `model-catalog-service.ts` | Replace **in this change** with explicit exhaustive AGY/Claude/Codex branches; reject unsupported runtime. |
| Duplicated runtime-selection default mutation across web desktop/mobile/team/org | Replace **in this change** with one tested AGY draft-policy function called at each entrypoint; keep each UI owner for state updates. |
| Neutral `TOOL_EXECUTION_COMPLETED`/completed-unverified branch introduced by partial AGY implementation at IR-001 | Remove from converter, canonical event/DTO, trace sequencer, hydration, Event Monitor and tests if no independent producer uses it; reuse existing success/failed/denied paths. This is unmerged development code, not a product compatibility contract. Audit any local development trace records rather than inventing a production migration. |
| Old AGY PTY, user-message identity, log-ID code | N/A on current base; historical worktree code is not imported. Do not add as compatibility. |
| Probe-only raw captures | Keep as ticket evidence/fixtures; no production archive/reader path. |

## Return Or Event Spine(s)

DS-003 as above. Per turn: `user_input` (sequence, not text) → assistant `text_delta` segment(s) → tool ACTIVE/terminal events keyed by `(local turn ordinal, step_index)` → per-turn `result` closes exactly one turn, reports terminal errors/usage. Map AGY tool `DONE` with no explicit error to `TOOL_EXECUTION_SUCCEEDED`; map `ERROR` or an explicit tool error with permission denial to `TOOL_DENIED`, other errors to `TOOL_EXECUTION_FAILED`. An explicit tool error takes priority over DONE; overall turn `SUCCESS` never overrides a failed/denied step. The success event means AGY completed its step, not verified shell exit zero; retain exposed output and source state without inventing exit code. Do not append `result.response` after already assembled deltas; if deltas are absent, use response once. Keep usage counters marked cumulative where AGY reports them. Unknown event/field shapes are logged as bounded diagnostics without inventing successful tool execution; malformed line, missing init/result or identity conflict has explicit failure semantics.

## Bounded Local / Internal Spines

DS-004 belongs to AGY backend: queue one submitted turn at a time; write documented `{"event":"user","message":{"content":"..."}}` NDJSON to stdin; correlate provider steps until its `result`; reject/serialize overlap; then admit next turn. The process remains alive for multi-turn chat until interruption/termination/crash. Validate no result is attributed to another run or turn. Interrupt uses process-level cancellation semantics supported by the CLI; if no safe per-turn cancel exists, stop process, mark interrupted and exact-resume next admission rather than claiming in-process recovery. On unexpected process exit, mark run error and preserve prior binding/trace.

## Off-Spine Concerns Around The Spine

| Concern | Spine; owner | Responsibility / misplaced risk |
| --- | --- | --- |
| Availability/models | DS-001; runtime/model services | Probe CLI and parse dynamic model list; no hardcoded version-specific slugs or false availability. |
| Identity/task-root snapshot | DS-001/002; capsule | Write composed identity and short real-workspace statement once on new run, store normalized absolute workspace path, validate/reuse on restore; recreating from edited definition or changed workspace would change conversation context. |
| MCP/team tools | DS-001/002; existing session authority + capsule adapter | Use exact run owner/exposure and generated `serverUrl`; write only the run's capsule `.agents/mcp_config.json`. Provider may also discover user/global MCP servers; do not claim exclusivity. A same-name disposable collision preferred capsule config in one 1.2.10 control; verify production run-scoped call and attribution. |
| Configured skills | DS-001/002; SkillService + capsule | For `PRELOADED_ONLY`, expose resolved configured skill packages at capsule `.agents/skills/<safe-name>/SKILL.md` with collision and source checks; for `NONE`, add no AutoByteus-configured skills. Preserve the run's materialization decision on resume. Neither mode disables provider-native user/global skills; current Codex/Claude materialization likewise does not remove such skills. |
| Permission policy | DS-001/002; backend config + web draft policy | Effective true maps to AGY broad flag on every process; false normal policy, no approval-response fiction. Never reuse another runtime's permission mode blindly. |
| Trace persistence | DS-003; existing recorder | Store canonical events only; independent archive would duplicate and drift. |
| Secrets, log limits | DS-001–004; backend/process | Avoid leaking MCP endpoints/prompts to broad logs, bound NDJSON/stderr, manage child cleanup. |

## Ownership Boundaries And Encapsulation

| Boundary | Encapsulates | Callers / forbidden bypass |
| --- | --- | --- |
| `AgentRunManager` + `AgentRunBackendFactory` | Provider selection and candidate lifecycle | Standalone/team/org must not spawn AGY themselves. |
| AGY backend | Capsule/process/converter/turn controller | Manager uses backend contract only; frontend must not parse AGY output or use PTY. |
| Agent-tool MCP session authority | Scoped tool session and URL | AGY materializer consumes descriptor; must not synthesize unscoped server URL or mutate global MCP config. |
| `AgentRunMemoryRecorder` | Raw-trace writer | Converter emits canonical events; no AGY-specific trace store or direct history mutation. |

Dependency direction: web draft helpers → launch config; server orchestration → backend factory → AGY internals; AGY converter → canonical domain event type; recorder/projection → canonical event stream. AGY internals cannot depend on frontend component types or call run-history persistence. Existing Codex/Claude backends cannot depend on AGY helpers. If the backend contract cannot express an observed AGY outcome truthfully, escalate a specific contract change rather than fabricating fields.

## Interface Boundary Mapping And Check

| Interface | Subject/accepted identity | Responsibility; check |
| --- | --- | --- |
| `createBackend(config, runId)` | New AutoByteus run ID, no provider ID | Materialize capsule, spawn, capture generated provider ID before candidate publication. Singular/explicit; low selector risk. |
| `restoreBackend(AgentRunContext<AgyAgentRunContext>)` | Compound AutoByteus run ID + exact stored provider ID + durable memory path | Reuse capsule and compare init ID before input. Singular/explicit; medium risk addressed by strict check. |
| `dispatchUserInput(dispatch)` | One run and local turn | Write documented stdin JSON and await/track result; reject concurrent admission. Singular/explicit. |
| `inputCapabilities` / `approveToolInvocation` | AGY headless run, no pending approval request identity | Advertise no interactive tool approval capability; return an explicit unsupported operation for approve/deny calls rather than pretending to resume a denied step. Singular/explicit. |
| `getPlatformAgentRunId()` | Provider ID only | Return verified AGY conversation ID, not run ID. Singular/explicit. |
| `prepareCapsule(runId, selectedWorkspace, identity, configuredSkills, scopedMcp)` | AutoByteus run ID + canonical absolute real workspace | Create/validate run-owned config, snapshot selected workspace in manifest, render minimal agent stanza, materialize only enabled configured skills and scoped MCP entry; never mutate the real workspace. Reject name/source/path collisions. |
| `convert(providerEvent, turnContext)` | Parsed AGY event + local turn/step state | Canonical success for AGY DONE without explicit error; failed/denied for ERROR/error payload, with source state and output retained but no fabricated exit code. No persistence. Singular/explicit; unknown fields handled conservatively. |
| `applyNewDraftRuntimeSelection(draft, scope, AGY)` | Editable draft scope (standalone/root/member/org) | Set runtime + default-on autoExecute in that scope only. Singular/explicit; test inheritance. |

## Main Domain Subject Naming Check

`AgyAgentRunBackend`, `AgyRunCapsule`, `AgyStreamProcess`, `AgyStreamEventConverter`, and `AgyAgentRunContext` each name one subject. Avoid generic `SessionManager`/`Adapter` names that blur provider ID vs AutoByteus run ID. Naming drift risk low if the provider ID property remains `conversationId` internally and `platformAgentRunId` only at shared boundary.

## Existing Capability / Subsystem Reuse Check

| Need | Existing capability | Decision / why |
| --- | --- | --- |
| Identity composition | `composeSharedCarpenterPrompt` and native working-environment precedent | Reuse shared identity, then append only AGY's two-line real-workspace section before snapshot; do not copy native `pwd` assertion. |
| Run tool collaboration | Agent-tool MCP session authority | Reuse/extend with AGY materializer; run-scoped route exists. |
| Configured skills | `SkillService`, `resolveSkillAccessMode`, existing external-runtime materializer pattern | Resolve AutoByteus agent bindings; expose enabled packages from run capsule rather than mutating selected project. `NONE` means no AutoByteus-configured skill exposure, not a claim to disable AGY user/global discovery. |
| Run state/binding | Activation/metadata planner | Reuse/extend enum/context; no new history store. |
| Traces/replay | Recorder/local-memory projection | Reuse; only canonical converter is new. |
| CLI I/O | Existing backend contract but no AGY stream process owner | Create AGY-owned child-process driver; PTY does not fit. |
| Draft default | Multiple UI entrypoints, no shared runtime policy | Create small pure AGY-specific draft transition, used by existing stores/components. |

## Subsystem / Capability-Area Allocation

| Area | Concern / decision |
| --- | --- |
| Runtime management + LLM management | Extend availability, dynamic AGY models, unknown capacity. |
| Agent execution orchestration | Extend factory/manager/restore context/external-kind recognition. |
| New `agent-execution/backends/antigravity` | Own capsule/configured-skill materialization, task-root binding, process, backend and converter. |
| Agent tools/MCP | Reuse session authority; AGY-specific config materialization stays in backend. |
| Agent memory/run history | Reuse recorder/projection and existing metadata; no AGY store. |
| Web launch config | Extend runtime enum/selector and shared new-draft transition; reuse Event Monitor. |

## Draft File Responsibility Mapping

Candidate files: AGY backend/factory/context; AGY process/stream parser; AGY capsule/identity/MCP materializer; AGY event converter; runtime availability/model catalog; manager/composition/restore-context; web runtime enum + launch defaults/config stores/components. A single AGY backend file for all these would conflate process, durable identity and event semantics, so extract the owned structures below.

## Reusable Owned Structures And Tightness Check

| Structure | Owner/file | Tightness decision |
| --- | --- | --- |
| AGY provider message types/guards | `backends/antigravity/stream/agy-stream-message.ts` | One meaning per field; parse unknown to bounded diagnostics, not `any` spread across backend. No redundant provider-ID copies. |
| Run capsule manifest | `backends/antigravity/capsule/agy-run-capsule.ts` | Stores generated agent name, selected real-workspace absolute path, source identity fingerprint, configured-skill mode/bindings, capsule version/path and immutable identity snapshot; provider ID stays in metadata, not duplicated as authority. |
| New-draft runtime transition | `autobyteus-web/utils/agentRunRuntimeDraftPolicy.ts` | Pure scope-aware update, no persisted-run rewrite or duplicated switches. |
| Event step correlation | Converter-local map keyed by run turn + step index | Do not expose as shared global registry or confuse with provider conversation ID. |

## Final File Responsibility Mapping / Target Folder And Path Mapping

| Path(s) | Owner / responsibility / must not contain |
| --- | --- |
| `autobyteus-server-ts/src/agent-execution/backends/antigravity/backend/agy-agent-run-backend{,-factory}.ts`, `agy-agent-run-context.ts` (new) | Backend contract and per-run lifecycle; not NDJSON field parsing or raw-trace writes. |
| `.../antigravity/capsule/agy-run-capsule.ts`, `agy-main-agent-materializer.ts`, `agy-mcp-config-materializer.ts`, `agy-configured-skill-materializer.ts` (new) | Durable run-local primary project; selected-real-workspace binding, composed identity plus two-line task-root snapshot, verified built-in tool frontmatter, scoped `.agents/mcp_config.json`, and enabled configured skill packages under capsule `.agents/skills`. Never write generated config/skills into real workspace or user-global config. Exact file split may be tightened if one concern remains cohesive. |
| `.../antigravity/stream/agy-stream-process.ts`, `agy-stream-message.ts`, `agy-stream-event-converter.ts` (new) | Child I/O/framing, guarded provider shapes, canonical conversion/turn correlation respectively; no persistence. |
| `src/agent-execution/providers/agent-provider-factory-builder.ts`, `src/compositions/create-process-agent-provider-factory-builder.ts`, `src/agent-execution/runtime/general-process-run-supervisor.ts`, `src/agent-execution/services/agent-run-manager.ts`, `agent-run-restore-context-factory.ts`, `src/agent-execution/domain/agent-run-context.ts` (modify) | Wire AGY family, restore context and exact candidate binding; no provider JSON shape logic. |
| `src/runtime-management/runtime-kind-enum.ts`, `runtime-availability-service.ts`; `src/llm-management/services/model-catalog-service.ts`, `runtime-model-capacity-service.ts` (modify, optional AGY model parser new sibling) | Runtime discovery and model/capacity selection; no run identity logic. |
| `autobyteus-web/types/agent/AgentRunConfig.ts`, `utils/agentRunRuntimeDraftPolicy.ts`, `composables/useDefinitionLaunchDefaults.ts`, standalone desktop/mobile config owners, team scope store/editor, org run-config store (modify) | Enumerate AGY and apply default-on transition at each new editable scope; never mutate saved run policy. |
| `src/agent-execution/domain/agent-run-event.ts`, `src/agent-memory/services/runtime-memory-event-accumulator.ts`, `runtime-tool-trace-sequencer.ts`, stream projection DTOs; `autobyteus-web/services/agentStreaming/handlers/toolLifecycleHandler.ts` and tool-state rendering (modify) | Reuse existing success/failed/denied canonical event and green/red rendering paths for AGY; remove the neutral `TOOL_EXECUTION_COMPLETED`/completed-unverified implementation seam introduced solely for the earlier AGY design if no independent producer remains. Keep AGY source state/output in result data and do not invent exit code. No raw AGY archive or second event transport. |
| Co-located backend/unit/integration tests, web draft-policy tests, API/E2E tests (new/modify under each repo convention) | Fixture converter, exact restore, scoped identity/MCP, default/inheritance, raw-trace and rendered Event Monitor checks. |

## Folder Boundary Check

`antigravity/backend` is main-line lifecycle, `capsule` durable provider configuration, `stream` transport/conversion; clear ownership with low mixed-layer risk. Existing runtime/model folders remain off-spine services. Web utility owns policy but stores/components own UI state. Do not flatten all AGY work into `backend.ts` or split trivial leaf types without a real ownership need.

## Concrete Examples / Shape Guidance

| Topic | Good shape | Avoid |
| --- | --- | --- |
| Identity/task root | `memoryDir/agy-project/.agents/agents/<safe-run-agent>/agent.md` generated from `composeSharedCarpenterPrompt` plus only the short selected-workspace stanza; same file reused on resume. Frontmatter `mainAgent: true` has the validated AGY 1.2.10 coding-tool list `[view_file, write_to_file, replace_file_content, multi_replace_file_content, grep_search, list_dir, find_by_name, run_command]`; revalidate on supported versions. MCP tools are AGY-discovered dynamically, not named as built-ins. | First user message containing identity, copying raw AutoByteus `agent.md` without name/team context, omitting workspace, or putting capsule details/false `pwd` claim in agent text. |
| Skills | `PRELOADED_ONLY` materializes only AutoByteus-configured packages in capsule `.agents/skills`; `NONE` materializes none. Provider-native workspace/global skills may still be discovered. | Assuming empty `skills: []` or `--disable-slash-commands` is an enforced all-skills denial, or writing generated links into the user's project. |
| Binding | Stored `platformAgentRunId=A`; resume `init.conversation_id=B` → fail and do not dispatch. | `agy --continue` or silently save B. |
| Tool event | `ACTIVE(step=2)` → canonical start; `ERROR(step=2,error=permission denied)` → failed/denied despite overall result SUCCESS. | Marking tool success from process exit 0. |
| Unknown command exit | `sh -c 'exit 8'` and command-not-found both emitted AGY `DONE` without structured exit status; per SR-021 approval this maps to `TOOL_EXECUTION_SUCCEEDED`/green as **provider-step success** while preserving exposed output and leaving exit code absent. | Claiming an exit-0 shell result, parsing assistant prose into a machine status, hiding command-not-found text, or turning AGY `ERROR`/denial green. |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Decision / replacement |
| --- | --- |
| Keep old PTY integration alongside JSON chat | Rejected: no current-base production path; one structured backend only. |
| First-user-message identity fallback | Rejected: lower instruction priority and false user-origin message; fail startup on invalid local capsule/name/project setup, and require a live custom-agent behavioral test before release rather than claiming `init.agent` proves loading. |
| Resume latest/log-scraped ID on missing binding | Rejected: violates exact continuity; explicit non-restorable. |
| Provider NDJSON archive plus normalized traces | Rejected: not approved; fixtures remain investigation evidence. |
| Old AGY product-run migration/reader | N/A: none exist. |

## Derived Layering

Existing orchestration → AGY backend → capsule/stream internals → CLI; event return through canonical domain event → existing recorder/projection/front end. This is a provider-specific leaf, not a new execution platform or frontend route.

## Change / Refactor Sequence

1. Add explicit AGY enum/availability/model branch and tests; ensure existing runtime branches remain exhaustive. Gate availability on a discoverable CLI with required headless/agent/project/resume/permission flags and a validated version/feature contract (1.2.10 is the observed positive baseline), plus parseable available models; surface auth/fetch/unsupported-version errors rather than a false-ready selector. Do not hardcode the 14 observed model slugs.
2. Implement run capsule, short selected-workspace stanza, explicit verified coding-tool frontmatter, configured-skill materializer and scoped MCP materializer, with create-once identity/workspace snapshot, safe name/path, file permissions and strict resume validation. Test actual custom-agent load, normal file/shell targets with the exact minimal stanza, configured-skill positive/NONE behavior, and run-scoped AutoByteus MCP call (including team/org messaging) before treating integration as usable.
3. Revise the guarded stream process/turn controller and converter from captured fixture cases: AGY DONE→canonical success when no explicit error, ERROR/error payload→failed/denied even if overall SUCCESS. Unit-test exit 0, exit 8, command-not-found and denial raw fixtures; preserve output/provider state and absent exit code. Also test missing/unknown fields, multi-turn order, duplicate response suppression, usage and process exit.
4. Wire AGY backend factory through process composition/manager/restore context/external-runtime kind; test prepublication ID capture, invalid-ID exact-resume rejection, restart with original identity and two-run isolation. Keep MCP lifecycle cleanup coupled to candidate abort/termination.
5. Preserve web draft policy/selector across desktop/mobile/standalone/team/org scope; test AGY default-on, explicit-off, inheritance/override and saved-run preservation. Reuse the existing Event Monitor's green success and red failure/denial paths for AGY; delete neutral completed-unverified handling added only for AGY if now unneeded across the recorder, API DTO, hydration and web UI. Test live/reloaded parity for DONE and ERROR while non-AGY behavior stays intact.
6. Validate end-to-end API/raw-trace persistence/reload/frontend display, representative old runtimes and concurrent runs. Reproduce the reviewer's unguided relative-write negative control and SR-019 minimal-stanza positive file/shell controls using the production-generated agent, inspect actual paths (not just turn status), verify two separate capsules share one selected workspace without overwriting its `.agents`, and verify exact restore uses its saved workspace path. Remove temporary bridges and update docs. No migration or old worktree cleanup in implementation; delivery owns safe finalization/cleanup.

## Key Tradeoffs

- Custom main agent + capsule is more setup than a first user message but provides actual system-level identity and stable resume. AGY can silently fall back, so local checks plus live acceptance are mandatory, not an assumed guarantee.
- `--add-dir` permits real workspace access without writing generated `.agents` there; the two-line main-agent stanza directs ordinary task file/command targets to that workspace. This is model-directed behavior, not a static sandbox or cwd guarantee, and separate identity does not equal file-write locking. Do not promise conflict-free shared edits.
- Capsule MCP and configured skills avoid run-generated project/global mutation. AGY may also load user-owned workspace/global MCP and skills; the capsule's same-name MCP entry won in one disposable 1.2.10 control, but no universal precedence or exclusive-tool claim is made. A user-owned collision must be detected or verified, not silently repurposed.
- Ordinary pipes yield structured tools/history without PTY and support current recorder, but headless AGY has no actionable per-tool approval response; AGY's broad always-proceed mode is explicitly chosen for new drafts. Explicit off is restricted, not interactive approval.
- Normalized raw traces reduce duplicate storage and align with Codex, but cannot contain provider-hidden file bytes, reasoning or unreported command exit status. Per approved SR-021 convention, a green AGY tool success may still have an underlying nonzero shell exit; source `DONE` and exposed textual error/output must remain inspectable.

## Risks And Guidance For Implementation

- **Provider drift/fallback:** Probe installed/supported CLI versions and assert the custom agent was actually honored in an integration control; `init.agent` alone is not proof. An explicit custom-agent tool list is necessary in observed 1.2.10 controls; `init.tools` names are not all legal frontmatter entries (`call_mcp_tool`, `command_status`, `send_command_input`, `sed_file`, and `*` failed construction). The eight coding-tool names above passed construction in a disposable control; verify actual needed calls and fail startup on version/toolset incompatibility. Missing/changed protocol or model list must fail clearly rather than route to default agent/model.
- **MCP/collaboration:** A disposable capsule-local MCP server was loaded and called, and one same-name capsule-versus-added-workspace control chose capsule. A live AGY→**AutoByteus** MCP call has **not** been proven. Team/org acceptance depends on a real scoped call and attribution test; do not declare AC-002/SCN-002 complete from a probe server or config-file existence.
- **Task-root/skills:** Reviewer's unguided relative file write landed in capsule. Exact minimal two-line AGY stanza produced real-workspace file/shell outputs in bounded controls, but model compliance is not an enforced filesystem boundary. Test actual production-generated prompts and tools, saved workspace restore, skill materialization/absence, and provider-native workspace skill discovery. Do not present `SkillAccessMode.NONE` as disabling AGY-owned user/global skills.
- **Identity/binding durability:** Write capsule before provider conversation creation, validate on restore, store ID before publication, and abort/clean candidate on mismatch or persistence failure. Missing capsule is non-restorable; no definition-based regeneration.
- **Permission/security:** Default-on is a high-trust user-visible AGY-only policy, not an unnoticed global change. Pass flags as argv, not shell string; never claim false enables Approve/Deny UI. Stderr and MCP config may be sensitive.
- **Trace semantics:** Use captured JSON fixtures but validate actual live tool categories. Map provider `DONE` without explicit tool error to canonical success by the user's provider-step convention; capture exposed parameters/output/errors, provider state and app-known input, not a fabricated shell exit code. Explicit error/denial takes priority, and overall `SUCCESS` must not turn a denied tool green. Unknown events must not corrupt turn completion.
- **Crash/interrupt/concurrency:** Child cleanup, backpressure, bounded line sizes, single-turn admission and exact restart need deterministic tests. Two concurrent *read-only* runs were probed; real shared-workspace writes require conflict/attribution testing, not an unsupported safety assertion.
- **Verification:** Run repository-specific server/web tests, live disposable AGY integration tests, E2E raw-trace reload and rendered frontend Event Monitor. Provider-side experiments are not that validation. If an acceptance criterion cannot be met, return a material finding rather than weakening requirements silently.
