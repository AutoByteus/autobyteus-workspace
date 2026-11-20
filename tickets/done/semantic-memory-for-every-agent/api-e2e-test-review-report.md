# API/E2E Test Review Report

## Latest Round (CRR-007, test review round 2)

- Trigger: API-REV-003 `Pass` on the merged state. Code `27498a16ac` (the delivery Local Fixes LF-1…LF-4 on the merge `7ac6b392c1`); API/E2E's comment-only test fix `d0770bcb5b`; reports `afdd1f7474`.
- Changed durable tests: LF-2 `tests/e2e/projects/collaboration-prompt-wording.e2e.test.ts` (`27498a16ac`, `d0770bcb5b`) and LF-3 `tests/e2e/run-history/open-task-tree-upgrade-startup.e2e.test.ts` (`27498a16ac`). No other test file changed after `27498a16ac` (`git diff 27498a16ac afdd1f7474`).
- Prior unresolved test-review findings rechecked: none. TN-01 and TN-02 remain non-blocking notes.
- Proportional checks for the two files:
  - **LF-2:** `collaborationPart` also ends at `## Semantic Memory` and `## Global Semantic Memory`, which every prompt now has after the collaboration block (REQ-001, REQ-011; the second alone when the agent's folder could not be prepared, DEC-015). The collaboration assertions are unchanged, so the excerpt still proves the same wording. `d0770bcb5b` brings the doc comment in line with the code.
  - **LF-3:** OT-1 waits up to 60 s, with the `until` helper as IA-03 does, for the three closed runs among the worker's episodes (the catalog's designed quiet window, N-9). On a timeout it reads once more, so each `toContain` names the missing run. AC-012's assertion is kept, not loosened. OT-2 reads runs already on disk and waits for the start pass; it is deterministic and unchanged.
  - Both enter through their real triggers (real servers and runs, the scripted AGY CLI as before) and are isolated as before.
- Execution evidence: API-17. Each file alone, twice, on the rebuilt merged-state server (API-00 round 3): CPW 14/14 and 14/14; OT 3/3 and 3/3. The OT-1 test took 68 s and 21 s in total; its wait is bounded at 60 s within that.
- Result: **`Pass`**. No findings.

## Review Meta (round 1, CRR-005)



