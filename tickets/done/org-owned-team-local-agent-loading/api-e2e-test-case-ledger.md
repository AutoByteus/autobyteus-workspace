# API/E2E case ledger — ORG-LOCAL-AGENT-20260916-001
Initial round, initialized before execution. Canonical report remains round authority.
|Case|AC|Expected|Status|
|---|---|---|---|
|R01|001–004|Real-source and cache regressions|Pass|
|R02|001–004|Adjacent preservation suite|Pass|
|R03|001/004|Current real server build/setup|Pass|
|B01|001/002|Actual startup/registration/reload/catalog/detail, ownership/no eager runtime|Pass (read boundary)|
|B02|004|Ordinary owned member launch/Send and enclosing instructions|Fail F-001; Send Not Tested|
|B03|003|Missing-reference/isolation/shared controls|Pass (read/config control)|
## Checkpoints
- Intake complete; no source/test modifications by API. Upstream generated SDK outputs present and preserved.
- R01 Pass25/2files, api-narrow.log; real providers/cache, no live acceptance inferred.
- R02 Pass169/15files, api-adjacent.log (includes R01; not additive). Temporary Vitest config removed. R03 currentbuildPass with sanitizedsmoke, api-build.log.
- Broadersetup fresh private .local/api-org-local, synthetic data Alpha/shared-control; external Beta and missing-worker Broken not yet registered. Actualfrontend will register externalroot; sourcehashes recorded. Ports50681backend/50682observer/50683Nuxt, minimalHOME/env and no credentials; SDKdistpreservedatintake.
- B01 partial Pass: startup Alpha and Shared Control admitted, Alpha detail resolves ownedGuide, ownedSquad and SquadWorker through actual GraphQL. No run/Send yet.
- B02 Fail F-001/AC004: normal Alpha detail Run→configuration, selected gpt-5.4-mini and TempWorkspace, still explicit cannotresolveTeam '/group' (agent-org-owned-team:readfix-alpha:squad); Run Agent Org disabled. Actual alpha-launch-failure.txt/.png. No directAPI workaround. Initial Nuxtdependencyoptimization reload and CUA AXcache stale view were setup/toolobservations; fresh DOM provided actual failure. External and shared controls next to bound origin.
- B01 external import initially rejected Org-only top-level layout (normal package contract requires agents/agent-teams/applications). Added empty external/agents directory to synthetic fixture, no authored file edits; UI import and Reload succeeded. Catalog Reload now shows Alpha/Beta/Shared Control; Broken remains excluded. Beta detail resolves exact Beta Guide/Squad/Worker. Evidence external-import-layout/import-reload/catalog and beta-detail. B02 external repetition also Fail F-001 with selected gpt-5.4-mini, same exact-owned-Team resolution alert and disabled Run; beta-launch-failure.txt/png. No runtime or provider Send attempted.
- B03 Pass at scoped catalog/configuration boundary: Alpha/Beta distinct detail identities despite identical squad/worker local names; Broken excluded; shared Team control with same gpt-5.4-mini/TempWorkspace produces enabled Run Agent Org and no resolution error (not clicked). Shared Teams contains only Readfix Shared Squad; shared Agents contains only Readfix Shared Agent plus two built-ins, no owned guide/workers. Evidence shared-control-launch.txt and shared-{team,agent}-catalog.txt. No shared or owned run launched.

- Final:30/30 authored hashes and7/7implementation source/test hashes unchanged. No runtime create/Send in actual browser transport and all three persisted run-history indexes empty; not a direct active/candidate count. Browser/provider-model discovery distinguished from runtime startup. Cleanup owned tab closed and all three ports closed. API-REV-001 Fail77.9%; canonical report reconciles all cases; no running cases.

## Round 2 — IR-002 retest initialized before execution
Prior completed table/checkpoints above are API-REV-001 history, not current rerun results. Current report remains API-REV-001 until round completes.
|Case|Round2 plan|Status|
|---|---|---|
|R04|Owned launch16 then adjacent frontend81 current tests|Planned|
|R02|Backend169 preservation|Planned|
|B02|F-001 first: Alpha/Beta Run/Create then mounted Send/instructions|Planned|
|B01|Real read/hash/nonpublication/laziness preservation|Planned|
|B03|Missing/shared/isolation controls|Planned|
- R04 narrow owned-launch16/1file Pass exit0, api-r2-narrow.log; now adjacent frontend.
- R04 adjacent81/11 Pass exit0 (includes narrow16), api-r2-adjacent.log. R02 backend preservation next.
- R02 round2 backend169/15 Pass exit0, api-r2-backend.log; temporaryconfigremoved. Manifest15hashes match and old module absent. Services resumed only prior owned data; B02 next first browser journey.
- B02/F-001 Alpha actual direct catalog Run (no detail), selected same gpt-5.4-mini/TempWorkspace: enabled, actual Run click created Org. Focus mounted group exposes lead Offline and guide remains Offline. alpha-ready/created-lazy evidence; runtime Send still pending.

