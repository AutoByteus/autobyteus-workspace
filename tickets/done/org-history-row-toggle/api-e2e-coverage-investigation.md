# API/E2E Coverage Investigation — ORG-HISTORY-ROW-TOGGLE-20260920-001

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/org-history-row-toggle/tickets/in-progress/org-history-row-toggle/requirements-doc.md` (`SR-001`, Approved)
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/org-history-row-toggle/tickets/in-progress/org-history-row-toggle/investigation-notes.md`
- Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/org-history-row-toggle/tickets/in-progress/org-history-row-toggle/solution-revision-record.md` (`SR-002`)
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/org-history-row-toggle/tickets/in-progress/org-history-row-toggle/design-spec.md`
- Supplemental Task Artifacts: `solution-handoff.md`, `bootstrap-handoff.md`, and the two user screenshots referenced by the requirements
- Design Review Report / Architecture Review Revision Record: `N/A — not applicable for the Small / Low direct route`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/org-history-row-toggle/tickets/in-progress/org-history-row-toggle/implementation-handoff.md`
- Implementation Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/org-history-row-toggle/tickets/in-progress/org-history-row-toggle/implementation-revision-record.md` (`IR-001`)
- Code Review Report / Code Review Revision Record: `N/A — not applicable for the Small / Low direct route`
- Delivery Revision Record: `N/A — initial validation`
- API/E2E Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/org-history-row-toggle/tickets/in-progress/org-history-row-toggle/api-e2e-revision-record.md` (`API-REV-001`, created after execution)
- Test-Case Ledger: `/Users/normy/autobyteus_org/autobyteus-worktrees/org-history-row-toggle/tickets/in-progress/org-history-row-toggle/api-e2e-test-case-ledger.md`
- Current Investigation Round: `1`
- Trigger: Direct implementation handoff `IR-001`
- Prior Investigation Reviewed: `N/A — no prior API/E2E result`
- Latest Authoritative Investigation: This file

## Routing Classification

- Task size: `Small`
- Architectural risk: `Low`
- Input route: `Direct Low-Risk`
- Successful-output route: `Delivery`
- Proportional test-code review decision: `Not Required — direct low-risk route`

## Current Requirement And Design Basis

`REQ-001`–`REQ-004` and `AC-001`–`AC-004` require the primary AgentOrg history-run button to toggle its exact hierarchy in both directions while still opening/selecting that exact Org. Repeated activation must collapse the hierarchy without clearing the opened Org. The dedicated chevron remains disclosure-only, Stop remains isolated, siblings and Agent Team behavior remain unchanged, and the semantic primary button must expose accurate `aria-expanded` plus exact conditional `aria-controls`. `DS-001`/`DS-002` keep the correction local to the existing component, exact-root tree-state toggle, and existing open action. Backend, API, router, persistence, migration, provider, and Electron-shell behavior are intentionally unchanged.

## Changed Behavior Summary

| Behavior / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| Primary AgentOrg history summary button | Changed | `BEH-001`, `REQ-001/002`, `AC-001/002`, `DS-001` | Exercise pointer and keyboard activation against real active and stopped rows; observe exact selection and hierarchy |
| Primary-button disclosure ARIA | Added | UI/accessibility requirement, `QR-001` | Assert expanded state and exact/conditional child relationship in the browser DOM/AX tree |
| Chevron disclosure, Stop, siblings | Preserved | `BEH-002`, `REQ-003`, `AC-003`, `DS-002` | Prove chevron does not navigate and Stop does not select/toggle |
| Agent Team history behavior | Preserved | `REQ-004`, `AC-004`, `QR-002` | Run a real Team-row comparator |
| Backend/API/persistence/provider | Preserved / unaffected | `REQ-004`, implementation manifest | Build current backend for the environment, observe logs, and compare representative bytes rather than invent API calls |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence | Material Risk Remaining After Repository Checks | Broader Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | No | None | Exact two-file manifest | Accidental cross-boundary call only | Process/log observation |
| API / transport / contract | No | None | No API diff | None material | No direct API probe |
| Frontend component / state | Yes | Local primary-button handler and ARIA | Real component/tree-state regression | Real browser event composition | Browser |
| Browser integration / user journey | Yes | Pointer/keyboard disclosure + selection | Repository DOM tests only | Actual active/stopped UI, focus, selection, bubbling | Browser |
| Authentication / session / permissions | No | None | Local application | None | N/A |
| Desktop renderer / web-equivalent UI | Yes | Web-equivalent Vue renderer | Nuxt component tests/build | Actual desktop-width renderer | Chrome against Nuxt |
| Desktop shell / Electron | No | No shell/IPC code | Diff | None material | Browser is sufficient |
| Process / lifecycle | Preserved | Active Stop only | Component regression | Real active→stopped row boundary | Browser + backend log |
| Persisted-data transition | No | `Not Affected` | Design/implementation handoff | Accidental mutation of existing histories | Isolated profile SHA comparison |
| Worker / queue / distributed | No | None | N/A | None | N/A |
| External integration | No | No provider Send required | N/A | Avoid accidental provider call | Blank provider keys + log check |

## Project Execution Discovery

- Assigned worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/org-history-row-toggle`
- Stack: Nuxt 3 / Vue 3 frontend, TypeScript backend, Vitest/Nuxt test environment, Chrome browser.
- Required secrets: `N/A`; provider keys were deliberately blank in the isolated clone because the approved journey requires no Send/inference.
- Conflicting instructions: None. The first focused test attempt revealed the normal `.nuxt/tsconfig.json` prerequisite; `nuxi prepare` was run, recorded, and the exact test command then passed.

