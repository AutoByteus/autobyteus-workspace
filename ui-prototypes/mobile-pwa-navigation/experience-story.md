# Experience Story: Mobile PWA Navigation Redesign

## 1) Product Story

A user opens AutoByteus on a phone because they are away from their desktop but still want to check active work, continue a run, send a message, inspect files, or see team/tool activity from the desktop-owned node. Success means the phone experience feels like a focused remote-control cockpit, not a squeezed desktop: the user always knows what workspace/run/agent/team they are looking at, where to go next, and how to return home.

## 2) Main Journey

1. User opens `/mobile`; system restores the paired node session and shows `screen_id: mobile_home` with connection status and the most useful next actions.
2. User taps **Continue active run** or **Open workspace**; system opens `screen_id: work_hub` with one selected work context and a clear bottom navigation.
3. User selects a run or agent/team from `screen_id: work_picker`; system opens `screen_id: conversation` with the chat/read/send surface as the primary focus.
4. User taps bottom navigation tabs for **Chat**, **Runs**, **Files**, or **Activity**; system switches one full-screen task area at a time, preserving the selected work context.
5. User needs to change workspace/run/team; user taps the top context title; system opens `screen_id: context_switcher` as a sheet, then returns to the previous screen with the new context.
6. User sends a message or checks status; system provides inline loading/success/error feedback without moving the user into a different navigation model.

## 3) Cognitive Load Criteria

- Learning order: first show connection and one primary action; only reveal workspace/run/team complexity after the user chooses to work.
- Connection strategy: group navigation by user intent, not desktop panel origin: **Home**, **Chat**, **Runs**, **Files**, **Activity**.
- Chunking limit: no more than 4 persistent navigation choices; no nested tab bars visible at the same time.
- Interference control: do not show the desktop left tree as the main mobile navigation; do not reuse labels like “Team” at two different levels.
- Progression policy: unlock advanced/secondary surfaces through sheets or overflow actions after the user has a current context.

## 4) Screen Stories

### screen_id: pairing
- User arrives from: unpaired `/mobile` or expired local session.
- User sees:
  - “Connect this phone” title.
  - One primary path: pairing link/QR payload already filled when opened from QR.
  - Secondary manual server check collapsed under “Troubleshoot connection”.
- User can do:
  - `action_pair_phone`: pair using pasted/scanned payload.
  - `action_check_server`: check manual URL reachability.
- System behavior:
  - when `action_pair_phone` succeeds -> show checking/refresh feedback while the node status and work catalogs load -> go to `mobile_home`.
  - when `action_pair_phone` fails -> stay on `pairing` with diagnostic and retry/new QR guidance.
- Cognitive objective: make first pairing obvious and avoid making the user understand server internals.
- Cognition controls:
  - chunking: one primary button; manual URL is secondary.
  - progressive disclosure: troubleshooting is collapsed by default.
  - clarity guardrails: explain that pairing code is one-time and QR comes from desktop.
- States to prototype: default, payload-prefilled, pairing/loading, error, expired.

### screen_id: mobile_home
- User arrives from: successful pairing, app reopen, or Home nav.
- User sees:
  - Compact top status: connected node + green/yellow/red status.
  - Primary action card: **Continue active run** if one exists, otherwise **Start/open work**.
  - Recent runs list with 3-5 items.
  - Secondary actions: server status, unpair, troubleshooting.
- User can do:
  - `action_continue_run`: open latest active run.
  - `action_open_work_picker`: choose workspace/agent/team/run.
  - `action_check_status`: refresh node status.
- System behavior:
  - when `action_continue_run` -> go to `conversation` for that run.
  - when `action_open_work_picker` -> go to `work_picker`.
  - when `action_check_status` -> inline status refresh.
- Cognitive objective: answer “what can I do now?” immediately.
- Cognition controls:
  - chunking: only primary action, recent work, and status.
  - progressive disclosure: full workspace tree hidden until choosing work.
  - clarity guardrails: status always tells whether remote access is healthy.
- States to prototype: connected, no active run, loading status, disconnected, phone access disabled.

### screen_id: work_hub
- User arrives from: Home, context switcher, or deep link.
- User sees:
  - Mobile app header with current workspace/run/team title and a context-switch affordance.
  - One persistent bottom navigation: **Chat**, **Runs**, **Files**, **Activity**.
  - Current selected tab as a full-screen task surface.
