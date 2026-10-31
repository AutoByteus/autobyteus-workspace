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

### Case 2: One Entry Form Traced, Another Left Open (autobyteus-191, AR-003; autobyteus-278, AR-401; autobyteus-280, AR-002; autobyteus-303, AR-003, CR-003)

Principle 1.

- **The design said:** remote delegation was designed for `delegate_task` with `node`. The tool's other entry form, giving a saved Task (`task_id`) to an existing copy by its run ID, was not traced; given a remote run, it would have tried to assign a saved Task across nodes.
- **The fix:** each entry form of `delegate_task` traced; the existing-copy form refuses a remote run (`REMOTE_SAVED_TASK_NOT_SUPPORTED`) before it resolves the Task.
- **Why it mattered:** a path traced for one form says nothing about another; the untraced form is the one that fails in use.
- **Again in autobyteus-278 (AR-401):** following a remote run's live output read "the run's root publisher" for both kinds of peer-started run. That holds for a Team root. A remote Agent's output, commands and readiness live on its host AgentRun: the standalone root's publisher carries only its children, and idle shutdown replaces the host while the root stays registered. The fix gave each root kind its own `observePairedAgents` / `executeOwnerCommand` behind one interface (Agent: the host via `onHostReady`; Team: the publisher and the directory listener).
- **Again in autobyteus-280 (AR-002):** the design narrowed a startup block to "custom providers unavailable" and traced only provider listing; run start and model resolution, runtime sync, Settings CRUD and token-usage display lookups also read the store, and the owner was written "the store and its callers". The fix: one gate in the store and a table giving each entry form's outcome while pending.
- **Again in agent-input-delivery-simplification (C-1, Project Task `project_task_17bfe0fe`):** the design gave the shared delivery engine one "not accepting messages" rejection per root and used it for every entry form. The Team returns `TEAM_RUN_NOT_ACCEPTING_MESSAGES` only for same-root `deliver`, through its service's pre-check. `acceptFromRemote` and `prepareRemoteSend` skip the service and return the generic `COLLABORATION_ROOT_NOT_ACCEPTING_MESSAGES`. The designer's self-validation found it before review. Fix: a `deliverNotAccepting` rejection used by `deliver` only, and an entry-form table in the design with each form's checks, publish and present rules.
- **Again in autobyteus-303 (AR-003):** the design reused `RuntimeAvailabilityService` for "installed" across four agent runtimes. It checks something different for each: `which`/`--version` via `spawnSync` for Codex and Claude, `agy --help` + `agy models` for Antigravity (so a signed-out Antigravity was left out and the "sign-in could not be checked" rule could never apply), a version + help probe for Grok. Fix: one rule for all, the Agent Runtimes page's `strategy.readVersion(...) !== null`.
- **Again in autobyteus-303 (CR-003, found by API/E2E):** AutoByteus models were taken from the factory's loaded list, traced for static providers only. Discovered providers (Ollama, LM Studio, custom endpoints) are loaded once per configuration by another path and not retried, so a local server serving 4 models was missing. Fix: the read reloads discovered providers through the catalog's own refresh, with a rule per provider kind.
- **Again in backend-port-conflict-20261024 (AR-001):** D1 described backend SIGTERM → app.close as the desktop shutdown path, but Windows used taskkill and had no graceful application request. D2 adds a child-associated IPC request into the same backend close owner, with startup cancellation, result/exit confirmation and bounded forced fallback; the application request and fallback are implemented and independently reviewed. macOS packaged transport and deterministic Windows sequencing are verified; actual Windows/WSL execution remains untested. Merely waiting longer for taskkill would not invoke WSL/native cleanup.
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

### Case 5: Claims About The Code Taken On Trust (autobyteus-245, AR-202; autobyteus-247, AR-301; autobyteus-280, DI-001; autobyteus-278, AR-404; autobyteus-282, D-1; autobyteus-303, AR-001, SR-007; autobyteus-311, M-3)

Principle 1.

- **The designs said:**
  - autobyteus-245 counted "14 readers" of `rootLaunchConfiguration`; the port method had exactly one. The inflated count kept a second method beside the new one and a dead `rootKind`.
  - autobyteus-247 said the idle shutdown of a Team started by a peer "mirrors `StandaloneHostIdleShutdown`", but it used the user's Stop, which interrupts work in progress.
