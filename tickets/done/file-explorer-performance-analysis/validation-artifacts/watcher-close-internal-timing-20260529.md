# Watcher Close Internal Timing Probe (2026-05-29)

Workspace: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo`
Backend log: `/Users/normy/autobyteus_org/autobyteus-worktrees/file-explorer-performance-analysis/tickets/in-progress/file-explorer-performance-analysis/runtime-logs/backend-timing-close-detail-20260529.log`

## Key backend timing rows

```text
FileSystemWatcher start.ready durationMs=2409 watchedDirectoryCount=1670 watchedEntryCount=9847
FileSystemWatcher stop.close.call.begin at=1780062412193
  chokidarInternalsBeforeClose: closerPathCount=9847, closerFunctionCount=9847, watchedMapSize=1670
  activeHandlesBeforeClose: FSWatcher=9847, Server=1, Socket=3
FileSystemWatcher stop.close.call.return at=1780062433549
  closeCallSyncDurationMs=21356.1
  closeCallWallDurationMs=21357
  closerTimingAfterCloseCallReturn: calledCloserCount=9847, totalCloserSyncMs=21347.4, avgCloserSyncMs=2.2, maxCloserSyncMs=67.9
  eventLoopProbeAfterCloseCallReturn: zeroTimerFiredBeforeCloseCallReturned=false, intervalTickCountBeforeCloseCallReturned=0
FileSystemWatcher stop.close.await.end at=1780062433556
  closeAwaitDurationMs=3
  closeTotalDurationMs=21363
  activeHandlesAfterAwait: Server=1, Socket=3
  eventLoopProbeSummary: zeroTimerFiredBeforeAwaitEnd=false, zeroTimerDelayMs=21363, intervalTickCountBeforeAwaitEnd=0, maxIntervalGapEventuallyMs=21362.4
FileSystemWatcher stop.end durationMs=21371
```

## Finding

The shutdown delay is inside the synchronous `watcher.close()` call, not inside an async wait after close returns.

Chokidar 4.0.3 implements `FSWatcher.close()` by synchronously iterating `_closers` and invoking one closer per watched path. In this workspace there were `9847` closer functions / native `FSWatcher` handles. The wrapped closer timing shows `9847` closer calls consumed about `21347.4 ms` of synchronous time.

The event-loop probe confirms backend event-loop blockage:

- A zero-delay timer scheduled immediately before `watcher.close()` did not fire until after close completed.
- A 100 ms interval had `0` ticks before close/await ended.
- The eventual max interval gap was `~21362 ms`.

Therefore the backend cannot accept/process Terminal WebSocket upgrades while File Explorer close is executing, because both live on the same backend Node event loop and `chokidar.close()` is synchronous for the watched handles.

## Solution implications

- A simple `await watcher.close()` is misleading: the expensive work happens before the promise is returned/resolved.
- Cancellation of search refresh remains useful, but it is not the primary cause of this reproduced Terminal delay.
- A small idle-stop grace can avoid closing the watcher during quick Files -> Terminal switches, but it only defers the synchronous freeze.
- To remove backend event-loop blocking at the source, the chokidar lifecycle must run away from the backend main event loop: either a worker-thread watcher runtime or a child-process watcher runtime.
- A worker thread is now more relevant than the earlier FD-pressure-only analysis suggested, because this confirmed problem is event-loop blocking from synchronous closer iteration. A child process is stronger because it also isolates process-wide FD pressure, but it is larger.
