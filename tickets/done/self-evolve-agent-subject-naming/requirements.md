# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Refined

## Goal / Problem Statement

Agent Work Trace Projection currently transforms canonical raw trace files into readable Markdown work trace files, but generated agent-authored entries still use the generic subject `worker`:

```text
worker:
worker reasoning:
worker tool:
```

The work trace is now a shared `agent-work-traces` capability and is read by the self-evolution companion as retrospective evidence. The subject label should therefore identify the target agent naturally by display name, not by the internal worker abstraction. Tool sections should also read naturally as tool-call blocks.

Target generated style:

```text
Implementation Engineer:
Implementation Engineer reasoning:
Implementation Engineer tool call:
```

This ticket must also update adjacent self-evolution companion task/static guidance that still says `target worker`, `worker messages`, or `future workers` where it describes the same target-agent evidence model. Low-level runtime/application worker terminology remains out of scope when it names actual worker loops/processes.

## Investigation Findings

- `origin/personal` changed after the initial investigation. The ticket branch was fast-forwarded from `06e0985b` to `be426023` on 2026-07-08 before reinvestigation.
- The previous self-evolution-owned work trace implementation has been extracted to `autobyteus-server-ts/src/agent-work-traces/`.
- Current projection boundary is `AgentWorkTraceProjectionService.ensureCurrent(context)` with `AgentWorkTraceProjectionContext` currently containing only `target` and `memoryDir`.
- `SelfEvolutionTargetContextResolver` still resolves `agentName` from the target `AgentDefinition.name` for both standalone agent runs and selected team-member runs.
- `SelfEvolutionService` passes `SelfEvolutionTargetContext` into `AgentWorkTraceProjectionService.ensureCurrent(context)`, so adding `agentName` to the shared projection context is structurally compatible with the existing self-evolution call path.
- `AgentWorkTraceRenderer` currently hardcodes `worker` for assistant messages, reasoning, tools, and compaction events.
- `AgentWorkTraceProjectionService` reuses unchanged archive-segment work trace files based only on raw source fingerprint. If rendered labels depend on agent name, reuse must also consider a render/subject fingerprint to avoid stale archived work trace files after agent display-name changes.
- Current durable projection coverage lives at `autobyteus-server-ts/tests/agent-work-traces/agent-work-trace-projection-service.test.ts` and still asserts `worker:\n...`.
- Documentation now includes `autobyteus-server-ts/docs/modules/agent_work_traces.md`; both that file and `docs/modules/self_evolution.md` describe rendered content as `worker messages`.
- The built-in Skill Self-Evolver instruction and private `retrospective-skill-coach` skill still use `target worker`, `worker messages`, and `future workers` terminology for the same evidence subject.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Behavior Change with small shared-boundary refactor and wording cleanup
- Initial design issue signal (`Yes`/`No`/`Unclear`): Yes
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Likely Needed, small and local
- Evidence basis: The shared work-trace renderer owns visible labels but lacks target agent display identity. The self-evolution context already owns agent display identity, and self-evolution currently passes that context into projection. Archive reuse also needs render-context awareness once labels depend on agent identity.
- Requirement or scope impact: Add target agent display-name input to the shared projection context; centralize subject-label normalization in the renderer/projection owner; update cache reuse, tests, docs, and self-evolver guidance that describe target-agent evidence.

## Recommendations

- Use the target agent display name only; do not append an extra `agent` suffix.
- Preserve configured display casing while trimming and collapsing whitespace.
- Render tool sections as `<Agent Name> tool call:` rather than `<Agent Name> tool:`.
- Keep `user:` unchanged.
- Keep runtime/internal `worker` terminology where it names a real worker loop/process/background worker and is not a work-trace subject label.
- Update self-evolution companion task/static guidance from `target worker`/`future workers` to `target agent`/`future agents` where it describes the retrospective evidence subject.
- Make archive work-trace reuse sensitive to rendered subject label so cached archive markdown cannot retain stale `worker` or old agent labels.
- Do not introduce a compatibility setting or dual worker/agent-name render mode.

## Scope Classification (`Small`/`Medium`/`Large`)

Medium-small.

The code change is small, but current `origin/personal` moved the projection into a shared subsystem and the user explicitly asked to consider the self-evolution agent instruction/skill wording as well.

## In-Scope Use Cases

