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
