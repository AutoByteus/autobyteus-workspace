# Design Spec

## Current-State Read

`edit_file` already has a coherent end-to-end ownership chain. Provider and XML response paths decode a model's patch argument without trimming it, the tool invocation boundary forwards that string, `editFile` owns path resolution/read/retry/write sequencing, and `applyContextPatch` owns the patch grammar, context matching, and target-content transformation. The retained DeepSeek run and exact replay show that this structure reaches the correct owner: the first semantic divergence occurs only when `context-patch.ts` retains an unterminated final patch record and later concatenates it with untouched target content.

The structural boundaries remain healthy for this scope. Transport code must preserve the supplied argument rather than guess patch semantics. `editFile` must remain a thin I/O and retry boundary rather than acquire patch-line repair logic. The patch parser must remain the only semantic owner and must continue to reject unsafe or ambiguous context, assemble the complete result before any write, tolerate numeric hunk decoration only as ignored noise, and preserve existing explicit `\ No newline at end of file` behavior.

The current defect is a missing parser invariant, not a provider adapter, streaming, dispatch, file-placement, or lifecycle problem. The current parser uses one line splitter for both target-file bytes and patch-document records. Preserving an unterminated final target-file line is correct; preserving an unterminated final patch record as target semantics is not. The target design therefore completes the patch document only at the patch parse boundary and leaves original-file splitting unchanged.

## Intended Change

Before `parsePatch` splits a patch document into records, complete an unterminated patch string with one detected document line ending: `CRLF` when the patch contains `CRLF`, otherwise `LF`. Do nothing when the patch already ends in `LF` (including the `LF` byte that terminates a `CRLF` pair). The existing marker parser then remains the sole mechanism that can remove a changed record's line terminator.

This is a clean-cut contract correction. An unterminated outer tool argument no longer implicitly requests an unterminated changed target line. Callers that need that result must use the exact marker. Align the native argument schema, XML schema/example, durable documentation, and focused tests with this rule. Do not change provider streaming, JSON extraction, XML sentinel stripping, invocation dispatch, path handling, matching, retry, or write behavior.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind (`User`/`System`/`Operational`/`Contract`) | Approved Requirement / Intent And Acceptance-Criteria IDs | Approved Trigger Or Governing Contract | Relevant Existing Behavior And Evidence Reference | Approved Change Or Preserved Outcome | Target Production Path / Lifecycle And Spine ID(s) |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | REQ-001, REQ-002, REQ-003, REQ-007 / AC-001, AC-002, AC-003, AC-008 | A supported agent invokes `edit_file` with a context patch whose final addition record lacks an outer terminal separator. | Exact run call `call_fad098d549d341a5b63aa021`, replay, and first-divergence analysis in `investigation-notes.md` and `trace-and-probe-evidence.md`. | Complete the final logical patch record before parsing so an addition and following untouched file line remain separate; preserve unique matching and one-write behavior. | Model tool call -> transport preservation -> invocation -> `editFile` -> `applyContextPatch` -> file write (DS-001); internal parse/apply path (DS-003). |
| BEH-002 | Contract | REQ-002, REQ-004, REQ-006, REQ-007 / AC-004, AC-005, AC-006, AC-008 | The documented context-patch grammar, including exact `\ No newline at end of file`. | `context-patch.ts`, current conflicting EOF test, and contract probe recorded in the investigation package. | Make patch-document termination framing-only. Retain the marker as the sole changed-content opt-out, use the patch's line-ending style for a synthesized terminator, and preserve already terminated patches and untouched unterminated EOF content. | Model-facing schema/docs -> patch argument -> semantic parser contract (DS-002); normalization/marker parsing (DS-003). |
| BEH-003 | Contract | REQ-005, REQ-006, REQ-007 / AC-001, AC-007, AC-008 | OpenAI-compatible or XML model output supplies an `edit_file` patch argument. | Transport source read and existing streaming/parser tests cited in `investigation-notes.md`; no trimming path was found. | Preserve argument bytes through transport and dispatch; apply the semantic rule only in `context-patch.ts`. Keep API and XML model-facing wording consistent. | Tool contract rendering (DS-002) and runtime invocation path (DS-001). |