- **The fixes:** `launchBase()` replaces `rootLaunchConfiguration()` on the port, its one reader, and `rootKind` is removed; the peer-started Team shuts down only when every started member prepares a quiet termination, reusing the Team copy's quiet rule.
- **Why it mattered:** a count and a "mirrors" are claims; checked against the cited code, rule by rule, both fell apart.
- **Again in autobyteus-280 (DI-001):** the design moved a file-name pattern "to its current production owner" because a production-looking module used it. Its importers were never listed: the module (`context-file-record-locators.ts`) was imported only by migrations, and its header said "Migration-only module". The implementation engineer found it; the whole module moved to the migrations' frozen layer.
- **Again in autobyteus-278 (AR-404):** three window copies of a remote run's Retry were merged into one owner, and the design said "behavior is unchanged". Opened side by side, the copies were not one rule: the Team copy skipped the re-read after a successful refresh and picked the first unloaded member, while the other two picked the selected agent or `agents[0]`. Fix: one stated rule (the selected agent, else the first not-loaded one, via an `isLoaded` query) with each family's change against today written down as intended.
- **Again in autobyteus-282 (D-1):** the design restored 9 missing frozen files "whole, no trimming" on two unchecked premises: the trimmed versions were unrecoverable, and the frozen layer held whole copies. Both were false. Following the files' imports pulled in 68 library files, the secret vault among them. `tsc` still failed, because tracked siblings had been pruned in 280. 280's pruner was deterministic and still on disk. Fix (SR-002): restore whole, run the same pruner, prove each file a line subset of its source and every tracked file byte-identical, and commit the pruner.
- **Again in agent-input-delivery-simplification (ARCH-REV-003 AR3-NB-002; prerequisite ticket DI-001):**
  - The design said package creation on the first message happens in the "standalone/Org" coordinators; only the standalone coordinator does it. Fix: the claim was corrected against `standalone-root-persistence-coordinator.ts`.
  - Earlier, in `delegated-team-member-lazy-activation`, an event was declared to have "no consumer" from a string search. Its consumer was an un-named fall-through branch that turned it into the member's error card. Fix: check consumers by type and exhaustiveness, and give the branch a name with an exhaustive check.
- **Again in autobyteus-244 (MCP secrets):** the Solution Designer told the user that each run's MCP server gets its own workspace folder (`AUTOBYTEUS_AGENT_WORKSPACE`), because `McpServerInstanceManager` had `setWorkspacePathProvider` and `applyWorkspaceEnv`. Nothing called `setWorkspacePathProvider`, so the claim was false. Fix: the claim was corrected, and the dead workspace code was removed in this change. Lesson: before stating what the product does, find the caller, not only the function.
- **Again in autobyteus-303 (AR-001):** the design reused Claude's model-discovery control query "unchanged" for a zero-token usage read. The SDK writes a string prompt to the CLI as a user turn and drops `maxTurns: 0` (only truthy values are passed), so the "zero-token" query actually sent "Enumerate supported models only." on every catalog read. The probe had used an idle input stream; the design copied the production call instead. Fix: one control query with an input that never yields, used by model discovery and usage alike.
- **Again in autobyteus-303 (SR-007, code reviewer):** the design dropped the `models(modelIds)` limit scope because "no parser can fill it", while the Codex parser fills it from `normalModelSlug` (`codex-usage-limits.ts:49`), covered by a test. Without it, a Codex id would have been matched as a display-name family. Fix: keep the variant; check every producer of a type before removing a variant.
- **Again in backend-port-conflict-20261024 (D4 reviewer lookup question, SR-008):** the design called AgentRunManager.getActiveRun a read-only lookup without following its registry delegate. Inactive discovery actually retires the entry, releases MCP/resources and notifies lifecycle owners. A visibility poll could therefore trigger cleanup. D4.1 specifies a map-only peekPublishedRun boundary plus exact-instance/activity observations before and after the read, leaving existing lifecycle pruning callers unchanged. Notice getter names taken as proof of observational semantics; trace the complete inactive path. The map-only lookup and exact-instance fences are implemented and independently reviewed, with deterministic noninterference and actual query/panel validation.
- **Again in autobyteus-311 (credential proxy, M-3):** autobyteus-244's V1b probe "validated git through the proxy" against a local stand-in git service that accepted `Bearer`. Real GitHub rejects `Bearer` on git (401) and needs `Basic x-access-token:<token>`. Fix: the git route sends GitHub's Basic format, and the test's local `git http-backend` accepts only that format; a gated live check clones from real GitHub. Lesson: a probe's stand-in for an outside service proves our side only; measure the real service's contract once before designing on it.
- **Notice it by:** "mirrors", "as today", "the compiler enforces", a count with no source; a probe's stand-in for an outside service taken as the service; a module called "production" without listing its importers; "unchanged" for a merge of copies that were never compared line by line. "unrecoverable" or "the layout matches" without opening the existing files or asking how they were made. A product behavior stated from a function, without a caller.

