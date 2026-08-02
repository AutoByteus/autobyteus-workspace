# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Refined

## Goal / Problem Statement

Make AutoByteus `edit_file` reliably usable by DeepSeek V4 Flash, Gemini Flash, GPT, and other tool-calling models without requiring models to calculate numeric unified-diff line ranges, while simplifying the file-oriented tool surface to the four capabilities the user wants retained: `read_file`, `edit_file`, `write_file`, and `run_bash`.

The model-facing contract must use context-located hunks, align with the useful inner-hunk behavior seen in model-company agent harnesses, and preserve stronger AutoByteus safety: a hunk applies only when its old/context sequence identifies exactly one eligible location. Because live Gemini sometimes retains numeric decoration even after receiving the new schema, numeric ranges must be removed from **semantics** rather than treated as a fatal syntax error: the parser may discard numeric header decoration, but it must never use those values to locate or disambiguate an edit.

## Current And Desired Behavior (Mandatory)

| Behavior ID | Current Behavior | Desired Behavior | Preserved / Unchanged Behavior | Related Requirement / Acceptance-Criteria IDs |
| --- | --- | --- | --- | --- |
| BEH-001 | A schema-valid `edit_file` call containing a bare `@@` hunk is rejected as a malformed header before its usable context is considered. | Bare `@@` is the canonical hunk header and a safely identifiable context edit applies on the first call. | Invalid/unsafe edits fail without changing the file. | REQ-003, REQ-004, AC-003, AC-005 |
| BEH-002 | The model-facing schema requests numeric unified-diff ranges, even though most parsed range fields are not validated or used. | Tool descriptions/examples do not request line numbers, file headers, or outer patch metadata; line coordinates have no edit semantics. | Context/removal/addition line prefixes remain an explicit, concise patch language. | REQ-003, REQ-008, REQ-009, AC-003, AC-009, AC-013 |
| BEH-003 | The existing tool resolves and reads one file, builds the complete result, and writes only after all hunks apply. | Context matching requires one unique eligible location per hunk; ambiguous, missing, anchorless, malformed, and partial multi-hunk inputs do not write. | Path resolution/protection, existing-file validation, deterministic results, and write-after-complete-application remain enforced. | REQ-004, REQ-007, REQ-010, AC-005 through AC-008 |
| BEH-004 | Separate exact replacement/insertion, whole-file write, and shell mechanisms exist; availability depends on agent configuration. | Remove `replace_in_file` and `insert_in_file`. File changes are performed through `edit_file`, deliberate whole-file `write_file`, or explicit `run_bash`. | `edit_file` never silently falls back to another tool; the model explicitly selects any later operation. | REQ-010, REQ-012, AC-012 |
| BEH-005 | When grammar is underspecified, tested providers emit incompatible priors: DeepSeek bare hunks, Gemini SEARCH/REPLACE or numeric, and GPT a complete Codex envelope. | All provider formatters state one narrow canonical AutoByteus grammar clearly enough that tested providers produce it reliably. | Provider-native function-call transports continue carrying the same tool arguments; no provider-specific semantic branch is added. | REQ-001 through REQ-003, REQ-008, AC-001, AC-002, AC-009 |
| BEH-006 | Product Prototyper already exposes the user-selected file-oriented set—`read_file`, `edit_file`, `write_file`, and `run_bash`—but `edit_file` errors recommend two tools it does not expose. | Preserve that four-tool portfolio and remove unavailable `replace_in_file`/`insert_in_file` recovery guidance. | External Product Prototyper configuration needs no change. | REQ-008, REQ-012, AC-009, AC-012 |
| BEH-007 | No baseline context-only contract exists for a numeric-decorated header; strict context experiment rejection reduced Gemini first-application success to 9/12. | A syntactically valid numeric-decorated hunk is normalized to a context hunk: all coordinate values are discarded and the same unique-context matcher is used. | Numeric decoration cannot make ambiguous context safe, and it cannot override the file content. | REQ-005, REQ-006, AC-004 |
| BEH-008 | The default AutoByteus tool registry still registers `replace_in_file` and `insert_in_file`, with dedicated source, shared exact-edit utilities, documentation, and tests. Two of nine inspected user/server `agent-config.json` files still name both tools. | The two redundant tools and their now-unowned support code are removed cleanly from the registered product surface and repository. Persisted names become inactive references and cannot block resolution of the configuration's remaining registered tools. | `read_file`, `edit_file`, `write_file`, `run_bash`, unrelated tools, and existing config-file contents retain their contracts/bytes; missing registered tool names continue to be skipped rather than causing agent-launch failure. | REQ-009, REQ-012, AC-012, AC-013 |

