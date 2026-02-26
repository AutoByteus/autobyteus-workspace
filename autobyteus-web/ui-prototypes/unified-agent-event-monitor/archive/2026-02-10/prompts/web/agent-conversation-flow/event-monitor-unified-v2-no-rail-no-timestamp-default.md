Create a production-ready desktop web workspace UI mock that closely matches event-monitor-unified-v2, as a direct update from version 2.

Aspect ratio: 3:2

Preserve the v2 structure:
- Far-left thin icon rail.
- Left panel with "Running Agents" and "Agent Configuration" sections.
- Center header with agent name and status dot.
- Center tab row with one active agent tab.
- Center conversation area and bottom composer.
- Right panel tab strip with labels: Files, Terminal, Activity, Artifacts.
- Right panel content showing collapsed To-Do and expanded Activity blocks.

Update objective from v2:
- Keep the v2 look and layout, but remove the vertical timeline rail/connector line between avatars.
- Remove timestamps in conversation turns only.

Conversation design rules for this update:
- Single shared conversation container card (same as v2).
- No vertical connector line.
- Keep compact turn rows with avatar + role chip.
- Keep subtle separators and aligned content column for continuity.
- Role distinction via chip color and small accent markers only.
- Keep token/cost metadata behavior as in v2 unless naturally omitted by the model.
- Do not show timestamp text near user/agent role chips.

Composer continuity rules:
- Keep composer visually attached to conversation card.
- Keep context files row integrated with composer block.

Style:
- light mode only
- neutral whites and grays, blue accent for user, teal accent for agent
- clean SaaS enterprise style
- realistic text, no lorem ipsum
- no watermark, no device frame
