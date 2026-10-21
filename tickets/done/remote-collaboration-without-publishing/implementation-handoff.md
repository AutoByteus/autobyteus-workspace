# Implementation Handoff — autobyteus-245 (Remote Collaboration Without Publishing)

Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/remote-collaboration-without-publishing`, branch `codex/remote-collaboration-without-publishing`; base `origin/personal` `786055f3d7` (slice 1 merged); finalization target `origin/personal`. Reviewed design commit `8755a19305` (SR-005), ARCH-REV-002 Pass at `7903753686`.

| Commit | Content |
| --- | --- |
| `41b86b5b84` | Step 1: launch base (`inherited` / `defaults_only`), `CollaboratorNoDefaultLaunchError`, `catalogTaskSourceOf` |
| `8432f2f568` | Steps 2–3, server: `NodeCatalogPort`, B's receiver through admission, codes and texts, `address`, publishing removed |
| `fbfb8dddde` | Steps 3–4, web: publish UI removed, the availability note |
| `63f6635b6d` | Step 5: docs |
| the documents commit (named in the handoff message) | This handoff, the revision record, evidence |

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: independent architecture review selected (Medium / High); ARCH-REV-002 Pass. The review sent the package here.
- Requirements doc: `tickets/in-progress/remote-collaboration-without-publishing/requirements-doc.md` (approved at SR-002/SR-003; text aligned at SR-005)
- Investigation notes: `…/investigation-notes.md`
- Solution revision record: `…/solution-revision-record.md` (SR-005)
- Design spec: `…/design-spec.md` (SR-005)
- Supplemental task artifacts: `follow-ups.md` (FU-001, sent)
- Design review report: `…/design-review-report.md` (ARCH-REV-002; N-201)
- Architecture review revision record: `…/architecture-review-revision-record.md`
- Triggering rework report: N/A (initial implementation)

## Current Implementation Summary

- Implementation cycle: `Initial`
- Implementation revision record: `…/implementation-revision-record.md`
- Current implementation revision ID: `IR-001`
- Related solution revision IDs: SR-005
- Related architecture-review revision IDs: ARCH-REV-002
- Related code-review / API/E2E / delivery revision IDs: N/A
- Triggering finding IDs: N/A

What exists now:

- **Launch base** (`collaborator-root-port.ts`): `CollaboratorRootPort.launchBase(): CollaboratorLaunchBase` replaces `rootLaunchConfiguration()`; the unread `rootKind` is gone. Standalone, Team, Org and the GraphQL empty port return `{kind: "inherited", launch}` (the empty port still throws, as before).
- **Resolver** (`collaborator-launch-resolver.ts`): `resolve(plans, base)`. `inherited` runs today's code unchanged (the `check` helper now takes the candidate context and the inherited launch separately; for `inherited` both are the run root's launch, so the batch, the order and the messages are identical). `defaults_only`: candidates take the base's workspace and auto-approve; the base's workspace is the validation context; nothing inherited is validated; an agent no configured layer covers fails with `CollaboratorNoDefaultLaunchError` (nothing complete configured) or `CollaboratorAddError` with the layer's reason. `validateMany` is skipped when there is nothing to validate (only possible under `defaults_only`).
- **Admission** (`collaborator-admission.ts`): `catalogTaskSourceOf(port, {ref, address})`; `catalogTaskSource` = `catalogDefinitionAt` + `catalogTaskSourceOf` (local callers unchanged).
- **`NodeCatalogPort`** (`collaborators/node-catalog-port.ts`): no own definition, no placements, no addresses in use, not application-bound; `launchBase()` = `{kind: "defaults_only", workspaceRootPath: <temp workspace>, autoExecuteTools: true}`. Built in `composeRemoteCollaboration` from `appConfig.getTempWorkspaceDir()` (passed by `build-studio-server.ts`).
- **Node B** (`remote-delegation-receiver.ts`): `catalogDefinitionAt` → null: `AGENT_NOT_FOUND` (detail: the address); `agent_team`: `REMOTE_TEAMS_NOT_SUPPORTED` with the Team's name from `policy.requireEligible` (N-201), no launch resolved; Agent: `catalogTaskSourceOf` → `NO_DEFAULT_RUNTIME` / `AGENT_CANNOT_RUN` with `targetName`, else `prepareAgentRun` with the resolved launch and `delegatedFrom` (a preparation failure is `AGENT_CANNOT_RUN` with the name).
- **Contract**: `StartDelegatedRunRequest.address` (was `publishedAddress`) through `RemoteRunChannel`, `RemoteDelegation`, `PeerClient`, `PeerGateway`; refusals `{accepted: false, nodeId, code, message, targetName?}`; `PeerClient` passes `targetName` to `peerRefusalText(node, code, detail, targetName)`. Codes: `AGENT_NOT_FOUND`, `REMOTE_TEAMS_NOT_SUPPORTED`, `NO_DEFAULT_RUNTIME`, `AGENT_CANNOT_RUN` (its value no longer says `PUBLISHED_`); `AGENT_NOT_PUBLISHED` removed.
- **Removed**: `published-agent.ts`, `published-agent-service.ts`, `published-agent-store.ts`, `published-launch-check.ts`; the `published`/`launchCheck` services; GraphQL `publishedAgents`, `publishAgent`, `updatePublishedAgent`, `unpublishAgent`, `PublishedAgentGql`, `PublishedAgentInput`; settings codes `AGENT_NOT_FOUND`, `AGENT_ALREADY_PUBLISHED`, `AGENT_NOT_PUBLISHED`, `LAUNCH_SETTINGS_INVALID`; web `RemoteCollaborationPublishedAgentsSection.vue`, `RemoteCollaborationPublishForm.vue`, the store's and GraphQL documents' publish parts, the `published.*` messages; publish tests. `settings-file-schema.ts` holds only the generic path helper `peer-store.ts` uses, so it stays.
- **Web**: Nodes → Remote Collaboration shows the switch, the peers and "Agents available to peers" (any shared agent; its own default runtime and model; this node's temp workspace; tool calls auto-approved; this node's local login for CLI runtimes; no default → refused). No new setting.
- **Docs**: CM-12 (and "discovery of peers' agents"), `remote_collaboration.md`, `agent_communication.md` (the `defaults_only` base), `agent_tools.md` (`node`), web `settings.md`.

## Routing Classification (Mandatory)

- Task size: `Medium`
- Architecture risk: `High`
- Design classification section / evidence reference: `design-spec.md` § Task Size And Architectural Risk
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale: one additive mode in the shared resolver, one new port, the receiver over existing owners, a contract field rename and new codes, and a mechanical removal across server, GraphQL, web, tests and docs (about 25 source files).
- Selected route: `Code Review`
- Lightweight implementation self-review completed for the direct route: `Not Applicable`
- New design impact or escalation trigger: `None`. The only reader of `rootLaunchConfiguration()` was `CollaboratorAdmission`; `rootKind` had no reader (the other `rootKind` names in the code are `DelegatedLaunchRootKind`, unrelated). The `inherited` path is byte-for-byte today's behavior (the existing resolver and catalog-copy expectations pass unchanged; see Important Assumptions on the call shape).

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-201 | No publish step; the availability note (REQ-201, REQ-207, REQ-208) | Removals above; `RemoteCollaborationCard.vue` + messages | Implemented. UI checked in a browser (IMP-06); no publish API (IMP-07) |
| BEH-202 | B resolves the catalog address with the node catalog port (REQ-201) | `RemoteDelegationReceiver.start` → `CollaboratorAdmission.catalogDefinitionAt(NodeCatalogPort, address)` → `CatalogAddressMap` / `CollaboratorCandidatePolicy` | Implemented; unknown, built-in, team-local, application-owned → `AGENT_NOT_FOUND` (unit, IMP-02; real HTTP, IMP-07). Agent Orgs are not in the collaborator catalog; the two-server E2E covers them |
| BEH-203 | The Agent's default + temp workspace + auto-approve on (REQ-202, REQ-205, REQ-206) | `catalogTaskSourceOf` → `CollaboratorLaunchResolver.resolve([plan], NodeCatalogPort.launchBase())` → `prepareAgentRun` | Implemented (unit: receiver and in-process A↔B tests assert workspace, auto-approve and runtime/model) |
| BEH-204 | `NO_DEFAULT_RUNTIME` / `AGENT_CANNOT_RUN` with reasons, before preparing (REQ-203, REQ-204) | `defaults_only` failures → receiver mapping → `peerRefusalText` on A | Implemented; texts as in the design table (unit) |

- N-201: the Team's name comes from `CollaboratorCandidatePolicy.requireEligible` (the eligibility owner), not from launch resolution.
- Changes stayed within the requirements doc's Scope Guardrail: `Yes`

## Key Files Or Areas

Server (`autobyteus-server-ts/src/`): `agent-collaboration/collaborators/{collaborator-root-port,collaborator-launch-resolver,collaborator-errors,collaborator-admission,node-catalog-port}.ts`; the four ports (`standalone-root-collaborators.ts`, `team-run-collaborators.ts`, `agent-org-run-collaborators.ts`, `api/graphql/services/collaborator-root-port-resolver.ts`); `remote-collaboration/inbound/remote-delegation-receiver.ts`, `remote-collaboration-services.ts`, `compositions/{remote-collaboration-composition,build-studio-server}.ts`; contract and texts (`remote-requests.ts`, `remote-run-channel.ts`, `remote-delegation.ts`, `peer-client.ts`, `peer-gateway.ts`, `remote-refusal-codes.ts`, `remote-refusals.ts`); `api/graphql/types/remote-collaboration-settings.ts`; `agent-collaboration/domain/agent-team-collaboration-llm-contract.ts` (two texts).

Web (`autobyteus-web/`): `components/settings/RemoteCollaborationCard.vue`, `stores/remoteCollaborationStore.ts`, `graphql/{queries,mutations}/remoteCollaboration*.ts`, `localization/messages/{en,zh-CN}/remoteCollaborationSettings.ts`, `components/applications/setup/ApplicationWorkspaceRootSelector.vue` (prop removed).

Places that deserve the reviewer's closest look:
1. `collaborator-launch-resolver.ts`: that `inherited` is unchanged, and `resolveDefaultsOnly`.
2. `remote-delegation-receiver.ts`: the order (kind first), the refusal mapping, nothing prepared on a refusal.
3. The removal: nothing else imports the removed modules (typecheck and search).

## Important Assumptions

- **"Pass without edits" (design § Guidance):** the resolver's second argument changes from a launch to a launch base, and test ports set the removed `rootLaunchConfiguration` / `rootKind`. Keeping those calls literally unedited would need a shim accepting both shapes (rejected by the design's clean cut). So the existing resolver and catalog-copy tests change only the call shape (`inheritedBase = {kind: "inherited", launch: root}`, `launchBase: () => ({kind: "inherited", launch})`); **no expectation changed** (`collaborator-launch-resolver.test.ts`, `collaborator-admission*.test.ts`, `package-auto-refresh.integration.test.ts`).
- **Team plans under `defaults_only`** (groundwork for autobyteus-247; no Team reaches it in this ticket because B refuses Teams first): members take their own default, else the Team default, else the Team fails with the rule above. When the Team default itself is unusable but every member has its own usable default, the coordinator's launch stands in as the Team's recorded `defaultLaunchConfiguration` (source `agent_default` with the Team's fallback), mirroring how today's code records the inherited launch when that layer fails. autobyteus-247 should confirm or change this.
- **`AGENT_NOT_FOUND` detail:** B sends the address it found nothing at as `message`; A's text uses it ("Node "<node>" has no Agent at <address> that can be delegated to."), since `peerRefusalText` has no other source for the address.
- **`delegate_task` agent-facing texts:** the two `node` texts in `agent-team-collaboration-llm-contract.ts` said "published"; they now say "the agent at recipient_address there" / "an agent on that node" (hash pins updated). This file is not in the design's file mapping; it was a necessary wording fix (REQ-201: no publish step).
- **Prepared-run workspace:** the resolved launch's `workspaceRootPath` is typed nullable; under `NodeCatalogPort` it is always set, so the receiver throws on a missing one (programming error) rather than inventing a fallback.

## Known Risks

- RSK-201: auto-approve is always on for remote runs (accepted by the user, trusted network).
- The two-server E2E still contains slice 1's publish cases (see below) until API/E2E replaces them.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: `Behavior Change` (simplification)
- Reviewed root-cause classification: `Duplicated Policy Or Coordination`
- Reviewed refactor decision: `Refactor Needed Now` (remote targets use the single local owners; duplicates removed)
- Implementation matched the reviewed assessment: `Yes`
- If challenged, routed as `Design Impact`: `N/A`
- Evidence / notes: `PublishedLaunchCheck` and the publish eligibility are gone; B uses `CollaboratorCandidatePolicy`, `CatalogAddressMap`, `CollaboratorEntryBuilder` and `CollaboratorLaunchResolver`.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None` (no `publishedAddress` alias; a body with it is `400`, IMP-07)
- Legacy old-behavior retained in scope: `No`
- Dead code in the touched files and modules removed: `Yes` (`rootKind`; `emptyPort.collaborators`; the `customPathHelp` prop; the publish settings codes)
- Dead code found elsewhere, added to `follow-ups.md`: None
- Shared structures remain tight: `Yes` (`CollaboratorLaunchBase` is a two-kind union; `CollaboratorNoDefaultLaunchError` subclasses `CollaboratorAddError`)
- Canonical shared design guidance was reapplied: `Yes`
- Changed source files within size guardrails: `Yes` (largest changed: `build-studio-server.ts` 405 effective lines, delta 3; largest delta: `collaborator-launch-resolver.ts` 94, 253 effective lines)

