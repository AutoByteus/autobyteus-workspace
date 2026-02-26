Edit the existing event-monitor-unified-v2 UI mock.

This is a direct improvement pass on version 2, not a new layout.
Keep the structure, panel proportions, typography, spacing rhythm, and all core composition from v2.

Single primary change:
- Remove the vertical timeline rail/connector line between message avatars in the conversation area.

Required preservation from v2:
- Far-left icon rail.
- Left panel sections and hierarchy.
- Center header, tab row, and overall conversation card form.
- Right panel tab row and content blocks.
- Composer location and attached style.
- Same light theme and color language.

How to keep continuity after removing the rail:
- Keep compact per-turn headers with avatar + role chip + timestamp.
- Keep subtle separators between turns.
- Preserve one aligned content column for turn bodies.
- Use minimal accent dots or chip color only for role distinction.
- Do not introduce heavy per-role background blocks.

Output requirements:
- Aspect ratio remains 3:2.
- No watermark or device frame.
- Keep it looking like v2, only cleaner with no vertical connector line.
