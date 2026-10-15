> Historical working checkpoint. Superseded by the completed IR-002 canonical
> `implementation-handoff.md` and `checks-and-limits.md`; pending items below describe
> this earlier checkpoint, not the final implementation status.

# IR-002 working record — not a completed handoff

Resumed from Ready SR019 / ARCH-REV-003 and unchanged Approved SR018. IMP-D001
resolved in design; implemented profiles do not acquire/pin source bytes. Large/High.
No delegation remains: both requested sub-work copies cancelled with no edits,
children, processes or resources. All production work is performed here directly.

Current production work: server shared-run admission, scoped child Git environment,
private linked Claude/Codex/Grok profiles and exact lifecycle, preserved AGY capsule;
Nodes guide; Go service/control/config/platform/backend/Docker preservation; installer,
launcher optional reference and gated release packaging. None is delivery-qualified.

Known remaining work at this checkpoint: finish/service self-review and tests,
installer/launcher selected-reference fixture checks and release workflow/static checks;
normal partial-apply/detach retry handling and exact Docker identity checks; final
build/typecheck/guards/size/secret/artifact audits, development commits and IR002 handoff.
Do not infer implementation-complete from successful slices.

Evidence already complete:
- Stable server unit rerun: 685 passed files +4 skipped; 5396 passed tests +7 skipped;
  server typecheck passed. Earlier broad run retained failures from filtered dependency
  links, async timing expectation and an in-flight-source-edit fixture mismatch.
- Guide: 21 unit/component tests; web/localization guards. Render-2 has eight asserted
  cases, no browser errors, browser/dev/home/fixture cleanup complete. English/Chinese,
  mobile/desktop, actual NodeManager keyboard/route, disabled unpublished and fixture
  clipboard success/failure inspected. Test release is not published.
- Native metadata-only private-link discovery: installed Codex/Claude/Grok, isolated
  signed-out homes, no inference. Claude mixed-name initial directory-name hypothesis
  failed then corrected logical-name hypothesis passed; retain both receipts. Host-side
  support-file reads are NOT native tool-read proof. Full runtime turns remain downstream.
- Go unit/race/vet round1 passed. No live export/mount/container/package/OS job was run.
- Launcher regression round1 found baseline system-Bash quote bug plus source-size
  overflow. Baseline reproduced and fixed in separate development commit 6717bcb221;
  configuration construction split into container-config.sh. Round2 38 tests succeeded
  with two unavailable PowerShell cases skipped. This is fake-Docker proof only.
- Healthy preview local unit extension passed (workspace media/HTML/relative assets
  and existing run-file projection tests). Actual mounted UI proof remains downstream.
- Core terminal first test's raw-context serialization assertion was too broad (existing
  internal background manager owns its resolver). Child env/no-global-mutation passed;
  adjusted assertion targets the persisted customData boundary. Rerun pending at write.

Go downloaded into task-owned temporary toolchain (go-toolchain.json), checksum checked;
not installed globally. Initial extraction failed due Python tarfile filter support, then
root tar-member guard; corrected extraction checked members before use. No local root
setup command has been invoked. Toolchain cleanup remains due after final local builds.

Do not add outage workers/per-action probes/source-retention machinery, weaken normal
healthy previews, or treat old feasibility/physical prerequisites as current proof.

## User-requested expanded self-testing (subsequent checkpoint)

User requested full testing personally before this handoff was finalized. Production
implementation committed at c57ab71c90; no downstream handoff has been sent. Running
`expanded-local-checks.py`: full affected core/web/Electron unit suites, web build,
normal integration prerequisite build and nine changed-boundary non-provider
integration files, personally with clean environments and no delegation. Full
server units/build/typecheck and Go/race/vet/cross-build already passed. These are
implementation self-checks, not independent API/E2E or physical topology signoff.
Canonical IR002 completion artifacts must incorporate results/limitations before
handoff; do not treat the earlier prepared evidence summary as final completion.


## Final IR-002 disposition

Expanded personal implementation checks are complete; see `checks-and-limits.md`
and canonical `implementation-handoff.md`. Current source is ready for independent
Large/High source review, not delivery. Full frontend suites retain the unrelated
baseline updater finding; temporary candidate-only results are not the final source.
No testing sub-work was delegated and no API/E2E/physical proof is claimed.
