# IR010 local checks and limits

Basis: CRR014/CR008/API-F007-UNSAVED, ApprovedSR025/DEC017, technicalSR023/ARCH007.
Only frontend draft ownership changed. Current API007 Fail82.14% is NOT superseded
by these implementation-scoped results. No NFS/VM/Docker/desktop-shell execution.

## Commands and observations

All commands run from the task worktree. `run-check.py` gives commands fresh owned
HOME/TMPDIR and only PATH, LANG, CI, NO_COLOR. Node22.23.1 / pnpm10.28.2 on macOS.

- Before modification: `pnpm -C autobyteus-web test:nuxt components/fileExplorer/__tests__/FileExplorerTabs.unsaved.spec.ts components/fileExplorer/__tests__/FileExplorerTabs.spec.ts --run --maxWorkers=2`.
  Exit1, 3Pass/1Fail, exact peer-content-for-draft Save mismatch. Raw log retained.
- Focused after change: same command plus `components/fileExplorer/__tests__/FileExplorerTabs.draftViewer.spec.ts`.
  Exit0, 3files/12tests. Original failing regression unchanged. Existing listener
  controls retain keyboard behavior; obsolete invisible-context-menu click
  assertions removed with the dead implementation.
- Final adjacent regression: `pnpm -C autobyteus-web test:nuxt components/fileExplorer/__tests__ components/fileExplorer/viewers/__tests__ stores/__tests__/fileExplorerStore.spec.ts stores/__tests__/fileExplorerNodeRouting.spec.ts utils/fileExplorer/__tests__ --run --maxWorkers=2`.
  Exit0, **22files/148tests**. Includes FileViewer/Monaco, previews/HTML resources,
  node routing, store and path/tree utilities. Nuxt happy-dom, no live server/NFS.
- `pnpm -C autobyteus-web guard:web-boundary` and `guard:localization-boundary`: exit0.
- `git diff --check`: source clean. Full app production packaging/typecheck,
  Electron shell and independent API/E2E not run; current Nuxt compilation and
  actual browser renderer cover the changed frontend implementation boundary.

New 8-case component suite uses REAL Tabs, FileViewer, Pinia, refresh and write
orchestration. Monaco's native editor is a textarea double and GraphQL is a
controlled promise boundary. It verifies visible model binding during a held
refresh, empty draft, clean/undo reader, tab/workspace binding, already-open
reopen and remount, Zen/preview/read-only, failed/pending Save, refresh errors,
and existing explicit-close discard. It is not by itself native-editor proof.

## Rendered feedback loop

`node tickets/in-progress/shared-network-workspaces/implementation-evidence/ir-010/render-check.mjs render-3`
uses the TESTING.md Nuxt fixture-browser surface. Fixture installed temporarily
under `pages/ir010-draft-check.vue` with exclusive creation; current production
Tabs/FileViewer/Monaco and Pinia execute. Owned loopback health server, mocked
GraphQL response/Save transport, supplied idle WebSocket boundaries and a fixture
button emitting the established peer-modify event. Native Chrome keyboard input
(Meta+A/type/Meta+S), not direct draft/model mutation. No external runtime/model.
This is a narrow implementation renderer check, NOT public mounted-node proof.

Final **render-3 Pass**, 8 recorded states, no browser page errors. Local draft
visible during/after held peer fetch; open path/tab/Files/Zen remounts retain it;
Save sends exact LOCAL DRAFT to the controlled transport and shows Changes saved;
subsequent clean read updates to FRESH CLEAN READER; Markdown preview shows
committed peer bytes and returning to edit restores SECOND DRAFT. Screenshots
and model/DOM receipts inspected at 1280x850 and 700x650: normal controls,
readable draft, unchanged tab/header/preview styles, Zen exit and narrow layout
usable; no in-scope rendered defect remained. Final DOM surface count1.

Attempts retained rather than overwritten:
1. `render-1`: draft/Save controls worked; post-Save peer event was sent inside
   the preexisting 5s own-write echo-suppression window, so the clean assertion
   timed out. Also initial health backend incorrectly pointed to the frontend
   proxy itself (recursive health request), and cold Nuxt emitted transient
   manifest dependency warnings. These are fixture errors, not product fixes.
   During slow Chrome shutdown the exact owned Nuxt process group14700 was
   terminated. Runner then hit ESRCH and stopped before file cleanup. Exact
   fixture/scratch were manually removed after process exit; corrected receipt
   retained. No unrelated process was killed.
2. `render-2`: separate owned health endpoint and wait past existing echo window;
   Pass. Immediate model read preceded paint in two remount captures; narrow
   screenshot showed a transient redraw fragment. No production change made.
3. `render-3`: wait for settled paint before snapshots; all8 states Pass and
   final images/DOM inspected. No duplicate surface/fragment remains. Node probe
   exits only after recorded owned-resource cleanup. Normal Nuxt prebundle warmup
   reload precedes assertions; not credited as a product reload guarantee.

Expected negative-test errors and KaTeX happy-dom warnings stay in raw test logs.
Baseline Vitest diagnostic trailing-space lines are retained as raw evidence;
source/docs do not receive a whitespace waiver. The staged artifact check with
only `-blank-at-eol` additionally reported terminal blank lines in focused-1.log
(line83), regression-final.log (line362) and render-1/nuxt.log (line101). The
shell continued to commit; these three raw-log EOF exceptions are now explicitly
recorded with the two baseline diagnostic lines. Artifact-only recheck disables
both blank-at-eol/blank-at-eof; this is not a source whitespace pass substitute.

## Boundaries, cleanup and preservation

Drafts are scoped to the workspace's open-file session, not persistent recovery
state. Deliberate directory/content refresh and reopening an already-open path
must not erase them. Explicit tab close still discards, and full page/app restart
is not a new persistent-draft guarantee. No merge/conflict arbitration or remote
notification promise. Read-only/media previews stay on committed bytes.

No release candidate/engine rebuild, CLI metadata regeneration, provider or user
credential access, mounts, VMs or Docker actions. All50 protected incoming files
and 309 preexisting candidate/dist files unchanged; original input56 recorded
before edits. Existing IR001–009 history byte prefix preserved. All own test
HOME/TMPDIR, browser contexts, health/Nuxt servers and temporary page removed.
Only own evidence and intended six source/test/doc files are included; no legacy
cumulative index recreated. See `source-audit.json` and per-run cleanup receipts.