## Investigation Findings

The supplied DeepSeek calls are valid API tool invocations but invalid under AutoByteus's strict numeric-hunk contract. A controlled DeepSeek schema ablation reproduced the exact bare-`@@` failure. The earlier DeepSeek study retained 165 valid live runs across edit schemas/mechanisms; a unique-context experiment restored 20/20 first-application success for the primary failing cohort.

The later cross-provider comparison produced the decisive evidence:

- With explicit context schema/instruction, DeepSeek V4 Flash, Gemini 3.5 Flash, and GPT-5.6-sol each achieved 20/20 first-application, exact-final, and sentinel-preservation success; all 60 first patches used bare `@@`.
- With production schema only, DeepSeek and GPT were 12/12 first-call successful. Gemini was 9/12 when numeric-looking headers were rejected; it recovered to 12/12 final.
- With numeric decoration accepted but its coordinates ignored, Gemini was 12/12 first-call and exact-final successful on the same schema-only matrix.
- Gemini exact `replace_in_file` was 12/12 and DeepSeek selected it reliably when exposed, proving the removed tools were capable. The later user decision is a product-surface simplification rather than a reliability finding: the same operations are expressible through the improved `edit_file` or explicit `run_bash`.
- An underspecified schema elicited three incompatible provider-specific dialect families, proving the runtime needs a clear contract rather than attempts to accept every unstated harness grammar.
- The clean-cut parser's retained local microbenchmark averaged 18.810 ms for a one-million-line target after removing a spread-induced call-stack overflow.

## Relevant Supplemental Task Artifacts

| Artifact Path | Type / Purpose | Related Requirement IDs | Related Acceptance-Criteria IDs | Status / Approval | Relationship To Requirements |
| --- | --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-ts-edit-format-investigation/tickets/done/autobyteus-ts-edit-format-investigation/deepseek-edit-benchmark-report.md` | DeepSeek reproduction and mechanism benchmark | REQ-001, REQ-002, REQ-010, REQ-012 | AC-001, AC-002, AC-011, AC-012 | Complete evidence; approval N/A | Establishes the original failure and causal ablation; alternative-tool results remain evidence but do not override the later approved catalog contraction. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-ts-edit-format-investigation/tickets/done/autobyteus-ts-edit-format-investigation/cross-provider-context-patch-benchmark-report.md` | Cross-provider contract benchmark and decision analysis | REQ-002 through REQ-011 | AC-002 through AC-015 | Complete evidence; approval N/A | Quantitatively supports canonical context hunks and numeric-decoration normalization. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-ts-edit-format-investigation/tickets/done/autobyteus-ts-edit-format-investigation/benchmark/experimental-clean-cut-context-patch.patch` | Self-contained pre-SR-002 feasibility implementation and coverage diff | REQ-003 through REQ-011 | AC-003 through AC-010, AC-013 through AC-015 | Baseline-verified experiment evidence only; not approved/final product code | Demonstrates the context contract can be implemented safely and efficiently; it predates and does not implement REQ-012 exact-tool removal, so the reviewed design remains authoritative. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-ts-edit-format-investigation/tickets/done/autobyteus-ts-edit-format-investigation/benchmark-evidence/cross-provider-context-summary.json` | Machine-readable aggregate | REQ-002, REQ-005, REQ-011 | AC-002, AC-004, AC-010, AC-011 | Complete evidence; approval N/A | Provides auditable counts and model-output classifications. |

## Design Health Assessment (Mandatory)

- Change posture: Bug Fix + Behavior Change + bounded Refactor
- Initial design issue signal: Yes
- Root cause classification: Boundary Or Ownership Issue plus Legacy Or Compatibility Pressure
- Refactor posture: Likely Needed
- Evidence basis: The transport and function-call schema work; the semantic owner rejects usable context because it advertises and partially implements unified-diff coordinates. Most numeric fields add contract burden without enforcing their claimed invariants. Cross-provider evidence supports one unique-context matcher, while retaining the old numeric engine would create dual semantics and a misleading `diff-utils` owner.
- Requirement or scope impact: Cleanly replace the numeric unified-diff semantic owner and old naming rather than add provider-specific compatibility branches or a legacy wrapper. Preserve surrounding path/read/write orchestration and provider transports.

## Recommendations

Adopt bare `@@` context hunks as the canonical AutoByteus `edit_file` grammar. Apply each hunk by a unique old/context match, not line positions. Tolerate valid numeric hunk decoration only as input normalization and discard every coordinate before matching. Reject file headers, outer envelopes, optional unsupported header forms, ambiguity, and anchorless insertion. Remove the redundant exact replacement/insertion tools and do not add implicit write/bash recovery.

