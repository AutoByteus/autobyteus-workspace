# API/E2E Test-Case Ledger

Round 1; multi-case and long-running build. Canonical investigation/report/revision alongside this file.

## Planned Cases
| ID | Journey | Acceptance criteria | Initial result |
|---|---|---|---|
| FP-001 | Native-menu repository tests | AC003..007 | Not Tested |
| FP-002 | Caller, launch/save, gate and preload regression | AC002/004/006/007 | Not Tested |
| FP-003 | Source-current isolated build/readiness | AC001..008 | Not Tested |
| FP-004 | Actual Agent Chat native open/select/explicit apply | AC001/003/006 | Not Tested |
| FP-005 | Actual cancel and Escape, focus and input preservation | AC003/005 | Not Tested |
| FP-006 | Team Chat and Org root/member native destination/locks | AC001/002/006 | Not Tested |
| FP-007 | Saved Org member draft and explicit Save, locked roots | AC002/006/007 | Not Tested |
| FP-008 | Actual caller desktop/narrow/en/zh-CN and manual/context/error matrix | AC004/005/007/008 | Not Tested |
| FP-009 | Durable probe repeat and owned cleanup | AC001..008 | Not Tested |

## Execution Events
Initialized before execution.

- FP-001 Started: 2026-10-07T17:54:03Z; native menu/search tests.

- FP-001 Completed: exit 0; api-e2e-evidence/menu-tests.log

- FP-002 Started: 2026-10-07T17:54:38Z; caller/service/store/preload regression.

- FP-002 Completed: renderer exit 0, preload exit 0; api-e2e-evidence/caller-tests.log and preload-tests.log.

- FP-003 Started: 2026-10-07T17:55:23Z; pnpm --silent isolated-app start --build.

- FP-003 Checkpoint: build/start exit 0; api-e2e-evidence/start.json and build.log.

- FP-003 Completed Pass: source-current build + real backend/CDP ready; iso-60871-e991 stopped (build-instance-stop.json).
- FP-004/005/006/008 now use durable FP-P01..06 subcases; pending native-assistance script.

- 2026-10-07T18:02:16.645Z FP-P01: Started isolated source-current launch and API-owned fixtures; /Users/normy/autobyteus_org/autobyteus-worktrees/restore-native-workspace-folder-picker/tickets/in-progress/restore-native-workspace-folder-picker/api-e2e-evidence/native-run-01/evidence.json

- 2026-10-07T18:02:21.603Z FP-P01: Pass; /Users/normy/autobyteus_org/autobyteus-worktrees/restore-native-workspace-folder-picker/tickets/in-progress/restore-native-workspace-folder-picker/api-e2e-evidence/native-run-01/evidence.json

- 2026-10-07T18:02:21.604Z FP-P02: Started Agent input only, explicit apply and unchanged registration; /Users/normy/autobyteus_org/autobyteus-worktrees/restore-native-workspace-folder-picker/tickets/in-progress/restore-native-workspace-folder-picker/api-e2e-evidence/native-run-01/evidence.json

- 2026-10-07T18:02:22.371Z NATIVE: Choose this owned directory in the OS dialog: /private/var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-folder-picker-zrjQJS/agent; /Users/normy/autobyteus_org/autobyteus-worktrees/restore-native-workspace-folder-picker/tickets/in-progress/restore-native-workspace-folder-picker/api-e2e-evidence/native-run-01/evidence.json

- 2026-10-07T18:02:50.677Z FP-P02: Pass; /Users/normy/autobyteus_org/autobyteus-worktrees/restore-native-workspace-folder-picker/tickets/in-progress/restore-native-workspace-folder-picker/api-e2e-evidence/native-run-01/evidence.json

- 2026-10-07T18:02:50.678Z FP-P03: Started native Cancel and Escape retain typed text/selection/focus; /Users/normy/autobyteus_org/autobyteus-worktrees/restore-native-workspace-folder-picker/tickets/in-progress/restore-native-workspace-folder-picker/api-e2e-evidence/native-run-01/evidence.json

- 2026-10-07T18:02:51.225Z NATIVE: Dismiss native picker using Cancel button; do not close underlying form; /Users/normy/autobyteus_org/autobyteus-worktrees/restore-native-workspace-folder-picker/tickets/in-progress/restore-native-workspace-folder-picker/api-e2e-evidence/native-run-01/evidence.json

