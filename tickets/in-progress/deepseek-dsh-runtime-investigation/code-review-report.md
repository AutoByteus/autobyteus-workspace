# Code Review Report

## Review Round Meta

- Review Entry Point: `Implementation Review`
- Requirements Doc Reviewed As Context: `requirements-doc.md` (approved at SR-001; SR-003 adds DEC-019/DEC-020)
- Investigation Notes Reviewed As Context: `investigation-notes.md` (referenced for RT-*; not re-audited)
- Solution Revision Record Reviewed As Context: `solution-revision-record.md` (SR-004)
- Design Spec Reviewed As Context: `design-spec.md` (SR-004, `Ready`)
- Supplemental Task Artifacts Reviewed As Context: `probes/` (as cited by the design), `follow-ups.md` (FU-001)
- Relevant Solution Revision IDs: SR-004
- Design Review Report Reviewed As Context: `design-review-report.md` (ARCH-REV-003, Pass)
- Architecture Review Revision Record Reviewed As Context: `architecture-review-revision-record.md`
- Relevant Architecture Review Revision IDs: ARCH-REV-003
- Implementation Handoff Reviewed As Context: `implementation-handoff.md`
- Implementation Revision Record Reviewed As Context: `implementation-revision-record.md`
- Relevant Implementation Revision IDs: IR-001, IR-002
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-002`
- Current Review Round: 2
- Review Scope: `Targeted Delta Review` (round 1 was a `Full Review`)
- Review Scope Evidence (round >1): delta `9344f4b9b5..fddcff0f13` touches only CR-001's file and one new file holding the code moved out of it (`general-process-run-supervisor-input.ts`), plus ticket documents; no data-flow spine, shared interface or data shape changed; no fix layered on an earlier fix
- Trigger: IR-002, the Local Fix for CR-001
- Prior Review Round Reviewed: 1 (CRR-001, Fail, CR-001)
- Latest Authoritative Round: 2
- Coverage Investigation / Execution Coverage Report / API/E2E Revision Record: N/A (implementation review)
- Delivery Revision Record: N/A
- Failing Scenario IDs / Commands / Evidence: N/A

Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/deepseek-dsh-runtime-investigation`, branch
`codex/deepseek-dsh-runtime-investigation`, reviewed range `6c755b2826..9344f4b9b5` (`d5566977b4`, `3514947952`,
`9dd599dfe3`, `9344f4b9b5`); round 2 delta `9344f4b9b5..fddcff0f13` (`cb132711f6` refactor, `fddcff0f13` docs).

## Routing Classification Review

- Task size: `Large`
- Architectural risk: `High`
- Selected route: `Implementation Review`
- Independent source review required by the classification: `Yes`
- Classification evidence or correction required: None. The delivered change matches the design's rationale (new runtime owner, shared ACP contract changes, new key-forwarding proxy route family, three compositions).

## Review Scope

