# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Refined

## Goal / Problem Statement

Generated work trace Markdown currently uses the configured target agent name as the assistant-side body speaker label (for example `Implementation Engineer:`). That conflates two different concepts:

- target identity/persona metadata: which agent/run produced the trace;
- conversational role semantics: `user`, `assistant`, and tool/projection events.

For LLM-readable retrospective evidence, the trace body should use stable role-oriented labels. Agent names may still exist as target metadata when useful, but they must not be the body speaker label for assistant-authored trace content.

## Investigation Findings

- The shared server-side work-trace projection capability lives under `autobyteus-server-ts/src/agent-work-traces` and is the authoritative owner for this behavior.
- `AgentWorkTraceProjectionService.ensureCurrent(context)` currently calls `buildAgentWorkTraceRenderContext(context.agentName)`.
- `buildAgentWorkTraceRenderContext()` normalizes `agentName` into `renderContext.subjectLabel` and includes that subject label in the render fingerprint.
- `AgentWorkTraceRenderer` uses `renderContext.subjectLabel` for assistant messages, reasoning records, tool call section prefixes, and provider compaction notes. User messages already render as `user:`. The separate reasoning record path is now also considered too noisy/sensitive for the default readable work trace body, especially because some LLMs produce very large reasoning-token payloads.
- Existing projection tests explicitly assert target-agent labels such as `Implementation Engineer:` and `Implementation Engineer tool call:`.
- Search found downstream skill-improvement consumers pass work-trace file paths/manifest metadata to the improver agent; no source consumer appears to parse body labels as target identity. Existing consumer tests use `renderContext.subjectLabel` only as stub fixture data.
- Existing archive caching compares source fingerprint plus render-context fingerprint, but that exists only to support generated-file cache reuse across renderer semantics. Work traces are generated Markdown artifacts read by LLM agents, not a stable external format and not user-facing production data. Requirements now reject backward compatibility, migration, or special handling for already-generated old work traces; only the clean current generation path matters.
- Local focused test execution is currently blocked in the new worktree because dependencies are not installed (`vitest` command not found; no `node_modules`).
- The built-in Skill Improvement / Retrospective Skill Improver guidance also needs wording updates: `retrospective-skill-coach/SKILL.md` originally said to inspect `agent messages` and `reasoning summaries`, which conflicts with the new readable work-trace contract where body entries are `user`, `assistant`, `tool`, and neutral trace events, and separate reasoning records are omitted.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Behavior Change / Cleanup
- Initial design issue signal (`Yes`/`No`/`Unclear`): Yes
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue / Shared Structure Looseness
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Likely Needed, localized to work-trace render context/renderer naming and tests
- Evidence basis: `renderContext.subjectLabel` currently derives from `agentName` and is used as the assistant/tool/compaction body prefix, so the renderer confuses target identity with trace-event role labels.
- Requirement or scope impact: Requirements must require stable role labels in the trace body, omit separate reasoning trace records from the default body, and preserve target identity through manifest/package metadata or existing run IDs, not per-message speaker labels.

## Recommendations

- Render trace body speaker labels with canonical lower-case role/event labels matching the user's LLM-training example: `user`, `assistant`, `tool`, and neutral trace-event labels when needed.
- Remove the configured agent name from assistant/tool/compaction body prefixes, and omit separate reasoning trace records from the default readable body rather than relabeling them.
- Keep target/run identity and target display name in the package/manifest metadata, distinct from the readable Markdown body and distinct from body speaker labels.
- Remove render-version/render-fingerprint metadata from the package/manifest rather than carrying compatibility/cache markers forward; old generated work traces are non-contract derived artifacts and do not need migration or compatibility support.
- Update server docs and built-in Skill Improvement / Retrospective Skill Improver guidance where they claim target-agent names are used as Markdown subject labels, mention target-agent body messages, or tell the improver agent to inspect reasoning summaries.

## Scope Classification (`Small`/`Medium`/`Large`)

Small

## In-Scope Use Cases

