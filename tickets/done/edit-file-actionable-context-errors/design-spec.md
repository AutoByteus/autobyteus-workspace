# Design Spec

## Current-State Read

The supported `edit_file` path has two connected production concerns.

First, the registered tool contract reaches a model through either a native JSON-schema formatter or the custom XML schema/example formatters. `autobyteus-ts/src/tools/file/edit-file.ts` currently owns the native description and `ParameterSchema`; `autobyteus-ts/src/tools/usage/formatters/edit-file-xml-schema-formatter.ts` repeats the patch wording and adds XML-only sentinel framing. The two surfaces describe the same semantic dialect but have no shared wording owner. Both omit parts of the approved read-current/copy-exact workflow, and neither places the approved minimal example directly in the `patch` field guidance.

Second, a tool invocation travels through `ToolPhase` to `editFile`. `editFile` resolves and reads one authorized file, calls pure `applyContextPatch` first with exact matching and then with whitespace-tolerant matching, and writes only after one attempt produces a complete result. `context-patch.ts` parses all hunks, matches each against the still-eligible suffix of the original file, and assembles output in memory. It currently throws message-only `PatchApplicationError` values. The parsed hunk's one-based identity, total count, eligible match count, and conservative candidate evidence are not retained across the semantic boundary, so `editFile` can only append generic advice after both strategies fail.

The exact Daily Assistant evidence proves this is a real supported tool-failure path: the model read the current file, omitted `readonly` in hunk 2 of 4, received a generic failure, then guessed incorrectly about the constructor. The current owner boundaries remain sound: `context-patch.ts` owns grammar/matching/transformation; `editFile` owns the public retry/write/no-write lifecycle; provider formatters own presentation; ToolPhase owns the generic outer invocation wrapper. The design must enrich those owners without adding fuzzy application, provider-specific behavior, or a global tool-error framework.

The separately validated newline-boundary worktree changes the same semantic and presentation files. Its final target completes unterminated patch records and uses the exact `\ No newline at end of file` marker as the sole changed-record opt-out. This design treats that behavior as an integration dependency and never restores the pre-fix final-record behavior.

## Intended Change

Give context-patch failures a tight discriminated data shape owned by `context-patch.ts`. Parsed hunks receive stable one-based identity after a document-level scan establishes the total. Match search returns or throws facts that distinguish missing, ambiguous, invalid-hunk, and document failures. Every missing-context failure classifies the diagnostic scan as `zero`, `unique`, or `multiple`. Only `unique` carries the target range facts and the two mismatching logical lines; `zero` and `multiple` carry no target content. No diagnostic outcome can authorize a change.

Add a file-tool-local public diagnostic renderer that turns the final structured failure into the exact approved model-visible message after `editFile` exhausts exact and whitespace-tolerant attempts. For a unique candidate, it renders only the novel mismatch evidence in a bounded, difference-focused window; it never repeats matching context. For zero, multiple, and ambiguity states, it renders no source content. The renderer owns targeted reread/retry guidance and the truthful no-write suffix; ToolPhase continues adding its existing outer error prefix unchanged.

Centralize the canonical `edit_file` tool description, patch prose, and minimal patch example in a small file-tool contract module. Native registration and the XML schema formatter consume that same source. The native `patch` `ParameterDefinition.description` contains the literal multiline example. The XML `patch` argument contains the same example in its field guidance immediately before the XML-only sentinel instructions. The XML tool element also carries the canonical tool description so the read/re-read workflow reaches XML models rather than being discarded by the custom formatter.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Approved Requirement / Intent And Acceptance-Criteria IDs | Approved Trigger Or Governing Contract | Relevant Existing Behavior And Evidence Reference | Approved Change Or Preserved Outcome | Target Production Path / Lifecycle And Spine ID(s) |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | Contract | REQ-002 through REQ-004; AC-002 through AC-004 | A model receives the registered native or XML `edit_file` contract | `investigation-notes.md`, BEH-001; current `edit-file.ts` and XML schema formatter | Present the approved read/copy/re-read instructions, simplified unified-diff-style identity, prohibitions, and canonical example directly in the patch field while preserving separate path and XML sentinel semantics | `DS-001`: agent tool exposure -> registry/tool definition -> native or XML schema formatter -> provider request -> model |
| BEH-002 | System | REQ-001, REQ-005 through REQ-008, REQ-010, REQ-011; AC-001, AC-005 through AC-008 | A supported `edit_file` invocation contains a missing first or later hunk | `investigation-notes.md`, BEH-002 and exact hunk audit | Reject the complete edit and identify the hunk. A unique one-line-difference outcome shows only its target range, mismatch line, diagnostic-only label, and bounded expected/actual mismatch evidence; zero or multiple outcomes show only their state. All shapes direct a targeted reread/retry and write nothing | `DS-002`, `DS-003`, `DS-004`, `DS-005` |
| BEH-003 | System | REQ-005, REQ-009 through REQ-011; AC-009, AC-010 | A supported invocation has ambiguous current context or invalid hunk-body grammar | `investigation-notes.md`, BEH-003; current parser/matcher errors | Report hunk identity; report the exact eligible match count for ambiguity; preserve the specific grammar reason; never select a location; write nothing | `DS-002`, `DS-003`, `DS-004`, `DS-005` |
| BEH-004 | Contract | REQ-010 through REQ-012; AC-005 through AC-012 | Any supported context-patch attempt succeeds or fails through `editFile` | `investigation-notes.md`, BEH-004; current pure build then single write | Preserve exact-first/whitespace-second matching, ordered eligibility, uniqueness, atomicity, path protection, ToolPhase wrapper, and integrated final-record/no-newline behavior | `DS-002`, `DS-003`, `DS-004`, `DS-005` |

