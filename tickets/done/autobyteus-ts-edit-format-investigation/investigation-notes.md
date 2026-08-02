# Investigation Notes

## Investigation Status

- Bootstrap Status: Complete
- Current Status: Investigation and cross-provider benchmarks complete; requirements re-refined by the user on 2026-08-02 to remove redundant exact-edit tools; SR-002 resolves architecture findings and is ready for architecture re-review
- Investigation Goal: Diagnose DeepSeek V4 Flash file-edit failures, measure the main AutoByteus editing mechanisms, and determine a safe cross-provider `edit_file` contract using live DeepSeek, Gemini Flash, and GPT evidence.
- Scope Classification: Medium
- Scope Classification Rationale: The failure is local to one model-facing patch contract, but the contract is shared across providers and changing it requires parser ownership cleanup, safety semantics, multiple schema formatters, and durable regression coverage.
- Scope Summary: Replace numeric-position semantics with uniquely located context hunks; keep narrow normalization for numeric-decorated model output; preserve path/write safety; contract the file-oriented tool surface to `read_file`, `edit_file`, `write_file`, and `run_bash` by removing `replace_in_file` and `insert_in_file`.
- Primary Questions To Resolve:
  1. Is the screenshot failure a malformed tool call, invalid standard diff, or AutoByteus contract mismatch?
  2. Which edit surfaces and schemas produce the highest first-call and exact-file success for DeepSeek V4 Flash?
  3. Does a context-only contract remain reliable for Gemini Flash and GPT?
  4. Can line numbers be removed without silently choosing the wrong repeated location?
  5. Should numeric-looking headers be rejected or normalized after numeric semantics are removed?
  6. Are dedicated exact replacement/insertion tools still necessary when the improved context edit and explicit Bash cover those operations?
- Product Iteration Mode: Inactive; Product Manager callback Not Required
- Production Source State: An uncommitted investigation implementation and tests remain in the dedicated task worktree. They are not approved product code and have not been committed or handed to implementation.

## Request Context

The user reports that an AutoByteus native-runtime agent using DeepSeek V4 Flash repeatedly fails to edit files. Both screenshots show a schema-valid `edit_file` call whose `patch` starts with a bare `@@`. AutoByteus returns `PatchApplicationError: Malformed hunk header: '@@'`; the agent then uses `write_file` successfully. The user authorized live DeepSeek V4 experiments, investigation-only source changes, removal of the numeric-header requirement if evidence supports it, and comparative Gemini Flash and GPT benchmarking.

Reference images:

- `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_74e885cdecbb477e8cead377473fd5c6/solution_designer_da4102bd739040d88e9548cc4906fbf5/context_files/ctx_97fe5d8eddbc__image.png`
- `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_74e885cdecbb477e8cead377473fd5c6/solution_designer_da4102bd739040d88e9548cc4906fbf5/context_files/ctx_29f96c7a594f__image.png`

## Environment Discovery / Bootstrap Context

- Project Type: Git monorepo; primary product package `autobyteus-ts/`
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-ts-edit-format-investigation`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-ts-edit-format-investigation/tickets/done/autobyteus-ts-edit-format-investigation`
- Current Branch: `codex/autobyteus-ts-edit-format-investigation`
- Current Worktree / Working Directory: dedicated worktree path above
- Bootstrap Base Branch: `origin/personal`
- Remote Refresh Result: fetched/pruned and task worktree refreshed to `4b29481d5b6eaea64aebb20abcb5e4d784ea1178` on 2026-08-02
- Task Branch: `codex/autobyteus-ts-edit-format-investigation`
- Expected Base Branch: `personal`
- Expected Finalization Target: `personal`, subject to delivery-stage refresh and user verification
- Bootstrap Blockers: None
- Dependency Setup: `pnpm install --frozen-lockfile` succeeded
- Build Setup: `autobyteus-ts`, required shared packages, and `autobyteus-server-ts` built successfully
- Notes For Downstream Agents: Source edits are experimental evidence until requirements approval and architecture review. Do not infer implementation approval from their presence.

