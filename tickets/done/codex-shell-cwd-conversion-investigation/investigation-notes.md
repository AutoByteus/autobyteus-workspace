# Investigation Notes

## Investigation Status

- Bootstrap Status: Complete.
- Current Status: Investigation complete; requirements approved on 2026-08-21; design production is authorized.
- Investigation Goal: Verify the exact Codex shell tool-call shape and whether AutoByteus preserves per-command working-directory intent when projecting Codex command lifecycle facts to canonical `run_bash` events and history.
- Scope Classification (`Small`):
- Scope Classification Rationale: One shared parser owns the affected field mapping for live lifecycle, approval, and native-history normalization; no execution-path change is needed.
- Scope Summary: Version-exact protocol generation, direct live app-server trace, production-source tracing, disposable converter/normalizer probes, and persisted-trace impact analysis.
- Primary Questions To Resolve:
  - What exact shell tool name and argument object does the integrated Codex runtime emit? **Resolved.** Model-facing `exec_command` uses `cmd` and `workdir` in the observed call.
  - Does the stable app-server contract carry the working directory? **Resolved.** `commandExecution.cwd` is required on V2 thread items; approval params also expose `cwd`.
  - Does AutoByteus preserve it in canonical `run_bash` arguments? **Resolved.** No; current live and native-history projections omit it.
  - Is this an execution failure? **Resolved.** No; the live `pwd` ran in the requested nested directory. The defect affects representation/persistence/presentation.

## Request Context

The user suspected that Codex supports a current-working-directory argument on its native shell command while the AutoByteus server may translate only command text into canonical `run_bash` and omit the directory. The user explicitly requested source investigation and experiments capturing the exact provider-native arguments and normalized output.

## Environment Discovery / Bootstrap Context

- Project Type (`Git`):
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-shell-cwd-conversion-investigation`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-shell-cwd-conversion-investigation/tickets/done/codex-shell-cwd-conversion-investigation`
- Current Branch: `codex/codex-shell-cwd-conversion-investigation`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-shell-cwd-conversion-investigation`
- Bootstrap Base Branch: `origin/personal` at `a098b205ca990bf86b5e452950a49fc5dc39c8d1`
- Remote Refresh Result: `git fetch origin --prune` succeeded on 2026-08-21 before branch creation.
- Task Branch: `codex/codex-shell-cwd-conversion-investigation`
- Expected Base Branch (if known): `personal` / `origin/personal`
- Expected Finalization Target (if known): `personal`
- Bootstrap Blockers: None.
- Notes For Downstream Agents: Authoritative work is isolated in the dedicated task worktree. The user's shared `personal` checkout was not modified. Temporary probes were not retained as repository tests.

## Supplemental Task Artifact Inventory

| Artifact Path | Purpose And Scope | Evidence, Context, Or Decision Captured | Core Artifact(s) Supported | Related Requirement / Acceptance-Criteria IDs | Status | Approval Applicability / State | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-shell-cwd-conversion-investigation/tickets/done/codex-shell-cwd-conversion-investigation/codex-cwd-probe-evidence.md` | Focused evidence supplement for the exact native call, stable app-server item, current conversion output, and verdict | Generated `0.149.0` protocol excerpts; live raw frames; disposable live/history conversion outputs; execution-ownership distinction | Requirements, investigation notes; later design spec | REQ-001–REQ-005; AC-001–AC-006 | Complete | N/A — evidence only | Keep aligned if later investigation changes the verdict. |

## Source Log