- Review Round: 1
- Trigger: API-REV-002 `Pass` (95.1%), with a request for proportional review of the durable tests changed in API/E2E rounds 1 and 2
- Requirements Doc Reviewed As Context: `requirements-doc.md` (SR-009; REQ-001, REQ-007, REQ-010; AC-001…AC-014; DEC-015, DEC-016)
- Investigation Notes Reviewed As Context: through the design spec
- Solution Revision Record Reviewed As Context: SR-009
- Design Spec Reviewed As Context: `design-spec.md` (SR-009)
- Supplemental Task Artifacts Reviewed As Context: the UI/UX spec (through the probe); `follow-ups.md` (FU-003…FU-005)
- Architecture Review Revision Record Reviewed As Context: ARCH-REV-005 (N-12…N-14)
- Implementation Revision Record Reviewed As Context: IR-003
- Original Code Review Report: `code-review-report.md` (CRR-004 `Pass`)
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-005`
- Coverage Investigation: `api-e2e-coverage-investigation.md`
- Execution Coverage Report: `api-e2e-execution-coverage-report.md` (Acceptance-Criteria Proof, Cases)
- API/E2E Revision Record Reviewed As Context: API-REV-001, API-REV-002
- Delivery Revision Record Reviewed As Context: N/A
- API/E2E Result: `Pass` on code `f393f403d5`. Test commits: `e571b1dd9e` (round 1), `5edda27b2d`, `42c2f5189b`; reports in `5efb92a8b2`.
- Final Validation Confidence: 95.1% (API/E2E's figure; no category below 90%)
- Prior unresolved test-review findings rechecked: none (first test review)
- Project testing guideline applied: `TESTING.md`:
  - test-owned data only;
  - the test vault for the live runs;
  - the fresh-start build (API-11);
  - § Environments, headless Linux and containers (see TN-01).
  - No conflicts.
- Supported Product Scenario Basis Confirmed: `Yes`

## Changed Durable Test Scope

| Durable Test Path | Change | Related Scenario / Requirement | Coherent Test Responsibility | Notes |
| --- | --- | --- | --- | --- |
| `tests/e2e/runtime/application-import-codex-launch.e2e.test.ts` | Updated: IC-03 (`42c2f5189b`) | AC-013, DEC-016, REQ-001 (application-owned) | A Codex-default application launched in a real studio server | Sets `codex-turn complete` for the whole file (so IC-01/02 also run with turns that end; both pass) |
| `tests/fixtures/agent-runtimes-fake-cli.mjs` | Updated (`42c2f5189b`) | — | The scripted runtime CLIs | Records each `thread/start` prompt; opt-in `codex-turn complete`; the default is unchanged |
| `tests/e2e/agent-definitions/agent-semantic-memory.e2e.test.ts` | Updated: SM-12 (`42c2f5189b`) | AC-014, DEC-015 | Semantic memory at the real server boundary | Gated with the scripted AGY CLI, like the other run cases |
| `tests/e2e/agent-definitions/agent-package-private-skills.e2e.test.ts`, `tests/e2e/runtime/configured-skill-on-demand-loading.e2e.test.ts` | Updated (`5edda27b2d`) | Stale tests (this change made them untrue) | — | Workspace doubles gain `getOrCreateRunWorkspace` and `getRegisteredWorkspaceRootPath`; the expected headings gain the two sections |
| `tests/e2e/memory-sync/memory-sync-api.e2e.test.ts`, `memory-sync-multiprocess.e2e.test.ts` | Updated (`5edda27b2d`) | Stale tests | — | They drop the removed card field `memory`. `memory-sync-api` binds an episodic catalog as a composition root does. |
| `tests/integration/agent-execution/agent-run-manager.memory-layout.real.integration.test.ts`, `agent-run-prompt-fallback.integration.test.ts`, `tests/integration/agent-tools/mcp/agent-tools-mcp-routes.integration.test.ts` | Updated (`e571b1dd9e`) | Stale doubles | — | Run-workspace check doubles |
| `autobyteus-web/tests/e2e/semantic-memory-view-probe.mjs` | Updated: SMV-090/091 (`e571b1dd9e`) | CR-001, REQ-007 | The rendered Memory page probe | Holds the first listing, leaves through Chat, checks the workspace menu |

- No durable test file changed: `No`

## Proportional Test-Code Checks

| Check | Result | Evidence / Notes |
| --- | --- | --- |
| Scenario grouping and names make intent clear | Pass | Each new case names its AC and decision (IC-03 AC-013; SM-12 AC-014, DEC-015; SMV-090/091 CR-001). Each stale rewrite comments its reason (autobyteus-554). |
| Assertions prove approved requirements instead of incidental implementation details | Pass | **IC-03:** rebuilds the folder name from DEC-016's text, not the layout code (an independent oracle; the negative control `API-15nc` fails with a 100-byte prefix). It reaches the folder the way the Memory page does (team cards → members → `agentSemanticMemoryFolder`), checks both sections and the folder named exactly once in the real Codex `thread/start` prompt, the same name for the episodic catalog, and every name ≤ 255 bytes. **SM-12:** the exact log payload (`definitionId`, `folder: "agent"`, `EACCES`), no agent folder created, the global section kept. **SMV-091:** `menuOptions.length > 0` and the same-document marker keep it from passing vacuously. |
| Fixtures, setup, helpers, and data builders reuse meaningful repetition | Pass | The fake CLI gains a record and an opt-in mode instead of a new fixture; the doubles follow the real `WorkspaceManager` methods. |
| Test isolation and determinism are appropriate for the exercised boundary | Pass | SM-12 restores the folder mode and the console spy in `finally`; `memory-sync-api` releases and stops its catalog in `afterAll`; the probe unroutes its interception. Non-blocking note TN-01 below. |
| Large files remain coherent and navigable rather than mixing unrelated scenarios | Pass | — |
| No stale, duplicated, disabled-without-reason, or compatibility-only tests remain | Pass | The stale tests are rewritten to the new behavior, not loosened. The removed `memory.hasRawTraces` assertions follow a field the design removed, and the imported raw trace stays proven through the run view (`memory-sync-api`) and the hub file (`multiprocess`). |
| Added, updated, and removed coverage agrees with the coverage investigation and execution evidence | Pass | API-14 (stale rewrites), API-15 / API-15nc (IC-03 and its negative control), API-05r2 with `SM-12-log.json`, API-07r2 (probe 38/38) |
| Test callers and fixtures exercise an independently established supported scenario rather than proving one by themselves | Pass | IC-03 is the application-owned run kind (REQ-001); SM-12 is AC-014's stated precondition (an unwritable `semantic/`); SMV-090/091 is SCN-LEAVE (CRR-001). |
| Each test enters through its scenario's real trigger and follows the real actor's or event's steps, without a setup real use does not produce | Pass | **IC-03:** a real studio server, a real application import and launch; only the external Codex CLI is scripted, and `codex-turn complete` makes a turn end as a real one does. **SM-12:** a real run start through the harness. **SMV-091:** a real browser leaving through the left panel's Chat (a client-side route change). |

## Findings

None.

### Non-blocking notes

- **TN-01 (SM-12, environments):** the unwritable folder is made with `chmod 0o555`, which does not stop a process running as root (for example a CI container run as root, TESTING.md § headless Linux and containers). There, SM-12 would fail falsely: the folder would be created. A guard such as skipping when `process.getuid?.() === 0`, or a note in the file header, would make that explicit. This is the existing mode-bit practice (for example autobyteus-491's SID-3), so it does not fail the review.
- **TN-02 (IC file):** `codex-turn complete` is set in the file's `beforeAll`, so IC-01/IC-02 now also run with turns that end. They still pass, and a completing turn is closer to a real one. Noted only so a later reader of IC-01/02 knows the mode.

## Follow-ups

- Follow-ups this review added: None (FU-003…FU-005 already recorded)

## Latest Authoritative Result

- Result: `Pass` (CRR-007, test review round 2: LF-2 and LF-3 on the merged state). Round 1 (CRR-005) also passed.
- Changed durable test paths reviewed:
  - round 2: `collaboration-prompt-wording.e2e.test.ts`, `open-task-tree-upgrade-startup.e2e.test.ts`;
  - round 1: the 10 paths in the scope table.
- Unresolved finding IDs: none
- Recommended Recipient: `delivery_engineer`
- Notes: carried for delivery:
  - CF-13 delivery note: ids of 201–255 encoded bytes are now shortened; the founder's node has none.
  - CF-11 (documented).
  - Not tested: Grok, DeepSeek and Antigravity live; signing and other platforms.
  - The founder's data was only read, never started on (TESTING.md).
  - FU-003…FU-005.
