# Code Review Report — runtime-lifecycle-review (Settings → Agent Runtimes)

## Review Round Meta

- Review Entry Point: `Implementation Review`
- Requirements Doc Reviewed As Context: `requirements-doc.md` (Approved, SR-010, incl. "UI note (SR-010)")
- Investigation Notes Reviewed As Context: `investigation-notes.md` (E-R08, E-R21, E-A01…E-A10 read for this review)
- Solution Revision Record Reviewed As Context: `solution-revision-record.md` (via design spec; SR-010, SR-011)
- Design Spec Reviewed As Context: `design-spec.md` (SR-011)
- Supplemental Task Artifacts Reviewed As Context: Product `ui-ux-spec.md` (a74ecd4) at `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/runtime-lifecycle-review/ui-ux-spec.md` (responsive and accessibility sections); `follow-ups.md`; `evidence/IMP-10-rendered-check.md`, `IMP-10a…b` screenshots, `IMP-05-server-architecture.log`
- Relevant Solution Revision IDs: SR-010, SR-011
- Design Review Report Reviewed As Context: `design-review-report.md` (round 3)
- Architecture Review Revision Record Reviewed As Context: `architecture-review-revision-record.md`
- Relevant Architecture Review Revision IDs: ARCH-REV-002, ARCH-REV-003
- Implementation Handoff Reviewed As Context: `implementation-handoff.md` (IR-001)
- Implementation Revision Record Reviewed As Context: `implementation-revision-record.md`
- Relevant Implementation Revision IDs: IR-001
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-001`
- Current Review Round: 1
- Review Scope: `Full Review`
- Review Scope Evidence (round >1): N/A
- Trigger: implementation handoff IR-001 (Large/High)
- Prior Review Round Reviewed: N/A
- Latest Authoritative Round: 1
- Coverage / execution / API/E2E / delivery records: N/A (implementation review)
- Code reviewed: worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-lifecycle-design-review`, branch `codex/runtime-lifecycle-design-review`, `aac5da3112..8a2db203dc` (server `ef5308178d`, web `8a2db203dc`)

## Routing Classification Review

- Task size: `Large`
- Architectural risk: `High`
- Selected route: `Implementation Review`
- Independent source review required by the classification: `Yes`
- Classification evidence or correction required: None. 46 files; new GraphQL contract, server-started vendor processes and fetches, sign-in detection moved for application readiness in both roots, a new application-platform read. Classification confirmed.

## Review Scope

- Changed implementation and behavior reviewed: all source in the diff — `runtime-management/agent-runtimes/` (service, reader, strategy contract, types, runner, version, source fetch, process operation, four strategies, factory); readiness adapter and orchestration wiring; execution scope count, kernel reader, host-management contract and binding; GraphQL type and schema registration; studio composition and close path; web composable, components, presentation helpers, types, documents, catalogs, settings page.
- Tests read proportionately: strategies, status service, process operation, resolver/composition, adapter test changes, web `AgentRuntimesManager.spec.ts` case list.
- Explicit exclusions: no checks re-run (Checks Run IMP-01…IMP-10 are recorded at `8a2db203dc` and the code has not changed since). One read-only vendor probe was run for CR-001 (below).

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: Yes (SR-010; UD-005…UD-008; DEC-001…DEC-008).
- Design-spec behavior map verified against the implementation: Yes, with one contradiction against real vendor behavior (BEH-005, CR-001).
- Design review report and round confirmed: ARCH-REV-003 Pass; AR-008 applied (narrow `activeAgentRuns` reader on the kernel, `Pick<AgentRunManager, "listActiveRuns" | "getActiveRun">`).
- Behavior-basis status: `Confirmed` for the approved behavior; the implementation contradicts it for Claude in BEH-005.
- Changed or newly discovered behavior: None.
- Remaining material ambiguity: the table/stacked switch range (CR-003).

