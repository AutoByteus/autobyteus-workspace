# API/E2E Execution Coverage Report — autobyteus-384 (list_projects returns each Project's linked folders)

## Round

- Coverage investigation: `tickets/in-progress/list-projects-workspaces-384/api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md`, `API-REV-001`
- Test progress log: `api-e2e-test-progress.md`
- Round and trigger: Round 1; implementation_engineer handoff (IR-001, HEAD `af13798404`)
- Prior round reviewed: None
- Deviations from the investigation's plan, and why: None. API-03 also gained a negative control (below).
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/list-projects-workspaces-384/tickets/in-progress/list-projects-workspaces-384/evidence/`

## Routing Classification

- Task size: `Small`
- Architectural risk: `Low`
- Input route: `Direct Low-Risk`
- Successful-output route: `Delivery` (then a new beta release, DEC-004 / SR-002)
- Proportional test-code review decision: `Not Required — direct low-risk route`

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-1 | `af13798404` + E-006 assertions (committed as `590cddaff1`) | macOS 26.5.2 arm64 | Node v22.23.1; in-process studio server with the agent-tools MCP HTTP host | `env -i PATH HOME=<fresh temp> TMPDIR`; test-owned temp data dir |
| ENV-2 | `590cddaff1` + temporary probe | as ENV-1 | In-process studio server, native AutoByteus runtime, LM Studio `qwen/qwen3.6-35b-a3b` at 127.0.0.1:1234 | No model was loaded before; unloaded after |

## Cases

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-01 | AC-001, AC-003, AC-004 | projection, native tool, MCP adapter, description | Reused: IMP-01 | — | Pass | — | — | Ran at `911a303a25`; HEAD `af13798404` adds only ticket files |
| API-02 | AC-005 | server gate, `test:unit` | Reused: IMP-02 | — | Pass | — | — | Same source tree. Its one test:unit failure was the tracked-imports check on the then-uncommitted `project-summary.ts`; `tests/architecture` passed 61/61 after the commit |
| API-03 | AC-001, AC-002, AC-004; preserved `projectId`/`name`/`description` | Real HTTP MCP host + GraphQL + native tool | E-006 extended: after `create_project` over MCP links two folders (one with description "Frontend") and a Project with no description links one, `list_projects` over MCP must equal the native result, list the first Project with `workspaces` exactly as AC-001, equal its `create_project` ack, and list the second with no `description`. Run: `env -i PATH HOME=<temp> TMPDIR pnpm -C autobyteus-server-ts exec vitest run tests/e2e/projects/project-task-boundaries.e2e.test.ts --no-watch`. Negative control: E-006 alone with base `1964ce9874`'s `project-service.ts` in place, then restored | ENV-1 | Pass | `API-03-project-task-boundaries-e2e.log` | "Tests  18 passed (18)", exit=0, "✓ … E-006: path links retain descriptions …", "✓ … API-MCP: selected default host …", "✓ … E-005 …"; control: "× E-006 …", "expected [ { …(2) }, { …(3) } ] to deep equally contain { …(4) }", exit=1; "restored: git status of file ''" | The existing folder-less expectations (API-MCP L173-176, E-005 L340-342, collision L293) still hold unchanged |
| API-04 | AC-005 | server type gate | `env -i PATH HOME=<temp> TMPDIR pnpm -C autobyteus-server-ts typecheck` | ENV-1 | Pass | `API-04-server-typecheck.log` | "production errors: 0; test-file errors: 1184 in 366 files (baseline 1184 in 366 files)", "[typecheck] PASS" | — |
| API-05 | SCN-001 (SCN-A2), AC-003 | live native AutoByteus run: tool → result → model | Temporary probe `tests/e2e/runtime/zz-api05-list-projects-live.e2e.test.ts` (copy in evidence). GraphQL creates "Shop" (folders `work/shop/web` "Storefront UI" and `work/shop/api`), "Docs site" (`work/docs`) and "Billing" (no folders). An agent with only `list_projects` is asked which Project `work/shop/web/src/cart` belongs to, answering with the projectId | ENV-2 | Pass | `API-05-live-list-projects-autobyteus-lmstudio.log`, `API-05-probe-source.e2e.test.ts.txt` | "✓ the agent sees each Project's folders and names the Project a folder belongs to", exit=0; report: one call `list_projects`, its result has `"workspaces":[{"workspaceRootPath":"<data>/work/shop/web","description":"Storefront UI"},{"workspaceRootPath":"<data>/work/shop/api"}]` and Billing without `workspaces`; `"answer": "\n\nproject_592d0782-…"` = `shopId`; `"errors": []` | One model, one run: it shows the field and description reach a model and are usable, not that every model reasons correctly |

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | For A User-Only Part |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | API-01, API-03, API-05 | Proven | — |
| AC-002 | Yes | API-01, API-03 (a listed entry equals its `create_project` ack; E-005/E-006 acks unchanged) | Proven | — |
| AC-003 | Yes | API-01, API-05 | Proven | — |
| AC-004 | Yes | API-01, API-03 (over real HTTP MCP) | Proven | — |
| AC-005 | Yes | API-02, API-04 | Proven | — |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | What Supports It | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 96% | 97% | API-01..API-05 | — | — |
| Changed-boundary execution directness | 96% | 97% | API-03 through the real MCP HTTP host; API-05 through a real runtime | — | — |
| Cross-boundary integration realism and mock gap | 92% | 96% | API-03 (no service doubles), API-05 (live model) | Claude/Codex agents not run live; their transport is API-03's | Paid runs; not justified |
| Environment, configuration, identity, and fixture fidelity | 95% | 95% | Clean env, temp data, Projects created through the public APIs | — | — |
| Failure, edge-case, lifecycle, and recovery evidence | 93% | 95% | Empty description, no folders, a link without description, unregistered missing folder (E-006), negative control | — | — |
| User-surface, browser, and desktop-shell confidence | N/A | N/A | No UI change (GraphQL `listProjects` untouched) | — | — |
| Durable regression coverage quality and relevance | 95% | 96% | Unit tests plus the E-006 real-MCP assertions, proven non-vacuous by the control | — | — |

- Overall post-repository confidence: 94.5%
- Overall final confidence: 96.0%
- Calculation method: simple average of the six applicable categories
- Every critical acceptance criterion directly proven, apart from parts only the user can check: `Yes`
- Any final applicable category below `90%`: `No`
- Default final confidence target of `95%` met: `Yes`
- Confidence-limiting residual risks: one live model and one run for the agent-use scenario.

## Broader Validation Decision (Mandatory)

- Decision: `Required` (and executed)
- Execution mode: `Live API` (API-05)
- Confidence gap or residual risk it addresses, and the expected gain: the purpose of the change is that an agent sees and uses each Project's folders. A live run shows the native tool's result and description reaching a real model, which answers correctly.
- Browser validation needed, and why or why not: No. Agent-tool contract only; no UI or GraphQL change.

## Persisted-Data Transition Checks

- Approved persisted-data decision: `Not Affected` (read-only). E-006 still asserts that the stored `project.json` links are unchanged; no transition applies.

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No` (the private `projectAcknowledgement` was removed, not kept)
- Durable coverage added or retained only for compatibility-only behavior: `No`
- If compatibility-related invalid scope was observed, reroute classification used: N/A
- Upstream recipient notified: N/A

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `Yes`