### Case 6: One Rule Applied By Several Callers (autobyteus-280, AR-004; autobyteus-260)

Principle 13.

- **The design said:** after migrations run, each startup host and the manual-retry resolver read the runner's capability answer and set each capability themselves, three copies of one sequence. The initial "pending" state before the runner answers was left to defaults.
- **The fix:** one owner, `applyCapabilityReadiness(readiness)` with `markCapabilitiesPending()`, called by all three paths, the pending state set explicitly right after the schema check.
- **Why it mattered:** three copies drift. The next capability added would land in one host and not the other, and the state before the answer depended on which default each consumer had.
- **Notice it by:** "the same shape in each host" or "each caller configures …", and a state that exists only because nothing set it yet.
- **Again in autobyteus-260 (design, 2026-10-25):** agent tool results were turned into text by each tool family on each route (about ten owners): pretty JSON in some, compact in others; empty fields kept in some, dropped by hand in others, and required as `null` by `send_message_to`. The fix: one rule (`autobyteus-ts/src/tools/tool-result-json.ts`) that every platform adapter calls on both routes, the family serializers removed, and an architecture test that fails on a tool result serialized another way. Notice it by: a helper per family that wraps the same library call with different options.


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
- **Again in autobyteus-260 (design, 2026-10-25):** "summary" named a Task's one-liner derived from its description (`search_project_tasks` `summary`, the app's `taskSummary` helpers) and a reduced view (`listProjectSummaries`, `TaskWorkerTaskSummary`). With a stored title, the one-liner is **title** everywhere and "summary" keeps only the reduced-view meaning, both in `GLOSSARY.md`.
- **Why it mattered:** a word with two meanings makes readers and agents mix up IDs, which is a correctness risk, not only a readability one.
- **Notice it by:** an identifier whose meaning depends on the file it is in; "X, also called Y"; a qualifier that repeats or contradicts the noun; a new name checked only against its own feature's files, especially a common word ("source", "status", "config") without the feature's prefix.


### Case 8: A Whole-Run Prerequisite Widens A Narrow Failure (autobyteus-260, CR-001)

Principle 5; Data Migration Guideline § 1 ("Gate narrowly").

- **The design said:** the new `project-task-titles` migration runs after `project-task-keys-v1` (`prerequisiteMigrationIds`), and reads sources with the keyed frozen reader. The current reader requires both `taskKey` and `title`.
- **What happened:** keys-v1 fails per Project by design (an unkeyable Project is preserved and hidden; the others are listed; a restart retries). The runner runs a migration only when its prerequisites succeeded, so one unkeyable Project left titles `NOT_RUN`, and then no Project listed any Task, on every start, until the data was fixed by hand. The API/E2E startup test caught it; design, architecture review and the first code review had not.
- **The fix:** titles depends only on what it needs: the per-folder files (`projects-per-folder-v1`, whose failure already holds all Projects), and accepts Task files with or without a key, because a title comes only from the description. keys-v1 keeps the title when it keys a Task later.
- **Why it mattered:** a whole-run prerequisite turns a predecessor's narrow, contained failure into a global one.
- **Notice it by:** a prerequisite on a migration that can fail for one item while others succeed; a source validator that requires a field the migration does not use.

### Case 9: Process Exit Is Not Resource-Lifetime Completion (backend-port-conflict-20261024, E-003/E-008/E-009, P-003/P-005)

Principles 1, 2 and 13.

