# Code Review Report — mcp-sdk-v2-migration

## Review Round Meta

- Review Entry Point: `Implementation Review`
- Requirements Doc Reviewed As Context: `requirements-doc.md` (approved basis SR-002; SR-004 wording-only clarification of AC-001/AC-008)
- Investigation Notes Reviewed As Context: `investigation-notes.md` (cited sections only, through the design spec)
- Solution Revision Record Reviewed As Context: `solution-revision-record.md` (index only)
- Design Spec Reviewed As Context: `design-spec.md` (SR-004)
- Supplemental Task Artifacts Reviewed As Context: `follow-ups.md`; `probes/` as cited by the design (not re-run)
- Relevant Solution Revision IDs: SR-002, SR-004
- Design Review Report Reviewed As Context: `design-review-report.md` (round 2, Pass)
- Architecture Review Revision Record Reviewed As Context: `architecture-review-revision-record.md`
- Relevant Architecture Review Revision IDs: ARCH-REV-002
- Implementation Handoff Reviewed As Context: `implementation-handoff.md`
- Implementation Revision Record Reviewed As Context: `implementation-revision-record.md`
- Relevant Implementation Revision IDs: IR-001
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-001`
- Current Review Round: 1
- Review Scope: `Full Review`
- Review Scope Evidence (round >1): N/A
- Trigger: initial implementation (IR-001) ready for source review
- Prior Review Round Reviewed: N/A
- Latest Authoritative Round: 1
- Coverage Investigation / Execution Coverage Report / API/E2E Revision Record: N/A (implementation review)
- Delivery Revision Record: N/A
- Failing Scenario IDs / Commands / Evidence: N/A
- Code reviewed: worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/mcp-sdk-v2-migration`, branch `codex/mcp-sdk-v2-migration`, `git diff dc530fdcb0 ae7e907bf2` (23 files, +397/−213). `c3c7ede399` holds ticket docs only.

## Routing Classification Review

- Task size: `Medium`
- Architectural risk: `High`
- Selected route: `Implementation Review`
- Independent source review required by the classification: `Yes`
- Classification evidence or correction required: none. The footprint matches the design: 3 adapter files, 1 dead-code removal, 2 manifests, the root lockfile, 14 test/fixture files, 2 docs. The High drivers (blast radius, new packaged runtime packages, R-002/R-003) remain open for validation.

## Review Scope

- Changed implementation and behavior reviewed: the v2 client import and `callTool` options position in the three managed-server adapters; manifest and lockfile changes; the O-002 removal in `claude-sdk-client.ts`; all migrated and new tests and fixtures; the two docs.
- Files / areas reviewed: every file in the diff. Route source (`mcp-gateway-routes.ts` L26-27, L116-140, L161-165; agent-tools dispatcher/catalog `protocolVersion` uses) read to verify D-1.
- Explicit exclusions: the before/after parity run, packaging (R-002) and strictness (R-003, RR-001), which belong to API/E2E. Recorded checks were not rerun (no code changed after them). I ran only the AC-001, AC-008 and `core-internal` greps (all empty) and non-empty line counts.

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: parity-preserving swap to `@modelcontextprotocol/client` 2.3.1; approved differences DEC-003 (wording) and DEC-004 (all pages); `legacy` negotiation per DEC-002 with REQ-013; O-002 removed.
- Design-spec behavior map verified against the implementation: Yes.
- Design review report and round confirmed: round 2, `ARCH-REV-002`, Pass.
- Behavior-basis status: `Confirmed`
- Changed or newly discovered behavior: none. D-1 corrects an expected test value in the design text, not behavior (see below).
- Remaining material ambiguity: none.

