# API/E2E Test Review Report — chat-interface-entry

## Review Meta

- Review Round: 3 (latest authoritative; `Not Applicable`). Round 2 (CRR-006) reviewed the API-REV-003 probe update, since committed in `030bab78d`. Round 1 (CRR-004) reviewed the API-REV-002 changes, committed in `a4b22fc27`.
- Trigger: API/E2E Pass, API-REV-003 (api_e2e_engineer, 95%), at HEAD `e9f2ce399` (IR-004 / D-16 on the `origin/personal` merge), with an uncommitted probe update
- Requirements Doc Reviewed As Context: `requirements-doc.md` (SR-003 intended behavior)
- Investigation Notes Reviewed As Context: `investigation-notes.md`
- Solution Revision Record Reviewed As Context: `solution-revision-record.md` (through SR-010)
- Design Spec Reviewed As Context: `design-spec.md` (SR-010; D-13, D-14, D-15; validation cases V-A..V-E)
- Supplemental Task Artifacts Reviewed As Context: R2 `ui-ux-spec.md` (UXJ-007 for C05)
- Architecture Review Revision Record Reviewed As Context: `architecture-review-revision-record.md` (ARCH-REV-006)
- Implementation Revision Record Reviewed As Context: `implementation-revision-record.md` (IR-001..IR-003)
- Original Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-interface-entry/tickets/in-progress/chat-interface-entry/code-review-report.md` (CRR-005, Pass, round 4, D-16)
- Code Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-interface-entry/tickets/in-progress/chat-interface-entry/code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-007`
- Coverage Investigation: `api-e2e-coverage-investigation.md`, with the round-2 delta
- Execution Coverage Report: `api-e2e-execution-coverage-report.md` (the "Round 3" section is authoritative)
- API/E2E Revision Record Reviewed As Context: `api-e2e-revision-record.md` (API-REV-003)
- Delivery Revision Record Reviewed As Context: N/A
- API/E2E Result: Pass
- Final Validation Confidence: 95%
- Prior unresolved test-review findings rechecked: none were blocking. Advisories A-1..A-3 from round 1: A-1 and A-3 are unchanged (still advisory); A-2 is partly addressed, since the C16 prerequisites are commented at the case.
- Supported Product Scenario Basis Confirmed: `Yes`. Every probe case exercises a scenario already established upstream. Round 2 adds C16 for REQ-021/AC-018 (SCN-002; D-16 V-L1..V-L5), user-approved after UVF-001.

## Round 3 (API-REV-004, real desktop app addendum)

- Trigger: API-REV-004 Pass (95%). The isolated real desktop instance (`iso-9333-19f3`) was built from HEAD `3c062a180` (`origin/personal` `8778420fc`). Cases DT-00..DT-05 passed.
- Durable test changes: **none**.
  - `git diff 030bab78d HEAD -- autobyteus-web/tests/e2e/chat-entry-live-probe.mjs` is empty, so the probe reviewed in round 2 is committed unchanged.
  - The worktree has no modified test files; only ticket artifacts are modified.
