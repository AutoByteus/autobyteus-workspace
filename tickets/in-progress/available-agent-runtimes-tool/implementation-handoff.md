# Implementation Handoff — autobyteus-303 (`list_available_agent_runtimes`, Settings → Model Routing)

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: architecture review selected (Large / High). ARCH-REV-003 Pass (SR-003) and ARCH-REV-005 Pass (SR-005) for IR-001. ARCH-REV-006 Pass (SR-006) and ARCH-REV-008 Pass (SR-007, text-corrected) for this round. Downstream: code review (rule for Large or High), then API/E2E reruns.
- Requirements doc: `tickets/in-progress/available-agent-runtimes-tool/requirements-doc.md` (SR-006/SR-007 baseline, Approved)
- Investigation notes: `tickets/in-progress/available-agent-runtimes-tool/investigation-notes.md` (C-20…C-22 added for SR-006)
- Solution revision record: `tickets/in-progress/available-agent-runtimes-tool/solution-revision-record.md`
- Design spec: `tickets/in-progress/available-agent-runtimes-tool/design-spec.md` (SR-007, incl. § SR-007 Revision, § SR-006 Revision, § SR-004 Addition)
- Supplemental task artifacts: `evidence/limit-probes/` (probe scripts; the recorded answers are the redacted fixtures in `autobyteus-server-ts/tests/fixtures/usage-limits/`)
- Design review report: `tickets/in-progress/available-agent-runtimes-tool/design-review-report.md` (ARCH-REV-008)
- Architecture review revision record: `tickets/in-progress/available-agent-runtimes-tool/architecture-review-revision-record.md`
- Triggering rework report: `code-review-report.md` § API/E2E Failure-Origin Review (CRR-003: CR-002 Local Fix, CR-003 and CR-004 Design Impact), answered by SR-006, then SR-007. API/E2E round 1: `api-e2e-execution-coverage-report.md` (API-REV-001).

All paths are under `/Users/normy/autobyteus_org/autobyteus-worktrees/available-agent-runtimes-tool`, branch `codex/available-agent-runtimes-tool`, base `origin/personal` `a2faf424d6`. Code commits: `5135bb73dc` (IR-001), `683b036be9` (IR-002), `07c07cfc27` and `c4fff3eb00` (IR-003: SR-006, then SR-007). Ticket documents and evidence are committed after them.

## Current Implementation Summary

- Implementation cycle: `Rework` (IR-003)
- Implementation revision record: `implementation-revision-record.md`
- Current implementation revision ID: `IR-003` (IR-001 baseline, IR-002 CR-001)
- Related solution revision IDs: `SR-006`, `SR-007`
- Related architecture-review revision IDs: `ARCH-REV-006`, `ARCH-REV-008`
- Related code-review revision IDs: `CRR-003` (failure-origin review); `CRR-001`/`CRR-002` earlier
- Related API/E2E revision IDs: `API-REV-001` (round 1, Fail)
- Triggering finding IDs: `CR-002`, `CR-003`, `CR-004`, `O-1`, plus SR-007 decisions 1–5

The opt-in tool `list_available_agent_runtimes` (AutoByteus local tool + Agent Tools MCP adapter) and the GraphQL query `availableAgentRuntimes` both return `AvailableAgentRuntimesService.read()` (now in `src/available-agent-runtimes/`). The answer lists every available agent runtime on the node, with its models and its live usage limits, read with 0 tokens. Settings → Model Routing → "Agent runtimes now" renders the same object.

## Routing Classification (Mandatory)