- UC-001: Project a standalone agent run's raw traces into work trace markdown where assistant-authored entries use the target agent display name.
- UC-002: Project a selected team-member run's raw traces into work trace markdown where assistant-authored entries use that member agent's display name.
- UC-003: Render tool events with a natural `<Agent Name> tool call:` heading.
- UC-004: Reuse unchanged archived work trace files only when both the raw source fingerprint and render subject context match.
- UC-005: Present self-evolution companion instructions and retrospective skill guidance using target-agent/future-agent terminology consistent with generated work traces.

## Out of Scope

- Renaming `AgentWorker` classes, event-loop internals, runtime worker lifecycle concepts, application workers, or background worker terminology.
- Changing raw trace JSONL schemas or historical replay event schemas.
- Changing work trace output paths, file names, or raw trace active filename behavior introduced on `origin/personal` (`raw_traces_active.jsonl`).
- Adding a new UI for work traces.
- Rewriting historical ticket artifacts or old validation evidence.
- Adding a compatibility mode that preserves worker-labeled generated work traces.

## Functional Requirements

- REQ-001: `AgentWorkTraceProjectionContext` must carry the target agent display name needed to render work-trace subject labels.
- REQ-002: `SelfEvolutionService` must continue passing its resolved `SelfEvolutionTargetContext` into work trace projection, with `agentName` serving as the target agent display-name source.
- REQ-003: The renderer must derive a canonical subject label from the target agent display name by trimming leading/trailing whitespace and collapsing repeated internal whitespace while preserving configured display casing.
- REQ-004: If the normalized target agent display name is empty, the renderer must use a safe fallback label (`Agent`) rather than rendering a blank subject.
- REQ-005: Assistant message entries must render as `<Agent Name>:\n...`, not `worker:\n...`.
- REQ-006: Reasoning entries must render as `<Agent Name> reasoning:\n...`, not `worker reasoning:\n...`.
- REQ-007: Tool entries must render as `<Agent Name> tool call:`, not `worker tool:` or `<Agent Name> tool:`.
- REQ-008: Compaction-boundary entries that previously rendered under `worker:` must render under `<Agent Name>:` while preserving the compaction message text.
- REQ-009: User message entries must remain `user:\n...`.
- REQ-010: Archive-segment work trace reuse must account for the rendered subject context, not only the raw source fingerprint.
- REQ-011: The projection manifest/package summary hash must reflect render-context changes when those changes alter generated work trace content.
- REQ-012: Existing work trace paths, file names, source reading, raw trace normalization, historical replay conversion, redaction, and path-only self-evolution companion message shape must remain unchanged except for carrying/rendering the target agent display name.
- REQ-013: Durable tests must cover message, reasoning, tool-call, compaction, user-label preservation, whitespace normalization, fallback label, and archive reuse invalidation for changed subject labels.
- REQ-014: `agent_work_traces.md` and `self_evolution.md` must describe generated work trace content as target-agent/agent messages rather than worker messages, while preserving real background-worker terminology where applicable.
- REQ-015: The built-in Skill Self-Evolver `agent.md`, `retrospective-skill-coach/SKILL.md`, and relevant coaching references must replace target-worker/future-worker wording with target-agent/future-agent wording where it describes the retrospective evidence actor.
- REQ-016: The self-evolution companion trigger message must use `target agent` wording rather than `target worker` in the runtime task packet.
- REQ-017: The implementation must not retain a compatibility branch or user setting for worker-labeled generated work trace content.

## Acceptance Criteria

