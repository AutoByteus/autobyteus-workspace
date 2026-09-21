# IR-001 local implementation evidence

Not independent API/E2E acceptance; current handoff explains downstream gates.

## Current results
- `server-current.log`:107tests/20files pass. Root manager + actual strict tree store/writer + real selection validator/catalog-capacity seam; exact leaf controls, same-model0/false, replacement capacity, no-op, unknown storage, active/fail-stop/archive/admission/application, restore races and pre/post-rename/readback faults. Includes Org adjacent owners, public service/options, actual web documents through TypeGraphQL resolver, supervisor initialization, standalone model-config controls.
- `web-current.log`:152tests/16files pass. Actual form/schema + controller + Pinia/context + Apollo seam, direct/mounted Save/reopen, real replacement dropdown, pending/error/uncertainty refresh, retained objects/Activity/drafts/attachments, stale canonical/save/schema/selection/owner/binding, exclusion/deferred disposal, header/+ and Agent/Team/Org recovery controls.
- `server-final-typecheck.log`: `pnpm --dir autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit` exit0, empty success output. Regular tsconfig typecheck includes tests outside rootDir; `server-typecheck.log` records TS6059 configuration failure and is NOT success.
- `web-final-build.log`: production Nuxt build passes16routes; no temporary validation page included. Existing Browserslist/chunk warnings unchanged.
- `web-typecheck.log`: vue-tsc not installed; strict Vue typecheck NOT completed. No dependency added to conceal this limit.
- `web-boundary.log` and `localization-boundary.log`: guards pass. Final git diff --check passes.
- `ir001-source-manifest.json`: current source/test/doc hashes at unchanged base36c149b26.
- `render/`: synthetic transport/catalog real rendered panel inspection, not real provider/API acceptance. See its README and results/screenshots. Owned dev browser/server stopped and temporary route removed.

## Preparation and intermediate failures (retained truthfully)
Frozen dependency install; Nuxt prepare; server prepare:shared and Prisma client generation. The normal Vitest global setup resets ONLY this worktree tests/.tmp test database; no user/application profile migration/reset was performed. Initial backend attempt ran0tests because generated Prisma client was absent. Initial tsc included missing generated Prisma types; prepared client fixed these. Shared SDK dist outputs generated for builds were removed after checks (initial worktree had neither); regenerate `pnpm --dir autobyteus-server-ts prepare:shared` for future runs.

Initial two legacy panel tests expected synchronous context-only locked form; replaced with actual canonical-read/form tests. First real-form fixture lacked promised dynamic metadata and enabled runtime capabilities; corrected fixture boundaries, not production schema guards. First new manager fixture lacked root delivery interface; corrected fixture. Initial schema execution needed normal SkillAccessMode enum registration and the same CommonJS graphql instance as TypeGraphQL; fixed harness, no production workaround. One web test attempt overlapped Nuxt build preparation and failed setup with missing .nuxt/tsconfig; later sequential prepare/test passes establish current results. Intermediate logs are not acceptance or unresolved product failures.

## Commands
Web suite (autobyteus-web):
`pnpm test:nuxt components/workspace/org/__tests__ components/workspace/agent/__tests__/AgentWorkspaceView.spec.ts components/workspace/team/__tests__/TeamWorkspaceView.spec.ts services/agentOrgExecution/__tests__ stores/__tests__/agentOrgContextsStore.spec.ts stores/__tests__/agentOrgRetainedRecovery.spec.ts stores/__tests__/retainedOrgActivityTermination.spec.ts stores/__tests__/existingRunModelConfigStore.spec.ts components/launch-config/__tests__/RuntimeModelConfigFields.spec.ts --run`

Server suite (autobyteus-server-ts):
`pnpm exec vitest run tests/unit/agent-org-execution tests/unit/llm-management/run-model-selection-service.test.ts tests/unit/api/graphql/types/agent-org-member-model-config.test.ts tests/unit/agent-execution/general-process-run-supervisor-ownership.test.ts tests/unit/agent-team-execution/team-run-model-config-mutator.test.ts tests/unit/run-history/services/studio-run-model-config-service.test.ts --no-watch`

## IR-002 revised Plus inheritance / required-model diagnostics
- Current revised basis SR-004 approved SR-005; SR-006/DS-REV-002/ARCH-REV-002; CRR-003 F-001/F-002, API-REV-001 Fail83.6% confidence retained, not acceptance.
- `ir002-current-tests.log`: scoped config/Org/shared-field/seed/store/projector tests. Uses real view event→route→panel→Pinia/projector/reader/ordinary Create at Apollo seam; monitor surfaces substituted for unit event initiation, backend identity allocation not inferred from stub fresh response. Actual schema producers/render/forwarding exercised. Actual API still required.
- `ir002-typecheck.log`: vue-tsc unavailable, no strict Vue typecheck pass. No dependency added.
- `ir002-prepare.log`: ordinary prepare:shared regenerates SDK dist prerequisites (IR-001 intentionally cleaned generated untracked SDK dist). Initial build failed missing SDK entry, before this preparation; final build log supersedes it for build outcome only.
- `ir002-render/`: renderer fixture and direct inspected screenshots/results, synthetic only; exact owned frontend/browser stopped, temporary route removed.
- `ir002-preservation.json`: IR-001 hashes rechecked, backend and retained Settings sources unchanged; intentional view/test/locales/docs revisions listed. Incoming API/review/Designer artifacts untouched.
- Intermediate initial0-test failure was my localization insertion typo, fixed before checks. Source-journey fixture initially lacked required schema_version/inactive status semantics and history metadata stub; corrected fixture, did not relax reader. A real passive Member watcher erased unavailable selection; removed along with passive root runtime fallback, preserving deliberate edits and truthful blocking. Fresh-reference error diagnostic was retained for existing consumers. Intermediate failures are not claimed as passing validation.