- UC-001: A generated work trace for a named target agent renders user messages as `user:` and assistant messages as `assistant:` in the body.
- UC-002: A generated work trace for a blank, missing, or otherwise non-meaningful target display name remains well-formed and still renders assistant-originated content as `assistant:`.
- UC-003: Tool-related entries remain visibly tool-specific and do not use the target agent name as their section prefix.
- UC-004: Existing skill-improvement flows can still identify the target run/member through package metadata, manifest paths, and target IDs without relying on body speaker labels.
- UC-005: New work-trace generation uses only the clean current renderer/manifest shape and carries no legacy renderer compatibility or old generated-cache migration behavior.
- UC-006: An improver agent or LLM reader can consume the Markdown body as conversation/event evidence without source bookkeeping clutter.
- UC-007: An improver agent or LLM reader is not exposed to separate internal/provider reasoning traces by default; observable user/assistant messages, tool calls/results, and neutral trace events remain the evidence.
- UC-008: The skill-improvement / Retrospective Skill Improver instructions describe the new work-trace evidence shape accurately, so the improver agent does not expect agent-name speakers or reasoning summaries.

## Out of Scope

- Changing raw trace storage semantics or provider-native message roles.
- Changing runtime chat UI labels unless they directly consume the work-trace Markdown projection.
- Changing agent/persona naming elsewhere in the product.
- Adding new memory compaction or training-data export features.
- Preserving a compatibility mode that can keep rendering agent-name speaker labels.


## Generated Artifact / No Compatibility Rule

Work trace Markdown files are generated artifacts for LLM/agent reading. They are not a stable user-facing file format and are not parsed by product code as a compatibility contract.

Therefore implementation MUST optimize for clean current code only:

- Do not migrate already-generated work trace Markdown files.
- Do not preserve old renderer versions, render fingerprints, or subject-label compatibility metadata.
- Do not add fallback reads for old manifest shapes.
- Do not support dual body formats.
- Do not write tests whose purpose is to prove old generated work traces continue to load or render the same way.
- It is acceptable for old generated files to remain on disk until naturally overwritten, deleted by cleanup, or ignored.

## Functional Requirements

- REQ-001: Work trace body rendering MUST use stable conversational role labels for conversational turns: `user` for user-originated content and `assistant` for assistant-originated content.
- REQ-002: Work trace body rendering MUST NOT use the configured agent name/display name as a body speaker or section prefix for assistant messages, tool entries, or provider/projection notes.
- REQ-003: Tool-related work trace entries MUST render under a canonical `tool` section label, keep tool name/status/arguments/results/errors distinguishable, and MUST NOT be mislabeled as ordinary assistant text or prefixed with the target agent name.
- REQ-004: Provider/projection notes such as compaction-boundary records MUST render under a neutral trace-event label/section shape such as `trace_event`, and MUST NOT be attributed to the target agent name or to ordinary assistant text.
- REQ-005: The work trace package/manifest MUST expose sufficient target identity metadata for downstream self-evolution consumers, including target kind, target run/member identifiers, and the resolved target agent display name when available. This metadata MUST NOT be rendered as body speaker labels.
- REQ-006: Blank, missing, or whitespace-only display names MUST NOT affect body speaker labels; assistant-originated entries still render with the canonical `assistant` label.
- REQ-007: Implementation MUST NOT add or preserve backward-compatibility, migration, fallback, dual-rendering, or cache-upgrade logic for older generated work-trace Markdown/manifest formats. Already-generated work traces are non-contract derived artifacts; the code only needs to produce the clean current format going forward.
- REQ-008: The readable Markdown body MUST omit low-value projection bookkeeping fields such as source kind, source display name, raw-trace wording, record count, and first/last timestamp; those facts belong in the manifest/package metadata, not the LLM-readable trace body.
- REQ-009: Separate assistant reasoning/internal reasoning trace records MUST be omitted from the default readable Markdown body. If an assistant explicitly writes a plan or rationale as ordinary assistant message content, that visible assistant message remains in scope as `assistant:` content.
- REQ-010: Omitted reasoning trace text MUST NOT be included in the work-trace evidence summary hash, improver-facing prompt content, or any improver-visible evidence identity. Changes that affect only omitted reasoning text MUST NOT cause a different improver-visible evidence package summary hash.
- REQ-011: Durable tests and docs MUST be updated to describe canonical role labels, omitted reasoning records, reasoning-token bloat avoidance, and minimal readable trace bodies instead of target-agent body subject labels and bookkeeping-heavy headers.
- REQ-012: Built-in skill-improvement / Retrospective Skill Improver guidance MUST be rephrased to align with the new trace contract: use `visible user messages`, `visible assistant messages`, `tool calls/results/errors`, `neutral trace events`, and `feedback/corrections`; do not instruct the improver agent to inspect `agent messages`, `target-agent messages` as body speakers, `reasoning summaries`, or raw/internal reasoning records.
- REQ-013: Any in-scope wording touched for the improver agent or docs SHOULD standardize on `Skill Improvement` for the capability and `Retrospective Skill Improver` / `improver agent` for the worker. Avoid `companion agent` in user/agent-facing wording because it is vague. The wording MUST make clear that a separate improver agent reads the target run's work trace and edits configured durable skill packages; the target agent is not literally improving itself during the run. The built-in skill package identifier, folder, and `SKILL.md` frontmatter name MUST be renamed from `retrospective-skill-coach` to `retrospective-skill-improver`, with template config, bootstrap tests, and docs updated accordingly. The built-in agent template folder MUST be renamed from `skill-evolver` to `retrospective-skill-improver` so the filesystem owner matches the agent/package purpose. A full source/module/API rename from `self-evolution` to `skill-improvement`, including public persisted/runtime definition identifiers such as `autobyteus-skill-evolver`, remains a separate naming-refactor decision unless explicitly approved for this ticket.
- REQ-014: Built-in Retrospective Skill Improver agent/skill wording MUST be concise and action-oriented. It SHOULD express the editable-root write scope positively and avoid broad, repeated negative guardrail lists when the task packet already defines the scope. Necessary safety boundaries may remain, but they should be framed as the active scope of work rather than unrelated prohibitions.


