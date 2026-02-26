Create a production-ready desktop web workspace UI mock.

Aspect ratio: 3:2

Keep this structure:
- Far-left icon rail
- Left running/config panel
- Center header + active agent tab
- Center conversation area + bottom composer
- Right panel with tabs Files, Terminal, Activity, Artifacts

Main objective:
Conversation must feel unified, but do NOT use any vertical timeline bar connecting avatars.

Conversation design rules (no rail):
- Single shared conversation surface card.
- No connector line between turns.
- Each turn uses a soft neutral turn container with very light border.
- Role identity comes from:
  - compact avatar
  - colored role chip (blue for user, teal for agent)
  - subtle left accent dot only on each turn header
- Use tight vertical rhythm and low-contrast separators between turns.
- Group continuity by reducing gap between alternating turns and by aligning message content to one consistent text column.
- Keep token/cost metadata low emphasis as tiny inline badges near timestamp.

Composer continuity:
- Composer visually attached to conversation card (shared border).
- Context files row integrated with the composer block.

Style:
- light mode only
- enterprise SaaS style, clean and minimal
- realistic content text
- no watermark, no device frame