- Changed implementation and behavior reviewed: shared ACP layer (launch contract, capabilities, connection, discovery, session, launcher incl. `end`, factory, backend reopen); credential proxy (provider relays, route, stream reader, observers, `ProviderRelayAccess`, process slot, `RunPassRegistry`, `RunPassRevocation`, forwarder, host, local server); dsh runtime (identity, home, home files, launch profile, capability/discovery, catalog, availability, strategy, session profile, projection, provider calls, payloads, factory binding); compositions (provider factory builder, supervisor, run managers, application platform runtime/scope, studio, standalone host); registration points; Work Journal translation; web row and maps; new and migrated tests.
- Files / areas reviewed: the 145 non-generated, non-`dist` files in the range; generated `dist/` and `generated/graphql.ts` checked only by the recorded typecheck/architecture tests (IMP-01/02/07).
- Explicit exclusions: documentation prose beyond the docs-impact check; contract `dist/` contents.
- Round 2: the moved block (`GeneralProcessRunSupervisorInput`, `requireGeneralProcessRunSupervisorInput`) was diffed against its IR-001 text: identical apart from two added doc comments and `export` on the validator. No other file imports the type. IMP-09 (supervisor ownership, standalone host lifecycle, tracked imports and run manager integration tests: 39 passed; typecheck PASS; scripted studio E2Es: 15 passed) read, not rerun. All other round-1 evidence is carried forward unchanged: the delta touches no other source file.
- Checks: the handoff's recorded checks (IMP-01…IMP-08) were not rerun; no reviewed code changed after them. Evidence logs spot-checked (`IMP-02`: 930 files passed; `IMP-08`: 5 passed, `KEY_SCAN` line present).

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: Yes (REQ-001…REQ-015, AC-001…AC-017, DEC-001…DEC-020).
- Design-spec behavior map verified against the implementation: Yes, by tracing DS-001…DS-008 in code.
- Design review report and round confirmed: ARCH-REV-003 Pass.
- Behavior-basis status: `Confirmed`
- Changed or newly discovered behavior: None.
- Remaining material ambiguity: AC-006's precondition (`{{name}}` in instructions) cannot be produced through the product: the pre-existing shared composer refuses any `{{…}}` for every runtime (`agent-execution/prompt/carpenter-prompt-composer.ts:26-30`, unchanged since base). REQ-006/BEH-006 (literal instructions on every launch) are implemented and verified for every producible instruction; the AC wording is the Solution Designer's to settle. Non-blocking for source review (see Residual Risks).

| Behavior ID | Current Status | Current Implementation Path And Lifecycle Evidence | Contradicting / New Evidence |
| --- | --- | --- | --- |
| BEH-001 | Confirmed | `AgentRunManager.resolveBackendFactory` (`agent-run-manager.ts:409`) → dsh factory → `AcpSessionLauncher.open` refusal before `runLaunch`/spawn when the profile names a relay and access is `null` (`acp-session-launcher.ts:107-111`) | — |
| BEH-002/008 | Confirmed | `deepseek-harness-tool-projection.ts` (`bash`→`run_bash` with exit marker, `write`/`edit`/`apply_patch`, Agent Tools canonical names); approvals unchanged in the session | — |
| BEH-003 | Confirmed | `AcpAgentSession.cancel` unchanged | — |
| BEH-004 | Confirmed | `restoreMethod()` (`acp-agent-capabilities.ts:53-56`), `openResume`, factory restore and backend reopen with `mode: "restore"` | — |
| BEH-005 | Confirmed | `runAcpSessionOptionsDiscovery` → `normalizeDeepSeekHarnessModels`; `deepSeekHarnessConfigSelection` → `applyConfigSelection` (model, then effort) | — |
| BEH-006 | Confirmed (AC-006 wording note above) | Factory composes for create and restore; backend holds `instructions` for reopen; `prepareRun` writes `runs/<runId>/instructions.md`; plugin `interpolate: false` | — |
| BEH-007 | Confirmed | `.dsh/skills` materializer; patch `includeDefaultRoots: false`, guarded `customSkillDirs` | — |
| BEH-009 | Confirmed | `/relay/<relayId>/…` route: loopback, pass lookup, relay grant, path, key resolved per call, forward with `x-api-key`, caller `x-api-key` dropped; `dshEnvironment` strips inherited `DEEPSEEK_API_KEY`/`DEEPSEEK_BASE_URL`; pass ends through `RunPassRevocation` only | — |
| BEH-010/011/012 | Confirmed | Tap → observers (`finished` synchronously in `flush`) → launcher-bound listener → `onProviderCall` → `interpretDeepSeekHarnessProviderCall` → `applyEffects` (in-turn only) | — |
| BEH-013 | Confirmed | Strategy (`apiKeySetting`, vault status), availability provider (process slot), web row | — |
| BEH-014 | Confirmed | `deepseek-harness-translation.ts` registered | — |
| BEH-015 | Confirmed | Home patch rows; owned `DSH_HOME`; user `~/.dsh` untouched (IMP-08) | — |
| DS-008 | Confirmed | `AcpSessionLauncher.end`: unsubscribe → session close → connection close / process stop → `launch.release()`; factory release calls it, then skill cleanup | — |
| AC-016/017 | Confirmed | Grok migrated with identical args/env and `_meta` at `session/new` only; integration route untouched (IMP-02/03/04) | — |