## Supplemental Task Artifact Inventory

| Artifact Path | Purpose And Scope | Evidence, Context, Or Decision Captured | Core Artifact(s) Supported | Related IDs | Status | Approval Applicability / State | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-ts-edit-format-investigation/tickets/done/autobyteus-ts-edit-format-investigation/edit-file-format-investigation-report.md` | Prior edit-format research | Historical comparison and initial patch-format hypotheses | Requirements, investigation | REQ-001, REQ-003 | Retained; superseded where later evidence differs | Evidence only; N/A | None |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-ts-edit-format-investigation/tickets/done/autobyteus-ts-edit-format-investigation/deepseek-edit-benchmark-report.md` | DeepSeek-specific 165-run study | Production trace, causal schema ablation, alternative edit mechanisms, external DeepSeek evidence | Requirements, investigation | REQ-001 through REQ-005 | Complete; recommendation refined by cross-provider report | Evidence only; N/A | None |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-ts-edit-format-investigation/tickets/done/autobyteus-ts-edit-format-investigation/cross-provider-context-patch-benchmark-report.md` | Cross-provider decision report | DeepSeek/Gemini/GPT comparison, strict-reject versus normalization evidence, official Codex/Gemini harness comparison, safety/performance results | Requirements, investigation, future design | REQ-003 through REQ-010 | Complete | Evidence only; N/A | Keep aligned with approved contract |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-ts-edit-format-investigation/tickets/done/autobyteus-ts-edit-format-investigation/benchmark/deepseek-edit-benchmark.mjs` | Opt-in native-runtime benchmark harness | Reproducible scenarios, provider configuration mapping, result capture | Investigation | REQ-002, REQ-003, REQ-005 | Complete investigation tooling | Evidence only; N/A | Durable placement decided later |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-ts-edit-format-investigation/tickets/done/autobyteus-ts-edit-format-investigation/benchmark/summarize-benchmark.mjs` | DeepSeek aggregate generator | Reproducible selected-run and cost summaries | Investigation | REQ-002, REQ-005 | Complete investigation tooling | Evidence only; N/A | None |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-ts-edit-format-investigation/tickets/done/autobyteus-ts-edit-format-investigation/benchmark/summarize-cross-provider-context-benchmark.mjs` | Aggregate generator | Reproducible cross-provider cohort summaries | Investigation | REQ-005 | Complete | Evidence only; N/A | None |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-ts-edit-format-investigation/tickets/done/autobyteus-ts-edit-format-investigation/benchmark/experimental-bare-hunk-compatibility.patch` | Earlier additive experiment | Feasibility of uniquely anchored bare hunks while retaining numeric engine | Investigation | REQ-006, REQ-007 | Historical evidence; superseded implementation posture | Evidence only; N/A | Do not implement as final direction |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-ts-edit-format-investigation/tickets/done/autobyteus-ts-edit-format-investigation/benchmark/experimental-clean-cut-context-patch.patch` | Pre-SR-002 clean-cut context experiment | Self-contained baseline-applicable diff for the context owner, schemas, and direct/affected tests; does not include later exact-tool removal | Investigation, design | REQ-006 through REQ-011 | Complete experiment evidence; not approved/final product code | Evidence only; N/A | Implementation must follow design and REQ-012, not apply verbatim |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-ts-edit-format-investigation/tickets/done/autobyteus-ts-edit-format-investigation/benchmark-evidence/experimental-clean-cut-artifact-baseline-verification.log` | Experiment reconstruction verification | Proves patch applies to `4b29481d5`, builds, and passes 74/74 affected checks | Investigation, design | REQ-009, REQ-011 | Complete | Evidence only; N/A | None |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-ts-edit-format-investigation/tickets/done/autobyteus-ts-edit-format-investigation/benchmark-evidence/cross-provider-context-summary.json` | Machine-readable aggregate | All cross-provider cohorts, counts, formats, durations, token usage | Investigation | REQ-003, REQ-005 | Complete | Evidence only; N/A | None |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-ts-edit-format-investigation/tickets/done/autobyteus-ts-edit-format-investigation/benchmark-evidence/selected-run-summary.json` | Machine-readable DeepSeek aggregate | Selected DeepSeek mechanism/schema cohorts | Investigation | REQ-002, REQ-003, REQ-005 | Complete | Evidence only; N/A | None |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-ts-edit-format-investigation/tickets/done/autobyteus-ts-edit-format-investigation/benchmark-evidence/` | Raw JSONL and execution logs | Per-run arguments/results/failures plus local validation evidence | Investigation | REQ-002, REQ-003, REQ-005, AC-001 through AC-010 | Complete; secret-free | Evidence only; N/A | Keep as audit package |