## Required Markdown Body Shape

Implementation MUST follow this concrete readable Markdown shape so source bookkeeping and target identity do not leak into conversational labels.

### Title / Header

- The first line MUST be exactly:

```md
# Work Trace
```

- The title MUST NOT include source-display, storage, or raw-trace wording. Forbidden examples:
  - `# Agent Work Trace: active raw traces`
  - `# Agent Work Trace: active raw work traces`
  - `# Work Trace: archive 000001`
  - `# Raw Trace`
- The body header MUST NOT include these projection bookkeeping lines:
  - `Source: ...`
  - `Records: ...`
  - `First timestamp: ...`
  - `Last timestamp: ...`
- Source kind, source display name, record count, first/last timestamps, file path, and target/run identity MUST remain available through manifest/package metadata rather than as body header clutter.


### Metadata Location

Readable Markdown body content and metadata have separate responsibilities:

- The Markdown body is for evidence replay only: visible user messages, visible assistant messages, tool evidence, and neutral trace events.
- Target identity and projection bookkeeping belong in `work_traces_manifest.json` / returned `AgentWorkTracePackage`, not in body speaker labels and not in noisy body headers.

The manifest/package semantic metadata MUST include or preserve these facts:

```json
{
  "target": {
    "kind": "agent_run",
    "runId": "target-run-1"
  },
  "targetDisplayName": "Implementation Engineer",
  "files": [
    {
      "sourceKind": "active",
      "recordCount": 5,
      "firstTimestamp": "...",
      "lastTimestamp": "...",
      "filePath": ".../work_trace_active.md"
    }
  ]
}
```

The manifest/package MUST NOT include renderer-version, render-fingerprint, `renderContext.subjectLabel`, or other render-compatibility fields whose only purpose is preserving old generated-cache semantics. Work traces are regenerable Markdown artifacts read by agents; older generated files are not a compatibility contract.

For a team member target, the target metadata MUST preserve the compound identity, for example:

```json
{
  "target": {
    "kind": "team_member_run",
    "teamRunId": "team-run-1",
    "memberRunId": "member-run-1"
  },
  "targetDisplayName": "Implementation Engineer"
}
```

