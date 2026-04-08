# Future-State Runtime Call Stacks (Debug-Trace Style)

Use this document as a future-state (`to-be`) execution model derived from the design basis.
Prefer exact `file:function` frames, explicit branching, and clear state/persistence boundaries.
Do not treat this document as an as-is trace of current code behavior.

## Conventions

- Frame format: `path/to/file.ts:functionName(args?)`
- Boundary tags:
  - `[ENTRY]` external entrypoint (API/CLI/event)
  - `[ASYNC]` async boundary (`await`, queue handoff, callback)
  - `[STATE]` in-memory mutation
  - `[IO]` file/network/database/cache IO
  - `[FALLBACK]` non-primary branch
  - `[ERROR]` error path
- Comments: use brief inline comments with `# ...`.
- Do not include legacy/backward-compatibility branches.

## Design Basis

- Scope Classification: `Small`
- Call Stack Version: `v1`
- Requirements: `tickets/done/skill-prompt-absolute-paths/requirements.md` (status `Design-ready`)
- Source Artifact:
  - `Small`: `tickets/done/skill-prompt-absolute-paths/implementation.md` (solution sketch as lightweight design basis)
- Source Design Version: `v1`
- Referenced Sections:
  - Spine inventory sections: `implementation.md -> Solution Sketch`, `Requirement, Spine, And Design Traceability`
  - Ownership sections: `implementation.md -> Solution Sketch`, `Spine-Led Dependency And Sequencing Map`

## Use Case Index (Stable IDs)

| use_case_id | Spine ID(s) | Spine Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Governing Owner | Source Type (`Requirement`/`Design-Risk`) | Requirement ID(s) | Design-Risk Objective (if source=`Design-Risk`) | Use Case Name | Coverage Target (Primary/Fallback/Error) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| UC-001 | DS-001 | Primary End-to-End | `AvailableSkillsProcessor` | Requirement | `REQ-001`, `REQ-002`, `REQ-003`, `REQ-005` | N/A | Preloaded skill prompt output contains absolute internal paths | Yes/Yes/Yes |
| UC-005 | DS-002 | Primary End-to-End | `loadSkill` | Requirement | `REQ-001`, `REQ-002`, `REQ-003`, `REQ-004`, `REQ-005` | N/A | `load_skill` output contains the same absolute internal paths | Yes/Yes/Yes |

## Transition Notes

- Any temporary migration behavior needed to reach target state:
  - None. The formatter replaces raw-content rendering directly in the two model-visible surfaces.
- Retirement plan for temporary logic (if any):
  - N/A

## Use Case: UC-001 [Preloaded skill prompt output contains absolute internal paths]

### Spine Context

- Spine ID(s): `DS-001`
- Spine Scope: `Primary End-to-End`
- Governing Owner: `AvailableSkillsProcessor`
- Why This Use Case Matters To This Spine:
  - This is the observed failure path. The authoritative system-prompt boundary must expose internal skill links in a form the model can use directly.
- Why This Spine Span Is Long Enough:
  - The span starts at server-side agent-config assembly, passes through skill registration, reaches the prompt processor, and ends at final prompt-visible content. That is long enough to show the authoritative owner and the downstream consequence that matters.

### Goal

Render preloaded skill content so internal Markdown links already contain absolute filesystem targets when those targets resolve from the skill root.

### Preconditions

- The AutoByteus runtime has registered the configured skill path into `SkillRegistry`.
- The `Skill` object contains the correct `rootPath`.

### Expected Outcome