- AC-001: Given `agentName: "Implementation Engineer"` and an assistant raw trace message, projection writes content containing `Implementation Engineer:\n<message>` and not `worker:\n<message>`.
- AC-002: Given `agentName: "Solution Designer"` and a reasoning raw trace entry, projection writes `Solution Designer reasoning:` and not `worker reasoning:`.
- AC-003: Given `agentName: "Code Reviewer"` and a tool call/result pair, projection writes `Code Reviewer tool call:` and not `worker tool:` or `Code Reviewer tool:`.
- AC-004: Given a compaction-boundary raw trace event and `agentName: "Implementation Engineer"`, projection writes `Implementation Engineer:\nProvider context compaction ...` and not `worker:\nProvider context compaction ...`.
- AC-005: Given a user raw trace message, projection still writes `user:\n<message>`.
- AC-006: Given `agentName: "  Code   Reviewer  "`, projection writes `Code Reviewer:` / `Code Reviewer tool call:` with collapsed whitespace.
- AC-007: Given an empty or whitespace-only `agentName`, projection writes `Agent:` rather than a blank subject or `worker:`.
- AC-008: Given an unchanged archived raw-trace segment first projected with `agentName: "Old Name"` and later projected with `agentName: "New Name"`, the archived work trace file is regenerated or otherwise updated so it contains `New Name` and not stale `Old Name`/`worker` labels.
- AC-009: Given an unchanged archived raw-trace segment and unchanged target subject label, projection continues reusing that archive work trace file without unnecessarily changing its `generatedAt`.
- AC-010: Projection output remains under `<memoryDir>/work_traces/` with `work_traces_manifest.json`, `work_trace_active.md`, and archive work trace file names unchanged.
- AC-011: Self-evolution companion task message remains path-only, includes the same manifest/root/file paths and metadata keys, and says `target agent` rather than `target worker`.
- AC-012: Built-in self-evolver static guidance and retrospective-skill-coach guidance use target-agent/future-agent terminology for the evidence actor; unrelated runtime/application worker docs are not broadly renamed.
- AC-013: Repository tests no longer assert generated work trace content contains `worker:`, `worker reasoning:`, or `worker tool:` for the in-scope projection behavior.

## Constraints / Dependencies

- Current authoritative worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/self-evolve-agent-subject-naming`.
- Current branch: `codex/self-evolve-agent-subject-naming`.
- Refreshed base: `origin/personal` at `be4260235f832bc7b34920079bb9f26aadc9e16b` as of 2026-07-08 after fast-forward.
- The shared projection owner is now `autobyteus-server-ts/src/agent-work-traces/`; self-evolution is a consumer.
- Existing generated work trace cache files are derived from canonical raw traces; no compatibility render mode is required.
- `SelfEvolutionTargetContext.agentName` is the resolved display-name source for self-evolution targets.

## Assumptions

- The user-approved final label shape is agent display name only, preserving casing, plus `tool call` for tool entries.
- `AgentDefinition.name` is the appropriate display-name source for the target agent in self-evolution.
- Future non-self-evolution consumers of `agent-work-traces` can supply the same target agent display name when invoking the shared projection.
- Previously generated work traces can be regenerated on demand from raw traces.

## Risks / Open Questions

- Adding `agentName` to `AgentWorkTraceProjectionContext` requires any future/direct test caller to provide a display name; current repository consumers are self-evolution and tests.
- Bumping or extending manifest metadata for render-context fingerprinting changes the derived cache manifest shape. Because work traces are derived, clean-cut regeneration is acceptable, but implementation should keep schema semantics explicit.
- `worker` remains valid in docs/code when it refers to actual runtime/background/application workers; broad search-and-replace would be harmful.

## Requirement-To-Use-Case Coverage

- UC-001: REQ-001, REQ-002, REQ-003, REQ-005, REQ-008, REQ-009, REQ-012, REQ-017
- UC-002: REQ-001, REQ-002, REQ-003, REQ-005, REQ-008, REQ-009, REQ-012, REQ-017
- UC-003: REQ-007, REQ-013
- UC-004: REQ-010, REQ-011, REQ-013
- UC-005: REQ-014, REQ-015, REQ-016

## Acceptance-Criteria-To-Scenario Intent

- AC-001 validates target agent display-name message labels.
- AC-002 validates reasoning labels.
- AC-003 validates the user-approved `tool call` wording.
- AC-004 validates compaction labels that currently also use `worker:`.
- AC-005 protects user-message labels.
- AC-006 pins whitespace normalization without lowercasing.
- AC-007 prevents blank labels.
- AC-008 prevents stale archive-cache labels after subject changes.
- AC-009 preserves archive reuse when render context is unchanged.
- AC-010 protects the shared work-trace layout introduced on latest `origin/personal`.
- AC-011 validates runtime self-evolution task-packet wording without changing path-only behavior.
- AC-012 validates static self-evolver instruction/skill wording.
- AC-013 ensures stale worker-centric tests are updated.

## Approval Status

Approved/refined by user on 2026-07-08: proceed with agent display-name labels, `tool call` wording, reinvestigate latest `origin/personal`, and include self-evolution companion instruction/skill wording in the analysis/design.