- B02 Beta normal Create succeeds after exact reads. Ordinary mounted worker Send once reaches native runtime; only Beta lead Idle, other members Offline. Actual Activity system instructions include exact AGENT_INSTRUCTION_Readfix_Beta_Squad + TEAM_INSTRUCTION_Readfix_Beta_Squad and /group/lead. Provider response blocked by missing OPENAI API key, not F-001. No key borrowed. Observer credential/settings redaction added before any possible user credential setup; observer-only restart does not restart backend.

- USER STOP: round2 interrupted at explicit request. Owned backend/frontend/observer sent SIGTERM; no further test or provider action. F-001 launch retest succeeded for Alpha/Beta, native instruction markers observed; real provider response not completed (missing key). No API-REV-002 final result or handoff claimed.

## Round2 resumed on IR-003 — user continue
R04 narrow catalog/exact+owned-launch and expanded263 rerun planned; original backend7hashes validation before carrying169/15. B02/F-001 first on actual current frontend/owned backend, then B01/B03. All interrupted IR-002 evidence retained; latest completed result remains API-REV-001 pending current completion.
- IR-003 R04 narrow23tests/2files Pass (store7+owned launch16), api-r3-narrow.log; broader263 next.
- IR-003 R04 expanded263/35 Pass exit0 (includes narrow23), api-r3-consumers.log. Manifest35/35 exact, old module absent, original7backend exact so independent round2 backend169/15 carried. Owned actual services health200; browser B02 next.
- IR-003 B02/F-001 retest: fresh Alpha and imported Beta direct catalog Run, same model/workspace, actual Create succeeds for both without detail visit; Alpha focus leaves both members Offline. alpha/beta-ready and alpha/beta-created evidence; provider status still Not Configured, user setup requested without secrets in chat.
- IR-003 B02 current-source ordinary Send once each Alpha/Beta reaches native worker and Activity system instructions: exact Agent/Team markers and /group/lead confirmed. Both display OPENAI key missing, no completed provider response. F-001 resolution confirmed at actual Create/runtime read boundary; final B02 remains environment-limited pending credential, not a new implementation failure. DOM alpha/beta-send-credential-block and alpha/beta-instructions.

- B01/B03 IR-003 preservation: actual catalog/package Reload; Beta detail exact ownGuide/Squad/Worker; Broken remains excluded; public catalogs omit all owned children; shared configuration same model/workspace enables Run.35source and30authored hashes exact. Runtime proof shows one user trace per freshly sent worker and exact owner Agent/Team markers, no opposite-owner marker. Provider response remains credential-blocked. Services retained idle solely for requested user credential setup; no automatic resend.

## Round2 reconciliation — API-REV-002
R04 Pass263/35current (includes23/2narrow); R02 Pass169/15carried under7unchangedbackend hashes; B01/B03 Pass bounded current read/config controls. F-001 resolved for current Alpha/Beta ordinary Create/Send/native instructions. B02 full response Blocked: isolated OPENAI key absent; no new product failure. Final confidence88.6%, canonical report authoritative. Current services/tab retained idle for requested user setup, not cleaned; no ongoing automated test/inference.

## Round3/API-REV-003 initialized — credential unblock
Prior completed result API-REV-002 Blocked88.6%, F-001 resolved. User authorized credential import from named .env into owned test DB. C01 documented dry-run/exact-target import; B02 first actual Alpha/Beta provider response after ordinary UI Send; C02 cleanup/hash final verification. No secret values in logs/reports. Prior evidence remains canonical until round completion.

- C01 Pass: documented pnpm secrets:import dry-run and confirmed exact test DB; CONFIGURED9/SKIPPED0/REPLACED0, no pending Prisma migrations. Source handled read-only by importer, no secret values captured. Backend restarted PID76955, /rest/health200; actual OpenAI UI Configured. r4/import-preview.log, import-result.txt, configured-status.txt.

- B02 Alpha Pass: retained current IR003 run reopened Offline without activation; one explicit new UI Send returns real gpt-5.4-mini answer with both exact Alpha Agent/Team markers, no Beta marker. Guide remains Offline, lead Idle, zero messages/tasks. UI Stop then root Stopped/lead Offline with response retained. r4/alpha-retained-before-send.txt, alpha-response.txt/png. Beta pending next.

- B02 Beta Pass: identical ordinary retained-worker Send yields actual exact Beta Agent/Team marker response, no Alpha marker; lead Idle/guide Offline and zero messages/tasks. UI Stop leaves root Stopped/lead Offline and answer retained. r4/beta-response.txt/png, beta-stopped.txt. Credential blocker resolved for both placements; C02 evidence/hash/cleanup next.

- C02 Pass: source35/35 and authored30/30 unchanged; both traces exactly2 distinct user inputs/1 authenticated assistant answer, owner exact. Owned UI Stop both, tab closed, PIDs76955/74838/74853 terminated and all three ports closed. No vault/source secrets in evidence. API-REV-003 Pass95.0%; current report supersedes prior Blocked88.6%, all cases reconciled/no running tests.