| Date | Source Type | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-08-21 | Doc | `/Users/normy/autobyteus_org/autobyteus-agents/agent-teams/software-engineering-team/agents/solution-designer/skills/solution-designer/design-principles.md` | Load governing design guidance. | Investigation must distinguish supported production behavior from mechanical possibility and trace the real production boundary. | No |
| 2026-08-21 | Command | `git fetch origin --prune`; branch/worktree inspection; `git worktree add -b codex/codex-shell-cwd-conversion-investigation ... origin/personal` | Establish an isolated task workspace on a refreshed base. | Dedicated worktree created at `a098b205c`; base/finalization branch is `personal`. | No |
| 2026-08-21 | Command | `codex --version` | Pin the integrated runtime version. | `codex-cli 0.149.0`. | No |
| 2026-08-21 | Command / Spec | `codex app-server generate-json-schema --experimental --out <tmp>` and `codex app-server generate-ts --experimental --out <tmp>` | Obtain the exact installed app-server protocol rather than infer it. | V2 `ThreadItem.commandExecution` requires `command` and `cwd`; command approval params expose optional `command` and `cwd`. | No |
| 2026-08-21 | Web | Official-domain search: `site:developers.openai.com/codex app server commandExecution cwd exec_command workdir` | Check whether public official docs expose the internal app-server shape. | Search did not surface the detailed versioned item contract; the installed CLI generator remained the exact authority. | No |
| 2026-08-21 | Code | `autobyteus-server-ts/src/runtime-management/codex/client/codex-app-server-client.ts` and `.../client-manager.ts` | Trace app-server process ownership and transport. | AutoByteus spawns `codex app-server`, routes JSON-RPC frames, and does not execute command items itself. | No |
| 2026-08-21 | Code | `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread.ts` (notably `startInput`) and `.../codex-thread-manager.ts` | Trace thread/turn workspace input and native lifecycle. | Thread and turn requests pass working directory to Codex; app-server remains execution owner. | No |
| 2026-08-21 | Code | `autobyteus-server-ts/src/agent-execution/backends/codex/backend/codex-agent-run-backend.ts` | Determine what “convert to run_bash” actually does. | `CodexThreadEventConverter` converts received facts into `AgentRunEvent`s for listeners; conversion is projection, not tool execution. | No |
| 2026-08-21 | Code | `autobyteus-server-ts/src/agent-execution/backends/codex/events/codex-item-event-converter.ts` | Identify affected live and approval consumers. | Command item start/completion and command approval all resolve canonical arguments through the shared parser. | No |
| 2026-08-21 | Code | `autobyteus-server-ts/src/agent-execution/backends/codex/items/codex-tool-payload-parser.ts` lines 111–146 | Inspect the canonical argument owner. | It merges structured argument records and synthesizes `command`, but does not read `payload.cwd` or `item.cwd`. | No |
| 2026-08-21 | Code | `autobyteus-server-ts/src/agent-execution/backends/codex/history/codex-thread-history-item-normalizer.ts` lines 119–133, 280–301 | Verify native-history impact. | `commandExecution` history normalization delegates to the same parser and therefore loses `item.cwd`. | No |
| 2026-08-21 | Code | `autobyteus-ts/src/tools/terminal/tools/run-bash.ts` | Verify the canonical target name/field. | Canonical `run_bash` already accepts optional `cwd`; no target schema change is needed. | No |
| 2026-08-21 | Trace / Probe | Disposable Python JSON-RPC driver: `initialize` → `thread/start` → `turn/start`; prompt required exactly one `pwd` with nested per-call working directory and no `cd` | Capture exact model-facing and stable app-server facts. | Raw function call: `exec_command` args include `cmd` and `workdir`. Stable item includes `command` and `cwd`. `pwd` completed in the target directory. | No |
| 2026-08-21 | Test / Probe | Disposable Vitest through `createCodexThreadEventHarness` and `normalizeCodexThreadHistoryItem` | Observe actual current normalized output from the captured app-server shape. | Both live and history normalized to `run_bash` with `{command}` only; `cwd` was omitted. `2 passed` because assertions encoded current output. | No |
| 2026-08-21 | Code / Data | `runtime-tool-trace-sequencer.ts`, `external-runtime-memory-writer.ts`, `runtime-memory-event-payload.ts`, and representative raw-trace fixture | Determine persisted-data consequences. | Future raw traces persist canonical `payload.arguments` in an existing JSON object. Existing traces stay readable but cannot be assumed to contain `cwd`; no schema migration is needed. | No |
| 2026-08-21 | Code | `codex-run-view-projection-provider.ts` lines 287–328 | Determine native-history consumer status. | It is diagnostic/runtime-native; normal UI history uses local application-owned replay traces. This reinforces that old local traces will not be retroactively enriched by a parser fix. | No |

