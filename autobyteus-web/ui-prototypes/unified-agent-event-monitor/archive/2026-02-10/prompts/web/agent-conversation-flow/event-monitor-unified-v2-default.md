Create a production-ready desktop web workspace UI mock that closely matches an agent workspace layout with left running/config panel, center conversation, and right tabbed utility panel.

Aspect ratio: 3:2

Must keep this structure:
- Far-left thin icon rail.
- Left panel with "Running Agents" and "Agent Configuration" sections.
- Center header with agent name and status dot.
- Center tab row with one active agent tab.
- Center conversation area and bottom composer.
- Right panel tab strip with labels: Files, Terminal, Activity, Artifacts.
- Right panel content showing collapsed To-Do and expanded Activity blocks.

Main design objective:
The center conversation should feel like one continuous unit, not two disconnected blocks for user and agent.

Conversation design rules:
- Use one shared conversation container card (single surface).
- Add a thin vertical timeline rail on the left inside that container.
- Each message turn is a compact row connected to the rail.
- Role distinction uses small pill labels and subtle left-edge accents, not full background color cards.
- Keep message spacing tighter and rhythm consistent so turns visually continue.
- Maintain avatars and role names for clarity.
- Add faint separators between turns.
- Keep token/cost metadata as low-emphasis inline chips.

Composer continuity rules:
- Composer is visually attached to conversation card (shared border or merged card stack).
- Context files row appears as part of same block, not a detached floating box.

Style:
- light mode only
- neutral whites and grays, blue accent for user, teal accent for agent
- clean SaaS enterprise style
- realistic text, no lorem ipsum
- no watermark, no device frame
