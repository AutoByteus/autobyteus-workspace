# IR-056 — Ordinary uploaded basename presentation

## Trigger and authority
CRR083 / CR-FIND043 / API34 / API-FIND036 / AAV003, under RER033 / cumulative AD026 / ARCH023 Pass. Cumulative Large/High Reviewed, inherited focused Medium/High package; the current delta is a small presentation Local Fix, not a new design or persisted-data decision. Entryef61b2ac95c2166d3690bc797ee1d3ef4fa9ed16; source **0f1986dcdd254105feab8b4cfdf255e36cfe8fc3**.

Supported normal Workspaces Org→Tasks→exact task Agent upload/Send/reply/Accepted/cold return retained the exact attachment row/owner/bytes but displayed ctx_<token>__name.txt. AAV003 clarifies existing human-facing label parity, not raw-fact mutation. API34 establishes real reachability. Page mapping consequence was a Reviewer source diagnostic, not a separately executed paged-UI failure.

## Implementation and boundaries
One production file: utils/contextFiles/contextAttachmentModel.ts, hydrateContextAttachment's existing recognized-upload branch. Only an explicit name exactly equal to that upload's decoded stored filename or URI basename uses the existing stored-filename formatter. Genuine custom names, including different prefix-like custom labels, remain unchanged. Formatting removes only the recognized storage prefix; an original filename itself beginning ctx_ remains intact after that one prefix. Non-upload workspace/external naming stays unchanged. Missing names retain the prior formatter policy. Encoded and decoded storage basenames work for all existing Agent/Team/Org draft/final routes.

No raw name, URI, storedFilename, attachment ID/type, ownership, equality or Open path change. No global prefix stripping, lookup/cache, backend/schema, accepted replay, migration/backfill/raw repair. Unknown and media behavior retained. One production file292 nonempty lines; production delta5 additions/1 deletion, below500/no >220 signal. Shared design health remains the reviewed bounded missing-invariant correction, not another attachment recording design issue.

## Durable regression and test ownership
New server tests/fixtures/recorded-upload-labels.ts constructs an actual ordinary ContextFile WITHOUT a custom filename, partitions/codes one actual RawTraceItem, then uses the real raw normalizer/replay/conversation/page projections. It returns read DTOs to the new web UserMessageStoredUploadNames test: initial, serialized cold and page hydration → existing shared UserMessage → exact title/aria label/click. The fixture is server-owned test construction, not a production server dependency, provider dispatch, filesystem or Accepted lifecycle assertion. Ten cases per surface: Org/Agent/Team ordinary, custom, custom-prefix, original-prefix, external, workspace, Unknown and image. Raw/saved JSON bytes, URI and original event identity remain unchanged. Window Open is bounded, with exact unchanged URL assertions. Existing witness/equality/media/custom-name tests remain.

The existing model regression adds six route cases for encoded/decoded/null names, exact stored IDs/locators and nonmatching custom-prefix names. No new API/E2E lifecycle test is claimed. All THREE pending API test deltas remain untouched: recent-run-projection-graphql.e2e.test.ts, team-memory-explorer-service.test.ts, existing-run-model-config-probe.mjs. Their setup fixes/execution are API34-owned and need later successful proportional review.

## Executed local checks
| Check | Result |
| --- | --- |
| Before fix | before-fix.log:2files,9Fail/3Pass. Both initial/cold/page composed tests and all six route cases reproduce prefixed-label failure. |
| Initial focused | focused.log:3files/16tests Pass after production change. |
| Test boundary correction | guards.log FAIL: initial web test directly imported core construction. Moved core/raw/projection fixture ownership into server tests/fixtures and left web consuming its read DTOs; no guard/package exception or production dependency added. |
| Final focused | focused-final.log:3files/16tests Pass with final fixture placement. |
| Final cumulative affected web | web-cohort-final.log:101files/830tests Pass. Earlier same101/830 cohort overlaps, not additive. |
| Guards | guards-final.log: web boundary, localization boundary, literal audit Pass/0 unresolved. Existing module-type warning retained, no suppression. |
| Build | web-build.log:Nuxt production build Pass/16routes, diagnostic route already removed. Production unchanged during final fixture placement. No full vue-tsc/server/core/Electron/native suite rerun claimed. |

Use PATH=/tmp/aorg-ir035-bin:$PATH and pnpm -C autobyteus-web test:nuxt <concrete web-paths.txt> --run, build and project guard scripts. Three normal SDK prerequisites built and removed only because recorded absent on entry. Existing core/server outputs retained.

## Rendered-result loop
40 observations /40 Opens Pass at1502×900 and390×844:10 cases×cold/page×2 widths. Actual UserMessage/shared hydration consumes ordinary ContextFile/raw/projection-generated fixture outputs. Controlled browser file transport returns case-distinct fixture bytes:36 non-image text Open contents match;4 image controls verify the unchanged image URL (not a separate binary-file validation claim). Same selected identity after Open, no textarea/commands/mutations/pageerrors/overflow. Narrow keyboard Enter and focus ring verified. Directly inspected narrow ordinary and custom-prefix screenshots: notes.txt friendly; ctx_custom__literal.txt preserved; readable layout/wrapping.

render/data-generator.mjs, fixture.vue, inspect.mjs/data.json/evidence.json are disposable implementation inspection artifacts, not runtime sources/durable E2E. No actual chooser/Send/provider/task settlement/cold Tasks route or native shell execution in this round. They do not replace API34's real normal-path evidence or renewed full API/E2E. Own43156 dev process/browser stopped; temporary route removed; DR009 process70091/port31009 untouched.

## Preservation and current limits
24,353 other-owner baseline regular hashes unchanged; no missing/unexpected unrelated paths.4-path source and810-path cumulative inventories distinguish three pending API working deltas from committed source. No live data/root/migration/reset/replay/cutover operation. No old API33 association reconstructed.

API34 remains Fail77.1/incomplete:41groups18Pass/21NotTested(partials)/1Fail/1N/A.432 distinct mainfiles2624tests/30successful commands nonadditive;8tasks32accepted full correlations/18accepted inputs; ninth direct-Org task not run,8auxiliary cases scoped, native SDK/gated no-LLM declarations not native execution. CR-FIND042/API-FIND035 is execution-resolved only for new external Accepted task-Agent raw/initial/page/cold/Open. Task-Team normal Stop Interrupted/native/standalone/configured/other-owner lifetimes remain held. API34's two pending test-only setup changes resolve prior9+2 setup failures at their scope, NOT successful proportional review. Prior status/owned Save/return recorded API34 scopes remain; AAV002 complete supported package bounded, Org-only assertion unadjudicated.

Fresh cumulative source review then FULL renewed API/E2E, including familiar label AND exact row/URI/bytes across initial/cold/page/shared Open plus custom/non-upload controls and all held attachments/drafts/newer-edit/focus/cross-view/archive/export/readiness/failure/VAL054–058/model/native compaction/title/locales/strictAPI/inspection/replacement-reconnect/recovery/restarts/Restore/frozenStop/finalUI groups. Three API test deltas require successful proportional review AFTER cumulative API Pass, not N/A. Preserve CRR059/067/IR041/API27/29/DR007/009 and earlier unknown-stall/API20guard/native/outer limits. IR049 positive completed-family/old-locator actual installation decision remains separately Architecture-owned before cutover, NOT coding hold. No Delivery/native/AppImage/user/release readiness.
