# Code Review Report — autobyteus-245 Remote Collaboration Without Publishing

`…` = `/Users/normy/autobyteus_org/autobyteus-worktrees/remote-collaboration-without-publishing/tickets/in-progress/remote-collaboration-without-publishing`

## Review Round Meta

- Review Entry Point: `Implementation Review`
- Requirements Doc Reviewed As Context: `…/requirements-doc.md` (approved SR-002/SR-003; text aligned SR-005)
- Investigation Notes Reviewed As Context: `…/investigation-notes.md` (as cited by the design)
- Solution Revision Record Reviewed As Context: `…/solution-revision-record.md` (SR-005)
- Design Spec Reviewed As Context: `…/design-spec.md` (SR-005)
- Supplemental Task Artifacts Reviewed As Context: `…/follow-ups.md` (FU-001, sent)
- Relevant Solution Revision IDs: SR-005
- Design Review Report Reviewed As Context: `…/design-review-report.md` (ARCH-REV-002 Pass; AR-201 … AR-204 resolved; N-201)
- Architecture Review Revision Record Reviewed As Context: `…/architecture-review-revision-record.md`
- Relevant Architecture Review Revision IDs: ARCH-REV-002
- Implementation Handoff Reviewed As Context: `…/implementation-handoff.md`
- Implementation Revision Record Reviewed As Context: `…/implementation-revision-record.md`
- Relevant Implementation Revision IDs: IR-001
- Code Review Revision Record: `…/code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-001`
- Current Review Round: 1
- Review Scope: `Full Review`
- Trigger: IR-001; commits `41b86b5b84`, `8432f2f568`, `fbfb8dddde`, `63f6635b6d`, `e5d0405aef` on base `786055f3d7`
- Prior Review Round Reviewed: N/A
- Latest Authoritative Round: 1
- Failure-origin fields: N/A

## Routing Classification Review

- Task size: `Medium`
- Architectural risk: `High` (the inter-node contract changes, a mode is added to the shared launch resolver, the security posture widens: RSK-201)
- Selected route: `Implementation Review`
- Independent source review required by the classification: `Yes`
- Classification evidence or correction required: none. About 25 source files: one additive resolver mode, one new port, the receiver over existing owners, and a mechanical removal.

## Review Scope

- Changed implementation and behavior reviewed: BEH-201 … BEH-204, all source in `786055f3d7..e5d0405aef` outside `tickets/`.
- Files / areas reviewed closely:
  - `collaborator-launch-resolver.ts`, `collaborator-root-port.ts`, `collaborator-errors.ts`, `collaborator-admission.ts`, `node-catalog-port.ts`;
  - the four port implementations;
  - `remote-delegation-receiver.ts`, `remote-collaboration-services.ts`, the compositions;
  - the contract and refusal files (`remote-requests.ts`, `remote-run-channel.ts`, `remote-delegation.ts`, `peer-client.ts`, `peer-gateway.ts`, `remote-refusal-codes.ts`, `remote-refusals.ts`);
  - the GraphQL removal;
  - the web card, messages and store;
  - the changed and new tests (`collaborator-launch-resolver*.test.ts`, `remote-delegation-receiver.test.ts`).
- Read for context: `CollaboratorCandidatePolicy` (built-in, application and shared eligibility), `AgentRunProvisioningService.resolveWorkspaceRootPath` (canonicalization), `AppConfig.getTempWorkspaceDir` (creates the folder).
- Explicit exclusions: the two-server E2E (step 6, owned by API/E2E). It still contains slice 1's publish cases and will fail on this branch until AC-201 … AC-205 replace them.

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: yes.
- Design-spec behavior map verified against the implementation: yes (DS-001, DS-002, DS-003).
- Design review report and round confirmed: ARCH-REV-002, AR-201 … AR-204, N-201.
- Behavior-basis status: `Confirmed`
- Changed or newly discovered behavior: none.
- Remaining material ambiguity: none for this ticket. The recorded Team default under `defaults_only` when the Team's own default is unusable is unreachable here (Teams are refused first) and is flagged for autobyteus-247.