`targetDisplayName` is metadata only. It MUST NOT appear as a body speaker prefix such as `Implementation Engineer:`.

### Forbidden Manifest/Package Metadata

The manifest/package MUST NOT retain these old render-cache or speaker-label fields:

```json
{
  "renderContext": {
    "subjectLabel": "Implementation Engineer",
    "rendererVersion": "agent-work-trace-renderer-v2",
    "fingerprint": "..."
  }
}
```

Implementation MUST NOT add compatibility branches to read, migrate, upgrade, or preserve old generated work-trace manifests. If old generated files happen to exist, they are outside the compatibility contract and may be ignored, overwritten by normal current generation, or left untouched when not in the current generation path.

### Conversational Entries

- User message entry format MUST be:

```md
[<ISO timestamp>] user:
<redacted user content>
```

- Assistant message entry format MUST be:

```md
[<ISO timestamp>] assistant:
<redacted assistant content>
```

- Separate reasoning trace records MUST NOT be rendered in the default body. Do not emit an `assistant reasoning:` section for provider/internal reasoning, even when the reasoning text is large.

- Tool entry format MUST be:

```md
[<ISO timestamp>] tool:
name: <tool name>
status: <status>
arguments:
  <redacted formatted arguments>
result:
  <redacted formatted result>
```

  `arguments:`, `result:`, and `error:` sections are included only when present, but the top-level label remains `tool:`.

- Provider/projection event entry format MUST be neutral, for example:

```md
[<ISO timestamp>] trace_event:
Provider context compaction boundary recorded
```

### Forbidden Body Shapes

Generated readable Markdown MUST NOT contain these old/noisy shapes:

```md
[<ISO timestamp>] Implementation Engineer:
...

[<ISO timestamp>] Implementation Engineer reasoning:
...

[<ISO timestamp>] assistant reasoning:
...

[<ISO timestamp>] Implementation Engineer tool call:
...

Source: active
Records: 5
# Agent Work Trace: active raw traces
```


### Skill Improvement / Improver Agent Wording Requirements

The built-in Skill Improvement / Retrospective Skill Improver guidance must match the work-trace body semantics.

Rephrase misleading wording in the Retrospective Skill Improver template files, whose final target paths are:

- `autobyteus-server-ts/src/built-in-agents/templates/retrospective-skill-improver/agent.md`
- `autobyteus-server-ts/src/built-in-agents/templates/retrospective-skill-improver/agent-config.json`
- `autobyteus-server-ts/src/built-in-agents/templates/retrospective-skill-improver/skills/retrospective-skill-improver/SKILL.md`
- related `retrospective-skill-improver/skills/retrospective-skill-improver/references/*.md` only if they imply agent-name body labels or reasoning-summary evidence
- docs that describe self-evolution/work-trace consumption, especially `docs/modules/agent_work_traces.md` and `docs/modules/self_evolution.md`

Required wording direction:

- Prefer `Skill Improvement` for the capability and `Retrospective Skill Improver` / `improver agent` for the worker in touched user/agent-facing wording.
- Prefer `target run's work trace evidence` or `work trace evidence for the target agent/run` over wording that implies body speaker labels are target-agent names.
- State the actor relationship plainly: a separate improver agent reads the target run's work trace and edits configured durable skill packages.
- In evidence lists, use `visible user messages`, `visible assistant messages`, `tool calls`, `tool results/errors`, `neutral trace events`, `retries`, `corrections`, and `feedback signals`.
- Remove `reasoning summaries` from improver evidence wording because separate reasoning records are intentionally omitted from readable work traces.
- Make clear that target identity comes from the task packet/manifest metadata, not from Markdown body speaker labels.
- Prefer positive, action-oriented wording. Express scope as the listed editable skill roots being the write scope; avoid repeated `Do not ...` lists or hypothetical prohibitions that distract from the improver's actual task.
- Use `retrospective-skill-improver` as the built-in skill package id and folder because the package actively improves durable skill files; `coach` is too advisory for this worker.
- Rename the built-in agent template folder from `autobyteus-server-ts/src/built-in-agents/templates/skill-evolver/` to `autobyteus-server-ts/src/built-in-agents/templates/retrospective-skill-improver/`. This is a template filesystem cleanup, not a full `self-evolution` runtime/source/API rename.