## Persisted Data Transition Check (When Applicable)

- Approved decision: `Not Affected` (`published-agents.json` never shipped; DEC-204)
- Implementation follows it: `Yes` — no code reads or writes `published-agents.json` (search; IMP-07 shows only `peers.json` written on B)
- Migration: N/A

## Environment Or Dependency Notes

- A fresh worktree needs `pnpm install`, `pnpm -C autobyteus-server-ts prebuild`, and `pnpm -C autobyteus-web exec nuxi prepare` before the web tests.
- The UI and HTTP checks used a throwaway two-node stack on temp data roots and ports (`/tmp/cn-scratch/stack.mjs`, not in the repo); it was stopped and its data removed. No user data or running AutoByteus was touched.

## Checks Run

Evidence in `tickets/in-progress/remote-collaboration-without-publishing/evidence/`. Environment: macOS (Darwin 25.5), Node v22.23.1.

| Check ID | Command Or Steps | Commit Tested | Environment | Code It Exercises | Behavior / Criteria IDs | Result | Evidence Files | Look For |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-01 | `pnpm -C autobyteus-server-ts typecheck` | `63f6635b6d` | as above | all server source; nothing imports the removed modules | REQ-208 | Pass | `IMP-01-server-typecheck.log` | `exit=0` |
| IMP-02 | `npx vitest run tests/unit/agent-collaboration/collaborators tests/unit/remote-collaboration tests/unit/agent-team-execution/agent-team-collaboration-llm-contract.test.ts tests/integration/agent-package-definitions/package-auto-refresh.integration.test.ts` | `63f6635b6d` | as above | resolver (`inherited` unchanged, new `defaults_only` tests), admission, receiver over the real admission, refusal texts, in-process A↔B, contract pins | BEH-202 … BEH-204; AC-201 … AC-205 (unit) | Pass | `IMP-02-server-focused.log` | `Test Files  22 passed (22)`, `Tests  153 passed (153)` |
| IMP-03 | `pnpm -C autobyteus-server-ts test:unit` (full) | `63f6635b6d` | as above, temp dirs | all server unit tests | AC-208 | Pass | `IMP-03-server-unit-full.excerpt.log` | `Test Files  779 passed \| 4 skipped (783)`, `Tests  6400 passed \| 7 skipped (6407)` |
| IMP-04 | web guards (`guard:web-boundary`, `guard:localization-boundary`, `audit:localization-literals`) | `63f6635b6d` | as above | web boundary and localization | REQ-207 | Pass | `IMP-04-web-guards.log` | three `Passed` lines |
| IMP-05 | `pnpm -C autobyteus-web test:nuxt` (full) | `63f6635b6d` | as above | all web code | AC-206 (unit) | Pass | `IMP-05-web-tests.excerpt.log` | `Test Files  648 passed \| 2 skipped (650)`, `Tests  4624 passed \| 5 skipped (4629)` |
| IMP-06 | Rendered Nodes → Remote Collaboration (Nuxt dev against a built node; browser) | `63f6635b6d` | Chromium via the agent browser tool | the card | AC-206 | Pass (observed) | `IMP-06-ui-tab-top.png`, `IMP-06-ui-availability-note.png` | no publish section; "Agents available to peers" with the note, styled like "Peer nodes" |
| IMP-07 | Two built nodes, real HTTP: switch on and register on B; `publishedAgents` query; `POST /rest/remote/delegated-runs` with `address` and with `publishedAddress`; B's settings folder | dist of `63f6635b6d` | temp data roots and ports | GraphQL, gateway, receiver, contract | AC-204 (unknown), AC-207, DEC-206 | Pass | `IMP-07-contract-smoke.log` | `Cannot query field "publishedAgents"`; `"code":"AGENT_NOT_FOUND","message":"/nobody_here"` HTTP 200; `REMOTE_REQUEST_INVALID` `address must be …` HTTP 400; only `peers.json` |