| Behavior ID | Current Status | Current Implementation Path And Lifecycle Evidence | Contradicting Evidence (Only When Applicable) |
| --- | --- | --- | --- |
| BEH-001 | Confirmed | `AgentRuntimesManager` `onMounted → useAgentRuntimes.check()` → `checkAgentRuntimes` → `AgentRuntimeStatusService.checkAll()` → `check(row)`: unchanged resolver + fresh `--version` → `list()` → `agentRuntimes` | — |
| BEH-002 | Confirmed | per-row `readLatestVersion` promise, generation-guarded; failure sets only `checkFailed`, version kept | — |
| BEH-003 | Confirmed | `startUpdate` → agents rule (process + application count) → `RuntimeProcessOperation([exe,"update"])` → fresh version → `succeeded` + re-check keeps it / `failed` with vendor output | — |
| BEH-004 | Confirmed | strategy `installInstructionsUrl` (DEC-004 URLs match); row link + restart hint | — |
| BEH-005 | **Contradicted (Claude)** | Codex/Grok/Antigravity paths match DEC-005; Claude `readSignIn` maps any non-zero exit to `unknown` | Claude 2.1.302 `auth status --json` exits **1** when signed out (CR-001) |
| BEH-006 | Confirmed | `isOwnNode = isEmbeddedWindow`; no actions, hint or blocked line on remote; remote note | — |

## Supported Product Scenario And Reachability Gate (Mandatory)

| Scenario ID | Related Behavior | Kind | Actor | Goal | Entry Surface | Shape | Forward Path | Outcome | Independent Evidence | Validity | Use |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | BEH-001/002/004/005 | User | Desktop user | See versions, updates, sign-in | Settings → Agent Runtimes | Normal | page → check → service → strategies/reader → poll → row | Rows show state | requirements SCN-001, AC-001/002/006/009 | Supported Normal | Use |
| SCN-001a | BEH-005, AC-009 | User | Desktop user with Claude installed but signed out | See "Not signed in" + "Sign in from its command line." | same | Normal | same; Claude `auth status --json` | Claude row Not signed in + hint | AC-009 names Claude explicitly; E-R21 records the signed-out JSON | Supported Normal | Use |
| SCN-002 | BEH-003 | User | Desktop user | Update one runtime | Update button | Normal | DS-002 | Updated / failed | AC-003/004 | Supported Normal | Use |
| SCN-003 | BEH-005 | User | Desktop user | Sign in to Codex/Grok | Sign in button | Normal | DS-003 | Signed in / didn't finish / cancel | AC-007 | Supported Normal | Use |
| SCN-005 | BEH-006 | User | Remote node window | Status only | same page | Normal | UI gate | No actions | AC-010 | Supported Normal | Use |
| UI-W | REQ-001, UI spec responsive rules | User | Desktop user | Read the table in a mid-size window | same page, window 640–~1100 px | Normal | Settings layout → list width < 46 rem | Columns overlap under the spec's literal 640 px rule | IMP-10a screenshot at 739 px | Supported Normal | Use (CR-003) |

### Candidate Finding And Mechanism Gate