## Acceptance Criteria

- AC-001: Given raw trace records containing user and assistant messages for a target with `agentName = "Implementation Engineer"`, the generated Markdown body contains `user:\n...` for user content and `assistant:\n...` for assistant content, and does not contain `Implementation Engineer:` as a body speaker label.
- AC-002: Given separate assistant reasoning trace records for a named target, the generated Markdown body omits those reasoning records and does not contain `assistant reasoning:` or `<agent name> reasoning:`.
- AC-003: Given raw trace records with tool calls/results for a named target, generated tool sections use `[timestamp] tool:` as the top-level label, include tool name/status/arguments/results/errors as applicable, and do not contain `<agent name> tool call:`.
- AC-004: Given provider compaction boundary records for a named target, generated provider/projection notes use a neutral label such as `[timestamp] trace_event:` and do not use the target agent name or `assistant:` as the prefix.
- AC-005: Given a blank or whitespace-only display name where the projection context permits it, generated assistant message entries still use the canonical `assistant:` label and do not fall back to `Agent:`.
- AC-006: New package/manifest output produced by the current generator does not contain `renderContext`, `subjectLabel`, `rendererVersion`, `fingerprint`, or legacy renderer compatibility fields, and implementation review finds no migration/fallback/dual-rendering logic for older generated work-trace artifacts.
- AC-007: Existing skill-improvement trigger messages still list work trace manifest/root/file paths and target run IDs, and do not require parsing body speaker labels to identify the target.
- AC-007A: The returned package/manifest metadata preserves the target identity (`agent_run.runId` or `team_member_run.teamRunId` + `memberRunId`) and the resolved target display name when available, while the Markdown body does not use that display name as a speaker label.
- AC-008: Generated Markdown work trace bodies start with exactly `# Work Trace`, do not include `Source:`, `Records:`, `First timestamp:`, or `Last timestamp:` header lines, and do not include source-display/raw-trace title text such as `active raw traces`; those values remain available through manifest/file metadata.
- AC-009: Given an ordinary assistant message whose content includes a visible plan/rationale written by the assistant, that content still renders as normal `assistant:` message content; only separate reasoning trace records are omitted.
- AC-010: Given two otherwise identical raw trace sources that differ only in separate reasoning trace text, the generated Markdown body and improver-visible `summaryHash` are unchanged.
- AC-011: Given a raw trace source with a very large separate reasoning trace record, the generated Markdown body does not contain that reasoning text and remains bounded to rendered user/assistant/tool/trace-event evidence.
- AC-012: Focused agent-work-trace projection tests cover named-agent, blank-name, tool, omitted separate reasoning records, visible assistant rationale content, reasoning-only summary-hash stability, large-reasoning omission, compaction, minimal-header, clean manifest metadata, and absence of legacy compatibility behavior.
- AC-013: Built-in Skill Improvement / Retrospective Skill Improver guidance no longer asks the improver agent to inspect `agent messages` or `reasoning summaries`; it describes evidence as visible user/assistant messages, tool calls/results/errors, neutral trace events, retries/corrections, and feedback signals, with target identity supplied by metadata/task packet.
- AC-014: Touched improver/docs wording does not imply that the target agent literally edits or improves itself and does not use vague `companion agent` naming; it describes a Retrospective Skill Improver / improver agent using target work-trace evidence to improve configured durable skill packages.
- AC-015: The pre-applied skill template wording and package-rename updates listed in this requirements document are either preserved by implementation or deliberately superseded with an equal-or-better wording that still satisfies REQ-012 and REQ-013.
- AC-016: The built-in Retrospective Skill Improver template uses `retrospective-skill-improver` consistently in the template folder name, skill package folder, `SKILL.md` frontmatter `name`, agent config skill list, bootstrap tests, and docs; no in-scope template/config/docs/test reference still uses `skill-evolver` for the template folder or `retrospective-skill-coach` for the skill package.
- AC-017: The Retrospective Skill Improver `agent.md`, `SKILL.md`, and bundled reference files use concise, task-relevant, action-oriented wording; repeated broad `Do not ...` guardrail lists and `Bad update`-style negative examples are removed or rephrased into positive scope, durable-update, or context-only guidance.


