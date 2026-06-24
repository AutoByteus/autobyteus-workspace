# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Refined.

Refinement basis: downstream implementation surfaced a user lifecycle concern on 2026-06-24. The latest user clarification restores the earlier lifecycle fallback behavior: if an existing companion cannot be restored, creating a replacement companion is acceptable. The only required runtime-prompt change is to remove previous/prior evolver run ids from the task packet.

User approval basis: On 2026-06-24 the user approved the cleanup direction and explicitly asked to kick off the ticket, with detailed requirements and design that preserve the prompt/agent/skill-package details discussed in the thread.

## Goal / Problem Statement

Improve the manual self-evolution companion request so it stops exposing noisy/internal implementation language in the runtime user message and gives the Skill Self-Evolver a stronger static coaching playbook.

The current runtime message mixes dynamic task data, stable agent rules, documentation-only rationale, and defensive negative wording. It also calls `SKILL.md` the “Primary guidance file,” which incorrectly implies `SKILL.md` is the only or dominant guidance source, even though skills can route to important references/templates/examples inside the package. The Skill Self-Evolver should instead be modeled as a retrospective skill-improvement coach: it reviews target-worker work traces, detects high-signal durable improvement opportunities, and improves the whole editable skill package when evidence supports it.

## Investigation Findings

- `SelfEvolutionCompanionTriggerMessageBuilder.build()` currently owns the exact self-evolution user message. The highlighted prompt text is one template literal in `autobyteus-server-ts/src/self-evolution/services/companion/self-evolution-companion-trigger-message-builder.ts`.
- The current prompt embeds:
  - dynamic task data: work trace paths, editable skill root paths, target run id, message type, prior evolver ids;
  - stable policy: edit limits, no durable improvement behavior, privacy/no-copy rules, final message rule;
  - documentation/internal rationale: “semantically complete for self-evolution” and “hide backend protocol fields”;
  - defensive negative language: “do not read raw_traces*.jsonl files.”
- `autobyteus-server-ts/src/built-in-agents/templates/skill-evolver/agent.md` currently owns some stable Skill Self-Evolver policy, but it is too small for the desired retrospective coaching behavior and uses the misleading `SKILL.md is the primary guidance file` wording.
- The platform supports agent-private skills through `agentDir/skills/<skill-name>` resolution in `ConfiguredAgentSkillResolver`, but built-in-agent bootstrap currently copies only `agent.md` and `agent-config.json` from `src/built-in-agents/templates/<agent>/` into app data. It does not sync template `skills/` directories yet.
- The Skill Self-Evolver template currently has `"skillNames": []` in `agent-config.json`.
- The direct-message grant already enforces the final `skill_update` delivery constraints in code: target run id, message type, reference file roots, max accepted delivery count, and expiry.
- Existing companion lifecycle code attempts active-run reuse and runtime restore for `currentEvolverRunId`; when restore returns null/fails, it creates a replacement companion. The latest user clarification accepts this earlier fallback behavior.
- `Previous evolver run ids for continuity context` currently appears in the runtime task packet, but the user considers this prompt noise. It should be removed from the prompt. `priorEvolverRunIds` may remain internal session/audit state for the replacement fallback, but it must not be rendered into the companion task packet.
- `docs/modules/self_evolution.md` correctly documents work trace projection rationale. That rationale should remain in docs, not be repeated in the runtime user message.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Cleanup / behavior change / small feature extension
- Initial design issue signal (`Yes`/`No`/`Unclear`): Yes
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Duplicated Policy Or Coordination + Boundary Or Ownership Issue
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Needed now, scoped to prompt-contract composition, built-in self-evolver package structure, built-in template skill syncing, and removal of prior-run prompt noise.
- Evidence basis:
  - Runtime user message repeats static behavior that belongs in self-evolver static guidance.
  - Runtime prompt exposes module-design rationale and internal raw-trace file naming that the companion does not need to see.
  - `agent.md` is becoming too large if all retrospective coaching rules/examples are placed there; the existing platform has a better private-skill shape.
  - Current built-in bootstrap does not sync private skills, so a private skill addition needs bootstrap support.
  - Current companion restore fallback can create a replacement companion after restore failure; the fallback is acceptable, but exposing prior evolver run ids in the prompt is confusing and lacks an inspection workflow.