- User can do:
  - `action_switch_context`: open context switcher sheet.
  - `action_nav_chat`: show conversation.
  - `action_nav_runs`: show run list/config.
  - `action_nav_files`: show workspace files.
  - `action_nav_activity`: show team messages/task plan/tools status.
- System behavior:
  - tab actions switch content in place; context is preserved.
  - `action_switch_context` opens `context_switcher`.
- Cognitive objective: replace desktop three-panel layout with one clear mobile work cockpit.
- Cognition controls:
  - chunking: four bottom nav choices maximum.
  - progressive disclosure: no desktop drawer/tree unless inside context switcher.
  - clarity guardrails: header always says current context.
- States to prototype: no selected context, selected run, selected team, connection warning.

### screen_id: work_picker
- User arrives from: Home primary action or context switcher.
- User sees:
  - Segmented picker: **Recent**, **Agents**, **Teams**, **Workspaces**.
  - Search field.
  - Tap targets optimized for phone.
- User can do:
  - `action_select_recent_run`: open an existing run.
  - `action_select_agent_or_team`: choose run target and go to run setup.
  - `action_select_workspace`: change workspace scope.
- System behavior:
  - selecting a run -> go to `conversation`.
  - selecting agent/team -> go to `run_setup`.
  - selecting workspace -> update scope and remain in picker or return to prior screen.
- Cognitive objective: make selection intentional instead of exposing the whole desktop tree.
- Cognition controls:
  - chunking: one list mode at a time.
  - progressive disclosure: workspace hierarchy only when Workspaces tab is chosen.
  - clarity guardrails: every row states type and last activity.
- States to prototype: recent list, search, empty, loading, error.

### screen_id: conversation
- User arrives from: active run, selected run, or run setup success.
- User sees:
  - Current agent/team/run title in header.
  - Conversation messages as main content.
  - Sticky composer at bottom with context-file button and send button.
  - Optional compact status pill for running/idle/error.
- User can do:
  - `action_send_message`: send a message.
  - `action_add_context`: attach context file.
  - `action_open_run_details`: open run details sheet.
  - `action_switch_tab`: move to Runs/Files/Activity.
- System behavior:
  - send -> optimistic/loading state -> stream response or error.
  - add context -> open file/context attachment sheet.
  - run details -> open bottom sheet, not a full navigation jump.
- Cognitive objective: prioritize the core “talk to AutoByteus” action.
- Cognition controls:
  - chunking: only conversation and composer visible.
  - progressive disclosure: tools/details in sheets.
  - clarity guardrails: avoid nested tabs above the conversation.
- States to prototype: idle, streaming, send error, no selected run, context attached.

### screen_id: runs
- User arrives from: bottom nav Runs.
- User sees:
  - Active/recent runs list.
  - Clear start-new-run action.
  - Run configuration only after tapping “Start new”.
- User can do:
  - `action_open_run`: open conversation for a run.
  - `action_start_new_run`: open run setup sheet/screen.
  - `action_stop_run`: stop active run with confirmation.
- System behavior:
  - open run -> go to `conversation`.
  - start new -> go to `run_setup`.
- Cognitive objective: separate “what is running?” from chat and configuration.
- Cognition controls:
  - chunking: list first, config second.
  - progressive disclosure: configuration hidden until requested.
  - clarity guardrails: active status color + type label on each row.
- States to prototype: active runs, empty, loading, stop confirmation, error.

### screen_id: files
- User arrives from: bottom nav Files.
- User sees:
  - Current workspace name.
  - Search and simple file list.
  - File preview opens as a full-screen viewer.
- User can do:
  - `action_open_file`: preview file.
  - `action_search_files`: filter files.
  - `action_attach_file_to_chat`: attach selected file to conversation.
- System behavior:
  - open file -> go to `file_viewer`.
  - attach -> return to `conversation` with context file attached.
- Cognitive objective: make file browsing a supporting task, not competing navigation.
- Cognition controls:
  - chunking: one folder level/list at a time.
  - progressive disclosure: tree depth through drill-in breadcrumbs.
  - clarity guardrails: clear current folder and back action.
- States to prototype: folder list, search, empty folder, file preview, fetch error.

### screen_id: activity
- User arrives from: bottom nav Activity.
- User sees:
  - Segmented content inside one screen: **Task Plan**, **Team Messages**, **Terminal** if supported later.
  - Counts and latest updates.