| Behavior ID | Status | Implementation Path And Evidence | Notes |
| --- | --- | --- | --- |
| BEH-201 | Confirmed | Publish modules, GraphQL types and resolvers, settings codes, web sections, store parts and messages removed. A repository search finds no reader or writer of `published-agents.json`, `publishedAddress` or `AGENT_NOT_PUBLISHED` outside the slice 1 E2E file (step 6). The card shows "Agents available to peers" with the note (REQ-207). | — |
| BEH-202 | Confirmed | `RemoteDelegationReceiver.start` → `catalogDefinitionAt(NodeCatalogPort, address)`, which uses the single eligibility (`CollaboratorCandidatePolicy`: shared, non-built-in) and address owners. Null → `AGENT_NOT_FOUND` with the address. | — |
| BEH-203 | Confirmed | `catalogTaskSourceOf` → `launches.resolve([plan], {defaults_only, temp workspace, autoExecuteTools: true})` → `prepareAgentRun` with the resolved launch and `delegatedFrom`. Provisioning canonicalizes the workspace path. | — |
| BEH-204 | Confirmed | The `defaults_only` failures `CollaboratorNoDefaultLaunchError` and `CollaboratorAddError` map to `NO_DEFAULT_RUNTIME` and `AGENT_CANNOT_RUN` with `targetName`. Every refusal returns before `prepareAgentRun`. A's texts come from `peerRefusalText(node, code, detail, targetName)` and match the design's table. | — |

## Supported Product Scenario And Reachability Gate (Mandatory)

| Scenario ID | Related | Kind | Actor | Goal | Entry | Shape | Path | Outcome | Evidence | Validity | Use |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-202 | BEH-202/203 | User/System | Agent on A | Start a peer's agent | `delegate_task({node, recipient_address, description})` | Normal | DS-001 | Run prepared with the default, temp workspace, auto-approve | Requirements | Supported Normal | Use |
| SCN-203 | BEH-204 | System | Agent on A | Target without a usable default | Same | Normal (refusal) | DS-001 refusal branch | Refusal, nothing prepared | Requirements | Supported Normal | Use |
| SCN-201 | BEH-201 | Operational | Node owner | Offer agents | Nodes tab | Normal | DS-003 | Note, no publish list | Requirements | Supported Normal | Use |
| Local catalog copy (preserved) | Preserved boundary | User/System | Local delegator | `delegate_task(address)` | Same node | Normal | `catalogTaskSource` = `catalogDefinitionAt` + `catalogTaskSourceOf`, `inherited` base | Unchanged | Design § Guidance | Supported Normal | Use |

### Candidate Finding And Mechanism Gate

| Candidate ID | Observation | Scenario / Contract | Disposition | Reason |
| --- | --- | --- | --- | --- |
| C-1 | Is the `inherited` path unchanged? `check` now takes `(context, inherited)` | Design escalation trigger (byte-for-byte) | Reject (no defect) | For `inherited`, both arguments are the cloned root launch: the same candidate workspace and auto-approve, the same `validateMany` batch and order (offset 1), the same messages. The early `return null` happens only when there is no inherited launch. The existing tests change only the second argument; no `expect` string changed (diff checked). |
| C-2 | `defaults_only` Team plans record the coordinator's launch as the Team default when the Team default is unusable | No reachable scenario in this ticket (B refuses Teams before resolving a launch) | Reject here; noted for autobyteus-247 | Unreachable in 245. The design requires Team coverage in `defaults_only`, and the handoff records the choice for 247 to confirm. |
| C-3 | The receiver throws (it does not refuse) when the resolved launch has no workspace, or the source is not an Agent | Contract: `NodeCatalogPort` always gives a workspace, and the kind was decided first | Reject | Programming-error guards with no supported trigger. They invent no fallback (principle 8). |
| C-4 | `NodeCatalogPort` gets the raw temp-workspace path at composition | REQ-205 | Reject | `getTempWorkspaceDir()` creates the folder, and provisioning canonicalizes the path before use. |
| C-5 | The `agent-team-collaboration-llm-contract.ts` text change is outside the design's file mapping | REQ-201 (no publish step) | Reject | A needed wording fix ("published" was untrue); its hash pins are updated. |
| C-6 | The `customPathHelp` prop and `emptyPort.collaborators` were removed | Principle 7 | Reject (correct) | The prop's only user was the publish form; dead in touched files. |

