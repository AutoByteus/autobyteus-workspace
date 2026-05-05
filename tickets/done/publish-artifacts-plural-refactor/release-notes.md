# Release Notes - publish-artifacts-plural-refactor

## Breaking Change

- Replaced the agent-facing artifact publication tool `publish_artifact` with the canonical plural `publish_artifacts` tool.
- Single-file publication now uses the same plural batch shape: `publish_artifacts({ artifacts: [{ path, description? }] })`.
- The old singular tool is not registered, exposed, allowlisted, discoverable, selectable, or mapped as an alias; custom agent configs that still list only `publish_artifact` must migrate to `publish_artifacts`.
- Artifact paths may be relative or absolute, but must resolve to a readable file inside the current run workspace.

## Improvements

- Added ordered multi-artifact publication through one tool call while preserving the existing durable published-artifact snapshot, revision, event, and application-relay behavior for each item.
- Updated native AutoByteus, Codex dynamic tools, and Claude MCP/allowed-tools exposure to use the plural contract only.
- Updated Brief Studio and Socratic Math built-in prompts/configs and regenerated importable package outputs to teach plural one-item-array publication.

## Validation Summary

- API/E2E validation passed across native AutoByteus, Codex, Claude, discovery/listing surfaces, built-in app package validation, app builds, server build, and cleanup searches. Existing live Codex and AutoByteus / LM Studio publish-artifacts integration tests also passed after the follow-up user challenge. Brief Studio-specific imported-package and hosted-app runtime validation passed after the user's Brief Studio dependency concern, and the user-requested live Brief Studio Codex App Server + GPT-5.5 process passed with workspace-contained researcher/writer artifacts projected into the app.
- Known non-blocking residual: `pnpm -C autobyteus-server-ts typecheck` still fails with the pre-existing repository-wide `TS6059` rootDir/tests include issue; targeted tests and build passed.
