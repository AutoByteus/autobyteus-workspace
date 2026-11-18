# Code Review Report — Credential proxy for integrations, step 1: GitHub (autobyteus-311)

## Review Round Meta

- Review Entry Point: `Implementation Review`
- Requirements Doc Reviewed As Context: `tickets/in-progress/integration-credential-proxy/requirements-doc.md` (approved SR-002; DEC-011 decided by the user at SR-005)
- Investigation Notes Reviewed As Context: `…/investigation-notes.md` (M-1…M-5 and the Read table, through the design)
- Solution Revision Record Reviewed As Context: `…/solution-revision-record.md` (SR-005)
- Design Spec Reviewed As Context: `…/design-spec.md` (SR-005)
- Supplemental Task Artifacts Reviewed As Context: `follow-ups.md` (FU-001…FU-004); `DESIGN.md`
- Relevant Solution Revision IDs: SR-002, SR-005
- Design Review Report Reviewed As Context: `…/design-review-report.md` (ARCH-REV-002 Pass; AR-001…AR-008)
- Architecture Review Revision Record Reviewed As Context: `…/architecture-review-revision-record.md`
- Relevant Architecture Review Revision IDs: ARCH-REV-002
- Implementation Handoff Reviewed As Context: `…/implementation-handoff.md`
- Implementation Revision Record Reviewed As Context: `…/implementation-revision-record.md`
- Relevant Implementation Revision IDs: IR-001
- Code Review Revision Record: `…/code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-001`
- Current Review Round: `1`
- Review Scope: `Full Review`
- Trigger: IR-001 implementation handoff (Large/High)
- Prior Review Round Reviewed: N/A
- Latest Authoritative Round: `1`
- Coverage / execution / API/E2E / delivery records: N/A (implementation review)

Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/integration-credential-proxy`, branch `codex/integration-credential-proxy`. Code `84602c9a38…2529eaaec1`; artifacts `9f0aefd4c5` (head `6e5cb6f22e`). Base `8760c83788`.

## Routing Classification Review

- Task size: `Large`
- Architectural risk: `High`
- Selected route: `Implementation Review`
- Independent source review required by the classification: `Yes`
- Classification evidence or correction required: None. The change adds a new loopback security boundary that adds credentials, a per-run identity across five runtimes, new persisted files and a GraphQL contract.

## Review Scope

- Changed implementation reviewed (`git diff 8760c83788..2529eaaec1`, 79 files):
  - `src/credential-proxy/*` (10 files), read in full;
  - the vault consumer (`secret-id.ts`, catalog);
  - run delivery in five runtimes: native helper and factory; Claude session manager, state input, session, query options and SDK client; Codex bootstrapper, integration thread config and tool-list reopen; AGY factory; ACP factory, launcher and Grok factory;
  - release points: `agent-run-resource-manager.ts`, `agent-run-manager.ts`, `agent-run-activation-operation.ts`;
  - wiring: provider factory builder, supervisor, studio composition, `server-runtime.ts`, application execution scope, standalone host;
  - GraphQL `github-integration.ts`; the web card, store and documents;
  - docs: `credential_proxy.md` contract.
- Tests: case lists for the new unit, integration and e2e files, and the live test's second case in full.
- Checks: none rerun. IMP-01…IMP-14 ran at the commits the handoff names; the only code after `32f14bfd4d` (`2529eaaec1`) is covered by IMP-03, IMP-07, IMP-08 and IMP-11. One read-only count was run: non-empty lines of the largest changed files (see the size audit).
- Explicit exclusions: the rendered probe screenshots (IMP-12) taken as evidence; pre-existing failures FU-002…FU-004 (verified as pre-existing by the engineer on the base).

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: Yes (REQ-001…REQ-012, AC-001…AC-008, DEC-001…DEC-011).
- Design-spec behavior map verified against the implementation: Yes.
- Design review report and round confirmed: ARCH-REV-002 Pass. AR-002 is applied: both release points revoke, and the hook was renamed `releaseLocalSessions`. AR-003 is applied: path refusals, the origin check, `redirect: "manual"`, the same-origin `Location` rewrite and `GIT_TERMINAL_PROMPT=0`. AR-004 is applied: `logger: false` and no access-log policy. AR-006 is applied: 401→403 on the git route only. AR-008 is documented.
- Behavior-basis status: `Confirmed`
- Changed or newly discovered behavior: none.
- Remaining material ambiguity: none.

| Behavior ID | Current Status | Current Implementation Path And Lifecycle Evidence | Notes |
| --- | --- | --- | --- |
| DS-001 / BEH-001 Connect | Confirmed | `GitHubIntegrationResolver` (`TOKEN_REQUIRED` for an empty token) → `IntegrationConnectionService.connect`: `checkToken` (`GET /user`, Bearer, `redirect: "manual"`; 401 → `TOKEN_REJECTED`, nothing stored) → `saveForConsumer({kind:"integration"})` → `store.update` (login, `connectedAt`). `disconnect` keeps ticks; `status` requires both the login and the vault entry | — |
| DS-002 / BEH-002 Run gets its address | Confirmed | `DefaultIntegrationRunAccess.environmentForRun`: none allowed → `{}` and no pass; else `passes.issue` and `definition.shellVariables`. Applied in: native `terminalChildEnvironment`; Claude `extraEnvironment` on the run-session spawn only; Codex `shell_environment_policy.set` (+ `network_access` for `workspace-write`) in `appServerConfig`, used by `thread/start` and `thread/resume` (`codex-thread-manager.ts` L229, L256) and kept on reopen; AGY `env` only with variables; ACP launcher env | — |
| DS-003 / BEH-003, BEH-004 Proxied call and refusals | Confirmed | `credential-proxy-routes.ts`: gate → pass → route → `isAllowed` (read per call) → `buildUpstreamUrl` → `resolveForUse` → forwarder → activity record. Every refusal is before any upstream call and is recorded | — |
| DS-004 Run end | Confirmed | `AgentRunResourceManager.release` → `revokeForRun` (errors joined); `releaseLocalSessions` in `agent-run-manager.ts` for a failed activation | — |
| DS-005 Forward | Confirmed | `parseCallerPath` refuses `\`, `%5c`, `%2f`, `.`/`..` (also encoded), empty segments and bad encoding; origin check; caller `authorization`, `cookie`, `host`, hop-by-hop and `proxy-*` dropped; route auth; identity encoding; buffered API body, streamed git body; manual redirects, same-origin `Location` rewritten, other hosts unchanged; token redacted in headers (including the rewritten `Location`) and API text bodies; git 401 → 403 | — |

## Supported Product Scenario And Reachability Gate (Mandatory)

| Scenario ID | Related Behavior / Contract IDs | Kind | Actor / Initiator | Coherent Goal Or Governing Event | Supported Entry Surface / Event | Scenario Shape | Forward Production Path / Lifecycle | Expected Outcome / Consequence | Independent Evidence | Scenario Validity | Review Use |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | REQ-001, AC-001 | User | User | Connect GitHub | Settings card | Normal | DS-001 | Connected as @login; token never returned | requirements; IMP-07, IMP-08, IMP-12 | Supported Normal Scenario | Use |
| SCN-002 | REQ-002…REQ-003, REQ-007…REQ-009 | System | Allowed agent run | Use the API from a script | Run preparation, then a shell call | Normal | DS-002 → DS-003 → DS-005 | GitHub's answer, redacted, recorded | IMP-03, IMP-04, IMP-08 | Supported Normal Scenario | Use |
| SCN-003 | REQ-004 | System | Allowed agent run | git clone and push | `git` with an unchanged URL | Normal | `insteadOf` → git route → Basic auth | Works with no prompt | IMP-03 (local `git http-backend`), IMP-08 | Supported Normal Scenario | Use |
| SCN-004 | REQ-005, REQ-006, REQ-010 | System | Any shell | A misuse or mistake | Proxy URL | Explicit Edge (security contract) | DS-003 refusals | Refused; nothing sent upstream | IMP-03 | Supported Explicit Edge Scenario | Use |
| CRS-101 | QR-002 | System | — | The API route returns a large or non-text body | — | — | Non-text bodies are streamed; text/JSON is buffered for redaction (design Key Tradeoffs) | — | design | Supported Normal Scenario | Use (no finding) |
| CRS-102 | DS-002 | System | A run of an allowed agent prepared before the proxy listens | — | Startup | — | `server-runtime.ts`: the proxy listens before `app.listen`, and application execution scopes pass `null` | — | `server-runtime.ts` L209-210; kernel builder | Not Reachable | Reject |
| CRS-103 | REQ-007 | System | A token echo inside a non-JSON, non-text API body (e.g. a diff media type) | — | — | — | — | — | No supported GitHub response echoes the token in such a body | Technically Possible but Unsupported/Contrived | Reject |

### Candidate Finding And Mechanism Gate

| Candidate ID | Observation Or Mechanism | Scenario / Contract ID | Independent Trigger | Forward Path / Lifecycle / Consequence | Evidence | Disposition | Scope | Reason / Proportionate Response |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C-01 | Addition: `502 UPSTREAM_UNREACHABLE` and `500 PROXY_FAILED` | SCN-002/004 | GitHub unreachable; unexpected error | The caller gets a coded JSON answer; the 500 path logs only the error name | `credential-proxy-routes.ts` L113-120; docs table | Reject | — | Sound: needed failure handling; no token or URL in logs |
| C-02 | Addition: `buffersRequestBody` per route | REQ-003, QR-002 | API POST | The API body is sent with its length; git bodies stay streamed (`duplex: "half"`) | forwarder L127-130 | Reject | — | Sound and bounded |
| C-03 | Codex tool-list reopen keeps the integration config | DS-002 | Tool-list change mid-run | `{...appServerConfig, ...agent tools}`; `reopenThread` stores it for resume | `codex-agent-run-backend.ts` L286-291; `codex-thread-manager.ts` L90 | Reject | — | A correct fix to a real gap; tested |
| C-04 | `TOKEN_REQUIRED` | SCN-001 | Empty token | Coded GraphQL error | resolver L58-59 | Reject | — | Sound |
| C-05 | `GH_TOKEN=unused` for `gh api` | REQ-012 | `gh api` | Documented; the proxy drops the caller's `Authorization` | docs L145; IMP-08 | Reject | — | Measured and documented |
| C-06 | `2529eaaec1`: redaction of the rewritten `Location` | REQ-007 | Same-origin redirect | The header passes through redaction | forwarder L146-149 | Reject | — | Correct; the test fails without it |
| C-07 | `integrationRunAccess` required disposition (`"in" input` and `undefined` check), explicit `null` on application hosts | Design Interface (Composition) | — | A new composition can't omit it silently | builder L169-174; supervisor L133 | Reject | — | Matches the existing `applicationAgentTools` pattern |
| C-08 | Two `IntegrationConnectionStore` and `IntegrationDefinitions` instances (proxy host vs. the module-level connection service) | Ownership map | — | Both read the same file fresh on every call; only the service writes; definitions are the same frozen defaults | host L26-28; service L156-162 | Reject | — | No divergent state; the writer is single, as the design requires |
| C-09 | The route, not the forwarder, calls `resolveForUse` (design Dependency Rules say "only the forwarder reads the token") | Design DS-003 | — | The design's own spine puts it at step 6 in the route sequence; the token is revealed only in the forwarder | routes L97-102; forwarder L119 | Reject | — | Consistent with the spine; no exposure |
| C-10 | `IntegrationDefinition.description` is read nowhere (the card uses localized text) | Design Ownership map | — | An unread English string | grep | Reject | — | Design-specified for the later Integrations menu; trivial |
| C-11 | `general-process-run-supervisor.ts` is 494→504 non-empty lines; 491 effective lines without comment-only lines (IMP-13) | `>500` rule | — | +10 lines: one required field with a doc comment, one validation, two pass-throughs | count above | Reject | — | Under the effective-line metric the engineer used, and the growth is the required wiring; noted for awareness |
| C-12 | VAULT_LOCKED on a proxied call reads as `INTEGRATION_NOT_CONNECTED` | REQ-010 | — | A slightly imprecise message | routes L98-102 | Reject | — | REQ-010 asks for a clear refusal with nothing sent; met |

## Structural / Design Checks

| Check | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Task design health assessment present and preserved | Pass | Backends only apply variables; policy stays in `IntegrationRunAccess` | — |
| Implementation matches approved behavior-defining artifacts | Pass | REQ/AC/DEC map above; DEC-011 implemented exactly | — |
| Data-flow spine inventory clarity and preservation | Pass | DS-001…DS-005 match the code order | — |
| Ownership boundary preservation and clarity | Pass | Single writer of vault entry and file; backends depend only on `IntegrationRunAccess` | — |
| Off-spine concern clarity | Pass | Activity log, store, definitions each own one concern | — |
| Existing capability reuse | Pass | `AgentToolsMcpLocalAccessGate`, local-server lifecycle pattern, `appendJsonlFile`/`writeJsonFile`, the vault | — |
| Reusable owned structures | Pass | `proxyRouteBase` shared by variables and the `Location` rewrite | — |
| Shared-structure tightness | Pass | `IntegrationRoute` flags are each read once; C-10 noted | — |
| Repeated coordination ownership | Pass | One `environmentForRun` per backend, no repeated policy | — |
| Empty indirection | Pass | `CredentialProxyHost` composes and owns lifecycle | — |
| Separation of concerns and file responsibility | Pass | Native helper in its own module; Codex thread-config part in its own file | — |
| Ownership-driven dependency direction | Pass | `credential-proxy/` does not import `src/integrations/github/` | — |
| Authoritative Boundary Rule | Pass | No backend reaches the registry, store or definitions | — |
| File placement | Pass | — | — |
| Flat-vs-over-split layout | Pass | — | — |
| Interface/API boundary clarity | Pass | GitHub-specific GraphQL by design; coded errors; `environmentForRun(run, baseEnv)` as designed | — |
| Naming quality; one vocabulary | Pass | run pass, route, integration connection, credential proxy as in the glossary; `releaseLocalSessions` names what the hook does | — |
| No unjustified duplication | Pass | — | — |
| Patch-on-patch complexity control | Pass | — | — |
| Dead code removed in touched files and modules | Pass | None found; C-10 is design-specified | — |
| Test scenarios and assertions clear and requirement-aligned | Pass | Refusals, redaction (body, headers, `Location`), real git clone/push with Basic, revoke at both release points, no log line with the pass, token scans | — |
| Test fixtures/helpers reusable, structure coherent | Pass | — | — |
| No stale, duplicated, compatibility-only tests in changed scope | Pass | — | — |
| API/E2E readiness | Pass | See Residual Risks for what remains executable work | — |

## Source File Size And Structure Audit

| Source File | Before (base) | After | `>500` Check | `>220` Delta | SoC / Ownership | Placement | Classification | Required Action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `…/backends/autobyteus/autobyteus-agent-run-backend-factory.ts` | 494 non-empty (492 effective) | 499 (496) | Pass | +5 | Pass (helper moved to its own module) | Pass | Pass | — |
| `…/runtime/general-process-run-supervisor.ts` | 494 (485) | 504 (491) | Pass on effective lines; C-11 | +10 | Pass | Pass | Pass | — |
| `…/claude/session/claude-session.ts` | 490 (469) | 491 (470) | Pass | +1 | Pass | Pass | Pass | — |
| `…/compositions/build-studio-server.ts` | 439 | 453 | Pass | +14 | Pass | Pass | Pass | — |
| `src/credential-proxy/credential-proxy-forwarder.ts` | new | 146 effective | Pass | 178 | Pass | Pass | Pass | — |
| `autobyteus-web/components/settings/GitHubIntegrationCard.vue` | new | 189 effective | Pass | 207 | Pass | Pass | Pass | — |

## Legacy / Backward-Compatibility Verdict

| Check | Result | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms in changed scope | Pass | — |
| No legacy old-behavior retention | Pass | — |
| Dead code removed in touched files and modules | Pass | — |
| Approved persisted-data transition followed | Pass | New files only; a missing or malformed `connections.json` reads as not connected and is not rewritten until a save (rule 7) |
| No version-specific dual reads/writes | Pass | — |
| Transition mechanics match the reviewed design | Pass | N/A (no migration) |

## Dead / Obsolete / Legacy Items Requiring Removal

None.

## Docs-Impact Verdict

- Docs impact: `Yes`, done:
  - `credential_proxy.md` carries the integration-author contract (variables, curl, `gh api` with `GH_TOKEN=unused`, git, errors including 502/500, Not supported including the Codex `read-only` sandbox);
  - `secret_management.md`, `GLOSSARY.md`, `docs/design-cases.md` and `TESTING.md` are updated;
  - the modules README is updated.

## Additional Material Premise Validation

| Premise ID | Current Status | Changed Evidence / Reason |
| --- | --- | --- |
| R-4 (Codex `set` merge) | Confirmed by measurement | IMP-05: thread tables merge with the user's `config.toml` |
| Native `initialCustomData` function reaches the runtime | Confirmed | Handoff premise 1; real core agent test |
| Team member carries its own `agentDefinitionId` | Confirmed | `configured-agent-execution-handle.ts` L435-447 (handoff) |

New premises: CRS-102 (not reachable) and CRS-103 (contrived), both rejected.

## Review Scorecard (Mandatory)

- Overall score: `9.4/10` (simple average; not the decision rule)

| Priority | Category | Score | Why This Score | What Is Weak / Holding It Down | What Should Improve |
| --- | --- | --- | --- | --- | --- |
| `1` | `Data-Flow Spine Inventory and Clarity` | 9.5 | Each spine runs in the designed order with one driver | — | — |
| `2` | `Ownership Clarity and Boundary Encapsulation` | 9.4 | Backends see one interface; single writers | Two store instances over one file (C-08, harmless) | — |
| `3` | `API / Interface / Query / Command Clarity` | 9.4 | Coded refusals and GraphQL errors; documented contract | — | — |
| `4` | `Separation of Concerns and File Placement` | 9.3 | Small owned files; helpers moved out to keep factories under the limit | Supervisor near the limit (C-11) | Keep new wiring out of the supervisor next time |
| `5` | `Shared-Structure / Data-Model Tightness and Reusable Owned Structures` | 9.3 | Tight route type; frozen definitions | Unread `description` (C-10, design-specified) | — |
| `6` | `Naming Quality and Local Readability` | 9.4 | Glossary vocabulary; clear comments | — | — |
| `7` | `API/E2E Readiness` | 9.4 | Real git, real GitHub, real Codex app-server measured | Per-runtime live runs remain | — |
| `8` | `Runtime Correctness And Behavioral Fidelity` | 9.4 | Path, origin, redirect, header and redaction handling correct; revocation at both points | — | — |
| `9` | `No Backward-Compatibility / No Legacy Retention` | 9.6 | New capability, clean | — | — |
| `10` | `Cleanup Completeness` | 9.4 | No dead code left in touched files | — | — |

## Findings

None.

## Follow-ups

- Follow-ups this review added: None. FU-001…FU-004 were already recorded upstream.

## Classification

N/A (Pass).

## Recommended Recipient

- API/E2E Engineer, `/software_engineering_team/api_e2e_engineer`; then an informational notice to the Implementation Engineer.

## Residual Risks

- Executable work left for API/E2E (from the handoff):
  - real agent runs per runtime: at least Codex with auto-execute off (`workspace-write`) and one of Claude or native, curling issue #1 and running `git ls-remote`, then `env`/`ps` with no token (AC-002, AC-007);
  - team-member access;
  - unticking during a run;
  - a stopped run's address refused;
  - QR-001 from a non-loopback interface with remote access on;
  - QR-002 with a multi-MB repository.
- A live push to GitHub is not covered (read-only test token, DEC-009); push is proven against a local `git http-backend` with GitHub's Basic format.
- R-1 (same-user limit), R-3 (unbounded `activity.jsonl`), and the live token's expiry on 2026-11-25.

## Latest Authoritative Result

- Review Decision: `Pass`
- Review Entry Point: `Implementation Review`
- Supported Product Scenario Gate: `Pass`
- Material-Premise Gate: `Pass`
- Score Summary: 9.4 average; every category ≥ 9.3
- Failure Origin: N/A
- Recommended Recipient: API/E2E Engineer
- Notes: the flagged items were reviewed, and each is sound (C-01…C-07): the additions beyond the design, the `Location` redaction fix, and the required `integrationRunAccess` disposition.
