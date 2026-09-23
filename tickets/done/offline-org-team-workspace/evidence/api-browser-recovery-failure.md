# API-F001 — first metadata-only Files recovery recurses

2026-09-22, API-REV-001. **Fail**, AC-005 / REQ-005,007 (C09 safety also maps AC-004). Worktree HEAD 3a52e67ba72ee53497f5d9492f406289f23f28f3, reviewed base da86efe07f7f71e7455db6a866286af0bf0debd7. No production edits by API owner.

## Exact observed journey
1. Own backend via project startBuiltTestServer and unique persisted runtime/database; Nuxt web renderer on 54451. Chrome2 owned tab1211481973. Proxy56211 forwards HTTP/WS to own55566. All real GraphQL/persistence/files endpoints; only GetWorkspaceMetadata for one own target is faulted. No hidden store/browser mutation.
2. Open stopped Claude Org history, select /team/lead, New Agent creates unrelated Org launch draft rooted A, then reselect history /team/lead. Keep composer `UNSENT-COMPOSER-PRESERVE-API-C09`. Files not yet opened for this selected member in the reloaded renderer.
3. Edit Config → Member overrides → mounted Team → New D → Save. Backend accepts once, canonical Team/all children D, Org remains stopped. Proxy returns GraphQL error `API-E2E controlled metadata unavailable` for D metadata.
4. Back → Files: exact status `Workspace details are unavailable. Refresh or reopen Settings to load the saved workspace.` Neither tree nor editor renders. Composer retained. Activity→Files and Cmd+S do not reveal/write A/C.
5. Remove metadata fault (empty fault JSON); reopen Edit Config. No second Save. Requests: 09:59:29.174Z AgentOrgRunConfig, 09:59:29.183Z GetWorkspaceMetadata D, 09:59:29.213Z CreateWorkspace D, 09:59:30.097Z GetFolderChildren D.
6. **Expected:** target D activates once, loading finishes, user can explicitly open D/ui.txt. **Observed:** `Loading workspace…`, `No file selected`, no file rows, remains stuck across later observations until user toggles Activity→Files. Browser console error at 09:59:30.059Z and .060Z:

    Maximum recursive updates exceeded in component <FileExplorer>. This means you have a reactive effect that is mutating its own dependencies and thus recursively triggering itself. Possible sources include component template, render function, updated hook or watcher source function.

7. Workaround Activity→Files recovers D; explicit ui.txt open and Cmd+S writes `UI D explicit save verified\n` to D only. Actual editor is Monaco; semantic native-edit-context fill/click was unsupported, so screenshot-grounded canvas click plus native keys was used and rendered Changes saved verified.
8. Prior-mounted branch: enter dirty D buffer `DIRTY D MUST NOT SAVE AFTER SWITCH`, fault E metadata, Team Save E. Whole tree/editor unmounts; composer preserved; tab reactivation and Cmd+S do not save dirty D. Remove fault, reopen Settings: **same recursion at 10:04:41.317Z**, still Loading. No old buffer restored. Only two config writes (D and E) and one file write (explicit D save) across the entire fault experiment. This protects stale writes but fails recovery readiness.

## Independent durable reproduction, no live backend/proxy
`pnpm -C autobyteus-web test:nuxt components/fileExplorer/__tests__/FileExplorer.metadataActivation.spec.ts --run`

1 file /1 test fails, exit1, same recursive-update error, plus one unhandled rejection. Real FileExplorer+Pinia+workspaceMetadataActions; external transport is deferred to model HTTP registration and file stream is stubbed. Seed only metadata, not an already-registered workspace. Resolve transport and require loading to finish without recursion. No provider, proxy, absolute local path, or browser extension involved. Log api-files-activation-regression.log.

## Preliminary origin, not final ownership
FileExplorer.vue and workspaceMetadataActions.ts are unchanged from review base to reviewed commit (empty git diff). The new flow exposes a real consumer gap: existing composed regression explicitly register('B') before recovery and never exercises metadata-only activation. Hypothesis: ensureWorkspaceMetadata caches a fresh metadata object; FileExplorer's array-returning watch source invalidates itself and calls registration again before HTTP settles. Later explicit-workspace early return can leave the latest activation sequence loading. This hypothesis is not an implementation fix or final failure-origin ruling. Code Reviewer should confirm bounded implementation ownership vs prior-source origin.

No new approved-behavior ambiguity. Do not bypass the whole-consumer gate, drop retained context, reset providers, or reinterpret temporary unavailability as successful recovery.

## Evidence
- api-c09-checkpoints.json: canonical states, counts, no stale write assertions.
- api-proxy-requests.jsonl: actual GraphQL operations/timing including both faults and successful retries.
- api-final-fixture-audit.json: final inactive canonical E, D unchanged after unsafe-save attempt, C/E contents.
- api-files-activation-regression.log: independent failing repository reproduction.
- Browser DOM/console excerpts above transcribed directly from CUA observations. Screenshots were inspected in tool output; no persisted screenshot file is claimed. Chrome content export was unsupported.
- api-cleanup.json: fixture resources removed; test can be recreated via retained scripts; no user data/store touched.