## Relevant Existing Behavior And Production Paths

| Behavior ID | Kind | Current Supported Trigger Or Governing Contract | Current Production Path And Lifecycle | Meaningful Current Outcome / Invariants | Evidence |
| --- | --- | --- | --- | --- | --- |
| BEH-001 | System / Contract | Codex model requests a shell command with a per-command `workdir`; app-server V2 command item contract exposes `cwd`. | Model `exec_command` → Codex executor/unified exec → app-server `commandExecution` start/output/completion. | Command executes in the requested directory; Codex owns sandbox, approval, and result. | Live raw probe; generated V2 `ThreadItem.ts`. |
| BEH-002 | System | AutoByteus receives app-server `item/started` and `item/completed` for `commandExecution`. | `CodexAppServerClient` → `CodexClientThreadRouter` → `CodexThread` → `CodexAgentRunBackend` → `CodexThreadEventConverter` → shared payload parser → canonical listeners/memory/UI. | Canonical tool is `run_bash`; command survives; `item.cwd` is present in the source but absent from canonical `arguments`. | Source trace; disposable harness output. |
| BEH-003 | User / System | Approval-required Codex command produces `item/commandExecution/requestApproval` with command context. | App-server server request → router → thread approval coordinator/local event → item event converter → shared payload parser → canonical approval event. | Approval identity/decision flow works, but stable top-level `cwd` is not promoted into canonical `arguments`. | Generated approval type; converter/parser source trace. |
| BEH-004 | Operational | Diagnostic/runtime-native history projection reads a Codex thread; future local raw traces are written from live canonical events. | Native history: `thread/read` → history item normalizer → shared payload parser → diagnostic projection. Local trace: canonical lifecycle → runtime memory sequencer → raw trace writer. | Native normalization and future local persistence omit `cwd`; existing local traces remain readable. | Normalizer and writer source; disposable normalizer output. |

## Design Health Assessment Evidence

