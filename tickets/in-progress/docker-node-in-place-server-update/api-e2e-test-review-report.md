# API/E2E Test Review Report — autobyteus-305, build step 1

## Review Meta

- Review Round: `1`
- Trigger: API/E2E Pass (API-REV-001) with one changed durable test (`4c356d69b7`)
- Requirements Doc Reviewed As Context: `requirements-doc.md` (SR-003; editorial SR-005)
- Investigation Notes Reviewed As Context: not reopened (no change since CRR-001)
- Solution Revision Record Reviewed As Context: not reopened (SR-005 unchanged)
- Design Spec Reviewed As Context: `design-spec.md` (SR-005), Change Scope "Old image layout" consumers
- Supplemental Task Artifacts Reviewed As Context: `evidence/API-10-cause.log`, `evidence/API-10-prisma/{events.jsonl,native-proof.json}`
- Architecture Review Revision Record Reviewed As Context: N/A (unchanged)
- Implementation Revision Record Reviewed As Context: `IR-001` (unchanged)
- Original Code Review Report: `code-review-report.md` (CRR-001, Pass)
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-002`
- Coverage Investigation: `api-e2e-coverage-investigation.md`
- Execution Coverage Report: `api-e2e-execution-coverage-report.md`
- API/E2E Revision Record Reviewed As Context: `api-e2e-revision-record.md` (API-REV-001)
- Delivery Revision Record Reviewed As Context: N/A
- API/E2E Result: `Pass`
- Final Validation Confidence: 95% (as reported by API/E2E)
- Prior unresolved test-review findings rechecked: none existed
- Project testing guideline(s) applied: `TESTING.md` (worktree copy, rewritten in `5c33c1b7b0`), § Docker server nodes. No conflict.
- Supported Product Scenario Basis Confirmed: `Yes`. The production path is node startup: the server package's resolver picks the Prisma engines while an incompatible engine cache sits in the retained `/root` (BEH-001 preserved, the `/opt/autobyteus/server-package` layout from DS-004).

## Changed Durable Test Scope

| Durable Test Path | Change | Related Scenario / Requirement | Coherent Test Responsibility | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/startup/prisma-engine-discovery.docker.mjs` | Updated (+19/−21) | BEH-001 preserved; design Change Scope, old-layout consumer | Linux Prisma engine choice, startup and recreation over the same HOME/data, in the shipped image | Stage API003 changes how it proves its fixture; API002, API004 and API005 are unchanged |

- No durable test file changed: `No`

## Proportional Test-Code Checks

| Check | Result | Evidence / Notes |
| --- | --- | --- |
| Scenario grouping and names make intent clear | Pass | The header's case list and the API003 event text now describe what the stage proves: an incompatible cache in HOME, yet the bundled engines are chosen |
| Assertions prove approved requirements instead of incidental details | Pass | The removed assertion (`old.source === 'cache'`) was a precondition that is now stale. In the package layout the pnpm store sits inside the app root, so even pre-fix code finds the bundled engines (`API-10-cause.log`: `ls` of both images and the `e22245f0` candidate list). The fixture is now proven directly: the cache's schema engine reports the wrong revision and its real RPC returns `-32601`. The guarding assertion is unchanged: `current.source === 'bundled'`, a matching version and a successful RPC. A future resolver that preferred the HOME cache would still fail it |
| Fixtures, setup, helpers reuse meaningful repetition | Pass | The same `rpc()`, the same official pinned, checksummed cache, and the same mounts. The cache path passed in `WRONG_ENGINE_CACHE` is the one the probe writes (`home/.cache/prisma/master/<rev>/<target>`, line 239); `native.mjs` asserts that it exists |
| Isolation and determinism appropriate | Pass | `--network none`, test-owned bind mounts, cache bytes unchanged before and after (`manifest(cache)`), cleanup receipt |
| Large file coherent and navigable | Pass | One surface; it got smaller |
| No stale, duplicated, disabled, or compatibility-only tests | Pass | The baseline machinery is gone completely: `--baseline-ref`, `git show`, the TypeScript transpile and `/fixture/base.mjs`. `grep` finds no leftover reference, and `package.json` never passed `--baseline-ref` |
| Coverage agrees with investigation and execution evidence | Pass | Round 2 at `4c356d69b7`: API002..API005 Pass (`events.jsonl`); `native-proof.json`: `source: bundled`, wrong RPC `-32601`, wrong version `c2990dca…`, 27 migrations listed by the matching engine |
| Fixtures exercise an independently established scenario | Pass | A stale engine cache in a retained `/root` is the regression this probe has always guarded. The step-1 layout is the approved target |
| Enters through the real trigger without unreal setup | Pass | The real image, the package's own `dist/startup/migrations.js`, and real native engine processes. API004/API005 start through the image's normal entrypoint |

## Findings

None.

## Follow-ups

- Follow-ups this review added: None.

## Latest Authoritative Result

- Result: `Pass`
- Changed durable test paths reviewed: `autobyteus-server-ts/tests/e2e/startup/prisma-engine-discovery.docker.mjs` (`4c356d69b7`)
- Unresolved finding IDs: none (the CRR-001 non-blocking notes CR-N1..CR-N3 remain open for implementation; they are not test findings)
- Recommended Recipient: `delivery_engineer`
- Notes: AC-011's GitHub part (API-16) is user-only. Delivery should watch the first release (23 assets) and compare a published archive with the image's package.
