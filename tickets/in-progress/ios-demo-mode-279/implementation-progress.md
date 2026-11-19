# Implementation progress — ios-demo-mode-279 (autobyteus-279)

A running record of the build, kept in the ticket so the work stays traceable between rounds. The authority is the design spec (SR-002, with N-1…N-3 applied) and the requirements; this file only says where the build stands.

## Done

- **R-002 premise check: Pass** on the iPhone 17 Pro Max and iPad Air 11-inch (M3) simulators, iOS 26.1 (`evidence/implementation/r002/summary.md`, commit `12e85dcc05`).
  - **Constraint found:** the demo's `WebSocket` must be the class that defines `send`/`close` itself, because noVNC checks a socket's immediate prototype only.
  - **Note for the iPad layout:** on iPad the web view reports a desktop user agent, so the layout must follow the viewport width, never the user agent.

## Step 1: the web demo node (in progress)

Working on the dev server (`AUTOBYTEUS_MOBILE_WEB_BUILD=true AUTOBYTEUS_DEMO_BUILD=1 NUXT_APP_BASE_URL=/ nuxt dev`):

- the run list renders from the world, with statuses over `/ws/run-status`;
- the showcase conversation renders (VIS-007);
- a send plays the scripted turn (tool call, the streamed answer, the closing line, Idle) with no console error;
- the run tree unfolds as the node's (`GetRunTree`, the collaboration and Team streams); a Team member opens, and Stop on a running member leaves it Idle;
- an Org member opens (`GetAgentOrgRunInspection`, `/ws/agent-org`) and a send gets the member reply (VIS-020) with no console error;
- Artifacts, Files (folders, a file, a picture), Activity (VIS-015) and Settings open on the showcase run; a member's Messages (VIS-019) open a reference file;
- New run: the run is prepared, the first send plays VIS-024's reply, and the run heads the list;
- Settings on a stopped run (Codex): the Model sheet as VIS-021, Save kept in memory, reopening shows it; a send then starts the run;
- a send to a member of a stopped Team (Billing Team) starts the Team; Stop in Settings terminates it again; no console error;
- an attached file (`upload.mjs`'s steps) uploads, shows on the message and is named in the reply (VIS-025).

Findings while porting:

- **One invocation, one id.** The reference gave a conversation's tool calls and its Activity separate ids; the phone's member views reconcile the two by id (`reconcileTeamMemberToolState`), so each call showed twice. Activity is now built from the conversation's tool calls (`asActivities`), the showcase's uses its calls' ids, and the PTM's `delegate_task` calls are one per run it delegated (its tree's six).
- **Member header (VIS-020).** The reference shows `content_writer`; the demo names rows by the node's own rule (`rowNameOf`: "content writer"), which is what a real node shows. Recorded for the sweep, not changed in the demo.
- **Closing line.** The member reply ends with the copy table's one closing line (UI spec line 281); VIS-020's screenshot shows an older variant.
- **Inventory gap.** Files' pictures load from `GET /rest/workspaces/:id/content`, which the measured inventory does not list (it saw no picture opened in Files). The demo answers it; the inventory test lists it as a measured-plus-found route.
- **A stopped run's views switch mode.** On the node a session switches to live when its run starts (`connectToActiveRun`, the Team view's in-band snapshot) and back when it stops. The demo does the same (`run_lifecycle`), so the first send to a prepared or stopped run raises no "frame before its snapshot" warning.
- **The REST client sends through `XMLHttpRequest`.** The phone's axios client (`services/api.ts`: uploads, size limits) uses XHR, which the design's transport sentence ("`fetch` and `WebSocket`") does not name. The transport is the page's one network boundary (DS-002, "the demo cannot reach the network"), so it now covers XHR the same way (`demo/demoXmlHttpRequest.ts`, installed by `installDemoTransport`): demo origin to the demo node, page origin / `blob:` / `data:` native, anything else fails offline. No owner or boundary changes; recorded for the reviewer.
- **Reference files.** The node stores a message's references as absolute paths and names each by `sha256(messageId \0 path)`; the demo's messages carry absolute paths in the demo folder and its route resolves the same ids.

| Part | State | Files |
| --- | --- | --- |
| Demo fact in every build | done | `utils/remoteAccess/demoSession.ts` (`DEMO_ENTRY_ID`) |
| Demo plugin registered only for `AUTOBYTEUS_DEMO_BUILD=1` | done | `nuxt.config.ts`, `demo/plugins/00.demoBoot.client.ts` |
| Boot (transport, then world, then session) and the transport | done | `demo/demoBoot.ts`, `demo/demoTransport.ts`, `demo/demoIdentity.ts` |
| Dispatch (loud on anything unknown) | done | `demo/DemoNode.ts` |
| World: runs as trees, definitions, conversations, Activity, background tasks, run trees | done | `demo/world/*` (content ported from the design reference) |
| GraphQL | done | all 43 operations; the table is the complete `DemoGraphqlHandlers`, so a missing one fails the type check (`graphql/*.ts`) |
| REST | done | health, status, node desktop, node files, workspace files, file-change content (three owners), message references (three roots), the showcase picture (`rest/content.ts`) |
| Streams | in progress | done: `/ws/agent`, `/ws/agent-team`, `/ws/agent-org`, `/ws/agent-collaboration` (root views shared with their queries: `world/rootViews.ts`), `/ws/run-status`, `/ws/file-explorer`, the package-definitions and projects feeds; each switches mode when its run starts or stops. To do: the node-desktop RFB |
| Runtime | done | send, Stop, the member reply, New run, terminate (a run and its delegated runs), a stopped run starting on a send, Settings Save in memory, attachments kept in memory and named in the reply (`world/contextFiles.ts`, `rest/contextFiles.ts`) |
| `--demo` build target | done | `scripts/build-mobile-web.mjs`; the build is 12 MB (R-004) |
| Local icons | to do | `plugins/01.localIcons.client.ts`, `scripts/build-icon-bundle.mjs` |
| Contract, inventory and build guard tests; the sweep probes | to do | `demo/__tests__`, `tests/e2e/mobile-demo-*.mjs` |

## Steps 2–5

Not started (design spec, Change Sequence).