The behavior map defines the real behavior served by the design. DS-001 shows the complete production edit lifecycle, DS-002 shows contract exposure to models, and DS-003 details the bounded parser operation where the fix belongs.

## Relevant Supplemental Task Artifacts

| Artifact Path | Purpose | Related Requirement / Acceptance-Criteria IDs (When Applicable) | Relationship To This Design | Status / Approval Applicability |
| --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/deepseek-edit-newline-boundary/tickets/in-progress/deepseek-edit-newline-boundary/trace-and-probe-evidence.md` | Sanitized trace statistics, exact replay, transport exclusion, and candidate contract probe | REQ-001 through REQ-005 / AC-001 through AC-007 | Establishes the owner, failing byte shape, provider-neutrality need, and viability of parse-boundary completion. | Complete evidence; approval N/A. |

## Task Design Health Assessment (Mandatory)

- Change posture: `Bug Fix`
- Current design issue found: `Yes`
- Root cause classification: `Missing Invariant`
- Refactor needed now: `No`
- Evidence: All 21 latest-run patches reached the stored trace without an outer line ending; internal newlines survived. Exact replay reproduces the corruption inside `applyContextPatch`. Transport code does not trim, `editFile` already sequences semantic application before one write, and the explicit no-newline marker already belongs to the parser.
- Design response: Complete only the patch document's final record at the semantic parse boundary, then let the existing parser, marker logic, matcher, and assembler operate normally.
- Refactor rationale: The current semantic owner, I/O boundary, public API shape, file placement, and `ParsedHunk` structures are appropriate. The invariant needs one private normalization operation; introducing a new service, provider branch, transport preprocessor, or shared abstraction would fragment ownership rather than improve it.
- Intentional deferrals and residual risk: Mixed-EOL policy beyond the synthesized final record is unchanged. The approved rule detects `CRLF` by its presence and otherwise chooses `LF`; pathological mixed-EOL patches retain existing semantics. No known in-scope behavior remains on a bad boundary.

## Terminology

- **Patch document terminator**: the outer separator that completes the final prefixed record in the `patch` argument. It is parser framing, even when omitted by the model/provider.
- **Changed-content terminator**: the line ending represented in the target content for a context, removal, or addition record.
- **Explicit no-newline marker**: the exact record `\ No newline at end of file`, immediately following a prefixed hunk line, which removes that preceding record's changed-content terminator.
- **Context patch**: AutoByteus's path-external, context-located patch grammar. It is not a full unified diff; path is supplied as a separate tool argument and numeric hunk coordinates, when accepted, are ignored.

## Design Reading Order

This design proceeds from the verified production lifecycle and contract correction to the owner-local parser change, then maps documentation and coverage around that owner. No migration, new subsystem, new public interface, or compatibility path is introduced.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Obsolete behavior in scope: the implicit rule that an unterminated outer patch string means the final changed target record should lack a line ending.
- Required removal: remove that semantic path by completing the patch document before body parsing; replace the unit test that codifies implicit EOF behavior with the approved marker-only contract.
- No wrapper, feature flag, dual parser, provider allowlist, or fallback branch may retain the ambiguous behavior.
- The explicit marker is not compatibility machinery; it is the current and target canonical grammar for a deliberate no-final-newline result.

## Persisted Data / State Transition Decision (Mandatory When Persisted Data May Be Affected)

- Stored subject, location, representative shape, and approximate volume: Existing workspace text files and historical JSONL traces; the observed trace contains 341 records.
- Relevant code-model, serialization, semantic, or physical-store change: None. Only future patch application semantics change.
- Normal reader/writer behavior and representative evidence: `editFile` reads one current file, computes a full result, and writes once after success; raw traces are read-only investigation evidence.
- Required semantics and invariants under direct use: Existing files and traces remain byte-for-byte untouched until a future supported edit targets a file.
- Physical-store, privacy/security, disposal/rebuild, and operational constraints: Do not migrate, rewrite, or copy historical traces; do not expose secrets.
- Decision: `Not Affected`
- Decision rationale: There is no persisted schema or stored representation to transform. A migration would create needless I/O and corruption risk with no benefit.
- Acceptance criteria or design constraints supported by this decision: AC-001, AC-002, AC-003, and the preservation constraints in AC-008.

### Migration Plan (Only When Decision Is `Migration Required`)

N/A — persisted data is not affected.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Related Behavior ID(s) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-001, BEH-003 | Model/provider emits an `edit_file` invocation | Target file is written once and tool success/error returns | `editFile` owns the invocation I/O lifecycle; `applyContextPatch` is the authoritative nested semantic owner | Proves the correction belongs after transport and before write, without bypassing either owner. |
| DS-002 | Primary End-to-End | BEH-002, BEH-003 | Tool definition/formatter renders the patch contract | Model receives native API or XML instructions/examples | Tool schema and usage-formatting capability | Keeps the two model-facing surfaces aligned with the parser contract. |
| DS-003 | Bounded Local | BEH-001, BEH-002 | `applyContextPatch(originalContent, patch)` receives complete strings | It returns a fully assembled target string or throws | `context-patch.ts` | Makes the missing framing invariant and explicit marker precedence unambiguous. |

## Primary Execution Spine(s)

- **DS-001 — Runtime edit:** `Model/provider tool-call output -> provider/API or XML response parser -> tool invocation adapter/ToolPhase -> editFile -> applyContextPatch -> fs.writeFile -> tool result`
- **DS-002 — Contract exposure:** `ToolDefinition/formatting registry -> native argument schema or EditFileXmlSchemaFormatter -> prompt/tool schema renderer -> provider request -> model receives context-patch contract`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | A provider or XML parser yields the model's patch bytes unchanged. Dispatch invokes `editFile`, which resolves and reads the file, calls the semantic owner with exact strings, retries matching only on `PatchApplicationError`, and writes the complete returned result once. | Tool-call patch, edit invocation, context-patch transformation, target file | `editFile` for I/O lifecycle; `applyContextPatch` for semantic transformation | Provider converters, streaming extractors, path safety, and failure reporting. |
| DS-002 | Existing schema and formatter owners describe the same bare-`@@` grammar and marker-only no-newline rule through their respective native and XML envelopes. Rendering transports the contract to the model without creating another semantic implementation. | Patch contract, rendered tool instruction | Tool schema/usage formatting capability | Durable documentation and formatter examples. |
| DS-003 | The parser validates non-empty input, completes only an omitted outer final separator, splits records, parses hunks and explicit markers, uniquely matches original context, and assembles all changed and untouched content before returning. | Patch document, parsed hunk, target-content result | `context-patch.ts` | Line-ending detection and focused regression coverage. |

## Spine Actors / Main-Line Nodes

- **Model/provider output** supplies a patch string; it does not own AutoByteus target-file semantics.
- **Streaming/parser and invocation adapter** preserve and deliver the patch argument.
- **`editFile`** owns path validation, file read, exact/whitespace semantic attempts, one successful write, and result/error return.
- **`applyContextPatch`** owns grammar validation, document-record completeness, marker semantics, unique context matching, and full target transformation.
- **Filesystem write** commits only the complete semantic result.
- **Schema/formatter renderer** exposes the owner-defined contract to models but does not implement it.

## Ownership Map

| Main-Line Node | Concrete Ownership |
| --- | --- |
| Provider/API or XML transport | Decode and preserve the model-emitted argument; no patch-content policy. |
| Tool invocation/dispatch | Bind `path`, `base_dir`, and `patch` to the registered tool; no semantic rewriting. |
| `editFile` | Existing-file check, path resolution, read, retry sequence, write-after-complete-success, and public outcome. It is the authoritative public edit entrypoint, not the patch grammar owner. |
| `applyContextPatch` / `context-patch.ts` | Context-patch grammar and invariants, including final document-record completion and explicit marker precedence; matching and pure result assembly. |
| Tool schema/usage formatter | Accurate contract exposure in native and XML presentation shapes. |

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| Registered `edit_file` FunctionalTool | `editFile`, with `applyContextPatch` as its semantic transformation boundary | Exposes the operation to ToolPhase/agents with schema and category metadata | Patch normalization, provider-specific repair, or alternate matching logic. |
| `EditFileXmlSchemaFormatter` | Existing tool usage-formatting capability and the same `edit_file` contract | Adds XML argument/sentinel presentation | Target-file newline semantics or runtime patch mutation. |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| Implicit outer-string-means-target-no-newline behavior | It confuses transport framing with target semantics and caused the observed corruption. | Parser-boundary document completion plus exact marker handling in `context-patch.ts` | In This Change | Clean cut; no compatibility branch. |
| Unit test asserting implicit missing final newline | It institutionalizes the defective dual meaning. | Separate default-terminated and explicit-marker assertions | In This Change | Preserve deliberate no-newline coverage through the marker. |
| Model-facing silence about the final record rule | Models cannot distinguish argument framing from target semantics. | Aligned native/XML descriptions, XML example, and durable docs | In This Change | No provider-specific wording. |

## Return Or Event Spine(s) (If Applicable)

The return path is part of DS-001 rather than a separate event architecture: `applyContextPatch result/error -> editFile write or retry/error -> FunctionalTool/ToolPhase result -> agent`. The correction does not alter result types or event contracts. Success continues to mean the complete result was written; parser failures continue to prevent a write.

## Bounded Local / Internal Spines (If Applicable)

- **DS-003 parent owner:** `context-patch.ts`
- **Short chain:** `validate non-empty patch -> complete final patch-document record -> split records -> parse hunks/markers -> find unique eligible matches -> assemble changed and untouched lines -> return full string`
- **Why it matters:** Completing the patch before `splitLinesKeepEnds` lets all existing hunk and marker semantics operate on complete logical records. Original target content must still go directly to `splitLinesKeepEnds` so an untouched unterminated EOF line remains byte-exact.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Provider/API and XML streaming | DS-001 | Tool invocation boundary | Decode and preserve argument bytes | Supports multiple model protocols | Adding normalization here creates provider divergence and bypasses the semantic owner. |
| Path resolution and deny-path protection | DS-001 | `editFile` | Resolve trusted-local paths safely | Existing public file-tool contract | Mixing it into the pure parser couples filesystem policy to text semantics. |
| Native/XML schema wording | DS-002 | Contract exposure owner | Explain logical-record completion and marker-only opt-out | Prevents future model/caller ambiguity | Implementing semantics in wording/transport alone leaves programmatic callers unsafe. |
| Durable documentation | DS-002, DS-003 | Maintainers and contract owners | Record the simplified grammar and final-record rule | Prevents rediscovery and contradictory guidance | Documentation cannot substitute for the parser invariant. |
| Focused tests | DS-001, DS-002, DS-003 | Corresponding owners | Lock semantic bytes, disk boundary, and exposed contract | Detects regression and wording drift | End-only broad testing would obscure the first divergent owner. |

## Ownership Boundaries

The registered `edit_file` tool is the authoritative public operation. Callers supply arguments there and must not invoke internal filesystem and parser pieces independently as a replacement lifecycle. Within that operation, `applyContextPatch` is the authoritative semantic boundary: it receives original and patch strings and returns a complete string or throws. `editFile` must not inspect final patch characters or repair line endings before calling it.

Provider converters, API streaming, XML sentinel parsing, and invocation adapters end their authority after they preserve and deliver the argument. They must not add, trim, or conditionally rewrite patch separators. Schema formatters describe the contract but cannot become a second implementation. `splitLinesKeepEnds` remains a low-level internal mechanism; the parser decides which input requires framing completion before calling it.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| Registered `edit_file` / `editFile` | Path resolution, access/read, semantic retry, one write, public result | ToolPhase/FunctionalTool and agent invocations | Transport or adapter calls `fs.writeFile` or coordinates parser retries itself | Extend `editFile`'s singular edit lifecycle, not its callers. |
| `applyContextPatch(original, patch, options)` | Patch-document completion, hunk parsing, marker handling, matching, assembly | `editFile` and direct semantic tests | `editFile`/provider conditionally appends newline before semantic call | Correct the invariant within `context-patch.ts`. |
| Tool schema/formatter registry | Native and XML contract rendering | Prompt/provider schema renderers | Provider-specific prompt appends its own competing newline rule | Update canonical schema/formatter descriptions and tests. |

## Dependency Rules

- Provider and XML response paths may depend on their decoding/streaming components and the invocation adapter; they must pass patch content unchanged.
- Tool dispatch may depend on the registered `edit_file` boundary; it must not depend on `context-patch.ts` or filesystem write logic directly.
- `editFile` may depend on path utilities, filesystem I/O, and `applyContextPatch`.
- `context-patch.ts` remains pure and may not depend on provider, streaming, registry, XML, path, or filesystem modules.
- The private patch-document completion operation belongs in `context-patch.ts`; do not export a generic newline repair helper or reuse original-file normalization for this purpose.
- Native and XML contract surfaces may duplicate transport-specific presentation, but both must express the same semantic rule and be locked by their existing owner-level tests.
- Forbidden shortcuts: provider/model-name checks, Markdown bullet scanning, post-write repair, retry-on-merged-content heuristics, or a second legacy parser.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `editFile(context, path, baseDir, patch)` | One file edit invocation | Resolve/read, invoke semantic transformation, retry matching, write once, return result | Explicit path plus optional absolute base directory; patch string | Signature unchanged. |
| `applyContextPatch(originalContent, patch, options?)` | One pure context-patch transformation | Enforce grammar/invariants and return complete target content | Two complete strings and optional `ignoreWhitespace` boolean | Signature unchanged; final-record completion is internal. |
| `ParameterDefinition` for `patch` | Native model-facing edit contract | Describe accepted context-patch argument | Named `patch` string | Wording changes only. |
| `EditFileXmlSchemaFormatter.provide(toolDefinition)` | XML model-facing edit contract | Describe patch grammar plus sentinel framing | Existing `edit_file` tool definition | Runtime semantics remain outside formatter. |

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `editFile` | Yes | Yes | Low | Keep signature and lifecycle unchanged. |
| `applyContextPatch` | Yes | Yes | Low | Add owner-local invariant without another public option. |
| Native patch parameter schema | Yes | Yes | Low | State final-record/marker rule explicitly. |
| XML schema formatter | Yes | Yes | Low | Mirror semantic wording while retaining sentinel-specific framing. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| File edit public operation | `editFile` / `edit_file` | Yes | Low | None. |
| Pure semantic operation | `applyContextPatch` | Yes | Low | None. |
| Private framing operation | `completePatchDocument` | Yes | Low | Keep private and patch-specific; do not call it generic newline normalization. |
| Explicit marker | `NO_NEWLINE_MARKER` | Yes | Low | Preserve exact token and ownership. |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Patch document framing invariant | `src/tools/file/context-patch.ts` | Extend | It already owns all patch grammar and target transformation semantics. | N/A |
| Native contract wording | `edit-file.ts` argument schema | Extend | Existing native schema is the current source exposed to API tool calling. | N/A |
| XML contract/example | Tool usage formatters | Extend | Existing formatter owns XML-specific sentinel presentation. | N/A |
| Durable contract explanation | `docs/tool_schema_and_configuration.md` | Extend | It already defines the context-patch grammar and semantic owner. | N/A |
| Regression coverage | Existing context-patch, edit-file, formatter, and streaming test areas | Extend | Coverage belongs beside current owner boundaries; no new harness is needed. | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| File tools | Pure patch semantics plus edit I/O lifecycle | DS-001, DS-003 | `applyContextPatch`, `editFile` | Extend | One private semantic invariant; no folder split. |
| Tool usage formatting | XML contract and example rendering | DS-002 | Existing formatter registry | Extend | Keep sentinel rules distinct from semantic newline rules. |
| LLM/agent streaming | Argument preservation and invocation assembly | DS-001 | Existing transport owners | Reuse | No source change expected. |
| Durable design documentation | Context-patch contract | DS-002, DS-003 | Maintainers/users | Extend | Add final-record and marker-only language. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `src/tools/file/context-patch.ts` | File tools | `applyContextPatch` semantic boundary | Complete patch-document framing; retain marker, parse, match, assemble | All rules describe one grammar/transformation owner | Existing internal parsed-hunk types |
| `src/tools/file/edit-file.ts` | File tools | `editFile` public boundary | Update native patch parameter contract only | Runtime lifecycle and native tool definition already co-reside | Existing `ParameterSchema` |
| `src/tools/usage/formatters/edit-file-xml-schema-formatter.ts` | Tool usage formatting | XML schema formatter | Mirror final-record and marker rule with sentinel framing | Transport-specific XML presentation is already isolated here | Existing formatter base |
| `src/tools/usage/formatters/edit-file-xml-example-formatter.ts` | Tool usage formatting | XML example formatter | Demonstrate explicit no-newline marker or ensure example communicates the rule | Existing examples are the correct model-facing teaching surface | No |
| `docs/tool_schema_and_configuration.md` | Documentation | Context-patch contract section | Define framing-versus-target semantics | Existing canonical durable contract | No |
| Existing focused test files | File tools / usage formatting | Corresponding source owners | Lock semantic, disk, schema, and preserved transport behavior | Tests stay beside the boundary they verify | Existing fixtures/helpers |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Final patch-record completion | None; private `completePatchDocument` in `context-patch.ts` | File tools | It occurs exactly once at the semantic boundary; extraction would create a false generic utility | N/A | N/A | Generic file-content newline normalizer |
| Native/XML descriptive wording | None | Separate native and XML presentation owners | XML adds sentinel-specific structure; a shared string would couple presentation layers for little value | N/A | N/A | Runtime source of semantics or provider-specific policy |

## Shared Structure / Data Model Tightness Check

No new shared data structure or public type is introduced. `ParsedHunkLine` retains one prefix and one exact content string; its meaning remains singular. `ContextPatchOptions` remains limited to matching tolerance and does not gain a compatibility or newline-mode option.

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/tools/file/context-patch.ts` | File tools | `applyContextPatch` | Add private patch-document completion and apply it only to the patch input before splitting | Keeps the invariant with grammar and transformation | Existing internal types/functions |
| `autobyteus-ts/src/tools/file/edit-file.ts` | File tools | Registered native `edit_file` | State complete-logical-record and explicit-marker contract in `patch` parameter description | Definition already owns native schema | `ParameterSchema` |
| `autobyteus-ts/src/tools/usage/formatters/edit-file-xml-schema-formatter.ts` | Tool usage formatting | XML schema formatter | State same semantic rule while retaining XML sentinel instructions | Correct XML-specific owner | Formatter base |
| `autobyteus-ts/src/tools/usage/formatters/edit-file-xml-example-formatter.ts` | Tool usage formatting | XML example formatter | Add/adjust a concise explicit-marker example if needed to make intentional EOF semantics observable | Prevents schema-only ambiguity for XML models | Existing example format |
| `autobyteus-ts/docs/tool_schema_and_configuration.md` | Documentation | Context-patch contract | Document outer framing, detected EOL, and marker-only target opt-out | Canonical current file-tool design doc | No |
| `autobyteus-ts/tests/unit/tools/file/context-patch.test.ts` | File-tool unit coverage | Pure semantic owner | Replace conflicting implicit EOF expectation; add LF/CRLF/mid-file/untouched-EOF cases | First-divergence coverage belongs here | Public `applyContextPatch` |
| `autobyteus-ts/tests/unit/tools/file/edit-file.test.ts` | File-tool unit boundary coverage | Public edit lifecycle | Prove observed unterminated-final-addition shape writes separated lines to disk and schema wording is exposed | Covers semantic result through real I/O boundary | Registered tool fixture |
| `autobyteus-ts/tests/unit/tools/usage/formatters/edit-file-xml-formatter.test.ts` | Usage formatter coverage | XML contract surface | Assert marker/final-record wording and any example | Prevents native/XML drift | Existing formatter fixtures |
| Existing integration/streaming tests selected by downstream coverage investigation | API/E2E coverage | Runtime boundaries | Confirm disk behavior and transport preservation proportionately | Exact durable expansion/removal decision belongs to `api_e2e_engineer` | Existing harnesses |