## Relevant Supplemental Task Artifacts

| Artifact Path | Purpose | Related Requirement / Acceptance-Criteria IDs | Relationship To This Design | Status / Approval Applicability |
| --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/edit-file-actionable-context-errors/tickets/in-progress/edit-file-actionable-context-errors/edit-file-diagnostic-contract.md` | Exact intended model guidance, example placement, candidate eligibility/bounds, and error templates | REQ-002 through REQ-010; AC-002 through AC-011 | Authoritative text and output behavior implemented by the contract constants, structured failures, and public renderer | Fully approved on 2026-08-06; renewed approval covers the concise, difference-focused ARCH-FIND-002 revision |

## Task Design Health Assessment (Mandatory)

- Change posture: `Behavior Change`
- Current design issue found: `Yes`
- Root cause classification: `Missing Invariant`
- Refactor needed now: `Yes`
- Evidence: The semantic owner discards hunk identity and match evidence into strings, while the public owner knows retry/no-write state but cannot reconstruct the failed hunk safely. Exact model-facing wording is duplicated between native and XML surfaces and has already drifted.
- Design response: Add owner-local structured failure facts, including a content-free `zero`/`multiple` outcome and a minimal `unique` outcome; extract one shared model-contract source; and add one file-tool-local public diagnostic renderer. Make precision structural by carrying only the unique mismatch lines across the boundary rather than full repeated context blocks. Keep application policy and all outer/runtime boundaries unchanged.
- Refactor rationale: A raw string cannot satisfy deterministic hunk/candidate diagnostics without reparsing or guessing above the semantic owner. Full expected/candidate arrays would also make the renderer responsible for rediscovering which evidence is novel and invite repetitive output. Parsing raw hunks before their bodies is the smallest clean change that establishes total hunk count for grammar errors. Shared contract constants are proportionate because exact identical wording and example placement are acceptance criteria across two surfaces.
- Intentional deferrals and residual risk: No global error-code framework or general XML-description refactor is justified by this single tool. Actual model retry success remains stochastic; deterministic contract visibility and error evidence are the accepted observable behavior.

## Terminology

- **Attempt failure:** A structured semantic failure from one `applyContextPatch` strategy.
- **Public patch failure:** The final message emitted by `editFile` after the existing retry sequence cannot produce a complete result.
- **Eligible target region:** The original-file suffix beginning at the cursor after all earlier hunks, unchanged from current ordered matching.
- **Diagnostic candidate:** One same-length window in the eligible region that meets the approved one-line-difference rule. It is evidence only and is never an application location.
- **Diagnostic candidate outcome:** The complete eligible-region classification `zero`, `unique`, or `multiple`. Only `unique` retains mismatch evidence; `multiple` is irreversible once a second candidate is found.
- **Canonical patch-field example:** The exact bare `@@` replacement example approved in `edit-file-diagnostic-contract.md`, without a path, file headers, numeric coordinates, semantic wrappers, or Markdown fences in the actual schema string.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Remove the generic final suffix `Read the file again and retry with a canonical bare @@ patch and more unique unchanged/removal context.` It is replaced cleanly by failure-specific approved messages.
- Remove message-only hunk failure construction for missing, ambiguous, and invalid-hunk cases. Do not keep a parallel legacy string path alongside structured failure data.
- Remove the superseded full `Expected context`, full `Candidate context`, and repeated `Difference` rendering shape. Identical surrounding lines must not cross into or reappear in the public diagnostic.
- Remove duplicated native/XML patch wording by consuming one canonical file-tool contract source. XML-only sentinels remain a transport addition, not a duplicate semantic contract.
- No compatibility alias, dual error format, fuzzy fallback, provider/model switch, or legacy message branch is permitted.

## Persisted Data / State Transition Decision (Mandatory When Persisted Data May Be Affected)

- Stored subject, location, representative shape, and approximate volume: Ordinary user/workspace files and existing JSONL tool traces; no owned serialized schema changes.
- Relevant code-model, serialization, semantic, or physical-store change: Internal TypeScript failure objects become structured; public trace strings become more actionable. Tool argument names/types and stored file bytes do not change on success.
- Normal reader/writer behavior and representative evidence: `editFile` reads current UTF-8 content, creates a full result in memory, and writes once only on success; ToolPhase persists/display strings without decoding an error schema.
- Required semantics and invariants under direct use: Existing files and traces remain readable; failed patches write no bytes; successful exact/whitespace edits retain their current outcomes.
- Physical-store, privacy/security, disposal/rebuild, and operational constraints: Bound target excerpts; never alter historical traces; preserve path authorization.
- Decision: `Not Affected`
- Decision rationale: There is no persisted schema or data transformation. Rewriting files or traces would add risk with no functional benefit.
- Acceptance criteria or design constraints supported by this decision: REQ-010 through REQ-012; AC-005 through AC-012.

## Data-Flow Spine Inventory

| Spine ID | Scope | Related Behavior ID(s) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-001 | Agent/tool configuration | Provider model sees tool contract | Registered `edit_file` definition | Carries the prevention guidance and field-local example to native and XML models |
| DS-002 | Primary End-to-End | BEH-002, BEH-003, BEH-004 | Model-emitted tool call | File write or atomic rejection | `editFile` | Full supported mutation lifecycle and safety boundary |
| DS-003 | Return-Event | BEH-002, BEH-003, BEH-004 | Structured patch failure or success | Model-visible `ToolResultEvent` | `editFile` for inner result; ToolPhase for outer envelope | Carries actionable correction evidence without changing generic runtime wrapping |
| DS-004 | Bounded Local | BEH-002, BEH-003, BEH-004 | Original content plus patch | Patched content or structured attempt failure | `applyContextPatch` | Owns grammar, hunk identity, ordered matching, ambiguity count, and diagnostic candidate facts |
| DS-005 | Bounded Local | BEH-002, BEH-003, BEH-004 | Current file content | One complete result or final public patch failure | `editFile` | Preserves exact-first/whitespace-second retry and one-write/no-write outcome |

## Primary Execution Spine(s)

`Agent tool configuration -> Tool registry / ToolDefinition -> native schema or EditFileXmlSchemaFormatter -> provider request -> model`

`Model tool call -> streaming/native invocation parser -> ToolInvocation -> ToolPhase -> editFile -> applyContextPatch -> filesystem write or atomic rejection`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | Registration builds one canonical edit contract. Native schema formatters serialize its `ToolDefinition`/`ParameterSchema`; the custom XML formatter renders the same owned text and adds only XML framing. | Registered edit contract, native/XML presentation, model | Registered `edit_file` definition | XML escaping and sentinels, provider schema serialization |
| DS-002 | A model call becomes a `ToolInvocation`; ToolPhase invokes `editFile`; `editFile` resolves/reads one file and delegates pure semantics; it writes only a fully built result. | ToolInvocation, edit command, context patch, file effect | `editFile` | Path protection, generic tool lifecycle events |
| DS-003 | A structured semantic failure returns to `editFile`, which renders the approved bounded inner message after retries. ToolPhase applies its unchanged invocation-ID wrapper and returns it to the model. | Structured failure, public diagnostic, ToolResultEvent | `editFile` for diagnostic semantics | ToolPhase logging/event envelope |
| DS-004 | The semantic owner scans the patch into raw hunks, establishes total count, parses bodies with identity, scans each eligible original-file region, and either assembles output or returns typed facts. | Parsed hunk, match search, output assembly | `applyContextPatch` | Line-ending preservation and diagnostic candidate scan |
| DS-005 | `editFile` attempts exact semantics first, then whitespace-tolerant semantics from the same unchanged original content; only a complete result reaches `fs.writeFile`, otherwise the last structured failure is formatted as no-write. | Retry loop, public failure, single write | `editFile` | Public diagnostic renderer |

## Spine Actors / Main-Line Nodes

- Registered `edit_file` definition: authoritative model-facing tool and argument contract.
- Native/API schema and custom XML schema: provider presentations of the registered contract.
- `ToolPhase`: generic invocation execution and outer result/error envelope.
- `editFile`: authoritative file-edit command and retry/write lifecycle owner.
- `applyContextPatch`: pure context-patch semantic owner.
- Filesystem effect: the single meaningful mutation, reached only after complete semantic success.

## Ownership Map

- `edit-file-contract.ts` owns canonical model-facing strings and the literal patch example; it owns no parsing, I/O, or XML framing.
- `editFile` owns path resolution orchestration, existence/read, retry sequence, final public diagnostic selection, the only write, and success result.
- `context-patch.ts` owns document/hunk grammar, stable hunk identity, line comparison, ordered eligibility, exact match counts, conservative candidate evidence, and pure result assembly.
- `edit-file-patch-diagnostic.ts` serves `editFile` by rendering structured failure facts within approved limits. It owns no matching decisions and cannot return patched content.
- `EditFileXmlSchemaFormatter` owns XML escaping/layout and sentinel instructions; it must consume rather than redefine canonical semantic wording/example.
- ToolPhase remains the generic outer wrapper owner and is unchanged.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| Registered `BaseTool` wrapper | `editFile` | Tool registry and parameter validation | Patch grammar, matching, diagnostic candidate selection |
| `editFile` re-export of `PatchApplicationError` | `context-patch.ts` | Preserve the established error-type import surface | A second error hierarchy or legacy message engine |
| Provider schema formatter | Registered edit contract | Provider-specific serialization | Provider-specific semantic dialect or matching policy |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope | Notes |
| --- | --- | --- | --- | --- |
| Generic canonical-retry suffix in `edit-file.ts` | Hides hunk/candidate facts and does not state no-write precisely | `formatEditFilePatchFailure` | In This Change | Clean replacement; no old-message branch |
| String-only hunk errors | Cannot safely cross the semantic/public boundary | `ContextPatchFailure` union carried by `PatchApplicationError` | In This Change | Document errors still carry a document reason in the same union |
| Sequential body parsing before total count is known | Cannot identify early grammar failures as `hunk n of total` | Raw-hunk document scan followed by indexed body parsing | In This Change | Preserve accepted header grammar |
| Duplicated native/XML semantic text | Exact cross-surface contract will otherwise drift | `edit-file-contract.ts` constants | In This Change | XML keeps only its transport additions |

## Return Or Event Spine(s) (If Applicable)

`applyContextPatch result/failure -> editFile write or bounded public diagnostic -> ToolPhase unchanged outer prefix -> ToolResultEvent -> model`

The inner `PatchApplicationError.message` is authoritative for patch correction. ToolPhase continues to produce `Error executing tool 'edit_file' (ID: ...): PatchApplicationError: ...`; it neither parses nor reformats the inner sections.

## Bounded Local / Internal Spines (If Applicable)

- Parent owner `applyContextPatch` / DS-004: `complete patch document per integrated newline contract -> scan raw hunks -> establish total -> parse indexed hunk bodies -> scan eligible windows -> unique match and assemble, or structured failure -> advance cursor -> append untouched tail`.
- Parent owner `editFile` / DS-005: `read original once -> exact apply -> on PatchApplicationError, whitespace-tolerant apply from the same original -> complete result and one write, or format last structured failure and no write`.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Canonical contract constants | DS-001 | Registered edit contract | Keep native/XML wording and example identical | Exact placement is accepted behavior | Duplicated/drifting provider instructions |
| XML escaping and sentinels | DS-001 | XML schema presentation | Produce valid XML prompt text and retain transport framing | XML streaming needs delimiters | Sentinels mistaken for semantic patch wrappers |
| Public diagnostic rendering | DS-003, DS-005 | `editFile` | Render candidate-state-specific messages and bound only unique mismatch evidence | Semantic facts and public lifecycle knowledge meet here | Renderer accidentally becomes a matcher, content selector, or mutator |
| Path resolution/protection | DS-002 | `editFile` | Resolve trusted-local identity and enforce deny paths | Existing security boundary | Patch semantics authorizing paths |
| ToolPhase envelope/logging | DS-003 | Generic runtime | Add invocation identity and emit result events | Existing runtime contract | Tool-specific formatting leaks into generic runtime |
| Durable documentation/tests | All | Corresponding production owners | Keep contract, semantics, and preserved invariants auditable | Prevent recurrence and integration loss | Live-model behavior becomes the only validation |

## Ownership Boundaries

The registered `edit_file`/`editFile` API is the authoritative mutation boundary. Upstream runtime code supplies `path`, optional `base_dir`, and `patch` and must not call `applyContextPatch` plus filesystem APIs directly. `applyContextPatch` remains a pure internal mechanism and may expose structured failure facts but never reads, writes, resolves paths, or renders provider-specific output. The public diagnostic renderer accepts only structured failure data and returns text; it cannot search the target again or alter match policy. XML/native formatters present the contract but cannot transform the patch.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| Registered `edit_file` / `editFile` | Context application, retry, public diagnostics, read/write | Tool runtime and agents | Runtime calls context matcher then writes itself | Strengthen `editFile`, not the runtime |
| `applyContextPatch` | Raw-hunk parse, line comparison, match/candidate scan, minimal failure facts, assembly | `editFile` | `editFile` reparses the patch or rescans target windows | Enrich `ContextPatchFailure` with only the already-selected mismatch evidence |
| `formatEditFilePatchFailure` | Bounded textual rendering only | `editFile` | Renderer selects a candidate or applies content | Add semantic facts below, never matching above |
| `resolveFileToolPath` | Absolute/base-dir resolution and protection | `editFile` and existing file tools | Patch parser interprets file identity | Extend the path owner if required |

## Dependency Rules

- `edit-file.ts` may import the canonical edit contract, patch semantic owner, public patch diagnostic renderer, path owner, filesystem promises, and tool registry/schema primitives.
- `edit-file-patch-diagnostic.ts` may import only the structured context-patch failure types and language/runtime primitives; it must not import filesystem, path, registry, provider, or streaming code.
- `context-patch.ts` remains pure and may depend only on language/runtime primitives. It must not import `edit-file.ts`, the public renderer, filesystem, registry, provider, or streaming modules.
- The XML schema formatter may import canonical contract constants and formatting primitives. It may add XML sentinels/escaping but must not redefine semantic wording.
- ToolPhase and provider streaming/parser code remain unchanged. No model/provider identity may influence parsing, matching, candidates, or errors.
- A diagnostic candidate is never passed into assembly as a match index. Only a unique full match from the existing selected strategy may advance the cursor.

## Interface Boundary Mapping

| Interface / API / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `editFile(context, path, baseDir, patch): Promise<string>` | One file-edit command | Resolve/read/retry/write/result lifecycle | Absolute path, or relative path plus absolute base dir | Existing authoritative public boundary |
| `applyContextPatch(originalContent, patch, options?): string` | One pure patch attempt | Parse, uniquely match, assemble, or throw structured failure | Complete original content and patch string; `ignoreWhitespace?: boolean` | Existing content API retained |
| `PatchApplicationError` with `failure: ContextPatchFailure` | One patch semantic failure | Carry a discriminated failure plus derived message across retry boundary | `document`, `invalid_hunk`, `missing_context`, or `ambiguous_context` | One class; no parallel legacy subclass |
| `formatEditFilePatchFailure(failure): string` | One final public patch failure | Compose approved bounded/no-write message | Structured failure only | No original content or patch reparsing |
| Canonical contract constants | One model-facing edit contract | Supply tool prose, patch prose, and literal example | Static strings | Native and XML consumers only |

### Structured Failure Shape

Use one discriminated union with only the facts needed by application or rendering:

```ts
type DiagnosticCandidateResult =
  | { kind: 'zero' }
  | {
      kind: 'unique';
      startIndex: number;
      lineCount: number;
      mismatchIndex: number;
      expectedLine: string;
      actualLine: string;
    }
  | { kind: 'multiple' };