This deliberately aligns with Codex's inner context-hunk principle and DeepSeek's observed bare output, while not copying Codex's outer path envelope because AutoByteus already supplies `path` separately. It also preserves compatibility with Gemini's occasional numeric-decorated output without preserving numeric meaning.

## Scope Classification (`Small`/`Medium`/`Large`)

Medium

## In-Scope Use Cases

- Apply one or more bare-`@@` context hunks to an existing text file when each hunk's old/context sequence identifies one eligible location.
- Normalize a conventional numeric-decorated hunk header to the same context semantics, irrespective of whether its numbers are correct.
- Reject ambiguous, missing, anchorless, malformed, no-change, file-header, and outer-envelope inputs without any partial write.
- Preserve exact and whitespace-tolerant matching attempts, newline behavior, path resolution/protection, and complete-application-before-write.
- Present the canonical grammar consistently through API and XML tool-schema/example surfaces.
- Retain provider-independent durable tests plus secret-safe, opt-in benchmark evidence.
- Cleanly remove `replace_in_file`/`insert_in_file`; use context hunks for narrow edits or explicitly selected `write_file`/`run_bash` when appropriate.

## Out of Scope

- Training, fine-tuning, or claiming to reconstruct proprietary model-company harnesses.
- Supporting every vendor's complete patch envelope or marker grammar inside `edit_file.patch`, including Codex `*** Begin Patch`, git file headers, or Gemini SEARCH/REPLACE markers.
- Accepting optional textual Codex hunk labels unless later requirements/evidence explicitly add them.
- Automatically choosing the first of multiple matching locations.
- Hidden provider-specific branches, shell fallback, whole-file rewrite, or automatic conversion to another mutation tool.
- Modifying external Product Prototyper/agent tool portfolios; its current four-tool file-oriented set already matches the approved direction.
- Removing or redesigning tools unrelated to `replace_in_file` and `insert_in_file`.
- Adding new restrictions or a file-path parser to `run_bash`; its broader execution policy remains unchanged.
- Solving concurrent external writers between read and write.
- Full SWE-bench evaluation.

## Functional Requirements

- `REQ-001`: Preserve and document the production path from provider tool schema through native function-call parsing/streaming, dispatch, path resolution, patch application, and final file write; no provider-specific patch-semantic branch may be introduced.
- `REQ-002`: Retain auditable live benchmark evidence for DeepSeek V4 Flash, Gemini Flash, and GPT over the same representative corpus, including first-application correctness, exact-final bytes, sentinel preservation, failures/recovery, patch dialect, duration, and reported token usage.
- `REQ-003`: Define the canonical `edit_file.patch` hunk as a bare `@@` header followed by lines prefixed with one space for unchanged context, `-` for removal, and `+` for addition. The model-facing schema must tell models not to include line numbers, file headers, or Begin/End metadata.
- `REQ-004`: Locate every hunk solely from its unchanged/removal sequence and apply it only when that sequence identifies exactly one eligible location in the still-unconsumed file region.
- `REQ-005`: Accept a syntactically conventional numeric-decorated header as normalization input, discard all coordinate/count values, and apply the hunk through the same context matcher used by a bare header.
- `REQ-006`: Numeric header values must never select, prioritize, limit, or disambiguate a match. Wrong coordinates must not block a uniquely matched edit, and plausible/correct coordinates must not permit ambiguous context.
- `REQ-007`: Reject empty patches, no-change hunks, anchorless pure additions, missing context, multiple context matches, malformed hunk lines/headers, and partial multi-hunk applications with a deterministic actionable error and no file write.
- `REQ-008`: Keep API schema, XML schema, XML example, error, and recovery wording aligned with the canonical context contract; do not advertise unavailable syntax as canonical.
- `REQ-009`: Maintain one authoritative context-patch semantic implementation with truthful naming. Remove the obsolete numeric unified-diff owner/API/tests rather than retain a legacy wrapper or dual engine.
- `REQ-010`: Preserve path authorization/protection, explicit `base_dir` rules, existing-file validation, exact-then-whitespace-tolerant retry, newline/no-final-newline handling, and one write only after complete successful application.
- `REQ-011`: Add provider-independent durable coverage for canonical application, normalized numeric decoration, wrong-number behavior, ambiguity, no-anchor/no-match/malformed rejection, multiple hunks, whitespace, newlines, large-file stack safety, schema/stream fixtures, and path/protected-file behavior. Live-provider benchmarks remain opt-in evidence rather than mandatory CI.
- `REQ-012`: Remove `replace_in_file` and `insert_in_file` from the product registry and repository, including their registration imports/calls, dedicated source files, now-unused exact-text utility, dedicated tests, diagnostic/benchmark tool portfolios, documentation, and `edit_file` guidance. Preserve `read_file`, `edit_file`, `write_file`, and `run_bash`; do not introduce an automatic mutation fallback or change external agent configuration. Existing persisted references to removed names must remain readable, become non-executable, and must not prevent the configuration's other registered tools from resolving.