## Supported Product Scenario And Reachability Gate (Mandatory)

| Scenario ID | Related IDs | Kind | Actor / Initiator | Goal / Event | Entry Surface | Shape | Forward Path / Lifecycle | Expected Outcome | Independent Evidence | Validity | Use |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001…SCN-010 | REQ-001…REQ-015 | as in requirements | as in requirements | as in requirements | as in requirements | Normal | DS-001…DS-008 as confirmed above | as in requirements | requirements doc, design spec, ARCH-REV-003 | Supported Normal Scenario | Use |
| ENG-001 | Design "Change Scope", team size rule | Contract | Team engineering contract | A changed source file stays within the 500-line limit | Code review | Normal | — | File within limit or new code in an owned file | `design-principles` (Implementation Review Rules), `ticket-scope.md` common situations | Supported (contract) | Use |

### Candidate Finding And Mechanism Gate

| Candidate ID | Observation Or Mechanism | Scenario / Contract ID | Independent Trigger | Forward Path / Lifecycle / Consequence | Evidence | Disposition | Scope | Reason / Proportionate Response |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C-01 | `general-process-run-supervisor.ts` grows from 511 to 522 non-empty lines (494 → 503 excluding comment lines); already over 500 on the base | ENG-001 | This change's added imports, input fields, disposition validation and wiring | Maintainability of an already-oversized composition file worsened | `git show 6c755b2826:<file>` vs `9344f4b9b5`; the handoff's size note names `build-studio-server.ts` (493) as the largest and misses this file | Promote | This ticket | CR-001: move the added code into an owned file (Local Fix) |
| C-02 | Discovery launch sets `DEEPSEEK_API_KEY=autobyteus-model-discovery` (not in the design's discovery example) | SCN-005, REQ-009 | Model list request | dsh lists models only with a key configured; the placeholder is neither key nor pass; any call with it reaches only the relay and is refused `RUN_PASS_INVALID` | `deepseek-harness-launch-profile.ts:22-27,67-76`; unit test `deepseek-harness-runtime.test.ts:111`; IMP-08 `MODELS` line; documented in `deepseek_harness_runtime.md` | Reject | — | Contract `discoveryLaunch({relayBaseUrl})` unchanged; no key or pass; external-program fact; REQ-009 holds |
| C-03 | Relay reports `finished` with status 200 when the caller stops reading mid-stream (`tap.once("close", finish)`) | SCN-003 + SCN-007 | Stop during a compaction call | A compaction is `completed` only with a stop reason (`deepseek-harness-provider-calls.ts:26`); an aborted stream has none → `failed`, no rotation | code read | Reject | — | Mechanism already correct |
| C-04 | Grok factory restore now composes instructions (previously not), so a composer error could fail a Grok restore | AC-016 | Restore of a Grok run whose definition was edited to contain `{{…}}` | Same guard refuses every new run of that definition; restore already loads the definition | `acp-agent-run-backend-factory.ts:126`; design DS-004 "as at creation" | Reject | — | Technically possible but contrived; designed behavior |
| C-05 | Relay grant stays on the pass between reopen generations; observers per generation | SCN-004 (reopen) | Agent Tools change → reopen | `end` unsubscribes gen 1 first; `open` regrants (same pass) and subscribes gen 2; identity-scoped unsubscribe | `acp-session-launcher.ts:183-199`; `provider-relays.test.ts:44` | Reject | — | Matches DS-008 / `observe` contract |
| C-06 | `dshEnvironment` comment "a discovery launch has none" beside the placeholder | — | — | Reads as "no pass", consistent with the placeholder note at `:22-27` | code read | Reject | — | Not misleading enough to be a finding |

## Structural / Design Checks

| Check | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Task design health assessment is present, evidence-backed, and preserved | Pass | End-copy duplicate removed: factory `releaseResources` calls `AcpSessionLauncher.end` (`acp-agent-run-backend-factory.ts:91`) | — |
| Implementation matches approved behavior-defining supplemental artifacts | Pass | Home patch and plugin match `probes/` (plus `customSkillDirs` guard); relay never alters bodies (DEC-019) | — |
| Data-flow spine inventory clarity and preservation | Pass | DS-001…DS-008 traceable one-to-one in code; DS-003 return spine relay → observers → listener → session → profile → `applyEffects` | — |
| Ownership boundary preservation and clarity | Pass | Launcher owns launch and end; session applies effects; proxy only reports; dsh specifics only in dsh folders | — |
| Off-spine concern clarity | Pass | Stream reader, observers, home files, projection, payload builders each serve one owner | — |
| Existing capability/subsystem reuse | Pass | Forwarder extended (`x-api-key` auth), pass registry extended, skill materializer, compaction recorder and usage events reused | — |
| Reusable owned structures | Pass | `provider-call-observation.ts`, `deepseek-harness-identity.ts`, `providerRelayKeyMissingText` one source for three users | — |
| Shared-structure / data-model tightness | Pass | `RunPassHolder.providerRelayId`, `AcpLaunch`, `AcpRunLaunchRequest`, `AcpSessionEffect` + `activity` are tight; `update()` keeps relay grant across `issue`/`clearGrants` | — |
| Repeated coordination ownership | Pass | One end owner; one revocation owner (`RunPassRevocation`) at both callers | — |
| Empty indirection | Pass | `DeepSeekHarnessModelCatalog` is a thin catalog entry like Grok's (binds deadline to discovery); `RegistryRunPassRevocation` is the designed boundary | — |
| Scope-appropriate SoC and file responsibility | Pass | CR-001 resolved: the supervisor's input contract and its validation live in `general-process-run-supervisor-input.ts` (83 lines); supervisor 446 lines | — |
| Ownership-driven dependency check | Pass | `credential-proxy` imports nothing from `agent-execution`; shared ACP files import no runtime folder; run managers depend on `RunPassRevocation` only | — |
| Authoritative Boundary Rule | Pass | Launcher and catalog use `ProviderRelayAccess` only (never the registry or observers); backends never close owner handles directly | — |
| File placement | Pass | `credential-proxy/provider-relays/`, `runtime-management/deepseek-harness/`, `agent-execution/backends/deepseek-harness/` as designed | — |
| Flat-vs-over-split layout | Pass | Mirrors Grok folders | — |
| Interface/API boundary clarity | Pass | `prepareForRun`/`relayBaseUrl`/`observe`; `runLaunch`/`discoveryLaunch`; `/relay/<relayId>` vs `/r/<pass>/<integrationId>` | — |
| Naming quality / one vocabulary | Pass | "provider relay", "run pass", `AcpSessionEffect`, `DSH_PROVIDER_ROUTE`; glossary updated | — |
| No unjustified duplication | Pass | — | — |
| Patch-on-patch complexity control | Pass | `9dd599dfe3` fix is local to the launch profile and the live suite | — |
| Dead code removed in touched files | Pass | `args`/`env`/`normalizeModels`, `AcpLaunchSelection`, `AcpExt*` names, mode `"load"`, factory end copy, `IntegrationRunAccess.revokeForRun`, stale factory comment all gone (grep: no remaining references) | — |
| Relevant test scenarios and assertions are clear and requirement-aligned | Pass | Test names cite AC/DEC IDs; refusal-before-spawn, end order, resume-not-load, identity-scoped unsubscribe, idle failure after stream stops | — |
| Test fixtures/helpers reusable and coherent | Pass | `fakeAcpLaunchProfile` in the ACP fake harness; `dsh-fake-fixtures.ts` | — |
| No stale, duplicated, or compatibility-only tests | Pass | Raw-trace migration test now pins its frozen table to its five kinds and checks they are still current (DESIGN.md rule 11) | — |
| API/E2E readiness | Pass | Live suite and hints in the handoff; CR-001 does not change behavior | — |

## Source File Size And Structure Audit

| Source File | Before (base) | After | `>500` Hard-Limit Check | `>220` Delta | SoC / Ownership | Placement | Preliminary Classification | Required Action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `agent-execution/runtime/general-process-run-supervisor.ts` | 511 | 446 (522 at IR-001) | Pass | Pass | Pass: composition only | Pass | CR-001 resolved | — |
| `agent-execution/runtime/general-process-run-supervisor-input.ts` | new | 83 | Pass | Pass | Pass: the supervisor's input contract and its validation | Pass | — | — |
| `compositions/build-studio-server.ts` | 478 | 493 | Pass | Pass | Pass | Pass | — | — |
| `agent-execution/backends/acp/session/acp-agent-session.ts` | 301 | 350 | Pass | Pass | Pass (`applyEffects` extracted) | Pass | — | — |
| `agent-execution/backends/acp/session/acp-session-launcher.ts` | — | 196 | Pass | Pass | Pass | Pass | — | — |
| `credential-proxy/provider-relays/provider-relay-proxy-routes.ts` | new | 188 | Pass | Pass | Pass (one route family + its tap) | Pass | — | — |
| `runtime-management/deepseek-harness/deepseek-harness-capability.ts` | new | 174 | Pass | Pass | Pass (as Grok's) | Pass | — | — |
| All other changed source files | — | < 400 | Pass | Pass | Pass | Pass | — | — |

## Legacy / Backward-Compatibility Verdict

| Check | Result | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms in changed scope | Pass | No aliases for renamed types; Grok migrated |
| No legacy old-behavior retention in changed scope | Pass | — |
| Dead code removed in the touched files and modules | Pass | See Removal Plan items, all removed |
| Approved persisted-data transition decision followed | Pass | `Not Affected`: new string values only |
| No version-specific dual reads/writes or old-shape fallback | Pass | Frozen migration table left as its own era's copy (migration-owned) |
| Approved transition mechanics match the design | Pass | N/A (no migration) |

## Dead / Obsolete / Legacy Items Requiring Removal

None.

## Docs-Impact Verdict

- Docs impact: `Yes`
- Why: new runtime, new proxy route family, glossary terms.
- Files or areas likely affected: already updated in `3514947952` (`deepseek_harness_runtime.md`, `credential_proxy.md`, `agent_runtimes.md`, `secret_management.md`, `grok_build_runtime.md`, docs index, `GLOSSARY.md`). Delivery re-checks after API/E2E.

## Additional Material Premise Validation

### Upstream Design-Review Material-Premise Decisions

| Premise ID | Current Status | Changed Evidence / Reason |
| --- | --- | --- |
| P-001 (dsh without a proxy would resolve its own key) | Confirmed | Implemented as refusal before spawn and unavailability (DEC-020) |

No new or reclassified premises.

## Review Scorecard (Mandatory)

- Overall score: 9.4 / 10 (round 2) (simple average; not the decision rule)

| Priority | Category | Score | Why This Score | What Is Weak / Holding It Down | What Should Improve |
| --- | --- | --- | --- | --- | --- |
| 1 | Data-Flow Spine Inventory and Clarity | 9.5 | Every designed spine maps to one code path with the stated order | — | — |
| 2 | Ownership Clarity and Boundary Encapsulation | 9.5 | Launcher, session, relay access and revocation owners each hold their concern; no bypass | — | — |
| 3 | API / Interface / Query / Command Clarity | 9.4 | Split launch kinds, identity-scoped `observe`, separate route families | — | — |
| 4 | Separation of Concerns and File Placement | 9.3 | New folders and files placed as designed; CR-001 resolved with the input contract in its own file | — | — |
| 5 | Shared-Structure / Data-Model Tightness and Reusable Owned Structures | 9.4 | Tight new types; one source for the key-missing text and relay definition | — | — |
| 6 | Naming Quality and Local Readability | 9.4 | Vocabulary matches the glossary; comments state why | — | — |
| 7 | API/E2E Readiness | 9.3 | Unit, integration, Grok E2E and a live suite recorded; hints for what remains | AC-006 precondition not producible (wording) | Solution Designer settles AC-006 wording |
| 8 | Runtime Correctness And Behavioral Fidelity | 9.4 | Refusal before spawn, synchronous `finished`, in-turn effects, end order, compaction completed only with a stop reason | — | — |
| 9 | No Backward-Compatibility / No Legacy Retention | 9.5 | Clean renames, Grok migrated, no aliases | — | — |
| 10 | Cleanup Completeness | 9.3 | All Removal Plan items removed | — | — |

## Findings

No open findings. CR-001 is resolved in round 2 (see `code-review-revision-record.md`, CRR-002); kept below for reference.

### CR-001 — `general-process-run-supervisor.ts` grown past the 500-line limit (Resolved in round 2)

- Contract: team source-size rule (ENG-001; candidate C-01). The file was already over 500 non-empty lines on the base (511) and this change adds to it (522; 494 → 503 even without comment lines).
- Added here: imports of `ProviderRelayAccess`/`RunPassRevocation`, the `providerRelayAccess` and `runPasses` input fields, three disposition validation lines in `requireGeneralProcessRunSupervisorInput`, and the wiring lines.
- Required action: put the new code in a properly owned file rather than growing this one. A natural owner exists: the supervisor's input contract and its validation (`GeneralProcessRunSupervisorInput` and `requireGeneralProcessRunSupervisorInput`, about 65 lines, `:92-157`) can move to e.g. `agent-execution/runtime/general-process-run-supervisor-input.ts`, which brings the supervisor well under the limit. No behavior change; update imports of the exported type. Also correct the handoff's size note (it names `build-studio-server.ts` as the largest touched source).

## Follow-ups

- Follow-ups this review added: None.

## Classification

- None in round 2 (Pass). Round 1: `Local Fix` (implementation-owned), CR-001, now resolved.

## Recommended Recipient

- API/E2E engineer (implementation-review pass), at the address `get_handoff_rules` returns; the implementation engineer gets the informational pass notification.

## Residual Risks

- AC-006: the shared composer refuses `{{…}}` in composed instructions for every runtime (pre-existing, outside Change Scope), so the AC's `{{name}}` precondition cannot be produced through the product. The dsh path delivers the composed text literally (plugin `interpolate: false`). The implementation handoff raises this for the Solution Designer; API/E2E should record AC-006 against producible instructions and point to this note.
- Discovery placeholder key (C-02): depends on dsh 0.2.2-rc.1 listing its catalog with any key on a non-official endpoint (DEC-003: breakage handled as a bug).
- Left to API/E2E per the handoff: live compaction (AC-010), long reasoning (AC-012), key removed mid-run, Teams/Orgs and runtime switch, standalone host refusal, RSK-004 memory, rendered Agent Runtimes row.

## Latest Authoritative Result

- Review Decision: `Pass`
- Review Entry Point: `Implementation Review`
- Supported Product Scenario Gate: `Pass`
- Material-Premise Gate: `Pass`
- Score Summary: 9.4 average; every category ≥ 9.3
- Failure Origin: N/A
- Recommended Recipient: API/E2E engineer
- Notes: round 2, a targeted delta review, verified the CR-001 fix. The round-1 full review stands for everything else. AC-006 wording remains a residual risk for the Solution Designer.
