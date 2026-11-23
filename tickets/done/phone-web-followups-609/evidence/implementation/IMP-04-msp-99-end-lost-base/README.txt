# IMP-04b (D-I, AC-I) MSP-99 on a phone bundle built without D-I: the task stays "Running" after the run stops
# command: the D-I web files (useBackgroundTaskPanelView.ts, agentBackgroundTaskStore.ts, BackgroundTaskPanel.vue,
#          MobileActivity.vue) checked out from 995b8ff6c2~1, identical to f2c0d2a902 for these files ;
#          pnpm -C autobyteus-web build:mobile-web ;
#          cd autobyteus-web && node tests/e2e/mobile-shell-probe.mjs --cases=MSP-99 --output-dir=<this folder> ;
#          then the branch files restored and the phone bundle rebuilt
# commit: base f2c0d2a902 for the D-I files; the MSP-99 case from the branch
# env: macOS arm64, Node v22.23.1, Chrome headless (390x844, touch), loopback node "alpha", scripted runtime
# date: 2026-11-22 (run started 21:10:31Z)
# result: Fail, as expected: "AC-I within 10 s of the stop the task shows Stopped, though its end update was lost".
#   The node ended the run (terminated success, nodeAfterStop []), one update was dropped, and 10 s later the row
#   still read "Running" (shownStoppedAfterMs null; MSP-99-activity-end-lost.png).