- Task size: `Large`
- Architecture risk: `High`
- Design classification section: design-spec § Task Size And Architectural Risk
- Classification confirmed or changed: `Confirmed`
- Evidence: the rework adds a shared-client hold, single-flight reads and a catalog reload on each read, and moves the composer to its own folder. These sit within the same subsystems and contracts. No persistence.
- Selected route: `Code Review`
- Lightweight implementation self-review for the direct route: `Not Applicable`
- New design impact or escalation trigger: `None`. No reader needs tokens or a model request; nothing is cached, persisted or polled; no credential or identity reaches the answer or logs; every step has a process-level bound.

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001 (REQ-001, 002, 003, 007, 010; AC-001, 002, 007, 008, 011, 012, 013) | Tool returns the node's available runtimes, models, limits | `agent-tools/agent-runtimes/*` → `findAvailableAgentRuntimesService()` → `AvailableAgentRuntimesService.read()` (`src/available-agent-runtimes/available-agent-runtimes-service.ts`): single-flight; per runtime in parallel `readVersion` (4 s) → `holdClient` (Codex) → `AgentRuntimeSignInReader.read` (6 s) → catalog ‖ `readUsageLimits` (8 s each) → hold released after the answer; AutoByteus: credentials + catalog (4 s) → per provider: discovered `reloadProviderModelCatalog` ‖ usage reader (8 s each) | Implemented. Failures worded only by the service's `failureText` ("<subject> timed out" / "… could not be read: <reason>" / "… could not be read") |
| BEH-002 (REQ-009; AC-010) | Settings → Model Routing shows the same data | `pages/settings.vue` → `ModelRoutingManager.vue` → `AgentRuntimesNowSection.vue` → GraphQL JSON → `AvailableAgentRuntimeRow.vue`, `AvailableModelList.vue` | Implemented; a provider's `models` may now be `"unknown: …"` (custom endpoint) and the row shows "Models unknown: …" |
| BEH-003 (REQ-004, 005, 008; AC-003…007, 009) | Live 0-token limit readers; lean answer | Strategies' `readUsageLimits` (return or throw) + parsers in `usage-limits/` (throw `UsageLimitsUnreadableError`); provider readers (throw `ProviderUsageUnreadableError`); `blocked` derived in the service, with coverage resolved over all limits | Implemented. Remaining % rounds down (O-1) |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`. A read now also refreshes discovered providers in the shared catalog, using the settings' own reload, as SR-006 decided. A failed reload keeps the previous rows, so launch lists are never emptied.

### Round IR-003, by finding

- **CR-002 (one time-out rule):** `read-deadline.ts` owns `DeadlineExceededError`, `isDeadlineExceeded(error)` (walks `cause`), `commandBound(deadline, usualMs) → {timeoutMs, byDeadline}` and `deadlineCause(bound)`.
  - Every deadline-bound helper raises the error itself or carries it as `cause`, and only when `byDeadline` (SR-007 decision 3). The helpers are the command runner, `agy` `runCommand`, the Grok probes, the ACP short process, and `raceDeadline` (Codex, Claude).
  - An ordinary per-command time-out stays an ordinary failure.
  - `runStep` never reads the clock to classify; its backstop yields a `DeadlineExceededError`.
  - With a deadline, `ClaudeSdkClient.listModels` lets the deadline error through; without one it still returns `[]`.
  - The 1 ms-left reproduction failed before the fix ("could not be read") and passes after it, at strategy and at service level.
- **CR-003 (discovered providers):** every considered discovered provider is reloaded per read, raced at 8 s, in parallel with the usage reader.
  - Local (Ollama, LM Studio): listed only with ≥ 1 model now.
  - Keyed custom endpoint: listed; its models are the reload's list, otherwise "unknown: <name> model list …". A failed source gives `: <safeMessage>`; 0 models gives `: the endpoint listed no models`; a time-out gives `… timed out`.
  - Static providers: unchanged.
- **CR-004 (Codex, concurrency):** the optional `AgentRuntimeStrategy.holdClient(cwd)`. For Codex it is `beginAcquire` without `acquire`; a closing generation gives `null`, and the read goes on.
  - The service takes the hold after install.
  - `read()` is single-flight. The answer resolves first; the in-progress slot is held until the hold releases settle (ARCH-REV-006 note 1), so callers in that window get the finished answer.
