# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `tickets/in-progress/deepseek-dsh-runtime-investigation/requirements-doc.md` (Approved at SR-001; SR-003 adds DEC-019/DEC-020)
- Upstream Investigation Notes: `…/investigation-notes.md` (SR-003)
- Upstream Solution Revision Record: `…/solution-revision-record.md` (SR-001…SR-004)
- Reviewed Design Spec: `…/design-spec.md` (SR-004, status `Ready`)
- Supplemental Task Artifacts Reviewed: `probes/` (`vault-forwarder.mjs`, `pass-forwarder.mjs`, `owned-home.cordis.patch.yml`, `dsh-plugin/`), `evidence/p9-*`, `evidence/p19-*`, `follow-ups.md`, `handoff-architecture-design-complete.md` (SR-004)
- Relevant Solution Revision IDs: SR-004 (design revision), SR-003, SR-002, SR-001
- Architecture Review Revision Record: `…/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-003`
- Current Review Round: 3
- Trigger: design revision SR-004 after ARCH-REV-002 (Fail, AR-008)
- Prior Review Round Reviewed: 2 (ARCH-REV-002, Fail, AR-008); round 1 (ARCH-REV-001, AR-001…AR-007, resolved in round 2)
- Latest Authoritative Round: 3
- Current-State Evidence Basis: worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/deepseek-dsh-runtime-investigation`, commit `0f0ed76814` (documents only; code = base `3ef5e33eec`). Round 3 also opened `agent-execution/runtime/general-process-run-supervisor.ts:215-255` (the one `AgentRunManager`/`AgentRunResourceManager` construction for studio and standalone) and re-listed every construction site (`new AgentRunResourceManager`: supervisor `:223`, kernel builder `:102`; `AgentRunManager`: supervisor `:241` via `initializeProcessInstance`, kernel builder `:136`). Round 1 basis plus, in round 2: `agent-execution/services/agent-run-manager.ts:46-70,130,160-173`, `agent-execution/services/agent-run-resource-manager.ts:64,122-124`, `application-platform/execution/application-execution-scope-kernel-builder.ts:57-146`, `application-platform/runtime/build-application-platform-runtime.ts:69-101`, `compositions/build-studio-server.ts:200-215,310-320`, `standalone-application-host/start-standalone-application-host.ts:264-272`, `index.ts:8-17`, `credential-proxy/integration-run-access.ts:11-50`.

## Routing Classification Review

- Task size: `Large`
- Architectural risk: `High`
- Classification rationale reviewed: unchanged from round 1. SR-003 adds composition wiring and one end owner; the classification still holds.
- Independent Architecture Review required by the classification: `Yes`
- Classification evidence or correction required: None.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed`.
- Approved requirements / intended behavior understood: Yes. DEC-019 (keep dsh's plugin inventory field) and DEC-020 (dsh only where the process runs the credential proxy; refused and unavailable elsewhere) are recorded as Solution Designer decisions within the direction, user informed, with no change to REQ/AC. This review does not reopen them.
- Relevant existing behavior and evidence confirmed: Yes. SR-003's new citations were opened and match the code: three `open` callers, two end copies, the `createForExecution` dispositions, the application scope wiring, and the process singletons.
- Scope guardrail confirmed: Yes.
- Every prospective blocking `Design Impact` finding traceable to an approved ID: `Yes`.
- Remaining material ambiguity: None.
- Statements about existing code the design relies on: correct as cited. SR-004 now cites the revocation facts (`agent-run-resource-manager.ts:124`, `agent-run-manager.ts:169-173`, `application-execution-scope-kernel-builder.ts:110,146`); they match the code.

| Behavior ID | Kind | Design Alignment With Approved Intent | Approved Trigger / Contract And Current-State Evidence | Target Outcome / Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | Pass | Pass | Pass | Confirmed | — |
| BEH-002/003 | User | Pass | Pass | Pass | Confirmed | — |
| BEH-004 | System | Pass | Pass | Pass | Confirmed | Three restore forms traced (AR-001 resolved) |
| BEH-005 | User | Pass | Pass | Pass | Confirmed | Process relay slot (AR-003 resolved) |
| BEH-006 | System | Pass | Pass | Pass | Confirmed | Backend holds instructions for reopen |
| BEH-007/008 | System | Pass | Pass | Pass | Confirmed | — |
| BEH-009 | System | Pass | Pass | Pass | Confirmed | One revocation owner, `RunPassRevocation`, wired in every composition with a pass (AR-008 resolved) |
| BEH-010/011/012 | System | Pass | Pass | Pass | Confirmed | DS-008 end order (AR-002 resolved) |
| BEH-013 | User | Pass | Pass | Pass | Confirmed | Unavailable with a reason without the relay |
| BEH-014/015 | System | Pass | Pass | Pass | Confirmed | — |

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose And Scope Are Clear? | Linked To Relevant Core Artifacts? | Internally Complete? | Consistent With Related Core Artifacts? | Status And Approval Applicability Are Clear? | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| `probes/` | Pass | Pass | Pass | Pass | Pass | Probe-only body stripping now noted (AR-007 resolved); `pass-forwarder.mjs` envelope adopted (AR-004 resolved) |
| `evidence/` | Pass | Pass | Pass | Pass | Pass | — |
| `follow-ups.md` | Pass | Pass | Pass | Pass | Pass | — |

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | Feature; triggers incl. repeated coordination and behavior by absence | — |
| Root-cause classification is explicit and evidence-backed | Pass | End duplicate named and folded in | — |
| Refactor decision is explicit | Pass | No separate refactor; consolidation in scope | — |
| Refactor decision is supported by the concrete design sections | Pass | DS-008, Removal Plan | — |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? | Narrative Is Clear? | Facade Vs Governing Owner Is Clear? | Main Domain Subject Naming Is Clear? | One Owner Per Node, In Call Order? | Off-Spine Concerns Stay Off Main Line? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Create | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-002 | Turn | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-003 | Provider-call observation | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-004 | Restore (three forms) | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-005 | Discovery | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-006 | Availability / status | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-007 | Session state machine | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-008 | End of a generation | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| Pass end | Release / activation failure → `RunPassRevocation.revokeForRun` | Pass | Pass | N/A | Pass | Pass | Pass | Pass (AR-008 resolved) |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? | Internal Owned Mechanisms Stay Internal? | Caller Bypass Risk Is Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `ProviderRelayAccess` | Pass | Pass | Pass | Pass | Grants only; the pass's end belongs to `RunPassRevocation` |
| `RunPassRevocation` | Pass | Pass | Pass | Pass | One owner of a pass's end; `IntegrationRunAccess.revokeForRun` removed; bypass shapes named |
| `ProviderRelayRoute` | Pass | Pass | Pass | Pass | — |
| `AcpSessionLauncher` | Pass | Pass | Pass | Pass | Factory and backend end through `end` (AR-002 resolved) |
| `AcpAgentSession` | Pass | Pass | Pass | Pass | — |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? | Forbidden Shortcuts Are Explicit? | Direction Is Coherent With Ownership? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| backends → `credential-proxy` | Pass | Pass | Pass | Pass | — |
| `credential-proxy` → `agent-execution` | Pass | Pass | Pass | Pass | Forbidden |
| dsh runtime / `llm-management` → process slot | Pass | Pass | Pass | Pass | Slot set only by the composition owning the proxy host; tradeoff recorded |
| Shared ACP → runtime folders | Pass | Pass | Pass | Pass | — |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? | Responsibility Is Singular? | Identity Shape Is Explicit? | Generic Boundary Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `ProviderRelayAccess.prepareForRun / relayBaseUrl / observe` | Pass | Pass | Pass | Low | Pass (`observe` identity-scoped) |
| Relay refusal envelope | Pass | Pass | Pass | Low | Pass (AR-004 resolved; matches dsh `transport.ts:22-31`) |
| `AcpAgentLaunchProfile.runLaunch / discoveryLaunch` | Pass | Pass | Pass | Low | Pass (`normalizeModels` removed) |
| `AcpSessionOpenRequest {mode: new \| restore, instructions}` | Pass | Pass | Pass | Low | Pass |
| `createForExecution({…, providerRelayAccess})` | Pass | Pass | Pass | Low | Pass |
| `RunPassRevocation.revokeForRun(runId)` | Pass | Pass | Pass | Low | Pass |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? | Reuse / Extension Decision Is Sound? | New Support Piece Is Justified? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Forwarding, pass lifecycle, vault, skills, rotation, usage, discovery | Pass | Pass | N/A | Pass | — |
| Owner end | Pass | Pass | N/A | Pass | `AcpSessionLauncher.end` extended |
| Observation delivery | Pass | Pass | Pass | Pass | — |
| Process relay slot | Pass | Pass | Pass | Pass | Justified: catalog and availability are DI-less singletons (`model-catalog-service.ts:68-77,363`) |
| Pass revocation | Pass | Pass | Pass | Pass | `RunPassRevocation` over `RunPassRegistry.revoke` |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? | Reuse / Extend / Create-New Decision Is Sound? | Supports The Right Spine Owners? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `credential-proxy/provider-relays/` | Pass | Pass | Pass | Pass | — |
| `runtime-management/acp`, `agent-execution/backends/acp` | Pass | Pass | Pass | Pass | — |
| `runtime-management/deepseek-harness`, `agent-execution/backends/deepseek-harness` | Pass | Pass | Pass | Pass | — |
| compositions | Pass | Pass | Pass | Pass | `runPasses` from the same host wherever `integrationRunAccess` or `providerRelayAccess` is non-null; supervisor (studio host's / standalone `null`) and kernel builder `:102-111`, `:136-146` |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? | Shared File Choice Is Sound? | Ownership Of Shared Structure Is Clear? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `ProviderCallObservation`, dsh identity constants | Pass | Pass | Pass | Pass | — |
| Owner end sequence | Pass | Pass | Pass | Pass | One owner |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Overlapping Representation Risk Is Controlled? | Shared Core Vs Specialized Variant | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `RunPassHolder` + `providerRelayId` | Pass | Pass | Pass | N/A | Pass | `issue`/`clearGrants` keep it |
| `ProviderCallObservation` | Pass | Pass | Pass | N/A | Pass | — |
| `AcpSessionEffect` + `activity` | Pass | Pass | Pass | N/A | Pass | — |
| `AcpRunLaunchRequest`, `AcpSessionOpenRequest` | Pass | Pass | Pass | N/A | Pass | — |
| `AcpPreparationOwner` + `launch`, `providerCalls` | Pass | Pass | Pass | N/A | Pass | Ended only by `end` |

Derived consumers of a changed structure listed with a decision for each (Principle 11): `Pass` for owner, launch contract, effect and runtime kind. `Pass` for `RunPassHolder`: both revocation callers are now listed with their decision (SR-004).

Each domain word keeps one meaning, and each concept one name (Principle 15): `Pass` ("provider relay", `DSH_PROVIDER_ROUTE`, glossary distinction from Model Routing; AR-006 resolved).

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? | Matches The Intended Owner? | Re-Tightened After Extraction? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Shared ACP files (launcher, session, factory, backend, contracts) | Pass | Pass | N/A | Pass | — |
| `credential-proxy/provider-relays/*`, `run-pass-registry.ts`, forwarder | Pass | Pass | N/A | Pass | — |
| `provider-relay-process-access.ts` | Pass | Pass | N/A | Pass | — |
| `application-execution-scope-kernel-builder.ts`, `general-process-run-supervisor.ts` | Pass | Pass | N/A | Pass | `providerRelayAccess` and `runPasses` dispositions |
| `credential-proxy/run-pass-revocation.ts` | Pass | Pass | N/A | Pass | — |
| dsh runtime/backend files, availability, catalog, strategy | Pass | Pass | N/A | Pass | — |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? | Folder Matches Owning Boundary? | Mixed-Layer Or Over-Split Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `credential-proxy/provider-relays/` | Pass | Pass | Low | Pass | — |
| `runtime-management/deepseek-harness/` | Pass | Pass | Low | Pass | — |
| `agent-execution/backends/deepseek-harness/` | Pass | Pass | Low | Pass | — |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? | Replacement Owner / Structure Is Clear? | Removal / Decommission Scope Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `args`/`env`/`normalizeModels`/`AcpLaunchSelection` | Pass | Pass | Pass | Pass | — |
| `AcpExtEffect`/`AcpExtNotificationContext` | Pass | Pass | Pass | Pass | — |
| Mode `"load"` (factory restore and backend reopen) | Pass | Pass | Pass | Pass | — |
| Factory end copy | Pass | Pass | Pass | Pass | — |
| `IntegrationRunAccess.revokeForRun` and the managers' `integrationRunAccess` revoke dependency | Pass | Pass | Pass | Pass | Replaced by `RunPassRevocation` (`runPasses`) |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? | Clean-Cut Removal Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- |
| Shared ACP contract, end owner | No | Pass | Pass | Rejection log updated |
| dsh version gates | No | Pass | Pass | DEC-003 |

## Persisted-Data Transition Verdict (When Applicable)

| Area / Stored Subject | Approved Decision | Evidence Is Sufficient? | Choice Is Proportionate? | Migration Safety Complete If Required? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Runtime kind values, usage kinds | Not Affected | Pass | Pass | N/A | Pass | — |
| dsh home | New runtime-owned state; atomic writes; run folder removed at launch release | Pass | Pass | N/A | Pass | — |

## Change / Refactor Safety Verdict

| Area | Sequence Is Realistic? | Temporary Seams Are Explicit? | Cleanup / Removal Is Explicit? | Verdict |
| --- | --- | --- | --- | --- |
| Step 1 shared ACP + Grok | Pass | Pass | Pass | Pass |
| Step 2 credential proxy | Pass | Pass | Pass | Pass |
| Step 3 compositions | Pass | Pass | Pass | Pass |
| Steps 4–6 dsh runtime, docs, live E2E incl. reopen | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? | Example Is Present And Clear? | Bad Shape Explained When Helpful? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Run environment, base URL, home patch, effects | Yes | Pass | Pass | Pass | — |
| No relay access | Yes | Pass | Pass | Pass | — |
| Refusal seen by the user | Yes | Pass | Pass | Pass | — |
| Reopen with generations | Yes | Pass | Pass | Pass | — |

## Material Premise Validation (Only When Needed)

### P-001 — A dsh run is created in a composition with no credential proxy

- Status this round: resolved by DEC-020. The launcher refuses before spawn (`PROVIDER_RELAY_UNAVAILABLE`), and availability reports dsh unavailable with a reason, which the launch validator shows (`application-launch-host-capability-validator.ts:76-86`). No further consequence.

### P-002 — The relay reports `finished` after the turn has ended

- `Not Reachable` with synchronous delivery, which the design now states (DS-003, Guidance). Unchanged.

### P-003 — A relay-granted pass of an application-launch dsh run outlives the run

- Related approved requirement or established contract: REQ-009 ("a call without the run's live pass is refused"), AC-009 ("a call with a wrong or revoked pass is refused before any upstream call"); glossary **Run pass** ("revoked when the run is released or its activation fails", `GLOSSARY.md:164-167`).
- Relevant behavior ID(s): BEH-009
- Initiating basis kind: `User`
- Independent trigger: in the studio, a user launches an application whose leaf runtime is DeepSeek Harness, newly supported by DEC-020, then the run ends (terminate, or activation fails).
- Support evidence: DEC-020; design Final File Responsibility Mapping (application platform runtime and scope receive the studio's `providerRelayAccess`); application launch surface (`application-launch-host-capability-validator.ts:64-87`).
- Forward path: application scope kernel → `createForExecution({ providerRelayAccess: studio's })` → dsh factory → `AcpSessionLauncher.open` → `ProviderRelayAccess.prepareForRun` issues the run's pass with the relay grant. On release: `AgentRunResourceManager.release` → `this.dependencies.integrationRunAccess?.revokeForRun(runId)` (`agent-run-resource-manager.ts:122-124`), whose `integrationRunAccess` is `null` in the scope (`application-execution-scope-kernel-builder.ts:102-111`). On activation failure: `AgentRunManager.releaseLocalSessions` → `this.integrationRunAccess?.revokeForRun(runId)` (`agent-run-manager.ts:169-173`), `null` in the scope (`:146`). `ProviderRelayAccess` has no revoke operation (Interface Boundary Mapping).
- Lifecycle preconditions and consequence: the pass and its relay grant stay in `RunPassRegistry` until the server restarts. The relay keeps accepting the ended run's pass, contrary to AC-009 and the run-pass contract, and the registry keeps one holder per ended application run.
- Reachability: `Reachable`
- Review consequence: AR-008. Resolved in round 3: `RunPassRevocation` reaches both release paths in the application scope (kernel builder `:102-111`, `:141-146`), so the pass ends with the run.

## Unresolved Approved-Behavior Or Current-State Gaps

None in the requirements.

## Review Decision

`Pass`

## Findings

None open. AR-001…AR-007 were resolved in round 2 and AR-008 in round 3; see `architecture-review-revision-record.md` (ARCH-REV-002, ARCH-REV-003).

## Classification

N/A (Pass).

## Recommended Recipient

Implementation Engineer (`/software_engineering_team/implementation_engineer`).

## Residual Risks

- The process relay slot is set before the proxy listens. Discovery reports `DEEPSEEK_HARNESS_RELAY_NOT_READY` (transient, never cached) until then; availability depends only on the slot. Adopted.
- The slot is per process. The standalone host is a separate library entry and leaves it unset. Not reachable today.
- Implementation must keep the adopted guidance: synchronous `finished`, `issue`/`clearGrants` keeping the relay grant, atomic home writes, the `customSkillDirs` guard, and no logging of passes or header values.
- Live E2E (step 6) must include a reopen, the key-absence scan, and a refusal check of the pass after release of an application-launch run.
- RSK-002 (compaction header in dsh code), RSK-004 (process memory per run), RSK-006 (overlap with autobyteus-386 in the shared ACP layer).

## Latest Authoritative Result

- Review Decision: `Pass`
- Material-Premise Gate: `Pass` (P-001 resolved by DEC-020; P-002 Not Reachable; P-003 resolved by `RunPassRevocation`)
- Notes: SR-004 resolves AR-008 with one run-pass lifetime owner, removes the integration-only revoke, and wires it at every construction of `AgentRunManager` and `AgentRunResourceManager`. The design is ready for implementation.