- 2026-10-07T18:03:04.438Z NATIVE: Dismiss native picker using Escape key; do not close underlying form; /Users/normy/autobyteus_org/autobyteus-worktrees/restore-native-workspace-folder-picker/tickets/in-progress/restore-native-workspace-folder-picker/api-e2e-evidence/native-run-01/evidence.json

- 2026-10-07T18:03:15.325Z FP-P03: Pass; /Users/normy/autobyteus_org/autobyteus-worktrees/restore-native-workspace-folder-picker/tickets/in-progress/restore-native-workspace-folder-picker/api-e2e-evidence/native-run-01/evidence.json

- 2026-10-07T18:03:15.326Z FP-P04: Started Team new Chat and known path reuse; /Users/normy/autobyteus_org/autobyteus-worktrees/restore-native-workspace-folder-picker/tickets/in-progress/restore-native-workspace-folder-picker/api-e2e-evidence/native-run-01/evidence.json

- 2026-10-07T18:03:15.927Z NATIVE: Choose this owned directory in the OS dialog: /private/var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-folder-picker-zrjQJS/known; /Users/normy/autobyteus_org/autobyteus-worktrees/restore-native-workspace-folder-picker/tickets/in-progress/restore-native-workspace-folder-picker/api-e2e-evidence/native-run-01/evidence.json

- 2026-10-07T18:03:41.369Z FP-P04: Pass; /Users/normy/autobyteus_org/autobyteus-worktrees/restore-native-workspace-folder-picker/tickets/in-progress/restore-native-workspace-folder-picker/api-e2e-evidence/native-run-01/evidence.json

- 2026-10-07T18:03:41.369Z FP-P05: Started Org root and specific placed-Team destination; /Users/normy/autobyteus_org/autobyteus-worktrees/restore-native-workspace-folder-picker/tickets/in-progress/restore-native-workspace-folder-picker/api-e2e-evidence/native-run-01/evidence.json

- 2026-10-07T18:03:41.969Z NATIVE: Choose this owned directory in the OS dialog: /private/var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-folder-picker-zrjQJS/org; /Users/normy/autobyteus_org/autobyteus-worktrees/restore-native-workspace-folder-picker/tickets/in-progress/restore-native-workspace-folder-picker/api-e2e-evidence/native-run-01/evidence.json

- 2026-10-07T18:04:07.829Z NATIVE: Choose this owned directory in the OS dialog: /private/var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-folder-picker-zrjQJS/member; /Users/normy/autobyteus_org/autobyteus-worktrees/restore-native-workspace-folder-picker/tickets/in-progress/restore-native-workspace-folder-picker/api-e2e-evidence/native-run-01/evidence.json

- 2026-10-07T18:04:37.710Z FP-P05: Pass; /Users/normy/autobyteus_org/autobyteus-worktrees/restore-native-workspace-folder-picker/tickets/in-progress/restore-native-workspace-folder-picker/api-e2e-evidence/native-run-01/evidence.json

- 2026-10-07T18:04:37.739Z FP-P06: Started full caller narrow form, invalid/manual/Cancel and long path geometry; /Users/normy/autobyteus_org/autobyteus-worktrees/restore-native-workspace-folder-picker/tickets/in-progress/restore-native-workspace-folder-picker/api-e2e-evidence/native-run-01/evidence.json

- 2026-10-07T18:04:38.329Z FP-P06: Pass; /Users/normy/autobyteus_org/autobyteus-worktrees/restore-native-workspace-folder-picker/tickets/in-progress/restore-native-workspace-folder-picker/api-e2e-evidence/native-run-01/evidence.json

- 2026-10-07T18:08:41.475Z FP-P01: Started isolated source-current launch and API-owned fixtures; /Users/normy/autobyteus_org/autobyteus-worktrees/restore-native-workspace-folder-picker/tickets/in-progress/restore-native-workspace-folder-picker/api-e2e-evidence/caller-run-02/evidence.json

- 2026-10-07T18:08:46.782Z FP-P01: Pass; /Users/normy/autobyteus_org/autobyteus-worktrees/restore-native-workspace-folder-picker/tickets/in-progress/restore-native-workspace-folder-picker/api-e2e-evidence/caller-run-02/evidence.json

