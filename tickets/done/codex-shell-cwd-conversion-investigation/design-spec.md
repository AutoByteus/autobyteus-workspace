# Design Spec

## Current-State Read

Codex app-server owns shell execution. In the verified production path, the model-facing `exec_command` call carries `workdir`, Codex app-server executes the command there, and the stable V2 command lifecycle item exposes the effective directory as `commandExecution.cwd`. AutoByteus receives those stable facts and projects them into its canonical `run_bash` vocabulary for live events, approval presentation, memory traces, and runtime-native history diagnostics.

The relevant projection boundary is already centralized. `CodexItemEventPayloadParser` and the history normalizer delegate command argument construction to `CodexToolPayloadParser.resolveToolArguments`. That method merges structured arguments and synthesizes canonical `command`, but its `run_bash` branch does not promote either top-level `payload.cwd` or nested `item.cwd`. Consequently all consumers of the shared parser lose the same field while Codex execution remains correct. The detailed evidence and existing behavior paths are recorded in `investigation-notes.md` and `codex-cwd-probe-evidence.md` under BEH-001–BEH-004.

The existing owner, boundary, API shape, and file placement are healthy for this scope. The defect is one missing field mapping inside the existing owner, not a reason to reroute execution, add a provider-specific execution adapter, depend on experimental raw events, or change the canonical `run_bash` schema.

## Intended Change

Extend the existing `run_bash` branch of `CodexToolPayloadParser.resolveToolArguments` so it resolves a canonical `cwd` from already-canonical structured arguments or from the stable app-server top-level/nested `cwd` fields. Preserve exact non-empty string values without path rewriting, defaulting, or filesystem resolution. Leave `cwd` absent when no supported source supplies it.

Use the existing resolution convention:

```ts
const cwdValue =
  asString(mergedArguments.cwd) ??
  asString(payload.cwd) ??
  asString(item.cwd);

if (cwdValue) {
  mergedArguments.cwd = cwdValue;
}
```

This keeps explicit canonical arguments authoritative when present, then supports approval-request `payload.cwd`, then command-item `item.cwd`. Supported stable app-server command and approval shapes do not carry conflicting sources. Do not read experimental raw `workdir`, rename commands, or invoke AutoByteus's terminal executor.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind (`User`/`System`/`Operational`/`Contract`) | Approved Requirement / Intent And Acceptance-Criteria IDs | Approved Trigger Or Governing Contract | Relevant Existing Behavior And Evidence Reference | Approved Change Or Preserved Outcome | Target Production Path / Lifecycle And Spine ID(s) |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | Contract | Preserve Codex-owned execution; REQ-004; AC-005 | Codex model shell call and stable V2 `commandExecution` contract | Investigation notes BEH-001; evidence Experiments 1–2 | Preserve model `workdir` → app-server `cwd` translation and Codex execution unchanged. | Codex model → Codex app-server executor → stable command item; DS-001 |
| BEH-002 | System | Preserve live command and `cwd`; REQ-001, REQ-004; AC-001, AC-004 | Stable `item/started` and `item/completed` command lifecycle | Investigation notes BEH-002; evidence Experiment 3 and static root-cause trace | Shared argument parsing adds exact `cwd` when present; all other lifecycle fields and results remain unchanged. | App-server item → thread/backend → event converter → shared parser → canonical lifecycle; DS-002 |
| BEH-003 | User | Present command approval context; REQ-002, REQ-004; AC-002, AC-004 | `item/commandExecution/requestApproval` with top-level `command` and optional `cwd` | Investigation notes BEH-003; generated approval contract | Forwarded approval keeps `cwd`; shared parser includes it in canonical approval arguments without changing approval decisions or identity. | App-server request → approval coordinator/thread → event converter → shared parser → approval event; DS-003 |
| BEH-004 | Operational | Correct future history/persistence without backfill; REQ-003, REQ-005; AC-003, AC-004, AC-006 | Native `thread/read` item and application-owned live trace writer | Investigation notes BEH-004; persisted-data evidence | Native history gains `cwd` at normalization; future live traces persist it naturally; old traces remain unchanged and readable. | Native history → normalizer → shared parser; live event → trace sequencer/writer; DS-004 and DS-002 |