- Commits since `e9f2ce399` on the ticket branch:
  - delivery merge refreshes of `origin/personal` (other tickets' code, reviewed in their own tickets);
  - delivery docs and ticket checkpoints (`46c8d98fc`, `ab2a0480d`);
  - `030bab78d`, which commits the round-2 probe.
  - No chat-owned source changed: an empty diff over `components/chat`, `composables/chat`, `services/chat`, `chatDraftStore`, `pages/chat.vue`, `agentRunStore`, `runHistoryLoadActions`, server `skills` and `backends/shared`.
- Result: `Not Applicable`.
- Observations forwarded (implementation behavior, not test code; not review findings):
  - **O-2:** the Chat `/` skill list loads once per app session (`useChatComposerOptions` fetches only while `skillStore` is empty).
    - A skill added outside the Skills page (another client, or files placed in a skill root) is missing from `/` until the Skills page is visited or the app restarts.
    - The runtime still receives it, because ALL_INSTALLED is resolved at run start.
    - The approved requirements do not define freshness of the `/` list for skills added externally while the app is open. It is for delivery to show the user; if the user wants it changed, it goes to the Solution Designer.
  - **O-3:** at the desktop default width (1200 px), a long Codex display-name label also truncates the footer's runtime badge ("Co…"), with the full text in the tooltip. This is within the approved single-line-with-tooltip rule (DEC-015) and cosmetic.
  - **O-1** (round 2) is still open for user re-verification.

## Round 2 Delta (API-REV-003)

| Durable Test Path | Change | Related Scenario / Requirement | Notes |
| --- | --- | --- | --- |
| `autobyteus-web/tests/e2e/chat-entry-live-probe.mjs` | Updated (uncommitted) | AC-018 / D-16 (C16); REQ-019 last-used label (C04) | Adds an exact row selector `MODEL_ROW`, which was needed because the D-16 child elements also match the `chat-model-option-` prefix. `pickModel` returns the row label, C04 compares the trigger with the policy label, and new C16 adds an independent label oracle. No removed paths. |

Round 2 checks:

| Check | Result | Evidence / Notes |
| --- | --- | --- |
| Scenario grouping and names make intent clear | Pass | The C16 title names D-16/AC-018 and its sub-journeys. The oracle helpers (`expectedModelOption`, `catalogFor`, `readModelRows`, `rowMismatches`, `recommendedFirst`, `openRuntimeRows`, `searchIds`) sit together under an explanatory comment. |
| Assertions prove approved requirements instead of incidental implementation details | Pass | Rows are compared with an **independent oracle** computed from the GraphQL catalog. It reproduces `getModelSelectionOptionLabel` and `getModelSelectionOptionDescription` rule for rule (Claude canonical name; OpenAI-compatible/Qwen display name; AutoByteus identifier; otherwise the display name; the Claude secondary is the display name plus the description), plus recommended-first, one line, the trigger label and title, search by canonical name, display name and identifier (and `gpt-6`), the persisted fixed list, and parity with the launch form (V-L5). |
| Fixtures, setup, helpers, and data builders reuse meaningful repetition | Pass | C16 reuses `newChat`, `terminate`, `waitForReply`, `searchIds` and `openRuntimeRows`. `MODEL_ROW` is shared by `pickModel` and C16. |
| Test isolation and determinism are appropriate for the exercised boundary | Pass | Same owned environment as round 1. Waits are bounded; the trigger-settle waits (20 s) record their timing rather than hide it. `searchIds` tolerates a missing "Searching…" state and then asserts on the results. |
| Large files remain coherent and navigable | Pass | C16 (~110 lines) covers one requirement (AC-018) across its surfaces, and the file stays one Chat-entry suite. |
| No stale, duplicated, disabled-without-reason, or compatibility-only tests remain | Pass | The old C04 identifier assertion was replaced, not kept alongside. The oracle intentionally duplicates the policy as an independent expectation rather than importing product code, and V-L5 guards against drift by comparing with the launch form. |
| Coverage agrees with the investigation and execution evidence | Pass | C16 and C04 match the "Round 3" rows and `round3/probe-*` evidence. `node --check` passes. |
| Test callers and fixtures exercise an independently established scenario | Pass | C16 exercises REQ-021/AC-018 as approved; the catalog is the real runtime catalog. |

Round 2 advisories (non-blocking):
- **A-4:** the V-L5 launch-form row read uses `span.block.truncate` inside `[role="option"]`, which couples to `SearchableGroupedSelect` internals. A `data-test` on the launch-form label would make it sturdier, but that is product code outside this ticket.
- **A-2 (carried):** the header usage comment still lists only Codex/Claude for C14/C15. C16 hard-requires Claude Agent SDK, Codex and AutoByteus (commented at the case, not in the header).
- **A-1, A-3:** unchanged from round 1.

### Observation O-1 (implementation behavior, not test code; forwarded)

- On a fresh New chat, the footer trigger briefly shows the raw last-used identifier until that runtime's catalog loads: about 0.6 s on Codex, 1.7 s on Grok, and 1.6–3.0 s on Claude (`opus` → `claude-opus-5-5`).
- Cause: `useChatModelCatalog.modelLabel` falls back to the identifier while `findModel` has no catalog record (D-16 "when present").
- The steady state satisfies AC-018, and the approved requirements do not define the loading window. It is therefore not a test-review finding and does not block.
- It does briefly reproduce the UVF-001 label the user reported. Delivery should show it to the user during re-verification. If the user objects, it goes to the Solution Designer as a small follow-up.

## Changed Durable Test Scope

| Durable Test Path | Change | Related Scenario / Requirement | Coherent Test Responsibility | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-web/tests/e2e/chat-entry-live-probe.mjs` | Added | AC-001..AC-013, AC-016/AC-017; D-08, D-13, D-15 (C14/C15); RSK-005; REQ-007 seeding (C13) | One live Chat-entry journey suite (C01–C15): real Chrome → Nuxt dev → built server → a real runtime | 586 lines; follows the existing `tests/e2e/*-probe.mjs` convention |
| `autobyteus-web/package.json` | Updated | — | Adds the `test:e2e:chat-entry-live` script | Matches the sibling `test:e2e:*` probe scripts |
| `autobyteus-web/components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.regressions.spec.ts` | Updated | Removal plan (CR-001) | Removes the stale `createDraftRun` mock of a removed API | One-line removal; the spec's 2 baseline failures are unchanged |

- No durable test file changed: `No`
- Removed paths: none.

## Proportional Test-Code Checks

| Check | Result | Evidence / Notes |
| --- | --- | --- |
| Scenario grouping and names make intent clear | Pass | `defineCase(id, title, fn)` titles name the journey and the governing IDs (for example, "D-15 Rule 1 (V-D)…"). The D-15 helpers (`startChat`, `dispositionLogged`, `terminate`) are grouped with an explanatory comment. |
| Assertions prove approved requirements instead of incidental implementation details | Pass | Assertions target observable outcomes: URL shape (D-13), server-side content and summary (REQ-008, AR-005), resume config (D-08), the link realpath and holder lifetime (D-15), the user folder left intact (Rule 1), and uniform team config (REQ-010). See advisory A-1 for one weak spot. |
| Fixtures, setup, helpers, and data builders reuse meaningful repetition | Pass | `writeSkill`, `writeAgent`, `newChat`, `pickModel`, `openFolder`, `startChat` and `runConfig` are shared. The fixtures (global, bundled, disabled, and shadowing private skills) are built once. |
| Test isolation and determinism are appropriate for the exercised boundary | Pass | Owned `mkdtemp` root, free ports, sanitized env, `prisma migrate deploy` on a private DB, and process-group teardown in `finally`, with the root removed unless `--keep`. Live LLM replies are waited on for exact markers with bounded timeouts. The fixed delays (C05 5 s, C15 V-E 2 s) are proportionate for a live probe. |
| Large files remain coherent and navigable rather than mixing unrelated scenarios | Pass | One surface (Chat entry), grouped as infrastructure, then page helpers, then cases, then the runner. |
| No stale, duplicated, disabled-without-reason, or compatibility-only tests remain | Pass | CR-001 removed the stale mock. No skipped or disabled cases. |
| Added, updated, and removed coverage agrees with the coverage investigation and execution evidence | Pass | C01–C15 match the coverage report (CE rows; the C14/C15 runtime matrix) and `round2/probe-*` evidence. `node --check` passes. |
| Test callers and fixtures exercise an independently established supported scenario rather than proving one by themselves | Pass | Fault injection in C07 (`PrepareAgentRun` rejected once) reproduces the design's supported D-04 alternate. The C14/C15 fixtures reproduce the design-listed D-15 cases. |

## Findings

None blocking.

Advisory notes (no action required for delivery; worth folding in the next time the probe is touched):
- **A-1 (C14, the strong side of V-D):** the configured-agent failure is asserted by the generic "An Error Occurred" text. `strongError` is captured in the evidence but not matched against the collision cause, so an unrelated failure would also pass that step. The deterministic proof exists in the server unit test "a configured request still fails fast on a user-owned entry (V-D)", and the recorded evidence shows the collision message. A later tightening would assert `/collision|already exists/` on `strongError`.
- **A-2:** the header comment (L13–L14) says C14/C15 need Codex/Claude only. The code also supports Grok (both cases) and AGY (C14). C05/C06/C09/C11 depend on state from C03/C04; the usage line could say so (the documented repro command already includes the prerequisites).
- **A-3:** inside C14, the local `owned` shadows the module-level `owned` process list. It is harmless (block scope), but renaming it (for example, `userSkillDir`) would read better.

## Latest Authoritative Result

- Result: `Not Applicable` (round 3: no durable test changed in API-REV-004). The last reviewed test code passed in round 2 (CRR-006).
- Changed durable test paths reviewed: none this round.
  - Earlier rounds: `chat-entry-live-probe.mjs` (Added, round 1; Updated, round 2; committed in `a4b22fc27` and `030bab78d`), `package.json` (Updated, round 1), and `WorkspaceAgentRunsTreePanel.regressions.spec.ts` (Updated, round 1, CR-001).
- Unresolved finding IDs: None. A-1..A-4 are advisory.
- Recommended Recipient: `/software_engineering_team/delivery_engineer`
- Notes: observations O-1, O-2 and O-3 are for user re-verification. They are not test-review findings.