| Behavior ID | Current Status | Current Implementation Path And Lifecycle Evidence | Contradicting Or Newly Discovered Evidence |
| --- | --- | --- | --- |
| BEH-001 | Confirmed | `stdio-managed-mcp-server.ts`: lazy `Promise.all([import('@modelcontextprotocol/client'), import('@modelcontextprotocol/client/stdio')])`; transport options (`command`, `args`, `env`, `cwd`) unchanged; transport close registered before connect. IMP-02/03/10 | — |
| BEH-002 | Confirmed | `http-managed-mcp-server.ts`: `requestInit.headers` unchanged; no `authProvider`/`fetch`. IMP-02/03/10 | — |
| BEH-003 | Confirmed | No `redirectPolicy` set (SDK default `same-origin`); comment states it. Both e2e assertions check URL and policy separately. IMP-10 | — |
| BEH-004 | Confirmed | SDK wording; docs updated (`mcp_server_management.md` Redirects) | — |
| BEH-005 | Confirmed | `listRemoteTools()` unchanged → v2 `listTools()` aggregates pages; new paging test asserts 4 tools in 2 `tools/list` requests | — |
| BEH-006 | Confirmed | `base-managed-mcp-server.ts` L113-116: `callTool({ name, arguments }, { timeout, signal })`. IMP-01 shows the v1 three-argument shape loses the signal on v2; real abort test now rejects in < 5 s | — |
| BEH-007 | Confirmed | `new Client({ name, version })` without options in both adapters. Stdio start log = 1 line; HTTP first method `initialize`, no `server/discover`, later requests `2025-11-25` | — |
| BEH-008 | Confirmed | Route source unchanged. `auto` client against the real routes: `server/discover` 400 → `initialize` 200, era `legacy`, list and call. Negotiated `2025-03-26` (D-1), identical for v1 1.32.1, v2 default and v2 `auto` (IMP-06) | — |
| BEH-009 | Confirmed | `createToolDefinition`, `createMcpServer`, `callSdkFunction`, `createSdkMcpServer` union/type members and the live test case removed; `asObject`/`asString` still used. AC-008 grep empty | — |
| BEH-010 | Confirmed (source side) | Manifests only; `verify:runtime-deps` OK (IMP-04). Packaged contents left to API/E2E (R-002) | — |

D-1 check: `mcp-gateway-routes.ts` L116 and L161 derive the version from the `mcp-protocol-version` header, default `2025-03-26`, and pass it to `dispatchInitialize`. `initialize` carries no header, so every SDK client gets `2025-03-26`. IMP-06 shows the same values and later request headers for v1 1.32.1, v2 default and v2 `auto`. AC-007 requires a legacy-era connection, list and call, not a version; all hold. Parity is preserved. The endpoint behavior is pre-existing and outside the Change Scope (FU-005). The design text that says `2025-11-25` for DS-002 and the AC-007 rows is stale; the Solution Designer owns that wording.

D-2 check: v2 inserts advice text between "not followed" and "(redirectPolicy: 'same-origin')" in both the preview and discover messages. Splitting each assertion into the URL part and the policy part keeps the security rule (target named, policy named, other origin receives nothing, no canary) and follows DEC-003.

## Supported Product Scenario And Reachability Gate (Mandatory)

| Scenario ID | Related Behavior / Contract IDs | Kind | Actor / Initiator | Coherent Goal Or Governing Event | Supported Entry Surface / Event | Scenario Shape | Forward Production Path / Lifecycle | Expected Outcome / Consequence | Independent Evidence | Scenario Validity | Review Use |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | BEH-001…005, 007 | User | User in Settings → MCP Servers | Add a server and see its tools | Preview / save | Normal | GraphQL → registrar → instance manager → managed server → v2 client → server | Tools listed and registered; clear errors | requirements-doc SCN-001 | Supported Normal Scenario | Use |
| SCN-002 | BEH-001, 006 | System | Agent on any runtime | Call an external MCP tool | Agent tool call | Normal | `McpTool` → managed server `callTool` → v2 client | Result, tool error, timeout, cancellation | SCN-002 | Supported Normal Scenario | Use |
| SCN-003 | BEH-003 | System | Remote server | Redirected endpoint | HTTP 3xx | Explicit Edge | SDK transport redirect policy | Same-origin followed; cross-origin refused | SCN-003 (security rule) | Supported Explicit Edge Scenario | Use |
| SCN-004 | BEH-008 | Contract | External MCP client | Use our endpoints | MCP connect | Normal | Route version check → dispatcher → catalog/executor | Connect, list, call | SCN-004 | Supported Normal Scenario | Use |
| SCN-005 | BEH-009, 010 | Operational | Maintainer | Ship the change | Build/package | Normal | manifests → install → packaged server | App starts, MCP works | SCN-005 | Supported Normal Scenario | Use |

