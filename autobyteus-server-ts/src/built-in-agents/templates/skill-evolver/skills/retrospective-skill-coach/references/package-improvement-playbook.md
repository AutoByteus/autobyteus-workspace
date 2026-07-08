# Package Improvement Playbook

Skill package improvement is not limited to editing `SKILL.md`.

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
- scripts/assets: only when the skill already uses them or the new workflow needs reusable executable support.

## Avoid Two Extremes

- Giant entry file: do not append every lesson to `SKILL.md`.
- Over-fragmentation: do not create many tiny files when one coherent reference is clearer.

## Cleanup Is Valid

Remove or merge obsolete/misleading guidance when better package structure makes it unnecessary.
