# Investigation Notes

## Investigation Status

- Bootstrap Status: Complete
- Current Status: Reinvestigation complete after refreshing to updated `origin/personal`; refined requirements and design prepared.
- Investigation Goal: Locate current shared work-trace rendering behavior, understand how target agent display names flow from self-evolution into projection, and assess whether companion prompt/static skill wording should change with the generated label behavior.
- Scope Classification (`Small`/`Medium`/`Large`): Medium-small
- Scope Classification Rationale: The renderer change is local, but the updated base moved projection into a shared `agent-work-traces` capability and the scope now includes self-evolver prompt/skill wording plus archive reuse correctness.
- Scope Summary: Replace generated worker-centric work-trace subject labels with target agent display-name labels, use `tool call` for tool blocks, make cache reuse subject-label-aware, and update adjacent self-evolution guidance that describes target-agent evidence.
- Primary Questions Resolved:
  - Current projection owner: `autobyteus-server-ts/src/agent-work-traces`.
  - Current label source gap: projection context lacks `agentName`, renderer hardcodes `worker`.
  - Target name source: `SelfEvolutionTargetContext.agentName` from `AgentDefinition.name`.
  - Adjacent wording: built-in Skill Self-Evolver task/static guidance still uses `target worker`/`future workers` terminology for the same evidence actor.

## Request Context

