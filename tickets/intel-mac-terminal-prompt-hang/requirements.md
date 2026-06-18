# Requirements Doc

## Status

Design-ready - user confirmed kickoff after refreshed latest-`origin/personal` probe on 2026-06-18.

## Goal / Problem Statement

On Intel macOS, the packaged AutoByteus desktop Terminal tab opens but does not show a prompt. The same terminal path works on Windows and on Apple Silicon macOS. After rebasing/resetting the ticket branch to the latest `origin/personal`, the current packaged Intel app still fails before prompt output is produced.

## Refreshed Diagnosis

The latest source on `origin/personal` still repairs the first `node-pty` `spawn-helper` found in static order (`build/Release`, `build/Debug`, then `prebuilds/${process.platform}-${process.arch}`). In the installed Intel package, that resolves to an executable arm64 `build/Release/spawn-helper`, while `node-pty` actually selects `prebuilds/darwin-x64`. The selected x64 helper exists but has mode `0644`, so `node-pty.spawn()` fails with `posix_spawnp failed`.

## Functional Requirements

- REQ-001: The packaged Intel macOS app must ship with an executable `node-pty/prebuilds/darwin-x64/spawn-helper`.
- REQ-002: Runtime helper repair must target the helper adjacent to the native module selected by `node-pty`, not the first helper found by static directory order.
- REQ-003: Release validation must catch a packaged macOS app whose selected `node-pty` helper is non-executable.
- REQ-004: Terminal startup failure must surface an actionable backend/frontend error rather than only showing an empty/stuck terminal.

## Acceptance Criteria

- AC-001: A direct websocket probe against the packaged Intel server receives shell prompt/output before timeout.
- AC-002: In the packaged Intel app, `node-pty/lib/utils.js.loadNativeModule('pty')` selects `prebuilds/darwin-x64`, and that directory's `spawn-helper` is executable.
- AC-003: The runtime bootstrap resolves or repairs the same helper selected by `node-pty`.
- AC-004: If startup still fails, server logs include the selected helper path/mode and the frontend shows an error message.
