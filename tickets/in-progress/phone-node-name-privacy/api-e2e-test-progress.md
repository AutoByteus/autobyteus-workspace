# API/E2E Test Progress

- Execution coverage report: `api-e2e-execution-coverage-report.md`
- Planned cases: the coverage investigation's Planned Cases (same case IDs)

| Time | Case ID | Event (`Started`/`Checkpoint`/`Completed`) | Result (`Pass`/`Fail`/`Blocked`/`Not Tested`) | Note (what is running and where, what to do next) |
| --- | --- | --- | --- | --- |
| 2026-11-08 | API-01 | Completed | Pass | Reused IMP-02/04/05/06/07: logs checked, code unchanged since `ba3ba5b23e`; importer grep only `components/mobile/**` |
| 2026-11-08 | API-01b | Completed | Pass | Reused IMP-08 (MSP-09) |
| 06:59Z | API-02 | Started | — | full mobile-shell probe, output /tmp/pnnp-e2e/msp-run1 |
| 07:08Z | API-02 | Checkpoint | — | all 19 MSP cases Pass; probe Fail on 2 unexpected MSP-12 'phone-timing' ERR_CONNECTION_REFUSED; diagnosing (rule 9) |
| 07:12Z | API-02 | Checkpoint | — | cause: requests in flight when MSP-12 closes the timing context are aborted as connectionrefused (harness). Baseline fix committed; rerun MSP-12,MSP-09 |
| 07:16Z | API-02 | Completed | Pass | rerun MSP-12, MSP-09 Pass, no unexpected errors; next API-03 (emulator) |
| 07:19Z | API-03 | Started | — | connectedDebugAndroidTest on emulator-5584 (pnnp433_api35) |
| 07:35Z | API-03 | Checkpoint | — | first attempt stopped: windowed emulator froze (qemu 0% CPU, adb shell hung); restarted headless (-no-window); rerunning |
| 07:36Z | API-03 | Completed | Pass | 11/11 on pnnp433_api35; next API-04 journey |
| 07:36Z | API-04 | Started | — | node A shared link 'Test Desktop' at hostbox-9f3.home.arpa:47331 |
| 07:38Z | API-04 | Checkpoint | — | header + sheet connected verified with session nodeName absent; next Switch node list |
| 07:38Z | API-05 | Started | — | Type an address http://hostbox-9f3.example-tailnet.ts.net:47331 with tick |
| 07:40Z | API-05 | Completed | Pass | typed ts.net node: Connected to AutoByteus node; rows/⋮ sheet names only; hello nodeName ""; prefs displayName=host |
| 07:40Z | API-06 | Started | — | typed node B http://nodebox-2c7.home.arpa:47332, pair on its page with 'Test Node' link |
| 07:42Z | API-06 | Completed | Pass | B typed → Phone access off screen (shown name) → paired on its page → prefs 'Test Node', row 'Test Node'; reopen hello nodeName 'Test Node' |
| 07:42Z | API-10 | Started | — | Switch node B→A from the sheet |
| 07:43Z | API-10 | Checkpoint | — | Switch node B→A done; Remove/Unpair/relaunch later |
| 07:43Z | API-08 | Started | — | node A stopped with its page open |
| 07:49Z | API-08 | Checkpoint | — | FINDING: load-failure overlay texts correct, but WebView's own Chromium error page behind it shows 'The webpage at http://hostbox-9f3.home.arpa:47331/mobile/ … net::ERR_CONNECTION_REFUSED' (screenshot API-08-03). Continue: Retry recovery, Can't reach screen |
| 07:51Z | API-08 | Completed | Fail | names everywhere correct; but the in-page load failure shows WebView's Chromium error page with the full URL behind the overlay (API-08-03, API-08-05). Retry recovers. Next API-07 |
| 07:51Z | API-07 | Started | — | Type an address: http without tick; unreadable text |
| 07:52Z | API-07 | Completed | Pass | ftp:// typed → 'Can’t connect' / 'Check the address and try again.'; unticked http blocked by the sheet (Connect disabled); unreachable typed → 'Can’t reach AutoByteus node' |
| 07:52Z | API-09 | Started | — | injected links on A's page, real taps |
| 07:56Z | API-09 | Completed | Pass | blocked link, external link toast, download toast, no-app overlay: plain texts, no URL |
| 07:57Z | API-10 | Completed | Pass | Switch node, Remove (confirmation names), relaunch opens last node 'Test Node', Unpair → pairing screen |
| 07:57Z | API-08b | Started | — | user-driven repro of the error-page leak: overlay Retry while the node is down |
| 07:58Z | API-08b | Completed | Fail | reproduced by user actions: blocked-link overlay → node down → RETRY → Chromium error page with http://hostbox-9f3.home.arpa:47331/mobile behind 'Can’t reach Test Desktop' (API-08-11) |
| 08:22Z | round 2 | Checkpoint | — | Round 2 (IR-003, ea45dc1643): plan in the investigation's 'Round 2 Basis And Rerun Plan'. Reused: IMP-10 (Android unit), IMP-11 (instrumented = API-03). Next: rebuild APK, emulator, API-04…API-11 |
| 08:30Z | API-04 | Started | — | round 2: share A's link 'Test Desktop'; AC-001; sheet |
| 08:31Z | API-04 | Completed | Pass | round 2: paired by Share; session without nodeName → header 'Test Desktop' (hello); sheet without address |
| 08:31Z | API-08 | Started | — | round 2: reload / Retry / Back while A down; Retry after recovery |
| 08:37Z | API-08 | Checkpoint | — | real APK: reload, Retry and Back while A down show WebView's error page with the URL full-screen, no overlay; DIAG433 logging (removed) shows 2 onPageFinished when a failed load replaces a loaded page |
| 08:37Z | API-11 | Started | — | first-load failures via proxy :47333 (502, drop, refused), real APK |
| 08:38Z | API-11 | Completed | Pass | first load 502 / Retry drop / Retry refused: only the overlay, no address; Retry after recovery closes it (page shows unpaired: Retry loads /mobile without the pairing link, pre-existing → FU-003) |
| 08:38Z | API-08 | Completed | Fail | real APK: reload (API-08-03), Retry (API-08-11/12), Back (API-08-05) while down: WebView's error page with the URL full-screen, no overlay, no Retry |
| 08:41Z | round 2 | Completed | Fail | report, revision record API-REV-002, FU-003 written; next: commit, failure-origin review |
| 09:07Z | round 3 | Checkpoint | — | Round 3 (IR-004, 60adcf3bc8): plan in 'Round 3 Basis And Rerun Plan'. Reused IMP-14, IMP-15 (= API-03). Next: builds, API-02 full probe, emulator API-04…API-12 |
| 09:14Z | API-02 (r3) | Started | — | full mobile-shell probe, output /tmp/pnnp-e2e/msp-run3 |
| 09:23Z | API-02 (r3) | Completed | Pass | 19/19 MSP Pass, probe Pass, 0 unexpected errors |
| 09:24Z | API-04 (r3) | Started | — | share A's link; AC-001; sheet |
| 09:25Z | API-04 (r3) | Completed | Pass | page shown after 24 s (cold first open); AC-001 header 'Test Desktop' with session nodeName absent; sheet without address |
| 09:25Z | API-08 (r3) | Started | — | A loaded, then down: reload, Retry ×2, recovery Retry, Back while down |
| 09:27Z | API-08 (r3) | Completed | Pass | reload, Retry ×2, Back while down: only the overlay, no address; Retry after recovery shows the page |
| 09:27Z | API-08b (r3) | Completed | Pass | link overlay → A down → RETRY: 'Can’t reach Test Desktop' only; recovery shows the page |
| 09:27Z | API-09 (r3) | Started | — | blocked + Retry (up), external toast, download toast, no-app |
| 09:28Z | API-09 (r3) | Completed | Pass | blocked link hides page, Retry closes; external + download toast 'Opening outside AutoByteus'; no-app overlay; no URL |
| 09:29Z | API-11 (r3) | Started | — | proxy first load 502 / drop / refused / pass |
| 09:30Z | API-11 (r3) | Completed | Pass | first load 502/drop/refused: overlay only; recovery shows page; loaded page + drop + reload: overlay only |
| 09:30Z | API-05 (r3) | Started | — | typed http://hostbox-9f3.example-tailnet.ts.net:47331 + tick |
| 09:32Z | API-05 (r3) | Completed | Pass | typed ts.net: page in 2 s; rows and ⋮ sheet 'AutoByteus node'; hello nodeName "" |
| 09:32Z | API-06 (r3) | Started | — | typed B, paired on its page as 'Test Node' |
| 09:33Z | API-06 (r3) | Completed | Pass | B typed → paired on its page → row 'Test Node' |
| 09:33Z | API-10 (r3) | Started | — | reopen B; Switch node; Remove; relaunch; Unpair |
| 09:35Z | API-10 (r3) | Completed | Pass | reopen B ≤3 s; Switch node lists 3 names; Remove confirmation by name; relaunch opens Test Node; Unpair → pairing |
| 09:35Z | API-12 | Started | — | proxy 'stale': released 1.5.12-beta.8 /mobile bundle (no pageReady) |
| 09:35Z | API-12 | Completed | Pass (observed, accepted) | stale bundle: 'Connecting to Test Server' + Cancel after 25 s, no address; Cancel → list. The released bundle did not render through the proxy (empty body) |
| 09:38Z | API-13 | Started | — | Android 14 / WebView 113 AVD pnnp433_api34: pair A; reload/Retry/Back while down; recovery |
| 09:41Z | API-13 | Completed | Pass | Android 14 / WebView 113.0.5672.136: reload, Retry, Back while down → overlay only, no address; recovery shows the page |
| 09:41Z | round 3 | Completed | Pass | report, revision record API-REV-003 written; next: commit, hand off to delivery |