### Candidate Finding And Mechanism Gate

| Candidate ID | Observation Or Mechanism | Scenario / Contract ID | Independent Trigger | Forward Path / Lifecycle / Consequence | Evidence | Disposition | Scope, if promoted | Reason / Proportionate Response |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C-001 | AC-007 tests assert `2025-03-26`, not the design's `2025-11-25` | SCN-004; AC-007 | External client connects | Route default for header-less `initialize`; parity with v1 | IMP-06; route L116, L161 | Reject | — | Not a defect: unchanged behavior, AC-007 holds. Endpoint behavior is FU-005; design wording is the Solution Designer's |
| C-002 | `recordingFetch` helper duplicated in the two endpoint integration test files | Engineering contract (test reuse) | — | Two ~10-line test-local helpers in different suites | diff | Reject | — | Proportionate for tests; the design keeps test infrastructure local |
| C-003 | `autobyteus-ts/package.json` lists `hono` `^4.0.0` in `dependencies`, but nothing in `autobyteus-ts` imports it | Principle 7 (dead code) | — | Unused runtime dependency in the packaged tree; no behavior consequence | `grep -rn hono autobyteus-ts` (non-`node_modules`): only the manifest line; entry predates the flatten commit `b1c89884e6`, origin unknown | Promote | Follow-up | The change did not add or reach it; only the MCP entries of the manifest are in the Change Scope, and why it was added (possibly an old v1 SDK peer) is unknown. FU-006 |
| C-004 | Existing base test still expects `{ timeout }` while the code passes `{ timeout, signal: undefined }` | AC-004 | — | Vitest equality ignores `undefined` properties; the new case asserts the signal explicitly | diff; IMP-02 | Reject | — | Correct as written |

## Structural / Design Checks