type ContextPatchFailure =
  | { kind: 'document'; reason: string }
  | { kind: 'invalid_hunk'; hunkIndex: number; hunkCount: number; reason: string }
  | {
      kind: 'missing_context';
      hunkIndex: number;
      hunkCount: number;
      candidateResult: DiagnosticCandidateResult;
    }
  | {
      kind: 'ambiguous_context';
      hunkIndex: number;
      hunkCount: number;
      matchCount: number;
    };
```

`startIndex` and `mismatchIndex` are zero-based internal indexes. `lineCount` is the complete same-length candidate/anchor window size. The renderer derives the one-based range as `startIndex + 1` through `startIndex + lineCount`, and the absolute mismatch line as `startIndex + mismatchIndex + 1`; duplicate start/end or absolute-line fields are prohibited. `expectedLine` and `actualLine` are the exact two logical lines that failed the existing whitespace-tolerant comparator. No full expected/candidate arrays cross the boundary. `zero` and `multiple` contain no file or patch content. `reason` contains the specific existing grammar/document reason without a duplicated hunk prefix or no-write suffix. `PatchApplicationError.message` is always derived from its failure; `editFile` supplies the final public rendering for the same failure after retries are exhausted.

## Interface Boundary Check

| Interface | Responsibility Is Singular? | Identity Shape Is Explicit? | Ambiguous Selector Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `editFile` | Yes | Yes | Low | Preserve |
| `applyContextPatch` | Yes | Yes | Low | Enrich error output only |
| `formatEditFilePatchFailure` | Yes | Yes | Low | Keep input typed and rendering-only |
| Canonical contract constants | Yes | N/A | Low | Keep transport framing outside |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Public edit command | `editFile` | Yes | Low | Preserve |
| Pure patch operation | `applyContextPatch` | Yes | Low | Preserve |
| Structured semantic failure | `ContextPatchFailure` | Yes | Low | Add as discriminated union |
| Public failure formatter | `formatEditFilePatchFailure` | Yes | Low | Keep file name tied to edit-file patch failure |
| Canonical model contract | `edit-file-contract.ts` | Yes | Low | Do not call it an AutoByteus patch dialect |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Patch grammar/matching facts | `src/tools/file/context-patch.ts` | Extend | It already owns every fact needed for safe diagnostics | N/A |
| Public retry/no-write message | `src/tools/file/edit-file.ts` | Extend with owned formatter | This boundary alone knows attempts are exhausted and no write occurred | N/A |
| Model contract presentation | Tool definition plus XML formatter | Extend | Correct existing native/XML owners | N/A |
| Generic tool error wrapping | `ToolPhase` | Reuse unchanged | Existing wrapper already carries tool/invocation identity | N/A |
| Fuzzy or provider recovery | None | Do Not Create | Prohibited and unnecessary | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision | Notes |
| --- | --- | --- | --- | --- | --- |
| File tools | Canonical edit contract, public edit lifecycle, context semantics, public patch diagnostics | DS-001 through DS-005 | Registered `edit_file`, `editFile` | Extend | Compact adjacent files preserve existing layout |
| Tool usage formatting | XML-specific schema layout, escaping, sentinels, retained usage examples | DS-001 | Registered edit contract | Extend | Consume semantic constants; keep transport additions local |
| Agent runtime | Invocation and outer result/error wrapper | DS-002, DS-003 | ToolPhase | Reuse unchanged | Coverage only |
| Documentation and tests | Durable contract/evidence | All | Corresponding owners | Extend | Deterministic tests are acceptance authority |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `src/tools/file/context-patch.ts` | File tools | Semantic owner | Indexed parse, exact/whitespace match facts, candidate scan, assembly | Same pure algorithm and invariants | Exports tight failure union |
| `src/tools/file/edit-file.ts` | File tools | Public command | Schema composition, path/read, retry, one write, final renderer call | Existing lifecycle owner | Imports contract/failure/renderer |
| `src/tools/file/edit-file-contract.ts` | File tools | Model contract | Canonical tool prose, patch prose, literal field example | One cross-presentation policy | Shared by native/XML |
| `src/tools/file/edit-file-patch-diagnostic.ts` | File tools | `editFile` off-spine concern | Bounded rendering only | Nontrivial deterministic formatting stays out of I/O lifecycle | Consumes failure union |
| XML schema formatter | Tool usage formatting | XML presentation | Consume contract, escape it, insert field example before sentinels | Existing custom transport owner | Imports contract constants |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? | Overlapping Representations Removed? | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Native/XML edit guidance and example | `edit-file-contract.ts` | File tools | Exact cross-surface equality is required | Yes | Yes | General prompt catalog or provider registry |
| Hunk failure facts | `ContextPatchFailure` and `DiagnosticCandidateResult` in `context-patch.ts` | File tools | Same semantic result crosses retry/render boundary; state specialization prevents irrelevant optional content | Yes | Yes | Generic all-tool error schema |
| Difference-focused evidence bounding | `edit-file-patch-diagnostic.ts` | File tools | Both unique mismatch lines require one exact code-point focus-window policy | Yes | Yes | Matching, diffing, or target-rescan helper |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Parallel / Overlapping Representation Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `ContextPatchFailure` | Yes | Yes | Low | Derive public messages from the discriminant; do not retain submitted/target blocks for content-free states |
| `DiagnosticCandidateResult` | Yes | Yes | Low | Specialize `zero`, `unique`, and `multiple`; only `unique` carries `startIndex`, `lineCount`, `mismatchIndex`, `expectedLine`, and `actualLine` |
| Canonical contract constants | Yes | Yes | Low | Keep XML sentinel text separate and compose native description once |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/tools/file/context-patch.ts` | File tools | `applyContextPatch` | Complete-document normalization after predecessor integration, raw/indexed hunk parsing, structured failures, full-match/ambiguity/candidate search, pure assembly | Cohesive semantic core | Defines failure union |
| `autobyteus-ts/src/tools/file/edit-file.ts` | File tools | `editFile` | Register canonical schema, resolve/access/read, exact/whitespace retries, invoke public renderer, one write/result | Singular public lifecycle | Imports contract, context owner, renderer |
| `autobyteus-ts/src/tools/file/edit-file-contract.ts` | File tools | Registered edit contract | Canonical tool description, patch prose including preserved final-record guidance, and literal example/full native patch description | Eliminates exact wording drift | Shared by native/XML |
| `autobyteus-ts/src/tools/file/edit-file-patch-diagnostic.ts` | File tools | `editFile` diagnostic concern | Missing/ambiguous/invalid/document public message rendering and Unicode/context bounds | Keeps matching out and lifecycle file focused | Consumes failure union |
| `autobyteus-ts/src/tools/usage/formatters/edit-file-xml-schema-formatter.ts` | Tool usage formatting | XML presentation | XML tool description, patch prose attribute/body, canonical field example, sentinel instructions | Transport-specific layout | Imports contract constants |
| `autobyteus-ts/src/tools/usage/formatters/edit-file-xml-example-formatter.ts` | Tool usage formatting | XML usage examples | Preserve existing valid examples and the predecessor no-newline example after integration | Separate examples are supplemental, not canonical field guidance | No new semantic source |
| `autobyteus-ts/docs/tool_schema_and_configuration.md` | Documentation | Durable tool contract | Document prevention workflow, shared owners, structured diagnostics, bounds/safety, and integrated newline semantics | Existing authoritative tool schema doc | Mirrors approved artifacts |
| `autobyteus-ts/tests/unit/tools/file/context-patch.test.ts` | Tests | Semantic owner | Hunk identity; distinct `zero`/`unique`/`multiple` outcomes; unique-only mismatch facts; ambiguity count; grammar identity; preserved matching/newline/scale | Fast pure decision table | Structured failure assertions |
| `autobyteus-ts/tests/unit/tools/file/edit-file-patch-diagnostic.test.ts` | Tests | Diagnostic renderer | Exact concise templates; absence of shared surrounding lines/full blocks; one-based ranges; content-free zero/multiple/ambiguity; no-write suffix; difference-focused Unicode windows near beginning/middle/end and insertion/deletion boundaries; final `-`/`+` line cap | Direct deterministic formatter coverage | Failure fixtures |
| `autobyteus-ts/tests/unit/tools/file/edit-file.test.ts` | Tests | Public edit boundary | Registered wording/example; exact concise observed 4-hunk failure with only the `readonly` mismatch; retry/no-write/atomicity; preserved success | Authoritative public boundary | Uses semantic/renderer owners |
| `autobyteus-ts/tests/unit/tools/usage/formatters/edit-file-xml-formatter.test.ts` | Tests | XML presentation | Same field-local example, placement before sentinels, escaping, read/re-read contract | Guards the user's requested failure surface | Contract constants |
| Focused existing/new ToolPhase test selected during coverage work | Tests | Generic runtime | Preserve exact outer prefix around new inner message | No production ToolPhase edit required | Uses real failing edit tool |

