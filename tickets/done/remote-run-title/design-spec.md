# Design Spec — remote-run-title (autobyteus-269)

## Solution And Approval Basis

- Package: `remote-run-title`; Task autobyteus-269.
- Requirements: [requirements-doc.md](requirements-doc.md), `Approved` at SR-002 by the user. The rule: a run's title is the content of its first message, whoever sends it.
- Current solution revision ID: `SR-004` (Design Impact from CRR-001 / API-REV-001 F-001). Design status: `Ready`.
- Authorities read: `solution-designer/SKILL.md`, `references/architecture-design.md`, `references/design-principles.md`, `references/ticket-scope.md`, the repository's `DESIGN.md` (rules 1, 5, 7, 9; Data Migration Guideline: no migration, DEC-602) and `collaboration_model.md`. All were read in this conversation.
- Conflicts: none.

## Current-State Read

- The title owners are the history catalogs: `AgentRunHistoryCatalogService.recordRunSummary` and `TeamRunHistoryCatalogService.recordTeamRunSummary`. Both keep the first non-empty value and compact it to one line of at most 100 characters.
- Today only the window's message paths call them, after the run accepted the message:
  - `AgentRunCommandCoordinator` → `AgentRunService.recordRunActivity(run, {summary})`;
  - `AgentTeamStreamHandler` → `TeamRunService.recordRunActivity(root, {summary})`.
- A peer's work packet enters through `RemoteMessageReceiver.accept`, which calls the root's `acceptRemoteWorkPacket` with `description: request.content`, the raw task description. No title is recorded (F-02, reproduced in F-03).
- `AgentRunService` builds its own catalog unless one is given, so the title must be written through the run services, not through a catalog singleton.

## Task Size And Architectural Risk (Mandatory)

- `task_size`: `Small`. One trigger in the inbound receiver, one by-ID method on each run service, the composition wiring, the window's title order in two places plus one cleaning function, tests and docs.
- `architectural_risk`: `Low`. There is no contract change between nodes or with the window, no persistence change and no migration (DEC-602). It reuses the existing title owner and rule.
- Escalation trigger: none.

## Intended Change

After a root accepts a peer's work packet, `RemoteMessageReceiver` records the run's title from the packet's content: the description, not the packet wrapper. It records it through the run service of the root's kind, which applies the same first-non-empty rule as a user's first message.

**Window (SR-004).** The stored title is the one source whenever it has a value. The window's live first-message summary only fills in while the stored title is still empty. Before SR-004, the window replaced the stored title with the live first user message for every active run, which shows the packet wrapper for a peer-started Agent (F-04 corrected). See § Window Title Rule.

## Change Scope (Mandatory)

- Changes:
  - `remote-collaboration/inbound/remote-message-receiver.ts`;
  - `compositions/remote-collaboration-composition.ts` (and its call in `build-studio-server.ts` if the picks widen);
  - `agent-execution/services/agent-run-service.ts`;
  - `agent-team-execution/services/team-run-service.ts`;
  - tests;
  - docs: `run_history.md`, `remote_collaboration.md`, `autobyteus-web/docs/agent_orgs.md`, `autobyteus-web/docs/agent_execution_architecture.md`.
- Left alone:
  - the catalogs and their compaction;
  - the window's paths;
  - the work packet text;
  - Org titles;
  - stored runs (no migration).
- Follow-ups found during design: none.

## Window Title Rule (SR-004)

- **Sidebar** (`utils/runTreeLiveStatusMerge.ts` `mergeHistoryRowWithContext`): the live first-user-message summary applies only when the row's stored `summary` is empty. A non-empty stored title wins. Status and activity overlays are unchanged.
- **Conversation header** (`composables/chat/useStandaloneRunTitle.ts`): the same order. The stored history title comes first, and the live first user message is used only while there is no stored title.
- **Display cleaning, one owner each.** Today a user-started run's stored title is the content the window sent, so with skill tags it starts with the skill instruction (F-08). The live summary strips that prefix, the stored one doesn't. So that an active user-started row reads as it does today, the window shows a stored title through the same cleaning as the live one:
  - the skill instruction stays owned by `skillRequestInstruction`, which gains the single-line form a compacted title has: "Use the X skill for this request. …" (the whitespace is collapsed, so there is no blank line);
  - `runTreeSummary` gets one function that cleans a stored title with it. The mention note never reaches the stored title, because the server adds it later.
  - Effect: active rows of user-started runs are unchanged. A stopped skill-tagged run now reads the same as when it was active, without the instruction prefix. That is a small consistency gain, stated to the user.
- **Rejected:**
  - a text filter on "You have a new task" in the window: a second owner of the packet wording;
  - projecting the packet as `system_task_notification` on every runtime: wider, changes the conversation, and isn't needed for the title.
- **Team rows** already show the stored title (CRR-001), and the change keeps that.

## Data-Flow Spine Inventory

| ID | Scope | Start | End | Owner |
| --- | --- | --- | --- | --- |
| DS-001 | Primary | A peer's work packet arrives | The run's history row has its title | `RemoteMessageReceiver` (trigger), the run services and catalogs (rule) |