| Path / Test | Change | Case IDs | Removal Rationale |
| --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/projects/project-task-boundaries.e2e.test.ts` E-006 | Updated (commit `590cddaff1`): `list_projects` over real MCP lists the linked folders, equals native and equals the create ack | API-03 | — |

- Added or updated paths attached for proportional test-code review: `Not Applicable` (direct low-risk route)

## Dependencies Mocked Or Emulated

None. API-03 uses the real server, MCP host and file store; API-05 uses a real local model.

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup Action | Result |
| --- | --- | --- | --- |
| Probe `tests/e2e/runtime/zz-api05-list-projects-live.e2e.test.ts` | Yes | Deleted; copy kept as evidence | Done; not committed |
| Base `project-service.ts` for the negative control | Yes | `git checkout --` the file | Done; `git status` clean for it |
| Temp data dirs, temp HOMEs, probe report | Yes | Removed (the tests' `afterAll` and `rm -rf`) | Done |
| LM Studio `qwen/qwen3.6-35b-a3b` load | Yes (none loaded before) | `lms unload --all` | Done; "No models are currently loaded." |
| Untracked SDK `dist/` folders | No (implementation's prepare step) | Left alone; not committed | — |

## Latest Authoritative Result

- Result: `Pass`
- Criteria not proven, or parts only the user can check: `None`
- Preliminary classification and recommended owner: N/A
- Next recipient from `get_handoff_rules`: delivery_engineer (direct low-risk route); delivery then cuts the new beta release (DEC-004, SR-002)
- Notes: —