## Structural / Design Checks

| Check | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Task design health assessment is present, evidence-backed, and preserved | Pass | Duplicated policy removed: B uses the single eligibility, address, plan and launch owners | — |
| Implementation matches approved behavior-defining supplemental artifacts | Pass | None besides the requirements; FU-001 untouched | — |
| Data-flow spine inventory clarity and preservation | Pass | DS-001 … DS-003 as designed; A's side changes only the field name | — |
| Ownership boundary preservation and clarity | Pass | `NodeCatalogPort` is the one place of the workspace and auto-approve rule; the receiver maps errors and prepares | — |
| Off-spine concern clarity | Pass | Refusal texts in `remote-refusals.ts` | — |
| Existing capability/subsystem reuse check | Pass | `CollaboratorAdmission`, the policy, `CatalogAddressMap`, the entry builder, the resolver, `prepareAgentRun` | — |
| Reusable owned structures check | Pass | `CollaboratorLaunchBase` and `CollaboratorNoDefaultLaunchError` live in the collaborators subsystem | — |
| Shared-structure/data-model tightness check | Pass | The two-kind union carries no optional fields; the error subclass is tight | — |
| Repeated coordination ownership check | Pass | `PublishedLaunchCheck` and `isPublishable` removed | — |
| Empty indirection check | Pass | `catalogTaskSource` composes the two steps; no pass-through layer | — |
| Scope-appropriate separation of concerns and file responsibility clarity | Pass | — | — |
| Ownership-driven dependency check | Pass | `remote-collaboration` → `agent-collaboration/collaborators` (admission, port): a public API | — |
| Authoritative Boundary Rule check | Pass | The receiver depends on `CollaboratorAdmission` and its `policy` (N-201, the design's choice); no internal resolver or builder bypass | — |
| File placement check | Pass | `node-catalog-port.ts` sits beside the port interface | — |
| Flat-vs-over-split layout judgment | Pass | — | — |
| Interface/API/query/command/service-method boundary clarity | Pass | `launchBase()` replaces `rootLaunchConfiguration()`; `catalogTaskSourceOf` takes an explicit ref; the contract uses `address` | — |
| Naming quality and naming-to-responsibility alignment | Pass | `NodeCatalogPort`, `defaults_only`, `NO_DEFAULT_RUNTIME` | — |
| No unjustified duplication of code / repeated structures in changed scope | Pass | — | — |
| Patch-on-patch complexity control | Pass | — | — |
| Dead code removed in the touched files and modules | Pass | `rootKind`, the publish modules, codes, GraphQL, web, `customPathHelp`, `emptyPort.collaborators` | — |
| Relevant test scenarios and assertions are clear and requirement-aligned | Pass | `collaborator-launch-resolver-defaults-only.test.ts` (no default, incomplete, unavailable runtime and model, invalid settings, Team coverage); `remote-delegation-receiver.test.ts` over the real admission (AC-201 … AC-205 at unit level) | — |
| Test fixtures/helpers are reasonably reusable and test structure remains coherent | Pass | — | — |
| No stale, duplicated, or compatibility-only tests are retained in changed scope | Pass | Publish tests removed. The E2E publish cases remain for API/E2E's step 6, as disclosed. | — |
| API/E2E readiness for the next workflow stage | Pass | IMP-07 shows the contract over real HTTP. Step 6 (E2E authoring) is API/E2E's, with pointers in the handoff. | — |

## Source File Size And Structure Audit

| Source File | Before | After | `>500` | `>220` Delta | SoC | Placement | Classification | Action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `compositions/build-studio-server.ts` | 406 | 405 | Pass | Pass | Pass | Pass | — | — |
| `collaborators/collaborator-launch-resolver.ts` | 189 | 253 | Pass | Pass | Pass | Pass | — | — |
| `collaborators/collaborator-admission.ts` | 182 | 193 | Pass | Pass | Pass | Pass | — | — |
| `remote-collaboration/inbound/remote-delegation-receiver.ts` | — | 75 lines | Pass | Pass | Pass | Pass | — | — |
| `collaborators/node-catalog-port.ts` (new) | 0 | 24 lines | Pass | Pass | Pass | Pass | — | — |

## Legacy / Backward-Compatibility Verdict

| Check | Result | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms in changed scope | Pass | No `publishedAddress` alias; a body with it gets 400 (IMP-07) |
| No legacy old-behavior retention in changed scope | Pass | — |
| Dead code removed in the touched files and modules | Pass | — |
| Approved persisted-data transition decision is followed | Pass | `Not Affected` (DEC-204): `published-agents.json` is neither read nor written |
| No version-specific dual reads/writes or request-time old-shape fallback | Pass | — |
| Approved transition mechanics match the reviewed design | Pass | No migration |

## Dead / Obsolete / Legacy Items Requiring Removal

None remaining in source. The slice 1 E2E publish cases are API/E2E's step 6.

## Docs-Impact Verdict

- Docs impact: `Yes`, done in `63f6635b6d`: CM-12, `remote_collaboration.md` (including the local-login credential sentence), `agent_communication.md` (the `defaults_only` base), `agent_tools.md`, and the web `settings.md`.

## Additional Material Premise Validation

None new. MP-201 is resolved by AR-201, as confirmed in code: the kind is decided first and a Team never reaches launch resolution.

## Review Scorecard (Mandatory)

- Overall score (`/10`): 9.4
- Overall score (`/100`): 94

| Priority | Category | Score | Why | Weak | Improve |
| --- | --- | --- | --- | --- | --- |
| 1 | Data-Flow Spine Inventory and Clarity | 9.5 | DS-001 and DS-002 are readable; B resolves exactly as a local copy | — | — |
| 2 | Ownership Clarity and Boundary Encapsulation | 9.5 | Duplicates removed; one rule place (`NodeCatalogPort`) | — | — |
| 3 | API / Interface / Query / Command Clarity | 9.4 | `launchBase()`, `catalogTaskSourceOf`, `address`, `targetName` | — | — |
| 4 | Separation of Concerns and File Placement | 9.4 | — | `resolveDefaultsOnly` carries Team groundwork that is unreachable in 245 | 247 confirms it |
| 5 | Shared-Structure / Data-Model Tightness | 9.5 | A tight union and error subclass | — | — |
| 6 | Naming Quality and Local Readability | 9.2 | Clear names | The resolver's class comment is one long sentence | — |
| 7 | API/E2E Readiness | 9.2 | Unit-level AC-201 … AC-205 and a real-HTTP contract smoke | The two-server E2E needs its publish cases replaced first (step 6) | API/E2E |
| 8 | Runtime Correctness And Behavioral Fidelity | 9.4 | The `inherited` path is equivalent; refusals come before preparation; the workspace is canonicalized | — | — |
| 9 | No Backward-Compatibility / No Legacy Retention | 9.8 | Clean cut | — | — |
| 10 | Cleanup Completeness | 9.5 | Search is clean | — | — |

## Findings

None.

## Follow-ups

- Follow-ups this review added: None.

## Classification

N/A (Pass).

## Recommended Recipient

- API/E2E Engineer (`/software_engineering_team/api_e2e_engineer`); informational notice to the Implementation Engineer.

## Residual Risks

- RSK-201: auto-approve is always on for remote runs. The user accepted this for the trusted network.
- Every shared Agent is startable by registered peers while the switch is on, and CLI runtimes use this node's local login. This is documented in the tab note and module docs (QR-201).
- The Team `defaults_only` default recording (C-2) is for autobyteus-247 to confirm.

## Latest Authoritative Result

- Review Decision: `Pass`
- Review Entry Point: `Implementation Review`
- Supported Product Scenario Gate: `Pass`
- Material-Premise Gate: `Pass`
- Score Summary: 9.4 / 10; every category is at least 9.0.
- Failure Origin: N/A
- Recommended Recipient: `/software_engineering_team/api_e2e_engineer`
- Notes: Classification `Medium` / `High`, unchanged. Reviewed commit `e5d0405aef`. API/E2E must first replace the slice 1 publish cases in `remote-delegation-two-server.e2e.test.ts` (RC-03, RC-04, RC-17, the `publishedAddress` probe body, the `publishAgent` set-up) with AC-201 … AC-205, then run the suite on a rebuilt dist.