## Source Log

| Date | Source Type | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-08-02 | Screenshot | Two absolute reference paths above | Inspect reported call and failure | Function call, `path`, and `patch` arrived intact; bare `@@` alone triggered semantic rejection; whole-file write recovered | No |
| 2026-08-02 | Command | `git fetch origin --prune`; refresh task worktree; `pnpm install --frozen-lockfile` | Establish isolated current baseline | Work ran on current `origin/personal`, not a stale shared checkout | No |
| 2026-08-02 | Code | `autobyteus-ts/src/llm/api/deepseek-llm.ts`; `openai-compatible-llm.ts`; streaming handler factory | Trace provider call and tool parsing | DeepSeek API mode uses OpenAI-compatible function schemas/deltas; transport is not the failure boundary | No |
| 2026-08-02 | Code | baseline `src/tools/file/edit-file.ts`; baseline `src/utils/diff-utils.ts` | Inspect contract and parser | Schema demanded numeric hunks; regex rejected bare `@@`; only `oldStart` materially located hunks; new coordinates/counts were not semantically validated | No |
| 2026-08-02 | Repo | `git log -p -- autobyteus-ts/src/tools/file/edit-file.ts`; pre-flatten history | Determine origin/rationale | Numeric parser existed from initial TypeScript migration; 2026-04-08 commit `83ef68785` strengthened prompt wording but did not create parser strictness; no deeper ADR found | No |
| 2026-08-02 | Code | `replace-in-file.ts`, `insert-in-file.ts`, `write-file.ts`, `run-bash.ts` | Compare mutation surfaces | Exact tools are narrow; whole write and bash are broader and should not be implicit fallbacks | No |
| 2026-08-02 | Other | `/Users/normy/autobyteus_org/autobyteus-agents/agents/product-prototyper/agent-config.json` | Compare screenshot agent portfolio | Its file-oriented subset includes read/edit/write/bash and omits replace/insert named by the error guidance; unrelated process/browser tools remain outside this scope | No change required |
| 2026-08-02 | Setup | `pnpm secrets:import /Users/normy/.autobyteus/server-data/.env .../autobyteus-server-ts/db/test.db` plus Prisma/vault initialization | Enable authorized live calls without production DB mutation | Isolated test DB worked; vault requires repository Prisma initialized against the exact DB first; no secret values retained | No |
| 2026-08-02 | Trace | DeepSeek matrices indexed in `selected-run-summary.json` | Reproduce and compare mechanisms | Generic schema caused bare output and strict-parser failures; unique context restored first-call success; replace/write/bash bounded pilots succeeded | No |
| 2026-08-02 | Trace | `cross-provider-context-only-main.jsonl` | Test explicit context contract | DeepSeek, Gemini, GPT each achieved 20/20 first and final, all bare | No |
| 2026-08-02 | Trace | `cross-provider-context-only-neutral.jsonl` | Test production schema without redundant system instruction | DeepSeek/GPT 12/12 first; Gemini 9/12 first because three numeric late-insertion headers were rejected, then recovered | No |
| 2026-08-02 | Trace | `gemini-context-normalized-neutral.jsonl` | Test whether numeric syntax should be rejected after semantic removal | Ignoring numeric decoration restored Gemini to 12/12 first/final; matching remained context-only | No |
| 2026-08-02 | Trace | `cross-provider-generic-schema-pilot.jsonl` | Observe unprompted provider dialect priors | DeepSeek bare; Gemini SEARCH/REPLACE or numeric; GPT full Codex envelope. No universal hidden vendor format exists | No |
| 2026-08-02 | Trace | `gemini35-replace-pilot.jsonl` | Compare Gemini exact-edit route | 12/12 first/final proves capability; later user catalog decision removes the redundant tool for surface simplicity | No |
| 2026-08-02 | Web/Repo | `https://github.com/openai/codex/blob/main/codex-rs/core/prompt_with_apply_patch_instructions.md`; official parser and apply logic | Compare Codex contract | Codex uses an outer custom envelope and inner context-located hunks; numeric positions are not required | No |
| 2026-08-02 | Web/Repo | `https://github.com/google-gemini/gemini-cli/blob/main/docs/tools/file-system.md`; `docs/reference/tools.md` | Compare public Gemini harness | Gemini CLI exposes exact old/new replacement and write, not strict numeric unified diff | No |
| 2026-08-02 | Paper/Web | `https://arxiv.org/html/2606.19348v1#S5.SS1.SSS1`; `#S5.SS2`; DeepSeek API docs | Bound reverse-engineering claims | DSML/XML invocation and minimal bash+edit harness are public; proprietary file-edit grammar is not | No |
| 2026-08-02 | Probe | `context-parser-local-microbenchmark.jsonl` | Check clean-cut parser scaling/failure modes | Initial one-million-line probe exposed spread call-stack overflow; iterative append fixed it; post-fix averages 0.151/1.947/18.810 ms for 10k/100k/1m lines | No |
| 2026-08-02 | Test | `pnpm build`; selected Vitest suites; full `tests/unit`; detached-baseline reruns; `git diff --check` | Validate experimental feasibility and classify failures | Build/diff check pass; affected parser/edit paths green; 5 full-unit failures and 2 approval-flow failures reproduce on baseline and are unrelated | No |
| 2026-08-02 | Code/Command | `rg` over `autobyteus-ts/src`, tests, docs, and checked-in `autobyteus-agents` configs for exact-tool names/registrations | Bound user-requested tool removal | Product references are limited to default registration, exact-tool files/utility, current edit guidance/docs, shared path/schema tests, dedicated tests, and two diagnostics; none of 89 checked-in package agent configs names either tool | No |
| 2026-08-02 | Test | Rebuilt `experimental-clean-cut-context-patch.patch`; detached worktree at `4b29481d5`; `git apply --check`; build; 74 affected checks | Resolve `DR-ECF-001` | Self-contained artifact applies/builds and passes; it remains pre-SR-002 evidence and intentionally omits later tool-catalog removal | No |
| 2026-08-02 | Code | `autobyteus-server-ts/src/agent-definition/providers/{file-agent-definition-provider.ts,agent-definition-config.ts}`; `autobyteus-server-ts/src/agent-execution/backends/autobyteus/autobyteus-agent-tool-resolver.ts`; `autobyteus-ts/src/tools/usage/providers/tool-schema-provider.ts`; server catalog/GraphQL and web definition form/detail paths | Trace persisted agent tool names through read, display, catalog, schema, and launch | Config readers preserve string arrays; GraphQL/details can retain stale tags; available catalogs derive from the registry; AutoByteus launch warns/skips missing definitions while resolving remaining tools; schema/catalog paths likewise omit unknown definitions | No migration code required |
| 2026-08-02 | Command | Secret-free scan of `agent-config.json` paths under `/Users/normy/.autobyteus/server-data` and `/Users/normy/autobyteus_org/autobyteus-agents` | Inspect representative persisted/configured data before choosing transition posture | Runtime data: 2 of 9 configs (`professor`, `student`) name both exact tools once; checked-in packages: 0 of 89. No file contents or credentials were copied into evidence | Preserve files; record Directly Usable — No Migration |
| 2026-08-02 | Runtime probe | Built current `autobyteus-ts` / `autobyteus-server-ts` dist; unregister both exact definitions in-process; resolve configured names `[replace_in_file, read_file, insert_in_file, run_bash]` through `resolveAutoByteusAgentTools` | Verify the no-migration claim against actual resolver behavior | Resolution returned `actualToolNames=[read_file, run_bash]`, two warnings, zero errors, and no removed definitions; the process-local probe did not read or write agent configs | Convert invariant into durable resolver coverage during implementation |

