# API/E2E Test Review Report — test-and-tooling-hygiene-294 (autobyteus-294)

## Review Meta

- Review Round: 2 (round 1: API-REV-001, Pass)
- Trigger: API/E2E Pass (API-REV-001), with five Rule 9 baseline-fix commits to durable tests
- Requirements Doc Reviewed As Context: `requirements-doc.md` (SR-005)
- Investigation Notes Reviewed As Context: not needed for this bounded review
- Solution Revision Record Reviewed As Context: SR-005 (via the requirements and design)
- Design Spec Reviewed As Context: `design-spec.md` (SR-005)
- Supplemental Task Artifacts Reviewed As Context: `follow-ups.md` (FU-011, FU-012 added by API/E2E)
- Architecture Review Revision Record Reviewed As Context: ARCH-REV-002 (context only)
- Implementation Revision Record Reviewed As Context: IR-002
- Original Code Review Report: `code-review-report.md` (CRR-002, Pass)
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-007`
- Coverage Investigation: `api-e2e-coverage-investigation.md`
- Execution Coverage Report: `api-e2e-execution-coverage-report.md`
- API/E2E Revision Record Reviewed As Context: `api-e2e-revision-record.md` (API-REV-001)
- Delivery Revision Record Reviewed As Context: N/A
- API/E2E Result: Pass
- Final Validation Confidence: 95.3% (as reported by API/E2E)
- Prior unresolved test-review findings rechecked: none (first test review)
- Project testing guideline(s) applied: `TESTING.md` (Rule 9: a test-caused failure is fixed in the branch as a labelled baseline commit naming the test and cause). Conflicts: none.
- Supported Product Scenario Basis Confirmed: `Yes` (SCN-001: the TESTING.md layers are green or fail loudly)

## Changed Durable Test Scope

Range: `256cee925e..ecd7dc2d0f`. Production code is unchanged in this range; the only non-test commit is ticket documents.

| Durable Test Path | Change | Related Scenario / Requirement | Coherent Test Responsibility | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/app-data-migrations/remove-built-in-project-task-manager/remove-built-in-project-task-manager-startup.integration.test.ts` | Updated (`dfef14abc6`) | SCN-001 (`test:integration` green) | the retired-PTM migration on the startup path | expected built-ins add `autobyteus-model-router`, which `930597c730` registered (`built-in-agent-registry.ts` L3) |
| `autobyteus-server-ts/tests/e2e/workspaces/workspaces-graphql.e2e.test.ts` | Updated (`a001e645c7`) | SCN-001 | workspace GraphQL at the real boundary | the partial config double gains `get: () => undefined` ("no setting configured"), which `listVisibleWorkspaces()` now reads (`d384968700`) |
| `autobyteus-server-ts/tests/e2e/app-data-migrations/remove-built-in-project-task-manager-startup.e2e.test.ts` | Updated (`bce2f8b4e3`) | SCN-001 | the same migration at the startup entrypoint | new `INSTALLED_BUILT_IN_FOLDERS` constant for the two `agents/` listings. `BUILT_IN_IDS` keeps its catalog (L250, L301, `arrayContaining`) and `@`-candidate exclusion (L331) uses. Correct: the router is internal, so it is installed but not visible. |
| `autobyteus-server-ts/tests/integration/runtime-management/claude/client/claude-sdk-client.integration.test.ts` | Updated (`e60f4d89a0`) | SCN-001 (`RUN_CLAUDE_E2E`) | the live Claude CLI contracts | the shared helper uses `beginStreamingSession({ resolveOptions }).open()` and `requestClose()`. These are the current API (`claude-sdk-client.ts` L232, `claude-sdk-streaming-session.ts` L53); `openStreamingSession` and `close` were removed in `028cca2312`. 5/5 live (API-23). |
| `autobyteus-web/tests/e2e/electron-launch-profile-probe.mjs` | Updated (`6af8819ede`) | AC-016 (E2E-PKG-004) | the packaged launch-profile probe | the occupied-port case requires both `EADDRINUSE: address already in use` and `:<port>`. The single-substring form still works for the other cases. This mirrors the unit-spec fix `2fd4461897`. |

- No durable test file changed: `No`

## Proportional Test-Code Checks

| Check | Result | Evidence / Notes |
| --- | --- | --- |
| Scenario grouping and names make intent clear | Pass | each edit has a one-line comment stating why; commit messages name test and cause (Rule 9) |
| Assertions prove approved requirements instead of incidental implementation details | Pass | expectations follow the product's current built-ins, setting reads, API and error |
| Fixtures, setup, helpers, and data builders reuse meaningful repetition | Pass | one shared Claude helper changed; the probe's `runRawPackagedFailure` now takes a substring list instead of a new helper |
| Test isolation and determinism are appropriate for the exercised boundary | Pass | `get: () => undefined` is the real config's answer for an unset key; nothing time-dependent added |
| Large files remain coherent and navigable | Pass | edits are local (14+/7-) |
| No stale, duplicated, disabled-without-reason, or compatibility-only tests remain | Pass | the removed-API calls are gone; FU-012 records the one untouched caller outside these files |
| Added, updated, and removed coverage agrees with the coverage investigation and execution evidence | Pass | API-04 (integration 80 files), API-20 (207 E2E files), API-23 (Claude 5/5), API-24 (E2E-PKG-001..005) |
| Test callers and fixtures exercise an independently established supported scenario | Pass | each test was already approved coverage that had fallen behind a commit on `origin/personal` |
| Each test enters through its scenario's real trigger | Pass | the triggers are unchanged: startup entrypoint, GraphQL, live CLI, packaged executable |

QR-001 (no weakened assertion): holds.
- The built-in list and the folder list now name one more real built-in, so they are exact, not looser.
- The probe's message check is stricter: it needs the error code and the port.
- The config double change adds no assertion and removes none.

## Findings

None.

## Follow-ups

- Follow-ups this review added: None. FU-011 and FU-012 were added by API/E2E.

## Round 2 — API-REV-002 / API-REV-003

- Trigger: API/E2E Pass for IR-004 (API-REV-003, confidence 95.0%), after the failed API-REV-002 round. That failure was reviewed as a failure origin in `code-review-report.md` (CRR-005).
- Changed durable test scope: none. `git diff --name-only ecd7dc2d0f..2edb3336ae` outside `tickets/` lists only:
  - `RELEASE.md` and `TESTING.md`;
  - `autobyteus-web/docs/electron_packaging.md`;
  - `autobyteus-web/nuxt.config.ts`, `package.json` and `scripts/typecheck.mjs`.
  These are source and docs, reviewed in CRR-004 and CRR-006. API-32's Docker run and the API-28/29/30 reruns are execution evidence, not durable tests.
- Result: `Not Applicable`. Round 1's review of the five baseline fixes still covers every test change on the branch.

## Latest Authoritative Result

- Result: `Not Applicable` (round 2: no durable test file changed since round 1's `Pass`)
- Changed durable test paths reviewed: none in round 2; round 1's five remain reviewed
- Unresolved finding IDs: none
- Recommended Recipient: `delivery_engineer`
- Notes: the remaining release proof is the build-only `release-desktop.yml` dispatch on the five real runners, which RELEASE.md requires before a tag. A Requirement Gap on the gate's pipeline placement is pending with the Solution Designer.