- User can do:
  - `action_view_task_plan`: expand task plan.
  - `action_view_team_messages`: view accepted inter-agent messages.
  - `action_open_terminal_notice`: see unsupported/coming-soon for terminal if not mobile-supported.
- System behavior:
  - supported sections open inline.
  - unsupported terminal shows clear notice, not broken tabs.
- Cognitive objective: keep secondary “right-panel” information available without making it a second navigation system.
- Cognition controls:
  - chunking: activity is one destination with small sections.
  - progressive disclosure: terminal/advanced tools gated.
  - clarity guardrails: no duplicate top-level Team/Tools labels.
- States to prototype: empty, has messages, has task plan, unsupported terminal, loading.

### screen_id: context_switcher
- User arrives from: tapping current context in header.
- User sees:
  - Bottom sheet with Recent, Agents, Teams, Workspaces.
  - Search.
  - Current selection highlighted.
- User can do:
  - `action_select_context`: choose new context.
  - `action_cancel_context_switch`: close sheet.
- System behavior:
  - select -> update context -> return to previous screen.
  - cancel -> return unchanged.
- Cognitive objective: give a controlled way to change context without opening the full desktop side panel.
- Cognition controls:
  - chunking: sheet not full app shell.
  - progressive disclosure: hierarchy only when needed.
  - clarity guardrails: selection effect is previewed before switching.
- States to prototype: default, search, empty, loading.

## 5) Alternate And Error Paths

- If phone session is missing or corrupted, show `pairing` with “Pair again” and clear local session action.
- If Phone Access is disabled, show `mobile_home` disabled state with “Enable Phone Access from desktop” guidance; protected actions are disabled.
- If server is unreachable, show `mobile_home` disconnected state with retry, selected URL, and LAN/VPN/firewall hints.
- If a route is desktop-only, show an unsupported state in place with a clear reason and a path back to `mobile_home` or previous tab.
- If WebSocket is blocked, keep the user in `conversation` or `runs` and show a stream-specific retry message.
- If no run/workspace is selected, `work_hub` should show a single “Choose work” CTA instead of empty panels.

## 6) Transition Index

| transition_id | trigger | from_screen | to_screen | expected_feedback |
| --- | --- | --- | --- | --- |
| T-001 | Open `/mobile` unpaired | browser | pairing | Pairing form with QR payload if present |
| T-002 | Pair succeeds | pairing | mobile_home | Connected status and primary next action |
| T-003 | Open `/mobile` paired | browser | mobile_home | Session restored, status check starts |
| T-004 | Continue active run | mobile_home | conversation | Selected run title and chat composer visible |
| T-005 | Open work picker | mobile_home | work_picker | Recent/Agents/Teams/Workspaces picker visible |
| T-006 | Select recent run | work_picker | conversation | Run context becomes active |
| T-007 | Select agent/team for new work | work_picker | runs | Run setup shown intentionally |
| T-008 | Tap Chat bottom nav | work_hub | conversation | Chat becomes primary content |
| T-009 | Tap Runs bottom nav | work_hub | runs | Run list appears; config remains hidden unless requested |
| T-010 | Tap Files bottom nav | work_hub | files | File list for current workspace appears |
| T-011 | Tap Activity bottom nav | work_hub | activity | Task/messages/activity sections appear |
| T-012 | Tap header context title | any work screen | context_switcher | Bottom sheet opens over current screen |
| T-013 | Select context | context_switcher | previous work screen | Header updates; content reloads for context |
| T-014 | Unsupported route | any screen | previous/mobile_home with notice | Explanation and recovery action visible |
| T-015 | Network/auth failure | any protected screen | same screen with diagnostic | Retry/re-pair/desktop guidance visible |

## 7) Blocking Questions

- Which mobile task is the highest priority for first redesign validation: continue existing run, start new agent/team run, or inspect files? (owner: product)
- Should mobile support creating new workspace/team runs in the first UX redesign, or only continue/view existing runs? (owner: product/engineering)

---

# Detailed Navigation Specification Addendum

This addendum is the stricter phone-first navigation model. It is intended to replace the current “desktop panels compressed into phone” behavior.

## A) Navigation Philosophy

The phone UI has three navigation layers only:

1. **Global layer**: connection/home, current node, overall app state.
2. **Context layer**: the current work object: workspace, agent/team, run, file, or activity context.
3. **Task layer**: the one task the user is doing now: chat, runs, files, or activity.

The UI must never show more than one navigation layer as a large visual object at the same time. In particular:

- No permanent desktop left sidebar on mobile.
- No nested top tab bars stacked above each other.
- No “Team” as both a top-level tab and a secondary tab.
- No broad tree navigation unless the user explicitly opens a context switcher.
- No right-panel concept on mobile; right-panel content becomes Activity or a sheet.

## B) Persistent Mobile Shell

After pairing, every mobile work screen uses this shell:

### Header region

Top app header, height around 52-60px:

- Left: back/home or context switch button depending on screen.
- Center: current context title, max two lines.
  - Example: `Software Engineering Team / solution_designer`
  - If no context: `AutoByteus`
- Subtitle/status line or pill:
  - `Connected`
  - `Running`
  - `Phone Access disabled`
  - `Offline`
- Right: overflow menu `…` for secondary actions.

The header title is tappable when a context exists. Tapping it opens the context switcher.

### Main content region

One full-screen task surface. No split panels. No desktop side drawer.

### Bottom navigation region

Four persistent tabs after the user is inside work:

1. **Chat**
2. **Runs**
3. **Files**
4. **Activity**

Rules:

- Bottom nav appears only after pairing and after entering the work area.
- Bottom nav does not appear on pairing screen.
- Bottom nav does not appear inside full-screen modals such as file preview; those screens get a back button.
- If a tab has no relevant context, it shows a helpful empty state with one clear action.

## C) Detailed Screen Map

### screen_id: S0_pairing_entry

Purpose: connect this phone to a desktop node.

User arrives from:

- QR link: `/mobile?pairing=<payload>`
- Manual `/mobile` while unpaired
- Local session cleared/expired

Layout:

- Centered card, but less tall than current version.
- Top: AutoByteus Remote Access label.
- Title: `Connect this phone`.
- Step indicator: `Step 1 of 1` only if useful; otherwise omit.
- If pairing payload exists in URL:
  - Show: `Pairing link detected from desktop.`
  - Hide the huge textarea by default.
  - Show primary button: `Pair this phone`.
  - Show device name input below.
- If no pairing payload exists:
  - Show instruction: `Scan the QR code from Desktop > Settings > Nodes > Phone Access.`
  - Show secondary option: `Paste pairing link`.
- Troubleshooting collapsed by default:
  - `Check server URL`
  - Manual URL input
  - `Check` button

Primary actions:

- `A0_pair_detected_pair`
  - User taps `Pair this phone`.
  - System exchanges pairing code.
  - Success -> `S1_mobile_home`.
  - Error -> `S0_pairing_error` state.
- `A0_paste_pairing_link`
  - Expands pairing text field.
  - User pastes QR/link.
  - Button becomes `Pair this phone`.
- `A0_check_server`
  - Checks `/rest/remote-access/status`.
  - Success -> inline status: `Server reachable. Phone Access enabled/disabled.`
  - Failure -> inline diagnostic.

Important improvement from current UI:

- The textarea should not dominate the screen when opened from QR.
- Manual server URL check should be secondary, not equal to pairing.
- The normal QR journey should be one tap.

### screen_id: S0_pairing_error

Purpose: explain why pairing failed and tell user what to do.

Possible states:

- Pairing expired:
  - Message: `This QR code expired.`
  - Action: `Create a new QR on desktop`.
- Phone Access disabled:
  - Message: `Phone Access is disabled on desktop.`
  - Action: `Enable Phone Access on desktop, then create a new QR`.
- Server unreachable:
  - Message: `This phone cannot reach the desktop server.`
  - Action: `Check Wi-Fi/VPN/firewall`.
- Invalid payload:
  - Message: `This pairing link is invalid.`
  - Action: `Paste a valid link or scan again`.

Transitions:

- Retry with new payload -> `S0_pairing_entry`.
- Server check -> remains on error state with updated diagnostic.

### screen_id: S1_mobile_home

Purpose: the safe landing page after pairing and on app reopen.

User arrives from:

- successful pairing
- reopening `/mobile`
- tapping Home from any mobile screen
- network recovery after offline state

Layout:

Top section:

- Title: `AutoByteus`
- Connection card:
  - Node name or base URL shortened.
  - Status pill: `Connected`, `Checking…`, `Offline`, `Phone Access disabled`.
  - `Refresh` small action.

Primary action section:

- If active/recent run exists:
  - Large primary card: `Continue latest run`
  - Shows run/team/agent name, last updated time, running/idle status.
- If no active run:
  - Large primary card: `Start or choose work`

Recent section:

- `Recent work`
- Up to 3-5 recent runs/agents/teams.
- Each row shows:
  - type icon: Agent / Team
  - name
  - status
  - last activity

Secondary section:

- `Choose work`
- `Files`
- `Troubleshoot connection`
- `Unpair this phone` under low-emphasis danger area.

Primary actions:

- `A1_continue_latest_run`
  - Opens `S4_chat` for latest run.
- `A1_open_work_picker`
  - Opens `S2_work_picker`.
- `A1_open_recent_item`
  - Opens relevant `S4_chat` or `S5_runs` depending on item type.
- `A1_open_files`
  - Opens `S6_files` with last/current workspace if known; if no workspace, opens `S2_work_picker` filtered to workspaces.
- `A1_refresh_status`
  - Refreshes status in place.
- `A1_unpair`
  - Opens confirmation sheet `S11_unpair_confirm`.

Important improvement from current UI:

- Replace “Workspace and runs” vague card with concrete user actions.
- Home should not just be a status card; it should guide the next action.

### screen_id: S2_work_picker

Purpose: choose what the phone should work on.

User arrives from:

- Home primary action
- Header context switch
- Empty state inside Chat/Runs/Files/Activity

Layout:

Header:

- Back button to previous screen.
- Title: `Choose work`.
- Search input.

Segmented control:

- `Recent`
- `Agents`
- `Teams`
- `Workspaces`

Content by segment:

- Recent:
  - recent runs and recent selected agents/teams.
- Agents:
  - list of agents.
  - each row: name, short description/status if available, `Start`.
- Teams:
  - list of agent teams.
  - each row: team name, number of agents, `Start`.
- Workspaces:
  - list of workspaces, then drill-in folder/team/run if needed.

Actions:

- `A2_select_recent_run`
  - Opens `S4_chat`.
- `A2_select_agent`
  - Opens `S5_run_setup` with agent selected.
- `A2_select_team`
  - Opens `S5_run_setup` with team selected.
- `A2_select_workspace`
  - Sets current workspace and returns to previous screen, or opens `S6_files` if user came from Files.
- `A2_search`
  - Filters current segment only.

Important improvement from current UI:

- The full desktop tree is not shown immediately.
- The user picks one type of thing at a time.

### screen_id: S3_work_shell

Purpose: common shell for work screens.

This is not a visible standalone screen; it defines the frame for Chat/Runs/Files/Activity.

Header behavior:

- Left button:
  - If user came from Home: back/home icon.
  - If inside nested file preview/setup: back icon.
- Center title:
  - If selected run: run/agent/team name.
  - If selected workspace only: workspace name.
  - Tap title -> `S10_context_switcher`.
- Right overflow:
  - `Status`
  - `Switch work`
  - `Troubleshoot`
  - `Unpair phone`

Bottom tabs:

- Chat
- Runs
- Files
- Activity

Tab transition rules:

- Chat tab -> `S4_chat`
- Runs tab -> `S5_runs`
- Files tab -> `S6_files`
- Activity tab -> `S8_activity`

Important improvement from current UI:

- The top `Running / Files / Team / Tools` tab row should be replaced.
- The hamburger desktop drawer should not be the default context model.

### screen_id: S4_chat

Purpose: the main mobile working screen.

User arrives from:

- Continue latest run
- selecting a run
- starting a new run
- tapping Chat bottom nav

Layout:

- Uses `S3_work_shell`.
- Main area:
  - messages in chronological order.
  - running state indicator near top or in header.
  - loading/streaming indicator when active.
- Bottom sticky composer:
  - text input
  - context attachment button
  - send button
  - optional voice button later

Actions:

- `A4_send_message`
  - Sends message.
  - Shows sending state.
  - Keeps user on Chat.
- `A4_attach_context`
  - Opens `S7_file_attach_sheet`.
- `A4_open_run_details`
  - Opens run details sheet.
- `A4_switch_to_runs`
  - Bottom nav -> `S5_runs`.
