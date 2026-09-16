# Revised Architecture Design Complete — ORG-LOCAL-AGENT-20260916-001

## Current authority / result
Approved SR-001 unchanged; SR-003 / DS-REV-002 Ready supersedes DS-001. Cumulative task_size Medium / architectural_risk Low, freshly reassessed. CRR-001 F-001 Design Impact addressed by full frontend launch-reference design; **API-REV-001 remains Fail77.9% validation confidence, not pass rate** pending repair/retest. IR-001 backend source/tests remain preserved. No successful-test review/Delivery or completion claim.

## Original request and supported scenario
User wants self-contained Agent Orgs: Org-local Team owns Team-local Agents, no shared extraction. Actual API Alpha(server-data) and Beta(external) imported/inspected successfully after backend read correction but detail Run -> valid model/workspace shows MISSING_TEAM_DEFINITION and disables Run; shared control enables. Exact detail reads do not publish to public Pinia catalog (intentionally). Source review traces list-only launch getter -> pure projector failure before Create/Send. User explicitly asked to verify real user reachability and continue only if real; actual captured normal user paths establish it, Designer independently inspected evidence/source (no browser rerun).

## Accountability and preservation
Original DS-001 covered backend planner/mounted context but missed upstream frontend gate; IR-001 followed it, not blamed as introducing pre-existing defect. Four implicated frontend files match base per CRR attribution; original seven IR hashes independently reverified unchanged by Designer. Existing Implementation run acknowledged design hold and no edits since IR-001. Preserve all source/tests/API/CRR evidence and SDK generated outputs; do not repeat external conversion or create new ticket/task.

## Revised design delta
Reuse exact query/scope-owner checking from existing agentOrgAuthoringReferences, rename neutrally to agentOrgDefinitionReferences (no compatibility wrapper), update two existing consumers. AgentOrgRunConfigPanel obtains its own key-bound selected-Org snapshot; pure form receives exact validated Teams/Agent names. Complete references required, including child Agents; partial map not sufficient. Local loading/unavailable gate with normal watcher cleanup/key match, user drafts retained, no public catalog insertion or prior-detail prerequisite. Existing model/workspace validation, Create command, runtime ownership/laziness and backend reads unchanged. Detailed DS-REV-002 includes owner/interfaces/files/removals/test cases; do not invent another resolver, global cache, retry machinery, schema/writer change or lifecycle repair.

## Validation required / residual limits
Add durable real panel + Pinia + projector + reference reader + Apollo-boundary regression: owned Team absent public list, exact read enables normal create; shared/missing/wrong-owner/error controls, no premature launch, scoped late result ignored, drafts retained. Existing detail/authoring tests must survive service rename. Implementation rendered-result verification applies now (not backend-only N/A).
API recheck **F-001/B02 FIRST** for both source placements through ordinary frontend Run, then mounted worker Send and correct enclosing Team instructions. No direct API workaround. Existing API169/15 (including25/2) and production build Pass are carried evidence, not rerun. Strict/expanded failures remain qualified; no global clean/whole-provider/Electron claim. No actual runtime Send accepted yet. Private fixtures never enter Git.

## Workspace / safety
Worktree /Users/normy/autobyteus_org/autobyteus-worktrees/org-owned-team-local-agent-loading; branch codex/org-owned-team-local-agent-loading; base/HEAD65fc02a99d0a9608ba4da195cf108dc8aef255e7 plus current uncommitted source/tests/docs. Eventual target origin/requirements/flat-agent-organization-model, NOT personal. No new worktree, fetch/rebase, stage/commit/push/merge/release authority here. Do not change user's Electron/server/data/conversations/auth/external packages. API owned services50681–50683/tab reported stopped. No definition/history migration/data repair/startup optimization.

## Artifact authority and cumulative evidence
Canonical root: /Users/normy/autobyteus_org/autobyteus-worktrees/org-owned-team-local-agent-loading/tickets/in-progress/org-owned-team-local-agent-loading
- requirements-doc.md (Approved SR-001 + applicability note)
- investigation-notes.md (current source/evidence/uncertainty + full supplement inventory)
- design-spec.md (DS-REV-002 technical authority)
- solution-revision-record.md (SR-001–003)
- bootstrap-handoff.md (unchanged isolation/base)
- implementation-handoff.md and implementation-revision-record.md (IR-001 retained)
- code-review-report.md and code-review-revision-record.md (CRR-001 focused failure-origin authority)
- api-e2e-coverage-investigation.md, api-e2e-execution-coverage-report.md, api-e2e-test-case-ledger.md, api-e2e-revision-record.md (API-REV-001 Fail)
- validation/README.md; implementation-source-manifest.json; crr001-failure-origin-attribution.json
- validation/api-live/README.md; Alpha/Beta launch-failure DOM/screenshots; detail DOM; shared-control-launch.txt; browser-api-correlations.json; runtime-observation.json; authored/implementation hash checks; cleanup.json
- history/design-spec-ds001.md and history/solution-handoff-sr002.md are SUPERSEDED, not current implementation basis.
External conversion/personal source references remain indexed in investigation-notes; no additional behavior supplement. Independent architecture/source review N/A for prior valid direct route; CRR-001 is a failure-origin review, not full source Pass. No review/Delivery result invented.

## Routing
Current rule lookup pending. Expected next output is revised implementation/validation within this cumulative basis, then normal validation routing. No parallel or duplicate assignment. Transport success must be established by tool confirmation.

Rule lookup completed: sole applicable Architecture Design Complete / Medium / Low -> `/software_engineering_team/implementation_engineer`. Direct route reaffirmed after explicit reassessment; no architecture review bypass/Pass claimed. Only this outcome recipient notified. Revised package supersedes the coordination hold on dependent F-001 correction upon confirmed delivery.
