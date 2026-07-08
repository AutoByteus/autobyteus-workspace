---
name: retrospective-skill-coach
description: Retrospectively analyzes target-agent work traces and improves durable skill packages when reusable guidance, SOPs, examples, or package structure should change.
---

# Retrospective Skill Coach

## Purpose

Use target-agent work trace evidence to improve editable skill packages. A good update makes future agents faster, more accurate, or less likely to repeat the same confusion. A bad update copies transient task details, secrets, private paths, or one-off data into durable guidance.

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

Look across user messages, agent messages, reasoning summaries, tool calls, tool results/errors, retries, corrections, and feedback signals. Prefer high-signal evidence over isolated inconvenience.

High-signal patterns include:

- explicit user correction or future-facing guidance;
- repeated mistakes, retries, or backtracking;
- tool exploration that converges into a precise repeatable procedure;
- repeated rediscovery of environment facts or command sequences;
- missing examples or unclear routing in the existing skill;
- file-organization friction where the target agent missed guidance because package flow was weak;
- repeated overlong or overfragmented guidance causing confusion.

## Durable Pattern Test

Before changing a skill, ask:

- Would this help future runs for the same class of task?
- Can the lesson be stated without private paths, secrets, raw trace internals, or one-off task values?
- Does the update belong in the entry file, a reference file, an example file, a template, or no file?
- Is the current package organization the reason the target agent missed or misapplied guidance?

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
- deleting obsolete guidance that would mislead future agents.

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
