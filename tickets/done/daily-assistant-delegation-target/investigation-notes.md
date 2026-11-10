# Investigation Notes

## Investigation Meta

- Package identifier: `daily-assistant-delegation-target`
- Request / ticket: Project Task `autobyteus-455` (Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`)
- Workspace root: `/Users/normy/autobyteus_org/autobyteus-worktrees/daily-assistant-delegation-target`
- Repository mode: `Git`
- Task worktree / branch: same path / `codex/daily-assistant-delegation-target`
- Resolved base remote / branch / revision: `origin/personal` @ `310fc27452be3d3f44459c89f59c70d8ff40ea02` (fetched 2026-11-10 05:5x CET)
- Finalization target remote / branch: `origin` / `personal` (RELEASE.md)
- Bootstrap result: worktree created from freshly fetched `origin/personal`; `pnpm install --frozen-lockfile --prefer-offline` succeeded
- Bootstrap blocker: None
- Current solution revision ID: `SR-001`
- Authorities read (requirements reading gate; file and date): `references/requirements-engineering.md`, `references/ticket-scope.md`, `references/finding-the-cause.md` (2026-11-10). Architecture gate: see design-spec.md.
- Investigation status: Complete for requirements and architecture

## Initial Request And Clarifications

- Original request: Task autobyteus-455 (summary): the Project Task Manager's `delegate_task` to `/daily_assistant` was refused ("not the address of an available agent or agent team"); the Daily Assistant is in no `list_available_agents` list (local node, docker-8001, docker-8003), while other agents are. Find out why; if it is an accident fix it; if it is a rule, the user thinks it is wrong for the Daily Assistant: make it addressable while keeping the loop/self-delegation guard; the Model Router stays internal unless the user says otherwise.
- Clarifications received: PM relay of the user's words (2026-11-10): "No, don't use the Computer Use Operator; yeah, we will fix the bug first." Priority one; deadline for the user's waiting Task (miscellaneous-1) is 2026-11-10 23:59 Berlin. A release needs the user's word (he runs beta-channel auto-updates).
- User-supplied facts and constraints: no change to user data; tests on isolated nodes; keep self-delegation and loops refused; release only on the user's word.
- Initial ambiguity: whether the exclusion is deliberate; whether the `@` menu must change too; which workspace a delegated Daily Assistant copy uses.

## Product And Domain Understanding

- Product area: agent collaboration (delegation catalog / `@` eligibility), built-in agents.
- Affected actors: the user; any agent with `list_available_agents` / `delegate_task` (Project Task Manager first); peer nodes listing this node's agents.
- Existing purpose: the Daily Assistant is the default Chat agent (built-in, platform-owned, resynced from its template at every startup), general-purpose with browser and other tools. The Model Router is an internal agent run only by Model Routing.
- Terminology: "catalog copy" = a fresh delegated copy of a shared definition; "eligible" = may be `@`-mentioned / listed / delegated to.

## Source Log

| Date | Source Type | Exact Source / Command / Query | Why Consulted | Relevant Finding | Follow-Up |
| --- | --- | --- | --- | --- | --- |
| 2026-11-10 | Code | `autobyteus-server-ts/src/agent-collaboration/collaborators/collaborator-candidate-policy.ts` L68-69, L211-214 | Who decides eligibility | `EXCLUDED_AGENT_DEFINITION_IDS = new Set(BUILT_IN_AGENT_DEFINITIONS.map(id))`; `isEligibleAgent` rejects them. Comment: "Daily Assistant (the default chat agent) and the internal helpers are never `@` or delegation candidates." | Root cause |
| 2026-11-10 | Code | `src/built-in-agents/built-in-agent-registry.ts` | What is "built-in" | Two built-ins: `autobyteus-daily-assistant`, `autobyteus-model-router`. Memory Compactor / Skill Self-Evolver / Professor / Student are not built-ins (package agents), which is why they are listed | — |
| 2026-11-10 | Code | grep `listEligible\|requireEligible\|requireAdmissible` in `src` | Single owner? | All paths use the policy: `standalone-root-collaborators.ts:60`, `team-run-collaborators.ts:43`, `agent-org-run-collaborators.ts:56` (list), `collaborator-admission.ts:89,169` (`@` and catalog copies), `remote-collaboration/inbound/remote-catalog-lister.ts:19` (peer list; remote delegation receiver admits through the same admission) | One change point on the server |
| 2026-11-10 | Code | `src/agent-collaboration/collaborators/catalog-address-map.ts` L28-36 | Address the Daily Assistant would get | Name slug: `Daily Assistant` → `/daily_assistant` | Matches what the PM tried |
| 2026-11-10 | Code | `src/built-in-agents/templates/model-router/agent-config.json` (`"internal": true`); `src/agent-definition/services/internal-agent-visibility.ts` | Model Router's other guard | The Model Router is also `internal`, hidden only while "Show internal agents" is off; with the setting on, only the built-in exclusion keeps it out | Model Router must keep an explicit exclusion |
| 2026-11-10 | Code | `src/built-in-agents/templates/daily-assistant/agent-config.json` | Is the DA internal? | No `internal` flag; toolNames general + `list_available_agents` | Not hidden by the internal rule |
| 2026-11-10 | Code | `autobyteus-web/utils/agents/builtInAgentDefinitionIds.ts`, `utils/collaborators/draftMentionEligibility.ts:49`, `utils/agents/__tests__/builtInAgentDefinitionIds.contract.spec.ts` | Web mirror | New chat (draft) `@` candidates mirror the server policy and exclude every built-in via the mirror set; a contract spec pins the mirror equal to the server's registry constants | Web mirror must follow the new rule |
| 2026-11-10 | Code | `src/personal-settings/services/personal-settings-service.ts:59,131` | Other users of the built-in list | Uses built-in IDs to mark launch-default ownership `BUILT_IN`; unrelated to eligibility | Leave unchanged |
| 2026-11-10 | Doc | `tickets/done/cross-scope-agent-mentions/requirements-doc.md` REQ-001, AC-001 (2026-09-30) | Origin of the rule | `@` candidates: "Excluded: Daily Assistant (the default chat agent) and Agent Orgs." AC-001: "No Org, no Daily Assistant" | Deliberate for the `@` menu |
| 2026-11-10 | Doc | `tickets/done/agent-initiated-collaborators/requirements-doc.md` L80 | How delegation inherited it | "Eligibility is the same as the `@` menu (E-02): excluding Orgs, internal built-ins, …" | No separate delegation decision about the DA |
| 2026-11-10 | Doc | `tickets/done/mention-candidates-in-run/requirements-doc.md` REQ-001; `tickets/done/remove-built-in-project-task-manager/requirements-doc.md` BEH-006 | Later restatements | "only built-ins hidden"; "remaining built-ins stay excluded from `@`" — carried forward, never re-reasoned for delegation | — |
| 2026-11-10 | Doc | `tickets/done/delegated-copy-project-workspace/requirements-doc.md` REQ-001/002 (autobyteus-97) | Where a DA copy runs | New local copy: Task's Project first linked folder; else top-level run's folder. Remote copies run in the peer's temp workspace | Corrects the Task's "temporary workspace" premise |
| 2026-11-10 | Command | `npx vitest run tests/unit/agent-collaboration/collaborators/collaborator-admission.test.ts tests/unit/remote-collaboration/remote-catalog-lister.test.ts` (server) | Reproduce at policy level | 14 passed: tests assert the DA is not offered (L82) and `requireAdmissible(DAILY_ASSISTANT)` rejects (L183); peer list refuses `/built_in` (L66-67) | These assertions flip with the fix |
| 2026-11-10 | Code | `tests/unit/agent-collaboration/collaborators/collaborator-admission.test.ts:4` | Test hygiene | Imports `MEMORY_COMPACTOR_AGENT_DEFINITION_ID`, which the registry no longer exports (undefined at runtime) | Clean up in this ticket (touched test file) |
| 2026-11-10 | Code | `autobyteus-web/tests/e2e/cross-scope-agent-mentions-live-probe.mjs` L507, 812, 1170-1223; `chat-entry-live-probe.mjs` L298; `model-routing-decisions-probe.mjs` L321-339 | Probes encoding the old rule | Several live probes assert the DA is never offered; model-routing probe asserts the Router is never offered | DA assertions must flip; Router assertion stays |

## Relevant Existing Behavior And Supported Product Paths

| Behavior ID | Kind | Supported Trigger Or Governing Contract | Current Path | Current Outcome / Invariants | Evidence | Confidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | Agent calls `list_available_agents` (local) | policy `listEligible` | DA and Router absent | policy L211-214 | High (Read + tests) |
| BEH-002 | System | Agent calls `delegate_task` with `/daily_assistant` | address map has no entry → refused | "'/daily_assistant' is not the address of an available agent or agent team" | Task report; policy | High |
| BEH-003 | System | Peer node asks this node's available agents / delegates by address | `remote-catalog-lister` → `listEligible`; receiver admission → `requireAdmissible` | DA absent / refused | remote tests L66-67 | High |
| BEH-004 | User | `@` in a live run composer; `@` in New chat before the run exists | server `listCandidates` / web `draftMentionCandidates` | DA and Router never offered | policy; web draft eligibility | High |
| BEH-005 | Contract | Self / in-run / teammate guards | `requireEligible` own-definition check; `requireAdmissible` in-run check; own-team refusal elsewhere | Own definition refused; second instance of an in-run definition refused | policy L172-193 | High |
| BEH-006 | System | Delegated copy workspace (autobyteus-97) | copy launch | Project's first linked folder, else top-level run's folder; remote → peer temp workspace | autobyteus-97 REQ-001/002 | High (Read) |

## Relevant Codebase And Technical Facts

| Path | Current Responsibility | Requirement Implication | Design Implication |
| --- | --- | --- | --- |
| `collaborator-candidate-policy.ts` | Single owner of `@`/catalog eligibility | One change gives all surfaces the new rule | Replace "all built-ins" with "agents that are never collaborators" (the Model Router) |
| `built-in-agent-registry.ts` | Built-in list for bootstrap and settings | Built-in ≠ non-collaborator | Owner of the "never a collaborator" fact per built-in |
| web `builtInAgentDefinitionIds.ts` + contract spec | Hand mirror of server built-in IDs used only for draft `@` eligibility | Must mirror the new non-collaborator set | Mirror and contract spec change together |

## Structural And Payload Surface Inventory

- Payload: none persisted. Built-in agent folders under `<appData>/agents/` unchanged.
- Structural: eligibility predicate (server) and its web mirror. No API, schema, persistence, security-boundary or lifecycle change. The Model Router stays excluded; Agent Orgs, non-shared, application-owned, own-definition and in-run rules unchanged.
- Confirmed absent: migration, API change, concurrency change.

## Runtime, Probe, Or Reproduction Findings

| Method / Command | Scenario | Observation | Established | Requirement Implication | Evidence Path |
| --- | --- | --- | --- | --- | --- |
| Server unit tests above | Policy excludes DA (local list, admission) and peer list | Tests pass asserting exclusion | Reproduced (unit level, real policy, in-memory catalog) | The fix flips these assertions | test files above |
| PM's live calls (Task report) | Real node and two Docker peers | `/daily_assistant` refused; absent from three lists | Reported by PM (not rerun here) | Matches the code path | Task autobyteus-455 |

- Temporary diagnostics: None.
- Reproduction for implementation to start from: `collaborator-admission.test.ts` L82 and L183 and `remote-catalog-lister.test.ts` L66-67 encode the old rule; implementation changes them to expect the DA eligible (they fail against the fix until flipped; a new test asserting `/daily_assistant` is listed and admissible fails on the base).

## Stakeholder And User Evidence

| Source | Need | Strength | Implication | Open Question |
| --- | --- | --- | --- | --- |
| User via PM (Task, 2026-11-10) | Hand a Task to his Daily Assistant from the PM and other agents | Explicit | DA must be listed and delegable locally and from peers | None |
| User via PM | Model Router stays internal | Explicit | Router stays excluded | None |
| User via PM | Self-delegation and loops stay refused | Explicit | Preserve BEH-005 | None |

## External Contracts, Standards, And Dependencies

None beyond the in-repo collaboration contract.

## Persisted Data And State Facts

- No persisted data changes. The user's data is untouched.

## Product Design Request Context

- Product Design request in the current input: `Not stated`.

## Product Design Findings

N/A.

## Supplemental Artifact Inventory

| Artifact Path | Owner | Purpose | Scope | Related IDs | Status | Approval |
| --- | --- | --- | --- | --- | --- | --- |
| None | — | — | — | — | — | — |

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Why It Matters | Resolution / Owner | Status |
| --- | --- | --- | --- | --- | --- |
| RSK-001 | Risk | The DA's tool list has no `delegate_task`/`update_task` of its own; whether a delegated DA copy can report back depends on the general delegated-copy tooling, which applies to every catalog copy | AC-003 completes only if the copy can answer the PM | Verify in API/E2E (real delegation on an isolated node) | Open, verify |
| RSK-002 | Risk | Loops: a DA copy may delegate onward like any agent | User asked to keep loops refused | Existing guards (own definition, in-run, teammates) apply to the DA as to every agent; no new loop path is created that other agents lack | Accepted (DEC-005) |

## Architecture Investigation Findings

- Entry points: `list_available_agents` / `delegate_task` tool handlers → root collaborators services (standalone, team, org) → `CollaboratorCandidatePolicy` (listEligible / requireAdmissible) → `CatalogAddressMap`. Peer: `RemoteCatalogLister` → `listEligible`; remote delegation receiver → admission → `requireAdmissible`. `@`: `listCandidates` / `requireEligible`; web draft mirror.
- Root cause: eligibility conflates "platform-owned built-in" with "never a collaborator". Only the Model Router is the latter.
- The policy file is 230 lines; the registry 27 lines; well under the size limit.

## Requirement Implications

- The exclusion is a deliberate `@` rule (2026-09-30) inherited by delegation without its own decision; the user now says it is wrong for the DA. Because one policy owns eligibility, the DA becomes eligible on every surface.
- The copy's workspace follows autobyteus-97 (not necessarily the temp workspace).

## Notes For Architecture Design

- Approved scenarios: SCN-001…SCN-005 (requirements doc).
- Keep one eligibility owner; express the non-collaborator fact per built-in in the registry; keep the web mirror pinned by its contract spec.
