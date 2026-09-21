# IR-053 — Org-owned Agent cached GraphQL lookup

## Supported scenario / source scope
CRR077 / CR-FIND040 / API31 / API-FIND033 confirms the normal current org_local Org description-edit path was blocked by a null exact direct-Agent query despite an existing physical child. RER033 / cumulative AD025 / DS038 / ARCH022 Pass and REQ037/AC035/SCN023/ORG-CASE064 are unchanged. This is a cache-adapter invariant omission, not a new ownership/API/transition contract.

Source dcc0419dd2dea54ea1ee4d0dca27b48521e68745; entry e99c429317f7e2c14ad6cb4f305413c005c624d4. Two production files/two tests. CachedAgentDefinitionProvider now delegates the existing tagged Org-owned Agent identity family to the same persistence exact-read boundary used for Team-local Agents, rather than checking only the intentionally excluding global catalog. It does not insert exact owned reads in the catalog cache. The identity utility recognizes the encoded tagged family only; it does not extract an Org/child path, establish membership, or bypass the exact physical source index. Raw separators/missing segments and the Team family are not accepted by that classification. All ordinary shared cache behavior remains unchanged.

## Executed implementation checks
| Check | Command / evidence | Result |
| --- | --- | --- |
| Initial test setup attempt | before-fix.log | Failed suite import: initially absent application-sdk-contracts dist; **no tests executed**, not a product reproduction. |
| Prepared pre-fix owner regression | `pnpm --dir autobyteus-server-ts exec vitest run tests/integration/agent-definition/org-owned-cached-graphql.integration.test.ts --no-watch`; before-fix-prepared.log | **3 failed /1 passed**. Actual GraphQL owned reads return null cold, after catalog population and before parent-update case. Shared/Team-local/missing controls pass. |
| Focused current owner/cache tests | Same new file plus tests/unit/agent-definition/cached-agent-definition-provider.test.ts; focused.log | **2 files /14 tests Pass**. |
| Current affected server cohort | `PATH=/tmp/aorg-ir035-bin:$PATH pnpm --dir autobyteus-server-ts exec vitest run $(cat /tmp/aorg-ir053/server-paths.txt) --no-watch`; server-cohort.log | **40 files /222 tests Pass**, exit0. Includes focused14 and prior35/203 plus relevant Agent service/discovery checks; overlapping totals are not added. |
| Server production build/typecheck | `pnpm --dir autobyteus-server-ts build:full`; server-build.log | **Pass**, exit0: clean compiled build, TypeScript, managed assets and sanitized built-module/bootstrap smoke without DATABASE_URL. |
| Source whitespace / size | Explicit staged4-path `git diff --cached --check`; source-inventory.json | Pass. Changed production maximum102 nonempty lines; no >500 or >220 production delta. |

## Actual owner composition regression
`org-owned-cached-graphql.integration.test.ts` writes valid disposable **current unversioned/org_local Org**, shared Agent, Team-local Agent/Team and bundled direct-Agent files through the actual file providers. `createBundleBackedDefinitionServices` is the same composition used inside HostDefinitionServices and constructs actual FileAgentDefinitionProvider -> AgentDefinitionPersistenceProvider -> CachedAgentDefinitionProvider -> AgentDefinitionService. Actual Studio service registration, AgentDefinitionResolver, converter, type-graphql schema and GraphQL query execution are used; none of these owners or returned Agent data are mocked.

Only path configuration and empty external application enumeration are controlled. Unrelated Studio service methods are fail-on-use placeholders, not activated runtime services. This exercises the ordinary GraphQL operation in process, **not a launched HTTP server, real browser Save or provider/runtime journey**.

Four cases (parameterized cold/preloaded plus2 others) prove:
- exact Agent ID/name/description/instructions and matching ownerOrgId/name through GraphQL, with and without prior catalog query/full cache population;
- global GraphQL list and shared cache remain free of the owned child after lookup; existing shared/Team-local identities, owner fields and content remain correct;
- genuine missing, unreferenced physical child and mismatched owning-Org references remain null, with exact source membership authoritative;
- legitimate atomic parent Org rename and removal are observed by later exact child queries without a second cache, stale result, refresh/retry or global insertion;
- read-only cases preserve all actual fixture file bytes. Intentional parent-update test writes only its disposable fixture through the existing atomic provider.

Cache unit coverage separately proves nonpopulation/noncontamination, current missing results, persistence-error propagation, existing shared/Team-local contracts and tagged-family classification without path inference. No successful read is inferred solely from a direct File-provider or synthetic GraphQL reply. No relaxed admission or UI Save guard is introduced.

## Scope / rendering / environment limits
- Backend-only cache/read correction. Frontend sources, query declarations, Save validation, rendered copy/layout and normal page-navigation behavior are unchanged. No new frontend suite/build/browser/native-render pass is claimed in IR053. API31's actual CR-FIND039 navigation pass is retained at its recorded desktop/narrow/en/zh scope, not re-executed here.
- API/E2E must still run actual cold description Save/reopen and full current-artifact acceptance. The local composed GraphQL success is narrower than that real browser outcome. API31 remains Fail72.1/incomplete.
- Built initially absent application-sdk-contracts and application-backend-sdk prerequisites (prerequisites.log); removed both after suite/build. No frontend SDK prerequisite created. Initial import failure is setup-only; prepared before-fix regression then failed as intended. Expected negative-test errors, SQLite/dependency/bootstrap messages remain visible; no logging suppression.
- Repository test global setup resets only its designated disposable `autobyteus-server-ts/tests/.tmp/autobyteus-server-test.db`. New fixture roots are mkdtemp children under /tmp and removed after each test. No actual installation cutover, live run/Restore, provider call, user data or DR009 app mutation.
- completion-integrity.json:18,355 baseline other-owner regular-file hashes unchanged; prior IR05027/IR0518/IR0523 source/test paths unchanged. Pending API-owned model probe remains untouched and marked separately in cumulative759-path source inventory. Source-bound docs, Reviewer/API/Delivery records and raw DB/env/key evidence preserved; only safe implementation evidence staged.

## Remaining acceptance / authority boundaries
Fresh cumulative source review, then full renewed API/E2E, not delta-only. API31 full41groups:5Pass/34NotTested/1Fail/1N/A; reported347mainfiles/2110tests and24commands are scoped historical executable evidence, with Electron/focused overlaps not additive. Full authoring/export/config/files/provider/task/message/status/model/VAL054–058/recovery/restarts/Restore/compaction/title/auxiliary migration/frozen-shutdown groups remain held. No provider/root launch happened in API31. Pending API model probe +13/-2 still requires successful proportional review. CRR059/067, IR041, DR007/009 and unknown historical stalls/API20 first guard/delay limits remain. Original Team-unavailable symptom is gone, but full Save acceptance is not yet execution-resolved by this local record. IR049 terminal-family/old-locator actual-installation transition decision remains separate before cutover; no coding hold, reset/replay/new migration ID or rollout authorization.
