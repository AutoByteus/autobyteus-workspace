# API/E2E Test Progress — dependency-security-and-unused-cleanup

- Execution coverage report: `api-e2e-execution-coverage-report.md`
- Planned cases: `api-e2e-coverage-investigation.md` Planned Cases. Scratch: `/tmp/dep229v` (logs/<side>-<step>.log, <side>-summary.txt). Base worktree: `dependency-security-and-unused-cleanup-base` @ 3b2c86ca9e.

| Time | Case ID | Event | Result | Note |
| --- | --- | --- | --- | --- |
| 17:21Z | API-01…API-11 (branch), API-B (base) | Started | — | run-suites.sh on both worktrees in background; check /tmp/dep229v/logs/{branch,base}-summary.txt |
| 17:22Z | API-30 | Started | — | docker image build in background (/tmp/dep229v/logs/API-30-build.log) |
| 17:22Z | API-02 | Completed | Pass | fresh audit: ALL 6 crit/46 high, PROD 0/13; same high/critical package set as IMP-11 (27 / 6) |
| 17:34Z | API-30 | Completed | Pass | image built; health 200; GraphQL query OK; /graphiql 200 + assets 200; server log 0 error lines; container+image removed |
| 18:21Z | API-01…API-11, API-B | Completed | Pass with 1 diagnosed failure | branch: all green except server-unit 1 failure (project-task-index-status timing; fails 6/6 on base AND branch under load → pre-existing). base: dedupe-check fails (expected); web 1 timeout at load ~150; devkit/app failures were harness order (fixed by rebuild + reinstall: pass) |
| 18:21Z | API-20 | Started | — | build:electron:mac of the branch in background (/tmp/dep229v/logs/API-20-build.log) |
| 18:22Z | API-12 | Started | — | lms load qwen/qwen3.6-35b-a3b; lmstudio-llm.test.ts without the multimodal case |
| 18:26Z | API-12 | Completed | Pass | reasoning stream via LMStudioLLM/undici 57-63 s OK; factory-discovery cases vacuous on base and branch alike (follow-up) |
| 18:29Z | API-20 | Checkpoint | — | packaged build done 18:29Z; running startup verify + harness |
| 18:35Z | API-20 | Completed | Pass | Electron 42.11.16; verify-packaged-server-startup passed; test:e2e:electron (direct, playwright), :isolation pass with --skip-build; isolated-app lifecycle pass; default 'build:electron' step fails on macOS (pre-existing, follow-up) |
| 18:35Z | API-21 | Started | — | isolated instance + native LM Studio markdown reply + DOM checks |
| 18:42Z | API-21 | Completed | Pass | Electron/42.11.16; h1+h2, 2 KaTeX (1 display), prism python (7 tokens), mermaid svg 2 nodes, img onerror stripped, no script ran; instance stopped; model unloaded |
| 18:46Z | API-13 | Completed | Pass | DownloadMediaTool on axios 1.20.0: local 'image/png; charset=binary' -> test-image passes; public PDF passes |
| 18:47Z | cleanup | Completed | — | base worktree and /tmp/dep229v removed; no instance, container or model left |