## API round2 — completed Fail84.3%
See api-r2/README.md and canonical API report/revision API-REV-002. F001/F002 actual resolution, new standalone Team F003 preservation discrepancy, exact real UI/transport/tree evidence. No actual all-pass or Delivery claim.


## CRR-005 focused failure-origin evidence
- `crr005-owner-probe.spec.ts` / `crr005-owner-probe.log`: reviewer diagnostic confirming stale Team view after successful canonical Save, before any field mounts; canonical-source control retains low.2 tests Pass means defect-path assertions proven, NOT acceptance Pass. Temporary installed test removed; see report for reproduction path/command and controlled wire limits.
- `crr005-attribution.json`:13 relevant owner modules byte-identical to pinnedHEAD; all34IR002manifest files unchanged. This supplements isolated causal evidence, not originalHEAD live execution.
- Canonical result is ../code-review-report.md CRR005 Fail/DesignImpact; APIREV002 OrgF001/F002 actual resolutions retained.


## IR-003 current local implementation evidence
DS-007 / ARCH-REV-003 / CRR-005 F-003; see current implementation-handoff and revision record. F-001/F-002 resolved actual API-REV-002 preserved; API overall still Fail84.3% confidence pending independent F-003 retest.
- ir003-current-tests.log:252tests/23files current pass, real-owner Save→Back→both Plus consumers→fresh seed/draft→ordinary Create transport regression plus shared controls.
- ir003-build.log:production16routes pass; ir003-build-prerequisites.log normal shared package build prerequisite. Temporary route excluded.
- ir003-guards.log:boundary guards/diff check pass. ir003-typecheck.log:vue-tsc absent, NOT a strict-check pass.
- ir003-source-manifest.json:42cumulative files; ir003-preservation.json32/34IR002files exact, only locales extended. Backend untouched, not rerun.
- ir003-render/:synthetic IO renderer/self-check only; real full-app/native/remaining capability validation still API owner.
- Intermediate ir003-initial.log/ir003-journey.log preserve harness failures, corrected before final run: old mock lacked selection intent; deliberate rejected Create transport produced unhandled event rejection, replaced with simulated successful transport and real frontend hydration/publication. No production error swallowing.


## CRR-006 source re-review evidence
- `crr006-web.log`: independent23files252testsPass.
- `crr006-source-audit.json`:42manifest hashes exact,32/34IR002preserved,27productionthreshold rows; F004 helper/resolver unchanged againstbase.
- `crr006-seed-fidelity-probe.spec.ts` / `.log`: real stopped-Team Settings command with controlled wire/modeloptions→freshcanonical loader→seed→ordinary launch records; same-model controlPass, different-model/equal-low parametersFail (null). Source diagnostic, NOT actual provider/browser acceptance. Temporary test removed; restore to services/runConfigEditing/__tests__/crr006-team-seed-fidelity-probe.spec.ts to run command in report.
- `crr006-seed-fidelity-probe-setup-error.log`: initial wrong serializer call signature; invalidated reviewer harness error, not a production failure. Final log above uses correct signature and real Settings Save.
- Current canonical CRR006Fail/LocalFix F004; F003freshness source-resolved, original Org fixes remain actualAPIresolved.


## IR-004 local F-004 correction
CRR-006 Local Fix under reviewed DS-007. ir004-before-fix.log reproduces both UI-entry outgoing payload losses (2fail/13pass); no source fix yet at that run. ir004-focused.log records initial29pass after fix. Final ir004-current-tests.log280tests/26files passes (shared pure scope control added). ir004-build.log16routes, guards pass; vue-tsc missing remains not a pass. ir004-source-manifest.json44entries / ir004-preservation.json41of42prior entries exact; only prior TeamCanonicalPlus test extended, new helper/test delta outside prior manifest. No backend rerun. ir004-render is synthetic IO only, not provider/API acceptance; reviewer diagnostic artifacts untouched.


## CRR007 source re-review evidence
- `crr007-web.log`: independent26files280testsPass; includes previous252.
- `crr007-prior-probe.log`: exact prior `crr006-seed-fidelity-probe.spec.ts` rerun against IR004,2Pass (formerly different-model/equal-low failed). Temporary installed test removed; saved source remains reviewer evidence, not durableAPItest.
- `crr007-source-audit.json`:44manifestmatches,41/42IR003preserved,28productionthresholdchecks and unchanged clearingresolver.
- SourcePass is not actualF003/F004APIacceptance; APIREV002 remainsFail84.3 pending owned rerun.
