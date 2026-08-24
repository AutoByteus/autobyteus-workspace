# Deterministic Prototype Scenarios

All values are synthetic, browser-local and resettable. Scenarios preserve real interface rendering and client transitions while replacing production capabilities.

## Contexts

| Context | Visible experience |
| --- | --- |
| `desktop` | Browser window bound to an external trusted node; normal desktop shell |
| `electron_internal` | Electron-capable embedded-node window: Extensions, Updates, embedded server monitor/logs/recovery, native folder actions and Browser tool |
| `electron_external` | Electron-capable window bound to an external node: native capabilities remain, embedded-only server monitor is absent |
| `unpaired` | `/mobile` pairing/setup experience |
| `paired` | Trusted paired-mobile work shell and recent-work picker |

Electron contexts install `window.electronAPI` as a deterministic browser-side host adapter. No Electron package, process or native bridge is present.

## Catalog, Access, And Recovery Scenarios

| Scenario | Representative route/context | Visible purpose |
| --- | --- | --- |
| `populated` | `/agents?view=list`, `desktop` | Normal populated catalogs/settings/navigation |
| `empty` | Agents, Applications, Memory, Skills | Exact empty/redirect patterns |
| `apps_disabled` | `/applications` | Applications navigation removed and route recovery |
| `loading` | `/agents?view=list` | Delayed shell/bootstrap loading surface |
| `team_launch` | `/agent-teams?view=team-list` → `/workspace` | Source-observation fixture for empty pre-launch history, valid Team draft/create/resume, chosen-workspace projection, and launched-member focus |
| `error` | `/agents?view=list` | Recoverable catalog error presentation |
| `permission_denied` | `/mobile`, `paired` | Denied/offline mobile recovery guidance |

## Electron Host Scenarios

| Scenario | Context | Visible purpose |
| --- | --- | --- |
| `populated` | `electron_internal` | Embedded server ready; installed extension; idle/current update |
| `populated` | `electron_external` | Electron actions with external-node window distinction |
| `electron_starting` | `electron_internal` | Startup/loading gate |
| `electron_error` | `electron_internal` | Startup failure, details, logs and advanced recovery |
| `electron_restarting` | `electron_internal` | Restart-in-progress gate |
| `electron_shutdown` | `electron_internal` | Shutdown surface |
| `update_available` | `electron_internal` | Available → downloaded → ready-to-install update feedback |
| `update_error` | `electron_internal` | Recoverable update-service error |
| `extension_missing` | either Electron context | Not-installed extension state |
| `extension_error` | either Electron context | Extension verification failure/recovery state |

## Workspace And Mobile Scenarios

| Scenario | Route/context | Visible purpose |
| --- | --- | --- |
| `workspace_agent_active` | `/workspace`, desktop | Active agent conversation, files/tools/activity/todos/token/artifacts/VNC |
| `workspace_agent_streaming` | `/workspace`, desktop | Progressive assistant content |
| `workspace_agent_completed` | `/workspace`, desktop | Completed/stopped run |
| `workspace_agent_error` | `/workspace`, desktop | Error plus follow-up/recovery |
| `workspace_agent_interrupted` | `/workspace`, desktop | Interrupted/stopped composer |
| `workspace_agent_history` | `/workspace`, desktop | Reopened historical agent run |
| `workspace_team_active` | `/workspace`, desktop | Active team conversation, member focus, team messages/delegations |
| `workspace_team_streaming` | `/workspace`, desktop | Progressive team/member state |
| `workspace_team_completed` | `/workspace`, desktop | Completed team run |
| `workspace_team_error` | `/workspace`, desktop | Team/member error state |
| `workspace_team_interrupted` | `/workspace`, desktop | Interrupted/stopped focused member |
| `workspace_team_history` | `/workspace`, desktop | Reopened team history and message selection |
| `workspace_team_launch` | `/workspace`, desktop | Newly launched synthetic Team selected and immediately projected under `Prototype Workspace`; real left-tree member activation changes the selected row and center Team workspace focus |
| `mobile_agent_active` | `/mobile`, paired | Agent Runs/Setup/Chat/Files/Viewer/Artifacts/Activity |
| `mobile_team_active` | `/mobile`, paired | Team Chat/focus/messages/reference/Files/Artifacts/Activity |

Workspace and mobile scenarios populate real Pinia presentation objects and the real UI reacts to navigation, tab selection, file viewing, attachments, dialogs, focus, interrupt and recovery actions. The data does not persist beyond the isolated browser context.

## Locale And Viewport Matrix

- Base English desktop: all 110 distinct rendered rows, including focused `WKS-022` and `WKS-023`.
- `DZH`: Simplified Chinese at `1440×900`.
- `NEN`: English at `390×844`.
- `NZH`: Simplified Chinese at `390×844`.
- All 41 route rows have all three extra variants (123 comparisons).
- All 34 pre-RER-009 non-mobile correction rows have all three extra variants; the 14 mobile correction rows have `NZH` because their base is already narrow English (116 retained comparisons).
- `WKS-022` and `WKS-023` are explicitly scoped RER-009 desktop-English states enforced inside `JRN-050`; no new locale/responsive equivalence is claimed for them, and no prior matrix row was invalidated.

## Representative Fixture Values

`Research Assistant`, `Documentation Writer`, `Product Review Team`, `Prototype Workspace`, `Brief Studio`, `mock/gpt-prototype`, `/synthetic/prototype-workspace`, deterministic token/cost values, fixture files and fixed timestamps. These values exist only to give the runnable source and prototype identical visible content.