- Not run, and why:
  - **Step 6, the two-server E2E** (AC-201 … AC-205 with a scripted runtime, replacing the publish cases): API/E2E owns E2E authoring and execution. The current `tests/e2e/remote-collaboration/remote-delegation-two-server.e2e.test.ts` still uses publishing: RC-03 (lines ~539–563, the publish/unpublish GraphQL and `published-agents.json`), RC-04 (~566–592, "not published" and `PUBLISHED_AGENT_CANNOT_RUN`), RC-17 (unpublish), the `publishedAddress` inbound body (~443) and the `publishAgent` set-up used by later cases. Those will fail against this branch until replaced.
  - zh-CN rendering not inspected in the browser (messages present; localization guards pass).

## Frontend Rendered-Result Check (When Applicable)

- Affected surfaces / journeys: Nodes → Remote Collaboration.
- Approved references: REQ-207, AC-206, design DS-003 (note text), the credential sentence (design § Final File Responsibility Mapping, docs row).
- Existing design system / adjacent surfaces reviewed: the "Peer nodes" section card style (the note uses the same container, heading and body classes).
- Rendered surface used: `pnpm dev` of `autobyteus-web` against a built node on temp data roots and ports.
- States inspected: switch off (default), no peers; the note below the peers; no publish section or publish button.
- Issues found and corrected: none.
- Check IDs: IMP-05, IMP-06. Not inspected: narrow widths, zh-CN.