## Applied Patterns (If Any)

- **Pure semantic core behind an I/O command:** matching remains in `context-patch.ts`; filesystem lifecycle remains in `editFile`.
- **Typed failure facts, presentation at the owning boundary:** the semantic owner reports facts; the public owner reports exhausted retries/no-write.
- **Diagnostic-only near match:** one conservative candidate explains a likely transcription error but never becomes an application path.
- **Single-source model contract with transport additions:** native/XML share semantics; XML alone owns sentinels.

## Target Subsystem / Folder / File Mapping

| Path | Kind | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/tools/file/` | Folder | File-tool capability | Public commands, path integration, context semantics, edit-specific contract/diagnostics | Existing compact feature-oriented boundary is clear for this scope | Provider/model branches |
| `.../context-patch.ts` | File | Patch semantic owner | Structured parse/match/assembly | Already authoritative | I/O, XML, public retry text |
| `.../edit-file-contract.ts` | File | Registered edit contract | Shared model-facing strings/example | Same capability, two presentations | XML sentinels or matching logic |
| `.../edit-file-patch-diagnostic.ts` | File | `editFile` diagnostic concern | Bounded final message rendering | Same command capability, separate concern | Search, mutation, path access |
| `.../edit-file.ts` | File | Public edit command | Lifecycle and registration | Existing boundary | Reimplemented match/bound helpers |
| `autobyteus-ts/src/tools/usage/formatters/` | Folder | Tool presentation | XML-specific rendering | Existing transport presentation capability | Patch semantics |

The file-tool folder remains intentionally compact. Adding deeper subfolders for two small edit-specific owned concerns would over-split the existing capability without clarifying another lifecycle depth.

## Folder Boundary Check

| Path / Folder | Intended Structural Depth | Ownership Boundary Is Clear? | Mixed-Layer Or Over-Split Risk | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `src/tools/file` | Main-Line Domain-Control / Off-Spine Concern, compact justified | Yes | Low | Adjacent contract/diagnostic files serve the existing edit command and semantic owner |
| `src/tools/usage/formatters` | Off-Spine Concern | Yes | Low | Contains provider presentation only; imports canonical contract instead of owning it |
| `src/agent/loop` | Main-Line Domain-Control | Yes | Low | ToolPhase remains generic and unchanged |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Failure flow | `matcher -> {kind:'missing_context', hunkIndex:2, candidateResult:{kind:'unique', expectedLine, actualLine, ...}} -> editFile renderer -> concise no-write error` | `matcher -> generic string -> editFile guesses which hunk/target differed` | Prevents the observed false constructor diagnosis |
| Candidate use | Search classifies the entire eligible region as zero/unique/multiple; only unique retains two mismatching lines, while only a zero-difference unique full match may advance the cursor | Apply or auto-retry the closest window, or expose full matching context for all states | Keeps diagnostics explanatory, minimal, and separate from mutation |
| Contract sharing | Native and XML import the same prose/example; XML adds sentinel instructions after the example | Copy/paste slightly different descriptions or place example only in a separate usage section | Protects the exact user-approved patch field |
| Patch-field example | `Example patch:\n@@\n-const mode = 'old'\n+const mode = 'new'\n const keep = true` | Include `path`, `---`/`+++`, `@@ -1 +1 @@`, or `*** Begin Patch` | Shows precisely what belongs in the failure-prone argument |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep the old generic failure text for callers/tests | Message assertions may exist | Rejected | Replace current tests and public text with approved structured diagnostics |
| Add structured fields while continuing to construct independent legacy strings | Minimizes local edits | Rejected | Derive every hunk/public message from one `ContextPatchFailure` value |
| Add a fuzzy fallback for DeepSeek | Could make the observed patch succeed | Rejected | Show one diagnostic candidate and require a reread/retry |
| Add DeepSeek/provider-specific descriptions or recovery | Observed model was DeepSeek | Rejected | One provider-neutral native/XML contract |
| Remove tolerated numeric-decorated headers now | Model guidance prohibits them | N/A | Preserve current narrow noise tolerance; coordinates remain ignored and are not advertised |

## Derived Layering (If Useful)

`Provider presentation -> registered edit command -> pure patch semantics -> filesystem`, with `edit-file-patch-diagnostic.ts` as an off-spine renderer serving the command. This is explanatory only; ownership and dependency rules above are authoritative.

## Change / Refactor Sequence

1. Confirm whether the newline-boundary predecessor is present in the implementation base. If present, retain `completePatchDocument`, marker semantics, tests, XML example, and documentation while editing overlaps. If absent, implement this follow-up cleanly and record the overlap so the required delivery refresh can reconcile both; never copy the old final-record behavior over the predecessor.
2. Add `edit-file-contract.ts` and compose the canonical full native patch description from shared prose plus the literal unwrapped example. Include the predecessor final-record guidance in the final integrated prose.
3. Refactor patch document parsing into a document scan that produces raw hunk bodies before body validation, then parse with one-based index and known total. Preserve current document-level errors and accepted header classification.
4. Replace message-only hunk failures with `ContextPatchFailure` and `DiagnosticCandidateResult`. Scan the complete eligible region for full matches and qualifying one-line-difference windows. Candidate state starts as `zero`; the first candidate becomes `unique` with only its range facts and two mismatching logical lines; the second transitions irreversibly to `multiple` and discards that content. Continue scanning so full-match uniqueness/ambiguity remains authoritative. Preserve the existing exact/whitespace line comparator and asymptotic scan class.
5. Add the public renderer with exact state-specific labels/order and deterministic difference-focused evidence windows. Wire `editFile` to render the last structured failure after the existing two attempts and before any write. Do not pass full anchors or target windows to the renderer.
6. Update native registration and XML schema presentation from the shared contract. In XML, render the literal example inside the `patch` argument immediately before sentinel instructions and keep its unchanged line's single required leading space.
7. Update durable documentation and focused deterministic coverage, including the exact four-hunk incident shape and outer ToolPhase prefix preservation.
8. Run focused semantic/I/O/formatter/runtime tests, relevant broader file-tool coverage, build/typecheck, and `git diff --check`.
9. At integration/finalization, refresh `origin/personal`, reconcile the predecessor rather than choosing one side of overlapping strings/tests, and rerun both tickets' focused suites.

## Diagnostic Rendering Rules

- Strip only one terminal `LF` or `CRLF` from a stored logical line before display; preserve all other whitespace.
- A unique result renders exactly the hunk index/total and exhausted strategies; complete one-based target range; `diagnostic only; not applied`; absolute mismatch line; one `-` expected excerpt; one `+` actual excerpt; targeted reread of that same range; exact-context retry guidance; and the no-write statement. It renders no `Expected`, `Candidate`, or `Difference` heading and no identical surrounding line.
- A zero result renders the canonical zero-state sentence, current-region reread/exact-context guidance, and no-write statement. It renders no source excerpt or target location.
- A multiple result renders the canonical multiple-state/no-selection sentence, current-region reread/more-unique-context guidance, and no-write statement. It renders no source excerpt, target location, or candidate count.
- An ambiguity result renders the exact full-match count and no-selection fact plus current-region reread/more-unique-context guidance. It renders no source excerpt or target location.
- Candidate line ranges describe the complete candidate window in the original current file: `startIndex + 1` through `startIndex + lineCount`. The absolute mismatch line is `startIndex + mismatchIndex + 1`.
- Each completed unique evidence line, including its one-code-point `-`/`+` prefix and any ellipses, is at most 200 Unicode code points. If the exact logical line is at most 199 points, render it completely after the prefix.
- For a longer logical line, use the existing whitespace-tolerant `trim()` comparison. Define `differenceOffset` as the Unicode-code-point length of the normalized expected/actual lines' longest common prefix. For each side, map that normalized offset into the exact untrimmed line by adding that side's `trimStart()` code-point count. When that normalized side ends at `differenceOffset`, focus the boundary immediately after its final normalized code point.
- Select at most 197 exact source code points around each side's mapped focus: `start = clamp(focus - 98, 0, max(0, sourceLength - 197))` and `end = min(sourceLength, start + 197)`. Prepend `…` when `start > 0` and append `…` when `end < sourceLength`. The focus point or ending boundary must remain within the selected window. Prefix plus 197 source points and two ellipses totals 200 points.
- Renderer tests measure the completed physical evidence line with `Array.from(line).length` or an equivalent code-point-aware count. They cover `-` and `+`, astral Unicode, differences near the beginning/middle/end, and insertion/deletion ending boundaries; they assert both the 200-point maximum and visibility of the differing focus.
- Every final public patch failure ends truthfully with `No file changes were written.` Missing and ambiguous messages use the exact contract templates; invalid/document failures append the same no-write sentence without duplicating punctuation.

### Canonical Precision Example

The retained Daily Assistant incident must render this exact inner message after both strategies fail:

```text
Could not apply context hunk 2 of 4 after exact and whitespace-tolerant matching.
Unique one-line-difference target at lines 13-14 (diagnostic only; not applied); mismatch at line 13:
-  private particles = new Particles()
+  private readonly particles = new Particles()
Read target lines 13-14 and retry with exact unchanged/removal context. No file changes were written.
```

The identical `private time = 0` anchor line is deliberately absent. The zero, multiple, ambiguous, and invalid-hunk branches must use the exact canonical templates in `edit-file-diagnostic-contract.md`; implementation must not paraphrase them.

## Key Tradeoffs

- Structured failure data adds a small internal type surface but avoids unsafe reparsing and makes messages deterministic.
- One shared contract module adds one file but removes exact semantic duplication across native/XML surfaces; XML framing remains separate.
- The candidate rule intentionally misses multi-line or more approximate similarities. That conservatism is the safety property, not a limitation to work around with fuzzy scoring.
- Candidate scanning remains in the existing window loop and keeps the same `O(file lines × anchor lines)` class. It may do full per-window comparison to count matches/mismatches, which is acceptable for actionable failure paths and covered by the existing large-file regression.
- Restricting the unique failure payload to two mismatching lines prevents repetitive renderer output and limits trace exposure. Zero, multiple, and ambiguity states deliberately omit source content because their state and retry instruction are the only novel actionable facts.

## Risks

- The predecessor and this follow-up overlap in semantic descriptions, docs, and tests. A mechanical ours/theirs merge could silently lose one contract; integrated reruns are mandatory.
- XML attribute/body interpolation can produce invalid or misleading schema text if escaping or example indentation is wrong. Formatter tests must assert ordering and the exact one-space unchanged prefix.
- Structured error and display text could drift if messages are stored independently. All public text must be derived from one failure value and the approved renderer, with exact template tests.
- Candidate collection must finish scanning the eligible region before claiming uniqueness; stopping at the first plausible target would recreate unsafe guessing.
- A renderer that receives whole anchors could regress to repeating identical lines. The specialized candidate union prevents that by carrying content only for a unique result and only for its mismatching pair.
- Long Unicode lines can violate the cap or hide the actual mismatch if sliced as UTF-16 code units or truncated only from the end. The code-point-aware focus-window algorithm and final physical-line assertions remove both risks.

## Guidance For Implementation

- Treat `/Users/normy/autobyteus_org/autobyteus-worktrees/edit-file-actionable-context-errors/tickets/in-progress/edit-file-actionable-context-errors/edit-file-diagnostic-contract.md` as the exact message/guidance authority; do not rewrite labels or invent alternative examples.
- Keep the actual schema example unwrapped: no Markdown fences, file path, Git headers, numeric hunk coordinates, or semantic envelopes.
- Parse raw hunks before validating bodies so `hunk <index> of <count>` is truthful even for the first invalid body in a later multi-hunk document.
- Count all full eligible matches for ambiguity. Classify one-line-difference windows across the full eligible region as `zero`, `unique`, or `multiple`. Retain only a unique candidate's range facts and mismatching logical lines; on a second candidate, transition irreversibly to content-free `multiple`.
- Use the final whitespace-tolerant attempt's structured failure for the public exhausted-retry diagnostic. A successful whitespace attempt continues to write normally.
- Never pass a candidate's index to output assembly or retry against it. A candidate can flow only into `formatEditFilePatchFailure`.
- Preserve actual file context bytes for unchanged lines on successful whitespace-tolerant matching, as current code does.
- For zero, multiple, and ambiguous outcomes, do not display patch/file content or target locations. For unique, display exactly the approved two mismatch evidence lines; do not repeat any identical context.
- Apply the 200-point cap to each completed physical `-`/`+` line, not to its source fragment before prefixing. For long lines use the approved 197-point difference-focused window plus up to two ellipses so truncation cannot hide the mismatch.
- Do not edit ToolPhase production code. Add proportionate coverage around its existing wrapper.
- Preserve predecessor `completePatchDocument`, exact no-newline marker semantics, descriptions, examples, docs, and regressions once present on the integrated branch.
