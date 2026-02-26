Create a production-ready web app UI screen image.

Screen contract:
- Screen name: fluid-tool-call-minimal-default
- User goal on this screen: follow AI answer content without tool-call noise in the main message area.
- Entry context: user asked the agent to write a fibonacci program.
- Required components: two-column desktop app layout, left conversation panel, right activity panel, message composer.
- Primary action: user reads AI response and optionally clicks "View in Activity" for tool details.
- Secondary actions: open Arguments/Logs/Result in Activity panel.
- Content blocks with priority:
  1) AI prose content in markdown with code pill labels.
  2) Minimal inline tool pulse chips in chat (no argument dumps).
  3) Full structured tool details in right Activity panel.
- State to render: default (one successful tool call already completed).
- Aspect ratio: 16:9.

Behavior expectations:
- Main chat shows compact tool pulse cards only: icon, tool name, status chip, tiny invocation id, "View in Activity" affordance.
- Do NOT show "Arguments" disclosure in the main chat area.
- Rich text answer should visually dominate; tool pulse should feel lightweight and non-blocking.
- Right panel Activity card should still include expandable sections: Arguments, Logs, Result.
- Use realistic product copy and values: write_file, fibonacci.py, SUCCESS, #turn_8.

Hard constraints:
- Light mode only.
- No watermark.
- No device frame.
- No decorative scene outside app UI.
- Keep spacing crisp and implementation-realistic for a Vue/Tailwind app.

Apply base spec exactly:
Product name: AutoByteus
Product domain: AI developer workspace
Persona: software engineer using coding agents
Primary user jobs: read agent output quickly, inspect execution details only when needed
Brand tone: professional, focused, low-noise
Platform target: web
Viewport: 1536x960
Aspect ratio: 16:9
Density mode: comfortable
Localization: English (US)
Design system constraints:
- Grid: 2-column split layout (conversation dominant, activity secondary)
- Spacing scale: 4/8/12/16/24/32
- Type scale: 12/14/16/20/28 with clear hierarchy
- Radius tokens: md/lg
- Elevation tokens: subtle card shadows only
- Color tokens: neutral grays, blue accents, green success, red error
- Icon style: clean outline/solid mix
Accessibility intent:
- visible focus treatment on actionable items
- readable contrast in body text and metadata