- 2026-07-07: User reported self-evolution transforms raw traces into a canonical file but uses `worker` as the subject; suggested agent name plus `agent` suffix.
- 2026-07-08: User and solution designer refined the target wording to use agent display name only, no appended `agent`, preserving display casing, and to use `tool call` for tool entries.
- 2026-07-08: User approved starting the ticket, noted `origin/personal` had updated, and asked to reinvestigate and consider self-evolution agent instruction/skill wording so the whole experience sounds natural without `worker` as the evidence actor.

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/self-evolve-agent-subject-naming`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/self-evolve-agent-subject-naming/tickets/in-progress/self-evolve-agent-subject-naming`
- Current Branch: `codex/self-evolve-agent-subject-naming`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/self-evolve-agent-subject-naming`
- Bootstrap Base Branch: `origin/personal`
- Remote Refresh Result: Initial `git fetch origin --prune` completed on 2026-07-07. After user reported updated base, `git fetch origin --prune` completed again on 2026-07-08 and the task branch fast-forwarded to `origin/personal`.
- Task Branch: `codex/self-evolve-agent-subject-naming`
- Expected Base Branch (if known): `personal` / `origin/personal`
- Expected Finalization Target (if known): `personal`
- Bootstrap Blockers: None
- Notes For Downstream Agents: Use the dedicated worktree path above. The branch was fast-forwarded from `06e0985b5f6e05e812751280a07d82d35eb8c112` to `be4260235f832bc7b34920079bb9f26aadc9e16b` before producing the final design.

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-07-07 | Command | `pwd && git rev-parse --show-toplevel && git status --short --branch && git remote -v` in `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo` | Bootstrap repository context | Main checkout was Git repo on `personal` tracking `origin/personal` with unrelated untracked paths. | No |
| 2026-07-07 | Command | `git remote show origin` and `git symbolic-ref --short refs/remotes/origin/HEAD` | Resolve bootstrap base branch | Remote HEAD resolves to `personal`; `origin/personal` is the highest-confidence base. | No |
| 2026-07-07 | Command | `git fetch origin --prune` | Refresh tracked remote refs before creating dedicated worktree | Completed successfully. | No |
| 2026-07-07 | Command | `git worktree add -b codex/self-evolve-agent-subject-naming /Users/normy/autobyteus_org/autobyteus-worktrees/self-evolve-agent-subject-naming origin/personal` | Create mandatory dedicated task worktree/branch | Created branch/worktree at `06e0985b`. | No |
| 2026-07-07 | Code | `autobyteus-server-ts/src/self-evolution/services/work-traces/self-evolution-work-trace-renderer.ts` (pre-refresh) | Initial path investigation | Pre-refresh self-evolution renderer hardcoded `worker`, `worker reasoning`, `worker tool`. | Superseded by updated base but confirms behavior lineage. |
| 2026-07-07 | Code | `autobyteus-server-ts/src/self-evolution/services/self-evolution-target-context-resolver.ts` | Verify agent name availability | `SelfEvolutionTargetContext` includes `agentName` for standalone and team-member targets. | Still current after refresh. |
| 2026-07-08 | Command | `git status --short --branch && git rev-parse HEAD && git rev-parse origin/personal` | Check updated base after user note | Branch was behind `origin/personal` by 9 commits before refresh. | Fast-forward branch. |
| 2026-07-08 | Command | `git fetch origin --prune` | Refresh remote refs after user note | Completed successfully. | No |
| 2026-07-08 | Command | `git merge --ff-only origin/personal` | Update ticket branch without losing untracked artifacts | Fast-forwarded branch to `be426023`; work trace code moved to shared `agent-work-traces`, active raw trace file is `raw_traces_active.jsonl`, docs/tests updated by upstream. | Reinvestigate all affected paths. |
| 2026-07-08 | Code | `autobyteus-server-ts/src/agent-work-traces/services/agent-work-trace-renderer.ts` | Inspect current renderer owner | Current shared renderer still hardcodes `worker`, `worker reasoning`, `worker tool`, and compaction `worker`. | Modify renderer to accept/use target agent subject label. |
| 2026-07-08 | Code | `autobyteus-server-ts/src/agent-work-traces/services/agent-work-trace-projection-service.ts` | Inspect current projection owner/cache reuse | `ensureCurrent(context)` calls `renderer.renderSource(source)` and reuses unchanged archive files based only on `sourceFingerprint`. | Pass render context to renderer; add render-context fingerprint to reuse decision/manifest/summary hash. |
| 2026-07-08 | Code | `autobyteus-server-ts/src/agent-work-traces/domain/work-traces.ts` | Inspect shared context/domain shape | `AgentWorkTraceProjectionContext` currently has only `target` and `memoryDir`; manifest schema version is `1`; file entries have only `sourceFingerprint`. | Add target agent display name and render fingerprint metadata. |
| 2026-07-08 | Code | `autobyteus-server-ts/src/agent-work-traces/services/agent-work-trace-store.ts` | Inspect store/manifest writer | Writes under `<memoryDir>/work_traces`; manifest `schemaVersion: 1`; file entry stores source fingerprint only. | Preserve path/file names; extend manifest/file metadata if needed for render fingerprint. |
| 2026-07-08 | Test | `autobyteus-server-ts/tests/agent-work-traces/agent-work-trace-projection-service.test.ts` | Inspect current durable coverage | Current tests create `raw_traces_active.jsonl`, assert shared layout, and still expect `worker:\n...`. | Update tests for agent-name labels, tool call, compaction, fallback, cache invalidation. |
| 2026-07-08 | Code | `autobyteus-server-ts/src/self-evolution/services/self-evolution-service.ts` | Inspect self-evolution consumer | Imports `AgentWorkTraceProjectionService`; calls `ensureCurrent(context)` with `SelfEvolutionTargetContext`, which already has `agentName`. | Adding `agentName` to shared context is structurally compatible. |
| 2026-07-08 | Code | `autobyteus-server-ts/src/self-evolution/services/companion/self-evolution-companion-trigger-message-builder.ts` | Inspect runtime task packet wording | Prompt begins `Self-improvement requested for the target worker.` and otherwise passes work trace paths only. | Change to `target agent`; preserve path-only packet and metadata keys. |
| 2026-07-08 | Code | `autobyteus-server-ts/src/built-in-agents/templates/skill-evolver/agent.md` | Inspect built-in self-evolver system/static instruction | Uses `target-worker work evidence` and `target worker's work trace evidence`. | Update to target-agent wording. |
| 2026-07-08 | Code | `autobyteus-server-ts/src/built-in-agents/templates/skill-evolver/skills/retrospective-skill-coach/SKILL.md` | Inspect private coaching skill | Uses `target-worker`, `future workers`, `worker messages`, and worker-focused questions. | Update to target-agent/future-agent/agent-message wording. |
| 2026-07-08 | Code | `autobyteus-server-ts/src/built-in-agents/templates/skill-evolver/skills/retrospective-skill-coach/references/*.md` | Inspect required references | Examples/high-signal/playbook references use generic `worker` for the evidence actor and future skill users. | Update those evidence-actor terms to agent/future agents. |
| 2026-07-08 | Doc | `autobyteus-server-ts/docs/modules/agent_work_traces.md` | Inspect shared projection docs | Rendering section says worker messages; background projection worker wording is actual worker concept. | Change rendered-content wording only; keep actual background worker term. |
| 2026-07-08 | Doc | `autobyteus-server-ts/docs/modules/self_evolution.md` | Inspect self-evolution docs | Work trace content says worker messages; background projection worker wording is actual worker concept. | Change rendered-content wording only; keep actual background worker term. |
| 2026-07-08 | Command | `rg -n "worker|Worker|target worker|worker messages|worker reasoning|worker tool|\\] worker|worker:|tool call|work trace|agentName|displayName" ...` | Inventory active worker terminology in relevant source/docs/tests | In-scope worker terms are renderer labels, test expectations, self-evolver prompt/static guidance, docs rendered-content descriptions. Many other worker terms in repo are real runtime/application/background worker concepts and should not be renamed. | No broad search/replace. |
| 2026-07-08 | Doc | `tickets/done/shared-work-trace-projection/requirements.md` and investigation notes | Understand upstream extraction ticket | Confirms `agent-work-traces` is now shared owner, `<memoryDir>/work_traces` is target layout, raw traces remain canonical, and old self-evolution projection path is obsolete. | Preserve these new boundaries. |