## Relevant Existing Behavior And Production Paths

| Behavior ID | Kind | Current Supported Trigger Or Governing Contract | Current Production Path And Lifecycle | Meaningful Current Outcome / Invariants | Evidence |
| --- | --- | --- | --- | --- | --- |
| BEH-001 | Contract | Model invokes `edit_file(path, patch)` with bare `@@` context hunk | Tool call parses and dispatches; baseline numeric header parser rejects before context search | File is not written; error says malformed hunk | Screenshots; DeepSeek generic-schema matrices |
| BEH-002 | Contract | Baseline tool schema explicitly requests numeric unified-diff ranges | Schema formatter -> model -> baseline `applyUnifiedDiff` | Properly instructed DeepSeek/Gemini achieve 20/20 numeric-baseline success, but models must calculate syntactically valid coordinates | Baseline code; live numeric cohorts |
| BEH-003 | System | Accepted `edit_file` patch targets an existing resolved path | resolve/read -> apply all hunks in memory -> write once | Path protections and no-partial-write behavior guard mutation | Baseline code/tests; experimental focused tests |
| BEH-004 | Contract | Agent can use exposed exact replacement/insertion, write, or bash tools | Separate tool owners and schemas | Exact tools are reliable but functionally redundant under the user-selected `edit_file`/write/bash surface; remove them without adding fallback | Tool code; mechanism cohorts; user decision 2026-08-02 |
| BEH-005 | Contract | Tool grammar is clearly stated in schema/system prompt | Provider receives production API schema | All three benchmarked providers can produce bare hunks reliably; generic grammar elicits incompatible vendor-specific priors | 60-run explicit context cohort; generic pilot |
| BEH-006 | Operational | Product Prototyper uses configured tool portfolio | External agent config controls exposed tools | Its current read/edit/write/bash set already matches the approved direction; only stale edit-error guidance must be removed | External config and screenshots |
| BEH-007 | Contract | Numeric-decorated hunk arrives after a bare-context contract is documented | No supported baseline path; experimental clean-cut parser can normalize it | Strict rejection harms Gemini first-call reliability; ignoring coordinates preserves one context matcher and safety | Gemini 9/12 strict-reject versus 12/12 normalized cohorts |
| BEH-008 | Contract | Default tool initialization registers all built-in file tools; persisted agent configs may retain tool-name strings | `registerTools` exposes exact tools; file-backed agent readers retain configured names; runtime/catalog resolution consults current definitions and skips missing names | Remove both definitions/registration/support/docs/tests; preserve four selected capabilities and unrelated tools; leave persisted files unchanged and let existing missing-name resolution keep the remaining tools usable | `src/tools/register-tools.ts`; exact-edit source/tests; file-provider/resolver/catalog traces; representative config scan |

