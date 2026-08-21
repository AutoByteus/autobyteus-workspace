# Package Improvement Playbook

Skill package improvement can target `SKILL.md`, references, examples, templates, scripts, or package organization.

## Choose The Right Change Shape

### Small Entry-File Change

Use when future agents need a concise routing or trigger rule.

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
- `scripts/*` and assets: reusable executable or static support when the workflow needs it.

## Keep Package Shape Balanced

- Use `SKILL.md` for what must be seen immediately.
- Use one coherent reference when the lesson needs detail.
- Merge or remove obsolete guidance when clearer package structure makes it unnecessary.