- The system prompt still shows `Skill Base Path`.
- Markdown link labels are unchanged.
- Resolvable relative link targets are absolute filesystem paths.
- External, anchor, already-absolute, and missing targets remain unchanged.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-server-ts/src/agent-team-execution/backends/autobyteus/autobyteus-agent-config-builder.ts:build(memberName, agentDefinitionId, memberConfig)
├── autobyteus-ts/src/agent/factory/agent-factory.ts:prepareSkills(agentId, config) [STATE] # registers path-based configured skills and normalizes config.skills to skill names
├── autobyteus-ts/src/agent/system-prompt-processor/available-skills-processor.ts:process(systemPrompt, toolInstances, agentId, context)
│   ├── autobyteus-ts/src/skills/format-skill-content-for-prompt.ts:formatSkillContentForPrompt(skill) [STATE]
│   │   └── autobyteus-ts/src/skills/format-skill-content-for-prompt.ts:rewriteResolvableMarkdownLinks(skill.content, skill.rootPath) [STATE]
│   └── autobyteus-ts/src/agent/system-prompt-processor/available-skills-processor.ts:appendDetailedSkillSection(...) [STATE]
└── autobyteus-ts/src/agent/system-prompt-processor/available-skills-processor.ts:returnPrompt(...) [STATE]
```

### Branching / Fallback Paths

```text
[FALLBACK] if a Markdown link target is external, anchored, already absolute, or unresolved
autobyteus-ts/src/skills/format-skill-content-for-prompt.ts:rewriteResolvableMarkdownLinks(...)
└── keep original link target unchanged [STATE]
```

```text
[ERROR] if formatting receives malformed or unreadable skill metadata
autobyteus-ts/src/agent/system-prompt-processor/available-skills-processor.ts:process(...)
└── fail prompt construction for that turn rather than emitting invented paths
```

### State And Data Transformations

- `Skill` object -> formatted skill content string
- relative Markdown target -> absolute filesystem target when resolution succeeds
- unchanged label + rewritten target -> final prompt-visible Markdown link

### Observability And Debug Points

- Logs emitted at:
  - skill-injection log in `AvailableSkillsProcessor.process(...)`
- Metrics/counters updated at:
  - none planned
- Tracing spans (if any):
  - none planned

### Design Smells / Gaps

- Any legacy/backward-compatibility branch present? (`Yes/No`): `No`
- Any tight coupling or cyclic cross-subsystem dependency introduced? (`Yes/No`): `No`
- Any naming-to-responsibility drift detected? (`Yes/No`): `No`

### Open Questions

- None blocking for this use case

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `Covered`

## Use Case: UC-005 [`load_skill` output contains the same absolute internal paths]

### Spine Context

- Spine ID(s): `DS-002`
- Spine Scope: `Primary End-to-End`
- Governing Owner: `loadSkill`
- Why This Use Case Matters To This Spine:
  - `load_skill` currently exposes the same raw relative link problem as preloaded prompt injection. Keeping the second surface unchanged would preserve a duplicate failure mode.
- Why This Spine Span Is Long Enough:
  - The span starts at tool invocation, shows skill lookup/registration, passes through the shared formatter, and ends at returned tool content. That is enough to expose the authoritative owner and the returned effect.

### Goal

Return `load_skill` content with the same rewritten absolute internal targets as the preloaded skill prompt path.

### Preconditions

- The requested skill exists in the registry or is loadable by path.
- `skillAccessMode` allows the load.

### Expected Outcome

- `load_skill` returns the same rewritten link-target behavior as preloaded prompt injection.
- Preloaded-only guardrails and load restrictions remain unchanged.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-ts/src/tools/skill/load-skill.ts:loadSkill(context, skill_name)
├── autobyteus-ts/src/tools/skill/load-skill.ts:resolveSkillAccessMode(...) [STATE]
├── autobyteus-ts/src/skills/registry.ts:getSkill(skillName) [STATE]
│   └── autobyteus-ts/src/skills/registry.ts:registerSkillFromPath(skillName) [STATE] # only when loading by path or first registration is required
├── autobyteus-ts/src/skills/format-skill-content-for-prompt.ts:formatSkillContentForPrompt(skill) [STATE]
│   └── autobyteus-ts/src/skills/format-skill-content-for-prompt.ts:rewriteResolvableMarkdownLinks(skill.content, skill.rootPath) [STATE]
└── autobyteus-ts/src/tools/skill/load-skill.ts:returnFormattedSkillBlock(...) [STATE]
```

### Branching / Fallback Paths

```text
[FALLBACK] if a Markdown link target is external, anchored, already absolute, or unresolved
autobyteus-ts/src/skills/format-skill-content-for-prompt.ts:rewriteResolvableMarkdownLinks(...)
└── keep original link target unchanged [STATE]
```

```text
[ERROR] if PRELOADED_ONLY mode blocks the requested skill
autobyteus-ts/src/tools/skill/load-skill.ts:loadSkill(...)
└── throw access-mode error before formatting
```

### State And Data Transformations

- tool input skill name/path -> resolved `Skill`
- raw skill body -> formatted skill body with rewritten internal targets
- formatted skill body + skill header -> returned tool output string

### Observability And Debug Points

- Logs emitted at:
  - existing tool execution logging only
- Metrics/counters updated at:
  - none planned
- Tracing spans (if any):
  - none planned

### Design Smells / Gaps

- Any legacy/backward-compatibility branch present? (`Yes/No`): `No`
- Any tight coupling or cyclic cross-subsystem dependency introduced? (`Yes/No`): `No`
- Any naming-to-responsibility drift detected? (`Yes/No`): `No`

### Open Questions

- None blocking for this use case

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `Covered`