- Requirement or scope impact:
  - Separate dynamic task packet from static coaching playbook.
  - Add bounded package-tree context so the companion sees the whole editable skill package shape.
  - Move detailed retrospective coaching instructions and examples into an agent-private skill package.
  - Preserve the earlier companion fallback behavior while removing the confusing prompt continuity hint.

## Recommendations

1. Keep the runtime self-evolution user message as a concise dynamic task packet only.
2. Remove long-form `Rules:` from the runtime message. Stable rules belong in the Skill Self-Evolver static guidance.
3. Remove documentation-only wording from the runtime message:
   - no `semantically complete for self-evolution`;
   - no `hide backend protocol fields`;
   - no raw-trace file-pattern mention such as `raw_traces*.jsonl`.
4. Use positive evidence wording: `Use the listed work trace files as the evidence package.`
5. Replace `Primary guidance file` with a bounded package tree / package index:
   - list the absolute root directory once;
   - mark `SKILL.md` as `[entry]`;
   - show relative package contents so important referenced files are visible;
   - bound depth and entry count to avoid token growth.
6. Make built-in Skill Self-Evolver `agent.md` thin: identity, role, mandatory boundaries, task-message contract, and instruction to use its configured private skill.
7. Add an agent-private skill package, recommended name `retrospective-skill-coach`, under the built-in Skill Self-Evolver template.
8. Put the detailed retrospective coaching workflow, signal patterns, package-improvement guidance, examples, and no-change criteria in that private skill package.
9. Update built-in-agent bootstrap to sync template `skills/` directories for product-managed built-in agents, then configure Skill Self-Evolver `agent-config.json` to include `"retrospective-skill-coach"`.
10. Preserve service-level final-message grants exactly; prompt cleanup must not weaken grant enforcement.
11. Remove `Previous evolver run ids for continuity context` from the runtime task packet. Keep any prior-run bookkeeping internal only; do not send old coach/evolver run ids to the companion.
12. Keep the earlier companion lifecycle fallback: reuse active stored companion, restore/wake inactive stored companion when possible, and create a replacement companion if restore fails. The replacement should behave like a new coach from the prompt perspective.
13. Update module docs and focused tests so future changes do not reintroduce noisy runtime prompt wording.

## Scope Classification (`Small`/`Medium`/`Large`)

Medium.

Rationale: Prompt text cleanup alone is small, but the approved shape adds an agent-private skill package and requires built-in template skill syncing plus package-tree rendering for editable skill targets.

## In-Scope Use Cases

- UC-001: A self-evolver companion receives a concise self-evolution task packet containing only dynamic evidence/package/completion data.
- UC-002: The companion sees a bounded package tree for every editable skill package and understands that `SKILL.md` is the entry file, not necessarily the only guidance file.
- UC-003: The companion uses a detailed retrospective coaching playbook to inspect target-worker work traces for high-signal durable skill improvements.
- UC-004: The companion can improve the whole editable skill package, including referenced files, examples, templates, and file organization, when evidence supports it.
- UC-005: The companion makes no file changes when the trace evidence only contains one-off or non-reusable details.
- UC-006: The companion sends at most one final `skill_update` message only after meaningful durable skill-package changes, with reference files constrained to surviving files inside editable roots.
- UC-007: Product-managed built-in agent sync installs the private self-evolver skill package so it resolves as an agent-private skill at runtime.

## Out of Scope

- Changing raw trace storage format or work trace projection semantics.
- Adding a dedicated read-only work-trace tool.
- Adding service-side diff auditing or off-target edit detection.
- Broad self-evolution eligibility, strategy catalog behavior, companion reuse/restore fallback semantics, and direct-message grant semantics. The lifecycle fallback may remain as earlier implemented; only prior-run prompt rendering is in scope.
- Changing non-Skill-Self-Evolver built-in agent behavior except for generic template skill syncing support needed by built-ins.
- Making active target workers reload changed skills immediately; current next-run/live-refresh limitations remain.