## Acceptance Criteria

- `AC-001`: The investigation evidence demonstrates that the screenshot failure occurs after a valid tool call reaches the numeric patch parser and is not caused by JSON corruption, provider authentication, streaming, path resolution, or filesystem access.
- `AC-002`: The retained common-context cohort contains at least 20 runs per benchmarked provider across small exact, multiline, repeated-target, and late-insertion scenarios; each provider achieves at least 19/20 first-application and exact-final success with every sentinel unchanged.
- `AC-003`: A documented patch such as `@@\n old\n-new\n+new\n` applies without any numeric coordinates or duplicated file path.
- `AC-004`: Coverage proves that a numeric-decorated hunk with intentionally wrong coordinates applies when context is unique, while a numeric-decorated hunk with plausible coordinates is rejected when its context matches more than one location.
- `AC-005`: Ambiguous, no-match, anchorless pure-addition, empty, no-change, malformed-line, unsupported-header, file-header, and outer-envelope cases all fail without modifying the target.
- `AC-006`: If any hunk in a multi-hunk patch fails, no preceding successful hunk is written; ordered uniquely matched multiple hunks apply exactly once each.
- `AC-007`: Exact matching remains first choice, whitespace-tolerant retry remains bounded, and covered final-newline/no-final-newline outcomes retain exact expected bytes.
- `AC-008`: Absolute-path, explicit absolute `base_dir`, missing-file, relative-path-without-base, and protected/symlinked-protected path behavior remains covered and unchanged.
- `AC-009`: API tool schema plus XML schema/example and streaming/parser fixtures all show/transport the same bare context grammar and do not require numeric coordinates.
- `AC-010`: `pnpm build`, all affected deterministic unit/integration tests, and `git diff --check` pass. Any broader baseline failure must be reproduced on the recorded baseline and reported rather than misclassified as caused by this change.
- `AC-011`: No provider secret value, imported database, or root key is committed or copied into task evidence; retained results contain only non-sensitive configuration identifiers and measurements.
- `AC-012`: Repository search and registry/schema tests prove `replace_in_file`, `insert_in_file`, their registration functions/files, and `text-edit-utils.ts` are absent from active product source, tests, and current documentation/diagnostics. The retained file-oriented capabilities are `read_file`, `edit_file`, `write_file`, and `run_bash`; no external agent config is changed and no automatic mutation fallback exists. A configuration containing a removed name still loads, excludes that name from executable/schema exposure, and retains its other registered tools.
- `AC-013`: Product source has one context-patch application owner and no production import/export of the removed numeric `applyUnifiedDiff` owner, removed exact-edit tools, or a compatibility wrapper preserving any of them.
- `AC-014`: The parser does not accept complete Codex envelopes, git/file headers, Gemini SEARCH/REPLACE markers, or optional textual hunk headers under this scope; errors direct the caller to reread and retry with the canonical form and more unique context.
- `AC-015`: A retained large-file deterministic test/probe applies a late uniquely anchored edit to at least 250,000 lines without call-stack overflow; the documented one-million-line local probe also completes after the iterative-append fix.

## Constraints / Dependencies

