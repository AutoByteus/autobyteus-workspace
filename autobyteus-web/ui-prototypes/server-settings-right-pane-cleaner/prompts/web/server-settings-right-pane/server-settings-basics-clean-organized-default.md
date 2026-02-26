# Screen Prompt: Server Settings Basics (Clean Organized Default)

## Product Base Spec
- Platform: web app settings page
- Aspect ratio: 16:9 (required)
- Viewport intent: desktop 1600x960
- Visual style: high-fidelity product UI, clean enterprise dashboard
- Tone: calm, structured, low-noise
- Keep left sidebar present but unchanged and de-emphasized; redesign focus is right pane only.

## Screen Requirements
Design a single static screen for "Settings > Server Settings > Basics" where the right pane is significantly cleaner and more organized than a crowded form layout.

Right pane requirements:
- Add a concise section header area: title "Server Endpoints" and one-line helper text.
- Use separate white cards for each provider section: LM Studio, Ollama, AutoByteus LLM Hosts, AutoByteus VNC Hosts.
- In each card header include:
  - provider title
  - short description line
  - small endpoint count badge (for example "1 endpoint")
  - per-card Save button aligned right
- Inside each card, show endpoint rows in a consistent grid:
  - URL-format cards: protocol dropdown, host input, port input, remove icon button
  - host:port cards: host input, port input, remove icon button
- Put "Add endpoint" as a subtle secondary button at the bottom-left of each card.
- Put unsaved/validation helper text at bottom-right when applicable.
- Keep spacing generous and aligned; no cramped edges.
- Keep contrast subtle but readable; avoid heavy borders.

Web Search Configuration requirements:
- Place in its own final card.
- Header with title, helper text, Save action.
- Provider dropdown full width and aligned with card grid.

## Output Image
- Output path: /Users/normy/autobyteus_org/autobyteus-web/ui-prototypes/server-settings-right-pane-cleaner/images/web/server-settings-right-pane/server-settings-basics-clean-organized-default.png