## Relevant Supplemental Task Artifacts

| Artifact Path | Purpose | Related Requirement / Acceptance-Criteria IDs (When Applicable) | Relationship To This Design | Status / Approval Applicability |
| --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-shell-cwd-conversion-investigation/tickets/done/codex-shell-cwd-conversion-investigation/codex-cwd-probe-evidence.md` | Exact generated contracts, live raw/stable frames, controlled conversion output, and root-cause evidence | REQ-001–REQ-005; AC-001–AC-006 | Establishes the authoritative source field and proves the correction is projection-only. | Complete; approval N/A (evidence only) |

## Task Design Health Assessment (Mandatory)

- Change posture (`Bug Fix`): Bug Fix.
- Current design issue found (`Yes`/`No`/`Unclear`): No structural design issue; a local defect exists inside the correct owner.
- Root cause classification (`Local Implementation Defect`): Local Implementation Defect.
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): No.
- Evidence: Live and native-history probes fail identically through `CodexToolPayloadParser.resolveToolArguments`; the stable source already supplies `cwd`; canonical `run_bash` already defines optional `cwd`; all affected consumers already reuse the parser.
- Design response: Add the missing stable-field promotion once in the shared parser and add boundary-focused regression tests.
- Refactor rationale: The parser has singular responsibility for extracting canonical tool arguments, is already placed in the Codex item capability area, and exposes the exact method reused by live and history consumers. Adding another converter, adapter, type, or execution path would fragment ownership.
- Intentional deferrals and residual risk, if any: No refactor is deferred. Upstream protocol evolution remains an ordinary dependency risk addressed by contract-shaped tests. Retrospective enrichment of old traces is explicitly outside the approved scope.

## Terminology

- **Model-facing `workdir`**: The field observed in the raw `exec_command` function arguments. It is diagnostic evidence, not the production integration source.
- **Stable app-server `cwd`**: The V2 command-item/request field consumed by AutoByteus.
- **Canonical `run_bash` arguments**: AutoByteus's projected event/history object, using `command` and optional `cwd`; it is not a second execution request.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: Decommission the command-only projection behavior only when a supported source actually contains `cwd`.
- No file, branch, alias, or compatibility wrapper needs removal. Payloads genuinely lacking `cwd` remain supported by omission because `cwd` is optional; this is the current canonical contract, not a legacy fallback.
- Do not add dual support for raw `workdir` and stable `cwd`. The clean production input is stable app-server `cwd`.

## Persisted Data / State Transition Decision (Mandatory When Persisted Data May Be Affected)

- Stored subject, location, representative shape, and approximate volume: Per-run application-owned raw memory traces containing `tool_call.tool_args` JSON objects; volume varies by run. Codex-owned native histories are read through `thread/read` and normalized on demand.
- Relevant code-model, serialization, semantic, or physical-store change: Future canonical `run_bash` arguments may contain an additional existing optional key, `cwd`. No schema, file-format, or physical-store change occurs.
- Normal reader/writer behavior and representative evidence: `RuntimeToolTraceSequencer` reads canonical lifecycle `payload.arguments`; `ExternalRuntimeMemoryWriter` writes the open JSON object. Representative fixtures already contain `run_bash.tool_args.cwd`, and readers accept arguments as records.
- Required semantics and invariants under direct use: Existing command/result content and trace readability must remain unchanged; future records should retain source `cwd` exactly when present.
- Physical-store, privacy/security, disposal/rebuild, and operational constraints: No rewrite, downtime, or rollout coordination is needed. The directory already exists in native app-server facts; this change does not introduce a new execution capability or secret source.
- Decision (`Directly Usable — No Migration`): Directly Usable — No Migration.
- Decision rationale, including concrete benefit versus I/O, downtime, corruption, recovery, and rollout cost: The version-agnostic JSON reader already accepts the optional key. Backfill would require uncertain correlation with native provider history and risk unnecessary trace rewrites for presentation enrichment without improving executed behavior.
- Acceptance criteria or design constraints supported by this decision: REQ-003, REQ-005; AC-003, AC-006. Existing traces remain command-only where historically recorded; no runtime fallback fabricates missing data.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Related Behavior ID(s) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-001 | Model `exec_command` request | Codex command completion | Codex app-server | Establishes that execution and `workdir`→`cwd` translation are upstream-owned and preserved. |
| DS-002 | Return-Event | BEH-002, BEH-004 | Stable command lifecycle notification | Canonical live event, UI listener, and future trace record | `CodexThreadEventConverter`, with argument shape owned by `CodexToolPayloadParser` | Carries exact `cwd` through the live projection and future persistence path. |
| DS-003 | Return-Event | BEH-003 | Stable command approval server request | Canonical approval event | Codex approval coordinator/thread, then `CodexThreadEventConverter`; arguments owned by `CodexToolPayloadParser` | Ensures the user sees the directory relevant to the decision without changing decision handling. |
| DS-004 | Bounded Local | BEH-004 | Native Codex history command item | Normalized diagnostic history tool item | `normalizeCodexThreadHistoryItem`, reusing `CodexToolPayloadParser` | Prevents a separate history-only mapping and keeps live/history canonical args aligned. |

## Primary Execution Spine(s)

`Model exec_command(cmd, workdir) -> Codex app-server unified executor -> commandExecution(command, cwd) -> shell result`

DS-001 is intentionally unchanged. AutoByteus must not insert its native `run_bash` executor into this spine.

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | Codex translates raw model working-directory intent, executes the shell, and reports a stable command item carrying the effective `cwd`. | Model tool call, app-server command execution item | Codex app-server | Sandbox and approval policy |
| DS-002 | The thread admits the native item; the backend converter selects canonical lifecycle events; the shared parser constructs `run_bash` arguments; downstream listeners and the memory sequencer consume the same corrected object. | Thread event, canonical tool lifecycle, tool arguments | Event converter lifecycle; payload parser transformation | Payload serialization, result projection, memory writing |
| DS-003 | The approval coordinator preserves request params and identity; the converter creates `TOOL_APPROVAL_REQUESTED`; the parser promotes top-level `cwd` alongside `command`. | Approval request, approval event, canonical arguments | Approval coordinator and event converter; payload parser transformation | Approval record and response policy |
| DS-004 | The diagnostic history normalizer classifies a native command item and delegates argument extraction to the same parser, yielding `toolArgs.command` and `toolArgs.cwd`. | Native history item, normalized history tool item | History normalizer | Diagnostic view projection |

## Spine Actors / Main-Line Nodes

- Codex app-server command executor: executes DS-001 and emits stable `commandExecution` facts.
- `CodexThread`: admits and routes native lifecycle facts; preserves server-request params for approval handling.
- `CodexThreadEventConverter`: owns canonical lifecycle event selection and sequencing for DS-002/DS-003.
- `CodexToolPayloadParser`: owns canonical argument extraction and the `command`/`cwd` field mapping shared by all affected spines.
- `normalizeCodexThreadHistoryItem`: owns native-history item classification and result shape while delegating shared argument extraction.
- `RuntimeToolTraceSequencer`: consumes canonical live arguments for future persistence; it is not changed.

## Ownership Map

- Codex app-server owns shell process creation, effective working directory, sandboxing, approval enforcement, stdout/stderr, and exit status.
- `CodexThread` owns runtime-thread lifecycle, admission, request routing, and approval records. It must pass native request context through without reinterpretation.
- `CodexThreadEventConverter` owns which canonical events are emitted and when. It must not duplicate field extraction already owned by the parser.
- `CodexToolPayloadParser` owns provider-shape-to-canonical-argument transformation. It is the only production file that should change.
- The history normalizer owns history-specific status/result assembly but must reuse the parser for command arguments.
- Memory services own persistence of canonical events and must remain schema-agnostic for this optional key.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `CodexItemEventPayloadParser.resolveToolArguments` | `CodexToolPayloadParser.resolveToolArguments` | Provides the converter-facing payload API. | A duplicate `cwd` mapping or provider protocol fork. |
| `CodexAgentRunBackend` event subscription | `CodexThreadEventConverter` | Bridges admitted native facts to canonical `AgentRunEvent`s. | Shell execution or argument normalization policy. |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| Command-only canonical projection when stable app-server `cwd` is present | It loses execution context already supplied by the authoritative provider contract. | `CodexToolPayloadParser.resolveToolArguments` producing `{command, cwd}` | In This Change | This removes defective behavior, not a separate code branch. |
| Any proposed raw-event `workdir` compatibility path | Stable app-server `cwd` is the supported production source. | Existing stable item/request pipeline | In This Change | Reject by not adding it; no existing path needs deletion. |

## Return Or Event Spine(s) (If Applicable)

- DS-002: `item/started or item/completed -> CodexThread -> CodexAgentRunBackend -> CodexThreadEventConverter -> CodexToolPayloadParser -> AgentRunEvent -> listeners / RuntimeToolTraceSequencer`.
- DS-003: `commandExecution/requestApproval -> CodexClientThreadRouter -> CodexThread approval coordinator -> local/native thread event -> CodexThreadEventConverter -> CodexToolPayloadParser -> TOOL_APPROVAL_REQUESTED`.

## Bounded Local / Internal Spines (If Applicable)

- DS-004 parent owner: `normalizeCodexThreadHistoryItem`.
- Chain: `thread/read commandExecution item -> family classification -> shared argument resolution -> normalized tool history item`.
- It matters because the diagnostic history query is separate from live streaming but must share the same canonical argument semantics.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Approval decision/record handling | DS-003 | `CodexThread` | Correlate and answer provider approval requests. | Provider protocol requires a response. | Mixing it into argument parsing could change policy while fixing presentation. |
| Event payload serialization/redaction | DS-002, DS-003 | Event converter | Produce safe serializable payloads. | Existing Agent Tools redaction rules. | A new CWD-specific serializer would duplicate extraction and risk dropping fields again. |
| Memory persistence | DS-002 | Runtime memory subsystem | Persist canonical arguments from live events. | Durable replay/history. | Direct Codex-aware persistence would bypass the canonical event contract. |
| Native diagnostic projection | DS-004 | Run view/history subsystem | Read provider history when requested. | Diagnostic visibility independent of local trace replay. | A separate command mapper would drift from live behavior. |
| Sandbox and filesystem authorization | DS-001 | Codex app-server | Govern actual command access. | Execution safety. | Treating projected `cwd` as an execution instruction would duplicate or bypass provider controls. |

## Ownership Boundaries

The authoritative provider boundary is the stable app-server command item/request. Raw model response frames remain diagnostic only. Once a stable fact enters AutoByteus, the event converter owns lifecycle semantics and delegates argument transformation to `CodexToolPayloadParser`. Downstream UI and memory consumers accept the canonical result and must not reach back into nested provider payloads to recover `cwd`.

The parser may read structured canonical arguments plus stable top-level/nested provider fields. It must return data only; it must not resolve paths, inspect the filesystem, change process state, or execute commands.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| Stable app-server V2 command item/request | Raw model call and unified shell execution | Codex thread/router integration | Parsing opt-in `rawResponseItem` for production `workdir` | Extend the stable adapter/parser only if the stable contract changes. |
| `CodexToolPayloadParser.resolveToolArguments` | Structured-argument merge and command/CWD extraction | Event payload facade and history normalizer | Converter- or history-specific `cwd` extraction | Add the canonical field once in the shared parser. |
| Canonical `AgentRunEvent.payload.arguments` | Provider-specific source shapes | UI, memory, trace projection | Consumers inspecting `payload.item.cwd` themselves | Correct the event projection owner. |

## Dependency Rules

- Codex thread/router code may depend on app-server JSON shapes but must not depend on AutoByteus's terminal executor.
- Event and history projection may depend on `CodexToolPayloadParser`; they must not duplicate `cwd` mapping.
- `CodexToolPayloadParser` may use the existing local `asString`/`asObject` helpers and file-change helper; it must not depend on runtime memory, UI, process execution, or experimental raw-event schemas.
- Memory persistence may consume canonical arguments but must remain unaware of `commandExecution.cwd` nesting.
- Do not introduce `workdir` aliases, version branches, fallback defaults, path canonicalization, or `cd` command rewriting.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `resolveToolArguments(payload, "run_bash")` | Canonical shell tool arguments | Resolve `command` and optional `cwd` from supported Codex shapes. | Payload record plus explicit `run_bash` family selector | Existing interface remains unchanged. |
| `CodexThreadEventConverter.convert(message)` | Canonical live event lifecycle | Select lifecycle event type and attach resolved arguments. | Branded thread message with invocation/turn identity | No signature change. |
| `normalizeCodexThreadHistoryItem(input)` | One native history tool item | Classify and normalize command history data. | Item plus turn/item indices | No signature change. |

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `resolveToolArguments` | Yes | Yes | Low | Preserve API; add `cwd` inside its existing run-bash branch. |
| Event converter | Yes | Yes | Low | Add tests only; do not add extraction logic. |
| History normalizer | Yes | Yes | Low | Add tests only; continue shared-parser delegation. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Provider working directory | `cwd` | Yes | Low | Keep stable/canonical name; do not expose raw `workdir`. |
| Canonical shell event | `run_bash` | Yes within AutoByteus | Low | Preserve; document that projection is not execution. |
| Argument owner | `CodexToolPayloadParser` | Yes | Low | Reuse rather than adding a CWD-specific helper. |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Stable provider field extraction | Codex item payload parsing | Extend | The shared parser already owns command and file-change canonical argument extraction. | N/A |
| Live lifecycle propagation | Codex event conversion | Reuse | It already calls the shared parser for start/completion/approval. | N/A |
| Native-history propagation | Codex history normalization | Reuse | It already calls the shared parser for command items. | N/A |
| Trace persistence | Runtime memory | Reuse | Open JSON arguments already persist optional `cwd`. | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Codex item normalization | Provider-to-canonical command argument mapping | DS-002–DS-004 | Event converter and history normalizer | Extend | Sole production-code change. |
| Codex live event conversion | Lifecycle and approval event projection | DS-002, DS-003 | Agent run backend | Reuse | Regression coverage only. |
| Codex native-history normalization | Diagnostic item projection | DS-004 | Run view/history provider | Reuse | Regression coverage only. |
| Runtime memory | Durable live canonical trace | DS-002 | Replay/history consumers | Reuse | No code or schema change. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `src/.../items/codex-tool-payload-parser.ts` | Codex item normalization | Canonical argument owner | Add stable `cwd` promotion in `run_bash` branch. | Command and CWD form one canonical shell argument object. | Yes, existing parser |
| `tests/.../events/codex-item-event-payload-parser.test.ts` | Codex item normalization tests | Parser facade contract | Cover nested/top-level/absent CWD resolution and precedence. | Directly pins the changed owner. | Yes |
| `tests/.../events/codex-thread-event-converter.test.ts` | Live event tests | Converter boundary | Cover started, completed, and approval canonical payloads. | Existing end-to-end converter harness. | Yes |
| `tests/.../history/codex-thread-history-item-normalizer.test.ts` | History tests | History normalization boundary | Cover command history `toolArgs.cwd`. | Existing native-history test location. | Yes |
| `tests/.../thread/codex-thread.test.ts` | Thread request tests | Approval forwarding boundary | Verify command approval request forwards top-level `cwd` unchanged. | Existing approval identity/forwarding scenario. | Yes |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Command/CWD extraction used by live and history | Existing `codex-tool-payload-parser.ts` | Codex item normalization | It is already the shared argument owner. | Yes | Yes | A generic path resolver or executor. |

No new structure or file should be extracted; doing so would over-abstract a two-field mapping already housed in the correct shared owner.

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| Canonical `run_bash` arguments `{command, cwd?}` | Yes | Yes | Low | Use `cwd` only; do not introduce canonical `workdir`. |
| Stable app-server command item `{command, cwd, ...}` | Yes | Yes | Low | Read through existing payload parser; do not copy the provider type. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-execution/backends/codex/items/codex-tool-payload-parser.ts` | Codex item normalization | `CodexToolPayloadParser` | Resolve canonical `cwd` after argument merge and before sanitized return for `run_bash`. | Single authoritative transformation point. | Existing structure |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/codex/events/codex-item-event-payload-parser.test.ts` | Parser contract tests | `CodexItemEventPayloadParser` facade | Direct cases for nested item CWD, top-level approval CWD, canonical structured CWD, and missing CWD. | Pins field sourcing without unrelated lifecycle noise. | Existing facade/parser |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/codex/events/codex-thread-event-converter.test.ts` | Live converter tests | `CodexThreadEventConverter` | Assert exact CWD on start, terminal completion, and command approval events. | Verifies affected public canonical events. | Existing harness |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/codex/history/codex-thread-history-item-normalizer.test.ts` | History tests | `normalizeCodexThreadHistoryItem` | Assert command history returns `{command, cwd}` and missing CWD stays absent. | Verifies the separate read-time consumer. | Shared parser |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/codex/thread/codex-thread.test.ts` | Thread request tests | Terminal approval coordinator | Extend existing approval forwarding case with exact `cwd`. | Proves the stable request field reaches the converter boundary unchanged. | Existing coordinator |

