# API/E2E Test Review Report: follow-ups-of-461-500 (autobyteus-500)

The latest result is **CRR-018: Pass** (API-REV-007, the eighth merged state). CRR-016, CRR-014, CRR-012, CRR-009, CRR-006 and CRR-005 follow as history.

## API-REV-007 (CRR-018)

- **Scope:** `d33103b732`. Docs are in `7b27e7fb9b`.
- **MO-1** (`delegated-run-own-attachment-links-startup.e2e.test.ts`, added to ALM-1):
  - **Setup:** the same released-shape data also holds 491's retired copies and a real AGY run of the Memory Compactor, and their ledger rows are removed so the removal runs again. That reproduces an install upgrading from a build before 491.
  - **Assertions, all positive:**
    - 491's removal is `SUCCEEDED`, attempt 1, "Scanned 2; migrated 2";
    - the order by timestamps: the attachment-link migration ends before its follow-up starts, and both end before 491's starts;
    - both copies are gone, and the run stays on disk and listed;
    - its continuation is refused `ACTIVATION_FAILED` with nothing answered;
    - a second start runs none of the three again.
  - The runtime's own not-found code (AGY's `AGY_AGENT_DEFINITION_MISSING` against AutoByteus' `RUN_NOT_FOUND`) is the same on base, recorded as FU-500-15 (b), and asserted as it is.
- **LRN-1/2** (`list-running-agents-native-and-mcp.e2e.test.ts`, new):
  - **Real triggers:** two built Studios paired by invite with signed peer requests; the native tool is called by an AutoByteus run (an emulated LM Studio makes the real tool call), and the MCP route by the scripted AGY CLI.
  - **LRN-1 assertions:** each route's local list (without the caller), entries identical across routes and without `node`; the peer list with `node` on each entry; the "turned off" refusal with `node` when the switch is off, with the local list still answering.
  - **LRN-2** (the application host) asserts 492's same-senders rule: each route's outcome equals `list_available_agents`', and never a peer's list. It is the same on base; FU-500-15 (a) records that the host's "off" value is reached only by units.
  - The one fixed wait (2 s) is teardown grace before `SIGKILL`.
  - **Note, not a finding:** `mcpCall` counts `CALLED:` replies, the pattern RC-19 outgrew. LRN's runs make a few calls, far from the 100-event window, so it's sound here.
- **`remote-delegation-two-server.e2e` `calls()`:**
  - It waits for the newest reply entry not in the view before the call, instead of a count. The cause is evidenced: the run view keeps the last 100 events (`RECENT_RUN_PROJECTION_EVENT_LIMIT`), so a long-lived delegator's count stopped growing, and RC-19 timed out with its reply present.
  - No assertion changed; the failure message now names the entries in view. The file is 49/49, and RC-19 takes 740 ms.
- **Checks:** names and intent clear; assertions prove the requirements (the migration order, the discovery on both routes, the same-senders rule); helpers reused (`pairNodes`, the built-server launch); no skips beyond the env gate.
- **Result: Pass.** No findings. Recipient: `/delivery_engineer`.

---

## API-REV-006 (CRR-016)