- `A4_switch_to_files`
  - Bottom nav -> `S6_files`.
- `A4_switch_to_activity`
  - Bottom nav -> `S8_activity`.

Empty state:

- If no run selected:
  - Show: `Choose an agent or team to start chatting.`
  - Button: `Choose work` -> `S2_work_picker`.

Important improvement from current UI:

- Chat should be the primary phone experience.
- The composer should always be easy to find.
- The user should not need to understand panels before sending a message.

### screen_id: S5_runs

Purpose: see active/recent runs and intentionally configure/start a run.

User arrives from:

- bottom nav Runs
- choosing an agent/team
- Home recent/continue action

Layout:

- Uses `S3_work_shell`.
- Top optional quick action: `Start new run`.
- List sections:
  - `Active`
  - `Recent`
  - `Completed`
- Each run row:
  - name
  - agent/team label
  - status color
  - last update

Actions:

- `A5_open_run`
  - Opens `S4_chat` with selected run.
- `A5_start_new_run`
  - Opens `S5_run_setup`.
- `A5_stop_run`
  - Opens confirmation.
- `A5_retry_failed_run`
  - Opens setup or retry action.

Run setup sub-screen: `S5_run_setup`

Layout:

- Header: `Start run`.
- Shows only the required launch choices first: agent/team, workspace, runtime/model, and first prompt.
- Team mode also shows `First message target`, limited to leaf team members that can receive the first prompt.
- Target and member pickers use phone-friendly search/filtering rather than long native selects.
- Advanced config remains collapsed or omitted unless it is required for the selected runtime/model.
- Primary button: `Start`.
- Launch readiness and blocking copy live in one setup summary; the primary button stays disabled until required target, workspace, prompt, and runtime/model choices are ready.

Actions:

- `A5_setup_start`
  - Starts the run using the selected runtime/model and, for team launches, sends the first prompt to the selected first-message target.
  - Success -> `S4_chat`.
- `A5_setup_advanced`
  - Expands optional parameters.
- `A5_setup_cancel`
  - Returns to `S5_runs` or previous screen.

Important improvement from current UI:

- The current `Running List / Configuration` nested tabs are too abstract.
- Configuration should appear only when starting or editing a run.
- Existing team-run message focus is separate from launch setup: `Message target` can appear on Chat/Files/Activity for the opened team run, but it should not appear on Runs or compete with the setup's `First message target`.

### screen_id: S6_files

Purpose: browse workspace files as a supporting task.

User arrives from:

- bottom nav Files
- Home Files action
- context attach flow

Layout:

- Uses `S3_work_shell` unless launched as attachment sheet.
- Current workspace/folder breadcrumb.
- Search field.
- Simple list:
  - folders first
  - files second
- Each row is a large tap target.

Actions:

- `A6_open_folder`
  - Drills into folder; breadcrumb updates.
- `A6_open_file`
  - Opens `S6_file_viewer`.
- `A6_search`
  - Filters visible folder/list.
- `A6_attach_to_chat`
  - If in attach mode, attaches file and returns to `S4_chat`.

File viewer `S6_file_viewer`:

- Full screen.
- Header back button.
- File name.
- Content preview.
- Actions:
  - attach to chat
  - copy link/path if safe
  - close

Important improvement from current UI:

- Do not show a desktop file explorer tree and content panel at the same time.
- Use drill-in navigation.

### screen_id: S7_file_attach_sheet

Purpose: attach a file/context item to chat without leaving the user lost.

User arrives from:

- Chat composer context button

Layout:

- Bottom sheet or full-height sheet.
- Title: `Add context`.
- Tabs inside sheet only:
  - Recent files
  - Workspace files
  - Upload/photo later
- Search.

Actions:

- `A7_select_context_file`
  - Adds file to composer.
  - Returns to `S4_chat` with attachment visible.
- `A7_cancel`
  - Returns to `S4_chat`.

Important improvement from current UI:

- Attaching context should not navigate the user into the full Files area unless they explicitly choose that.

### screen_id: S8_activity

Purpose: mobile replacement for desktop right-side panels.

User arrives from:

- bottom nav Activity

Layout:

- Uses `S3_work_shell`.
- Activity screen contains stacked cards, not another global tab system.
- Cards:
  - Task Plan
  - Team Messages
  - Tool/Terminal status
  - Run events/logs

Actions:

- `A8_expand_task_plan`
  - Expands task details inline or opens sheet.
- `A8_open_team_messages`
  - Opens `S8_team_messages` detail.
- `A8_open_terminal`
  - If unsupported, show unsupported notice.
  - If later supported, opens terminal screen.
- `A8_refresh_activity`
  - Refreshes cards.

Important improvement from current UI:

- Current Tools -> Team / Terminal / Activity creates another confusing navigation layer.
- Activity should collect secondary information in one place.

### screen_id: S8_team_messages

Purpose: inspect inter-agent/team messages on phone.

User arrives from:

- Activity card

Layout:

- Header back to Activity.
- Message list.
- Each message row:
  - sender
  - time
  - short preview
  - reference files indicator

Actions:

- `A8_open_message`
  - Opens detail sheet or detail screen.
- `A8_open_reference_file`
  - Opens file viewer.

### screen_id: S9_unsupported_feature

Purpose: graceful handling when user reaches a desktop-only area.

User arrives from:

- desktop-only route
- unsupported action

Layout:

- Clear icon and message.
- Example: `Application iframe surfaces are not available on mobile yet.`
- Explain what user can do instead.
- Primary button: `Back to mobile home` or `Back to work`.

Actions:

- `A9_back_home`
  - Goes to `S1_mobile_home`.
- `A9_back_work`
  - Goes to previous work screen if known.

Important improvement from current UI:

- Unsupported features should not look broken or half-loaded.

### screen_id: S10_context_switcher

Purpose: change workspace/agent/team/run without showing desktop left panel as navigation.

User arrives from:

- tapping current context title
- overflow menu `Switch work`

Layout:

- Bottom sheet, 80-90% height.
- Search.
- Segmented control:
  - Recent
  - Agents
  - Teams
  - Workspaces
- Current selection highlighted.

Actions:

- `A10_select_recent`
  - Updates context, closes sheet, opens Chat or previous tab.
- `A10_select_agent`
  - Opens run setup for agent.
- `A10_select_team`
  - Opens run setup for team.
- `A10_select_workspace`
  - Updates workspace context.
- `A10_cancel`
  - Closes sheet.

Important improvement from current UI:

- The desktop tree becomes an intentional switcher, not the main phone navigation.

### screen_id: S11_status_troubleshooting

Purpose: show connection/debug info without cluttering the main UI.

User arrives from:

- Home status card
- overflow menu Troubleshoot
- error diagnostic action

Layout:

- Node URL.
- Phone Access enabled/disabled.
- Last status check.
- REST reachable.
- GraphQL reachable if checked.
- WebSocket reachable if checked.
- Actions:
  - Retry check
  - Copy diagnostics
  - Unpair local phone

Actions:

- `A11_retry_status`
  - Refreshes all checks.
- `A11_copy_diagnostics`
  - Copies safe diagnostic summary, no tokens.
- `A11_unpair`
  - Opens confirmation.

### screen_id: S12_unpair_confirm

Purpose: avoid accidental local session deletion.

User arrives from:

- Home secondary action
- overflow menu
- troubleshooting

Layout:

- Confirmation sheet.
- Text: `This removes the session from this phone only. To revoke access permanently, use Phone Access on desktop.`
- Buttons:
  - `Unpair this phone`
  - `Cancel`

Actions:

- `A12_confirm_unpair`
  - Clears local session.
  - Goes to `S0_pairing_entry`.
- `A12_cancel`
  - Returns to previous screen.

## D) Recommended First Implementation Slice

To make the phone usable quickly, implement in this order:

1. Replace post-pairing home with `S1_mobile_home`.
2. Replace workspace mobile top tabs with `S3_work_shell` + bottom navigation.
3. Make Chat the default primary mobile work screen.
4. Replace desktop hamburger drawer with `S10_context_switcher`.
5. Move current right-side tabs into `S8_activity`.
6. Simplify Runs: list first, config only on demand.
7. Simplify Files: drill-in list and full-screen viewer.

## E) Hard UX Rules For Review

- At most one persistent nav bar plus one header.
- No more than four persistent task tabs.
- No default desktop tree on phone.
- No duplicate semantic labels at different levels.
- Every empty state has one primary action.
- Every error state has one recovery action.
- Chat/composer must be discoverable within one tap after selecting/continuing work.
- User must always know current node and current work context.
- Advanced config/tools appear only by explicit request.
