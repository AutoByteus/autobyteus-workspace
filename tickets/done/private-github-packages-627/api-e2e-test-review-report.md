# API/E2E Test Review Report — autobyteus-627 Private GitHub Repositories for Agent Packages and Skills

## Review Meta

- Review Round: 1
- Trigger: `/api_e2e_engineer`, API/E2E round 1 Pass (API-REV-001); tests `35a2f84fbf`, documents and evidence `3723ff8878`
- Requirements Doc Reviewed As Context: [requirements-doc.md](requirements-doc.md) (SR-002)
- Investigation Notes Reviewed As Context: [investigation-notes.md](investigation-notes.md)
- Solution Revision Record Reviewed As Context: [solution-revision-record.md](solution-revision-record.md)
- Design Spec Reviewed As Context: [design-spec.md](design-spec.md) (C-1…C-4, walks 1-10)
- Supplemental Task Artifacts Reviewed As Context: `evidence/API/` (API-00 probe log, API-02-04 full run, API-03 Docker, API-04 emulated)
- Architecture Review Revision Record Reviewed As Context: ARCH-REV-001 (the reviewer's uncommitted file)
- Implementation Revision Record Reviewed As Context: IR-001
- Original Code Review Report: [code-review-report.md](code-review-report.md) (CRR-001 Pass)
- Code Review Revision Record: [code-review-revision-record.md](code-review-revision-record.md)
- Current Code Review Revision ID: `CRR-002`
- Coverage Investigation: [api-e2e-coverage-investigation.md](api-e2e-coverage-investigation.md)
- Execution Coverage Report: [api-e2e-execution-coverage-report.md](api-e2e-execution-coverage-report.md)
- API/E2E Revision Record Reviewed As Context: [api-e2e-revision-record.md](api-e2e-revision-record.md) (API-REV-001)
- Delivery Revision Record Reviewed As Context: N/A
- API/E2E Result: Pass
- Final Validation Confidence: 95%
- Prior unresolved test-review findings rechecked: none. CRR-001 had no findings; its C-01 docs item stays with delivery's doc sync.
- Project testing guideline(s) applied: TESTING.md: the test vault and live gates; built-server suites need a current `dist`; Docker server nodes (a test-owned container, the worktree's server package mounted read-only, loopback, cleanup); custody scans. No conflicts.
- Supported Product Scenario Basis Confirmed: `Yes` (SCN-001…SCN-005, REQ-007, the REQ-005 custody contract)

No `src/` change since `30fcc50ec7`: `git diff 30fcc50ec7..35a2f84fbf` touches only the three test files below.

## Changed Durable Test Scope

| Durable Test Path | Change | Related Scenario / Requirement | Coherent Test Responsibility | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/integrations/github-private-repository-built-server.e2e.test.ts` | Added | BS-L1: SCN-001, SCN-002, AC-001/002/005/007 against real GitHub. BS-E1: SCN-003, SCN-004, AC-003/004/005/007 against emulated GitHub | The private-repository journey on the built server through its GraphQL surface | Gated `RUN_GITHUB_PRIVATE_REPOSITORY_E2E=1` plus a built `dist`; BS-L1 also needs the test vault |
| `autobyteus-server-ts/tests/e2e/integrations/github-private-repository-docker-node.e2e.test.ts` | Added | BS-D1: SCN-005, AC-006 (with AC-001/002/005 on the node) | The same journey on a test-owned Docker node with its own vault | Gated `RUN_GITHUB_PRIVATE_REPOSITORY_DOCKER_E2E=1`, the server package folder and Docker |
| `autobyteus-web/tests/e2e/fixtures/github-private-upstream.mjs` | Updated | SCN-003 (edit capture reads the installed commit) | The emulated GitHub serves every published commit's archive, as GitHub does | The browser probe was re-run on it (API-06, 5/5) |

- No durable test file changed: `No`

## Proportional Test-Code Checks

| Check | Result | Evidence / Notes |
| --- | --- | --- |
| Scenario grouping and names make intent clear | Pass | One `it` per journey (BS-L1, BS-E1, BS-D1). Each is named after its AC IDs, has comments per step, and a header with its gate and command |
| Assertions prove approved requirements instead of incidental implementation details | Pass | The C-4 texts are asserted word for word (not connected, rejected). The import's install, update and refusal are asserted through GraphQL answers (`installedRevision`, `sharedAgentCount`, `lastError`). AC-001 against real GitHub proves the private download and extraction with a sound comparison: the private refusal equals that of a public repository of the same shape. Custody covers every answer, the server output, every file under the data root (the Docker node's data as an in-memory tar stream, plus its log), and the emulated upstream's request log (the token only as a header, never in a URL) |
| Fixtures, setup, helpers, and data builders reuse meaningful repetition | Pass | Reuses `startBuiltStudio`/`until`/`killBuiltStudios`, `readLiveTestSecret`, `attachOwnerCredential` and the browser probe's emulation preload. `publish`/`revoke`/`restartDue` are local builders with one meaning each |
| Test isolation and determinism are appropriate for the exercised boundary | Pass | Each test has its own fresh temp data root, removed afterwards. The Docker container has a random name, fresh anonymous volumes, binds 127.0.0.1 on a free port, and is removed with `-v` in `afterAll`. The scheduled pass is waited for with `until` (240 s), not a fixed sleep. Read-only against real GitHub |
| Large files remain coherent and navigable rather than mixing unrelated scenarios | Pass | 271 and 133 lines, one journey per test |
| No stale, duplicated, disabled-without-reason, or compatibility-only tests remain | Pass | Skips are gate-only and give their reason in the header; no disabled cases |
| Added, updated, and removed coverage agrees with the coverage investigation and execution evidence | Pass | API-02/03/04 map to these files; the logs show `Tests 3 passed (3)` for the full gated run and `1 passed` for Docker. The API-02 run-2 narrowing (`token=` scan excludes downloaded package content; the token-value scan still covers every file) is justified and recorded |
| Test callers and fixtures exercise an independently established supported scenario rather than proving one by themselves | Pass | Every journey is a requirements scenario (SCN-001…005, REQ-007). The emulation stands in only for what the test token cannot give (API-00: the token's private repository is neither a package nor a skill source, and nothing may be written to GitHub) |
| Each test enters through its scenario's real trigger and follows the real actor's or event's steps, without a setup real use does not produce | Pass — deviation recorded, reason holds | Entry is the node's GraphQL surface (and on Docker, the node's setup code exchanged for an owner credential, as the desktop does). The one artificial setup is BS-E1's `restartDue`, which moves `latestCheckedAt` back two days in the stopped node's registry. Its reason holds: the 15-minute minimum interval would otherwise hold back the real scheduled pass. The write uses the registry's own field (`types.ts:47`), on the test's own stopped node, and the pass itself runs unchanged |

Non-blocking observations (no action required for this ticket):

- BS-L1 lines 105-108: the invalid-token refusal is asserted as "some error" plus "nothing saved", not as the `TOKEN_REJECTED` code. The test's `GraphqlAnswer` type drops `extensions`. The code is already asserted in the in-process GraphQL e2e (`github-private-repository-graphql.e2e.test.ts:183`), and "nothing saved" is the requirement's own wording (AC-002), so the proof holds.
- BS-E1 line 242 accepts the "rejected" text from either `lastError` or a GraphQL error. Both paths are legitimate outcomes of a check, and the text is exact.

## Findings

None.

Docs note for delivery's documentation sync (this ticket; added to CRR-001's C-01): the module docs list the private-repository tests and gates, but not the two new suites:
- `agent_packages.md:266-273` names the unit, GraphQL and live tests;
- `secret_management.md:402-405` names only the live client test as a `test.github.token` user.
They should also name `github-private-repository-built-server.e2e.test.ts` (same gate) and `github-private-repository-docker-node.e2e.test.ts` (`RUN_GITHUB_PRIVATE_REPOSITORY_DOCKER_E2E=1`, `GITHUB_PRIVATE_DOCKER_SERVER_PACKAGE`).

## Follow-ups

- Follow-ups this review added: None

## Latest Authoritative Result

- Result: `Pass`
- Changed durable test paths reviewed: the three above
- Unresolved finding IDs: none
- Recommended Recipient: `delivery_engineer`
- Notes:
  - Delivery's doc sync takes C-01 (stale public-only lines in `update_notifications.md`, `agent_packages.md` and `skills.md`; see `code-review-report.md`, Docs-Impact Verdict) and the test-list note above.
  - After 2026-11-25 the live cases skip (or fail under `AUTOBYTEUS_LIVE_STRICT=1`) until `test.github.token` is renewed.
  - The architecture reviewer's two files stay uncommitted.
