# API/E2E Revision Record

The history of this ticket's API/E2E results. The investigation and the execution report remain the current truth.

### API-REV-001: round 1 (CRR-002): AC-005 proven on Linux; G-5 rendered; three failures (F-1 … F-3)

- Triggering role, report path, and round: `/code_reviewer`, `code-review-report.md` (CRR-002 Pass; code `cc8dbce099`), API/E2E round 1.
- Triggering finding or case IDs: none (the first round). The reviewer's list: AC-005 on Linux, FU-020 on real-shaped data with C-6's timing, G-5 with its browser render, FU-036 on the org and collaboration streams, the FU-030 text assertions, G-1/G-2.
- Why this revision was recorded: the baseline result.
- Coverage decisions or durable test paths changed:
  - added: `delegated-run-own-attachment-links-startup.e2e.test.ts` (ALM-1), `run-stream-early-command.e2e.test.ts` (RSE-1), the G5 probe cases;
  - updated: LTI-1 (asserts G-2); 13 tests this ticket made untrue (FU-011 harnesses, FU-020 route, G-5 codes, FU-030 texts), listed in the report.

#### Prior Failure Resolution

None (the first round).

- Canonical artifacts and sections updated: the coverage investigation; the execution report; the progress log; `evidence/api-e2e/API-r1-runs.txt` and screenshots; `follow-ups.md` (FU-500-09, FU-500-10).
- Prior result and confidence: none.
- Current result and confidence: `Fail` / 86%.
- New or remaining failure IDs: F-1 (E-002: a retired agent's run gets the G-5 refusal), F-2 (the inherited-layer delegation refusal has no FU-030 next step), F-3 (SCP-E2E-006: the native mate gets no answer after a restart).
- Recommended owner: the Code Reviewer, for failure-origin review (preliminary: F-1 Design Impact, F-2 Local Fix, F-3 Unclear).
- Remaining risks, blocked evidence, or untested scope:
  - quiet macOS for the watcher (Not Tested: load 60–100 all day);
  - LE-F1 live on Claude (Next Round);
  - M-6 cold cache (no sudo);
  - the founder's own data (his approval).

### API-REV-002: round 2 (CRR-004): F-1 … F-3 resolved; on-demand AutoByteus models across restarts; Pass

- Triggering role, report path, and round: `/code_reviewer`, `code-review-report.md` (CRR-004 Pass on IR-003; head `c22af3b892`, code `7eb78a701b`), API/E2E round 2.
- Triggering finding or case IDs: F-1 (CR-500-004), F-2 (CR-500-005), F-3 (CR-500-003); the reviewer's items 2–5.
- Why this revision was recorded: the rerun after the fixes.
- Coverage decisions or durable test paths changed:
  - added `on-demand-stored-models-startup.e2e.test.ts` (ODM-1);
  - `team-stream-clients-wait-for-connected.test.ts` exempts RSE-1 by name, and checks that each exemption is still needed.

#### Prior Failure Resolution

- F-1: resolved. E-002 4/4: the retired agent's run gets `RUN_NOT_FOUND`, "AgentDefinition … not found"; ODM-1 shows the same for a member whose definition was removed.
- F-2: resolved. The DLC case and probe DLP-005 pass with the new next step; LE-F1 passes live on Claude.
- F-3: resolved. SCP-E2E-006 6/6; ODM-1 starts LM Studio and Ollama models after real restarts.
- Correction: in round 1 the mate did get a `RUN_MODEL_NOT_OFFERED` ERROR frame (CRR-003); my helper waited for a tool result.

- Canonical artifacts and sections updated: the execution report (Round, Routing, Cases, Findings, AC proof, scorecard, Durable Coverage, Cleanup, Result); the progress log; `evidence/api-e2e/API-r2-runs.txt` and screenshots; `follow-ups.md` (FU-500-11).
- Prior result and confidence: `Fail` / 86%
- Current result and confidence: `Pass` / 95%
- New or remaining failure IDs: none
- Recommended owner: the Code Reviewer, for the proportional test-code review of `c0770ea7b0` and this round's test commit, then delivery.
- Remaining risks, blocked evidence, or untested scope:
  - quiet macOS (Not Tested);
  - M-6 cold cache;
  - the founder's own data (his approval);
  - LM Studio and Ollama emulated;
  - FU-500-09 … 11.

#### Addendum: CR-500-006 (CRR-005, test-code review) fixed

- ODM-1 now asserts the positive answers:
  - host down: the start's own `MODEL_IDENTIFIER_NOT_AVAILABLE`;
  - removed agent: "AgentDefinition with ID … not found";
  - the lead's Settings options: unconditional.
- Rerun: Pass (`API-r2-runs.txt` §6). The result stays `Pass` / 95%.
- Optional suggestion not taken: detecting "no composition yet" without the getter's text needs a new query function in `project-task-service.ts` (product code) for tests only; the helper rethrows any other error, so a changed text fails loudly.

### API-REV-003: round 3, the merged state (the Delivery Engineer's request): Pass after one test fix

- Triggering role, report path, and round: `/delivery_engineer`, `release-deployment-report.md` and `evidence/delivery/DEL-01-merged-state-server-e2e-summary.txt` (the merged state `eb741a097e`, its server E2E stopped at 2 h with 21 files failing), API/E2E round 3.
- Triggering finding or case IDs: DEL-01's failing files.
- Why this revision was recorded: validation of the merged code, which API-REV-002 did not cover.
- Coverage decisions or durable test paths changed:
  - `project-task-boundaries.e2e.test.ts` E-007: the mid-test "release and build again" now composes the Task side again from disk (FU-011 removed the lazy process instance it relied on; my round-1 harness update released without rebuilding).
  - `follow-ups.md`: FU-500-12.

#### Prior Failure Resolution

- DEL-01's list, by file:
  - pass in the full merged run or alone (load): remote-delegation-two-server, team-run-config-graphql, stopped-run-model-config, runtime-switch-members, qwen-configuration, custom-provider-readable-id, memory-sync, update-notifications, team-run-v1, registered-package-definition-edit, agy-linked-skills, delegated-team-lazy-member-activation;
  - fail on the merged base too: collaboration-prompt-wording, agent-semantic-memory, request-origin-and-phone-routes, available-agent-runtimes, configured-skill-on-demand-loading (FU-500-12, FU-500-09);
  - project-task-boundaries: E-007 fixed (mine); the package watcher is FSEvents (passes alone).

- Canonical artifacts and sections updated: the execution report (Round, Routing, Environments, Findings, AC-005, Cleanup, Result); the progress log; `evidence/api-e2e/API-r3-runs.txt`; `follow-ups.md`.
- Prior result and confidence: `Pass` / 95% (pre-merge)
- Current result and confidence: `Pass` / 95% (merged state)
- New or remaining failure IDs: none
- Recommended owner: the Code Reviewer (the E-007 test change), then delivery.
- Remaining risks, blocked evidence, or untested scope:
  - quiet macOS (Not Tested);
  - M-6 cold cache;
  - the founder's own data;
  - LM Studio and Ollama emulated;
  - FU-500-09 … 12.

### API-REV-004: round 4, the third merged state (CRR-010): the merge's focus proven; F-4 open; Fail

- Triggering role, report path, and round: `/code_reviewer`, `code-review-report.md` (round 6, CRR-010 Pass on IR-006; head `44fec882bc`), API/E2E round 4.
- Triggering finding or case IDs: the merge of `0570c47fd9`: 448 part 2's background-task counts through this ticket's names, 493's episodic catalog.
- Why this revision was recorded: validation of the third merged state.
- Coverage decisions or durable test paths changed:
  - `team-status-live-probe.mjs`: new TS-009 (the Org agent row and the Org Team row with a background task);
  - `skill-improvement-removal-cases.mjs` SIR-002: leaves 493's derived `memory/episodic/` out of the byte-identity check, as the run history index already is.

#### Prior Failure Resolution

None open from round 3.

- New finding **F-4**:
  - `open-task-tree-upgrade-startup` OT-2 fails ("reading the trees wrote nothing"): on the branch, the start writes 493's episodic catalog files; OT-3 fails with it, because it needs OT-2's run.
  - It fails on the Mac and in Linux; base `0570c47fd9` passes 3/3.
  - Origin `Unclear`.

- Canonical artifacts and sections updated: the execution report (Round, Routing, Result); the progress log; `evidence/api-e2e/API-r4-runs.txt`.
- Prior result and confidence: `Pass` / 95% (round 3)
- Current result and confidence: `Fail` / 90%
- New or remaining failure IDs: F-4
- Recommended owner: the Code Reviewer, for failure-origin review.
- Remaining risks, blocked evidence, or untested scope:
  - BTS-04/05 (live Claude/Codex gates, not run);
  - quiet macOS;
  - M-6 cold cache;
  - the founder's own data;
  - LM Studio and Ollama emulated;
  - FU-500-09 … 12.

#### Addendum: F-4 resolved (CRR-011)

- Origin: test-side and present on base `0570c47fd9` too (the code reviewer reproduced it there). 493's episodic catalog rebuilds at start when the previous server stopped before its refresh; my earlier base pass was timing.
- Fix: OT-2's "a read writes nothing" leaves the derived `memory/episodic/` out. OT-1 … OT-3 3/3. FU-500-13 records 493's start-pass timing for its area.
- Result: `Pass` / 95%.

### API-REV-005: round 5, the fourth merged state (CRR-013): Pass

- Triggering role, report path, and round: `/code_reviewer`, `code-review-report.md` (round 7, CRR-013 Pass on IR-007; head `d141a2e783`), API/E2E round 5.
- Triggering finding or case IDs: the merge of `24d438fa31` (524's process resources and file-watch stop at exit; 526's whole restart notice message with this ticket's `readyAgent`).
- Why this revision was recorded: validation of the fourth merged state.
- Coverage decisions or durable test paths changed:
  - `restart-reminder-built-server.e2e.test.ts`: new RR-12 (a Team member at an update restart: woken once, its next input carries nothing, the notice shown once);
  - `skill-improvement-removal-cases.mjs` SIR-002: leaves 448's `restart-resume/` runtime records out of the byte-identity check, beside `memory/episodic/`.
  - Scope: proportional to the merge's two conflicts. The full folder was not rerun; rounds 3–4 ran it to the end.

#### Prior Failure Resolution

None open (F-4 resolved in round 4).

- Canonical artifacts and sections updated: the execution report (Round, Routing, Result); the progress log; `evidence/api-e2e/API-r5-runs.txt`.
- Prior result and confidence: `Pass` / 95% (round 4)
- Current result and confidence: `Pass` / 95%
- New or remaining failure IDs: none
- Recommended owner: the Code Reviewer, for the proportional test-code review of RR-12 and the SIR-002 change, then delivery.
- Remaining risks, blocked evidence, or untested scope:
  - RR-07…09 live and RR-11 (they need a build from before 526) not run;
  - quiet macOS;
  - M-6 cold cache;
  - the founder's own data;
  - LM Studio and Ollama emulated;
  - FU-500-09 … 13.

### API-REV-006: round 6, the seventh merged state (CRR-015): AC-005 5/5 on Linux; Pass

- Triggering role, report path, and round: `/code_reviewer`, `code-review-report.md` (round 8, CRR-015 Pass on IR-008; head `94376f166d`, merge `bb42531c7d` of `75048cbaf4`), API/E2E round 6.
- Triggering finding or case IDs: the watcher test after 517 (the one conflict); 517's shared limits and AGY background monitor.
- Why this revision was recorded: AC-005's gate on the merged commit.
- Coverage decisions or durable test paths changed: none by me. `follow-ups.md`: FU-500-14.

#### Prior Failure Resolution

None open.

- Canonical artifacts and sections updated: the execution report (Round, Routing, Result); the progress log; `evidence/api-e2e/API-r6-runs.txt`.
- Prior result and confidence: `Pass` / 95% (round 5)
- Current result and confidence: `Pass` / 95%
- New or remaining failure IDs: none
- Recommended owner: the Code Reviewer (no test change of mine this round), then delivery.
- Remaining risks, blocked evidence, or untested scope:
  - quiet macOS (load 45–63 today);
  - M-6 cold cache;
  - the founder's own data;
  - LM Studio and Ollama emulated;
  - FU-500-09 … 14.

### API-REV-007: round 7, the eighth merged state (CRR-017): migration order, list_running_agents on both routes, 492's messaging; Pass

- Triggering role, report path, and round: `/code_reviewer`, `code-review-report.md` (round 9, CRR-017 Pass on IR-009; head `2037a3be5a`, merge `5eb8246076` of `53b72018ad`, plus `8e8c21c2c4`), API/E2E round 7.
- Triggering finding or case IDs: the reviewer's list: 492's messaging (unrelated runs, not running, Task-related, the peer receiver); `list_running_agents` local, with `node` and with remote collaboration off, native and MCP; the three new migrations on one first start and the order test; this ticket's merged cases.
- Why this revision was recorded: validation of the eighth merged state.
- Coverage decisions or durable test paths changed:
  - `delegated-run-own-attachment-links-startup.e2e.test.ts`: MO-1 (491's retired copies and a real compactor run in ALM-1's data; all three migrations in order on one start; the run kept, listed, its continuation refused by AGY's own missing-definition answer; a second start unchanged);
  - new `list-running-agents-native-and-mcp.e2e.test.ts`: LRN-1 (two paired Studios: local, `node`, switch off, both routes the same), LRN-2 (the application host: the same outcome from both discovery tools on each route);
  - `remote-delegation-two-server.e2e.test.ts` `calls()`: waits for the newest reply entry not in view before the call (the run view holds the last 100 events). No assertion changed.
  - `follow-ups.md`: FU-500-15; FU-500-10 resolved by 492.

#### Prior Failure Resolution

None open from round 6. This round's own first results:
- MO-1's first attempt asserted E-002's AutoByteus answer (`RUN_NOT_FOUND`); an AGY run answers `ACTIVATION_FAILED` "AGY_AGENT_DEFINITION_MISSING: …" (its backend's, unchanged since the AGY baseline). The test now asserts the AGY answer; the runtime difference is FU-500-15 (b).
- RC-19 timed out twice in the whole file with its answer already in view: the helper's count-based wait. Fixed; 49/49.
- LRN-2: an application's agent gets neither discovery tool on either route, the same at base `53b72018ad` (its own worktree). LRN-2 asserts 492's same-senders rule; FU-500-15 (a).
- RRB-3 failed once in the chain on AGY's 15 s discovery bound at load; alone 3/3.

- Canonical artifacts and sections updated: the coverage investigation (Round 7 Updates); the execution report (Round, Routing, Environments, Cases, AC proof, Durable Coverage, Cleanup, Result); the progress log; `evidence/api-e2e/API-r7-runs.txt`; `follow-ups.md`.
- Prior result and confidence: `Pass` / 95% (round 6)
- Current result and confidence: `Pass` / 95%
- New or remaining failure IDs: none
- Recommended owner: the Code Reviewer, for the proportional test-code review of MO-1, LRN-1/LRN-2 and the `calls()` change, then delivery.
- Remaining risks, blocked evidence, or untested scope:
  - the application host's "turned off" discovery answer is reached by units only (FU-500-15 a);
  - quiet macOS (the merge touches no watcher file; round 6's Linux 5/5 stands);
  - M-6 cold cache;
  - the founder's own data;
  - LM Studio and Ollama emulated;
  - FU-500-09, FU-500-11 … 15.