## Functional Requirements

- REQ-001: The runtime self-evolution user message must be a dynamic task packet, not a mini agent definition.
- REQ-002: The runtime message must include work trace manifest path, work trace root path, individual work trace file paths, editable skill packages, target agent run id, and final message type. It must not include prior evolver run ids.
- REQ-003: The runtime message must not include documentation-only rationale such as “semantically complete,” “hide backend protocol fields,” or similar implementation explanation.
- REQ-004: The runtime message must not mention raw trace file patterns as a defensive negative. If a raw-trace read prohibition remains necessary, it belongs in static self-evolver guidance.
- REQ-005: The runtime editable package section must list a bounded package tree/index for each editable skill root, marking `SKILL.md` as `[entry]`.
- REQ-006: The package tree renderer must avoid unbounded growth by limiting depth and total entries and by excluding hidden/cache/generated/dependency/binary-heavy paths.
- REQ-007: Static self-evolver behavior must live outside the runtime task packet, preferably in a thin `agent.md` plus a configured agent-private `retrospective-skill-coach` skill.
- REQ-008: The thin Skill Self-Evolver `agent.md` must define identity, retrospective role, mandatory edit boundaries, task-message authority, and final-notification dependency on task-supplied target info.
- REQ-009: The private coaching skill must explain how to read work traces: user messages, worker messages, reasoning, tool calls, tool results/errors, retries, corrections, and user feedback.
- REQ-010: The private coaching skill must teach high-signal evidence patterns: repeated mistakes, explicit durable user feedback, worker backtracking, tool-exploration-to-SOP convergence, environment rediscovery, missing/unclear routing, weak examples, and package-structure friction.
- REQ-011: The private coaching skill must require the companion to distinguish durable reusable patterns from one-off task details before changing the skill package.
- REQ-012: The private coaching skill must cover comprehensive package improvement: adding files, editing files, splitting overgrown files, merging over-fragmented files, improving content flow, improving file names/responsibilities, updating examples/templates/scripts, and preserving a clear entry-file flow.
- REQ-013: The private coaching skill must include demonstrative examples showing good and bad transformations from trace evidence into durable skill package changes.
- REQ-014: Built-in Skill Self-Evolver `agent-config.json` must configure the agent-private coaching skill in `skillNames`.
- REQ-015: Built-in-agent bootstrap must sync template `skills/` directories into product-managed app-data built-in agent directories without overwriting user package roots outside the product-managed built-in app-data locations.
- REQ-016: Existing direct-message grant enforcement must remain unchanged: target id, message type, reference roots, one accepted delivery, and expiry are enforced by code.
- REQ-017: Module docs must be updated to document the new prompt separation: runtime task packet vs thin agent definition vs private coaching skill vs service-level grant enforcement.
- REQ-018: Tests must assert the concise runtime prompt shape, package tree rendering, private skill sync/configuration, and absence of reintroduced noisy/internal prompt wording.
- REQ-019: The existing `single_agent` companion lifecycle fallback may remain: reuse an active stored companion, attempt to restore/wake an inactive stored companion, and create a replacement companion if restore fails.
- REQ-020: Replacement history such as `priorEvolverRunIds` may remain internal session/audit bookkeeping, but previous/prior evolver run ids must never be included in the runtime task packet unless a future design adds a real prior-run inspection workflow.
- REQ-021: Future `agent_team` evolver support may use the same fallback policy only if explicitly designed for team runs; no previous/prior team run ids should be sent in the prompt without a real inspection workflow.

## Target Runtime Message Contract

The generated companion user message should follow this shape. Exact punctuation may vary, but sections and semantics should remain stable.

```text
Self-improvement requested for the target worker.

Use the listed work trace files as the evidence package.

Work trace manifest: <absolute manifest path>
Work trace root: <absolute work trace root path>
Work trace files:
1. <absolute work trace file path>
2. <absolute work trace file path>

Editable skill packages:
1. <skill name>
   Root directory: <absolute skill root path>
   Package tree:
   .
   ├── SKILL.md [entry]
   ├── references/
   │   └── <file>.md
   ├── templates/
   │   └── <file>.md
   └── ... (<N> entries omitted)

Completion target:
- target_agent_run_id: <target run id>
- message_type: skill_update
```