## Current Behavior / Current Flow

- Current entrypoint or first observable boundary: Manual self-evolution start (`SelfEvolutionService.startFromEvolutionRequest`) calls shared `AgentWorkTraceProjectionService.ensureCurrent(context)` before activating/posting to the companion evolver.
- Current execution flow:
  1. `SelfEvolutionTargetContextResolver` resolves target context, including `agentName`, `memoryDir`, and target identity.
  2. `SelfEvolutionService` passes that context into `AgentWorkTraceProjectionService.ensureCurrent(context)`.
  3. `AgentWorkTraceProjectionService` reads existing manifest, lists raw trace sources through `AgentWorkTraceSourceReader`, renders sources through `AgentWorkTraceRenderer.renderSource(source)`, writes changed trace files through `AgentWorkTraceStore`, writes manifest, and returns `AgentWorkTracePackage`.
  4. `AgentWorkTraceSourceReader` uses `RawTraceFileSourceService` to read active `raw_traces_active.jsonl` and archive segments.
  5. `AgentWorkTraceRenderer` builds historical replay events and emits Markdown labels.
  6. `AgentWorkTraceStore` writes derived files under `<memoryDir>/work_traces/`.
  7. `SelfEvolutionCompanionTriggerMessageBuilder` sends manifest/root/file paths to the companion; it does not inline work trace body.
- Ownership or boundary observations:
  - `agent-work-traces` is now the authoritative projection owner.
  - `self-evolution` is a consumer and owns target resolution plus companion workflow.
  - The target agent display name belongs upstream with target context resolution, but the visible work-trace label policy belongs in `agent-work-traces` rendering.
  - Raw trace source reading and historical replay transformation should remain display-label agnostic.
- Current behavior summary: The shared projection lacks agent display-name input and still emits worker-centric labels. The self-evolution companion's runtime/static guidance also still describes the target evidence actor as a worker.