| Candidate ID | Observation Or Mechanism | Scenario / Contract | Independent Trigger | Forward Path / Consequence | Evidence | Disposition | Scope | Reason / Proportionate Response |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C-1 | Claude `readSignIn` returns `unknown` for any non-zero exit; real `claude auth status --json` exits 1 when signed out | SCN-001a, AC-006/AC-009 | User opens the page with Claude signed out | strategy → `unknown` → `UNKNOWN` → "Sign-in unknown", no "Sign in from its command line." | Probe below; strategies test fake models signed-out as exit 0 (`agent-runtime-strategies.test.ts` 30–35); `/tmp/rlr-fakes/fake-runtime.js` 40 same | Promote | This ticket | CR-001 |
| C-2 | `runningAgents()` swallows any count error and returns 0, so Update would be allowed | DESIGN.md rule 7 ("not permission to swallow errors inside normal work"); Principle 7 | None found: `AgentRunManager.getInstance()` is initialized before the composition; `listActiveRuns`/`getActiveRun` and the scope count only read registries | Unreachable branch that would fail open on the DEC-003 guard | `agent-runtime-status-service.ts` 260–266; `agent-run-manager.ts` 80–85, 185–191; no test exercises the catch | Promote (Low) | This ticket | CR-002: remove the catch |
| C-3 | Table/stacked switch at list width 58 rem (container query) instead of the spec's ≥ 640 px viewport | UI spec "Responsive And Platform Behavior"; "Permitted responsive variation: none beyond the 640 px stacking"; also "no horizontal overflow" | User opens the page in a 640–~1100 px window | Under the literal rule the fixed 46 rem grid overlaps beside the Settings menu | IMP-10a (739 px, overlapped), IMP-10b (stacked after change); grid `8+9+15+8 rem + 4×1.5 rem` = 46 rem | Promote | Requirement Gap (confirmation) | CR-003: the spec's two rules conflict in that range; the code's resolution is technically sound, but a visible deviation from the user-approved spec needs the requirements owner's record |
| C-4 | After `close()`, a finished update's handler still runs one `--version` before checking `closed` | QR-003 | Server close during an update | One short command, self-limited to 10 s | `agent-runtime-status-service.ts` 143–147 | Reject | — | Bounded and ends on its own; no user consequence |
| C-5 | Claude readiness time-out reason text/time changes (5 s → 10 s) | Design: shared runner replaces the adapter copy | `claude auth status` hangs | Failure-only reason text differs | Handoff Known Risks | Reject | — | Design-sanctioned consequence of one runner; no AC on that text |
| C-6 | Sign-in "Try again" uses the `settings.agentRuntimes.update.retry` key | Naming | — | Same copy today | `AgentRuntimeRow.vue` 158 | Reject | — | Not material; optional tidy-up |
| C-7 | Placement differences: separate copy catalog, `agent-runtime-status-composition.ts`, `runtime-source-fetch.ts`, `create-agent-runtime-strategies.ts` | Design file map, Principle 12 | — | — | Matches `embeddingSettings.ts` and existing `*-composition.ts` pattern; each file has one concern | Reject (accepted) | — | No new owner; keeps `build-studio-server.ts` and `settings.ts` small |

CR-001 probe (read-only, isolated empty home, no account):

```
$ HOME=$T CLAUDE_CONFIG_DIR=$T/.claude claude auth status --json </dev/null; echo EXIT=$?
{ "loggedIn": false, "authMethod": "none", "apiProvider": "firstParty", ... }
EXIT=1
$ claude --version
2.1.302 (Claude Code)
```

## Structural / Design Checks

| Check | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Task design health assessment present and preserved | Pass | Detection moved to `AgentRuntimeSignInReader`; adapter keeps only mapping and texts | — |
| Implementation matches approved behavior-defining supplemental artifacts | Fail | Claude signed-out state (CR-001); responsive rule deviation pending confirmation (CR-003) | CR-001, CR-003 |
| Data-flow spine inventory clarity and preservation | Pass | DS-001…003, DS-005, DS-006 map 1:1 to code | — |
| Ownership boundary preservation and clarity | Pass | Service owns rows/operations; reader owns sign-in; strategies stateless; process operation owns one child | — |
| Off-spine concern clarity | Pass | runner, version, source fetch serve strategies/service | — |
| Existing capability reuse | Pass | resolvers unchanged; `listAntigravityModels`; Codex client manager; Embedding poll pattern; Fastify close path | — |
| Reusable owned structures | Pass | one runner, one version helper, one types file | — |
| Shared-structure tightness | Pass | `AgentRuntimeOperation` discriminated union; `SignInReading.detail` server-only; GraphQL flat by design | — |
| Repeated coordination ownership | Pass | Codex/Claude detection now has one owner | — |
| Empty indirection | Pass | reader adds strategy selection + resolver call; resolver translates and maps errors | — |
| Separation of concerns / file responsibility | Pass | largest new file 286 lines, one concern | — |
| Ownership-driven dependency | Pass | `agent-runtimes/` imports neither run manager; port supplied by composition; studio reads Application agents only via `hostManagement` | — |
| Authoritative Boundary Rule | Pass | resolver → service only; adapter → reader only; composition → `hostManagement.activeAgentRuns`, never the kernel | — |
| File placement | Pass | see C-7 | — |
| Flat-vs-over-split layout | Pass | flat folder + `strategies/` | — |
| Interface boundary clarity | Pass | explicit `runtimeKind`, validated with `runtimeKindFromString` + external-kind check | — |
| Naming quality | Pass | C-6 only, not material | — |
| No unjustified duplication | Pass | adapter copy removed | — |
| Patch-on-patch complexity | Pass | — | — |
| Dead code removed in touched files | Fail (Low) | `runningAgents` catch is unreachable (CR-002) | Remove |
| Test scenarios and assertions requirement-aligned | Fail | Claude signed-out fake uses exit 0, not the vendor's exit 1, so the test proves a shape the vendor does not produce (CR-001) | Align fake with the real vendor answer |
| Test fixtures/helpers reusable and coherent | Pass | one scripted fake CLI per test file | — |
| No stale/duplicate/compat-only tests | Pass | adapter `commandRunner` test usage removed | — |
| API/E2E readiness | Fail until CR-001 | AC-006/AC-009 for Claude would fail on a real install | CR-001 |

