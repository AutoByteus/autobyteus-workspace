# Design Spec

## Current-State Read

The supported production path is provider-neutral until the patch semantic boundary: an agent receives the registered `edit_file` schema, the provider returns a native function call, the API/XML streaming layer constructs a `ToolInvocation`, and `editFile` resolves/reads the target before calling `applyUnifiedDiff`. The baseline failure occurs inside `src/utils/diff-utils.ts`, where a hunk must match `@@ -N[,N] +N[,N] @@` before its context is considered.

The numeric owner is structurally misleading for the approved behavior. It parses four range fields, but only `oldStart` and the special `oldCount === 0` case affect placement; new coordinates and declared counts are not validated. Its fuzz loop searches near the claimed line instead of establishing unique content identity. The `path` is already authoritative outside the patch. Investigation evidence and behavior IDs are detailed in `investigation-notes.md`.

The surrounding ownership remains healthy and must be preserved:

- `edit-file.ts` owns the public tool contract, existing-file check, retry sequence, write timing, and tool result.
- `workspace-path-utils.ts` owns absolute/base-dir resolution and protected-path enforcement.
- provider streaming handlers transport patch strings without interpreting them.
- `write_file` and `run_bash` remain independent mutation owners. The newly approved SR-002 scope removes the redundant exact replacement/insertion tools instead of adding them to agent portfolios.

An uncommitted experiment currently exists in the task worktree. It proves feasibility, but it is not the target design verbatim: the final semantic owner belongs beside the file tool, should accept/return complete content rather than expose internal line arrays, and must narrowly reject textual header suffixes and arbitrary newline-marker lines.

## Intended Change

Replace numeric unified-diff semantics with one context-patch semantic owner. Bare `@@` is canonical. A conventional numeric-decorated header is accepted only long enough to classify it as a hunk delimiter; every coordinate/count is discarded. Both forms then use the same unique-context algorithm.

Each hunk supplies an expected old sequence through unchanged (` `) and removal (`-`) lines. The sequence must contain at least one line and match exactly one position in the unconsumed portion of the file. Addition (`+`) lines construct the replacement. All hunks are applied to an in-memory result and the file is written once only after complete success.

Remove the obsolete `applyUnifiedDiff` API, fuzz-factor behavior, git/file-header acceptance, and `diff-utils` ownership. Preserve exact-then-whitespace-tolerant retry, path behavior, newline handling, and `PatchApplicationError`. Also remove `replace_in_file`, `insert_in_file`, their registration/source/tests/current documentation, and the now-unused `text-edit-utils.ts`; the retained file-oriented capabilities are `read_file`, `edit_file`, `write_file`, and `run_bash`.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Approved Requirement / Intent And Acceptance-Criteria IDs | Approved Trigger Or Governing Contract | Relevant Existing Behavior And Evidence Reference | Approved Change Or Preserved Outcome | Target Production Path / Lifecycle And Spine ID(s) |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | Contract | REQ-003, REQ-004; AC-003, AC-005 | Model calls `edit_file` with canonical bare hunk | Investigation BEH-001; screenshots and DeepSeek matrices | Bare context applies when uniquely identifiable; unsafe input does not write | Schema -> invocation -> `editFile` -> context owner -> write/result; DS-001, DS-002 |
| BEH-002 | Contract | REQ-003, REQ-008, REQ-009; AC-003, AC-009, AC-013 | Tool schema/example presentation | Investigation BEH-002; baseline source/history | Stop advertising/implementing numeric positioning; preserve concise line prefixes | Definition/formatter -> provider; DS-001 |
| BEH-003 | System | REQ-004, REQ-007, REQ-010; AC-005 through AC-008 | Existing file edit execution | Investigation BEH-003; baseline orchestration/tests | Unique match and atomic multi-hunk result; preserve path/write invariants | `editFile` -> path/read -> DS-004 -> one write; DS-001, DS-004 |
| BEH-004 | Contract | REQ-010, REQ-012; AC-012 | Agent selects a retained mutation tool | Investigation BEH-004; mechanism cohorts; later user simplification | Remove exact tools; preserve explicit independent `edit_file`, `write_file`, and `run_bash` routes with no hidden fallback | Independent retained tool routes; only `edit_file` uses DS-001 |
| BEH-005 | Contract | REQ-001 through REQ-003, REQ-008; AC-001, AC-002, AC-009 | Provider receives a clear tool grammar | Investigation BEH-005; explicit/generic cross-provider cohorts | One provider-neutral schema; no vendor semantic branch | Formatters -> provider-native call -> unchanged invocation path; DS-001 |
| BEH-006 | Operational | REQ-008, REQ-012; AC-009, AC-012 | External Product Prototyper loads configured tools | Investigation BEH-006; external config | Its current read/edit/write/bash portfolio already matches the approved surface; remove stale exact-tool guidance without external edits | Existing config lifecycle preserved; outside target spines |
| BEH-007 | Contract | REQ-005, REQ-006; AC-004 | Numeric-decorated hunk reaches context contract | Investigation BEH-007; Gemini strict/normalized cohorts | Discard coordinates; unique context alone decides | Header classification -> DS-004 context matching; DS-001, DS-004 |
| BEH-008 | Contract | REQ-009, REQ-012; AC-012, AC-013 | Default built-in registration plus file-backed agent configuration resolution | Investigation BEH-008; `register-tools.ts`, exact-tool source/test/docs search, file-provider/resolver/catalog trace, representative config scan | Remove exact-tool definitions, registrations, support utility, and active coverage/docs; preserve four approved file-oriented capabilities/unrelated tools; leave persisted name arrays unchanged and treat removed names as inactive | DS-005 removes registry/catalog/schema exposure; existing missing-definition handling skips stale names without blocking other configured tools or rewriting files |

