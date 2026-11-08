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
