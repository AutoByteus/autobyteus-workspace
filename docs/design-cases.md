# AutoByteus Design Cases

Real design mistakes from this project's reviews: what the design said, the fix that was adopted, and how to notice the shape next time. Each case names its tickets and findings; the ticket folders (`tickets/done/<name>/`) hold the full story. The general lesson of each case is in the software engineering team's design case studies; this file keeps our provenance.

When the Solution Designer fixes a design mistake that the design principles describe, it adds a case here in the same shape: ticket and finding, what the design said, the fix, why it mattered, and how to notice it. When a new mistake repeats an existing case, add its ticket to that case instead of a new entry.

### Case 1: One Sequence, Two Owners (autobyteus-191, AR-005)

Principles 2 and 13.

- **The design said:** to message a run on another node, the root gets the endpoint from `RemoteRunLinks`, then calls `engine.sendToRemote(input, transmit)`. The engine checks the message, assigns its ID, calls `transmit`, which goes back into `RemoteRunLinks` and the channel, and then commits. The spine's owner read "root + `RemoteRunLinks`". Every dependency pointed the right way, and the second review passed it.

  ```text
  ❌ root → RemoteRunLinks.endpointFor → engine.sendToRemote(input, transmit)
                                            └─ transmit() → RemoteRunLinks → channel
                                         → engine commits the sender's log
  ```

- **The fix:** the root's message delivery owns the order and calls each mechanism itself.

  ```text
  ✅ root: endpoint.allowsSender → engine.prepareRemoteSend → RemoteRunLinks.deliver → engine.commitSentToRemote
  ```

- **Why it mattered:** with the callback, refusal, timeout and partial failure had no single owner, and the next retry or queueing rule would have landed on whichever side someone touched first.
- **Notice it by:** a function passed to one mechanism so it can reach another collaborator; an owner written "A + B". A chain of many coordinators with no main owner is a different mistake (Common Bad-Practice Pattern 2).

### Case 2: One Entry Form Traced, Another Left Open (autobyteus-191, AR-003; autobyteus-278, AR-401; autobyteus-280, AR-002)

Principle 1.

- **The design said:** remote delegation was designed for `delegate_task` with `node`. The tool's other entry form, giving a saved Task (`task_id`) to an existing copy by its run ID, was not traced; given a remote run, it would have tried to assign a saved Task across nodes.
- **The fix:** each entry form of `delegate_task` traced; the existing-copy form refuses a remote run (`REMOTE_SAVED_TASK_NOT_SUPPORTED`) before it resolves the Task.
- **Why it mattered:** a path traced for one form says nothing about another; the untraced form is the one that fails in use.
- **Again in autobyteus-278 (AR-401):** following a remote run's live output read "the run's root publisher" for both kinds of peer-started run. That holds for a Team root. A remote Agent's output, commands and readiness live on its host AgentRun: the standalone root's publisher carries only its children, and idle shutdown replaces the host while the root stays registered. The fix gave each root kind its own `observePairedAgents` / `executeOwnerCommand` behind one interface (Agent: the host via `onHostReady`; Team: the publisher and the directory listener).
- **Again in autobyteus-280 (AR-002):** the design narrowed a startup block to "custom providers unavailable" and traced only provider listing; run start and model resolution, runtime sync, Settings CRUD and token-usage display lookups also read the store, and the owner was written "the store and its callers". The fix: one gate in the store and a table giving each entry form's outcome while pending.
- **Notice it by:** one example standing for every entry form of a tool or API, or one kind ("a run") standing for several.

### Case 3: A Reader Of Derived Data Left Out (autobyteus-191, F-002; autobyteus-275, CR-002; autobyteus-269, F-001; autobyteus-278, F-005; autobyteus-280, AR-003)

Principle 11.

