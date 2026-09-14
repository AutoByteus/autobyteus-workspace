# Team Backend Abstraction Analysis

## Result / authority
Package AORG-FOLLOWUP-20260914-001, SR-002, 2026-09-14. Source/history analysis complete; requirements remain Draft. User explicitly requests explanation of FlatTeamRunBackend implementing TeamRunBackend with only one implementation and confirms using this new follow-up ticket for both investigations. Analysis is authorized; no refactor, implementation-ready design or requirement approval inferred.

## Workspace / source
- Workspace: /Users/normy/autobyteus_org/autobyteus-worktrees/flat-agent-organization-model-follow-up
- Local branch: codex/flat-agent-organization-model-follow-up.
- Requested base: origin/requirements/flat-agent-organization-model at 72dee5ad2c2e332272a0c00eb36af1a036bd69fb.
- Comparison: origin/personal at 5645b49d6f51faa60bd3545bc8e3f0e7e3f96793, read-only git show.
- Future finalization target remains provisional requested base, subject to explicit authority. No commit/push/merge.
- Existing archived tickets remain unchanged; this is the newly bootstrapped follow-up, not a reopened completed package.

## INV-B01 — present production shape
Full source search for TeamRunBackend, FlatTeamRunBackend and new TeamRun construction finds one production implementing class and two construction sites:
- `autobyteus-server-ts/src/agent-team-execution/backends/team-run-backend.ts:16`: interface, not another running backend.
- `.../local/flat-team-run-backend.ts:11-43`: sole production implementation.
- `.../domain/team-run.ts:9-39`: public local Team facade with backend dependency.
- `.../local/flat-team-execution-factory.ts:94`: configured standalone/mounted Team construction.
- `.../local/task-team-execution-factory.ts:62-65`: task-Team construction.
Both sites use the same concrete implementation. No production Team backend selection registry or second backend found in the source search. Standalone, Org-mounted and task Team are execution contexts of this one mechanism, not competing backends.

Call chain:
TeamRun → TeamRunBackend contract → FlatTeamRunBackend → FlatTeamExecutionManager → configured/task registries and Agent execution handles.
The TypeScript interface is compile-time only; it is not an additional object at runtime. The extra concrete adapter is a real wrapper, but no measurable performance issue is claimed.

## INV-B02 — original historical reason was genuine runtime polymorphism
At commit 4fb78f864 (`Refactor runtime execution and history stack`), TeamRunBackend contains runtimeKind and is implemented by:
- backends/autobyteus/autobyteus-team-run-backend.ts: AutoByteusTeamRunBackend;
- backends/codex/codex-team-run-backend.ts: CodexTeamRunBackend;
- backends/claude/claude-team-run-backend.ts: ClaudeTeamRunBackend.
Confirmed by git show of all three class declarations, the interface, and git ls-tree of corresponding backend factories. Git deletion history identifies 0cfa9b9cd (`checkpoint mixed team manager delivery candidate`) removing these old backend files.
At the compared origin/personal tip, MixedTeamRunBackend implements the retained interface and forwards to MixedTeamManager. Thus the single-production-implementation arrangement already existed before the AgentOrg refactor.
Commit 37d05c7f71df925dd6f36a4fb1668ef8e1cee450 (`feat: add flat agent organizations`) retains the interface, removes getOrCreateConfiguredChildTeam from it, and introduces the near-identical FlatTeamRunBackend forwarding to FlatTeamExecutionManager.
Historical design `tickets/done/flat-agent-organization-model/design-spec.md:4253-4270` explicitly retains the existing local TeamRun facade with a narrowed mixed manager so standalone roots, Org-mounted Teams and task Teams reuse local execution. This explains retention of that boundary; it does not independently justify every wrapper/metadata member forever.

## INV-B03 — remaining useful boundary
The Team facade separates callers from manager construction and registry internals. Tests use this substitutability:
- tests/unit/agent-team-execution/team-run.test.ts builds a typed backend fake and checks exact-member forwarding.
- tests/integration/agent-team-execution/task-delegation-tool-lifecycle.integration.test.ts:91 declares TestTeamBackend implementing the interface for controlled lifecycle scenarios.
These are test implementations, not alternate supported production backends. Testability and restricted caller access can justify an interface even with one production implementation; a second backend is not required. Removing all execution boundaries just because there is one implementation would be an unsupported conclusion.

## INV-B04 — strongest simplification evidence is redundant forwarding
FlatTeamRunBackend owns context/manager references and forwards almost all operations directly, without independent lifecycle state, routing policy, validation, persistence, retries or provider adaptation. TeamRun forwards essentially the same operations again. Actual invariants and lifecycle state live in FlatTeamExecutionManager (lifecycle, configured/task registries, direct-recipient checks, prepared termination/settlement).
Backend teamRunId, teamBackendKind and getRuntimeContext are in the interface, but TeamRun reads those values from its own context rather than the backend. FlatTeamRunBackend.getTeamRunContext is not part of the interface and has no production caller found in the source search. TeamBackendKind contains only MIXED = mixed; factory code sets it unconditionally. These are concrete candidates for contract/metadata cleanup, not proof of a runtime bug.
The abstraction is not fully implementation-independent: RuntimeTeamRunContext already aliases FlatTeamExecutionContext | null and the domain context imports the local type. Its current value is bounded access/test substitution, not demonstrated general backend portability.
Agent-level polymorphism is different: current AgentRunBackend has AutoByteusAgentRunBackend, CodexAgentRunBackend and ClaudeAgentRunBackend production implementations. Do not conflate unnecessary Team-level indirection with required Agent runtime variation.

