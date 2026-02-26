Create a production-ready desktop web workspace UI mock for the unified agent event monitor.

Aspect ratio: 3:2

Preserve the approved workspace structure:
- Far-left thin icon rail.
- Left panel with "Running Agents" and "Agent Configuration" sections.
- Center header with agent name and status dot.
- Center tab row with one active agent tab.
- Center conversation area and bottom composer.
- Right panel tab strip with labels: Files, Terminal, Activity, Artifacts.
- Right panel content showing collapsed To-Do and expanded Activity blocks.

Design objective:
- Keep the conversation as one unified flow.
- Keep no vertical timeline rail/connector line between avatars.
- Keep no timestamp text in conversation turns.
- Remove role text labels/chips (no "User", "Agent", "YOU", or agent name labels per turn).
- Make the conversation feel like text sitting on one clean canvas.
- Make the top tab area visually lightweight (less heavy gray boxes and less chrome weight).

Conversation design rules:
- Single shared conversation canvas.
- No per-message card borders, no row boxes, and no divider lines between turns.
- Compact turn rows with avatar and message text aligned on one fluid row.
- Message text should begin directly after the avatar with minimal gap.
- Keep generous whitespace rhythm so turns are readable without visual borders.
- Role distinction should come from avatar/icon style and very subtle color accents only, not from text labels or borders.
- Keep token/cost metadata behavior unchanged unless otherwise requested.

Tab styling rules (important):
- Replace heavy tab rectangles with lighter pill-like tabs or understated text tabs.
- Remove dense gray tab backgrounds and thick borders.
- Active tab should use a subtle accent underline or soft tint, not a strong boxed block.
- Inactive tabs should be low-contrast text with minimal background treatment.
- Keep close icon small and unobtrusive.
- Overall top area should feel airy with more white space and less visual weight.

Composer continuity rules:
- Composer visually attached to conversation canvas.
- Context files row integrated with composer block.

Style:
- light mode only
- neutral whites and grays, blue accent for user, teal accent for agent
- clean SaaS enterprise style
- realistic text, no lorem ipsum
- no watermark, no device frame