- **The design said:** Team and Org stores compose delegator ↔ remote messages into their stored view. Its table of code reading the changed structure left out the package validators, which still required both message endpoints to be local agents.
- **What happened:** after a restart the validators dropped the stored package, and replies were refused. API/E2E found it; design and architecture review had not.
- **The fix:** a table row "Package-state validation: include as message endpoints"; both validators check endpoints against the store's endpoint set, the one owner of that set.
- **Why it mattered:** code that reads what is derived from a structure (views, endpoint sets, validators, streams) breaks as surely as code that reads it directly.
- **Again in autobyteus-275 (CR-002):** the design let a task agent hold several open Tasks and changed the server rule and texts. It left "the web app" out of scope, though the app's "Assigned to" help line said "When the Task is Done, this agent or team stops." That sentence derived from the old one-Task rule, and it turned false for the first of two Tasks closed. Found by API/E2E in the desktop app. Fix: a derived-consumers table in the design with a decision per consumer, and one always-true sentence ("This agent or team stops when its last open Task is Done or Cancelled.").
- **Again in autobyteus-269 (API F-001, CRR-001):** the server stored a peer-started run's title, and the design said "the window path is unchanged". The window replaced the stored title with the live conversation's first user message for every active run, which showed the task wrapper. Fix: a non-empty stored title wins, in the sidebar merge and the conversation header.
- **Again in autobyteus-278 (API F-004, CRR-003 F-005):** an owner's message to a remote run was to be "marked as from the peer's owner", and the design put the mark in input metadata that no stored conversation, projection, window or agent read. Fix: the mark is a content heading composed by the message's one owner, the metadata is removed, and a consumer table names every reader.
- **Again in autobyteus-280 (AR-003):** the design renamed a token-usage error code that the web matches to show its friendly message (`TokenUsageAnalyticsView.vue`, `TokenUsageRunDetailsView.vue`). The fix: keep the codes, and list both views as derived consumers.
- **Notice it by:** an inventory that lists only the direct readers of a changed structure, or only the server side of a changed rule: user-visible text that states the rule is a consumer too; a new field or mark with no named reader.

### Case 4: Behavior By Absence (autobyteus-191, AR-007)

Principle 13.

- **The design said:** closing a Task fences off its run on another node because the release lookup finds no authority for it (`NO_AUTHORITY`), which then counts as "stopped".
- **The fix:** an explicit `fenced_remote` result where Task executions are released: no release is invoked, the message says what happened, and it is the hook for a later "stop on the peer".
- **Why it mattered:** a behavior reached through a failed lookup works by accident and breaks silently when the lookup changes.
- **Notice it by:** "finds no X, so …", "counts as".

### Case 5: Claims About The Code Taken On Trust (autobyteus-245, AR-202; autobyteus-247, AR-301; autobyteus-280, DI-001; autobyteus-278, AR-404; autobyteus-282, D-1)

Principle 1.

- **The designs said:**
  - autobyteus-245 counted "14 readers" of `rootLaunchConfiguration`; the port method had exactly one. The inflated count kept a second method beside the new one and a dead `rootKind`.
  - autobyteus-247 said the idle shutdown of a Team started by a peer "mirrors `StandaloneHostIdleShutdown`", but it used the user's Stop, which interrupts work in progress.
- **The fixes:** `launchBase()` replaces `rootLaunchConfiguration()` on the port, its one reader, and `rootKind` is removed; the peer-started Team shuts down only when every started member prepares a quiet termination, reusing the Team copy's quiet rule.
- **Why it mattered:** a count and a "mirrors" are claims; checked against the cited code, rule by rule, both fell apart.
- **Again in autobyteus-280 (DI-001):** the design moved a file-name pattern "to its current production owner" because a production-looking module used it. Its importers were never listed: the module (`context-file-record-locators.ts`) was imported only by migrations, and its header said "Migration-only module". The implementation engineer found it; the whole module moved to the migrations' frozen layer.
- **Again in autobyteus-278 (AR-404):** three window copies of a remote run's Retry were merged into one owner, and the design said "behavior is unchanged". Opened side by side, the copies were not one rule: the Team copy skipped the re-read after a successful refresh and picked the first unloaded member, while the other two picked the selected agent or `agents[0]`. Fix: one stated rule (the selected agent, else the first not-loaded one, via an `isLoaded` query) with each family's change against today written down as intended.
- **Again in autobyteus-282 (D-1):** the design restored 9 missing frozen files "whole, no trimming" on two unchecked premises: the trimmed versions were unrecoverable, and the frozen layer held whole copies. Both were false. Following the files' imports pulled in 68 library files, the secret vault among them. `tsc` still failed, because tracked siblings had been pruned in 280. 280's pruner was deterministic and still on disk. Fix (SR-002): restore whole, run the same pruner, prove each file a line subset of its source and every tracked file byte-identical, and commit the pruner.
- **Notice it by:** "mirrors", "as today", "the compiler enforces", a count with no source; a module called "production" without listing its importers; "unchanged" for a merge of copies that were never compared line by line. "unrecoverable" or "the layout matches" without opening the existing files or asking how they were made.