- 2026-10-07T18:08:46.784Z FP-P02: Started Agent input only, explicit apply and unchanged registration; /Users/normy/autobyteus_org/autobyteus-worktrees/restore-native-workspace-folder-picker/tickets/in-progress/restore-native-workspace-folder-picker/api-e2e-evidence/caller-run-02/evidence.json

- 2026-10-07T18:08:47.022Z FP-P02: Pass; /Users/normy/autobyteus_org/autobyteus-worktrees/restore-native-workspace-folder-picker/tickets/in-progress/restore-native-workspace-folder-picker/api-e2e-evidence/caller-run-02/evidence.json

- 2026-10-07T18:08:47.023Z FP-P04: Started Team new Chat and known path reuse; /Users/normy/autobyteus_org/autobyteus-worktrees/restore-native-workspace-folder-picker/tickets/in-progress/restore-native-workspace-folder-picker/api-e2e-evidence/caller-run-02/evidence.json

- 2026-10-07T18:08:47.285Z FP-P04: Pass; /Users/normy/autobyteus_org/autobyteus-worktrees/restore-native-workspace-folder-picker/tickets/in-progress/restore-native-workspace-folder-picker/api-e2e-evidence/caller-run-02/evidence.json

- 2026-10-07T18:08:47.285Z FP-P05: Started Org root and specific placed-Team destination; /Users/normy/autobyteus_org/autobyteus-worktrees/restore-native-workspace-folder-picker/tickets/in-progress/restore-native-workspace-folder-picker/api-e2e-evidence/caller-run-02/evidence.json

- 2026-10-07T18:08:52.430Z FP-P05: Pass; /Users/normy/autobyteus_org/autobyteus-worktrees/restore-native-workspace-folder-picker/tickets/in-progress/restore-native-workspace-folder-picker/api-e2e-evidence/caller-run-02/evidence.json

- 2026-10-07T18:08:52.431Z FP-P06: Started full caller narrow form, invalid/manual/Cancel and long path geometry; /Users/normy/autobyteus_org/autobyteus-worktrees/restore-native-workspace-folder-picker/tickets/in-progress/restore-native-workspace-folder-picker/api-e2e-evidence/caller-run-02/evidence.json

- 2026-10-07T18:08:52.834Z FP-P06: Pass; /Users/normy/autobyteus_org/autobyteus-worktrees/restore-native-workspace-folder-picker/tickets/in-progress/restore-native-workspace-folder-picker/api-e2e-evidence/caller-run-02/evidence.json

- 2026-10-07T18:08:52.835Z FP-P07: Started real Org Run, active locks, stopped member draft and explicit Save; /Users/normy/autobyteus_org/autobyteus-worktrees/restore-native-workspace-folder-picker/tickets/in-progress/restore-native-workspace-folder-picker/api-e2e-evidence/caller-run-02/evidence.json

- 2026-10-07T18:09:53.046Z FP-P07: Fail; /Users/normy/autobyteus_org/autobyteus-worktrees/restore-native-workspace-folder-picker/tickets/in-progress/restore-native-workspace-folder-picker/api-e2e-evidence/caller-run-02/evidence.json

- FP-P07 run02 Fail (test harness navigation): actual Org Run succeeded and opened expected no-recipient Org landing; no selected member means no edit-config header. Probe incorrectly expected a header before selecting a member. Retain failure evidence, fix the journey to select /product via actual sidebar. Not a picker defect.
- Execution safety deviation: after run02 timeout/automatic cleanup, CUA getApp(exact worktree .app) auto-launched that now-closed bundle outside isolated-app (PID4683, group4683). AX showed initial #/ only; no UI interaction or validation performed against it. Immediately terminated only observed exact owned PID4683. Default app startup may have accessed default profile; no claim that startup was isolated. Existing user app/process was not stopped/reused. Future CUA binding only after checking owned instance liveness and native-await checkpoint; do not call getApp during cleanup windows.

- 2026-10-07T18:11:34.833Z FP-P01: Started isolated source-current launch and API-owned fixtures; /Users/normy/autobyteus_org/autobyteus-worktrees/restore-native-workspace-folder-picker/tickets/in-progress/restore-native-workspace-folder-picker/api-e2e-evidence/caller-run-03/evidence.json

- 2026-10-07T18:11:39.216Z FP-P01: Pass; /Users/normy/autobyteus_org/autobyteus-worktrees/restore-native-workspace-folder-picker/tickets/in-progress/restore-native-workspace-folder-picker/api-e2e-evidence/caller-run-03/evidence.json