## Pre-Applied Skill Template Text Updates

Per user direction, the following text-only skill template updates were applied during requirements/design preparation so later implementation can treat them as an explicit baseline rather than rediscovering wording choices:

| File | Pre-applied wording update | Implementation follow-up |
| --- | --- | --- |
| `autobyteus-server-ts/src/built-in-agents/templates/retrospective-skill-improver/agent.md` | Renamed displayed agent guidance from `Skill Self-Evolver` to `Retrospective Skill Improver`; changed description/category/role wording to `Skill Improvement`; clarified metadata/body-label separation; replaced repeated negative edit restrictions with positive write-scope wording focused on listed editable skill roots. | Align any registry/bootstrap/test display-name strings that still say `Skill Self-Evolver`, unless a broader rename is deferred explicitly. |
| `autobyteus-server-ts/src/built-in-agents/templates/retrospective-skill-improver/skills/retrospective-skill-improver/SKILL.md` | Renamed the built-in skill package id/folder/frontmatter from `retrospective-skill-coach` to `retrospective-skill-improver`; changed the human title to `Retrospective Skill Improver`; replaced old evidence wording with visible user/assistant/tool/trace-event evidence and reasoning omission; simplified negative guidance into action-oriented workflow, durable-improvement checks, and package-scope responsibilities. | Align `agent-config.json`, bootstrap tests, docs, and any package-id references to the new id. |
| `autobyteus-server-ts/src/built-in-agents/templates/retrospective-skill-improver/skills/retrospective-skill-improver/references/high-signal-trace-patterns.md` | Rephrased examples from `target agent` actor language to `target run/agent` / `target run`; changed weak/negative-signal wording to context-only signal guidance; kept internal reasoning out of durable guidance. | Preserve this wording unless implementation finds a clearer equivalent. |
| `autobyteus-server-ts/src/built-in-agents/templates/retrospective-skill-improver/skills/retrospective-skill-improver/references/examples.md` | Renamed heading to `Retrospective Skill Improvement Examples`; rephrased trace signals around target-run behavior; replaced `Good update`/`Bad update` pairs with `Durable update`, context-only, and no-change outcome wording. | Preserve this wording unless implementation finds a clearer equivalent. |
| `autobyteus-server-ts/src/built-in-agents/templates/retrospective-skill-improver/skills/retrospective-skill-improver/references/package-improvement-playbook.md` | Simplified package-shape guidance and replaced negative `avoid two extremes` wording with positive balanced-package guidance. | Preserve this wording unless implementation finds a clearer equivalent. |
| Template folder rename requirement | The built-in agent template folder should be renamed from `autobyteus-server-ts/src/built-in-agents/templates/skill-evolver/` to `autobyteus-server-ts/src/built-in-agents/templates/retrospective-skill-improver/`; update `templateDirName`, bootstrap tests, docs, and path references accordingly. | Do not treat this as approval for a broad `self-evolution` source/module/API rename or persisted definition-id migration. |

These edits are not a complete implementation of the ticket. They intentionally do not rename source modules, API fields, or persisted/runtime definition identifiers. They do intentionally rename the built-in agent template folder from `skill-evolver` to `retrospective-skill-improver` and the built-in skill package identifier/folder from `retrospective-skill-coach` to `retrospective-skill-improver`; implementation must finish aligning `templateDirName`, tests, docs, and references.

## Constraints / Dependencies

- Preserve existing work trace file layout under `<memoryDir>/work_traces/` unless implementation discovers a hard incompatibility.
- Preserve redaction behavior for backend/protocol noise and sensitive content.
- Preserve the projection service as the public boundary; consumers should not instantiate source reader, renderer, or store directly.
- Avoid backward-compatibility wrappers, dual rendering modes, or fallback branches for old agent-name body labels.
- Work-trace files are derived from raw traces; already-generated work trace files are non-contract artifacts and do not require migration or compatibility handling.

## Assumptions