Rules for this prompt:

- Do not include previous/prior evolver run ids. They are internal replacement-history bookkeeping only and are not companion prompt input for this design.
- Do not include a `Rules:` section.
- Do not mention `raw_traces`, `raw_traces*.jsonl`, backend protocol fields, provider envelopes, hidden protocol fields, or semantic completeness.
- Do not inline work trace content; list paths only.
- Do not repeat generic stable self-evolver rules already covered by static guidance.
- It is acceptable to keep one short completion section because target id and message type are dynamic.

## Target Thin `agent.md` Draft

Path: `autobyteus-server-ts/src/built-in-agents/templates/skill-evolver/agent.md`

```markdown
---
name: Skill Self-Evolver
description: Retrospectively improves configured durable skill packages from target-worker work evidence.
category: self-evolution
role: retrospective skill-improvement coach
---

You are the Skill Self-Evolver, a retrospective skill-improvement coach.

Use your configured retrospective coaching skill to inspect the target worker's work trace evidence and improve the listed editable skill packages only when a durable reusable improvement is warranted.

The task message is authoritative for dynamic scope. It supplies the work trace evidence paths, editable skill package roots, package trees, target AgentRun id, and final message type.

Treat each listed root directory as an editable skill package boundary. `SKILL.md` is the package entry file; important guidance may also live in referenced files inside the same root.

Do not edit outside the listed editable skill roots. Do not edit source code, run memory, tool/MCP configuration, agent/team definitions, or sibling skills. Do not follow symlinks or path aliases to write outside a listed root.

If no reusable skill improvement is justified by the work trace evidence, make no file changes and explain why.

After meaningful durable skill package file changes, send exactly one `send_message_to` update using the `target_agent_run_id` and `message_type` supplied by the task message. The content must explain what durable skill guidance changed and why. `reference_files` must be absolute paths for updated or directly relevant surviving files inside the editable skill roots. Do not send a `skill_update` when no durable skill package file changed.
```

## Target Built-In Agent Config Draft

Path: `autobyteus-server-ts/src/built-in-agents/templates/skill-evolver/agent-config.json`

```json
{
  "toolNames": [
    "run_bash",
    "send_message_to"
  ],
  "skillNames": [
    "retrospective-skill-coach"
  ],
  "inputProcessorNames": [],
  "llmResponseProcessorNames": [],
  "systemPromptProcessorNames": [],
  "toolExecutionResultProcessorNames": [],
  "toolInvocationPreprocessorNames": [],
  "lifecycleProcessorNames": [],
  "avatarUrl": null,
  "defaultLaunchConfig": null
}
```

## Target Private Skill Package Draft

Recommended files:

```text
autobyteus-server-ts/src/built-in-agents/templates/skill-evolver/skills/retrospective-skill-coach/
├── SKILL.md
└── references/
    ├── high-signal-trace-patterns.md
    ├── package-improvement-playbook.md
    └── examples.md
```

### `skills/retrospective-skill-coach/SKILL.md` Draft

