# Investigation Notes

## Investigation Status

- Bootstrap Status: Dedicated ticket worktree/branch created; draft artifacts initialized and then refined after code/doc investigation.
- Current Status: Requirements approved/refined; investigation and design spec complete for architecture review handoff.
- Investigation Goal: Locate current work-trace rendering that uses target agent names as assistant speaker labels, determine consumers/cache behavior, and define requirements for canonical role labels while preserving target identity metadata.
- Scope Classification (`Small`/`Medium`/`Large`): Small
- Scope Classification Rationale: Localized change in server-side agent-work-trace projection/render context/renderer plus tests and docs.
- Scope Summary: Replace target-agent-name body labels in generated work trace Markdown with canonical role/tool/projection labels, omit separate reasoning records, remove generated-artifact compatibility metadata, align Retrospective Skill Improver wording, and rename the built-in agent template folder plus built-in skill package id/folder to `retrospective-skill-improver`.
- Primary Questions To Resolve:
  - Which file owns work-trace speaker label selection? Resolved: `AgentWorkTraceRenderer` uses `AgentWorkTraceRenderContext.subjectLabel`, built from `agentName`.
  - Does any consumer parse speaker labels from work trace body? Search found no source consumer parsing body labels as target identity; self-evolution passes paths/manifest/target IDs.
  - Does renderer cache invalidation/versioning need to change? Revised after user clarification: no compatibility/cache-upgrade path should be designed. Remove render-context fingerprint/version metadata and keep only clean current generation semantics; old generated artifacts are outside the contract.
  - How should blank/missing agent names be handled? Requirements should make body labels independent of display names; design should decide whether projection context keeps, renames, or makes display metadata optional.

## Request Context

