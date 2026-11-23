# IMP-04a (D-I, AC-I) the run's end update is lost; the Activity still ends the task when the run stops (MSP-99, branch)
# command: pnpm -C autobyteus-server-ts build ; pnpm -C autobyteus-web build:mobile-web ;
#          cd autobyteus-web && node tests/e2e/mobile-shell-probe.mjs --cases=MSP-59,MSP-99 --output-dir=<this folder>
# commit: working tree = the D-I commit 995b8ff6c2 plus the MSP-99 case (committed as 1fcd548bf4, same files)
# env: macOS arm64, Node v22.23.1, Chrome headless (390x844, touch), loopback node "alpha", scripted runtime
# date: 2026-11-22 (run started 21:09:13Z)
# result: Pass (MSP-59 Pass, MSP-99 Pass; browserErrors 0). Also Pass in the whole probe on d4af72998f (IMP-08).
#
# MSP-99: a run with a running background task ("sleep 120 # background step 11") is open on the phone's Activity. The
#   page wraps window.WebSocket so the run's /ws/agent/<run> socket drops every BACKGROUND_TASK_UPDATED message
#   (droppedUpdates 1, droppedBeforeStop 0), then the run is terminated on the node. The row turns "Stopped" with
#   "Stopped: the run ended" 74 ms after the stop (limit 10 s), from the run's status turning Offline alone
#   (MSP-99-activity-end-lost.png). Playwright's routeWebSocket could not be used: the probe maps the phone host to
#   127.0.0.1 only inside Chrome (host-resolver-rules), so a routed socket's connectToServer never connected.
# MSP-59 (the existing case, the update not dropped): "Stopped: the run ended" as before (MSP-59-activity-run-ended.png).
# The base's failing run of the same case: IMP-04-msp-99-end-lost-base.
