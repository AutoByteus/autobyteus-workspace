# Implementation Handoff — agent-initiated-collaborators

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: Large / High → independent architecture review was
  selected and passed (ARCH-REV-003); this handoff goes to `/software_engineering_team/code_reviewer`
  (source review), as returned by `get_handoff_rules`.
- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-initiated-collaborators/tickets/in-progress/agent-initiated-collaborators/requirements-doc.md` (Approved, SR-005)
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-initiated-collaborators/tickets/in-progress/agent-initiated-collaborators/investigation-notes.md`
- Solution revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-initiated-collaborators/tickets/in-progress/agent-initiated-collaborators/solution-revision-record.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-initiated-collaborators/tickets/in-progress/agent-initiated-collaborators/design-spec.md` (SR-005)
- Supplemental task artifacts: none new. Reused predecessor UI spec (VIS-001–015):
  `/Users/normy/autobyteus_org/autobyteus-web-prototype/tickets/done/cross-scope-agent-mentions-sr008/ui-ux-spec.md`
- Design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-initiated-collaborators/tickets/in-progress/agent-initiated-collaborators/design-review-report.md` (ARCH-REV-003 Pass)
- Architecture review revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-initiated-collaborators/tickets/in-progress/agent-initiated-collaborators/architecture-review-revision-record.md`
- Triggering rework report: N/A (initial implementation).

## Current Implementation Summary

- Implementation cycle: `Rework` (IR-003, after DI-01 → SR-007 / ARCH-REV-005; IR-002 after API-REV-001 → CRR-002/CRR-003 → SR-006 / ARCH-REV-004)
- Implementation revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-initiated-collaborators/tickets/in-progress/agent-initiated-collaborators/implementation-revision-record.md`
- Current implementation revision ID: `IR-003` (delta over `IR-002`)
- Related solution revision IDs: `SR-005`, `SR-006`, `SR-007`
- Related architecture-review revision IDs: `ARCH-REV-003`, `ARCH-REV-004`, `ARCH-REV-005`
- Related code-review revision IDs: `CRR-001` (Pass), `CRR-002` (failure origin), `CRR-003` (CR-001 → Design Impact), `CRR-004` (Pass), DI-01
- Related API/E2E revision IDs: `API-REV-001` (Fail: F-01, F-02)
- Related delivery revision IDs: `N/A`
- Triggering finding IDs: `DI-01` (REQ-012/AC-013 via SR-007); earlier `CR-001`, `CR-002`
- Branch `codex/agent-initiated-collaborators`, base `origin/personal` @ `84224a58d`; IR-001 commit `549510977`; IR-002 commit `9b594693b`.

