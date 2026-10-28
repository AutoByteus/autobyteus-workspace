# Solution Designer Handoff: autobyteus-320 (web-ui-cleanup-round)

- Result: `Architecture Design Complete`, `task_size=Medium`, `architectural_risk=Low` → direct implementation route
- Package: `web-ui-cleanup-round`, Project Task `autobyteus-320`, SR-001
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`) for the user
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/web-ui-cleanup-round`, branch `codex/web-ui-cleanup-round`, base `origin/personal` @ `e72a4702e9`; finalization target `origin/personal`; no release unless asked; prove from a clean clone and with a look at the pages in the app
- Ticket folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/web-ui-cleanup-round/tickets/in-progress/web-ui-cleanup-round/`
- Approval: the user decided DEC-001 (icons), DEC-002 (full runtime names everywhere) and DEC-003 (voice search fills the box) in the Solution Designer's conversation on 2026-10-28; the rest was approved within the direction, with the user informed
- The user's rule: one ticket at a time for this team. Item 1 is his first priority.

## Original request (summary)

A merged round of six small web UI items:
1. Remove the icons beta 15 made visible: the Settings menu icons first, then the decorative ones the user approved.
2. One set of runtime names across server and web.
3. One "Waiting…" state in the Embedding Project indexes card.
4. Literal file names in the skill-update card.
5. The Depends-on picker selects a choosable Task on Enter.
6. A voice input button in Memory → Search, reusing the existing voice input.

Done when each is in the app with tests, proven from a clean clone and merged to personal.

## The user's decisions (quoted in requirements DEC-001…003)

- **Icons:** remove groups A and B of `icon-inventory.md`; keep group C (spinners, icon-only buttons, status, search magnifiers).
- **Runtime names:** "AutoByteus", "Codex App Server", "Claude Agent SDK", "Antigravity CLI", "Grok Build" everywhere, including the chat footer, Run Settings, Settings → Agent Runtimes, update notices and server texts to agents. One list in `@autobyteus/agent-presentation-contracts`.
- **Voice search:** fills the box; the user presses Search.

## Design (see design-spec.md, Per-Item Design)

Six local changes in their existing owners, plus two small consolidations:
- `agentRuntimeName` in the contract package replaces three web maps and the server map;
- the voice status line moves from `components/projects/` to `components/voiceInput/VoiceTargetStatus.vue`, so the project editor, the task composer and Memory search share it.

## Validation expectations

- Unit/component tests per item (see the design). The AC-009 and AC-010 regressions fail on base.
- A look in the app (AC-001, AC-002, AC-003, AC-011):
  - Settings sidebar, Local Tools, MCP Servers and the group B pages;
  - runtime names in the chat footer, model menu, Run Settings, Settings → Agent Runtimes and Model Routing;
  - Memory search voice input with the voice extension enabled, checking:
    - the button is hidden when the extension is not enabled;
    - the same look as the chat input's button;
    - keyboard access (Tab to the button, Enter/Space to start and stop);
    - the transcript in the box, no search until Search is pressed;
    - "no speech" and failure status;
    - the microphone-permission error, as the existing inputs show it;
    - the transcription language follows the existing voice settings.
- Server unit tests for the agent-facing runtime names (AC-004); contract test (AC-005).
- AC-008 (design repository) is with the Product Team (delegated 2026-10-28, coordinator run `product_ui_ux_designer_59eb057cb21e4b06b448096a92028ca4`). The Solution Designer passes their commit to delivery for the report.

## Follow-ups

None.

## Route

Handoff rule "Architecture Design Complete with task_size=Small or Medium and architectural_risk=Low" → `/software_engineering_team/implementation_engineer` (2026-10-28).