- **O-1:** `wholeRemainingPercent` = floor (with a 1e-9 float guard); `exhausted` is decided on raw values (Grok's now on `usedPercent ≥ 100`).
- **SR-007 decision 1:** `blockByLimits` resolves coverage over all limits, then applies only the exhausted ones. A model's most specific family wins across every limit. Ids are never matched as families. A limit that covers no model covers all of them, for every variant.
- **SR-007 decision 2:** `UsageLimitsReading` and `ProviderUsageReading` lose their `unknown` state. Parsers and readers throw `UsageLimitsUnreadableError(reason)` / `ProviderUsageUnreadableError(reason)`. `readUsageLimitsSafely`, `unknownUsageLimits`, `UNEXPECTED_ANSWER` and `providerUsageFailure` are removed.
  - The service's `failureText(subject, error)` is the one wording. Subjects: "<Runtime> usage limits", "<Runtime> model list", "<Provider> usage", "<Provider> model list".
  - A reader's abort time-out (`name === "TimeoutError"`) counts as timed out. Error texts are never shown.
- **SR-007 decision 5:** `src/available-agent-runtimes/{available-agent-runtimes-service,available-agent-runtimes-report,usage-limit-model-matching}.ts`. A unit test checks that nothing in `runtime-management` or `llm-management` imports it.

### Implementation decisions inside the design (for the code reviewer)

1. **Discovered-provider wording.** The SR-006 table names bare reasons ("timed out", the safe message, "the endpoint listed no models"). SR-007 says one helper words the models steps. I prefixed the subject so every failure reads the same: e.g. "unknown: My Endpoint model list could not be read: MODEL_DISCOVERY_UNAVAILABLE".
2. **Hold release after the answer** (ARCH-REV-006 note 1), not "awaited before the entry is returned" as the SR-006 text first said; the design text was updated to this.
3. **Claude limits** come from `rate_limits.limits[]`, which the live answer carries and SDK 0.3.280's `.d.ts` does not declare (RSK-001).
4. **AutoByteus listing failure** (credentials or catalog unreadable within 4 s) leaves the AutoByteus entry out with a logged warning. Accepted in CRR-001 (C-03).
5. **The two web/E2E tests owned by API/E2E were updated to the approved values:** AAR-01's Antigravity percentages (O-1: 99/98) and the web probe's DeepSeek text (SR-007 wording). I did not run the web probe.
6. Earlier IR-001 decisions still hold: the word-order family match; Codex model-specific limit names; the JSON GraphQL encoding; the cap + 500 ms backstop; `withClaudeControlQuery` taking the SDK's `query`; `AvailableModelList.vue`; Kimi in USD.

## Key Files Or Areas

- New in IR-003: `src/available-agent-runtimes/` (moved from `runtime-management/agent-runtimes/`), `tests/unit/available-agent-runtimes/{available-agent-runtimes-service,available-agent-runtimes-concurrency,usage-limit-model-matching,available-agent-runtimes-dependencies}.test.ts`, `tests/unit/runtime-management/read-deadline.test.ts`.
- Changed in IR-003: `runtime-management/read-deadline.ts`; `agent-runtime-strategy.ts` (`holdClient`, `RuntimeClientHold`, throw contract); four strategies; `runtime-command-runner.ts`; `antigravity-cli-capability.ts`; `grok/grok-build-capability.ts`; `acp/acp-discovery-handshake.ts`; `claude/client/claude-sdk-client.ts`; four parsers + `usage-limits-reading.ts`; `llm-management/provider-usage/*`; the tool contract, GraphQL type and composition (imports); web `AvailableAgentRuntimeRow.vue`, `types/availableAgentRuntimes.ts`, component test; docs `agent_runtimes.md`, `llm_management.md`, `autobyteus-web/docs/settings.md`; `tests/e2e/runtime/available-agent-runtimes-graphql.e2e.test.ts` (AAR-01 values), `autobyteus-web/tests/e2e/model-routing-settings-probe.mjs` (DeepSeek text).
- Unchanged since IR-001 (still current): tool surfaces, Claude control query, ACP extension request, catalogs' deadline pass-through, provider readers' endpoints, web page structure, i18n, glossary.

## Important Assumptions

- ASM-001 (Docker node parity) unverified here; the same composition builds Docker nodes.
- The Claude CLI answers `get_usage` and `supportedModels()` over a query whose input never yields (confirmed live).

## Known Risks

- RSK-001 external formats; RSK-003 / UNK-001 Grok used %; RSK-004 late Codex answers ignored.
- FU-003: another Codex user of the home folder (Agent Runtimes page sign-in check, a Codex run in the home folder) can still close the generation as a read takes its hold. The hold is then `null` and a failing Codex step says "could not be read".
- Release window: after a read's answer, its Codex hold release can take up to ~2–10 s in the worst case (SIGKILL / pending start). Callers arriving in that window get the finished answer, and the next fresh read waits for the release. Normally it takes milliseconds.
- A read reloads discovered providers in the shared catalog (the settings' reload), so a model list visible elsewhere can change after a read; a failed reload keeps the previous rows.
- Provider readers are tested against recorded shapes only; live answers are validation's (test vault).

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Feature (+ local defect fix in Claude discovery); this round: rework from the failure-origin review
- Reviewed root-cause classification: Local Implementation Defect (C-15; CR-002 Local Fix); Boundary/ownership decisions for CR-003/CR-004 and SR-007 made upstream
- Reviewed refactor decision: `Refactor Needed Now` (small: shared idle-input control query; SR-007: composer folder, one failure owner)
- Implementation matched the reviewed assessment: `Yes`
- If challenged, routed as Design Impact: `N/A`
- Evidence: IMP-04, IMP-11/IMP-16 (1 ms-left reproduction), IMP-13 (live), dependency-direction test.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`
- Dead code in the touched files and modules removed: `Yes`. Removed: `readUsageLimitsSafely`, `unknownUsageLimits`, `UNEXPECTED_ANSWER`, `providerUsageFailure`, `clampPercent`, the `unknown` reading states, and `ReadDeadlineExceededError` (renamed). A grep finds no other reference; typecheck passes.
- Dead code found elsewhere, added to `follow-ups.md`: None
- Shared structures remain tight: `Yes` (readings are read | not_reported; one failure wording; one time-out rule)
- Canonical shared design guidance reapplied: `Yes`
- Changed source files within size guardrails: `Yes`. Largest changed: the service 319 effective lines (≈ +100 this round; one composer, below 500), `claude-sdk-client.ts` ~342.

## Persisted Data Transition Check

- Approved decision: `Not Affected` (live reads only). Implementation follows it: `Yes`.

## Environment Or Dependency Notes

- No dependency or lockfile change. Untracked build outputs (`autobyteus-application-*/dist`) not committed.

## Checks Run

Evidence: `tickets/in-progress/available-agent-runtimes-tool/evidence/implementation/`. Environment: macOS (darwin 25.5), Node v22, this worktree.

| Check ID | Command Or Steps | Commit Tested | Environment | Code It Exercises | Behavior / Criteria IDs | Result | Evidence Files | Look For |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-04 | reproduction: Claude discovery prompt is not a string | base → 5135bb73dc | local | `ClaudeSdkClient.listModels` | AC-005, AR-001 | Fail before, Pass after | `IMP-04-claude-prompt-reproduction.log` | `expected 'string' not to be 'string'` |
| IMP-08 | rendered page on the dev stack (wide, opened list, Check again, 420 px) | 5135bb73dc | dev stack | page, rows | AC-010 | Pass | `IMP-08-*.png` | 5 rows; "13 models · 7 blocked" |
| IMP-10 | server typecheck + `test:unit` | 07c07cfc27 (SR-006) | local | all server | — | Pass | `IMP-10-server-typecheck-unit.log` | `Tests  6882 passed` |
| IMP-11 | focused suites incl. the 1 ms-left reproduction, discovered providers, single-flight, hold | 07c07cfc27 | local | SR-006 | AC-007, AC-008, AC-013 | Pass | `IMP-11-sr006-focused.log` | `Tests  305 passed (305)` |
| IMP-12 | `available-agent-runtimes-graphql.e2e.test.ts` (regression run) | 07c07cfc27 | env -i, temp HOME | real composition, scripted CLIs | AC-001…012 | Fail (AAR-01 O-1 values only) → Pass after updating them | `IMP-12-e2e-regression.log` | first run `remainingPercent: 100` vs `99`; then `Tests  5 passed (5)` |
| IMP-13 | `pnpm dev` + one read, 3 × 4 concurrent reads, 3 back-to-back reads (LM Studio serving, Ollama off, no keys) | 07c07cfc27 | this Mac's real CLIs | whole server path | AC-007 (LM Studio), AC-013, REQ-010 | Pass | `IMP-13-live-sr006.log` | LM Studio listed with 4 models, no Ollama; every concurrent caller `{"models":7,"limits":"read"}` for Codex, `sameCheckedAt: 1`; 4.3–5.2 s |
| IMP-14 | web model-routing tests + guards | 07c07cfc27 | jsdom | provider `models` unknown in the row | AC-010 | Pass | `IMP-14-web-sr006.log` | `Tests  8 passed (8)` |
| IMP-15 | server typecheck + `test:unit` | c4fff3eb00 (SR-007) | local | all server | — | Pass | `IMP-15-server-typecheck-unit-sr007.log` | `Test Files  829 passed \| 4 skipped (833)`, `Tests  6887 passed \| 7 skipped (6894)` |
| IMP-16 | focused suites: `tests/unit/available-agent-runtimes`, `runtime-management`, provider-usage, codex catalog deadline, tool surfaces (verbose) | c4fff3eb00 | local | SR-006 + SR-007 | AC-003…009, 011, 013 | Pass | `IMP-16-sr006-sr007-focused.log` | `Tests  273 passed (273)`; "the most specific family wins over all of a runtime's limits…", "a step stopped by its own deadline is 'timed out' even with 1 ms still left…" |
| IMP-17 | `available-agent-runtimes-graphql.e2e.test.ts` (regression run) | c4fff3eb00 | env -i, temp HOME | moved composer in `buildStudioServer`, scripted CLIs | AC-001…012 | Pass | `IMP-17-e2e-regression-sr007.log` | `Tests  5 passed (5)`; AAR-03 strict "timed out" |

- Rerun plan for IR-003:
  - IMP-01…03 and IMP-05…07, IMP-09 are superseded by IMP-10…17: the server code and the provider-row view changed.
  - IMP-04 stays valid (the Claude discovery prompt path is unchanged).
  - IMP-08 stays valid for every state it shows. The only view change is a provider's models "unknown" text, which IMP-14 covers in the component test.
  - IMP-13 (live) ran on `07c07cfc27`. SR-007 changed failure wording, the throw contract and the folder; those paths are covered by IMP-15…17 against the real composition (IMP-17).
- Not run, and why:
  - the web probe `model-routing-settings-probe.mjs` (API/E2E's; one assertion text updated);
  - provider readers live with the test vault;
  - repeated live Claude reads for the 0-token property;
  - Docker node; isolated desktop instance;
  - a live dev-stack run on `c4fff3eb00` (see the rerun plan above).

## Frontend Rendered-Result Check

- Affected this round: a provider sub-row's models can read "Models unknown: <text>" (custom endpoint). Same paragraph style as the runtime-level "Models unknown". Verified in the component test (IMP-14); not rendered live (no custom endpoint configured on the dev stack).
- Earlier loop (IMP-08) still current for everything else; see the IR-001 entry in the revision record.

## Downstream Coverage Hints / Suggested Scenarios

- Reruns asked by the design: API-03/03b (time-out reason, incl. the 1 ms case at scale), API-05/05b (concurrent readers, AC-013), API-08b (live LM Studio listed on a fresh server; Ollama off → absent).
- New: a keyed custom endpoint that does not answer → listed with "unknown: <name> model list …"; a provider reader's 500 → "unknown: <Provider> usage could not be read: unexpected answer (500)" (web probe MRP-02 text updated accordingly).
- A read while the Agent Runtimes page checks Codex sign-in (FU-003 residual) → the Codex step's reason, nothing else affected.

## API / E2E / Executable Coverage Investigation And Execution Still Required

Yes, after code review: the reruns above and the web probe; none of IMP-* is API/E2E sign-off.
