# Product Design Request — run-settings-ui-unification

- Result classification: `Product Design Requested`
- Purpose: `New Request`
- Package identifier: `run-settings-ui-unification`
- Current SR: `SR-001`
- From: `/software_engineering_team/solution_designer`
- To: `/product_team/product_ui_ux_designer` (per handoff rule: Product Design Requested)
- Date: 2026-10-04
- Approval state: Requirements `Draft` — not approved. The user will review and iterate the UI
  directly with the Product Team; once the user is satisfied with the final UI, return the
  result to Solution Designer to finalize requirements and continue to architecture.

## User's Requested Outcome

The user explicitly asked to send the run-configuration UI work to the Product Team
(2026-10-04): "send a message to the product team to work on the UI. I will discuss with
them about the UI … after I'm satisfied with the UI, then we will continue."

Original complaint (paraphrased, intent preserved):
- The **chat page** shows four pieces of information — workspace, auto-approve, model+runtime,
  thinking — and looks very clean and simple.
- The **Agent run config form** (Agents → agent → Run) shows exactly the same four pieces but
  looks "not clean, not user-friendly".
- The **Agent Team** and **Agent Org** run config forms are "a super long list of
  configuration".
- "We definitely should work on the UI first."

## Focused Decision For Product

Design a clean, consistent run-configuration experience for:

1. New Agent run launch (SCN-001)
2. New Agent Team run launch incl. member customisation (SCN-002)
3. New Agent Org run launch incl. direct-agent / mounted-team / member customisation (SCN-003)
4. Existing (saved) run settings view for Agent / Team / Org (SCN-004)

using the chat composer's four-control footer (SCN-005) as the reference for "clean".

## Current-State Evidence (attached screenshots)

Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/run-settings-ui-unification/tickets/in-progress/run-settings-ui-unification/evidence/user-screenshots/`

- `01-team-existing-run-configuration.png` — saved Team run "Team Configuration"
- `02-chat-new-composer.png` — chat composer (the reference the user likes)
- `03-agent-org-run-config-form.png` — new Org run form with member overrides
- `04-agent-run-config-form.png` — new Agent run form

Key observations (details and code references in `investigation-notes.md`, OBS-001..014):

- Chat: each setting is a single chip; detail lives in a popover. Model and runtime are one
  chip (model primary, runtime secondary; runtime chosen via submenu). Thinking is one chip
  with a merged level menu (Off / low / medium / high).
- Forms: every setting is label + control + help text (~15 rows for 4 decisions). Runtime is a
  separate first-class dropdown. Thinking is split into a switch + description + "Advanced"
  section (Reasoning Effort, Fast mode), auto-expanded. Workspace uses Existing/New toggle +
  big card dropdown + green confirmation line. Definition name shown as a disabled input.
  Lock/status states shown as coloured banners. Auto-approve is a switch in some places and a
  tri-state checkbox in member overrides.
- Team/Org: each member override repeats nearly the whole form (runtime, model, workspace,
  auto-approve, thinking/advanced). Org rows show `TEAM` badges, raw monospace addresses
  (`/product_team`), and "Inherited" pills. The Org warning reads "Select a model for / before
  launch." (raw root address leaked).

## Non-binding Idea Set (shared with the user; not approved — Product chooses its own approach)

- A. Same control vocabulary everywhere: chat-style chip + popover controls in all run panels;
  panel = title + compact four-row settings card + Run.
- B. Existing-run view: fixed values (runtime, workspace) collapse to one locked summary line;
  only editable rows shown; Save appears only when changed.
- C. Team/Org overrides as "defaults + exceptions": compact member table
  (member | model | thinking | approve), inherited values muted, grouped by team, addresses
  only in tooltip, "N customized" count instead of "Member overrides (11)", per-row reset.
- D. Bigger product change: Run opens the chat composer targeted at the agent/team; member
  customisation behind "Customize members".

## Established Constraints (must be preserved)

- All four decisions remain available for new launches; runtime remains selectable for new runs.
- Per-member overrides remain possible (exact override set is an open decision — DEC-002).
- Existing runs: runtime and workspace are fixed; model/model-config editable only when the run
  is stopped; "refresh required" state; historical model config that is no longer in the
  catalog; runtimes where auto-approve is locked (AGY).
- Launch validation states: missing model, invalid model-config schema, runtime catalog
  loading/error with retry, model unavailable.
- Keyboard accessibility parity with chat controls (QR-001).

## Non-Goals / Out Of Scope

- Backend launch semantics, persistence, model catalogs.
- Agent/Team/Org definition editing pages.
- Chat composer redesign (reference only, unless Product proposes otherwise).

## Open Questions For Product + User

- DEC-001: Direction — refresh run panels with chat-style controls (A+B+C) vs "Run opens the
  chat composer" (D).
- DEC-002: Do member overrides need workspace and runtime at all, or only model / thinking /
  auto-approve?
- UNK-002 / UNK-003 (only if D): can chat target Orgs; is launch-without-first-message needed.

## Canonical Paths

- Requirements (Draft): `/Users/normy/autobyteus_org/autobyteus-worktrees/run-settings-ui-unification/tickets/in-progress/run-settings-ui-unification/requirements-doc.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/run-settings-ui-unification/tickets/in-progress/run-settings-ui-unification/investigation-notes.md`
- Solution revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/run-settings-ui-unification/tickets/in-progress/run-settings-ui-unification/solution-revision-record.md`
- Relevant source (base `origin/personal` @ `26b555126`):
  - `autobyteus-web/components/chat/` (ChatComposer, ChatNewSurface, ChatModelMenu, ChatThinkingControl, ChatWorkspaceMenu, ChatApprovalToggle)
  - `autobyteus-web/components/workspace/config/` (AgentRunConfigForm, TeamRunConfigForm, TeamScopeConfigEditor, MemberOverrideItem, AgentOrgRunConfigPanel, AgentOrgRunConfigForm, WorkspaceSelector, ModelConfigSection, ExistingRunConfigEditor, RunConfigPanel)
  - `autobyteus-web/components/launch-config/RuntimeModelConfigFields.vue`

## Workspace Context

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/run-settings-ui-unification`
- Branch: `codex/run-settings-ui-unification`, base `origin/personal` @ `26b555126ebcda7d9fa80d728e24475baba7acb8`
- Finalization target: `personal`

## Expected Output From Product

A user-confirmed UI/UX result (Product-owned spec / visual references, repository revision,
user-confirmation reference, resolved DEC-001/DEC-002) returned to
`/software_engineering_team/solution_designer`. Solution Designer will then integrate it into
the requirements, obtain user approval, and proceed to architecture design.

## Route Record

- `get_handoff_rules` (2026-10-04): matching rule → `/product_team/product_ui_ux_designer`
  ("Product Design Requested"). No other rule matches (no approved package; no architecture
  design; no delivery receipt).
