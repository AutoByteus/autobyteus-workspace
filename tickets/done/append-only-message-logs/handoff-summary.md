# Handoff Summary — Append-Only Message Logs

## What Changed

- Every run's message log (standalone host, task agent, team run, task agent team, org run) is now a set of JSON Lines files owned by `MessageLog`: `<base>_active.jsonl` plus sealed `<base>_<6 digits>.jsonl` files, rotated at 4 MiB.
- Sending a message appends one synced line per owner log (receiver first, then sender, under the coordinating run's lock). It no longer reads, re-validates or rewrites the stored messages. On the 22 MB profile: 123,099 B written for a 123,099 B line, 1 byte read.
- Startup migration `20261018_append_only_message_logs_v1` converts every JSON log, verifies it reads back equal, then removes the JSON file. Logs it cannot convert are left byte for byte, with a warning, and the app still starts. Released migrations that read or write JSON logs still complete before it.
- Readiness admits runs in the new layout. A JSON log left in a team or org folder is retired residue, so that run is not admitted (R-3).
- No change to wire/API shapes, tool contracts or the in-memory model (AC-010).

## Classification And Route

- `task_size`: `Large`; `architectural_risk`: `High`; route: `Reviewed` (architecture review → implementation → code review CRR-001 → API/E2E API-REV-001 at 96% → test-code review CRR-002 → delivery)

## Integrated State

- Ticket branch `codex/append-only-message-logs`. Bootstrap base `origin/personal` @ `65cf41c6b4`.
- Integration 1 (merge): `origin/personal` @ `cf14704473` (adoption `link-existing-run-to-task`, `workspace-skill-collision-fix`, the v1.5.6-beta.4/beta.5 bumps) → merge `afa05514f5`. One import-only conflict in `task-agent-own-files.ts`, resolved as the union of both sides. No code merged from the base touches message logs.
- Post-integration checks on `afa05514f5` (evidence `evidence/delivery/`): build, typecheck `exit=0`; unit `5931 passed | 7 skipped`; integration `397 passed | 69 skipped`; whole server E2E with the scripted AGY gate `492 passed | 241 skipped`, 0 failed. These include AOML-1/2, the adoption suites ADO-1..4 and the three corrected upgrade E2Es.
- Integration 2 (merge): `origin/personal` @ `8367f6cae3`, a ticket-docs-only commit, merged as `4066cd8479`. It changes no code, so no rerun.
- Delivery edit: one source doc-comment fix (CR-001), comment only.

## Verification

- Verified from the evidence. Every critical acceptance criterion, AC-001..AC-010, is directly proven; see `release-deployment-report.md` > Verification.
- No user check is needed before finalization. Under DEC-001, the conversion time and append timing on the user's own ≈113 MB of data are for the user to observe after a release that carries this change. TESTING.md forbids running them on user data.
- DR-002: after installing v1.5.6-beta.6, the user asked delivery to check. Read-only observation of their install: conversion `Scanned 733; migrated 731; skipped 2; failed 0` in 14.4 s; a real message after the conversion added exactly one line, with the old bytes and all other files unchanged. DEC-001 is closed.

## Release Decision

- `No release` (RELEASE.md default; the user has not asked for one). A beta is available on request. The user's own-data check (DEC-001) waits for that beta.

## Residual Risks And Follow-Ups

- R-2/R-3: runs whose JSON log could not be converted stay on JSON, are not admitted, and get a warning.
- DEC-008: the one-time sealed-file rewrite by locators-v1 is covered in-process only.
- Rollback is a forward fix: the conversion is one-way, and a build older than this change cannot read the new logs. FU-4, the conflict with RELEASE.md's rollback sentence, is with the Solution Designer.
- FU-1..FU-4 belong to the Solution Designer. FU-CR-1 (Task autobyteus-125) and FU-API-1 are with the Project Task Manager.