- The relevant implementation is the server-side shared `agent-work-traces` capability.
- Current consumers need target identity as metadata/paths/run IDs, not as every assistant turn speaker label.
- Lower-case labels (`user`, `assistant`) are preferred because the user's example framed the content as LLM-training-style role data. If product style requires title-case, that should be clarified before implementation.

## Risks / Open Questions

- How to cleanly remove the manifest/package `renderContext.subjectLabel`, `rendererVersion`, and `fingerprint` fields while preserving the still-useful semantic metadata (`target`, `targetDisplayName`, and `files`) without adding migration or compatibility code for old generated artifacts.
- Whether the projection context should keep `agentName`, rename it to optional target display metadata, or remove it from the projection boundary; design should choose the cleanest local API based on current callers.
- Local dependency installation is missing in the new worktree, so implementation validation will need dependency setup or an available shared install strategy.
- A full code/module/API rename from `self-evolution` to `skill-improvement` may be desirable but is broader than this work-trace rendering/guidance ticket unless explicitly approved; this ticket should avoid misleading wording and avoid `companion agent` in touched user/agent-facing text. The narrower built-in agent template folder rename and built-in skill package rename to `retrospective-skill-improver` are now in scope.

## Requirement-To-Use-Case Coverage

| Requirement | Use Cases |
| --- | --- |
| REQ-001 | UC-001, UC-002 |
| REQ-002 | UC-001, UC-002, UC-003, UC-005 |
| REQ-003 | UC-003 |
| REQ-004 | UC-005 |
| REQ-005 | UC-004 |
| REQ-006 | UC-002 |
| REQ-007 | UC-005 |
| REQ-008 | UC-006 |
| REQ-009 | UC-006, UC-007 |
| REQ-010 | UC-007 |
| REQ-011 | UC-001, UC-002, UC-003, UC-005, UC-006, UC-007 |
| REQ-012 | UC-008 |
| REQ-013 | UC-008 |
| REQ-014 | UC-008 |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criterion | Scenario Intent |
| --- | --- |
| AC-001 | Named agent no longer appears as assistant speaker in work trace body. |
| AC-002 | Separate reasoning traces are not included in the default readable work trace. |
| AC-003 | Tool entries remain separate and lose agent-name prefixes. |
| AC-004 | Provider/projection notes are not falsely attributed to the agent persona. |
| AC-005 | Missing/blank names do not affect canonical assistant role labeling. |
| AC-006 | Current generator output is clean and no legacy generated-artifact compatibility logic remains. |
| AC-007 | Downstream Skill Improvement can still identify target work traces. |
| AC-007A | Target identity/display-name metadata lives in manifest/package metadata, not body labels. |
| AC-008 | Low-value source bookkeeping stays in metadata instead of cluttering readable trace content. |
| AC-009 | Visible assistant-authored rationale remains available when it is ordinary assistant message content, while separate reasoning records are omitted. |
| AC-010 | Reasoning-only text changes do not create new improver-visible evidence. |
| AC-011 | Very large reasoning traces do not bloat the readable Markdown body. |
| AC-012 | Durable coverage prevents regression to agent-name body labels, reasoning leakage, reasoning-token bloat, or bookkeeping-heavy headers. |
| AC-013 | Improver guidance is aligned with the new visible work-trace evidence shape. |
| AC-014 | Improver/docs naming reflects Skill Improvement by a Retrospective Skill Improver, not vague companion behavior or literal target self-evolution. |
| AC-015 | Pre-applied skill-template/package-rename baseline remains visible and is preserved or intentionally superseded. |
| AC-016 | Built-in template folder and skill package id use `retrospective-skill-improver` consistently. |
| AC-017 | Improver guidance avoids irrelevant negative phrasing and stays focused on the active skill-improvement task. |

## Approval Status

Approved by user on 2026-07-09 after iterative clarification of role labels, metadata/body separation, omitted reasoning tokens, generated-artifact/no-compatibility posture, Skill Improvement / Retrospective Skill Improver wording, the narrow template/package rename to `retrospective-skill-improver`, and concise action-oriented improver guidance that avoids irrelevant negative phrasing.
