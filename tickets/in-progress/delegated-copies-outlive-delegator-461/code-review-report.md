# Code Review Report: autobyteus-461 (delegated runs are runs of their own)

The latest implementation result is round 41 (CRR-062, Pass): the merge of the latest base. It comes first. Round 40 (CRR-060), CRR-059, round 35's full review (CRR-051) and earlier results follow as history, with their finding IDs reused. API/E2E round 20 passed (94%). API/E2E round 21 passed on the merged state (95%; the full server E2E folder, and RRT-05 matching the base). The proportional test-code reviews (CRR-050, CRR-061; the latest, CRR-063, Pass) are in `api-e2e-test-review-report.md`, and the package goes to delivery.

## Round 41: Merge Review Of IR-041, The Base `1e8b6e5d0a` (CRR-062)

- Review Entry Point: `Implementation Review` (base-merge Local Fix from delivery). Current Code Review Revision ID: `CRR-062`; Current Review Round: `41`.
- Review Scope: `Targeted Delta Review` of the merge, `c48e331924..339602ff36`:
  - `0f3ae7eca8`, the merge (parents `ae09bc8473` and `1e8b6e5d0a`). It carries another agent's docs message, because that commit landed while the merge was staged. History is not rewritten, and IR-041 records why.
  - `33c9ce8d04`: two merge interactions.
  - 461's own source is unchanged. A Full Re-Audit isn't needed: the review asks whether the merge kept both sides, not whether 461's design changed.
- Classification: task_size `Large`, architectural_risk `High`, unchanged.
- **Method:**
  - `git show --remerge-diff 0f3ae7eca8` shows what the merge commit adds beyond git's automatic merge: the five conflict files and the docs edit, nothing else.
  - `git diff 1e8b6e5d0a HEAD` checks 461's delta on top of the new base for the areas both sides touched.
  - `origin/personal` (`1e8b6e5d0a`) is an ancestor of the head.

**The conflict resolutions: correct.**
1. `context-files.integration.test.ts`: the base's plain `multipart` (its limits now live in the route) and 461's `registerContextFileRoutes(scope, noDelegations())`.
2. `project-task-context-store.test.ts`, `mobile-shell-probe.mjs`: the union of both sides' imports. Both runners are called in the merged body (`runContextFileSizeCases` at line 2524).
3. `composer-context-file-removal-probe.mjs`:
   - The base's CF-013 and CF-014 are taken.
   - The base's CF-009 is left out: its function, header and registry entry. That is correct, because CF-009's premise (a pending Org task agent with no upload owner) can't occur under rule 2 (CRR-056).
   - CF-013 now reads `copyOwnDir(world.agentCopy)` rather than the pre-461 `collabDir`. That is the delegated run's own draft folder, as 461's other cases read it (CR-461-106). `copyOwnDir` and `openAgentCopy` exist in the probe.
   - CF-014 uses only `openAgentCopy` and the settings page, with no hosting-era paths.
4. `memory-sync-task-agent-layout.test.ts`: deleted. 461 removed it with the hosted-copy fixtures it needs, and the base's only change to it was one dropped assertion. Nothing of the base's intent is lost.
- **The base's new phone cases:** `mobile-context-file-size-cases.mjs` has no Org, task-agent, hosting or delegation assumptions, so it needs no change.

**The merge interactions (`33c9ce8d04`): correct.**
- **The base's `context-file-size-limits.integration.test.ts`:** it now registers the routes with `noDelegations()`, as 461's route signature needs.
- **The Codex projection test:** the base had already added `workspaceSkills: createTestRunWorkspaceSkills({ runId })`, so 461's `workspaceSkills: null` became a duplicate key. Keeping the base's fixture is right.

**`src/api/rest/context-files.ts` (auto-merged): correct.**
- On top of the base, 461's delta is exactly its original one:
  - the route takes `Pick<DelegationIndex, "childrenOf">`;
  - `agents:` resolves through `DelegatedChildLocations`.
- The base's size limits (`GET /context-files/size-limits`, the upload cap, limits passed to the upload service) sit beside it untouched.
- The limits are per file type, not per owner. A delegated run's upload under its own owner (rule 2) gets the same limits, so there is no design question.

**Base changes in 461's areas.**
- **Memory Sync:** the base's export reads `agents/` and `agent_teams/`, and every delegated run is an ordinary run there. 461 changes no Memory Sync source.
- **The web typecheck gate:** 461's delta to `typecheck-baseline.json` only lowers or removes entries (files 461 fixed or deleted), never raises them. The base didn't change the gate scripts.
- **The build:** the server `dist` was rebuilt at 21:26, after the last source commit, which replaces the output API/E2E's interrupted build removed.

**Checks.**
- I didn't rerun IMP-127; the merged tree hasn't changed since it ran:
  - type gates at baseline (server 1012 in 316 files; web 87 in 37);
  - `codegen:check` current;
  - web 5678, electron 492;
  - server unit 8204 passed, with 2 folder-watcher timing failures (FU-021; no watcher code in 461 or the merge);
  - the integration suites for `api/rest`, `projects`, `run-history` and context files.
- The full server E2E folder, RRT-05 and the probes are API/E2E's next round, as planned.

**Candidate gate.** No candidate promoted. The merge commit's borrowed message is a history-labelling oddity, not a code concern. It is recorded in IR-041 and needs no rewrite of shared history.

**Scorecard.** As round 40: overall 9.4, every category at 9.2 or above. The merge changes no 461 structure.

**Findings.** None open.

**For API/E2E (planned with the user and the delivery engineer):**
1. The full server E2E folder, once, on the merged code (`339602ff36`).
2. RRT-05, 5 runs each, at the current base `1e8b6e5d0a` (a separate base worktree) and on the branch. `827f1e68dc` is optional. If the base is clean and the branch flickers, F-72 / CR-461-093 reopens as 461's.
3. The merged areas: CF-013 and CF-014 in the composer probe, and the base's phone context-file size cases, as you judge.
4. **If it passes:** I do the proportional test-code review of that round's test changes, and the package goes to delivery.

**Routing.** `Pass`. Recipient: `/software_engineering_team/api_e2e_engineer`. The Implementation Engineer is informed.

---

## Round 40: Implementation Review Of IR-040 (CRR-060)

- Review Entry Point: `Implementation Review`. Current Code Review Revision ID: `CRR-060`; Current Review Round: `40`.
- Review Scope: `Targeted Delta Review` of `63edb246c4..c48e331924`, three code commits: `1c566fe374`, `6555b34c50`, `ac4a39498a`.
- Classification: task_size `Large`, architectural_risk `High`, unchanged.
- Checks:
  - IMP-124: LE-T1 live on AutoByteus/DeepSeek, with vault keys only.
  - IMP-125: RSW-01, one notice live and one after a reload.
  - IMP-126: type gates at baseline; web 5623, electron 492; server unit 8129, with the folder-watcher timing test failing only under load (FU-021).
  - I ran the round's changed server tests (23/23) and web spec (1/1).

**CR-461-114 (`get_handoff_rules`): Resolved.**
- `agentCollaboration()` returns `teamScoped`: a delegated agent run is team-scoped when the run at the **top of its tree** (`DelegationIndex.topOf`) is a Team or an Org run. Its rules stay its own (an Org placement's handoffs, else none).
- **The implementer's choice, confirmed:** gate on the top of the tree, not the one-hop delegator.
  - Base hosted a whole tree in its root, and its gate was the hosting root's kind. That *is* the top of the tree, so this reproduces base exactly (REQ-009).
  - The two rules differ only for a copy that a copy delegated inside a Team or Org tree. Base had the tool there, and so does this.
- Tests cover trees rooted at a Team, an Org and an Agent run, plus a copy's copy in each, and the builder through `resolveRuntimeAgentToolExposure`. Both fail before the fix. LE-T1 passes live.
- **CRR-058's suggestion is done:** `rowNameOf` and `displayNameOf` share `slotNameOf`.

**CR-461-115 (the Org-tree header): Resolved.** `AgentWorkspaceSurface` titles a run an Org delegated by its slot name alone, as it already did for an Agent run's delegated runs. The spec fails without the fix.

**CR-461-116 (the notice shown twice): Resolved, pinned in the code.**
- The switch writes its marker into the run's file in `activateSwitched`, before the run is published and so before its `AgentStreamSequence` attaches. The marker therefore predates the sequence, and every snapshot's stored part carries it. The first input's preface then publishes the notice's live echo, which the sequence also numbered.
- The sequence no longer numbers that one echo (`SYSTEM_TASK_NOTIFICATION` from `system.runtime_handover`). The stored marker is the notice's one source, live and after a reload. Other notices are unchanged.
- **Judgment:** the exclusion is narrow and named after the one event whose stored copy predates the sequence by construction, so it doesn't widen. The live notice now sits where a reload shows it (after the previous reply), where base's live echo was at the reply turn. That's a small position difference toward consistency, recorded as a surface note.
- The test fails before the fix.

**Scorecard.** As round 39, with Runtime Correctness back from 9.1 to 9.3. Overall 9.4, and every category is at 9.2 or above.

**Findings.** None open.

**For API/E2E, a confirming rerun:**
1. F-90: LE-T1 on the CLI runtimes (Claude, Codex) with the user's approved logins, plus a copy's copy in a Team tree.
2. CR-461-115: the Org-tree header.
3. F-91: RSW-01 and the desktop switch, one notice live, its position recorded.
4. A regression pass over the areas this round touched: OST (the agent stream), the live LE suite and the desktop journeys, plus any area you judge affected.
5. **If it passes:** I do the proportional test-code review of `dc00f57d64`, `2ecdb8b356`, `8df4a7ee41` and that round's changes, and the package goes to delivery.

**Routing.** `Pass`. Recipient: `/software_engineering_team/api_e2e_engineer`. The Implementation Engineer is informed.

---

## API/E2E Failure-Origin Review Of API-REV-019 (CRR-059)

### Review Meta

- Review Entry Point: `API/E2E Failure-Origin Review`. Current Code Review Revision ID: `CRR-059`.
- Trigger: API/E2E round 19 (API-REV-019), `Fail` on one new finding, confidence **92%** (from 87%), on `2b20fd0898`; test changes `2ecdb8b356`; evidence `API-r19-runs.txt`, `/tmp/api461/r19`.
- **Proven:**
  - F-87, F-88, F-89 resolved;
  - server E2E 862 (the project-change feed was stale on the new `displayName`, fixed, 7/7; the rest pass alone);
  - every web probe family (SDV, TS, PMU, CFR, osfr, the remote tree, the title probe, RSM, task closure);
  - the phone 53/55 (MSP-50/51 are not 461);
  - **the live suite reworked to 461 and passing on DeepSeek, Codex, Claude and Antigravity** (LE-A1/A2/A3; LE-O1 on three runtimes);
  - **four desktop journeys driven like a user** in an isolated Electron instance: a copy outlives its Hub's Stop and resumes on a switched model; a Team copy opens at its coordinator and only the chevron folds; closure rows leave; a restart restores the tree, names and conversation.
- Scope: F-90 and the two observations.
- **The proportional test-code review** of `dc00f57d64` and `2ecdb8b356` comes with the next passing run (a failed run takes the failure-origin entry point; the two are exclusive). The parts this review relies on are the live suite rework and the base comparison for F-90, which uses base's own suite.
- Classification: task_size `Large`, architectural_risk `High`, unchanged.

### Classification

| Item | Origin (traced) | Classification | Owner |
| --- | --- | --- | --- |
| **F-90 → CR-461-114** | A catalog Agent copy delegated in a Team root has no `get_handoff_rules` (LE-T1 on Claude, Codex and AutoByteus/DeepSeek). Base passes with its own suite, where the copy calls the tool and gets no rules. The gate is `MemberExecutionContext.teamScoped` (`automaticCollaborationToolNames`, `runtime-agent-tool-exposure.ts:17`), defined as "a member of a Team or Org root (configured or task) or of a task Team in any root". At base the copy was hosted as a member of its Team root, so it was team-scoped. Under 461 it is an agent run of its own, so it isn't. That breaks the requirements' Scope: "No change to what an agent reads: tool names, parameters, results and collaboration texts" (REQ-009) | `Local Fix` (server) | Implementation |
| **Observation 1 → CR-461-115** | An opened copy's header reads its slot ("worker") from a Team-root tree, but "writer - E997" from an Org tree (the Agent surface). SR-091: one name everywhere, from `displayNameOf`. One surface doesn't take the server's name | `Local Fix` (web, or the server's resume config for that path) | Implementation |
| **Observation 2 → F-91 → CR-461-116** (addendum `8df4a7ee41`, low) | After a cross-runtime switch, the live chat shows the "Agent runtime changed" notice twice: once right after the previous reply, and once at the reply turn. It also happens on a **user-started** run. RSW-01 on identical web stacks shows base 1 and the branch 2 live; after a reload both show 1, so the stored conversation is right. That points at SR-087's live path: the snapshot by exclusion keeps every entry with no turn and relies on the web ignoring a repeated `messageId` (ARCH-REV-063). A turnless notice that is both in the stored read and a frame after the base, or both in `turn_frames` and live, is applied twice if it carries no stable id. Not pinned. Base's desktop build can't start (its packaged contracts `dist` is incomplete, a base build issue, not a 461 difference) | `Local Fix` (pin: server snapshot or web apply) | Implementation |
| Not 461 | DeepSeek LE-O1 (the model declined the call); Claude LE-F1 (its retired model is back in the catalog); Grok (base fails the same way) | Not 461 | — |

### Required Actions (implementation)

1. **CR-461-114:** a delegated agent run gets `get_handoff_rules` exactly where base's hosted copy did: delegated by a Team run or an Org run (its delegating run's kind), as base's team-scoped placement. A copy delegated by an Agent run stays without it, as base's "task Agent directly under an Agent root". The tool answers the run's own rules (an Org placement's handoffs, `CollaborationTree.agentCollaboration`; otherwise none). Tests per delegating kind, and LE-T1 on one live runtime.
2. **CR-461-115:** the header of a copy opened from an Org tree reads its slot name (`displayNameOf`), as from every other surface. Test it.

### Classification And Routing

- CR-461-114 and -115: `Local Fix` → `/software_engineering_team/implementation_engineer`.
- Observation 2 is held for API/E2E's base comparison.

### Affected Score Rationale

- Runtime Correctness: 9.3 → 9.1 (a tool missing that agents rely on; one naming surface).
- The rest is unchanged.

---

## Round 39: Implementation Review Of IR-039 (CRR-058)

- Review Entry Point: `Implementation Review`. Current Code Review Revision ID: `CRR-058`; Current Review Round: `39`.
- Review Scope: `Targeted Delta Review` of `2abafb39cb..63edb246c4`, five code commits: `e3cc8827b5`, `e5de48606f`, `946e8224db`, `4501a0fed4`, `2b20fd0898`.
- Classification: task_size `Large`, architectural_risk `High`, unchanged.
- Checks:
  - IMP-120 … IMP-123: AFS-001, MSP-24, DCR-001/002, PMU-003/012/016/018; web 5620 passed, electron 492, codegen current; server unit 8125 (the watcher timing test passes alone).
  - I ran the round's changed server tests with the architecture suite (117/117) and web specs (91/91).
  - The dead-export sweep over the delta finds only pre-existing items.

**CR-461-111 (a stopped copy's saved launch not shown): Resolved, pinned on both sides.**
- The Stop made the hub's view not current; the server closed it; the web's `onclose` returned at once, so the hub's tree stayed "stream-fed" with no stream, and the Save's `RUN_TREE_CHANGED` skipped its read.
- Now a closed view always hands its tree back to notice reads; a close while not current is still not recovered; and the Stop's `finish()` reconnects to the stopped run's view (SR-045).
- The server side was already right: `rowChanged` names the hub, and the diff includes `launch`.
- Both new specs fail without the fix.

**CR-461-112 (the phone's extra tree read): Resolved.** The phone's hold watch released and re-held every tree on any change to the list, its order included. Holds are now per run: only arriving runs are held, only leaving runs released. The new spec fails without the fix.

**SR-091 (CR-461-113, one name per delegated run): Resolved.**
- **Server:** `displayNameOf({ delegated, address })` sits beside `openTargetOf`: a delegated run is named after the last segment of its slot, and a run nobody delegated is `null` (its definition names it). `runDisplayNameOf` reads it as the tree row does. It feeds the tree rows, the agent and team resume configs, the history items and the Task view, the last through a composition-bound resolver, as `topRun` is (the projects boundary test is kept).
- **Web:** the context, the header, the Team view (`getDisplayName`), the run list, the Task card and Settings show the server's name. No client derives it.

**Notes, not findings:**
- **Two implementations of one name rule:** `displayNameOf` repeats `rowNameOf`'s normalization (the last segment, with `_` and `-` as spaces). That's the rule SR-091 makes "one name everywhere". Have one call the other, so they can't drift.
- **The handoff's known risks, as decided:**
  - a run whose Task was deleted is named by its definition again, because "delegated" is read from its Task entry, as its row is. Its own file keeps its delegation (`RunOwnAgentsReader`) if the Solution Designer wants the slot kept there;
  - a peer-started run gets its slot name only where this node's index has its entry.

**Scorecard.** As round 38, with Runtime Correctness back from 9.1 to 9.3. Overall 9.4, and every category is at 9.2 or above.

**Findings.** None open.

**For API/E2E:**
1. Recheck F-87 (AFS-001), F-88 (MSP-24) and F-89 (DCR-001/002 under SR-091: a copy's context, header, Task card, Settings and run list all read its slot name).
2. Rerun every area with open or unclassified cases.
3. **The proportional test-code review of your `dc00f57d64` rework** comes with your next passing round.
4. LE-O1 and LE-A1 … LE-T1 once the DeepSeek account is topped up.

**Routing.** `Pass`. Recipient: `/software_engineering_team/api_e2e_engineer`. The Implementation Engineer is informed.

---

## API/E2E Failure-Origin Review Of API-REV-018 (CRR-057)

### Review Meta

- Review Entry Point: `API/E2E Failure-Origin Review`. Current Code Review Revision ID: `CRR-057`.
- Trigger: API/E2E round 18 (API-REV-018), `Fail`, confidence 87% (from 79%), on `bac59031c3`; the probe rework is `dc00f57d64`; evidence `API-r18-runs.txt` and `/tmp/api461/r18`.
- **Proven:**
  - F-80 (CFR 10/10), F-81 (RTP-06), F-82 (PMU 25/25), F-83 (task-closure-tree 16/16), F-86 (DCP-002);
  - F-84 stale as decided (TS 7/7 after the rework);
  - the triage fixes (MSP-06/33/46/52/53, AFS-002);
  - the mocked disclosure and group-icon probes per CR-461-108 and FU-031;
  - full server E2E 871, with the 4 failures passing alone or not 461's (DCF-E2E-007 fails at base too).
- Scope: F-87, F-88, F-89.
- **The test-code review of `dc00f57d64`:** this is a failed run, so the proportional review comes with the next passing round (the entry points are exclusive). I spot-checked the reworks this review relies on. TS-003 asserts each run's own status (SR-082, REQ-001); TS-005 … 007 run with the outer Team expanded (SR-084); MSP-24 ties each tree read to a `RUN_TREE_CHANGED` notice. Each matches the design.
- Classification: task_size `Large`, architectural_risk `High`, unchanged.

### Classification

| Failure | Origin | Classification | Owner |
| --- | --- | --- | --- |
| **F-87 → CR-461-111** | After a Save on a **stopped Agent** copy (AFS-001, 2/2), the save bar reads "Saved." and the copy's own run stored the new model, but 10 s later the card still reads the old model with "Agent default". SR-084's row carries `launch` "as the run has it now" (V-11), and SR-086 G-B1 says a save's launch change emits tree updates, needed because SR-085 removed the save overlay. Either the stopped copy's save doesn't produce that tree change, or the open Settings doesn't apply it. DCP-002 (a Team copy) passes, so pin it on the stopped Agent path | `Local Fix` (pin: server or web) | Implementation |
| **F-88 → CR-461-112** (low) | The phone reads a listed run's tree once more with no rows notice, 8 ms after its run-list read (`ListWorkspaceRunHistory`, `ListCollaborationRootHistory`). The design reads a listed tree when first shown and on each notice (AR-028). A list reload that keeps the run listed and expanded re-shows it as if new. Base made no read after the closes | `Local Fix` (web): a run that stays listed keeps its tree across a list reload | Implementation |
| **F-89 → CR-461-113** | A copy opened from its row is named differently from its row. The rows read the slot ("worker", "writer"); the copy's own context and header use the definition's name ("Slot Worker 0528", "Org Writer b8b2 - 3BBD"). Base named both after the slot. Rule 2 and REQ-014 don't say what a delegated run is called in its own view, and the models are right (AC-004). So there's no authority to judge against | `Requirement Gap` (naming) | Solution Designer |

### Classification And Routing

- CR-461-111 and -112: `Local Fix` → `/software_engineering_team/implementation_engineer`.
- CR-461-113: `Requirement Gap` → `/software_engineering_team/solution_designer`. It is independent of the Local Fixes, so I send both outcomes now; neither waits.
- LE-O1 and LE-A1 … LE-T1 are still blocked by the vault's DeepSeek balance (402).

### Affected Score Rationale

- Runtime Correctness: 9.3 → 9.1 (a stopped copy's saved model isn't shown).
- The rest is unchanged.

---

## Round 38: Implementation Review Of IR-038 (CRR-056)

- Review Entry Point: `Implementation Review`. Current Code Review Revision ID: `CRR-056`; Current Review Round: `38`.
- Review Scope: `Targeted Delta Review` of `3df252e132..7df54669c4`, seven code commits, one stage each: `e19ed3819f`, `492fe23b7e`, `b1e85dd309`, `4c09000dac`, `1c4f2d4173`, `d05f92cbde`, `bac59031c3`.
- Classification: task_size `Large`, architectural_risk `High`, unchanged.
- Checks:
  - IMP-115 … IMP-119: RTP all Pass (RTP-06 included); BR-001/002/003; PMU-003/012/016/018; DCP-002/003; MSP-06/33/46/52/53; AFS-002; web 5613 passed; server unit 8117.
  - I ran the round's changed server test (14/14) and web specs (212/212).
  - A dead-export sweep over the delta finds nothing.

**Resolved:**
- **CR-461-106:** the composer's draft owner comes from what the target browses (a run, a Team member, an Org member; a peer run has none). A delegated run attaches under its own run's owner. The unused owner builders are removed; the owner kind stays only for parsing stored paths.
- **CR-461-107, pinned:** a newly held peer entry whose observation had already ended asks its node once (`refreshEnded` from `hold`); a live one is not asked. Its test fails without the fix.
- **CR-461-108:**
  - opening a row reveals what it opens in the Agent, Team and Org trees. A Team row expands and never folds on open (only the chevron folds), and the selected row is the opened agent's (a delegated Team's coordinator).
  - The Org's delegated pick, which since SR-084 lived only in the store, now drives one shared selection rule (`orgTreeSelection.ts`) for both trees.
  - Selection is presentation state, which clients own.
- **CR-461-109:** an Org's delegated pick records the Org agent above it (`returnTo`), and the view returns there when the row leaves at closure.
- **CR-461-110:** Settings take the focused agent from the delegated pick first.
- **The triage's product fixes:**
  - the phone shows, opens and restores delegated rows from the run trees (MSP-33/46/52/53);
  - the peer send uses `createRandomId` (`crypto.randomUUID` is missing over plain HTTP; MSP-06);
  - AFS-002, this ticket's regression: CR-461-095's guard read the context's target, while since SR-084 the delegated pick is the store's.

**The triage's probe items, for API/E2E** (each cause checked against the code by the implementer; I agree with each against the design):
- **CFR:** CF-002/003/004/005/007/008 expect the old upload owners; CF-009's premise can't occur under rule 2.
- **DLD:** DCP-005, DCR-002/003, DLP-003/004/007 and AFS-001 parse `run-member-<address>@<id>`, while Settings rows are keyed by the tree row key since SR-084 step 2f. DCR-001 looks in an `executionTree` that holds no `taskExecutions`.
- **PMU:** PMU-019 reads the root Team's focused member; PMU-021's Tab reaches CR-461-104's disclosure first; PMU-024 waits for `task_executions_closed`, retired by SR-084.
- **MSP:**
  - MSP-02 expects "beside the member", but the design nests;
  - MSP-03/05/07 use the key `agent:` (the server's is `org_agent:<org>:<agent>`), and MSP-29 uses `agent:` where it is `peer_agent:`;
  - MSP-20/24 expect view re-reads that SR-084 replaced;
  - MSP-22 expects the catch-up read that SR-087 removed.
- TS-003/005/006/007 and the base-drift probes stay as CRR-055 said.

**Scorecard.** As round 37, with Runtime Correctness back from 9.0 to 9.3. Overall 9.4, and every category is at 9.2 or above.

**Findings.** None open.

**For API/E2E:**
1. Rework the probe items above, plus TS-003 and TS-005/006/007 (with the outer team expanded), `team-group-icon` B01 and `agent-org-task-team-disclosure` to CR-461-108's rule.
2. Recheck F-80 … F-83 and F-86, and the triage's product fixes.
3. Rerun every area that still has open or unclassified cases, so the result is complete.
4. LE-O1 and LE-A1 … LE-T1 once the DeepSeek account is topped up.

**Routing.** `Pass`. Recipient: `/software_engineering_team/api_e2e_engineer`. The Implementation Engineer is informed.

---

## API/E2E Failure-Origin Review Of API-REV-017 (CRR-055)

### Review Meta

- Review Entry Point: `API/E2E Failure-Origin Review`. Current Code Review Revision ID: `CRR-055`.
- Trigger: API/E2E round 17 (API-REV-017), `Fail`, on `568dea0159` (CRR-054); test changes `3df252e132`; evidence `API-r17-runs.txt`, raw evidence in `/tmp/api461/r17`.
- **Proven:**
  - the stale tests are reworked (one shared `/ws/agent` reader; full server E2E 870 passed, the 5 remaining were test clients, now fixed);
  - F-76 … F-79 and CR-461-105 are resolved (SDV 7/7, BR-001/002/010, osfr 8/8);
  - **RTP-04 ×2 renders the peer row's node label, files "on {node}" and no `@`.**
- Scope: F-80 … F-84, F-86, and the unclassified items.
- Classification: task_size `Large`, architectural_risk `High`, unchanged.

### Classification

| Failure | Origin | Classification | Owner |
| --- | --- | --- | --- |
| **F-80 → CR-461-106** | A delegated run launched from an Org can't attach files in its composer. It uploads under an `org_member_draft` owner, and the server refuses ("Unable to resolve Org context-file owner '<org>/<task agent>'"). Under rule 2 the delegated run is its own run, so its draft owner is its own run's (an agent run's, or its team member's), not an Org member's. The composer's draft owner still derives from the Org view it was opened from | `Local Fix` (web) | Implementation |
| **F-81 → CR-461-107** | With beta stopped, a peer row under a **Team** delegator never reads "Couldn't reach {node}" (RTP-06, 2/2). The standalone and Org families do, and round 15 passed. So the Team family's peer row doesn't reach the run's unreachable state on `/ws/run-status` (or the Team row doesn't render it) | `Local Fix` (pin: server or web) | Implementation |
| **F-82 → CR-461-108** | A delegated Team opened at its coordinator (from its row, PMU-003, or its Task card, PMU-018/019) is folded, so the coordinator's row is hidden. Round 14 was 25/25. Base differed per view (Agent opened without folding; Org folded and inspected; Team only expanded). FU-031's direction, which the user accepted, is one row behavior in every view: a Team row opens its coordinator. **Rule:** opening a row reveals what it opens. A Team row expands and selects its coordinator; it never folds on open. Folding is the chevron's only. That keeps CR-461-104's fix (agent rows never fold) | `Local Fix` (web) | Implementation |
| **F-83 → CR-461-109** | In an Org, the view doesn't return to the delegating Manager when the open run's row leaves at closure (BR-003). The Agent family passes, and round 15 passed. Base's `returnToHostWhenUnlisted` rule isn't applied in the Org view since the tree change | `Local Fix` (web) | Implementation |
| **F-86 → CR-461-110** | Settings of a delegated Team copy opened in a Team tree show the delegating Team's configuration (DCP-002). The Settings subject for a delegated Team row in a Team tree resolves to the tree's own run | `Local Fix` (web) | Implementation |
| F-84, TS-003 | A Team run's row no longer reads busy while only its delegated agents work. That is SR-082's decision (each run's status is its own; a team's own status is its members', G-A4). Base's busy came from hosting | **Stale test** (under SR-082, user-approved) | API/E2E; recorded as a deliberate surface change |
| F-84, TS-005/006/007 | With the outer delegated Team collapsed, the nested delegated Team's row is hidden. SR-084 nests each delegated run under the agent or member that delegated it, so it is inside the collapsed team. Base laid it out differently | **Stale test** (under SR-084, user-approved). If the row is also missing when the outer Team is **expanded**, that is a finding | API/E2E: assert with the outer team expanded |
| Mocked probes `existing-run-model-config`, `interrupt-result-presentation` | Base drift (operations and model menus at base) | Not 461 | API/E2E |
| `team-group-icon` B01, `agent-org-task-team-disclosure` | Their expectations are base's per-view row semantics | Settled by CR-461-108's rule | API/E2E, after the fix |
| Unclassified: DLD (DCP-003/005, DCR-001/002/003, DLP-003/004/007, AFS-001/002); the phone (MSP-02/03/05/06/07/20/22/24/29/33/46/52/53); PMU-021/024 | Many plausibly share the causes above (Settings subjects, open and fold rules). **The implementer triages them in this round:** fix what is product, with tests; report what is probe | Hold → implementer triage | Implementation |

### Required Actions (implementation)

1. **CR-461-106:** a delegated run's composer uploads under its own run's draft owner, whatever view it was opened from.
2. **CR-461-107:** a peer row under a Team delegator reads "Couldn't reach {node}" while its node is down, as the other families do.
3. **CR-461-108:** opening any row reveals what it opens. A Team row expands and selects its coordinator in every view and never folds on open; only the chevron folds.
4. **CR-461-109:** the Org view returns to the delegating agent when the open run's row leaves at closure.
5. **CR-461-110:** Settings of a delegated Team opened from a Team tree show that Team's own configuration.
6. **Triage the unclassified DLD, phone and PMU cases** listed above. Each new test fails without its fix.

### Classification And Routing

- CR-461-106 … -110 and the triage: `Local Fix` → `/software_engineering_team/implementation_engineer`.
- TS-003, TS-005/006/007 and the base-drift probes are API/E2E's (stale or not 461).

### Affected Score Rationale

- Runtime Correctness: 9.3 → 9.0 (file attach, a peer state, the open and fold rule, the Org return, the Settings subject).
- The structural categories are unchanged.

---

## Round 37: Implementation Review Of IR-037 (CRR-054)

- Review Entry Point: `Implementation Review`. Current Code Review Revision ID: `CRR-054`; Current Review Round: `37`.
- Review Scope: `Targeted Delta Review` of `b7a77b8279..568dea0159`, one stage per commit: `5e7f627d49`, `4979fcee52`, `e999b4cbaa`, `f78c3e28cd`, `8f91060e61`.
- Classification: task_size `Large`, architectural_risk `High`, unchanged.
- Checks:
  - IMP-110 … IMP-114: probes SDV-01/03/06/07 and BR-001/002 pass on the final build; server unit 8115; the web suite green.
  - I ran the round's changed server tests (68/68) and web specs (70/70).
  - API/E2E's uncommitted e2e rework is in the worktree, untouched by the implementer.

**CR-461-101 (`CONNECTED` before the session takes commands): Resolved.** The Team and Org view sessions send `CONNECTED` right before the snapshot, after every read (base's order), and the handler's connect resolves in that step. One test per kind holds the stored read open and sends a command on `CONNECTED`; both fail on the old order.

**CR-461-102 (delegated runs from Team and Org surfaces): Resolved.**
- **Org:** the route watch in `AgentOrgWorkspaceView` re-selected the route's agent as one of the Org's own, which cleared a delegated row. `selectRouteAgent` now selects an Org agent in the Org, and a delegated run (local or peer) by its tree row, re-applied when the tree arrives.
- **A Team top's Task card:** a Team-delegated worker opens the Team, then its own row, not as a Team member.
- **Specs:** an Org's own agent, a delegated agent, a delegated Team, a peer row, a late tree; Team top × agent worker, Team worker and member.

**CR-461-103 (tree statuses): Resolved, pinned.**
- **SDV-01:** the root unregistered before the run's final status; `unbindStoppedRun` sent the live projection (`idle`) and left. The session now keeps the run's frames until its `AgentStreamSequence` ends (`untilSequenceEnds`), so the run's own `offline` arrives. A run restored meanwhile stays bound. The test of that order fails on the old unbind.
- **TS-004/007 and BR-010:** the shared delegated row had lost `data-status`, so the probes read null; the Team dot itself was right. `data-status` is restored.

**CR-461-104 (leaving rows): Resolved, pinned.** `useLeavingTreeRows` was fine: opening a worker row that has children folded it, so its rows were already leaving. As at base, and as the Team's own rows do, a click now folds a Team row only.

**`8f91060e61`, found while verifying: CR-461-105, Resolved (this ticket's).**
- After a closure, the Manager's Team tab dropped its message to the worker (AC-011). At base a closure rebuilt the view, and `reloadRoot` re-read a list naming an agent the view no longer held (469 D-5). Since SR-084 a closure is a `run_tree_changed` with no rebuild.
- `reloadNamingUnknown`, the same rule extracted (one owner, Principle 11), now runs when a tree change removes rows.
- Specs: a removal re-reads a list naming the removed agent; a list naming only held agents isn't asked again.

**For API/E2E (probe items, not product):**
- TS-004/007 now stop at assertions written for base's Org-only rows (the "Team status: Idle" wording, a nested-row selector).
- SDV-01's later step "the Manager started" is intermittent (2/4, before and after the fix). The capture shows the probe sending while the Manager's view still reads "Loading", a probe timing issue.

**Scorecard.** As round 36, with Runtime Correctness back from 8.8 to 9.3 and API/E2E Readiness 9.0 → 9.2 (the stale test clients are still API/E2E's). Overall 9.4, and every category is at 9.2 or above.

**Findings.** None open.

**For API/E2E (cumulative), on `568dea0159`:**
1. **First, the stale tests (CRR-053):**
   - the `/ws/agent` test clients (snapshot and numbered frames; build the handler with a sequence);
   - `team-task-event-current-contract`;
   - the five stale mocked probes;
   - TS-004/007's base-wording assertions;
   - SDV-01's send-while-Loading step.
2. **Rechecks:** F-76 (E2E-CF-005, interrupt-resend, the Anthropic team restore, linked-skills E04/E10); F-77 (SDV-03/06/07, PMU-012/016/018, osfr B-003, RTP-04's peer Org row); F-78 (SDV-01, TS-004/007, BR-010); F-79 (BR-001/002); CR-461-105 (AC-011, BR-001/002's next step).
3. **The unclassified items:** DLD, MSP-02/03/05/06/07/20/33 and the phone's warm-up (rebuild the phone bundle), PMU, TS, BR, RPE-001.
4. **The rendered peer checks:** node label, files "on {node}", no `@`.
5. **LE-O1 and LE-A1 … LE-T1,** once the DeepSeek account is topped up.

**Routing.** `Pass`. Recipient: `/software_engineering_team/api_e2e_engineer`. The Implementation Engineer is informed.

---

## API/E2E Failure-Origin Review Of API-REV-016 (CRR-053)

### Review Meta

- Review Entry Point: `API/E2E Failure-Origin Review`. Current Code Review Revision ID: `CRR-053`.
- Trigger: API/E2E round 16 (API-REV-016), `Fail`, the full rerun (SR-084 item 3) on `53f0ae2d4e` (CRR-052); test changes `b7a77b8279`; evidence `API-r16-runs.txt`, raw evidence in `/tmp/api461/r16`.
- **Proven:**
  - the two-node suite 47/47 after the rework (tree, `/ws/peer-run`, `RETRY_PEERS`; RC-46);
  - OST-1 … 3, a run's own stream: open from its row, reconnect, Stop, restore, interrupted and error-ended turns each read once;
  - FOLLOW-L and FOLLOW-D; about 30 suites moved to `runTree`;
  - RSM 7/7; API-F01;
  - **C35-04 measured:** an 75–90 MB run restores in 381 ms against 269 ms at base (+112 ms). Its snapshot opens in 343 ms, against base's 397 ms `getRunProjection`. Watched, no finding.
- Scope: F-76 … F-79, the `/ws/agent` clients, and the stale web probes.
- Classification: task_size `Large`, architectural_risk `High`, unchanged.

### Classification

| Failure | Origin (traced) | Classification | Owner |
| --- | --- | --- | --- |
| **F-76 → CR-461-101** | The Team and Org view stream handlers send `CONNECTED` and only then await `view.showCurrentMode()` / `open()`. A command sent on `CONNECTED` gets `SESSION_NOT_READY` ("Retry after CONNECTED message"). Base sends `CONNECTED` **last**, so its meaning, that the session takes commands, is base's contract (rule 1 for views; REQ-009). Base passes E2E-CF-005, interrupt-resend, the Anthropic team restore and linked-skills E04/E10; the branch fails them. My review gap: I read these handlers since SR-046 without comparing the connect order to base | `Local Fix` (server) | Implementation |
| **F-77 → CR-461-102** | A delegated run doesn't open from a **Team** or **Org** surface: a Team root's Task card ("AgentRun '…' is not retained in the mounted Team", from `openWorkspaceExecutionLink`, and its row reads "Couldn't load activity"); the Org tree's delegated rows ("Choose an Agent or Team"); a Team delegator's agent worker; RTP-04's peer Org row. The Agent-delegator paths pass. So the one open path (`openRunTarget`) still routes a delegated row under a Team or Org top through that top's own member link, instead of opening the delegated run by its own target (rule 2) | `Local Fix` (web) | Implementation |
| **F-78 → CR-461-103** | Tree statuses: a stopped root reads `running` in the run list (SDV-01); a Team's dot reads `idle` while its member rows read `offline` (TS-004/007); a coordinator `idle` with an unused member `offline` is not shown (BR-010, 3/3). The rows only name status IDs, so the wrong answers come from the status read: a root's or a team's own status (SR-086 G-A4: computed by its root), or how the row maps its `statusIds` | `Local Fix` (server and web; pin which) | Implementation |
| **F-79 → CR-461-104** | Leaving tree rows aren't `aria-hidden` and `inert` at once (BR-001/002). Base's leave behaviour (`useLeavingTreeRows`) was lost in the new row rendering | `Local Fix` (web) | Implementation |
| **The `/ws/agent` clients (17 cases)** | The approved wire change (SR-085/087: `AGENT_STREAM_SNAPSHOT`, numbered frames; turn content can arrive in `turn_frames`) left the repository's own **test** clients behind. They read only live `SEGMENT_CONTENT` (MCP, background, the skill notices, compaction, Grok replay); E07 takes a stopped run's snapshot as the turn; the Claude websocket ×8 and correlated-status cases build the handler without an `AgentStreamSequence` (production attaches one to every `AgentRun`, and a stopped run gets the stored snapshot); `team-task-event-current-contract` parses the removed `TASK_EXECUTION_STARTED`. The only real `/ws/agent` client outside tests is the web, which is updated (no native app, gateway or SDK uses it) | **Stale tests: this ticket's work, first in the next round** (agents-107) | API/E2E. A suggestion: one shared test client that applies the snapshot and then the numbered frames, like `run-status-client.mjs`, rather than editing about 40 files one by one |
| **Five mocked web probes of other tickets** (two on the removed `agent-org-task-*` rows, two with changed mock keys not yet rerun, `composer-context-file-removal` at "Agent copy delegated") | Stale against 461's approved shapes | Stale tests | API/E2E |
| Unclassified (DLD 18/29; MSP-02/03/05/06/07/20/33 and the phone warm-up; PMU-003/007/019/021/024; TS-001/003/005/006; BR-003/004/006/014; RPE-001) | Many plausibly follow from F-76 … F-79 | **Hold:** rerun after the fixes | API/E2E |

### Required Actions (implementation)

1. **CR-461-101:** the Team and Org view streams send `CONNECTED` once the session takes commands (base's order). Test: a command sent on `CONNECTED` is accepted, for each kind.
2. **CR-461-102:** a delegated row under a Team or Org top opens the delegated run by its own `openTarget` (rule 2), from the tree, the Task card and the peer row alike. Tests: each delegator kind × worker kind, the peer Org row.
3. **CR-461-103:** pin and fix the tree's statuses: a stopped root reads offline in the list, a Team's own status agrees with its members (G-A4), and an unused member's `offline` shows beside an idle coordinator. Tests for each.
4. **CR-461-104:** leaving rows are `aria-hidden` and `inert` at once, as base did.

### Classification And Routing

- CR-461-101 … -104: `Local Fix` → `/software_engineering_team/implementation_engineer`.
- The stale tests (the `/ws/agent` clients, the five probes) → `/software_engineering_team/api_e2e_engineer`, first in its next round.
- Unclassified: rerun after the fixes.

### Affected Score Rationale

- Runtime Correctness: 9.3 → 8.8 (delegated runs don't open from Team or Org surfaces; tree statuses are wrong; commands on `CONNECTED` are refused).
- API/E2E Readiness: 9.3 → 9.0 (the repository's test clients lag the wire).

---

## Round 36: Implementation Review Of IR-036 (CRR-052)

- Review Entry Point: `Implementation Review`. Current Code Review Revision ID: `CRR-052`; Current Review Round: `36`.
- Review Scope: `Targeted Delta Review` of `b2675ec918..53f0ae2d4e`, one stage per commit (C35-06 taken):
  - `28b3b956fd` (CR-461-100);
  - SR-090 (`57aaa0ca53`; ARCH-REV-066 Pass);
  - `c7ad1ba54b` (C35-08);
  - `6acf35eb4a` (CR-461-099);
  - the two-node tests (`84f4f96e4f`, `4dec092f80`).
  Round 35's full review carries forward.
- Classification: task_size `Large`, architectural_risk `High`, unchanged.
- Checks:
  - IMP-106: RC-46 on two real nodes; IMP-107 and IMP-109: the two-node suite without the stale cases, 37 passed and 9 skipped.
  - IMP-108: C35-04 measured. Server unit 8113 passed; web 5496 passed; the contracts pass.
  - I ran the round's changed server tests (28/28) and web specs (152/152).
  - The repository-wide dead-export sweep finds only the pre-existing, held items.

**CR-461-100 (a turn ending other than by completion): Resolved.**
- `AgentStreamSequence` confirms a turn at every end, once its writes are durable: `TURN_COMPLETED`, `TURN_INTERRUPTED`, or an error whose evidence is turn-terminal (`resolveAgentRunErrorEvidence`). Its buffer is then dropped.
- Confirming twice is harmless (a set).
- Tests cover an interrupted turn and an error-ended turn, each read once from the stored part afterwards.

**SR-090 (Retry's owner): sound.**
- Retry's old owner was the removed store, so no client had sent one since stage A. It now goes over `/ws/run-status` (`RETRY_PEERS {runIds}`), and a connection retries only the runs it holds.
- `RunStatusEntry.retry` keeps one call in flight per peer run and re-opens an ended observation. Once answered, it tells the run's state again, changed or not, so "Checking" settles.
- The view streams' `REFRESH_REMOTE_TASK_EXECUTIONS` is removed from both contracts, the three handlers and `run-view-rows`.
- `RunStatusService` now owns a peer run's status, state and summary: one owner per peer run's facts.

**CR-461-099 (the peer row's client): Resolved.**
- A `peerRun {nodeId, runId, agentRunId}` read subject replaces `standaloneMember`.
- `runTreeStore.peerRunOf` reads the row's `peer` and `openTarget`, and drives the node label, files "on {node}", **no `@` mention scope** (SR-069; `useComposerTarget.ts`), the run notice, Retry, the title and reachability.
- Earlier events are refused ("kept there") and there are no file changes or content URL, as at base.
- `remoteRunsStore`, `remoteChildren.ts` and the retry adapter are removed; no reference remains.

**C35-03 (two real nodes): done.** RC-46, with the delegator stopped: a peer Agent and a peer Team's lazily started member through `/ws/peer-run`.
- The answer shows once live and once in a later snapshot.
- The lazy start takes an in-band snapshot.
- A message and an interrupt are accepted.
- The files stay on beta (alpha lists none; its content route answers 404).
- Retry settles both while beta is down and once it is back.

**C35-08: Resolved.** `RunTreeDto` now types what `runTreeStore` parses; the unused type, the dead open-target, org and remote helpers are removed.

**Notes, not findings:**
- **C35-04, measured:** the predating read is linear, about 7.5 ms per MB (35 MB → 266 ms at activation). It is a recorded risk. API/E2E should watch activation on the large-run probes.
- **The stale two-node cases** (RC-31 … 34, 36, 37, 43, 45 read view summaries that stage A removed) are API/E2E's rework. RC-35 cascades from them; RC-12's order and RC-20's audit are fixed.
- **Not rendered in a browser this round;** the specs mount the row and both surfaces. API/E2E's rendered rerun covers it.

**Scorecard.** As round 35, except:
- Shared Structures: 9.2 → 9.4;
- API/E2E Readiness: 9.0 → 9.3;
- Runtime Correctness: 9.0 → 9.3;
- No Legacy: 9.2 → 9.4;
- Cleanup: 9.0 → 9.4.

Overall 9.4 (spine and ownership 9.5), and every category is at 9.2 or above.

**Findings.** None open.

**For API/E2E: the full rerun (SR-084 item 3: everything that shows or opens runs and statuses), on `53f0ae2d4e`:**
1. **Trees:**
   - every view (Agent, Team, Org), the run list's expanded runs, the phone, the Task card and Settings render the server's rows;
   - the same row behaves the same everywhere;
   - `RUN_TREE_CHANGED` for open and listed runs.
2. **A run's own stream with its snapshot:**
   - a delegated run opened from its row, a restore, a reconnect;
   - an interrupted turn and an error-ended turn, each read once;
   - BR-008 … 011.
3. **Peer:**
   - rework the stale RC cases to the tree and `/ws/peer-run`;
   - the RTP probes (a status live in the window, the outage, Retry over `/ws/run-status`, the stop icon);
   - a peer row's node label, files "on {node}", and no `@` mentions (SR-069), rendered.
4. **Statuses, Settings, the phone and the lifecycle:** FOLLOW-L/D, RSM, DCP, SSR, DCR, AFS, MSP in full (MSP-25, MSP-32), PLN, LRL (with activation time on the large hub, C35-04).
5. **LE-O1 and LE-A1 … LE-T1** once the vault's DeepSeek account is topped up.
6. **Wording-only refusal differences** go to FU-030.

**Routing.** `Pass`. Recipient: `/software_engineering_team/api_e2e_engineer`. The Implementation Engineer is informed.

---

## Round 35: Full Review Of The Whole Change At IR-035 (CRR-051)

### Review Meta

- Review Entry Point: `Implementation Review`. Current Code Review Revision ID: `CRR-051`; Current Review Round: `35`.
- Review Scope: **`Full Review` of the whole change**, as agreed with the user before this round. The round (`8ab0c6c420..b2675ec918`, 30 commits; 195 source files, +3,804 / −6,525) implements:
  - SR-084: the server-built run tree;
  - step 4: views carry only their own parts;
  - SR-085 and SR-087: a run's own agent stream connects with a snapshot;
  - stage C: the tree's records come from the runs' own files;
  - SR-088 and SR-089: a peer's run is served by its own node's agent stream, relayed through `/ws/peer-run`.
  - Round 23's full review and rounds 25–34 carry forward for the parts this round doesn't touch, and were re-checked through the sweeps below.
- Read in full: `RunTreeView` (`run-tree-view.ts`), `run-tree-records.ts` and `run-tree-changes.ts`; `AgentStreamSequence(s)`, `SnapshotBarrier` and `agent-stream-snapshot.ts`; `/ws/peer-run` and `PeerRunStreamSession`; `peer-agent-stream.ts`; the web's remaining peer-run client.
- Sweeps across the whole change:
  - no changed source file is over 500 effective lines (the largest is `agent-run-history-catalog-service.ts`, unchanged at 487; `build-studio-server.ts` is 469, base 464);
  - no new swallowed errors, ForTests exports or process lookups this round;
  - leftover hosting and relay code; dead exports (C35-08).
- Classification: task_size `Large`, architectural_risk `High`, unchanged.
- Checks:
  - IR-035: server and web type gates pass (the web test baseline is down from 89 to 87); server unit, integration and architecture suites green; web suites green in batches.
  - I ran the round's tree, stream, snapshot, status and peer tests: server 21 files, 135/135; web 18 files, 182/182.
  - **Not run by anyone: `/ws/peer-run` on two real nodes** (IR-035's own Known Risks).

### What Holds (the architecture as it now stands)

- **One builder per tree.** `RunTreeView` builds every run's tree once on the server: its own parts from its own file, then its open subtree nested under the agent or member that delegated each run, then its peer rows.
  - Row keys are made from identities only (ARCH-REV-057).
  - `openTarget` comes from the one helper `openTargetOf`: a team's coordinator, never `members[0]`.
  - Rows carry their launch as the run has it now, and the IDs whose statuses they show; the tree holds no status.
  - An unreadable record is left out with a warning (rule 7).
  - The four client builders, `listTaskRows`, `runHistoryTeamExecutionRows`, `agentOrgHistoryRows` and `mobileRunTreeProjection`, are **removed**, along with the child DTOs, `runLaunch` and the Settings overlay. That is the class F-54, F-56, F-57, F-60, F-61, F-64, F-69 and F-73 came from, now removed by construction (Principle 11).
- **A run's own stream is sequenced.**
  - `AgentStreamSequence` numbers every frame per `AgentRun`, team and org members included (SR-089).
  - It buffers each unconfirmed turn's frames.
  - The snapshot takes, in one step, the base, the confirmed set and a copy of the buffer, then reads the stored part filtered by exclusion (predating, or confirmed at the base). Each turn therefore comes from one source.
  - `SnapshotBarrier` owns SR-063's connection rule once, for `RunViewStream` and the agent stream (ARCH-REV-063's recommendation).
  - CR-461-098's heuristic is gone.
- **A peer's run is reached as itself.** Node B serves `agentStreamSnapshot` and `observeAgentStream`, and node A's `PeerRunStreamSession` relays them one for one in the `/ws/agent` protocol. It re-snapshots on a gap or a new `liveSequenceId`, and drops (and logs) a frame without a sequence (rule 9). Messages and interrupts go through owner commands.
- **Statuses** stay on `/ws/run-status`, with one writer.
- **The net change this round is −2,700 lines;** the structure got smaller as it got cleaner.

### Candidate Gate (round 35)

| Candidate | Observation | Basis | Disposition | Reason |
| --- | --- | --- | --- | --- |
| C35-01 | **The web's peer-run client is unbound.** `remoteRunsStore.register` has no caller since stage A, so `runOfAgentRun` is always `null`. As a result:<ul><li>`useComposerTarget.ts:69` offers an `@` mention scope for a peer run, which SR-069 says takes none;</li><li>`remoteRunFile.ts` finds no node name, so the files of a peer run don't open;</li><li>the peer row shows no node label and no earlier events (IR-035's own Known Risks).</li></ul>`services/remoteRuns`, `composables/remoteRuns` and the store remain as a subsystem nothing fills | SR-069; AC-016 ("its stored conversation opens", the node shown); Principles 7 and 8 (no half-dead code) | **Promote → CR-461-099** | A supported normal flow (a peer row opened) loses base behavior, and the code that should carry it is orphaned |
| C35-02 | **An interrupted turn is never confirmed.** `AgentStreamSequence.accept` confirms a turn only on `TURN_COMPLETED`, but a turn can also end with `TURN_INTERRUPTED` (the work journal and the application projector both treat it as an end). An interrupted turn's frames stay buffered for the life of the run, and its stored entries stay excluded, so every later snapshot replays it from the buffer. No test covers an interrupted turn's confirmation | SR-087 (each turn confirmed and dropped from the buffer); interrupt is a normal user action | **Promote → CR-461-100** | Unbounded buffer growth per interrupted (or error-ended) turn while the run is active, and snapshots that carry it forever |
| C35-03 | `/ws/peer-run` has never run on two real nodes | `TESTING.md`; this ticket's lesson (CR-461-090: fake handles hid a cross-node defect) | **Promote (folded into CR-461-099)** | The implementation's own checks must include the real two-node suite for a new cross-node path |
| C35-04 | `recordPredating` reads every stored turn ID synchronously at each `AgentRun` activation, including archived traces | `DESIGN.md` best practice 7; large-runs-load-less | Reject; a suggestion | Measure activation time on the large-run probes (LRL, the large hub) before acting |
| C35-05 | `RunTreeView` lists the open subtree only; base's "closed set" (a run whose Tasks closed while it still runs) is not built | Design line 395 (rule 1, superseded for trees by SR-084) | Reject | DS-5's closure stop makes that state transient; SR-084 supersedes rule 1 for trees. The Solution Designer may state it explicitly |
| C35-06 | Three commits swept in staged files from another stage (`c17a11f2ef`, `4c5f2ee2a6`, and `ff350c974c`, a docs commit carrying three stage C deletions) | Reviewability | Reject; a process note | The end state is right; keep each commit to its stage |
| C35-08 | **Dead code after this round** (repository-wide sweep): `remoteChildren.ts`'s `applyRemoteSummary`, `isRemoteExecutionKnown`, `remoteRowsOf`, `mergeByStartTime`; `runOpenTarget.ts`'s `fromSnakeOpenTarget`, `memberOpenTarget`; `agentOrgExecution.ts`'s `AgentOrgConfiguredTeamNode`, `isAgentOrgAgentNode`; the contract types `RunTreeDto` and `RunTreeChangedEventDto` (exported, used by no consumer). Pre-existing and held: `AgentPresentationBatchEventDto`, the two root view DTO types, `appendLaunchNotes`, `getAgentRunMemoryRecorder`, two web query-data types (present at `3d738de6e6`) | Principles 7, 8 | **Promote (folded into CR-461-099)** | The first group is what the removed client builders and peer path left behind |
| C35-07 | `agentOrgFirstMemberAddress` (an Org's own row focuses its first member) | FU-024 | Reject | It is base's rule for an Org's own row (it has no coordinator), moved here, not a team coordinator fallback |

### Scorecard (round 35, full)

| Priority | Category | Score | Why / What Is Weak |
| --- | --- | --- | --- |
| 1 | Data-Flow Spine Inventory and Clarity | 9.5 | One tree spine, one status spine, one sequenced own-stream spine, one peer relay |
| 2 | Ownership Clarity and Boundary Encapsulation | 9.5 | `RunTreeView`, `RunStatusService`, `AgentStreamSequence`, `SnapshotBarrier`: one owner each |
| 3 | API / Interface / Query / Command Clarity | 9.3 | Typed tree and stream contracts |
| 4 | Separation of Concerns and File Placement | 9.4 | Clients only display |
| 5 | Shared-Structure / Data-Model Tightness | 9.2 | An unbound store that holds nothing (CR-461-099) |
| 6 | Naming Quality and Local Readability | 9.3 | — |
| 7 | API/E2E Readiness | 9.0 | `/ws/peer-run` never run on two nodes |
| 8 | Runtime Correctness And Behavioral Fidelity | 9.0 | Peer mentions, files and node label (CR-461-099); interrupted turns kept forever (CR-461-100) |
| 9 | No Backward-Compatibility / No Legacy Retention | 9.2 | The old peer-run client kept unbound |
| 10 | Cleanup Completeness | 9.0 | Same |

Overall 9.3. Four categories are below 9.2, so this round is a **Fail**. The architecture is at its best yet (spine 9.5, ownership 9.5); the failures are an unfinished end of the peer path and one missing turn-end case.

### Findings (round 35, open)

#### CR-461-099 (new): the peer row's client is unbound, so peer runs lose their mention rule, files and node label

- **Required action:**
  - Bind what a peer row needs to the new peer subject (the tree row's `peer` and `openTarget.nodeId`):
    - no `@` mention scope for a peer run (SR-069);
    - its files through its node;
    - its node label;
    - its earlier events, as base showed them.
  - Remove the parts of `remoteRunsStore`, `services/remoteRuns` and `composables/remoteRuns` that the tree and `/ws/peer-run` replace. No store is left that nothing fills.
  - Remove C35-08's dead code, or use the two tree contract types where the web parses the tree.
  - **Run the real two-node suite with `/ws/peer-run`** (open a peer agent row and a peer team member with the delegator stopped: the snapshot, live output once each, a message, an interrupt, and the files), and record it.
- **Classification:** `Local Fix`, implementation (web, and the server where a read is needed).

#### CR-461-100 (new): a turn that ends interrupted, or in error, is never confirmed

- **Required action:**
  - `AgentStreamSequence` confirms a turn at every turn end (`TURN_COMPLETED`, `TURN_INTERRUPTED`, and an error end if the runtime has one), once its writes are durable, and drops its buffer.
  - Tests: an interrupted turn is confirmed and dropped from the buffer; a later snapshot reads it from the stored part, once.
- **Classification:** `Local Fix`, implementation (server).

### Classification And Routing (round 35)

- CR-461-099 and -100: `Local Fix` → `/software_engineering_team/implementation_engineer`.
- The next review is a targeted delta on the peer client and the turn ends, plus the two-node evidence. API/E2E then runs the full rerun (SR-084 item 3).

---

## Round 34: Implementation Review Of IR-034 (CRR-049)

- Review Entry Point: `Implementation Review`. Current Code Review Revision ID: `CRR-049`; Current Review Round: `34`.
- Review Scope: `Targeted Delta Review` of `4062c809d2..77f24482a8` (code `4be99b1dca`, `59b077f1c7`, `b8e2d0f527`, `7986b3e3a2`, `eced354f65`).
- Context: the user has decided to build the run trees on the backend in 461 (FU-034). The Solution Designer is revising the design. This round's fixes are outside the trees, except CR-461-095, which was committed before my hold arrived. It is kept, and the tree design will replace it if needed.
- Classification: task_size `Large`, architectural_risk `High`, unchanged.
- Checks:
  - IMP-99 … IMP-103: RTP-01 … 08; two-server 45/45 with the new RC-45; BR-008 … 011 3/3; the phone lifecycle; server 7254, web 5777.
  - I ran the round's changed server tests (22/22) and web specs (50/50).

**CR-461-094 (peer status in the window): Resolved.** Two pinned causes, neither one I had guessed:
- **Churn (web, introduced in round 31):** views held their runs through deep watchers, so every read re-held them. The node re-observed each run's statuses about 33,000 times per run (100,357 traced), and a status never settled. Now `watchHeldRuns` re-holds only when the set of runs changes (a key of `kind:runId`), in the Agent store, the bridge and Settings.
- **Outage (server):** a node that answers again (Retry, or a view's summary) re-observes every ended status observation on that node, not only the asking view's. An unasked end still never re-observes, so there is no refusal loop.
- RC-45 is a new real two-node test, and it failed before the fix.

**CR-461-096 and -097: Resolved.** `RunStatusFeed` now follows the shared live-stream lifecycle: the reconnect scheduler, `isCredentialRefusalClose`, `closeAllLiveStreams`, and `RUN_TREE_CHANGED` held while hidden. One lifecycle for every live stream. MSP-32 shows 0 refusals and MSP-25 no history, status or view read while hidden.
- **The two remaining `GetTaskWorkerTasks` reads in MSP-25** come from `/ws/projects`'s `task_upserted` (`taskWorkerTaskStore`, unchanged from base). They are outside AC-006's three read kinds, so they are base's behavior, not 461's.

**CR-461-098 (the Org worker's conversation after a restart): Resolved.**
- Rule 2 opens the worker as its own run: it reads the stored conversation, then connects a stream that sends no snapshot, so a message delivered before the node bound the stream fell in the gap.
- Now, on the node's `CONNECTED` (a `bound` event), the delegated path catches up: once the run isn't mid-turn, it reads the stored state and commits it only if no live event landed during the read (a bounded re-read).
- **A note, not a finding:** that check is a conversation mark (message count plus the last message's size). It's sound for the case, but a sequenced connect (a snapshot or sequence on the agent stream, as the views have) would remove the gap structurally. It belongs with the tree and view work.

**CR-461-095: Resolved** (one guard: Settings close only when the Org has nothing selected). It is kept.

**Scorecard.** As round 33, with Runtime Correctness back from 9.0 to 9.3. Overall 9.4, and every category is at 9.2 or above.

**Findings.** None open.

**For API/E2E, a targeted run only:** the backend run trees (FU-034) are coming into 461, and the full rerun follows them. Please check this round's fixes now:
- RTP-01 … 08 and RC-45, plus a churn check (a view open for minutes; the peer's status settles);
- MSP-25 and MSP-32;
- BR-008 … 011;
- AFS-002.
LE-O1 waits for the vault's DeepSeek top-up.

**Routing.** `Pass`. Recipient: `/software_engineering_team/api_e2e_engineer`. The Implementation Engineer is informed.

---

## API/E2E Failure-Origin Review Of API-REV-014 (CRR-048)

### Review Meta

- Review Entry Point: `API/E2E Failure-Origin Review`. Current Code Review Revision ID: `CRR-048`.
- Trigger: API/E2E round 14 (API-REV-014), `Fail`, confidence 89%, on `4062c809d2` (CRR-047); evidence `d843b80612` (`API-r14-runs.txt`, `API-r14-open-findings.json`).
- **Proven:**
  - F-60, F-67, F-69, F-71 and F-73 (the phone 49/55);
  - the peer server suite 45/45; the extended runtime switch 5/5 twice;
  - SSR, RSM, SDV, PMU, LRL and API-F01.
  - F-68 and F-72 are **not seen** in 3/3 runs each, so CR-461-088's Agent part and CR-461-093 are closed as not reproduced.
- Scope: F-70 (in the window), D-IMP-1, F-74, F-75, BR-011, LE-O1.
- Classification: task_size `Large`, architectural_risk `High`, unchanged.

### Classification

| Item | Origin (traced) | Classification | Owner |
| --- | --- | --- | --- |
| **F-70 (remains in the window) → CR-461-094** | The server suite passes, but in the real app the probe's own `/ws/run-status` subscription on alpha reads the peer run `idle` (run 1) or `offline` (run 2) before the outage. After the outage, Retry from the row and from the notice, then a new turn on beta, give no status change at all. RTP-05's stop icon flickers away. Two candidates, not pinned:<ul><li>Retry re-observes only a link that **ended** (`RunStatusEntry.retry` → `observePeer` returns while `stream` is set). An outage the client side never sees as an end leaves a dead stream that Retry skips.</li><li>Live changes don't reach the window's subscription (its ref, or the entry shared with the server test).</li></ul> | `Local Fix` (server; reproduce RTP-08 in the real app, not only the server suite) | Implementation |
| **D-IMP-1 → CR-461-095** | Focusing a running Org's copy row closes the Org's Settings, in 3 of 3 AFS-002 runs. `AgentOrgWorkspaceView.vue` closes Settings when its target is momentarily empty. The code is base's, but the empty moment comes from 461's rule-2 open of the copy as its own run, so this ticket owns the result | `Local Fix` (web) | Implementation |
| **F-74 → CR-461-096** | After the phone's credential is revoked (MSP-13), the new `/ws/run-status` connection keeps reconnecting: 980 refusals with 4401 in 17 minutes. `RunStatusFeed` (`services/runStatus/runStatusFeed.ts`) retries on every close. The web's live streams share `services/liveStreamLifecycle/` (`credentialRefusalClose`, the reconnect scheduler, the page-resume signal), and the new feed doesn't use it | `Local Fix` (web) | Implementation |
| **F-75 → CR-461-097** | 2.35 s after the page goes to the background, the phone reads a listed run's view (`GetAgentRunCollaboration`) and `GetTaskWorkerTasks`. autobyteus-435 AC-006 / E-25: no reads in the background. The run-status feed and its `RUN_TREE_CHANGED` re-read have no background handling, unlike the other live streams (`pageResumeSignal`) | `Local Fix` (web) | Implementation |
| **BR-011 → CR-461-098** (addendum, `60c2de0846`) | The reactivated **Org** worker's conversation is missing from the window after the second real backend restart ("org: conversation after restart"), in rounds 12, 13 and 14. The Agent and Team families pass. Base `827f1e68dc` passes BR-008 … BR-011 in 2 of 2 runs with its own probe. The branch's probe differs only in rule-2 restores (a member message instead of base's removed mutation), which the failing check doesn't touch. So it is 461's. Not pinned; the probe now records which marker (PRE-DONE, POST-REOPEN, POST-RESTART) shows, with a screenshot | `Local Fix` (pin it on the Org family: the worker's own conversation read after a restart under rule 2) | Implementation |
| LE-O1 | Blocked: the test vault's DeepSeek account answers "402 Insufficient Balance" | Not a 461 result | The user: top up the account |

### Required Actions (implementation)

1. **CR-461-094:** a peer run's status on `/ws/run-status` follows live in the window, before and after an outage.
   - Pin it with RTP-08 in the real app.
   - Retry must re-observe a link that is dead even when no end was signalled (or the link must detect the end).
   - Test the outage with real nodes.
2. **CR-461-095:** focusing a running Org's copy row keeps the Org's Settings open: no close on a momentary empty target during the copy's open.
3. **CR-461-096 and -097:** `RunStatusFeed` follows the shared live-stream lifecycle:
   - stop on a credential-ending close (4401, or 4403 with an ending code), as the other streams do;
   - hold its connection and its `RUN_TREE_CHANGED` re-reads while the page is in the background, resuming on the page-resume signal.
   - One lifecycle for every live stream (Principle 11), with tests for both.

### Classification And Routing

- CR-461-094 … -097: `Local Fix` → `/software_engineering_team/implementation_engineer`.
- BR-011 is held for a base run. LE-O1 needs the user's top-up.

### Affected Score Rationale

- Runtime Correctness: 9.3 → 9.0 (peer status still wrong in the window; Settings closes; a reconnect storm after revoke; background reads on the phone).
- API/E2E Readiness: unchanged.

---

## Round 33: Implementation Review Of IR-033 (CRR-047)

- Review Entry Point: `Implementation Review`. Current Code Review Revision ID: `CRR-047`; Current Review Round: `33`.
- Review Scope: **re-audit of the peer path** (status and output, end to end) and a targeted delta for the rest, `58cc542572..4062c809d2` (code `ae38f8e421` … `9e62ffd137`).
- Classification: task_size `Large`, architectural_risk `High`, unchanged.
- Checks:
  - IMP-93: the two-server suite 44/44; RC-32 reads `offline → idle → offline`; RC-31 and RC-33 pass with real nodes.
  - IMP-94 … IMP-98: phone MSP cases, Settings probes, the title probe, the held items; server 7251, web 5762, contracts.
  - I ran the round's changed server tests (47/47) and web specs (223/223).

**The peer path, re-audited end to end:**
- **CR-461-090 (status): Resolved.** The pinned cause was that beta's observation carried changes only, so a peer already idle read `offline`. `RemoteRunViewProvider.observe` now sends each running agent's current status after its listener is attached, so no change falls between them. Proven on two real nodes (my round-31/32 gap was fake-handle tests).
- **CR-461-091 (output): Resolved.** `PeerChildObservation` observes peer output again into every view showing the run (AR-402: the run's own agents at their addresses). It drops `AGENT_STATUS` frames, so `/ws/run-status` stays the one status writer. Retry re-opens ended output and status observations.
- **One note, not a finding:** a peer run is now observed twice from this node, once for output (views) and once for status (`RunStatusService`). Each owner has one fact (Principle 11), at the cost of a second peer subscription per shown peer run. Measure before merging them (best practice 7).

**The rest:**
- **CR-461-089: Resolved.** No follower propagation on the web, and `follows_team` is gone from both view contracts and projections. The team mutator changes the default only; a member without its own source keeps the Team's earlier one as its own, so its origin doesn't move. Launch resolution at delegation time keeps `followsTeam` (stored record, base's rule).
- **CR-461-086: Resolved.** A new read, `runLaunch(kind, runId)`, gives each delegated row its run's own current launch and source (SR-064/065), read when the row appears and after a Save or Stop.
  - A suggestion: it answers `GraphQLJSON`. A typed object would make the contract checkable.
- **CR-461-087: Resolved.** The archive refusal's message is shown.
- **CR-461-088: the Org part is resolved** (a stopped Org's config read has no delegated runs under rule 2; its view keeps them; adoption and the pre-check no longer refuse). That also fixed AFS-002's held step. The Agent "Couldn't terminate" part was not reproduced (2/2 pass); held for API/E2E.
- **CR-461-092: Resolved** for MSP-02, -03, -05, -06, -08, -11, -14, -16, -33, -43. MSP-17's and MSP-20's probe reads are flagged for API/E2E.
- **CR-461-093: not reproduced at the head** (3/3), with no Team row built without its title in a trace, and not pinned to a change. API/E2E reproduced it 2/2 on `58cc542572`. **Held for API/E2E's recheck**; if it recurs, it comes back as a finding.
- **Held items:** the runtime-switch suite (3/3 pass, not reproduced), BR-011 (1 of 3), LE-O1's later step (model-driven) go to API/E2E's rerun.
  - **D-IMP-1:** focusing a running Org's copy row once closed Settings, because the target was momentarily empty (`AgentOrgWorkspaceView.vue`, base code, triggered by rule 2's binding). Held for API/E2E's frequency check.
- **Docs, for delivery's docs sync:** `autobyteus-web/docs/agent_teams.md:315` still describes a copy following its Team's choice (`follows_team`).

**Scorecard.** As round 32, except Runtime Correctness: 8.7 → 9.3, and API/E2E Readiness: 9.1 → 9.3 (real two-node evidence). Overall 9.4, and every category is at 9.2 or above.

**Findings.** None open.

**For API/E2E (cumulative), on `4062c809d2`:**
1. **Peer:** RC-31 … RC-34, RTP-04, RTP-05, RTP-08 (status live, output shown, stop icon, Retry after an outage).
2. **CR-461-093:** RRT-05, several runs.
3. **Settings:** DCP, SSR-002/-004, DCR-003 (no follower move; the origin kept), AFS-002, RSM.
4. **The phone:** MSP in full; MSP-17 and MSP-20's probe reads.
5. **PLN-09** (the reason shown).
6. **The held items:** the Agent delegator's Stop from Settings (CR-461-088, SSR-002 repeated), the runtime-switch suite, BR-011, LE-O1's later step, and D-IMP-1's frequency.
7. **Wording-only refusal differences** go to FU-030.

**Routing.** `Pass`. Recipient: `/software_engineering_team/api_e2e_engineer`. The Implementation Engineer is informed.

---

## API/E2E Failure-Origin Review Of API-REV-013 (CRR-046)

### Review Meta

- Review Entry Point: `API/E2E Failure-Origin Review`. Current Code Review Revision ID: `CRR-046`.
- Trigger: API/E2E round 13 (API-REV-013), `Fail`, confidence 87%, on `58cc542572` (CRR-045), the full SR-082 item 3 rerun; evidence `8e99943ffb`.
- **Proven:**
  - F-61 … F-66; F-63 under SR-081 in both live runs;
  - FU-031: SDV-07 in Agent, Team and Org trees;
  - PMU 25/25, RSM 7/7, LRL-001 … 005, API-F01;
  - **local statuses by run ID** (follow-child, lazy-member, idle-lifetime, stories, FOLLOW-L, FOLLOW-D).
- Scope: F-60, F-67 … F-73, and the unclassified items.
- Classification: task_size `Large`, architectural_risk `High`, unchanged.

### Classification

| Failure | Origin (traced) | Classification | Owner |
| --- | --- | --- | --- |
| **F-60 (remains) → CR-461-086** | After a copy's save, its card keeps the old origin. Reopened, it still shows the old thinking (`High`, while `xhigh` is stored on the member's own run). Settings' delegated rows take each run's **launch from the view's row records**, read when the view's snapshot or row event was read. A save changes the run's own file, not those records. Round 30's overlay (`saved`) covers the session's model only, so a reopen shows the stale record. SR-064/065: a child's launch and options come from its own reads | `Local Fix` (web) | Implementation |
| **F-67 (PLN-09) → CR-461-087** | "Archive all": the server refuses one run with DS-13's text, naming the working delegated run. The web's `archiveRunRecord` drops the message, so the window shows only "1 failed" (AC-008 requires the reason) | `Local Fix` (web) | Implementation |
| **F-68 → CR-461-088** | Stopping a delegator from its Settings while its delegated runs work: an Agent Manager intermittently answers "Couldn't terminate this run" and stays Running (one of two runs). An Org's Settings stay "Running" with "Org configuration changed topology … Refresh" while its tree shows its members stopped. This is REQ-001's own story. The evidence is there but not pinned | `Local Fix` (investigate and fix: the terminate answer, and the Org Settings' state after a stop) | Implementation |
| **F-69 → CR-461-089** | A team-level save on a stopped delegated team moved its following lead's stored launch. The server's mutator changes only the default (`team-run-selection-mutator.ts`). The member patch comes from the web: the delegated save target sends the team's choice to the members with `follows_team` (`delegatedLaunchRows.ts` `followerAddresses`, lines 300-334). That is base's hosted-copy `followsTeam` path, which SR-075 F-39 says existed only for hosted copies; "each member keeps its own saved launch" | `Local Fix` (web; and the server, if it still sends `follows_team`) | Implementation |
| **F-70 → CR-461-090** | A peer run's statuses on `/ws/run-status` stay `offline` on the delegating node from the start, and never change (RC-32, RTP-08), even before any outage. The local path passes. The peer entry (`RunStatusEntry.startPeer`) gets no status frame through `peer.observe`. Pin where: the handle's observe after `remote-run-observation.ts` changed in `445f1ed947`, the frame shape, or the run ID the client subscribes. My review gap: round 31 and 32 accepted unit tests with a fake handle | `Local Fix` (server) | Implementation |
| **F-71 → CR-461-091** | A peer run's live **output** no longer shows in the delegating window. `445f1ed947` removed `remote_agent_presentation` entirely. But SR-083 moved only **statuses** to `/ws/run-status` ("a peer run's status is read through its handle … never a view frame"). The design still has `PeerChildObservation` number the peer rows' **output frames** in the view (DS-8, design lines 378-379; AC-802). A peer child has no own stream on this node, so rule 2's "own stream" does not apply to it. So the design decides this: an implementation over-reach, not a design question. My review gap: in round 31 I read "peer frames removed" as status frames | `Local Fix` (server and web) | Implementation |
| **F-73 → CR-461-092** | The phone shows no delegated rows under a listed run, and a Team run's screen doesn't open (12 MSP cases). The desktop shows the rows. Round 31 removed the list status poll and changed `mobileRunTreeProjection`. The phone's rows and open path must follow the same view rows and `openTarget` as the desktop | `Local Fix` (web, phone) | Implementation |
| **F-72 → CR-461-093** (addendum, `e89df890fa`) | On the peer node, a peer-started Team's row first shows the delegated task message ("You have a new task from the agent with sender run id …") as its title, 30–100 ms after the owner's send, then its title. `remote-run-title-probe.mjs` (the same at base and on the branch) passes RRT-05 twice at `827f1e68dc`, where only the title ever shows, from 2–4 ms after the send, and fails it twice on `58cc542572`. So it is 461's: the peer-started run's row is written or summarised from its first input before its title | `Local Fix` (server; pin whether the row's title is written after the first message, or its summary is taken from the task message) | Implementation |
| Unclassified | The extended native runtime-switch suite fails three different ways on the branch and passes 5/5 at base. AFS-002's later step: a stopped Org's direct agent's Settings don't open in a fresh page. BR-011 is now the same step twice ("org: conversation after restart"). LE-O1's later step | **Hold: the implementer reproduces each** while in this code | The first three point at changed paths (runtime switch, Org Settings, Org restart). If reproduced, fix with a test; otherwise, give the reason |

### Required Actions (implementation)

1. **CR-461-086:** Settings rows show each run's **current** stored launch (model, runtime, settings, origin), read from the run itself, not from the view's records. Reopening, and a save, both show it.
2. **CR-461-087:** an archive-all refusal shows its reason, naming the run.
3. **CR-461-088:** reproduce and fix the delegator's Stop from Settings with working children (the Agent's terminate answer; the Org Settings' state after the stop).
4. **CR-461-089:** a team-level choice on a delegated team changes its default only. No follower propagation, and no `follows_team` reaches the web.
5. **CR-461-090:** a peer run's statuses go live on `/ws/run-status`. Test with a real two-node handle, not a fake.
6. **CR-461-091:** restore the peer rows' output frames in the view (`PeerChildObservation`, DS-8), output only; statuses stay on `/ws/run-status`.
7. **CR-461-092:** the phone's rows and open path come from the same view rows and `openTarget` as the desktop.
8. **Held items:** reproduce the runtime-switch suite, AFS-002's later step, BR-011 and LE-O1's later step. Fix those you can reproduce.

### A note on the pattern

F-60, F-69 and F-73 are again client logic that reconstructs a run's facts from somewhere other than the run: view records, the hosted-copy follower path, a client projection. SR-083 deliberately left the full server tree as FU-034. These fixes stay local, and FU-034 remains the structural answer.

### Classification And Routing

- CR-461-086 … -092: `Local Fix` → `/software_engineering_team/implementation_engineer`.
- F-72 and the unclassified items are held (above).

### Affected Score Rationale

- Runtime Correctness: 9.3 → 8.7 (peer status and output broken, the phone's rows missing, stale Settings, a dropped refusal reason, an intermittent delegator stop).
- API/E2E Readiness: 9.3 → 9.1 (fakes hid the peer status path).

---

## Round 32: Implementation Review Of IR-032 (CRR-045)

- Review Entry Point: `Implementation Review`. Current Code Review Revision ID: `CRR-045`; Current Review Round: `32`.
- Review Scope: `Targeted Delta Review` of `74076b0ef4..58cc542572` (code `b5163d71d1`). Round 31's re-audit carries forward.
- Classification: task_size `Large`, architectural_risk `High`, unchanged.
- Checks:
  - IMP-92: server unit 7245 passed; web 5760 passed; type gates pass.
  - I ran the round's server tests (26/26) and web specs (6/6).

**CR-461-085 (a peer run's status): Resolved.**
- **Server.**
  - `RunStatusEntry.startPeer` keeps its observation re-openable. An unasked end sets the agents `offline` and calls `peerEnded`, so `PeerChildObservation.ended` fetches one summary for the views showing the run (AR-403).
  - Retry (`refresh`) calls `RunStatusService.retryPeers`, which observes again only where the link ended, never twice while live. Frames from an ended link change nothing. An end during `observe()` itself is handled.
  - The two owners need each other. The composition wires them explicitly with callbacks, and the order is commented (Principle 9, "when two owners need each other").
- **Web.** `applyRemoteSummary` sets title, reachability and launches only. A peer agent's status has one writer, `/ws/run-status` (Principle 11).
- **Small items:** `rowsChanged` is required; the unused ForTests export is removed; the comments are corrected.
- **Tests:** end → Retry → live again, failing on the old code; no second observation while live; Retry fetches summaries; an unasked end fetches one; a summary doesn't change a status.

**Scorecard.** As round 31, except:
- Shared Structures: 9.2 → 9.4;
- Runtime Correctness: 9.1 → 9.3;
- Cleanup: 9.3 → 9.4.

Overall 9.4, and every category is at 9.2 or above.

**Findings.** None open.

**For API/E2E (cumulative), on `58cc542572`:** SR-082 item 3, rerun everything that shows or opens runs and statuses:
1. **Statuses by run ID:**
   - probes read statuses from `/ws/run-status`, not view frames;
   - a stopped delegator's live children;
   - stop and restore of a child with the delegator's view open;
   - a listed run that is not open, with live tree changes (`RUN_TREE_CHANGED`);
   - the phone and the desktop.
2. **Peer:** the two-node suite; peer offline then back, then Retry, and the row's status is live again; an unasked end shows reachability (AR-403); API-P04 with `launches[]`.
3. **Open targets:** SDV, PMU, PLN; a delegated Team row opens its coordinator in Agent, Team and Org trees (FU-031); no `members[0]` (FU-024).
4. **Settings:** RSM, DCP (edited copies show no origin), AFS (read the copy's own run), and an Org or stopped-Team copy's own card (CR-461-079).
5. **The rest:**
   - LRL-001 (one member, once);
   - LRL-004 (the reason; fix the probe's late socket listener);
   - LE-O1 under SR-081 (the correction);
   - PLN-09 (held);
   - BR-011;
   - regression runs for the rest, per SR-082.
6. **Wording-only refusal differences** go to FU-030.

**Routing.** `Pass`. Recipient: `/software_engineering_team/api_e2e_engineer`. The Implementation Engineer is informed.

---

## Round 31: Implementation Review Of IR-031 (CRR-044)

### Review Meta

- Review Entry Point: `Implementation Review`. Current Code Review Revision ID: `CRR-044`; Current Review Round: `31`.
- Review Scope: **`Full Re-Audit` of this round's changes** (`47efe7fa9b..74076b0ef4`).
  - SR-082, as narrowed by SR-083: statuses by run ID (`RunStatusService`, `/ws/run-status`), server open targets, the relay removed, web views on run-status. That changes the status spine and shared contracts.
  - Plus SR-081, CR-461-078 and CR-461-083.
  - Round 23's full review carries forward for the rest.
- Trigger: IR-031 (ARCH-REV-053, -055, -056).
- Classification: task_size `Large`, architectural_risk `High`, unchanged.
- Checks:
  - IMP-90: server unit 7243 passed, integration failing only in the file watcher (FU-021); web 5760 passed; type gates pass.
  - IMP-91: SDV 7/7, PMU 25/25, LRL-001.
  - I ran the status, feed, tree-reach and peer tests (server 32/32) and the run-status and open-target web specs (8/8).
  - Sweeps: no remaining references to the removed relay in code, apart from two stale comments. One new unused export.

### What Holds

- **`RunStatusService` is the right owner.**
  - One entry per subscribed run, counted and released with its last holder.
  - A local run's answers come from its own root: listener first, then the current read, with a generation guard. Registration changes re-observe after a restore and set `offline` at an end, which removes CR-461-067's class by construction.
  - A connection's `SUBSCRIBE` reads and registers in one synchronous step.
  - `RUN_TREE_CHANGED` comes from `ChildRowsFeed` for every changed run and its ancestors (AR-028).
  - Statuses are read from the run itself, never relayed (Principle 11; FU-026's class removed on the local side).
- **The relay is gone:** `LocalChildFollowers`, `LocalChildObservation`, the child status frames and the status poll.
- **`openTargetOf`:** an agent run focuses itself, and a team run its coordinator. With no coordinator, the row error is logged and there is no target, never `members[0]` (FU-024, FU-031). Every view opens through `useRunOpening`.
- **Settings:** rows come from the run's view (CR-461-079), liveness from the run's own status (CR-461-080), and the focused member loads once (CR-461-082). Peer rows carry launches again (CR-461-084).
- **SR-081:** the correction runs before step 2.
- **CR-461-078:** `{ origin: "settings" }` shows no origin.
- **CR-461-083:** the reason names the file and line, plus the next step.
- **The deviations are acceptable:** subscribing by run (a run is the unit); one open path with view-specific selection mechanics.

### Candidate Gate (round 31)

| Candidate | Observation | Basis | Disposition | Reason |
| --- | --- | --- | --- | --- |
| C31-01 | **Peer statuses, server.** `RunStatusEntry.startPeer` observes once. On `onEnd` it sets everything `offline` and never observes again. `PeerChildObservation.refresh` (Retry) now only re-fetches summaries; before, it also re-opened ended observations ("Retry observes again"; AR-403, DEC-807 Phase 1). So after a peer link ends (node offline then back, or the peer run stopped then restored), the row's live status stays `offline` until every subscriber releases the run. The AR-403 summary fetch on an unrequested end is gone too, so the row's reachability stays stale until Retry | AC-016 alternative ("Couldn't reach {node}"); base's Retry; API-P03 "peer offline then back" | **Promote → CR-461-085** | Supported normal flow; a live peer row shows the wrong status |
| C31-02 | **Peer statuses, web: two sources write one field.** A peer row's agents' `currentStatus` is written by `/ws/run-status` (`viewRunStatusBridge`, the Agent store) **and** by summaries (`applyRemoteSummaryStatuses` in `agentRunCollaborationContext.ts:186`, `teamExecutionViewState.ts:424`, `agentOrgExecutionContext.ts:269`). The last write wins, and the bridge rewrites only when run-status changes | Principle 11 (one fact, one source), the class SR-082 removes | **Promote (folded into CR-461-085)** | After Retry, a summary's status sticks with no live updates. A summary should carry title, reachability and launches only |
| C31-03 | `ChildRowsFeed.rowsChanged?` is optional; production always passes it, and only tests leave it out. Absent, `RUN_TREE_CHANGED` is silently never sent | Principle 16 | **Promote (folded, small)** | Same rule as CR-461-075; the absence direction is silent |
| C31-04 | `resetRunStatusFeedForTests` is exported from `stores/runStatusStore.ts` and unused, even by tests. Two comments in `run-view-stream.ts` (lines 38, 128) still name the removed `LocalChildObservation` | Principles 7, 15 | **Promote (folded, cleanup)** | — |
| C31-05 | `openTarget` is optional (not required-nullable) in three row schemas | Shared-structure tightness | Reject; a suggestion | The server always sends it, and the client fails closed (no open). Make it required-nullable when the fixtures are next touched |
| C31-06 | Pre-existing dead exports (`AgentTeamRootExecutionViewDto`, `AgentOrgRootExecutionViewDto`, `appendLaunchNotes`, two web query-data types) | — | Reject | Present at `3d738de6e6`; not this round's |

### Scorecard (round 31)

| Priority | Category | Score | Why / What Is Weak |
| --- | --- | --- | --- |
| 1 | Data-Flow Spine Inventory and Clarity | 9.4 | One status spine, read from each run |
| 2 | Ownership Clarity and Boundary Encapsulation | 9.5 | `RunStatusService` owns statuses; the relay class is removed |
| 3 | API / Interface / Query / Command Clarity | 9.3 | A clean `/ws/run-status` contract |
| 4 | Separation of Concerns and File Placement | 9.3 | — |
| 5 | Shared-Structure / Data-Model Tightness | 9.2 | A peer status written from two sources (C31-02) |
| 6 | Naming Quality and Local Readability | 9.3 | Stale comments |
| 7 | API/E2E Readiness | 9.3 | Probes must read statuses by run ID (noted) |
| 8 | Runtime Correctness And Behavioral Fidelity | 9.1 | CR-461-085 |
| 9 | No Backward-Compatibility / No Legacy Retention | 9.4 | — |
| 10 | Cleanup Completeness | 9.3 | C31-04 |

Overall 9.3. Runtime is below 9.2, so this round is a **Fail**.

### Findings (round 31, open)

#### CR-461-085 (new): a peer run's live status ends for good, and two sources write it

- **Required action:**
  1. **Server.** An ended peer status entry observes again on Retry (`REFRESH_REMOTE_TASK_EXECUTIONS`, as base: "Retry observes again"). An unrequested end fetches one summary for the views showing the run (AR-403), so the row's reachability is plain.
  2. **Web.** A peer row's agent status has one source, `/ws/run-status`. Summaries set title, reachability and launches only; remove the status writes from `applyRemoteSummaryStatuses`.
  3. **Small items:** `ChildRowsFeed.rowsChanged` required (C31-03); remove `resetRunStatusFeedForTests` and correct the two `run-view-stream.ts` comments (C31-04).
  4. **Tests:** a peer run's link ends, then Retry, and the row's live status follows again; a summary does not change a status.
- **Classification:** `Local Fix`, implementation (server and web).

### Classification And Routing (round 31)

- CR-461-085: `Local Fix` → `/software_engineering_team/implementation_engineer`.
- The next review is a targeted delta on the peer status path.

---

## API/E2E Failure-Origin Review Of API-REV-012 (CRR-043)

### Review Meta

- Review Entry Point: `API/E2E Failure-Origin Review`. Current Code Review Revision ID: `CRR-043`.
- Trigger: API/E2E round 12 (API-REV-012), `Fail`, confidence 87%, on `5b455a9ec7` (CRR-042); evidence commit `d629b4ce0c`. Every remaining area ran in this one round, as asked.
- **Proven:**
  - F-57 (RSM 7/7) and F-59 (SDV-06 from both pages, every delegator kind);
  - PMU 25/25;
  - **API-F01**: a fresh clone, a frozen install, an unsigned arm64 Electron build, the Prisma checks and the packaged-terminal checks.
- Scope: F-60 … F-66 and PLN-09.
- Classification: task_size `Large`, architectural_risk `High`, unchanged.
- **The common origin of F-61, F-62 and F-64:** web code that still derives a delegated run from its delegator. That is the hosting assumption rule 2 removed. FU-034 removes this class for good; here each instance is fixed locally.

### Classification

| Failure | Origin (traced) | Classification | Owner |
| --- | --- | --- | --- |
| **F-60 → CR-461-078** | After a Save on a stopped copy, its card shows the new model with the old origin ("Agent default", "Team default"). Design V-11 (line 786): "an edited agent shows no origin text … The edit becomes the run's own launch". The save path (`StandaloneStoppedRunSelectionUpdater` → `commitRunRuntimeSwitch`, and the team member save) keeps the run's `launchSource`, so the stored origin is false after the edit | `Local Fix` (server; the web shows the stored origin) | Implementation |
| **F-61 → CR-461-079** | With Settings open, a delegated copy selected in an **Org** run or a **stopped Team** run shows the host's card. `resolveSettingsSubject` finds no row, because the editor's delegated rows come from the stored tree's lists: `teamDelegatedLaunchNodes(current.executionTree)` and `rootOrg.taskExecutions` (`ExistingRunConfigEditor.vue` `localDelegatedRows`). 461 removed those lists from stored trees (contract E9). Agent runs and running Teams read the live view's rows, so they work | `Local Fix` (web) | Implementation |
| **F-62 → CR-461-080** | With its delegator stopped, a live copy shows "Stopped" in its own Settings, and its Save is refused (`RUN_ACTIVE`). `isDelegatedCopyLive` (`services/runConfigEditing/delegatedCopyLiveness.ts`) reads the copy's status from **the delegator's live view**, "false when the root has no live view": base's hosting rule (DS-002). A copy's liveness is its own run's (REQ-001, rule 2) | `Local Fix` (web) | Implementation |
| **F-63 → CR-461-081** | In an Org, a delegated copy of the mounted `/squad` was told to message `/squad/mate`, and the message reached **the Org's own mounted mate**, not the copy's. The code follows the contract: step 2 reaches the assigning Org's standing agents by their Org addresses, and "the correction is checked after step 2, so it never hides an agent of the assigning run (ARCH-REV-011)" (contract line 103; `CollaborationTree.resolve`). So LE-O1's "refused" expectation contradicts the contract. But the live run shows the consequence: a copy of a mounted team, using its members' old prefixed names, silently reaches the namesake agents of the Org instead of its own. Both are the user's agents, and §10.2 allows the pair, so this is a misrouting, not a security breach. It is still a delivery to the wrong agent | `Requirement Gap` (contract precedence, decided by ARCH-REV-011, to confirm or revise with this evidence) | Solution Designer |
| **F-64 → CR-461-082** | Opening a stopped Team requests `GetTeamMemberRunProjection` and `GetTeamMemberFileChanges` twice per member, for three members including other Team runs' members. Base `827f1e68dc` makes one request each, for the focused member only (large-runs-load-less) | `Local Fix` (web) | Implementation: pin which hydration fans out |
| **F-65 → CR-461-083** | A message to a Team whose stored log is damaged shows in the conversation, stays in the composer, and the run stays stopped, with no reason in any frame or answer. Base gives one (large-runs-load-less AC-006). This is not a wording difference (FU-030): no refusal reaches the user at all. 461 still requires "a message that is clear and says what to do" | `Local Fix` (server, or web; pin where the refusal is lost) | Implementation |
| **F-66 → CR-461-084** | The peer rows' `launches[]` (address, runtime kind, model, source) are absent on the branch in every view snapshot, `agentRunCollaboration`, `getAgentOrgRunInspection` and `getTeamRunResumeConfig`, and present at base (SR-038, REQ-009). This is data the user sees (a peer copy's model), not wording | `Local Fix` (server) | Implementation |
| PLN-09 | "Archive all" shows "1 failed" with no reason. Which run failed, and why, is not in the evidence | **Hold for Evidence** | API/E2E: capture the failed run and its answer. If it is DS-13's delegated-work refusal, the message must name the run (AC-008) |

### Required Actions

1. **Solution Designer, CR-461-081.** Confirm or revise the contract's precedence for an address under a delegated team's own name (`recipientAddress` prefix) when the assigning run has an agent at that same address. Options:
   - the correction first, for addresses under the run's own delegated name (the agent meant its own teammate);
   - keep step 2 first (ARCH-REV-011) and accept the misrouting as decided.
   Either way, LE-O1's expectation follows the decision.
2. **Implementation (released by the designer at once):**
   - **CR-461-078:** a Settings save makes the edit the run's own launch with no origin (V-11), for an agent run and a team run's member.
   - **CR-461-079:** the editor's delegated rows come from the run's view rows (the server's snapshot), not the stored tree's lists, for Agent, Team and Org runs, live and stopped.
   - **CR-461-080:** a copy's liveness comes from its own run (its own status, or `agentRunCollaborationStatuses`), not its delegator's live view.
   - **CR-461-082:** opening a stopped Team reads only the focused member, once, as base did.
   - **CR-461-083:** a message that cannot restore a Team with a damaged log is refused with a clear reason that reaches the composer; nothing is left pending.
   - **CR-461-084:** peer rows carry `launches[]` again, as SR-038.
   - Each with a test that fails without it.

### Classification And Routing

- CR-461-081: `Requirement Gap` → `/software_engineering_team/solution_designer`. It carries the six Local Fixes, to be released at once.
- PLN-09 is held.
- My gap: in round 13 and round 23 I reviewed the Settings editor's server-side save path (SR-064) but not where its rows and liveness come from after E9 and rule 2 (F-61, F-62).

### Affected Score Rationale

- Runtime Correctness: 9.3 → 8.9 (Settings blocked for live copies, the wrong card for Org and stopped-Team copies, a silent failed send, a false origin, missing peer launches).
- API/E2E Readiness: 9.3 → 9.2 (a contract expectation in dispute).

---

## Round 30: Implementation Review Of IR-030 (CRR-042)

- Review Entry Point: `Implementation Review`. Current Code Review Revision ID: `CRR-042`; Current Review Round: `30`.
- Review Scope: `Targeted Delta Review` of `a4641a0985..5b455a9ec7`, which is web only: `fbe817ff6c` (CR-461-077) and `a047a56127` (F-59).
- Classification: task_size `Large`, architectural_risk `High`, unchanged.
- Checks:
  - IMP-86: web `codegen:check` current, type gate at 90, 5768 passed.
  - IMP-87: RSM-04, RSM-06, AFS-001's card step, SDV-06 (all 6) and PMU 25/25 pass in the real app.
  - I ran the round's 9 web spec files: 52/52.

**CR-461-077 (a stale delegated row after a Save): Resolved.**
- Each saved run's own save answer becomes what its row shows, laid over the row's record by one overlay for Agent, Org and Team rows, live or stopped: `canonicalSelection`, or a team's saved members from `canonicalExecutionTree` (`DelegatedRowControl.savedOf`, `withSaved`).
- A partial save keeps the runs saved before the refusal. The overlay is cleared when Settings bind another run.
- It holds the server's answer, not the user's edit, so CR-002's "no client copy of the edit" stands.
- **Judgment:** this is a session-scoped overlay of the run's own canonical answer, not the re-read DS-8 describes. It is proportionate: the answer is the server's own, the scope is one Settings session, and the editor test fails without it. This code is what FU-034 replaces, with rows from a backend view model, so it is not worth refining further here.

**F-59 (a Task card's agent worker from the Workspace page): Resolved.**
- **The cause, pinned:** the card's open selects the Agent top run; `pages/workspace.vue` moves to `/chat`; the page's leave guard ends every selection intent, the card's own included; so the reveal returned.
- **The fix:** after the move, the reveal continues under a new intent, only while the opened run is still the selected one. A run the user picks meanwhile wins.
- The card spec now issues real intent tokens; the old code fails 4 of its tests.

**For API/E2E:** AFS-001's "Save stored exactly A" reads `userLaunchSelection` from the delegator's tree record, which is base's storage. Under SR-064 the save is on the copy's own run, so that check is stale (`agent-settings-focused-cases.mjs:157-159`). Read the copy's own run instead.

**Scorecard.** As round 29, with Runtime Correctness at 9.3 (from CRR-041's 9.1). Overall 9.4, and every category is at 9.2 or above.

**Findings.** None open.

**For API/E2E (cumulative), on `5b455a9ec7`:**
1. **CR-461-077:** RSM-04, RSM-06, AFS-001 (its storage check rewritten to the copy's own run), DCP-001.
2. **F-59:** SDV-06 from the Workspace page and from the Projects page.
3. **The rest under the agreed rule:**
   - API-P04;
   - API-F01 (the fresh-start desktop build);
   - the SSR cases;
   - the live `agent-initiated-collaborators`;
   - the remaining stale rewrites;
   - BR-011.
4. **Wording-only refusal differences** go to FU-030 (the user's decision).

**Routing.** `Pass`. Recipient: `/software_engineering_team/api_e2e_engineer`. The Implementation Engineer is informed.

---

## API/E2E Failure-Origin Review Of API-REV-011 (CRR-041)

### Review Meta

- Review Entry Point: `API/E2E Failure-Origin Review`. Current Code Review Revision ID: `CRR-041`.
- Trigger: API/E2E round 11 (API-REV-011), `Fail`, confidence 87%, on `a4641a0985` (CRR-040); evidence commit `8166d04bfe`.
- **Proven this round:**
  - CR-461-076: PMU 25/25, PLN-05, SDV-06 (each delegator kind × worker kind), SDV-07;
  - API-P03 on two nodes;
  - batch 1's stale cases rewritten to 461;
  - three wording-only differences recorded under FU-030 (the user's decision).
- Scope: F-56, F-57, the candidate F-59, and the unclassified SIR-002 and BR-011.
- Classification: task_size `Large`, architectural_risk `High`, unchanged.

### Classification

| Item | Origin (traced) | Classification | Owner |
| --- | --- | --- | --- |
| **F-57 → CR-461-077** | **After a delegated copy's launch is saved from its delegator's Settings, the copy's row shows nothing or the old model until Settings are reopened.**<ul><li>The design says "after a Settings save the editor reloads its rows (DS-8)" (design line 927; it replaced base's `delegated_launch_selections_changed`).</li><li>The editor's rows for an Agent delegator come from its collaboration view's row records, live or `delegatedSnapshot` (`ExistingRunConfigEditor.vue` `localDelegatedRows`).</li><li>After the copies' own saves, `delegatedLaunchDraftStore.save` reconciles only the delegator's own settings (`draftStore.reloadCanonical(true)`) and clears the edits. Nothing re-reads the saved runs, so the row shows its stale record.</li><li>The copy does run on the saved value (RSM-04, RSM-06, AFS-001; likely DCP-001).</li></ul> | `Local Fix` (web) | Implementation |
| **F-56** | In a **Team** delegator's tree, clicking a delegated Team's row only expands it. The row has no `agentRunId` (`runHistoryTeamExecutionRows.ts`), and both Team-tree select handlers return early for such a row (`RunListRow.vue` `selectTeamRow`, `RunDefinitionGroups.vue` `selectTeamDisplayRow`). All three files are unchanged from `3d738de6e6`: base's behavior. Agent trees (`selectTaskRow`) and Org trees (`openAgentRunId`) open the coordinator | Reject (base); **follow-up FU-031** (one row behavior in every view) | — |
| **F-59** (candidate) | With the Agent delegator already open, the Task card's agent worker leaves the center on the Manager | **Hold for Evidence** | API/E2E confirms; the implementer reproduces it while fixing CR-461-077. A lead, not a finding: the card path returns unless `openWorkspaceExecutionLink`'s disposition is `committed` (`useTaskRootNavigation.ts`), so check what `openAgentRun` answers when the run is already open |
| **SIR-002** | `helper_run_5555` is still present after a successful 20261020 in a live upgrade | **Hold for Evidence** | API/E2E: is it a delegated copy (`taskAgent` before, `delegatedFrom` after)? 20261020 deliberately skips copies, and 461 keeps them while it is pending, then converts them (SR-079). A copy present is correct; a non-delegated helper run present is a finding |
| BR-011 | Varies after a real restart | Hold (unclassified flake) | API/E2E |

**SIR-002 addendum (API/E2E, `2ae7534880`): Reject, not this ticket.**
- `helper_run_5555`'s own file has `launchPurpose: "server_helper"` and no `taskAgent`, `delegatedFrom` or `address`: a non-delegated server-helper run.
- 20261020 keeps it by its own rule (`remove-skill-improvement-data-migration.ts:112-113`): it deletes only the helper runs its records and improver sessions name, plus the built-in improver's runs, and "never a run only because it was launched as a server helper" (REQ-008). It removed this run's history row, as that rule does.
- The base probe (`d21842c77b`) expects the folder gone, though its session files name no helper. The probe and the migration are both unchanged from `3d738de6e6`, so this is the probe's own data mismatch.
- SDV-07, rebuilt from the coordinator's row, passes.

### Required Actions

1. **CR-461-077 (web), implementation.**
   - After a Save, the delegated rows show what each run now has: re-read the saved runs (each run's own read, SR-064/065), or refresh the view's row records they come from. This is DS-8's "reloads its rows".
   - Cover Agent, Team and Org delegators, live and stopped.
   - Tests: save a copy's model; its row shows the saved model with no reopen.
2. **F-59:** reproduce it while you are in this code. Fix it if it is real, with a test.

### Classification And Routing

- CR-461-077: `Local Fix` → `/software_engineering_team/implementation_engineer`.
- F-59 and SIR-002 are held, with the questions above.
- FU-031 is recorded.

### Affected Score Rationale

- Runtime Correctness: 9.3 → 9.1 (Settings show a stale launch after a save).

---

## Round 29: Implementation Review Of IR-029 (CRR-040)

- Review Entry Point: `Implementation Review`. Current Code Review Revision ID: `CRR-040`; Current Review Round: `29`.
- Review Scope: `Targeted Delta Review` of `15c41ad242..a4641a0985`:
  - `f15a328251`: the delegated Team open;
  - `2818701556` and `0b6da706b9`: SR-080's `topRun`, server and web;
  - `040e0f0815`: a test cast.
  The design and guideline commits are documentation.
- Classification: task_size `Large`, architectural_risk `High`, unchanged.
- Checks:
  - IMP-85: web type gate PASS, 5763 passed; server type gate PASS, unit 8080 passed with 3 folder-watcher failures that pass alone.
  - IMP-84: the probe passes PMU-003 and PMU-018.
  - I ran the round's web specs (41/41) and the server's task-root view test (4/4).

**CR-461-076 (F-54): Resolved.**
- **PMU-003 was pinned in the shared path, not the card.** `delegatedRunsStore.ensureOpen` opened a running delegated Team without activating its workspaces, so the open threw and the row's binding never came. A row click failed the same way.
  - The fix activates them as the Team's own open does (`ensureRunHistoryWorkspaceByRootPath`).
  - One path, fixed once: Principle 11.
- **SR-080:**
  - A Task root carries `topRun` (`DelegationIndex.topOf` of the worker's run). It is derived when the view is built and never stored, on the GraphQL type and the change message. `delegatingRun` stays, for display.
  - The card opens `topRun`'s view and selects the worker's row with that view's own selection:
    - Agent: it expands the task Teams above the row (`taskTeamPathOf`), then calls `selectTaskRow`;
    - Team: the Team link on the coordinator, as the Team tree's row;
    - Org: its inspect action;
    - a worker that is its own top opens as its own run.
  - `openable` follows whether the top is listed (DS-11), so a nested worker opens as at base.
- **Tests:** each delegator kind; a worker two hops down; a worker that is its own top; no top; the store's workspace activation.
- **PMU-019** is the probe's selector (base's hosted address `…/editor` against `/editor` under TC-12), not the product. It is noted for API/E2E.

### Candidate Gate (round 29)

| Candidate | Observation | Basis | Disposition | Reason |
| --- | --- | --- | --- | --- |
| C29-01 | `ProjectTaskService`'s new `topRun?` resolver is optional; when absent, no card opens | Principle 16 | Reject | It follows that service's existing convention, which is base's: `workerStatus?`, `searchCleanup?`, and an unbound process instance for tool-only contexts. It fails closed and visibly (no chevron), with no data effect. Unlike CR-461-075, the default is not the destructive direction. Changing the service's convention is not this ticket's |
| C29-02 | The card's Team path links `{kind:'team', teamRunId: top, agentRunId: coordinator}` | Rule 2 | Pass | That is the Team tree row's own link for a delegated row. PMU-018 passes in the probe |

**Scorecard.** As round 28, except Runtime Correctness: 9.1 → 9.3. Overall 9.4, and every category is at 9.2 or above.

**Findings.** None open.

**For API/E2E (cumulative), on `a4641a0985`:**
1. **CR-461-076:**
   - PMU-003, PMU-018, PLN-05, and PMU-019 with its selector corrected to the row's own address (`/editor`);
   - each delegator kind × worker kind, and a nested worker;
   - a running delegated Team opened from its row (the store fix).
2. **API-B03:** batch 1's open items (BR-011 … 014, PLN-04, PLN-08, PMU-004, -009, -021, -023, -024) and batch 2.
3. **The rest under the agreed rule:**
   - the SSR rewrite;
   - API-P03, API-P04;
   - API-F01 (the fresh-start desktop build);
   - the live `agent-initiated-collaborators`.

**Routing.** `Pass`. Recipient: `/software_engineering_team/api_e2e_engineer`. The Implementation Engineer is informed.

---

## API/E2E Failure-Origin Review Of API-REV-010 (CRR-039)

### Review Meta

- Review Entry Point: `API/E2E Failure-Origin Review`. Current Code Review Revision ID: `CRR-039`.
- Trigger: API/E2E round 10 (API-REV-010), `Fail`, confidence 88%, on `15c41ad242` (CRR-038); evidence commit `d3d2ebe4af`.
- **Proven this round:**
  - F-53 (R10-A 16/16);
  - a late 20261020 (SID-3) and a late team index v2 (LTI-1);
  - C27-02 measured: the first start after the upgrade took 2746 ms against 1831 ms fresh, and the nine follow-ups scanned 0 items each. **C27-02 is closed**;
  - API-E01 in full (264 files) after two stale fixes;
  - DS-15 restart resume (DRO-3).
- Scope: F-54, F-55, O-10a.
- Classification: task_size `Large`, architectural_risk `High`, unchanged.

### Classification

| Item | Origin (traced) | Classification | Owner |
| --- | --- | --- | --- |
| **F-54 → CR-461-076** | **A Task card does not open a delegated Team run.**<ul><li>The card's open path (`composables/projects/useTaskRootNavigation.ts`) is base's hosting path with `hostRoot` renamed to `delegatingRun`. The diff is only the rename.</li><li>At base, the host was the run whose tree held the copy. Now `delegatingRun` is the one-hop delegator, which does not hold the delegated run.</li><li>**Team delegator** (`openInTeamRun`): it links `{kind:'team', teamRunId: <delegator>, agentRunId: <the delegated team's coordinator>}`. The coordinator is not a member of the delegator's team (it is a child row, rule 2), so the link does not resolve: PMU-018, "No Active Team Runs".</li><li>**Org delegator:** `inspect` with that `agentRunId` has the same premise.</li><li>**Agent delegator** (`openInAgentRun` → `selectChild`): an Agent worker opens. A Team worker leaves the center empty: PMU-003, "Select an agent …". The selection's rule-2 binding for a team subject is not reached on this path. The exact break is not pinned; the implementer pins it.</li><li>**Openable:** `isTaskRootDelegatingRunListed` asks whether the one-hop delegator is a top-level row. A delegator that is itself a delegated run with an open Task is not (DS-11), so a nested worker's card is not openable, where base's host (the top) was. Likely PLN-05 and PMU-019.</li><li>Basis: the composable's own contract, "opens exactly as its left-panel row does" (DS-004); rule 2; REQ-009.</li><li>My review gap: I took this composable's diff as a rename and did not trace its team and org paths under rule 2.</li></ul> | `Local Fix` (web) | Implementation |
| **F-55** | **A closed delegated run is not openable from its Task card.**<ul><li>This is base's rule, kept: closed means muted, no chevron (`presentTaskRoot`: `openable = started && !closed && listed`; AR-002, REQ-009).</li><li>Design line 673 says "A closed run can be reached now, from its Task's page", but DS-11 says only that the Task's page *lists* it. The sentence is inaccurate and needs a wording correction.</li><li>The user reaches a closed run when its own view was already open as its Task closed. That is DS-15's real scenario, and the server fence is proven.</li><li>So C15-03's rendered check (SDV-05) can be built: open the run from its row while its Task is open, close the Task (DONE), then send from the still-open view. Base's refusal is expected.</li></ul> | Test construction (API/E2E); design wording (Solution Designer, non-blocking) | API/E2E; Solution Designer |
| **O-10a** | `listWorkspaceRunHistory` leaves out a root its admission refuses. The team history catalog lists only admitted packages (`team-run-history-catalog-service.ts:71-72`, unchanged from base). The connect's answer is base's, at the one place it can arrive | Reject (base's behavior) | — |

**F-55 addendum (after API/E2E rebuilt SDV-05, `d19ca98f77`).**
- When the closed run's row leaves the delegator's view, the open view returns to the delegator's own agent.
- That is base's rule: `returnToHostWhenUnlisted` ("a selected child that left the listing (absent, or its Task is DONE) returns the view to the run's own agent"), in `agentRunCollaborationStore.ts` since `af690af334`, unchanged at `827f1e68dc` and `3d738de6e6`.
- So no rendered path leaves a closed delegated run open for input. C15-03 stays proven at the server (the DS-15 suite, DRO-3), where the fence guards other clients and input already in flight.
- Answer to API/E2E: option (a).

### Required Actions

1. **CR-461-076 (web), implementation.**
   - A Task card opens its worker exactly as the delegator view's row does under rule 2: the worker as its own run (its context, stream and selection), for an Agent and a Team worker, under Agent, Team and Org delegators.
   - Use one open path: the row's, not a second one built from base's hosting links.
   - Decide `openable` by whether that path can open the run, not by whether the one-hop delegator is a top-level row. A nested worker must open as at base.
   - Tests: each delegator kind × worker kind, plus a nested worker.
2. **F-55, API/E2E.** Build SDV-05 from an open view, as above. **Design line 673** needs its wording corrected by the Solution Designer.

### Classification And Routing

- CR-461-076: `Local Fix` → `/software_engineering_team/implementation_engineer`.
- F-55's test route → API/E2E, with the next pass's cumulative list. The wording note goes to the Solution Designer.
- O-10a and C27-02 are closed.

### Affected Score Rationale

- Runtime Correctness: 9.3 → 9.1 (a Team worker cannot be opened from its Task card; nested workers cannot be opened).
- API/E2E Readiness: 9.3 (unchanged).

---

## Round 28: Implementation Review Of IR-028 (CRR-038)

- Review Entry Point: `Implementation Review`. Current Code Review Revision ID: `CRR-038`; Current Review Round: `28`.
- Review Scope: `Targeted Delta Review` of `9c8679c1fb..15c41ad242` (code `1eb945e5f7`). Earlier evidence carries forward.
- Classification: task_size `Large`, architectural_risk `High`, unchanged.
- Checks:
  - IMP-83: type gate PASS; 754 migration, architecture and startup tests passed; unit 8082 passed.
  - I ran the migration family, boundary and registry tests: 52/52.

**CR-461-075 (the optional ledger): Resolved.**
- The ledger is required on `DelegatedRunsOwnRunsV1AppDataMigration`, `PreservedItemsFollowUp` and `createDelegatedRunsPreservedItemsMigrations`, with no default.
- `readerPending` always reads 20261020's status from it.
- `catalogs` is explicit, with `null` meaning none.
- Tests pass a ledger: a `SUCCEEDED` stub, or the runner's records where the reader is the subject.

**C27-02** (ten upgrade scans) stays a suggestion, not measured. API/E2E can record the first-start time on its faithful corpus.

**Scorecard.** As round 27, except API / Interface clarity: 9.1 → 9.3. Overall 9.4, and every category is at 9.2 or above.

**Findings.** None open.

**For API/E2E (cumulative), on `15c41ad242`:**
1. **F-53 / CR-461-074:** the team-run-v1 restart-retry scenario ends with no stored list. Also run a late 20261020 (the improver's copy is kept, then converted and listed) and a late team index v2 (the delegated team rows return).
2. **C27-02:** the first start's time on the faithful corpus, for the record.
3. **The rendered connect answer** for the token-blocked root (next round, per API-REV-009).
4. **The list waiting under the agreed rule:**
   - E-007 and the live suites;
   - API-P03, API-P04;
   - DS-15's restart resume;
   - C15-03 rendered;
   - API-B03;
   - API-E01 in full;
   - API-F01.

**Routing.** `Pass`. Recipient: `/software_engineering_team/api_e2e_engineer`. The Implementation Engineer is informed.

---

## Round 27: Implementation Review Of IR-027 (CRR-037)

- Review Entry Point: `Implementation Review`. Current Code Review Revision ID: `CRR-037`; Current Review Round: `27`.
- Review Scope: `Targeted Delta Review` of `f92881dd13..9c8679c1fb` (the head the implementer corrected; the code is `f20353ecc3`): the migration family and the registry. Round 23's full review and round 25's re-audit carry forward.
- Trigger: IR-027, implementing SR-079 (ARCH-REV-052 Pass), which answers CR-461-074.
- Classification: task_size `Large`, architectural_risk `High`, unchanged.
- Checks:
  - IMP-82: type gate PASS; unit 8082 passed; 754 migration, architecture and startup tests passed; integration 491 passed, with 4 file-watcher failures (FU-021).
  - I ran the migration family's tests, the boundary test and the registry tests: 52/52.

**CR-461-074 (late predecessors): Resolved.**
- **Classification:** every earlier migration has exactly one class: writer, reader, rebuilder or none. A test requires it and cites both searches.
- **The implementer's check against the code** corrected the design's table:
  - `20260521_team_run_history_index_v2` is a writer: a late run drops the delegated team rows, so it gets a step-8 follow-up. Its loss of user-started teams' rows is base's (FU-029).
  - The three address and path migrations are none: the locators are stored and resolved by run ID (`team-context-file-locator-transition.ts:71`, `context-file-owner-resolver.ts:71-97`).
- **One definition:** `PreservedItemsFollowUp(predecessor, steps)`. Each follow-up waits while its predecessor is `FAILED` or `NOT_RUN` (it is a prerequisite), holds back only itself, and is idempotent by structure.
- **The reader:** while `20261020` is not terminal, every plan keeps the improver's delegated copies in their released shape (`waitsForReader`), because 20261020 would select a converted copy and delete it (F-25's class). Its follow-up converts them afterwards.
- **Tests:**
  - F-53 through the real runner ends with no stored list;
  - a late 20261020 keeps the copy, then it is converted and listed (fails without the rule);
  - late index rebuilds use the real index migrations.

### Candidate Gate (round 27)

| Candidate | Observation | Basis | Disposition | Reason |
| --- | --- | --- | --- | --- |
| C27-01 | The migration ledger is optional on the main migration (`options.ledger?`) and on `createDelegatedRunsPreservedItemsMigrations(…, ledger = null)`. Without it, "the reader is taken as terminal" (`delegated-runs-own-runs-v1-app-data-migration.ts`, `execute`): `readerPending` is false, so improver copies are converted, and a pending 20261020 would then delete them. The tests that leave it out are the only reason it is optional. The released predecessors take the ledger as required (`task-agent-own-run-v1-app-data-migration.ts:63`) | Principle 16 ("a required collaborator that is missing is a construction or startup error … its parameter is not optional because tests leave it out"); Principle 13 (behavior decided by absence) | **Promote → CR-461-075** | The default is the data-losing direction (F-25). Today one production construction site passes it; the rule exists so the next one cannot silently omit it |
| C27-02 | Ten scans of the corpus at the first start after the upgrade (the main migration and nine follow-ups), most finding nothing because their predecessor finished long ago | `DESIGN.md` best practice 7 | Reject; a suggestion | One-time cost. Measure on a faithful corpus first. If it matters, a follow-up whose predecessor finished before ours started has nothing late and can complete without scanning |
| C27-03 | The writers' follow-ups apply steps 4, 6 and 8, not 1 | DS-10 | Pass | None of them writes Task records (the classification evidence) |

**Scorecard.** As round 26, except:
- API / Interface clarity: 9.3 → 9.1 (CR-461-075);
- Runtime Correctness: 9.2 → 9.3 (CR-461-074 resolved).

API / Interface clarity is below 9.2, so this round is a **Fail**.

#### CR-461-075 (new): the ledger is optional, and its absence converts what 20261020 would delete

- **Required action:**
  - Make the ledger required on `DelegatedRunsOwnRunsV1AppDataMigration` and on `createDelegatedRunsPreservedItemsMigrations` / `PreservedItemsFollowUp`, as the released predecessors do.
  - Remove the "taken as terminal" default.
  - Tests pass a ledger (a stub answering `SUCCEEDED` where the reader is not the subject).
- **Classification:** `Local Fix`, implementation.

**Routing.** `Local Fix` → `/software_engineering_team/implementation_engineer`. The next review is a targeted delta on this change.

---

## API/E2E Failure-Origin Review Of API-REV-009 (CRR-036)

### Review Meta

- Review Entry Point: `API/E2E Failure-Origin Review`. Current Code Review Revision ID: `CRR-036`.
- Trigger: API/E2E round 9 (API-REV-009), `Fail`, confidence 89% (up from 86%), on code `f92881dd13` (CRR-035); evidence commit `03368a1efa`.
- **Proven this round:**
  - F-50 on every entry point (USR-4, USR-6, USR-7, USR-8);
  - F-52 (UC-1, UC-2);
  - team-run-v1's connect answers at the server;
  - TAU-2 over three starts;
  - O-8b answered: a user-started run and a delegated copy are told the same, so **O-8b is released (Reject)**;
  - the phone (MSP-53 … 55), the desktop (SDV), the peer suite 44/44, and API-L01 with real inference.
- Scope: F-53.
- Classification: task_size `Large`, architectural_risk `High`, unchanged.

### Classification

| Failure | Origin (traced) | Classification | Owner |
| --- | --- | --- | --- |
| **F-53 → CR-461-074** | **The design's predecessor set misses a migration that is late because it *waits*.**<ul><li>DS-10 (design lines 550-556) and SR-078 (c) cover predecessors that are late because they are `FAILED` and retried. A migration can also be late because it is `NOT_RUN` behind a failed prerequisite.</li><li>In this case `token-usage-run-records-v1` fails on the first start, so `20260901_agent_org_flat_team_families_v1` (prerequisites `team-run-execution-tree-v2` and `token-usage-run-records-v1`, registry line 99) waits.</li><li>461's main migration (no hold) runs in that start and completes.</li><li>On the retry restart, the flat-families migration writes the Org tree in its released shape, with `rootOrg.members[…].taskExecutions` holding a local link (contract E9: no stored list). No follow-up covers it.</li><li>The readers ignore the list (`agent-org-run-execution-tree-schema.ts:82`), so nothing visible breaks. But the stored data is left half-converted, which `DESIGN.md` rule 7 and the data guideline exclude.</li><li>The task agent's own file *is* converted, so the run itself is sound.</li></ul> | `Design Impact` | Solution Designer |
| F-53's `skillAccessMode` | The same retry writes a launch with `skillAccessMode`, which `20260706_remove_global_skill_discovery_mode` (registry line 81, no prerequisite) removed on the first start. Both migrations and their order are base's | **Follow-up FU-028** (not this ticket) | — |

### Required Actions

1. **CR-461-074, Solution Designer.**
   - Complete DS-10's predecessor set. Which migrations registered before 461 write shapes 461 converts (trees with stored lists, own files, logs, busy records), and can run **after** it? That means `FAILED` and retried, **or** `NOT_RUN` behind a prerequisite that failed (the flat-families migration is the case found).
   - For each, decide what converts what it writes later. A follow-up per predecessor, as SR-078 (c) does, would cover the flat-families migration with step 6 (and any other step its output needs).
   - Name the test: the team-run-v1 restart-retry scenario ends with no stored list.
   - My gap: I accepted SR-078's predecessor set as complete without checking the registry for migrations with prerequisites.

### Classification And Routing

- CR-461-074: `Design Impact` → `/software_engineering_team/solution_designer`.
- FU-028 is recorded in `follow-ups.md`.
- O-8b is released.

### Affected Score Rationale

- Runtime Correctness: 9.3 → 9.2 (an upgrade-retry path leaves a half-converted tree; nothing visible breaks).
- API/E2E Readiness: unchanged, 9.3.
- The rest is unchanged.

---

## Round 26: Implementation Review Of IR-026 (CRR-035)

- Review Entry Point: `Implementation Review`. Current Code Review Revision ID: `CRR-035`; Current Review Round: `26`.
- Review Scope: `Targeted Delta Review` of `726666cad2..f92881dd13`:
  - `43f567b5d2`: cross-run delivery;
  - `2b48f995c9`: the stopped team and Org view connect;
  - the design notes `958880cde0` and `564c973c9d` (ARCH-REV-051 Pass).
  The handoff named the head `3e3a1c7d06`; the implementer corrected it to `f92881dd13`, which matches the branch. Round 25's re-audit and round 23's full review carry forward.
- Classification: task_size `Large`, architectural_risk `High`, unchanged.
- Checks:
  - IMP-81: type gate PASS; unit 8078 passed; integration 492 passed, with 3 file-watcher failures (FU-021).
  - I ran the three changed test files: 66/66.

**CR-461-072 (the reopen before the check): Resolved.**
- `admit` now runs base's reopen-step order:
  1. the Task side's `assertReopenable`, which is read-only and advisory;
  2. `restorability.refusal`;
  3. `reopenAssignment`, which validates again under the Task's serialization (`project-task-service.ts:298-316`).
- A refusal throws base's `TASK_EXECUTION_CONTEXT_UNAVAILABLE` and changes nothing, with no "open again" note.
- The later check runs only for a run this call did not reopen.
- The two checks are not one atomic step as at base, but the window only matters if the run's files change between two reads in one call, which is not a supported scenario.
- The test covers the refusal, the Task still closed, and the reopen never requested; DONE is refused by eligibility first.

**CR-461-073 (an unconverted root's reason): Resolved.**
- The stopped team and Org views raise `…NotRestorableError` with the admission's own refusal. The handlers send that code and text and close with 4004.
- The user now gets `TEAM_RUN_STATE_PACKAGE_NOT_CATALOGED` / `TOKEN_USAGE_EXISTING_RUN_RESTORE_MIGRATION_REQUIRED` (and the Org's counterparts) with base's texts, at the one place the reason can reach them.
- An admitted file that cannot be read still answers "cannot be restored", with the detail logged (CR-461-069).
- Tests cover both team codes and the Org connect.

**Scorecard.** As round 25, except:
- Data-Flow Spine: 9.3 → 9.4;
- API: 9.2 → 9.3;
- API/E2E Readiness: 9.2 → 9.3;
- Runtime Correctness: 9.1 → 9.3.

Overall 9.4, and every category is at 9.2 or above.

**Findings.** None open. O-8b is still held, and API/E2E is asked for it below.

**For API/E2E (cumulative), on `f92881dd13`:**
1. **Rounds 25–26:**
   - **F-50 (USR-4):** base's refusal on the agent stream, the team stream and the delegator's `send_message_to`, including a closed Task's run. The Task stays closed and nothing is delivered.
   - **F-52 (UC-1)** on a running server.
   - **team-run-v1 ×2:** the connect answers the admission's reason code and text, and no message names a schema field. Check that the web shows that text.
   - **TAU-2:** after the predecessor's retry, its follow-up converts the preserved copy, which is then listed and its own save works. While the predecessor is FAILED, the follow-up waits without a record.
2. **O-8b (held):** what a copy's own view shows for its background step after Task DONE stops it, against a user-started run stopped mid-step.
3. **The list waiting under the agreed rule:**
   - E-007 and the live suites;
   - the phone, desktop, peer and API-L01 reruns;
   - API-P03, API-P04;
   - DS-15's restart resume;
   - C15-03 rendered;
   - API-B03;
   - API-E01 in full;
   - API-F01.

**Routing.** `Pass`. Recipient: `/software_engineering_team/api_e2e_engineer`. The Implementation Engineer is informed.

---

## Round 25: Implementation Review Of IR-025 (CRR-034)

### Review Meta

- Review Entry Point: `Implementation Review`. Current Code Review Revision ID: `CRR-034`; Current Review Round: `25`.
- Review Scope: **`Full Re-Audit` of this round's changes** (`fdf5ad8380..726666cad2`, 23 source files).
  - The round adds three migrations, a new owner (`DelegatedRunRestorability`), new answers on all three streams and in cross-run delivery, and a restore admission in two run services. That touches spines and shared interfaces.
  - Round 23's full review carries forward for the rest of the change.
- Trigger: IR-025. It answers CRR-033 under SR-078 (ARCH-REV-049 Fail on AR-027, then ARCH-REV-050 Pass).
- Classification: task_size `Large`, architectural_risk `High`, unchanged.
- Checks:
  - IMP-80: server type gate PASS; unit 8075 passed, 1 failed (the boundary test, fixed in `e0af2eed44`); integration 491 passed, with 4 file-watcher failures (FU-021, load-dependent); web 5757 passed.
  - I ran this round's 10 changed unit-test files and the migration, registry-order and boundary tests: 151/151.
  - Sweeps on this round's diff: no new swallowed errors, no dead exports. The largest changed file is `agent-team-run-manager.ts` at 433 lines.

### Prior Findings Rechecked

| Finding | Status | Evidence |
| --- | --- | --- |
| CR-461-071 (rows and statuses from two sources) | **Resolved** | `RunViewChildren.read` (the collaboration read, the Org inspection, the Team history) now uses the views' one builder `readViewSnapshot`: a status for every agent of the rows actually read. The stream views already did. The list poll keeps `followers.statuses`, which is not correlated with rows |
| CR-461-068 (b) (a preserved copy never becomes a run of its own) | **Resolved** (SR-078 c) | One follow-up per predecessor, with the main migration's own steps and builders (`DelegatedRunsPlan`). Each has only the main migration and its predecessor as prerequisites. The runner throws `AppDataMigrationPrerequisiteError` before writing any record, so a follow-up waits and retries at every start, and the node stays usable. The predecessor IDs are local constants (the sealed area's rule; `app-data-migration-boundaries.test.ts` passes). Each follow-up is recognized as done by structure, so it is idempotent. They are registered after the main migration |
| CR-461-068 (a) | **Resolved** | The expectation is now base's `INTERNAL_ERROR`; no code change |
| CR-461-069 (raw schema error at connect) | **Resolved for rule 7**; placement → CR-461-073 | No schema text reaches the user. A file that is admitted but cannot be read answers `TEAM_RUN_NOT_RESTORABLE` / `AGENT_ORG_RUN_NOT_RESTORABLE`, with the detail logged (`unrestorableRoot`) |
| CR-461-070 (base's refusal for a run that cannot be restored) | **Resolved on the streams**; reopened on one path → CR-461-072 | `DelegatedRunRestorability` is one owner, built on base's builder. It is asked before the agent stream restores (after the closed-Task fence), on a stopped team's stream, and in cross-run delivery. A live entry agent passes without a read, and a user-started run is not asked |

### Candidate Gate (round 25)

| Candidate | Observation | Basis | Disposition | Reason |
| --- | --- | --- | --- | --- |
| C25-01 | `CrossRunMessageDelivery.route` calls `admit` (the assigner's `reopenAssignment`, a Task commit) **before** `restorability.refusal`. A refused message therefore leaves the Task reopened, and its text says the run "continues with its conversation (its Task is open again) … send it again", which is false for a run that cannot continue | Base checked inside the reopen's own queue step, before the commit (`prepareClosedCopyForResume` → `assertRestorableChain`, `root-task-execution-lifecycle.ts:332-337` at base), so a refused reopen changed nothing; CR-461-043's rule (refuse before anything changes); REQ-009 | **Promote → CR-461-072** | A supported path: the assigner's follow-up message to a closed delegated run (a normal flow) whose saved conversation is damaged (the USR edge base handled). Consequence: a Task reopened on a run that cannot continue, and a refusal telling the agent to retry |
| C25-02 | SR-078's two answers for an unconverted root cannot both be reached. The view connect refuses (`TEAM_NOT_FOUND`) and closes the stream (`agent-team-stream-handler.ts` connect, 4004), so no session exists to send the "first message" whose acknowledgement would carry the reason. The org handler is the same | Design lines 686-690 (the test asks for both); base's web hydrated a stopped team without the stream, and its send called the restore mutation, so the user saw the reason | **Promote → CR-461-073** | The user never learns why (migration required, not cataloged); design line 690's test cannot pass as written. Which answer the connect gives is the designer's choice |
| C25-03 | `rootRestoreRefusal` repeats the admission checks that `restoreTeamRun` / `restore` also apply inside | Principle 11 | Reject | The connect must ask without restoring, and both use the same primitives (`assertExistingRunRestoreReady`, the package catalog). Not two policies |
| C25-04 | Two `DelegatedRunRestorability` instances (the agent root manager's, the composition's) | Principle 16 | Reject | One class and one builder, with each instance's liveness from its own owner |
| C25-05 | The follow-ups re-scan the whole corpus at the first start after the upgrade | `DESIGN.md` best practice 7 | Reject | Three scans, once, as the main migration did; measure if it matters |

### Scorecard (round 25)

| Priority | Category | Score | Why / What Is Weak |
| --- | --- | --- | --- |
| 1 | Data-Flow Spine Inventory and Clarity | 9.3 | One order slip on the assigner's message spine (CR-461-072) |
| 2 | Ownership Clarity and Boundary Encapsulation | 9.4 | Restorability has one owner; the migrations share one plan and builders |
| 3 | API / Interface / Query / Command Clarity | 9.2 | An unconverted root's reason has no reachable surface (CR-461-073) |
| 4 | Separation of Concerns and File Placement | 9.3 | — |
| 5 | Shared-Structure / Data-Model Tightness | 9.4 | One snapshot builder (CR-461-071 resolved) |
| 6 | Naming Quality and Local Readability | 9.3 | — |
| 7 | API/E2E Readiness | 9.2 | Design line 690's test cannot pass as written |
| 8 | Runtime Correctness And Behavioral Fidelity | 9.1 | CR-461-072 |
| 9 | No Backward-Compatibility / No Legacy Retention | 9.4 | — |
| 10 | Cleanup Completeness | 9.4 | — |

Overall 9.3. Runtime is below 9.2, so this round is a **Fail**.

### Findings (round 25, open)

#### CR-461-072 (new): the assigner's message reopens a Task before checking that the run can continue

- **Concrete problem:**
  - `route` runs `admit` (eligibility, then `reopenAssignment`, which commits the Task open) and only then `restorability.refusal`.
  - For a closed delegated run whose entry agent's conversation is damaged, the message is refused, but the Task stays reopened: its row comes back and its Task counts as open.
  - The refusal text tells the agent the run "continues with its conversation … send it again".
- **Protects:** base's order (the check inside the reopen's queue step, before its commit); CR-461-043's rule of refusing before anything changes; REQ-009.
- **Required action:**
  - Ask `restorability.refusal` after the eligibility refusals (R-8, R-7, as now) and before `reopenAssignment`.
  - A refusal then changes nothing and uses base's text, without the "open again" note.
  - Test: the assigner messages its closed run whose log is damaged. Expect base's refusal, the Task still closed, and no row reopened.
- **Classification:** `Local Fix`, implementation.

#### CR-461-073 (new): an unconverted root's reason cannot reach the user

- **Concrete problem:**
  - SR-078 places base's two answers: the view connect gives `TEAM_NOT_FOUND`, and the first message gives the reason code.
  - The connect closes the stream, so there is no session for a first message. The reason codes are reachable only in a race.
  - Base's user saw the reason when sending, because base's web hydrated the stopped run without the stream and restored it through the mutation.
- **Required decision:** where the reason appears now that a stopped run's view is its stream.
  - Example: the connect answers with the admission's code and text (instead of `TEAM_NOT_FOUND`).
  - Or keep `TEAM_NOT_FOUND`, accept the lost reason as a behavior change, and correct design line 690's test.
- **Classification:** `Design Impact`, Solution Designer.

### Classification And Routing (round 25)

- CR-461-073: `Design Impact` → Solution Designer.
- CR-461-072: `Local Fix`, carried by the designer and released at once (it does not depend on -073).
- Next: a targeted delta on the delivery order and on the connect's answer.

---

## API/E2E Failure-Origin Review Of API-REV-008 (CRR-033)

### Review Meta

- Review Entry Point: `API/E2E Failure-Origin Review`. Current Code Review Revision ID: `CRR-033`.
- Trigger: API/E2E round 8 (API-REV-008), `Fail`, confidence 86% (up from 84%), on code `fdf5ad8380` (CRR-032); evidence commit `c9b7aa57ea`.
- **Proven this round:**
  - CR-461-067: FOLLOW-A and FOLLOW-T for agent, team and Org delegators, plus FOLLOW-S and FOLLOW-E (SR-064);
  - F-43 (DTL-005 in every root) and F-47 (both run-ID forms);
  - K-15 (S26, S27);
  - the stories: §5.1 28/28, §5.2 12/12, §5.3 9/9;
  - 13 stale suites rewritten to 461's rules.
- Scope: F-49 … F-52 and the observations O-8a … O-8c.
- Classification: task_size `Large`, architectural_risk `High`, unchanged.

### Classification

| Failure | Origin (traced) | Classification | Owner |
| --- | --- | --- | --- |
| **F-49 (b) → CR-461-068** | **The design's premise does not hold.**<ul><li>DS-10 step 8 gives each delegated run its history row once.</li><li>A copy preserved for an unfinished predecessor gets none, and 461's migration ends `SUCCEEDED_WITH_WARNINGS`.</li><li>The runner treats that status as terminal and never runs it again (`app-data-migration-runner.ts`, `runPending`).</li><li>So when `20261017_…`'s retry later writes the copy's own file, nothing adds the row. The copy's own save reads its metadata, then finds no row: `NOT_FOUND` "Run 'c1-reviewer' was not found." (`standalone-stopped-run-selection-updater.ts:119-121`).</li><li>The design says the copy is then "read as an ordinary run … and its own Settings save works" (design line 568), but no step does that.</li><li>My review gap: I accepted SR-077's Q-1 decision without checking that premise against the runner's terminal status.</li></ul> | `Design Impact` | Solution Designer |
| **F-49 (a) → CR-461-068** | Before the predecessor's retry, the copy has no own file. The public save's ownership check (`studio-run-model-config-service.ts:88-118`, unchanged from base) cannot read its resume config and answers `INTERNAL_ERROR` "Run ownership could not be verified". That is base's answer for any run ID with no own file. SR-077's `NOT_FOUND` was never what the product gives | `Requirement Gap` (the expectation) | Solution Designer |
| **F-51 → CR-461-069** | **A root its migration could not convert.**<ul><li>At base, the user's restore (the `restoreAgentTeamRun` mutation) gave the reason: `TEAM_RUN_STATE_PACKAGE_NOT_CATALOGED` / `TOKEN_USAGE_EXISTING_RUN_RESTORE_MIGRATION_REQUIRED`. Base's view connect restored first and answered `TEAM_NOT_FOUND` when that failed.</li><li>461 removed the mutation (CR-461-008, replaced by SR-046's restore on the first message). The stopped-run view parses the stored file first.</li><li>So the user now gets a raw schema error at connect: `TEAM_STREAM_UNAVAILABLE` "rootTeam.members[1] is missing required field(s) …".</li><li>The design never decided where base's admission reasons appear now. Choosing between base's two answers (the view's `TEAM_NOT_FOUND` and the restore's reason codes) is a product choice. Either way, a raw schema error is not contained (`DESIGN.md` rule 7).</li></ul> | `Design Impact` | Solution Designer |
| **F-50 → CR-461-070** | **The user's message to a delegated team whose coordinator's log is damaged.**<ul><li>At base, restoring a released copy checked first (`assertRestorableChain`). It refused with `TASK_EXECUTION_CONTEXT_UNAVAILABLE` "The delegated Team at '…' cannot be restored: the saved conversation of its coordinator '…' cannot be read (…). Its files were left unchanged. Start a new delegation …", which the team stream sent as `TEAM_SEND_MESSAGE_REJECTED`.</li><li>In 461 that check runs only for `delegate_task` by run ID (`task-delegation.ts:383-386`, CR-461-043). A message on the run's own stream reaches the coordinator's activation check, whose generic text names only the damaged line: no Team, no coordinator, no next step.</li><li>Rule 2 changed the route, not the result (REQ-009). The earlier ticket's AC-006 requires the Team, the coordinator, the line and the next step. The refusal builder exists (`run-conversation-availability.ts:44-61`).</li></ul> | `Local Fix` | Implementation (server) |
| **F-52 → CR-461-071** | **One run's unreadable own file breaks its delegator's whole view (rule 7).**<ul><li>The view's snapshot sends two pictures of the same rows from two sources.</li><li>The rows: each record is read fresh, and an unreadable one is left out with a warning (`run-view-rows.ts`, `readRow`).</li><li>The statuses: from the follower's cache (`readRowsAtBase` → `cachedStatuses`), whose agents come from `DelegationIndex.agentsOf`. That holds the run's parts as read before the file was truncated (kept by design while the run lives).</li><li>On a running server the statuses therefore name an agent whose row was left out. The contract rejects the snapshot ("Agent root status identity mismatch.", `root-execution-view-dtos.ts:105-108`), and the delegator's view fails.</li><li>After a restart the parts cannot be read either, so the two agree, which is why UC-2 passes.</li><li>Principle 11: one picture, one builder. My review gap: in round 13 I checked that `readRowEvent` and `readViewRows` leave an unreadable row out (C13-04), but not that the snapshot's statuses follow the same set.</li></ul> | `Local Fix` | Implementation (server) |

### Observations

| Observation | Disposition | Reason |
| --- | --- | --- |
| O-8a (the hub context-file route serves a delegated run's file) | Reject | It is DS-8's lookup through the delegator's children (`DelegatedChildLocations`, one hop, by the tree), not a kept legacy path. The run's own route serves the web |
| O-8b (no background "stopped" frame after Task DONE stops a copy) | **Hold for Evidence** | The delegator's view relays statuses only, as designed. Missing evidence: what the copy's **own** view shows for the background task after the stop, compared with a user-started run stopped with a running background task. If the copy's own view keeps showing it running, that is a finding |
| O-8c (OT-2 reads a closed run's own file) | Reject | 469's D-5 read, unchanged; not this ticket |

### Required Actions

1. **CR-461-068, Solution Designer.**
   - (b) Decide how a copy preserved by an unfinished predecessor becomes a run of its own after that predecessor's retry. The design promises it, but 461's migration is terminal once it reports `SUCCEEDED_WITH_WARNINGS`. Options:
     - 461's migration stays retried while it holds preserved items;
     - a row is added at startup for a delegated run with an own file and no row;
     - the design's promise is withdrawn.
   - (a) Correct SR-077's expectation for the first start (`INTERNAL_ERROR`, base's answer for a run with no own file), or decide otherwise.
2. **CR-461-069, Solution Designer.**
   - Decide what the user gets for a team (or org) root its migration could not convert, now that restore is the first message (SR-046) and the restore mutation is gone: base's view answer (`TEAM_NOT_FOUND`), the restore's reason codes at connect, or another surface.
   - Whatever is chosen, no raw schema error reaches the user (rule 7).
3. **CR-461-070, Implementation.**
   - Before a message restores a delegated run (the user's message on its own stream; check the delegator's `send_message_to` too), check that its entry agent's conversation can continue. Refuse with base's `TASK_EXECUTION_CONTEXT_UNAVAILABLE` text through the stream's rejection (`TEAM_SEND_MESSAGE_REJECTED` for a team; the agent stream's equivalent), naming the run, its coordinator and the next step. Nothing is delivered and nothing changes.
   - A run the user started keeps its current text.
   - Test each entry point, for an agent run and a team run.
4. **CR-461-071, Implementation.**
   - A snapshot's statuses are the statuses of the rows it sends: build both from the one set of rows read, in the agent, team and Org views and the history reads that share it.
   - Test: a running server, a delegated run whose own file is truncated after its parts were read. Its delegator's view opens without that row, with a warning naming it, and the other rows and statuses are intact.

### Classification And Routing

- CR-461-068 and CR-461-069: `Design Impact` (with -068 (a) a `Requirement Gap` on the expectation).
- CR-461-070 and CR-461-071: `Local Fix`.
- Mixed result: the Design Impact governs, so I route to `/software_engineering_team/solution_designer`, which carries the two Local Fixes. They do not depend on its decisions, so it can release them at once.
- O-8b is held: API/E2E is asked for the copy's own view after the stop.

### Affected Score Rationale

- Runtime Correctness: 9.3 → 9.0 (two lost base results, one view that a single unreadable run takes down, one promise the design cannot keep).
- Shared-Structure / Data-Model Tightness: 9.4 → 9.3 (two builders for one picture, CR-461-071).
- The rest is unchanged.

---

## Round 24: Implementation Review Of IR-024 (CRR-032)

- Review Entry Point: `Implementation Review`. Current Code Review Revision ID: `CRR-032`; Current Review Round: `24`.
- Review Scope: `Targeted Delta Review` of `2ae95ff56a..fdf5ad8380`:
  - the fix `f9c2c351a4` (`local-child-observation.ts`);
  - the cleanup `7569c83a4c`;
  - the new test.
  Round 23's full review carries forward for the rest of the change.
- Classification: task_size `Large`, architectural_risk `High`, unchanged.
- Checks:
  - IMP-79: type gate at the 1012 baseline; unit 8050 passed, with 1 file-watcher failure (autobyteus-460's test, passes alone); integration 492 passed, with 3 file-watcher failures (FU-021); DTL-005 passes.
  - I ran the two follower test files: 6/6.

**CR-461-067 (a delegator's open view across a child's Stop and restore): Resolved.**
- The follower owns it, as required.
  - When the access ends its observation at a Stop, `LocalChildObservation` publishes `offline` for the row's agents, including a member whose start failed. It then observes the run again while the row is open (`isOpenRow`).
  - The accesses are unchanged, so DS-006's end-on-Stop stays the peer owner's rule.
- **Agent row:** the new observation goes through `resolveRoot`. That loads the stopped run's root without starting its agent, which is what opening a view on a stopped row already did. The restore then fires that root's host-ready hook.
- **Team row:** the lifecycle subscription attaches to the restored root.
- **Edges traced:**
  - **Delete:** `DelegatedWorkGuard` tells the tree `runDeleted` before `endRoot`, so the row is gone and the run is not followed again.
  - **A root loaded for a stopped run:** it does not block a later delete or archive. `releaseForHistory` ends a root with no active host.
  - **Archive:** archiving a stopped child whose Task is open can load its root again while the delegator's view is open. That is what opening the view already did, so it is not new with this fix.
  - **A run that cannot be resolved:** the error is caught with a warning, and the row keeps `offline`.
- **Tests:** `local-child-stop-restore.test.ts` drives the real `StandalonePairedAgentAccess` and `TeamPairedAgentAccess`, for an agent row and a team row, including a failed writer. Both fail without the fix.
  - The third test closes the row before the Stop, so it covers `entry.closed` rather than `isOpenRow` itself. In the real delete order the row closes first too, so this is acceptable.

**C23-03: Resolved.** The live-lease wording is gone, `arm()` is private, and `CollaborationTree`'s class comment reads correctly.

**Scorecard.** As round 23, except:
- Data-Flow Spine: 9.3 → 9.4;
- Naming: 9.2 → 9.3;
- Runtime Correctness: 9.1 → 9.3;
- Cleanup: 9.3 → 9.4.

Overall 9.4, and every category is at 9.2 or above.

**Findings.** None open.

**For API/E2E (cumulative), on `fdf5ad8380`:**
1. **CR-461-067:** with a delegator's view open (agent, team and org delegators), stop a local child, for an agent child and a team child (one with a failed member). Restore it by a message. The row shows `offline`, then the restored run's live status.
2. **C23-02:** a peer-started team with a member in `error` now idles out (DS-7). Update any suite that assumed otherwise.
3. **Round 23's changes:**
   - DTL-005 in every root;
   - F-47 on both run-ID forms, and the recipient path unchanged;
   - S26/S27 and TAU-2 per SR-077.
4. **The Next Round list still open from API-REV-007:**
   - the remaining stale suites;
   - API-P03, API-P04;
   - DS-15's restart resume;
   - C15-03 rendered;
   - API-B03;
   - API-E01 in full;
   - API-F01.

**Routing.** `Pass`. Recipient: `/software_engineering_team/api_e2e_engineer`. The Implementation Engineer is informed.

---

## Round 23: Full Review Of The Whole Change At IR-023 (CRR-031)

### Review Meta

- Review Entry Point: `Implementation Review`. Current Code Review Revision ID: `CRR-031`; Current Review Round: `23`.
- Review Scope: **`Full Review` of the whole change**, as agreed with the user after CRR-030. The last full pass was round 13 (CRR-017); rounds 14–22 were deltas.
  - Range: 461's own commits on the merge base `3d738de6e6` up to `2ae95ff56a`: 322 changed source files on the server, web and contracts.
  - Read in full again: the cross-run owners (`DelegationIndex`, `CollaborationTree`), the view followers (`LocalChildFollowers`, `LocalChildObservation`, `PeerChildObservation`), the paired-agent accesses (agent and team), the quiet shutdown (`RootTeamRun.shutDownIfQuiet`, `DelegatedTeamIdleShutdown`, the quiescent preparations down to `AgentRunTermination`), `TaskDelegation`'s two entry forms, and this round's diff.
  - Re-traced each spine per case: kinds (agent, team, org delegator), local and peer, open and listed rows, idle shutdown, **Stop and restore**, delete.
  - Swept the whole change again: swallowed errors (new ones against base), optional lookups and collaborators, process slots, dead exports across the repository, file sizes, and migration order.
- Trigger: IR-023 (`a18c16f5d8`, `0e1bb399e2`, with SR-077's expectations). It answers CRR-030.
- Classification: task_size `Large`, architectural_risk `High`, unchanged.
- Checks: IMP-77 and IMP-78 as recorded; nothing rerun:
  - the type gate is at its 1012 baseline;
  - unit: 8048 passed;
  - integration: 491 passed, with 4 file-watcher failures that pass alone (FU-021);
  - DTL-005 passes.

### Prior Findings Rechecked

| Finding | Status | Evidence |
| --- | --- | --- |
| CR-461-061 (an Org's delegated team whose member failed to start never idles out) | **Resolved** | Two causes on the real path, both pinned (IMP-77). (1) `shutDownIfQuiet` checked `hasOpenExecutionWork()`, which counts `error`. Base's delegated task Team (`tryShutDownRootTaskTeamIfQuiet`, `root-team-execution-directory.ts:278` at base) ended on its quiescent preparation alone, so removing the check restores base. The preparation still refuses a member that is starting or running, a turn, a pending command or a running background task (`agent-run-termination.ts:78-82`). Base's other hold, live leases, no longer exists in 461. (2) The followers' last status stayed `error`, because a member whose start failed has no runtime to report `offline`. `TeamPairedAgentAccess` now reports each member `offline` at an idle shutdown, as a read of the ended team does (`getLeafAgentStatusSnapshots`) |
| CR-461-059 (the unknown-Task shape on both entry forms) | **Resolved** | By run ID, `asRunIdRefusal` is base's `refusalCode` rule exactly (`root-task-execution-lifecycle.ts:522` at base): any coded error is `{ delegated: false, message }`, and an uncoded one is thrown. `TASK_DELEGATION_ERROR` stays on the `recipient_address` path. Both run-ID forms are tested |
| CR-461-066 (K-15, Q-1) | **Resolved by SR-077** | The model and the expectations changed; the product did not. S26 stops M first, and the refusal uses the mutation's `{ success, message }`. Q-1 is the expected state of a preserved item (DS-10). The regenerated `contract-states.json` matches |

### Candidate Gate (round 23)

| Candidate | Observation | Basis | Disposition | Reason |
| --- | --- | --- | --- | --- |
| C23-01 | A Stop of a local delegated run ends the delegator view's following of it for good. A restore by the next message is never followed again while the view stays open | T-4 ("That run only; its next message restores it"); design lines 410 and 441 (a view's child rows are live); rule 1 (base showed a hosted copy's status live across Stop and restore); SR-064's rule for a run's own stream ("follows its run by run ID … whoever restores it") | **Promote → CR-461-067** | See the finding |
| C23-02 | A peer-started team with a member in `error` now idles out (round 23 side effect) | DS-7 (one idle rule for every delegated run); an agent run in `error` already idles out | Reject (as a finding) | It is the decided single rule, and it matches base's hosted task Team. The peer-started team kept its error member forever only because of the check base had for that kind. Noted for API/E2E |
| C23-03 | `DelegatedTeamIdleShutdown`'s comments still name a "live lease" (`delegated-team-idle-shutdown.ts:11, 49`), which 461 removed. `arm()` is public with no outside caller. `CollaborationTree`'s class comment has a broken sentence (`collaboration-tree.ts:64-67`: "… it is derived from. every cross-run answer for one run …") | Principle 15 (a comment must not say what is not true) | **Promote (folded into CR-461-067)** | Small, but the first one now describes a mechanism that does not exist |
| C23-04 | `DelegationIndex.skipUnstored`: `isStored(run).catch(() => true)` with no warning (`delegation-index.ts:168`) | `DESIGN.md` rule 7 | Reject; a suggestion | The error keeps the run, which is the safe side: no row or history is lost, and a stat failure is not a normal flow. A warning naming the run would cost one line |
| C23-05 | Swallowed errors across the change: 51 sites, and only two are new against base. `delegated-run-starter.ts:127` cleans up a team whose layout changed and then throws. `peer-run-calls.ts:69` turns an unanswered node into `reachable: false`, which is the documented answer | `DESIGN.md` rule 7 | Reject | Each one is contained and stated |
| C23-06 | Dead exports across the repository: `AgentPresentationBatchEventDto`, plus fixtures in `test-support` used by tests | Principles 7, 8 | Reject | The first is held by the round-9 ruling (C13-08); fixtures are tests' code |
| C23-07 | File sizes: no changed source file is over 500 effective lines. The largest growth is `agent-stream-handler.ts`, from 469 at base to 488 (SR-064's follower) | Size rule | Pass | Under the limit |
| C23-08 | Migration order: 461's migration is registered last, guarded by `app-data-migration-registry-order.test.ts` | CR-461-048 | Pass | FU-027 (order by construction) stands |

### Structural Checks (round 23, full)

| Check | Result | Evidence / Notes |
| --- | --- | --- |
| Data-flow spine | Pass, one gap | Every spine holds per case, except a local child's live status in its delegator's open view across Stop → restore (CR-461-067) |
| Ownership boundary | Pass | `DelegationIndex` (forest) and `CollaborationTree` (per run) answer every cross-run question; `RunViewStream` owns a view's sequence; each run's own root owns its life and its idle shutdown (DS-7) |
| Derived state | **Fail** | The follower's "followed while the row is open" breaks at a Stop: the follower and its status cache outlive the observation they depend on (CR-461-067). Idle shutdown and the closed-Task fence are now consistent |
| Empty indirection | Pass | `PeerAgentRun` / `PeerTeamRun` wrap a node boundary; the paired-agent accesses serve two callers (the local followers and the peer owner); `pairedAgentStatusFrame` now has one definition |
| Visible dependencies | Pass | The followers, feeds and streams are built in the composition. The process slots are base's pattern |
| Silent fallbacks | Pass | C23-04 and C23-05 |
| Dead code | Pass | C23-06 |
| Behavior parity (rule 1) | Pass, one gap | The refusal shapes per entry form now match base; the quiet shutdown matches base's task Team |
| Approved acceptance mechanism (rule 3) | Pass | The characterization covers the agent, team and org views and the list reads (CR-461-036, resolved in round 14) |
| File size | Pass | C23-07 |

### Scorecard (round 23, full)

| Priority | Category | Score | Why / What Is Weak |
| --- | --- | --- | --- |
| 1 | Data-Flow Spine Inventory and Clarity | 9.3 | Spines hold per case; one Stop → restore gap in a view's child status |
| 2 | Ownership Clarity and Boundary Encapsulation | 9.4 | One owner per cross-run fact; each run's root owns its life |
| 3 | API / Interface / Query / Command Clarity | 9.3 | The entry forms' refusals now match base |
| 4 | Separation of Concerns and File Placement | 9.3 | — |
| 5 | Shared-Structure / Data-Model Tightness | 9.4 | One status frame helper |
| 6 | Naming Quality and Local Readability | 9.2 | Stale comments (C23-03) |
| 7 | API/E2E Readiness | 9.3 | DTL-005 passes; nothing covers a delegator's view across a child's Stop and restore |
| 8 | Runtime Correctness And Behavioral Fidelity | 9.1 | CR-461-061 and -059 are resolved; CR-461-067 is open |
| 9 | No Backward-Compatibility / No Legacy Retention | 9.4 | — |
| 10 | Cleanup Completeness | 9.3 | C23-03 |

Overall 9.3. Runtime Correctness is below 9.2, so this round is a **Fail**.

### Findings (round 23, open)

#### CR-461-067 (new): a delegator's open view stops following a local delegated run once it is stopped

- **Concrete problem.**
  1. The user has a delegator's view open, with a local delegated row R whose Task is open.
  2. R is stopped: from its own view, from its row (rule 2), or by its owner.
  3. The paired-agent access ends the observation:
     - team runs: `ending === "stopped"` → `close(); onEnded()` (`team-paired-agent-access.ts:89`);
     - agent runs: `onRunEnded` (`standalone-paired-agent-access.ts:69`).
  4. `LocalChildObservation` only sets `entry.observation = null` (`local-child-observation.ts:132`). It keeps the entry, so `refresh` never follows R again (`:107`).
  5. When R's next message restores it (T-4), R's status frames no longer reach the view.
  6. The row keeps its last status, `offline` (or `error` for a member whose start failed) while R works. A snapshot on that view reads the same stale cache (`run-view-rows.ts:27`).
  7. Only closing every viewer of the delegator clears it.
- **Protects:**
  - T-4;
  - the design's live child rows (lines 410, 441);
  - rule 1: base's hosted copy kept its status live across Stop and restore, because its host's publisher went on;
  - SR-064's rule, which the run's own stream already follows: "follows its run by run ID … whoever restores it".
- **Evidence:** code reading of the three sites above against the real accesses.
  - DCM-004 and DCM-005 stop and restore a local delegated run but do not check the delegator's view.
  - No unit test covers an `onEnded` followed by a restore.
- **Required action:**
  1. While R's row is open, the delegator's follower must follow R across a Stop and its restore, for both kinds.
     - One way: the follower keeps following R's lifecycle and attaches to the restored run, as the team access already does after an idle shutdown.
     - Another: the local follower is not ended by a Stop at all. DS-006's end-on-Stop is the peer owner's rule, and the peer row's Retry (AR-403) is base's own behavior.
     - Either way, the follower or the access owns it, not the view.
  2. At the Stop, the row's members should read as a read of the stopped run gives (`offline`), including a member whose start failed. Otherwise the same `error` as CR-461-061 stays shown after a Stop.
  3. Tests, each failing without the fix: a delegator's open view with an agent row and with a team row; the row is stopped and then restored by a message; the view gets the restored run's status.
  4. C23-03: correct the "live lease" comments, make `arm()` private if nothing outside calls it, and mend `CollaborationTree`'s class comment.
- **Classification:** `Local Fix`, implementation. The design already states the rule; the follower does not implement it.
- **My review gap:** earlier rounds checked the follower across an idle shutdown (a restore makes a new root, and the team access follows it) but not across a Stop. That is the stop/restart case of the spine walk, which this full review included.

### Follow-ups (round 23)

- None new. FU-011, FU-013, FU-018, FU-019, FU-021, FU-024, FU-026 and FU-027 stand.

### Classification And Routing (round 23)

- CR-461-067: `Local Fix` → `/software_engineering_team/implementation_engineer`.
- The next review is a targeted delta on the follower and its accesses. This full review covers the rest of the change.

### For API/E2E (when this passes)

- A delegator's open view (agent, team and org delegators) across a local child's Stop and restore, for an agent child and a team child.
- The peer-started team with a member in `error` now idles out (C23-02). RC suites that assumed it stays up need updating.
- DTL-005 in every root; F-47 on both run-ID forms; S26/S27 and TAU-2 per SR-077.

---

## API/E2E Failure-Origin Review Of API-REV-007 (CRR-030)

### Review Meta

- Review Entry Point: `API/E2E Failure-Origin Review`. Current Code Review Revision ID: `CRR-030`.
- Trigger: API/E2E round 7 (API-REV-007), `Fail`, confidence 84% (up from 78%), on the merged state `a529abcbdd`; evidence `b0586778e6`.
- Proven this round:
  - the merge: autobyteus-460's skill reload on a delegated run;
  - F-37, F-38 (recipient path), F-41, F-42 with TDR-001, F-44, F-45, K-14 and F-46 resolved;
  - F-39 and F-40 as decided;
  - phone MSP-53 … 55; the peer suite 44/44; API-L01 2/2 (real DeepSeek);
  - stories §5.2 12/12, §5.3 9/9, §5.1 27/28;
  - eight stale suites rewritten and passing.
- Scope: F-43, F-47, K-15 and Q-1.
- Classification: task_size `Large`, architectural_risk `High`, unchanged.

### Classification

| Failure | Origin | Classification | Owner |
| --- | --- | --- | --- |
| **F-43 → CR-461-061, reopened** | The fix (`a7c04bf9ab`: a member's settled, non-retry-safe readiness rejection no longer counts as work in flight) did not resolve the Org path. The Org's delegated team whose writer failed to start is still never shut down after the idle grace (DTL-005), in R7-A and R7-B and twice in round 6. Its unit test passed but the real path did not, so another hold remains on the Org path, or the rejection the test modelled is not the one the writer produces. Not pinned | `Local Fix` | Implementation (server): start from DTL-005 failing on the Org path |
| **F-47 → CR-461-059, reopened** | The fix over-reached. `asRefusal` converts the unknown-Task refusal to `{error:{code:"TASK_DELEGATION_ERROR"}}` on **both** entry forms. Base gave that shape only on the `recipient_address` path. On the run-ID path (`target_team_run_id` / `target_agent_run_id` with an unknown `task_id`) base answered `{delegated:false, message:"Task '…' must identify exactly one current node-local Task (found 0)."}`, which base's own EXC-E2E-001 … 003 expect. My review gap: I accepted CR-461-059 without checking each entry form, which is Principle 1's own example ("a tool's parameter modes") | `Local Fix` | Implementation (server) |
| K-15 → **CR-461-066** | Contract model: S26 deletes a running M, while the product, as at base, requires M to be stopped first ("Run is active. Terminate it before deleting history"). The model also names a code (`RUN_DELEGATED_WORK_ACTIVE`) that the delete mutation's result (`success`, `message`, as at base) does not carry. The refusal itself is as decided | `Requirement Gap` (the model) | Solution Designer |
| Q-1 → **CR-461-066** | While an earlier migration has failed, 461's migration (registered last since CR-461-048) has not run, so a copy is not yet converted. Its own Settings save then answers `NOT_FOUND`; base edited it through its host. The question is whether an unconverted copy must be editable in that state, or whether the failed migration's state (`DESIGN.md` rule 7, the data guideline) is the expected outcome | `Requirement Gap` | Solution Designer |

### Required Actions

1. **CR-461-061 (reopened).** Reproduce DTL-005 on the Org path. Find what keeps the Org's delegated team from counting as quiet after its writer's failed start, fix it, and add a test that reproduces the real failed start, not a modelled rejection.
2. **CR-461-059 (reopened).**
   - Give the unknown-Task error shape on the `recipient_address` path only.
   - On the run-ID path, return base's `{delegated:false, message:"Task '…' must identify exactly one current node-local Task (found 0)."}`.
   - Test both entry forms, with base's EXC-E2E-001 … 003 and TKD.
3. **CR-461-066, Solution Designer.** Correct S26 in the model (K-15). Decide Q-1.

### Classification And Routing

- CR-461-059 and -061 (reopened): `Local Fix`.
- CR-461-066: `Requirement Gap`.
- Mixed result: the Requirement Gap governs, so I route to `/software_engineering_team/solution_designer`, which carries the two Local Fixes. They do not depend on its decisions.
- **The next implementation review will be a full review of the whole change**, as agreed with the user. The last full pass was round 13; rounds 14–22 were deltas over shared interfaces and spines.

### Affected Score Rationale

- Runtime Correctness: 9.3 → 9.0 (two fixes that did not hold, including one entry form missed).
- The rest is unchanged.

---

## Round 22: Implementation Review Of IR-022 (CRR-029)

- Review Entry Point: `Implementation Review`. Current Code Review Revision ID: `CRR-029`; Current Review Round: `22`.
- Review Scope: `Targeted Delta Review` of `d2396dd545..a529abcbdd`:
  - the fix `7c8f2db955`;
  - the merge of `origin/personal` at `3d738de6e6` (`152ae2cbb8`: 28 commits, autobyteus-460, -23 and -24);
  - the phone case renumbering `3e9b61af1c`;
  - the baseline fix `5c7d2a9240`.
  Round 21's evidence carries forward.
- Classification: task_size `Large`, architectural_risk `High`, unchanged.
- Checks: nothing rerun.
  - IMP-76, on the merged state: server type gate 1012; unit 8045; integration 492, with 3 file-watcher failures (FU-021, flaky alone too); web 5757; web type gate 90 after the baseline fix.

**CR-461-065 (the deleted-Task refusal for team runs): Resolved.**
- `RunOwnAgentsReader.delegationOfAgent(agentRunId)` gives the delegation of the run an agent is in, from the runs' own files: the agent run's own, else that of the stored team run it is a member of, at any depth.
- `CrossRunMessageDelivery.deletedTaskRefusal` uses it. The delegator's message to the team run's coordinator, or to another member, gets base's `TASK_NOT_FOUND`; anyone else's message falls through as before.
- Reader and delivery tests fail without the fix.
- **A suggestion, not a finding:** on this path (an ID the delegation index does not know and that names no delegated agent run), `teamRunOfMember` reads every stored team run's file in turn, and warns about each unreadable one each time. It is a refusal path, so it is not on a normal flow, and the cost is bounded by the number of stored team runs. Under `DESIGN.md`'s best practice 7, measure before acting. If it ever matters, record each run's delegation in memory when its Task is deleted (`DelegationIndex`'s forget step) instead of scanning.

**The merge: clean.**
- No conflicts and no dependency changes.
- Both composition roots gained only the base's `integrationRunAccess` argument: `credentialProxyHost.runAccess` in the Studio server, `null` in the application host.
- No source file changed on both sides apart from those two lines.
- autobyteus-460's live skill reload applies to delegated runs as to any run, since they are ordinary runs; that is consistent with the model.
- The baseline fix (`workspaceSkills: null` in a Codex projection test) repairs a test that `origin/personal` itself fails after autobyteus-460, in a file neither side changed. It is outside this ticket's logic, and fixing it here keeps the gate meaningful.
- The phone cases are now **MSP-53 (agent), MSP-54 (team) and MSP-55 (org)**.

**Scorecard.** As round 21, except Runtime Correctness: 9.1 → 9.3. Overall 9.3; every category is at 9.2 or above.

**Findings.** None open.

**For API/E2E (cumulative), on the merged state:**
1. **Rechecks:**
   - round 6's findings on this code: CR-461-057 / SDV-01, CR-461-058 and -065 for agent and team runs, -059, -060 including SR-076's recorded refusal, -061, and -062 on the phone;
   - the decided items (SR-075, SR-076).
2. **The phone:** `--cases=MSP-53,MSP-54,MSP-55`.
3. **Your Next Round list:**
   - the remaining stale suites;
   - API-P03 and API-P04;
   - DS-15's restart resume, and C15-03 rendered;
   - API-B03, API-E01 in full and API-F01.
4. **autobyteus-460's skill reload on a delegated run**, a quick regression check of the merge.

**Routing.** `Pass`. Recipient: `/software_engineering_team/api_e2e_engineer`. The Implementation Engineer is informed.

---

## Round 21: Implementation Review Of IR-021 (CRR-028)

### Review Meta

- Review Entry Point: `Implementation Review`. Current Code Review Revision ID: `CRR-028`; Current Review Round: `21`.
- Review Scope: `Targeted Delta Review` of `958cb22462..d2396dd545`, read commit by commit, with the round's additions swept for fallbacks, optional collaborators and new exports. Round 13's full re-audit and later rounds' evidence carry forward.
- Trigger: IR-021 from the Implementation Engineer: CRR-027's CR-461-057 … -063, plus SR-075 (CR-461-064), SR-076 and SR-076's follow-up (option 1).
- Classification: task_size `Large`, architectural_risk `High`, unchanged.
- Checks: nothing rerun.
  - IMP-74: CR-461-057's bisect; SDV-01 passes 3 of 3 (it failed 4 of 4 before); web 5752 passed.
  - IMP-75: type gate 1012; unit 8020; integration 481, with 2 file-watcher timing failures that also occur at base.

### Prior Findings Rechecked

| Finding | Status | Evidence |
| --- | --- | --- |
| CR-461-057 (a lost message) | **Resolved**; the cause is found | While a selected delegated row's own run was opening, the agent-run view's active target fell back to the delegator, so the typed text went into the Manager's draft. The view now has no target meanwhile (`agentRunCollaborationStore.isSelectedChildOpening`), as Team and Org already did. This was a product regression confirmed by the bisect (`573e6a7d07`, IMP-74) |
| CR-461-062 (phone team row) | **Resolved** | `useMobileRunOpening` commits every view's delegated row (agent view, Team, Org) only once its own run is open (`whenOpen`), and fails if the open fails: one path for all three kinds |
| CR-461-058 (deleted-Task message) | **Resolved for agent runs only**; the team-run case is CR-461-065 | `CrossRunMessageDelivery.deletedTaskRefusal` reads the target as an **agent** run's file (`{ rootSubjectKind: "agent", rootRunId: targetAgentRunId }`) and answers base's `TASK_NOT_FOUND` when its own delegator sends. The implementer notes that a deleted Task's team run is not covered |
| CR-461-059 (unknown Task key) | **Resolved** | `{ error: { code: "TASK_DELEGATION_ERROR", message } }`; `asRefusal` converts only delegation refusals and the Task side's rejection codes |
| CR-461-060 (closure during the commit) | **Resolved** | TDR-002: `RootMessageAppend.prepare` checks the Task scope before admission and the duplicate check, so the closure answers `TASK_AGENT_RESOURCE_CLOSED`. TDR-001: base's behavior is kept (SR-076). With the follow-up, a refusal answered after the receiver's durable write is marked (`RecordedRunRefusal`), and `CrossRunMessageDelivery` commits it to the sender's log too (TC-13, with no second publish), so live and reload agree. The agent receives the plain refusal |
| CR-461-061 (Org idle shutdown) | **Resolved** | A member's settled, non-retry-safe readiness rejection no longer counts as work in flight (`tryPrepareTerminationIfQuiescent`). `configured-agent-execution-handle.ts` is at 493 effective lines |
| CR-461-063 (F-45), CR-461-064 (F-39, F-40, F-41, K-14) | **Resolved by decision** (SR-075, the S27 model correction) | No product change where the Solution Designer confirmed the behavior |

### Candidate Gate (round 21)

| Candidate | Observation | Basis | Disposition | Reason |
| --- | --- | --- | --- | --- |
| C21-01 | The deleted-Task refusal covers a delegated **agent** run only. For a member of a delegated **team** run whose Task was deleted, the receiver's run is no longer in the tree, and `deletedTaskRefusal` looks for an agent run's file under the member's ID and finds none, so the assigner gets the generic refusal instead of base's `TASK_NOT_FOUND` | Principle 1 (trace each kind; a gate on one of two parallel paths is a finding); SR-071 (base's texts, REQ-009) | **Promote → CR-461-065** | The same supported scenario for the other delegated kind. The implementer recorded the gap. This is the pattern of CR-461-053 and -062, a fix for one kind only |
| C21-02 | New exports `RecordedRunRefusal`, `isRecordedRunRefusal`, `DELETED_TASK_REFUSAL` | Principle 7 | Reject | Used (the last in its own file and tests) |
| C21-03 | Fallbacks or optional collaborators added | Principles 13 and 16 | Reject | None |

### Scorecard (round 21)

| Priority | Category | Score |
| --- | --- | --- |
| 1 | Data-Flow Spine Inventory and Clarity | 9.4 |
| 2 | Ownership Clarity and Boundary Encapsulation | 9.4 |
| 3 | API / Interface / Query / Command Clarity | 9.3 |
| 4 | Separation of Concerns and File Placement | 9.3 |
| 5 | Shared-Structure / Data-Model Tightness | 9.4 |
| 6 | Naming Quality and Local Readability | 9.2 |
| 7 | API/E2E Readiness | 9.3 |
| 8 | Runtime Correctness And Behavioral Fidelity | 9.1 |
| 9 | No Backward-Compatibility / No Legacy Retention | 9.4 |
| 10 | Cleanup Completeness | 9.4 |

Overall 9.3. Below 9.2: Runtime Correctness (CR-461-065).

### Findings (round 21, open)

#### CR-461-065 (new): the deleted-Task refusal for a delegated team run

- **Concrete problem:** C21-01.
- **Required action:**
  - When the assigner messages a member of a delegated team run whose Task was deleted, answer base's `TASK_NOT_FOUND` with base's text.
  - Find the member's team run from the team's own file. Through the same owner, `RunOwnAgentsReader`, read the team run's `delegatedFrom`, and match its delegator to the sender.
  - Add a test: the coordinator, and a non-coordinator member, of a deleted Task's team run.
- **Classification:** `Local Fix`, implementation.

### Routing

- CR-461-065: `Local Fix`, implementation. Recipient: `/software_engineering_team/implementation_engineer`.
- **Residual, not a finding:** the branch is 28 commits behind `origin/personal` (`3d738de6e6`, mainly autobyteus-460). Both composition roots (`build-studio-server.ts`, `start-standalone-application-host.ts`) and the phone probe changed on both sides. Merging before API/E2E round 7 would test the merged state, as round 10 did.

---

## API/E2E Failure-Origin Review Of API-REV-006 (CRR-027)

### Review Meta

- Review Entry Point: `API/E2E Failure-Origin Review`. Current Code Review Revision ID: `CRR-027`.
- Trigger: API/E2E round 6 (API-REV-006), `Fail`, confidence 78% (up from 75%). Code under test: `958cb22462`; evidence `d70ea6565a`.
- Proven this round:
  - the round-5 rechecks: F-19b, F-25 (no data loss), F-28, F-29, F-33, F-34, F-35;
  - the decided items behave as decided (F-23, F-24, F-27, F-30, F-31, F-32, F-36, K-13);
  - SR-074's Team tab (TT-1, TT-2);
  - **AC-001 on a real runtime** (DeepSeek): delegated work finishes after the delegator's Stop, uninterrupted;
  - the peer suite 44/44; stories §5.2 12/12, §5.3 9/9, §5.1 26/28;
  - phone MSP-50 and -52; desktop SDV-02 … -04.
- Scope: F-37 … F-46, K-14 and the TDR-001 observation.
- Classification: task_size `Large`, architectural_risk `High`, unchanged.
- How each cause was established: `Read`, with API/E2E's reproductions. I ran nothing.

### Classification

| Failure | Origin | Classification | Owner |
| --- | --- | --- | --- |
| **F-46 → CR-461-057 (a lost message, priority)** | A regression: SDV-01 passed in round 5 on `56e4ce773b` and fails 4 of 4 on `958cb22462`. After the delegator's Stop with its agent-run view open, the user's message to the worker sends no frame, and the composer clears: a silent loss, the F-8 class. The only web changes in that window are `dbc26d1466` (CR-461-053: `topLevelRunSources`, `runListStore`, `delegatedRunsStore.whenOpen`) and the CR-461-051 ack code. The probe also changed in the same window (`stopped-delegator-views-probe.mjs`, +38 lines), so the origin is a product regression from `dbc26d1466` **or** a probe change. A bisect with the probe held fixed settles it. My review gap if it is the product: I reviewed `dbc26d1466` in round 19 without tracing the agent-run view's composer target | `Local Fix` | Implementation (web), with API/E2E confirming the probe |
| F-37 → **CR-461-058** | After a Task is deleted, the assigner's message to its run gets the generic `TARGET_AGENT_RUN_NOT_ACTIVE`. Base answered `TASK_NOT_FOUND` "The Task was deleted, so its task agent cannot continue." Under SR-071's rule (base's texts, REQ-009) this is an implementation miss; R-9 names no text | `Local Fix` | Implementation (server) |
| F-38 → **CR-461-059** | `delegate_task` with an unknown Task key returns `{delegated:false, message}`, where base returned `{error:{code:"TASK_DELEGATION_ERROR", message}}` with the same text. REQ-009 keeps the same results | `Local Fix` | Implementation (server) |
| F-42 (+ TDR-001) → **CR-461-060** | When B's Task closes while a message waits for B's log, the commit's conflict path answers `TEAM_MESSAGE_COMMIT_CONFLICT`. The closure should be answered as the closure, `TASK_AGENT_RESOURCE_CLOSED` (469 DEC-005), for agent, team and org: the gate-head re-check's refusal must win over the generic conflict. **TDR-001** in the same race: a message refused because of a closure during the write is still written to the receiver's log. A refused message must not be committed, or it would appear later through the composed read | `Local Fix` | Implementation (server) |
| F-43 → **CR-461-061** | On the Org path, a delegated team whose member failed to start (`error`) is never shut down after the idle grace (REQ-002 / AC-013). Repeatable, also run alone. Not pinned: the idle tracking likely does not count `error` as quiet on the Org's delegated team | `Local Fix` | Implementation (server) |
| F-44 → **CR-461-062** | On the phone, tapping a stopped team's delegated worker row opens no run screen. This is F-34's team counterpart: CR-461-053 fixed the Org only. My review gap: I accepted the Org fix without asking for the same kind across views (Principle 1: each kind) | `Local Fix` | Implementation (web, phone) |
| F-45 → **CR-461-063** | A delegated run's own Stop leaves its history row's `terminatedAt` null; a run the user started records it, and REQ-002 says "like any run" | `Local Fix` | Implementation (server) |
| F-39, F-40, F-41, K-14 → **CR-461-064** | **Behavior questions:** | `Requirement Gap` | Solution Designer |

The questions in CR-461-064:
- **F-39:** a team-level choice on a stopped delegated team. Does it reach the members that follow the team (base's `followsTeam`), or only the default, as for a user-started team?
- **F-40:** `list_available_agents` for a delegated run leaves out its own catalog name. Base listed it, and REQ-009 says what an agent reads does not change.
- **F-41:** a delegated member's error card shows in the agent and Team delegators' views but not in the Org's. Under rule 2, should any delegator's view carry it?
- **K-14:** S27: does deleting M remove its ad-hoc Task T7, as task-keys AC-021 removes a deleted chat's Temp tasks?

### Required Actions

1. **CR-461-057, first.** Bisect SDV-01 between `56e4ce773b` and `958cb22462` with the round-5 probe held fixed. If `dbc26d1466` broke it, make sure the agent-run view's composer target for a delegated row survives CR-461-053's list filtering and `whenOpen`. Add a web spec for the C3-06 reconnect followed by a send to the worker. The composer must never clear without sending or showing a failure.
2. **CR-461-058.** Base's deleted-Task refusal (`TASK_NOT_FOUND`, base's text) for a message to a deleted Task's run, with a test.
3. **CR-461-059.** Base's result shape for an unknown Task key, with a test.
4. **CR-461-060.** A closure during the commit wait is answered as `TASK_AGENT_RESOURCE_CLOSED` in all three root kinds, and a refused message is never written to the receiver's log. Add tests for both, including the TDR-001 case.
5. **CR-461-061.** An Org's delegated team with an `error` member is shut down after the idle grace, as the agent and Team paths are, with a test.
6. **CR-461-062.** The phone opens a stopped team's delegated worker row as its run screen, through the same path as the Org's (one owner), with a spec.
7. **CR-461-063.** A delegated run's own Stop records `terminatedAt`, as any run's does.
8. **CR-461-064, Solution Designer.** Decide F-39, F-40 and F-41, and place K-14 in the model. Under the conflict rule so far, base's behavior holds unless a requirement explicitly changes it.

### Classification And Routing

- CR-461-057 … -063: `Local Fix`. CR-461-057 is a lost message and a regression, and goes first.
- CR-461-064: `Requirement Gap`.
- Mixed result: the Requirement Gap governs, so I route to `/software_engineering_team/solution_designer`, which carries the Local Fixes. They do not depend on the decisions, so the designer can release them at once.

### Affected Score Rationale

- Runtime Correctness: 9.3 → 8.8. A lost message (a regression), refusal codes and shapes, idle shutdown, phone parity.
- The other categories are unchanged; no structural finding.

---

## Round 20: Implementation Review Of IR-020 (CRR-026)

- Review Entry Point: `Implementation Review`. Current Code Review Revision ID: `CRR-026`; Current Review Round: `20`.
- Review Scope: `Targeted Delta Review` of `958cb22462`, within CR-461-056 and CRR-025's suggestion. IR-019 was reviewed in full in CRR-025, and its evidence carries forward.
- Basis: SR-074 (ARCH-REV-048 Pass, its note applied). The user confirmed F-31 (2026-11-13): a new delegated run copies its immediate delegator's saved launch once, and the runs are independent after that.
- Classification: task_size `Large`, architectural_risk `High`, unchanged.
- Checks: nothing rerun. The web suite and the views probe were not rerun: the web is unchanged, and the server change only narrows what a view receives.
  - IMP-73: server type gate 1012; unit 8010; integration 481, with 2 file-watcher timing failures that also occur at base.

**CR-461-056 (the Team tab's live rule against its read rule): Resolved.**
- One rule for both, base's `isMessageOfView(message, own(X), tree(X))`, where `tree(X)` is X's agents plus those of its open subtree's local runs (`collaborationTreeOf(X).rows`).
- **Read:** `composeRunViewMessages` composes the logs of X and its open subtree only. `DelegatedRunAgentsReader.openRunsBelow` replaces `runsBelow`. The set is taken once at the read's start and bound to the snapshot's synchronous step (ARCH-REV-048).
- **Live:** `RunMessagesFeed.inViewOf` applies the same rule at run level at publish time: the message is in view if either run is X, or both runs are in X plus its open local rows. Peer rows are excluded in both, because a peer run's internal messages stay on its node.
- Tests show the pair agrees: a message to X's own delegator is shown neither live nor on reload; a two-hop message is shown in both; a closed run's messages with X's own agents stay, through X's own log.

**CRR-025's suggestion, adopted.** `ClosedTaskEntryFence` refuses where input enters, before the root is resolved or restored. It reads the run's own `delegatedFrom` through `RunOwnAgentsReader.delegationOf`, and only while some Task record is unreadable, so nothing extra is read normally. It is used by the standalone manager (`inputRefusal` is now async and the coordinator awaits it), the Team stream handler and the restart resumer. A loaded root's gate head keeps its synchronous check from its own `delegatedFrom`. Tests: no file read when nothing is damaged; a delegated run refused and a user's run not; refused before the root loads with nothing registered or run; a loaded root refused at its gate head.

**Candidates.**
- No new fallback or optional collaborator: `inputRefusal` keeps FU-018's older optional port.
- No file is over 500 lines.
- The manager's `RunOwnAgentsReader` instance reads a different fact (a run's own delegation, a file read used only in the damaged-records case) from the tree's per-run agents (CR-461-024), so it is not a second owner of that fact.

**Scorecard.** As round 19, except Shared-Structure: 9.1 → 9.4. Overall 9.3; every category is at 9.2 or above.

**Findings.** None open.

**For API/E2E (cumulative):**
- **Recheck round 5's findings on this code.**
  - CR-461-048, the data loss: the improver's copy is kept. The startup test's "byte-identical" expectation on the converted `run_metadata.json` is now stale.
  - F-19b, F-28, F-29, F-35.
  - The phone's F-32 … F-34 (MSP-50 … MSP-52).
- **The Team tab:**
  - a two-hop message, live and after a reload;
  - a message to X's own delegator, shown in neither.
- **The decision-only expectation changes** (SR-072, SR-073, SR-074): SID-2, F-23 step 11, MSP-51, F-31 (user-confirmed), F-36, K-13 and the closure race.
- **The unreadable-Task-record fence:** refused before the root loads.
- **Your Next Round list:**
  - the remaining stale rewrites;
  - API-P03 and API-P04;
  - DS-15's restart resume, and C15-03 rendered;
  - API-E01 in full, API-I01, API-B03, API-L01 and API-F01.

**Routing.** `Pass`. Recipient: `/software_engineering_team/api_e2e_engineer`. The Implementation Engineer is informed.

---

## Round 19: Implementation Review Of IR-019 (CRR-025)

### Review Meta

- Review Entry Point: `Implementation Review`. Current Code Review Revision ID: `CRR-025`; Current Review Round: `19`.
- Review Scope: `Targeted Delta Review` of `56e4ce773b..a5b80f3d7a`, read commit by commit, including the new owners `RunMessagesFeed`, `run-view-messages.ts` and `RunOwnDelegations`, and the port's `publishMessage`. I also swept the round's additions and the whole change again: fallbacks, file sizes, dead exports.
- Trigger: IR-019 from the Implementation Engineer: CRR-024's CR-461-048 … -053, plus SR-072 (F-23, F-24, F-26, F-30; ARCH-REV-047) and SR-073 (F-32).
- Classification: task_size `Large`, architectural_risk `High`, unchanged.
- Checks: nothing rerun.
  - IMP-68: migrations, 625 tests.
  - IMP-69: server type gate 1012; unit 8006.
  - IMP-70: web type gate 90; 5749 specs.
  - IMP-71: integration 479; watcher timing fails the same way at base.
  - IMP-72: SDV-02, -03 and -04 pass; SDV-01's known flake passes alone.

### Prior Findings Rechecked

| Finding | Status | Evidence |
| --- | --- | --- |
| CR-461-048 (data loss, migration order) | **Resolved** | 461's migration is registered after every migration released in v1.5.13-beta.6. `app-data-migration-registry-order.test.ts` requires released migrations first, in released order, and later ones in date order, and it fails on the old registry. API/E2E's startup test keeps the folder. Its "byte-identical" assertion on the copy's `run_metadata.json` is now a stale expectation, because 461's migration rewrites that file by design. It goes to API/E2E |
| CR-461-049 (refusal text) | **Resolved** | base's "not one of your task agents" for a sender from another top run, before the assigner check |
| CR-461-050 (self-target by team name) | **Resolved** | CM-1 refuses the sender run's own `recipientAddress`, or an address inside it, before placement |
| CR-461-051 (fail closed on unreadable Task records) | **Resolved** | `ClosedTaskFence.refusal(run, delegated)`: `TASK_AGENT_RESOURCES_UNAVAILABLE` while any Task record is unreadable, at the standalone and Team gate heads and in the member input check, before the agent is made ready. The ack code is added on server and web. **A suggestion, not a finding:** the check now runs after the root loads, because "only the root knows the run was delegated". The run's own file says so too (`RunOwnAgentsReader.delegationOf`, added this round), so the check could move before the root loads, as ARCH-REV-044 asked for DS-15 |
| CR-461-052 (`TASK_DISPATCH_FAILED`) | **Resolved** | both new-run paths |
| CR-461-053 (phone) | **Resolved** | `topLevelRunSources` is one owner for the desktop navigation and the phone list (F-33), which closes my round-17 gap. The phone's Org delegated row commits when its run is open and fails visibly if the open fails (F-34). F-32 is settled by SR-073 |
| CR-461-054 (the Team tab's messages) | **Implemented (SR-072); one inconsistency left: CR-461-056** | The read composes X's log with every run below it with base's `composeMessageLogs` and in-view rule (`run-view-messages.ts`), behind the snapshot queue and deduplicated by message ID (ARCH-REV-046/047). Live messages come through `RunMessagesFeed` (`run-messages-feed.ts`) |
| CR-461-055 (behavior questions) | **Resolved by SR-072 / SR-073**, implemented where code changed | F-30: idle counts as working. F-24: a run whose Tasks were all deleted takes a new Task from its own file's delegator (U11). F-23, F-27, F-31, F-36 and K-13: decisions or expectation changes only, listed for API/E2E |

### Candidate Gate (round 19)

| Candidate | Observation | Basis | Disposition | Reason |
| --- | --- | --- | --- | --- |
| C19-01 | The Team tab's messages follow two rules. **Read:** base's `isMessageOfView`: both participants are agents of X's tree, or one is X's own agent (`run-view-messages.ts:19-24`). **Live:** `RunMessagesFeed.publish` numbers a message in every open view whose run set (X plus `subtreeOf(X)`) holds either run, through `chainOf` (`run-messages-feed.ts:14, 25-27`), as design line 341 specifies. So a message between a run below X and an agent outside X's tree (for example X's own delegator) appears live in X's Team tab and disappears after a reload. The implementer raised this | Principle 11 and Case 10 (one picture, one builder; a picture shown live and on reload is one derived fact); rule 1 (base's shapes) | **Promote → CR-461-056** | One picture with two inclusion rules. The design text itself gives the live rule, so the change is the design's |
| C19-02 | Fallbacks, optional collaborators, file size | Principles 13 and 16; the 500-line limit | Reject | No new fallback or optional collaborator. No changed source file is over 500 effective lines |
| C19-03 | Dead exports | Principle 7 | Reject | Only the two already ruled on (`AgentPresentationBatchEventDto`, `deserializeChangeEvent`) |

### Scorecard (round 19)

| Priority | Category | Score |
| --- | --- | --- |
| 1 | Data-Flow Spine Inventory and Clarity | 9.3 |
| 2 | Ownership Clarity and Boundary Encapsulation | 9.4 |
| 3 | API / Interface / Query / Command Clarity | 9.3 |
| 4 | Separation of Concerns and File Placement | 9.3 |
| 5 | Shared-Structure / Data-Model Tightness | 9.1 |
| 6 | Naming Quality and Local Readability | 9.2 |
| 7 | API/E2E Readiness | 9.3 |
| 8 | Runtime Correctness And Behavioral Fidelity | 9.2 |
| 9 | No Backward-Compatibility / No Legacy Retention | 9.4 |
| 10 | Cleanup Completeness | 9.4 |

Overall 9.3. Below 9.2: Shared-Structure (CR-461-056).

### Findings (round 19, open)

#### CR-461-056 (new): the Team tab's live rule differs from its read rule

- **Concrete problem:** a message involving a run below X and an agent outside X's tree shows live in X's Team tab and is gone after a reload. The same picture has two inclusion rules (C19-01).
- **Required action, for the Solution Designer:** make the live rule the read rule. The feed numbers a message in X's view only when base's in-view rule holds for X's tree: both participants are tree agents, or one is X's own agent. Correct design line 341, then the implementation follows with a test of the live/read pair. If instead base showed such messages on reload too, change the read and keep one rule either way.
- **Classification:** `Design Impact`, Solution Designer.

### Routing

- CR-461-056: `Design Impact`, Solution Designer.
- Recipient: `/software_engineering_team/solution_designer`.
- For API/E2E later:
  - the startup test's stale "byte-identical" expectation on a converted `run_metadata.json`;
  - the expectation changes in the handoff (SID-2, F-23 step 11, MSP-51, F-31, F-36, K-13, the closure race).

---

## API/E2E Failure-Origin Review Of API-REV-005 (CRR-024)

### Review Meta

- Review Entry Point: `API/E2E Failure-Origin Review`. Current Code Review Revision ID: `CRR-024`.
- Trigger: API/E2E round 5 (API-REV-005), `Fail`, confidence 75%. Code under test: `56e4ce773b`; evidence `bffa83e863`.
- Proven or resolved this round:
  - desktop SDV-01 … -04, so F-14 (team view), F-22 (desktop) and CR-461-042's reopened row are resolved;
  - the peer suite's RC-43 (AC-016) and RC-44 (AC-008 / G-1);
  - stories §5.2 (11/11) and §5.3 (9/9), so F-21 is resolved;
  - C17-02 (CPW-M7) matches base;
  - SR-071 end to end;
  - F-16, F-17, F-18 and F-20 are resolved.
- Scope: F-19b, F-23 … F-36 and K-13.
- Classification: task_size `Large`, architectural_risk `High`, unchanged.
- How each cause was established: `Read`, with API/E2E's reproductions. I ran nothing.

### Classification

| Failure | Origin | Evidence | Classification | Owner |
| --- | --- | --- | --- | --- |
| **F-25 → CR-461-048 (data loss, urgent)** | Implementation defect, and my review gap. The migration registry runs 461's `DelegatedRunsOwnRunsV1AppDataMigration` (`app-data-migration-registry.ts:153`) **before** the released, earlier-dated `RemoveSkillImprovementDataMigration` (`:155`). On data that has not yet run 20261020, the 461 migration first converts the improver's delegated copy into an own run, and 20261020 then takes the converted folder for a helper run and deletes it. The data guideline requires a new migration to run after the released ones. I reviewed the migration but not its place in the registry | `API-E01-r5-F25-migration-order.txt` (logs at `…768Z`, then `…788Z`) | `Local Fix` | Implementation (server) |
| F-19b → **CR-461-049** | Implementation defect: the cross-root `delegate_task` refusal uses the reactivation text ("Only the agent that gave …") where SR-071 keeps base's "… is not one of your task agents …" | `API-E01-r5-EXC-005-R12-stopped.txt` | `Local Fix` | Implementation (server) |
| F-28 → **CR-461-050** | Implementation defect: `delegate_task` by a delegated team's member to its own team's name (its `recipientAddress`) is not recognized as the run itself, so it falls through to "not the address of an available agent". Base answered CM-1's `COLLABORATION_SELF_TARGET_REJECTED` | `API-E01-r5-F28-self-target.txt` | `Local Fix` | Implementation (server) |
| F-29 → **CR-461-051** | Implementation defect: a copy whose Task record cannot be read still reaches the model. 469 DEC-010 / MP-003 (kept by REQ-005) fails closed at start; the branch's start path does not refuse when the Task side cannot answer | `API-E01-r5-F27-F29-F31-batchB-C.txt` (SCP-E2E-006) | `Local Fix` | Implementation (server) |
| F-35 → **CR-461-052** | Implementation defect: a failed peer dispatch stores `startError.code: PEER_UNREACHABLE` in the Task record, where base stored `TASK_DISPATCH_FAILED`. REQ-005 keeps the Task's records | `API-P01-P02-r5-peer-suite.txt` (RC-25) | `Local Fix` | Implementation (server) |
| F-32, F-33, F-34 → **CR-461-053** | Implementation defects on the phone, and my review gap for F-33. **F-32:** the phone's run tree shows no worker row under a stopped team, though the team's tree has it and the desktop shows it. **F-33:** opening a delegated row on the phone adds it as a live top-level run: CR-461-044's filter was applied to the desktop list (`runHistoryNavigationStoreActions.ts`) and not to the phone's run tree (`useMobileRunTree` / `mobileRunTreeProjection`). In round 17 I accepted the fix without tracing the phone layout (Principle 1: each layout). **F-34:** tapping the stopped Org's `task-agent:` row opens no run screen and shows no error: rule 2's binding is missing on the phone's Org path. The probe had silently stopped running these cases since the web was returned to base, so they surfaced only now | `API-B01-r5-phone-MSP-50-52-evidence.txt` | `Local Fix` | Implementation (web, phone) |
| F-26 → **CR-461-054** | **Design gap.** At base a delegator's Team tab read the hosting root's one log, which held every copy's messages: two hops down, and refused ones too. Now each run's log holds only its own agents' messages (TC-13). The design names no source for messages between a delegator's descendants in its Team tab (the design spec has no Team-tab rule beyond `liveSequenceId`). Rule 1 promises base's shapes, so this is a derived aggregate across runs' logs that the design must decide, as it did the rows (SR-058) | `API-E01-r5-F26-two-hop-message-missing.txt` | `Design Impact` | Solution Designer |
| F-23, F-24, F-27, F-30, F-31, F-36 and K-13 → **CR-461-055** | **Behavior questions** in which base, the contract and the requirements point different ways: | below | `Requirement Gap` | Solution Designer |

The questions in CR-461-055:
- **F-23:** the assigner's message to a member of a DONE team copy. 469 DEC-006 refused it; REQ-003 wakes a stopped receiver.
- **F-24:** a new Task to a deleted Task's copy by run ID. Base accepted it; R-9 / TC-9 refuse it.
- **F-27:** a copy's runtime switch. Base refused it; REQ-002 says "configured … like any run".
- **F-30:** S26's "works". The model reads an open Task; DS-13 reads a live status.
- **F-31:** launch inheritance two hops down. Base used the top run's saved edit; the branch uses the immediate delegator's.
- **F-36:** a peer Team row's `coordinator_address`. Base gave `/studio_team/lead`; §3.1 gives the own-team `/lead`.
- **K-13:** S23 and S24 have a stopped run act, which no real path allows.

### Required Actions

1. **CR-461-048, first.**
   - Register `DelegatedRunsOwnRunsV1AppDataMigration` after every released migration, in date order, after `20261020_remove_skill_improvement_data`.
   - Add a registry test that the migrations run in ID or date order, and that no new migration precedes a released one.
   - The fixture test keeps the improver's copy.
   - Check whether any other migration after 461's in the registry has an earlier date.
2. **CR-461-049.** Use base's text for the cross-root `delegate_task` refusal (SR-071), with a test.
3. **CR-461-050.** CM-1 recognizes a delegated team member's own team name (its run's `recipientAddress`) as itself and refuses it with `COLLABORATION_SELF_TARGET_REJECTED`, with a test.
4. **CR-461-051.** A delegated run whose Task record cannot be read at start fails closed, with no model request, as 469 DEC-010 does. Test it with an unreadable record.
5. **CR-461-052.** A failed peer dispatch stores `TASK_DISPATCH_FAILED` in the Task record, with the same message (REQ-005).
6. **CR-461-053.** On the phone:
   - a stopped team's delegated row is shown;
   - a delegated row opened from a delegator stays out of the top-level list. Use the same rule as the desktop, through one shared owner, not a second copy;
   - an Org's delegated row opens its run's screen (rule 2).
   - Add a phone spec for each.
7. **CR-461-054, Solution Designer.** Decide where a delegator's Team tab gets the messages between its descendants, at every depth and including refused ones, under rule 1.
8. **CR-461-055, Solution Designer.** Decide each question in the list above, and place S23 and S24 (K-13).

### Classification And Routing

- CR-461-048 … -053: `Local Fix`, implementation. **CR-461-048 is data loss and should go first.**
- CR-461-054: `Design Impact`, Solution Designer.
- CR-461-055: `Requirement Gap`, Solution Designer.
- Mixed result: the Design Impact governs, so I route to `/software_engineering_team/solution_designer`, which carries the Local Fixes. They do not depend on the design questions, so the designer can release them at once.

### Affected Score Rationale

- Runtime Correctness: 9.3 → 8.6 (data loss in a migration; phone parity; texts and codes).
- Data-Flow Spine: 9.4 → 9.1 (the Team tab's messages across runs; the migration spine's order).

---

## Round 18: Implementation Review Of IR-018 (CRR-023)

- Review Entry Point: `Implementation Review`. Current Code Review Revision ID: `CRR-023`; Current Review Round: `18`.
- Review Scope: `Targeted Delta Review` of `56e4ce773b`: seven files, within CR-461-047. Round 17's evidence carries forward.
- Classification: task_size `Large`, architectural_risk `High`, unchanged.
- Checks: IMP-67 (server type gate 1012; delegation, communication, backend-factory and architecture tests: 78 files, 663 tests; web type gate 90; store specs: 119 files, 1165 tests). Nothing rerun.

**CR-461-047: Resolved.**
- **C17-01.** `DelegationIndex.teamCoordinatorOf(teamRunId)` is the one owner of a coordinator when the team does not run.
  - It answers from the team's standing, its own file, whether the team runs or not.
  - It falls back to the Task entry's entry agent only in the two stated cases: a peer team run, whose file is on its node, and an unreadable local file. `standingOf` warns on the latter. This matches SR-071's text.
  - A run no Task names gets `null` with no file read, so an arbitrary ID never triggers one.
  - The router asks the live directory, else `coordinators.teamCoordinatorOf`. The composition passes the index, and the inline rule is gone.
  - Unit tests cover a stopped delegated team, a top team run that delegated, a peer team run (no file read), an unreadable file, a run that is not a node, an agent run's ID and an unknown ID.
  - `delegation-index.ts` is at 499 effective lines, within the 500 limit. A further owner there should go into its own file.
- **C17-03.** `standaloneNavigationTarget` and its now-unused import are removed.

**Scorecard.** As round 17, except:
- Ownership: 9.2 → 9.4.
- Separation of Concerns: 9.2 → 9.3.
- Cleanup: 9.1 → 9.4.

Overall 9.3; every category is at 9.2 or above.

**Findings.** None open.

**For API/E2E (cumulative, CRR-018's list plus):**
- DS-15's restart resume, and C15-03's rendered two-view check;
- C17-02: from a run two hops down, delegate to a catalog address only the top run's catalog offers, and compare with base;
- CR-461-042's reopened row rendered in a browser;
- SR-071's refusals (R-6/R-8/R-7, R-12) end to end;
- the phone cases, the two-node peer cases and rule 3's peer capture, the remaining stale rewrites, and the deferred cases (API-E01, API-I01, API-B03, API-L01, API-F01).

**Routing.** `Pass`. Recipient: `/software_engineering_team/api_e2e_engineer`. The Implementation Engineer is informed.

---

## Round 17: Implementation Review Of IR-017 (CRR-022)

### Review Meta

- Review Entry Point: `Implementation Review`. Current Code Review Revision ID: `CRR-022`; Current Review Round: `17`.
- Review Scope: `Targeted Delta Review` of `9e0df63de6..b87be2de33`, read commit by commit (one per finding, SR-071, and two SDV fixes). This round's additions were swept for fallbacks and optional collaborators, and the whole change was swept again for dead exports. Round 13's full re-audit evidence carries forward.
- Trigger: IR-017 from the Implementation Engineer: CRR-021's CR-461-039 … -044, and SR-071 (CR-461-045, -046; ARCH-REV-045).
- Classification: task_size `Large`, architectural_risk `High`, unchanged.
- Checks: nothing rerun.
  - IMP-63: the SDV probe passes SDV-01 … -03.
  - IMP-64: server type gate 1012; unit 7978 passed.
  - IMP-65: integration 477 passed; file-watcher timing failures also occur at base under load.
  - IMP-66: web type gate 90; 5745 specs.

### Prior Findings Rechecked

| Finding | Status | Evidence |
| --- | --- | --- |
| CR-461-039 (snapshot statuses) | **Resolved** | `readViewSnapshot` gives every agent of every listed local row a status in the synchronous step: the base's, else `LocalChildFollowers.currentStatuses` (the child root's `pairedAgentStatuses`), else `offline`. A stopped Org's stored snapshot carries none, as its contract requires; so does its inspection (`eb5e9df040`, found by SDV-03) |
| CR-461-040 (two hops down, Team view) | **Resolved** | SDV-02 passes from `8cf765990d`. The rows and the live event for a row two hops down are pinned over the real tree (`child-rows-feed.test.ts`) and in the Team view state |
| CR-461-041 (catalog from a delegated team) | **Resolved**, with C17-02 held | `DelegatorCatalog.placementAt` (`delegator-catalog.ts`): on "not found", the delegator's catalog copy at that address with the delegator's launch base and notes, never the run's own definition (U7). `collaboratorPortOf` is extracted, so the composition and the resolver share it |
| CR-461-042 (reopened) | **Resolved** | `ChildRowsFeed.reportedClosed`, per run: a row back after this stream reported it closed is `task_executions_reopened`. Memory-only is enough: after a restart a closed run is not running, so it is not in the closed set, and its reactivation is a new row, as at base. DS-15 keeps it from being resumed |
| CR-461-043 (unrestorable follow-up) | **Resolved** | `createRunConversationAvailability` is checked after `assertAssignable`, before any change. The refusal is base's `TASK_EXECUTION_CONTEXT_UNAVAILABLE` text, with no path |
| CR-461-044 (listed twice) | **Resolved** | The cause was the web merging open contexts into the list. `delegatedRunsStore` records the runs it opens, and the list includes those contexts only when it lists the run itself (`runHistoryNavigationStoreActions.ts`, `runHistoryLoadActions.ts`). The record is never cleared, but harmlessly: a delegated run is never a top-level row while its delegator is stored (DS-11), and becomes listed, and so shown, if its delegator is deleted (TC-3) |
| CR-461-045 / -046 (refusal order and texts) | **Resolved** (SR-071) | The order is R-6, R-8, R-7 (`cross-run-message-delivery.ts` `admit`). A team run's ID gets `TARGET_IS_TEAM_RUN` with its coordinator, whether it runs or not (R-12). A member's ID in `delegate_task` gets base's text. One part is CR-461-047 |

### Candidate Gate (round 17)

| Candidate | Observation | Basis | Disposition | Reason |
| --- | --- | --- | --- | --- |
| C17-01 | R-12's coordinator for a team run that is not live is computed by an inline function in the composition root (`collaboration-composition.ts`, `teamCoordinatorOf`). It tries the Task entry's `entryAgentRunId`, else, if the run is a node, its standing's coordinator. The router tries the live directory first (`global-agent-run-message-router.ts:93`). So one fact, "the coordinator of team run T", comes from three sources in two places, and the composition's rule has no unit test (the router tests pass `teamCoordinatorOf` as a fake; only `task-existing-copy-assignment.e2e` reaches it) | Principle 3 (a clear owner for each concern, which holds in every context); Principle 11 (each fact derived by one owner); the CR-461-028 ruling (a coordinator derived once) | **Promote → CR-461-047** | A domain rule placed where its owners and tests don't see it. The `DelegationIndex` already owns a run's standing with its coordinator address, read once and valid whether the team runs or not |
| C17-02 | `DelegatorCatalog` looks one hop up (the run's delegator). A run two hops down, whose delegator is itself delegated, gets that delegator's catalog. Base hosted every copy in the top run and answered from its catalog | Rule 3 / REQ-009 | Hold for Evidence → API/E2E | The difference arises only when the top run's catalog offers an address the intermediate delegator's catalog does not. API/E2E: delegate from a run two hops down to such an address and compare with base |
| C17-03 | `standaloneNavigationTarget` (`runHistoryNavigationStoreActions.ts:69`) is unused again. It was removed in CR-461-026 and came back when rule 1 returned base's file; this round touches the file (CR-461-044) | Principle 7 (dead code in touched files, already dead included) | **Promote (folded into CR-461-047)** | Repository-wide search: no reference |
| C17-04 | `AgentPresentationBatchEventDto`; `deserializeChangeEvent` | — | Reject | Earlier rulings hold |

### Scorecard (round 17)

| Priority | Category | Score |
| --- | --- | --- |
| 1 | Data-Flow Spine Inventory and Clarity | 9.4 |
| 2 | Ownership Clarity and Boundary Encapsulation | 9.2 |
| 3 | API / Interface / Query / Command Clarity | 9.3 |
| 4 | Separation of Concerns and File Placement | 9.2 |
| 5 | Shared-Structure / Data-Model Tightness | 9.3 |
| 6 | Naming Quality and Local Readability | 9.2 |
| 7 | API/E2E Readiness | 9.3 |
| 8 | Runtime Correctness And Behavioral Fidelity | 9.3 |
| 9 | No Backward-Compatibility / No Legacy Retention | 9.4 |
| 10 | Cleanup Completeness | 9.1 |

Overall 9.3. Below 9.2: Cleanup (CR-461-047). Ownership and Separation of Concerns are at the bar because of C17-01.

### Findings (round 17, open)

#### CR-461-047 (new): R-12's coordinator rule has no owner; a dead export returned

- **Required action:**
  - **C17-01.** Give "the coordinator of team run T" one owner. For example, `DelegationIndex.teamCoordinatorOf(teamRunId)` from the run's standing (its coordinator address → agent run ID), which holds whether the team runs or not.
    - The router asks the live directory, else that owner; the composition passes the owner.
    - Drop the Task-entry branch unless the standing cannot answer, and say why if it stays.
    - Add a unit test: a stopped delegated team, and a team run that is not a node.
  - **C17-03.** Remove `standaloneNavigationTarget`.
- **Classification:** `Local Fix`, implementation.

### Routing

- `Local Fix`, implementation. No design impact.
- Recipient: `/software_engineering_team/implementation_engineer`.
- Next: a targeted re-review, then API/E2E (C17-02, CR-461-042 rendered in a browser, and their Next Round list).

---

## API/E2E Failure-Origin Review Of API-REV-004 (CRR-021)

### Review Meta

- Review Entry Point: `API/E2E Failure-Origin Review`. Current Code Review Revision ID: `CRR-021`.
- Trigger: API/E2E round 4 (API-REV-004), `Fail`, confidence 70%.
  - Code under test: `262afbd6bb`; evidence `9af93a17c5`.
  - Findings: F-14 (team view) and F-16 … F-22.
  - Confirmed resolved: F-11 … F-13 (CPW 13/13), F-15, and F-14 in the agent-run view.
  - Passed: API-E02 §5.1 and §5.2; API-E03; DS-15 (3/3, the server half of C15-03).
  - C14-01 measured: the list read p50 rises from 5 to 21 ms and from 7 to 41 ms for 72 children, linear at about 0.4–1 ms per child. That is acceptable at this size, so C14-01 is closed. I record the extrapolation (about 1 s at about 1,000 children under listed Orgs) as a residual risk.
- Scope: the eight failures only.
- Classification: task_size `Large`, architectural_risk `High`, unchanged.
- How each cause was established: `Read`, with API/E2E's reproductions. I ran nothing.

### Failure Classification

| Failure | Basis | Origin | Evidence | Classification | Owner |
| --- | --- | --- | --- | --- | --- |
| F-21 → **CR-461-039** | AC-007; SR-063 (the snapshot's statuses are read in one synchronous step); the contract's Org correlation rule (`root-execution-view-dtos.ts`: every listed agent of a live Org needs a status) | Implementation defect, and my review gap. A snapshot reads its rows' statuses from `LocalChildFollowers.cachedStatuses` (`run-view-rows.ts:26-27`). The cache is filled asynchronously (`local-child-observation.ts`: `refresh` awaits `tree.agentsOf` before it follows a row). It records a status only from a live `AGENT_STATUS` frame or `pairedAgentStatuses`, so a child that is not running has no entry, and a newly listed row has none until its follow completes. A live Org's snapshot then lists agents without status records, the contract parse fails (`AGENT_ORG_STREAM_UNAVAILABLE`, "has no status record"), and the Org view cannot be built. The Team and agent DTOs have no such rule, which is why only the Org fails. This is likely the cause of the Org case of `teammate-delivery` and of the vanishing Org row in SDV-03. I accepted SR-063's synchronous read without checking that the cache is complete for every listed row | `API-E02-r4-O8-org-stream-unavailable.txt` (both commits) | `Local Fix` | Implementation (server) |
| F-14 (team view) → **CR-461-040** | REQ-002; SR-058 (rows at every depth) | Implementation defect, not pinned. The server places the helper, delegated by the team's task agent, at the Team's root (`placementOf`, `child-rows-feed.ts:45-56`), so its row event is `TASK_EXECUTION_STARTED` with `parent_team_run_id` = the Team (`team-execution-view-projector.ts:92-94`). Yet the stopped Team's view never renders it, while the agent-run view does (SDV-01). Either the stored-mode Team session does not deliver the ancestor's row event, or base's Team client places a root-level task agent by something other than its delegator. The implementer starts from SDV-02 failing | `API-B01-r4-SDV-evidence.txt` (SDV-02 `rowsShown` = [worker]) | `Local Fix` | Implementation (server or web) |
| F-16 → **CR-461-041** | REQ-009: delegation keeps working from a delegated run; base answered it with a launch note | Implementation defect. For a delegated team's lead, `resolveDelegationPlacement` (`catalog-delegation.ts:96-125`) finds no in-run placement and then gets `null` from `catalogSource`, so it rethrows "not the address of an available agent". The delegator's Manager gets the catalog copy for the same address (diagnostic). The catalog source for a delegated run's member is missing what the delegator has | `API-E01-r4-findings-F16-F20.txt` (lines 12, 214–220) | `Local Fix` | Implementation (server) |
| F-17 → **CR-461-042** | SR-061's item table: base's `task_executions_reopened` / `TASK_EXECUTIONS_REOPENED` return | Implementation defect. After the assigner reactivates a closed run, the feed reports it as a new row (`TASK_EXECUTION_STARTED`) instead of a reopened one. The view's row-change classification does not tell "was in the closed set" from "new" | `API-E01-r4-findings-F16-F20.txt` (lines 222–226) | `Local Fix` | Implementation (server) |
| F-20 → **CR-461-043** | REQ-009 (base's results); base refused before any change: "cannot be restored … Start a new delegation" | Implementation defect. `TaskDelegation.toExistingRun` assigns the follow-up Task, then fails at delivery with a raw `ENOENT` naming an internal `memory/…` path. It neither checks first that the run can be restored nor refuses before changing anything. The raw path is also leaked to the agent | `API-E01-r4-findings-F16-F20.txt` (line 70) | `Local Fix` | Implementation (server) |
| F-22 → **CR-461-044** | REQ-002 ("once"); DS-11 | Implementation defect, not pinned. A worker that delegated further is listed at the top level of its workspace besides its row under its delegator. `createTopLevelRunRule` (`top-level-run-rule.ts`) is applied only by `WorkspaceRunHistoryService`. Either another list path (for example a definition group built from agent history once the worker has `hasCollaboration`) bypasses it, or `parentOf(worker)` changes once the worker has its own child | Both SDV screenshots | `Local Fix` | Implementation (server list or web) |
| F-18 → **CR-461-045** | Contract R-7 / R-8 (not ordered); REQ-009 (base's texts) | Not a source defect alone: the contract does not say which refusal a non-assigner gets when it messages a closed run. Base answered R-8's `TASK_AGENT_RESOURCE_CLOSED` ("Only the agent that assigned…"); the branch answers `TASK_AGENT_RESOURCE_CONFLICT` (`cross-run-message-delivery.ts` `admit`) | Lines 122–131 | `Requirement Gap` | Solution Designer |
| F-19 → **CR-461-046** | Contract R-9 against REQ-009 (base's texts) | Not a source defect alone: R-9 refuses a team run ID from another root's tree, and several delegate refusals, with texts that differ from base's. Base answered `TARGET_IS_TEAM_RUN` with the coordinator's run ID. The contract and REQ-009 disagree, as F-4 and F-5 did | Lines 57–66 | `Requirement Gap` | Solution Designer |

### Required Actions

1. **CR-461-039.** A snapshot's statuses cover every agent of every listed local row, read in the same synchronous step (SR-063): the cached status, else the child root's current status (`pairedAgentStatuses`), else `offline` (design line 244). Add a test: a live Org with a stopped delegated team, and a newly listed row, both parse.
2. **CR-461-040.** Reproduce with SDV-02. Make the helper's row appear under the worker in a stopped Team's view, as in the agent-run view. Add a Team-view test of a row two hops down: snapshot and live event.
3. **CR-461-041.** A delegated run's member gets the same catalog source as its delegator's agent for a catalog address. Add a test for each root kind.
4. **CR-461-042.** A reactivated row is reported as reopened (`task_executions_reopened`) wherever the view had it in its closed set. Add a test for each view.
5. **CR-461-043.** Before assigning a follow-up Task to an existing run, check that the run can be restored. Refuse with base's text before anything changes, and expose no internal path.
6. **CR-461-044.** Reproduce with SDV-01/02. A delegated run whose entry is open is listed once, under its delegator, in every list. Add a test for a worker that delegated further.
7. **CR-461-045 and -046, Solution Designer.** Order R-7 against R-8, and settle R-9's texts against REQ-009. The previous answer (SR-054) was today's results and texts.

### Classification And Routing

- CR-461-039 … -044: `Local Fix`, implementation.
- CR-461-045 and -046: `Requirement Gap`, Solution Designer.
- Mixed result: the Requirement Gaps govern, so I route to `/software_engineering_team/solution_designer`, which carries the six Local Fixes. They do not depend on the gaps, so the designer can release them at once.

### Affected Score Rationale

- Runtime Correctness: 9.3 → 8.7. The Org view fails; delegation from a delegated team fails; a reactivation shows the wrong event; a raw internal error leaks; a run is listed twice.
- Data-Flow Spine: 9.4 → 9.1. The rows two hops down in a Team view, and the snapshot's statuses.

---

## Round 16: Implementation Review Of IR-016 (CRR-020)

- Review Entry Point: `Implementation Review`. Current Code Review Revision ID: `CRR-020`; Current Review Round: `16`.
- Review Scope: `Targeted Delta Review` of `262afbd6bb`: five files, removals only. Round 15's evidence carries forward.
- Classification: task_size `Large`, architectural_risk `High`, unchanged.
- Checks: IMP-62 (server type gate at 1012; stream handler, Org, root-recovery and architecture tests: 53 files, 324 tests). Nothing rerun.

**CR-461-038 (an Org branch of the fence that cannot run): Resolved.**
- Removed: the Org stream handler's check, `OrgViewSources.closedTasks`, its wiring (`api/websocket/index.ts`), and the Org handler test that asserted it.
- No import is left unused: `createAgentOrgRootExecutionIdentity` and `commandAck` keep other uses.
- `RunViewSources.closedTasks` stays for the Team handler, and its doc now names the Team.
- The Team, standalone, resumer and materializer checks are unchanged.
- The commit holds only these five files; the API/E2E Engineer's uncommitted edits are untouched.

**Scorecard.** As round 15, except Cleanup: 9.1 → 9.4. Overall 9.3; every category is at 9.2 or above.

**Findings.** None open.

**For API/E2E.** Round 14's cumulative list, plus C15-03: a rendered two-view check that a refused input to a delegated run whose Task is closed shows no status change in the delegator's view or the list. Also run DS-15's cases end to end:
- a user's message to such a run is refused with base's text;
- restart resume skips it;
- a reopened run, or one whose Task was deleted, takes input.

**Routing.** `Pass`. Recipient: `/software_engineering_team/api_e2e_engineer`. The Implementation Engineer is informed.

---

## Round 15: Implementation Review Of IR-015 (CRR-019)

### Review Meta

- Review Entry Point: `Implementation Review`
- Current Code Review Revision ID: `CRR-019`; Current Review Round: `15`
- Review Scope: `Targeted Delta Review` of `07a3a5890e` (docs `5eebc80691`), read in full. It adds one new owner (`ClosedTaskFence`) and checks it at every input entry and gate head that DS-15 names. No shared interface or spine changes except the new input fence. Round 13's full re-audit and round 14's evidence carry forward.
- Trigger: IR-015 from the Implementation Engineer, implementing SR-070 / DS-15 (G-4), which ARCH-REV-044 passed.
- Classification: task_size `Large`, architectural_risk `High`, unchanged.
- Checks: nothing rerun.
  - IMP-59 (server): type gate; unit 7966 passed.
  - IMP-60: integration 476 passed. Three load-only failures pass alone (18 of 18).
  - IMP-61 (web): type gate; 149 spec files.

### What I Checked

- **One owner.** `ClosedTaskFence.refusal(run)` (`closed-task-fence.ts:27-31`) asks the tree whether a Task names the run, then asks the Task side (the authority, AR-017) whether its entry is open.
  - It uses base's code and text (IMP-58).
  - A run no Task names is not fenced.
  - It is stateless. The local instances in the standalone builder, the manager and the materializer are built from the same two collaborators those owners already receive, so the policy has one owner and no wiring problem.
- **Before resolve or restore, as ARCH-REV-044 requires:**
  - `AgentRunCommandCoordinator.postUserMessage` checks `inputRefusal` before the `initializing` overlay;
  - `StandaloneAgentRunRootManager.postUserMessage` checks before `resolveRoot`;
  - the team handler checks before `getActiveTeamRun` / `resolveManagedTeamRun` and before a mention resolution;
  - `RestartResumer` checks before `resolveOrRestore`.
  An interrupt is not fenced; that is base's rule.
- **At the gate head:**
  - `StandaloneAgentRunRoot.postHostUserMessage` → `refused`;
  - `RootTeamRun.executeAgentCommand` (a message or an approval);
  - `team-root-materializer.ts` `assertExecutionInputAllowed`, base's place, covering application input and a teammate's message.
- **Every input path, by kind:**
  - an agent run's own stream → the coordinator. The command port is bound by `GeneralProcessRunSupervisor` (`:277`), which both the Studio server and the application host create (`start-standalone-application-host.ts:248-249`), so the fence applies in both hosts;
  - the agent-run view takes peer-row commands only (`agent-collaboration-stream-handler.ts:170-176`), so it never posts to a local run;
  - a team member's input → the handler and the materializer;
  - restart resume → the resumer;
  - a peer owner's message → the standalone gate head. Base fenced it too.
- **Agent-to-agent delivery** keeps `ASSIGNER_ONLY_REACTIVATION_MESSAGE` (DS-2), unchanged.
- **Tests**:
  - `closed-task-fence.test.ts` over the real tree and records;
  - the standalone and team gate-head tests with real roots;
  - a refusal registers, activates and binds nothing;
  - the coordinator publishes no frame;
  - the handler and resumer tests;
  - a reopened run, or one whose Task was deleted, takes input.
- **The commit hygiene, as asked.** `07a3a5890e` touches no `tests/e2e` file. The API/E2E Engineer's edits are uncommitted in the worktree (`git status`: twelve or more `tests/e2e` files modified). The implementer's history carries none of them.

### Candidate Gate (round 15)

| Candidate | Observation | Basis | Disposition | Reason |
| --- | --- | --- | --- | --- |
| C15-01 | The fence is wired into the Org stream handler and the Org view session "for uniformity" (`agent-org-stream-handler.ts`: refusal before restore; `org-view-session.ts` and the composition: `closedTasks`). An Org run is never delegated, and `runReferenceOf` returns `null` for `agent_org` (`task-execution-resource-port.ts`), so `ClosedTaskFence.refusal` returns `null` at its first line. The Org branch cannot run | Principle 7 (dead code: "branches that can never run"), which holds in every context | **Promote → CR-461-038** | Added this round; the code comment itself says the Org run is never delegated. It suggests an Org can be fenced, which it cannot |
| C15-02 | `AgentRunCommandCoordinator` reaches the fence through `standaloneRuns?.inputRefusal(…) ?? null`, the older optional port (FU-018) | Principle 16 | Reject | Both hosts bind the port (the supervisor), so it is never absent where input is served; FU-018 already records the older optional shape |
| C15-03 | "No status frame in the delegator's view or the list" is shown by nothing activating, registering or binding, not by a two-view E2E | Test readiness | Hold for Evidence → API/E2E | The source shows it; a rendered two-view check belongs to API/E2E |

### Scorecard (round 15)

As round 14, except Cleanup: 9.4 → 9.1 (CR-461-038). Overall 9.3. Below 9.2: Cleanup only.

### Findings (round 15, open)

#### CR-461-038 (new): an Org branch of the fence that cannot run

- **Required action:**
  - Remove the closed-Task check from `AgentOrgStreamHandler`.
  - Remove `closedTasks` from `OrgViewSources` / `org-view-session.ts` and from the composition's Org wiring, with the Org handler test that asserts it.
  - The Team, standalone, resumer and materializer checks stay.
- **Classification:** `Local Fix`, implementation.

### Round 15 Classification And Routing

- CR-461-038: `Local Fix`, implementation.
- Recipient: `/software_engineering_team/implementation_engineer`.
- Next: a targeted re-review, then API/E2E (C15-03 and the round-14 list).

---

## Round 14: Implementation Review Of IR-014 (CRR-018)

### Review Meta

- Review Entry Point: `Implementation Review`
- Current Code Review Revision ID: `CRR-018`; Current Review Round: `14`
- Review Scope: `Targeted Delta Review` of `c5142b111b..709cf5dd99`. It stays within CR-461-035 … -037 and the Org placement revert, read in full. It also checks the new list reads (`withTeamRows`, the Org history read) against the design's cost notes. Round 13's full re-audit evidence carries forward.
- Trigger: IR-014 from the Implementation Engineer (`1c8264e4f6`, `49f3db1047`; docs `709cf5dd99`), with SR-069 (ARCH-REV-043 Pass).
- Classification: task_size `Large`, architectural_risk `High`, unchanged.
- Checks: nothing rerun.
  - IMP-54 (server): type gate; unit 7949 passed. The one failure is the skill folder watcher's timing test, unchanged since `3228eff74b`; it passes alone.
  - IMP-55 (web): codegen; type gate; 764 of 764 spec files.
  - IMP-56: integration 483 passed.
  - IMP-57: contracts 47 of 47.

### Prior Findings Rechecked

| Finding | Status | Evidence |
| --- | --- | --- |
| CR-461-035 (peer-row mentions refused) | **Resolved by design** (SR-069, ARCH-REV-043) | Base gave a peer run no mention scope (`useComposerTarget.ts:69`, autobyteus-278 REQ-808), and its server refused such a mention as `RUN_NOT_FOUND`. Recorded at base (IMP-53); the same spec runs on the branch. The explicit refusal is a guard with clearer text, not a behavior change. My CRR-017 reading of base was wrong: I took the delegating root's resolution for a supported path, and base's web never offered it |
| CR-461-036 (rule 3 only for the agent view) | **Resolved** | Base's Team view (story 5.2) and Org view (story 5.3) are recorded at `827f1e68dc` (IMP-52): snapshot, started and closed events, and the list row. `team-org-view-base-shapes.test.ts` asserts the branch by key paths. Rule 3 now holds for stories 5.1–5.3. The recordings found two differences, both fixed: the Org placement (below), and the Team list row's `rootTeam.task_executions` (`withTeamRows`) |
| CR-461-037 (a fallthrough, a silent drop, dead code) | **Resolved** | `agentRunDelegatedRunSubject` handles `task_agent` explicitly and refuses a `task_team_member` without `teamRunId` (new spec), and its doc follows SR-066. `readRowEvent` uses the shared `readRow`, which warns naming the child and the view's run (`run-view-rows.ts`). `run-collaboration-statuses-dtos.ts` is removed from src and dist; the identity type is renamed `DelegatedRunIdentity`; `rowRunOf` is removed |

### The Org Placement Revert, As Asked

**Right.** In `c46e5c330b` the implementer placed a row delegated by a mounted team's member into that team, from reading base's code. Base's recording of story 5.3 shows every new Org copy hosted at the root (`agent-org-task-execution-adapter.ts:115`). Rule 3 makes the recording the authority, so the revert brings the branch in line with base: `orgTeamOfDelegator`, `placeInMountedTeam` and the history read's team placement are removed, and the tests assert root placement. This is rule 3 working as designed: a reading of code is checked against a recording.

### Candidate Gate (round 14)

| Candidate | Observation | Basis | Disposition | Reason |
| --- | --- | --- | --- | --- |
| C14-01 | The list reads now read each listed Team's and Org's rows through `RunViewChildren.read()` on every history read (`listed-team-rows.ts:13-22`; `collaboration-root-history.ts:41`). The web's quiet poll re-reads the list every 5 s (`useRunHistorySectionLoad.ts:49-52`), and each read reads each child's own file (`delegated-children-dtos.ts:39`). Base's web reads only `rootTeam.members` from a Team's list row; the Org's rows are read | `DESIGN.md` rule 3 (justify critical-path work), best practice 7 (investigate performance from a baseline or a demonstrated need); ARCH-REV-030's note ("never from a file per child per poll") was written for the status poll | Hold for Evidence → API/E2E | A real cost, but its size is not shown. Peer rows ask no peer: `describeRemoteTaskExecutions` names nodes from this node's registry only, as SR-057 requires. Rule 3 requires the shape, launch fields included. The project's rule is to measure before acting: API/E2E should time the list read with many delegated runs. If it matters, the Solution Designer decides between dropping the unread Team field and an in-memory source |
| C14-02 | The general process run supervisor still builds its own `peerRunOf` | Principle 16 | Reject | It is created before composition step 7, where the channel arrives; the reason is stated. The three member-view services now take the composition's `peerRunOf` |
| C14-03 | FU-024 was renumbered: the implementer's own FU-024 became FU-025 | Ticket bookkeeping | Note | No action |

### Scorecard (round 14)

As round 13, except:
- API/E2E Readiness: 9.0 → 9.3.
- Runtime Correctness: 9.1 → 9.3.
- Cleanup: 9.1 → 9.4.
- Shared-Structure: 9.2 → 9.3.

| Priority | Category | Score |
| --- | --- | --- |
| 1 | Data-Flow Spine Inventory and Clarity | 9.4 |
| 2 | Ownership Clarity and Boundary Encapsulation | 9.4 |
| 3 | API / Interface / Query / Command Clarity | 9.3 |
| 4 | Separation of Concerns and File Placement | 9.3 |
| 5 | Shared-Structure / Data-Model Tightness | 9.3 |
| 6 | Naming Quality and Local Readability | 9.2 |
| 7 | API/E2E Readiness | 9.3 |
| 8 | Runtime Correctness And Behavioral Fidelity | 9.3 |
| 9 | No Backward-Compatibility / No Legacy Retention | 9.4 |
| 10 | Cleanup Completeness | 9.4 |

Overall 9.3. Every category is at 9.2 or above.

### Findings (round 14)

None open.

### For API/E2E (cumulative)

1. **Stale tests first** (autobyteus-agents-107). Since round 13 several of them use what rule 1 restored (`agentRunCollaborationStatuses`, base's event names) or what rule 2 removed. The investigation's per-file list needs updating to rounds 11–14.
2. **CPW** (prompt wording): CR-461-030 … -032 under SR-058 … SR-060, last run at IMP-44.
3. **API-E02 stories** on the current walkthrough.
4. **API-B01 browser and phone:**
   - SDV-01, -02 and -03;
   - MSP-50 … MSP-52;
   - rows at every depth (F-14);
   - a second message to a team child (F-15);
   - mentions to a local child (F-13);
   - rule 2, the delegated row bound to its own run.
5. **Peer-node cases on two nodes:**
   - SR-066's handles: Stop, message, interrupt and conversation with the delegator stopped (REQ-013, AC-016);
   - SR-067's archive and delete guard;
   - the peer rows in the list.
6. **Rule 3's two-node peer capture**, still open.
7. **C14-01:** time the history list read with many delegated runs under listed Teams and Orgs.
8. **The deferred cases:** API-E01, API-I01, API-B03, API-L01 and API-F01.

### Round 14 Classification And Routing

- Result: `Pass`.
- Recipient: `/software_engineering_team/api_e2e_engineer`. The Implementation Engineer is informed.

---

## Round 13: Full Re-Audit At IR-013 (CRR-017)

### Review Meta

- Review Entry Point: `Implementation Review`
- Current Code Review Revision ID: `CRR-017`; Current Review Round: `13`
- Review Scope: `Full Re-Audit`. SR-058 … SR-068 redesign the view contract, the delegation index, the view sequencing and the peer route: `8a47481617..c5142b111b`, 526 files.
  - Read in full: the new and changed owners (`DelegationIndex`, `CollaborationTree`, `RunViewStream(s)`, `run-view-rows.ts`, the three view sessions and handlers, `peer-runs.ts`, `PeerChildObservation`, the web's `delegatedRunSubjects.ts` and `delegatedRunsStore.ts`), the deviations, and the `c5142b111b` fix the implementer flagged.
  - Swept the whole change again: fallbacks and optional collaborators in this round's additions, and dead exports across the repository.
- Trigger: IR-013 (with IR-011 and IR-012) from the Implementation Engineer. It answers CRR-016 under SR-058 … SR-068 (ARCH-REV-033 … ARCH-REV-042, all Pass).
- Basis: the user's direction behind SR-060, SR-061 and SR-066, and the three rules:
  - rule 1: views and lists in base's shapes;
  - rule 2: each run reached as itself;
  - rule 3: a characterization at `827f1e68dc` per story is the acceptance check.
- Classification: task_size `Large`, architectural_risk `High`, unchanged.
- Checks: IMP-47 … IMP-51 as recorded. Server unit and integration failures are load timeouts that pass alone; FU-022 and FU-023 predate this ticket. Nothing rerun. Not run by the implementer: CPW E2E after round 11, the browser probes, the server E2E suites and the rendered check.

### Prior Findings Rechecked

| Finding | Status | Evidence |
| --- | --- | --- |
| CR-461-030 (a delegated run's prompt context) | **Resolved by design** (SR-058, then SR-060's `CollaborationTree.agentCollaboration()` / `inOrganization()`) | One owner per run's map. CPW was last run at IMP-44 (round 11), so API/E2E reconfirms |
| CR-461-031 (the header's sender address) | **Resolved** | `CollaborationTree.reachingAddressOf` is the one owner (SR-060) |
| CR-461-032 (mentions to a child row) | **Resolved for local children** (SR-059 / SR-060: what a run sees is what it reaches). The peer case is CR-461-035 | — |
| CR-461-033 (rows two hops down) | **Resolved** | Rows at every depth, nested by placement, as at base (`nestByPlacement`, `run-view-rows.ts:43-58`). The team DTO's `task_executions` is used again |
| CR-461-034 (a child's send never settles) | **Resolved by rule 2** | A selected local child binds to its own run and stream, so the team view's admission is not involved |

### The `c5142b111b` Fix (inOrderViewDelivery), As Asked

- **Correct.** `inOrderViewDelivery` (`run-view-rows.ts:119-128`):
  - It sends an event at once when nothing is pending and it is not a row event. Its `deliver` reaches `sink.send` before any `await` for such events (`team-view-session.ts:145-153`; the org and agent handlers likewise), so the content window sees it in the same turn, as at base (AC-003).
  - It chains only behind a row event still being read, which keeps the order.
- **One condition it relies on: `deliver` must never reject.** A rejection would reject every later link in the chain. All three `deliver` functions wrap their body in `try … catch`, so the condition holds. The doc comment states it.
- The unit test is `in-order-view-delivery.test.ts`. The removal of `openPackageSnapshotConnection` is clean.

### The Deviations

| Deviation | Judgment |
| --- | --- |
| A peer row's `@` mentions are refused (`REMOTE_RUN_MENTIONS_UNSUPPORTED`) | **Not a deviation an implementer can decide.** At base the delegating root resolved them; now the user's message is refused. This changes behavior under rule 1 and rule 3, and SR-066 and design line 270 say how a peer row's message is routed but not how its mentions resolve. **CR-461-035, Design Impact** |
| A mode switch's in-band snapshot is at the current sequence | Pass. That is the design's own wording (ARCH-REV-038's note) |
| Rows nest by placement (team), as at base | Pass, rule 1 |
| Local child observation follows statuses only | Pass. Under rule 2 a selected child's output comes from its own stream, so the user sees the same output |

### Candidate Gate (round 13)

| Candidate | Observation | Basis | Disposition | Reason |
| --- | --- | --- | --- | --- |
| C13-01 | Peer-row mentions are refused | Rule 1 and rule 3; REQ-013 | **Promote → CR-461-035** | See the deviation above |
| C13-02 | Rule 3's characterization exists for the agent-run view only (`tests/fixtures/char-461/base-agent-view-shapes.json`, IMP-46). The Team and Org views and the list reads are covered only by contract parsing and the placement test (the handoff's "Known gap") | Design line 304 (rule 3: "for each story … the snapshots, events and list reads the web receives") | **Promote → CR-461-036** | The approved acceptance check is incomplete. The one capture that exists found a real defect (the Org rows' placement, fixed in `c46e5c330b`); the Team and Org views have no such guard |
| C13-03 | `agentRunDelegatedRunSubject` (`delegatedRunSubjects.ts:47-53`): `child.kind === 'task_team_member' && child.teamRunId ? member : agentSubject(agentRunId)`. A member without a team run ID is read as an agent run of its own: the fallthrough CR-461-028 removed, back in new code because `AgentRootChildAgent` is base's loose type again. Its doc comment (`:9-10`) says a peer run "keeps the route through its delegator", which contradicts SR-066 | CR-461-028's ruling; Principles 13 and 16 (no silent fallback); Principle 15 (a comment that says the opposite) | **Promote → CR-461-037** | A regression of a resolved finding in new code |
| C13-04 | `readRowEvent` drops a row whose record cannot be read with `.catch(() => null)` and no warning (`run-view-rows.ts:97, 106`). The snapshot path warns (`:65`) | `DESIGN.md` rule 7 | **Promote (folded into CR-461-037)** | The same containment in two paths, one silent |
| C13-05 | Dead after this round: in `run-collaboration-statuses-dtos.ts` (round 8's poll, which rule 1 removed), every export except the type `ChildRunIdentityDto` is unused: `childRunIdentityDtoSchema`, `childRunAgentStatusDtoSchema`, `listedRunRefDtoSchema`, `childRunNodeDtoSchema`, `listedRunChildDtoSchema`, `runCollaborationStatusesDtoSchema`, `RUN_COLLABORATION_STATUSES_MAX_RUNS`, `ListedRunRefDto`, `ListedRunChildDto`, `RunCollaborationStatusesDto`. Also `rowRunOf` (`run-view-rows.ts:135`, new and unused) | Principles 7 and 8 | **Promote (folded into CR-461-037)** | Repository-wide search: no reference. Keep the identity type where its users are, or under a name for what it now is |
| C13-06 | `createPeerRunOf(tree, channel = findProcessRemoteRunChannel)` is built in five places. The composition passes the channel (`collaboration-composition.ts:200`); the supervisor and three member-view projection services take the default process lookup (`general-process-run-supervisor.ts:280`; the three `*-member-run-view-projection-service.ts`) | Principle 16 ("prefer passing a new dependency in") | Reject (as a finding); a suggestion | All three conditions hold: bound before serving, `null` by design where remote is not composed, no cycle. Better: hand the composition's `peerRunOf` to those four owners |
| C13-07 | `members[0]` coordinator fallbacks in web files now byte-identical to base (`agentRunCollaborationIndex.ts:101, 110`, `agentOrgHistoryRows.ts:205-207`, `runHistoryTeamHelpers.ts:108`) | Principle 13 | Reject (as a finding); follow-up **FU-024** | These files are base's own again (rule 1). Base's code is not this ticket's change |
| C13-08 | `AgentPresentationBatchEventDto`; `deserializeChangeEvent` (the merged autobyteus-452) | Principle 7 | Reject | The first is held by the round-9 ruling; the second is not this ticket's |

### Structural Checks (round 13, full)

| Check | Result | Evidence / Notes |
| --- | --- | --- |
| Data-flow spine | Pass | SR-067 walked 19 spines per case (`spine-walk-2026-11-12.md`). The code follows them: rows at every depth; one view sequence per run; a peer reached by its handle |
| Ownership boundary | Pass | `CollaborationTree` (per run) answers every cross-run question; `RunViewStream` owns a view's sequence; a delegated row binds to its own run (rule 2) |
| Empty indirection | Pass | `PeerAgentRun` / `PeerTeamRun` wrap a node boundary; `CollaborationTree` combines several owners for many consumers |
| Visible dependencies | Pass, with a suggestion (C13-06) | — |
| One owner per fact; one picture, one builder | Pass | Base's web builds the rows again from base's shapes, one path per kind |
| Silent fallbacks | **Fail** | CR-461-037 (C13-03, C13-04) |
| Dead code | **Fail** | CR-461-037 (C13-05) |
| Approved acceptance mechanism | **Fail** | CR-461-036 |
| Behavior changed without approval | **Fail** | CR-461-035 |
| Web diff against base | Improved | 86 non-test web source files differ from base, matching SR-061's "the web keeps only three changes" |

### Scorecard (round 13, full)

| Priority | Category | Score | Why / What Is Weak |
| --- | --- | --- | --- |
| 1 | Data-Flow Spine Inventory and Clarity | 9.4 | Spines walked per case and followed |
| 2 | Ownership Clarity and Boundary Encapsulation | 9.4 | One map per run; one sequence per view; rule 2 |
| 3 | API / Interface / Query / Command Clarity | 9.3 | Base's shapes restored |
| 4 | Separation of Concerns and File Placement | 9.3 | — |
| 5 | Shared-Structure / Data-Model Tightness | 9.2 | A loose subject fallthrough (CR-461-037) |
| 6 | Naming Quality and Local Readability | 9.2 | A contradicting comment |
| 7 | API/E2E Readiness | 9.0 | Rule 3 incomplete (CR-461-036); CPW, probes and E2E not rerun |
| 8 | Runtime Correctness And Behavioral Fidelity | 9.1 | Peer-row mentions refused (CR-461-035) |
| 9 | No Backward-Compatibility / No Legacy Retention | 9.4 | — |
| 10 | Cleanup Completeness | 9.1 | CR-461-037 |

Overall 9.2. Below 9.2: API/E2E Readiness, Runtime, Cleanup.

### Findings (round 13, open)

#### CR-461-035 (new): a peer row's `@` mentions are refused

- **Concrete problem:** a user message with `@` mentions to a delegated row on a peer node is refused (`REMOTE_RUN_MENTIONS_UNSUPPORTED`, `peer-runs.ts:54-56`, in all three views). At base it was delivered with the mention note composed by the delegating root.
- **Protects:** rule 1 and rule 3 (what the user sees is base's); REQ-013.
- **Evidence:** C13-01.
- **Required action, for the Solution Designer:** decide how a peer row's mentions resolve without the delegator's root. Options: compose the note from the delegator's `CollaborationTree` (what the peer child reaches through its assigner); let the peer node resolve them through the owner command; or approve the refusal as a behavior change with the user.
- **Classification:** `Design Impact`, Solution Designer.

#### CR-461-036 (new): rule 3's acceptance check covers only the agent-run view

- **Concrete problem:** the Team and Org views and the list reads have no characterization at `827f1e68dc`, although the design makes it the acceptance check for every story.
- **Required action:**
  - Record base's snapshots, events and list reads for the Team and Org views and for the run list (`agentRunCollaborationStatuses`, the history reads) for each story of `stories.py`.
  - Assert the branch against them, except where rule 2 applies.
- **Classification:** `Local Fix`, implementation.

#### CR-461-037 (new): a fallthrough, a silent drop and dead code

- **Required action:**
  - **C13-03.** `agentRunDelegatedRunSubject`: a `task_team_member` without `teamRunId` is refused, not read as an agent run. Correct the doc comment to SR-066.
  - **C13-04.** `readRowEvent` warns, naming the run and the reason, as `readViewRows` does.
  - **C13-05.** Remove the unused contracts of `run-collaboration-statuses-dtos.ts` (keep the identity type with its users, under a name for what it now is) and `rowRunOf`. Rebuild the contracts dist.
- **Classification:** `Local Fix`, implementation.

### Follow-ups (round 13)

- New: FU-024 (base's `members[0]` coordinator fallbacks in web files now identical to base).
- The others stand.

### Round 13 Classification And Routing

- CR-461-036, CR-461-037: `Local Fix`, implementation.
- CR-461-035: `Design Impact`, Solution Designer.
- Mixed result: the Design Impact governs, so I route to `/software_engineering_team/solution_designer`, which carries the two Local Fixes. They do not depend on CR-461-035, so the designer can release them at once.
- Next: a targeted source review, then API/E2E (CPW, the probes, the server E2E suites and the rendered check).

---

## API/E2E Failure-Origin Review Of API-REV-003 (CRR-016)

### Review Meta

- Review Entry Point: `API/E2E Failure-Origin Review`
- Current Code Review Revision ID: `CRR-016`
- Trigger: API/E2E round 3 (API-REV-003), `Fail`, confidence 71%.
  - Failures: F-11 … F-15.
  - Code under test: `da80596b0a` (the merged state `8a47481617`); evidence `7442bd3bc2`.
  - Resolved and confirmed: F-6 … F-10, C8-09 ("every send in all three sections returned") and SR-057 at the API (S17).
- Scope: F-11 … F-15, and API/E2E's observation on the team stream DTO.
- Classification: task_size `Large`, architectural_risk `High`, unchanged.
- Authorities:
  - `requirements-doc.md`: REQ-002 ("a delegated run, whoever delegated it, is shown under the run that delegated it"); the non-goal at line 76 ("No change to what an agent reads: … collaboration texts"); AC-007;
  - the contract §2.3, §2.5 and §5.4.3 E-4;
  - the design: line 157 (child commands go to the child's own root), DS-8 ("one hop") and SR-048;
  - the current principles.
- How each cause was established: `Read`, with API/E2E's reproductions (CPW-P1/P2/P3, CPW-H1, CPW-M2/M4/M5, SDV-01/02/03). I ran nothing.

### Failure Classification

| Failure | Basis | Origin | Evidence | Classification | Owner |
| --- | --- | --- | --- | --- | --- |
| F-11 → **CR-461-030** | Requirements line 76: no change to what an agent reads, collaboration texts included. Wording §4.2 | **Design gap**, and my review gap. A delegated agent run is now an ordinary standalone root, and its context is built by `StandaloneHostMemberContextBuilder`, which always sets `collaborationRole: "standalone_agent"` (`standalone-host-member-context-builder.ts:48`). The prompt therefore drops the task-agent section (`collaboration-prompt-sections.ts:133-146`: "You are a task agent …", "to report your result"). At base the hosting root gave a copy `task_agent`. Two more parts came from hosting: an agent delegated at an org's configured address had the org's handoff rules and the authored instruction (row 5), and a delegated team's member inside an org had the organization line (row 8, `withOrganizationLine` keys on the root's kind, now the team's own). The design never says how a delegated run's prompt context is derived. The role and the organization line follow from the run's own `delegatedFrom`; the source of row 5's rules and instruction is a design decision (cf. SR-054 for team copies) | `API-E01-r3-CPW-findings.txt` (rows 2–5 and 8, with the prompt diff) | `Design Impact` | Solution Designer |
| F-12 → **CR-461-031** | Contract §2.5 ("the receiver sees the sender's address … only when the receiver can use that address to reach the sender"); §5.4.3 E-4 | Implementation defect, and my review gap. The task header's sender address is computed differently per root kind. The standalone root gives its own host address unchecked (`standalone-root-message-delivery.ts:160`, `delegatorAddress: …agentAddressOf(context.identity.agentRunId)`). The org root uses its in-root `reachingAddressOf` (`agent-org-run-message-delivery.ts:154`) and the team root uses `delegatorAddressOf`. Only `CrossRunAddressResolution.reachingAddress` (`cross-run-address-resolution.ts:42-46`) applies §2.5 across runs. So B is shown A's address, which B's resolution (the same class's step 2) cannot reach. Messages use the reaching rule (`collaboration-composition.ts:154`), but the task header does not | CPW-H1: B's send to the header's address returns `COLLABORATION_TARGET_NOT_FOUND` | `Local Fix` | Implementation (server) |
| F-13 → **CR-461-032** | Design line 157: a child row's command goes to the child's own root. AC-007 | Implementation defect, and my review gap. A user message with `@` mentions to a child row resolves the mentions on the delegator's root before routing: the agent view at `agent-collaboration-stream-handler.ts:175-187` (`root.resolveCollaboratorMentions({ focusedAgentRunId: target, … })`), and the team view's send handler, the same shape. The child is not an agent of that root, so the message is refused with `RUN_NOT_FOUND` / `TEAM_SEND_MESSAGE_REJECTED`. The org handler has the same shape (not run) | CPW-M2, CPW-M4 (agent view), CPW-M5 (team view) | `Local Fix` | Implementation (server) |
| F-14 → **CR-461-033** | REQ-002: "A delegated run, whoever delegated it, is shown under the run that delegated it … in the desktop and phone layouts" | **Design gap**, and my review gap. A run two hops down has no source of rows. A view and the poll carry one hop (DS-8, SR-055/057). The web polls only top-level listed runs (`runHistoryListedRuns.ts`). A child row is not a listed run, so its own children (the worker's helper) are never read. At base, copies of copies were nested in the host's tree. In round 9 I accepted "every builder is one hop" from DS-8 without checking REQ-002 for deeper levels. Related (API/E2E's observation): the team stream DTO still requires `task_executions` in a task team (always `[]`, `team-execution-view-projector.ts:165`); the decision here either fills it or removes it as a clean cut | SDV-01, SDV-03: `"delegated":true` and the worker's own poll lists the helper; `rowsShown` is the worker only (`API-B01-r3-SDV-01-helper-row-missing.png`) | `Design Impact` | Solution Designer |
| F-15 → **CR-461-034** | AC-007; SR-048: a send settles on its `MEMBER_INPUT_MESSAGE` echo by identity | Implementation defect, and my review gap (CR-461-019 fixed focus; I did not check settlement). `TeamSendAdmissions` (`teamSendAdmission.ts:35-71`) settles only on the team stream's `MEMBER_INPUT_MESSAGE` or an `ERROR`. A child's input happens in the child's own root, so the team stream never echoes it (`agent-team-stream-handler.ts:110-114` routes it to `children.execute` and answers nothing on success). The first send stays pending, and the next is refused: "already has a pending Team message admission". This is F-8 made deterministic. The agent-run view passes because its stream acknowledges commands | SDV-02 (`API-B01-r3-SDV-02-second-message-refused.png`) | `Local Fix` | Implementation (server and web) |

### Required Actions

1. **CR-461-030, Solution Designer.** Decide how a delegated run's collaboration context is derived, so that what an agent reads is unchanged (requirements line 76):
   - its role: task agent when the run has `delegatedFrom`;
   - the organization line for a member of a team delegated from an org;
   - for an agent delegated at an org's configured address, the source of its handoff rules and the authored instruction.
   One prompt-context owner should serve every root kind, so the three builders do not each decide.
2. **CR-461-031.** The task header's sender address follows §2.5 through one owner, `CrossRunAddressResolution.reachingAddress`, for every delegator kind. The case in E-4 then shows the run ID only. Add a test for each kind.
3. **CR-461-032.** A child row's message with mentions is resolved on the child's own root, by `DelegatedRunCommands`, together with the post, in the agent, team and org handlers. The delegator's root resolves only its own agents' mentions. Add a test per view.
4. **CR-461-033, Solution Designer.** Decide the source of rows for runs more than one hop down, in the list and in the views, on desktop and phone (REQ-002). One option: the poll answers for listed runs and for their child rows, so a child row's children come from the same answer, one level per request, with no file read per poll. In the same decision, fill or remove the team DTO's `task_executions` for a task team.
5. **CR-461-034.** A child's send settles: by the server acknowledging the child's accepted input on the view's stream, or by relaying the child's input event. The composer must never keep a pending admission that cannot settle. Add a web spec: two sends to a stopped team's child.

### Classification And Routing

- CR-461-031, -032 and -034: `Local Fix`, implementation.
- CR-461-030 and -033: `Design Impact`, Solution Designer.
- Mixed result: the Design Impacts govern, so I route to `/software_engineering_team/solution_designer`, which carries the three Local Fixes. They do not depend on the Design Impacts, so the designer can release them at once.
- After the fixes: source review, then API/E2E. The Next Round list (stale suites, peer-node browser probes, the deferred cases) stands.

### Affected Score Rationale (round 10 scorecard)

- Runtime Correctness: 9.3 → 8.7. The prompt text changed for every delegated agent; a mention to a child is refused; a second send to a team child is refused.
- Data-Flow Spine: 9.4 → 9.0. There is no source for runs two hops down (DS-11 deeper levels), and DS-1's header rule is not applied per kind.
- Ownership: 9.4 → 9.2. The header address and the prompt context are each decided per root.

---

## Round 10: Implementation Review Of IR-010 (CRR-015)

### Review Meta

- Review Entry Point: `Implementation Review`
- Current Code Review Revision ID: `CRR-015`; Current Review Round: `10`
- Review Scope: `Targeted Delta Review` of the fix, plus a review of the merge.
  - `994ae84850` stays within CR-461-028 and -029.
  - The merge `8a47481617` brings in `origin/personal` at `3228eff74b` (95 commits, at the user's request). I checked it for overlap with this change, for conflict resolution, and for merged code that still assumes the hosting model.
  - Round 9's full re-audit evidence carries forward.
- Trigger: IR-010 from the Implementation Engineer (`994ae84850`, `8a47481617`; docs `da80596b0a`).
- Classification: task_size `Large`, architectural_risk `High`, unchanged.
- Checks: all on the merged state; nothing rerun.
  - IMP-39 (server): type gate 1014; unit 7910 passed; integration 482 passed, 1 failed. The failure is `file-system-watcher.integration.test.ts`, which came with the merge (autobyteus-452). It failed under the full suite's load and passed 3 of 3 runs alone.
  - IMP-40 (web): type gate 93; 5734 specs passed; codegen clean; the probe's 52 case IDs are unique.
  - IMP-41 (contracts): 41 passed; the dist equals the committed one.

### Prior Findings Rechecked

**CR-461-028 (two silent fallbacks in the new web owners): Resolved.**
- `DelegatedChildRun` is a tight union: an agent child has no members and no coordinator; a team child always has its coordinator.
- Each adapter derives the coordinator from its source's one fact, and refuses a team without it:
  - in the views, the member at the coordinator address (`coordinatorOf`);
  - in the poll, the member the Task entry names (`requireMember`).
- The `members[0]` and `{ address, agentRunId: '' }` fallbacks are gone. That covers the Org's peer rows (`agentOrgChildRows.ts`) and the agent-run index's `coordinatorOf` and `coordinatorRunIdOf`, the same fallback in a touched file.
- `AgentRootChildAgent` is a tight union: a `task_team_member` always has its `teamRunId`, and a `task_agent` never does. `agentRunAgentReadSubject` has no fallthrough.
- Specs: `delegatedChildRuns.spec.ts`, and the member-team case in `agentReads.spec.ts`.

**CR-461-029 (dead exports): Resolved.** `ChildRunNodeDto`, `ListedRunChild`, `isRemoteExecutionKnown` and `RunHistoryIndexFile` are removed, along with the import only the last one used. The dist is rebuilt.

### The Merge Of `origin/personal`

| Check | Result | Evidence |
| --- | --- | --- |
| Source files both sides changed since the merge base `827f1e68dc` | Only `autobyteus-web/docs/agent_execution_architecture.md` and `autobyteus-web/package.json` | The 55 source files the base changed are background tasks, the file explorer and viewers, phone file opening and localization |
| Conflict resolution | One conflict, in the phone probe's case imports and runners: both sides kept. This ticket's cases were renumbered to MSP-50 … MSP-52 | IMP-40: syntax OK, no duplicate IDs |
| Merged code against the new model | Pass | The new background-task read `agentBackgroundTaskView(agentRunId)` (`agent-background-task-view.ts:84-97`) reads any published agent run by its own ID, a delegated run included. No merged code reads a child through its delegator or names hosted copies |
| The failing integration test | Not this ticket | `file-system-watcher.integration.test.ts` came with autobyteus-452 and fails under load only. Recorded as **FU-021** |

### Scorecard (round 10)

As round 9, except:
- Shared-Structure: 9.1 → 9.4.
- Cleanup: 9.1 → 9.4.

| Priority | Category | Score |
| --- | --- | --- |
| 1 | Data-Flow Spine Inventory and Clarity | 9.4 |
| 2 | Ownership Clarity and Boundary Encapsulation | 9.4 |
| 3 | API / Interface / Query / Command Clarity | 9.3 |
| 4 | Separation of Concerns and File Placement | 9.3 |
| 5 | Shared-Structure / Data-Model Tightness | 9.4 |
| 6 | Naming Quality and Local Readability | 9.2 |
| 7 | API/E2E Readiness | 9.2 |
| 8 | Runtime Correctness And Behavioral Fidelity | 9.3 |
| 9 | No Backward-Compatibility / No Legacy Retention | 9.4 |
| 10 | Cleanup Completeness | 9.4 |

Overall 9.3. Every category is at 9.2 or above.

### Findings (round 10)

None open.

### For API/E2E (cumulative)

1. **The contract stories (API-E02)** on the regenerated walkthrough (SR-054, SR-057):
   - §5.1 S17 by description and S25's refusal;
   - §5.2's texts;
   - §5.3 O5–O7. C8-09: does a delivery error still leave a sender's tool call waiting?
2. **The stopped-delegator views (API-B01).**
   - SDV-02 (team) and SDV-03 (org).
   - Phone: the agent, team and org stopped-delegator cases, now MSP-50 … MSP-52 (formerly MSP-37 … MSP-39), including a listed team's and org's children and peer children marked with their node.
   - The agent-run view's peer child Team tab (CR-461-022).
3. **Stale tests first (autobyteus-agents-107):**
   - the restore path (CR-461-008);
   - child reads through team-member queries (CR-461-014);
   - the removed poll `agentRunCollaborationStatuses`;
   - the removed standalone member trace, file-list and file-content reads (CR-461-022): two gated suites and one web probe, in the handoff's Known Risks;
   - the removed events and hosting assumptions.
4. **The deferred cases:** API-E01, API-I01, API-B03, API-L01 and API-F01.
5. **The integration suite:** `file-system-watcher.integration.test.ts` fails under load only (FU-021, not this ticket).

### Round 10 Classification And Routing

- Result: `Pass`.
- Recipient: `/software_engineering_team/api_e2e_engineer`. The Implementation Engineer is informed.

---

## Round 9: Full Re-Audit At IR-009 (CRR-014)

### Review Meta

- Review Entry Point: `Implementation Review`
- Current Code Review Revision ID: `CRR-014`; Current Review Round: `9`
- Review Scope: `Full Re-Audit`. The round changes shared interfaces and spines:
  - the tree's required `RunPartsReader`;
  - the poll contract's `node`;
  - every web row builder;
  - the removal of the standalone member reads.
  I read the delta `095b45b087..1bdb9135c6` in full. Over the whole change I reran the fallback, optional-collaborator and lookup sweep and the repository-wide dead-export sweep. Round 8's spine traces carry forward where the delta does not touch them.
- Trigger: IR-009 from the Implementation Engineer (`07bcc118e4`, `77c64ed011`, `e2a45770a7`, `2d31871bc0`, `d9e124f844`; docs `1bdb9135c6`). It answers CRR-013 and SR-057 (ARCH-REV-032 Pass).
- Authorities: the current principles after autobyteus-agents-112:
  - Principle 11: "including a picture of data shown in several places" (Case 10);
  - Principle 16: "a required collaborator … is not optional because tests leave it out" (Case 9);
  - `DESIGN.md` rules 7 and 11.
- Classification: task_size `Large`, architectural_risk `High`, unchanged.
- Checks: IMP-36 (server: type gate 1014, unit 7896, integration 483), IMP-37 (web: type gate 93, 5649 specs, codegen clean) and IMP-38 (contracts 41, dist equal). Nothing rerun.

### Prior Findings Rechecked

| Finding | Status | Evidence |
| --- | --- | --- |
| CR-461-022 (two child-read mechanisms; a peer child's Team tab) | **Resolved** | `agentRunAgentReadSubject` (`agentReads.ts:65-80`): the host is `run`; a local child is its own `run`, or `teamMember` of its own team run; a peer child is `standaloneMember` through the host; an unknown agent throws. The view's child load, browse subject and Team-tab key use it. The server's standalone member reads answer peer children only, and the two GraphQL queries and one REST route are removed. A spec covers a peer child's Team tab. One residual fallthrough: CR-461-028 |
| CR-461-023 (required collaborators optional for tests; silent drops) | **Resolved** | `DelegationTree(source, reader: RunPartsReader)` (`delegation-tree.ts:100`). `TaskDelegation`'s `runOfAgent`, `deliverToRun`, `recordCollaborating` and `channel` are required, with no process fallback. `CrossRunMessageDelivery.senderAddress` is required. Warnings name the run and the reason (`delegation-tree.ts:325-334`; `remote-run-view-provider.ts`, the launches). Tests use `NO_RUN_PARTS` and `readerOfAgents` |
| CR-461-024 (three owners of a run's agents) | **Resolved** | `DelegationTree.partsOf` is the one read and cache, kept per node. `agentsOf` gives a delegated agent run with no stored address its `recipientAddress`; `standingOf` derives the standing. `DelegatedRunAgentsReader(tree)` and `CrossRunAddressResolution({ tree })` read the tree (`collaboration-composition.ts`). The `"/"` and `childRunIdentity` fallbacks are gone |
| CR-461-025 (child rows built twice) | **Resolved** | One child shape, `DelegatedChildRun`, with adapters for each source (`delegatedChildRuns.ts`). One builder per kind, used by both the open view and the list: `agentRunTaskRows` (`agentRunCollaborationContext.ts:263`, `agentRunCollaborationStore.ts:281`), `teamRunHistoryRows` (`runHistoryTeamExecutionRows.ts:51, 59`) and `agentOrgChildRows` (`agentOrgHistoryRows.ts:173, 177`). The phone uses the same projections. The per-path builders are removed. A spec per kind checks open against listed rows |
| CR-461-026 (dead code) | **Resolved** for its list | None of `getTeamRunService`, `TaskExecutionReferenceDto`, `ChildRunAgentStatusDto`, `standaloneNavigationTarget`, the two query-data types, `agentRunCollaborationStatuses` or `refreshListedStatuses` is referenced outside E2E. The public `hasCollaboration` is gone; the server's internal index flag stays. `workspace_layout.md` describes the current poll. The new sweep finds four more: CR-461-029 |
| CR-461-027 (peer children not listed) | **Resolved** (SR-057) | `RunViewChildren.listed` adds open peer children: `peerChildRunIdentity` from the Task entry, the node named from this node's registry (`peerNodeNames`), and no statuses. Nothing is asked of a peer. The web marks the peer row with its node and shows no status, as at base (ARCH-REV-032) |

The implementer's six notes, judged:
1. The `node` field: Pass.
2. An agent run with no metadata is now left out with a warning: Pass, `DESIGN.md` rule 7.
3. An agent run's parts are kept only once its address is stored: Pass. A run without an address has no children for the poll, and the cache is per node.
4. Team rows with a view open come from the shared builder over the view's tree and `listRemoteExecutions()`: Pass; this is CR-461-025's goal.
5. One hop: Pass, matching DS-8 ("one hop") and contract §4.
6. FU-020 (attachment owners that name the host): accepted as a follow-up. It is a stored path layout, so changing it is a data transition that belongs to its own ticket.

### Candidate Gate (round 9)

| Candidate | Observation | Basis | Disposition | Reason |
| --- | --- | --- | --- | --- |
| C9-01 | `coordinatorOf` (`delegatedChildRuns.ts:28-29`): `(members.find((m) => m.address === coordinatorAddress) ?? members[0])?.agentRunId ?? null`. A team child whose coordinator address is not among its members silently opens its first member. Meanwhile, the answer's identity takes the coordinator from the Task entry's `entryAgentRunId` (`child-run-identity.ts`), so the open-view adapters and the listed adapter derive "the member a team row opens" in two ways | Principles 13 and 16, which hold in every context (no behavior decided by a silent fallback); Principle 11 (one fact, one owner) | **Promote → CR-461-028** | A team's own file declares its coordinator among its members, so the fallback serves no supported state. If it were ever reached, the row would open the wrong agent without an error. This is the class CR-461-016 was failed for |
| C9-02 | `agentRunAgentReadSubject` (`agentReads.ts:72-76`): `if (local?.kind === 'task_team_member' && local.teamRunId)`, otherwise `if (local) return { kind: 'run', runId: agentRunId }`. A child-team member without a team run ID would be read as a run of its own, which it is not. The index allows that because `AgentRootChildAgent.teamRunId` is `string \| null` for both kinds (`agentRunCollaborationIndex.ts:15-25`) | Principle 11 (tight structures); Principles 13 and 16 | **Promote (folded into CR-461-028)** | An impossible state the type permits, and the owner silently misreads it. Make the union tight (a `task_team_member` always has its `teamRunId`) or throw |
| C9-03 | Exports nothing uses, in files this change touches: `ChildRunNodeDto` (new this round, unused); `ListedRunChild` (`listedRunChildrenQuery.ts`, used by round 8's builders and unused since this round); `isRemoteExecutionKnown` (`remoteChildren.ts`; base had 3 files referencing it, now only its own); `RunHistoryIndexFile` (`agent-run-history-index-types.ts`, already dead at base, in a touched file) | Principle 7; the CR-461-026 ruling (a new unused contract type is removed, as `ChildRunAgentStatusDto` was) | **Promote → CR-461-029** | Repository-wide search, including Android, iOS and the gateway: only its own file references each |
| C9-04 | `AgentPresentationBatchEventDto`, `AgentTeamRootExecutionViewDto`, `AgentOrgRootExecutionViewDto`: unused inferred types in contract files this change touches, already unused at base | Principle 7 | Reject (ruling held) | The contract package exports an inferred type beside each schema as its convention. They are not removed for convention-consistent completeness: round 8 left them, and no new evidence changes that |
| C9-05 | `peerNodeNames`: `channel?.peerName(nodeId).catch(() => null) ?? nodeId` | Principle 16 | Reject | A stated display rule ("a node it does not name is its ID"), moved from base code. The channel is null by design where remote collaboration is not composed |
| C9-06 | `RemoteDelegation`'s optional `channel?` with `resolveRemoteRunChannel`'s process fallback | Principle 16 | Reject (FU-011) | An older owner and lookup from base. Production passes the channel |
| C9-07 | An absent run's file is not cached, so a run deleted from disk but still in the tree warns each time it is asked | `DESIGN.md` rule 7 | Reject | Repeated but correct warnings; no wrong behavior |

### Structural Checks (round 9, full)

| Check | Result | Evidence / Notes |
| --- | --- | --- |
| Data-flow spine | Pass | DS-8 and DS-11 now cover local and peer children for every kind; one hop |
| Ownership boundary | Pass | One read-subject owner per view kind; the tree owns a run's parts |
| Shared-structure tightness; one owner per fact | **Fail** (C9-01, C9-02) | CR-461-028 |
| Repeated coordination; one picture, one builder (Principle 11, Case 10) | Pass | One builder per kind, used by both the view and the list |
| Empty indirection | Pass | The adapters translate per source; the builders decide placement |
| Visible dependencies; required collaborators (Principle 16, Case 9) | Pass | No optional collaborator in this ticket's new owners; older ones are FU-011 and FU-018 |
| Dead code in touched files | **Fail** | CR-461-029 |
| Contain bad data with a warning | Pass | — |
| Interfaces | Pass | `node` is explicit: null for this node |
| File size | Pass | — |
| Tests | Pass | Failing-first specs; open-against-listed specs per kind |

### Scorecard (round 9)

| Priority | Category | Score | Why / What Is Weak |
| --- | --- | --- | --- |
| 1 | Data-Flow Spine Inventory and Clarity | 9.4 | Every kind, local and peer, one hop |
| 2 | Ownership Clarity and Boundary Encapsulation | 9.4 | Read owners per view; the tree owns parts |
| 3 | API / Interface / Query / Command Clarity | 9.3 | — |
| 4 | Separation of Concerns and File Placement | 9.3 | — |
| 5 | Shared-Structure / Data-Model Tightness | 9.1 | A loose `teamRunId`; the coordinator derived two ways (CR-461-028) |
| 6 | Naming Quality and Local Readability | 9.2 | FU-010, FU-019 |
| 7 | API/E2E Readiness | 9.2 | Gated suites and one probe use the removed reads (handoff) |
| 8 | Runtime Correctness And Behavioral Fidelity | 9.3 | — |
| 9 | No Backward-Compatibility / No Legacy Retention | 9.4 | — |
| 10 | Cleanup Completeness | 9.1 | CR-461-028, CR-461-029 |

Overall 9.3. Below 9.2: Shared-Structure (9.1) and Cleanup (9.1).

### Findings (round 9, open)

#### CR-461-028 (new): two silent fallbacks in the new web owners

- **Concrete problem:** C9-01 and C9-02. In each, an impossible state gets a wrong answer instead of an error.
- **Protects:** Principles 11, 13 and 16; the CR-461-016 ruling.
- **Required action:**
  - **C9-01.** Derive a team child's coordinator once. Either the view DTOs carry `coordinatorAgentRunId` as the answer does, so the adapters copy it, or `coordinatorOf` throws when the coordinator address is not among the members. Drop the `members[0]` fallback.
  - **C9-02.** Make `AgentRootChildAgent` a tight union, where a `task_team_member` has a non-null `teamRunId`, and remove the `&& local.teamRunId` fallthrough, or throw.
  - Add one spec each.
- **Classification:** `Local Fix`, implementation (web).

#### CR-461-029 (new): dead exports in touched files

- **Concrete problem:** C9-03.
- **Required action:** remove `ChildRunNodeDto`, `ListedRunChild`, `isRemoteExecutionKnown` and `RunHistoryIndexFile`. Rebuild the contracts dist.
- **Classification:** `Local Fix`, implementation.

### Follow-ups (round 9)

- FU-020 is accepted as a follow-up.
- FU-006, FU-007, FU-010, FU-011, FU-013, FU-016, FU-018 and FU-019 stand.

### Round 9 Classification And Routing

- CR-461-028, CR-461-029: `Local Fix`, implementation. No design impact.
- Recipient: `/software_engineering_team/implementation_engineer`.
- Next: a targeted re-review of CR-461-028 and -029, then API/E2E.

---

## Round 8: Full Review Of The Whole Change At IR-008 (CRR-013)

### Review Meta

- Review Entry Point: `Implementation Review`
- Current Code Review Revision ID: `CRR-013`; Current Review Round: `8`
- Review Scope: **`Full Review`** of the whole change, `827f1e68dc..095b45b087`: 943 files, 320 of them changed source files. The user asked for a full review against the design principles, not a delta.
  - Every structural check and the full scorecard were redone.
  - Earlier rulings are kept where no new evidence changes them ("Rulings hold").
- Trigger: IR-008, from the Implementation Engineer. It answers CRR-012 (CR-461-017 … -021) under SR-055 (ARCH-REV-030) and SR-056 (ARCH-REV-031).
- Authorities:
  - the current `design-principles.md`: "The Approach: Spine First, Practices In Context", Principles 1–16, the empty indirection check;
  - `design-examples.md` Examples 9–11 and Case 8;
  - `ticket-scope.md` (autobyteus-agents-107);
  - the project's `DESIGN.md` rules 7, 9, 10 and 11;
  - the requirements, the contract and the design spec through SR-056.
- Method:
  - Spine first: DS-1 (delegate), DS-2 (a message between runs), DS-5 (Task closure), DS-8 (views), DS-11 (the run list and its poll) and the migration, traced end to end for each kind (agent, team, org; local and peer).
  - Sweeps over the 320 changed source files: silent fallbacks (`?.` + `??`, `.catch(() => …)`); optional collaborators; process-wide lookups; readers still assuming hosting (a sender or child looked up in the delegator's index); exports nothing uses (each name searched across the repository, including Android, iOS and the gateway); files over 500 effective lines (none) or with over 220 added lines (four new files, each one coherent owner).
  - How each finding was established: `Read`, unless stated otherwise.
- Classification: task_size `Large`, architectural_risk `High`, unchanged.
- Checks: IMP-33 … IMP-35 as recorded. Nothing rerun.

### Prior Findings Rechecked

| Finding | Status | Evidence |
| --- | --- | --- |
| CR-461-017 (run-ID delivery text) | **Resolved** | `cross-run-message-delivery.ts:103`: by address `"Delivered message to <address>."`, else `MESSAGE_DELIVERED_TEXT`, which is shared with `send-message-to-tool-result-contract.ts` |
| CR-461-018 (an org fail-stops on a message from another run) | **Resolved** | `agent-org-run-message-delivery.ts`: only the receiver must be the org's. Test with a real persistence coordinator: by run ID and by address, the sender records both and the org does not fail-stop. The commit records that before the fix the route rejected. Whether some other delivery error could leave the tool call waiting is not shown: held for API/E2E (C8-09) |
| CR-461-019 (a message to a child row lost) | **Resolved** | `teamMemberInspectionCoordinator.ts`: a delegated child is focused from the click and read after. The new spec fails before the fix |
| CR-461-020 (the Team tab reads through the team) | **Resolved for team and org views**; the agent-run view regresses for peer children (CR-461-022) | `participantMessagesKeyOf` in team and org views |
| CR-461-021 (team and org lists show no children) | **Resolved for local children** (SR-055/056). Peer children of a listed run that is not open are no longer shown: CR-461-027 | `runCollaborationStatuses(runs)`, `child-run-identity.ts`, `RunViewChildren.listed`; web `listedRunChildrenStore`, row builders |

### Supported Scenarios (round 8 additions)

| Scenario ID | Basis | Shape | Path | Use |
| --- | --- | --- | --- | --- |
| SCN-013 | REQ-002, autobyteus-278 (peer delegation, kept by REQ-009) | Normal | The user's agent, team or org run delegated to a peer node. The run is listed but not open, or open in the agent-run view, and the user reads the peer child's Team tab | Use (CR-461-022, CR-461-027) |
| SCN-014 | Design line 72 / contract §4: the `DelegationTree` owns each run's agents | Engineering contract | Every reader of a run's agents | Use (CR-461-024) |
| SCN-015 | SR-056: "the view and the list agree by construction through the shared builder" | Engineering contract | The rows of a delegator's children, open view or listed | Use (CR-461-025) |

### Candidate Gate (round 8)

| Candidate | Observation | Basis | Disposition | Reason |
| --- | --- | --- | --- | --- |
| C8-01 | Agent-run view: `AgentRunCollaborationContext.participantMessagesKey` (`agentRunCollaborationContext.ts:346-352`) gives a peer child (`remote_agent`, `remote_team_member`) the key `{ rootKind: 'agent', rootRunId: <the peer's run> }`, so its messages are asked of this node, where that run does not exist. At base, and in the team and org views, a peer child is read through the delegator's own log | SCN-013; F-9's failure mode | **Promote → CR-461-022** | A regression for a supported path. It sits in a second mechanism: this view decides child or own in its own code (the messages key) and reads the child's stored state through the host (`standaloneMember`, `agentRunCollaborationStore.ts:341`), resolved on the server (`StandaloneRootMemberViewProjectionService` + `DelegatedChildLocations`). The team and org views use the read-subject owner in `agentReads.ts`. One rule, two mechanisms, already drifting |
| C8-02 | Required collaborators of this ticket's new owners are optional only so that tests can leave them out: `DelegationTree(source, reader = () => null)` (`delegation-tree.ts:82`, then `this.reader()?.agentsOf(run)` :276 and `if (!reader) return` :300); `TaskDelegation`'s `tree(): … & Partial<Pick<DelegationTree, "runOfAgent">>`, `deliverToRun?`, `recordCollaborating?`, `channel?` (`task-delegation.ts:89-101`, uses :261, :277, :322); `CrossRunMessageDelivery`'s `senderAddress?` (`cross-run-message-delivery.ts:68, 96`). The composition root always supplies them (`collaboration-composition.ts:88, 153-154, 164-176`); test helpers omit them (`tests/helpers/delegation-tree-of.ts:10`, `task-side-binding.ts:20`) | `DESIGN.md` rule 11 (no parameter only tests need); Principles 13 and 16, which hold in every context ("a missing collaborator fails loudly") | **Promote → CR-461-023** | If one were ever missing, behavior would change silently: children vanish from every view and list; the coordinator refusal is skipped; the reply address is dropped; "collaborating" is not recorded |
| C8-03 | Unreadable per-run data is swallowed without the logged warning rule 7 asks for: `DelegationTree.agentsOf` `.catch(() => null)` → `[]` (`:276`), so `childRunIdentity` returns null and the child is left out of the list silently (`run-view-children.ts:57-58`); `DelegatedRunAgentsReader.agentsOf` `.catch(() => null)` (`delegated-run-agents-reader.ts:46`); the peer side's `runLaunches(run).catch(() => [])` (`remote-run-view-provider.ts:67`) | `DESIGN.md` rule 7 ("record it with a logged warning that names the run and the reason") | **Promote (folded into CR-461-023)** | The containment is right; the missing warning hides why a child disappeared |
| C8-04 | A run's agents are derived by three readers of its own file: `DelegationTree.agentsOf` (cached per run), `DelegatedRunAgentsReader` (its own `RunOwnAgentsReader`, uncached, `delegated-run-agents-reader.ts:22-26`) and `CrossRunAddressResolution` (`standing: new RunOwnAgentsReader(memoryDir)`, `collaboration-composition.ts:152`, read per message). Their fallbacks differ: an agent run with no stored address is its `recipientAddress` in the tree (`:281`) but `"/"` in the reader (`:48`); an unreadable run gives `[]` in one and itself in the other. `childRunIdentity` adds a third copy of the tree's fallback (`child-run-identity.ts:22`) | Design line 72 and contract §4 ("each node's Tasks and agents"); Principle 11 ("each fact is derived by one owner") | **Promote → CR-461-024** | One fact with three owners and two answers. It also costs a file read per cross-run message |
| C8-05 | The web builds a delegator's child rows twice per view kind, once from the open view and once from the poll's answer. Team: `buildRunHistoryTeamExecutionRows` places children by the view's navigation rows and lifts task agents (`runHistoryTeamExecutionRows.ts:50-110`), while `withListedChildRows` re-implements placement by address equality, plus names, starters and statuses (`runHistoryTeamListedChildRows.ts:18-59`). Agent: `listedAgentRunTaskRows` re-implements `AgentRunCollaborationContext.listTaskRows` (`agentRunListedTaskRows.ts:22-60`) | SCN-015 (SR-056's "agree by construction through the shared builder"); Principles 11 and 13 | **Promote → CR-461-025** | Two implementations of one visual fact. If they diverge, a row jumps or changes its name when the run is opened. The server shares its builder (`childRunIdentity`); the web does not |
| C8-06 | Dead code this change made, or left in files it touches: the public `RunHistoryItemObject.hasCollaboration` and the web's queries, types and projections of it (FU-017); `getTeamRunService` (`team-run-service.ts:317`, lazily creates a second `TeamRunService`; only tests call it now, and an architecture test special-cases it); contract types `TaskExecutionReferenceDto` (its users removed) and `ChildRunAgentStatusDto` (new, unused); web `standaloneNavigationTarget` (`runHistoryNavigationStoreActions.ts:69`), `GetTeamMemberRunProjectionQueryData` and `GetTeamRunResumeConfigQueryData` (`runHistoryTypes.ts:246-250`); and `autobyteus-web/docs/workspace_layout.md:27`, which still describes the removed `agentRunCollaborationStatuses` / `refreshListedStatuses` flow | Principles 7 and 8; `DESIGN.md` rule 11; the CR-461-008 / CR-461-014 ruling | **Promote → CR-461-026** | Repository-wide search (including Android, iOS and the gateway): no product reader. FU-017 is reclassified |
| C8-07 | Peer children of a listed run that is not open are no longer shown. SR-055's answer carries local children only, and the stored-view read that showed them was withdrawn (the implementer's Known Risk 2) | REQ-002 ("whoever delegated it … shown under the run that delegated it"), autobyteus-278 kept by REQ-009 | **Promote → CR-461-027** | A regression the design did not cover: SR-055 decided the poll for local children only |
| C8-08 | The two identity fields beyond SR-056's list (`coordinatorAgentRunId`, `delegatorAddress`; `dfc583e1c2`) | SR-056 | Reject (as a finding) | Pass, deviation recorded, reason holds: both are fixed for the run's life, come from memory, and the list needs them |
| C8-09 | Whether a delivery that throws inside a sender's tool call returns a result rather than leaving the call waiting (F-7's symptom) | CR-461-018 | Hold for Evidence (API/E2E) | Its known cause is fixed. API/E2E's rerun of §5.3 O6/O7 shows whether the wait remains |
| C8-10 | `AgentRunService` decides root-or-direct by an optional `standaloneRuns`; `TaskExecutionResourceRelease` has an optional `request` | Principle 16 | Reject (as a finding); follow-up **FU-018** | Both are in base. This ticket's new code only uses them, and production supplies `requestRelease` |
| C8-11 | Hosting-era web names (`transient_execution`, `task_agent`) | Principle 15 | Reject (as a finding); follow-up **FU-019** (the web half of FU-010) | Rulings hold: the hosting renames were deferred as FU-006 / FU-010 |
| C8-12 | `teamMemberInspectionCoordinator.ts`: calls `teamAgentReadSubject({ …, memberAddress: '' }, id)` only to tell whether the agent is a delegated child | Readability | Reject; a suggestion | No problem: the subject is never read. It goes away with CR-461-022's owner (ask the owner "is this a child") |
| C8-13 | The four new files of over 220 lines (`delegation-tree.ts`, `task-delegation.ts`, the migration, `collaboration-composition.ts`) | Principle 12 | Reject | Each is one coherent owner, under 500 effective lines |

### Structural Checks (full)

| Check | Result | Evidence / Notes |
| --- | --- | --- |
| Data-flow spine inventory and preservation | Pass with findings | DS-1, DS-2, DS-5 and DS-8 hold end to end for every kind. DS-11 has no peer branch (CR-461-027) |
| Ownership boundary preservation and clarity | **Fail** | CR-461-022 (two child-read mechanisms), CR-461-024 (three owners of a run's agents) |
| Off-spine concern clarity; capability reuse | Pass | — |
| Shared-structure tightness; one owner per fact (Principle 11) | **Fail** | CR-461-024, CR-461-025 |
| Repeated coordination ownership (Principle 13) | **Fail** | CR-461-025 (row placement twice) |
| Empty indirection check | Pass | The new owners decide or combine: `childRunIdentity`, `RunViewChildren.listed`, `agentReads` |
| Dependency direction (Principle 9) | Pass | No dependency points back against the spine without a notification or the composition root |
| Visible dependencies (Principle 16) | **Fail** | CR-461-023 (required collaborators optional for tests). Earlier rulings hold: the setProcess slots, set before anything is served and throwing when unset, and the notification listener |
| Interface clarity (Principle 10) | Pass | `runCollaborationStatuses(runs: [{ kind, runId }])` has an explicit compound identity |
| Naming (Principle 15) | Pass (FU-006, FU-010, FU-019) | — |
| Dead code in touched files (Principle 7); clean cut (Principle 8) | **Fail** | CR-461-026 |
| No test-only production code (`DESIGN.md` 11) | **Fail** | CR-461-023; `getTeamRunService` (CR-461-026) |
| Contain bad data with a logged warning (`DESIGN.md` 7) | **Fail** | C8-03 (in CR-461-023) |
| Persisted-data transition (Principle 5) | Pass | The migration is unchanged since round 1; API-E03 passed on built servers |
| File size | Pass | No changed source file is over 500 effective lines |
| Tests | Pass | One test per fix through the real trigger. Stale E2E rewrites go to API/E2E first (autobyteus-agents-107) |

### Scorecard (round 8, full)

| Priority | Category | Score | Why / What Is Weak |
| --- | --- | --- | --- |
| 1 | Data-Flow Spine Inventory and Clarity | 9.2 | The spines hold; DS-11 lacks peers (CR-461-027) |
| 2 | Ownership Clarity and Boundary Encapsulation | 9.0 | CR-461-022, CR-461-024 |
| 3 | API / Interface / Query / Command Clarity | 9.2 | A dead public field (CR-461-026) |
| 4 | Separation of Concerns and File Placement | 9.3 | — |
| 5 | Shared-Structure / Data-Model Tightness | 9.0 | One fact derived three times; rows built twice (CR-461-024, -025) |
| 6 | Naming Quality and Local Readability | 9.2 | FU-019 |
| 7 | API/E2E Readiness | 9.1 | Probes still query the removed poll (API/E2E's list); C8-09 held |
| 8 | Runtime Correctness And Behavioral Fidelity | 9.1 | Peer children: Team tab error (CR-461-022), not listed (CR-461-027) |
| 9 | No Backward-Compatibility / No Legacy Retention | 9.3 | — |
| 10 | Cleanup Completeness | 8.9 | CR-461-023, CR-461-026 |

Overall 9.1. Below 9.2: Ownership, Shared-Structure, API/E2E Readiness, Runtime, Cleanup.

### Findings (round 8, open)

#### CR-461-022 (new): the agent-run view reads a child through a second mechanism, and a peer child's Team tab fails

- **Concrete problem:** in the agent-run view, a peer child's messages are requested from this node, where that run does not exist. The view also decides "child or own" in its own code, while the team and org views use the read-subject owner.
- **Protects:** Principles 3, 11 and 13 (one owner per rule); SCN-013.
- **Evidence:** C8-01.
- **Required action:**
  - Give the agent-run view its owner in `agentReads.ts`, as the team and org views have:
    - a local child is read by its own identity (`run`, or `teamMember` of its own team run);
    - a peer child is read through the host, as today.
  - Make that view's stored-state, browse and messages reads consume the owner.
  - The server's `StandaloneRootMemberViewProjectionService` / `DelegatedChildLocations` then answers the host's peer children only, as the team-member reads do since CR-461-014; remove what becomes unused.
  - Add a spec for a peer child's Team tab.
- **Classification:** `Local Fix`, implementation (web, server).

#### CR-461-023 (new): required collaborators are optional for tests, and unreadable data is dropped without a warning

- **Concrete problem:** C8-02 and C8-03.
- **Protects:** `DESIGN.md` rules 7 and 11; Principles 13 and 16.
- **Required action:**
  - Make `DelegationTree`'s reader and `TaskDelegation`'s `tree().runOfAgent`, `deliverToRun`, `recordCollaborating` and `channel` required, and `CrossRunMessageDelivery`'s `senderAddress`. Tests pass fakes through their helpers.
  - Where one run's data cannot be read, keep leaving it out, and log a warning naming the run and the reason (`DelegationTree.agentsOf`, `DelegatedRunAgentsReader`, `remote-run-view-provider.ts:67`).
- **Classification:** `Local Fix`, implementation (server).

#### CR-461-024 (new): a run's agents have three owners

- **Concrete problem:** C8-04. One fact is read three ways, with two different answers, and a file is read per cross-run message.
- **Protects:** Principle 11; design line 72 and contract §4.
- **Required action:**
  - `DelegatedRunAgentsReader` and `CrossRunAddressResolution` read a run's agents from `DelegationTree.agentsOf`, the one owner and cache; give the tree what they need, for example the address-to-run map.
  - Remove the extra `RunOwnAgentsReader` instances and the second fallback (`"/"`) and third fallback (`childRunIdentity`).
  - Tests: one answer for an agent run with no stored address; a cross-run message reads no file once the run is cached.
- **Classification:** `Local Fix`, implementation (server).

#### CR-461-025 (new): the web builds a delegator's child rows twice

- **Concrete problem:** C8-05. The open view and the list place, name and badge children in separate code. SR-056 promised they agree by construction.
- **Protects:** Principles 11 and 13; SCN-015.
- **Required action:**
  - One row builder per view kind (agent, team, org) that takes the children's identities (the view's child DTO and the poll's identity share the identity part, SR-056) with their statuses, and is used both by the open view's rows and by the listed rows.
  - Placement (which member a child follows, the lifting of task agents), names, "started by" and statuses are decided there once.
  - A spec per kind: the same children give the same rows whether the run is open or listed.
- **Classification:** `Local Fix`, implementation (web).

#### CR-461-026 (new): dead code this change made or left in touched files

- **Concrete problem:** C8-06.
- **Protects:** Principles 7 and 8; `DESIGN.md` rule 11; the CR-461-008 / -014 ruling.
- **Required action:**
  - Remove the public `hasCollaboration` field and its web queries, types, projections and equality check. The server's internal index flag stays. Regenerate the web types.
  - Remove `getTeamRunService` and its special case in `application-framework-boundaries.test.ts`, and the test that asserts it.
  - Remove `TaskExecutionReferenceDto`, `ChildRunAgentStatusDto`, `standaloneNavigationTarget`, `GetTeamMemberRunProjectionQueryData` and `GetTeamRunResumeConfigQueryData`.
  - Correct `docs/workspace_layout.md:27` to the current poll.
  - Withdraw FU-017.
- **Classification:** `Local Fix`, implementation.

#### CR-461-027 (new): peer children of a listed run that is not open are not shown

- **Concrete problem:** C8-07. Delegated work on a peer node cannot be reached from the run list until the delegator is opened.
- **Protects:** REQ-002; REQ-009 (autobyteus-278's peer rows).
- **Evidence:** the implementer's Known Risk 2 (IR-008); SR-055 (the poll carries local children); `RunViewChildren.listed` filters `nodeId === undefined` (`run-view-children.ts:52`).
- **Required action, for the Solution Designer:** decide the source of a listed run's peer rows. One option is the tree's peer members (`DelegationTree.peerChildrenOf`, identities only, with no network call per poll), with statuses from the existing remote observation.
- **Classification:** `Design Impact`, Solution Designer.

### Follow-ups (round 8)

- FU-017 is reclassified into CR-461-026 and should be withdrawn.
- New: FU-018 (two older owners decide behavior by an optional collaborator) and FU-019 (web hosting-era names, folded into FU-010).
- FU-006, FU-007, FU-010, FU-011, FU-013 and FU-016 stand.

### On The Design Principles Themselves

Applying the current principles to the whole change:
- **They held up.** "Spine first" and Principle 11's "each fact is derived by one owner" found the structural findings: CR-461-024 and CR-461-025.
- **Purpose and judgment kept the review proportionate.** No finding rests on wording alone: C8-08, C8-10 and C8-12 were rejected for that reason.

Two places where they could be sharper:
1. **Principle 16's Signals** name `?.` on a looked-up owner, but not a constructor or dependency member that is optional (`dep?`, `Partial<Pick<…>>`, `= () => null`) while production always supplies it. The rule ("a missing collaborator fails loudly") covers it, and `DESIGN.md` rule 11 does too, but the Signal would make it easier to find. CR-461-023 is that case.
2. **An aggregate shown in several places** (a delegator with its children: open view, list, inspection, phone) needs one owner of its read model. Principle 11 covers it in general; a one-line example under "Each fact is derived by one owner", "one picture shown in several places is built by one builder", would have caught F-3, F-10 and CR-461-025 at design time.

I'll raise both with the Project Task Manager only if the user asks.

### Round 8 Classification And Routing

- CR-461-022, -023, -024, -025, -026: `Local Fix`, implementation.
- CR-461-027: `Design Impact`, Solution Designer.
- Mixed result: the Design Impact governs, so I route to `/software_engineering_team/solution_designer`, which carries the five Local Fixes. They do not depend on CR-461-027, so the designer can release them at once.
- Next: source review (targeted, CR-461-022 … -027), then API/E2E. API/E2E's next round puts the stale-test and probe rewrites first.

---

## API/E2E Failure-Origin Review of API-REV-002 (CRR-012)

### Review Meta

- Review Entry Point: `API/E2E Failure-Origin Review`
- Current Code Review Revision ID: `CRR-012`
- Trigger: API/E2E round 2 (API-REV-002), `Fail`.
  - Failures: F-6 … F-10.
  - Code under test: `9f4709571b`; evidence `d7f8b02773`.
  - F-1 … F-5 and O-1 are confirmed resolved: O-1 shows the stopped root as stopped on desktop and phone.
- Scope: F-6 … F-10 only.
- Classification: task_size `Large`, architectural_risk `High`, unchanged.
- Authorities:
  - `target-collaboration-contract.md` §2 lines 412-416 (SR-054);
  - `requirements-doc.md` REQ-002 ("shown under the run that delegated it … in the desktop and phone layouts") and AC-007;
  - `design-spec.md` DS-2, DS-8 (lines 169-201, 241-250) and DS-11;
  - the updated `ticket-scope.md` (autobyteus-agents-107: stale tests are this ticket's work).
- How each cause was established: F-6, F-7, F-9 and F-10 by `Read`. F-8 was reproduced by API/E2E (3 of 4 runs) and narrowed by `Read`; I ran nothing.

### Failure Classification

| Failure | Scenario Basis | Origin | Evidence | Classification | Owner |
| --- | --- | --- | --- | --- | --- |
| F-6 → **CR-461-017** | Contract §2 line 415 (SR-054): by run ID on this node returns `"Message delivered."` (REQ-009, today's text) | Implementation defect, and my review gap. The cross-run path, new in this ticket, writes its own text: `cross-run-message-delivery.ts:103` `` `Delivered message to ${input.shownAs ?? input.targetAgentRunId}.` ``. Without an address (`shownAs` unset) that gives `"Delivered message to <run ID>."`. In CRR-008 I judged F-4 a contract-only difference after checking the same-root path; I did not trace this new cross-run path | `API-E02-r2-contract-stories-5.1.txt` (S4, S7, S9) | `Local Fix` | Implementation (server) |
| F-7 → **CR-461-018** | Contract §5.3 O6 (B-5) and O7 (B-4) (SR-054, ARCH-REV-029): a member of the org's dev-team copy messages the org's agents by its handoff | Implementation defect (established by `Read`), and my review gap. When an org receives a message from another run, the post-durability presentation `AgentOrgRunMessageDelivery.presentCommittedCommunication` (`agent-org-run-message-delivery.ts:182`) still calls `index.requireAgent(message.senderAgentRunId)` for every sender that is not a peer link. The base had the same line; it held only because hosted copies were in the org's index. A delegated run is not, so `requireAgent` throws (`agent-org-execution-index.ts:64-66`). That happens inside `finalizeAfterDurability` (`agent-org-run-persistence-coordinator.ts:94-110, 139-150`): the org's log is already written, then the org fail-stops (`enterFailStop`, `agent-org-run.ts:385-392`: admission closed, terminate queued). This matches every observation: the org's log matches the contract, the Teacher starts on O7 (O7 restores the org and reserves the Teacher's input), and the sender's log stays empty. The team root's presentation does not require the sender (`team-communication-port.ts:63-72`); S3 to an agent run passes. Not reproduced: exactly where the sender then waits instead of receiving an error. The fix's test settles it. In my reviews I traced DS-2's route and the engine, not the org receiver's presentation (Principle 1: each kind) | `API-E02-r2-O6-diagnostic.txt`, `API-E02-r2-contract-stories-5.3.txt` | `Local Fix` | Implementation (server) |
| F-8 → **CR-461-019** | AC-007, SR-048: in a stopped team's view, the user selects the delegated worker's row and sends; the worker gets it | Implementation defect (web), timing-dependent, reproduced by API/E2E in 3 of 4 runs. The composer is emptied, no frame is sent, and no user bubble or error bubble appears (`API-B01-r2-SDV-02-message-lost.png`). The probe records console errors (`stopped-delegator-views-probe.mjs:233-234`) and none was recorded. So `AgentUserInputTextArea.handleSend`'s catch (`:288-310`) did not run, and the store action `sendMessageToFocusedMember` (`agentTeamRunStore.ts:264-347`; every exit either posts, adds a local submission, or throws) was not reached with the text. The text is lost before the store: either the composer had no `target` (`activeContextStore.ts:104-106` returns null while the focused context is missing), or the selected child's context was replaced by its stored-state hydration after the user typed. Both are on this ticket's child-selection path | `API-B01-r2-SDV-1/3/4-evidence.txt` (`"sentMessages": []`, `"pageErrors": []`), `-2-` (pass) | `Local Fix` | Implementation (web) |
| F-9 → **CR-461-020** | AC-007; design line 157 (a child row is the child's own); CR-461-015 (one read owner per view) | Implementation defect (web), and my review gap. The Team tab's participant messages are one more read of the focused agent that bypasses the read-subject owner: `activeContextStore.ts:111` `collaborationMessages: teamCollaborationMessagesView(team)` asks the team run for the worker's messages and is refused. The org's equivalent is `agentOrgExecutionContext.ts:140` (`this.messagesView(agent.address, agent.agentRunId)`). In round 6 I accepted "seven sites" without checking the messages view | `API-B01-r2-SDV-02-message-lost.png` (right panel) | `Local Fix` | Implementation (web) |
| F-10 → **CR-461-021** | REQ-002: "A delegated run, whoever delegated it, is shown under the run that delegated it … in the desktop and phone layouts"; DS-11: "a child row of that run while an entry is open" | **Design gap.** The design gives listed runs that are not open one source of child rows: the history poll `agentRunCollaborationStatuses(runIds)` (lines 241-250), which serves standalone agent runs only (`agent-run-collaboration.ts:63-90`). A team's or org's rows in a list come from its own stored members (`mobileRunTreeProjection.ts` `teamRowsOf` → `entry.team.executionRows`, unchanged by this ticket); child rows are built only for an open team (`runHistoryNavigationProjection.ts:202`, from the open context). The base listed them because copies were hosted in the team's or org's own tree. Removing hosting took that source away, and the design names no replacement for team and org delegators. The desktop list of a team or org that is not open probably has the same gap (not tested). This was my review gap too: I checked the poll for standalone runs and did not check REQ-002's "whoever delegated it" for team and org lists | `API-B01-r2-phone-MSP-37-39-evidence.txt`, `API-B01-r2-phone-MSP-38-worker-row-missing.png` | `Design Impact` | Solution Designer |

### Required Actions

1. **CR-461-017.** Return `"Message delivered."` when the message was sent by run ID (no `shownAs`). Prefer the existing default in `send-message-to-tool-result-contract.ts` over a third literal. Add a test for a run-ID message to another run on this node.
2. **CR-461-018.**
   - When an org receives a message from another run, present it without requiring the sender to be one of the org's agents: the sender's identity and display name come with the message, as the team and standalone presentations already do.
   - Add a server test: a delegated run's agent messages an org agent, by address and by run ID. The tool must return delivered, the sender's log must record the message, and the org must stay up.
   - If the test shows the sender still waiting on an error, fix that propagation too; a delivery failure must return a result, not hang.
3. **CR-461-019.**
   - Write a deterministic web spec first: select a stopped team's child row, type before the child's stored state commits, then send. It must fail before the fix.
   - Then fix it so the message goes to the child, or the composer keeps the text with a visible failure. A message must never vanish.
   - Check the org view's child rows for the same timing.
4. **CR-461-020.**
   - Route the Team tab's and the org's participant-messages read through the view's read-subject owner (`agentReads.ts`). A child shows its own messages, read by its own identity; if no such read exists, show none without an error.
   - Add one spec per view kind.
5. **CR-461-021, for the Solution Designer.** Name the source of child rows for a team and an org that are listed but not open, on desktop and phone, as REQ-002 and DS-11 require. One option is to extend the listed-runs poll to every delegating kind.

### Classification And Routing

- CR-461-017, -018, -019, -020: `Local Fix`, implementation.
- CR-461-021: `Design Impact`, Solution Designer.
- Mixed result: the Design Impact governs, so I route to `/software_engineering_team/solution_designer`, which carries the four Local Fixes. They do not depend on CR-461-021, so the designer can release them at once.
- After the fixes: source review, then API/E2E. API/E2E's next round puts the stale-test rewrites first (autobyteus-agents-107).

### Affected Score Rationale

- Runtime Correctness: 9.4 → 8.7. A message from a delegated run fail-stops its org, and a message can be lost silently.
- Data-Flow Spine: 9.4 → 9.0. DS-2's org receiver was not carried through, and DS-11 has no team or org child source.
- Ownership: 9.5 → 9.3. One more read bypasses the read owner (CR-461-020).
- Other categories are unchanged.

---

## Round 7: Implementation Review of IR-007 (CRR-011)

### Review Meta

- Review Entry Point: `Implementation Review`
- Current Code Review Revision ID: `CRR-011`; Current Review Round: `7`
- Review Scope: `Targeted Delta Review`. `d3c57a8569..9f4709571b` changes one function, `orgAgentReadSubject`, and its spec. No server change. Round 5's full-audit evidence and round 6's delta evidence carry forward.
- Trigger: IR-007 from the Implementation Engineer (`9f4709571b`; evidence `f75cf6b96b`).
- Classification: task_size `Large`, architectural_risk `High`, unchanged.
- Checks: IMP-32 (web type gate at baseline 93, localization guards, 5636 specs passed). Nothing rerun.

### Prior Findings Rechecked

**CR-461-016 (a silent fallback in the org read owner): Resolved.**
- An agent that is neither indexed nor remote now throws `AgentRun '<id>' is not an agent of AgentOrg run '<org>'.`
- A team child's member uses `agent.address`, the address the index stores as sent. The redundant lookup is gone.
- The remaining `agent?.address ?? remote?.address` chooses between the view's two legitimate kinds (local or remote), not a fallback, and anything else throws.
- All three callers pass an indexed agent.
- Tests: the exact subject for a team child's member, and a test that an unknown agent throws.

### Scorecard (round 7)

As round 6, except:
- Cleanup: 9.1 → 9.4.
- Runtime Correctness: 9.3 → 9.4.

| Priority | Category | Score |
| --- | --- | --- |
| 1 | Data-Flow Spine Inventory and Clarity | 9.4 |
| 2 | Ownership Clarity and Boundary Encapsulation | 9.5 |
| 3 | API / Interface / Query / Command Clarity | 9.4 |
| 4 | Separation of Concerns and File Placement | 9.3 |
| 5 | Shared-Structure / Data-Model Tightness | 9.3 |
| 6 | Naming Quality and Local Readability | 9.2 |
| 7 | API/E2E Readiness | 9.2 |
| 8 | Runtime Correctness And Behavioral Fidelity | 9.4 |
| 9 | No Backward-Compatibility / No Legacy Retention | 9.4 |
| 10 | Cleanup Completeness | 9.4 |

Overall 9.4. Every category is at 9.2 or above.

### Findings (round 7)

None open.

### For API/E2E (cumulative)

1. **The contract stories (API-E02).** Rerun them against the walkthrough regenerated by SR-054: §5.1 S17 by description and S25's refusal, §5.2's three delivery texts, and §5.3 O5–O7 through the org's in-run mounted team.
2. **The stopped-delegator views (API-B01).** Rerun SDV-02 (team) and SDV-03 (org), and the phone layout.
3. **O-1, held since CRR-008.** In the rendered run list, does a stopped delegator show as running while its view is open or a child command has loaded its root? If it does, AC-007 fails and the finding belongs to this ticket.
4. **The server E2E suites to update:**
   - the restore path: 33 files, including `tests/fixtures/codex-native-multi-agent-system.mjs` (CR-461-008);
   - reads of a delegated child through `getTeamMemberRunProjection`: about 15 suites. Read the child by its own identity (CR-461-014);
   - the removed events and the hosting assumptions (API-E01 triage).
5. **The deferred cases:** API-E01, API-I01, API-B03, API-L01 and API-F01.

### Round 7 Classification And Routing

- Result: `Pass`.
- Recipient: `/software_engineering_team/api_e2e_engineer`. The Implementation Engineer is informed.

---

## Round 6: Implementation Review of IR-006 (CRR-010)

### Review Meta

- Review Entry Point: `Implementation Review`
- Current Code Review Revision ID: `CRR-010`; Current Review Round: `6`
- Review Scope: `Targeted Delta Review`.
  - The delta `2721259169..d3c57a8569` (12 files) stays within the two findings' files.
  - Server: the team-member projection service and its test.
  - Web: the seven read sites, and `agentReads.ts`, which replaces `delegatedChildReads.ts`.
  - No spine, contract or shared server interface changes. Round 5's full-audit evidence carries forward for everything else.
- Trigger: IR-006 from the Implementation Engineer (`504ff32691`, `d3c57a8569`; evidence `76e864ec60`).
- Authorities: the updated skill (autobyteus-agents-102):
  - Principle 13's empty indirection check;
  - Example 10;
  - the ticket-scope row;
  - the template row.
- Classification: task_size `Large`, architectural_risk `High`, unchanged.
- Checks:
  - IMP-30 (web): type gate at baseline 93, 5635 specs passed.
  - IMP-31 (server): type gate at baseline 1014, unit suite 7898 passed, integration suite 483 passed.
  - Nothing rerun.

### Prior Findings Rechecked

**CR-461-014: Resolved.**
- `delegatedChildRun` is removed with its two uses. The service takes only `Pick<DelegationTree, "peerChildrenOf">`.
- `runOfAgent` and `runReferenceOf` keep their production callers (`cross-run-message-delivery.ts`, `delegated-run-commands.ts`, `cross-run-address-resolution.ts`), so nothing is left dead.
- The new test shows that the projection, trace and file reads all refuse a delegated run.
- FU-015 is withdrawn. The E2E suites' reads go to API/E2E.

**CR-461-015: Resolved, except for one fallback in the new owner (CR-461-016).**
- `agentReads.ts` owns the decision: `teamAgentReadSubject` and `orgAgentReadSubject` decide the subject, and `readsOf(subject)` gives the reads.
- All seven sites consume these owners, and none branches on child versus member. The store's and the monitor's browse subjects come from the same owner.
- `inOwnTeam` is gone.
- `agentReads.spec.ts` covers every kind for both owners and `readsOf` for each subject.

### Candidate Gate (round 6)

| Candidate ID | Observation | Basis | Disposition | Scope | Reason |
| --- | --- | --- | --- | --- | --- |
| C6-01 | `orgAgentReadSubject` (`agentReads.ts:55`): `agent?.address ?? index.remoteAgents.get(agentRunId)?.address ?? ''`. An agent the view does not index becomes an `agentOrgMember` read with the address `''` | Principles 13 and 16, "what stays firm": no behavior decided by a missing owner or a silent fallback | Promote | This ticket | Every caller passes an agent from the index (local or remote), so the `''` branch serves no supported path. If it were ever reached, it would send a read the server refuses with a misleading "not found" instead of failing at the cause. The firm rule asks for a loud failure, and this code is new in the round that made it the one owner. CR-461-016 |
| C6-02 | `orgAgentReadSubject` (`:52-53`): for a `task_team_member`, it finds the member in its host team and uses `member?.address ?? agent.address` | Principle 7 (no dead or defensive code); Principle 13 | Promote (folded into CR-461-016) | This ticket | The index stores each member with `execution.address` as sent (`agentOrgExecutionViewIndex.ts:154-155`), so `agent.address` already is the member's address. The lookup and its fallback change nothing |
| C6-03 | `AgentTeamEventMonitor.vue`: the branch with no active team returns a `teamMember` subject with `teamRunId: ''` | Principle 16 | Reject | — | The same shape was there before (`?? ''`). The comment states the monitor renders only with an active team, and the computed type needs a value. Pre-existing and unreachable |
| C6-04 | Empty indirection check on the delta (`agentReads.ts` owners, `readsOf`) | Principle 13 (updated) | Reject | — | Not empty. The owners decide the subject (policy), and `readsOf` combines three read kinds for seven consumers |

### Scorecard (round 6)

Unchanged from round 5 except:
- Ownership: 9.1 → 9.5.
- API / Interface: 9.2 → 9.4.
- Shared-Structure: 9.2 → 9.3.
- No Legacy: 9.1 → 9.4.
- Cleanup: 9.0 → 9.1 (CR-461-016).
- Runtime Correctness: 9.4 → 9.3 (CR-461-016).

Overall 9.4. Below 9.2: Cleanup (9.1).

### Findings (round 6, open)

#### CR-461-016 (new): a silent fallback in the org read owner

- **Concrete problem:** the new single owner of org reads turns an agent the view does not know into a read with an empty address. That is a silent fallback, and the firm rules call for a loud failure. Next to it, a member lookup with a fallback changes nothing.
- **Protects:** Principles 13 and 16 ("what stays firm"); Principle 7.
- **Evidence:**
  - the `''` fallback: `agentReads.ts:55`;
  - the redundant lookup: `agentReads.ts:52-53`;
  - the org index keeps member addresses as sent: `agentOrgExecutionViewIndex.ts:154-155`.
- **Required action:**
  - For a `task_team_member`, use `agent.address` directly.
  - For an agent neither in `index.agents` nor in `index.remoteAgents`, throw a clear error naming the agent and the org run.
  - Add one assertion to `agentReads.spec.ts`: an unknown agent throws.
- **Classification:** `Local Fix`, implementation.

### Round 6 Classification And Routing

- CR-461-016: `Local Fix`, implementation.
- Recipient: `/software_engineering_team/implementation_engineer`.
- Next: a targeted re-review of CR-461-016, then API/E2E.

---

## Round 5: Implementation Review of IR-005 (CRR-009)

### Review Meta

- Review Entry Point: `Implementation Review`
- Current Code Review Revision ID: `CRR-009`; Current Review Round: `5`
- Review Scope: `Full Re-Audit`.
  - The delta `c61cfaa78d..d188941869` (28 files) changes shared interfaces: `compileTeam`'s mode, `CreateTeamRunInput.handoffs`, and the org projector's now-required inputs. It also spreads beyond the three findings' files, into seven web read sites.
  - I read the delta in full and reran every structural check and the scorecard. Round 3's evidence is reused for files the delta does not touch.
- Trigger: IR-005 from the Implementation Engineer, answering CRR-008. The commits are `d82ef48509`, `341173b50e`, `4209ea3989`, `d188941869` and `2721259169`.
- Basis: SR-054 and ARCH-REV-029 (Pass), which correct the contract to today's results and give the org story its real path to an outside handoff. The design's compiler row (line 532) is revised.
- Classification: task_size `Large`, architectural_risk `High`, unchanged.
- Checks: IMP-27 … IMP-29.
  - Server type gate at baseline 1014; unit suite 7897 passed.
  - Web type gate at baseline 93; spec suite 5632 passed.
  - Server integration suite 483 passed.
  - Nothing rerun.

### Prior Findings Rechecked

| Finding | Status | Evidence |
| --- | --- | --- |
| CR-461-009 (a delegated team's outside handoff) | **Resolved** | See below |
| CR-461-010 (a team view's child row read as a member) | **Resolved (behavior)** | See below. The structure is CR-461-015 |
| CR-461-011 (an org inspection without child statuses) | **Resolved** | See below |
| CR-461-012 (delivered-message text), CR-461-013 (saved Task to a peer) | **Resolved upstream** | SR-054 corrects the contract to today's texts and to the peer refusal; ARCH-REV-029 passes. The code is unchanged, as intended |

**CR-461-009: how it was resolved.**
- `compileTeam(team, { kind: "own_team" | "delegated_team", handoffs? })`. In the delegated mode, a `to` that is not a member is kept as written (`resolveTeamTarget`). `from` must still be a member. The self-target check skips an external target.
- `TeamRunService.createTeamRun` plans in the delegated mode exactly when `delegatedFrom` is given. It refuses `handoffs` without `delegatedFrom`.
- `DelegatedRunStarter.startTeam` rebases the source's rules into the team's own space (`handoffsInTeamSpace`); an outside `to` is kept.
- A catalog copy (`collaborator-entry-builder.ts:134`) uses the delegated mode.
- A user-started team and `flat-team-definition-validator.ts` keep the `own_team` default.
- Tests: `delegated-team-outside-handoff.test.ts` and the starter's rebase test.

**CR-461-010: how it was resolved.**
- `delegatedChildReads.ts` gives a child's own read subject. Every read of a focused agent in the team and org views uses it: the member loaders, the focused agent at open, and the browse subjects.
- The composer then targets the child on the view's stream.
- Test: `teamDelegatedChildSelection.spec.ts`. It enters through `selectTreeRun` and asserts SEND_MESSAGE to the child with the team still stopped; it fails before the fix.
- Departure 4, keeping `onSelectTeamMember` / `selectTreeRun`: **Pass, deviation recorded, reason holds.** The action focuses an agent in the mounted view, and the reads underneath were what was wrong. A second action would duplicate focus and recovery.

**CR-461-011: how it was resolved.**
- `getInspection` passes `childStatuses: await children.statuses(run)`.
- The projector's `delegated` and `childStatuses` inputs are now required, so no read can leave them out. The stored-mode session passes `[]` explicitly.
- Test: `agent-org-inspection-child-statuses.test.ts`.

### Candidate Gate (round 5)

| Candidate ID | Observation | Basis | Disposition | Scope | Reason |
| --- | --- | --- | --- | --- | --- |
| C5-01 | `TeamMemberRunViewProjectionService.delegatedChildRun` (`team-member-run-view-projection-service.ts:71, 99, 114`) lets the team-member queries answer a delegated child of the team (projection, trace page). This ticket added it (absent in base `827f1e68dc`). Since CR-461-010, no product client calls it; only server E2E suites do (FU-015) | Principle 7 (dead code this change leaves); Principle 8 (one clean path); `DESIGN.md` rules 9 and 11 (no test-only production code) | Promote | This ticket (FU-015 reclassified) | This ticket's own code, left without a product caller by this ticket. It also keeps a second read path for a child that half works: projection and trace yes, files no (FU-015's own text). The ruling is the one used for CR-461-008: remove, and API/E2E updates the suites. CR-461-014 |
| C5-02 | The rule "a delegated child is read by its own identity, else as a member of this view" is decided separately at seven read sites, each with `child ? childReads : memberReads`: `teamMemberProjectionHydrationService.ts:33`, `teamRunContextHydrationService.ts:124`, `AgentTeamEventMonitor.vue:59`, `activeContextStore.ts:113`, `agentOrgContextHydration.ts:164` and `:210`, `agentOrgExecutionContext.ts:142`. The team's browse subject is computed twice (store and monitor) | Repeated coordination ownership; Principle 1 (one owner per rule) | Promote | This ticket | The concrete problem is F-2's failure mode: a read site that does not apply the rule reads a child as a member and is refused. The rule has no owner, so the next read site (a new browse or file read) has to remember it again, and the two team browse computations can drift. One owner per view kind removes that. CR-461-015 |
| C5-03 | `inOwnTeam` (`delegatedChildReads.ts:48-51`) strips the row's delegation address from a member address when present, else keeps it | Principle 6 (no defensive code for a shape no supported path produces) | Promote (folded into CR-461-015) | This ticket | The server sends a child team's members in the team's own space (`projectDelegatedTeamRun`, `collaboration-execution-tree-dto-projection.ts:70`; the team projector, `team-execution-view-projector.ts:164`); the org index keeps them as sent. The stripping branch serves an address shape nobody sends, and it silently accepts two shapes for one contract |
| C5-04 | In delegated mode, an outside `to` with one segment that equals a member's name resolves to that member | Contract §2.3 (own run first) | Reject | — | This is the contract's resolution order (TC-12: members are addressed at the team's root). The same address would resolve to the member when sent |
| C5-05 | `(input.resolveTarget ?? input.resolve)` in `compileList` | Principle 16 | Reject | — | An optional parameter with a stated default, not a lookup fallback |

### Structural Checks (round 5, full)

| Check | Result | Evidence / Notes |
| --- | --- | --- |
| Data-flow spine | Pass | DS-1 (a team copy carries its source's rules); DS-8 (team and org child rows go to the child) |
| Ownership boundary | Pass | Starter (rebase), service (mode), compiler (resolution) |
| Repeated coordination ownership | **Fail** | CR-461-015 |
| Empty indirection | Pass | — |
| Separation of concerns | Pass | — |
| Ownership-driven dependencies; Principle 16 | Pass | No new lookups; the projector's inputs are required |
| Interface clarity | Pass | `TeamHandoffCompilation` is explicit; `handoffs` only with `delegatedFrom`, enforced |
| Naming | Pass | `onSelectTeamMember` now also focuses a child row; this is departure 4, accepted |
| No unjustified duplication | Fail | CR-461-015 (the browse subject twice) |
| Dead code in touched files (Principle 7) | **Fail** | CR-461-014 |
| No test-only production code (`DESIGN.md` 11) | **Fail** | CR-461-014 |
| Tests | Pass | One test per fix, entering through the real trigger (`selectTreeRun`, `createTeamRun`, `getInspection`) |
| Source file size | Pass | No changed source file is over 500 effective lines |

### Scorecard (round 5, full)

| Priority | Category | Score | Why / What Is Weak |
| --- | --- | --- | --- |
| 1 | Data-Flow Spine Inventory and Clarity | 9.4 | DS-8's team and org branches reach the child |
| 2 | Ownership Clarity and Boundary Encapsulation | 9.1 | The child-read rule has no owner (CR-461-015) |
| 3 | API / Interface / Query / Command Clarity | 9.2 | The team-member queries still answer a non-member (CR-461-014) |
| 4 | Separation of Concerns and File Placement | 9.3 | — |
| 5 | Shared-Structure / Data-Model Tightness | 9.2 | `inOwnTeam` accepts two address shapes (CR-461-015) |
| 6 | Naming Quality and Local Readability | 9.2 | Departure 4 accepted |
| 7 | API/E2E Readiness | 9.2 | The E2E suites move to the child's own reads with CR-461-014 |
| 8 | Runtime Correctness And Behavioral Fidelity | 9.4 | F-1 … F-3 fixed and tested |
| 9 | No Backward-Compatibility / No Legacy Retention | 9.1 | A second read path kept for tests (CR-461-014) |
| 10 | Cleanup Completeness | 9.0 | CR-461-014 |

Overall 9.2. Below 9.2: Ownership (9.1), No Legacy (9.1), Cleanup (9.0).

### Findings (round 5, open)

#### CR-461-014 (new): the team-member queries' branch for a delegated child is left for tests only

- **Concrete problem:** this ticket's own code no longer has a product caller and survives for E2E suites. It is a second, partial read path for a child: projection and trace, but not files.
- **Protects:** Principle 7; Principle 8; `DESIGN.md` rules 9 and 11.
- **Evidence:** `team-member-run-view-projection-service.ts:63-111` (`delegatedChildRun`, which is absent in base); FU-015's own text. The web reads children only by their own identity (CR-461-010).
- **Required action:**
  - Remove `delegatedChildRun` and its two uses, so that the team-member queries answer only the team's own members, as the org's do.
  - Update the unit and integration tests that rely on it.
  - The server E2E suites that read a child through `getTeamMemberRunProjection` belong to API/E2E, as with CR-461-008.
  - Withdraw FU-015.
- **Classification:** `Local Fix`, implementation.

#### CR-461-015 (new): the child-read rule has no owner

- **Concrete problem:** seven read sites each decide "child or member", and the team's browse subject is computed twice. F-2 was this failure: a read site that does not apply the rule reads a child as a member.
- **Protects:** repeated coordination ownership; Principle 1.
- **Evidence:** C5-02 and C5-03.
- **Required action:**
  - Give each view kind one owner of "the read subject of agent X", answering a child's own subject or this view's member subject. For example, `teamAgentReadSubject(team, agentRunId)` beside the team view and `orgAgentReadSubject(context, agentRunId)` on the org context.
  - Have one function turn a subject into its reads (projection, file changes).
  - Make the seven sites, and the store and monitor browse subjects, consume them.
  - Drop `inOwnTeam`'s stripping branch. Member addresses arrive in the child team's own space; use them as sent.
  - Keep the existing tests green; add one owner-level test per view kind.
- **Classification:** `Local Fix`, implementation.

### Follow-ups (round 5)

- FU-015 is reclassified into CR-461-014 and should be withdrawn.
- No new follow-ups.

### Round 5 Classification And Routing

- CR-461-014, CR-461-015: `Local Fix`, implementation. No design impact: the design already says a child is read by its own identity (design line 157) and has one read path.
- Recipient: `/software_engineering_team/implementation_engineer`. Next is a targeted re-review of CR-461-014 and -015, then API/E2E.

---

## API/E2E Failure-Origin Review of API-REV-001 (CRR-008)

### Review Meta

- Review Entry Point: `API/E2E Failure-Origin Review`
- Current Code Review Revision ID: `CRR-008`
- Trigger: API/E2E round 1 (API-REV-001), `Fail`, from the API/E2E Engineer: F-1 … F-5 and observation O-1. Code under test `a54e78ccb7`; reports, evidence and tests `c61cfaa78d`.
- Scope: the five failures and O-1 only. No full re-audit, no general review of the test suite.
- Classification: task_size `Large`, architectural_risk `High`, unchanged.
- Authorities:
  - `requirements-doc.md` (REQ-009; line 76, "no change to what an agent reads … results and collaboration texts");
  - `target-collaboration-contract.md` (§2 line 413; §2.3; line 266; §5.1 S17; §5.3);
  - `design-spec.md` (DS-8 lines 154–201, 244; Change Scope line 532);
  - `TESTING.md`.

### Failure Classification

| Failure | Scenario Basis (independent) | Origin | Evidence | Classification | Owner |
| --- | --- | --- | --- | --- | --- |
| F-1 → **CR-461-009** | The contract §5.3 O5 / DL-3: the org's CEO delegates a Task to Study Group, whose handoff `to: "/Teacher"` names the org's agent. Contract line 266: "A team's handoff `to` outside the team … is kept as written … This applies to a delegated team only. A team the user started keeps today's check." Design Change Scope (line 532) and Validation (line 336) | Implementation defect, and an earlier review gap. The Change Scope row was never implemented: `collaboration-handoff-compiler.ts` is unchanged from base (`git diff 827f1e68dc` is empty). `compileTeam` → `resolveTeamEndpoint` (:97–113) still throws for any `to` outside the team. A delegation plans through it (`collaborator-entry-builder.ts:133`) | Observed refusal `Team-local endpoint '/Teacher' was not found.` (`API-E02-contract-stories-5.3.txt`). Only the stored-file reader and the migration keep the external `to` | `Local Fix` | Implementation (server) |
| F-2 → **CR-461-010** | SCN-005 / AC-007, REQ-002, REQ-004; design line 157: "a message … on a child row goes to the child's own root by its identity … This holds in the standalone, team and org views"; line 193 | Implementation defect (web), and an earlier review gap. A team view's delegated child row is still a `transient_execution` row of the team. It is selected through `onSelectTeamMember` → `runHistoryStore.selectTreeRun({ teamRunId, agentRunId })` (`RunDefinitionGroups.vue:410-419`, `RunListRow.vue:231-234` → `useWorkspaceHistorySelectionActions.ts:135-147`). That reads the agent as a member of the team, which a delegated run no longer is. The server refuses the read, so the focus stays on the coordinator, and the message goes to the Manager and restores the team. The server routes correctly: `agent-team-stream-handler.ts:112` tries `children.execute` first, and `:155` does not restore for a child | `API-B01-SDV-02-backend-excerpt.txt` line 1461 (`AgentRun 'worker_…' was not found in root TeamRun …`); `API-B01-SDV-run3-evidence.txt` SDV-02 `sentMessages[0].target` = the manager, `markerInWorkerRun: false` | `Local Fix` | Implementation (web) |
| F-3 → **CR-461-011** | SCN-005 / AC-007 (an org view with a delegated child); design line 244 (`statuses`: every agent of every local child row, from its own root when active, else `offline`); the contract rule `root-execution-view-dtos.ts:165-167`, which this ticket changed | Implementation defect (server), and an earlier review gap. `AgentOrgRunService.getInspection` (`agent-org-run-service.ts:229-233`) passes `delegated: await children.rows(run)` but not `childStatuses`. When the org is active, the contract then requires a status for each listed child agent and the parse fails. The view session calls the same projector with statuses (`org-view-session.ts:116`), and `RunViewChildren.statuses(run)` exists (`run-view-children.ts:50`) | `API-B01-SDV-03-run4-evidence.txt`: `AgentOrg AgentRun 'worker_sdvorg_4a11_…' has no status record.` | `Local Fix` | Implementation (server) |
| F-4 → **CR-461-012** | Contract §2 line 413 says every delivered message returns `"Delivered message to <address or run ID>."`. Requirements line 76 says "No change to what an agent reads: … results and collaboration texts". Today a same-root delivery returns `"Message delivered."` | Not a source defect. The path is unchanged from base (`global-agent-run-message-router.ts:65` → `send-message-to-tool-result-contract.ts:32`), and it keeps today's text as the requirements ask. The contract's rule states one text for every delivery, which is not today's behavior. Two approved documents disagree on what the agent reads | `API-E02-contract-stories-5.2.txt` U2 / IN-3 | `Requirement Gap` (correct the contract's rule, or approve a text change) | Solution Designer |
| F-5 → **CR-461-013** | Contract §5.1 S17 (DL-9, DL-10): a saved Task is delegated to a team on a peer node. REQ-009: "`delegate_task` … (described work and a saved Task) … with the same results and texts" as today. Today a saved Task to another node is refused | Not a source defect. The product keeps today's refusal (`remote-refusal-codes.ts:31`), as REQ-009 asks. The contract's story S17 (and S18 … S24 after it) contradicts that requirement | `API-E02-contract-stories-5.1.txt` | `Requirement Gap`. API/E2E proposed `Design Impact`, but the conflict is in intended behavior between two approved documents, not in the design's structure | Solution Designer |

### Observation O-1

| Candidate | Observation | Disposition | Reason |
| --- | --- | --- | --- |
| O-1 | In the standalone collaboration-status query, `isActive` means "the root object is loaded" (`roots.getActive(runId) !== null`, `agent-run-collaboration.ts`), not "the agent is running". An open view loads the root (`agent-collaboration-stream-handler.ts:93`), and so does a child command (`:175`) | Hold for Evidence (API/E2E) | The same lines are in base `827f1e68dc` (`readyRoot` at connect, `getActive` → `isActive`), so this ticket did not introduce it. No consequence is shown: whether the run list then shows the stopped delegator as running was not checked. If the rendered list shows a stopped delegator as running while a child works, AC-007 ("the delegator stays stopped") fails, and it belongs to this ticket. Otherwise it is not a finding. Not scored, not routed |

### Review Gaps (owned)

- **CR-461-009:** every round checked the Change Scope by its rows' owners, not row by row against the diff. Line 532 names `collaboration-handoff-compiler.ts:73`, and that file was untouched. This was detectable in source review.
- **CR-461-010:** in round 3, I traced SCN-005 through the server and the agent-run web client, and marked it met for every kind. I did not trace a team view's child-row selection, which was unchanged and still goes through the team-member path. This was detectable in source review.
- **CR-461-011:** the org inspection query calls the same projector as the view session but omits the child statuses that the view session passes. This was detectable in source review.
- **F-4 and F-5:** not detectable in source review; the code keeps today's behavior. The conflict is between the contract and the requirements.

### Affected Score Rationale (round 3/4 scorecard)

- Runtime Correctness And Behavioral Fidelity: 9.4 → 8.6. Selecting a team view's child row and the org inspection fail on a normal path of AC-007, and a delegated team with an outside handoff cannot be planned.
- Data-Flow Spine Inventory and Clarity: 9.5 → 9.0. DS-8's team branch, from a child row to the child, is broken in the web.
- SCN-005 was recorded as met in round 3. It is met for the agent-run view only (SDV-01 passes).
- All other categories are unchanged.

### Required Actions (implementation, CR-461-009 … -011)

1. **CR-461-009.**
   - Planning a **delegated** team must keep a handoff `to` outside the team as an external target, as contract line 266 and Change Scope line 532 say. Fix both places that plan a delegated team: the delegation (`collaborator-entry-builder.ts:133`) and the delegated team run's own planning, if it plans again from the definition.
   - A team the user starts keeps today's check, as does `flat-team-definition-validator.ts`.
   - If the definition-save path refuses a team definition with an outside `to`, so that no product path can create Study Group, raise that to the Solution Designer rather than widening the validator.
   - Add a test: an outside `to` is kept, `get_handoff_rules` names it, and a user-started team still refuses it.
2. **CR-461-010.**
   - In a team view (desktop list, history tree and the phone path in `useMobileRunOpening.ts:76`), a delegated child row (`transient_execution`) must be selected as the child, by its own identity, not through `onSelectTeamMember` / `selectTreeRun` of the team.
   - The composer must send with `target_agent_run_id` = the child, on the team's stream, so that the server's `children.execute` takes it and the stopped team stays stopped.
   - Check the org view's child rows for the same path.
   - Add a web test of selecting a child row and then sending.
3. **CR-461-011.**
   - `getInspection` must pass `childStatuses: await children.statuses(run)` (widen the `Pick` to include `statuses`).
   - Check the team and standalone inspection or snapshot queries for the same omission.
   - Add a test: an active org with a delegated child inspects without error and lists the child's status.

### Classification And Routing

- CR-461-009, -010, -011: `Local Fix`, implementation. None of them depends on CR-461-012 or -013.
- CR-461-012, -013: `Requirement Gap`, Solution Designer (the contract and the requirements disagree).
- O-1: held for API/E2E's next round.
- Mixed result: the Requirement Gaps govern, so I route to `/software_engineering_team/solution_designer`, which carries the three Local Fixes. The designer can release them to implementation at once.
- After the fixes: source review (targeted), then API/E2E again.

---

## Round 4: Implementation Review of IR-004 (CRR-007)

### Review Meta

- Review Entry Point: `Implementation Review`
- Current Code Review Revision ID: `CRR-007`; Current Review Round: `4`
- Review Scope: `Targeted Delta Review`. `e5e0884e45..bc223a8ae0` changes only the CR-461-008 files: the router, the two resolvers and their unit test, one composition line, the generated web types and one module doc. It removes code and touches no spine, shared shape or earlier fix. Round 3's full re-audit evidence carries forward for everything else.
- Trigger: IR-004 (`a54e78ccb7` fix, `bc223a8ae0` handoff and evidence IMP-26), from the Implementation Engineer.
- Classification: task_size `Large`, architectural_risk `High`, unchanged.
- Checks: IMP-26 (type gates at baseline, codegen without a diff, server unit suite 7890 passed). Nothing rerun: the diff is a pure removal, and the gates cover it.

### Prior Findings Rechecked

| Finding | Status | Evidence |
| --- | --- | --- |
| CR-461-008 (code this change replaced is left in place) | **Resolved** | (1) `GlobalAgentRunMessageRouter` no longer has a process slot or `getGlobalAgentRunMessageRouter`; step 8 builds the router inside the dispatcher (`collaboration-composition.ts:207-208`). (2) `restoreAgentTeamRun` (with `RestoreAgentTeamRunResult`) and `restoreAgentOrgRun` are removed, as are their unit test and the generated web types. The services' restore methods stay because they still have production callers: the root resolver, the member-message path (`team-run-service.ts:224, 228`) and the org stream handler (`agent-org-stream-handler.ts:124`). `docs/modules/agent_orgs.md` now describes restore by message. FU-014 is withdrawn |

### Candidate Gate (round 4)

| Candidate ID | Observation | Basis | Disposition | Scope | Reason |
| --- | --- | --- | --- | --- | --- |
| C4-01 | IMP-26 says no reference remains outside `tests/e2e`. One does: `tests/fixtures/codex-native-multi-agent-system.mjs:179` calls `restoreAgentTeamRun`. Its only user is the child process of `tests/e2e/runtime/codex-native-multi-agent-disabled.e2e.test.ts:72` | Test readiness | Reject (as a source finding) | This ticket, API/E2E | Test machinery for one E2E suite, of the same kind as the 32 E2E files the handoff already gives API/E2E. Added to API/E2E's work list below |

### Scorecard (round 4)

Unchanged from round 3 except:
- No Backward-Compatibility / No Legacy Retention: 9.1 → 9.4.
- Cleanup Completeness: 9.0 → 9.4.

Overall 9.4. Every category is at 9.2 or above.

### Findings (round 4)

None open.

### For API/E2E

- **Restore path in the E2E suites.** Add `tests/fixtures/codex-native-multi-agent-system.mjs` (used by `codex-native-multi-agent-disabled.e2e.test.ts`) to the handoff's list of 32 E2E files that restore with the removed mutations. They should all restore through the product path: a message to one of the run's own members on its view's stream.
- **Already on the handoff's list:**
  - Rewrite the E2E suites for the removed events.
  - Verify the rendered browser journeys.
  - Verify the agent-run view's reconnect after a WebSocket 1000 close (C3-06).
- **Migration.** It has only been verified with fixtures.

### Round 4 Classification And Routing

- Result: `Pass`.
- Recipient: `/software_engineering_team/api_e2e_engineer`. The Implementation Engineer is informed.

---

## Round 3: Implementation Review of IR-003 (CRR-006)

### Review Meta

- Review Entry Point: `Implementation Review`
- Current Code Review Revision ID: `CRR-006`; Current Review Round: `3`
- Review Scope: `Full Re-Audit`. The changes `85dc7572d7..e5e0884e45` (294 files):
  - rewire the composition (`collaboration-composition.ts`; seven bindings removed);
  - change every client's stream lifetime (SR-045);
  - add the stored and live view sessions (SR-046);
  - change the `delegate_task` path (SR-049);
  - change both stream contracts (CR-461-007).
- Trigger: IR-003, from the Implementation Engineer. It answers CRR-005 and the designer's SR-045 … SR-053 (ARCH-REV-020 … ARCH-REV-028 Pass).
- Authorities applied: the updated `design-principles.md` (its new "Applying These Principles: Purpose And Judgment" section and Principle 16 as revised), `design-examples.md` Examples 7, 9 and 10, `ticket-scope.md`, the updated template, and the project's `DESIGN.md` (rules 7, 9, 11).
- Rulings from earlier rounds are kept where no new evidence changes them. One is ARCH-REV-028's acceptance of the narrow `RunTaskRecords` port: it works and causes no problem, so it is not a finding, although Example 10 cites it as more structure than the case needed.
- Classification: task_size `Large`, architectural_risk `High`, unchanged and confirmed.
- Checks: IMP-18 … IMP-25 on the reviewed head; nothing rerun.

### Prior Findings Rechecked First

| Finding | Status | Evidence |
| --- | --- | --- |
| CR-461-001 (a delivery during a closure stop) | **Resolved** | Standalone: `StandaloneAgentRunRootManager` marks a run as stopping from the call on (`whileEnding`); `resolveRoot` waits (`untilEnded`) and finishes a root that is ending by itself, then loads it again, so there is one root per run. Team and org: `CollaborationRootResolver.resolveOrRestore` takes only an active root (`getActiveTeamRun` / `getActive`), else restores; `restoreTeamRun` runs in the root transition and calls `completeStoppingRoot` first. Tests: `closure-stop-during-delivery.test.ts` (agent) and `closure-stop-during-delivery-team.test.ts`, DONE(A) with B committed after the check: `delegated: true`, live in B with its work |
| CR-461-005 (dead exports) | **Resolved** | `getRuntimeMemberContexts` and `mergePricingSummariesForRecords` removed. A new, separate dead item from this round is CR-461-008 |
| CR-461-006 (the web keeps no stream for a stopped run) | **Resolved** (SR-045/046/048) | Web: the agent-run and org clients keep an open view's stream, active or stopped. Readiness is the stream's own (snapshot applied). A child command is `live` over the stream whatever the delegator's state, and a stopped org starts on its first own input over the same stream. Server: `TeamViewSession` and `OrgViewSession` serve a stopped run in stored mode (never restoring) and switch to live on registration with a fresh in-band snapshot, in the session's own order. A member's message restores the run, brings the view live, then posts (`agent-team-stream-handler.ts:139-149`). Tests: the team and org handler suites (stored connect, refusals that restore nothing, restore-then-live-then-post, live-to-stored), and the web send test (SR-048) |
| CR-461-007 (`userLaunchSelection`) | **Resolved** | Absent from both contracts (src and dist) and the web; FU-012 withdrawn |

### Supported Product Scenario And Reachability Gate (new and changed only)

| Scenario ID | Related Behavior / Contract IDs | Kind | Actor / Initiator | Coherent Goal Or Governing Event | Supported Entry Surface / Event | Scenario Shape | Forward Production Path / Lifecycle | Expected Outcome / Consequence | Independent Evidence | Scenario Validity | Review Use |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-005 (round 3) | REQ-004, AC-007 | User | The user | Watch and message delegated work under a stopped delegator | Open the stopped run's view; select a child row; send | Normal | The stream is kept; stored-mode snapshot; child commands go to the child's own root | Live child rows and output; the delegator stays stopped | Above | Supported Normal Scenario | Use (now met) |
| SCN-012 | SR-047, SR-049, SR-052; Principle 16; `DESIGN.md` rule 9 | Contract | — | Every owner wired in one composition root; no path the change replaced left in place | Server and application-host start | — | `composeTaskSide` (steps 1–2) → run services (3) → `composeCollaboration` (4–8) → listen | Owners passed in; every remaining lookup set before anything is served, throwing when unset | `build-studio-server.ts:329, 372`; `start-standalone-application-host.ts:243, 271, 308-309` | Engineering contract | Use |

### Candidate Gate (round 3)

| Candidate ID | Observation | Basis | Disposition | Scope | Reason |
| --- | --- | --- | --- | --- | --- |
| C3-01 | `GlobalAgentRunMessageRouter`'s process slot (`static instance`, `setProcessInstance`, `getInstance`) and `getGlobalAgentRunMessageRouter` are written at step 8 (`collaboration-composition.ts:207-208`) and never read: the dispatcher now receives the router directly | Principle 7 (dead code in a touched file) | Promote | This ticket | Dead, and misleading: step 8 suggests the router is still reached by lookup. CR-461-008 |
| C3-02 | `restoreAgentTeamRun` and `restoreAgentOrgRun` (GraphQL) have no caller since this round removed the web's (`agentTeamRunMutations.ts`, `agentOrgRunMutations.ts`). No other client in the repository uses them (`autobyteus-android`, `autobyteus-ios`, the SDKs, the message gateway), and `DESIGN.md` rule 9 makes the contracts between our own clients a clean cut | Principles 7, 8 (a path this change replaced: a message now restores the run over its view's stream) | Promote | This ticket (FU-014 reclassified) | Dead public surface that still restores a run outside the view rule. CR-461-008 |
| C3-03 | Remaining `get…()` / `setProcess…` slots for older services (run history, member views, the tool service, the dispatcher) | Principle 16's three conditions | Reject (as a finding) | — | All three hold: set at step 8 before either host listens; each getter throws when unset; no ownership loop. Readers are request-time handlers and call-time providers |
| C3-04 | `LocalChildFollowers` moved out of the roots; the roots publish `publishLocalChildEvent` (the handoff's recorded departure 1) | Principle 16 "Where it bends" (a notification listener wired in the composition root) | Reject (as a finding) | — | The reason holds: a real construction cycle (the roots ↔ the followers' ports); the emitter behaves the same with or without a listener |
| C3-05 | `model-routing-binding.ts:36` keeps `findModelRouting()?.… ?? Promise.resolve(null)` | Principle 16 | Reject | — | An older lookup in a file this ticket does not touch, with no problem shown in this change |
| C3-06 | The agent-run view's reconnect after a WebSocket 1000 close is unverified (handoff) | DS-8 | Hold for Evidence → API/E2E | — | Runtime behavior. API/E2E checks it with the rendered journeys |

### Structural Checks (full re-audit)

| Check | Result | Evidence / Notes |
| --- | --- | --- |
| Task design health assessment | Pass | — |
| Matches behavior-defining supplements | Pass | `walkthrough.py --check` green (handoff) |
| Data-flow spine inventory clarity and preservation | Pass | DS-1 and DS-3 now start at the tool service (SR-049). DS-5 is ordered against DS-6 and DS-1 (CR-461-001, -003). DS-8 reaches open views active or stopped (SR-045/046) |
| Ownership boundary preservation and clarity | Pass | A root answers only for its own run (`delegationSource`); the tool service orchestrates; the view session owns its mode and order |
| Off-spine concern clarity | Pass | — |
| Existing capability reuse | Pass | — |
| Reusable owned structures | Pass | — |
| Shared-structure tightness | Pass | CR-461-007 removed |
| Repeated coordination ownership | Pass | One composition used by both hosts (SR-052) |
| Empty indirection | Pass | — |
| Separation of concerns and file responsibility | Pass | — |
| Ownership-driven dependency check | Pass | Every dependency points to an earlier composition step (SR-053) |
| Authoritative Boundary Rule | Pass | — |
| Visible dependencies check (Principle 16) | Pass — deviation recorded, reason holds | The seven 461 bindings, `getChildRowsFeed` and the nine fallbacks are gone, and new owners are passed in. Recorded departures (handoff "Legacy / Compatibility"): (1) `LocalChildFollowers` behind a notification listener because of a real cycle; (2) older getters set by the composition root, throwing when unset, and read at call time. Both satisfy the three conditions (C3-03, C3-04). The dead router slot is CR-461-008, not a Principle 16 problem |
| File placement; flat vs. over-split | Pass | — |
| Interface/API boundary clarity | Pass (FU-013 stands) | — |
| Naming and vocabulary | Pass | FU-006, FU-007 and FU-010 still deferred |
| No unjustified duplication | Pass | — |
| Patch-on-patch complexity | Pass | — |
| Dead code removed in touched files (Principle 7) | Fail | CR-461-008 |
| Test scenarios requirement-aligned | Pass | New tests per fix and per mode; the base characterization of the application host (IMP-21/22) |
| Test fixtures and helpers | Pass | `tests/helpers/no-delegations.ts`, `studio-reads.ts`, `task-run-resources.ts` |
| No stale or compatibility-only tests | Pass | `agent-team-run.test.ts` keeps a test of the dead mutation; it goes with CR-461-008 |
| API/E2E readiness | Pass once CR-461-008 is fixed | The E2E rewrite for the removed events, the browser journeys and the 1000-close reconnect belong to API/E2E |

### Source File Size

No changed source file is over 500 effective lines. The largest are `build-studio-server.ts` (480 → 485), `agentTeamRunStore.ts` (478) and `agentOrgStreamingService.ts` (469).

### Legacy / Backward-Compatibility (round 3)

| Check | Result | Notes |
| --- | --- | --- |
| No compatibility mechanisms | Pass | — |
| No legacy retention | Fail (CR-461-008) | The two restore mutations remain for a path this change replaced |
| Dead code removed | Fail (CR-461-008) | — |
| Persisted-data transition | Pass | Unchanged since round 1 |

### Scorecard (round 3, full)

| Priority | Category | Score | Why / What Is Weak |
| --- | --- | --- | --- |
| 1 | Data-Flow Spine Inventory and Clarity | 9.5 | Every spine traced, ordered and reaching its outcome; DS-1 and DS-3 start at the tool path |
| 2 | Ownership Clarity and Boundary Encapsulation | 9.6 | Roots hold only their own run; one owner per sequence |
| 3 | API / Interface / Query / Command Clarity | 9.3 | FU-013 recorded |
| 4 | Separation of Concerns and File Placement | 9.4 | — |
| 5 | Shared-Structure / Data-Model Tightness | 9.4 | — |
| 6 | Naming Quality and Local Readability | 9.3 | Deferred renames (follow-ups) |
| 7 | API/E2E Readiness | 9.2 | Source ready; rendered journeys and E2E rewrite pending (API/E2E) |
| 8 | Runtime Correctness And Behavioral Fidelity | 9.4 | Races resolved; reconnect after a 1000 close unverified (C3-06) |
| 9 | No Backward-Compatibility / No Legacy Retention | 9.1 | The restore mutations of a replaced path (CR-461-008) |
| 10 | Cleanup Completeness | 9.0 | CR-461-008 |

Overall 9.3. Below 9.2: No Legacy (9.1), Cleanup (9.0), both from CR-461-008.

### Findings (round 3, open)

#### CR-461-008 (new): code this change replaced is left in place

- **Concrete problem:** dead code in touched files, and a public mutation that still restores a run outside the new view rule.
- **Protects:** Principle 7 (dead code in touched files; "paths that a change replaces"); Principle 8 (clean-cut replacement); `DESIGN.md` rule 9 (no compatibility between our own clients).
- **Evidence:**
  1. **The router's process slot.** `GlobalAgentRunMessageRouter`'s `static instance` / `setProcessInstance` / `getInstance` and `getGlobalAgentRunMessageRouter` (`global-agent-run-message-router.ts:46-58, 198-199`) are read by nothing: `getGlobalAgentRunMessageRouter` has no caller, and the dispatcher receives the router from the composition. Yet step 8 sets the slot (`collaboration-composition.ts:207-208`).
  2. **The two restore mutations.** `restoreAgentTeamRun` (`api/graphql/types/agent-team-run.ts:219-237`) and `restoreAgentOrgRun` (`api/graphql/types/agent-org-run.ts:222+`) lost their only callers in this round (the web's `RestoreAgentTeamRun` / `RestoreAgentOrgRun` were removed). The repository has no other caller: Android, iOS, the SDKs and the gateway were searched. They restore a run on demand, the path SR-045/046 replaced with "a message restores the run over its view's stream".
- **Required action:**
  - Remove the router's process slot and getter, and pass the router where it is used.
  - Remove the two mutations, their result types, their unit test (`agent-team-run.test.ts`), and the generated web types (codegen).
  - Withdraw FU-014.
- **Classification:** `Local Fix`, implementation.

### Follow-ups (round 3)

- FU-014 is reclassified into this ticket as CR-461-008 and should be withdrawn.
- FU-011 (remaining older lookups) and FU-013 stand.
- No new follow-ups.

### Round 3 Classification And Routing

- CR-461-008: `Local Fix`, implementation. No design impact: the removal follows Principles 7 and 8 and `DESIGN.md` rule 9, and the design has no other use for these paths.
- Recipient: `/software_engineering_team/implementation_engineer`. The next round is a targeted re-review of CR-461-008.

---

## Round 2: Implementation Review of IR-002 (CRR-005)



### Review Meta

- Review Entry Point: `Implementation Review`
- Current Code Review Revision ID: `CRR-005`; Current Review Round: `2`
- Review Scope: `Full Re-Audit`. The changes since round 1 (`3ae0382fb9..85dc7572d7`, 234 files):
  - touch the data-flow spine (DS-5's closure stop, DS-1's start, DS-8's rows and poll);
  - change shared contracts (removed fields and events; the new `CHILD_RUNS_CHANGED` / `child_runs_changed`);
  - spread beyond the prior findings' files (the new `ChildRowsFeed` and `ChildRowsStreamSession`, `DelegationTree.subscribeChildRows` / `agentsOf`, the web clients).

  All structural checks and the full scorecard were rerun. Round-1 evidence is carried forward only for code unchanged since round 1.
- Trigger: IR-002 (head `85dc7572d7`). It answers CRR-002 … CRR-004 and the designer's SR-040 … SR-044 (ARCH-REV-019 Pass).
- Authorities applied: `design-principles.md`, the project's `DESIGN.md`, Example 7 for every scenario-based candidate, and `ticket-scope.md`.
- Classification: task_size `Large`, architectural_risk `High`, unchanged and confirmed.
- Checks: the handoff's IMP-11 … IMP-17 on the reviewed head; nothing rerun.

### Prior Findings Rechecked First

| Finding | Status | Evidence |
| --- | --- | --- |
| CR-461-001 (closure stop vs. a reopen or follow-up assignment) | **Partly resolved; open** | Resolved for one order: `TaskRunControl.stopForTaskClosure` passes `stillClosed = () => !isOpen(run)`. The agent stop (`StandaloneAgentRunRootManager.stopRootForTaskClosure` → `root.stopForTaskClosure`) and the team stop (`AgentTeamRunManager.terminateTeamRunForTaskClosure`, `agent-team-run-manager.ts:337-351`) check it before the gate closes, so a reopen or assignment committed before that point keeps the run (`kept_open`, no `terminatedAt`). Tests for both kinds. **Still open, the other order:** an assignment or reopen whose Task commit lands after the check, while the run is terminating. Team: `CollaborationRootResolver.resolveOrRestore` returns the still-registered terminating root (`getManagedTeamRun`, `agent-team-run-manager.ts:204-206`). Its closed `materializationGate` rejects `acceptFromRun` (`root-operation-gate.ts:12-15`). `toExistingRun` turns that into `markFailed` and `delegated: false`, and the run ends stopped while its next Task is open. Agent: `getActive` skips the terminating root (`isActive()`), so `resolveRoot` loads a second root for the same run while the first is still ending its host; nothing orders the two. The base guaranteed "DONE(A) closes before the assignment checks: the stop settles in the queue step and the copy ends live in B" (`root-task-existing-copy-assignment.test.ts:212` @ base), and EXC-E2E-004 requires `delegated === true` at every offset. The design's race table says a delivery arriving during a stop "is refused while the run stops, then wakes it" (rows 1 and 4). The new tests cover "reopen before the check" and "stop first, then the next message restores", not a delivery during termination |
| CR-461-002 (history poll) | **Resolved** (SR-040/041) | `getAgentStatuses` answers `isActive` and `localChildStatuses(run)`: every agent of the open local children, with its address from `DelegationTree.agentsOf` and its status from the child's own root, else `offline`. There is no digest. The web re-reads once per distinct answer when the active state or the children differ, and otherwise applies the statuses (`agentRunCollaborationStore.ts:186-238`). The poll's addresses and the view rows' addresses come from the same sources (agent: `metadata.address ?? recipientAddress`; team members: their own addresses), so a re-read converges |
| CR-461-003 (closure during a new run's start) | **Resolved** | `WorkPacket.assertAllowed` is checked by `acceptWorkPacketIfAllowed` at the head of the new run's gate (standalone `operationGate`, team `materializationGate`). A refusal discards the run and answers "…its new work was not started." A closure after that point meets the gated closure stop (CR-461-001). Interleaved tests for both kinds |
| CR-461-004 (team and org token totals) | **Resolved** | `getTeamRunSummary(rootTeamRunId, delegatedAgentRunIds)`: own rows plus the rows of every agent in `DelegatedRunAgentsReader.agentRunIds(subtree)`, each record once (own run IDs filtered). The identity and latest context are the run's own. Per-kind tests; `token_usage.md` updated. The resolver asks for both `agent_team` and `agent_org` with one ID: recorded as FU-013, not this ticket's (below) |
| CR-461-005 (dead code and names) | **Mostly resolved; open (residual)** | Every listed item is gone; the reader is renamed `DelegatedRunAgentsReader`; the org comment is corrected. Residual dead exports in touched files: `getRuntimeMemberContexts` (`agent-team-execution/domain/team-run-context.ts`; its last caller, `resolveRuntimeAgentContext`, was removed by this fix) and `mergePricingSummariesForRecords` (`token-usage/projections/token-usage-run-aggregate.ts`, unused at base, a file round 2 touches) |

### Supported Product Scenario And Reachability Gate (new and changed only)

| Scenario ID | Related Behavior / Contract IDs | Kind | Actor / Initiator | Coherent Goal Or Governing Event | Supported Entry Surface / Event | Scenario Shape | Forward Production Path / Lifecycle | Expected Outcome / Consequence | Independent Evidence | Scenario Validity | Review Use |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-004a (round 2) | REQ-005; race rows 1 and 4; QR-001 / AC-004 of `task-agent-several-tasks` | Contract | A Manager agent | DONE of Task A and Task B for the same run in one turn | Parallel tool calls | Normal | DONE → stop checks `stillClosed` (closed) → terminate begins → B's assignment commits → its work is delivered while the run terminates → refused (team) or delivered to a second root (agent) | The run ends live in B with its work (base) | EXC-E2E-004; base unit test `:212` | Supported Normal Scenario | Use |
| SCN-005 | REQ-004, REQ-002; AC-007 (and its alternate "a message to the delegated run wakes only it"); DS-8 / SR-042 ("each open view stream of X, active or not") | User | The user | Watch, and message, delegated work while the delegating run is stopped (the ticket's own case, SCN-001) | Select the stopped delegator's run row; select a child row; send the child a message | Normal | Web `syncHost(hostRunId, false)` detaches and re-reads the stored view (`agentRunCollaborationStore.ts:315-324`). A stream that is attached anyway ends at an inactive snapshot (`agentRunCollaborationStreamingService.ts:229-230`, `onInactive` + `disconnect`). The org client attaches only an active run (`agentOrgContextsStore.ts:190-193`). A child-row message calls `attach` then `whenReady()`, which rejects "The Agent collaboration view was released." (`:115-127`); the comment there still says "a stopped host is restored first", which REQ-004 removed from the server | The child's live output and rows in the stopped delegator's view; a message to the child accepted without starting the delegator | Requirements SCN-005, AC-007; server side supports it (`DelegatedRunCommands`, `ChildRowsFeed` for any open session, `LocalChildObservation`) | Supported Normal Scenario | Use |
| SCN-010 (round 2) | REQ-011 / removal plan; readers table "`userLaunchSelection` … Removed" | Contract | — | The design's removal of the recorded copy choice | — | — | The contracts (`agent-org-execution-dtos.ts`, `team-execution-view-dtos.ts`) and the web (`delegatedLaunchRows.ts`, `agentSourceSelectors.ts`, `agentOrgRunConfigAdoption.ts`) still carry and read `user_launch_selection` / `user_team_launch_selection`; the server never sets it since round 1 | Removed with its readers | Design removal plan; readers table | Engineering contract | Use |

### Candidate Gate (round 2)

| Candidate ID | Observation | Scenario / Contract | Disposition | Scope | Reason |
| --- | --- | --- | --- | --- | --- |
| C2-01 | A delivery whose Task commit lands after the closure stop's check, arriving while the run terminates, is refused (team) or races the old root (agent) | SCN-004a (round 2) | Promote | This ticket | CR-461-001, still open |
| C2-02 | Web agent-run and org clients keep no stream for a stopped run: no live child rows or output in its view, and a child-row command is refused before reaching the server | SCN-005 | Promote | This ticket | CR-461-006, `Design Impact`: the design never inventoried the web's stream lifetime, a derived consumer of the same assumption SR-040 removed for the poll ("a stopped host's children are stopped") |
| C2-03 | `userLaunchSelection` still in two contracts and three web files | SCN-010 (round 2) | Promote | This ticket (the design's removal plan places it here; FU-012 reclassified) | CR-461-007 |
| C2-04 | Residual dead exports `getRuntimeMemberContexts`, `mergePricingSummariesForRecords` | Principle 7 | Promote | This ticket | CR-461-005, still open |
| C2-05 | The token query guesses a run's kind from one ID (`agent_team` and `agent_org`) | Principle 10 | Promote | Follow-up FU-013 | The query and the attribution predate the ticket; totals are correct |
| C2-06 | After a re-read for the same answer, the poll applies statuses that may still mismatch, and `applyStatuses` throws | DS-8 | Reject | — | The poll and view projections agree (same address sources), so a mismatch is only transient and the next answer differs; a repeat needs a child to close and reopen inside one poll interval (artificial timing, Example 7) |
| C2-07 | `entriesChanged` reports the parents of one Task's entries only; a child whose entries name different delegating runs would be missed | DS-8 | Reject | — | Contract P2: every entry of a run carries the same `delegatedFrom` |

### Structural Checks (full re-audit)

Carried from round 1, unchanged: ownership, off-spine concerns, capability reuse, dependency direction (FU-011 recorded), placement, file sizes, migration.

| Check | Result | Evidence |
| --- | --- | --- |
| Data-flow spine inventory clarity and preservation | Fail (CR-461-001 residual; CR-461-006) | DS-8's live rows now have one owner and order: the tree reports → `ChildRowsFeed` publishes → `ChildRowsStreamSession` orders against the snapshot → the clients apply by membership. DS-5 vs. a delivery during termination is unordered; DS-8 never reaches a stopped run's open view in the web |
| Ownership boundary preservation and clarity | Pass | The tree owns the membership and its change reports; the feed owns publishing; the session owns ordering; `LocalChildObservation` now owns output only |
| Interface/API boundary clarity | Pass (FU-013 recorded) | Poll answer consistent with its consumer; one event type per stream |
| Shared-structure tightness | Fail (CR-461-007) | `userLaunchSelection` kept on the wire, contrary to the removal plan |
| Naming quality and vocabulary | Pass | `DelegatedRunAgentsReader`; `CHILD_RUNS_CHANGED` / `child_runs_changed` named for what they carry. FU-006, FU-007 and FU-010 still deferred |
| Dead code removed in touched files | Fail (CR-461-005 residual; CR-461-007) | Above |
| No legacy retention | Fail (CR-461-007) | A hosting-era field kept with readers |
| Test scenarios requirement-aligned | Fail (CR-461-001) | No test of a delivery during the closure stop's termination |
| Source file size | Pass | Largest changed: `agentOrgStreamingService.ts` 488, `project-task-service.ts` 454; `root-team-run.ts` went down from 500 to 442 |
| API/E2E readiness | Fail | EXC-E2E-004 is expected to fail on CR-461-001's residual; SCN-005 / AC-007 fail in the web (CR-461-006); the E2E suites' rewrite for the removed events belongs to API/E2E |

### Scorecard (round 2, full)

| Priority | Category | Score | Why / What Is Weak |
| --- | --- | --- | --- |
| 1 | Data-Flow Spine Inventory and Clarity | 9.0 | Live rows are clean and ordered; DS-5 vs. a delivery during termination (CR-461-001); DS-8 doesn't reach a stopped run's view in the web (CR-461-006) |
| 2 | Ownership Clarity and Boundary Encapsulation | 9.5 | One owner each for membership, publishing, ordering and output |
| 3 | API / Interface / Query / Command Clarity | 9.2 | Poll fixed; FU-013 recorded |
| 4 | Separation of Concerns and File Placement | 9.4 | — |
| 5 | Shared-Structure / Data-Model Tightness | 9.0 | `userLaunchSelection` on the wire (CR-461-007) |
| 6 | Naming Quality and Local Readability | 9.3 | Rename done; deferred names remain as follow-ups |
| 7 | API/E2E Readiness | 8.6 | EXC-E2E-004 and AC-007 at risk; E2E rewrite pending |
| 8 | Runtime Correctness And Behavioral Fidelity | 8.8 | CR-461-001 residual, CR-461-006 |
| 9 | No Backward-Compatibility / No Legacy Retention | 9.1 | CR-461-007 |
| 10 | Cleanup Completeness | 9.1 | CR-461-005 residual, CR-461-007 |

Overall 9.1. Below 9.2: Spine, Shared Structure, API/E2E Readiness, Runtime Correctness, No Legacy, Cleanup.

### Findings (round 2, open)

#### CR-461-001 (still open): a delivery arriving while a closure stop terminates the run is refused, or races it, instead of waking the run after the stop

- **Protects:** REQ-005 / BEH-005; QR-001 / AC-004 of `task-agent-several-tasks`; the design's race table rows 1 and 4 ("refused while the run stops, then wakes it"); REQ-003 ("never … refused because the delegator is stopped").
- **Evidence:** above. Team: the terminating root stays registered and its closed gate rejects; `toExistingRun` → `markFailed` → `delegated: false`, and the run ends stopped while B is open. Agent: a second root is loaded while the first ends the same agent run's host.
- **Required action:**
  - A delivery (message, follow-up Task work) that reaches a run whose root is terminating waits for that termination to finish, then restores the run and delivers. This applies in `CollaborationRootResolver.resolveOrRestore` for agent and team runs, and its org equivalent if reached.
  - The run's root is not loaded twice while it ends.
  - Test it for agent and team: DONE(A) with B's assignment committed after the stop's check (the base case `:212`). The run ends live in B with its work, and the assignment answers `delegated: true`.
- **Classification:** `Local Fix`, implementation (the design states the outcome).

#### CR-461-005 (still open, minor): two dead exports in touched files

- `getRuntimeMemberContexts` (`team-run-context.ts`) and `mergePricingSummariesForRecords` (`token-usage-run-aggregate.ts`): each is referenced only by its own declaration. Remove both (Principle 7).
- **Classification:** `Local Fix`, implementation.

#### CR-461-006 (new): the web keeps no stream for a stopped run, so its view never gets live child rows or output, and refuses commands to its children

- **Protects:** REQ-004 / AC-007 and its alternate ("a message to the delegated run wakes only it"); REQ-002; DS-8 / SR-042 ("publishes … on each open view stream of X, active or not").
- **Evidence:**
  - Agent-run client: `syncHost(hostRunId, false)` detaches and re-reads the stored view (`agentRunCollaborationStore.ts:315-324`). A stream attached anyway ends at an inactive snapshot (`agentRunCollaborationStreamingService.ts:229-230`). A child-row message calls `attach` + `whenReady()`, which rejects with "The Agent collaboration view was released." (`:115-127`); its comment "a stopped host is restored first" describes the connect behavior REQ-004 removed.
  - Org client: attaches only an active run (`agentOrgContextsStore.ts:190-193`; `agentOrgStreamingService.ts:147-160, 332-334`).
  - The server supports all of it for a stopped run: connect starts nothing; `ChildRowsFeed` publishes to any open session; `LocalChildObservation` follows output while viewed; `DelegatedRunCommands` reaches the child's own run.
  - The implementation records it as a known limitation (handoff "Stopped standalone delegator").
- **Why the design's:**
  - The design never inventoried this consumer. The web's stream lifetime ("live stream only while the host runs"), and the readiness that relied on connect starting the host, assume that a stopped host's children are stopped.
  - SR-040 removed exactly that assumption for the poll only ("the stopped-host branch goes … children now live on while their delegator is stopped").
  - DS-8 states the outcome ("active or not") but does not decide the client's stream lifetime, readiness and commands for a stopped run, for the agent-run, org and team clients and the phone layout.
- **Decision needed:** when the web keeps a run's view stream for a stopped run, and how a child-row command becomes ready without starting the run. The design spec already rules out starting it (REQ-004).
- **Classification:** `Design Impact`, Solution Designer.

#### CR-461-007 (new): `userLaunchSelection` is kept on the wire and in the web, contrary to the design's removal plan

- **Protects:** the design's removal plan and readers table ("`userLaunchSelection` and its readers: Removed"; "Removed. A stopped delegated run's Settings edit is the ordinary stopped-run save (TC-5)"); Principle 7; Principle 8.
- **Evidence:** the field is still in `autobyteus-collaboration-stream-contracts/src/agent-org-execution-dtos.ts`, `autobyteus-team-stream-contracts/src/team-execution-view-dtos.ts`, `autobyteus-web/utils/runSettings/delegatedLaunchRows.ts`, `services/collaborators/agentSourceSelectors.ts` and `services/agentOrgExecution/agentOrgRunConfigAdoption.ts`. The server never produces it (round 1 onward). The implementation filed FU-012 and asked where it belongs.
- **Placement:** this ticket. The approved design removes it here, and the files are touched. The unsaved-edit rule the web shares with it is a client draft: it keeps its own name and does not need a recorded field the server never sends.
- **Required action:** remove the field from both contracts and its web readers; keep the draft rule on the draft. Withdraw FU-012.
- **Classification:** `Local Fix`, implementation.

### Follow-ups (round 2)

- Added: FU-013 (the token query serves two subjects by one ID; Principle 10 / 15).
- FU-012 is reclassified into this ticket as CR-461-007 and should be withdrawn.
- FU-011 stands.

### Round 2 Classification And Routing

- CR-461-006: `Design Impact`, Solution Designer.
- CR-461-001 (residual), CR-461-005 (residual), CR-461-007: `Local Fix`, implementation, carried with the revised package.
- Recipient: `/software_engineering_team/solution_designer` (the Design Impact governs).

---

## Round 1 (CRR-001 … CRR-004)

## Review Round Meta

- Review Entry Point: `Implementation Review`
- Requirements Doc Reviewed As Context: `requirements-doc.md` (approved; SR-018 with contract revision 5, supplements through SR-022; non-goal exception SR-035)
- Investigation Notes Reviewed As Context: `investigation-notes.md`, as cited by the design
- Solution Revision Record Reviewed As Context: `solution-revision-record.md` (SR-018 … SR-039; read for SR-036 … SR-039)
- Design Spec Reviewed As Context: `design-spec.md`, every section: DS-1 … DS-11, "Ordering Without A Shared Queue", "Readers Of Removed Or Renamed Fields", the Removal Plan and the DS-10 checklist
- Supplemental Task Artifacts Reviewed As Context: `target-collaboration-contract.md` revision 8 (P1 … P8; §5 R-1 … R-10, T-1 … T-7; TC-2); `follow-ups.md` (FU-002, FU-006 … FU-010)
- Relevant Solution Revision IDs: SR-018 … SR-039
- Design Review Report Reviewed As Context: `design-review-report.md` (ARCH-REV-014 Pass): basis confirmation and material premises MP-A, MP-B, MP-C
- Architecture Review Revision Record Reviewed As Context: `architecture-review-revision-record.md`
- Relevant Architecture Review Revision IDs: ARCH-REV-005 … ARCH-REV-014
- Implementation Handoff Reviewed As Context: `implementation-handoff.md` (IR-001), including Checks Run, Known Risks and Downstream Hints
- Implementation Revision Record Reviewed As Context: `implementation-revision-record.md` (IR-001; deleted files and tests with reasons)
- Relevant Implementation Revision IDs: IR-001
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-004` (CRR-003 corrected the classification of CR-461-002; CRR-004 records follow-up FU-011; the findings are unchanged)
- Current Review Round: `1`. CRR-001 was this round's first result. At the user's request the full review was completed against every criterion, and CRR-002 replaces it.
- Review Scope: `Full Review`
- Trigger: IR-001, from the Implementation Engineer (Large / High).
- Code reviewed: worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copies-outlive-delegator-461`, branch `codex/delegated-copies-outlive-delegator-461`, base `origin/personal` `827f1e68dc`, head `3ae0382fb9` (548 files, +9.5k / −30k lines).
- Authorities applied:
  - the team's `design-principles.md` (Principles 1 … 15, Structural Triggers);
  - the project's `DESIGN.md`, rules 1 … 12, with rules 7, 9, 10 and 11 applied below;
  - `design-examples.md` Example 7, applied to every scenario-based candidate;
  - `ticket-scope.md`.
- No project-principle conflict found.

## Routing Classification Review

- Task size: `Large`. Architectural risk: `High`. Selected route: `Implementation Review`. Independent source review required: `Yes`.
- Classification evidence: confirmed. Persistence (one migration over every stored delegation shape); ownership boundaries (no hosting); ordering (each run's own gate with the Task side as authority); shared contracts (the Task entry, three view DTOs, the `TaskRoot.delegatingRun` GraphQL field).

## Review Scope

- **Read in full, spine by spine:**
  - DS-1, DS-6: `task-delegation.ts`, `compositions/task-delegation-composition.ts`, the standalone root's `acceptWorkPacket`, `delegateToNewCopy` and `assignToExistingCopy`.
  - DS-2, DS-3: `cross-run-message-delivery.ts`, `cross-run-accept-input.ts`, `cross-run-address-resolution.ts`, the router's diff, and `root-communication-engine.ts` `acceptFromRun` (the gate-head check).
  - DS-4: the three roots' `stop`/`terminate`.
  - DS-5: `task-execution-resource-release.ts`, `task-run-control.ts`, `AgentRunService.stopForTaskClosure`, `TeamRunService.stopForTaskClosure`.
  - DS-7: the AR-016 readers (`isDelegated`, `isPeerStarted`).
  - DS-8: `delegated-children-dtos.ts`, `local-child-observation.ts`, the paired-agent access for agent and team runs, `delegated-run-commands.ts`, `delegated-child-launches.ts`, `delegated-launch-selection-service.ts` `update`, and the stream connect.
  - DS-9: `restart-resumer.ts`, `restart-notice.ts`.
  - DS-10: the migration's orchestrator, scan and Task-record conversion; its registry position.
  - DS-11 and REQ-007: `top-level-run-rule.ts`, `delegated-work-guard.ts` and its three callers.
  - AR-017: the Task side's `swap`, `forget`, `tellEntriesChanged`; `DelegationTree` in full.
  - Readers table: token totals (`token-usage-stats.ts`, `token-usage-run-store.ts`, `closed-delegated-run-reader.ts`, the base `token-usage-context-enricher.ts`); TC-13 `message-log-owners.ts`.
  - The history poll's server answer and the web's poll rule.
- **Sweeps:**
  - leftover readers of every removed or renamed field (`hostRoot`, `assignedBy`, `taskAgent`, `coordinatingRun`, `userLaunchSelection`, `remoteTaskExecutions`, `followsTeam`, `place: "delegated"`, `collaboration_tree`);
  - unused exports in every changed server file, compared with base and script entry points;
  - test coverage per new owner;
  - deleted tests that asserted preserved behavior.
- **Explicit exclusions:**
  - Not rerun: the implementation's recorded checks (IMP-01 … IMP-10). No code changed after them except test-only commits, and no finding needs a check nobody ran.
  - Not re-reviewed: the contract's executable model, which the architecture review owns.
  - Not judged here: the web beyond the Task-root rename (IMP-05 … IMP-07) and the poll rule cited in CR-461-002.

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: a delegated run is an ordinary run, bound to its Task, never to its delegator (P6). The Task entry and the run's own `delegatedFrom` hold the delegation once per side. `DelegationTree` relates runs. Messages are centered on the Task (DEC-011). All three delegating run kinds are in scope (TC-4). Everything else a delegation does today keeps working (REQ-009).
- Behavior-basis status: `Confirmed`. No newly discovered behavior. The contradictions below are implementation defects against confirmed behavior.

| Behavior / Spine | Status | Implementation Path And Lifecycle Evidence |
| --- | --- | --- |
| DS-1 delegate (REQ-002, REQ-009) | Confirmed, with one race (CR-461-003) | `TaskDelegation.toNewRun` (`task-delegation.ts:150-232`) in this order: work → placement → inert run (`DelegatedRunStarter`) → Task entry → open re-check → work packet → `markStarted`; a failure discards the run. Creating the run before its entry follows the peer path and the design's "Start from the peer path" (the entry needs the run's ID). Refusal texts are kept |
| DS-2 message by run ID (REQ-003) | Confirmed | `CrossRunMessageDelivery.route` (`cross-run-message-delivery.ts:71-105`). The receiver's gate re-checks through the Task side: `assertAllowed` → `refuseOutsideTaskScope` / `reserveAndCommit(… checkTaskScope)` (`root-communication-engine.ts:274-280`). Receiver's log, then sender's log |
| DS-3 message by address | Confirmed | `CrossRunAddressResolution` (`:33-83`): step 2 over open Tasks in ID order, assigners in run order; then the SR-036 correction for a team run |
| DS-4 Stop (REQ-001) | Confirmed | Standalone `stop` → `terminate` + its own host (`standalone-agent-run-root.ts:254-279`); team `terminate` freezes its own members (`root-team-run.ts:381-405`); org `terminateOnce` covers its own agents and mounted teams (`agent-org-run.ts:305-322`) |
| DS-5 closure (REQ-005) | **Contradicted** (CR-461-001) | The stop never re-checks closure (below) |
| DS-6 reopen and follow-up (REQ-005) | Confirmed in itself | `admit` → `reopenAssignment`; `toExistingRun` → `assignExistingTaskExecution` → delivery through DS-2. Its interaction with a late closure stop: CR-461-001 |
| DS-7 idle shutdown | Confirmed | Every delegated run has its own idle shutdown (`isDelegated`). The peer channel and runtime-switch eligibility use `isPeerStarted` (AR-016 readers table followed) |
| DS-8 view (REQ-002, REQ-004, REQ-006) | Confirmed for the open view; **contradicted for the history poll** (CR-461-002) | Rows come from `openChildrenOf`, each read from its own file. `LocalChildObservation` gives live statuses and output and starts nothing (`StandalonePairedAgentAccess.observePairedAgents` uses `resolveRoot`, which never starts the host). Connect resolves the root without `ensureHostReady`. `DelegatedRunCommands` routes to the child's own root. SR-039: check everything, then the parent's save, then each child in order, with `PERSISTENCE_FAILED` naming what was saved (`delegated-launch-selection-service.ts:88-122`, `delegated-child-launches.ts:70-134`) |
| DS-9 restart (REQ-008) | Confirmed | Depth along `delegatedFrom`, deepest first (`restart-resumer.ts:94-118`); the notice lists the resumed runs it delegated (`restart-notice.ts`) |
| DS-10 migration (REQ-011) | Confirmed | Order 1 … 8; recognition by shape; peer links from every tree kind moved onto Task entries before the lists go; predecessors' unfinished items preserved and reported; registered after its four predecessors with no hold (`app-data-migration-registry.ts:142-153`) |
| DS-11 run list; REQ-007 guard | Confirmed | `top-level-run-rule.ts`; `delegated-work-guard.ts` in the agent, team and org services |
| REQ-009 token roll-up | **Contradicted for team (and org) totals** (CR-461-004) | Below |
| AR-017 | Confirmed | `swap()` and `forget()` call `entriesChanged` synchronously (`task-execution-resource-service.ts:255-322`) |

### Upstream Design-Review Material-Premise Decisions

| Premise ID | Current Status | Evidence |
| --- | --- | --- |
| MP-A (a tree or list holds an entry a released migration owns) | Confirmed | The scan marks such trees `unfinishedTrees` (`released-delegation-scan.ts:156-166`). Steps 5 and 6 then preserve them (`delegated-runs-own-runs-v1-app-data-migration.ts:128-129, 188-189`) |
| MP-B (a reply by run ID to a non-delegator member of a stopped team the user started) | Confirmed | `DelegationTree.runOfAgent` → `readMembers` reads every team or org node's own file, the delegating run included (`delegation-tree.ts:212-246`) |
| MP-C (the migration held by a `FAILED` predecessor) | Confirmed | No `prerequisiteMigrationIds`; registered after the four predecessors |

## Supported Product Scenario And Reachability Gate (Mandatory)

| Scenario ID | Related Behavior / Contract IDs | Kind | Actor / Initiator | Coherent Goal Or Governing Event | Supported Entry Surface / Event | Scenario Shape | Forward Production Path / Lifecycle | Expected Outcome / Consequence | Independent Evidence | Scenario Validity | Review Use |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-004a | REQ-005, BEH-005; design race row 1; QR-001 / AC-004 of `task-agent-several-tasks` | Contract | A Manager agent | Close one Task and give the same run its next Task in one turn | Parallel tool calls `update_task(DONE)` + `delegate_task(target_agent_run_id, task_id)` | Normal | DONE commits → the release dispatches the stop asynchronously → the assignment commits and delivers → the stop runs | The run is never stopped while its next Task is open | Existing E2E EXC-E2E-004 (`task-existing-copy-assignment.e2e.test.ts:745-795`); the base unit test "A's stop request arrives after B's commit … is not stopped (AC-004)" (`root-task-existing-copy-assignment.test.ts:248` @ base, deleted) | Supported Normal Scenario | Use |
| SCN-004b | REQ-005; design race row 1 | Contract | The assigner | Reopen and continue a closed run | `update_task(IN_PROGRESS)` → `send_message_to(run ID)` while the closure's stop is pending | Explicit Edge | DS-6 vs. DS-5 | The continued run is not stopped | Design "a closure and the assigner's message interleaved, in both orders"; base `root-task-reactivation.test.ts:177-187` (deleted) | Supported Explicit Edge Scenario | Use |
| SCN-004c | REQ-005; design race row 5 ("Activation commit vs. closure of the same new run") | Contract | The assigner M; the delegated run E | M closes Task T1 while E delegates sub-work of T1 | `update_task(DONE)` by M; `delegate_task(address, description)` by E | Explicit Edge | E's `toNewRun`: entry linked → open check passes → M's DONE commits → release stops the new run (not started yet: `terminateAgentRun` fails, `terminatedAt` recorded) → the work packet starts it | The design's target: "a closure during the start … stops the run once its root exists" | Design race table row 5; contract T-1 | Supported Explicit Edge Scenario | Use |
| SCN-001/003 | REQ-002, REQ-003; autobyteus-426 REQ-009 (the poll), preserved by REQ-009 | User / System | The user; a delegated run | The user stops the Manager; a child's report wakes it; the Manager's context is published but not streamed | Stop; `send_message_to`; the web's 5 s history poll | Normal | `getAgentStatuses` → the web's active branch → `inspect` | Rows keep their real status; the view is re-read only when something changed | `standalone-agent-run-root-manager.ts:131-137`; `agentRunCollaborationStore.ts:193-197, 238-243` | Supported Normal Scenario | Use |
| SCN-010 | REQ-009, AC-012; readers table "Token totals: unchanged results"; AR-012 | User | The user | Read a team run's token total after its members delegated work | The token usage panel (`getTeamRunTokenUsageSummary`) | Normal | A delegated run's usage rows carry its own root (`token-usage-context-enricher.ts`, unchanged). The team total reads rows by `rootTeamRunId` only (`token-usage-run-store.ts:50-54`) | The team total includes the work of the runs delegated from it, as today | Base: a copy hosted by the team wrote `root_team_run_id` = that team (`token-usage-context-enricher.ts` @ base, "Only Team members roll up to a root TeamRun") | Supported Normal Scenario | Use |

### Candidate Finding And Mechanism Gate

| Candidate ID | Observation Or Mechanism | Scenario / Contract ID | Independent Trigger | Forward Path / Lifecycle / Consequence | Evidence | Disposition | Scope, if promoted | Reason / Proportionate Response |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C-01 | The closure stop has no "still closed" re-check, and the deleted base tests of that behavior were not replaced | SCN-004a, SCN-004b | Parallel tool calls in one turn; reopen-and-message | A run given its next Task, or continued, after DONE committed but before the stop ran, is stopped while open | `task-execution-resource-release.ts:13-30`; `task-run-control.ts:26-32`; `agent-run-service.ts:303-308`; `team-run-service.ts:254-259`. Base: `root-task-execution-resource-scope.ts:106-127` ("A run that is open again is reported `TASK_AGENT_RESOURCE_NOT_CLOSED` and not stopped") and its deleted tests (above) | Promote | This ticket (the change breaks preserved behavior) | CR-461-001 |
| C-02 | The history poll answers `statuses: []` and a closed digest the view never has; the design's readers inventory does not list the poll | SCN-001/003 | The 5 s poll of a published, not-streamed, active hub with local or closed children | The unchanged web re-reads the view on every poll (no once-guard on the active branch); children of listed, not-open runs show no live status | Server `standalone-agent-run-root-manager.ts:131-137`; web `agentRunCollaborationStore.ts:193-197, 238-243`. At base the active answer matched the view. Only the agent root has this answer shape | Promote | This ticket (preserved behavior; FU-009 reclassified) | CR-461-002, `Design Impact` (the design's escalation rule for unlisted readers; Principle 11) |
| C-03 | The work packet is accepted without a Task-side check; a stop of a not-yet-started new run is a no-op | SCN-004c | M closes T1 while E delegates sub-work of T1 | `toNewRun`'s open check passes (`task-delegation.ts:210-214`) → DONE commits → `stopForTaskClosure` finds no active run and records `terminatedAt` (`agent-run-service.ts:303-308`) → `acceptWorkPacket` starts the run (`standalone-root-message-delivery.ts:147-151`; the team's `acceptWorkPacket` likewise). The run works on a closed Task; its reports are refused | `task-delegation-composition.ts:50-54` passes no check; contrast `acceptFromRun`'s `assertAllowed` | Promote | This ticket | CR-461-003 |
| C-04 | The team (and org) token totals no longer include the runs delegated from them | SCN-010 | The user reads a team run's total | Rows of runs delegated from team members carry their own roots; `getTeamRunSummary` reads by `rootTeamRunId` only; the total drops the delegated work, open and closed | `token-usage-run-store.ts:50-54`; `token-usage-stats.ts:339-344` (unchanged); the standalone total alone uses `subtreeOf` (`:324-335`). The design's readers table: "A total of a run covers its own agents and every run delegated from it … Unchanged results"; REQ-009 names team and org totals | Promote | This ticket (approved REQ-009 behavior) | CR-461-004 |
| C-05 | Dead code and wrong names in touched files | Principle 7; `DESIGN.md` rule 11; Principle 15 | Engineering contract | Code nothing reaches, or a name that says the opposite of what it does | Below (CR-461-005) | Promote | This ticket (Principle 7: touched files) | CR-461-005 |
| C-06 | `LocalChildObservation`: a child that appears between the snapshot and the first `refresh(false)` is followed without being announced | DS-8 | None independent: it needs a delegation committing inside the connect window | Artificial timing | `local-child-observation.ts:57-90` | Reject | — | Example 7: no supported trigger reaches it |
| C-07 | Migration: one entry with no recorded delegator or address leaves a whole Task file unconverted | DS-10 | None: measured data has both for every entry (406/406, 181/181) | — | `task-record-conversion.ts:49-59` | Reject | — | Not reachable on the measured shapes; reported (P7) |
| C-08 | Migration: a peer link whose run has no Task entry is dropped with its tree | DS-10 | None: 2 of 2 measured peer links have entries | — | `released-delegation-scan.ts:150-156` | Reject | — | Not reachable |
| C-09 | User input to a closed delegated run is not fenced (the hosting-era input fence went away) | R-8 | None: a closed run is not a row of its delegator, not a top-level row (DS-11), and its Task-page line is not openable | No user entry surface reaches it | `delegated-children-dtos.ts:17` (open only); `top-level-run-rule.ts` | Reject | — | Example 7: no supported trigger |
| C-10 | `delegatedChildDto` returns `null` without a warning for a missing own file (`DESIGN.md` rule 7 asks for a warning) | DS-8 | Only manual deletion removes an open child's own file (the run is created before its entry) | — | `delegated-children-dtos.ts:31-40` | Reject | — | Not reachable through a supported action |
| C-11 | `top-level-run-rule.ts` calls `fs.existsSync` once per listed row | DS-11 | The run list | Synchronous stat per delegated row | `top-level-run-rule.ts:18-22` | Reject (as a finding) | — | Bounded at today's volume; `DESIGN.md` rule 3 concerns avoidable whole-history work, which this is not |
| C-12 | `delegatedChildrenDtos` (the snapshot's child rows) has no direct test; its parts do (projection, `openChildrenOf`, `LocalChildObservation`) | DS-8 | — | — | `tests/unit/services/agent-streaming/launch-source-dto-projection.test.ts`; `delegation-tree.test.ts` | Reject (as a finding) | — | Thin glue; noted as a recommendation |
| C-13 | Contract fields the server no longer produces (FU-008) | Principle 7 | — | The web still reads them, so they are not dead; their removal is a web and contract change the design kept out | `follow-ups.md` FU-008 | Reject (as a finding) | Follow-up (recorded) | — |

## Structural / Design Checks

| Check | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Task design health assessment is present, evidence-backed, and preserved | Pass | Hosting removed; one model; 63 hosting files gone | — |
| Implementation matches approved behavior-defining supplemental artifacts | Pass, except CR-461-001, -003, -004 | Contract revision 8; `walkthrough.py --check` green (IMP-08) | See findings |
| Data-flow spine inventory clarity and preservation | Fail | DS-5 is not ordered against DS-6 (CR-461-001) or DS-1's start (CR-461-003) | Fix |
| Ownership boundary preservation and clarity | Pass | Task side: records and their order. `DelegationTree`: relationships and `canMessage`. `CrossRunMessageDelivery`: delivery order. `TaskDelegation`: delegation order. Each root: its own parts, gate and log | — |
| Off-spine concern clarity | Pass | `LocalChildObservation`, `TaskWorkerStatusNotice`, the guard and the run-list rule each serve one owner | — |
| Existing capability/subsystem reuse check | Pass | Peer path reused: `PairedAgentAccess`, the starters, the idle shutdowns | — |
| Reusable owned structures check | Pass | — | — |
| Shared-structure/data-model tightness check | Pass | `delegatedFrom` once per side; `DelegatedChild` | — |
| Repeated coordination ownership check | Pass | One delegation owner for three roots; one Stop rule | — |
| Empty indirection check | Pass | — | — |
| Scope-appropriate separation of concerns and file responsibility clarity | Pass | — | — |
| Ownership-driven dependency check | Pass | `run-history` reaches collaboration through bindings; the composition binds | — |
| Authoritative Boundary Rule check | Pass | — | — |
| File placement check | Pass | — | — |
| Flat-vs-over-split layout judgment | Pass | — | — |
| Interface/API/query/command/service-method boundary clarity | Fail (CR-461-002 Design Impact; CR-461-004) | The poll's answer no longer matches its consumer, and the design never inventoried it; the team total query lost its subject's delegated runs | Design decision; fix |
| Naming quality and vocabulary (Principle 15) | Fail (CR-461-005) | `ClosedDelegatedRunReader` returns open and closed runs; a stale "delegated children" comment in the org root. FU-006, FU-007 and FU-010 are deferred by the design | Rename; fix comment |
| No unjustified duplication of code | Pass | — | — |
| Patch-on-patch complexity control | Pass | — | — |
| Dead code removed in the touched files and modules (Principle 7) | Fail (CR-461-005) | One new and one newly unused export; pre-existing unused exports in touched files; test-only production code | Remove |
| Relevant test scenarios and assertions are clear and requirement-aligned | Fail (CR-461-001) | Base tests of preserved behavior (a stop after a reopen or assignment is not applied) deleted without replacement, against the revision record's claim | Re-test at the new owner |
| Test fixtures/helpers are reasonably reusable | Pass | Frozen readers for released shapes | — |
| No stale, duplicated, or compatibility-only tests are retained | Pass | `memory-collaboration-graphql.e2e` flagged for API/E2E | — |
| API/E2E readiness | Fail | EXC-E2E-004 is expected to fail (CR-461-001); team token totals are wrong (CR-461-004) | Fix first |

## Source File Size And Structure Audit

| Source File | Before | After | `>500` Hard-Limit Check | `>220` Delta Check | SoC / Ownership | Placement | Classification | Required Action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `compositions/build-studio-server.ts` | 480 | 486 | Pass | Pass | Pass | Pass | — | — |
| `run-history/services/agent-run-history-catalog-service.ts` | 491 | 491 | Pass | Pass | Pass | Pass | — | — |
| New owners (largest: `task-delegation.ts` 357, the migration orchestrator 319, `delegation-tree.ts` 313, raw lines) | — | ≤357 | Pass | Pass | Pass | Pass | — | — |

No changed source file is over 500 effective lines. The FU-002 files went down (302, 363).

## Legacy / Backward-Compatibility Verdict

| Check | Result | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms in changed scope | Pass | Older tree lists are tolerated as unknown fields and never written (E9) |
| No legacy old-behavior retention | Pass | Sweep: no reader of `taskAgent`, `coordinatingRun`, `userLaunchSelection`, `place: "delegated"` or `collaboration_tree` left outside migrations. `hostRoot` remains only as the peer wire field (`remote-message-receiver.ts`). `assignedBy` remains only in the agent tool contract and the domain mapping |
| Dead code removed in touched files and modules | Fail | CR-461-005 |
| Approved persisted-data transition decision followed | Pass | `Migration Required`; target-only runtime; frozen readers |
| No version-specific dual reads/writes | Pass | — |
| Transition mechanics match the reviewed design | Pass | Order 1 … 8. Step 5 makes two writes (metadata, then the tree's removal), and a retry recognizes both. One atomic write per file otherwise |

## Dead / Obsolete / Legacy Items Requiring Removal

| Item / Path | Type | Evidence | Why It Must Be Removed | Required Action |
| --- | --- | --- | --- | --- |
| `serializeDelegatedFrom` (`run-history/store/delegated-from-schema.ts:35`) | DeadCode (new) | No reference in `src` or `tests` | Added by this change, unused | Remove |
| `DelegatedLaunchUpdateResult` (`agent-collaboration/domain/delegated-launch-selection.ts`) | DeadCode (made unused) | 7 source files at base, 0 now | Its users were removed | Remove |
| `RootTeamRegistrationReservation` (`root-team-execution-directory.ts`), `resetActiveCollaborationRootDirectory` (`active-collaboration-root-directory.ts`), `getAgentMemoryLocationService` (`agent-memory-location-service.ts`), `AgentOrgRunModelOption` (`agent-org-run-config.ts`), `TeamRunNode` (`team-run-config.ts`), `resolveRuntimeAgentContext` (`team-run-context.ts`), `TeamRunEventListener`, `TeamRunEventUnsubscribe` (`team-run-event.ts`) | DeadCode (pre-existing, in touched files) | Each is referenced only by its own declaration (base and head); no script entry point | Principle 7: touched files | Remove |
| `resetProjectTaskServiceForTests` (`projects/services/project-task-service.ts:462`) | UnusedHelper (test-only production code) | Only tests call it (10 files) | `DESIGN.md` rule 11; Principle 7 ("code that only its own tests call") | Remove; tests reset through the service's existing release path |

`repairCollaborationRunHistoryIndexes` was checked and is used by a maintenance script, so it is not dead.

## Docs-Impact Verdict

- Docs impact: `Yes`. Done in this change: `collaboration_model.md`, `GLOSSARY.md` and ten module docs.
- `docs/modules/token_usage.md` describes the standalone total only. It must also state the team and org totals once CR-461-004 is fixed.

## Additional Material Premise Validation

None beyond the upstream premises MP-A … MP-C, which are confirmed above. The new scenario-based candidates are recorded in the gate. Example 7 was applied: C-06, C-09 and C-10 are rejected for lack of a supported trigger; C-03 is promoted on the design's own governing race contract (row 5).

## Review Scorecard (Mandatory)

- Overall score: `8.9`

| Priority | Category | Score | Why This Score | What Is Weak / Holding It Down | What Should Improve |
| --- | --- | --- | --- | --- | --- |
| 1 | Data-Flow Spine Inventory and Clarity | 8.8 | Spines map cleanly to owners | DS-5 is ordered neither against DS-6 (CR-461-001) nor against DS-1's start (CR-461-003) | Task-side re-checks in the run's gate |
| 2 | Ownership Clarity and Boundary Encapsulation | 9.5 | One owner per concern; the Task side is the authority; each root writes its own log | — | — |
| 3 | API / Interface / Query / Command Clarity | 8.6 | Explicit identities throughout | The poll answer (CR-461-002); the team total query (CR-461-004) | Fix both |
| 4 | Separation of Concerns and File Placement | 9.4 | New concerns in new owners | — | — |
| 5 | Shared-Structure / Data-Model Tightness | 9.4 | `delegatedFrom` once per side | FU-008 fields | Follow-up |
| 6 | Naming Quality and Local Readability | 8.9 | Clear new names | `ClosedDelegatedRunReader`; stale comment (CR-461-005); FU-006, FU-007, FU-010 | Rename |
| 7 | API/E2E Readiness | 8.4 | Broad unit and integration coverage | EXC-E2E-004 expected to fail; deleted preserved-behavior tests; team totals wrong | Fix and re-test |
| 8 | Runtime Correctness And Behavioral Fidelity | 8.4 | Message admission, tree currency, migration, Stop scope and REQ-004 are correct | CR-461-001 … CR-461-004 | Fix |
| 9 | No Backward-Compatibility / No Legacy Retention | 9.5 | — | — | — |
| 10 | Cleanup Completeness | 8.9 | Hosting fully removed | Dead code in touched files (CR-461-005) | Remove |

## Findings

### CR-461-001: A Task closure stops a run that was given its next Task, or continued, after the closure committed (blocking)

- **Protects:** REQ-005 / BEH-005 (preserved Task rules); AC-005; AC-004 and QR-001 of `task-agent-several-tasks` / `delegate-to-existing-copy`; the design's race table, row 1.
- **Evidence:**
  - `TaskExecutionResourceRelease.release` dispatches `stop` without awaiting it (`task-execution-resource-release.ts:13-30`).
  - `TaskRunControl.stopForTaskClosure` (`task-run-control.ts:26-32`) calls `AgentRunService.stopForTaskClosure` (`agent-run-service.ts:303-308`) and `TeamRunService.stopForTaskClosure` (`team-run-service.ts:254-259`). These terminate, or record `terminatedAt`, without asking the Task side.
  - At base, the release re-checked "closed now" and left a run that was open again (`root-task-execution-resource-scope.ts:106-127` @ `827f1e68dc`).
  - The base tests of exactly this were deleted and not replaced, although the revision record says "Behavior that is preserved was re-tested at its new owner":
    - `root-task-existing-copy-assignment.test.ts:248` "A's stop request arrives after B's commit (or A is DONE again): the copy now works on B and is not stopped (AC-004)";
    - `root-task-reactivation.test.ts:177-187`, which expects `TASK_AGENT_RESOURCE_NOT_CLOSED`.
- **Consequence:** a Manager's parallel `update_task(DONE)` + `delegate_task(target_agent_run_id, task_id)` stops the run that took its next Task. This is EXC-E2E-004's shape. The assigner's reopen-and-message while the stop is pending is undone the same way.
- **Required action:**
  - Before a closure stop takes effect on a run, ordered with the deliveries already admitted to that run's gate, re-check the run's entry through `TaskExecutionResourcePort.isOpen`, the same authority as the delivery's `assertAllowed`. When it is open again: no termination, no `terminatedAt`, and the result reported as not closed.
  - Cover agent and team runs.
  - Restore the deleted cases at the new owner: a pending stop after an existing-run assignment, and after a reopen, in both orders.
- **Classification:** `Local Fix`, implementation.

### CR-461-002: The history poll's answer no longer matches the unchanged web (blocking)

- **Protects:** REQ-002 ("shown … with its real status"); REQ-009 (preserved: autobyteus-426 REQ-009, the poll's refresh of task rows under listed runs that are not open); `DESIGN.md` rule 3 (no avoidable repeated full reads on a poll).
- **Evidence:**
  - `getAgentStatuses` (`standalone-agent-run-root-manager.ts:131-137`) answers `statuses: []` for every run, with `closedTaskExecutionsDigest` over its closed children.
  - The unchanged web, for an active hub that is published but not streamed, re-reads the view when the statuses don't name the view's children (`agentRunCollaborationStore.ts:193-197`). It also re-reads when the digest differs from the view's `closed_task_executions`, which is always `[]` now (FU-008) (`:238-243`).
  - The active branch has no once-guard, so a hub that is active and has any open or closed local child is re-read every 5 s (`RUN_HISTORY_REFRESH_INTERVAL_MS`). This is SCN-001/003: a stopped Manager woken by its child's report.
  - The children of listed, not-open runs also get no live status (FU-009).
- **Why this is the design's:**
  - The design package never inventories this consumer. A search of `design-spec.md`, `design-review-report.md`, `solution-revision-record.md` and `requirements-doc.md` finds no mention of the history poll (`agentRunCollaborationStatuses` / `getAgentStatuses`), its children's statuses or its closed-set digest.
  - The poll is a derived consumer of the removed hosting (it answered from the hosting root's copies and its in-tree closed set). Principle 11 requires the design to list such consumers.
  - The design's own rule sends an unlisted reader upstream: "The implementation records the decision per file in its handoff. A reader not in this table is an escalation." The implementation recorded it as FU-009, a "product question", instead.
- **Decision the design must record:** what the poll answers for each run kind once children are their own runs: the children's statuses, read by each child's own identity, and a closed-set digest consistent with what each view lists (empty for an active view), without changing the web (the design keeps it unchanged). Then reflect FU-009 accordingly.
- **Suggested direction, not prescribed:**
  - each open local child's statuses from its own run (`TaskRunControl.ownStatus` / the paired-agent statuses);
  - for an active hub, the empty set's digest;
  - the inactive once-per-digest branch kept;
  - a test of the answer for an active hub with an open and a closed child.
- **Classification:** `Design Impact`, Solution Designer (an inadequate reviewed design: the derived-consumer inventory missed the poll).

### CR-461-003: A Task closure during a new delegated run's start does not stop it; the work packet starts it anyway (blocking)

- **Protects:** REQ-005 ("closing a Task stops its runs"); the design's race table row 5 ("A closure during the start finds the entry `starting` and stops the run once its root exists"); contract T-1.
- **Evidence:**
  - `toNewRun` checks `isOpen` once after the link (`task-delegation.ts:210-214`).
  - A DONE that commits after that check and before the new run's root has started reaches `stopForTaskClosure`. For a prepared, not-yet-active agent run, `terminateAgentRun` fails, `terminatedAt` is recorded and `true` is returned (`agent-run-service.ts:303-308`).
  - The work packet is then delivered by `deliverWorkPacket` → `acceptWorkPacket` (`task-delegation-composition.ts:50-54`; `standalone-root-message-delivery.ts:147-151`; `root-team-run.ts:310-311`) with no Task-side check, and it starts the run.
  - Unlike `acceptFromRun`, the packet path carries no `assertAllowed`.
- **Consequence:** E's sub-work run starts and works on a Task its assigner closed. Its reports are refused (R-8). It runs until idle shutdown, and its history row says it was terminated.
- **Required action:**
  - The work packet's acceptance in the new run's own gate re-checks the run's entry through the Task side (the same check as `assertAllowed`) and refuses when closed. `TaskDelegation` then discards the run and answers the existing closure text.
  - A test interleaves a DONE between the link and the packet, for agent and team runs.
  - With CR-461-001's re-check this also covers the stop arriving after the packet.
- **Classification:** `Local Fix`, implementation.

### CR-461-004: A team run's (and an org run's) token total no longer includes the runs delegated from it (blocking)

- **Protects:** REQ-009 (critical: "the delegating run's token roll-up (standalone, team and org totals include the work of the runs delegated from them, as today)"); AC-012; the design's readers table ("Token totals … Unchanged results. A total of a run covers its own agents and every run delegated from it, one hop at a time and recursively, from the Task entries, open and closed. Each run record is counted once, by run ID"); AR-012.
- **Evidence:**
  - At base, a copy hosted by a team root wrote its usage with `root_team_run_id` = that team (`token-usage-context-enricher.ts` @ `827f1e68dc`: "Only Team members roll up to a root TeamRun"), so `getTeamRunSummary` (rows by `rootTeamRunId`, `token-usage-run-store.ts:50-54`) included it.
  - Now a run delegated from a team member is its own root: its rows carry its own root. `getTeamRunTokenUsageSummary` (`token-usage-stats.ts:339-344`) is unchanged.
  - Only the standalone total uses `DelegationTree.subtreeOf` (`token-usage-stats.ts:324-335`).
  - No test covers a team total with delegated work.
- **Consequence:** after this change, a team (or org) run's total silently drops all work delegated from it.
- **Required action:**
  - Compute the team total, and the org total by the same rule wherever its total is read, as its own rows plus the rows of every run in `subtreeOf(that run)`, open and closed, each record counted once by run ID, as the standalone total does.
  - Add tests per kind.
  - Update `docs/modules/token_usage.md`.
- **Classification:** `Local Fix`, implementation.

### CR-461-005: Dead code and contradictory names in touched files (blocking, minor)

- **Protects:** Principle 7 (No Dead Code: touched files and modules); `DESIGN.md` rule 11 (no production code that only tests use); Principle 15 ("a qualifier that contradicts the thing … is a finding").
- **Evidence:**
  - the items in "Dead / Obsolete / Legacy Items Requiring Removal" above;
  - `ClosedDelegatedRunReader` (`run-history/services/closed-delegated-run-reader.ts`) now returns the runs delegated from a run, open and closed (`agentRunIds` over `subtreeOf`, `forAgentRunIds` over `childrenOf`). Its name says closed only;
  - `agent-org-run.ts:293` says "Shutdown of delegated children"; the code ends the org's own agents and teams.
- **Required action:**
  - Remove the listed dead code.
  - Rename the reader for what it reads (for example `DelegatedRunAgentsReader`).
  - Correct the comment.
- **Classification:** `Local Fix`, implementation.

## Follow-ups

- Follow-ups this review added: FU-011 (owners reached through process-wide `bind*`/`find*` singletons: hidden dependencies and composition order, and behavior decided by a missing binding; 7 bindings added by this ticket). Not blocking: the pattern predates the ticket, the design chose it, and the ticket works once the composition has run.
- FU-009 is reclassified into this ticket by CR-461-002. The Solution Designer decides it with CR-461-002. FU-008 and FU-010 stand.
- Recommendation, not a finding: add a direct test of `delegatedChildrenDtos` (open child shown, closed child absent, peer child excluded, unreadable own file left out with a warning).

## Classification

- CR-461-002: `Design Impact`, Solution Designer. The design's derived-consumer inventory missed the history poll, and the design names an unlisted reader as an escalation.
- CR-461-001, CR-461-003, CR-461-004, CR-461-005: `Local Fix`, implementation. Each restores an outcome the approved requirements and design already state, or applies a team rule:
  - CR-461-001: DS-5's "stop … in its gate", and the race table's "the gate runs either the closure stop or the delivery";
  - CR-461-003: race table row 5;
  - CR-461-004: the readers table's "unchanged results";
  - CR-461-005: Principle 7, `DESIGN.md` rule 11, Principle 15.
- Routing: the highest-order classification governs. The package goes to the Solution Designer, and the four Local Fixes ride with the revised package to implementation.

## Recommended Recipient

- `/software_engineering_team/solution_designer` (Design Impact governs; it carries the four implementation Local Fixes)

## Residual Risks

- The migration is fixture-tested only (by design; never on user data).
- The live child view has not been checked in a browser.
- `memory-collaboration-graphql.e2e` needs its API/E2E rewrite.
- The contract's stories against the server are owned by API/E2E.

## Latest Authoritative Result

- **Current (failure-origin review of API-REV-007, CRR-030): `Fail`.**
  - CR-461-059 and -061 reopened (`Local Fix`).
  - CR-461-066 (`Requirement Gap`).
  - Recipient: the Solution Designer.
  - The next implementation review is a full review.
- Round 22 (CRR-029): `Pass`. CR-461-065 is resolved; the base is merged at `3d738de6e6`; no finding is open. Next: API/E2E.
- Round 21 (CRR-028): `Fail`.
  - CR-461-057 and -059 … -064 are resolved; CR-461-058 is resolved for agent runs.
  - One Local Fix: CR-461-065, the deleted-Task refusal for team runs.
- Failure-origin review (CRR-027): `Fail`.
  - CR-461-057 … -063: `Local Fix`; -057, a regression, goes first.
  - CR-461-064: `Requirement Gap`.
  - Recipient: the Solution Designer.
- Round 20 (CRR-026): `Pass`. CR-461-056 is resolved (SR-074); no finding is open. Next: API/E2E.
- Round 19 (CRR-025): `Fail`.
  - CR-461-048 … -053 are resolved; CR-461-054 and -055 are implemented.
  - One Design Impact: CR-461-056, the Team tab's live rule against its read rule.
- Failure-origin review (CRR-024): `Fail`.
  - CR-461-048 … -053: `Local Fix`; CR-461-048 is data loss and goes first.
  - CR-461-054: `Design Impact`.
  - CR-461-055: `Requirement Gap`.
  - Recipient: the Solution Designer.
- Round 18 (CRR-023): `Pass`. CR-461-047 is resolved; no finding is open. Next: API/E2E.
- Round 17 (CRR-022): `Fail`.
  - CR-461-039 … -046 are resolved.
  - One Local Fix (CR-461-047): an owner for R-12's coordinator rule, and a dead export.
- Failure-origin review (CRR-021): `Fail`.
  - CR-461-039 … -044: `Local Fix`, implementation.
  - CR-461-045, -046: `Requirement Gap`, Solution Designer.
  - Recipient: the Solution Designer.
- Round 16 (CRR-020): `Pass`. CR-461-038 is resolved; no finding is open. Next: API/E2E.
- Round 15 (CRR-019): `Fail`. DS-15's fence is correct. One Local Fix (CR-461-038): a dead Org branch.
- Round 14 (CRR-018): `Pass`.
  - CR-461-035 is resolved by SR-069; CR-461-036 and -037 are resolved. No finding is open.
  - C14-01 (the list read's cost) is held for API/E2E. Next: API/E2E.
- Round 13 (CRR-017): `Fail`.
  - CR-461-030 … -034 are resolved: by design (SR-058 … SR-068), and in code.
  - New: CR-461-036 and -037 (`Local Fix`); CR-461-035 (`Design Impact`).
  - Recipient: the Solution Designer.
- Failure-origin review (CRR-016): `Fail`.
  - CR-461-031, -032, -034: `Local Fix`, implementation.
  - CR-461-030, -033: `Design Impact`, Solution Designer.
  - Recipient: the Solution Designer.
- Round 10 (CRR-015): `Pass`. CR-461-028 and -029 are resolved, and the merge of `origin/personal` is clean. No finding is open. Next: API/E2E.
- Round 9 (CRR-014): `Fail`.
  - CR-461-022 … -027 are resolved.
  - New: CR-461-028 and -029, both `Local Fix`, implementation. Overall 9.3.
- Round 8 (CRR-013): `Fail`.
  - CR-461-017 … -021 are resolved, with -020 and -021 completed by CR-461-022 and -027.
  - New Local Fixes: CR-461-022 … -026.
  - New Design Impact: CR-461-027.
  - Recipient: the Solution Designer.
- Failure-origin review (CRR-012): `Fail`.
  - CR-461-017 … -020: `Local Fix`, implementation.
  - CR-461-021: `Design Impact`, Solution Designer.
  - Recipient: the Solution Designer.
- Round 7 (CRR-011): `Pass`.
- Round 6 (CRR-010): `Fail`.
  - CR-461-014 and -015 are resolved.
  - New: CR-461-016 (`Local Fix`), a silent fallback in `orgAgentReadSubject`.
- Round 5 (CRR-009): `Fail`.
  - CR-461-009, -010 and -011 are resolved; CR-461-012 and -013 are resolved upstream (SR-054).
  - New: CR-461-014 and CR-461-015, both `Local Fix`, implementation.
- Failure-origin review (CRR-008): `Fail`.
  - CR-461-009, -010, -011: `Local Fix`, implementation.
  - CR-461-012, -013: `Requirement Gap`, Solution Designer.
  - O-1 is held for evidence.
  - Recipient: the Solution Designer. Earlier lines follow as history.
- Round 4 (CRR-007): `Pass`. CR-461-008 resolved; no finding open.
- Round 3 (CRR-006): `Fail`, one implementation Local Fix (CR-461-008). CR-461-001, -005, -006 and -007 resolved.
- Round 2 (CRR-005): `Fail`. CR-461-006 is a `Design Impact` (Solution Designer). CR-461-001 (residual), CR-461-005 (residual) and CR-461-007 are implementation Local Fixes. CR-461-002, CR-461-003 and CR-461-004 are resolved.** The round-1 lines below are history.
- Round 1 Review Decision: `Fail`
- Review Entry Point: `Implementation Review`
- Supported Product Scenario Gate: `Pass` (SCN-004a/b/c, SCN-001/003 and SCN-010 established independently; C-06 … C-13 rejected or noted)
- Material-Premise Gate: `Pass` (MP-A, MP-B, MP-C confirmed)
- Score Summary: 8.9 overall. Below 9.2: Spine 8.8, API 8.6, Naming 8.9, API/E2E Readiness 8.4, Runtime Correctness 8.4, Cleanup 8.9.
- Classification: CR-461-002 `Design Impact`; CR-461-001, -003, -004, -005 `Local Fix` (implementation)
- Recommended Recipient: `/software_engineering_team/solution_designer`
- Notes: task size `Large` and architectural risk `High` are preserved. The next round is a targeted re-review of CR-461-001 … CR-461-005 and their tests. It becomes a full re-audit if a fix spreads beyond those paths.