| Check | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Task design health assessment is present, evidence-backed, and preserved by the implementation | Pass | Adapter boundary absorbed the change in 3 files; `ClientSessionLike` unchanged apart from its type source | — |
| Implementation matches approved behavior-defining supplemental artifacts | Pass | No behavior-defining supplements; probes are evidence only | — |
| Data-flow spine inventory clarity and preservation | Pass | DS-001/002/003 unchanged; the SDK stays at the end of DS-001 | — |
| Ownership boundary preservation and clarity | Pass | Only `autobyteus-ts/src/tools/mcp/server/*` imports the client in production; server-ts `src` imports no MCP package | — |
| Off-spine concern clarity | Pass | None added | — |
| Existing capability/subsystem reuse check | Pass | New cases extend existing test files and the existing fixture (`MCP_TEST_SERVER_START_LOG` beside `MCP_TEST_SERVER_PID_FILE`) | — |
| Reusable owned structures check | Pass | C-002 rejected | — |
| Shared-structure/data-model tightness check | Pass | `ClientSessionLike = Pick<Client, 'listTools' \| 'callTool' \| 'close'>` | — |
| Repeated coordination ownership check | Pass | No policy added | — |
| Empty indirection check | Pass | No wrapper around the v2 client | — |
| Scope-appropriate separation of concerns and file responsibility clarity | Pass | Each adapter owns its transport; base owns lifecycle and calls | — |
| Ownership-driven dependency check | Pass | server-ts gets the client only through `autobyteus-ts`; v2 packages in server-ts are devDependencies only | — |
| Authoritative Boundary Rule check | Pass | No caller bypasses the managed servers | — |
| File placement check | Pass | No new files | — |
| Flat-vs-over-split layout judgment | Pass | Unchanged | — |
| Interface/API/query/command/service-method boundary clarity | Pass | `listRemoteTools()` and `callTool(name, args, { signal })` signatures unchanged | — |
| Naming quality and naming-to-responsibility alignment | Pass | No `v2` in names (DESIGN.md rule 8); fixture env name matches its sibling | — |
| No unjustified duplication of code / repeated structures in changed scope | Pass | C-002 only, test-local | — |
| Patch-on-patch complexity control | Pass | Straight replacement; `ae7e907bf2` is a two-line test assertion fix | — |
| Dead code removed in the touched files and modules | Pass | O-002 fully removed, including `callSdkFunction`, the type members and the orphaned `zod` test import; `asObject`/`asString` still used. C-003 is outside the MCP entries and recorded as FU-006 | — |
| Relevant test scenarios and assertions are clear and requirement-aligned | Pass | AC-004 real abort (proven failing on the old shape, IMP-01) + options assertion; AC-005 real paging server; AC-006 stdio start count and HTTP method/header order; AC-007 real routes with a recording `fetch` | — |
| Test fixtures/helpers are reasonably reusable and coherent | Pass | Tests use real v2 servers in-process; no SDK mocks for behavior claims | — |
| No stale, duplicated, or compatibility-only tests retained | Pass | Live `createMcpServer` case removed; no v1 test server kept (DEC-005). FU-004 (stale `openStreamingSession` in the gated live file) is pre-existing on base | — |
| API/E2E readiness | Pass | Handoff lists the parity scope, packaged-contents expectations, D-1 expected values and RR-001 recording | — |

## Source File Size And Structure Audit