### Case 6: One Rule Applied By Several Callers (autobyteus-280, AR-004)

Principle 13.

- **The design said:** after migrations run, each startup host and the manual-retry resolver read the runner's capability answer and set each capability themselves, three copies of one sequence. The initial "pending" state before the runner answers was left to defaults.
- **The fix:** one owner, `applyCapabilityReadiness(readiness)` with `markCapabilitiesPending()`, called by all three paths, the pending state set explicitly right after the schema check.
- **Why it mattered:** three copies drift. The next capability added would land in one host and not the other, and the state before the answer depended on which default each consumer had.
- **Notice it by:** "the same shape in each host" or "each caller configures …", and a state that exists only because nothing set it yet.


### Case 7: One Word, Two Meanings (autobyteus-191, autobyteus-261; autobyteus-290)

Principle 15.

- **The designs said:** each ticket named its things locally, and each name looked natural on its own:
  - autobyteus-191 (`e15408025f`) stored the peer's `serverInstanceId` as `nodeId`, while `nodeId` already meant the desktop's node-profile ID (`autobyteus-web/types/node.ts`, `types/remoteAccess.ts:50-56`); and `collaboration_model.md` § 2.2 said "a delegated run is a peer, not a part" while "peer" meant a registered node;
  - autobyteus-261 (`3024a61dce`) added `AvailableNode` with `status: "unavailable"` and a tool `list_available_nodes` that lists unavailable nodes too.
- **What happened:** `nodeId` came to mean two IDs in one window, a node's ID got two names (`nodeId`, `serverInstanceId`), and "peer" got three more meanings (a client address, a sibling task agent, a run's standing). No review caught it, because no rule asked for one meaning per word.
- **The fix:** autobyteus-290 (merged `522bc2e825`), under Principle 15 (autobyteus-agents-57):
  - `GLOSSARY.md` at the root, named from `DESIGN.md`: node, node ID, remote, peer, embedded local, entry, client address, sibling, Memory Sync source ID;
  - `nodeId` means only the node's ID (`srv_…`), in code and on the wire (`/rest/remote-access/status`, the iOS app); `serverInstanceId` is gone;
  - a client's own record of a node is an **entry** with an `entryId`: `NodeEntry` on the desktop, `SavedNodeEntry` on iOS and Android, the mobile session;
  - registered peers say peer: `list_peer_nodes`, `PeerNodeDiscovery`, `PeerNodeStatus`, `PeerNodeRef`, `PeerStartedRunViews`;
  - "peer" for other things became "client address" and "sibling"; "a delegated run is a peer" became "a run of its own";
  - Memory Sync's typed identity became `memorySyncSourceId`;
  - stored names were migrated by sealed migrations SM-1 … SM-10 on the server, desktop, browser and phone apps, with backups (`DESIGN.md` rule 10). A failed identity migration holds remote features back (`NODE_IDENTITY_NOT_MIGRATED`) and never mints a new node ID.
- **Again in autobyteus-290 itself (CRR-001 F-001):** the design renamed Memory Sync's "source node id" to `sourceId`, judging the name only against Memory Sync's files. `sourceId` already named three other IDs (a skill source, an update notification's source, a package source; 145 uses). The code review caught it; the fix took the feature's full prefix, which the user chose, matching the feature's other types (`MemorySyncConfig`, `MemorySyncManifest`).
- **Why it mattered:** a word with two meanings makes readers and agents mix up IDs, which is a correctness risk, not only a readability one.
- **Notice it by:** an identifier whose meaning depends on the file it is in; "X, also called Y"; a qualifier that repeats or contradicts the noun; a new name checked only against its own feature's files, especially a common word ("source", "status", "config") without the feature's prefix.