- Change posture (`Bug Fix`):
- Candidate root cause classification (`Local Implementation Defect`):
- Refactor posture evidence summary: The shared parser is the correct owner and all affected projections already reuse it. Add the missing field mapping and tests; no ownership restructuring is indicated.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| Generated app-server protocol | Stable `cwd` exists on the authoritative source shapes. | No new upstream adapter or raw-event dependency is needed. | No |
| `CodexToolPayloadParser.resolveToolArguments` | Shared owner omits only top-level/nested `cwd` while already synthesizing `command`. | Local defect inside a healthy reuse boundary. | Map `cwd` in design/implementation. |
| Live and history probes | Two consumers fail identically through the same parser. | One shared correction avoids duplicated fixes. | Add consumer-level regression tests. |
| Execution trace | Codex itself executes in the correct directory. | Do not redesign or reroute execution. | Preserve as explicit invariant. |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-server-ts/src/runtime-management/codex/client/codex-app-server-client.ts` | Spawns Codex app-server and transports JSON-RPC. | Does not interpret or execute command items. | No change expected. |
| `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread.ts` | Owns thread lifecycle, sends turns, receives routed app-server facts, handles approvals. | Sends workspace `cwd`; per-command native item carries its own `cwd`. | No execution/lifecycle change expected. |
| `autobyteus-server-ts/src/agent-execution/backends/codex/backend/codex-agent-run-backend.ts` | Converts admitted Codex facts to canonical runtime events and publishes them. | Confirms the `run_bash` mapping is representational. | Preserve boundary; no rerouting. |
| `autobyteus-server-ts/src/agent-execution/backends/codex/events/codex-item-event-converter.ts` | Maps live item/approval lifecycle to canonical events. | Uses shared argument parser for command starts, terminals, and approvals. | Likely no production-code change if shared parser is corrected. |
| `autobyteus-server-ts/src/agent-execution/backends/codex/items/codex-tool-payload-parser.ts` | Shared extraction/normalization for Codex tool fields. | `run_bash` branch maps command but not `cwd`. | Primary implementation owner. |
| `autobyteus-server-ts/src/agent-execution/backends/codex/history/codex-thread-history-item-normalizer.ts` | Normalizes native Codex thread items for diagnostic projection. | Reuses shared parser and inherits omission. | Add focused history regression coverage; likely no production-code change. |
| `autobyteus-server-ts/src/agent-memory/services/runtime-tool-trace-sequencer.ts` | Persists canonical live tool call arguments. | Will naturally store `cwd` once live arguments include it. | No schema or writer change. |
| `autobyteus-ts/src/tools/terminal/tools/run-bash.ts` | Defines AutoByteus-native `run_bash` execution contract. | Canonical field is already named `cwd`. | No change; provides target semantic vocabulary only. |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/codex/events/codex-thread-event-converter.test.ts` | Live converter regression coverage. | Current result-first command fixture asserts command only and omits a contract-valid `cwd`. | Extend/add live and approval cases. |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/codex/history/codex-thread-history-item-normalizer.test.ts` | Native-history item normalization coverage. | No command-execution coverage exists. | Add command + cwd case. |

## Runtime / Probe Findings

| Date | Method | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-08-21 | Probe | Direct JSON-RPC driver against `codex app-server` with exact `pwd`/nested-workdir prompt | Raw model function call used `exec_command` with `workdir`; stable item used `cwd`; completed output was the nested directory. | Upstream support and correct native execution are proven. |
| 2026-08-21 | Spec generation | `codex app-server generate-ts --experimental ...` | Generated V2 command item requires `cwd`; approval request exposes it. | Stable source field is known and version-pinned. |
| 2026-08-21 | Test | Disposable Vitest via real Codex thread event harness | Native item `{command,cwd}` became canonical `{command}`. | Live converter omission reproduced. |
| 2026-08-21 | Test | Same disposable Vitest invoking native-history normalizer | Native item `{command,cwd}` became `toolArgs {command}`. | History normalizer omission reproduced. |

## External / Public Source Findings

- Public API / spec / issue / upstream source: Official OpenAI Developers domain search for the exact app-server/CWD topic.
- Version / tag / commit / freshness: Search performed 2026-08-21; no detailed public versioned contract page surfaced.
- Relevant contract, behavior, or constraint learned: None beyond the local version-exact generator.
- Why it matters: The installed `codex-cli 0.149.0` schema/TypeScript generator and live runtime frames are more precise for this integration than a generic public Codex page.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: Installed authenticated Codex CLI; no AutoByteus server process required for the direct probe.
- Required config, feature flags, env vars, or accounts: Existing Codex authentication; `experimentalRawEvents: true` only to capture the model-facing raw call. Stable command item events do not depend on consuming the raw frame.
- External repos, samples, or artifacts cloned/downloaded for investigation: None.
- Setup commands that materially affected the investigation:
  - Version-exact protocol generation to temporary `/tmp` directories.
  - Disposable Python JSON-RPC driver under `/tmp`.
  - Disposable Vitest file under the task worktree plus temporary `node_modules` symlinks to the shared checkout's installed dependencies.
- Cleanup notes for temporary investigation-only setup: Disposable test file and dependency symlinks were removed; the probe app-server process was terminated. Temporary `/tmp` scripts, logs, schema output, and disposable workspace were removed after the durable evidence supplement was written.

## Findings From Code / Docs / Data / Logs

1. **The user's intuition is correct about the missing information.** Exact observed model call:
   `exec_command({"cmd":"pwd","workdir":"<nested-target>","yield_time_ms":10000,"max_output_tokens":2000})`.
2. **Codex app-server already normalizes the model field.** Its stable lifecycle item contains `command` and `cwd`; AutoByteus should consume that stable item rather than parse the experimental raw function call.
3. **The command ran correctly.** The completed command item had exit code `0`, and stdout was the requested nested directory (with macOS `/private/var` canonicalization).
4. **“Convert to run_bash” is not command execution.** It is AutoByteus's canonical event/history vocabulary for displaying, persisting, and replaying a Codex-native command lifecycle.
5. **The omission is centralized.** `CodexToolPayloadParser.resolveToolArguments` does not synthesize canonical `cwd` from `payload.cwd` or `item.cwd`.
6. **All relevant consumers inherit it.** Live command start/completion, approval request projection, and native-history normalization call the same parser.
7. **Future memory traces are fixed transitively.** The local trace writer persists canonical arguments without a closed schema; it needs no direct change.
8. **Existing local traces are not automatically repairable by this mapping.** Normal UI replay uses application-owned traces, while the native Codex history provider is diagnostic. No backfill is recommended for this small defect.

## Persisted Data Transition Evidence (When Applicable)

- Current stored subject, location, representative shape, and approximate volume: Per-run raw trace JSON records under run memory directories, with `tool_call.tool_args` as an open JSON object. Volume varies by run; exact production volume is not needed because no rewrite is proposed.
- Relevant code-model, serialization, semantic, or physical-store change: Future `run_bash` tool args add the already-canonical optional `cwd` key. No trace schema or physical format changes.
- Normal readers and writers, including unknown/extra-field behavior: `RuntimeToolTraceSequencer` extracts `payload.arguments`; `ExternalRuntimeMemoryWriter` writes the object; `RawTraceItem` and downstream projections already support arbitrary argument keys. Canonical `run_bash` examples elsewhere already include `cwd`.
- Representative direct-read or compatibility evidence: Existing fixtures show `run_bash.tool_args` can contain `cwd`; readers treat args as JSON records. Pre-change traces lacking the key remain valid.
- Required semantics and invariants preserved by direct use: `Yes` — existing files parse unchanged; future files use the same object with one additional meaningful key.
- Physical storage, privacy/security, disposal, rebuild, or operational constraints: CWD is already present in Codex native items and raw lifecycle payloads; the change promotes it into canonical args. No new secret class or physical-store constraint is introduced.
- Concrete benefit, cost, and risk of migration if it remains a candidate: Backfill would add complexity, depend on availability/correlation of native provider history, and risk rewriting user traces for display enrichment. It is disproportionate and out of scope.
- Existing migration framework or lifecycle constraints, only if migration may be required: Not applicable; decision is `Directly Usable — No Migration`.

## Constraints / Dependencies / Compatibility Facts

- Installed target runtime is `codex-cli 0.149.0`.
- Stable app-server V2 field is `cwd`; raw model-facing field is `workdir`.
- `experimentalRawEvents` is diagnostic and must not become a production dependency.
- Existing synthetic tests sometimes omit contract-required `cwd`; parser behavior should remain non-fabricating when absent.
- Clean-cut target is a single current canonical `cwd` field, with no aliases or version branches.

## Open Unknowns / Risks

- No blocking unknown remains for the requirements basis.
- Upstream protocol evolution is a normal dependency risk; tests should use the current stable item/request shapes.
- The direct probe did not receive `turn/completed` before its post-final-message timeout, but it captured command start, output, successful completion, and final answer. This does not undermine the field-mapping verdict.
- Retrospective enrichment of old application-owned traces would require a separate explicit requirement if desired.

## Notes For Architecture Reviewer

The requirements basis, including the no-backfill boundary, was approved on 2026-08-21. The design should remain intentionally local: extend the existing shared `run_bash` argument parser to promote stable app-server `cwd`, then cover live, approval, absent-CWD, and native-history scenarios without changing execution owners.
