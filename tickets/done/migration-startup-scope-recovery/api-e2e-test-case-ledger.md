# API/E2E test-case ledger — MIGRATION-STARTUP-20260915-001
Initialround2026-09-15; investigationplan/executionreportauthority; priorAPIresultN/A.
|ID|AC|Scenario|Result|
|---|---|---|---|
|R01|003.1–5|Narrowdurablechecks|Pass|
|R02|003/004|BroaderElectron/renderer/typecompile|Pass|
|R03|003.6/004|Builtbackend and safeactualnative setup|Pass|
|N01|003.1/2/5/6|Window-first>100sdelay→samechildhealthy→usable|Pass|
|N02|003.2/4/5|Ordinaryrestart andnoticeclearing|Pass|
|N03|003.3/5|Genuinefailure andfreshattempt|Pass|
|N04|003.4/004|Quitpending/cleanup|Pass|

## Execution events
- R01 Started: narrowlifecycle/status andpresentation suites; validation/api-narrow-*.log.

- R01 Completed Pass: Electron2files18 andrenderer1file3, api-narrow-*.log.
- R02 Started: Electronserver/launchprofiles +3renderer suites +productionElectroncompile.

- R02 Completed Pass: Electron10files41 andrenderer3files8; tscElectronemitexit0. IncludesR01, notadditivetotals. api-electron.log/api-renderer.log/api-electron-build.log.
- R03 Started: fullcurrentserverbuild, realElectron42install andisolatednormalmainbootstrap.

- R03 Completed Pass: actualserverbuild andElectroncompile/install, safefreshHOME/managedpaths andresources; no userdata/legacyDBcopy. Nativeappnotyetlaunched.
- N01 Started: originalnormalmain/defaultproductionprofile29695, fresh .local/api-native-delayed, capturedchildheld bySIGSTOP beforehealth.

- N01 Checkpoint: nativewindow opened10:01:42.747Z beforechild35431 at10:01:42.769Z; >100s actualnoticevisible,1child/generation1,pendingtrue/readyfalse, continuingpolls, noerror. before-release snapshots/process and delayed-over100 AX/png. ControlledSIGSTOP notlargedataperformance.

- N01 setup-attempt outcome (status reconciliation): after release at10:03:49.332Z, same child exited code0 before health; real manager emitted error and stopped. No successful same-child readiness/usable desktop proof. Test resource symlink/entrypoint setup requires correction before rerun; not a confirmed production defect. Native app quit at10:04:12.336Z; recorded main/child PIDs no longer running at status check. N01 remains incomplete; N02–N04 not executed. Current overall result pending, not Pass. This status inquiry did not restart testing.

- N01 corrected setup attempt delayed2 interrupted: actual before-quit10:58:01Z, 39s after spawn, prior to100s. No assistant Quit action in this attempt; trigger not attributed. Exact main42297/child42312 gone, child-close SIGTERM. Cannot count as N01 Pass or controlled N04. Continue fresh delayed3 with same corrected resources; repository results preserved.

- N01 delayed3: actual >100s visible informational delay, one child42722/generation1, continuous health polls, unchanged window1; nativeAX/screenshot and n01-before-state/events captured. Releasing same child now.

- N01 Completed Pass: corrected isolated delayed3 actual normal window-first >100s notice then same child42722/generation1 becomes healthy once; one window-load/no reload/restart, real Agents catalog visible, notice cleared. Native n01-delay/ready AX/png, before/after state/events and HTTP200health statusok. N02 starting through ordinary Settings/Restart UI.

- N02 >100s checkpoint: ordinary UI restart, replacement child43003/generation2, count2total, nonterminal RESTARTING notice; normal Run health check keeps pending notice, no autochild. Prior Healthy:ok diagnostic text initially retained, then manual check updates; not used as readiness. Releasing exact child.

- N02 Completed Pass: same restart child43003/generation2 ready once, pending cleared, notice absent, usable actual Settings restored. No reload/extra spawn. n02-before/after-state/events and nativeAX/png. N03 begins real process failure during next UI restart then ordinary retry.

- N03 process-exit/retry subcase Pass: child43137 terminated beforehealth, actual ApplicationError once, no automaticchild; ordinary Restartclearsmessage/error and child43151/generation4 reaches ready, usable Settings. Real nativeerror/retrypending/recoveredAX and events. HealthyappQuit cleanup before separatefreshinvalid-key structuredfatal control.

- N03 invalid-key supplementary fixture did not provoke fatal (locked vault is returned health). No defect inferred; owned app closed. Fresh fataldb invalidSQLite fixture replaces only this attempted control, not successful process-exit proof.

- N03 Completed Pass: actual backend fatal DATABASE_MIGRATION_FAILED on fresh deliberately invalidSQLite testfixture yielded one managererror and visible ApplicationError before100s, no ready/noautospawn. This is expected failure control, not productfinding or migration-scope expansion. Process-exit/freshretry evidence above preserved. N04 starts fresh normalwindow-first pending then actualCmdQ; no manualchildkill planned.

- N04 Completed Pass: actualCmdQ11:07:57.634Z while child43354/generation1 pending; quit0, childSIGTERMclose11:07:57.763Z, no ready. Exact main43344/child43354 absent and29695no listener, no manualkill. NativeAX +n04-before/after snapshots/events. All R01–R03/N01–N04 complete.
