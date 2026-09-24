# Code Review Report — AGY runtime implementation

## Latest result and authority

- **CRR-009 — Pass.** Bounded implementation-source re-review of IR-007 at commit `e23a029b2`; prior CRR-008 was Fail — Local Fix. Task remains **Large / High**, so independent API/E2E validation still applies. This is source readiness only, not a successful API/E2E test-code review or delivery acceptance.
- Approved authority: SR-016/SR-019/SR-021 `requirements-doc.md`, `investigation-notes.md`, `solution-revision-record.md`, `design-spec.md`, ARCH-REV-003 Pass and `architecture-review-revision-record.md`. Implementation authority: `implementation-handoff.md` and `implementation-revision-record.md` IR-001–007. Prior review/failure chain: `code-review-revision-record.md` CRR-001–008 and API/E2E `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, `api-e2e-revision-record.md` API-REV-003, ledger, round-3 evidence and logs. Delivery: N/A.
- Scope: CRR-008/CR-006 first, at the shared GraphQL schema builder and its focused Org query regression. Prior full AGY source-audit rationale remains CRR-002 and unaffected later bounded passes. No provider/stream/frontend full audit was repeated; no source or test fix was made by this reviewer.

## Supported scenario and corrected failure basis

The approved normal SCN-002/REQ-009/AC-008 user journey remains: launch an AGY Org, run direct/nested members, then view or reopen an exact member's conversation and Event Monitor through the production web → public GraphQL → projection/trace path. API-REV-003 proved real Org AGY execution and scoped director→worker delivery but not clean public-view success. Its API-F-003 shifted-argument failure followed the E2E fixture's second in-process full TypeGraphQL schema build; the later HTTP request used a schema already mutated by global parameter metadata. Normal production startup registers one schema per server child process, and Electron restart launches a new child. This test-only second-build premise is not a supported product lifecycle. CRR-007/CR-005 production-defect attribution remains withdrawn; a clean public HTTP/browser Org projection is still required downstream, not assumed to pass.

## IR-007 prior-finding resolution and source check

| Candidate/finding | Current status and evidence |
| --- | --- |
| **CR-006 / CF-006** unsupported schema cache | **Resolved.** `autobyteus-server-ts/src/api/graphql/schema.ts` is identical to its pre-IR-006 `97f881366` production version: no module-level `schemaPromise`, altered return contract, or special AGY path. The cache-specific assertion is removed. The focused unit query still builds once and proves distinct `orgRunId`, member address, run ID and adjacent trace-page cursor reach the correct service methods. Reviewer independently reran this Org GraphQL suite after `prepare:shared`: **3/3 passed**. Generated shared dist from that preparation was removed after the run. |
| CR-005 | Remains withdrawn as an implementation-origin finding. The real Org public projection result awaits a clean-server API/E2E rerun without a second schema build. |
| CR-001/CR-002/CR-003/CR-004 | Remain resolved; no contrary source or execution evidence. CR-003 real Team delivery/continuation and CR-004 real Org stream/member delivery were confirmed in API-REV-003. |

**Candidate/mechanism gate:** no new candidate. IR-007 removes, rather than adds, machinery for an unsupported fixture-only lifecycle. The retained distinct-ID query verifies an existing public contract but does not claim full real-user validation. No new migration, compatibility shim, fallback, provider behavior, or frontend change. The changed implementation source has a negative delta; source size and placement concerns do not arise. `git diff --check` passes. Implementation Engineer reports focused Org/Team/definition-catalog GraphQL suites 9/9 and production server TypeScript check passing; reviewer independently repeated the affected Org suite only. A first attempt before preparing shared packages failed at import resolution and executed zero tests; the prepared rerun passed, so that setup failure is not attributed to the source change.

## Affected score and classification

The CRR-008 API/interface lifecycle clarity deduction is removed (**7.0 → 9.0**); the earlier CRR-007 behavior deductions remain withdrawn. Other CRR-006 source categories retain their prior rationale; bounded overall source score **9.0/10**. **Pass** at the source boundary. This score does not lift API-REV-003's overall Fail or replace fresh Org public-view proof.

## Route and remaining gate

Route the complete package to `/api_e2e_engineer`. API/E2E should first correct its fixture to query the running server's public HTTP GraphQL endpoint without independently rebuilding the schema, then rerun real AGY-05 Org exact direct/nested member projection, trace-page/reload and public web hydration as appropriate. Follow with full real Team+Org and non-AGY checks. If a clean-server failure remains, return fresh evidence for focused origin review. Existing stubbed MCP probes are not real Team/Org parity; no delivery acceptance is claimed.
