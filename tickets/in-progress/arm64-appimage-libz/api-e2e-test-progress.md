# API/E2E Test Progress

Own progress log while tests run. Read it first when picking the run back up. Rows are only added.

- Execution coverage report: `api-e2e-execution-coverage-report.md`
- Planned cases: `api-e2e-coverage-investigation.md` Planned Cases (same case IDs)

| Time (UTC) | Case ID | Event | Result | Note |
| --- | --- | --- | --- | --- |
| 2026-11-21T23:37 | AE-08 | Started | | new `scripts/tests/test_desktop_release_clean_image_step.py`, clean run + 3 workflow mutations |
| 2026-11-21T23:37 | AE-08 | Completed | Pass | 6/6 OK; each mutation fails the test; workflow restored. Evidence `evidence/api-e2e/AE-08-clean-image-step-test.log` |
| 2026-11-21T23:37 | AE-07 | Started | | verifier unit + linuxAppImageBuild.spec in worktree |
| 2026-11-21T23:37 | AE-07 | Completed | Pass | verifier 3/3, spec 7/7; evidence/api-e2e/AE-07-units.log |
| 2026-11-21T23:37 | AE-03 | Started | | gh run view 44956618584 --log |
| 2026-11-21T23:37 | AE-03 | Completed | Pass | run success at 05996bd715; both clean-image steps Verified; evidence/api-e2e/AE-03-ci-run-44956618584.log |
| 2026-11-21T23:37 | AE-01 | Started | | readelf + runtime prefix + clean-root probe, CI arm64 vs published beta.6 |
| 2026-11-21T23:38 | AE-01 | Completed | Pass | NEW NEEDED 0, prefix = pinned static runtime, exit 0 x2; OLD libz.so exit 127 x2; evidence/api-e2e/AE-01-arm64-runtime-clean-root.log |
| 2026-11-21T23:38 | AE-02 | Started | | verifier via docker shim: old / new / libz.so-present root |
| 2026-11-21T23:39 | AE-02 | Completed | Pass | OLD exit 127 libz.so (after exec-bit fixture fix), NEW pass, libz.so root exit 3; evidence/api-e2e/AE-02-verifier-clean-image-local.log |
| 2026-11-21T23:39 | AE-04 | Started | | x64 runtime prefix vs legacy runtime-x64, NEEDED, tree vs published |
| 2026-11-21T23:39 | AE-04 | Completed | Pass | x64 prefix = legacy runtime-x64 24da8e0e…, NEEDED libz.so.1 set; packaging-level tree diff 0 vs published; evidence/api-e2e/AE-04-x64-runtime-and-tree.log |
| 2026-11-21T23:39 | AE-05 | Started | | artifact names + latest*.yml shapes vs prior build-only run and published beta.6 |
| 2026-11-21T23:41 | AE-05 | Completed | Pass | names = published set; latest*.yml key structure equal; arm64 yml sha512/size match; evidence/api-e2e/AE-05-release-outputs.log |
| 2026-11-21T23:41 | AE-06 | Started | | building clean desktop root /tmp/ae28/desktop-root (ubuntu-base + apt desktop libs) |
| 2026-11-21T23:42 | AE-06 | Checkpoint | | root ready (precondition log written); launching OLD then NEW as uid 1000 under Xvfb |
| 2026-11-22T00:00 | AE-06 | Checkpoint | | attempt 1 hung: no /tmp/.X11-unix in the fresh tmpfs (non-root Xvfb cannot create it); killed own pid-ns; attempt 2 with the dir created |
| 2026-11-22T00:15 | AE-06 | Checkpoint | | attempt 2 hung: host X servers hold abstract sockets :99/:102/:103 (shared net ns); attempt 3 on display :187 |
| 2026-11-22T00:30 | AE-06 | Checkpoint | | attempt 3 hung: xvfb-run as pid-ns PID 1 misses Xvfb's SIGUSR1; attempt 4 runs it as a child of bash |
| 2026-11-22T00:31 | AE-06 | Checkpoint | | attempt 4 ran: OLD 127 libz.so; NEW ready 8s, window, UI rendered; health curl hit wrong port, SIGTERM-to-runtime-pid stop not a real-use stop; attempt 5 with server port, sandbox ns check, Ctrl+C stop, fresh HOME |
| 2026-11-22T00:33 | AE-06 | Checkpoint | | attempt 5 Pass (health 200, sandbox ns, Ctrl+C tree stop; extract dir left). Attempt 6A: NEW quit by window close under openbox (root precondition re-asserted after adding openbox/wmctrl) |
| 2026-11-22T00:40 | AE-06 | Completed | Pass | attempts 5 + 6A: OLD 127 libz.so; NEW ready 8s, window + UI, health 200, sandbox ns, Ctrl+C and window close stop all processes; evidence/api-e2e/AE-06-* |
| 2026-11-22T00:40 | AE-11 | Started | | extract-and-run cleanup: static vs legacy runtime, minimal + app, strace |
| 2026-11-22T00:40 | AE-11 | Completed | Fail | static runtime leaves appimage_extracted_<md5> (1.2 GB) after exit; legacy removes it; no cleanup syscalls; rerouted Design Impact to Solution Designer. Keep /tmp/ae28 for rerun |
