# server-settings - quick_fresh_generated_v6

## Transition Metadata
- Transition ID: `server_settings_fresh_generate_v6`
- Trigger: `system:full-regenerate-detailed-prompt`
- From State: `none`
- To State: `quick_fresh_generated_v6`
- Input Image: `N/A`
- Output Image: `ui-prototypes/server-settings-user-friendly-redesign/images/web/server-settings/server-settings-quick-fresh-generated-v6.png`

## Edit Prompt
Create a production-ready web application settings screen mockup for desktop, high fidelity, aspect ratio 4:3, no device frame, no watermark.

Product and context:
- Product name: AutoByteus
- Screen name: Server Settings
- User type: non-technical and technical mixed users
- Primary job: configure endpoint connections quickly and clearly

Design goal:
- Very clear and simple visual hierarchy
- Avoid clutter and avoid oversized empty blocks
- Keep provider-specific setup sections (do NOT combine providers into one mixed table)
- Make text clean and readable English only, no gibberish

Overall layout (must follow exactly):
1) Left dark vertical app rail with simple icons.
2) Left settings sidebar section showing menu items:
   - API Keys
   - Token Usage Statistics
   - Nodes
   - External Messaging
   - Server Settings (selected)
3) Main content area with heading:
   - Title: "Server Settings"
4) Under title, ONE compact control bar (single row):
   - Left: tabs "Quick Setup" (active) and "Advanced / Developer" (inactive)
   - Right: primary blue button "Save All Changes"
5) Immediately below, provider cards with clean spacing.

Provider cards requirements:
- Exactly 4 cards in this order:
  1. LM Studio
  2. Ollama
  3. AutoByteus LLM Hosts
  4. AutoByteus VNC Hosts
- Each card includes:
  - Card title
  - Small green endpoint count badge (e.g., "1 endpoint", "2 endpoints")
  - Column labels exactly: "Protocol", "Host", "Port" (each shown once, no duplicates)
  - At least one endpoint input row with dropdown/text/number fields
  - A text action "+ Add endpoint" inside card, bottom-left
  - A subtle card-level "Save" button top-right
- No floating save buttons outside cards.

Example endpoint values to render:
- LM Studio: protocol http, host localhost, port 1234
- Ollama: protocol http, host localhost, port 11434
- AutoByteus LLM Hosts:
  - row1: https, 192.168.2.158, 51739
  - row2: https, 192.168.2.158, 51740
- AutoByteus VNC Hosts:
  - row1: ws, localhost, 6088
  - row2: ws, localhost, 6089

Visual style:
- Professional SaaS style, neutral light background
- White cards, subtle borders, subtle shadow
- Clear typography and spacing
- Blue accents for primary actions, muted grays for secondary UI
- Keep density comfortable but compact enough so all four provider cards are visible

Hard quality constraints:
- Clean text rendering and correct spelling for all visible labels
- No duplicate column titles
- No merged providers
- No missing AutoByteus VNC Hosts section
- No gibberish microcopy

## Iteration Log (append-only, latest at bottom)
- Iteration: 1
- Previous Input Image: `N/A`
- Output Image: `ui-prototypes/server-settings-user-friendly-redesign/images/web/server-settings/server-settings-quick-fresh-generated-v6.png`
- Delta Summary: First full generate attempt with strict detailed constraints.