User observed that prepared work trace content uses the agent name itself and suggested this is not good from an LLM perspective. The user prefers canonical role-like labels because some assistants may not have names and because names represent persona identity while LLM conversational data is semantically `user` / `assistant` / `tool`.

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/work-trace-assistant-speaker-labels`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/work-trace-assistant-speaker-labels/tickets/done/work-trace-assistant-speaker-labels`
- Current Branch: `codex/work-trace-assistant-speaker-labels`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/work-trace-assistant-speaker-labels`
- Bootstrap Base Branch: `origin/personal`
- Remote Refresh Result: `git fetch origin --prune` completed successfully on 2026-07-09.
- Task Branch: `codex/work-trace-assistant-speaker-labels`
- Expected Base Branch (if known): `personal`
- Expected Finalization Target (if known): `personal`
- Bootstrap Blockers: None.
- Notes For Downstream Agents: Work in the dedicated ticket worktree only; the shared `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo` checkout is on `personal` with unrelated untracked files and must not be used for implementation.

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-07-09 | Command | `git status --short --branch`; `git remote show origin`; `git worktree list --porcelain`; `git fetch origin --prune`; `git branch codex/work-trace-assistant-speaker-labels origin/personal`; `git worktree add /Users/normy/autobyteus_org/autobyteus-worktrees/work-trace-assistant-speaker-labels codex/work-trace-assistant-speaker-labels` | Bootstrap dedicated task workspace from latest tracked base. | Base is `origin/personal`; dedicated branch/worktree created successfully. | No |
| 2026-07-09 | Command | `rg -n "work[-_ ]?traces?|WorkTraces?|workTrace|trace content|work trace content|prepared.*trace|prepare.*trace" ...` | Locate likely work-trace implementation before interruption and bootstrap. | Located server docs and `autobyteus-server-ts/src/agent-work-traces/*` implementation, including `agent-work-trace-render-context.ts`, `agent-work-trace-renderer.ts`, and projection tests. | No |
| 2026-07-09 | Code | `autobyteus-server-ts/src/agent-work-traces/domain/work-traces.ts` | Inspect projection/render context public types. | `AgentWorkTraceProjectionContext` requires `agentName: string`; `AgentWorkTraceRenderContext` stores `subjectLabel`, `rendererVersion`, and `fingerprint`; manifest schema is `2`. | Design should decide whether to rename/remove `agentName` and `subjectLabel` or keep with tightened meaning. |
| 2026-07-09 | Code | `autobyteus-server-ts/src/agent-work-traces/services/agent-work-trace-render-context.ts` | Inspect current subject label construction and cache key. | `normalizeAgentWorkTraceSubjectLabel(agentName)` trims/collapses agent name and falls back to `Agent`; `buildAgentWorkTraceRenderContext(agentName)` hashes `{ rendererVersion, subjectLabel }` for generated-cache reuse. | Remove this render-context/speaker-label cache shape from the public package/manifest; old fallback `Agent` must not be used as a body label. |
| 2026-07-09 | Code | `autobyteus-server-ts/src/agent-work-traces/services/agent-work-trace-projection-service.ts` | Inspect projection flow and archive cache reuse. | `ensureCurrent()` builds render context from `context.agentName`; archive files are currently reused only when source fingerprint and render-context fingerprint match. Summary hash currently includes target, render-context fingerprint, and source fingerprints. | Current render-context cache metadata should be removed from the clean current package/manifest and summary semantics should be based on rendered evidence, not compatibility markers. |
| 2026-07-09 | Code | `autobyteus-server-ts/src/agent-work-traces/services/agent-work-trace-renderer.ts` | Locate body label rendering. | User message label is hardcoded `user`; assistant messages, reasoning, tool call headers, and compaction notes all use `renderContext.subjectLabel`, which currently comes from agent name. Renderer also writes body header bookkeeping lines: `Source:`, `Records:`, `First timestamp:`, and `Last timestamp:`. | This is the primary implementation owner for body-label behavior and readable-header cleanup. |
| 2026-07-09 | Code | `autobyteus-server-ts/src/run-history/projection/transformers/raw-trace-to-historical-replay-events.ts`; `historical-replay-event-types.ts` | Inspect upstream event semantics feeding renderer. | Raw traces are transformed into `message` events with roles `user`/`assistant`, separate `reasoning`, `tool`, and `compaction` events. The role information needed for canonical assistant labels already exists. | Renderer can map from event kinds/roles without using agent names. |
| 2026-07-09 | Code | `autobyteus-server-ts/tests/agent-work-traces/agent-work-trace-projection-service.test.ts` | Inspect durable coverage. | Tests currently assert agent-name labels including `Implementation Engineer:`, `Implementation Engineer reasoning:`, `Implementation Engineer tool call:`, fallback `Agent:`, and archive re-render on agent rename. | Tests need updating to canonical role labels, omitted reasoning, minimal body, clean manifest metadata, and no legacy compatibility behavior. |
| 2026-07-09 | Doc | `autobyteus-server-ts/docs/modules/agent_work_traces.md`; `autobyteus-server-ts/docs/modules/self_evolution.md`; `autobyteus-server-ts/docs/ARCHITECTURE.md` | Inspect documented public contract. | Docs explicitly say `agentName` is used to render agent-authored Markdown subject labels, agent-authored entries use normalized target display name, blank names fall back to `Agent`, and tool sections use `<Agent Name> tool call:`. | Docs must be synced after implementation. |
| 2026-07-09 | Code | `autobyteus-server-ts/src/self-evolution/services/self-evolution-service.ts`; `self-evolution-companion-trigger-message-builder.ts`; `self-evolution/domain/evolver-session.ts` | Inspect downstream self-evolution consumer. | Self-evolution calls `ensureCurrent(context)`, stores/passes summary hash, manifest/root/file paths, and target run id. Trigger message does not inline or parse body labels. Session state stores paths/hash only. | Target identity remains available without body speaker labels. |
| 2026-07-09 | Command | `rg -n "work_trace|work traces|workTraces|workTrace|subjectLabel|Implementation Engineer:|tool call:|reasoning:" autobyteus-server-ts/src autobyteus-server-ts/tests autobyteus-web/services autobyteus-web/docs ...` | Look for body-label parsing and all subjectLabel uses. | `subjectLabel` appears only in agent-work-traces source/tests and self-evolution test fixture objects. No source consumer parsing body label text was found. | Low consumer-break risk; tests/docs need update. |
| 2026-07-09 | Code | `autobyteus-server-ts/src/built-in-agents/templates/skill-evolver/agent.md`; `.../skills/retrospective-skill-coach/SKILL.md`; `.../references/*.md` | Analyze self-evolution companion wording against new work-trace contract. | `agent.md` mostly uses acceptable context wording but can be clarified to `target run/agent work trace evidence`. `SKILL.md` evidence interpretation currently says `agent messages` and `reasoning summaries`; this must change to visible `assistant` messages and omit reasoning summaries. References are mostly generic and do not require major change unless implementation finds wording implying reasoning or agent-name body labels. | Update requirements/design/docs sync guidance. |
| 2026-07-09 | Other | User asked whether `self-evolution` should be renamed to `skill-improver` or similar | Analyze naming accuracy. | The behavior is not literal self-evolution of the target agent: a separate improver agent reads the target run's work trace and edits configured durable skill packages. `Skill Improvement` for the capability and `Retrospective Skill Improver` / `improver agent` for the worker are more accurate user/agent-facing terms. Full code/module/API rename is broader than the current ticket unless approved, but touched wording should avoid misleading self-evolution implications and vague companion-agent wording. | Requirements updated with naming wording requirement and open scope boundary. |
| 2026-07-09 | Other | User agreed `companion agent` sounds vague and preferred improved naming | Pin naming vocabulary. | Adopt `Skill Improvement` as capability wording and `Retrospective Skill Improver` / `improver agent` as the worker wording for touched user/agent-facing text. Avoid vague `companion agent` wording. Full source/module/API rename remains a separate refactor unless explicitly expanded. | Requirements updated with naming vocabulary. |
| 2026-07-09 | Code | `autobyteus-server-ts/src/built-in-agents/templates/skill-evolver/agent.md`; `.../retrospective-skill-improver/SKILL.md`; `references/high-signal-trace-patterns.md`; `references/examples.md`; `agent-config.json` | Apply user-requested text-only skill template wording updates during requirements preparation. | Updated human-facing wording to `Retrospective Skill Improver` / `Skill Improvement`, clarified target identity metadata vs body labels, removed `agent messages` / `reasoning summaries` evidence wording, rephrased examples toward target run work-trace evidence, and renamed the built-in skill package id/folder/config from `retrospective-skill-coach` to `retrospective-skill-improver`. Source module/API names remain unchanged pending broader refactor decisions. | Requirements now list the pre-applied baseline and implementation follow-ups. |
| 2026-07-09 | Command | `pnpm -C autobyteus-server-ts exec vitest run tests/agent-work-traces/agent-work-trace-projection-service.test.ts --no-watch` | Try focused baseline test command. | Failed immediately: `ERR_PNPM_RECURSIVE_EXEC_FIRST_FAIL Command "vitest" not found`. `autobyteus-server-ts/node_modules` and root `node_modules` are absent; `pnpm --version` is `10.28.2`. | Implementation validation needs dependency setup or available install/cache. |
| 2026-07-09 | Other | User clarification after example trace shape | Validate proposed readable body shape. | User specifically identified `Source: active` and `Records: 5` as not valuable in the trace body. This supports moving projection bookkeeping out of Markdown body and relying on manifest/package metadata for source/record facts. | Reflect in requirements/design. |
| 2026-07-09 | Other | User clarification on trace title (`# Agent Work Trace: active raw work traces?`) | Validate proposed readable title shape. | User questioned including active/raw trace wording in the title. This confirms source display names such as `active raw traces` should not appear in the readable Markdown title; source/segment facts belong in the manifest/file metadata. | Reflect in requirements/design. |
| 2026-07-09 | Other | User asked whether assistant reasoning needs to be included | Clarify readable trace evidence policy. | Separate reasoning trace records are not necessary for the default LLM-readable work trace. They add token/noise cost, can expose provider/internal reasoning, and do not match canonical user/assistant/tool conversation data. Observable assistant messages, tool calls/results, and neutral trace events are sufficient; visible rationale written as normal assistant content remains included. | Requirements updated to omit separate reasoning records from the default body. |
| 2026-07-09 | Other | User noted some LLMs have huge reasoning-token payloads | Tighten omission policy beyond body rendering. | Large reasoning payloads should not be rendered, prompt-inlined, or allowed to churn the improver-visible evidence summary hash when only omitted reasoning text changes. Cache/hash semantics should be based on rendered evidence, not omitted internal reasoning text. | Requirements updated with reasoning-only summary-hash stability and large-reasoning omission criteria. |
| 2026-07-09 | Other | User asked where agent-name/target-id metadata lives | Clarify metadata/body separation. | Readable Markdown body should stay minimal, but manifest/package metadata must preserve target identity and resolved display name when available. Target display name is metadata only, not a speaker label. | Requirements updated with explicit metadata location and example manifest shape. |
| 2026-07-09 | Other | User asked whether `rendererVersion` / `fingerprint` metadata is really useful | Clarify semantic vs generated-cache metadata. | Initial assessment: these fields can serve generated-cache reuse/provenance, but they are not useful as human/LLM-readable semantic metadata. This was superseded by the next clarification: because generated work traces are non-contract development artifacts, they should be removed rather than retained internally. | Superseded by no-compatibility requirement below. |
| 2026-07-09 | Other | User stated renderer-version/fingerprint fields should be removed | Apply no-legacy/no-compatibility principle to manifest metadata. | Since work traces are regenerated derived artifacts and are read by agents rather than parsed as a stable external file format, renderer-version/fingerprint fields are not useful semantic metadata and should not be carried forward. Stale old-label derived files should be clean-cut regenerated/replaced, not protected by compatibility render metadata. | Requirements updated to forbid `renderContext`, `subjectLabel`, `rendererVersion`, and `fingerprint` in the rewritten package/manifest. |
| 2026-07-09 | Other | User clarified generated work traces are non-contract Markdown artifacts and self-improvement is still development-only | Remove backward-compatibility framing. | Work traces are generated files read by LLM agents, not parsed as a stable external/user-facing format. Already-generated traces do not need migration or support. Design should optimize for clean code: remove old render metadata and avoid fallback, upgrade, dual-rendering, or compatibility tests for old generated artifacts. | Requirements updated with a generated-artifact/no-compatibility rule. |
| 2026-07-09 | Other | User asked to change `name: retrospective-skill-coach` in `SKILL.md` and send the update for review | Clarify skill package id naming. | `retrospective-skill-improver` is preferred because the package actively improves durable skill files; `coach` sounds advisory/passive. The rename is narrow and in scope, distinct from a full `self-evolution` source/API rename. | Requirements, design, template folder, `SKILL.md` frontmatter, and `agent-config.json` updated; implementation must align tests/docs. |
| 2026-07-09 | Other | User feedback on Retrospective Skill Improver `agent.md` and skill files | Review tone and relevance of improver guidance. | The template had repeated negative guardrail-style wording such as broad `Do not ...` lists and `Bad update` examples. User preferred task-relevant guidance because the task packet already defines editable skill roots and the improver naturally focuses on target-run work traces. | Simplified agent/skill/reference wording into positive write-scope, durable-update, context-only, and balanced-package guidance. |
| 2026-07-09 | Other | User asked about renaming the `skill-evolver` folder and agreed to make the requirement clear | Clarify template folder naming scope. | Best narrow folder name is `retrospective-skill-improver` because it matches the worker and package purpose; plain `skill-improver` is acceptable but less precise, while `skill-evolver` is stale. This is a template filesystem rename, not approval for a full `self-evolution` source/module/API or persisted definition-id rename. | Requirements and design updated; implementation must update `templateDirName`, bootstrap tests, docs, and path references. |
| 2026-07-09 | Repo | `git log --oneline -- autobyteus-server-ts/src/agent-work-traces autobyteus-server-ts/tests/agent-work-traces`; `git show --stat --oneline 993214b5` | Understand origin of current behavior. | Current behavior was introduced by commit `993214b5 feat(work-traces): render target agent subject labels`, now present on base branch. | Current task intentionally revises that previous design choice. |

## Current Behavior / Current Flow

- Current entrypoint or first observable boundary: `SelfEvolutionService.startFromEvolutionRequest()` calls `AgentWorkTraceProjectionService.ensureCurrent(context)` before companion messaging. Other future consumers are expected to use the same projection service boundary.
- Current execution flow:
  1. Self-evolution resolves target context with `target`, `memoryDir`, and `agentName`.
  2. `AgentWorkTraceProjectionService.ensureCurrent()` builds a render context from `context.agentName`.
  3. `AgentWorkTraceSourceReader` reads active/archive raw trace files through `RawTraceFileSourceService`.
  4. `AgentWorkTraceRenderer` converts raw trace records through `buildHistoricalReplayEvents()` and renders Markdown.
  5. `AgentWorkTraceStore` writes `work_trace_active.md`, numbered archive files, and `work_traces_manifest.json`.
  6. Self-evolution sends only paths/manifest/hash/target IDs to the companion.
- Ownership or boundary observations:
  - `agent-work-traces` correctly owns the projection/render/store boundary.
  - `run-history` projection already supplies event kind/role semantics (`message` role `user`/`assistant`, `tool`, `reasoning`, `compaction`).
  - Current render context conflates target display identity with body speaker label.
- Current behavior summary:
  - User messages render as lower-case `user:`.
  - Assistant messages render as `<agentName>:`.
  - Separate reasoning records render as `<agentName> reasoning:`.
  - Tool entries render as `<agentName> tool call:`.
  - Compaction notes render as `<agentName>:`.
  - Blank display names fall back to `Agent:`.
  - Markdown body header currently includes source kind, record count, and first/last timestamps, which are projection metadata rather than high-value trace evidence.

## Design Health Assessment Evidence

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Behavior Change / Cleanup
- Candidate root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue / Shared Structure Looseness
- Refactor posture evidence summary: Localized render-context/data-shape tightening is appropriate because `subjectLabel` currently carries target identity into role-label rendering and cache semantics. The broader `agent-work-traces` subsystem boundary is still the right owner.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| User request | Agent names are used where LLM role labels would be more semantically correct. | Current labels confuse persona/name with role. | Requirements should require role labels. |
| `agent-work-trace-render-context.ts` | `subjectLabel` is derived from `agentName`, with fallback `Agent`, and hashed into fingerprint. | Shared render context structure is loose: one field represents target display identity and speaker label. | Design should tighten/rename/remove this shape. |
| `agent-work-trace-renderer.ts` | Same `subjectLabel` is used for messages, reasoning, tools, and compaction notes. | Boundary/ownership issue inside renderer: event role/kind ownership is bypassed by target identity. | Renderer should derive labels from event kind/role. |
| `self-evolution` source | Consumers pass paths/manifest/target IDs; no body-label parse found. | Body-label change should not break target identification. | Update tests/fixtures if render context shape changes. |
| `AgentWorkTraceProjectionService` | Archive reuse currently gates on render-context fingerprint. | This cache metadata now creates unnecessary compatibility weight for non-contract generated artifacts. | Remove render-context compatibility metadata from current package/manifest semantics. |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-work-traces/domain/work-traces.ts` | Work-trace projection, render context, manifest, and package types | Projection context requires `agentName`; render context has `subjectLabel`. | Candidate data-shape tightening point. |
| `autobyteus-server-ts/src/agent-work-traces/services/agent-work-trace-render-context.ts` | Builds render context and fingerprint | Converts agent name to subject label/fallback `Agent`. | Should stop producing body speaker labels from target names and should be removed or reduced so no public/package render compatibility fields remain. |
| `autobyteus-server-ts/src/agent-work-traces/services/agent-work-trace-renderer.ts` | Converts historical replay events to Markdown | Uses `subjectLabel` for assistant/reasoning/tool/compaction labels. | Primary renderer behavior change. |
| `autobyteus-server-ts/src/agent-work-traces/services/agent-work-trace-projection-service.ts` | Public projection service and current generated-cache coordination | Uses render-context fingerprint to decide archive reuse. | Current cache seam should not drive a legacy compatibility design; clean current generation and metadata shape are the target. |
| `autobyteus-server-ts/src/agent-work-traces/services/agent-work-trace-store.ts` | Work-trace output layout and manifest writes | Writes schemaVersion 2 manifest with renderContext. | Schema/version impact depends on render-context shape decision. |
| `autobyteus-server-ts/src/run-history/projection/transformers/raw-trace-to-historical-replay-events.ts` | Converts raw traces into semantic replay events | Already separates message roles, reasoning, tools, compaction. | Renderer should rely on this event semantic boundary. |
| `autobyteus-server-ts/tests/agent-work-traces/agent-work-trace-projection-service.test.ts` | Durable unit coverage for projection | Asserts target-agent labels and fallback `Agent`. | Must be updated to canonical role/tool/projection labels, omitted reasoning, clean metadata, and no legacy compatibility expectations. |
| `autobyteus-server-ts/docs/modules/agent_work_traces.md` | Shared projection module docs | Documents agent display name as subject label. | Docs sync required. |
| `autobyteus-server-ts/docs/modules/self_evolution.md` | Self-evolution docs | Says self-evolution uses resolved target display name for rendered subject labels. | Docs sync required. |
| `autobyteus-server-ts/src/self-evolution/services/companion/self-evolution-companion-trigger-message-builder.ts` | Builds companion request message | Sends file paths/target ID; does not inline trace body. | No body-label dependency found. |
| `autobyteus-server-ts/src/built-in-agents/templates/retrospective-skill-improver/agent.md` | Built-in Retrospective Skill Improver agent instructions | Pre-applied update initially used `work trace evidence for the target run/agent` and clarifies metadata/body-label separation. | Docs/guidance wording update. |
| `autobyteus-server-ts/src/built-in-agents/templates/retrospective-skill-improver/skills/retrospective-skill-improver/SKILL.md` | Retrospective improver skill instructions | Pre-applied update now has `name: retrospective-skill-improver`, describes evidence as visible user/assistant messages, tool calls/results/errors, neutral trace events, retries, corrections, and feedback, and explicitly says separate assistant/internal reasoning records are omitted. | Implementation should preserve this baseline or intentionally supersede wording with equal-or-better wording while keeping the new package id. |

## Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-07-09 | Test | `pnpm -C autobyteus-server-ts exec vitest run tests/agent-work-traces/agent-work-trace-projection-service.test.ts --no-watch` | Failed before running tests because `vitest` is unavailable in the worktree (`node_modules` missing). | Implementation/test stage must install dependencies or use an established dependency cache. |
| 2026-07-09 | Setup probe | `test -d autobyteus-server-ts/node_modules`; `test -d node_modules`; `pnpm --version` | Both node_modules directories absent; pnpm `10.28.2` available. | Validation blocker is dependency availability, not known code failure. |

## External / Public Source Findings

- Public API / spec / issue / upstream source: None used.
- Version / tag / commit / freshness: N/A.
- Relevant contract, behavior, or constraint learned: N/A.
- Why it matters: This is an internal work-trace rendering behavior change.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: Likely none for unit-level projection tests.
- Required config, feature flags, env vars, or accounts: None identified for focused unit tests.
- External repos, samples, or artifacts cloned/downloaded for investigation: None.
- Setup commands that materially affected the investigation: Dedicated git worktree creation; no dependency install performed.
- Cleanup notes for temporary investigation-only setup: None.

## Findings From Code / Docs / Data / Logs

- The current implementation has a clean central owner (`agent-work-traces`) and does not require cross-cutting changes in raw trace storage or self-evolution orchestration.
- The previous target-agent-label behavior is deliberately documented and tested, so implementation must update tests/docs rather than only changing code.
- Existing render-context fingerprinting is now considered unnecessary compatibility/cache metadata for a generated artifact and should not be preserved in the target public package/manifest.
- The render context naming (`subjectLabel`) is a design smell because it made an identity label authoritative for multiple event kinds. Design should tighten this to role/tool labels and optional target metadata if needed.
- Source kind, record count, and first/last timestamps are already represented in source/file/manifest metadata, so repeating them in the readable Markdown body adds noise for LLM/improver-agent consumption.

## Constraints / Dependencies / Compatibility Facts

- Work trace layout is documented under `<memoryDir>/work_traces/` with `work_traces_manifest.json`, archive files, and active file; preserve this layout.
- Existing work traces are generated artifacts; no old-label compatibility mode, migration, fallback, or cache-upgrade behavior is needed.
- Self-evolution session state stores work-trace paths and summary hash only.
- `agent-memory` must not import work-trace projection types; preserve existing dependency direction.
- `agent-work-traces` may depend on raw trace and run-history projection boundaries.

## Open Unknowns / Risks

- Design now selects removal of render context from public package/manifest semantics; implementation still needs to choose the cleanest local type edits (`agentName` -> `targetDisplayName` at the projection boundary or equivalent explicit mapping).
- Requirements now pin non-conversational provider/projection entries to a neutral `trace_event:` style label so implementation does not attribute them to the assistant or target agent.
- Requirements now omit separate reasoning trace records from the default readable work trace; visible assistant-authored rationale remains included only when it is ordinary assistant message content.
- Requirements now require rendered-evidence-oriented summary/cache semantics so huge omitted reasoning text does not bloat work traces or churn the improver-visible evidence summary hash.
- Requirements now forbid carrying forward `renderContext.subjectLabel`, `rendererVersion`, and `fingerprint` in the public package/manifest; no migration/fallback/compatibility handling is required for already-generated work trace artifacts.
- Exact casing is now pinned as lower-case `user`, `assistant`, `tool`, and `trace_event` labels to match the user's LLM-training example and avoid display-name/persona leakage.
- Dependency installation is absent in the task worktree and may need setup during implementation/validation.
- The old `skill-evolver` template folder/name and old `retrospective-skill-coach` id still appear in docs/tests outside the pre-applied template source; implementation must update those references to `retrospective-skill-improver` where in scope.

## Notes For Architect Reviewer

- Requirements are approved/refined by the user on 2026-07-09, and the design spec has been produced.
- Expected review focus: confirm the localized owner/refactor plan in `agent-work-traces`, the explicit no-compatibility/generated-artifact posture, reasoning omission and summary-hash semantics, metadata/body separation, the narrow `retrospective-skill-improver` template/package rename, action-oriented improver guidance wording, and the deferred scope for full `self-evolution` module/API renaming.
- Pre-applied skill-template text edits are part of the package for review; implementation should preserve them or intentionally supersede them with wording that still satisfies the requirements.
