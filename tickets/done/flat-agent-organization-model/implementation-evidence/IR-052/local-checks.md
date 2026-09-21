# IR-052 local implementation validation

## Basis / bounded correction
CRR075 / CR-FIND039, supported Product RV012/VIS004–006 normal Org -> bundled flat Team -> SHARED member Agent -> Back to Team -> Org inspection. RER033 / cumulative AD025 / ARCH022 Pass remains authority, cumulative Large/High. CR-FIND038 exact owned-reference fix remains unchanged and source-resolved, not yet API execution-resolved.

Source a1ce590b859518d813cbd35dbaf8294b58aa97f1, entry artifact f09cd68c3804b06752762db0b86cbf39f23bf5d5. Two page owners preserve the existing optional returnToOrg query alongside exact returnToTeam and Agent IDs. Team page captures its current explicit Org return context when opening a member; Agent page forwards it back to the same exact Team and retains it with Team context on non-list navigation. Existing ordinary list navigation drops return context. Detail components continue emitting exact subject IDs; no inferred parent, new store/cache, global owned-definition exposure, resolver relaxation, schema/ownership/API/migration or Run/Edit policy change.

## Checks
| Evidence | Command / scope | Result |
| --- | --- | --- |
| before-fix.log | `pnpm --dir autobyteus-web test:nuxt --run pages/__tests__/org-definition-navigation.spec.ts` before production edit | **1 failed / 1 passed**. Full Org journey observes missing returnToOrg at the actual Agent-page navigation; standalone control passes. |
| focused.log | Same2 tests after correction | 2 Pass, but fixture omitted two server-settings sibling fields; warnings retained and corrected before final cohort. |
| web-cohort.log | `PATH=/tmp/aorg-ir035-bin:$PATH pnpm --dir autobyteus-web test:nuxt --run $(cat /tmp/aorg-ir052/web-paths.txt)` | **91 files / 743 tests Pass**, exit0. Includes the prior90/741 cohort and the2 new page-handler cases; overlapping runs not summed. |
| web-build.log | `pnpm --dir autobyteus-web build` | Production build /16 routes; completion result recorded in handoff. Temporary diagnostic page removed before this command. |
| guards.log | web boundary, localization boundary, mandatory localization literal audit | Pass / **zero unresolved findings**. No copy change. |
| Source integrity | explicit3path staged diff check and source-inventory.json | Clean whitespace; maximum93 nonempty changed production lines, no >500/>220 signal. |

### Durable production-shaped regression
`pages/__tests__/org-definition-navigation.spec.ts` mounts a route-driven host selecting the **actual Org, Team and Agent pages**, actual detail components/buttons/page handlers, real Pinia definition stores and real ApolloClient/InMemoryCache. External GraphQL, readiness/workspace I/O and router transport alone are controlled. No page navigation, definition getter, component or Back handler is replaced by a spy.

The Org fixture owns a flat Team whose coordinator is a shared Agent, matching the supported package class. A same-name shared Team is also in the catalog; the owned Team is not. Assertions traverse all five stages via real buttons, prove exact emitted queries, exact Agent instructions and returned Team/Org detail, global getter stays null for the owned ID, only read operations occur, and no not-found view. Standalone shared Team -> Agent -> Team -> catalog remains free of Org query state. Existing15-case cold owned authoring test remains unchanged in the cumulative cohort; strict wrong owner/ID/scope/missing endpoints, Save/reopen and pending drafts retained.

### Iteration / evidence limits
- Initial pre-fix and first passing focused fixture returned only getServerSettings, omitting effective compaction/flush sibling fields. The final fixture supplies all three current query fields; no production parser, errors or logging were weakened. Initial warnings remain in logs. Existing Apollo canonizeResults deprecation remains visible in current tests.
- A broad initial instruction-file discovery command traversed unrelated evidence too slowly and was interrupted (exit130); relevant known instruction paths were read directly. It edited nothing.
- Nuxt development renderer emitted generated app-manifest import warnings while the local test harness regenerated Nuxt output. Final browser journeys passed without pageerrors; production build was run separately after tests/renderer and temporary-page cleanup. KaTeX/Browserslist/module-type warnings are not suppressed or misattributed to this navigation fix.
- No new server suite/build, full vue-tsc, live server/provider, native Electron, user verification, deployment or migration execution is claimed. Two new local tests and browser controlled-I/O journeys are not downstream API/E2E signoff.

## Rendered feedback loop
Actual Chromium at1440x900 and390x844 using actual Org/Team/Agent pages, Pinia/Apollo and router. A temporary Nuxt development renderer binds controlled GraphQL data and redirects the normal three destination paths into that single host; it records **original page-emitted routes/queries before remapping**. `render/fixture.vue`, `inspect.mjs`, `evidence.json` and6screenshots preserve the setup and outcomes. The diagnostic host performs no navigation reconstruction or scope injection.

Both full journeys pass Org catalog/ViewDetails -> owned Team -> shared Agent -> exact same Team -> original Org. Agent instructions visible; exact returnToOrg/returnToTeam survive; narrow Back uses focused keyboard Enter; returned Team preserves Back to Agent Orgs and is never inserted into global catalog; all I/O is reads, no pageerrors. Returned Org has no horizontal document overflow. Screenshots of Agent, returned Team and returned Org were captured for each viewport; directly inspected desktop Agent and narrow returned Team. Existing card/header/member/control style and established title truncation remain; no UI redesign. Chinese/browser-history reload/Team-local member/Run/Edit policy/parallel navigation scenarios were not newly executed or inferred from these cases.

## Preservation / cumulative obligations
All17,953 starting other-owner regular-file hashes are preserved (completion-integrity.json). All8 IR051 and27 IR050 source/test hashes remain unchanged. Only the two page sources/new durable test and safe implementation records/evidence belong to this round. Pending API-owned model probe remains untouched and pending successful proportional review; Reviewer/API/Delivery/source-bound docs/raw DB/env/key evidence and live DR009 remain untouched. Only owned renderer process tree/page and three initially absent SDK dist prerequisites are removed at completion.

Fresh cumulative source review, then full current-artifact API/E2E with this complete page journey and all API30 held groups. API30 Fail73.6/8Pass/30NotTested(partials)/1Fail/1N/A remains historical; four upload/open cases do not establish whole attachment lifecycle. Preserve CRR059/067/IR041/API27/29/DR007/009 and unknown historical stalls/API20 first guard/delay. IR049 actual terminal-family/old-locator installation constraint is still separate before cutover; it does not block this code. No live data migration/reset/replay/new migration or final readiness authorized.
