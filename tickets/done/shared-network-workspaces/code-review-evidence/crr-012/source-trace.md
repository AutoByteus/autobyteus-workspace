# API-F005 forward production path

Authority: Approved SR018 REQ014/017/019; SCN009/012/013; AC007/014/017/018/019.
An owner who has completed supported native-Mac creation reboots the same machine
and expects the available same original project to reconnect automatically. This
is a normal lifecycle, independently established before any failure script.

1. `setup/plan.go:52–63,102` validates the selected existing source and captures
   `platform.SourceIdentity`; new-source Apply captures it after owned creation.
2. `platform/source.go:35–51` rejects non-directory/symlink/canonical-path issues,
   then encodes syscall.Stat_t.Dev/Ino in `config.Identity` (`config/state.go:9–12`).
3. `setup/apply.go:48–71` checks source and nonroot access, then writes the hosted
   descriptor before export. Both initial success and saved pair are in API005.
4. `platform/jobs.go` installs a fixed launchd RunAtLoad/KeepAlive service command.
   Whole-host restart -> `cli/run.go:78–89` -> serial `service.Supervise` ->
   `setup.Service.Reconnect(false)` -> read private configuration.
5. `setup/lifecycle.go:25–28` invokes `CheckSource` before Apple Ensure, host mount
   or selected-node effects. `source.go:58–59` compares the entire persisted pair.
   In the observed reboot, only current device differs: it returns the exact
   logged identity refusal. `service/supervisor.go:18–31` logs and revisits at its
   existing cadence; it cannot change that deterministic predicate.
6. `status.go:41–46` independently observes no matching host mount and returns
   hostReady=false; it is not itself the source-rejection predicate. Later public
   `reconnect` reaches the same guard and fails before Apple Ensure as well.
7. Apple nfsd remains enabled/running; source remains locally readable. No manual
   mount/config/identity change occurred. Safe later detach removes only owned
   resources and preserves source/marker, but is cleanup, not successful recovery.

`design-spec.md:248` explicitly selects persisted dev+inode; `:252–256` requires
same-source healthy restart. Current implementation follows the chosen representation,
but the design did not establish its cross-boot validity on supported APFS. The
fix therefore needs a bounded design/data-disposition decision before implementation,
not an unreviewed comparison bypass. Existing `filesystem_darwin.go` admits APFS;
this is not an arbitrary unsupported filesystem or a source-replacement workflow.

No relevant source was changed after CRR011; full API005 diff outside tickets is
empty. `platform/source.go` dates to this ticket's c57ab71c90 implementation, not
IR008's Linux expiry delta. A new finding is warranted; CR002 cold-create and
CR005 Linux selected-client boot resolutions are not reopened.
