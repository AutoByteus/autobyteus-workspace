---
name: retrospective-skill-improver
description: Retrospectively analyzes target run work traces and improves durable skill packages when reusable guidance, SOPs, examples, or package structure should change.
---

# Retrospective Skill Improver

## Purpose

Use work trace evidence for a target run/agent to improve editable skill packages. A useful update turns observed friction into stable guidance that future agents can reuse.

Work trace body entries use role/event labels such as `user`, `assistant`, `tool`, and neutral trace events. The task message and manifest provide the target identity.

## Workflow

1. Read the task message for dynamic scope: work trace paths, editable skill roots, package trees, target AgentRun id, and completion message type.
2. Read the relevant work trace files as retrospective Skill Improvement evidence.
3. Inspect each relevant editable skill package, starting from `SKILL.md` and then any referenced files needed to understand the current guidance.
4. Decide whether the evidence supports a durable improvement:
   - explain that current guidance stands;
   - revise a concise rule, example, or SOP;
   - add or update a reference/template/example file;
   - improve package flow or file organization.
5. Use the listed editable skill roots for file edits.
6. After meaningful durable file changes, send the final `skill_update` once using the task-supplied completion target.

## Evidence Interpretation

Use visible user messages, visible assistant messages, tool calls, tool results/errors, neutral trace events, retries, corrections, and feedback signals. Prefer repeated or explicit evidence over isolated inconvenience.

Base improvements on the observable evidence present in the readable work trace.

High-signal patterns include:

- explicit user correction or future-facing guidance;
- repeated retries, corrections, or backtracking;
- tool exploration that converges into a precise repeatable procedure;
- repeated rediscovery of environment facts or command sequences;
- example or routing gaps in the existing skill;
- file-organization friction where package flow made relevant guidance hard to find;
- repeated overlong or overfragmented guidance causing confusion.

## Durable Improvement Check

Before editing a skill, confirm:

- The change would help future runs for the same class of task.
- The lesson can be generalized using stable, reusable details.
- The package location is right: entry file, reference, example, template, script, or package structure.
- The current package guidance or organization contributed to the observed friction.

For temporary outages, task-specific facts, or run-specific data, treat the trace as context and explain that current guidance stands.

## Package Improvement Scope

`SKILL.md` is the entry file, not the whole skill. Improve the file that owns the guidance:

- `SKILL.md` for concise workflow, routing, and mandatory rules;
- `references/*.md` for detailed SOPs, examples, and troubleshooting;
- `templates/*` for reusable output structures;
- `scripts/*` or assets when reusable executable or static support is justified.

Keep the package easy to navigate. Prefer a referenced SOP/example file over expanding `SKILL.md` when the lesson needs detail.

## Required References

Read these references when relevant:

- `references/high-signal-trace-patterns.md` for evidence signals.
- `references/package-improvement-playbook.md` for choosing the right file/change shape.
- `references/examples.md` for sample trace-to-skill transformations.

## Final Response And Notification

If current guidance stands, explain that decision.

If meaningful durable skill package files changed, call `send_message_to` exactly once with:

- `target_agent_run_id` from the task message;
- `message_type` from the task message;
- concise target-facing content explaining what changed, why it matters, and how future work should use it;
- `reference_files` containing absolute paths for updated or directly relevant surviving files inside editable roots.

For deleted files, mention them in message content rather than `reference_files`.