## Downstream Coverage Hints / Suggested Scenarios

- AC-201: B has a shared Agent "Publisher" with a default runtime and model (a scripted runtime); nothing published; A delegates to `/publisher`; B's `run_metadata.json` shows that runtime/model, `workspaceRootPath` = B's temp workspace, `autoExecuteTools: true` (AC-205); follow-ups as slice 1.
- AC-202: a shared Agent with no default (and one with only a runtime) → A's result "There is no default runtime configured for the target agent <name> on node "<node>"."; nothing on B or A.
- AC-203: a default naming an unavailable runtime or model → "The Agent <name> on node "<node>" cannot run there: <reason>".
- AC-204: built-in, Agent Org, team-local, unknown → "Node "<node>" has no Agent at <address> that can be delegated to."; a shared Agent Team → "<Team> on node "<node>" is an Agent Team; Agent Teams on another node are not supported yet."
- AC-207: a leftover `published-agents.json` on B is ignored.
- AC-208: the rest of the slice 1 suite (RC-01, RC-02, RC-05 … RC-16, RC-18 … RC-20) with the publish set-up replaced by agent defaults.

## API / E2E / Executable Coverage Investigation And Execution Still Required

- Step 6: replace the publish cases in the two-server E2E with AC-201 … AC-205 and run the suite (build the server first: `pnpm -C autobyteus-server-ts build`).
- AC-206 browser probe as API/E2E decides (IMP-06 is the implementation self-check).