- **Scope:** `94376f166d..2c03613d36`. No durable test file changed; `2c03613d36` touches only ticket documents (`git diff --name-only` outside `tickets/` is empty).
- **The round's evidence, for delivery:**
  - AC-005: the merged watcher test (517's limits) passes 5/5 on Linux, 14/14 each, with 0 labels.
  - 517's areas pass in Linux: package live refresh, the background-task status counts, the Grok replay, the Antigravity background transport and monitor, and the skill folder watcher.
  - The phone probe's guard finds 76 IDs and 0 duplicates.
  - Container-only failures are root-user artifacts (chmod-unreadable folders, EACCES, 403); they pass on the Mac.
  - FU-500-14: two of 517's own rename cases time out on a loaded Mac and pass in Linux. Their files are identical to base.
- **Result: Not Applicable** (no durable test change). Recipient: `/delivery_engineer`.

---

## API-REV-005 (CRR-014)

- **Scope:** `16559affdd`. Docs are in `da35a5d301`.
- **RR-12** (`restart-reminder-built-server.e2e.test.ts`, added):
  - **The trigger:** a real update restart, from the previous release's build to this one, of a native Team member that is idle with a background task. The user's input goes on the Team stream after its `CONNECTED`, so FU-036's rule is respected.
  - **What it asserts positively:**
    - the record entry (`idle`, `backgroundTasks: true`) and `shutdownAt`;
    - the reminder reaches the member's model once, as the user's message, with the header, "an update to v<this release>" and the background line;
    - the next input carries no header;
    - the pending reminders are empty;
    - the conversation shows the notice exactly once.
  - The one fixed wait (8 s) is a bounded window for a duplicate notice, checked by `toHaveLength(1)`. A missing value (`orNull`) fails the positive assertions loudly.
  - It covers the merged resumer's member path with 526's whole notice message.
- **SIR-002** (`skill-improvement-removal-cases.mjs`): the byte-identity check also leaves out `restart-resume/` (448's runtime record, written live and at every graceful stop), with its reason, beside `memory/episodic/` and the run history index. That is narrow: every other file is still compared, and a second start changes nothing.
- **The temporary stop test** was removed after its run (evidence only), as it should be.
- **Checks:** names and intent clear; assertions prove the requirement; setup reuses the file's helpers (`previousReleaseOf`, `newNode`, the scripted model); no skips beyond the file's live gates.
- **Result: Pass.** No findings. Recipient: `/delivery_engineer`.

---

## API-REV-004 (CRR-012)

- **Scope:** `696acc408c` (TS-009; SIR-002's exclusion) and `8d14de45e3` (OT-2's fingerprint). Docs are in `1dbdab9b61`. The failure-origin review of F-4 is CRR-011 in `code-review-report.md`.
- **TS-009** (`team-status-live-probe.mjs`):
  - It enters through the real trigger, a scripted background step sent to an Org run's manager and to a member of its mounted Team.
  - It asserts positively: the Org agent row's label carries "Background task running" with the active dot that doesn't pulse; the Org Team row ends with ". Background task running"; both return to Idle ("…, idle, …" and ". Team status: Idle").
  - It keeps the labels as details on a failure.
  - It covers 448 part 2's merged rows (`AgentOrgRunMemberTree.vue`).
- **SIR-002** (`skill-improvement-removal-cases.mjs`): the byte-identity check leaves out the derived `memory/episodic/`, with its reason, as it already did the run history index. That is narrow: every other file is still compared.
- **OT-2** (`open-task-tree-upgrade-startup.e2e.test.ts`): "reading the trees wrote nothing" compares `memory/` without `episodic/`, with a comment naming CRR-011's mechanism. Every other file is still compared. The later comparison (`:292`) checks only the runs' own files and one run folder, so it rightly stays as it is. OT-1 … OT-3 pass 3/3 at load 66–85.
- **FU-500-13** records OT-2's base-side failure under load (493's start-pass timing).
- **Checks:** names and intent clear; assertions prove the requirement; exclusions narrow and explained; no skips; real triggers.
- **Result: Pass.** No findings. Recipient: `/delivery_engineer`.

---

## API-REV-003 (CRR-009)

- **Scope:** `d600a2af71`, `project-task-boundaries.e2e.test.ts` E-007 (+8 / −2). Docs are in `cfbbd1af8e`.
- **The change:**
  - E-007 releases the process Task service mid-test to read the Task entries on disk "as a restart reads them". Before, the lazy getter rebuilt the service; FU-011 removed that getter.
  - The test now composes the Task side again from disk with the hosts' own `composeTaskSide`, plus the shared `NO_RUN_SIDE_TASK_PORTS` (no running roots), and initializes the process instance.
  - That is the real restart path, not a fake, and the file's reset (`releaseComposedProjectTaskService`) releases it afterwards.
  - 18/18; the type gate is at baseline.
- **Checks:** names and intent are clear (the comment says why); the assertions are unchanged; the setup reuses the shared helper; nothing stale or skipped.
- **The merged state's evidence (API-REV-003):**
  - This ticket's cases pass in the full server E2E run: ALM-1, RSE-1, ODM-1, LTI-1, E-002, SCP, DCM, DTL, DLC, RC 46/46, and the G-5 and FU-011 suites.
  - Each remaining failure was classified alone, on the branch and on base `ff13782f36`: load, FSEvents, or the same on base (FU-500-09, FU-500-12).
  - AC-005: Linux 5/5 on the merged state.
  - Browser cases: 8/8, and the composer 12/12.
- **Result: Pass.** No findings. Recipient: `/delivery_engineer`.

---

## Recheck (CRR-006)

- **Scope:** `73bfba186c` (test) and `642737b97a` (docs). API/E2E's handoff first named other hashes and then corrected them; the branch holds these.
- **CR-500-006: Resolved.** ODM-1 now asserts each path's own answer and keeps the G-5 negatives:
  - step b contains `MODEL_IDENTIFIER_NOT_AVAILABLE`;
  - step c contains `AgentDefinition with ID ${retired} not found`;
  - the lead's options are checked every time (`modelListReadable: true`, the LM Studio model), and the message lists the scopes if the lead's is missing.
- **Rerun:** "Tests 1 passed (1)" (`/tmp/api500/r2/odm3.log`).
- **The optional suggestion, declined:** the reason holds. Detecting "no composition yet" another way would need a test-only query in product code, and the helper rethrows any other error.
- **Result: Pass.** Recipient: `/delivery_engineer`.

---

## Review Meta

- Review Round: 1 (proportional test-code review)
- Trigger: API-REV-002 Pass (95%) on CRR-004; head `7529c27723`.
- Scope: `c0770ea7b0` (round 1) and `a7e76ca248` (round 2).
- Context read: the requirements (AC-005 … AC-012), design G-5 (SR-015/016), `code-review-report.md` (CRR-003, CRR-004), `api-e2e-execution-coverage-report.md`, `API-r2-runs.txt`.
- Current Code Review Revision ID: `CRR-005`
- Prior unresolved test-review findings: none (first test review).
- Project testing guideline: `TESTING.md`, including its Gates rule from 461 (clients found by search, rules readable from source checked by a unit test). No conflicts.
- Supported Product Scenario Basis Confirmed: `Yes`

## Changed Durable Test Scope

| Durable test path | Change | Scenario / requirement | Notes |
| --- | --- | --- | --- |
| `tests/e2e/agent/run-stream-early-command.e2e.test.ts` (RSE-1) | Added | AC-006 / FU-036 | Asserts that each early command gets exactly one answer, `SESSION_NOT_READY` or an ack. A positive proof that nothing is dropped. |
| `tests/e2e/app-data-migrations/delegated-run-own-attachment-links-startup.e2e.test.ts` (ALM-1) | Added | AC-008 / FU-020 | Built server, product-written links, byte identity, backups, the removed route's 404, a second start. |
| `tests/e2e/llm-management/on-demand-stored-models-startup.e2e.test.ts` (ODM-1) | Added | AC-012 / G-5 R1, R2 | Real restarts over emulated LM Studio and Ollama. See CR-500-006. |
| `autobyteus-web/tests/e2e/stored-model-not-offered-cases.mjs` (G5-001…003) | Added | AC-012 browser | — |
| `tests/unit/e2e-helpers/team-stream-clients-wait-for-connected.test.ts` | Updated | FU-036 static check | A named exemption with its reason, and a case that removes the exemption when the file stops sending early. Good. |
| `late-team-history-index-v2-startup.e2e` (LTI-1) | Updated | AC-010 / G-2 | Now asserts that the user-started row is kept; base's record of dropping it is turned into the requirement. |
| `append-only-message-logs-startup.e2e` | Updated | FU-020 | The run's own link answers 200; the removed hub route answers 404. |
| `delegated-copy-model-change`, `delegated-team-lazy-member-activation`, `removed-remote-provider-saved-selection` | Updated | G-5 | The runtime's own code is replaced by G-5's text. The removed provider is an AutoByteus remote server, not loaded on demand, so G-5 answers, which is correct. |
| `remote-delegation-two-server` (RC-04/RC-17) | Updated | FU-030 | A peer's refusal keeps the peer's reason only. |
| Five project e2e harnesses, `explicit-host-collaborators.ts`, `project-task-tool-writer.mjs` | Updated | FU-011 | The Task service is the composition's; the tool-only fixture composes its own Task side. |
| `delegated-launch-defaults-probe.mjs` | Updated | FU-030 / CR-500-005 | DLP-005's inherited text. |

## Proportional Test-Code Checks

| Check | Result | Evidence / Notes |
| --- | --- | --- |
| Scenario grouping and names clear | Pass | Each file names its ACs and steps in its header. |
| Assertions prove the requirement | **Fail** | CR-500-006: two ODM-1 outcomes are asserted only by what they must not contain. |
| Fixtures and helpers reused | Pass | `startBuiltStudio`, `waitConnected`, `agentStreamFramesOf`; one release helper for the five harnesses. |
| Isolation and determinism | Pass | Emulated hosts on loopback; the one fixed wait (RSE-1, 500 ms) checks that nothing more arrives. |
| Large files coherent | Pass | ALM-1 (250 lines) and ODM-1 (235) each cover one surface. |
| No stale, disabled or compatibility-only tests | Pass | Gated `describe.skip` only behind each file's documented environment switch. |
| Coverage agrees with the investigation and evidence | Pass | — |
| Fixtures don't establish scenarios by themselves | Pass | Each case follows a requirement's scenario. |
| Real trigger, real steps | Pass | Built server, real restarts, real HTTP, GraphQL and WebSocket. |

## Findings

| Finding ID | Test path / scenario | Evidence | Required action | Classification / owner |
| --- | --- | --- | --- | --- |
| CR-500-006 | `on-demand-stored-models-startup.e2e.test.ts` ODM-1, steps b and c | Step b, host down: `:200` only checks that the error doesn't contain G-5's text, with `answered === false`. Step c, retired member: `:230` likewise only checks for the absence of G-5's text. A **silent non-answer** (no error frame at all, the defect class F-3 looked like in round 1 and that this ticket removes) passes both. The requirements are positive: AC-012 "with the list unreadable, the start proceeds as today", and SR-015 R2 "the path's own not-found answers". `API-r2-runs.txt` shows the real texts (`MODEL_IDENTIFIER_NOT_AVAILABLE`; "AgentDefinition with ID … not found."), but nothing asserts them. Also `:189`: `if (results.restart.leadOptions) expect(…)` skips the lead's "no note" check when the options are missing. | Assert each path's own answer positively: step b contains `MODEL_IDENTIFIER_NOT_AVAILABLE`, step c contains "AgentDefinition with ID" … "not found", keeping the G-5 negatives. Make the lead's options check unconditional, or state in the test why a member has no options. Rerun ODM-1. | `Local Fix`, API/E2E-owned |

**Suggestion (not a finding):** `releaseComposedProjectTaskService` recognizes "no composition yet" by matching the getter's message text ("is created by the composition"). A rename of that message would fall into the `throw`, loudly, so it's safe, but a small exported check on the service module would be sturdier. Optional.

## Follow-ups

- None added by this review. API/E2E recorded FU-500-09 … FU-500-11.

## Result

- **Fail**, Local Fix (CR-500-006). Recipient: `/api_e2e_engineer`.
- After the fix: a rerun of ODM-1, then a quick recheck here, then delivery.