| Instruction / Configuration Path | Purpose | Learned Constraint |
| --- | --- | --- |
| `autobyteus-web/AGENTS.md`, `autobyteus-web/README.md`, `autobyteus-web/package.json` | Frontend setup/tests/dev server | Use pnpm/Nuxt; prepare generated Nuxt test configuration before Vitest in a fresh worktree |
| `autobyteus-server-ts/AGENTS.md`, `autobyteus-server-ts/package.json` | Backend build/start | Use `pnpm build`; shared SDK outputs are prerequisites and must be cleaned if generated by validation |
| `tickets/in-progress/org-history-row-toggle/validation/README.md` | Implementation evidence | Focused 8 tests, adjacent clean 87 tests, production build pass; broad fixture drift is baseline-qualified |

| Component | Setup / Start | Readiness | Cleanup |
| --- | --- | --- | --- |
| Backend | Current production build; owned loopback `127.0.0.1:51581`; explicit isolated DB/memory; blank provider keys | Listening log and port | Ctrl-C owned session; verify port/process absent |
| Frontend | `BACKEND_NODE_BASE_URL=http://127.0.0.1:51581 pnpm -C autobyteus-web dev --port 51583 --host 127.0.0.1` | Nuxt ready log and page load | Ctrl-C owned session; verify port absent |
| Browser | Normal Chrome at desktop width through the supported browser tool | AX tree contains real Workspace histories | Close only validation-created tab |

| Data / Fixture Need | Mechanism | Safety | Cleanup / Retention |
| --- | --- | --- | --- |
| Representative stopped Org + Team histories | Copy-on-write isolated clone `.local/api-row-toggle-profile`; SQLite transaction-consistent backup | User live profile/server never used or restarted | Remove owned clone after snapshot/log evidence is persisted |
| Active Org row | Ordinary catalog Run flow for `Nested Classroom Test Org`, model selection, then Run; no Send | Disposable run lives only in clone; Stop performed through UI | Removed with the owned clone after validation; no provider process started |

## Persisted Data Transition Coverage Basis

- Approved decision: `Not Affected`.
- Representative direct-use behavior: Existing stopped AgentOrg and Team histories must remain usable and byte-identical through disclosure/selection.
- Evidence: `targets-before.json`, `targets-after-browser.json`, and `persistence-comparison.json` compare the owned SQLite database, the exact stopped Org tree, and the exact Team comparator tree.
- Migration scenarios: `N/A`.
- Ambiguity/reroute: None.

## Existing Durable Coverage Inventory

| Path / Scenario | Decision | Evidence | Action |
| --- | --- | --- | --- |
| `WorkspaceAgentOrgDisclosure.spec.ts` active/stopped primary toggle, exact opening, ARIA, chevron, Stop, siblings | Still Valid | Directly maps `AC-001`–`AC-003` and fails two new cases against pre-change source | Rerun exactly |
| `WorkspaceHistoryWorkspaceSection.spec.ts` Team/section behavior | Still Valid | Preserved comparator for `AC-004` | Rerun adjacent |
| Exact pre-change component substitution | Still Valid as temporary regression proof | `baseline-regression.log` | Carry implementation evidence; no new permanent harness |
| Three broad workspace-history suites with 18 failures/16 errors | Qualified baseline, not candidate defect | Same failure identities/counts on exact pre-change component | Do not force unrelated fix or conceal qualification |

## Durable Coverage Decisions

- Add: None. `IR-001` already added the correct colocated real-component regression.
- Update: None owned by API/E2E.
- Remove: None.
- Stale/obsolete coverage deletion: None.
- Temporary executable coverage: Real Chrome journey and byte/log probes are appropriate because the gap is environment/event composition, while the maintainable regression already exists in the repository.

## Repository Coverage Execution Plan And Results

