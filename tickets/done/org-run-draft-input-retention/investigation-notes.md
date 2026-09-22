# Investigation Notes

## Investigation Meta

- Package identifier: `org-run-draft-input-retention`
- Request / ticket: User-reported loss of unsent Agent Org member input and context files across navigation
- Workspace root: `/Users/normy/autobyteus_org/autobyteus-worktrees/org-run-draft-input-retention`
- Repository mode: `Git`
- Task worktree / branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/org-run-draft-input-retention` / `codex/org-run-draft-input-retention`
- Resolved base remote / branch / revision: `origin/personal` / `personal` / `d883f5620a0abaed147209ad0e42a8960df70e68`
- Finalization target remote / branch: `origin` / `personal`
- Bootstrap result: Dedicated task worktree created successfully after refreshing `origin/personal`; canonical requirements and investigation artifacts initialized before deeper investigation.
- Bootstrap blocker: None
- Current solution revision ID: `SR-001`
- Investigation status: Requirements investigation complete; awaiting explicit approval before architecture design

## Initial Request And Clarifications

- Original request: The user reports that a not-yet-sent New AutoByteus Org run loses both selected context data/files and typed agent input after the user navigates to an agent in another Agent Org run, types there, and then returns. Already-sent runs reportedly do not have the problem. The user asked for analysis and is unsure whether Agent Team or standalone Agent runs have the same bug. The user recalls the regression appearing after Agent Org support was added.
- Clarifications received: Three screenshots show (1) the selected `solution designer` in the new AutoByteus Org run with an empty composer after return, (2) the same selection before departure with one context file and typed text, and (3) a selected `solution designer` in another Agent Org run.
- User-supplied facts and constraints: Sent content appears unaffected; investigate Agent Org plus possible Agent Team and standalone Agent parity; analyze rather than assume.
- Initial ambiguity and resolution: The request describes in-app navigation rather than app restart. The user subsequently clarified that draft retention is a general expectation for standalone Agent, Agent Team, and Agent Org runs, whether newly started or existing. `SR-002` therefore defines a uniform session-scoped contract and explicitly excludes cross-restart persistence and TTL changes, subject to user approval.

## Product And Domain Understanding

- Product area: AutoByteus agent execution workspaces and the shared message composer.
- Affected actors or systems: User composing an agent message; run/member selection; context-file picker; text input; Agent Org execution view store; workspace component mount/unmount lifecycle; context-file draft service.
- Existing user or operational purpose: Prepare a prompt with optional context files before sending it to a selected agent execution surface, while navigating among concurrent runs and members.
- Relevant terminology: Agent Org root/run, configured member, task agent, Agent Team member, standalone Agent, exact agent execution identity, unsent draft, context attachment, retained context, stream retirement, full context disposal.

## Source Log

| Date | Source Type | Exact Source / Command / Query | Why Consulted | Relevant Finding | Follow-Up |
| --- | --- | --- | --- | --- | --- |
| 2026-09-22 | User | Current user report and three attached screenshots | Establish reported sequence and visible evidence | A populated Agent Org composer (text + one file) appears empty after cross-Org/member navigation; sent content reportedly differs | Compare local draft and persisted history lifecycles |
| 2026-09-22 | Data | `shasum -a 256` and `sips -g pixelWidth -g pixelHeight` on the three supplied PNGs | Preserve exact evidence identity | Hashes/dimensions recorded below; screenshots are readable and consistent with the report | None |
| 2026-09-22 | Command | `git fetch origin personal`; `git worktree add -b codex/org-run-draft-input-retention ... origin/personal` | Establish isolated authoring workspace on refreshed base | Base revision `d883f5620a0abaed147209ad0e42a8960df70e68` | Continue in worktree |
| 2026-09-22 | Code | `autobyteus-web/components/agentInput/AgentUserInputTextArea.vue:176-224` | Determine text draft owner and commit timing | Every edit is synchronously written to the exact active `AgentContext.requirement` | Draft loss occurs after ownership, not because typing remained only in the DOM |
| 2026-09-22 | Code | `autobyteus-web/components/agentInput/ContextFilePathInputArea.vue:182-240`; `useContextAttachmentComposer.ts` | Determine attachment draft owner and async behavior | Attachments are committed to the exact `AgentContext`; Org draft uploads use exact root/run owner identity | Inspect whether owning context is later destroyed |
| 2026-09-22 | Code | `autobyteus-web/components/workspace/org/AgentOrgWorkspaceView.vue:140-149` | Inspect route/view departure lifecycle | On unmount and when `orgRunId` changes, the view calls `disconnectAgentOrg(previousRunId)` | Trace `disconnect` semantics |
| 2026-09-22 | Code | `autobyteus-web/stores/agentOrgContextsStore.ts:99-111` | Inspect `disconnect` semantics | `disconnect` retires the stream **and deletes** `contexts[id]`, errors, and pending focus | This is the direct state-loss boundary |
| 2026-09-22 | Code | `AgentOrgExecutionContext.adoptLocalContexts` and `agentOrgContextsStore.publish` | Determine whether refresh can retain drafts | Same-root verified refresh/recovery reuses existing `AgentContext` objects and preserves composer fields, but only while the root remains in `contexts` | Navigation disposal bypasses this retention mechanism |
| 2026-09-22 | Code | `AgentContext.ts:10-27`; Agent Org hydration services | Explain return behavior | A newly hydrated `AgentContext` initializes `requirement=''` and `contextFilePaths=[]`; server projection provides sent conversation, not unsent draft metadata | Explains why reopen is empty and sent history survives |
| 2026-09-22 | Code | `agentContextsStore.ts`; `agentTeamContextsStore.ts`; run open/selection coordinators | Compare standalone Agent and Agent Team | Their contexts remain in central maps across ordinary navigation; no workspace-view unmount hook removes them. Standalone upsert preserves composer fields on an existing context; mounted Team selection reuses the mounted context. | Treat as preserved regression surfaces |
| 2026-09-22 | Code | `runHistoryMutationActions.ts:72-78,245-294` | Find intentional release boundaries | Successful Agent Org archive/delete calls the same full `disconnect`, which is appropriate as explicit cleanup | Architecture must separate navigation retirement from destructive release |
| 2026-09-22 | Code | Frontend/server context-file owner types; `context-file-draft-cleanup-service.ts` | Identify persistence and TTL constraints | Org uploaded drafts are stored by `{orgRunId, agentRunId}`; default draft-file TTL is 24 hours | No persistence/schema/TTL change is needed for in-session fix |
| 2026-09-22 | Runtime | Temporary Vitest reproduction: open Org → set text/file descriptors → `disconnect` → reopen/inspect same Org | Prove the suspected lifecycle loss on current base | Reproduction passed: previous context was removed; reopened context was a different object with empty text/files | Probe deleted after execution; retain command/result in notes |
| 2026-09-22 | Runtime | `pnpm --dir autobyteus-web exec vitest run` for reproduction + `AgentOrgWorkspaceView`, `activeContextStore`, text composer and attachment composer suites | Verify the disposal call plus shared composer invariants | 5 files / 41 tests passed, including the reproduction and the test that expects workspace unmount to call `disconnect` | Missing regression is specifically navigation retention |
| 2026-09-22 | Runtime | Targeted Agent Org composer, attachment, retained recovery, Apollo inspection, and termination suites | Verify existing hardened invariants | 5 files / 82 tests passed; expected warning/error logs were from explicit failure-path tests | Preserve these behaviors in design and implementation |
| 2026-09-22 | Code history | `git log --follow`, `git blame`, `git show` for `AgentOrgWorkspaceView.vue` | Test the user's regression timing hypothesis | Agent Org landed 2026-09-01; unmount disposal was added in `22809caca` (2026-09-11), and cross-root disposal in `61f633abe` (2026-09-12) | Strongly consistent with regression after Agent Org feature/lifecycle hardening |

### Supplied Screenshot Identity

| File | SHA-256 | Dimensions | Observation |
| --- | --- | --- | --- |
| `ctx_68d55dcb2023__image.png` | `fd698f07f4030e1180716b43907d6d8576fbfb1951da7177653cb2f1e4d88c48` | 3024 × 1896 | New AutoByteus Org / solution designer selected; empty composer after return |
| `ctx_62d7b3dc8112__image.png` | `1282c4030b16c377a87935ebbb2c8508a698e1df85e133d0fe695bc0af515081` | 3024 × 1892 | Same member with one context file and typed message before leaving |
| `ctx_132f5fd25b04__image.png` | `8d986062fc29497695b404a54fd0a962feb7eecb5a18162f783df6a754d3c0ad` | 826 × 744 | Another Agent Org run with solution designer selected |

## Relevant Existing Behavior And Supported Product Paths

| Behavior ID | Kind | Supported Trigger Or Governing Contract | Current Supported Product Behavior Path / Lifecycle | Current Outcome / Invariants | Evidence | Confidence / Unknown |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | Select Agent Org member, compose, navigate to another root/surface, return | Composer edit → exact `AgentContext` mutation → route changes → Org view calls full disconnect → store deletes root context → return triggers inspection/hydration → new empty composer fields | Unsent state is lost; sent conversation rehydrates | Screenshots, source, passing temporary reproduction | High confidence |
| BEH-002 | Contract | Select/focus exact Agent Org member and attach/type | Root context owns map keyed by exact `agentRunId`; selection changes active target; attachment owner uses root + agent execution IDs | Same-root member isolation and async captured-owner behavior are correct | Exact-owner code and tests | High confidence |
| BEH-003 | User/System | Send, reject, recover, stop, continue | Local submission clears admitted draft, finalizes files, tracks pending identity, restores untouched failure, preserves newer edits; same-root refresh adopts local contexts; stop retains context | Hardened lifecycle behavior already exists | 82 passing targeted tests | High confidence |
| BEH-004 | User | Navigate among standalone Agent / Agent Team runs/members | Contexts remain stored in `runs` / `teams` maps; selection changes active view without unmount disposal; mounted contexts are reused | No evidence of the same navigation-loss defect | Code comparison and related tests | High confidence for same root cause; realistic cross-surface validation still required downstream |
| BEH-005 | Operational | Archive/delete run or end app session | Mutation cleanup removes retained contexts; process restart rebuilds stores; draft attachment service expires old files | These are legitimate release boundaries | Mutation and cleanup code | High confidence |
| BEH-006 | User/System | Reopen already-sent run/member | Inspection/hydration loads persisted conversation and finalized attachment descriptors | Sent messages remain visible, matching user observation | Hydration code and tests | High confidence |

## Relevant Codebase And Technical Facts

| Path / Component / Contract | Current Responsibility Or Behavior | Requirement Implication | Architecture Question / Design Implication |
| --- | --- | --- | --- |
| `components/agentInput/AgentUserInputTextArea.vue` | Writes every edit immediately to the exact active `AgentContext` and resyncs on context change | No new text draft cache is required | Preserve single authority on `AgentContext` |
| `components/agentInput/ContextFilePathInputArea.vue` + `useContextAttachmentComposer.ts` | Reads/writes attachment descriptors on exact context; captures async target | Retaining the context is sufficient for UI restoration and in-flight upload completion | Ensure retained root remains authoritative but hidden/inactive |
| `components/workspace/org/AgentOrgWorkspaceView.vue` | Couples view departure/root change to full `disconnectAgentOrg` | Ordinary navigation must not invoke destructive release | Separate route/view departure from root-context release |
| `stores/agentOrgContextsStore.ts` | Owns roots, streams, inspections, selections, operations, submissions; `disconnect` currently retires transport and erases retained state | Existing method has mixed responsibilities | Architecture must identify explicit transport-retire and release boundaries without duplicate stores |
| `services/agentOrgExecution/agentOrgExecutionContext.ts` | Owns per-agent context map and adopts same-identity local contexts during verified replacement | Existing owner can absorb retained draft behavior | Reuse this authoritative context rather than copy draft fields elsewhere |
| `types/agent/AgentContext.ts` | Co-locates server-backed state with UI/session composer state | Deleting the object necessarily deletes the draft | Retention lifetime should match supported session navigation |
| `stores/agentContextsStore.ts` | Retains standalone Agent contexts; projection upsert does not reset composer fields | Standalone behavior is comparison baseline | Preserve |
| `stores/agentTeamContextsStore.ts` | Retains mounted Team contexts across selection | Agent Team behavior is comparison baseline | Preserve |
| `stores/runHistoryMutationActions.ts` | Performs explicit local cleanup on archive/delete | Full release remains necessary | Redirect only explicit destructive callers to release owner |
| Frontend/server context-file ownership | Draft files keyed to exact owning run/member; finalize on send | No path/schema change is required | Preserve exact owner validation and TTL |

## Structural And Payload Surface Inventory

### Payload Or Content Surfaces

- Files, records, documents, catalogs, fixtures, or generated payloads: In-memory `requirement` string, in-memory `contextFilePaths` attachment descriptors, server-side draft attachment bytes, sent conversation projection.
- Existing readers, writers, or contracts that consume them: Shared composer components, active context facade, Agent Org submit path, context-file upload/finalization services, run projection hydration.
- Evidence paths: `AgentContext.ts`, shared composer components, `agentOrgContextsStore.ts`, context-file service files.

### Structural Surfaces

- Runtime modules, shared interfaces, routes, APIs, persistence boundaries, security/concurrency controls, deployment configuration, or ownership boundaries: Agent Org workspace lifecycle; Agent Org contexts/stream owner; explicit history mutation cleanup; exact attachment owner descriptor; same-root projection replacement.
- Existing structural surfaces that can support the approved behavior: `agentOrgContextsStore.contexts` already supports multiple roots keyed by `orgRunId`; `AgentOrgExecutionContext` already retains per-agent local contexts through verified refresh; standalone/team stores demonstrate session-retained contexts.
- Evidence paths: `agentOrgContextsStore.ts`, `AgentOrgExecutionContext.ts`, standalone/team context stores.

### Potential Structural Impacts To Investigate

- API or external-contract change: Confirmed absent for proposed scope.
- Persistence schema or invariant change: Confirmed absent; no migration proposed.
- Security or privacy boundary change: Existing exact identity must be preserved; the change increases lifetime of in-memory drafts but does not broaden access.
- Concurrency or lifecycle change: Present — transport retirement must no longer imply context disposal; inspection/stream/submission races must continue using one authority.
- Deployment, migration, ownership-boundary, architectural-pattern, or structural-refactoring change: Likely bounded frontend lifecycle/API split; exact extent deferred to architecture after approval.
- Confirmed absent, present, or unknown: Lifecycle/ownership impact present; other listed structural risks absent based on current evidence.

## Runtime, Probe, Or Reproduction Findings

| Method / Command | Scenario | Observation | Requirement Implication | Artifact / Evidence Path |
| --- | --- | --- | --- | --- |
| Temporary Vitest probe (deleted after run) | Open root, select `/director`, set `requirement` and one attachment, call `disconnect`, reopen/inspect | `contextFor` became `null`; reopened exact member used a different `AgentContext` with empty composer fields | Confirms `disconnect` is sufficient to reproduce reported loss | Command/result recorded in Source Log |
| Targeted Vitest run: reproduction + view/shared composer suites | View unmount/root change and exact composer ownership | 5 test files, 41 tests passed; current test suite explicitly expects unmount to call `disconnect` and shared composer exact-context behavior passes | Defect is lifecycle disposal, not text debounce or attachment targeting | Console output in current run transcript |
| Targeted Vitest run: Agent Org composer/context/recovery/inspection/termination | Submission, failure, refresh, stop, exact owner | 5 files, 82 tests passed; failure-path stderr was expected by tests | Preserve current hardened invariants while adding the missing navigation scenario | Console output in current run transcript |

## Architecture Investigation After Requirements Approval

### Approval Basis

- Approved baseline: `SR-002`.
- Approval reference: The user explicitly replied `approve` on 2026-09-22 after the session-scoped, all-run-types summary.
- Follow-up design question: The user asked whether Agent Org should be designed similarly to Agent Team.

### Additional Source And Command Log

| Date | Source Type | Exact Source / Command / Query | Why Consulted | Relevant Finding | Design Consequence |
| --- | --- | --- | --- | --- | --- |
| 2026-09-22 | Code | `AgentOrgWorkspaceView.vue:107-149` | Trace root opening and departure ownership | The view opens the selected root, but uniquely treats root change/unmount as authority to destroy store state | Remove destructive release from view navigation lifecycle |
| 2026-09-22 | Code | `agentOrgContextsStore.ts:46-176` | Separate retained-state, stream, inspection and selection responsibilities | The store already owns multiple root contexts and streams, has a private `retireStream`, preserves exact local contexts through `adoptLocalContexts`, and returns early for a retained root with a ready stream | Retain the existing root entry and live service across normal navigation; do not add a second draft store |
| 2026-09-22 | Code | `agentOrgContextsStore.ts:99-115,224-229,303-305` | Inspect destructive cleanup and pending-operation behavior | Public `disconnect` is a full release operation, including delayed disposal after submissions/operations; its name hides destructive state semantics | Rename the store boundary to an explicit release operation and reserve it for authoritative cleanup |
| 2026-09-22 | Code | `agentTeamContextsStore.ts:11-79`; `TeamWorkspaceView.vue:23-87` | Compare the user's suggested Agent Team design | Team roots remain in the central `teams` map across view unmount/selection changes; the view does not remove them; explicit cleanup uses `removeTeamContext` | Agent Org should follow the same retention/lifecycle invariant, without copying Team internals |
| 2026-09-22 | Code | `agentContextsStore.ts:19-33,71-135,147-163`; `AgentWorkspaceView.vue` | Compare standalone new/existing run behavior | Standalone new and existing contexts remain in the central `runs` map, including temporary-to-permanent promotion; view changes do not remove them | Keep standalone behavior unchanged and verify it as a regression surface |
| 2026-09-22 | Code | `runHistoryMutationActions.ts:45-105,234-294` | Identify authoritative release callers across run families | Standalone and Team archive/delete remove retained contexts only after server success; Agent Org archive/delete currently calls the same ambiguous `disconnect` used by navigation | Agent Org release should be called only from successful archive/delete and explicit test/session cleanup |
| 2026-09-22 | Code | `agentOrgStreamingService.ts:151-179,300-335`; `agentOrgExecutionContext.ts:241-253` | Determine whether retained inactive roots can remain coherent | Stream recovery publishes verified candidates into the same store owner; inactive roots mark contexts historical and retire their own stream | Keeping opened roots retained does not require a new background lifecycle or persistence mechanism |
| 2026-09-22 | Search | `rg` over all production/test references to `disconnectAgentOrg` and `agentOrgContextsStore.disconnect` | Bound blast radius and distinguish production from test cleanup | Production callers are the Agent Org view and post-success history cleanup; remaining references are focused tests/cleanup | Production delta is bounded; tests must clean-cut rename the release API |
| 2026-09-22 | Code | `AgentOrgWorkspaceView.spec.ts`; `agentOrgInspectionApollo.spec.ts`; `agentOrgComposerSubmission.spec.ts`; Agent/Team retained-state tests | Locate durable verification seams | Current view spec asserts the defective unmount disposal; store suites already prove exact identity, local-context adoption, failure recovery and async ownership | Replace the defective expectation and add navigation-specific retention/isolation coverage while preserving existing suites |

### Architecture Conclusions

- The Agent Team comparison is correct at the **lifecycle invariant** level: selecting another run changes which retained context is presented; it does not release the previous run's in-session context.
- Agent Org should not be mechanically refactored into the Team store layout. Its store deliberately co-owns strict Org inspection, stream generation, recovery and per-member context adoption. Copying or centralizing drafts elsewhere would create competing authorities.
- The narrow target is to make `agentOrgContextsStore` the sole lifecycle owner, keep an opened root and its exact member `AgentContext` objects resident for the app session, and reserve full release for archive/delete or session teardown.
- Keep the already-supported live Agent Org stream attached while its root is retained, matching existing Agent/Team session behavior. Stop/inactive transitions already retire the stream themselves; recovery already replaces server projections while adopting exact local composer objects.
- The ambiguous public name `disconnect` should be removed rather than retained as an alias. The replacement boundary should communicate full state release (proposed name: `releaseContext`). This prevents a future view from mistaking destructive cleanup for harmless transport detachment.
- No backend, schema, persisted-data migration, context-file locator, TTL, or new shared draft cache is needed.

### Remaining Uncertainty

- No requirements-level uncertainty remains.
- Implementation must confirm the final method name against local naming conventions and must run the focused streaming/submission/archive suites after the clean-cut rename. This is an implementation detail, not an unresolved architecture decision.

## Stakeholder And User Evidence

| Source / Actor | Need, Problem, Or Constraint | Evidence Strength | Requirement Implication | Open Question |
| --- | --- | --- | --- | --- |
| User report (2026-09-22) | Avoid re-entering unsent text and reattaching context after temporarily navigating elsewhere | Direct report plus before/after/navigation screenshots | Session navigation must retain exact draft | Cross-restart persistence not requested; proposed out of scope |
| User recollection | Bug appeared after Agent Org feature | Moderate subjective evidence, corroborated by git history | Focus investigation on Agent Org-specific lifecycle | Resolved: disposal hooks were introduced with later Agent Org presentation/lifecycle commits |

## External Contracts, Standards, And Dependencies

| Contract / Dependency | Version / Authority | Relevant Behavior Or Constraint | Evidence | Unknown / Risk |
| --- | --- | --- | --- | --- |
| Context-file draft owner descriptor | Current source contracts | Exact `{orgRunId, agentRunId}` ownership for Org drafts | Frontend/server types and tests | Must not be weakened |
| Draft file cleanup | Current server source | Default TTL 24 hours | `DEFAULT_DRAFT_TTL_MS` | Cross-TTL recovery out of scope |
| Agent Org run inspection/stream | Current frontend/contracts | Hydrates server-backed execution/conversation state and supports retained same-identity contexts | Context store and recovery tests | Transport/resource lifecycle must be designed carefully |

## Persisted Data And State Facts

- Affected stored or external subject: Unsent composer text; attachment-selection descriptors; uploaded draft bytes; sent message history.
- Location and representative shape: `AgentContext.requirement: string`; `AgentContext.contextFilePaths: ContextAttachment[]`; draft files under app-data `draft_context_files/agent-org-runs/<orgRunId>/agent-runs/<agentRunId>/context_files`; sent data under Agent Org memory/projection.
- Approximate volume: One string and a small descriptor array per retained agent execution, plus user-uploaded draft bytes governed by existing storage/TTL.
- Current readers and writers: Shared text/attachment composers, active context store, Agent Org submit path, context-file upload/finalization/read services, inspection/stream hydration.
- Current unknown/extra-field behavior: Not applicable; no schema transition proposed.
- Required semantics or data that must be preserved: Exact association of text and attachment descriptors with the root/member that owns them; latest local draft wins over refresh; sent conversation remains server-authoritative.
- Acceptable loss, reset, rebuild, or regeneration: Explicit archive/delete or app-session teardown; file expiry under existing TTL; not ordinary navigation.
- Privacy, retention, compliance, downtime, or operational constraints: No cross-identity visibility; no migration/downtime; no TTL change.
- Remaining evidence gap: Architecture must enumerate all resource-retirement versus release callers and bound retained-root lifetime within the session.

## Product Design Request Context

- Product Design request in the current input: `Not stated`
- User's requested outcome, in the user's own terms: Analyze why previous context data and agent input disappear and whether Agent Team or standalone Agent have the same issue.
- Requirement / behavior IDs involved: BEH-001 through BEH-006; REQ-001 through REQ-006.
- Product decision, uncertainty, or experience to understand or evolve: Retention of unfinished composer work across navigation.
- Critical journey and states: Drafting in one Agent Org member, visiting another run/member or surface, returning, and continuing the original draft.
- Known constraints and non-goals: No UI redesign; no cross-restart persistence; no TTL or backend-contract change.
- Relevant existing-product or frontend context supplied or established: Screenshots and current production paths described above.
- Product Design request artifact / message reference: N/A — no Product Design request.
- Established separate prototype repository/root and ticket reference, when applicable: N/A — not applicable.

## Product Design Findings

N/A — no Product Design request or returned Product package.

## Supplemental Artifact Inventory

| Artifact Path | Owner | Purpose | Scope | Related Requirement / AC IDs | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- | --- | --- |
| `/Users/normy/.autobyteus/server-data/memory/agent_orgs/autobyteus_org_1cf835f9b4ef4c5b82b317a150e78aeb/software_engineering_team_e8336f4ba2e74322af0333baf0f7755a/solution_designer_c43502df79274c1a98837de4d0619151/context_files/ctx_68d55dcb2023__image.png` | User | Empty-after-return screenshot evidence | Reported Agent Org scenario | REQ-001 / AC-001 | Verified/readable | Evidence only; not behavior-defining approval |
| `/Users/normy/.autobyteus/server-data/memory/agent_orgs/autobyteus_org_1cf835f9b4ef4c5b82b317a150e78aeb/software_engineering_team_e8336f4ba2e74322af0333baf0f7755a/solution_designer_c43502df79274c1a98837de4d0619151/context_files/ctx_62d7b3dc8112__image.png` | User | Populated-before-leaving screenshot evidence | Reported Agent Org scenario | REQ-001 / AC-001 | Verified/readable | Evidence only; not behavior-defining approval |
| `/Users/normy/.autobyteus/server-data/memory/agent_orgs/autobyteus_org_1cf835f9b4ef4c5b82b317a150e78aeb/software_engineering_team_e8336f4ba2e74322af0333baf0f7755a/solution_designer_c43502df79274c1a98837de4d0619151/context_files/ctx_132f5fd25b04__image.png` | User | Other-root/member selection screenshot evidence | Cross-root navigation | REQ-001, REQ-002 / AC-001 | Verified/readable | Evidence only; not behavior-defining approval |

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Why It Matters | Resolution / Owner | Status |
| --- | --- | --- | --- | --- | --- |
| ASM-001 | Assumption | Required retention is within the same application session | Defines persistence boundary | Included explicitly in SR-001 for user approval | Pending approval |
| UNK-001 | Unknown | Exact safe split between hidden-root transport retirement and full context release | Determines technical design and resource lifecycle | Solution Designer architecture investigation after approval | Open, non-blocking for approval |
| RISK-001 | Risk | Simply removing disconnect calls could leave unnecessary WebSockets/inspections active | Resource correctness | Architecture must separate transport retirement from state release | Open |
| RISK-002 | Risk | Introducing a second draft cache would create two authorities and race with same-root context adoption | Correctness/maintainability | Design should preserve one authoritative `AgentContext` owner | Open |
| RISK-003 | Risk | Existing archive/delete callers currently share `disconnect` with view departure | Cleanup behavior could regress if semantics are changed globally | Enumerate and update callers deliberately | Open |

## Architecture Investigation Findings

Not started as an authoritative design phase; explicit requirements approval is pending. Feasibility evidence shows a bounded frontend lifecycle correction is plausible without a new persistence contract. Architecture must still inspect every `disconnect` caller, stream/inspection resource ownership, retained-root bounds, same-root replacement, pending submissions, and cleanup boundaries before selecting the design.

## Requirement Implications

- The root cause is not a delayed textarea update: current code commits edits immediately and exact-context tests pass.
- The root cause is not attachment-key collision: exact Org attachment ownership exists and related tests pass.
- The supported navigation path currently invokes a full-release API whose semantics are also needed for archive/delete. The behavior requirement is therefore to distinguish ordinary navigation retention from explicit release, not to persist drafts in a new store.
- Sent content survives because it is server-backed; unsent drafts are local session state. The approved scope should remain in-session unless the user explicitly requests a broader persistence feature.
- Standalone Agent and Agent Team do not use the same unmount-disposal path. They remain in scope for regression verification, not presumed implementation changes.

## Notes For Architecture Design

After approval, map SCN-001 through SCN-006 to the existing route/view → context-store → stream/inspection → composer spines. Verify that one retained `AgentOrgExecutionContext` per root can remain the authority while transport resources are retired when hidden and reacquired on return. Preserve explicit release for archive/delete/session teardown, pending submission deferral, exact member identity, same-root context adoption, and existing attachment TTL/owner contracts. Do not create a competing draft cache or backend persistence path without a new approved requirement.