- 2026-10-07T18:11:39.218Z FP-P02: Started Agent input only, explicit apply and unchanged registration; /Users/normy/autobyteus_org/autobyteus-worktrees/restore-native-workspace-folder-picker/tickets/in-progress/restore-native-workspace-folder-picker/api-e2e-evidence/caller-run-03/evidence.json

- 2026-10-07T18:11:39.447Z FP-P02: Pass; /Users/normy/autobyteus_org/autobyteus-worktrees/restore-native-workspace-folder-picker/tickets/in-progress/restore-native-workspace-folder-picker/api-e2e-evidence/caller-run-03/evidence.json

- 2026-10-07T18:11:39.448Z FP-P04: Started Team new Chat and known path reuse; /Users/normy/autobyteus_org/autobyteus-worktrees/restore-native-workspace-folder-picker/tickets/in-progress/restore-native-workspace-folder-picker/api-e2e-evidence/caller-run-03/evidence.json

- 2026-10-07T18:11:39.697Z FP-P04: Pass; /Users/normy/autobyteus_org/autobyteus-worktrees/restore-native-workspace-folder-picker/tickets/in-progress/restore-native-workspace-folder-picker/api-e2e-evidence/caller-run-03/evidence.json

- 2026-10-07T18:11:39.698Z FP-P05: Started Org root and specific placed-Team destination; /Users/normy/autobyteus_org/autobyteus-worktrees/restore-native-workspace-folder-picker/tickets/in-progress/restore-native-workspace-folder-picker/api-e2e-evidence/caller-run-03/evidence.json

- 2026-10-07T18:11:41.827Z FP-P05: Pass; /Users/normy/autobyteus_org/autobyteus-worktrees/restore-native-workspace-folder-picker/tickets/in-progress/restore-native-workspace-folder-picker/api-e2e-evidence/caller-run-03/evidence.json

- 2026-10-07T18:11:41.828Z FP-P06: Started full caller narrow form, invalid/manual/Cancel and long path geometry; /Users/normy/autobyteus_org/autobyteus-worktrees/restore-native-workspace-folder-picker/tickets/in-progress/restore-native-workspace-folder-picker/api-e2e-evidence/caller-run-03/evidence.json

- 2026-10-07T18:11:42.343Z FP-P06: Pass; /Users/normy/autobyteus_org/autobyteus-worktrees/restore-native-workspace-folder-picker/tickets/in-progress/restore-native-workspace-folder-picker/api-e2e-evidence/caller-run-03/evidence.json

- 2026-10-07T18:11:42.344Z FP-P07: Started real Org Run, active locks, stopped member draft and explicit Save; /Users/normy/autobyteus_org/autobyteus-worktrees/restore-native-workspace-folder-picker/tickets/in-progress/restore-native-workspace-folder-picker/api-e2e-evidence/caller-run-03/evidence.json

- 2026-10-07T18:12:42.969Z FP-P07: Fail; /Users/normy/autobyteus_org/autobyteus-worktrees/restore-native-workspace-folder-picker/tickets/in-progress/restore-native-workspace-folder-picker/api-e2e-evidence/caller-run-03/evidence.json

- 2026-10-07T18:13:50.530Z FP-P01: Started isolated source-current launch and API-owned fixtures; /Users/normy/autobyteus_org/autobyteus-worktrees/restore-native-workspace-folder-picker/tickets/in-progress/restore-native-workspace-folder-picker/api-e2e-evidence/caller-run-04/evidence.json

- 2026-10-07T18:13:55.668Z FP-P01: Pass; /Users/normy/autobyteus_org/autobyteus-worktrees/restore-native-workspace-folder-picker/tickets/in-progress/restore-native-workspace-folder-picker/api-e2e-evidence/caller-run-04/evidence.json

- 2026-10-07T18:13:55.670Z FP-P02: Started Agent input only, explicit apply and unchanged registration; /Users/normy/autobyteus_org/autobyteus-worktrees/restore-native-workspace-folder-picker/tickets/in-progress/restore-native-workspace-folder-picker/api-e2e-evidence/caller-run-04/evidence.json

- 2026-10-07T18:13:55.908Z FP-P02: Pass; /Users/normy/autobyteus_org/autobyteus-worktrees/restore-native-workspace-folder-picker/tickets/in-progress/restore-native-workspace-folder-picker/api-e2e-evidence/caller-run-04/evidence.json