```markdown
---
name: retrospective-skill-coach
description: Retrospectively analyzes target-worker work traces and improves durable skill packages when reusable guidance, SOPs, examples, or package structure should change.
---

# Retrospective Skill Coach

## Purpose

Use target-worker work trace evidence to improve editable skill packages. A good update makes future workers faster, more accurate, or less likely to repeat the same confusion. A bad update copies transient task details, secrets, private paths, or one-off data into durable guidance.

## Required Reading Flow

1. Read the task message for dynamic scope:
   - work trace manifest/root/files;
   - editable skill package roots and package trees;
   - target AgentRun id and message type.
2. Read relevant work trace files. Treat them as retrospective coaching evidence.
3. Inspect the editable skill package entry file and any referenced files needed to understand the current guidance.
4. Decide whether the evidence supports:
   - no durable change;
   - a small rule/example/SOP update;
   - a new reference/template/example file;
   - package flow or file-organization improvement.
5. Edit only inside listed editable skill roots.
6. If meaningful durable files changed, send the final `skill_update` exactly once using the task-supplied completion target.

## Evidence Interpretation

Look across user messages, worker messages, reasoning summaries, tool calls, tool results/errors, retries, corrections, and feedback signals. Prefer high-signal evidence over isolated inconvenience.

High-signal patterns include:

- explicit user correction or future-facing guidance;
- repeated mistakes, retries, or backtracking;
- tool exploration that converges into a precise repeatable procedure;
- repeated rediscovery of environment facts or command sequences;
- missing examples or unclear routing in the existing skill;
- file-organization friction where the worker missed guidance because package flow was weak;
- repeated overlong or overfragmented guidance causing confusion.

## Durable Pattern Test

Before changing a skill, ask:

- Would this help future runs for the same class of task?
- Can the lesson be stated without private paths, secrets, raw trace internals, or one-off task values?
- Does the update belong in the entry file, a reference file, an example file, a template, or no file?
- Is the current package organization the reason the worker missed or misapplied guidance?

Do not update the skill when the trace only shows a one-time external outage, a task-specific fact, or private data that cannot be generalized.

## Package Improvement Scope

`SKILL.md` is the entry file, not the whole skill. You may improve any file inside the listed skill root when the task message permits it and the improvement is durable.

Valid improvements include:

- adding or revising concise entry-file routing;
- adding SOPs from successful exploration paths;
- adding examples that teach future behavior;
- improving templates or scripts used by the skill;
- splitting an oversized mixed file;
- merging over-fragmented files;
- renaming or reorganizing files for clearer responsibilities;
- deleting obsolete guidance that would mislead future workers.

Keep the package easy to navigate. Do not append everything to `SKILL.md` when a referenced SOP/example file would be clearer.

## Required References

Read these references when relevant:

- `references/high-signal-trace-patterns.md` for evidence signals.
- `references/package-improvement-playbook.md` for deciding entry-file vs reference/template/example changes.
- `references/examples.md` for good and bad trace-to-skill transformations.

## Final Response And Notification

If no durable change is warranted, explain that no file changes were made and why. Do not call `send_message_to`.

If meaningful durable skill package files changed, call `send_message_to` exactly once with:

- `target_agent_run_id` from the task message;
- `message_type` from the task message;
- concise target-facing content explaining what changed, why it matters, and how future work should use it;
- `reference_files` containing absolute paths for updated or directly relevant surviving files inside editable roots.

Do not reference deleted files in `reference_files`; mention them in message content if needed.
```

### `references/high-signal-trace-patterns.md` Draft

```markdown
# High-Signal Trace Patterns

Use this reference to decide whether a work trace contains durable improvement evidence.

## Strong Signals

### User Correction Or Future-Facing Guidance

A user correction is high signal when it changes how future tasks should be handled, not just the current answer. Preserve the generalized lesson, not the user's exact private wording.

### Repeated Mistake Or Backtracking

Repeated failed attempts often indicate missing skill guidance. Look for several attempts around the same decision, command, tool, file location, or workflow.

### Tool Exploration To SOP Convergence

Sometimes the worker starts without knowing an environment, website, UI, or tool surface. It tries several probes, then discovers a reliable action sequence. If that sequence is reusable, convert it into an SOP.

Example pattern:

1. Worker opens browser page.
2. Worker inspects DOM several ways.
3. Worker identifies stable selector/action sequence.
4. Worker completes task reliably.
5. Future skill should teach the stable inspect-then-act sequence.

### Environment Rediscovery

If the worker had to rediscover the same repository layout, command, test target, or setup step that a skill should know how to find, add a generalized discovery or setup rule.

### Package Navigation Failure

If guidance existed but was missed because the entry file did not route clearly, improve package flow instead of adding duplicate guidance.

## Weak Or Non-Durable Signals

- One-off website downtime.
- Private task facts that will not recur.
- User preference limited to one output.
- Tool result values that are transient.
- Raw trace ids, backend fields, private paths, secrets, or credentials.

## Decision Rule

Only update durable skill guidance when the trace supports a reusable future behavior.
```