| Source File | Effective Non-Empty Lines Before | After | `>500` Hard-Limit Check | `>220` Delta Check | SoC / Ownership | Placement | Classification | Required Action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/runtime-management/claude/client/claude-sdk-client.ts` | 460 | 395 | Pass | Pass (−65) | Pass | Pass | — | — |
| `autobyteus-ts/src/tools/mcp/server/base-managed-mcp-server.ts` | ~115 | ~114 | Pass | Pass (−1) | Pass | Pass | — | — |
| `autobyteus-ts/src/tools/mcp/server/http-managed-mcp-server.ts` | ~25 | ~23 | Pass | Pass | Pass | Pass | — | — |
| `autobyteus-ts/src/tools/mcp/server/stdio-managed-mcp-server.ts` | 26 | 26 | Pass | Pass | Pass | Pass | — | — |

## Legacy / Backward-Compatibility Verdict

| Check | Result | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms in changed scope | Pass | No wrapper, no option overrides, no v1 devDependency |
| No legacy old-behavior retention in changed scope | Pass | AC-001 grep empty; v1 only as the Claude Agent SDK / GenAI peer in the lockfile |
| Dead code removed in the touched files and modules | Pass | O-002 complete; AC-008 greps empty |
| Approved persisted-data transition decision is followed | Pass | `Not Affected`; nothing persisted changes |
| No version-specific dual reads/writes or request-time fallback | Pass | — |
| Approved transition mechanics match the reviewed design | Pass | N/A (no migration) |

## Dead / Obsolete / Legacy Items Requiring Removal

None in this ticket's scope. `hono` in `autobyteus-ts` `dependencies` is recorded as FU-006.

## Docs-Impact Verdict

- Docs impact: `Yes`, done in this change.
- Why: package names, redirect wording, negotiation default, test package set, verification list.
- Files: `autobyteus-server-ts/docs/modules/mcp_server_management.md`, `agent_execution.md`. The docs' "2025-11-25" refers to our client against external servers, which is correct. The design spec's DS-002 narrative and AC-007 rows still say `2025-11-25` for our endpoints (D-1); that is design wording for the Solution Designer, not a product-doc error.

## Additional Material Premise Validation

### Upstream Design-Review Material-Premise Decisions

| Premise ID | Current Status | Changed Evidence / Reason |
| --- | --- | --- |
| MP-001 (draft-04 `outputSchema` rejected by v2) | Confirmed | Still `Unclear` reachability; recorded by the parity run (RR-001). No code change needed here |

No new or reclassified premises.

## Review Scorecard (Mandatory)

- Overall score: 9.5/10 (95/100), a simple average for visibility only.

| Priority | Category | Score | Why This Score | What Is Weak / Holding It Down | What Should Improve |
| --- | --- | --- | --- | --- | --- |
| 1 | Data-Flow Spine Inventory and Clarity | 9.5 | DS-001…003 unchanged; SDK stays at the adapter end of DS-001 | — | — |
| 2 | Ownership Clarity and Boundary Encapsulation | 9.5 | Only the three adapters import the client; server-ts `src` has no MCP import | — | — |
| 3 | API / Interface / Query / Command Clarity | 9.5 | Public signatures unchanged; SDK call shape corrected and proven | — | — |
| 4 | Separation of Concerns and File Placement | 9.5 | No new files; each change in its owner | — | — |
| 5 | Shared-Structure / Data-Model Tightness and Reusable Owned Structures | 9.5 | `ClientSessionLike` tight | Test-local `recordingFetch` in two files (acceptable) | — |
| 6 | Naming Quality and Local Readability | 9.5 | Comments state the kept SDK defaults; no version in names | — | — |
| 7 | API/E2E Readiness | 9.0 | Handoff gives exact parity scope, expectations and D-1 values | Packaged contents and real-server strictness unproven until API/E2E (by design) | Settle R-002/R-003 in the parity run |
| 8 | Runtime Correctness And Behavioral Fidelity | 9.5 | IMP-01 proves the signal fix with a real abort; handshake, paging and endpoint fallback tested against real servers/routes | Parity on real published servers pending (API/E2E) | — |
| 9 | No Backward-Compatibility / No Legacy Retention | 9.5 | No v1 in AutoByteus code or manifests; no wrappers | — | — |
| 10 | Cleanup Completeness | 9.5 | O-002 complete incl. `callSdkFunction` and type members; v1 comments reworded | `hono` dependency question left as FU-006 | — |

## Findings

None.

## Follow-ups

- Follow-ups this review added: FU-006 (unused `hono` dependency in `autobyteus-ts/package.json`).
- Implementation's FU-004 and FU-005 verified as pre-existing and outside the Change Scope.

## Classification

N/A (Pass).

## Recommended Recipient

- API/E2E Engineer (primary pass); informational notice to the Implementation Engineer.

## Residual Risks

- R-002 (packaged-app dependency gap) and R-003 (v2 strictness, including RR-001/MP-001): settled only by the packaged before/after parity run.
- REQ-013/AC-012: a protocol-era failure in validation returns to the Solution Designer as a design re-entry.
- D-1: when comparing the endpoints, expect `2025-03-26` on both base and branch. The design spec's `2025-11-25` wording for DS-002/AC-007 is stale and should be corrected by the Solution Designer.
- The Node fixture now needs `autobyteus-ts`'s devDependencies (`@modelcontextprotocol/server`, `/node`); fine in the workspace, relevant only if the fixture were run from a packaged tree.

## Latest Authoritative Result

- Review Decision: `Pass`
- Review Entry Point: `Implementation Review`
- Supported Product Scenario Gate: `Pass`
- Material-Premise Gate: `Pass`
- Score Summary: 9.5/10; every category ≥ 9.0
- Failure Origin: N/A
- Recommended Recipient: API/E2E Engineer
- Notes: CRR-001. Classification `Medium`/`High` preserved. D-1 and D-2 accepted.