- 2026-10-07T18:13:55.908Z FP-P04: Started Team new Chat and known path reuse; /Users/normy/autobyteus_org/autobyteus-worktrees/restore-native-workspace-folder-picker/tickets/in-progress/restore-native-workspace-folder-picker/api-e2e-evidence/caller-run-04/evidence.json

- 2026-10-07T18:13:56.176Z FP-P04: Pass; /Users/normy/autobyteus_org/autobyteus-worktrees/restore-native-workspace-folder-picker/tickets/in-progress/restore-native-workspace-folder-picker/api-e2e-evidence/caller-run-04/evidence.json

- 2026-10-07T18:13:56.179Z FP-P05: Started Org root and specific placed-Team destination; /Users/normy/autobyteus_org/autobyteus-worktrees/restore-native-workspace-folder-picker/tickets/in-progress/restore-native-workspace-folder-picker/api-e2e-evidence/caller-run-04/evidence.json

- 2026-10-07T18:13:58.691Z FP-P05: Pass; /Users/normy/autobyteus_org/autobyteus-worktrees/restore-native-workspace-folder-picker/tickets/in-progress/restore-native-workspace-folder-picker/api-e2e-evidence/caller-run-04/evidence.json

- 2026-10-07T18:13:58.692Z FP-P06: Started full caller narrow form, invalid/manual/Cancel and long path geometry; /Users/normy/autobyteus_org/autobyteus-worktrees/restore-native-workspace-folder-picker/tickets/in-progress/restore-native-workspace-folder-picker/api-e2e-evidence/caller-run-04/evidence.json

- 2026-10-07T18:13:59.141Z FP-P06: Pass; /Users/normy/autobyteus_org/autobyteus-worktrees/restore-native-workspace-folder-picker/tickets/in-progress/restore-native-workspace-folder-picker/api-e2e-evidence/caller-run-04/evidence.json

- 2026-10-07T18:13:59.142Z FP-P07: Started real Org Run, active locks, stopped member draft and explicit Save; /Users/normy/autobyteus_org/autobyteus-worktrees/restore-native-workspace-folder-picker/tickets/in-progress/restore-native-workspace-folder-picker/api-e2e-evidence/caller-run-04/evidence.json

- 2026-10-07T18:14:00.350Z FP-P07: Pass; /Users/normy/autobyteus_org/autobyteus-worktrees/restore-native-workspace-folder-picker/tickets/in-progress/restore-native-workspace-folder-picker/api-e2e-evidence/caller-run-04/evidence.json

- 2026-10-07T18:14:00.351Z FP-P08: Started actual Settings locale -> Chat Chinese input at desktop and narrow widths; /Users/normy/autobyteus_org/autobyteus-worktrees/restore-native-workspace-folder-picker/tickets/in-progress/restore-native-workspace-folder-picker/api-e2e-evidence/caller-run-04/evidence.json

- 2026-10-07T18:14:00.834Z FP-P08: Pass; /Users/normy/autobyteus_org/autobyteus-worktrees/restore-native-workspace-folder-picker/tickets/in-progress/restore-native-workspace-folder-picker/api-e2e-evidence/caller-run-04/evidence.json

## Durable probe case inventory (same IDs across attempts)
FP-P01 launch/fixture API → FP003; FP-P02 Agent select → FP004; FP-P03 native cancel/Escape → FP005; FP-P04 Team known-path and FP-P05 Org/root/member → FP006; FP-P06 narrow/invalid/manual/Cancel → FP008; FP-P07 real Run, active/root locks, Stop, member draft/Save/readback → FP007; FP-P08 public Settings zh-CN desktop/narrow → FP008. FP009 reconciles repeat/cleanup.

Run04 FP-P01/02/04..08 Pass, FP-P03 Not Tested (manual mode; native-run01 independently passed). Corrected navigation and Stop-remount assumptions verified; all saved ownership, no Save before button, correct /product patch and /other preservation, real API readback pass. Zero renderer page errors. A final native-assisted repeat includes P07 native saved member and computed geometry/cleanup assertions.

- 2026-10-07T18:15:55.432Z FP-P01: Started isolated source-current launch and API-owned fixtures; /Users/normy/autobyteus_org/autobyteus-worktrees/restore-native-workspace-folder-picker/tickets/in-progress/restore-native-workspace-folder-picker/api-e2e-evidence/native-run-05/evidence.json