IR-003 delta (DI-01 / REQ-012 per SR-007 § Copy Placement By Address): see the revision record. In short:
- **One owner for copy placement:** `agent-collaboration/execution/task/task-copy-host.ts#resolveTaskCopyHost` (pure,
  over the index's `teamInstancesOf`). Host = the delegator's deepest containing Team instance whose address is the
  copy's parent; otherwise the root.
- Org and Agent-root adapters use it instead of `requireAgent(delegator).host`; the Team adapter uses it at activation
  and at the commit re-check (root placement = the root TeamRun); `team-execution-scope-resolver.ts` removed.
- Restore paths unchanged; stored copies keep their recorded host (`Directly Usable — No Migration`). Web unchanged:
  root-hosted copies already render top-level with "Started by" in the accessible label only.

IR-002 delta (CR-001 per SR-006 § Member Collaboration Scope; CR-002):
- **One owner for member scope:** `agent-collaboration/execution/domain/member-instance-scope.ts#resolveMemberCollaborationScope`
  (pure). Rules: (1) a direct member of its non-root hosting Team instance gets that instance's handoffs and Team
  instruction; (2) a root-level configured placement (or a copy at its address) gets the root's; (3) anything else gets
  none (a catalog Agent copy in a Team root gets no root-Team instruction). The hosting TeamRun's own context reaches
  it as the optional `hostTeam` of `FlatTeamExecutionCallbacks.buildMemberExecutionContext`
  (`FlatTeamAgentExecutionHandle` passes it; root-hosted Agents have none), at construction and restore.
- **Per-root special cases removed:** `collaboratorMemberScope`, the `scope` override and `resolveMemberScope`
  (Team root); `agentOrgHandoffs` and the `resolveFreshInstruction` branching (Org root, now one
  `resolveInstruction(definition)`); `collaboratorOf` (Agent root). `teamScoped` unchanged.
- **CR-002:** Team-root rows and agent contexts format collaborator **and catalog copy** addresses (and members) with
  `memberDisplayName` (`readsAsDisplayName` in `teamExecutionTreeSelectors.ts`, used by `projectNavigationRows` and
  `teamExecutionContextFactory.ts`).

What the change does:
- **`list_available_agents`** (opt-in, REQ-001/002): a registry tool (Agent Communication category, so it shows in
  the tool picker), exposed only when the definition selects it, on AutoByteus (bound local tool) and on every MCP
  runtime (Agent Tools MCP adapter). Returns `{agents:[{name, kind, address, description}]}` from
  `Root.listAvailableAgents(sender)`; read-only.
- **`CatalogAddressMap`** (REQ-003): pure, deterministic; plain segment if unique among the eligible catalog and not
  in use, else `<segment>_<6 hex of sha256(definitionId)>` for every colliding definition; in-run definitions keep
  their in-run address. Replaces the first-free allocator for `@` too. No stale/binding machinery.
- **Admission split (R-1)**: `CollaboratorAdmission.ensure` (renamed from `CollaboratorMentionAdmission.admit`); the
  `@` note is composed at the four `@` call sites.
- **`MessageRecipientResolution` (R-3)**: shared, ordered — sender's own team instance (deepest first, no
  fall-through, AR-003) → run-wide → catalog bring-in under the held gate → resolve again. Index ports in all three
  roots. Failure → `COLLABORATOR_ADD_FAILED` with the reason.
- **Catalog delegation**: configured → collaborator → catalog (plus a teammate inside the sender's own catalog Team
  copy, from that copy's snapshot). Copies persist an optional `source` (`TaskExecutionSource`); activation and
  restore read it first. No collaborator entry is created (Q-1).
- **Team root**: message/delegation addressing extracted to `services/team-run-message-delivery.ts`;
  `root-team-run.ts` shrank 495 → 447 non-empty lines.
- **REQ-009 wording** in the shared prompt, standalone instruction, both tool descriptions, the mention-note guidance
  line and the new tool's description (one module per text, identical on every runtime).
- **Web**: task-copy DTOs carry `source`; selectors read a catalog copy's (and its members') source; Team rows use
  `source.coordinator_address`. Server member projections (Team, Org, Agent root) resolve a catalog copy's
  definition from its recorded `source` (`catalogCopyExecutionSource`).

## Routing Classification (Mandatory)

- Task size: `Large`
- Architecture risk: `High`
- Design classification section / evidence reference: design-spec.md § Task Size And Architectural Risk.
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale: shared tool-contract meaning changed (send_message_to can create); persisted record shape
  extended (optional `source`); Org behavior change (REQ-007); concurrency inside delivery. Implementation found one
  additional concurrency fact (below) that keeps the risk High.