## Source File Size And Structure Audit

All changed source files are below 500 effective lines; no delta exceeds 220.

| Source File | Before | After | `>500` | `>220` Delta | SoC / Placement | Classification |
| --- | --- | --- | --- | --- | --- | --- |
| `autobyteus-web/pages/settings.vue` | 416 | 433 | Pass | Pass (+17) | Pass | — |
| `autobyteus-web/localization/messages/{en,zh-CN}/settings.ts` | 428 | 429 | Pass | Pass | Pass | — |
| `compositions/build-studio-server.ts` | 371 | 385 | Pass | Pass | Pass | — |
| `application-execution-scope-kernel-builder.ts` | 326 | 329 | Pass | Pass | Pass | — |
| `build-application-platform-runtime.ts` | 302 | 306 | Pass | Pass | Pass | — |
| `agent-runtime-status-service.ts` | new | 286 | Pass | Pass (new, one concern) | Pass | — |
| `create-application-orchestration-services.ts` | 261 | 265 | Pass | Pass | Pass | — |
| `application-execution-scope.ts` | 184 | 193 | Pass | Pass | Pass | — |
| `AgentRuntimeRow.vue` | new | 187 | Pass | Pass | Pass | — |
| `application-provider-credential-readiness-adapter.ts` | 240 | 155 | Pass | Pass | Pass | — |
| Other new files (resolver 145, composable 142, manager 127, operation 79, strategies 38–58, rest ≤ 52) | new | ≤ 145 | Pass | Pass | Pass | — |

## Legacy / Backward-Compatibility Verdict

| Check | Result | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms in changed scope | Pass | — |
| No legacy old-behavior retention | Pass | adapter `runCommand`, `describeFailure`, `commandRunner`, `codexClientManager` dependency removed |
| Dead code removed in touched files | Fail (Low) | CR-002 |
| Approved persisted-data decision followed | Pass | Not Affected; in-memory only |
| No version-specific dual reads/writes | Pass | — |
| Transition mechanics | Pass | N/A |

## Dead / Obsolete / Legacy Items Requiring Removal

| Item / Path | Type | Evidence | Why | Required Action |
| --- | --- | --- | --- | --- |
| `AgentRuntimeStatusService.runningAgents` try/catch (`agent-runtime-status-service.ts` 260–266) | DeadCode / LegacyBranch-like defensive fallback | No reachable throw (C-2) | Unreachable, and it would silently fail open on the DEC-003 guard | Call the port directly |

## Docs-Impact Verdict

- Docs impact: `Yes`
- Why: new Settings section and server capability.
- Files likely affected: `autobyteus-web/docs/settings.md`; possibly a short server module note. Owned by delivery's docs sync.

## Additional Material Premise Validation

| Premise ID | Current Status | Changed Evidence / Reason |
| --- | --- | --- |
| MP-001 | Confirmed | Antigravity strategy reads `--version` fresh |
| MP-002 | No Longer Relevant | Antigravity terminal sign-in removed (UD-008) |