- 2026-10-07T18:16:00.905Z FP-P01: Pass; /Users/normy/autobyteus_org/autobyteus-worktrees/restore-native-workspace-folder-picker/tickets/in-progress/restore-native-workspace-folder-picker/api-e2e-evidence/native-run-05/evidence.json

- 2026-10-07T18:16:00.906Z FP-P02: Started Agent input only, explicit apply and unchanged registration; /Users/normy/autobyteus_org/autobyteus-worktrees/restore-native-workspace-folder-picker/tickets/in-progress/restore-native-workspace-folder-picker/api-e2e-evidence/native-run-05/evidence.json

- 2026-10-07T18:16:01.677Z NATIVE: Choose this owned directory in the OS dialog: /private/var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-folder-picker-dyzCAP/agent; /Users/normy/autobyteus_org/autobyteus-worktrees/restore-native-workspace-folder-picker/tickets/in-progress/restore-native-workspace-folder-picker/api-e2e-evidence/native-run-05/evidence.json

- 2026-10-07T18:16:43.900Z FP-P02: Pass; /Users/normy/autobyteus_org/autobyteus-worktrees/restore-native-workspace-folder-picker/tickets/in-progress/restore-native-workspace-folder-picker/api-e2e-evidence/native-run-05/evidence.json

- 2026-10-07T18:16:43.904Z FP-P03: Started native Cancel and Escape retain typed text/selection/focus; /Users/normy/autobyteus_org/autobyteus-worktrees/restore-native-workspace-folder-picker/tickets/in-progress/restore-native-workspace-folder-picker/api-e2e-evidence/native-run-05/evidence.json

- 2026-10-07T18:16:44.454Z NATIVE: Dismiss native picker using Cancel button; do not close underlying form; /Users/normy/autobyteus_org/autobyteus-worktrees/restore-native-workspace-folder-picker/tickets/in-progress/restore-native-workspace-folder-picker/api-e2e-evidence/native-run-05/evidence.json

- 2026-10-07T18:16:55.129Z NATIVE: Dismiss native picker using Escape key; do not close underlying form; /Users/normy/autobyteus_org/autobyteus-worktrees/restore-native-workspace-folder-picker/tickets/in-progress/restore-native-workspace-folder-picker/api-e2e-evidence/native-run-05/evidence.json

- 2026-10-07T18:17:05.305Z FP-P03: Pass; /Users/normy/autobyteus_org/autobyteus-worktrees/restore-native-workspace-folder-picker/tickets/in-progress/restore-native-workspace-folder-picker/api-e2e-evidence/native-run-05/evidence.json

- 2026-10-07T18:17:05.306Z FP-P04: Started Team new Chat and known path reuse; /Users/normy/autobyteus_org/autobyteus-worktrees/restore-native-workspace-folder-picker/tickets/in-progress/restore-native-workspace-folder-picker/api-e2e-evidence/native-run-05/evidence.json

- 2026-10-07T18:17:05.877Z NATIVE: Choose this owned directory in the OS dialog: /private/var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-folder-picker-dyzCAP/known; /Users/normy/autobyteus_org/autobyteus-worktrees/restore-native-workspace-folder-picker/tickets/in-progress/restore-native-workspace-folder-picker/api-e2e-evidence/native-run-05/evidence.json

- 2026-10-07T18:17:31.546Z FP-P04: Pass; /Users/normy/autobyteus_org/autobyteus-worktrees/restore-native-workspace-folder-picker/tickets/in-progress/restore-native-workspace-folder-picker/api-e2e-evidence/native-run-05/evidence.json

- 2026-10-07T18:17:31.546Z FP-P05: Started Org root and specific placed-Team destination; /Users/normy/autobyteus_org/autobyteus-worktrees/restore-native-workspace-folder-picker/tickets/in-progress/restore-native-workspace-folder-picker/api-e2e-evidence/native-run-05/evidence.json

- 2026-10-07T18:17:32.096Z NATIVE: Choose this owned directory in the OS dialog: /private/var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-folder-picker-dyzCAP/org; /Users/normy/autobyteus_org/autobyteus-worktrees/restore-native-workspace-folder-picker/tickets/in-progress/restore-native-workspace-folder-picker/api-e2e-evidence/native-run-05/evidence.json

