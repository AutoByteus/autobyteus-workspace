# API/E2E Execution Coverage Report — ORG-LOCAL-AGENT-20260916-001

## Latest authoritative result
**Fail — API-REV-001, initial round, 77.9% validation confidence (not a test pass rate).**
Critical AC-004 fails before ordinary mounted-member Send: the actual Run Agent Org form cannot resolve the Org-owned Team and disables Run. Reproduced for data-root Alpha and imported external-root Beta. Catalog/detail now resolve both exact owned Teams and their local workers. This is not a claim that the backend reader fix failed; it is an incomplete supported frontend-to-runtime journey.

## Execution round and authority
- Date: 2026-09-16; current round 1; prior API result/confidence N/A. IR-001 against Approved SR-001 and SR-002 / DS-001.
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/org-owned-team-local-agent-loading`; branch codex/org-owned-team-local-agent-loading; HEAD65fc02a99d0a9608ba4da195cf108dc8aef255e7 plus supplied uncommitted changes.
- Requirements `/Users/normy/autobyteus_org/autobyteus-worktrees/org-owned-team-local-agent-loading/tickets/in-progress/org-owned-team-local-agent-loading/requirements-doc.md`; investigation `/Users/normy/autobyteus_org/autobyteus-worktrees/org-owned-team-local-agent-loading/tickets/in-progress/org-owned-team-local-agent-loading/investigation-notes.md`; design `/Users/normy/autobyteus_org/autobyteus-worktrees/org-owned-team-local-agent-loading/tickets/in-progress/org-owned-team-local-agent-loading/design-spec.md`; solution record `/Users/normy/autobyteus_org/autobyteus-worktrees/org-owned-team-local-agent-loading/tickets/in-progress/org-owned-team-local-agent-loading/solution-revision-record.md`; solution/bootstrap handoffs in same directory.
- Implementation `/Users/normy/autobyteus_org/autobyteus-worktrees/org-owned-team-local-agent-loading/tickets/in-progress/org-owned-team-local-agent-loading/implementation-handoff.md` and `implementation-revision-record.md`; validation README and implementation-source-manifest reviewed. All seven manifested source/test hashes remain exact.
- Independent architecture/source review and their revision records: N/A — not applicable to incoming direct Medium/Low route. Delivery/DR and prior API triggers: N/A. Previous external L-001 is contextual concern, not a prior result for this ticket.
- Canonical coverage investigation, ledger and revision record are the three `api-e2e-*.md` siblings of this report.
- Classification: **Medium / Low** carried; input Direct Low-Risk. Successful route would be Delivery; this result requires focused Code Reviewer failure-origin routing. Successful proportional test review N/A; no successful handoff.

## Investigation, coverage and ledger
Investigation completed before execution, with ledger initialized. Narrow-to-broad plan followed; actual launch failure stops downstream Send, not bypassed through direct API. Completed cases checkpointed; no execution remains running. Existing durable source/cache/adjacent coverage Still Valid. No production or durable test edits by API, no stale coverage removed. New frontend gap escalated for accepted fix and focused durable regression; temporary actual-app evidence is sufficient for failure reproduction and avoids encoding current invalid behavior as an expected-pass test. Source/fixture/transport boundaries are distinguished below.

|Case|Requirements/boundary|Final result|Evidence under validation/|
|---|---|---|---|
|R01|AC-001–004 file providers, exact owner/index, cache|Pass:25 tests/2 files|api-narrow.log|
|R02|AC-001–004 adjacent admission, ownership, application/shared/directOrg, lazy context controls|Pass:169 tests/15 files, includes R01|api-adjacent.log|
|R03|Current production/shared build, Prisma generation, sanitized bootstrap|Pass exit0|api-build.log|
|B01|AC-001/002 actual startup, UI local-package import, package/catalog Reload, detail and source nonmutation|Pass at read boundary; no runtime activation commands observed|api-live/startup-catalog.txt, alpha-detail.txt, external-import-reload.txt, external-catalog.txt, beta-detail.txt, authored-hash-check.json, browser-api-correlations.json|
|B02|AC-004 actual ordinary owned launch/member Send|**Fail F-001** at configuration. Send and real runtime instruction composition Not Tested downstream|api-live/alpha-launch-failure.txt/.png, beta-launch-failure.txt/.png|
|B03|AC-003 same-name isolation, missing worker exclusion, no shared child publication, shared launch-form control|Pass at catalog/detail/configuration boundary; application-owned/runtime regression evidence remains repository-level|api-live/external-catalog.txt, shared-control-launch.txt, shared-team-catalog.txt, shared-agent-catalog.txt|

## Exact repository execution
Working directory `/Users/normy/autobyteus_org/autobyteus-worktrees/org-owned-team-local-agent-loading`. Supplied `validation/vitest.org-local.config.ts` copied to server root `vitest.api-org-local.config.ts` temporarily; removed afterwards.
1. `pnpm -C autobyteus-server-ts exec vitest run --no-watch --config vitest.api-org-local.config.ts tests/integration/collaboration-definition-admission/org-owned-team-local-agent.test.ts tests/unit/agent-team-definition/cached-agent-team-definition-provider.test.ts` →25/2 Pass.
2. `pnpm -C autobyteus-server-ts exec vitest run --no-watch --config vitest.api-org-local.config.ts` →169/15 Pass.
3. `pnpm -C autobyteus-server-ts build` →Pass.
4. `git diff --check` →Pass; source/test SHA256 comparison7/7 unchanged.
No full strict or expanded typecheck rerun/pass claimed. Incoming TS6059/rootDir and broader7395 diagnostics remain qualified; production build is not strict-suite evidence.

## Broader validation setup and actual journey
**Required and executed**, browser-preferred web-equivalent application, not isolated renderer fixture. Actual built server, actual Nuxt frontend and real file providers/SQLite. Transparent HTTP/WS observer forwards traffic without altered responses; browser actions generate all application operations. No manual API launch/Send workaround.
- Replay scaffolding `validation/api-live/setup.py`, `launch.py`, `proxy.mjs`. Setup asserts a new private root and free ports. Run `python3 .../setup.py` only against absent `.local/api-org-local`; it intentionally refuses to overwrite existing evidence. Then `python3 .../launch.py backend`, `proxy`, `frontend` in separate owned sessions.
- Backend50681, observer50682, Nuxt50683. Health200 verified. Minimal environment and fresh HOME/data/workspace; no inherited provider credentials or user conversation data. OLLAMA/LMSTUDIO discovery points at unused loopback50684, not user's servers.
- Synthetic packages only: built-in Alpha self-contained Org, shared-control Org/sharedSquad/sharedAgent; external Beta same local squad/worker names but distinct owner IDs, and Broken with intentionally missing worker. All30 authored-file hashes unchanged through startup/import/read. Built-in service agents are startup-generated separate files, not extracted owned children.
- Fixture correction: external originally had only agent-orgs and normal package importer rejected it. Added **empty external/agents directory** to satisfy existing package-root contract, no authored-file correction; ordinary UI retry and Reload passed. This setup limitation is not F-001 or a requested importer-policy change.
- Actual Settings→Agent Packages→path→Import→Reload; Agent Orgs→Reload shows Alpha/Beta/SharedControl, excludes Broken. Detail resolves each own Guide/Squad/Worker and existing handoff. Exact returned local IDs retain immediate Team owner.
- Alpha detail Run→select OpenAI/gpt-5.4-mini, Temp Workspace →cannot resolve owned Team; disabled Run. Beta repeats same failure. SharedControl with same runtime/model/workspace has no Team-resolution error and **enabled** Run; deliberately not clicked, no claim of its runtime execution.
- Public Team catalog contains only SharedSquad. Public Agent catalog contains SharedAgent plus two built-ins, not owned guides/workers. No private external Classroom content read/copied.
- Initial Nuxt dependency optimization caused development reloads; warmed-route reproductions used fresh DOM and valid model. CUA accessibility cached an old SPA view; fresh actual DOM snapshots provided authoritative state. Neither was classified as product failure.

## F-001 — exact frontend launch integration gap
**Scenario B02 / SCN-001 / REQ-004 / AC-004; material acceptance failure.**
Expected: admitted self-contained Org can configure ordinary mounted-member launch using its exact resolved Team, without publishing it as shared.
Observed for Alpha and Beta: `AgentOrg configuration cannot resolve Team '/group' (agent-org-owned-team:readfix-alpha:squad).` (Beta uses readfix-beta); Run Agent Org remains disabled after valid model selection. No Create/Send command leaves the UI, so no provider can be blamed for this failure.

Correlated evidence:
- Browser-origin exact detail queries29–31 and58–60 resolve Alpha guide/Team/worker;174–176 resolve Beta. `browser-api-correlations.json` includes real request/response bodies.
- Shared catalog `GetAgentTeamDefinitions` contains only sharedSquad by intended ownership policy; the backend exact owned reads succeed without public catalog insertion.
- Current `autobyteus-web/components/workspace/config/AgentOrgRunConfigPanel.vue:212` supplies `teamStore.getAgentTeamDefinitionById`; mounted initialization388–391 fetches catalog lists, not exact owned Teams.
- `autobyteus-web/stores/agentTeamDefinitionStore.ts:281–283` resolves only `agentTeamDefinitions.value.find(...)`.
- `autobyteus-web/utils/editableAgentOrgRunFormModel.ts:176–179` converts the miss into the exact observed MISSING_TEAM_DEFINITION error.
- Detail's `agentOrgAuthoringReferences.ts` uses exact referenced-Team/Agent queries; this does not put owned definitions into the shared launch-store list.
This is evidence-supported preliminary attribution, not an approved architecture prescription. Do not fix by extracting owned children or publishing them globally. Recommended **Local Fix, implementation owner**, subject to focused Code Reviewer confirmation; any newly needed structural mechanism must route Design Impact rather than unauthorized scope growth.

## Activation, instruction and persistence limits
Observer records no runtime create/Send command; all three persisted run-history indexes remain empty. Backend logs retained. This supports no execution caused by reads; **not a direct in-memory active/candidate count**. Settings legitimately calls provider-model catalog discovery, distinct from agent execution/provider conversation startup. No actual LLM response/identity/continuation, provider preparation, mounted-member Send, or enclosing runtime instruction composition is claimed. Repository real planner/context callback covers instruction reads with execution plane substituted. Credentials were not needed to reproduce the earlier UI gate; later real provider validation remains unexecuted, not an environment excuse for F-001.

Persisted-data decision Directly Usable — No Migration for definitions, runtime/history Not Affected. Thirty authored bytes/hashes stay exact; no rewrite/version fallback/extraction/legacy-only coverage. Actual startup naturally runs existing migrations on fresh isolated SQLite, not user data and not proof of historical runtime migration. No restart/history-repair claim. Electron shell unchanged/N/A; user's app unaffected.

## Confidence scorecard
|Category|Post repository|Final|Evidence / remaining gap|
|---|---:|---:|---|
|Requirements/AC proof|75%|50%|Read/admission proven; critical AC-004 fails|
|Changed-boundary directness|90%|95%|Real file providers + actual frontend/API exact reads; runtime Send not reached|
|Cross-boundary realism/mock gap|75%|75%|Real UI/API/files; runtime callback durable test substitutes execution plane|
|Environment/config/identity/fixtures|90%|95%|Owned actual services, exact owner isolation, valid shared control, hashes; synthetic not private package|
|Failure/edge/lifecycle/recovery|90%|90%|Missing worker exclusion and ownership durable controls; no post-fix runtime progression|
|User-surface/browser|50%|50%|Actual critical launch is failing; browser shell not Electron|
|Durable regression quality|95%|90%|169 relevant pass; discovered shared-catalog launch integration gap needs durable regression with repair|
Overall arithmetic mean: post repository80.7%; final(50+95+75+95+90+50+90)/7=**77.9%**. Broader validation exposed incompleteness rather than raising confidence automatically. Target≥95% and everycategory≥90% **not met**. Critical proof missing/failing overrides all counts. No Pass/Delivery.

## Coverage changes and execution artifacts
No durable tests added/updated/removed this round; no production edits. Existing tests retained. Temporary test config removed. Temporary real-app seed/launch/observer scripts, DOM/screenshots, raw backend/frontend/transport logs, exact correlation and hash manifests retained under `validation/api-live`; synthetic private runtime data retained ignored for reproducibility, not committed. An accepted correction should add scoped launch lookup regression and rerun B02 first, then ordinary mounted Send/instructions; repeat missing-reference/shared-publication controls. Do not encode failed behavior as expected success.

## Cleanup
Owned browser tab closed. Owned backend42638/proxy42944/Nuxt43248 terminated; ports50681–50683 verified closed (`api-live/cleanup.json`). Private `.local/api-org-local` retained isolated. Upstream generated SDK dist present at intake preserved. Designer/source/test artifacts unchanged; no commits/staging/push/merge/release, no user server/data/auth/external package changes. Exact7/7 implementation manifest unchanged; authored30/30 unchanged. Eventual target remains unreleased origin/requirements/flat-agent-organization-model, NOT personal.

## Routing
Fail → obtain current handoff rules and send sole selected accountable recipient complete failure package for focused failure-origin review. Recommended `/software_engineering_team/code_reviewer`; no successful-test review request. Dispatch confirmation separate from this report. Source correction of backend reading is acknowledged; ordinary end-to-end launch remains unaccepted.
