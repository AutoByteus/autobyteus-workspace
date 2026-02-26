Product UI prototype, web app screen, aspect ratio 16:9, high-fidelity desktop screenshot.

Create a production-ready redesign of the "Create New Agent Team" page that minimizes setup effort and makes drag-and-drop behavior unambiguous.

Product base spec:
- Platform: web desktop app, 16:9 ratio.
- Style: modern enterprise SaaS, clean and practical, high information clarity.
- Typography: clean humanist sans with clear heading/body scale and compact helper text.
- Palette: neutral background, white panels, cobalt-blue primary CTA, slate text, soft success/warning accents.
- Spacing: consistent 8px system, crisp section boundaries, stable vertical rhythm.
- Accessibility intent: visible drag targets, visible focus state, clear contrast, status always readable by text and color.

Frame composition:
- Include full app shell context (window chrome, left icon rail, AI Agents sidebar with "Agent Teams" active).
- Main content must feel like one continuous builder surface, not a long stacked form.

High-level structure:
- Top area:
  - Title: "Create New Agent Team"
  - Subtitle: "Drag from library to canvas, then assign a coordinator."
  - Right utility action: "Use Template"
- Basics row directly under title (inline, lightweight, not a separate step page):
  - Team Avatar upload area (left side):
    - Circular avatar preview (image or initials fallback)
    - "Upload Avatar" button
    - Optional "Remove" action when avatar exists
    - Helper text: "PNG/JPG, square recommended"
  - Team Name input
  - Team Description input (single-line or compact multiline)
  - No wizard or progress stepper.

Important simplification rule:
- Do NOT show "Basics / Compose Team / Review & Create" step indicators.
- Keep this as a single-screen direct manipulation flow.

Core builder layout (3-column):
- Left panel: "Agent & Team Library"
  - Search input placeholder: "Search agents and teams..."
  - Group sections: "My Agents", "My Teams", optional "Shared Teams"
  - Draggable cards with clear drag handle icon
  - Explicit helper copy at panel bottom: "Drag items from this library into Team Canvas"
- Center panel: "Team Canvas"
  - Empty/drop zone message: "Drop agents and teams here to build your team"
  - Once populated, show ordered member cards
  - Strong directional microcopy near first card: "Dragged from Library -> Canvas"
  - Member cards include:
    - Member display name (default from source item name)
    - Type badge (AGENT or TEAM)
    - Source reference label
    - Coordinator toggle on card row
    - Remove icon/button
- Right panel: "Member Details"
  - Show only essentials for selected member:
    - Member Name
    - Type
    - Source
    - Coordinator toggle
  - No model config, no runtime config, no "Advanced Settings" section.
  - Keep this panel short and minimal (single compact card).

Behavior and validation cues:
- Show avatar preview continuity: chosen team avatar appears in basics row and in a small team identity chip near canvas title.
- Show inline hint that member name auto-fills from dragged item name.
- Show duplicate handling hint, e.g., automatic suffix for collisions.
- Show nested-team safety hint for circular references.
- Validation strip should be inside builder footer area, not detached from content:
  - Checks for "Team Name", "At least 1 member", "Coordinator assigned".

Action area placement requirements:
- Place "Cancel" and "Create Team" in the same builder container footer as validation.
- Footer should be visually attached to the 3-column builder (subtle top border/shadow).
- Keep actions right-aligned: secondary Cancel, primary Create Team.
- Create Team appears enabled only when validation passes.

Data realism:
- Use realistic members such as storyboard_designer, image_generator, audio_generator, video_assembler.
- Include at least one team item in library to convey nested team support.
- Show one selected coordinator state clearly.

Output requirements:
- Polished production mockup with realistic copy and believable spacing.
- No annotations/callouts outside the UI.
- No device frame.
- Hard constraints:
  - Do NOT render any text or UI labeled "Model Config".
  - Do NOT render any text or UI labeled "Advanced Settings".
  - Do NOT render runtime/per-member tuning controls in create flow.