| Order | Command | Boundary | Result | Evidence |
| --- | --- | --- | --- | --- |
| 1 | Verify `validation/ir001-source-manifest.json` hashes | Candidate identity | Pass — 2/2 exact | `validation/api-e2e/manifest-check.json` |
| 2 | Initial focused Vitest command | Fresh-worktree setup | No test executed — missing `.nuxt/tsconfig.json`; corrected through documented prepare | `validation/api-e2e/repository-tests.log` |
| 3 | `pnpm -C autobyteus-web exec nuxi prepare` | Nuxt test workspace | Pass | `validation/api-e2e/nuxt-prepare.log` |
| 4 | `pnpm -C autobyteus-web test:nuxt WorkspaceAgentOrgDisclosure.spec.ts WorkspaceHistoryWorkspaceSection.spec.ts --run` | Direct component + Team comparator | Pass — 2 files / 19 tests | `validation/api-e2e/repository-tests.log` |
| 5 | `pnpm -C autobyteus-server-ts build` | Current listening-server prerequisite and preserved backend build | Pass, sanitized bootstrap smoke | `validation/api-e2e/server-build.log` |

## Test-Case Ledger Plan

- Ledger required: `Yes`; repository, multiple browser journeys, lifecycle Stop, persistence, and cleanup are independently meaningful and interruption-prone.
- Canonical path: `api-e2e-test-case-ledger.md`
- Initialized before execution: `Yes`
- Cases: `R01`, `B01`, `B02`, `B03`, `B04`, `C01`; see the ledger for the requirement mapping and event history.

## Post-Repository Confidence Scorecard

| Category | Score | Support | Remaining Uncertainty / Needed Validation |
| --- | ---: | --- | --- |
| Requirement and AC proof | 85% | Focused active/stopped regression maps every AC | Actual application surface not yet exercised |
| Changed-boundary directness | 92% | Real component + real tree-state owner | Browser event/default action remains |
| Cross-boundary integration realism | 75% | No backend boundary changed; component dependencies mounted | Real frontend/backend/history integration absent |
| Environment/configuration/fixture fidelity | 80% | Exact candidate and project tests | Real representative history not yet loaded |
| Failure/edge/lifecycle/recovery | 85% | Chevron/Stop/sibling cases in durable suite | Real active Stop and focus bubbling absent |
| User-surface/browser/desktop | 65% | DOM renderer tests only | No actual browser yet; critical for this ticket |
| Durable regression quality | 95% | Focused regression catches original defect and adjacent Team suite passes | Broad pre-existing fixture drift remains qualified |

- Overall post-repository confidence: **82.4%** (simple average, one decimal).
- Every critical AC directly proven: `No` — browser surface still required.
- Applicable categories below 90%: requirement proof, cross-boundary realism, environment fidelity, lifecycle, browser.
- Default 95% target met: `No`.

## Broader Validation Decision

- Decision: `Required`
- Selected mode: `Browser` with owned listening backend/Nuxt plus process/file corroboration.
- Gap: Actual pointer/keyboard event composition, active/stopped presentation, exact retained selection, secondary-control propagation, and representative history integration.
- Why material: The defect is specifically a user-visible row interaction; mocked/component success cannot certify the actual browser tree and user journey.
- Expected confidence: At least 95% if every AC passes with no category below 90%.
- Desktop decision: Browser is the supported and higher-isolation proof for web-equivalent renderer behavior. No Electron IPC/shell code changed; running Electron would add risk without evidence gain.
- Effect on any user desktop application/server/profile: None.

## Live Environment And Fixture Plan

- Startup: build backend; start owned backend `51581`; start owned Nuxt `51583`; open normal Chrome.
- Identity/data: isolated copy-on-write profile clone; exact stopped Software Development Department Org, exact stopped Software Engineering Team, disposable Nested Classroom Test Org active run.
- Journeys: primary pointer toggle, Space/Enter, ARIA, chevron-only, active toggle, Stop isolation while another Org is selected, sibling isolation, Team comparator.
- Evidence: semantic DOM/AX state, URLs, screenshots, browser console, backend log, before/after SHA-256 tree/database snapshots.
- Cleanup: close validation tabs; stop owned services; verify ports/processes; remove generated SDK outputs; preserve only ticket evidence and owned clone.

## Not Tested / Deferred

| Boundary | Reason | Risk / Follow-Up |
| --- | --- | --- |
| Electron shell | No shell/preload/window code changed; browser directly exercises the web renderer | Negligible; no follow-up required for this scope |
| Live provider inference | No Send/provider behavior is in scope; starting a provider would not exercise the toggle | None; provider keys intentionally blank |
| Broad pre-existing fixture-drift suites | Exact same 18 failures/16 errors on pre-change source | Qualified repository health debt; not a ticket failure |

## Investigation Decision

- Proceed to execution: `Yes`
- Repository durable coverage changed by API/E2E: `No`
- Post-repository confidence: `82.4%`
- Broader validation: `Required — normal Chrome`
- Reroute before execution: `No`
- Notes: All planned browser cases subsequently passed; the completed result is authoritative in `api-e2e-execution-coverage-report.md` and `API-REV-001`.