- 2026-10-07T18:18:01.450Z NATIVE: Choose this owned directory in the OS dialog: /private/var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-folder-picker-dyzCAP/member; /Users/normy/autobyteus_org/autobyteus-worktrees/restore-native-workspace-folder-picker/tickets/in-progress/restore-native-workspace-folder-picker/api-e2e-evidence/native-run-05/evidence.json

- 2026-10-07T18:18:27.985Z FP-P05: Pass; /Users/normy/autobyteus_org/autobyteus-worktrees/restore-native-workspace-folder-picker/tickets/in-progress/restore-native-workspace-folder-picker/api-e2e-evidence/native-run-05/evidence.json

- 2026-10-07T18:18:27.986Z FP-P06: Started full caller narrow form, invalid/manual/Cancel and long path geometry; /Users/normy/autobyteus_org/autobyteus-worktrees/restore-native-workspace-folder-picker/tickets/in-progress/restore-native-workspace-folder-picker/api-e2e-evidence/native-run-05/evidence.json

- 2026-10-07T18:18:28.413Z FP-P06: Pass; /Users/normy/autobyteus_org/autobyteus-worktrees/restore-native-workspace-folder-picker/tickets/in-progress/restore-native-workspace-folder-picker/api-e2e-evidence/native-run-05/evidence.json

- 2026-10-07T18:18:28.414Z FP-P07: Started real Org Run, active locks, stopped member draft and explicit Save; /Users/normy/autobyteus_org/autobyteus-worktrees/restore-native-workspace-folder-picker/tickets/in-progress/restore-native-workspace-folder-picker/api-e2e-evidence/native-run-05/evidence.json

- 2026-10-07T18:18:29.476Z NATIVE: Choose this owned directory in the OS dialog: /private/var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-folder-picker-dyzCAP/saved-member; /Users/normy/autobyteus_org/autobyteus-worktrees/restore-native-workspace-folder-picker/tickets/in-progress/restore-native-workspace-folder-picker/api-e2e-evidence/native-run-05/evidence.json

- 2026-10-07T18:18:58.353Z FP-P07: Pass; /Users/normy/autobyteus_org/autobyteus-worktrees/restore-native-workspace-folder-picker/tickets/in-progress/restore-native-workspace-folder-picker/api-e2e-evidence/native-run-05/evidence.json

- 2026-10-07T18:18:58.354Z FP-P08: Started actual Settings locale -> Chat Chinese input at desktop and narrow widths; /Users/normy/autobyteus_org/autobyteus-worktrees/restore-native-workspace-folder-picker/tickets/in-progress/restore-native-workspace-folder-picker/api-e2e-evidence/native-run-05/evidence.json

- 2026-10-07T18:18:58.866Z FP-P08: Pass; /Users/normy/autobyteus_org/autobyteus-worktrees/restore-native-workspace-folder-picker/tickets/in-progress/restore-native-workspace-folder-picker/api-e2e-evidence/native-run-05/evidence.json

- FP-002 policy addition completed exit 0; api-e2e-evidence/saved-locks-tests.log.

- FP-001/002 final aggregate rerun exit renderer=0 preload=0; repository-final.log, preload-final.log.

## Final Reconciliation — API-REV-001
FP-001..009: **Pass**. FP-P01..08: **Pass** in native-run-05/evidence.json. No ongoing, interrupted or unstarted in-scope case.
FP-001/002 final aggregate: 84 renderer/caller/gate/store/service +5 preload tests (89 current tests, not sum of repeated attempts).
FP-003: source-current full build and readiness pass. FP-004..008: final five actual native selections, Cancel/Escape, all callers, real Org Run/Stop/Save/readback and en/zh/narrow proof pass. FP-009: every owned isolated instance/fixture cleaned, both ports free, no task record remains.
FP-P07 earlier failures were harness-only incorrect member navigation and collapsed section after Stop; resolved by normal user actions in run04/05. Manual-mode P03 Not Tested is superseded only by actual native final result.
Native-operation receipt: api-e2e-evidence/native-observations.md. Auto-launch safety deviation remains disclosed; default-profile startup access unknown, no unisolated validation.
Authoritative completed report: api-e2e-execution-coverage-report.md. Final behavior confidence95%, broader Required→completed. Delivery user verification still required.
