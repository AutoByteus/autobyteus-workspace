Create a production-ready desktop web app workspace mock that demonstrates a "task history first" AI workspace.

Aspect ratio: 16:9
Target style fidelity: high
Output style: realistic product UI screenshot (not wireframe, not illustration)

Design objective:
- The user should immediately see many prior tasks on app open.
- The UI must communicate "continue any task with one click" without exposing backend complexity.
- Active vs inactive runtime should be subtle implementation detail, not the core navigation concept.

Global composition:
- Three-column app shell in a single viewport.
- Column 1: slim global navigation rail.
- Column 2: task history list panel.
- Column 3: active task workspace pane.
- Keep spacing and alignment precise, balanced, and production-ready.

Color and atmosphere:
- Light mode only.
- Base background: very light cool gray.
- Task history panel tint: soft desaturated blue-gray for clear section identity.
- Primary accent: clean cobalt blue.
- Secondary accent: muted teal for assistant/system status.
- Avoid purple hues.
- Avoid heavy gradients; use subtle tonal layering only.

Typography:
- Modern SaaS typography with clear hierarchy and compact density.
- Headers semibold, body regular, metadata medium/light.
- Tight but readable line height.
- Truncated rows must still look deliberate (ellipsis where needed).

Detailed layout requirements:

1) Global nav rail (far left):
- Width around 64px.
- Vertical icon stack with simple monochrome icons.
- Top app mark icon.
- Mid stack includes: Agents, Teams, Applications, Prompts, Messaging, Skills, Tools, Memory, Media.
- Bottom single Settings icon.
- Current route emphasis should visually indicate "Agents" context.

2) Task history panel (left middle):
- Width around 320px.
- Top row displays workspace label with folder icon:
  "autobyteus_org"
- Below it, a dense scrollable list of task sessions.
- Each row includes:
  - small status dot at left (blue for selected/active context, gray outline for inactive)
  - one-line task title (truncate with ellipsis as needed)
  - right-aligned relative time label (e.g., 4h, 55m, 2d)
- Include approximately 12-14 rows to clearly show history depth.
- Selected row should have subtle highlight background and stronger text contrast.
- Include realistic task titles similar to engineering/product tasks:
  - Describe messaging bindings
  - Analyze distributed agent behavior...
  - Fix super agent avatar on team ...
  - Assess node data sync feasibility
  - Analyze agent tool-call UI flow
  - Adjust workflow skill iteration
  - Redesign sidebar to single level
  - Investigate electron build failure
  - Create refined server settings UI
  - Document auto-batch server ...
  - Explore mobile build for autobyteus ...
  - Investigate remote node settings

3) Main workspace pane (right):
- Top toolbar with:
  - search field placeholder: "Search tasks, agents, or messages..."
  - secondary button: "Reload"
  - primary button: "Create Task"
- Task header under toolbar:
  - title: "Describe messaging bindings"
  - sub-meta: "SuperAgent • autobyteus_org"
  - compact status chip at right: "Restoring session..." with subtle spinner/dot
- Conversation region:
  - clean unified transcript surface
  - show at least 3-4 message blocks (user + assistant)
  - assistant responses include concise technical text snippets
  - right side utility panel can be implied with low-contrast sections (Activity, Artifacts)
- Bottom composer:
  - multiline input with placeholder: "Continue this task..."
  - attachment icon and send button

Behavior cues to convey in static mock:
- Clicking any history row conceptually opens/restores that task.
- UI should imply continuity and confidence, not empty-state friction.
- No modal/pop-up for restore; restore indicator stays inline in header.

Microcopy constraints:
- Use realistic software-engineering/product language.
- No lorem ipsum.
- Avoid marketing slogans.
- Keep labels practical and terse.

Visual polish constraints:
- Consistent border radius scale.
- Hairline borders and restrained shadows.
- Precise icon alignment with text baselines.
- No decorative 3D effects.
- No watermark.
- No browser chrome/device frame.

Do not:
- Do not present this as an "agents currently running only" list.
- Do not show an empty state saying "No agents running."
- Do not make the history list secondary or hidden behind tabs.
- Do not use dark mode.