## Applied Patterns (If Any)

- **Shared normalization boundary**: Live events and history reuse `CodexToolPayloadParser`, preventing parallel provider-shape mappings.
- **Projection-only adapter**: Stable provider fields become canonical event arguments without invoking business/runtime execution behavior.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-execution/backends/codex/items/codex-tool-payload-parser.ts` | File | Codex item normalization | Production mapping of stable `cwd` into canonical `run_bash` args. | Existing provider item parsing owner. | Execution, path validation, persistence, raw-event dependency |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/codex/events/codex-item-event-payload-parser.test.ts` | File | Parser facade tests | Source precedence and absence behavior. | Existing parser-facade suite. | Runtime shell probes |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/codex/events/codex-thread-event-converter.test.ts` | File | Live event boundary tests | Start/completion/approval observable payloads. | Existing production-thread converter harness. | Provider process execution |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/codex/history/codex-thread-history-item-normalizer.test.ts` | File | History boundary tests | Native command history argument shape. | Existing history normalization suite. | Live event sequencing |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/codex/thread/codex-thread.test.ts` | File | Thread approval tests | Request-context forwarding invariant. | Existing approval coordinator coverage. | Canonical argument extraction assertions beyond forwarding |

No folders or modules are added, moved, or deleted.

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `.../codex/items` | Main-Line Domain-Control | Yes | Low | Houses shared provider item classification/argument normalization. |
| `.../codex/events` | Main-Line Domain-Control | Yes | Low | Houses event lifecycle projection and facade tests. |
| `.../codex/history` | Off-Spine Concern | Yes | Low | Houses diagnostic history normalization while reusing item parsing. |
| `.../codex/thread` | Main-Line Domain-Control | Yes | Low | Houses request routing and approval state, not argument mapping. |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Stable item projection | `{ item: { command: "/bin/bash -lc pwd", cwd: "/workspace/nested" } } -> { command: "/bin/bash -lc pwd", cwd: "/workspace/nested" }` | Parse experimental `arguments.workdir`, rewrite command as `cd ... && pwd`, or execute `run_bash` again. | Separates stable projection from execution. |
| Missing directory | `{ item: { command: "pwd" } } -> { command: "pwd" }` | Default `cwd` to thread workspace or process CWD. | Prevents fabricated context in older/synthetic payloads. |
| Approval projection | `{ command: "pnpm test", cwd: "/repo/pkg" } -> arguments: { command: "pnpm test", cwd: "/repo/pkg" }` | Put `cwd` only in opaque nested provider payload while canonical arguments remain command-only. | Makes approval context visible through the canonical boundary. |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Accept raw model `workdir` as a second canonical source | Raw trace proves the model uses that name. | Rejected | Consume only stable app-server `cwd`; keep raw frames diagnostic. |
| Emit both `workdir` and `cwd` | Could appear to preserve both provider layers. | Rejected | Emit canonical `cwd` only. |
| Default absent `cwd` to thread workspace | Might fill old fixtures/traces. | Rejected | Leave it absent; do not fabricate historical execution context. |
| Backfill old application traces | Could enrich old tool cards. | Rejected | Preserve existing traces; future events naturally persist corrected args. |
| Route through AutoByteus `run_bash` | Could make naming and execution look symmetric. | Rejected | Preserve Codex-owned execution and projection-only conversion. |

## Derived Layering (If Useful)

`Codex transport/thread -> Codex lifecycle projection -> shared Codex item normalization -> canonical AgentRunEvent -> UI/memory consumers`

Native-history diagnostics enter at the shared normalization layer rather than duplicating it. Execution remains upstream inside Codex app-server.

## Change / Refactor Sequence

1. Add `cwdValue` resolution to the existing `run_bash` branch after structured-argument merge, using `mergedArguments.cwd`, then `payload.cwd`, then `item.cwd`; assign only when `asString` returns a value.
2. Add direct parser-facade tests that pin nested item, top-level approval, explicit canonical argument, and absent-CWD behavior.
3. Extend live converter coverage for command start, terminal completion, and command approval; assert exact command/CWD values and preserved event identity/result.
4. Extend terminal approval thread coverage to prove the request coordinator forwards stable top-level `cwd` unchanged.
5. Add native-history command coverage for exact `{command, cwd}`, plus absence behavior if it is not already covered by direct parser tests.
6. Run focused Vitest suites for parser, event converter, thread approval, and history normalizer; then run the repository's implementation-scoped typecheck/test command appropriate to the package.
7. Confirm the diff contains no app-server execution changes, raw-event dependencies, trace migrations, frontend-specific recovery, compatibility aliases, or generated/disposable probe files.

There is no temporary seam, migration, code move, or refactor cleanup phase.

## Key Tradeoffs

- Central parser correction gives all current consumers the field at once and minimizes drift, but requires consumer-level tests so future callers do not accidentally bypass it.
- Preserving exact source strings avoids semantic changes and macOS path-canonicalization surprises, but intentionally performs no validation that the directory still exists when history is read.
- No backfill keeps rollout safe and proportional; historical local traces remain less informative than future traces.

## Risks

- A future app-server version could rename or relocate `cwd`; contract-shaped tests will fail at the integration boundary, but runtime version changes still require normal upstream review.
- Synthetic fixtures that omit contract-required command-item `cwd` could tempt an implementation to default it. Tests must explicitly preserve absence rather than invent a value.
- If extraction were added only to live converter code, native history would remain broken; the shared parser is therefore the required production owner.
- If `workdir` were accepted from raw frames, production could become dependent on opt-in experimental events; this is explicitly forbidden.

## Guidance For Implementation

- Keep the production diff inside `CodexToolPayloadParser.resolveToolArguments`; do not change method signatures.
- Reuse the file-local `asString` helper. Preserve source value spelling; do not trim, normalize, resolve, or stat the path beyond existing helper semantics.
- Add `cwd` only in the `fallbackToolName === "run_bash"` branch so file-change and dynamic-tool argument behavior is unaffected.
- Preserve structured canonical `cwd` when already present. Use stable `payload.cwd` for command approvals and stable `item.cwd` for command lifecycle/history items.
- Do not map raw `workdir`, inject thread-level workspace as a fallback, rewrite shell command text, or call the AutoByteus terminal tool.
- Tests should use harmless literal paths and event fixtures. The retained live runtime probe already proves actual Codex execution and need not become a recurring implementation test.
- Verify AC-001–AC-004 and AC-006 through focused unit/integration suites. AC-005 is a preserved architecture invariant supported by the retained probe and by confirming no execution-path source changes.