## Architecture / Production Path

```text
Agent tool portfolio
  -> ToolSchemaProvider / provider formatter
  -> provider API native function call
  -> ApiToolCallStreamingResponseHandler
  -> ToolInvocation / execution lifecycle
  -> edit_file(context, path, base_dir?, patch)
  -> resolveFileToolPath + read existing file
  -> patch semantic owner
  -> complete in-memory application
  -> one filesystem write
```

Baseline failure boundary:

```text
valid function call + intact patch string
  -> hunk starts "@@"
  -> numeric regex expects "@@ -N[,N] +N[,N] @@"
  -> PatchApplicationError before old/context lines are considered
```

Target semantic path supported by experiments:

```text
bare @@ or numeric-decorated @@
  -> normalize header; discard coordinates
  -> derive expected old sequence from context/removals
  -> require one unique eligible match
  -> build all hunk results in memory
  -> write only if every hunk succeeds
```

## Design Health Assessment Evidence

- Change posture: Bug Fix + Behavior Change + bounded Refactor
- Candidate root cause classification: Boundary Or Ownership Issue plus Legacy Or Compatibility Pressure
- Refactor posture evidence summary: Refactor needed now. The file/module name `diff-utils` and `applyUnifiedDiff` advertise standard unified-diff semantics that the approved direction would intentionally stop providing. A clean-cut context-patch owner avoids preserving misleading numeric APIs or adding two semantic engines.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| Baseline parser | Requires four numeric fields but does not validate/use most of them | Contract complexity exceeds realized safety value | Replace misleading owner/API |
| DeepSeek ablation | Bare context is frequent and safely usable | Provider branch is unnecessary; parser boundary should accept canonical context | Design one provider-neutral grammar |
| Cross-provider explicit cohort | 60/60 bare output and success | One clear schema works across tested vendors | Keep formatter/schema examples aligned |
| Gemini neutral cohort | Numeric decoration persisted on one scenario | Absolute syntax rejection is brittle | Normalize decoration without restoring semantics |
| Generic cohort | Three vendors emitted three dialect families | Do not infer or accept every vendor harness envelope | Keep grammar explicit and narrow |
| Safety tests | Unique matching rejects repeated ambiguity | Numeric coordinates are not necessary for safe location when context is unique | Preserve deterministic failure and no-write invariant |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-ts/src/tools/file/edit-file.ts` | Tool contract, path/read/write orchestration, retry | Correct public owner; baseline text teaches numeric grammar | Keep orchestration, change schema/error wording, delegate to context owner |
| `autobyteus-ts/src/utils/diff-utils.ts` | Baseline numeric hunk parsing/application | Misnamed for target semantics; numeric fields partially used | Remove cleanly rather than keep compatibility wrapper |
| `autobyteus-ts/src/utils/context-patch-utils.ts` | Investigation-only context semantic owner | Unique matching, numeric normalization, iterative append | Candidate target owner subject to design review |
| XML schema/example formatters | XML tool usage contract | Duplicate patch examples must match API tool schema | Update together; no transport-specific semantics |
| API streaming file-content paths | Stream/retain patch strings | Patch content passes through unchanged | Fixture updates only; no provider-specific parser fork |
| `replace-in-file.ts` / `insert-in-file.ts` | Exact edit alternatives | Functionally subsumed by context edit or explicit Bash under the approved surface | Remove cleanly |
| `text-edit-utils.ts` | Shared exact occurrence/anchor operations | Used only by the two removed tools | Remove as now-unowned support code |
| `src/tools/register-tools.ts` | Default built-in tool registration | Imports and registers both removed tools | Delete imports/calls; preserve other registrations |
| external Product Prototyper config | Agent tool portfolio | Already exposes read/edit/write/bash and no exact tools | No change required |

## Runtime / Probe Findings

| Date | Method | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-08-02 | Repro | Native harness, generic edit schema, strict baseline parser | DeepSeek Flash thinking 8/20 first, non-thinking 0/12 first; failures were bare-header rejection | Screenshot failure is representative when schema does not force numeric syntax |
| 2026-08-02 | Probe | Explicit context cohort, 5 trials x 4 scenarios x 3 models | 60/60 first/final, all bare, all sentinels intact | Context contract is viable cross-provider |
| 2026-08-02 | Probe | Schema-only cohort, 3 trials x 4 scenarios x 3 models | DeepSeek/GPT 12/12; Gemini 9/12 first then 12/12 final | Parser should tolerate numeric decoration |
| 2026-08-02 | Probe | Gemini normalized schema-only rerun | 12/12 first/final, same 9 bare + 3 numeric distribution | Discarding numbers avoids failures without using them |
| 2026-08-02 | Test | Final build and focused Vitest selection | Build passed; changed parser/edit/schema/streaming/path cases passed; unrelated baseline failures identified | Experimental implementation is feasible; repository baseline has independent red tests |

## External / Public Source Findings

- Codex public apply-patch sources: custom path-carrying envelope; inner context search, optional textual header, no required numeric positions. Matters because AutoByteus can align with the inner hunk principle without duplicating its separately supplied path.
- Gemini CLI public file-system docs: exact old/new replacement and write are primary public editing tools. This explains Gemini's measured exact-tool reliability but does not require AutoByteus to retain a dedicated tool after the user selected a smaller context-edit/write/bash surface; it is also not evidence for accepting SEARCH/REPLACE marker blocks inside `edit_file.patch`.
- DeepSeek V4 report/API docs: tool invocation encoding is documented, but proprietary file-edit grammar is not. Matters because conclusions must be based on observed AutoByteus calls, not claims about hidden training syntax.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: Live provider accounts from the supplied secret store; disposable filesystem fixtures; no external server process.
- Required config, feature flags, env vars, or accounts: Worktree-local ignored test DB imported from `/Users/normy/.autobyteus/server-data/.env`; provider registrations already present.
- External repos, samples, or artifacts cloned/downloaded: None required; official upstream source/docs consulted by URL.
- Setup commands that materially affected the investigation: build shared packages; import secrets into `autobyteus-server-ts/db/test.db`; initialize `repository_prisma` with that file URL before secret-vault runtime.
- Cleanup notes: Per-run temp workspaces are removed by the harness. Test DB/root-key files remain ignored local setup and are not artifacts. Detached verification worktrees were removed.

## Findings From Code / Docs / Data / Logs

1. The DeepSeek screenshot patch is not a valid conventional numeric unified diff, but it is a coherent context hunk and the API tool call itself is valid.
2. Baseline numeric coordinates provide less value than their contract suggests: `newStart`/`newCount` are unused, counts are not validated, and the path already exists outside the patch.
3. Exact numeric guidance can obtain ceiling performance, but it is prompt-dependent and creates a deterministic failure for useful bare context output.
4. A canonical bare context schema produced 60/60 first-call successes across the three tested providers.
5. No unprompted universal model patch dialect exists; explicit tool grammar is mandatory.
6. Numeric semantics can be removed safely if context must be unique. Numeric syntax should be normalized, not rejected, because Gemini occasionally retains it even under the new schema.
7. Complete Codex envelopes, file headers, textual hunk labels, and Gemini SEARCH/REPLACE markers are not needed for the measured production contract and would enlarge ambiguity/ownership unnecessarily.
8. The clean-cut experiment exposed and fixed a million-line spread overflow; post-fix scaling was linear in the retained local probe.
9. Exact replacement/insertion are reliable but not necessary for functional completeness when agents have the improved `edit_file`, deliberate `write_file`, and `run_bash`; the user approved deleting both tools rather than adding them to portfolios.
10. Active repository source references are bounded to default registration, edit guidance, one current documentation page, two live diagnostic portfolios, path-schema/protection coverage, and dedicated exact-tool source/tests. None of 89 checked-in `autobyteus-agents` configs names either removed tool; two of nine inspected user/server configs do, but normal resolution already makes missing names inert without blocking remaining tools.

## Persisted Data Transition Evidence

- Current stored subject: File-backed agent definitions store `toolNames: string[]` in `agent-config.json`. Two of nine inspected runtime-data configs name `replace_in_file` and `insert_in_file`; 0 of 89 checked-in package configs do. Benchmark provider/model configuration separately exists in an ignored worktree-local test database.
- Representative paths/volume: `/Users/normy/.autobyteus/server-data/agents/{professor,student}/agent-config.json`; one occurrence of each removed name per file; six configured tools per file.
- Normal read/display/write behavior: `normalizeAgentConfigRecord` preserves string names, the GraphQL definition/detail path returns them, and the tag input can show stale selected names. No current-version rewrite occurs merely on read.
- Normal runtime/catalog behavior: `resolveAutoByteusAgentTools` warns and skips a name absent from `defaultToolRegistry`, then continues resolving the rest; `ToolSchemaProvider` and Agent Tools MCP catalog resolution also omit missing definitions. Registry-backed available-tool queries no longer advertise a deleted definition. A process-local runtime probe after unregistering both exact tools resolved `[replace_in_file, read_file, insert_in_file, run_bash]` to `[read_file, run_bash]` with two warnings and zero errors.
- Product schema/serialization change: The string-array representation is unchanged; only two registry definitions disappear.
- Required outcome: Directly Usable — No Migration. Preserve the files and all remaining tool selections; stale exact-tool strings are inactive and may remain visible until manually edited.
- Existing migration framework investigation: File-provider read/write and resolver behavior were inspected. No transform boundary is justified because current data already loads and launches; automatic rewrite would mutate user config solely for representational cleanup.
- Unacceptable outcome: Definition/launch failure, loss of remaining configured tools, automatic config mutation, production/server database mutation, or credential disclosure; none is required by the design.

## Constraints / Dependencies / Compatibility Facts

- The model-facing contract must be identical across API and XML formatter descriptions/examples.
- `path` remains the single file-identity source; patch payload must not add a second authoritative path.
- Existing absolute/relative base-dir and protected-path semantics must not change.
- File writes occur only after complete successful application.
- Exact replacement/insertion are removed under the approved SR-002 scope; `edit_file`, `write_file`, and `run_bash` remain independently selected with no automatic fallback.
- Numeric-decorated header acceptance is normalization only. Wrong coordinates must still apply when context is unique, and correct coordinates must not resolve ambiguous context.
- Live provider tests are evidence, not suitable as mandatory deterministic CI coverage.

## Open Unknowns / Risks

- Provider behavior can drift after 2026-08-02; durable tests must exercise semantics without live-provider dependence.
- Unique matching may require the model to retry with more context when the file contains repetition; this is intentional safety behavior.
- Optional Codex textual hunk headers were not produced under the production schema and remain unsupported unless later evidence creates a requirement.
- Concurrent external writers remain outside scope; existing read-then-write behavior is preserved.
- Removed names remain as stale tags in two inspected user/server configurations and could exist in other custom sources. Existing resolvers make those references inert and keep other configured tools usable, so no migration or alias is justified; users may manually remove stale tags. A regression that makes an unknown configured name fatal would violate the Directly Usable decision.
- Full unit baseline is not green: five failures reproduced on detached baseline. Two approval-flow failures also reproduced on baseline. These are not caused by the patch work but must be reported downstream.

## Notes For Architecture Reviewer

Requirements are user-approved, `design-spec.md` exists, and SR-001 received `ARCH-REV-001: Fail` only for package-integrity findings `DR-ECF-001` and `DR-ECF-002`. SR-002 resolves those findings and additionally incorporates the user's subsequent approved tool-surface contraction. Re-review should focus on:

1. clean removal of `diff-utils.ts` / `applyUnifiedDiff` and the exact-edit tool/source/test surface rather than compatibility wrappers;
2. one unique-context matcher for both bare and normalized numeric-decorated headers;
3. atomic multi-hunk application and deterministic ambiguity/no-anchor/no-match errors;
4. schema/example consistency across provider formatters;
5. rejection of duplicate path/envelope grammars;
6. regression boundaries for newlines, whitespace retry, large files, paths, and protected files;
7. preservation of the existing Product Prototyper file-oriented subset without external edits;
8. correctness and completeness of exact-tool registration/source/test/docs removal with no compatibility aliases;
9. Directly Usable — No Migration handling for persisted stale names: not executable, no launch failure, other tools retained, no automatic file rewrite;
10. self-contained experiment evidence status: baseline-verified but explicitly pre-SR-002 and non-final.