`peer → PeerGateway → RemoteMessageReceiver.accept (work_packet) → root.acceptRemoteWorkPacket → accepted → titles.recordFirstMessage(targetRoot, content) → AgentRunService.recordRunTitle | TeamRunService.recordRunTitle → catalog first-non-empty → listWorkspaceRunHistory → window`

## Spine Narratives (Mandatory)

1. **When it records:** only after `acceptRemoteWorkPacket` returns accepted, the same moment the window path records after the run accepts the user's message. A refused packet records nothing.
2. **What it records:** the request's `content`, which for a work packet is the raw description A sent (`remote-delegation.ts:118`). The wrapper "You have a new task from …" is built on this node afterwards and is never the title.
3. **Where it records:** by the target root's kind.
   - `agent` → `AgentRunService.recordRunTitle(runId, content)`;
   - `agent_team` → `TeamRunService.recordRunTitle(teamRunId, content)`.
   - The catalog compacts it and keeps the first non-empty value, so a later owner message doesn't replace it (AC-601).
4. **If recording fails:** the packet is still accepted. The failure is logged as a warning naming the run, exactly like the window path (`agent-run-command-coordinator.ts:99-103`). It is not awaited on the answer path.
5. **Messages:** a `message` (not a work packet) never sets a title. Only the run's first message qualifies, and for a peer-started run that is always the packet.

## Ownership Map

| Node | Owns |
| --- | --- |
| `RemoteMessageReceiver` | The trigger: an accepted work packet's content, to its root's title |
| `RemoteRunTitles` (a dependency type in `remote-message-receiver.ts`, built in the composition) | Choosing the run service by root kind |
| `AgentRunService.recordRunTitle(runId, content)` (new) | The standalone run's title through its own catalog; `recordRunActivity(run, input)` now calls it |
| `TeamRunService.recordRunTitle(teamRunId, content)` (new) | The Team run's title; `recordRunActivity(root, input)` now calls it |
| The catalogs (unchanged) | The rule: first non-empty, one line, at most 100 characters |

## Removal / Decommission Plan (Mandatory)

Nothing becomes obsolete. `recordRunActivity` keeps its callers and delegates to the by-ID method, so there is one write path per kind.

## Legacy Removal Policy / Persisted Data

`Not Affected`. Existing rows stay as they are (DEC-602). There is no migration, and no read-time fallback (DESIGN.md "start simple": no scan of memory files on listing).

## Dependency Rules

- Allowed: `compositions → agent-execution / agent-team-execution` services (as today).
- `remote-collaboration` sees only the `RemoteRunTitles` function type; it never imports run-history.
- Forbidden: the receiver writing catalogs directly; the window replacing a non-empty stored title (SR-004).

## Interface Boundary Mapping

```ts
// remote-message-receiver.ts
export type RemoteRunTitles = Readonly<{ recordFirstMessage(root: RemoteTargetRoot, content: string): Promise<void> }>;
// constructor(roots: RemoteRootDirectory, titles: RemoteRunTitles)

// composition
titles: { recordFirstMessage: (root, content) => root.kind === "agent"
  ? input.agentRuns.recordRunTitle(root.runId, content)
  : root.kind === "agent_team" ? input.teamRuns.recordRunTitle(root.runId, content)
  : Promise.resolve() }   // a peer never starts an Org
```

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Rejected because |
| --- | --- |
| A startup migration for old rows | DEC-602: the user chose to leave them |
| The window's live first message overriding the stored title | The server's title is the one source; the override showed the packet header (F-04, SR-004 removes it) |

## Change / Refactor Sequence

1. Add the by-ID methods; make `recordRunActivity` delegate to them.
2. Add `RemoteRunTitles` to the receiver, and the trigger after an accepted work packet.
3. Wire the composition.
4. Tests:
   - receiver unit: an accepted packet records `content` for `agent` and `agent_team`; a refused packet records nothing; a recording failure still answers accepted;
   - services unit: the by-ID methods;
   - two-server E2E: RC-05 and RC-21 assert beta's history title equals the description before any owner message, and RC-12 or a later case asserts that an owner message doesn't replace it.
5. Window (SR-004):
   - the sidebar merge and the header with the stored title first;
   - the single-line skill-instruction form, and the stored-title cleaning.
6. Window tests (SR-004):
   - merge unit: a stored title wins over a live first message that differs; an empty stored title takes the live one; status overlays are unchanged;
   - header composable: the same rule;
   - cleaning: a compacted skill-tagged title reads as the user's text;
   - a durable browser probe (extending API-03): on beta, the active peer-started Agent and Team rows show the description, also after a reload; an active user-started run, with and without a skill tag, reads as today.
7. Docs, including `autobyteus-web/docs` on the title rule (stored first).

## Risks

None material. A peer whose description is only whitespace gives an empty title, as an empty user message does.

## Guidance For Implementation

Keep the change minimal and inside the owners named above.