## Design Health Assessment Evidence

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Behavior Change with small shared-boundary refactor and wording cleanup
- Candidate root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue
- Refactor posture evidence summary: Small refactor needed now. The renderer owns visible labels but does not receive target agent identity; projection cache reuse assumes rendering depends only on raw source fingerprint, which will no longer be true once agent display name becomes part of rendered content.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| User clarification | Final preferred labels use agent display name only and `tool call`. | Requirements should not append `agent` or lowercase configured names. | Implement display-name labels. |
| `AgentWorkTraceProjectionContext` | Only has `target` and `memoryDir`. | Shared projection boundary is too thin for display-name rendering. | Add `agentName` or equivalent display-name field. |
| `SelfEvolutionTargetContext` | Has `agentName` from `AgentDefinition.name`. | Existing self-evolution caller can satisfy new shared context without extra lookup. | Use as source-of-truth. |
| `AgentWorkTraceRenderer` | Hardcodes `worker` labels. | Label policy is currently local but wrong. | Centralize subject label formatting in renderer/projection. |
| `AgentWorkTraceProjectionService` | Reuses archive files by source fingerprint only. | Rendered label changes can leave stale archive markdown. | Include render subject fingerprint in reuse/manifest/summary. |
| Built-in self-evolver files | Static guidance says `target worker`, `future workers`, `worker messages`. | Companion evidence model would remain terminologically inconsistent after renderer change. | Update evidence-actor wording to agent. |
| Relevant docs | Shared/self-evolution docs say work traces include worker messages. | Durable docs would be stale. | Update docs. |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-work-traces/domain/work-traces.ts` | Shared work trace target/context/source/file/manifest/package types | Context lacks `agentName`; file manifest lacks render fingerprint. | Add display-name input and render-context metadata. |
| `autobyteus-server-ts/src/agent-work-traces/services/agent-work-trace-projection-service.ts` | Shared projection orchestration and archive reuse | Renders without target identity; cache reuse checks source fingerprint only. | Compute normalized subject/render fingerprint; pass to renderer/store; use in reuse and summary hash. |
| `autobyteus-server-ts/src/agent-work-traces/services/agent-work-trace-renderer.ts` | Markdown rendering and redaction | Hardcodes worker labels. | Render labels from provided subject label; use `tool call`. |
| `autobyteus-server-ts/src/agent-work-traces/services/agent-work-trace-store.ts` | Work trace path/file/manifest writer | Correct shared path; manifest schema currently source-only. | Preserve path; extend manifest/file metadata for render fingerprint. |
| `autobyteus-server-ts/src/agent-work-traces/services/agent-work-trace-source-reader.ts` | Raw trace source discovery/fingerprinting | Properly uses raw trace service and should stay display-label agnostic. | No label policy here. |
| `autobyteus-server-ts/src/self-evolution/services/self-evolution-target-context-resolver.ts` | Resolves target agent definition/name, memory/workspace/runtime context | Provides `agentName` for standalone and team member targets. | No new lookup owner needed. |
| `autobyteus-server-ts/src/self-evolution/services/self-evolution-service.ts` | Self-evolution orchestration consumer | Passes full target context to shared projection. | Remains consumer; no projection ownership. |
| `autobyteus-server-ts/src/self-evolution/services/companion/self-evolution-companion-trigger-message-builder.ts` | Builds path-only companion task packet | Says target worker. | Change wording to target agent only; preserve packet shape. |
| `autobyteus-server-ts/src/built-in-agents/templates/skill-evolver/agent.md` | Built-in Skill Self-Evolver system/static instruction | Uses target-worker wording. | Update to target-agent wording. |
| `autobyteus-server-ts/src/built-in-agents/templates/skill-evolver/skills/retrospective-skill-coach/` | Private coaching skill and references | Uses worker/future worker terminology for evidence actor. | Update to target agent/future agents/agent messages. |
| `autobyteus-server-ts/tests/agent-work-traces/agent-work-trace-projection-service.test.ts` | Projection durable coverage | Current tests assert worker labels. | Update and expand coverage. |
| `autobyteus-server-ts/docs/modules/agent_work_traces.md` | Shared projection docs | Rendered content says worker messages. | Update rendered-content wording. |
| `autobyteus-server-ts/docs/modules/self_evolution.md` | Self-evolution module docs | Rendered content says worker messages. | Update rendered-content wording. |

## Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-07-08 | Static probe | `sed -n '1,260p' autobyteus-server-ts/src/agent-work-traces/services/agent-work-trace-renderer.ts` | Shared renderer hardcodes worker labels. | Direct code owner identified. |
| 2026-07-08 | Static probe | `sed -n '1,320p' autobyteus-server-ts/tests/agent-work-traces/agent-work-trace-projection-service.test.ts` | Tests use `raw_traces_active.jsonl`, shared layout, and worker expectations. | Tests can be directly updated for new behavior and cache scenarios. |
| 2026-07-08 | Static probe | `rg -n "target worker|worker messages|worker reasoning|worker tool|\\] worker|worker:" ...` | Active relevant worker terms are in renderer, tests, docs, and self-evolver guidance. | Avoid broad unrelated worker renames. |

## External / Public Source Findings

- Public API / spec / issue / upstream source: Not used.
- Version / tag / commit / freshness: N/A.
- Relevant contract, behavior, or constraint learned: N/A.
- Why it matters: N/A.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: No live services required for design investigation; existing unit tests provide raw trace fixture shape.
- Required config, feature flags, env vars, or accounts: None for design investigation.
- External repos, samples, or artifacts cloned/downloaded for investigation: None.
- Setup commands that materially affected the investigation: Dedicated git worktree creation; 2026-07-08 `git fetch` plus `git merge --ff-only origin/personal`.
- Cleanup notes for temporary investigation-only setup: None.

## Findings From Code / Docs / Data / Logs

- Current generated work trace path is `<memoryDir>/work_traces/`, not the older self-evolution path.
- Current active raw trace fixture/name is `raw_traces_active.jsonl`.
- `AgentWorkTraceRenderer` output examples today:
  - `[timestamp] user:`
  - `[timestamp] worker:`
  - `[timestamp] worker reasoning:`
  - `[timestamp] worker tool:`
  - `[timestamp] worker:` for compaction boundary message
- Target output should become:
  - `[timestamp] user:`
  - `[timestamp] Implementation Engineer:`
  - `[timestamp] Implementation Engineer reasoning:`
  - `[timestamp] Implementation Engineer tool call:`
  - `[timestamp] Implementation Engineer:` for compaction boundary message
- Existing archive reuse must be revised because rendered content now depends on `agentName` in addition to raw trace records.
- Self-evolution prompt/static skill wording should align with target-agent evidence terminology. It should not rename actual implementation workers elsewhere.

## Constraints / Dependencies / Compatibility Facts

- Shared work-trace projection extraction on latest `origin/personal` must be preserved.
- No backward-compatible worker-label rendering mode should be added.
- Raw trace JSONL remains authoritative; work traces are derived and can be regenerated.
- Path-only self-evolution companion packet is an intentional boundary and should remain.
- Static self-evolver guidance lives in product-managed built-in agent templates and should be updated there so startup sync installs natural terminology.

## Open Unknowns / Risks

- Future consumers of `agent-work-traces` will need to supply `agentName`; current direct repository consumers are self-evolution and tests.
- Manifest schema extension for render fingerprint should be handled cleanly because existing generated manifests are derived caches, not canonical data.
- Some `worker` wording remains correct for actual runtime/background/application worker concepts; implementation must distinguish terminology by subject.

## Notes For Architect Reviewer

- Updated primary owner is `agent-work-traces`, not `self-evolution`.
- The design must obey the shared projection boundary: self-evolution resolves target context; agent-work-traces owns rendering/cache policy; raw trace and run-history remain display-label agnostic.
- Pay special attention to archive cache invalidation because changing labels without render fingerprinting would pass most active-trace tests but leave stale archive markdown.
