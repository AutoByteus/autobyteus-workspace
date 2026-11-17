# API/E2E Test Progress

Read this first whenever the run is picked back up. Only add rows.

- Execution coverage report: `tickets/in-progress/bundled-claude-code-514/api-e2e-execution-coverage-report.md`
- Planned cases: the coverage investigation's Planned Cases

| Time | Case ID | Event | Result | Note |
| --- | --- | --- | --- | --- |
| 2026-11-17 16:15 | API-01 | Started | | docker buildx server-package → /tmp/sp-514; log /tmp/ab514/API-01-build.log |
| 2026-11-17 16:27 | API-02 | Completed | Pass | macOS x64, Linux x64/arm64, Windows x64 artifacts of run 44105389247: 0 platform paths, SDK present; positive control on installed app matches |
| 2026-11-17 16:35 | API-01 | Completed | Pass | server-package built; 233 MB removed; 0 platform paths |
| 2026-11-17 16:35 | API-03 | Started | | test container ab514-test from autobyteus/autobyteus-server:beta with /tmp/sp-514 mounted |
| 2026-11-17 16:43 | API-03 | Completed | Pass | this package vs image built-in: same Claude row (2.1.319, update 2.1.326, signed out), enabled=true; containers and volumes removed |
| 2026-11-17 16:44 | — | Completed | Pass | round result Pass 95.9%; committing; handoff to /delivery_engineer |