- **The existing design did:** native background command managers lived on agent contexts, but background commands outlived those agents. Shutdown omitted those managers. The stop mechanism escalated only while the original process lived, and desktop quit started asynchronous cleanup without awaiting it.
- **The designed correction:** one application-owned native command scope, retained independently of agent contexts; verified process-group drain even after the leader exits; an awaited application quit boundary. The scope and awaited quit boundary are implemented and independently reviewed; current standalone and Studio/macOS journeys verify ended-run and retained-run cleanup, including resistant adopted children and unrelated sentinels.
- **Why it mattered:** isolated probes left an HTTP listener alive after both successful native shutdown and a stopAll result reporting success. Signal delivery and parent exit are not proof that owned resources have gone.
- **Notice it by:** a resource that outlives its registry owner, an asynchronous teardown invoked without an exit barrier, or a completion predicate that checks a parent rather than the resource set. Port-owner inspection is diagnostic evidence, never authority to kill unrelated processes.


### Case 10: Lifetime Continuity Assumed Between Snapshots (backend-port-conflict-20261024, IMP-DI-001)

Principles 1, 2 and 13.

- **The design said:** capture the command shell identity at launch, retain live anchors as it exits, then adopt remaining group members; never signal an unanchored numeric group.
- **What happened:** implementation's real resolver/executor probe captured shell-before-child, then child-after-shell-exit in10/10 cases. The ordinary supported `sleep &` command had no overlapping observed live identity. The safety rule and cleanup requirement could not both be met by the unspecified handoff.
- **The designed correction:** D3 creates a gated internal group/session leader before user code and retains it beyond command-result/agent lifetime until the group is verified empty. It separates command RESULT from anchor exit; WSL explicitly creates a new session. The retained anchor is implemented and independently reviewed; real native scope and composed host tests verify quick shell exit and TERM-resistant cleanup on macOS. WSL session mechanics have deterministic coverage, not live-platform certification.
- **Why it mattered:** faster polling is not an ownership mechanism, and fail-closed is not a successful implementation of a normal supported path.
- **Notice it by:** a promised live identity handoff with no overlap guarantee, or resource completion tied to the exit of a short-lived launcher rather than an explicitly retained owner.


### Case 11: A New Kind Of Run Classified By A Rule It Never Met (autobyteus-32, ARCH-REV-001 AR-001, AR-002)

Principles 2 and 13 (trace the real path; one owner decides).

- **The design said:** the Model Router agent's run has "exactly its listed tools", is confined to its workspace on Codex and Claude, and the server creates it through `AgentRunService`. On Claude, the write check sits in our `canUseTool` coordinator.
- **What happened:** two shared rules decided for the new run without the design naming them. Any standalone run that is not application-owned is collaboration-eligible (`standalone-agent-run-eligibility.ts`), so it would get a member context and with it `delegate_task` and `send_message_to` automatically: an auto-approved, web-reading router could delegate to an unconfined agent, or wait on its own turn. On Claude, allow rules from the user, project and local settings are evaluated before `canUseTool`, so a user's "allow Write" rule would bypass the check. The project and local settings sit in the router's own workspace, which it can write. The architecture review caught both; the design had traced only the new code.
- **The fix (SR-015):** a run-metadata marker `systemRunOwner`, set only by the owning service (`ModelRouterAgent`), kept on restore and read by the eligibility rule. A confined Claude run loads only the user's settings, removes the shell tools, and checks writes in a `PreToolUse` hook, which runs before every other permission step.
- **Why it mattered:** a safety property of a new kind of run is decided by shared rules that run before, or instead of, the new code.
- **Later in autobyteus-32 (CRR-003, SR-018):** the live checks then found the confinement leaking through the runtimes' own configuration (a Codex config file's `writable_roots`, the user's claude.ai connectors in Claude). The design had claimed "thread parameters override config files" without checking which settings they cover (Case 5). The user removed the confinement, so the router runs like any auto-approved agent; the AR-001 marker stays.
- **Notice it by:** a new kind of run, member or session created through a shared service; a claim like "has exactly these tools" or "is confined" without naming every rule that adds tools or approves calls; a check placed at the last step of a pipeline whose earlier steps can approve.

### Case 12: A Requirement Kept Against Its Own Evidence (autobyteus-185, R-002, F-001, UD-020)

Principle 1.

- **The requirement said:** each memory search result shows "each match with its strength" (R-002 of `work-journal-search`). The Task asked for "how strong and by what kind of match (text or meaning)".
- **The evidence already said otherwise:**
  - The ticket's evaluation report (§ 5.3) measured meaning scores: unrelated questions scored 0.74–0.83 and real answers 0.80–0.92, so no absolute cut separates them.
  - `autobyteus-71` had recorded the same lesson (FO-001).