- Authoritative worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-ts-edit-format-investigation`.
- Task branch: `codex/autobyteus-ts-edit-format-investigation`, based on refreshed `origin/personal` commit `4b29481d5b6eaea64aebb20abcb5e4d784ea1178`.
- The supplied environment may be imported only into isolated test setup. Secret values and databases are not task artifacts.
- Provider model availability, rate limits, and behavior drift limit external reproducibility; deterministic product behavior must not depend on live tests.
- Numeric decoration normalization must be narrow: only conventional numeric hunk-header syntax, not arbitrary `@@` suffixes or complete file diffs.
- Product Manager acceptance callback: Not Required (one-off engineering task).

## Persisted Data Outcome (When Applicable)

- Stored subject / location: Agent definitions persist `toolNames` as string arrays in filesystem `agent-config.json` files. The representative runtime-data scan found two affected files among nine under `/Users/normy/.autobyteus/server-data` (`agents/professor/agent-config.json` and `agents/student/agent-config.json`), each naming both removed tools once. The 89 checked-in package configs under `/Users/normy/autobyteus_org/autobyteus-agents` contain no such names. Investigation provider/model configuration separately exists only in an ignored worktree-local test database.
- Required outcome: Directly Usable — No Migration
- Existing data to preserve, discard/rebuild, transform, or quarantine: Preserve all agent-config files and all unrelated configured tool names byte-for-byte. Existing readers retain string values; the normal AutoByteus resolver already warns and skips an unregistered name while instantiating the other registered tools, and catalog/schema builders omit definitions that do not exist. The removed names may remain visible as stale definition tags until a user edits those configurations, but they are not active or executable. Disposable investigation fixtures may be removed.
- Unacceptable data loss or corruption: Agent-definition load/launch failure, removal of remaining configured tools, automatic mutation of user/server configs, any target-file partial/wrong-location write, production database mutation, or credential disclosure.
- Relevant availability, maintenance-window, or rollout constraints: No maintenance window or migration is required. Deployment removes registry availability atomically with the code version; persisted stale names are tolerated by existing version-agnostic readers/resolvers.
- Related requirement and acceptance-criteria IDs: REQ-007, REQ-010 through REQ-012; AC-005 through AC-008, AC-010 through AC-013

## Assumptions

- `deepseek-v4-flash`, `gemini-3.5-flash`, and `gpt-5.6-sol` are the independently registered identifiers actually called in the imported test environment.
- The screenshots represent the native AutoByteus `edit_file` production path.
- The user prefers conformance to reliable model behavior over retaining conventional unified-diff compatibility when that convention adds little realized safety.
- Numeric-decorated normalization satisfies the user's intent to remove numeric requirements because coordinates have no behavioral meaning after the change.
- The user's four-tool statement applies to the file-oriented/coding mutation surface and removes only `replace_in_file` and `insert_in_file`; unrelated AutoByteus tools remain outside scope.

## Risks / Open Questions

- Provider behavior can drift; the schema and deterministic coverage are the durable contract.
- Unique-context safety can cause retry on repetitive files; this is preferred to silent wrong-location edits.
- Removing exact-edit tools changes the global registered catalog intentionally. Two inspected user/server configs still name both tools; existing file readers preserve those strings and runtime/catalog resolution skips the missing definitions while retaining other registered tools, so the data is directly usable without migration. The stale names can remain visible in agent-definition details until manually removed; automatic config rewriting and compatibility aliases are intentionally excluded.
- The full unit baseline currently has five unrelated failures, and the approval-flow integration file has two unrelated failures; both sets reproduce on detached baseline `4b29481d5` and must remain visible downstream.
- Optional textual Codex hunk labels might improve future compatibility but were not required by benchmark output and are intentionally excluded now.

## Requirement-To-Use-Case Coverage

- Production path and provider-neutral ownership: REQ-001, REQ-008, REQ-009.
- Cross-provider evidence and auditability: REQ-002, REQ-011.
- Canonical bare context editing: REQ-003, REQ-004.
- Gemini-compatible numeric normalization without numeric semantics: REQ-005, REQ-006.
- Safe failure, multi-hunk atomicity, and preserved filesystem behavior: REQ-007, REQ-010, REQ-011.
- Tool catalog contraction and external portfolio boundary: REQ-012.

## Acceptance-Criteria-To-Scenario Intent

- `AC-001`: Screenshot and DeepSeek causal reproduction.
- `AC-002`: Balanced 60-run cross-provider context matrix.
- `AC-003`: Canonical happy-path bare hunk.
- `AC-004`: Numeric decoration is ignored rather than a hidden location hint.
- `AC-005`: Complete invalid/unsafe input rejection matrix.
- `AC-006`: Multi-hunk application is atomic.
- `AC-007`: Whitespace and newline preservation.
- `AC-008`: Filesystem path/protection non-regression.
- `AC-009`: Provider schema/example/streaming consistency.
- `AC-010`: Build and affected-suite validation with truthful baseline classification.
- `AC-011`: Secret hygiene.
- `AC-012`: Clean removal of redundant exact-edit tools while retaining the four approved capabilities.
- `AC-013`: Clean-cut removal of old numeric and exact-edit owners.
- `AC-014`: Narrow grammar boundary.
- `AC-015`: Large-file stack safety.

## Approval Status

Approved and refined by the user on 2026-08-02. The approved patch contract remains: bare `@@` is canonical; numeric coordinates have zero semantics; conventional numeric decoration is tolerated and discarded. The user subsequently simplified the supported file-oriented tool surface to `read_file`, `edit_file`, `write_file`, and `run_bash`, explicitly directing removal of `replace_in_file` and `insert_in_file`.