## Relevant Supplemental Task Artifacts

| Artifact Path | Purpose | Related Requirement / Acceptance-Criteria IDs | Relationship To This Design | Status / Approval Applicability |
| --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/autobyteus-ts-edit-format-investigation/deepseek-edit-benchmark-report.md` | DeepSeek-specific production trace and 165-run study | REQ-001, REQ-002, REQ-010, REQ-012; AC-001, AC-002, AC-011, AC-012 | Establishes the original boundary failure and rejects provider/shell/write fixes | Complete evidence; approval N/A |
| `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/autobyteus-ts-edit-format-investigation/cross-provider-context-patch-benchmark-report.md` | DeepSeek/Gemini/GPT contract decision evidence | REQ-002 through REQ-011; AC-002 through AC-015 | Governs bare canonical form, numeric normalization, narrow grammar, and safety/performance decisions | Complete evidence; approval N/A |
| `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/autobyteus-ts-edit-format-investigation/benchmark/experimental-clean-cut-context-patch.patch` | Self-contained pre-SR-002 feasibility source/test diff | REQ-003 through REQ-011; AC-003 through AC-010, AC-013 through AC-015 | Proves the context experiment can be reconstructed; implementation must conform to this reviewed design and separately implement REQ-012 | Evidence only; baseline-verified; not approved/final product code |
| `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/autobyteus-ts-edit-format-investigation/benchmark-evidence/experimental-clean-cut-artifact-baseline-verification.log` | Detached-baseline reconstruction/build/test verification | REQ-009, REQ-011; AC-010, AC-013, AC-015 | Resolves DR-ECF-001 by proving the retained experiment artifact applies to `4b29481d5`, builds, and passes 74/74 affected checks | Complete evidence; approval N/A |
| `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/autobyteus-ts-edit-format-investigation/benchmark-evidence/cross-provider-context-summary.json` | Machine-readable aggregate | REQ-002, REQ-005, REQ-011; AC-002, AC-004, AC-010, AC-011 | Audits benchmark counts and dialect classifications | Complete evidence; approval N/A |

## Task Design Health Assessment (Mandatory)

- Change posture: Bug Fix + Behavior Change + bounded Refactor
- Current design issue found: Yes
- Root cause classification: Boundary Or Ownership Issue plus Legacy Or Compatibility Pressure and File Placement Or Responsibility Drift
- Refactor needed now: Yes
- Evidence: A transport-valid call fails at a semantic owner whose name/API promise conventional unified diff but whose implementation realizes only partial numeric behavior. The approved contract removes that meaning. Only `edit-file.ts` uses the production function, so clean replacement is bounded. Cross-provider evidence supports one context rule, not dual engines.
- Design response: Put a narrowly owned `context-patch.ts` mechanism inside the file-tool capability, change `editFile` to use it, and remove old utility/API/tests.
- Refactor rationale: Retaining `diff-utils.ts`, `applyUnifiedDiff`, `fuzzFactor`, or a numeric branch would misstate ownership and violate the approved single-semantic contract.
- Intentional deferrals and residual risk: Concurrent writer control and `run_bash` policy changes are out of scope. Two inspected user/server configs retain both removed names, while no checked-in package config does. Existing reader/resolver behavior makes those strings inert and keeps remaining tools usable, so the design chooses Directly Usable — No Migration and no aliases or automatic rewrite; stale definition tags may remain visible until manually removed. Unique matching can require model retry on repetitive files; that is an approved safety tradeoff rather than a deferred defect.

## Terminology

- **Canonical context header:** A line whose trimmed content is exactly `@@`.
- **Numeric decoration:** A complete delimiter matching `@@ -N[,N] +N[,N] @@`. It is syntax noise only; values are never retained or used.
- **Expected old sequence:** The ordered content of unchanged and removal lines in one hunk.
- **Eligible region:** The target content at or after the cursor consumed by prior ordered hunks.
- **Unique context:** Exactly one complete expected-old-sequence match in the eligible region under the active exact or whitespace-tolerant strategy.

## Design Reading Order

This design proceeds from the approved behavior map to the end-to-end tool spine, then isolates the bounded context-application spine, assigns its owner beside `edit_file`, removes the old diff owner, and derives file/test changes from those boundaries.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: Delete `src/utils/diff-utils.ts`, its `applyUnifiedDiff` export, numeric/fuzz positioning logic, git/file-header skipping, and old diff-specific tests.
- Numeric-decorated header normalization is not legacy numeric behavior: the parser does not parse/store/use coordinates and has no numeric application branch.
- No wrapper named `applyUnifiedDiff`, dual matcher, provider fork, automatic full-file rewrite, or shell fallback may remain.

## Persisted Data / State Transition Decision (Mandatory When Persisted Data May Be Affected)

- Stored subject, location, representative shape, and approximate volume: File-backed agent definitions persist `toolNames: string[]` in `agent-config.json`. A secret-free representative scan found two affected configs among nine under `/Users/normy/.autobyteus/server-data`—`agents/professor/agent-config.json` and `agents/student/agent-config.json`—with one occurrence of each removed name and six total tools per file. None of 89 checked-in package configs under `/Users/normy/autobyteus_org/autobyteus-agents` contains either name. Disposable benchmark provider configuration separately exists in the ignored task-local test database.
- Relevant code-model, serialization, semantic, or physical-store change: The persisted string-array schema does not change; the registry ceases defining two names, while patch-string interpretation changes only within an `edit_file` invocation.
- Normal reader/writer behavior and representative evidence: `normalizeAgentConfigRecord` and `FileAgentDefinitionProvider` preserve configured strings; GraphQL/details return them and the current tag input can show stale selected names. `resolveAutoByteusAgentTools` warns/skips an absent registry definition and continues resolving remaining tools. Registry-derived available-tool/schema/catalog paths omit missing definitions. No reader automatically rewrites files.
- Required semantics and invariants under direct use: Existing config files load unchanged; removed names are not executable or advertised as available; all other registered tool selections still resolve; agent launch does not fail because of a stale removed name. Existing target-file bytes remain unchanged on edit failure.
- Physical-store, privacy/security, disposal/rebuild, and operational constraints: Do not mutate personal/server configs as part of repository delivery, commit secret DB/root-key files, or expose credentials. Stale tags may be removed manually, but no maintenance window is needed.
- Decision: Directly Usable — No Migration
- Decision rationale: Current version-agnostic string readers and missing-definition resolvers already preserve user data and runtime usability. An automatic transform would mutate external files solely for representational cleanup; a compatibility alias would restore the capability the user explicitly removed.
- Acceptance criteria or design constraints supported by this decision: AC-005 through AC-008, AC-011 through AC-013; REQ-012.

## Data-Flow Spine Inventory

| Spine ID | Scope | Related Behavior ID(s) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-001, BEH-002, BEH-003, BEH-005, BEH-007 | Registered `edit_file` contract presented to agent/provider | Successful file mutation and tool result, or safe error | `editFile` tool boundary | Shows the complete supported path and keeps semantics provider-neutral |
| DS-002 | Return-Event | BEH-001, BEH-003 | Patch/filesystem result or error | Tool execution event and next agent decision | Existing tool execution lifecycle | Preserves actionable recovery without hidden mutation fallback |
| DS-003 | Bounded Local | BEH-003 | Original content and patch at `editFile` | Patched content or final `PatchApplicationError` | `editFile` retry orchestration | Exact matching must precede one whitespace-tolerant retry |
| DS-004 | Bounded Local | BEH-001, BEH-003, BEH-007 | One patch application attempt | Fully constructed target content or deterministic rejection | `context-patch.ts` | Owns header normalization, unique matching, ordered application, and atomic result construction |
| DS-005 | Supporting Lifecycle | BEH-004, BEH-006, BEH-008 | Built-in registration and configured agent `toolNames` load | Available/executable tool set for catalog/schema/runtime | `registerTools` plus existing agent-tool resolvers | Removes exact-tool availability once while preserving other tools and tolerating persisted stale names without migration |

## Primary Execution Spine(s)

`Tool definition / provider formatter -> provider-native function call -> streaming ToolInvocation -> editFile path/read orchestration -> context-patch semantic owner -> single filesystem write -> success result`

On semantic failure, the spine terminates before the write and transitions to DS-002. The supporting catalog/configuration spine is `registerTools -> registry-backed available/schema catalogs plus configured-name resolution -> executable tool set`; it stays outside patch execution and does not mutate persisted configs.

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | A provider sees one canonical grammar, returns `path/base_dir/patch`, existing streaming transports it, `editFile` resolves and reads, the context owner produces a complete result, and `editFile` writes once. | Tool contract, invocation, edit command, context patch, target file | `editFile` | Provider formatters, path resolver, filesystem adapter |
| DS-002 | A success or deterministic patch/path error flows through the existing tool execution event lifecycle; the model may choose an explicit later action. | Tool result/error, execution event, agent turn | Existing runtime tool lifecycle | Error text and UI/event rendering |
| DS-003 | `editFile` first requests exact context matching; only a `PatchApplicationError` triggers one whitespace-tolerant attempt; failure is enriched once with recovery guidance. | Original content, retry policy, patch error | `editFile` | None |
| DS-004 | The context owner parses ordered hunks, normalizes only valid numeric decoration, finds one eligible old-sequence match per hunk, incrementally builds output without large spread operations, and returns only after all hunks succeed. | Hunk, expected old sequence, match cursor, result content | `context-patch.ts` | Line splitting/newline markers are private mechanisms |
| DS-005 | Startup no longer registers the two exact tools. Registry-backed catalogs/schemas omit them; configured-name readers preserve existing arrays, and normal resolution skips absent definitions while exposing every remaining registered tool. | Tool definition, configured name, executable tool set | `registerTools` and existing resolver boundaries | Agent-definition display may show stale tags until manual edit; no compatibility alias or config rewrite |

## Spine Actors / Main-Line Nodes

- Tool definition / formatter: exposes the accepted contract; it does not interpret patches.
- Provider and streaming invocation: transports structured arguments; it does not select patch semantics.
- `editFile`: authoritative public mutation command for patch edits; owns path/read/retry/write sequencing.
- Context-patch semantic owner: internal mechanism that owns grammar, matching, and content transformation.
- Filesystem write/result: meaningful effect and returned outcome.

## Ownership Map

- `editFile` owns the command lifecycle: resolve, ensure existing file, read, attempt exact/whitespace application, write once, return/enrich failure.
- `context-patch.ts` owns all patch grammar and transformation invariants. It accepts complete original content plus patch text and returns complete patched content. Internal line arrays/cursors do not cross its boundary.
- `resolveFileToolPath` remains the sole path authorization/resolution owner.
- Provider formatters own transport-specific presentation only. XML sentinel tags remain transport framing and are stripped before semantic application.
- Existing tool execution/runtime owners continue emitting success/failure events.
- `registerTools` remains the catalog composition owner; existing agent-definition readers and runtime/catalog resolvers own tolerant interpretation of configured name arrays.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| Registered `edit_file` `BaseTool` wrapper | `editFile` | Registry/parameter-schema integration | Patch parsing or provider-specific recovery |
| `editFile` re-export of `PatchApplicationError` | `context-patch.ts` | Preserve the established tool-facing error type surface | A second error class or compatibility engine |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope | Notes |
| --- | --- | --- | --- | --- |
| `src/utils/diff-utils.ts` | Name/location/semantics contradict approved contract | `src/tools/file/context-patch.ts` | In This Change | Delete; no wrapper |
| `applyUnifiedDiff` and `fuzzFactor` | Numeric positioning is removed | `applyContextPatch` unique matcher | In This Change | No alias or overload |
| Git/file-header skipping | Patch already has separate authoritative path; complete diffs enlarge grammar | Explicit unsupported-header rejection | In This Change | File headers fail before mutation |
| `tests/unit/utils/diff-utils-fuzzy.test.ts` | Tests obsolete positioning behavior | File-tool context-patch unit tests | In This Change | Replace, do not port fuzz assertions |
| `tests/integration/utils/diff-utils.test.ts` | Pure utility disk test duplicates real `edit_file` integration | Existing `tests/integration/tools/file/edit-file.test.ts` | In This Change | Add context cases at authoritative tool boundary |
| Investigation-only `src/utils/context-patch-utils.ts` placement/array API | Generic utils placement leaks internal line representation | Final file-tool-local owner/content API | In This Change | Refactor experimental source before implementation handoff completes |
| `src/tools/file/replace-in-file.ts` | Redundant exact replacement is expressible through context edit or Bash | Retained `edit_file` / explicit `run_bash` | In This Change | Delete; no alias |
| `src/tools/file/insert-in-file.ts` | Redundant anchored insertion is expressible through context edit or Bash | Retained `edit_file` / explicit `run_bash` | In This Change | Delete; no alias |
| `src/tools/file/text-edit-utils.ts` | Becomes unowned after both consumers are removed | None | In This Change | Delete rather than retain orphan utility |
| Exact-tool registration imports/calls in `src/tools/register-tools.ts` | Removed tools must not appear in schema/catalog discovery | Remaining built-in registrations | In This Change | Preserve unrelated registration order/behavior |
| Dedicated exact-tool unit/integration tests and cases in shared suites | Tests removed behavior or invalid portfolios | Context edit plus retained-tool registry/path coverage | In This Change | Remove or retarget only where behavior remains relevant |
| Exact-tool references in current docs/diagnostic portfolios/edit guidance | Would advertise removed capabilities | Four-tool surface and context retry guidance | In This Change | Historical ticket evidence remains unchanged and labeled historical |
| Persisted exact-tool name strings | Data remains readable and harmless under existing missing-definition resolution | Directly Usable — No Migration | Not Modified | Do not rewrite external configs or retain aliases; missing names are inactive while other tools resolve |

## Return Or Event Spine(s) (If Applicable)

`context result/error -> editFile success/error -> existing tool execution succeeded/failed event -> agent/runtime activity -> optional explicit model retry or alternate exposed tool`

No automatic retry with another mutation tool is added. Only exact-versus-whitespace matching is an internal retry of the same command and content.

## Bounded Local / Internal Spines (If Applicable)

- Parent owner `editFile` / DS-003: `read original -> exact applyContextPatch -> if PatchApplicationError, whitespace-tolerant applyContextPatch -> complete result or enriched error`.
- Parent owner `context-patch.ts` / DS-004: `split while preserving endings -> classify hunk header -> parse body -> derive expected old sequence -> scan eligible region for exactly one match -> append untouched/context/addition ranges iteratively -> advance cursor -> repeat -> append tail -> return string`.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| API/XML schema formatting | DS-001 | Tool contract | Present canonical grammar in provider transport | Providers need clear dialect guidance | Transport-specific patch semantics or drift |
| XML patch sentinels | DS-001 | XML streaming parser | Protect special characters during XML streaming | Transport framing only | Confusing sentinels with patch grammar |
| Path resolution/protection | DS-001 | `editFile` | Resolve absolute/base-dir identity and deny protected paths | Existing filesystem security invariant | Patch parser accidentally authorizes paths |
| Error guidance | DS-002, DS-003 | `editFile` | Request reread/retry with more unique canonical context; any alternate exposed action remains an explicit later model choice | Model recovery | Hidden mutation fallback or advertising removed tools |
| Deterministic tests | All | Each owner | Verify contract and preserved invariants | Live models cannot be CI authority | Provider-dependent/flaky CI |
| Live benchmark artifacts | DS-001 | Requirements/design evidence | Record model behavior on dated IDs | Supports contract choice | Runtime dependency on investigation harness |
| Agent configuration persistence/catalog resolution | DS-005 | Registered tool surface | Preserve name arrays, derive availability from current registry, skip absent definitions | Existing tolerant persisted-data boundary | Compatibility aliases or automatic external-file mutation |

## Ownership Boundaries

The registered tool and `editFile` function are the authoritative external boundary. Callers provide structured path/base-dir/patch arguments and never call the context mechanism to perform I/O. `context-patch.ts` is an internal pure transformation owner; it neither resolves paths nor reads/writes files. The path resolver is authoritative for file identity/security. Provider formatters may describe/frame arguments but cannot parse or transform patches.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| Registered `edit_file` / `editFile` | Context application, retry, file read/write | Tool runtime and agents | Runtime calling context owner then writing itself | Extend `editFile` contract, not runtime bypass |
| `applyContextPatch` internal API | Line splitting, header classification, body parsing, matching, result assembly | `editFile` only in production | `editFile` reimplementing header/match rules | Strengthen content-in/content-out API |
| `resolveFileToolPath` | Physical path and deny-list checks | `editFile` and other file tools | Context parser interpreting/authorizing paths | Extend shared path owner |

## Dependency Rules

- `edit-file.ts` may import `context-patch.ts`, `workspace-path-utils.ts`, tool schema/registry primitives, and filesystem promises.
- `context-patch.ts` may depend only on local language/runtime primitives; it must not import filesystem, provider, registry, streaming, or path modules.
- Provider formatters may depend on tool definitions/formatting primitives, not on context application.
- Streaming handlers transport the patch string unchanged and may not normalize numeric headers.
- No provider adapter may branch on model ID to change patch semantics.
- No runtime caller may combine `editFile` with direct calls to its internal context owner or filesystem write.
- `registerTools` must remove only the two approved definitions; agent-config readers/resolvers remain generic and must not add exact-name compatibility filtering, aliases, or automatic file rewriting.

## Interface Boundary Mapping

| Interface / API / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `editFile(context, path, baseDir, patch): Promise<string>` | One file-edit command | Resolve/read/apply/write/result lifecycle | Absolute path, or relative path + absolute base dir | Existing authoritative boundary |
| `applyContextPatch(originalContent, patch, options?): string` | One pure content transformation attempt | Parse, uniquely match, and construct full content | Complete original content + patch string; `ignoreWhitespace?: boolean` | No line-array or numeric/fuzz API |
| `PatchApplicationError` | Patch semantic failure | Distinguish retryable/actionable semantic failures from I/O errors | Message-bearing error | Defined once in context owner; re-exported by tool |
| `resolveFileToolPath(context, path, baseDir)` | File identity | Resolve and authorize path | Existing explicit shapes | Unchanged |

## Interface Boundary Check

| Interface | Responsibility Is Singular? | Identity Shape Is Explicit? | Ambiguous Selector Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `editFile` | Yes | Yes | Low | Preserve |
| `applyContextPatch` | Yes | Yes | Low | Use complete strings; no leaked line representation |
| `resolveFileToolPath` | Yes | Yes | Low | Preserve |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Public edit command | `editFile` | Yes | Low | Preserve |
| Patch transformation | `applyContextPatch` | Yes | Low | Replace `applyUnifiedDiff` |
| Semantic file | `context-patch.ts` | Yes | Low | Place beside file tool, not generic utils |
| Error | `PatchApplicationError` | Yes | Low | Preserve one definition |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| File edit command | `src/tools/file` | Extend | Already owns edit/read/write and path policy | N/A |
| Patch semantic mechanism | Current `diff-utils` | Replace inside file capability | Logic is reusable only by `edit_file`; target semantics are not a generic diff utility | N/A |
| Path safety | `workspace-path-utils.ts` | Reuse | Correct existing owner | N/A |
| Exact replacement/insertion | Existing file tools | Remove | Functionally redundant under the user-selected context-edit/write/bash surface; fewer schemas reduce selection surface | N/A |
| Persisted configured tool names | File agent-definition provider plus runtime/catalog resolvers | Reuse unchanged | Existing string reader preserves data and existing missing-definition behavior omits inactive names without blocking remaining tools | N/A |
| Provider presentation | Existing schema/XML formatters | Extend | Correct transport presentation owners | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision | Notes |
| --- | --- | --- | --- | --- | --- |
| File tools | Public edit lifecycle, context patch semantics, path integration | DS-001, DS-003, DS-004 | `editFile` | Extend | Keep compact adjacent files |
| Tool usage formatting | XML/API-visible contract presentation | DS-001 | Tool definition | Extend | API derives argument schema; XML special formatter updated |
| Agent streaming/runtime | Argument transport and result events | DS-001, DS-002 | Existing runtime owners | Reuse | Fixture changes only |
| Tool registry and agent-config resolution | Built-in catalog composition plus tolerant configured-name resolution | DS-005 | `registerTools` and existing resolver owners | Remove two registrations; otherwise reuse | No persistence-layer source change or external config rewrite |
| Test coverage | Deterministic semantic/integration regression | All | Corresponding production owners | Extend | No live-provider CI |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `src/tools/file/edit-file.ts` | File tools | `editFile` | Contract plus I/O/retry lifecycle | Existing singular command owner | `PatchApplicationError` re-export |
| `src/tools/file/context-patch.ts` | File tools | `applyContextPatch` | Pure grammar/match/transformation | One cohesive internal semantic owner | N/A |
| XML formatter files | Tool usage formatting | Formatter classes | XML descriptions/examples/sentinels | Existing transport-specific files | Tool contract wording conceptually |
| Context-patch unit test | Test coverage | Pure context owner | Complete semantic decision table | Fast deterministic owner-level suite | Fixture strings only |
| Edit-file unit/integration tests | Test coverage | Tool boundary | Orchestration, atomic write, path behavior | Tests authoritative external boundary | Context grammar fixtures |
| Streaming/formatter tests | Test coverage | Transport owners | Patch strings remain intact and documented | Existing suites | Canonical fixtures |
| AutoByteus tool resolver unit test | Test coverage | Configured-name resolution boundary | Missing removed name is skipped and retained registered name still resolves | Proves no-migration usability at the actual launch boundary | Registry definitions only |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? | Overlapping Representations Removed? | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Line splitting/end preservation | Private functions inside `context-patch.ts` | File tools | Used by original and patch parsing within one owner | Yes | Yes | Exported generic text utility |
| Header normalization/matching | Private classifier inside `context-patch.ts` | File tools | One grammar for all providers | Yes—numeric fields never materialized | Yes—one matcher | Provider strategy registry |
| Patch error type | `context-patch.ts`, re-exported by `edit-file.ts` | File tools | Same semantic failure crosses retry boundary | Yes | Yes | Multiple error classes/codes without need |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Parallel / Overlapping Representation Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `ContextPatchOptions { ignoreWhitespace?: boolean }` | Yes | Yes—no `fuzzFactor` | Low | Keep internal/simple |
| Parsed hunk private shape, if materialized | Yes | Yes—no numeric coordinates/counts | Low | Store only body/expected-old/change data actually used, or parse inline |
| Complete-content API | Yes | Yes—no caller-owned line array | Low | Return string only |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/tools/file/edit-file.ts` | File tools | Authoritative command | Schema, resolve/access/read, two-strategy retry, one write, result/error guidance | Singular file mutation lifecycle | Imports context owner/path owner |
| `autobyteus-ts/src/tools/file/context-patch.ts` | File tools | Internal transformation | Narrow header grammar, hunk parsing, unique matching, newline-aware construction | Cohesive pure semantics | Private tight structures |
| `autobyteus-ts/src/tools/usage/formatters/edit-file-xml-schema-formatter.ts` | Tool formatting | XML schema formatter | Canonical context description plus XML sentinel rule | Transport-specific contract | N/A |
| `autobyteus-ts/src/tools/usage/formatters/edit-file-xml-example-formatter.ts` | Tool formatting | XML example formatter | Bare-hunk examples within sentinel framing | Transport-specific examples | N/A |
| `autobyteus-ts/tests/unit/tools/file/context-patch.test.ts` | Tests | Context owner coverage | Happy path, normalization, safety, whitespace/newline, multiple hunks, 250k lines | Mirrors production owner | N/A |
| `autobyteus-ts/tests/unit/tools/file/edit-file.test.ts` | Tests | Tool unit boundary | Schema, retry, errors, atomic write | Authoritative command tests | N/A |
| `autobyteus-ts/tests/integration/tools/file/edit-file.test.ts` | Tests | Disk integration boundary | Real read/write and path/base-dir behavior | Avoids redundant pure-utility integration | N/A |
| Existing protected-path, approval, formatter, streaming/parser test files | Tests | Existing owners | Replace numeric fixtures and preserve boundaries | Proportionate fixture/regression edits | N/A |
| `autobyteus-ts/src/tools/register-tools.ts` | Tool registry | Default registration composition | Remove exact-tool imports/calls and preserve all retained registrations | Singular catalog composition owner | N/A |
| `autobyteus-ts/docs/tool_schema_and_configuration.md` | Documentation | Current tool/path contract | Remove exact-tool claims; describe retained file-tool path users accurately | Current durable documentation | N/A |
| Existing edit diagnostic/benchmark test files | Tests | Diagnostic portfolio | Remove exact-tool imports/names/registrations and retain applicable edit/write scenarios | Keeps current diagnostics buildable against the contracted catalog | N/A |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/autobyteus/autobyteus-agent-tool-resolver.test.ts` (new or nearest existing resolver suite) | Tests | Persisted-config runtime boundary | Configure one removed name plus one registered retained tool; assert missing name is skipped/warned and retained tool remains in `actualToolNames` | Makes Directly Usable — No Migration executable | Existing resolver/registry |

## Applied Patterns (If Any)

- **Pure semantic core behind an I/O command boundary:** `context-patch.ts` transforms strings; `editFile` owns filesystem lifecycle.
- **Strict canonical form with narrow normalization:** bare `@@` is taught; numeric decoration is accepted only as a delimiter classification and discarded.
- **Atomic build-then-write:** all hunks construct a complete result before one write.
- **Exact-first bounded retry:** whitespace tolerance is the only second strategy; numeric fuzz is removed.

## Target Subsystem / Folder / File Mapping

| Path | Kind | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/tools/file/` | Folder | File-tool capability | File commands and tightly owned mechanisms | Context patch is used only by `edit_file` | Provider/model branches |
| `.../edit-file.ts` | File | `editFile` | Public tool lifecycle | Existing authoritative location | Hunk search implementation |
| `.../context-patch.ts` | File | `applyContextPatch` | Pure patch semantics | Adjacent internal owner clarifies capability | Filesystem/path/provider code |
| `autobyteus-ts/src/utils/diff-utils.ts` | File / Remove | Obsolete | None after change | Remove misleading generic owner | Compatibility wrapper |
| `autobyteus-ts/src/tools/file/replace-in-file.ts` | File / Remove | Obsolete tool | None after change | User-approved catalog contraction | Alias/registration |
| `autobyteus-ts/src/tools/file/insert-in-file.ts` | File / Remove | Obsolete tool | None after change | User-approved catalog contraction | Alias/registration |
| `autobyteus-ts/src/tools/file/text-edit-utils.ts` | File / Remove | Orphaned mechanism | None after consumers removed | No remaining owner | Dormant compatibility utility |
| `autobyteus-ts/src/tools/usage/formatters/` | Folder | Tool presentation | XML schema/example changes | Existing transport concern | Patch application logic |
| `autobyteus-ts/tests/unit/tools/file/` | Folder | File-tool tests | Context owner and command unit coverage | Mirrors target ownership | Live provider calls |
| `autobyteus-ts/tests/integration/tools/file/` | Folder | File-tool integration | Real disk/path/tool behavior | Authoritative integration boundary | Duplicate pure utility disk test |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/autobyteus/` | Folder | Agent runtime resolution tests | Missing configured tool remains non-fatal while other tools resolve | Existing runtime boundary owns this invariant | Persistence migration logic |

The layout remains compact because there are only two production owners at one capability depth. A new module/folder would add indirection without exposing additional structural depth.

## Folder Boundary Check

| Path / Folder | Intended Structural Depth | Ownership Boundary Is Clear? | Mixed-Layer Or Over-Split Risk | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `src/tools/file` | Main-Line Domain-Control + tightly owned mechanism | Yes | Low | Public command and private pure semantic owner are adjacent |
| `src/tools/usage/formatters` | Off-Spine Concern | Yes | Low | Presentation only |
| `src/utils` | Generic utilities | Yes after removal | Low | Remove file-edit-specific diff semantics |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Canonical hunk | `@@\n key: value\n-old: x\n+old: y` | Requiring `@@ -40,2 +40,2 @@` | Models need not calculate positions |
| Numeric normalization | `@@ -999,50 +700,80 @@` -> discard header values -> unique context | Use `999` as starting hint or fallback | Proves numeric has zero semantics |
| Ambiguity | Two matches -> error requesting more context | Select first match or trust coordinate | Prevents silent wrong-location edits |
| Path identity | `path` argument is authoritative; patch begins at `@@` | Accept `*** Update File` or `---/+++` path | Avoids two path sources |
| Owner boundary | `editFile -> applyContextPatch(content, patch) -> content -> write` | Runtime/provider parser directly mutates files | Keeps semantics and I/O coherent |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep `applyUnifiedDiff` wrapper | Reduce rename/test churn | Rejected | Remove API/file and use `applyContextPatch` |
| Run numeric matcher then context matcher | Preserve old positioning | Rejected | One unique-context matcher for both header spellings |
| Retain `fuzzFactor` option | Existing callers/tests | Rejected | Exact then whitespace-only retry; production has one caller |
| Continue accepting git/file headers | Prior parser skipped them; GPT generic prior uses envelope | Rejected | Clear schema yields bare GPT output; path remains separate |
| Accept Codex outer envelope | Superficial alignment with GPT prior | Rejected | Align only with inner context principle |
| Provider-specific DeepSeek/Gemini/GPT branches | Model priors differ | Rejected | One explicit schema and semantic contract |
| Retain exact-tool aliases/wrappers | Protect unknown custom configurations | Rejected | Remove definitions/registrations; retained context edit or explicit Bash supplies capability |
| Automatic `write_file`/`run_bash` fallback | Improve final success | Rejected | Return actionable context-retry error; model may explicitly select a retained tool |

## Derived Layering (If Useful)

Presentation (`ToolDefinition` / XML formatter) -> runtime invocation transport -> file-tool command (`editFile`) -> pure internal context semantics (`context-patch.ts`) -> filesystem effect. This is explanatory only; ownership/dependency rules above are authoritative.

## Change / Refactor Sequence

1. Reconcile the investigation experiment with this target: move/replace `src/utils/context-patch-utils.ts` as `src/tools/file/context-patch.ts` and change its boundary to complete string input/output.
2. Implement narrow header classification: bare canonical or exact conventional numeric decoration only. Do not materialize numeric values or accept textual suffixes/file envelopes.
3. Implement/retain unique eligible-region matching, strict body/no-newline-marker validation, iterative result append, and full-result return.
4. Update `edit-file.ts` contract text and replace numeric/fuzz retries with exact then whitespace-tolerant context attempts; preserve one final write and error enrichment.
5. Update XML schema/examples and existing API/XML streaming fixtures to canonical bare hunks; remove exact-tool advice from `edit_file` descriptions/errors.
6. Remove exact-tool imports/calls from `register-tools.ts`; delete `replace-in-file.ts`, `insert-in-file.ts`, and the now-unused `text-edit-utils.ts` with no wrappers.
7. Replace old diff unit tests with context-owner tests; move relevant semantic coverage to `tests/unit/tools/file/context-patch.test.ts`; remove redundant pure utility integration test and dedicated exact-tool tests.
8. Update `edit_file` unit/integration, protected-path, file-schema, approval-flow, formatter, streaming, XML parsing, current docs, and edit diagnostic/benchmark portfolios for the contracted catalog.
9. Add focused configured-name resolver coverage: a persisted removed name is skipped/warned, another registered configured tool still resolves, and no config write occurs. Reuse current resolver behavior; do not add migration/compatibility source logic.
10. Delete `src/utils/diff-utils.ts`, old tests, experimental utility placement, and every active `applyUnifiedDiff`/`fuzzFactor`/exact-tool reference. Verify by repository search while excluding historical ticket evidence.
11. Run build, affected deterministic suites (including the server resolver test), broader appropriate suites, large-file coverage, and `git diff --check`; report known baseline failures separately.
12. Keep historical live benchmark evidence—including exact-tool comparison cohorts—in the ticket package; do not treat those historical names as active product references, mandatory CI, or a reason to retain removed tools.

No temporary compatibility seam is allowed at the end of the sequence.

## Key Tradeoffs

- **Safety over forced completion:** Unique matching rejects repeated context rather than selecting a coordinate/first occurrence. The model may need one retry with more context.
- **Robust syntax, single semantics:** Numeric decoration is tolerated for Gemini reliability, but discarded to avoid dual behavior.
- **Narrow grammar over universal envelope ingestion:** Explicit schema delivered 60/60 across providers; supporting every prior would enlarge ambiguity without measured benefit.
- **Complete-content pure API over line-array reuse:** A string boundary better encapsulates newline and internal representation at small allocation cost already incurred by file read/write.
- **Linear/simple implementation over indexing:** Current file-edit sizes and measured million-line performance support a straightforward scan; complex indexing is unjustified.

## Risks

- Whitespace-tolerant matching may create more candidate matches than exact matching; uniqueness must be recalculated under that strategy, never inherited from the exact attempt.
- Multiple hunks can cause repeated suffix scans; cursor advancement bounds normal ordered edits, but adversarial many-hunk/large-file complexity is not optimized.
- Incorrect newline-marker handling could alter EOF bytes; accept only the standard marker immediately following a prefixed hunk line and cover both EOF forms.
- Experimental source currently differs from final placement/API/header strictness; implementation review must judge the reviewed design, not assume existing edits are final.
- Two inspected user/server configs and potentially other custom sources may retain removed exact-tool names. Existing readers/resolvers make them inactive without launch failure and keep other tools available, so no migration or compatibility registration is permitted. Stale names may remain visible in definition details until manually edited; regression coverage must protect tolerant resolution.
- Unrelated baseline test failures could obscure regressions; affected suites must be independently green and broader failures baseline-reproduced.

## Guidance For Implementation

- Treat the existing experiment as evidence, not as a finished implementation.
- Prefer `applyContextPatch(originalContent: string, patch: string, options?): string`; keep split/join helpers private.
- Numeric-decoration regex must match the entire trimmed header and must not capture/use values. Bare `@@ anything` and numeric headers with textual suffixes are unsupported in this scope.
- Accept only ` `, `-`, `+`, and the exact `\\ No newline at end of file` marker in valid positions. Reject arbitrary backslash lines and unprefixed blank body lines rather than silently copying them.
- Determine uniqueness across the entire eligible region for each attempt. Stop after detecting a second match and throw ambiguity.
- Preserve actual file text for unchanged context lines; use patch content only for additions. Never let numeric decoration change the cursor.
- Append large ranges iteratively or with another stack-safe method; do not call `push(...veryLargeSlice)`.
- Re-export the single `PatchApplicationError` through `edit-file.ts` if current tool consumers/tests require it, without retaining any old application API.
- Verify clean-cut removal with `rg "applyUnifiedDiff|diff-utils|fuzzFactor|replace_in_file|insert_in_file|replace-in-file|insert-in-file|text-edit-utils" autobyteus-ts/src autobyteus-ts/tests autobyteus-ts/docs`; active references should be absent except deliberately worded negative assertions if any.
- Preserve `read_file`, `edit_file`, `write_file`, `run_bash`, and unrelated tool registrations; do not edit external agent configuration or introduce provider-specific instructions in code. Add/retain focused resolver coverage proving a persisted removed name is skipped while another configured registered tool remains usable.