New premise:

### CR-P1 — Claude's signed-out `auth status --json` exits non-zero

- Origin: `New`
- Related approved requirement: REQ-005, AC-006, AC-009; DEC-005
- Relevant behavior: BEH-005
- Coherent goal: user sees Claude "Not signed in" with the command-line hint
- Scenario validity: `Supported Normal Scenario`
- Initiating basis kind: `User`
- Trigger: user opens Settings → Agent Runtimes with Claude installed and not signed in
- Support evidence: AC-009 names Claude; probe above (Claude 2.1.302, exit 1, `loggedIn:false`)
- Forward path: `checkAll` → `check(row)` → `signInReader.read(CLAUDE)` → `claude auth status --json` → exit 1 → `unknown` → GraphQL `UNKNOWN` → row "Sign-in unknown"
- Consequence: wrong account state and missing hint on every signed-out Claude install
- Reachability: `Reachable`
- Review consequence: CR-001 (Local Fix)

## Review Scorecard (Mandatory)

- Overall score (`/10`): 9.0
- Overall score (`/100`): 90
- Score calculation note: simple average; the decision follows the findings.

| Priority | Category | Score | Why This Score | What Is Weak | What Should Improve |
| --- | --- | --- | --- | --- | --- |
| 1 | Data-Flow Spine Inventory and Clarity | 9.5 | DS-001…006 readable in code; checks settle on installed versions, rest per row | — | — |
| 2 | Ownership Clarity and Boundary Encapsulation | 9.5 | One owner each; AR-008 narrow reader; no bypass | — | — |
| 3 | API / Interface / Query / Command Clarity | 9.3 | Explicit kinds, coded refusals, no `detail` on the wire | `runtimeKind` is a free `String` arg, validated server-side (as designed) | — |
| 4 | Separation of Concerns and File Placement | 9.3 | Placement differences justified (C-7) | — | — |
| 5 | Shared-Structure / Data-Model Tightness | 9.2 | Discriminated unions; one meaning per field | GraphQL operation flat with nullables (designed) | — |
| 6 | Naming Quality and Local Readability | 9.0 | Clear names and comments | sign-in reuses `update.retry` key (C-6, not material) | optional |
| 7 | API/E2E Readiness | 8.5 | Good fakes, overrides and evidence | Claude signed-out case would fail AC-006/009 on a real install | CR-001 |
| 8 | Runtime Correctness And Behavioral Fidelity | 8.0 | Update, sign-in, cancel, time-out, independence and secrecy rules correct | Claude signed out shows "Sign-in unknown" (CR-001) | Parse the JSON on non-zero exit |
| 9 | No Backward-Compatibility / No Legacy Retention | 9.5 | Adapter copy removed cleanly | — | — |
| 10 | Cleanup Completeness | 8.8 | Removals done | unreachable fail-open catch (CR-002) | Remove |

## Findings

### CR-001 — Claude signed out shows "Sign-in unknown" (Medium, Local Fix, implementation)

