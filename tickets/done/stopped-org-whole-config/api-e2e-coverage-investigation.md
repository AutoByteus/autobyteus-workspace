# API/E2E Coverage Investigation — ORG-STOPPED-WHOLE-CONFIG-20260917-001

## Initial state and authority

- Initial API/E2E baseline; no prior API/E2E result or confidence exists for this ticket.
- Approved requirements: SR-002, completed design SR-003 / DS-001, architecture review ARCH-REV-001 Pass, cumulative implementation IR-001/IR-002, source review CRR-002 Pass resolving CR-001.
- Classification carried unchanged: `task_size=Medium`, `architectural_risk=High`; reviewed route.
- Workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/stopped-org-whole-config`; branch `codex/stopped-org-whole-config`; base/HEAD `64852674b5f003aea2a169233093f12a9f80ffba` plus the manifest-listed uncommitted candidate.
- Legacy transition: old exact-member AgentOrg Settings path is removed, with no fallback or dual endpoint. Current schema-v1 retained execution trees are Directly Usable — No Migration.

## Changed boundaries and required proof

The changed subject is the complete retained AgentOrg run. The primary spine is stopped configured-member gear → shared whole-Org form → recursive linked-scope draft → one aggregate GraphQL mutation → transition-owned validation and one atomic tree write/readback → model-only in-place retained-context adoption. Ordinary later Send is the only provider/start boundary.

| Scenario | Requirements / AC | Material boundary | Planned evidence |
| --- | --- | --- | --- |
| R01 | REQ-001–008 / AC-001–006 | Pure planner, real Pinia store, form, API client, retained-context adoption, manager/mutator/GraphQL | Fresh focused web and server suites, manifest verification, production server build |
| B01 | REQ-001–004 / AC-001–003 | Direct and mounted stopped member gear resolve one Org form; root/Team/member linked and explicit overrides | Actual isolated browser against listening server; both entry placements; one multi-scope Save; reopen from other placement |
| B02 | REQ-007 / AC-003, AC-005 | Saved canonical values are used only after ordinary continuation | Actual browser Send through native provider, correlated provider metadata and persistent tree; no provider/start on inspect or Save |
| B03 | REQ-005–006 / AC-003–004 | All-or-none validation, determinate pre-write failure, post-write uncertainty/no replay | Browser form for supported invalid correction plus transparent transport/write fault only where safely executable; exact mutation/read/write counts; direct owner suites for fault schedules not exposed by normal UI |
| B04 | REQ-006–008 / AC-004–006 | Active/offline/task/stale guards and adjacent Agent/Team/Org launch/Plus | Actual UI controls where reachable; lifecycle and stale/task owners for adversarial races |
| B05 | REQ-007 / AC-005 | IDs, history, Activity, drafts, attachment references, tasks, handoffs, binding and locked fields preserved | Pre/post persisted hashes and canonical tree diff; actual UI conversation/draft/Activity; model-only adoption and task-bearing owner tests for the full protected set |
| C01 | All | Cleanup, final confidence, reports/revision, routing | Exact owned-process/tab/port cleanup; source/fixture integrity; API-REV-001 |

## Project instructions and environment discovery

- `autobyteus-web/AGENTS.md`, `README.md`, `ARCHITECTURE.md`, `package.json`, `vitest.config.mts`: use `pnpm test:nuxt ... --run`; browser development path is the supported web-equivalent renderer path.
- `autobyteus-server-ts/AGENTS.md`, `README.md`, `package.json`: use focused `vitest run ... --no-watch`; `pnpm --dir autobyteus-server-ts build` regenerates shared contracts, Prisma, source output and sanitized bootstrap smoke.
- Use a fresh isolated `.local/api-whole-org-config` data directory, HOME, SQLite DB and loopback ports. Never reuse/restart the user server or access user histories/packages.
- The user previously authorized the official secret importer from `/Users/normy/.autobyteus/server-data/.env` into the isolated test environment. The importer may be run without reading, sourcing, or printing secret values. Private DB/key material is never attached.
- Browser UI is the acceptance surface. Read-only persisted files, transport observation and backend logs are corroboration. No direct GraphQL mutation, store injection, fixture page or renderer double can replace a user journey.
- Browser is sufficient because the change is web-equivalent renderer/API behavior. Electron shell, packaging and native IPC are unchanged and will not be certified.

## Existing durable coverage decisions

- **Still Valid:** `AgentOrgRunConfigForm.spec.ts`, `AgentOrgRunConfigPanel.spec.ts`, `AgentOrgWorkspaceView.spec.ts` for shared launch/existing presentation and direct/mounted entry routing.
- **Still Valid:** `existingAgentOrgModelConfigDraft.spec.ts`, `existingTeamModelConfigDraft.spec.ts` for linked recursion, direct-edit independence and Team regression.
- **Still Valid:** `existingRunModelConfigStore.spec.ts` for generations, lifecycle locks, aggregate Save, determinate draft retention/correction, pre-write failure and indeterminate authoritative refresh/no replay.
- **Still Valid:** `agentOrgRunModelConfigAdoption.spec.ts` for in-place model-only adoption and rejection of topology/task/handoff/binding/archive/workspace drift while retaining conversations, state and attachment-path objects.
- **Still Valid:** server whole-root manager/mutator and GraphQL tests for exact scope resolution, task/kind/duplicate rejection, validate-all/write-once/readback, no-op, atomic failure distinctions, archived/application/admission/fail-stop guards and no activation.
- **Still Valid:** adjacent Agent/Team form and seeded/owned Org launch suites in the 85-test set protect preserved launch/new-run behavior.
- **Stale / Remove:** deleted exact-member tests and production path are intentionally absent; no API-owned test should recreate or protect them.
- **No duplicate durable coverage planned initially:** IR-002 plus reviewer execution directly cover the deterministically reproducible race/fault state machines. Actual UI and transport evidence close the remaining system boundary. Add durable coverage only if execution reveals a missing stable regression.

## Initial confidence and broader-validation decision

| Category | Initial score | Basis / gap |
| --- | ---: | --- |
| Requirements and AC proof | 70% | Strong traceability and reviewed tests; actual whole flow not run |
| Changed-boundary directness | 70% | Real owners covered separately; live gear→Save→reopen→Send absent |
| Cross-boundary realism / mock gap | 65% | Frontend tests mock transport and server tests mock provider/catalog |
| Environment/config/identity fidelity | 90% | Exact manifest and isolated setup available; live fixture not yet created |
| Failure/lifecycle/recovery | 80% | Strong owner matrices; live determinate/uncertainty/active controls absent |
| User surface/browser/desktop | 50% | Rendered unit DOM only; no actual application browser acceptance |
| Durable coverage quality | 95% | Focused, owner-aligned coverage and independent reviewer probe |

Initial overall confidence: **74.3%** (simple mean). Broader validation: **Required**. No critical acceptance criterion is considered proven by repository tests alone. The selected mode is actual isolated browser + listening backend + ordinary UI actions, with controlled transport/write faults only when they preserve the real product request path.

## Known qualifications before execution

- Global Vue checking fails before project checking because the available `vue-tsc`/TypeScript export pairing is incompatible; server global typecheck has shared-workspace/baseline dependency diagnostics. Neither is a pass.
- Available provider/model/runtime pairs will be reported exactly; no all-provider generalization.
- The preservation criterion is proved proportionately: actual UI for visible retained state and exact persisted-tree/file comparisons; task/handoff/application/attachment-object drift is directly covered by the production adoption and backend owner tests when a normal UI cannot safely manufacture every protected state.


## Post-repository confidence gate
Fresh execution: focused web 85/10 and server 9/2 Pass; adjacent web 190/19 and server 30/7 Pass (focused sets included); production server build/sanitized bootstrap Pass; 46/46 manifest entries exact. Setup-only first attempt found missing installed dependencies/Prisma client and did not execute tests; frozen install/shared build/Prisma generation corrected the environment, then exact commands passed. This is not a product failure.

Post-repository scores: requirements 80, changed-boundary directness 80, cross-boundary realism 75, environment fidelity 90, failures/lifecycle 90, user surface 55, durable coverage 95 = **80.7%**. Broader validation remains Required: actual configured direct/mounted gear, aggregate persisted Save, ordinary continuation/provider use and live no-start/preservation evidence remain unproved.

## Broader-validation finding and revised coverage decision

- Actual Chrome against the listening candidate backend proved the fixture and provider boundary first: fresh direct and mounted members both produced the requested OpenAI responses through ordinary Send, then normal Stop retained both histories and an unsent mounted draft.
- Critical B01 fails before edit or Save. Both stopped direct and mounted header gears leave the production `ExistingRunConfigEditor` permanently on `Loading run configuration...`, with Save disabled, while the backend returns a valid stopped/editable canonical tree for every request.
- Mounted entry produced 1,366 successful identical `AgentOrgRunModelConfig` reads in 44.497 seconds; direct entry produced 284 in 8.900 seconds. Leaving config mode stops the reads. No provider request or canonical-tree byte change occurred during inspection.
- The present durable component/store/API seams are therefore insufficient as acceptance coverage: they do not exercise the production parent-render/child-watch feedback loop. A durable regression is now required at the real `AgentOrgWorkspaceView` + `ExistingRunConfigEditor` integration boundary, asserting one bounded canonical read and rendered form after context publication for both direct and mounted stopped targets.
- Preliminary implementation origin for focused review: the parent passes a newly allocated inline `{ kind: 'agent_org', orgRunId }` target; the child watches an object-valued computed identity. The successful canonical read republishes into the reactive Org context, rerenders the parent with a new object, and retriggers the load.
- Continuing B02–B04 by direct GraphQL/store calls would bypass the exact failed user boundary and is rejected as an acceptance substitute. Post-Save B05 is likewise not testable until B01 is corrected.

Final broader-validation result is **Fail**. Final scorecard is recorded in the execution report; the overall validation confidence is **82.1%**, not a pass percentage.

## API-REV-002 rerun investigation and final coverage state

### Revised authority and prior-failure-first decision

- Trigger: IR-003 / CRR-004, which preserves the approved requirements and changes the production editor watcher from reactive object identity to semantic scalar run kind + exact run ID.
- Intake integrity: all 47 current IR-003 manifest entries matched. Reviewer evidence passed the new actual-parent/actual-child `AgentOrgWorkspaceConfigBoundary` suite 3/3 and the cumulative focused web set 88/11.
- The new durable boundary test is valid and directly targets the prior mechanism: canonical publication deliberately replaces equivalent parent/target objects, while one semantic run identity must cause only one load. A true Org-ID change remains a one-load control.
- Actual browser B01 remained mandatory. No repository result was treated as live resolution.

### Rerun outcome by boundary

| Boundary | Direct evidence obtained | Coverage conclusion |
| --- | --- | --- |
| Direct and mounted stopped Settings | Actual Chrome against listening Nuxt/proxy/backend/SQLite; full form from both headers; exactly one canonical read per entry; stable form; no provider/tree mutation | Prior API-REV-001 critical failure resolved |
| Whole hierarchy edit and atomic Save | One actual form edited root, direct Agent, mounted Team and Team Agent; one mutation carried four patches; reopen showed canonical values | AC-002/003 directly proven for supported values |
| Provider use after Save | Ordinary direct and mounted Send produced exact real OpenAI replies; provider observer recorded high and xhigh at the intended scopes | Saved scope configuration reached the real provider boundary |
| Determinate failure | Actual Save with only the isolated target persistence path made read-only; `PERSISTENCE_FAILED`, attempted value retained, canonical unchanged, one later user resubmission succeeded | Correctable, no partial/automatic replay |
| Indeterminate response loss | Actual Save; owned proxy discarded only the successful response; one authoritative read, no mutation replay, canonical committed value adopted | Recovery/no-replay directly proven |
| Enclosing lifecycle | Active root + Offline mounted leaf produced read-only whole-Org Settings with disabled Save and no provider start | Leaf status cannot authorize an unsafe write |
| Preservation | Exact pre/post/final tree comparison; retained conversations/Activity/IDs/handoff/locked fields; final stopped/offline state | Only four intended reasoning fields changed |
| Adjacent regressions | Actual standalone Agent and Team catalog Run→Send→Stop→Settings; actual Org `+` seeded form and returned to source | Preserved entry surfaces remained functional |

### Final durable-coverage decisions

- **Still Valid and now acceptance-correlated:** `AgentOrgWorkspaceConfigBoundary.spec.ts` closes the original parent-render/child-watch hole and its semantics match the actual direct/mounted browser result.
- **Still Valid:** planner, store, adoption, manager/mutator and GraphQL owner suites remain the direct evidence for malformed/task scope rejection, all-or-none validation, archived/application/admission guards, stale generation and task/attachment object retention that the ordinary UI cannot safely manufacture.
- **No API/E2E durable test change:** API/E2E added only isolated fixtures, launcher/proxy harness and execution evidence. No durable test was added, updated or removed in this stage.
- **Temporary probes retained:** controlled write permission and response-loss faults are retained because they exercise the real frontend request, backend mutation and persistence boundary while remaining isolated. They are not substitutes for the UI; Save was always initiated through the actual form.

### Final confidence and broader-validation decision

| Category | Final score | Basis / residual |
| --- | ---: | --- |
| Requirements and acceptance-criteria proof | 95% | Every critical normal-flow AC has direct browser/live proof; adversarial task/stale and malformed scope states remain owner-suite evidence |
| Changed-boundary execution directness | 95% | Actual direct/mounted headers, shared form, one aggregate mutation, reopen and ordinary Send |
| Cross-boundary integration realism / mock gap | 95% | Real Nuxt, GraphQL proxy, backend, SQLite, persisted files and OpenAI provider; only deterministic failure transport was controlled |
| Environment/configuration/identity fidelity | 95% | Fresh isolated HOME/data/DB/ports, real generated run identities and exact source package; synthetic content avoids private data |
| Failure/lifecycle/recovery | 95% | Live determinate failure, response-loss reconciliation/no replay, active/offline guard and normal Stop; adversarial races remain durable |
| User surface/browser/desktop | 95% | All acceptance journeys used actual Chrome and user-visible controls; unchanged Electron shell is explicitly not certified |
| Durable regression coverage quality | 95% | New production parent/child boundary regression plus existing planner/store/backend owner matrices correlate with live behavior |

Final overall validation confidence: **95.0%** (simple mean). Broader validation was **Required and completed**. The prior critical acceptance failure is resolved, every critical acceptance criterion has direct evidence at its material boundary, no category is below 90%, and no material unvalidated broader risk remains. Bounded residuals are the unchanged Electron shell, unavailable all-provider generalization, and adversarial task/stale/attachment-bearing states covered by direct owner suites rather than fabricated UI data.