### `references/package-improvement-playbook.md` Draft

```markdown
# Package Improvement Playbook

Skill package improvement is not limited to editing `SKILL.md`.

## Choose The Right Change Shape

### Small Entry-File Change

Use when future workers need a concise routing or trigger rule.

### New Or Updated SOP Reference

Use when the trace reveals a repeatable procedure with multiple steps.

### New Or Updated Example

Use when judgment is hard and a concrete example will prevent misapplication.

### Template Or Script Update

Use when the durable workflow depends on a reusable artifact shape or command.

### Package Reorganization

Use when guidance exists but file boundaries or flow are unclear.

## File Responsibility Rules

- `SKILL.md`: entrypoint, trigger rules, routing to references, concise mandatory rules.
- `references/*.md`: detailed methods, SOPs, examples, troubleshooting.
- `templates/*`: reusable output structures or document/code skeletons.
- scripts/assets: only when the skill already uses them or the new workflow needs reusable executable support.

## Avoid Two Extremes

- Giant entry file: do not append every lesson to `SKILL.md`.
- Over-fragmentation: do not create many tiny files when one coherent reference is clearer.

## Cleanup Is Valid

Remove or merge obsolete/misleading guidance when better package structure makes it unnecessary.
```

### `references/examples.md` Draft

```markdown
# Retrospective Skill Coaching Examples

## Example 1: Browser Exploration Becomes SOP

Trace signal:
- The worker tries several browser operations.
- It eventually discovers that inspecting the DOM snapshot first and using a stable label/selector works reliably.

Good update:
- Add a generalized browser-operation SOP: inspect visible state, identify stable selectors, perform action, verify state.

Bad update:
- Copy the exact private URL, transient HTML, or task-specific selector into durable guidance.

## Example 2: User Correction Becomes Skill Rule

Trace signal:
- User says stable policy belongs in `agent.md` or skill guidance, while the user message should carry dynamic paths only.

Good update:
- Add a rule distinguishing static guidance from dynamic task packet content.

Bad update:
- Paste the user's whole complaint verbatim into the skill.

## Example 3: No Durable Improvement

Trace signal:
- The worker failed because an external site was temporarily unavailable.
- No repeated mistake or reusable process gap is visible.

Good outcome:
- Make no file changes and explain why.

Bad update:
- Add a permanent warning about that specific temporary outage.

## Example 4: Package Structure Improvement

Trace signal:
- The worker missed relevant guidance because `SKILL.md` was too long and did not route to examples.

Good update:
- Keep `SKILL.md` concise.
- Move detailed examples into `references/examples.md`.
- Add a clear routing bullet in `SKILL.md`.

Bad update:
- Append another long section to the already overloaded entry file.

## Example 5: Durable SOP From Command Discovery

Trace signal:
- The worker runs several commands before finding the correct test command or setup path.

Good update:
- Add a generalized command discovery checklist or known command in the relevant skill reference.

Bad update:
- Copy absolute local one-off paths that only existed in that run.
```

## Acceptance Criteria

- AC-001: `SelfEvolutionCompanionTriggerMessageBuilder` produces a concise task packet with no `Rules:` section.
- AC-002: The generated task packet contains work trace manifest/root/files and does not inline work trace bodies.
- AC-003: The generated task packet contains editable skill package roots and bounded package trees with `SKILL.md [entry]`.
- AC-004: The generated task packet contains target AgentRun id and `skill_update` message type in a concise completion section.
- AC-004A: The generated task packet does not contain `Previous evolver run ids`, `priorEvolverRunIds`, or old companion run ids.
- AC-005: The generated task packet omits `raw_traces`, `raw_traces*.jsonl`, `semantically complete`, `backend protocol`, `hide backend`, and equivalent internal rationale wording.
- AC-006: The Skill Self-Evolver `agent.md` is reduced to thin identity/boundary/task-contract guidance and no longer contains detailed coaching method examples.
- AC-007: The Skill Self-Evolver `agent.md` calls `SKILL.md` the entry file, not the primary guidance file.
- AC-008: A private `retrospective-skill-coach` skill package exists under the built-in Skill Self-Evolver template with the detailed coaching workflow and examples.
- AC-009: The private coaching skill includes examples for SOP extraction, user correction, no-change decision, package organization, and what not to copy.
- AC-010: Built-in Skill Self-Evolver `agent-config.json` lists `retrospective-skill-coach` in `skillNames`.
- AC-011: Built-in bootstrap copies template private skill directories into the app-data built-in agent directory and preserves the normal behavior of syncing product-managed built-in files.
- AC-012: Built-in bootstrap tests prove private skill files are synced, stale private skill files in product-managed built-ins are restored, and user package roots are not overwritten.
- AC-013: Self-evolution prompt tests prove the runtime prompt is path-only, tree-aware, and free of internal/noisy phrases.
- AC-014: Existing direct-message grant tests remain passing; no grant enforcement is moved into prompt-only text.
- AC-015: Docs describe the separation between runtime task packet, static self-evolver guidance, private coaching skill, work-trace docs, and service-level grant enforcement.
- AC-016: Companion prompt tests prove prior/previous evolver run ids are not rendered even when internal session state contains `priorEvolverRunIds`.
- AC-017: Existing lifecycle tests may continue to prove replacement companion creation after restore failure; such replacement must not add previous run ids to the prompt.

## Constraints / Dependencies

- The task message must still carry dynamic paths and target ids because static guidance cannot know them.
- Prior evolver run ids are not considered actionable dynamic prompt data without a future concrete inspection workflow. They may remain internal audit/session bookkeeping only.
- The companion currently reads work trace files through general file/tool access; no dedicated read-only evidence tool exists.
- Built-in agent sync is product-managed and intentionally overwrites app-data copies of built-in agents at startup; extending it to private skills should follow the same product-managed pattern only for built-in app-data directories.
- Agent-private skill resolution already exists and should be reused.
- Direct-message grant enforcement remains the hard boundary for final `skill_update` delivery.

## Assumptions

- A private skill package is preferred over a large `agent.md` for maintainability.
- The private skill name `retrospective-skill-coach` is acceptable.
- A bounded package tree with relative paths is enough context for the companion; it can inspect files as needed.
- Tests should validate presence/absence of key prompt phrases rather than fragile full-string equality where possible.

## Risks / Open Questions

- Package tree rendering must not leak excessive private path repetition; list root once and use relative tree entries.
- Package tree rendering must avoid token blowup on large skill packages; use fixed caps and omission notes.
- Existing built-in bootstrap API result currently reports only `syncedAgentMd` and `syncedAgentConfig`; design must decide whether to add `syncedSkills` or keep skill sync internal. Recommended: add `syncedSkillDirectories` or `syncedSkills` for testability.
- If product owners still want an explicit raw-trace read prohibition, it should be in static self-evolver guidance, not the runtime prompt.
- If product owners later want a replacement companion to inspect previous evolver runs, that requires a separate workflow and evidence surface; do not expose prior run ids in the prompt before that exists.

## Requirement-To-Use-Case Coverage

- UC-001: REQ-001 through REQ-004, REQ-017, REQ-018, REQ-021
- UC-002: REQ-005, REQ-006, REQ-018
- UC-003: REQ-007 through REQ-013
- UC-004: REQ-012, REQ-013
- UC-005: REQ-011, REQ-013
- UC-006: REQ-002, REQ-008, REQ-016
- UC-007: REQ-014, REQ-015
- Companion lifecycle fallback with no prompt prior ids: REQ-019, REQ-020, REQ-021

## Acceptance-Criteria-To-Scenario Intent

- AC-001 through AC-005 validate the runtime prompt cleanup.
- AC-006 through AC-010 validate static Skill Self-Evolver guidance and private skill packaging.
- AC-011 through AC-012 validate built-in bootstrap/private skill mechanics.
- AC-013 validates self-evolution prompt regression coverage.
- AC-014 validates unchanged service-level final-message enforcement.
- AC-015 validates documentation sync.
- AC-016 through AC-017 validate that lifecycle fallback does not leak prior ids into the prompt.

## Approval Status

Approved by user on 2026-06-24 for design and downstream review/implementation kickoff.
