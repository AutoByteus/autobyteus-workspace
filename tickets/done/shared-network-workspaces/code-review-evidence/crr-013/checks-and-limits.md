# CRR013 checks and limits

Personal independent review; no delegated work. Read all19 changed paths,
complete affected forward paths and prior current authorities. Audit1449 refs,
1379 protected input paths,19 old candidates,4 current candidate files and286
preexisting dist files. Source whitespace passes. Twelve production source files
max210 effective nonempty; tests not subjected to implementation size limits.

Reviewer `run-reviewer-checks.py`: pinned SHA-verified Go1.27.2 Darwinarm64,
clean owned HOME/TMPDIR (uid501/gid20),12 commands including3 expected mutation
failures. Race7packages,70 top-level PASS lines/212 four-space subcase PASS lines;
standalone installer-child SKIP is separately recorded, parent exercises child.
Additional indented child diagnostics are not separate top-level cases. Vet Pass;
Python18 enumerated17Pass1standalone-Go-childSkip; all test packages cross-compile
Darwinamd64/Linuxarm64+amd64 (NOT runtime execution on those targets).
Expected empty-qualification publication refusal; default source hash matches.
Three copied mutations fail intended assertions, not compilation: omit binding
save, omit post-command correlation, accept duplicate plist keys. No source/test
mutation in worktree. Test-owned scratch/toolchain/copies removed (cleanup.json).
Actual installed trusted diskutil integration executes read-only on own APFS dir.

`candidate-checks.json`: retained native version runs, verify-release matches
embedded manifest then refuses unqualified target as expected; no installation.
Exact JSON bytes embedded in both actual retained candidates; same-engine hash
recomputed f0d71675d3d9b70d89969a8071b8de03287cff0676669ddab295f14568041c88.
Default source cc3556ce850bf20281e6b7e0411a6b01359ea863cac6cb22104808e9dc225354.
Engine pair/source/metadata unchanged. No engine build or Docker image assignment.

Own binding tests begin at actual bindSource after nonroot creation boundary;
resumed Apply fails at missing trusted child binary before marker/export. This
proves persisted binding across a later failure, NOT privileged source creation
or successful public setup. Plan fixtures stop before NFS settings/port effects;
Detach fixture stops at mount observation. Fake-response correlation/replacement
checks do not prove whole-host boot or real APFS-volume replacement. Those gates
remain API-F005-first. Other Linux/common recovery tests run on Darwin, not Linux.

No reviewer boot/mount/volume/service/VM/Docker/app/API/provider or system config
operation. No rebuild of unchanged TS/Web suites, no physical/runtime-native-tool
or release proof. IR00914checks/10mutations reviewed as upstream evidence, not
claimed as additional reviewer executions. IR009 compile/output-directory failures
remain retained in their attempts, not relabeled Pass. API005Fail57.14% broader
Required is unchanged; CR007 source acceptance is not product closure.

Tooling/read limits: initial combined display truncated; bounded rereads completed.
An initial skill-reference read used the worktree (which does not contain .codex);
corrected to the configured superrepo skill root, no product failure. A first
aggregate native verify-release command printed the expected refusal but its
combined shell status was not that subcommand's status; separately captured
candidate-checks.json now records exact expected rc1. No suite rerun/failure hidden.
Raw Go log has4 diagnostic trailing-whitespace lines; preserve them. Strict source
whitespace separate; artifact-only blank-at-eol exception documented, not normalized.