- Where: `autobyteus-server-ts/src/runtime-management/agent-runtimes/strategies/claude-agent-runtime-strategy.ts` 47–60; test `tests/unit/runtime-management/agent-runtimes/agent-runtime-strategies.test.ts` fake lines 30–35 and cases 146–159.
- Evidence: Claude 2.1.302 `auth status --json` prints `{"loggedIn": false, ...}` and exits **1** when signed out (probe above). The strategy returns `unknown` for every non-zero exit, so the row shows "Sign-in unknown" with no "Sign in from its command line." The unit fake and the IMP-10 fake both model signed-out as exit 0, so no check could catch it. The design's rule ("exit 0, `loggedIn` false → signedOut") carried the same premise; E-R21 recorded the output but not the exit code.
- Contract: REQ-005 ("from the runtime's own report"), AC-006, AC-009 (Claude explicitly).
- Required action: read the JSON whatever the exit code. Parsed `loggedIn === true` → signedIn; parsed `loggedIn === false` → signedOut (detail `describeFailure(result)`, so application readiness keeps today's text); no parseable JSON → keep today's exit-0 "logged in" text fallback, otherwise unknown. Update the fake to the vendor's real shape (signed out = JSON + exit 1) and keep an exit-0 case only if a real version produces it. Application readiness outcome is unchanged (not configured either way).
- Design note: the design-spec's Claude rule line should say the same; the Solution Designer can correct it when the spec is next touched. No structural change.

### CR-002 — Unreachable fail-open catch around the running-agent count (Low, Local Fix, implementation)

- Where: `agent-runtime-status-service.ts` 260–266.
- Evidence: C-2. Nothing in the composed port throws in production; if it did, Update would be allowed while agents run.
- Required action: call `countRunningAgents` directly (Principle 7; DESIGN.md rule 7).

### CR-003 — Table/stacked switch differs from the approved spec's 640 px rule (Requirement Gap, confirmation only)

- Where: `AgentRuntimesManager.vue` 129–140, `AgentRuntimeRow.vue` 171–199.
- Evidence: the spec says ≥ 640 px viewport → table and "Permitted responsive variation: none beyond the 640 px stacking", and also "no horizontal overflow". The fixed grid needs 46 rem of list width, which the list does not have beside the Settings menu until roughly 1100 px windows; at 739 px the cells overlapped (IMP-10a). The code switches on the list's own width (58 rem). The spec's references hold: table at 1440/1280, stacked at 390 (IMP-10b…d).
- Reviewer view: technically sound and closer to the spec's intent; it uses the repo's existing container-query pattern. But it changes user-approved visible behavior in the 640–~1100 px range, so the Solution Designer (requirements owner, Product coordination) needs to record it, as with the SR-010 UI note, or decide otherwise. No code change is expected if accepted.

The other UI interpretations in the handoff (screen-reader-only labels on the table, no hint on remote, "Checking…" for a first sign-in read, vendor's latest line as the step, Sign in disabled during an update, "–" for DEC-008) follow the spec text or fill gaps it leaves silent; no finding.

## Follow-ups

- Follow-ups this review added: None. FU-005 (baseline architecture guard) confirmed as not caused by this change: the failing list names `agent-memory/services/agent-memory-explorer-service.ts`, which the diff does not touch.

## Classification

- CR-001, CR-002: `Local Fix` (implementation).
- CR-003: `Requirement Gap` (Solution Designer; confirmation of a visible deviation, no code change expected).

## Recommended Recipient

- `/software_engineering_team/implementation_engineer` for CR-001 and CR-002 (rule: implementation-owned Local Fix before executable coverage).
- `/software_engineering_team/solution_designer` for CR-003 (rule: Requirement Gap), in parallel; it does not block the implementation fix. If the designer keeps the literal 640 px rule, the implementation engineer gets that decision before the next review.

Routing note: after the fix, source review (targeted delta) and API/E2E again.

## Residual Risks

- `codex login` opening the browser from a piped process and Grok's signed-in `grok models` output remain unverified until delivery with the user's consent (design escalation trigger / known risk).
- AR-008 count is proven by wiring tests, not a live Application team; left to API/E2E as the handoff says.
- Own-node gating is UI-only (accepted, E-R10).
- Each page open makes one unauthenticated GitHub request (60/h limit) → Codex "Check failed" only under heavy reopening (accepted R-02).
- Web package has no type check (existing).

## Latest Authoritative Result

- Review Decision: **Fail**
- Review Entry Point: `Implementation Review`
- Supported Product Scenario Gate: `Pass`
- Material-Premise Gate: `Pass` (CR-P1 reachable and supported)
- Score Summary: 9.0/10; Runtime Correctness 8.0, API/E2E Readiness 8.5, Cleanup 8.8 below the 9.0 bar
- Failure Origin: implementation (CR-001 rooted in an unrecorded vendor exit code in the design premise; fix is local)
- Recommended Recipient: implementation engineer (CR-001, CR-002); Solution Designer (CR-003)
- Notes: CRR-001; task_size Large, architectural_risk High (confirmed). Next round: targeted delta review of the Claude strategy, its tests, the service catch, and the CR-003 decision.