## Assessment (non-authoritative options, not a completed target design)
The user's concern is well grounded: today the extra forwarding class has weak independent responsibility, and the backend vocabulary retains history from the multi-backend model. Retaining a small execution contract may still be valuable.
If simplification is requested, compare removing the forwarding adapter while preserving a narrow Team execution/test seam against collapsing more of the facade. Do not merely replace the interface with a dependency on the same redundant adapter, and do not invent a speculative second backend. Exact ownership/dependency design must follow approved intent and further impact checks.
Preserve the real boundary between local Team execution and Team/Org root lifecycle, configured-vs-task ownership, exact-member targeting, provider-neutral Agent execution, prepared publication/termination and durable state. Metadata cleanup requires tracing storage/API/migration consumers first; current predecessor migration and config builders still refer to TeamBackendKind. No automatic persisted-data migration conclusion follows.

## Relationship to restart finding
Separate concern. The interface/adapter does not decide fresh vs restore activation; restore eagerness was traced to Org registry/factory policy and all-member preparation loops in INV-R01–05. Removing the wrapper would not fix that behavior. Keep behavioral recovery and optional structural cleanup separately scoped, even though evidence shares one ticket.

## Verification / limits / next step
Source and history inspected only. No tests, builds, live server action, source edits or performance measurements. No claim of external consumers beyond this repository search. Draft requirements for restart remain unchanged; no product behavior added by this investigation. User can decide whether to request simplification; obtain explicit requirements approval before affected authoritative design. Design/risk classification, independent review and new implementation artifacts: N/A — not applicable to this analysis.

## Canonical package
- /Users/normy/autobyteus_org/autobyteus-worktrees/flat-agent-organization-model-follow-up/tickets/in-progress/flat-agent-organization-model-follow-up/requirements-doc.md
- /Users/normy/autobyteus_org/autobyteus-worktrees/flat-agent-organization-model-follow-up/tickets/in-progress/flat-agent-organization-model-follow-up/investigation-notes.md
- /Users/normy/autobyteus_org/autobyteus-worktrees/flat-agent-organization-model-follow-up/tickets/in-progress/flat-agent-organization-model-follow-up/solution-revision-record.md
- /Users/normy/autobyteus_org/autobyteus-worktrees/flat-agent-organization-model-follow-up/tickets/in-progress/flat-agent-organization-model-follow-up/restart-resume-analysis.md
- /Users/normy/autobyteus_org/autobyteus-worktrees/flat-agent-organization-model-follow-up/tickets/in-progress/flat-agent-organization-model-follow-up/team-backend-abstraction-analysis.md (this full result)
Bootstrap receipt and historical done-ticket packages remain context. No Product supplements apply.

## Routing
Current rule lookup completed: no matching rule. Analysis-only return to user; no Architecture Design Complete, Product Design Requested or delivery receipt correction. API/E2E request remains cancelled; no specialist contacted.

## SR-003 / INV-B05 — Mixed runtime versus flat topology clarification
User clarifies that Mixed means a Team whose Agents can use multiple runtime backends, and asks why the old implementation could not be updated in place. This interpretation is supported by origin/personal documentation: `autobyteus-server-ts/docs/modules/agent_team_execution.md:91-92` identifies MixedTeamManager as the single orchestration manager for homogeneous, heterogeneous and nested teams, routing Agent members to runtime-specific AgentRun backends. `autobyteus-web/docs/agent_teams.md:576` explicitly describes mixed-runtime teams.

Mixed (runtime diversity) and flat (configured membership depth) are independent properties. Current `local/flat-team-execution-context.ts` retains runtimeKind per Agent; the new backend still returns TeamBackendKind.MIXED. Flattening membership therefore does not technically require discarding the Mixed name or creating a conceptually different Team backend.

Direct old-vs-current class comparison shows almost entirely import/type/class renames, removal of getOrCreateConfiguredChildTeam, and later addition of tryPrepareTerminationIfQuiescent. `git diff --find-renames=30% --summary 37d05c7f7^ 37d05c7f7 -- autobyteus-server-ts/src/agent-team-execution` recognizes the backend as a move/rename with 62% similarity and the manager at 66%. This is rename-detection evidence, not proof of an author's exact file-edit procedure. Correct earlier wording: it was substantially a moved/renamed evolution of the old wrapper, not a fundamentally new backend implementation.

Likely naming motivation is to emphasize the newly enforced flat configured topology and root-neutral local placement; this is inference from naming/design, not a located explicit rationale that Mixed was invalid. The design actually says to retain the existing local facade backed by a narrowed mixed manager (lines 4253 onward). Keeping MixedTeamRunBackend and updating its internals was technically viable. It would still need removal of configured child-Team support and correct separation of Org-root ownership. Runtime diversity must remain preserved; a rename back alone would not fix restore eagerness or redundant forwarding.

Outcome: evidence clarification, not an approved rename/refactor. Existing proposed BEH/REQ/AC/SCN unchanged. No production edits/tests. Current rule lookup complete: no matching rule, return directly to user; same workspace/base/package and full artifact inventory above remain current.