- Selected route: `Code Review`
- Lightweight implementation self-review completed for the direct route: `Not Applicable`
- New design impact or escalation trigger: `None` (the gate-re-entry trigger did not fire; see the concurrency note
  under Important Assumptions — handled locally, flagged for review).

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001 | REQ-001/002 list tool | `agent-tools/agent-discovery/list-available-agents-{contract,tool}.ts`; `agent-tools/mcp/providers/list-available-agents-mcp-adapter-provider.ts`; `MemberCollaborationContext.listAvailableAgents` wired in Team/Org/Agent context builders; `Root.listAvailableAgents` → `*Collaborators.listAvailable` → `CollaboratorCandidatePolicy.listEligible`; exposure flag `listAvailableAgentsEnabled`; Claude tooling options; AutoByteus resolver; startup loader unit `agent_discovery` | Implemented; read-only (no gate, no write). App-owned/helper runs have no lister → tool skipped |
| BEH-002 | REQ-003 addresses | `agent-collaboration/collaborators/catalog-address-map.ts`; policy `catalogAddressMap`; admission plans with `addressFor` | Implemented; allocator removed |
| BEH-003 | REQ-004/010 bring-in | `message-recipient-resolution.ts` step 3 → `*Collaborators.bringInAt` (queued) → `CollaboratorAdmission.ensure` → re-resolve; Team `team-run-message-delivery.ts`, Org `agent-org-recipient-resolver.ts`, Agent `agent-run-collaboration-recipient-resolver.ts` | Implemented; `addedViaAgentRunId` = sender; `@` reuses (AC-010) |
| BEH-004 | REQ-005 catalog copies | `catalog-delegation.ts`; `CollaboratorAdmission.catalogTaskSource`; adapters (Team/Org/Agent) prepare from `placement.source` and persist it; task source resolvers read the record's `source` first; schema `task-execution-source-schema.ts`; invariants validate a catalog copy against its own source | Implemented; Agent-root first catalog copy creates the package (AC-008) |
| BEH-005 | REQ-007 one unit | `resolveInRunRecipient` step 1 + index ports `teamInstancesOf` / `memberOfInstance` in `team-execution-index.ts`, `agent-org-execution-index.ts`, `agent-run-collaboration-execution-index.ts` | Implemented; AR-003 no fall-through; Org copy of a mounted Team reaches its own members (approved behavior change) |
| BEH-006 | REQ-006/008 anyone, all roots | Same shared helpers in the three roots; no permission check beyond existing sender authorization | Implemented |
| BEH-007 | REQ-009 wording | `agent-team-collaboration-llm-contract.ts`, `standalone-collaboration-instruction.ts`, `collaborator-mention-note.ts` (guidance line; parser also accepts the released line so saved history reads unchanged), new tool description | Implemented; pinned hashes and snapshot updated |
| BEH-008 | REQ-011 UI | Contracts `source` on task DTOs (team + collaboration); `team-execution-view-projector.ts`; web `agentSourceSelectors.ts` (`teamCatalogAgentSourceAt`, `catalogAgentSourceAt`, `catalogTeamSourceAt`), Org/Agent view indexes, Org history rows, Team rows; server read side: `catalogCopyExecutionSource` in the Team, Org and Agent-root member projection services and the Agent-root location service | Implemented; render check found the read-side gap (child projections failed for catalog copies, so the web view dropped them) — fixed and re-verified live |
| BEH-009 | AC-012 preserved | `@` path, configured messaging, Org configured handoffs, delegated-copy lifecycle, history | Preserved; regression tests updated/passing |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`

## Key Files Or Areas

Server (new): `agent-collaboration/collaborators/{catalog-address-map,catalog-delegation,message-recipient-resolution,collaborator-admission-queue}.ts`,
`agent-team-execution/services/team-run-message-delivery.ts`, `agent-tools/agent-discovery/*`,
`agent-tools/mcp/providers/list-available-agents-mcp-adapter-provider.ts`, `run-history/store/task-execution-source-schema.ts`.
Server (renamed/removed): `collaborator-mention-admission.ts` → `collaborator-admission.ts`; `collaborator-address-allocator.ts` removed.
Server (changed): candidate policy, root port (`rootDefinition`, `inRunPlacementsByDefinition`), three `*Collaborators`
services, three indexes, three roots, three recipient resolvers, three task source resolvers and adapters, Agent-root
persistence coordinator, member context builders, exposure/MCP/Claude/AutoByteus/loader, stream handlers and command
coordinator (note at `@` call sites), shared records, schemas, Team view projector, docs (5 module docs).
Contracts: `autobyteus-team-stream-contracts`, `autobyteus-collaboration-stream-contracts`, `autobyteus-agent-presentation-contracts` (src + dist).
Web: `services/collaborators/agentSourceSelectors.ts`, Org/Agent view indexes, Org execution context, Org history rows, Team tree selectors.

## Important Assumptions

- **Concurrency (design premise corrected locally, please review).** The design says two concurrent first messages
  "serialize on the gate". In code the root gates (`RootTeamRunMaterializationGate`, `RootOperationGate`) are
  admission/drain barriers, not mutexes: they let operations run concurrently. Without serialization the second
  first message failed with `COLLABORATOR_ADD_FAILED` ("Duplicate collaborator address"). Fix, without gate
  re-entry and without new ownership: a per-root `CollaboratorAdmissionQueue` (promise chain) inside each
  `*Collaborators` service serializes `ensure` (for `@` and bring-in alike), and the catalog step is one queued
  operation (`bringInAt(address)`) that re-reads the catalog map against the current tree, so the second message
  finds the instance (`null` → resolve again). Tested in all three roots ("two concurrent first messages produce one
  instance"). I classified this as an implementation-level correction (the specified behavior is unchanged); if the
  reviewer considers it design-owned, route it as Design Impact.
- **Delegation inside a catalog Team copy.** A teammate address inside the sender's own catalog Team copy has no
  configured or collaborator source, so the placement is taken from that copy's snapshot (`source.members`) and
  persisted as the new copy's `source`. Without this, a catalog Team copy could not delegate to its own teammates the
  way configured/collaborator copies can (REQ-007 "one unit", existing delegation behavior).
- **Catalog delegation runnability.** A catalog copy is checked with the same runnability validator as a new
  collaborator before it starts; a failure returns the reason as `{target_agent_run_id:null, message}`.
- **Org root has no own definition** for exclusion (Orgs are never candidates); the Team root excludes its team
  definition, the Agent root its host definition.
- **Note guidance line.** The `@` note guidance changed for REQ-009; the shared parser also accepts the released
  guidance line, so existing history renders its notes unchanged (preserved behavior), with no write of the old line.
- C-15 (inert `hasTaskExecutionAt` in the GraphQL `emptyPort`) is removed with this port change. C-11 (no Agent-root
  self-delegation guard) is unchanged (out of scope).

## Known Risks

- AGY and ACP exposure of `list_available_agents` goes through the same Agent Tools MCP catalog as Codex/Claude
  (`isAvailable` on the sender's member context) but is **not verified live** on those runtimes.
- Admission inside delivery lengthens the first message to a catalog address by one tree write (once per collaborator).
- REQ-007 changes Org behavior for copies of mounted Teams (user-approved, documented in `agent_orgs.md`).
- Downgrade: an older build ignores `source`, so restoring a catalog copy there fails with
  `TASK_EXECUTION_CONTEXT_UNAVAILABLE` (unsupported, as designed).

## Task Design Health Assessment Implementation Check

- Reviewed change posture: `Larger Requirement`
- Reviewed root-cause classification: `Missing Invariant` + `Duplicated Policy Or Coordination`
- Reviewed refactor decision: `Refactor Needed Now` (R-1, R-2, R-3); D-1/D-2 deferred
- Implementation matched the reviewed assessment: `Yes` (R-1 admission split, R-2 address map, R-3 shared resolver +
  `team-run-message-delivery.ts`; D-1/D-2 untouched)
- If challenged, routed as `Design Impact`: `N/A` (the concurrency note above is flagged for review)
- Evidence / notes: per-root resolver classes now delegate to the shared helpers; the three indexes implement one
  `MessageRecipientIndexPort`; the three placement types are one `DelegationPlacement`.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None` (the mention-note parser accepting the released guidance line
  is a version-agnostic reader of persisted history, required by "existing history opens unchanged"; nothing writes
  the old line)
- Legacy old-behavior retained in scope: `No`
- Dead/obsolete code removed: `Yes` (`collaborator-address-allocator.ts`, `admit`, `configuredDefinitionIds`,
  per-root sync `resolveMessageRecipient`/`resolveDelegationPlacement` on the roots, old not-found wording, C-15)
- Shared structures remain tight: `Yes` (`source` only on catalog copies; one placement type)
- Canonical shared design guidance reapplied: `Yes`
- Changed source files within size guardrails: `Yes` — largest changed: `agent-org-run.ts` 480 (unchanged net),
  `agent-run-collaboration-root.ts` 471, `root-team-run.ts` 447; largest delta 166 (`collaborator-admission.ts`).
- Notes: none.

## Persisted Data Transition Check (When Applicable)

- Approved decision: `Directly Usable — No Migration`
- Design-spec decision reference: design-spec.md § Persisted Data / State Transition Decision
- Implementation follows the approved decision: `Yes` — optional `source` parse, exact write; absence means the
  configured/collaborator source (every existing record).
- Direct-use evidence: `task-execution-source-schema.test.ts` (legacy record without `source` reads unchanged; present
  `source` projected exactly; malformed rejected); restore-from-source tests in Team and Agent roots.
- Deviation: `None`

## Environment Or Dependency Notes

- `pnpm install --frozen-lockfile`, `pnpm prepare:shared` (creates untracked SDK `dist/` folders, removed before
  commit) and `prisma generate` in the worktree. Contract `dist/` folders rebuilt and committed.
- A clean base worktree (`aic-base-baseline`, detached at `84224a58d`) was used only for test baselines and removed
  afterwards.

## Local Implementation Checks Run

IR-003 (REQ-012): typecheck clean; new `task-copy-host.test.ts`; Org tests (mounted member's catalog `/product_team`
copy and `/code_reviewer` copies → `rootOrg.taskExecutions` with the delegator; teammate `/target/writer` copy stays
under `/target`; `/director` copy from inside the mounted Team → root; persisted tree matches); Agent root (copy
member's `/code_reviewer` → root with delegator, its teammate copy stays in the copy; a collaborator-Team member's
`/code_reviewer` copy → root; a copy stored under the Team by the earlier rule restores in place under that Team);
Team root regression unchanged (`team-root-collaborators.test.ts`). Server full suite 4962 tests and web 3464 tests,
**0 new failures** vs base.

IR-002 (after the CR-001/CR-002 changes):
- Server typecheck clean; `--noUnusedLocals` clean in touched files.
- Server full suite: 4953 tests, 171 failed — **0 new failures** vs the base baseline (the run includes API/E2E's
  uncommitted durable tests in the worktree).
- Web full suite: 3464 tests, the same 4 base-failing files — **0 new failures**.
- New/updated tests: `member-instance-scope.test.ts` (rules 1–3); `agent-org-member-scope.test.ts` (mounted Team
  member keeps cross-placement Org handoffs + Team instruction (AC-012), configured direct Agent keeps the Org's,
  catalog Team copy member gets its own, catalog Agent copy none); Team root (catalog copy lead gets own handoffs +
  "Ship the product UI." and keeps them after Stop → reopen → message; catalog Agent copy gets no root-Team
  instruction); Agent root (copy members own scope, catalog Agent copy hosted by the copy gets none, restored copy
  members keep their scope); web `agentSourceSelectors.spec.ts` (catalog copy row `product team`, members
  `product prototyper` / `prototype bootstrapper`); `org-owned-team-local-agent.test.ts` passes `hostTeam`.

IR-001:

Evidence logs/JSON were kept under `/tmp/aic-baseline/` during the session; results:

- Server typecheck `npx tsc -p tsconfig.build.json --noEmit`: clean. `--noUnusedLocals` over changed files: clean
  (two pre-existing base findings in untouched code left as is).
- Server full suite (`npx vitest run`) vs a clean base baseline from a detached `84224a58d` worktree
  (base: 4886 tests, 181 failed in 65 files, all environmental/pre-existing): implementation run after the last
  change: 4927 tests, 4549 passed, 172 failed, 206 skipped — **0 new failures** (every failure also fails on
  base; 9 base failures pass here).
- New/updated server tests (all passing): `catalog-address-map.test.ts`, `message-recipient-resolution.test.ts`
  (incl. catalog delegation), `collaborator-admission.test.ts` (renamed; `ensure`, `listEligible`, `catalogTaskSource`),
  `catalog-copy-execution-source.test.ts`, `team-root-agent-initiated-collaborators.test.ts` (list without write,
  first-message bring-in, concurrent firsts → one instance, failure writes nothing, run ID/unknown address create
  nothing, three parallel catalog copies with `source`, no fall-through, restore from `source` after Stop/reopen,
  AC-006), `agent-org-agent-initiated-collaborators.test.ts` (REQ-007 Org behavior change, configured handoff
  unchanged, bring-in/concurrency, failure, catalog copies under mounted Team), Agent-root additions in
  `agent-run-collaboration-root.test.ts` (AR-005 no package on list, package on first bring-in, concurrency, AC-010,
  copies one unit, copy member delegates, restore after Stop), `list-available-agents-tool.test.ts` (registry,
  opt-in exposure, AutoByteus binding, MCP availability/execute, Claude options), `task-execution-source-schema.test.ts`,
  wording pins/snapshot (`agent-team-collaboration-llm-contract`, `member-collaboration-instruction-provider-parity`,
  `carpenter-prompt-composer` snapshot, `task-delegation-runtime-descriptions`), loader/architecture unit lists.
- Web full suite (`NUXT_TEST=true npx vitest run`): 3464 tests, 4 failing files — identical to the base baseline
  (no new failures); new cases in `agentSourceSelectors.spec.ts` (Team view applies a sourced task-team copy; Org
  index resolves catalog copies and members). Web `tsc` over `.nuxt/tsconfig.json`: no errors in changed source files.
- Contracts: `autobyteus-agent-presentation-contracts` 7/7 (incl. released-guidance parse), `autobyteus-team-stream-contracts`
  5/5, `autobyteus-collaboration-stream-contracts` 5 pass / 7 fail — the same 7 fail on base.

## Frontend Rendered-Result Check (When Applicable)

IR-002 (CR-002): live Team root on the worktree `pnpm dev` stack with Claude `haiku` (`implementation-evidence/render-check-aic-team.mjs`,
`render-check-aic-team/`): a one-member "PM Team" whose coordinator is the Project Manager called
`list_available_agents`, `send_message_to` (`/code_reviewer` brought in) and `delegate_task` ×2. Rows read
"code reviewer", "product team", "product team"; expanded copy members read "product prototyper" and "prototype
bootstrapper"; no raw segments; no page errors. Stack stopped. Copy members' handoffs/instructions (CR-001) were
verified by tests; API/E2E rechecks LE-A2, LE-T1 and LE-O1 live.

IR-001:

- Affected surfaces / journeys: standalone run rows (collaborator + task-team copies), copy members' conversations,
  the brought-in collaborator's conversation ("From <Sender>:"), the Team tab, the tool picker.
- Approved references: predecessor VIS-001–015 (`…/cross-scope-agent-mentions-sr008/ui-ux-spec.md`); REQ-011.
- Existing design system reviewed: reused rows/tabs unchanged (no new components).
- Surface used: the worktree's own `pnpm dev` stack (backend 127.0.0.1:8000, web 127.0.0.1:3000, data under
  `<worktree>/.autobyteus/development`); Chrome via playwright-core; real Claude Agent SDK (`haiku`); stopped afterwards.
- Script and evidence: `implementation-evidence/render-check-aic.mjs`, `implementation-evidence/render-check-aic/`
  (`render-check-report.json`, T1, A1–A4 screenshots).
- States inspected: live run (Idle/Running children), expanded copy rows, copy coordinator view, collaborator view,
  stopped run reopened from history (stored package).
- Result: the PM (only `list_available_agents` selected) called `list_available_agents`, `send_message_to`
  (`/code_reviewer` brought in, `addedViaAgentRunId` = PM) and `delegate_task` ×2 (`/product_team` copies with
  `source`, no collaborator), all on Claude through Agent Tools MCP. Rows show "code reviewer" and two "product
  team" task-team rows with members, "Started by project manager"; the reviewer's conversation starts "From Project
  Manager:"; the PM shows "From Code Reviewer:"; Team tab lists both messages; the tool picker lists
  `list_available_agents` (Agent Communication) and shows it selected. No page errors.
- Issue found and corrected: the first pass showed only the reviewer — child projections failed for catalog copies
  (server member-projection services only knew configured/collaborator sources). Fixed with
  `catalogCopyExecutionSource`; the stopped first run and the second live run both render all rows.
- Limitations: Team-root and Org-root UIs were exercised by unit tests (sourced `TASK_EXECUTION_STARTED`, Org index)
  rather than a live run; AGY/ACP not exercised; the copies' own LLM work content is not part of the check.

## Downstream Coverage Hints / Suggested Scenarios

- Live: a standalone PM on Codex/AGY with `list_available_agents` lists, messages a listed team (SC-001) and delegates
  three copies (SC-002); verify the tool is absent when not selected.
- Org: a delegated copy of a mounted Team follows its own handoffs (SC-003); configured Org handoffs unchanged.
- SC-004: a listed team that cannot run with the run's settings returns the reason, nothing added.
- SC-005: user `@` of a team the PM already brought in reuses it.
- Stop/reopen of a run with catalog copies; Agent-root run whose first write is a catalog copy (package + history flag).

## API / E2E / Executable Coverage Investigation And Execution Still Required

API/E2E sign-off is owned by `api_e2e_engineer`: live runtime exposure (especially AGY/ACP), multi-run journeys,
and the Org behavior change in a real Org run.
