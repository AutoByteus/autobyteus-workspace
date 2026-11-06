# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `tickets/in-progress/deepseek-dsh-runtime-investigation/requirements-doc.md` (Approved, SR-002)
- Upstream Investigation Notes: `…/investigation-notes.md`
- Upstream Solution Revision Record: `…/solution-revision-record.md` (SR-001, SR-002)
- Reviewed Design Spec: `…/design-spec.md` (SR-002, status `Ready`)
- Supplemental Task Artifacts Reviewed: `probes/` (`vault-forwarder.mjs`, `pass-forwarder.mjs`, `owned-home.cordis.patch.yml`, `dsh-plugin/autobyteus-agent-instructions.mjs`), `evidence/p9-*`, `evidence/p19-*`, `follow-ups.md`, `handoff-architecture-design-complete.md`
- Relevant Solution Revision IDs: SR-002 (design), SR-001 (requirements basis)
- Architecture Review Revision Record: `…/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-001`
- Current Review Round: 1
- Trigger: Architecture Design Complete, `Large` / `High`
- Prior Review Round Reviewed: N/A
- Latest Authoritative Round: 1
- Current-State Evidence Basis: worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/deepseek-dsh-runtime-investigation`, commit `e3187f78e9` (code = base `origin/personal` `3ef5e33eec`). Files opened: `runtime-management/acp/{acp-agent-launch-profile,acp-agent-capabilities,acp-discovery-handshake}.ts`; `agent-execution/backends/acp/{acp-agent-session-profile.ts, session/acp-agent-session.ts, session/acp-session-launcher.ts, backend/acp-agent-run-backend-factory.ts, backend/acp-agent-run-backend.ts, events/acp-session-update-converter.ts}`; `credential-proxy/{run-pass-registry,integration-run-access,credential-proxy-host,credential-proxy-local-server,credential-proxy-forwarder,credential-proxy-routes}.ts`; `agent-execution/services/agent-run-resource-manager.ts:100-140`; `agent-execution/providers/agent-provider-factory-builder.ts:150-230`; `application-platform/execution/application-execution-scope-kernel-builder.ts:95-150`; `standalone-application-host/start-standalone-application-host.ts:250-270`; `application-platform/launch-configuration/application-launch-host-capability-validator.ts:60-140`; `llm-management/services/model-catalog-service.ts:30-90`; `secret-management/{domain/secret-id.ts, catalog/provider-credential-catalog.ts}`; `GLOSSARY.md:150-260`. dsh source (`/tmp/ab387-ext/dsh-src`, commit `fcc0ad46`): `packages/llm/llm-deepseek/src/{transport.ts:9-45, adapter.ts:140-170, messages-api.ts:14-17, config.ts:311}`, `docs/deepseek-llm-api-wire-extensions.md:41-72,160`.

## Routing Classification Review

- Task size: `Large`
- Architectural risk: `High`
- Classification rationale reviewed: new runtime owner, four seams in the shared ACP layer used by Grok, a second credential-proxy route family that forwards a vault key, new secret consumer, runtime-kind registration across server, three contract packages and web. Confirmed against the code read.
- Independent Architecture Review required by the classification: `Yes`
- Classification evidence or correction required: None.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed` for intent; target paths need correction for the rows marked below.
- Approved requirements / intended behavior understood: Yes. dsh as an ACP runtime with Grok's run lifecycle; the key only through the credential proxy; rotation on dsh compactions; per-call usage; literal instructions on every launch.
- Relevant existing behavior and evidence confirmed: Yes (citations above). The cited lines for the launcher (`acp-session-launcher.ts:81-129`), capabilities (`:39-45`), session (`:19,180-206,315-327`), forwarder (`:46,83-94,119-120,154-157`), pass registry, restore instructions comment (`acp-agent-run-backend-factory.ts:126`) and secret consumer (`provider-credential-catalog.ts:58-62`) match the code.
- Scope guardrail confirmed: Yes. In scope UC-001…UC-008; out of scope image blocks, `.env` loading (FU-001), Antigravity; preserved Grok (AC-016) and integration proxy behavior (AC-017).
- Approved change, preserved behavior, and outside scope understood: Yes.
- Every prospective blocking `Design Impact` finding is traceable to an approved requirement, acceptance criterion, or preserved-behavior ID: `Yes`.
- Remaining material ambiguity: None in the requirements. The design spec's approval line cites the requirements "at SR-001" while the requirements doc says "this document at SR-002" (cosmetic; align on the next revision).
- Statements about existing code the design relies on: all opened statements are correct. Two current-code facts the design does not account for: the backend's reopen path (`acp-agent-run-backend.ts:219-247`) is a third caller of `AcpSessionLauncher.open`, and the factory's `releaseResources` (`acp-agent-run-backend-factory.ts:82-92`) duplicates `AcpSessionLauncher.end` (`acp-session-launcher.ts:135-147`). See AR-001, AR-002.

