# Live startup delay investigation — 2026-09-27 / DR-007

User requested explanation of slow startup, not a source change. Read-only logs,
read-only SQLite query, process CPU/open-file inspection and a two-second stack sample;
no interruption, restart, ledger change or manual live-data write.

Normal recovery app PID331; embedded server PID1440 started about05:01:24UTC. Prisma
reported no pending schema migrations and completed about05:01:25UTC. The app updater
reported no update (latest1.4.87); that is not the blocking work.
Attachment migration is genuinely RUNNING attempt3 (ordinary retry of failed attempt2),
started05:01:26UTC. At first inspection90originals/90committed files; at05:03:08UTC,
170manifest files/170committed, complete=false. Server CPU observed73–91% and active
file/crypto-hash callbacks; open file was migration-original atomic temporary output.
This is observable progress, not proof of a hang. Old summary text in RUNNING ledger
still describes the previous failed attempt; do not misreport that as a current failure.

Current code explains latency: migration discovery, typed-reference dependency
validation, journal preflight/planning, repeated transforms/hash checks, original backups,
atomic writes, reread verification and manifest saves happen before listener startup.
Then RootRunPackageReadinessIndex.rebuild scans current packages/references and dependency
closure before app.listen. Thus the Electron window waits for backend readiness and
shows a generic startup state while backend does real sequential filesystem/CPU work.
This is not Electron binary boot time or an LLM response. No per-stage profiler timing
was obtained; sampled hashing/file callbacks identify activity, not an exact percent
breakdown. Repeated processing is visible in source; optimization not implemented.

Prior full-copy API validation observed195140ms first startup and36491ms repeat. Those
are comparison observations, not promised live timing. A terminal migration should skip
on repeat startup, but readiness still rebuilds. At latest recorded probe health29695
was not listening; no live ready/completion/user-acceptance claim yet.

Evidence: live-startup-progress.json and live-startup-sample.txt in this directory.
Incident and verification stay open; no release/finalization action or reroute requested.