## Applied Patterns (If Any)

- **Normalize at the semantic boundary:** complete transport framing immediately before grammar parsing, not in provider adapters or the I/O facade.
- **Explicit opt-out token:** preserve `\ No newline at end of file` as the only syntax that changes a logical record's target terminator.
- **Pure transformation before side effect:** retain the current full patch calculation before `fs.writeFile`.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/tools/file/context-patch.ts` | File | Pure semantic boundary | Patch framing, grammar, marker, matching, assembly | Existing exact owner; flat placement is proportionate | Provider checks, filesystem I/O, Markdown heuristics |
| `autobyteus-ts/src/tools/file/edit-file.ts` | File | Public file-edit boundary | Native contract plus path/read/retry/write lifecycle | Existing file-tool owner | Patch-final-character repair |
| `autobyteus-ts/src/tools/usage/formatters/edit-file-xml-schema-formatter.ts` | File | XML usage surface | XML schema wording and sentinel framing | Existing formatter folder encodes transport presentation | Runtime semantic mutation |
| `autobyteus-ts/src/tools/usage/formatters/edit-file-xml-example-formatter.ts` | File | XML usage surface | Model-facing patch examples | Existing formatter example owner | Alternative patch dialects |
| `autobyteus-ts/docs/tool_schema_and_configuration.md` | File | Durable contract documentation | Simplified context-patch semantics | Existing section 2.2 is canonical | Provider-specific workaround guidance |
| Corresponding existing `tests/unit/...` files | File | Source-owner coverage | Focused semantic/I/O/formatter regressions | Mirrors existing source boundaries | Credentialed provider dependence |

The existing flat `src/tools/file` layout remains clearer than a new module/folder for one private invariant. The semantic parser and public I/O boundary are separate files at the same capability depth and already have explicit dependency direction.

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `src/tools/file` | Main-Line Domain-Control with a thin I/O boundary | Yes | Low | Existing files separate pure patch semantics from edit lifecycle; no new folder needed. |
| `src/tools/usage/formatters` | Transport/presentation | Yes | Low | XML contract shaping stays away from runtime semantics. |
| `src/llm` and `src/agent/streaming` | Transport | Yes | Low | Reused unchanged; explicitly forbidden as fix locations. |
| `tests/unit/tools/file` | Main-line owner coverage | Yes | Low | Mirrors the two file-tool boundaries. |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Unterminated outer argument | `completePatchDocument('@@\n anchor\n+inserted')` supplies a final `\n`, then normal parsing produces `inserted\nfollowing\n`. | `editFile` detects a final `+` or Markdown bullet and conditionally appends bytes. | The parser understands records; the I/O facade and content type do not. |
| Intentional target EOF without newline | `@@\n-old\n\\ No newline at end of file\n+new\n\\ No newline at end of file` produces `new` without a final separator. | Rely on the JSON/tool argument ending immediately after `+new`. | Explicit syntax separates target intent from transport serialization. |
| CRLF | An unterminated patch containing `\r\n` is completed with `\r\n`. | Always append `\n`, creating a mixed final record in an otherwise CRLF patch. | Preserves the approved document line-ending style. |
| Ownership | Transport preserves patch -> `editFile` sequences -> `applyContextPatch` interprets. | Provider-specific DeepSeek preprocessor repairs patches before dispatch. | The bug is not universal to DeepSeek and the semantic contract must be provider-neutral. |

Target private shape:

```ts
function completePatchDocument(patch: string): string {
  if (patch.endsWith('\n')) {
    return patch;
  }
  return patch + (patch.includes('\r\n') ? '\r\n' : '\n');
}