| Behavior ID | Kind | Design Alignment With Approved Intent | Approved Trigger / Contract And Current-State Evidence | Target Outcome / Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | Pass | Pass | Fail | Needs Correction | AR-003: model access for compositions without a credential proxy |
| BEH-002 | User | Pass | Pass | Pass | Confirmed | — |
| BEH-003 | User | Pass | Pass | Pass | Confirmed | — |
| BEH-004 | System | Pass | Pass | Fail | Needs Correction | AR-001: the reopen form of restore is not traced |
| BEH-005 | User | Pass | Pass | Fail | Needs Correction | AR-003: discovery wiring to the route base URL and dsh home |
| BEH-006 | System | Pass | Pass | Fail | Needs Correction | AR-001: no composed prompt on the reopen launch |
| BEH-007 | System | Pass | Pass | Pass | Confirmed | — |
| BEH-008 | System | Pass | Pass | Pass | Confirmed | (mapped under BEH-002 row) |
| BEH-009 | System | Pass | Pass | Fail | Needs Correction | AR-003 (launch with no model access), AR-004 (refusal text) |
| BEH-010/011/012 | System | Pass | Pass | Fail | Needs Correction | AR-002: observer and launch release ownership |
| BEH-013 | User | Pass | Pass | Pass | Confirmed | — |
| BEH-014 | System | Pass | Pass | Pass | Confirmed | — |
| BEH-015 | System | Pass | Pass | Pass | Confirmed | AR-007 is a clarification only |

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose And Scope Are Clear? | Linked To Relevant Core Artifacts? | Internally Complete? | Consistent With Related Core Artifacts? | Status And Approval Applicability Are Clear? | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| `probes/` | Pass | Pass | Pass | Fail | Pass | AR-007: `vault-forwarder.mjs` rewrites request bodies (`:23`), which the design's route does not; AR-004: `pass-forwarder.mjs:10` uses the Anthropic error envelope, the design does not |
| `evidence/` | Pass | Pass | Pass | Pass | Pass | — |
| `follow-ups.md` | Pass | Pass | Pass | Pass | Pass | — |

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | Feature; triggers listed | — |
| Root-cause classification is explicit and evidence-backed | Pass | `No Design Issue Found`; owners healthy | — |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | No separate refactor; renames are part of the feature | — |
| Refactor decision is supported by the concrete design sections or residual-risk rationale | Pass | Seams extend existing owners | The duplicated end logic (AR-002) is in a touched file and should be folded into the one end owner |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? | Narrative Is Clear? | Facade Vs Governing Owner Is Clear? | Main Domain Subject Naming Is Clear? | One Owner Per Node, In Call Order? | Off-Spine Concerns Stay Off Main Line? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Create | Pass | Pass | Pass | Pass | Pass | Pass | Pass (inventory writes "factory / launcher"; the narrative resolves the launcher as owner) |
| DS-002 | Turn | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-003 | Model-call observation | Pass | Pass | Pass | Fail (AR-006) | Pass | Pass | Pass, naming via AR-006 |
| DS-004 | Restore | Fail | Pass | Pass | Pass | Fail | Pass | Fail (AR-001: reopen form missing) |
| DS-005 | Discovery | Pass | Pass | Pass | Pass | Fail | Pass | Fail (AR-003: how the catalog reaches the route base URL and dsh home) |
| DS-006 | Runtime status | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-007 | Session state machine | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| (missing) | Session end / run release | Fail | — | — | — | Fail | — | Fail (AR-002) |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? | Internal Owned Mechanisms Stay Internal? | Caller Bypass Risk Is Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `RuntimeModelRunAccess` | Pass | Pass | Pass | Pass | Backends never touch `RunPassRegistry`/observers |
| `RuntimeModelProxyRoute` | Pass | Pass | Pass | Pass | Reports observations; knows no sessions |
| `AcpSessionLauncher` | Pass | Fail | Fail | Fail | AR-002: the factory ends the owner itself (`acp-agent-run-backend-factory.ts:82-92`) instead of through `AcpSessionLauncher.end` |
| `AcpAgentSession` | Pass | Pass | Pass | Pass | Effects applied only by the session |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? | Forbidden Shortcuts Are Explicit? | Direction Is Coherent With Ownership? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `agent-execution/backends/*` → `credential-proxy` | Pass | Pass | Pass | Pass | Exists for integrations |
| `credential-proxy` → `agent-execution` | Pass | Pass | Pass | Pass | Forbidden |
| `runtime-management/deepseek-harness` → `credential-proxy` | Pass | Pass | Fail | Fail | AR-003: the module-level catalog (`model-catalog-service.ts:68-77`) has no path to the composed proxy host |
| Shared ACP → runtime folders | Pass | Pass | Pass | Pass | — |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? | Responsibility Is Singular? | Identity Shape Is Explicit? | Generic Boundary Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `RuntimeModelRunAccess.prepareForRun/routeBaseUrl/observe` | Pass | Pass | Pass | Low | Pass |
| `POST /m/<routeId>/…` refusals | Pass | Pass | Pass | Low | Fail (AR-004: body shape dsh cannot read) |
| `AcpAgentLaunchProfile.runLaunch/discoveryLaunch` | Pass | Pass | Pass | Low | Pass |
| `AcpAgentLaunchProfile.normalizeModels` | Fail | Pass | Pass | Low | Fail (AR-005: only Grok's capability calls it) |
| `AcpRunLaunchRequest` | Pass | Pass | Fail | Low | Fail (AR-001: the reopen caller has no `composedPrompt`) |
| `AcpAgentSessionProfile.configSelection / interpretModelTraffic?` | Pass | Pass | Pass | Low | Pass |
| `AcpClientConnection.resumeSession/setSessionConfigOption/listSessions/closeSession` | Pass | Pass | Pass | Low | Pass |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? | Reuse / Extension Decision Is Sound? | New Support Piece Is Justified? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Forwarding with credential | Pass | Pass | N/A | Pass | Forwarder already streams when not redacting (`:158-162`) |
| Pass lifecycle | Pass | Pass | N/A | Pass | Revocation at release covers the model route (`agent-run-resource-manager.ts:122-124`) |
| Skills | Pass | Pass | N/A | Pass | — |
| Compaction rotation / usage events | Pass | Pass | N/A | Pass | Converter pairs start/completion (`acp-session-update-converter.ts:151-167`) |
| Observation delivery (`ModelCallObservers`) | Pass | Pass | Pass | Pass | No push channel exists |
| dsh home | Pass | Pass | Pass | Pass | — |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? | Reuse / Extend / Create-New Decision Is Sound? | Supports The Right Spine Owners? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `credential-proxy/model-routes/` | Pass | Pass | Pass | Pass | — |
| `runtime-management/acp` | Pass | Pass | Pass | Pass | — |
| `agent-execution/backends/acp` | Pass | Pass | Fail | Fail | AR-001/AR-002 |
| `runtime-management/deepseek-harness` | Pass | Pass | Fail | Fail | AR-003 (catalog wiring) |
| `agent-execution/backends/deepseek-harness` | Pass | Pass | Pass | Pass | — |
| compositions (studio, application scope, standalone host, general-process supervisor) | Fail | — | Fail | Fail | AR-003: not in the design |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? | Shared File Choice Is Sound? | Ownership Of Shared Structure Is Clear? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `ModelCallObservation` | Pass | Pass | Pass | Pass | — |
| dsh identity constants | Pass | Pass | Pass | Pass | Naming via AR-006 |
| Usage payload builders kept separate | Pass | N/A | Pass | Pass | — |
| Owner end sequence (launcher end vs factory release) | Fail | — | — | Fail | AR-002 |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Overlapping Representation Risk Is Controlled? | Shared Core Vs Specialized Variant | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `RunPassHolder` + `modelRouteId` | Pass | Pass | Pass | N/A | Pass | `issue()` rebuilds the holder (`run-pass-registry.ts:27-31`): keep the integration→model order in the launcher, or have `issue` preserve the field (implementation note) |
| `ModelCallObservation` | Pass | Pass | Pass | N/A | Pass | — |
| `AcpSessionEffect` + `activity` | Pass | Pass | Pass | N/A | Pass | — |
| `AcpRunLaunchRequest` | Pass | Pass | Pass | N/A | Pass | Field availability on reopen: AR-001 |
| `AcpPreparationOwner` (+ `launch`, `modelTraffic`) | Pass | Pass | Pass | N/A | Fail | AR-002 |

Derived consumers of a changed structure listed with a decision for each (Principle 11): `Pass` for `RunPassHolder`, `AcpSessionEffect` and the runtime kind. `Fail` for `AcpPreparationOwner` (its two end paths are not listed) — AR-002.

Each domain word keeps one meaning, and each concept one name (Principle 15): `Fail` — AR-006.

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? | Matches The Intended Owner? | Re-Tightened After Extraction? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `credential-proxy/model-routes/*` | Pass | Pass | Pass | Pass | — |
| `acp-session-launcher.ts` | Pass | Pass | N/A | Fail | AR-002: must own ending, including the new handles |
| `acp-agent-run-backend-factory.ts` | Fail | Fail | N/A | Fail | AR-002: duplicated end logic; AR-001: prompt handoff to the backend |
| `acp-agent-run-backend.ts` | — | — | — | Fail | Not in the change inventory; AR-001 changes its reopen call |
| `deepseek-harness-launch-profile.ts` | Pass | Pass | N/A | Fail | AR-005: unused `normalizeModels` |
| compositions | — | — | — | Fail | AR-003: not in the change inventory |
| Others in the Final File Responsibility Mapping | Pass | Pass | N/A | Pass | — |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? | Folder Matches Owning Boundary? | Mixed-Layer Or Over-Split Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `credential-proxy/model-routes/` | Pass | Pass | Low | Pass | — |
| `runtime-management/deepseek-harness/` | Pass | Pass | Low | Pass | Mirrors `grok/` |
| `agent-execution/backends/deepseek-harness/` | Pass | Pass | Low | Pass | Mirrors `backends/grok/` |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? | Replacement Owner / Structure Is Clear? | Removal Scope Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `args`/`env`/`AcpLaunchSelection` | Pass | Pass | Pass | Pass | — |
| `AcpExtEffect`/`AcpExtNotificationContext` | Pass | Pass | Pass | Pass | — |
| Launcher mode `"load"` | Pass | Pass | Fail | Fail | AR-001: the backend's reopen call (`acp-agent-run-backend.ts:231`) also uses it |
| Factory end copy (`acp-agent-run-backend-factory.ts:82-92`) | Fail | — | Fail | Fail | AR-002 |
| `AcpAgentLaunchProfile.normalizeModels` | Fail | Pass | Fail | Fail | AR-005 |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? | Clean-Cut Removal Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- |
| Shared ACP contract | No | Pass | Pass | Grok migrates; no aliases |
| dsh version gates | No | Pass | Pass | DEC-003 |

## Persisted-Data Transition Verdict (When Applicable)

| Area / Stored Subject | Approved Decision | Evidence Is Sufficient? | Choice Is Proportionate? | Migration Safety Complete If Required? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `runtimeKind`, manifest `runtime_kind`, usage kinds | Not Affected (new values) | Pass | Pass | N/A | Pass | `runtimeKindFromString`, open unions |
| dsh home under `<appData>/runtimes/deepseek-harness/` | New runtime-owned state | Pass | Pass | N/A | Pass | Loss = loss of restore, accepted in requirements |

## Change / Refactor Safety Verdict

| Area | Sequence Is Realistic? | Temporary Seams Are Explicit? | Cleanup / Removal Is Explicit? | Verdict |
| --- | --- | --- | --- | --- |
| Step 1 shared ACP + Grok migration | Pass | Pass | Fail (AR-002, AR-005) | Fail |
| Step 2 credential proxy | Pass | Pass | Pass | Pass |
| Step 3 dsh runtime + registration | Fail (AR-003: compositions missing) | Pass | Pass | Fail |
| Steps 4–5 docs, live E2E | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? | Example Is Present And Clear? | Bad Shape Explained When Helpful? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| dsh run environment | Yes | Pass | Pass | Pass | — |
| Base URL → upstream path | Yes | Pass | Pass | Pass | Verified against dsh `messagesApiRoot` (`messages-api.ts:14-17`) |
| Home patch | Yes | Pass | Pass | Pass | — |
| Model-traffic effects | Yes | Pass | Pass | Pass | — |
| Refusal body seen by dsh | Yes | Fail | Fail | Fail | AR-004 |
| Run release / reopen order | Yes | Fail | N/A | Fail | AR-001, AR-002 |

## Material Premise Validation (Only When Needed)

### P-001 — A dsh run is created in a composition with no credential proxy

- Related approved requirement or established contract: REQ-001, REQ-009, AC-009, QR-001
- Relevant behavior ID(s): BEH-001, BEH-009
- Initiating basis kind: `User`
- Independent product-supported initiating trigger: a user configures an application launch whose leaf runtime is DeepSeek Harness and launches it.
- Support evidence: application launches accept any registered runtime whose availability is enabled (`application-launch-host-capability-validator.ts:64-87`); the design registers dsh in that validator (investigation notes registration list, `application-launch-host-capability-validator.ts:123`) and in runtime availability.
- Forward path: application launch → `ApplicationExecutionScopeKernelBuilder` → `createForExecution({ integrationRunAccess: null })` (`application-execution-scope-kernel-builder.ts:130-135`) and `AgentRunResourceManager({ integrationRunAccess: null })` (`:102-111`); the standalone host does the same (`start-standalone-application-host.ts:264`). No `CredentialProxyHost` exists in these compositions.
- Lifecycle preconditions and consequence: the design states model access only "when the launch profile names a model route" and gives no rule for a missing access dependency. If the launcher skips model access, dsh starts with the inherited environment and default endpoint and resolves its key itself: the launch environment's `DEEPSEEK_API_KEY` (the data-dir `.env` puts provider keys there, FU-001/RT-019), then `<cwd>/.env`, against `api.deepseek.com`. That bypasses the vault and puts a key in dsh's environment (REQ-009, QR-001). If it does not skip, run creation fails with an unspecified error.
- Reachability: `Reachable`
- Review consequence: AR-003.

### P-002 — The proxy reports a call's `finished` after the turn has ended

- Related approved requirement: REQ-011, AC-011
- Relevant behavior ID(s): BEH-011
- Initiating basis kind: `System`
- Trigger: the last model call of every turn.
- Forward path: upstream end → route tap emits `finished` in-process → session; dsh must first read the end of the stream, then write its prompt response to stdout, which the server reads in a later I/O callback.
- Consequence: only if `finished` is delivered through a timer or queue after the I/O round trip would `acp-agent-session.ts:195-197` drop the usage.
- Reachability: `Not Reachable` with synchronous delivery at upstream end, which the design implies ("end → finished(usage)"). Not a finding; recorded as implementation guidance (Residual Risks).

## Unresolved Approved-Behavior Or Current-State Gaps

None in the requirements. The current-state gaps are design omissions, listed as findings.

## Review Decision

`Fail`

## Findings

### AR-001 — The reopen launch has no composed prompt (Design Impact, High, blocking)

- Protects: REQ-006 / AC-006 ("on every launch (new and restore)"), REQ-004.
- Scope status: Within Approved Scope. Changes approved behavior: No.
- Existing behavior: the backend reopens the session at the next turn start after an Agent Tools change (`applyDefinitionTools`, `acp-agent-run-backend.ts:191-205`) or after a failed reopen (`:138-141`). `reopenWithCurrentTools` calls `launcher.open({ … mode: "load", sessionId })` (`:219-232`) with no prompt; the backend input holds no composed prompt (`:34-53`).
- Evidence: the design composes instructions only in `AcpAgentRunBackendFactory.createBackend/restoreBackend` (Final File Responsibility Mapping; DS-004), and `runLaunch` takes `composedPrompt` (Interface Boundary Mapping). The plugin is designed to skip when no instructions file is set (Concrete Examples, Home patch). A reopened dsh process therefore resumes the conversation without the agent's instructions. `acp-agent-run-backend.ts` is not in the change inventory, and the removal of mode `"load"` does not list this caller.
- Material premise: the reopen is an existing supported path (Agent Tools change on an active run), already exercised for Grok.
- Required update: trace the reopen as a third launch form of DS-004. Name who holds the composed prompt for the run's life and in what order it reaches `runLaunch` on reopen. One shape: the factory composes once per create/restore and passes it to `AcpAgentRunBackend` input, and the backend passes it in the reopen `open` request. Also decide whether the reopen re-sends the run-start text or recomposes from the current definition, as restore does. Add `acp-agent-run-backend.ts` to the inventory and the reopen caller to the `"load"` → `"restore"` removal row.
- Why proportionate: one field and one call site; without it a supported path silently drops the agent's identity.
- Recommended recipient: Solution Designer.

### AR-002 — Who ends the new owner handles, and in what order, is unspecified (Design Impact, Medium, blocking)

- Protects: REQ-001 (one dsh process and session per run), REQ-010/REQ-011 (observations reach the run's live session once), and the design's own constraint "per-run folders removed at release" (Persisted Data section).
- Scope status: Within Approved Scope. Changes approved behavior: No.
- Existing behavior: two code paths end what an `AcpPreparationOwner` holds. `AcpSessionLauncher.end(owner)` (`acp-session-launcher.ts:135-147`) is used by the reopen. The factory's `releaseResources` (`acp-agent-run-backend-factory.ts:82-92`) re-implements the same close sequence plus skill cleanup and does not call `end`.
- Evidence: the design adds `launch` (whose `release()` removes `runs/<runId>`) and the observer unsubscribe to the owner ("records every handle on the owner"), but it names no caller of `launch.release()` or the unsubscribe, and no order relative to session close and process stop. On reopen, a listener left subscribed keeps delivering the new process's calls to the closed session. If unsubscribe is keyed by run id, a late unsubscribe from the old generation removes the new listener and usage and compaction stop. A run release that misses `launch.release()` leaves the per-run folder behind.
- Required update: make `AcpSessionLauncher.end` the one owner of ending an owner, with a stated order (for example: unsubscribe observer → close session → close connection/stop process → `launch.release()`), and have the factory's `releaseResources` call it and then clean up skills, removing its copy. State that the unsubscribe removes only its own generation's listener. Add the end/release spine (or a bounded local spine under the launcher) and list `AcpPreparationOwner`'s two end paths under Derived Data.
- Why proportionate: it removes a duplicate that already exists in a touched file and adds no new mechanism.
- Recommended recipient: Solution Designer.

### AR-003 — Model access and discovery are not designed for every composition (Design Impact, Medium-High, blocking)

- Protects: REQ-009 / AC-009 / QR-001 (key only through the proxy, never in dsh's environment), REQ-001, REQ-005 / AC-005.
- Scope status: Within Approved Scope. Changes approved behavior: No.
- Material premise: P-001 (Reachable).
- Evidence: `createForExecution` takes an explicit `integrationRunAccess` disposition (`agent-provider-factory-builder.ts:159-174`). It is called by the general-process supervisor (`general-process-run-supervisor.ts:234`) and by the application execution scope with `null` (`application-execution-scope-kernel-builder.ts:130-135`). The standalone host passes `null` too (`start-standalone-application-host.ts:264`). `AgentRunManager` takes one factory field per runtime (`agent-run-manager.ts:46,65`), set in `general-process-run-supervisor.ts:245` and `application-execution-scope-kernel-builder.ts:141`. The design names only the studio host (`CredentialProxyHost.modelRunAccess`, composition at `agent-provider-factory-builder.ts`). Discovery needs `RuntimeModelRunAccess.routeBaseUrl` and the dsh home, but `ModelCatalogService` is a module singleton that builds its runtime catalogs with no dependencies (`model-catalog-service.ts:68-77`, `getModelCatalogService` `:363`). The design does not say how `DeepSeekHarnessModelCatalog` gets them.
- Required update:
  1. Add a `runtimeModelAccess` disposition next to `integrationRunAccess` in `createForExecution`, and the new `AgentRunManager` factory field, in every composition. List the compositions in the change inventory.
  2. State the launcher rule explicitly: a launch profile that names a model route and has no `RuntimeModelRunAccess` is refused before spawn with a named `AgentCreationError`. Never launch dsh without the pass and the proxy base URL. This is a decided rule, not a skipped step (Principle 13).
  3. State how discovery and the availability strategy reach the route base URL and the dsh home: an injected dependency, or a composition-time registration. Also state what the dsh catalog and availability report on a host with no proxy, so the application launch validator gets a clear `RUNTIME_UNAVAILABLE` reason instead of a discovery error.
- Why proportionate: the decisions are wiring and one guard. Without them a supported launch surface either fails obscurely or runs dsh on a key outside the vault.
- Recommended recipient: Solution Designer.

### AR-004 — Model-route refusals use a body dsh cannot read (Design Impact, Medium, blocking)

- Protects: AC-009 alternate outcome ("a key removed later fails the next turn with the proxy's refusal text"), REQ-009.
- Scope status: Within Approved Scope. Changes approved behavior: No.
- Evidence: the design's refusals are `{error, message}` with codes `RUN_PASS_INVALID`, `MODEL_KEY_NOT_SET`, … (Interface Boundary Mapping). dsh reads a failure message only from an object `error` field: `providerError` takes `error.message` when `envelope.error` is an object, else uses `DeepSeek Messages request failed (<status>)` (dsh `packages/llm/llm-deepseek/src/transport.ts:22-25`, used at `adapter.ts:155-166`). RT-007 showed the refusal text only because the probe answered with the Anthropic envelope (`probes/pass-forwarder.mjs:10` → `evidence/p9-wrong-pass.jsonl`: "turn failed: invalid run pass").
- Required update: specify the model route's refusal body as the Anthropic Messages error envelope (`{"type":"error","error":{"type":…,"message":…}}`, with the proxy code in the message or `error.code`). Give the status and `type` per refusal, for example `RUN_PASS_INVALID` 401 `authentication_error` and `MODEL_KEY_NOT_SET` 403 `permission_error`, and cover `UPSTREAM_UNREACHABLE` 502. Add it to the Concrete Examples.
- Why proportionate: a response-shape decision in one new file. It is the only way the approved refusal text reaches the user.
- Recommended recipient: Solution Designer.

### AR-005 — `normalizeModels` stays on the shared launch contract with one caller (Design Impact, Low)

- Protects: Principle 7/10 in a touched contract; REQ-005 (discovery has one owner per runtime).
- Evidence: the only caller is `grok-build-capability.ts:119` through `grokBuildLaunchProfile`; no shared ACP code calls it. The design keeps it on `AcpAgentLaunchProfile` and has dsh implement it "unused".
- Required update: remove `normalizeModels` from `AcpAgentLaunchProfile`; Grok's capability calls `normalizeGrokBuildModels` directly, and dsh's normalisation stays in `deepseek-harness-capability.ts`. Or justify keeping it with a shared caller.
- Recommended recipient: Solution Designer.

### AR-006 — "Runtime model route" collides with Model Routing vocabulary (Design Impact, Low)

- Protects: Principle 15 (glossary authority, `GLOSSARY.md`), BEH-009 docs.
- Evidence: the glossary defines **Model Routing** and **Model Router** (`GLOSSARY.md:238-260`), shown in the UI as Settings → Model Routing. The design introduces "runtime model route", `modelRouteId`, `grantModelRoute`, `MODEL_ROUTE_NOT_ALLOWED`, `/m/<routeId>`. The same identity file also holds dsh's own "provider route `deepseek-official`". The naming check rates the drift risk `Medium` but does not compare the term with Model Routing.
- Required update: choose a term that cannot be read as part of Model Routing, or record the distinction explicitly in the new glossary entry and in identifier names. Keep dsh's "provider route" visibly dsh's (for example `DSH_PROVIDER_ROUTE`).
- Recommended recipient: Solution Designer.

### AR-007 — The reference forwarder rewrites request bodies; the designed route does not (Design Impact, Low)

- Protects: REQ-015 / AC-015 evidence basis; cross-artifact consistency.
- Evidence: `probes/vault-forwarder.mjs:23` deletes `dsh_session_log` and `dsh_plugin_packages` from every request (`evidence/p19-*-forwarder.jsonl`: `"stripped":["dsh_plugin_packages"]`). The design names this forwarder as "Behavior the model route must match" while the route forwards bodies unchanged (`buffersRequestBody: false`). The investigation notes never mention `dsh_plugin_packages`, which dsh sends by default with the active npm package names and versions (dsh `docs/deepseek-llm-api-wire-extensions.md:41-72,160`).
- Required update: say that the route never alters bodies, and that "must match" covers key swap, streaming and the usage tap only. Record a decision on the plugin inventory field: either keep dsh's default, or disable its contributor with a home-patch row. If disabling it is a privacy choice beyond REQ-015, it is the Solution Designer's or user's decision; this review does not prescribe it. Live E2E (step 5) then runs on the pass-through route.
- Recommended recipient: Solution Designer.

## Classification

`Design Impact` (AR-001…AR-007). No `Requirement Gap`.

## Recommended Recipient

Solution Designer (`/software_engineering_team/solution_designer`).

## Residual Risks

- P-002: deliver `finished` synchronously from the tap at upstream end, with no timer or queue. Only `activity` is throttled. Otherwise the last call's usage could arrive after the turn and be dropped (`acp-agent-session.ts:195-197`, converter `usage()` `:137-139`).
- `RunPassRegistry.issue` rebuilds the holder (`run-pass-registry.ts:27-31`). Keep the launcher order integration → model access, or have `issue` preserve the model route grant, so a reopen of an agent with integrations does not lose it.
- When an agent also has integrations, its shell sees the run pass in integration URLs and could call the model route. The key stays in the server, so REQ-009 holds; DEC-012's "shells never see the pass" holds only for agents without integrations.
- Concurrent launches write the shared home patch and plugin. Write them atomically (temp file + rename).
- Discovery launches leave `AUTOBYTEUS_DSH_SKILLS_DIR` unset. The patch's `customSkillDirs: [process.env…]` should yield an empty list, not `[undefined]`.
- RSK-002/004/006 as recorded by the Solution Designer.

## Latest Authoritative Result

- Review Decision: `Fail`
- Material-Premise Gate: `Pass` (P-001 Reachable → AR-003; P-002 Not Reachable → guidance only)
- Notes: the overall approach holds: an ACP profile, standard-ACP seams, a proxy model route with observation, and an owned dsh home. The proportions are right. The blocking items are AR-001…AR-004: the reopen form, end ownership, per-composition model access and discovery wiring, and the refusal envelope. AR-005…AR-007 are small and belong in the same revision.
