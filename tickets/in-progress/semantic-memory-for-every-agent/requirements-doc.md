# Requirements Document

## Document Status

- Status: `Approved` (SR-007: the founder approved the Memory page UI on 2026-11-20, "Approved", in the Product UI/UX Designer's session; the UI/UX spec below is normative)
- Current solution revision ID: `SR-008`
- Package identifier: `semantic-memory-for-every-agent` (autobyteus-554)
- Request: Project Task autobyteus-554 (the founder's request of 2026-11-19, read by the PM)
- Requested by: `/project_task_manager` (`project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`)
- Requirements owner: Solution Designer (`solution_designer_703182187282472484b90793eac8be40`)
- Date: 2026-11-19
- Approved by and reference: `Solution Designer within the direction (user informed)`; references: the Solution Designer's messages to the user on 2026-11-19 (SR-001: DEC-001…DEC-007; SR-002: DEC-008, DEC-009 after ARCH-REV-001); SR-004…SR-007: `User` (the founder's words, relayed by the Product UI/UX Designer and recorded in the UI/UX spec's confirmation section, and given in the Solution Designer's conversation)
- Behavior-defining supplements and their approved versions: Product-owned UI/UX spec `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/semantic-memory-view-554/ui-ux-spec.md` (Approved 2026-11-20; design repository `/Users/normy/autobyteus_org/autobyteus-web-design` @ `437bad9a`; final references VIS-001…VIS-019 in `visual-references/` beside it); `global-semantic-memory-investigation.md` (evidence only)

## Problem And Desired Outcome

- Problem: semantic memory is on only for agents whose definition (or personal setting) has `semanticMemoryEnabled: true`. The founder wants it for every agent, with no switch. Users also cannot see what an agent has written in its semantic folder.
- Desired outcome: every agent, in every runtime and every run kind, has its semantic memory folder and is told its path. The switch and every check of it are gone. In the Memory area, the user can open a read-only view of each agent's semantic folder: its files and their content.

## Relevant Current And Desired Behavior

| Behavior | Current (evidence) | Desired | Preserved |
| --- | --- | --- | --- |
| BEH-001 | Folder and prompt section only when enabled (INV-2) | Every agent definition: folder prepared and section added at every run start, all runtimes and run kinds | The section text, the folder path, what the folder holds |
| BEH-002 | A switch in the definition form, detail, GraphQL, config file and personal settings (INV-1) | No switch anywhere; the detail shows the folder path for every agent | Other definition fields and personal settings |
| BEH-003 | Stored `semanticMemoryEnabled` in `agent-config.json` and `personal-settings.json` (INV-3…6) | Ignored by readers; dropped at the next save of that file or record; nothing deleted | Every other stored field; existing semantic folders untouched |
| BEH-004 | No way to see a semantic folder in the app | Memory area: read-only list of the folder's files and their content, per agent | Nothing in the folder is written by the view |
| BEH-005 | No shared facts place: product facts live in single agents' notes or workspaces (global-semantic-memory-investigation.md, G-4) | One node-wide global semantic folder every agent is told about and may read and write; shown read-only in Memory → Browse → Global | Each agent's own folder; nothing in the global folder is written by the system or the view |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| UC | Use case |
| --- | --- |
| UC-001 | Every agent run starts with its semantic memory |
| UC-002 | The switch is gone from every surface and check |
| UC-003 | The user views an agent's semantic folder in the Memory area |

### Out Of Scope

- Team- or org-level shared semantic memory (a later level of the hierarchy, DEC-011).
- Editing or deleting semantic files from the app.
- The phone (it has no Memory page, INV-10).
- Imported memory sources (semantic memory is not synced, INV-11).
- Changing the two agent packages in `autobyteus-agents`: they go through the Agent Package Creator route (FU-001).

### Prerequisites

None.

## Requirements

| REQ | Requirement | Behavior | Source |
| --- | --- | --- | --- |
| REQ-001 | Every agent run's instructions carry the semantic memory section with its folder path, the same text as today. The folder is created when missing. This covers every runtime (AutoByteus, Claude, Codex, Grok, DeepSeek harness through ACP, Antigravity) and every run kind (standalone, delegated, team member, org member, application-owned, internal). Claude and Codex give the run access to the folder as today | BEH-001 | Founder; DEC-001, DEC-002 |
| REQ-002 | No definition field, GraphQL field or input, personal setting kind, UI control, localization key or enabled-check for semantic memory remains | BEH-002 | Founder |
| REQ-003 | Stored `semanticMemoryEnabled` keys are ignored on read and absent after the next write of that `agent-config.json` or personal-settings record. No stored file is rewritten just for this. A personal-settings record that held only this field is no longer applied (it applied nothing else) | BEH-003 | Task; Data Migration Guideline |
| REQ-004 | The agent detail page shows the semantic memory folder path for every agent | BEH-002 | DEC-003 |
| REQ-005 | The Memory page has a read-only semantic memory view per agent, browsed as the Skills page shows a skill's folder: the file explorer tree (folders, its search box) on the left, the tabbed file viewer on the right, the agent's name and folder path at the top. Files open in preview only (text and Markdown in the existing viewers; other types as today). An empty folder and a missing folder each show a message without the explorer (the UI/UX spec's state copy); the view never creates the folder | BEH-004 | Founder 2026-11-19 (round-1 review, relayed by the Product UI/UX Designer with his words: "why don't you use that approach directly … I can just click and look at any file I want"; "Yes go ahead with the reader only style view"); DEC-010 |
| REQ-006 | The Memory page's Browse is organized by owner, exactly as the UI/UX spec (UXJ-001…UXJ-005, UIS-001…UIS-004):
  - tabs Global · Agents · Agent Teams · Agent Orgs, opening on Agents, each with cards and no list filter;
  - an agent page (Episodic memory, with the agent's runs from every place it works and a run filter; Semantic memory);
  - team and org pages (Members, each opening its own page; Runs, today's run list);
  - a shared agent opens the same page from every place;
  - "Unattributed runs" last among the Agents cards, with Episodic only;
  - internal agents are hidden while "Show internal agents" is off (autobyteus-308).
  The separate "Semantic Memory" tab and the old runs pages reached from Browse are gone; Search results and the Work Journal inspector are unchanged | BEH-004 | Founder 2026-11-19/20 (DEC-011; round-4 and round-6 words in the UI/UX spec) |
| REQ-007 | Read-only, enforced by the node, not only the UI: every write (write, create, rename, move, delete, upload) to the semantic memory view's folder is refused. The view shows no right-click menu, no create, rename, delete or drag-and-drop, and no edit or save. It reads only inside the agent's semantic folder: a symbolic link is listed as a link but never entered or opened. The view never creates the folder. The folder view's workspace never appears in any workspace list or picker and can never be a run's workspace. It is shown to the same clients that may open the Memory page today | BEH-004 | Task (privacy); DEC-009; DEC-010 |
| REQ-008 | For an imported memory source the view says semantic memory is not part of synced memory | BEH-004 | DEC-005 |
| REQ-009 | The app and the node ship together: the GraphQL change is a clean cut (DESIGN.md rule 9). Stored data written by older versions keeps working (REQ-003) | — | Task |
| REQ-010 | The node has one global semantic memory folder, `<memory>/semantic-global/`, shared by every agent on the node, in every Project. It is created when missing at every agent run start. The system never writes into it otherwise; agents write the content | BEH-005 | Founder 2026-11-20 ("the global memory is just like other semantic memory, it's just a folder"); DEC-012 |
| REQ-011 | Every agent run's instructions carry a Global Semantic Memory section, right after its own Semantic Memory section, with exactly the text of DEC-013 and the folder path. Every agent may read and write it, as it does its own folder: Claude and Codex runs get the folder as an additional accessible or writable root. The runtimes and run kinds are the same as REQ-001 | BEH-005 | Founder (same words); DEC-013 |
| REQ-012 | Memory → Browse → Global shows the global folder: the title "Global memory", the line "Knowledge shared by every agent, agent team and agent org on this node. Every agent reads it and writes to it.", the folder path, and the same read-only folder view as REQ-005 and REQ-007, with its own empty and missing states. An imported source shows the not-synced note (REQ-008) | BEH-005 | Founder 2026-11-20 ("let's add this global tab"); the final UI spec |

## Acceptance Criteria

| AC | REQ | Expected outcome | Verification |
| --- | --- | --- | --- |
| AC-001 | REQ-001 | For a definition with no field (and one with `false`), a run in each runtime gets the section and the folder exists after start; Claude/Codex launch options include the folder | Unit per runtime; live E2E where available |
| AC-002 | REQ-002 | A grep for `semanticMemoryEnabled`/`SEMANTIC_MEMORY`/`AgentSemanticMemoryField` over live code finds only the config writer's retired-key drop and tests of tolerant reading | Command |
| AC-003 | REQ-003 | A definition file with `"semanticMemoryEnabled": false` or `true` loads and its agent has semantic memory. After an edit and save the key is absent and every other key is kept. A personal-settings record with the field loads its other fields; after its next write the field is absent | Unit + API/E2E |
| AC-004 | REQ-004 | The agent detail shows the path for an agent whose config has no field | UI probe |
| AC-005 | REQ-005, REQ-006 | In an isolated instance: an agent with files in nested folders shows them in the explorer tree; opening a file shows it in a preview tab; the search box finds a file by name in that folder only. A team-local agent is listed. An agent with no folder shows the missing-folder state and the folder still does not exist afterwards | UI probe + API/E2E |
| AC-006 | REQ-007 | A definition id that would leave `semantic/` (`..`, `/`, `\`) is refused. Through the API, each write operation on the semantic memory view's workspace is refused and the folder is byte-identical afterwards. A symbolic link to a file and one to a folder outside show as link rows: selecting one opens nothing, its content is refused by the node, and a linked folder is not entered | Unit + API/E2E + UI probe |
| AC-008 | REQ-006 | With "Show internal agents" off, the Model Router is not among the Agents cards (and its page is not reachable from Browse); with it on, it is | Unit + UI probe |
| AC-007 | REQ-008 | With an imported source selected, the view shows the "not synced" note | UI probe |
| AC-009 | REQ-010, REQ-011 | A run in each runtime gets the Global Semantic Memory section with the DEC-013 text and the path; `<memory>/semantic-global/` exists after the start; Claude and Codex launch options include it; an agent can write a file there and another agent's run can read it | Unit per runtime; live E2E where available |
| AC-010 | REQ-012 | Browse → Global shows the global folder's files read-only; writes are refused through the API; an imported source shows the note | UI probe + API/E2E |
| AC-011 | REQ-007 | After opening Semantic tabs and Global, the `workspaces` query lists no `semantic_memory` workspace; a run (any runtime) started with a semantic workspace id is refused `WORKSPACE_NOT_RUNNABLE`; a change inside a linked folder's target does not enter the tree | API/E2E + unit |
| AC-012 | REQ-006 | Measured on an APFS copy of the founder's memory, read only, with no server start (TESTING.md): the local Agents cards and one agent's episodes answer without a whole-node discovery after the catalog's start pass; an imported source's owner query takes ≤ 3 s on the founder's 474-run import (else the escalation in the design) | Measurement |

## UI, Interaction, And Experience Requirements

- Applicable: `Yes`
- UI/UX specification (Product-owned, normative): `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/semantic-memory-view-554/ui-ux-spec.md`
- Runnable UI reference: the design repository `/Users/normy/autobyteus_org/autobyteus-web-design` at `personal@437bad9a` (`corepack pnpm dev --port <port>`, open `/memory`)
- Product ticket: `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/semantic-memory-view-554/product-ticket.md`; review notes, rounds 1–6: `design-review-notes.md` beside it
- User confirmation: the founder, 2026-11-20: "Approved" (see the spec's Status section)
- Final references: VIS-001…VIS-019; illustrative parts are as the spec's inventory marks them
- Every visible detail in the final references is a UI requirement unless the spec marks it illustrative

## Decisions

| DEC | Question | Reasoning And Recommendation | Owner | Status |
| --- | --- | --- | --- | --- |
| DEC-001 | Agents without file tools (a native AutoByteus agent whose definition lists no file tool) | Every runtime except native AutoByteus has built-in file tools. A native agent without a file tool still gets the folder and the section; it cannot use the folder until a file tool is added to its definition. Adding a tool-name check would bring a switch back. The docs say this plainly. Recommendation: no exception. | Solution Designer | Decided |
| DEC-002 | Internal agents (Model Router) | "Every agent": included. It has file tools; its prompt gains the section. | Solution Designer | Decided |
| DEC-003 | Detail page | Show the path for every agent (today only when on). | Solution Designer | Decided |
| DEC-004 | Where the view lives | Superseded by DEC-011 and the approved UI/UX spec: no separate "Semantic Memory" tab; each owner page holds its memory. | — | Superseded (SR-005/SR-007) |
| DEC-005 | Imported sources | Memory Sync does not carry `semantic/` (INV-11): say so, show nothing. | Solution Designer | Decided |
| DEC-006 | Stored personal-setting field | The tolerant reader skips it and logs `PERSONAL_SETTINGS_ENTRY_SKIPPED … semanticMemoryEnabled` at each start until that record is next written (two records on the founder's node). Writing the founder's settings file just to remove it would be a change to his data for no gain. Accept the log line. | Solution Designer | Decided |
| DEC-008 | Internal agents in the tab (ARCH-REV-001 AR-001) | The autobyteus-308 rule already hides internal agents on the Memory page while "Show internal agents" is off. The new tab follows it; opening a folder by id stays allowed, as that rule says. | Solution Designer (existing rule) | Decided |
| DEC-009 | Symbolic links (ARCH-REV-001 AR-002) | Agents can create links in their folder. The node-file loader follows links, so a link row is shown as a link and cannot be opened (Option A). | Solution Designer | Decided |
| DEC-010 | How the folder is browsed (the founder's round-1 review) | The founder asked to reuse the Skills page's folder view. The Skills view is editable and follows links, so the semantic memory view is a read-only form of it: the same explorer and tabs, a workspace the node refuses to write, and links listed but not followed. He confirmed: "Yes go ahead with the reader only style view". | User (via the Product UI/UX Designer, his words) | Decided; UI approved 2026-11-20 |
| DEC-011 | How the Memory page is organized | Memory belongs to owners, and owners form a tree: Global ⊃ Orgs ⊃ Teams ⊃ Agents. An agent owns one semantic folder and many episodes (runs). Navigation by owner, with an agent page holding both memory kinds, replaces the mixed tabs, where one tab was a memory kind. Round 4 (2026-11-20): the founder prefers owner tabs with cards over a tree, and no list filter. Membership is not ownership: a shared agent has one memory wherever it appears. Team-, org- and global-level facts (autobyteus-555) can be added as tabs later without restructuring. | User (founder's word, 2026-11-19) | Decided; UI approved 2026-11-20 |
| DEC-012 | Where global semantic memory lives (the merged autobyteus-555) | It is node-wide, because the founder's examples (product facts used by sales, article writing and others) cross Projects, and the Memory page's Global tab is the node's. It is a sibling folder `semantic-global/` rather than a name inside `semantic/`, where an agent definition id could collide. A team- or org-level folder would be another sibling later. | Solution Designer, on the founder's words (user informed) | Decided |
| DEC-013 | The Global Semantic Memory prompt text | Exactly: "## Global Semantic Memory\n\nThe global semantic memory of this node is the folder `<GLOBAL>`. It is shared by every agent on this node, in every Project and team: facts that are true for everyone, such as what the product is, the words it uses and the user's standing rules. Read it when you need such facts. Write there only what is true for every agent; keep what only you need in your own semantic memory." It is short (about 70 words) and part of the stable instructions, so prompt caching keeps it. | Solution Designer (user informed) | Decided |
| DEC-014 | Who may write global memory; keeping private data out | The founder: "just like other semantic memory": every agent reads and writes it, guided by the DEC-013 text, and the system writes nothing into it. He said earlier that privacy can wait. The promotion and curation of global facts (the memory-maintenance team, agents-105, and the curation skill, agents-104) work through the folder and need nothing from the platform. | User (his words) | Decided |
| DEC-007 | Prompt cost | The section is about 60 words, now in every agent's instructions. It is part of the stable instructions, so prompt caching keeps it. Accepted (the founder's direction). | Solution Designer | Decided |