- **What happened:**
  - The requirement was kept and reinterpreted as "a strength in words, not a number". The Product design turned it into Strong / Fair / Weak, and the user approved the page.
  - API/E2E then found unrelated cues rated as matches (F-001).
  - Three calibration rounds followed (SR-005, SR-005b, SR-005c): a lift over a rank baseline, a merge rule, and per-model threshold tables. They passed the known questions only with margins of ±0.0078 (Granite) and ±0.0022 (LEAF-IR), each round with an implementation escalation.
  - The implementation was paused. The user asked whether a strong or weak match can be known from embeddings at all, and removed the labels (UD-020).
- **The fix:** results state facts the index can check:
  - a text match lists the query words found in it ("Words: …");
  - a meaning match carries no grade;
  - the search names the query words that occur in no journal ("Not found in your memory: X.", or "None of these words appear in your memory: X, Y."), checked by an exact match per word, and not shown while the text index is incomplete.
  - Ranking was unchanged, so both quality gates still held.
- **Why it mattered:** the challenge on day one would have offered the final solution. Keeping the wording cost a failed E2E round, three calibration rounds, three reviews and a paused implementation, all on machinery a new question or a growing memory could break.
- **Notice it by:**
  - a grade, label, "confidence" or filter computed from model scores without measured scores of real matches and of verified non-matches;
  - evidence explained away by changing the presentation ("words, not a number");
  - a second failed tuning of the same behavior.
- **Skill change:** `autobyteus-agents-67` (PR #128): feasibility evidence per requirement, the challenge rule, and the stop rule.

### Case 13: A Second Control And Name Map For Something The App Already Has (autobyteus-32, autobyteus-313 SR-001)

Principle: one owner per concern (Duplicated Policy).

- **The design said:** the Model Routing page lets the user choose the Model Router's runtime and model (autobyteus-32). The page was built with two native selects fed by the runtime report and its own runtime-name map ("Claude", "Codex"), and the server stored runtime and model only.
- **What happened:** the router is an ordinary agent, but its launch was chosen with a control no other agent uses, without the thinking level or other model settings, and named with a third set of runtime names beside the app's full names ("Claude Agent SDK") and the model menu's labels ("claude-sonnet-5-5 Claude SDK"). The user found it on the beta (FU-012).
- **The fix (autobyteus-313):** Configuration uses the app's launch controls (`ChatModelMenu`, `ChatThinkingControl`, `ChatModelOptionControl`) through a small adapter; the router's stored launch adds the model settings (one added setting, checked like any agent launch) and its run starts with them; the page's name map is removed and every tab uses the app's two name functions.
- **Why it mattered:** a parallel control drops what the shared one has (thinking, options, search, the same labels), and a parallel name map makes one runtime look like two things.
- **Notice it by:** a new select, list or label map for runtimes or models on a new surface; a stored launch that is a subset of the launch configuration every agent has.

### Case 14: A New Key In A File Older Builds Read Strictly (autobyteus-347, CRR-001 CR-001)

Principle 5 and the Data Migration Guideline (§3 "Compatible changes", § Rolling back).

- **The design said:** record "this run was started under a Project" as an optional `projectId` on run metadata, the Agent and Team history index rows and the Team tree, with "no migration: absence truthfully means none". It checked the current readers only. The requirements also promised that older builds keep reading data written by this build.
- **What happened:** the released index readers (`agent-run-history-index-store.ts` and `team-run-history-index-store.ts`, `parseIndexFile`) reject any row key outside an allow-list. They treat the whole file as invalid and return an empty index, and the catalog writes that index back on the next run creation. A rollback (`RELEASE.md` § Rollback: a revert release or an earlier Docker tag) would show empty Agent and Team history and then drop every earlier row from the index. The code reviewer found it; the implementation engineer had flagged it as a known risk.
- **The fix (SR-009):** the record moved to a new Projects-owned file, `projects/<projectId>/project_runs.json`, beside the Tasks' `agent_run_resources.json` (Projects already owns every Project ↔ run link). Older builds never open it, and no file they read strictly gains a key.
- **Why it mattered:** "a tolerant reader absorbs an optional field" is a claim about every reader of the file, including the released ones a rollback runs. An optional key is compatible only where every reader that meets it ignores it.
- **Notice it by:** a "no migration, optional field" decision that cites only the current reader; a file whose released reader validates against an allow-list of keys; a requirement or release note that promises rollback.