const patchLines = splitLinesKeepEnds(completePatchDocument(patch));
```

This helper is patch-specific. It must not be applied to `originalContent`, because an untouched original EOF without a newline is valid file state that must remain exact.

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Preserve implicit EOF behavior when the final hunk reaches file EOF | One current test expects it and a caller might have relied on the undocumented shape | Rejected | Require the existing exact marker and update the conflicting test/docs. |
| Provider/model-specific newline repair | Latest run used DeepSeek and all 21 calls were unterminated | Rejected | Enforce the provider-neutral invariant in `context-patch.ts`; older evidence proves DeepSeek output shape varies. |
| Dual parse attempt: current semantics then normalized semantics | Could appear to minimize behavior change | Rejected | One canonical normalized document parse; no ambiguous output selection. |
| Post-application joined-line scan | The observed content happened to be Markdown bullets | Rejected | Structural logical-record completion; no content heuristic. |
| New `preserveFinalNewline` option | Could expose outer framing ambiguity as an API switch | Rejected | Existing marker already expresses the target intent inside the grammar. |

## Derived Layering (If Useful)

For explanation only: model protocol/transport -> tool invocation lifecycle -> pure patch semantics -> filesystem side effect. The authoritative boundary rule is satisfied because transport calls the registered edit tool, `editFile` calls the semantic owner, and no upper layer reaches around either owner. Contract formatters are a parallel presentation concern, not a runtime layer.

## Change / Refactor Sequence

1. Add pure semantic regression assertions for the observed unterminated final addition and approved LF/CRLF/marker/EOF cases; change the obsolete implicit-no-newline expectation to the clean-cut target result.
2. Add private `completePatchDocument` in `context-patch.ts` and call it only on `patch` before `splitLinesKeepEnds`; leave original-content splitting and all later parsing/matching logic unchanged.
3. Add/update the `editFile` disk-boundary unit assertion for the exact failure shape and retain no-partial-write/safety checks.
4. Align the native `patch` parameter description, XML schema description/example, and formatter assertions with complete logical records and marker-only no-newline intent.
5. Update section 2.2 of `tool_schema_and_configuration.md` with framing-versus-target semantics and detected line-ending behavior.
6. Run focused semantic, file-tool, formatter, and preserved streaming tests plus build/typecheck and `git diff --check`. The downstream coverage owner will investigate whether broader integration coverage should be added or existing coverage is sufficient.
7. Confirm the diff contains no provider/runtime mutation, generic newline utility, compatibility branch, or content heuristic.

No temporary seam or migration sequence is needed.

## Key Tradeoffs

- **Clean contract over byte-level compatibility:** A caller that silently relied on an unterminated outer argument to produce an unterminated target must add the explicit marker. This deliberate break removes an ambiguity that currently corrupts mid-file edits.
- **Local duplication over cross-presentation abstraction:** Native and XML descriptions remain in their existing owners. Tests and docs align them; extracting a shared description would couple transport-specific presentation without improving runtime correctness.
- **Simple EOL detection over mixed-EOL normalization:** `CRLF` presence selects `CRLF`, otherwise `LF`, matching the approved probe and requirements. The change does not broaden into rewriting mixed-EOL patch records.
- **No new provider experiment:** Exact retained live calls and deterministic replay establish causality more strongly than another credentialed stochastic run.

## Risks

- A programmatic caller may have depended on the undocumented implicit no-final-newline behavior. The accepted mitigation is the existing explicit marker, not a fallback.
- Contract wording could drift between native and XML schemas. Focused formatter/schema assertions should check the marker and complete-record rule.
- Applying completion to original content would incorrectly alter untouched EOF bytes. Implementation and review must verify only the patch argument is completed.
- An unconditional `LF` append would violate CRLF byte expectations. The helper must select `CRLF` when present and tests must assert exact bytes.
- A future change could reintroduce normalization in transport. Existing preservation tests remain required, and review must reject any provider-specific semantic branch.

## Guidance For Implementation

- Keep the production change minimal and private to `context-patch.ts`: one focused helper and one changed parse input expression are sufficient unless tests expose a real additional need.
- Check `patch.endsWith('\n')`; this correctly treats both LF and CRLF documents as already terminated.
- Select the synthesized ending with `patch.includes('\r\n') ? '\r\n' : '\n'` as approved. Do not trim whitespace or inspect the final prefix/content.
- Normalize only after the existing non-empty validation and before `splitLinesKeepEnds(patch)`. Empty/whitespace-only rejection must remain unchanged.
- Do not modify `splitLinesKeepEnds` globally: it must preserve target-file EOF state.
- Preserve exact `NO_NEWLINE_MARKER` handling. Normalizing an unterminated marker record should allow the current parser to remove the preceding content ending normally.
- Do not export the helper or add a newline-mode option to `applyContextPatch`.
- Replace, rather than retain beside a new path, the test named `preserves a missing final newline from a patch without a final line ending`; the marker case remains the canonical no-newline assertion.
- Use a sanitized fixture for the observed bullet failure; do not copy whole trace prompts or credentials into the repository.
- Implementation-scoped checks should include the focused unit files and TypeScript build. Broader API/E2E coverage selection and execution remain with the downstream coverage owner after code review.
